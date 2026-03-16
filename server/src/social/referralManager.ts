/**
 * referralManager.ts — 레퍼럴 시스템 (P12-04)
 *
 * 초대 코드 생성/추적/보상. 초대자+피초대자 양측 보상.
 * Prisma 모델: ReferralCode, ReferralReward
 */
import { prisma } from '../db';
import crypto from 'crypto';

// ─── 타입 정의 ──────────────────────────────────────────────────

export interface ReferralCodeInfo {
  code: string;
  ownerId: string;
  usedCount: number;
  maxUses: number;
  isActive: boolean;
  createdAt: string;
  expiresAt: string | null;
}

export interface ReferralRewardInfo {
  id: string;
  referrerId: string;
  referredId: string;
  rewardType: string;
  amount: number;
  claimed: boolean;
  claimedAt: string | null;
}

export interface RedeemResult {
  success: boolean;
  message: string;
  referrerReward?: ReferralRewardInfo;
  referredReward?: ReferralRewardInfo;
}

// ─── 상수 ───────────────────────────────────────────────────────

const CODE_LENGTH = 8;
const DEFAULT_MAX_USES = 50;
const DEFAULT_EXPIRY_DAYS = 90;

/** 보상 테이블 */
const REFERRAL_REWARDS = {
  referrer: { type: 'diamond', amount: 300 },   // 초대자: 다이아 300
  referred: { type: 'diamond', amount: 500 },   // 피초대자: 다이아 500 (신규 우대)
} as const;

/** 마일스톤 보상 (누적 초대 수 기반) */
const MILESTONE_REWARDS: Array<{ count: number; type: string; amount: number; label: string }> = [
  { count: 5,   type: 'diamond',      amount: 1000,  label: '초대 5명 달성' },
  { count: 10,  type: 'diamond',      amount: 3000,  label: '초대 10명 달성' },
  { count: 25,  type: 'cosmetic_box', amount: 1,     label: '초대 25명 달성 (코스메틱 상자)' },
  { count: 50,  type: 'premium_pass', amount: 1,     label: '초대 50명 달성 (프리미엄 패스)' },
];

// ═══════════════════════════════════════════════════════════════
//  초대 코드 관리
// ═══════════════════════════════════════════════════════════════

/** 초대 코드 생성 */
export async function createReferralCode(
  userId: string,
  options?: { maxUses?: number; expiryDays?: number },
): Promise<ReferralCodeInfo> {
  // 사용자당 활성 코드 1개 제한
  const existing = await prisma.referralCode.findFirst({
    where: { ownerId: userId, isActive: true },
  });
  if (existing) {
    return toCodeInfo(existing);
  }

  const code = generateCode();
  const maxUses = options?.maxUses || DEFAULT_MAX_USES;
  const expiryDays = options?.expiryDays || DEFAULT_EXPIRY_DAYS;
  const expiresAt = new Date(Date.now() + expiryDays * 86400000);

  const created = await prisma.referralCode.create({
    data: {
      code,
      ownerId: userId,
      usedCount: 0,
      maxUses,
      isActive: true,
      expiresAt,
    },
  });

  console.log(`[Referral] 코드 생성: ${code} (owner: ${userId})`);
  return toCodeInfo(created);
}

/** 초대 코드 조회 */
export async function getReferralCode(code: string): Promise<ReferralCodeInfo | null> {
  const found = await prisma.referralCode.findUnique({ where: { code } });
  return found ? toCodeInfo(found) : null;
}

/** 사용자의 활성 코드 조회 */
export async function getUserCode(userId: string): Promise<ReferralCodeInfo | null> {
  const found = await prisma.referralCode.findFirst({
    where: { ownerId: userId, isActive: true },
  });
  return found ? toCodeInfo(found) : null;
}

// ═══════════════════════════════════════════════════════════════
//  코드 사용 (레퍼럴 적용)
// ═══════════════════════════════════════════════════════════════

/** 초대 코드 사용 — 회원가입 시 호출 */
export async function redeemReferralCode(
  code: string,
  newUserId: string,
): Promise<RedeemResult> {
  const referralCode = await prisma.referralCode.findUnique({ where: { code } });

  // 검증
  if (!referralCode) {
    return { success: false, message: '존재하지 않는 초대 코드입니다.' };
  }
  if (!referralCode.isActive) {
    return { success: false, message: '비활성화된 초대 코드입니다.' };
  }
  if (referralCode.expiresAt && referralCode.expiresAt < new Date()) {
    return { success: false, message: '만료된 초대 코드입니다.' };
  }
  if (referralCode.usedCount >= referralCode.maxUses) {
    return { success: false, message: '사용 횟수가 초과된 초대 코드입니다.' };
  }
  if (referralCode.ownerId === newUserId) {
    return { success: false, message: '자신의 초대 코드는 사용할 수 없습니다.' };
  }

  // 중복 사용 체크
  const alreadyUsed = await prisma.referralReward.findFirst({
    where: { referredId: newUserId },
  });
  if (alreadyUsed) {
    return { success: false, message: '이미 초대 코드를 사용한 계정입니다.' };
  }

  // 트랜잭션: 사용 카운트 증가 + 양측 보상 생성
  const [_updated, referrerReward, referredReward] = await prisma.$transaction([
    prisma.referralCode.update({
      where: { code },
      data: { usedCount: { increment: 1 } },
    }),
    prisma.referralReward.create({
      data: {
        referrerId: referralCode.ownerId,
        referredId: newUserId,
        codeUsed: code,
        rewardType: REFERRAL_REWARDS.referrer.type,
        amount: REFERRAL_REWARDS.referrer.amount,
        side: 'referrer',
        claimed: false,
      },
    }),
    prisma.referralReward.create({
      data: {
        referrerId: referralCode.ownerId,
        referredId: newUserId,
        codeUsed: code,
        rewardType: REFERRAL_REWARDS.referred.type,
        amount: REFERRAL_REWARDS.referred.amount,
        side: 'referred',
        claimed: false,
      },
    }),
  ]);

  // 마일스톤 체크
  await checkMilestones(referralCode.ownerId);

  console.log(`[Referral] 코드 사용: ${code} → 신규 ${newUserId} (초대자: ${referralCode.ownerId})`);
  return {
    success: true,
    message: '초대 코드가 적용되었습니다!',
    referrerReward: toRewardInfo(referrerReward),
    referredReward: toRewardInfo(referredReward),
  };
}

// ═══════════════════════════════════════════════════════════════
//  보상 관리
// ═══════════════════════════════════════════════════════════════

/** 보상 수령 */
export async function claimReward(rewardId: string, userId: string): Promise<boolean> {
  const reward = await prisma.referralReward.findUnique({ where: { id: rewardId } });
  if (!reward || reward.claimed) return false;

  // 수령 권한 체크
  const isOwner =
    (reward.side === 'referrer' && reward.referrerId === userId) ||
    (reward.side === 'referred' && reward.referredId === userId);
  if (!isOwner) return false;

  await prisma.referralReward.update({
    where: { id: rewardId },
    data: { claimed: true, claimedAt: new Date() },
  });

  // P14: 실제 재화 지급 연동 (currencyManager.addCurrency) — 결제/재화 시스템 통합 시 구현
  console.log(`[Referral] 보상 수령: ${rewardId} (${reward.rewardType} x${reward.amount})`);
  return true;
}

/** 사용자 보상 목록 */
export async function getUserRewards(userId: string): Promise<ReferralRewardInfo[]> {
  const rewards = await prisma.referralReward.findMany({
    where: {
      OR: [
        { referrerId: userId, side: 'referrer' },
        { referredId: userId, side: 'referred' },
      ],
    },
    orderBy: { createdAt: 'desc' },
  });
  return rewards.map(toRewardInfo);
}

/** 초대 통계 */
export async function getReferralStats(userId: string) {
  const code = await prisma.referralCode.findFirst({
    where: { ownerId: userId, isActive: true },
  });

  const totalReferred = await prisma.referralReward.count({
    where: { referrerId: userId, side: 'referrer' },
  });

  const unclaimedRewards = await prisma.referralReward.count({
    where: {
      OR: [
        { referrerId: userId, side: 'referrer', claimed: false },
        { referredId: userId, side: 'referred', claimed: false },
      ],
    },
  });

  return {
    code: code?.code || null,
    totalReferred,
    unclaimedRewards,
    nextMilestone: MILESTONE_REWARDS.find((m) => m.count > totalReferred) || null,
  };
}

// ─── 마일스톤 체크 ──────────────────────────────────────────────

async function checkMilestones(userId: string): Promise<void> {
  const totalReferred = await prisma.referralReward.count({
    where: { referrerId: userId, side: 'referrer' },
  });

  for (const milestone of MILESTONE_REWARDS) {
    if (totalReferred === milestone.count) {
      // 마일스톤 보상 생성
      await prisma.referralReward.create({
        data: {
          referrerId: userId,
          referredId: userId, // 마일스톤은 자기 자신
          codeUsed: 'MILESTONE',
          rewardType: milestone.type,
          amount: milestone.amount,
          side: 'milestone',
          claimed: false,
        },
      });
      console.log(`[Referral] 마일스톤 달성: ${userId} → ${milestone.label}`);
    }
  }
}

// ─── 유틸 ───────────────────────────────────────────────────────

function generateCode(): string {
  return crypto.randomBytes(CODE_LENGTH / 2).toString('hex').toUpperCase();
}

function toCodeInfo(row: any): ReferralCodeInfo {
  return {
    code: row.code,
    ownerId: row.ownerId,
    usedCount: row.usedCount,
    maxUses: row.maxUses,
    isActive: row.isActive,
    createdAt: row.createdAt?.toISOString?.() || row.createdAt,
    expiresAt: row.expiresAt?.toISOString?.() || row.expiresAt,
  };
}

function toRewardInfo(row: any): ReferralRewardInfo {
  return {
    id: row.id,
    referrerId: row.referrerId,
    referredId: row.referredId,
    rewardType: row.rewardType,
    amount: row.amount,
    claimed: row.claimed,
    claimedAt: row.claimedAt?.toISOString?.() || row.claimedAt,
  };
}
