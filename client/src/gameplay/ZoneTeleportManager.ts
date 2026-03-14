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
import { NetworkManager, ZoneInfo } from '../network/NetworkManager';

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

// ── 메인 클래스 ───────────────────────────────────────────────

export class ZoneTeleportManager {
  private scene: Phaser.Scene;
  private net: NetworkManager;
  private characterId = '';
  private currentZoneId = '';

  // 존 경계
  private boundaries: ZoneBoundary[] = [];
  private portals: TeleportPortal[] = [];

  // 텔레포트 UI
  private portalUI: Phaser.GameObjects.Container | null = null;
  private onZoneChange?: ZoneChangeCallback;

  // 전환 중 플래그
  private transitioning = false;

  constructor(scene: Phaser.Scene, net: NetworkManager) {
    this.scene = scene;
    this.net = net;
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
          targetScene: 'GameScene',
          zoneId: targetZoneId,
          zoneName: zoneInfo.name,
          characterId: this.characterId,
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

    const cx = this.scene.scale.width / 2;
    const cy = this.scene.scale.height / 2;

    this.portalUI = this.scene.add.container(0, 0).setDepth(920);

    const bg = this.scene.add.rectangle(cx, cy, 280, 140, 0x0a0a2e, 0.95)
      .setStrokeStyle(2, 0x55aaff);
    this.portalUI.add(bg);

    const title = this.scene.add.text(cx, cy - 40, `🌀 ${portal.name}`, {
      fontSize: '16px', color: '#55aaff', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.portalUI.add(title);

    const desc = this.scene.add.text(cx, cy - 10, `이동: ${portal.targetZoneId}`, {
      fontSize: '12px', color: '#aaaacc',
    }).setOrigin(0.5);
    this.portalUI.add(desc);

    // 이동 버튼
    const goBtn = this.scene.add.text(cx - 50, cy + 30, '[ 이동 ]', {
      fontSize: '14px', color: '#55aaff', backgroundColor: '#2a2a4e', padding: { x: 10, y: 4 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this._closePortalUI();
        this.teleportTo(portal.targetZoneId);
      });
    this.portalUI.add(goBtn);

    // 취소 버튼
    const cancelBtn = this.scene.add.text(cx + 50, cy + 30, '[ 취소 ]', {
      fontSize: '14px', color: '#ff6666', backgroundColor: '#2a2a4e', padding: { x: 10, y: 4 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this._closePortalUI());
    this.portalUI.add(cancelBtn);
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
