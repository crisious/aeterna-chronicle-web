/**
 * 유닛 테스트 — SYNC-141: SCENARIO_STATUS_EFFECT_CATEGORIES SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_STATUS_EFFECT_CATEGORIES,
  getStatusEffectCategoryNarrative,
  listStatusEffectCategoriesByPriority,
  type StatusEffectCategory,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly StatusEffectCategory[] = ['buff', 'debuff', 'control', 'dot', 'special'];

describe('SCENARIO_STATUS_EFFECT_CATEGORIES', () => {
  test('5 카테고리 모두 정의', () => {
    expect(SCENARIO_STATUS_EFFECT_CATEGORIES.length).toBe(5);
    for (const c of ALL) {
      expect(getStatusEffectCategoryNarrative(c), c).toBeDefined();
    }
  });

  test('displayPriority 는 1~5 중복 없음', () => {
    const ps = SCENARIO_STATUS_EFFECT_CATEGORIES.map((c) => c.displayPriority).sort((a, b) => a - b);
    expect(ps).toEqual([1, 2, 3, 4, 5]);
  });

  test('uiColor 는 #rrggbb 형식', () => {
    const hex = /^#[0-9a-fA-F]{6}$/;
    for (const c of SCENARIO_STATUS_EFFECT_CATEGORIES) {
      expect(hex.test(c.uiColor), `${c.category}:${c.uiColor}`).toBe(true);
    }
  });

  test('label/description 비어 있지 않음', () => {
    for (const c of SCENARIO_STATUS_EFFECT_CATEGORIES) {
      expect(c.label.trim(), c.category).not.toBe('');
      expect(c.description.trim(), c.category).not.toBe('');
    }
  });

  test('listStatusEffectCategoriesByPriority ascending', () => {
    const sorted = listStatusEffectCategoriesByPriority();
    for (let i = 1; i < sorted.length; i += 1) {
      expect(sorted[i].displayPriority).toBeGreaterThan(sorted[i - 1].displayPriority);
    }
  });
});
