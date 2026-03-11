/**
 * 어드민 감사 로그 — 모든 관리자 액션을 자동 기록
 * P4-07: 어드민 대시보드
 */
import { Prisma } from '@prisma/client';
import { prisma } from '../db';

/** 감사 로그 생성 파라미터 */
export interface AuditLogParams {
  adminId: string;
  action: string;       // user_ban, user_unban, item_grant, announcement_create 등
  targetType: string;    // user, item, announcement, event
  targetId?: string;
  details?: Prisma.InputJsonValue;
  ip?: string;
}

/**
 * 감사 로그를 DB에 기록한다.
 * 실패 시 로그만 남기고 요청 흐름은 중단하지 않는다 (fire-and-forget 가능).
 */
export async function writeAuditLog(params: AuditLogParams): Promise<void> {
  try {
    await prisma.adminAuditLog.create({
      data: {
        adminId: params.adminId,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId ?? null,
        details: params.details ?? undefined,
        ip: params.ip ?? null,
      },
    });
  } catch (err) {
    // 감사 로그 실패가 비즈니스 로직을 중단시켜서는 안 된다
    console.error('[AuditLogger] 감사 로그 기록 실패:', err);
  }
}

/**
 * 감사 로그 조회 (필터: action 타입, 날짜 범위, 페이지네이션)
 */
export async function queryAuditLogs(opts: {
  action?: string;
  adminId?: string;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}) {
  const page = opts.page ?? 1;
  const limit = Math.min(opts.limit ?? 50, 200);
  const where: Record<string, unknown> = {};

  if (opts.action) where.action = opts.action;
  if (opts.adminId) where.adminId = opts.adminId;
  if (opts.from || opts.to) {
    const createdAt: Record<string, Date> = {};
    if (opts.from) createdAt.gte = opts.from;
    if (opts.to) createdAt.lte = opts.to;
    where.createdAt = createdAt;
  }

  const [logs, total] = await Promise.all([
    prisma.adminAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.adminAuditLog.count({ where }),
  ]);

  return { logs, total, page, limit, totalPages: Math.ceil(total / limit) };
}
