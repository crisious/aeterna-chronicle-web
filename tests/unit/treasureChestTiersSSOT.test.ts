/**
 * 유닛 테스트 — SYNC-163: SCENARIO_TREASURE_CHEST_TIERS SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_TREASURE_CHEST_TIERS,
  SCENARIO_ITEM_RARITY_DESCRIPTIONS,
  getTreasureChestTier,
} from '../../shared/types/scenarioRegistry';

describe('SCENARIO_TREASURE_CHEST_TIERS', () => {
  test('SCENARIO_ITEM_RARITY_DESCRIPTIONS 5 등급 모두 매칭', () => {
    expect(SCENARIO_TREASURE_CHEST_TIERS.length).toBe(SCENARIO_ITEM_RARITY_DESCRIPTIONS.length);
    for (const r of SCENARIO_ITEM_RARITY_DESCRIPTIONS) {
      expect(getTreasureChestTier(r.rarity), r.rarity).toBeDefined();
    }
  });

  test('chestAnchor/rewardComposition 비어 있지 않음', () => {
    for (const t of SCENARIO_TREASURE_CHEST_TIERS) {
      expect(t.chestAnchor.trim(), t.rarity).not.toBe('');
      expect(t.rewardComposition.trim(), t.rarity).not.toBe('');
    }
  });

  test('rarity 중복 없음', () => {
    const rs = SCENARIO_TREASURE_CHEST_TIERS.map((t) => t.rarity);
    expect(new Set(rs).size).toBe(rs.length);
  });
});
