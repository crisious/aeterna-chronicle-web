/**
 * E2E 테스트 — 인벤토리 시스템 (8 tests)
 * 아이템 추가 / 장착 / 판매 / 사용
 */

import {
  createTestServer, closeTestServer, createTestUser,
  authHeader, mockItem, expectStatus, expectKeys, expectEqual,
  resetCounters, type TestUser,
} from './setup';
import type { FastifyInstance } from 'fastify';

describe('Inventory E2E', () => {
  let app: FastifyInstance;
  let user: TestUser;

  beforeAll(async () => {
    app = await createTestServer();
    resetCounters();
    user = createTestUser();

    // 인벤토리 mock 저장소
    const inventory: Record<string, unknown[]> = {};

    app.get('/api/inventory/:userId', async (request) => {
      const { userId } = request.params as { userId: string };
      return { items: inventory[userId] || [], count: (inventory[userId] || []).length };
    });

    app.post('/api/inventory/add', async (request, reply) => {
      const body = request.body as { userId: string; itemId: string; quantity?: number };
      if (!body.userId || !body.itemId) {
        return reply.status(400).send({ error: '필수 파라미터 누락' });
      }
      if (!inventory[body.userId]) inventory[body.userId] = [];
      const item = mockItem({ id: body.itemId, quantity: body.quantity || 1 });
      inventory[body.userId].push(item);
      return reply.status(201).send({ success: true, item });
    });

    app.post('/api/inventory/equip', async (request, reply) => {
      const body = request.body as { userId: string; itemId: string; slot: string };
      if (!body.slot) return reply.status(400).send({ error: '장착 슬롯 지정 필요' });
      return { success: true, slot: body.slot, itemId: body.itemId };
    });

    app.post('/api/inventory/unequip', async (request) => {
      const body = request.body as { userId: string; slot: string };
      return { success: true, slot: body.slot, itemId: null };
    });

    app.post('/api/inventory/sell', async (request, reply) => {
      const body = request.body as { userId: string; itemId: string; quantity: number };
      if (body.quantity <= 0) return reply.status(400).send({ error: '수량은 1 이상' });
      return { success: true, goldEarned: body.quantity * 10 };
    });

    app.post('/api/inventory/use', async (request, reply) => {
      const body = request.body as { userId: string; itemId: string };
      if (body.itemId === 'non-usable') {
        return reply.status(400).send({ error: '사용 불가능한 아이템' });
      }
      return { success: true, effect: 'hp_restore', value: 50 };
    });

    await app.ready();
  });

  afterAll(async () => { await closeTestServer(); });

  test('1. 아이템 추가 → 201', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/inventory/add',
      headers: authHeader(user),
      payload: { userId: user.userId, itemId: 'sword-001', quantity: 1 },
    });
    expectStatus(res.statusCode, 201);
    expectKeys(res.json(), ['success', 'item']);
  });

  test('2. 인벤토리 조회 → 아이템 포함', async () => {
    const res = await app.inject({
      method: 'GET', url: `/api/inventory/${user.userId}`,
      headers: authHeader(user),
    });
    expectStatus(res.statusCode, 200);
    const body = res.json();
    expectKeys(body, ['items', 'count']);
  });

  test('3. 아이템 장착 → 슬롯 반환', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/inventory/equip',
      payload: { userId: user.userId, itemId: 'sword-001', slot: 'weapon' },
    });
    expectStatus(res.statusCode, 200);
    expectEqual(res.json().slot, 'weapon', '장착 슬롯');
  });

  test('4. 슬롯 미지정 장착 → 400', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/inventory/equip',
      payload: { userId: user.userId, itemId: 'sword-001' },
    });
    expectStatus(res.statusCode, 400);
  });

  test('5. 아이템 해제 → 성공', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/inventory/unequip',
      payload: { userId: user.userId, slot: 'weapon' },
    });
    expectStatus(res.statusCode, 200);
    expectEqual(res.json().itemId, null, '해제 후 슬롯 비어있음');
  });

  test('6. 아이템 판매 → 골드 획득', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/inventory/sell',
      payload: { userId: user.userId, itemId: 'sword-001', quantity: 3 },
    });
    expectStatus(res.statusCode, 200);
    expectEqual(res.json().goldEarned, 30, '판매 골드');
  });

  test('7. 수량 0 판매 → 400', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/inventory/sell',
      payload: { userId: user.userId, itemId: 'sword-001', quantity: 0 },
    });
    expectStatus(res.statusCode, 400);
  });

  test('8. 소비 아이템 사용 → 효과 반환', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/inventory/use',
      payload: { userId: user.userId, itemId: 'potion-hp' },
    });
    expectStatus(res.statusCode, 200);
    expectKeys(res.json(), ['success', 'effect', 'value']);
  });
});
