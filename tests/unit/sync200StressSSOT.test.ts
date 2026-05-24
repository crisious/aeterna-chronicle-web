/**
 * 유닛 테스트 — SYNC-200: 🎯🎯🎯 100 sprint 거대 마디 (sync-101~200) + RELEASE_VERSION
 */
import { describe, expect, test } from 'vitest';
import {
  // sync-191~200 신규 도메인
  SCENARIO_BUILD_PRESETS,
  SCENARIO_ANIMATION_EASING_CURVES,
  SCENARIO_FRAME_PACING_TARGETS,
  SCENARIO_INPUT_LATENCY_TIERS,
  SCENARIO_NETWORK_QUALITY_TIERS,
  SCENARIO_CONNECTION_STATES,
  SCENARIO_TELEMETRY_EVENT_TYPES,
  SCENARIO_PERFORMANCE_BUDGETS,
  SCENARIO_ASSET_LOAD_PRIORITIES,
  SCENARIO_RELEASE_VERSION_LABELS,
  // sync-101~190 sample (정합 가드)
  SCENARIO_FIELD_NPC_DIALOGUE_TEMPLATES,
  SCENARIO_BGM_NARRATIVES,
  SCENARIO_AMBIENT_NARRATIVES,
  SCENARIO_DEITY_NARRATIVES,
  SCENARIO_FACTION_INTRO_NARRATIVES,
  SCENARIO_CLASS_LEVEL_UP_NARRATIVES,
  SCENARIO_PASSIVE_EFFECT_LABELS,
  SCENARIO_BOSS_PHASE_TRANSITIONS,
  SCENARIO_AETHER_RESONANCE_LEVELS,
  SCENARIO_NPC_OCCUPATION_LABELS,
  SCENARIO_BENCHMARK_PROFILES,
  getReleaseVersionLabel,
  listReleaseVersionsByStability,
  type ReleaseVersionChannel,
} from '../../shared/types/scenarioRegistry';

const CHANNELS: readonly ReleaseVersionChannel[] = ['alpha', 'beta', 'rc', 'stable', 'lts'];

describe('SYNC-200 🎯🎯🎯 100 sprint 거대 마디 stress', () => {
  test('RELEASE_VERSION_LABELS — 5 채널 매칭 + 본문', () => {
    expect(SCENARIO_RELEASE_VERSION_LABELS.length).toBe(5);
    for (const c of CHANNELS) {
      const r = getReleaseVersionLabel(c);
      expect(r, c).toBeDefined();
      expect(r?.label.trim(), c).not.toBe('');
      expect(r?.stabilityScore, c).toBeGreaterThanOrEqual(0);
      expect(r?.stabilityScore, c).toBeLessThanOrEqual(1);
      expect(r?.recommendedAudience.trim(), c).not.toBe('');
      expect(r?.updateFrequency.trim(), c).not.toBe('');
    }
  });

  test('stabilityScore 단조 증가 (alpha < lts)', () => {
    const sorted = listReleaseVersionsByStability();
    for (let i = 1; i < sorted.length; i += 1) {
      expect(sorted[i].stabilityScore).toBeGreaterThanOrEqual(sorted[i - 1].stabilityScore);
    }
    expect(getReleaseVersionLabel('alpha')!.stabilityScore).toBeLessThan(getReleaseVersionLabel('lts')!.stabilityScore);
  });

  test('sync-191~200 신규 도메인 10종 entry count 정합', () => {
    expect(SCENARIO_BUILD_PRESETS.length).toBe(6);
    expect(SCENARIO_ANIMATION_EASING_CURVES.length).toBe(5);
    expect(SCENARIO_FRAME_PACING_TARGETS.length).toBe(4);
    expect(SCENARIO_INPUT_LATENCY_TIERS.length).toBe(4);
    expect(SCENARIO_NETWORK_QUALITY_TIERS.length).toBe(4);
    expect(SCENARIO_CONNECTION_STATES.length).toBe(4);
    expect(SCENARIO_TELEMETRY_EVENT_TYPES.length).toBe(5);
    expect(SCENARIO_PERFORMANCE_BUDGETS.length).toBe(4);
    expect(SCENARIO_ASSET_LOAD_PRIORITIES.length).toBe(5);
    expect(SCENARIO_RELEASE_VERSION_LABELS.length).toBe(5);
  });

  test('sync-191~200 누적 46 entry 확보', () => {
    const total =
      SCENARIO_BUILD_PRESETS.length +
      SCENARIO_ANIMATION_EASING_CURVES.length +
      SCENARIO_FRAME_PACING_TARGETS.length +
      SCENARIO_INPUT_LATENCY_TIERS.length +
      SCENARIO_NETWORK_QUALITY_TIERS.length +
      SCENARIO_CONNECTION_STATES.length +
      SCENARIO_TELEMETRY_EVENT_TYPES.length +
      SCENARIO_PERFORMANCE_BUDGETS.length +
      SCENARIO_ASSET_LOAD_PRIORITIES.length +
      SCENARIO_RELEASE_VERSION_LABELS.length;
    expect(total).toBe(46);
  });

  test('🎯🎯🎯 100 sprint 누적 sample 도메인 entry count 정합', () => {
    expect(SCENARIO_FIELD_NPC_DIALOGUE_TEMPLATES.length).toBeGreaterThanOrEqual(6);
    expect(SCENARIO_BGM_NARRATIVES.length).toBe(42);
    expect(SCENARIO_AMBIENT_NARRATIVES.length).toBe(43);
    expect(SCENARIO_DEITY_NARRATIVES.length).toBe(12);
    expect(SCENARIO_FACTION_INTRO_NARRATIVES.length).toBe(7);
    expect(SCENARIO_CLASS_LEVEL_UP_NARRATIVES.length).toBe(18);
    expect(SCENARIO_PASSIVE_EFFECT_LABELS.length).toBe(14);
    expect(SCENARIO_BOSS_PHASE_TRANSITIONS.length).toBe(11);
    expect(SCENARIO_AETHER_RESONANCE_LEVELS.length).toBe(5);
    expect(SCENARIO_NPC_OCCUPATION_LABELS.length).toBe(6);
    expect(SCENARIO_BENCHMARK_PROFILES.length).toBe(4);
  });
});
