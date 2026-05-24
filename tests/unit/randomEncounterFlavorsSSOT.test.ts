/**
 * 유닛 테스트 — SYNC-159: SCENARIO_RANDOM_ENCOUNTER_FLAVORS SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_RANDOM_ENCOUNTER_FLAVORS,
  getRandomEncounterFlavor,
  listEncounterKinds,
  type EncounterKind,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly EncounterKind[] = ['peaceful', 'normal', 'elite', 'ambush'];

describe('SCENARIO_RANDOM_ENCOUNTER_FLAVORS', () => {
  test('4 조우 모두 정의', () => {
    expect(SCENARIO_RANDOM_ENCOUNTER_FLAVORS.length).toBe(4);
    for (const k of ALL) {
      expect(getRandomEncounterFlavor(k), k).toBeDefined();
    }
  });

  test('label/encounterAnchor/firstTurnModifier 비어 있지 않음', () => {
    for (const e of SCENARIO_RANDOM_ENCOUNTER_FLAVORS) {
      expect(e.label.trim(), e.kind).not.toBe('');
      expect(e.encounterAnchor.trim(), e.kind).not.toBe('');
      expect(e.firstTurnModifier.trim(), e.kind).not.toBe('');
    }
  });

  test('kind 중복 없음', () => {
    const ks = SCENARIO_RANDOM_ENCOUNTER_FLAVORS.map((e) => e.kind);
    expect(new Set(ks).size).toBe(ks.length);
  });

  test('listEncounterKinds 는 4 종', () => {
    expect(listEncounterKinds()).toEqual(ALL);
  });
});
