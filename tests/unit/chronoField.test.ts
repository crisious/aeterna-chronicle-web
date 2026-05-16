/**
 * Unit tests — 크로노 필드 컨셉 (CHRONO-S101)
 */
import { describe, it, expect } from 'vitest';
import {
  resolveFieldEncounter,
  listFieldEncounters,
  listFieldEncountersByZone,
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
  it('전체 목록 ≥ 3', () => {
    expect(listFieldEncounters().length).toBeGreaterThanOrEqual(3);
  });

  it('모든 encounter 의 weight 합 = 1.0 (±0.01)', () => {
    for (const e of listFieldEncounters()) {
      const sum = e.monsterPool.reduce((s, m) => s + m.weight, 0);
      expect(sum, `${e.zoneId}/${e.eraId} weight sum`).toBeGreaterThan(0.99);
      expect(sum).toBeLessThan(1.01);
    }
  });
});
