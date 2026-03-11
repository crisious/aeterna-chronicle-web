/**
 * P6-03 코스메틱 상점 라우트
 * - GET   /api/cosmetics              — 카탈로그 조회
 * - GET   /api/cosmetics/featured     — 추천/한정 아이템
 * - GET   /api/cosmetics/:userId      — 유저 보유 코스메틱
 * - POST  /api/cosmetics/buy          — 구매
 * - PATCH /api/cosmetics/equip        — 장착/해제
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  getCosmeticCatalog,
  getFeaturedCosmetics,
  purchaseCosmetic,
  equipCosmetic,
  unequipCosmetic,
  getPlayerCosmetics,
} from '../cosmetic/cosmeticShop';

// ─── 타입 ───────────────────────────────────────────────────────

interface CatalogQuery {
  category?: string;
  rarity?: string;
  page?: string;
  limit?: string;
}

interface UserIdParams {
  userId: string;
}

interface BuyBody {
  userId: string;
  cosmeticId: string;
}

interface EquipBody {
  userId: string;
  cosmeticId: string;
  action: 'equip' | 'unequip';
}

// ─── 라우트 ─────────────────────────────────────────────────────

export async function cosmeticRoutes(fastify: FastifyInstance): Promise<void> {

  // ── GET /api/cosmetics — 카탈로그 조회 ────────────────────────
  fastify.get('/api/cosmetics', async (
    request: FastifyRequest<{ Querystring: CatalogQuery }>,
    reply: FastifyReply,
  ) => {
    const { category, rarity, page, limit } = request.query;
    const result = await getCosmeticCatalog({
      category,
      rarity,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    return reply.send(result);
  });

  // ── GET /api/cosmetics/featured — 추천/한정 아이템 ────────────
  fastify.get('/api/cosmetics/featured', async (_request, reply: FastifyReply) => {
    const result = await getFeaturedCosmetics();
    return reply.send(result);
  });

  // ── GET /api/cosmetics/:userId — 유저 보유 코스메틱 ───────────
  fastify.get('/api/cosmetics/:userId', async (
    request: FastifyRequest<{ Params: UserIdParams }>,
    reply: FastifyReply,
  ) => {
    const { userId } = request.params;
    const result = await getPlayerCosmetics(userId);
    return reply.send({ cosmetics: result });
  });

  // ── POST /api/cosmetics/buy — 구매 ───────────────────────────
  fastify.post('/api/cosmetics/buy', async (
    request: FastifyRequest<{ Body: BuyBody }>,
    reply: FastifyReply,
  ) => {
    const { userId, cosmeticId } = request.body;

    if (!userId || !cosmeticId) {
      return reply.status(400).send({ error: 'userId와 cosmeticId는 필수입니다.' });
    }

    try {
      const result = await purchaseCosmetic(userId, cosmeticId);
      return reply.status(201).send(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : '구매 실패';
      // P2W 위반은 403
      if (message.includes('P2W')) {
        return reply.status(403).send({ error: message });
      }
      return reply.status(400).send({ error: message });
    }
  });

  // ── PATCH /api/cosmetics/equip — 장착/해제 ───────────────────
  fastify.patch('/api/cosmetics/equip', async (
    request: FastifyRequest<{ Body: EquipBody }>,
    reply: FastifyReply,
  ) => {
    const { userId, cosmeticId, action } = request.body;

    if (!userId || !cosmeticId || !action) {
      return reply.status(400).send({ error: 'userId, cosmeticId, action은 필수입니다.' });
    }

    try {
      if (action === 'equip') {
        const result = await equipCosmetic(userId, cosmeticId);
        return reply.send(result);
      } else {
        const result = await unequipCosmetic(userId, cosmeticId);
        return reply.send(result);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '장착 처리 실패';
      return reply.status(400).send({ error: message });
    }
  });
}
