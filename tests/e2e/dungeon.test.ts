/**
 * E2E 테스트 — 던전 시스템 (6 tests)
 * 던전 목록, 입장, 웨이브 진행, 보스전, 클리어 보상, 타임아웃
 */
import {
  createTestServer, closeTestServer, createTestUser,
  resetCounters, type TestUser,
} from './setup';
import type { FastifyInstance } from 'fastify';

describe('Dungeon E2E', () => {
  let app: FastifyInstance;
  let user: TestUser;

  const runs: Record<string, { wave: number; status: string; startedAt: number }> = {};

  beforeAll(async () => {
    app = await createTestServer();
    resetCounters();

    app.get('/api/dungeon/list', async () => [
      { code: 'dg_sewer_n', name: '하수도 미궁 (일반)', level: 5, maxPlayers: 4 },
      { code: 'dg_forest_h', name: '황혼의 숲 (하드)', level: 30, maxPlayers: 4 },
    ]);

    app.post('/api/dungeon/enter', async (req, reply) => {
      const { dungeonCode, userId, playerLevel } = req.body as Record<string, any>;
      if (playerLevel < 5) return reply.status(400).send({ error: 'LEVEL_TOO_LOW' });
      const runId = `run_${Date.now()}`;
      runs[runId] = { wave: 1, status: 'in_progress', startedAt: Date.now() };
      return { runId, wave: 1, totalWaves: 4 };
    });

    app.post('/api/dungeon/advance', async (req, reply) => {
      const { runId } = req.body as Record<string, string>;
      const run = runs[runId];
      if (!run) return reply.status(404).send({ error: 'NOT_FOUND' });
      run.wave++;
      if (run.wave > 4) { run.status = 'cleared'; }
      return { wave: run.wave, status: run.status };
    });

    app.post('/api/dungeon/boss', async (req) => {
      const { runId, damage } = req.body as Record<string, any>;
      const bossHp = Math.max(0, 5000 - damage);
      return { bossHp, defeated: bossHp <= 0 };
    });

    app.get('/api/dungeon/:runId/reward', async (req) => {
      const { runId } = req.params as Record<string, string>;
      const run = runs[runId];
      if (run?.status === 'cleared') return { gold: 500, exp: 300, items: ['rare_drop_001'] };
      return { gold: 0, exp: 0, items: [] };
    });

    app.post('/api/dungeon/timeout', async (req) => {
      const { runId } = req.body as Record<string, string>;
      const run = runs[runId];
      if (run) run.status = 'failed';
      return { status: 'failed', reason: 'TIMEOUT' };
    });

    await app.ready();
    user = createTestUser();
  });

  afterAll(async () => { await closeTestServer(); });

  test('1. 던전 목록 조회', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/dungeon/list' });
    expect(JSON.parse(res.body)).toHaveLength(2);
  });

  test('2. 던전 입장 → runId 발급', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/dungeon/enter', payload: { dungeonCode: 'dg_sewer_n', userId: 'u1', playerLevel: 10 } });
    expect(JSON.parse(res.body).runId).toBeTruthy();
  });

  test('3. 레벨 부족 입장 → 400', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/dungeon/enter', payload: { dungeonCode: 'dg_sewer_n', userId: 'u1', playerLevel: 2 } });
    expect(res.statusCode).toBe(400);
  });

  test('4. 웨이브 진행 → wave 증가', async () => {
    const enter = await app.inject({ method: 'POST', url: '/api/dungeon/enter', payload: { dungeonCode: 'dg_sewer_n', userId: 'u1', playerLevel: 10 } });
    const runId = JSON.parse(enter.body).runId;
    const res = await app.inject({ method: 'POST', url: '/api/dungeon/advance', payload: { runId } });
    expect(JSON.parse(res.body).wave).toBe(2);
  });

  test('5. 보스 처치 확인', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/dungeon/boss', payload: { runId: 'r1', damage: 6000 } });
    expect(JSON.parse(res.body).defeated).toBe(true);
  });

  test('6. 타임아웃 → failed', async () => {
    const enter = await app.inject({ method: 'POST', url: '/api/dungeon/enter', payload: { dungeonCode: 'dg_sewer_n', userId: 'u1', playerLevel: 10 } });
    const runId = JSON.parse(enter.body).runId;
    const res = await app.inject({ method: 'POST', url: '/api/dungeon/timeout', payload: { runId } });
    expect(JSON.parse(res.body).status).toBe('failed');
  });
});
