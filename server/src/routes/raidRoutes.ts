/**
 * raidRoutes.ts — 레이드 보스 REST API
 *
 * GET  /api/raids/bosses          — 활성 보스 목록
 * POST /api/raids/sessions        — 레이드 세션 생성
 * POST /api/raids/sessions/:id/join — 세션 참가
 * GET  /api/raids/sessions/:id    — 세션 상태 조회
 * GET  /api/raids/history/:userId — 유저별 클리어 이력
 */
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../db';
import { raidManager } from '../raid/raidManager';

// ─── 타입 정의 ──────────────────────────────────────────────────

interface SessionCreateBody {
  bossId: string;
  userId: string;
  guildId?: string;
}

interface SessionJoinBody {
  userId: string;
  role?: string;
}

interface SessionIdParams {
  id: string;
}

interface HistoryParams {
  userId: string;
}

interface BossListQuery {
  tier?: string;
}

// ─── JSON Schema (Fastify validation) ───────────────────────────

const sessionCreateSchema = {
  body: {
    type: 'object' as const,
    required: ['bossId', 'userId'],
    properties: {
      bossId: { type: 'string' as const },
      userId: { type: 'string' as const },
      guildId: { type: 'string' as const },
    },
  },
};

const sessionJoinSchema = {
  body: {
    type: 'object' as const,
    required: ['userId'],
    properties: {
      userId: { type: 'string' as const },
      role: { type: 'string' as const },
    },
  },
};

// ─── 라우트 등록 ────────────────────────────────────────────────

export async function raidRoutes(fastify: FastifyInstance): Promise<void> {

  /**
   * GET /api/raids/bosses — 활성 보스 목록
   * ?tier=heroic 으로 티어 필터 가능
   */
  fastify.get('/api/raids/bosses', async (
    request: FastifyRequest<{ Querystring: BossListQuery }>,
    _reply: FastifyReply,
  ) => {
    const { tier } = request.query;

    const where: Record<string, unknown> = { isActive: true };
    if (tier) where.tier = tier;

    const bosses = await prisma.raidBoss.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return { bosses };
  });

  /**
   * POST /api/raids/sessions — 레이드 세션 생성
   */
  fastify.post('/api/raids/sessions', {
    schema: sessionCreateSchema,
  }, async (
    request: FastifyRequest<{ Body: SessionCreateBody }>,
    reply: FastifyReply,
  ) => {
    try {
      const { bossId, userId, guildId } = request.body;
      const session = await raidManager.createSession(bossId, userId, guildId);

      return reply.status(201).send({
        sessionId: session.sessionId,
        bossId: session.bossId,
        status: session.status,
        currentHp: session.currentHp,
        maxHp: session.maxHp,
        participants: Array.from(session.participants.values()),
      });
    } catch (err) {
      return reply.status(400).send({ error: (err as Error).message });
    }
  });

  /**
   * POST /api/raids/sessions/:id/join — 세션 참가
   */
  fastify.post('/api/raids/sessions/:id/join', {
    schema: sessionJoinSchema,
  }, async (
    request: FastifyRequest<{ Params: SessionIdParams; Body: SessionJoinBody }>,
    reply: FastifyReply,
  ) => {
    try {
      const { id } = request.params;
      const { userId, role } = request.body;
      const session = await raidManager.joinSession(id, userId, role);

      return reply.send({
        sessionId: id,
        status: session.status,
        participants: Array.from(session.participants.values()),
      });
    } catch (err) {
      return reply.status(400).send({ error: (err as Error).message });
    }
  });

  /**
   * GET /api/raids/sessions/:id — 세션 상태 조회
   * 메모리 캐시 우선 → 없으면 DB fallback
   */
  fastify.get('/api/raids/sessions/:id', async (
    request: FastifyRequest<{ Params: SessionIdParams }>,
    reply: FastifyReply,
  ) => {
    const { id } = request.params;

    // 메모리 캐시 조회
    const cached = raidManager.getSession(id);
    if (cached) {
      return {
        sessionId: cached.sessionId,
        bossId: cached.bossId,
        guildId: cached.guildId,
        status: cached.status,
        currentHp: cached.currentHp,
        maxHp: cached.maxHp,
        participants: Array.from(cached.participants.values()),
        startedAt: cached.startedAt ? new Date(cached.startedAt).toISOString() : null,
      };
    }

    // DB fallback (종료된 세션 등)
    const dbSession = await prisma.raidSession.findUnique({
      where: { id },
      include: { boss: true },
    });

    if (!dbSession) {
      return reply.status(404).send({ error: '세션을 찾을 수 없습니다.' });
    }

    return {
      sessionId: dbSession.id,
      bossId: dbSession.bossId,
      guildId: dbSession.guildId,
      status: dbSession.status,
      currentHp: dbSession.currentHp,
      maxHp: dbSession.boss.maxHp,
      participants: dbSession.participants,
      startedAt: dbSession.startedAt?.toISOString() ?? null,
      endedAt: dbSession.endedAt?.toISOString() ?? null,
      lootResult: dbSession.lootResult,
    };
  });

  /**
   * GET /api/raids/history/:userId — 유저별 클리어 이력
   * cleared 상태인 세션 중 참가자에 userId가 포함된 것만 반환
   */
  fastify.get('/api/raids/history/:userId', async (
    request: FastifyRequest<{ Params: HistoryParams }>,
    _reply: FastifyReply,
  ) => {
    const { userId } = request.params;

    // Prisma의 Json 필터링은 제한적이므로 raw query 사용
    const sessions = await prisma.raidSession.findMany({
      where: { status: 'cleared' },
      include: { boss: true },
      orderBy: { endedAt: 'desc' },
    });

    // 참가자 배열에서 userId 필터링 (JSON 내부 검색)
    type SessionWithBoss = typeof sessions[number];
    const history = sessions.filter((s: SessionWithBoss) => {
      const participants = s.participants as Array<{ userId: string }>;
      return participants.some((p) => p.userId === userId);
    });

    return {
      userId,
      totalClears: history.length,
      history: history.map((s: SessionWithBoss) => ({
        sessionId: s.id,
        bossName: s.boss.name,
        bossTier: s.boss.tier,
        endedAt: s.endedAt?.toISOString(),
        lootResult: s.lootResult,
      })),
    };
  });
}
