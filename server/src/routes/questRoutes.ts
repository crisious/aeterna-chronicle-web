/**
 * 퀘스트 REST API 라우트
 * P4-06: 퀘스트 시스템
 */
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../db';
import {
  acceptQuest,
  updateQuestProgress,
  completeQuest,
  abandonQuest,
  QuestError,
  ObjectiveType,
} from '../quest/questEngine';

// ─── 요청 타입 정의 ─────────────────────────────────────────────
interface QuestIdParams {
  id: string;
}

interface UserIdParams {
  userId: string;
}

interface AcceptBody {
  userId: string;
  playerLevel: number;
}

interface ProgressBody {
  userId: string;
  eventType: ObjectiveType;
  target: string;
  count?: number;
}

interface CompleteBody {
  userId: string;
}

interface AbandonBody {
  userId: string;
}

interface QuestListQuery {
  type?: string;
  page?: string;
  limit?: string;
}

// ─── 에러 핸들러 ────────────────────────────────────────────────
function handleQuestError(error: unknown, reply: FastifyReply): FastifyReply {
  if (error instanceof QuestError) {
    const statusMap: Record<string, number> = {
      NOT_FOUND: 404,
      ALREADY_ACCEPTED: 409,
      LEVEL_TOO_LOW: 403,
      PREREQUISITE_MISSING: 403,
      NOT_IN_PROGRESS: 400,
      NOT_COMPLETE: 400,
      ALREADY_COMPLETED: 409,
    };
    const status = statusMap[error.code] ?? 400;
    return reply.status(status).send({ error: error.code, message: error.message });
  }
  console.error('[QuestRoutes] 예상치 못한 에러:', error);
  return reply.status(500).send({ error: 'INTERNAL', message: '서버 오류' });
}

// ─── 라우트 등록 ────────────────────────────────────────────────
export async function questRoutes(fastify: FastifyInstance): Promise<void> {

  /**
   * GET /api/quests — 퀘스트 목록 (type 필터, 페이지네이션)
   */
  fastify.get('/api/quests', async (
    request: FastifyRequest<{ Querystring: QuestListQuery }>,
    reply: FastifyReply
  ) => {
    const { type, page = '1', limit = '50' } = request.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const where = type ? { type } : {};

    const [quests, total] = await Promise.all([
      prisma.quest.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: [{ type: 'asc' }, { requiredLevel: 'asc' }],
      }),
      prisma.quest.count({ where }),
    ]);

    return reply.send({
      quests,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
    });
  });

  /**
   * POST /api/quests/:id/accept — 퀘스트 수주
   */
  fastify.post('/api/quests/:id/accept', async (
    request: FastifyRequest<{ Params: QuestIdParams; Body: AcceptBody }>,
    reply: FastifyReply
  ) => {
    try {
      const { id } = request.params;
      const { userId, playerLevel } = request.body;

      if (!userId || playerLevel == null) {
        return reply.status(400).send({ error: 'BAD_REQUEST', message: 'userId, playerLevel 필수' });
      }

      const result = await acceptQuest(userId, id, playerLevel);
      return reply.status(201).send(result);
    } catch (error) {
      return handleQuestError(error, reply);
    }
  });

  /**
   * PATCH /api/quests/:id/progress — 진행 업데이트
   */
  fastify.patch('/api/quests/:id/progress', async (
    request: FastifyRequest<{ Params: QuestIdParams; Body: ProgressBody }>,
    reply: FastifyReply
  ) => {
    try {
      const { userId, eventType, target, count } = request.body;

      if (!userId || !eventType || !target) {
        return reply.status(400).send({ error: 'BAD_REQUEST', message: 'userId, eventType, target 필수' });
      }

      const results = await updateQuestProgress(userId, eventType, target, count ?? 1);
      return reply.send({ updated: results });
    } catch (error) {
      return handleQuestError(error, reply);
    }
  });

  /**
   * POST /api/quests/:id/complete — 완료 + 보상
   */
  fastify.post('/api/quests/:id/complete', async (
    request: FastifyRequest<{ Params: QuestIdParams; Body: CompleteBody }>,
    reply: FastifyReply
  ) => {
    try {
      const { id } = request.params;
      const { userId } = request.body;

      if (!userId) {
        return reply.status(400).send({ error: 'BAD_REQUEST', message: 'userId 필수' });
      }

      const result = await completeQuest(userId, id);
      return reply.send(result);
    } catch (error) {
      return handleQuestError(error, reply);
    }
  });

  /**
   * POST /api/quests/:id/abandon — 포기
   */
  fastify.post('/api/quests/:id/abandon', async (
    request: FastifyRequest<{ Params: QuestIdParams; Body: AbandonBody }>,
    reply: FastifyReply
  ) => {
    try {
      const { id } = request.params;
      const { userId } = request.body;

      if (!userId) {
        return reply.status(400).send({ error: 'BAD_REQUEST', message: 'userId 필수' });
      }

      await abandonQuest(userId, id);
      return reply.send({ success: true, message: '퀘스트를 포기했습니다.' });
    } catch (error) {
      return handleQuestError(error, reply);
    }
  });

  /**
   * GET /api/quests/:userId/active — 진행 중 퀘스트 목록
   */
  fastify.get('/api/quests/:userId/active', async (
    request: FastifyRequest<{ Params: UserIdParams }>,
    reply: FastifyReply
  ) => {
    const { userId } = request.params;

    const activeProgress = await prisma.questProgress.findMany({
      where: { userId, status: 'in_progress' },
      orderBy: { startedAt: 'desc' },
    });

    // 퀘스트 상세 정보 함께 반환
    const questIds = activeProgress.map((qp) => qp.questId);
    const quests = await prisma.quest.findMany({
      where: { id: { in: questIds } },
    });
    const questMap = new Map(quests.map((q) => [q.id, q]));

    const result = activeProgress.map((qp) => ({
      ...qp,
      quest: questMap.get(qp.questId) ?? null,
    }));

    return reply.send({ active: result, count: result.length });
  });
}
