/**
 * 유닛 테스트 — skillAdapter (P56-S1)
 *
 * DB Skill → combat SkillDefinition 매핑 회귀.
 */
import { beforeEach, describe, expect, test, vi } from 'vitest';

// Mock prisma BEFORE imports
vi.mock('../../server/src/db', () => ({
  prisma: {
    skill: { findMany: vi.fn() },
  },
}));

import { prisma } from '../../server/src/db';
import {
  _resetInitState,
  extractLifestealPercent,
  extractStatusEffect,
  inferDamageType,
  inferTargetCount,
  initCombatSkillsFromDb,
  loadCombatSkillsFromDb,
  mapDbSkillToCombatDef,
  mapElement,
  type DbSkillLike,
} from '../../server/src/combat/skillAdapter';
import {
  getDbSkillCache,
  getSkillById,
  getSkillsByClass,
} from '../../server/src/combat/skillSystem';

const findManyMock = prisma.skill.findMany as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  findManyMock.mockReset();
});

function makeDbSkill(overrides: Partial<DbSkillLike> = {}): DbSkillLike {
  return {
    code: 'ek_ether_slash',
    name: '에테르 슬래시',
    description: '에테르로 강화된 참격',
    class: 'ether_knight',
    type: 'active',
    element: 'aether',
    damage: 45,
    damageScale: 1.2,
    mpCost: 15,
    cooldown: 3,
    targetType: 'single',
    aoeRadius: null,
    effect: null,
    requiredLevel: 1,
    ...overrides,
  };
}

// ─── mapElement ───────────────────────────────────────────────

describe('mapElement', () => {
  test('직접 매핑: fire/water/wind/earth/light/dark/neutral', () => {
    expect(mapElement('fire')).toBe('fire');
    expect(mapElement('water')).toBe('water');
    expect(mapElement('wind')).toBe('wind');
    expect(mapElement('earth')).toBe('earth');
    expect(mapElement('light')).toBe('light');
    expect(mapElement('dark')).toBe('dark');
    expect(mapElement('neutral')).toBe('neutral');
  });

  test('DB 만의 element → 가까운 combat 매핑', () => {
    expect(mapElement('aether')).toBe('light');
    expect(mapElement('time')).toBe('neutral');
    expect(mapElement('void')).toBe('dark');
    expect(mapElement('ice')).toBe('water');
  });

  test('알 수 없는 element → neutral fallback', () => {
    expect(mapElement('quantum')).toBe('neutral');
    expect(mapElement('')).toBe('neutral');
  });
});

// ─── inferDamageType ──────────────────────────────────────────

describe('inferDamageType', () => {
  test('클래스 기본값', () => {
    expect(inferDamageType({ class: 'ether_knight', effect: null })).toBe('physical');
    expect(inferDamageType({ class: 'memory_breaker', effect: null })).toBe('physical');
    expect(inferDamageType({ class: 'shadow_weaver', effect: null })).toBe('physical');
    expect(inferDamageType({ class: 'memory_weaver', effect: null })).toBe('magical');
    expect(inferDamageType({ class: 'time_guardian', effect: null })).toBe('magical');
    expect(inferDamageType({ class: 'void_wanderer', effect: null })).toBe('magical');
  });

  test('알 수 없는 클래스 → physical fallback', () => {
    expect(inferDamageType({ class: 'unknown', effect: null })).toBe('physical');
  });

  test('effect.type silence/curse → magical override', () => {
    expect(inferDamageType({ class: 'memory_breaker', effect: { type: 'silence' } })).toBe('magical');
    expect(inferDamageType({ class: 'ether_knight', effect: { type: 'curse' } })).toBe('magical');
  });
});

// ─── inferTargetCount ─────────────────────────────────────────

describe('inferTargetCount', () => {
  test('targetType → 숫자', () => {
    expect(inferTargetCount('single')).toBe(1);
    expect(inferTargetCount('self')).toBe(1);
    expect(inferTargetCount('aoe')).toBe(-1);
    expect(inferTargetCount('multi')).toBe(3);
    expect(inferTargetCount('unknown')).toBe(1);
  });
});

// ─── extractStatusEffect ──────────────────────────────────────

describe('extractStatusEffect', () => {
  test('null/non-object → null', () => {
    expect(extractStatusEffect(null)).toBeNull();
    expect(extractStatusEffect(undefined)).toBeNull();
    expect(extractStatusEffect('string')).toBeNull();
    expect(extractStatusEffect(42)).toBeNull();
  });

  test('passive effect (status 가 아님) → null', () => {
    expect(extractStatusEffect({ type: 'mp_regen', value: 5 })).toBeNull();
    expect(extractStatusEffect({ type: 'reflect', value: 20 })).toBeNull();
    expect(extractStatusEffect({ type: 'lifesteal', value: 50 })).toBeNull();
  });

  test('status effect type 추출 + value 가 chance', () => {
    expect(extractStatusEffect({ type: 'stun', value: 30 })).toEqual({ effect: 'stun', chance: 30 });
    expect(extractStatusEffect({ type: 'poison', value: 70 })).toEqual({ effect: 'poison', chance: 70 });
    expect(extractStatusEffect({ type: 'burn' })).toEqual({ effect: 'burn', chance: 50 }); // default
  });

  test('value 가 범위 밖 → default 50', () => {
    expect(extractStatusEffect({ type: 'stun', value: 200 })).toEqual({ effect: 'stun', chance: 50 });
    expect(extractStatusEffect({ type: 'stun', value: -10 })).toEqual({ effect: 'stun', chance: 50 });
    expect(extractStatusEffect({ type: 'stun', value: 0 })).toEqual({ effect: 'stun', chance: 50 });
  });
});

// ─── extractLifestealPercent (P56-S3) ─────────────────────────

describe('extractLifestealPercent', () => {
  test('null/non-object → null', () => {
    expect(extractLifestealPercent(null)).toBeNull();
    expect(extractLifestealPercent(42)).toBeNull();
  });

  test('lifesteal type + 양수 value → percent', () => {
    expect(extractLifestealPercent({ type: 'lifesteal', value: 50 })).toBe(50);
    expect(extractLifestealPercent({ type: 'lifesteal', value: 100 })).toBe(100);
  });

  test('lifesteal type + 음수/0 → null', () => {
    expect(extractLifestealPercent({ type: 'lifesteal', value: 0 })).toBeNull();
    expect(extractLifestealPercent({ type: 'lifesteal', value: -5 })).toBeNull();
  });

  test('lifesteal 아닌 type → null', () => {
    expect(extractLifestealPercent({ type: 'poison', value: 50 })).toBeNull();
    expect(extractLifestealPercent({ type: 'mp_regen', value: 5 })).toBeNull();
  });
});

// ─── mapDbSkillToCombatDef ────────────────────────────────────

describe('mapDbSkillToCombatDef', () => {
  test('기본 active skill — ether_knight aether single', () => {
    const def = mapDbSkillToCombatDef(makeDbSkill());
    expect(def).toEqual({
      id: 'ek_ether_slash',
      name: '에테르 슬래시',
      description: '에테르로 강화된 참격',
      classId: 'ether_knight',
      damageType: 'physical',
      element: 'light', // aether → light
      damageMultiplier: 1.2,
      manaCost: 15,
      cooldownTicks: 3,
      targetCount: 1,
      requiredLevel: 1,
    });
  });

  test('aoe magical skill — memory_weaver chronosphere', () => {
    const def = mapDbSkillToCombatDef(makeDbSkill({
      code: 'mw_chronosphere',
      name: '크로노스피어',
      class: 'memory_weaver',
      element: 'time',
      targetType: 'aoe',
      aoeRadius: 5,
      damageScale: 2.5,
      cooldown: 6,
    }));
    expect(def.id).toBe('mw_chronosphere');
    expect(def.classId).toBe('memory_weaver');
    expect(def.damageType).toBe('magical');
    expect(def.element).toBe('neutral'); // time → neutral
    expect(def.targetCount).toBe(-1);    // aoe → -1
    expect(def.cooldownTicks).toBe(6);
  });

  test('status effect skill — sw_poison_blade', () => {
    const def = mapDbSkillToCombatDef(makeDbSkill({
      code: 'sw_poison_blade',
      class: 'shadow_weaver',
      element: 'dark',
      effect: { type: 'poison', value: 70 },
    }));
    expect(def.statusEffect).toBe('poison');
    expect(def.statusEffectChance).toBe(70);
    expect(def.damageType).toBe('physical');
    expect(def.element).toBe('dark');
  });

  test('passive effect 가 statusEffect 로 흘러가지 않음', () => {
    const def = mapDbSkillToCombatDef(makeDbSkill({
      code: 'sw_soul_drain',
      class: 'shadow_weaver',
      effect: { type: 'lifesteal', value: 50 },
    }));
    expect(def.statusEffect).toBeUndefined();
    expect(def.statusEffectChance).toBeUndefined();
  });

  test('lifesteal effect → lifestealPercent 추출 (P56-S3)', () => {
    const def = mapDbSkillToCombatDef(makeDbSkill({
      code: 'sw_soul_drain',
      class: 'shadow_weaver',
      effect: { type: 'lifesteal', value: 50 },
    }));
    expect(def.lifestealPercent).toBe(50);
  });

  test('lifesteal 외 effect 는 lifestealPercent 부재', () => {
    const def = mapDbSkillToCombatDef(makeDbSkill({
      effect: { type: 'poison', value: 70 },
    }));
    expect(def.lifestealPercent).toBeUndefined();
  });

  test('cooldown floor — 소수점 처리', () => {
    const def = mapDbSkillToCombatDef(makeDbSkill({ cooldown: 7.8 }));
    expect(def.cooldownTicks).toBe(7);
  });

  test('cooldown 음수 보호', () => {
    const def = mapDbSkillToCombatDef(makeDbSkill({ cooldown: -1 }));
    expect(def.cooldownTicks).toBe(0);
  });
});

// ─── loadCombatSkillsFromDb ───────────────────────────────────

describe('loadCombatSkillsFromDb', () => {
  test('active/ultimate 만 쿼리 + Map 반환', async () => {
    findManyMock.mockResolvedValue([
      makeDbSkill({ code: 'ek_ether_slash' }),
      makeDbSkill({ code: 'mw_chronosphere', class: 'memory_weaver', element: 'time' }),
      makeDbSkill({ code: 'tg_ultimate_test', type: 'ultimate', element: 'light' }),
    ]);
    const m = await loadCombatSkillsFromDb();
    expect(m.size).toBe(3);
    expect(m.get('ek_ether_slash')?.classId).toBe('ether_knight');
    expect(m.get('mw_chronosphere')?.element).toBe('neutral');
    expect(m.get('tg_ultimate_test')?.element).toBe('light');

    // Prisma 쿼리에 type filter 포함 검증
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ type: { in: ['active', 'ultimate'] } }),
      }),
    );
  });

  test('빈 DB → 빈 Map', async () => {
    findManyMock.mockResolvedValue([]);
    const m = await loadCombatSkillsFromDb();
    expect(m.size).toBe(0);
  });
});

// ─── P56-S2: initCombatSkillsFromDb + getSkillById fallback ───

describe('initCombatSkillsFromDb + skillSystem cache wiring', () => {
  beforeEach(() => {
    _resetInitState();
  });

  test('init 1회 호출 시 cache 주입 — getSkillById fallback 동작', async () => {
    findManyMock.mockResolvedValue([
      makeDbSkill({ code: 'sw_soul_drain', class: 'shadow_weaver', element: 'dark', effect: { type: 'lifesteal', value: 50 } }),
    ]);

    // init 전: hardcoded 만, sw_soul_drain 없음
    expect(getSkillById('sw_soul_drain')).toBeUndefined();

    await initCombatSkillsFromDb();

    // init 후: cache fallback 으로 조회 가능
    const def = getSkillById('sw_soul_drain');
    expect(def).toBeDefined();
    expect(def?.classId).toBe('shadow_weaver');
    expect(def?.element).toBe('dark');
    expect(def?.statusEffect).toBeUndefined(); // lifesteal 은 status 가 아님
    expect(getDbSkillCache()?.size).toBe(1);
  });

  test('hardcoded SKILL_DATABASE 우선 — DB 가 같은 id 있어도 hard 사용', async () => {
    // ek_slash 는 hardcoded 에 존재. DB 에서 동일 id 다른 값으로 줘도 hard 사용해야 함.
    findManyMock.mockResolvedValue([
      makeDbSkill({ code: 'ek_slash', class: 'memory_weaver', element: 'fire', damageScale: 99 }),
    ]);
    await initCombatSkillsFromDb(true);
    const def = getSkillById('ek_slash');
    // hardcoded ek_slash: classId=ether_knight, damageMultiplier=1.5
    expect(def?.classId).toBe('ether_knight');
    expect(def?.damageMultiplier).toBe(1.5);
  });

  test('동시 init 호출 — single promise 공유 (1회 fetch)', async () => {
    findManyMock.mockResolvedValue([makeDbSkill({ code: 'mw_chronosphere', class: 'memory_weaver' })]);
    const [a, b, c] = await Promise.all([
      initCombatSkillsFromDb(),
      initCombatSkillsFromDb(),
      initCombatSkillsFromDb(),
    ]);
    expect(a).toBe(b);
    expect(b).toBe(c);
    expect(findManyMock).toHaveBeenCalledTimes(1);
  });

  test('이미 초기화 됨 — force=false 면 추가 fetch 없음', async () => {
    findManyMock.mockResolvedValue([makeDbSkill({ code: 'first' })]);
    await initCombatSkillsFromDb();
    findManyMock.mockClear();
    await initCombatSkillsFromDb();
    expect(findManyMock).not.toHaveBeenCalled();
  });

  test('force=true → 강제 재로드', async () => {
    findManyMock.mockResolvedValue([makeDbSkill({ code: 'v1' })]);
    await initCombatSkillsFromDb();
    findManyMock.mockResolvedValue([makeDbSkill({ code: 'v2' })]);
    await initCombatSkillsFromDb(true);
    expect(getSkillById('v2')).toBeDefined();
    expect(findManyMock).toHaveBeenCalledTimes(2);
  });

  test('getSkillsByClass — hardcoded + DB 합본 (id 중복 dedup)', async () => {
    findManyMock.mockResolvedValue([
      makeDbSkill({ code: 'ek_slash', class: 'ether_knight' }),         // hardcoded 와 충돌
      makeDbSkill({ code: 'ek_ether_explode', class: 'ether_knight' }), // 신규
      makeDbSkill({ code: 'mw_only', class: 'memory_weaver' }),         // 다른 클래스
    ]);
    await initCombatSkillsFromDb(true);
    const ek = getSkillsByClass('ether_knight');
    const ekIds = ek.map(s => s.id);
    // ek_slash 1번만 (hardcoded), ek_ether_explode 신규
    expect(ekIds.filter(id => id === 'ek_slash').length).toBe(1);
    expect(ekIds).toContain('ek_ether_explode');
    expect(ekIds).not.toContain('mw_only');
  });
});
