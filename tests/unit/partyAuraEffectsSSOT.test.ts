/**
 * 유닛 테스트 — SYNC-177: SCENARIO_PARTY_AURA_EFFECTS SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_PARTY_AURA_EFFECTS,
  SCENARIO_CLASS_LEVEL_UP_NARRATIVES,
  getPartyAuraNarrative,
  listPartyAurasByClass,
  type PartyAuraKind,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly PartyAuraKind[] = ['defense', 'offense', 'regen', 'speed', 'silence'];

describe('SCENARIO_PARTY_AURA_EFFECTS', () => {
  test('5 오라 모두 정의', () => {
    expect(SCENARIO_PARTY_AURA_EFFECTS.length).toBe(5);
    for (const a of ALL) {
      expect(getPartyAuraNarrative(a), a).toBeDefined();
    }
  });

  test('emitterClass 는 ClassKey 내 존재', () => {
    const validClassKeys = new Set(SCENARIO_CLASS_LEVEL_UP_NARRATIVES.map((c) => c.classKey));
    for (const a of SCENARIO_PARTY_AURA_EFFECTS) {
      expect(validClassKeys.has(a.emitterClass), `${a.aura}:${a.emitterClass}`).toBe(true);
    }
  });

  test('label/activationAnchor/modifierSummary 비어 있지 않음', () => {
    for (const a of SCENARIO_PARTY_AURA_EFFECTS) {
      expect(a.label.trim(), a.aura).not.toBe('');
      expect(a.activationAnchor.trim(), a.aura).not.toBe('');
      expect(a.modifierSummary.trim(), a.aura).not.toBe('');
    }
  });

  test('aura 중복 없음', () => {
    const as = SCENARIO_PARTY_AURA_EFFECTS.map((a) => a.aura);
    expect(new Set(as).size).toBe(as.length);
  });

  test('listPartyAurasByClass 정상', () => {
    const knightAuras = listPartyAurasByClass('ether_knight');
    expect(knightAuras.length).toBeGreaterThan(0);
    for (const a of knightAuras) {
      expect(a.emitterClass).toBe('ether_knight');
    }
  });
});
