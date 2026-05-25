/**
 * 유닛 테스트 — SYNC-222: SCENARIO_GUILD_RAID_TIERS SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_GUILD_RAID_TIERS,
  SCENARIO_PVP_RANK_TIERS,
  getGuildRaidTierNarrative,
  listGuildRaidTiersAscending,
  type GuildRaidTier,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly GuildRaidTier[] = ['normal', 'hard', 'nightmare', 'legendary'];

describe('SCENARIO_GUILD_RAID_TIERS', () => {
  test('4 tier 모두 정의', () => {
    expect(SCENARIO_GUILD_RAID_TIERS.length).toBe(4);
    for (const t of ALL) {
      expect(getGuildRaidTierNarrative(t), t).toBeDefined();
    }
  });

  test('recommendedRankTier 는 PvpRankTier 내 존재', () => {
    const validTiers = new Set(SCENARIO_PVP_RANK_TIERS.map((t) => t.tier));
    for (const t of SCENARIO_GUILD_RAID_TIERS) {
      expect(validTiers.has(t.recommendedRankTier), `${t.tier}:${t.recommendedRankTier}`).toBe(true);
    }
  });

  test('recommendedPlayerCount/bossHpMultiplier 양수', () => {
    for (const t of SCENARIO_GUILD_RAID_TIERS) {
      expect(t.recommendedPlayerCount, t.tier).toBeGreaterThan(0);
      expect(t.bossHpMultiplier, t.tier).toBeGreaterThan(0);
    }
  });

  test('tier 단조 — 더 높은 난이도일수록 player count + boss HP 증가', () => {
    const ascending = listGuildRaidTiersAscending();
    for (let i = 1; i < ascending.length; i += 1) {
      const prev = getGuildRaidTierNarrative(ascending[i - 1])!;
      const curr = getGuildRaidTierNarrative(ascending[i])!;
      expect(curr.recommendedPlayerCount).toBeGreaterThanOrEqual(prev.recommendedPlayerCount);
      expect(curr.bossHpMultiplier).toBeGreaterThan(prev.bossHpMultiplier);
    }
  });

  test('label/rewardHint 비어 있지 않음', () => {
    for (const t of SCENARIO_GUILD_RAID_TIERS) {
      expect(t.label.trim(), t.tier).not.toBe('');
      expect(t.rewardHint.trim(), t.tier).not.toBe('');
    }
  });
});
