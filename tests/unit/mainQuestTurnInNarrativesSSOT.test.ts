/**
 * 유닛 테스트 — SYNC-128: SCENARIO_MAIN_QUEST_TURNIN_NARRATIVES SSOT
 *
 * accept (sync-114) 와 1:1 questCode 매칭 cross-validate.
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_MAIN_QUEST_ACCEPT_NARRATIVES,
  SCENARIO_MAIN_QUEST_TURNIN_NARRATIVES,
  getMainQuestTurnInNarrative,
} from '../../shared/types/scenarioRegistry';

describe('SCENARIO_MAIN_QUEST_TURNIN_NARRATIVES', () => {
  test('accept 의 모든 questCode 에 대해 turn-in 매칭', () => {
    for (const a of SCENARIO_MAIN_QUEST_ACCEPT_NARRATIVES) {
      expect(getMainQuestTurnInNarrative(a.questCode), a.questCode).toBeDefined();
    }
  });

  test('turn-in 은 accept 외 questCode 를 참조하지 않는다', () => {
    const acceptCodes = new Set(SCENARIO_MAIN_QUEST_ACCEPT_NARRATIVES.map((a) => a.questCode));
    for (const t of SCENARIO_MAIN_QUEST_TURNIN_NARRATIVES) {
      expect(acceptCodes.has(t.questCode), t.questCode).toBe(true);
    }
  });

  test('chapter 는 accept 와 일치', () => {
    for (const t of SCENARIO_MAIN_QUEST_TURNIN_NARRATIVES) {
      const a = SCENARIO_MAIN_QUEST_ACCEPT_NARRATIVES.find((x) => x.questCode === t.questCode);
      expect(a?.chapter, t.questCode).toBe(t.chapter);
    }
  });

  test('giverReaction/rewardLine/nextStepAnchor 비어 있지 않음', () => {
    for (const t of SCENARIO_MAIN_QUEST_TURNIN_NARRATIVES) {
      expect(t.giverReaction.trim(), t.questCode).not.toBe('');
      expect(t.rewardLine.trim(), t.questCode).not.toBe('');
      expect(t.nextStepAnchor.trim(), t.questCode).not.toBe('');
    }
  });

  test('questCode 중복 없음', () => {
    const codes = SCENARIO_MAIN_QUEST_TURNIN_NARRATIVES.map((t) => t.questCode);
    expect(new Set(codes).size).toBe(codes.length);
  });
});
