/**
 * 유닛 테스트 — SYNC-139: SCENARIO_DAMAGE_TYPE_NARRATIVES SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_DAMAGE_TYPE_NARRATIVES,
  getDamageTypeNarrative,
  listDamageElements,
  type DamageElement,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly DamageElement[] = ['physical', 'fire', 'ice', 'lightning', 'shadow', 'holy'];

describe('SCENARIO_DAMAGE_TYPE_NARRATIVES', () => {
  test('6 element 모두 정의', () => {
    expect(SCENARIO_DAMAGE_TYPE_NARRATIVES.length).toBe(6);
    for (const e of ALL) {
      expect(getDamageTypeNarrative(e), e).toBeDefined();
    }
  });

  test('popupColor 는 #rrggbb 형식', () => {
    const hex = /^#[0-9a-fA-F]{6}$/;
    for (const d of SCENARIO_DAMAGE_TYPE_NARRATIVES) {
      expect(hex.test(d.popupColor), `${d.element}:${d.popupColor}`).toBe(true);
    }
  });

  test('label/strongAgainst/flavor 비어 있지 않음', () => {
    for (const d of SCENARIO_DAMAGE_TYPE_NARRATIVES) {
      expect(d.label.trim(), d.element).not.toBe('');
      expect(d.strongAgainst.trim(), d.element).not.toBe('');
      expect(d.flavor.trim(), d.element).not.toBe('');
    }
  });

  test('element 중복 없음', () => {
    const els = SCENARIO_DAMAGE_TYPE_NARRATIVES.map((d) => d.element);
    expect(new Set(els).size).toBe(els.length);
  });

  test('listDamageElements 는 6 element', () => {
    expect(listDamageElements()).toEqual(ALL);
  });
});
