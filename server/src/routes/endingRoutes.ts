/**
 * 엔딩 시스템 REST API 라우트
 *
 * GET    /api/ending/flags    — 현재 플래그 상태 (본인만)
 * PATCH  /api/ending/flags    — 플래그 업데이트 (게임 이벤트 연동, 본인만)
 * POST   /api/ending/judge    — 엔딩 판정 실행 (본인만)
 * GET    /api/ending/history  — 과거 엔딩 기록 (본인만)
 *
 * SECURITY-IDOR: 모든 엔딩 데이터는 인증된 사용자(request.authUserId) 본인 것만 접근한다.
 * 기존에는 params 의 :userId 를 신뢰해 임의 유저의 플래그 열람/조작·엔딩 판정·기록 조회가
 * 가능했다. actor 식별자는 더 이상 경로/바디에서 받지 않고 authGate 가 주입한
 * request.authUserId 만 사용한다. (경로 호환을 위해 :userId 세그먼트는 무시한다.)
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { EndingFlags } from '../ending/endingJudge';
import { judgeEnding, sanitizeFlags, ENDING_META } from '../ending/endingJudge';
import { getFlags, updateFlags, snapshotFlags } from '../ending/flagTracker';
import { prisma } from '../db';

interface UserIdParams {
  userId: string;
}

export async function endingRoutes(fastify: FastifyInstance): Promise<void> {
  // ── GET /api/ending/flags/:userId ─────────────────────────
  fastify.get<{ Params: UserIdParams }>(
    '/api/ending/flags/:userId',
    async (request: FastifyRequest<{ Params: UserIdParams }>, reply: FastifyReply) => {
      // 경로의 :userId 는 신뢰하지 않고 인증된 행위자만 사용한다.
      const userId = request.authUserId;
      if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });
      const flags = await getFlags(userId);
      return reply.send({ userId, flags });
    },
  );

  // ── PATCH /api/ending/flags/:userId ───────────────────────
  fastify.patch<{ Params: UserIdParams; Body: Partial<EndingFlags> }>(
    '/api/ending/flags/:userId',
    async (
      request: FastifyRequest<{ Params: UserIdParams; Body: Partial<EndingFlags> }>,
      reply: FastifyReply,
    ) => {
      // 경로의 :userId 는 신뢰하지 않고 인증된 행위자만 사용한다.
      const userId = request.authUserId;
      if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });
      const patch = request.body;
      if (!patch || typeof patch !== 'object') {
        return reply.status(400).send({ error: 'Request body must be a JSON object' });
      }
      const updated = await updateFlags(userId, patch);
      return reply.send({ userId, flags: updated });
    },
  );

  // ── POST /api/ending/judge/:userId ────────────────────────
  fastify.post<{ Params: UserIdParams }>(
    '/api/ending/judge/:userId',
    async (request: FastifyRequest<{ Params: UserIdParams }>, reply: FastifyReply) => {
      // 경로의 :userId 는 신뢰하지 않고 인증된 행위자만 사용한다.
      const userId = request.authUserId;
      if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });

      // 현재 플래그 스냅샷
      const flags = await snapshotFlags(userId);
      const sanitized = sanitizeFlags(flags);
      const judgment = judgeEnding(sanitized);
      const meta = ENDING_META[judgment.ending];

      // 이전 플레이스루 횟수 조회
      const prevCount = await prisma.endingRecord.count({
        where: { userId },
      });

      // 엔딩 기록 DB 저장
      const record = await prisma.endingRecord.create({
        data: {
          userId,
          endingType: judgment.ending,
          flags: JSON.parse(JSON.stringify(sanitized)),
          playthrough: prevCount + 1,
        },
      });

      return reply.send({
        userId,
        ending: judgment.ending,
        endingName: meta.nameKo,
        endingDescription: meta.descKo,
        reason: judgment.reason,
        playthrough: record.playthrough,
        recordId: record.id,
        flagSnapshot: sanitized,
      });
    },
  );

  // ── GET /api/ending/history/:userId ───────────────────────
  fastify.get<{ Params: UserIdParams }>(
    '/api/ending/history/:userId',
    async (request: FastifyRequest<{ Params: UserIdParams }>, reply: FastifyReply) => {
      // 경로의 :userId 는 신뢰하지 않고 인증된 행위자만 사용한다.
      const userId = request.authUserId;
      if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });

      const records = await prisma.endingRecord.findMany({
        where: { userId },
        orderBy: { playthrough: 'asc' },
      });

      const enriched = records.map((r) => ({
        ...r,
        endingName: ENDING_META[r.endingType as keyof typeof ENDING_META]?.nameKo ?? r.endingType,
      }));

      return reply.send({ userId, total: records.length, records: enriched });
    },
  );
}
