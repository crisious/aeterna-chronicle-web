/**
 * pvpMapSeeds.ts — PvP 맵 시드 데이터 (P8-15)
 *
 * 시즌 1: 기본 아레나 (기존)
 * 시즌 2: 안개해 아레나, 심해 콜로세움
 *
 * 각 맵은 고유 환경 효과와 지형 특성을 가짐.
 */

// ─── 타입 ─────────────────────────────────────────────────────

export interface PvpMapDef {
  id: string;
  name: string;
  nameEn: string;
  nameJa: string;
  season: number;
  description: string;
  /** 맵 크기 (타일 기준) */
  width: number;
  height: number;
  /** 환경 효과 — 전투 중 일정 간격으로 발동 */
  environmentEffects: EnvironmentEffect[];
  /** 지형 오브젝트 */
  terrainFeatures: TerrainFeature[];
  /** 스폰 포인트 (1v1 기준 2개, 3v3 기준 6개) */
  spawnPoints: SpawnPoint[];
  /** 최소 레이팅 제한 (0 = 제한 없음) */
  minRating: number;
  /** 맵 해금 조건 */
  unlockCondition?: string;
}

export interface EnvironmentEffect {
  id: string;
  name: string;
  description: string;
  /** 발동 주기 (초) */
  intervalSec: number;
  /** 효과 지속 시간 (초) */
  durationSec: number;
  /** 효과 타입 */
  type: 'damage' | 'debuff' | 'buff' | 'terrain_change' | 'vision';
  /** 효과 수치 (%) */
  value: number;
}

export interface TerrainFeature {
  id: string;
  name: string;
  type: 'obstacle' | 'cover' | 'hazard' | 'interactive';
  x: number;
  y: number;
  radius: number;
  effect?: string;
}

export interface SpawnPoint {
  team: 'A' | 'B';
  index: number;
  x: number;
  y: number;
}

// ─── 시즌 2 맵 정의 ──────────────────────────────────────────

export const PVP_MAP_SEEDS: readonly PvpMapDef[] = [
  // ── 시즌 2 맵 1: 안개해 아레나 ─────────────────────────────
  {
    id: 'arena_mistsea',
    name: '안개해 아레나',
    nameEn: 'Mistsea Arena',
    nameJa: '霧海アリーナ',
    season: 2,
    description:
      '무한 안개해의 떠다니는 폐선 위에 세워진 투기장. ' +
      '주기적으로 안개가 밀려와 시야를 제한하고, ' +
      '해류가 바닥 타일을 이동시킨다.',
    width: 40,
    height: 30,
    minRating: 0,
    environmentEffects: [
      {
        id: 'dense_fog',
        name: '짙은 안개',
        description: '모든 플레이어의 시야 범위가 50% 감소',
        intervalSec: 45,
        durationSec: 15,
        type: 'vision',
        value: -50,
      },
      {
        id: 'sea_current',
        name: '해류 변동',
        description: '무작위 2x2 타일이 이동하여 지형이 변경',
        intervalSec: 60,
        durationSec: 5,
        type: 'terrain_change',
        value: 0,
      },
    ],
    terrainFeatures: [
      { id: 'wreck_bow', name: '난파선 선수', type: 'cover', x: 10, y: 15, radius: 3 },
      { id: 'wreck_stern', name: '난파선 선미', type: 'cover', x: 30, y: 15, radius: 3 },
      { id: 'whirlpool', name: '소용돌이', type: 'hazard', x: 20, y: 15, radius: 2, effect: 'pull_center' },
      { id: 'floating_crate', name: '표류 상자', type: 'interactive', x: 20, y: 8, radius: 1, effect: 'random_buff' },
      { id: 'coral_reef', name: '산호 장벽', type: 'obstacle', x: 15, y: 22, radius: 2 },
      { id: 'coral_reef_2', name: '산호 장벽 2', type: 'obstacle', x: 25, y: 22, radius: 2 },
    ],
    spawnPoints: [
      { team: 'A', index: 0, x: 5, y: 15 },
      { team: 'A', index: 1, x: 5, y: 10 },
      { team: 'A', index: 2, x: 5, y: 20 },
      { team: 'B', index: 0, x: 35, y: 15 },
      { team: 'B', index: 1, x: 35, y: 10 },
      { team: 'B', index: 2, x: 35, y: 20 },
    ],
  },

  // ── 시즌 2 맵 2: 심해 콜로세움 ─────────────────────────────
  {
    id: 'arena_deepsea_colosseum',
    name: '심해 콜로세움',
    nameEn: 'Abyssal Colosseum',
    nameJa: '深海コロセウム',
    season: 2,
    description:
      '해저 깊은 곳에 잠든 고대 투기장. ' +
      '수압이 전투원의 이동속도를 저하시키고, ' +
      '심해 생물이 주기적으로 양 팀에 피해를 입힌다.',
    width: 36,
    height: 36,
    minRating: 1200,
    unlockCondition: 'season2_unlock OR rating >= 1200',
    environmentEffects: [
      {
        id: 'water_pressure',
        name: '수압',
        description: '모든 플레이어 이동속도 -20% (상시)',
        intervalSec: 0,
        durationSec: 9999,
        type: 'debuff',
        value: -20,
      },
      {
        id: 'abyssal_leviathan',
        name: '심해 괴수 출현',
        description: '맵 중앙에 AOE 피해 (최대 HP의 10%)',
        intervalSec: 30,
        durationSec: 3,
        type: 'damage',
        value: 10,
      },
      {
        id: 'bioluminescence',
        name: '발광 조류',
        description: '무작위 한 팀에 공격력 +15% 버프',
        intervalSec: 50,
        durationSec: 10,
        type: 'buff',
        value: 15,
      },
    ],
    terrainFeatures: [
      { id: 'central_pillar', name: '고대 기둥', type: 'obstacle', x: 18, y: 18, radius: 3 },
      { id: 'trench_left', name: '좌측 해구', type: 'hazard', x: 8, y: 18, radius: 4, effect: 'slow_50' },
      { id: 'trench_right', name: '우측 해구', type: 'hazard', x: 28, y: 18, radius: 4, effect: 'slow_50' },
      { id: 'thermal_vent_1', name: '열수구 1', type: 'interactive', x: 12, y: 8, radius: 1, effect: 'heal_5_percent' },
      { id: 'thermal_vent_2', name: '열수구 2', type: 'interactive', x: 24, y: 28, radius: 1, effect: 'heal_5_percent' },
      { id: 'coral_wall', name: '산호벽', type: 'cover', x: 18, y: 8, radius: 2 },
      { id: 'coral_wall_2', name: '산호벽 2', type: 'cover', x: 18, y: 28, radius: 2 },
    ],
    spawnPoints: [
      { team: 'A', index: 0, x: 4, y: 18 },
      { team: 'A', index: 1, x: 4, y: 12 },
      { team: 'A', index: 2, x: 4, y: 24 },
      { team: 'B', index: 0, x: 32, y: 18 },
      { team: 'B', index: 1, x: 32, y: 12 },
      { team: 'B', index: 2, x: 32, y: 24 },
    ],
  },
];

  // ═══════════════════════════════════════════════════════════════
  //  P14-13: PvP 시즌 3 — 신규 맵 2개
  // ═══════════════════════════════════════════════════════════════

  // ── 시즌 3 맵 1: 시간의 원형경기장 ─────────────────────────
  {
    id: 'arena_chrono_colosseum',
    name: '시간의 원형경기장',
    nameEn: 'Chrono Colosseum',
    nameJa: '時の円形闘技場',
    season: 3,
    description:
      '시간의 균열 한가운데 떠 있는 고대 투기장. ' +
      '시간이 왜곡되어 주기적으로 전장의 속도가 변하고, ' +
      '과거와 미래의 잔상이 전투에 개입한다.',
    width: 44,
    height: 44,
    minRating: 0,
    environmentEffects: [
      {
        id: 'time_dilation',
        name: '시간 팽창',
        description: '모든 플레이어의 스킬 쿨타임이 30% 감소 (12초간)',
        intervalSec: 40,
        durationSec: 12,
        type: 'buff',
        value: 30,
      },
      {
        id: 'temporal_echo',
        name: '시간 잔상',
        description: '3초 전 위치에 잔상이 나타나 랜덤 플레이어에게 피해',
        intervalSec: 50,
        durationSec: 3,
        type: 'damage',
        value: 8,
      },
      {
        id: 'chrono_rewind',
        name: '시간 역행',
        description: '양 팀의 HP가 5초 전 상태로 되돌아감',
        intervalSec: 90,
        durationSec: 1,
        type: 'buff',
        value: 0,
      },
    ],
    terrainFeatures: [
      { id: 'chrono_pillar_1', name: '시간의 기둥 1', type: 'obstacle', x: 15, y: 22, radius: 2 },
      { id: 'chrono_pillar_2', name: '시간의 기둥 2', type: 'obstacle', x: 29, y: 22, radius: 2 },
      { id: 'time_rift_center', name: '중앙 시간 균열', type: 'hazard', x: 22, y: 22, radius: 3, effect: 'random_teleport' },
      { id: 'clockwork_platform_a', name: '톱니 발판 A', type: 'interactive', x: 11, y: 11, radius: 2, effect: 'speed_boost_20' },
      { id: 'clockwork_platform_b', name: '톱니 발판 B', type: 'interactive', x: 33, y: 33, radius: 2, effect: 'speed_boost_20' },
      { id: 'hourglass_wall_top', name: '모래시계 벽 상단', type: 'cover', x: 22, y: 10, radius: 3 },
      { id: 'hourglass_wall_bot', name: '모래시계 벽 하단', type: 'cover', x: 22, y: 34, radius: 3 },
    ],
    spawnPoints: [
      { team: 'A', index: 0, x: 5, y: 22 },
      { team: 'A', index: 1, x: 5, y: 16 },
      { team: 'A', index: 2, x: 5, y: 28 },
      { team: 'B', index: 0, x: 39, y: 22 },
      { team: 'B', index: 1, x: 39, y: 16 },
      { team: 'B', index: 2, x: 39, y: 28 },
    ],
  },

  // ── 시즌 3 맵 2: 균열의 전장 ───────────────────────────────
  {
    id: 'arena_rift_battleground',
    name: '균열의 전장',
    nameEn: 'Rift Battleground',
    nameJa: '亀裂の戦場',
    season: 3,
    description:
      '시공간 균열이 열린 광활한 전장. ' +
      '맵 곳곳에 차원 포탈이 열려 순간이동이 가능하고, ' +
      '균열에서 쏟아지는 에너지가 전투를 예측 불가능하게 만든다.',
    width: 50,
    height: 40,
    minRating: 1400,
    unlockCondition: 'season3_unlock OR rating >= 1400',
    environmentEffects: [
      {
        id: 'rift_surge',
        name: '균열 쇄도',
        description: '맵 중앙에서 에너지 파동 발생, 피격 시 공격력 +25% (15초)',
        intervalSec: 35,
        durationSec: 3,
        type: 'buff',
        value: 25,
      },
      {
        id: 'dimensional_instability',
        name: '차원 불안정',
        description: '랜덤 2x2 영역이 소멸했다 재생성, 해당 위치 플레이어 넉백',
        intervalSec: 55,
        durationSec: 2,
        type: 'terrain_change',
        value: 0,
      },
      {
        id: 'void_corruption',
        name: '허공 침식',
        description: '맵 가장자리 3타일이 침식, 해당 영역 진입 시 초당 5% HP 감소',
        intervalSec: 120,
        durationSec: 30,
        type: 'damage',
        value: 5,
      },
    ],
    terrainFeatures: [
      { id: 'portal_alpha', name: '포탈 알파', type: 'interactive', x: 12, y: 12, radius: 2, effect: 'teleport_to_portal_beta' },
      { id: 'portal_beta', name: '포탈 베타', type: 'interactive', x: 38, y: 28, radius: 2, effect: 'teleport_to_portal_alpha' },
      { id: 'rift_crystal_1', name: '균열 수정 1', type: 'obstacle', x: 25, y: 10, radius: 2 },
      { id: 'rift_crystal_2', name: '균열 수정 2', type: 'obstacle', x: 25, y: 30, radius: 2 },
      { id: 'energy_nexus', name: '에너지 결절점', type: 'interactive', x: 25, y: 20, radius: 3, effect: 'aoe_heal_10_percent' },
      { id: 'void_pit_left', name: '허공 구덩이 좌', type: 'hazard', x: 10, y: 20, radius: 3, effect: 'instant_death' },
      { id: 'void_pit_right', name: '허공 구덩이 우', type: 'hazard', x: 40, y: 20, radius: 3, effect: 'instant_death' },
      { id: 'broken_wall_1', name: '파괴된 성벽 1', type: 'cover', x: 18, y: 20, radius: 2 },
      { id: 'broken_wall_2', name: '파괴된 성벽 2', type: 'cover', x: 32, y: 20, radius: 2 },
    ],
    spawnPoints: [
      { team: 'A', index: 0, x: 4, y: 20 },
      { team: 'A', index: 1, x: 4, y: 13 },
      { team: 'A', index: 2, x: 4, y: 27 },
      { team: 'B', index: 0, x: 46, y: 20 },
      { team: 'B', index: 1, x: 46, y: 13 },
      { team: 'B', index: 2, x: 46, y: 27 },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════
//  P14-13: PvP 시즌 3 — 보상 5티어 + 레이팅 리셋 + 시즌 전환
// ═══════════════════════════════════════════════════════════════

export interface PvpSeason3TierReward {
  tier: string;
  tierName: string;
  minRating: number;
  maxRating: number;
  rewards: { type: string; name: string; amount?: number }[];
}

export const SEASON_3_TIER_REWARDS: readonly PvpSeason3TierReward[] = [
  {
    tier: 'bronze',
    tierName: '브론즈',
    minRating: 0,
    maxRating: 1199,
    rewards: [
      { type: 'gold', name: '골드', amount: 800 },
      { type: 'title', name: '균열의 신참' },
    ],
  },
  {
    tier: 'silver',
    tierName: '실버',
    minRating: 1200,
    maxRating: 1599,
    rewards: [
      { type: 'gold', name: '골드', amount: 2500 },
      { type: 'title', name: '시간의 도전자' },
      { type: 'cosmetic_box', name: '시즌3 코스메틱 상자', amount: 2 },
    ],
  },
  {
    tier: 'gold',
    tierName: '골드',
    minRating: 1600,
    maxRating: 1999,
    rewards: [
      { type: 'gold', name: '골드', amount: 5000 },
      { type: 'title', name: '균열의 투사' },
      { type: 'cosmetic_box', name: '시즌3 코스메틱 상자', amount: 3 },
      { type: 'season_skin', name: '시간의 갑옷 스킨' },
    ],
  },
  {
    tier: 'platinum',
    tierName: '플래티넘',
    minRating: 2000,
    maxRating: 2399,
    rewards: [
      { type: 'gold', name: '골드', amount: 10000 },
      { type: 'title', name: '시간의 정복자' },
      { type: 'cosmetic_box', name: '시즌3 프리미엄 상자', amount: 3 },
      { type: 'season_skin', name: '균열의 투구 스킨' },
      { type: 'legendary_weapon_skin', name: '크로노스의 검 외형' },
    ],
  },
  {
    tier: 'diamond',
    tierName: '다이아몬드',
    minRating: 2400,
    maxRating: 99999,
    rewards: [
      { type: 'gold', name: '골드', amount: 20000 },
      { type: 'legendary_title', name: '시간의 패왕' },
      { type: 'cosmetic_box', name: '시즌3 프리미엄 상자', amount: 5 },
      { type: 'season_skin', name: '시공 균열 풀 세트 스킨' },
      { type: 'legendary_weapon_skin', name: '보이드 아키텍트의 지팡이 외형' },
      { type: 'crystal', name: '차원 결정', amount: 500 },
      { type: 'mount', name: '균열의 전마 (시즌3 한정)' },
    ],
  },
];

/** 시즌 3 레이팅 리셋 규칙 */
export interface RatingResetRule {
  fromMin: number;
  fromMax: number;
  resetTo: number;
  description: string;
}

export const SEASON_3_RATING_RESET_RULES: readonly RatingResetRule[] = [
  { fromMin: 0,    fromMax: 1199, resetTo: 1000, description: '브론즈 → 1000 고정' },
  { fromMin: 1200, fromMax: 1599, resetTo: 1100, description: '실버 → 1100' },
  { fromMin: 1600, fromMax: 1999, resetTo: 1200, description: '골드 → 1200' },
  { fromMin: 2000, fromMax: 2399, resetTo: 1400, description: '플래티넘 → 1400' },
  { fromMin: 2400, fromMax: 99999, resetTo: 1600, description: '다이아 → 1600' },
];

/**
 * 시즌 전환 로직 — 보상 지급 + 레이팅 리셋
 */
export async function executeSeasonTransition(
  fromSeason: number,
  toSeason: number,
): Promise<{ rewarded: number; reset: number }> {
  // 1. 모든 랭크 유저 조회
  const rankedUsers = await prisma.pvpRating.findMany({
    where: { season: fromSeason },
  });

  let rewarded = 0;
  let resetCount = 0;

  for (const user of rankedUsers) {
    // 2. 보상 지급
    const tier = SEASON_3_TIER_REWARDS.find(
      t => user.rating >= t.minRating && user.rating <= t.maxRating,
    );

    if (tier) {
      await prisma.pvpSeasonReward.create({
        data: {
          userId: user.userId,
          season: fromSeason,
          tier: tier.tier,
          rating: user.rating,
          rewards: tier.rewards as any,
        },
      });
      rewarded++;
    }

    // 3. 레이팅 리셋
    const resetRule = SEASON_3_RATING_RESET_RULES.find(
      r => user.rating >= r.fromMin && user.rating <= r.fromMax,
    );

    if (resetRule) {
      await prisma.pvpRating.upsert({
        where: { userId_season: { userId: user.userId, season: toSeason } },
        create: {
          userId: user.userId,
          season: toSeason,
          rating: resetRule.resetTo,
          wins: 0,
          losses: 0,
        },
        update: {
          rating: resetRule.resetTo,
          wins: 0,
          losses: 0,
        },
      });
      resetCount++;
    }
  }

  return { rewarded, reset: resetCount };
}

/**
 * 시즌별 맵 목록 조회
 */
export function getMapsBySeason(season: number): PvpMapDef[] {
  return PVP_MAP_SEEDS.filter(m => m.season === season);
}

/**
 * 맵 ID로 조회
 */
export function getMapById(mapId: string): PvpMapDef | undefined {
  return PVP_MAP_SEEDS.find(m => m.id === mapId);
}

/**
 * 유저 레이팅 기준 입장 가능한 맵 필터
 */
export function getAvailableMaps(season: number, userRating: number): PvpMapDef[] {
  return PVP_MAP_SEEDS.filter(
    m => m.season === season && userRating >= m.minRating,
  );
}
