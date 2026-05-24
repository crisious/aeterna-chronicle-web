/**
 * 유닛 테스트 — SYNC-175: 🎯 5 sprint (171~175) 누적 stress + DUNGEON_TRAPS
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_LIGHTING_PRESETS,
  SCENARIO_ZONE_DENSITY_LEVELS,
  SCENARIO_NPC_PATROL_PATTERNS,
  SCENARIO_DUNGEON_LAYOUT_PATTERNS,
  SCENARIO_DUNGEON_TRAPS,
  getDungeonTrapNarrative,
  listDungeonTrapKinds,
  type DungeonTrapKind,
} from '../../shared/types/scenarioRegistry';

const TRAPS: readonly DungeonTrapKind[] = ['pressure_plate', 'dart', 'falling_floor', 'poison_gas', 'magic_seal'];

describe('SYNC-175 🎯 5 sprint 누적 stress', () => {
  test('DUNGEON_TRAPS — 5 종 매칭 + 본문', () => {
    expect(SCENARIO_DUNGEON_TRAPS.length).toBe(5);
    for (const t of TRAPS) {
      const n = getDungeonTrapNarrative(t);
      expect(n, t).toBeDefined();
      expect(n?.label.trim(), t).not.toBe('');
      expect(n?.triggerAnchor.trim(), t).not.toBe('');
      expect(n?.damagePattern.trim(), t).not.toBe('');
      expect(n?.avoidanceHint.trim(), t).not.toBe('');
    }
    expect(listDungeonTrapKinds()).toEqual(TRAPS);
  });

  test('sync-171~175 신규 도메인 5종 entry count 정합', () => {
    expect(SCENARIO_LIGHTING_PRESETS.length).toBe(4);
    expect(SCENARIO_ZONE_DENSITY_LEVELS.length).toBe(4);
    expect(SCENARIO_NPC_PATROL_PATTERNS.length).toBe(5);
    expect(SCENARIO_DUNGEON_LAYOUT_PATTERNS.length).toBe(4);
    expect(SCENARIO_DUNGEON_TRAPS.length).toBe(5);
  });

  test('sync-171~175 누적 22 entry 확보', () => {
    const total =
      SCENARIO_LIGHTING_PRESETS.length +
      SCENARIO_ZONE_DENSITY_LEVELS.length +
      SCENARIO_NPC_PATROL_PATTERNS.length +
      SCENARIO_DUNGEON_LAYOUT_PATTERNS.length +
      SCENARIO_DUNGEON_TRAPS.length;
    expect(total).toBe(22);
  });
});
