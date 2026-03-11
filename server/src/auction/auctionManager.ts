/**
 * auctionManager.ts — 거래소/경매장 비즈니스 로직 (P5-06)
 *
 * - 등록 (수수료 5%)
 * - 입찰
 * - 즉시구매 (buyout)
 * - 만료 처리
 * - 취소
 * - 수익 정산
 */

import { prisma } from '../db';
import { redisClient, redisConnected } from '../redis';

// ─── 상수 ──────────────────────────────────────────────────────

const FEE_RATE = 0.05;                     // 등록 수수료 5%
const DEFAULT_DURATION_HOURS = 24;         // 기본 등록 기간
const MAX_DURATION_HOURS = 72;             // 최대 등록 기간
const MIN_BID_INCREMENT_RATE = 0.05;       // 최소 입찰 증가율 5%
const EXPIRE_CHECK_INTERVAL_MS = 60_000;   // 만료 체크 간격 (1분)

// ─── 타입 ──────────────────────────────────────────────────────

export interface ListingCreateParams {
  sellerId: string;
  itemId: string;
  slotId: string;
  quantity?: number;
  priceType?: string;
  buyoutPrice: number;
  bidPrice?: number;
  durationHours?: number;
}

export interface ListingSearchParams {
  itemId?: string;
  priceType?: string;
  minPrice?: number;
  maxPrice?: number;
  status?: string;
  sortBy?: 'price_asc' | 'price_desc' | 'newest' | 'expiring';
  page?: number;
  limit?: number;
}

export interface BidParams {
  listingId: string;
  bidderId: string;
  amount: number;
}

export interface AuctionResult {
  ok: boolean;
  error?: string;
  data?: unknown;
}

// ─── 이벤트 콜백 타입 ──────────────────────────────────────────

type OnListed = (listing: unknown) => void;
type OnBid = (listingId: string, bidderId: string, amount: number) => void;
type OnSold = (listingId: string, buyerId: string, sellerId: string, price: number) => void;

// ─── AuctionManager ────────────────────────────────────────────

class AuctionManager {
  private expireTimer: ReturnType<typeof setInterval> | null = null;
  private _onListed?: OnListed;
  private _onBid?: OnBid;
  private _onSold?: OnSold;

  // ── 콜백 등록 ─────────────────────────────────────────────────

  setOnListed(cb: OnListed): void { this._onListed = cb; }
  setOnBid(cb: OnBid): void { this._onBid = cb; }
  setOnSold(cb: OnSold): void { this._onSold = cb; }

  // ── 등록 ─────────────────────────────────────────────────────

  async createListing(params: ListingCreateParams): Promise<AuctionResult> {
    const {
      sellerId, itemId, slotId,
      quantity = 1,
      priceType = 'gold',
      buyoutPrice,
      bidPrice,
      durationHours = DEFAULT_DURATION_HOURS,
    } = params;

    // 유효성 검사
    if (buyoutPrice <= 0) return { ok: false, error: '즉시구매 가격은 0보다 커야 합니다' };
    if (bidPrice !== undefined && bidPrice <= 0) return { ok: false, error: '입찰 시작가는 0보다 커야 합니다' };
    if (durationHours > MAX_DURATION_HOURS) return { ok: false, error: `최대 등록 기간은 ${MAX_DURATION_HOURS}시간입니다` };

    // 수수료 계산
    const fee = Math.ceil(buyoutPrice * FEE_RATE);

    // 판매자 골드 차감 (수수료)
    const seller = await prisma.user.findUnique({ where: { id: sellerId } });
    if (!seller) return { ok: false, error: '판매자를 찾을 수 없습니다' };
    if (seller.gold < fee) return { ok: false, error: `수수료(${fee} 골드)가 부족합니다` };

    // 인벤토리 슬롯 확인 + 차감
    const slot = await prisma.inventorySlot.findUnique({ where: { id: slotId } });
    if (!slot || slot.userId !== sellerId) return { ok: false, error: '인벤토리 슬롯을 찾을 수 없습니다' };
    if (slot.quantity < quantity) return { ok: false, error: '수량이 부족합니다' };

    const expiresAt = new Date(Date.now() + durationHours * 3600 * 1000);

    // 트랜잭션: 골드 차감 + 인벤 차감 + 등록 생성
    const listing = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: sellerId },
        data: { gold: { decrement: fee } },
      });

      if (slot.quantity === quantity) {
        await tx.inventorySlot.delete({ where: { id: slotId } });
      } else {
        await tx.inventorySlot.update({
          where: { id: slotId },
          data: { quantity: { decrement: quantity } },
        });
      }

      return tx.auctionListing.create({
        data: {
          sellerId,
          itemId,
          slotId,
          quantity,
          priceType,
          buyoutPrice,
          bidPrice: bidPrice ?? null,
          fee,
          expiresAt,
        },
      });
    });

    this._onListed?.(listing);

    // Redis 알림 (선택)
    if (redisConnected) {
      await redisClient.publish('auction:listed', JSON.stringify({ listingId: listing.id, itemId }));
    }

    return { ok: true, data: listing };
  }

  // ── 입찰 ─────────────────────────────────────────────────────

  async placeBid(params: BidParams): Promise<AuctionResult> {
    const { listingId, bidderId, amount } = params;

    const listing = await prisma.auctionListing.findUnique({ where: { id: listingId } });
    if (!listing) return { ok: false, error: '매물을 찾을 수 없습니다' };
    if (listing.status !== 'active') return { ok: false, error: '활성 상태가 아닙니다' };
    if (listing.sellerId === bidderId) return { ok: false, error: '본인 매물에 입찰할 수 없습니다' };
    if (new Date() > listing.expiresAt) return { ok: false, error: '만료된 매물입니다' };

    // 최소 입찰가 체크
    const currentBid = listing.currentBid ?? listing.bidPrice ?? 0;
    const minBid = Math.ceil(currentBid * (1 + MIN_BID_INCREMENT_RATE));
    if (amount < minBid) return { ok: false, error: `최소 입찰가는 ${minBid}입니다` };

    // 입찰자 골드 확인
    const bidder = await prisma.user.findUnique({ where: { id: bidderId } });
    if (!bidder || bidder.gold < amount) return { ok: false, error: '골드가 부족합니다' };

    await prisma.$transaction(async (tx) => {
      // 이전 입찰자에게 환불
      if (listing.bidderId && listing.currentBid) {
        await tx.user.update({
          where: { id: listing.bidderId },
          data: { gold: { increment: listing.currentBid } },
        });
      }

      // 새 입찰자 골드 차감
      await tx.user.update({
        where: { id: bidderId },
        data: { gold: { decrement: amount } },
      });

      // 매물 업데이트
      await tx.auctionListing.update({
        where: { id: listingId },
        data: {
          currentBid: amount,
          bidderId,
        },
      });
    });

    this._onBid?.(listingId, bidderId, amount);

    return { ok: true, data: { listingId, currentBid: amount, bidderId } };
  }

  // ── 즉시구매 ─────────────────────────────────────────────────

  async buyout(listingId: string, buyerId: string): Promise<AuctionResult> {
    const listing = await prisma.auctionListing.findUnique({ where: { id: listingId } });
    if (!listing) return { ok: false, error: '매물을 찾을 수 없습니다' };
    if (listing.status !== 'active') return { ok: false, error: '활성 상태가 아닙니다' };
    if (listing.sellerId === buyerId) return { ok: false, error: '본인 매물을 구매할 수 없습니다' };

    const buyer = await prisma.user.findUnique({ where: { id: buyerId } });
    if (!buyer || buyer.gold < listing.buyoutPrice) return { ok: false, error: '골드가 부족합니다' };

    await prisma.$transaction(async (tx) => {
      // 이전 입찰자 환불
      if (listing.bidderId && listing.currentBid) {
        await tx.user.update({
          where: { id: listing.bidderId },
          data: { gold: { increment: listing.currentBid } },
        });
      }

      // 구매자 골드 차감
      await tx.user.update({
        where: { id: buyerId },
        data: { gold: { decrement: listing.buyoutPrice } },
      });

      // 판매자 수익 정산 (buyoutPrice - fee)
      await tx.user.update({
        where: { id: listing.sellerId },
        data: { gold: { increment: listing.buyoutPrice - listing.fee } },
      });

      // 구매자 인벤토리에 아이템 추가
      await tx.inventorySlot.create({
        data: {
          userId: buyerId,
          itemId: listing.itemId,
          quantity: listing.quantity,
        },
      });

      // 매물 상태 변경
      await tx.auctionListing.update({
        where: { id: listingId },
        data: { status: 'sold' },
      });
    });

    this._onSold?.(listingId, buyerId, listing.sellerId, listing.buyoutPrice);

    return { ok: true, data: { listingId, buyerId, price: listing.buyoutPrice } };
  }

  // ── 취소 ─────────────────────────────────────────────────────

  async cancelListing(listingId: string, userId: string): Promise<AuctionResult> {
    const listing = await prisma.auctionListing.findUnique({ where: { id: listingId } });
    if (!listing) return { ok: false, error: '매물을 찾을 수 없습니다' };
    if (listing.sellerId !== userId) return { ok: false, error: '본인 매물만 취소할 수 있습니다' };
    if (listing.status !== 'active') return { ok: false, error: '활성 상태가 아닙니다' };
    if (listing.currentBid && listing.bidderId) {
      return { ok: false, error: '입찰이 진행 중인 매물은 취소할 수 없습니다' };
    }

    await prisma.$transaction(async (tx) => {
      // 아이템 반환
      await tx.inventorySlot.create({
        data: {
          userId,
          itemId: listing.itemId,
          quantity: listing.quantity,
        },
      });

      // 수수료는 반환하지 않음
      await tx.auctionListing.update({
        where: { id: listingId },
        data: { status: 'cancelled' },
      });
    });

    return { ok: true };
  }

  // ── 만료 처리 ─────────────────────────────────────────────────

  async processExpired(): Promise<number> {
    const now = new Date();
    const expiredListings = await prisma.auctionListing.findMany({
      where: {
        status: 'active',
        expiresAt: { lt: now },
      },
    });

    let processed = 0;

    for (const listing of expiredListings) {
      await prisma.$transaction(async (tx) => {
        if (listing.bidderId && listing.currentBid) {
          // 낙찰 — 입찰자에게 아이템, 판매자에게 수익
          await tx.inventorySlot.create({
            data: {
              userId: listing.bidderId,
              itemId: listing.itemId,
              quantity: listing.quantity,
            },
          });

          // 판매자 수익 정산
          const revenue = listing.currentBid - listing.fee;
          await tx.user.update({
            where: { id: listing.sellerId },
            data: { gold: { increment: Math.max(0, revenue) } },
          });

          await tx.auctionListing.update({
            where: { id: listing.id },
            data: { status: 'sold' },
          });

          this._onSold?.(listing.id, listing.bidderId, listing.sellerId, listing.currentBid);
        } else {
          // 유찰 — 아이템 반환
          await tx.inventorySlot.create({
            data: {
              userId: listing.sellerId,
              itemId: listing.itemId,
              quantity: listing.quantity,
            },
          });

          await tx.auctionListing.update({
            where: { id: listing.id },
            data: { status: 'expired' },
          });
        }
      });

      processed++;
    }

    return processed;
  }

  // ── 조회 ─────────────────────────────────────────────────────

  async getListings(params: ListingSearchParams): Promise<{ items: unknown[]; total: number }> {
    const {
      itemId, priceType, minPrice, maxPrice,
      status = 'active',
      sortBy = 'newest',
      page = 1, limit = 20,
    } = params;

    const where: Record<string, unknown> = { status };
    if (itemId) where.itemId = itemId;
    if (priceType) where.priceType = priceType;
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.buyoutPrice = {
        ...(minPrice !== undefined ? { gte: minPrice } : {}),
        ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
      };
    }

    const orderBy = (() => {
      switch (sortBy) {
        case 'price_asc': return { buyoutPrice: 'asc' as const };
        case 'price_desc': return { buyoutPrice: 'desc' as const };
        case 'expiring': return { expiresAt: 'asc' as const };
        default: return { createdAt: 'desc' as const };
      }
    })();

    const [items, total] = await Promise.all([
      prisma.auctionListing.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auctionListing.count({ where }),
    ]);

    return { items, total };
  }

  /** 특정 유저의 등록/구매 내역 */
  async getUserHistory(userId: string, type: 'selling' | 'buying'): Promise<unknown[]> {
    if (type === 'selling') {
      return prisma.auctionListing.findMany({
        where: { sellerId: userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    }
    return prisma.auctionListing.findMany({
      where: { bidderId: userId, status: 'sold' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  // ── 만료 체크 타이머 ─────────────────────────────────────────

  startExpireTimer(): void {
    if (this.expireTimer) return;
    this.expireTimer = setInterval(async () => {
      try {
        const count = await this.processExpired();
        if (count > 0) console.log(`[Auction] 만료 처리 ${count}건`);
      } catch (err) {
        console.error('[Auction] 만료 처리 실패:', err);
      }
    }, EXPIRE_CHECK_INTERVAL_MS);
  }

  stopExpireTimer(): void {
    if (this.expireTimer) {
      clearInterval(this.expireTimer);
      this.expireTimer = null;
    }
  }
}

// 싱글턴 인스턴스
export const auctionManager = new AuctionManager();
