/**
 * characterCombatStats.ts — 클래스+레벨 기반 전투 스탯 파생 (서버 권위)  [SECURITY]
 *
 * 배경: raid/worldboss/dungeon 등 일부 전투 sink 가 클라가 보낸 damage 를 그대로 신뢰했다.
 * 서버 권위 damage 산정을 위해, 공격자 캐릭터의 ATK 를 클래스+레벨에서 서버가 도출하고
 * damageCalculator(메인 전투가 이미 쓰는 공식)로 damage 를 계산한다.
 *
 * NOTE(consolidate-TODO): 동일한 CLASS_BASE/CLASS_GROWTH 테이블이 routes/combatRoutes.ts 와
 * combat/levelUpSystem.ts 에도 중복 존재한다. 추후 그 둘을 이 모듈 import 로 통합 권장(현재는
 * 회귀 위험 회피를 위해 이 모듈을 정규 소스로 신설만 하고 기존 중복은 건드리지 않음).
 */
import { calculateBasicPhysical, type DamageResult } from './damageCalculator';

export interface DerivedCombatStats {
  atk: number;
  def: number;
  matk: number;
  mdef: number;
  spd: number;
}

interface BaseStat { atk: number; def: number; matk: number; mdef: number; spd: number }
interface GrowthStat { atk: number; def: number; matk: number; mdef: number; spd: number }

/** 클래스별 기본 전투 스탯 (레벨 1) — combatRoutes.ts:37 과 동일 값(정규 소스). */
const CLASS_BASE: Record<string, BaseStat> = {
  ether_knight:   { atk: 15, def: 12, matk: 5,  mdef: 8,  spd: 10 },
  memory_weaver:  { atk: 5,  def: 6,  matk: 18, mdef: 14, spd: 10 },
  shadow_weaver:  { atk: 12, def: 8,  matk: 10, mdef: 8,  spd: 14 },
  memory_breaker: { atk: 18, def: 10, matk: 8,  mdef: 8,  spd: 12 },
  time_guardian:  { atk: 8,  def: 15, matk: 10, mdef: 15, spd: 8  },
  void_wanderer:  { atk: 10, def: 8,  matk: 14, mdef: 10, spd: 12 },
};

/** 클래스별 레벨당 성장률 — combatRoutes.ts:50 과 동일 값. */
const CLASS_GROWTH: Record<string, GrowthStat> = {
  ether_knight:   { atk: 4, def: 4, matk: 1, mdef: 2, spd: 2 },
  memory_weaver:  { atk: 1, def: 2, matk: 5, mdef: 4, spd: 2 },
  shadow_weaver:  { atk: 3, def: 2, matk: 3, mdef: 2, spd: 4 },
  memory_breaker: { atk: 5, def: 3, matk: 2, mdef: 2, spd: 3 },
  time_guardian:  { atk: 2, def: 5, matk: 3, mdef: 5, spd: 1 },
  void_wanderer:  { atk: 3, def: 2, matk: 4, mdef: 3, spd: 3 },
};

const DEFAULT_CLASS = 'ether_knight';

/** 클래스+레벨 → 파생 전투 스탯(서버 권위). 알 수 없는 클래스는 ether_knight 로 폴백. */
export function deriveCombatStats(classId: string, level: number): DerivedCombatStats {
  const base = CLASS_BASE[classId] ?? CLASS_BASE[DEFAULT_CLASS];
  const growth = CLASS_GROWTH[classId] ?? CLASS_GROWTH[DEFAULT_CLASS];
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
