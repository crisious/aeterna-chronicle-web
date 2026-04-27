/**
 * client/src/telemetry/perfTelemetry.ts — 클라이언트 성능 텔레메트리 수집기
 *
 * 스프린트: 에테르나 크로니클 게임 프로젝트 개선 (Build 단계)
 * 작성: 계섬월 (Staff Engineer)
 *
 * 설계 원칙:
 *   - setInterval로 샘플링 — 렌더 루프(rAF)에 기생하지 않음
 *   - FPS는 별도의 rAF 카운터로 측정. 샘플 생성 시 윈도우 통계만 조회
 *   - 배치 전송: 페이지 언로드 시 sendBeacon, 통상시 fetch
 *   - visibilitychange(hidden) → 즉시 flush
 *   - heapUsedMb는 Chrome 전용 performance.memory (옵셔널)
 *   - 검의 날이 무뎌지면 사람이 다친다 — 측정 자체가 성능을 훼손해선 안 된다
 */

import type {
  PerfSample,
  PerfSceneTag,
  PerfTelemetryBatch,
  PerfTelemetryIngestResult,
} from '../../../shared/types/performance';
import type { InputMode } from '../../../shared/types/telemetry';

/** 수집기 생성 시 주입되는 세션 식별자 번들 */
export interface PerfTelemetryContext {
  sessionId: string;
  /** 해시 전 playerId — 내부에서 fnv1a 해싱 */
  playerId: string;
  buildVersion: string;
  platform: PerfTelemetryBatch['platform'];
  inputMode: InputMode;
  userAgent?: string;
  /** 최초 기동 시 벤치마크 기반 추정. undefined면 서버 측 추정에 맡김 */
  hwTier?: 'low' | 'mid' | 'high';
}

/** 수집기 설정 */
export interface PerfTelemetryConfig {
  /** 샘플링 간격 (ms). 권장 1000 */
  sampleIntervalMs: number;
  /** 배치 크기 — 이 크기만큼 모이면 flush */
  batchSize: number;
  /** 강제 flush 간격 (ms). 배치가 차지 않아도 주기적으로 전송 */
  flushIntervalMs: number;
  /** 전송 엔드포인트 (서버 APM ingest) */
  endpoint: string;
  /** 전송 실패 시 재시도 여부 (단순 off/on) */
  retryOnFailure: boolean;
}

/** 기본 설정 */
export const DEFAULT_PERF_CONFIG: PerfTelemetryConfig = {
  sampleIntervalMs: 1000,
  batchSize: 30,
  flushIntervalMs: 30_000,
  endpoint: '/api/telemetry/perf',
  retryOnFailure: true,
};

/** 런타임 훅 — 파티클/텍스처 등 외부 소스 (없으면 undefined 반환) */
export interface PerfRuntimeHooks {
  getActiveParticles?: () => number | undefined;
  getTextureMb?: () => number | undefined;
}

/** 수집기 인터페이스 */
export interface IPerfTelemetryCollector {
  start(): void;
  stop(): void;
  setSceneTag(tag: PerfSceneTag): void;
  flush(): Promise<PerfTelemetryIngestResult | null>;
  getStats(): {
    samplesBuffered: number;
    batchesSent: number;
    batchesFailed: number;
  };
}

// ─── 내부 유틸 ─────────────────────────────────────────────────

/** FNV-1a 32bit — 외부 의존 없이 안정적 해시 */
function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = (hash + ((hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24))) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/** 퍼센타일 (오름차순 정렬된 배열 전제 아님 — 내부에서 정렬) */
function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

/** Chrome performance.memory 안전 접근 */
function readHeapUsedMb(): number | undefined {
  const perf = (typeof performance !== 'undefined' ? performance : undefined) as
    | (Performance & { memory?: { usedJSHeapSize: number } })
    | undefined;
  const used = perf?.memory?.usedJSHeapSize;
  return typeof used === 'number' ? Math.round((used / 1048576) * 100) / 100 : undefined;
}

function nowIso(): string {
  return new Date().toISOString();
}

function uuid(): string {
  // crypto.randomUUID 가 없는 구형 환경 대응
  const c = (typeof crypto !== 'undefined' ? crypto : undefined) as Crypto | undefined;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  // 간이 UUIDv4 대체
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = Math.floor(Math.random() * 16);
    const v = ch === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * PerfTelemetryCollector — 기본 구현.
 *
 * 스레드 모델: 단일 창(window)당 1인스턴스. 인스턴스가 두 개 이상이면 버퍼만
 * 분리될 뿐 안전하지만 네트워크를 낭비한다. 호출자가 싱글톤 관리.
 */
export class PerfTelemetryCollector implements IPerfTelemetryCollector {
  private readonly ctx: PerfTelemetryContext;
  private readonly config: PerfTelemetryConfig;
  private readonly hooks: PerfRuntimeHooks;

  private sceneTag: PerfSceneTag | null = null;
  private buffer: PerfSample[] = [];

  private sampleTimer: ReturnType<typeof setInterval> | null = null;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private rafHandle: number | null = null;

  // FPS 측정용 링 버퍼
  private frameTimes: number[] = []; // 최근 N 프레임의 frameMs
  private readonly frameWindow = 120; // ~2초치 @ 60fps
  private lastFrameTs: number | null = null;

  private batchSeq = 0;
  private batchesSent = 0;
  private batchesFailed = 0;
  private started = false;

  private readonly onVisibility = (): void => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      // 언로드 경로 — sendBeacon 사용 (async 반환값은 버려짐)
      void this.flush();
    }
  };

  private readonly onPageHide = (): void => {
    void this.flush();
  };

  constructor(
    ctx: PerfTelemetryContext,
    config: PerfTelemetryConfig = DEFAULT_PERF_CONFIG,
    hooks: PerfRuntimeHooks = {},
  ) {
    this.ctx = ctx;
    this.config = config;
    this.hooks = hooks;
  }

  start(): void {
    if (this.started) return;
    this.started = true;

    // rAF 기반 프레임 타이머
    const loop = (t: number): void => {
      if (!this.started) return;
      if (this.lastFrameTs !== null) {
        const dt = t - this.lastFrameTs;
        // 비정상 점프(탭 백그라운드) 필터 — 200ms 이상은 버림
        if (dt > 0 && dt < 200) {
          this.frameTimes.push(dt);
          if (this.frameTimes.length > this.frameWindow) {
            this.frameTimes.shift();
          }
        }
      }
      this.lastFrameTs = t;
      this.rafHandle =
        typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame(loop) : null;
    };
    if (typeof requestAnimationFrame !== 'undefined') {
      this.rafHandle = requestAnimationFrame(loop);
    }

    // 샘플링 타이머
    this.sampleTimer = setInterval(() => {
      try {
        const s = this.sample();
        this.buffer.push(s);
        if (this.buffer.length >= this.config.batchSize) {
          void this.flush();
        }
      } catch (err) {
        // 수집 실패는 삼킨다 — 텔레메트리가 게임을 죽이면 안 된다
        console.warn('[perfTelemetry] sample failed', err);
      }
    }, this.config.sampleIntervalMs);

    // 강제 flush 타이머
    this.flushTimer = setInterval(() => {
      if (this.buffer.length > 0) void this.flush();
    }, this.config.flushIntervalMs);

    // 언로드 훅
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.onVisibility);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', this.onPageHide);
    }
  }

  stop(): void {
    if (!this.started) return;
    this.started = false;

    if (this.sampleTimer !== null) {
      clearInterval(this.sampleTimer);
      this.sampleTimer = null;
    }
    if (this.flushTimer !== null) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.rafHandle !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.rafHandle);
      this.rafHandle = null;
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.onVisibility);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('pagehide', this.onPageHide);
    }

    // 남은 버퍼는 마지막 flush 시도
    void this.flush();
  }

  setSceneTag(tag: PerfSceneTag): void {
    this.sceneTag = { ...tag };
  }

  async flush(): Promise<PerfTelemetryIngestResult | null> {
    if (this.buffer.length === 0) return null;

    const samples = this.buffer.splice(0, this.buffer.length);
    const batch = this.buildBatch(samples);
    const body = JSON.stringify(batch);

    // 1) sendBeacon 경로 (페이지 언로드 시 안전)
    const nav = typeof navigator !== 'undefined' ? navigator : undefined;
    const isHidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
    if (isHidden && nav && typeof nav.sendBeacon === 'function') {
      try {
        const blob = new Blob([body], { type: 'application/json' });
        const ok = nav.sendBeacon(this.config.endpoint, blob);
        if (ok) {
          this.batchesSent++;
          return { accepted: samples.length, dropped: 0 };
        }
      } catch {
        // fall through to fetch
      }
    }

    // 2) fetch 경로
    try {
      const res = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
        credentials: 'include',
      });
      if (!res.ok) {
        this.batchesFailed++;
        if (this.config.retryOnFailure) {
          // 단순 재시도: 버퍼 선두에 되돌림 (크기 상한 보호)
          const reinsert = samples.slice(0, Math.max(0, this.config.batchSize - this.buffer.length));
          this.buffer.unshift(...reinsert);
        }
        return { accepted: 0, dropped: samples.length, reason: 'schema_invalid' };
      }
      this.batchesSent++;
      const json = (await res.json().catch(() => null)) as PerfTelemetryIngestResult | null;
      return json ?? { accepted: samples.length, dropped: 0 };
    } catch (err) {
      this.batchesFailed++;
      console.warn('[perfTelemetry] flush failed', err);
      return null;
    }
  }

  getStats(): { samplesBuffered: number; batchesSent: number; batchesFailed: number } {
    return {
      samplesBuffered: this.buffer.length,
      batchesSent: this.batchesSent,
      batchesFailed: this.batchesFailed,
    };
  }

  // ─── 내부 헬퍼 ───────────────────────────────────────────────

  /** 단일 샘플 생성 — FPS / p50/p95 프레임타임 / 메모리 / 풀 통계 */
  protected sample(): PerfSample {
    const frames = this.frameTimes;
    const avgDt = frames.length > 0
      ? frames.reduce((a, b) => a + b, 0) / frames.length
      : 0;
    const fps = avgDt > 0 ? Math.min(240, 1000 / avgDt) : 0;
    const p50 = percentile(frames, 50);
    const p95 = percentile(frames, 95);

    return {
      ts: nowIso(),
      fps: Math.round(fps * 10) / 10,
      frameMsP50: Math.round(p50 * 100) / 100,
      frameMsP95: Math.round(p95 * 100) / 100,
      heapUsedMb: readHeapUsedMb(),
      activeParticles: this.hooks.getActiveParticles?.(),
      textureMb: this.hooks.getTextureMb?.(),
    };
  }

  /** 버퍼를 배치로 직렬화 */
  protected buildBatch(samples: PerfSample[]): PerfTelemetryBatch {
    const seq = ++this.batchSeq;
    const scene: PerfSceneTag = this.sceneTag ?? {
      sceneKey: 'unknown',
      inCombat: false,
    };

    return {
      eventId: uuid(),
      eventTs: nowIso(),
      sessionId: this.ctx.sessionId,
      playerIdHash: fnv1a(this.ctx.playerId),
      buildVersion: this.ctx.buildVersion,
      platform: this.ctx.platform,
      userAgent: this.ctx.userAgent,
      hwTier: this.ctx.hwTier,
      inputMode: this.ctx.inputMode,
      scene,
      samples,
      sampleIntervalMs: this.config.sampleIntervalMs,
      idempotencyKey: `${this.ctx.sessionId}:${seq}`,
    };
  }
}

/** 팩토리 — 주입 단순화 */
export function createPerfTelemetry(
  ctx: PerfTelemetryContext,
  config?: Partial<PerfTelemetryConfig>,
  hooks?: PerfRuntimeHooks,
): IPerfTelemetryCollector {
  const merged: PerfTelemetryConfig = { ...DEFAULT_PERF_CONFIG, ...(config ?? {}) };
  return new PerfTelemetryCollector(ctx, merged, hooks);
}

/** No-op 구현 — 테스트/오프라인 모드용 */
export class NoopPerfTelemetry implements IPerfTelemetryCollector {
  start(): void {}
  stop(): void {}
  setSceneTag(_tag: PerfSceneTag): void {}
  async flush(): Promise<PerfTelemetryIngestResult | null> {
    return null;
  }
  getStats() {
    return { samplesBuffered: 0, batchesSent: 0, batchesFailed: 0 };
  }
}
