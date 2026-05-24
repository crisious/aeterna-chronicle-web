/**
 * 유닛 테스트 — SYNC-161: SCENARIO_GUILD_RANK_NARRATIVES SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_GUILD_RANK_NARRATIVES,
  getGuildRankNarrative,
  getGuildRankByContribution,
  type GuildRank,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly GuildRank[] = ['initiate', 'member', 'veteran', 'elder', 'master'];

describe('SCENARIO_GUILD_RANK_NARRATIVES', () => {
  test('5 rank 모두 정의', () => {
    expect(SCENARIO_GUILD_RANK_NARRATIVES.length).toBe(5);
    for (const r of ALL) {
      expect(getGuildRankNarrative(r), r).toBeDefined();
    }
  });

  test('requiredContribution 오름차순 (initiate < master)', () => {
    const by = (r: GuildRank) => getGuildRankNarrative(r)!.requiredContribution;
    expect(by('initiate')).toBe(0);
    expect(by('initiate')).toBeLessThan(by('member'));
    expect(by('member')).toBeLessThan(by('veteran'));
    expect(by('veteran')).toBeLessThan(by('elder'));
    expect(by('elder')).toBeLessThan(by('master'));
  });

  test('promotionAnchor/unlockedPermission/label 비어 있지 않음', () => {
    for (const r of SCENARIO_GUILD_RANK_NARRATIVES) {
      expect(r.label.trim(), r.rank).not.toBe('');
      expect(r.promotionAnchor.trim(), r.rank).not.toBe('');
      expect(r.unlockedPermission.trim(), r.rank).not.toBe('');
    }
  });

  test('getGuildRankByContribution 경계 점수', () => {
    expect(getGuildRankByContribution(0).rank).toBe('initiate');
    expect(getGuildRankByContribution(19).rank).toBe('initiate');
    expect(getGuildRankByContribution(20).rank).toBe('member');
    expect(getGuildRankByContribution(60).rank).toBe('veteran');
    expect(getGuildRankByContribution(140).rank).toBe('elder');
    expect(getGuildRankByContribution(300).rank).toBe('master');
    expect(getGuildRankByContribution(1000).rank).toBe('master');
  });

  test('rank 중복 없음', () => {
    const rs = SCENARIO_GUILD_RANK_NARRATIVES.map((r) => r.rank);
    expect(new Set(rs).size).toBe(rs.length);
  });
});
