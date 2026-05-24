/**
 * 유닛 테스트 — SYNC-131: SCENARIO_SHOP_CATEGORY_LABELS SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_SHOP_CATEGORY_LABELS,
  getShopCategoryLabel,
  listShopCategoriesSorted,
  type ShopCategoryKey,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly ShopCategoryKey[] = ['consumables', 'equipment', 'materials', 'quest_items', 'special'];

describe('SCENARIO_SHOP_CATEGORY_LABELS', () => {
  test('5 카테고리 모두 정의', () => {
    expect(SCENARIO_SHOP_CATEGORY_LABELS.length).toBe(5);
    for (const k of ALL) {
      expect(getShopCategoryLabel(k), k).toBeDefined();
    }
  });

  test('sortOrder 1~5 + 중복 없음', () => {
    const sorts = SCENARIO_SHOP_CATEGORY_LABELS.map((c) => c.sortOrder).sort((a, b) => a - b);
    expect(sorts).toEqual([1, 2, 3, 4, 5]);
  });

  test('label/description 비어 있지 않음', () => {
    for (const c of SCENARIO_SHOP_CATEGORY_LABELS) {
      expect(c.label.trim(), c.key).not.toBe('');
      expect(c.description.trim(), c.key).not.toBe('');
    }
  });

  test('listShopCategoriesSorted ascending', () => {
    const sorted = listShopCategoriesSorted();
    for (let i = 1; i < sorted.length; i += 1) {
      expect(sorted[i].sortOrder).toBeGreaterThan(sorted[i - 1].sortOrder);
    }
  });

  test('key 중복 없음', () => {
    const keys = SCENARIO_SHOP_CATEGORY_LABELS.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
