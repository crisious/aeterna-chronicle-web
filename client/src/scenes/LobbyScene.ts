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
import { playSfx, UI_SFX, NPC_VOICE } from '../utils/SFXHelper';

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
  { id: 'blacksmith', name: '대장장이 칼렌', role: '장비 강화', x: 200, y: 300, color: 0xff8844 },
  { id: 'merchant', name: '상인 미라', role: '아이템 상점', x: 400, y: 250, color: 0x44cc88 },
  { id: 'quest_board', name: '기억의 게시판', role: '퀘스트 수주', x: 600, y: 300, color: 0xcccc44 },
  { id: 'party_recruit', name: '모험가 길드', role: '파티 모집', x: 800, y: 250, color: 0x4488ff },
  { id: 'elder', name: '장로 마테우스', role: '메인 스토리', x: 1000, y: 300, color: 0xcc88ff },
];

const MINIMAP_SIZE = 140;
const MINIMAP_MARGIN = 12;

// P33-A: NPC id → 스프라이트 파일명 매핑
const NPC_SPRITE_MAP: Record<string, string> = {
  blacksmith: '19_kalen_sprite',   // 대장장이 칼렌
  merchant: '20_mira_sprite',      // 상인 미라
  quest_board: '18_memory_fragment_sprite', // 기억의 게시판 (기억 파편 컨셉)
  party_recruit: '13_hashir_sprite', // 모험가 길드 → 하시르 스프라이트
  elder: '04_mateus_sprite',       // 장로 마테우스
};

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

  preload(): void {
    // P33-A: 타운 배경 (실반헤임 숲)
    this.load.image('town_bg', 'assets/generated/environment/backgrounds/SYL-BG-FAR-DAY.png');
    this.load.image('town_bg_mid', 'assets/generated/environment/backgrounds/SYL-BG-MID-DAY.png');

    // P33-A: NPC 스프라이트
    for (const [npcId, spriteFile] of Object.entries(NPC_SPRITE_MAP)) {
      this.load.image(
        `npc_${npcId}`,
        `assets/generated/characters/npc_sprites/${spriteFile}.png`,
      );
    }
    // 추가 NPC 초상화 (대화 패널용)
    this.load.image('npc_portrait_mateus', 'assets/generated/characters/npc_sprites/04_mateus_sprite.png');
    this.load.image('npc_portrait_lumina', 'assets/generated/characters/npc_sprites/03_lumina_sprite.png');

    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.warn(`[Lobby] 이미지 로드 실패: ${file.key}`);
    });
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
    // P33-A: 실제 배경 이미지 사용 (fallback: 기존 프로그래매틱 배경)
    if (this.textures.exists('town_bg')) {
      this.add.image(w / 2, h / 2, 'town_bg').setDisplaySize(w, h).setAlpha(0.8);
    }
    if (this.textures.exists('town_bg_mid')) {
      this.add.image(w / 2, h / 2, 'town_bg_mid').setDisplaySize(w, h).setAlpha(0.3);
    }

    // 배경 이미지가 없으면 기존 프로그래매틱 배경
    if (!this.textures.exists('town_bg')) {
      const gfx = this.add.graphics();
      gfx.fillStyle(0x1a3322, 1);
      gfx.fillRect(0, 0, w, h);
      gfx.lineStyle(1, 0x224433, 0.3);
      const tileSize = 48;
      for (let x = 0; x < w; x += tileSize) gfx.lineBetween(x, 0, x, h);
      for (let y = 0; y < h; y += tileSize) gfx.lineBetween(0, y, w, y);
    }

    // 반투명 오버레이 (UI 가독성)
    this.add.rectangle(w / 2, h / 2, w, h, 0x0a1a12, 0.4);

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

      // P33-A: 실제 NPC 스프라이트 사용 (fallback: 원형 도형)
      const npcTexKey = `npc_${npc.id}`;
      let body: Phaser.GameObjects.Image | Phaser.GameObjects.Arc;
      if (this.textures.exists(npcTexKey)) {
        body = this.add.image(0, 0, npcTexKey)
          .setDisplaySize(48, 64)
          .setInteractive({ useHandCursor: true });
      } else {
        body = this.add.circle(0, 0, 20, npc.color)
          .setInteractive({ useHandCursor: true });
      }
      const label = this.add.text(0, -32, npc.name, {
        fontSize: '12px', fontFamily: 'monospace', color: '#ffffff',
        backgroundColor: '#00000088', padding: { x: 4, y: 2 },
      }).setOrigin(0.5);
      const roleTag = this.add.text(0, 28, npc.role, {
        fontSize: '10px', color: '#aaaaaa', fontFamily: 'monospace',
      }).setOrigin(0.5);

      container.add([body, label, roleTag]);
      this.npcSprites.push(container);

      body.on('pointerdown', () => {
        playSfx(this, UI_SFX.CLICK);
        this._openNpcDialogue(npc);
      });
      const baseScaleX = body.scaleX;
      const baseScaleY = body.scaleY;
      body.on('pointerover', () => {
        body.setScale(baseScaleX * 1.15, baseScaleY * 1.15);
        playSfx(this, UI_SFX.HOVER);
      });
      body.on('pointerout', () => body.setScale(baseScaleX, baseScaleY));
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

    // P33-A: NPC 대화 초상화
    const npcPortraitKey = `npc_${npc.id}`;
    if (this.textures.exists(npcPortraitKey)) {
      panel.add(this.add.image(-160, 0, npcPortraitKey).setDisplaySize(56, 72));
    }

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
    acceptBtn.on('pointerdown', () => {
      playSfx(this, UI_SFX.CONFIRM);
      panel.destroy();
      this.dialoguePanel = null;
      this._executeNpcAction(npc);
    });
    panel.add(acceptBtn);

    const closeBtn = this.add.text(60, 50, '[ 닫기 ]', {
      fontSize: '14px', color: '#888888', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => {
      playSfx(this, UI_SFX.CANCEL);
      panel.destroy();
      this.dialoguePanel = null;
    });
    panel.add(closeBtn);

    // P34-A: NPC 인사 보이스
    const voiceKey = NPC_VOICE[npc.id];
    if (voiceKey) playSfx(this, voiceKey, 0.7);

    playSfx(this, UI_SFX.OPEN);

    this.dialoguePanel = panel;
  }

  // ── NPC 액션 실행 ────────────────────────────────────────

  private _executeNpcAction(npc: NpcEntry): void {
    switch (npc.id) {
      case 'merchant':
        this._showNotification(`🛒 ${npc.name}: 상점을 열었습니다. (아이템 ${80}종 판매 중)`);
        // TODO: ShopUI 통합 후 교체
        this._showShopPanel(npc);
        break;
      case 'blacksmith':
        this._showNotification(`🔨 ${npc.name}: 장비 강화 서비스를 준비합니다.`);
        this._showEnhancePanel(npc);
        break;
      case 'quest_board':
        this._showNotification(`📜 ${npc.name}: 의뢰 게시판을 엽니다.`);
        this._showQuests();
        break;
      case 'party_recruit':
        this._showNotification(`⚔️ ${npc.name}: 파티원을 모집합니다.`);
        this._showPartyPanel(npc);
        break;
      case 'elder':
        this._showNotification(`📖 ${npc.name}: 메인 스토리를 진행합니다.`);
        this._showStoryPanel(npc);
        break;
      default:
        this._showNotification(`${npc.name}과(와) 대화를 마쳤습니다.`);
    }
  }

  private _showShopPanel(npc: NpcEntry): void {
    const { width, height } = this.cameras.main;
    const panel = this.add.container(width / 2, height / 2);
    const bg = this.add.rectangle(0, 0, 500, 350, 0x0a0a1a, 0.95).setStrokeStyle(2, 0x44cc88);
    panel.add(bg);
    panel.add(this.add.text(0, -150, `🛒 ${npc.name} — 아이템 상점`, {
      fontSize: '18px', color: '#44cc88', fontFamily: 'monospace',
    }).setOrigin(0.5));

    const shopItems = [
      { name: '체력 포션 (소)', price: 50, desc: 'HP 100 회복' },
      { name: '체력 포션 (중)', price: 150, desc: 'HP 300 회복' },
      { name: '마나 포션 (소)', price: 80, desc: 'MP 80 회복' },
      { name: '해독제', price: 60, desc: '독 상태 해제' },
      { name: '귀환 스크롤', price: 200, desc: '마을로 귀환' },
    ];

    shopItems.forEach((item, i) => {
      const y = -80 + i * 40;
      panel.add(this.add.text(-200, y, item.name, {
        fontSize: '13px', color: '#ffffff', fontFamily: 'monospace',
      }));
      panel.add(this.add.text(100, y, `${item.price}G`, {
        fontSize: '13px', color: '#ffcc44', fontFamily: 'monospace',
      }));
      const buyBtn = this.add.text(180, y, '[구매]', {
        fontSize: '12px', color: '#88ff88', fontFamily: 'monospace',
      }).setInteractive({ useHandCursor: true });
      buyBtn.on('pointerdown', () => {
        playSfx(this, UI_SFX.GOLD_GAIN);
        this._showNotification(`${item.name}을(를) 구매했습니다!`);
      });
      panel.add(buyBtn);
    });

    const closeBtn = this.add.text(0, 140, '[ 닫기 ]', {
      fontSize: '14px', color: '#888888', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => panel.destroy());
    panel.add(closeBtn);
  }

  private _showEnhancePanel(npc: NpcEntry): void {
    const { width, height } = this.cameras.main;
    const panel = this.add.container(width / 2, height / 2);
    const bg = this.add.rectangle(0, 0, 450, 250, 0x0a0a1a, 0.95).setStrokeStyle(2, 0xff8844);
    panel.add(bg);
    panel.add(this.add.text(0, -90, `🔨 ${npc.name} — 장비 강화`, {
      fontSize: '18px', color: '#ff8844', fontFamily: 'monospace',
    }).setOrigin(0.5));
    panel.add(this.add.text(0, -30, '"장비를 가져오면 강화해주지.\n강화 재료와 골드가 필요하다."', {
      fontSize: '13px', color: '#cccccc', fontFamily: 'monospace',
      align: 'center',
    }).setOrigin(0.5));
    panel.add(this.add.text(0, 30, '장비를 선택하세요 (인벤토리에서 장비 보유 필요)', {
      fontSize: '11px', color: '#888888', fontFamily: 'monospace',
    }).setOrigin(0.5));
    const closeBtn = this.add.text(0, 90, '[ 닫기 ]', {
      fontSize: '14px', color: '#888888', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => panel.destroy());
    panel.add(closeBtn);
  }

  private _showPartyPanel(npc: NpcEntry): void {
    const { width, height } = this.cameras.main;
    const panel = this.add.container(width / 2, height / 2);
    const bg = this.add.rectangle(0, 0, 450, 250, 0x0a0a1a, 0.95).setStrokeStyle(2, 0x4488ff);
    panel.add(bg);
    panel.add(this.add.text(0, -90, `⚔️ ${npc.name} — 파티 모집`, {
      fontSize: '18px', color: '#4488ff', fontFamily: 'monospace',
    }).setOrigin(0.5));
    panel.add(this.add.text(0, -20, '"파티원을 모집하거나 참여할 수 있다.\n함께라면 더 강한 적도 쓰러뜨릴 수 있지."', {
      fontSize: '13px', color: '#cccccc', fontFamily: 'monospace',
      align: 'center',
    }).setOrigin(0.5));
    const createBtn = this.add.text(-80, 50, '[ 파티 생성 ]', {
      fontSize: '13px', color: '#88ff88', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    createBtn.on('pointerdown', () => { panel.destroy(); this._showNotification('파티를 생성했습니다!'); });
    panel.add(createBtn);
    const searchBtn = this.add.text(80, 50, '[ 파티 검색 ]', {
      fontSize: '13px', color: '#88ccff', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    searchBtn.on('pointerdown', () => { panel.destroy(); this._showNotification('현재 모집 중인 파티가 없습니다.'); });
    panel.add(searchBtn);
    const closeBtn = this.add.text(0, 90, '[ 닫기 ]', {
      fontSize: '14px', color: '#888888', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => panel.destroy());
    panel.add(closeBtn);
  }

  private _showStoryPanel(npc: NpcEntry): void {
    const { width, height } = this.cameras.main;
    const panel = this.add.container(width / 2, height / 2);
    const bg = this.add.rectangle(0, 0, 500, 300, 0x0a0a1a, 0.95).setStrokeStyle(2, 0xcc88ff);
    panel.add(bg);

    // P33-A: NPC 초상화 (마테우스)
    if (this.textures.exists('npc_portrait_mateus')) {
      panel.add(this.add.image(-200, -30, 'npc_portrait_mateus').setDisplaySize(80, 100));
    }

    panel.add(this.add.text(0, -120, `📖 ${npc.name} — 메인 스토리`, {
      fontSize: '18px', color: '#cc88ff', fontFamily: 'monospace',
    }).setOrigin(0.5));
    panel.add(this.add.text(20, -50, '"대망각이 세계를 덮친 지 212년...\n에리언이여, 기억의 파편을 찾아야 한다.\n에레보스의 폐허에서 첫 번째 단서가 기다리고 있다."', {
      fontSize: '12px', color: '#cccccc', fontFamily: 'monospace',
      align: 'center', wordWrap: { width: 440 },
    }).setOrigin(0.5));
    const startBtn = this.add.text(-80, 80, '[ 챕터 1 시작 ]', {
      fontSize: '13px', color: '#ffcc44', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    startBtn.on('pointerdown', () => {
      panel.destroy();
      this.scene.start('WorldScene', this.characterData);
    });
    panel.add(startBtn);
    const closeBtn = this.add.text(80, 80, '[ 닫기 ]', {
      fontSize: '14px', color: '#888888', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => panel.destroy());
    panel.add(closeBtn);
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
        .on('pointerdown', () => {
          playSfx(this, UI_SFX.CLICK);
          def.action();
        });
    }
  }

  // ── P25-04: 인벤토리 / 퀘스트 표시 ─────────────────────

  private async _showInventory(): Promise<void> {
    // 인벤토리는 userId 기반 — characterId가 아닌 userId로 조회
    const userId = networkManager.getUserId();
    if (!userId) {
      this._showNotification('로그인이 필요합니다.');
      return;
    }
    try {
      const items = await networkManager.getInventory(userId);
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
