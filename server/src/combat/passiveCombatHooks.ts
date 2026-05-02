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
  alive?: boolean;
  // Phase 1
  evasionAddPercent?: number;
  hitChanceAddPercent?: number;
  mpRegenPerTurn?: number;
  lowHpAtkBonusPercent?: number;
  defenseUpConditionalPercent?: number;
  // Phase 3 (트리거)
  reflectPercent?: number;
  projectileReflectPercent?: number;
  hpRegenPerTurn?: number;
  cheatDeathChargesRemaining?: number;
  // Phase 4 (부분)
  critEchoPercent?: number;
  moveDamageAuraValue?: number;
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

// ─── Phase 3 (트리거) ────────────────────────────────────────

/**
 * battle_regen tick — actor.hp 를 hpRegenPerTurn 만큼 증가 (maxHp 캡, alive 만).
 * 변경된 HP 양 반환.
 *
 * **mutates `actor`**: actor.hp 직접 변경.
 */
export function applyHpRegen(actor: PassiveCombatant): number {
  if (actor.alive === false) return 0;
  const regen = actor.hpRegenPerTurn ?? 0;
  if (regen <= 0) return 0;
  if (actor.hp >= actor.maxHp) return 0;
  const before = actor.hp;
  actor.hp = Math.min(actor.maxHp, actor.hp + regen);
  return actor.hp - before;
}

/**
 * physical 피격 시 attacker 에 반사 — damage * reflectPercent/100.
 * defender.reflectPercent 를 사용. 음수/0 이면 0 반환.
 */
export function computeReflectDamage(defender: PassiveCombatant, damageTaken: number): number {
  const pct = defender.reflectPercent ?? 0;
  if (pct <= 0 || damageTaken <= 0) return 0;
  return Math.floor(damageTaken * (pct / 100));
}

/**
 * magical 피격 시 attacker 에 반사 — damage * projectileReflectPercent/100.
 */
export function computeProjectileReflectDamage(defender: PassiveCombatant, damageTaken: number): number {
  const pct = defender.projectileReflectPercent ?? 0;
  if (pct <= 0 || damageTaken <= 0) return 0;
  return Math.floor(damageTaken * (pct / 100));
}

/**
 * 치명 데미지 처리 — fatal damage 가 들어왔을 때 cheat_death 발동 시 hp=1 으로 유지.
 *
 * 입력:
 *   - target: cheatDeathChargesRemaining 보유 가능
 *   - incomingDamage: 적용 예정 데미지
 * 동작:
 *   - target.hp - incomingDamage <= 0 이고 chargesRemaining > 0 면 hp=1, charge 1 차감, true 반환
 *   - 그 외엔 noop, false
 *
 * **mutates `target`**: hp 와 cheatDeathChargesRemaining 변경 (트리거 발동 시).
 */
export function tryCheatDeath(target: PassiveCombatant, incomingDamage: number): boolean {
  const charges = target.cheatDeathChargesRemaining ?? 0;
  if (charges <= 0) return false;
  if (target.hp - incomingDamage > 0) return false;
  target.hp = 1;
  target.cheatDeathChargesRemaining = charges - 1;
  return true;
}

// ─── Phase 4 (부분) ──────────────────────────────────────────

/**
 * crit_echo — 크리티컬 시 추가 데미지.
 * isCritical=true 이고 attacker.critEchoPercent > 0 면 baseDamage × critEchoPercent/100 추가 데미지 반환.
 * 아니면 0.
 */
export function computeCritEchoDamage(
  attacker: PassiveCombatant,
  isCritical: boolean,
  baseDamage: number,
): number {
  if (!isCritical) return 0;
  const pct = attacker.critEchoPercent ?? 0;
  if (pct <= 0 || baseDamage <= 0) return 0;
  return Math.floor(baseDamage * (pct / 100));
}

/**
 * move_damage_aura — 매 tick 적군 전체에 가하는 광역 데미지.
 * actor.moveDamageAuraValue 가 적용되며, alive 만 적용.
 *
 * **mutates `enemies`**: 각 enemy.hp 감소.
 * 사망 처리(alive=false) 는 호출자가 enemy.hp ≤ 0 검사 후 수행.
 *
 * 반환: [{ enemyId, damage }] — 로깅용.
 */
export function applyMoveDamageAura(
  actor: PassiveCombatant & { id?: string },
  enemies: ReadonlyArray<PassiveCombatant & { id: string; alive?: boolean }>,
): Array<{ enemyId: string; damage: number }> {
  if (actor.alive === false) return [];
  const aura = actor.moveDamageAuraValue ?? 0;
  if (aura <= 0) return [];

  const log: Array<{ enemyId: string; damage: number }> = [];
  for (const enemy of enemies) {
    if (enemy.alive === false) continue;
    enemy.hp = Math.max(0, enemy.hp - aura);
    log.push({ enemyId: enemy.id, damage: aura });
  }
  return log;
}
