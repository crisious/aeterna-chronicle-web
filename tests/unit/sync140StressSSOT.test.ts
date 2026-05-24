/**
 * 유닛 테스트 — SYNC-140: 🎯 10 sprint (131~140) 누적 stress + ESCAPE narrative
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_SHOP_CATEGORY_LABELS,
  SCENARIO_TUTORIAL_ANCHOR_LINES,
  SCENARIO_NOTIFICATION_TONE_NARRATIVES,
  SCENARIO_ATB_PHASE_NARRATIVES,
  SCENARIO_PARTY_FORMATION_NARRATIVES,
  SCENARIO_FAST_TRAVEL_NARRATIVES,
  SCENARIO_KEYBIND_DESCRIPTIONS,
  SCENARIO_SETTINGS_DESCRIPTIONS,
  SCENARIO_DAMAGE_TYPE_NARRATIVES,
  SCENARIO_ESCAPE_NARRATIVES,
  getEscapeNarrative,
  listEscapeOutcomes,
  type EscapeOutcome,
} from '../../shared/types/scenarioRegistry';

const OUTCOMES: readonly EscapeOutcome[] = ['success', 'fail', 'blocked', 'forbidden', 'critical'];

describe('SYNC-140 🎯 10 sprint 누적 stress', () => {
  test('ESCAPE_NARRATIVES — 5 outcome 매칭 + 본문 비어 있지 않음', () => {
    expect(SCENARIO_ESCAPE_NARRATIVES.length).toBe(5);
    for (const o of OUTCOMES) {
      const n = getEscapeNarrative(o);
      expect(n, o).toBeDefined();
      expect(n?.label.trim(), o).not.toBe('');
      expect(n?.resultLine.trim(), o).not.toBe('');
      expect(n?.penaltyHint.trim(), o).not.toBe('');
    }
    expect(listEscapeOutcomes()).toEqual(OUTCOMES);
  });

  test('sync-131~140 신규 도메인 10종 entry count 정합', () => {
    expect(SCENARIO_SHOP_CATEGORY_LABELS.length).toBe(5);
    expect(SCENARIO_TUTORIAL_ANCHOR_LINES.length).toBe(7);
    expect(SCENARIO_NOTIFICATION_TONE_NARRATIVES.length).toBe(4);
    expect(SCENARIO_ATB_PHASE_NARRATIVES.length).toBe(4);
    expect(SCENARIO_PARTY_FORMATION_NARRATIVES.length).toBe(3);
    expect(SCENARIO_FAST_TRAVEL_NARRATIVES.length).toBe(10); // 9 zone + universal
    expect(SCENARIO_KEYBIND_DESCRIPTIONS.length).toBe(8);
    expect(SCENARIO_SETTINGS_DESCRIPTIONS.length).toBe(8);
    expect(SCENARIO_DAMAGE_TYPE_NARRATIVES.length).toBe(6);
    expect(SCENARIO_ESCAPE_NARRATIVES.length).toBe(5);
  });

  test('sync-131~140 누적 60 entry 확보', () => {
    const total =
      SCENARIO_SHOP_CATEGORY_LABELS.length +
      SCENARIO_TUTORIAL_ANCHOR_LINES.length +
      SCENARIO_NOTIFICATION_TONE_NARRATIVES.length +
      SCENARIO_ATB_PHASE_NARRATIVES.length +
      SCENARIO_PARTY_FORMATION_NARRATIVES.length +
      SCENARIO_FAST_TRAVEL_NARRATIVES.length +
      SCENARIO_KEYBIND_DESCRIPTIONS.length +
      SCENARIO_SETTINGS_DESCRIPTIONS.length +
      SCENARIO_DAMAGE_TYPE_NARRATIVES.length +
      SCENARIO_ESCAPE_NARRATIVES.length;
    expect(total).toBe(60);
  });
});
