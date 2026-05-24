/**
 * 유닛 테스트 — SYNC-150: 🎯🎯🎯 50 sprint 마디 (sync-101~150) + COMPLETION_PERCENT
 */
import { describe, expect, test } from 'vitest';
import {
  // sync-141~150 신규
  SCENARIO_STATUS_EFFECT_CATEGORIES,
  SCENARIO_COMBAT_RESULT_LABELS,
  SCENARIO_NEW_GAME_PLUS_MODIFIERS,
  SCENARIO_LOOT_TIER_DROP_RATES,
  SCENARIO_ACHIEVEMENT_TIER_NARRATIVES,
  SCENARIO_TIME_TRAVEL_NARRATIVES,
  SCENARIO_MAP_LEGEND_ENTRIES,
  SCENARIO_QUICKSLOT_HINTS,
  SCENARIO_PARTY_ROLE_LABELS,
  SCENARIO_COMPLETION_PERCENT_NARRATIVES,
  // sync-101~140 sampled (정합 가드)
  SCENARIO_FIELD_NPC_DIALOGUE_TEMPLATES,
  SCENARIO_BGM_NARRATIVES,
  SCENARIO_AMBIENT_NARRATIVES,
  SCENARIO_BOSS_INTRO_NARRATIVES,
  SCENARIO_BOSS_VICTORY_NARRATIVES,
  SCENARIO_DEITY_NARRATIVES,
  SCENARIO_FACTION_INTRO_NARRATIVES,
  SCENARIO_CLASS_LEVEL_UP_NARRATIVES,
  SCENARIO_BATTLE_OPENING_BARKS,
  SCENARIO_BATTLE_VICTORY_BARKS,
  getCompletionPercentNarrative,
  getCompletionPercentByValue,
} from '../../shared/types/scenarioRegistry';

describe('SYNC-150 🎯🎯🎯 50 sprint 마디 stress', () => {
  test('COMPLETION_PERCENT — 5 milestone 매칭 + 본문', () => {
    expect(SCENARIO_COMPLETION_PERCENT_NARRATIVES.length).toBe(5);
    for (const p of [0, 25, 50, 75, 100] as const) {
      const n = getCompletionPercentNarrative(p);
      expect(n, `${p}%`).toBeDefined();
      expect(n?.label.trim(), `${p}%`).not.toBe('');
      expect(n?.anchorLine.trim(), `${p}%`).not.toBe('');
      expect(n?.recommendedAction.trim(), `${p}%`).not.toBe('');
    }
  });

  test('getCompletionPercentByValue 경계 매핑', () => {
    expect(getCompletionPercentByValue(0).percent).toBe(0);
    expect(getCompletionPercentByValue(24).percent).toBe(0);
    expect(getCompletionPercentByValue(25).percent).toBe(25);
    expect(getCompletionPercentByValue(50).percent).toBe(50);
    expect(getCompletionPercentByValue(99).percent).toBe(75);
    expect(getCompletionPercentByValue(100).percent).toBe(100);
  });

  test('sync-141~150 신규 도메인 10종 entry count 정합', () => {
    expect(SCENARIO_STATUS_EFFECT_CATEGORIES.length).toBe(5);
    expect(SCENARIO_COMBAT_RESULT_LABELS.length).toBe(7);
    expect(SCENARIO_NEW_GAME_PLUS_MODIFIERS.length).toBe(5);
    expect(SCENARIO_LOOT_TIER_DROP_RATES.length).toBe(5);
    expect(SCENARIO_ACHIEVEMENT_TIER_NARRATIVES.length).toBe(4);
    expect(SCENARIO_TIME_TRAVEL_NARRATIVES.length).toBe(4);
    expect(SCENARIO_MAP_LEGEND_ENTRIES.length).toBe(7);
    expect(SCENARIO_QUICKSLOT_HINTS.length).toBe(4);
    expect(SCENARIO_PARTY_ROLE_LABELS.length).toBe(4);
    expect(SCENARIO_COMPLETION_PERCENT_NARRATIVES.length).toBe(5);
  });

  test('sync-141~150 누적 50 entry 확보', () => {
    const total =
      SCENARIO_STATUS_EFFECT_CATEGORIES.length +
      SCENARIO_COMBAT_RESULT_LABELS.length +
      SCENARIO_NEW_GAME_PLUS_MODIFIERS.length +
      SCENARIO_LOOT_TIER_DROP_RATES.length +
      SCENARIO_ACHIEVEMENT_TIER_NARRATIVES.length +
      SCENARIO_TIME_TRAVEL_NARRATIVES.length +
      SCENARIO_MAP_LEGEND_ENTRIES.length +
      SCENARIO_QUICKSLOT_HINTS.length +
      SCENARIO_PARTY_ROLE_LABELS.length +
      SCENARIO_COMPLETION_PERCENT_NARRATIVES.length;
    expect(total).toBe(50);
  });

  test('🎯🎯🎯 50 sprint 누적 sampled 도메인 entry count 정합', () => {
    expect(SCENARIO_FIELD_NPC_DIALOGUE_TEMPLATES.length).toBeGreaterThanOrEqual(6);
    expect(SCENARIO_BGM_NARRATIVES.length).toBe(42);
    expect(SCENARIO_AMBIENT_NARRATIVES.length).toBe(43);
    expect(SCENARIO_BOSS_INTRO_NARRATIVES.length).toBe(9);
    expect(SCENARIO_BOSS_VICTORY_NARRATIVES.length).toBe(9);
    expect(SCENARIO_DEITY_NARRATIVES.length).toBe(12);
    expect(SCENARIO_FACTION_INTRO_NARRATIVES.length).toBe(7);
    expect(SCENARIO_CLASS_LEVEL_UP_NARRATIVES.length).toBe(18);
    expect(SCENARIO_BATTLE_OPENING_BARKS.length).toBe(6);
    expect(SCENARIO_BATTLE_VICTORY_BARKS.length).toBe(6);
  });
});
