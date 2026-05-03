/**
 * 유닛 테스트 — passiveClientHelpers (B-S1)
 *
 * server passiveCombatHooks 의 클라 미러 함수들. 동일 동작 검증.
 */
import { describe, expect, test } from 'vitest';
import {
  computeCritEchoDamage,
  computeLifestealHeal,
  computeMissChance,
  computeProjectileReflectDamage,
  computeReflectDamage,
  getEffectiveAtk,
  getEffectiveDef,
  LOW_HP_THRESHOLD,
  rollMiss,
  type PassiveCombatantClient,
} from '../../client/src/combat/passiveClientHelpers';

function combatant(o: Partial<PassiveCombatantClient> = {}): PassiveCombatantClient {
  return { hp: 100, maxHp: 100, mp: 30, maxMp: 50, ...o };
}

describe('computeMissChance + rollMiss', () => {
  test('양쪽 0 → miss 0', () => {
    expect(computeMissChance(combatant(), combatant())).toBe(0);
  });

  test('회피 15 vs 명중 0 → 0.15', () => {
    expect(computeMissChance(combatant(), combatant({ evasionAddPercent: 15 }))).toBeCloseTo(0.15);
  });

  test('명중이 회피 상쇄', () => {
    expect(
      computeMissChance(combatant({ hitChanceAddPercent: 20 }), combatant({ evasionAddPercent: 15 })),
    ).toBe(0);
  });

  test('rollMiss — rng < miss → true', () => {
    expect(rollMiss(combatant(), combatant({ evasionAddPercent: 15 }), () => 0.10)).toBe(true);
    expect(rollMiss(combatant(), combatant({ evasionAddPercent: 15 }), () => 0.20)).toBe(false);
  });
});

describe('computeReflectDamage / computeProjectileReflectDamage', () => {
  test('reflect 20% × 100 = 20', () => {
    expect(computeReflectDamage(combatant({ reflectPercent: 20 }), 100)).toBe(20);
  });

  test('reflect 0 → 0', () => {
    expect(computeReflectDamage(combatant(), 100)).toBe(0);
  });

  test('projectile_reflect 별도 필드', () => {
    const d = combatant({ reflectPercent: 50, projectileReflectPercent: 30 });
    expect(computeReflectDamage(d, 100)).toBe(50);
    expect(computeProjectileReflectDamage(d, 100)).toBe(30);
  });
});

describe('getEffectiveAtk — low_hp_atk_up', () => {
  test('hp ≥ 30% → base 그대로', () => {
    expect(getEffectiveAtk(combatant({ hp: 30, maxHp: 100, lowHpAtkBonusPercent: 80 }), 50)).toBe(50);
  });

  test('hp < 30% → 부스트', () => {
    expect(getEffectiveAtk(combatant({ hp: 29, maxHp: 100, lowHpAtkBonusPercent: 80 }), 50)).toBe(90);
  });

  test('LOW_HP_THRESHOLD 0.30', () => {
    expect(LOW_HP_THRESHOLD).toBe(0.30);
  });
});

describe('getEffectiveDef + computeCritEchoDamage + computeLifestealHeal', () => {
  test('defense_up_conditional 50% → ×1.5', () => {
    expect(getEffectiveDef(combatant({ defenseUpConditionalPercent: 50 }), 30)).toBe(45);
  });

  test('crit_echo isCritical=false → 0', () => {
    expect(computeCritEchoDamage(combatant({ critEchoPercent: 30 }), false, 100)).toBe(0);
  });

  test('crit_echo 30% × 100 crit → 30', () => {
    expect(computeCritEchoDamage(combatant({ critEchoPercent: 30 }), true, 100)).toBe(30);
  });

  test('lifesteal 50% × 100 → 50', () => {
    expect(computeLifestealHeal(combatant({ hp: 50, maxHp: 200 }), 50, 100)).toBe(50);
  });

  test('lifesteal + drain_amp 50% → 75 (×1.5)', () => {
    expect(
      computeLifestealHeal(combatant({ hp: 50, maxHp: 200, drainAmplifyPercent: 50 }), 50, 100),
    ).toBe(75);
  });

  test('lifesteal 이미 maxHp → 0', () => {
    expect(computeLifestealHeal(combatant({ hp: 100, maxHp: 100 }), 50, 100)).toBe(0);
  });
});
