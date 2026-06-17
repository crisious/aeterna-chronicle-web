/**
 * ZoneTeleportManager — P26-11: 존 이동 + 텔레포트
 *
 * 기능:
 * - 존 경계 트리거 (플레이어 위치 기반)
 * - 텔레포트 포탈 UI
 * - 로딩 씬 전환 연동
 * - NetworkManager 소켓 world:teleport 이벤트
 */

import * as Phaser from 'phaser';
import { getSpriteResourceForSkillIcon } from '../assets/spriteResourceManifest';
import { NetworkManager } from '../network/NetworkManager';

// ── 타입 ──────────────────────────────────────────────────────

export interface ZoneBoundary {
  zoneId: string;
  targetZoneId: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TeleportPortal {
  id: string;
  name: string;
  targetZoneId: string;
  x: number;
  y: number;
  unlocked: boolean;
}

export type ZoneChangeCallback = (fromZone: string, toZone: string) => void;

interface ZoneTeleportManagerOptions {
  frameQa?: boolean;
}

const ZONE_TELEPORT_UI_FRAME_TEXTURES = {
  panel: {
    key: 'ui_frame_zone_teleport_panel',
    path: 'assets/generated/ui/frames/UI-HUD-006-DEF.png',
  },
  button: {
    key: 'ui_frame_zone_teleport_button',
    path: 'assets/generated/ui/frames/UI-BTN-006-DEF.png',
  },
} as const;

const ZONE_TELEPORT_EXPECTED_PANEL_FRAME_COUNT = 1;
const ZONE_TELEPORT_EXPECTED_BUTTON_FRAME_COUNT = 2;
const ZONE_TELEPORT_TITLE_ICON_ID = 'skill_vw_warp';
const ZONE_TELEPORT_ACTION_ICON_IDS = {
  move: 'skill_mw_arrow',
  cancel: 'skill_tg_reverse',
} as const;
const ZONE_TELEPORT_EXPECTED_ACTION_ICON_COUNT = 2;

type ZoneTeleportActionButtonId = keyof typeof ZONE_TELEPORT_ACTION_ICON_IDS;

export function preloadZoneTeleportUiFrameTextures(scene: Phaser.Scene): void {
  for (const texture of Object.values(ZONE_TELEPORT_UI_FRAME_TEXTURES)) {
    if (!scene.textures.exists(texture.key)) {
      scene.load.image(texture.key, texture.path);
    }
  }

  const queuedIconKeys = new Set<string>();
  for (const iconId of [ZONE_TELEPORT_TITLE_ICON_ID, ...Object.values(ZONE_TELEPORT_ACTION_ICON_IDS)]) {
    const iconResource = getSpriteResourceForSkillIcon(iconId);
    if (iconResource && !scene.textures.exists(iconResource.key) && !queuedIconKeys.has(iconResource.key)) {
      scene.load.image(iconResource.key, iconResource.path);
      queuedIconKeys.add(iconResource.key);
    }
  }
}

// ── 메인 클래스 ───────────────────────────────────────────────

export class ZoneTeleportManager {
  private scene: Phaser.Scene;
  private net: NetworkManager;
  private readonly frameQa: boolean;
  private characterId = '';
  private currentZoneId = '';

  // 존 경계
  private boundaries: ZoneBoundary[] = [];
  private portals: TeleportPortal[] = [];

  // 텔레포트 UI
  private portalUI: Phaser.GameObjects.Container | null = null;
  private portalPanelFrame: Phaser.GameObjects.Image | null = null;
  private portalButtonFrames: Phaser.GameObjects.Image[] = [];
  private portalTitleIcon: Phaser.GameObjects.Image | null = null;
  private portalTitleIconFallback: Phaser.GameObjects.Text | null = null;
  private portalActionIcons: Phaser.GameObjects.Image[] = [];
  private portalActionIconFallbackIds: ZoneTeleportActionButtonId[] = [];
  private onZoneChange?: ZoneChangeCallback;

  // 전환 중 플래그
  private transitioning = false;

  constructor(scene: Phaser.Scene, net: NetworkManager, options: ZoneTeleportManagerOptions = {}) {
    this.scene = scene;
    this.net = net;
    this.frameQa = options.frameQa === true;
    this._bindEvents();
  }

  // ── 공개 API ──────────────────────────────────────────────

  init(characterId: string, zoneId: string): void {
    this.characterId = characterId;
    this.currentZoneId = zoneId;
  }

  setOnZoneChange(cb: ZoneChangeCallback): void {
    this.onZoneChange = cb;
  }

  setZoneBoundaries(boundaries: ZoneBoundary[]): void {
    this.boundaries = boundaries;
  }

  setPortals(portals: TeleportPortal[]): void {
    this.portals = portals;
  }

  // 매 프레임 호출 — 플레이어가 경계에 닿았는지 체크
  checkBoundary(playerX: number, playerY: number): void {
    if (this.transitioning) return;

    for (const b of this.boundaries) {
      if (
        playerX >= b.x && playerX <= b.x + b.width &&
        playerY >= b.y && playerY <= b.y + b.height
      ) {
        this._triggerZoneTransition(b.targetZoneId);
        return;
      }
    }
  }

  // 포탈 상호작용 (플레이어가 포탈 위에서 E키)
  interactPortal(playerX: number, playerY: number): void {
    const INTERACT_RANGE = 50;
    const nearby = this.portals.find(p =>
      p.unlocked &&
      Math.abs(p.x - playerX) < INTERACT_RANGE &&
      Math.abs(p.y - playerY) < INTERACT_RANGE
    );

    if (nearby) {
      this._showPortalUI(nearby);
    }
  }

  // 직접 텔레포트
  async teleportTo(targetZoneId: string): Promise<void> {
    if (this.transitioning) return;
    this._triggerZoneTransition(targetZoneId);
  }

  getCurrentZone(): string {
    return this.currentZoneId;
  }

  // ── 내부: 존 전환 ────────────────────────────────────────

  private async _triggerZoneTransition(targetZoneId: string): Promise<void> {
    if (this.transitioning || targetZoneId === this.currentZoneId) return;
    this.transitioning = true;

    const fromZone = this.currentZoneId;

    // 페이드 아웃
    this.scene.cameras.main.fadeOut(500, 0, 0, 0);

    this.scene.time.delayedCall(500, async () => {
      // 서버에 텔레포트 알림
      this.net.emit('world:teleport', {
        characterId: this.characterId,
        zoneId: targetZoneId,
      });

      // 존 정보 로드
      try {
        const zoneInfo = await this.net.getZoneInfo(targetZoneId);
        this.currentZoneId = targetZoneId;

        // 로딩 씬으로 전환 (데이터 전달)
        this.scene.scene.start('LoadingScene', {
          nextScene: 'GameScene',
          zoneId: targetZoneId,
          nextSceneData: {
            zoneId: targetZoneId,
            zoneName: zoneInfo.name,
            characterId: this.characterId,
          },
        });

        this.onZoneChange?.(fromZone, targetZoneId);
      } catch (e) {
        console.error('[ZoneTeleport] transition failed', e);
        this.scene.cameras.main.fadeIn(300);
      } finally {
        this.transitioning = false;
      }
    });
  }

  // ── 내부: 포탈 UI ────────────────────────────────────────

  private _showPortalUI(portal: TeleportPortal): void {
    this._closePortalUI();
    this.portalPanelFrame = null;
    this.portalButtonFrames = [];
    this.portalTitleIcon = null;
    this.portalTitleIconFallback = null;
    this.portalActionIcons = [];
    this.portalActionIconFallbackIds = [];

    const cx = this.scene.scale.width / 2;
    const cy = this.scene.scale.height / 2;

    this.portalUI = this.scene.add.container(0, 0).setDepth(920);

    this._addPortalUiFrame(
      this.portalUI,
      cx,
      cy,
      300,
      158,
      ZONE_TELEPORT_UI_FRAME_TEXTURES.panel,
      'zone_teleport_panel_frame',
      0.94,
    );
    this.portalUI.add(this.scene.add.rectangle(cx, cy, 214, 84, 0x06121f, 0.6)
      .setName('zone_teleport_readability_layer'));

    const title = this.scene.add.text(cx, cy - 40, portal.name, {
      fontSize: '16px', color: '#55aaff', fontStyle: 'bold',
    }).setOrigin(0.5);
    this._addPortalTitleIcon(this.portalUI, cx - title.width / 2 - 14, cy - 40);
    this.portalUI.add(title);

    const desc = this.scene.add.text(cx, cy - 10, `이동: ${portal.targetZoneId}`, {
      fontSize: '12px', color: '#aaaacc',
    }).setOrigin(0.5);
    this.portalUI.add(desc);

    this._addPortalButton(this.portalUI, cx - 56, cy + 35, 86, 30, 'move', '이동', '[ 이동 ]', '#8fd4ff', () => {
      this._closePortalUI();
      this.teleportTo(portal.targetZoneId);
    });
    this._addPortalButton(this.portalUI, cx + 56, cy + 35, 86, 30, 'cancel', '취소', '[ 취소 ]', '#ff8f8f', () => this._closePortalUI());
    this._writeZoneTeleportFrameQaProbe(portal);
  }

  private _addPortalButton(
    container: Phaser.GameObjects.Container,
    x: number,
    y: number,
    width: number,
    height: number,
    actionId: ZoneTeleportActionButtonId,
    label: string,
    fallbackLabel: string,
    color: string,
    onClick: () => void,
  ): void {
    this._addPortalUiFrame(
      container,
      x,
      y,
      width,
      height,
      ZONE_TELEPORT_UI_FRAME_TEXTURES.button,
      'zone_teleport_button_frame',
      0.92,
    );

    const actionIconResource = getSpriteResourceForSkillIcon(ZONE_TELEPORT_ACTION_ICON_IDS[actionId]);
    let actionIcon: Phaser.GameObjects.Image | null = null;
    if (actionIconResource && this.scene.textures.exists(actionIconResource.key)) {
      actionIcon = this.scene.add.image(x - 23, y, actionIconResource.key)
        .setName(`zone_teleport_${actionId}_action_icon`);
      actionIcon.setDisplaySize(16, 16);
      actionIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.portalActionIcons.push(actionIcon);
      container.add(actionIcon);
    } else {
      this.portalActionIconFallbackIds.push(actionId);
    }

    const textLabel = actionIcon ? label : fallbackLabel;
    const text = this.scene.add.text(actionIcon ? x + 8 : x, y, textLabel, {
      fontSize: '14px',
      color,
      fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    }).setOrigin(0.5);
    const hitArea = this.scene.add.rectangle(x, y, width, height, 0x000000, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', onClick)
      .on('pointerover', () => {
        text.setColor('#ffffff');
        actionIcon?.setTint(0xffffff);
      })
      .on('pointerout', () => {
        text.setColor(color);
        actionIcon?.clearTint();
      });
    container.add([text, hitArea]);
  }

  private _addPortalTitleIcon(
    container: Phaser.GameObjects.Container,
    x: number,
    y: number,
  ): void {
    const titleIconResource = getSpriteResourceForSkillIcon(ZONE_TELEPORT_TITLE_ICON_ID);

    if (titleIconResource && this.scene.textures.exists(titleIconResource.key)) {
      this.portalTitleIcon = this.scene.add.image(x, y, titleIconResource.key)
        .setName('zone_teleport_title_icon');
      this.portalTitleIcon.setDisplaySize(18, 18);
      this.portalTitleIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      container.add(this.portalTitleIcon);
      return;
    }

    this.portalTitleIconFallback = this.scene.add.text(x, y, '🌀', {
      fontSize: '16px',
      color: '#55aaff',
      fontStyle: 'bold',
      fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    }).setName('zone_teleport_title_icon_fallback').setOrigin(0.5);
    container.add(this.portalTitleIconFallback);
  }

  private _addPortalUiFrame(
    container: Phaser.GameObjects.Container,
    x: number,
    y: number,
    width: number,
    height: number,
    texture: typeof ZONE_TELEPORT_UI_FRAME_TEXTURES[keyof typeof ZONE_TELEPORT_UI_FRAME_TEXTURES],
    name: string,
    alpha: number,
  ): Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle {
    if (this.scene.textures.exists(texture.key)) {
      const frame = this.scene.add.image(x, y, texture.key)
        .setDisplaySize(width, height)
        .setAlpha(alpha)
        .setName(name);
      container.add(frame);
      if (texture.key === ZONE_TELEPORT_UI_FRAME_TEXTURES.panel.key) {
        this.portalPanelFrame = frame;
      } else {
        this.portalButtonFrames.push(frame);
      }
      return frame;
    }

    // Aseprite zone teleport UI frame 로드 실패 시에만 사용하는 안전 fallback.
    const fallback = this.scene.add.rectangle(x, y, width, height, 0x0a0a2e, 0.95)
      .setStrokeStyle(2, texture.key === ZONE_TELEPORT_UI_FRAME_TEXTURES.panel.key ? 0x55aaff : 0x2f6f9f)
      .setName(`${name}_fallback`);
    container.add(fallback);
    return fallback;
  }

  private _writeZoneTeleportFrameQaProbe(portal: TeleportPortal): void {
    if (!this.frameQa || typeof document === 'undefined') {
      return;
    }

    const panelFrame = ZONE_TELEPORT_UI_FRAME_TEXTURES.panel;
    const buttonFrame = ZONE_TELEPORT_UI_FRAME_TEXTURES.button;
    const titleIconResource = getSpriteResourceForSkillIcon(ZONE_TELEPORT_TITLE_ICON_ID);
    const expectedActionIconKeys = Object.values(ZONE_TELEPORT_ACTION_ICON_IDS)
      .map((iconId) => getSpriteResourceForSkillIcon(iconId)?.key)
      .filter((key): key is string => typeof key === 'string');
    const renderedActionIconKeys = this.portalActionIcons.map((icon) => icon.texture.key);
    const hasExpectedPanelFrame = (
      this.scene.textures.exists(panelFrame.key)
      && this.portalPanelFrame !== null
    );
    const hasExpectedButtonFrames = (
      this.scene.textures.exists(buttonFrame.key)
      && this.portalButtonFrames.length === ZONE_TELEPORT_EXPECTED_BUTTON_FRAME_COUNT
    );
    const hasExpectedTitleIcon = Boolean(
      titleIconResource
      && this.scene.textures.exists(titleIconResource.key)
      && this.portalTitleIcon !== null,
    );
    const missingTitleIconKeys = hasExpectedTitleIcon
      ? []
      : [titleIconResource?.key ?? ZONE_TELEPORT_TITLE_ICON_ID];
    const missingActionIconKeys = expectedActionIconKeys
      .filter((key) => !this.scene.textures.exists(key) || !renderedActionIconKeys.includes(key));
    const hasExpectedActionIcons = missingActionIconKeys.length === 0
      && this.portalActionIcons.length === ZONE_TELEPORT_EXPECTED_ACTION_ICON_COUNT
      && this.portalActionIconFallbackIds.length === 0;
    const visibleCanvasCount = Array.from(document.querySelectorAll('canvas'))
      .filter((canvas) => {
        const rect = canvas.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      }).length;

    document.body.dataset.aeternaZoneTeleportFrameQa = JSON.stringify({
      status: hasExpectedPanelFrame && hasExpectedButtonFrames && hasExpectedTitleIcon && hasExpectedActionIcons ? 'ready' : 'missing',
      portalId: portal.id,
      portalName: portal.name,
      targetZoneId: portal.targetZoneId,
      panelFrame: {
        key: panelFrame.key,
        path: panelFrame.path,
        renderedCount: this.portalPanelFrame ? 1 : 0,
        expectedCount: ZONE_TELEPORT_EXPECTED_PANEL_FRAME_COUNT,
        displaySizes: this.portalPanelFrame
          ? [{ width: this.portalPanelFrame.displayWidth, height: this.portalPanelFrame.displayHeight }]
          : [],
      },
      buttonFrame: {
        key: buttonFrame.key,
        path: buttonFrame.path,
        renderedCount: this.portalButtonFrames.length,
        expectedCount: ZONE_TELEPORT_EXPECTED_BUTTON_FRAME_COUNT,
        displaySizes: this.portalButtonFrames.map((frame) => ({
          width: frame.displayWidth,
          height: frame.displayHeight,
        })),
      },
      titleIcon: {
        iconId: ZONE_TELEPORT_TITLE_ICON_ID,
        key: titleIconResource?.key ?? null,
        path: titleIconResource?.path ?? null,
        rendered: this.portalTitleIcon !== null,
        visible: this.portalTitleIcon?.visible ?? false,
        displayWidth: this.portalTitleIcon?.displayWidth ?? 0,
        displayHeight: this.portalTitleIcon?.displayHeight ?? 0,
        fallbackRendered: this.portalTitleIconFallback !== null,
      },
      actionButtonIcon: {
        renderedCount: this.portalActionIcons.length,
        expectedCount: ZONE_TELEPORT_EXPECTED_ACTION_ICON_COUNT,
        expectedKeys: expectedActionIconKeys,
        renderedKeys: renderedActionIconKeys,
        displaySizes: this.portalActionIcons.map((icon) => ({
          name: icon.name,
          width: icon.displayWidth,
          height: icon.displayHeight,
          visible: icon.visible,
        })),
        fallbackActionIconIds: this.portalActionIconFallbackIds,
        missingActionIconKeys,
      },
      missingTitleIconKeys,
      missingActionIconKeys,
      missingFrameKeys: [
        ...(hasExpectedPanelFrame ? [] : [panelFrame.key]),
        ...(hasExpectedButtonFrames ? [] : [buttonFrame.key]),
      ],
      visibleCanvasCount,
    });
  }

  private _closePortalUI(): void {
    if (this.portalUI) { this.portalUI.destroy(); this.portalUI = null; }
  }

  // ── 내부: 소켓 이벤트 ─────────────────────────────────────

  private _bindEvents(): void {
    this.net.on('world:teleport', (raw: unknown) => {
      const data = raw as { characterId: string; zoneId: string };
      if (data.characterId !== this.characterId) {
        console.log(`[ZoneTeleport] Player ${data.characterId} teleported to ${data.zoneId}`);
      }
    });
  }

  destroy(): void {
    this._closePortalUI();
  }
}
