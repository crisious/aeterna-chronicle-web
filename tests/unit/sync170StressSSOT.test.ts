/**
 * 유닛 테스트 — SYNC-170: 🎯 10 sprint (161~170) 누적 stress + AETHER_RESONANCE_LEVELS
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_GUILD_RANK_NARRATIVES,
  SCENARIO_DAILY_QUEST_PATTERNS,
  SCENARIO_TREASURE_CHEST_TIERS,
  SCENARIO_DIALOGUE_CHOICE_PATTERNS,
  SCENARIO_INVENTORY_SORT_OPTIONS,
  SCENARIO_HUD_COMPONENT_LABELS,
  SCENARIO_CAMERA_MODE_NARRATIVES,
  SCENARIO_FACTION_CONFLICTS,
  SCENARIO_MEMORY_RESONANCE_TYPES,
  SCENARIO_AETHER_RESONANCE_LEVELS,
  getAetherResonanceLevelNarrative,
  listAetherResonanceLevelsAscending,
  type AetherResonanceLevel,
} from '../../shared/types/scenarioRegistry';

const LEVELS: readonly AetherResonanceLevel[] = ['dormant', 'awakening', 'active', 'peak', 'transcendent'];

describe('SYNC-170 🎯 10 sprint 누적 stress', () => {
  test('AETHER_RESONANCE_LEVELS — 5 레벨 매칭 + 본문', () => {
    expect(SCENARIO_AETHER_RESONANCE_LEVELS.length).toBe(5);
    for (const l of LEVELS) {
      const n = getAetherResonanceLevelNarrative(l);
      expect(n, l).toBeDefined();
      expect(n?.label.trim(), l).not.toBe('');
      expect(n?.ascendAnchor.trim(), l).not.toBe('');
      expect(n?.unlockedAbility.trim(), l).not.toBe('');
      expect(n?.requiredMilestone.trim(), l).not.toBe('');
    }
    expect(listAetherResonanceLevelsAscending()).toEqual(LEVELS);
  });

  test('sync-161~170 신규 도메인 10종 entry count 정합', () => {
    expect(SCENARIO_GUILD_RANK_NARRATIVES.length).toBe(5);
    expect(SCENARIO_DAILY_QUEST_PATTERNS.length).toBe(4);
    expect(SCENARIO_TREASURE_CHEST_TIERS.length).toBe(5);
    expect(SCENARIO_DIALOGUE_CHOICE_PATTERNS.length).toBe(4);
    expect(SCENARIO_INVENTORY_SORT_OPTIONS.length).toBe(4);
    expect(SCENARIO_HUD_COMPONENT_LABELS.length).toBe(6);
    expect(SCENARIO_CAMERA_MODE_NARRATIVES.length).toBe(3);
    expect(SCENARIO_FACTION_CONFLICTS.length).toBe(4);
    expect(SCENARIO_MEMORY_RESONANCE_TYPES.length).toBe(4);
    expect(SCENARIO_AETHER_RESONANCE_LEVELS.length).toBe(5);
  });

  test('sync-161~170 누적 44 entry 확보', () => {
    const total =
      SCENARIO_GUILD_RANK_NARRATIVES.length +
      SCENARIO_DAILY_QUEST_PATTERNS.length +
      SCENARIO_TREASURE_CHEST_TIERS.length +
      SCENARIO_DIALOGUE_CHOICE_PATTERNS.length +
      SCENARIO_INVENTORY_SORT_OPTIONS.length +
      SCENARIO_HUD_COMPONENT_LABELS.length +
      SCENARIO_CAMERA_MODE_NARRATIVES.length +
      SCENARIO_FACTION_CONFLICTS.length +
      SCENARIO_MEMORY_RESONANCE_TYPES.length +
      SCENARIO_AETHER_RESONANCE_LEVELS.length;
    expect(total).toBe(44);
  });
});
