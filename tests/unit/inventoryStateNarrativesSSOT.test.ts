/**
 * 유닛 테스트 — SYNC-124: SCENARIO_INVENTORY_STATE_NARRATIVES SSOT consistency
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_INVENTORY_STATE_NARRATIVES,
  getInventoryStateNarrative,
  getInventoryStateByOccupancy,
  type InventoryState,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly InventoryState[] = ['empty', 'normal', 'heavy', 'full'];

describe('SCENARIO_INVENTORY_STATE_NARRATIVES', () => {
  test('4 상태 모두 정의', () => {
    expect(SCENARIO_INVENTORY_STATE_NARRATIVES.length).toBe(4);
    for (const s of ALL) {
      expect(getInventoryStateNarrative(s), s).toBeDefined();
    }
  });

  test('minOccupancyPercent 오름차순: empty < normal < heavy < full', () => {
    const by = (s: InventoryState) => getInventoryStateNarrative(s)?.minOccupancyPercent ?? Number.NaN;
    expect(by('empty')).toBeLessThan(by('normal'));
    expect(by('normal')).toBeLessThan(by('heavy'));
    expect(by('heavy')).toBeLessThan(by('full'));
  });

  test('getInventoryStateByOccupancy 경계 점수', () => {
    expect(getInventoryStateByOccupancy(0).state).toBe('empty');
    expect(getInventoryStateByOccupancy(24).state).toBe('empty');
    expect(getInventoryStateByOccupancy(25).state).toBe('normal');
    expect(getInventoryStateByOccupancy(74).state).toBe('normal');
    expect(getInventoryStateByOccupancy(75).state).toBe('heavy');
    expect(getInventoryStateByOccupancy(94).state).toBe('heavy');
    expect(getInventoryStateByOccupancy(95).state).toBe('full');
    expect(getInventoryStateByOccupancy(100).state).toBe('full');
  });

  test('label/enterLine/modifierHint 비어 있지 않음', () => {
    for (const n of SCENARIO_INVENTORY_STATE_NARRATIVES) {
      expect(n.label.trim(), n.state).not.toBe('');
      expect(n.enterLine.trim(), n.state).not.toBe('');
      expect(n.modifierHint.trim(), n.state).not.toBe('');
    }
  });

  test('state 중복 없음', () => {
    const ss = SCENARIO_INVENTORY_STATE_NARRATIVES.map((n) => n.state);
    expect(new Set(ss).size).toBe(ss.length);
  });
});
