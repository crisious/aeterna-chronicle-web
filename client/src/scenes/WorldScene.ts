/**
 * WorldScene.ts — 월드맵 오버뷰 씬 (P5-18 → P25-06 API 연동)
 *
 * - 6개 지역 표시 (에테르 평원 / 기억의 숲 / 그림자 협곡 / 결정 동굴 / 잊혀진 성채 / 시간의 첨탑)
 * - 존 선택 → 이동 애니메이션 → 해당 씬 전환
 * - 지역 잠금/해금 상태 표시
 */

import * as Phaser from 'phaser';
import { SceneManager } from './SceneManager';
import { networkManager } from '../network/NetworkManager';

// ── 지역 정의 ───────────────────────────────────────────────

interface WorldZone {
  id: string;
  name: string;
  description: string;
  color: number;
  /** 맵상 위치 (1280x720 기준 비율) */
  posRatioX: number;
  posRatioY: number;
  /** 최소 진입 레벨 */
  minLevel: number;
  /** 해금 여부 (기본 true = 전부 해금, 추후 서버 연동) */
  unlocked: boolean;
}

const WORLD_ZONES: WorldZone[] = [
  { id: 'aether_plains',     name: '에테르 평원',     description: 'Lv.1~10 / 시작 지역',       color: 0x88cc44, posRatioX: 0.2,  posRatioY: 0.55, minLevel: 1,  unlocked: true },
  { id: 'memory_forest',     name: '기억의 숲',       description: 'Lv.10~20 / 고대 정령 서식지', color: 0x44aa88, posRatioX: 0.4,  posRatioY: 0.35, minLevel: 10, unlocked: true },
  { id: 'shadow_gorge',      name: '그림자 협곡',     description: 'Lv.20~30 / 그림자 세력 근거지', color: 0x664488, posRatioX: 0.6,  posRatioY: 0.6,  minLevel: 20, unlocked: true },
  { id: 'crystal_cave',      name: '결정 동굴',       description: 'Lv.30~40 / 에테르 결정 광맥',  color: 0x44cccc, posRatioX: 0.75, posRatioY: 0.3,  minLevel: 30, unlocked: true },
  { id: 'forgotten_citadel', name: '잊혀진 성채',     description: 'Lv.40~50 / 고대 문명 유적',   color: 0xcc8844, posRatioX: 0.85, posRatioY: 0.55, minLevel: 40, unlocked: false },
  { id: 'chrono_spire',      name: '시간의 첨탑',     description: 'Lv.50 / 최종 지역',          color: 0xff4488, posRatioX: 0.5,  posRatioY: 0.15, minLevel: 50, unlocked: false },
];

const NODE_RADIUS = 28;

// ── WorldScene ──────────────────────────────────────────────

export class WorldScene extends Phaser.Scene {
  private zoneNodes: Phaser.GameObjects.Container[] = [];
  private travelLine!: Phaser.GameObjects.Graphics;
  private infoPanel: Phaser.GameObjects.Container | null = null;
  private playerMarker!: Phaser.GameObjects.Arc;
  private currentZoneId = 'aether_plains';

  constructor() {
    super({ key: 'WorldScene' });
  }

  // ── 라이프사이클 ─────────────────────────────────────────

  create(): void {
    const { width, height } = this.cameras.main;
    this.cameras.main.setBackgroundColor('#0a0a1e');

    // 타이틀
    this.add.text(width / 2, 28, '🗺️ 에테르나 월드맵', {
      fontSize: '22px',
      fontFamily: 'monospace',
      color: '#cccc88',
    }).setOrigin(0.5);

    // 경로 연결선
    this.travelLine = this.add.graphics();
    this._drawConnectionLines(width, height);

    // 지역 노드
    for (const zone of WORLD_ZONES) {
      const node = this._createZoneNode(zone, width, height);
      this.zoneNodes.push(node);
    }

    // 플레이어 위치 마커
    const startZone = WORLD_ZONES.find(z => z.id === this.currentZoneId)!;
    this.playerMarker = this.add.circle(
      startZone.posRatioX * width,
      startZone.posRatioY * height,
      8, 0xffffff, 0.9,
    );
    this._pulseMarker();

    // 하단 뒤로가기
    this.add.text(20, height - 30, '← 마을로 돌아가기', {
      fontSize: '13px',
      color: '#888888',
      fontFamily: 'monospace',
    })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('LobbyScene'));

    SceneManager.fadeIn(this, 300);
  }

  // ── 연결선 ───────────────────────────────────────────────

  private _drawConnectionLines(w: number, h: number): void {
    this.travelLine.lineStyle(1, 0x334455, 0.5);

    // 순차 연결 (0→1→2→3→4→5)
    for (let i = 0; i < WORLD_ZONES.length - 1; i++) {
      const a = WORLD_ZONES[i];
      const b = WORLD_ZONES[i + 1];
      this.travelLine.lineBetween(
        a.posRatioX * w, a.posRatioY * h,
        b.posRatioX * w, b.posRatioY * h,
      );
    }
  }

  // ── 지역 노드 ────────────────────────────────────────────

  private _createZoneNode(zone: WorldZone, w: number, h: number): Phaser.GameObjects.Container {
    const x = zone.posRatioX * w;
    const y = zone.posRatioY * h;

    const container = this.add.container(x, y);

    // 노드 원
    const alpha = zone.unlocked ? 1 : 0.4;
    const circle = this.add.circle(0, 0, NODE_RADIUS, zone.color, alpha)
      .setStrokeStyle(2, zone.unlocked ? 0xffffff : 0x444444);

    if (zone.unlocked) {
      circle.setInteractive({ useHandCursor: true });
      circle.on('pointerdown', () => this._onZoneClick(zone));
      circle.on('pointerover', () => circle.setScale(1.15));
      circle.on('pointerout', () => circle.setScale(1.0));
    }

    // 이름 라벨
    const label = this.add.text(0, NODE_RADIUS + 10, zone.name, {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: zone.unlocked ? '#ffffff' : '#666666',
    }).setOrigin(0.5);

    // 잠금 아이콘
    if (!zone.unlocked) {
      const lock = this.add.text(0, 0, '🔒', {
        fontSize: '16px',
      }).setOrigin(0.5);
      container.add(lock);
    }

    container.add([circle, label]);
    return container;
  }

  // ── 존 클릭 ──────────────────────────────────────────────

  private _onZoneClick(zone: WorldZone): void {
    // 정보 패널 표시
    if (this.infoPanel) {
      this.infoPanel.destroy();
    }

    const { width, height } = this.cameras.main;
    const panel = this.add.container(width / 2, height - 100);

    const bg = this.add.rectangle(0, 0, 500, 80, 0x000000, 0.85)
      .setStrokeStyle(1, 0x446688);
    panel.add(bg);

    const info = this.add.text(-200, -20, `${zone.name} — ${zone.description}`, {
      fontSize: '13px',
      color: '#cccccc',
      fontFamily: 'monospace',
    });
    panel.add(info);

    const enterBtn = this.add.text(180, 0, '[ 이동 ]', {
      fontSize: '15px',
      color: '#88ff88',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    enterBtn.on('pointerdown', () => this._travelToZone(zone));
    panel.add(enterBtn);

    this.infoPanel = panel;
  }

  // ── 이동 애니메이션 ──────────────────────────────────────

  private _travelToZone(zone: WorldZone): void {
    const { width, height } = this.cameras.main;
    const targetX = zone.posRatioX * width;
    const targetY = zone.posRatioY * height;

    // 마커 이동 애니메이션
    this.tweens.add({
      targets: this.playerMarker,
      x: targetX,
      y: targetY,
      duration: 600,
      ease: 'Power2',
      onComplete: () => {
        this.currentZoneId = zone.id;

        // P25-06: 소켓으로 텔레포트 요청
        networkManager.emit('world:teleport', {
          characterId: networkManager.socketId ?? '',
          zoneId: zone.id,
        });

        // 페이드 아웃 후 씬 전환
        this.cameras.main.fadeOut(300, 0, 0, 0);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
          this.scene.start('GameScene', { zoneId: zone.id, zoneName: zone.name });
        });
      },
    });

    // 정보 패널 닫기
    if (this.infoPanel) {
      this.infoPanel.destroy();
      this.infoPanel = null;
    }
  }

  // ── 마커 펄스 ────────────────────────────────────────────

  private _pulseMarker(): void {
    this.tweens.add({
      targets: this.playerMarker,
      scaleX: 1.3,
      scaleY: 1.3,
      alpha: 0.6,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }
}
