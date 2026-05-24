/**
 * 유닛 테스트 — SYNC-142: SCENARIO_COMBAT_RESULT_LABELS SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_COMBAT_RESULT_LABELS,
  getCombatResultLabel,
  listCombatResultsByPriority,
  type CombatResultKind,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly CombatResultKind[] = ['hit', 'miss', 'crit', 'reflect', 'evade', 'combo', 'crit_echo'];

describe('SCENARIO_COMBAT_RESULT_LABELS', () => {
  test('7 종 모두 정의', () => {
    expect(SCENARIO_COMBAT_RESULT_LABELS.length).toBe(7);
    for (const k of ALL) {
      expect(getCombatResultLabel(k), k).toBeDefined();
    }
  });

  test('popupColor 는 #rrggbb 형식', () => {
    const hex = /^#[0-9a-fA-F]{6}$/;
    for (const r of SCENARIO_COMBAT_RESULT_LABELS) {
      expect(hex.test(r.popupColor), `${r.kind}:${r.popupColor}`).toBe(true);
    }
  });

  test('label 비어 있지 않음, displayPriority 정수', () => {
    for (const r of SCENARIO_COMBAT_RESULT_LABELS) {
      expect(r.label.trim(), r.kind).not.toBe('');
      expect(Number.isInteger(r.displayPriority), r.kind).toBe(true);
      expect(r.displayPriority, r.kind).toBeGreaterThanOrEqual(1);
    }
  });

  test('kind 중복 없음', () => {
    const ks = SCENARIO_COMBAT_RESULT_LABELS.map((r) => r.kind);
    expect(new Set(ks).size).toBe(ks.length);
  });

  test('listCombatResultsByPriority ascending', () => {
    const sorted = listCombatResultsByPriority();
    for (let i = 1; i < sorted.length; i += 1) {
      expect(sorted[i].displayPriority).toBeGreaterThanOrEqual(sorted[i - 1].displayPriority);
    }
  });
});
