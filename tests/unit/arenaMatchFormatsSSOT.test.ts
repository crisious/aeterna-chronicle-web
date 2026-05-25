/**
 * 유닛 테스트 — SYNC-253: SCENARIO_ARENA_MATCH_FORMATS SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_ARENA_MATCH_FORMATS,
  getArenaMatchFormatNarrative,
  listArenaMatchFormats,
  type ArenaMatchFormat,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly ArenaMatchFormat[] = ['1v1', '2v2', '3v3', '5v5'];

describe('SCENARIO_ARENA_MATCH_FORMATS', () => {
  test('4 형식 모두 정의', () => {
    expect(SCENARIO_ARENA_MATCH_FORMATS.length).toBe(4);
    for (const f of ALL) {
      expect(getArenaMatchFormatNarrative(f), f).toBeDefined();
    }
  });

  test('format 토큰 ↔ playersPerTeam 일치', () => {
    for (const a of SCENARIO_ARENA_MATCH_FORMATS) {
      const n = Number(a.format.split('v')[0]);
      expect(a.playersPerTeam, a.format).toBe(n);
    }
  });

  test('playersPerTeam 단조 증가', () => {
    const order: readonly ArenaMatchFormat[] = ['1v1', '2v2', '3v3', '5v5'];
    for (let i = 1; i < order.length; i += 1) {
      const prev = getArenaMatchFormatNarrative(order[i - 1])!;
      const cur = getArenaMatchFormatNarrative(order[i])!;
      expect(cur.playersPerTeam, `${order[i - 1]}->${order[i]}`).toBeGreaterThan(prev.playersPerTeam);
    }
  });

  test('averageMatchMinutes 단조 증가', () => {
    const order: readonly ArenaMatchFormat[] = ['1v1', '2v2', '3v3', '5v5'];
    for (let i = 1; i < order.length; i += 1) {
      const prev = getArenaMatchFormatNarrative(order[i - 1])!;
      const cur = getArenaMatchFormatNarrative(order[i])!;
      expect(cur.averageMatchMinutes, `${order[i - 1]}->${order[i]}`).toBeGreaterThan(prev.averageMatchMinutes);
    }
  });

  test('format 중복 없음', () => {
    const ks = SCENARIO_ARENA_MATCH_FORMATS.map((a) => a.format);
    expect(new Set(ks).size).toBe(ks.length);
  });

  test('listArenaMatchFormats 4 항목', () => {
    expect(listArenaMatchFormats().length).toBe(4);
  });
});
