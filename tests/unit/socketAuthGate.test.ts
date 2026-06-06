/**
 * 유닛 테스트 — SECURITY-IDOR: Socket.IO 핸드셰이크 인증 미들웨어(socketAuthGate)
 *
 * (1) 유효 플레이어 토큰 → socket.data.userId/role 주입 + next() 무에러
 * (2) 어드민 토큰(별도 시크릿)도 인증 통과(HTTP authGate 와 동일 dual-secret 정책)
 * (3) 토큰 없음/무효 → next(Error) 로 연결 거부, socket.data 미설정
 * (4) 거부 메시지에 소문자 'unauthorized' 포함 — 클라(NetworkManager.connect_error)의 자동 토큰갱신
 *     분기가 err.message.includes('unauthorized') 로 매칭하므로, 이 계약이 깨지면 토큰만료 시 전원잠금된다.
 * (5) extractHandshakeToken: auth.token 우선, query.token 폴백, 'Bearer ' 접두 제거, 누락 시 null
 */
import { describe, expect, test } from 'vitest';
import jwt from 'jsonwebtoken';

import {
  socketAuthGate,
  extractHandshakeToken,
  resolveSocketIdentity,
} from '../../server/src/security/socketAuthGate';
import { generateTokens } from '../../server/src/security/jwtManager';

interface MockSocket {
  handshake: { auth?: { token?: unknown }; query?: Record<string, unknown> };
  data: { userId?: string; role?: string };
}

function mockSocket(token?: string, opts: { viaQuery?: boolean } = {}): MockSocket {
  const s: MockSocket = { handshake: {}, data: {} };
  if (token !== undefined) {
    if (opts.viaQuery) s.handshake.query = { token };
    else s.handshake.auth = { token };
  }
  return s;
}

async function run(socket: MockSocket): Promise<Error | undefined> {
  let captured: Error | undefined = new Error('next-not-called');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await socketAuthGate(socket as any, (e) => { captured = e; });
  return captured;
}

describe('SECURITY-IDOR: socketAuthGate', () => {
  test('extractHandshakeToken — auth.token 우선, query 폴백, Bearer 제거, 누락 null', () => {
    expect(extractHandshakeToken({ auth: { token: 'abc' } })).toBe('abc');
    expect(extractHandshakeToken({ auth: { token: 'Bearer xyz' } })).toBe('xyz');
    expect(extractHandshakeToken({ query: { token: 'q1' } })).toBe('q1');
    // auth 우선
    expect(extractHandshakeToken({ auth: { token: 'a' }, query: { token: 'q' } })).toBe('a');
    expect(extractHandshakeToken({})).toBeNull();
    expect(extractHandshakeToken({ auth: { token: 123 as unknown } })).toBeNull();
    expect(extractHandshakeToken({ auth: { token: '' } })).toBeNull();
  });

  test('유효 플레이어 토큰 → socket.data.userId/role 주입 + next 무에러', async () => {
    const { accessToken } = generateTokens({ userId: 'player-1', role: 'user' });
    const socket = mockSocket(accessToken);
    const err = await run(socket);
    expect(err).toBeUndefined();
    expect(socket.data.userId).toBe('player-1');
    expect(socket.data.role).toBe('user');
  });

  test('query.token 폴백으로도 인증', async () => {
    const { accessToken } = generateTokens({ userId: 'player-2', role: 'user' });
    const socket = mockSocket(accessToken, { viaQuery: true });
    const err = await run(socket);
    expect(err).toBeUndefined();
    expect(socket.data.userId).toBe('player-2');
  });

  test('Bearer 접두가 붙은 토큰도 인증', async () => {
    const { accessToken } = generateTokens({ userId: 'player-3', role: 'user' });
    const socket = mockSocket(`Bearer ${accessToken}`);
    const err = await run(socket);
    expect(err).toBeUndefined();
    expect(socket.data.userId).toBe('player-3');
  });

  test('어드민 토큰(별도 시크릿)도 인증 통과', async () => {
    const adminToken = jwt.sign(
      { userId: 'admin-1', role: 'admin' },
      process.env.JWT_ADMIN_SECRET as string,
      { expiresIn: '1h' },
    );
    const socket = mockSocket(adminToken);
    const err = await run(socket);
    expect(err).toBeUndefined();
    expect(socket.data.userId).toBe('admin-1');
    expect(socket.data.role).toBe('admin');
  });

  test('토큰 없음 → 거부 + 메시지에 소문자 unauthorized + socket.data 미설정', async () => {
    const socket = mockSocket();
    const err = await run(socket);
    expect(err).toBeInstanceOf(Error);
    expect(err?.message).toContain('unauthorized');
    expect(socket.data.userId).toBeUndefined();
  });

  test('무효 토큰 → 거부 + 메시지에 소문자 unauthorized', async () => {
    const socket = mockSocket('not-a-jwt');
    const err = await run(socket);
    expect(err).toBeInstanceOf(Error);
    expect(err?.message).toContain('unauthorized');
    expect(socket.data.userId).toBeUndefined();
  });

  test('resolveSocketIdentity — 무효 토큰이면 null', async () => {
    expect(await resolveSocketIdentity('garbage-token')).toBeNull();
  });
});
