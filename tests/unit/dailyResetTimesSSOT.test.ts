/**
 * 유닛 테스트 — SYNC-238: SCENARIO_DAILY_RESET_TIMES SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_DAILY_RESET_TIMES,
  getDailyResetTimeNarrative,
  listDailyResetTimes,
  type DailyResetTimeKey,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly DailyResetTimeKey[] = ['dawn', 'morning', 'evening', 'midnight'];

describe('SCENARIO_DAILY_RESET_TIMES', () => {
  test('4 시간대 모두 정의', () => {
    expect(SCENARIO_DAILY_RESET_TIMES.length).toBe(4);
    for (const k of ALL) {
      expect(getDailyResetTimeNarrative(k), k).toBeDefined();
    }
  });

  test('hourKST 0~23 범위', () => {
    for (const t of SCENARIO_DAILY_RESET_TIMES) {
      expect(t.hourKST, t.key).toBeGreaterThanOrEqual(0);
      expect(t.hourKST, t.key).toBeLessThan(24);
    }
  });

  test('midnight 의 hourKST 는 0', () => {
    expect(getDailyResetTimeNarrative('midnight')?.hourKST).toBe(0);
  });

  test('label/resetTargets 비어 있지 않음', () => {
    for (const t of SCENARIO_DAILY_RESET_TIMES) {
      expect(t.label.trim(), t.key).not.toBe('');
      expect(t.resetTargets.length, t.key).toBeGreaterThan(0);
    }
  });

  test('hourKST 중복 없음', () => {
    const hours = SCENARIO_DAILY_RESET_TIMES.map((t) => t.hourKST);
    expect(new Set(hours).size).toBe(hours.length);
  });
});
