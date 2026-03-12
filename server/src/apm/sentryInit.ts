/**
 * Sentry + Datadog APM 연동 모듈 — P7-15 에러 모니터링
 *
 * Sentry: 에러 자동 수집 + 트랜잭션 추적
 * Datadog: APM 트레이싱 + 커스텀 메트릭
 *
 * 환경변수:
 *   SENTRY_DSN          — Sentry 프로젝트 DSN
 *   SENTRY_ENVIRONMENT   — 환경 (production/staging/development)
 *   SENTRY_TRACES_SAMPLE — 트레이스 샘플링 비율 (0.0~1.0, 기본 0.2)
 *   DATADOG_API_KEY      — Datadog API 키
 *   DATADOG_APP_KEY      — Datadog 앱 키 (대시보드/모니터용)
 *   DATADOG_SITE         — Datadog 사이트 (기본 datadoghq.com)
 *   DD_SERVICE           — Datadog 서비스명 (기본 aeterna-server)
 *   DD_ENV               — Datadog 환경 (기본 NODE_ENV)
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../logging/structuredLogger';

// ── Sentry 설정 ──────────────────────────────────────────────

interface SentryConfig {
  dsn: string;
  environment: string;
  tracesSampleRate: number;
  release: string;
  serverName: string;
}

function getSentryConfig(): SentryConfig | null {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    logger.warn('[Sentry] SENTRY_DSN 미설정 — Sentry 비활성화');
    return null;
  }

  return {
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE || '0.2'),
    release: `aeterna-server@${process.env.npm_package_version || '1.0.0'}`,
    serverName: process.env.HOSTNAME || 'aeterna-node',
  };
}

// ── Datadog 설정 ─────────────────────────────────────────────

interface DatadogConfig {
  apiKey: string;
  appKey: string | undefined;
  site: string;
  service: string;
  env: string;
}

function getDatadogConfig(): DatadogConfig | null {
  const apiKey = process.env.DATADOG_API_KEY;
  if (!apiKey) {
    logger.warn('[Datadog] DATADOG_API_KEY 미설정 — Datadog 비활성화');
    return null;
  }

  return {
    apiKey,
    appKey: process.env.DATADOG_APP_KEY,
    site: process.env.DATADOG_SITE || 'datadoghq.com',
    service: process.env.DD_SERVICE || 'aeterna-server',
    env: process.env.DD_ENV || process.env.NODE_ENV || 'development',
  };
}

// ── 에러 보고 버퍼 (Sentry/Datadog SDK 없이 HTTP 전송) ──────

interface ErrorReport {
  timestamp: string;
  level: 'error' | 'fatal';
  message: string;
  stack?: string;
  tags: Record<string, string>;
  extra: Record<string, unknown>;
  request?: {
    method: string;
    url: string;
    ip: string;
    headers: Record<string, string>;
  };
}

const errorBuffer: ErrorReport[] = [];
const MAX_BUFFER_SIZE = 100;
let flushTimer: ReturnType<typeof setInterval> | null = null;

/** 에러를 버퍼에 추가 */
function captureError(
  err: Error,
  context?: {
    request?: FastifyRequest;
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
  }
): void {
  const report: ErrorReport = {
    timestamp: new Date().toISOString(),
    level: 'error',
    message: err.message,
    stack: err.stack,
    tags: {
      service: 'aeterna-server',
      environment: process.env.NODE_ENV || 'development',
      ...context?.tags,
    },
    extra: context?.extra || {},
  };

  if (context?.request) {
    report.request = {
      method: context.request.method,
      url: context.request.url,
      ip: context.request.ip,
      headers: {
        'user-agent': context.request.headers['user-agent'] || '',
        'content-type': context.request.headers['content-type'] || '',
      },
    };
  }

  errorBuffer.push(report);

  // 버퍼 오버플로우 방지
  if (errorBuffer.length > MAX_BUFFER_SIZE) {
    errorBuffer.splice(0, errorBuffer.length - MAX_BUFFER_SIZE);
  }
}

/** Sentry 스토어 엔벨로프 전송 (Sentry HTTP API) */
async function flushToSentry(config: SentryConfig): Promise<number> {
  if (errorBuffer.length === 0) return 0;

  const batch = errorBuffer.splice(0, 50);
  let sent = 0;

  for (const report of batch) {
    try {
      const event = {
        event_id: generateEventId(),
        timestamp: report.timestamp,
        level: report.level,
        platform: 'node',
        server_name: config.serverName,
        release: config.release,
        environment: config.environment,
        message: { formatted: report.message },
        exception: report.stack ? {
          values: [{
            type: 'Error',
            value: report.message,
            stacktrace: { frames: parseStackFrames(report.stack) },
          }],
        } : undefined,
        tags: report.tags,
        extra: report.extra,
        request: report.request ? {
          method: report.request.method,
          url: report.request.url,
          headers: report.request.headers,
        } : undefined,
      };

      // Sentry store endpoint
      const url = `${config.dsn.replace(/\/\d+$/, '')}/api/store/`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${extractSentryKey(config.dsn)}`,
        },
        body: JSON.stringify(event),
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) sent++;
    } catch {
      // 전송 실패 — 조용히 무시 (APM 자체가 서비스를 중단시키면 안 됨)
    }
  }

  if (sent > 0) {
    logger.info(`[Sentry] ${sent}건 에러 리포트 전송 완료`);
  }

  return sent;
}

/** Datadog Events API 전송 */
async function flushToDatadog(config: DatadogConfig): Promise<number> {
  if (errorBuffer.length === 0) return 0;

  const batch = errorBuffer.splice(0, 50);
  let sent = 0;

  for (const report of batch) {
    try {
      const event = {
        title: `[${config.service}] ${report.message}`,
        text: report.stack || report.message,
        date_happened: Math.floor(new Date(report.timestamp).getTime() / 1000),
        priority: report.level === 'fatal' ? 'normal' : 'low',
        alert_type: 'error',
        tags: Object.entries(report.tags).map(([k, v]) => `${k}:${v}`),
        source_type_name: 'nodejs',
      };

      const response = await fetch(
        `https://api.${config.site}/api/v1/events`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'DD-API-KEY': config.apiKey,
          },
          body: JSON.stringify(event),
          signal: AbortSignal.timeout(5000),
        }
      );

      if (response.ok) sent++;
    } catch {
      // 전송 실패 — 조용히 무시
    }
  }

  if (sent > 0) {
    logger.info(`[Datadog] ${sent}건 이벤트 전송 완료`);
  }

  return sent;
}

// ── 유틸 ─────────────────────────────────────────────────────

function generateEventId(): string {
  return Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

function extractSentryKey(dsn: string): string {
  try {
    const url = new URL(dsn);
    return url.username || '';
  } catch {
    return '';
  }
}

function parseStackFrames(stack: string): Array<{ filename: string; lineno: number; function: string }> {
  return stack
    .split('\n')
    .slice(1)
    .map((line) => {
      const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):\d+\)/);
      if (match) {
        return { function: match[1], filename: match[2], lineno: parseInt(match[3], 10) };
      }
      const match2 = line.match(/at\s+(.+?):(\d+):\d+/);
      if (match2) {
        return { function: '<anonymous>', filename: match2[1], lineno: parseInt(match2[2], 10) };
      }
      return null;
    })
    .filter(Boolean) as Array<{ filename: string; lineno: number; function: string }>;
}

// ── 글로벌 에러 핸들러 ──────────────────────────────────────

let globalHandlersRegistered = false;

function registerGlobalErrorHandlers(): void {
  if (globalHandlersRegistered) return;
  globalHandlersRegistered = true;

  process.on('uncaughtException', (err: Error) => {
    logger.fatal(`[APM] uncaughtException: ${err.message}`, {
      stack: err.stack,
      name: err.name,
    });
    captureError(err, { tags: { source: 'uncaughtException' } });
  });

  process.on('unhandledRejection', (reason: unknown) => {
    const err = reason instanceof Error ? reason : new Error(String(reason));
    logger.error(`[APM] unhandledRejection: ${err.message}`, {
      stack: err.stack,
      name: err.name,
    });
    captureError(err, { tags: { source: 'unhandledRejection' } });
  });

  logger.info('[APM] 글로벌 에러 핸들러 등록 완료');
}

// ── Fastify 에러 훅 ─────────────────────────────────────────

function registerFastifyErrorHook(fastify: FastifyInstance): void {
  fastify.addHook('onError', async (request: FastifyRequest, _reply: FastifyReply, error: Error) => {
    captureError(error, {
      request,
      tags: {
        route: request.url,
        method: request.method,
      },
      extra: {
        params: request.params,
        query: request.query,
      },
    });
  });

  logger.info('[APM] Fastify onError 훅 등록 완료');
}

// ── 공개 API ─────────────────────────────────────────────────

/** Sentry + Datadog APM 초기화 */
export async function initSentryDatadog(fastify: FastifyInstance): Promise<void> {
  const sentryConfig = getSentryConfig();
  const datadogConfig = getDatadogConfig();

  if (!sentryConfig && !datadogConfig) {
    logger.warn('[APM] Sentry/Datadog 모두 미설정 — 외부 APM 비활성화 (로컬 APM만 동작)');
    return;
  }

  // 글로벌 핸들러 등록
  registerGlobalErrorHandlers();

  // Fastify 에러 훅 등록
  registerFastifyErrorHook(fastify);

  // 주기적 flush (30초 간격)
  flushTimer = setInterval(async () => {
    if (sentryConfig) await flushToSentry(sentryConfig);
    if (datadogConfig) await flushToDatadog(datadogConfig);
  }, 30_000);

  const providers = [
    sentryConfig ? 'Sentry' : null,
    datadogConfig ? 'Datadog' : null,
  ].filter(Boolean).join(' + ');

  logger.info(`[APM] 외부 모니터링 초기화 완료: ${providers}`);
}

/** APM 종료 — 잔여 버퍼 flush + 타이머 정리 */
export async function shutdownSentryDatadog(): Promise<void> {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }

  // 잔여 에러 최종 전송
  const sentryConfig = getSentryConfig();
  const datadogConfig = getDatadogConfig();

  if (sentryConfig) await flushToSentry(sentryConfig);
  if (datadogConfig) await flushToDatadog(datadogConfig);

  logger.info('[APM] Sentry/Datadog 종료 완료');
}

/** 수동 에러 캡처 (코드에서 직접 호출용) */
export { captureError };

/** 에러 버퍼 현황 조회 (대시보드용) */
export function getErrorBufferStatus(): { pending: number; maxSize: number } {
  return { pending: errorBuffer.length, maxSize: MAX_BUFFER_SIZE };
}
