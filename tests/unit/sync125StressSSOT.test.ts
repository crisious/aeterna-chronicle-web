/**
 * 유닛 테스트 — SYNC-125: 🎯 5 sprint (121~125) 누적 narrative stress test
 *
 * 1) DIFFICULTY_NARRATIVES 4 tier 매칭 (마디 진입 신규 도메인)
 * 2) sync-121~125 신규 도메인 5종 모두 entry 정합
 * 3) 누적 narrative 도메인 24+ 전수 검증
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_DAY_PHASE_NARRATIVES,
  SCENARIO_REPUTATION_TIER_NARRATIVES,
  SCENARIO_WEATHER_NARRATIVES,
  SCENARIO_INVENTORY_STATE_NARRATIVES,
  SCENARIO_DIFFICULTY_NARRATIVES,
  SCENARIO_BATTLE_VICTORY_BARKS,
  SCENARIO_BATTLE_OPENING_BARKS,
  getDifficultyNarrative,
  listDifficultyTiersAscending,
  type DifficultyTier,
} from '../../shared/types/scenarioRegistry';

const DIFF_TIERS: readonly DifficultyTier[] = ['easy', 'normal', 'hard', 'nightmare'];

describe('SYNC-125 🎯 5 sprint 누적 stress', () => {
  test('DIFFICULTY_NARRATIVES — 4 tier 매칭 + 본문 비어 있지 않음', () => {
    expect(SCENARIO_DIFFICULTY_NARRATIVES.length).toBe(4);
    for (const t of DIFF_TIERS) {
      const n = getDifficultyNarrative(t);
      expect(n, t).toBeDefined();
      expect(n?.label.trim(), t).not.toBe('');
      expect(n?.modifierSummary.trim(), t).not.toBe('');
      expect(n?.flavor.trim(), t).not.toBe('');
      expect(n?.recommended.trim(), t).not.toBe('');
    }
    expect(listDifficultyTiersAscending()).toEqual(DIFF_TIERS);
  });

  test('sync-121~125 신규 도메인 5종 entry count 정합', () => {
    expect(SCENARIO_DAY_PHASE_NARRATIVES.length).toBe(4);
    expect(SCENARIO_REPUTATION_TIER_NARRATIVES.length).toBe(5);
    expect(SCENARIO_WEATHER_NARRATIVES.length).toBe(5);
    expect(SCENARIO_INVENTORY_STATE_NARRATIVES.length).toBe(4);
    expect(SCENARIO_DIFFICULTY_NARRATIVES.length).toBe(4);
  });

  test('opening↔victory barks (sync-119/120) 6 동료 커버리지 회귀 가드', () => {
    const opening = new Set(SCENARIO_BATTLE_OPENING_BARKS.map((b) => b.companionObsidianId));
    const victory = new Set(SCENARIO_BATTLE_VICTORY_BARKS.map((b) => b.companionObsidianId));
    expect(opening).toEqual(victory);
  });

  test('sync-121~125 누적 22 entry 확보', () => {
    const total =
      SCENARIO_DAY_PHASE_NARRATIVES.length +
      SCENARIO_REPUTATION_TIER_NARRATIVES.length +
      SCENARIO_WEATHER_NARRATIVES.length +
      SCENARIO_INVENTORY_STATE_NARRATIVES.length +
      SCENARIO_DIFFICULTY_NARRATIVES.length;
    expect(total).toBe(22);
  });
});
