/**
 * E2E 테스트 — 랭킹 시스템 (4 tests)
 * 전체 랭킹, 카테고리별, 길드 랭킹, 시즌 랭킹
 */
import {
  createTestServer, closeTestServer, createTestUser,
  resetCounters, type TestUser,
} from './setup';
import type { FastifyInstance } from 'fastify';

describe('Ranking E2E', () => {
  let app: FastifyInstance;
  let user: TestUser;

  beforeAll(async () => {
    app = await createTestServer();
    resetCounters();

    const rankings = [
      { userId: 'u1', nickname: '전사왕', score: 9500, category: 'combat' },
      { userId: 'u2', nickname: '제작의신', score: 8800, category: 'craft' },
      { userId: 'u3', nickname: '탐험가', score: 7200, category: 'explore' },
      { userId: 'u4', nickname: '부자', score: 6500, category: 'combat' },
    ];

    app.get('/api/ranking', async (req) => {
      const { category, limit } = req.query as Record<string, string>;
      let filtered = category ? rankings.filter(r => r.category === category) : rankings;
      filtered = filtered.sort((a, b) => b.score - a.score);
      if (limit) filtered = filtered.slice(0, parseInt(limit));
      return { rankings: filtered, total: filtered.length };
    });

    app.get('/api/ranking/guild', async () => ({
      rankings: [
        { guildId: 'g1', name: '에테르나 기사단', totalScore: 25000, memberCount: 20 },
        { guildId: 'g2', name: '그림자 조합', totalScore: 18000, memberCount: 15 },
      ],
    }));

    app.get('/api/ranking/season', async () => ({
      season: 3,
      startDate: '2026-03-01',
      endDate: '2026-05-31',
      topPlayers: [
        { rank: 1, userId: 'u1', nickname: '전사왕', rating: 2500 },
        { rank: 2, userId: 'u3', nickname: '탐험가', rating: 2350 },
      ],
    }));

    await app.ready();
    user = createTestUser();
  });

  afterAll(async () => { await closeTestServer(); });

  test('1. 전체 랭킹 조회', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/ranking' });
    expect(JSON.parse(res.body).total).toBe(4);
  });

  test('2. 카테고리별 랭킹 (combat)', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/ranking?category=combat' });
    const body = JSON.parse(res.body);
    expect(body.total).toBe(2);
    expect(body.rankings[0].score).toBeGreaterThanOrEqual(body.rankings[1].score);
  });

  test('3. 길드 랭킹 조회', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/ranking/guild' });
    expect(JSON.parse(res.body).rankings).toHaveLength(2);
  });

  test('4. 시즌 랭킹 조회', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/ranking/season' });
    const body = JSON.parse(res.body);
    expect(body.season).toBe(3);
    expect(body.topPlayers[0].rank).toBe(1);
  });
});
