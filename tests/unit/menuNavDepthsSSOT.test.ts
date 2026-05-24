/**
 * 유닛 테스트 — SYNC-203: SCENARIO_MENU_NAV_DEPTHS SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_MENU_NAV_DEPTHS,
  getMenuNavDepthNarrative,
  listMenuNavDepthsAscending,
  type MenuNavDepth,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly MenuNavDepth[] = ['root', 'category', 'item', 'detail'];

describe('SCENARIO_MENU_NAV_DEPTHS', () => {
  test('4 depth 모두 정의', () => {
    expect(SCENARIO_MENU_NAV_DEPTHS.length).toBe(4);
    for (const d of ALL) {
      expect(getMenuNavDepthNarrative(d), d).toBeDefined();
    }
  });

  test('depthNumber 0~3 중복 없음', () => {
    const ds = SCENARIO_MENU_NAV_DEPTHS.map((d) => d.depthNumber).sort((a, b) => a - b);
    expect(ds).toEqual([0, 1, 2, 3]);
  });

  test('listMenuNavDepthsAscending ascending', () => {
    const sorted = listMenuNavDepthsAscending();
    for (let i = 1; i < sorted.length; i += 1) {
      expect(sorted[i].depthNumber).toBeGreaterThan(sorted[i - 1].depthNumber);
    }
  });

  test('label/breadcrumbFormat/backKeyBehavior 비어 있지 않음', () => {
    for (const d of SCENARIO_MENU_NAV_DEPTHS) {
      expect(d.label.trim(), d.depth).not.toBe('');
      expect(d.breadcrumbFormat.trim(), d.depth).not.toBe('');
      expect(d.backKeyBehavior.trim(), d.depth).not.toBe('');
    }
  });

  test('depth 중복 없음', () => {
    const ds = SCENARIO_MENU_NAV_DEPTHS.map((d) => d.depth);
    expect(new Set(ds).size).toBe(ds.length);
  });
});
