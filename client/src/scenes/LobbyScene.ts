/**
 * LobbyScene.ts — 마을 허브 씬 (P5-18)
 *
 * - NPC 목록 표시 (대화 가능)
 * - 상점 / 게시판 / 파티 모집 버튼
 * - 미니맵 표시 (MinimapOverlay 연동)
 * - 월드맵·던전 진입 포인트
 */

import * as Phaser from 'phaser';
import { SceneManager } from './SceneManager';

// ── 타입 ────────────────────────────────────────────────────

/** CharacterSelectScene에서 전달받는 데이터 */
export interface LobbySceneData {
  characterName: string;
  characterClass: string;
  className: string;
  baseStats: { hp: number; mp: number; atk: number; def: number };
}

/** NPC 정의 */
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
  { id: 'elder', name: '장로 에오스', role: '메인 스토리', x: 1000, y: 300, color: 0xcc88ff },
];

const MINIMAP_SIZE = 140;
const MINIMAP_MARGIN = 12;

// ── LobbyScene ──────────────────────────────────────────────

export class LobbyScene extends Phaser.Scene {
  private characterData!: LobbySceneData;
  private npcSprites: Phaser.GameObjects.Container[] = [];
  private dialoguePanel: Phaser.GameObjects.Container | null = null;
  private minimapContainer!: Phaser.GameObjects.Container;

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

    // 마을 배경 (타일 패턴)
    this._drawTownBackground(width, height);

    // 상단 HUD
    this._drawHud(width);

    // NPC 배치
    this._spawnNpcs();

    // 하단 네비게이션 버튼
    this._drawNavButtons(width, height);

    // 미니맵
    this._drawMinimap(width);

    // 페이드 인
    SceneManager.fadeIn(this, 300);
  }

  // ── 배경 ─────────────────────────────────────────────────

  private _drawTownBackground(w: number, h: number): void {
    // 바닥 타일 (간단한 그리드)
    const gfx = this.add.graphics();
    gfx.fillStyle(0x1a3322, 1);
    gfx.fillRect(0, 0, w, h);

    // 타일 그리드
    gfx.lineStyle(1, 0x224433, 0.3);
    const tileSize = 48;
    for (let x = 0; x < w; x += tileSize) {
      gfx.lineBetween(x, 0, x, h);
    }
    for (let y = 0; y < h; y += tileSize) {
      gfx.lineBetween(0, y, w, y);
    }

    // 마을 이름
    this.add.text(w / 2, 80, '☆ 아에테리아 마을 ☆', {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#88cc88',
    }).setOrigin(0.5);
  }

  // ── HUD ──────────────────────────────────────────────────

  private _drawHud(w: number): void {
    const name = this.characterData?.characterName ?? '???';
    const cls = this.characterData?.className ?? '???';

    this.add.text(12, 12, `${name} [${cls}]`, {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#ffffff',
      backgroundColor: '#00000088',
      padding: { x: 8, y: 4 },
    });

    // 골드 표시 (목업)
    this.add.text(w - 12, 12, '💰 1,000 Gold', {
      fontSize: '13px',
      fontFamily: 'monospace',
      color: '#ffcc44',
    }).setOrigin(1, 0);
  }

  // ── NPC ──────────────────────────────────────────────────

  private _spawnNpcs(): void {
    for (const npc of TOWN_NPCS) {
      const container = this.add.container(npc.x, npc.y);

      // NPC 아이콘
      const body = this.add.circle(0, 0, 20, npc.color)
        .setInteractive({ useHandCursor: true });

      // 이름 태그
      const label = this.add.text(0, -32, npc.name, {
        fontSize: '12px',
        fontFamily: 'monospace',
        color: '#ffffff',
        backgroundColor: '#00000088',
        padding: { x: 4, y: 2 },
      }).setOrigin(0.5);

      // 역할 태그
      const roleTag = this.add.text(0, 28, npc.role, {
        fontSize: '10px',
        color: '#aaaaaa',
        fontFamily: 'monospace',
      }).setOrigin(0.5);

      container.add([body, label, roleTag]);
      this.npcSprites.push(container);

      // 클릭 → 대화 패널
      body.on('pointerdown', () => this._openNpcDialogue(npc));
      body.on('pointerover', () => body.setScale(1.15));
      body.on('pointerout', () => body.setScale(1.0));
    }
  }

  private _openNpcDialogue(npc: NpcEntry): void {
    // 기존 패널 닫기
    if (this.dialoguePanel) {
      this.dialoguePanel.destroy();
      this.dialoguePanel = null;
    }

    const { width, height } = this.cameras.main;
    const cx = width / 2;
    const cy = height / 2;

    const panel = this.add.container(cx, cy);

    const bg = this.add.rectangle(0, 0, 420, 200, 0x000000, 0.9)
      .setStrokeStyle(1, 0x446644);
    panel.add(bg);

    const title = this.add.text(0, -70, `💬 ${npc.name}`, {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    panel.add(title);

    const body = this.add.text(0, -20, `"어서 와, 모험가. 내 ${npc.role} 서비스가 필요한가?"`, {
      fontSize: '13px',
      color: '#cccccc',
      fontFamily: 'monospace',
      wordWrap: { width: 380 },
      align: 'center',
    }).setOrigin(0.5);
    panel.add(body);

    // 버튼들
    const acceptBtn = this.add.text(-60, 50, '[ 이용하기 ]', {
      fontSize: '14px',
      color: '#88ff88',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    acceptBtn.on('pointerdown', () => {
      console.info(`[LobbyScene] NPC ${npc.id} 이용`);
      panel.destroy();
      this.dialoguePanel = null;
    });
    panel.add(acceptBtn);

    const closeBtn = this.add.text(60, 50, '[ 닫기 ]', {
      fontSize: '14px',
      color: '#888888',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => {
      panel.destroy();
      this.dialoguePanel = null;
    });
    panel.add(closeBtn);

    this.dialoguePanel = panel;
  }

  // ── 하단 네비게이션 ──────────────────────────────────────

  private _drawNavButtons(w: number, h: number): void {
    const btnY = h - 40;
    const buttons = [
      { label: '🗺️ 월드맵', x: w * 0.3, action: () => this.scene.start('WorldScene', this.characterData) },
      { label: '⚔️ 던전 입장', x: w * 0.5, action: () => this.scene.start('DungeonScene', this.characterData) },
      { label: '🎒 인벤토리', x: w * 0.7, action: () => console.info('[LobbyScene] 인벤토리 (미구현)') },
    ];

    for (const def of buttons) {
      this.add.text(def.x, btnY, def.label, {
        fontSize: '15px',
        fontFamily: 'monospace',
        color: '#cccccc',
        backgroundColor: '#1a1a2e',
        padding: { x: 12, y: 6 },
      })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerover', function (this: Phaser.GameObjects.Text) { this.setColor('#ffffff'); })
        .on('pointerout', function (this: Phaser.GameObjects.Text) { this.setColor('#cccccc'); })
        .on('pointerdown', def.action);
    }
  }

  // ── 미니맵 ───────────────────────────────────────────────

  private _drawMinimap(sceneW: number): void {
    const mx = sceneW - MINIMAP_SIZE - MINIMAP_MARGIN;
    const my = MINIMAP_MARGIN + 40;

    this.minimapContainer = this.add.container(mx, my);

    // 미니맵 배경
    const bg = this.add.rectangle(
      MINIMAP_SIZE / 2, MINIMAP_SIZE / 2,
      MINIMAP_SIZE, MINIMAP_SIZE,
      0x000000, 0.6,
    ).setStrokeStyle(1, 0x446644);
    this.minimapContainer.add(bg);

    // NPC 점 표시
    for (const npc of TOWN_NPCS) {
      const dotX = (npc.x / 1280) * MINIMAP_SIZE;
      const dotY = (npc.y / 720) * MINIMAP_SIZE;
      const dot = this.add.circle(dotX, dotY, 3, npc.color);
      this.minimapContainer.add(dot);
    }

    // 레이블
    const label = this.add.text(MINIMAP_SIZE / 2, -8, '미니맵', {
      fontSize: '10px',
      color: '#888888',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.minimapContainer.add(label);
  }
}
