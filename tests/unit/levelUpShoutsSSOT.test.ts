/**
 * 유닛 테스트 — SYNC-129: SCENARIO_LEVEL_UP_SHOUTS SSOT consistency
 *
 * 1) 7 entry (aerien + 6 동료) 모두 정의
 * 2) 6 동료 + aerien 외 character 참조 없음
 * 3) shoutLine 비어 있지 않음, characterId 중복 없음
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_COMPANIONS,
  SCENARIO_LEVEL_UP_SHOUTS,
  getLevelUpShout,
} from '../../shared/types/scenarioRegistry';

describe('SCENARIO_LEVEL_UP_SHOUTS', () => {
  test('7 entry (aerien + 6 동료) 정의', () => {
    expect(SCENARIO_LEVEL_UP_SHOUTS.length).toBe(7);
    expect(getLevelUpShout('aerien')).toBeDefined();
    for (const c of SCENARIO_COMPANIONS) {
      expect(getLevelUpShout(c.obsidianId), c.obsidianId).toBeDefined();
    }
  });

  test('characterId 는 aerien 또는 SCENARIO_COMPANIONS 만 참조', () => {
    const validIds = new Set<string>(['aerien', ...SCENARIO_COMPANIONS.map((c) => c.obsidianId)]);
    for (const s of SCENARIO_LEVEL_UP_SHOUTS) {
      expect(validIds.has(s.characterId), s.characterId).toBe(true);
    }
  });

  test('shoutLine 비어 있지 않음', () => {
    for (const s of SCENARIO_LEVEL_UP_SHOUTS) {
      expect(s.shoutLine.trim(), s.characterId).not.toBe('');
    }
  });

  test('characterId 중복 없음', () => {
    const ids = SCENARIO_LEVEL_UP_SHOUTS.map((s) => s.characterId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
