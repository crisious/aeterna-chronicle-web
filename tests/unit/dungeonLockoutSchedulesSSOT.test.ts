/**
 * 유닛 테스트 — SYNC-256: SCENARIO_DUNGEON_LOCKOUT_SCHEDULES SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_DUNGEON_LOCKOUT_SCHEDULES,
  getDungeonLockoutScheduleNarrative,
  listDungeonLockoutSchedules,
  type DungeonLockoutSchedule,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly DungeonLockoutSchedule[] = ['daily', 'weekly', 'biweekly', 'seasonal'];

describe('SCENARIO_DUNGEON_LOCKOUT_SCHEDULES', () => {
  test('4 일정 모두 정의', () => {
    expect(SCENARIO_DUNGEON_LOCKOUT_SCHEDULES.length).toBe(4);
    for (const s of ALL) {
      expect(getDungeonLockoutScheduleNarrative(s), s).toBeDefined();
    }
  });

  test('resetHours 단조 증가', () => {
    const order: readonly DungeonLockoutSchedule[] = ['daily', 'weekly', 'biweekly', 'seasonal'];
    for (let i = 1; i < order.length; i += 1) {
      const prev = getDungeonLockoutScheduleNarrative(order[i - 1])!;
      const cur = getDungeonLockoutScheduleNarrative(order[i])!;
      expect(cur.resetHours, `${order[i - 1]}->${order[i]}`).toBeGreaterThan(prev.resetHours);
    }
  });

  test('rewardMultiplier 단조 증가', () => {
    const order: readonly DungeonLockoutSchedule[] = ['daily', 'weekly', 'biweekly', 'seasonal'];
    for (let i = 1; i < order.length; i += 1) {
      const prev = getDungeonLockoutScheduleNarrative(order[i - 1])!;
      const cur = getDungeonLockoutScheduleNarrative(order[i])!;
      expect(cur.rewardMultiplier, `${order[i - 1]}->${order[i]}`).toBeGreaterThan(prev.rewardMultiplier);
    }
  });

  test('resetHours 는 24의 배수 (정수 일)', () => {
    for (const d of SCENARIO_DUNGEON_LOCKOUT_SCHEDULES) {
      expect(d.resetHours % 24, d.schedule).toBe(0);
    }
  });

  test('schedule 중복 없음', () => {
    const ks = SCENARIO_DUNGEON_LOCKOUT_SCHEDULES.map((d) => d.schedule);
    expect(new Set(ks).size).toBe(ks.length);
  });

  test('listDungeonLockoutSchedules 4 항목', () => {
    expect(listDungeonLockoutSchedules().length).toBe(4);
  });
});
