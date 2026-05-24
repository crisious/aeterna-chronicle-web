/**
 * 유닛 테스트 — SYNC-214: SCENARIO_LEADERBOARD_CATEGORIES SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_LEADERBOARD_CATEGORIES,
  getLeaderboardCategoryNarrative,
  listLeaderboardCategories,
  type LeaderboardCategory,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly LeaderboardCategory[] = ['speedrun', 'highscore', 'combo', 'no_death', 'no_damage'];

describe('SCENARIO_LEADERBOARD_CATEGORIES', () => {
  test('5 카테고리 모두 정의', () => {
    expect(SCENARIO_LEADERBOARD_CATEGORIES.length).toBe(5);
    for (const c of ALL) {
      expect(getLeaderboardCategoryNarrative(c), c).toBeDefined();
    }
  });

  test('sortDirection 은 asc/desc 안에 든다', () => {
    const valid = ['asc', 'desc'];
    for (const c of SCENARIO_LEADERBOARD_CATEGORIES) {
      expect(valid, c.category).toContain(c.sortDirection);
    }
  });

  test('speedrun/no_death/no_damage 는 asc (작을수록 좋음)', () => {
    expect(getLeaderboardCategoryNarrative('speedrun')?.sortDirection).toBe('asc');
    expect(getLeaderboardCategoryNarrative('no_death')?.sortDirection).toBe('asc');
    expect(getLeaderboardCategoryNarrative('no_damage')?.sortDirection).toBe('asc');
  });

  test('label/recordUnit/qualificationRequirement 비어 있지 않음', () => {
    for (const c of SCENARIO_LEADERBOARD_CATEGORIES) {
      expect(c.label.trim(), c.category).not.toBe('');
      expect(c.recordUnit.trim(), c.category).not.toBe('');
      expect(c.qualificationRequirement.trim(), c.category).not.toBe('');
    }
  });

  test('category 중복 없음', () => {
    const cs = SCENARIO_LEADERBOARD_CATEGORIES.map((c) => c.category);
    expect(new Set(cs).size).toBe(cs.length);
  });
});
