/**
 * 유닛 테스트 — SYNC-209: SCENARIO_USER_FEEDBACK_CATEGORIES SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_USER_FEEDBACK_CATEGORIES,
  getUserFeedbackCategoryNarrative,
  listUserFeedbackCategoriesByPriority,
  type UserFeedbackCategory,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly UserFeedbackCategory[] = ['bug', 'balance', 'feature', 'translation', 'praise'];

describe('SCENARIO_USER_FEEDBACK_CATEGORIES', () => {
  test('5 카테고리 모두 정의', () => {
    expect(SCENARIO_USER_FEEDBACK_CATEGORIES.length).toBe(5);
    for (const c of ALL) {
      expect(getUserFeedbackCategoryNarrative(c), c).toBeDefined();
    }
  });

  test('priority 1~4 범위', () => {
    for (const c of SCENARIO_USER_FEEDBACK_CATEGORIES) {
      expect(c.priority, c.category).toBeGreaterThanOrEqual(1);
      expect(c.priority, c.category).toBeLessThanOrEqual(4);
    }
  });

  test('bug 카테고리는 priority 1 (최고)', () => {
    expect(getUserFeedbackCategoryNarrative('bug')?.priority).toBe(1);
  });

  test('label/routingDestination/placeholderHint 비어 있지 않음', () => {
    for (const c of SCENARIO_USER_FEEDBACK_CATEGORIES) {
      expect(c.label.trim(), c.category).not.toBe('');
      expect(c.routingDestination.trim(), c.category).not.toBe('');
      expect(c.placeholderHint.trim(), c.category).not.toBe('');
    }
  });

  test('listUserFeedbackCategoriesByPriority ascending', () => {
    const sorted = listUserFeedbackCategoriesByPriority();
    for (let i = 1; i < sorted.length; i += 1) {
      expect(sorted[i].priority).toBeGreaterThanOrEqual(sorted[i - 1].priority);
    }
  });
});
