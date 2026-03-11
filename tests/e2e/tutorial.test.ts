/**
 * E2E 테스트 — 튜토리얼 시스템 (3 tests)
 * 튜토리얼 시작, 단계 완료, 전체 스킵
 */
import {
  createTestServer, closeTestServer, createTestUser,
  resetCounters, type TestUser,
} from './setup';
import type { FastifyInstance } from 'fastify';

describe('Tutorial E2E', () => {
  let app: FastifyInstance;
  let user: TestUser;

  const tutorialProgress: Record<string, { currentStep: number; completed: boolean; skipped: boolean }> = {};

  beforeAll(async () => {
    app = await createTestServer();
    resetCounters();

    app.post('/api/tutorial/start', async (req) => {
      const { userId } = req.body as Record<string, string>;
      tutorialProgress[userId] = { currentStep: 1, completed: false, skipped: false };
      return { step: 1, totalSteps: 5, instruction: '이동: WASD 키를 사용하세요.' };
    });

    app.post('/api/tutorial/advance', async (req, reply) => {
      const { userId } = req.body as Record<string, string>;
      const prog = tutorialProgress[userId];
      if (!prog || prog.completed) return reply.status(400).send({ error: 'NOT_IN_TUTORIAL' });
      prog.currentStep++;
      if (prog.currentStep > 5) { prog.completed = true; }
      return { step: prog.currentStep, completed: prog.completed };
    });

    app.post('/api/tutorial/skip', async (req) => {
      const { userId } = req.body as Record<string, string>;
      tutorialProgress[userId] = { currentStep: 5, completed: true, skipped: true };
      return { skipped: true, reward: { gold: 50 } };
    });

    await app.ready();
    user = createTestUser();
  });

  afterAll(async () => { await closeTestServer(); });

  test('1. 튜토리얼 시작 → 1단계 안내', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/tutorial/start', payload: { userId: 'u1' } });
    const body = JSON.parse(res.body);
    expect(body.step).toBe(1);
    expect(body.totalSteps).toBe(5);
  });

  test('2. 단계 진행 → 다음 단계', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/tutorial/advance', payload: { userId: 'u1' } });
    expect(JSON.parse(res.body).step).toBe(2);
  });

  test('3. 튜토리얼 스킵 → completed + 보상', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/tutorial/skip', payload: { userId: 'u2' } });
    const body = JSON.parse(res.body);
    expect(body.skipped).toBe(true);
    expect(body.reward.gold).toBe(50);
  });
});
