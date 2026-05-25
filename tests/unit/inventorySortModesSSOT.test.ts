/**
 * 유닛 테스트 — SYNC-247: SCENARIO_INVENTORY_SORT_MODES SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_INVENTORY_SORT_MODES,
  getInventorySortModeNarrative,
  listInventorySortModes,
  type InventorySortMode,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly InventorySortMode[] = ['rarity', 'level', 'recent', 'name', 'value'];

describe('SCENARIO_INVENTORY_SORT_MODES', () => {
  test('5 모드 모두 정의', () => {
    expect(SCENARIO_INVENTORY_SORT_MODES.length).toBe(5);
    for (const m of ALL) {
      expect(getInventorySortModeNarrative(m), m).toBeDefined();
    }
  });

  test('direction 은 asc 또는 desc', () => {
    for (const m of SCENARIO_INVENTORY_SORT_MODES) {
      expect(['asc', 'desc'].includes(m.direction), m.mode).toBe(true);
    }
  });

  test('popularityScore 1~5 범위', () => {
    for (const m of SCENARIO_INVENTORY_SORT_MODES) {
      expect(m.popularityScore, m.mode).toBeGreaterThanOrEqual(1);
      expect(m.popularityScore, m.mode).toBeLessThanOrEqual(5);
    }
  });

  test('rarity 가 최고 인기 점수', () => {
    const rarity = getInventorySortModeNarrative('rarity')!;
    for (const m of SCENARIO_INVENTORY_SORT_MODES) {
      expect(rarity.popularityScore, m.mode).toBeGreaterThanOrEqual(m.popularityScore);
    }
  });

  test('mode 중복 없음', () => {
    const ks = SCENARIO_INVENTORY_SORT_MODES.map((m) => m.mode);
    expect(new Set(ks).size).toBe(ks.length);
  });

  test('listInventorySortModes 5 항목', () => {
    expect(listInventorySortModes().length).toBe(5);
  });
});
