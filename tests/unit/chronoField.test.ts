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

  it('aether_plains + present → 평원 가디언 보스 + 일반 2종 (CHRONO-S131)', () => {
    const e = resolveFieldEncounter('aether_plains', 'present');
    expect(e?.monsterPool).toHaveLength(3);
    expect(e?.hasBossSlot).toBe(true);
    expect(e!.monsterPool.find((s) => s.isBoss)?.monsterId).toBe('plains_guardian');
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
  it('전체 목록 21 (7 zone × 3 era — CHRONO-S105 모든 zone 커버)', () => {
    expect(listFieldEncounters().length).toBe(21);
  });

  it('모든 encounter 의 weight 합 = 1.0 (±0.01)', () => {
    for (const e of listFieldEncounters()) {
      const sum = e.monsterPool.reduce((s, m) => s + m.weight, 0);
      expect(sum, `${e.zoneId}/${e.eraId} weight sum`).toBeGreaterThan(0.99);
      expect(sum).toBeLessThan(1.01);
    }
  });

  it('WorldScene 7 zone 모두 3 era 정의됨', () => {
    const zones = [
      'aether_plains', 'memory_forest', 'shadow_gorge',
      'malatus_sanctuary', 'crystal_cave',
      'forgotten_citadel', 'chrono_spire',
    ];
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

describe('FieldEncounter bgmTrack + ambientEffect (CHRONO-S111)', () => {
  it('aether_plains/ancient → mist effect + bgm_ancient_field', () => {
    const e = resolveFieldEncounter('aether_plains', 'ancient');
    expect(e?.bgmTrack).toBe('bgm_ancient_field');
    expect(e?.ambientEffect).toBe('mist');
  });

  it('aether_plains/present → glow effect', () => {
    const e = resolveFieldEncounter('aether_plains', 'present');
    expect(e?.ambientEffect).toBe('glow');
  });

  it('aether_plains/ruined_future → void effect', () => {
    const e = resolveFieldEncounter('aether_plains', 'ruined_future');
    expect(e?.ambientEffect).toBe('void');
  });

  it('chrono_spire/ruined_future → bgm_final_boss (게임 마지막)', () => {
    const e = resolveFieldEncounter('chrono_spire', 'ruined_future');
    expect(e?.bgmTrack).toBe('bgm_final_boss');
  });

  it('CHRONO-S112: BGM 미설정 encounter 는 era 기본값 자동 적용', () => {
    const e = resolveFieldEncounter('memory_forest', 'present');
    // bgmTrack 미설정 → era 기본값 (present → bgm_field_calm)
    expect(e?.bgmTrack).toBe('bgm_field_calm');
    expect(e?.ambientEffect).toBe('glow');
  });

  it('CHRONO-S112: ruined_future 미설정 encounter 도 void effect 기본', () => {
    const e = resolveFieldEncounter('memory_forest', 'ruined_future');
    expect(e?.bgmTrack).toBe('bgm_ruined_future');
    expect(e?.ambientEffect).toBe('void');
  });

  it('CHRONO-S112: chrono_spire/ruined_future override 유지 (bgm_final_boss)', () => {
    const e = resolveFieldEncounter('chrono_spire', 'ruined_future');
    expect(e?.bgmTrack).toBe('bgm_final_boss');
  });

  it('CHRONO-S118: chrono_spire/ruined_future ambientEffect boss_room 적용', () => {
    const e = resolveFieldEncounter('chrono_spire', 'ruined_future');
    expect(e?.ambientEffect).toBe('boss_room');
  });

  it('CHRONO-S119: forgotten_citadel/ruined_future ambientEffect boss_room', () => {
    const e = resolveFieldEncounter('forgotten_citadel', 'ruined_future');
    expect(e?.ambientEffect).toBe('boss_room');
    expect(e?.bgmTrack).toBe('bgm_void_citadel');
  });
});

describe('getBossSlot + listAllFieldMonsterIds (CHRONO-S115)', () => {
  it('getBossSlot 보스 있는 encounter → 슬롯 반환', async () => {
    const { resolveFieldEncounter, getBossSlot } = await import('../../shared/types/chronoField');
    const e = resolveFieldEncounter('chrono_spire', 'ruined_future')!;
    const boss = getBossSlot(e);
    expect(boss?.monsterId).toBe('aetherna_collapse');
  });

  it('getBossSlot 보스 없는 fake encounter → null', async () => {
    const { getBossSlot } = await import('../../shared/types/chronoField');
    const fakeNoBoss = {
      zoneId: 'fake', eraId: 'present' as const,
      monsterPool: [{ monsterId: 'a', name: 'A', weight: 1.0 }],
      maxSpawn: 1, hasBossSlot: false, ambientLine: '',
    };
    expect(getBossSlot(fakeNoBoss)).toBeNull();
  });

  it('listAllFieldMonsterIds ≥ 50 (52 unique IDs)', async () => {
    const { listAllFieldMonsterIds } = await import('../../shared/types/chronoField');
    const ids = listAllFieldMonsterIds();
    expect(ids.length).toBeGreaterThanOrEqual(50);
    expect(new Set(ids).size).toBe(ids.length); // unique
  });

  it('listAllFieldMonsterIds 정렬됨 (alphabetical)', async () => {
    const { listAllFieldMonsterIds } = await import('../../shared/types/chronoField');
    const ids = listAllFieldMonsterIds();
    const sorted = [...ids].sort();
    expect(ids).toEqual(sorted);
  });
});

describe('getTotalFieldBosses + listAllBossMonsterIds (CHRONO-S136)', () => {
  it('전체 보스 슬롯 = 21 (각 encounter 1개씩)', async () => {
    const { getTotalFieldBosses } = await import('../../shared/types/chronoField');
    expect(getTotalFieldBosses()).toBe(21);
  });

  it('보스 monster id 21개 unique 정렬', async () => {
    const { listAllBossMonsterIds } = await import('../../shared/types/chronoField');
    const ids = listAllBossMonsterIds();
    expect(ids.length).toBe(21);
    expect(new Set(ids).size).toBe(21); // unique
    const sorted = [...ids].sort();
    expect(ids).toEqual(sorted);
  });

  it('aetherna_collapse 포함 (게임 최종 보스)', async () => {
    const { listAllBossMonsterIds } = await import('../../shared/types/chronoField');
    expect(listAllBossMonsterIds()).toContain('aetherna_collapse');
  });
});

describe('bossOnlyMode (CHRONO-S139)', () => {
  it('bossOnlyMode=true 시 보스 슬롯만 picker 후보', async () => {
    const { rollFieldMonster } = await import('../../shared/types/chronoField');
    const enc = {
      zoneId: 'fake', eraId: 'present' as const,
      monsterPool: [
        { monsterId: 'normal_a', name: 'A', weight: 0.5 },
        { monsterId: 'normal_b', name: 'B', weight: 0.4 },
        { monsterId: 'boss_x', name: 'Boss', weight: 0.1, isBoss: true },
      ],
      maxSpawn: 2, hasBossSlot: true, ambientLine: '',
      bossOnlyMode: true,
    };
    // 어떤 roll 이든 보스만 반환
    const r1 = rollFieldMonster(enc, 0);
    const r2 = rollFieldMonster(enc, 0.5);
    const r3 = rollFieldMonster(enc, 0.99);
    expect(r1?.monsterId).toBe('boss_x');
    expect(r2?.monsterId).toBe('boss_x');
    expect(r3?.monsterId).toBe('boss_x');
  });

  it('bossOnlyMode=false (default) 시 모든 slot 후보', async () => {
    const { rollFieldMonster } = await import('../../shared/types/chronoField');
    const enc = {
      zoneId: 'fake', eraId: 'present' as const,
      monsterPool: [
        { monsterId: 'normal_a', name: 'A', weight: 0.5 },
        { monsterId: 'normal_b', name: 'B', weight: 0.5 },
      ],
      maxSpawn: 1, hasBossSlot: false, ambientLine: '',
    };
    const r = rollFieldMonster(enc, 0.3);
    expect(r?.monsterId).toBe('normal_a');
  });
});

describe('CHRONO-S141 final boss-rush 필드', () => {
  it('chrono_spire/ruined_future bossOnlyMode=true (게임 최종)', async () => {
    const { resolveFieldEncounter } = await import('../../shared/types/chronoField');
    const e = resolveFieldEncounter('chrono_spire', 'ruined_future');
    expect(e?.bossOnlyMode).toBe(true);
  });
});

describe('listBossOnlyFields (CHRONO-S145)', () => {
  it('현재 1종 (chrono_spire/ruined_future S141 게임 최종)', async () => {
    const { listBossOnlyFields } = await import('../../shared/types/chronoField');
    const list = listBossOnlyFields();
    expect(list.length).toBe(1);
    expect(list[0].zoneId).toBe('chrono_spire');
    expect(list[0].eraId).toBe('ruined_future');
  });
});
