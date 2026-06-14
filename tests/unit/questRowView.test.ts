/**
 * 유닛 테스트 — 메인 퀘스트 "말라투스 성소 진입" 진행 방법 노출 (HUD 퀘스트 트래커)
 *
 * 회귀 가드 대상 버그:
 *   메인 퀘스트가 objectiveText(서사)만 보여줘서 "어떻게 완료하는지"를 유저가
 *   알 수 없었다. 월드맵 진입 경로(ESC → 월드맵 → 말라투스 성소 노드 선택)가
 *   UI 어디에도 안내되지 않았음.
 *
 * 수정:
 *   QuestItem 에 actionHint(행동 안내) + mapZoneId(월드맵 진입 버튼) 추가.
 *   buildQuestRowHtml 이 미완료 퀘스트에 한해 안내 줄과 data-map-zone-id 버튼을 렌더.
 *   버튼 클릭은 HudOverlay 위임 핸들러가 ui.event.quest.open_map 으로 변환 → GameScene 이 WorldScene 진입.
 *
 * 이 테스트는 렌더 로직(phaser-free)만 검증한다. 버튼→씬 전환 e2e 는 라이브 QA 로 확인.
 */
import { describe, expect, test } from 'vitest';

import { buildQuestRowHtml, type QuestItem } from '../../client/src/ui/questRowView';

/** "말라투스 성소 진입" 메인 퀘스트와 동일 형태의 미완료 퀘스트. */
const malatusQuest: QuestItem = {
  questId: 'Q-MAIN-2-01',
  title: '말라투스 성소 진입',
  objectiveText: '실반헤임 심층부에서 봉인 유적을 찾는다.',
  progressCurrent: 1,
  progressTarget: 3,
  isMainQuest: true,
  isCompleted: false,
  distanceMeters: 340,
  actionHint: 'ESC로 월드맵을 열고 «말라투스 성소» 지역을 선택해 진입하세요.',
  mapZoneId: 'malatus_sanctuary',
};

describe('buildQuestRowHtml — 메인 퀘스트 진행 방법 노출', () => {
  test('actionHint 가 있으면 Aseprite 안내 아이콘과 강조 안내 줄이 렌더된다', () => {
    const html = buildQuestRowHtml(malatusQuest);
    expect(html).toContain('hud-quest-action');
    expect(html).toContain('class="hud-quest-action-icon"');
    expect(html).toContain('src="/assets/generated/ui/icons/skills/skill_mw_arrow.png"');
    expect(html).toContain('data-aeterna-icon-key="skill_mw_arrow_icon"');
    expect(html).toContain('data-aeterna-icon-path="assets/generated/ui/icons/skills/skill_mw_arrow.png"');
    expect(html).toContain('class="hud-quest-action-text"');
    expect(html).toContain('ESC로 월드맵을 열고');
    expect(html).toContain('«말라투스 성소»');
    expect(html).not.toContain('▶ ESC로 월드맵을 열고');
  });

  test('mapZoneId 가 있으면 그 존을 가리키는 "월드맵 열기" 버튼이 렌더된다', () => {
    const html = buildQuestRowHtml(malatusQuest);
    expect(html).toContain('hud-quest-map-btn');
    // 위임 클릭 핸들러가 읽는 속성 — 존 ID 가 정확히 실려야 한다.
    expect(html).toContain('data-map-zone-id="malatus_sanctuary"');
    // 어떤 키로 여는지(ESC)도 버튼에 명시돼 키보드 사용자가 추측하지 않게.
    expect(html).toContain('ESC');
  });

  test('mapZoneId 가 있으면 Aseprite 월드맵 아이콘을 버튼 내부 이미지로 렌더한다', () => {
    const html = buildQuestRowHtml(malatusQuest);
    expect(html).toContain('class="hud-quest-map-icon"');
    expect(html).toContain('src="/assets/generated/ui/worldmap/zone_malatus_sanctuary.png"');
    expect(html).toContain('data-aeterna-icon-key="zone_malatus_sanctuary"');
    expect(html).toContain('data-aeterna-icon-path="assets/generated/ui/worldmap/zone_malatus_sanctuary.png"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain('>🗺 월드맵 열기 (ESC)<');
  });

  test('기존 필드(제목/목표/진행도)는 그대로 유지된다', () => {
    const html = buildQuestRowHtml(malatusQuest);
    expect(html).toContain('[MAIN] 말라투스 성소 진입');
    expect(html).toContain('실반헤임 심층부에서 봉인 유적을 찾는다.');
    expect(html).toContain('1/3');
    expect(html).toContain('340m');
  });
});

describe('buildQuestRowHtml — 안내 요소 조건부 렌더', () => {
  test('actionHint/mapZoneId 가 없으면 안내 줄도 버튼도 없다 (회귀: 기존 퀘스트 변형 없음)', () => {
    const plain: QuestItem = {
      questId: 'Q-SUB-2-02',
      title: '서리이끼 수액 수집',
      objectiveText: '누아리엘 처방 재료 3병을 모은다.',
      progressCurrent: 1,
      progressTarget: 3,
      isMainQuest: false,
      isCompleted: false,
      distanceMeters: 120,
    };
    const html = buildQuestRowHtml(plain);
    expect(html).not.toContain('hud-quest-action');
    expect(html).not.toContain('hud-quest-map-btn');
    expect(html).not.toContain('data-map-zone-id');
    // 본문 자체는 정상 렌더.
    expect(html).toContain('[SUB] 서리이끼 수액 수집');
  });

  test('완료된 퀘스트는 actionHint/mapZoneId 가 있어도 안내 줄·버튼을 숨긴다', () => {
    const completed: QuestItem = { ...malatusQuest, isCompleted: true };
    const html = buildQuestRowHtml(completed);
    expect(html).not.toContain('hud-quest-action');
    expect(html).not.toContain('hud-quest-map-btn');
    expect(html).not.toContain('data-map-zone-id');
  });

  test('worldmap 리소스가 없는 mapZoneId 는 버튼을 숨겨 glyph fallback 노출을 막는다', () => {
    const html = buildQuestRowHtml({
      ...malatusQuest,
      mapZoneId: 'frostmoss_sap',
    });
    expect(html).toContain('hud-quest-action');
    expect(html).not.toContain('hud-quest-map-btn');
    expect(html).not.toContain('data-map-zone-id="frostmoss_sap"');
    expect(html).not.toContain('hud-quest-map-icon-fallback');
    expect(html).not.toContain('🗺');
  });
});

describe('buildQuestRowHtml — XSS 이스케이프 (결과가 innerHTML 로 라이브 DOM 주입됨)', () => {
  test('title/objectiveText/actionHint/mapZoneId 의 HTML 특수문자를 엔티티로 이스케이프한다', () => {
    const malicious: QuestItem = {
      questId: 'Q-X',
      title: '<img src=x onerror=alert(1)>',
      objectiveText: '"><script>alert(2)</script>',
      progressCurrent: 0,
      progressTarget: 1,
      isMainQuest: false,
      isCompleted: false,
      actionHint: 'go & <b>here</b>',
      mapZoneId: '" onmouseover="alert(3)',
    };
    const html = buildQuestRowHtml(malicious);
    // 원시 페이로드가 태그/속성으로 살아있으면 안 된다(탈출 차단).
    expect(html).not.toContain('<img src=x');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('" onmouseover="alert(3)"'); // 따옴표 탈출이 막혔는지
    // worldmap 리소스가 아닌 mapZoneId 는 버튼 자체를 렌더하지 않아 속성 탈출 표면을 없앤다.
    expect(html).not.toContain('data-map-zone-id');
    expect(html).not.toContain('hud-quest-map-btn');
    // 본문·안내의 <, & 가 엔티티로.
    expect(html).toContain('&lt;img');
    expect(html).toContain('&amp;');
  });
});
