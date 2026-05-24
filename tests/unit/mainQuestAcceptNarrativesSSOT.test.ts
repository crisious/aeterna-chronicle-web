/**
 * 유닛 테스트 — SYNC-114: SCENARIO_MAIN_QUEST_ACCEPT_NARRATIVES SSOT consistency
 *
 * 1) 5 핵심 메인 quest 모두 narrative 매칭
 * 2) questCode 는 SCENARIO_MILESTONES.requiredQuests 내 항목이어야 한다 (cross-validate)
 * 3) 3단 line 본문 비어 있지 않음, chapter 1~5 범위
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_MAIN_QUEST_ACCEPT_NARRATIVES,
  SCENARIO_MILESTONES,
  getMainQuestAcceptNarrative,
  listMainQuestAcceptNarrativesByChapter,
} from '../../shared/types/scenarioRegistry';

describe('SCENARIO_MAIN_QUEST_ACCEPT_NARRATIVES', () => {
  test('5 핵심 메인 quest 모두 정의되어 있다', () => {
    expect(SCENARIO_MAIN_QUEST_ACCEPT_NARRATIVES.length).toBeGreaterThanOrEqual(5);
    for (const code of ['MQ_CH01', 'MQ_CH03', 'MQ_CH04', 'MQ_CH13', 'MQ_CH15']) {
      expect(getMainQuestAcceptNarrative(code), code).toBeDefined();
    }
  });

  test('questCode 는 SCENARIO_MILESTONES.requiredQuests 에 포함된다', () => {
    const allMilestoneQuests = new Set(
      SCENARIO_MILESTONES.flatMap((m) => m.requiredQuests),
    );
    for (const n of SCENARIO_MAIN_QUEST_ACCEPT_NARRATIVES) {
      expect(allMilestoneQuests.has(n.questCode), n.questCode).toBe(true);
    }
  });

  test('3단 line 본문 모두 비어 있지 않다', () => {
    for (const n of SCENARIO_MAIN_QUEST_ACCEPT_NARRATIVES) {
      expect(n.giverContext.trim(), n.questCode).not.toBe('');
      expect(n.motivationLine.trim(), n.questCode).not.toBe('');
      expect(n.firstObjective.trim(), n.questCode).not.toBe('');
    }
  });

  test('chapter 는 1~5 범위, questCode 중복 없음', () => {
    for (const n of SCENARIO_MAIN_QUEST_ACCEPT_NARRATIVES) {
      expect([1, 2, 3, 4, 5], n.questCode).toContain(n.chapter);
    }
    const codes = SCENARIO_MAIN_QUEST_ACCEPT_NARRATIVES.map((n) => n.questCode);
    expect(new Set(codes).size).toBe(codes.length);
  });

  test('listMainQuestAcceptNarrativesByChapter 합산은 전체와 일치한다', () => {
    let total = 0;
    for (let ch = 1; ch <= 5; ch += 1) {
      total += listMainQuestAcceptNarrativesByChapter(ch).length;
    }
    expect(total).toBe(SCENARIO_MAIN_QUEST_ACCEPT_NARRATIVES.length);
  });
});
