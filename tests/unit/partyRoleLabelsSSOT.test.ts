/**
 * 유닛 테스트 — SYNC-149: SCENARIO_PARTY_ROLE_LABELS SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_PARTY_ROLE_LABELS,
  SCENARIO_CLASS_LEVEL_UP_NARRATIVES,
  getPartyRoleLabel,
  listPartyRoles,
  type PartyRole,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly PartyRole[] = ['lead', 'support', 'healer', 'scout'];

describe('SCENARIO_PARTY_ROLE_LABELS', () => {
  test('4 역할 모두 정의', () => {
    expect(SCENARIO_PARTY_ROLE_LABELS.length).toBe(4);
    for (const r of ALL) {
      expect(getPartyRoleLabel(r), r).toBeDefined();
    }
  });

  test('recommendedClasses 는 ClassKey 6종 중 valid 항목만 참조', () => {
    const validClassKeys = new Set(SCENARIO_CLASS_LEVEL_UP_NARRATIVES.map((c) => c.classKey));
    for (const r of SCENARIO_PARTY_ROLE_LABELS) {
      expect(r.recommendedClasses.length, r.role).toBeGreaterThan(0);
      for (const ck of r.recommendedClasses) {
        expect(validClassKeys.has(ck), `${r.role}:${ck}`).toBe(true);
      }
    }
  });

  test('label/description 비어 있지 않음', () => {
    for (const r of SCENARIO_PARTY_ROLE_LABELS) {
      expect(r.label.trim(), r.role).not.toBe('');
      expect(r.description.trim(), r.role).not.toBe('');
    }
  });

  test('role 중복 없음', () => {
    const rs = SCENARIO_PARTY_ROLE_LABELS.map((r) => r.role);
    expect(new Set(rs).size).toBe(rs.length);
  });

  test('listPartyRoles 는 4 역할', () => {
    expect(listPartyRoles()).toEqual(ALL);
  });
});
