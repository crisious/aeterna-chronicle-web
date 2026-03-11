/**
 * 제작 엔진 (P4-02)
 * - 레시피 조회 (카테고리 필터)
 * - 제작 실행 (재료 확인 → 성공률 판정 → 결과 아이템 생성)
 * - 강화 시스템 (+1~+15, 단계별 성공률 감소)
 * - 분해 (아이템 → 재료 일부 회수)
 * - 제작 숙련도 (제작 시마다 경험치, 레벨업 시 성공률 보너스)
 */

import { Prisma } from '@prisma/client';
import { prisma } from '../db';

// ─── 타입 정의 ──────────────────────────────────────────────

/** 재료 항목 */
interface MaterialEntry {
  itemId: string;
  name: string;
  count: number;
}

/** 인벤토리 아이템 */
interface InventoryItem {
  itemId: string;
  name: string;
  count: number;
  enhancement?: number; // 강화 수치
}

/** 인벤토리 전체 구조 */
interface InventoryData {
  items: InventoryItem[];
  gold?: number;
}

/** 숙련도 데이터 (Character.inventoryData 내 mastery 필드로 관리) */
interface MasteryData {
  level: number;
  exp: number;
  totalCrafts: number;
}

/** 제작 결과 */
interface CraftResult {
  success: boolean;
  resultItem: string | null;
  resultCount: number;
  materialsConsumed: MaterialEntry[];
  masteryExpGained: number;
  message: string;
}

/** 강화 결과 */
interface EnhanceResult {
  success: boolean;
  itemId: string;
  previousLevel: number;
  newLevel: number;
  message: string;
}

/** 분해 결과 */
interface DisassembleResult {
  success: boolean;
  recoveredMaterials: MaterialEntry[];
  message: string;
}

// ─── 강화 성공률 테이블 ─────────────────────────────────────

const ENHANCE_MAX_LEVEL = 15;

/** 강화 단계별 성공률 반환 */
function getEnhanceSuccessRate(currentLevel: number): number {
  if (currentLevel < 0 || currentLevel >= ENHANCE_MAX_LEVEL) return 0;
  if (currentLevel < 5) return 1.0;   // +1~+5: 100%
  if (currentLevel < 10) return 0.7;  // +6~+10: 70%
  return 0.3;                          // +11~+15: 30%
}

// ─── 숙련도 시스템 ──────────────────────────────────────────

/** 레벨업에 필요한 경험치 (레벨 × 100) */
function getMasteryExpRequired(level: number): number {
  return level * 100;
}

/** 숙련도 레벨에 따른 성공률 보너스 (레벨당 1%, 최대 10%) */
function getMasteryBonus(level: number): number {
  return Math.min(level * 0.01, 0.10);
}

// ─── 인벤토리 유틸리티 ──────────────────────────────────────

/** Character의 inventoryData에서 인벤토리 파싱 */
function parseInventory(inventoryData: unknown): InventoryData {
  if (!inventoryData || typeof inventoryData !== 'object') {
    return { items: [], gold: 0 };
  }
  const data = inventoryData as Record<string, unknown>;
  return {
    items: Array.isArray(data.items) ? (data.items as InventoryItem[]) : [],
    gold: typeof data.gold === 'number' ? data.gold : 0,
  };
}

/** Character의 inventoryData에서 숙련도 파싱 */
function parseMastery(inventoryData: unknown): MasteryData {
  if (!inventoryData || typeof inventoryData !== 'object') {
    return { level: 1, exp: 0, totalCrafts: 0 };
  }
  const data = inventoryData as Record<string, unknown>;
  if (data.mastery && typeof data.mastery === 'object') {
    const m = data.mastery as Record<string, unknown>;
    return {
      level: typeof m.level === 'number' ? m.level : 1,
      exp: typeof m.exp === 'number' ? m.exp : 0,
      totalCrafts: typeof m.totalCrafts === 'number' ? m.totalCrafts : 0,
    };
  }
  return { level: 1, exp: 0, totalCrafts: 0 };
}

/** 재료 보유 확인 */
function hasMaterials(inventory: InventoryData, materials: MaterialEntry[]): boolean {
  for (const mat of materials) {
    const owned = inventory.items.find(i => i.itemId === mat.itemId);
    if (!owned || owned.count < mat.count) return false;
  }
  return true;
}

/** 재료 차감 (뮤테이션) */
function consumeMaterials(inventory: InventoryData, materials: MaterialEntry[]): void {
  for (const mat of materials) {
    const owned = inventory.items.find(i => i.itemId === mat.itemId);
    if (owned) {
      owned.count -= mat.count;
      if (owned.count <= 0) {
        inventory.items = inventory.items.filter(i => i.itemId !== mat.itemId);
      }
    }
  }
}

/** 아이템 추가 (뮤테이션) */
function addItem(inventory: InventoryData, itemId: string, name: string, count: number): void {
  const existing = inventory.items.find(i => i.itemId === itemId);
  if (existing) {
    existing.count += count;
  } else {
    inventory.items.push({ itemId, name, count });
  }
}

// ─── 제작 엔진 ──────────────────────────────────────────────

export const craftEngine = {

  // ── 레시피 조회 ────────────────────────────────────────────

  /** 레시피 목록 (카테고리 필터 선택적) */
  async getRecipes(category?: string) {
    const where = category ? { category } : {};
    return prisma.recipe.findMany({ where, orderBy: { name: 'asc' } });
  },

  /** 레시피 상세 조회 */
  async getRecipeById(recipeId: string) {
    return prisma.recipe.findUnique({ where: { id: recipeId } });
  },

  // ── 제작 실행 ──────────────────────────────────────────────

  /** 제작 실행: 재료 확인 → 성공률 판정 → 결과 아이템 생성 */
  async executeCraft(userId: string, recipeId: string): Promise<CraftResult> {
    // 1) 레시피 조회
    const recipe = await prisma.recipe.findUnique({ where: { id: recipeId } });
    if (!recipe) {
      return { success: false, resultItem: null, resultCount: 0, materialsConsumed: [], masteryExpGained: 0, message: '존재하지 않는 레시피' };
    }
    if (!recipe.isUnlocked) {
      return { success: false, resultItem: null, resultCount: 0, materialsConsumed: [], masteryExpGained: 0, message: '잠긴 레시피' };
    }

    // 2) 캐릭터 조회 (첫 번째 캐릭터 사용)
    const character = await prisma.character.findFirst({ where: { userId } });
    if (!character) {
      return { success: false, resultItem: null, resultCount: 0, materialsConsumed: [], masteryExpGained: 0, message: '캐릭터 없음' };
    }
    if (character.level < recipe.requiredLevel) {
      return { success: false, resultItem: null, resultCount: 0, materialsConsumed: [], masteryExpGained: 0, message: `레벨 부족 (필요: ${recipe.requiredLevel}, 현재: ${character.level})` };
    }

    // 3) 인벤토리 & 숙련도 파싱
    const inventory = parseInventory(character.inventoryData);
    const mastery = parseMastery(character.inventoryData);
    const materials = recipe.materials as unknown as MaterialEntry[];

    // 4) 재료 확인
    if (!hasMaterials(inventory, materials)) {
      return { success: false, resultItem: null, resultCount: 0, materialsConsumed: [], masteryExpGained: 0, message: '재료 부족' };
    }

    // 5) 재료 차감 (성공 여부와 무관하게 소모)
    consumeMaterials(inventory, materials);

    // 6) 성공률 판정 (숙련도 보너스 적용)
    const masteryBonus = getMasteryBonus(mastery.level);
    const finalRate = Math.min(recipe.successRate + masteryBonus, 1.0);
    const roll = Math.random();
    const success = roll <= finalRate;

    // 7) 성공 시 결과 아이템 추가
    if (success) {
      addItem(inventory, recipe.resultItemId, recipe.name, recipe.resultCount);
    }

    // 8) 숙련도 경험치 부여 (성공/실패 모두 +10 exp)
    const expGain = 10;
    mastery.exp += expGain;
    mastery.totalCrafts += 1;
    const required = getMasteryExpRequired(mastery.level);
    if (mastery.exp >= required) {
      mastery.exp -= required;
      mastery.level += 1;
    }

    // 9) 인벤토리 + 숙련도 저장
    const updatedData = {
      ...(typeof character.inventoryData === 'object' && character.inventoryData !== null ? character.inventoryData as Record<string, unknown> : {}),
      items: inventory.items,
      gold: inventory.gold,
      mastery,
    };
    await prisma.character.update({
      where: { id: character.id },
      data: { inventoryData: JSON.parse(JSON.stringify(updatedData)) as Prisma.InputJsonValue },
    });

    // 10) 제작 로그 기록
    await prisma.craftLog.create({
      data: {
        userId,
        recipeId,
        success,
        resultItem: success ? recipe.resultItemId : null,
      },
    });

    return {
      success,
      resultItem: success ? recipe.resultItemId : null,
      resultCount: success ? recipe.resultCount : 0,
      materialsConsumed: materials,
      masteryExpGained: expGain,
      message: success ? `제작 성공: ${recipe.name}` : `제작 실패 (성공률: ${(finalRate * 100).toFixed(1)}%)`,
    };
  },

  // ── 강화 시스템 ────────────────────────────────────────────

  /** 강화 실행: +1~+15, 단계별 성공률 감소 */
  async enhance(userId: string, itemId: string): Promise<EnhanceResult> {
    const character = await prisma.character.findFirst({ where: { userId } });
    if (!character) {
      return { success: false, itemId, previousLevel: 0, newLevel: 0, message: '캐릭터 없음' };
    }

    const inventory = parseInventory(character.inventoryData);
    const item = inventory.items.find(i => i.itemId === itemId);
    if (!item) {
      return { success: false, itemId, previousLevel: 0, newLevel: 0, message: '아이템 없음' };
    }

    const currentLevel = item.enhancement ?? 0;
    if (currentLevel >= ENHANCE_MAX_LEVEL) {
      return { success: false, itemId, previousLevel: currentLevel, newLevel: currentLevel, message: `최대 강화 단계 (+${ENHANCE_MAX_LEVEL})` };
    }

    const rate = getEnhanceSuccessRate(currentLevel);
    const roll = Math.random();
    const success = roll <= rate;
    const previousLevel = currentLevel;

    if (success) {
      item.enhancement = currentLevel + 1;
    }

    // 인벤토리 저장
    const updatedData = {
      ...(typeof character.inventoryData === 'object' && character.inventoryData !== null ? character.inventoryData as Record<string, unknown> : {}),
      items: inventory.items,
    };
    await prisma.character.update({
      where: { id: character.id },
      data: { inventoryData: JSON.parse(JSON.stringify(updatedData)) as Prisma.InputJsonValue },
    });

    return {
      success,
      itemId,
      previousLevel,
      newLevel: success ? currentLevel + 1 : currentLevel,
      message: success
        ? `강화 성공: +${currentLevel + 1} (성공률: ${(rate * 100).toFixed(0)}%)`
        : `강화 실패 (성공률: ${(rate * 100).toFixed(0)}%)`,
    };
  },

  // ── 분해 시스템 ────────────────────────────────────────────

  /** 분해: 아이템 → 재료 일부 회수 (50% 확률로 각 재료 회수) */
  async disassemble(userId: string, itemId: string): Promise<DisassembleResult> {
    const character = await prisma.character.findFirst({ where: { userId } });
    if (!character) {
      return { success: false, recoveredMaterials: [], message: '캐릭터 없음' };
    }

    const inventory = parseInventory(character.inventoryData);
    const itemIndex = inventory.items.findIndex(i => i.itemId === itemId);
    if (itemIndex === -1) {
      return { success: false, recoveredMaterials: [], message: '아이템 없음' };
    }

    // 아이템에 대응하는 레시피 찾기 (resultItemId 매칭)
    const recipe = await prisma.recipe.findFirst({
      where: { resultItemId: itemId },
    });
    if (!recipe) {
      return { success: false, recoveredMaterials: [], message: '분해 불가능한 아이템 (레시피 없음)' };
    }

    // 아이템 제거 (1개)
    const item = inventory.items[itemIndex];
    if (item.count > 1) {
      item.count -= 1;
    } else {
      inventory.items.splice(itemIndex, 1);
    }

    // 재료 50% 회수 (각 재료별로 반올림)
    const materials = recipe.materials as unknown as MaterialEntry[];
    const recovered: MaterialEntry[] = [];
    for (const mat of materials) {
      const recoveredCount = Math.max(1, Math.ceil(mat.count * 0.5));
      addItem(inventory, mat.itemId, mat.name, recoveredCount);
      recovered.push({ itemId: mat.itemId, name: mat.name, count: recoveredCount });
    }

    // 인벤토리 저장
    const updatedData = {
      ...(typeof character.inventoryData === 'object' && character.inventoryData !== null ? character.inventoryData as Record<string, unknown> : {}),
      items: inventory.items,
    };
    await prisma.character.update({
      where: { id: character.id },
      data: { inventoryData: JSON.parse(JSON.stringify(updatedData)) as Prisma.InputJsonValue },
    });

    return {
      success: true,
      recoveredMaterials: recovered,
      message: `분해 완료: ${recipe.name} → 재료 ${recovered.length}종 회수`,
    };
  },

  // ── 제작 이력 ──────────────────────────────────────────────

  /** 유저의 제작 이력 조회 */
  async getCraftLog(userId: string, limit = 50) {
    return prisma.craftLog.findMany({
      where: { userId },
      orderBy: { craftedAt: 'desc' },
      take: limit,
    });
  },

  // ── 숙련도 조회 ────────────────────────────────────────────

  /** 유저의 제작 숙련도 조회 */
  async getMastery(userId: string): Promise<MasteryData & { bonusRate: number }> {
    const character = await prisma.character.findFirst({ where: { userId } });
    if (!character) {
      return { level: 1, exp: 0, totalCrafts: 0, bonusRate: 0 };
    }
    const mastery = parseMastery(character.inventoryData);
    return {
      ...mastery,
      bonusRate: getMasteryBonus(mastery.level),
    };
  },
};
