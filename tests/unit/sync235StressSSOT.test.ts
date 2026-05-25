/**
 * 유닛 테스트 — SYNC-235: 🎯 5 sprint (231~235) 누적 stress + ITEM_DURABILITY_LEVELS
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_BATTLE_FORMATIONS,
  SCENARIO_ENCOUNTER_BIOMES,
  SCENARIO_SHRINE_TYPES,
  SCENARIO_GUILD_PERMISSION_ROLES,
  SCENARIO_ITEM_DURABILITY_LEVELS,
  getItemDurabilityLevelNarrative,
  classifyItemDurabilityByPercent,
  type ItemDurabilityLevel,
} from '../../shared/types/scenarioRegistry';

const LEVELS: readonly ItemDurabilityLevel[] = ['pristine', 'intact', 'worn', 'damaged', 'broken'];

describe('SYNC-235 🎯 5 sprint 누적 stress', () => {
  test('ITEM_DURABILITY_LEVELS — 5 레벨 매칭', () => {
    expect(SCENARIO_ITEM_DURABILITY_LEVELS.length).toBe(5);
    for (const l of LEVELS) {
      const n = getItemDurabilityLevelNarrative(l);
      expect(n, l).toBeDefined();
      expect(n?.label.trim(), l).not.toBe('');
      expect(n?.modifierSummary.trim(), l).not.toBe('');
    }
  });

  test('classifyItemDurabilityByPercent 경계값', () => {
    expect(classifyItemDurabilityByPercent(100).level).toBe('pristine');
    expect(classifyItemDurabilityByPercent(90).level).toBe('pristine');
    expect(classifyItemDurabilityByPercent(89).level).toBe('intact');
    expect(classifyItemDurabilityByPercent(70).level).toBe('intact');
    expect(classifyItemDurabilityByPercent(50).level).toBe('worn');
    expect(classifyItemDurabilityByPercent(20).level).toBe('damaged');
    expect(classifyItemDurabilityByPercent(5).level).toBe('broken');
    expect(classifyItemDurabilityByPercent(0).level).toBe('broken');
  });

  test('sync-231~235 신규 도메인 5종 entry count 정합', () => {
    expect(SCENARIO_BATTLE_FORMATIONS.length).toBe(4);
    expect(SCENARIO_ENCOUNTER_BIOMES.length).toBe(5);
    expect(SCENARIO_SHRINE_TYPES.length).toBe(5);
    expect(SCENARIO_GUILD_PERMISSION_ROLES.length).toBe(5);
    expect(SCENARIO_ITEM_DURABILITY_LEVELS.length).toBe(5);
  });

  test('sync-231~235 누적 24 entry 확보', () => {
    const total =
      SCENARIO_BATTLE_FORMATIONS.length +
      SCENARIO_ENCOUNTER_BIOMES.length +
      SCENARIO_SHRINE_TYPES.length +
      SCENARIO_GUILD_PERMISSION_ROLES.length +
      SCENARIO_ITEM_DURABILITY_LEVELS.length;
    expect(total).toBe(24);
  });
});
