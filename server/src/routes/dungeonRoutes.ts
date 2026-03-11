/**
 * dungeonRoutes.ts — 던전 REST API (P5-03)
 *
 * GET    /api/dungeons              — 던전 목록 (지역/난이도 필터)
 * GET    /api/dungeons/:code        — 던전 상세
 * POST   /api/dungeons/enter        — 던전 입장
 * POST   /api/dungeons/runs/:id/advance — 웨이브 진행
 * POST   /api/dungeons/runs/:id/clear   — 클리어 처리
 * GET    /api/dungeons/history/:userId  — 유저별 클리어 이력
 */
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../db';
import { dungeonManager } from '../dungeon/dungeonManager';

// ─── 타입 ───────────────────────────────────────────────────────

interface DungeonListQuery {
  zoneId?: string;
  difficulty?: string;
  region?: string;
}

interface DungeonCodeParams {
  code: string;
}

interface EnterBody {
  dungeonCode: string;
  leaderId: string;
  memberIds?: string[];
}

interface RunIdParams {
  id: string;
}

interface AdvanceBody {
  userId: string;
  damageDealt?: number;
}

interface HistoryParams {
  userId: string;
}

// ─── 스키마 ─────────────────────────────────────────────────────

const enterSchema = {
  body: {
    type: 'object' as const,
    required: ['dungeonCode', 'leaderId'],
    properties: {
      dungeonCode: { type: 'string' as const },
      leaderId: { type: 'string' as const },
      memberIds: { type: 'array' as const, items: { type: 'string' as const } },
    },
  },
};

const advanceSchema = {
  body: {
    type: 'object' as const,
    required: ['userId'],
    properties: {
      userId: { type: 'string' as const },
      damageDealt: { type: 'number' as const },
    },
  },
};

// ─── 라우트 등록 ────────────────────────────────────────────────

export async function dungeonRoutes(fastify: FastifyInstance): Promise<void> {
  // 던전 목록
  fastify.get('/api/dungeons', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as DungeonListQuery;
    const where: Record<string, unknown> = {};
    if (query.zoneId) where.zoneId = query.zoneId;
    if (query.difficulty) where.difficulty = query.difficulty;

    const dungeons = await prisma.dungeon.findMany({
      where,
      orderBy: [{ requiredLevel: 'asc' }, { difficulty: 'asc' }],
    });
    return reply.send({ ok: true, dungeons });
  });

  // 던전 상세
  fastify.get('/api/dungeons/:code', async (request: FastifyRequest, reply: FastifyReply) => {
    const { code } = request.params as DungeonCodeParams;
    const dungeon = await prisma.dungeon.findUnique({ where: { code } });
    if (!dungeon) return reply.status(404).send({ ok: false, error: '던전을 찾을 수 없습니다.' });
    return reply.send({ ok: true, dungeon });
  });

  // 던전 입장
  fastify.post('/api/dungeons/enter', { schema: enterSchema }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { dungeonCode, leaderId, memberIds } = request.body as EnterBody;
    const result = await dungeonManager.enter(dungeonCode, leaderId, memberIds ?? []);
    if (!result.ok) return reply.status(400).send(result);
    return reply.send(result);
  });

  // 웨이브 진행
  fastify.post('/api/dungeons/runs/:id/advance', { schema: advanceSchema }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as RunIdParams;
    const { userId, damageDealt } = request.body as AdvanceBody;
    const result = await dungeonManager.advanceWave(id, userId, damageDealt ?? 0);
    if (!result.ok) return reply.status(400).send(result);
    return reply.send(result);
  });

  // 클리어 처리
  fastify.post('/api/dungeons/runs/:id/clear', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as RunIdParams;
    const result = await dungeonManager.clear(id);
    if ('ok' in result && !result.ok) return reply.status(400).send(result);
    return reply.send({ ok: true, result });
  });

  // 유저별 클리어 이력
  fastify.get('/api/dungeons/history/:userId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.params as HistoryParams;
    const runs = await prisma.dungeonRun.findMany({
      where: { leaderId: userId },
      orderBy: { startedAt: 'desc' },
      take: 50,
    });
    return reply.send({ ok: true, runs });
  });
}
