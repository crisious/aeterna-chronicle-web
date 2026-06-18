/**
 * SettingsScene.ts — 설정 화면 (P7-09)
 *
 * 기능:
 *   - 볼륨 조절 (BGM / SFX)
 *   - 언어 선택 (한국어 / English / 日本語)
 *   - 키바인드 표시 (읽기 전용, 향후 리바인드 확장)
 *   - 접근성 옵션 (화면 흔들림, 자막 크기, 색약 모드)
 *   - 뒤로가기 → MainMenuScene 복귀
 */

import * as Phaser from 'phaser';
import { SceneManager } from './SceneManager';
import { accessibilityManager, type SubtitleSize } from '../accessibility/AccessibilityManager';
import { i18n, type SupportedLocale } from '../i18n/i18nManager';
import { getSettingsLabel } from '../settings/settingsLabels';
import { networkManager } from '../network/NetworkManager';
import { getSpriteResourceForSkillIcon, getSpriteResourceForUiIcon } from '../assets/spriteResourceManifest';

// ── 설정 저장 키 ─────────────────────────────────────────────

const STORAGE_KEY = 'aeterna_settings';

// FINDING-A4 ext10: 색약 모드 → html data-cb-sim 속성 적용
// cb-simulator-filters.css 가 [data-cb-sim="..."] selector 로 SVG 필터 활성
// (#game-container + .a11y-cb-sim-target). index.html 124-140 의 inline SVG defs 참조.
export function applyColorblindMode(mode: string): void {
  if (typeof document === 'undefined') return;
  if (mode === 'off' || !mode) {
    document.documentElement.removeAttribute('data-cb-sim');
  } else {
    document.documentElement.setAttribute('data-cb-sim', mode);
  }
}

// FINDING-A4 ext15: SFX 볼륨 검사 (SFXHelper.playSfx 의 master volume 별개)
// SettingsScene 의 BGM 볼륨은 sound.setVolume(v) 로 master 적용,
// SFX 볼륨은 별개 슬라이더로 playSfx 호출 시 곱셈.
export function getSfxVolume(): number {
  if (typeof document === 'undefined') return 1;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return 0.8; // default
    const parsed = JSON.parse(raw) as { sfxVolume?: number };
    const v = parsed.sfxVolume;
    return typeof v === 'number' ? Math.max(0, Math.min(1, v)) : 0.8;
  } catch {
    return 0.8;
  }
}

// 모션 감소 신호의 단일 출처(WCAG 2.3.3): OS prefers-reduced-motion **또는**
// 인게임 '모션 감소' 토글(AccessibilityManager). 전투의 데코레이티브/연속 트윈
// (idle bob·AUTO 펄스 등) 게이트에 사용. 이전엔 prefers-reduced-motion 만 봤고
// 인게임 토글은 전투 트윈에 미연동이었다(combat-ux r19).
export function isMotionReduced(): boolean {
  if (typeof document === 'undefined') return false;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return true;
  try {
    return accessibilityManager.getSettings().reduceMotion === true;
  } catch {
    return false;
  }
}

// FINDING-A4 ext11: screenShake 설정 검사 (BattleScene/ComboUI 의 cameras.shake() 전)
// 모션 감소(OS 또는 인게임 토글) 시 우선 false — 코드베이스가 이 함수를 전투
// 모션의 사실상 게이트로 써왔으므로, 인게임 reduceMotion 토글도 여기로 연동됨.
export function isScreenShakeEnabled(): boolean {
  if (typeof document === 'undefined') return true;
  if (isMotionReduced()) return false; // prefers-reduced-motion + 인게임 토글 (WCAG 2.3.3)
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return true; // default true
    const parsed = JSON.parse(raw) as { screenShake?: boolean };
    return parsed.screenShake !== false;
  } catch {
    return true;
  }
}

// 활성 캐릭터 스킨(팔레트 스왑 코스메틱, Phase D Part②) 검사. 씬들이 preload·
// spawn·anim 에서 getCharacterSpriteResource(classId, skin) 으로 사용한다.
// 'base'(또는 미설정)는 원본. isScreenShakeEnabled 과 동일한 localStorage 패턴.
export function getActiveCharacterSkin(): string {
  if (typeof document === 'undefined') return 'base';
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return 'base';
    const parsed = JSON.parse(raw) as { characterSkin?: string };
    return typeof parsed.characterSkin === 'string' && parsed.characterSkin ? parsed.characterSkin : 'base';
  } catch {
    return 'base';
  }
}

// ── 기본 설정 값 ─────────────────────────────────────────────

interface GameSettings {
  bgmVolume: number;        // 0.0 ~ 1.0
  sfxVolume: number;        // 0.0 ~ 1.0
  language: string;         // 'ko' | 'en' | 'ja'
  screenShake: boolean;
  subtitleSize: string;     // 'small' | 'medium' | 'large'
  colorblindMode: string;   // 'off' | 'protanopia' | 'deuteranopia' | 'tritanopia'
}

const DEFAULT_SETTINGS: GameSettings = {
  bgmVolume: 0.7,
  sfxVolume: 0.8,
  language: 'ko',
  screenShake: true,
  subtitleSize: 'medium',
  colorblindMode: 'off',
};

// ── 언어 라벨 ────────────────────────────────────────────────

const LANGUAGE_OPTIONS: Array<{ code: string; label: string }> = [
  { code: 'ko', label: '한국어' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
];

const SUBTITLE_SIZES = ['small', 'medium', 'large'];
const COLORBLIND_MODES = ['off', 'protanopia', 'deuteranopia', 'tritanopia'];

const COLORBLIND_LABELS: Record<string, string> = {
  off: '없음',
  protanopia: '적색약',
  deuteranopia: '녹색약',
  tritanopia: '청색약',
};

// UI 스케일 이산 단계 — DisplayScaler.VALID_SCALES 와 정합. 연속 슬라이더가 아니라
// 유효 스냅 값만 노출하므로 cycle 버튼으로 표시(LEFT/RIGHT 로 단계 이동).
const UI_SCALE_VALUES = [0.75, 1.0, 1.25, 1.5, 2.0];
const UI_SCALE_LABELS = ['75%', '100%', '125%', '150%', '200%'];

const SETTINGS_UI_FRAME_TEXTURES = {
  mainPanel: {
    key: 'ui_frame_UI-SET-002-DEF',
    path: 'assets/generated/ui/frames/UI-SET-002-DEF.png',
  },
  keybindPanel: {
    key: 'ui_frame_UI-SET-003-DEF',
    path: 'assets/generated/ui/frames/UI-SET-003-DEF.png',
  },
  footerPanel: {
    key: 'ui_frame_UI-SET-004-DEF',
    path: 'assets/generated/ui/frames/UI-SET-004-DEF.png',
  },
  actionButton: {
    key: 'ui_frame_settings_action_button',
    path: 'assets/generated/ui/frames/UI-BTN-006-DEF.png',
  },
  sliderTrack: {
    key: 'ui_frame_settings_slider_track',
    path: 'assets/generated/ui/frames/UI-BTN-005-DEF.png',
  },
} as const;

const SETTINGS_EXPECTED_SLIDER_TRACK_FRAME_COUNT = 3;
const SETTINGS_EXPECTED_ACTION_ICON_COUNT = 2;
const SETTINGS_EXPECTED_SECTION_ICON_COUNT = 5;

const SETTINGS_ACTION_BUTTON_ICON_IDS = {
  feedback: 'skill_mw_arrow',
  back: 'skill_tg_reverse',
} as const;

const SETTINGS_FOCUS_ICON_ID = 'skill_mw_arrow';
const SETTINGS_FOCUS_ICON_SIZE = 14;
const SETTINGS_SECTION_ICON_SIZE = 18;
const SETTINGS_TITLE_SECTION_ICON_SIZE = 22;

const SETTINGS_SECTION_ICON_IDS = {
  title: 'settings_title',
  sound: 'settings_sound',
  language: 'settings_language',
  accessibility: 'settings_accessibility',
  keybind: 'settings_keybind',
} as const;

const SETTINGS_SECTION_FALLBACK_GLYPHS = {
  title: '⚙',
  sound: '🔊',
  language: '🌐',
  accessibility: '♿',
  keybind: '⌨',
} as const;

type SettingsActionIconId = keyof typeof SETTINGS_ACTION_BUTTON_ICON_IDS;
type SettingsSectionIconId = keyof typeof SETTINGS_SECTION_ICON_IDS;

interface SettingsSceneData {
  frameQa?: boolean;
}

interface SettingsFrameRender {
  primary: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
  stroke?: Phaser.GameObjects.Rectangle;
}

// ── 키바인드 표시용 ──────────────────────────────────────────

const KEYBINDS = [
  { action: '이동',       key: 'WASD / 방향키' },
  { action: '공격',       key: 'Space / 클릭' },
  { action: '스킬 1~4',   key: '1 / 2 / 3 / 4' },
  { action: '인벤토리',    key: 'I' },
  { action: '맵',         key: 'M' },
  { action: '대화 진행',   key: 'Enter / Space' },
  { action: '스킵',       key: 'ESC' },
];

// ── SettingsScene ────────────────────────────────────────────

// FINDING-A4 ext4: Settings 항목 키보드 nav 인터페이스
type SettingsSelectable = {
  setHighlighted: (b: boolean) => void;
  activate: () => void;
  adjust?: (delta: number) => void;
};

export class SettingsScene extends Phaser.Scene {
  private settings!: GameSettings;
  private uiElements: Phaser.GameObjects.GameObject[] = [];
  private sceneData: SettingsSceneData = {};
  private frameQaRenderedCounts = new Map<string, number>();
  private settingsSliderFrames: Phaser.GameObjects.Image[] = [];
  private settingsActionIcons: Phaser.GameObjects.Image[] = [];
  private settingsSectionIcons: Phaser.GameObjects.Image[] = [];
  private missingActionIconKeys: string[] = [];
  private missingSectionIconKeys: string[] = [];
  private fallbackActionIconIds: string[] = [];
  private fallbackSectionIconIds: string[] = [];
  private settingsFocusIcon: Phaser.GameObjects.Image | null = null;
  private settingsFocusIconFallbackRendered = false;
  private settingsFocusLabelTexts: Phaser.GameObjects.Text[] = [];
  private settingsSectionHeadingTexts: Phaser.GameObjects.Text[] = [];

  // FINDING-A4 ext4: 키보드 nav state
  private settingsItems: SettingsSelectable[] = [];
  private settingsIndex = 0;
  private _settingsKeyboardCleanup: (() => void) | null = null;

  constructor() {
    super({ key: 'SettingsScene' });
  }

  init(data?: SettingsSceneData): void {
    this.sceneData = data ?? {};
    this.frameQaRenderedCounts.clear();
    this.settingsSliderFrames = [];
    this.settingsActionIcons = [];
    this.settingsSectionIcons = [];
    this.missingActionIconKeys = [];
    this.missingSectionIconKeys = [];
    this.fallbackActionIconIds = [];
    this.fallbackSectionIconIds = [];
    this.settingsFocusIcon = null;
    this.settingsFocusIconFallbackRendered = false;
    this.settingsFocusLabelTexts = [];
    this.settingsSectionHeadingTexts = [];
  }

  preload(): void {
    for (const texture of Object.values(SETTINGS_UI_FRAME_TEXTURES)) {
      if (!this.textures.exists(texture.key)) {
        this.load.image(texture.key, texture.path);
      }
    }
    const queuedSettingsIconKeys = new Set<string>();
    this._preloadSettingsSkillIcon(SETTINGS_FOCUS_ICON_ID, queuedSettingsIconKeys);
    for (const iconId of Object.values(SETTINGS_ACTION_BUTTON_ICON_IDS)) {
      this._preloadSettingsSkillIcon(iconId, queuedSettingsIconKeys);
    }
    const queuedSettingsUiIconKeys = new Set<string>();
    for (const iconId of Object.values(SETTINGS_SECTION_ICON_IDS)) {
      this._preloadSettingsUiIcon(iconId, queuedSettingsUiIconKeys);
    }
  }

  private _preloadSettingsSkillIcon(iconId: string, queuedSettingsIconKeys: Set<string>): void {
    const actionIconResource = getSpriteResourceForSkillIcon(iconId);
    if (
      actionIconResource
      && !this.textures.exists(actionIconResource.key)
      && !queuedSettingsIconKeys.has(actionIconResource.key)
    ) {
      this.load.image(actionIconResource.key, actionIconResource.path);
      queuedSettingsIconKeys.add(actionIconResource.key);
    }
  }

  private _preloadSettingsUiIcon(uiIconId: string, queuedSettingsUiIconKeys: Set<string>): void {
    const uiIconResource = getSpriteResourceForUiIcon(uiIconId);
    if (
      uiIconResource
      && !this.textures.exists(uiIconResource.key)
      && !queuedSettingsUiIconKeys.has(uiIconResource.key)
    ) {
      this.load.image(uiIconResource.key, uiIconResource.path);
      queuedSettingsUiIconKeys.add(uiIconResource.key);
    }
  }

  create(): void {
    this.settings = this._loadSettings();
    this.frameQaRenderedCounts.clear();
    this.settingsSliderFrames = [];
    this.settingsActionIcons = [];
    this.settingsSectionIcons = [];
    this.missingActionIconKeys = [];
    this.missingSectionIconKeys = [];
    this.fallbackActionIconIds = [];
    this.fallbackSectionIconIds = [];
    this.settingsFocusIcon = null;
    this.settingsFocusIconFallbackRendered = false;
    this.settingsFocusLabelTexts = [];
    this.settingsSectionHeadingTexts = [];
    // FINDING-A4 ext10: 색약 모드 진입 시 즉시 적용 (cb-simulator-filters.css SVG 필터)
    applyColorblindMode(this.settings.colorblindMode);
    const { width, height } = this.cameras.main;

    // 배경
    this.cameras.main.setBackgroundColor('#0a0a2e');
    this._addSettingsFrame(width / 2 - 310, height / 2 + 32, 620, height - 132, SETTINGS_UI_FRAME_TEXTURES.mainPanel);
    this._addSettingsFrame(width - 230, 242, 370, 320, SETTINGS_UI_FRAME_TEXTURES.keybindPanel);
    this._addSettingsFrame(width / 2, height - 76, 430, 116, SETTINGS_UI_FRAME_TEXTURES.footerPanel);

    // 타이틀
    this._addSettingsSectionHeading('title', width / 2, 40, '설정', 28, '#c8a2ff', true);

    let y = 100;
    const leftX = 80;
    const rightX = width - 80;

    // ── 볼륨 섹션 ──
    this._addSettingsSectionHeading('sound', leftX, y, '사운드', 20, '#aaaacc');
    y += 40;

    // SSOT wiring: 설정 라벨은 SCENARIO_SETTINGS_DESCRIPTIONS 단일 출처 (settingsLabels)
    this._addSlider(leftX, y, getSettingsLabel('audio_bgm'), this.settings.bgmVolume, (v) => {
      this.settings.bgmVolume = v;
      this.sound.setVolume(v);
    });
    y += 50;

    this._addSlider(leftX, y, getSettingsLabel('audio_sfx'), this.settings.sfxVolume, (v) => {
      this.settings.sfxVolume = v;
    });
    y += 60;

    // ── 언어 섹션 ──
    this._addSettingsSectionHeading('language', leftX, y, '언어', 20, '#aaaacc');
    y += 40;

    this._addCycleButton(leftX, y, '언어',
      LANGUAGE_OPTIONS.map(o => o.label),
      LANGUAGE_OPTIONS.findIndex(o => o.code === this.settings.language),
      (idx) => {
        this.settings.language = LANGUAGE_OPTIONS[idx].code;
        // FINDING-A4 ext14: i18nManager 동기화 — locale 변경 + 리스너 알림
        i18n.setLocale(this.settings.language as SupportedLocale);
      },
    );
    y += 60;

    // ── 접근성 섹션 ──
    this._addSettingsSectionHeading('accessibility', leftX, y, '접근성', 20, '#aaaacc');
    y += 40;

    this._addToggle(leftX, y, '화면 흔들림', this.settings.screenShake, (v) => {
      this.settings.screenShake = v;
    });
    y += 40;

    this._addCycleButton(leftX, y, getSettingsLabel('accessibility_subtitle'), SUBTITLE_SIZES,
      SUBTITLE_SIZES.indexOf(this.settings.subtitleSize),
      (idx) => {
        this.settings.subtitleSize = SUBTITLE_SIZES[idx];
        // FINDING-A4 ext12: AccessibilityManager 와 동기화 — 자막 표시 즉시 갱신
        accessibilityManager.setSubtitleSize(SUBTITLE_SIZES[idx] as SubtitleSize);
      },
    );
    y += 40;

    this._addCycleButton(leftX, y, getSettingsLabel('accessibility_colorblind'),
      COLORBLIND_MODES.map(m => COLORBLIND_LABELS[m] ?? m),
      COLORBLIND_MODES.indexOf(this.settings.colorblindMode),
      (idx) => {
        this.settings.colorblindMode = COLORBLIND_MODES[idx];
        // FINDING-A4 ext10: cycle 변경 시 즉시 SVG 필터 갱신
        applyColorblindMode(this.settings.colorblindMode);
      },
    );
    y += 40;

    // 전키보드 UI 컷오버 토글: 켜면 게임 캔버스 포인터(마우스·터치)를 비활성 — 모든 조작을 키보드로.
    // 상태 출처는 AccessibilityManager(localStorage 영속)이며, 키보드 nav 는 document 레벨이라
    // 이 토글을 켠 뒤에도 설정 화면을 계속 키보드로 조작할 수 있다(잠김 없음).
    this._addToggle(leftX, y, '키보드 전용 (마우스 끄기)',
      accessibilityManager.getSettings().keyboardOnlyMode,
      (v) => {
        accessibilityManager.setKeyboardOnlyMode(v);
      },
    );
    y += 40;

    // 이하 a11y 컨트롤은 과거 미연결 dead 씬 AccessibilitySettingsPanel 에만 있던 것을
    // 도달 가능한 이 화면으로 이식한 것(초기값 출처는 AccessibilityManager, localStorage 영속).
    this._addToggle(leftX, y, '고대비 모드', accessibilityManager.getSettings().highContrast, (v) => {
      accessibilityManager.setHighContrast(v);
    });
    y += 40;

    this._addToggle(leftX, y, '모션 감소', accessibilityManager.getSettings().reduceMotion, (v) => {
      accessibilityManager.setReduceMotion(v);
    });
    y += 40;

    this._addToggle(leftX, y, '자막 표시', accessibilityManager.getSettings().subtitlesEnabled, (v) => {
      accessibilityManager.setSubtitlesEnabled(v);
    });
    y += 50;

    // subtitleBgOpacity 는 0.0~1.0 비율 → _addSlider(퍼센트 슬라이더) 에 그대로 적합.
    this._addSlider(leftX, y, '자막 배경 불투명도', accessibilityManager.getSettings().subtitleBgOpacity, (v) => {
      accessibilityManager.setSubtitleBgOpacity(v);
    });
    y += 50;

    this._addToggle(leftX, y, '키보드 내비게이션', accessibilityManager.getSettings().keyboardNavEnabled, (v) => {
      accessibilityManager.setKeyboardNavEnabled(v);
    });
    y += 40;

    this._addToggle(leftX, y, '스크린리더 지원', accessibilityManager.getSettings().screenReaderEnabled, (v) => {
      accessibilityManager.setScreenReaderEnabled(v);
    });
    y += 40;

    // uiScale 은 유효 스냅 값(VALID_SCALES)만 → cycle 버튼. 현재값에 가장 가까운 단계로 초기화.
    {
      const cur = accessibilityManager.getSettings().uiScale;
      const startIdx = UI_SCALE_VALUES.reduce(
        (best, v, i) => (Math.abs(v - cur) < Math.abs(UI_SCALE_VALUES[best] - cur) ? i : best), 0);
      this._addCycleButton(leftX, y, 'UI 스케일', UI_SCALE_LABELS, startIdx, (idx) => {
        accessibilityManager.setUiScale(UI_SCALE_VALUES[idx]);
      });
    }
    y += 60;

    // ── 키바인드 섹션 (우측) ──
    let ky = 100;
    this._addSettingsSectionHeading('keybind', rightX - 150, ky, '키바인드', 20, '#aaaacc');
    ky += 40;
    for (const kb of KEYBINDS) {
      this._addText(rightX - 200, ky, kb.action, 14, '#888888');
      this._addText(rightX - 30, ky, kb.key, 14, '#cccccc');
      ky += 28;
    }

    // ── 피드백 보내기 (FeedbackForm 오버레이 launch) ──
    // FeedbackForm 은 서버 라우트(/beta/feedback)·관리자 대시보드까지 완비된 기능이며,
    // 여기 진입점으로 도달 가능해진다. launch 후 이 씬은 pause(입력 양보) → 닫으면 resume.
    let feedbackHighlighted = false;
    const feedbackBtnFrame = this._addSettingsFrame(
      width / 2,
      height - 100,
      250,
      42,
      SETTINGS_UI_FRAME_TEXTURES.actionButton,
      0.72,
      0x66bbff,
      1,
    );
    const feedbackIcon = this._addSettingsActionIcon('feedback', width / 2 - 82, height - 100);
    const feedbackLabel = feedbackIcon ? '피드백 보내기' : '📝 피드백 보내기';
    const feedbackBtn = this.add.text(feedbackIcon ? width / 2 + 12 : width / 2, height - 100, feedbackLabel, {
      fontSize: '18px',
      fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
      color: '#88ccff',
      stroke: '#102034',
      strokeThickness: 3,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    const openFeedback = () => {
      const env = (import.meta as unknown as { env?: Record<string, string> }).env;
      this.scene.launch('FeedbackForm', {
        apiUrl: env?.VITE_API_URL ?? 'http://localhost:3000',
        userId: networkManager.getUserId() ?? 'anonymous',
        gameVersion: env?.VITE_GAME_VERSION ?? '1.0.0',
        parentSceneKey: 'SettingsScene',
      });
      this.scene.pause();
    };
    feedbackBtnFrame.primary.setInteractive({ useHandCursor: true });
    feedbackBtnFrame.primary.on('pointerdown', openFeedback);
    feedbackBtn.on('pointerdown', openFeedback);
    const feedbackBtnIndex = this.settingsItems.length;
    feedbackBtnFrame.primary.on('pointerover', () => this._setSettingsIndex(feedbackBtnIndex));
    feedbackBtn.on('pointerover', () => this._setSettingsIndex(feedbackBtnIndex));
    this.settingsItems.push({
      setHighlighted: (b) => {
        feedbackHighlighted = b;
        feedbackBtn.setColor(b ? '#ffffff' : '#88ccff');
        feedbackBtn.setFontStyle(b ? 'bold' : 'normal');
      },
      activate: openFeedback,
    });
    void feedbackHighlighted;

    // ── 뒤로가기 버튼 ──
    let backHighlighted = false;
    const backBtnFrame = this._addSettingsFrame(
      width / 2,
      height - 60,
      220,
      44,
      SETTINGS_UI_FRAME_TEXTURES.actionButton,
      0.72,
      0x66ff88,
      1,
    );
    const backIcon = this._addSettingsActionIcon('back', width / 2 - 58, height - 60);
    const backLabel = backIcon ? '뒤로가기' : '◀ 뒤로가기';
    const backBtn = this.add.text(backIcon ? width / 2 + 12 : width / 2, height - 60, backLabel, {
      fontSize: '20px',
      fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
      color: '#88ff88',
      stroke: '#0d2a16',
      strokeThickness: 3,
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this._onBack());

    const backBtnIndex = this.settingsItems.length;
    backBtnFrame.primary.setInteractive({ useHandCursor: true });
    backBtnFrame.primary.on('pointerover', () => this._setSettingsIndex(backBtnIndex));
    backBtnFrame.primary.on('pointerdown', () => this._onBack());
    backBtn.on('pointerover', () => this._setSettingsIndex(backBtnIndex));
    this.settingsItems.push({
      setHighlighted: (b) => {
        backHighlighted = b;
        backBtn.setColor(b ? '#ffffff' : '#88ff88');
        backBtn.setFontStyle(b ? 'bold' : 'normal');
      },
      activate: () => this._onBack(),
    });
    void backHighlighted;

    // FINDING-A4 ext4: Settings 항목 키보드 nav (WCAG 2.1.1)
    // ArrowUp/Down: 항목 cycle / ArrowLeft/Right: slider 5% adjust 또는 cycle prev/next
    // Enter/Space: 활성화 (toggle / cycle next / 뒤로가기)
    if (this.settingsItems.length > 0) {
      this.settingsIndex = 0;
      this.settingsItems[0].setHighlighted(true);
    }

    const len = () => this.settingsItems.length;
    const onUp = () => {
      if (len() === 0) return;
      this._setSettingsIndex((this.settingsIndex + len() - 1) % len());
    };
    const onDown = () => {
      if (len() === 0) return;
      this._setSettingsIndex((this.settingsIndex + 1) % len());
    };
    const onLeft = () => this.settingsItems[this.settingsIndex]?.adjust?.(-1);
    const onRight = () => this.settingsItems[this.settingsIndex]?.adjust?.(+1);
    const onActivate = () => this.settingsItems[this.settingsIndex]?.activate();
    const onEsc = () => this._onBack();

    this.input.keyboard?.on('keydown-UP', onUp);
    this.input.keyboard?.on('keydown-DOWN', onDown);
    this.input.keyboard?.on('keydown-LEFT', onLeft);
    this.input.keyboard?.on('keydown-RIGHT', onRight);
    this.input.keyboard?.on('keydown-ENTER', onActivate);
    this.input.keyboard?.on('keydown-SPACE', onActivate);
    this.input.keyboard?.on('keydown-ESC', onEsc);

    this._settingsKeyboardCleanup = () => {
      this.input.keyboard?.off('keydown-UP', onUp);
      this.input.keyboard?.off('keydown-DOWN', onDown);
      this.input.keyboard?.off('keydown-LEFT', onLeft);
      this.input.keyboard?.off('keydown-RIGHT', onRight);
      this.input.keyboard?.off('keydown-ENTER', onActivate);
      this.input.keyboard?.off('keydown-SPACE', onActivate);
      this.input.keyboard?.off('keydown-ESC', onEsc);
    };

    if (this.sceneData.frameQa === true || this._isSettingsFrameQaRoute()) {
      this._writeSettingsFrameQaProbe();
    }

    // 페이드 인
    SceneManager.fadeIn(this, 300);
  }

  // ── 액션 ──────────────────────────────────────────────────

  private _onBack(): void {
    this._saveSettings();
    this.scene.start('MainMenuScene');
  }

  // ── UI 헬퍼 ───────────────────────────────────────────────

  private _addText(x: number, y: number, text: string, size: number, color: string, center = false): Phaser.GameObjects.Text {
    const t = this.add.text(x, y, text, {
      fontSize: `${size}px`,
      fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
      color,
    });
    if (center) t.setOrigin(0.5, 0);
    this.uiElements.push(t);
    return t;
  }

  private _addSettingsSectionHeading(
    sectionId: SettingsSectionIconId,
    x: number,
    y: number,
    label: string,
    size: number,
    color: string,
    center = false,
  ): Phaser.GameObjects.Text {
    const uiIconId = SETTINGS_SECTION_ICON_IDS[sectionId];
    const iconResource = getSpriteResourceForUiIcon(uiIconId);
    const hasIcon = Boolean(iconResource && this.textures.exists(iconResource.key));
    const headingText = hasIcon ? label : `${SETTINGS_SECTION_FALLBACK_GLYPHS[sectionId]} ${label}`;
    const text = this._addText(x, y, headingText, size, color, center);
    this.settingsSectionHeadingTexts.push(text);

    if (!iconResource || !this.textures.exists(iconResource.key)) {
      this.fallbackSectionIconIds.push(sectionId);
      this.missingSectionIconKeys.push(iconResource?.key ?? `settings_section_icon_${sectionId}`);
      return text;
    }

    const iconSize = sectionId === 'title' ? SETTINGS_TITLE_SECTION_ICON_SIZE : SETTINGS_SECTION_ICON_SIZE;
    const iconX = center
      ? x - (text.width / 2) - (iconSize / 2) - 8
      : x - iconSize - 10;
    const iconY = y + text.height / 2;
    const icon = this.add.image(iconX, iconY, iconResource.key)
      .setName(`settings_section_icon_${sectionId}`)
      .setOrigin(0.5);
    icon.setDisplaySize(iconSize, iconSize);
    icon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.uiElements.push(icon);
    this.settingsSectionIcons.push(icon);
    return text;
  }

  private _addSettingsActionIcon(
    actionId: SettingsActionIconId,
    x: number,
    y: number,
  ): Phaser.GameObjects.Image | null {
    const iconId = SETTINGS_ACTION_BUTTON_ICON_IDS[actionId];
    const iconResource = getSpriteResourceForSkillIcon(iconId);
    if (!iconResource || !this.textures.exists(iconResource.key)) {
      this.fallbackActionIconIds.push(actionId);
      this.missingActionIconKeys.push(iconResource?.key ?? `settings_action_icon_${actionId}`);
      return null;
    }

    const icon = this.add.image(x, y, iconResource.key)
      .setName(`settings_action_icon_${actionId}`)
      .setOrigin(0.5);
    icon.setDisplaySize(18, 18);
    icon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.uiElements.push(icon);
    this.settingsActionIcons.push(icon);
    return icon;
  }

  private _ensureSettingsFocusIcon(): Phaser.GameObjects.Image | null {
    const iconResource = getSpriteResourceForSkillIcon(SETTINGS_FOCUS_ICON_ID);
    if (!iconResource || !this.textures.exists(iconResource.key)) {
      this.settingsFocusIconFallbackRendered = true;
      this.settingsFocusIcon?.setVisible(false).setAlpha(0);
      return null;
    }

    if (!this.settingsFocusIcon) {
      this.settingsFocusIcon = this.add.image(0, 0, iconResource.key)
        .setName('settings_focus_icon')
        .setOrigin(0.5)
        .setDepth(120)
        .setVisible(false);
      this.uiElements.push(this.settingsFocusIcon);
    } else if (this.settingsFocusIcon.texture.key !== iconResource.key) {
      this.settingsFocusIcon.setTexture(iconResource.key);
    }

    this.settingsFocusIcon.setDisplaySize(SETTINGS_FOCUS_ICON_SIZE, SETTINGS_FOCUS_ICON_SIZE);
    this.settingsFocusIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    return this.settingsFocusIcon;
  }

  private _setSettingsFocusIconForText(
    text: Phaser.GameObjects.Text,
    highlighted: boolean,
  ): boolean {
    const focusIcon = this._ensureSettingsFocusIcon();
    if (!focusIcon) {
      if (highlighted) this.settingsFocusIconFallbackRendered = true;
      return false;
    }

    if (!highlighted) {
      focusIcon.setVisible(false).setAlpha(0);
      return true;
    }

    focusIcon
      .setPosition(text.x - SETTINGS_FOCUS_ICON_SIZE - 10, text.y + text.height / 2)
      .setVisible(true)
      .setAlpha(1);
    return true;
  }

  private _addSettingsFrame(
    x: number,
    y: number,
    width: number,
    height: number,
    texture: typeof SETTINGS_UI_FRAME_TEXTURES[keyof typeof SETTINGS_UI_FRAME_TEXTURES],
    alpha = 0.82,
    strokeColor = 0x6644aa,
    strokeWidth = 1,
  ): SettingsFrameRender {
    if (this.textures.exists(texture.key)) {
      const frame = this.add.image(x, y, texture.key)
        .setDisplaySize(width, height)
        .setAlpha(alpha);
      this.uiElements.push(frame);
      const stroke = this.add.rectangle(x, y, width, height, 0x000000, 0)
        .setStrokeStyle(strokeWidth, strokeColor, 0.72);
      this.uiElements.push(stroke);
      this.frameQaRenderedCounts.set(texture.key, (this.frameQaRenderedCounts.get(texture.key) ?? 0) + 1);
      return { primary: frame, stroke };
    }

    // Aseprite settings UI frame 로드 실패 시에만 사용하는 안전 fallback.
    const fallback = this.add.rectangle(x, y, width, height, 0x000000, 0.45)
      .setStrokeStyle(strokeWidth, strokeColor, 0.72);
    this.uiElements.push(fallback);
    return { primary: fallback };
  }

  private _isSettingsFrameQaRoute(): boolean {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('settingsFrameQa') === '1';
  }

  private _writeSettingsFrameQaProbe(): void {
    if (typeof document === 'undefined' || !document.body) return;

    const panelTextures = [
      SETTINGS_UI_FRAME_TEXTURES.mainPanel,
      SETTINGS_UI_FRAME_TEXTURES.keybindPanel,
      SETTINGS_UI_FRAME_TEXTURES.footerPanel,
    ];
    const buttonTexture = SETTINGS_UI_FRAME_TEXTURES.actionButton;
    const sliderTexture = SETTINGS_UI_FRAME_TEXTURES.sliderTrack;
    const buttonRenderedFrameCount = this.frameQaRenderedCounts.get(buttonTexture.key) ?? 0;
    const sliderRenderedFrameCount = this.settingsSliderFrames.length;
    const actionIconRenderedCount = this.settingsActionIcons.length;
    const sectionIconRenderedCount = this.settingsSectionIcons.length;
    const settingsFocusIconResource = getSpriteResourceForSkillIcon(SETTINGS_FOCUS_ICON_ID);
    const settingsFocusIconVisible = this.settingsFocusIcon?.active === true
      && this.settingsFocusIcon.visible
      && this.settingsFocusIcon.alpha > 0;
    const settingsFocusLabelLegacyGlyphPresent = this.settingsFocusLabelTexts.some((text) => text.text.includes('▶'));
    const settingsSectionLabelLegacyGlyphPresent = this.settingsSectionHeadingTexts.some((text) => /[⚙🔊🌐♿⌨]/u.test(text.text));
    const missingSettingsFocusIconKeys = settingsFocusIconVisible && settingsFocusIconResource
      ? []
      : [settingsFocusIconResource?.key ?? SETTINGS_FOCUS_ICON_ID];
    const actionIconKeys = Object.values(SETTINGS_ACTION_BUTTON_ICON_IDS)
      .map((iconId) => getSpriteResourceForSkillIcon(iconId)?.key)
      .filter((key): key is NonNullable<typeof key> => key !== undefined);
    const sectionIconKeys = Object.values(SETTINGS_SECTION_ICON_IDS)
      .map((uiIconId) => getSpriteResourceForUiIcon(uiIconId)?.key)
      .filter((key): key is NonNullable<typeof key> => key !== undefined);
    const panelRenderedFrameCount = panelTextures.reduce(
      (sum, texture) => sum + (this.frameQaRenderedCounts.get(texture.key) ?? 0),
      0,
    );
    const renderedFrameKeys = Array.from(new Set([
      ...Object.values(SETTINGS_UI_FRAME_TEXTURES)
        .filter((texture) => (this.frameQaRenderedCounts.get(texture.key) ?? 0) > 0)
        .map((texture) => texture.key),
      ...(sliderRenderedFrameCount > 0 ? [sliderTexture.key] : []),
    ]));
    const missingFrameKeys: string[] = [
      ...panelTextures
        .filter((texture) => !this.textures.exists(texture.key) || (this.frameQaRenderedCounts.get(texture.key) ?? 0) < 1)
        .map((texture) => texture.key),
      !this.textures.exists(buttonTexture.key) || buttonRenderedFrameCount < 2 ? buttonTexture.key : null,
      !this.textures.exists(sliderTexture.key) || sliderRenderedFrameCount < SETTINGS_EXPECTED_SLIDER_TRACK_FRAME_COUNT ? sliderTexture.key : null,
      actionIconRenderedCount < SETTINGS_EXPECTED_ACTION_ICON_COUNT ? 'settings_action_icons' : null,
      sectionIconRenderedCount < SETTINGS_EXPECTED_SECTION_ICON_COUNT ? 'settings_section_icons' : null,
      this.missingSectionIconKeys.length > 0 ? 'settings_section_icon_keys' : null,
      settingsSectionLabelLegacyGlyphPresent ? 'settings_section_label_legacy_glyph' : null,
      missingSettingsFocusIconKeys.length > 0 ? 'settings_focus_icon' : null,
    ].filter((key): key is NonNullable<typeof key> => key !== null);

    document.body.dataset.aeternaSettingsFrameQa = JSON.stringify({
      status: missingFrameKeys.length === 0
        && this.missingActionIconKeys.length === 0
        && this.missingSectionIconKeys.length === 0
        && missingSettingsFocusIconKeys.length === 0
        && !settingsSectionLabelLegacyGlyphPresent
        && !settingsFocusLabelLegacyGlyphPresent
        ? 'ready'
        : 'missing-frame',
      renderedFrameKeys,
      panelRenderedFrameCount,
      buttonRenderedFrameCount,
      expectedButtonFrameCount: 2,
      sliderRenderedFrameCount,
      expectedSliderFrameCount: SETTINGS_EXPECTED_SLIDER_TRACK_FRAME_COUNT,
      sliderTrackFrame: {
        key: sliderTexture.key,
        path: sliderTexture.path,
        displaySizes: this.settingsSliderFrames.map((frame) => ({
          name: frame.name,
          width: frame.displayWidth,
          height: frame.displayHeight,
        })),
      },
      actionIcon: {
        expectedCount: SETTINGS_EXPECTED_ACTION_ICON_COUNT,
        renderedCount: actionIconRenderedCount,
        expectedKeys: actionIconKeys,
        renderedKeys: this.settingsActionIcons.map((icon) => icon.texture.key),
        displaySizes: this.settingsActionIcons.map((icon) => ({
          name: icon.name,
          width: icon.displayWidth,
          height: icon.displayHeight,
        })),
        fallbackActionIconIds: this.fallbackActionIconIds,
      },
      settingsSectionIcon: {
        expectedCount: SETTINGS_EXPECTED_SECTION_ICON_COUNT,
        renderedCount: sectionIconRenderedCount,
        expectedKeys: sectionIconKeys,
        renderedKeys: this.settingsSectionIcons.map((icon) => icon.texture.key),
        displaySizes: this.settingsSectionIcons.map((icon) => ({
          name: icon.name,
          width: icon.displayWidth,
          height: icon.displayHeight,
        })),
        fallbackSectionIconIds: this.fallbackSectionIconIds,
      },
      settingsFocusIcon: {
        iconId: SETTINGS_FOCUS_ICON_ID,
        renderedCount: settingsFocusIconVisible ? 1 : 0,
        expectedTextureKey: settingsFocusIconResource?.key ?? null,
        renderedTextureKey: settingsFocusIconVisible && this.settingsFocusIcon ? this.settingsFocusIcon.texture.key : null,
        displaySize: settingsFocusIconVisible && this.settingsFocusIcon
          ? { width: this.settingsFocusIcon.displayWidth, height: this.settingsFocusIcon.displayHeight }
          : null,
        fallbackRendered: this.settingsFocusIconFallbackRendered,
      },
      settingsSectionLabelLegacyGlyphPresent,
      settingsFocusLabelLegacyGlyphPresent,
      missingSettingsFocusIconKeys,
      missingSectionIconKeys: this.missingSectionIconKeys,
      missingActionIconKeys: this.missingActionIconKeys,
      missingFrameKeys,
    });
  }

  private _addSettingsSliderTrackFrame(
    x: number,
    y: number,
    width: number,
    height: number,
  ): Phaser.GameObjects.Image | null {
    const texture = SETTINGS_UI_FRAME_TEXTURES.sliderTrack;
    if (!this.textures.exists(texture.key)) return null;

    const frame = this.add.image(x, y, texture.key)
      .setName(`settings_slider_track_frame_${this.settingsSliderFrames.length + 1}`)
      .setDisplaySize(width, height)
      .setAlpha(0.72);
    this.uiElements.push(frame);
    this.settingsSliderFrames.push(frame);
    return frame;
  }

  private _addSlider(x: number, y: number, label: string, value: number, onChange: (v: number) => void): void {
    let highlighted = false;
    let currentRatio = value;
    const labelText = this._addText(x, y, '', 14, '#cccccc');
    this.settingsFocusLabelTexts.push(labelText);
    const renderLabel = () => {
      const hasFocusIcon = this._setSettingsFocusIconForText(labelText, highlighted);
      const prefix = highlighted && !hasFocusIcon ? '▶ ' : '   ';
      labelText.setText(`${prefix}${label}: ${Math.round(currentRatio * 100)}%`);
    };
    renderLabel();

    const barWidth = 200;
    const barY = y + 22;
    const sliderTrackFrame = this._addSettingsSliderTrackFrame(x + barWidth / 2, barY, barWidth + 28, 24);

    // 배경 바
    const bg = this.add.rectangle(x + barWidth / 2, barY, barWidth, 8, 0x333355, sliderTrackFrame ? 0.32 : 1);
    this.uiElements.push(bg);

    // 채움 바
    const fill = this.add.rectangle(x, barY, barWidth * value, 8, 0x6644aa).setOrigin(0, 0.5);
    this.uiElements.push(fill);

    // 클릭 영역
    const hitZone = this.add.rectangle(x + barWidth / 2, barY, barWidth, 20, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    this.uiElements.push(hitZone);

    hitZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      currentRatio = Phaser.Math.Clamp((pointer.x - x) / barWidth, 0, 1);
      fill.setSize(barWidth * currentRatio, 8);
      renderLabel();
      onChange(currentRatio);
    });

    // FINDING-A4 ext4: 키보드 nav 등록 (slider 는 ArrowLeft/Right 5% 조정)
    const itemIndex = this.settingsItems.length;
    hitZone.on('pointerover', () => this._setSettingsIndex(itemIndex));
    this.settingsItems.push({
      setHighlighted: (b) => {
        highlighted = b;
        labelText.setColor(b ? '#ffffff' : '#cccccc');
        fill.setFillStyle(b ? 0x9966cc : 0x6644aa);
        renderLabel();
      },
      activate: () => { /* slider 는 Enter 동작 없음 */ },
      adjust: (delta) => {
        currentRatio = Phaser.Math.Clamp(currentRatio + delta * 0.05, 0, 1);
        fill.setSize(barWidth * currentRatio, 8);
        renderLabel();
        onChange(currentRatio);
      },
    });
  }

  private _addToggle(x: number, y: number, label: string, value: boolean, onChange: (v: boolean) => void): void {
    let current = value;
    let highlighted = false;
    const txt = this._addText(x, y, '', 14, current ? '#88ff88' : '#ff8888');
    this.settingsFocusLabelTexts.push(txt);
    const renderLabel = () => {
      const hasFocusIcon = this._setSettingsFocusIconForText(txt, highlighted);
      const prefix = highlighted && !hasFocusIcon ? '▶ ' : '   ';
      txt.setText(`${prefix}${label}: ${current ? 'ON' : 'OFF'}`);
      txt.setColor(current ? '#88ff88' : '#ff8888');
    };
    renderLabel();
    txt.setInteractive({ useHandCursor: true });
    const flip = () => {
      current = !current;
      renderLabel();
      onChange(current);
    };
    txt.on('pointerdown', flip);

    // FINDING-A4 ext4: 키보드 nav 등록
    const itemIndex = this.settingsItems.length;
    txt.on('pointerover', () => this._setSettingsIndex(itemIndex));
    this.settingsItems.push({
      setHighlighted: (b) => { highlighted = b; renderLabel(); },
      activate: flip,
    });
  }

  private _addCycleButton(x: number, y: number, label: string, options: string[], currentIndex: number, onChange: (idx: number) => void): void {
    let idx = Math.max(0, currentIndex);
    let highlighted = false;
    const txt = this._addText(x, y, '', 14, '#cccccc');
    this.settingsFocusLabelTexts.push(txt);
    const renderLabel = () => {
      const hasFocusIcon = this._setSettingsFocusIconForText(txt, highlighted);
      const prefix = highlighted && !hasFocusIcon ? '▶ ' : '   ';
      txt.setText(`${prefix}${label}: < ${options[idx]} >`);
      txt.setColor(highlighted ? '#ffffff' : '#cccccc');
    };
    renderLabel();
    txt.setInteractive({ useHandCursor: true });
    const cycle = (delta: number) => {
      idx = (idx + delta + options.length) % options.length;
      renderLabel();
      onChange(idx);
    };
    txt.on('pointerdown', () => cycle(+1));

    // FINDING-A4 ext4: 키보드 nav 등록 (cycle 은 Enter=다음, ArrowLeft=이전, ArrowRight=다음)
    const itemIndex = this.settingsItems.length;
    txt.on('pointerover', () => this._setSettingsIndex(itemIndex));
    this.settingsItems.push({
      setHighlighted: (b) => { highlighted = b; renderLabel(); },
      activate: () => cycle(+1),
      adjust: (delta) => cycle(delta > 0 ? +1 : -1),
    });
  }

  // FINDING-A4 ext4: 키보드 highlight 동기화
  private _setSettingsIndex(i: number): void {
    if (i === this.settingsIndex || !this.settingsItems[i]) return;
    this.settingsItems[this.settingsIndex]?.setHighlighted(false);
    this.settingsIndex = i;
    this.settingsItems[i].setHighlighted(true);
  }

  // ── 설정 저장/로드 ────────────────────────────────────────

  private _loadSettings(): GameSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch { /* 파싱 실패 시 기본값 */ }
    return { ...DEFAULT_SETTINGS };
  }

  private _saveSettings(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch { /* localStorage 비활성 환경 무시 */ }
  }

  // ── 정리 ──────────────────────────────────────────────────

  shutdown(): void {
    this.uiElements = [];
    // FINDING-A4 ext4: keyboard listener 정리
    this._settingsKeyboardCleanup?.();
    this._settingsKeyboardCleanup = null;
    this.settingsItems = [];
  }
}
