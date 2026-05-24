/**
 * 유닛 테스트 — SYNC-215: 🎯 5 sprint (211~215) 누적 stress + PVP_RANK_TIERS
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_NETWORK_REGION_LABELS,
  SCENARIO_FRIEND_STATUS_LABELS,
  SCENARIO_PUSH_NOTIFICATION_CATEGORIES,
  SCENARIO_LEADERBOARD_CATEGORIES,
  SCENARIO_PVP_RANK_TIERS,
  getPvpRankTierNarrative,
  classifyPvpRankByElo,
  type PvpRankTier,
} from '../../shared/types/scenarioRegistry';

const TIERS: readonly PvpRankTier[] = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'mythic'];

describe('SYNC-215 🎯 5 sprint 누적 stress', () => {
  test('PVP_RANK_TIERS — 6 tier 매칭 + 본문', () => {
    expect(SCENARIO_PVP_RANK_TIERS.length).toBe(6);
    for (const t of TIERS) {
      const n = getPvpRankTierNarrative(t);
      expect(n, t).toBeDefined();
      expect(n?.label.trim(), t).not.toBe('');
      expect(n?.minElo, t).toBeGreaterThanOrEqual(0);
      expect(n?.seasonRewardHint.trim(), t).not.toBe('');
    }
  });

  test('minElo 단조 증가 (bronze < mythic)', () => {
    const by = (t: PvpRankTier) => getPvpRankTierNarrative(t)!.minElo;
    expect(by('bronze')).toBeLessThan(by('silver'));
    expect(by('silver')).toBeLessThan(by('gold'));
    expect(by('gold')).toBeLessThan(by('platinum'));
    expect(by('platinum')).toBeLessThan(by('diamond'));
    expect(by('diamond')).toBeLessThan(by('mythic'));
  });

  test('classifyPvpRankByElo 경계값', () => {
    expect(classifyPvpRankByElo(0).tier).toBe('bronze');
    expect(classifyPvpRankByElo(799).tier).toBe('bronze');
    expect(classifyPvpRankByElo(800).tier).toBe('silver');
    expect(classifyPvpRankByElo(2200).tier).toBe('platinum');
    expect(classifyPvpRankByElo(3500).tier).toBe('mythic');
    expect(classifyPvpRankByElo(5000).tier).toBe('mythic');
  });

  test('sync-211~215 신규 도메인 5종 entry count 정합', () => {
    expect(SCENARIO_NETWORK_REGION_LABELS.length).toBe(5);
    expect(SCENARIO_FRIEND_STATUS_LABELS.length).toBe(4);
    expect(SCENARIO_PUSH_NOTIFICATION_CATEGORIES.length).toBe(4);
    expect(SCENARIO_LEADERBOARD_CATEGORIES.length).toBe(5);
    expect(SCENARIO_PVP_RANK_TIERS.length).toBe(6);
  });

  test('sync-211~215 누적 24 entry 확보', () => {
    const total =
      SCENARIO_NETWORK_REGION_LABELS.length +
      SCENARIO_FRIEND_STATUS_LABELS.length +
      SCENARIO_PUSH_NOTIFICATION_CATEGORIES.length +
      SCENARIO_LEADERBOARD_CATEGORIES.length +
      SCENARIO_PVP_RANK_TIERS.length;
    expect(total).toBe(24);
  });
});
