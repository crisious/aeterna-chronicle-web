/**
 * 슬로우 쿼리 로깅 미들웨어 — P12-10 DB 쿼리 최적화
 *
 * Prisma $use 미들웨어로 등록.
 * - 100ms+ 쿼리를 structured log로 출력
 * - N+1 쿼리 패턴 자동 감지
 * - 쿼리별 실행 시간 히스토그램 수집
 * - queryOptimizer와 통합하여 권고 생성
 *
 * 사용:
 *   import { registerQueryLogger } from './db/queryLogger';
 *   registerQueryLogger(prisma);
 */

import { recordQuery, getOptimizationAdvice, getSlowQueries } from '../cache/queryOptimizer';

// ── 설정 ─────────────────────────────────────────────────────

interface QueryLoggerConfig {
  /** 슬로우 쿼리 임계값 (ms). 기본 100ms */
  slowThresholdMs: number;
  /** 콘솔 출력 여부. 프로덕션에서는 structured logger로 전환 */
  consoleOutput: boolean;
  /** 쿼리 args 로깅 여부 (개인정보 주의) */
  logArgs: boolean;
  /** 로깅 대상 모델 화이트리스트 (빈 배열 = 전체) */
  modelWhitelist: string[];
  /** 히스토그램 버킷 경계 (ms) */
  histogramBuckets: number[];
}

const DEFAULT_CONFIG: QueryLoggerConfig = {
  slowThresholdMs: 100,
  consoleOutput: process.env.NODE_ENV !== 'test',
  logArgs: process.env.NODE_ENV !== 'production', // 프로덕션에서는 args 미기록
  modelWhitelist: [],
  histogramBuckets: [10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
};

// ── 히스토그램 수집 ──────────────────────────────────────────

interface HistogramData {
  buckets: Map<number, number>; // bucket_le -> count
  sum: number;
  count: number;
}

const histogram: HistogramData = {
  buckets: new Map(),
  sum: 0,
  count: 0,
};

function recordHistogram(durationMs: number, buckets: number[]): void {
  histogram.sum += durationMs;
  histogram.count++;
  for (const le of buckets) {
    if (durationMs <= le) {
      histogram.buckets.set(le, (histogram.buckets.get(le) ?? 0) + 1);
    }
  }
}

/** Prometheus 히스토그램 텍스트 출력 */
export function queryDurationHistogramPrometheus(buckets: number[] = DEFAULT_CONFIG.histogramBuckets): string {
  const lines: string[] = [
    '# HELP aeterna_db_query_duration_ms DB 쿼리 응답 시간 (ms)',
    '# TYPE aeterna_db_query_duration_ms histogram',
  ];
  for (const le of buckets) {
    lines.push(`aeterna_db_query_duration_ms_bucket{le="${le}"} ${histogram.buckets.get(le) ?? 0}`);
  }
  lines.push(`aeterna_db_query_duration_ms_bucket{le="+Inf"} ${histogram.count}`);
  lines.push(`aeterna_db_query_duration_ms_sum ${histogram.sum.toFixed(1)}`);
  lines.push(`aeterna_db_query_duration_ms_count ${histogram.count}`);
  return lines.join('\n');
}

// ── Structured Log Entry ─────────────────────────────────────

interface QueryLogOutput {
  level: 'info' | 'warn' | 'error';
  msg: string;
  model: string;
  action: string;
  durationMs: number;
  slow: boolean;
  nPlusOne: boolean;
  timestamp: string;
  args?: unknown;
}

function emitLog(entry: QueryLogOutput, config: QueryLoggerConfig): void {
  if (!config.consoleOutput) return;

  if (entry.slow || entry.nPlusOne) {
    const prefix = entry.nPlusOne ? '[N+1]' : '[SLOW]';
    console.warn(
      `[QueryLogger] ${prefix} ${entry.model}.${entry.action} ${entry.durationMs}ms`,
      config.logArgs && entry.args ? JSON.stringify(entry.args).slice(0, 300) : '',
    );
  }
}

// ── Prisma 미들웨어 등록 ─────────────────────────────────────

/**
 * Prisma 인스턴스에 쿼리 로깅 미들웨어를 등록.
 *
 * @example
 * ```ts
 * import { PrismaClient } from '@prisma/client';
 * import { registerQueryLogger } from './db/queryLogger';
 *
 * const prisma = new PrismaClient();
 * registerQueryLogger(prisma);
 * ```
 */
export function registerQueryLogger(
  prisma: { $use: (middleware: (params: Record<string, unknown>, next: (p: unknown) => Promise<unknown>) => Promise<unknown>) => void },
  userConfig: Partial<QueryLoggerConfig> = {},
): void {
  const config: QueryLoggerConfig = { ...DEFAULT_CONFIG, ...userConfig };

  prisma.$use(async (params: Record<string, unknown>, next: (p: unknown) => Promise<unknown>) => {
    const model = params.model as string | undefined;
    const action = params.action as string;

    // 화이트리스트 필터
    if (config.modelWhitelist.length > 0 && model && !config.modelWhitelist.includes(model)) {
      return next(params);
    }

    const start = performance.now();
    const result = await next(params);
    const durationMs = Math.round(performance.now() - start);

    if (model) {
      // queryOptimizer와 통합
      const entry = recordQuery(model, action, durationMs, params.args);

      // 히스토그램 수집
      recordHistogram(durationMs, config.histogramBuckets);

      // 로그 출력
      const logEntry: QueryLogOutput = {
        level: entry.slow || entry.possibleNPlusOne ? 'warn' : 'info',
        msg: `${model}.${action}`,
        model,
        action,
        durationMs,
        slow: entry.slow,
        nPlusOne: entry.possibleNPlusOne,
        timestamp: new Date().toISOString(),
        args: config.logArgs ? params.args : undefined,
      };

      emitLog(logEntry, config);
    }

    return result;
  });
}

// ── 인덱스 추천 ──────────────────────────────────────────────

/** 주요 모델별 권장 인덱스 맵 */
export const RECOMMENDED_INDEXES: Record<string, string[]> = {
  User: [
    '@@index([email])',
    '@@index([lastLoginAt])  // DAU/MAU 집계',
    '@@index([isBanned])     // 밴 필터',
    '@@index([role])         // 역할 조회',
  ],
  Character: [
    '@@index([userId])       // 유저별 캐릭터 조회',
    '@@index([level])        // 레벨 랭킹',
    '@@index([classId])      // 클래스별 통계',
  ],
  Inventory: [
    '@@index([userId, itemId])  // 유저 인벤토리 조회',
    '@@index([userId])          // 유저별 전체 아이템',
  ],
  QuestProgress: [
    '@@index([userId, status])  // 유저별 퀘스트 상태',
    '@@index([questId])         // 퀘스트별 완료율',
  ],
  AuctionListing: [
    '@@index([status, createdAt])  // 활성 거래 목록',
    '@@index([sellerId])           // 판매자별 조회',
    '@@index([itemId, rarity])     // 아이템 검색',
  ],
  GuildMember: [
    '@@index([userId])    // 유저→길드 조회',
    '@@index([guildId])   // 길드원 목록',
  ],
  SeasonPassProgress: [
    '@@index([userId, seasonId])  // 유저별 시즌패스',
  ],
  LeaderboardEntry: [
    '@@index([leaderboardId, score])  // 랭킹 정렬',
    '@@index([userId])                // 유저 순위 조회',
  ],
};

/** Prisma select/include 최적화 가이드 */
export const QUERY_OPTIMIZATION_PATTERNS = {
  userWithCharacters: {
    bad: `prisma.user.findUnique({ where: { id }, include: { characters: true } })  // 모든 필드 로드`,
    good: `prisma.user.findUnique({
  where: { id },
  select: {
    id: true, email: true, nickname: true, level: true,
    characters: { select: { id: true, name: true, classId: true, level: true } }
  }
})`,
    reason: '필요한 필드만 select하면 네트워크 + 메모리 절약',
  },
  inventoryBatch: {
    bad: `// N+1: 유저마다 인벤토리 개별 조회
for (const user of users) {
  await prisma.inventory.findMany({ where: { userId: user.id } });
}`,
    good: `// 배치: 한 번에 조회
const inventories = await prisma.inventory.findMany({
  where: { userId: { in: users.map(u => u.id) } }
});`,
    reason: 'N+1 → 단일 쿼리로 전환. 100명 조회 시 100 쿼리 → 1 쿼리',
  },
  leaderboardOptimized: {
    bad: `prisma.leaderboardEntry.findMany({ orderBy: { score: 'desc' }, take: 100 })`,
    good: `prisma.leaderboardEntry.findMany({
  where: { leaderboardId: seasonLeaderboard },
  orderBy: { score: 'desc' },
  take: 100,
  select: { userId: true, score: true, rank: true }
})`,
    reason: '인덱스 활용 + 필드 최소화',
  },
} as const;

// ── 리포트 생성 ──────────────────────────────────────────────

/** 쿼리 최적화 리포트 생성 (어드민/디버깅용) */
export function generateQueryReport(): {
  slowQueries: ReturnType<typeof getSlowQueries>;
  advice: ReturnType<typeof getOptimizationAdvice>;
  recommendedIndexes: typeof RECOMMENDED_INDEXES;
} {
  return {
    slowQueries: getSlowQueries(20),
    advice: getOptimizationAdvice(),
    recommendedIndexes: RECOMMENDED_INDEXES,
  };
}
