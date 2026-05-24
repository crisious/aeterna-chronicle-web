/**
 * 유닛 테스트 — SYNC-194: SCENARIO_INPUT_LATENCY_TIERS SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_INPUT_LATENCY_TIERS,
  getInputLatencyTierNarrative,
  classifyInputLatencyMs,
  type InputLatencyTier,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly InputLatencyTier[] = ['excellent', 'good', 'acceptable', 'poor'];

describe('SCENARIO_INPUT_LATENCY_TIERS', () => {
  test('4 tier 모두 정의', () => {
    expect(SCENARIO_INPUT_LATENCY_TIERS.length).toBe(4);
    for (const t of ALL) {
      expect(getInputLatencyTierNarrative(t), t).toBeDefined();
    }
  });

  test('maxLatencyMs 단조 증가 (excellent < good < acceptable < poor)', () => {
    const by = (t: InputLatencyTier) => getInputLatencyTierNarrative(t)!.maxLatencyMs;
    expect(by('excellent')).toBeLessThan(by('good'));
    expect(by('good')).toBeLessThan(by('acceptable'));
    expect(by('acceptable')).toBeLessThan(by('poor'));
  });

  test('classifyInputLatencyMs 경계값', () => {
    expect(classifyInputLatencyMs(10).tier).toBe('excellent');
    expect(classifyInputLatencyMs(19).tier).toBe('excellent');
    expect(classifyInputLatencyMs(30).tier).toBe('good');
    expect(classifyInputLatencyMs(75).tier).toBe('acceptable');
    expect(classifyInputLatencyMs(150).tier).toBe('poor');
    expect(classifyInputLatencyMs(500).tier).toBe('poor');
  });

  test('uiColor 는 #rrggbb 형식', () => {
    const hex = /^#[0-9a-fA-F]{6}$/;
    for (const t of SCENARIO_INPUT_LATENCY_TIERS) {
      expect(hex.test(t.uiColor), `${t.tier}:${t.uiColor}`).toBe(true);
    }
  });

  test('label/recommendedAction 비어 있지 않음', () => {
    for (const t of SCENARIO_INPUT_LATENCY_TIERS) {
      expect(t.label.trim(), t.tier).not.toBe('');
      expect(t.recommendedAction.trim(), t.tier).not.toBe('');
    }
  });
});
