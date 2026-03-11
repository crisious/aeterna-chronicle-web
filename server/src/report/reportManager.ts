/**
 * P6-12: 신고/제재 시스템 — 신고 접수, GM 검토 큐, 제재 적용/해제
 * 신고 타입: harassment, cheating, botting, inappropriate_name, spam, other
 * 제재 타입: warn, mute, ban (기간별 단계)
 */
import { prisma } from '../db';

// ─── 타입 정의 ──────────────────────────────────────────────────

/** 신고 유형 */
export type ReportType =
  | 'harassment'
  | 'cheating'
  | 'botting'
  | 'inappropriate_name'
  | 'spam'
  | 'other';

/** 신고 상태 */
export type ReportStatus = 'pending' | 'reviewing' | 'resolved' | 'dismissed';

/** 제재 액션 (경고 → 1시간 뮤트 → 24시간 뮤트 → 7일 밴 → 30일 밴 → 영구 밴) */
export type SanctionAction =
  | 'warn'
  | 'mute_1h'
  | 'mute_24h'
  | 'ban_7d'
  | 'ban_30d'
  | 'ban_permanent';

/** 제재 타입 (대분류) */
export type SanctionType = 'warn' | 'mute' | 'ban';

/** 제재 액션 → 대분류/기간(분) 매핑 */
const ACTION_MAP: Record<SanctionAction, { type: SanctionType; durationMin: number | null }> = {
  warn:          { type: 'warn', durationMin: null },
  mute_1h:       { type: 'mute', durationMin: 60 },
  mute_24h:      { type: 'mute', durationMin: 1440 },
  ban_7d:        { type: 'ban',  durationMin: 10080 },
  ban_30d:       { type: 'ban',  durationMin: 43200 },
  ban_permanent: { type: 'ban',  durationMin: null },
};

// ─── 신고 접수 ──────────────────────────────────────────────────

export interface CreateReportInput {
  reporterId: string;
  targetId: string;
  type: ReportType;
  description: string;
  evidence?: Record<string, unknown> | null; // 스크린샷 URL, 채팅 로그 등
}

/**
 * 유저 신고를 접수한다.
 * 동일 신고자→동일 대상의 pending 건이 이미 있으면 중복 방지.
 */
export async function createReport(input: CreateReportInput) {
  // 중복 신고 방지
  const existing = await prisma.report.findFirst({
    where: {
      reporterId: input.reporterId,
      targetId: input.targetId,
      status: 'pending',
    },
  });
  if (existing) {
    return { duplicate: true, report: existing };
  }

  const report = await prisma.report.create({
    data: {
      reporterId: input.reporterId,
      targetId: input.targetId,
      type: input.type,
      description: input.description,
      evidence: input.evidence ? JSON.parse(JSON.stringify(input.evidence)) as typeof undefined : undefined,
      status: 'pending',
    },
  });
  return { duplicate: false, report };
}

// ─── GM 검토 큐 ─────────────────────────────────────────────────

export interface ReportQueueFilter {
  status?: ReportStatus;
  type?: ReportType;
  page?: number;
  limit?: number;
}

/** GM 검토 큐 — 필터/페이징 지원 */
export async function getReportQueue(filter: ReportQueueFilter = {}) {
  const page = filter.page ?? 1;
  const limit = Math.min(filter.limit ?? 20, 100);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (filter.status) where['status'] = filter.status;
  if (filter.type) where['type'] = filter.type;

  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.report.count({ where }),
  ]);

  return { reports, total, page, limit, totalPages: Math.ceil(total / limit) };
}

// ─── 신고 검토 (제재 적용) ──────────────────────────────────────

export interface ReviewReportInput {
  reportId: string;
  reviewerId: string;
  action: SanctionAction | null; // null = dismissed (제재 없이 기각)
  reviewNote?: string;
}

/**
 * 신고를 검토하고 제재를 적용한다.
 * action이 null이면 기각(dismissed), 아니면 resolved + 제재 생성.
 */
export async function reviewReport(input: ReviewReportInput) {
  const report = await prisma.report.findUnique({ where: { id: input.reportId } });
  if (!report) throw new Error('신고를 찾을 수 없습니다.');
  if (report.status === 'resolved' || report.status === 'dismissed') {
    throw new Error('이미 처리된 신고입니다.');
  }

  const now = new Date();

  if (!input.action) {
    // 기각 처리
    const updated = await prisma.report.update({
      where: { id: input.reportId },
      data: {
        status: 'dismissed',
        reviewerId: input.reviewerId,
        reviewNote: input.reviewNote ?? null,
        resolvedAt: now,
      },
    });
    return { report: updated, sanction: null };
  }

  // 제재 적용
  const mapping = ACTION_MAP[input.action];
  const expiresAt = mapping.durationMin
    ? new Date(now.getTime() + mapping.durationMin * 60_000)
    : null;

  const [updatedReport, sanction] = await prisma.$transaction([
    prisma.report.update({
      where: { id: input.reportId },
      data: {
        status: 'resolved',
        reviewerId: input.reviewerId,
        action: input.action,
        reviewNote: input.reviewNote ?? null,
        resolvedAt: now,
      },
    }),
    prisma.sanction.create({
      data: {
        userId: report.targetId,
        type: mapping.type,
        reason: `신고 #${report.id} (${report.type}): ${input.reviewNote || report.description}`,
        duration: mapping.durationMin,
        issuedBy: input.reviewerId,
        isActive: true,
        expiresAt,
      },
    }),
  ]);

  return { report: updatedReport, sanction };
}

// ─── 제재 조회 ──────────────────────────────────────────────────

/** 특정 유저의 제재 이력 조회 (활성/비활성 포함) */
export async function getUserSanctions(userId: string, activeOnly = false) {
  const where: Record<string, unknown> = { userId };
  if (activeOnly) where['isActive'] = true;

  return prisma.sanction.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
}

/** 유저의 현재 활성 밴/뮤트 확인 — 로그인/채팅 차단 시 사용 */
export async function getActiveSanction(userId: string, type?: SanctionType) {
  const where: Record<string, unknown> = { userId, isActive: true };
  if (type) where['type'] = type;

  const sanctions = await prisma.sanction.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  // 만료된 제재 자동 해제
  const now = new Date();
  const active: typeof sanctions = [];

  for (const s of sanctions) {
    if (s.expiresAt && s.expiresAt <= now) {
      await prisma.sanction.update({
        where: { id: s.id },
        data: { isActive: false },
      });
    } else {
      active.push(s);
    }
  }

  return active.length > 0 ? active[0] : null;
}

// ─── 제재 해제 ──────────────────────────────────────────────────

/** 제재를 수동으로 해제한다 (GM 권한) */
export async function liftSanction(sanctionId: string, liftedBy: string) {
  const sanction = await prisma.sanction.findUnique({ where: { id: sanctionId } });
  if (!sanction) throw new Error('제재를 찾을 수 없습니다.');
  if (!sanction.isActive) throw new Error('이미 해제된 제재입니다.');

  return prisma.sanction.update({
    where: { id: sanctionId },
    data: {
      isActive: false,
      // 해제 사유를 reason에 추가
      reason: `${sanction.reason} [해제: ${liftedBy} @ ${new Date().toISOString()}]`,
    },
  });
}

// ─── 만료 제재 자동 해제 (크론/틱에서 호출) ─────────────────────

/** 만료된 모든 제재를 일괄 비활성화한다 */
export async function expireOverdueSanctions(): Promise<number> {
  const result = await prisma.sanction.updateMany({
    where: {
      isActive: true,
      expiresAt: { lte: new Date() },
    },
    data: { isActive: false },
  });
  return result.count;
}
