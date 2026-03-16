/**
 * Loki 로그 전송 트랜스포트 — P7-16 로깅 파이프라인
 *
 * 구조화 로그를 Grafana Loki로 push.
 * 배치 전송 (5초 간격 또는 100건 누적 시 즉시 전송)
 *
 * 환경변수:
 *   LOKI_URL       — Loki push endpoint (예: http://loki:3100)
 *   LOKI_TENANT    — 멀티테넌트 ID (기본: aeterna)
 *   LOKI_BATCH_SIZE — 배치 크기 (기본: 100)
 *   LOKI_FLUSH_MS   — 배치 주기 ms (기본: 5000)
 */

import type { LogEntry } from './structuredLogger';

// ── 설정 ─────────────────────────────────────────────────────

interface LokiConfig {
  url: string;
  tenantId: string;
  batchSize: number;
  flushIntervalMs: number;
  labels: Record<string, string>;
}

function getLokiConfig(): LokiConfig | null {
  const url = process.env.LOKI_URL;
  if (!url) return null;

  return {
    url: `${url}/loki/api/v1/push`,
    tenantId: process.env.LOKI_TENANT || 'aeterna',
    batchSize: parseInt(process.env.LOKI_BATCH_SIZE || '100', 10),
    flushIntervalMs: parseInt(process.env.LOKI_FLUSH_MS || '5000', 10),
    labels: {
      app: 'aeterna-server',
      env: process.env.NODE_ENV || 'development',
      hostname: process.env.HOSTNAME || 'local',
    },
  };
}

// ── Loki Push 프로토콜 타입 ──────────────────────────────────

interface LokiStream {
  stream: Record<string, string>;
  values: [string, string][]; // [nanosecond timestamp, log line]
}

interface LokiPushPayload {
  streams: LokiStream[];
}

// ── 배치 버퍼 ────────────────────────────────────────────────

let buffer: LogEntry[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;
let config: LokiConfig | null = null;

/** 로그 엔트리를 Loki 배치에 추가 */
export function pushToLoki(entry: LogEntry): void {
  if (!config) return;
  buffer.push(entry);

  if (buffer.length >= config.batchSize) {
    void flushLoki();
  }
}

/** 배치 flush — Loki로 HTTP POST */
async function flushLoki(): Promise<void> {
  if (!config || buffer.length === 0) return;

  const batch = buffer.splice(0);

  const values: [string, string][] = batch.map((entry) => {
    const ts = new Date(entry.timestamp).getTime() * 1_000_000; // ms → ns
    return [String(ts), JSON.stringify(entry)];
  });

  const payload: LokiPushPayload = {
    streams: [
      {
        stream: {
          ...config.labels,
          level: batch[0]?.level || 'info',
        },
        values,
      },
    ],
  };

  // 레벨별 스트림 분리 (Loki 쿼리 최적화)
  const byLevel = new Map<string, [string, string][]>();
  for (const entry of batch) {
    const ts = new Date(entry.timestamp).getTime() * 1_000_000;
    const arr = byLevel.get(entry.level) || [];
    arr.push([String(ts), JSON.stringify(entry)]);
    byLevel.set(entry.level, arr);
  }

  payload.streams = Array.from(byLevel.entries()).map(([level, vals]) => ({
    stream: { ...config!.labels, level },
    values: vals,
  }));

  try {
    await fetch(config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Scope-OrgID': config.tenantId,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // Loki 전송 실패 시 stderr로만 경고 (무한 재귀 방지)
    process.stderr.write(`[LokiTransport] flush 실패: ${batch.length}건 드롭\n`);
  }
}

// ── 라이프사이클 ─────────────────────────────────────────────

/** Loki 트랜스포트 시작 */
export function startLokiTransport(): boolean {
  config = getLokiConfig();
  if (!config) {
    console.log('[LokiTransport] LOKI_URL 미설정 — 비활성화');
    return false;
  }

  flushTimer = setInterval(() => void flushLoki(), config.flushIntervalMs);
  console.log(`[LokiTransport] 활성화 — ${config.url} (${config.flushIntervalMs}ms 간격)`);
  return true;
}

/** Loki 트랜스포트 종료 — 잔여 flush 후 타이머 정리 */
export async function stopLokiTransport(): Promise<void> {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  await flushLoki();
  config = null;
}

/** 현재 버퍼 상태 조회 */
export function getLokiBufferStatus(): { pending: number; active: boolean } {
  return { pending: buffer.length, active: config !== null };
}
