/**
 * worldRoutes.ts — 월드맵/필드 REST API (P5-04)
 *
 * GET  /api/world/zones              — 존 목록 (지역 필터)
 * GET  /api/world/zones/:code        — 존 상세
 * POST /api/world/move               — 존 이동
 * GET  /api/world/location/:userId   — 현재 위치
 * POST /api/world/teleport           — 텔레포트 (허브 전용)
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../db';
import { worldManager } from '../world/worldManager';
import { resolveFieldEncounter } from '../../../shared/types/chronoField';
import { isChronoEraId } from '../../../shared/types/chronoEraAtb';

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

interface TeleportBody {
  userId: string;
  targetZoneCode: string;
}

// ─── 스키마 ─────────────────────────────────────────────────────

// [IDOR] actor 는 request.authUserId 로 강제하므로 body 의 userId 는 요구하지 않는다(전송돼도 무시).
const moveSchema = {
  body: {
    type: 'object' as const,
    required: ['targetZoneCode'],
    properties: {
      userId: { type: 'string' as const },
      targetZoneCode: { type: 'string' as const },
    },
  },
};

const teleportSchema = {
  body: {
    type: 'object' as const,
    required: ['targetZoneCode'],
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

  // CHRONO-S106: 시대별 필드 encounter 데이터
  fastify.get('/api/world/zones/:code/encounter', async (
    request: FastifyRequest<{ Params: ZoneCodeParams; Querystring: { eraId?: string } }>,
    reply: FastifyReply,
  ) => {
    const { code } = request.params;
    const { eraId } = request.query;
    const validEra = isChronoEraId(eraId) ? eraId : 'present';
    const encounter = resolveFieldEncounter(code, validEra);
    if (!encounter) {
      // 필드 인카운터는 시대별 선택적 ambient 데이터다. 미정의는 "리소스 없음(404)"이 아니라
      // "데이터 없음"으로 보는 것이 정합적이다(존 자체는 존재). 404 로 응답하면 클라
      // WorldScene.fetchZoneEncounter 가 매 존 선택마다 콘솔 404 소음을 남긴다. 200+null 로 응답하면
      // 클라가 !resp.encounter 분기로 '필드 데이터 미정의'를 그대로 표시한다(동작 동일, 소음 제거).
      return reply.send({ ok: true, encounter: null });
    }
    return reply.send({ ok: true, encounter });
  });

  // 존 이동
  fastify.post('/api/world/move', { schema: moveSchema }, async (request: FastifyRequest, reply: FastifyReply) => {
    // [IDOR] body 의 userId 를 신뢰하지 말고 인증된 행위자를 actor 로 사용한다.
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });
    const { targetZoneCode } = request.body as MoveBody;
    const result = await worldManager.moveToZone(userId, targetZoneCode);
    if (!result.ok) return reply.status(400).send(result);
    return reply.send(result);
  });

  // 현재 위치
  fastify.get('/api/world/location/:userId', async (request: FastifyRequest, reply: FastifyReply) => {
    // [IDOR] params 의 userId 를 신뢰하지 말고 인증된 행위자의 위치만 조회한다.
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });
    const location = await worldManager.getPlayerLocation(userId);
    if (!location) return reply.status(404).send({ ok: false, error: '위치 정보가 없습니다.' });
    return reply.send({ ok: true, location });
  });

  // 텔레포트
  fastify.post('/api/world/teleport', { schema: teleportSchema }, async (request: FastifyRequest, reply: FastifyReply) => {
    // [IDOR] body 의 userId 를 신뢰하지 말고 인증된 행위자를 actor 로 사용한다.
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });
    const { targetZoneCode } = request.body as TeleportBody;
    const result = await worldManager.teleportToHub(userId, targetZoneCode);
    if (!result.ok) return reply.status(400).send(result);
    return reply.send(result);
  });
}
