/**
 * 유닛 테스트 — SYNC-231: SCENARIO_BATTLE_FORMATIONS SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_BATTLE_FORMATIONS,
  getBattleFormationNarrative,
  listBattleFormations,
  type BattleFormation,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly BattleFormation[] = ['aggressive', 'defensive', 'balanced', 'flanking'];

describe('SCENARIO_BATTLE_FORMATIONS', () => {
  test('4 진형 모두 정의', () => {
    expect(SCENARIO_BATTLE_FORMATIONS.length).toBe(4);
    for (const f of ALL) {
      expect(getBattleFormationNarrative(f), f).toBeDefined();
    }
  });

  test('label/modifierSummary/recommendedAgainst 비어 있지 않음', () => {
    for (const f of SCENARIO_BATTLE_FORMATIONS) {
      expect(f.label.trim(), f.formation).not.toBe('');
      expect(f.modifierSummary.trim(), f.formation).not.toBe('');
      expect(f.recommendedAgainst.trim(), f.formation).not.toBe('');
    }
  });

  test('formation 중복 없음', () => {
    const fs = SCENARIO_BATTLE_FORMATIONS.map((f) => f.formation);
    expect(new Set(fs).size).toBe(fs.length);
  });

  test('listBattleFormations 는 4 진형', () => {
    expect(listBattleFormations()).toEqual(ALL);
  });
});
