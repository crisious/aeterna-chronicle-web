/**
 * 유닛 테스트 — SYNC-173: SCENARIO_NPC_PATROL_PATTERNS SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_NPC_PATROL_PATTERNS,
  getNpcPatrolPatternNarrative,
  listNpcPatrolPatterns,
  type NpcPatrolPattern,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly NpcPatrolPattern[] = ['stationary', 'circular', 'random', 'follow_target', 'scheduled'];

describe('SCENARIO_NPC_PATROL_PATTERNS', () => {
  test('5 패턴 모두 정의', () => {
    expect(SCENARIO_NPC_PATROL_PATTERNS.length).toBe(5);
    for (const p of ALL) {
      expect(getNpcPatrolPatternNarrative(p), p).toBeDefined();
    }
  });

  test('label/description/stealthHint/applicableNpcTypes 비어 있지 않음', () => {
    for (const p of SCENARIO_NPC_PATROL_PATTERNS) {
      expect(p.label.trim(), p.pattern).not.toBe('');
      expect(p.description.trim(), p.pattern).not.toBe('');
      expect(p.stealthHint.trim(), p.pattern).not.toBe('');
      expect(p.applicableNpcTypes.trim(), p.pattern).not.toBe('');
    }
  });

  test('pattern 중복 없음', () => {
    const ps = SCENARIO_NPC_PATROL_PATTERNS.map((p) => p.pattern);
    expect(new Set(ps).size).toBe(ps.length);
  });

  test('listNpcPatrolPatterns 는 5 패턴', () => {
    expect(listNpcPatrolPatterns()).toEqual(ALL);
  });
});
