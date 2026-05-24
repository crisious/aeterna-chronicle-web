/**
 * 유닛 테스트 — SYNC-106: SCENARIO_LOAD_SCREEN_TIPS SSOT consistency
 *
 * 1) Chapter 1~5 각 챕터에 최소 1개 tip 이 있다 (균형)
 * 2) tipId 중복 없음, body 비어 있지 않음, chapter 1~5 (혹은 0=공통)
 * 3) kind 는 3종 enum 안에 든다
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_LOAD_SCREEN_TIPS,
  getLoadScreenTipById,
  listLoadScreenTipsByChapter,
  type LoadScreenTipKind,
} from '../../shared/types/scenarioRegistry';

const VALID_KINDS: readonly LoadScreenTipKind[] = ['mechanic', 'lore', 'tactical'];

describe('SCENARIO_LOAD_SCREEN_TIPS', () => {
  test('Chapter 1~5 각 챕터에 최소 1개 tip 이 있다', () => {
    for (let ch = 1; ch <= 5; ch += 1) {
      expect(listLoadScreenTipsByChapter(ch).length, `chapter ${ch}`).toBeGreaterThan(0);
    }
  });

  test('tipId 는 중복되지 않는다', () => {
    const ids = SCENARIO_LOAD_SCREEN_TIPS.map((t) => t.tipId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('chapter 는 0 또는 1~5 정수, body 는 비어 있지 않다', () => {
    for (const t of SCENARIO_LOAD_SCREEN_TIPS) {
      expect([0, 1, 2, 3, 4, 5], t.tipId).toContain(t.chapter);
      expect(t.body.trim(), t.tipId).not.toBe('');
    }
  });

  test('kind 는 3종 enum 안에 든다', () => {
    for (const t of SCENARIO_LOAD_SCREEN_TIPS) {
      expect(VALID_KINDS, t.tipId).toContain(t.kind);
    }
  });

  test('getLoadScreenTipById 는 정확한 매칭을 반환한다', () => {
    const sample = SCENARIO_LOAD_SCREEN_TIPS[0];
    expect(getLoadScreenTipById(sample.tipId)?.body).toBe(sample.body);
    expect(getLoadScreenTipById('nonexistent_tip')).toBeUndefined();
  });
});
