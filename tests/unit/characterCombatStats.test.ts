/**
 * 유닛 테스트 — 서버 권위 전투 스탯 파생 (characterCombatStats)
 *
 * raid 등 전투 sink 가 클라 damage 대신 서버 산정을 쓰기 위한 ATK 도출 + damage 계산.
 */
import { describe, expect, test } from 'vitest';
import { deriveCombatStats, computePhysicalDamage } from '../../server/src/combat/characterCombatStats';

describe('characterCombatStats (서버 권위 damage)', () => {
  test('deriveCombatStats — 레벨1 클래스 기본값', () => {
    expect(deriveCombatStats('ether_knight', 1).atk).toBe(15);
    expect(deriveCombatStats('memory_breaker', 1).atk).toBe(18);
    expect(deriveCombatStats('memory_weaver', 1).matk).toBe(18);
  });

  test('deriveCombatStats — 레벨당 성장 적용', () => {
    // ether_knight: base atk 15 + growth 4 × (level-1)
    expect(deriveCombatStats('ether_knight', 10).atk).toBe(15 + 4 * 9);
    // memory_breaker: base 18 + growth 5 × 49
    expect(deriveCombatStats('memory_breaker', 50).atk).toBe(18 + 5 * 49);
  });

  test('알 수 없는 클래스 → ether_knight 폴백', () => {
    expect(deriveCombatStats('unknown_class', 1).atk).toBe(15);
  });

  test('computePhysicalDamage — 양수 + 방어가 높을수록 감소(클라 입력 없이 서버 산정)', () => {
    const lowDef = computePhysicalDamage({ classId: 'memory_breaker', level: 50 }, 10);
    const highDef = computePhysicalDamage({ classId: 'memory_breaker', level: 50 }, 1000);
    expect(lowDef).toBeGreaterThan(0);
    expect(highDef).toBeGreaterThanOrEqual(1); // MIN_DAMAGE 보장
    expect(lowDef).toBeGreaterThan(highDef);   // 방어 높을수록 적게 들어감
  });

  test('computePhysicalDamage — 레벨 높을수록 강함(동일 클래스/방어)', () => {
    const lvl1 = computePhysicalDamage({ classId: 'ether_knight', level: 1 }, 5);
    const lvl60 = computePhysicalDamage({ classId: 'ether_knight', level: 60 }, 5);
    expect(lvl60).toBeGreaterThan(lvl1);
  });

  test('computePhysicalDamage — 스킬 배율 높을수록 강함', () => {
    const basic = computePhysicalDamage({ classId: 'memory_breaker', level: 50 }, 10, 1.0);
    const skill = computePhysicalDamage({ classId: 'memory_breaker', level: 50 }, 10, 2.0);
    expect(skill).toBeGreaterThan(basic); // 배율 2.0 은 1.0 보다 항상 큼(분산/크리 무관)
  });
});
