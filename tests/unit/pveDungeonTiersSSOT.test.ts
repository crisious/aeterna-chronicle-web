/**
 * 유닛 테스트 — SYNC-257: SCENARIO_PVE_DUNGEON_TIERS SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_PVE_DUNGEON_TIERS,
  getPveDungeonTierNarrative,
  listPveDungeonTiers,
  type PveDungeonTier,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly PveDungeonTier[] = ['novice', 'veteran', 'heroic', 'mythic'];

describe('SCENARIO_PVE_DUNGEON_TIERS', () => {
  test('4 등급 모두 정의', () => {
    expect(SCENARIO_PVE_DUNGEON_TIERS.length).toBe(4);
    for (const t of ALL) {
      expect(getPveDungeonTierNarrative(t), t).toBeDefined();
    }
  });

  test('recommendedLevel 단조 증가', () => {
    const order: readonly PveDungeonTier[] = ['novice', 'veteran', 'heroic', 'mythic'];
    for (let i = 1; i < order.length; i += 1) {
      const prev = getPveDungeonTierNarrative(order[i - 1])!;
      const cur = getPveDungeonTierNarrative(order[i])!;
      expect(cur.recommendedLevel, `${order[i - 1]}->${order[i]}`).toBeGreaterThan(prev.recommendedLevel);
    }
  });

  test('rewardMultiplier 단조 증가', () => {
    const order: readonly PveDungeonTier[] = ['novice', 'veteran', 'heroic', 'mythic'];
    for (let i = 1; i < order.length; i += 1) {
      const prev = getPveDungeonTierNarrative(order[i - 1])!;
      const cur = getPveDungeonTierNarrative(order[i])!;
      expect(cur.rewardMultiplier, `${order[i - 1]}->${order[i]}`).toBeGreaterThan(prev.rewardMultiplier);
    }
  });

  test('novice rewardMultiplier 는 1.0 (기준)', () => {
    expect(getPveDungeonTierNarrative('novice')?.rewardMultiplier).toBe(1.0);
  });

  test('tier 중복 없음', () => {
    const ks = SCENARIO_PVE_DUNGEON_TIERS.map((d) => d.tier);
    expect(new Set(ks).size).toBe(ks.length);
  });

  test('listPveDungeonTiers 4 항목', () => {
    expect(listPveDungeonTiers().length).toBe(4);
  });
});
