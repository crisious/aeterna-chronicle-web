/**
 * 유닛 테스트 — SYNC-121: SCENARIO_DAY_PHASE_NARRATIVES SSOT consistency
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_DAY_PHASE_NARRATIVES,
  getDayPhaseNarrative,
  listDayPhases,
  type DayPhase,
} from '../../shared/types/scenarioRegistry';

const PHASES: readonly DayPhase[] = ['dawn', 'day', 'dusk', 'night'];

describe('SCENARIO_DAY_PHASE_NARRATIVES', () => {
  test('4 시간대 모두 정의', () => {
    expect(SCENARIO_DAY_PHASE_NARRATIVES.length).toBe(4);
    for (const p of PHASES) {
      expect(getDayPhaseNarrative(p), p).toBeDefined();
    }
  });

  test('label/enterLine/modifierHint 비어 있지 않음', () => {
    for (const n of SCENARIO_DAY_PHASE_NARRATIVES) {
      expect(n.label.trim(), n.phase).not.toBe('');
      expect(n.enterLine.trim(), n.phase).not.toBe('');
      expect(n.modifierHint.trim(), n.phase).not.toBe('');
    }
  });

  test('listDayPhases 는 4 phase 순서 반환', () => {
    expect(listDayPhases()).toEqual(PHASES);
  });

  test('phase 중복 없음', () => {
    const phases = SCENARIO_DAY_PHASE_NARRATIVES.map((n) => n.phase);
    expect(new Set(phases).size).toBe(phases.length);
  });
});
