/**
 * AccessibilitySettingsPanel — Phaser UI 접근성 설정 패널 (P5-12)
 *
 * Phaser 3 Scene 내 렌더링되는 접근성 설정 UI.
 * AccessibilityManager와 연동하여 실시간 설정 적용.
 */

import Phaser from 'phaser';
import {
  accessibilityManager,
  type AccessibilitySettings,
  type ColorBlindMode,
  type SubtitleSize,
} from '../accessibility/AccessibilityManager';

// ─── 상수 ───────────────────────────────────────────────────────

const PANEL_WIDTH = 480;
const PANEL_HEIGHT = 600;
const PADDING = 20;
const ROW_HEIGHT = 40;
const LABEL_X = PADDING + 10;
const CONTROL_X = PANEL_WIDTH - PADDING - 120;
const FONT_FAMILY = 'Pretendard, sans-serif';

const COLOR_BG = 0x1a1a2e;
const COLOR_BORDER = 0x4a4a6a;
const COLOR_ACCENT = 0xffd700;
const COLOR_TEXT = 0xffffff;
const COLOR_TOGGLE_ON = 0x00cc66;
const COLOR_TOGGLE_OFF = 0x666666;
const COLOR_SLIDER_BG = 0x333355;
const COLOR_SLIDER_FILL = 0xffd700;

/** 색맹 모드 레이블 */
const COLOR_BLIND_LABELS: Record<ColorBlindMode, string> = {
  none: '없음',
  protanopia: '적색맹',
  deuteranopia: '녹색맹',
  tritanopia: '청색맹',
};

/** 자막 크기 레이블 */
const SUBTITLE_SIZE_LABELS: Record<SubtitleSize, string> = {
  small: '소',
  medium: '중',
  large: '대',
};

// ─── UI 요소 타입 ───────────────────────────────────────────────

interface ToggleButton {
  bg: Phaser.GameObjects.Rectangle;
  knob: Phaser.GameObjects.Circle;
  enabled: boolean;
}

interface SliderControl {
  track: Phaser.GameObjects.Rectangle;
  fill: Phaser.GameObjects.Rectangle;
  handle: Phaser.GameObjects.Circle;
  value: number;
  min: number;
  max: number;
  step: number;
}

interface CycleButton {
  bg: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  options: string[];
  currentIndex: number;
}

// ─── 설정 패널 Scene ─────────────────────────────────────────

export class AccessibilitySettingsPanel extends Phaser.Scene {
  private panelBg!: Phaser.GameObjects.Rectangle;
  private panelBorder!: Phaser.GameObjects.Rectangle;
  private titleText!: Phaser.GameObjects.Text;
  private container!: Phaser.GameObjects.Container;

  // UI 컨트롤
  private colorBlindCycle!: CycleButton;
  private highContrastToggle!: ToggleButton;
  private uiScaleSlider!: SliderControl;
  private subtitlesToggle!: ToggleButton;
  private subtitleSizeCycle!: CycleButton;
  private subtitleOpacitySlider!: SliderControl;
  private keyboardNavToggle!: ToggleButton;
  private screenReaderToggle!: ToggleButton;
  private reduceMotionToggle!: ToggleButton;

  private currentSettings!: AccessibilitySettings;
  private rowY = 0;

  constructor() {
    super({ key: 'AccessibilitySettingsPanel' });
  }

  create(): void {
    this.currentSettings = accessibilityManager.getSettings();

    const cx = this.cameras.main.centerX;
    const cy = this.cameras.main.centerY;

    // 반투명 배경 오버레이
    const overlay = this.add.rectangle(cx, cy, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.6);
    overlay.setInteractive();

    // 패널 배경
    this.panelBg = this.add.rectangle(cx, cy, PANEL_WIDTH, PANEL_HEIGHT, COLOR_BG, 0.95);
    this.panelBorder = this.add.rectangle(cx, cy, PANEL_WIDTH, PANEL_HEIGHT);
    this.panelBorder.setStrokeStyle(2, COLOR_BORDER);

    // 컨테이너 (패널 내부 요소)
    const containerX = cx - PANEL_WIDTH / 2;
    const containerY = cy - PANEL_HEIGHT / 2;
    this.container = this.add.container(containerX, containerY);

    // 제목
    this.titleText = this.add.text(PANEL_WIDTH / 2, PADDING, '⚙ 접근성 설정', {
      fontFamily: FONT_FAMILY,
      fontSize: '22px',
      color: '#FFD700',
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    this.container.add(this.titleText);

    this.rowY = PADDING + 50;

    // ── 각 설정 항목 생성 ──
    this.createColorBlindRow();
    this.createToggleRow('고대비 모드', this.currentSettings.highContrast, (v) => {
      this.highContrastToggle = this.lastToggle;
      accessibilityManager.setHighContrast(v);
    });
    this.highContrastToggle = this.lastToggle;

    this.createSliderRow('UI 스케일', this.currentSettings.uiScale, 0.75, 2.0, 0.25, (v) => {
      accessibilityManager.setUiScale(v);
    });
    this.uiScaleSlider = this.lastSlider;

    this.createToggleRow('자막 표시', this.currentSettings.subtitlesEnabled, (v) => {
      accessibilityManager.setSubtitlesEnabled(v);
    });
    this.subtitlesToggle = this.lastToggle;

    this.createSubtitleSizeRow();

    this.createSliderRow('자막 배경 불투명도', this.currentSettings.subtitleBgOpacity, 0, 1, 0.1, (v) => {
      accessibilityManager.setSubtitleBgOpacity(v);
    });
    this.subtitleOpacitySlider = this.lastSlider;

    this.createToggleRow('키보드 내비게이션', this.currentSettings.keyboardNavEnabled, (v) => {
      accessibilityManager.setKeyboardNavEnabled(v);
    });
    this.keyboardNavToggle = this.lastToggle;

    this.createToggleRow('스크린리더 지원', this.currentSettings.screenReaderEnabled, (v) => {
      accessibilityManager.setScreenReaderEnabled(v);
    });
    this.screenReaderToggle = this.lastToggle;

    this.createToggleRow('모션 감소', this.currentSettings.reduceMotion, (v) => {
      accessibilityManager.setReduceMotion(v);
    });
    this.reduceMotionToggle = this.lastToggle;

    // 닫기 / 초기화 버튼
    this.rowY += 10;
    this.createActionButtons();

    // ESC로 닫기
    this.input.keyboard?.on('keydown-ESC', () => this.closePanel());
  }

  // ── 토글 버튼 생성 ─────────────────────────────────────────

  private lastToggle!: ToggleButton;

  private createToggleRow(label: string, initial: boolean, onChange: (v: boolean) => void): void {
    // 라벨
    const text = this.add.text(LABEL_X, this.rowY + ROW_HEIGHT / 2, label, {
      fontFamily: FONT_FAMILY,
      fontSize: '15px',
      color: '#FFFFFF',
    }).setOrigin(0, 0.5);
    this.container.add(text);

    // 토글 배경
    const toggleWidth = 50;
    const toggleHeight = 24;
    const tx = CONTROL_X + 40;
    const ty = this.rowY + ROW_HEIGHT / 2;
    const bg = this.add.rectangle(tx, ty, toggleWidth, toggleHeight, initial ? COLOR_TOGGLE_ON : COLOR_TOGGLE_OFF, 1)
      .setInteractive({ useHandCursor: true });
    bg.setStrokeStyle(1, 0x888888);

    const knobX = initial ? tx + toggleWidth / 2 - 12 : tx - toggleWidth / 2 + 12;
    const knob = this.add.circle(knobX, ty, 10, COLOR_TEXT);

    this.container.add([bg, knob]);

    const toggle: ToggleButton = { bg, knob, enabled: initial };

    bg.on('pointerdown', () => {
      toggle.enabled = !toggle.enabled;
      bg.setFillStyle(toggle.enabled ? COLOR_TOGGLE_ON : COLOR_TOGGLE_OFF);
      const newKnobX = toggle.enabled ? tx + toggleWidth / 2 - 12 : tx - toggleWidth / 2 + 12;
      knob.setPosition(newKnobX, ty);
      onChange(toggle.enabled);
    });

    this.lastToggle = toggle;
    this.rowY += ROW_HEIGHT;
  }

  // ── 슬라이더 생성 ──────────────────────────────────────────

  private lastSlider!: SliderControl;

  private createSliderRow(
    label: string, initial: number,
    min: number, max: number, step: number,
    onChange: (v: number) => void,
  ): void {
    // 라벨
    const text = this.add.text(LABEL_X, this.rowY + ROW_HEIGHT / 2, label, {
      fontFamily: FONT_FAMILY,
      fontSize: '15px',
      color: '#FFFFFF',
    }).setOrigin(0, 0.5);
    this.container.add(text);

    // 슬라이더 트랙
    const sliderWidth = 120;
    const sx = CONTROL_X;
    const sy = this.rowY + ROW_HEIGHT / 2;
    const track = this.add.rectangle(sx + sliderWidth / 2, sy, sliderWidth, 6, COLOR_SLIDER_BG);

    const pct = (initial - min) / (max - min);
    const fillWidth = pct * sliderWidth;
    const fill = this.add.rectangle(sx + fillWidth / 2, sy, fillWidth, 6, COLOR_SLIDER_FILL);

    const handle = this.add.circle(sx + fillWidth, sy, 8, COLOR_ACCENT)
      .setInteractive({ useHandCursor: true, draggable: true });

    this.container.add([track, fill, handle]);

    // 값 표시 텍스트
    const valueText = this.add.text(sx + sliderWidth + 12, sy, initial.toFixed(2), {
      fontFamily: FONT_FAMILY,
      fontSize: '13px',
      color: '#CCCCCC',
    }).setOrigin(0, 0.5);
    this.container.add(valueText);

    const slider: SliderControl = { track, fill, handle, value: initial, min, max, step };

    handle.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number) => {
      const clampedX = Phaser.Math.Clamp(dragX, sx, sx + sliderWidth);
      handle.setPosition(clampedX, sy);
      const newPct = (clampedX - sx) / sliderWidth;
      let rawValue = min + newPct * (max - min);
      // step 보정
      rawValue = Math.round(rawValue / step) * step;
      rawValue = Phaser.Math.Clamp(rawValue, min, max);
      slider.value = rawValue;

      const newFillWidth = ((rawValue - min) / (max - min)) * sliderWidth;
      fill.setSize(newFillWidth, 6);
      fill.setPosition(sx + newFillWidth / 2, sy);
      valueText.setText(rawValue.toFixed(2));

      onChange(rawValue);
    });

    this.lastSlider = slider;
    this.rowY += ROW_HEIGHT;
  }

  // ── 색맹 모드 순환 버튼 ───────────────────────────────────

  private createColorBlindRow(): void {
    const modes: ColorBlindMode[] = ['none', 'protanopia', 'deuteranopia', 'tritanopia'];
    const currentIdx = modes.indexOf(this.currentSettings.colorBlindMode);

    const text = this.add.text(LABEL_X, this.rowY + ROW_HEIGHT / 2, '색맹 보정', {
      fontFamily: FONT_FAMILY,
      fontSize: '15px',
      color: '#FFFFFF',
    }).setOrigin(0, 0.5);
    this.container.add(text);

    const bx = CONTROL_X + 40;
    const by = this.rowY + ROW_HEIGHT / 2;
    const bg = this.add.rectangle(bx, by, 100, 28, 0x333355)
      .setInteractive({ useHandCursor: true });
    bg.setStrokeStyle(1, COLOR_BORDER);

    const label = this.add.text(bx, by, COLOR_BLIND_LABELS[modes[currentIdx]], {
      fontFamily: FONT_FAMILY,
      fontSize: '13px',
      color: '#FFD700',
    }).setOrigin(0.5);
    this.container.add([bg, label]);

    const cycle: CycleButton = {
      bg, label,
      options: modes,
      currentIndex: currentIdx,
    };

    bg.on('pointerdown', () => {
      cycle.currentIndex = (cycle.currentIndex + 1) % modes.length;
      const mode = modes[cycle.currentIndex];
      label.setText(COLOR_BLIND_LABELS[mode]);
      accessibilityManager.setColorBlindMode(mode);
    });

    this.colorBlindCycle = cycle;
    this.rowY += ROW_HEIGHT;
  }

  // ── 자막 크기 순환 버튼 ───────────────────────────────────

  private createSubtitleSizeRow(): void {
    const sizes: SubtitleSize[] = ['small', 'medium', 'large'];
    const currentIdx = sizes.indexOf(this.currentSettings.subtitleSize);

    const text = this.add.text(LABEL_X, this.rowY + ROW_HEIGHT / 2, '자막 크기', {
      fontFamily: FONT_FAMILY,
      fontSize: '15px',
      color: '#FFFFFF',
    }).setOrigin(0, 0.5);
    this.container.add(text);

    const bx = CONTROL_X + 40;
    const by = this.rowY + ROW_HEIGHT / 2;
    const bg = this.add.rectangle(bx, by, 60, 28, 0x333355)
      .setInteractive({ useHandCursor: true });
    bg.setStrokeStyle(1, COLOR_BORDER);

    const label = this.add.text(bx, by, SUBTITLE_SIZE_LABELS[sizes[currentIdx]], {
      fontFamily: FONT_FAMILY,
      fontSize: '14px',
      color: '#FFD700',
    }).setOrigin(0.5);
    this.container.add([bg, label]);

    const cycle: CycleButton = {
      bg, label,
      options: sizes,
      currentIndex: currentIdx,
    };

    bg.on('pointerdown', () => {
      cycle.currentIndex = (cycle.currentIndex + 1) % sizes.length;
      const size = sizes[cycle.currentIndex] as SubtitleSize;
      label.setText(SUBTITLE_SIZE_LABELS[size]);
      accessibilityManager.setSubtitleSize(size);
    });

    this.subtitleSizeCycle = cycle;
    this.rowY += ROW_HEIGHT;
  }

  // ── 하단 버튼 ──────────────────────────────────────────────

  private createActionButtons(): void {
    const btnY = this.rowY + 10;

    // 초기화 버튼
    const resetBg = this.add.rectangle(PANEL_WIDTH / 2 - 60, btnY, 100, 32, 0x663333)
      .setInteractive({ useHandCursor: true });
    resetBg.setStrokeStyle(1, 0xff6666);
    const resetText = this.add.text(PANEL_WIDTH / 2 - 60, btnY, '초기화', {
      fontFamily: FONT_FAMILY, fontSize: '14px', color: '#FF6666',
    }).setOrigin(0.5);
    this.container.add([resetBg, resetText]);

    resetBg.on('pointerdown', () => {
      accessibilityManager.resetSettings();
      this.scene.restart(); // 패널 새로고침
    });

    // 닫기 버튼
    const closeBg = this.add.rectangle(PANEL_WIDTH / 2 + 60, btnY, 100, 32, 0x336633)
      .setInteractive({ useHandCursor: true });
    closeBg.setStrokeStyle(1, 0x66ff66);
    const closeText = this.add.text(PANEL_WIDTH / 2 + 60, btnY, '닫기', {
      fontFamily: FONT_FAMILY, fontSize: '14px', color: '#66FF66',
    }).setOrigin(0.5);
    this.container.add([closeBg, closeText]);

    closeBg.on('pointerdown', () => this.closePanel());
  }

  // ── 패널 닫기 ──────────────────────────────────────────────

  private closePanel(): void {
    this.scene.stop('AccessibilitySettingsPanel');
  }
}
