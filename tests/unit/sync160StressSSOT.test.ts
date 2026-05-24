/**
 * 유닛 테스트 — SYNC-160: 🎯 10 sprint (151~160) 누적 stress + ENVIRONMENT_HAZARD
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_BOSS_PHASE_TRANSITIONS,
  SCENARIO_SAVE_FILE_METADATA_LABELS,
  SCENARIO_COMBO_FAMILY_NARRATIVES,
  SCENARIO_PASSIVE_EFFECT_LABELS,
  SCENARIO_TUTORIAL_COMPLETION_REWARDS,
  SCENARIO_BRANCH_DECISIONS,
  SCENARIO_INPUT_DEVICE_NARRATIVES,
  SCENARIO_CRAFT_RECIPE_CATEGORIES,
  SCENARIO_RANDOM_ENCOUNTER_FLAVORS,
  SCENARIO_ENVIRONMENT_HAZARDS,
  getEnvironmentHazardNarrative,
  listEnvironmentHazardKinds,
  type EnvironmentHazardKind,
} from '../../shared/types/scenarioRegistry';

const HAZARDS: readonly EnvironmentHazardKind[] = ['fire', 'poison', 'spike', 'cliff'];

describe('SYNC-160 🎯 10 sprint 누적 stress', () => {
  test('ENVIRONMENT_HAZARDS — 4 종 매칭 + 본문', () => {
    expect(SCENARIO_ENVIRONMENT_HAZARDS.length).toBe(4);
    for (const h of HAZARDS) {
      const n = getEnvironmentHazardNarrative(h);
      expect(n, h).toBeDefined();
      expect(n?.label.trim(), h).not.toBe('');
      expect(n?.enterAnchor.trim(), h).not.toBe('');
      expect(n?.damageHint.trim(), h).not.toBe('');
      expect(n?.avoidanceHint.trim(), h).not.toBe('');
    }
    expect(listEnvironmentHazardKinds()).toEqual(HAZARDS);
  });

  test('sync-151~160 신규 도메인 10종 entry count 정합', () => {
    expect(SCENARIO_BOSS_PHASE_TRANSITIONS.length).toBe(11);
    expect(SCENARIO_SAVE_FILE_METADATA_LABELS.length).toBe(6);
    expect(SCENARIO_COMBO_FAMILY_NARRATIVES.length).toBe(6);
    expect(SCENARIO_PASSIVE_EFFECT_LABELS.length).toBe(14);
    expect(SCENARIO_TUTORIAL_COMPLETION_REWARDS.length).toBe(7);
    expect(SCENARIO_BRANCH_DECISIONS.length).toBe(4);
    expect(SCENARIO_INPUT_DEVICE_NARRATIVES.length).toBe(3);
    expect(SCENARIO_CRAFT_RECIPE_CATEGORIES.length).toBe(4);
    expect(SCENARIO_RANDOM_ENCOUNTER_FLAVORS.length).toBe(4);
    expect(SCENARIO_ENVIRONMENT_HAZARDS.length).toBe(4);
  });

  test('sync-151~160 누적 63 entry 확보', () => {
    const total =
      SCENARIO_BOSS_PHASE_TRANSITIONS.length +
      SCENARIO_SAVE_FILE_METADATA_LABELS.length +
      SCENARIO_COMBO_FAMILY_NARRATIVES.length +
      SCENARIO_PASSIVE_EFFECT_LABELS.length +
      SCENARIO_TUTORIAL_COMPLETION_REWARDS.length +
      SCENARIO_BRANCH_DECISIONS.length +
      SCENARIO_INPUT_DEVICE_NARRATIVES.length +
      SCENARIO_CRAFT_RECIPE_CATEGORIES.length +
      SCENARIO_RANDOM_ENCOUNTER_FLAVORS.length +
      SCENARIO_ENVIRONMENT_HAZARDS.length;
    expect(total).toBe(63);
  });
});
