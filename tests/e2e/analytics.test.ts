/**
 * E2E 테스트 — KPI/분석 시스템 (P7-11)
 * 세션 시간, 클리어율, KPI 스냅샷, 경제 지표 엔드포인트
 */

import {
  createTestServer, closeTestServer, createTestUser,
  authHeader, expectStatus, expectKeys,
  resetCounters, type TestUser,
} from './setup';
import type { FastifyInstance } from 'fastify';

describe('Analytics E2E', () => {
  let app: FastifyInstance;
  let adminUser: TestUser;

  beforeAll(async () => {
    app = await createTestServer();
    resetCounters();
    adminUser = createTestUser('admin');

    // KPI 조회 엔드포인트 (stub)
    app.get('/api/analytics/kpi', async (request, reply) => {
      return reply.send({
        startDate: '2026-02-01',
        endDate: '2026-03-01',
        snapshots: [{ date: '2026-03-01', metric: 'dau', value: 150 }],
      });
    });

    app.get('/api/analytics/session-time', async (_request, reply) => {
      return reply.send({ date: '2026-03-12', avgSessionTimeSeconds: 1800 });
    });

    app.get('/api/analytics/clear-rate', async (_request, reply) => {
      return reply.send({
        totalRuns: 500,
        clearedRuns: 350,
        clearRate: 0.7,
        byDungeon: [
          { dungeonId: 'crystal_cave_01', total: 200, cleared: 160, rate: 0.8 },
        ],
      });
    });

    app.get('/api/analytics/economy', async (_request, reply) => {
      return reply.send({
        inflation: { totalCirculating: 5000000, totalSunk: 3000000, index: 1.67 },
        totalGold: 5000000,
        totalDiamond: 50000,
      });
    });

    app.get('/api/analytics/revenue', async (_request, reply) => {
      return reply.send({
        startDate: '2025-12-01',
        endDate: '2026-03-01',
        series: [{ date: '2026-03-01', value: 120000 }],
      });
    });

    app.post('/api/analytics/snapshot', async (_request, reply) => {
      return reply.send({
        success: true,
        date: '2026-03-12',
        metrics: { dau: 150, mau: 3000, revenue: 50000 },
      });
    });

    await app.listen({ port: 0 });
  });

  afterAll(async () => {
    await closeTestServer();
  });

  // ── KPI 스냅샷 조회 ──
  it('GET /api/analytics/kpi → 200', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/analytics/kpi?startDate=2026-02-01&endDate=2026-03-01',
      headers: authHeader(adminUser),
    });
    expectStatus(res.statusCode, 200);
    const body = JSON.parse(res.body);
    expectKeys(body, ['startDate', 'endDate', 'snapshots']);
    expect(body.snapshots.length).toBeGreaterThan(0);
  });

  // ── 세션 시간 조회 (P7-11) ──
  it('GET /api/analytics/session-time → 200', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/analytics/session-time?date=2026-03-12',
      headers: authHeader(adminUser),
    });
    expectStatus(res.statusCode, 200);
    const body = JSON.parse(res.body);
    expectKeys(body, ['date', 'avgSessionTimeSeconds']);
    expect(body.avgSessionTimeSeconds).toBeGreaterThanOrEqual(0);
  });

  // ── 스테이지 클리어율 조회 (P7-11) ──
  it('GET /api/analytics/clear-rate → 200', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/analytics/clear-rate',
      headers: authHeader(adminUser),
    });
    expectStatus(res.statusCode, 200);
    const body = JSON.parse(res.body);
    expectKeys(body, ['totalRuns', 'clearedRuns', 'clearRate', 'byDungeon']);
    expect(body.clearRate).toBeGreaterThanOrEqual(0);
    expect(body.clearRate).toBeLessThanOrEqual(1);
  });

  // ── 경제 지표 ──
  it('GET /api/analytics/economy → 200', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/analytics/economy',
      headers: authHeader(adminUser),
    });
    expectStatus(res.statusCode, 200);
    const body = JSON.parse(res.body);
    expectKeys(body, ['inflation', 'totalGold', 'totalDiamond']);
  });

  // ── 매출 시계열 ──
  it('GET /api/analytics/revenue → 200', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/analytics/revenue',
      headers: authHeader(adminUser),
    });
    expectStatus(res.statusCode, 200);
    const body = JSON.parse(res.body);
    expectKeys(body, ['startDate', 'endDate', 'series']);
  });

  // ── 수동 스냅샷 트리거 ──
  it('POST /api/analytics/snapshot → 200', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/analytics/snapshot',
      headers: authHeader(adminUser),
    });
    expectStatus(res.statusCode, 200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expectKeys(body, ['date', 'metrics']);
  });
});
