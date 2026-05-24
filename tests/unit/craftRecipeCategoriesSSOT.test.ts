/**
 * 유닛 테스트 — SYNC-158: SCENARIO_CRAFT_RECIPE_CATEGORIES SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_CRAFT_RECIPE_CATEGORIES,
  getCraftCategoryNarrative,
  listCraftCategoriesSorted,
  type CraftCategoryKey,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly CraftCategoryKey[] = ['weapon', 'armor', 'consumable', 'material'];

describe('SCENARIO_CRAFT_RECIPE_CATEGORIES', () => {
  test('4 카테고리 모두 정의', () => {
    expect(SCENARIO_CRAFT_RECIPE_CATEGORIES.length).toBe(4);
    for (const c of ALL) {
      expect(getCraftCategoryNarrative(c), c).toBeDefined();
    }
  });

  test('sortOrder 1~4 중복 없음', () => {
    const sorts = SCENARIO_CRAFT_RECIPE_CATEGORIES.map((c) => c.sortOrder).sort((a, b) => a - b);
    expect(sorts).toEqual([1, 2, 3, 4]);
  });

  test('label/inputHint/outputAnchor 비어 있지 않음', () => {
    for (const c of SCENARIO_CRAFT_RECIPE_CATEGORIES) {
      expect(c.label.trim(), c.category).not.toBe('');
      expect(c.inputHint.trim(), c.category).not.toBe('');
      expect(c.outputAnchor.trim(), c.category).not.toBe('');
    }
  });

  test('listCraftCategoriesSorted ascending', () => {
    const sorted = listCraftCategoriesSorted();
    for (let i = 1; i < sorted.length; i += 1) {
      expect(sorted[i].sortOrder).toBeGreaterThan(sorted[i - 1].sortOrder);
    }
  });

  test('category 중복 없음', () => {
    const cs = SCENARIO_CRAFT_RECIPE_CATEGORIES.map((c) => c.category);
    expect(new Set(cs).size).toBe(cs.length);
  });
});
