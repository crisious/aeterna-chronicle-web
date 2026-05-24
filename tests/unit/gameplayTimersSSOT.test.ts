/**
 * 유닛 테스트 — SYNC-201: SCENARIO_GAMEPLAY_TIMERS SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_GAMEPLAY_TIMERS,
  getGameplayTimerNarrative,
  listGameplayTimerKinds,
  type GameplayTimerKind,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly GameplayTimerKind[] = ['chapter', 'quest_deadline', 'boss_enrage', 'event_window'];

describe('SCENARIO_GAMEPLAY_TIMERS', () => {
  test('4 타이머 모두 정의', () => {
    expect(SCENARIO_GAMEPLAY_TIMERS.length).toBe(4);
    for (const t of ALL) {
      expect(getGameplayTimerNarrative(t), t).toBeDefined();
    }
  });

  test('defaultDurationMinutes 비음수', () => {
    for (const t of SCENARIO_GAMEPLAY_TIMERS) {
      expect(t.defaultDurationMinutes, t.timer).toBeGreaterThanOrEqual(0);
    }
  });

  test('label/expirationOutcome/displayHint 비어 있지 않음', () => {
    for (const t of SCENARIO_GAMEPLAY_TIMERS) {
      expect(t.label.trim(), t.timer).not.toBe('');
      expect(t.expirationOutcome.trim(), t.timer).not.toBe('');
      expect(t.displayHint.trim(), t.timer).not.toBe('');
    }
  });

  test('timer 중복 없음', () => {
    const ts = SCENARIO_GAMEPLAY_TIMERS.map((t) => t.timer);
    expect(new Set(ts).size).toBe(ts.length);
  });

  test('listGameplayTimerKinds 는 4 종', () => {
    expect(listGameplayTimerKinds()).toEqual(ALL);
  });
});
