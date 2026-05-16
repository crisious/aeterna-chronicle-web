/**
 * Unit tests — 크로노 필드 컨셉 (CHRONO-S101)
 */
import { describe, it, expect } from 'vitest';
import {
  resolveFieldEncounter,
  listFieldEncounters,
  listFieldEncountersByZone,
  rollFieldMonster,
  rollFieldEncounterSpawns,
} from '../../shared/types/chronoField';

describe('resolveFieldEncounter', () => {
  it('aether_plains + ancient → 에테르 정령 + 안개 늑대 + 유물 골렘 (보스)', () => {
    const e = resolveFieldEncounter('aether_plains', 'ancient');
    expect(e).not.toBeNull();
    expect(e?.monsterPool).toHaveLength(3);
    expect(e?.hasBossSlot).toBe(true);
    const bossSlot = e!.monsterPool.find((s) => s.isBoss);
    expect(bossSlot?.monsterId).toBe('ancient_relic_golem');
  });

  it('aether_plains + present → 보스 없음, 2종', () => {
    const e = resolveFieldEncounter('aether_plains', 'present');
    expect(e?.monsterPool).toHaveLength(2);
    expect(e?.hasBossSlot).toBe(false);
  });

  it('aether_plains + ruined_future → 시간 포식자 보스 포함', () => {
    const e = resolveFieldEncounter('aether_plains', 'ruined_future');
    expect(e?.maxSpawn).toBe(4);
    expect(e?.hasBossSlot).toBe(true);
    const boss = e!.monsterPool.find((s) => s.isBoss);
    expect(boss?.monsterId).toBe('time_devourer');
  });

  it('미정의 zone → null', () => {
    expect(resolveFieldEncounter('nonexistent', 'present')).toBeNull();
  });

  it('빈 zone → null', () => {
    expect(resolveFieldEncounter('', 'present')).toBeNull();
  });
});

describe('listFieldEncountersByZone', () => {
  it('aether_plains → 3 era encounter 모두 반환', () => {
    const list = listFieldEncountersByZone('aether_plains');
    expect(list).toHaveLength(3);
    const eras = list.map((e) => e.eraId).sort();
    expect(eras).toEqual(['ancient', 'present', 'ruined_future']);
  });

  it('미정의 zone → 빈 배열', () => {
    expect(listFieldEncountersByZone('nonexistent')).toHaveLength(0);
  });
});

describe('listFieldEncounters', () => {
  it('전체 목록 15 (5 zone × 3 era — CHRONO-S104)', () => {
    expect(listFieldEncounters().length).toBe(15);
  });

  it('모든 encounter 의 weight 합 = 1.0 (±0.01)', () => {
    for (const e of listFieldEncounters()) {
      const sum = e.monsterPool.reduce((s, m) => s + m.weight, 0);
      expect(sum, `${e.zoneId}/${e.eraId} weight sum`).toBeGreaterThan(0.99);
      expect(sum).toBeLessThan(1.01);
    }
  });

  it('각 zone 마다 3 era 모두 정의됨', () => {
    const zones = ['aether_plains', 'memory_forest', 'shadow_gorge', 'malatus_sanctuary', 'crystal_cave'];
    for (const zone of zones) {
      const list = listFieldEncountersByZone(zone);
      expect(list.length, `${zone} era count`).toBe(3);
    }
  });
});

describe('resolveFieldEncounter — 추가 zone (CHRONO-S102)', () => {
  it('memory_forest + ancient → 숲의 수호자 보스', () => {
    const e = resolveFieldEncounter('memory_forest', 'ancient');
    expect(e?.hasBossSlot).toBe(true);
    expect(e!.monsterPool.find((s) => s.isBoss)?.monsterId).toBe('forest_guardian');
  });

  it('shadow_gorge + ruined_future → shadow_eternity 보스', () => {
    const e = resolveFieldEncounter('shadow_gorge', 'ruined_future');
    expect(e?.maxSpawn).toBe(4);
    expect(e!.monsterPool.find((s) => s.isBoss)?.monsterId).toBe('shadow_eternity');
  });
});

describe('rollFieldMonster (CHRONO-S103)', () => {
  it('roll 0.0 → 첫 slot (에테르 정령 weight 0.5)', () => {
    const e = resolveFieldEncounter('aether_plains', 'ancient')!;
    const slot = rollFieldMonster(e, 0);
    expect(slot?.monsterId).toBe('ancient_ether_sprite');
  });

  it('roll 0.6 → 두번째 slot (안개 늑대 weight 0.4, 0.5~0.9 range)', () => {
    const e = resolveFieldEncounter('aether_plains', 'ancient')!;
    const slot = rollFieldMonster(e, 0.6);
    expect(slot?.monsterId).toBe('ancient_mist_wolf');
  });

  it('roll 0.95 → 보스 slot (유물 골렘 weight 0.1, 0.9~1.0 range)', () => {
    const e = resolveFieldEncounter('aether_plains', 'ancient')!;
    const slot = rollFieldMonster(e, 0.95);
    expect(slot?.monsterId).toBe('ancient_relic_golem');
    expect(slot?.isBoss).toBe(true);
  });

  it('roll 1.0 → clamp 후 마지막 slot fallback', () => {
    const e = resolveFieldEncounter('aether_plains', 'ancient')!;
    const slot = rollFieldMonster(e, 1.0);
    expect(slot).not.toBeNull();
  });
});

describe('rollFieldEncounterSpawns (CHRONO-S103)', () => {
  it('maxSpawn 만큼 슬롯 배열 반환', () => {
    const e = resolveFieldEncounter('aether_plains', 'ancient')!; // maxSpawn 3
    const rolls = [0.0, 0.6, 0.95];
    let i = 0;
    const spawns = rollFieldEncounterSpawns(e, () => rolls[i++]);
    expect(spawns.length).toBe(3);
    expect(spawns[0].monsterId).toBe('ancient_ether_sprite');
    expect(spawns[1].monsterId).toBe('ancient_mist_wolf');
    expect(spawns[2].monsterId).toBe('ancient_relic_golem');
  });

  it('빈 encounter 도 안전 처리 (length 0)', () => {
    // 임의 빈 pool 테스트는 직접 생성
    const fakeEmpty = {
      zoneId: 'fake', eraId: 'present' as const, monsterPool: [],
      maxSpawn: 0, hasBossSlot: false, ambientLine: '',
    };
    expect(rollFieldEncounterSpawns(fakeEmpty, () => 0.5)).toHaveLength(0);
  });
});
