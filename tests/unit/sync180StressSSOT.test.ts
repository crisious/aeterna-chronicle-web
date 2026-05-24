/**
 * 유닛 테스트 — SYNC-180: 🎯 10 sprint (171~180) 누적 stress + NPC_OCCUPATION_LABELS
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_LIGHTING_PRESETS,
  SCENARIO_ZONE_DENSITY_LEVELS,
  SCENARIO_NPC_PATROL_PATTERNS,
  SCENARIO_DUNGEON_LAYOUT_PATTERNS,
  SCENARIO_DUNGEON_TRAPS,
  SCENARIO_WEATHER_TRANSITION_CHAINS,
  SCENARIO_PARTY_AURA_EFFECTS,
  SCENARIO_BUFF_DURATION_LEVELS,
  SCENARIO_CRAFTING_OUTCOMES,
  SCENARIO_NPC_OCCUPATION_LABELS,
  getNpcOccupationLabel,
  listNpcOccupations,
  type NpcOccupation,
} from '../../shared/types/scenarioRegistry';

const OCC: readonly NpcOccupation[] = ['merchant', 'guard', 'healer', 'scholar', 'quest_giver', 'wanderer'];

describe('SYNC-180 🎯 10 sprint 누적 stress', () => {
  test('NPC_OCCUPATION_LABELS — 6 직업 매칭 + 본문', () => {
    expect(SCENARIO_NPC_OCCUPATION_LABELS.length).toBe(6);
    for (const o of OCC) {
      const n = getNpcOccupationLabel(o);
      expect(n, o).toBeDefined();
      expect(n?.label.trim(), o).not.toBe('');
      expect(n?.conversationToneHint.trim(), o).not.toBe('');
      expect(n?.averageInteractionSeconds, o).toBeGreaterThan(0);
    }
    expect(listNpcOccupations()).toEqual(OCC);
  });

  test('sync-171~180 신규 도메인 10종 entry count 정합', () => {
    expect(SCENARIO_LIGHTING_PRESETS.length).toBe(4);
    expect(SCENARIO_ZONE_DENSITY_LEVELS.length).toBe(4);
    expect(SCENARIO_NPC_PATROL_PATTERNS.length).toBe(5);
    expect(SCENARIO_DUNGEON_LAYOUT_PATTERNS.length).toBe(4);
    expect(SCENARIO_DUNGEON_TRAPS.length).toBe(5);
    expect(SCENARIO_WEATHER_TRANSITION_CHAINS.length).toBe(5);
    expect(SCENARIO_PARTY_AURA_EFFECTS.length).toBe(5);
    expect(SCENARIO_BUFF_DURATION_LEVELS.length).toBe(4);
    expect(SCENARIO_CRAFTING_OUTCOMES.length).toBe(5);
    expect(SCENARIO_NPC_OCCUPATION_LABELS.length).toBe(6);
  });

  test('sync-171~180 누적 47 entry 확보', () => {
    const total =
      SCENARIO_LIGHTING_PRESETS.length +
      SCENARIO_ZONE_DENSITY_LEVELS.length +
      SCENARIO_NPC_PATROL_PATTERNS.length +
      SCENARIO_DUNGEON_LAYOUT_PATTERNS.length +
      SCENARIO_DUNGEON_TRAPS.length +
      SCENARIO_WEATHER_TRANSITION_CHAINS.length +
      SCENARIO_PARTY_AURA_EFFECTS.length +
      SCENARIO_BUFF_DURATION_LEVELS.length +
      SCENARIO_CRAFTING_OUTCOMES.length +
      SCENARIO_NPC_OCCUPATION_LABELS.length;
    expect(total).toBe(47);
  });
});
