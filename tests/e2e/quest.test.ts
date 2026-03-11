/**
 * E2E 테스트 — 퀘스트 시스템 (6 tests)
 * 수주 / 진행 / 완료 / 포기
 */

import {
  createTestServer, closeTestServer, createTestUser,
  authHeader, mockQuest, expectStatus, expectKeys, expectEqual,
  resetCounters, type TestUser,
} from './setup';
import type { FastifyInstance } from 'fastify';

describe('Quest E2E', () => {
  let app: FastifyInstance;
  let user: TestUser;

  beforeAll(async () => {
    app = await createTestServer();
    resetCounters();
    user = createTestUser();

    const activeQuests = new Map<string, Record<string, unknown>>();

    app.post('/api/quest/accept', async (request, reply) => {
      const body = request.body as { userId: string; questId: string };
      if (activeQuests.size >= 10) {
        return reply.status(400).send({ error: '퀘스트 수주 한도 초과 (최대 10개)' });
      }
      const quest = mockQuest({ id: body.questId, status: 'active', progress: 0 });
      activeQuests.set(body.questId, quest);
      return reply.status(201).send({ success: true, quest });
    });

    app.post('/api/quest/progress', async (request, reply) => {
      const body = request.body as { userId: string; questId: string; progress: number };
      const quest = activeQuests.get(body.questId);
      if (!quest) return reply.status(404).send({ error: '활성 퀘스트 아님' });
      quest.progress = body.progress;
      if (body.progress >= 100) quest.status = 'completable';
      return { success: true, quest };
    });

    app.post('/api/quest/complete', async (request, reply) => {
      const body = request.body as { userId: string; questId: string };
      const quest = activeQuests.get(body.questId);
      if (!quest) return reply.status(404).send({ error: '퀘스트 없음' });
      if (quest.status !== 'completable') {
        return reply.status(400).send({ error: '완료 조건 미충족' });
      }
      quest.status = 'completed';
      activeQuests.delete(body.questId);
      return { success: true, rewards: { gold: 100, exp: 50 } };
    });

    app.post('/api/quest/abandon', async (request, reply) => {
      const body = request.body as { userId: string; questId: string };
      if (!activeQuests.has(body.questId)) {
        return reply.status(404).send({ error: '활성 퀘스트 아님' });
      }
      activeQuests.delete(body.questId);
      return { success: true };
    });

    await app.ready();
  });

  afterAll(async () => { await closeTestServer(); });

  test('1. 퀘스트 수주 → 201 + 퀘스트 정보', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/quest/accept',
      headers: authHeader(user),
      payload: { userId: user.userId, questId: 'quest-main-001' },
    });
    expectStatus(res.statusCode, 201);
    expectKeys(res.json(), ['success', 'quest']);
    expectEqual(res.json().quest.status, 'active', '수주 후 상태');
  });

  test('2. 퀘스트 진행도 갱신 → progress 반영', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/quest/progress',
      payload: { userId: user.userId, questId: 'quest-main-001', progress: 50 },
    });
    expectStatus(res.statusCode, 200);
    expectEqual(res.json().quest.progress, 50, '진행도');
  });

  test('3. 100% 진행 → completable 상태', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/quest/progress',
      payload: { userId: user.userId, questId: 'quest-main-001', progress: 100 },
    });
    expectStatus(res.statusCode, 200);
    expectEqual(res.json().quest.status, 'completable', '완료 가능 상태');
  });

  test('4. 퀘스트 완료 → 보상 지급', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/quest/complete',
      payload: { userId: user.userId, questId: 'quest-main-001' },
    });
    expectStatus(res.statusCode, 200);
    expectKeys(res.json(), ['success', 'rewards']);
  });

  test('5. 미완료 퀘스트 완료 시도 → 400', async () => {
    // 새 퀘스트 수주 (진행 전)
    await app.inject({
      method: 'POST', url: '/api/quest/accept',
      payload: { userId: user.userId, questId: 'quest-sub-001' },
    });
    const res = await app.inject({
      method: 'POST', url: '/api/quest/complete',
      payload: { userId: user.userId, questId: 'quest-sub-001' },
    });
    expectStatus(res.statusCode, 400);
  });

  test('6. 퀘스트 포기 → 성공', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/quest/abandon',
      payload: { userId: user.userId, questId: 'quest-sub-001' },
    });
    expectStatus(res.statusCode, 200);
    expectEqual(res.json().success, true, '포기 성공');
  });
});
