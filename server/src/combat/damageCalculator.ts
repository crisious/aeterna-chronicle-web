// ─── 데미지 계산 시스템 (P24-03/04/05) ────────────────────────
// 물리/마법 데미지 공식, 속성 상성, 방어 관통, 크리티컬

// ─── 속성 정의 ─────────────────────────────────────────────────

export type ElementType = 'fire' | 'water' | 'wind' | 'earth' | 'light' | 'dark' | 'neutral';

// ─── 속성 상성 테이블 ──────────────────────────────────────────
// 화→풍, 풍→지, 지→수, 수→화 (순환), 명↔암 (상호 강)

const ELEMENT_ADVANTAGE: Record<ElementType, ElementType[]> = {
  fire:    ['wind'],
  water:   ['fire'],
  wind:    ['earth'],
  earth:   ['water'],
  light:   ['dark'],
  dark:    ['light'],
  neutral: [],
};

const ADVANTAGE_MULTIPLIER = 1.5;
const DISADVANTAGE_MULTIPLIER = 0.67;

// ─── 데미지 타입 ───────────────────────────────────────────────

export type DamageType = 'physical' | 'magical' | 'true';

export interface DamageInput {
  type: DamageType;
  /** 공격자 ATK (물리) 또는 MATK (마법) */
  attackStat: number;
  /** 방어자 DEF (물리) 또는 MDEF (마법) */
  defenseStat: number;
  /** 스킬 배율 (1.0 = 기본 공격) */
  skillMultiplier: number;
  /** 공격자 속성 */
  attackerElement: ElementType;
  /** 방어자 속성 */
  defenderElement: ElementType;
  /** 크리티컬 확률 (0~100) */
  critRate: number;
  /** 크리티컬 추가 데미지 (%, 기본 50 = 1.5배) */
  critDamage: number;
  /** 방어 관통 (고정값, DEF에서 차감) */
  armorPenetration: number;
  /** 방어 관통 % (0~100) */
  armorPenetrationPercent: number;
  /** 추가 데미지 배율 (콤보, 버프 등) */
  bonusMultiplier: number;
  /** 레벨 차이 보정 (공격자 레벨 - 방어자 레벨) */
  levelDifference: number;
}

export interface DamageResult {
  /** 최종 데미지 */
  damage: number;
  /** 크리티컬 여부 */
  isCritical: boolean;
  /** 속성 배율 */
  elementMultiplier: number;
  /** 유효 방어력 */
  effectiveDefense: number;
  /** 데미지 감소율 (%) */
  damageReduction: number;
}

// ─── 상수 ──────────────────────────────────────────────────────

/** 물리 데미지에서 DEF 감산 계수 */
const PHYSICAL_DEF_FACTOR = 0.5;
/** 마법 데미지에서 MDEF 감산 계수 */
const MAGICAL_DEF_FACTOR = 0.4;
/** 데미지 감소 상한 (%) */
const MAX_DAMAGE_REDUCTION = 90;
/** 최소 데미지 보장 */
const MIN_DAMAGE = 1;
/** 랜덤 분산 범위 (±%) */
const RANDOM_VARIANCE = 5;
/** 레벨 차이 보정 계수 (레벨당 %) */
const LEVEL_DIFF_FACTOR = 2;
/** 레벨 차이 보정 상한 (%) */
const MAX_LEVEL_BONUS = 30;

// ─── 핵심 계산 함수 ────────────────────────────────────────────

/**
 * 속성 상성 배율 계산
 */
export function getElementMultiplier(
  attackerElement: ElementType,
  defenderElement: ElementType,
): number {
  if (attackerElement === 'neutral' || defenderElement === 'neutral') return 1.0;
  if (ELEMENT_ADVANTAGE[attackerElement]?.includes(defenderElement)) {
    return ADVANTAGE_MULTIPLIER;
  }
  if (ELEMENT_ADVANTAGE[defenderElement]?.includes(attackerElement)) {
    return DISADVANTAGE_MULTIPLIER;
  }
  return 1.0;
}

/**
 * 유효 방어력 계산 (관통 적용)
 */
export function calculateEffectiveDefense(
  baseDef: number,
  armorPen: number,
  armorPenPercent: number,
): number {
  // 고정 관통 먼저, 그 다음 % 관통
  const afterFlat = Math.max(0, baseDef - armorPen);
  const afterPercent = afterFlat * (1 - armorPenPercent / 100);
  return Math.max(0, afterPercent);
}

/**
 * 크리티컬 판정
 */
export function rollCritical(critRate: number): boolean {
  return Math.random() * 100 < critRate;
}

/**
 * 랜덤 분산 (±RANDOM_VARIANCE%)
 */
function getRandomVariance(): number {
  return 1 + (Math.random() * 2 - 1) * (RANDOM_VARIANCE / 100);
}

/**
 * 레벨 차이 보정 배율
 */
function getLevelDiffMultiplier(levelDiff: number): number {
  const bonus = Math.min(Math.abs(levelDiff) * LEVEL_DIFF_FACTOR, MAX_LEVEL_BONUS);
  return levelDiff >= 0 ? 1 + bonus / 100 : 1 - bonus / 100;
}

/**
 * 메인 데미지 계산
 */
export function calculateDamage(input: DamageInput): DamageResult {
  const {
    type, attackStat, defenseStat, skillMultiplier,
    attackerElement, defenderElement,
    critRate, critDamage, armorPenetration, armorPenetrationPercent,
    bonusMultiplier, levelDifference,
  } = input;

  // 1. 유효 방어력
  const effectiveDefense = type === 'true'
    ? 0
    : calculateEffectiveDefense(defenseStat, armorPenetration, armorPenetrationPercent);

  // 2. 방어 감산 계수
  const defFactor = type === 'physical' ? PHYSICAL_DEF_FACTOR : MAGICAL_DEF_FACTOR;

  // 3. 기본 데미지 = (공격력 × 스킬배율) - (유효방어 × 감산계수)
  let baseDamage = (attackStat * skillMultiplier) - (effectiveDefense * defFactor);

  // 4. 데미지 감소율 계산
  const damageReduction = type === 'true'
    ? 0
    : Math.min(
        (effectiveDefense * defFactor) / (attackStat * skillMultiplier) * 100,
        MAX_DAMAGE_REDUCTION,
      );

  // 5. 속성 상성
  const elementMultiplier = getElementMultiplier(attackerElement, defenderElement);
  baseDamage *= elementMultiplier;

  // 6. 크리티컬
  const isCritical = rollCritical(critRate);
  if (isCritical) {
    baseDamage *= (1 + critDamage / 100);
  }

  // 7. 레벨 차이 보정
  baseDamage *= getLevelDiffMultiplier(levelDifference);

  // 8. 추가 배율 (콤보, 버프 등)
  baseDamage *= bonusMultiplier;

  // 9. 랜덤 분산
  baseDamage *= getRandomVariance();

  // 10. 최소 데미지 보장
  const finalDamage = Math.max(MIN_DAMAGE, Math.round(baseDamage));

  return {
    damage: finalDamage,
    isCritical,
    elementMultiplier,
    effectiveDefense,
    damageReduction: Math.round(damageReduction * 10) / 10,
  };
}

// ─── 간편 계산 헬퍼 ────────────────────────────────────────────

/** 기본 물리 공격 데미지 (스킬 배율 1.0, 보너스 없음) */
export function calculateBasicPhysical(
  atk: number, def: number,
  attackerEl: ElementType = 'neutral',
  defenderEl: ElementType = 'neutral',
  critRate = 5, critDmg = 50,
): DamageResult {
  return calculateDamage({
    type: 'physical',
    attackStat: atk,
    defenseStat: def,
    skillMultiplier: 1.0,
    attackerElement: attackerEl,
    defenderElement: defenderEl,
    critRate,
    critDamage: critDmg,
    armorPenetration: 0,
    armorPenetrationPercent: 0,
    bonusMultiplier: 1.0,
    levelDifference: 0,
  });
}

/** 스킬 데미지 계산 */
export function calculateSkillDamage(
  type: DamageType,
  atk: number, def: number,
  skillMult: number,
  attackerEl: ElementType, defenderEl: ElementType,
  critRate: number, critDmg: number,
  armorPen = 0, armorPenPct = 0,
  bonus = 1.0, levelDiff = 0,
): DamageResult {
  return calculateDamage({
    type,
    attackStat: atk,
    defenseStat: def,
    skillMultiplier: skillMult,
    attackerElement: attackerEl,
    defenderElement: defenderEl,
    critRate,
    critDamage: critDmg,
    armorPenetration: armorPen,
    armorPenetrationPercent: armorPenPct,
    bonusMultiplier: bonus,
    levelDifference: levelDiff,
  });
}
