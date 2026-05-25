/**
 * 유닛 테스트 — SYNC-236: SCENARIO_ENEMY_ARCHETYPE_GROUPS SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_ENEMY_ARCHETYPE_GROUPS,
  SCENARIO_DAMAGE_TYPE_NARRATIVES,
  getEnemyArchetypeGroupNarrative,
  listEnemyArchetypeGroups,
  type EnemyArchetypeGroup,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly EnemyArchetypeGroup[] = ['humanoid', 'beast', 'undead', 'elemental', 'aberration'];

describe('SCENARIO_ENEMY_ARCHETYPE_GROUPS', () => {
  test('5 그룹 모두 정의', () => {
    expect(SCENARIO_ENEMY_ARCHETYPE_GROUPS.length).toBe(5);
    for (const g of ALL) {
      expect(getEnemyArchetypeGroupNarrative(g), g).toBeDefined();
    }
  });

  test('weaknessElement 는 DamageElement 내 존재', () => {
    const validElements = new Set(SCENARIO_DAMAGE_TYPE_NARRATIVES.map((d) => d.element));
    for (const g of SCENARIO_ENEMY_ARCHETYPE_GROUPS) {
      expect(validElements.has(g.weaknessElement), `${g.group}:${g.weaknessElement}`).toBe(true);
    }
  });

  test('baseFrequencyWeight 양수', () => {
    for (const g of SCENARIO_ENEMY_ARCHETYPE_GROUPS) {
      expect(g.baseFrequencyWeight, g.group).toBeGreaterThan(0);
    }
  });

  test('label/behaviorHint 비어 있지 않음', () => {
    for (const g of SCENARIO_ENEMY_ARCHETYPE_GROUPS) {
      expect(g.label.trim(), g.group).not.toBe('');
      expect(g.behaviorHint.trim(), g.group).not.toBe('');
    }
  });

  test('group 중복 없음', () => {
    const gs = SCENARIO_ENEMY_ARCHETYPE_GROUPS.map((g) => g.group);
    expect(new Set(gs).size).toBe(gs.length);
  });
});
