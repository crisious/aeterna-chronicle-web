/**
 * 유닛 테스트 — SYNC-230: 🎯 10 sprint (221~230) 누적 stress + CUTSCENE_PLAYBACK_OPTIONS
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_SEASON_CYCLE_PHASES,
  SCENARIO_GUILD_RAID_TIERS,
  SCENARIO_QUEST_REWARD_CURRENCIES,
  SCENARIO_PARTY_ROSTER_SIZES,
  SCENARIO_TRANSACTION_ERROR_CODES,
  SCENARIO_INSTANCE_DUNGEON_DIFFICULTIES,
  SCENARIO_PLAYER_TITLE_CATEGORIES,
  SCENARIO_EMOTE_CATEGORIES,
  SCENARIO_PHOTO_MODE_FILTERS,
  SCENARIO_CUTSCENE_PLAYBACK_OPTIONS,
  getCutscenePlaybackOptionNarrative,
  listCutscenePlaybackOptions,
  type CutscenePlaybackOption,
} from '../../shared/types/scenarioRegistry';

const OPTS: readonly CutscenePlaybackOption[] = ['auto', 'manual', 'skip'];

describe('SYNC-230 🎯 10 sprint 누적 stress', () => {
  test('CUTSCENE_PLAYBACK_OPTIONS — 3 옵션 매칭', () => {
    expect(SCENARIO_CUTSCENE_PLAYBACK_OPTIONS.length).toBe(3);
    for (const o of OPTS) {
      const n = getCutscenePlaybackOptionNarrative(o);
      expect(n, o).toBeDefined();
      expect(n?.label.trim(), o).not.toBe('');
      expect(n?.inputHandling.trim(), o).not.toBe('');
    }
  });

  test('auto 만 autoAdvance true', () => {
    expect(getCutscenePlaybackOptionNarrative('auto')?.autoAdvance).toBe(true);
    expect(getCutscenePlaybackOptionNarrative('manual')?.autoAdvance).toBe(false);
    expect(getCutscenePlaybackOptionNarrative('skip')?.autoAdvance).toBe(false);
  });

  test('sync-221~230 신규 도메인 10종 entry count 정합', () => {
    expect(SCENARIO_SEASON_CYCLE_PHASES.length).toBe(4);
    expect(SCENARIO_GUILD_RAID_TIERS.length).toBe(4);
    expect(SCENARIO_QUEST_REWARD_CURRENCIES.length).toBe(5);
    expect(SCENARIO_PARTY_ROSTER_SIZES.length).toBe(4);
    expect(SCENARIO_TRANSACTION_ERROR_CODES.length).toBe(5);
    expect(SCENARIO_INSTANCE_DUNGEON_DIFFICULTIES.length).toBe(4);
    expect(SCENARIO_PLAYER_TITLE_CATEGORIES.length).toBe(5);
    expect(SCENARIO_EMOTE_CATEGORIES.length).toBe(4);
    expect(SCENARIO_PHOTO_MODE_FILTERS.length).toBe(5);
    expect(SCENARIO_CUTSCENE_PLAYBACK_OPTIONS.length).toBe(3);
  });

  test('sync-221~230 누적 43 entry 확보', () => {
    const total =
      SCENARIO_SEASON_CYCLE_PHASES.length +
      SCENARIO_GUILD_RAID_TIERS.length +
      SCENARIO_QUEST_REWARD_CURRENCIES.length +
      SCENARIO_PARTY_ROSTER_SIZES.length +
      SCENARIO_TRANSACTION_ERROR_CODES.length +
      SCENARIO_INSTANCE_DUNGEON_DIFFICULTIES.length +
      SCENARIO_PLAYER_TITLE_CATEGORIES.length +
      SCENARIO_EMOTE_CATEGORIES.length +
      SCENARIO_PHOTO_MODE_FILTERS.length +
      SCENARIO_CUTSCENE_PLAYBACK_OPTIONS.length;
    expect(total).toBe(43);
  });
});
