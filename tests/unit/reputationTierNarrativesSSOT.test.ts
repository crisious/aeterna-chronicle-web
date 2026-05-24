/**
 * 유닛 테스트 — SYNC-122: SCENARIO_REPUTATION_TIER_NARRATIVES SSOT consistency
 *
 * 1) 5 tier 모두 정의 (hostile~allied)
 * 2) minScore 오름차순 + 중복 없음
 * 3) label/flavor/interactionHint 비어 있지 않음, uiColor hex
 * 4) getReputationTierByScore 가 점수→tier 매핑 정확
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_REPUTATION_TIER_NARRATIVES,
  getReputationTierNarrative,
  getReputationTierByScore,
  type ReputationTier,
} from '../../shared/types/scenarioRegistry';

const TIERS: readonly ReputationTier[] = ['hostile', 'wary', 'neutral', 'friendly', 'allied'];

describe('SCENARIO_REPUTATION_TIER_NARRATIVES', () => {
  test('5 tier 모두 정의', () => {
    expect(SCENARIO_REPUTATION_TIER_NARRATIVES.length).toBe(5);
    for (const t of TIERS) {
      expect(getReputationTierNarrative(t), t).toBeDefined();
    }
  });

  test('minScore 는 hostile < wary < neutral < friendly < allied 순서', () => {
    const byTier = (t: ReputationTier) => getReputationTierNarrative(t)?.minScore ?? Number.NaN;
    expect(byTier('hostile')).toBeLessThan(byTier('wary'));
    expect(byTier('wary')).toBeLessThan(byTier('neutral'));
    expect(byTier('neutral')).toBeLessThan(byTier('friendly'));
    expect(byTier('friendly')).toBeLessThan(byTier('allied'));
  });

  test('label/flavor/interactionHint 비어 있지 않음', () => {
    for (const t of SCENARIO_REPUTATION_TIER_NARRATIVES) {
      expect(t.label.trim(), t.tier).not.toBe('');
      expect(t.flavor.trim(), t.tier).not.toBe('');
      expect(t.interactionHint.trim(), t.tier).not.toBe('');
    }
  });

  test('uiColor 는 #rrggbb 형식', () => {
    const hex = /^#[0-9a-fA-F]{6}$/;
    for (const t of SCENARIO_REPUTATION_TIER_NARRATIVES) {
      expect(hex.test(t.uiColor), `${t.tier}:${t.uiColor}`).toBe(true);
    }
  });

  test('getReputationTierByScore 매핑 — 경계 점수', () => {
    expect(getReputationTierByScore(-100).tier).toBe('hostile');
    expect(getReputationTierByScore(-41).tier).toBe('hostile');
    expect(getReputationTierByScore(-40).tier).toBe('wary');
    expect(getReputationTierByScore(-10).tier).toBe('neutral');
    expect(getReputationTierByScore(29).tier).toBe('neutral');
    expect(getReputationTierByScore(30).tier).toBe('friendly');
    expect(getReputationTierByScore(70).tier).toBe('allied');
    expect(getReputationTierByScore(100).tier).toBe('allied');
  });
});
