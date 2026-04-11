/**
 * Unit tests -- damageCalculator (T-04)
 * Physical/magical formulas, crit, element advantage,
 * bonus multiplier, edge cases
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateDamage,
  calculateEffectiveDefense,
  getElementMultiplier,
  rollCritical,
  calculateBasicPhysical,
  calculateSkillDamage,
  type DamageInput,
} from '../../server/src/combat/damageCalculator';

// Helper: create a standard DamageInput with sensible defaults
function makeInput(overrides: Partial<DamageInput> = {}): DamageInput {
  return {
    type: 'physical',
    attackStat: 200,
    defenseStat: 100,
    skillMultiplier: 1.0,
    attackerElement: 'neutral',
    defenderElement: 'neutral',
    critRate: 0,          // no crit by default
    critDamage: 50,
    armorPenetration: 0,
    armorPenetrationPercent: 0,
    bonusMultiplier: 1.0,
    levelDifference: 0,
    ...overrides,
  };
}

describe('damageCalculator', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Fix random to remove variance for deterministic tests
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  // ── 1. Physical damage formula ──

  it('1. physical damage = (ATK * mult) - (effDef * 0.5)', () => {
    const result = calculateDamage(makeInput({
      type: 'physical',
      attackStat: 200,
      defenseStat: 100,
      skillMultiplier: 1.0,
    }));

    // base = 200*1.0 - 100*0.5 = 150
    // neutral element = 1.0, no crit, no level diff, bonus 1.0
    // random variance: 1 + (0.5*2 - 1)*0.05 = 1.0 (when random=0.5)
    // final = round(150) = 150
    expect(result.damage).toBe(150);
    expect(result.isCritical).toBe(false);
    expect(result.elementMultiplier).toBe(1.0);
  });

  // ── 2. Magical damage formula (uses 0.4 defense factor) ──

  it('2. magical damage uses 0.4 defense factor instead of 0.5', () => {
    const result = calculateDamage(makeInput({
      type: 'magical',
      attackStat: 200,
      defenseStat: 100,
      skillMultiplier: 1.0,
    }));

    // base = 200*1.0 - 100*0.4 = 160
    expect(result.damage).toBe(160);
  });

  // ── 3. Critical hit multiplier ──

  it('3. critical hit applies (1 + critDamage/100) multiplier', () => {
    // Force crit: random() returns 0.5, critRate 100 => always crits
    // But rollCritical uses Math.random()*100 < critRate
    // With our mock, Math.random()=0.5 => 50 < 100 => true
    const result = calculateDamage(makeInput({
      critRate: 100,
      critDamage: 50,
    }));

    // base = 200 - 50 = 150, crit multiplier = 1.5 => 225
    expect(result.damage).toBe(225);
    expect(result.isCritical).toBe(true);
  });

  // ── 4. Element advantage (1.5x) ──

  it('4. fire vs wind gives 1.5x element advantage', () => {
    const result = calculateDamage(makeInput({
      attackerElement: 'fire',
      defenderElement: 'wind',
    }));

    // base = 150, element = 1.5 => 225
    expect(result.damage).toBe(225);
    expect(result.elementMultiplier).toBe(1.5);
  });

  // ── 5. Element disadvantage (0.67x) ──

  it('5. fire vs water gives 0.67x element disadvantage', () => {
    const result = calculateDamage(makeInput({
      attackerElement: 'fire',
      defenderElement: 'water',
    }));

    // base = 150, element = 0.67 => 100.5 => round = 101 (100.5 rounds to 100 or 101)
    expect(result.damage).toBe(Math.round(150 * 0.67));
    expect(result.elementMultiplier).toBe(0.67);
  });

  // ── 6. Bonus multiplier (combo integration) ──

  it('6. bonusMultiplier scales final damage', () => {
    const result = calculateDamage(makeInput({
      bonusMultiplier: 1.4,
    }));

    // base = 150, bonus 1.4 => 210
    expect(result.damage).toBe(210);
  });

  // ── 7. Edge case: 0 defense ──

  it('7. zero defense results in full attack damage', () => {
    const result = calculateDamage(makeInput({
      defenseStat: 0,
    }));

    // base = 200*1.0 - 0*0.5 = 200
    expect(result.damage).toBe(200);
    expect(result.effectiveDefense).toBe(0);
  });

  // ── 8. Edge case: high armor penetration exceeding defense ──

  it('8. armor penetration exceeding defense clamps effective defense to 0', () => {
    const effDef = calculateEffectiveDefense(100, 150, 0);
    expect(effDef).toBe(0);

    const result = calculateDamage(makeInput({
      defenseStat: 100,
      armorPenetration: 150,
    }));

    // effective def = 0, so base = 200 - 0 = 200
    expect(result.damage).toBe(200);
    expect(result.effectiveDefense).toBe(0);
  });

  // ── 9. Armor penetration percent ──

  it('9. armor penetration percent reduces remaining defense after flat pen', () => {
    const effDef = calculateEffectiveDefense(100, 20, 50);
    // afterFlat = max(0, 100-20) = 80
    // afterPercent = 80 * (1 - 50/100) = 40
    expect(effDef).toBe(40);
  });

  // ── 10. True damage ignores defense ──

  it('10. true damage ignores defense entirely', () => {
    const result = calculateDamage(makeInput({
      type: 'true',
      defenseStat: 999,
    }));

    // effective def = 0 for true damage, base = 200*1.0 - 0 = 200
    expect(result.damage).toBe(200);
    expect(result.effectiveDefense).toBe(0);
    expect(result.damageReduction).toBe(0);
  });

  // ── 11. Minimum damage guarantee ──

  it('11. damage is at least 1 even when defense is very high', () => {
    const result = calculateDamage(makeInput({
      attackStat: 10,
      defenseStat: 9999,
    }));

    // base = 10*1.0 - very large = negative => clamped to MIN_DAMAGE = 1
    expect(result.damage).toBe(1);
  });

  // ── 12. getElementMultiplier helper ──

  it('12. getElementMultiplier returns correct values for all matchups', () => {
    expect(getElementMultiplier('fire', 'wind')).toBe(1.5);
    expect(getElementMultiplier('water', 'fire')).toBe(1.5);
    expect(getElementMultiplier('wind', 'earth')).toBe(1.5);
    expect(getElementMultiplier('earth', 'water')).toBe(1.5);
    expect(getElementMultiplier('light', 'dark')).toBe(1.5);
    expect(getElementMultiplier('dark', 'light')).toBe(1.5);

    // Disadvantage
    expect(getElementMultiplier('wind', 'fire')).toBe(0.67);

    // Neutral
    expect(getElementMultiplier('neutral', 'fire')).toBe(1.0);
    expect(getElementMultiplier('fire', 'neutral')).toBe(1.0);
    expect(getElementMultiplier('fire', 'fire')).toBe(1.0);
  });

  // ── 13. Level difference bonus ──

  it('13. positive level difference increases damage', () => {
    const higher = calculateDamage(makeInput({ levelDifference: 10 }));
    const equal = calculateDamage(makeInput({ levelDifference: 0 }));

    // levelDiff=10 => bonus = min(10*2, 30) = 20% => mult = 1.20
    // base = 150 * 1.20 = 180
    expect(higher.damage).toBeGreaterThan(equal.damage);
    expect(higher.damage).toBe(180);
  });
});
