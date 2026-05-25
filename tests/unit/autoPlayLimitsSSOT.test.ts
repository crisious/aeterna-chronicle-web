/**
 * 유닛 테스트 — SYNC-243: SCENARIO_AUTO_PLAY_LIMITS SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_AUTO_PLAY_LIMITS,
  getAutoPlayLimitNarrative,
  listAutoPlayLimits,
  type AutoPlayLimitKind,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly AutoPlayLimitKind[] = ['battle_count', 'session_time', 'stamina_floor', 'death_count'];
const ON_REACH = new Set(['일시중지', '종료', '경고']);

describe('SCENARIO_AUTO_PLAY_LIMITS', () => {
  test('4 한계 모두 정의', () => {
    expect(SCENARIO_AUTO_PLAY_LIMITS.length).toBe(4);
    for (const k of ALL) {
      expect(getAutoPlayLimitNarrative(k), k).toBeDefined();
    }
  });

  test('threshold 양수, unit 비어 있지 않음', () => {
    for (const l of SCENARIO_AUTO_PLAY_LIMITS) {
      expect(l.threshold, l.kind).toBeGreaterThan(0);
      expect(l.unit.trim(), l.kind).not.toBe('');
    }
  });

  test('onReach 는 허용 셋 내 값', () => {
    for (const l of SCENARIO_AUTO_PLAY_LIMITS) {
      expect(ON_REACH.has(l.onReach), `${l.kind}:${l.onReach}`).toBe(true);
    }
  });

  test('listAutoPlayLimits 4 항목', () => {
    expect(listAutoPlayLimits().length).toBe(4);
  });

  test('kind 중복 없음', () => {
    const ks = SCENARIO_AUTO_PLAY_LIMITS.map((l) => l.kind);
    expect(new Set(ks).size).toBe(ks.length);
  });
});
