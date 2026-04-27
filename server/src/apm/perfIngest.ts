/**
 * server/src/apm/perfIngest.ts — 클라이언트 성능 텔레메트리 수신 엔드포인트
 *
 * 스프린트: 에테르나 크로니클 게임 프로젝트 개선 (Build 단계)
 * 작성: 계섬월 (Staff Engineer)
 *
 * 클라이언트 `perfTelemetry.ts` 가 POST 하는 엔드포인트.
 * 흐름:
 *   1) rate limit (세션당 분당 N회)
 *   2) 스키마 검증
 *   3) idempotencyKey 중복 제거
 *   4) sink.ingest
 *   5) 202 Accepted + 결과 JSON
 */

import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import type {
  PerfTelemetryBatch,
  PerfTelemetryIngestResult,
} from '../../../shared/types/performance';

/** 스키마 검증기 인터페이스 */
export interface PerfBatchValidator {
  validate(payload: unknown): { ok: true; batch: PerfTelemetryBatch } | { ok: false; reason: string };
}

/** 저장 백엔드 인터페이스 */
export interface PerfMetricsSink {
  ingest(batch: PerfTelemetryBatch): Promise<PerfTelemetryIngestResult>;
}

/** 중복 방지 저장소 */
export interface IdempotencyStore {
  checkAndSet(key: string, ttlSec: number): Promise<boolean>;
}

/** 세션 단위 레이트 리미터 */
export interface PerfRateLimiter {
  allow(sessionId: string): Promise<boolean>;
}

export interface PerfIngestDeps {
  validator: PerfBatchValidator;
  sink: PerfMetricsSink;
  idempotency: IdempotencyStore;
  rateLimiter: PerfRateLimiter;
  observe?: (event: 'accepted' | 'rejected' | 'duplicate' | 'rate_limited', n: number) => void;
}

const IDEMPOTENCY_TTL_SEC = 3600;

/**
 * Fastify 핸들러 팩토리.
 */
export function createPerfIngestHandler(deps: PerfIngestDeps) {
  const { validator, sink, idempotency, rateLimiter, observe } = deps;

  return async function perfIngestHandler(
    req: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    // 1) 스키마 검증
    const result = validator.validate(req.body);
    if (!result.ok) {
      observe?.('rejected', 1);
      reply.code(400).send({
        accepted: 0,
        dropped: 0,
        reason: 'schema_invalid',
        detail: result.reason,
      } satisfies PerfTelemetryIngestResult & { detail: string });
      return;
    }
    const batch = result.batch;

    // 2) 레이트 리미트 (세션 단위)
    const allowed = await rateLimiter.allow(batch.sessionId);
    if (!allowed) {
      observe?.('rate_limited', 1);
      reply.code(429).send({
        accepted: 0,
        dropped: batch.samples.length,
        reason: 'rate_limited',
      } satisfies PerfTelemetryIngestResult);
      return;
    }

    // 3) 중복 제거
    const firstSeen = await idempotency.checkAndSet(batch.idempotencyKey, IDEMPOTENCY_TTL_SEC);
    if (!firstSeen) {
      observe?.('duplicate', 1);
      reply.code(202).send({
        accepted: 0,
        dropped: batch.samples.length,
        reason: 'duplicate',
      } satisfies PerfTelemetryIngestResult);
      return;
    }

    // 4) 저장소 ingest
    const ingestResult = await sink.ingest(batch);
    observe?.('accepted', ingestResult.accepted);

    // 5) 202 Accepted (비동기 처리 성격)
    reply.code(202).send(ingestResult);
  };
}

/** 라우트 등록 — Fastify 인스턴스에 POST /api/telemetry/perf 마운트 */
export function registerPerfIngestRoutes(
  app: FastifyInstance,
  deps: PerfIngestDeps,
  options: { prefix?: string } = {},
): void {
  const prefix = options.prefix ?? '/api';
  app.post(`${prefix}/telemetry/perf`, createPerfIngestHandler(deps));
}

// ─── 기본 구현 ─────────────────────────────────────────────────

/** 최소 검증기 — 필수 필드와 타입만 확인 (zod 미도입 환경 대응) */
export class BasicPerfBatchValidator implements PerfBatchValidator {
  validate(payload: unknown): { ok: true; batch: PerfTelemetryBatch } | { ok: false; reason: string } {
    if (!payload || typeof payload !== 'object') {
      return { ok: false, reason: 'payload_not_object' };
    }
    const p = payload as Record<string, unknown>;

    const required: Array<[string, (v: unknown) => boolean]> = [
      ['eventId', (v) => typeof v === 'string' && v.length > 0],
      ['eventTs', (v) => typeof v === 'string'],
      ['sessionId', (v) => typeof v === 'string' && v.length > 0],
      ['playerIdHash', (v) => typeof v === 'string'],
      ['buildVersion', (v) => typeof v === 'string'],
      ['platform', (v) => typeof v === 'string'],
      ['inputMode', (v) => typeof v === 'string'],
      ['scene', (v) => !!v && typeof v === 'object'],
      ['samples', (v) => Array.isArray(v)],
      ['sampleIntervalMs', (v) => typeof v === 'number' && v > 0],
      ['idempotencyKey', (v) => typeof v === 'string' && v.length > 0],
    ];

    for (const [field, check] of required) {
      if (!check(p[field])) {
        return { ok: false, reason: `invalid:${field}` };
      }
    }

    const samples = p.samples as unknown[];
    if (samples.length === 0 || samples.length > 200) {
      return { ok: false, reason: 'samples_length_out_of_range' };
    }
    for (let i = 0; i < samples.length; i++) {
      const s = samples[i] as Record<string, unknown> | null;
      if (!s || typeof s !== 'object') {
        return { ok: false, reason: `sample_invalid:${i}` };
      }
      if (typeof s.fps !== 'number' || typeof s.frameMsP50 !== 'number' || typeof s.frameMsP95 !== 'number') {
        return { ok: false, reason: `sample_fields:${i}` };
      }
    }

    return { ok: true, batch: payload as PerfTelemetryBatch };
  }
}

/** 인메모리 idempotency — 단일 프로세스 기본값. 프로덕션은 Redis 권장. */
export class InMemoryIdempotencyStore implements IdempotencyStore {
  private readonly seen = new Map<string, number>();

  async checkAndSet(key: string, ttlSec: number): Promise<boolean> {
    const now = Date.now();
    const expiry = this.seen.get(key);
    if (expiry !== undefined && expiry > now) {
      return false;
    }
    this.seen.set(key, now + ttlSec * 1000);
    // 간이 GC — 키가 과다하면 만료된 키 제거
    if (this.seen.size > 10_000) {
      for (const [k, v] of this.seen) {
        if (v <= now) this.seen.delete(k);
      }
    }
    return true;
  }
}

/** 토큰 버킷 레이트 리미터 — 세션당 분당 N회 */
export class InMemoryPerfRateLimiter implements PerfRateLimiter {
  private readonly buckets = new Map<string, { tokens: number; updatedAt: number }>();

  constructor(
    private readonly maxPerMinute = 10,
    private readonly refillIntervalMs = 60_000,
  ) {}

  async allow(sessionId: string): Promise<boolean> {
    const now = Date.now();
    const bucket = this.buckets.get(sessionId) ?? { tokens: this.maxPerMinute, updatedAt: now };

    // 경과 시간만큼 토큰 리필
    const elapsed = now - bucket.updatedAt;
    const refill = (elapsed / this.refillIntervalMs) * this.maxPerMinute;
    bucket.tokens = Math.min(this.maxPerMinute, bucket.tokens + refill);
    bucket.updatedAt = now;

    if (bucket.tokens < 1) {
      this.buckets.set(sessionId, bucket);
      return false;
    }

    bucket.tokens -= 1;
    this.buckets.set(sessionId, bucket);
    return true;
  }
}

/** 콘솔 sink — 개발용. 프로덕션은 TSDB / Prometheus pushgateway 로 교체. */
export class ConsolePerfSink implements PerfMetricsSink {
  async ingest(batch: PerfTelemetryBatch): Promise<PerfTelemetryIngestResult> {
    const avgFps = batch.samples.reduce((a, s) => a + s.fps, 0) / batch.samples.length;
    const avgP95 = batch.samples.reduce((a, s) => a + s.frameMsP95, 0) / batch.samples.length;
    console.log(
      `[perf] session=${batch.sessionId} scene=${batch.scene.sceneKey} ` +
      `combat=${batch.scene.inCombat} samples=${batch.samples.length} ` +
      `avgFps=${avgFps.toFixed(1)} avgP95=${avgP95.toFixed(2)}ms`,
    );
    return { accepted: batch.samples.length, dropped: 0 };
  }
}

/** 기본 의존성 번들 — 테스트/개발 환경에서 바로 쓸 수 있는 조합 */
export function createDefaultPerfIngestDeps(overrides?: Partial<PerfIngestDeps>): PerfIngestDeps {
  return {
    validator: new BasicPerfBatchValidator(),
    sink: new ConsolePerfSink(),
    idempotency: new InMemoryIdempotencyStore(),
    rateLimiter: new InMemoryPerfRateLimiter(),
    ...overrides,
  };
}
