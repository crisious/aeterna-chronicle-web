/**
 * P6-01 시즌 패스 엔진
 * - 시즌 생성/활성화/종료 관리
 * - 경험치 획득 (퀘스트/던전/PvP/일일미션 → 시즌 XP)
 * - 보상 단계 해금 (50단계, 무료 30 + 프리미엄 50)
 * - 보상 수령 (아이템/골드/크리스탈/코스메틱)
 * - 시즌 종료 시 미수령 보상 우편 발송
 * - 시즌 패스 구매 (프리미엄 전환)
 */

import { prisma } from '../db';
import { sendSystemMail } from '../social/mailSystem';

// ─── 상수 ───────────────────────────────────────────────────────

/** 최대 시즌 레벨 */
const MAX_SEASON_LEVEL = 50;

/** 무료 트랙 최대 레벨 */
const FREE_TRACK_MAX_LEVEL = 30;

/** 프리미엄 패스 가격 (크리스탈) */
const PREMIUM_PASS_PRICE = 980;

/** XP 소스별 기본 획득량 */
export const XP_SOURCES: Record<string, number> = {
  quest_complete: 100,
  dungeon_clear: 150,
  pvp_win: 80,
  pvp_loss: 30,
  daily_mission: 50,
  weekly_mission: 200,
  boss_kill: 120,
  achievement: 60,
};

// ─── 타입 ───────────────────────────────────────────────────────

/** 보상 엔트리 구조 (JSON 필드) */
export interface SeasonRewardEntry {
  level: number;
  reward: {
    type: 'gold' | 'crystal' | 'item' | 'cosmetic' | 'exp_booster' | 'title';
    id?: string;       // 아이템/코스메틱 ID
    amount?: number;   // 골드/크리스탈/부스터 수량
    name: string;      // 표시용 이름
  };
}

/** XP 획득 소스 */
export type XpSource = keyof typeof XP_SOURCES;

// ─── 시즌 관리 ──────────────────────────────────────────────────

/** 현재 활성 시즌 조회 */
export async function getCurrentSeason() {
  const now = new Date();
  return prisma.seasonPass.findFirst({
    where: {
      isActive: true,
      startDate: { lte: now },
      endDate: { gte: now },
    },
    orderBy: { season: 'desc' },
  });
}

/** 시즌 생성 */
export async function createSeason(params: {
  season: number;
  name: string;
  startDate: Date;
  endDate: Date;
  freeRewards: SeasonRewardEntry[];
  premiumRewards: SeasonRewardEntry[];
}) {
  return prisma.seasonPass.create({
    data: {
      season: params.season,
      name: params.name,
      startDate: params.startDate,
      endDate: params.endDate,
      freeRewards: JSON.parse(JSON.stringify(params.freeRewards)),
      premiumRewards: JSON.parse(JSON.stringify(params.premiumRewards)),
      isActive: true,
    },
  });
}

/** 시즌 종료 처리 — 미수령 보상 우편 발송 */
export async function endSeason(seasonId: string): Promise<{ processed: number; mailsSent: number }> {
  // 시즌 비활성화
  await prisma.seasonPass.update({
    where: { id: seasonId },
    data: { isActive: false },
  });

  const season = await prisma.seasonPass.findUnique({ where: { id: seasonId } });
  if (!season) return { processed: 0, mailsSent: 0 };

  const freeRewards = season.freeRewards as unknown as SeasonRewardEntry[];
  const premiumRewards = season.premiumRewards as unknown as SeasonRewardEntry[];

  // 모든 참가자의 미수령 보상 확인
  const allProgress = await prisma.seasonPassProgress.findMany({
    where: { seasonPassId: seasonId },
  });

  let mailsSent = 0;
  for (const progress of allProgress) {
    const claimedFree = progress.claimedFree as number[];
    const claimedPremium = progress.claimedPremium as number[];
    const unclaimedRewards: string[] = [];

    // 무료 트랙 미수령 보상
    for (const entry of freeRewards) {
      if (entry.level <= progress.level && !claimedFree.includes(entry.level)) {
        unclaimedRewards.push(`[무료 Lv.${entry.level}] ${entry.reward.name}`);
      }
    }

    // 프리미엄 트랙 미수령 보상 (프리미엄 유저만)
    if (progress.isPremium) {
      for (const entry of premiumRewards) {
        if (entry.level <= progress.level && !claimedPremium.includes(entry.level)) {
          unclaimedRewards.push(`[프리미엄 Lv.${entry.level}] ${entry.reward.name}`);
        }
      }
    }

    // 미수령 보상이 있으면 우편 발송
    if (unclaimedRewards.length > 0) {
      await sendSystemMail(
        progress.userId,
        `[시즌 ${season.season}] 미수령 보상 안내`,
        `시즌 "${season.name}" 종료로 미수령 보상 ${unclaimedRewards.length}건을 발송합니다.\n\n${unclaimedRewards.join('\n')}`,
        [], // 실제 아이템 첨부는 보상 타입별 처리 필요
      );
      mailsSent++;
    }
  }

  return { processed: allProgress.length, mailsSent };
}

// ─── 경험치 시스템 ──────────────────────────────────────────────

/** 레벨업 필요 경험치 (단계별 누진) */
export function requiredXpForLevel(level: number): number {
  // 1~10: 100 기본, 11~30: 150, 31~50: 200
  if (level <= 10) return 100;
  if (level <= 30) return 150;
  return 200;
}

/** 경험치 획득 + 레벨업 처리 */
export async function addSeasonXp(
  userId: string,
  source: XpSource,
  multiplier = 1,
): Promise<{
  xpGained: number;
  previousLevel: number;
  currentLevel: number;
  leveledUp: boolean;
  progress: { level: number; exp: number };
}> {
  const season = await getCurrentSeason();
  if (!season) throw new Error('현재 활성 시즌이 없습니다.');

  // 진행도 조회 또는 생성
  let progress = await prisma.seasonPassProgress.findUnique({
    where: { userId_seasonPassId: { userId, seasonPassId: season.id } },
  });

  if (!progress) {
    progress = await prisma.seasonPassProgress.create({
      data: { userId, seasonPassId: season.id },
    });
  }

  const baseXp = XP_SOURCES[source] ?? 50;
  const xpGained = Math.floor(baseXp * multiplier);
  let totalExp = progress.exp + xpGained;
  let currentLevel = progress.level;
  const previousLevel = currentLevel;

  // 레벨업 루프
  while (currentLevel < MAX_SEASON_LEVEL) {
    const needed = requiredXpForLevel(currentLevel + 1);
    if (totalExp >= needed) {
      totalExp -= needed;
      currentLevel++;
    } else {
      break;
    }
  }

  // 최대 레벨 도달 시 초과 XP 0으로 고정
  if (currentLevel >= MAX_SEASON_LEVEL) {
    totalExp = 0;
  }

  const updated = await prisma.seasonPassProgress.update({
    where: { userId_seasonPassId: { userId, seasonPassId: season.id } },
    data: { exp: totalExp, level: currentLevel },
  });

  return {
    xpGained,
    previousLevel,
    currentLevel: updated.level,
    leveledUp: currentLevel > previousLevel,
    progress: { level: updated.level, exp: updated.exp },
  };
}

// ─── 보상 수령 ──────────────────────────────────────────────────

/** 보상 수령 */
export async function claimReward(
  userId: string,
  level: number,
  track: 'free' | 'premium',
): Promise<{ reward: SeasonRewardEntry['reward'] }> {
  const season = await getCurrentSeason();
  if (!season) throw new Error('현재 활성 시즌이 없습니다.');

  const progress = await prisma.seasonPassProgress.findUnique({
    where: { userId_seasonPassId: { userId, seasonPassId: season.id } },
  });
  if (!progress) throw new Error('시즌 패스 진행 기록이 없습니다.');

  // 레벨 도달 확인
  if (progress.level < level) {
    throw new Error(`레벨 ${level}에 도달하지 못했습니다. (현재: ${progress.level})`);
  }

  // 무료 트랙 레벨 제한
  if (track === 'free' && level > FREE_TRACK_MAX_LEVEL) {
    throw new Error(`무료 트랙은 ${FREE_TRACK_MAX_LEVEL}단계까지만 보상이 있습니다.`);
  }

  // 프리미엄 트랙: 프리미엄 구매 필수
  if (track === 'premium' && !progress.isPremium) {
    throw new Error('프리미엄 패스를 구매해야 보상을 받을 수 있습니다.');
  }

  // 이미 수령 확인
  const claimedList = (track === 'free' ? progress.claimedFree : progress.claimedPremium) as number[];
  if (claimedList.includes(level)) {
    throw new Error(`레벨 ${level} ${track} 보상은 이미 수령했습니다.`);
  }

  // 보상 조회
  const rewardList = (track === 'free'
    ? season.freeRewards
    : season.premiumRewards) as unknown as SeasonRewardEntry[];
  const entry = rewardList.find((r) => r.level === level);
  if (!entry) throw new Error(`레벨 ${level}에 해당하는 ${track} 보상이 없습니다.`);

  // 수령 기록 업데이트
  const newClaimed = [...claimedList, level];
  const updateData = track === 'free'
    ? { claimedFree: newClaimed }
    : { claimedPremium: newClaimed };

  await prisma.seasonPassProgress.update({
    where: { userId_seasonPassId: { userId, seasonPassId: season.id } },
    data: updateData,
  });

  // 보상 지급 (골드/크리스탈 직접 지급)
  if (entry.reward.type === 'gold' && entry.reward.amount) {
    await prisma.user.update({
      where: { id: userId },
      data: { gold: { increment: entry.reward.amount } },
    });
  } else if (entry.reward.type === 'crystal' && entry.reward.amount) {
    await prisma.user.update({
      where: { id: userId },
      data: { crystal: { increment: entry.reward.amount } },
    });
  }
  // item, cosmetic, title 등은 별도 시스템 연동 필요

  return { reward: entry.reward };
}

// ─── 프리미엄 구매 ──────────────────────────────────────────────

/** 프리미엄 패스 구매 (크리스탈 차감) */
export async function purchasePremiumPass(userId: string): Promise<{ success: boolean }> {
  const season = await getCurrentSeason();
  if (!season) throw new Error('현재 활성 시즌이 없습니다.');

  // 유저 확인
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('유저를 찾을 수 없습니다.');

  // 진행도 조회 또는 생성
  let progress = await prisma.seasonPassProgress.findUnique({
    where: { userId_seasonPassId: { userId, seasonPassId: season.id } },
  });

  if (!progress) {
    progress = await prisma.seasonPassProgress.create({
      data: { userId, seasonPassId: season.id },
    });
  }

  if (progress.isPremium) {
    throw new Error('이미 프리미엄 패스를 보유하고 있습니다.');
  }

  // 크리스탈 잔액 확인
  if (user.crystal < PREMIUM_PASS_PRICE) {
    throw new Error(`크리스탈이 부족합니다. (보유: ${user.crystal}, 필요: ${PREMIUM_PASS_PRICE})`);
  }

  // 트랜잭션: 크리스탈 차감 + 프리미엄 전환
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { crystal: { decrement: PREMIUM_PASS_PRICE } },
    }),
    prisma.seasonPassProgress.update({
      where: { userId_seasonPassId: { userId, seasonPassId: season.id } },
      data: { isPremium: true },
    }),
  ]);

  return { success: true };
}

/** 시즌 패스 엔진 — 상수 내보내기 */
export { MAX_SEASON_LEVEL, FREE_TRACK_MAX_LEVEL, PREMIUM_PASS_PRICE };
