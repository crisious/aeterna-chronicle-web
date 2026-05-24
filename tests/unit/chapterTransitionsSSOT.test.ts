/**
 * 유닛 테스트 — SYNC-112: SCENARIO_CHAPTER_TRANSITIONS SSOT consistency
 *
 * 1) Ch1→2, 2→3, 3→4, 4→5 4종 모두 존재
 * 2) toChapter = fromChapter + 1 일관성
 * 3) epilogue/prologue/travelLine 모두 비어 있지 않다
 * 4) fromChapter / toChapter 중복 없음
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_CHAPTER_TRANSITIONS,
  getChapterTransition,
  getChapterTransitionTo,
} from '../../shared/types/scenarioRegistry';

describe('SCENARIO_CHAPTER_TRANSITIONS', () => {
  test('Ch1→2, 2→3, 3→4, 4→5 4종 모두 존재한다', () => {
    expect(SCENARIO_CHAPTER_TRANSITIONS.length).toBe(4);
    for (let from = 1; from <= 4; from += 1) {
      const t = getChapterTransition(from);
      expect(t, `from ${from}`).toBeDefined();
      expect(t?.toChapter).toBe(from + 1);
    }
  });

  test('toChapter 는 fromChapter + 1 이어야 한다', () => {
    for (const t of SCENARIO_CHAPTER_TRANSITIONS) {
      expect(t.toChapter, `from ${t.fromChapter}`).toBe(t.fromChapter + 1);
    }
  });

  test('epilogue/prologue/travelLine 모두 비어 있지 않다', () => {
    for (const t of SCENARIO_CHAPTER_TRANSITIONS) {
      expect(t.epilogue.trim(), `from ${t.fromChapter}`).not.toBe('');
      expect(t.prologue.trim(), `from ${t.fromChapter}`).not.toBe('');
      expect(t.travelLine.trim(), `from ${t.fromChapter}`).not.toBe('');
    }
  });

  test('fromChapter 와 toChapter 는 중복되지 않는다', () => {
    const fromIds = SCENARIO_CHAPTER_TRANSITIONS.map((t) => t.fromChapter);
    const toIds = SCENARIO_CHAPTER_TRANSITIONS.map((t) => t.toChapter);
    expect(new Set(fromIds).size).toBe(fromIds.length);
    expect(new Set(toIds).size).toBe(toIds.length);
  });

  test('getChapterTransitionTo 는 역방향 조회가 정상이다', () => {
    for (let to = 2; to <= 5; to += 1) {
      const t = getChapterTransitionTo(to);
      expect(t?.fromChapter, `to ${to}`).toBe(to - 1);
    }
  });
});
