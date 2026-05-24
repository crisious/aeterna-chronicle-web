/**
 * 유닛 테스트 — SYNC-172: SCENARIO_ZONE_DENSITY_LEVELS SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_ZONE_DENSITY_LEVELS,
  getZoneDensityNarrative,
  listZoneDensityLevels,
  type ZoneDensityLevel,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly ZoneDensityLevel[] = ['empty', 'sparse', 'normal', 'crowded'];

describe('SCENARIO_ZONE_DENSITY_LEVELS', () => {
  test('4 레벨 모두 정의', () => {
    expect(SCENARIO_ZONE_DENSITY_LEVELS.length).toBe(4);
    for (const d of ALL) {
      expect(getZoneDensityNarrative(d), d).toBeDefined();
    }
  });

  test('averageNpcCount/encounterRate 는 비음수, 밀도 증가 시 단조 증가', () => {
    const by = (d: ZoneDensityLevel) => getZoneDensityNarrative(d)!;
    expect(by('empty').averageNpcCount).toBeLessThanOrEqual(by('sparse').averageNpcCount);
    expect(by('sparse').averageNpcCount).toBeLessThan(by('normal').averageNpcCount);
    expect(by('normal').averageNpcCount).toBeLessThan(by('crowded').averageNpcCount);
    expect(by('empty').encounterRatePer100Steps).toBeLessThan(by('sparse').encounterRatePer100Steps);
    expect(by('sparse').encounterRatePer100Steps).toBeLessThan(by('normal').encounterRatePer100Steps);
    expect(by('normal').encounterRatePer100Steps).toBeLessThan(by('crowded').encounterRatePer100Steps);
  });

  test('label/moodAnchor 비어 있지 않음', () => {
    for (const d of SCENARIO_ZONE_DENSITY_LEVELS) {
      expect(d.label.trim(), d.density).not.toBe('');
      expect(d.moodAnchor.trim(), d.density).not.toBe('');
    }
  });

  test('density 중복 없음', () => {
    const ds = SCENARIO_ZONE_DENSITY_LEVELS.map((d) => d.density);
    expect(new Set(ds).size).toBe(ds.length);
  });

  test('listZoneDensityLevels 는 4 레벨', () => {
    expect(listZoneDensityLevels()).toEqual(ALL);
  });
});
