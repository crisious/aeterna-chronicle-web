/**
 * 입력 검증 미들웨어 — Zod 스키마 + SQL 인젝션 + XSS 방어
 * P4-15: 보안 강화
 *
 * - Zod 기반 스키마 검증 팩토리
 * - SQL 인젝션 패턴 감지
 * - XSS 문자열 이스케이프
 * - 요청 크기 제한 (1MB)
 */
import { FastifyRequest, FastifyReply } from 'fastify';

// ─── 요청 크기 제한 ─────────────────────────────────────────────

const MAX_BODY_BYTES = 1 * 1024 * 1024; // 1 MB

// ─── SQL 인젝션 패턴 ────────────────────────────────────────────

const SQL_INJECTION_PATTERNS: RegExp[] = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|EXEC|UNION)\b\s)/i,
  /(--|#|\/\*|\*\/)/,
  /(\b(OR|AND)\b\s+\d+\s*=\s*\d+)/i,
  /('\s*(OR|AND)\s+')/i,
  /(;\s*(DROP|DELETE|INSERT|UPDATE)\b)/i,
  /(\bSLEEP\s*\()/i,
  /(\bBENCHMARK\s*\()/i,
  /(\bWAITFOR\s+DELAY\b)/i,
];

/** 문자열에 SQL 인젝션 의심 패턴이 있는지 검사 */
export function detectSqlInjection(value: string): boolean {
  return SQL_INJECTION_PATTERNS.some((pattern) => pattern.test(value));
}

// ─── XSS 이스케이프 ─────────────────────────────────────────────

const XSS_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
};

/** XSS 위험 문자를 HTML 엔티티로 이스케이프 */
export function escapeXss(value: string): string {
  return value.replace(/[&<>"'/]/g, (char) => XSS_MAP[char] || char);
}

/** 객체 내 모든 문자열을 재귀적으로 이스케이프 */
export function sanitizeDeep(obj: unknown): unknown {
  if (typeof obj === 'string') return escapeXss(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeDeep);
  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
      result[key] = sanitizeDeep(val);
    }
    return result;
  }
  return obj;
}

// ─── SQL 인젝션 재귀 검사 ───────────────────────────────────────

/** 객체 내 모든 문자열을 재귀적으로 SQL 인젝션 검사 */
function checkSqlInjectionDeep(obj: unknown): boolean {
  if (typeof obj === 'string') return detectSqlInjection(obj);
  if (Array.isArray(obj)) return obj.some(checkSqlInjectionDeep);
  if (obj !== null && typeof obj === 'object') {
    return Object.values(obj as Record<string, unknown>).some(checkSqlInjectionDeep);
  }
  return false;
}

// ─── Zod 스키마 검증 팩토리 ─────────────────────────────────────

/**
 * Zod 스키마로 body를 검증하는 preHandler 팩토리.
 * Zod를 직접 import하지 않고 duck-typing으로 호환.
 */
export interface ZodLikeSchema {
  safeParse(data: unknown): { success: boolean; error?: { issues: Array<{ path: Array<string | number>; message: string }> } };
}

export function validateBody(schema: ZodLikeSchema) {
  return async function (request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const result = schema.safeParse(request.body);
    if (!result.success) {
      reply.status(400).send({
        error: '입력 데이터가 올바르지 않습니다.',
        details: result.error?.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      });
    }
  };
}

// ─── 전역 입력 검증 미들웨어 ────────────────────────────────────

/**
 * 전역 preHandler: 요청 크기 + SQL 인젝션 + XSS 이스케이프
 * GET 요청은 body가 없으므로 query만 검사한다.
 */
export async function inputValidatorMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  // 1) 요청 크기 제한 (Content-Length 기반)
  const contentLength = Number(request.headers['content-length'] || 0);
  if (contentLength > MAX_BODY_BYTES) {
    reply.status(413).send({
      error: '요청 본문이 너무 큽니다.',
      maxBytes: MAX_BODY_BYTES,
    });
    return;
  }

  // 2) SQL 인젝션 감지 (body + query)
  if (request.body && checkSqlInjectionDeep(request.body)) {
    reply.status(400).send({ error: '잠재적으로 위험한 입력이 감지되었습니다.' });
    return;
  }
  if (request.query && checkSqlInjectionDeep(request.query)) {
    reply.status(400).send({ error: '잠재적으로 위험한 입력이 감지되었습니다.' });
    return;
  }

  // 3) XSS 이스케이프 (body 내 문자열)
  if (request.body && typeof request.body === 'object') {
    (request as unknown as Record<string, unknown>).body = sanitizeDeep(request.body);
  }
}
