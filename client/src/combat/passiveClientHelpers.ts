// ─── 패시브 효과 클라 헬퍼 (B-S1) ──────────────────────────────
//
// server/src/combat/passiveCombatHooks.ts 의 클라 미러.
// BattleScene 의 자체 시뮬레이터가 패시브 효과를 즉시 시각화 가능하도록.
//
// 동기화: design-consistency 회귀 테스트 — 같은 함수 시그너처 + 동작.

export interface PassiveCombatantClient {
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  alive?: boolean;
  evasionAddPercent?: number;
  hitChanceAddPercent?: number;
  mpRegenPerTurn?: number;
  lowHpAtkBonusPercent?: number;
  defenseUpConditionalPercent?: number;
  reflectPercent?: number;
  projectileReflectPercent?: number;
  hpRegenPerTurn?: number;
  cheatDeathChargesRemaining?: number;
  critEchoPercent?: number;
  moveDamageAuraValue?: number;
  drainAmplifyPercent?: number;
}

/** 저체력 트리거 임계 (HP / maxHP) */
export const LOW_HP_THRESHOLD = 0.30;

/**
 * miss 확률 = max(0, defenderEvasion - attackerHitChance) / 100. 0~1.
 * server: passiveCombatHooks.computeMissChance 와 동일 식.
 */
export function computeMissChance(
  attacker: PassiveCombatantClient,
  defender: PassiveCombatantClient,
): number {
  const evasion = defender.evasionAddPercent ?? 0;
  const hit = attacker.hitChanceAddPercent ?? 0;
  return Math.max(0, evasion - hit) / 100;
}

/**
 * 회피 판정 — true 이면 miss. rng 주입 가능 (테스트).
 */
export function rollMiss(
  attacker: PassiveCombatantClient,
  defender: PassiveCombatantClient,
  rng: () => number = Math.random,
): boolean {
  const miss = computeMissChance(attacker, defender);
  if (miss <= 0) return false;
  return rng() < miss;
}

/**
 * physical 피격 시 attacker 에 반사 데미지 — damage × reflectPct/100, floor.
 */
export function computeReflectDamage(defender: PassiveCombatantClient, damage: number): number {
  const pct = defender.reflectPercent ?? 0;
  if (pct <= 0 || damage <= 0) return 0;
  return Math.floor(damage * (pct / 100));
}

/**
 * magical 피격 시 attacker 에 반사 데미지 — damage × projectileReflectPct/100, floor.
 */
export function computeProjectileReflectDamage(
  defender: PassiveCombatantClient,
  damage: number,
): number {
  const pct = defender.projectileReflectPercent ?? 0;
  if (pct <= 0 || damage <= 0) return 0;
  return Math.floor(damage * (pct / 100));
}

/**
 * 저체력 atk 부스트 — actor.hp < 30% 이면 baseAtk × (1 + bonus%/100).
 */
export function getEffectiveAtk(actor: PassiveCombatantClient, baseAtk: number): number {
  const bonus = actor.lowHpAtkBonusPercent ?? 0;
  if (bonus <= 0) return baseAtk;
  if (actor.maxHp <= 0) return baseAtk;
  if (actor.hp / actor.maxHp >= LOW_HP_THRESHOLD) return baseAtk;
  return Math.floor(baseAtk * (1 + bonus / 100));
}

/**
 * 피격 시 def 부스트 — defenseUpConditionalPercent 적용.
 */
export function getEffectiveDef(target: PassiveCombatantClient, baseDef: number): number {
  const bonus = target.defenseUpConditionalPercent ?? 0;
  if (bonus <= 0) return baseDef;
  return Math.floor(baseDef * (1 + bonus / 100));
}

/**
 * crit_echo — 크리티컬 시 추가 데미지.
 */
export function computeCritEchoDamage(
  attacker: PassiveCombatantClient,
  isCritical: boolean,
  baseDamage: number,
): number {
  if (!isCritical) return 0;
  const pct = attacker.critEchoPercent ?? 0;
  if (pct <= 0 || baseDamage <= 0) return 0;
  return Math.floor(baseDamage * (pct / 100));
}

/**
 * lifesteal 회복량 — damage × lifestealPct/100 × (1 + drainAmp/100), floor.
 * 발동 조건만 산출. 실 hp 갱신은 호출자.
 */
export function computeLifestealHeal(
  attacker: PassiveCombatantClient,
  lifestealPct: number,
  damage: number,
): number {
  if (lifestealPct <= 0 || damage <= 0) return 0;
  if (attacker.alive === false) return 0;
  if (attacker.hp >= attacker.maxHp) return 0;
  const drainAmp = attacker.drainAmplifyPercent ?? 0;
  const baseHeal = damage * (lifestealPct / 100);
  return Math.floor(baseHeal * (1 + drainAmp / 100));
}
