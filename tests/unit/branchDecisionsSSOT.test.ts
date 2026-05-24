/**
 * 유닛 테스트 — SYNC-156: SCENARIO_BRANCH_DECISIONS SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_ZONES,
  SCENARIO_BRANCH_DECISIONS,
  getBranchDecision,
  listBranchDecisionsByChapter,
  type BranchDecisionId,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly BranchDecisionId[] = [
  'bernardo_trust', 'kane_judgment', 'elfaris_diplomacy', 'lethe_sealing_method',
];

describe('SCENARIO_BRANCH_DECISIONS', () => {
  test('4 분기 모두 정의', () => {
    expect(SCENARIO_BRANCH_DECISIONS.length).toBe(4);
    for (const id of ALL) {
      expect(getBranchDecision(id), id).toBeDefined();
    }
  });

  test('zoneObsidianId 는 SCENARIO_ZONES 내', () => {
    const validZones = new Set(SCENARIO_ZONES.map((z) => z.obsidianId));
    for (const d of SCENARIO_BRANCH_DECISIONS) {
      expect(validZones.has(d.zoneObsidianId), d.decisionId).toBe(true);
    }
  });

  test('options 는 정확히 2 개, 각각 본문 비어 있지 않음', () => {
    for (const d of SCENARIO_BRANCH_DECISIONS) {
      expect(d.options.length, d.decisionId).toBe(2);
      for (const o of d.options) {
        expect(o.label.trim(), d.decisionId).not.toBe('');
        expect(o.outcomeLine.trim(), d.decisionId).not.toBe('');
        expect(o.metricImpact.trim(), d.decisionId).not.toBe('');
      }
    }
  });

  test('promptLine 비어 있지 않음, chapter 1~5', () => {
    for (const d of SCENARIO_BRANCH_DECISIONS) {
      expect(d.promptLine.trim(), d.decisionId).not.toBe('');
      expect([1, 2, 3, 4, 5], d.decisionId).toContain(d.chapter);
    }
  });

  test('listBranchDecisionsByChapter 합산은 전체와 일치', () => {
    let total = 0;
    for (let ch = 1; ch <= 5; ch += 1) {
      total += listBranchDecisionsByChapter(ch).length;
    }
    expect(total).toBe(SCENARIO_BRANCH_DECISIONS.length);
  });
});
