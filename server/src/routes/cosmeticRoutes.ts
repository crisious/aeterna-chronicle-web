/**
 * P6-03 코스메틱 상점 라우트
 * - GET   /api/cosmetics              — 카탈로그 조회
 * - GET   /api/cosmetics/featured     — 추천/한정 아이템
 * - GET   /api/cosmetics/:userId      — 유저 보유 코스메틱
 * - POST  /api/cosmetics/buy          — 구매
 * - PATCH /api/cosmetics/equip        — 장착/해제
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
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
  cosmeticId: string;
}

interface EquipBody {
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
  // IDOR 방지: 경로의 :userId 를 신뢰하지 않고 인증된 행위자(request.authUserId)의
  // 보유 코스메틱만 반환한다. (개인 데이터 조회)
  fastify.get('/api/cosmetics/:userId', async (
    request: FastifyRequest<{ Params: UserIdParams }>,
    reply: FastifyReply,
  ) => {
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });

    const result = await getPlayerCosmetics(userId);
    return reply.send({ cosmetics: result });
  });

  // ── POST /api/cosmetics/buy — 구매 ───────────────────────────
  fastify.post('/api/cosmetics/buy', async (
    request: FastifyRequest<{ Body: BuyBody }>,
    reply: FastifyReply,
  ) => {
    // IDOR 방지: body 의 userId 를 신뢰하지 않고 인증된 행위자를 구매 주체로 사용한다.
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });

    const { cosmeticId } = request.body;

    if (!cosmeticId) {
      return reply.status(400).send({ error: 'cosmeticId는 필수입니다.' });
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
    // IDOR 방지: body 의 userId 를 신뢰하지 않고 인증된 행위자를 장착 주체로 사용한다.
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });

    const { cosmeticId, action } = request.body;

    if (!cosmeticId || !action) {
      return reply.status(400).send({ error: 'cosmeticId, action은 필수입니다.' });
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
