/**
 * transcendenceRoutes.ts — 초월/강화 REST API (P11-06)
 *
 * GET  /api/transcendence/info/:itemId — 초월 정보
 * POST /api/transcendence/attempt      — 초월 시도
 * GET  /api/transcendence/history      — 초월 이력
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../db';
import {
  getTranscendenceInfo,
  attemptTranscendence,
  getTranscendenceStatBonus,
} from '../craft/transcendenceManager';

// ─── 타입 정의 ──────────────────────────────────────────────────

interface ItemIdParams {
  itemId: string;
}

interface AttemptBody {
  // playerId 는 body 에서 받지 않고 인증된 행위자(request.authUserId)를 사용한다 (IDOR 방지)
  equipmentId: string;
  useProtection?: boolean;
}

interface HistoryQuery {
  // playerId 는 query 에서 받지 않고 인증된 행위자(request.authUserId)를 사용한다 (IDOR 방지)
  limit?: string;
}

// ─── 라우트 등록 ────────────────────────────────────────────────

export async function transcendenceRoutes(fastify: FastifyInstance): Promise<void> {

  /**
   * GET /api/transcendence/info/:itemId — 초월 정보
   * 현재 장비의 초월 상태 + 다음 단계 확률/재료 정보
   */
  fastify.get('/api/transcendence/info/:itemId', async (
    request: FastifyRequest<{ Params: ItemIdParams }>,
    reply: FastifyReply,
  ) => {
    // 인증된 행위자 확인 (IDOR 방지)
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });

    const { itemId } = request.params;

    const equipment = await prisma.equipment.findUnique({
      where: { id: itemId },
    });

    if (!equipment) {
      return reply.status(404).send({ error: '장비를 찾을 수 없습니다.' });
    }

    // 소유권 검증: 장비 소유자(ownerId)가 인증된 행위자와 일치해야 한다
    if (equipment.ownerId !== userId) {
      return reply.status(403).send({ error: '권한이 없습니다.' });
    }

    const currentLevel = (equipment as any).transcendenceLevel ?? 0;
    const info = getTranscendenceInfo(currentLevel);
    const statBonus = getTranscendenceStatBonus(currentLevel);

    return {
      equipmentId: itemId,
      currentLevel,
      statBonus,
      ...info,
    };
  });

  /**
   * POST /api/transcendence/attempt — 초월 시도
   */
  fastify.post('/api/transcendence/attempt', async (
    request: FastifyRequest<{ Body: AttemptBody }>,
    reply: FastifyReply,
  ) => {
    try {
      // 인증된 행위자를 actor 로 사용 (body 의 playerId 신뢰 금지 — IDOR 방지)
      const userId = request.authUserId;
      if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });

      const { equipmentId, useProtection } = request.body;
      if (!equipmentId) {
        return reply.status(400).send({ error: 'equipmentId는 필수입니다.' });
      }

      // attemptTranscendence 내부에서 equipment.ownerId !== playerId 검증 → 소유권 보장
      const result = await attemptTranscendence(userId, equipmentId, useProtection);

      return reply.status(200).send(result);
    } catch (err) {
      return reply.status(400).send({ error: (err as Error).message });
    }
  });

  /**
   * GET /api/transcendence/history — 초월 이력
   * ?limit=20 (이력은 인증된 행위자 기준으로 조회됨)
   */
  fastify.get('/api/transcendence/history', async (
    request: FastifyRequest<{ Querystring: HistoryQuery }>,
    reply: FastifyReply,
  ) => {
    // 인증된 행위자의 이력만 조회 (query 의 playerId 신뢰 금지 — IDOR 방지)
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });

    const { limit: limitStr } = request.query;

    const limit = Math.min(Number(limitStr) || 20, 100);

    const history = await prisma.transcendenceLog.findMany({
      where: { playerId: userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return {
      playerId: userId,
      total: history.length,
      history,
    };
  });
}
