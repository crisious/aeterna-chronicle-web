/**
 * 유닛 테스트 — comboMirror (E-S3)
 *
 * 30 콤보 클라 미러 + skill → combo lookup.
 */
import { describe, expect, test } from 'vitest';
import {
  COMBO_MIRROR,
  getCombosByClass,
  getCombosUsingSkill,
} from '../../client/src/skills/comboMirror';

describe('COMBO_MIRROR — 30 콤보 정의', () => {
  test('30개', () => {
    expect(COMBO_MIRROR.length).toBe(30);
  });

  test('6 클래스 × 5', () => {
    const byClass: Record<string, number> = {};
    for (const c of COMBO_MIRROR) byClass[c.classId] = (byClass[c.classId] ?? 0) + 1;
    expect(byClass).toEqual({
      ether_knight: 5,
      memory_weaver: 5,
      shadow_weaver: 5,
      memory_breaker: 5,
      time_guardian: 5,
      void_wanderer: 5,
    });
  });

  test('id 유니크', () => {
    const ids = COMBO_MIRROR.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('triggerSkillCode = sequence[0]', () => {
    for (const c of COMBO_MIRROR) {
      expect(c.triggerSkillCode).toBe(c.sequence[0]);
    }
  });

  test('sequence 길이 ≥ 2', () => {
    for (const c of COMBO_MIRROR) {
      expect(c.sequence.length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('getCombosUsingSkill', () => {
  test('sequence 에 포함된 skill → combo 목록', () => {
    const combos = getCombosUsingSkill('ek_ether_slash');
    expect(combos.length).toBeGreaterThan(0);
    expect(combos[0].sequence).toContain('ek_ether_slash');
  });

  test('sequence 외 skill → 빈 배열', () => {
    expect(getCombosUsingSkill('unknown_skill')).toEqual([]);
  });

  test('한 skill 이 여러 콤보 참여 (예: tg_rewind)', () => {
    const combos = getCombosUsingSkill('tg_rewind');
    expect(combos.length).toBeGreaterThanOrEqual(2); // tg_rewind_chain + tg_chronos_judgment
  });
});

describe('getCombosByClass', () => {
  test('각 클래스 5 콤보', () => {
    expect(getCombosByClass('ether_knight').length).toBe(5);
    expect(getCombosByClass('void_wanderer').length).toBe(5);
  });

  test('알 수 없는 클래스 → 빈 배열', () => {
    expect(getCombosByClass('unknown')).toEqual([]);
  });
});
