/**
 * 유닛 테스트 — SYNC-146: SCENARIO_TIME_TRAVEL_NARRATIVES SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_TIME_TRAVEL_NARRATIVES,
  getTimeTravelNarrative,
  listTimeTravelDestinations,
  type TimeTravelDestination,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly TimeTravelDestination[] = ['past', 'present', 'future', 'rift'];

describe('SCENARIO_TIME_TRAVEL_NARRATIVES', () => {
  test('4 destination 모두 정의', () => {
    expect(SCENARIO_TIME_TRAVEL_NARRATIVES.length).toBe(4);
    for (const d of ALL) {
      expect(getTimeTravelNarrative(d), d).toBeDefined();
    }
  });

  test('label/arrivalLine/riskHint/flavor 비어 있지 않음', () => {
    for (const n of SCENARIO_TIME_TRAVEL_NARRATIVES) {
      expect(n.label.trim(), n.destination).not.toBe('');
      expect(n.arrivalLine.trim(), n.destination).not.toBe('');
      expect(n.riskHint.trim(), n.destination).not.toBe('');
      expect(n.flavor.trim(), n.destination).not.toBe('');
    }
  });

  test('listTimeTravelDestinations 는 4 destination', () => {
    expect(listTimeTravelDestinations()).toEqual(ALL);
  });

  test('destination 중복 없음', () => {
    const ds = SCENARIO_TIME_TRAVEL_NARRATIVES.map((n) => n.destination);
    expect(new Set(ds).size).toBe(ds.length);
  });
});
