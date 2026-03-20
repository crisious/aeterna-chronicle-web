/**
 * E2E 테스트 — 스토리 진행 시스템 (7 tests)
 * 챕터 진행도 / 해금 조건 / 컷신 갤러리 / 스토리 플래그
 */

import {
  createTestServer, closeTestServer, createTestUser,
  authHeader, expectStatus, expectKeys, expectTruthy, expectEqual,
  resetCounters, type TestUser,
} from './setup';
import type { FastifyInstance } from 'fastify';

describe('Story E2E', () => {
  let app: FastifyInstance;
  let testUser: TestUser;

  const CHAPTER_REQUIREMENTS: Record<number, { level: number; requiredPrev: number | null }> = {
    1: { level: 1, requiredPrev: null },
    2: { level: 10, requiredPrev: 1 },
    3: { level: 20, requiredPrev: 2 },
    4: { level: 30, requiredPrev: 3 },
  };

  beforeAll(async () => {
    app = await createTestServer();
    resetCounters();

    const chapterProgress: Record<string, Record<number, { unlocked: boolean; completed: boolean }>> = {};
    const watchedCutscenes: Record<string, string[]> = {};
    const storyFlags: Record<string, Record<string, Record<string, string | number | boolean>>> = {};

    // GET /api/story/chapters/:userId
    app.get('/api/story/chapters/:userId', async (request) => {
      const { userId } = request.params as { userId: string };
      const progress = chapterProgress[userId] || {};
      const chapters = Object.entries(CHAPTER_REQUIREMENTS).map(([ch, req]) => ({
        chapter: Number(ch),
        requiredLevel: req.level,
        unlocked: progress[Number(ch)]?.unlocked || false,
        completed: progress[Number(ch)]?.completed || false,
      }));
      return { chapters };
    });

    // POST /api/story/unlock/:chapter
    app.post('/api/story/unlock/:chapter', async (request, reply) => {
      const chapter = parseInt((request.params as { chapter: string }).chapter, 10);
      const body = request.body as {
        userId: string; level: number; completedChapters: number[];
        memoryFragments?: number; classAdvancement?: boolean; tutorialCompleted?: boolean;
      };

      const req = CHAPTER_REQUIREMENTS[chapter];
      if (!req) return reply.status(404).send({ error: '챕터가 존재하지 않습니다.' });

      if (body.level < req.level) {
        return reply.status(400).send({ error: `레벨 ${req.level} 이상 필요` });
      }
      if (req.requiredPrev && !body.completedChapters.includes(req.requiredPrev)) {
        return reply.status(400).send({ error: `챕터 ${req.requiredPrev} 완료 필요` });
      }

      if (!chapterProgress[body.userId]) chapterProgress[body.userId] = {};
      chapterProgress[body.userId][chapter] = { unlocked: true, completed: false };
      return { success: true, chapter, unlocked: true };
    });

    // GET /api/story/cutscenes/:userId
    app.get('/api/story/cutscenes/:userId', async (request) => {
      const { userId } = request.params as { userId: string };
      return { userId, cutscenes: watchedCutscenes[userId] || [] };
    });

    // POST /api/story/cutscene/trigger
    app.post('/api/story/cutscene/trigger', async (request, reply) => {
      const body = request.body as { userId: string; chapter: number; trigger: string };
      if (!body.userId || !body.chapter || !body.trigger) {
        return reply.status(400).send({ error: '필수 파라미터 누락' });
      }
      const cutsceneId = `ch${body.chapter}_${body.trigger}`;
      if (!watchedCutscenes[body.userId]) watchedCutscenes[body.userId] = [];
      if (!watchedCutscenes[body.userId].includes(cutsceneId)) {
        watchedCutscenes[body.userId].push(cutsceneId);
      }
      return { success: true, cutsceneId };
    });

    // POST /api/story/flag
    app.post('/api/story/flag', async (request, reply) => {
      const body = request.body as { userId: string; chapter: string; key: string; value: string | number | boolean };
      if (!body.userId || !body.chapter || !body.key) {
        return reply.status(400).send({ error: '필수 파라미터 누락' });
      }
      if (!storyFlags[body.userId]) storyFlags[body.userId] = {};
      if (!storyFlags[body.userId][body.chapter]) storyFlags[body.userId][body.chapter] = {};
      storyFlags[body.userId][body.chapter][body.key] = body.value;
      return { success: true };
    });

    // GET /api/story/flags/:userId
    app.get('/api/story/flags/:userId', async (request) => {
      const { userId } = request.params as { userId: string };
      const query = request.query as { chapter?: string };
      const flags = storyFlags[userId] || {};
      if (query.chapter) return { userId, flags: flags[query.chapter] || {} };
      return { userId, flags };
    });

    await app.ready();
    testUser = createTestUser();
  });

  afterAll(async () => {
    await closeTestServer();
  });

  test('1. 챕터 진행도 조회 → 4개 챕터', async () => {
    const res = await app.inject({ method: 'GET', url: `/api/story/chapters/${testUser.userId}` });
    expectStatus(res.statusCode, 200);
    const body = res.json();
    expectEqual(body.chapters.length, 4, '전체 챕터 수');
  });

  test('2. 챕터 1 해금 → 조건 충족', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/story/unlock/1',
      payload: { userId: testUser.userId, level: 5, completedChapters: [], tutorialCompleted: true },
    });
    expectStatus(res.statusCode, 200);
    expectTruthy(res.json().unlocked, '해금 성공');
  });

  test('3. 챕터 2 해금 실패 → 레벨 부족', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/story/unlock/2',
      payload: { userId: testUser.userId, level: 5, completedChapters: [1] },
    });
    expectStatus(res.statusCode, 400);
  });

  test('4. 챕터 2 해금 실패 → 선행 챕터 미완료', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/story/unlock/2',
      payload: { userId: testUser.userId, level: 15, completedChapters: [] },
    });
    expectStatus(res.statusCode, 400);
  });

  test('5. 컷신 트리거 + 갤러리 확인', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/story/cutscene/trigger',
      payload: { userId: testUser.userId, chapter: 1, trigger: 'intro' },
    });
    const res = await app.inject({ method: 'GET', url: `/api/story/cutscenes/${testUser.userId}` });
    expectStatus(res.statusCode, 200);
    const body = res.json();
    expectTruthy(body.cutscenes.includes('ch1_intro'), '컷신 기록');
  });

  test('6. 스토리 플래그 저장 + 조회', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/story/flag',
      payload: { userId: testUser.userId, chapter: '1', key: 'npc_saved', value: true },
    });
    const res = await app.inject({ method: 'GET', url: `/api/story/flags/${testUser.userId}?chapter=1` });
    expectStatus(res.statusCode, 200);
    expectEqual(res.json().flags.npc_saved, true, '플래그 값');
  });

  test('7. 존재하지 않는 챕터 해금 → 404', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/story/unlock/99',
      payload: { userId: testUser.userId, level: 50, completedChapters: [1, 2, 3] },
    });
    expectStatus(res.statusCode, 404);
  });
});
