/**
 * 유닛 테스트 — SYNC-185: 🎯 5 sprint (181~185) 누적 stress + CINEMATIC_TRANSITIONS
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_AUDIO_CHANNEL_LABELS,
  SCENARIO_GAMEPAD_BUTTON_MAPPINGS,
  SCENARIO_DEBUG_OVERLAY_LABELS,
  SCENARIO_OPTION_CATEGORIES,
  SCENARIO_CINEMATIC_TRANSITIONS,
  getCinematicTransitionNarrative,
  listCinematicTransitionKinds,
  type CinematicTransitionKind,
} from '../../shared/types/scenarioRegistry';

const KINDS: readonly CinematicTransitionKind[] = ['fade', 'slide', 'iris', 'dissolve'];

describe('SYNC-185 🎯 5 sprint 누적 stress', () => {
  test('CINEMATIC_TRANSITIONS — 4 종 매칭 + 본문', () => {
    expect(SCENARIO_CINEMATIC_TRANSITIONS.length).toBe(4);
    for (const k of KINDS) {
      const n = getCinematicTransitionNarrative(k);
      expect(n, k).toBeDefined();
      expect(n?.label.trim(), k).not.toBe('');
      expect(n?.usageHint.trim(), k).not.toBe('');
      expect(n?.durationMs, k).toBeGreaterThan(0);
    }
    expect(listCinematicTransitionKinds()).toEqual(KINDS);
  });

  test('sync-181~185 신규 도메인 5종 entry count 정합', () => {
    expect(SCENARIO_AUDIO_CHANNEL_LABELS.length).toBe(5);
    expect(SCENARIO_GAMEPAD_BUTTON_MAPPINGS.length).toBe(8);
    expect(SCENARIO_DEBUG_OVERLAY_LABELS.length).toBe(6);
    expect(SCENARIO_OPTION_CATEGORIES.length).toBe(4);
    expect(SCENARIO_CINEMATIC_TRANSITIONS.length).toBe(4);
  });

  test('sync-181~185 누적 27 entry 확보', () => {
    const total =
      SCENARIO_AUDIO_CHANNEL_LABELS.length +
      SCENARIO_GAMEPAD_BUTTON_MAPPINGS.length +
      SCENARIO_DEBUG_OVERLAY_LABELS.length +
      SCENARIO_OPTION_CATEGORIES.length +
      SCENARIO_CINEMATIC_TRANSITIONS.length;
    expect(total).toBe(27);
  });
});
