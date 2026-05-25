/**
 * 유닛 테스트 — SYNC-232: SCENARIO_ENCOUNTER_BIOMES SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_ENCOUNTER_BIOMES,
  getEncounterBiomeNarrative,
  listEncounterBiomes,
  type EncounterBiome,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly EncounterBiome[] = ['forest', 'desert', 'cave', 'urban', 'abyss'];

describe('SCENARIO_ENCOUNTER_BIOMES', () => {
  test('5 biome 모두 정의', () => {
    expect(SCENARIO_ENCOUNTER_BIOMES.length).toBe(5);
    for (const b of ALL) {
      expect(getEncounterBiomeNarrative(b), b).toBeDefined();
    }
  });

  test('enemyDensityWeight 양수', () => {
    for (const b of SCENARIO_ENCOUNTER_BIOMES) {
      expect(b.enemyDensityWeight, b.biome).toBeGreaterThan(0);
    }
  });

  test('urban 이 가장 높은 enemyDensityWeight', () => {
    const max = Math.max(...SCENARIO_ENCOUNTER_BIOMES.map((b) => b.enemyDensityWeight));
    expect(getEncounterBiomeNarrative('urban')?.enemyDensityWeight).toBe(max);
  });

  test('label/environmentModifier 비어 있지 않음', () => {
    for (const b of SCENARIO_ENCOUNTER_BIOMES) {
      expect(b.label.trim(), b.biome).not.toBe('');
      expect(b.environmentModifier.trim(), b.biome).not.toBe('');
    }
  });

  test('biome 중복 없음', () => {
    const bs = SCENARIO_ENCOUNTER_BIOMES.map((b) => b.biome);
    expect(new Set(bs).size).toBe(bs.length);
  });
});
