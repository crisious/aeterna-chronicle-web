/**
 * transcendenceRoutes.ts — 초월/강화 REST API (P11-06)
 *
 * GET  /api/transcendence/info/:itemId — 초월 정보
 * POST /api/transcendence/attempt      — 초월 시도
 * GET  /api/transcendence/history      — 초월 이력
 */
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../db';
import {
  getTranscendenceInfo,
  attemptTranscendence,
  getTranscendenceStatBonus,
  TRANSCENDENCE_TABLE,
} from '../craft/transcendenceManager';

// ─── 타입 정의 ──────────────────────────────────────────────────

interface ItemIdParams {
  itemId: string;
}

interface AttemptBody {
  playerId: string;
  equipmentId: string;
  useProtection?: boolean;
}

interface HistoryQuery {
  playerId: string;
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
    const { itemId } = request.params;

    const equipment = await prisma.equipment.findUnique({
      where: { id: itemId },
    });

    if (!equipment) {
      return reply.status(404).send({ error: '장비를 찾을 수 없습니다.' });
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
      const { playerId, equipmentId, useProtection } = request.body;
      if (!playerId || !equipmentId) {
        return reply.status(400).send({ error: 'playerId, equipmentId는 필수입니다.' });
      }

      const result = await attemptTranscendence(playerId, equipmentId, useProtection);

      return reply.status(200).send(result);
    } catch (err) {
      return reply.status(400).send({ error: (err as Error).message });
    }
  });

  /**
   * GET /api/transcendence/history — 초월 이력
   * ?playerId=xxx&limit=20
   */
  fastify.get('/api/transcendence/history', async (
    request: FastifyRequest<{ Querystring: HistoryQuery }>,
    reply: FastifyReply,
  ) => {
    const { playerId, limit: limitStr } = request.query;
    if (!playerId) {
      return reply.status(400).send({ error: 'playerId는 필수입니다.' });
    }

    const limit = Math.min(Number(limitStr) || 20, 100);

    const history = await prisma.transcendenceLog.findMany({
      where: { playerId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return {
      playerId,
      total: history.length,
      history,
    };
  });
}
