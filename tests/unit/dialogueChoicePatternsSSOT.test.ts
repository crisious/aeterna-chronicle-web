/**
 * 유닛 테스트 — SYNC-164: SCENARIO_DIALOGUE_CHOICE_PATTERNS SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_DIALOGUE_CHOICE_PATTERNS,
  getDialogueChoicePatternNarrative,
  listDialogueChoicePatterns,
  type DialogueChoicePattern,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly DialogueChoicePattern[] = ['agree', 'refuse', 'negotiate', 'silent'];

describe('SCENARIO_DIALOGUE_CHOICE_PATTERNS', () => {
  test('4 패턴 모두 정의', () => {
    expect(SCENARIO_DIALOGUE_CHOICE_PATTERNS.length).toBe(4);
    for (const p of ALL) {
      expect(getDialogueChoicePatternNarrative(p), p).toBeDefined();
    }
  });

  test('uiColor 는 #rrggbb 형식', () => {
    const hex = /^#[0-9a-fA-F]{6}$/;
    for (const p of SCENARIO_DIALOGUE_CHOICE_PATTERNS) {
      expect(hex.test(p.uiColor), `${p.pattern}:${p.uiColor}`).toBe(true);
    }
  });

  test('label/reputationImpact/flowHint 비어 있지 않음', () => {
    for (const p of SCENARIO_DIALOGUE_CHOICE_PATTERNS) {
      expect(p.label.trim(), p.pattern).not.toBe('');
      expect(p.reputationImpact.trim(), p.pattern).not.toBe('');
      expect(p.flowHint.trim(), p.pattern).not.toBe('');
    }
  });

  test('pattern 중복 없음', () => {
    const ps = SCENARIO_DIALOGUE_CHOICE_PATTERNS.map((p) => p.pattern);
    expect(new Set(ps).size).toBe(ps.length);
  });

  test('listDialogueChoicePatterns 는 4 종', () => {
    expect(listDialogueChoicePatterns()).toEqual(ALL);
  });
});
