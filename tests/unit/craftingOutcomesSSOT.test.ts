/**
 * 유닛 테스트 — SYNC-179: SCENARIO_CRAFTING_OUTCOMES SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_CRAFTING_OUTCOMES,
  getCraftingOutcomeNarrative,
  getTotalCraftingProbability,
  type CraftingOutcomeKind,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly CraftingOutcomeKind[] = ['success', 'crit_success', 'failure', 'crit_failure', 'breakthrough'];

describe('SCENARIO_CRAFTING_OUTCOMES', () => {
  test('5 결과 모두 정의', () => {
    expect(SCENARIO_CRAFTING_OUTCOMES.length).toBe(5);
    for (const o of ALL) {
      expect(getCraftingOutcomeNarrative(o), o).toBeDefined();
    }
  });

  test('baseProbability 합산은 ~1.0 (확률 분포)', () => {
    const total = getTotalCraftingProbability();
    expect(total).toBeCloseTo(1.0, 5);
  });

  test('각 baseProbability 는 0~1 범위', () => {
    for (const o of SCENARIO_CRAFTING_OUTCOMES) {
      expect(o.baseProbability, o.outcome).toBeGreaterThan(0);
      expect(o.baseProbability, o.outcome).toBeLessThanOrEqual(1);
    }
  });

  test('label/outcomeAnchor/resourceImpact 비어 있지 않음', () => {
    for (const o of SCENARIO_CRAFTING_OUTCOMES) {
      expect(o.label.trim(), o.outcome).not.toBe('');
      expect(o.outcomeAnchor.trim(), o.outcome).not.toBe('');
      expect(o.resourceImpact.trim(), o.outcome).not.toBe('');
    }
  });

  test('outcome 중복 없음', () => {
    const os = SCENARIO_CRAFTING_OUTCOMES.map((o) => o.outcome);
    expect(new Set(os).size).toBe(os.length);
  });
});
