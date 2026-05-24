/**
 * 유닛 테스트 — SYNC-184: SCENARIO_OPTION_CATEGORIES SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_OPTION_CATEGORIES,
  getOptionMenuCategory,
  listOptionMenuCategoriesSorted,
  type OptionMenuCategoryKey,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly OptionMenuCategoryKey[] = ['game', 'audio', 'graphics', 'accessibility'];

describe('SCENARIO_OPTION_CATEGORIES', () => {
  test('4 카테고리 모두 정의', () => {
    expect(SCENARIO_OPTION_CATEGORIES.length).toBe(4);
    for (const c of ALL) {
      expect(getOptionMenuCategory(c), c).toBeDefined();
    }
  });

  test('sortOrder 1~4 중복 없음', () => {
    const sorts = SCENARIO_OPTION_CATEGORIES.map((c) => c.sortOrder).sort((a, b) => a - b);
    expect(sorts).toEqual([1, 2, 3, 4]);
  });

  test('itemCountHint 양의 정수', () => {
    for (const c of SCENARIO_OPTION_CATEGORIES) {
      expect(c.itemCountHint, c.category).toBeGreaterThan(0);
      expect(Number.isInteger(c.itemCountHint), c.category).toBe(true);
    }
  });

  test('label/description 비어 있지 않음', () => {
    for (const c of SCENARIO_OPTION_CATEGORIES) {
      expect(c.label.trim(), c.category).not.toBe('');
      expect(c.description.trim(), c.category).not.toBe('');
    }
  });

  test('listOptionMenuCategoriesSorted ascending', () => {
    const sorted = listOptionMenuCategoriesSorted();
    for (let i = 1; i < sorted.length; i += 1) {
      expect(sorted[i].sortOrder).toBeGreaterThan(sorted[i - 1].sortOrder);
    }
  });
});
