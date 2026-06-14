/**
 * MinimapOverlay.ts — 미니맵 UI (P5-11)
 *
 * Phaser UI 컴포넌트:
 *   - 우상단 미니맵 (200×200)
 *   - 현재 존 맵 표시
 *   - 플레이어 위치 아이콘 (실시간)
 *   - NPC 마커 (파란점), 몬스터 마커 (빨간점, 어그로 시 강조)
 *   - 던전 입구 마커 (노란별), 퀘스트 목표 마커 (느낌표/물음표)
 *   - 웨이포인트 설정 (클릭)
 *   - 풀스크린 토글 (M키)
 */

import * as Phaser from 'phaser';

// ── 타입 정의 ──────────────────────────────────────────────────

/** 맵 마커 타입 */
export type MarkerType = 'player' | 'npc' | 'monster' | 'monster_aggro' | 'dungeon' | 'quest_give' | 'quest_turn_in' | 'waypoint';

type MinimapOverlayMarkerVisual = Phaser.GameObjects.Image;

/** 맵 마커 */
export interface MapMarker {
  id: string;
  type: MarkerType;
  x: number;           // 월드 좌표
  y: number;
  label?: string;
  active: boolean;
}

/** 존 맵 정보 */
export interface ZoneMapData {
  zoneId: string;
  zoneName: string;
  textureKey: string;  // 미니맵 텍스처 키
  worldWidth: number;
  worldHeight: number;
}

/** 웨이포인트 설정 콜백 */
export type OnWaypointCallback = (worldX: number, worldY: number) => void;

/** 미니맵 설정 */
export interface MinimapConfig {
  size: number;
  margin: number;
  borderColor: number;
  borderWidth: number;
  bgColor: number;
  bgAlpha: number;
  fullscreenSize: number;
  frameQa: boolean;
}

interface MinimapOverlayMarkerTexture {
  key: string;
  path: string;
  kind: 'image' | 'spritesheet';
  displayWidth: number;
  displayHeight: number;
  frame?: number;
  frameWidth?: number;
  frameHeight?: number;
}

export const MINIMAP_OVERLAY_UI_FRAME_TEXTURES = {
  panel: {
    key: 'ui_frame_minimap_overlay_panel',
    path: 'assets/generated/ui/frames/UI-HUD-002-DEF.png',
  },
} as const;

const MINIMAP_OVERLAY_MARKER_TEXTURES = {
  player: {
    key: 'char_battle_ether_knight',
    path: 'assets/generated/characters/class_main/battle/char_battle_ether_knight.png',
    kind: 'image',
    displayWidth: 10,
    displayHeight: 14,
  },
  npc: {
    key: 'npc_ghost_merchant_gorodi_sprite',
    path: 'assets/generated/characters/npc_sprites/npc_ghost_merchant_gorodi.png',
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
  monster_aggro: {
    key: 'mon_erebos_memory_dust_normal_sprite',
    path: 'assets/generated/monsters/sprites/mon_erebos_memory_dust_normal.png',
    kind: 'spritesheet',
    frame: 0,
    frameWidth: 64,
    frameHeight: 64,
    displayWidth: 12,
    displayHeight: 12,
  },
  dungeon: {
    key: 'zone_crystal_cave',
    path: 'assets/generated/ui/worldmap/zone_crystal_cave.png',
    kind: 'image',
    displayWidth: 12,
    displayHeight: 12,
  },
  quest_give: {
    key: 'icon_item_ITM-QST_004',
    path: 'assets/generated/ui/icons/items/ITM-QST-004.png',
    kind: 'image',
    displayWidth: 11,
    displayHeight: 11,
  },
  quest_turn_in: {
    key: 'icon_item_ITM-QST_004',
    path: 'assets/generated/ui/icons/items/ITM-QST-004.png',
    kind: 'image',
    displayWidth: 11,
    displayHeight: 11,
  },
  waypoint: {
    key: 'skill_vw_warp_icon',
    path: 'assets/generated/ui/icons/skills/skill_vw_warp.png',
    kind: 'image',
    displayWidth: 11,
    displayHeight: 11,
  },
} as const satisfies Record<MarkerType, MinimapOverlayMarkerTexture>;

export function preloadMinimapOverlayUiFrameTextures(scene: Phaser.Scene): void {
  for (const texture of Object.values(MINIMAP_OVERLAY_UI_FRAME_TEXTURES)) {
    if (!scene.textures.exists(texture.key)) {
      scene.load.image(texture.key, texture.path);
    }
  }

  const queuedMarkerTextureKeys = new Set<string>();
  for (const texture of Object.values(MINIMAP_OVERLAY_MARKER_TEXTURES)) {
    if (queuedMarkerTextureKeys.has(texture.key) || scene.textures.exists(texture.key)) continue;
    queuedMarkerTextureKeys.add(texture.key);

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

// ── 마커 색상 ──────────────────────────────────────────────────

const MARKER_COLORS: Record<MarkerType, number> = {
  player:          0x00ff00,
  npc:             0x4488ff,
  monster:         0xff3333,
  monster_aggro:   0xff0000,
  dungeon:         0xffdd00,
  quest_give:      0xffaa00,
  quest_turn_in:   0xffff00,
  waypoint:        0x00ffff,
};

const MARKER_SIZES: Record<MarkerType, number> = {
  player:          5,
  npc:             3,
  monster:         3,
  monster_aggro:   4,
  dungeon:         5,
  quest_give:      5,
  quest_turn_in:   5,
  waypoint:        4,
};

// ── 기본 설정 ──────────────────────────────────────────────────

const DEFAULT_CONFIG: MinimapConfig = {
  size: 200,
  margin: 16,
  borderColor: 0x4a4a6a,
  borderWidth: 2,
  bgColor: 0x111122,
  bgAlpha: 0.85,
  fullscreenSize: 600,
  frameQa: false,
};

const MINIMAP_FRAME_CONTENT_INSET = 12;

// ── 미니맵 클래스 ──────────────────────────────────────────────

export class MinimapOverlay {
  private scene: Phaser.Scene;
  private config: MinimapConfig;
  private container: Phaser.GameObjects.Container;

  // UI 요소
  private bgRect: Phaser.GameObjects.Rectangle;
  private border: Phaser.GameObjects.Rectangle;
  private panelFrame: Phaser.GameObjects.Image | null = null;
  private mapImage: Phaser.GameObjects.Image | null = null;
  private markerGraphics: Phaser.GameObjects.Graphics;
  private markerIconLayer: Phaser.GameObjects.Container;
  private zoneLabel: Phaser.GameObjects.Text;
  private coordsLabel: Phaser.GameObjects.Text;
  private renderedFrameKeys: string[] = [];
  private missingFrameKeys: string[] = [];
  private markerIconObjects: MinimapOverlayMarkerVisual[] = [];
  private renderedMarkerIconKeys: string[] = [];
  private missingMarkerIconTextureKeys: string[] = [];
  private fallbackMarkerIds: string[] = [];

  // 상태
  private currentZone: ZoneMapData | null = null;
  private markers: Map<string, MapMarker> = new Map();
  private playerX: number = 0;
  private playerY: number = 0;
  private isFullscreen: boolean = false;
  private _visible: boolean = true;

  // 웨이포인트
  private waypointMarker: MapMarker | null = null;
  private onWaypoint: OnWaypointCallback | null = null;

  // 마스크 (원형 클리핑)
  private maskGraphics: Phaser.GameObjects.Graphics;
  private maskGeom: Phaser.Display.Masks.GeometryMask;

  constructor(scene: Phaser.Scene, config?: Partial<MinimapConfig>) {
    this.scene = scene;
    this.config = { ...DEFAULT_CONFIG, ...config };

    const gameWidth = scene.scale.width;
    const cx = gameWidth - this.config.margin - this.config.size / 2;
    const cy = this.config.margin + this.config.size / 2;

    this.container = scene.add.container(cx, cy);
    this.container.setDepth(900);
    this.container.setScrollFactor(0);  // UI 고정

    const panelFrame = MINIMAP_OVERLAY_UI_FRAME_TEXTURES.panel;
    const hasPanelFrame = scene.textures.exists(panelFrame.key);

    // 배경: Aseprite 프레임이 로드되면 입력 hit area로만 쓰고, 누락 시 절차 사각형 fallback을 노출한다.
    this.bgRect = scene.add.rectangle(
      0,
      0,
      this.config.size,
      this.config.size,
      this.config.bgColor,
      hasPanelFrame ? 0 : this.config.bgAlpha,
    );
    this.container.add(this.bgRect);

    if (hasPanelFrame) {
      const frame = this.scene.add.image(0, 0, panelFrame.key);
      frame.setDisplaySize(this.config.size, this.config.size);
      this.panelFrame = frame;
      this.renderedFrameKeys.push(panelFrame.key);
      this.container.add(frame);
    } else {
      this.missingFrameKeys.push(panelFrame.key);
    }

    // 마커 렌더링용 Graphics
    this.markerGraphics = scene.add.graphics();
    this.container.add(this.markerGraphics);

    this.markerIconLayer = scene.add.container(0, 0);
    this.container.add(this.markerIconLayer);

    // 테두리
    this.border = scene.add.rectangle(0, 0, this.config.size, this.config.size);
    if (hasPanelFrame) {
      this.border.setVisible(false);
    } else {
      this.border.setStrokeStyle(this.config.borderWidth, this.config.borderColor);
    }
    this.border.setFillStyle();
    this.container.add(this.border);

    // 존 이름 라벨
    this.zoneLabel = scene.add.text(
      -this.config.size / 2 + 4,
      -this.config.size / 2 + 2,
      '',
      { fontSize: '11px', color: '#cccccc', backgroundColor: '#00000088', padding: { x: 4, y: 2 } },
    );
    this.container.add(this.zoneLabel);

    // 좌표 라벨
    this.coordsLabel = scene.add.text(
      -this.config.size / 2 + 4,
      this.config.size / 2 - 16,
      '',
      { fontSize: '10px', color: '#999999' },
    );
    this.container.add(this.coordsLabel);

    // 마스크 (사각형 클리핑)
    this.maskGraphics = scene.make.graphics({ x: cx, y: cy });
    const contentSize = this.getMapContentSize(this.config.size);
    this.maskGraphics.fillRect(-contentSize / 2, -contentSize / 2, contentSize, contentSize);
    this.maskGeom = new Phaser.Display.Masks.GeometryMask(scene, this.maskGraphics);
    this.markerGraphics.setMask(this.maskGeom);
    this.markerIconLayer.setMask(this.maskGeom);
    if (this.mapImage) {
      this.mapImage.setMask(this.maskGeom);
    }

    // 클릭 → 웨이포인트 설정
    this.bgRect.setInteractive({ useHandCursor: true });
    this.bgRect.on('pointerdown', (_pointer: Phaser.Input.Pointer, localX: number, localY: number) => {
      this.setWaypointFromMinimap(localX - this.config.size / 2, localY - this.config.size / 2);
    });

    // M키 → 풀스크린 토글
    scene.input.keyboard?.on('keydown-M', () => {
      this.toggleFullscreen();
    });
  }

  // ── 공개 API ──────────────────────────────────────────────

  /** 존 맵 설정 */
  setZone(zoneData: ZoneMapData): void {
    this.currentZone = zoneData;
    this.zoneLabel.setText(zoneData.zoneName);

    // 맵 텍스처 교체
    if (this.mapImage) {
      this.mapImage.destroy();
      this.mapImage = null;
    }

    if (this.scene.textures.exists(zoneData.textureKey)) {
      this.mapImage = this.scene.add.image(0, 0, zoneData.textureKey);
      this.mapImage.setDisplaySize(this.getMapContentSize(), this.getMapContentSize());
      this.mapImage.setMask(this.maskGeom);
      this.container.addAt(this.mapImage, this.panelFrame ? 2 : 1);  // panel frame 위, markerGraphics 아래
    }

    // 마커 초기화
    this.markers.clear();
    this.waypointMarker = null;
    this.render();
  }

  /** 플레이어 위치 갱신 */
  updatePlayerPosition(worldX: number, worldY: number): void {
    this.playerX = worldX;
    this.playerY = worldY;
    this.coordsLabel.setText(`X:${Math.round(worldX)} Y:${Math.round(worldY)}`);
    this.render();
  }

  /** 마커 추가/갱신 */
  setMarker(marker: MapMarker): void {
    this.markers.set(marker.id, marker);
    this.render();
  }

  /** 마커 제거 */
  removeMarker(id: string): void {
    this.markers.delete(id);
    this.render();
  }

  /** 모든 마커 일괄 갱신 */
  setMarkers(markers: MapMarker[]): void {
    this.markers.clear();
    for (const m of markers) {
      this.markers.set(m.id, m);
    }
    this.render();
  }

  /** 웨이포인트 콜백 등록 */
  setOnWaypoint(callback: OnWaypointCallback): void {
    this.onWaypoint = callback;
  }

  /** 웨이포인트 설정 */
  setWaypoint(worldX: number, worldY: number): void {
    this.waypointMarker = {
      id: '__waypoint__',
      type: 'waypoint',
      x: worldX,
      y: worldY,
      active: true,
    };
    this.render();
  }

  /** 웨이포인트 해제 */
  clearWaypoint(): void {
    this.waypointMarker = null;
    this.render();
  }

  /** 풀스크린 토글 */
  toggleFullscreen(): void {
    this.isFullscreen = !this.isFullscreen;

    const gameWidth = this.scene.scale.width;
    const gameHeight = this.scene.scale.height;

    if (this.isFullscreen) {
      const size = Math.min(this.config.fullscreenSize, gameWidth - 40, gameHeight - 40);
      this.container.setPosition(gameWidth / 2, gameHeight / 2);
      this.bgRect.setSize(size, size);
      this.border.setSize(size, size);
      this.panelFrame?.setDisplaySize(size, size);

      // 마스크 리사이즈
      this.maskGraphics.clear();
      const contentSize = this.getMapContentSize(size);
      this.maskGraphics.fillRect(-contentSize / 2, -contentSize / 2, contentSize, contentSize);
      this.maskGraphics.setPosition(gameWidth / 2, gameHeight / 2);

      if (this.mapImage) {
        this.mapImage.setDisplaySize(contentSize, contentSize);
      }

      this.zoneLabel.setPosition(-size / 2 + 4, -size / 2 + 2);
      this.coordsLabel.setPosition(-size / 2 + 4, size / 2 - 16);
    } else {
      const size = this.config.size;
      const cx = gameWidth - this.config.margin - size / 2;
      const cy = this.config.margin + size / 2;
      this.container.setPosition(cx, cy);
      this.bgRect.setSize(size, size);
      this.border.setSize(size, size);
      this.panelFrame?.setDisplaySize(size, size);

      this.maskGraphics.clear();
      const contentSize = this.getMapContentSize(size);
      this.maskGraphics.fillRect(-contentSize / 2, -contentSize / 2, contentSize, contentSize);
      this.maskGraphics.setPosition(cx, cy);

      if (this.mapImage) {
        this.mapImage.setDisplaySize(contentSize, contentSize);
      }

      this.zoneLabel.setPosition(-size / 2 + 4, -size / 2 + 2);
      this.coordsLabel.setPosition(-size / 2 + 4, size / 2 - 16);
    }

    this.render();
  }

  /** 표시/숨김 */
  setVisible(visible: boolean): void {
    this._visible = visible;
    this.container.setVisible(visible);
  }

  get visible(): boolean {
    return this._visible;
  }

  /** 리소스 정리 */
  destroy(): void {
    this.clearMarkerIcons();
    this.container.destroy();
    this.maskGraphics.destroy();
  }

  /** QA probe: Aseprite 미니맵 프레임의 런타임 렌더 상태를 DOM dataset에 기록한다. */
  writeFrameQaProbe(status: 'ready' | 'pending-zone' = 'ready'): void {
    if (typeof document === 'undefined' || !document.body) return;

    const panelSize = this.getPanelSize();
    const panelFrame = MINIMAP_OVERLAY_UI_FRAME_TEXTURES.panel;
    document.body.dataset.aeternaMinimapOverlayFrameQa = JSON.stringify({
      status,
      renderedFrameKeys: this.renderedFrameKeys,
      renderedFrameCount: this.renderedFrameKeys.length,
      expectedFrameCount: 1,
      missingFrameKeys: this.missingFrameKeys,
      panelFrame: {
        key: panelFrame.key,
        path: panelFrame.path,
        rendered: this.panelFrame !== null,
        displayWidth: this.panelFrame?.displayWidth ?? 0,
        displayHeight: this.panelFrame?.displayHeight ?? 0,
        panelSize,
        contentSize: this.getMapContentSize(panelSize),
      },
      markerCount: this.markers.size + (this.waypointMarker ? 1 : 0) + 1,
      markerIcon: {
        renderedCount: this.renderedMarkerIconKeys.length,
        expectedCount: this.getExpectedMarkerIconCount(),
        renderedKeys: this.renderedMarkerIconKeys,
        fallbackMarkerIds: this.fallbackMarkerIds,
      },
      missingMarkerIconTextureKeys: this.missingMarkerIconTextureKeys,
      fallbackMarkerIds: this.fallbackMarkerIds,
      isFullscreen: this.isFullscreen,
      visibleCanvasCount: document.querySelectorAll('canvas').length,
    });
  }

  // ── 내부: 렌더링 ─────────────────────────────────────────

  private render(): void {
    this.markerGraphics.clear();
    this.clearMarkerIcons();

    if (!this.currentZone) {
      this.writeFrameQaProbeIfEnabled('pending-zone');
      return;
    }

    const currentSize = this.isFullscreen
      ? Math.min(this.config.fullscreenSize, this.scene.scale.width - 40, this.scene.scale.height - 40)
      : this.config.size;
    const contentSize = this.getMapContentSize(currentSize);

    // 월드 → 미니맵 좌표 변환
    const scaleX = contentSize / this.currentZone.worldWidth;
    const scaleY = contentSize / this.currentZone.worldHeight;

    // 마커 렌더링
    for (const marker of this.markers.values()) {
      if (!marker.active) continue;
      this.renderMarker(marker, scaleX, scaleY, contentSize);
    }

    // 웨이포인트
    if (this.waypointMarker) {
      this.renderMarker(this.waypointMarker, scaleX, scaleY, contentSize);
    }

    // 플레이어 (항상 맨 위)
    const px = this.playerX * scaleX - contentSize / 2;
    const py = this.playerY * scaleY - contentSize / 2;
    if (this._createPlayerMarkerIcon(px, py)) {
      this.writeFrameQaProbeIfEnabled('ready');
      return;
    }

    this.markerGraphics.fillStyle(MARKER_COLORS.player, 1);
    this.markerGraphics.fillCircle(px, py, MARKER_SIZES.player);
    // 방향 표시 (삼각형)
    this.markerGraphics.fillTriangle(
      px, py - 7,
      px - 4, py + 2,
      px + 4, py + 2,
    );
    this.writeFrameQaProbeIfEnabled('ready');
  }

  private renderMarker(
    marker: MapMarker,
    scaleX: number,
    scaleY: number,
    contentSize: number,
  ): void {
    const mx = marker.x * scaleX - contentSize / 2;
    const my = marker.y * scaleY - contentSize / 2;
    const color = MARKER_COLORS[marker.type] ?? 0xffffff;
    const size = MARKER_SIZES[marker.type] ?? 3;

    if (this._createMarkerIcon(marker, mx, my)) {
      if (marker.type === 'monster_aggro') {
        this.markerGraphics.lineStyle(1, 0xff0000, 0.5);
        this.markerGraphics.strokeCircle(mx, my, size + 5);
      }
      return;
    }

    this.markerGraphics.fillStyle(color, 1);

    switch (marker.type) {
      case 'dungeon':
        // 별 모양 (간략화: 다이아몬드)
        this.markerGraphics.fillRect(mx - size / 2, my - size / 2, size, size);
        this.markerGraphics.fillTriangle(mx, my - size, mx - size / 2, my, mx + size / 2, my);
        break;

      case 'quest_give':
        // 느낌표 (!)
        this.markerGraphics.fillCircle(mx, my, size);
        this.markerGraphics.fillStyle(0x000000, 1);
        this.markerGraphics.fillRect(mx - 1, my - 3, 2, 4);
        this.markerGraphics.fillRect(mx - 1, my + 2, 2, 1);
        break;

      case 'quest_turn_in':
        // 물음표 (?)
        this.markerGraphics.fillCircle(mx, my, size);
        break;

      case 'monster_aggro':
        // 강조 원 (펄스 효과는 render 외부에서 처리)
        this.markerGraphics.fillCircle(mx, my, size);
        this.markerGraphics.lineStyle(1, 0xff0000, 0.5);
        this.markerGraphics.strokeCircle(mx, my, size + 3);
        break;

      case 'waypoint':
        // 크로스헤어
        this.markerGraphics.lineStyle(1, color, 1);
        this.markerGraphics.strokeCircle(mx, my, size);
        this.markerGraphics.lineBetween(mx - size - 2, my, mx + size + 2, my);
        this.markerGraphics.lineBetween(mx, my - size - 2, mx, my + size + 2);
        break;

      default:
        this.markerGraphics.fillCircle(mx, my, size);
    }
  }

  private _createPlayerMarkerIcon(x: number, y: number): MinimapOverlayMarkerVisual | null {
    const texture = MINIMAP_OVERLAY_MARKER_TEXTURES.player;

    if (!this.scene.textures.exists(texture.key)) {
      this.missingMarkerIconTextureKeys.push(texture.key);
      this.fallbackMarkerIds.push('__player__');
      return null;
    }

    const icon = this.scene.add.image(x, y, texture.key)
      .setName('minimap_overlay_player_marker_icon')
      .setOrigin(0.5);
    icon.setDisplaySize(texture.displayWidth, texture.displayHeight);
    icon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    icon.setMask(this.maskGeom);
    this.markerIconLayer.add(icon);
    this.markerIconObjects.push(icon);
    this.renderedMarkerIconKeys.push(texture.key);

    return icon;
  }

  private _createMarkerIcon(marker: MapMarker, mx: number, my: number): MinimapOverlayMarkerVisual | null {
    const texture = MINIMAP_OVERLAY_MARKER_TEXTURES[marker.type];

    if (!this.scene.textures.exists(texture.key)) {
      this.missingMarkerIconTextureKeys.push(texture.key);
      this.fallbackMarkerIds.push(marker.id);
      return null;
    }

    const icon = this.scene.add.image(mx, my, texture.key)
      .setName(`minimap_overlay_marker_icon_${marker.type}_${marker.id}`)
      .setOrigin(0.5);
    icon.setDisplaySize(texture.displayWidth, texture.displayHeight);
    if (texture.kind === 'spritesheet') {
      icon.setFrame(texture.frame ?? 0);
    }
    icon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
    icon.setMask(this.maskGeom);
    this.markerIconLayer.add(icon);
    this.markerIconObjects.push(icon);
    this.renderedMarkerIconKeys.push(texture.key);

    return icon;
  }

  private clearMarkerIcons(): void {
    this.markerIconObjects.forEach((icon) => icon.destroy());
    this.markerIconObjects = [];
    this.renderedMarkerIconKeys = [];
    this.missingMarkerIconTextureKeys = [];
    this.fallbackMarkerIds = [];
  }

  private getExpectedMarkerIconCount(): number {
    let count = 1;
    for (const marker of this.markers.values()) {
      if (marker.active) count += 1;
    }
    if (this.waypointMarker) count += 1;

    return count;
  }

  // ── 내부: 웨이포인트 ─────────────────────────────────────

  private setWaypointFromMinimap(minimapX: number, minimapY: number): void {
    if (!this.currentZone) return;

    const contentSize = this.getMapContentSize();
    const clampedX = Phaser.Math.Clamp(minimapX, -contentSize / 2, contentSize / 2);
    const clampedY = Phaser.Math.Clamp(minimapY, -contentSize / 2, contentSize / 2);

    // 미니맵 → 월드 좌표 변환
    const worldX = ((clampedX + contentSize / 2) / contentSize) * this.currentZone.worldWidth;
    const worldY = ((clampedY + contentSize / 2) / contentSize) * this.currentZone.worldHeight;

    this.setWaypoint(worldX, worldY);

    if (this.onWaypoint) {
      this.onWaypoint(worldX, worldY);
    }
  }

  private getPanelSize(): number {
    return this.isFullscreen
      ? Math.min(this.config.fullscreenSize, this.scene.scale.width - 40, this.scene.scale.height - 40)
      : this.config.size;
  }

  private getMapContentSize(panelSize = this.getPanelSize()): number {
    if (!this.panelFrame) return panelSize;
    return Math.max(32, panelSize - MINIMAP_FRAME_CONTENT_INSET * 2);
  }

  private isFrameQaEnabled(): boolean {
    if (this.config.frameQa) return true;
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('minimapOverlayFrameQa') === '1';
  }

  private writeFrameQaProbeIfEnabled(status: 'ready' | 'pending-zone'): void {
    if (this.isFrameQaEnabled()) {
      this.writeFrameQaProbe(status);
    }
  }
}
