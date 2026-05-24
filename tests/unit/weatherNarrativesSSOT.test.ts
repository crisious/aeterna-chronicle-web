/**
 * 유닛 테스트 — SYNC-123: SCENARIO_WEATHER_NARRATIVES SSOT consistency
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_WEATHER_NARRATIVES,
  getWeatherNarrative,
  listWeatherKinds,
  type WeatherKind,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly WeatherKind[] = ['clear', 'rain', 'storm', 'snow', 'fog'];

describe('SCENARIO_WEATHER_NARRATIVES', () => {
  test('5 날씨 모두 정의', () => {
    expect(SCENARIO_WEATHER_NARRATIVES.length).toBe(5);
    for (const w of ALL) {
      expect(getWeatherNarrative(w), w).toBeDefined();
    }
  });

  test('label/enterLine/modifierHint 비어 있지 않음', () => {
    for (const n of SCENARIO_WEATHER_NARRATIVES) {
      expect(n.label.trim(), n.weather).not.toBe('');
      expect(n.enterLine.trim(), n.weather).not.toBe('');
      expect(n.modifierHint.trim(), n.weather).not.toBe('');
    }
  });

  test('listWeatherKinds 는 5 종류 반환', () => {
    expect(listWeatherKinds()).toEqual(ALL);
  });

  test('weather 중복 없음', () => {
    const ws = SCENARIO_WEATHER_NARRATIVES.map((n) => n.weather);
    expect(new Set(ws).size).toBe(ws.length);
  });
});
