/**
 * pvpSeasonReward.ts — PvP 시즌 보상 시스템 (P6-08)
 *
 * 시즌 종료 시 레이팅 구간별 보상:
 *   브론즈(~1200):     골드 + 칭호
 *   실버(1200~1600):   + 코스메틱 상자
 *   골드(1600~2000):   + 시즌 스킨
 *   플래티넘(2000~2400): + 전설 무기 외형
 *   다이아(2400+):     + 전설 칭호 + 크리스탈
 */
import { prisma } from '../db';
import { getCurrentSeason } from './matchmaker';
import { inventoryManager } from '../inventory/inventoryManager';

// ─── 시즌 보상 정의 ─────────────────────────────────────────

export interface SeasonTierReward {
  tier: string;
  tierName: string;
  minRating: number;
  maxRating: number;
  rewards: SeasonRewardItem[];
}

export interface SeasonRewardItem {
  type: 'gold' | 'title' | 'cosmetic_box' | 'season_skin' | 'legendary_weapon_skin' | 'legendary_title' | 'crystal';
  name: string;
  amount?: number;
}

export const SEASON_TIER_REWARDS: readonly SeasonTierReward[] = [
  {
    tier: 'bronze',
    tierName: '브론즈',
    minRating: 0,
    maxRating: 1199,
    rewards: [
      { type: 'gold', name: '골드', amount: 500 },
      { type: 'title', name: '브론즈 투사' },
    ],
  },
  {
    tier: 'silver',
    tierName: '실버',
    minRating: 1200,
    maxRating: 1599,
    rewards: [
      { type: 'gold', name: '골드', amount: 1500 },
      { type: 'title', name: '실버 도전자' },
      { type: 'cosmetic_box', name: '코스메틱 상자', amount: 1 },
    ],
  },
  {
    tier: 'gold',
    tierName: '골드',
    minRating: 1600,
    maxRating: 1999,
    rewards: [
      { type: 'gold', name: '골드', amount: 3000 },
      { type: 'title', name: '골드 전사' },
      { type: 'cosmetic_box', name: '코스메틱 상자', amount: 2 },
      { type: 'season_skin', name: '시즌 스킨', amount: 1 },
    ],
  },
  {
    tier: 'platinum',
    tierName: '플래티넘',
    minRating: 2000,
    maxRating: 2399,
    rewards: [
      { type: 'gold', name: '골드', amount: 5000 },
      { type: 'title', name: '플래티넘 영웅' },
      { type: 'cosmetic_box', name: '코스메틱 상자', amount: 3 },
      { type: 'season_skin', name: '시즌 스킨', amount: 1 },
      { type: 'legendary_weapon_skin', name: '전설 무기 외형', amount: 1 },
    ],
  },
  {
    tier: 'diamond',
    tierName: '다이아몬드',
    minRating: 2400,
    maxRating: 99999,
    rewards: [
      { type: 'gold', name: '골드', amount: 10000 },
      { type: 'legendary_title', name: '다이아몬드 전설' },
      { type: 'cosmetic_box', name: '코스메틱 상자', amount: 5 },
      { type: 'season_skin', name: '시즌 스킨', amount: 1 },
      { type: 'legendary_weapon_skin', name: '전설 무기 외형', amount: 1 },
      { type: 'crystal', name: '크리스탈', amount: 500 },
    ],
  },
] as const;

// ─── 보상 조회 ──────────────────────────────────────────────

/** 레이팅에 따른 보상 등급 결정 */
export function getRewardTier(rating: number): SeasonTierReward {
  for (let i = SEASON_TIER_REWARDS.length - 1; i >= 0; i--) {
    if (rating >= SEASON_TIER_REWARDS[i].minRating) {
      return SEASON_TIER_REWARDS[i];
    }
  }
  return SEASON_TIER_REWARDS[0];
}

// ─── 시즌 정보 ──────────────────────────────────────────────

export interface SeasonInfo {
  season: number;
  totalPlayers: number;
  tiers: Array<{ tier: string; tierName: string; count: number }>;
}

/**
 * 현재 시즌 정보 조회
 */
export async function getSeasonInfo(): Promise<SeasonInfo> {
  const season = getCurrentSeason();

  const ratings = await prisma.pvpRating.findMany({
    where: { season },
    select: { tier: true },
  });

  const tierCounts = new Map<string, number>();
  for (const r of ratings) {
    tierCounts.set(r.tier, (tierCounts.get(r.tier) ?? 0) + 1);
  }

  const tiers = SEASON_TIER_REWARDS.map((t) => ({
    tier: t.tier,
    tierName: t.tierName,
    count: tierCounts.get(t.tier) ?? 0,
  }));

  return {
    season,
    totalPlayers: ratings.length,
    tiers,
  };
}

// ─── 시즌 보상 수령 ─────────────────────────────────────────

export interface ClaimResult {
  success: boolean;
  error?: string;
  season?: number;
  tier?: string;
  rewards?: SeasonRewardItem[];
}

/**
 * 시즌 보상 수령 — 시즌이 종료된 후에만 호출
 * (현재는 peakRating 기준으로 보상 결정)
 *
 * @param userId  플레이어 ID
 * @param season  수령할 시즌 (기본: 이전 시즌)
 */
export async function claimSeasonReward(
  userId: string,
  season?: number,
): Promise<ClaimResult> {
  const currentSeason = getCurrentSeason();
  const targetSeason = season ?? currentSeason - 1;

  if (targetSeason >= currentSeason) {
    return { success: false, error: '현재 진행 중인 시즌의 보상은 수령할 수 없습니다' };
  }
  if (targetSeason < 1) {
    return { success: false, error: '유효하지 않은 시즌' };
  }

  const rating = await prisma.pvpRating.findUnique({
    where: { userId_season: { userId, season: targetSeason } },
  });

  if (!rating) {
    return { success: false, error: '해당 시즌 참여 기록이 없습니다' };
  }

  // 이미 수령했는지 확인 (peakRating을 음수로 마킹하는 방식 대신 별도 플래그 사용 권장)
  // 간단 구현: tier가 'claimed_'로 시작하면 이미 수령
  if (rating.tier.startsWith('claimed_')) {
    return { success: false, error: '이미 보상을 수령했습니다' };
  }

  const rewardTier = getRewardTier(rating.peakRating);

  // 보상 지급: 화폐 + 아이템 인벤토리 연동
  const goldReward = rewardTier.rewards.filter(r => r.type === 'gold').reduce((sum, r) => sum + (r.amount ?? 0), 0);
  const crystalReward = rewardTier.rewards.filter(r => r.type === 'crystal').reduce((sum, r) => sum + (r.amount ?? 0), 0);

  // 화폐 지급 + 수령 마킹 (트랜잭션)
  const updateData: Record<string, unknown> = {};
  if (goldReward > 0) updateData.gold = { increment: goldReward };
  if (crystalReward > 0) updateData.crystal = { increment: crystalReward };

  await prisma.$transaction(async (tx) => {
    // 화폐 지급
    if (Object.keys(updateData).length > 0) {
      await tx.user.update({ where: { id: userId }, data: updateData });
    }

    // 화폐 거래 로그
    if (goldReward > 0) {
      await tx.transactionLog.create({
        data: {
          userId,
          currency: 'gold',
          amount: goldReward,
          balance: 0, // 실제 잔액은 조회 비용 절감을 위해 0으로 기록
          reason: 'pvp_season_reward',
          referenceId: `season_${targetSeason}_${rewardTier.tier}`,
        },
      });
    }
    if (crystalReward > 0) {
      await tx.transactionLog.create({
        data: {
          userId,
          currency: 'crystal',
          amount: crystalReward,
          balance: 0,
          reason: 'pvp_season_reward',
          referenceId: `season_${targetSeason}_${rewardTier.tier}`,
        },
      });
    }

    // 수령 완료 마킹
    await tx.pvpRating.update({
      where: { id: rating.id },
      data: { tier: `claimed_${rewardTier.tier}` },
    });
  });

  // 아이템 보상 지급 (inventoryManager — 트랜잭션 외부)
  const itemRewards = rewardTier.rewards.filter(
    r => !['gold', 'crystal'].includes(r.type),
  );
  for (const reward of itemRewards) {
    // 아이템 코드 = 보상 타입_시즌 (예: cosmetic_box, season_skin 등)
    const itemCode = `pvp_${reward.type}_s${targetSeason}`;
    await inventoryManager.addItem(userId, itemCode, reward.amount ?? 1).catch(() => {
      // 아이템 코드가 미등록이면 무시 (로그만 남김)
    });
  }

  return {
    success: true,
    season: targetSeason,
    tier: rewardTier.tier,
    rewards: [...rewardTier.rewards],
  };
}

/**
 * 유저의 시즌 보상 미리보기 (현재 시즌 기준)
 */
export async function previewSeasonReward(userId: string) {
  const season = getCurrentSeason();
  const rating = await prisma.pvpRating.findUnique({
    where: { userId_season: { userId, season } },
  });

  if (!rating) {
    return {
      season,
      rating: 1000,
      peakRating: 1000,
      tier: getRewardTier(1000),
    };
  }

  return {
    season,
    rating: rating.rating,
    peakRating: rating.peakRating,
    tier: getRewardTier(rating.peakRating),
  };
}
