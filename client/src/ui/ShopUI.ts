/**
 * ShopUI — P26-02: 상점 UI
 *
 * 기능:
 * - 구매/판매 탭
 * - 가격 표시, 골드 잔액
 * - 구매 확인 다이얼로그
 * - NetworkManager 연동
 */

import * as Phaser from 'phaser';
import { NetworkManager, InventoryItem } from '../network/NetworkManager';

// ── 타입 ──────────────────────────────────────────────────────

export type ShopTab = 'buy' | 'sell';

export interface ShopItem {
  id: string;
  itemId: string;
  name: string;
  type: string;
  rarity: string;
  buyPrice: number;
  sellPrice: number;
  description: string;
  stats?: Record<string, number>;
  stock: number; // -1 = unlimited
}

interface ShopRow {
  container: Phaser.GameObjects.Container;
  item: ShopItem | InventoryItem;
}

const RARITY_COLORS: Record<string, string> = {
  common: '#aaaaaa', uncommon: '#55cc55', rare: '#5599ff',
  epic: '#bb55ff', legendary: '#ffaa00',
};

// ── 메인 클래스 ───────────────────────────────────────────────

export class ShopUI {
  private scene: Phaser.Scene;
  private net: NetworkManager;
  private container: Phaser.GameObjects.Container;
  private visible = false;

  private tab: ShopTab = 'buy';
  private shopItems: ShopItem[] = [];
  private playerItems: InventoryItem[] = [];
  private gold = 0;
  private characterId = '';
  private npcId = '';

  // UI 요소
  private goldText!: Phaser.GameObjects.Text;
  private tabBuyBtn!: Phaser.GameObjects.Text;
  private tabSellBtn!: Phaser.GameObjects.Text;
  private listContainer!: Phaser.GameObjects.Container;
  private rows: ShopRow[] = [];

  // 확인 다이얼로그
  private confirmDialog: Phaser.GameObjects.Container | null = null;

  constructor(scene: Phaser.Scene, net: NetworkManager) {
    this.scene = scene;
    this.net = net;
    this.container = scene.add.container(0, 0).setDepth(900).setVisible(false);
    this._buildUI();
  }

  // ── 공개 API ──────────────────────────────────────────────

  async open(characterId: string, npcId: string, shopItems: ShopItem[]): Promise<void> {
    this.characterId = characterId;
    this.npcId = npcId;
    this.shopItems = shopItems;
    this.tab = 'buy';
    this.visible = true;
    this.container.setVisible(true);
    await this._refreshPlayerData();
    this._renderList();
  }

  close(): void {
    this.visible = false;
    this.container.setVisible(false);
    this._closeConfirm();
  }

  isOpen(): boolean { return this.visible; }

  // ── 내부: UI 빌드 ────────────────────────────────────────

  private _buildUI(): void {
    const cx = this.scene.scale.width / 2;
    const cy = this.scene.scale.height / 2;
    const pw = 460;
    const ph = 480;

    // dimmer
    const dimmer = this.scene.add.rectangle(cx, cy, this.scene.scale.width, this.scene.scale.height, 0x000000, 0.5)
      .setInteractive().on('pointerdown', () => this.close());
    this.container.add(dimmer);

    // 배경
    const bg = this.scene.add.rectangle(cx, cy, pw, ph, 0x1a1a2e, 0.95).setStrokeStyle(2, 0x4a4a6a);
    this.container.add(bg);

    // 타이틀
    const title = this.scene.add.text(cx - pw / 2 + 20, cy - ph / 2 + 12, '🏪 상점', {
      fontSize: '18px', color: '#e0e0ff', fontStyle: 'bold',
    });
    this.container.add(title);

    // 골드 표시
    this.goldText = this.scene.add.text(cx + pw / 2 - 140, cy - ph / 2 + 14, '💰 0 G', {
      fontSize: '14px', color: '#ffcc00',
    });
    this.container.add(this.goldText);

    // 탭 버튼
    const tabY = cy - ph / 2 + 46;
    this.tabBuyBtn = this._createTabBtn(cx - 60, tabY, '구매', () => this._switchTab('buy'));
    this.tabSellBtn = this._createTabBtn(cx + 60, tabY, '판매', () => this._switchTab('sell'));

    // 리스트 영역
    this.listContainer = this.scene.add.container(cx - pw / 2 + 20, cy - ph / 2 + 80);
    this.container.add(this.listContainer);

    // 닫기
    const closeBtn = this.scene.add.text(cx + pw / 2 - 28, cy - ph / 2 + 8, '✕', {
      fontSize: '18px', color: '#ff6666',
    }).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.close());
    this.container.add(closeBtn);
  }

  private _createTabBtn(x: number, y: number, label: string, cb: () => void): Phaser.GameObjects.Text {
    const btn = this.scene.add.text(x, y, label, {
      fontSize: '14px', color: '#aaaacc', backgroundColor: '#2a2a4e',
      padding: { x: 16, y: 4 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerdown', cb);
    this.container.add(btn);
    return btn;
  }

  // ── 내부: 탭 전환 ────────────────────────────────────────

  private async _switchTab(tab: ShopTab): Promise<void> {
    this.tab = tab;
    this.tabBuyBtn.setColor(tab === 'buy' ? '#ffffff' : '#666688');
    this.tabSellBtn.setColor(tab === 'sell' ? '#ffffff' : '#666688');
    if (tab === 'sell') await this._refreshPlayerData();
    this._renderList();
  }

  // ── 내부: 데이터 ─────────────────────────────────────────

  private async _refreshPlayerData(): Promise<void> {
    try {
      this.playerItems = await this.net.getInventory(this.characterId);
      const char = await this.net.getCharacter(this.characterId);
      this.gold = char.gold;
      this.goldText.setText(`💰 ${this.gold.toLocaleString()} G`);
    } catch {
      this.playerItems = [];
    }
  }

  // ── 내부: 리스트 렌더 ─────────────────────────────────────

  private _renderList(): void {
    this.listContainer.removeAll(true);
    this.rows = [];

    const items = this.tab === 'buy' ? this.shopItems : this.playerItems;
    const rowH = 48;

    items.forEach((item, i) => {
      const rowC = this.scene.add.container(0, i * rowH);

      const rowBg = this.scene.add.rectangle(210, rowH / 2, 420, rowH - 4, 0x2a2a4e)
        .setStrokeStyle(1, 0x3a3a5e)
        .setInteractive({ useHandCursor: true });

      const nameColor = RARITY_COLORS[(item as ShopItem).rarity ?? (item as InventoryItem).rarity] ?? '#aaaaaa';
      const name = this.scene.add.text(12, rowH / 2, item.name, {
        fontSize: '13px', color: nameColor,
      }).setOrigin(0, 0.5);

      const priceVal = this.tab === 'buy'
        ? (item as ShopItem).buyPrice
        : Math.floor(((item as ShopItem).sellPrice ?? ((item as ShopItem).buyPrice ?? 10)) * 0.4);
      const priceText = this.scene.add.text(300, rowH / 2, `${priceVal} G`, {
        fontSize: '12px', color: '#ffcc00',
      }).setOrigin(0, 0.5);

      const actionLabel = this.tab === 'buy' ? '구매' : '판매';
      const actionBtn = this.scene.add.text(380, rowH / 2, `[${actionLabel}]`, {
        fontSize: '12px', color: '#55cc55',
      }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this._showConfirm(item, priceVal));

      rowC.add([rowBg, name, priceText, actionBtn]);
      this.listContainer.add(rowC);
      this.rows.push({ container: rowC, item });
    });
  }

  // ── 내부: 확인 다이얼로그 ─────────────────────────────────

  private _showConfirm(item: ShopItem | InventoryItem, price: number): void {
    this._closeConfirm();

    const cx = this.scene.scale.width / 2;
    const cy = this.scene.scale.height / 2;

    this.confirmDialog = this.scene.add.container(0, 0).setDepth(920);

    const bg = this.scene.add.rectangle(cx, cy, 280, 140, 0x0a0a1e, 0.98)
      .setStrokeStyle(2, 0x6a6a8a);
    this.confirmDialog.add(bg);

    const action = this.tab === 'buy' ? '구매' : '판매';
    const msg = this.scene.add.text(cx, cy - 30, `${item.name}\n${price} G — ${action}하시겠습니까?`, {
      fontSize: '13px', color: '#e0e0ff', align: 'center',
    }).setOrigin(0.5);
    this.confirmDialog.add(msg);

    // 확인
    const yesBtn = this.scene.add.text(cx - 50, cy + 30, '[ 확인 ]', {
      fontSize: '14px', color: '#55cc55', backgroundColor: '#2a2a4e', padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerdown', async () => {
        await this._executeTrade(item, price);
        this._closeConfirm();
      });
    this.confirmDialog.add(yesBtn);

    // 취소
    const noBtn = this.scene.add.text(cx + 50, cy + 30, '[ 취소 ]', {
      fontSize: '14px', color: '#ff6666', backgroundColor: '#2a2a4e', padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this._closeConfirm());
    this.confirmDialog.add(noBtn);

    this.container.add(this.confirmDialog);
  }

  private _closeConfirm(): void {
    if (this.confirmDialog) {
      this.confirmDialog.destroy();
      this.confirmDialog = null;
    }
  }

  private async _executeTrade(item: ShopItem | InventoryItem, _price: number): Promise<void> {
    try {
      if (this.tab === 'buy') {
        // POST /api/shop/purchase — 서버 엔드포인트 정합
        await this.net.post('/api/shop/purchase', {
          userId: this.characterId,
          itemId: (item as ShopItem).itemId ?? item.id,
          quantity: 1,
        });
      } else {
        // POST /api/inventory/sell — 서버 엔드포인트 정합
        await this.net.post('/api/inventory/sell', {
          userId: this.characterId,
          slotId: (item as InventoryItem).id,
          quantity: 1,
        });
      }
    } catch (err) {
      console.error('[ShopUI] 거래 실패:', err);
    }
    await this._refreshPlayerData();
    this._renderList();
  }

  // ── 정리 ──────────────────────────────────────────────────

  destroy(): void {
    this._closeConfirm();
    this.container.destroy();
  }
}
