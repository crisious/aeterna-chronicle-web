/**
 * 엔딩 시스템 REST API 라우트
 *
 * GET    /api/ending/flags/:userId    — 현재 플래그 상태
 * PATCH  /api/ending/flags/:userId    — 플래그 업데이트 (게임 이벤트 연동)
 * POST   /api/ending/judge/:userId    — 엔딩 판정 실행
 * GET    /api/ending/history/:userId  — 과거 엔딩 기록
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { judgeEnding, sanitizeFlags, ENDING_META, EndingFlags } from '../ending/endingJudge';
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
      const { userId } = request.params;
      if (!userId) {
        return reply.status(400).send({ error: 'userId is required' });
      }
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
      const { userId } = request.params;
      if (!userId) {
        return reply.status(400).send({ error: 'userId is required' });
      }
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
      const { userId } = request.params;
      if (!userId) {
        return reply.status(400).send({ error: 'userId is required' });
      }

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
      const { userId } = request.params;
      if (!userId) {
        return reply.status(400).send({ error: 'userId is required' });
      }

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
