/**
 * 유닛 테스트 — SYNC-220: 🎯 10 sprint (211~220) 누적 stress + CALENDAR_EVENT_TYPES
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_NETWORK_REGION_LABELS,
  SCENARIO_FRIEND_STATUS_LABELS,
  SCENARIO_PUSH_NOTIFICATION_CATEGORIES,
  SCENARIO_LEADERBOARD_CATEGORIES,
  SCENARIO_PVP_RANK_TIERS,
  SCENARIO_TRADE_OFFER_STATUSES,
  SCENARIO_MOUNT_TYPES,
  SCENARIO_FRIENDSHIP_LEVELS,
  SCENARIO_SHOP_REFRESH_INTERVALS,
  SCENARIO_CALENDAR_EVENT_TYPES,
  getCalendarEventTypeNarrative,
  listCalendarEventTypesByPriority,
  type CalendarEventType,
} from '../../shared/types/scenarioRegistry';

const EVENTS: readonly CalendarEventType[] = ['seasonal', 'weekly_challenge', 'community', 'maintenance', 'lore'];

describe('SYNC-220 🎯 10 sprint 누적 stress', () => {
  test('CALENDAR_EVENT_TYPES — 5 이벤트 매칭', () => {
    expect(SCENARIO_CALENDAR_EVENT_TYPES.length).toBe(5);
    for (const e of EVENTS) {
      const n = getCalendarEventTypeNarrative(e);
      expect(n, e).toBeDefined();
      expect(n?.label.trim(), e).not.toBe('');
      expect(n?.description.trim(), e).not.toBe('');
      expect(n?.averageDurationDays, e).toBeGreaterThan(0);
    }
  });

  test('listCalendarEventTypesByPriority ascending', () => {
    const sorted = listCalendarEventTypesByPriority();
    for (let i = 1; i < sorted.length; i += 1) {
      expect(sorted[i].notificationPriority).toBeGreaterThanOrEqual(sorted[i - 1].notificationPriority);
    }
  });

  test('sync-211~220 신규 도메인 10종 entry count 정합', () => {
    expect(SCENARIO_NETWORK_REGION_LABELS.length).toBe(5);
    expect(SCENARIO_FRIEND_STATUS_LABELS.length).toBe(4);
    expect(SCENARIO_PUSH_NOTIFICATION_CATEGORIES.length).toBe(4);
    expect(SCENARIO_LEADERBOARD_CATEGORIES.length).toBe(5);
    expect(SCENARIO_PVP_RANK_TIERS.length).toBe(6);
    expect(SCENARIO_TRADE_OFFER_STATUSES.length).toBe(4);
    expect(SCENARIO_MOUNT_TYPES.length).toBe(5);
    expect(SCENARIO_FRIENDSHIP_LEVELS.length).toBe(5);
    expect(SCENARIO_SHOP_REFRESH_INTERVALS.length).toBe(4);
    expect(SCENARIO_CALENDAR_EVENT_TYPES.length).toBe(5);
  });

  test('sync-211~220 누적 47 entry 확보', () => {
    const total =
      SCENARIO_NETWORK_REGION_LABELS.length +
      SCENARIO_FRIEND_STATUS_LABELS.length +
      SCENARIO_PUSH_NOTIFICATION_CATEGORIES.length +
      SCENARIO_LEADERBOARD_CATEGORIES.length +
      SCENARIO_PVP_RANK_TIERS.length +
      SCENARIO_TRADE_OFFER_STATUSES.length +
      SCENARIO_MOUNT_TYPES.length +
      SCENARIO_FRIENDSHIP_LEVELS.length +
      SCENARIO_SHOP_REFRESH_INTERVALS.length +
      SCENARIO_CALENDAR_EVENT_TYPES.length;
    expect(total).toBe(47);
  });
});
