// ─── 패시브 스킬 효과 리졸버 (Phase 55-S1) ─────────────────────
// equipped passive skill → stat modifier bag.
// Phase 1: 상시(always) modifier 5종 구현. 나머지 13종은 enum 등록만(Phase 2 분리).

import { prisma } from '../db';

// ─── 타입 ──────────────────────────────────────────────────────

/**
 * 모든 passive effect type. skillSeeds.effect.type 와 1:1 매칭.
 * Phase 1 구현: ALWAYS_KIND. 나머지는 추후 phase에서.
 */
export type PassiveEffectType =
  // Phase 1 (구현됨)
  | 'mp_regen'
  | 'evasion_up'
  | 'bonus_hit_chance'
  | 'low_hp_atk_up'
  | 'defense_up_conditional'
  // Phase 2 (stub — 등록만)
  | 'reflect'
  | 'cheat_death'
  | 'auto_resurrect'
  | 'poison_amplify'
  | 'drain_amplify'
  | 'crit_echo'
  | 'battle_regen'
  | 'projectile_reflect'
  | 'move_damage_aura';

/** Phase 1 에서 실제 stat 에 누적되는 modifier bag. */
export interface PassiveModifierBag {
  /** 매 ATB tick / 턴 마다 회복할 MP */
  mpRegenPerTurn: number;
  /** 회피율 가산 (단위: 백분율 — 15 = +15% 회피) */
  evasionAddPercent: number;
  /** 명중률 가산 */
  hitChanceAddPercent: number;
  /**
   * 저체력(<30%) 시 ATK 증가율. 전투 엔진이 hp 비율 검사 후 atk *= (1 + this/100) 적용.
   */
  lowHpAtkBonusPercent: number;
  /**
   * 피격 시 일시적 DEF 증가율 (조건부). 전투 엔진이 'on_hit' 트리거에서 사용.
   */
  defenseUpConditionalPercent: number;
}

/** 패시브 적용 결과 — 디버깅/노출용 */
export interface PassiveResolveResult {
  modifiers: PassiveModifierBag;
  /** 적용된 패시브 (recordId, type, value, level) — 트레이스용 */
  applied: ReadonlyArray<{
    skillCode: string;
    effectType: PassiveEffectType;
    rawValue: number;
    skillLevel: number;
    scaledValue: number;
  }>;
  /** 미구현(stub) 패시브 — Phase 2 대기 */
  pending: ReadonlyArray<{
    skillCode: string;
    effectType: PassiveEffectType;
  }>;
}

// ─── 상수 ──────────────────────────────────────────────────────

/** PASSIVE_SCALING 의 damageBonus 가 effect.value 에 적용되는 % 보너스 — skillSeeds 와 동일 테이블 */
const PASSIVE_LEVEL_VALUE_BONUS: Record<number, number> = {
  1: 0,
  2: 8,
  3: 18,
  4: 30,
  5: 45,
};

const ALWAYS_KIND: ReadonlySet<PassiveEffectType> = new Set([
  'mp_regen',
  'evasion_up',
  'bonus_hit_chance',
  'low_hp_atk_up',
  'defense_up_conditional',
]);

// ─── 헬퍼 ──────────────────────────────────────────────────────

export function emptyModifierBag(): PassiveModifierBag {
  return {
    mpRegenPerTurn: 0,
    evasionAddPercent: 0,
    hitChanceAddPercent: 0,
    lowHpAtkBonusPercent: 0,
    defenseUpConditionalPercent: 0,
  };
}

/**
 * 레벨별 효과치 스케일링.
 * skillSeeds 의 PASSIVE_SCALING.damageBonus 를 value 에도 동일 비율 적용.
 * (passive 는 damage 가 0 이므로 damageBonus 가 effect.value 에 의미를 가짐)
 */
export function scalePassiveValue(rawValue: number, skillLevel: number): number {
  const clamped = Math.max(1, Math.min(5, skillLevel));
  const bonus = PASSIVE_LEVEL_VALUE_BONUS[clamped] ?? 0;
  return Math.floor(rawValue * (1 + bonus / 100));
}

/** effect json blob → { type, value } 안전 파싱 */
function parseEffect(raw: unknown): { type: PassiveEffectType; value: number } | null {
  if (!raw || typeof raw !== 'object') return null;
  const e = raw as { type?: unknown; value?: unknown };
  if (typeof e.type !== 'string' || typeof e.value !== 'number') return null;
  return { type: e.type as PassiveEffectType, value: e.value };
}

/**
 * 단일 effect 를 modifier bag 에 누적. mutates `bag`.
 * 미구현 type 은 noop (호출자가 pending 으로 별도 추적).
 */
export function accumulatePassive(
  bag: PassiveModifierBag,
  effectType: PassiveEffectType,
  scaledValue: number,
): void {
  switch (effectType) {
    case 'mp_regen':
      bag.mpRegenPerTurn += scaledValue;
      return;
    case 'evasion_up':
      bag.evasionAddPercent += scaledValue;
      return;
    case 'bonus_hit_chance':
      bag.hitChanceAddPercent += scaledValue;
      return;
    case 'low_hp_atk_up':
      bag.lowHpAtkBonusPercent += scaledValue;
      return;
    case 'defense_up_conditional':
      bag.defenseUpConditionalPercent += scaledValue;
      return;
    default:
      // Phase 2 stub — 의도적으로 무시
      return;
  }
}

// ─── 메인 리졸버 ───────────────────────────────────────────────

/**
 * 캐릭터의 장착 패시브 효과를 누적해 modifier bag 반환.
 *
 * 로직:
 *   1) PlayerSkill where characterId, isEquipped → join Skill
 *   2) Skill.type === 'passive' 만 채택
 *   3) 각 effect.type 별로 PASSIVE_SCALING(damageBonus)에 따라 value 스케일링
 *   4) ALWAYS_KIND 면 modifier bag 에 누적, 아니면 pending 에 기록
 */
export async function resolvePassiveModifiers(
  characterId: string,
): Promise<PassiveResolveResult> {
  const playerSkills = await prisma.playerSkill.findMany({
    where: { characterId, isEquipped: true },
    include: { skill: true },
  });

  const bag = emptyModifierBag();
  const applied: Array<{
    skillCode: string;
    effectType: PassiveEffectType;
    rawValue: number;
    skillLevel: number;
    scaledValue: number;
  }> = [];
  const pending: Array<{ skillCode: string; effectType: PassiveEffectType }> = [];

  for (const ps of playerSkills) {
    if (ps.skill.type !== 'passive') continue;
    const parsed = parseEffect(ps.skill.effect);
    if (!parsed) continue;

    const scaled = scalePassiveValue(parsed.value, ps.level);

    if (ALWAYS_KIND.has(parsed.type)) {
      accumulatePassive(bag, parsed.type, scaled);
      applied.push({
        skillCode: ps.skill.code,
        effectType: parsed.type,
        rawValue: parsed.value,
        skillLevel: ps.level,
        scaledValue: scaled,
      });
    } else {
      pending.push({ skillCode: ps.skill.code, effectType: parsed.type });
    }
  }

  return { modifiers: bag, applied, pending };
}

/**
 * 베이스 stats 에 passive modifier 를 적용한 새 객체 반환.
 *
 * 적용 규칙:
 *   - mpRegenPerTurn: 별도 필드(combatEngine 이 tick 마다 가산)
 *   - evasionAddPercent: evasion 필드에 가산 (없으면 신규)
 *   - hitChanceAddPercent: hitChance 필드에 가산 (없으면 신규)
 *   - lowHpAtkBonusPercent / defenseUpConditionalPercent: 트리거형. 별도 필드로 노출.
 */
export interface BaseStats {
  atk: number;
  def: number;
  matk: number;
  mdef: number;
  spd: number;
  critRate: number;
  critDamage: number;
}

export interface AppliedStats extends BaseStats {
  evasionAddPercent: number;
  hitChanceAddPercent: number;
  mpRegenPerTurn: number;
  lowHpAtkBonusPercent: number;
  defenseUpConditionalPercent: number;
}

export function applyModifiersToStats(
  base: BaseStats,
  bag: PassiveModifierBag,
): AppliedStats {
  return {
    ...base,
    evasionAddPercent: bag.evasionAddPercent,
    hitChanceAddPercent: bag.hitChanceAddPercent,
    mpRegenPerTurn: bag.mpRegenPerTurn,
    lowHpAtkBonusPercent: bag.lowHpAtkBonusPercent,
    defenseUpConditionalPercent: bag.defenseUpConditionalPercent,
  };
}
