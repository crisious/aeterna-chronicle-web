/**
 * 유닛 테스트 — SYNC-143: SCENARIO_NEW_GAME_PLUS_MODIFIERS SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_NEW_GAME_PLUS_MODIFIERS,
  getNgPlusModifier,
  listNgPlusModifierKeys,
  type NgPlusModifierKey,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly NgPlusModifierKey[] = [
  'cycle_tier', 'difficulty_carry', 'companion_loyalty_carry', 'enemy_amplify', 'reward_multiplier',
];

describe('SCENARIO_NEW_GAME_PLUS_MODIFIERS', () => {
  test('5 모디파이어 모두 정의', () => {
    expect(SCENARIO_NEW_GAME_PLUS_MODIFIERS.length).toBe(5);
    for (const k of ALL) {
      expect(getNgPlusModifier(k), k).toBeDefined();
    }
  });

  test('label/formulaSummary/flavor 비어 있지 않음', () => {
    for (const m of SCENARIO_NEW_GAME_PLUS_MODIFIERS) {
      expect(m.label.trim(), m.key).not.toBe('');
      expect(m.formulaSummary.trim(), m.key).not.toBe('');
      expect(m.flavor.trim(), m.key).not.toBe('');
    }
  });

  test('key 중복 없음', () => {
    const ks = SCENARIO_NEW_GAME_PLUS_MODIFIERS.map((m) => m.key);
    expect(new Set(ks).size).toBe(ks.length);
  });

  test('listNgPlusModifierKeys 는 5 모디파이어', () => {
    expect(listNgPlusModifierKeys()).toEqual(ALL);
  });
});
