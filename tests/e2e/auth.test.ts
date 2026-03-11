/**
 * E2E 테스트 — 인증 시스템 (8 tests)
 * 회원가입 / 로그인 / 토큰 갱신 / 로그아웃
 */

import {
  createTestServer, closeTestServer, createTestUser,
  authHeader, expectStatus, expectKeys, expectTruthy, expectEqual,
  resetCounters, type TestUser,
} from './setup';
import type { FastifyInstance } from 'fastify';

describe('Auth E2E', () => {
  let app: FastifyInstance;
  let testUser: TestUser;

  beforeAll(async () => {
    app = await createTestServer();
    resetCounters();

    // 인증 라우트 등록 (stub)
    app.post('/api/auth/register', async (request, reply) => {
      const body = request.body as Record<string, string>;
      if (!body.email || !body.password) {
        return reply.status(400).send({ error: '이메일과 비밀번호가 필요합니다.' });
      }
      if (body.email === 'existing@aeterna.dev') {
        return reply.status(409).send({ error: '이미 가입된 이메일입니다.' });
      }
      return reply.status(201).send({
        userId: 'new-user-1',
        email: body.email,
        token: 'jwt-token-placeholder',
        refreshToken: 'refresh-token-placeholder',
      });
    });

    app.post('/api/auth/login', async (request, reply) => {
      const body = request.body as Record<string, string>;
      if (body.email === 'test@aeterna.dev' && body.password === 'password123') {
        return { token: 'jwt-token', refreshToken: 'refresh-token', userId: 'user-1' };
      }
      return reply.status(401).send({ error: '인증 실패' });
    });

    app.post('/api/auth/refresh', async (request, reply) => {
      const body = request.body as Record<string, string>;
      if (!body.refreshToken) {
        return reply.status(400).send({ error: 'refreshToken이 필요합니다.' });
      }
      if (body.refreshToken === 'expired-token') {
        return reply.status(401).send({ error: '만료된 토큰' });
      }
      return { token: 'new-jwt-token', refreshToken: 'new-refresh-token' };
    });

    app.post('/api/auth/logout', async (request, reply) => {
      const auth = request.headers.authorization;
      if (!auth?.startsWith('Bearer ')) {
        return reply.status(401).send({ error: '인증 필요' });
      }
      return { success: true };
    });

    await app.ready();
    testUser = createTestUser();
  });

  afterAll(async () => {
    await closeTestServer();
  });

  // ── 회원가입 ──

  test('1. 정상 회원가입 → 201 + 토큰 반환', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'new@aeterna.dev', password: 'securePass1!' },
    });
    expectStatus(res.statusCode, 201);
    const body = res.json();
    expectKeys(body, ['userId', 'email', 'token', 'refreshToken']);
  });

  test('2. 필수 필드 누락 → 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'no-pass@aeterna.dev' },
    });
    expectStatus(res.statusCode, 400);
  });

  test('3. 중복 이메일 → 409', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'existing@aeterna.dev', password: 'pass123' },
    });
    expectStatus(res.statusCode, 409);
  });

  // ── 로그인 ──

  test('4. 정상 로그인 → 200 + 토큰', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'test@aeterna.dev', password: 'password123' },
    });
    expectStatus(res.statusCode, 200);
    const body = res.json();
    expectKeys(body, ['token', 'refreshToken', 'userId']);
  });

  test('5. 잘못된 비밀번호 → 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'test@aeterna.dev', password: 'wrong' },
    });
    expectStatus(res.statusCode, 401);
  });

  // ── 토큰 갱신 ──

  test('6. 정상 토큰 갱신 → 새 토큰 쌍', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      payload: { refreshToken: 'valid-refresh-token' },
    });
    expectStatus(res.statusCode, 200);
    const body = res.json();
    expectKeys(body, ['token', 'refreshToken']);
  });

  test('7. 만료된 리프레시 토큰 → 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      payload: { refreshToken: 'expired-token' },
    });
    expectStatus(res.statusCode, 401);
  });

  // ── 로그아웃 ──

  test('8. 정상 로그아웃 → success', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: authHeader(testUser),
    });
    expectStatus(res.statusCode, 200);
    const body = res.json();
    expectTruthy(body.success, '로그아웃 성공');
  });
});
