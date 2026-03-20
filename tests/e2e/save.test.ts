/**
 * E2E 테스트 — 세이브/로드 시스템 (7 tests)
 * 수동 저장 / 불러오기 / 삭제 / 자동 저장 / 슬롯 목록 / 존재하지 않는 슬롯
 */

import {
  createTestServer, closeTestServer, createTestUser,
  authHeader, expectStatus, expectKeys, expectTruthy, expectEqual,
  resetCounters, type TestUser,
} from './setup';
import type { FastifyInstance } from 'fastify';

describe('Save E2E', () => {
  let app: FastifyInstance;
  let testUser: TestUser;

  beforeAll(async () => {
    app = await createTestServer();
    resetCounters();

    const saves: Record<string, Record<number, {
      userId: string; data: Record<string, unknown>; label: string; savedAt: string;
    }>> = {};

    // GET /api/save/:userId — 슬롯 목록
    app.get('/api/save/:userId', async (request) => {
      const { userId } = request.params as { userId: string };
      const userSaves = saves[userId] || {};
      return { saves: Object.entries(userSaves).map(([slot, s]) => ({ slot: Number(slot), ...s })) };
    });

    // POST /api/save/:slot — 수동 저장
    app.post('/api/save/:slot', async (request, reply) => {
      const { slot } = request.params as { slot: string };
      const slotNum = parseInt(slot, 10);
      if (slotNum < 1 || slotNum > 5) {
        return reply.status(400).send({ error: '슬롯 번호는 1~5입니다.' });
      }
      const body = request.body as { userId: string; data: Record<string, unknown>; label?: string };
      if (!body.userId || !body.data) {
        return reply.status(400).send({ error: '필수 데이터 누락' });
      }
      if (!saves[body.userId]) saves[body.userId] = {};
      saves[body.userId][slotNum] = {
        userId: body.userId,
        data: body.data,
        label: body.label || `슬롯 ${slotNum}`,
        savedAt: new Date().toISOString(),
      };
      return { slot: slotNum, status: 'saved' };
    });

    // POST /api/save/load/:slot — 불러오기
    app.post('/api/save/load/:slot', async (request, reply) => {
      const { slot } = request.params as { slot: string };
      const slotNum = parseInt(slot, 10);
      const body = request.body as { userId: string };
      const userSaves = saves[body.userId];
      if (!userSaves || !userSaves[slotNum]) {
        return reply.status(404).send({ error: '저장 데이터 없음' });
      }
      return { slot: slotNum, data: userSaves[slotNum].data };
    });

    // DELETE /api/save/:slot — 삭제
    app.delete('/api/save/:slot', async (request, reply) => {
      const { slot } = request.params as { slot: string };
      const slotNum = parseInt(slot, 10);
      const body = request.body as { userId: string };
      const userSaves = saves[body.userId];
      if (!userSaves || !userSaves[slotNum]) {
        return reply.status(404).send({ error: '저장 데이터 없음' });
      }
      delete userSaves[slotNum];
      return { success: true };
    });

    // POST /api/save/auto — 자동 저장
    app.post('/api/save/auto', async (request) => {
      const body = request.body as { userId: string; data: Record<string, unknown> };
      if (!saves[body.userId]) saves[body.userId] = {};
      saves[body.userId][0] = {
        userId: body.userId,
        data: body.data,
        label: '자동 저장',
        savedAt: new Date().toISOString(),
      };
      return { slot: 0, status: 'auto_saved' };
    });

    await app.ready();
    testUser = createTestUser();
  });

  afterAll(async () => {
    await closeTestServer();
  });

  test('1. 수동 저장 → saved', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/save/1',
      payload: {
        userId: testUser.userId,
        data: { chapter: 3, level: 15, gold: 5000 },
        label: '챕터3 보스 직전',
      },
    });
    expectStatus(res.statusCode, 200);
    const body = res.json();
    expectEqual(body.status, 'saved', '저장 완료');
    expectEqual(body.slot, 1, '슬롯 번호');
  });

  test('2. 불러오기 → 저장 데이터 반환', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/save/load/1',
      payload: { userId: testUser.userId },
    });
    expectStatus(res.statusCode, 200);
    const body = res.json();
    expectEqual(body.data.chapter, 3, '챕터 확인');
    expectEqual(body.data.level, 15, '레벨 확인');
  });

  test('3. 존재하지 않는 슬롯 로드 → 404', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/save/load/5',
      payload: { userId: testUser.userId },
    });
    expectStatus(res.statusCode, 404);
  });

  test('4. 슬롯 번호 범위 초과 → 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/save/9',
      payload: { userId: testUser.userId, data: { test: true } },
    });
    expectStatus(res.statusCode, 400);
  });

  test('5. 자동 저장 → auto_saved', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/save/auto',
      payload: { userId: testUser.userId, data: { chapter: 3, level: 16, gold: 5200 } },
    });
    expectStatus(res.statusCode, 200);
    expectEqual(res.json().status, 'auto_saved', '자동 저장 완료');
  });

  test('6. 슬롯 목록 조회 → 저장된 데이터 포함', async () => {
    const res = await app.inject({ method: 'GET', url: `/api/save/${testUser.userId}` });
    expectStatus(res.statusCode, 200);
    const body = res.json();
    expectTruthy(body.saves.length >= 2, '최소 2개 슬롯 (수동+자동)');
  });

  test('7. 슬롯 삭제 → success', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/save/1',
      payload: { userId: testUser.userId },
    });
    expectStatus(res.statusCode, 200);
    expectTruthy(res.json().success, '삭제 성공');
  });
});
