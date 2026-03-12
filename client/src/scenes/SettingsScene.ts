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

export class SettingsScene extends Phaser.Scene {
  private settings!: GameSettings;
  private uiElements: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super({ key: 'SettingsScene' });
  }

  create(): void {
    this.settings = this._loadSettings();
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
      (idx) => { this.settings.colorblindMode = COLORBLIND_MODES[idx]; },
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
    const backBtn = this.add.text(width / 2, height - 60, '◀ 뒤로가기', {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#88ff88',
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => backBtn.setColor('#ffffff'))
      .on('pointerout', () => backBtn.setColor('#88ff88'))
      .on('pointerdown', () => this._onBack());

    // ESC로 뒤로가기
    this.input.keyboard?.on('keydown-ESC', () => this._onBack());

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
      fontFamily: 'monospace',
      color,
    });
    if (center) t.setOrigin(0.5, 0);
    this.uiElements.push(t);
    return t;
  }

  private _addSlider(x: number, y: number, label: string, value: number, onChange: (v: number) => void): void {
    this._addText(x, y, `${label}: ${Math.round(value * 100)}%`, 14, '#cccccc');

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
      const ratio = Phaser.Math.Clamp((pointer.x - x) / barWidth, 0, 1);
      fill.setSize(barWidth * ratio, 8);
      onChange(ratio);
    });
  }

  private _addToggle(x: number, y: number, label: string, value: boolean, onChange: (v: boolean) => void): void {
    let current = value;
    const txt = this._addText(x, y, `${label}: ${current ? 'ON' : 'OFF'}`, 14, current ? '#88ff88' : '#ff8888');
    txt.setInteractive({ useHandCursor: true });
    txt.on('pointerdown', () => {
      current = !current;
      txt.setText(`${label}: ${current ? 'ON' : 'OFF'}`);
      txt.setColor(current ? '#88ff88' : '#ff8888');
      onChange(current);
    });
  }

  private _addCycleButton(x: number, y: number, label: string, options: string[], currentIndex: number, onChange: (idx: number) => void): void {
    let idx = Math.max(0, currentIndex);
    const txt = this._addText(x, y, `${label}: < ${options[idx]} >`, 14, '#cccccc');
    txt.setInteractive({ useHandCursor: true });
    txt.on('pointerdown', () => {
      idx = (idx + 1) % options.length;
      txt.setText(`${label}: < ${options[idx]} >`);
      onChange(idx);
    });
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
  }
}
