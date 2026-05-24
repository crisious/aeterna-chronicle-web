/**
 * 유닛 테스트 — SYNC-110: 🎯 SCENARIO_GAME_OVER_NARRATIVES SSOT consistency
 *
 * 1) Chapter 1~5 각각 최소 1개 + universal (chapter 0) 1개 존재
 * 2) gameOverId 중복 없음, headline/body 비어 있지 않음
 * 3) cause 4종 enum 안에 든다
 * 4) getUniversalGameOver 는 universal 항목을 반환한다
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_GAME_OVER_NARRATIVES,
  getGameOverNarrative,
  getUniversalGameOver,
  listGameOverNarrativesByChapter,
  type GameOverCause,
} from '../../shared/types/scenarioRegistry';

const VALID_CAUSES: readonly GameOverCause[] = ['party_wipe', 'time_limit', 'critical_failure', 'universal'];

describe('SCENARIO_GAME_OVER_NARRATIVES', () => {
  test('Chapter 1~5 각각 최소 1개 + chapter 0 universal 1개', () => {
    for (let ch = 1; ch <= 5; ch += 1) {
      expect(listGameOverNarrativesByChapter(ch).length, `chapter ${ch}`).toBeGreaterThan(0);
    }
    expect(listGameOverNarrativesByChapter(0).length).toBeGreaterThanOrEqual(1);
  });

  test('gameOverId 는 중복되지 않는다', () => {
    const ids = SCENARIO_GAME_OVER_NARRATIVES.map((g) => g.gameOverId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('headline/body 는 비어 있지 않다', () => {
    for (const g of SCENARIO_GAME_OVER_NARRATIVES) {
      expect(g.headline.trim(), g.gameOverId).not.toBe('');
      expect(g.body.trim(), g.gameOverId).not.toBe('');
    }
  });

  test('cause 는 4종 enum 안에 든다', () => {
    for (const g of SCENARIO_GAME_OVER_NARRATIVES) {
      expect(VALID_CAUSES, g.gameOverId).toContain(g.cause);
    }
  });

  test('getUniversalGameOver 는 chapter 0 universal 항목을 반환한다', () => {
    const universal = getUniversalGameOver();
    expect(universal.chapter).toBe(0);
    expect(universal.cause).toBe('universal');
  });

  test('getGameOverNarrative 는 정확한 id 매칭을 반환한다', () => {
    const first = SCENARIO_GAME_OVER_NARRATIVES[0];
    expect(getGameOverNarrative(first.gameOverId)?.body).toBe(first.body);
    expect(getGameOverNarrative('nonexistent')).toBeUndefined();
  });
});
