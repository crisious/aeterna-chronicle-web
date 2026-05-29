/**
 * 유닛 테스트 — SSOT-WIRE-05: 상태이상 효과 → 카테고리 narration (StatusEffectRenderer)
 *
 * 개별 효과(poison/burn/stun…)를 SSOT SCENARIO_STATUS_EFFECT_CATEGORIES 로 분류하고
 * 카테고리별 uiColor/label 을 SSOT 단일 출처에서 가져온다.
 */
import { describe, expect, test } from 'vitest';

import {
  resolveStatusCategory,
  getStatusCategoryColor,
  getStatusCategoryLabel,
  hexToPhaserColor,
  EFFECT_TO_CATEGORY,
} from '../../client/src/combat/statusEffectCategory';
import {
  getStatusEffectCategoryNarrative,
  type StatusEffectCategory,
} from '../../shared/types/scenarioRegistry';

describe('SSOT-WIRE-05: 상태이상 효과 카테고리 매핑', () => {
  test('resolveStatusCategory — 대표 효과가 올바른 카테고리로 분류', () => {
    expect(resolveStatusCategory('poison', true)).toBe('dot');
    expect(resolveStatusCategory('burn', true)).toBe('dot');
    expect(resolveStatusCategory('bleed', true)).toBe('dot');
    expect(resolveStatusCategory('stun', true)).toBe('control');
    expect(resolveStatusCategory('freeze', true)).toBe('control');
    expect(resolveStatusCategory('slow', true)).toBe('debuff');
    expect(resolveStatusCategory('curse', true)).toBe('debuff');
    expect(resolveStatusCategory('attack_up', false)).toBe('buff');
    expect(resolveStatusCategory('shield', false)).toBe('buff');
  });

  test('resolveStatusCategory — 미정의 효과는 isDebuff 기반 fallback', () => {
    expect(resolveStatusCategory('unknown_fx', true)).toBe('debuff');
    expect(resolveStatusCategory('unknown_fx', false)).toBe('buff');
  });

  test('getStatusCategoryColor — SSOT uiColor 단일 출처', () => {
    for (const [effectId, category] of Object.entries(EFFECT_TO_CATEGORY)) {
      const ssot = getStatusEffectCategoryNarrative(category as StatusEffectCategory)!;
      expect(getStatusCategoryColor(effectId, false), effectId).toBe(ssot.uiColor);
    }
  });

  test('getStatusCategoryLabel — SSOT label 단일 출처 (색이 아닌 라벨)', () => {
    // 회귀 가드: label 함수가 실수로 uiColor 를 반환하지 않아야 한다
    expect(getStatusCategoryLabel('poison', true)).toBe('지속 피해');
    expect(getStatusCategoryLabel('stun', true)).toBe('행동 제어');
    expect(getStatusCategoryLabel('slow', true)).toBe('약화');
    expect(getStatusCategoryLabel('attack_up', false)).toBe('강화');
    // label 은 # 으로 시작하지 않는다 (색 hex 가 아님)
    expect(getStatusCategoryLabel('poison', true).startsWith('#')).toBe(false);
  });

  test('getStatusCategoryColor — 모든 결과는 유효 hex', () => {
    for (const effectId of Object.keys(EFFECT_TO_CATEGORY)) {
      expect(getStatusCategoryColor(effectId, false), effectId).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  test('hexToPhaserColor — #rrggbb → 0xRRGGBB 숫자', () => {
    expect(hexToPhaserColor('#60c060')).toBe(0x60c060);
    expect(hexToPhaserColor('#ffffff')).toBe(0xffffff);
    expect(hexToPhaserColor('#000000')).toBe(0x000000);
  });

  test('EFFECT_TO_CATEGORY — 15개 효과 모두 유효 카테고리', () => {
    const valid: readonly StatusEffectCategory[] = ['buff', 'debuff', 'control', 'dot', 'special'];
    const keys = Object.keys(EFFECT_TO_CATEGORY);
    expect(keys.length).toBe(15);
    for (const [, cat] of Object.entries(EFFECT_TO_CATEGORY)) {
      expect(valid).toContain(cat);
    }
  });
});
