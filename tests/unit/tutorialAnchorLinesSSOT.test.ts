/**
 * 유닛 테스트 — SYNC-132: SCENARIO_TUTORIAL_ANCHOR_LINES SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_TUTORIAL_ANCHOR_LINES,
  getTutorialAnchorLine,
  listTutorialAnchorsSorted,
  type TutorialStepKey,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly TutorialStepKey[] = ['move', 'atb', 'skill', 'inventory', 'quest', 'save', 'exit'];

describe('SCENARIO_TUTORIAL_ANCHOR_LINES', () => {
  test('7 단계 모두 정의', () => {
    expect(SCENARIO_TUTORIAL_ANCHOR_LINES.length).toBe(7);
    for (const s of ALL) {
      expect(getTutorialAnchorLine(s), s).toBeDefined();
    }
  });

  test('stepOrder 1~7 중복 없음', () => {
    const orders = SCENARIO_TUTORIAL_ANCHOR_LINES.map((t) => t.stepOrder).sort((a, b) => a - b);
    expect(orders).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  test('stepLabel/anchorText/recommendedAction 비어 있지 않음', () => {
    for (const t of SCENARIO_TUTORIAL_ANCHOR_LINES) {
      expect(t.stepLabel.trim(), t.step).not.toBe('');
      expect(t.anchorText.trim(), t.step).not.toBe('');
      expect(t.recommendedAction.trim(), t.step).not.toBe('');
    }
  });

  test('listTutorialAnchorsSorted ascending', () => {
    const sorted = listTutorialAnchorsSorted();
    for (let i = 1; i < sorted.length; i += 1) {
      expect(sorted[i].stepOrder).toBeGreaterThan(sorted[i - 1].stepOrder);
    }
  });

  test('step 중복 없음', () => {
    const ss = SCENARIO_TUTORIAL_ANCHOR_LINES.map((t) => t.step);
    expect(new Set(ss).size).toBe(ss.length);
  });
});
