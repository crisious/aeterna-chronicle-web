/**
 * 유닛 테스트 — SYNC-192: SCENARIO_ANIMATION_EASING_CURVES SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_ANIMATION_EASING_CURVES,
  getAnimationEasingNarrative,
  listAnimationEasingKinds,
  type AnimationEasingKind,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly AnimationEasingKind[] = ['linear', 'ease_in', 'ease_out', 'ease_in_out', 'bounce'];

describe('SCENARIO_ANIMATION_EASING_CURVES', () => {
  test('5 이징 모두 정의', () => {
    expect(SCENARIO_ANIMATION_EASING_CURVES.length).toBe(5);
    for (const e of ALL) {
      expect(getAnimationEasingNarrative(e), e).toBeDefined();
    }
  });

  test('cssValue 는 linear 또는 cubic-bezier 형식', () => {
    for (const e of SCENARIO_ANIMATION_EASING_CURVES) {
      const isLinear = e.cssValue === 'linear';
      const isCubicBezier = /^cubic-bezier\(/.test(e.cssValue);
      expect(isLinear || isCubicBezier, `${e.easing}:${e.cssValue}`).toBe(true);
    }
  });

  test('label/usageHint 비어 있지 않음', () => {
    for (const e of SCENARIO_ANIMATION_EASING_CURVES) {
      expect(e.label.trim(), e.easing).not.toBe('');
      expect(e.usageHint.trim(), e.easing).not.toBe('');
    }
  });

  test('easing 중복 없음', () => {
    const es = SCENARIO_ANIMATION_EASING_CURVES.map((e) => e.easing);
    expect(new Set(es).size).toBe(es.length);
  });

  test('listAnimationEasingKinds 는 5 이징', () => {
    expect(listAnimationEasingKinds()).toEqual(ALL);
  });
});
