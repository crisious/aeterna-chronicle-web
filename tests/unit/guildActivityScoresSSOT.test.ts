/**
 * 유닛 테스트 — SYNC-248: SCENARIO_GUILD_ACTIVITY_SCORES SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_GUILD_ACTIVITY_SCORES,
  getGuildActivityScoreNarrative,
  listGuildActivityScores,
  type GuildActivityKind,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly GuildActivityKind[] = ['daily_login', 'raid', 'contribution', 'event', 'donation'];

describe('SCENARIO_GUILD_ACTIVITY_SCORES', () => {
  test('5 활동 모두 정의', () => {
    expect(SCENARIO_GUILD_ACTIVITY_SCORES.length).toBe(5);
    for (const k of ALL) {
      expect(getGuildActivityScoreNarrative(k), k).toBeDefined();
    }
  });

  test('pointsPerUnit 양수, dailyCap 0 이상', () => {
    for (const g of SCENARIO_GUILD_ACTIVITY_SCORES) {
      expect(g.pointsPerUnit, g.kind).toBeGreaterThan(0);
      expect(g.dailyCap, g.kind).toBeGreaterThanOrEqual(0);
    }
  });

  test('dailyCap > 0 이면 pointsPerUnit 배수', () => {
    for (const g of SCENARIO_GUILD_ACTIVITY_SCORES) {
      if (g.dailyCap > 0) {
        expect(g.dailyCap % g.pointsPerUnit, g.kind).toBe(0);
      }
    }
  });

  test('raid 가 단위 활동 최고점', () => {
    const raid = getGuildActivityScoreNarrative('raid')!;
    for (const g of SCENARIO_GUILD_ACTIVITY_SCORES) {
      expect(raid.pointsPerUnit, g.kind).toBeGreaterThanOrEqual(g.pointsPerUnit);
    }
  });

  test('kind 중복 없음', () => {
    const ks = SCENARIO_GUILD_ACTIVITY_SCORES.map((g) => g.kind);
    expect(new Set(ks).size).toBe(ks.length);
  });

  test('listGuildActivityScores 5 항목', () => {
    expect(listGuildActivityScores().length).toBe(5);
  });
});
