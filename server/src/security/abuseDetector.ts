/**
 * P9-14: 어뷰징 탐지 시스템
 * - 매크로 탐지: 입력 패턴 분석 (일정 간격 반복 클릭)
 * - 봇 탐지: 이상 행동 분석 (24h 연속 접속, 비현실적 수익)
 * - 자동 제재: 경고 → 24시간 정지 → 7일 정지 → 영구 정지
 */

import { prisma } from '../db';
import { writeAuditLog } from '../admin/auditLogger';

// ─── 타입 정의 ──────────────────────────────────────────────────

export enum AbuseType {
  MACRO = 'MACRO',
  BOT = 'BOT',
  SPEED_HACK = 'SPEED_HACK',
  GOLD_EXPLOIT = 'GOLD_EXPLOIT',
  PACKET_TAMPERING = 'PACKET_TAMPERING',
}

export enum SanctionLevel {
  WARNING = 'WARNING',              // 경고
  SUSPEND_24H = 'SUSPEND_24H',     // 24시간 정지
  SUSPEND_7D = 'SUSPEND_7D',       // 7일 정지
  PERMANENT_BAN = 'PERMANENT_BAN', // 영구 정지
}

export interface InputEvent {
  userId: string;
  action: string;
  timestamp: number; // ms
  x?: number;
  y?: number;
  metadata?: Record<string, unknown>;
}

export interface BehaviorSnapshot {
  userId: string;
  sessionDurationMs: number;
  goldEarnedPerHour: number;
  actionsPerMinute: number;
  uniqueActionTypes: number;
  loginStreak: number; // 연속 접속 시간(h)
}

export interface AbuseDetectionResult {
  detected: boolean;
  type?: AbuseType;
  confidence: number; // 0~1
  evidence: string;
}

interface UserSanctionHistory {
  count: number;
  lastLevel: SanctionLevel | null;
}

// ─── 설정 상수 ──────────────────────────────────────────────────

const CONFIG = {
  /** 매크로 탐지: 연속 입력 간격 표준편차 임계값 (ms) */
  MACRO_INTERVAL_STD_THRESHOLD: 15,
  /** 매크로 탐지: 최소 분석 샘플 수 */
  MACRO_MIN_SAMPLES: 20,
  /** 매크로 탐지: 동일 좌표 반복 비율 임계값 */
  MACRO_SAME_POS_RATIO: 0.85,

  /** 봇 탐지: 연속 접속 임계값 (시간) */
  BOT_SESSION_HOURS_THRESHOLD: 20,
  /** 봇 탐지: 시간당 골드 수익 상한 (일반 유저 대비) */
  BOT_GOLD_PER_HOUR_THRESHOLD: 50000,
  /** 봇 탐지: 분당 액션 상한 */
  BOT_APM_THRESHOLD: 300,
  /** 봇 탐지: 최소 고유 액션 유형 (너무 적으면 봇 의심) */
  BOT_MIN_UNIQUE_ACTIONS: 3,

  /** 제재 에스컬레이션 윈도우 (일) */
  ESCALATION_WINDOW_DAYS: 30,
} as const;

// ─── 매크로 탐지 ────────────────────────────────────────────────

/**
 * 입력 이벤트 시퀀스에서 매크로 패턴을 탐지한다.
 * - 일정 간격 반복 클릭 (interval std < threshold)
 * - 동일 좌표 반복 비율 초과
 */
export function detectMacro(events: InputEvent[]): AbuseDetectionResult {
  if (events.length < CONFIG.MACRO_MIN_SAMPLES) {
    return { detected: false, confidence: 0, evidence: 'insufficient_samples' };
  }

  // 1) 입력 간격 분석
  const intervals: number[] = [];
  for (let i = 1; i < events.length; i++) {
    intervals.push(events[i].timestamp - events[i - 1].timestamp);
  }

  const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const variance = intervals.reduce((sum, v) => sum + (v - mean) ** 2, 0) / intervals.length;
  const std = Math.sqrt(variance);

  // 2) 동일 좌표 반복 비율
  const positionCounts = new Map<string, number>();
  for (const e of events) {
    const key = `${e.x ?? 0},${e.y ?? 0}`;
    positionCounts.set(key, (positionCounts.get(key) ?? 0) + 1);
  }
  const maxPosCount = Math.max(...positionCounts.values());
  const samePosRatio = maxPosCount / events.length;

  // 3) 판정
  const intervalScore = std < CONFIG.MACRO_INTERVAL_STD_THRESHOLD ? 0.6 : 0;
  const positionScore = samePosRatio > CONFIG.MACRO_SAME_POS_RATIO ? 0.4 : 0;
  const confidence = intervalScore + positionScore;

  if (confidence >= 0.6) {
    return {
      detected: true,
      type: AbuseType.MACRO,
      confidence,
      evidence: `interval_std=${std.toFixed(2)}ms, same_pos_ratio=${(samePosRatio * 100).toFixed(1)}%, mean_interval=${mean.toFixed(1)}ms`,
    };
  }

  return { detected: false, confidence, evidence: `interval_std=${std.toFixed(2)}ms, same_pos_ratio=${(samePosRatio * 100).toFixed(1)}%` };
}

// ─── 봇 탐지 ────────────────────────────────────────────────────

/**
 * 행동 스냅샷에서 봇 패턴을 분석한다.
 * - 24시간 이상 연속 접속
 * - 비현실적 시간당 수익
 * - 비정상 APM + 낮은 액션 다양성
 */
export function detectBot(snapshot: BehaviorSnapshot): AbuseDetectionResult {
  let confidence = 0;
  const evidenceParts: string[] = [];

  // 연속 접속 시간
  if (snapshot.loginStreak >= CONFIG.BOT_SESSION_HOURS_THRESHOLD) {
    confidence += 0.35;
    evidenceParts.push(`session=${snapshot.loginStreak}h`);
  }

  // 비현실적 수익
  if (snapshot.goldEarnedPerHour > CONFIG.BOT_GOLD_PER_HOUR_THRESHOLD) {
    confidence += 0.25;
    evidenceParts.push(`gold/h=${snapshot.goldEarnedPerHour}`);
  }

  // 비정상 APM
  if (snapshot.actionsPerMinute > CONFIG.BOT_APM_THRESHOLD) {
    confidence += 0.2;
    evidenceParts.push(`apm=${snapshot.actionsPerMinute}`);
  }

  // 낮은 액션 다양성
  if (snapshot.uniqueActionTypes < CONFIG.BOT_MIN_UNIQUE_ACTIONS) {
    confidence += 0.2;
    evidenceParts.push(`unique_actions=${snapshot.uniqueActionTypes}`);
  }

  if (confidence >= 0.5) {
    return {
      detected: true,
      type: AbuseType.BOT,
      confidence: Math.min(confidence, 1),
      evidence: evidenceParts.join(', '),
    };
  }

  return { detected: false, confidence, evidence: evidenceParts.join(', ') || 'normal_behavior' };
}

// ─── 자동 제재 에스컬레이션 ─────────────────────────────────────

/**
 * 유저의 제재 이력을 기반으로 다음 제재 레벨을 결정한다.
 * 경고 → 24시간 정지 → 7일 정지 → 영구 정지
 */
export function escalateSanction(history: UserSanctionHistory): SanctionLevel {
  if (history.count === 0 || history.lastLevel === null) {
    return SanctionLevel.WARNING;
  }

  switch (history.lastLevel) {
    case SanctionLevel.WARNING:
      return SanctionLevel.SUSPEND_24H;
    case SanctionLevel.SUSPEND_24H:
      return SanctionLevel.SUSPEND_7D;
    case SanctionLevel.SUSPEND_7D:
    case SanctionLevel.PERMANENT_BAN:
      return SanctionLevel.PERMANENT_BAN;
    default:
      return SanctionLevel.WARNING;
  }
}

/**
 * 제재 레벨에 따른 정지 기간(ms)을 반환한다. 영구는 null.
 */
export function getSuspensionDuration(level: SanctionLevel): number | null {
  switch (level) {
    case SanctionLevel.WARNING:
      return 0;
    case SanctionLevel.SUSPEND_24H:
      return 24 * 60 * 60 * 1000;
    case SanctionLevel.SUSPEND_7D:
      return 7 * 24 * 60 * 60 * 1000;
    case SanctionLevel.PERMANENT_BAN:
      return null; // 영구
  }
}

// ─── 통합 분석 파이프라인 ───────────────────────────────────────

export interface AbuseAnalysisInput {
  userId: string;
  inputEvents?: InputEvent[];
  behaviorSnapshot?: BehaviorSnapshot;
}

export interface AbuseAnalysisOutput {
  userId: string;
  detections: AbuseDetectionResult[];
  recommendedSanction: SanctionLevel | null;
  shouldAutoSanction: boolean;
}

/**
 * 전체 어뷰징 분석 파이프라인.
 * 매크로 + 봇 탐지를 수행하고, 탐지 시 에스컬레이션 레벨을 산출한다.
 */
export async function analyzeAbuse(input: AbuseAnalysisInput): Promise<AbuseAnalysisOutput> {
  const detections: AbuseDetectionResult[] = [];

  if (input.inputEvents && input.inputEvents.length > 0) {
    detections.push(detectMacro(input.inputEvents));
  }

  if (input.behaviorSnapshot) {
    detections.push(detectBot(input.behaviorSnapshot));
  }

  const positiveDetections = detections.filter((d) => d.detected);

  if (positiveDetections.length === 0) {
    return {
      userId: input.userId,
      detections,
      recommendedSanction: null,
      shouldAutoSanction: false,
    };
  }

  // 제재 이력 조회 (Prisma)
  const recentSanctions = await prisma.sanction.findMany({
    where: {
      userId: input.userId,
      createdAt: {
        gte: new Date(Date.now() - CONFIG.ESCALATION_WINDOW_DAYS * 24 * 60 * 60 * 1000),
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 1,
  });

  const history: UserSanctionHistory = {
    count: recentSanctions.length,
    lastLevel: recentSanctions[0]?.level as SanctionLevel | null ?? null,
  };

  const recommendedSanction = escalateSanction(history);
  const maxConfidence = Math.max(...positiveDetections.map((d) => d.confidence));

  return {
    userId: input.userId,
    detections,
    recommendedSanction,
    shouldAutoSanction: maxConfidence >= 0.7,
  };
}

// ─── 제재 실행 ──────────────────────────────────────────────────

/**
 * 제재를 실행한다. DB 기록 + 감사 로그 + 유저 상태 업데이트.
 */
export async function applySanction(
  userId: string,
  level: SanctionLevel,
  reason: string,
  detectionEvidence: string,
  adminId?: string,
): Promise<void> {
  const duration = getSuspensionDuration(level);
  const expiresAt = duration === null ? null : duration === 0 ? null : new Date(Date.now() + duration);

  // 제재 기록 생성
  await prisma.sanction.create({
    data: {
      userId,
      level,
      reason,
      evidence: detectionEvidence,
      expiresAt,
      appliedBy: adminId ?? 'SYSTEM_AUTO',
    },
  });

  // 유저 상태 업데이트
  if (level === SanctionLevel.PERMANENT_BAN) {
    await prisma.user.update({
      where: { id: userId },
      data: { isBanned: true, banReason: reason },
    });
  } else if (level === SanctionLevel.SUSPEND_24H || level === SanctionLevel.SUSPEND_7D) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        isBanned: true,
        banReason: reason,
        banExpiresAt: expiresAt,
      },
    });
  }

  // 감사 로그
  await writeAuditLog({
    adminId: adminId ?? 'SYSTEM',
    action: 'SANCTION_APPLIED',
    targetId: userId,
    details: { level, reason, evidence: detectionEvidence, expiresAt: expiresAt?.toISOString() ?? 'permanent' },
  });
}

// ─── 어드민 API용 헬퍼 ──────────────────────────────────────────

/** 유저별 제재 이력 조회 */
export async function getUserSanctions(userId: string) {
  return prisma.sanction.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

/** 활성 제재 목록 (관리자 대시보드) */
export async function getActiveSanctions(page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.sanction.findMany({
      where: {
        OR: [
          { expiresAt: null },           // 영구 정지
          { expiresAt: { gt: new Date() } }, // 아직 유효한 정지
        ],
      },
      include: { user: { select: { id: true, username: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.sanction.count({
      where: {
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    }),
  ]);
  return { items, total, page, limit };
}

/** 제재 해제 (어드민) */
export async function revokeSanction(sanctionId: string, adminId: string, reason: string): Promise<void> {
  const sanction = await prisma.sanction.update({
    where: { id: sanctionId },
    data: { revokedAt: new Date(), revokedBy: adminId, revokeReason: reason },
  });

  // 유저 ban 해제 (다른 활성 제재가 없을 경우)
  const otherActive = await prisma.sanction.count({
    where: {
      userId: sanction.userId,
      id: { not: sanctionId },
      revokedAt: null,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
  });

  if (otherActive === 0) {
    await prisma.user.update({
      where: { id: sanction.userId },
      data: { isBanned: false, banReason: null, banExpiresAt: null },
    });
  }

  await writeAuditLog({
    adminId,
    action: 'SANCTION_REVOKED',
    targetId: sanction.userId,
    details: { sanctionId, reason },
  });
}

export default {
  detectMacro,
  detectBot,
  escalateSanction,
  analyzeAbuse,
  applySanction,
  getUserSanctions,
  getActiveSanctions,
  revokeSanction,
};
