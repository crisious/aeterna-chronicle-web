/**
 * 유닛 테스트 — SYNC-168: SCENARIO_FACTION_CONFLICTS SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_FACTIONS,
  SCENARIO_FACTION_CONFLICTS,
  getFactionConflictNarrative,
  listFactionConflictsForFaction,
} from '../../shared/types/scenarioRegistry';

describe('SCENARIO_FACTION_CONFLICTS', () => {
  test('4 갈등 정의', () => {
    expect(SCENARIO_FACTION_CONFLICTS.length).toBe(4);
  });

  test('factions 양측은 SCENARIO_FACTIONS 내 존재', () => {
    const validIds = new Set(SCENARIO_FACTIONS.map((f) => f.obsidianId));
    for (const c of SCENARIO_FACTION_CONFLICTS) {
      expect(c.factions.length, c.conflictId).toBe(2);
      expect(validIds.has(c.factions[0]), `${c.conflictId}:${c.factions[0]}`).toBe(true);
      expect(validIds.has(c.factions[1]), `${c.conflictId}:${c.factions[1]}`).toBe(true);
      expect(c.factions[0]).not.toBe(c.factions[1]);
    }
  });

  test('conflictAnchor/playerImpactHint 비어 있지 않음', () => {
    for (const c of SCENARIO_FACTION_CONFLICTS) {
      expect(c.conflictAnchor.trim(), c.conflictId).not.toBe('');
      expect(c.playerImpactHint.trim(), c.conflictId).not.toBe('');
    }
  });

  test('conflictId 중복 없음', () => {
    const ids = SCENARIO_FACTION_CONFLICTS.map((c) => c.conflictId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('listFactionConflictsForFaction 정상 동작', () => {
    const guardianConflicts = listFactionConflictsForFaction('faction_memory_guardian');
    expect(guardianConflicts.length).toBeGreaterThan(0);
    for (const c of guardianConflicts) {
      expect(c.factions.includes('faction_memory_guardian')).toBe(true);
    }
  });

  test('lookup 매칭', () => {
    const c = SCENARIO_FACTION_CONFLICTS[0];
    expect(getFactionConflictNarrative(c.conflictId)?.conflictAnchor).toBe(c.conflictAnchor);
  });
});
