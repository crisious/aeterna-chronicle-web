/**
 * 유닛 테스트 — SYNC-199: SCENARIO_ASSET_LOAD_PRIORITIES SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_ASSET_LOAD_PRIORITIES,
  getAssetLoadPriorityNarrative,
  listAssetLoadPrioritiesByOrder,
  type AssetLoadPriority,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly AssetLoadPriority[] = ['critical', 'high', 'medium', 'low', 'lazy'];

describe('SCENARIO_ASSET_LOAD_PRIORITIES', () => {
  test('5 우선순위 모두 정의', () => {
    expect(SCENARIO_ASSET_LOAD_PRIORITIES.length).toBe(5);
    for (const p of ALL) {
      expect(getAssetLoadPriorityNarrative(p), p).toBeDefined();
    }
  });

  test('order 1~5 중복 없음', () => {
    const orders = SCENARIO_ASSET_LOAD_PRIORITIES.map((p) => p.order).sort((a, b) => a - b);
    expect(orders).toEqual([1, 2, 3, 4, 5]);
  });

  test('listAssetLoadPrioritiesByOrder ascending', () => {
    const sorted = listAssetLoadPrioritiesByOrder();
    for (let i = 1; i < sorted.length; i += 1) {
      expect(sorted[i].order).toBeGreaterThan(sorted[i - 1].order);
    }
  });

  test('label/loadingTimingHint/exampleAssets 비어 있지 않음', () => {
    for (const p of SCENARIO_ASSET_LOAD_PRIORITIES) {
      expect(p.label.trim(), p.priority).not.toBe('');
      expect(p.loadingTimingHint.trim(), p.priority).not.toBe('');
      expect(p.exampleAssets.trim(), p.priority).not.toBe('');
    }
  });

  test('priority 중복 없음', () => {
    const ps = SCENARIO_ASSET_LOAD_PRIORITIES.map((p) => p.priority);
    expect(new Set(ps).size).toBe(ps.length);
  });
});
