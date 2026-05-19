/**
 * Unit tests — chrono.ts barrel export 회귀 가드 (CHRONO-S122)
 * 단일 진입점에서 핵심 API 모두 접근 가능 검증.
 */
import { describe, it, expect } from 'vitest';
import {
  // chronoEraAtb
  chronoEraToSpeedTier,
  isChronoEraId,
  chronoEraToEnemyMultipliers,
  chronoEraToAIHints,
  decorateMonsterNameByEra,
  // dualTech
  resolveDualTech,
  listDualTechs,
  listAoeDualTechs,
  // tripleTech
  resolveTripleTech,
  listTripleTechs,
  // chronoField
  resolveFieldEncounter,
  listFieldEncounters,
  rollFieldMonster,
  getBossSlot,
  listAllFieldMonsterIds,
  getTotalFieldBosses,
  listAllBossMonsterIds,
  listBossOnlyFields,
} from '../../shared/types/chrono';

describe('chrono.ts barrel (CHRONO-S122)', () => {
  it('chronoEraAtb API 접근', () => {
    expect(chronoEraToSpeedTier('present')).toBe(3);
    expect(isChronoEraId('ancient')).toBe(true);
    expect(chronoEraToEnemyMultipliers('ruined_future').hp).toBe(1.25);
    expect(chronoEraToAIHints('ruined_future').aoeBias).toBe(0.4);
    expect(decorateMonsterNameByEra('망령', 'ancient')).toBe('[고대] 망령');
  });

  it('dualTech API 접근', () => {
    expect(resolveDualTech('time_knight', 'ether_knight')?.id).toBe('chrono_blade');
    expect(listDualTechs().length).toBe(21);
    expect(listAoeDualTechs().length).toBe(3);
  });

  it('tripleTech API 접근', () => {
    expect(resolveTripleTech('ether_knight', 'time_knight', 'memory_weaver')?.id).toBe('aetherna_final');
    expect(listTripleTechs().length).toBe(15);
  });

  it('chronoField API 접근', () => {
    const e = resolveFieldEncounter('chrono_spire', 'ruined_future');
    expect(e).not.toBeNull();
    expect(listFieldEncounters().length).toBe(21);
    expect(listAllFieldMonsterIds().length).toBeGreaterThanOrEqual(50);
    expect(rollFieldMonster(e!, 0)).not.toBeNull();
    expect(getBossSlot(e!)?.monsterId).toBe('aetherna_collapse');
  });

  it('CHRONO-S137: 보스 헬퍼 barrel 접근 (getTotalFieldBosses + listAllBossMonsterIds)', () => {
    expect(getTotalFieldBosses()).toBe(21);
    const bossIds = listAllBossMonsterIds();
    expect(bossIds.length).toBe(21);
    expect(bossIds).toContain('aetherna_collapse');
    expect(bossIds).toContain('plains_guardian');
  });

  it('CHRONO-S140: 140 sprint 마디 — 핵심 chrono 헬퍼 모두 barrel 통과', () => {
    // 모든 chronoField public API 가 barrel 에서 호출 가능한 것을 일괄 검증
    expect(typeof resolveFieldEncounter).toBe('function');
    expect(typeof listFieldEncounters).toBe('function');
    expect(typeof rollFieldMonster).toBe('function');
    expect(typeof getBossSlot).toBe('function');
    expect(typeof listAllFieldMonsterIds).toBe('function');
    expect(typeof getTotalFieldBosses).toBe('function');
    expect(typeof listAllBossMonsterIds).toBe('function');
  });

  it('CHRONO-S146: listBossOnlyFields barrel 접근', () => {
    const list = listBossOnlyFields();
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list.find((e) => e.zoneId === 'chrono_spire' && e.eraId === 'ruined_future')).toBeDefined();
  });
});
