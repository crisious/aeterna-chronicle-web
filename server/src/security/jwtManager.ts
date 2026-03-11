/**
 * JWT 관리자 — Access/Refresh Token 발급·검증·갱신·블랙리스트
 * P4-15: 보안 강화
 *
 * - Access Token: 15분
 * - Refresh Token: 7일
 * - 블랙리스트: Redis (로그아웃 시)
 * - 페이로드: userId, role, iat, exp
 */
import jwt from 'jsonwebtoken';
import { redisClient, redisConnected } from '../redis';

// ─── 설정 ───────────────────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET || 'aeterna-chronicle-dev-secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'aeterna-refresh-dev-secret';
const ACCESS_EXPIRES = '15m';
const REFRESH_EXPIRES = '7d';

/** Access Token 만료 시간 (초) — 블랙리스트 TTL용 */
const ACCESS_TTL_SEC = 15 * 60;
/** Refresh Token 만료 시간 (초) */
const REFRESH_TTL_SEC = 7 * 24 * 60 * 60;

// ─── 타입 ───────────────────────────────────────────────────────

export interface TokenPayload {
  userId: string;
  role: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// ─── 토큰 발급 ──────────────────────────────────────────────────

/** Access + Refresh 토큰 쌍 생성 */
export function generateTokens(payload: TokenPayload): TokenPair {
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_EXPIRES });
  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES });
  return { accessToken, refreshToken };
}

// ─── 토큰 검증 ──────────────────────────────────────────────────

/** Access Token 검증 (블랙리스트 체크 포함) */
export async function verifyAccessToken(token: string): Promise<TokenPayload> {
  const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload & { iat: number; exp: number };

  // 블랙리스트 확인
  if (await isBlacklisted(token)) {
    throw new Error('토큰이 무효화되었습니다.');
  }

  return { userId: decoded.userId, role: decoded.role };
}

/** Refresh Token 검증 */
export function verifyRefreshToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload & { iat: number; exp: number };
  return { userId: decoded.userId, role: decoded.role };
}

// ─── 토큰 갱신 ──────────────────────────────────────────────────

/** Refresh Token으로 새 토큰 쌍 발급 (기존 Access Token은 블랙리스트) */
export async function refreshTokens(
  refreshToken: string,
  oldAccessToken?: string,
): Promise<TokenPair> {
  const payload = verifyRefreshToken(refreshToken);

  // 이전 Access Token 블랙리스트 등록
  if (oldAccessToken) {
    await blacklistToken(oldAccessToken, ACCESS_TTL_SEC);
  }

  return generateTokens({ userId: payload.userId, role: payload.role });
}

// ─── 블랙리스트 ─────────────────────────────────────────────────

/** 인메모리 블랙리스트 (Redis 미연결 시 fallback) */
const memoryBlacklist = new Map<string, number>(); // token → expireTs

/** 만료된 항목 정리 (5분 간격) */
setInterval(() => {
  const now = Date.now();
  for (const [token, expTs] of memoryBlacklist) {
    if (expTs < now) memoryBlacklist.delete(token);
  }
}, 5 * 60 * 1000);

/** 토큰을 블랙리스트에 등록 */
export async function blacklistToken(token: string, ttlSec: number): Promise<void> {
  const key = `bl:${token}`;
  if (redisConnected) {
    try {
      await redisClient.set(key, '1', { EX: ttlSec });
      return;
    } catch {
      // Redis 실패 시 인메모리 fallback
    }
  }
  memoryBlacklist.set(token, Date.now() + ttlSec * 1000);
}

/** 블랙리스트 여부 확인 */
export async function isBlacklisted(token: string): Promise<boolean> {
  const key = `bl:${token}`;
  if (redisConnected) {
    try {
      const val = await redisClient.get(key);
      return val !== null;
    } catch {
      // Redis 실패 시 인메모리 확인
    }
  }
  const expTs = memoryBlacklist.get(token);
  if (!expTs) return false;
  if (expTs < Date.now()) {
    memoryBlacklist.delete(token);
    return false;
  }
  return true;
}

/** 로그아웃 처리: Access + Refresh 모두 블랙리스트 */
export async function logoutTokens(accessToken: string, refreshToken?: string): Promise<void> {
  await blacklistToken(accessToken, ACCESS_TTL_SEC);
  if (refreshToken) {
    await blacklistToken(refreshToken, REFRESH_TTL_SEC);
  }
}
