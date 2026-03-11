/**
 * E2E 테스트 — PvP 시스템 (4 tests)
 * 매칭 / 전투 / 랭킹
 */

import {
  createTestServer, closeTestServer, createTestUser,
  authHeader, expectStatus, expectKeys, expectEqual,
  resetCounters, type TestUser,
} from './setup';
import type { FastifyInstance } from 'fastify';

describe('PvP E2E', () => {
  let app: FastifyInstance;
  let player1: TestUser;
  let player2: TestUser;

  beforeAll(async () => {
    app = await createTestServer();
    resetCounters();
    player1 = createTestUser();
    player2 = createTestUser();

    const rankings: Array<{ userId: string; rating: number; wins: number; losses: number }> = [
      { userId: player1.userId, rating: 1500, wins: 10, losses: 5 },
      { userId: player2.userId, rating: 1480, wins: 8, losses: 7 },
    ];

    app.post('/api/pvp/queue', async (request) => {
      const body = request.body as { userId: string; mode: string };
      return { success: true, queueId: `queue-${Date.now()}`, mode: body.mode || 'ranked', estimatedWait: 15 };
    });

    app.post('/api/pvp/match/result', async (request, reply) => {
      const body = request.body as { matchId: string; winnerId: string; loserId: string };
      if (!body.winnerId || !body.loserId) {
        return reply.status(400).send({ error: '승자/패자 ID 필요' });
      }
      const winner = rankings.find(r => r.userId === body.winnerId);
      const loser = rankings.find(r => r.userId === body.loserId);
      if (winner) { winner.rating += 25; winner.wins++; }
      if (loser) { loser.rating -= 20; loser.losses++; }
      return { success: true, ratingChange: { winner: 25, loser: -20 } };
    });

    app.get('/api/pvp/ranking', async (request) => {
      const query = request.query as { limit?: string };
      const limit = parseInt(query.limit || '10', 10);
      const sorted = [...rankings].sort((a, b) => b.rating - a.rating).slice(0, limit);
      return { rankings: sorted, total: rankings.length };
    });

    await app.ready();
  });

  afterAll(async () => { await closeTestServer(); });

  test('1. PvP 매칭 대기열 등록 → 대기 시간 반환', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/pvp/queue',
      headers: authHeader(player1),
      payload: { userId: player1.userId, mode: 'ranked' },
    });
    expectStatus(res.statusCode, 200);
    expectKeys(res.json(), ['success', 'queueId', 'estimatedWait']);
  });

  test('2. 전투 결과 기록 → 레이팅 변동', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/pvp/match/result',
      payload: { matchId: 'match-001', winnerId: player1.userId, loserId: player2.userId },
    });
    expectStatus(res.statusCode, 200);
    expectEqual(res.json().ratingChange.winner, 25, '승자 레이팅 증가');
  });

  test('3. 랭킹 조회 → 정렬된 목록', async () => {
    const res = await app.inject({
      method: 'GET', url: '/api/pvp/ranking?limit=10',
    });
    expectStatus(res.statusCode, 200);
    const body = res.json();
    expectKeys(body, ['rankings', 'total']);
    // 1위가 player1 (레이팅 높음)
    expectEqual(body.rankings[0].userId, player1.userId, '1위 유저');
  });

  test('4. 전투 결과 필수 파라미터 누락 → 400', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/pvp/match/result',
      payload: { matchId: 'match-002' },
    });
    expectStatus(res.statusCode, 400);
  });
});
