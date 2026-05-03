/**
 * 유닛 테스트 — passiveEffectFormatter (Phase 55-S4 / B)
 *
 * 18종 effect 의 한국어 변환 + status 분류 + scaling 적용.
 */
import { describe, expect, test } from 'vitest';
import {
  formatPassiveEffect,
  IMPLEMENTED_EFFECT_TYPES,
  PENDING_EFFECT_TYPES,
  STATUS_COLOR,
} from '../../client/src/skills/passiveEffectFormatter';

describe('formatPassiveEffect — 9 구현 effect', () => {
  test('mp_regen', () => {
    const r = formatPassiveEffect('mp_regen', 5);
    expect(r.text).toBe('매 턴 MP +5 회복');
    expect(r.status).toBe('implemented');
  });

  test('mp_regen 레벨 5 — scaled 7', () => {
    const r = formatPassiveEffect('mp_regen', 5, 5);
    expect(r.text).toBe('매 턴 MP +7 회복');
    expect(r.status).toBe('implemented');
  });

  test('evasion_up 레벨 1', () => {
    expect(formatPassiveEffect('evasion_up', 15, 1).text).toBe('회피율 +15%');
  });

  test('bonus_hit_chance 레벨 3 — scaled +18%', () => {
    // 5 * 1.18 = 5.9 → 5
    expect(formatPassiveEffect('bonus_hit_chance', 5, 3).text).toBe('명중률 +5%');
  });

  test('low_hp_atk_up', () => {
    expect(formatPassiveEffect('low_hp_atk_up', 80, 1).text).toBe('HP 30% 미만 시 공격력 +80%');
  });

  test('defense_up_conditional', () => {
    expect(formatPassiveEffect('defense_up_conditional', 100, 1).text).toBe('피격 시 방어력 +100%');
  });

  test('reflect', () => {
    expect(formatPassiveEffect('reflect', 20, 1).text).toBe('물리 피격 시 20% 데미지 반사');
  });

  test('projectile_reflect', () => {
    expect(formatPassiveEffect('projectile_reflect', 20, 1).text).toBe('마법 피격 시 20% 데미지 반사');
  });

  test('battle_regen', () => {
    expect(formatPassiveEffect('battle_regen', 10, 1).text).toBe('매 턴 HP +10 회복');
  });

  test('cheat_death', () => {
    expect(formatPassiveEffect('cheat_death', 1, 1).text).toBe('사망 시 1회 1HP 로 생존');
  });
});

describe('formatPassiveEffect — 14 구현 effect (S1+S2+S3+S5+S6+S7+P56-S3)', () => {
  test('crit_echo (P55-S5)', () => {
    const r = formatPassiveEffect('crit_echo', 30, 1);
    expect(r.status).toBe('implemented');
    expect(r.text).toBe('크리티컬 시 추가 데미지 +30%');
  });

  test('move_damage_aura (P55-S5)', () => {
    const r = formatPassiveEffect('move_damage_aura', 15, 1);
    expect(r.status).toBe('implemented');
    expect(r.text).toBe('매 턴 적군 전체에 15 데미지');
  });

  test('auto_resurrect (P55-S6)', () => {
    const r = formatPassiveEffect('auto_resurrect', 100, 1);
    expect(r.status).toBe('implemented');
    expect(r.text).toBe('사망 시 100% HP 로 부활');
  });

  test('poison_amplify (P55-S7)', () => {
    const r = formatPassiveEffect('poison_amplify', 100, 1);
    expect(r.status).toBe('implemented');
    expect(r.text).toBe('시전자 DoT 데미지 +100%');
  });

  test('drain_amplify (P56-S3)', () => {
    const r = formatPassiveEffect('drain_amplify', 50, 1);
    expect(r.status).toBe('implemented');
    expect(r.text).toBe('흡수(lifesteal) 회복 +50%');
  });
});

describe('formatPassiveEffect — 미인식', () => {
  test('unknown type → status unknown', () => {
    const r = formatPassiveEffect('warp_speed', 99, 1);
    expect(r.status).toBe('unknown');
    expect(r.text).toContain('warp_speed');
    expect(r.text).toContain('99');
  });
});

describe('상수 검증', () => {
  test('IMPLEMENTED_EFFECT_TYPES 14개 — 모두 구현됨 (P56-S3 후)', () => {
    expect(IMPLEMENTED_EFFECT_TYPES.length).toBe(14);
  });

  test('PENDING_EFFECT_TYPES 0개 — 잔여 stub 없음', () => {
    expect(PENDING_EFFECT_TYPES.length).toBe(0);
  });

  test('두 배열 합 = 14 (skillSeeds 14 distinct effect type)', () => {
    expect(IMPLEMENTED_EFFECT_TYPES.length + PENDING_EFFECT_TYPES.length).toBe(14);
  });

  test('STATUS_COLOR 3 키 모두 정의', () => {
    expect(STATUS_COLOR.implemented).toBeTruthy();
    expect(STATUS_COLOR.pending).toBeTruthy();
    expect(STATUS_COLOR.unknown).toBeTruthy();
  });
});
