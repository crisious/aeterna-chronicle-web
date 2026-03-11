/**
 * ComboUI.ts — 콤보/체인 UI 표시 (P6-05)
 *
 * - 콤보 카운터 표시 (우측 상단, 큰 숫자)
 * - 체인 게이지 바 (3초 타이머)
 * - 콤보 달성 시 이펙트 ("COMBO!" 텍스트 + 화면 흔들림)
 * - 콤보 레시피 힌트 (스킬바 위 화살표)
 */

import * as Phaser from 'phaser';

// ─── 타입 정의 ──────────────────────────────────────────────────

/** 콤보 힌트 데이터 */
export interface ComboHint {
  comboName: string;
  nextSkill: string;
  progress: number; // 0~1
}

/** 콤보 달성 이벤트 */
export interface ComboAchievedEvent {
  comboName: string;
  damageBonus: number;
  bonusDescription: string;
}

// ─── 상수 ──────────────────────────────────────────────────────

const COUNTER_X = 1180;    // 우측 상단 X
const COUNTER_Y = 80;      // 우측 상단 Y
const GAUGE_WIDTH = 120;
const GAUGE_HEIGHT = 8;
const CHAIN_DECAY_SEC = 3; // 체인 게이지 전체 시간 (초)

const COMBO_TEXT_DURATION = 1500; // "COMBO!" 표시 시간 (ms)
const SHAKE_INTENSITY = 5;       // 화면 흔들림 강도
const SHAKE_DURATION = 200;      // 화면 흔들림 시간 (ms)

const HINT_Y_OFFSET = -30;       // 스킬바 위 힌트 오프셋

// ─── 체인 등급 색상 ────────────────────────────────────────────

function getChainColor(hitCount: number): string {
  if (hitCount >= 50) return '#ff4444';
  if (hitCount >= 30) return '#ffaa00';
  if (hitCount >= 10) return '#ffff44';
  return '#ffffff';
}

function getChainGaugeColor(hitCount: number): number {
  if (hitCount >= 50) return 0xff4444;
  if (hitCount >= 30) return 0xffaa00;
  if (hitCount >= 10) return 0xffff44;
  return 0x888888;
}

// ─── ComboUI ────────────────────────────────────────────────────

export class ComboUI {
  private scene: Phaser.Scene;

  // 히트 카운터 표시
  private counterText: Phaser.GameObjects.Text;
  private hitsLabel: Phaser.GameObjects.Text;
  private multiplierText: Phaser.GameObjects.Text;

  // 체인 게이지 바
  private gaugeBg: Phaser.GameObjects.Rectangle;
  private gaugeFill: Phaser.GameObjects.Rectangle;

  // 콤보 달성 텍스트
  private comboText: Phaser.GameObjects.Text;
  private comboTimer: number = 0;
  private comboBonusText: Phaser.GameObjects.Text;

  // 콤보 힌트
  private hintContainer: Phaser.GameObjects.Container;
  private hintTexts: Phaser.GameObjects.Text[] = [];

  // 상태
  private currentHitCount: number = 0;
  private gaugeRemaining: number = 0; // 0~1
  private isVisible: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // ── 히트 카운터 (우측 상단) ──
    this.counterText = scene.add.text(COUNTER_X, COUNTER_Y, '0', {
      fontSize: '48px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setAlpha(0).setDepth(100);

    this.hitsLabel = scene.add.text(COUNTER_X, COUNTER_Y + 30, 'HITS', {
      fontSize: '14px',
      color: '#cccccc',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setAlpha(0).setDepth(100);

    this.multiplierText = scene.add.text(COUNTER_X, COUNTER_Y + 48, '', {
      fontSize: '12px',
      color: '#ffcc00',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setAlpha(0).setDepth(100);

    // ── 체인 게이지 바 ──
    this.gaugeBg = scene.add.rectangle(
      COUNTER_X, COUNTER_Y + 64,
      GAUGE_WIDTH, GAUGE_HEIGHT,
      0x333333, 0.6,
    ).setOrigin(0.5).setAlpha(0).setDepth(100);

    this.gaugeFill = scene.add.rectangle(
      COUNTER_X - GAUGE_WIDTH / 2, COUNTER_Y + 64,
      GAUGE_WIDTH, GAUGE_HEIGHT,
      0x888888, 0.9,
    ).setOrigin(0, 0.5).setAlpha(0).setDepth(100);

    // ── 콤보 달성 텍스트 (화면 중앙) ──
    const cx = scene.cameras.main.centerX;
    const cy = scene.cameras.main.centerY - 60;

    this.comboText = scene.add.text(cx, cy, '', {
      fontSize: '40px',
      fontStyle: 'bold',
      color: '#ffdd44',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5).setAlpha(0).setDepth(200);

    this.comboBonusText = scene.add.text(cx, cy + 45, '', {
      fontSize: '16px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setAlpha(0).setDepth(200);

    // ── 콤보 힌트 컨테이너 (하단 스킬바 위) ──
    this.hintContainer = scene.add.container(
      scene.cameras.main.centerX,
      scene.cameras.main.height - 100 + HINT_Y_OFFSET,
    ).setDepth(90);
  }

  // ─── 히트 카운터 업데이트 ────────────────────────────────────

  /**
   * 히트 카운트 갱신
   * @param hitCount 현재 총 히트 수
   * @param multiplier 체인 배율 (1.0 이상)
   */
  updateHitCount(hitCount: number, multiplier: number): void {
    this.currentHitCount = hitCount;
    this.gaugeRemaining = 1.0; // 히트 시 게이지 리셋

    if (hitCount <= 0) {
      this._hideCounter();
      return;
    }

    this._showCounter();
    this.counterText.setText(`${hitCount}`);
    this.counterText.setColor(getChainColor(hitCount));

    if (multiplier > 1.0) {
      this.multiplierText.setText(`×${multiplier.toFixed(2)}`);
      this.multiplierText.setAlpha(1);
    } else {
      this.multiplierText.setAlpha(0);
    }

    // 히트 시 살짝 스케일 펀치
    this.scene.tweens.add({
      targets: this.counterText,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 80,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
  }

  // ─── 콤보 달성 연출 ──────────────────────────────────────────

  /** 콤보 달성 시 호출 */
  showComboAchieved(event: ComboAchievedEvent): void {
    // "COMBO!" 텍스트
    this.comboText.setText(`🔥 ${event.comboName}!`);
    this.comboText.setAlpha(1).setScale(0.5);
    this.comboTimer = COMBO_TEXT_DURATION;

    // 보너스 설명
    this.comboBonusText.setText(event.bonusDescription);
    this.comboBonusText.setAlpha(1);

    // 스케일 인 애니메이션
    this.scene.tweens.add({
      targets: this.comboText,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 200,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.scene.tweens.add({
          targets: this.comboText,
          scaleX: 1.0,
          scaleY: 1.0,
          duration: 100,
        });
      },
    });

    // 화면 흔들림
    this.scene.cameras.main.shake(SHAKE_DURATION, SHAKE_INTENSITY / 1000);
  }

  // ─── 콤보 힌트 표시 ─────────────────────────────────────────

  /**
   * 다음 콤보 힌트 업데이트
   * @param hints 진행 중인 콤보 힌트 목록
   * @param skillSlotNames 스킬 슬롯 코드 → 이름 매핑
   */
  updateHints(
    hints: ComboHint[],
    skillSlotNames: Record<string, string>,
  ): void {
    // 기존 힌트 정리
    for (const ht of this.hintTexts) ht.destroy();
    this.hintTexts = [];

    if (hints.length === 0) return;

    // 최대 2개 힌트만 표시
    const displayHints = hints.slice(0, 2);
    const startY = -displayHints.length * 16;

    for (let i = 0; i < displayHints.length; i++) {
      const hint = displayHints[i];
      const skillName = skillSlotNames[hint.nextSkill] ?? hint.nextSkill;
      const progressBar = '█'.repeat(Math.round(hint.progress * 5)) +
                          '░'.repeat(5 - Math.round(hint.progress * 5));

      const text = this.scene.add.text(
        0, startY + i * 16,
        `${progressBar} ${hint.comboName} → ${skillName}`,
        {
          fontSize: '10px',
          color: '#ffcc44',
          stroke: '#000000',
          strokeThickness: 1,
        },
      ).setOrigin(0.5);

      this.hintContainer.add(text);
      this.hintTexts.push(text);
    }
  }

  // ─── 프레임 업데이트 ─────────────────────────────────────────

  update(delta: number): void {
    const deltaSec = delta / 1000;

    // 체인 게이지 감소
    if (this.isVisible && this.currentHitCount > 0) {
      this.gaugeRemaining -= deltaSec / CHAIN_DECAY_SEC;

      if (this.gaugeRemaining <= 0) {
        this.gaugeRemaining = 0;
        this.currentHitCount = 0;
        this._hideCounter();
      }

      // 게이지 바 업데이트
      const gaugeColor = getChainGaugeColor(this.currentHitCount);
      this.gaugeFill.setSize(GAUGE_WIDTH * Math.max(0, this.gaugeRemaining), GAUGE_HEIGHT);
      this.gaugeFill.setFillStyle(gaugeColor, 0.9);
    }

    // 콤보 텍스트 페이드아웃
    if (this.comboTimer > 0) {
      this.comboTimer -= delta;
      if (this.comboTimer <= 0) {
        this.scene.tweens.add({
          targets: [this.comboText, this.comboBonusText],
          alpha: 0,
          duration: 300,
        });
      }
    }
  }

  // ─── 표시/숨기기 ─────────────────────────────────────────────

  private _showCounter(): void {
    if (this.isVisible) return;
    this.isVisible = true;

    this.counterText.setAlpha(1);
    this.hitsLabel.setAlpha(1);
    this.gaugeBg.setAlpha(1);
    this.gaugeFill.setAlpha(1);
  }

  private _hideCounter(): void {
    if (!this.isVisible) return;
    this.isVisible = false;

    this.scene.tweens.add({
      targets: [this.counterText, this.hitsLabel, this.multiplierText, this.gaugeBg, this.gaugeFill],
      alpha: 0,
      duration: 300,
    });
  }

  // ─── 전체 초기화 ────────────────────────────────────────────

  reset(): void {
    this.currentHitCount = 0;
    this.gaugeRemaining = 0;
    this.comboTimer = 0;
    this._hideCounter();
    this.comboText.setAlpha(0);
    this.comboBonusText.setAlpha(0);

    for (const ht of this.hintTexts) ht.destroy();
    this.hintTexts = [];
  }

  /** 파괴 */
  destroy(): void {
    this.counterText.destroy();
    this.hitsLabel.destroy();
    this.multiplierText.destroy();
    this.gaugeBg.destroy();
    this.gaugeFill.destroy();
    this.comboText.destroy();
    this.comboBonusText.destroy();
    this.hintContainer.destroy();

    for (const ht of this.hintTexts) ht.destroy();
    this.hintTexts = [];
  }
}
