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

  // FINDING-A4 ext4: 키보드 nav state
  private settingsItems: SettingsSelectable[] = [];
  private settingsIndex = 0;
  private _settingsKeyboardCleanup: (() => void) | null = null;

  constructor() {
    super({ key: 'SettingsScene' });
  }

  create(): void {
    this.settings = this._loadSettings();
    // FINDING-A4 ext10: 색약 모드 진입 시 즉시 적용 (cb-simulator-filters.css SVG 필터)
    applyColorblindMode(this.settings.colorblindMode);
    const { width, height } = this.cameras.main;

    // 배경
    this.cameras.main.setBackgroundColor('#0a0a2e');

    // 타이틀
    this._addText(width / 2, 40, '⚙ 설정', 28, '#c8a2ff', true);

    let y = 100;
    const leftX = 80;
    const rightX = width - 80;

    // ── 볼륨 섹션 ──
    this._addText(leftX, y, '🔊 사운드', 20, '#aaaacc');
    y += 40;

    this._addSlider(leftX, y, 'BGM 볼륨', this.settings.bgmVolume, (v) => {
      this.settings.bgmVolume = v;
      this.sound.setVolume(v);
    });
    y += 50;

    this._addSlider(leftX, y, 'SFX 볼륨', this.settings.sfxVolume, (v) => {
      this.settings.sfxVolume = v;
    });
    y += 60;

    // ── 언어 섹션 ──
    this._addText(leftX, y, '🌐 언어', 20, '#aaaacc');
    y += 40;

    this._addCycleButton(leftX, y, '언어',
      LANGUAGE_OPTIONS.map(o => o.label),
      LANGUAGE_OPTIONS.findIndex(o => o.code === this.settings.language),
      (idx) => { this.settings.language = LANGUAGE_OPTIONS[idx].code; },
    );
    y += 60;

    // ── 접근성 섹션 ──
    this._addText(leftX, y, '♿ 접근성', 20, '#aaaacc');
    y += 40;

    this._addToggle(leftX, y, '화면 흔들림', this.settings.screenShake, (v) => {
      this.settings.screenShake = v;
    });
    y += 40;

    this._addCycleButton(leftX, y, '자막 크기', SUBTITLE_SIZES,
      SUBTITLE_SIZES.indexOf(this.settings.subtitleSize),
      (idx) => { this.settings.subtitleSize = SUBTITLE_SIZES[idx]; },
    );
    y += 40;

    this._addCycleButton(leftX, y, '색약 모드',
      COLORBLIND_MODES.map(m => COLORBLIND_LABELS[m] ?? m),
      COLORBLIND_MODES.indexOf(this.settings.colorblindMode),
      (idx) => {
        this.settings.colorblindMode = COLORBLIND_MODES[idx];
        // FINDING-A4 ext10: cycle 변경 시 즉시 SVG 필터 갱신
        applyColorblindMode(this.settings.colorblindMode);
      },
    );
    y += 60;

    // ── 키바인드 섹션 (우측) ──
    let ky = 100;
    this._addText(rightX - 150, ky, '⌨ 키바인드', 20, '#aaaacc');
    ky += 40;
    for (const kb of KEYBINDS) {
      this._addText(rightX - 200, ky, kb.action, 14, '#888888');
      this._addText(rightX - 30, ky, kb.key, 14, '#cccccc');
      ky += 28;
    }

    // ── 뒤로가기 버튼 ──
    let backHighlighted = false;
    const backBtn = this.add.text(width / 2, height - 60, '◀ 뒤로가기', {
      fontSize: '20px',
      fontFamily: '"Pretendard", "Noto Sans KR", monospace',
      color: '#88ff88',
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => this._setSettingsIndex(this.settingsItems.length - 1))
      .on('pointerdown', () => this._onBack());

    const backBtnIndex = this.settingsItems.length;
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
      fontFamily: '"Pretendard", "Noto Sans KR", monospace',
      color,
    });
    if (center) t.setOrigin(0.5, 0);
    this.uiElements.push(t);
    return t;
  }

  private _addSlider(x: number, y: number, label: string, value: number, onChange: (v: number) => void): void {
    let highlighted = false;
    let currentRatio = value;
    const labelText = this._addText(x, y, '', 14, '#cccccc');
    const renderLabel = () => {
      const prefix = highlighted ? '▶ ' : '   ';
      labelText.setText(`${prefix}${label}: ${Math.round(currentRatio * 100)}%`);
    };
    renderLabel();

    const barWidth = 200;
    const barY = y + 22;

    // 배경 바
    const bg = this.add.rectangle(x + barWidth / 2, barY, barWidth, 8, 0x333355);
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
    const renderLabel = () => {
      const prefix = highlighted ? '▶ ' : '   ';
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
    const renderLabel = () => {
      const prefix = highlighted ? '▶ ' : '   ';
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
