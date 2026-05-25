/**
 * 유닛 테스트 — SYNC-254: SCENARIO_GEM_SOCKET_COLORS SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_GEM_SOCKET_COLORS,
  getGemSocketColorNarrative,
  listGemSocketColors,
  type GemSocketColor,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly GemSocketColor[] = ['red', 'blue', 'yellow', 'prismatic'];
const STATS = new Set(['공격력', '체력', '명중률', '범용']);

describe('SCENARIO_GEM_SOCKET_COLORS', () => {
  test('4 색 모두 정의', () => {
    expect(SCENARIO_GEM_SOCKET_COLORS.length).toBe(4);
    for (const c of ALL) {
      expect(getGemSocketColorNarrative(c), c).toBeDefined();
    }
  });

  test('primaryStat 은 허용 셋 내 값', () => {
    for (const g of SCENARIO_GEM_SOCKET_COLORS) {
      expect(STATS.has(g.primaryStat), `${g.color}:${g.primaryStat}`).toBe(true);
    }
  });

  test('primaryStat 중복 없음 (각 색이 고유 stat)', () => {
    const ps = SCENARIO_GEM_SOCKET_COLORS.map((g) => g.primaryStat);
    expect(new Set(ps).size).toBe(ps.length);
  });

  test('uiColor 는 #rrggbb 형식', () => {
    const hex = /^#[0-9a-fA-F]{6}$/;
    for (const g of SCENARIO_GEM_SOCKET_COLORS) {
      expect(hex.test(g.uiColor), `${g.color}:${g.uiColor}`).toBe(true);
    }
  });

  test('prismatic 의 primaryStat 은 범용', () => {
    expect(getGemSocketColorNarrative('prismatic')?.primaryStat).toBe('범용');
  });

  test('color 중복 없음', () => {
    const ks = SCENARIO_GEM_SOCKET_COLORS.map((g) => g.color);
    expect(new Set(ks).size).toBe(ks.length);
  });

  test('listGemSocketColors 4 항목', () => {
    expect(listGemSocketColors().length).toBe(4);
  });
});
