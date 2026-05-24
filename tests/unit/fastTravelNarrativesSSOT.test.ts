/**
 * 유닛 테스트 — SYNC-136: SCENARIO_FAST_TRAVEL_NARRATIVES SSOT
 *
 * 1) SCENARIO_ZONES 9 zone 모두 + universal fallback = 10 entry
 * 2) arrivalLine 비어 있지 않음, 중복 없음
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_ZONES,
  SCENARIO_FAST_TRAVEL_NARRATIVES,
  getFastTravelNarrative,
  getFastTravelFallback,
} from '../../shared/types/scenarioRegistry';

describe('SCENARIO_FAST_TRAVEL_NARRATIVES', () => {
  test('SCENARIO_ZONES 9 zone 모두 + universal fallback', () => {
    expect(SCENARIO_FAST_TRAVEL_NARRATIVES.length).toBe(SCENARIO_ZONES.length + 1);
    for (const z of SCENARIO_ZONES) {
      expect(getFastTravelNarrative(z.obsidianId), z.obsidianId).toBeDefined();
    }
    expect(getFastTravelNarrative('universal')).toBeDefined();
  });

  test('arrivalLine 비어 있지 않음', () => {
    for (const n of SCENARIO_FAST_TRAVEL_NARRATIVES) {
      expect(n.arrivalLine.trim(), n.zoneObsidianId).not.toBe('');
    }
  });

  test('zoneObsidianId 중복 없음', () => {
    const ids = SCENARIO_FAST_TRAVEL_NARRATIVES.map((n) => n.zoneObsidianId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('getFastTravelFallback 은 universal 항목 반환', () => {
    expect(getFastTravelFallback().zoneObsidianId).toBe('universal');
  });
});
