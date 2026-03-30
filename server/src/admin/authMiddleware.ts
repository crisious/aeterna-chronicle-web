/**
 * 어드민 권한 미들웨어 — Role 기반 접근 제어 + 감사 로그 자동 기록
 * P4-07: 어드민 대시보드
 */
import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { writeAuditLog } from './auditLogger';
import { prisma } from '../db';

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
  id: string;
  userId: string;
  email: string;
  role: string;
}

if (!process.env.JWT_ADMIN_SECRET) {
  throw new Error('FATAL: JWT_ADMIN_SECRET environment variable is not set. Server cannot start without it.');
}
const JWT_ADMIN_SECRET = process.env.JWT_ADMIN_SECRET;

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

    // 2. JWT 검증 + 디코딩 (admin 전용 시크릿 사용)
    let payload: AdminTokenPayload;
    try {
      payload = jwt.verify(token, JWT_ADMIN_SECRET) as AdminTokenPayload;
    } catch {
      reply.status(401).send({ error: '유효하지 않은 토큰입니다.' });
      return;
    }

    // 3. DB에서 실제 역할 조회 — JWT 페이로드만으로 역할을 신뢰하지 않음
    const dbUser = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { role: true, isBanned: true },
    });

    if (!dbUser) {
      reply.status(401).send({ error: '존재하지 않는 사용자입니다.' });
      return;
    }

    if (dbUser.isBanned) {
      reply.status(403).send({ error: '차단된 계정입니다.' });
      return;
    }

    // DB의 실제 역할로 덮어쓰기
    payload.role = dbUser.role;

    // 4. 역할 계층 체크
    const userLevel = ROLE_HIERARCHY[dbUser.role] ?? 0;
    const requiredLevel = ROLE_HIERARCHY[minRole] ?? 0;

    if (userLevel < requiredLevel) {
      reply.status(403).send({
        error: '권한이 부족합니다.',
        required: minRole,
        current: dbUser.role,
      });
      return;
    }

    // 5. 요청 객체에 어드민 정보 주입
    (request as FastifyRequest & { adminUser: AdminTokenPayload }).adminUser = payload;

    // 6. 감사 로그 비동기 기록 (fire-and-forget)
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

/** 어드민 전용 JWT 발급 — 반드시 JWT_ADMIN_SECRET으로 서명 */
export function generateAdminToken(payload: { userId: string; email: string; role: string }): string {
  return jwt.sign(payload, JWT_ADMIN_SECRET, { expiresIn: '1h' });
}
