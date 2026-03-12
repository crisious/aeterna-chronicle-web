/**
 * npcRoutes.ts — NPC REST API 라우트
 *
 * GET  /api/npcs                      — NPC 목록 (location/role 필터)
 * GET  /api/npcs/:id                  — NPC 상세 + 대화 트리
 * POST /api/npcs/:id/dialogue         — 대화 시작 (호감도 +1~3)
 * POST /api/npcs/:id/gift             — 선물 (호감도 +5~20)
 * GET  /api/npcs/:id/affinity/:userId — 호감도 조회
 * POST /api/npcs/:id/trade            — 거래
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../db';
import { getAffinity, onDialogue, onGift } from '../npc/affinitySystem';
import type { GiftPreference } from '../npc/affinitySystem';

// ── 타입 정의 ─────────────────────────────────────────────────

interface NpcListQuery {
  location?: string;
  role?: string;
  page?: string;
  limit?: string;
}

interface NpcIdParams {
  id: string;
}

interface AffinityParams {
  id: string;
  userId: string;
}

interface DialogueBody {
  userId: string;
  dialogueNodeId?: string;
}

interface GiftBody {
  userId: string;
  itemId: string;
}

interface TradeBody {
  userId: string;
  itemId: string;
  quantity: number;
}

// ── 라우트 등록 ───────────────────────────────────────────────

export async function npcRoutes(fastify: FastifyInstance): Promise<void> {

  // ── GET /api/npcs — NPC 목록 (location/role 필터, 페이지네이션) ──
  fastify.get('/api/npcs', async (
    request: FastifyRequest<{ Querystring: NpcListQuery }>,
    _reply: FastifyReply
  ) => {
    const { location, role, page = '1', limit = '20' } = request.query;
    const take = Math.min(parseInt(limit, 10) || 20, 100);
    const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;

    const where: Record<string, unknown> = { isActive: true };
    if (location) where.location = location;
    if (role) where.role = role;

    const [npcs, total] = await Promise.all([
      prisma.npc.findMany({
        where,
        select: {
          id: true,
          name: true,
          title: true,
          role: true,
          location: true,
          isActive: true,
        },
        skip,
        take,
        orderBy: { name: 'asc' },
      }),
      prisma.npc.count({ where }),
    ]);

    return {
      npcs,
      pagination: { page: parseInt(page, 10) || 1, limit: take, total },
    };
  });

  // ── GET /api/npcs/:id — NPC 상세 + 대화 트리 ──
  fastify.get('/api/npcs/:id', async (
    request: FastifyRequest<{ Params: NpcIdParams }>,
    reply: FastifyReply
  ) => {
    const { id } = request.params;
    const npc = await prisma.npc.findUnique({ where: { id } });

    if (!npc) {
      return reply.status(404).send({ error: 'NPC를 찾을 수 없습니다.' });
    }

    return npc;
  });

  // ── POST /api/npcs/:id/dialogue — 대화 시작 ──
  fastify.post('/api/npcs/:id/dialogue', async (
    request: FastifyRequest<{ Params: NpcIdParams; Body: DialogueBody }>,
    reply: FastifyReply
  ) => {
    const { id } = request.params;
    const { userId, dialogueNodeId } = request.body;

    if (!userId) {
      return reply.status(400).send({ error: 'userId가 필요합니다.' });
    }

    const npc = await prisma.npc.findUnique({ where: { id } });
    if (!npc) {
      return reply.status(404).send({ error: 'NPC를 찾을 수 없습니다.' });
    }

    // 대화 트리에서 해당 노드 찾기
    const dialogueTree = npc.dialogue as Array<{
      id: string;
      text: string;
      options?: Array<{ text: string; nextId?: string; condition?: string }>;
    }>;

    const targetNodeId = dialogueNodeId ?? 'greeting';
    const node = dialogueTree.find((d) => d.id === targetNodeId);

    if (!node) {
      return reply.status(404).send({ error: `대화 노드 '${targetNodeId}'를 찾을 수 없습니다.` });
    }

    // 호감도 증가 (대화 시 +1~3)
    const affinityResult = await onDialogue(userId, id);

    return {
      npcId: id,
      npcName: npc.name,
      dialogue: node,
      affinity: {
        level: affinityResult.level,
        exp: affinityResult.exp,
        tier: affinityResult.tier,
        leveledUp: affinityResult.leveledUp,
      },
    };
  });

  // ── POST /api/npcs/:id/gift — 선물 ──
  fastify.post('/api/npcs/:id/gift', async (
    request: FastifyRequest<{ Params: NpcIdParams; Body: GiftBody }>,
    reply: FastifyReply
  ) => {
    const { id } = request.params;
    const { userId, itemId } = request.body;

    if (!userId || !itemId) {
      return reply.status(400).send({ error: 'userId와 itemId가 필요합니다.' });
    }

    const npc = await prisma.npc.findUnique({ where: { id } });
    if (!npc) {
      return reply.status(404).send({ error: 'NPC를 찾을 수 없습니다.' });
    }

    // shopItems에서 선호도 추출 (시드 데이터의 giftPreferences 대용)
    // 실제 운영에서는 NPC별 선호도 테이블을 별도로 운영할 수 있음
    const preferences: GiftPreference[] = [];

    const affinityResult = await onGift(userId, id, itemId, preferences);

    return {
      npcId: id,
      npcName: npc.name,
      giftItem: itemId,
      affinity: {
        level: affinityResult.level,
        exp: affinityResult.exp,
        tier: affinityResult.tier,
        unlockedFeatures: affinityResult.unlockedFeatures,
        leveledUp: affinityResult.leveledUp,
      },
    };
  });

  // ── GET /api/npcs/:id/affinity/:userId — 호감도 조회 ──
  fastify.get('/api/npcs/:id/affinity/:userId', async (
    request: FastifyRequest<{ Params: AffinityParams }>,
    reply: FastifyReply
  ) => {
    const { id, userId } = request.params;

    const npc = await prisma.npc.findUnique({ where: { id } });
    if (!npc) {
      return reply.status(404).send({ error: 'NPC를 찾을 수 없습니다.' });
    }

    const affinity = await getAffinity(userId, id);
    return {
      npcName: npc.name,
      ...affinity,
    };
  });

  // ── POST /api/npcs/:id/trade — 거래 ──
  fastify.post('/api/npcs/:id/trade', async (
    request: FastifyRequest<{ Params: NpcIdParams; Body: TradeBody }>,
    reply: FastifyReply
  ) => {
    const { id } = request.params;
    const { userId, itemId, quantity } = request.body;

    if (!userId || !itemId || !quantity || quantity < 1) {
      return reply.status(400).send({ error: 'userId, itemId, quantity(≥1)가 필요합니다.' });
    }

    const npc = await prisma.npc.findUnique({ where: { id } });
    if (!npc) {
      return reply.status(404).send({ error: 'NPC를 찾을 수 없습니다.' });
    }

    if (npc.role !== 'merchant') {
      return reply.status(400).send({ error: '이 NPC는 상인이 아닙니다.' });
    }

    // 판매 목록에서 아이템 찾기
    const shopItems = (npc.shopItems ?? []) as Array<{
      itemId: string;
      name: string;
      price: number;
      currency: string;
    }>;

    const item = shopItems.find((si) => si.itemId === itemId);
    if (!item) {
      return reply.status(404).send({ error: '해당 아이템을 판매하지 않습니다.' });
    }

    // 호감도에 따른 할인 계산
    const affinity = await getAffinity(userId, id);
    const discountRate = affinity.unlockedFeatures.includes('discount_10') ? 0.1 : 0;
    const unitPrice = Math.floor(item.price * (1 - discountRate));
    const totalPrice = unitPrice * quantity;

    // 화폐 잔액 검증 + 차감
    const currencyField = (item.currency === 'gold' ? 'gold' : item.currency) as keyof typeof user;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return reply.status(404).send({ error: '유저를 찾을 수 없습니다.' });
    }

    const balance = (user as Record<string, unknown>)[currencyField] as number | undefined;
    if (balance === undefined || balance < totalPrice) {
      return reply.status(400).send({
        error: '잔액이 부족합니다.',
        required: totalPrice,
        current: balance ?? 0,
        currency: item.currency,
      });
    }

    // 트랜잭션: 화폐 차감 + 거래 로그 기록
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { [currencyField]: { decrement: totalPrice } },
      }),
      prisma.transactionLog.create({
        data: {
          userId,
          currency: item.currency,
          amount: -totalPrice,
          balance: balance - totalPrice,
          reason: 'npc_trade',
          referenceId: `${id}:${item.itemId}`,
        },
      }),
    ]);

    return {
      npcId: id,
      npcName: npc.name,
      item: {
        itemId: item.itemId,
        name: item.name,
        unitPrice,
        quantity,
        totalPrice,
        currency: item.currency,
        discount: discountRate > 0 ? `${discountRate * 100}%` : null,
      },
      message: `${item.name} x${quantity}을(를) ${totalPrice} ${item.currency}에 구매했습니다.`,
    };
  });
}
