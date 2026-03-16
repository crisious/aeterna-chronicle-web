import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
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
    const { userId } = request.params as UserIdParams;

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
    const { userId } = request.params as UserIdParams;
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
    const { senderId, receiverId, amount } = request.body as TransferBody;
    if (!senderId || !receiverId || !amount) {
      return reply.status(400).send({ error: 'senderId, receiverId, amount 필수' });
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
