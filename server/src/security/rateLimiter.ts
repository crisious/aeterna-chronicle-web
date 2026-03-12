/**
 * Rate Limiter — P9-09 강화판
 * P4-15 → P9-09: Redis sliding window + API별 세분화 + IP 차단/화이트리스트
 *
 * - Redis Sorted Set 슬라이딩 윈도우
 * - API별 세분화: 인증 5/min, 일반 60/min, 결제 10/min, 어드민 30/min
 * - IP 기반 자동 차단 (반복 위반 시)
 * - 화이트리스트 IP (내부 서비스, 헬스체크)
 * - 위반 시 429 응답 + 감사 로그 + Retry-After 헤더
 */
import { FastifyRequest, FastifyReply } from 'fastify';
import { redisClient, redisConnected } from '../redis';

// ─── Rate Limit 프로필 ──────────────────────────────────────────

export interface RateLimitProfile {
  /** 윈도우 크기 (초) */
  windowSec: number;
  /** 윈도우 내 최대 요청 수 */
  maxRequests: number;
  /** 프로필 이름 (로깅용) */
  name: string;
}

/** 기본 프로필: 60 req/min */
const DEFAULT_PROFILE: RateLimitProfile = {
  windowSec: 60,
  maxRequests: 60,
  name: 'general',
};

/** 엔드포인트 접두사 → 프로필 매핑 (P9-09 세분화) */
const ROUTE_PROFILES: Array<{ prefix: string; profile: RateLimitProfile }> = [
  // 인증: 5/min (브루트포스 방어)
  { prefix: '/api/auth/login', profile: { windowSec: 60, maxRequests: 5, name: 'auth' } },
  { prefix: '/api/auth/register', profile: { windowSec: 60, maxRequests: 5, name: 'auth' } },
  { prefix: '/api/auth/2fa', profile: { windowSec: 60, maxRequests: 5, name: 'auth' } },

  // 결제: 10/min (악용 방지)
  { prefix: '/api/payment', profile: { windowSec: 60, maxRequests: 10, name: 'payment' } },
  { prefix: '/api/stripe', profile: { windowSec: 60, maxRequests: 10, name: 'payment' } },

  // 어드민: 30/min
  { prefix: '/api/admin', profile: { windowSec: 60, maxRequests: 30, name: 'admin' } },

  // GDPR: 5/min (무거운 작업)
  { prefix: '/api/gdpr', profile: { windowSec: 60, maxRequests: 5, name: 'gdpr' } },
];

/** 경로에 맞는 프로필 탐색 */
function resolveProfile(url: string): RateLimitProfile {
  for (const entry of ROUTE_PROFILES) {
    if (url.startsWith(entry.prefix)) return entry.profile;
  }
  return DEFAULT_PROFILE;
}

// ─── IP 차단/화이트리스트 ───────────────────────────────────────

/** 화이트리스트 IP (레이트 리밋 면제) */
const IP_WHITELIST = new Set<string>([
  '127.0.0.1',
  '::1',
  // Stripe webhook IP 대역은 Stripe 서명 검증으로 보호
]);

/** 차단된 IP → 해제 시각 (ms) */
const blockedIPs = new Map<string, number>();

/** IP 위반 횟수 (자동 차단 판정용) */
const ipViolationCount = new Map<string, { count: number; firstAt: number }>();

/** 5분 내 50회 위반 시 30분 자동 차단 */
const AUTO_BLOCK_WINDOW_MS = 5 * 60 * 1000;
const AUTO_BLOCK_THRESHOLD = 50;
const AUTO_BLOCK_DURATION_MS = 30 * 60 * 1000;

/** IP 화이트리스트 추가 */
export function addWhitelistIP(ip: string): void {
  IP_WHITELIST.add(ip);
}

/** IP 화이트리스트 제거 */
export function removeWhitelistIP(ip: string): void {
  IP_WHITELIST.delete(ip);
}

/** IP 수동 차단 */
export function blockIP(ip: string, durationMs = AUTO_BLOCK_DURATION_MS): void {
  blockedIPs.set(ip, Date.now() + durationMs);
}

/** IP 차단 해제 */
export function unblockIP(ip: string): void {
  blockedIPs.delete(ip);
  ipViolationCount.delete(ip);
}

/** IP 차단 여부 확인 */
function isBlocked(ip: string): boolean {
  const until = blockedIPs.get(ip);
  if (!until) return false;
  if (Date.now() > until) {
    blockedIPs.delete(ip);
    return false;
  }
  return true;
}

/** IP 위반 누적 + 자동 차단 판정 */
function recordIPViolation(ip: string): void {
  const now = Date.now();
  let entry = ipViolationCount.get(ip);
  if (!entry || now - entry.firstAt > AUTO_BLOCK_WINDOW_MS) {
    entry = { count: 0, firstAt: now };
    ipViolationCount.set(ip, entry);
  }
  entry.count++;

  if (entry.count >= AUTO_BLOCK_THRESHOLD) {
    blockIP(ip, AUTO_BLOCK_DURATION_MS);
    ipViolationCount.delete(ip);
  }
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

/** 만료된 차단 IP 정리 (5분 간격) */
setInterval(() => {
  const now = Date.now();
  for (const [ip, until] of blockedIPs) {
    if (now > until) blockedIPs.delete(ip);
  }
}, 5 * 60 * 1000);

// ─── 감사 로그 ──────────────────────────────────────────────────

interface RateLimitViolation {
  ip: string;
  path: string;
  profile: string;
  ts: number;
}

const rateLimitViolations: RateLimitViolation[] = [];

/** 최근 위반 로그 조회 (최대 100건) */
export function getRecentViolations(limit = 100): RateLimitViolation[] {
  return rateLimitViolations.slice(-limit);
}

/** 현재 차단된 IP 목록 */
export function getBlockedIPs(): Array<{ ip: string; until: number }> {
  const result: Array<{ ip: string; until: number }> = [];
  const now = Date.now();
  for (const [ip, until] of blockedIPs) {
    if (until > now) result.push({ ip, until });
  }
  return result;
}

// ─── 미들웨어 ───────────────────────────────────────────────────

/**
 * Fastify preHandler 미들웨어.
 * Redis sliding window + IP 차단/화이트리스트.
 */
export async function rateLimitMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const ip = request.ip;

  // 화이트리스트 면제
  if (IP_WHITELIST.has(ip)) return;

  // IP 차단 확인
  if (isBlocked(ip)) {
    const until = blockedIPs.get(ip) ?? 0;
    const retryAfterSec = Math.ceil((until - Date.now()) / 1000);
    reply.status(429).send({
      error: 'IP가 일시적으로 차단되었습니다.',
      retryAfterSec,
      code: 'IP_BLOCKED',
    });
    return;
  }

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
  reply.header('X-RateLimit-Profile', profile.name);

  if (currentCount > profile.maxRequests) {
    // 감사 로그 기록
    rateLimitViolations.push({ ip, path: url, profile: profile.name, ts: now });
    if (rateLimitViolations.length > 10_000) rateLimitViolations.splice(0, 5_000);

    // IP 위반 누적
    recordIPViolation(ip);

    reply.header('Retry-After', profile.windowSec);
    reply.status(429).send({
      error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
      retryAfterSec: profile.windowSec,
      profile: profile.name,
      code: 'RATE_LIMITED',
    });
  }
}
