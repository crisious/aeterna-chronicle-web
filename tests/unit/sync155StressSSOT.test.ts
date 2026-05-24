/**
 * 유닛 테스트 — SYNC-155: 🎯 5 sprint (151~155) 누적 stress + TUTORIAL_COMPLETION_REWARDS
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_BOSS_PHASE_TRANSITIONS,
  SCENARIO_SAVE_FILE_METADATA_LABELS,
  SCENARIO_COMBO_FAMILY_NARRATIVES,
  SCENARIO_PASSIVE_EFFECT_LABELS,
  SCENARIO_TUTORIAL_COMPLETION_REWARDS,
  SCENARIO_TUTORIAL_ANCHOR_LINES,
  getTutorialCompletionReward,
} from '../../shared/types/scenarioRegistry';

describe('SYNC-155 🎯 5 sprint 누적 stress', () => {
  test('TUTORIAL_COMPLETION_REWARDS — TUTORIAL_ANCHOR_LINES 7 step 1:1 매칭', () => {
    expect(SCENARIO_TUTORIAL_COMPLETION_REWARDS.length).toBe(7);
    for (const a of SCENARIO_TUTORIAL_ANCHOR_LINES) {
      const reward = getTutorialCompletionReward(a.step);
      expect(reward, a.step).toBeDefined();
      expect(reward?.rewardLabel.trim(), a.step).not.toBe('');
      expect(reward?.rewardAnchor.trim(), a.step).not.toBe('');
    }
  });

  test('reward 는 TUTORIAL_ANCHOR_LINES.step 외 참조 없음', () => {
    const validSteps = new Set(SCENARIO_TUTORIAL_ANCHOR_LINES.map((a) => a.step));
    for (const r of SCENARIO_TUTORIAL_COMPLETION_REWARDS) {
      expect(validSteps.has(r.step), r.step).toBe(true);
    }
  });

  test('sync-151~155 신규 도메인 5종 entry count 정합', () => {
    expect(SCENARIO_BOSS_PHASE_TRANSITIONS.length).toBe(11); // malatus 3 + rawar 3 + lethe 5
    expect(SCENARIO_SAVE_FILE_METADATA_LABELS.length).toBe(6);
    expect(SCENARIO_COMBO_FAMILY_NARRATIVES.length).toBe(6);
    expect(SCENARIO_PASSIVE_EFFECT_LABELS.length).toBe(14);
    expect(SCENARIO_TUTORIAL_COMPLETION_REWARDS.length).toBe(7);
  });

  test('sync-151~155 누적 44 entry 확보', () => {
    const total =
      SCENARIO_BOSS_PHASE_TRANSITIONS.length +
      SCENARIO_SAVE_FILE_METADATA_LABELS.length +
      SCENARIO_COMBO_FAMILY_NARRATIVES.length +
      SCENARIO_PASSIVE_EFFECT_LABELS.length +
      SCENARIO_TUTORIAL_COMPLETION_REWARDS.length;
    expect(total).toBe(44);
  });
});
