/**
 * Prisma 쿼리 분석 + 최적화 권고 — P4-16 성능 최적화 2차
 * 
 * 기능:
 *   - N+1 쿼리 감지
 *   - 인덱스 사용 확인 (advisory)
 *   - 슬로우 쿼리 로깅 (100ms+)
 *   - 쿼리 패턴 통계 수집
 */

// ── 타입 정의 ────────────────────────────────────────────────

/** 쿼리 로그 엔트리 */
export interface QueryLogEntry {
  model: string;
  operation: string;
  duration: number;      // ms
  timestamp: number;
  args?: unknown;
  slow: boolean;
  possibleNPlusOne: boolean;
}

/** 쿼리 패턴 통계 */
export interface QueryPatternStats {
  pattern: string;       // "model.operation" 형태
  totalCalls: number;
  totalDuration: number; // ms
  avgDuration: number;
  maxDuration: number;
  slowCount: number;     // 100ms+ 횟수
  nPlusOneWarnings: number;
}

/** 최적화 권고 사항 */
export interface OptimizationAdvice {
  severity: 'critical' | 'warning' | 'info';
  pattern: string;
  message: string;
  suggestion: string;
}

// ── 설정 ─────────────────────────────────────────────────────

/** 슬로우 쿼리 임계값 (ms) */
const SLOW_QUERY_THRESHOLD = 100;

/** N+1 감지 윈도우 (ms) — 이 시간 내 동일 모델 반복 쿼리 발생 시 경고 */
const N_PLUS_ONE_WINDOW = 500;

/** N+1 감지 최소 반복 횟수 */
const N_PLUS_ONE_MIN_REPEATS = 5;

/** 최대 로그 보관량 (메모리 제한) */
const MAX_LOG_SIZE = 10_000;

// ── 내부 상태 ────────────────────────────────────────────────

const queryLog: QueryLogEntry[] = [];
const patternMap = new Map<string, QueryPatternStats>();

/** 최근 쿼리 타임스탬프 맵 (N+1 감지용) */
const recentQueries = new Map<string, number[]>();

// ── 쿼리 기록 ────────────────────────────────────────────────

/**
 * Prisma 미들웨어에서 호출. 쿼리 실행 정보를 기록하고 분석.
 */
export function recordQuery(
  model: string,
  operation: string,
  duration: number,
  args?: unknown,
): QueryLogEntry {
  const now = Date.now();
  const pattern = `${model}.${operation}`;

  // N+1 감지
  const possibleNPlusOne = detectNPlusOne(pattern, now);

  const entry: QueryLogEntry = {
    model,
    operation,
    duration,
    timestamp: now,
    args: duration >= SLOW_QUERY_THRESHOLD ? args : undefined, // 슬로우만 args 보관
    slow: duration >= SLOW_QUERY_THRESHOLD,
    possibleNPlusOne,
  };

  // 로그 저장 (환형 버퍼)
  if (queryLog.length >= MAX_LOG_SIZE) {
    queryLog.shift();
  }
  queryLog.push(entry);

  // 패턴 통계 갱신
  updatePatternStats(pattern, duration, entry.slow, possibleNPlusOne);

  // 슬로우 쿼리 콘솔 출력
  if (entry.slow) {
    console.warn(
      `[QueryOptimizer] SLOW QUERY (${duration}ms): ${pattern}`,
      args ? JSON.stringify(args).slice(0, 200) : '',
    );
  }

  // N+1 경고 출력
  if (possibleNPlusOne) {
    console.warn(
      `[QueryOptimizer] N+1 WARNING: ${pattern} — ${N_PLUS_ONE_MIN_REPEATS}+ 반복 감지 (${N_PLUS_ONE_WINDOW}ms 내)`,
    );
  }

  return entry;
}

// ── N+1 감지 ─────────────────────────────────────────────────

function detectNPlusOne(pattern: string, now: number): boolean {
  const timestamps = recentQueries.get(pattern) ?? [];

  // 윈도우 밖 타임스탬프 제거
  const windowStart = now - N_PLUS_ONE_WINDOW;
  const recent = timestamps.filter((t) => t >= windowStart);
  recent.push(now);

  recentQueries.set(pattern, recent);

  return recent.length >= N_PLUS_ONE_MIN_REPEATS;
}

// ── 패턴 통계 갱신 ───────────────────────────────────────────

function updatePatternStats(
  pattern: string,
  duration: number,
  slow: boolean,
  nPlusOne: boolean,
): void {
  const existing = patternMap.get(pattern);

  if (!existing) {
    patternMap.set(pattern, {
      pattern,
      totalCalls: 1,
      totalDuration: duration,
      avgDuration: duration,
      maxDuration: duration,
      slowCount: slow ? 1 : 0,
      nPlusOneWarnings: nPlusOne ? 1 : 0,
    });
    return;
  }

  existing.totalCalls++;
  existing.totalDuration += duration;
  existing.avgDuration = Math.round(existing.totalDuration / existing.totalCalls);
  existing.maxDuration = Math.max(existing.maxDuration, duration);
  if (slow) existing.slowCount++;
  if (nPlusOne) existing.nPlusOneWarnings++;
}

// ── 인덱스 권고 ──────────────────────────────────────────────

/** 자주 쿼리되는 필드에 인덱스가 없을 가능성을 경고하는 규칙 기반 분석 */
const INDEX_ADVICE_RULES: Array<{
  modelPattern: RegExp;
  message: string;
  suggestion: string;
}> = [
  {
    modelPattern: /^User\.findMany$/,
    message: 'User 목록 조회가 빈번합니다.',
    suggestion: '@@index([email]) 또는 @@index([role]) 추가를 권장합니다.',
  },
  {
    modelPattern: /^Inventory\.findMany$/,
    message: '인벤토리 대량 조회가 빈번합니다.',
    suggestion: '@@index([userId, itemId]) 복합 인덱스 추가를 권장합니다.',
  },
  {
    modelPattern: /^Quest.*\.findMany$/,
    message: '퀘스트 조회가 빈번합니다.',
    suggestion: '@@index([userId, status]) 복합 인덱스 추가를 권장합니다.',
  },
];

// ── 조회/분석 API ────────────────────────────────────────────

/** 전체 쿼리 패턴 통계 조회 */
export function getQueryPatternStats(): QueryPatternStats[] {
  return Array.from(patternMap.values()).sort((a, b) => b.totalDuration - a.totalDuration);
}

/** 슬로우 쿼리 로그 조회 (최근 N건) */
export function getSlowQueries(limit = 50): QueryLogEntry[] {
  return queryLog
    .filter((e) => e.slow)
    .slice(-limit);
}

/** N+1 경고 발생 패턴 조회 */
export function getNPlusOnePatterns(): QueryPatternStats[] {
  return Array.from(patternMap.values())
    .filter((p) => p.nPlusOneWarnings > 0)
    .sort((a, b) => b.nPlusOneWarnings - a.nPlusOneWarnings);
}

/** 최적화 권고 생성 */
export function getOptimizationAdvice(): OptimizationAdvice[] {
  const advice: OptimizationAdvice[] = [];

  // N+1 패턴 기반 권고
  for (const pattern of getNPlusOnePatterns()) {
    advice.push({
      severity: 'critical',
      pattern: pattern.pattern,
      message: `N+1 쿼리 감지: ${pattern.nPlusOneWarnings}회 경고 발생`,
      suggestion: `include 옵션으로 관계 데이터를 한 번에 로드하거나, batch 쿼리로 전환하세요.`,
    });
  }

  // 슬로우 쿼리 기반 권고
  for (const pattern of getQueryPatternStats()) {
    if (pattern.slowCount > 0 && pattern.slowCount / pattern.totalCalls > 0.1) {
      advice.push({
        severity: 'warning',
        pattern: pattern.pattern,
        message: `슬로우 쿼리 빈발: ${pattern.slowCount}/${pattern.totalCalls} (${Math.round(pattern.slowCount / pattern.totalCalls * 100)}%)`,
        suggestion: `평균 ${pattern.avgDuration}ms, 최대 ${pattern.maxDuration}ms. 인덱스 확인 또는 쿼리 최적화가 필요합니다.`,
      });
    }
  }

  // 인덱스 규칙 기반 권고
  for (const rule of INDEX_ADVICE_RULES) {
    for (const pattern of patternMap.keys()) {
      if (rule.modelPattern.test(pattern)) {
        const stats = patternMap.get(pattern)!;
        if (stats.totalCalls > 100) {
          advice.push({
            severity: 'info',
            pattern,
            message: rule.message,
            suggestion: rule.suggestion,
          });
        }
      }
    }
  }

  return advice;
}

/** 쿼리 로그 + 패턴 통계 초기화 (테스트용) */
export function resetQueryOptimizer(): void {
  queryLog.length = 0;
  patternMap.clear();
  recentQueries.clear();
}

/**
 * Prisma 미들웨어로 등록하는 팩토리 함수.
 * 사용법: prisma.$use(createQueryMiddleware());
 */
export function createQueryMiddleware() {
  return async function queryOptimizerMiddleware(
    params: { model?: string; action: string; args: unknown },
    next: (params: unknown) => Promise<unknown>,
  ): Promise<unknown> {
    const start = performance.now();
    const result = await next(params);
    const duration = Math.round(performance.now() - start);

    if (params.model) {
      recordQuery(params.model, params.action, duration, params.args);
    }

    return result;
  };
}

/** Prometheus 호환 메트릭 텍스트 출력 */
export function queryMetricsPrometheus(): string {
  const patterns = getQueryPatternStats();
  const lines: string[] = [
    '# HELP aeterna_query_slow_total 슬로우 쿼리 총 횟수',
    '# TYPE aeterna_query_slow_total counter',
  ];

  let totalSlow = 0;
  for (const p of patterns) {
    totalSlow += p.slowCount;
  }
  lines.push(`aeterna_query_slow_total ${totalSlow}`);

  lines.push('# HELP aeterna_query_n_plus_one_total N+1 경고 총 횟수');
  lines.push('# TYPE aeterna_query_n_plus_one_total counter');
  let totalNPlusOne = 0;
  for (const p of patterns) {
    totalNPlusOne += p.nPlusOneWarnings;
  }
  lines.push(`aeterna_query_n_plus_one_total ${totalNPlusOne}`);

  return lines.join('\n');
}
