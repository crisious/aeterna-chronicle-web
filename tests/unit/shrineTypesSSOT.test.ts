/**
 * 유닛 테스트 — SYNC-233: SCENARIO_SHRINE_TYPES SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_SHRINE_TYPES,
  getShrineTypeNarrative,
  listShrineTypes,
  type ShrineType,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly ShrineType[] = ['memory', 'healing', 'combat_buff', 'wisdom', 'teleport'];

describe('SCENARIO_SHRINE_TYPES', () => {
  test('5 신전 모두 정의', () => {
    expect(SCENARIO_SHRINE_TYPES.length).toBe(5);
    for (const s of ALL) {
      expect(getShrineTypeNarrative(s), s).toBeDefined();
    }
  });

  test('cooldownMinutes 양수', () => {
    for (const s of SCENARIO_SHRINE_TYPES) {
      expect(s.cooldownMinutes, s.shrine).toBeGreaterThan(0);
    }
  });

  test('label/effectSummary 비어 있지 않음', () => {
    for (const s of SCENARIO_SHRINE_TYPES) {
      expect(s.label.trim(), s.shrine).not.toBe('');
      expect(s.effectSummary.trim(), s.shrine).not.toBe('');
    }
  });

  test('shrine 중복 없음', () => {
    const ss = SCENARIO_SHRINE_TYPES.map((s) => s.shrine);
    expect(new Set(ss).size).toBe(ss.length);
  });

  test('listShrineTypes 는 5 신전', () => {
    expect(listShrineTypes()).toEqual(ALL);
  });
});
