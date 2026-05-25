/**
 * 유닛 테스트 — SYNC-250 🎯🎯: 10 sprint (241~250) 누적 stress + TUTORIAL_CHECKPOINTS
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_BATTLE_REWARD_BREAKDOWN,
  SCENARIO_PARTY_HUD_LAYOUTS,
  SCENARIO_AUTO_PLAY_LIMITS,
  SCENARIO_FRIEND_REQUEST_STATES,
  SCENARIO_NAMEPLATE_TAGS,
  SCENARIO_CHAT_SLASH_COMMANDS,
  SCENARIO_INVENTORY_SORT_MODES,
  SCENARIO_GUILD_ACTIVITY_SCORES,
  SCENARIO_MARKET_LISTING_DURATIONS,
  SCENARIO_TUTORIAL_CHECKPOINTS,
  getTutorialCheckpointNarrative,
  listTutorialCheckpointsByOrder,
  getTotalTutorialEstimatedMinutes,
  type TutorialCheckpoint,
} from '../../shared/types/scenarioRegistry';

const CPS: readonly TutorialCheckpoint[] = [
  'character_create',
  'first_battle',
  'first_quest',
  'first_skill_unlock',
  'party_invitation',
  'graduation',
];

describe('SYNC-250 🎯🎯 10 sprint 누적 stress', () => {
  test('TUTORIAL_CHECKPOINTS — 6 체크포인트 매칭', () => {
    expect(SCENARIO_TUTORIAL_CHECKPOINTS.length).toBe(6);
    for (const c of CPS) {
      const n = getTutorialCheckpointNarrative(c);
      expect(n, c).toBeDefined();
      expect(n?.label.trim(), c).not.toBe('');
    }
  });

  test('order 단조 증가, 1~6 unique', () => {
    const sorted = listTutorialCheckpointsByOrder();
    expect(sorted.length).toBe(6);
    for (let i = 0; i < sorted.length; i += 1) {
      expect(sorted[i].order, sorted[i].checkpoint).toBe(i + 1);
    }
  });

  test('character_create 와 graduation 은 skippable=false', () => {
    expect(getTutorialCheckpointNarrative('character_create')?.skippable).toBe(false);
    expect(getTutorialCheckpointNarrative('graduation')?.skippable).toBe(false);
  });

  test('estimatedMinutes 총합 25분 이하 (온보딩 부담 제한)', () => {
    const total = getTotalTutorialEstimatedMinutes();
    expect(total).toBeLessThanOrEqual(25);
    expect(total).toBeGreaterThan(0);
  });

  test('sync-241~250 신규 도메인 10종 entry count 정합', () => {
    expect(SCENARIO_BATTLE_REWARD_BREAKDOWN.length).toBe(5);
    expect(SCENARIO_PARTY_HUD_LAYOUTS.length).toBe(4);
    expect(SCENARIO_AUTO_PLAY_LIMITS.length).toBe(4);
    expect(SCENARIO_FRIEND_REQUEST_STATES.length).toBe(5);
    expect(SCENARIO_NAMEPLATE_TAGS.length).toBe(5);
    expect(SCENARIO_CHAT_SLASH_COMMANDS.length).toBe(6);
    expect(SCENARIO_INVENTORY_SORT_MODES.length).toBe(5);
    expect(SCENARIO_GUILD_ACTIVITY_SCORES.length).toBe(5);
    expect(SCENARIO_MARKET_LISTING_DURATIONS.length).toBe(4);
    expect(SCENARIO_TUTORIAL_CHECKPOINTS.length).toBe(6);
  });

  test('sync-241~250 누적 49 entry 확보', () => {
    const total =
      SCENARIO_BATTLE_REWARD_BREAKDOWN.length +
      SCENARIO_PARTY_HUD_LAYOUTS.length +
      SCENARIO_AUTO_PLAY_LIMITS.length +
      SCENARIO_FRIEND_REQUEST_STATES.length +
      SCENARIO_NAMEPLATE_TAGS.length +
      SCENARIO_CHAT_SLASH_COMMANDS.length +
      SCENARIO_INVENTORY_SORT_MODES.length +
      SCENARIO_GUILD_ACTIVITY_SCORES.length +
      SCENARIO_MARKET_LISTING_DURATIONS.length +
      SCENARIO_TUTORIAL_CHECKPOINTS.length;
    expect(total).toBe(49);
  });
});
