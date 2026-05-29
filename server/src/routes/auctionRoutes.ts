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

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { ListingCreateParams, BidParams, ListingSearchParams } from '../auction/auctionManager';
import { auctionManager } from '../auction/auctionManager';

// ─── 타입 ──────────────────────────────────────────────────────

interface ListingIdParams { listingId: string }
interface UserIdParams { userId: string }

interface ListBody {
  // sellerId 는 신뢰하지 않음 — 인증된 actor(request.authUserId) 사용
  itemId: string;
  slotId: string;
  quantity?: number;
  priceType?: string;
  buyoutPrice: number;
  bidPrice?: number;
  durationHours?: number;
}

interface BidBody {
  // bidderId 는 신뢰하지 않음 — 인증된 actor 사용
  listingId: string;
  amount: number;
}

interface BuyoutBody {
  // buyerId 는 신뢰하지 않음 — 인증된 actor 사용
  listingId: string;
}

interface CancelBody {
  // userId 는 신뢰하지 않음 — 인증된 actor 사용
  listingId: string;
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
    reply: FastifyReply,
  ) => {
    // 인증된 actor 를 판매자로 사용 (body 의 sellerId 신뢰 금지 — IDOR 차단)
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });

    const body = request.body;
    const params: ListingCreateParams = {
      sellerId: userId,
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
    reply: FastifyReply,
  ) => {
    // 인증된 actor 를 입찰자로 사용 (body 의 bidderId 신뢰 금지 — IDOR 차단)
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });

    const body = request.body;
    const params: BidParams = {
      listingId: body.listingId,
      bidderId: userId,
      amount: body.amount,
    };

    const result = await auctionManager.placeBid(params);
    return { success: result.ok, error: result.error, data: result.data };
  });

  /** POST /api/auction/buyout — 즉시구매 */
  fastify.post('/api/auction/buyout', async (
    request: FastifyRequest<{ Body: BuyoutBody }>,
    reply: FastifyReply,
  ) => {
    // 인증된 actor 를 구매자로 사용 (body 의 buyerId 신뢰 금지 — IDOR 차단)
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });

    const { listingId } = request.body;
    const result = await auctionManager.buyout(listingId, userId);
    return { success: result.ok, error: result.error, data: result.data };
  });

  /** POST /api/auction/cancel — 취소 */
  fastify.post('/api/auction/cancel', async (
    request: FastifyRequest<{ Body: CancelBody }>,
    reply: FastifyReply,
  ) => {
    // 인증된 actor 만 본인 매물을 취소 가능 (body 의 userId 신뢰 금지 — IDOR 차단)
    // cancelListing 내부에서 sellerId === userId 소유권 검증 수행
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });

    const { listingId } = request.body;
    const result = await auctionManager.cancelListing(listingId, userId);
    return { success: result.ok, error: result.error };
  });

  /** GET /api/auction/history/:userId — 유저 거래 내역 (본인만 조회) */
  fastify.get('/api/auction/history/:userId', async (
    request: FastifyRequest<{ Params: UserIdParams; Querystring: { type?: string } }>,
    reply: FastifyReply,
  ) => {
    // 사적 거래 내역 — params 의 userId 신뢰 금지, 인증된 actor 본인 내역만 반환 (IDOR 차단)
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });

    const type = (request.query as { type?: string }).type === 'buying' ? 'buying' : 'selling';
    const history = await auctionManager.getUserHistory(userId, type);
    return { success: true, data: history };
  });
}
