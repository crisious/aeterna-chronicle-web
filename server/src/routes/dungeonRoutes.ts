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
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
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
  memberIds?: string[];
}

interface RunIdParams {
  id: string;
}

interface AdvanceBody {
  damageDealt?: number;
}

// ─── 스키마 ─────────────────────────────────────────────────────

const enterSchema = {
  body: {
    type: 'object' as const,
    required: ['dungeonCode'],
    properties: {
      dungeonCode: { type: 'string' as const },
      memberIds: { type: 'array' as const, items: { type: 'string' as const } },
    },
  },
};

const advanceSchema = {
  body: {
    type: 'object' as const,
    properties: {
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
    // SECURITY-IDOR: 리더(actor)는 body 가 아닌 인증된 사용자로 강제한다.
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ ok: false, error: '인증이 필요합니다.' });
    const { dungeonCode, memberIds } = request.body as EnterBody;
    const result = await dungeonManager.enter(dungeonCode, userId, memberIds ?? []);
    if (!result.ok) return reply.status(400).send(result);
    return reply.send(result);
  });

  // 웨이브 진행
  fastify.post('/api/dungeons/runs/:id/advance', { schema: advanceSchema }, async (request: FastifyRequest, reply: FastifyReply) => {
    // SECURITY-IDOR: 데미지를 기록할 actor 는 body 가 아닌 인증된 사용자로 강제한다.
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ ok: false, error: '인증이 필요합니다.' });
    const { id } = request.params as RunIdParams;
    const { damageDealt } = request.body as AdvanceBody;
    const result = await dungeonManager.advanceWave(id, userId, damageDealt ?? 0);
    if (!result.ok) return reply.status(400).send(result);
    return reply.send(result);
  });

  // 클리어 처리
  fastify.post('/api/dungeons/runs/:id/clear', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ ok: false, error: '인증이 필요합니다.' });
    const { id } = request.params as RunIdParams;

    // SECURITY-IDOR: runId 는 공격자 제어값이므로 런 소유자(리더)가 본인인지 검증한다.
    const run = await prisma.dungeonRun.findUnique({ where: { id }, select: { leaderId: true } });
    if (!run) return reply.status(404).send({ ok: false, error: '런을 찾을 수 없습니다.' });
    if (run.leaderId !== userId) {
      return reply.status(403).send({ ok: false, error: '본인 런이 아닙니다.' });
    }

    const result = await dungeonManager.clear(id);
    if ('ok' in result && !result.ok) return reply.status(400).send(result);
    return reply.send({ ok: true, result });
  });

  // 유저별 클리어 이력 (본인 것만 조회)
  fastify.get('/api/dungeons/history/:userId', async (request: FastifyRequest, reply: FastifyReply) => {
    // SECURITY-IDOR: 사적 데이터이므로 params.userId 를 무시하고 인증된 본인 이력만 반환한다.
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ ok: false, error: '인증이 필요합니다.' });
    const runs = await prisma.dungeonRun.findMany({
      where: { leaderId: userId },
      orderBy: { startedAt: 'desc' },
      take: 50,
    });
    return reply.send({ ok: true, runs });
  });
}
