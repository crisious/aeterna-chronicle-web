/**
 * 유닛 테스트 — SYNC-205: 🎯 5 sprint (201~205) 누적 stress + REPLAY_PLAYBACK_SPEEDS
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_GAMEPLAY_TIMERS,
  SCENARIO_INVENTORY_FILTER_PRESETS,
  SCENARIO_MENU_NAV_DEPTHS,
  SCENARIO_TUTORIAL_SKIP_OPTIONS,
  SCENARIO_REPLAY_PLAYBACK_SPEEDS,
  getReplayPlaybackSpeedNarrative,
  listReplayPlaybackSpeedsAscending,
  type ReplayPlaybackSpeed,
} from '../../shared/types/scenarioRegistry';

const SPEEDS: readonly ReplayPlaybackSpeed[] = ['quarter', 'half', 'normal', 'double', 'quad'];

describe('SYNC-205 🎯 5 sprint 누적 stress', () => {
  test('REPLAY_PLAYBACK_SPEEDS — 5 속도 매칭 + 본문', () => {
    expect(SCENARIO_REPLAY_PLAYBACK_SPEEDS.length).toBe(5);
    for (const s of SPEEDS) {
      const n = getReplayPlaybackSpeedNarrative(s);
      expect(n, s).toBeDefined();
      expect(n?.label.trim(), s).not.toBe('');
      expect(n?.usageHint.trim(), s).not.toBe('');
      expect(n?.multiplier, s).toBeGreaterThan(0);
    }
  });

  test('multiplier 단조 증가 (0.25 < 0.5 < 1 < 2 < 4)', () => {
    const sorted = listReplayPlaybackSpeedsAscending();
    for (let i = 1; i < sorted.length; i += 1) {
      expect(sorted[i].multiplier).toBeGreaterThan(sorted[i - 1].multiplier);
    }
  });

  test('sync-201~205 신규 도메인 5종 entry count 정합', () => {
    expect(SCENARIO_GAMEPLAY_TIMERS.length).toBe(4);
    expect(SCENARIO_INVENTORY_FILTER_PRESETS.length).toBe(5);
    expect(SCENARIO_MENU_NAV_DEPTHS.length).toBe(4);
    expect(SCENARIO_TUTORIAL_SKIP_OPTIONS.length).toBe(3);
    expect(SCENARIO_REPLAY_PLAYBACK_SPEEDS.length).toBe(5);
  });

  test('sync-201~205 누적 21 entry 확보', () => {
    const total =
      SCENARIO_GAMEPLAY_TIMERS.length +
      SCENARIO_INVENTORY_FILTER_PRESETS.length +
      SCENARIO_MENU_NAV_DEPTHS.length +
      SCENARIO_TUTORIAL_SKIP_OPTIONS.length +
      SCENARIO_REPLAY_PLAYBACK_SPEEDS.length;
    expect(total).toBe(21);
  });
});
