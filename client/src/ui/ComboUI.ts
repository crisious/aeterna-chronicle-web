/**
 * ComboUI.ts — 콤보/체인 UI 표시 (P6-05)
 *
 * - 콤보 카운터 표시 (우측 상단, 큰 숫자)
 * - 체인 게이지 바 (3초 타이머)
 * - 콤보 달성 시 이펙트 ("COMBO!" 텍스트 + 화면 흔들림)
 * - 콤보 레시피 힌트 (스킬바 위 구분 아이콘)
 */

import * as Phaser from 'phaser';
import { isScreenShakeEnabled } from '../scenes/SettingsScene';
import { getSpriteResourceForSkillIcon } from '../assets/spriteResourceManifest';

export const COMBO_UI_FRAME_TEXTURES = {
  chainGauge: {
    key: 'ui_frame_combo_chain_gauge',
    path: 'assets/generated/ui/frames/UI-BTN-005-DEF.png',
  },
} as const;

export function preloadComboUiFrameTextures(scene: Phaser.Scene): void {
  for (const texture of Object.values(COMBO_UI_FRAME_TEXTURES)) {
    if (!scene.textures.exists(texture.key)) {
      scene.load.image(texture.key, texture.path);
    }
  }

  const comboAchievedIconResource = getSpriteResourceForSkillIcon(COMBO_ACHIEVED_ICON_ID);
  if (comboAchievedIconResource && !scene.textures.exists(comboAchievedIconResource.key)) {
    scene.load.image(comboAchievedIconResource.key, comboAchievedIconResource.path);
  }

  const comboHintSeparatorIconResource = getSpriteResourceForSkillIcon(COMBO_HINT_SEPARATOR_ICON_ID);
  if (comboHintSeparatorIconResource && !scene.textures.exists(comboHintSeparatorIconResource.key)) {
    scene.load.image(comboHintSeparatorIconResource.key, comboHintSeparatorIconResource.path);
  }
}

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

interface ComboUiConfig {
  frameQa: boolean;
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
const COMBO_ACHIEVED_ICON_ID = 'skill_mw_storm';
const COMBO_ACHIEVED_ICON_SIZE = 28;
const COMBO_HINT_SEPARATOR_ICON_ID = 'skill_mw_arrow';
const COMBO_HINT_SEPARATOR_ICON_SIZE = 14;
const COMBO_HINT_SEPARATOR_ICON_GAP = 6;

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
  private config: ComboUiConfig;

  // 히트 카운터 표시
  private counterText: Phaser.GameObjects.Text;
  private hitsLabel: Phaser.GameObjects.Text;
  private multiplierText: Phaser.GameObjects.Text;

  // 체인 게이지 바
  private gaugeFrame: Phaser.GameObjects.Image | null = null;
  private gaugeBg: Phaser.GameObjects.Rectangle;
  private gaugeFill: Phaser.GameObjects.Rectangle;
  private renderedFrameKeys: string[] = [];
  private missingFrameKeys: string[] = [];

  // 콤보 달성 텍스트
  private comboText: Phaser.GameObjects.Text;
  private comboTimer: number = 0;
  private comboBonusText: Phaser.GameObjects.Text;
  private comboAchievedIcon: Phaser.GameObjects.Image | null = null;
  private comboAchievedIconFallbackRendered = false;

  // 콤보 힌트
  private hintContainer: Phaser.GameObjects.Container;
  private hintTexts: Phaser.GameObjects.Text[] = [];
  private hintSeparatorIcons: Phaser.GameObjects.Image[] = [];
  private hintSeparatorIconFallbackRendered = false;
  private hintRowCount = 0;

  // 상태
  private currentHitCount: number = 0;
  private gaugeRemaining: number = 0; // 0~1
  private isVisible: boolean = false;

  constructor(scene: Phaser.Scene, config?: Partial<ComboUiConfig>) {
    this.scene = scene;
    this.config = { frameQa: false, ...config };

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
    const chainGaugeTexture = COMBO_UI_FRAME_TEXTURES.chainGauge;
    const hasChainGaugeFrame = scene.textures.exists(chainGaugeTexture.key);
    if (hasChainGaugeFrame) {
      this.gaugeFrame = scene.add.image(COUNTER_X, COUNTER_Y + 64, chainGaugeTexture.key)
        .setDisplaySize(GAUGE_WIDTH + 16, GAUGE_HEIGHT + 14)
        .setAlpha(0)
        .setDepth(99);
      this.renderedFrameKeys.push(chainGaugeTexture.key);
    } else {
      this.missingFrameKeys.push(chainGaugeTexture.key);
    }

    this.gaugeBg = scene.add.rectangle(
      COUNTER_X, COUNTER_Y + 64,
      GAUGE_WIDTH, GAUGE_HEIGHT,
      0x333333, hasChainGaugeFrame ? 0.24 : 0.6,
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

    this.writeFrameQaProbeIfEnabled('hidden');
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
    this.writeFrameQaProbeIfEnabled('ready');
  }

  // ─── 콤보 달성 연출 ──────────────────────────────────────────

  /** 콤보 달성 시 호출 */
  showComboAchieved(event: ComboAchievedEvent): void {
    // "COMBO!" 텍스트. Aseprite icon이 있으면 legacy flame glyph는 fallback으로만 남긴다.
    const comboIcon = this._showComboAchievedIcon();
    const comboLabel = comboIcon ? `${event.comboName}!` : `🔥 ${event.comboName}!`;
    this.comboText.setText(comboLabel);
    this.comboText.setAlpha(1).setScale(0.5);
    this.comboTimer = COMBO_TEXT_DURATION;
    this._positionComboAchievedIcon();

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

    // 화면 흔들림 (FINDING-A4 ext11: 설정 + reduce-motion 검사)
    if (isScreenShakeEnabled()) {
      this.scene.cameras.main.shake(SHAKE_DURATION, SHAKE_INTENSITY / 1000);
    }
    this.writeFrameQaProbeIfEnabled('ready');
  }

  private _showComboAchievedIcon(): Phaser.GameObjects.Image | null {
    const comboAchievedIconResource = getSpriteResourceForSkillIcon(COMBO_ACHIEVED_ICON_ID);
    if (!comboAchievedIconResource || !this.scene.textures.exists(comboAchievedIconResource.key)) {
      this.comboAchievedIconFallbackRendered = true;
      this.comboAchievedIcon?.setVisible(false).setAlpha(0);
      return null;
    }

    if (!this.comboAchievedIcon) {
      this.comboAchievedIcon = this.scene.add.image(0, 0, comboAchievedIconResource.key)
        .setName('combo_ui_achieved_icon')
        .setOrigin(0.5)
        .setDepth(201);
    } else if (this.comboAchievedIcon.texture.key !== comboAchievedIconResource.key) {
      this.comboAchievedIcon.setTexture(comboAchievedIconResource.key);
    }

    this.comboAchievedIcon.setDisplaySize(COMBO_ACHIEVED_ICON_SIZE, COMBO_ACHIEVED_ICON_SIZE);
    this.comboAchievedIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.comboAchievedIcon.setVisible(true).setAlpha(1);
    return this.comboAchievedIcon;
  }

  private _positionComboAchievedIcon(): void {
    if (!this.comboAchievedIcon || !this.comboAchievedIcon.visible) return;

    this.comboAchievedIcon.setPosition(
      this.comboText.x - this.comboText.width / 2 - COMBO_ACHIEVED_ICON_SIZE / 2 - 10,
      this.comboText.y,
    );
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
    this._clearHints();

    if (hints.length === 0) return;

    // 최대 2개 힌트만 표시
    const displayHints = hints.slice(0, 2);
    this.hintRowCount = displayHints.length;
    const startY = -displayHints.length * 16;
    const hintTextStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize: '10px',
      color: '#ffcc44',
      stroke: '#000000',
      strokeThickness: 1,
    };

    for (let i = 0; i < displayHints.length; i++) {
      const hint = displayHints[i];
      const skillName = skillSlotNames[hint.nextSkill] ?? hint.nextSkill;
      const progressBar = '█'.repeat(Math.round(hint.progress * 5)) +
                          '░'.repeat(5 - Math.round(hint.progress * 5));
      const y = startY + i * 16;
      const leftLabel = `${progressBar} ${hint.comboName}`;
      const separatorIcon = this._createHintSeparatorIcon(i);

      if (separatorIcon) {
        const leftText = this.scene.add.text(0, y, leftLabel, hintTextStyle).setOrigin(1, 0.5);
        const rightText = this.scene.add.text(0, y, skillName, hintTextStyle).setOrigin(0, 0.5);
        const totalWidth = leftText.width +
          rightText.width +
          COMBO_HINT_SEPARATOR_ICON_SIZE +
          COMBO_HINT_SEPARATOR_ICON_GAP * 2;
        const leftX = -totalWidth / 2 + leftText.width;
        const separatorX = leftX + COMBO_HINT_SEPARATOR_ICON_GAP + COMBO_HINT_SEPARATOR_ICON_SIZE / 2;
        const rightX = separatorX + COMBO_HINT_SEPARATOR_ICON_SIZE / 2 + COMBO_HINT_SEPARATOR_ICON_GAP;

        leftText.setPosition(leftX, y);
        separatorIcon.setPosition(separatorX, y);
        rightText.setPosition(rightX, y);

        this.hintContainer.add(leftText);
        this.hintContainer.add(separatorIcon);
        this.hintContainer.add(rightText);
        this.hintTexts.push(leftText, rightText);
      } else {
        const text = this.scene.add.text(
          0, y,
          `${leftLabel} → ${skillName}`,
          hintTextStyle,
        ).setOrigin(0.5);

        this.hintContainer.add(text);
        this.hintTexts.push(text);
      }
    }
    this.writeFrameQaProbeIfEnabled('ready');
  }

  private _createHintSeparatorIcon(index: number): Phaser.GameObjects.Image | null {
    const comboHintSeparatorIconResource = getSpriteResourceForSkillIcon(COMBO_HINT_SEPARATOR_ICON_ID);
    if (!comboHintSeparatorIconResource || !this.scene.textures.exists(comboHintSeparatorIconResource.key)) {
      this.hintSeparatorIconFallbackRendered = true;
      return null;
    }

    const separatorIcon = this.scene.add.image(0, 0, comboHintSeparatorIconResource.key)
      .setName(`combo_ui_hint_separator_icon_${index + 1}`)
      .setOrigin(0.5);
    separatorIcon.setDisplaySize(COMBO_HINT_SEPARATOR_ICON_SIZE, COMBO_HINT_SEPARATOR_ICON_SIZE);
    separatorIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.hintSeparatorIcons.push(separatorIcon);
    return separatorIcon;
  }

  private _clearHints(): void {
    for (const ht of this.hintTexts) ht.destroy();
    this.hintTexts = [];

    for (const icon of this.hintSeparatorIcons) icon.destroy();
    this.hintSeparatorIcons = [];
    this.hintRowCount = 0;
    this.hintSeparatorIconFallbackRendered = false;
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
      this.writeFrameQaProbeIfEnabled('ready');
    }

    // 콤보 텍스트 페이드아웃
    if (this.comboTimer > 0) {
      this.comboTimer -= delta;
      if (this.comboTimer <= 0) {
        const comboFadeTargets: Phaser.GameObjects.GameObject[] = [this.comboText, this.comboBonusText];
        if (this.comboAchievedIcon?.visible) {
          comboFadeTargets.push(this.comboAchievedIcon);
        }
        this.scene.tweens.add({
          targets: comboFadeTargets,
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
    this.gaugeFrame?.setAlpha(1);
    this.gaugeBg.setAlpha(1);
    this.gaugeFill.setAlpha(1);
  }

  private _hideCounter(): void {
    if (!this.isVisible) return;
    this.isVisible = false;

    const targets: Phaser.GameObjects.GameObject[] = [
      this.counterText,
      this.hitsLabel,
      this.multiplierText,
      this.gaugeBg,
      this.gaugeFill,
    ];
    if (this.gaugeFrame) targets.push(this.gaugeFrame);

    this.scene.tweens.add({
      targets,
      alpha: 0,
      duration: 300,
    });
    this.writeFrameQaProbeIfEnabled('hidden');
  }

  // ─── 전체 초기화 ────────────────────────────────────────────

  reset(): void {
    this.currentHitCount = 0;
    this.gaugeRemaining = 0;
    this.comboTimer = 0;
    this._hideCounter();
    this.comboText.setAlpha(0);
    this.comboBonusText.setAlpha(0);
    this.comboAchievedIcon?.setVisible(false).setAlpha(0);

    this._clearHints();
    this.writeFrameQaProbeIfEnabled('hidden');
  }

  public writeFrameQaProbe(status: 'ready' | 'hidden' = 'ready'): void {
    if (typeof document === 'undefined' || !document.body) return;

    const chainGaugeTexture = COMBO_UI_FRAME_TEXTURES.chainGauge;
    const comboAchievedIconResource = getSpriteResourceForSkillIcon(COMBO_ACHIEVED_ICON_ID);
    const expectedComboAchievedIconKeys = comboAchievedIconResource ? [comboAchievedIconResource.key] : [];
    const comboAchievedIconVisible = this.comboAchievedIcon?.active === true
      && this.comboAchievedIcon.visible
      && this.comboAchievedIcon.alpha > 0;
    const renderedComboAchievedIconKeys = comboAchievedIconVisible && this.comboAchievedIcon
      ? [this.comboAchievedIcon.texture.key]
      : [];
    const missingComboAchievedIconKeys = expectedComboAchievedIconKeys
      .filter((key) => !renderedComboAchievedIconKeys.includes(key));
    const comboTextLegacyGlyphPresent = this.comboText.text.includes('🔥');
    const comboHintSeparatorIconResource = getSpriteResourceForSkillIcon(COMBO_HINT_SEPARATOR_ICON_ID);
    const expectedHintSeparatorIconKeys = comboHintSeparatorIconResource
      ? Array.from({ length: this.hintRowCount }, () => comboHintSeparatorIconResource.key)
      : [];
    const visibleHintSeparatorIcons = this.hintSeparatorIcons
      .filter((icon) => icon.active && icon.visible && icon.alpha > 0);
    const renderedHintSeparatorIconKeys = visibleHintSeparatorIcons.map((icon) => icon.texture.key);
    const unmatchedHintSeparatorIconKeys = [...renderedHintSeparatorIconKeys];
    const missingHintSeparatorIconKeys = expectedHintSeparatorIconKeys.filter((key) => {
      const renderedIndex = unmatchedHintSeparatorIconKeys.indexOf(key);
      if (renderedIndex >= 0) {
        unmatchedHintSeparatorIconKeys.splice(renderedIndex, 1);
        return false;
      }
      return true;
    });
    const hintTextLegacyArrowPresent = this.hintTexts.some((text) => text.text.includes('→'));
    document.body.dataset.aeternaComboFrameQa = JSON.stringify({
      status,
      visible: this.isVisible,
      renderedFrameKeys: this.renderedFrameKeys,
      renderedFrameCount: this.renderedFrameKeys.length,
      expectedFrameCount: 1,
      missingFrameKeys: this.missingFrameKeys,
      chainGaugeFrame: {
        key: chainGaugeTexture.key,
        path: chainGaugeTexture.path,
        rendered: this.gaugeFrame !== null,
        displayWidth: this.gaugeFrame?.displayWidth ?? 0,
        displayHeight: this.gaugeFrame?.displayHeight ?? 0,
      },
      currentHitCount: this.currentHitCount,
      gaugeRemaining: Number(this.gaugeRemaining.toFixed(3)),
      gaugeFillWidth: this.gaugeFill.displayWidth,
      hintCount: this.hintRowCount,
      hintTextLegacyArrowPresent,
      hintSeparatorIcon: {
        iconId: COMBO_HINT_SEPARATOR_ICON_ID,
        renderedCount: visibleHintSeparatorIcons.length,
        expectedCount: this.hintRowCount,
        expectedTextureKeys: expectedHintSeparatorIconKeys,
        renderedTextureKeys: renderedHintSeparatorIconKeys,
        displaySizes: visibleHintSeparatorIcons.map((icon) => ({
          width: icon.displayWidth,
          height: icon.displayHeight,
        })),
        fallbackRendered: this.hintSeparatorIconFallbackRendered,
      },
      missingHintSeparatorIconKeys,
      comboTextVisible: this.comboText.alpha > 0,
      comboText: this.comboText.text,
      comboTextLegacyGlyphPresent,
      comboAchievedIcon: {
        iconId: COMBO_ACHIEVED_ICON_ID,
        renderedCount: comboAchievedIconVisible ? 1 : 0,
        expectedTextureKeys: expectedComboAchievedIconKeys,
        renderedTextureKeys: renderedComboAchievedIconKeys,
        displaySizes: comboAchievedIconVisible && this.comboAchievedIcon
          ? [{ width: this.comboAchievedIcon.displayWidth, height: this.comboAchievedIcon.displayHeight }]
          : [],
        fallbackRendered: this.comboAchievedIconFallbackRendered,
      },
      missingComboAchievedIconKeys,
      visibleCanvasCount: document.querySelectorAll('canvas').length,
    });
  }

  /** 파괴 */
  destroy(): void {
    this.counterText.destroy();
    this.hitsLabel.destroy();
    this.multiplierText.destroy();
    this.gaugeFrame?.destroy();
    this.gaugeBg.destroy();
    this.gaugeFill.destroy();
    this.comboText.destroy();
    this.comboBonusText.destroy();
    this.comboAchievedIcon?.destroy();
    this._clearHints();
    this.hintContainer.destroy();
  }

  private isFrameQaRoute(): boolean {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('comboFrameQa') === '1';
  }

  private writeFrameQaProbeIfEnabled(status: 'ready' | 'hidden'): void {
    if (this.config.frameQa || this.isFrameQaRoute()) {
      this.writeFrameQaProbe(status);
    }
  }
}
