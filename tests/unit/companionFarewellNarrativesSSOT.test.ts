/**
 * 유닛 테스트 — SYNC-115: SCENARIO_COMPANION_FAREWELL_NARRATIVES SSOT consistency
 *
 * 1) SCENARIO_COMPANIONS 6명 모두 farewell narrative 매칭 (1:1)
 * 2) orphan 참조 없음, 중복 없음
 * 3) 3단 line 본문 비어 있지 않음
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_COMPANIONS,
  SCENARIO_COMPANION_FAREWELL_NARRATIVES,
  getCompanionFarewellNarrative,
} from '../../shared/types/scenarioRegistry';

describe('SCENARIO_COMPANION_FAREWELL_NARRATIVES', () => {
  test('SCENARIO_COMPANIONS 6명 모두 farewell narrative 매칭된다', () => {
    expect(SCENARIO_COMPANIONS.length).toBe(6);
    for (const companion of SCENARIO_COMPANIONS) {
      expect(
        getCompanionFarewellNarrative(companion.obsidianId),
        companion.obsidianId,
      ).toBeDefined();
    }
  });

  test('farewell narrative 는 companion obsidianId 외 항목을 참조하지 않는다', () => {
    const validIds = new Set(SCENARIO_COMPANIONS.map((c) => c.obsidianId));
    for (const n of SCENARIO_COMPANION_FAREWELL_NARRATIVES) {
      expect(validIds.has(n.companionObsidianId), n.companionObsidianId).toBe(true);
    }
  });

  test('각 narrative 는 reason/farewell/epilogue 3단 모두 비어 있지 않다', () => {
    for (const n of SCENARIO_COMPANION_FAREWELL_NARRATIVES) {
      expect(n.reasonLine.trim(), n.companionObsidianId).not.toBe('');
      expect(n.farewellLine.trim(), n.companionObsidianId).not.toBe('');
      expect(n.partyEpilogue.trim(), n.companionObsidianId).not.toBe('');
    }
  });

  test('companionObsidianId 는 중복되지 않는다', () => {
    const ids = SCENARIO_COMPANION_FAREWELL_NARRATIVES.map((n) => n.companionObsidianId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
