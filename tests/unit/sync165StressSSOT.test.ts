/**
 * 유닛 테스트 — SYNC-165: 🎯 5 sprint (161~165) 누적 stress + INVENTORY_SORT_OPTIONS
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_GUILD_RANK_NARRATIVES,
  SCENARIO_DAILY_QUEST_PATTERNS,
  SCENARIO_TREASURE_CHEST_TIERS,
  SCENARIO_DIALOGUE_CHOICE_PATTERNS,
  SCENARIO_INVENTORY_SORT_OPTIONS,
  getInventorySortOptionNarrative,
  listInventorySortOptions,
  type InventorySortOption,
} from '../../shared/types/scenarioRegistry';

const SORT: readonly InventorySortOption[] = ['rarity', 'name', 'recent', 'category'];

describe('SYNC-165 🎯 5 sprint 누적 stress', () => {
  test('INVENTORY_SORT_OPTIONS — 4 옵션 매칭 + 본문', () => {
    expect(SCENARIO_INVENTORY_SORT_OPTIONS.length).toBe(4);
    for (const s of SORT) {
      const n = getInventorySortOptionNarrative(s);
      expect(n, s).toBeDefined();
      expect(n?.label.trim(), s).not.toBe('');
      expect(n?.effectHint.trim(), s).not.toBe('');
      expect(['asc', 'desc'], s).toContain(n!.defaultDirection);
    }
    expect(listInventorySortOptions()).toEqual(SORT);
  });

  test('sync-161~165 신규 도메인 5종 entry count 정합', () => {
    expect(SCENARIO_GUILD_RANK_NARRATIVES.length).toBe(5);
    expect(SCENARIO_DAILY_QUEST_PATTERNS.length).toBe(4);
    expect(SCENARIO_TREASURE_CHEST_TIERS.length).toBe(5);
    expect(SCENARIO_DIALOGUE_CHOICE_PATTERNS.length).toBe(4);
    expect(SCENARIO_INVENTORY_SORT_OPTIONS.length).toBe(4);
  });

  test('sync-161~165 누적 22 entry 확보', () => {
    const total =
      SCENARIO_GUILD_RANK_NARRATIVES.length +
      SCENARIO_DAILY_QUEST_PATTERNS.length +
      SCENARIO_TREASURE_CHEST_TIERS.length +
      SCENARIO_DIALOGUE_CHOICE_PATTERNS.length +
      SCENARIO_INVENTORY_SORT_OPTIONS.length;
    expect(total).toBe(22);
  });
});
