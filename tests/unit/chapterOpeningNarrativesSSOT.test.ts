/**
 * 유닛 테스트 — SYNC-107: SCENARIO_CHAPTER_OPENING_NARRATIVES SSOT consistency
 *
 * 1) Chapter 1~5 5개 모두 존재 (정확히)
 * 2) 각 narrative 는 title/subtitle/3 lines 모두 비어 있지 않다
 * 3) chapter 중복 없음
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_CHAPTER_OPENING_NARRATIVES,
  getChapterOpeningNarrative,
} from '../../shared/types/scenarioRegistry';

describe('SCENARIO_CHAPTER_OPENING_NARRATIVES', () => {
  test('Chapter 1~5 5개 모두 존재한다', () => {
    expect(SCENARIO_CHAPTER_OPENING_NARRATIVES.length).toBe(5);
    for (let ch = 1; ch <= 5; ch += 1) {
      expect(getChapterOpeningNarrative(ch), `chapter ${ch}`).toBeDefined();
    }
  });

  test('각 narrative 는 title/subtitle 이 비어 있지 않다', () => {
    for (const n of SCENARIO_CHAPTER_OPENING_NARRATIVES) {
      expect(n.title.trim(), `ch${n.chapter}`).not.toBe('');
      expect(n.subtitle.trim(), `ch${n.chapter}`).not.toBe('');
    }
  });

  test('각 narrative 는 정확히 3 line 의 비어 있지 않은 본문을 갖는다', () => {
    for (const n of SCENARIO_CHAPTER_OPENING_NARRATIVES) {
      expect(n.lines.length, `ch${n.chapter}`).toBe(3);
      for (const line of n.lines) {
        expect(line.trim(), `ch${n.chapter}`).not.toBe('');
      }
    }
  });

  test('chapter 는 중복되지 않는다', () => {
    const chapters = SCENARIO_CHAPTER_OPENING_NARRATIVES.map((n) => n.chapter);
    expect(new Set(chapters).size).toBe(chapters.length);
  });
});
