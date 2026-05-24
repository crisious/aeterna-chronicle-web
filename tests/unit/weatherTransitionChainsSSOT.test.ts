/**
 * 유닛 테스트 — SYNC-176: SCENARIO_WEATHER_TRANSITION_CHAINS SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_WEATHER_TRANSITION_CHAINS,
  SCENARIO_WEATHER_NARRATIVES,
  getWeatherTransitionChain,
  listWeatherTransitionsFrom,
} from '../../shared/types/scenarioRegistry';

describe('SCENARIO_WEATHER_TRANSITION_CHAINS', () => {
  test('5 chain 정의', () => {
    expect(SCENARIO_WEATHER_TRANSITION_CHAINS.length).toBe(5);
  });

  test('from/to 는 WeatherKind 내, 자기 자신 참조 없음', () => {
    const validKinds = new Set(SCENARIO_WEATHER_NARRATIVES.map((w) => w.weather));
    for (const c of SCENARIO_WEATHER_TRANSITION_CHAINS) {
      expect(validKinds.has(c.from), `from:${c.from}`).toBe(true);
      expect(validKinds.has(c.to), `to:${c.to}`).toBe(true);
      expect(c.from).not.toBe(c.to);
    }
  });

  test('transitionProbability 는 0~1 범위', () => {
    for (const c of SCENARIO_WEATHER_TRANSITION_CHAINS) {
      expect(c.transitionProbability, `${c.from}→${c.to}`).toBeGreaterThan(0);
      expect(c.transitionProbability, `${c.from}→${c.to}`).toBeLessThanOrEqual(1);
    }
  });

  test('transitionAnchor 비어 있지 않음', () => {
    for (const c of SCENARIO_WEATHER_TRANSITION_CHAINS) {
      expect(c.transitionAnchor.trim(), `${c.from}→${c.to}`).not.toBe('');
    }
  });

  test('(from, to) 조합 중복 없음', () => {
    const keys = SCENARIO_WEATHER_TRANSITION_CHAINS.map((c) => `${c.from}→${c.to}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test('listWeatherTransitionsFrom 정상', () => {
    const fromClear = listWeatherTransitionsFrom('clear');
    expect(fromClear.length).toBeGreaterThan(0);
    for (const c of fromClear) {
      expect(c.from).toBe('clear');
    }
  });
});
