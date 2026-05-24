/**
 * 유닛 테스트 — SYNC-148: SCENARIO_QUICKSLOT_HINTS SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_QUICKSLOT_HINTS,
  getQuickslotHint,
  listQuickslotCategories,
  type QuickslotCategory,
} from '../../shared/types/scenarioRegistry';

const CATS: readonly QuickslotCategory[] = ['heal', 'attack', 'defense', 'special'];

describe('SCENARIO_QUICKSLOT_HINTS', () => {
  test('4 슬롯 모두 정의 (slotIndex 1~4)', () => {
    expect(SCENARIO_QUICKSLOT_HINTS.length).toBe(4);
    for (const idx of [1, 2, 3, 4] as const) {
      expect(getQuickslotHint(idx), `slot ${idx}`).toBeDefined();
    }
  });

  test('shortcutKey 는 1~4 (slot index 와 일치)', () => {
    for (const q of SCENARIO_QUICKSLOT_HINTS) {
      expect(q.shortcutKey).toBe(String(q.slotIndex));
    }
  });

  test('category 4종 모두 등장 (slot 별 unique)', () => {
    const cats = SCENARIO_QUICKSLOT_HINTS.map((q) => q.category);
    expect(new Set(cats)).toEqual(new Set(CATS));
  });

  test('label/recommendedItemAnchor 비어 있지 않음', () => {
    for (const q of SCENARIO_QUICKSLOT_HINTS) {
      expect(q.label.trim(), `slot ${q.slotIndex}`).not.toBe('');
      expect(q.recommendedItemAnchor.trim(), `slot ${q.slotIndex}`).not.toBe('');
    }
  });

  test('slotIndex 중복 없음', () => {
    const ids = SCENARIO_QUICKSLOT_HINTS.map((q) => q.slotIndex);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
