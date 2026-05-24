/**
 * 유닛 테스트 — SYNC-204: SCENARIO_TUTORIAL_SKIP_OPTIONS SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_TUTORIAL_SKIP_OPTIONS,
  getTutorialSkipOptionNarrative,
  listTutorialSkipOptions,
  type TutorialSkipOption,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly TutorialSkipOption[] = ['none', 'per_step', 'all'];

describe('SCENARIO_TUTORIAL_SKIP_OPTIONS', () => {
  test('3 옵션 모두 정의', () => {
    expect(SCENARIO_TUTORIAL_SKIP_OPTIONS.length).toBe(3);
    for (const o of ALL) {
      expect(getTutorialSkipOptionNarrative(o), o).toBeDefined();
    }
  });

  test('label/description/rewardImpact 비어 있지 않음', () => {
    for (const o of SCENARIO_TUTORIAL_SKIP_OPTIONS) {
      expect(o.label.trim(), o.option).not.toBe('');
      expect(o.description.trim(), o.option).not.toBe('');
      expect(o.rewardImpact.trim(), o.option).not.toBe('');
    }
  });

  test('option 중복 없음', () => {
    const os = SCENARIO_TUTORIAL_SKIP_OPTIONS.map((o) => o.option);
    expect(new Set(os).size).toBe(os.length);
  });

  test('listTutorialSkipOptions 는 3 옵션', () => {
    expect(listTutorialSkipOptions()).toEqual(ALL);
  });
});
