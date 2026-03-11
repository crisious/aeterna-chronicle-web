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
};

// ── 미니맵 클래스 ──────────────────────────────────────────────

export class MinimapOverlay {
  private scene: Phaser.Scene;
  private config: MinimapConfig;
  private container: Phaser.GameObjects.Container;

  // UI 요소
  private bgRect: Phaser.GameObjects.Rectangle;
  private border: Phaser.GameObjects.Rectangle;
  private mapImage: Phaser.GameObjects.Image | null = null;
  private markerGraphics: Phaser.GameObjects.Graphics;
  private zoneLabel: Phaser.GameObjects.Text;
  private coordsLabel: Phaser.GameObjects.Text;

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

    // 배경
    this.bgRect = scene.add.rectangle(0, 0, this.config.size, this.config.size, this.config.bgColor, this.config.bgAlpha);
    this.container.add(this.bgRect);

    // 마커 렌더링용 Graphics
    this.markerGraphics = scene.add.graphics();
    this.container.add(this.markerGraphics);

    // 테두리
    this.border = scene.add.rectangle(0, 0, this.config.size, this.config.size);
    this.border.setStrokeStyle(this.config.borderWidth, this.config.borderColor);
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
    this.maskGraphics.fillRect(-this.config.size / 2, -this.config.size / 2, this.config.size, this.config.size);
    this.maskGeom = new Phaser.Display.Masks.GeometryMask(scene, this.maskGraphics);
    this.markerGraphics.setMask(this.maskGeom);
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
      this.mapImage.setDisplaySize(this.config.size, this.config.size);
      this.mapImage.setMask(this.maskGeom);
      this.container.addAt(this.mapImage, 1);  // bgRect 위, markerGraphics 아래
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

      // 마스크 리사이즈
      this.maskGraphics.clear();
      this.maskGraphics.fillRect(-size / 2, -size / 2, size, size);
      this.maskGraphics.setPosition(gameWidth / 2, gameHeight / 2);

      if (this.mapImage) {
        this.mapImage.setDisplaySize(size, size);
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

      this.maskGraphics.clear();
      this.maskGraphics.fillRect(-size / 2, -size / 2, size, size);
      this.maskGraphics.setPosition(cx, cy);

      if (this.mapImage) {
        this.mapImage.setDisplaySize(size, size);
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
    this.container.destroy();
    this.maskGraphics.destroy();
  }

  // ── 내부: 렌더링 ─────────────────────────────────────────

  private render(): void {
    this.markerGraphics.clear();

    if (!this.currentZone) return;

    const currentSize = this.isFullscreen
      ? Math.min(this.config.fullscreenSize, this.scene.scale.width - 40, this.scene.scale.height - 40)
      : this.config.size;

    // 월드 → 미니맵 좌표 변환
    const scaleX = currentSize / this.currentZone.worldWidth;
    const scaleY = currentSize / this.currentZone.worldHeight;

    // 마커 렌더링
    for (const marker of this.markers.values()) {
      if (!marker.active) continue;
      this.renderMarker(marker, scaleX, scaleY, currentSize);
    }

    // 웨이포인트
    if (this.waypointMarker) {
      this.renderMarker(this.waypointMarker, scaleX, scaleY, currentSize);
    }

    // 플레이어 (항상 맨 위)
    const px = this.playerX * scaleX - currentSize / 2;
    const py = this.playerY * scaleY - currentSize / 2;
    this.markerGraphics.fillStyle(MARKER_COLORS.player, 1);
    this.markerGraphics.fillCircle(px, py, MARKER_SIZES.player);
    // 방향 표시 (삼각형)
    this.markerGraphics.fillTriangle(
      px, py - 7,
      px - 4, py + 2,
      px + 4, py + 2,
    );
  }

  private renderMarker(
    marker: MapMarker,
    scaleX: number,
    scaleY: number,
    currentSize: number,
  ): void {
    const mx = marker.x * scaleX - currentSize / 2;
    const my = marker.y * scaleY - currentSize / 2;
    const color = MARKER_COLORS[marker.type] ?? 0xffffff;
    const size = MARKER_SIZES[marker.type] ?? 3;

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

  // ── 내부: 웨이포인트 ─────────────────────────────────────

  private setWaypointFromMinimap(minimapX: number, minimapY: number): void {
    if (!this.currentZone) return;

    const currentSize = this.isFullscreen
      ? Math.min(this.config.fullscreenSize, this.scene.scale.width - 40, this.scene.scale.height - 40)
      : this.config.size;

    // 미니맵 → 월드 좌표 변환
    const worldX = ((minimapX + currentSize / 2) / currentSize) * this.currentZone.worldWidth;
    const worldY = ((minimapY + currentSize / 2) / currentSize) * this.currentZone.worldHeight;

    this.setWaypoint(worldX, worldY);

    if (this.onWaypoint) {
      this.onWaypoint(worldX, worldY);
    }
  }
}
