/**
 * characterCombatStats.ts — 클래스+레벨 기반 전투 스탯 파생 (서버 권위)  [SECURITY]
 *
 * 배경: raid/worldboss/dungeon 등 일부 전투 sink 가 클라가 보낸 damage 를 그대로 신뢰했다.
 * 서버 권위 damage 산정을 위해, 공격자 캐릭터의 ATK 를 클래스+레벨에서 서버가 도출하고
 * damageCalculator(메인 전투가 이미 쓰는 공식)로 damage 를 계산한다.
 *
 * 통합(B15): 5필드 base/growth 는 combat/classBaseStats.ts(SSOT)로 추출했다. 이 모듈은
 * 그 SSOT 를 직접 import 한다. combatRoutes/levelUpSystem 의 로컬 테이블은 구조가 달라
 * (crit/critDamage·hp/mp 추가) 직접 합치지 않되, tests/unit/classBaseStatsSSOT.test.ts 가
 * 5필드 드리프트(경로 간 서버 권위 damage 불일치)를 가드한다.
 */
import { calculateBasicPhysical, type DamageResult } from './damageCalculator';
import {
  CLASS_BASE_STATS,
  CLASS_GROWTH_STATS,
  DEFAULT_BASE_CLASS,
  type BaseClassId,
} from './classBaseStats';

export interface DerivedCombatStats {
  atk: number;
  def: number;
  matk: number;
  mdef: number;
  spd: number;
}

/** 클래스+레벨 → 파생 전투 스탯(서버 권위). 알 수 없는 클래스는 ether_knight 로 폴백. */
export function deriveCombatStats(classId: string, level: number): DerivedCombatStats {
  const base = CLASS_BASE_STATS[classId as BaseClassId] ?? CLASS_BASE_STATS[DEFAULT_BASE_CLASS];
  const growth = CLASS_GROWTH_STATS[classId as BaseClassId] ?? CLASS_GROWTH_STATS[DEFAULT_BASE_CLASS];
  const lvl = Math.max(0, Math.floor(level) - 1);
  return {
    atk: base.atk + growth.atk * lvl,
    def: base.def + growth.def * lvl,
    matk: base.matk + growth.matk * lvl,
    mdef: base.mdef + growth.mdef * lvl,
    spd: base.spd + growth.spd * lvl,
  };
}

/**
 * 공격자(클래스/레벨)가 주어진 방어력의 대상에게 가하는 물리 damage 를 서버에서 산정.
 * skillMultiplier 로 스킬 배율을 곱한다(기본 1.0 = 기본 공격). 크리/분산은 damageCalculator 의 기본값.
 */
export function computePhysicalDamage(
  attacker: { classId: string; level: number },
  defenderDef: number,
  skillMultiplier = 1.0,
): number {
  const stats = deriveCombatStats(attacker.classId, attacker.level);
  const result: DamageResult = calculateBasicPhysical(stats.atk * skillMultiplier, Math.max(0, defenderDef));
  return result.damage;
}
