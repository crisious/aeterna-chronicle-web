/**
 * 유닛 테스트 — SYNC-144: SCENARIO_LOOT_TIER_DROP_RATES SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_LOOT_TIER_DROP_RATES,
  SCENARIO_ITEM_RARITY_DESCRIPTIONS,
  getLootTierDropRate,
  getExpectedDropRate,
  type ItemRarity,
} from '../../shared/types/scenarioRegistry';

describe('SCENARIO_LOOT_TIER_DROP_RATES', () => {
  test('SCENARIO_ITEM_RARITY_DESCRIPTIONS 5 등급 모두 매칭', () => {
    for (const r of SCENARIO_ITEM_RARITY_DESCRIPTIONS) {
      expect(getLootTierDropRate(r.rarity), r.rarity).toBeDefined();
    }
  });

  test('drop rate 는 0~1 범위', () => {
    for (const t of SCENARIO_LOOT_TIER_DROP_RATES) {
      expect(t.normalDropRate, t.rarity).toBeGreaterThanOrEqual(0);
      expect(t.normalDropRate, t.rarity).toBeLessThanOrEqual(1);
      expect(t.eliteDropRate, t.rarity).toBeGreaterThanOrEqual(0);
      expect(t.eliteDropRate, t.rarity).toBeLessThanOrEqual(1);
      expect(t.bossDropRate, t.rarity).toBeGreaterThanOrEqual(0);
      expect(t.bossDropRate, t.rarity).toBeLessThanOrEqual(1);
    }
  });

  test('drop rate 는 등급이 높아질수록 감소 (common > uncommon > rare > epic > legendary)', () => {
    const order: readonly ItemRarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    for (const kind of ['normal', 'elite', 'boss'] as const) {
      let prev = 1.1;
      for (const r of order) {
        const rate = getExpectedDropRate(r, kind);
        expect(rate, `${r}:${kind}`).toBeLessThanOrEqual(prev);
        prev = rate;
      }
    }
  });

  test('elite ≥ normal, boss ≥ elite (강한 적이 더 높은 drop)', () => {
    for (const t of SCENARIO_LOOT_TIER_DROP_RATES) {
      expect(t.eliteDropRate, t.rarity).toBeGreaterThanOrEqual(t.normalDropRate);
      expect(t.bossDropRate, t.rarity).toBeGreaterThanOrEqual(t.eliteDropRate);
    }
  });

  test('flavor 비어 있지 않음', () => {
    for (const t of SCENARIO_LOOT_TIER_DROP_RATES) {
      expect(t.flavor.trim(), t.rarity).not.toBe('');
    }
  });
});
