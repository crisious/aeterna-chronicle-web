/**
 * 유닛 테스트 — SYNC-218: SCENARIO_FRIENDSHIP_LEVELS SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_FRIENDSHIP_LEVELS,
  getFriendshipLevelNarrative,
  classifyFriendshipByScore,
  type FriendshipLevel,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly FriendshipLevel[] = ['stranger', 'acquaintance', 'friend', 'close', 'best_friend'];

describe('SCENARIO_FRIENDSHIP_LEVELS', () => {
  test('5 레벨 모두 정의', () => {
    expect(SCENARIO_FRIENDSHIP_LEVELS.length).toBe(5);
    for (const l of ALL) {
      expect(getFriendshipLevelNarrative(l), l).toBeDefined();
    }
  });

  test('minScore 단조 증가', () => {
    const by = (l: FriendshipLevel) => getFriendshipLevelNarrative(l)!.minScore;
    expect(by('stranger')).toBe(0);
    expect(by('stranger')).toBeLessThan(by('acquaintance'));
    expect(by('acquaintance')).toBeLessThan(by('friend'));
    expect(by('friend')).toBeLessThan(by('close'));
    expect(by('close')).toBeLessThan(by('best_friend'));
  });

  test('레벨이 높을수록 unlockedInteractions 갯수 증가', () => {
    const ascending = ALL.slice();
    for (let i = 1; i < ascending.length; i += 1) {
      const prev = getFriendshipLevelNarrative(ascending[i - 1])!;
      const curr = getFriendshipLevelNarrative(ascending[i])!;
      expect(curr.unlockedInteractions.length, ascending[i]).toBeGreaterThanOrEqual(prev.unlockedInteractions.length);
    }
  });

  test('classifyFriendshipByScore 경계값', () => {
    expect(classifyFriendshipByScore(0).level).toBe('stranger');
    expect(classifyFriendshipByScore(19).level).toBe('stranger');
    expect(classifyFriendshipByScore(20).level).toBe('acquaintance');
    expect(classifyFriendshipByScore(100).level).toBe('close');
    expect(classifyFriendshipByScore(200).level).toBe('best_friend');
    expect(classifyFriendshipByScore(500).level).toBe('best_friend');
  });

  test('label 비어 있지 않음, level 중복 없음', () => {
    for (const l of SCENARIO_FRIENDSHIP_LEVELS) {
      expect(l.label.trim(), l.level).not.toBe('');
    }
    const ls = SCENARIO_FRIENDSHIP_LEVELS.map((l) => l.level);
    expect(new Set(ls).size).toBe(ls.length);
  });
});
