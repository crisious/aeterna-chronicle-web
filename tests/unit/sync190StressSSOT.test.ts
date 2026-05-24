/**
 * 유닛 테스트 — SYNC-190: 🎯 10 sprint (181~190) 누적 stress + BENCHMARK_PROFILES
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_AUDIO_CHANNEL_LABELS,
  SCENARIO_GAMEPAD_BUTTON_MAPPINGS,
  SCENARIO_DEBUG_OVERLAY_LABELS,
  SCENARIO_OPTION_CATEGORIES,
  SCENARIO_CINEMATIC_TRANSITIONS,
  SCENARIO_PATH_FINDING_PROFILES,
  SCENARIO_ACHIEVEMENT_CATEGORIES,
  SCENARIO_LOG_LEVELS,
  SCENARIO_LOCALE_LABELS,
  SCENARIO_BENCHMARK_PROFILES,
  getBenchmarkProfileNarrative,
  listBenchmarkProfilesAscending,
  type BenchmarkProfileKey,
} from '../../shared/types/scenarioRegistry';

const PROFILES: readonly BenchmarkProfileKey[] = ['low', 'medium', 'high', 'ultra'];

describe('SYNC-190 🎯 10 sprint 누적 stress', () => {
  test('BENCHMARK_PROFILES — 4 프로파일 매칭 + 본문', () => {
    expect(SCENARIO_BENCHMARK_PROFILES.length).toBe(4);
    for (const p of PROFILES) {
      const n = getBenchmarkProfileNarrative(p);
      expect(n, p).toBeDefined();
      expect(n?.label.trim(), p).not.toBe('');
      expect(n?.targetFps, p).toBeGreaterThan(0);
      expect(n?.recommendedGpuTier.trim(), p).not.toBe('');
      expect(n?.modifierSummary.trim(), p).not.toBe('');
    }
    expect(listBenchmarkProfilesAscending()).toEqual(PROFILES);
  });

  test('sync-181~190 신규 도메인 10종 entry count 정합', () => {
    expect(SCENARIO_AUDIO_CHANNEL_LABELS.length).toBe(5);
    expect(SCENARIO_GAMEPAD_BUTTON_MAPPINGS.length).toBe(8);
    expect(SCENARIO_DEBUG_OVERLAY_LABELS.length).toBe(6);
    expect(SCENARIO_OPTION_CATEGORIES.length).toBe(4);
    expect(SCENARIO_CINEMATIC_TRANSITIONS.length).toBe(4);
    expect(SCENARIO_PATH_FINDING_PROFILES.length).toBe(4);
    expect(SCENARIO_ACHIEVEMENT_CATEGORIES.length).toBe(4);
    expect(SCENARIO_LOG_LEVELS.length).toBe(5);
    expect(SCENARIO_LOCALE_LABELS.length).toBe(4);
    expect(SCENARIO_BENCHMARK_PROFILES.length).toBe(4);
  });

  test('sync-181~190 누적 48 entry 확보', () => {
    const total =
      SCENARIO_AUDIO_CHANNEL_LABELS.length +
      SCENARIO_GAMEPAD_BUTTON_MAPPINGS.length +
      SCENARIO_DEBUG_OVERLAY_LABELS.length +
      SCENARIO_OPTION_CATEGORIES.length +
      SCENARIO_CINEMATIC_TRANSITIONS.length +
      SCENARIO_PATH_FINDING_PROFILES.length +
      SCENARIO_ACHIEVEMENT_CATEGORIES.length +
      SCENARIO_LOG_LEVELS.length +
      SCENARIO_LOCALE_LABELS.length +
      SCENARIO_BENCHMARK_PROFILES.length;
    expect(total).toBe(48);
  });
});
