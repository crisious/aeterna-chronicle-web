/**
 * WorldMapUI — P26-06: 월드맵 UI
 *
 * 기능:
 * - 10개 지역 표시
 * - 존 이동 (텔레포트)
 * - 잠금/해금 상태
 * - NetworkManager 연동 (getZones, 소켓 world:teleport)
 */

import * as Phaser from 'phaser';
import { NetworkManager, ZoneInfo } from '../network/NetworkManager';

// ── 타입 ──────────────────────────────────────────────────────

export interface WorldZone {
  id: string;
  name: string;
  description: string;
  minLevel: number;
  unlocked: boolean;
  mapX: number; // 맵 상 위치 (0~1 비율)
  mapY: number;
  connectedTo: string[]; // 연결된 존 ID
}

// ── 10개 기본 지역 배치 ─────────────────────────────────────

const DEFAULT_ZONES: WorldZone[] = [
  { id: 'zone_01', name: '기억의 시작점',     description: '모험이 시작되는 곳',      minLevel: 1,  unlocked: true,  mapX: 0.5,  mapY: 0.85, connectedTo: ['zone_02'] },
  { id: 'zone_02', name: '잊힌 숲',           description: '기억의 파편이 흩어진 숲',  minLevel: 5,  unlocked: false, mapX: 0.35, mapY: 0.7,  connectedTo: ['zone_01', 'zone_03', 'zone_04'] },
  { id: 'zone_03', name: '에테르 평원',       description: '에테르 결정이 솟아난 평야', minLevel: 10, unlocked: false, mapX: 0.65, mapY: 0.65, connectedTo: ['zone_02', 'zone_05'] },
  { id: 'zone_04', name: '그림자 협곡',       description: '빛이 닿지 않는 깊은 골짜기', minLevel: 15, unlocked: false, mapX: 0.2,  mapY: 0.5,  connectedTo: ['zone_02', 'zone_06'] },
  { id: 'zone_05', name: '시간의 호수',       description: '시간이 왜곡된 호수',       minLevel: 20, unlocked: false, mapX: 0.8,  mapY: 0.5,  connectedTo: ['zone_03', 'zone_07'] },
  { id: 'zone_06', name: '파편 미궁',         description: '기억 파편으로 이루어진 미로', minLevel: 25, unlocked: false, mapX: 0.15, mapY: 0.3,  connectedTo: ['zone_04', 'zone_08'] },
  { id: 'zone_07', name: '결정화 봉우리',     description: '거대 에테르 결정 산맥',     minLevel: 30, unlocked: false, mapX: 0.85, mapY: 0.3,  connectedTo: ['zone_05', 'zone_08'] },
  { id: 'zone_08', name: '공허의 경계',       description: '세계의 경계, 공허에 잠식',  minLevel: 35, unlocked: false, mapX: 0.5,  mapY: 0.25, connectedTo: ['zone_06', 'zone_07', 'zone_09'] },
  { id: 'zone_09', name: '망각의 심연',       description: '모든 기억이 사라지는 곳',   minLevel: 40, unlocked: false, mapX: 0.4,  mapY: 0.1,  connectedTo: ['zone_08', 'zone_10'] },
  { id: 'zone_10', name: '에테르 핵심',       description: '세계의 중심, 최종 결전지',  minLevel: 45, unlocked: false, mapX: 0.6,  mapY: 0.05, connectedTo: ['zone_09'] },
];

// ── 메인 클래스 ───────────────────────────────────────────────

export class WorldMapUI {
  private scene: Phaser.Scene;
  private net: NetworkManager;
  private container: Phaser.GameObjects.Container;
  private visible = false;

  private zones: WorldZone[] = [];
  private characterId = '';
  private characterLevel = 1;
  private currentZoneId = '';

  // UI
  private selectedZone: WorldZone | null = null;
  private detailPanel: Phaser.GameObjects.Container | null = null;
  private nodeObjs: Array<{ node: Phaser.GameObjects.Container; zone: WorldZone }> = [];

  constructor(scene: Phaser.Scene, net: NetworkManager) {
    this.scene = scene;
    this.net = net;
    this.container = scene.add.container(0, 0).setDepth(900).setVisible(false);
    this._buildUI();
  }

  // ── 공개 API ──────────────────────────────────────────────

  async open(characterId: string, level: number, currentZoneId: string): Promise<void> {
    this.characterId = characterId;
    this.characterLevel = level;
    this.currentZoneId = currentZoneId;
    this.visible = true;
    this.container.setVisible(true);
    await this._loadZones();
    this._renderMap();
  }

  close(): void {
    this.visible = false;
    this.container.setVisible(false);
    this._closeDetail();
  }

  isOpen(): boolean { return this.visible; }

  // ── 내부: 데이터 로드 ─────────────────────────────────────

  private async _loadZones(): Promise<void> {
    try {
      const serverZones = await this.net.getZones();
      // 서버 데이터와 기본 배치를 병합
      this.zones = DEFAULT_ZONES.map(dz => {
        const sz = serverZones.find(z => z.id === dz.id);
        return {
          ...dz,
          name: sz?.name ?? dz.name,
          description: sz?.description ?? dz.description,
          minLevel: sz?.minLevel ?? dz.minLevel,
          unlocked: this.characterLevel >= dz.minLevel,
        };
      });
    } catch {
      this.zones = DEFAULT_ZONES.map(z => ({
        ...z,
        unlocked: this.characterLevel >= z.minLevel,
      }));
    }
  }

  // ── 내부: UI 빌드 ────────────────────────────────────────

  private _buildUI(): void {
    const cx = this.scene.scale.width / 2;
    const cy = this.scene.scale.height / 2;

    // dimmer
    const dimmer = this.scene.add.rectangle(cx, cy, this.scene.scale.width, this.scene.scale.height, 0x000000, 0.6)
      .setInteractive().on('pointerdown', () => this.close());
    this.container.add(dimmer);

    // 배경 패널
    const pw = 700;
    const ph = 520;
    const bg = this.scene.add.rectangle(cx, cy, pw, ph, 0x0a0a1e, 0.95).setStrokeStyle(2, 0x4a4a6a);
    this.container.add(bg);

    // 타이틀
    const title = this.scene.add.text(cx - pw / 2 + 20, cy - ph / 2 + 12, '🗺️ 월드맵', {
      fontSize: '18px', color: '#e0e0ff', fontStyle: 'bold',
    });
    this.container.add(title);

    // 닫기
    const closeBtn = this.scene.add.text(cx + pw / 2 - 28, cy - ph / 2 + 8, '✕', {
      fontSize: '18px', color: '#ff6666',
    }).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.close());
    this.container.add(closeBtn);
  }

  // ── 내부: 맵 렌더 ────────────────────────────────────────

  private _renderMap(): void {
    // 기존 노드 제거
    this.nodeObjs.forEach(no => no.node.destroy());
    this.nodeObjs = [];

    const cx = this.scene.scale.width / 2;
    const cy = this.scene.scale.height / 2;
    const pw = 660;
    const ph = 440;
    const ox = cx - pw / 2;
    const oy = cy - ph / 2 + 50;

    // 연결선
    this.zones.forEach(zone => {
      zone.connectedTo.forEach(targetId => {
        const target = this.zones.find(z => z.id === targetId);
        if (!target) return;
        const x1 = ox + zone.mapX * pw;
        const y1 = oy + zone.mapY * ph;
        const x2 = ox + target.mapX * pw;
        const y2 = oy + target.mapY * ph;

        const lineColor = (zone.unlocked && target.unlocked) ? 0x4488ff : 0x2a2a3e;
        const line = this.scene.add.line(0, 0, x1, y1, x2, y2, lineColor, 0.6).setOrigin(0);
        this.container.add(line);
      });
    });

    // 존 노드
    this.zones.forEach(zone => {
      const x = ox + zone.mapX * pw;
      const y = oy + zone.mapY * ph;
      const isCurrent = zone.id === this.currentZoneId;

      const nodeC = this.scene.add.container(x, y);

      const nodeR = 22;
      const bgColor = zone.unlocked
        ? (isCurrent ? 0x44cc88 : 0x4488ff)
        : 0x2a2a3e;
      const circle = this.scene.add.circle(0, 0, nodeR, bgColor)
        .setStrokeStyle(2, isCurrent ? 0xffffff : (zone.unlocked ? 0x6699ff : 0x3a3a4e))
        .setInteractive({ useHandCursor: zone.unlocked })
        .on('pointerdown', () => this._selectZone(zone));

      const icon = this.scene.add.text(0, -2, zone.unlocked ? '🏔️' : '🔒', {
        fontSize: '14px',
      }).setOrigin(0.5);

      const label = this.scene.add.text(0, nodeR + 8, zone.name, {
        fontSize: '10px', color: zone.unlocked ? '#ccccee' : '#555566',
      }).setOrigin(0.5);

      const lvl = this.scene.add.text(0, nodeR + 22, `Lv.${zone.minLevel}+`, {
        fontSize: '8px', color: '#888888',
      }).setOrigin(0.5);

      nodeC.add([circle, icon, label, lvl]);
      this.container.add(nodeC);
      this.nodeObjs.push({ node: nodeC, zone });
    });
  }

  // ── 내부: 존 선택 → 텔레포트 ──────────────────────────────

  private _selectZone(zone: WorldZone): void {
    this._closeDetail();
    if (!zone.unlocked) return;
    if (zone.id === this.currentZoneId) return;

    this.selectedZone = zone;

    const cx = this.scene.scale.width / 2 + 260;
    const cy = this.scene.scale.height / 2;
    const pw = 200;
    const ph = 180;

    this.detailPanel = this.scene.add.container(0, 0).setDepth(910);

    const bg = this.scene.add.rectangle(cx, cy, pw, ph, 0x1a1a2e, 0.98)
      .setStrokeStyle(2, 0x4488ff);
    this.detailPanel.add(bg);

    let y = cy - ph / 2 + 14;
    const line = (text: string, color = '#e0e0ff', size = '12px') => {
      const t = this.scene.add.text(cx - pw / 2 + 14, y, text, { fontSize: size, color, wordWrap: { width: pw - 28 } });
      this.detailPanel!.add(t);
      y += parseInt(size) + 6;
    };

    line(zone.name, '#ffffff', '15px');
    line(zone.description, '#aaaacc', '11px');
    line(`레벨 제한: ${zone.minLevel}+`, '#ffcc00');

    // 텔레포트 버튼
    const tpBtn = this.scene.add.text(cx, cy + ph / 2 - 35, '[ 텔레포트 ]', {
      fontSize: '14px', color: '#55aaff', backgroundColor: '#2a2a4e', padding: { x: 12, y: 4 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this._teleport(zone));
    this.detailPanel.add(tpBtn);

    this.container.add(this.detailPanel);
  }

  private async _teleport(zone: WorldZone): Promise<void> {
    try {
      this.net.emit('world:teleport', { characterId: this.characterId, zoneId: zone.id });
      this.currentZoneId = zone.id;
      this.close();
    } catch (e) {
      console.error('[WorldMapUI] teleport failed', e);
    }
  }

  private _closeDetail(): void {
    if (this.detailPanel) { this.detailPanel.destroy(); this.detailPanel = null; }
    this.selectedZone = null;
  }

  destroy(): void {
    this._closeDetail();
    this.nodeObjs.forEach(no => no.node.destroy());
    this.container.destroy();
  }
}
