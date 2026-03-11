/**
 * StatusEffectRenderer.ts — 상태이상 시각 효과 렌더러 (P6-04)
 *
 * - 캐릭터 위 상태이상 아이콘 표시 (최대 4개)
 * - 지속시간 바 표시
 * - 시각 효과 (독=녹색 파티클, 화상=붉은 깜박임, 빙결=파란 오버레이 등)
 * - DoT 데미지 숫자 팝업
 */

import * as Phaser from 'phaser';

// ─── 타입 정의 ──────────────────────────────────────────────────

/** 서버에서 전송받는 활성 효과 데이터 */
export interface StatusEffectData {
  effectId: string;
  name: string;
  icon: string;
  isDebuff: boolean;
  stacks: number;
  remainingDuration: number;
}

/** 틱 데미지 이벤트 데이터 */
export interface TickDamageEvent {
  targetId: string;
  effectId: string;
  damage: number;
  stacks: number;
}

// ─── 상수 ──────────────────────────────────────────────────────

const MAX_DISPLAY_ICONS = 4;       // 최대 표시 아이콘 수
const ICON_SIZE = 20;              // 아이콘 크기 (px)
const ICON_GAP = 4;                // 아이콘 간격
const ICON_OFFSET_Y = -60;        // 캐릭터 위 오프셋
const DURATION_BAR_HEIGHT = 3;     // 지속시간 바 높이
const DOT_TEXT_LIFETIME = 800;     // DoT 텍스트 수명 (ms)
const DOT_TEXT_RISE_SPEED = 40;    // DoT 텍스트 상승 속도 (px/s)

/** 효과별 시각 설정 */
const EFFECT_VISUALS: Record<string, {
  color: number;
  particleColor: number;
  label: string;
  overlayAlpha: number;
}> = {
  poison:  { color: 0x00ff00, particleColor: 0x44ff44, label: '독',   overlayAlpha: 0 },
  burn:    { color: 0xff4400, particleColor: 0xff6600, label: '화상', overlayAlpha: 0 },
  freeze:  { color: 0x44bbff, particleColor: 0x88ddff, label: '빙결', overlayAlpha: 0.3 },
  stun:    { color: 0xffff00, particleColor: 0xffff88, label: '기절', overlayAlpha: 0 },
  silence: { color: 0x8844aa, particleColor: 0xaa66cc, label: '침묵', overlayAlpha: 0 },
  slow:    { color: 0x6688cc, particleColor: 0x88aaee, label: '감속', overlayAlpha: 0.15 },
  blind:   { color: 0x444444, particleColor: 0x666666, label: '실명', overlayAlpha: 0.4 },
  bleed:   { color: 0xcc0000, particleColor: 0xff0000, label: '출혈', overlayAlpha: 0 },
  curse:   { color: 0x660066, particleColor: 0x880088, label: '저주', overlayAlpha: 0.2 },
  charm:   { color: 0xff66cc, particleColor: 0xff88dd, label: '매혹', overlayAlpha: 0.15 },
  // 버프
  attack_up:  { color: 0xff8800, particleColor: 0xffaa44, label: 'ATK↑', overlayAlpha: 0 },
  defense_up: { color: 0x4488ff, particleColor: 0x66aaff, label: 'DEF↑', overlayAlpha: 0 },
  haste:      { color: 0x44ff88, particleColor: 0x66ffaa, label: 'SPD↑', overlayAlpha: 0 },
  regen:      { color: 0x88ff44, particleColor: 0xaaff66, label: 'HP↑',  overlayAlpha: 0 },
  shield:     { color: 0xffdd44, particleColor: 0xffee66, label: '방패', overlayAlpha: 0.1 },
};

// ─── 내부: 유닛 렌더 상태 ──────────────────────────────────────

interface UnitEffectDisplay {
  /** 아이콘 그래픽스 (최대 4개) */
  icons: Phaser.GameObjects.Graphics[];
  /** 지속시간 바 */
  durationBars: Phaser.GameObjects.Graphics[];
  /** 라벨 텍스트 */
  labels: Phaser.GameObjects.Text[];
  /** 중첩 표시 텍스트 */
  stackTexts: Phaser.GameObjects.Text[];
  /** 오버레이 사각형 (빙결/실명 등) */
  overlay: Phaser.GameObjects.Rectangle | null;
  /** 현재 표시 중인 효과 */
  currentEffects: StatusEffectData[];
}

/** DoT 팝업 텍스트 */
interface DotPopup {
  text: Phaser.GameObjects.Text;
  ttl: number;
  vy: number;
}

// ─── StatusEffectRenderer ──────────────────────────────────────

export class StatusEffectRenderer {
  private scene: Phaser.Scene;
  /** unitId → 렌더 상태 */
  private displays: Map<string, UnitEffectDisplay> = new Map();
  /** DoT 팝업 텍스트 풀 */
  private dotPopups: DotPopup[] = [];
  /** 깜박임 타이머 (화상 등) */
  private blinkTimer: number = 0;
  private blinkOn: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  // ─── 유닛 등록/해제 ──────────────────────────────────────────

  /** 전투 유닛 등록 (BattleScene에서 유닛 생성 시 호출) */
  registerUnit(unitId: string): void {
    if (this.displays.has(unitId)) return;

    this.displays.set(unitId, {
      icons: [],
      durationBars: [],
      labels: [],
      stackTexts: [],
      overlay: null,
      currentEffects: [],
    });
  }

  /** 전투 유닛 해제 (전투 종료 시) */
  unregisterUnit(unitId: string): void {
    const display = this.displays.get(unitId);
    if (!display) return;

    this._clearDisplay(display);
    this.displays.delete(unitId);
  }

  // ─── 효과 업데이트 ───────────────────────────────────────────

  /**
   * 서버에서 받은 효과 데이터로 표시 갱신
   * @param unitId 유닛 ID
   * @param effects 활성 효과 목록
   * @param unitX 유닛 X 좌표
   * @param unitY 유닛 Y 좌표
   */
  updateEffects(
    unitId: string,
    effects: StatusEffectData[],
    unitX: number,
    unitY: number,
  ): void {
    let display = this.displays.get(unitId);
    if (!display) {
      this.registerUnit(unitId);
      display = this.displays.get(unitId)!;
    }

    display.currentEffects = effects;

    // 기존 표시 클리어
    this._clearDisplay(display);

    // 최대 4개까지 아이콘 표시
    const displayEffects = effects.slice(0, MAX_DISPLAY_ICONS);
    const totalWidth = displayEffects.length * (ICON_SIZE + ICON_GAP) - ICON_GAP;
    const startX = unitX - totalWidth / 2;

    for (let i = 0; i < displayEffects.length; i++) {
      const eff = displayEffects[i];
      const visual = EFFECT_VISUALS[eff.effectId] ?? {
        color: 0xaaaaaa, particleColor: 0xcccccc, label: '?', overlayAlpha: 0,
      };

      const ix = startX + i * (ICON_SIZE + ICON_GAP);
      const iy = unitY + ICON_OFFSET_Y;

      // 아이콘 배경
      const icon = this.scene.add.graphics();
      icon.fillStyle(eff.isDebuff ? 0x220000 : 0x002200, 0.8);
      icon.fillRoundedRect(ix, iy, ICON_SIZE, ICON_SIZE, 3);
      icon.fillStyle(visual.color, 1);
      icon.fillCircle(ix + ICON_SIZE / 2, iy + ICON_SIZE / 2, 6);
      display.icons.push(icon);

      // 지속시간 바
      const durBar = this.scene.add.graphics();
      const durRatio = Math.min(1, eff.remainingDuration / 10); // 10초 기준
      durBar.fillStyle(visual.color, 0.8);
      durBar.fillRect(ix, iy + ICON_SIZE + 1, ICON_SIZE * durRatio, DURATION_BAR_HEIGHT);
      durBar.fillStyle(0x333333, 0.5);
      durBar.fillRect(ix + ICON_SIZE * durRatio, iy + ICON_SIZE + 1,
        ICON_SIZE * (1 - durRatio), DURATION_BAR_HEIGHT);
      display.durationBars.push(durBar);

      // 라벨
      const label = this.scene.add.text(ix + ICON_SIZE / 2, iy - 8, visual.label, {
        fontSize: '8px',
        color: `#${visual.color.toString(16).padStart(6, '0')}`,
      }).setOrigin(0.5);
      display.labels.push(label);

      // 중첩 표시 (2 이상일 때)
      if (eff.stacks > 1) {
        const stackText = this.scene.add.text(
          ix + ICON_SIZE - 2, iy + ICON_SIZE - 2,
          `×${eff.stacks}`,
          { fontSize: '8px', color: '#ffffff', fontStyle: 'bold' },
        ).setOrigin(1, 1);
        display.stackTexts.push(stackText);
      }

      // 오버레이 (빙결/실명 등)
      if (visual.overlayAlpha > 0 && !display.overlay) {
        display.overlay = this.scene.add.rectangle(
          unitX, unitY, 52, 52, visual.color, visual.overlayAlpha,
        );
      }
    }
  }

  // ─── DoT 데미지 팝업 ────────────────────────────────────────

  /** DoT 데미지 표시 */
  showDotDamage(
    targetX: number,
    targetY: number,
    damage: number,
    effectId: string,
  ): void {
    const visual = EFFECT_VISUALS[effectId];
    const colorHex = visual
      ? `#${visual.color.toString(16).padStart(6, '0')}`
      : '#ffffff';

    const isHeal = damage < 0;
    const displayValue = isHeal ? `+${Math.abs(damage)}` : `${damage}`;
    const displayColor = isHeal ? '#44ff44' : colorHex;

    const text = this.scene.add.text(
      targetX + (Math.random() - 0.5) * 20,
      targetY - 20,
      displayValue,
      {
        fontSize: '12px',
        color: displayColor,
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 2,
      },
    ).setOrigin(0.5);

    this.dotPopups.push({
      text,
      ttl: DOT_TEXT_LIFETIME,
      vy: -DOT_TEXT_RISE_SPEED,
    });
  }

  // ─── 프레임 업데이트 ─────────────────────────────────────────

  update(delta: number): void {
    const deltaSec = delta / 1000;

    // 깜박임 타이머 (화상 효과용)
    this.blinkTimer += delta;
    if (this.blinkTimer >= 200) {
      this.blinkTimer = 0;
      this.blinkOn = !this.blinkOn;
    }

    // 오버레이 깜박임 처리
    for (const [_unitId, display] of this.displays) {
      if (display.overlay) {
        const hasBurn = display.currentEffects.some(e => e.effectId === 'burn');
        if (hasBurn) {
          display.overlay.setAlpha(this.blinkOn ? 0.15 : 0.05);
        }
      }
    }

    // DoT 팝업 업데이트
    for (let i = this.dotPopups.length - 1; i >= 0; i--) {
      const popup = this.dotPopups[i];
      popup.ttl -= delta;
      popup.text.y += popup.vy * deltaSec;
      popup.text.setAlpha(Math.max(0, popup.ttl / DOT_TEXT_LIFETIME));

      if (popup.ttl <= 0) {
        popup.text.destroy();
        this.dotPopups.splice(i, 1);
      }
    }
  }

  // ─── 정리 ────────────────────────────────────────────────────

  private _clearDisplay(display: UnitEffectDisplay): void {
    for (const icon of display.icons) icon.destroy();
    for (const bar of display.durationBars) bar.destroy();
    for (const label of display.labels) label.destroy();
    for (const st of display.stackTexts) st.destroy();
    if (display.overlay) {
      display.overlay.destroy();
      display.overlay = null;
    }
    display.icons = [];
    display.durationBars = [];
    display.labels = [];
    display.stackTexts = [];
  }

  /** 전체 파괴 */
  destroy(): void {
    for (const [_key, display] of this.displays) {
      this._clearDisplay(display);
    }
    this.displays.clear();

    for (const popup of this.dotPopups) {
      popup.text.destroy();
    }
    this.dotPopups = [];
  }
}
