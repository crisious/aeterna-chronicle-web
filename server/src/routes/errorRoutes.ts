/**
 * errorRoutes.ts — 클라이언트 에러 수집 엔드포인트 (P5-17)
 *
 * POST /api/errors — 클라이언트에서 발생한 에러를 서버로 전송해 로깅한다.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

// ── 요청 스키마 ─────────────────────────────────────────────

interface ClientErrorBody {
  errorType: string;        // 에러 유형 (runtime, network, scene, etc.)
  message: string;          // 에러 메시지
  stack?: string;           // 스택 트레이스
  scene?: string;           // 발생 씬
  userAgent?: string;       // 클라이언트 UA
  timestamp?: string;       // 발생 시각 (ISO)
  metadata?: Record<string, unknown>; // 추가 정보
}

// ── 에러 로깅 ──────────────────────────────────────────────

/** 클라이언트 에러 로그 기록 */
function logClientError(ip: string, body: ClientErrorBody): void {
  const entry = {
    source: 'client',
    timestamp: body.timestamp ?? new Date().toISOString(),
    ip,
    errorType: body.errorType,
    message: body.message,
    stack: body.stack,
    scene: body.scene,
    userAgent: body.userAgent,
    metadata: body.metadata,
  };

  // structuredLogger 연동 시도
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { structuredLogger } = require('../logging/structuredLogger');
    if (structuredLogger && typeof structuredLogger.warn === 'function') {
      structuredLogger.warn(entry);
      return;
    }
  } catch {
    // fallback
  }

  console.warn('[ClientError]', JSON.stringify(entry));
}

// ── 라우트 등록 ─────────────────────────────────────────────

export async function errorRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /api/errors — 클라이언트 에러 수집
   *
   * Body:
   * {
   *   errorType: "runtime" | "network" | "scene" | "unknown",
   *   message: "에러 메시지",
   *   stack?: "스택 트레이스",
   *   scene?: "BattleScene",
   *   userAgent?: "Mozilla/5.0 ...",
   *   timestamp?: "2026-03-11T09:00:00Z",
   *   metadata?: { ... }
   * }
   */
  fastify.post('/api/errors', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as ClientErrorBody;

    // 최소 검증
    if (!body || !body.errorType || !body.message) {
      return reply.status(400).send({
        code: 'ERR_VALIDATION',
        message: 'errorType과 message는 필수입니다',
      });
    }

    // 에러 메시지 길이 제한 (DDoS 방지)
    if (body.message.length > 5000) {
      body.message = body.message.substring(0, 5000) + '... [truncated]';
    }
    if (body.stack && body.stack.length > 10000) {
      body.stack = body.stack.substring(0, 10000) + '... [truncated]';
    }

    logClientError(request.ip, body);

    return reply.status(201).send({ received: true });
  });

  fastify.log.info('[ErrorRoutes] POST /api/errors 라우트 등록 완료');
}

export default errorRoutes;
