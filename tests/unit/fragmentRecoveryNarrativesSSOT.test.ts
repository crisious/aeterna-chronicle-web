/**
 * 유닛 테스트 — SYNC-109: SCENARIO_FRAGMENT_RECOVERY_NARRATIVES SSOT consistency
 *
 * 1) SCENARIO_FRAGMENTS 4종 모두 narrative 매칭 (1:1)
 * 2) arrival/resonance/recovery 3단 line 모두 비어 있지 않다
 * 3) orphan 참조 없음
 * 4) 챕터 lookup 정합성
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_FRAGMENTS,
  SCENARIO_FRAGMENT_RECOVERY_NARRATIVES,
  getFragmentRecoveryNarrative,
  listFragmentRecoveryNarrativesByChapter,
} from '../../shared/types/scenarioRegistry';

describe('SCENARIO_FRAGMENT_RECOVERY_NARRATIVES', () => {
  test('SCENARIO_FRAGMENTS 4종 모두 narrative 매칭된다', () => {
    expect(SCENARIO_FRAGMENTS.length).toBe(4);
    for (const fragment of SCENARIO_FRAGMENTS) {
      expect(getFragmentRecoveryNarrative(fragment.obsidianId), fragment.obsidianId).toBeDefined();
    }
  });

  test('orphan 참조 없음 — fragment obsidianId 만 사용', () => {
    const validIds = new Set(SCENARIO_FRAGMENTS.map((f) => f.obsidianId));
    for (const n of SCENARIO_FRAGMENT_RECOVERY_NARRATIVES) {
      expect(validIds.has(n.fragmentObsidianId), n.fragmentObsidianId).toBe(true);
    }
  });

  test('arrival/resonance/recovery 3단 line 모두 비어 있지 않다', () => {
    for (const n of SCENARIO_FRAGMENT_RECOVERY_NARRATIVES) {
      expect(n.arrivalLine.trim(), n.fragmentObsidianId).not.toBe('');
      expect(n.resonanceLine.trim(), n.fragmentObsidianId).not.toBe('');
      expect(n.recoveryLine.trim(), n.fragmentObsidianId).not.toBe('');
    }
  });

  test('fragmentObsidianId 는 중복되지 않는다', () => {
    const ids = SCENARIO_FRAGMENT_RECOVERY_NARRATIVES.map((n) => n.fragmentObsidianId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('listFragmentRecoveryNarrativesByChapter 는 fragment.chapter 와 일치한다', () => {
    for (let chapter = 1; chapter <= 4; chapter += 1) {
      const expected = new Set(
        SCENARIO_FRAGMENTS.filter((f) => f.chapter === chapter).map((f) => f.obsidianId),
      );
      const actual = listFragmentRecoveryNarrativesByChapter(chapter).map((n) => n.fragmentObsidianId);
      expect(new Set(actual), `chapter ${chapter}`).toEqual(expected);
    }
  });
});
