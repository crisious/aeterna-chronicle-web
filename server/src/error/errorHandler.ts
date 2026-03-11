/**
 * errorHandler.ts — 글로벌 에러 핸들러 (P5-17)
 *
 * Fastify onError 훅으로 전역 에러를 캐치하고 표준화된 응답을 반환한다.
 * - 에러 코드 표준화: ERR_AUTH, ERR_VALIDATION, ERR_NOT_FOUND, ERR_RATE_LIMIT, ERR_INTERNAL
 * - 에러 응답 포맷 통일: { code, message, details, traceId }
 * - structuredLogger 연동 에러 로깅
 */

import { FastifyInstance, FastifyRequest, FastifyReply, FastifyError } from 'fastify';
import crypto from 'crypto';

// ── 에러 코드 정의 ──────────────────────────────────────────

/** 표준 에러 코드 */
export enum ErrorCode {
  ERR_AUTH = 'ERR_AUTH',
  ERR_VALIDATION = 'ERR_VALIDATION',
  ERR_NOT_FOUND = 'ERR_NOT_FOUND',
  ERR_RATE_LIMIT = 'ERR_RATE_LIMIT',
  ERR_INTERNAL = 'ERR_INTERNAL',
  ERR_FORBIDDEN = 'ERR_FORBIDDEN',
  ERR_CONFLICT = 'ERR_CONFLICT',
  ERR_BAD_REQUEST = 'ERR_BAD_REQUEST',
  ERR_SERVICE_UNAVAILABLE = 'ERR_SERVICE_UNAVAILABLE',
}

/** 표준 에러 응답 형식 */
export interface ErrorResponse {
  code: ErrorCode;
  message: string;
  details?: unknown;
  traceId: string;
}

// ── 커스텀 에러 클래스 ──────────────────────────────────────

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(code: ErrorCode, message: string, statusCode: number, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

/** 인증 에러 (401) */
export class AuthError extends AppError {
  constructor(message = '인증이 필요합니다', details?: unknown) {
    super(ErrorCode.ERR_AUTH, message, 401, details);
    this.name = 'AuthError';
  }
}

/** 검증 에러 (400) */
export class ValidationError extends AppError {
  constructor(message = '입력값이 올바르지 않습니다', details?: unknown) {
    super(ErrorCode.ERR_VALIDATION, message, 400, details);
    this.name = 'ValidationError';
  }
}

/** 리소스 미발견 에러 (404) */
export class NotFoundError extends AppError {
  constructor(message = '요청한 리소스를 찾을 수 없습니다', details?: unknown) {
    super(ErrorCode.ERR_NOT_FOUND, message, 404, details);
    this.name = 'NotFoundError';
  }
}

/** 속도 제한 에러 (429) */
export class RateLimitError extends AppError {
  constructor(message = '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요', details?: unknown) {
    super(ErrorCode.ERR_RATE_LIMIT, message, 429, details);
    this.name = 'RateLimitError';
  }
}

/** 권한 에러 (403) */
export class ForbiddenError extends AppError {
  constructor(message = '접근 권한이 없습니다', details?: unknown) {
    super(ErrorCode.ERR_FORBIDDEN, message, 403, details);
    this.name = 'ForbiddenError';
  }
}

// ── 에러 매핑 ──────────────────────────────────────────────

/** HTTP 상태 코드 → 에러 코드 매핑 */
function mapStatusToErrorCode(statusCode: number): ErrorCode {
  switch (statusCode) {
    case 400: return ErrorCode.ERR_BAD_REQUEST;
    case 401: return ErrorCode.ERR_AUTH;
    case 403: return ErrorCode.ERR_FORBIDDEN;
    case 404: return ErrorCode.ERR_NOT_FOUND;
    case 429: return ErrorCode.ERR_RATE_LIMIT;
    default: return ErrorCode.ERR_INTERNAL;
  }
}

/** traceId 생성 (요청 추적용) */
function generateTraceId(): string {
  return crypto.randomUUID().replace(/-/g, '').substring(0, 16);
}

// ── structuredLogger 연동 ──────────────────────────────────

/** 에러 로깅 (structuredLogger가 없을 경우 fallback) */
function logError(
  request: FastifyRequest,
  error: Error | FastifyError,
  traceId: string,
  code: ErrorCode,
): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    traceId,
    code,
    method: request.method,
    url: request.url,
    ip: request.ip,
    userAgent: request.headers['user-agent'] ?? 'unknown',
    errorName: error.name,
    errorMessage: error.message,
    stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
  };

  // structuredLogger 동적 임포트 시도
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { structuredLogger } = require('../logging/structuredLogger');
    if (structuredLogger && typeof structuredLogger.error === 'function') {
      structuredLogger.error(logEntry);
      return;
    }
  } catch {
    // structuredLogger 미사용 시 fallback
  }

  // fallback: console
  if (code === ErrorCode.ERR_INTERNAL) {
    console.error('[ErrorHandler]', JSON.stringify(logEntry));
  } else {
    console.warn('[ErrorHandler]', JSON.stringify(logEntry));
  }
}

// ── Fastify 플러그인 등록 ──────────────────────────────────

/**
 * 글로벌 에러 핸들러 등록
 * 
 * @example
 * ```ts
 * import { registerErrorHandler } from './error/errorHandler';
 * await registerErrorHandler(fastify);
 * ```
 */
export async function registerErrorHandler(fastify: FastifyInstance): Promise<void> {
  // 글로벌 에러 핸들러
  fastify.setErrorHandler((error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateTraceId();

    // AppError (프로젝트 커스텀 에러)
    if (error instanceof AppError) {
      logError(request, error, traceId, error.code);

      const response: ErrorResponse = {
        code: error.code,
        message: error.message,
        details: error.details,
        traceId,
      };

      return reply.status(error.statusCode).send(response);
    }

    // Fastify 내장 에러 (validation, 404 등)
    const statusCode = error.statusCode ?? 500;
    const errorCode = mapStatusToErrorCode(statusCode);

    logError(request, error, traceId, errorCode);

    const response: ErrorResponse = {
      code: errorCode,
      message: statusCode === 500
        ? '내부 서버 오류가 발생했습니다'
        : error.message,
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined,
      traceId,
    };

    return reply.status(statusCode).send(response);
  });

  // 404 핸들러
  fastify.setNotFoundHandler((request: FastifyRequest, reply: FastifyReply) => {
    const traceId = generateTraceId();

    const response: ErrorResponse = {
      code: ErrorCode.ERR_NOT_FOUND,
      message: `경로를 찾을 수 없습니다: ${request.method} ${request.url}`,
      traceId,
    };

    return reply.status(404).send(response);
  });

  fastify.log.info('[ErrorHandler] 글로벌 에러 핸들러 등록 완료');
}

export default registerErrorHandler;
