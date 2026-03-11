/**
 * 통합 테스트 — 인증 플로우 (8 tests)
 * 회원가입 → 로그인 → 토큰 갱신 → 권한 검증 → 로그아웃
 */
import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';

// ── 테스트 서버 설정 ────────────────────────────────────────

let app: FastifyInstance;
const users: Record<string, { password: string; token: string; refreshToken: string; role: string }> = {};

beforeAll(async () => {
  app = Fastify({ logger: false });

  // 회원가입
  app.post('/api/auth/register', async (req, reply) => {
    const body = req.body as Record<string, string>;
    if (!body.email || !body.password) return reply.status(400).send({ error: '필수 필드 누락' });
    if (users[body.email]) return reply.status(409).send({ error: '중복 이메일' });
    const token = `tok_${Date.now()}`;
    const refreshToken = `ref_${Date.now()}`;
    users[body.email] = { password: body.password, token, refreshToken, role: 'user' };
    return reply.status(201).send({ userId: body.email, token, refreshToken });
  });

  // 로그인
  app.post('/api/auth/login', async (req, reply) => {
    const body = req.body as Record<string, string>;
    const user = users[body.email];
    if (!user || user.password !== body.password) return reply.status(401).send({ error: '인증 실패' });
    user.token = `tok_${Date.now()}`;
    user.refreshToken = `ref_${Date.now()}`;
    return { token: user.token, refreshToken: user.refreshToken, role: user.role };
  });

  // 토큰 갱신
  app.post('/api/auth/refresh', async (req, reply) => {
    const body = req.body as Record<string, string>;
    const entry = Object.values(users).find(u => u.refreshToken === body.refreshToken);
    if (!entry) return reply.status(401).send({ error: '유효하지 않은 토큰' });
    entry.token = `tok_new_${Date.now()}`;
    entry.refreshToken = `ref_new_${Date.now()}`;
    return { token: entry.token, refreshToken: entry.refreshToken };
  });

  // 프로필 (인증 필요)
  app.get('/api/auth/me', async (req, reply) => {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return reply.status(401).send({ error: '인증 필요' });
    const token = auth.slice(7);
    const entry = Object.entries(users).find(([, u]) => u.token === token);
    if (!entry) return reply.status(401).send({ error: '유효하지 않은 토큰' });
    return { email: entry[0], role: entry[1].role };
  });

  // 로그아웃
  app.post('/api/auth/logout', async (req, reply) => {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return reply.status(401).send({ error: '인증 필요' });
    const token = auth.slice(7);
    const entry = Object.values(users).find(u => u.token === token);
    if (entry) { entry.token = ''; entry.refreshToken = ''; }
    return { success: true };
  });

  await app.ready();
});

afterAll(async () => { await app.close(); });

// ── 테스트 ──────────────────────────────────────────────────

describe('Auth Flow 통합', () => {
  let token = '';
  let refreshToken = '';

  // 1. 회원가입 성공
  test('1. 회원가입 → 201 + 토큰 반환', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/auth/register', payload: { email: 'flow@test.dev', password: 'Pass123!' } });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.token).toBeTruthy();
    expect(body.refreshToken).toBeTruthy();
  });

  // 2. 중복 회원가입 → 409
  test('2. 중복 이메일 → 409', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/auth/register', payload: { email: 'flow@test.dev', password: 'xxx' } });
    expect(res.statusCode).toBe(409);
  });

  // 3. 로그인 성공
  test('3. 로그인 → 토큰 획득', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'flow@test.dev', password: 'Pass123!' } });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    token = body.token;
    refreshToken = body.refreshToken;
    expect(token).toBeTruthy();
  });

  // 4. 잘못된 비밀번호 → 401
  test('4. 잘못된 비밀번호 → 401', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'flow@test.dev', password: 'wrong' } });
    expect(res.statusCode).toBe(401);
  });

  // 5. 인증된 프로필 조회
  test('5. 프로필 조회 → 이메일/역할 반환', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/auth/me', headers: { Authorization: `Bearer ${token}` } });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).email).toBe('flow@test.dev');
  });

  // 6. 인증 없이 프로필 → 401
  test('6. 인증 없이 프로필 → 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/auth/me' });
    expect(res.statusCode).toBe(401);
  });

  // 7. 토큰 갱신
  test('7. 토큰 갱신 → 새 토큰 발급', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/auth/refresh', payload: { refreshToken } });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.token).toBeTruthy();
    token = body.token;
  });

  // 8. 로그아웃
  test('8. 로그아웃 → 이후 프로필 조회 실패', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/auth/logout', headers: { Authorization: `Bearer ${token}` } });
    expect(res.statusCode).toBe(200);
    const res2 = await app.inject({ method: 'GET', url: '/api/auth/me', headers: { Authorization: `Bearer ${token}` } });
    expect(res2.statusCode).toBe(401);
  });
});
