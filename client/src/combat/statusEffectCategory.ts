/**
 * statusEffectCategory.ts — 상태이상 효과 → SSOT 카테고리 매핑 (SSOT wiring)
 *
 * StatusEffectRenderer 의 개별 효과(poison/burn/stun…)를 SSOT
 * SCENARIO_STATUS_EFFECT_CATEGORIES(buff/debuff/control/dot/special) 로 분류하고,
 * 카테고리별 uiColor/label 을 SSOT 단일 출처에서 가져온다.
 *
 * 순수 모듈 (Phaser/DOM 비의존) → 단위 테스트 가능.
 */
import {
  getStatusEffectCategoryNarrative,
  type StatusEffectCategory,
} from '../../../shared/types/scenarioRegistry';

/**
 * 개별 효과 ID → SSOT 카테고리.
 * SSOT description 기준:
 *  - dot: poison/burn/bleed (지속 피해)
 *  - control: stun/silence/freeze/charm (행동 제어 — 기절/속박/혼란)
 *  - debuff: slow/blind/curse (능력치 감소)
 *  - buff: attack_up/defense_up/haste/regen/shield (강화)
 */
export const EFFECT_TO_CATEGORY: Record<string, StatusEffectCategory> = {
  // dot
  poison: 'dot',
  burn: 'dot',
  bleed: 'dot',
  // control
  stun: 'control',
  silence: 'control',
  freeze: 'control',
  charm: 'control',
  // debuff
  slow: 'debuff',
  blind: 'debuff',
  curse: 'debuff',
  // buff
  attack_up: 'buff',
  defense_up: 'buff',
  haste: 'buff',
  regen: 'buff',
  shield: 'buff',
};

/** 효과의 isDebuff 플래그 기반 fallback 카테고리 (매핑 미정의 효과용) */
function fallbackCategory(isDebuff: boolean): StatusEffectCategory {
  return isDebuff ? 'debuff' : 'buff';
}

/** 효과 ID → SSOT 카테고리 (미정의 시 isDebuff 기반 fallback) */
export function resolveStatusCategory(effectId: string, isDebuff: boolean): StatusEffectCategory {
  return EFFECT_TO_CATEGORY[effectId] ?? fallbackCategory(isDebuff);
}

/** 효과 ID → 카테고리 테두리 색 (SSOT uiColor 단일 출처) */
export function getStatusCategoryColor(effectId: string, isDebuff: boolean): string {
  const category = resolveStatusCategory(effectId, isDebuff);
  return getStatusEffectCategoryNarrative(category)?.uiColor ?? '#aaaaaa';
}

/** 효과 ID → 카테고리 라벨 (SSOT label 단일 출처, 예: '강화'/'지속 피해') */
export function getStatusCategoryLabel(effectId: string, isDebuff: boolean): string {
  const category = resolveStatusCategory(effectId, isDebuff);
  return getStatusEffectCategoryNarrative(category)?.label ?? '';
}

/** 카테고리 색 hex 문자열 → Phaser 숫자 색 (0xRRGGBB) */
export function hexToPhaserColor(hex: string): number {
  return Number.parseInt(hex.replace('#', ''), 16);
}
