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

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../db';

// ── 타입 ──────────────────────────────────────────────────────

interface TradeRequestBody {
  // SECURITY-IDOR: 개시 주체(requesterId)는 body 가 아니라 request.authUserId 로 고정한다.
  // body 에서는 상대방(targetId)만 받는다.
  targetId: string;
}

interface TradeIdBody {
  // SECURITY-IDOR: 행위 주체(userId)는 body 에서 받지 않고 request.authUserId 를 사용한다.
  tradeId: string;
}

interface TradeOfferBody {
  // SECURITY-IDOR: 오퍼 등록 주체(userId)는 body 가 아니라 request.authUserId 로 고정한다.
  tradeId: string;
  items?: Array<{ itemId: string; quantity: number }>;
  gold: number;
}

interface TradeIdParams {
  id: string;
}

interface TradeHistoryQuery {
  // SECURITY-IDOR: 조회 대상(userId)은 query 가 아니라 request.authUserId 로 고정한다.
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
    const { targetId } = request.body as TradeRequestBody;
    // SECURITY-IDOR: 개시 주체는 인증된 사용자로 고정 (body.requesterId 위조 시 타인 명의 거래 개시·슬롯 점유 DoS 가능)
    const requesterId = request.authUserId;
    if (!requesterId) return reply.status(401).send({ error: '인증이 필요합니다.' });
    if (!targetId) return reply.status(400).send({ error: 'targetId 필수' });
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
    const { tradeId } = request.body as TradeIdBody;
    // SECURITY-IDOR: 행위 주체는 인증된 사용자로 고정 (body.userId 위조 시 타인 명의로 거래 수락/거절/확인/취소 조작 가능)
    const userId = request.authUserId;
    if (!tradeId) return reply.status(400).send({ error: 'tradeId 필수' });
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });

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
    const { tradeId } = request.body as TradeIdBody;
    // SECURITY-IDOR: 행위 주체는 인증된 사용자로 고정 (body.userId 위조 시 타인 명의로 거래 수락/거절/확인/취소 조작 가능)
    const userId = request.authUserId;
    if (!tradeId) return reply.status(400).send({ error: 'tradeId 필수' });
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });

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
    const { tradeId, items, gold } = request.body as TradeOfferBody;
    // SECURITY-IDOR: 등록 주체는 인증된 사용자로 고정 (body.userId 위조 시 상대 참여자 명의로
    // 그 사람의 자산을 건 오퍼를 등록·변조 가능 → confirm 단계 자산 탈취 조작)
    const userId = request.authUserId;
    if (!tradeId) return reply.status(400).send({ error: 'tradeId 필수' });
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });

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

      // 아이템 보유 확인 (items 미전달 = 골드만 거는 오퍼 → 빈 배열로 처리)
      for (const item of items ?? []) {
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
    const { tradeId } = request.body as TradeIdBody;
    // SECURITY-IDOR: 행위 주체는 인증된 사용자로 고정 (body.userId 위조 시 타인 명의로 거래 수락/거절/확인/취소 조작 가능)
    const userId = request.authUserId;
    if (!tradeId) return reply.status(400).send({ error: 'tradeId 필수' });
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });

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

        // 골드 + 아이템 교환
        const goldDiff = requesterOffer.gold - targetOffer.gold;

        await prisma.$transaction(async (tx) => {
          // 골드 교환: requester gives requesterOffer.gold, receives targetOffer.gold (net = target - requester)
          if (goldDiff !== 0) {
            await tx.character.updateMany({
              where: { userId: trade.requesterId, isActive: true },
              data: { gold: { increment: targetOffer.gold - requesterOffer.gold } },
            });
            await tx.character.updateMany({
              where: { userId: trade.targetId, isActive: true },
              data: { gold: { increment: requesterOffer.gold - targetOffer.gold } },
            });
          }

          // SECURITY-TODO(후속 배치): 아래 inventorySlot.update 는 client 가 offer 에 넣은
          // item.slotId 를 소유자 제약 없이 신뢰한다(where 에 userId 없음). 더해 offer 는
          // items 를 {itemId,quantity} 로 저장하는데 여기선 item.slotId 를 읽어 필드 불일치 —
          // 현재 slotId 는 항상 undefined 라 교환이 사실상 no-op(선재 기능 버그)이지만, 데이터흐름을
          // 고칠 때 반드시 (a) offer 단계에서 slotId 의 실제 소유를 inventorySlot 기준 검증,
          // (b) updateMany({ where:{ id, userId: 소유자 } }) + 영향행수 0 시 롤백으로 막아야 한다.
          // 그렇지 않으면 임의 slotId 주입으로 타인 슬롯을 탈취하는 IDOR 가 열린다.
          // 아이템 교환: requester의 아이템 → target에게
          for (const item of requesterOffer.items ?? []) {
            await tx.inventorySlot.update({
              where: { id: item.slotId },
              data: { userId: trade.targetId },
            });
          }

          // 아이템 교환: target의 아이템 → requester에게
          for (const item of targetOffer.items ?? []) {
            await tx.inventorySlot.update({
              where: { id: item.slotId },
              data: { userId: trade.requesterId },
            });
          }
        });
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
    const { tradeId } = request.body as TradeIdBody;
    // SECURITY-IDOR: 행위 주체는 인증된 사용자로 고정 (body.userId 위조 시 타인 명의로 거래 수락/거절/확인/취소 조작 가능)
    const userId = request.authUserId;
    if (!tradeId) return reply.status(400).send({ error: 'tradeId 필수' });
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });

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
    // SECURITY-IDOR: 참여자만 조회 가능 (id 만 알면 타인 거래의 오퍼 내역·골드·양측 ID 가 노출됐었음)
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });

    try {
      const trade = await prisma.trade.findUnique({ where: { id } });
      if (!trade) return reply.status(404).send({ error: '거래를 찾을 수 없습니다' });
      if (trade.requesterId !== userId && trade.targetId !== userId) {
        return reply.status(403).send({ error: '거래 참여자만 조회할 수 있습니다' });
      }
      return reply.send({ trade });
    } catch (err: unknown) {
      return reply.status(500).send({ error: errMsg(err) });
    }
  });

  /** GET /api/trade/history — 거래 이력 조회 */
  fastify.get('/api/trade/history', async (request: FastifyRequest, reply: FastifyReply) => {
    const { page: pageStr, limit: limitStr } = request.query as TradeHistoryQuery;
    // SECURITY-IDOR: 본인 이력만 조회 (query.userId 위조 시 타인의 거래 이력 전체 열람 가능했음)
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });

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
