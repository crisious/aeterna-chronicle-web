/**
 * 유닛 테스트 — SYNC-198: SCENARIO_PERFORMANCE_BUDGETS SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_PERFORMANCE_BUDGETS,
  getPerformanceBudgetNarrative,
  evaluateBudgetStatus,
  type PerformanceBudgetCategory,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly PerformanceBudgetCategory[] = ['cpu', 'gpu', 'memory', 'network'];

describe('SCENARIO_PERFORMANCE_BUDGETS', () => {
  test('4 카테고리 모두 정의', () => {
    expect(SCENARIO_PERFORMANCE_BUDGETS.length).toBe(4);
    for (const c of ALL) {
      expect(getPerformanceBudgetNarrative(c), c).toBeDefined();
    }
  });

  test('warning < critical 임계값', () => {
    for (const b of SCENARIO_PERFORMANCE_BUDGETS) {
      expect(b.warningThreshold, b.category).toBeLessThan(b.criticalThreshold);
    }
  });

  test('evaluateBudgetStatus 경계값', () => {
    expect(evaluateBudgetStatus('cpu', 50)).toBe('normal');
    expect(evaluateBudgetStatus('cpu', 70)).toBe('warning');
    expect(evaluateBudgetStatus('cpu', 90)).toBe('critical');
    expect(evaluateBudgetStatus('memory', 1000)).toBe('normal');
    expect(evaluateBudgetStatus('memory', 3500)).toBe('critical');
  });

  test('label/unit 비어 있지 않음', () => {
    for (const b of SCENARIO_PERFORMANCE_BUDGETS) {
      expect(b.label.trim(), b.category).not.toBe('');
      expect(b.unit.trim(), b.category).not.toBe('');
    }
  });

  test('category 중복 없음', () => {
    const cs = SCENARIO_PERFORMANCE_BUDGETS.map((b) => b.category);
    expect(new Set(cs).size).toBe(cs.length);
  });
});
