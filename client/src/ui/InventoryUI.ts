/**
 * InventoryUI — P26-01: 인벤토리 UI
 *
 * 기능:
 * - 아이템 목록 (그리드/리스트 전환)
 * - 장착/해제, 아이템 상세 팝업
 * - 정렬/필터 (타입/등급/레벨)
 * - NetworkManager 연동 (getInventory, equipItem, useItem)
 */

import * as Phaser from 'phaser';
import { NetworkManager, InventoryItem } from '../network/NetworkManager';

// ── 타입 ──────────────────────────────────────────────────────

export type ViewMode = 'grid' | 'list';
export type SortKey = 'name' | 'type' | 'rarity' | 'quantity';
export type SortDir = 'asc' | 'desc';
export type RarityTier = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface InventoryFilter {
  type?: string;       // weapon, armor, consumable, material, quest
  rarity?: RarityTier;
  minLevel?: number;
}

interface ItemSlot {
  bg: Phaser.GameObjects.Rectangle;
  icon: Phaser.GameObjects.Text;
  qty: Phaser.GameObjects.Text;
  border: Phaser.GameObjects.Rectangle;
  item: InventoryItem | null;
}

const RARITY_COLORS: Record<string, number> = {
  common:    0xaaaaaa,
  uncommon:  0x55cc55,
  rare:      0x5599ff,
  epic:      0xbb55ff,
  legendary: 0xffaa00,
};

const SLOT_SIZE = 64;
const SLOT_GAP = 4;
const COLS = 6;
const ROWS = 5;
const MAX_SLOTS = COLS * ROWS;

// ── 메인 클래스 ───────────────────────────────────────────────

export class InventoryUI {
  private scene: Phaser.Scene;
  private net: NetworkManager;
  private container: Phaser.GameObjects.Container;
  private slots: ItemSlot[] = [];
  private items: InventoryItem[] = [];
  private filteredItems: InventoryItem[] = [];

  private viewMode: ViewMode = 'grid';
  private sortKey: SortKey = 'type';
  private sortDir: SortDir = 'asc';
  private filter: InventoryFilter = {};
  private characterId = '';

  // 팝업
  private detailPanel: Phaser.GameObjects.Container | null = null;
  private selectedItem: InventoryItem | null = null;

  // UI 요소
  private titleText!: Phaser.GameObjects.Text;
  private viewToggle!: Phaser.GameObjects.Text;
  private filterBar!: Phaser.GameObjects.Container;
  private bg!: Phaser.GameObjects.Rectangle;

  private visible = false;

  constructor(scene: Phaser.Scene, net: NetworkManager) {
    this.scene = scene;
    this.net = net;
    this.container = scene.add.container(0, 0).setDepth(900).setVisible(false);
    this._buildUI();
  }

  // ── 공개 API ──────────────────────────────────────────────

  async open(characterId: string): Promise<void> {
    this.characterId = characterId;
    this.visible = true;
    this.container.setVisible(true);
    await this.refresh();
  }

  close(): void {
    this.visible = false;
    this.container.setVisible(false);
    this._closeDetail();
  }

  toggle(characterId: string): void {
    if (this.visible) this.close();
    else this.open(characterId);
  }

  isOpen(): boolean {
    return this.visible;
  }

  async refresh(): Promise<void> {
    try {
      this.items = await this.net.getInventory(this.characterId);
    } catch {
      this.items = [];
    }
    this._applyFilterSort();
    this._renderSlots();
  }

  setFilter(f: InventoryFilter): void {
    this.filter = f;
    this._applyFilterSort();
    this._renderSlots();
  }

  setSort(key: SortKey, dir: SortDir = 'asc'): void {
    this.sortKey = key;
    this.sortDir = dir;
    this._applyFilterSort();
    this._renderSlots();
  }

  toggleView(): void {
    this.viewMode = this.viewMode === 'grid' ? 'list' : 'grid';
    this.viewToggle.setText(this.viewMode === 'grid' ? '▦ Grid' : '☰ List');
    this._renderSlots();
  }

  // ── 장착/사용 ─────────────────────────────────────────────

  async equipSelected(): Promise<void> {
    if (!this.selectedItem) return;
    try {
      await this.net.equipItem(this.characterId, this.selectedItem.id);
      await this.refresh();
      this._closeDetail();
    } catch (e) {
      console.error('[InventoryUI] equip failed', e);
    }
  }

  async useSelected(): Promise<void> {
    if (!this.selectedItem) return;
    try {
      await this.net.useItem(this.characterId, this.selectedItem.id);
      await this.refresh();
      this._closeDetail();
    } catch (e) {
      console.error('[InventoryUI] use failed', e);
    }
  }

  // ── 내부: UI 빌드 ────────────────────────────────────────

  private _buildUI(): void {
    const cx = this.scene.scale.width / 2;
    const cy = this.scene.scale.height / 2;
    const panelW = COLS * (SLOT_SIZE + SLOT_GAP) + SLOT_GAP + 40;
    const panelH = ROWS * (SLOT_SIZE + SLOT_GAP) + SLOT_GAP + 120;

    // 배경 dimmer
    const dimmer = this.scene.add.rectangle(cx, cy, this.scene.scale.width, this.scene.scale.height, 0x000000, 0.5)
      .setInteractive()
      .on('pointerdown', () => this.close());
    this.container.add(dimmer);

    // 패널 배경
    this.bg = this.scene.add.rectangle(cx, cy, panelW, panelH, 0x1a1a2e, 0.95)
      .setStrokeStyle(2, 0x4a4a6a);
    this.container.add(this.bg);

    // 타이틀
    this.titleText = this.scene.add.text(cx - panelW / 2 + 20, cy - panelH / 2 + 12, '🎒 인벤토리', {
      fontSize: '18px', color: '#e0e0ff', fontStyle: 'bold',
    });
    this.container.add(this.titleText);

    // 뷰 토글
    this.viewToggle = this.scene.add.text(cx + panelW / 2 - 80, cy - panelH / 2 + 12, '▦ Grid', {
      fontSize: '14px', color: '#aaaacc',
    }).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.toggleView());
    this.container.add(this.viewToggle);

    // 필터 바
    this.filterBar = this.scene.add.container(cx - panelW / 2 + 20, cy - panelH / 2 + 44);
    this.container.add(this.filterBar);
    this._buildFilterBar(panelW - 40);

    // 슬롯 영역
    const startX = cx - panelW / 2 + 20 + SLOT_GAP;
    const startY = cy - panelH / 2 + 80;
    for (let i = 0; i < MAX_SLOTS; i++) {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const sx = startX + col * (SLOT_SIZE + SLOT_GAP);
      const sy = startY + row * (SLOT_SIZE + SLOT_GAP);

      const bg = this.scene.add.rectangle(sx + SLOT_SIZE / 2, sy + SLOT_SIZE / 2, SLOT_SIZE, SLOT_SIZE, 0x2a2a4e)
        .setStrokeStyle(1, 0x3a3a5e)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this._onSlotClick(i));

      const icon = this.scene.add.text(sx + SLOT_SIZE / 2, sy + SLOT_SIZE / 2, '', {
        fontSize: '24px', color: '#ffffff',
      }).setOrigin(0.5);

      const qty = this.scene.add.text(sx + SLOT_SIZE - 4, sy + SLOT_SIZE - 4, '', {
        fontSize: '10px', color: '#cccccc',
      }).setOrigin(1, 1);

      const border = this.scene.add.rectangle(sx + SLOT_SIZE / 2, sy + SLOT_SIZE / 2, SLOT_SIZE, SLOT_SIZE)
        .setStrokeStyle(2, 0xffffff)
        .setFillStyle(0x000000, 0)
        .setVisible(false);

      this.container.add([bg, icon, qty, border]);
      this.slots.push({ bg, icon, qty, border, item: null });
    }

    // 닫기 버튼
    const closeBtn = this.scene.add.text(cx + panelW / 2 - 28, cy - panelH / 2 + 8, '✕', {
      fontSize: '18px', color: '#ff6666',
    }).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.close());
    this.container.add(closeBtn);
  }

  private _buildFilterBar(width: number): void {
    const types = ['전체', '무기', '방어구', '소비', '재료', '퀘스트'];
    const typeKeys = ['', 'weapon', 'armor', 'consumable', 'material', 'quest'];
    types.forEach((label, i) => {
      const btn = this.scene.add.text(i * 60, 0, label, {
        fontSize: '12px', color: '#aaaacc', backgroundColor: '#2a2a4e',
        padding: { x: 6, y: 3 },
      }).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          this.setFilter({ ...this.filter, type: typeKeys[i] || undefined });
        });
      this.filterBar.add(btn);
    });
  }

  // ── 내부: 필터/정렬 ──────────────────────────────────────

  private _applyFilterSort(): void {
    let list = [...this.items];

    if (this.filter.type) {
      list = list.filter(it => it.type === this.filter.type);
    }
    if (this.filter.rarity) {
      list = list.filter(it => it.rarity === this.filter.rarity);
    }

    list.sort((a, b) => {
      const va = (a as unknown as Record<string, unknown>)[this.sortKey] ?? '';
      const vb = (b as unknown as Record<string, unknown>)[this.sortKey] ?? '';
      const cmp = String(va).localeCompare(String(vb));
      return this.sortDir === 'asc' ? cmp : -cmp;
    });

    this.filteredItems = list;
  }

  // ── 내부: 슬롯 렌더 ──────────────────────────────────────

  private _renderSlots(): void {
    for (let i = 0; i < MAX_SLOTS; i++) {
      const slot = this.slots[i];
      const item = this.filteredItems[i] ?? null;
      slot.item = item;

      if (item) {
        const typeIcons: Record<string, string> = {
          weapon: '⚔️', armor: '🛡️', consumable: '🧪', material: '🔩', quest: '📜',
        };
        slot.icon.setText(typeIcons[item.type] ?? '📦');
        slot.qty.setText(item.quantity > 1 ? `${item.quantity}` : '');
        const rarityColor = RARITY_COLORS[item.rarity] ?? 0xaaaaaa;
        slot.bg.setStrokeStyle(1, rarityColor);
      } else {
        slot.icon.setText('');
        slot.qty.setText('');
        slot.bg.setStrokeStyle(1, 0x3a3a5e);
      }

      slot.border.setVisible(item === this.selectedItem && item !== null);
    }
  }

  // ── 내부: 슬롯 클릭 → 상세 팝업 ──────────────────────────

  private _onSlotClick(index: number): void {
    const slot = this.slots[index];
    if (!slot.item) return;

    this.selectedItem = slot.item;
    this._renderSlots();
    this._showDetail(slot.item);
  }

  private _showDetail(item: InventoryItem): void {
    this._closeDetail();

    const cx = this.scene.scale.width / 2 + 200;
    const cy = this.scene.scale.height / 2;
    const pw = 220;
    const ph = 260;

    this.detailPanel = this.scene.add.container(0, 0).setDepth(910);

    const bg = this.scene.add.rectangle(cx, cy, pw, ph, 0x1a1a2e, 0.98)
      .setStrokeStyle(2, RARITY_COLORS[item.rarity] ?? 0xaaaaaa);
    this.detailPanel.add(bg);

    let y = cy - ph / 2 + 20;
    const addLine = (text: string, color = '#e0e0ff', size = '13px') => {
      const t = this.scene.add.text(cx - pw / 2 + 16, y, text, { fontSize: size, color, wordWrap: { width: pw - 32 } });
      this.detailPanel!.add(t);
      y += parseInt(size) + 8;
    };

    addLine(item.name, '#ffffff', '16px');
    addLine(`[${item.rarity.toUpperCase()}] ${item.type}`, '#aaaacc', '12px');
    addLine(`수량: ${item.quantity}`, '#cccccc');

    if (item.stats) {
      Object.entries(item.stats).forEach(([k, v]) => {
        addLine(`  ${k}: +${v}`, '#88cc88', '12px');
      });
    }

    // 버튼: 장착
    if (item.type === 'weapon' || item.type === 'armor') {
      const equipBtn = this.scene.add.text(cx - 50, cy + ph / 2 - 60, '[ 장착 ]', {
        fontSize: '14px', color: '#55cc55', backgroundColor: '#2a2a4e', padding: { x: 8, y: 4 },
      }).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.equipSelected());
      this.detailPanel.add(equipBtn);
    }

    // 버튼: 사용
    if (item.type === 'consumable') {
      const useBtn = this.scene.add.text(cx - 50, cy + ph / 2 - 60, '[ 사용 ]', {
        fontSize: '14px', color: '#5599ff', backgroundColor: '#2a2a4e', padding: { x: 8, y: 4 },
      }).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.useSelected());
      this.detailPanel.add(useBtn);
    }

    // 닫기
    const closeBtn = this.scene.add.text(cx + pw / 2 - 24, cy - ph / 2 + 6, '✕', {
      fontSize: '14px', color: '#ff6666',
    }).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this._closeDetail());
    this.detailPanel.add(closeBtn);

    this.container.add(this.detailPanel);
  }

  private _closeDetail(): void {
    if (this.detailPanel) {
      this.detailPanel.destroy();
      this.detailPanel = null;
    }
    this.selectedItem = null;
    this._renderSlots();
  }

  // ── 정리 ──────────────────────────────────────────────────

  destroy(): void {
    this._closeDetail();
    this.container.destroy();
  }
}
