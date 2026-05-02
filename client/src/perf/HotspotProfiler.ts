/**
 * client/src/perf/HotspotProfiler.ts — 핫스팟 식별 프로파일러 (Build)
 *
 * 스프린트: 에테르나 크로니클 성능 최적화 (Build 단계)
 * 작성: 계섬월 (Staff Engineer)
 *
 * 책임:
 *   - 함수 단위 스코프 측정 (performance.now 기반)
 *   - 윈도우 통계 산출 (call/total/avg/p95/max)
 *   - 전투/맵 진입 시 자동 활성화 → topN 리포트 생성
 *
 * 비책임:
 *   - 샘플 전송 (perfTelemetry.ts)
 *   - 시각화 (별도 dev overlay)
 *
 * 검의 날을 갈기 전에 칼집부터 맞춘다 — 측정 자체가 부담이 되어선 안 된다.
 */

import type { HotspotReport, HotspotSample } from './types';

export interface HotspotProfilerConfig {
  windowMs: number;
  topN: number;
  enabled: boolean;
  /** 0~1. 1=항상 측정, 0.1=10%만 */
  sampleRate: number;
  /** 스코프당 보관할 raw duration 상한 (메모리 보호) */
  maxSamplesPerScope: number;
}

export const DEFAULT_HOTSPOT_CONFIG: HotspotProfilerConfig = {
  windowMs: 10_000,
  topN: 10,
  enabled: false,
  sampleRate: 1.0,
  maxSamplesPerScope: 1024,
};

export interface ProfileHandle {
  end(): void;
}

const NOOP_HANDLE: ProfileHandle = { end: () => undefined };

/** 스코프별 누적 버킷 */
interface ScopeBucket {
  scopeId: string;
  /** 측정된 duration들 (ms) — ring buffer */
  durations: number[];
  /** ring head */
  head: number;
  /** 실제 길이 (durations 채워진 만큼) */
  size: number;
  /** 윈도우 시작 시각 */
  windowStartMs: number;
  /** 누적 호출 (윈도우 내) */
  callCount: number;
  /** 누적 totalMs */
  totalMs: number;
  /** 누적 maxMs */
  maxMs: number;
}

/** performance.now 호환 — 환경 미지원 시 Date.now fallback */
function nowMs(): number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

/** quickselect — k번째 작은 값. p95 산정용 (sort보다 빠름) */
function quickselect(arr: number[], k: number): number {
  if (arr.length === 0) return 0;
  const a = arr.slice();
  let lo = 0;
  let hi = a.length - 1;
  while (lo < hi) {
    const pivot = a[(lo + hi) >> 1];
    let i = lo;
    let j = hi;
    while (i <= j) {
      while (a[i] < pivot) i++;
      while (a[j] > pivot) j--;
      if (i <= j) {
        [a[i], a[j]] = [a[j], a[i]];
        i++;
        j--;
      }
    }
    if (k <= j) hi = j;
    else if (k >= i) lo = i;
    else break;
  }
  return a[k];
}

export class HotspotProfiler {
  private config: HotspotProfilerConfig;
  private buckets = new Map<string, ScopeBucket>();

  constructor(config: HotspotProfilerConfig = DEFAULT_HOTSPOT_CONFIG) {
    this.config = { ...config };
  }

  begin(scopeId: string): ProfileHandle {
    if (!this.config.enabled) return NOOP_HANDLE;
    if (this.config.sampleRate < 1.0 && Math.random() > this.config.sampleRate) {
      return NOOP_HANDLE;
    }
    const startedAt = nowMs();
    return {
      end: () => {
        const elapsed = nowMs() - startedAt;
        this.record(scopeId, elapsed);
      },
    };
  }

  measure<T>(scopeId: string, fn: () => T): T {
    const h = this.begin(scopeId);
    try {
      return fn();
    } finally {
      h.end();
    }
  }

  async measureAsync<T>(scopeId: string, fn: () => Promise<T>): Promise<T> {
    const h = this.begin(scopeId);
    try {
      return await fn();
    } finally {
      h.end();
    }
  }

  private record(scopeId: string, durationMs: number): void {
    let bucket = this.buckets.get(scopeId);
    const now = nowMs();
    if (!bucket) {
      bucket = {
        scopeId,
        durations: new Array<number>(this.config.maxSamplesPerScope).fill(0),
        head: 0,
        size: 0,
        windowStartMs: now,
        callCount: 0,
        totalMs: 0,
        maxMs: 0,
      };
      this.buckets.set(scopeId, bucket);
    }
    // 윈도우 만료 시 리셋
    if (now - bucket.windowStartMs > this.config.windowMs) {
      bucket.windowStartMs = now;
      bucket.head = 0;
      bucket.size = 0;
      bucket.callCount = 0;
      bucket.totalMs = 0;
      bucket.maxMs = 0;
    }
    const cap = bucket.durations.length;
    bucket.durations[bucket.head] = durationMs;
    bucket.head = (bucket.head + 1) % cap;
    if (bucket.size < cap) bucket.size++;
    bucket.callCount++;
    bucket.totalMs += durationMs;
    if (durationMs > bucket.maxMs) bucket.maxMs = durationMs;
  }

  getSamples(): HotspotSample[] {
    const out: HotspotSample[] = [];
    for (const b of this.buckets.values()) {
      if (b.size === 0) continue;
      const view = b.durations.slice(0, b.size);
      const k = Math.max(0, Math.floor(view.length * 0.95) - 1);
      const p95 = quickselect(view, Math.min(k, view.length - 1));
      out.push({
        scopeId: b.scopeId,
        callCount: b.callCount,
        totalMs: b.totalMs,
        avgMs: b.callCount > 0 ? b.totalMs / b.callCount : 0,
        p95Ms: p95,
        maxMs: b.maxMs,
        windowStartMs: b.windowStartMs,
      });
    }
    return out;
  }

  buildReport(sceneKey: string, inCombat: boolean): HotspotReport {
    const samples = this.getSamples();
    const topByTotal = samples
      .slice()
      .sort((a, b) => b.totalMs - a.totalMs)
      .slice(0, this.config.topN);
    const topByP95 = samples
      .slice()
      .sort((a, b) => b.p95Ms - a.p95Ms)
      .slice(0, this.config.topN);
    return {
      generatedAt: new Date().toISOString(),
      sceneKey,
      inCombat,
      topByTotal,
      topByP95,
    };
  }

  reset(): void {
    this.buckets.clear();
  }

  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  /** 테스트/오버레이용 — 현재 등록된 스코프 수 */
  getScopeCount(): number {
    return this.buckets.size;
  }
}

export const hotspotProfiler = new HotspotProfiler();
