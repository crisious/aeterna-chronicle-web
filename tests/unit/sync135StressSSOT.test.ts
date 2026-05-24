/**
 * 유닛 테스트 — SYNC-135: 🎯 5 sprint (131~135) 누적 stress
 *
 * 1) PARTY_FORMATION_NARRATIVES 3 종 매칭
 * 2) sync-131~135 신규 도메인 entry count 정합
 * 3) 누적 narrative 도메인 5 종 전수 검증
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_SHOP_CATEGORY_LABELS,
  SCENARIO_TUTORIAL_ANCHOR_LINES,
  SCENARIO_NOTIFICATION_TONE_NARRATIVES,
  SCENARIO_ATB_PHASE_NARRATIVES,
  SCENARIO_PARTY_FORMATION_NARRATIVES,
  getPartyFormationNarrative,
  listPartyFormations,
  type PartyFormation,
} from '../../shared/types/scenarioRegistry';

const FORMATIONS: readonly PartyFormation[] = ['front_row', 'back_row', 'solo'];

describe('SYNC-135 🎯 5 sprint 누적 stress', () => {
  test('PARTY_FORMATION_NARRATIVES — 3 formation 매칭 + 본문 비어 있지 않음', () => {
    expect(SCENARIO_PARTY_FORMATION_NARRATIVES.length).toBe(3);
    for (const f of FORMATIONS) {
      const n = getPartyFormationNarrative(f);
      expect(n, f).toBeDefined();
      expect(n?.label.trim(), f).not.toBe('');
      expect(n?.anchorLine.trim(), f).not.toBe('');
      expect(n?.recommendedBuild.trim(), f).not.toBe('');
      expect(n?.modifierSummary.trim(), f).not.toBe('');
    }
    expect(listPartyFormations()).toEqual(FORMATIONS);
  });

  test('sync-131~135 entry count 정합', () => {
    expect(SCENARIO_SHOP_CATEGORY_LABELS.length).toBe(5);
    expect(SCENARIO_TUTORIAL_ANCHOR_LINES.length).toBe(7);
    expect(SCENARIO_NOTIFICATION_TONE_NARRATIVES.length).toBe(4);
    expect(SCENARIO_ATB_PHASE_NARRATIVES.length).toBe(4);
    expect(SCENARIO_PARTY_FORMATION_NARRATIVES.length).toBe(3);
  });

  test('sync-131~135 누적 23 entry 확보', () => {
    const total =
      SCENARIO_SHOP_CATEGORY_LABELS.length +
      SCENARIO_TUTORIAL_ANCHOR_LINES.length +
      SCENARIO_NOTIFICATION_TONE_NARRATIVES.length +
      SCENARIO_ATB_PHASE_NARRATIVES.length +
      SCENARIO_PARTY_FORMATION_NARRATIVES.length;
    expect(total).toBe(23);
  });
});
