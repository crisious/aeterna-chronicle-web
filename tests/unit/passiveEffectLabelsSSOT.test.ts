/**
 * 유닛 테스트 — SYNC-154: SCENARIO_PASSIVE_EFFECT_LABELS SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_PASSIVE_EFFECT_LABELS,
  getPassiveEffectLabel,
  listPassiveEffectsByClassification,
  type PassiveEffectType,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly PassiveEffectType[] = [
  'mp_regen', 'evasion_up', 'bonus_hit_chance', 'low_hp_atk_up', 'defense_up_conditional',
  'reflect', 'projectile_reflect', 'cheat_death', 'battle_regen',
  'crit_echo', 'move_damage_aura', 'auto_resurrect', 'poison_amplify', 'drain_amplify',
];

describe('SCENARIO_PASSIVE_EFFECT_LABELS', () => {
  test('14 effect type 모두 정의', () => {
    expect(SCENARIO_PASSIVE_EFFECT_LABELS.length).toBe(14);
    for (const e of ALL) {
      expect(getPassiveEffectLabel(e), e).toBeDefined();
    }
  });

  test('classification 분류 합산은 전체와 일치', () => {
    const total =
      listPassiveEffectsByClassification('constant').length +
      listPassiveEffectsByClassification('trigger').length +
      listPassiveEffectsByClassification('amplify').length;
    expect(total).toBe(SCENARIO_PASSIVE_EFFECT_LABELS.length);
  });

  test('label/description 비어 있지 않음', () => {
    for (const p of SCENARIO_PASSIVE_EFFECT_LABELS) {
      expect(p.label.trim(), p.effectType).not.toBe('');
      expect(p.description.trim(), p.effectType).not.toBe('');
    }
  });

  test('effectType 중복 없음', () => {
    const ts = SCENARIO_PASSIVE_EFFECT_LABELS.map((p) => p.effectType);
    expect(new Set(ts).size).toBe(ts.length);
  });

  test('classification 은 3종 enum 안에 든다', () => {
    const valid = ['constant', 'trigger', 'amplify'];
    for (const p of SCENARIO_PASSIVE_EFFECT_LABELS) {
      expect(valid, p.effectType).toContain(p.classification);
    }
  });
});
