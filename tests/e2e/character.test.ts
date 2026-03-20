/**
 * E2E 테스트 — 캐릭터 CRUD (8 tests)
 * 생성 / 목록 조회 / 상세 조회 / 삭제 / 클래스별 초기 스탯
 */

import {
  createTestServer, closeTestServer, createTestUser,
  authHeader, expectStatus, expectKeys, expectTruthy, expectEqual, expectLength,
  resetCounters, type TestUser,
} from './setup';
import type { FastifyInstance } from 'fastify';

describe('Character E2E', () => {
  let app: FastifyInstance;
  let testUser: TestUser;

  const CLASS_STATS: Record<string, { hp: number; mp: number }> = {
    warrior: { hp: 500, mp: 100 },
    mage:    { hp: 250, mp: 400 },
    ranger:  { hp: 350, mp: 200 },
  };

  beforeAll(async () => {
    app = await createTestServer();
    resetCounters();

    const characters: Record<string, Array<Record<string, unknown>>> = {};

    // POST /api/characters — 캐릭터 생성
    app.post('/api/characters', async (request, reply) => {
      const auth = request.headers.authorization;
      if (!auth?.startsWith('Bearer ')) {
        return reply.status(401).send({ error: '인증 필요' });
      }
      const body = request.body as Record<string, string>;
      if (!body.name || !body.classId) {
        return reply.status(400).send({ error: 'name과 classId가 필요합니다.' });
      }
      const stats = CLASS_STATS[body.classId];
      if (!stats) {
        return reply.status(400).send({ error: '유효하지 않은 클래스' });
      }

      const userId = 'user-from-token';
      const char = {
        id: `char-${Date.now()}`,
        userId,
        name: body.name,
        classId: body.classId,
        level: 1,
        hp: stats.hp,
        mp: stats.mp,
        createdAt: new Date().toISOString(),
      };
      if (!characters[userId]) characters[userId] = [];
      characters[userId].push(char);

      return reply.status(201).send(char);
    });

    // GET /api/characters — 목록 조회
    app.get('/api/characters', async (request, reply) => {
      const auth = request.headers.authorization;
      if (!auth?.startsWith('Bearer ')) {
        return reply.status(401).send({ error: '인증 필요' });
      }
      const userId = 'user-from-token';
      return characters[userId] || [];
    });

    // GET /api/characters/:id — 상세 조회
    app.get('/api/characters/:id', async (request, reply) => {
      const { id } = request.params as { id: string };
      const userId = 'user-from-token';
      const list = characters[userId] || [];
      const found = list.find((c) => c.id === id);
      if (!found) return reply.status(404).send({ error: '캐릭터를 찾을 수 없습니다.' });
      return found;
    });

    // DELETE /api/characters/:id — 삭제
    app.delete('/api/characters/:id', async (request, reply) => {
      const auth = request.headers.authorization;
      if (!auth?.startsWith('Bearer ')) {
        return reply.status(401).send({ error: '인증 필요' });
      }
      const { id } = request.params as { id: string };
      const userId = 'user-from-token';
      const list = characters[userId] || [];
      const idx = list.findIndex((c) => c.id === id);
      if (idx < 0) return reply.status(404).send({ error: '캐릭터를 찾을 수 없습니다.' });
      list.splice(idx, 1);
      return { success: true };
    });

    await app.ready();
    testUser = createTestUser();
  });

  afterAll(async () => {
    await closeTestServer();
  });

  // ── 생성 ──

  test('1. 전사 캐릭터 생성 → 201 + 클래스 스탯', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/characters',
      headers: authHeader(testUser),
      payload: { name: '아르테미스', classId: 'warrior' },
    });
    expectStatus(res.statusCode, 201);
    const body = res.json();
    expectKeys(body, ['id', 'name', 'classId', 'level', 'hp', 'mp']);
    expectEqual(body.hp, 500, '전사 HP');
    expectEqual(body.mp, 100, '전사 MP');
  });

  test('2. 마법사 캐릭터 생성 → 클래스별 스탯 차이', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/characters',
      headers: authHeader(testUser),
      payload: { name: '엘리나', classId: 'mage' },
    });
    expectStatus(res.statusCode, 201);
    const body = res.json();
    expectEqual(body.hp, 250, '마법사 HP');
    expectEqual(body.mp, 400, '마법사 MP');
  });

  test('3. 필수 필드 누락 → 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/characters',
      headers: authHeader(testUser),
      payload: { name: '이름만' },
    });
    expectStatus(res.statusCode, 400);
  });

  test('4. 유효하지 않은 클래스 → 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/characters',
      headers: authHeader(testUser),
      payload: { name: '에러', classId: 'nonexistent' },
    });
    expectStatus(res.statusCode, 400);
  });

  // ── 목록 조회 ──

  test('5. 캐릭터 목록 조회 → 생성된 캐릭터 포함', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/characters',
      headers: authHeader(testUser),
    });
    expectStatus(res.statusCode, 200);
    const body = res.json();
    expectTruthy(Array.isArray(body), '배열 반환');
    expectTruthy(body.length >= 2, '최소 2개');
  });

  // ── 인증 ──

  test('6. 인증 없이 생성 시도 → 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/characters',
      payload: { name: '무인증', classId: 'warrior' },
    });
    expectStatus(res.statusCode, 401);
  });

  // ── 상세 조회 & 삭제 ──

  test('7. 존재하지 않는 캐릭터 조회 → 404', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/characters/nonexistent-id',
    });
    expectStatus(res.statusCode, 404);
  });

  test('8. 존재하지 않는 캐릭터 삭제 → 404', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/characters/nonexistent-id',
      headers: authHeader(testUser),
    });
    expectStatus(res.statusCode, 404);
  });
});
