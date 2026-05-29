/**
 * 유닛 테스트 — SECURITY-IDOR: 전역 인증 게이트(authGate)
 *
 * deny-by-default 게이트가 (1) 공개 라우트는 토큰 없이 통과, (2) 그 외에는 유효 토큰을 요구하고
 * request.authUserId 를 주입, (3) 플레이어/어드민 토큰 모두 인증 통과, (4) OPTIONS/HEAD 통과하는지 검증.
 * 또한 PUBLIC_ROUTES 화이트리스트가 알려진 취약(IDOR) 라우트를 공개로 포함하지 않는지(회귀 가드) 확인한다.
 */
import { describe, expect, test } from 'vitest';
import jwt from 'jsonwebtoken';

import {
  authGate,
  isPublicRoute,
  getRouteUrl,
  PUBLIC_ROUTES,
} from '../../server/src/security/authGate';
import { generateTokens } from '../../server/src/security/jwtManager';

// ── mock 헬퍼 ────────────────────────────────────────────────

interface MockReply {
  statusCode: number;
  payload: unknown;
  status(n: number): MockReply;
  send(b: unknown): MockReply;
}

function mockReply(): MockReply {
  const r: MockReply = {
    statusCode: 0,
    payload: undefined,
    status(n: number) {
      r.statusCode = n;
      return r;
    },
    send(b: unknown) {
      r.payload = b;
      return r;
    },
  };
  return r;
}

function mockReq(opts: { method?: string; url?: string; auth?: string }): any {
  return {
    method: opts.method ?? 'POST',
    routeOptions: { url: opts.url },
    headers: opts.auth ? { authorization: opts.auth } : {},
  };
}

describe('SECURITY-IDOR: authGate', () => {
  test('isPublicRoute — 공개 라우트만 true', () => {
    expect(isPublicRoute('GET', '/api/health')).toBe(true);
    expect(isPublicRoute('POST', '/api/auth/login')).toBe(true);
    expect(isPublicRoute('GET', '/api/monsters/:id')).toBe(true);
    expect(isPublicRoute('GET', '/api/shop/items')).toBe(true);
    // 메서드 구분: 같은 경로라도 메서드가 다르면 공개 아님
    expect(isPublicRoute('POST', '/api/currency/transfer')).toBe(false);
    expect(isPublicRoute('GET', '/api/currency/:userId')).toBe(false);
    expect(isPublicRoute('POST', undefined)).toBe(false);
  });

  test('보안 회귀 가드 — 알려진 취약(IDOR) 라우트는 공개 목록에 없어야 함', () => {
    const mustNotBePublic = [
      'POST /api/currency/transfer',
      'POST /api/payment/refund',
      'POST /api/stripe/refund',
      'POST /api/npcs/:id/trade',
      'POST /api/party/:id/reward',
      'POST /api/trade/confirm',
      'GET /api/save/:userId',
      'DELETE /api/inventory/:slotId',
      'GET /api/currency/:userId/history',
      'GET /api/notifications/:userId',
      'POST /api/achievements/check',
      'PATCH /api/skills/equip',
    ];
    for (const r of mustNotBePublic) {
      expect(PUBLIC_ROUTES.has(r), r).toBe(false);
    }
  });

  test('getRouteUrl — routeOptions.url 우선, routerPath fallback', () => {
    expect(getRouteUrl({ routeOptions: { url: '/a' } } as any)).toBe('/a');
    expect(getRouteUrl({ routerPath: '/b' } as any)).toBe('/b');
    expect(getRouteUrl({} as any)).toBeUndefined();
  });

  test('OPTIONS/HEAD 는 통과 (CORS preflight)', async () => {
    const optReply = mockReply();
    await authGate(mockReq({ method: 'OPTIONS', url: '/api/currency/transfer' }), optReply as any);
    expect(optReply.statusCode).toBe(0);

    const headReply = mockReply();
    await authGate(mockReq({ method: 'HEAD', url: '/api/currency/:userId' }), headReply as any);
    expect(headReply.statusCode).toBe(0);
  });

  test('공개 라우트 — 토큰 없이 통과, authUserId 미설정', async () => {
    const reply = mockReply();
    const req = mockReq({ method: 'GET', url: '/api/health' });
    await authGate(req, reply as any);
    expect(reply.statusCode).toBe(0);
    expect(req.authUserId).toBeUndefined();
  });

  test('보호 라우트 — 토큰 없으면 401', async () => {
    const reply = mockReply();
    await authGate(mockReq({ method: 'POST', url: '/api/currency/transfer' }), reply as any);
    expect(reply.statusCode).toBe(401);
  });

  test('보호 라우트 — 잘못된 토큰이면 401', async () => {
    const reply = mockReply();
    await authGate(
      mockReq({ method: 'POST', url: '/api/currency/transfer', auth: 'Bearer not-a-jwt' }),
      reply as any,
    );
    expect(reply.statusCode).toBe(401);
  });

  test('보호 라우트 — 유효 플레이어 토큰이면 통과 + authUserId 주입', async () => {
    const { accessToken } = generateTokens({ userId: 'player-1', role: 'user' });
    const reply = mockReply();
    const req = mockReq({
      method: 'POST',
      url: '/api/currency/transfer',
      auth: `Bearer ${accessToken}`,
    });
    await authGate(req, reply as any);
    expect(reply.statusCode).toBe(0);
    expect(req.authUserId).toBe('player-1');
  });

  test('보호 라우트 — 어드민 토큰(별도 시크릿)도 인증 통과', async () => {
    const adminToken = jwt.sign(
      { userId: 'admin-1', role: 'admin' },
      process.env.JWT_ADMIN_SECRET as string,
      { expiresIn: '1h' },
    );
    const reply = mockReply();
    const req = mockReq({ method: 'GET', url: '/admin/stats', auth: `Bearer ${adminToken}` });
    await authGate(req, reply as any);
    expect(reply.statusCode).toBe(0);
    expect(req.authUserId).toBe('admin-1');
  });
});
