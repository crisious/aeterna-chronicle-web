/**
 * 유닛 테스트 — SYNC-145: 🎯 5 sprint (141~145) 누적 stress + ACHIEVEMENT_TIER
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_STATUS_EFFECT_CATEGORIES,
  SCENARIO_COMBAT_RESULT_LABELS,
  SCENARIO_NEW_GAME_PLUS_MODIFIERS,
  SCENARIO_LOOT_TIER_DROP_RATES,
  SCENARIO_ACHIEVEMENT_TIER_NARRATIVES,
  getAchievementTierNarrative,
  listAchievementTiersAscending,
  type AchievementTier,
} from '../../shared/types/scenarioRegistry';

const TIERS: readonly AchievementTier[] = ['bronze', 'silver', 'gold', 'platinum'];

describe('SYNC-145 🎯 5 sprint 누적 stress', () => {
  test('ACHIEVEMENT_TIER 4 tier 매칭 + 본문', () => {
    expect(SCENARIO_ACHIEVEMENT_TIER_NARRATIVES.length).toBe(4);
    for (const t of TIERS) {
      const n = getAchievementTierNarrative(t);
      expect(n, t).toBeDefined();
      expect(n?.label.trim(), t).not.toBe('');
      expect(n?.unlockAnchor.trim(), t).not.toBe('');
      expect(n?.prevalenceHint.trim(), t).not.toBe('');
    }
    expect(listAchievementTiersAscending()).toEqual(TIERS);
  });

  test('uiColor 는 #rrggbb 형식', () => {
    const hex = /^#[0-9a-fA-F]{6}$/;
    for (const t of SCENARIO_ACHIEVEMENT_TIER_NARRATIVES) {
      expect(hex.test(t.uiColor), `${t.tier}:${t.uiColor}`).toBe(true);
    }
  });

  test('sync-141~145 신규 도메인 5종 entry count 정합', () => {
    expect(SCENARIO_STATUS_EFFECT_CATEGORIES.length).toBe(5);
    expect(SCENARIO_COMBAT_RESULT_LABELS.length).toBe(7);
    expect(SCENARIO_NEW_GAME_PLUS_MODIFIERS.length).toBe(5);
    expect(SCENARIO_LOOT_TIER_DROP_RATES.length).toBe(5);
    expect(SCENARIO_ACHIEVEMENT_TIER_NARRATIVES.length).toBe(4);
  });

  test('sync-141~145 누적 26 entry 확보', () => {
    const total =
      SCENARIO_STATUS_EFFECT_CATEGORIES.length +
      SCENARIO_COMBAT_RESULT_LABELS.length +
      SCENARIO_NEW_GAME_PLUS_MODIFIERS.length +
      SCENARIO_LOOT_TIER_DROP_RATES.length +
      SCENARIO_ACHIEVEMENT_TIER_NARRATIVES.length;
    expect(total).toBe(26);
  });
});
