/**
 * worldRoutes.ts — 월드맵/필드 REST API (P5-04)
 *
 * GET  /api/world/zones              — 존 목록 (지역 필터)
 * GET  /api/world/zones/:code        — 존 상세
 * POST /api/world/move               — 존 이동
 * GET  /api/world/location/:userId   — 현재 위치
 * POST /api/world/teleport           — 텔레포트 (허브 전용)
 */
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../db';
import { worldManager } from '../world/worldManager';

// ─── 타입 ───────────────────────────────────────────────────────

interface ZoneListQuery {
  region?: string;
}

interface ZoneCodeParams {
  code: string;
}

interface MoveBody {
  userId: string;
  targetZoneCode: string;
}

interface LocationParams {
  userId: string;
}

interface TeleportBody {
  userId: string;
  targetZoneCode: string;
}

// ─── 스키마 ─────────────────────────────────────────────────────

const moveSchema = {
  body: {
    type: 'object' as const,
    required: ['userId', 'targetZoneCode'],
    properties: {
      userId: { type: 'string' as const },
      targetZoneCode: { type: 'string' as const },
    },
  },
};

const teleportSchema = {
  body: {
    type: 'object' as const,
    required: ['userId', 'targetZoneCode'],
    properties: {
      userId: { type: 'string' as const },
      targetZoneCode: { type: 'string' as const },
    },
  },
};

// ─── 라우트 등록 ────────────────────────────────────────────────

export async function worldRoutes(fastify: FastifyInstance): Promise<void> {
  // 존 목록
  fastify.get('/api/world/zones', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as ZoneListQuery;
    const where: Record<string, unknown> = {};
    if (query.region) where.region = query.region;

    const zones = await prisma.zone.findMany({
      where,
      orderBy: { code: 'asc' },
      select: {
        id: true,
        code: true,
        name: true,
        region: true,
        levelRange: true,
        connections: true,
        isHub: true,
      },
    });
    return reply.send({ ok: true, zones });
  });

  // 존 상세
  fastify.get('/api/world/zones/:code', async (request: FastifyRequest, reply: FastifyReply) => {
    const { code } = request.params as ZoneCodeParams;
    const zone = await prisma.zone.findUnique({ where: { code } });
    if (!zone) return reply.status(404).send({ ok: false, error: '존을 찾을 수 없습니다.' });

    // 필드 몬스터 조회
    const monsters = await worldManager.getFieldMonsters(code);
    // NPC 조회
    const npcs = await worldManager.getZoneNpcs(code);

    return reply.send({ ok: true, zone, monsters, npcs });
  });

  // 존 이동
  fastify.post('/api/world/move', { schema: moveSchema }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId, targetZoneCode } = request.body as MoveBody;
    const result = await worldManager.moveToZone(userId, targetZoneCode);
    if (!result.ok) return reply.status(400).send(result);
    return reply.send(result);
  });

  // 현재 위치
  fastify.get('/api/world/location/:userId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.params as LocationParams;
    const location = await worldManager.getPlayerLocation(userId);
    if (!location) return reply.status(404).send({ ok: false, error: '위치 정보가 없습니다.' });
    return reply.send({ ok: true, location });
  });

  // 텔레포트
  fastify.post('/api/world/teleport', { schema: teleportSchema }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId, targetZoneCode } = request.body as TeleportBody;
    const result = await worldManager.teleportToHub(userId, targetZoneCode);
    if (!result.ok) return reply.status(400).send(result);
    return reply.send(result);
  });
}
