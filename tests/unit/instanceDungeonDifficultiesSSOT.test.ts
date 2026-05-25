/**
 * 유닛 테스트 — SYNC-226: SCENARIO_INSTANCE_DUNGEON_DIFFICULTIES SSOT
 */
import { describe, expect, test } from 'vitest';
import {
  SCENARIO_INSTANCE_DUNGEON_DIFFICULTIES,
  getInstanceDungeonDifficultyNarrative,
  listInstanceDungeonDifficulties,
  type InstanceDungeonDifficulty,
} from '../../shared/types/scenarioRegistry';

const ALL: readonly InstanceDungeonDifficulty[] = ['story', 'normal', 'heroic', 'mythic'];

describe('SCENARIO_INSTANCE_DUNGEON_DIFFICULTIES', () => {
  test('4 난이도 모두 정의', () => {
    expect(SCENARIO_INSTANCE_DUNGEON_DIFFICULTIES.length).toBe(4);
    for (const d of ALL) {
      expect(getInstanceDungeonDifficultyNarrative(d), d).toBeDefined();
    }
  });

  test('난이도 ↑ → recommendedLevel ↑, dailyEntryLimit ↓', () => {
    const by = (d: InstanceDungeonDifficulty) => getInstanceDungeonDifficultyNarrative(d)!;
    expect(by('story').recommendedLevel).toBeLessThan(by('normal').recommendedLevel);
    expect(by('normal').recommendedLevel).toBeLessThan(by('heroic').recommendedLevel);
    expect(by('heroic').recommendedLevel).toBeLessThan(by('mythic').recommendedLevel);
    // dailyEntryLimit: normal(5) > heroic(3) > mythic(1)
    expect(by('normal').dailyEntryLimit).toBeGreaterThan(by('heroic').dailyEntryLimit);
    expect(by('heroic').dailyEntryLimit).toBeGreaterThan(by('mythic').dailyEntryLimit);
  });

  test('label/rewardHint 비어 있지 않음', () => {
    for (const d of SCENARIO_INSTANCE_DUNGEON_DIFFICULTIES) {
      expect(d.label.trim(), d.difficulty).not.toBe('');
      expect(d.rewardHint.trim(), d.difficulty).not.toBe('');
    }
  });

  test('difficulty 중복 없음', () => {
    const ds = SCENARIO_INSTANCE_DUNGEON_DIFFICULTIES.map((d) => d.difficulty);
    expect(new Set(ds).size).toBe(ds.length);
  });

  test('listInstanceDungeonDifficulties 는 4 난이도', () => {
    expect(listInstanceDungeonDifficulties()).toEqual(ALL);
  });
});
