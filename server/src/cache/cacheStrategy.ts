/**
 * Redis 캐시 전략 — P12-11
 *
 * 핫 데이터별 TTL 정책 + 캐시 무효화 + cache-aside 패턴.
 * cacheLayer.ts의 저수준 API를 감싸는 도메인 전용 캐시 전략.
 *
 * TTL 정책:
 *   리더보드   — 5분  (실시간성 높음)
 *   상점       — 10분 (변경 빈도 낮음)
 *   시즌패스   — 30분 (변경 빈도 매우 낮음)
 *   유저 프로필 — 3분  (자주 조회되지만 변경 빈번)
 *   길드 정보  — 15분 (중간)
 */

import { cacheGet, cacheSet, cacheInvalidate, cacheGetOrLoad, CACHE_TTL } from './cacheLayer';

// ── 도메인별 TTL 상수 (초) ───────────────────────────────────

export const STRATEGY_TTL = {
  /** 리더보드: 5분 — 실시간성과 부하 사이 균형 */
  LEADERBOARD: 5 * 60,
  /** 상점 목록: 10분 — 상점 데이터는 자주 변하지 않음 */
  SHOP: 10 * 60,
  /** 시즌패스 정보: 30분 — 시즌 단위 변경 */
  SEASON_PASS: 30 * 60,
  /** 유저 프로필: 3분 — 조회 빈번, 변경도 빈번 */
  USER_PROFILE: 3 * 60,
  /** 길드 정보: 15분 */
  GUILD: 15 * 60,
  /** 월드보스 상태: 30초 — 실시간 중요 */
  WORLD_BOSS: 30,
  /** 이벤트 목록: 10분 */
  EVENTS: 10 * 60,
  /** 코덱스/도감: 1시간 — 거의 불변 */
  CODEX: 60 * 60,
} as const;

// ── 캐시 네임스페이스 ────────────────────────────────────────

export const CACHE_NS = {
  LEADERBOARD: 'leaderboard',
  SHOP: 'shop',
  SEASON_PASS: 'seasonpass',
  USER_PROFILE: 'user:profile',
  GUILD: 'guild',
  WORLD_BOSS: 'worldboss',
  EVENTS: 'events',
  CODEX: 'codex',
} as const;

// ── Cache-Aside 패턴 — 도메인 헬퍼 ──────────────────────────

/**
 * 리더보드 조회 (cache-aside).
 * TTL 5분. 캐시 미스 시 loader 호출.
 */
export async function getLeaderboard<T>(
  leaderboardId: string,
  loader: () => Promise<T>,
): Promise<T> {
  return cacheGetOrLoad(CACHE_NS.LEADERBOARD, leaderboardId, loader, STRATEGY_TTL.LEADERBOARD);
}

/**
 * 상점 목록 조회 (cache-aside).
 * TTL 10분. 상점 데이터 변경 시 invalidateShop 호출 필요.
 */
export async function getShopItems<T>(
  shopId: string,
  loader: () => Promise<T>,
): Promise<T> {
  return cacheGetOrLoad(CACHE_NS.SHOP, shopId, loader, STRATEGY_TTL.SHOP);
}

/**
 * 시즌패스 정보 조회 (cache-aside).
 * TTL 30분. 시즌 변경 시 invalidateSeasonPass 호출.
 */
export async function getSeasonPass<T>(
  seasonId: string,
  loader: () => Promise<T>,
): Promise<T> {
  return cacheGetOrLoad(CACHE_NS.SEASON_PASS, seasonId, loader, STRATEGY_TTL.SEASON_PASS);
}

/**
 * 유저 프로필 조회 (cache-aside).
 * TTL 3분. 프로필 변경 이벤트에서 자동 무효화.
 */
export async function getUserProfile<T>(
  userId: string,
  loader: () => Promise<T>,
): Promise<T> {
  return cacheGetOrLoad(CACHE_NS.USER_PROFILE, userId, loader, STRATEGY_TTL.USER_PROFILE);
}

/**
 * 길드 정보 조회 (cache-aside).
 * TTL 15분.
 */
export async function getGuildInfo<T>(
  guildId: string,
  loader: () => Promise<T>,
): Promise<T> {
  return cacheGetOrLoad(CACHE_NS.GUILD, guildId, loader, STRATEGY_TTL.GUILD);
}

/**
 * 코덱스/도감 조회 (cache-aside).
 * TTL 1시간 — 거의 불변 데이터.
 */
export async function getCodex<T>(
  codexKey: string,
  loader: () => Promise<T>,
): Promise<T> {
  return cacheGetOrLoad(CACHE_NS.CODEX, codexKey, loader, STRATEGY_TTL.CODEX);
}

// ── 캐시 무효화 — 데이터 변경 이벤트 핸들러 ─────────────────

/** 리더보드 갱신 시 호출 (점수 변경, 시즌 리셋) */
export async function invalidateLeaderboard(leaderboardId?: string): Promise<number> {
  return cacheInvalidate(CACHE_NS.LEADERBOARD, leaderboardId);
}

/** 상점 아이템 변경 시 호출 (가격 변경, 상품 추가/제거) */
export async function invalidateShop(shopId?: string): Promise<number> {
  return cacheInvalidate(CACHE_NS.SHOP, shopId);
}

/** 시즌패스 변경 시 호출 (보상 수령, 티어 승급) */
export async function invalidateSeasonPass(seasonId?: string): Promise<number> {
  return cacheInvalidate(CACHE_NS.SEASON_PASS, seasonId);
}

/** 유저 프로필 변경 시 호출 (레벨업, 장비 변경, 닉네임 변경) */
export async function invalidateUserProfile(userId: string): Promise<number> {
  return cacheInvalidate(CACHE_NS.USER_PROFILE, userId);
}

/** 길드 정보 변경 시 호출 (멤버 변경, 레벨업, 스킬 연구) */
export async function invalidateGuild(guildId: string): Promise<number> {
  return cacheInvalidate(CACHE_NS.GUILD, guildId);
}

/** 전체 캐시 무효화 (긴급 상황, 핫픽스 후) */
export async function invalidateAll(): Promise<void> {
  const namespaces = Object.values(CACHE_NS);
  await Promise.all(namespaces.map((ns) => cacheInvalidate(ns)));
}

// ── 캐시 워밍업 ──────────────────────────────────────────────

/**
 * 서버 시작 시 핫 데이터를 미리 캐시에 로드.
 * 콜드 스타트 시 첫 요청 지연을 방지.
 */
export async function warmUpCache(warmers: {
  leaderboards?: Array<{ id: string; loader: () => Promise<unknown> }>;
  shops?: Array<{ id: string; loader: () => Promise<unknown> }>;
  seasonPasses?: Array<{ id: string; loader: () => Promise<unknown> }>;
}): Promise<{ warmed: number; failed: number }> {
  let warmed = 0;
  let failed = 0;

  const tasks: Array<Promise<void>> = [];

  if (warmers.leaderboards) {
    for (const lb of warmers.leaderboards) {
      tasks.push(
        getLeaderboard(lb.id, lb.loader)
          .then(() => { warmed++; })
          .catch(() => { failed++; }),
      );
    }
  }

  if (warmers.shops) {
    for (const shop of warmers.shops) {
      tasks.push(
        getShopItems(shop.id, shop.loader)
          .then(() => { warmed++; })
          .catch(() => { failed++; }),
      );
    }
  }

  if (warmers.seasonPasses) {
    for (const sp of warmers.seasonPasses) {
      tasks.push(
        getSeasonPass(sp.id, sp.loader)
          .then(() => { warmed++; })
          .catch(() => { failed++; }),
      );
    }
  }

  await Promise.all(tasks);
  return { warmed, failed };
}

// ── 캐시 전략 메트릭 (Prometheus) ────────────────────────────

/** 도메인별 TTL 설정을 Prometheus info 메트릭으로 출력 */
export function cacheStrategyMetricsPrometheus(): string {
  const lines: string[] = [
    '# HELP aeterna_cache_ttl_seconds 도메인별 캐시 TTL (초)',
    '# TYPE aeterna_cache_ttl_seconds gauge',
  ];
  for (const [domain, ttl] of Object.entries(STRATEGY_TTL)) {
    lines.push(`aeterna_cache_ttl_seconds{domain="${domain.toLowerCase()}"} ${ttl}`);
  }
  return lines.join('\n');
}
