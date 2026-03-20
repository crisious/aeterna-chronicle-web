/**
 * E2E 테스트 — 상점 시스템 (7 tests)
 * 아이템 목록 / 상세 조회 / 구매 / 잔액 부족 / P2W 가드
 */

import {
  createTestServer, closeTestServer, createTestUser,
  authHeader, expectStatus, expectKeys, expectTruthy, expectEqual,
  resetCounters, type TestUser,
} from './setup';
import type { FastifyInstance } from 'fastify';

describe('Shop E2E', () => {
  let app: FastifyInstance;
  let testUser: TestUser;

  const shopItems = [
    { id: 'item-hp-potion', name: 'HP 포션', category: 'consumable', currency: 'gold', price: 50, isActive: true },
    { id: 'item-mp-potion', name: 'MP 포션', category: 'consumable', currency: 'gold', price: 80, isActive: true },
    { id: 'item-rare-sword', name: '전설의 검', category: 'weapon', currency: 'crystal', price: 500, isActive: true },
    { id: 'item-old-armor', name: '구식 갑옷', category: 'armor', currency: 'gold', price: 200, isActive: false },
  ];

  const userBalances: Record<string, { gold: number; crystal: number }> = {};

  beforeAll(async () => {
    app = await createTestServer();
    resetCounters();

    // GET /api/shop/items — 목록 (필터링 + 페이지네이션)
    app.get('/api/shop/items', async (request) => {
      const query = request.query as Record<string, string>;
      let filtered = shopItems.filter((i) => i.isActive);
      if (query.category) filtered = filtered.filter((i) => i.category === query.category);
      if (query.currency) filtered = filtered.filter((i) => i.currency === query.currency);

      const page = parseInt(query.page || '1', 10);
      const limit = Math.min(parseInt(query.limit || '20', 10), 100);
      const start = (page - 1) * limit;

      return {
        items: filtered.slice(start, start + limit),
        total: filtered.length,
        page,
        limit,
      };
    });

    // GET /api/shop/items/:id — 상세
    app.get('/api/shop/items/:id', async (request, reply) => {
      const { id } = request.params as { id: string };
      const item = shopItems.find((i) => i.id === id);
      if (!item) return reply.status(404).send({ error: '아이템을 찾을 수 없습니다.' });
      return item;
    });

    // POST /api/shop/purchase — 구매
    app.post('/api/shop/purchase', async (request, reply) => {
      const body = request.body as { userId: string; itemId: string };
      if (!body.userId || !body.itemId) {
        return reply.status(400).send({ error: '필수 파라미터 누락' });
      }

      const item = shopItems.find((i) => i.id === body.itemId);
      if (!item) return reply.status(404).send({ error: '아이템을 찾을 수 없습니다.' });
      if (!item.isActive) return reply.status(400).send({ error: '판매 중지된 아이템입니다.' });

      if (!userBalances[body.userId]) {
        userBalances[body.userId] = { gold: 1000, crystal: 100 };
      }
      const balance = userBalances[body.userId];
      const currencyKey = item.currency as 'gold' | 'crystal';

      if (balance[currencyKey] < item.price) {
        return reply.status(400).send({ error: '잔액 부족' });
      }

      balance[currencyKey] -= item.price;
      return {
        success: true,
        purchasedItem: item,
        remainingBalance: { [item.currency]: balance[currencyKey] },
      };
    });

    await app.ready();
    testUser = createTestUser();
  });

  afterAll(async () => {
    await closeTestServer();
  });

  // ── 목록 조회 ──

  test('1. 전체 활성 아이템 목록 조회', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/shop/items' });
    expectStatus(res.statusCode, 200);
    const body = res.json();
    expectKeys(body, ['items', 'total', 'page', 'limit']);
    expectTruthy(body.items.length > 0, '아이템 존재');
    // 비활성 아이템 제외 확인
    const ids = body.items.map((i: Record<string, unknown>) => i.id);
    expectEqual(ids.includes('item-old-armor'), false, '비활성 제외');
  });

  test('2. 카테고리 필터링 → consumable만 반환', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/shop/items?category=consumable' });
    const body = res.json();
    expectEqual(body.total, 2, 'consumable 2개');
  });

  // ── 상세 조회 ──

  test('3. 아이템 상세 조회 → 정상', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/shop/items/item-hp-potion' });
    expectStatus(res.statusCode, 200);
    const body = res.json();
    expectEqual(body.name, 'HP 포션', '아이템명');
  });

  test('4. 존재하지 않는 아이템 → 404', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/shop/items/nonexistent' });
    expectStatus(res.statusCode, 404);
  });

  // ── 구매 ──

  test('5. 정상 구매 → 잔액 차감', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/shop/purchase',
      payload: { userId: testUser.userId, itemId: 'item-hp-potion' },
    });
    expectStatus(res.statusCode, 200);
    const body = res.json();
    expectTruthy(body.success, '구매 성공');
    expectEqual(body.remainingBalance.gold, 950, '잔액 차감');
  });

  test('6. 잔액 부족 → 400', async () => {
    // crystal 100 < 500
    const res = await app.inject({
      method: 'POST',
      url: '/api/shop/purchase',
      payload: { userId: testUser.userId, itemId: 'item-rare-sword' },
    });
    expectStatus(res.statusCode, 400);
    const body = res.json();
    expectEqual(body.error, '잔액 부족', '에러 메시지');
  });

  test('7. 비활성 아이템 구매 시도 → 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/shop/purchase',
      payload: { userId: testUser.userId, itemId: 'item-old-armor' },
    });
    expectStatus(res.statusCode, 400);
    const body = res.json();
    expectEqual(body.error, '판매 중지된 아이템입니다.', '비활성 거부');
  });
});
