/**
 * 유닛 테스트 — SYNC-207: SCENARIO_LOCALIZATION_FALLBACK_RULES SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_LOCALIZATION_FALLBACK_RULES,
  getLocalizationFallbackRuleNarrative,
  listLocalizationFallbackRules,
  type LocalizationFallbackRule,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly LocalizationFallbackRule[] = ['strict', 'region_first', 'english_default', 'native_only'];

describe('SCENARIO_LOCALIZATION_FALLBACK_RULES', () => {
  test('4 규칙 모두 정의', () => {
    expect(SCENARIO_LOCALIZATION_FALLBACK_RULES.length).toBe(4);
    for (const r of ALL) {
      expect(getLocalizationFallbackRuleNarrative(r), r).toBeDefined();
    }
  });

  test('label/fallbackBehavior/recommendedUse 비어 있지 않음', () => {
    for (const r of SCENARIO_LOCALIZATION_FALLBACK_RULES) {
      expect(r.label.trim(), r.rule).not.toBe('');
      expect(r.fallbackBehavior.trim(), r.rule).not.toBe('');
      expect(r.recommendedUse.trim(), r.rule).not.toBe('');
    }
  });

  test('rule 중복 없음', () => {
    const rs = SCENARIO_LOCALIZATION_FALLBACK_RULES.map((r) => r.rule);
    expect(new Set(rs).size).toBe(rs.length);
  });

  test('listLocalizationFallbackRules 는 4 규칙', () => {
    expect(listLocalizationFallbackRules()).toEqual(ALL);
  });
});
