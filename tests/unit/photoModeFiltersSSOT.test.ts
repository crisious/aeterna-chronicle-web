/**
 * 유닛 테스트 — SYNC-229: SCENARIO_PHOTO_MODE_FILTERS SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_PHOTO_MODE_FILTERS,
  getPhotoModeFilterNarrative,
  listPhotoModeFilters,
  type PhotoModeFilter,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly PhotoModeFilter[] = ['none', 'sepia', 'noir', 'vintage', 'neon'];

describe('SCENARIO_PHOTO_MODE_FILTERS', () => {
  test('5 필터 모두 정의', () => {
    expect(SCENARIO_PHOTO_MODE_FILTERS.length).toBe(5);
    for (const f of ALL) {
      expect(getPhotoModeFilterNarrative(f), f).toBeDefined();
    }
  });

  test('none 필터의 cssFilter 는 "none"', () => {
    expect(getPhotoModeFilterNarrative('none')?.cssFilter).toBe('none');
  });

  test('cssFilter 비어 있지 않음', () => {
    for (const f of SCENARIO_PHOTO_MODE_FILTERS) {
      expect(f.cssFilter.trim(), f.filter).not.toBe('');
    }
  });

  test('label/moodHint 비어 있지 않음', () => {
    for (const f of SCENARIO_PHOTO_MODE_FILTERS) {
      expect(f.label.trim(), f.filter).not.toBe('');
      expect(f.moodHint.trim(), f.filter).not.toBe('');
    }
  });

  test('filter 중복 없음', () => {
    const fs = SCENARIO_PHOTO_MODE_FILTERS.map((f) => f.filter);
    expect(new Set(fs).size).toBe(fs.length);
  });
});
