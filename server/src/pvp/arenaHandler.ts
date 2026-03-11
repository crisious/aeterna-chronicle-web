/**
 * arenaHandler.ts — PvP 아레나 핸들러
 *
 * - 장비 스코어 평준화 (normalizeGearScore)
 * - 매치 상태 관리 (matching → ready → fighting → finished)
 * - ELO 레이팅 계산 + 업데이트
 * - 시즌 보상 등급 결정
 */
import { prisma } from '../db';
import { getCurrentSeason } from './matchmaker';

// ─── 장비 스코어 평준화 ─────────────────────────────────────
/** 아레나 표준 스코어 */
const ARENA_STANDARD_SCORE = 1000;

/** 최소/최대 보정 범위 (원본 대비 ±30%) */
const NORMALIZE_MIN_RATIO = 0.7;
const NORMALIZE_MAX_RATIO = 1.3;

/**
 * 장비 스코어를 아레나 표준값으로 평준화한다.
 * 극단적인 격차를 줄이면서 장비 차이를 완전히 없애지는 않는다.
 *
 * @param originalScore 원본 장비 스코어
 * @returns 평준화된 스코어
 */
export function normalizeGearScore(originalScore: number): number {
  if (originalScore <= 0) return ARENA_STANDARD_SCORE;

  // 표준 스코어와의 비율 계산
  const ratio = originalScore / ARENA_STANDARD_SCORE;

  // 비율을 min~max 범위로 클램핑
  const clampedRatio = Math.max(NORMALIZE_MIN_RATIO, Math.min(NORMALIZE_MAX_RATIO, ratio));

  return Math.round(ARENA_STANDARD_SCORE * clampedRatio);
}

// ─── ELO 레이팅 계산 ────────────────────────────────────────
/** ELO K-factor (레이팅 변동 폭) */
const ELO_K_FACTOR = 32;

/**
 * ELO 레이팅 변동량 계산
 *
 * @param winnerRating 승자의 현재 레이팅
 * @param loserRating 패자의 현재 레이팅
 * @returns [승자 변동량, 패자 변동량] (양수/음수)
 */
export function calculateEloChange(winnerRating: number, loserRating: number): [number, number] {
  const expectedWinner = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
  const expectedLoser = 1 - expectedWinner;

  const winnerChange = Math.round(ELO_K_FACTOR * (1 - expectedWinner));
  const loserChange = Math.round(ELO_K_FACTOR * (0 - expectedLoser));

  return [winnerChange, loserChange];
}

// ─── 티어 결정 ──────────────────────────────────────────────
/** 레이팅 → 티어 매핑 */
export function determineTier(rating: number): string {
  if (rating >= 2200) return 'master';
  if (rating >= 1900) return 'diamond';
  if (rating >= 1600) return 'platinum';
  if (rating >= 1300) return 'gold';
  if (rating >= 1100) return 'silver';
  return 'bronze';
}

// ─── 매치 상태 관리 ─────────────────────────────────────────

/** 매치 시작 (ready → fighting) */
export async function startMatch(matchId: string): Promise<void> {
  await prisma.pvpMatch.update({
    where: { id: matchId },
    data: {
      status: 'fighting',
      startedAt: new Date(),
    },
  });
}

/**
 * 매치 종료 처리 — 승패 기록 + ELO 업데이트
 *
 * @param matchId 매치 ID
 * @param winnerId 승자 userId
 * @param player1Score 플레이어1 점수
 * @param player2Score 플레이어2 점수
 * @returns ELO 변동량 [승자, 패자]
 */
export async function finishMatch(
  matchId: string,
  winnerId: string,
  player1Score: number,
  player2Score: number,
): Promise<{ winnerChange: number; loserChange: number }> {
  const match = await prisma.pvpMatch.findUnique({ where: { id: matchId } });
  if (!match) throw new Error(`매치를 찾을 수 없습니다: ${matchId}`);

  const loserId = match.player1Id === winnerId ? match.player2Id : match.player1Id;
  const now = new Date();
  const startedAt = match.startedAt ?? now;
  const duration = Math.round((now.getTime() - startedAt.getTime()) / 1000);

  // 매치 레코드 업데이트
  await prisma.pvpMatch.update({
    where: { id: matchId },
    data: {
      winnerId,
      player1Score,
      player2Score,
      status: 'finished',
      duration,
      endedAt: now,
    },
  });

  const season = getCurrentSeason();

  // 승자/패자 레이팅 조회 (없으면 생성)
  const winnerRating = await getOrCreateRating(winnerId, season);
  const loserRating = await getOrCreateRating(loserId, season);

  // ELO 변동 계산
  const [winChange, loseChange] = calculateEloChange(winnerRating.rating, loserRating.rating);

  // 승자 레이팅 업데이트
  const newWinnerRating = winnerRating.rating + winChange;
  const newWinnerStreak = winnerRating.streak > 0 ? winnerRating.streak + 1 : 1;
  await prisma.pvpRating.update({
    where: { id: winnerRating.id },
    data: {
      rating: newWinnerRating,
      tier: determineTier(newWinnerRating),
      wins: winnerRating.wins + 1,
      streak: newWinnerStreak,
      peakRating: Math.max(winnerRating.peakRating, newWinnerRating),
    },
  });

  // 패자 레이팅 업데이트
  const newLoserRating = Math.max(0, loserRating.rating + loseChange);
  const newLoserStreak = loserRating.streak < 0 ? loserRating.streak - 1 : -1;
  await prisma.pvpRating.update({
    where: { id: loserRating.id },
    data: {
      rating: newLoserRating,
      tier: determineTier(newLoserRating),
      losses: loserRating.losses + 1,
      streak: newLoserStreak,
    },
  });

  return { winnerChange: winChange, loserChange: loseChange };
}

/** 레이팅 조회 (없으면 기본값으로 생성) */
async function getOrCreateRating(userId: string, season: number) {
  const existing = await prisma.pvpRating.findUnique({
    where: { userId_season: { userId, season } },
  });

  if (existing) return existing;

  return prisma.pvpRating.create({
    data: { userId, season, rating: 1000, tier: 'bronze' },
  });
}

// ─── 시즌 보상 등급 ─────────────────────────────────────────
export interface SeasonReward {
  tier: string;
  title: string;
  rewards: string[];
}

/** 시즌 종료 시 보상 등급 결정 */
export function determineSeasonReward(tier: string, peakRating: number): SeasonReward {
  const rewardMap: Record<string, SeasonReward> = {
    master: {
      tier: 'master',
      title: '아레나 마스터',
      rewards: ['전설 장비 상자', '시즌 칭호', '골드 5000', '마스터 아우라'],
    },
    diamond: {
      tier: 'diamond',
      title: '다이아몬드 투사',
      rewards: ['영웅 장비 상자', '시즌 칭호', '골드 3000'],
    },
    platinum: {
      tier: 'platinum',
      title: '플래티넘 전사',
      rewards: ['희귀 장비 상자', '시즌 칭호', '골드 2000'],
    },
    gold: {
      tier: 'gold',
      title: '골드 도전자',
      rewards: ['일반 장비 상자', '골드 1000'],
    },
    silver: {
      tier: 'silver',
      title: '실버 수련생',
      rewards: ['소모품 상자', '골드 500'],
    },
    bronze: {
      tier: 'bronze',
      title: '브론즈 입문자',
      rewards: ['골드 200'],
    },
  };

  const reward = rewardMap[tier] ?? rewardMap['bronze'];

  // 피크 레이팅 2500+ 보너스
  if (peakRating >= 2500) {
    return {
      ...reward,
      rewards: [...reward.rewards, '레전드 프레임'],
    };
  }

  return reward;
}
