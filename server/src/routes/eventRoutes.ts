import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { checkAttendance, getAttendanceStatus } from '../event/attendanceSystem';
import {
  getActiveEvents,
  getEventProgress,
  claimEventReward,
  syncEventStatus,
} from '../event/eventEngine';

// ─── 요청 타입 정의 ─────────────────────────────────────────────

// [SECURITY-IDOR] actor 식별자(userId)는 더 이상 클라이언트 입력에서 받지 않고
// request.authUserId 를 사용하므로 요청 타입에서 제거했다.
interface EventIdParams { id: string; }
interface EventProgressParams { id: string; }
interface ClaimBody { rewardId: string; }

// ─── 라우트 등록 ────────────────────────────────────────────────

export async function eventRoutes(fastify: FastifyInstance): Promise<void> {

  // ═══ 출석 API ═══

  /** POST /api/attendance/check — 일일 출석 체크 */
  fastify.post('/api/attendance/check', async (request: FastifyRequest, reply: FastifyReply) => {
    // [SECURITY-IDOR] body 의 userId 를 신뢰하지 않고 인증된 행위자를 사용한다.
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });

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
    // [SECURITY-IDOR] params 의 :userId 를 신뢰하지 않고 인증된 행위자의 데이터만 조회한다.
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });

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
    const { id: eventId } = request.params as EventProgressParams;
    // [SECURITY-IDOR] params 의 :userId 를 신뢰하지 않고 인증된 행위자의 진행도만 조회한다.
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });

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
    // [SECURITY-IDOR] body 의 userId 를 신뢰하지 않고 인증된 행위자를 사용한다.
    const userId = request.authUserId;
    if (!userId) return reply.status(401).send({ error: '인증이 필요합니다.' });
    const { rewardId } = request.body as ClaimBody;
    if (!rewardId) return reply.status(400).send({ error: 'rewardId 필수' });

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
