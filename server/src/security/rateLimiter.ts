/**
 * Rate Limiter — 엔드포인트별 요청 제한
 * P4-15: 보안 강화
 *
 * - 기본: 100 req/min
 * - 로그인: 5 req/min
 * - 어드민: 30 req/min
 * - Redis 기반 슬라이딩 윈도우
 * - 위반 시 429 응답 + 감사 로그
 */
import { FastifyRequest, FastifyReply } from 'fastify';
import { redisClient, redisConnected } from '../redis';

// ─── Rate Limit 프로필 ──────────────────────────────────────────

export interface RateLimitProfile {
  /** 윈도우 크기 (초) */
  windowSec: number;
  /** 윈도우 내 최대 요청 수 */
  maxRequests: number;
}

/** 기본 프로필 */
const DEFAULT_PROFILE: RateLimitProfile = { windowSec: 60, maxRequests: 100 };

/** 엔드포인트 접두사 → 프로필 매핑 */
const ROUTE_PROFILES: Array<{ prefix: string; profile: RateLimitProfile }> = [
  { prefix: '/api/auth/login', profile: { windowSec: 60, maxRequests: 5 } },
  { prefix: '/api/auth/register', profile: { windowSec: 60, maxRequests: 5 } },
  { prefix: '/api/admin', profile: { windowSec: 60, maxRequests: 30 } },
];

/** 경로에 맞는 프로필 탐색 */
function resolveProfile(url: string): RateLimitProfile {
  for (const entry of ROUTE_PROFILES) {
    if (url.startsWith(entry.prefix)) return entry.profile;
  }
  return DEFAULT_PROFILE;
}

// ─── In-memory fallback (Redis 미연결 시) ───────────────────────

interface MemoryBucket {
  timestamps: number[];
}
const memoryStore = new Map<string, MemoryBucket>();

/** 1분마다 오래된 버킷 정리 */
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of memoryStore) {
    bucket.timestamps = bucket.timestamps.filter((t) => now - t < 120_000);
    if (bucket.timestamps.length === 0) memoryStore.delete(key);
  }
}, 60_000);

// ─── 감사 로그 ──────────────────────────────────────────────────

const rateLimitViolations: Array<{ ip: string; path: string; ts: number }> = [];

/** 최근 위반 로그 조회 (최대 100건) */
export function getRecentViolations(limit = 100): typeof rateLimitViolations {
  return rateLimitViolations.slice(-limit);
}

// ─── 미들웨어 ───────────────────────────────────────────────────

/**
 * Fastify preHandler 미들웨어.
 * 슬라이딩 윈도우 방식으로 요청 수를 제한한다.
 */
export async function rateLimitMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const ip = request.ip;
  const url = request.url;
  const profile = resolveProfile(url);
  const key = `rl:${ip}:${url.split('?')[0]}`;
  const now = Date.now();
  const windowMs = profile.windowSec * 1000;

  let currentCount: number;

  if (redisConnected) {
    // Redis 슬라이딩 윈도우 (Sorted Set)
    try {
      const multi = redisClient.multi();
      multi.zRemRangeByScore(key, 0, now - windowMs);
      multi.zAdd(key, { score: now, value: `${now}:${Math.random()}` });
      multi.zCard(key);
      multi.expire(key, profile.windowSec + 1);
      const results = await multi.exec();
      currentCount = (results?.[2] as number) ?? 0;
    } catch {
      // Redis 에러 시 통과 (가용성 우선)
      return;
    }
  } else {
    // In-memory fallback
    let bucket = memoryStore.get(key);
    if (!bucket) {
      bucket = { timestamps: [] };
      memoryStore.set(key, bucket);
    }
    bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);
    bucket.timestamps.push(now);
    currentCount = bucket.timestamps.length;
  }

  // 헤더 설정
  reply.header('X-RateLimit-Limit', profile.maxRequests);
  reply.header('X-RateLimit-Remaining', Math.max(0, profile.maxRequests - currentCount));

  if (currentCount > profile.maxRequests) {
    // 감사 로그 기록
    rateLimitViolations.push({ ip, path: url, ts: now });
    if (rateLimitViolations.length > 10_000) rateLimitViolations.splice(0, 5_000);

    reply.status(429).send({
      error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
      retryAfterSec: profile.windowSec,
    });
  }
}
