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
import { NetworkManager } from '../network/NetworkManager';

// ── 타입 ──────────────────────────────────────────────────────

export interface MinimapMarker {
  id: string;
  type: 'player' | 'npc' | 'monster' | 'portal' | 'quest';
  x: number;
  y: number;
  name: string;
}

interface MarkerObj {
  dot: Phaser.GameObjects.Arc;
  marker: MinimapMarker;
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
  private container: Phaser.GameObjects.Container;
  private visible = true;

  private readonly SIZE = 180;
  private readonly PADDING = 10;

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
  private playerDot!: Phaser.GameObjects.Arc;

  // UI
  private bg!: Phaser.GameObjects.Rectangle;
  private border!: Phaser.GameObjects.Rectangle;
  private zoneLabel!: Phaser.GameObjects.Text;
  private mask!: Phaser.GameObjects.Graphics;

  // 클릭 이동 콜백
  private onClickMove?: (worldX: number, worldY: number) => void;

  constructor(scene: Phaser.Scene, net: NetworkManager) {
    this.scene = scene;
    this.net = net;

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
  }

  setPlayerPosition(x: number, y: number): void {
    this.playerX = x;
    this.playerY = y;
    this._updatePlayerDot();
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
  toggle(): void { this.visible ? this.hide() : this.show(); }

  // ── 내부: UI 빌드 ────────────────────────────────────────

  private _buildUI(): void {
    // 배경
    this.bg = this.scene.add.rectangle(0, 0, this.SIZE, this.SIZE, 0x0a0a1e, 0.8).setOrigin(0);
    this.border = this.scene.add.rectangle(0, 0, this.SIZE, this.SIZE)
      .setOrigin(0).setStrokeStyle(2, 0x4a4a6a).setFillStyle(0x000000, 0);

    // 클릭 이동 영역
    this.bg.setInteractive({ useHandCursor: true })
      .on('pointerdown', (ptr: Phaser.Input.Pointer) => {
        if (!this.onClickMove) return;
        const localX = ptr.x - this.container.x;
        const localY = ptr.y - this.container.y;
        const worldX = (localX / this.SIZE) * this.worldWidth;
        const worldY = (localY / this.SIZE) * this.worldHeight;
        this.onClickMove(worldX, worldY);
      });

    // 존 이름
    this.zoneLabel = this.scene.add.text(this.SIZE / 2, this.SIZE + 6, '', {
      fontSize: '10px', color: '#aaaacc',
    }).setOrigin(0.5, 0);

    // 플레이어 점
    this.playerDot = this.scene.add.circle(this.SIZE / 2, this.SIZE / 2, 4, 0x55ff55);

    // 마스크 (원형 대신 사각)
    this.mask = this.scene.add.graphics();
    this.mask.fillStyle(0xffffff);
    this.mask.fillRect(this.container.x, this.container.y, this.SIZE, this.SIZE);

    this.container.add([this.bg, this.border, this.playerDot, this.zoneLabel]);
  }

  // ── 내부: 좌표 변환 ──────────────────────────────────────

  private _worldToMinimap(wx: number, wy: number): { mx: number; my: number } {
    return {
      mx: Phaser.Math.Clamp((wx / this.worldWidth) * this.SIZE, 0, this.SIZE),
      my: Phaser.Math.Clamp((wy / this.worldHeight) * this.SIZE, 0, this.SIZE),
    };
  }

  private _updatePlayerDot(): void {
    const { mx, my } = this._worldToMinimap(this.playerX, this.playerY);
    this.playerDot.setPosition(mx, my);
  }

  // ── 내부: 마커 렌더 ──────────────────────────────────────

  private _clearMarkers(): void {
    this.markerObjs.forEach(mo => mo.dot.destroy());
    this.markerObjs = [];
  }

  private _renderMarkers(): void {
    this._clearMarkers();

    this.markers.forEach(marker => {
      const { mx, my } = this._worldToMinimap(marker.x, marker.y);
      const color = MARKER_COLORS[marker.type] ?? 0xffffff;
      const radius = marker.type === 'monster' ? 2 : 3;

      const dot = this.scene.add.circle(mx, my, radius, color);
      this.container.add(dot);
      this.markerObjs.push({ dot, marker });
    });

    // 플레이어 점은 항상 최상위
    this.container.bringToTop(this.playerDot);
    this.container.bringToTop(this.zoneLabel);
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
}
