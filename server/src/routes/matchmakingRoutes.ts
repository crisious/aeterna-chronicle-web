/**
 * matchmakingRoutes.ts — 파티 매칭 큐 REST API (P6-09)
 *
 * 엔드포인트:
 *   POST   /api/matchmaking/queue         — 큐 등록
 *   DELETE /api/matchmaking/cancel         — 큐 취소
 *   GET    /api/matchmaking/status/:userId — 대기 상태 조회
 *   GET    /api/matchmaking/estimate/:queueType — 예상 대기 시간
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  enqueue,
  cancelQueue,
  getQueueStatus,
  estimateWait,
  QueueRequest,
} from '../matchmaking/matchmakingQueue';

// ── 요청 타입 ───────────────────────────────────────────────────

interface QueueBody {
  userId: string;
  queueType: string;
  contentId?: string;
  role: string;
  level: number;
  gearScore: number;
}

interface CancelBody {
  userId: string;
}

interface StatusParams {
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
      const { userId, queueType, contentId, role, level, gearScore } = request.body;

      if (!userId || !queueType || !role || level == null || gearScore == null) {
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
      const { userId } = request.body;
      if (!userId) return reply.status(400).send({ error: 'userId 필수' });

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

  /** GET /api/matchmaking/status/:userId — 매칭 상태 조회 */
  fastify.get('/api/matchmaking/status/:userId', async (
    request: FastifyRequest<{ Params: StatusParams }>,
    reply: FastifyReply,
  ) => {
    const { userId } = request.params;
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
