/**
 * 유닛 테스트 — SYNC-147: SCENARIO_MAP_LEGEND_ENTRIES SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_MAP_LEGEND_ENTRIES,
  getMapLegendEntry,
  listMapLegendKinds,
  type MapLegendKind,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly MapLegendKind[] = [
  'zone_marker', 'quest_npc', 'boss', 'treasure', 'save_point', 'fast_travel', 'danger_zone',
];

describe('SCENARIO_MAP_LEGEND_ENTRIES', () => {
  test('7 종 모두 정의', () => {
    expect(SCENARIO_MAP_LEGEND_ENTRIES.length).toBe(7);
    for (const k of ALL) {
      expect(getMapLegendEntry(k), k).toBeDefined();
    }
  });

  test('label/icon/description 비어 있지 않음', () => {
    for (const e of SCENARIO_MAP_LEGEND_ENTRIES) {
      expect(e.label.trim(), e.kind).not.toBe('');
      expect(e.icon.trim(), e.kind).not.toBe('');
      expect(e.description.trim(), e.kind).not.toBe('');
    }
  });

  test('icon 중복 없음 (UI 구분)', () => {
    const icons = SCENARIO_MAP_LEGEND_ENTRIES.map((e) => e.icon);
    expect(new Set(icons).size).toBe(icons.length);
  });

  test('kind 중복 없음', () => {
    const ks = SCENARIO_MAP_LEGEND_ENTRIES.map((e) => e.kind);
    expect(new Set(ks).size).toBe(ks.length);
  });

  test('listMapLegendKinds 는 7 종', () => {
    expect(listMapLegendKinds()).toEqual(ALL);
  });
});
