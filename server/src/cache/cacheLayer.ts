/**
 * Redis 캐시 계층 — P4-16 성능 최적화 2차
 * 
 * 캐시 전략:
 *   NPC 목록: 5분 | 아이템 목록: 10분 | 레시피: 10분
 *   업적 목록: 30분 | 랭킹: 1분
 * 
 * 자동 무효화, 캐시 히트율 메트릭 포함.
 */

import { redisClient, redisConnected } from '../redis';

// ── 캐시 키 프리픽스 + TTL 전략 ─────────────────────────────

/** 캐시 네임스페이스별 TTL(초) 설정 */
export const CACHE_TTL: Record<string, number> = {
  'npc:list':         5 * 60,   // 5분
  'item:list':        10 * 60,  // 10분
  'recipe:list':      10 * 60,  // 10분
  'achievement:list': 30 * 60,  // 30분
  'ranking':          1 * 60,   // 1분
} as const;

/** 전체 캐시 키 프리픽스 */
const KEY_PREFIX = 'aeterna:cache:';

// ── 캐시 히트율 메트릭 ──────────────────────────────────────

interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  invalidations: number;
}

const metrics: CacheMetrics = {
  hits: 0,
  misses: 0,
  sets: 0,
  invalidations: 0,
};

/** 현재 캐시 히트율 메트릭 조회 */
export function getCacheMetrics(): CacheMetrics & { hitRate: number } {
  const total = metrics.hits + metrics.misses;
  return {
    ...metrics,
    hitRate: total > 0 ? Math.round((metrics.hits / total) * 10000) / 100 : 0,
  };
}

/** 메트릭 리셋 (테스트용) */
export function resetCacheMetrics(): void {
  metrics.hits = 0;
  metrics.misses = 0;
  metrics.sets = 0;
  metrics.invalidations = 0;
}

// ── 캐시 핵심 API ───────────────────────────────────────────

/**
 * 캐시에서 값 조회.
 * Redis 미연결 시 null 반환 (graceful degradation).
 */
export async function cacheGet<T>(namespace: string, key: string): Promise<T | null> {
  if (!redisConnected) return null;

  const fullKey = `${KEY_PREFIX}${namespace}:${key}`;
  try {
    const raw = await redisClient.get(fullKey);
    if (raw === null) {
      metrics.misses++;
      return null;
    }
    metrics.hits++;
    return JSON.parse(raw) as T;
  } catch {
    metrics.misses++;
    return null;
  }
}

/**
 * 캐시에 값 저장.
 * TTL은 namespace 기반 자동 결정, 수동 오버라이드 가능.
 */
export async function cacheSet<T>(
  namespace: string,
  key: string,
  value: T,
  ttlOverride?: number,
): Promise<void> {
  if (!redisConnected) return;

  const fullKey = `${KEY_PREFIX}${namespace}:${key}`;
  const ttl = ttlOverride ?? CACHE_TTL[namespace] ?? 300; // 기본 5분

  try {
    await redisClient.set(fullKey, JSON.stringify(value), { EX: ttl });
    metrics.sets++;
  } catch {
    // Redis 장애 시 무시 — DB 직접 조회 fallback
  }
}

/**
 * 특정 네임스페이스 또는 개별 키 무효화.
 * key를 생략하면 해당 네임스페이스 전체 무효화 (SCAN + DEL).
 */
export async function cacheInvalidate(namespace: string, key?: string): Promise<number> {
  if (!redisConnected) return 0;

  try {
    if (key) {
      // 개별 키 무효화
      const fullKey = `${KEY_PREFIX}${namespace}:${key}`;
      const deleted = await redisClient.del(fullKey);
      metrics.invalidations += deleted;
      return deleted;
    }

    // 네임스페이스 전체 무효화 (SCAN 패턴)
    const pattern = `${KEY_PREFIX}${namespace}:*`;
    let cursor = 0;
    let totalDeleted = 0;

    do {
      const result = await redisClient.scan(cursor, { MATCH: pattern, COUNT: 100 });
      cursor = result.cursor;
      if (result.keys.length > 0) {
        const deleted = await redisClient.del(result.keys);
        totalDeleted += deleted;
      }
    } while (cursor !== 0);

    metrics.invalidations += totalDeleted;
    return totalDeleted;
  } catch {
    return 0;
  }
}

/**
 * 캐시 워밍업 — 서버 시작 시 자주 조회되는 데이터를 미리 캐시.
 * fetcher 함수를 받아 결과를 캐시에 저장.
 */
export async function cacheWarmUp<T>(
  namespace: string,
  key: string,
  fetcher: () => Promise<T>,
): Promise<T> {
  const data = await fetcher();
  await cacheSet(namespace, key, data);
  return data;
}

/**
 * 캐시 조회 + 미스 시 자동 로드 (Cache-Aside 패턴).
 * 가장 자주 사용할 헬퍼.
 */
export async function cacheGetOrLoad<T>(
  namespace: string,
  key: string,
  loader: () => Promise<T>,
  ttlOverride?: number,
): Promise<T> {
  const cached = await cacheGet<T>(namespace, key);
  if (cached !== null) return cached;

  const data = await loader();
  await cacheSet(namespace, key, data, ttlOverride);
  return data;
}

// ── 데이터 변경 시 자동 무효화 헬퍼 ─────────────────────────

/** 아이템 변경 → 아이템 목록 캐시 무효화 */
export async function onItemChanged(): Promise<void> {
  await cacheInvalidate('item:list');
}

/** NPC 변경 → NPC 목록 캐시 무효화 */
export async function onNpcChanged(): Promise<void> {
  await cacheInvalidate('npc:list');
}

/** 레시피 변경 → 레시피 캐시 무효화 */
export async function onRecipeChanged(): Promise<void> {
  await cacheInvalidate('recipe:list');
}

/** 업적 변경 → 업적 캐시 무효화 */
export async function onAchievementChanged(): Promise<void> {
  await cacheInvalidate('achievement:list');
}

/** 랭킹 변경 → 랭킹 캐시 무효화 */
export async function onRankingChanged(): Promise<void> {
  await cacheInvalidate('ranking');
}

// ── Prometheus 호환 메트릭 출력 ──────────────────────────────

/** /metrics 엔드포인트용 텍스트 출력 */
export function cacheMetricsPrometheus(): string {
  const m = getCacheMetrics();
  return [
    `# HELP aeterna_cache_hits_total 캐시 히트 횟수`,
    `# TYPE aeterna_cache_hits_total counter`,
    `aeterna_cache_hits_total ${m.hits}`,
    `# HELP aeterna_cache_misses_total 캐시 미스 횟수`,
    `# TYPE aeterna_cache_misses_total counter`,
    `aeterna_cache_misses_total ${m.misses}`,
    `# HELP aeterna_cache_hit_rate 캐시 히트율 (%)`,
    `# TYPE aeterna_cache_hit_rate gauge`,
    `aeterna_cache_hit_rate ${m.hitRate}`,
    `# HELP aeterna_cache_sets_total 캐시 SET 횟수`,
    `# TYPE aeterna_cache_sets_total counter`,
    `aeterna_cache_sets_total ${m.sets}`,
    `# HELP aeterna_cache_invalidations_total 캐시 무효화 횟수`,
    `# TYPE aeterna_cache_invalidations_total counter`,
    `aeterna_cache_invalidations_total ${m.invalidations}`,
  ].join('\n');
}
