/**
 * 유닛 테스트 — SYNC-224: SCENARIO_PARTY_ROSTER_SIZES SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_PARTY_ROSTER_SIZES,
  getPartyRosterSizeNarrative,
  listPartyRosterSizes,
  type PartyRosterSize,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly PartyRosterSize[] = ['solo', 'duo', 'trio', 'full_party'];

describe('SCENARIO_PARTY_ROSTER_SIZES', () => {
  test('4 구성 모두 정의', () => {
    expect(SCENARIO_PARTY_ROSTER_SIZES.length).toBe(4);
    for (const s of ALL) {
      expect(getPartyRosterSizeNarrative(s), s).toBeDefined();
    }
  });

  test('slotCount 1~4 (solo=1, full_party=4)', () => {
    expect(getPartyRosterSizeNarrative('solo')?.slotCount).toBe(1);
    expect(getPartyRosterSizeNarrative('duo')?.slotCount).toBe(2);
    expect(getPartyRosterSizeNarrative('trio')?.slotCount).toBe(3);
    expect(getPartyRosterSizeNarrative('full_party')?.slotCount).toBe(4);
  });

  test('label/unlockRequirement/modifierSummary 비어 있지 않음', () => {
    for (const s of SCENARIO_PARTY_ROSTER_SIZES) {
      expect(s.label.trim(), s.size).not.toBe('');
      expect(s.unlockRequirement.trim(), s.size).not.toBe('');
      expect(s.modifierSummary.trim(), s.size).not.toBe('');
    }
  });

  test('size 중복 없음', () => {
    const ss = SCENARIO_PARTY_ROSTER_SIZES.map((s) => s.size);
    expect(new Set(ss).size).toBe(ss.length);
  });

  test('listPartyRosterSizes 는 4 구성', () => {
    expect(listPartyRosterSizes()).toEqual(ALL);
  });
});
