/**
 * 유닛 테스트 — SYNC-119: SCENARIO_BATTLE_OPENING_BARKS SSOT consistency
 *
 * 1) SCENARIO_COMPANIONS 6명 모두 bark 매칭
 * 2) orphan 참조 없음, 중복 없음, bark 비어 있지 않음
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_COMPANIONS,
  SCENARIO_BATTLE_OPENING_BARKS,
  getBattleOpeningBark,
} from '../../shared/types/scenarioRegistry';

describe('SCENARIO_BATTLE_OPENING_BARKS', () => {
  test('SCENARIO_COMPANIONS 6명 모두 bark 매칭', () => {
    for (const c of SCENARIO_COMPANIONS) {
      expect(getBattleOpeningBark(c.obsidianId), c.obsidianId).toBeDefined();
    }
  });

  test('bark 는 companion obsidianId 외 항목을 참조하지 않는다', () => {
    const validIds = new Set(SCENARIO_COMPANIONS.map((c) => c.obsidianId));
    for (const b of SCENARIO_BATTLE_OPENING_BARKS) {
      expect(validIds.has(b.companionObsidianId), b.companionObsidianId).toBe(true);
    }
  });

  test('barkLine 비어 있지 않음', () => {
    for (const b of SCENARIO_BATTLE_OPENING_BARKS) {
      expect(b.barkLine.trim(), b.companionObsidianId).not.toBe('');
    }
  });

  test('companionObsidianId 중복 없음', () => {
    const ids = SCENARIO_BATTLE_OPENING_BARKS.map((b) => b.companionObsidianId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
