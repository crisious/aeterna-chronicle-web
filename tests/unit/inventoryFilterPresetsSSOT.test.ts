/**
 * 유닛 테스트 — SYNC-202: SCENARIO_INVENTORY_FILTER_PRESETS SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_INVENTORY_FILTER_PRESETS,
  getInventoryFilterPresetNarrative,
  listInventoryFilterPresets,
  type InventoryFilterPreset,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly InventoryFilterPreset[] = ['all', 'equippable', 'consumable', 'quest', 'new'];

describe('SCENARIO_INVENTORY_FILTER_PRESETS', () => {
  test('5 프리셋 모두 정의', () => {
    expect(SCENARIO_INVENTORY_FILTER_PRESETS.length).toBe(5);
    for (const p of ALL) {
      expect(getInventoryFilterPresetNarrative(p), p).toBeDefined();
    }
  });

  test('all 프리셋만 defaultActive true', () => {
    const activeCount = SCENARIO_INVENTORY_FILTER_PRESETS.filter((p) => p.defaultActive).length;
    expect(activeCount).toBe(1);
    expect(getInventoryFilterPresetNarrative('all')?.defaultActive).toBe(true);
  });

  test('label/filterCondition 비어 있지 않음', () => {
    for (const p of SCENARIO_INVENTORY_FILTER_PRESETS) {
      expect(p.label.trim(), p.preset).not.toBe('');
      expect(p.filterCondition.trim(), p.preset).not.toBe('');
    }
  });

  test('preset 중복 없음', () => {
    const ps = SCENARIO_INVENTORY_FILTER_PRESETS.map((p) => p.preset);
    expect(new Set(ps).size).toBe(ps.length);
  });

  test('listInventoryFilterPresets 는 5 프리셋', () => {
    expect(listInventoryFilterPresets()).toEqual(ALL);
  });
});
