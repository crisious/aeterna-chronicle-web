/**
 * matchmakingRoutes.ts — 파티 매칭 큐 REST API (P6-09)
 *
 * 엔드포인트:
 *   POST   /api/matchmaking/queue         — 큐 등록
 *   DELETE /api/matchmaking/cancel         — 큐 취소
 *   GET    /api/matchmaking/status/:userId — 대기 상태 조회
 *   GET    /api/matchmaking/estimate/:queueType — 예상 대기 시간
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type {
  QueueRequest} from '../matchmaking/matchmakingQueue';
import {
  enqueue,
  cancelQueue,
  getQueueStatus,
  estimateWait
} from '../matchmaking/matchmakingQueue';

// ── 요청 타입 ───────────────────────────────────────────────────

interface QueueBody {
  /** SECURITY-IDOR: 클라이언트가 보내더라도 무시한다. actor 는 request.authUserId. */
  userId?: string;
  queueType: string;
  contentId?: string;
  role: string;
  level: number;
  gearScore: number;
}

interface CancelBody {
  /** SECURITY-IDOR: 클라이언트가 보내더라도 무시한다. actor 는 request.authUserId. */
  userId?: string;
}

interface StatusParams {
  /** SECURITY-IDOR: 경로 식별자는 무시한다. actor 는 request.authUserId. */
  userId: string;
}

interface EstimateParams {
  queueType: string;
}

// ── 라우트 등록 ─────────────────────────────────────────────────

export async function matchmakingRoutes(fastify: FastifyInstance): Promise<void> {

  /** POST /api/matchmaking/queue — 매칭 큐 등록 */
  fastify.post('/api/matchmaking/queue', async (
    request: FastifyRequest<{ Body: QueueBody }>,
    reply: FastifyReply,
  ) => {
    try {
      // SECURITY-IDOR: 큐 등록은 인증된 본인(request.authUserId)만 가능. body.userId 무시.
      const userId = request.authUserId;
      if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });

      const { queueType, contentId, role, level, gearScore } = request.body;

      if (!queueType || !role || level == null || gearScore == null) {
        return reply.status(400).send({ error: '필수 파라미터 누락' });
      }

      if (!['dungeon', 'raid', 'pvp'].includes(queueType)) {
        return reply.status(400).send({ error: '유효하지 않은 큐 타입' });
      }
      if (!['tank', 'dps', 'healer', 'any'].includes(role)) {
        return reply.status(400).send({ error: '유효하지 않은 역할' });
      }

      const req: QueueRequest = {
        userId,
        queueType: queueType as QueueRequest['queueType'],
        contentId,
        role: role as QueueRequest['role'],
        level,
        gearScore,
      };

      const ticketId = await enqueue(req);
      return reply.send({ ticketId, status: 'waiting' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return reply.status(409).send({ error: msg });
    }
  });

  /** DELETE /api/matchmaking/cancel — 매칭 취소 */
  fastify.delete('/api/matchmaking/cancel', async (
    request: FastifyRequest<{ Body: CancelBody }>,
    reply: FastifyReply,
  ) => {
    try {
      // SECURITY-IDOR: 본인 티켓만 취소. body.userId 무시하고 인증 행위자 사용.
      const userId = request.authUserId;
      if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });

      const cancelled = await cancelQueue(userId);
      if (!cancelled) {
        return reply.status(404).send({ error: '대기 중인 티켓 없음' });
      }
      return reply.send({ status: 'cancelled' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return reply.status(500).send({ error: msg });
    }
  });

  /** GET /api/matchmaking/status/:userId — 매칭 상태 조회 (본인 것만) */
  fastify.get('/api/matchmaking/status/:userId', async (
    request: FastifyRequest<{ Params: StatusParams }>,
    reply: FastifyReply,
  ) => {
    // SECURITY-IDOR: 개인 대기 상태는 인증 본인 것만 조회. params.userId 무시.
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });

    const status = await getQueueStatus(userId);
    return reply.send(status);
  });

  /** GET /api/matchmaking/estimate/:queueType — 예상 대기 시간 */
  fastify.get('/api/matchmaking/estimate/:queueType', async (
    request: FastifyRequest<{ Params: EstimateParams }>,
    reply: FastifyReply,
  ) => {
    const { queueType } = request.params;
    const seconds = await estimateWait(queueType);
    return reply.send({ queueType, estimatedSeconds: seconds });
  });
}
