import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  getBalance,
  getTransactionHistory,
  transferGold,
} from '../economy/currencyManager';

// ─── 요청 타입 정의 ─────────────────────────────────────────────

interface UserIdParams { userId: string; }
interface HistoryQuery { currency?: string; page?: string; limit?: string; }
interface TransferBody { senderId: string; receiverId: string; amount: number; }

// ─── 라우트 등록 ────────────────────────────────────────────────

export async function currencyRoutes(fastify: FastifyInstance): Promise<void> {

  /** GET /api/currency/:userId — 잔액 조회 */
  fastify.get('/api/currency/:userId', async (request: FastifyRequest, reply: FastifyReply) => {
    // SECURITY-IDOR: 잔액은 사적 정보 — 인증된 사용자 본인만 조회 가능 (params.userId 신뢰 금지)
    const userId = request.authUserId;
    if (!userId) {
      return reply.status(401).send({ error: '인증이 필요합니다.' });
    }
    const { userId: targetUserId } = request.params as UserIdParams;
    if (targetUserId !== userId) {
      return reply.status(403).send({ error: '본인의 잔액만 조회할 수 있습니다.' });
    }

    try {
      const balance = await getBalance(userId);
      return reply.send(balance);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return reply.status(404).send({ error: message });
    }
  });

  /** GET /api/currency/:userId/history — 거래 이력 */
  fastify.get('/api/currency/:userId/history', async (request: FastifyRequest, reply: FastifyReply) => {
    // SECURITY-IDOR: 거래 이력은 사적 정보 — 인증된 사용자 본인만 조회 가능 (params.userId 신뢰 금지)
    const userId = request.authUserId;
    if (!userId) {
      return reply.status(401).send({ error: '인증이 필요합니다.' });
    }
    const { userId: targetUserId } = request.params as UserIdParams;
    if (targetUserId !== userId) {
      return reply.status(403).send({ error: '본인의 거래 이력만 조회할 수 있습니다.' });
    }
    const query = request.query as HistoryQuery;

    try {
      const result = await getTransactionHistory(userId, {
        currency: query.currency as 'gold' | 'diamond' | 'event_coin' | undefined,
        page: query.page ? parseInt(query.page, 10) : undefined,
        limit: query.limit ? parseInt(query.limit, 10) : undefined,
      });
      return reply.send(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return reply.status(500).send({ error: message });
    }
  });

  /** POST /api/currency/transfer — 유저간 골드 송금 */
  fastify.post('/api/currency/transfer', async (request: FastifyRequest, reply: FastifyReply) => {
    // SECURITY-IDOR: 송신자는 인증된 사용자로 고정 (body.senderId 신뢰 시 임의 유저 골드 탈취 가능)
    const senderId = request.authUserId;
    if (!senderId) {
      return reply.status(401).send({ error: '인증이 필요합니다.' });
    }
    const { receiverId, amount } = request.body as TransferBody;
    if (!receiverId || !amount) {
      return reply.status(400).send({ error: 'receiverId, amount 필수' });
    }

    try {
      const result = await transferGold(senderId, receiverId, amount);
      return reply.send(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return reply.status(400).send({ error: message });
    }
  });
}
