import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { checkAttendance, getAttendanceStatus } from '../event/attendanceSystem';
import {
  getActiveEvents,
  getEventProgress,
  claimEventReward,
  syncEventStatus,
} from '../event/eventEngine';

// ─── 요청 타입 정의 ─────────────────────────────────────────────

interface AttendanceCheckBody { userId: string; }
interface UserIdParams { userId: string; }
interface EventIdParams { id: string; }
interface EventProgressParams { id: string; userId: string; }
interface ClaimBody { userId: string; rewardId: string; }

// ─── 라우트 등록 ────────────────────────────────────────────────

export async function eventRoutes(fastify: FastifyInstance): Promise<void> {

  // ═══ 출석 API ═══

  /** POST /api/attendance/check — 일일 출석 체크 */
  fastify.post('/api/attendance/check', async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.body as AttendanceCheckBody;
    if (!userId) return reply.status(400).send({ error: 'userId 필수' });

    try {
      const result = await checkAttendance(userId);
      return reply.send(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return reply.status(500).send({ error: message });
    }
  });

  /** GET /api/attendance/:userId — 출석 현황 조회 */
  fastify.get('/api/attendance/:userId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.params as UserIdParams;

    try {
      const status = await getAttendanceStatus(userId);
      return reply.send(status);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return reply.status(500).send({ error: message });
    }
  });

  // ═══ 이벤트 API ═══

  /** GET /api/events — 활성 이벤트 목록 */
  fastify.get('/api/events', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      // 이벤트 상태 동기화 후 조회
      await syncEventStatus();
      const events = await getActiveEvents();
      return reply.send({ events });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return reply.status(500).send({ error: message });
    }
  });

  /** GET /api/events/:id/progress/:userId — 이벤트 진행도 조회 */
  fastify.get('/api/events/:id/progress/:userId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id: eventId, userId } = request.params as EventProgressParams;

    try {
      const progress = await getEventProgress(userId, eventId);
      return reply.send(progress);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return reply.status(500).send({ error: message });
    }
  });

  /** POST /api/events/:id/claim — 이벤트 보상 수령 */
  fastify.post('/api/events/:id/claim', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id: eventId } = request.params as EventIdParams;
    const { userId, rewardId } = request.body as ClaimBody;
    if (!userId || !rewardId) return reply.status(400).send({ error: 'userId, rewardId 필수' });

    try {
      const result = await claimEventReward(userId, eventId, rewardId);
      const statusCode = result.success ? 200 : 400;
      return reply.status(statusCode).send(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return reply.status(500).send({ error: message });
    }
  });
}
