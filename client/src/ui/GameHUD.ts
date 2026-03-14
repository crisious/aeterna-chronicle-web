/**
 * GameHUD — P26-07: HUD 통합
 *
 * 기능:
 * - HP/MP 바, 레벨, 경험치
 * - 골드, 퀵슬롯
 * - 채팅 입력창
 * - 모든 UI 컴포넌트 통합 관리
 * - NetworkManager + 소켓 이벤트 연동
 */

import * as Phaser from 'phaser';
import { NetworkManager, CharacterData } from '../network/NetworkManager';
import { QuestTracker } from './QuestTracker';
import { Minimap } from './Minimap';
import { InventoryUI } from './InventoryUI';
import { ShopUI } from './ShopUI';
import { SkillTreeUI, ClassId } from './SkillTreeUI';
import { WorldMapUI } from './WorldMapUI';

// ── 타입 ──────────────────────────────────────────────────────

export interface QuickSlotData {
  slotIndex: number;
  icon: string;
  label: string;
  cooldownMs: number;
  remainingCooldownMs: number;
  isUsable: boolean;
  hotkey: string;
}

// ── 메인 클래스 ───────────────────────────────────────────────

export class GameHUD {
  private scene: Phaser.Scene;
  private net: NetworkManager;
  private container: Phaser.GameObjects.Container;

  // 캐릭터 상태
  private characterId = '';
  private charData: CharacterData | null = null;

  // HP/MP 바
  private hpBarBg!: Phaser.GameObjects.Rectangle;
  private hpBarFill!: Phaser.GameObjects.Rectangle;
  private hpText!: Phaser.GameObjects.Text;
  private mpBarBg!: Phaser.GameObjects.Rectangle;
  private mpBarFill!: Phaser.GameObjects.Rectangle;
  private mpText!: Phaser.GameObjects.Text;

  // 레벨/경험치
  private levelText!: Phaser.GameObjects.Text;
  private expBarBg!: Phaser.GameObjects.Rectangle;
  private expBarFill!: Phaser.GameObjects.Rectangle;
  private expText!: Phaser.GameObjects.Text;

  // 골드
  private goldText!: Phaser.GameObjects.Text;

  // 퀵슬롯
  private quickSlots: Phaser.GameObjects.Container[] = [];
  private quickSlotData: QuickSlotData[] = [];

  // 채팅
  private chatContainer!: Phaser.GameObjects.Container;
  private chatMessages: Phaser.GameObjects.Text[] = [];
  private chatInput: string = '';
  private chatInputText!: Phaser.GameObjects.Text;
  private chatVisible = true;
  private chatHistory: Array<{ sender: string; message: string }> = [];

  // 서브 UI 컴포넌트
  questTracker!: QuestTracker;
  minimap!: Minimap;
  inventoryUI!: InventoryUI;
  shopUI!: ShopUI;
  skillTreeUI!: SkillTreeUI;
  worldMapUI!: WorldMapUI;

  // 단축키 버튼
  private hotbarButtons: Phaser.GameObjects.Text[] = [];

  constructor(scene: Phaser.Scene, net: NetworkManager) {
    this.scene = scene;
    this.net = net;
    this.container = scene.add.container(0, 0).setDepth(700);
    this._buildStatusBars();
    this._buildQuickSlots();
    this._buildChatBox();
    this._buildHotbar();
    this._initSubComponents();
    this._bindEvents();
  }

  // ── 공개 API ──────────────────────────────────────────────

  async init(characterId: string): Promise<void> {
    this.characterId = characterId;
    await this.refreshCharacter();
    await this.questTracker.init(characterId);
  }

  async refreshCharacter(): Promise<void> {
    try {
      this.charData = await this.net.getCharacter(this.characterId);
      this._updateBars();
    } catch {
      // 네트워크 실패 시 무시
    }
  }

  updateHP(current: number, max: number): void {
    if (this.charData) {
      this.charData.hp = current;
      this.charData.maxHp = max;
    }
    this._updateBars();
  }

  updateMP(current: number, max: number): void {
    if (this.charData) {
      this.charData.mp = current;
      this.charData.maxMp = max;
    }
    this._updateBars();
  }

  updateGold(gold: number): void {
    if (this.charData) this.charData.gold = gold;
    this.goldText.setText(`💰 ${gold.toLocaleString()}`);
  }

  updateExp(exp: number, level: number): void {
    if (this.charData) {
      this.charData.exp = exp;
      this.charData.level = level;
    }
    this._updateBars();
  }

  setQuickSlots(slots: QuickSlotData[]): void {
    this.quickSlotData = slots;
    this._renderQuickSlots();
  }

  // ── 내부: 상태 바 ─────────────────────────────────────────

  private _buildStatusBars(): void {
    const x = 16;
    const y = 16;
    const barW = 200;
    const barH = 18;

    // HP
    this.hpBarBg = this.scene.add.rectangle(x, y, barW, barH, 0x2a0a0a).setOrigin(0);
    this.hpBarFill = this.scene.add.rectangle(x, y, barW, barH, 0xcc2222).setOrigin(0);
    this.hpText = this.scene.add.text(x + barW / 2, y + barH / 2, 'HP', {
      fontSize: '11px', color: '#ffffff',
    }).setOrigin(0.5);

    // MP
    const my = y + barH + 4;
    this.mpBarBg = this.scene.add.rectangle(x, my, barW, barH, 0x0a0a2a).setOrigin(0);
    this.mpBarFill = this.scene.add.rectangle(x, my, barW, barH, 0x2244cc).setOrigin(0);
    this.mpText = this.scene.add.text(x + barW / 2, my + barH / 2, 'MP', {
      fontSize: '11px', color: '#ffffff',
    }).setOrigin(0.5);

    // 레벨
    this.levelText = this.scene.add.text(x, my + barH + 8, 'Lv.1', {
      fontSize: '14px', color: '#ffcc00', fontStyle: 'bold',
    });

    // EXP 바
    const ey = my + barH + 30;
    this.expBarBg = this.scene.add.rectangle(x, ey, barW, 8, 0x1a1a2e).setOrigin(0);
    this.expBarFill = this.scene.add.rectangle(x, ey, 0, 8, 0x44aa44).setOrigin(0);
    this.expText = this.scene.add.text(x + barW + 8, ey, 'EXP 0%', {
      fontSize: '9px', color: '#88aa88',
    }).setOrigin(0, 0.5);

    // 골드
    this.goldText = this.scene.add.text(x, ey + 18, '💰 0', {
      fontSize: '13px', color: '#ffcc00',
    });

    this.container.add([
      this.hpBarBg, this.hpBarFill, this.hpText,
      this.mpBarBg, this.mpBarFill, this.mpText,
      this.levelText, this.expBarBg, this.expBarFill, this.expText,
      this.goldText,
    ]);
  }

  private _updateBars(): void {
    if (!this.charData) return;
    const barW = 200;

    // HP
    const hpRatio = Math.max(0, Math.min(1, this.charData.hp / this.charData.maxHp));
    this.hpBarFill.setSize(barW * hpRatio, 18);
    this.hpText.setText(`${this.charData.hp} / ${this.charData.maxHp}`);
    this.hpBarFill.setFillStyle(hpRatio < 0.25 ? 0xff2222 : 0xcc2222);

    // MP
    const mpRatio = Math.max(0, Math.min(1, this.charData.mp / this.charData.maxMp));
    this.mpBarFill.setSize(barW * mpRatio, 18);
    this.mpText.setText(`${this.charData.mp} / ${this.charData.maxMp}`);

    // Level
    this.levelText.setText(`Lv.${this.charData.level}`);

    // EXP (가정: 다음 레벨 필요 EXP = level * 100)
    const nextLevelExp = this.charData.level * 100;
    const expRatio = Math.min(1, this.charData.exp / nextLevelExp);
    this.expBarFill.setSize(barW * expRatio, 8);
    this.expText.setText(`EXP ${Math.floor(expRatio * 100)}%`);

    // Gold
    this.goldText.setText(`💰 ${this.charData.gold.toLocaleString()}`);
  }

  // ── 내부: 퀵슬롯 ─────────────────────────────────────────

  private _buildQuickSlots(): void {
    const cx = this.scene.scale.width / 2;
    const y = this.scene.scale.height - 70;
    const slotSize = 50;
    const gap = 6;
    const count = 8;
    const startX = cx - (count * (slotSize + gap)) / 2;

    for (let i = 0; i < count; i++) {
      const sx = startX + i * (slotSize + gap);
      const slotC = this.scene.add.container(sx, y);

      const bg = this.scene.add.rectangle(slotSize / 2, slotSize / 2, slotSize, slotSize, 0x1a1a2e)
        .setStrokeStyle(1, 0x3a3a5e);

      const icon = this.scene.add.text(slotSize / 2, slotSize / 2 - 4, '', {
        fontSize: '20px',
      }).setOrigin(0.5);

      const hotkey = this.scene.add.text(4, 2, `${i + 1}`, {
        fontSize: '9px', color: '#666688',
      });

      slotC.add([bg, icon, hotkey]);
      this.container.add(slotC);
      this.quickSlots.push(slotC);
    }
  }

  private _renderQuickSlots(): void {
    this.quickSlotData.forEach((slot, i) => {
      if (i >= this.quickSlots.length) return;
      const slotC = this.quickSlots[i];
      const icon = slotC.getAt(1) as Phaser.GameObjects.Text;
      icon.setText(slot.icon);
    });
  }

  // ── 내부: 채팅 ────────────────────────────────────────────

  private _buildChatBox(): void {
    const x = 16;
    const y = this.scene.scale.height - 200;
    const w = 320;
    const h = 160;

    this.chatContainer = this.scene.add.container(x, y);

    const bg = this.scene.add.rectangle(0, 0, w, h, 0x0a0a1e, 0.7).setOrigin(0).setStrokeStyle(1, 0x2a2a3e);
    this.chatContainer.add(bg);

    // 입력 영역
    const inputBg = this.scene.add.rectangle(0, h, w, 24, 0x1a1a2e, 0.9).setOrigin(0).setStrokeStyle(1, 0x3a3a5e);
    this.chatInputText = this.scene.add.text(6, h + 4, '💬 메시지를 입력하세요...', {
      fontSize: '11px', color: '#666688',
    });

    this.chatContainer.add([inputBg, this.chatInputText]);
    this.container.add(this.chatContainer);

    // 키보드 입력 (Enter로 전송)
    this.scene.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (!this.chatVisible) return;
      if (event.key === 'Enter' && this.chatInput.length > 0) {
        this._sendChat();
      } else if (event.key === 'Backspace') {
        this.chatInput = this.chatInput.slice(0, -1);
        this._updateChatInput();
      } else if (event.key.length === 1 && this.chatInput.length < 100) {
        this.chatInput += event.key;
        this._updateChatInput();
      }
    });
  }

  private _updateChatInput(): void {
    this.chatInputText.setText(this.chatInput.length > 0 ? `> ${this.chatInput}` : '💬 메시지를 입력하세요...');
    this.chatInputText.setColor(this.chatInput.length > 0 ? '#e0e0ff' : '#666688');
  }

  private _sendChat(): void {
    if (!this.chatInput.trim()) return;
    this.net.emit('chat:message', {
      senderId: this.characterId,
      senderName: this.charData?.name ?? 'Player',
      message: this.chatInput,
      channel: 'general',
    });
    this._addChatMessage(this.charData?.name ?? 'Player', this.chatInput);
    this.chatInput = '';
    this._updateChatInput();
  }

  private _addChatMessage(sender: string, message: string): void {
    this.chatHistory.push({ sender, message });
    if (this.chatHistory.length > 50) this.chatHistory.shift();
    this._renderChat();
  }

  private _renderChat(): void {
    this.chatMessages.forEach(t => t.destroy());
    this.chatMessages = [];

    const maxShow = 8;
    const recent = this.chatHistory.slice(-maxShow);
    recent.forEach((msg, i) => {
      const t = this.scene.add.text(6, 4 + i * 18, `[${msg.sender}] ${msg.message}`, {
        fontSize: '10px', color: '#aaaacc', wordWrap: { width: 308 },
      });
      this.chatContainer.add(t);
      this.chatMessages.push(t);
    });
  }

  // ── 내부: 단축키 바 ──────────────────────────────────────

  private _buildHotbar(): void {
    const btns = [
      { label: '🎒', key: 'I', action: () => this.inventoryUI?.toggle(this.characterId) },
      { label: '🌳', key: 'K', action: () => this.skillTreeUI?.open(this.characterId, (this.charData?.classId ?? 'ether_knight') as ClassId, this.charData?.level ?? 1, 0) },
      { label: '🗺️', key: 'M', action: () => this.worldMapUI?.open(this.characterId, this.charData?.level ?? 1, this.charData?.zoneId ?? 'zone_01') },
    ];

    const y = this.scene.scale.height - 28;
    btns.forEach((b, i) => {
      const x = this.scene.scale.width - 40 * (btns.length - i);
      const btn = this.scene.add.text(x, y, `${b.label}[${b.key}]`, {
        fontSize: '12px', color: '#aaaacc', backgroundColor: '#1a1a2e',
        padding: { x: 4, y: 2 },
      }).setInteractive({ useHandCursor: true }).on('pointerdown', b.action);
      this.container.add(btn);
      this.hotbarButtons.push(btn);
    });

    // 키보드 바인딩
    this.scene.input.keyboard?.on('keydown-I', () => this.inventoryUI?.toggle(this.characterId));
    this.scene.input.keyboard?.on('keydown-M', () => this.worldMapUI?.open(this.characterId, this.charData?.level ?? 1, this.charData?.zoneId ?? 'zone_01'));
  }

  // ── 내부: 서브 컴포넌트 ──────────────────────────────────

  private _initSubComponents(): void {
    this.questTracker = new QuestTracker(this.scene, this.net);
    this.minimap = new Minimap(this.scene, this.net);
    this.inventoryUI = new InventoryUI(this.scene, this.net);
    this.shopUI = new ShopUI(this.scene, this.net);
    this.skillTreeUI = new SkillTreeUI(this.scene, this.net);
    this.worldMapUI = new WorldMapUI(this.scene, this.net);
  }

  // ── 내부: 이벤트 바인딩 ──────────────────────────────────

  private _bindEvents(): void {
    this.net.on('chat:message', (raw: unknown) => {
      const data = raw as { senderId: string; senderName: string; message: string };
      if (data.senderId !== this.characterId) {
        this._addChatMessage(data.senderName, data.message);
      }
    });

    this.net.on('system:notification', (raw: unknown) => {
      const data = raw as { type: string; message: string };
      this._addChatMessage('⚙️ 시스템', data.message);
    });
  }

  // ── 정리 ──────────────────────────────────────────────────

  destroy(): void {
    this.questTracker.destroy();
    this.minimap.destroy();
    this.inventoryUI.destroy();
    this.shopUI.destroy();
    this.skillTreeUI.destroy();
    this.worldMapUI.destroy();
    this.container.destroy();
  }
}
