/**
 * APM 메트릭 수집기 — 슬라이딩 윈도우 방식 (최근 60초, 1초 버킷)
 * 외부 라이브러리 없이 경량 자체 구현
 */

// ── 타입 정의 ─────────────────────────────────────────────────

/** 백분위 통계 */
export interface PercentileStats {
    min: number;
    max: number;
    avg: number;
    p50: number;
    p95: number;
    p99: number;
    count: number;
}

/** HTTP 경로별 응답 시간 요약 */
export interface HttpRouteStats {
    path: string;
    stats: PercentileStats;
}

/** 메모리 스냅샷 */
export interface MemorySnapshot {
    rss: number;          // MB
    heapTotal: number;    // MB
    heapUsed: number;     // MB
    external: number;     // MB
    timestamp: number;
}

/** 전체 메트릭 요약 */
export interface MetricsSummary {
    socketLatency: PercentileStats;
    httpResponseTime: PercentileStats;
    httpRoutes: HttpRouteStats[];
    memory: MemorySnapshot;
    activeConnections: number;
    eventThroughput: number;   // 초당 이벤트 수
    uptime: number;            // 서버 가동 시간 (초)
    collectedAt: string;       // ISO 타임스탬프
}

// ── 슬라이딩 윈도우 버킷 ───────────────────────────────────────

/** 1초 단위 버킷 — 해당 초에 기록된 값들의 배열 */
interface Bucket {
    timestamp: number;   // 초 단위 (Math.floor(Date.now() / 1000))
    values: number[];
}

/** 슬라이딩 윈도우: 최근 windowSec 초 동안의 데이터를 유지 */
class SlidingWindow {
    private buckets: Bucket[] = [];
    private readonly windowSec: number;

    constructor(windowSec = 60) {
        this.windowSec = windowSec;
    }

    /** 값 하나 기록 */
    record(value: number): void {
        const now = Math.floor(Date.now() / 1000);
        this.prune(now);

        const last = this.buckets[this.buckets.length - 1];
        if (last && last.timestamp === now) {
            last.values.push(value);
        } else {
            this.buckets.push({ timestamp: now, values: [value] });
        }
    }

    /** 윈도우 내 모든 값을 평탄화해 반환 */
    getValues(): number[] {
        const now = Math.floor(Date.now() / 1000);
        this.prune(now);
        const result: number[] = [];
        for (const b of this.buckets) {
            result.push(...b.values);
        }
        return result;
    }

    /** 윈도우 내 총 개수 */
    getCount(): number {
        const now = Math.floor(Date.now() / 1000);
        this.prune(now);
        let count = 0;
        for (const b of this.buckets) {
            count += b.values.length;
        }
        return count;
    }

    /** 만료된 버킷 제거 */
    private prune(nowSec: number): void {
        const cutoff = nowSec - this.windowSec;
        while (this.buckets.length > 0 && this.buckets[0].timestamp < cutoff) {
            this.buckets.shift();
        }
    }
}

// ── 백분위 계산 유틸 ──────────────────────────────────────────

function computePercentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const idx = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, idx)];
}

function computeStats(values: number[]): PercentileStats {
    if (values.length === 0) {
        return { min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0, count: 0 };
    }
    const sorted = [...values].sort((a, b) => a - b);
    const sum = sorted.reduce((acc, v) => acc + v, 0);
    return {
        min: sorted[0],
        max: sorted[sorted.length - 1],
        avg: Math.round((sum / sorted.length) * 100) / 100,
        p50: computePercentile(sorted, 50),
        p95: computePercentile(sorted, 95),
        p99: computePercentile(sorted, 99),
        count: sorted.length,
    };
}

// ── 싱글톤 메트릭 저장소 ──────────────────────────────────────

/** 소켓 레이턴시 윈도우 */
const socketLatencyWindow = new SlidingWindow(60);

/** HTTP 응답 시간 — 전체 + 경로별 */
const httpResponseWindow = new SlidingWindow(60);
const httpRouteWindows = new Map<string, SlidingWindow>();

/** 이벤트 처리량 카운터 (초당) */
const eventCountWindow = new SlidingWindow(60);

/** 활성 소켓 연결 수 (외부에서 증감) */
let _activeConnections = 0;

/** 최신 메모리 스냅샷 */
let _lastMemory: MemorySnapshot = {
    rss: 0, heapTotal: 0, heapUsed: 0, external: 0, timestamp: 0,
};

/** 메모리 샘플링 타이머 */
let _memoryTimer: ReturnType<typeof setInterval> | null = null;

/** 서버 시작 시각 */
const _startTime = Date.now();

// ── 공개 API ──────────────────────────────────────────────────

/** 소켓 이벤트 처리 시간 기록 (ms) */
export function recordSocketLatency(ms: number): void {
    socketLatencyWindow.record(ms);
    eventCountWindow.record(1);
}

/** HTTP 응답 시간 기록 (ms) */
export function recordHttpResponse(path: string, ms: number): void {
    httpResponseWindow.record(ms);

    // 경로별 윈도우 (쿼리 파라미터 제거, 최대 100개 경로 제한)
    const normalizedPath = path.split('?')[0];
    if (!httpRouteWindows.has(normalizedPath) && httpRouteWindows.size < 100) {
        httpRouteWindows.set(normalizedPath, new SlidingWindow(60));
    }
    const routeWindow = httpRouteWindows.get(normalizedPath);
    if (routeWindow) {
        routeWindow.record(ms);
    }
}

/** 활성 연결 수 증가 */
export function incrementConnections(): void {
    _activeConnections++;
}

/** 활성 연결 수 감소 */
export function decrementConnections(): void {
    _activeConnections = Math.max(0, _activeConnections - 1);
}

/** 현재 활성 연결 수 */
export function getActiveConnections(): number {
    return _activeConnections;
}

/** 메모리 샘플링 1회 실행 */
function sampleMemory(): void {
    const mem = process.memoryUsage();
    _lastMemory = {
        rss: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
        heapTotal: Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100,
        heapUsed: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
        external: Math.round((mem.external / 1024 / 1024) * 100) / 100,
        timestamp: Date.now(),
    };
}

/** 전체 메트릭 요약 반환 */
export function getMetricsSummary(): MetricsSummary {
    // 초당 이벤트 처리량 계산 (최근 60초 평균)
    const totalEvents = eventCountWindow.getCount();
    const uptimeSec = Math.max(1, (Date.now() - _startTime) / 1000);
    const windowSec = Math.min(60, uptimeSec);
    const throughput = Math.round((totalEvents / windowSec) * 100) / 100;

    // 경로별 통계
    const httpRoutes: HttpRouteStats[] = [];
    for (const [path, window] of httpRouteWindows) {
        const vals = window.getValues();
        if (vals.length > 0) {
            httpRoutes.push({ path, stats: computeStats(vals) });
        }
    }

    return {
        socketLatency: computeStats(socketLatencyWindow.getValues()),
        httpResponseTime: computeStats(httpResponseWindow.getValues()),
        httpRoutes,
        memory: { ..._lastMemory },
        activeConnections: _activeConnections,
        eventThroughput: throughput,
        uptime: Math.round(uptimeSec),
        collectedAt: new Date().toISOString(),
    };
}

/** 메트릭 수집 시작 (메모리 주기적 샘플링) */
export function startMetricsCollection(intervalMs = 5000): void {
    // 즉시 1회 샘플링
    sampleMemory();

    if (_memoryTimer) {
        clearInterval(_memoryTimer);
    }
    _memoryTimer = setInterval(sampleMemory, intervalMs);
    console.log(`[APM] 메트릭 수집 시작 (메모리 샘플링 ${intervalMs}ms 간격)`);
}

/** 메트릭 수집 중지 */
export function stopMetricsCollection(): void {
    if (_memoryTimer) {
        clearInterval(_memoryTimer);
        _memoryTimer = null;
    }
    console.log('[APM] 메트릭 수집 중지');
}
