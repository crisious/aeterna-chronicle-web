/**
 * 어드민 권한 미들웨어 — Role 기반 접근 제어 + 감사 로그 자동 기록
 * P4-07: 어드민 대시보드
 */
import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { writeAuditLog } from './auditLogger';

/** 역할 계층: 숫자가 클수록 높은 권한 */
const ROLE_HIERARCHY: Record<string, number> = {
  user: 0,
  moderator: 1,
  admin: 2,
  superadmin: 3,
};

export type AdminRole = 'moderator' | 'admin' | 'superadmin';

/** JWT 페이로드에서 추출할 사용자 정보 */
export interface AdminTokenPayload {
  userId: string;
  email: string;
  role: string;
}

const JWT_SECRET = process.env.JWT_SECRET || 'aeterna-chronicle-dev-secret';

/**
 * JWT를 검증하고 최소 권한을 확인하는 미들웨어 팩토리.
 * @param minRole 해당 엔드포인트에 접근하기 위한 최소 역할
 * @param auditAction 감사 로그에 기록할 액션 이름 (null이면 기록 안 함)
 */
export function requireAdmin(minRole: AdminRole, auditAction?: string) {
  return async function (request: FastifyRequest, reply: FastifyReply): Promise<void> {
    // 1. Authorization 헤더에서 Bearer 토큰 추출
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      reply.status(401).send({ error: '인증 토큰이 필요합니다.' });
      return;
    }

    const token = authHeader.slice(7);

    // 2. JWT 검증 + 디코딩
    let payload: AdminTokenPayload;
    try {
      payload = jwt.verify(token, JWT_SECRET) as AdminTokenPayload;
    } catch {
      reply.status(401).send({ error: '유효하지 않은 토큰입니다.' });
      return;
    }

    // 3. 역할 계층 체크
    const userLevel = ROLE_HIERARCHY[payload.role] ?? 0;
    const requiredLevel = ROLE_HIERARCHY[minRole] ?? 0;

    if (userLevel < requiredLevel) {
      reply.status(403).send({
        error: '권한이 부족합니다.',
        required: minRole,
        current: payload.role,
      });
      return;
    }

    // 4. 요청 객체에 어드민 정보 주입
    (request as FastifyRequest & { adminUser: AdminTokenPayload }).adminUser = payload;

    // 5. 감사 로그 비동기 기록 (fire-and-forget)
    if (auditAction) {
      const ip = request.ip;
      writeAuditLog({
        adminId: payload.userId,
        action: auditAction,
        targetType: 'endpoint',
        details: {
          method: request.method,
          url: request.url,
          params: request.params as Record<string, string>,
        },
        ip,
      }).catch(() => { /* 감사 로그 실패는 무시 */ });
    }
  };
}

/**
 * 요청 객체에서 adminUser를 안전하게 추출하는 헬퍼.
 */
export function getAdminUser(request: FastifyRequest): AdminTokenPayload {
  return (request as FastifyRequest & { adminUser: AdminTokenPayload }).adminUser;
}
