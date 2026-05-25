/**
 * 유닛 테스트 — SYNC-227: SCENARIO_PLAYER_TITLE_CATEGORIES SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_PLAYER_TITLE_CATEGORIES,
  getPlayerTitleCategoryNarrative,
  listPermanentTitleCategories,
  type PlayerTitleCategory,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly PlayerTitleCategory[] = ['achievement', 'pvp', 'seasonal', 'lore', 'special'];

describe('SCENARIO_PLAYER_TITLE_CATEGORIES', () => {
  test('5 카테고리 모두 정의', () => {
    expect(SCENARIO_PLAYER_TITLE_CATEGORIES.length).toBe(5);
    for (const c of ALL) {
      expect(getPlayerTitleCategoryNarrative(c), c).toBeDefined();
    }
  });

  test('영구 칭호 3종 (achievement/lore/special)', () => {
    const permanent = listPermanentTitleCategories();
    expect(permanent.length).toBe(3);
    expect(permanent.map((p) => p.category)).toEqual(expect.arrayContaining(['achievement', 'lore', 'special']));
  });

  test('uiColor 는 #rrggbb 형식', () => {
    const hex = /^#[0-9a-fA-F]{6}$/;
    for (const c of SCENARIO_PLAYER_TITLE_CATEGORIES) {
      expect(hex.test(c.uiColor), `${c.category}:${c.uiColor}`).toBe(true);
    }
  });

  test('label/source 비어 있지 않음', () => {
    for (const c of SCENARIO_PLAYER_TITLE_CATEGORIES) {
      expect(c.label.trim(), c.category).not.toBe('');
      expect(c.source.trim(), c.category).not.toBe('');
    }
  });

  test('category 중복 없음', () => {
    const cs = SCENARIO_PLAYER_TITLE_CATEGORIES.map((c) => c.category);
    expect(new Set(cs).size).toBe(cs.length);
  });
});
