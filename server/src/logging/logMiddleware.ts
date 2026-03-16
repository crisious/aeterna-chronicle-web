/**
 * HTTP 요청/응답 자동 로깅 미들웨어 — P4-18 로그/모니터링
 * 
 * 기능:
 *   - 모든 HTTP 요청/응답 자동 로깅
 *   - 응답 시간 측정
 *   - 에러 스택트레이스 포함
 *   - 요청별 traceId 자동 부여
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  logger,
  generateTraceId,
  setTraceId,
  mapRequestTrace,
} from './structuredLogger';

// ── 요청 메타데이터 추출 ─────────────────────────────────────

interface RequestMeta {
  method: string;
  url: string;
  ip: string;
  userAgent: string;
  contentLength: number | undefined;
  traceId: string;
}

function extractRequestMeta(request: FastifyRequest, traceId: string): RequestMeta {
  return {
    method: request.method,
    url: request.url,
    ip: request.ip,
    userAgent: (request.headers['user-agent'] as string) || 'unknown',
    contentLength: request.headers['content-length']
      ? parseInt(request.headers['content-length'] as string, 10)
      : undefined,
    traceId,
  };
}

// ── 응답 메타데이터 ──────────────────────────────────────────

interface ResponseMeta {
  statusCode: number;
  responseTime: number; // ms
  contentLength: number | undefined;
}

// ── 미들웨어 등록 ────────────────────────────────────────────

const requestLogger = logger.child('http');

/**
 * Fastify 인스턴스에 로깅 미들웨어를 등록.
 * 
 * 사용법:
 *   import { registerLogMiddleware } from './logging/logMiddleware';
 *   registerLogMiddleware(fastify);
 */
export function registerLogMiddleware(app: FastifyInstance): void {
  // ── 요청 시작: traceId 부여 + 요청 로그 ──
  app.addHook('onRequest', async (request: FastifyRequest, _reply: FastifyReply) => {
    // 외부에서 전달된 traceId가 있으면 사용, 없으면 생성
    const incomingTrace = request.headers['x-trace-id'] as string | undefined;
    const traceId = incomingTrace || generateTraceId();

    // traceId를 요청 객체에 저장 (후속 훅에서 참조)
    (request as unknown as Record<string, unknown>).__traceId = traceId;
    (request as unknown as Record<string, unknown>).__startTime = performance.now();

    // 글로벌 traceId 설정 (동기 컨텍스트 내)
    setTraceId(traceId);
    mapRequestTrace(request.id as string, traceId);

    const meta = extractRequestMeta(request, traceId);
    requestLogger.info('→ 요청 수신', meta as unknown as Record<string, unknown>);
  });

  // ── 응답 완료: 응답 시간 + 상태 코드 로그 ──
  app.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = (request as unknown as Record<string, string>).__traceId || 'unknown';
    const startTime = (request as unknown as Record<string, number>).__startTime || performance.now();
    const responseTime = Math.round(performance.now() - startTime);

    setTraceId(traceId);

    const responseMeta: ResponseMeta = {
      statusCode: reply.statusCode,
      responseTime,
      contentLength: reply.getHeader('content-length')
        ? parseInt(reply.getHeader('content-length') as string, 10)
        : undefined,
    };

    const logMeta = {
      method: request.method,
      url: request.url,
      traceId,
      ...responseMeta,
    };

    if (reply.statusCode >= 500) {
      requestLogger.error('← 서버 에러 응답', logMeta);
    } else if (reply.statusCode >= 400) {
      requestLogger.warn('← 클라이언트 에러 응답', logMeta);
    } else {
      requestLogger.info('← 응답 완료', logMeta);
    }
  });

  // ── 에러 핸들러: 스택트레이스 포함 ──
  app.addHook('onError', async (request: FastifyRequest, _reply: FastifyReply, error: Error) => {
    const traceId = (request as unknown as Record<string, string>).__traceId || 'unknown';
    setTraceId(traceId);

    requestLogger.errorWithStack('⚠ 요청 처리 중 에러 발생', error, {
      method: request.method,
      url: request.url,
      traceId,
      ip: request.ip,
    });
  });

  requestLogger.info('HTTP 로깅 미들웨어 등록 완료');
}

// ── 응답 헤더에 traceId 주입 (디버깅용) ──────────────────────

/**
 * 응답 헤더에 X-Trace-Id를 추가하는 훅.
 * 클라이언트가 로그 추적에 사용 가능.
 */
export function registerTraceIdHeader(app: FastifyInstance): void {
  app.addHook('onSend', async (request: FastifyRequest, reply: FastifyReply) => {
    const traceId = (request as unknown as Record<string, string>).__traceId;
    if (traceId) {
      void reply.header('X-Trace-Id', traceId);
    }
  });
}
