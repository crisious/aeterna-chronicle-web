/**
 * 유닛 테스트 — SYNC-134: SCENARIO_ATB_PHASE_NARRATIVES SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_ATB_PHASE_NARRATIVES,
  getAtbPhaseNarrative,
  listAtbPhasesInOrder,
  type AtbPhaseKind,
} from '../../shared/types/scenarioRegistry';

const ORDER: readonly AtbPhaseKind[] = ['charging', 'ready', 'acting', 'cooldown'];

describe('SCENARIO_ATB_PHASE_NARRATIVES', () => {
  test('4 phase 모두 정의', () => {
    expect(SCENARIO_ATB_PHASE_NARRATIVES.length).toBe(4);
    for (const p of ORDER) {
      expect(getAtbPhaseNarrative(p), p).toBeDefined();
    }
  });

  test('label/uiHint/stateMeaning/flavor 비어 있지 않음', () => {
    for (const n of SCENARIO_ATB_PHASE_NARRATIVES) {
      expect(n.label.trim(), n.phase).not.toBe('');
      expect(n.uiHint.trim(), n.phase).not.toBe('');
      expect(n.stateMeaning.trim(), n.phase).not.toBe('');
      expect(n.flavor.trim(), n.phase).not.toBe('');
    }
  });

  test('listAtbPhasesInOrder 는 4 phase 순서 반환', () => {
    expect(listAtbPhasesInOrder()).toEqual(ORDER);
  });

  test('phase 중복 없음', () => {
    const ps = SCENARIO_ATB_PHASE_NARRATIVES.map((n) => n.phase);
    expect(new Set(ps).size).toBe(ps.length);
  });
});
