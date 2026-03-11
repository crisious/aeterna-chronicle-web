/**
 * 통합 테스트 — 상점 + 제작 플로우 (8 tests)
 * 상점 아이템 구매 → 인벤토리 확인 → 재료로 제작 → 결과 확인
 */
import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';

let app: FastifyInstance;

// ── 인메모리 상태 ───────────────────────────────────────────

const inventory: Record<string, { items: Record<string, number>; gold: number }> = {
  u1: { items: {}, gold: 10000 },
};

const shopItems = [
  { id: 'mat_iron', name: '철 주괴', price: 100 },
  { id: 'mat_wood', name: '목재', price: 50 },
  { id: 'mat_herb', name: '약초', price: 30 },
];

const recipes = [
  { id: 'r1', name: '철검', materials: [{ itemId: 'mat_iron', count: 3 }, { itemId: 'mat_wood', count: 2 }], result: 'wpn_iron_sword', resultCount: 1, successRate: 1.0 },
  { id: 'r2', name: 'HP 포션', materials: [{ itemId: 'mat_herb', count: 2 }], result: 'con_hp_potion', resultCount: 3, successRate: 1.0 },
];

beforeAll(async () => {
  app = Fastify({ logger: false });

  // 상점 목록
  app.get('/api/shop', async () => shopItems);

  // 구매
  app.post('/api/shop/buy', async (req, reply) => {
    const { userId, itemId, count } = req.body as Record<string, any>;
    const item = shopItems.find(i => i.id === itemId);
    if (!item) return reply.status(404).send({ error: 'ITEM_NOT_FOUND' });
    const inv = inventory[userId];
    if (!inv) return reply.status(404).send({ error: 'USER_NOT_FOUND' });
    const cost = item.price * count;
    if (inv.gold < cost) return reply.status(400).send({ error: 'INSUFFICIENT_GOLD' });
    inv.gold -= cost;
    inv.items[itemId] = (inv.items[itemId] ?? 0) + count;
    return { gold: inv.gold, item: itemId, count: inv.items[itemId] };
  });

  // 인벤토리 확인
  app.get('/api/inventory/:userId', async (req, reply) => {
    const { userId } = req.params as Record<string, string>;
    const inv = inventory[userId];
    if (!inv) return reply.status(404).send({ error: 'NOT_FOUND' });
    return inv;
  });

  // 제작
  app.post('/api/craft', async (req, reply) => {
    const { userId, recipeId } = req.body as Record<string, any>;
    const recipe = recipes.find(r => r.id === recipeId);
    if (!recipe) return reply.status(404).send({ error: 'RECIPE_NOT_FOUND' });
    const inv = inventory[userId];
    if (!inv) return reply.status(404).send({ error: 'USER_NOT_FOUND' });
    // 재료 확인
    for (const mat of recipe.materials) {
      if ((inv.items[mat.itemId] ?? 0) < mat.count) {
        return reply.status(400).send({ error: 'INSUFFICIENT_MATERIALS', missing: mat.itemId });
      }
    }
    // 재료 소비
    for (const mat of recipe.materials) { inv.items[mat.itemId] -= mat.count; }
    // 결과 아이템 추가
    inv.items[recipe.result] = (inv.items[recipe.result] ?? 0) + recipe.resultCount;
    return { success: true, result: recipe.result, count: inv.items[recipe.result] };
  });

  await app.ready();
});

afterAll(async () => { await app.close(); });

describe('Shop + Craft Flow 통합', () => {
  // 1. 상점 목록 조회
  test('1. 상점 아이템 목록 조회', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/shop' });
    expect(JSON.parse(res.body)).toHaveLength(3);
  });

  // 2. 아이템 구매
  test('2. 철 주괴 5개 구매 → 골드 차감', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/shop/buy', payload: { userId: 'u1', itemId: 'mat_iron', count: 5 } });
    const body = JSON.parse(res.body);
    expect(body.gold).toBe(9500); // 10000 - 500
    expect(body.count).toBe(5);
  });

  // 3. 잔액 부족 구매 → 400
  test('3. 골드 부족 시 구매 실패', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/shop/buy', payload: { userId: 'u1', itemId: 'mat_iron', count: 1000 } });
    expect(res.statusCode).toBe(400);
  });

  // 4. 목재 구매
  test('4. 목재 3개 구매', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/shop/buy', payload: { userId: 'u1', itemId: 'mat_wood', count: 3 } });
    expect(JSON.parse(res.body).count).toBe(3);
  });

  // 5. 인벤토리 확인
  test('5. 인벤토리 확인 — 철 5개 + 목재 3개', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/inventory/u1' });
    const body = JSON.parse(res.body);
    expect(body.items.mat_iron).toBe(5);
    expect(body.items.mat_wood).toBe(3);
  });

  // 6. 철검 제작 성공
  test('6. 철검 제작 → 성공 + 재료 소비', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/craft', payload: { userId: 'u1', recipeId: 'r1' } });
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.result).toBe('wpn_iron_sword');
  });

  // 7. 제작 후 재료 감소 확인
  test('7. 제작 후 잔여 재료 확인', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/inventory/u1' });
    const body = JSON.parse(res.body);
    expect(body.items.mat_iron).toBe(2); // 5 - 3
    expect(body.items.mat_wood).toBe(1); // 3 - 2
  });

  // 8. 재료 부족 제작 → 실패
  test('8. 재료 부족 시 제작 실패', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/craft', payload: { userId: 'u1', recipeId: 'r1' } });
    expect(res.statusCode).toBe(400);
  });
});
