/**
 * 유닛 테스트 — SYNC-113: SCENARIO_DEITY_NARRATIVES SSOT consistency
 *
 * 1) SCENARIO_DEITIES 12 신 모두 narrative 매칭 (1:1)
 * 2) orphan 참조 없음, 중복 없음
 * 3) signature/doctrine 비어 있지 않음
 * 4) inCreation 11 + 배제 1 (레테) 분류 정합
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_DEITIES,
  SCENARIO_DEITY_NARRATIVES,
  getDeityNarrative,
  listDeityNarrativesByCreation,
} from '../../shared/types/scenarioRegistry';

describe('SCENARIO_DEITY_NARRATIVES', () => {
  test('SCENARIO_DEITIES 12 신 모두 narrative 매칭된다', () => {
    expect(SCENARIO_DEITIES.length).toBe(12);
    for (const deity of SCENARIO_DEITIES) {
      expect(getDeityNarrative(deity.obsidianId), deity.obsidianId).toBeDefined();
    }
  });

  test('orphan 참조 없음 — deity obsidianId 만 사용', () => {
    const validIds = new Set(SCENARIO_DEITIES.map((d) => d.obsidianId));
    for (const n of SCENARIO_DEITY_NARRATIVES) {
      expect(validIds.has(n.deityObsidianId), n.deityObsidianId).toBe(true);
    }
  });

  test('signature/doctrine 모두 비어 있지 않다', () => {
    for (const n of SCENARIO_DEITY_NARRATIVES) {
      expect(n.signature.trim(), n.deityObsidianId).not.toBe('');
      expect(n.doctrine.trim(), n.deityObsidianId).not.toBe('');
    }
  });

  test('deityObsidianId 는 중복되지 않는다', () => {
    const ids = SCENARIO_DEITY_NARRATIVES.map((n) => n.deityObsidianId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('inCreation 11 + 배제 1 (레테) 정확히 분리된다', () => {
    expect(listDeityNarrativesByCreation(true).length).toBe(11);
    const excluded = listDeityNarrativesByCreation(false);
    expect(excluded.length).toBe(1);
    expect(excluded[0].deityObsidianId).toBe('lethe');
  });
});
