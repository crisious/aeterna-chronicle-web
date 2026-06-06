/**
 * 퀘스트 REST API 라우트
 * P4-06: 퀘스트 시스템
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../db';
import type {
  ObjectiveType} from '../quest/questEngine';
import {
  acceptQuest,
  updateQuestProgress,
  completeQuest,
  abandonQuest,
  QuestError
} from '../quest/questEngine';
import { buildQuestGuide, type QuestObjectiveInput } from '../../../shared/types/scenarioRegistry';

// ─── 요청 타입 정의 ─────────────────────────────────────────────
interface QuestIdParams {
  id: string;
}

interface UserIdParams {
  userId: string;
}

interface AcceptBody {
  // IDOR 방지: userId 는 body 에서 받지 않고 인증된 행위자(request.authUserId)를 사용한다.
  playerLevel: number;
}

interface ProgressBody {
  // IDOR 방지: userId 는 body 에서 받지 않고 인증된 행위자(request.authUserId)를 사용한다.
  eventType: ObjectiveType;
  target: string;
  count?: number;
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

    // 각 퀘스트에 objective 파생 가이드를 부착한다(SYNC-258). objectives({type,target,count,description})는
    // 시드 그대로 DB(JSON)에 저장돼 있으므로, 모든 퀘스트가 서버 권위 가이드를 갖게 된다.
    const questsWithGuide = quests.map((q) => ({
      ...q,
      guide: buildQuestGuide(((q.objectives as unknown) as QuestObjectiveInput[]) ?? []),
    }));

    return reply.send({
      quests: questsWithGuide,
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
      // IDOR 방지: body 의 userId 대신 인증된 행위자를 actor 로 사용한다.
      const userId = request.authUserId;
      if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });

      const { id } = request.params;
      // 보안: 클라가 보낸 playerLevel 을 신뢰하지 않는다(위조로 요구레벨 게이팅 우회 방지).
      // DB 캐릭터 레벨(유저 캐릭터 최고)을 권위값으로 사용. (#237/#240 과 동일 원칙)
      const character = await prisma.character.findFirst({
        where: { userId },
        orderBy: { level: 'desc' },
        select: { level: true },
      });
      const playerLevel = character?.level ?? 1;

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
      // IDOR 방지: body 의 userId 대신 인증된 행위자를 actor 로 사용한다.
      const userId = request.authUserId;
      if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });

      const { eventType, target, count } = request.body;

      if (!eventType || !target) {
        return reply.status(400).send({ error: 'BAD_REQUEST', message: 'eventType, target 필수' });
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
    request: FastifyRequest<{ Params: QuestIdParams }>,
    reply: FastifyReply
  ) => {
    try {
      // IDOR 방지: body 의 userId 대신 인증된 행위자를 actor 로 사용한다.
      const userId = request.authUserId;
      if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });

      const { id } = request.params;

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
    request: FastifyRequest<{ Params: QuestIdParams }>,
    reply: FastifyReply
  ) => {
    try {
      // IDOR 방지: body 의 userId 대신 인증된 행위자를 actor 로 사용한다.
      const userId = request.authUserId;
      if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });

      const { id } = request.params;

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
    // IDOR 방지: params 의 userId 를 신뢰하지 않고 인증된 행위자 본인의 진행 목록만 조회한다.
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });

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

    const result = activeProgress.map((qp) => {
      const quest = questMap.get(qp.questId) ?? null;
      // progress-aware 가이드(SYNC-258): objective 별 완료 플래그를 진행도에서 병합해
      // buildQuestGuide 가 "첫 미완료 objective"를 현재 안내로 고르게 한다(진행에 따라 안내가 따라감).
      const objectives = ((quest?.objectives as unknown) as QuestObjectiveInput[]) ?? [];
      const progress = ((qp.progress as unknown) as Array<{ objectiveIndex: number; completed?: boolean }>) ?? [];
      const merged = objectives.map((o, i) => ({
        ...o,
        completed: progress.find((p) => p.objectiveIndex === i)?.completed ?? false,
      }));
      return { ...qp, quest, guide: buildQuestGuide(merged) };
    });

    return reply.send({ active: result, count: result.length });
  });

  /**
   * GET /api/quests/:userId/completed — 완료(turned_in)된 퀘스트 ID 목록
   * 로비 보드가 이미 끝낸 퀘스트를 '완료됨'으로 표시(다시 [수주] 노출 방지)하는 데 쓴다.
   */
  fastify.get('/api/quests/:userId/completed', async (
    request: FastifyRequest<{ Params: UserIdParams }>,
    reply: FastifyReply
  ) => {
    // IDOR 방지: params 의 userId 를 신뢰하지 않고 인증된 행위자 본인의 완료 목록만 조회한다.
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });

    const done = await prisma.questProgress.findMany({
      where: { userId, status: 'completed' },
      select: { questId: true },
    });
    const completed = done.map((d) => d.questId);
    return reply.send({ completed, count: completed.length });
  });
}
