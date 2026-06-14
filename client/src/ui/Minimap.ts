/**
 * Minimap — P26-05: 미니맵
 *
 * 기능:
 * - 현재 존 미니맵 (우측 하단)
 * - NPC/몬스터/플레이어 마커
 * - 클릭 이동
 * - NetworkManager 소켓 이벤트 연동
 */

import * as Phaser from 'phaser';
import type { NetworkManager } from '../network/NetworkManager';

// ── 타입 ──────────────────────────────────────────────────────

export interface MinimapMarker {
  id: string;
  type: 'player' | 'npc' | 'monster' | 'portal' | 'quest';
  x: number;
  y: number;
  name: string;
}

type MinimapMarkerVisual = Phaser.GameObjects.Image | Phaser.GameObjects.Arc;
type DynamicMinimapMarkerType = Exclude<MinimapMarker['type'], 'player'>;

interface MarkerObj {
  dot: MinimapMarkerVisual;
  marker: MinimapMarker;
}

interface MinimapConfig {
  frameQa: boolean;
}

interface MinimapMarkerTexture {
  key: string;
  path: string;
  kind: 'image' | 'spritesheet';
  displayWidth: number;
  displayHeight: number;
  frame?: number;
  frameWidth?: number;
  frameHeight?: number;
}

export const MINIMAP_UI_FRAME_TEXTURES = {
  panel: {
    key: 'ui_frame_minimap_panel',
    path: 'assets/generated/ui/frames/UI-HUD-002-DEF.png',
  },
} as const;

const MINIMAP_PLAYER_MARKER_TEXTURE = {
  key: 'char_battle_ether_knight',
  path: 'assets/generated/characters/class_main/battle/char_battle_ether_knight.png',
} as const;

const MINIMAP_DYNAMIC_MARKER_TEXTURES = {
  npc: {
    key: 'npc_merchant_mira_sprite',
    path: 'assets/generated/characters/npc_sprites/npc_merchant_mira.png',
    kind: 'spritesheet',
    frame: 0,
    frameWidth: 64,
    frameHeight: 64,
    displayWidth: 10,
    displayHeight: 10,
  },
  monster: {
    key: 'mon_erebos_memory_dust_normal_sprite',
    path: 'assets/generated/monsters/sprites/mon_erebos_memory_dust_normal.png',
    kind: 'spritesheet',
    frame: 0,
    frameWidth: 64,
    frameHeight: 64,
    displayWidth: 10,
    displayHeight: 10,
  },
  portal: {
    key: 'skill_vw_warp_icon',
    path: 'assets/generated/ui/icons/skills/skill_vw_warp.png',
    kind: 'image',
    displayWidth: 10,
    displayHeight: 10,
  },
  quest: {
    key: 'icon_item_ITM-QST_004',
    path: 'assets/generated/ui/icons/items/ITM-QST-004.png',
    kind: 'image',
    displayWidth: 10,
    displayHeight: 10,
  },
} as const satisfies Record<DynamicMinimapMarkerType, MinimapMarkerTexture>;

const MINIMAP_EXPECTED_PLAYER_MARKER_ICON_COUNT = 1;

export function preloadMinimapUiFrameTextures(scene: Phaser.Scene): void {
  for (const texture of Object.values(MINIMAP_UI_FRAME_TEXTURES)) {
    if (!scene.textures.exists(texture.key)) {
      scene.load.image(texture.key, texture.path);
    }
  }

  if (!scene.textures.exists(MINIMAP_PLAYER_MARKER_TEXTURE.key)) {
    scene.load.image(MINIMAP_PLAYER_MARKER_TEXTURE.key, MINIMAP_PLAYER_MARKER_TEXTURE.path);
  }

  for (const texture of Object.values(MINIMAP_DYNAMIC_MARKER_TEXTURES)) {
    if (scene.textures.exists(texture.key)) continue;

    if (texture.kind === 'spritesheet') {
      scene.load.spritesheet(texture.key, texture.path, {
        frameWidth: texture.frameWidth,
        frameHeight: texture.frameHeight,
      });
    } else {
      scene.load.image(texture.key, texture.path);
    }
  }
}

const MARKER_COLORS: Record<string, number> = {
  player:  0x55ff55,
  npc:     0xffcc00,
  monster: 0xff4444,
  portal:  0x55aaff,
  quest:   0xffaa00,
};

// ── 메인 클래스 ───────────────────────────────────────────────

export class Minimap {
  private scene: Phaser.Scene;
  private net: NetworkManager;
  private config: MinimapConfig;
  private container: Phaser.GameObjects.Container;
  private visible = true;

  private readonly SIZE = 180;
  private readonly PADDING = 10;
  private readonly FRAME_CONTENT_INSET = 10;

  // 월드 범위 (존에 따라 달라짐)
  private worldWidth = 3200;
  private worldHeight = 3200;
  private zoneId = '';

  // 플레이어 위치
  private playerX = 0;
  private playerY = 0;

  // 마커
  private markers: MinimapMarker[] = [];
  private markerObjs: MarkerObj[] = [];
  private playerDot!: Phaser.GameObjects.Image | Phaser.GameObjects.Arc;

  // UI
  private bg!: Phaser.GameObjects.Rectangle;
  private border!: Phaser.GameObjects.Rectangle;
  private panelFrame: Phaser.GameObjects.Image | null = null;
  private zoneLabel!: Phaser.GameObjects.Text;
  private mask!: Phaser.GameObjects.Graphics;
  private renderedFrameKeys: string[] = [];
  private missingFrameKeys: string[] = [];
  private renderedMarkerIconKeys: string[] = [];
  private missingDynamicMarkerIconTextureKeys: string[] = [];
  private fallbackMarkerIds: string[] = [];

  // 클릭 이동 콜백
  private onClickMove?: (worldX: number, worldY: number) => void;

  constructor(scene: Phaser.Scene, net: NetworkManager, config?: Partial<MinimapConfig>) {
    this.scene = scene;
    this.net = net;
    this.config = { frameQa: false, ...config };

    const px = scene.scale.width - this.SIZE - this.PADDING;
    const py = scene.scale.height - this.SIZE - this.PADDING - 40;
    this.container = scene.add.container(px, py).setDepth(800);

    this._buildUI();
    this._bindSocketEvents();
  }

  // ── 공개 API ──────────────────────────────────────────────

  setZone(zoneId: string, zoneName: string, worldW: number, worldH: number): void {
    this.zoneId = zoneId;
    this.worldWidth = worldW;
    this.worldHeight = worldH;
    this.zoneLabel.setText(zoneName);
    this.markers = [];
    this._clearMarkers();
    this.writeFrameQaProbeIfEnabled('ready');
  }

  setPlayerPosition(x: number, y: number): void {
    this.playerX = x;
    this.playerY = y;
    this._updatePlayerDot();
    this.writeFrameQaProbeIfEnabled('ready');
  }

  addMarker(marker: MinimapMarker): void {
    const existing = this.markers.findIndex(m => m.id === marker.id);
    if (existing >= 0) {
      this.markers[existing] = marker;
    } else {
      this.markers.push(marker);
    }
    this._renderMarkers();
  }

  removeMarker(id: string): void {
    this.markers = this.markers.filter(m => m.id !== id);
    this._renderMarkers();
  }

  updateMarkerPosition(id: string, x: number, y: number): void {
    const m = this.markers.find(mm => mm.id === id);
    if (m) {
      m.x = x;
      m.y = y;
      this._renderMarkers();
    }
  }

  setOnClickMove(cb: (worldX: number, worldY: number) => void): void {
    this.onClickMove = cb;
  }

  show(): void { this.visible = true; this.container.setVisible(true); }
  hide(): void { this.visible = false; this.container.setVisible(false); }
  toggle(): void {
    if (this.visible) this.hide();
    else this.show();
  }

  // ── 내부: UI 빌드 ────────────────────────────────────────

  private _buildUI(): void {
    const panelTexture = MINIMAP_UI_FRAME_TEXTURES.panel;
    const hasPanelFrame = this.scene.textures.exists(panelTexture.key);

    // 배경
    this.bg = this.scene.add.rectangle(
      0,
      0,
      this.SIZE,
      this.SIZE,
      0x0a0a1e,
      hasPanelFrame ? 0.18 : 0.8,
    ).setOrigin(0);
    this.container.add(this.bg);

    if (hasPanelFrame) {
      this.panelFrame = this.scene.add.image(0, 0, panelTexture.key).setOrigin(0);
      this.panelFrame.setDisplaySize(this.SIZE, this.SIZE);
      this.panelFrame.setAlpha(0.88);
      this.renderedFrameKeys.push(panelTexture.key);
      this.container.add(this.panelFrame);
    } else {
      this.missingFrameKeys.push(panelTexture.key);
    }

    this.border = this.scene.add.rectangle(0, 0, this.SIZE, this.SIZE).setOrigin(0);
    if (hasPanelFrame) {
      this.border.setVisible(false);
    } else {
      this.border.setStrokeStyle(2, 0x4a4a6a).setFillStyle(0x000000, 0);
    }

    // 클릭 이동 영역
    this.bg.setInteractive({ useHandCursor: true })
      .on('pointerdown', (ptr: Phaser.Input.Pointer) => {
        if (!this.onClickMove) return;
        const localX = Phaser.Math.Clamp(ptr.x - this.container.x, this.getContentInset(), this.getContentInset() + this.getContentSize());
        const localY = Phaser.Math.Clamp(ptr.y - this.container.y, this.getContentInset(), this.getContentInset() + this.getContentSize());
        const worldX = ((localX - this.getContentInset()) / this.getContentSize()) * this.worldWidth;
        const worldY = ((localY - this.getContentInset()) / this.getContentSize()) * this.worldHeight;
        this.onClickMove(worldX, worldY);
      });

    // 존 이름
    this.zoneLabel = this.scene.add.text(this.SIZE / 2, this.SIZE + 6, '', {
      fontSize: '10px', color: '#aaaacc',
    }).setOrigin(0.5, 0);

    this.playerDot = this._createPlayerMarkerIcon(this.SIZE / 2, this.SIZE / 2);

    // 마스크 (원형 대신 사각)
    this.mask = this.scene.add.graphics();
    this.mask.fillStyle(0xffffff);
    this.mask.fillRect(
      this.container.x + this.getContentInset(),
      this.container.y + this.getContentInset(),
      this.getContentSize(),
      this.getContentSize(),
    );

    this.container.add([this.border, this.playerDot, this.zoneLabel]);
    this.writeFrameQaProbeIfEnabled('ready');
  }

  // ── 내부: 좌표 변환 ──────────────────────────────────────

  private _worldToMinimap(wx: number, wy: number): { mx: number; my: number } {
    const inset = this.getContentInset();
    const size = this.getContentSize();

    return {
      mx: Phaser.Math.Clamp(inset + (wx / this.worldWidth) * size, inset, inset + size),
      my: Phaser.Math.Clamp(inset + (wy / this.worldHeight) * size, inset, inset + size),
    };
  }

  private _updatePlayerDot(): void {
    const { mx, my } = this._worldToMinimap(this.playerX, this.playerY);
    this.playerDot.setPosition(mx, my);
  }

  private _createPlayerMarkerIcon(x: number, y: number): Phaser.GameObjects.Image | Phaser.GameObjects.Arc {
    if (this.scene.textures.exists(MINIMAP_PLAYER_MARKER_TEXTURE.key)) {
      const icon = this.scene.add.image(x, y, MINIMAP_PLAYER_MARKER_TEXTURE.key)
        .setName('minimap_player_marker_icon')
        .setOrigin(0.5);
      icon.setDisplaySize(10, 14);
      icon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);

      return icon;
    }

    // Aseprite player marker 로드 실패 시에만 사용하는 안전 fallback.
    return this.scene.add.circle(x, y, 4, MARKER_COLORS.player)
      .setName('minimap_player_marker_fallback');
  }

  // ── 내부: 마커 렌더 ──────────────────────────────────────

  private _clearMarkers(): void {
    this.markerObjs.forEach(mo => mo.dot.destroy());
    this.markerObjs = [];
    this.renderedMarkerIconKeys = [];
    this.missingDynamicMarkerIconTextureKeys = [];
    this.fallbackMarkerIds = [];
  }

  private _renderMarkers(): void {
    this._clearMarkers();

    this.markers.forEach(marker => {
      const { mx, my } = this._worldToMinimap(marker.x, marker.y);

      const dot = this._createMarkerVisual(marker, mx, my);
      this.container.add(dot);
      this.markerObjs.push({ dot, marker });
    });

    // 플레이어 점은 항상 최상위
    this.container.bringToTop(this.playerDot);
    this.container.bringToTop(this.zoneLabel);
    this.writeFrameQaProbeIfEnabled('ready');
  }

  private _createMarkerVisual(marker: MinimapMarker, mx: number, my: number): MinimapMarkerVisual {
    const texture = this.getDynamicMarkerTexture(marker.type);

    if (texture && this.scene.textures.exists(texture.key)) {
      const icon = this.scene.add.image(mx, my, texture.key)
        .setName(`minimap_marker_icon_${marker.type}_${marker.id}`)
        .setOrigin(0.5);
      icon.setDisplaySize(texture.displayWidth, texture.displayHeight);
      if (texture.kind === 'spritesheet') {
        icon.setFrame(texture.frame ?? 0);
      }
      icon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
      this.renderedMarkerIconKeys.push(texture.key);

      return icon;
    }

    const color = MARKER_COLORS[marker.type] ?? 0xffffff;
    const radius = marker.type === 'monster' ? 2 : 3;
    if (texture) {
      this.missingDynamicMarkerIconTextureKeys.push(texture.key);
    }
    this.fallbackMarkerIds.push(marker.id);

    return this.scene.add.circle(mx, my, radius, color)
      .setName(`minimap_marker_fallback_${marker.type}_${marker.id}`);
  }

  private getDynamicMarkerTexture(markerType: MinimapMarker['type']): MinimapMarkerTexture | undefined {
    if (markerType === 'player') {
      return {
        ...MINIMAP_PLAYER_MARKER_TEXTURE,
        kind: 'image',
        displayWidth: 10,
        displayHeight: 14,
      };
    }

    return MINIMAP_DYNAMIC_MARKER_TEXTURES[markerType];
  }

  // ── 내부: 소켓 이벤트 ─────────────────────────────────────

  private _bindSocketEvents(): void {
    this.net.on('world:playerJoined', (raw: unknown) => {
      const data = raw as { characterId: string; name: string; x: number; y: number };
      this.addMarker({ id: data.characterId, type: 'player', x: data.x, y: data.y, name: data.name });
    });
    this.net.on('world:playerLeft', (raw: unknown) => {
      const data = raw as { characterId: string };
      this.removeMarker(data.characterId);
    });
    this.net.on('world:monsterSpawn', (raw: unknown) => {
      const data = raw as { monsterId: string; name: string; x: number; y: number };
      this.addMarker({ id: data.monsterId, type: 'monster', x: data.x, y: data.y, name: data.name });
    });
    this.net.on('world:monsterDespawn', (raw: unknown) => {
      const data = raw as { monsterId: string };
      this.removeMarker(data.monsterId);
    });
    this.net.on('world:move', (raw: unknown) => {
      const data = raw as { characterId: string; x: number; y: number };
      this.updateMarkerPosition(data.characterId, data.x, data.y);
    });
  }

  // ── 정리 ──────────────────────────────────────────────────

  destroy(): void {
    this._clearMarkers();
    this.container.destroy();
  }

  /** QA probe: standalone Minimap의 Aseprite frame 렌더 상태를 DOM dataset에 기록한다. */
  public writeFrameQaProbe(status: 'ready' | 'hidden' = 'ready'): void {
    if (typeof document === 'undefined' || !document.body) return;

    const panelTexture = MINIMAP_UI_FRAME_TEXTURES.panel;
    const playerMarkerIcon = this.playerDot?.type === 'Image'
      ? this.playerDot as Phaser.GameObjects.Image
      : null;
    const missingMarkerIconTextureKeys = [
      ...(playerMarkerIcon ? [] : [MINIMAP_PLAYER_MARKER_TEXTURE.key]),
      ...this.missingDynamicMarkerIconTextureKeys,
    ];

    document.body.dataset.aeternaMinimapFrameQa = JSON.stringify({
      status,
      visible: this.visible,
      renderedFrameKeys: this.renderedFrameKeys,
      renderedFrameCount: this.renderedFrameKeys.length,
      expectedFrameCount: 1,
      missingFrameKeys: this.missingFrameKeys,
      panelFrame: {
        key: panelTexture.key,
        path: panelTexture.path,
        rendered: this.panelFrame !== null,
        displayWidth: this.panelFrame?.displayWidth ?? 0,
        displayHeight: this.panelFrame?.displayHeight ?? 0,
      },
      contentInset: this.getContentInset(),
      contentSize: this.getContentSize(),
      markerCount: this.markers.length,
      playerDot: {
        x: this.playerDot?.x ?? 0,
        y: this.playerDot?.y ?? 0,
      },
      playerMarkerIcon: {
        key: MINIMAP_PLAYER_MARKER_TEXTURE.key,
        path: MINIMAP_PLAYER_MARKER_TEXTURE.path,
        renderedCount: playerMarkerIcon ? 1 : 0,
        expectedCount: MINIMAP_EXPECTED_PLAYER_MARKER_ICON_COUNT,
        textureKey: playerMarkerIcon?.texture.key ?? null,
        displayWidth: playerMarkerIcon?.displayWidth ?? 0,
        displayHeight: playerMarkerIcon?.displayHeight ?? 0,
        fallbackRendered: this.playerDot?.name === 'minimap_player_marker_fallback',
      },
      dynamicMarkerIcon: {
        renderedCount: this.renderedMarkerIconKeys.length,
        expectedCount: this.markers.length,
        renderedKeys: this.renderedMarkerIconKeys,
        fallbackMarkerIds: this.fallbackMarkerIds,
      },
      missingMarkerIconTextureKeys,
      fallbackMarkerIds: this.fallbackMarkerIds,
      zoneId: this.zoneId,
      visibleCanvasCount: document.querySelectorAll('canvas').length,
    });
  }

  private getContentInset(): number {
    return this.panelFrame ? this.FRAME_CONTENT_INSET : 0;
  }

  private getContentSize(): number {
    return this.SIZE - this.getContentInset() * 2;
  }

  private isFrameQaRoute(): boolean {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('minimapFrameQa') === '1';
  }

  private writeFrameQaProbeIfEnabled(status: 'ready' | 'hidden'): void {
    if (this.config.frameQa || this.isFrameQaRoute()) {
      this.writeFrameQaProbe(status);
    }
  }
}
