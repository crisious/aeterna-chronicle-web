/**
 * 유닛 테스트 — SYNC-195: 🎯 5 sprint (191~195) 누적 stress + NETWORK_QUALITY_TIERS
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_BUILD_PRESETS,
  SCENARIO_ANIMATION_EASING_CURVES,
  SCENARIO_FRAME_PACING_TARGETS,
  SCENARIO_INPUT_LATENCY_TIERS,
  SCENARIO_NETWORK_QUALITY_TIERS,
  getNetworkQualityNarrative,
  classifyNetworkQuality,
  type NetworkQualityTier,
} from '../../shared/types/scenarioRegistry';

const TIERS: readonly NetworkQualityTier[] = ['excellent', 'good', 'acceptable', 'poor'];

describe('SYNC-195 🎯 5 sprint 누적 stress', () => {
  test('NETWORK_QUALITY_TIERS — 4 tier 매칭', () => {
    expect(SCENARIO_NETWORK_QUALITY_TIERS.length).toBe(4);
    for (const t of TIERS) {
      const n = getNetworkQualityNarrative(t);
      expect(n, t).toBeDefined();
      expect(n?.label.trim(), t).not.toBe('');
      expect(n?.icon.trim(), t).not.toBe('');
      expect(n?.maxPingMs, t).toBeGreaterThan(0);
      expect(n?.maxPacketLossPercent, t).toBeGreaterThan(0);
    }
  });

  test('classifyNetworkQuality 경계값', () => {
    expect(classifyNetworkQuality(10, 0.1).tier).toBe('excellent');
    expect(classifyNetworkQuality(50, 1).tier).toBe('good');
    expect(classifyNetworkQuality(100, 3).tier).toBe('acceptable');
    expect(classifyNetworkQuality(500, 50).tier).toBe('poor');
  });

  test('sync-191~195 신규 도메인 5종 entry count 정합', () => {
    expect(SCENARIO_BUILD_PRESETS.length).toBe(6);
    expect(SCENARIO_ANIMATION_EASING_CURVES.length).toBe(5);
    expect(SCENARIO_FRAME_PACING_TARGETS.length).toBe(4);
    expect(SCENARIO_INPUT_LATENCY_TIERS.length).toBe(4);
    expect(SCENARIO_NETWORK_QUALITY_TIERS.length).toBe(4);
  });

  test('sync-191~195 누적 23 entry 확보', () => {
    const total =
      SCENARIO_BUILD_PRESETS.length +
      SCENARIO_ANIMATION_EASING_CURVES.length +
      SCENARIO_FRAME_PACING_TARGETS.length +
      SCENARIO_INPUT_LATENCY_TIERS.length +
      SCENARIO_NETWORK_QUALITY_TIERS.length;
    expect(total).toBe(23);
  });
});
