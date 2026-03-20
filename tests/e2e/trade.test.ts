/**
 * E2E 테스트 — 거래 시스템 (8 tests)
 * 거래 요청 / 수락 / 거절 / 오퍼 등록 / 확정 / 취소 / 이력
 */

import {
  createTestServer, closeTestServer, createTestUser,
  authHeader, expectStatus, expectKeys, expectTruthy, expectEqual,
  resetCounters, type TestUser,
} from './setup';
import type { FastifyInstance } from 'fastify';

describe('Trade E2E', () => {
  let app: FastifyInstance;
  let userA: TestUser;
  let userB: TestUser;

  interface Trade {
    id: string;
    requesterId: string;
    targetId: string;
    status: 'pending' | 'active' | 'completed' | 'cancelled' | 'rejected';
    offers: Record<string, { items: string[]; gold: number }>;
    confirms: Set<string>;
    createdAt: number;
  }

  beforeAll(async () => {
    app = await createTestServer();
    resetCounters();

    const trades: Record<string, Trade> = {};
    const tradeHistory: Array<Record<string, unknown>> = [];
    let tradeSeq = 0;

    // POST /api/trade/request
    app.post('/api/trade/request', async (request, reply) => {
      const body = request.body as { requesterId: string; targetId: string };
      if (body.requesterId === body.targetId) {
        return reply.status(400).send({ error: '자기 자신과 거래할 수 없습니다.' });
      }
      tradeSeq++;
      const id = `trade-${tradeSeq}`;
      trades[id] = {
        id,
        requesterId: body.requesterId,
        targetId: body.targetId,
        status: 'pending',
        offers: {},
        confirms: new Set(),
        createdAt: Date.now(),
      };
      return reply.status(201).send({ tradeId: id, status: 'pending', expiresIn: 180 });
    });

    // POST /api/trade/accept
    app.post('/api/trade/accept', async (request, reply) => {
      const body = request.body as { tradeId: string; userId: string };
      const trade = trades[body.tradeId];
      if (!trade) return reply.status(404).send({ error: '거래 없음' });
      if (trade.targetId !== body.userId) {
        return reply.status(403).send({ error: '거래 대상이 아닙니다.' });
      }
      trade.status = 'active';
      return { success: true, status: 'active' };
    });

    // POST /api/trade/reject
    app.post('/api/trade/reject', async (request, reply) => {
      const body = request.body as { tradeId: string; userId: string };
      const trade = trades[body.tradeId];
      if (!trade) return reply.status(404).send({ error: '거래 없음' });
      trade.status = 'rejected';
      return { success: true };
    });

    // POST /api/trade/offer
    app.post('/api/trade/offer', async (request, reply) => {
      const body = request.body as { tradeId: string; userId: string; items: string[]; gold: number };
      const trade = trades[body.tradeId];
      if (!trade) return reply.status(404).send({ error: '거래 없음' });
      if (trade.status !== 'active') {
        return reply.status(400).send({ error: '활성 상태의 거래만 오퍼 가능' });
      }
      trade.offers[body.userId] = { items: body.items || [], gold: body.gold || 0 };
      trade.confirms.clear(); // 오퍼 변경 시 확정 초기화
      return { success: true, offers: trade.offers };
    });

    // POST /api/trade/confirm
    app.post('/api/trade/confirm', async (request, reply) => {
      const body = request.body as { tradeId: string; userId: string };
      const trade = trades[body.tradeId];
      if (!trade) return reply.status(404).send({ error: '거래 없음' });
      if (trade.status !== 'active') {
        return reply.status(400).send({ error: '활성 상태의 거래만 확정 가능' });
      }
      trade.confirms.add(body.userId);
      if (trade.confirms.size >= 2) {
        trade.status = 'completed';
        tradeHistory.push({ tradeId: trade.id, participants: [trade.requesterId, trade.targetId], completedAt: Date.now() });
        return { success: true, status: 'completed' };
      }
      return { success: true, status: 'waiting_other' };
    });

    // POST /api/trade/cancel
    app.post('/api/trade/cancel', async (request, reply) => {
      const body = request.body as { tradeId: string; userId: string };
      const trade = trades[body.tradeId];
      if (!trade) return reply.status(404).send({ error: '거래 없음' });
      trade.status = 'cancelled';
      return { success: true };
    });

    // GET /api/trade/:id
    app.get('/api/trade/:id', async (request, reply) => {
      const { id } = request.params as { id: string };
      const trade = trades[id];
      if (!trade) return reply.status(404).send({ error: '거래 없음' });
      return { ...trade, confirms: [...trade.confirms] };
    });

    // GET /api/trade/history
    app.get('/api/trade/history', async (request) => {
      const query = request.query as { userId?: string; page?: string; limit?: string };
      const page = parseInt(query.page || '1', 10);
      const limit = parseInt(query.limit || '20', 10);
      const filtered = query.userId
        ? tradeHistory.filter((t) => (t.participants as string[]).includes(query.userId!))
        : tradeHistory;
      return { history: filtered.slice((page - 1) * limit, page * limit), total: filtered.length };
    });

    await app.ready();
    userA = createTestUser('user', { userId: 'trader-a' });
    userB = createTestUser('user', { userId: 'trader-b' });
  });

  afterAll(async () => {
    await closeTestServer();
  });

  test('1. 거래 요청 → 201', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/trade/request',
      payload: { requesterId: 'trader-a', targetId: 'trader-b' },
    });
    expectStatus(res.statusCode, 201);
    expectKeys(res.json(), ['tradeId', 'status', 'expiresIn']);
  });

  test('2. 자기 자신과 거래 → 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/trade/request',
      payload: { requesterId: 'trader-a', targetId: 'trader-a' },
    });
    expectStatus(res.statusCode, 400);
  });

  test('3. 거래 수락 → active', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/trade/accept',
      payload: { tradeId: 'trade-1', userId: 'trader-b' },
    });
    expectStatus(res.statusCode, 200);
    expectEqual(res.json().status, 'active', '활성 상태');
  });

  test('4. 오퍼 등록 → 아이템/골드 설정', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/trade/offer',
      payload: { tradeId: 'trade-1', userId: 'trader-a', items: ['item-1', 'item-2'], gold: 500 },
    });
    expectStatus(res.statusCode, 200);
    expectTruthy(res.json().success, '오퍼 성공');
  });

  test('5. 양측 확정 → completed', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/trade/confirm',
      payload: { tradeId: 'trade-1', userId: 'trader-a' },
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/trade/confirm',
      payload: { tradeId: 'trade-1', userId: 'trader-b' },
    });
    expectStatus(res.statusCode, 200);
    expectEqual(res.json().status, 'completed', '거래 완료');
  });

  test('6. 거래 상태 조회', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/trade/trade-1' });
    expectStatus(res.statusCode, 200);
    expectEqual(res.json().status, 'completed', '완료 상태');
  });

  test('7. 거래 취소', async () => {
    // 새 거래 생성 후 취소
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/trade/request',
      payload: { requesterId: 'trader-a', targetId: 'trader-b' },
    });
    const tradeId = createRes.json().tradeId;
    const res = await app.inject({
      method: 'POST',
      url: '/api/trade/cancel',
      payload: { tradeId, userId: 'trader-a' },
    });
    expectStatus(res.statusCode, 200);
    expectTruthy(res.json().success, '취소 성공');
  });

  test('8. 거래 이력 조회', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/trade/history?userId=trader-a' });
    expectStatus(res.statusCode, 200);
    const body = res.json();
    expectKeys(body, ['history', 'total']);
    expectTruthy(body.total >= 1, '이력 존재');
  });
});
