/**
 * 유닛 테스트 — SYNC-117: SCENARIO_CLASS_LEVEL_UP_NARRATIVES SSOT consistency
 *
 * 1) 6 클래스 × 3 milestone = 18 entry 모두 존재
 * 2) anchorLine/buildHint 비어 있지 않음
 * 3) (classKey, milestoneLevel) 조합 중복 없음
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_CLASS_LEVEL_UP_NARRATIVES,
  getClassLevelUpNarrative,
  listClassLevelUpNarratives,
  listClassMilestones,
  type ClassKey,
} from '../../shared/types/scenarioRegistry';

const ALL_CLASSES: readonly ClassKey[] = [
  'ether_knight',
  'memorist',
  'shadow_weaver',
  'memory_destroyer',
  'time_guardian',
  'void_wanderer',
];

describe('SCENARIO_CLASS_LEVEL_UP_NARRATIVES', () => {
  test('6 클래스 × 3 milestone = 18 entry 모두 존재한다', () => {
    expect(SCENARIO_CLASS_LEVEL_UP_NARRATIVES.length).toBe(18);
    for (const classKey of ALL_CLASSES) {
      for (const level of listClassMilestones()) {
        expect(getClassLevelUpNarrative(classKey, level), `${classKey}@${level}`).toBeDefined();
      }
    }
  });

  test('각 클래스는 정확히 3 milestone narrative 를 갖는다', () => {
    for (const classKey of ALL_CLASSES) {
      expect(listClassLevelUpNarratives(classKey).length, classKey).toBe(3);
    }
  });

  test('anchorLine/buildHint/className 모두 비어 있지 않다', () => {
    for (const n of SCENARIO_CLASS_LEVEL_UP_NARRATIVES) {
      expect(n.className.trim(), n.classKey).not.toBe('');
      expect(n.anchorLine.trim(), `${n.classKey}@${n.milestoneLevel}`).not.toBe('');
      expect(n.buildHint.trim(), `${n.classKey}@${n.milestoneLevel}`).not.toBe('');
    }
  });

  test('(classKey, milestoneLevel) 조합 중복 없음', () => {
    const keys = SCENARIO_CLASS_LEVEL_UP_NARRATIVES.map((n) => `${n.classKey}@${n.milestoneLevel}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test('milestoneLevel 은 10/20/30 안에 든다', () => {
    for (const n of SCENARIO_CLASS_LEVEL_UP_NARRATIVES) {
      expect([10, 20, 30], `${n.classKey}@${n.milestoneLevel}`).toContain(n.milestoneLevel);
    }
  });
});
