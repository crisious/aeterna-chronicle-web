/**
 * 유닛 테스트 — SYNC-187: SCENARIO_ACHIEVEMENT_CATEGORIES SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_ACHIEVEMENT_CATEGORIES,
  getAchievementCategoryNarrative,
  getTotalAchievementCount,
  type AchievementCategory,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly AchievementCategory[] = ['combat', 'story', 'exploration', 'collection'];

describe('SCENARIO_ACHIEVEMENT_CATEGORIES', () => {
  test('4 카테고리 모두 정의', () => {
    expect(SCENARIO_ACHIEVEMENT_CATEGORIES.length).toBe(4);
    for (const c of ALL) {
      expect(getAchievementCategoryNarrative(c), c).toBeDefined();
    }
  });

  test('averageCount 양의 정수', () => {
    for (const c of SCENARIO_ACHIEVEMENT_CATEGORIES) {
      expect(c.averageCount, c.category).toBeGreaterThan(0);
      expect(Number.isInteger(c.averageCount), c.category).toBe(true);
    }
  });

  test('label/icon/description 비어 있지 않음', () => {
    for (const c of SCENARIO_ACHIEVEMENT_CATEGORIES) {
      expect(c.label.trim(), c.category).not.toBe('');
      expect(c.icon.trim(), c.category).not.toBe('');
      expect(c.description.trim(), c.category).not.toBe('');
    }
  });

  test('icon 중복 없음', () => {
    const is = SCENARIO_ACHIEVEMENT_CATEGORIES.map((c) => c.icon);
    expect(new Set(is).size).toBe(is.length);
  });

  test('getTotalAchievementCount 합산 정확', () => {
    const expected = SCENARIO_ACHIEVEMENT_CATEGORIES.reduce((s, c) => s + c.averageCount, 0);
    expect(getTotalAchievementCount()).toBe(expected);
  });
});
