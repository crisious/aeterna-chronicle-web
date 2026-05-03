/**
 * 유닛 테스트 — passiveResolver (Phase 55-S1)
 *
 * 18종 effect type 중 5종(상시) 누적/스케일링 + 13종 stub pending 분류 회귀.
 */
import { beforeEach, describe, expect, test, vi } from 'vitest';

// Mock prisma BEFORE imports
vi.mock('../../server/src/db', () => ({
  prisma: {
    playerSkill: { findMany: vi.fn() },
  },
}));

// Import AFTER mock
import { prisma } from '../../server/src/db';
import {
  accumulatePassive,
  applyModifiersToStats,
  emptyModifierBag,
  resolvePassiveModifiers,
  scalePassiveValue,
  type PassiveEffectType,
} from '../../server/src/skill/passiveResolver';

const findManyMock = prisma.playerSkill.findMany as unknown as ReturnType<typeof vi.fn>;

// ─── helpers ───────────────────────────────────────────────────

function makePlayerSkill(opts: {
  code: string;
  type: 'active' | 'passive' | 'ultimate';
  effectType?: PassiveEffectType;
  value?: number;
  level?: number;
  isEquipped?: boolean;
}) {
  return {
    id: `ps_${opts.code}`,
    userId: 'user1',
    characterId: 'char1',
    skillId: `sk_${opts.code}`,
    level: opts.level ?? 1,
    isEquipped: opts.isEquipped ?? true,
    slotIndex: 0,
    unlockedAt: new Date(),
    skill: {
      id: `sk_${opts.code}`,
      code: opts.code,
      name: opts.code,
      description: '',
      class: 'ether_knight',
      tier: 1,
      type: opts.type,
      element: 'aether',
      damage: 0,
      damageScale: 0,
      mpCost: 0,
      cooldown: 0,
      castTime: 0,
      range: 0,
      targetType: 'self',
      aoeRadius: null,
      effect:
        opts.effectType !== undefined
          ? { type: opts.effectType, duration: 0, value: opts.value ?? 0 }
          : null,
      maxLevel: 5,
      levelScaling: [],
      prerequisites: [],
      requiredLevel: 1,
    },
  };
}

beforeEach(() => {
  findManyMock.mockReset();
});

// ─── scaling ───────────────────────────────────────────────────

describe('scalePassiveValue', () => {
  test('레벨 1 = raw 그대로', () => {
    expect(scalePassiveValue(10, 1)).toBe(10);
  });

  test('레벨 2 = +8% (floor)', () => {
    expect(scalePassiveValue(10, 2)).toBe(10); // 10 * 1.08 = 10.8 → 10
    expect(scalePassiveValue(100, 2)).toBe(108);
  });

  test('레벨 5 = +45%', () => {
    expect(scalePassiveValue(10, 5)).toBe(14); // 10 * 1.45 = 14.5 → 14
    expect(scalePassiveValue(20, 5)).toBe(29);
  });

  test('범위 외 입력은 1~5 로 clamp', () => {
    expect(scalePassiveValue(10, 0)).toBe(10);
    expect(scalePassiveValue(10, -1)).toBe(10);
    expect(scalePassiveValue(10, 99)).toBe(14);
  });
});

// ─── accumulate ────────────────────────────────────────────────

describe('accumulatePassive', () => {
  test('상시 5종 — 각 필드에 누적', () => {
    const bag = emptyModifierBag();
    accumulatePassive(bag, 'mp_regen', 5);
    accumulatePassive(bag, 'evasion_up', 15);
    accumulatePassive(bag, 'bonus_hit_chance', 5);
    accumulatePassive(bag, 'low_hp_atk_up', 80);
    accumulatePassive(bag, 'defense_up_conditional', 100);

    expect(bag.mpRegenPerTurn).toBe(5);
    expect(bag.evasionAddPercent).toBe(15);
    expect(bag.hitChanceAddPercent).toBe(5);
    expect(bag.lowHpAtkBonusPercent).toBe(80);
    expect(bag.defenseUpConditionalPercent).toBe(100);
  });

  test('동일 type 누적', () => {
    const bag = emptyModifierBag();
    accumulatePassive(bag, 'mp_regen', 5);
    accumulatePassive(bag, 'mp_regen', 8);
    expect(bag.mpRegenPerTurn).toBe(13);
  });

  test('Phase 3 — 트리거 4종 누적', () => {
    const bag = emptyModifierBag();
    accumulatePassive(bag, 'reflect', 20);
    accumulatePassive(bag, 'projectile_reflect', 20);
    accumulatePassive(bag, 'battle_regen', 10);
    accumulatePassive(bag, 'cheat_death', 1);
    expect(bag.reflectPercent).toBe(20);
    expect(bag.projectileReflectPercent).toBe(20);
    expect(bag.hpRegenPerTurn).toBe(10);
    expect(bag.cheatDeathChargesMax).toBe(1);
  });

  test('Phase 4 부분 — crit_echo / move_damage_aura 누적', () => {
    const bag = emptyModifierBag();
    accumulatePassive(bag, 'crit_echo', 30);
    accumulatePassive(bag, 'move_damage_aura', 15);
    expect(bag.critEchoPercent).toBe(30);
    expect(bag.moveDamageAuraValue).toBe(15);
  });

  test('poison_amplify 는 누적 (P55-S7)', () => {
    const bag = emptyModifierBag();
    accumulatePassive(bag, 'poison_amplify', 100);
    accumulatePassive(bag, 'poison_amplify', 50);
    expect(bag.poisonAmplifyPercent).toBe(150);
  });

  test('drain_amplify 누적 (P56-S3)', () => {
    const bag = emptyModifierBag();
    accumulatePassive(bag, 'drain_amplify', 50);
    accumulatePassive(bag, 'drain_amplify', 25);
    expect(bag.drainAmplifyPercent).toBe(75);
  });
});

// ─── resolvePassiveModifiers ───────────────────────────────────

describe('resolvePassiveModifiers', () => {
  test('장착 패시브 없음 → empty bag', async () => {
    findManyMock.mockResolvedValue([]);
    const result = await resolvePassiveModifiers('char1');
    expect(result.modifiers).toEqual(emptyModifierBag());
    expect(result.applied).toHaveLength(0);
    expect(result.pending).toHaveLength(0);
  });

  test('active 스킬은 무시', async () => {
    findManyMock.mockResolvedValue([
      makePlayerSkill({ code: 'ek_slash', type: 'active', effectType: 'mp_regen', value: 5 }),
    ]);
    const result = await resolvePassiveModifiers('char1');
    expect(result.modifiers.mpRegenPerTurn).toBe(0);
    expect(result.applied).toHaveLength(0);
  });

  test('단일 패시브 — mp_regen 레벨 5', async () => {
    findManyMock.mockResolvedValue([
      makePlayerSkill({ code: 'ek_ether_charge', type: 'passive', effectType: 'mp_regen', value: 5, level: 5 }),
    ]);
    const result = await resolvePassiveModifiers('char1');
    expect(result.modifiers.mpRegenPerTurn).toBe(7); // 5 * 1.45 = 7.25 → 7
    expect(result.applied).toHaveLength(1);
    expect(result.applied[0]).toMatchObject({
      skillCode: 'ek_ether_charge',
      effectType: 'mp_regen',
      rawValue: 5,
      skillLevel: 5,
      scaledValue: 7,
    });
  });

  test('다중 패시브 누적 — evasion + hit + low_hp_atk', async () => {
    findManyMock.mockResolvedValue([
      makePlayerSkill({ code: 'sw_evasion', type: 'passive', effectType: 'evasion_up', value: 15, level: 1 }),
      makePlayerSkill({ code: 'mb_hit', type: 'passive', effectType: 'bonus_hit_chance', value: 5, level: 1 }),
      makePlayerSkill({ code: 'mb_low_hp', type: 'passive', effectType: 'low_hp_atk_up', value: 80, level: 1 }),
    ]);
    const result = await resolvePassiveModifiers('char1');
    expect(result.modifiers.evasionAddPercent).toBe(15);
    expect(result.modifiers.hitChanceAddPercent).toBe(5);
    expect(result.modifiers.lowHpAtkBonusPercent).toBe(80);
    expect(result.applied).toHaveLength(3);
  });

  test('Phase 1+3 effect 는 모두 applied — pending 빈 배열', async () => {
    findManyMock.mockResolvedValue([
      makePlayerSkill({ code: 'ek_counter', type: 'passive', effectType: 'reflect', value: 20, level: 1 }),
      makePlayerSkill({ code: 'ek_indomitable', type: 'passive', effectType: 'cheat_death', value: 1, level: 1 }),
      makePlayerSkill({ code: 'ek_ether_charge', type: 'passive', effectType: 'mp_regen', value: 5, level: 1 }),
    ]);
    const result = await resolvePassiveModifiers('char1');
    expect(result.applied).toHaveLength(3);
    expect(result.pending).toHaveLength(0);
    expect(result.modifiers.mpRegenPerTurn).toBe(5);
    expect(result.modifiers.reflectPercent).toBe(20);
    expect(result.modifiers.cheatDeathChargesMax).toBe(1);
  });

  test('14 effect 모두 구현됨 — pending 0 (P56-S3 후)', async () => {
    findManyMock.mockResolvedValue([
      makePlayerSkill({ code: 'sw_poison_amp', type: 'passive', effectType: 'poison_amplify', value: 100, level: 1 }),
      makePlayerSkill({ code: 'mb_drain_amp', type: 'passive', effectType: 'drain_amplify', value: 50, level: 1 }),
      makePlayerSkill({ code: 'sw_crit_echo', type: 'passive', effectType: 'crit_echo', value: 30, level: 1 }),
      makePlayerSkill({ code: 'ek_ether_charge', type: 'passive', effectType: 'mp_regen', value: 5, level: 1 }),
    ]);
    const result = await resolvePassiveModifiers('char1');
    expect(result.applied).toHaveLength(4);
    expect(result.pending).toHaveLength(0);
    expect(result.modifiers.mpRegenPerTurn).toBe(5);
    expect(result.modifiers.critEchoPercent).toBe(30);
    expect(result.modifiers.poisonAmplifyPercent).toBe(100);
    expect(result.modifiers.drainAmplifyPercent).toBe(50);
  });

  test('auto_resurrect — duration + value 두 필드 추출 + charges 누적', async () => {
    findManyMock.mockResolvedValue([
      // mw: duration=30, value=100 (lv1)
      {
        ...makePlayerSkill({ code: 'mw_resurrect', type: 'passive', effectType: 'auto_resurrect', value: 100, level: 1 }),
        skill: {
          ...makePlayerSkill({ code: 'mw_resurrect', type: 'passive', effectType: 'auto_resurrect', value: 100, level: 1 }).skill,
          effect: { type: 'auto_resurrect', duration: 30, value: 100 },
        },
      },
      // tg: duration=0, value=100 (lv1)
      {
        ...makePlayerSkill({ code: 'tg_eternal', type: 'passive', effectType: 'auto_resurrect', value: 100, level: 1 }),
        skill: {
          ...makePlayerSkill({ code: 'tg_eternal', type: 'passive', effectType: 'auto_resurrect', value: 100, level: 1 }).skill,
          effect: { type: 'auto_resurrect', duration: 0, value: 100 },
        },
      },
    ]);
    const result = await resolvePassiveModifiers('char1');
    expect(result.applied).toHaveLength(2);
    // delay: max(30, 0) = 30
    expect(result.modifiers.autoResurrectDelay).toBe(30);
    // hpPercent: max(100, 100) = 100
    expect(result.modifiers.autoResurrectHpPercent).toBe(100);
    // charges: 2개 누적
    expect(result.modifiers.autoResurrectChargesMax).toBe(2);
  });

  test('이슈 5 fix: auto_resurrect lv5 hpPercent cap 100 (PASSIVE_SCALING ×1.45 초과 방지)', async () => {
    findManyMock.mockResolvedValue([
      {
        ...makePlayerSkill({ code: 'mw_absolute_memory', type: 'passive', effectType: 'auto_resurrect', value: 100, level: 5 }),
        skill: {
          ...makePlayerSkill({ code: 'mw_absolute_memory', type: 'passive', effectType: 'auto_resurrect', value: 100, level: 5 }).skill,
          effect: { type: 'auto_resurrect', duration: 30, value: 100 },
        },
      },
    ]);
    const result = await resolvePassiveModifiers('char1');
    // value=100 lv5 → scaled=floor(100×1.45)=145 → cap 100
    expect(result.modifiers.autoResurrectHpPercent).toBe(100);
    expect(result.modifiers.autoResurrectDelay).toBe(30);
    expect(result.modifiers.autoResurrectChargesMax).toBe(1);
  });

  test('이슈 5 fix: 낮은 value (60%) lv5 → scaled 87 < 100, cap 영향 없음', async () => {
    findManyMock.mockResolvedValue([
      {
        ...makePlayerSkill({ code: 'mw_partial_resurrect', type: 'passive', effectType: 'auto_resurrect', value: 60, level: 5 }),
        skill: {
          ...makePlayerSkill({ code: 'mw_partial_resurrect', type: 'passive', effectType: 'auto_resurrect', value: 60, level: 5 }).skill,
          effect: { type: 'auto_resurrect', duration: 0, value: 60 },
        },
      },
    ]);
    const result = await resolvePassiveModifiers('char1');
    // value=60 lv5 → scaled=floor(60×1.45)=87 (≤100, cap 영향 없음)
    expect(result.modifiers.autoResurrectHpPercent).toBe(87);
  });

  test('미장착(isEquipped=false) 은 prisma 쿼리에서 필터링됨 — 결과 0', async () => {
    // findMany 가 isEquipped:true 만 반환하도록 모킹 — 빈 배열
    findManyMock.mockResolvedValue([]);
    const result = await resolvePassiveModifiers('char1');
    expect(result.applied).toHaveLength(0);
    // findMany 호출 시 isEquipped:true 조건 포함 검증
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ characterId: 'char1', isEquipped: true }),
      }),
    );
  });

  test('effect 가 null 또는 형식 불일치면 무시', async () => {
    findManyMock.mockResolvedValue([
      // effect 자체 null
      {
        ...makePlayerSkill({ code: 'no_effect', type: 'passive' }),
      },
      // effect.type 누락 (잘못된 데이터)
      {
        ...makePlayerSkill({ code: 'malformed', type: 'passive', effectType: 'mp_regen', value: 5 }),
        skill: {
          ...makePlayerSkill({ code: 'malformed', type: 'passive' }).skill,
          effect: { duration: 0, value: 5 }, // type 누락
        },
      },
    ]);
    const result = await resolvePassiveModifiers('char1');
    expect(result.applied).toHaveLength(0);
    expect(result.pending).toHaveLength(0);
  });
});

// ─── applyModifiersToStats ────────────────────────────────────

describe('applyModifiersToStats', () => {
  test('베이스 stats + modifier bag → AppliedStats', () => {
    const base = { atk: 50, def: 30, matk: 20, mdef: 25, spd: 12, critRate: 0.05, critDamage: 1.5 };
    const bag = emptyModifierBag();
    bag.evasionAddPercent = 15;
    bag.mpRegenPerTurn = 7;
    bag.lowHpAtkBonusPercent = 80;
    const out = applyModifiersToStats(base, bag);
    expect(out).toEqual({
      ...base,
      evasionAddPercent: 15,
      hitChanceAddPercent: 0,
      mpRegenPerTurn: 7,
      lowHpAtkBonusPercent: 80,
      defenseUpConditionalPercent: 0,
      reflectPercent: 0,
      projectileReflectPercent: 0,
      hpRegenPerTurn: 0,
      cheatDeathChargesMax: 0,
      critEchoPercent: 0,
      moveDamageAuraValue: 0,
      autoResurrectDelay: 0,
      autoResurrectHpPercent: 0,
      autoResurrectChargesMax: 0,
      poisonAmplifyPercent: 0,
      drainAmplifyPercent: 0,
    });
  });
});
