/**
 * Unit tests — 협공 총합 catalog 가드 (CHRONO-S98)
 * Dual/Triple 데이터 진행 사항을 한눈에 검증.
 */
import { describe, it, expect } from 'vitest';
import {
  listDualTechs,
  listAoeDualTechs,
} from '../../shared/types/dualTech';
import { listTripleTechs } from '../../shared/types/tripleTech';
import {
  listFieldEncounters,
  listAllFieldMonsterIds,
} from '../../shared/types/chronoField';

describe('Tech catalog 총합', () => {
  it('Dual Tech 21종 + Triple Tech 15종 = 36 총 협공', () => {
    const dualCount = listDualTechs().length;
    const tripleCount = listTripleTechs().length;
    expect(dualCount).toBe(21);
    expect(tripleCount).toBe(15);
    expect(dualCount + tripleCount).toBe(36);
  });

  it('Dual AOE 협공은 3종 (memory_break, time_overflow, void_oblivion)', () => {
    const aoeList = listAoeDualTechs();
    expect(aoeList.length).toBe(3);
    const ids = aoeList.map((d) => d.id).sort();
    expect(ids).toEqual(['memory_break', 'time_overflow', 'void_oblivion']);
  });

  it('Dual Tech damageMultiplier 모두 2.0~2.5 range', () => {
    for (const dt of listDualTechs()) {
      expect(dt.damageMultiplier).toBeGreaterThanOrEqual(2.0);
      expect(dt.damageMultiplier).toBeLessThanOrEqual(2.5);
    }
  });

  it('Triple Tech damageMultiplier 모두 3.0~3.8 range', () => {
    for (const tt of listTripleTechs()) {
      expect(tt.damageMultiplier).toBeGreaterThanOrEqual(3.0);
      expect(tt.damageMultiplier).toBeLessThanOrEqual(3.8);
    }
  });

  it('Triple Tech 대부분 AOE (모두 aoe=true)', () => {
    for (const tt of listTripleTechs()) {
      expect(tt.aoe).toBe(true);
    }
  });
});

describe('Field encounter catalog 총합 (CHRONO-S121)', () => {
  it('21 encounter (7 zone × 3 era)', () => {
    expect(listFieldEncounters().length).toBe(21);
  });

  it('전체 unique monster id ≥ 50 (52 정렬)', () => {
    const ids = listAllFieldMonsterIds();
    expect(ids.length).toBeGreaterThanOrEqual(50);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('보스 슬롯 ≥ 14 (대부분 zone 에 era별 보스)', () => {
    const bossSlotCount = listFieldEncounters().reduce(
      (n, e) => n + e.monsterPool.filter((s) => s.isBoss).length, 0,
    );
    expect(bossSlotCount).toBeGreaterThanOrEqual(14);
  });

  it('chrono_spire/ruined_future 보스 weight 가장 강력 (0.4)', () => {
    const finalE = listFieldEncounters().find(
      (e) => e.zoneId === 'chrono_spire' && e.eraId === 'ruined_future',
    );
    const boss = finalE?.monsterPool.find((s) => s.isBoss);
    expect(boss?.weight).toBe(0.4);
    expect(boss?.monsterId).toBe('aetherna_collapse');
  });
});
