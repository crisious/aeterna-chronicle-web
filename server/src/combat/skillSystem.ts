// ─── 스킬 쿨다운 + 마나 시스템 (P24-12/13/14) ─────────────────
// 틱 기반 쿨다운, 마나 소모/회복, 6클래스 스킬 통합

import { prisma } from '../db';
import type { DamageType, ElementType } from './damageCalculator';

// ─── 스킬 정의 ─────────────────────────────────────────────────

export interface SkillDefinition {
  id: string;
  name: string;
  classId: string;
  /** 데미지 타입 */
  damageType: DamageType;
  /** 속성 */
  element: ElementType;
  /** 데미지 배율 */
  damageMultiplier: number;
  /** 마나 소모 */
  manaCost: number;
  /** 쿨다운 (틱) */
  cooldownTicks: number;
  /** 대상 수 (1=단일, -1=전체) */
  targetCount: number;
  /** 요구 레벨 */
  requiredLevel: number;
  /** 부여 상태이상 */
  statusEffect?: string;
  /** 상태이상 확률 (%) */
  statusEffectChance?: number;
  /** 스킬 설명 */
  description: string;
}

// ─── 6클래스 기본 스킬 데이터 ──────────────────────────────────

const SKILL_DATABASE: SkillDefinition[] = [
  // ═══ 에테르 기사 (ether_knight) ═══
  { id: 'ek_slash', name: '에테르 참격', classId: 'ether_knight', damageType: 'physical', element: 'light', damageMultiplier: 1.5, manaCost: 15, cooldownTicks: 2, targetCount: 1, requiredLevel: 1, description: '에테르 에너지를 담은 강력한 참격' },
  { id: 'ek_shield_bash', name: '방패 강타', classId: 'ether_knight', damageType: 'physical', element: 'neutral', damageMultiplier: 1.2, manaCost: 10, cooldownTicks: 1, targetCount: 1, requiredLevel: 5, statusEffect: 'stun', statusEffectChance: 30, description: '방패로 적을 강타하여 기절시킨다' },
  { id: 'ek_holy_strike', name: '성스러운 일격', classId: 'ether_knight', damageType: 'magical', element: 'light', damageMultiplier: 2.0, manaCost: 30, cooldownTicks: 4, targetCount: 1, requiredLevel: 15, description: '성스러운 빛으로 적을 강타' },
  { id: 'ek_taunt', name: '도발', classId: 'ether_knight', damageType: 'physical', element: 'neutral', damageMultiplier: 0.5, manaCost: 20, cooldownTicks: 5, targetCount: -1, requiredLevel: 10, description: '모든 적의 어그로를 자신에게 집중' },
  { id: 'ek_divine_judgment', name: '신성 심판', classId: 'ether_knight', damageType: 'magical', element: 'light', damageMultiplier: 3.0, manaCost: 50, cooldownTicks: 8, targetCount: -1, requiredLevel: 30, description: '신성한 빛의 심판을 내린다' },

  // ═══ 기억 직조사 (memory_weaver) ═══
  { id: 'mw_memory_bolt', name: '기억 화살', classId: 'memory_weaver', damageType: 'magical', element: 'neutral', damageMultiplier: 1.6, manaCost: 12, cooldownTicks: 1, targetCount: 1, requiredLevel: 1, description: '기억의 파편을 투사체로 발사' },
  { id: 'mw_time_freeze', name: '시간 동결', classId: 'memory_weaver', damageType: 'magical', element: 'water', damageMultiplier: 1.0, manaCost: 25, cooldownTicks: 5, targetCount: 1, requiredLevel: 10, statusEffect: 'freeze', statusEffectChance: 60, description: '시간을 멈추어 적을 동결' },
  { id: 'mw_heal', name: '기억 치유', classId: 'memory_weaver', damageType: 'magical', element: 'light', damageMultiplier: -1.5, manaCost: 20, cooldownTicks: 3, targetCount: 1, requiredLevel: 5, description: '아군의 상처를 기억으로 복원' },
  { id: 'mw_chronosphere', name: '크로노스피어', classId: 'memory_weaver', damageType: 'magical', element: 'neutral', damageMultiplier: 2.5, manaCost: 40, cooldownTicks: 6, targetCount: -1, requiredLevel: 20, description: '시공간을 왜곡하여 광역 피해' },
  { id: 'mw_eternity_weave', name: '영원의 직조', classId: 'memory_weaver', damageType: 'magical', element: 'light', damageMultiplier: 4.0, manaCost: 60, cooldownTicks: 10, targetCount: 1, requiredLevel: 35, description: '영원의 시간을 직조하여 적을 소멸' },

  // ═══ 그림자 직조사 (shadow_weaver) ═══
  { id: 'sw_shadow_strike', name: '그림자 습격', classId: 'shadow_weaver', damageType: 'physical', element: 'dark', damageMultiplier: 1.8, manaCost: 14, cooldownTicks: 1, targetCount: 1, requiredLevel: 1, description: '그림자에서 기습 공격' },
  { id: 'sw_poison_blade', name: '독날', classId: 'shadow_weaver', damageType: 'physical', element: 'dark', damageMultiplier: 1.3, manaCost: 18, cooldownTicks: 2, targetCount: 1, requiredLevel: 8, statusEffect: 'poison', statusEffectChance: 70, description: '독이 묻은 단검으로 베기' },
  { id: 'sw_vanish', name: '소멸', classId: 'shadow_weaver', damageType: 'physical', element: 'dark', damageMultiplier: 0, manaCost: 25, cooldownTicks: 6, targetCount: 1, requiredLevel: 15, description: '그림자 속으로 사라져 다음 공격 크리티컬' },
  { id: 'sw_shadow_dance', name: '그림자 춤', classId: 'shadow_weaver', damageType: 'physical', element: 'dark', damageMultiplier: 2.0, manaCost: 35, cooldownTicks: 4, targetCount: 3, requiredLevel: 20, description: '그림자 분신으로 다수 공격' },
  { id: 'sw_void_execution', name: '공허 처형', classId: 'shadow_weaver', damageType: 'physical', element: 'dark', damageMultiplier: 3.5, manaCost: 50, cooldownTicks: 8, targetCount: 1, requiredLevel: 30, description: 'HP가 낮을수록 데미지 증가' },

  // ═══ 기억 파괴자 (memory_breaker) ═══
  { id: 'mb_shatter', name: '기억 파쇄', classId: 'memory_breaker', damageType: 'physical', element: 'neutral', damageMultiplier: 1.7, manaCost: 16, cooldownTicks: 2, targetCount: 1, requiredLevel: 1, description: '적의 기억을 파괴하는 일격' },
  { id: 'mb_mind_crush', name: '정신 분쇄', classId: 'memory_breaker', damageType: 'magical', element: 'dark', damageMultiplier: 2.0, manaCost: 25, cooldownTicks: 3, targetCount: 1, requiredLevel: 10, statusEffect: 'silence', statusEffectChance: 50, description: '정신을 공격하여 침묵' },
  { id: 'mb_berserk', name: '광전사', classId: 'memory_breaker', damageType: 'physical', element: 'neutral', damageMultiplier: 0, manaCost: 30, cooldownTicks: 8, targetCount: 1, requiredLevel: 15, description: '자신의 ATK 50% 증가, DEF 30% 감소' },
  { id: 'mb_earthquake', name: '지진', classId: 'memory_breaker', damageType: 'physical', element: 'earth', damageMultiplier: 2.2, manaCost: 35, cooldownTicks: 5, targetCount: -1, requiredLevel: 20, description: '대지를 흔들어 전체 공격' },
  { id: 'mb_oblivion', name: '망각의 일격', classId: 'memory_breaker', damageType: 'physical', element: 'dark', damageMultiplier: 4.0, manaCost: 55, cooldownTicks: 10, targetCount: 1, requiredLevel: 35, description: '적의 존재 자체를 기억에서 지운다' },

  // ═══ 시간 수호자 (time_guardian) ═══
  { id: 'tg_time_shield', name: '시간의 방벽', classId: 'time_guardian', damageType: 'magical', element: 'neutral', damageMultiplier: 0, manaCost: 20, cooldownTicks: 4, targetCount: 1, requiredLevel: 1, description: '시간의 방벽으로 아군 보호' },
  { id: 'tg_slow_field', name: '감속장', classId: 'time_guardian', damageType: 'magical', element: 'neutral', damageMultiplier: 0.8, manaCost: 18, cooldownTicks: 3, targetCount: -1, requiredLevel: 8, statusEffect: 'slow', statusEffectChance: 80, description: '시간을 느리게 하여 적 감속' },
  { id: 'tg_time_heal', name: '시간 역행 치유', classId: 'time_guardian', damageType: 'magical', element: 'light', damageMultiplier: -2.0, manaCost: 30, cooldownTicks: 4, targetCount: 1, requiredLevel: 12, description: '시간을 되돌려 아군의 상처 치유' },
  { id: 'tg_temporal_lock', name: '시간 감금', classId: 'time_guardian', damageType: 'magical', element: 'neutral', damageMultiplier: 1.5, manaCost: 35, cooldownTicks: 6, targetCount: 1, requiredLevel: 20, statusEffect: 'stun', statusEffectChance: 90, description: '적을 시간의 감옥에 가둔다' },
  { id: 'tg_chronostasis', name: '크로노스타시스', classId: 'time_guardian', damageType: 'magical', element: 'light', damageMultiplier: -3.0, manaCost: 50, cooldownTicks: 10, targetCount: -1, requiredLevel: 30, description: '시간을 멈추고 전체 아군 치유' },

  // ═══ 공허 방랑자 (void_wanderer) ═══
  { id: 'vw_void_bolt', name: '공허 화살', classId: 'void_wanderer', damageType: 'magical', element: 'dark', damageMultiplier: 1.6, manaCost: 14, cooldownTicks: 1, targetCount: 1, requiredLevel: 1, description: '공허의 에너지를 투사' },
  { id: 'vw_dimension_rift', name: '차원 균열', classId: 'void_wanderer', damageType: 'magical', element: 'dark', damageMultiplier: 2.0, manaCost: 25, cooldownTicks: 3, targetCount: 3, requiredLevel: 10, description: '차원을 갈라 복수 대상 공격' },
  { id: 'vw_teleport', name: '공간 이동', classId: 'void_wanderer', damageType: 'magical', element: 'neutral', damageMultiplier: 0, manaCost: 20, cooldownTicks: 5, targetCount: 1, requiredLevel: 8, description: '공간을 이동하여 회피율 증가' },
  { id: 'vw_entropy', name: '엔트로피', classId: 'void_wanderer', damageType: 'magical', element: 'dark', damageMultiplier: 2.5, manaCost: 40, cooldownTicks: 5, targetCount: -1, requiredLevel: 20, statusEffect: 'curse', statusEffectChance: 40, description: '엔트로피를 증가시켜 전체 저주' },
  { id: 'vw_void_collapse', name: '공허 붕괴', classId: 'void_wanderer', damageType: 'magical', element: 'dark', damageMultiplier: 4.5, manaCost: 60, cooldownTicks: 10, targetCount: 1, requiredLevel: 35, description: '공허를 붕괴시켜 최대 데미지' },
];

// ─── 스킬 조회 ─────────────────────────────────────────────────

/** 클래스별 스킬 목록 반환 */
export function getSkillsByClass(classId: string): SkillDefinition[] {
  return SKILL_DATABASE.filter(s => s.classId === classId);
}

/** 스킬 ID로 조회 */
export function getSkillById(skillId: string): SkillDefinition | undefined {
  return SKILL_DATABASE.find(s => s.id === skillId);
}

/** 레벨에서 사용 가능한 스킬 */
export function getAvailableSkills(classId: string, level: number): SkillDefinition[] {
  return SKILL_DATABASE.filter(s => s.classId === classId && s.requiredLevel <= level);
}

// ─── 쿨다운 매니저 ─────────────────────────────────────────────

export class SkillCooldownManager {
  /** characterId → skillId → 남은 틱 */
  private cooldowns = new Map<string, Map<string, number>>();

  /** 스킬 사용 (쿨다운 설정) */
  useSkill(characterId: string, skillId: string): boolean {
    const skill = getSkillById(skillId);
    if (!skill) return false;

    if (!this.cooldowns.has(characterId)) {
      this.cooldowns.set(characterId, new Map());
    }
    const charCd = this.cooldowns.get(characterId)!;

    if ((charCd.get(skillId) ?? 0) > 0) return false; // 쿨다운 중

    charCd.set(skillId, skill.cooldownTicks);
    return true;
  }

  /** 쿨다운 확인 */
  isReady(characterId: string, skillId: string): boolean {
    return (this.cooldowns.get(characterId)?.get(skillId) ?? 0) <= 0;
  }

  /** 남은 쿨다운 틱 */
  getRemainingCooldown(characterId: string, skillId: string): number {
    return this.cooldowns.get(characterId)?.get(skillId) ?? 0;
  }

  /** 틱 처리 (전체 쿨다운 감소) */
  tick(): void {
    for (const [_charId, skills] of this.cooldowns) {
      for (const [skillId, remaining] of skills) {
        if (remaining <= 1) skills.delete(skillId);
        else skills.set(skillId, remaining - 1);
      }
    }
  }

  /** 캐릭터 제거 */
  removeCharacter(characterId: string): void {
    this.cooldowns.delete(characterId);
  }

  /** 전체 초기화 */
  clear(): void {
    this.cooldowns.clear();
  }
}

// ─── 마나 매니저 ───────────────────────────────────────────────

/** 마나 자연 회복 비율 (틱당 maxMp의 %) */
const MANA_REGEN_PERCENT = 1;

export class ManaManager {
  /** characterId → { current, max } */
  private mana = new Map<string, { current: number; max: number }>();

  /** 초기화 */
  init(characterId: string, currentMp: number, maxMp: number): void {
    this.mana.set(characterId, { current: currentMp, max: maxMp });
  }

  /** 마나 소모 (성공 여부 반환) */
  consume(characterId: string, amount: number): boolean {
    const mp = this.mana.get(characterId);
    if (!mp || mp.current < amount) return false;
    mp.current -= amount;
    return true;
  }

  /** 마나 회복 */
  restore(characterId: string, amount: number): void {
    const mp = this.mana.get(characterId);
    if (!mp) return;
    mp.current = Math.min(mp.max, mp.current + amount);
  }

  /** 자연 회복 (틱마다 호출) */
  tickRegen(): void {
    for (const [_id, mp] of this.mana) {
      const regen = Math.floor(mp.max * MANA_REGEN_PERCENT / 100);
      mp.current = Math.min(mp.max, mp.current + regen);
    }
  }

  /** 현재 마나 조회 */
  getCurrent(characterId: string): number {
    return this.mana.get(characterId)?.current ?? 0;
  }

  /** 최대 마나 조회 */
  getMax(characterId: string): number {
    return this.mana.get(characterId)?.max ?? 0;
  }

  /** 마나 충분 여부 */
  hasEnough(characterId: string, cost: number): boolean {
    return this.getCurrent(characterId) >= cost;
  }

  /** 캐릭터 제거 */
  removeCharacter(characterId: string): void {
    this.mana.delete(characterId);
  }

  /** 전체 초기화 */
  clear(): void {
    this.mana.clear();
  }
}

// ─── DB 연동 (Prisma Skill 모델) ──────────────────────────────

/**
 * DB에서 캐릭터의 보유 스킬 조회
 */
export async function loadPlayerSkills(characterId: string): Promise<SkillDefinition[]> {
  const playerSkills = await prisma.playerSkill.findMany({
    where: { characterId },
    include: { skill: true },
  });

  return playerSkills
    .map(ps => getSkillById(ps.skill.id))
    .filter((s): s is SkillDefinition => s !== undefined);
}
