/**
 * 유닛 테스트 — SYNC-228: SCENARIO_EMOTE_CATEGORIES SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_EMOTE_CATEGORIES,
  getEmoteCategoryNarrative,
  listPvpAllowedEmoteCategories,
  type EmoteCategory,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly EmoteCategory[] = ['greeting', 'celebration', 'taunt', 'communication'];

describe('SCENARIO_EMOTE_CATEGORIES', () => {
  test('4 카테고리 모두 정의', () => {
    expect(SCENARIO_EMOTE_CATEGORIES.length).toBe(4);
    for (const c of ALL) {
      expect(getEmoteCategoryNarrative(c), c).toBeDefined();
    }
  });

  test('communication 만 PvP 비허용', () => {
    expect(getEmoteCategoryNarrative('communication')?.allowedInPvp).toBe(false);
    expect(getEmoteCategoryNarrative('greeting')?.allowedInPvp).toBe(true);
    expect(getEmoteCategoryNarrative('celebration')?.allowedInPvp).toBe(true);
    expect(getEmoteCategoryNarrative('taunt')?.allowedInPvp).toBe(true);
  });

  test('listPvpAllowedEmoteCategories 3종 (communication 제외)', () => {
    expect(listPvpAllowedEmoteCategories().length).toBe(3);
  });

  test('averageEmoteCount 양수', () => {
    for (const c of SCENARIO_EMOTE_CATEGORIES) {
      expect(c.averageEmoteCount, c.category).toBeGreaterThan(0);
    }
  });

  test('label/description 비어 있지 않음', () => {
    for (const c of SCENARIO_EMOTE_CATEGORIES) {
      expect(c.label.trim(), c.category).not.toBe('');
      expect(c.description.trim(), c.category).not.toBe('');
    }
  });
});
