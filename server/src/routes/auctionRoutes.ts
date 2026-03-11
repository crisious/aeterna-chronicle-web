/**
 * P5-06: 거래소/경매장 REST API 라우트
 *
 * GET    /api/auction                — 매물 목록/검색
 * GET    /api/auction/:listingId     — 매물 상세
 * POST   /api/auction/list           — 매물 등록
 * POST   /api/auction/bid            — 입찰
 * POST   /api/auction/buyout         — 즉시구매
 * POST   /api/auction/cancel         — 취소
 * GET    /api/auction/history/:userId — 유저 거래 내역
 */

import { FastifyInstance, FastifyRequest } from 'fastify';
import { auctionManager, ListingCreateParams, BidParams, ListingSearchParams } from '../auction/auctionManager';

// ─── 타입 ──────────────────────────────────────────────────────

interface ListingIdParams { listingId: string }
interface UserIdParams { userId: string }

interface ListBody {
  sellerId: string;
  itemId: string;
  slotId: string;
  quantity?: number;
  priceType?: string;
  buyoutPrice: number;
  bidPrice?: number;
  durationHours?: number;
}

interface BidBody {
  listingId: string;
  bidderId: string;
  amount: number;
}

interface BuyoutBody {
  listingId: string;
  buyerId: string;
}

interface CancelBody {
  listingId: string;
  userId: string;
}

// ─── 라우트 등록 ────────────────────────────────────────────────

export async function auctionRoutes(fastify: FastifyInstance): Promise<void> {

  /** GET /api/auction — 매물 목록/검색 */
  fastify.get('/api/auction', async (
    request: FastifyRequest<{ Querystring: ListingSearchParams }>,
  ) => {
    const q = request.query;
    const result = await auctionManager.getListings({
      itemId: q.itemId,
      priceType: q.priceType,
      minPrice: q.minPrice ? Number(q.minPrice) : undefined,
      maxPrice: q.maxPrice ? Number(q.maxPrice) : undefined,
      status: q.status,
      sortBy: q.sortBy,
      page: q.page ? Number(q.page) : 1,
      limit: q.limit ? Number(q.limit) : 20,
    });

    return { success: true, data: result };
  });

  /** GET /api/auction/:listingId — 매물 상세 */
  fastify.get('/api/auction/:listingId', async (
    request: FastifyRequest<{ Params: ListingIdParams }>,
  ) => {
    const { listingId } = request.params;
    const { prisma } = await import('../db');
    const listing = await prisma.auctionListing.findUnique({
      where: { id: listingId },
    });
    if (!listing) {
      return { success: false, error: '매물을 찾을 수 없습니다' };
    }
    return { success: true, data: listing };
  });

  /** POST /api/auction/list — 매물 등록 */
  fastify.post('/api/auction/list', async (
    request: FastifyRequest<{ Body: ListBody }>,
  ) => {
    const body = request.body;
    const params: ListingCreateParams = {
      sellerId: body.sellerId,
      itemId: body.itemId,
      slotId: body.slotId,
      quantity: body.quantity,
      priceType: body.priceType,
      buyoutPrice: body.buyoutPrice,
      bidPrice: body.bidPrice,
      durationHours: body.durationHours,
    };

    const result = await auctionManager.createListing(params);
    return { success: result.ok, error: result.error, data: result.data };
  });

  /** POST /api/auction/bid — 입찰 */
  fastify.post('/api/auction/bid', async (
    request: FastifyRequest<{ Body: BidBody }>,
  ) => {
    const body = request.body;
    const params: BidParams = {
      listingId: body.listingId,
      bidderId: body.bidderId,
      amount: body.amount,
    };

    const result = await auctionManager.placeBid(params);
    return { success: result.ok, error: result.error, data: result.data };
  });

  /** POST /api/auction/buyout — 즉시구매 */
  fastify.post('/api/auction/buyout', async (
    request: FastifyRequest<{ Body: BuyoutBody }>,
  ) => {
    const { listingId, buyerId } = request.body;
    const result = await auctionManager.buyout(listingId, buyerId);
    return { success: result.ok, error: result.error, data: result.data };
  });

  /** POST /api/auction/cancel — 취소 */
  fastify.post('/api/auction/cancel', async (
    request: FastifyRequest<{ Body: CancelBody }>,
  ) => {
    const { listingId, userId } = request.body;
    const result = await auctionManager.cancelListing(listingId, userId);
    return { success: result.ok, error: result.error };
  });

  /** GET /api/auction/history/:userId — 유저 거래 내역 */
  fastify.get('/api/auction/history/:userId', async (
    request: FastifyRequest<{ Params: UserIdParams; Querystring: { type?: string } }>,
  ) => {
    const { userId } = request.params;
    const type = (request.query as { type?: string }).type === 'buying' ? 'buying' : 'selling';
    const history = await auctionManager.getUserHistory(userId, type);
    return { success: true, data: history };
  });
}
