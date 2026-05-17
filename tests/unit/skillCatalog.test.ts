/**
 * Unit tests — 스킬 카탈로그 데이터 정합성 (SKILL-QA-2)
 *
 * 5 클래스 (ether_knight + memory_weaver + shadow_weaver + memory_breaker + void_wanderer)
 * 의 스킬 카탈로그 narrative + 비즈니스 무결성 회귀 가드.
 */
import { describe, it, expect } from 'vitest';
import {
  ALL_SKILLS,
  SKILL_SEED_GROUPS,
  getSkillSeedCount,
} from '../../server/src/skill/skillSeeds';

const SUPPORTED_CLASSES = [
  'ether_knight',
  'memory_weaver',
  'shadow_weaver',
  'memory_breaker',
  'time_guardian',
  'void_wanderer',
] as const;

const SUPPORTED_TYPES = new Set(['active', 'passive', 'ultimate', 'buff', 'debuff', 'heal']);
const SUPPORTED_TARGETS = new Set(['single', 'aoe', 'self', 'party', 'cone', 'line', 'ally']);

describe('SKILL-QA-S1 — 스킬 카탈로그 정량', () => {
  it('ALL_SKILLS 30 스킬 × 6 클래스 = 180 narrative', () => {
    expect(ALL_SKILLS.length).toBe(180);
  });

  it('getSkillSeedCount total = 180', () => {
    expect(getSkillSeedCount().total).toBe(180);
  });

  it('class 별 30 스킬 narrative (ether/memory/shadow/breaker/time/void)', () => {
    const byClass = getSkillSeedCount().byClass;
    for (const cls of SUPPORTED_CLASSES) {
      expect(byClass[cls], `${cls} skill count`).toBe(30);
    }
  });

  it('SKILL_SEED_GROUPS 5 explicit 그룹 각 30 스킬 (time_guardian 그룹 별도)', () => {
    const explicit = ['ether_knight', 'memory_weaver', 'shadow_weaver', 'memory_breaker', 'void_wanderer'] as const;
    for (const cls of explicit) {
      const group = SKILL_SEED_GROUPS[cls];
      expect(group.length, `${cls} group`).toBe(30);
    }
  });
});

describe('SKILL-QA-S2 — code unique + naming', () => {
  it('180 스킬 code 모두 unique', () => {
    const codes = ALL_SKILLS.map((s) => s.code);
    expect(new Set(codes).size).toBe(180);
  });

  it('150 스킬 code snake_case narrative', () => {
    for (const s of ALL_SKILLS) {
      expect(s.code.match(/^[a-z][a-z0-9_]*$/), `code '${s.code}'`).not.toBeNull();
    }
  });

  it('스킬 code 클래스 prefix 시그니처 (ek_/mw_/sw_/mb_/tg_/vw_)', () => {
    const PREFIX: Record<string, string> = {
      ether_knight: 'ek_',
      memory_weaver: 'mw_',
      shadow_weaver: 'sw_',
      memory_breaker: 'mb_',
      time_guardian: 'tg_',
      void_wanderer: 'vw_',
    };
    for (const s of ALL_SKILLS) {
      const expected = PREFIX[s.class];
      if (expected) {
        expect(s.code.startsWith(expected), `${s.code} prefix '${expected}'`).toBe(true);
      }
    }
  });

  it('150 스킬 name 모두 비빈 + 한글 narrative', () => {
    const korean = /[가-힣]/;
    for (const s of ALL_SKILLS) {
      expect(s.name.length, `${s.code} name`).toBeGreaterThan(0);
      expect(korean.test(s.name), `${s.code} 한글`).toBe(true);
    }
  });

  it('150 스킬 description length ≥ 10 narrative', () => {
    for (const s of ALL_SKILLS) {
      expect(s.description.length, `${s.code} description`).toBeGreaterThanOrEqual(10);
    }
  });
});

describe('SKILL-QA-S3 — class + type 유효 값', () => {
  it('모든 class 값 SUPPORTED_CLASSES (5)', () => {
    const supported = new Set(SUPPORTED_CLASSES);
    for (const s of ALL_SKILLS) {
      expect(supported.has(s.class as never), `${s.code} class '${s.class}'`).toBe(true);
    }
  });

  it('모든 type 값 SUPPORTED_TYPES (active/passive/ultimate/buff/debuff/heal)', () => {
    for (const s of ALL_SKILLS) {
      expect(SUPPORTED_TYPES.has(s.type), `${s.code} type '${s.type}'`).toBe(true);
    }
  });

  it('targetType 유효 값 (single/aoe/self/party/cone/line)', () => {
    for (const s of ALL_SKILLS) {
      expect(SUPPORTED_TARGETS.has(s.targetType), `${s.code} targetType '${s.targetType}'`).toBe(true);
    }
  });
});

describe('SKILL-QA-S4 — tier + requiredLevel 정합성', () => {
  it('150 스킬 tier 1~4 범위', () => {
    for (const s of ALL_SKILLS) {
      expect(s.tier, `${s.code} tier`).toBeGreaterThanOrEqual(1);
      expect(s.tier).toBeLessThanOrEqual(4);
    }
  });

  it('150 스킬 requiredLevel 1~100 범위', () => {
    for (const s of ALL_SKILLS) {
      expect(s.requiredLevel, `${s.code} requiredLevel`).toBeGreaterThanOrEqual(1);
      expect(s.requiredLevel).toBeLessThanOrEqual(100);
    }
  });

  it('tier 1 스킬 requiredLevel ≤ 20 (초반 진입) narrative', () => {
    for (const s of ALL_SKILLS) {
      if (s.tier === 1) {
        expect(s.requiredLevel, `${s.code} tier1 lv`).toBeLessThanOrEqual(20);
      }
    }
  });

  it('tier 4 스킬 requiredLevel ≥ 60 (종반 narrative)', () => {
    for (const s of ALL_SKILLS) {
      if (s.tier === 4) {
        expect(s.requiredLevel, `${s.code} tier4 lv`).toBeGreaterThanOrEqual(60);
      }
    }
  });
});

describe('SKILL-QA-S5 — damage / mpCost / cooldown 무결성', () => {
  it('damage 모두 ≥ 0 + finite', () => {
    for (const s of ALL_SKILLS) {
      expect(Number.isFinite(s.damage)).toBe(true);
      expect(s.damage, `${s.code} damage`).toBeGreaterThanOrEqual(0);
    }
  });

  it('mpCost 모두 ≥ 0 + finite', () => {
    for (const s of ALL_SKILLS) {
      expect(Number.isFinite(s.mpCost)).toBe(true);
      expect(s.mpCost, `${s.code} mpCost`).toBeGreaterThanOrEqual(0);
    }
  });

  it('cooldown 모두 ≥ 0 + finite', () => {
    for (const s of ALL_SKILLS) {
      expect(Number.isFinite(s.cooldown)).toBe(true);
      expect(s.cooldown, `${s.code} cooldown`).toBeGreaterThanOrEqual(0);
    }
  });

  it('damageScale 모두 ≥ 0 + finite', () => {
    for (const s of ALL_SKILLS) {
      expect(Number.isFinite(s.damageScale)).toBe(true);
      expect(s.damageScale, `${s.code} damageScale`).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('SKILL-QA-S6 — maxLevel + levelScaling', () => {
  it('maxLevel 모두 3 또는 5 narrative (ultimate=3, 그외=5)', () => {
    for (const s of ALL_SKILLS) {
      expect([3, 5], `${s.code} maxLevel '${s.maxLevel}'`).toContain(s.maxLevel);
    }
  });

  it('ultimate type 스킬 maxLevel = 3 narrative', () => {
    for (const s of ALL_SKILLS) {
      if (s.type === 'ultimate') {
        expect(s.maxLevel, `${s.code} ultimate maxLevel`).toBe(3);
      }
    }
  });

  it('levelScaling length = maxLevel narrative (각 레벨 entry)', () => {
    for (const s of ALL_SKILLS) {
      expect(s.levelScaling.length, `${s.code} scaling length`).toBe(s.maxLevel);
    }
  });

  it('levelScaling level 1~maxLevel 단조 증가', () => {
    for (const s of ALL_SKILLS) {
      for (let i = 0; i < s.levelScaling.length; i += 1) {
        expect(s.levelScaling[i].level).toBe(i + 1);
      }
    }
  });
});

describe('SKILL-QA-S7 — prerequisites 그래프 무결성', () => {
  it('prerequisites 모두 ALL_SKILLS 에 정의 (dangling 없음)', () => {
    const codes = new Set(ALL_SKILLS.map((s) => s.code));
    for (const s of ALL_SKILLS) {
      for (const pre of s.prerequisites) {
        expect(codes.has(pre), `${s.code} dangling prereq '${pre}'`).toBe(true);
      }
    }
  });

  it('prerequisites 자기 참조 없음 (self-loop 가드)', () => {
    for (const s of ALL_SKILLS) {
      expect(s.prerequisites.includes(s.code), `${s.code} self-loop`).toBe(false);
    }
  });

  it('prerequisite 스킬은 같은 클래스만 (cross-class prereq 없음)', () => {
    const byCode = new Map(ALL_SKILLS.map((s) => [s.code, s]));
    for (const s of ALL_SKILLS) {
      for (const pre of s.prerequisites) {
        const preSkill = byCode.get(pre);
        if (preSkill) {
          expect(preSkill.class, `${s.code} prereq cross-class`).toBe(s.class);
        }
      }
    }
  });

  it('tier 1 스킬 prerequisites = [] (root 스킬)', () => {
    for (const s of ALL_SKILLS) {
      if (s.tier === 1) {
        expect(s.prerequisites.length, `${s.code} tier1 prereq`).toBe(0);
      }
    }
  });
});
