/**
 * 유닛 테스트 — SYNC-174: SCENARIO_DUNGEON_LAYOUT_PATTERNS SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_DUNGEON_LAYOUT_PATTERNS,
  getDungeonLayoutNarrative,
  listDungeonLayoutPatterns,
  type DungeonLayoutPattern,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly DungeonLayoutPattern[] = ['linear', 'branching', 'maze', 'circular'];

describe('SCENARIO_DUNGEON_LAYOUT_PATTERNS', () => {
  test('4 패턴 모두 정의', () => {
    expect(SCENARIO_DUNGEON_LAYOUT_PATTERNS.length).toBe(4);
    for (const p of ALL) {
      expect(getDungeonLayoutNarrative(p), p).toBeDefined();
    }
  });

  test('averageClearMinutes 양의 정수', () => {
    for (const p of SCENARIO_DUNGEON_LAYOUT_PATTERNS) {
      expect(p.averageClearMinutes, p.pattern).toBeGreaterThan(0);
      expect(Number.isInteger(p.averageClearMinutes), p.pattern).toBe(true);
    }
  });

  test('label/structureSummary/explorationHint 비어 있지 않음', () => {
    for (const p of SCENARIO_DUNGEON_LAYOUT_PATTERNS) {
      expect(p.label.trim(), p.pattern).not.toBe('');
      expect(p.structureSummary.trim(), p.pattern).not.toBe('');
      expect(p.explorationHint.trim(), p.pattern).not.toBe('');
    }
  });

  test('pattern 중복 없음', () => {
    const ps = SCENARIO_DUNGEON_LAYOUT_PATTERNS.map((p) => p.pattern);
    expect(new Set(ps).size).toBe(ps.length);
  });

  test('listDungeonLayoutPatterns 는 4 패턴', () => {
    expect(listDungeonLayoutPatterns()).toEqual(ALL);
  });
});
