/**
 * 유닛 테스트 — passiveCombatHooks (Phase 55-S2)
 *
 * 5종 modifier 의 실제 게임 적용 — 회피/명중/MP 회복/저체력 ATK/피격 DEF.
 */
import { describe, expect, test } from 'vitest';
import {
  applyHpRegen,
  applyMpRegen,
  computeMissChance,
  computeProjectileReflectDamage,
  computeReflectDamage,
  getEffectiveAtk,
  getEffectiveDef,
  LOW_HP_THRESHOLD,
  rollMiss,
  tryCheatDeath,
  type PassiveCombatant,
} from '../../server/src/combat/passiveCombatHooks';

function makeCombatant(overrides: Partial<PassiveCombatant> = {}): PassiveCombatant {
  return {
    hp: 100,
    maxHp: 100,
    mp: 30,
    maxMp: 50,
    ...overrides,
  };
}

// ─── getEffectiveAtk ──────────────────────────────────────────

describe('getEffectiveAtk — low_hp_atk_up', () => {
  test('modifier 0 → base 그대로', () => {
    const c = makeCombatant({ hp: 10, maxHp: 100 });
    expect(getEffectiveAtk(c, 50)).toBe(50);
  });

  test('hp 비율 ≥ 30% → base 그대로 (트리거 미발동)', () => {
    const c = makeCombatant({ hp: 30, maxHp: 100, lowHpAtkBonusPercent: 80 });
    expect(getEffectiveAtk(c, 50)).toBe(50);
  });

  test('hp 비율 < 30% → atk 증가 적용', () => {
    const c = makeCombatant({ hp: 29, maxHp: 100, lowHpAtkBonusPercent: 80 });
    // 50 * 1.80 = 90
    expect(getEffectiveAtk(c, 50)).toBe(90);
  });

  test('극저체력 — 강한 부스트', () => {
    const c = makeCombatant({ hp: 5, maxHp: 200, lowHpAtkBonusPercent: 100 });
    // 100 * 2.0 = 200
    expect(getEffectiveAtk(c, 100)).toBe(200);
  });

  test('maxHp 0 — 0/0 보호, base 그대로', () => {
    const c = makeCombatant({ hp: 0, maxHp: 0, lowHpAtkBonusPercent: 80 });
    expect(getEffectiveAtk(c, 50)).toBe(50);
  });

  test('LOW_HP_THRESHOLD 상수 = 0.30', () => {
    expect(LOW_HP_THRESHOLD).toBe(0.30);
  });
});

// ─── getEffectiveDef ──────────────────────────────────────────

describe('getEffectiveDef — defense_up_conditional', () => {
  test('modifier 0 → base 그대로', () => {
    const c = makeCombatant();
    expect(getEffectiveDef(c, 30)).toBe(30);
  });

  test('피격 시 def 가산', () => {
    const c = makeCombatant({ defenseUpConditionalPercent: 50 });
    // 30 * 1.5 = 45
    expect(getEffectiveDef(c, 30)).toBe(45);
  });

  test('100% 가산 = 2배', () => {
    const c = makeCombatant({ defenseUpConditionalPercent: 100 });
    expect(getEffectiveDef(c, 30)).toBe(60);
  });
});

// ─── computeMissChance & rollMiss ──────────────────────────────

describe('computeMissChance', () => {
  test('양쪽 0 → miss 0', () => {
    expect(computeMissChance(makeCombatant(), makeCombatant())).toBe(0);
  });

  test('defender 회피 15 vs attacker 명중 0 → miss 0.15', () => {
    const a = makeCombatant();
    const d = makeCombatant({ evasionAddPercent: 15 });
    expect(computeMissChance(a, d)).toBeCloseTo(0.15);
  });

  test('attacker 명중이 회피 상쇄 → miss 0', () => {
    const a = makeCombatant({ hitChanceAddPercent: 20 });
    const d = makeCombatant({ evasionAddPercent: 15 });
    expect(computeMissChance(a, d)).toBe(0);
  });

  test('명중 부분 상쇄 — 회피 30, 명중 10 → miss 0.20', () => {
    const a = makeCombatant({ hitChanceAddPercent: 10 });
    const d = makeCombatant({ evasionAddPercent: 30 });
    expect(computeMissChance(a, d)).toBeCloseTo(0.20);
  });
});

describe('rollMiss', () => {
  test('miss chance 0 → 항상 false', () => {
    const a = makeCombatant();
    const d = makeCombatant();
    // 어떤 rng 든 miss=false
    expect(rollMiss(a, d, () => 0)).toBe(false);
    expect(rollMiss(a, d, () => 0.99)).toBe(false);
  });

  test('miss chance 0.15 + rng 0.10 → miss true (0.10 < 0.15)', () => {
    const a = makeCombatant();
    const d = makeCombatant({ evasionAddPercent: 15 });
    expect(rollMiss(a, d, () => 0.10)).toBe(true);
  });

  test('miss chance 0.15 + rng 0.20 → miss false (0.20 ≥ 0.15)', () => {
    const a = makeCombatant();
    const d = makeCombatant({ evasionAddPercent: 15 });
    expect(rollMiss(a, d, () => 0.20)).toBe(false);
  });

  test('경계값 — rng 정확히 missChance → false (strictly less)', () => {
    const a = makeCombatant();
    const d = makeCombatant({ evasionAddPercent: 15 });
    expect(rollMiss(a, d, () => 0.15)).toBe(false);
  });
});

// ─── applyMpRegen ──────────────────────────────────────────────

describe('applyMpRegen', () => {
  test('regen 0 → 변경 없음', () => {
    const c = makeCombatant({ mp: 20, maxMp: 50 });
    expect(applyMpRegen(c)).toBe(0);
    expect(c.mp).toBe(20);
  });

  test('정상 회복 — mp +regen', () => {
    const c = makeCombatant({ mp: 20, maxMp: 50, mpRegenPerTurn: 7 });
    expect(applyMpRegen(c)).toBe(7);
    expect(c.mp).toBe(27);
  });

  test('maxMp cap — overflow 안 함', () => {
    const c = makeCombatant({ mp: 47, maxMp: 50, mpRegenPerTurn: 10 });
    expect(applyMpRegen(c)).toBe(3);
    expect(c.mp).toBe(50);
  });

  test('이미 max — 회복 0', () => {
    const c = makeCombatant({ mp: 50, maxMp: 50, mpRegenPerTurn: 10 });
    expect(applyMpRegen(c)).toBe(0);
    expect(c.mp).toBe(50);
  });
});

// ─── applyHpRegen (battle_regen) ────────────────────────────────

describe('applyHpRegen — battle_regen', () => {
  test('regen 0 → 변경 없음', () => {
    const c = makeCombatant({ hp: 50, maxHp: 100 });
    expect(applyHpRegen(c)).toBe(0);
    expect(c.hp).toBe(50);
  });

  test('정상 회복', () => {
    const c = makeCombatant({ hp: 50, maxHp: 100, hpRegenPerTurn: 10 });
    expect(applyHpRegen(c)).toBe(10);
    expect(c.hp).toBe(60);
  });

  test('maxHp 캡', () => {
    const c = makeCombatant({ hp: 95, maxHp: 100, hpRegenPerTurn: 10 });
    expect(applyHpRegen(c)).toBe(5);
    expect(c.hp).toBe(100);
  });

  test('alive=false 면 회복 안 함', () => {
    const c = makeCombatant({ hp: 0, maxHp: 100, hpRegenPerTurn: 10, alive: false });
    expect(applyHpRegen(c)).toBe(0);
    expect(c.hp).toBe(0);
  });
});

// ─── computeReflectDamage ───────────────────────────────────────

describe('computeReflectDamage — reflect (physical)', () => {
  test('reflect 0 → 0', () => {
    expect(computeReflectDamage(makeCombatant(), 100)).toBe(0);
  });

  test('reflect 20% × 100 dmg = 20', () => {
    const d = makeCombatant({ reflectPercent: 20 });
    expect(computeReflectDamage(d, 100)).toBe(20);
  });

  test('reflect 50% × 33 dmg = 16 (floor)', () => {
    const d = makeCombatant({ reflectPercent: 50 });
    expect(computeReflectDamage(d, 33)).toBe(16);
  });

  test('damage ≤ 0 → 0', () => {
    const d = makeCombatant({ reflectPercent: 50 });
    expect(computeReflectDamage(d, 0)).toBe(0);
    expect(computeReflectDamage(d, -5)).toBe(0);
  });
});

// ─── computeProjectileReflectDamage ─────────────────────────────

describe('computeProjectileReflectDamage — projectile_reflect (magical)', () => {
  test('field 0 → 0', () => {
    expect(computeProjectileReflectDamage(makeCombatant(), 100)).toBe(0);
  });

  test('20% × 100 dmg = 20', () => {
    const d = makeCombatant({ projectileReflectPercent: 20 });
    expect(computeProjectileReflectDamage(d, 100)).toBe(20);
  });

  test('reflect 와 독립적', () => {
    const d = makeCombatant({ reflectPercent: 50, projectileReflectPercent: 30 });
    // physical reflect 호출 시
    expect(computeReflectDamage(d, 100)).toBe(50);
    // magical reflect 호출 시
    expect(computeProjectileReflectDamage(d, 100)).toBe(30);
  });
});

// ─── tryCheatDeath ──────────────────────────────────────────────

describe('tryCheatDeath — 사망 모면', () => {
  test('charges 0 → 미발동', () => {
    const t = makeCombatant({ hp: 50, maxHp: 100, cheatDeathChargesRemaining: 0 });
    expect(tryCheatDeath(t, 80)).toBe(false);
    expect(t.hp).toBe(50); // 외부 코드에서 데미지 적용해야
    expect(t.cheatDeathChargesRemaining).toBe(0);
  });

  test('non-fatal 데미지 → 미발동 (절약)', () => {
    const t = makeCombatant({ hp: 50, maxHp: 100, cheatDeathChargesRemaining: 1 });
    expect(tryCheatDeath(t, 30)).toBe(false);
    expect(t.hp).toBe(50);
    expect(t.cheatDeathChargesRemaining).toBe(1);
  });

  test('fatal 데미지 + charge 1 → 발동: hp=1, charges=0', () => {
    const t = makeCombatant({ hp: 50, maxHp: 100, cheatDeathChargesRemaining: 1 });
    expect(tryCheatDeath(t, 80)).toBe(true);
    expect(t.hp).toBe(1);
    expect(t.cheatDeathChargesRemaining).toBe(0);
  });

  test('동일 hp 의 fatal 데미지 (=hp) → 발동', () => {
    const t = makeCombatant({ hp: 50, maxHp: 100, cheatDeathChargesRemaining: 1 });
    expect(tryCheatDeath(t, 50)).toBe(true);
    expect(t.hp).toBe(1);
  });

  test('두 번째 fatal 데미지 → 미발동 (이미 소진)', () => {
    const t = makeCombatant({ hp: 50, maxHp: 100, cheatDeathChargesRemaining: 1 });
    tryCheatDeath(t, 80);
    expect(t.cheatDeathChargesRemaining).toBe(0);
    // 두 번째
    t.hp = 1;
    expect(tryCheatDeath(t, 5)).toBe(false);
  });

  test('charges 2 → 두 번 발동 가능', () => {
    const t = makeCombatant({ hp: 50, maxHp: 100, cheatDeathChargesRemaining: 2 });
    expect(tryCheatDeath(t, 80)).toBe(true);
    expect(t.cheatDeathChargesRemaining).toBe(1);
    t.hp = 50;
    expect(tryCheatDeath(t, 80)).toBe(true);
    expect(t.cheatDeathChargesRemaining).toBe(0);
  });
});
