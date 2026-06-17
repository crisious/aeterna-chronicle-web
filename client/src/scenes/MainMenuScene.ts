/**
 * MainMenuScene.ts — 타이틀 화면 (P5-18 → P25-03 API 연결)
 *
 * - 에테르나 크로니클 로고 + 배경
 * - 시작(로그인/회원가입) / 설정 / 크레딧 버튼
 * - JWT 토큰 존재 시 자동 로그인 시도
 * - NetworkManager를 통한 Auth API 호출
 */

import * as Phaser from 'phaser';
import { networkManager } from '../network/NetworkManager';
import { loadingProgress } from '../ui/LoadingProgress';
import { KeyboardFocusRing } from '../accessibility/KeyboardFocusRing';
import { getSpriteResourceForItemIcon, getSpriteResourceForSkillIcon } from '../assets/spriteResourceManifest';
import { ENVIRONMENT_PARTICLE_TEXTURES } from './TransitionEffects';

// ── 상수 ────────────────────────────────────────────────────

const TITLE_TEXT = 'AETHERNA\nCHRONICLE';
const SUBTITLE_TEXT = '에테르나 크로니클';
const BG_COLOR_TOP = 0x0a0a2e;
const BG_COLOR_BOTTOM = 0x16213e;

const MAIN_MENU_BACKGROUND_TEXTURES = {
  sky: {
    key: 'title_bg',
    path: 'assets/generated/environment/backgrounds/ERB-BG-SKY-DUSK.png',
  },
  mid: {
    key: 'title_bg_mid',
    path: 'assets/generated/environment/backgrounds/ERB-BG-MID-DUSK.png',
  },
} as const;

const MAIN_MENU_AETHER_PARTICLE_TEXTURE = ENVIRONMENT_PARTICLE_TEXTURES.ether_beam;

const MAIN_MENU_UI_FRAME_TEXTURES = {
  loginPanel: {
    key: 'ui_frame_UI-SET-001-DEF',
    path: 'assets/generated/ui/frames/UI-SET-001-DEF.png',
    width: 512,
    height: 512,
  },
  creditsPanel: {
    key: 'ui_frame_UI-HUD-005-DEF',
    path: 'assets/generated/ui/frames/UI-HUD-005-DEF.png',
    width: 512,
    height: 512,
  },
  menuButton: {
    key: 'ui_frame_main_menu_button',
    path: 'assets/generated/ui/frames/UI-BTN-006-DEF.png',
    width: 512,
    height: 512,
  },
  modalButton: {
    key: 'ui_frame_main_menu_modal_button',
    path: 'assets/generated/ui/frames/UI-BTN-006-DEF.png',
    width: 512,
    height: 512,
  },
  modalInput: {
    key: 'ui_frame_main_menu_modal_input',
    path: 'assets/generated/ui/frames/UI-BTN-006-DEF.png',
    width: 512,
    height: 512,
  },
} as const;

const MAIN_MENU_BUTTON_ICON_SPECS = [
  { kind: 'skill', iconId: 'skill_mw_arrow' },
  { kind: 'skill', iconId: 'skill_tg_reverse' },
  { kind: 'item', itemIconId: 'ITM-QST-004' },
] as const;

const MAIN_MENU_FOCUS_ICON_ID = 'skill_mw_arrow';
const MAIN_MENU_FOCUS_ICON_SIZE = 14;
const MAIN_MENU_FOCUS_ICON_OFFSET_X = 114;
const MAIN_MENU_MODAL_CLOSE_ICON_ID = 'skill_tg_reverse';
const MAIN_MENU_EXPECTED_MENU_BUTTON_FRAME_COUNT = 3;
const MAIN_MENU_EXPECTED_MENU_BUTTON_ICON_COUNT = 3;
const MAIN_MENU_EXPECTED_FOCUS_ICON_COUNT = 1;
const MAIN_MENU_EXPECTED_MODAL_CLOSE_ICON_COUNT = 1;
const MAIN_MENU_EXPECTED_LOGIN_BUTTON_FRAME_COUNT = 3;
const MAIN_MENU_EXPECTED_CREDITS_BUTTON_FRAME_COUNT = 1;
const MAIN_MENU_EXPECTED_LOGIN_INPUT_FRAME_COUNT = 2;

interface MenuItem {
  label: string;
  action: () => void;
}

// ── MainMenuScene ───────────────────────────────────────────

export class MainMenuScene extends Phaser.Scene {
  private menuItems: Phaser.GameObjects.Text[] = [];
  private menuButtonFrames: Phaser.GameObjects.Image[] = [];
  private menuButtonIcons: Phaser.GameObjects.Image[] = [];
  private menuButtonIconFallbackIndexes: number[] = [];
  private menuFocusIcon: Phaser.GameObjects.Image | null = null;
  private modalButtonFrames: Phaser.GameObjects.Image[] = [];
  private modalCloseIcons: Phaser.GameObjects.Image[] = [];
  private fallbackModalCloseIconIds: string[] = [];
  // FINDING-A4 fix part 2: 키보드 highlight state + label cache (▶ 동적 prefix)
  private menuLabels: string[] = [];
  private menuActions: (() => void)[] = [];
  private menuHighlightIndex = 0;
  private focusRing?: KeyboardFocusRing;
  // 키보드 컷오버(감사 rank4): 크레딧 오버레이 참조 — 중복 오픈 가드 + ESC 닫기 대상.
  private creditsOverlay: Phaser.GameObjects.Container | null = null;
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private particleTimer?: Phaser.Time.TimerEvent;

  // P25-03: 로그인 UI
  private loginContainer: Phaser.GameObjects.Container | null = null;
  private usernameInput: HTMLInputElement | null = null;
  private passwordInput: HTMLInputElement | null = null;
  private statusText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'MainMenuScene' });
  }

  // ── 라이프사이클 ─────────────────────────────────────────

  preload(): void {
    // HTML 로딩 화면 연동 — Phaser 로더 진행률을 HTML #loading-progress에 반영
    loadingProgress.bindToLoader(this.load);

    // debugScene URL은 main menu를 즉시 중단하고 대상 씬으로 전환한다.
    // 중단될 씬의 장식용 preload가 대상 씬 preload와 같은 texture key를 동시에 queue하지 않도록 방어한다.
    if (this._shouldSkipVisualPreloadForDebugRedirect()) {
      return;
    }

    // P33-A: 타이틀 배경 이미지 로드
    for (const texture of Object.values(MAIN_MENU_BACKGROUND_TEXTURES)) {
      if (!this.textures.exists(texture.key)) {
        this.load.image(texture.key, texture.path);
      }
    }
    if (!this.textures.exists(MAIN_MENU_AETHER_PARTICLE_TEXTURE.key)) {
      this.load.image(MAIN_MENU_AETHER_PARTICLE_TEXTURE.key, MAIN_MENU_AETHER_PARTICLE_TEXTURE.path);
    }
    for (const texture of Object.values(MAIN_MENU_UI_FRAME_TEXTURES)) {
      if (!this.textures.exists(texture.key)) {
        this.load.image(texture.key, texture.path);
      }
    }
    for (let index = 0; index < MAIN_MENU_BUTTON_ICON_SPECS.length; index += 1) {
      const iconResource = this._resolveMenuButtonIconResource(index);
      if (iconResource && !this.textures.exists(iconResource.key)) {
        this.load.image(iconResource.key, iconResource.path);
      }
    }
    const focusIconResource = getSpriteResourceForSkillIcon(MAIN_MENU_FOCUS_ICON_ID);
    const isFocusIconQueuedByMenu = MAIN_MENU_BUTTON_ICON_SPECS.some((spec) => (
      spec.kind === 'skill' && spec.iconId === MAIN_MENU_FOCUS_ICON_ID
    ));
    if (focusIconResource && !isFocusIconQueuedByMenu && !this.textures.exists(focusIconResource.key)) {
      this.load.image(focusIconResource.key, focusIconResource.path);
    }
    const modalCloseIconResource = getSpriteResourceForSkillIcon(MAIN_MENU_MODAL_CLOSE_ICON_ID);
    const isModalCloseIconQueuedByMenu = MAIN_MENU_BUTTON_ICON_SPECS.some((spec) => (
      spec.kind === 'skill' && spec.iconId === MAIN_MENU_MODAL_CLOSE_ICON_ID
    ));
    if (modalCloseIconResource && !isModalCloseIconQueuedByMenu && !this.textures.exists(modalCloseIconResource.key)) {
      this.load.image(modalCloseIconResource.key, modalCloseIconResource.path);
    }

    // 로드 실패 시 무시 (fallback으로 기존 그라디언트 유지)
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.warn(`[MainMenu] 이미지 로드 실패: ${file.key}`);
    });
  }

  private _shouldSkipVisualPreloadForDebugRedirect(): boolean {
    if (typeof window === 'undefined') return false;
    const debugScene = new URLSearchParams(window.location.search).get('debugScene');
    return debugScene !== null && debugScene !== 'mainMenu';
  }

  create(): void {
    const { width, height } = this.cameras.main;
    this.menuItems = [];
    this.menuButtonFrames = [];
    this.menuButtonIcons = [];
    this.menuButtonIconFallbackIndexes = [];
    this.menuFocusIcon = null;
    this.modalButtonFrames = [];
    this.modalCloseIcons = [];
    this.fallbackModalCloseIconIds = [];

    const hasTitleSky = this.textures.exists(MAIN_MENU_BACKGROUND_TEXTURES.sky.key);
    const hasTitleMid = this.textures.exists(MAIN_MENU_BACKGROUND_TEXTURES.mid.key);
    if (hasTitleSky) {
      this.add.image(width / 2, height / 2, MAIN_MENU_BACKGROUND_TEXTURES.sky.key)
        .setDisplaySize(width, height)
        .setAlpha(0.9);
    } else {
      // Aseprite title background 로드 실패 시에만 사용하는 안전 fallback.
      this._drawGradientBg(width, height);
    }
    if (hasTitleMid) {
      this.add.image(width / 2, height / 2, MAIN_MENU_BACKGROUND_TEXTURES.mid.key)
        .setDisplaySize(width, height)
        .setAlpha(0.4);
    }

    // P33-A: 반투명 오버레이 (텍스트 가독성)
    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0a2e, 0.45);

    this._spawnAetherParticles(width, height);

    this.titleText = this.add.text(width / 2, height * 0.25, TITLE_TEXT, {
      fontSize: '64px',
      fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
      color: '#c8a2ff',
      align: 'center',
      stroke: '#4a0080',
      strokeThickness: 6,
      letterSpacing: 2,
    }).setOrigin(0.5).setAlpha(0);

    this.subtitleText = this.add.text(width / 2, height * 0.42, SUBTITLE_TEXT, {
      fontSize: '18px',
      fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
      color: '#8888cc',
      align: 'center',
    }).setOrigin(0.5).setAlpha(0);

    // 상태 텍스트
    this.statusText = this.add.text(width / 2, height * 0.48, '', {
      fontSize: '12px',
      fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
      color: '#ffcc44',
    }).setOrigin(0.5);

    // 메뉴 버튼 — ▶ prefix 는 highlight index 따라 동적 적용 (FINDING-A4 part 2)
    const menuDefs: MenuItem[] = [
      { label: '게임 시작', action: () => this._onStart() },
      { label: '설정',  action: () => this._onSettings() },
      { label: '크레딧', action: () => this._onCredits() },
    ];

    this.menuLabels = menuDefs.map(d => d.label);
    this.menuActions = menuDefs.map(d => d.action);
    this.menuHighlightIndex = 0;
    this.creditsOverlay = null; // 인스턴스 재사용 시 stale 참조가 가드를 영구 잠그지 않게 리셋

    const menuStartY = height * 0.58;
    const menuGap = 48;

    menuDefs.forEach((def, i) => {
      this._addMenuButtonFrame(width / 2, menuStartY + i * menuGap, i, def.action);
      this._addMenuButtonIcon(width / 2, menuStartY + i * menuGap, i, def.action);

      const buttonLabelX = this._hasMenuButtonIcon(i) ? width / 2 + 12 : width / 2;
      const btn = this.add.text(buttonLabelX, menuStartY + i * menuGap, this._formatMenuLabel(i), {
        fontSize: '20px',
        fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
        color: i === 0 ? '#ffffff' : '#cccccc',
      })
        .setOrigin(0.5)
        .setAlpha(0)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => this.focusRing?.focus(i))
        .on('pointerdown', def.action);

      this.menuItems.push(btn);
    });
    this._addMenuFocusIcon(width / 2, menuStartY);

    // FINDING-A4 part 2 / 전키보드 UI: 메뉴 키보드 네비게이션을 KeyboardFocusRing 으로 일반화
    // (Arrow Up/Down + Enter/Space + Tab). WCAG 2.1.1 — 모든 기능 키보드 작동.
    // 메뉴는 _setMenuHighlight(텍스트 색·▶ prefix)로 자체 표시하므로 링 내장 하이라이트는 끔.
    this.focusRing = new KeyboardFocusRing(this, {
      highlight: false,
      onFocus: (_item, i) => this._setMenuHighlight(i),
    });
    this.focusRing.setItems(
      this.menuItems.map((btn, i) => ({
        target: btn,
        activate: () => this.menuActions[i]?.(),
        label: this.menuLabels[i],
      })),
    );

    // 페이드 인 시퀀스
    this.tweens.add({ targets: this.titleText, alpha: 1, duration: 800, ease: 'Power2' });
    this.tweens.add({ targets: this.subtitleText, alpha: 1, duration: 600, delay: 400, ease: 'Power2' });
    this.menuButtonFrames.forEach((frame, i) => {
      this.tweens.add({
        targets: frame,
        alpha: this._getMenuButtonFrameAlpha(i),
        duration: 500,
        delay: 800 + i * 150,
        ease: 'Power2',
      });
    });
    this.menuButtonIcons.forEach((icon, i) => {
      this.tweens.add({ targets: icon, alpha: 1, duration: 500, delay: 800 + i * 150, ease: 'Power2' });
    });
    if (this.menuFocusIcon) {
      this.tweens.add({
        targets: this.menuFocusIcon,
        alpha: this._getMenuButtonFrameAlpha(this.menuHighlightIndex),
        duration: 500,
        delay: 800,
        ease: 'Power2',
      });
    }
    this.menuItems.forEach((btn, i) => {
      this.tweens.add({ targets: btn, alpha: 1, duration: 500, delay: 800 + i * 150, ease: 'Power2' });
    });

    // P33-B: 타이틀 BGM 재생 (사용자 인터랙션 후)
    this.input.once('pointerdown', () => {
      this._startTitleBgm();
    });
    // 키보드 입력으로도 BGM 시작
    this.input.keyboard?.once('keydown', () => {
      this._startTitleBgm();
    });

    // P25-03: 자동 로그인 시도 (기존 토큰 존재 시)
    if (networkManager.isAuthenticated) {
      this.statusText.setText('기존 세션 확인 중...');
      networkManager.refreshAuth().then((ok) => {
        if (ok) {
          this.statusText.setText(`환영합니다, ${networkManager.username ?? '모험가'}!`);
        } else {
          this.statusText.setText('세션 만료. 다시 로그인해 주세요.');
        }
      }).catch(() => {
        this.statusText.setText('');
      });
    }

    this._writeMainMenuFrameQaProbe();
  }

  // ── P33-B: 타이틀 BGM ───────────────────────────────────

  private _bgmStarted = false;

  private _startTitleBgm(): void {
    if (this._bgmStarted) return;
    this._bgmStarted = true;

    // soundManifest 키: bgm_sys_02 = title_screen.ogg
    const bgmKey = 'bgm_sys_02';
    if (this.cache.audio.exists(bgmKey)) {
      this.sound.play(bgmKey, { loop: true, volume: 0.3 });
    } else if (this.cache.audio.exists('bgm_sys_01')) {
      // fallback: main_theme
      this.sound.play('bgm_sys_01', { loop: true, volume: 0.3 });
    }
  }

  // ── 시작 버튼 → 로그인/캐릭터 선택 ──────────────────────

  private _onStart(): void {
    // 이미 인증된 경우 바로 캐릭터 선택
    if (networkManager.isAuthenticated) {
      this._cleanupDom();
      this.scene.start('CharacterSelectScene');
      return;
    }

    // 로그인 UI 표시
    this._showLoginUI();
  }

  private _showLoginUI(): void {
    if (this.loginContainer) return;

    const { width, height } = this.cameras.main;
    const cx = width / 2;
    const cy = height / 2;

    // 메뉴 버튼 숨기기
    this.menuItems.forEach(btn => btn.setVisible(false));
    this.menuButtonFrames.forEach(frame => frame.setVisible(false));
    this.menuButtonIcons.forEach(icon => icon.setVisible(false));
    this.menuFocusIcon?.setVisible(false);
    this.modalButtonFrames = [];
    this.modalCloseIcons = [];
    this.fallbackModalCloseIconIds = [];
    this.loginContainer = this.add.container(cx, cy);

    const loginFrame = MAIN_MENU_UI_FRAME_TEXTURES.loginPanel;
    if (this.textures.exists(loginFrame.key)) {
      const bg = this.add.image(0, 0, loginFrame.key)
        .setDisplaySize(360, 280)
        .setAlpha(0.9);
      this.loginContainer.add(bg);
      this.loginContainer.add(this.add.rectangle(0, 0, 360, 280, 0x000000, 0)
        .setStrokeStyle(1, 0x6644aa));
    } else {
      // Aseprite login UI frame 로드 실패 시에만 사용하는 안전 fallback.
      const bg = this.add.rectangle(0, 0, 360, 280, 0x000000, 0.92)
        .setStrokeStyle(1, 0x6644aa);
      this.loginContainer.add(bg);
    }

    const title = this.add.text(0, -110, '로그인 / 회원가입', {
      fontSize: '18px', color: '#c8a2ff', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    }).setOrigin(0.5);
    this.loginContainer.add(title);

    // DOM 입력 필드 생성
    const canvas = this.game.canvas;
    const rect = canvas.getBoundingClientRect();

    // Scale.FIT 보정: 캔버스 스케일 비율 계산
    const scaleX = rect.width / width;
    const scaleY = rect.height / height;
    const inputW = 240 * scaleX;
    this.usernameInput = this._createInput('아이디', rect.left + cx * scaleX - inputW / 2, rect.top + (cy - 60) * scaleY, inputW);
    this.passwordInput = this._createInput('비밀번호', rect.left + cx * scaleX - inputW / 2, rect.top + (cy - 20) * scaleY, inputW);
    this.passwordInput.type = 'password';

    const loginAction = () => this._doLogin();
    const registerAction = () => this._doRegister();
    const closeAction = () => this._closeLoginUI();

    // 로그인 버튼
    this._addMainMenuModalButtonFrame(this.loginContainer, -60, 40, 112, 30, 'main_menu_login_button_frame', loginAction, 0xb6ffb6);
    const loginBtn = this.add.text(-60, 40, '로그인', {
      fontSize: '15px', color: '#88ff88', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerdown', loginAction);
    this.loginContainer.add(loginBtn);

    // 회원가입 버튼
    this._addMainMenuModalButtonFrame(this.loginContainer, 60, 40, 92, 30, 'main_menu_register_button_frame', registerAction, 0xb6ddff);
    const registerBtn = this.add.text(60, 40, '가입', {
      fontSize: '15px', color: '#88ccff', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerdown', registerAction);
    this.loginContainer.add(registerBtn);

    // 에러 표시
    const errorText = this.add.text(0, 80, '', {
      fontSize: '12px', color: '#ff6644', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    }).setOrigin(0.5);
    this.loginContainer.add(errorText);
    (this.loginContainer as any)._errorText = errorText;

    // 닫기
    this._addMainMenuModalButtonFrame(this.loginContainer, 160, -120, 34, 28, 'main_menu_login_close_button_frame', closeAction, 0xd6d6ff, 0.66);
    this._addMainMenuModalCloseIcon(this.loginContainer, 160, -120, closeAction, 'main_menu_login_close_icon', 'login');

    // FINDING-DR-3: 로그인 모달 키보드 nav (WCAG 2.1.1)
    // - input Enter → 로그인 (가장 자연스러운 form submit)
    // - input Shift+Enter → 가입 — 키보드 컷오버(감사 rank4): [ 가입 ] 버튼이 canvas pointerdown
    //   단독이라 keyboardOnlyMode(canvas pointer-events:none)에선 신규가입이 완전 불능이던 갭.
    //   DOM input 의 keydown 이라 canvas 차단과 무관하게 동작한다.
    // - ESC → 모달 닫기
    const onInputEnter = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (e.shiftKey) this._doRegister();
        else this._doLogin();
      }
    };
    this.usernameInput?.addEventListener('keydown', onInputEnter);
    this.passwordInput?.addEventListener('keydown', onInputEnter);

    // 키 힌트(발견성): 버튼 라벨 충돌 없이 별도 라인으로
    const keyHint = this.add.text(0, 108, 'Enter 로그인 · Shift+Enter 가입 · ESC 닫기', {
      fontSize: '10px', color: '#777799', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    }).setOrigin(0.5);
    this.loginContainer.add(keyHint);

    const onLoginEsc = () => this._closeLoginUI();
    this.input.keyboard?.on('keydown-ESC', onLoginEsc);
    // 모달 닫힐 때 cleanup — _closeLoginUI 안 listener 정리는 별도 변경
    (this.loginContainer as any)._loginEscHandler = onLoginEsc;
    this._writeMainMenuFrameQaProbe();
  }

  private _createInput(placeholder: string, left: number, top: number, w = 240): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = placeholder;
    // FINDING-DR-1: 스크린 리더 호환 — id/name/aria-label/autocomplete 부여
    // (WCAG 1.3.1 Info & Relationships, 4.1.2 Name/Role/Value)
    const slug = placeholder === '아이디' ? 'username' : placeholder === '비밀번호' ? 'password' : placeholder;
    input.id = `login-${slug}`;
    input.name = slug;
    input.setAttribute('aria-label', placeholder);
    input.autocomplete = slug === 'username' ? 'username' : slug === 'password' ? 'current-password' : 'off';
    input.dataset.aeternaFrameKey = MAIN_MENU_UI_FRAME_TEXTURES.modalInput.key;
    input.dataset.aeternaFramePath = MAIN_MENU_UI_FRAME_TEXTURES.modalInput.path;
    input.style.cssText = `
      position: absolute;
      left: ${left}px;
      top: ${top}px;
      width: ${w}px;
      height: 34px;
      box-sizing: border-box;
      padding: 8px 12px;
      font-size: 14px;
      font-family: monospace;
      background-color: #1a1a2e;
      background-image: url("/${MAIN_MENU_UI_FRAME_TEXTURES.modalInput.path}");
      background-position: center;
      background-repeat: no-repeat;
      background-size: 100% 100%;
      color: #ffffff;
      border: 1px solid rgba(182, 221, 255, 0.62);
      border-radius: 0;
      text-align: center;
      outline: none;
      z-index: 100;
    `;
    document.body.appendChild(input);
    return input;
  }

  private async _doLogin(): Promise<void> {
    const username = this.usernameInput?.value.trim() ?? '';
    const password = this.passwordInput?.value ?? '';
    const errorText = (this.loginContainer as any)?._errorText as Phaser.GameObjects.Text;

    if (!username || !password) {
      errorText?.setText('아이디와 비밀번호를 입력해 주세요.');
      return;
    }

    errorText?.setText('로그인 중...');

    try {
      const res = await networkManager.login({ username, password });
      if (res.success && res.token) {
        this._cleanupDom();
        this.scene.start('CharacterSelectScene');
      } else {
        errorText?.setText(res.error ?? '로그인 실패');
      }
    } catch (err: any) {
      let msg = '서버 연결 실패';
      try {
        const body = err?.responseBody ?? '';
        const parsed = typeof body === 'string' && body.startsWith('{') ? JSON.parse(body) : null;
        if (parsed?.error) msg = parsed.error;
      } catch { /* 무시 */ }
      errorText?.setText(msg);
      console.error('[MainMenu] 로그인 에러:', err);
    }
  }

  private async _doRegister(): Promise<void> {
    const username = this.usernameInput?.value.trim() ?? '';
    const password = this.passwordInput?.value ?? '';
    const errorText = (this.loginContainer as any)?._errorText as Phaser.GameObjects.Text;

    if (!username || !password) {
      errorText?.setText('아이디와 비밀번호를 입력해 주세요.');
      return;
    }
    if (password.length < 6) {
      errorText?.setText('비밀번호는 6자 이상이어야 합니다.');
      return;
    }

    errorText?.setText('가입 중...');

    try {
      const res = await networkManager.register({ username, password });
      if (res.success && res.token) {
        this._cleanupDom();
        this.scene.start('CharacterSelectScene');
      } else {
        errorText?.setText(res.error ?? '가입 실패');
      }
    } catch (err: any) {
      let msg = '서버 연결 실패';
      try {
        const body = err?.responseBody ?? '';
        const parsed = typeof body === 'string' && body.startsWith('{') ? JSON.parse(body) : null;
        if (parsed?.error) msg = parsed.error;
      } catch { /* 파싱 실패 무시 */ }
      errorText?.setText(msg);
      console.error('[MainMenu] 가입 에러:', err);
    }
  }

  private _closeLoginUI(): void {
    // FINDING-DR-3: ESC handler cleanup
    const escHandler = (this.loginContainer as any)?._loginEscHandler;
    if (escHandler) this.input.keyboard?.off('keydown-ESC', escHandler);
    this._cleanupDom();
    this.loginContainer?.destroy();
    this.loginContainer = null;
    this.modalButtonFrames = [];
    this.modalCloseIcons = [];
    this.fallbackModalCloseIconIds = [];
    // 메뉴 버튼 다시 표시
    this.menuItems.forEach(btn => btn.setVisible(true));
    this.menuButtonFrames.forEach(frame => frame.setVisible(true));
    this.menuButtonIcons.forEach(icon => icon.setVisible(true));
    this.menuFocusIcon?.setVisible(true);
    this._syncMenuButtonFrames();
    this._writeMainMenuFrameQaProbe();
  }

  private _cleanupDom(): void {
    this.usernameInput?.remove();
    this.passwordInput?.remove();
    this.usernameInput = null;
    this.passwordInput = null;
  }

  // ── 기존 메뉴 동작 ──────────────────────────────────────

  // FINDING-A4 fix part 2: 키보드 highlight 동기화 helper
  private _formatMenuLabel(i: number): string {
    const label = this.menuLabels[i] ?? '';
    return this._hasMenuButtonIcon(i) || this._hasMenuFocusIcon() ? label : (i === this.menuHighlightIndex ? `▶  ${label}` : `   ${label}`);
  }

  private _setMenuHighlight(index: number): void {
    if (index === this.menuHighlightIndex) return;
    this.menuHighlightIndex = index;
    this.menuItems.forEach((btn, i) => {
      btn.setText(this._formatMenuLabel(i));
      btn.setColor(i === index ? '#ffffff' : '#cccccc');
    });
    this._syncMenuButtonFrames();
    this._writeMainMenuFrameQaProbe();
  }

  private _addMenuButtonFrame(x: number, y: number, index: number, action: () => void): void {
    const buttonFrame = MAIN_MENU_UI_FRAME_TEXTURES.menuButton;
    if (!this.textures.exists(buttonFrame.key)) return;

    const frame = this.add.image(x, y, buttonFrame.key)
      .setName(`main_menu_button_frame_${index}`)
      .setDisplaySize(260, 38)
      .setAlpha(0)
      .setTint(index === this.menuHighlightIndex ? 0xffffff : 0x9aa8d8)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => this.focusRing?.focus(index))
      .on('pointerdown', action);

    this.menuButtonFrames.push(frame);
  }

  private _resolveMenuButtonIconResource(index: number): ReturnType<typeof getSpriteResourceForSkillIcon> {
    const spec = MAIN_MENU_BUTTON_ICON_SPECS[index];
    if (!spec) return undefined;
    return spec.kind === 'skill'
      ? getSpriteResourceForSkillIcon(spec.iconId)
      : getSpriteResourceForItemIcon(spec.itemIconId);
  }

  private _hasMenuButtonIcon(index: number): boolean {
    return this.menuButtonIcons[index]?.active === true;
  }

  private _hasMenuFocusIcon(): boolean {
    return this.menuFocusIcon?.active === true;
  }

  private _addMenuButtonIcon(x: number, y: number, index: number, action: () => void): void {
    const iconResource = this._resolveMenuButtonIconResource(index);
    if (!iconResource || !this.textures.exists(iconResource.key)) {
      this.menuButtonIconFallbackIndexes.push(index);
      return;
    }

    const icon = this.add.image(x - 82, y, iconResource.key)
      .setName(`main_menu_button_icon_${index}`)
      .setAlpha(0)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => this.focusRing?.focus(index))
      .on('pointerdown', action);
    icon.setDisplaySize(20, 20);
    icon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);

    this.menuButtonIcons[index] = icon;
  }

  private _addMenuFocusIcon(x: number, y: number): void {
    const focusIconResource = getSpriteResourceForSkillIcon(MAIN_MENU_FOCUS_ICON_ID);
    if (!focusIconResource || !this.textures.exists(focusIconResource.key)) return;

    this.menuFocusIcon = this.add.image(x - MAIN_MENU_FOCUS_ICON_OFFSET_X, y, focusIconResource.key)
      .setName('main_menu_focus_icon')
      .setAlpha(0)
      .setTint(0xffffff);
    this.menuFocusIcon.setDisplaySize(MAIN_MENU_FOCUS_ICON_SIZE, MAIN_MENU_FOCUS_ICON_SIZE);
    this.menuFocusIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
  }

  private _addMainMenuModalButtonFrame(
    container: Phaser.GameObjects.Container,
    x: number,
    y: number,
    width: number,
    height: number,
    name: string,
    action: () => void,
    tint = 0xffffff,
    alpha = 0.74,
  ): void {
    const buttonFrame = MAIN_MENU_UI_FRAME_TEXTURES.modalButton;
    if (!this.textures.exists(buttonFrame.key)) return;

    const frame = this.add.image(x, y, buttonFrame.key)
      .setName(name)
      .setDisplaySize(width, height)
      .setAlpha(alpha)
      .setTint(tint)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', action);

    container.add(frame);
    this.modalButtonFrames.push(frame);
  }

  private _addMainMenuModalCloseIcon(
    container: Phaser.GameObjects.Container,
    x: number,
    y: number,
    action: () => void,
    name: string,
    fallbackId: string,
  ): void {
    const modalCloseIconResource = getSpriteResourceForSkillIcon(MAIN_MENU_MODAL_CLOSE_ICON_ID);
    if (modalCloseIconResource && this.textures.exists(modalCloseIconResource.key)) {
      const icon = this.add.image(x, y, modalCloseIconResource.key)
        .setName(name)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', action);
      icon.setDisplaySize(16, 16);
      icon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      container.add(icon);
      this.modalCloseIcons.push(icon);
      return;
    }

    const fallback = this.add.text(x, y, 'x', {
      fontSize: '16px',
      color: '#d6d6ff',
      fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
      stroke: '#101020',
      strokeThickness: 2,
    })
      .setName(`${name}_fallback`)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', action);
    container.add(fallback);
    this.fallbackModalCloseIconIds.push(fallbackId);
  }

  private _getMenuButtonFrameAlpha(index: number): number {
    return index === this.menuHighlightIndex ? 0.88 : 0.62;
  }

  private _syncMenuButtonFrames(): void {
    this.menuButtonFrames.forEach((frame, index) => {
      frame.setTint(index === this.menuHighlightIndex ? 0xffffff : 0x9aa8d8);
      frame.setAlpha(this._getMenuButtonFrameAlpha(index));
    });
    this.menuButtonIcons.forEach((icon, index) => {
      icon.setTint(index === this.menuHighlightIndex ? 0xffffff : 0xb8c0e8);
      icon.setAlpha(this._getMenuButtonFrameAlpha(index));
    });
    const activeButton = this.menuItems[this.menuHighlightIndex];
    if (activeButton) {
      this.menuFocusIcon?.setPosition(activeButton.x - MAIN_MENU_FOCUS_ICON_OFFSET_X, activeButton.y);
      this.menuFocusIcon?.setAlpha(this._getMenuButtonFrameAlpha(this.menuHighlightIndex));
      this.menuFocusIcon?.setTint(0xffffff);
    }
  }

  private _isMainMenuFrameQaRoute(): boolean {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('mainMenuFrameQa') === '1';
  }

  private _writeMainMenuFrameQaProbe(): void {
    if (!this._isMainMenuFrameQaRoute() || typeof document === 'undefined') return;

    const buttonFrame = MAIN_MENU_UI_FRAME_TEXTURES.menuButton;
    const modalButtonFrame = MAIN_MENU_UI_FRAME_TEXTURES.modalButton;
    const modalInputFrame = MAIN_MENU_UI_FRAME_TEXTURES.modalInput;
    const visibleCanvasCount = Array.from(document.querySelectorAll('canvas'))
      .filter((canvas) => canvas instanceof HTMLCanvasElement && canvas.offsetWidth > 0 && canvas.offsetHeight > 0)
      .length;
    const hasTexture = this.textures.exists(buttonFrame.key);
    const hasExpectedMenuFrames = hasTexture && this.menuButtonFrames.length === MAIN_MENU_EXPECTED_MENU_BUTTON_FRAME_COUNT;
    const activeModal = this.loginContainer ? 'login' : this.creditsOverlay ? 'credits' : 'none';
    const expectedModalButtonFrameCount = activeModal === 'login'
      ? MAIN_MENU_EXPECTED_LOGIN_BUTTON_FRAME_COUNT
      : activeModal === 'credits'
        ? MAIN_MENU_EXPECTED_CREDITS_BUTTON_FRAME_COUNT
        : 0;
    const expectedModalCloseIconCount = activeModal === 'none' ? 0 : MAIN_MENU_EXPECTED_MODAL_CLOSE_ICON_COUNT;
    const focusIconResource = getSpriteResourceForSkillIcon(MAIN_MENU_FOCUS_ICON_ID);
    const hasMenuFocusIcon = this.menuFocusIcon?.active === true;
    const modalCloseIconResource = getSpriteResourceForSkillIcon(MAIN_MENU_MODAL_CLOSE_ICON_ID);
    const activeModalCloseIcons = this.modalCloseIcons.filter((icon) => icon.active);
    const hasExpectedModalFrames = expectedModalButtonFrameCount === 0 || (
      this.textures.exists(modalButtonFrame.key)
      && this.modalButtonFrames.length === expectedModalButtonFrameCount
    );
    const loginInputs = [this.usernameInput, this.passwordInput]
      .filter((input): input is HTMLInputElement => input instanceof HTMLInputElement);
    const expectedModalInputFrameCount = activeModal === 'login'
      ? MAIN_MENU_EXPECTED_LOGIN_INPUT_FRAME_COUNT
      : 0;
    const hasExpectedModalInputFrames = expectedModalInputFrameCount === 0 || (
      this.textures.exists(modalInputFrame.key)
      && loginInputs.length === expectedModalInputFrameCount
      && loginInputs.every((input) => (
        input.dataset.aeternaFrameKey === modalInputFrame.key
        && input.dataset.aeternaFramePath === modalInputFrame.path
        && input.style.backgroundImage.includes(modalInputFrame.path)
      ))
    );
    const missingFrameKeys = Array.from(new Set([
      ...(hasExpectedMenuFrames ? [] : [buttonFrame.key]),
      ...(hasExpectedModalFrames ? [] : [modalButtonFrame.key]),
      ...(hasExpectedModalInputFrames ? [] : [modalInputFrame.key]),
    ]));
    const menuButtonIconStates = MAIN_MENU_BUTTON_ICON_SPECS.map((spec, index) => {
      const iconResource = this._resolveMenuButtonIconResource(index);
      const icon = this.menuButtonIcons[index];
      const iconId = spec.kind === 'skill' ? spec.iconId : spec.itemIconId;
      return {
        index,
        kind: spec.kind,
        iconId,
        key: iconResource?.key ?? null,
        path: iconResource?.path ?? null,
        rendered: icon?.active === true,
        visible: icon?.visible === true,
        displayWidth: icon?.displayWidth ?? 0,
        displayHeight: icon?.displayHeight ?? 0,
        fallbackRendered: this.menuButtonIconFallbackIndexes.includes(index),
      };
    });
    const missingMenuButtonIconKeys = menuButtonIconStates
      .filter((entry) => !entry.rendered)
      .map((entry) => entry.key ?? entry.iconId);
    const missingMenuFocusIconKeys = hasMenuFocusIcon
      ? []
      : [focusIconResource?.key ?? MAIN_MENU_FOCUS_ICON_ID];
    const menuLabelLegacyGlyphPresent = this.menuItems.some((text) => text.text.includes('▶'));
    const missingModalCloseIconKeys = expectedModalCloseIconCount > 0
      && (activeModalCloseIcons.length < expectedModalCloseIconCount || !modalCloseIconResource || !this.textures.exists(modalCloseIconResource.key))
      ? [modalCloseIconResource?.key ?? MAIN_MENU_MODAL_CLOSE_ICON_ID]
      : [];

    document.body.dataset.aeternaMainMenuFrameQa = JSON.stringify({
      status: missingFrameKeys.length === 0
        && missingMenuButtonIconKeys.length === 0
        && missingMenuFocusIconKeys.length === 0
        && missingModalCloseIconKeys.length === 0
        && this.fallbackModalCloseIconIds.length === 0
        ? 'ready'
        : 'missing-frame',
      renderedFrameKeys: this.menuButtonFrames.length > 0 ? [buttonFrame.key] : [],
      renderedFrameCount: this.menuButtonFrames.length,
      expectedFrameCount: MAIN_MENU_EXPECTED_MENU_BUTTON_FRAME_COUNT,
      missingFrameKeys,
      missingMenuButtonIconKeys,
      missingMenuFocusIconKeys,
      activeMenuIndex: this.menuHighlightIndex,
      activeModal,
      menuLabels: this.menuLabels,
      menuLabelLegacyGlyphPresent,
      menuButtonIcon: {
        renderedCount: menuButtonIconStates.filter((entry) => entry.rendered).length,
        expectedCount: MAIN_MENU_EXPECTED_MENU_BUTTON_ICON_COUNT,
        icons: menuButtonIconStates,
        fallbackIndexes: this.menuButtonIconFallbackIndexes,
        missingIconKeys: missingMenuButtonIconKeys,
      },
      menuFocusIcon: {
        iconId: MAIN_MENU_FOCUS_ICON_ID,
        key: focusIconResource?.key ?? null,
        path: focusIconResource?.path ?? null,
        renderedCount: hasMenuFocusIcon ? 1 : 0,
        expectedCount: MAIN_MENU_EXPECTED_FOCUS_ICON_COUNT,
        activeIndex: this.menuHighlightIndex,
        displayWidth: this.menuFocusIcon?.displayWidth ?? 0,
        displayHeight: this.menuFocusIcon?.displayHeight ?? 0,
        x: this.menuFocusIcon?.x ?? null,
        y: this.menuFocusIcon?.y ?? null,
        visible: this.menuFocusIcon?.visible === true,
        missingIconKeys: missingMenuFocusIconKeys,
        menuLabelLegacyGlyphPresent,
      },
      modalCloseIcon: {
        iconId: MAIN_MENU_MODAL_CLOSE_ICON_ID,
        key: modalCloseIconResource?.key ?? null,
        path: modalCloseIconResource?.path ?? null,
        renderedCount: activeModalCloseIcons.length,
        expectedCount: expectedModalCloseIconCount,
        displaySizes: activeModalCloseIcons.map((icon) => ({
          name: icon.name,
          width: icon.displayWidth,
          height: icon.displayHeight,
          visible: icon.visible,
        })),
        fallbackModalCloseIconIds: this.fallbackModalCloseIconIds,
        missingIconKeys: missingModalCloseIconKeys,
      },
      menuButtonFrame: {
        key: buttonFrame.key,
        path: buttonFrame.path,
        renderedCount: this.menuButtonFrames.length,
        expectedCount: MAIN_MENU_EXPECTED_MENU_BUTTON_FRAME_COUNT,
        displaySizes: this.menuButtonFrames.map((frame) => ({
          width: frame.displayWidth,
          height: frame.displayHeight,
          visible: frame.visible,
        })),
      },
      modalButtonFrame: {
        key: modalButtonFrame.key,
        path: modalButtonFrame.path,
        renderedCount: this.modalButtonFrames.length,
        expectedCount: expectedModalButtonFrameCount,
        displaySizes: this.modalButtonFrames.map((frame) => ({
          width: frame.displayWidth,
          height: frame.displayHeight,
          visible: frame.visible,
        })),
      },
      modalInputFrame: {
        key: modalInputFrame.key,
        path: modalInputFrame.path,
        renderedCount: activeModal === 'login' ? loginInputs.length : 0,
        expectedCount: expectedModalInputFrameCount,
        cssBackgrounds: loginInputs.map((input) => input.style.backgroundImage),
        displaySizes: loginInputs.map((input) => {
          const rect = input.getBoundingClientRect();
          return {
            width: rect.width,
            height: rect.height,
            visible: input.offsetWidth > 0 && input.offsetHeight > 0,
          };
        }),
      },
      visibleCanvasCount,
    });
  }

  private _onSettings(): void {
    this.scene.start('SettingsScene');
  }

  private _onCredits(): void {
    this._showCreditsOverlay();
  }

  // ── 배경 ─────────────────────────────────────────────────

  private _drawGradientBg(w: number, h: number): void {
    const gfx = this.add.graphics();
    const steps = 32;
    for (let i = 0; i < steps; i++) {
      const ratio = i / steps;
      const color = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.IntegerToColor(BG_COLOR_TOP),
        Phaser.Display.Color.IntegerToColor(BG_COLOR_BOTTOM),
        steps, i,
      );
      gfx.fillStyle(Phaser.Display.Color.GetColor(color.r, color.g, color.b));
      gfx.fillRect(0, ratio * h, w, h / steps + 1);
    }
  }

  private _spawnAetherParticles(w: number, h: number): void {
    this.particleTimer = this.time.addEvent({
      delay: 400,
      loop: true,
      callback: () => {
        const x = Phaser.Math.Between(0, w);
        const y = Phaser.Math.Between(0, h);
        const particleTexture = MAIN_MENU_AETHER_PARTICLE_TEXTURE;
        const size = Phaser.Math.Between(2, 4);
        let dot: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
        if (this.textures.exists(particleTexture.key)) {
          dot = this.add.image(x, y, particleTexture.key)
            .setDisplaySize(size * 2, size * 5)
            .setAlpha(0.35)
            .setTint(0xaaaaff)
            .setAngle(Phaser.Math.Between(-18, 18));
        } else {
          // Aseprite particle texture 로드 실패 시에만 사용하는 안전 fallback.
          dot = this.add.rectangle(x, y, size, size, 0xaaaaff, 0.3);
        }
        this.tweens.add({
          targets: dot, alpha: 0, y: y - 40, duration: 2000, ease: 'Power1',
          onComplete: () => dot.destroy(),
        });
      },
    });
  }

  private _showCreditsOverlay(): void {
    // 키보드 컷오버(감사 rank4): (a) 중복 가드 — 메뉴 focusRing 이 크레딧 위에서도 살아 있어
    //   Enter 연타가 오버레이를 겹겹이 쌓던 중첩 차단. (b) ESC 닫기 — [ 닫기 ] 가 pointerdown
    //   단독이라 keyboardOnlyMode 에선 열면 영영 못 닫는 트랩이었다.
    if (this.creditsOverlay) return;

    const { width, height } = this.cameras.main;
    const cx = width / 2;
    const cy = height / 2;

    this.modalButtonFrames = [];
    this.modalCloseIcons = [];
    this.fallbackModalCloseIconIds = [];
    const container = this.add.container(cx, cy);
    const creditsFrame = MAIN_MENU_UI_FRAME_TEXTURES.creditsPanel;
    if (this.textures.exists(creditsFrame.key)) {
      const bg = this.add.image(0, 0, creditsFrame.key)
        .setDisplaySize(400, 300)
        .setAlpha(0.9);
      container.add(bg);
      container.add(this.add.rectangle(0, 0, 400, 300, 0x000000, 0)
        .setStrokeStyle(1, 0x6644aa));
    } else {
      // Aseprite credits UI frame 로드 실패 시에만 사용하는 안전 fallback.
      const bg = this.add.rectangle(0, 0, 400, 300, 0x000000, 0.9)
        .setStrokeStyle(1, 0x6644aa);
      container.add(bg);
    }

    const onCreditsEsc = (): void => closeCredits();
    const closeCredits = (): void => {
      this.input.keyboard?.off('keydown-ESC', onCreditsEsc);
      container.destroy();
      this.creditsOverlay = null;
      this.modalButtonFrames = [];
      this.modalCloseIcons = [];
      this.fallbackModalCloseIconIds = [];
      this._writeMainMenuFrameQaProbe();
    };

    const credits = [
      '— 에테르나 크로니클 —', '',
      '기획·개발: Crisious',
      '엔진: Phaser 3',
      '서버: Fastify + Prisma', '',
      '[ 닫기 ] (ESC)',
    ];

    credits.forEach((line, i) => {
      const isClose = line.startsWith('[ 닫기 ]');
      if (isClose) {
        this._addMainMenuModalButtonFrame(container, 0, -100 + i * 28, 154, 30, 'main_menu_credits_close_button_frame', closeCredits, 0xb6ffb6);
        this._addMainMenuModalCloseIcon(container, -56, -100 + i * 28, closeCredits, 'main_menu_credits_close_icon', 'credits');
      }
      const txt = this.add.text(0, -100 + i * 28, line, {
        fontSize: isClose ? '16px' : '14px',
        color: isClose ? '#88ff88' : '#cccccc',
        fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
      }).setOrigin(0.5);
      if (isClose) {
        txt.setInteractive({ useHandCursor: true });
        txt.on('pointerdown', closeCredits);
      }
      container.add(txt);
    });

    this.input.keyboard?.on('keydown-ESC', onCreditsEsc);
    this.creditsOverlay = container;
    this._writeMainMenuFrameQaProbe();
  }

  shutdown(): void {
    this._cleanupDom();
    this.particleTimer?.destroy();
    this.menuItems = [];
    this.menuButtonFrames = [];
    this.menuButtonIcons = [];
    this.menuButtonIconFallbackIndexes = [];
    this.menuFocusIcon = null;
    this.modalButtonFrames = [];
    this.modalCloseIcons = [];
    this.fallbackModalCloseIconIds = [];
  }
}
