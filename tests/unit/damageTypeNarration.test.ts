/**
 * 유닛 테스트 — SSOT-WIRE-07: 데미지 속성(element) narration (BattleScene)
 *
 * dead code였던 SCENARIO_DAMAGE_TYPE_NARRATIVES 를 전투 데미지 팝업 속성 태그에 연결.
 * 게임 스킬 element 자유 어휘 → SSOT 6 DamageElement 매핑을 표현 레이어가 담당하고,
 * label/popupColor 는 SSOT 단일 출처를 사용한다.
 */
import { describe, expect, test } from 'vitest';

import {
  resolveDamageElement,
  getDamageTypePopupColor,
  getDamageTypeLabel,
  formatDamageTypeTag,
  GAME_ELEMENT_TO_DAMAGE_ELEMENT,
  DAMAGE_ELEMENT_EMOJI,
} from '../../client/src/combat/damageTypeNarration';
import {
  SCENARIO_DAMAGE_TYPE_NARRATIVES,
  listDamageElements,
} from '../../shared/types/scenarioRegistry';

describe('SSOT-WIRE-07: 데미지 속성 narration', () => {
  test('resolveDamageElement — SSOT 6종은 그대로 보존', () => {
    for (const el of listDamageElements()) {
      expect(resolveDamageElement(el), el).toBe(el);
    }
  });

  test('resolveDamageElement — 게임 어휘 별칭 매핑', () => {
    expect(resolveDamageElement('dark')).toBe('shadow');
    expect(resolveDamageElement('light')).toBe('holy');
    expect(resolveDamageElement('water')).toBe('ice');
    expect(resolveDamageElement('chrono')).toBe('ice');
    expect(resolveDamageElement('wind')).toBe('lightning');
  });

  test('resolveDamageElement — 미정의/무속성은 physical fallback', () => {
    expect(resolveDamageElement(undefined)).toBe('physical');
    expect(resolveDamageElement(null)).toBe('physical');
    expect(resolveDamageElement('')).toBe('physical');
    expect(resolveDamageElement('nonexistent')).toBe('physical');
    expect(resolveDamageElement('aether')).toBe('physical');
    expect(resolveDamageElement('neutral')).toBe('physical');
  });

  test('getDamageTypePopupColor — SSOT popupColor 단일 출처', () => {
    for (const n of SCENARIO_DAMAGE_TYPE_NARRATIVES) {
      expect(getDamageTypePopupColor(n.element), n.element).toBe(n.popupColor);
    }
  });

  test('getDamageTypeLabel — SSOT label 단일 출처', () => {
    for (const n of SCENARIO_DAMAGE_TYPE_NARRATIVES) {
      expect(getDamageTypeLabel(n.element), n.element).toBe(n.label);
    }
  });

  test('formatDamageTypeTag — 속성 스킬은 "{emoji} {label}"', () => {
    expect(formatDamageTypeTag('fire')).toBe('🔥 화염');
    expect(formatDamageTypeTag('ice')).toBe('❄ 얼음');
    expect(formatDamageTypeTag('lightning')).toBe('⚡ 번개');
    expect(formatDamageTypeTag('shadow')).toBe('🌑 그림자');
    expect(formatDamageTypeTag('holy')).toBe('✨ 신성');
    // 게임 어휘 별칭도 동일 태그
    expect(formatDamageTypeTag('dark')).toBe('🌑 그림자');
    expect(formatDamageTypeTag('light')).toBe('✨ 신성');
  });

  test('formatDamageTypeTag — 무속성/기본은 빈 문자열 (무가시 보존)', () => {
    expect(formatDamageTypeTag('physical')).toBe('');
    expect(formatDamageTypeTag('neutral')).toBe('');
    expect(formatDamageTypeTag('aether')).toBe('');
    expect(formatDamageTypeTag(undefined)).toBe('');
  });

  test('매핑 정합성 — 매핑 값은 전부 유효한 DamageElement', () => {
    const valid = new Set(listDamageElements());
    for (const v of Object.values(GAME_ELEMENT_TO_DAMAGE_ELEMENT)) {
      expect(valid.has(v), v).toBe(true);
    }
  });

  test('이모지 키 — SSOT 6 DamageElement 전부 정의', () => {
    for (const el of listDamageElements()) {
      expect(el in DAMAGE_ELEMENT_EMOJI, el).toBe(true);
    }
  });

  test('순수 함수 — 동일 입력 동일 출력', () => {
    expect(formatDamageTypeTag('fire')).toBe(formatDamageTypeTag('fire'));
    expect(getDamageTypePopupColor('holy')).toBe(getDamageTypePopupColor('holy'));
  });
});
