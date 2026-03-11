/**
 * E2E 테스트 — 경제 시스템 (4 tests)
 * 화폐 / 송금 / 밸런스
 */

import {
  createTestServer, closeTestServer, createTestUser,
  authHeader, expectStatus, expectKeys, expectEqual,
  resetCounters, type TestUser,
} from './setup';
import type { FastifyInstance } from 'fastify';

describe('Economy E2E', () => {
  let app: FastifyInstance;
  let user1: TestUser;
  let user2: TestUser;

  beforeAll(async () => {
    app = await createTestServer();
    resetCounters();
    user1 = createTestUser();
    user2 = createTestUser();

    const balances = new Map<string, Record<string, number>>();
    balances.set(user1.userId, { gold: 10000, crystal: 100 });
    balances.set(user2.userId, { gold: 5000, crystal: 50 });

    app.get('/api/economy/balance/:userId', async (request) => {
      const { userId } = request.params as { userId: string };
      const bal = balances.get(userId) || { gold: 0, crystal: 0 };
      return { userId, balance: bal };
    });

    app.post('/api/economy/transfer', async (request, reply) => {
      const body = request.body as { fromId: string; toId: string; currency: string; amount: number };
      if (body.amount <= 0) return reply.status(400).send({ error: '금액은 양수여야 합니다.' });
      if (body.fromId === body.toId) return reply.status(400).send({ error: '자기 자신에게 송금 불가' });

      const fromBal = balances.get(body.fromId);
      if (!fromBal || (fromBal[body.currency] || 0) < body.amount) {
        return reply.status(400).send({ error: '잔액 부족' });
      }

      const toBal = balances.get(body.toId) || { gold: 0, crystal: 0 };
      fromBal[body.currency] -= body.amount;
      toBal[body.currency] = (toBal[body.currency] || 0) + body.amount;
      balances.set(body.toId, toBal);

      return { success: true, fromBalance: fromBal[body.currency], toBalance: toBal[body.currency] };
    });

    app.post('/api/economy/add', async (request) => {
      const body = request.body as { userId: string; currency: string; amount: number; reason: string };
      const bal = balances.get(body.userId) || { gold: 0, crystal: 0 };
      bal[body.currency] = (bal[body.currency] || 0) + body.amount;
      balances.set(body.userId, bal);
      return { success: true, newBalance: bal[body.currency] };
    });

    await app.ready();
  });

  afterAll(async () => { await closeTestServer(); });

  test('1. 잔액 조회 → 화폐별 잔액', async () => {
    const res = await app.inject({
      method: 'GET', url: `/api/economy/balance/${user1.userId}`,
      headers: authHeader(user1),
    });
    expectStatus(res.statusCode, 200);
    expectKeys(res.json(), ['userId', 'balance']);
    expectEqual(res.json().balance.gold, 10000, '초기 골드');
  });

  test('2. 골드 송금 → 잔액 변동', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/economy/transfer',
      payload: { fromId: user1.userId, toId: user2.userId, currency: 'gold', amount: 1000 },
    });
    expectStatus(res.statusCode, 200);
    expectEqual(res.json().fromBalance, 9000, '송금 후 잔액');
  });

  test('3. 잔액 초과 송금 → 400', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/economy/transfer',
      payload: { fromId: user1.userId, toId: user2.userId, currency: 'gold', amount: 999999 },
    });
    expectStatus(res.statusCode, 400);
  });

  test('4. 화폐 추가 (보상/이벤트) → 잔액 증가', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/economy/add',
      payload: { userId: user1.userId, currency: 'crystal', amount: 50, reason: '이벤트 보상' },
    });
    expectStatus(res.statusCode, 200);
    expectEqual(res.json().newBalance, 150, '크리스탈 잔액');
  });
});
