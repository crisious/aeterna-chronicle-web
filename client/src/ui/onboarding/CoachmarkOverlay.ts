/**
 * CoachmarkOverlay
 *
 * 첫 30분 온보딩 코치마크를 화면에 1개씩 표시한다.
 * Aseprite frame은 장식과 클릭 면적을 담당하고, 문구와 진행 상태는 동적 Phaser UI로 유지한다.
 */

import * as Phaser from 'phaser';
import { getSpriteResourceForSkillIcon } from '../../assets/spriteResourceManifest';
import type { CoachmarkSpec } from './types';

interface CoachmarkFrameTexture {
  key: string;
  path: string;
}

export const COACHMARK_UI_FRAME_TEXTURES = {
  panel: {
    key: 'ui_frame_coachmark_panel',
    path: 'assets/generated/ui/frames/UI-HUD-005-DEF.png',
  },
  actionButton: {
    key: 'ui_frame_coachmark_action_button',
    path: 'assets/generated/ui/frames/UI-BTN-006-DEF.png',
  },
} as const satisfies Record<string, CoachmarkFrameTexture>;

const COACHMARK_PANEL_WIDTH = 560;
const COACHMARK_PANEL_HEIGHT = 220;
const COACHMARK_EXPECTED_PANEL_FRAME_COUNT = 1;
const COACHMARK_ACTION_BUTTON_ICON_IDS = {
  skip: 'skill_tg_haste',
  next: 'skill_mw_arrow',
} as const;
type CoachmarkActionButtonId = keyof typeof COACHMARK_ACTION_BUTTON_ICON_IDS;
const COACHMARK_EXPECTED_ACTION_BUTTON_ICON_COUNT = 2;

export function preloadCoachmarkUiFrameTextures(scene: Phaser.Scene): void {
  for (const texture of Object.values(COACHMARK_UI_FRAME_TEXTURES)) {
    if (!scene.textures.exists(texture.key)) {
      scene.load.image(texture.key, texture.path);
    }
  }

  for (const iconId of Object.values(COACHMARK_ACTION_BUTTON_ICON_IDS)) {
    const actionIconResource = getSpriteResourceForSkillIcon(iconId);
    if (actionIconResource && !scene.textures.exists(actionIconResource.key)) {
      scene.load.image(actionIconResource.key, actionIconResource.path);
    }
  }
}

export interface CoachmarkOverlayOptions {
  /** 오버레이가 부착될 씬 */
  scene: Phaser.Scene;
  /** 스킵 클릭 핸들러 */
  onSkip?: (spec: CoachmarkSpec) => void;
  /** 진행 트리거 발화 시 호출 */
  onAdvance?: (spec: CoachmarkSpec, latencyMs: number) => void;
  /** 재시청 메뉴 진입 시 호출 (메인 메뉴에서 외부 트리거) */
  onReplayRequested?: (spec: CoachmarkSpec) => void;
  /** QA route에서 frame 렌더 상태 기록 */
  frameQa?: boolean;
}

export class CoachmarkOverlay {
  private readonly opts: CoachmarkOverlayOptions;
  private current: CoachmarkSpec | null = null;
  private shownAtMs = 0;
  private container: Phaser.GameObjects.Container | null = null;
  private panelFrame: Phaser.GameObjects.Image | null = null;
  private actionButtonFrames: Phaser.GameObjects.Image[] = [];
  private actionButtonIcons: Phaser.GameObjects.Image[] = [];
  private actionButtonIconFallbackIds: CoachmarkActionButtonId[] = [];
  private actionButtonExpectedCount = 0;
  private autoTimer: Phaser.Time.TimerEvent | null = null;
  private keyListener: ((event: KeyboardEvent) => void) | null = null;

  constructor(opts: CoachmarkOverlayOptions) {
    this.opts = { frameQa: false, ...opts };
  }

  show(spec: CoachmarkSpec): void {
    if (this.current !== null) {
      return;
    }

    this.current = spec;
    this.shownAtMs = performance.now();
    this.render(spec);
    this.bindAdvanceTrigger(spec);
    this.writeFrameQaProbe('ready');
  }

  hide(): void {
    this.clearTriggerBindings();
    this.container?.destroy();
    this.container = null;
    this.panelFrame = null;
    this.actionButtonFrames = [];
    this.actionButtonIcons = [];
    this.actionButtonIconFallbackIds = [];
    this.actionButtonExpectedCount = 0;
    this.current = null;
    this.writeFrameQaProbe('hidden');
  }

  advance(): void {
    if (!this.current) return;

    const latency = performance.now() - this.shownAtMs;
    const spec = this.current;
    this.hide();
    this.opts.onAdvance?.(spec, latency);
  }

  skip(): void {
    if (!this.current || !this.current.skippable) return;

    const spec = this.current;
    this.hide();
    this.opts.onSkip?.(spec);
  }

  getCurrent(): CoachmarkSpec | null {
    return this.current;
  }

  writeFrameQaProbe(status: 'ready' | 'hidden' = 'ready'): void {
    if (!this.isFrameQaEnabled() || typeof document === 'undefined') return;

    const missingFrameKeys = Object.values(COACHMARK_UI_FRAME_TEXTURES)
      .filter((texture) => !this.opts.scene.textures.exists(texture.key))
      .map((texture) => texture.key);
    const activeActionFrames = this.actionButtonFrames.filter((frame) => frame.active);
    const activeActionIcons = this.actionButtonIcons.filter((icon) => icon.active);
    const missingActionButtonIconKeys = status === 'ready'
      ? this.actionButtonIconFallbackIds.map((id) => {
        const iconResource = getSpriteResourceForSkillIcon(COACHMARK_ACTION_BUTTON_ICON_IDS[id]);
        return iconResource?.key ?? id;
      })
      : [];

    document.body.dataset.aeternaCoachmarkFrameQa = JSON.stringify({
      status,
      active: this.container?.active === true,
      currentId: this.current?.id ?? null,
      actionKind: this.current?.advanceOn.kind ?? null,
      skippable: this.current?.skippable ?? false,
      panelFrame: {
        key: COACHMARK_UI_FRAME_TEXTURES.panel.key,
        path: COACHMARK_UI_FRAME_TEXTURES.panel.path,
        renderedCount: this.panelFrame?.active ? 1 : 0,
        expectedCount: status === 'ready' ? COACHMARK_EXPECTED_PANEL_FRAME_COUNT : 0,
        displayWidth: this.panelFrame?.displayWidth ?? 0,
        displayHeight: this.panelFrame?.displayHeight ?? 0,
      },
      actionButtonFrame: {
        key: COACHMARK_UI_FRAME_TEXTURES.actionButton.key,
        path: COACHMARK_UI_FRAME_TEXTURES.actionButton.path,
        renderedCount: activeActionFrames.length,
        expectedCount: this.actionButtonExpectedCount,
        displaySizes: activeActionFrames.map((frame) => ({
          width: frame.displayWidth,
          height: frame.displayHeight,
        })),
      },
      actionButtonIcon: {
        renderedCount: activeActionIcons.length,
        expectedCount: this.actionButtonExpectedCount,
        configuredExpectedCount: COACHMARK_EXPECTED_ACTION_BUTTON_ICON_COUNT,
        displaySizes: activeActionIcons.map((icon) => ({
          width: icon.displayWidth,
          height: icon.displayHeight,
        })),
        fallbackIds: this.actionButtonIconFallbackIds,
      },
      missingFrameKeys,
      missingActionButtonIconKeys,
      visibleCanvasCount: document.querySelectorAll('canvas').length,
    });
  }

  destroy(): void {
    this.hide();
  }

  private render(spec: CoachmarkSpec): void {
    const scene = this.opts.scene;
    const { width, height } = scene.scale;
    const panelX = width / 2;
    const panelY = this.resolvePanelY(spec, height);

    const container = scene.add.container(0, 0).setDepth(9200);
    this.container = container;

    const dimmer = scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.48);
    container.add(dimmer);

    if (spec.highlight) {
      const highlight = this.createHighlight(spec, width, height);
      container.add(highlight);
    }

    const panelFrame = this.addFrameImage(
      panelX,
      panelY,
      COACHMARK_PANEL_WIDTH,
      COACHMARK_PANEL_HEIGHT,
      COACHMARK_UI_FRAME_TEXTURES.panel,
      'coachmark_panel_frame',
    );
    if (panelFrame) {
      this.panelFrame = panelFrame;
      container.add(panelFrame);
    } else {
      container.add(scene.add.rectangle(panelX, panelY, COACHMARK_PANEL_WIDTH, COACHMARK_PANEL_HEIGHT, 0x10192b, 0.94)
        .setStrokeStyle(2, 0x82d9ff, 0.62)
        .setName('coachmark_panel_fallback'));
    }

    container.add(scene.add.rectangle(panelX, panelY, COACHMARK_PANEL_WIDTH - 44, COACHMARK_PANEL_HEIGHT - 42, 0x06101d, 0.42));
    container.add(scene.add.text(panelX - COACHMARK_PANEL_WIDTH / 2 + 46, panelY - 72, spec.title, {
      fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
      fontSize: '24px',
      color: '#ecfbff',
      fontStyle: '700',
      fixedWidth: COACHMARK_PANEL_WIDTH - 92,
    }).setOrigin(0, 0.5));
    container.add(scene.add.text(panelX - COACHMARK_PANEL_WIDTH / 2 + 46, panelY - 24, spec.body, {
      fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
      fontSize: '18px',
      color: '#c8d8ef',
      lineSpacing: 6,
      wordWrap: { width: COACHMARK_PANEL_WIDTH - 92 },
    }).setOrigin(0, 0.5));
    container.add(scene.add.text(panelX - COACHMARK_PANEL_WIDTH / 2 + 46, panelY + 46, this.getHintText(spec), {
      fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
      fontSize: '14px',
      color: '#8bb8d9',
      fixedWidth: this.getHintTextWidth(spec),
    }).setOrigin(0, 0.5));

    this.addActionButtons(spec, container, panelX, panelY);
  }

  private addActionButtons(
    spec: CoachmarkSpec,
    container: Phaser.GameObjects.Container,
    panelX: number,
    panelY: number,
  ): void {
    const buttons: Array<{
      id: CoachmarkActionButtonId;
      label: string;
      x: number;
      width: number;
      action: () => void;
      tint: number;
    }> = [];

    if (spec.skippable) {
      buttons.push({
        id: 'skip',
        label: '스킵',
        x: panelX + COACHMARK_PANEL_WIDTH / 2 - 146,
        width: 92,
        action: () => this.skip(),
        tint: 0xb8c7e8,
      });
    }

    if (spec.advanceOn.kind === 'click') {
      buttons.push({
        id: 'next',
        label: '다음',
        x: panelX + COACHMARK_PANEL_WIDTH / 2 - 54,
        width: 96,
        action: () => this.advance(),
        tint: 0xb8fff0,
      });
    }

    this.actionButtonExpectedCount = buttons.length;

    for (const button of buttons) {
      this.addActionButton(container, button.x, panelY + 78, button.width, 32, button.id, button.label, button.action, button.tint);
    }
  }

  private addActionButton(
    container: Phaser.GameObjects.Container,
    x: number,
    y: number,
    width: number,
    height: number,
    id: CoachmarkActionButtonId,
    label: string,
    onClick: () => void,
    tint: number,
  ): void {
    const scene = this.opts.scene;
    let fallback: Phaser.GameObjects.Rectangle | null = null;
    let actionButtonIcon: Phaser.GameObjects.Image | null = null;
    const frame = this.addFrameImage(
      x,
      y,
      width,
      height,
      COACHMARK_UI_FRAME_TEXTURES.actionButton,
      `coachmark_action_button_frame_${label}`,
    );

    if (frame) {
      frame.setTint(tint);
      this.actionButtonFrames.push(frame);
      container.add(frame);
    } else {
      // Aseprite coachmark action button frame 로드 실패 시에만 사용하는 안전 fallback.
      fallback = scene.add.rectangle(x, y, width, height, 0x243a56, 0.92)
        .setStrokeStyle(1, 0x88b8e8, 0.7)
        .setName(`coachmark_action_button_fallback_${label}`);
      container.add(fallback);
    }

    const actionIconResource = getSpriteResourceForSkillIcon(COACHMARK_ACTION_BUTTON_ICON_IDS[id]);
    if (actionIconResource && scene.textures.exists(actionIconResource.key)) {
      actionButtonIcon = this.opts.scene.add.image(x - width / 2 + 22, y, actionIconResource.key)
        .setName(`coachmark_action_button_icon_${id}`);
      actionButtonIcon.setDisplaySize(16, 16);
      actionButtonIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.actionButtonIcons.push(actionButtonIcon);
      container.add(actionButtonIcon);
    } else {
      this.actionButtonIconFallbackIds.push(id);
    }

    const textX = actionButtonIcon ? x + 10 : x;
    const textWidth = actionButtonIcon ? Math.max(42, width - 28) : width;
    const text = scene.add.text(textX, y, label, {
      fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
      fontSize: '15px',
      color: '#f2fbff',
      align: 'center',
      fixedWidth: textWidth,
    }).setOrigin(0.5);
    container.add(text);

    const hitArea = scene.add.rectangle(x, y, width, height, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .setName(`coachmark_action_button_hit_${label}`);
    container.add(hitArea);

    const setHover = (hover: boolean): void => {
      frame?.setAlpha(hover ? 1 : 0.88);
      fallback?.setFillStyle(hover ? 0x315279 : 0x243a56, hover ? 1 : 0.92);
      text.setColor(hover ? '#ffffff' : '#f2fbff');
      if (hover) {
        actionButtonIcon?.setTint(0xffffff);
      } else {
        actionButtonIcon?.clearTint();
      }
    };

    hitArea
      .on('pointerdown', onClick)
      .on('pointerover', () => setHover(true))
      .on('pointerout', () => setHover(false));
  }

  private addFrameImage(
    x: number,
    y: number,
    width: number,
    height: number,
    texture: CoachmarkFrameTexture,
    name: string,
  ): Phaser.GameObjects.Image | null {
    if (!this.opts.scene.textures.exists(texture.key)) {
      return null;
    }

    return this.opts.scene.add.image(x, y, texture.key)
      .setName(name)
      .setDisplaySize(width, height);
  }

  private createHighlight(
    spec: CoachmarkSpec,
    width: number,
    height: number,
  ): Phaser.GameObjects.Rectangle {
    const highlight = spec.highlight!;
    return this.opts.scene.add.rectangle(
      (highlight.x + highlight.w / 2) * width,
      (highlight.y + highlight.h / 2) * height,
      highlight.w * width,
      highlight.h * height,
      0x000000,
      0,
    )
      .setStrokeStyle(3, 0xffd86b, 0.9)
      .setName('coachmark_highlight_rect');
  }

  private resolvePanelY(spec: CoachmarkSpec, height: number): number {
    if (!spec.highlight) {
      return height * 0.58;
    }

    const highlightCenterY = (spec.highlight.y + spec.highlight.h / 2) * height;
    return highlightCenterY < height * 0.48
      ? Math.min(height - COACHMARK_PANEL_HEIGHT / 2 - 34, highlightCenterY + COACHMARK_PANEL_HEIGHT * 0.82)
      : Math.max(COACHMARK_PANEL_HEIGHT / 2 + 34, highlightCenterY - COACHMARK_PANEL_HEIGHT * 0.82);
  }

  private bindAdvanceTrigger(spec: CoachmarkSpec): void {
    if (spec.advanceOn.kind === 'auto') {
      this.autoTimer = this.opts.scene.time.delayedCall(spec.advanceOn.delayMs, () => this.advance());
      return;
    }

    if (spec.advanceOn.kind === 'key' && this.opts.scene.input.keyboard) {
      const expectedKey = spec.advanceOn.key;
      this.keyListener = (event: KeyboardEvent): void => {
        if (event.key === expectedKey) {
          this.advance();
        }
      };
      this.opts.scene.input.keyboard.on('keydown', this.keyListener);
    }
  }

  private clearTriggerBindings(): void {
    this.autoTimer?.remove(false);
    this.autoTimer = null;

    if (this.keyListener && this.opts.scene.input.keyboard) {
      this.opts.scene.input.keyboard.off('keydown', this.keyListener);
    }
    this.keyListener = null;
  }

  private getHintText(spec: CoachmarkSpec): string {
    switch (spec.advanceOn.kind) {
      case 'click':
        return '버튼을 눌러 다음 안내로 이동합니다.';
      case 'key':
        return `${spec.advanceOn.key} 키를 누르면 다음 안내로 이동합니다.`;
      case 'event':
        return '게임 행동을 완료하면 다음 안내가 열립니다.';
      case 'auto':
        return '잠시 후 자동으로 다음 안내로 이동합니다.';
      default:
        return '';
    }
  }

  private getHintTextWidth(spec: CoachmarkSpec): number {
    const hasActionButtons = spec.skippable || spec.advanceOn.kind === 'click';

    return hasActionButtons ? COACHMARK_PANEL_WIDTH - 250 : COACHMARK_PANEL_WIDTH - 92;
  }

  private isFrameQaEnabled(): boolean {
    if (this.opts.frameQa === true) return true;
    if (typeof window === 'undefined') return false;

    return new URLSearchParams(window.location.search).get('coachmarkFrameQa') === '1';
  }
}
