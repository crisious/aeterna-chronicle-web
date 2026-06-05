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
import type { QuestData } from '../network/NetworkManager';
import { mergeActiveQuestStatus } from '../network/questTransforms';
import { playSfx, UI_SFX, NPC_VOICE } from '../utils/SFXHelper';
import { SkillTreeUI, type ClassId } from '../ui/SkillTreeUI';
import { isUiModalOpen } from '../accessibility/uiModalLock';

// ── 타입 ────────────────────────────────────────────────────

export interface LobbySceneData {
  characterId?: string;
  characterName: string;
  characterClass: string;
  className: string;
  baseStats: { hp: number; mp: number; atk: number; def: number };
  level?: number;
  offlineQa?: boolean;
}

interface NpcEntry {
  id: string;
  name: string;
  role: string;
  x: number;
  y: number;
  color: number;
}

type QuestPanelSource = 'server' | 'local';

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

const QUEST_STATUS_STYLE: Record<QuestData['status'], { label: string; color: string }> = {
  available: { label: '수주 가능', color: '#88ff88' },
  active: { label: '진행중', color: '#ffcc44' },
  complete: { label: '완료 가능', color: '#88ccff' },
  turned_in: { label: '완료됨', color: '#888888' },
};

// 보드는 앞 4개만 노출하므로(slice), actionable(진행중·완료가능·수주가능)을 완료됨보다 먼저
// 정렬해 이미 끝낸 퀘스트가 수주 가능 퀘스트를 가리지 않게 한다.
const QUEST_STATUS_ORDER: Record<QuestData['status'], number> = {
  active: 0,
  complete: 1,
  available: 2,
  turned_in: 3,
};

const FALLBACK_QUESTS: QuestData[] = [
  {
    id: 'chrono_echoes',
    name: '시간의 잔향',
    description: '기억의 게시판에 남은 시간 파편을 조사한다.',
    status: 'available',
    objectives: [{ desc: '기억의 게시판 조사', current: 0, target: 1 }],
    rewards: { exp: 120, gold: 80, items: ['시간 파편'] },
  },
  {
    id: 'forest_clockwork',
    name: '숲의 시계장치',
    description: '실반헤임 숲에 나타난 시간 왜곡 몬스터를 추적한다.',
    status: 'active',
    objectives: [{ desc: '시간 왜곡 흔적 수집', current: 2, target: 5 }],
    rewards: { exp: 240, gold: 150 },
  },
  {
    id: 'ruined_future_signal',
    name: '붕괴미래의 신호',
    description: '미래 시대에서 전송된 구조 신호의 좌표를 복원한다.',
    status: 'complete',
    objectives: [{ desc: '좌표 복원', current: 3, target: 3 }],
    rewards: { exp: 360, gold: 220, items: ['공명 코어'] },
  },
];

// ── LobbyScene ──────────────────────────────────────────────

export class LobbyScene extends Phaser.Scene {
  private characterData!: LobbySceneData;
  private npcSprites: Phaser.GameObjects.Container[] = [];
  private dialoguePanel: Phaser.GameObjects.Container | null = null;

  // FINDING-A4 ext5: 하단 nav 버튼 키보드 nav state
  private navButtonItems: Array<{ text: Phaser.GameObjects.Text; action: () => void; label: string }> = [];
  private navIndex = 0;
  private _lobbyKeyboardCleanup: (() => void) | null = null;

  // FINDING-A4 ext7: NPC sprite 키보드 nav state
  // focusGroup: 'nav' = 하단 버튼 활성 / 'npc' = NPC 활성
  // ArrowLeft/Right → group='nav', ArrowUp/Down → group='npc' 자동 전환
  private focusGroup: 'nav' | 'npc' = 'nav';
  private npcIndex = 0;
  private skillTreeUI?: SkillTreeUI; // 스킬 트리 패널(지연 생성). uiModalLock 사용.
  private npcHighlightRing: Phaser.GameObjects.Arc | null = null;
  private minimapContainer!: Phaser.GameObjects.Container;
  private connectionIndicator!: Phaser.GameObjects.Text;
  private goldText!: Phaser.GameObjects.Text;

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
      fontSize: '10px', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace', color: '#44cc44',
    }).setOrigin(1, 1);

    this._connectToServer();

    SceneManager.fadeIn(this, 300);
  }

  // ── P25-03: 서버 연결 ───────────────────────────────────

  private _connectToServer(): void {
    if (this.characterData?.offlineQa) {
      this.connectionIndicator.setText('● 로컬 QA').setColor('#ffcc44');
      return;
    }

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
      fontSize: '13px', color: '#ffcc44', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
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
      fontSize: '20px', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace', color: '#88cc88',
    }).setOrigin(0.5);
  }

  private _drawHud(w: number): void {
    const name = this.characterData?.characterName ?? '???';
    const cls = this.characterData?.className ?? '???';
    const lv = this.characterData?.level ?? 1;

    this.add.text(12, 12, `${name} [${cls}] Lv.${lv}`, {
      fontSize: '14px', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace', color: '#ffffff',
      backgroundColor: '#00000088', padding: { x: 8, y: 4 },
    });

    this.goldText = this.add.text(w - 12, 12, '💰 --- Gold', {
      fontSize: '13px', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace', color: '#ffcc44',
    }).setOrigin(1, 0);

    // 서버에서 실제 골드 조회
    if (this.characterData?.offlineQa) {
      this.goldText.setText('💰 999 Gold');
      return;
    }
    this._fetchGold();
  }

  private async _fetchGold(): Promise<void> {
    try {
      const res = await networkManager.get('/api/characters');
      const chars = (res as any)?.characters ?? res;
      const char = Array.isArray(chars)
        ? chars.find((c: any) => c.id === this.characterData?.characterId) ?? chars[0]
        : null;
      const gold = char?.gold ?? char?.currency ?? 0;
      if (this.goldText) this.goldText.setText(`💰 ${gold.toLocaleString()} Gold`);
    } catch {
      if (this.goldText) this.goldText.setText('💰 --- Gold');
    }
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
          .setScale(0.15)
          .setInteractive({ useHandCursor: true });
      } else {
        body = this.add.circle(0, 0, 20, npc.color)
          .setInteractive({ useHandCursor: true });
      }
      const label = this.add.text(0, -32, npc.name, {
        fontSize: '12px', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace', color: '#ffffff',
        backgroundColor: '#00000088', padding: { x: 4, y: 2 },
      }).setOrigin(0.5);
      const roleTag = this.add.text(0, 28, npc.role, {
        fontSize: '10px', color: '#aaaaaa', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
      }).setOrigin(0.5);

      container.add([body, label, roleTag]);
      this.npcSprites.push(container);

      body.on('pointerdown', () => {
        if (this.dialoguePanel || isUiModalOpen()) return; // 모달 떠 있으면 NPC 대화 중복 개방 차단
        playSfx(this, UI_SFX.CLICK);
        this._openNpcDialogue(npc);
      });
      const baseScaleX = body.scaleX;
      const baseScaleY = body.scaleY;
      body.on('pointerover', () => {
        body.setScale(baseScaleX * 1.15, baseScaleY * 1.15);
        playSfx(this, UI_SFX.HOVER);
        // FINDING-A4 ext7: pointer hover ↔ NPC 키보드 highlight 동기화
        const idx = TOWN_NPCS.findIndex(n => n.id === npc.id);
        if (idx >= 0) {
          this.focusGroup = 'npc';
          this._setNpcIndex(idx);
        }
      });
      body.on('pointerout', () => body.setScale(baseScaleX, baseScaleY));
    }
  }

  // FINDING-A4 ext8 helper: 모든 모달 패널이 ESC 로 닫히도록 dialoguePanel 추적 통일
  // panel.destroy() 만 호출하면 자동 null 처리 → onEsc 가 패널 닫기로 동작
  private _registerModalPanel(panel: Phaser.GameObjects.Container): void {
    this.dialoguePanel = panel;
    panel.on('destroy', () => {
      if (this.dialoguePanel === panel) this.dialoguePanel = null;
    });
  }

  // 인라인 모달 패널용 키보드 nav 공통 헬퍼 — 검증된 대화 패널 패턴(▶highlight + 방향키 + ENTER)을
  // 일반화한다. focusables 를 위→아래 순서로 UP/DOWN 이동, ENTER/SPACE 로 activate.
  // 모달 열림 동안 글로벌 로비 nav 는 dialoguePanel 가드로 이미 양보하므로 충돌하지 않으며
  // (ESC 닫기도 글로벌 onEsc 가 담당), 패널 destroy 시 키 핸들러를 자동 정리한다.
  // 오펀 KeyboardFocusRing 클래스(InventoryUI/ShopUI 등)를 되살리는 대신, 실제 도달 가능한
  // 인라인 패널에 직접 키보드를 입히는 경로(회귀 위험 최소).
  private _attachPanelKeyboardNav(
    panel: Phaser.GameObjects.Container,
    focusables: Array<{ setFocused: (active: boolean) => void; activate: () => void }>,
  ): void {
    if (focusables.length === 0) return;
    let idx = 0;
    const sync = () => focusables.forEach((f, i) => f.setFocused(i === idx));
    sync();
    // 상위 uiModal(스킬트리 등 KeyboardFocusRing)이 떠 있으면 하위 인라인 패널 키 입력을 양보 — 이중발화 방지.
    const move = (delta: number) => {
      if (isUiModalOpen()) return;
      idx = (idx + delta + focusables.length) % focusables.length;
      sync();
    };
    const onPrev = () => move(-1);
    const onNext = () => move(1);
    const onActivate = () => { if (isUiModalOpen()) return; focusables[idx]?.activate(); };
    // 세로 리스트(상점·인벤토리)·가로 버튼 쌍(파티·스토리) 모두 자연스럽게 — 4방향 화살표 모두 이동에 바인딩.
    this.input.keyboard?.on('keydown-UP', onPrev);
    this.input.keyboard?.on('keydown-LEFT', onPrev);
    this.input.keyboard?.on('keydown-DOWN', onNext);
    this.input.keyboard?.on('keydown-RIGHT', onNext);
    this.input.keyboard?.on('keydown-ENTER', onActivate);
    this.input.keyboard?.on('keydown-SPACE', onActivate);
    panel.on('destroy', () => {
      this.input.keyboard?.off('keydown-UP', onPrev);
      this.input.keyboard?.off('keydown-LEFT', onPrev);
      this.input.keyboard?.off('keydown-DOWN', onNext);
      this.input.keyboard?.off('keydown-RIGHT', onNext);
      this.input.keyboard?.off('keydown-ENTER', onActivate);
      this.input.keyboard?.off('keydown-SPACE', onActivate);
    });
  }

  // FINDING-A4 ext7: NPC 키보드 highlight ring 동기화
  private _setNpcIndex(i: number): void {
    if (TOWN_NPCS[i] === undefined) return;
    this.npcIndex = i;
    const npc = TOWN_NPCS[i];
    if (!this.npcHighlightRing) {
      this.npcHighlightRing = this.add.circle(npc.x, npc.y, 32)
        .setStrokeStyle(3, 0xc8a2ff)
        .setFillStyle(0x000000, 0)
        .setDepth(50);
    } else {
      this.npcHighlightRing.setPosition(npc.x, npc.y);
      this.npcHighlightRing.setVisible(true);
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
      panel.add(this.add.image(-160, 0, npcPortraitKey).setScale(0.25));
    }

    panel.add(this.add.text(0, -70, `💬 ${npc.name}`, {
      fontSize: '16px', color: '#ffffff', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    }).setOrigin(0.5));

    panel.add(this.add.text(0, -20, `"어서 와, 모험가. 내 ${npc.role} 서비스가 필요한가?"`, {
      fontSize: '13px', color: '#cccccc', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
      wordWrap: { width: 380 }, align: 'center',
    }).setOrigin(0.5));

    const acceptBtn = this.add.text(-60, 50, '[ 이용하기 ]', {
      fontSize: '14px', color: '#88ff88', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    panel.add(acceptBtn);

    const closeBtn = this.add.text(60, 50, '[ 닫기 ]', {
      fontSize: '14px', color: '#888888', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    panel.add(closeBtn);

    // FINDING-A4 ext8: 다이얼로그 패널 키보드 nav (WCAG 2.1.1)
    // 0 = 이용하기 / 1 = 닫기. 첫 highlight = 이용하기(default action)
    let dialogueIndex = 0;
    const renderDialogueChoice = () => {
      acceptBtn.setText(dialogueIndex === 0 ? '▶ [ 이용하기 ]' : '   [ 이용하기 ]');
      acceptBtn.setColor(dialogueIndex === 0 ? '#ffffff' : '#88ff88');
      closeBtn.setText(dialogueIndex === 1 ? '▶ [ 닫기 ]' : '   [ 닫기 ]');
      closeBtn.setColor(dialogueIndex === 1 ? '#ffffff' : '#888888');
    };
    renderDialogueChoice();

    const doAccept = () => {
      playSfx(this, UI_SFX.CONFIRM);
      panel.destroy(); // _registerModalPanel destroy hook 가 dialoguePanel = null 자동 처리
      this._executeNpcAction(npc);
    };
    const doClose = () => {
      playSfx(this, UI_SFX.CANCEL);
      panel.destroy(); // 동일 — register hook 자동 처리
    };

    acceptBtn.on('pointerover', () => { dialogueIndex = 0; renderDialogueChoice(); });
    acceptBtn.on('pointerdown', doAccept);
    closeBtn.on('pointerover', () => { dialogueIndex = 1; renderDialogueChoice(); });
    closeBtn.on('pointerdown', doClose);

    // 상위 uiModal 떠 있으면 양보(심층 방어 — 마우스 진입 가드와 상호 보완).
    const onDialogLeft = () => { if (isUiModalOpen()) return; dialogueIndex = 0; renderDialogueChoice(); };
    const onDialogRight = () => { if (isUiModalOpen()) return; dialogueIndex = 1; renderDialogueChoice(); };
    const onDialogActivate = () => { if (isUiModalOpen()) return; dialogueIndex === 0 ? doAccept() : doClose(); };

    this.input.keyboard?.on('keydown-LEFT', onDialogLeft);
    this.input.keyboard?.on('keydown-RIGHT', onDialogRight);
    this.input.keyboard?.on('keydown-ENTER', onDialogActivate);
    this.input.keyboard?.on('keydown-SPACE', onDialogActivate);

    panel.on('destroy', () => {
      this.input.keyboard?.off('keydown-LEFT', onDialogLeft);
      this.input.keyboard?.off('keydown-RIGHT', onDialogRight);
      this.input.keyboard?.off('keydown-ENTER', onDialogActivate);
      this.input.keyboard?.off('keydown-SPACE', onDialogActivate);
    });

    // P34-A: NPC 인사 보이스
    const voiceKey = NPC_VOICE[npc.id];
    if (voiceKey) playSfx(this, voiceKey, 0.7);

    playSfx(this, UI_SFX.OPEN);

    // FINDING-A4 ext20: _registerModalPanel 패턴 통일 (다른 5 모달과 일관)
    // 기존 doAccept/doClose 의 panel.destroy() → register hook 으로 자동 dialoguePanel null
    this._registerModalPanel(panel);
  }

  // ── NPC 액션 실행 ────────────────────────────────────────

  private _executeNpcAction(npc: NpcEntry): void {
    switch (npc.id) {
      case 'merchant':
        this._showNotification(`🛒 ${npc.name}: 상점을 열었습니다. (아이템 ${80}종 판매 중)`);
        // P38: 인라인 ShopPanel 사용 중 (독립 ShopUI 분리는 후속 리팩터링)
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
    this._registerModalPanel(panel);
    const bg = this.add.rectangle(0, 0, 500, 350, 0x0a0a1a, 0.95).setStrokeStyle(2, 0x44cc88);
    panel.add(bg);
    panel.add(this.add.text(0, -150, `🛒 ${npc.name} — 아이템 상점`, {
      fontSize: '18px', color: '#44cc88', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    }).setOrigin(0.5));

    const shopItems = [
      { name: '체력 포션 (소)', price: 50, desc: 'HP 100 회복' },
      { name: '체력 포션 (중)', price: 150, desc: 'HP 300 회복' },
      { name: '마나 포션 (소)', price: 80, desc: 'MP 80 회복' },
      { name: '해독제', price: 60, desc: '독 상태 해제' },
      { name: '귀환 스크롤', price: 200, desc: '마을로 귀환' },
    ];

    // 마우스(pointerdown)와 키보드(ENTER)가 공유하는 구매 동작
    const buy = async (item: { name: string; price: number; desc: string }): Promise<void> => {
      try {
        // 서버 상점 API로 구매 요청
        const shopItems_res = await networkManager.get('/api/shop/items') as any;
        const serverItem = (shopItems_res?.items ?? shopItems_res ?? [])
          .find((si: any) => si.name === item.name);
        // 서버 상점에 해당 아이템이 없으면 purchase 가 호출되지 않으므로 거짓 '구매 성공' 표시 금지.
        if (!serverItem) {
          this._showNotification(`구매 불가: 상점에서 ${item.name}을(를) 찾을 수 없습니다.`);
          playSfx(this, UI_SFX.CLICK);
          return;
        }
        await networkManager.post('/api/shop/purchase', {
          userId: this.characterData?.characterId,
          itemId: serverItem.id,
        });
        playSfx(this, UI_SFX.GOLD_GAIN);
        this._showNotification(`${item.name}을(를) 구매했습니다!`);
        this._fetchGold(); // 골드 갱신
      } catch (err: any) {
        const msg = err?.message ?? '구매 실패';
        if (msg.includes('잔액')) {
          this._showNotification('골드가 부족합니다!');
        } else {
          this._showNotification(`구매 실패: ${msg}`);
        }
        playSfx(this, UI_SFX.CLICK);
      }
    };

    // 키보드 포커스 링: [구매]×5 + [닫기]
    const focusables: Array<{ setFocused: (active: boolean) => void; activate: () => void }> = [];

    shopItems.forEach((item, i) => {
      const y = -80 + i * 40;
      panel.add(this.add.text(-200, y, item.name, {
        fontSize: '13px', color: '#ffffff', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
      }));
      panel.add(this.add.text(100, y, `${item.price}G`, {
        fontSize: '13px', color: '#ffcc44', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
      }));
      const buyBtn = this.add.text(180, y, '[구매]', {
        fontSize: '12px', color: '#88ff88', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
      }).setInteractive({ useHandCursor: true });
      buyBtn.on('pointerdown', () => void buy(item));
      panel.add(buyBtn);
      focusables.push({
        setFocused: (a) => { buyBtn.setText(a ? '▶[구매]' : '[구매]'); buyBtn.setColor(a ? '#ffffff' : '#88ff88'); },
        activate: () => void buy(item),
      });
    });

    const closeBtn = this.add.text(0, 140, '[ 닫기 ]', {
      fontSize: '14px', color: '#888888', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => panel.destroy());
    panel.add(closeBtn);
    focusables.push({
      setFocused: (a) => { closeBtn.setText(a ? '▶ [ 닫기 ]' : '[ 닫기 ]'); closeBtn.setColor(a ? '#ffffff' : '#888888'); },
      activate: () => panel.destroy(),
    });

    this._attachPanelKeyboardNav(panel, focusables);
  }

  private _showEnhancePanel(npc: NpcEntry): void {
    const { width, height } = this.cameras.main;
    const panel = this.add.container(width / 2, height / 2);
    this._registerModalPanel(panel);
    const bg = this.add.rectangle(0, 0, 450, 250, 0x0a0a1a, 0.95).setStrokeStyle(2, 0xff8844);
    panel.add(bg);
    panel.add(this.add.text(0, -90, `🔨 ${npc.name} — 장비 강화`, {
      fontSize: '18px', color: '#ff8844', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    }).setOrigin(0.5));
    panel.add(this.add.text(0, -30, '"장비를 가져오면 강화해주지.\n강화 재료와 골드가 필요하다."', {
      fontSize: '13px', color: '#cccccc', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
      align: 'center',
    }).setOrigin(0.5));
    panel.add(this.add.text(0, 30, '장비를 선택하세요 (인벤토리에서 장비 보유 필요)', {
      fontSize: '11px', color: '#888888', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    }).setOrigin(0.5));
    const closeBtn = this.add.text(0, 90, '[ 닫기 ]', {
      fontSize: '14px', color: '#888888', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => panel.destroy());
    panel.add(closeBtn);
    this._attachPanelKeyboardNav(panel, [{
      setFocused: (a) => { closeBtn.setText(a ? '▶ [ 닫기 ]' : '[ 닫기 ]'); closeBtn.setColor(a ? '#ffffff' : '#888888'); },
      activate: () => panel.destroy(),
    }]);
  }

  private _showPartyPanel(npc: NpcEntry): void {
    const { width, height } = this.cameras.main;
    const panel = this.add.container(width / 2, height / 2);
    this._registerModalPanel(panel);
    const bg = this.add.rectangle(0, 0, 450, 250, 0x0a0a1a, 0.95).setStrokeStyle(2, 0x4488ff);
    panel.add(bg);
    panel.add(this.add.text(0, -90, `⚔️ ${npc.name} — 파티 모집`, {
      fontSize: '18px', color: '#4488ff', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    }).setOrigin(0.5));
    panel.add(this.add.text(0, -20, '"파티원을 모집하거나 참여할 수 있다.\n함께라면 더 강한 적도 쓰러뜨릴 수 있지."', {
      fontSize: '13px', color: '#cccccc', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
      align: 'center',
    }).setOrigin(0.5));
    const doCreate = () => { panel.destroy(); this._showNotification('파티를 생성했습니다!'); };
    const createBtn = this.add.text(-80, 50, '[ 파티 생성 ]', {
      fontSize: '13px', color: '#88ff88', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    createBtn.on('pointerdown', doCreate);
    panel.add(createBtn);
    const doSearch = () => { panel.destroy(); this._showNotification('현재 모집 중인 파티가 없습니다.'); };
    const searchBtn = this.add.text(80, 50, '[ 파티 검색 ]', {
      fontSize: '13px', color: '#88ccff', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    searchBtn.on('pointerdown', doSearch);
    panel.add(searchBtn);
    const closeBtn = this.add.text(0, 90, '[ 닫기 ]', {
      fontSize: '14px', color: '#888888', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => panel.destroy());
    panel.add(closeBtn);
    this._attachPanelKeyboardNav(panel, [
      { setFocused: (a) => { createBtn.setText(a ? '▶ [ 파티 생성 ]' : '[ 파티 생성 ]'); createBtn.setColor(a ? '#ffffff' : '#88ff88'); }, activate: doCreate },
      { setFocused: (a) => { searchBtn.setText(a ? '▶ [ 파티 검색 ]' : '[ 파티 검색 ]'); searchBtn.setColor(a ? '#ffffff' : '#88ccff'); }, activate: doSearch },
      { setFocused: (a) => { closeBtn.setText(a ? '▶ [ 닫기 ]' : '[ 닫기 ]'); closeBtn.setColor(a ? '#ffffff' : '#888888'); }, activate: () => panel.destroy() },
    ]);
  }

  private _showStoryPanel(npc: NpcEntry): void {
    const { width, height } = this.cameras.main;
    const panel = this.add.container(width / 2, height / 2);
    this._registerModalPanel(panel);
    const bg = this.add.rectangle(0, 0, 500, 300, 0x0a0a1a, 0.95).setStrokeStyle(2, 0xcc88ff);
    panel.add(bg);

    // P33-A: NPC 초상화 (마테우스)
    if (this.textures.exists('npc_portrait_mateus')) {
      panel.add(this.add.image(-200, -30, 'npc_portrait_mateus').setScale(0.25));
    }

    panel.add(this.add.text(0, -120, `📖 ${npc.name} — 메인 스토리`, {
      fontSize: '18px', color: '#cc88ff', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    }).setOrigin(0.5));
    panel.add(this.add.text(20, -50, '"대망각이 세계를 덮친 지 212년...\n에리언이여, 기억의 파편을 찾아야 한다.\n에레보스의 폐허에서 첫 번째 단서가 기다리고 있다."', {
      fontSize: '12px', color: '#cccccc', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
      align: 'center', wordWrap: { width: 440 },
    }).setOrigin(0.5));
    const doStart = () => {
      panel.destroy();
      this.scene.start('WorldScene', this.characterData);
    };
    const startBtn = this.add.text(-80, 80, '[ 챕터 1 시작 ]', {
      fontSize: '13px', color: '#ffcc44', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    startBtn.on('pointerdown', doStart);
    panel.add(startBtn);
    const closeBtn = this.add.text(80, 80, '[ 닫기 ]', {
      fontSize: '14px', color: '#888888', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => panel.destroy());
    panel.add(closeBtn);
    this._attachPanelKeyboardNav(panel, [
      { setFocused: (a) => { startBtn.setText(a ? '▶ [ 챕터 1 시작 ]' : '[ 챕터 1 시작 ]'); startBtn.setColor(a ? '#ffffff' : '#ffcc44'); }, activate: doStart },
      { setFocused: (a) => { closeBtn.setText(a ? '▶ [ 닫기 ]' : '[ 닫기 ]'); closeBtn.setColor(a ? '#ffffff' : '#888888'); }, activate: () => panel.destroy() },
    ]);
  }

  // ── 하단 네비게이션 ──────────────────────────────────────

  private _drawNavButtons(w: number, h: number): void {
    const btnY = h - 40;
    // 5개 균등 배치 (i+1)/6
    const buttons = [
      { label: '🗺️ 월드맵', x: w / 6, action: () => this.scene.start('WorldScene', this.characterData) },
      { label: '⚔️ 던전', x: (w * 2) / 6, action: () => this.scene.start('DungeonScene', this.characterData) },
      { label: '🎒 인벤토리', x: (w * 3) / 6, action: () => this._showInventory() },
      { label: '🌳 스킬', x: (w * 4) / 6, action: () => void this._openSkillTree() },
      { label: '📜 퀘스트', x: (w * 5) / 6, action: () => this._showQuests() },
    ];

    this.navButtonItems = [];

    buttons.forEach((def, i) => {
      const t = this.add.text(def.x, btnY, def.label, {
        fontSize: '14px', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace', color: '#cccccc',
        backgroundColor: '#1a1a2e', padding: { x: 10, y: 5 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true })
        .on('pointerover', () => this._setNavIndex(i))
        .on('pointerdown', () => {
          // 키보드 onActivate 와 동일 가드 — 모달/패널이 떠 있으면 마우스로 두 번째 표면을 열지 않음.
          if (this.dialoguePanel || isUiModalOpen()) return;
          playSfx(this, UI_SFX.CLICK);
          def.action();
        });
      this.navButtonItems.push({ text: t, action: def.action, label: def.label });
    });

    // FINDING-A4 ext5: 메인 nav 버튼 키보드 navigation (WCAG 2.1.1)
    if (this.navButtonItems.length > 0) {
      this.navIndex = 0;
      this._renderNavButton(0);
    }

    const len = this.navButtonItems.length;
    const onLeft = () => {
      if (this.dialoguePanel || isUiModalOpen()) return; // FINDING-A4 ext8: 다이얼로그 모달 모드 — handler 양보
      if (len === 0) return;
      this.focusGroup = 'nav';
      if (this.npcHighlightRing) this.npcHighlightRing.setVisible(false);
      this._setNavIndex((this.navIndex + len - 1) % len);
    };
    const onRight = () => {
      if (this.dialoguePanel || isUiModalOpen()) return;
      if (len === 0) return;
      this.focusGroup = 'nav';
      if (this.npcHighlightRing) this.npcHighlightRing.setVisible(false);
      this._setNavIndex((this.navIndex + 1) % len);
    };
    // FINDING-A4 ext7: ArrowUp/Down → NPC group 활성 + cycle
    const onUp = () => {
      if (this.dialoguePanel || isUiModalOpen()) return;
      if (TOWN_NPCS.length === 0) return;
      this.focusGroup = 'npc';
      this._setNpcIndex((this.npcIndex + TOWN_NPCS.length - 1) % TOWN_NPCS.length);
    };
    const onDown = () => {
      if (this.dialoguePanel || isUiModalOpen()) return;
      if (TOWN_NPCS.length === 0) return;
      this.focusGroup = 'npc';
      this._setNpcIndex((this.npcIndex + 1) % TOWN_NPCS.length);
    };
    const onActivate = () => {
      if (this.dialoguePanel || isUiModalOpen()) return; // 다이얼로그 자체 handler 가 처리
      // FINDING-A4 ext7: focus group 별 activate 분기
      if (this.focusGroup === 'npc') {
        const npc = TOWN_NPCS[this.npcIndex];
        if (npc) {
          playSfx(this, UI_SFX.CLICK);
          this._openNpcDialogue(npc);
        }
      } else {
        const item = this.navButtonItems[this.navIndex];
        if (item) {
          playSfx(this, UI_SFX.CLICK);
          item.action();
        }
      }
    };
    const onEsc = () => {
      if (isUiModalOpen()) return; // 스킬 트리 등 uiModal 은 자체 ESC(bindEscClose)가 처리
      // 다이얼로그 패널 열려있으면 닫기, 아니면 캐릭터 선택 복귀
      if (this.dialoguePanel) {
        this.dialoguePanel.destroy();
        this.dialoguePanel = null;
      } else {
        this.scene.start('CharacterSelectScene');
      }
    };

    this.input.keyboard?.on('keydown-LEFT', onLeft);
    this.input.keyboard?.on('keydown-RIGHT', onRight);
    this.input.keyboard?.on('keydown-UP', onUp);
    this.input.keyboard?.on('keydown-DOWN', onDown);
    this.input.keyboard?.on('keydown-ENTER', onActivate);
    this.input.keyboard?.on('keydown-SPACE', onActivate);
    this.input.keyboard?.on('keydown-ESC', onEsc);

    this._lobbyKeyboardCleanup = () => {
      this.input.keyboard?.off('keydown-LEFT', onLeft);
      this.input.keyboard?.off('keydown-RIGHT', onRight);
      this.input.keyboard?.off('keydown-UP', onUp);
      this.input.keyboard?.off('keydown-DOWN', onDown);
      this.input.keyboard?.off('keydown-ENTER', onActivate);
      this.input.keyboard?.off('keydown-SPACE', onActivate);
      this.input.keyboard?.off('keydown-ESC', onEsc);
    };
  }

  // FINDING-A4 ext5: nav 버튼 highlight 동기화 + 라벨 ▶ prefix
  private _setNavIndex(i: number): void {
    if (i === this.navIndex || !this.navButtonItems[i]) return;
    const oldI = this.navIndex;
    this.navIndex = i;
    this._renderNavButton(oldI);
    this._renderNavButton(i);
  }

  private _renderNavButton(i: number): void {
    const item = this.navButtonItems[i];
    if (!item) return;
    const isActive = i === this.navIndex;
    item.text.setText(isActive ? `▶ ${item.label}` : item.label);
    item.text.setColor(isActive ? '#ffffff' : '#cccccc');
  }

  // ── P25-04: 인벤토리 / 퀘스트 표시 ─────────────────────

  // ── 스킬 트리 (SkillTreeUI 패널 — 서버 API 연동, 전키보드) ──
  private async _openSkillTree(): Promise<void> {
    const userId = networkManager.getUserId() ?? this.characterData?.characterId;
    if (!userId) { this._showNotification('로그인이 필요합니다.'); return; }
    // characterClass → ClassId (6 클래스 검증, 아니면 fallback)
    const VALID: ClassId[] = ['ether_knight', 'memory_weaver', 'shadow_weaver', 'memory_breaker', 'time_guardian', 'void_wanderer'];
    const raw = this.characterData?.characterClass ?? '';
    const classId: ClassId = (VALID as string[]).includes(raw) ? (raw as ClassId) : 'ether_knight';
    const level = this.characterData?.level ?? 1;
    // 잔여 스킬 포인트 fetch (실패 시 0)
    let points = 0;
    try {
      // 서버 응답 필드는 remainingPoints. characterLevel 쿼리로 총 포인트 계산(미전달 시 서버 기본 1).
      const resp = await networkManager.get<{ remainingPoints?: number }>(`/api/skills/points/${userId}?characterLevel=${level}`);
      points = resp?.remainingPoints ?? 0;
    } catch { /* fallback 0 */ }
    if (!this.skillTreeUI) {
      this.skillTreeUI = new SkillTreeUI(this, networkManager);
      // 씬 종료 시 모달락(uiModalLock) 누수 방지 — 열려 있으면 닫는다.
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.skillTreeUI?.close());
    }
    void this.skillTreeUI.open(userId, classId, level, points);
  }

  private async _showInventory(): Promise<void> {
    const userId = networkManager.getUserId();
    if (!userId) {
      this._showNotification('로그인이 필요합니다.');
      return;
    }
    try {
      const items = await networkManager.getInventory(userId);
      console.log('[Lobby] 인벤토리:', items);
      this._showInventoryPanel(items);
    } catch {
      this._showNotification('인벤토리 로드 실패');
    }
  }

  private _showInventoryPanel(items: any[]): void {
    // 기존 패널 제거
    if (this.dialoguePanel) {
      this.dialoguePanel.destroy();
      this.dialoguePanel = null;
    }

    const { width, height } = this.cameras.main;
    const panel = this.add.container(width / 2, height / 2);
    this._registerModalPanel(panel);

    // 키보드 포커스 링: 아이템 행(읽기 전용 highlight) + [닫기]
    const focusables: Array<{ setFocused: (active: boolean) => void; activate: () => void }> = [];

    const panelH = Math.min(400, 120 + items.length * 36);
    const bg = this.add.rectangle(0, 0, 520, panelH, 0x0a0a1a, 0.95)
      .setStrokeStyle(2, 0xcc8844);
    panel.add(bg);

    panel.add(this.add.text(0, -panelH / 2 + 20, `🎒 인벤토리 (${items.length}개)`, {
      fontSize: '18px', color: '#cc8844', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    }).setOrigin(0.5));

    if (items.length === 0) {
      panel.add(this.add.text(0, 0, '아이템이 없습니다.', {
        fontSize: '13px', color: '#888888', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
      }).setOrigin(0.5));
    } else {
      // 헤더
      const headerY = -panelH / 2 + 50;
      panel.add(this.add.text(-220, headerY, '아이템', {
        fontSize: '11px', color: '#888888', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
      }));
      panel.add(this.add.text(80, headerY, '수량', {
        fontSize: '11px', color: '#888888', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
      }));
      panel.add(this.add.text(160, headerY, '상태', {
        fontSize: '11px', color: '#888888', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
      }));

      items.forEach((item: any, i: number) => {
        if (i >= 8) return; // 최대 8개 표시
        const y = headerY + 30 + i * 36;
        const itemName = item.name ?? item.item?.name ?? item.itemCode ?? item.itemId ?? '???';
        const qty = item.quantity ?? 1;
        const equipped = item.isEquipped ? '장착중' : '';
        const rarity = item.rarity ?? item.item?.rarity ?? '';

        // 등급별 색상
        const rarityColors: Record<string, string> = {
          common: '#cccccc', uncommon: '#44cc44', rare: '#4488ff',
          epic: '#aa44ff', legendary: '#ffaa00', mythic: '#ff4444',
        };
        const nameColor = rarityColors[rarity] ?? '#ffffff';

        const nameText = this.add.text(-220, y, itemName, {
          fontSize: '13px', color: nameColor, fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
        });
        panel.add(nameText);
        // 인라인 인벤토리는 아이템 액션이 없으므로(마우스도 동일) 행은 읽기 전용 highlight 만 — 액션 no-op.
        focusables.push({
          setFocused: (a) => nameText.setText(a ? `▶ ${itemName}` : itemName),
          activate: () => { /* 아이템 액션 없음 */ },
        });
        panel.add(this.add.text(80, y, `×${qty}`, {
          fontSize: '13px', color: '#ffcc44', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
        }));
        if (equipped) {
          panel.add(this.add.text(160, y, equipped, {
            fontSize: '11px', color: '#88ff88', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
          }));
        }
      });

      if (items.length > 8) {
        panel.add(this.add.text(0, headerY + 30 + 8 * 36, `... 외 ${items.length - 8}개`, {
          fontSize: '11px', color: '#666666', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
        }).setOrigin(0.5));
      }
    }

    const closeBtn = this.add.text(0, panelH / 2 - 25, '[ 닫기 ]', {
      fontSize: '14px', color: '#888888', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    const doClose = () => {
      playSfx(this, UI_SFX.CANCEL);
      panel.destroy(); // _registerModalPanel destroy hook 가 dialoguePanel = null 처리
    };
    closeBtn.on('pointerdown', doClose);
    panel.add(closeBtn);
    focusables.push({
      setFocused: (a) => { closeBtn.setText(a ? '▶ [ 닫기 ]' : '[ 닫기 ]'); closeBtn.setColor(a ? '#ffffff' : '#888888'); },
      activate: doClose,
    });

    this._attachPanelKeyboardNav(panel, focusables);
  }

  private async _showQuests(): Promise<void> {
    if (this.characterData?.offlineQa) {
      this._showQuestPanel(FALLBACK_QUESTS, 'local');
      this._showNotification('로컬 QA 퀘스트를 표시합니다.');
      return;
    }

    const characterId = this.characterData?.characterId;
    if (!characterId) {
      this._showQuestPanel(FALLBACK_QUESTS, 'local');
      this._showNotification('캐릭터 ID가 없어 로컬 퀘스트를 표시합니다.');
      return;
    }

    try {
      // 카탈로그(수주 가능)에 진행 중(active) + 완료(turned_in) 상태를 오버레이 →
      // 수주한 퀘스트는 '진행중'+실 진행도, 이미 끝낸 퀘스트는 '완료됨'(다시 [수주] 안 뜸).
      const [catalog, active, completedIds] = await Promise.all([
        networkManager.getQuests(characterId),
        networkManager.getActiveQuests().catch(() => []),
        networkManager.getCompletedQuestIds().catch(() => []),
      ]);
      const quests = mergeActiveQuestStatus(catalog, active, completedIds);
      this._showQuestPanel(quests, 'server');
      this._showNotification(`퀘스트: ${quests.length}개 표시`);
    } catch {
      this._showQuestPanel(FALLBACK_QUESTS, 'local');
      this._showNotification('서버 연결 없음: 로컬 퀘스트를 표시합니다.');
    }
  }

  private _showQuestPanel(quests: QuestData[], source: QuestPanelSource): void {
    if (this.dialoguePanel) {
      this.dialoguePanel.destroy();
      this.dialoguePanel = null;
    }

    const { width, height } = this.cameras.main;
    const panel = this.add.container(width / 2, height / 2);
    this._registerModalPanel(panel);

    const panelW = 640;
    const panelH = 440;
    const bg = this.add.rectangle(0, 0, panelW, panelH, 0x0a0a1a, 0.96)
      .setStrokeStyle(2, 0xcccc44);
    panel.add(bg);

    const sourceLabel = source === 'server' ? '서버 동기화' : '로컬 QA 데이터';
    panel.add(this.add.text(0, -panelH / 2 + 24, `📜 퀘스트 (${sourceLabel})`, {
      fontSize: '18px', color: '#ffdd66', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    }).setOrigin(0.5));

    // 상태순(actionable 우선) 안정 정렬 후 앞 4개 — turned_in 이 수주 가능 퀘스트를 가리지 않도록.
    const sortedQuests = [...quests].sort(
      (a, b) => (QUEST_STATUS_ORDER[a.status] ?? 9) - (QUEST_STATUS_ORDER[b.status] ?? 9),
    );
    const visibleQuests = sortedQuests.slice(0, 4);

    // 키보드 포커스 링: 액션 가능 퀘스트(수주/완료) + [새로고침] + [닫기]
    const focusables: Array<{ setFocused: (active: boolean) => void; activate: () => void }> = [];

    if (visibleQuests.length === 0) {
      panel.add(this.add.text(0, 0, '표시할 퀘스트가 없습니다.', {
        fontSize: '13px', color: '#888888', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
      }).setOrigin(0.5));
    }

    visibleQuests.forEach((quest, i) => {
      const y = -panelH / 2 + 70 + i * 78;
      const status = QUEST_STATUS_STYLE[quest.status] ?? QUEST_STATUS_STYLE.available;
      const objective = quest.objectives[0];
      const progress = objective
        ? `${objective.desc} ${objective.current}/${objective.target}`
        : '목표 없음';
      const rewardItems = quest.rewards.items?.length
        ? ` / ${quest.rewards.items.join(', ')}`
        : '';

      panel.add(this.add.rectangle(0, y + 32, panelW - 52, 1, 0x334433, 0.8));
      panel.add(this.add.text(-285, y, quest.name, {
        fontSize: '14px', color: '#ffffff', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
      }));
      panel.add(this.add.text(-285, y + 22, quest.description, {
        fontSize: '11px', color: '#bbbbbb', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
        wordWrap: { width: 360 },
      }));
      panel.add(this.add.text(-285, y + 42, progress, {
        fontSize: '11px', color: '#88ccff', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
      }));
      panel.add(this.add.text(-25, y + 42, `EXP ${quest.rewards.exp} / ${quest.rewards.gold}G${rewardItems}`, {
        fontSize: '11px', color: '#ffcc44', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
      }));
      panel.add(this.add.text(210, y, status.label, {
        fontSize: '12px', color: status.color, fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
      }));

      const actionText = this._getQuestActionText(quest.status);
      const actionable = quest.status === 'available' || quest.status === 'complete';
      const actionBtn = this.add.text(210, y + 30, actionText, {
        fontSize: '12px',
        color: actionable ? '#88ff88' : '#777777',
        fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
      }).setInteractive({ useHandCursor: actionable });

      if (actionable) {
        // 마우스(pointerdown)·키보드(ENTER) 공유 액션. done 가드로 중복 실행/라벨 깨짐 방지.
        let done = false;
        const doneText = quest.status === 'available' ? '[ 진행중 ]' : '[ 완료됨 ]';
        const act = async () => {
          if (done) return;
          done = true;
          playSfx(this, UI_SFX.CONFIRM);
          if (quest.status === 'available') await this._acceptQuestFromPanel(quest, source);
          else await this._completeQuestFromPanel(quest, source);
          actionBtn.setText(doneText).setColor('#777777').disableInteractive();
        };
        actionBtn.on('pointerdown', act);
        focusables.push({
          setFocused: (a) => {
            if (done) return; // 활성 후 라벨 고정
            actionBtn.setText(a ? `▶ ${actionText}` : actionText);
            actionBtn.setColor(a ? '#ffffff' : '#88ff88');
          },
          activate: () => void act(),
        });
      }
      panel.add(actionBtn);
    });

    if (quests.length > visibleQuests.length) {
      panel.add(this.add.text(0, panelH / 2 - 58, `... 외 ${quests.length - visibleQuests.length}개`, {
        fontSize: '11px', color: '#888888', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
      }).setOrigin(0.5));
    }

    const doRefresh = () => {
      playSfx(this, UI_SFX.CLICK);
      panel.destroy();
      void this._showQuests();
    };
    const refreshBtn = this.add.text(-80, panelH / 2 - 26, '[ 새로고침 ]', {
      fontSize: '13px', color: '#88ccff', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    refreshBtn.on('pointerdown', doRefresh);
    panel.add(refreshBtn);

    const doClose = () => {
      playSfx(this, UI_SFX.CANCEL);
      panel.destroy();
    };
    const closeBtn = this.add.text(90, panelH / 2 - 26, '[ 닫기 ]', {
      fontSize: '13px', color: '#888888', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', doClose);
    panel.add(closeBtn);

    focusables.push(
      { setFocused: (a) => { refreshBtn.setText(a ? '▶ [ 새로고침 ]' : '[ 새로고침 ]'); refreshBtn.setColor(a ? '#ffffff' : '#88ccff'); }, activate: doRefresh },
      { setFocused: (a) => { closeBtn.setText(a ? '▶ [ 닫기 ]' : '[ 닫기 ]'); closeBtn.setColor(a ? '#ffffff' : '#888888'); }, activate: doClose },
    );
    this._attachPanelKeyboardNav(panel, focusables);
  }

  private _getQuestActionText(status: QuestData['status']): string {
    if (status === 'available') return '[ 수주 ]';
    if (status === 'complete') return '[ 완료 ]';
    if (status === 'turned_in') return '[ 완료됨 ]';
    return '[ 진행중 ]';
  }

  private async _acceptQuestFromPanel(quest: QuestData, source: QuestPanelSource): Promise<void> {
    if (source === 'server' && this.characterData?.characterId) {
      try {
        await networkManager.acceptQuest(quest.id, this.characterData.level ?? 1);
      } catch {
        this._showNotification('서버 수주 실패: 로컬 진행 처리');
        return;
      }
    }
    this._showNotification(`${quest.name} 수주 완료`);
  }

  private async _completeQuestFromPanel(quest: QuestData, source: QuestPanelSource): Promise<void> {
    if (source === 'server' && this.characterData?.characterId) {
      try {
        await networkManager.completeQuest(quest.id, this.characterData.characterId);
      } catch {
        this._showNotification('서버 완료 실패: 로컬 완료 처리');
        return;
      }
    }
    this._showNotification(`${quest.name} 완료 보상 지급`);
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
      fontSize: '10px', color: '#888888', fontFamily: '"Galmuri11", "Pretendard", "Noto Sans KR", monospace',
    }).setOrigin(0.5));
  }

  shutdown(): void {
    // FINDING-A4 ext5: scene 종료 시 keyboard listener 정리
    this._lobbyKeyboardCleanup?.();
    this._lobbyKeyboardCleanup = null;
    this.navButtonItems = [];
    // FINDING-A4 ext7: NPC highlight ring 정리
    if (this.npcHighlightRing) {
      this.npcHighlightRing.destroy();
      this.npcHighlightRing = null;
    }
  }
}
