/**
 * 유닛 테스트 — SYNC-178: SCENARIO_BUFF_DURATION_LEVELS SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_BUFF_DURATION_LEVELS,
  getBuffDurationLevelNarrative,
  classifyBuffDurationByTurns,
  type BuffDurationLevel,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly BuffDurationLevel[] = ['brief', 'short', 'medium', 'long'];

describe('SCENARIO_BUFF_DURATION_LEVELS', () => {
  test('4 분류 모두 정의', () => {
    expect(SCENARIO_BUFF_DURATION_LEVELS.length).toBe(4);
    for (const l of ALL) {
      expect(getBuffDurationLevelNarrative(l), l).toBeDefined();
    }
  });

  test('minTurns ≤ maxTurns, 단계 간 겹침 없음', () => {
    const sorted = [...SCENARIO_BUFF_DURATION_LEVELS].sort((a, b) => a.minTurns - b.minTurns);
    for (let i = 0; i < sorted.length; i += 1) {
      expect(sorted[i].minTurns, sorted[i].level).toBeLessThanOrEqual(sorted[i].maxTurns);
      if (i > 0) {
        expect(sorted[i].minTurns, sorted[i].level).toBeGreaterThan(sorted[i - 1].maxTurns);
      }
    }
  });

  test('classifyBuffDurationByTurns 경계값', () => {
    expect(classifyBuffDurationByTurns(1)?.level).toBe('brief');
    expect(classifyBuffDurationByTurns(2)?.level).toBe('brief');
    expect(classifyBuffDurationByTurns(3)?.level).toBe('short');
    expect(classifyBuffDurationByTurns(5)?.level).toBe('short');
    expect(classifyBuffDurationByTurns(6)?.level).toBe('medium');
    expect(classifyBuffDurationByTurns(10)?.level).toBe('medium');
    expect(classifyBuffDurationByTurns(11)?.level).toBe('long');
    expect(classifyBuffDurationByTurns(30)?.level).toBe('long');
  });

  test('label/uiHint 비어 있지 않음', () => {
    for (const l of SCENARIO_BUFF_DURATION_LEVELS) {
      expect(l.label.trim(), l.level).not.toBe('');
      expect(l.uiHint.trim(), l.level).not.toBe('');
    }
  });

  test('level 중복 없음', () => {
    const ls = SCENARIO_BUFF_DURATION_LEVELS.map((l) => l.level);
    expect(new Set(ls).size).toBe(ls.length);
  });
});
