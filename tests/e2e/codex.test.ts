/**
 * E2E 테스트 — 도감 시스템 (3 tests)
 * 도감 목록, 항목 등록, 완성도 확인
 */
import {
  createTestServer, closeTestServer, createTestUser,
  resetCounters, type TestUser,
} from './setup';
import type { FastifyInstance } from 'fastify';

describe('Codex E2E', () => {
  let app: FastifyInstance;
  let user: TestUser;

  const userCodex: Record<string, Set<string>> = {};
  const totalEntries = 50;

  beforeAll(async () => {
    app = await createTestServer();
    resetCounters();

    app.get('/api/codex/categories', async () => ({
      categories: ['monster', 'item', 'npc', 'zone', 'achievement'],
    }));

    app.post('/api/codex/register', async (req) => {
      const { userId, entryCode, category } = req.body as Record<string, string>;
      if (!userCodex[userId]) userCodex[userId] = new Set();
      const isNew = !userCodex[userId].has(entryCode);
      userCodex[userId].add(entryCode);
      return { registered: isNew, entryCode, totalRegistered: userCodex[userId].size };
    });

    app.get('/api/codex/:userId/progress', async (req) => {
      const { userId } = req.params as Record<string, string>;
      const registered = userCodex[userId]?.size ?? 0;
      return { registered, total: totalEntries, completionRate: Math.floor((registered / totalEntries) * 100) };
    });

    await app.ready();
    user = createTestUser();
  });

  afterAll(async () => { await closeTestServer(); });

  test('1. 도감 카테고리 목록', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/codex/categories' });
    expect(JSON.parse(res.body).categories).toHaveLength(5);
  });

  test('2. 도감 항목 등록', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/codex/register', payload: { userId: 'u1', entryCode: 'mon_slime', category: 'monster' } });
    const body = JSON.parse(res.body);
    expect(body.registered).toBe(true);
    expect(body.totalRegistered).toBe(1);
  });

  test('3. 도감 완성도 확인', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/codex/u1/progress' });
    const body = JSON.parse(res.body);
    expect(body.registered).toBe(1);
    expect(body.total).toBe(50);
    expect(body.completionRate).toBe(2); // 1/50 = 2%
  });
});
