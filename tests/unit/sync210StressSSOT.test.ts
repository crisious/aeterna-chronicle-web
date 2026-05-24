/**
 * 유닛 테스트 — SYNC-210: 🎯 10 sprint (201~210) 누적 stress + CONTENT_RATING
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_GAMEPLAY_TIMERS,
  SCENARIO_INVENTORY_FILTER_PRESETS,
  SCENARIO_MENU_NAV_DEPTHS,
  SCENARIO_TUTORIAL_SKIP_OPTIONS,
  SCENARIO_REPLAY_PLAYBACK_SPEEDS,
  SCENARIO_CHEAT_CODES,
  SCENARIO_LOCALIZATION_FALLBACK_RULES,
  SCENARIO_AB_TEST_VARIANTS,
  SCENARIO_USER_FEEDBACK_CATEGORIES,
  SCENARIO_CONTENT_RATING_LABELS,
  getContentRatingNarrative,
  classifyContentRatingByAge,
  type ContentRating,
} from '../../shared/types/scenarioRegistry';

const RATINGS: readonly ContentRating[] = ['all', 'twelve_plus', 'fifteen_plus', 'teen', 'mature'];

describe('SYNC-210 🎯 10 sprint 누적 stress', () => {
  test('CONTENT_RATING_LABELS — 5 등급 매칭 + 본문', () => {
    expect(SCENARIO_CONTENT_RATING_LABELS.length).toBe(5);
    for (const r of RATINGS) {
      const n = getContentRatingNarrative(r);
      expect(n, r).toBeDefined();
      expect(n?.label.trim(), r).not.toBe('');
      expect(n?.reason.trim(), r).not.toBe('');
      expect(n?.minAge, r).toBeGreaterThanOrEqual(0);
    }
  });

  test('classifyContentRatingByAge 경계값', () => {
    expect(classifyContentRatingByAge(5).rating).toBe('all');
    expect(classifyContentRatingByAge(12).rating).toBe('twelve_plus');
    expect(classifyContentRatingByAge(15).rating).toBe('fifteen_plus');
    expect(classifyContentRatingByAge(17).rating).toBe('teen');
    expect(classifyContentRatingByAge(20).rating).toBe('mature');
  });

  test('sync-201~210 신규 도메인 10종 entry count 정합', () => {
    expect(SCENARIO_GAMEPLAY_TIMERS.length).toBe(4);
    expect(SCENARIO_INVENTORY_FILTER_PRESETS.length).toBe(5);
    expect(SCENARIO_MENU_NAV_DEPTHS.length).toBe(4);
    expect(SCENARIO_TUTORIAL_SKIP_OPTIONS.length).toBe(3);
    expect(SCENARIO_REPLAY_PLAYBACK_SPEEDS.length).toBe(5);
    expect(SCENARIO_CHEAT_CODES.length).toBe(5);
    expect(SCENARIO_LOCALIZATION_FALLBACK_RULES.length).toBe(4);
    expect(SCENARIO_AB_TEST_VARIANTS.length).toBe(4);
    expect(SCENARIO_USER_FEEDBACK_CATEGORIES.length).toBe(5);
    expect(SCENARIO_CONTENT_RATING_LABELS.length).toBe(5);
  });

  test('sync-201~210 누적 44 entry 확보', () => {
    const total =
      SCENARIO_GAMEPLAY_TIMERS.length +
      SCENARIO_INVENTORY_FILTER_PRESETS.length +
      SCENARIO_MENU_NAV_DEPTHS.length +
      SCENARIO_TUTORIAL_SKIP_OPTIONS.length +
      SCENARIO_REPLAY_PLAYBACK_SPEEDS.length +
      SCENARIO_CHEAT_CODES.length +
      SCENARIO_LOCALIZATION_FALLBACK_RULES.length +
      SCENARIO_AB_TEST_VARIANTS.length +
      SCENARIO_USER_FEEDBACK_CATEGORIES.length +
      SCENARIO_CONTENT_RATING_LABELS.length;
    expect(total).toBe(44);
  });
});
