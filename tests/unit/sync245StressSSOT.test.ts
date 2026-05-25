/**
 * 유닛 테스트 — SYNC-245 🎯: 5 sprint (241~245) 누적 stress + NAMEPLATE_TAGS
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_BATTLE_REWARD_BREAKDOWN,
  SCENARIO_PARTY_HUD_LAYOUTS,
  SCENARIO_AUTO_PLAY_LIMITS,
  SCENARIO_FRIEND_REQUEST_STATES,
  SCENARIO_NAMEPLATE_TAGS,
  getNameplateTagNarrative,
  listNameplateTagsByPriority,
  type NameplateTag,
} from '../../shared/types/scenarioRegistry';

const TAGS: readonly NameplateTag[] = ['party_leader', 'guild_master', 'developer', 'streamer', 'season_champion'];

describe('SYNC-245 🎯 5 sprint 누적 stress', () => {
  test('NAMEPLATE_TAGS — 5 태그 매칭', () => {
    expect(SCENARIO_NAMEPLATE_TAGS.length).toBe(5);
    for (const t of TAGS) {
      const n = getNameplateTagNarrative(t);
      expect(n, t).toBeDefined();
      expect(n?.label.trim(), t).not.toBe('');
    }
  });

  test('developer 가 priority 1 (최우선)', () => {
    expect(getNameplateTagNarrative('developer')?.priority).toBe(1);
  });

  test('listNameplateTagsByPriority ascending', () => {
    const sorted = listNameplateTagsByPriority();
    for (let i = 1; i < sorted.length; i += 1) {
      expect(sorted[i].priority).toBeGreaterThanOrEqual(sorted[i - 1].priority);
    }
  });

  test('priority 중복 없음', () => {
    const ps = SCENARIO_NAMEPLATE_TAGS.map((t) => t.priority);
    expect(new Set(ps).size).toBe(ps.length);
  });

  test('sync-241~245 신규 도메인 5종 entry count 정합', () => {
    expect(SCENARIO_BATTLE_REWARD_BREAKDOWN.length).toBe(5);
    expect(SCENARIO_PARTY_HUD_LAYOUTS.length).toBe(4);
    expect(SCENARIO_AUTO_PLAY_LIMITS.length).toBe(4);
    expect(SCENARIO_FRIEND_REQUEST_STATES.length).toBe(5);
    expect(SCENARIO_NAMEPLATE_TAGS.length).toBe(5);
  });

  test('sync-241~245 누적 23 entry 확보', () => {
    const total =
      SCENARIO_BATTLE_REWARD_BREAKDOWN.length +
      SCENARIO_PARTY_HUD_LAYOUTS.length +
      SCENARIO_AUTO_PLAY_LIMITS.length +
      SCENARIO_FRIEND_REQUEST_STATES.length +
      SCENARIO_NAMEPLATE_TAGS.length;
    expect(total).toBe(23);
  });
});
