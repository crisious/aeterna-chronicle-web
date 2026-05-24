/**
 * 유닛 테스트 — SYNC-213: SCENARIO_PUSH_NOTIFICATION_CATEGORIES SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_PUSH_NOTIFICATION_CATEGORIES,
  getPushNotificationCategoryNarrative,
  listPushNotificationCategories,
  type PushNotificationCategory,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly PushNotificationCategory[] = ['event', 'friend', 'quest', 'system'];

describe('SCENARIO_PUSH_NOTIFICATION_CATEGORIES', () => {
  test('4 카테고리 모두 정의', () => {
    expect(SCENARIO_PUSH_NOTIFICATION_CATEGORIES.length).toBe(4);
    for (const c of ALL) {
      expect(getPushNotificationCategoryNarrative(c), c).toBeDefined();
    }
  });

  test('dailyMaxCount 양의 정수', () => {
    for (const c of SCENARIO_PUSH_NOTIFICATION_CATEGORIES) {
      expect(c.dailyMaxCount, c.category).toBeGreaterThan(0);
      expect(Number.isInteger(c.dailyMaxCount), c.category).toBe(true);
    }
  });

  test('quest 만 기본 opt-out (스팸 방지)', () => {
    expect(getPushNotificationCategoryNarrative('quest')?.defaultOptIn).toBe(false);
  });

  test('label/exampleMessage 비어 있지 않음', () => {
    for (const c of SCENARIO_PUSH_NOTIFICATION_CATEGORIES) {
      expect(c.label.trim(), c.category).not.toBe('');
      expect(c.exampleMessage.trim(), c.category).not.toBe('');
    }
  });

  test('category 중복 없음', () => {
    const cs = SCENARIO_PUSH_NOTIFICATION_CATEGORIES.map((c) => c.category);
    expect(new Set(cs).size).toBe(cs.length);
  });
});
