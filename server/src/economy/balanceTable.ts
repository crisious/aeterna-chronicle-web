/**
 * P4-08: 게임 경제 밸런싱 — 밸런스 테이블
 *
 * 레벨별 기대 수입/지출 곡선, 아이템 등급별 가격 레인지,
 * 강화 비용 테이블, 몬스터 드롭 테이블, 상점 매입 비율 정의
 */

// ─── 아이템 등급 ────────────────────────────────────────────────
export type ItemGrade = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

// ─── 골드 싱크 카테고리 ─────────────────────────────────────────
export type GoldSinkType =
  | 'enhancement'   // 강화
  | 'repair'        // 수리
  | 'tax'           // 거래세
  | 'teleport'      // 텔레포트
  | 'npc_shop';     // NPC 상점 구매

// ─── 골드 소스 카테고리 ─────────────────────────────────────────
export type GoldSourceType =
  | 'monster_drop'  // 몬스터 드롭
  | 'quest_reward'  // 퀘스트 보상
  | 'item_sell'     // 아이템 판매
  | 'achievement';  // 업적 보상

// ─── 레벨별 기대 수입/지출 곡선 ─────────────────────────────────
export interface LevelEconomyCurve {
  level: number;
  expectedIncome: number;   // 시간당 기대 골드 수입
  expectedExpense: number;  // 시간당 기대 골드 지출
  netGold: number;          // 순 변동 (소폭 양수 유지가 건강)
}

/**
 * 레벨별 경제 곡선 생성 (1~100)
 * 설계 원칙: 저레벨은 넉넉한 잉여, 고레벨은 싱크가 커져 순 변동이 줄어듦
 */
export function generateLevelEconomyCurves(): LevelEconomyCurve[] {
  const curves: LevelEconomyCurve[] = [];
  for (let lv = 1; lv <= 100; lv++) {
    // 수입: 기본 50 + 레벨^1.4 × 8  (완만한 증가)
    const income = Math.round(50 + Math.pow(lv, 1.4) * 8);
    // 지출: 레벨^1.5 × 6  (수입보다 가파르게 증가)
    const expense = Math.round(Math.pow(lv, 1.5) * 6);
    // 순 변동: 항상 약간의 양수를 보장 (최소 10)
    const net = Math.max(10, income - expense);
    curves.push({ level: lv, expectedIncome: income, expectedExpense: expense, netGold: net });
  }
  return curves;
}

// ─── 아이템 등급별 가격 레인지 ──────────────────────────────────
export interface GradePriceRange {
  grade: ItemGrade;
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
}

/** 등급별 기본 가격 범위 (상점 기준) */
export const GRADE_PRICE_RANGES: Record<ItemGrade, GradePriceRange> = {
  common:    { grade: 'common',    minPrice: 10,     maxPrice: 100,     avgPrice: 50 },
  uncommon:  { grade: 'uncommon',  minPrice: 100,    maxPrice: 500,     avgPrice: 250 },
  rare:      { grade: 'rare',      minPrice: 500,    maxPrice: 2_500,   avgPrice: 1_200 },
  epic:      { grade: 'epic',      minPrice: 2_500,  maxPrice: 15_000,  avgPrice: 7_000 },
  legendary: { grade: 'legendary', minPrice: 15_000, maxPrice: 100_000, avgPrice: 45_000 },
};

// ─── 강화 비용 테이블 (+1 ~ +15) ────────────────────────────────
export interface EnhancementCost {
  level: number;       // 강화 단계 (+1 ~ +15)
  goldCost: number;    // 필요 골드
  successRate: number; // 성공 확률 (0.0 ~ 1.0)
  destroyRate: number; // 파괴 확률 (0.0 ~ 1.0), +10 이상부터 적용
}

export const ENHANCEMENT_TABLE: EnhancementCost[] = [
  { level: 1,  goldCost: 100,     successRate: 1.00, destroyRate: 0.00 },
  { level: 2,  goldCost: 200,     successRate: 0.95, destroyRate: 0.00 },
  { level: 3,  goldCost: 400,     successRate: 0.90, destroyRate: 0.00 },
  { level: 4,  goldCost: 800,     successRate: 0.85, destroyRate: 0.00 },
  { level: 5,  goldCost: 1_500,   successRate: 0.80, destroyRate: 0.00 },
  { level: 6,  goldCost: 3_000,   successRate: 0.70, destroyRate: 0.00 },
  { level: 7,  goldCost: 5_000,   successRate: 0.60, destroyRate: 0.00 },
  { level: 8,  goldCost: 8_000,   successRate: 0.50, destroyRate: 0.00 },
  { level: 9,  goldCost: 12_000,  successRate: 0.40, destroyRate: 0.00 },
  { level: 10, goldCost: 20_000,  successRate: 0.30, destroyRate: 0.03 },
  { level: 11, goldCost: 35_000,  successRate: 0.25, destroyRate: 0.05 },
  { level: 12, goldCost: 60_000,  successRate: 0.20, destroyRate: 0.08 },
  { level: 13, goldCost: 100_000, successRate: 0.15, destroyRate: 0.12 },
  { level: 14, goldCost: 180_000, successRate: 0.10, destroyRate: 0.18 },
  { level: 15, goldCost: 300_000, successRate: 0.05, destroyRate: 0.25 },
];

/** 특정 강화 단계 비용 조회 */
export function getEnhancementCost(level: number): EnhancementCost | null {
  return ENHANCEMENT_TABLE.find(e => e.level === level) ?? null;
}

// ─── 몬스터 레벨별 드롭 골드/경험치 ────────────────────────────
export interface MonsterDropTable {
  monsterLevel: number;
  minGold: number;
  maxGold: number;
  avgGold: number;
  baseExp: number;
}

/**
 * 몬스터 레벨별 드롭 테이블 생성 (1~100)
 * 골드: 기본 5 + 레벨 × 3 (±20% 범위)
 * 경험치: 레벨^1.3 × 10
 */
export function generateMonsterDropTable(): MonsterDropTable[] {
  const table: MonsterDropTable[] = [];
  for (let lv = 1; lv <= 100; lv++) {
    const avg = 5 + lv * 3;
    const min = Math.round(avg * 0.8);
    const max = Math.round(avg * 1.2);
    const exp = Math.round(Math.pow(lv, 1.3) * 10);
    table.push({ monsterLevel: lv, minGold: min, maxGold: max, avgGold: avg, baseExp: exp });
  }
  return table;
}

// ─── 상점 매입가 비율 ───────────────────────────────────────────
/** NPC 상점 매입가 = 판매가 × SHOP_BUYBACK_RATIO */
export const SHOP_BUYBACK_RATIO = 0.30;

/** 매입가 계산 */
export function calculateSellPrice(shopPrice: number): number {
  return Math.max(1, Math.floor(shopPrice * SHOP_BUYBACK_RATIO));
}

// ─── 텔레포트 비용 (거리 기반) ──────────────────────────────────
export const TELEPORT_BASE_COST = 50;
export const TELEPORT_PER_ZONE = 25;

/** 텔레포트 비용 = 기본 50 + (존 거리 × 25) */
export function calculateTeleportCost(zoneDistance: number): number {
  return TELEPORT_BASE_COST + zoneDistance * TELEPORT_PER_ZONE;
}

// ─── 수리비 (장비 내구도 기반) ──────────────────────────────────
export const REPAIR_COST_PER_DURABILITY = 2;

/** 수리비 = 손상 내구도 × 2 × 등급 배율 */
export function calculateRepairCost(damagedDurability: number, grade: ItemGrade): number {
  const gradeMultiplier: Record<ItemGrade, number> = {
    common: 1.0, uncommon: 1.5, rare: 2.0, epic: 3.0, legendary: 5.0,
  };
  return Math.ceil(damagedDurability * REPAIR_COST_PER_DURABILITY * gradeMultiplier[grade]);
}

// ─── 거래세 (유저간 거래) ───────────────────────────────────────
export const TRADE_TAX_RATE = 0.05; // 5%

/** 거래세 계산 */
export function calculateTradeTax(price: number): number {
  return Math.max(1, Math.floor(price * TRADE_TAX_RATE));
}
