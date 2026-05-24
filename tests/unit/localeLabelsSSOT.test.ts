/**
 * 유닛 테스트 — SYNC-189: SCENARIO_LOCALE_LABELS SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_LOCALE_LABELS,
  getLocaleLabelNarrative,
  listLocalesByCompleteness,
  type LocaleCode,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly LocaleCode[] = ['ko_KR', 'en_US', 'ja_JP', 'zh_CN'];

describe('SCENARIO_LOCALE_LABELS', () => {
  test('4 로케일 모두 정의', () => {
    expect(SCENARIO_LOCALE_LABELS.length).toBe(4);
    for (const l of ALL) {
      expect(getLocaleLabelNarrative(l), l).toBeDefined();
    }
  });

  test('translationCompleteness 는 0~1 범위', () => {
    for (const l of SCENARIO_LOCALE_LABELS) {
      expect(l.translationCompleteness, l.locale).toBeGreaterThanOrEqual(0);
      expect(l.translationCompleteness, l.locale).toBeLessThanOrEqual(1);
    }
  });

  test('ko_KR 은 완성도 1.0 (주 언어)', () => {
    expect(getLocaleLabelNarrative('ko_KR')?.translationCompleteness).toBe(1.0);
  });

  test('englishName/nativeName/recommendedFontFamily 비어 있지 않음', () => {
    for (const l of SCENARIO_LOCALE_LABELS) {
      expect(l.englishName.trim(), l.locale).not.toBe('');
      expect(l.nativeName.trim(), l.locale).not.toBe('');
      expect(l.recommendedFontFamily.trim(), l.locale).not.toBe('');
    }
  });

  test('listLocalesByCompleteness descending', () => {
    const sorted = listLocalesByCompleteness();
    for (let i = 1; i < sorted.length; i += 1) {
      expect(sorted[i].translationCompleteness).toBeLessThanOrEqual(sorted[i - 1].translationCompleteness);
    }
  });
});
