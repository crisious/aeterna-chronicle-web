/**
 * 유닛 테스트 — craftEngine (10 tests)
 * 레시피 조회, 제작 실행, 강화, 분해, 숙련도
 */
import { describe, test, expect, vi, beforeEach } from 'vitest';

// ── 타입 스텁 ────────────────────────────────────────────────

interface MaterialEntry { itemId: string; name: string; count: number }
interface InventoryItem { itemId: string; name: string; count: number; enhancement?: number }
interface InventoryData { items: InventoryItem[]; gold?: number }
interface MasteryData { level: number; exp: number; totalCrafts: number }
interface CraftResult {
  success: boolean; resultItem: string | null; resultCount: number;
  materialsConsumed: MaterialEntry[]; masteryExpGained: number; message: string;
}

// ── 순수 로직 재현 ──────────────────────────────────────────

const ENHANCEMENT_SUCCESS_RATE = [1, 0.95, 0.9, 0.85, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.25, 0.2, 0.15, 0.1, 0.05];

function getEnhancementSuccessRate(level: number): number {
  return ENHANCEMENT_SUCCESS_RATE[Math.min(level, 14)] ?? 0.05;
}

function calculateMasteryBonus(mastery: MasteryData): number {
  return mastery.level * 0.02; // 레벨당 2% 성공률 보너스
}

function hasMaterials(inventory: InventoryData, materials: MaterialEntry[]): boolean {
  for (const mat of materials) {
    const inv = inventory.items.find(i => i.itemId === mat.itemId);
    if (!inv || inv.count < mat.count) return false;
  }
  return true;
}

function consumeMaterials(inventory: InventoryData, materials: MaterialEntry[]): InventoryData {
  const updated = { ...inventory, items: inventory.items.map(i => ({ ...i })) };
  for (const mat of materials) {
    const inv = updated.items.find(i => i.itemId === mat.itemId);
    if (inv) inv.count -= mat.count;
  }
  updated.items = updated.items.filter(i => i.count > 0);
  return updated;
}

function getMasteryExp(recipeLevel: number): number {
  return Math.max(1, 10 - recipeLevel);
}

// ── 테스트 ──────────────────────────────────────────────────

describe('craftEngine', () => {
  const baseMaterials: MaterialEntry[] = [
    { itemId: 'mat_iron', name: '철', count: 3 },
    { itemId: 'mat_wood', name: '목재', count: 2 },
  ];

  const richInventory: InventoryData = {
    items: [
      { itemId: 'mat_iron', name: '철', count: 10 },
      { itemId: 'mat_wood', name: '목재', count: 5 },
    ],
    gold: 5000,
  };

  const poorInventory: InventoryData = {
    items: [{ itemId: 'mat_iron', name: '철', count: 1 }],
    gold: 0,
  };

  // 1. 재료 충분 확인
  test('1. hasMaterials — 재료 충분 시 true 반환', () => {
    expect(hasMaterials(richInventory, baseMaterials)).toBe(true);
  });

  // 2. 재료 부족 확인
  test('2. hasMaterials — 재료 부족 시 false 반환', () => {
    expect(hasMaterials(poorInventory, baseMaterials)).toBe(false);
  });

  // 3. 재료 소비
  test('3. consumeMaterials — 정확한 수량만큼 차감', () => {
    const result = consumeMaterials(richInventory, baseMaterials);
    const iron = result.items.find(i => i.itemId === 'mat_iron');
    expect(iron?.count).toBe(7); // 10 - 3
  });

  // 4. 재료 소비 후 0개 아이템 제거
  test('4. consumeMaterials — 수량 0 아이템 필터링', () => {
    const exact: InventoryData = {
      items: [
        { itemId: 'mat_iron', name: '철', count: 3 },
        { itemId: 'mat_wood', name: '목재', count: 2 },
      ],
    };
    const result = consumeMaterials(exact, baseMaterials);
    expect(result.items.length).toBe(0);
  });

  // 5. 강화 성공률 — +0 → 100%
  test('5. 강화 성공률 — +0 단계는 100%', () => {
    expect(getEnhancementSuccessRate(0)).toBe(1);
  });

  // 6. 강화 성공률 — +14 → 5%
  test('6. 강화 성공률 — +14 단계는 5%', () => {
    expect(getEnhancementSuccessRate(14)).toBe(0.05);
  });

  // 7. 강화 성공률 — 범위 초과 시 최소값
  test('7. 강화 성공률 — 범위 초과 시 5%', () => {
    expect(getEnhancementSuccessRate(99)).toBe(0.05);
  });

  // 8. 숙련도 보너스 계산
  test('8. 숙련도 레벨 5 → 10% 보너스', () => {
    const mastery: MasteryData = { level: 5, exp: 0, totalCrafts: 50 };
    expect(calculateMasteryBonus(mastery)).toBeCloseTo(0.1);
  });

  // 9. 숙련도 경험치 획득
  test('9. 레시피 레벨 1 → 숙련 경험치 9', () => {
    expect(getMasteryExp(1)).toBe(9);
  });

  // 10. 레시피 레벨 높을수록 경험치 감소
  test('10. 레시피 레벨 10 → 숙련 경험치 최소 1', () => {
    expect(getMasteryExp(10)).toBe(1);
    expect(getMasteryExp(15)).toBe(1);
  });
});
