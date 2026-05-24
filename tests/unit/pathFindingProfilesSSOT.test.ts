/**
 * 유닛 테스트 — SYNC-186: SCENARIO_PATH_FINDING_PROFILES SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_PATH_FINDING_PROFILES,
  getPathFindingProfileNarrative,
  listPathFindingProfiles,
  type PathFindingProfile,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly PathFindingProfile[] = ['direct', 'avoid_enemy', 'safe', 'explore'];

describe('SCENARIO_PATH_FINDING_PROFILES', () => {
  test('4 프로파일 모두 정의', () => {
    expect(SCENARIO_PATH_FINDING_PROFILES.length).toBe(4);
    for (const p of ALL) {
      expect(getPathFindingProfileNarrative(p), p).toBeDefined();
    }
  });

  test('가중치는 비음수', () => {
    for (const p of SCENARIO_PATH_FINDING_PROFILES) {
      expect(p.enemyAvoidanceWeight, p.profile).toBeGreaterThanOrEqual(0);
      expect(p.treasureSeekWeight, p.profile).toBeGreaterThanOrEqual(0);
    }
  });

  test('direct 프로파일은 모든 가중치 0 (최단)', () => {
    const direct = getPathFindingProfileNarrative('direct')!;
    expect(direct.enemyAvoidanceWeight).toBe(0);
    expect(direct.treasureSeekWeight).toBe(0);
  });

  test('safe 프로파일은 enemyAvoidanceWeight 최대', () => {
    const weights = SCENARIO_PATH_FINDING_PROFILES.map((p) => p.enemyAvoidanceWeight);
    const maxWeight = Math.max(...weights);
    expect(getPathFindingProfileNarrative('safe')!.enemyAvoidanceWeight).toBe(maxWeight);
  });

  test('label/usageHint 비어 있지 않음', () => {
    for (const p of SCENARIO_PATH_FINDING_PROFILES) {
      expect(p.label.trim(), p.profile).not.toBe('');
      expect(p.usageHint.trim(), p.profile).not.toBe('');
    }
  });
});
