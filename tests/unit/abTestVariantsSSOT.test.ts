/**
 * 유닛 테스트 — SYNC-208: SCENARIO_AB_TEST_VARIANTS SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_AB_TEST_VARIANTS,
  getAbTestVariantNarrative,
  getTotalAbTestTrafficWeight,
  type AbTestVariantKey,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly AbTestVariantKey[] = ['control', 'variant_a', 'variant_b', 'variant_c'];

describe('SCENARIO_AB_TEST_VARIANTS', () => {
  test('4 변형 모두 정의', () => {
    expect(SCENARIO_AB_TEST_VARIANTS.length).toBe(4);
    for (const v of ALL) {
      expect(getAbTestVariantNarrative(v), v).toBeDefined();
    }
  });

  test('trafficWeight 합산은 1.0', () => {
    expect(getTotalAbTestTrafficWeight()).toBeCloseTo(1.0, 5);
  });

  test('각 trafficWeight 는 0~1 범위', () => {
    for (const v of SCENARIO_AB_TEST_VARIANTS) {
      expect(v.trafficWeight, v.variant).toBeGreaterThan(0);
      expect(v.trafficWeight, v.variant).toBeLessThanOrEqual(1);
    }
  });

  test('label/description 비어 있지 않음', () => {
    for (const v of SCENARIO_AB_TEST_VARIANTS) {
      expect(v.label.trim(), v.variant).not.toBe('');
      expect(v.description.trim(), v.variant).not.toBe('');
    }
  });

  test('variant 중복 없음', () => {
    const vs = SCENARIO_AB_TEST_VARIANTS.map((v) => v.variant);
    expect(new Set(vs).size).toBe(vs.length);
  });
});
