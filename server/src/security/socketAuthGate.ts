/**
 * socketAuthGate.ts — Socket.IO 핸드셰이크 인증 미들웨어 (deny-by-default)  [SECURITY-IDOR]
 *
 * 배경: HTTP 는 authGate(preHandler)로 인증되지만 Socket.IO 는 별도 인증 평면이 없었다(io.use 전무).
 * 그 결과 모든 소켓 핸들러가 클라가 보낸 data.userId 를 무검증 신뢰하는 systemic IDOR 표면이었다
 * (타인 명의 알림 도청·채팅 사칭·큐 등록 등).
 *
 * 이 미들웨어는 핸드셰이크에서 JWT(플레이어 또는 어드민)를 요구하고, 검증된 userId 를
 * socket.data.userId 에 주입한다. 핸들러는 클라 payload 대신 socket.data.userId 를 actor 로 사용한다.
 * - 인증(authentication): 이 게이트가 담당. 토큰 없거나 무효면 연결 거부(next(Error)).
 * - 인가/소유권(authorization): 각 핸들러가 socket.data.userId 기준으로 2차 수행.
 * - 어드민 역할 검증: HTTP 의 requireAdmin 처럼 필요한 이벤트 핸들러에서 별도 수행.
 *
 * deny-by-default: 토큰이 없거나 무효면 연결을 거부한다(authGate 와 동일 정책).
 * 거부 메시지에는 반드시 소문자 'unauthorized' 를 포함시킨다 — 클라(NetworkManager)의 connect_error
 * 자동 토큰갱신 분기가 err.message.includes('unauthorized') 로 매칭하기 때문(만료 자동복구의 단일 의존점).
 */
import type { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { verifyAccessToken } from './jwtManager';

const JWT_ADMIN_SECRET = process.env.JWT_ADMIN_SECRET;

/** 핸드셰이크에서 토큰 추출 — auth.token 우선, query.token 폴백. 'Bearer ' 접두 제거. */
export function extractHandshakeToken(handshake: {
  auth?: { token?: unknown };
  query?: Record<string, unknown>;
}): string | null {
  const raw = handshake?.auth?.token ?? handshake?.query?.token;
  if (typeof raw !== 'string' || raw.length === 0) return null;
  return raw.startsWith('Bearer ') ? raw.slice(7) : raw;
}

/**
 * 토큰 → {userId, role}. 플레이어 시크릿(verifyAccessToken, 블랙리스트 포함) 우선,
 * 실패 시 어드민 시크릿(JWT_ADMIN_SECRET) 폴백 — authGate.resolveUserId 와 동일 정책. 실패 시 null.
 */
export async function resolveSocketIdentity(
  token: string,
): Promise<{ userId: string; role: string } | null> {
  try {
    const payload = await verifyAccessToken(token);
    return { userId: payload.userId, role: payload.role };
  } catch {
    if (JWT_ADMIN_SECRET) {
      try {
        const decoded = jwt.verify(token, JWT_ADMIN_SECRET) as { userId?: string; role?: string };
        if (decoded?.userId) return { userId: decoded.userId, role: decoded.role ?? 'admin' };
      } catch {
        /* 어드민 검증도 실패 → null */
      }
    }
    return null;
  }
}

/**
 * io.use() 핸드셰이크 인증 미들웨어.
 * 유효 토큰이면 socket.data.userId/role 주입 후 next(), 아니면 next(Error('unauthorized…'))로 연결 거부.
 */
export async function socketAuthGate(
  socket: Socket,
  next: (err?: Error) => void,
): Promise<void> {
  const token = extractHandshakeToken(socket.handshake);
  if (!token) {
    next(new Error('unauthorized: missing socket handshake token'));
    return;
  }
  const identity = await resolveSocketIdentity(token);
  if (!identity) {
    next(new Error('unauthorized: invalid socket token'));
    return;
  }
  socket.data.userId = identity.userId;
  socket.data.role = identity.role;
  next();
}
