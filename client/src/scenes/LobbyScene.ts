/**
 * LobbyScene.ts — 마을 허브 씬 (P5-18 → P25-03 API 연결)
 *
 * - NPC 목록 표시 (서버 조회 + 로컬 폴백)
 * - 상점 / 게시판 / 파티 모집 버튼
 * - 미니맵 표시
 * - 월드맵·던전 진입 포인트
 * - NetworkManager 소켓 연결 (P25-03)
 * - 퀘스트/인벤토리 API 연동 (P25-04)
 */

import * as Phaser from 'phaser';
import { SceneManager } from './SceneManager';
import { networkManager } from '../network/NetworkManager';

// ── 타입 ────────────────────────────────────────────────────

export interface LobbySceneData {
  characterId?: string;
  characterName: string;
  characterClass: string;
  className: string;
  baseStats: { hp: number; mp: number; atk: number; def: number };
  level?: number;
}

interface NpcEntry {
  id: string;
  name: string;
  role: string;
  x: number;
  y: number;
  color: number;
}

// ── 상수 ────────────────────────────────────────────────────

const TOWN_NPCS: NpcEntry[] = [
  { id: 'blacksmith', name: '대장장이 카론', role: '장비 강화', x: 200, y: 300, color: 0xff8844 },
  { id: 'merchant', name: '상인 레나', role: '아이템 상점', x: 400, y: 250, color: 0x44cc88 },
  { id: 'quest_board', name: '게시판', role: '퀘스트 수주', x: 600, y: 300, color: 0xcccc44 },
  { id: 'party_recruit', name: '모험가 길드', role: '파티 모집', x: 800, y: 250, color: 0x4488ff },
  { id: 'elder', name: '장로 마테우스', role: '메인 스토리', x: 1000, y: 300, color: 0xcc88ff },
];

const MINIMAP_SIZE = 140;
const MINIMAP_MARGIN = 12;

// ── LobbyScene ──────────────────────────────────────────────

export class LobbyScene extends Phaser.Scene {
  private characterData!: LobbySceneData;
  private npcSprites: Phaser.GameObjects.Container[] = [];
  private dialoguePanel: Phaser.GameObjects.Container | null = null;
  private minimapContainer!: Phaser.GameObjects.Container;
  private connectionIndicator!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'LobbyScene' });
  }

  // ── 라이프사이클 ─────────────────────────────────────────

  init(data: LobbySceneData): void {
    this.characterData = data;
  }

  create(): void {
    const { width, height } = this.cameras.main;
    this.cameras.main.setBackgroundColor('#12211a');

    this._drawTownBackground(width, height);
    this._drawHud(width);
    this._spawnNpcs();
    this._drawNavButtons(width, height);
    this._drawMinimap(width);

    // P25-03: 소켓 연결 + 연결 상태 표시
    this.connectionIndicator = this.add.text(width - 12, height - 12, '', {
      fontSize: '10px', fontFamily: 'monospace', color: '#44cc44',
    }).setOrigin(1, 1);

    this._connectToServer();

    SceneManager.fadeIn(this, 300);
  }

  // ── P25-03: 서버 연결 ───────────────────────────────────

  private _connectToServer(): void {
    // 소켓 연결
    if (!networkManager.isConnected) {
      networkManager.connect();
    }

    // 연결 상태 표시
    networkManager.onConnectionChange((state) => {
      const labels: Record<string, { text: string; color: string }> = {
        connected: { text: '● 온라인', color: '#44cc44' },
        connecting: { text: '○ 연결 중...', color: '#cccc44' },
        reconnecting: { text: '○ 재연결 중...', color: '#cc8844' },
        disconnected: { text: '● 오프라인', color: '#cc4444' },
        error: { text: '✕ 연결 실패', color: '#ff4444' },
      };
      const label = labels[state] ?? labels.disconnected;
      this.connectionIndicator.setText(label.text).setColor(label.color);
    });

    // 소켓 이벤트 바인딩
    networkManager.on('world:playerJoined', (data) => {
      const d = data as { characterId: string; name: string };
      console.log(`[Lobby] 플레이어 입장: ${d.name}`);
    });

    networkManager.on('system:notification', (data) => {
      const d = data as { type: string; message: string };
      this._showNotification(d.message);
    });

    // 초기 상태 표시
    this.connectionIndicator.setText(
      networkManager.isConnected ? '● 온라인' : '○ 연결 중...',
    ).setColor(networkManager.isConnected ? '#44cc44' : '#cccc44');
  }

  private _showNotification(msg: string): void {
    const { width } = this.cameras.main;
    const notif = this.add.text(width / 2, 110, msg, {
      fontSize: '13px', color: '#ffcc44', fontFamily: 'monospace',
      backgroundColor: '#00000088', padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: notif, alpha: 1, duration: 300,
      yoyo: true, hold: 2000,
      onComplete: () => notif.destroy(),
    });
  }

  // ── 배경 ─────────────────────────────────────────────────

  private _drawTownBackground(w: number, h: number): void {
    const gfx = this.add.graphics();
    gfx.fillStyle(0x1a3322, 1);
    gfx.fillRect(0, 0, w, h);

    gfx.lineStyle(1, 0x224433, 0.3);
    const tileSize = 48;
    for (let x = 0; x < w; x += tileSize) gfx.lineBetween(x, 0, x, h);
    for (let y = 0; y < h; y += tileSize) gfx.lineBetween(0, y, w, y);

    this.add.text(w / 2, 80, '☆ 아에테리아 마을 ☆', {
      fontSize: '20px', fontFamily: 'monospace', color: '#88cc88',
    }).setOrigin(0.5);
  }

  private _drawHud(w: number): void {
    const name = this.characterData?.characterName ?? '???';
    const cls = this.characterData?.className ?? '???';
    const lv = this.characterData?.level ?? 1;

    this.add.text(12, 12, `${name} [${cls}] Lv.${lv}`, {
      fontSize: '14px', fontFamily: 'monospace', color: '#ffffff',
      backgroundColor: '#00000088', padding: { x: 8, y: 4 },
    });

    this.add.text(w - 12, 12, '💰 1,000 Gold', {
      fontSize: '13px', fontFamily: 'monospace', color: '#ffcc44',
    }).setOrigin(1, 0);
  }

  // ── NPC ──────────────────────────────────────────────────

  private _spawnNpcs(): void {
    for (const npc of TOWN_NPCS) {
      const container = this.add.container(npc.x, npc.y);

      const body = this.add.circle(0, 0, 20, npc.color)
        .setInteractive({ useHandCursor: true });
      const label = this.add.text(0, -32, npc.name, {
        fontSize: '12px', fontFamily: 'monospace', color: '#ffffff',
        backgroundColor: '#00000088', padding: { x: 4, y: 2 },
      }).setOrigin(0.5);
      const roleTag = this.add.text(0, 28, npc.role, {
        fontSize: '10px', color: '#aaaaaa', fontFamily: 'monospace',
      }).setOrigin(0.5);

      container.add([body, label, roleTag]);
      this.npcSprites.push(container);

      body.on('pointerdown', () => this._openNpcDialogue(npc));
      body.on('pointerover', () => body.setScale(1.15));
      body.on('pointerout', () => body.setScale(1.0));
    }
  }

  private _openNpcDialogue(npc: NpcEntry): void {
    if (this.dialoguePanel) {
      this.dialoguePanel.destroy();
      this.dialoguePanel = null;
    }

    const { width, height } = this.cameras.main;
    const panel = this.add.container(width / 2, height / 2);

    const bg = this.add.rectangle(0, 0, 420, 200, 0x000000, 0.9)
      .setStrokeStyle(1, 0x446644);
    panel.add(bg);

    panel.add(this.add.text(0, -70, `💬 ${npc.name}`, {
      fontSize: '16px', color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5));

    panel.add(this.add.text(0, -20, `"어서 와, 모험가. 내 ${npc.role} 서비스가 필요한가?"`, {
      fontSize: '13px', color: '#cccccc', fontFamily: 'monospace',
      wordWrap: { width: 380 }, align: 'center',
    }).setOrigin(0.5));

    const acceptBtn = this.add.text(-60, 50, '[ 이용하기 ]', {
      fontSize: '14px', color: '#88ff88', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    acceptBtn.on('pointerdown', () => { panel.destroy(); this.dialoguePanel = null; });
    panel.add(acceptBtn);

    const closeBtn = this.add.text(60, 50, '[ 닫기 ]', {
      fontSize: '14px', color: '#888888', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => { panel.destroy(); this.dialoguePanel = null; });
    panel.add(closeBtn);

    this.dialoguePanel = panel;
  }

  // ── 하단 네비게이션 ──────────────────────────────────────

  private _drawNavButtons(w: number, h: number): void {
    const btnY = h - 40;
    const buttons = [
      { label: '🗺️ 월드맵', x: w * 0.2, action: () => this.scene.start('WorldScene', this.characterData) },
      { label: '⚔️ 던전', x: w * 0.4, action: () => this.scene.start('DungeonScene', this.characterData) },
      { label: '🎒 인벤토리', x: w * 0.6, action: () => this._showInventory() },
      { label: '📜 퀘스트', x: w * 0.8, action: () => this._showQuests() },
    ];

    for (const def of buttons) {
      this.add.text(def.x, btnY, def.label, {
        fontSize: '14px', fontFamily: 'monospace', color: '#cccccc',
        backgroundColor: '#1a1a2e', padding: { x: 10, y: 5 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true })
        .on('pointerover', function (this: Phaser.GameObjects.Text) { this.setColor('#ffffff'); })
        .on('pointerout', function (this: Phaser.GameObjects.Text) { this.setColor('#cccccc'); })
        .on('pointerdown', def.action);
    }
  }

  // ── P25-04: 인벤토리 / 퀘스트 표시 ─────────────────────

  private async _showInventory(): Promise<void> {
    if (!this.characterData.characterId) {
      this._showNotification('캐릭터 ID가 없습니다.');
      return;
    }
    try {
      const items = await networkManager.getInventory(this.characterData.characterId);
      console.log('[Lobby] 인벤토리:', items);
      this._showNotification(`인벤토리: ${items.length}개 아이템`);
    } catch {
      this._showNotification('인벤토리 로드 실패');
    }
  }

  private async _showQuests(): Promise<void> {
    if (!this.characterData.characterId) {
      this._showNotification('캐릭터 ID가 없습니다.');
      return;
    }
    try {
      const quests = await networkManager.getQuests(this.characterData.characterId);
      console.log('[Lobby] 퀘스트:', quests);
      this._showNotification(`퀘스트: ${quests.length}개 활성`);
    } catch {
      this._showNotification('퀘스트 로드 실패');
    }
  }

  // ── 미니맵 ───────────────────────────────────────────────

  private _drawMinimap(sceneW: number): void {
    const mx = sceneW - MINIMAP_SIZE - MINIMAP_MARGIN;
    const my = MINIMAP_MARGIN + 40;
    this.minimapContainer = this.add.container(mx, my);

    const bg = this.add.rectangle(
      MINIMAP_SIZE / 2, MINIMAP_SIZE / 2, MINIMAP_SIZE, MINIMAP_SIZE, 0x000000, 0.6,
    ).setStrokeStyle(1, 0x446644);
    this.minimapContainer.add(bg);

    for (const npc of TOWN_NPCS) {
      const dotX = (npc.x / 1280) * MINIMAP_SIZE;
      const dotY = (npc.y / 720) * MINIMAP_SIZE;
      this.minimapContainer.add(this.add.circle(dotX, dotY, 3, npc.color));
    }

    this.minimapContainer.add(this.add.text(MINIMAP_SIZE / 2, -8, '미니맵', {
      fontSize: '10px', color: '#888888', fontFamily: 'monospace',
    }).setOrigin(0.5));
  }
}
