// ─── 패시브 효과 전투 훅 (Phase 55-S2) ──────────────────────────
// 5종 상시 modifier 의 실제 게임 적용 — 회피/명중/MP 회복/저체력 ATK/피격 DEF
//
// 순수 함수로 분리하여 단위 테스트 가능. CombatEngine 이 각 행동 시점에 호출.

/** 저체력 트리거 임계치 (HP / maxHP) */
export const LOW_HP_THRESHOLD = 0.30;

/**
 * passive modifier 를 가진 전투 참가자의 최소 형태.
 * CombatParticipant 가 이 형태를 만족 (구조적 타입).
 */
export interface PassiveCombatant {
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  evasionAddPercent?: number;
  hitChanceAddPercent?: number;
  mpRegenPerTurn?: number;
  lowHpAtkBonusPercent?: number;
  defenseUpConditionalPercent?: number;
}

/**
 * low_hp_atk_up 적용 — 자기 hp 가 30% 미만이면 atk 가산.
 * 임계 이상이거나 modifier 0 이면 base 그대로.
 */
export function getEffectiveAtk(actor: PassiveCombatant, baseAtk: number): number {
  const bonus = actor.lowHpAtkBonusPercent ?? 0;
  if (bonus <= 0) return baseAtk;
  if (actor.maxHp <= 0) return baseAtk;
  if (actor.hp / actor.maxHp >= LOW_HP_THRESHOLD) return baseAtk;
  return Math.floor(baseAtk * (1 + bonus / 100));
}

/**
 * defense_up_conditional 적용 — 피격 시 def 가산.
 * 현 시점에서는 "피격 시" 트리거 = damage 계산 시점이므로 항상 적용.
 */
export function getEffectiveDef(target: PassiveCombatant, baseDef: number): number {
  const bonus = target.defenseUpConditionalPercent ?? 0;
  if (bonus <= 0) return baseDef;
  return Math.floor(baseDef * (1 + bonus / 100));
}

/**
 * miss 확률 = max(0, defenderEvasion - attackerHitChance) / 100
 * 0~1 범위.
 */
export function computeMissChance(attacker: PassiveCombatant, defender: PassiveCombatant): number {
  const evasion = defender.evasionAddPercent ?? 0;
  const hit = attacker.hitChanceAddPercent ?? 0;
  return Math.max(0, evasion - hit) / 100;
}

/**
 * 회피 판정 — true 이면 miss (공격 무효).
 * rng 는 0..1 사이 난수 생성기 (테스트 시 stub 가능).
 */
export function rollMiss(
  attacker: PassiveCombatant,
  defender: PassiveCombatant,
  rng: () => number = Math.random,
): boolean {
  const missChance = computeMissChance(attacker, defender);
  if (missChance <= 0) return false;
  return rng() < missChance;
}

/**
 * mp_regen tick — actor.mp 를 mpRegenPerTurn 만큼 증가 (maxMp 캡).
 * 변경된 MP 양 반환.
 *
 * **mutates `actor`**: actor.mp 를 직접 변경. 이는 CombatEngine 의
 * 다른 mana 처리(manaManager.tickRegen)와 동일한 패턴.
 */
export function applyMpRegen(actor: PassiveCombatant): number {
  const regen = actor.mpRegenPerTurn ?? 0;
  if (regen <= 0) return 0;
  if (actor.mp >= actor.maxMp) return 0;
  const before = actor.mp;
  actor.mp = Math.min(actor.maxMp, actor.mp + regen);
  return actor.mp - before;
}
