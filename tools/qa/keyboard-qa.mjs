// 전키보드 UI P6 라이브 QA 드라이버 — 헤드리스 Chromium 으로 실 게임(localhost:5173)을
// 키보드만으로 구동해 #218~227 작업을 검증한다. 마우스 클릭 없이 키 이벤트만 사용.
//
// 검증 축:
//  1) 컷오버 엔진(#225) + 설정 UI(#226/#227): SettingsScene 에서 키보드로 '키보드 전용'
//     토글까지 이동→Enter→실제 <canvas> pointerEvents 가 'none' 으로 바뀌는지(마우스 차단).
//  2) 설정 이식(#227): settingsItems 개수가 이식분만큼 늘었는지 + 키보드 nav 로 인덱스 이동.
//  3) 씬별 키보드 nav: MainMenu/Lobby/World/Battle 에서 방향키로 선택 인덱스가 바뀌는지 +
//     크래시(콘솔 에러) 0 + 스크린샷.
//
// 실행: node tools/qa/keyboard-qa.mjs   (클라이언트 dev 서버가 5173 에 떠 있어야 함)

import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const BASE = 'http://localhost:5173';
// 헤드리스 Chromium 은 WebGL 프레임버퍼가 없어 Phaser WebGL 부팅이 실패한다
// (Framebuffer Unsupported). renderer=canvas 로 Canvas 2D 렌더러를 강제.
const RENDER = 'renderer=canvas';
const HERE = dirname(fileURLToPath(import.meta.url));
const SHOTS = join(HERE, 'shots');
mkdirSync(SHOTS, { recursive: true });

const results = [];
const record = (name, pass, detail) => {
  results.push({ name, pass, detail });
  const icon = pass === true ? 'PASS' : pass === false ? 'FAIL' : 'INFO';
  console.log(`[${icon}] ${name} — ${detail}`);
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForGame(page, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const ready = await page.evaluate(() => {
      const g = window.__aeternaGame;
      return !!(g && g.scene && g.scene.getScenes(true).length > 0);
    });
    if (ready) return true;
    await sleep(200);
  }
  return false;
}

const activeScenes = (page) =>
  page.evaluate(() => (window.__aeternaGame?.scene.getScenes(true) || []).map((s) => s.scene.key));

// 특정 씬만 남기고 나머지 active 씬을 stop → 키보드 핸들러 중첩 방지
async function isolateScene(page, key, data) {
  await page.evaluate(({ key, data }) => {
    const g = window.__aeternaGame;
    for (const s of g.scene.getScenes(true)) {
      if (s.scene.key !== key) g.scene.stop(s.scene.key);
    }
    if (!g.scene.isActive(key)) g.scene.start(key, data || {});
  }, { key, data });
  await sleep(600);
}

// 씬 인스턴스의 (TS-private) 숫자 프로퍼티를 런타임에 읽는다
const readProp = (page, sceneKey, prop) =>
  page.evaluate(({ sceneKey, prop }) => {
    const sc = window.__aeternaGame?.scene.getScene(sceneKey);
    return sc ? sc[prop] : undefined;
  }, { sceneKey, prop });

const canvasPointerEvents = (page) =>
  page.evaluate(() => {
    const c = document.querySelector('canvas');
    return c ? (c.style.pointerEvents || '') : '<no-canvas>';
  });

async function pressN(page, key, n, gapMs = 90) {
  for (let i = 0; i < n; i++) {
    await page.keyboard.press(key);
    await sleep(gapMs);
  }
}

// JustDown 폴링(update 루프) 입력용 — 키를 여러 프레임 눌러 유지해 down-edge 가
// 확실히 한 번 폴링되게 한다(Playwright press 는 너무 빨라 폴링이 놓칠 수 있음).
async function holdPressN(page, key, n, holdMs = 160, gapMs = 160) {
  for (let i = 0; i < n; i++) {
    await page.keyboard.down(key);
    await sleep(holdMs);
    await page.keyboard.up(key);
    await sleep(gapMs);
  }
}

async function run() {
  const browser = await chromium.launch({
    headless: true,
    // Canvas 렌더러 강제로 충분하지만, 텍스처 경로가 WebGL 을 건드릴 경우 대비해
    // SwiftShader 소프트웨어 GL 을 함께 켠다.
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));

  // ── 부팅 ──────────────────────────────────────────────
  await page.goto(`${BASE}/?${RENDER}`, { waitUntil: 'domcontentloaded' });
  const booted = await waitForGame(page);
  record('boot', booted, booted ? `active=${(await activeScenes(page)).join(',')}` : '게임 부팅 실패(20s)');
  if (!booted) { await browser.close(); return finish(consoleErrors); }
  await page.screenshot({ path: join(SHOTS, '01-mainmenu.png') });

  // ── MainMenu 키보드 nav (#218 레퍼런스) ──────────────────
  try {
    const before = await readProp(page, 'MainMenuScene', 'menuHighlightIndex');
    await pressN(page, 'ArrowDown', 2);
    const after = await readProp(page, 'MainMenuScene', 'menuHighlightIndex');
    record('mainmenu-nav', typeof after === 'number' && after !== before,
      `menuHighlightIndex ${before} -> ${after}`);
  } catch (e) { record('mainmenu-nav', false, `예외: ${e.message}`); }

  // ── SettingsScene: 이식(#227) + 컷오버 엔진(#225/#226) end-to-end ──
  try {
    await isolateScene(page, 'SettingsScene');
    const onSettings = (await activeScenes(page)).includes('SettingsScene');
    record('settings-enter', onSettings, `active=${(await activeScenes(page)).join(',')}`);
    await page.screenshot({ path: join(SHOTS, '02-settings.png') });

    const itemCount = await page.evaluate(() => {
      const sc = window.__aeternaGame?.scene.getScene('SettingsScene');
      return Array.isArray(sc?.settingsItems) ? sc.settingsItems.length : -1;
    });
    // 이식 전 7항목(슬라이더2+언어+화면흔들림+자막+색맹+뒤로) → 이식 후 키보드전용+7종+ = 15 기대
    record('settings-migration-count', itemCount >= 14,
      `settingsItems=${itemCount} (이식분 포함 14+ 기대)`);

    // 키보드 nav 로 '키보드 전용' 토글(삽입 순서상 index 6)까지 이동
    const KEYBOARD_ONLY_IDX = 6;
    // settingsIndex 0 에서 시작 → ArrowDown 으로 이동, 인덱스 추적
    await page.evaluate(() => { /* ensure focus on document */ });
    const idx0 = await readProp(page, 'SettingsScene', 'settingsIndex');
    await pressN(page, 'ArrowDown', KEYBOARD_ONLY_IDX);
    const idxN = await readProp(page, 'SettingsScene', 'settingsIndex');
    record('settings-nav', idxN === (idx0 + KEYBOARD_ONLY_IDX),
      `settingsIndex ${idx0} -> ${idxN} (기대 ${idx0 + KEYBOARD_ONLY_IDX})`);

    // 이동한 항목이 '키보드 전용' 토글인지 확인 후 Enter → 컷오버
    const pe0 = await canvasPointerEvents(page);
    await page.keyboard.press('Enter');
    await sleep(300);
    const pe1 = await canvasPointerEvents(page);
    // 다시 Enter → 복귀
    await page.keyboard.press('Enter');
    await sleep(300);
    const pe2 = await canvasPointerEvents(page);

    record('cutover-engine', pe1 === 'none' && pe0 !== 'none',
      `canvas.pointerEvents: 초기='${pe0}' → 토글ON='${pe1}' → 토글OFF='${pe2}' (ON 시 'none' 기대)`);
    await page.screenshot({ path: join(SHOTS, '03-settings-after-toggle.png') });
  } catch (e) { record('settings-suite', false, `예외: ${e.message}`); }

  // ── debugScene 직접 진입 씬들 ───────────────────────────
  const sceneProbes = [
    { url: `${BASE}/?debugScene=lobby&${RENDER}`, key: 'LobbyScene', prop: 'navIndex', shot: '04-lobby.png', navKey: 'ArrowRight' },
    { url: `${BASE}/?debugScene=world&${RENDER}`, key: 'WorldScene', prop: 'zoneIndex', shot: '05-world.png', navKey: 'ArrowDown' },
  ];

  for (const probe of sceneProbes) {
    try {
      const errBefore = consoleErrors.length;
      await page.goto(probe.url, { waitUntil: 'domcontentloaded' });
      const ok = await waitForGame(page);
      await sleep(800);
      const scenes = await activeScenes(page);
      const onScene = scenes.includes(probe.key);
      record(`${probe.key}-enter`, ok && onScene, `active=${scenes.join(',')}`);

      const before = await readProp(page, probe.key, probe.prop);
      await pressN(page, probe.navKey, 3, 120);
      const after = await readProp(page, probe.key, probe.prop);
      const navWorked = typeof after === 'number' && typeof before === 'number' && after !== before;
      record(`${probe.key}-nav`, navWorked,
        `${probe.prop} ${before} -> ${after} (${probe.navKey}×3)`);

      const newErrors = consoleErrors.slice(errBefore);
      record(`${probe.key}-no-crash`, newErrors.length === 0,
        newErrors.length === 0 ? '콘솔 에러 0' : `에러 ${newErrors.length}건: ${newErrors[0]?.slice(0, 120)}`);

      await page.screenshot({ path: join(SHOTS, probe.shot) });
    } catch (e) { record(`${probe.key}-suite`, false, `예외: ${e.message}`); }
  }

  // ── LobbyScene 인라인 패널(상점/인벤토리) 키보드 — 실제 도달 경로 검증 ──
  // ui/*.ts 패널 클래스는 오펀이고 실제 화면은 LobbyScene 인라인. 서버/로그인 우회를 위해
  // 패널 메서드를 직접 호출하고, ▶ 마커가 붙은 텍스트의 y 좌표 변화로 포커스 이동을 확인.
  try {
    await page.goto(`${BASE}/?debugScene=lobby&${RENDER}`, { waitUntil: 'domcontentloaded' });
    await waitForGame(page);
    await sleep(700);

    const markedFocus = (sceneKey) => page.evaluate((k) => {
      const sc = window.__aeternaGame.scene.getScene(k);
      const panel = sc && sc.dialoguePanel;
      if (!panel || !panel.list) return null;
      const m = panel.list.find((o) => o.type === 'Text' && typeof o.text === 'string' && o.text.includes('▶'));
      return m ? { text: m.text, x: Math.round(m.x), y: Math.round(m.y) } : null;
    }, sceneKey);
    const panelOpen = () => page.evaluate(() => !!window.__aeternaGame.scene.getScene('LobbyScene').dialoguePanel);
    // 포커스 이동 판정: ▶ 마커가 다른 버튼으로 옮겨졌는지(세로=y변화, 가로=x변화 모두 포착).
    const moved = (a, b) => !!a && !!b && (a.x !== b.x || a.y !== b.y);

    // 상점 패널 직접 오픈 후 키보드 구동
    await page.evaluate(() => {
      window.__aeternaGame.scene.getScene('LobbyScene')._showShopPanel({ id: 'merchant', name: '상인', role: '상점' });
    });
    await sleep(300);
    record('lobby-shop-open', await panelOpen(), '상점 패널 직접 오픈');

    const sf0 = await markedFocus('LobbyScene');
    await pressN(page, 'ArrowDown', 1, 120);
    const sf1 = await markedFocus('LobbyScene');
    record('lobby-shop-nav', moved(sf0, sf1), `▶ ${JSON.stringify(sf0)} -> ${JSON.stringify(sf1)}`);

    await pressN(page, 'ArrowDown', 4, 120); // idx1 → idx5([닫기]); 구매5+닫기1=6 focusable
    const sfClose = await markedFocus('LobbyScene');
    record('lobby-shop-reach-close', !!sfClose && sfClose.text.includes('닫기'), `focus=${JSON.stringify(sfClose)}`);
    await page.keyboard.press('Enter');
    await sleep(300);
    record('lobby-shop-close-via-enter', !(await panelOpen()), 'ENTER 로 [닫기] 활성→패널 닫힘');
    await page.screenshot({ path: join(SHOTS, '07-lobby-shop.png') });

    // 인벤토리 패널 직접 오픈(모의 아이템) 후 키보드 구동
    await page.evaluate(() => {
      window.__aeternaGame.scene.getScene('LobbyScene')._showInventoryPanel([
        { name: '체력 포션', quantity: 3, rarity: 'common' },
        { name: '강철 검', quantity: 1, rarity: 'rare', isEquipped: true },
        { name: '마나 결정', quantity: 5, rarity: 'epic' },
      ]);
    });
    await sleep(300);
    record('lobby-inventory-open', await panelOpen(), '인벤토리 패널 직접 오픈');
    const if0 = await markedFocus('LobbyScene');
    await pressN(page, 'ArrowDown', 1, 120);
    const if1 = await markedFocus('LobbyScene');
    record('lobby-inventory-nav', moved(if0, if1), `▶ ${JSON.stringify(if0)} -> ${JSON.stringify(if1)}`);
    await page.screenshot({ path: join(SHOTS, '08-lobby-inventory.png') });

    // 형제 인라인 패널(강화/파티/스토리) — 직접 오픈 → nav(가능 시) → ESC 닫기
    const npc = { id: 'tester', name: '테스터', role: '서비스' };
    const siblings = [
      { name: 'enhance', method: '_showEnhancePanel', single: true },
      { name: 'party', method: '_showPartyPanel', single: false },
      { name: 'story', method: '_showStoryPanel', single: false },
    ];
    for (const sp of siblings) {
      await page.evaluate(({ m, npc }) => {
        window.__aeternaGame.scene.getScene('LobbyScene')[m](npc);
      }, { m: sp.method, npc });
      await sleep(250);
      const open = await panelOpen();
      const f0 = await markedFocus('LobbyScene');
      await pressN(page, 'ArrowDown', 1, 120);
      const f1 = await markedFocus('LobbyScene');
      const navOk = sp.single ? !!f0 : moved(f0, f1);
      record(`lobby-${sp.name}`, open && navOk, `open=${open} ▶ ${JSON.stringify(f0)}->${JSON.stringify(f1)}`);
      await page.keyboard.press('Escape');
      await sleep(200);
      record(`lobby-${sp.name}-esc`, !(await panelOpen()), 'ESC 닫힘');
    }

    // 퀘스트 패널 — 액션 가능(수주/완료) 퀘스트 포함, nav + 닫기까지 도달
    await page.evaluate(() => {
      window.__aeternaGame.scene.getScene('LobbyScene')._showQuestPanel([
        { id: 'q1', name: '첫 의뢰', description: '슬라임 처치', status: 'available',
          objectives: [{ desc: '슬라임', current: 0, target: 3 }], rewards: { exp: 100, gold: 50, items: [] } },
        { id: 'q2', name: '완료 대기', description: '보고하기', status: 'complete',
          objectives: [{ desc: '보고', current: 1, target: 1 }], rewards: { exp: 200, gold: 80, items: ['은검'] } },
      ], 'local');
    });
    await sleep(300);
    const qOpen = await panelOpen();
    const q0 = await markedFocus('LobbyScene');
    await pressN(page, 'ArrowDown', 1, 120);
    const q1 = await markedFocus('LobbyScene');
    record('lobby-quest-nav', qOpen && moved(q0, q1), `open=${qOpen} ▶ ${JSON.stringify(q0)}->${JSON.stringify(q1)}`);
    await page.screenshot({ path: join(SHOTS, '09-lobby-quest.png') });
    await page.keyboard.press('Escape');
    await sleep(200);
    record('lobby-quest-esc', !(await panelOpen()), 'ESC 닫힘');
  } catch (e) { record('lobby-panels-suite', false, `예외: ${e.message}`); }

  // ── SkillTree 배선·키보드: Lobby nav '🌳 스킬' → 패널 오픈 → 노드 nav → ENTER detail → ESC 닫기 ──
  try {
    await page.goto(`${BASE}/?debugScene=lobby&${RENDER}`, { waitUntil: 'domcontentloaded' });
    await waitForGame(page);
    await sleep(700);
    const skillOpen = () => page.evaluate(() => {
      const ui = window.__aeternaGame.scene.getScene('LobbyScene').skillTreeUI;
      return !!(ui && ui.isOpen && ui.isOpen());
    });
    const ringIndex = () => page.evaluate(() => {
      const ui = window.__aeternaGame.scene.getScene('LobbyScene').skillTreeUI;
      return ui && ui.focusRing ? ui.focusRing.index : -1;
    });
    const detailOpen = () => page.evaluate(() => {
      const ui = window.__aeternaGame.scene.getScene('LobbyScene').skillTreeUI;
      return !!(ui && ui.detailPanel);
    });
    const navIdx = () => page.evaluate(() => window.__aeternaGame.scene.getScene('LobbyScene').navIndex);

    // 실제 키보드 경로: 하단 nav '🌳 스킬'(idx3)로 ArrowRight 이동 후 ENTER
    await pressN(page, 'ArrowRight', 3, 130);
    await page.keyboard.press('Enter');
    await sleep(1300); // _openSkillTree 비동기(스킬포인트 fetch)
    record('skill-open', await skillOpen(), `skillTreeUI.isOpen=${await skillOpen()}`);
    await page.screenshot({ path: join(SHOTS, '12-skilltree.png') });

    // 노드 ring 이동 + lobby nav 양보(navIndex 불변)
    const r0 = await ringIndex();
    const nav0 = await navIdx();
    await pressN(page, 'ArrowDown', 2, 140);
    const r1 = await ringIndex();
    const nav1 = await navIdx();
    record('skill-node-nav', typeof r1 === 'number' && r1 !== r0, `ring index ${r0} -> ${r1}`);
    record('skill-lobby-yield', nav0 === nav1, `lobby navIndex ${nav0}==${nav1} (uiModal 양보)`);

    // ENTER → 스킬 detail
    await page.keyboard.press('Enter');
    await sleep(400);
    record('skill-detail', await detailOpen(), `detailPanel=${await detailOpen()}`);

    // ESC → 패널 닫기(bindEscClose → close)
    await page.keyboard.press('Escape');
    await sleep(400);
    record('skill-close', !(await skillOpen()), `닫힘 후 isOpen=${await skillOpen()}`);
  } catch (e) { record('skill-suite', false, `예외: ${e.message}`); }

  // ── 회귀(#리뷰): 모달 공존 시 하위 인라인 패널 양보 — 상점 위에 스킬트리 강제 공존 후 상점 ▶ 불변 ──
  try {
    await page.goto(`${BASE}/?debugScene=lobby&${RENDER}`, { waitUntil: 'domcontentloaded' });
    await waitForGame(page);
    await sleep(700);
    const marked = () => page.evaluate(() => {
      const p = window.__aeternaGame.scene.getScene('LobbyScene').dialoguePanel;
      if (!p || !p.list) return null;
      const m = p.list.find((o) => o.type === 'Text' && typeof o.text === 'string' && o.text.includes('▶'));
      return m ? { text: m.text, x: Math.round(m.x), y: Math.round(m.y) } : null;
    });
    await page.evaluate(() => window.__aeternaGame.scene.getScene('LobbyScene')._showShopPanel({ id: 'merchant', name: '상인', role: '상점' }));
    await sleep(300);
    const shopBefore = await marked();
    // uiModal(스킬트리) 강제 공존(실사용에선 nav 가드가 막지만, 방어층 검증용)
    await page.evaluate(() => { void window.__aeternaGame.scene.getScene('LobbyScene')._openSkillTree(); });
    await sleep(1300);
    await pressN(page, 'ArrowDown', 1, 140); // 스킬트리가 소비 → 상점은 양보해야
    const shopAfter = await marked();
    const yielded = !!shopBefore && !!shopAfter && shopBefore.x === shopAfter.x && shopBefore.y === shopAfter.y;
    record('modal-coexist-yield', yielded, `상점 ▶ ${JSON.stringify(shopBefore)} == ${JSON.stringify(shopAfter)} (양보)`);
  } catch (e) { record('modal-coexist-suite', false, `예외: ${e.message}`); }

  // ── WorldScene 키보드 시간이동: ENTER(정보 패널) → ENTER(이동) → GameScene 전환 ──
  // 정보 패널의 [시간 이동] 버튼은 pointerdown 전용이라, 키보드는 2단계 ENTER 경로로 진입.
  try {
    await page.goto(`${BASE}/?debugScene=world&${RENDER}`, { waitUntil: 'domcontentloaded' });
    await waitForGame(page);
    await sleep(800);
    const infoOpen = () => page.evaluate(() => !!window.__aeternaGame.scene.getScene('WorldScene')?.infoPanel);
    await page.keyboard.press('Enter');
    await sleep(300);
    const opened = await infoOpen();
    record('world-zone-info-open', opened, opened ? '1차 ENTER 로 정보 패널 오픈' : '패널 미오픈');
    await page.keyboard.press('Enter');
    await sleep(1500); // 마커 트윈 600 + 페이드 300 + 씬 전환 여유
    const scenesAfter = await activeScenes(page);
    record('world-zone-travel', scenesAfter.includes('GameScene'),
      `2차 ENTER 후 active=${scenesAfter.join(',')} (GameScene 기대)`);
    await page.screenshot({ path: join(SHOTS, '10-world-travel.png') });
  } catch (e) { record('world-travel-suite', false, `예외: ${e.message}`); }

  // ── FeedbackForm 배선·키보드: SettingsScene → 피드백 항목 → launch+pause → 폼 키보드 → ESC resume ──
  try {
    await page.goto(`${BASE}/?${RENDER}`, { waitUntil: 'domcontentloaded' });
    await waitForGame(page);
    await page.evaluate(() => {
      const g = window.__aeternaGame;
      for (const s of g.scene.getScenes(true)) if (s.scene.key !== 'SettingsScene') g.scene.stop(s.scene.key);
      if (!g.scene.isActive('SettingsScene')) g.scene.start('SettingsScene');
    });
    await sleep(700);
    // 피드백 항목으로 이동(UP×2: idx0 → back → feedback) 후 ENTER
    await pressN(page, 'ArrowUp', 2, 130);
    await page.keyboard.press('Enter');
    await sleep(700);
    const fbActive = await page.evaluate(() => window.__aeternaGame.scene.isActive('FeedbackForm'));
    const setPaused = await page.evaluate(() => window.__aeternaGame.scene.isPaused('SettingsScene'));
    record('feedback-launch', fbActive && setPaused, `FeedbackForm active=${fbActive}, Settings paused=${setPaused}`);
    await page.screenshot({ path: join(SHOTS, '11-feedback.png') });

    const fbFocus = () => page.evaluate(() => {
      const sc = window.__aeternaGame.scene.getScene('FeedbackForm');
      const c = sc && sc.formContainer;
      if (!c || !c.list) return null;
      const m = c.list.find((o) => o.type === 'Text' && typeof o.text === 'string' && o.text.includes('▶'));
      return m ? { text: m.text, x: Math.round(m.x) } : null;
    });
    const ff0 = await fbFocus();
    await pressN(page, 'ArrowRight', 1, 130);
    const ff1 = await fbFocus();
    record('feedback-form-nav', !!ff0 && !!ff1 && ff0.x !== ff1.x, `▶ ${JSON.stringify(ff0)} -> ${JSON.stringify(ff1)}`);

    await page.keyboard.press('Escape');
    await sleep(500);
    const fbClosed = await page.evaluate(() => !window.__aeternaGame.scene.isActive('FeedbackForm'));
    const setResumed = await page.evaluate(() => {
      const g = window.__aeternaGame;
      return g.scene.isActive('SettingsScene') && !g.scene.isPaused('SettingsScene');
    });
    record('feedback-esc-resume', fbClosed && setResumed, `폼 닫힘=${fbClosed}, Settings resume=${setResumed}`);
  } catch (e) { record('feedback-suite', false, `예외: ${e.message}`); }

  // ── BattleScene (#223): ATB 라 커맨드 메뉴가 '열렸을 때만' 키보드 nav 가능 ──
  // 진입 직후엔 게이지 미충전 → activeCommander 없음. 메뉴 활성까지 대기 후 nav 검증.
  try {
    const errBefore = consoleErrors.length;
    await page.goto(`${BASE}/?debugScene=battle&${RENDER}`, { waitUntil: 'domcontentloaded' });
    const ok = await waitForGame(page);
    const scenes = await activeScenes(page);
    record('BattleScene-enter', ok && scenes.includes('BattleScene'), `active=${scenes.join(',')}`);

    // ATB 게이지가 차서 커맨드 메뉴(activeCommander + cmdMenuContainer)가 열릴 때까지 폴링(최대 15s)
    let menuOpen = false;
    const t0 = Date.now();
    while (Date.now() - t0 < 15000) {
      menuOpen = await page.evaluate(() => {
        const s = window.__aeternaGame?.scene.getScene('BattleScene');
        return !!(s && s.activeCommander && s.cmdMenuContainer);
      });
      if (menuOpen) break;
      await sleep(400);
    }
    record('battle-cmdmenu-open', menuOpen,
      menuOpen ? `커맨드 메뉴 활성(${Math.round((Date.now() - t0) / 100) / 10}s)` : '15s 내 커맨드 메뉴 미활성');

    await page.screenshot({ path: join(SHOTS, '06-battle.png') });

    if (menuOpen) {
      // BattleScene 은 JustDown 폴링이라 키를 눌러 유지(holdPress)해야 down-edge 가 잡힌다.
      const before = await readProp(page, 'BattleScene', 'cmdMenuIndex');
      await holdPressN(page, 'ArrowDown', 2);
      const after = await readProp(page, 'BattleScene', 'cmdMenuIndex');
      record('BattleScene-nav', typeof after === 'number' && after !== before,
        `cmdMenuIndex ${before} -> ${after} (ArrowDown 홀드×2, 커맨드 메뉴 활성)`);
    } else {
      record('BattleScene-nav', null, '커맨드 메뉴 미활성으로 nav 검증 보류(게이팅 정상 동작)');
    }

    const newErrors = consoleErrors.slice(errBefore);
    record('BattleScene-no-crash', newErrors.length === 0,
      newErrors.length === 0 ? '콘솔 에러 0' : `에러 ${newErrors.length}건: ${newErrors[0]?.slice(0, 120)}`);
  } catch (e) { record('BattleScene-suite', false, `예외: ${e.message}`); }

  await browser.close();
  return finish(consoleErrors);
}

function finish(consoleErrors) {
  const pass = results.filter((r) => r.pass === true).length;
  const fail = results.filter((r) => r.pass === false).length;
  const summary = { pass, fail, total: results.length, consoleErrorCount: consoleErrors.length, results, consoleErrors };
  writeFileSync(join(SHOTS, 'report.json'), JSON.stringify(summary, null, 2));
  console.log(`\n=== 키보드 QA 요약: PASS=${pass} FAIL=${fail} / ${results.length} (콘솔에러 ${consoleErrors.length}) ===`);
  console.log(`스크린샷+리포트: ${SHOTS}`);
  process.exitCode = fail > 0 ? 1 : 0;
}

run().catch((e) => { console.error('드라이버 치명 오류:', e); process.exitCode = 2; });
