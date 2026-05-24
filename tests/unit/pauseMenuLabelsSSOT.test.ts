/**
 * 유닛 테스트 — SYNC-127: SCENARIO_PAUSE_MENU_LABELS SSOT consistency
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_PAUSE_MENU_LABELS,
  getPauseMenuLabel,
  listPauseMenuLabelsSorted,
  type PauseMenuKey,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly PauseMenuKey[] = ['resume', 'inventory', 'skill', 'quest', 'settings', 'title'];

describe('SCENARIO_PAUSE_MENU_LABELS', () => {
  test('6 항목 모두 정의', () => {
    expect(SCENARIO_PAUSE_MENU_LABELS.length).toBe(6);
    for (const k of ALL) {
      expect(getPauseMenuLabel(k), k).toBeDefined();
    }
  });

  test('sortOrder 는 1~6 순서 + 중복 없음', () => {
    const sorts = SCENARIO_PAUSE_MENU_LABELS.map((m) => m.sortOrder).sort((a, b) => a - b);
    expect(sorts).toEqual([1, 2, 3, 4, 5, 6]);
  });

  test('label/tooltip 비어 있지 않음', () => {
    for (const m of SCENARIO_PAUSE_MENU_LABELS) {
      expect(m.label.trim(), m.key).not.toBe('');
      expect(m.tooltip.trim(), m.key).not.toBe('');
    }
  });

  test('listPauseMenuLabelsSorted 는 sortOrder ascending 순서 반환', () => {
    const sorted = listPauseMenuLabelsSorted();
    for (let i = 1; i < sorted.length; i += 1) {
      expect(sorted[i].sortOrder).toBeGreaterThan(sorted[i - 1].sortOrder);
    }
  });

  test('key 중복 없음', () => {
    const keys = SCENARIO_PAUSE_MENU_LABELS.map((m) => m.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
