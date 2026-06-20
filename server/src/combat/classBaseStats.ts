/**
 * classBaseStats.ts — 클래스 기본/성장 전투 스탯의 단일 출처(SSOT)  [SECURITY/B15]
 *
 * 배경: 동일한 5필드(atk/def/matk/mdef/spd) base/growth 테이블이 세 곳에 중복돼 있었다:
 *   - combat/characterCombatStats.ts (소켓 권위 damage 산정)
 *   - routes/combatRoutes.ts        (REST /combat/start 초기 스탯)
 *   - combat/levelUpSystem.ts       (레벨업 자동 성장 — hp/mp/crit 추가 보유)
 * 이 5필드는 "서버 권위 damage"의 입력이므로, 경로마다 값이 갈리면 같은 캐릭터가
 * 진입 경로(REST vs 소켓)에 따라 다른 atk 를 갖는 정합성 버그가 된다.
 *
 * 이 모듈은 그 5필드 코어만 SSOT 로 고정한다. crit/critRate/critDamage·hp/mp 처럼
 * 소비자마다 의미·스케일이 다른 발산 필드(예: combatRoutes crit growth 0.002 vs
 * levelUpSystem crit 0.2 — 동명이의)는 의도적으로 각 소비자에 남긴다.
 *
 * characterCombatStats 는 이 SSOT 를 직접 import 한다. combatRoutes/levelUpSystem 의
 * 로컬 테이블은 구조가 달라(크리/체마 추가) 직접 합치지 않되, 5필드가 SSOT 와
 * 어긋나지 않도록 tests/unit/classBaseStatsSSOT.test.ts 가 드리프트를 가드한다.
 */

export type BaseClassId =
  | 'ether_knight'
  | 'memory_weaver'
  | 'shadow_weaver'
  | 'memory_breaker'
  | 'time_guardian'
  | 'void_wanderer';

/** damage 권위 5필드 블록(레벨 1 기준 base, 또는 레벨당 growth). */
export interface BaseCombatStatBlock {
  atk: number;
  def: number;
  matk: number;
  mdef: number;
  spd: number;
}

/** 클래스별 레벨 1 기본 스탯(5필드). */
export const CLASS_BASE_STATS: Record<BaseClassId, BaseCombatStatBlock> = {
  ether_knight:   { atk: 15, def: 12, matk: 5,  mdef: 8,  spd: 10 },
  memory_weaver:  { atk: 5,  def: 6,  matk: 18, mdef: 14, spd: 10 },
  shadow_weaver:  { atk: 12, def: 8,  matk: 10, mdef: 8,  spd: 14 },
  memory_breaker: { atk: 18, def: 10, matk: 8,  mdef: 8,  spd: 12 },
  time_guardian:  { atk: 8,  def: 15, matk: 10, mdef: 15, spd: 8  },
  void_wanderer:  { atk: 10, def: 8,  matk: 14, mdef: 10, spd: 12 },
};

/** 클래스별 레벨당 성장률(5필드). */
export const CLASS_GROWTH_STATS: Record<BaseClassId, BaseCombatStatBlock> = {
  ether_knight:   { atk: 4, def: 4, matk: 1, mdef: 2, spd: 2 },
  memory_weaver:  { atk: 1, def: 2, matk: 5, mdef: 4, spd: 2 },
  shadow_weaver:  { atk: 3, def: 2, matk: 3, mdef: 2, spd: 4 },
  memory_breaker: { atk: 5, def: 3, matk: 2, mdef: 2, spd: 3 },
  time_guardian:  { atk: 2, def: 5, matk: 3, mdef: 5, spd: 1 },
  void_wanderer:  { atk: 3, def: 2, matk: 4, mdef: 3, spd: 3 },
};

/** 알 수 없는 클래스의 폴백 기준 클래스. */
export const DEFAULT_BASE_CLASS: BaseClassId = 'ether_knight';
