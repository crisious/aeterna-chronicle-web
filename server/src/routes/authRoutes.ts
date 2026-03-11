/**
 * 인증 REST API 라우트
 * P4-15: 보안 강화
 *
 * - POST /api/auth/register — 회원가입
 * - POST /api/auth/login    — 로그인
 * - POST /api/auth/refresh  — 토큰 갱신
 * - POST /api/auth/logout   — 로그아웃
 * - GET  /api/auth/me        — 내 정보
 */
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../db';
import {
  generateTokens,
  verifyAccessToken,
  refreshTokens,
  logoutTokens,
  TokenPayload,
} from '../security/jwtManager';

// ─── 간이 비밀번호 해싱 (프로덕션에서는 bcrypt 사용) ────────────

import { createHash } from 'crypto';

function hashPassword(pw: string): string {
  return createHash('sha256').update(pw).digest('hex');
}

// ─── 요청 타입 ──────────────────────────────────────────────────

interface RegisterBody {
  email: string;
  password: string;
}

interface LoginBody {
  email: string;
  password: string;
}

interface RefreshBody {
  refreshToken: string;
  accessToken?: string;
}

interface LogoutBody {
  accessToken: string;
  refreshToken?: string;
}

// ─── 라우트 등록 ────────────────────────────────────────────────

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  // ── 회원가입 ──────────────────────────────────────────────────
  fastify.post('/api/auth/register', async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, password } = request.body as RegisterBody;

    if (!email || !password) {
      return reply.status(400).send({ error: 'email과 password는 필수입니다.' });
    }
    if (password.length < 6) {
      return reply.status(400).send({ error: '비밀번호는 6자 이상이어야 합니다.' });
    }

    // 이메일 중복 확인
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return reply.status(409).send({ error: '이미 등록된 이메일입니다.' });
    }

    const user = await prisma.user.create({
      data: {
        email,
        password: hashPassword(password),
        role: 'user',
      },
    });

    const tokens = generateTokens({ userId: user.id, role: user.role });

    return reply.status(201).send({
      userId: user.id,
      email: user.email,
      role: user.role,
      ...tokens,
    });
  });

  // ── 로그인 ────────────────────────────────────────────────────
  fastify.post('/api/auth/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const { email, password } = request.body as LoginBody;

    if (!email || !password) {
      return reply.status(400).send({ error: 'email과 password는 필수입니다.' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.password !== hashPassword(password)) {
      return reply.status(401).send({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    if (user.isBanned) {
      return reply.status(403).send({ error: '정지된 계정입니다.', reason: user.banReason });
    }

    const tokens = generateTokens({ userId: user.id, role: user.role });

    return reply.send({
      userId: user.id,
      email: user.email,
      role: user.role,
      ...tokens,
    });
  });

  // ── 토큰 갱신 ─────────────────────────────────────────────────
  fastify.post('/api/auth/refresh', async (request: FastifyRequest, reply: FastifyReply) => {
    const { refreshToken, accessToken } = request.body as RefreshBody;

    if (!refreshToken) {
      return reply.status(400).send({ error: 'refreshToken은 필수입니다.' });
    }

    try {
      const tokens = await refreshTokens(refreshToken, accessToken);
      return reply.send(tokens);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Refresh token 검증 실패';
      return reply.status(401).send({ error: message });
    }
  });

  // ── 로그아웃 ──────────────────────────────────────────────────
  fastify.post('/api/auth/logout', async (request: FastifyRequest, reply: FastifyReply) => {
    const { accessToken, refreshToken } = request.body as LogoutBody;

    if (!accessToken) {
      return reply.status(400).send({ error: 'accessToken은 필수입니다.' });
    }

    await logoutTokens(accessToken, refreshToken);
    return reply.send({ success: true });
  });

  // ── 내 정보 ───────────────────────────────────────────────────
  fastify.get('/api/auth/me', async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ error: '인증 토큰이 필요합니다.' });
    }

    const token = authHeader.slice(7);
    let payload: TokenPayload;
    try {
      payload = await verifyAccessToken(token);
    } catch (err) {
      const message = err instanceof Error ? err.message : '토큰 검증 실패';
      return reply.status(401).send({ error: message });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, role: true, createdAt: true, tutorialStep: true },
    });

    if (!user) {
      return reply.status(404).send({ error: '사용자를 찾을 수 없습니다.' });
    }

    return reply.send(user);
  });
}
