/**
 * 유닛 테스트 — skillBranches (D-S1)
 *
 * branchGroup 정의 + 역방향 lookup + mutual exclusion 판정.
 */
import { describe, expect, test } from 'vitest';
import {
  SKILL_BRANCH_GROUPS,
  getBranchGroup,
  getSiblingBranchSkills,
  isMutuallyExclusive,
  listBranchGroups,
} from '../../server/src/skill/skillBranches';

describe('SKILL_BRANCH_GROUPS — 6 클래스', () => {
  test('6개 그룹 (각 클래스 tier 2 분기)', () => {
    expect(listBranchGroups().length).toBe(6);
  });

  test('그룹 명: <class>_t<tier>_<concept> 컨벤션', () => {
    for (const g of listBranchGroups()) {
      expect(g).toMatch(/^[a-z_]+_t\d+_[a-z]+$/);
    }
  });

  test('각 그룹 ≥ 2 skill (mutual exclusion 의미)', () => {
    for (const [group, codes] of Object.entries(SKILL_BRANCH_GROUPS)) {
      expect(codes.length, `${group}: 그룹 크기`).toBeGreaterThanOrEqual(2);
    }
  });

  test('skill code 중복 없음 (한 skill 은 1 그룹만)', () => {
    const all: string[] = [];
    for (const codes of Object.values(SKILL_BRANCH_GROUPS)) {
      all.push(...codes);
    }
    expect(new Set(all).size).toBe(all.length);
  });
});

describe('getBranchGroup — skill → group 역방향', () => {
  test('정의된 skill → group ID 반환', () => {
    expect(getBranchGroup('ek_sword_mastery')).toBe('ether_knight_t2_mastery');
    expect(getBranchGroup('mw_chrono_school')).toBe('memory_weaver_t2_school');
    expect(getBranchGroup('vw_phase_path')).toBe('void_wanderer_t2_dimension');
  });

  test('정의되지 않은 skill → null', () => {
    expect(getBranchGroup('ek_ether_slash')).toBeNull();
    expect(getBranchGroup('unknown_skill')).toBeNull();
    expect(getBranchGroup('')).toBeNull();
  });
});

describe('getSiblingBranchSkills', () => {
  test('같은 그룹 다른 skills 반환', () => {
    const siblings = getSiblingBranchSkills('ek_sword_mastery');
    expect(siblings.sort()).toEqual(['ek_magic_mastery', 'ek_shield_mastery']);
  });

  test('자기 자신 제외', () => {
    const siblings = getSiblingBranchSkills('ek_sword_mastery');
    expect(siblings).not.toContain('ek_sword_mastery');
  });

  test('2 중 택 1 그룹 — 1 sibling', () => {
    const siblings = getSiblingBranchSkills('mb_berserker_path');
    expect(siblings).toEqual(['mb_destroyer_path']);
  });

  test('정의 외 skill → 빈 배열', () => {
    expect(getSiblingBranchSkills('ek_ether_slash')).toEqual([]);
    expect(getSiblingBranchSkills('unknown')).toEqual([]);
  });
});

describe('isMutuallyExclusive', () => {
  test('같은 그룹 다른 skill → true', () => {
    expect(isMutuallyExclusive('ek_sword_mastery', 'ek_shield_mastery')).toBe(true);
    expect(isMutuallyExclusive('mb_berserker_path', 'mb_destroyer_path')).toBe(true);
  });

  test('자기 자신 → false (해금 가능)', () => {
    expect(isMutuallyExclusive('ek_sword_mastery', 'ek_sword_mastery')).toBe(false);
  });

  test('다른 그룹 → false', () => {
    expect(isMutuallyExclusive('ek_sword_mastery', 'mw_chrono_school')).toBe(false);
  });

  test('한쪽이 분기 외 → false', () => {
    expect(isMutuallyExclusive('ek_sword_mastery', 'ek_ether_slash')).toBe(false);
    expect(isMutuallyExclusive('unknown1', 'unknown2')).toBe(false);
  });
});
