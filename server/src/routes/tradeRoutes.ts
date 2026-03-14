/**
 * tradeRoutes.ts — P27-04: 1:1 거래 시스템 REST API
 *
 * POST   /api/trade/request       — 거래 요청 발송
 * POST   /api/trade/accept        — 거래 수락
 * POST   /api/trade/reject        — 거래 거절
 * POST   /api/trade/offer         — 아이템/골드 등록
 * POST   /api/trade/confirm       — 확인(양측 모두 confirm → 완료)
 * POST   /api/trade/cancel        — 거래 취소
 * GET    /api/trade/:id           — 거래 상태 조회
 * GET    /api/trade/history       — 거래 이력
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../db';

// ── 타입 ──────────────────────────────────────────────────────

interface TradeRequestBody {
  requesterId: string;
  targetId: string;
}

interface TradeIdBody {
  tradeId: string;
  userId: string;
}

interface TradeOfferBody {
  tradeId: string;
  userId: string;
  items: Array<{ itemId: string; quantity: number }>;
  gold: number;
}

interface TradeIdParams {
  id: string;
}

interface TradeHistoryQuery {
  userId: string;
  page?: string;
  limit?: string;
}

type TradeStatus = 'pending' | 'accepted' | 'offering' | 'confirmed' | 'completed' | 'cancelled' | 'rejected';

// ── 유틸 ──────────────────────────────────────────────────────

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : 'Unknown error';
}

// ── 라우트 등록 ─────────────────────────────────────────────────

export async function tradeRoutes(fastify: FastifyInstance): Promise<void> {

  /** POST /api/trade/request — 거래 요청 */
  fastify.post('/api/trade/request', async (request: FastifyRequest, reply: FastifyReply) => {
    const { requesterId, targetId } = request.body as TradeRequestBody;
    if (!requesterId || !targetId) return reply.status(400).send({ error: 'requesterId, targetId 필수' });
    if (requesterId === targetId) return reply.status(400).send({ error: '자기 자신과 거래할 수 없습니다' });

    try {
      // 진행 중인 거래가 있는지 확인
      const existing = await prisma.trade.findFirst({
        where: {
          OR: [
            { requesterId, status: { in: ['pending', 'accepted', 'offering'] } },
            { targetId: requesterId, status: { in: ['pending', 'accepted', 'offering'] } },
          ],
        },
      });
      if (existing) return reply.status(409).send({ error: '이미 진행 중인 거래가 있습니다' });

      const trade = await prisma.trade.create({
        data: {
          requesterId,
          targetId,
          status: 'pending' as TradeStatus,
          expiresAt: new Date(Date.now() + 3 * 60 * 1000), // 3분 만료
        },
      });

      return reply.status(201).send({ trade });
    } catch (err: unknown) {
      return reply.status(400).send({ error: errMsg(err) });
    }
  });

  /** POST /api/trade/accept — 거래 수락 */
  fastify.post('/api/trade/accept', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tradeId, userId } = request.body as TradeIdBody;
    if (!tradeId || !userId) return reply.status(400).send({ error: 'tradeId, userId 필수' });

    try {
      const trade = await prisma.trade.findUnique({ where: { id: tradeId } });
      if (!trade) return reply.status(404).send({ error: '거래를 찾을 수 없습니다' });
      if (trade.targetId !== userId) return reply.status(403).send({ error: '거래 대상만 수락할 수 있습니다' });
      if (trade.status !== 'pending') return reply.status(400).send({ error: `현재 상태에서 수락 불가 (${trade.status})` });

      const updated = await prisma.trade.update({
        where: { id: tradeId },
        data: { status: 'offering' as TradeStatus },
      });

      return reply.send({ trade: updated });
    } catch (err: unknown) {
      return reply.status(400).send({ error: errMsg(err) });
    }
  });

  /** POST /api/trade/reject — 거래 거절 */
  fastify.post('/api/trade/reject', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tradeId, userId } = request.body as TradeIdBody;
    if (!tradeId || !userId) return reply.status(400).send({ error: 'tradeId, userId 필수' });

    try {
      const trade = await prisma.trade.findUnique({ where: { id: tradeId } });
      if (!trade) return reply.status(404).send({ error: '거래를 찾을 수 없습니다' });
      if (trade.targetId !== userId && trade.requesterId !== userId) {
        return reply.status(403).send({ error: '거래 참여자만 거절할 수 있습니다' });
      }

      const updated = await prisma.trade.update({
        where: { id: tradeId },
        data: { status: 'rejected' as TradeStatus },
      });

      return reply.send({ trade: updated });
    } catch (err: unknown) {
      return reply.status(400).send({ error: errMsg(err) });
    }
  });

  /** POST /api/trade/offer — 아이템/골드 등록 */
  fastify.post('/api/trade/offer', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tradeId, userId, items, gold } = request.body as TradeOfferBody;
    if (!tradeId || !userId) return reply.status(400).send({ error: 'tradeId, userId 필수' });

    try {
      const trade = await prisma.trade.findUnique({ where: { id: tradeId } });
      if (!trade) return reply.status(404).send({ error: '거래를 찾을 수 없습니다' });
      if (trade.status !== 'offering') return reply.status(400).send({ error: '아이템 등록 단계가 아닙니다' });

      const isRequester = trade.requesterId === userId;
      const isTarget = trade.targetId === userId;
      if (!isRequester && !isTarget) return reply.status(403).send({ error: '거래 참여자가 아닙니다' });

      // 골드 보유량 확인
      if (gold > 0) {
        const character = await prisma.character.findFirst({
          where: { userId, isActive: true },
          select: { gold: true },
        });
        if (!character || character.gold < gold) {
          return reply.status(400).send({ error: '골드가 부족합니다' });
        }
      }

      // 아이템 보유 확인
      for (const item of items) {
        const inv = await prisma.inventoryItem.findFirst({
          where: { userId, itemId: item.itemId, quantity: { gte: item.quantity } },
        });
        if (!inv) return reply.status(400).send({ error: `아이템 ${item.itemId} 수량 부족` });
      }

      // offer 저장
      const offerField = isRequester ? 'requesterOffer' : 'targetOffer';
      const updated = await prisma.trade.update({
        where: { id: tradeId },
        data: {
          [offerField]: JSON.stringify({ items, gold }),
          // 오퍼 변경 시 양측 확인 초기화
          requesterConfirmed: isRequester ? false : trade.requesterConfirmed,
          targetConfirmed: isTarget ? false : trade.targetConfirmed,
        },
      });

      return reply.send({ trade: updated });
    } catch (err: unknown) {
      return reply.status(400).send({ error: errMsg(err) });
    }
  });

  /** POST /api/trade/confirm — 확인(양측 모두 → 거래 완료) */
  fastify.post('/api/trade/confirm', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tradeId, userId } = request.body as TradeIdBody;
    if (!tradeId || !userId) return reply.status(400).send({ error: 'tradeId, userId 필수' });

    try {
      const trade = await prisma.trade.findUnique({ where: { id: tradeId } });
      if (!trade) return reply.status(404).send({ error: '거래를 찾을 수 없습니다' });
      if (trade.status !== 'offering') return reply.status(400).send({ error: '확인 가능한 상태가 아닙니다' });

      const isRequester = trade.requesterId === userId;
      const isTarget = trade.targetId === userId;
      if (!isRequester && !isTarget) return reply.status(403).send({ error: '거래 참여자가 아닙니다' });

      const data: Record<string, unknown> = {};
      if (isRequester) data.requesterConfirmed = true;
      if (isTarget) data.targetConfirmed = true;

      const requesterConfirmed = isRequester ? true : trade.requesterConfirmed;
      const targetConfirmed = isTarget ? true : trade.targetConfirmed;
      const bothConfirmed = requesterConfirmed && targetConfirmed;

      if (bothConfirmed) {
        data.status = 'completed';
        data.completedAt = new Date();

        // 실제 아이템/골드 교환 트랜잭션
        const requesterOffer = trade.requesterOffer ? JSON.parse(trade.requesterOffer as string) : { items: [], gold: 0 };
        const targetOffer = trade.targetOffer ? JSON.parse(trade.targetOffer as string) : { items: [], gold: 0 };

        // 골드 교환
        const goldDiff = requesterOffer.gold - targetOffer.gold;
        if (goldDiff !== 0) {
          await prisma.$transaction([
            prisma.character.updateMany({
              where: { userId: trade.requesterId, isActive: true },
              data: { gold: { increment: -requesterOffer.gold + targetOffer.gold } },
            }),
            prisma.character.updateMany({
              where: { userId: trade.targetId, isActive: true },
              data: { gold: { increment: -targetOffer.gold + requesterOffer.gold } },
            }),
          ]);
        }
      }

      const updated = await prisma.trade.update({
        where: { id: tradeId },
        data,
      });

      return reply.send({ trade: updated, completed: bothConfirmed });
    } catch (err: unknown) {
      return reply.status(400).send({ error: errMsg(err) });
    }
  });

  /** POST /api/trade/cancel — 거래 취소 */
  fastify.post('/api/trade/cancel', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tradeId, userId } = request.body as TradeIdBody;
    if (!tradeId || !userId) return reply.status(400).send({ error: 'tradeId, userId 필수' });

    try {
      const trade = await prisma.trade.findUnique({ where: { id: tradeId } });
      if (!trade) return reply.status(404).send({ error: '거래를 찾을 수 없습니다' });
      if (trade.requesterId !== userId && trade.targetId !== userId) {
        return reply.status(403).send({ error: '거래 참여자만 취소할 수 있습니다' });
      }
      if (trade.status === 'completed' || trade.status === 'cancelled') {
        return reply.status(400).send({ error: `이미 종료된 거래입니다 (${trade.status})` });
      }

      const updated = await prisma.trade.update({
        where: { id: tradeId },
        data: { status: 'cancelled' as TradeStatus },
      });

      return reply.send({ trade: updated });
    } catch (err: unknown) {
      return reply.status(400).send({ error: errMsg(err) });
    }
  });

  /** GET /api/trade/:id — 거래 상태 조회 */
  fastify.get('/api/trade/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as TradeIdParams;

    try {
      const trade = await prisma.trade.findUnique({ where: { id } });
      if (!trade) return reply.status(404).send({ error: '거래를 찾을 수 없습니다' });
      return reply.send({ trade });
    } catch (err: unknown) {
      return reply.status(500).send({ error: errMsg(err) });
    }
  });

  /** GET /api/trade/history — 거래 이력 조회 */
  fastify.get('/api/trade/history', async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId, page: pageStr, limit: limitStr } = request.query as TradeHistoryQuery;
    if (!userId) return reply.status(400).send({ error: 'userId 필수' });

    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const limit = limitStr ? Math.min(parseInt(limitStr, 10), 50) : 20;

    try {
      const where = {
        OR: [{ requesterId: userId }, { targetId: userId }],
        status: { in: ['completed', 'cancelled', 'rejected'] as TradeStatus[] },
      };

      const [trades, total] = await prisma.$transaction([
        prisma.trade.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: (page - 1) * limit,
        }),
        prisma.trade.count({ where }),
      ]);

      return reply.send({ trades, total, page, pages: Math.ceil(total / limit) });
    } catch (err: unknown) {
      return reply.status(500).send({ error: errMsg(err) });
    }
  });
}
