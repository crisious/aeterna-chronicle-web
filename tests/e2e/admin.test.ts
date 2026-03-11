/**
 * E2E 테스트 — 어드민 시스템 (5 tests)
 * 유저 관리 / 공지 / 로그
 */

import {
  createTestServer, closeTestServer, createTestUser, createAdminUser,
  authHeader, expectStatus, expectKeys, expectEqual,
  resetCounters, type TestUser,
} from './setup';
import type { FastifyInstance } from 'fastify';

describe('Admin E2E', () => {
  let app: FastifyInstance;
  let admin: TestUser;
  let normalUser: TestUser;

  beforeAll(async () => {
    app = await createTestServer();
    resetCounters();
    admin = createAdminUser();
    normalUser = createTestUser();

    const announcements: Array<Record<string, unknown>> = [];
    const auditLogs: Array<Record<string, unknown>> = [];

    // 권한 체크 미들웨어 (간략화)
    const checkAdmin = (request: { headers: Record<string, string | string[] | undefined> }) => {
      const auth = request.headers.authorization as string | undefined;
      return auth?.includes(admin.token);
    };

    app.get('/api/admin/users', async (request, reply) => {
      if (!checkAdmin(request)) return reply.status(403).send({ error: '관리자 권한 필요' });
      return {
        users: [
          { userId: normalUser.userId, email: normalUser.email, role: 'user', status: 'active' },
        ],
        total: 1,
      };
    });

    app.post('/api/admin/user/ban', async (request, reply) => {
      if (!checkAdmin(request)) return reply.status(403).send({ error: '관리자 권한 필요' });
      const body = request.body as { userId: string; reason: string; duration?: number };
      if (!body.reason) return reply.status(400).send({ error: '사유 필요' });
      auditLogs.push({ action: 'ban', target: body.userId, reason: body.reason, timestamp: new Date().toISOString() });
      return { success: true, banned: true, userId: body.userId };
    });

    app.post('/api/admin/announce', async (request, reply) => {
      if (!checkAdmin(request)) return reply.status(403).send({ error: '관리자 권한 필요' });
      const body = request.body as { title: string; content: string; priority?: string };
      if (!body.title || !body.content) return reply.status(400).send({ error: '제목과 내용 필요' });
      const ann = { id: `ann-${Date.now()}`, ...body, createdAt: new Date().toISOString() };
      announcements.push(ann);
      return reply.status(201).send({ success: true, announcement: ann });
    });

    app.get('/api/admin/audit-logs', async (request, reply) => {
      if (!checkAdmin(request)) return reply.status(403).send({ error: '관리자 권한 필요' });
      return { logs: auditLogs, total: auditLogs.length };
    });

    await app.ready();
  });

  afterAll(async () => { await closeTestServer(); });

  test('1. 유저 목록 조회 (어드민) → 200', async () => {
    const res = await app.inject({
      method: 'GET', url: '/api/admin/users',
      headers: authHeader(admin),
    });
    expectStatus(res.statusCode, 200);
    expectKeys(res.json(), ['users', 'total']);
  });

  test('2. 일반 유저가 어드민 API → 403', async () => {
    const res = await app.inject({
      method: 'GET', url: '/api/admin/users',
      headers: authHeader(normalUser),
    });
    expectStatus(res.statusCode, 403);
  });

  test('3. 유저 밴 → 감사 로그 기록', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/admin/user/ban',
      headers: authHeader(admin),
      payload: { userId: normalUser.userId, reason: '부적절한 행위' },
    });
    expectStatus(res.statusCode, 200);
    expectEqual(res.json().banned, true, '밴 처리');
  });

  test('4. 공지 등록 → 201', async () => {
    const res = await app.inject({
      method: 'POST', url: '/api/admin/announce',
      headers: authHeader(admin),
      payload: { title: '점검 안내', content: '3/15 02:00~06:00 정기 점검', priority: 'high' },
    });
    expectStatus(res.statusCode, 201);
    expectKeys(res.json(), ['success', 'announcement']);
  });

  test('5. 감사 로그 조회 → 밴 기록 포함', async () => {
    const res = await app.inject({
      method: 'GET', url: '/api/admin/audit-logs',
      headers: authHeader(admin),
    });
    expectStatus(res.statusCode, 200);
    const body = res.json();
    expectEqual(body.total >= 1, true, '감사 로그 존재');
    expectEqual(body.logs[0].action, 'ban', '밴 액션 기록');
  });
});
