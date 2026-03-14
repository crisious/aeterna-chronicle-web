/**
 * TradeUI — P27-05: 1:1 거래 UI
 *
 * 기능:
 * - 내 오퍼 / 상대 오퍼 패널 (아이템 + 골드)
 * - 확인/취소 버튼
 * - 양측 확인 시 거래 완료 애니메이션
 * - 소켓 기반 실시간 오퍼 동기화
 */

import * as Phaser from 'phaser';
import { NetworkManager, InventoryItem } from '../network/NetworkManager';

// ── 타입 ──────────────────────────────────────────────────────

export interface TradeOffer {
  items: Array<{ itemId: string; quantity: number; name: string; icon: string; rarity: string }>;
  gold: number;
}

export interface TradeState {
  tradeId: string;
  requesterId: string;
  targetId: string;
  requesterName: string;
  targetName: string;
  requesterOffer: TradeOffer;
  targetOffer: TradeOffer;
  requesterConfirmed: boolean;
  targetConfirmed: boolean;
  status: string;
}

interface ItemSlotUI {
  bg: Phaser.GameObjects.Rectangle;
  icon: Phaser.GameObjects.Text;
  qty: Phaser.GameObjects.Text;
  name: Phaser.GameObjects.Text;
}

const RARITY_COLORS: Record<string, number> = {
  common: 0xaaaaaa, uncommon: 0x55cc55, rare: 0x5599ff, epic: 0xbb55ff, legendary: 0xffaa00,
};

const SLOT_SIZE = 50;
const COLS = 3;
const ROWS = 3;

// ── 메인 클래스 ───────────────────────────────────────────────

export class TradeUI {
  private scene: Phaser.Scene;
  private net: NetworkManager;
  private container: Phaser.GameObjects.Container;

  private tradeState: TradeState | null = null;
  private mySlots: ItemSlotUI[] = [];
  private theirSlots: ItemSlotUI[] = [];
  private myGoldText!: Phaser.GameObjects.Text;
  private theirGoldText!: Phaser.GameObjects.Text;
  private myConfirmBtn!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;

  private readonly PANEL_W = 560;
  private readonly PANEL_H = 380;

  constructor(scene: Phaser.Scene, net: NetworkManager) {
    this.scene = scene;
    this.net = net;
    this.container = scene.add.container(0, 0);
    this.container.setDepth(950);
    this.container.setVisible(false);

    this.createTradePanel();
    this.bindSocketEvents();
  }

  // ═══ 초기화 ═══

  private createTradePanel(): void {
    const cx = this.scene.scale.width / 2;
    const cy = this.scene.scale.height / 2;
    const px = cx - this.PANEL_W / 2;
    const py = cy - this.PANEL_H / 2;

    // 딤 배경
    const dim = this.scene.add.rectangle(0, 0, this.scene.scale.width, this.scene.scale.height, 0x000000, 0.5)
      .setOrigin(0, 0).setInteractive();
    this.container.add(dim);

    // 메인 패널
    const bg = this.scene.add.rectangle(px, py, this.PANEL_W, this.PANEL_H, 0x1a1a2e, 0.96)
      .setOrigin(0, 0).setStrokeStyle(2, 0x4488ff);
    this.container.add(bg);

    // 제목
    const title = this.scene.add.text(px + 10, py + 10, '💱 1:1 거래', {
      fontSize: '16px', color: '#ffffff', fontStyle: 'bold',
    });
    this.container.add(title);

    // 구분선
    const divider = this.scene.add.rectangle(cx, py + 40, 1, this.PANEL_H - 90, 0x4a4a6a).setOrigin(0.5, 0);
    this.container.add(divider);

    // 내 영역
    const myLabel = this.scene.add.text(px + 20, py + 40, '내 오퍼', { fontSize: '12px', color: '#88ccff' });
    this.container.add(myLabel);
    this.mySlots = this.createItemGrid(px + 20, py + 60);

    this.myGoldText = this.scene.add.text(px + 20, py + 250, '💰 0G', { fontSize: '12px', color: '#ffcc44' });
    this.container.add(this.myGoldText);

    // 상대 영역
    const theirLabel = this.scene.add.text(cx + 20, py + 40, '상대 오퍼', { fontSize: '12px', color: '#ff8888' });
    this.container.add(theirLabel);
    this.theirSlots = this.createItemGrid(cx + 20, py + 60);

    this.theirGoldText = this.scene.add.text(cx + 20, py + 250, '💰 0G', { fontSize: '12px', color: '#ffcc44' });
    this.container.add(this.theirGoldText);

    // 하단 버튼
    this.myConfirmBtn = this.createButton(cx - 80, py + this.PANEL_H - 40, '✅ 확인', () => this.confirmTrade());
    const cancelBtn = this.createButton(cx + 20, py + this.PANEL_H - 40, '❌ 취소', () => this.cancelTrade());
    this.container.add([this.myConfirmBtn, cancelBtn]);

    // 상태 텍스트
    this.statusText = this.scene.add.text(cx, py + this.PANEL_H - 60, '', {
      fontSize: '11px', color: '#aaaaaa', align: 'center',
    }).setOrigin(0.5);
    this.container.add(this.statusText);
  }

  private createItemGrid(x: number, y: number): ItemSlotUI[] {
    const slots: ItemSlotUI[] = [];
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const sx = x + col * (SLOT_SIZE + 4);
        const sy = y + row * (SLOT_SIZE + 4);

        const bg = this.scene.add.rectangle(sx, sy, SLOT_SIZE, SLOT_SIZE, 0x252540, 0.8)
          .setOrigin(0, 0).setStrokeStyle(1, 0x3a3a5a);
        const icon = this.scene.add.text(sx + 12, sy + 8, '', { fontSize: '18px' });
        const qty = this.scene.add.text(sx + SLOT_SIZE - 4, sy + SLOT_SIZE - 4, '', {
          fontSize: '9px', color: '#ffffff',
        }).setOrigin(1, 1);
        const name = this.scene.add.text(sx + 2, sy + SLOT_SIZE - 12, '', {
          fontSize: '8px', color: '#cccccc',
        });

        this.container.add([bg, icon, qty, name]);
        slots.push({ bg, icon, qty, name });
      }
    }
    return slots;
  }

  private createButton(x: number, y: number, label: string, callback: () => void): Phaser.GameObjects.Text {
    const btn = this.scene.add.text(x, y, label, {
      fontSize: '13px', color: '#ffffff', backgroundColor: '#3a5a8a',
      padding: { x: 12, y: 6 },
    }).setInteractive({ useHandCursor: true });
    btn.on('pointerdown', callback);
    return btn;
  }

  // ═══ 소켓 이벤트 ═══

  private bindSocketEvents(): void {
    const socket = this.net.getSocket();
    if (!socket) return;

    socket.on('trade:request', (data: { tradeId: string; requesterName: string }) => {
      this.showTradeRequest(data.tradeId, data.requesterName);
    });

    socket.on('trade:update', (data: TradeState) => {
      this.tradeState = data;
      this.refreshDisplay();
    });

    socket.on('trade:completed', (data: TradeState) => {
      this.tradeState = data;
      this.statusText.setText('✨ 거래 완료!').setColor('#44ff44');
      this.scene.time.delayedCall(2000, () => this.hide());
    });

    socket.on('trade:cancelled', () => {
      this.statusText.setText('거래가 취소되었습니다').setColor('#ff4444');
      this.scene.time.delayedCall(1500, () => this.hide());
    });
  }

  // ═══ 거래 액션 ═══

  public async requestTrade(targetUserId: string): Promise<void> {
    try {
      const resp = await this.net.httpPost('/api/trade/request', {
        requesterId: this.net.getUserId(),
        targetId: targetUserId,
      });
      if (resp.trade) {
        this.tradeState = resp.trade;
        this.show();
      }
    } catch (err) {
      console.error('[TradeUI] 거래 요청 실패:', err);
    }
  }

  private async confirmTrade(): Promise<void> {
    if (!this.tradeState) return;
    try {
      await this.net.httpPost('/api/trade/confirm', {
        tradeId: this.tradeState.tradeId,
        userId: this.net.getUserId(),
      });
      this.statusText.setText('확인 완료 — 상대 확인 대기 중...').setColor('#88ccff');
    } catch (err) {
      console.error('[TradeUI] 확인 실패:', err);
    }
  }

  private async cancelTrade(): Promise<void> {
    if (!this.tradeState) return;
    try {
      await this.net.httpPost('/api/trade/cancel', {
        tradeId: this.tradeState.tradeId,
        userId: this.net.getUserId(),
      });
      this.hide();
    } catch (err) {
      console.error('[TradeUI] 취소 실패:', err);
    }
  }

  public async addItem(itemId: string, quantity: number): Promise<void> {
    if (!this.tradeState) return;

    const currentOffer = this.getMyOffer();
    const items = [...currentOffer.items, { itemId, quantity, name: '', icon: '', rarity: 'common' }];

    try {
      await this.net.httpPost('/api/trade/offer', {
        tradeId: this.tradeState.tradeId,
        userId: this.net.getUserId(),
        items,
        gold: currentOffer.gold,
      });
    } catch (err) {
      console.error('[TradeUI] 아이템 추가 실패:', err);
    }
  }

  public async setGold(amount: number): Promise<void> {
    if (!this.tradeState) return;

    const currentOffer = this.getMyOffer();
    try {
      await this.net.httpPost('/api/trade/offer', {
        tradeId: this.tradeState.tradeId,
        userId: this.net.getUserId(),
        items: currentOffer.items,
        gold: amount,
      });
    } catch (err) {
      console.error('[TradeUI] 골드 설정 실패:', err);
    }
  }

  // ═══ 거래 요청 팝업 ═══

  private showTradeRequest(tradeId: string, requesterName: string): void {
    const cx = this.scene.scale.width / 2;
    const popup = this.scene.add.container(cx - 130, 50);
    popup.setDepth(960);

    const bg = this.scene.add.rectangle(0, 0, 260, 80, 0x1a1a2e, 0.95)
      .setOrigin(0, 0).setStrokeStyle(2, 0xffcc44);
    const text = this.scene.add.text(10, 10, `${requesterName}님이 거래를 요청했습니다`, {
      fontSize: '11px', color: '#ffffff', wordWrap: { width: 240 },
    });
    const acceptBtn = this.createButton(30, 50, '수락', async () => {
      await this.net.httpPost('/api/trade/accept', { tradeId, userId: this.net.getUserId() });
      popup.destroy();
      this.show();
    });
    const rejectBtn = this.createButton(150, 50, '거절', async () => {
      await this.net.httpPost('/api/trade/reject', { tradeId, userId: this.net.getUserId() });
      popup.destroy();
    });

    popup.add([bg, text, acceptBtn, rejectBtn]);
    this.scene.time.delayedCall(30000, () => popup.destroy());
  }

  // ═══ 디스플레이 갱신 ═══

  private refreshDisplay(): void {
    if (!this.tradeState) return;

    const myOffer = this.getMyOffer();
    const theirOffer = this.getTheirOffer();

    this.updateSlots(this.mySlots, myOffer.items);
    this.updateSlots(this.theirSlots, theirOffer.items);
    this.myGoldText.setText(`💰 ${myOffer.gold.toLocaleString()}G`);
    this.theirGoldText.setText(`💰 ${theirOffer.gold.toLocaleString()}G`);

    const isMe = this.tradeState.requesterId === this.net.getUserId();
    const myConfirmed = isMe ? this.tradeState.requesterConfirmed : this.tradeState.targetConfirmed;
    const theirConfirmed = isMe ? this.tradeState.targetConfirmed : this.tradeState.requesterConfirmed;

    if (myConfirmed && theirConfirmed) {
      this.statusText.setText('✨ 양측 확인 완료').setColor('#44ff44');
    } else if (myConfirmed) {
      this.statusText.setText('상대 확인 대기 중...').setColor('#88ccff');
    } else if (theirConfirmed) {
      this.statusText.setText('상대가 확인했습니다 — 확인 버튼을 눌러주세요').setColor('#ffcc44');
    } else {
      this.statusText.setText('아이템/골드를 등록하고 확인하세요').setColor('#aaaaaa');
    }
  }

  private updateSlots(slots: ItemSlotUI[], items: TradeOffer['items']): void {
    slots.forEach((slot, i) => {
      const item = items[i];
      if (item) {
        slot.icon.setText(item.icon || '📦');
        slot.qty.setText(item.quantity > 1 ? `x${item.quantity}` : '');
        slot.name.setText(item.name || item.itemId);
        const color = RARITY_COLORS[item.rarity] ?? 0xaaaaaa;
        slot.bg.setStrokeStyle(1, color);
      } else {
        slot.icon.setText('');
        slot.qty.setText('');
        slot.name.setText('');
        slot.bg.setStrokeStyle(1, 0x3a3a5a);
      }
    });
  }

  // ═══ 유틸 ═══

  private getMyOffer(): TradeOffer {
    if (!this.tradeState) return { items: [], gold: 0 };
    return this.tradeState.requesterId === this.net.getUserId()
      ? this.tradeState.requesterOffer
      : this.tradeState.targetOffer;
  }

  private getTheirOffer(): TradeOffer {
    if (!this.tradeState) return { items: [], gold: 0 };
    return this.tradeState.requesterId === this.net.getUserId()
      ? this.tradeState.targetOffer
      : this.tradeState.requesterOffer;
  }

  // ═══ 공개 API ═══

  public show(): void { this.container.setVisible(true); }
  public hide(): void { this.container.setVisible(false); this.tradeState = null; }
  public toggle(): void { this.container.setVisible(!this.container.visible); }
  public isVisible(): boolean { return this.container.visible; }
  public destroy(): void { this.container.destroy(); }
}
