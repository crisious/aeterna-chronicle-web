/**
 * 유닛 테스트 — SYNC-237: SCENARIO_LOOT_SOURCE_TYPES SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_LOOT_SOURCE_TYPES,
  SCENARIO_ITEM_RARITY_DESCRIPTIONS,
  getLootSourceTypeNarrative,
  listLootSourceTypes,
  type LootSourceType,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly LootSourceType[] = ['kill', 'chest', 'quest', 'trade', 'craft'];

describe('SCENARIO_LOOT_SOURCE_TYPES', () => {
  test('5 소스 모두 정의', () => {
    expect(SCENARIO_LOOT_SOURCE_TYPES.length).toBe(5);
    for (const s of ALL) {
      expect(getLootSourceTypeNarrative(s), s).toBeDefined();
    }
  });

  test('averageRarity 는 ItemRarity 내 존재', () => {
    const validRarities = new Set(SCENARIO_ITEM_RARITY_DESCRIPTIONS.map((r) => r.rarity));
    for (const s of SCENARIO_LOOT_SOURCE_TYPES) {
      expect(validRarities.has(s.averageRarity), `${s.source}:${s.averageRarity}`).toBe(true);
    }
  });

  test('dailyFrequency 양수', () => {
    for (const s of SCENARIO_LOOT_SOURCE_TYPES) {
      expect(s.dailyFrequency, s.source).toBeGreaterThan(0);
    }
  });

  test('label 비어 있지 않음', () => {
    for (const s of SCENARIO_LOOT_SOURCE_TYPES) {
      expect(s.label.trim(), s.source).not.toBe('');
    }
  });

  test('source 중복 없음', () => {
    const ss = SCENARIO_LOOT_SOURCE_TYPES.map((s) => s.source);
    expect(new Set(ss).size).toBe(ss.length);
  });
});
