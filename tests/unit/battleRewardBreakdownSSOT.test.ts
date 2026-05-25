/**
 * 유닛 테스트 — SYNC-241: SCENARIO_BATTLE_REWARD_BREAKDOWN SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_BATTLE_REWARD_BREAKDOWN,
  getBattleRewardNarrative,
  getTotalBattleRewardShare,
  type BattleRewardKind,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly BattleRewardKind[] = ['exp', 'gold', 'loot', 'honor', 'seasonal'];

describe('SCENARIO_BATTLE_REWARD_BREAKDOWN', () => {
  test('5 항목 모두 정의', () => {
    expect(SCENARIO_BATTLE_REWARD_BREAKDOWN.length).toBe(5);
    for (const k of ALL) {
      expect(getBattleRewardNarrative(k), k).toBeDefined();
    }
  });

  test('averageShare 합산은 ~1.0', () => {
    expect(getTotalBattleRewardShare()).toBeCloseTo(1.0, 5);
  });

  test('각 averageShare 는 0~1 범위', () => {
    for (const r of SCENARIO_BATTLE_REWARD_BREAKDOWN) {
      expect(r.averageShare, r.kind).toBeGreaterThan(0);
      expect(r.averageShare, r.kind).toBeLessThanOrEqual(1);
    }
  });

  test('uiColor 는 #rrggbb 형식', () => {
    const hex = /^#[0-9a-fA-F]{6}$/;
    for (const r of SCENARIO_BATTLE_REWARD_BREAKDOWN) {
      expect(hex.test(r.uiColor), `${r.kind}:${r.uiColor}`).toBe(true);
    }
  });

  test('kind 중복 없음', () => {
    const ks = SCENARIO_BATTLE_REWARD_BREAKDOWN.map((r) => r.kind);
    expect(new Set(ks).size).toBe(ks.length);
  });
});
