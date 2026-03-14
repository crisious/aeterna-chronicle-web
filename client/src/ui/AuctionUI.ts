/**
 * AuctionUI — P27-06: 경매장 UI
 *
 * 기능:
 * - 아이템 검색/필터 (타입, 등급, 가격 범위)
 * - 매물 등록 (인벤토리에서 선택 → 가격 설정)
 * - 입찰/즉시구매
 * - 내 경매 관리 (등록 목록, 입찰 목록)
 * - auctionRoutes + auctionSocketHandler 연동
 */

import * as Phaser from 'phaser';
import { NetworkManager } from '../network/NetworkManager';

// ── 타입 ──────────────────────────────────────────────────────

export interface AuctionListing {
  listingId: string;
  sellerId: string;
  sellerName: string;
  itemId: string;
  itemName: string;
  itemIcon: string;
  rarity: string;
  quantity: number;
  buyoutPrice: number;
  currentBid: number;
  bidCount: number;
  expiresAt: number;
  isMine: boolean;
}

export type AuctionTab = 'search' | 'myListings' | 'myBids';
export type AuctionSortKey = 'price' | 'time' | 'rarity' | 'name';

interface FilterState {
  type: string;
  rarity: string;
  minPrice: number;
  maxPrice: number;
  query: string;
}

interface ListingRow {
  container: Phaser.GameObjects.Container;
  listing: AuctionListing;
}

const RARITY_COLORS: Record<string, number> = {
  common: 0xaaaaaa, uncommon: 0x55cc55, rare: 0x5599ff, epic: 0xbb55ff, legendary: 0xffaa00,
};

// ── 메인 클래스 ───────────────────────────────────────────────

export class AuctionUI {
  private scene: Phaser.Scene;
  private net: NetworkManager;
  private container: Phaser.GameObjects.Container;

  private activeTab: AuctionTab = 'search';
  private listings: AuctionListing[] = [];
  private listingRows: ListingRow[] = [];
  private filter: FilterState = { type: '', rarity: '', minPrice: 0, maxPrice: 0, query: '' };
  private currentPage = 1;
  private totalPages = 1;

  private contentContainer!: Phaser.GameObjects.Container;
  private pageText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;

  private readonly PANEL_W = 620;
  private readonly PANEL_H = 480;

  constructor(scene: Phaser.Scene, net: NetworkManager) {
    this.scene = scene;
    this.net = net;
    this.container = scene.add.container(0, 0);
    this.container.setDepth(940);
    this.container.setVisible(false);

    this.createAuctionPanel();
    this.bindSocketEvents();
  }

  // ═══ 패널 생성 ═══

  private createAuctionPanel(): void {
    const cx = this.scene.scale.width / 2;
    const cy = this.scene.scale.height / 2;
    const px = cx - this.PANEL_W / 2;
    const py = cy - this.PANEL_H / 2;

    // 딤
    const dim = this.scene.add.rectangle(0, 0, this.scene.scale.width, this.scene.scale.height, 0x000000, 0.5)
      .setOrigin(0, 0).setInteractive();
    this.container.add(dim);

    // 메인 배경
    const bg = this.scene.add.rectangle(px, py, this.PANEL_W, this.PANEL_H, 0x1a1a2e, 0.96)
      .setOrigin(0, 0).setStrokeStyle(2, 0xffaa00);
    this.container.add(bg);

    // 제목 + 닫기
    const title = this.scene.add.text(px + 12, py + 10, '🏪 경매장', {
      fontSize: '16px', color: '#ffcc44', fontStyle: 'bold',
    });
    const closeBtn = this.createButton(px + this.PANEL_W - 40, py + 10, '✕', () => this.hide());
    this.container.add([title, closeBtn]);

    // 탭 버튼
    const tabs: Array<{ label: string; tab: AuctionTab }> = [
      { label: '🔍 검색', tab: 'search' },
      { label: '📋 내 등록', tab: 'myListings' },
      { label: '💰 내 입찰', tab: 'myBids' },
    ];
    tabs.forEach((t, i) => {
      const btn = this.createButton(px + 12 + i * 90, py + 36, t.label, () => this.switchTab(t.tab));
      this.container.add(btn);
    });

    // 콘텐츠 영역
    this.contentContainer = this.scene.add.container(px, py + 65);
    this.container.add(this.contentContainer);

    // 페이지 네비
    this.pageText = this.scene.add.text(cx, py + this.PANEL_H - 20, '1 / 1', {
      fontSize: '11px', color: '#aaaaaa',
    }).setOrigin(0.5);
    const prevBtn = this.createButton(cx - 60, py + this.PANEL_H - 25, '◀', () => this.changePage(-1));
    const nextBtn = this.createButton(cx + 40, py + this.PANEL_H - 25, '▶', () => this.changePage(1));
    this.container.add([this.pageText, prevBtn, nextBtn]);

    // 상태
    this.statusText = this.scene.add.text(px + 12, py + this.PANEL_H - 20, '', {
      fontSize: '10px', color: '#888888',
    });
    this.container.add(this.statusText);
  }

  private createButton(x: number, y: number, label: string, callback: () => void): Phaser.GameObjects.Text {
    const btn = this.scene.add.text(x, y, label, {
      fontSize: '11px', color: '#ffffff', backgroundColor: '#3a4a6a',
      padding: { x: 8, y: 4 },
    }).setInteractive({ useHandCursor: true });
    btn.on('pointerdown', callback);
    return btn;
  }

  // ═══ 소켓 ═══

  private bindSocketEvents(): void {
    const socket = this.net.getSocket();
    if (!socket) return;

    socket.on('auction:newListing', () => {
      if (this.container.visible && this.activeTab === 'search') this.loadListings();
    });

    socket.on('auction:sold', (data: { listingId: string }) => {
      this.listings = this.listings.filter(l => l.listingId !== data.listingId);
      this.refreshContent();
    });

    socket.on('auction:outbid', (data: { listingId: string; newBid: number }) => {
      const listing = this.listings.find(l => l.listingId === data.listingId);
      if (listing) {
        listing.currentBid = data.newBid;
        listing.bidCount += 1;
        this.refreshContent();
      }
    });
  }

  // ═══ 탭 전환 ═══

  private switchTab(tab: AuctionTab): void {
    this.activeTab = tab;
    this.currentPage = 1;
    this.loadListings();
  }

  // ═══ 데이터 로드 ═══

  private async loadListings(): Promise<void> {
    try {
      let endpoint = '/api/auction';
      const params = new URLSearchParams();
      params.set('page', String(this.currentPage));
      params.set('limit', '10');

      if (this.activeTab === 'myListings') {
        endpoint = `/api/auction/history/${this.net.getUserId()}`;
      } else if (this.activeTab === 'myBids') {
        params.set('bidderId', this.net.getUserId());
      }

      if (this.filter.type) params.set('type', this.filter.type);
      if (this.filter.rarity) params.set('rarity', this.filter.rarity);
      if (this.filter.query) params.set('q', this.filter.query);

      const resp = await this.net.httpGet(`${endpoint}?${params.toString()}`);
      this.listings = resp.listings ?? resp.data ?? [];
      this.totalPages = resp.pages ?? 1;
      this.refreshContent();
    } catch (err) {
      console.error('[AuctionUI] 로드 실패:', err);
      this.statusText.setText('로드 실패').setColor('#ff4444');
    }
  }

  // ═══ 콘텐츠 갱신 ═══

  private refreshContent(): void {
    this.contentContainer.removeAll(true);
    this.listingRows = [];

    // 헤더
    const header = this.scene.add.text(12, 0,
      '아이템                     가격           입찰     남은시간',
      { fontSize: '10px', color: '#888888' },
    );
    this.contentContainer.add(header);

    this.listings.forEach((listing, idx) => {
      const row = this.createListingRow(listing, idx);
      this.listingRows.push(row);
    });

    if (this.listings.length === 0) {
      const empty = this.scene.add.text(12, 30, '매물이 없습니다', { fontSize: '12px', color: '#666666' });
      this.contentContainer.add(empty);
    }

    this.pageText.setText(`${this.currentPage} / ${this.totalPages}`);
  }

  private createListingRow(listing: AuctionListing, idx: number): ListingRow {
    const y = 20 + idx * 36;
    const rowContainer = this.scene.add.container(0, y);

    const bg = this.scene.add.rectangle(12, 0, this.PANEL_W - 36, 32, 0x252540, 0.8)
      .setOrigin(0, 0).setStrokeStyle(1, RARITY_COLORS[listing.rarity] ?? 0x3a3a5a);
    const icon = this.scene.add.text(18, 4, listing.itemIcon || '📦', { fontSize: '14px' });
    const name = this.scene.add.text(40, 4, `${listing.itemName} x${listing.quantity}`, {
      fontSize: '11px', color: '#ffffff',
    });
    const price = this.scene.add.text(280, 4, `${listing.buyoutPrice.toLocaleString()}G`, {
      fontSize: '11px', color: '#ffcc44',
    });
    const bid = this.scene.add.text(380, 4, listing.currentBid > 0 ? `${listing.currentBid.toLocaleString()}G (${listing.bidCount})` : '-', {
      fontSize: '10px', color: '#aaaaaa',
    });

    const remain = Math.max(0, listing.expiresAt - Date.now());
    const hours = Math.floor(remain / 3600000);
    const mins = Math.floor((remain % 3600000) / 60000);
    const timeText = this.scene.add.text(480, 4, `${hours}h ${mins}m`, { fontSize: '10px', color: '#aaaaaa' });

    rowContainer.add([bg, icon, name, price, bid, timeText]);

    if (!listing.isMine) {
      const buyBtn = this.createButton(this.PANEL_W - 80, 2, '구매', () => this.buyout(listing.listingId));
      const bidBtn = this.createButton(this.PANEL_W - 130, 2, '입찰', () => this.placeBid(listing.listingId, listing.currentBid));
      rowContainer.add([buyBtn, bidBtn]);
    } else {
      const cancelBtn = this.createButton(this.PANEL_W - 80, 2, '취소', () => this.cancelListing(listing.listingId));
      rowContainer.add(cancelBtn);
    }

    this.contentContainer.add(rowContainer);
    return { container: rowContainer, listing };
  }

  // ═══ 액션 ═══

  private async buyout(listingId: string): Promise<void> {
    try {
      await this.net.httpPost('/api/auction/buyout', { listingId, buyerId: this.net.getUserId() });
      this.statusText.setText('즉시 구매 완료').setColor('#44ff44');
      this.loadListings();
    } catch (err) {
      console.error('[AuctionUI] 구매 실패:', err);
      this.statusText.setText('구매 실패').setColor('#ff4444');
    }
  }

  private async placeBid(listingId: string, currentBid: number): Promise<void> {
    const bidAmount = currentBid > 0 ? Math.ceil(currentBid * 1.05) : 100;
    try {
      await this.net.httpPost('/api/auction/bid', {
        listingId,
        bidderId: this.net.getUserId(),
        amount: bidAmount,
      });
      this.statusText.setText(`${bidAmount.toLocaleString()}G 입찰 완료`).setColor('#44ff44');
      this.loadListings();
    } catch (err) {
      console.error('[AuctionUI] 입찰 실패:', err);
      this.statusText.setText('입찰 실패').setColor('#ff4444');
    }
  }

  private async cancelListing(listingId: string): Promise<void> {
    try {
      await this.net.httpPost('/api/auction/cancel', { listingId });
      this.statusText.setText('등록 취소됨').setColor('#88ccff');
      this.loadListings();
    } catch (err) {
      console.error('[AuctionUI] 취소 실패:', err);
    }
  }

  public async registerItem(itemId: string, slotId: string, buyoutPrice: number, bidPrice?: number): Promise<void> {
    try {
      await this.net.httpPost('/api/auction/list', {
        sellerId: this.net.getUserId(),
        itemId,
        slotId,
        buyoutPrice,
        bidPrice,
        durationHours: 24,
      });
      this.statusText.setText('등록 완료').setColor('#44ff44');
      this.switchTab('myListings');
    } catch (err) {
      console.error('[AuctionUI] 등록 실패:', err);
      this.statusText.setText('등록 실패').setColor('#ff4444');
    }
  }

  private changePage(delta: number): void {
    const newPage = this.currentPage + delta;
    if (newPage >= 1 && newPage <= this.totalPages) {
      this.currentPage = newPage;
      this.loadListings();
    }
  }

  // ═══ 공개 API ═══

  public show(): void { this.container.setVisible(true); this.loadListings(); }
  public hide(): void { this.container.setVisible(false); }
  public toggle(): void { this.container.visible ? this.hide() : this.show(); }
  public isVisible(): boolean { return this.container.visible; }
  public destroy(): void { this.container.destroy(); }
}
