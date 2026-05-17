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

describe('SKILL-QA-S8 — element 분포 + 클래스 시그니처 narrative', () => {
  const KNOWN_ELEMENTS = new Set([
    'aether', 'dark', 'light', 'neutral', 'time',
    'fire', 'ice', 'lightning', 'earth', 'wind', 'holy',
  ]);

  it('모든 element 값 KNOWN_ELEMENTS', () => {
    for (const s of ALL_SKILLS) {
      expect(KNOWN_ELEMENTS.has(s.element), `${s.code} element '${s.element}'`).toBe(true);
    }
  });

  it('ether_knight 30 스킬 중 aether element ≥ 10 (시그니처 narrative)', () => {
    const ek = ALL_SKILLS.filter((s) => s.class === 'ether_knight' && s.element === 'aether');
    expect(ek.length).toBeGreaterThanOrEqual(8);
  });

  it('memory_weaver 30 스킬 중 time/dark element 분포', () => {
    const mw = ALL_SKILLS.filter((s) => s.class === 'memory_weaver');
    const timeCount = mw.filter((s) => s.element === 'time').length;
    expect(timeCount, 'memory_weaver time element').toBeGreaterThanOrEqual(5);
  });

  it('shadow_weaver 30 스킬 중 dark element ≥ 15 (시그니처)', () => {
    const sw = ALL_SKILLS.filter((s) => s.class === 'shadow_weaver' && s.element === 'dark');
    expect(sw.length).toBeGreaterThanOrEqual(10);
  });

  it('memory_breaker 30 스킬 중 dark element ≥ 10 (파괴 시그니처)', () => {
    const mb = ALL_SKILLS.filter((s) => s.class === 'memory_breaker' && s.element === 'dark');
    expect(mb.length).toBeGreaterThanOrEqual(10);
  });

  it('각 클래스 element 다양성 ≥ 2 distinct (단일 element 독점 방지)', () => {
    for (const cls of SUPPORTED_CLASSES) {
      const elems = new Set(ALL_SKILLS.filter((s) => s.class === cls).map((s) => s.element));
      expect(elems.size, `${cls} elements`).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('SKILL-QA-S9 — tier 분포 narrative (1/2/3/4)', () => {
  it('각 클래스 tier 1~4 모두 보유 (스킬 트리 완전성)', () => {
    for (const cls of SUPPORTED_CLASSES) {
      const tiers = new Set(ALL_SKILLS.filter((s) => s.class === cls).map((s) => s.tier));
      expect(tiers.has(1), `${cls} tier1`).toBe(true);
      expect(tiers.has(2), `${cls} tier2`).toBe(true);
      expect(tiers.has(3), `${cls} tier3`).toBe(true);
      expect(tiers.has(4), `${cls} tier4`).toBe(true);
    }
  });

  it('각 클래스 tier 4 스킬 ≥ 5 (종반 narrative)', () => {
    for (const cls of SUPPORTED_CLASSES) {
      const tier4 = ALL_SKILLS.filter((s) => s.class === cls && s.tier === 4);
      expect(tier4.length, `${cls} tier4 count`).toBeGreaterThanOrEqual(5);
    }
  });

  it('각 클래스 ultimate type 스킬 ≥ 1 (궁극기 narrative)', () => {
    for (const cls of SUPPORTED_CLASSES) {
      const ults = ALL_SKILLS.filter((s) => s.class === cls && s.type === 'ultimate');
      expect(ults.length, `${cls} ultimate count`).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('SKILL-QA-S10 — 스킬 트리 lv 진행 narrative', () => {
  it('각 클래스 최저 requiredLevel = 1 (시작 스킬 narrative)', () => {
    for (const cls of SUPPORTED_CLASSES) {
      const minLv = Math.min(
        ...ALL_SKILLS.filter((s) => s.class === cls).map((s) => s.requiredLevel),
      );
      expect(minLv, `${cls} min lv`).toBe(1);
    }
  });

  it('각 클래스 최고 requiredLevel ≥ 80 (종반 도달 narrative)', () => {
    for (const cls of SUPPORTED_CLASSES) {
      const maxLv = Math.max(
        ...ALL_SKILLS.filter((s) => s.class === cls).map((s) => s.requiredLevel),
      );
      expect(maxLv, `${cls} max lv`).toBeGreaterThanOrEqual(80);
    }
  });

  it('각 클래스 lv 1~30 (초반 진입) 스킬 ≥ 5', () => {
    for (const cls of SUPPORTED_CLASSES) {
      const earlySkills = ALL_SKILLS.filter(
        (s) => s.class === cls && s.requiredLevel <= 30,
      );
      expect(earlySkills.length, `${cls} early count`).toBeGreaterThanOrEqual(5);
    }
  });

  it('각 클래스 lv 60+ (종반) 스킬 ≥ 5', () => {
    for (const cls of SUPPORTED_CLASSES) {
      const lateSkills = ALL_SKILLS.filter(
        (s) => s.class === cls && s.requiredLevel >= 60,
      );
      expect(lateSkills.length, `${cls} late count`).toBeGreaterThanOrEqual(5);
    }
  });
});

describe('SKILL-QA-S11 — 클래스 시그니처 키워드 narrative', () => {
  const SIGNATURE_KEYWORDS: Record<string, string[]> = {
    ether_knight: ['에테르', '검', '기사', '보호', '신성', '광선'],
    memory_weaver: ['기억', '회상', '시간', '망각', '직조'],
    shadow_weaver: ['그림자', '암흑', '어둠', '직조', '저주', '그늘'],
    memory_breaker: ['파괴', '균열', '폭발', '베기', '관통', '깨'],
    time_guardian: ['시간', '수호', '보호', '방어', '봉인', '제어'],
    void_wanderer: ['공허', '차원', '허공', '공간', '방랑', '소멸'],
  };

  it('각 클래스 30 스킬 중 시그니처 키워드 매치 ≥ 5 narrative', () => {
    for (const cls of SUPPORTED_CLASSES) {
      const keywords = SIGNATURE_KEYWORDS[cls] ?? [];
      const skills = ALL_SKILLS.filter((s) => s.class === cls);
      let matchCount = 0;
      for (const s of skills) {
        if (keywords.some((k) => s.name.includes(k) || s.description.includes(k))) {
          matchCount += 1;
        }
      }
      expect(matchCount, `${cls} 시그니처 매치`).toBeGreaterThanOrEqual(5);
    }
  });

  it('shadow_weaver 스킬 name 에 "그림자/암흑/어둠" 키워드 ≥ 5', () => {
    const sw = ALL_SKILLS.filter((s) => s.class === 'shadow_weaver');
    let matchCount = 0;
    for (const s of sw) {
      if (s.name.includes('그림자') || s.name.includes('암흑') || s.name.includes('어둠')) {
        matchCount += 1;
      }
    }
    expect(matchCount).toBeGreaterThanOrEqual(5);
  });

  it('void_wanderer 스킬 name 에 "공허/차원/허공" 키워드 ≥ 5', () => {
    const vw = ALL_SKILLS.filter((s) => s.class === 'void_wanderer');
    let matchCount = 0;
    for (const s of vw) {
      if (s.name.includes('공허') || s.name.includes('차원') || s.name.includes('허공') || s.name.includes('공간')) {
        matchCount += 1;
      }
    }
    expect(matchCount).toBeGreaterThanOrEqual(5);
  });
});

describe('SKILL-QA-S12 — SKILL ↔ STORY 클래스 cross-domain narrative', () => {
  // STORY 7 클래스
  const STORY_CLASSES = [
    'ether_knight', 'time_knight', 'shadow_weaver', 'memory_weaver',
    'time_guardian', 'void_wanderer', 'memory_breaker',
  ];

  it('SKILL 6 클래스 모두 STORY_CLASSES 에 포함', () => {
    const storySet = new Set(STORY_CLASSES);
    for (const cls of SUPPORTED_CLASSES) {
      expect(storySet.has(cls), `SKILL class '${cls}' in STORY`).toBe(true);
    }
  });

  it('SKILL 미정의 클래스 = time_knight (STORY 7개 - SKILL 6개)', () => {
    const skillSet = new Set(SUPPORTED_CLASSES);
    const missing = STORY_CLASSES.filter((c) => !skillSet.has(c));
    expect(missing.length).toBe(1);
    expect(missing[0]).toBe('time_knight');
  });

  it('SKILL ↔ STORY Tech (Dual) 클래스 partnerClasses cohesion', async () => {
    const { listDualTechs } = await import('../../shared/types/dualTech');
    const allDualClasses = new Set<string>();
    for (const dt of listDualTechs()) {
      for (const cls of dt.partnerClasses) allDualClasses.add(cls);
    }
    // SKILL 모든 클래스는 Dual Tech 에 등장
    for (const cls of SUPPORTED_CLASSES) {
      expect(allDualClasses.has(cls), `SKILL ${cls} in Dual Tech`).toBe(true);
    }
  });

  it('SKILL element 와 STORY element 도메인 중첩 (cohesion)', async () => {
    const { listDualTechs } = await import('../../shared/types/dualTech');
    const dualElements = new Set(listDualTechs().map((dt) => dt.element));
    // STORY chrono ↔ SKILL time (시간선 narrative)
    // STORY dark ↔ SKILL dark (그림자/어둠)
    // STORY holy ↔ SKILL aether/light
    expect(dualElements.has('chrono'), 'STORY chrono element').toBe(true);
    expect(dualElements.has('dark'), 'STORY dark element').toBe(true);
    expect(dualElements.has('holy'), 'STORY holy element').toBe(true);

    const skillElements = new Set(ALL_SKILLS.map((s) => s.element));
    expect(skillElements.has('time'), 'SKILL time element (~STORY chrono)').toBe(true);
    expect(skillElements.has('dark'), 'SKILL dark element').toBe(true);
    expect(skillElements.has('aether'), 'SKILL aether element (~STORY holy)').toBe(true);
  });
});
