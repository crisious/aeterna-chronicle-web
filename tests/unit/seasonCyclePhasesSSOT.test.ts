/**
 * 유닛 테스트 — SYNC-221: SCENARIO_SEASON_CYCLE_PHASES SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_SEASON_CYCLE_PHASES,
  getSeasonCyclePhaseNarrative,
  getSeasonTotalDurationDays,
  type SeasonCyclePhase,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly SeasonCyclePhase[] = ['start', 'active', 'closing', 'break'];

describe('SCENARIO_SEASON_CYCLE_PHASES', () => {
  test('4 phase 모두 정의', () => {
    expect(SCENARIO_SEASON_CYCLE_PHASES.length).toBe(4);
    for (const p of ALL) {
      expect(getSeasonCyclePhaseNarrative(p), p).toBeDefined();
    }
  });

  test('durationDays 양의 정수', () => {
    for (const p of SCENARIO_SEASON_CYCLE_PHASES) {
      expect(p.durationDays, p.phase).toBeGreaterThan(0);
      expect(Number.isInteger(p.durationDays), p.phase).toBe(true);
    }
  });

  test('getSeasonTotalDurationDays 30일 (3+21+5+1)', () => {
    expect(getSeasonTotalDurationDays()).toBe(30);
  });

  test('label/recommendedAction 비어 있지 않음', () => {
    for (const p of SCENARIO_SEASON_CYCLE_PHASES) {
      expect(p.label.trim(), p.phase).not.toBe('');
      expect(p.recommendedAction.trim(), p.phase).not.toBe('');
    }
  });

  test('phase 중복 없음', () => {
    const ps = SCENARIO_SEASON_CYCLE_PHASES.map((p) => p.phase);
    expect(new Set(ps).size).toBe(ps.length);
  });
});
