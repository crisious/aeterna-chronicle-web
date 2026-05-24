/**
 * 유닛 테스트 — SYNC-162: SCENARIO_DAILY_QUEST_PATTERNS SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_DAILY_QUEST_PATTERNS,
  getDailyQuestPatternNarrative,
  listDailyQuestPatterns,
  type DailyQuestPattern,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly DailyQuestPattern[] = ['gather', 'hunt', 'escort', 'explore'];

describe('SCENARIO_DAILY_QUEST_PATTERNS', () => {
  test('4 패턴 모두 정의', () => {
    expect(SCENARIO_DAILY_QUEST_PATTERNS.length).toBe(4);
    for (const p of ALL) {
      expect(getDailyQuestPatternNarrative(p), p).toBeDefined();
    }
  });

  test('objectiveTemplate 은 {} 토큰 포함', () => {
    for (const p of SCENARIO_DAILY_QUEST_PATTERNS) {
      expect(p.objectiveTemplate.includes('{'), p.pattern).toBe(true);
      expect(p.objectiveTemplate.includes('}'), p.pattern).toBe(true);
    }
  });

  test('averageDurationMinutes 양의 정수', () => {
    for (const p of SCENARIO_DAILY_QUEST_PATTERNS) {
      expect(p.averageDurationMinutes, p.pattern).toBeGreaterThan(0);
      expect(Number.isInteger(p.averageDurationMinutes), p.pattern).toBe(true);
    }
  });

  test('label/averageRewardAnchor 비어 있지 않음', () => {
    for (const p of SCENARIO_DAILY_QUEST_PATTERNS) {
      expect(p.label.trim(), p.pattern).not.toBe('');
      expect(p.averageRewardAnchor.trim(), p.pattern).not.toBe('');
    }
  });

  test('pattern 중복 없음', () => {
    const ps = SCENARIO_DAILY_QUEST_PATTERNS.map((p) => p.pattern);
    expect(new Set(ps).size).toBe(ps.length);
  });
});
