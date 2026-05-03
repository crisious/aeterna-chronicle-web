/**
 * 유닛 테스트 — branchMirror (D-S3 client)
 *
 * BRANCH_GROUPS_MIRROR + lookup + 라벨.
 */
import { describe, expect, test } from 'vitest';
import {
  BRANCH_GROUPS_MIRROR,
  formatBranchLabel,
  getBranchGroupClient,
  getBranchSiblingsClient,
} from '../../client/src/skills/branchMirror';

describe('BRANCH_GROUPS_MIRROR', () => {
  test('6 그룹', () => {
    expect(Object.keys(BRANCH_GROUPS_MIRROR).length).toBe(6);
  });

  test('각 그룹 ≥ 2 skill', () => {
    for (const [g, codes] of Object.entries(BRANCH_GROUPS_MIRROR)) {
      expect(codes.length, g).toBeGreaterThanOrEqual(2);
    }
  });

  test('skill 중복 없음', () => {
    const all: string[] = [];
    for (const codes of Object.values(BRANCH_GROUPS_MIRROR)) all.push(...codes);
    expect(new Set(all).size).toBe(all.length);
  });
});

describe('getBranchGroupClient', () => {
  test('정의된 skill', () => {
    expect(getBranchGroupClient('ek_ether_explode_sword')).toBe('ether_knight_t2_style');
    expect(getBranchGroupClient('mb_shatter_rush')).toBe('memory_breaker_t2_rage');
  });

  test('정의 외 skill → null', () => {
    expect(getBranchGroupClient('unknown')).toBeNull();
  });
});

describe('getBranchSiblingsClient', () => {
  test('자기 자신 제외 + 같은 그룹 다른 skill', () => {
    const sib = getBranchSiblingsClient('ek_ether_explode_sword');
    expect(sib.sort()).toEqual(['ek_combo_strike', 'ek_ether_absorb']);
    expect(sib).not.toContain('ek_ether_explode_sword');
  });

  test('정의 외 → 빈', () => {
    expect(getBranchSiblingsClient('x')).toEqual([]);
  });
});

describe('formatBranchLabel', () => {
  test('알려진 그룹 → 한국어 라벨', () => {
    expect(formatBranchLabel('ether_knight_t2_style')).toContain('에테르 기사');
    expect(formatBranchLabel('memory_breaker_t2_rage')).toContain('기억 파괴자');
  });

  test('알 수 없는 그룹 → ID 그대로', () => {
    expect(formatBranchLabel('unknown_group')).toBe('unknown_group');
  });
});
