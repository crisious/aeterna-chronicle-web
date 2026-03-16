// ─── 보상 시스템 (P24-08/09) ───────────────────────────────────
// 경험치, 골드, 아이템 드롭 계산

// ─── 아이템 등급 ───────────────────────────────────────────────

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

// ─── 드롭 테이블 엔트리 ────────────────────────────────────────

export interface DropEntry {
  itemId: string;
  rarity: ItemRarity;
  /** 드롭 확률 (%) */
  dropRate: number;
  /** 최소 수량 */
  minQuantity: number;
  /** 최대 수량 */
  maxQuantity: number;
}

// ─── 보상 결과 ─────────────────────────────────────────────────

export interface RewardResult {
  /** 총 경험치 */
  totalExp: number;
  /** 멤버별 경험치 */
  expPerMember: number;
  /** 총 골드 */
  totalGold: number;
  /** 멤버별 골드 */
  goldPerMember: number;
  /** 드롭 아이템 목록 */
  droppedItems: DroppedItem[];
}

export interface DroppedItem {
  itemId: string;
  rarity: ItemRarity;
  quantity: number;
}

// ─── 분배 방식 ─────────────────────────────────────────────────

export type DistributionMode = 'equal' | 'round_robin' | 'free_for_all';

// ─── 보상 입력 ─────────────────────────────────────────────────

export interface RewardInput {
  /** 몬스터 레벨 */
  monsterLevel: number;
  /** 몬스터 기본 경험치 */
  baseExp: number;
  /** 몬스터 기본 골드 */
  baseGold: number;
  /** 드롭 테이블 */
  dropTable: DropEntry[];
  /** 파티원 수 */
  partySize: number;
  /** 파티원 평균 레벨 */
  partyAvgLevel: number;
  /** 보스 여부 */
  isBoss: boolean;
  /** 분배 방식 */
  distributionMode: DistributionMode;
}

// ─── 상수 ──────────────────────────────────────────────────────

/** 레벨 차이 EXP 보정 계수 */
const EXP_LEVEL_DIFF_FACTOR = 0.05;
/** EXP 보정 최솟값 배율 */
const EXP_MIN_MULTIPLIER = 0.1;
/** EXP 보정 최댓값 배율 */
const EXP_MAX_MULTIPLIER = 1.5;
/** 파티 EXP 보너스 (인당 %) */
const PARTY_EXP_BONUS_PER_MEMBER = 10;
/** 파티 골드 보너스 (인당 %) */
const PARTY_GOLD_BONUS_PER_MEMBER = 5;
/** 보스 보상 배율 */
const BOSS_REWARD_MULTIPLIER = 3.0;
/** 등급별 기본 드롭 확률 배율 */
const RARITY_DROP_MULTIPLIER: Record<ItemRarity, number> = {
  common: 1.0,
  uncommon: 0.8,
  rare: 0.5,
  epic: 0.2,
  legendary: 0.05,
};

// ─── 경험치 계산 ───────────────────────────────────────────────

/**
 * 레벨 차이 보정 배율
 * 몬스터가 높을수록 더 많이, 낮을수록 적게
 */
function expLevelMultiplier(monsterLevel: number, partyAvgLevel: number): number {
  const diff = monsterLevel - partyAvgLevel;
  const mult = 1 + diff * EXP_LEVEL_DIFF_FACTOR;
  return Math.max(EXP_MIN_MULTIPLIER, Math.min(EXP_MAX_MULTIPLIER, mult));
}

/**
 * 파티 보너스 배율
 */
function partyBonusMultiplier(partySize: number, bonusPerMember: number): number {
  if (partySize <= 1) return 1.0;
  return 1 + (partySize - 1) * bonusPerMember / 100;
}

// ─── 드롭 판정 ─────────────────────────────────────────────────

function rollDrops(dropTable: DropEntry[], isBoss: boolean): DroppedItem[] {
  const items: DroppedItem[] = [];

  for (const entry of dropTable) {
    const effectiveRate = isBoss
      ? Math.min(100, entry.dropRate * 2) // 보스는 드롭 확률 2배
      : entry.dropRate;

    if (Math.random() * 100 < effectiveRate) {
      const quantity = entry.minQuantity + Math.floor(
        Math.random() * (entry.maxQuantity - entry.minQuantity + 1),
      );
      items.push({
        itemId: entry.itemId,
        rarity: entry.rarity,
        quantity,
      });
    }
  }

  return items;
}

// ─── 메인 보상 계산 ────────────────────────────────────────────

export function calculateRewards(input: RewardInput): RewardResult {
  const {
    monsterLevel, baseExp, baseGold, dropTable,
    partySize, partyAvgLevel, isBoss, distributionMode,
  } = input;

  // 1. 경험치
  let totalExp = baseExp * expLevelMultiplier(monsterLevel, partyAvgLevel);
  if (isBoss) totalExp *= BOSS_REWARD_MULTIPLIER;
  totalExp *= partyBonusMultiplier(partySize, PARTY_EXP_BONUS_PER_MEMBER);
  totalExp = Math.round(totalExp);

  // 2. 골드
  let totalGold = baseGold;
  if (isBoss) totalGold *= BOSS_REWARD_MULTIPLIER;
  totalGold *= partyBonusMultiplier(partySize, PARTY_GOLD_BONUS_PER_MEMBER);
  totalGold = Math.round(totalGold);

  // 3. 분배
  const expPerMember = distributionMode === 'free_for_all'
    ? totalExp
    : Math.floor(totalExp / partySize);

  const goldPerMember = distributionMode === 'free_for_all'
    ? totalGold
    : Math.floor(totalGold / partySize);

  // 4. 드롭
  const droppedItems = rollDrops(dropTable, isBoss);

  return {
    totalExp,
    expPerMember,
    totalGold,
    goldPerMember,
    droppedItems,
  };
}

// ─── 경험치 테이블 (레벨업 필요 EXP) ──────────────────────────

const BASE_EXP_REQUIRED = 100;

/**
 * 특정 레벨에서 다음 레벨로 필요한 경험치
 * requiredExp = baseExp × level^1.5
 */
export function getRequiredExp(level: number): number {
  return Math.round(BASE_EXP_REQUIRED * Math.pow(level, 1.5));
}

/**
 * 레벨 1~maxLevel까지의 누적 경험치 테이블 생성
 */
export function generateExpTable(maxLevel = 100): number[] {
  const table: number[] = [0]; // 레벨 0 = 0
  for (let lv = 1; lv <= maxLevel; lv++) {
    table.push(getRequiredExp(lv));
  }
  return table;
}
