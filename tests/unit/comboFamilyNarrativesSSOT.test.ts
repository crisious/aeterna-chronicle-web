/**
 * 유닛 테스트 — SYNC-153: SCENARIO_COMBO_FAMILY_NARRATIVES SSOT
 *
 * 1) 6 클래스 × 1 family = 6 entry 매칭
 * 2) ClassKey cross — SCENARIO_CLASS_LEVEL_UP_NARRATIVES 와 1:1
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_COMBO_FAMILY_NARRATIVES,
  SCENARIO_CLASS_LEVEL_UP_NARRATIVES,
  getComboFamilyNarrative,
} from '../../shared/types/scenarioRegistry';

describe('SCENARIO_COMBO_FAMILY_NARRATIVES', () => {
  test('6 클래스 모두 family 매칭', () => {
    expect(SCENARIO_COMBO_FAMILY_NARRATIVES.length).toBe(6);
    const classKeys = new Set(SCENARIO_CLASS_LEVEL_UP_NARRATIVES.map((c) => c.classKey));
    for (const ck of classKeys) {
      expect(getComboFamilyNarrative(ck), ck).toBeDefined();
    }
  });

  test('combo family 는 SCENARIO_CLASS_LEVEL_UP_NARRATIVES 의 classKey 만 참조', () => {
    const validClassKeys = new Set(SCENARIO_CLASS_LEVEL_UP_NARRATIVES.map((c) => c.classKey));
    for (const c of SCENARIO_COMBO_FAMILY_NARRATIVES) {
      expect(validClassKeys.has(c.classKey), c.classKey).toBe(true);
    }
  });

  test('familyName/intentSummary/triggerHint 비어 있지 않음', () => {
    for (const c of SCENARIO_COMBO_FAMILY_NARRATIVES) {
      expect(c.familyName.trim(), c.classKey).not.toBe('');
      expect(c.intentSummary.trim(), c.classKey).not.toBe('');
      expect(c.triggerHint.trim(), c.classKey).not.toBe('');
    }
  });

  test('classKey 중복 없음', () => {
    const ks = SCENARIO_COMBO_FAMILY_NARRATIVES.map((c) => c.classKey);
    expect(new Set(ks).size).toBe(ks.length);
  });
});
