/**
 * Unit tests — 플레이 스토리 정합성 cross-check (STORY-V2)
 *
 * 7 zone (aether_plains, memory_forest, malatus_sanctuary, shadow_gorge,
 * crystal_cave, forgotten_citadel, chrono_spire) 가 모든 narrative source 에서 일관 유지.
 */
import { describe, it, expect } from 'vitest';
import {
  listFieldEncounters,
  listFieldEncountersByZone,
  resolveFieldEncounter,
  listAllBossMonsterIds,
} from '../../shared/types/chronoField';

const STORY_ZONES = [
  'aether_plains',
  'memory_forest',
  'malatus_sanctuary',
  'shadow_gorge',
  'crystal_cave',
  'forgotten_citadel',
  'chrono_spire',
];

const STORY_ERAS = ['ancient', 'present', 'ruined_future'] as const;

describe('STORY-V2 — zone 정합성', () => {
  it('chronoField 가 7 narrative zone 모두 커버', () => {
    for (const zone of STORY_ZONES) {
      const list = listFieldEncountersByZone(zone);
      expect(list.length, `${zone} encounter count`).toBe(3);
    }
  });

  it('chronoField 가 narrative 외 zone 정의 안 함', () => {
    const definedZones = new Set(listFieldEncounters().map((e) => e.zoneId));
    expect(definedZones.size).toBe(STORY_ZONES.length);
    for (const z of definedZones) {
      expect(STORY_ZONES, `unexpected zone ${z}`).toContain(z);
    }
  });
});

describe('STORY-V2 — era 정합성', () => {
  it('모든 zone × era 조합 (21) 모두 encounter 정의됨', () => {
    for (const zone of STORY_ZONES) {
      for (const era of STORY_ERAS) {
        const e = resolveFieldEncounter(zone, era);
        expect(e, `${zone}/${era} encounter`).not.toBeNull();
      }
    }
  });

  it('모든 21 encounter 에 보스 슬롯 (cross-product 100%)', () => {
    for (const zone of STORY_ZONES) {
      for (const era of STORY_ERAS) {
        const e = resolveFieldEncounter(zone, era)!;
        expect(e.hasBossSlot, `${zone}/${era} hasBossSlot`).toBe(true);
        const boss = e.monsterPool.find((s) => s.isBoss);
        expect(boss, `${zone}/${era} boss slot`).toBeDefined();
      }
    }
  });
});

describe('STORY-V2 — 시대 분위기 정합성 (보스 이름 시대 키워드 검증)', () => {
  it('ancient 시대 보스 이름에 고대 분위기 키워드 (고대/유물/봉인/세라프/시간/에테르)', () => {
    const ancientBosses = STORY_ZONES.map((zone) => {
      const e = resolveFieldEncounter(zone, 'ancient')!;
      return e.monsterPool.find((s) => s.isBoss)!;
    });
    const keywords = ['고대', '유물', '수호', '봉인', '말라투스', '세라프', '시간', '환영', '결정', '에테르', '거인', '황혼'];
    for (const boss of ancientBosses) {
      const found = keywords.some((k) => boss.name.includes(k));
      expect(found, `ancient boss '${boss.name}' 시대 키워드 없음`).toBe(true);
    }
  });

  it('ruined_future 시대 보스 이름에 붕괴/공허/타락 키워드', () => {
    const futureBosses = STORY_ZONES.map((zone) => {
      const e = resolveFieldEncounter(zone, 'ruined_future')!;
      return e.monsterPool.find((s) => s.isBoss)!;
    });
    const keywords = ['붕괴', '공허', '타락', '버려진', '망각', '영원', '시간', '종말', '파편', '부서진', '포식자'];
    for (const boss of futureBosses) {
      const found = keywords.some((k) => boss.name.includes(k));
      expect(found, `ruined_future boss '${boss.name}' 시대 키워드 없음`).toBe(true);
    }
  });
});

describe('STORY-V2 — 게임 최종 보스 정합성', () => {
  it('chrono_spire/ruined_future 가 게임 최종 필드', () => {
    const finalE = resolveFieldEncounter('chrono_spire', 'ruined_future')!;
    expect(finalE.bossOnlyMode).toBe(true);
    expect(finalE.ambientEffect).toBe('boss_room');
    expect(finalE.bgmTrack).toBe('bgm_final_boss');
  });

  it('aetherna_collapse 가 최종 보스 (게임 제목 시그니처)', () => {
    const finalE = resolveFieldEncounter('chrono_spire', 'ruined_future')!;
    const boss = finalE.monsterPool.find((s) => s.isBoss);
    expect(boss?.monsterId).toBe('aetherna_collapse');
    expect(boss?.name).toBe('에테르나의 종말');
  });

  it('listAllBossMonsterIds 에 aetherna_collapse 포함', () => {
    expect(listAllBossMonsterIds()).toContain('aetherna_collapse');
  });
});

describe('STORY-V2 — 21 보스 unique 시대 분포', () => {
  it('각 시대당 7 보스 (zone × 1 = 7 per era)', () => {
    for (const era of STORY_ERAS) {
      const eraBosses = STORY_ZONES.map((zone) => {
        const e = resolveFieldEncounter(zone, era)!;
        return e.monsterPool.find((s) => s.isBoss)!.monsterId;
      });
      // 같은 era 안에서 보스 unique (zone별 다름)
      expect(new Set(eraBosses).size, `${era} 보스 unique count`).toBe(7);
    }
  });
});

const STORY_CLASSES = [
  'ether_knight',
  'time_knight',
  'shadow_weaver',
  'memory_weaver',
  'time_guardian',
  'void_wanderer',
  'memory_breaker',
];

describe('STORY-V3 — 7 클래스 narrative 정합성', () => {
  it('Dual Tech (21) partnerClasses 가 narrative 7 클래스만 참조', async () => {
    const { listDualTechs } = await import('../../shared/types/dualTech');
    for (const dt of listDualTechs()) {
      for (const cls of dt.partnerClasses) {
        expect(STORY_CLASSES, `Dual ${dt.id} 비-narrative 클래스: ${cls}`).toContain(cls);
      }
    }
  });

  it('Triple Tech (15) partnerClasses 가 narrative 7 클래스만 참조', async () => {
    const { listTripleTechs } = await import('../../shared/types/tripleTech');
    for (const tt of listTripleTechs()) {
      for (const cls of tt.partnerClasses) {
        expect(STORY_CLASSES, `Triple ${tt.id} 비-narrative 클래스: ${cls}`).toContain(cls);
      }
    }
  });

  it('각 narrative 클래스 마다 Dual Tech 페어 ≥ 1', async () => {
    const { listDualTechsByClass } = await import('../../shared/types/dualTech');
    for (const cls of STORY_CLASSES) {
      const techs = listDualTechsByClass(cls);
      expect(techs.length, `${cls} Dual 페어`).toBeGreaterThanOrEqual(1);
    }
  });

  it('각 narrative 클래스 마다 Triple Tech 페어 ≥ 1', async () => {
    const { listTripleTechsByClass } = await import('../../shared/types/tripleTech');
    for (const cls of STORY_CLASSES) {
      const techs = listTripleTechsByClass(cls);
      expect(techs.length, `${cls} Triple 페어`).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('STORY-V4 — era 흐름 narrative + chrono_spire 시그니처', () => {
  it('chrono_spire 3 시대 보스 시그니처: 에테르나 환영 → 시간 통치자 → 에테르나의 종말', async () => {
    const { resolveFieldEncounter } = await import('../../shared/types/chronoField');
    const ancient = resolveFieldEncounter('chrono_spire', 'ancient')!;
    const present = resolveFieldEncounter('chrono_spire', 'present')!;
    const future = resolveFieldEncounter('chrono_spire', 'ruined_future')!;

    expect(ancient.monsterPool.find((s) => s.isBoss)?.name).toBe('에테르나 환영');
    expect(present.monsterPool.find((s) => s.isBoss)?.name).toBe('시간 통치자');
    expect(future.monsterPool.find((s) => s.isBoss)?.name).toBe('에테르나의 종말');
  });

  it('각 era ambient line 이 시대 분위기 일치', async () => {
    const { resolveFieldEncounter } = await import('../../shared/types/chronoField');
    const a = resolveFieldEncounter('aether_plains', 'ancient')!;
    const p = resolveFieldEncounter('aether_plains', 'present')!;
    const f = resolveFieldEncounter('aether_plains', 'ruined_future')!;

    // ancient: 고대/에테르/유적 분위기
    expect(a.ambientLine).toMatch(/고대|에테르|평원/);
    // present: 평화/평원 분위기
    expect(p.ambientLine).toMatch(/평화|평원|에테르/);
    // ruined_future: 붕괴/무너진/폐허 분위기
    expect(f.ambientLine).toMatch(/무너진|붕괴|폐허|시간/);
  });

  it('chrono_spire/ruined_future 가 모든 시간선 종점 (bossOnlyMode + 종말)', async () => {
    const { resolveFieldEncounter } = await import('../../shared/types/chronoField');
    const finalE = resolveFieldEncounter('chrono_spire', 'ruined_future')!;
    expect(finalE.bossOnlyMode).toBe(true);
    expect(finalE.ambientLine).toMatch(/세계|마지막|시간선|종말/);
  });
});
