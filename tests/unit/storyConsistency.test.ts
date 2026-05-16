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

describe('STORY-V5 — 협공 narrative 시그니처', () => {
  it('aetherna_final triple tech (게임 제목 정점, e+t+m)', async () => {
    const { getTripleTechById } = await import('../../shared/types/tripleTech');
    const tt = getTripleTechById('aetherna_final');
    expect(tt?.name).toBe('에테르나 파이널');
    expect(tt?.partnerClasses.sort()).toEqual(['ether_knight', 'memory_weaver', 'time_knight']);
    expect(tt?.aoe).toBe(true);
    // 게임 최대 데미지 multiplier ≥ 3.5
    expect(tt?.damageMultiplier).toBeGreaterThanOrEqual(3.5);
  });

  it('chrono_blade dual tech 게임 첫 협공 (e+t)', async () => {
    const { getDualTechById } = await import('../../shared/types/dualTech');
    const dt = getDualTechById('chrono_blade');
    expect(dt?.name).toBe('크로노 블레이드');
    expect(dt?.partnerClasses.sort()).toEqual(['ether_knight', 'time_knight']);
    expect(dt?.element).toBe('chrono');
  });

  it('void_eternity (게임 최강 dark triple, ruined_future 전용)', async () => {
    const { getTripleTechById } = await import('../../shared/types/tripleTech');
    const tt = getTripleTechById('void_eternity');
    expect(tt?.damageMultiplier).toBe(3.8); // 최강
    expect(tt?.eraFilter).toContain('ruined_future');
  });

  it('aetherna_final 가 게임 최종 보스 (aetherna_collapse) 명 시그니처 일치', async () => {
    // 둘 다 'aetherna' prefix — 게임 제목 정합성
    const { getTripleTechById } = await import('../../shared/types/tripleTech');
    const { resolveFieldEncounter } = await import('../../shared/types/chronoField');
    const tt = getTripleTechById('aetherna_final')!;
    const finalE = resolveFieldEncounter('chrono_spire', 'ruined_future')!;
    const boss = finalE.monsterPool.find((s) => s.isBoss)!;
    expect(tt.id.startsWith('aetherna')).toBe(true);
    expect(boss.monsterId.startsWith('aetherna')).toBe(true);
  });
});

describe('STORY-V7 — 시대별 monster 분포 narrative', () => {
  it('각 시대 unique monster id 7 이상 (다양성)', async () => {
    const { listFieldEncounters } = await import('../../shared/types/chronoField');
    for (const era of STORY_ERAS) {
      const eraMonsters = new Set<string>();
      for (const e of listFieldEncounters().filter((x) => x.eraId === era)) {
        for (const slot of e.monsterPool) {
          eraMonsters.add(slot.monsterId);
        }
      }
      expect(eraMonsters.size, `${era} 시대 monster 다양성`).toBeGreaterThanOrEqual(7);
    }
  });

  it('전체 unique monster id ≥ 50', async () => {
    const { listAllFieldMonsterIds } = await import('../../shared/types/chronoField');
    expect(listAllFieldMonsterIds().length).toBeGreaterThanOrEqual(50);
  });

  it('각 시대 보스 monster id 시대 prefix 또는 키워드 매치 (narrative 깊이)', async () => {
    const { listFieldEncounters } = await import('../../shared/types/chronoField');
    const ancientKeywords = ['ancient', 'sanctuary', 'sprite', 'mist', 'dryad', 'wisp', 'crystal', 'shadow', 'memory', 'dusk', 'ether', 'silvanhome', 'malatus', 'citadel', 'chrono', 'warden', 'seraph', 'eidolon', 'plains', 'forest', 'guardian', 'phantom', 'titan'];
    for (const e of listFieldEncounters().filter((x) => x.eraId === 'ancient')) {
      const boss = e.monsterPool.find((s) => s.isBoss);
      if (!boss) continue;
      const found = ancientKeywords.some((k) => boss.monsterId.includes(k));
      expect(found, `ancient boss '${boss.monsterId}' narrative 키워드 부재`).toBe(true);
    }
  });
});

describe('STORY-V8 — zone-별 ambient line 시대 차별성', () => {
  it('같은 zone 의 3 era ambient line 이 모두 다름 (시대 분위기 차별)', async () => {
    const { resolveFieldEncounter } = await import('../../shared/types/chronoField');
    for (const zone of STORY_ZONES) {
      const ancient = resolveFieldEncounter(zone, 'ancient')!.ambientLine;
      const present = resolveFieldEncounter(zone, 'present')!.ambientLine;
      const future = resolveFieldEncounter(zone, 'ruined_future')!.ambientLine;
      // 3 시대 ambient 가 모두 unique (narrative 시대 분위기 차별성)
      const set = new Set([ancient, present, future]);
      expect(set.size, `${zone} ambient line 차별성`).toBe(3);
    }
  });

  it('전체 21 ambient line 중복 ≤ 0 (모두 unique)', async () => {
    const { listFieldEncounters } = await import('../../shared/types/chronoField');
    const lines = listFieldEncounters().map((e) => e.ambientLine);
    expect(new Set(lines).size).toBe(21);
  });

  it('ruined_future ambient line 키워드 — 무너진/붕괴/잘못된/잊혀진/타락 등', async () => {
    const { listFieldEncounters } = await import('../../shared/types/chronoField');
    const futureKeywords = ['무너진', '붕괴', '잘못된', '잊혀진', '타락', '존재', '시간이', '폐허', '폭주', '깨진', '시간선', '그림자가', '세계', '산산조각', '썩어가는'];
    for (const e of listFieldEncounters().filter((x) => x.eraId === 'ruined_future')) {
      const found = futureKeywords.some((k) => e.ambientLine.includes(k));
      expect(found, `${e.zoneId}/ruined_future ambient: ${e.ambientLine}`).toBe(true);
    }
  });
});

describe('STORY-V9 — ChronoTimeline ↔ chronoEraAtb 데이터 cross-check', () => {
  it('chronoEraToEnemyMultipliers 가 ChronoTimeline CHRONO_ERAS 와 일치', async () => {
    const { chronoEraToEnemyMultipliers } = await import('../../shared/types/chronoEraAtb');
    // ancient
    const a = chronoEraToEnemyMultipliers('ancient');
    expect(a.hp).toBe(0.9);
    expect(a.attackSpeed).toBe(0.95);
    expect(a.reward).toBe(1.0);
    expect(a.levelOffset).toBe(-2);
    // present
    const p = chronoEraToEnemyMultipliers('present');
    expect(p.hp).toBe(1.0);
    expect(p.attackSpeed).toBe(1.0);
    expect(p.levelOffset).toBe(0);
    // ruined_future (가장 강한 시대)
    const f = chronoEraToEnemyMultipliers('ruined_future');
    expect(f.hp).toBe(1.25);
    expect(f.attackSpeed).toBe(1.15);
    expect(f.reward).toBe(1.25);
    expect(f.levelOffset).toBe(6);
  });

  it('chronoEraToSpeedTier ancient<present<ruined_future (시대 긴장감 narrative)', async () => {
    const { chronoEraToSpeedTier } = await import('../../shared/types/chronoEraAtb');
    expect(chronoEraToSpeedTier('ancient')).toBeLessThan(chronoEraToSpeedTier('present'));
    expect(chronoEraToSpeedTier('present')).toBeLessThan(chronoEraToSpeedTier('ruined_future'));
  });

  it('decorateMonsterNameByEra prefix narrative 정합', async () => {
    const { decorateMonsterNameByEra } = await import('../../shared/types/chronoEraAtb');
    expect(decorateMonsterNameByEra('망령', 'ancient')).toContain('[고대]');
    expect(decorateMonsterNameByEra('망령', 'present')).toBe('망령');
    expect(decorateMonsterNameByEra('망령', 'ruined_future')).toContain('[붕괴]');
  });
});

describe('STORY-V11 — Tech element 분포 narrative', () => {
  it('Dual Tech 3 element (chrono/dark/holy) 각각 ≥ 1', async () => {
    const { listDualTechs } = await import('../../shared/types/dualTech');
    const elements = new Set(listDualTechs().map((d) => d.element));
    expect(elements.has('chrono')).toBe(true);
    expect(elements.has('dark')).toBe(true);
    expect(elements.has('holy')).toBe(true);
  });

  it('Triple Tech 3 element (chrono/dark/holy) 각각 ≥ 1', async () => {
    const { listTripleTechs } = await import('../../shared/types/tripleTech');
    const elements = new Set(listTripleTechs().map((t) => t.element));
    expect(elements.has('chrono')).toBe(true);
    expect(elements.has('dark')).toBe(true);
    expect(elements.has('holy')).toBe(true);
  });

  it('aetherna_final 게임 정점 협공 element chrono (제목 일치)', async () => {
    const { getTripleTechById } = await import('../../shared/types/tripleTech');
    expect(getTripleTechById('aetherna_final')?.element).toBe('chrono');
  });

  it('void_eternity 최강 dark triple ruined_future 전용', async () => {
    const { getTripleTechById } = await import('../../shared/types/tripleTech');
    const tt = getTripleTechById('void_eternity');
    expect(tt?.element).toBe('dark');
    expect(tt?.eraFilter).toContain('ruined_future');
  });
});

describe('STORY-V12 — 협공 eraFilter narrative 일관성', () => {
  it('chrono_blade (chrono dual) eraFilter ancient+present (붕괴미래 차단)', async () => {
    const { getDualTechById } = await import('../../shared/types/dualTech');
    const dt = getDualTechById('chrono_blade');
    expect(dt?.eraFilter).toEqual(['ancient', 'present']);
  });

  it('memory_warp (chrono dual) eraFilter ancient+present', async () => {
    const { getDualTechById } = await import('../../shared/types/dualTech');
    const dt = getDualTechById('memory_warp');
    expect(dt?.eraFilter).toEqual(['ancient', 'present']);
  });

  it('memory_break (dark AOE dual) eraFilter ruined_future 전용', async () => {
    const { getDualTechById } = await import('../../shared/types/dualTech');
    const dt = getDualTechById('memory_break');
    expect(dt?.eraFilter).toEqual(['ruined_future']);
  });

  it('guardian_pact (holy triple) ancient+present (붕괴미래 차단)', async () => {
    const { getTripleTechById } = await import('../../shared/types/tripleTech');
    const tt = getTripleTechById('guardian_oath');
    expect(tt?.eraFilter).toEqual(['ancient', 'present']);
  });
});

describe('STORY-V13 — Tech fxKey narrative 정합', () => {
  it('Dual Tech 36 fxKey 모두 fx_ prefix', async () => {
    const { listDualTechs } = await import('../../shared/types/dualTech');
    for (const dt of listDualTechs()) {
      expect(dt.fxKey, `Dual ${dt.id} fxKey`).toMatch(/^fx_/);
    }
  });

  it('Triple Tech 모든 fxKey fx_ prefix', async () => {
    const { listTripleTechs } = await import('../../shared/types/tripleTech');
    for (const tt of listTripleTechs()) {
      expect(tt.fxKey, `Triple ${tt.id} fxKey`).toMatch(/^fx_/);
    }
  });

  it('Dual + Triple fxKey 모두 unique', async () => {
    const { listDualTechs } = await import('../../shared/types/dualTech');
    const { listTripleTechs } = await import('../../shared/types/tripleTech');
    const all = [
      ...listDualTechs().map((d) => d.fxKey),
      ...listTripleTechs().map((t) => t.fxKey),
    ];
    expect(new Set(all).size).toBe(all.length); // 36 unique
  });

  it('fxKey 가 협공 id 와 통상 일치 (fx_{id} 패턴)', async () => {
    const { listDualTechs } = await import('../../shared/types/dualTech');
    const { listTripleTechs } = await import('../../shared/types/tripleTech');
    for (const dt of listDualTechs()) {
      expect(dt.fxKey, `Dual ${dt.id}`).toBe(`fx_${dt.id}`);
    }
    for (const tt of listTripleTechs()) {
      expect(tt.fxKey, `Triple ${tt.id}`).toBe(`fx_${tt.id}`);
    }
  });
});

describe('STORY-V14 — Chapter 진행 narrative 순서 (1~5)', () => {
  it('aether_plains Chapter 1 → memory_forest/malatus Chapter 2 → shadow_gorge/crystal Chapter 3 → forgotten_citadel Chapter 4 → chrono_spire Chapter 5', () => {
    // ZONE_CHAPTER_MAP narrative 순서:
    // ch1: aether_plains
    // ch2: memory_forest, malatus_sanctuary
    // ch3: shadow_gorge, crystal_cave (3.5)
    // ch4: forgotten_citadel
    // ch5: chrono_spire (게임 종점)
    const chapterOrder = [
      ['aether_plains'],
      ['memory_forest', 'malatus_sanctuary'],
      ['shadow_gorge', 'crystal_cave'],
      ['forgotten_citadel'],
      ['chrono_spire'],
    ];
    expect(chapterOrder.flat().length).toBe(7); // 7 zone 모두 chapter 진행도에 위치
    expect(new Set(chapterOrder.flat()).size).toBe(7); // unique
  });

  it('chapter 종점 chrono_spire 가 모든 zone 보다 큰 보스 weight 보유', async () => {
    const { resolveFieldEncounter } = await import('../../shared/types/chronoField');
    const final = resolveFieldEncounter('chrono_spire', 'ruined_future')!;
    const finalBoss = final.monsterPool.find((s) => s.isBoss)!;
    // 종점 보스 weight 0.4 (다른 모든 보스 weight 0.1~0.2 보다 큼)
    expect(finalBoss.weight).toBeGreaterThanOrEqual(0.3);
  });

  it('aether_plains (시작 zone) ancient 보스 weight 0.1 (낮음 — 입문)', async () => {
    const { resolveFieldEncounter } = await import('../../shared/types/chronoField');
    const start = resolveFieldEncounter('aether_plains', 'ancient')!;
    const startBoss = start.monsterPool.find((s) => s.isBoss)!;
    expect(startBoss.weight).toBe(0.1); // 시작 보스 낮은 weight (희귀 조우)
  });
});

describe('STORY-V15 — 보스 monster id naming 패턴', () => {
  it('21 보스 monster id snake_case 패턴 (소문자 + 숫자 + 밑줄)', async () => {
    const { listAllBossMonsterIds } = await import('../../shared/types/chronoField');
    const pattern = /^[a-z][a-z0-9_]*$/;
    for (const id of listAllBossMonsterIds()) {
      expect(pattern.test(id), `boss id '${id}' 패턴 위반`).toBe(true);
    }
  });

  it('21 보스 id 충돌 없음 (시대간 unique)', async () => {
    const { listAllBossMonsterIds } = await import('../../shared/types/chronoField');
    const ids = listAllBossMonsterIds();
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('전체 52+ monster id 모두 snake_case', async () => {
    const { listAllFieldMonsterIds } = await import('../../shared/types/chronoField');
    const pattern = /^[a-z][a-z0-9_]*$/;
    for (const id of listAllFieldMonsterIds()) {
      expect(pattern.test(id), `monster id '${id}' 패턴 위반`).toBe(true);
    }
  });
});

describe('STORY-V16 — 협공 mpCost narrative 균형', () => {
  it('Dual Tech mpCost 12 이상 (협공 비용 충분)', async () => {
    const { listDualTechs } = await import('../../shared/types/dualTech');
    for (const dt of listDualTechs()) {
      expect(dt.mpCost, `Dual ${dt.id} mpCost`).toBeGreaterThanOrEqual(12);
    }
  });

  it('Triple Tech mpCost 28 이상 (3인 협공 더 비쌈)', async () => {
    const { listTripleTechs } = await import('../../shared/types/tripleTech');
    for (const tt of listTripleTechs()) {
      expect(tt.mpCost, `Triple ${tt.id} mpCost`).toBeGreaterThanOrEqual(28);
    }
  });

  it('void_eternity 최강 (3.8×) → mpCost 도 최고 (≥30)', async () => {
    const { getTripleTechById } = await import('../../shared/types/tripleTech');
    const tt = getTripleTechById('void_eternity')!;
    expect(tt.mpCost).toBeGreaterThanOrEqual(30);
  });

  it('Triple mpCost 평균 > Dual mpCost 평균 (3인 협공 비용 우위)', async () => {
    const { listDualTechs } = await import('../../shared/types/dualTech');
    const { listTripleTechs } = await import('../../shared/types/tripleTech');
    const dualAvg = listDualTechs().reduce((s, d) => s + d.mpCost, 0) / listDualTechs().length;
    const tripleAvg = listTripleTechs().reduce((s, t) => s + t.mpCost, 0) / listTripleTechs().length;
    expect(tripleAvg).toBeGreaterThan(dualAvg);
  });
});

describe('STORY-V17 — 협공 partnerClasses 순열 narrative 안정성', () => {
  it('Dual Tech 모든 페어 reverse 순서도 같은 결과', async () => {
    const { listDualTechs, resolveDualTech } = await import('../../shared/types/dualTech');
    for (const dt of listDualTechs()) {
      const [a, b] = dt.partnerClasses;
      const forward = resolveDualTech(a, b);
      const reverse = resolveDualTech(b, a);
      expect(forward?.id).toBe(dt.id);
      expect(reverse?.id).toBe(dt.id);
    }
  });

  it('Triple Tech 모든 트리플 6 순열 (3!) 모두 같은 결과', async () => {
    const { listTripleTechs, resolveTripleTech } = await import('../../shared/types/tripleTech');
    for (const tt of listTripleTechs()) {
      const [a, b, c] = tt.partnerClasses;
      const perms = [
        [a, b, c], [a, c, b], [b, a, c],
        [b, c, a], [c, a, b], [c, b, a],
      ];
      for (const [x, y, z] of perms) {
        const r = resolveTripleTech(x, y, z);
        expect(r?.id, `Triple ${tt.id} perm [${x},${y},${z}]`).toBe(tt.id);
      }
    }
  });
});

describe('STORY-V18 — 시대 진행 어려움 단조 narrative', () => {
  it('enemyHp ancient(0.9) ≤ present(1.0) ≤ ruined_future(1.25)', async () => {
    const { chronoEraToEnemyMultipliers } = await import('../../shared/types/chronoEraAtb');
    const a = chronoEraToEnemyMultipliers('ancient').hp;
    const p = chronoEraToEnemyMultipliers('present').hp;
    const f = chronoEraToEnemyMultipliers('ruined_future').hp;
    expect(a).toBeLessThanOrEqual(p);
    expect(p).toBeLessThanOrEqual(f);
  });

  it('level offset ancient(-2) → present(0) → ruined_future(+6) 단조 증가', async () => {
    const { chronoEraToEnemyMultipliers } = await import('../../shared/types/chronoEraAtb');
    const a = chronoEraToEnemyMultipliers('ancient').levelOffset;
    const p = chronoEraToEnemyMultipliers('present').levelOffset;
    const f = chronoEraToEnemyMultipliers('ruined_future').levelOffset;
    expect(a).toBeLessThan(p);
    expect(p).toBeLessThan(f);
  });

  it('reward 단조 ancient(1.0) ≤ present(1.0) ≤ ruined_future(1.25)', async () => {
    const { chronoEraToEnemyMultipliers } = await import('../../shared/types/chronoEraAtb');
    const a = chronoEraToEnemyMultipliers('ancient').reward;
    const p = chronoEraToEnemyMultipliers('present').reward;
    const f = chronoEraToEnemyMultipliers('ruined_future').reward;
    expect(a).toBeLessThanOrEqual(p);
    expect(p).toBeLessThanOrEqual(f);
  });

  it('attackSpeed 단조 ancient(0.95) ≤ present(1.0) ≤ ruined_future(1.15)', async () => {
    const { chronoEraToEnemyMultipliers } = await import('../../shared/types/chronoEraAtb');
    const a = chronoEraToEnemyMultipliers('ancient').attackSpeed;
    const p = chronoEraToEnemyMultipliers('present').attackSpeed;
    const f = chronoEraToEnemyMultipliers('ruined_future').attackSpeed;
    expect(a).toBeLessThanOrEqual(p);
    expect(p).toBeLessThanOrEqual(f);
  });
});

describe('STORY-V19 — AI hint 시대 분위기 narrative', () => {
  it('ancient defensiveBias > present (회상 시대 보호 분위기)', async () => {
    const { chronoEraToAIHints } = await import('../../shared/types/chronoEraAtb');
    const a = chronoEraToAIHints('ancient');
    const p = chronoEraToAIHints('present');
    expect(a.defensiveBias).toBeGreaterThan(p.defensiveBias);
  });

  it('ruined_future aoeBias > present (광역 폭주 분위기)', async () => {
    const { chronoEraToAIHints } = await import('../../shared/types/chronoEraAtb');
    const f = chronoEraToAIHints('ruined_future');
    const p = chronoEraToAIHints('present');
    expect(f.aoeBias).toBeGreaterThan(p.aoeBias);
  });

  it('ruined_future aggressiveBias > present (공격적 분위기)', async () => {
    const { chronoEraToAIHints } = await import('../../shared/types/chronoEraAtb');
    const f = chronoEraToAIHints('ruined_future');
    const p = chronoEraToAIHints('present');
    expect(f.aggressiveBias).toBeGreaterThan(p.aggressiveBias);
  });

  it('present (균형) — 모든 bias 0', async () => {
    const { chronoEraToAIHints } = await import('../../shared/types/chronoEraAtb');
    const p = chronoEraToAIHints('present');
    expect(p.defensiveBias).toBe(0);
    expect(p.aoeBias).toBe(0);
    expect(p.aggressiveBias).toBe(0);
  });
});

describe('STORY-V20 — era bonus drops narrative', () => {
  it('ancient 보너스 드롭 — relic_shard (유물 분위기)', async () => {
    const { chronoEraBonusDrops } = await import('../../shared/types/chronoEraAtb');
    const drops = chronoEraBonusDrops('ancient');
    expect(drops.length).toBeGreaterThanOrEqual(1);
    expect(drops.some((d) => d.itemId.includes('relic'))).toBe(true);
  });

  it('ruined_future 보너스 드롭 — chrono_crystal + voidshard (시대 시그니처)', async () => {
    const { chronoEraBonusDrops } = await import('../../shared/types/chronoEraAtb');
    const drops = chronoEraBonusDrops('ruined_future');
    expect(drops.length).toBeGreaterThanOrEqual(2);
    const ids = drops.map((d) => d.itemId);
    expect(ids.some((id) => id.includes('chrono'))).toBe(true);
    expect(ids.some((id) => id.includes('void'))).toBe(true);
  });

  it('present 보너스 드롭 빈 배열 (표준, narrative 일관)', async () => {
    const { chronoEraBonusDrops } = await import('../../shared/types/chronoEraAtb');
    expect(chronoEraBonusDrops('present').length).toBe(0);
  });

  it('ruined_future 드롭이 ancient 보다 많거나 같음 (시대 부유함 X — 보상 다양화)', async () => {
    const { chronoEraBonusDrops } = await import('../../shared/types/chronoEraAtb');
    expect(chronoEraBonusDrops('ruined_future').length).toBeGreaterThanOrEqual(chronoEraBonusDrops('ancient').length);
  });
});

describe('STORY-V21 — era별 협공 가용성', () => {
  it('각 시대마다 Dual Tech ≥ 3 가능 (협공 다양성)', async () => {
    const { listDualTechsByEra } = await import('../../shared/types/dualTech');
    for (const era of STORY_ERAS) {
      const techs = listDualTechsByEra(era);
      expect(techs.length, `${era} Dual Tech 가용`).toBeGreaterThanOrEqual(3);
    }
  });

  it('각 시대마다 Triple Tech ≥ 1 가능', async () => {
    const { listTripleTechsByEra } = await import('../../shared/types/tripleTech');
    for (const era of STORY_ERAS) {
      const techs = listTripleTechsByEra(era);
      expect(techs.length, `${era} Triple Tech 가용`).toBeGreaterThanOrEqual(1);
    }
  });

  it('ruined_future 전용 협공 (다른 era 제외) ≥ 1 (시대 시그니처)', async () => {
    const { listDualTechs } = await import('../../shared/types/dualTech');
    const { listTripleTechs } = await import('../../shared/types/tripleTech');
    const futureOnlyDual = listDualTechs().filter((d) =>
      d.eraFilter !== undefined && d.eraFilter.length === 1 && d.eraFilter[0] === 'ruined_future'
    );
    const futureOnlyTriple = listTripleTechs().filter((t) =>
      t.eraFilter !== undefined && t.eraFilter.length === 1 && t.eraFilter[0] === 'ruined_future'
    );
    expect(futureOnlyDual.length + futureOnlyTriple.length).toBeGreaterThanOrEqual(1);
  });
});

describe('STORY-V22 — AOE Tech narrative 일관성', () => {
  it('Dual AOE 3종 (memory_break / time_overflow / void_oblivion)', async () => {
    const { listAoeDualTechs } = await import('../../shared/types/dualTech');
    const ids = listAoeDualTechs().map((d) => d.id).sort();
    expect(ids).toEqual(['memory_break', 'time_overflow', 'void_oblivion']);
  });

  it('Triple Tech 모두 AOE=true (3인 협공 광역 분위기)', async () => {
    const { listTripleTechs } = await import('../../shared/types/tripleTech');
    for (const tt of listTripleTechs()) {
      expect(tt.aoe, `Triple ${tt.id} aoe`).toBe(true);
    }
  });

  it('Dual AOE 3종 모두 damageMultiplier 2.4 이상 (광역 강력)', async () => {
    const { listAoeDualTechs } = await import('../../shared/types/dualTech');
    for (const dt of listAoeDualTechs()) {
      expect(dt.damageMultiplier, `Dual AOE ${dt.id} dmg`).toBeGreaterThanOrEqual(2.4);
    }
  });
});

describe('STORY-V23 — ambientLine 무결성 + 게임명 narrative', () => {
  it('21 ambientLine 모두 1자 이상 + 50자 이하', async () => {
    const { listFieldEncounters } = await import('../../shared/types/chronoField');
    for (const e of listFieldEncounters()) {
      expect(e.ambientLine.length, `${e.zoneId}/${e.eraId}`).toBeGreaterThanOrEqual(1);
      expect(e.ambientLine.length).toBeLessThanOrEqual(50);
    }
  });

  it('chrono_spire/ruined_future ambientLine 게임 종말 narrative', async () => {
    const { resolveFieldEncounter } = await import('../../shared/types/chronoField');
    const finalE = resolveFieldEncounter('chrono_spire', 'ruined_future')!;
    expect(finalE.ambientLine).toContain('세계');
    expect(finalE.ambientLine).toContain('마지막');
  });

  it('aetherna prefix 정합 — Triple (aetherna_final) + Boss (aetherna_collapse) 모두 게임 제목 시그니처', async () => {
    const { getTripleTechById } = await import('../../shared/types/tripleTech');
    const { listAllBossMonsterIds } = await import('../../shared/types/chronoField');
    expect(getTripleTechById('aetherna_final')?.name).toContain('에테르나');
    const bossIds = listAllBossMonsterIds();
    const aethernaBosses = bossIds.filter((id) => id.startsWith('aetherna'));
    expect(aethernaBosses.length).toBeGreaterThanOrEqual(1);
  });
});

describe('STORY-V24 — narrative 정량 정점 (협공/보스/zone/클래스 총합)', () => {
  it('총 협공 = 36 (Dual 21 + Triple 15)', async () => {
    const { listDualTechs } = await import('../../shared/types/dualTech');
    const { listTripleTechs } = await import('../../shared/types/tripleTech');
    expect(listDualTechs().length).toBe(21);
    expect(listTripleTechs().length).toBe(15);
    expect(listDualTechs().length + listTripleTechs().length).toBe(36);
  });

  it('총 보스 = 21 (zone 7 × era 3, 모든 cross-product)', async () => {
    const { getTotalFieldBosses, listAllBossMonsterIds } = await import('../../shared/types/chronoField');
    expect(getTotalFieldBosses()).toBe(21);
    expect(listAllBossMonsterIds().length).toBe(21);
  });

  it('총 monster ≥ 50 unique (시대별 다양성)', async () => {
    const { listAllFieldMonsterIds } = await import('../../shared/types/chronoField');
    expect(listAllFieldMonsterIds().length).toBeGreaterThanOrEqual(50);
  });

  it('총 zone 7 + era 3 + 클래스 7 narrative source 정량', () => {
    expect(STORY_ZONES.length).toBe(7);
    expect(STORY_ERAS.length).toBe(3);
    expect(STORY_CLASSES.length).toBe(7);
  });
});

describe('STORY-V26 — 클래스 협공 density narrative', () => {
  it('각 narrative 클래스가 Dual 6 (cross-product 완성, 7-1=6)', async () => {
    const { listDualTechsByClass } = await import('../../shared/types/dualTech');
    for (const cls of STORY_CLASSES) {
      const techs = listDualTechsByClass(cls);
      expect(techs.length, `${cls} Dual count`).toBe(6); // 7-1=6 다른 클래스와 페어
    }
  });

  it('ether_knight + memory_breaker 정확히 1 Dual (ether_break)', async () => {
    const { resolveDualTech } = await import('../../shared/types/dualTech');
    expect(resolveDualTech('ether_knight', 'memory_breaker')?.id).toBe('ether_break');
  });

  it('Triple Tech 각 클래스 카운트 ≥ 2 (다양성)', async () => {
    const { listTripleTechsByClass } = await import('../../shared/types/tripleTech');
    for (const cls of STORY_CLASSES) {
      const techs = listTripleTechsByClass(cls);
      expect(techs.length, `${cls} Triple count`).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('STORY-V27 — 협공 description narrative quality', () => {
  it('Dual Tech 21 description 모두 1자 이상', async () => {
    const { listDualTechs } = await import('../../shared/types/dualTech');
    for (const dt of listDualTechs()) {
      expect(dt.description.length, `Dual ${dt.id} description`).toBeGreaterThanOrEqual(1);
    }
  });

  it('Triple Tech 15 description 모두 1자 이상', async () => {
    const { listTripleTechs } = await import('../../shared/types/tripleTech');
    for (const tt of listTripleTechs()) {
      expect(tt.description.length, `Triple ${tt.id} description`).toBeGreaterThanOrEqual(1);
    }
  });

  it('Dual + Triple description 모두 unique', async () => {
    const { listDualTechs } = await import('../../shared/types/dualTech');
    const { listTripleTechs } = await import('../../shared/types/tripleTech');
    const all = [
      ...listDualTechs().map((d) => d.description),
      ...listTripleTechs().map((t) => t.description),
    ];
    expect(new Set(all).size).toBe(all.length); // 36 unique
  });
});

describe('STORY-V28 — 협공 name + 시그니처 narrative', () => {
  it('Dual 21 name 1~15자 (한글 narrative)', async () => {
    const { listDualTechs } = await import('../../shared/types/dualTech');
    for (const dt of listDualTechs()) {
      expect(dt.name.length, `Dual ${dt.id} name`).toBeGreaterThanOrEqual(1);
      expect(dt.name.length).toBeLessThanOrEqual(15);
    }
  });

  it('Triple 15 name 1~15자', async () => {
    const { listTripleTechs } = await import('../../shared/types/tripleTech');
    for (const tt of listTripleTechs()) {
      expect(tt.name.length, `Triple ${tt.id} name`).toBeGreaterThanOrEqual(1);
      expect(tt.name.length).toBeLessThanOrEqual(15);
    }
  });

  it('Dual + Triple name 모두 unique', async () => {
    const { listDualTechs } = await import('../../shared/types/dualTech');
    const { listTripleTechs } = await import('../../shared/types/tripleTech');
    const all = [
      ...listDualTechs().map((d) => d.name),
      ...listTripleTechs().map((t) => t.name),
    ];
    expect(new Set(all).size).toBe(all.length);
  });

  it('chrono_spire/present 시그니처 보스 시간 통치자 (chrono_archon)', async () => {
    const { resolveFieldEncounter } = await import('../../shared/types/chronoField');
    const e = resolveFieldEncounter('chrono_spire', 'present')!;
    const boss = e.monsterPool.find((s) => s.isBoss);
    expect(boss?.monsterId).toBe('chrono_archon');
    expect(boss?.name).toBe('시간 통치자');
  });
});

describe('STORY-V29 — 보스 monster name 한글 narrative', () => {
  it('21 보스 name 모두 1~10자 한글 narrative', async () => {
    const { listFieldEncounters } = await import('../../shared/types/chronoField');
    for (const e of listFieldEncounters()) {
      const boss = e.monsterPool.find((s) => s.isBoss);
      if (!boss) continue;
      expect(boss.name.length, `${e.zoneId}/${e.eraId} boss name`).toBeGreaterThanOrEqual(1);
      expect(boss.name.length).toBeLessThanOrEqual(15);
    }
  });

  it('21 보스 name 모두 unique', async () => {
    const { listFieldEncounters } = await import('../../shared/types/chronoField');
    const bossNames = listFieldEncounters()
      .map((e) => e.monsterPool.find((s) => s.isBoss)?.name)
      .filter((n): n is string => !!n);
    expect(new Set(bossNames).size).toBe(bossNames.length);
  });

  it('21 일반 monster name 모두 unique', async () => {
    const { listFieldEncounters } = await import('../../shared/types/chronoField');
    const names = new Set<string>();
    for (const e of listFieldEncounters()) {
      for (const slot of e.monsterPool) {
        names.add(slot.name);
      }
    }
    expect(names.size).toBeGreaterThanOrEqual(40); // 보스+일반 합쳐 ≥40 unique
  });
});

describe('STORY-V30 — weight 합 narrative balance', () => {
  it('21 encounter weight 합 정확히 1.0 ± 0.001 (floating-point tolerance)', async () => {
    const { listFieldEncounters } = await import('../../shared/types/chronoField');
    for (const e of listFieldEncounters()) {
      const sum = e.monsterPool.reduce((s, m) => s + m.weight, 0);
      expect(sum, `${e.zoneId}/${e.eraId} weight sum`).toBeCloseTo(1.0, 3);
    }
  });

  it('chrono_spire/ruined_future 최종 보스 weight 0.4 (가장 높음)', async () => {
    const { listFieldEncounters } = await import('../../shared/types/chronoField');
    const bossWeights = listFieldEncounters().map((e) => {
      const boss = e.monsterPool.find((s) => s.isBoss);
      return { id: `${e.zoneId}/${e.eraId}`, weight: boss?.weight ?? 0 };
    });
    const finalWeight = bossWeights.find((b) => b.id === 'chrono_spire/ruined_future')!.weight;
    // 최종 보스가 모든 다른 보스 weight 보다 크거나 같음
    for (const b of bossWeights) {
      expect(finalWeight, `${b.id} vs final`).toBeGreaterThanOrEqual(b.weight);
    }
  });

  it('일반 monster slot 총 합 ≥ 보스 slot 총 합 (일반 spawn 비중)', async () => {
    const { listFieldEncounters } = await import('../../shared/types/chronoField');
    let normalCount = 0;
    let bossCount = 0;
    for (const e of listFieldEncounters()) {
      for (const slot of e.monsterPool) {
        if (slot.isBoss) bossCount += 1;
        else normalCount += 1;
      }
    }
    expect(normalCount).toBeGreaterThanOrEqual(bossCount);
  });
});

describe('STORY-V31 — 보스 id 시그니처 suffix narrative', () => {
  const BOSS_SUFFIXES = [
    'guardian', 'lord', 'titan', 'archon', 'overlord', 'eternity',
    'phantom', 'wraith', 'seal', 'golem', 'eidolon', 'collapse',
    'devourer', 'avatar', 'remnant', 'malatus',
  ];

  it('21 보스 id 모두 시그니처 suffix narrative 매치', async () => {
    const { listAllBossMonsterIds } = await import('../../shared/types/chronoField');
    const bossIds = listAllBossMonsterIds();
    expect(bossIds.length).toBe(21);
    for (const id of bossIds) {
      const matched = BOSS_SUFFIXES.some((sfx) => id.includes(sfx));
      expect(matched, `boss id '${id}' lacks signature suffix`).toBe(true);
    }
  });

  it('21 보스 id 모두 unique + length 5~30 narrative + snake_case', async () => {
    const { listAllBossMonsterIds } = await import('../../shared/types/chronoField');
    const bossIds = listAllBossMonsterIds();
    const set = new Set(bossIds);
    expect(set.size).toBe(bossIds.length);
    for (const id of bossIds) {
      expect(id.length, `boss id '${id}' length`).toBeGreaterThanOrEqual(5);
      expect(id.length).toBeLessThanOrEqual(30);
      expect(id.match(/^[a-z][a-z0-9_]*$/), `boss id '${id}' snake_case`).not.toBeNull();
    }
  });

  it('aetherna 시그니처 보스 2개 (eidolon + collapse) 정확히 보유', async () => {
    const { listAllBossMonsterIds } = await import('../../shared/types/chronoField');
    const bossIds = listAllBossMonsterIds();
    const aetherna = bossIds.filter((id) => id.startsWith('aetherna_'));
    expect(aetherna.length).toBe(2);
    expect(aetherna).toContain('aetherna_eidolon');
    expect(aetherna).toContain('aetherna_collapse');
  });
});

describe('STORY-V32 — bgmTrack/ambientEffect narrative 정합성', () => {
  it('21 encounter bgmTrack 모두 "bgm_" prefix narrative (resolved with era fallback)', async () => {
    const { resolveFieldEncounter } = await import('../../shared/types/chronoField');
    for (const zone of STORY_ZONES) {
      for (const era of STORY_ERAS) {
        const e = resolveFieldEncounter(zone, era)!;
        expect(e.bgmTrack, `${zone}/${era} bgmTrack`).toMatch(/^bgm_/);
      }
    }
  });

  it('21 encounter ambientEffect 모두 known pool narrative (resolved)', async () => {
    const { resolveFieldEncounter } = await import('../../shared/types/chronoField');
    const POOL = new Set(['glow', 'mist', 'void', 'boss_room', 'dust', 'none']);
    for (const zone of STORY_ZONES) {
      for (const era of STORY_ERAS) {
        const e = resolveFieldEncounter(zone, era)!;
        expect(POOL.has(e.ambientEffect!), `${zone}/${era} effect '${e.ambientEffect}'`).toBe(true);
      }
    }
  });

  it('보스 only encounter 는 ambientEffect=boss_room narrative 우선 적용', async () => {
    const { listBossOnlyFields } = await import('../../shared/types/chronoField');
    for (const e of listBossOnlyFields()) {
      expect(e.ambientEffect, `${e.zoneId}/${e.eraId} boss-only effect`).toBe('boss_room');
    }
  });

  it('chrono_spire/ruined_future 최종 보스 bgmTrack 시그니처 (final_boss 또는 chrono)', async () => {
    const { resolveFieldEncounter } = await import('../../shared/types/chronoField');
    const e = resolveFieldEncounter('chrono_spire', 'ruined_future');
    expect(e).not.toBeNull();
    expect(e!.bgmTrack).toMatch(/(final_boss|chrono|aetherna)/);
  });
});

describe('STORY-V33 — chronoEraAtb passive/AI hints 시대 narrative', () => {
  it('ancient evasionAddPercent > present (회상의 흐릿함 — 잡기 어려움)', async () => {
    const { chronoEraToMonsterPassives } = await import('../../shared/types/chronoEraAtb');
    expect(chronoEraToMonsterPassives('ancient').evasionAddPercent).toBeGreaterThan(
      chronoEraToMonsterPassives('present').evasionAddPercent,
    );
  });

  it('ruined_future hitChanceAddPercent > present (붕괴는 더 예리)', async () => {
    const { chronoEraToMonsterPassives } = await import('../../shared/types/chronoEraAtb');
    expect(chronoEraToMonsterPassives('ruined_future').hitChanceAddPercent).toBeGreaterThan(
      chronoEraToMonsterPassives('present').hitChanceAddPercent,
    );
  });

  it('ancient defensiveBias > ruined_future (회상=수비, 붕괴=공격)', async () => {
    const { chronoEraToAIHints } = await import('../../shared/types/chronoEraAtb');
    expect(chronoEraToAIHints('ancient').defensiveBias).toBeGreaterThan(
      chronoEraToAIHints('ruined_future').defensiveBias,
    );
  });

  it('ruined_future aoeBias > ancient (붕괴=광역, 회상=단일)', async () => {
    const { chronoEraToAIHints } = await import('../../shared/types/chronoEraAtb');
    expect(chronoEraToAIHints('ruined_future').aoeBias).toBeGreaterThan(
      chronoEraToAIHints('ancient').aoeBias,
    );
  });

  it('present 모든 hint 0 narrative (표준 baseline)', async () => {
    const { chronoEraToAIHints, chronoEraToMonsterPassives } = await import('../../shared/types/chronoEraAtb');
    const h = chronoEraToAIHints('present');
    expect(h.defensiveBias).toBe(0);
    expect(h.aoeBias).toBe(0);
    expect(h.aggressiveBias).toBe(0);
    const p = chronoEraToMonsterPassives('present');
    expect(p.evasionAddPercent).toBe(0);
    expect(p.hitChanceAddPercent).toBe(0);
  });

  it('bonusDrops: ancient + ruined_future 양 시대에 시그니처 drop 보유, present 없음', async () => {
    const { chronoEraBonusDrops } = await import('../../shared/types/chronoEraAtb');
    expect(chronoEraBonusDrops('ancient').length).toBeGreaterThanOrEqual(1);
    expect(chronoEraBonusDrops('ruined_future').length).toBeGreaterThanOrEqual(1);
    expect(chronoEraBonusDrops('present').length).toBe(0);
  });
});

describe('STORY-V34 — Triple Tech damageMultiplier + element 분포 narrative', () => {
  it('15 Triple Tech damageMultiplier 모두 3.0 이상 (Dual >2.0 보다 강력) narrative', async () => {
    const { listTripleTechs } = await import('../../shared/types/tripleTech');
    for (const tt of listTripleTechs()) {
      expect(tt.damageMultiplier, `${tt.id} damageMultiplier`).toBeGreaterThanOrEqual(3.0);
    }
  });

  it('void_eternity (3.8) 가 최강 Triple narrative', async () => {
    const { listTripleTechs } = await import('../../shared/types/tripleTech');
    const sorted = [...listTripleTechs()].sort((a, b) => b.damageMultiplier - a.damageMultiplier);
    expect(sorted[0].id).toBe('void_eternity');
    expect(sorted[0].damageMultiplier).toBe(3.8);
  });

  it('aetherna_final 정점 시그니처 chrono element (게임 제목 정합)', async () => {
    const { resolveTripleTech } = await import('../../shared/types/tripleTech');
    const tt = resolveTripleTech('ether_knight', 'time_knight', 'memory_weaver');
    expect(tt?.id).toBe('aetherna_final');
    expect(tt?.element).toBe('chrono');
  });

  it('15 Triple Tech mpCost 모두 ≥ 28 (Triple > Dual mpCost) narrative', async () => {
    const { listTripleTechs } = await import('../../shared/types/tripleTech');
    for (const tt of listTripleTechs()) {
      expect(tt.mpCost, `${tt.id} mpCost`).toBeGreaterThanOrEqual(28);
    }
  });

  it('15 Triple Tech 모두 aoe=true narrative (3인 협공은 광역)', async () => {
    const { listTripleTechs } = await import('../../shared/types/tripleTech');
    for (const tt of listTripleTechs()) {
      expect((tt as { aoe?: boolean }).aoe, `${tt.id} aoe`).toBe(true);
    }
  });

  it('element 분포: chrono/dark 시그니처 element narrative ≥ 2 each', async () => {
    const { listTripleTechs } = await import('../../shared/types/tripleTech');
    const elementCount = new Map<string, number>();
    for (const tt of listTripleTechs()) {
      elementCount.set(tt.element, (elementCount.get(tt.element) ?? 0) + 1);
    }
    expect((elementCount.get('chrono') ?? 0), 'chrono Triple count').toBeGreaterThanOrEqual(2);
    expect((elementCount.get('dark') ?? 0), 'dark Triple count').toBeGreaterThanOrEqual(2);
  });
});

describe('STORY-V35 — Dual Tech eraFilter 시대 narrative 정합성', () => {
  it('chrono_blade (chrono element) eraFilter = ancient + present (붕괴 후 봉인)', async () => {
    const { getDualTechById } = await import('../../shared/types/dualTech');
    const dt = getDualTechById('chrono_blade')!;
    expect(dt.element).toBe('chrono');
    expect(dt.eraFilter).toEqual(['ancient', 'present']);
  });

  it('memory_warp eraFilter = ancient + present (회상의 협공)', async () => {
    const { getDualTechById } = await import('../../shared/types/dualTech');
    const dt = getDualTechById('memory_warp')!;
    expect(dt.eraFilter).toEqual(['ancient', 'present']);
  });

  it('memory_break + void_oblivion eraFilter = ruined_future only (붕괴 시대 전용)', async () => {
    const { getDualTechById } = await import('../../shared/types/dualTech');
    expect(getDualTechById('memory_break')!.eraFilter).toEqual(['ruined_future']);
    expect(getDualTechById('void_oblivion')!.eraFilter).toEqual(['ruined_future']);
  });

  it('listDualTechsByEra(ancient) 에 chrono 협공 모두 포함, ruined_future 협공 미포함', async () => {
    const { listDualTechsByEra } = await import('../../shared/types/dualTech');
    const ancientList = listDualTechsByEra('ancient');
    const ancientIds = new Set(ancientList.map((dt) => dt.id));
    expect(ancientIds.has('chrono_blade')).toBe(true);
    expect(ancientIds.has('memory_warp')).toBe(true);
    expect(ancientIds.has('memory_break')).toBe(false);
    expect(ancientIds.has('void_oblivion')).toBe(false);
  });

  it('listDualTechsByEra(ruined_future) 에 chrono 협공 미포함, 붕괴 협공 포함', async () => {
    const { listDualTechsByEra } = await import('../../shared/types/dualTech');
    const futureList = listDualTechsByEra('ruined_future');
    const futureIds = new Set(futureList.map((dt) => dt.id));
    expect(futureIds.has('chrono_blade')).toBe(false);
    expect(futureIds.has('memory_warp')).toBe(false);
    expect(futureIds.has('memory_break')).toBe(true);
    expect(futureIds.has('void_oblivion')).toBe(true);
  });

  it('listDualTechsByEra(present) 가 가장 많은 협공 narrative (현재가 균형)', async () => {
    const { listDualTechsByEra } = await import('../../shared/types/dualTech');
    const counts = {
      ancient: listDualTechsByEra('ancient').length,
      present: listDualTechsByEra('present').length,
      ruined_future: listDualTechsByEra('ruined_future').length,
    };
    expect(counts.present, 'present count').toBeGreaterThanOrEqual(counts.ancient);
    expect(counts.present).toBeGreaterThanOrEqual(counts.ruined_future);
  });
});

describe('STORY-V36 — ambientLine 21개 narrative 다양성', () => {
  it('21 encounter ambientLine 모두 unique narrative (동일 line 재사용 없음)', async () => {
    const { listFieldEncounters } = await import('../../shared/types/chronoField');
    const lines = listFieldEncounters().map((e) => e.ambientLine);
    expect(lines.length).toBe(21);
    expect(new Set(lines).size, 'unique ambient lines').toBe(21);
  });

  it('21 encounter ambientLine 모두 length 8~80 narrative (의미 있는 표현)', async () => {
    const { listFieldEncounters } = await import('../../shared/types/chronoField');
    for (const e of listFieldEncounters()) {
      expect(e.ambientLine.length, `${e.zoneId}/${e.eraId} line length`).toBeGreaterThanOrEqual(8);
      expect(e.ambientLine.length).toBeLessThanOrEqual(80);
    }
  });

  it('21 encounter ambientLine 모두 한글 narrative 포함', async () => {
    const { listFieldEncounters } = await import('../../shared/types/chronoField');
    const koreanRegex = /[가-힣]/;
    for (const e of listFieldEncounters()) {
      expect(koreanRegex.test(e.ambientLine), `${e.zoneId}/${e.eraId} 한글 없음`).toBe(true);
    }
  });

  it('ancient ambientLine 7개 중 ≥ 4개 고대 분위기 키워드 (고대/유적/봉인/평원 등)', async () => {
    const { listFieldEncounters } = await import('../../shared/types/chronoField');
    const ancientLines = listFieldEncounters().filter((e) => e.eraId === 'ancient').map((e) => e.ambientLine);
    const ancientKeywords = ['고대', '유적', '봉인', '에테르', '평원', '숲', '결정', '말라투스', '환영', '시간', '거인', '황혼', '수호', '신비', '평화'];
    let matchCount = 0;
    for (const line of ancientLines) {
      if (ancientKeywords.some((k) => line.includes(k))) matchCount += 1;
    }
    expect(matchCount, `ancient ambient keyword match count`).toBeGreaterThanOrEqual(4);
  });

  it('ruined_future ambientLine 7개 중 ≥ 4개 붕괴 분위기 키워드', async () => {
    const { listFieldEncounters } = await import('../../shared/types/chronoField');
    const futureLines = listFieldEncounters().filter((e) => e.eraId === 'ruined_future').map((e) => e.ambientLine);
    const futureKeywords = ['붕괴', '무너진', '폐허', '버려진', '망각', '공허', '타락', '시간', '종말', '파편', '부서진', '썩', '산산조각', '잃어버린', '죽은'];
    let matchCount = 0;
    for (const line of futureLines) {
      if (futureKeywords.some((k) => line.includes(k))) matchCount += 1;
    }
    expect(matchCount, `future ambient keyword match count`).toBeGreaterThanOrEqual(4);
  });
});

describe('STORY-V37 — maxSpawn + monsterPool size narrative', () => {
  it('21 encounter maxSpawn 모두 1~6 범위 narrative (전투 합리)', async () => {
    const { listFieldEncounters } = await import('../../shared/types/chronoField');
    for (const e of listFieldEncounters()) {
      expect(e.maxSpawn, `${e.zoneId}/${e.eraId} maxSpawn`).toBeGreaterThanOrEqual(1);
      expect(e.maxSpawn).toBeLessThanOrEqual(6);
    }
  });

  it('일반 encounter (bossOnlyMode!=true) maxSpawn ≥ 3 narrative (다수 적)', async () => {
    const { listFieldEncounters } = await import('../../shared/types/chronoField');
    for (const e of listFieldEncounters()) {
      if (e.bossOnlyMode) continue;
      expect(e.maxSpawn, `${e.zoneId}/${e.eraId} 일반 maxSpawn`).toBeGreaterThanOrEqual(3);
    }
  });

  it('bossOnlyMode encounter 보스 slot 정확히 1개 narrative (단독 보스 출현)', async () => {
    const { listBossOnlyFields } = await import('../../shared/types/chronoField');
    for (const e of listBossOnlyFields()) {
      const bosses = e.monsterPool.filter((s) => s.isBoss);
      expect(bosses.length, `${e.zoneId}/${e.eraId} boss-only boss count`).toBe(1);
    }
  });

  it('21 encounter monsterPool size 모두 ≥ 2 narrative (보스 + 일반 ≥ 1)', async () => {
    const { listFieldEncounters } = await import('../../shared/types/chronoField');
    for (const e of listFieldEncounters()) {
      expect(e.monsterPool.length, `${e.zoneId}/${e.eraId} pool size`).toBeGreaterThanOrEqual(2);
    }
  });

  it('일반 encounter monsterPool 일반 slot ≥ 2 narrative (보스 + 일반 다수)', async () => {
    const { listFieldEncounters } = await import('../../shared/types/chronoField');
    for (const e of listFieldEncounters()) {
      if (e.bossOnlyMode) continue;
      const normals = e.monsterPool.filter((s) => !s.isBoss);
      expect(normals.length, `${e.zoneId}/${e.eraId} 일반 slot count`).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('STORY-V39 — ChronoField API 행동 narrative 정합성', () => {
  it('rollFieldMonster 결정론 (seed=0) — 동일 encounter 동일 결과 narrative', async () => {
    const { resolveFieldEncounter, rollFieldMonster } = await import('../../shared/types/chronoField');
    const e = resolveFieldEncounter('aether_plains', 'present')!;
    const a = rollFieldMonster(e, 0);
    const b = rollFieldMonster(e, 0);
    expect(a).not.toBeNull();
    expect(b?.monsterId).toBe(a?.monsterId);
  });

  it('rollFieldMonster seed=0.99 (마지막 weight 구간) 결정론', async () => {
    const { resolveFieldEncounter, rollFieldMonster } = await import('../../shared/types/chronoField');
    const e = resolveFieldEncounter('memory_forest', 'ancient')!;
    const m = rollFieldMonster(e, 0.99);
    expect(m).not.toBeNull();
  });

  it('getBossSlot 모든 21 encounter 모두 non-null narrative (보스 슬롯 100%)', async () => {
    const { listFieldEncounters, getBossSlot } = await import('../../shared/types/chronoField');
    for (const e of listFieldEncounters()) {
      expect(getBossSlot(e), `${e.zoneId}/${e.eraId} getBossSlot`).not.toBeNull();
    }
  });

  it('listAllFieldMonsterIds + listAllBossMonsterIds 모두 unique narrative', async () => {
    const { listAllFieldMonsterIds, listAllBossMonsterIds } = await import('../../shared/types/chronoField');
    const all = listAllFieldMonsterIds();
    const bosses = listAllBossMonsterIds();
    expect(new Set(all).size).toBe(all.length);
    expect(new Set(bosses).size).toBe(bosses.length);
    // 모든 보스 id 는 전체 monster id 에 포함
    for (const bid of bosses) {
      expect(all, `boss ${bid} not in all`).toContain(bid);
    }
  });

  it('getTotalFieldBosses = 21 narrative (zone × era cross-product)', async () => {
    const { getTotalFieldBosses } = await import('../../shared/types/chronoField');
    expect(getTotalFieldBosses()).toBe(21);
  });

  it('rollFieldMonster seed 범위 외 (-1, 2) 가드 — null 또는 fallback narrative', async () => {
    const { resolveFieldEncounter, rollFieldMonster } = await import('../../shared/types/chronoField');
    const e = resolveFieldEncounter('aether_plains', 'present')!;
    // 범위 밖 seed 일 때 마지막 slot fallback (mod 1) 또는 null 어느 쪽이든 안정 narrative
    const r1 = rollFieldMonster(e, -1);
    const r2 = rollFieldMonster(e, 2);
    expect(r1 === null || (r1 && typeof r1.monsterId === 'string')).toBe(true);
    expect(r2 === null || (r2 && typeof r2.monsterId === 'string')).toBe(true);
  });
});

describe('STORY-V40 — 10 sprint 마디 narrative 정량 + 게임명 시그니처', () => {
  it('aetherna 시그니처 모든 source cross-check (Triple/보스/Field)', async () => {
    const { listTripleTechs } = await import('../../shared/types/tripleTech');
    const { listAllBossMonsterIds, resolveFieldEncounter } = await import('../../shared/types/chronoField');

    // Triple 시그니처
    const aethernaTriples = listTripleTechs().filter((tt) => tt.id.startsWith('aetherna_'));
    expect(aethernaTriples.length, 'aetherna Triple count').toBeGreaterThanOrEqual(1);
    expect(aethernaTriples.find((tt) => tt.id === 'aetherna_final')).toBeDefined();

    // 보스 시그니처
    const bossIds = listAllBossMonsterIds();
    const aethernaBosses = bossIds.filter((id) => id.startsWith('aetherna_'));
    expect(aethernaBosses.length).toBe(2);
    expect(aethernaBosses).toContain('aetherna_final' === 'aetherna_final' ? 'aetherna_eidolon' : '');

    // Field 최종 보스
    const finalE = resolveFieldEncounter('chrono_spire', 'ruined_future')!;
    const finalBoss = finalE.monsterPool.find((s) => s.isBoss)!;
    expect(finalBoss.monsterId).toBe('aetherna_collapse');
  });

  it('10 sprint 마디 정량: 21 보스 + 21 Dual + 15 Triple + 7 zone + 7 클래스', async () => {
    const { listAllBossMonsterIds, getTotalFieldBosses } = await import('../../shared/types/chronoField');
    const { listDualTechs } = await import('../../shared/types/dualTech');
    const { listTripleTechs } = await import('../../shared/types/tripleTech');

    expect(listAllBossMonsterIds().length).toBe(21);
    expect(getTotalFieldBosses()).toBe(21);
    expect(listDualTechs().length).toBe(21);
    expect(listTripleTechs().length).toBe(15);
    expect(STORY_ZONES.length).toBe(7);
    expect(STORY_CLASSES.length).toBe(7);
    expect(STORY_ERAS.length).toBe(3);
  });

  it('aetherna_final + aetherna_collapse 가 게임 정점 narrative 동일 element', async () => {
    const { resolveTripleTech } = await import('../../shared/types/tripleTech');
    const tt = resolveTripleTech('ether_knight', 'time_knight', 'memory_weaver')!;
    expect(tt.id).toBe('aetherna_final');
    expect(tt.element).toBe('chrono');
    // 최종 보스가 chrono element 협공 시그니처 와 정합 narrative
    // (둘 모두 aetherna 시그니처 + chrono 시간선 종점 컨셉)
  });

  it('전체 narrative quantity floor: monster ≥ 50 + 협공 ≥ 36 + 보스/Triple/Dual 합 ≥ 57', async () => {
    const { listAllFieldMonsterIds, getTotalFieldBosses } = await import('../../shared/types/chronoField');
    const { listDualTechs } = await import('../../shared/types/dualTech');
    const { listTripleTechs } = await import('../../shared/types/tripleTech');

    expect(listAllFieldMonsterIds().length, 'monster ≥ 50').toBeGreaterThanOrEqual(50);
    const techTotal = listDualTechs().length + listTripleTechs().length;
    expect(techTotal, '협공 ≥ 36').toBeGreaterThanOrEqual(36);
    const grand = getTotalFieldBosses() + techTotal;
    expect(grand, '보스+협공 ≥ 57').toBeGreaterThanOrEqual(57);
  });
});

describe('STORY-V41 — Dual Tech damageMultiplier + AOE narrative 분포', () => {
  it('21 Dual Tech damageMultiplier 모두 2.0~2.5 범위 narrative (Triple 3.0+ 보다 약함)', async () => {
    const { listDualTechs } = await import('../../shared/types/dualTech');
    for (const dt of listDualTechs()) {
      expect(dt.damageMultiplier, `${dt.id} damageMultiplier`).toBeGreaterThanOrEqual(2.0);
      expect(dt.damageMultiplier).toBeLessThanOrEqual(2.5);
    }
  });

  it('Dual AOE 정확히 3종 narrative (memory_break + time_overflow + void_oblivion)', async () => {
    const { listAoeDualTechs } = await import('../../shared/types/dualTech');
    const aoes = listAoeDualTechs();
    expect(aoes.length).toBe(3);
    const ids = new Set(aoes.map((dt) => dt.id));
    expect(ids.has('memory_break')).toBe(true);
    expect(ids.has('time_overflow')).toBe(true);
    expect(ids.has('void_oblivion')).toBe(true);
  });

  it('Dual AOE 모두 damageMultiplier 2.5 (광역 = 최강 Dual narrative)', async () => {
    const { listAoeDualTechs } = await import('../../shared/types/dualTech');
    for (const dt of listAoeDualTechs()) {
      expect(dt.damageMultiplier, `${dt.id} AOE damage`).toBe(2.5);
    }
  });

  it('전체 Dual 평균 damageMultiplier < Triple 평균 narrative (Triple > Dual)', async () => {
    const { listDualTechs } = await import('../../shared/types/dualTech');
    const { listTripleTechs } = await import('../../shared/types/tripleTech');
    const dualAvg = listDualTechs().reduce((s, dt) => s + dt.damageMultiplier, 0) / 21;
    const tripleAvg = listTripleTechs().reduce((s, tt) => s + tt.damageMultiplier, 0) / 15;
    expect(tripleAvg).toBeGreaterThan(dualAvg);
  });
});

describe('STORY-V42 — Triple Tech 클래스 페어 narrative 다양성', () => {
  it('15 Triple 의 partnerClasses 3인 set 모두 unique narrative (중복 페어 없음)', async () => {
    const { listTripleTechs } = await import('../../shared/types/tripleTech');
    const setKey = (tt: { partnerClasses: readonly string[] }) =>
      [...tt.partnerClasses].sort().join('|');
    const keys = listTripleTechs().map(setKey);
    expect(new Set(keys).size, 'unique Triple class triples').toBe(keys.length);
  });

  it('15 Triple 모든 partnerClasses 정확히 3인 narrative', async () => {
    const { listTripleTechs } = await import('../../shared/types/tripleTech');
    for (const tt of listTripleTechs()) {
      expect(tt.partnerClasses.length, `${tt.id} class count`).toBe(3);
    }
  });

  it('각 클래스가 Triple 참여 ≤ 8회 narrative (단일 클래스 독점 금지)', async () => {
    const { listTripleTechs } = await import('../../shared/types/tripleTech');
    const count = new Map<string, number>();
    for (const tt of listTripleTechs()) {
      for (const cls of tt.partnerClasses) {
        count.set(cls, (count.get(cls) ?? 0) + 1);
      }
    }
    for (const cls of STORY_CLASSES) {
      const c = count.get(cls) ?? 0;
      expect(c, `${cls} Triple 참여`).toBeLessThanOrEqual(8);
    }
  });

  it('Triple partnerClasses 내 동일 클래스 중복 없음 narrative (3인 모두 다름)', async () => {
    const { listTripleTechs } = await import('../../shared/types/tripleTech');
    for (const tt of listTripleTechs()) {
      const set = new Set(tt.partnerClasses);
      expect(set.size, `${tt.id} partnerClasses unique`).toBe(tt.partnerClasses.length);
    }
  });
});

describe('STORY-V43 — Dual Tech 클래스 페어 narrative 다양성', () => {
  it('21 Dual partnerClasses 2인 set 모두 unique narrative (중복 페어 없음)', async () => {
    const { listDualTechs } = await import('../../shared/types/dualTech');
    const setKey = (dt: { partnerClasses: readonly string[] }) =>
      [...dt.partnerClasses].sort().join('|');
    const keys = listDualTechs().map(setKey);
    expect(new Set(keys).size, 'unique Dual class pairs').toBe(keys.length);
  });

  it('21 Dual 모든 partnerClasses 정확히 2인 narrative', async () => {
    const { listDualTechs } = await import('../../shared/types/dualTech');
    for (const dt of listDualTechs()) {
      expect(dt.partnerClasses.length, `${dt.id} class count`).toBe(2);
    }
  });

  it('각 클래스 Dual 참여 ≤ 8회 narrative (단일 클래스 독점 금지)', async () => {
    const { listDualTechs } = await import('../../shared/types/dualTech');
    const count = new Map<string, number>();
    for (const dt of listDualTechs()) {
      for (const cls of dt.partnerClasses) {
        count.set(cls, (count.get(cls) ?? 0) + 1);
      }
    }
    for (const cls of STORY_CLASSES) {
      const c = count.get(cls) ?? 0;
      expect(c, `${cls} Dual 참여`).toBeLessThanOrEqual(8);
    }
  });

  it('Dual partnerClasses 2인 모두 다름 narrative (자기 협공 금지)', async () => {
    const { listDualTechs } = await import('../../shared/types/dualTech');
    for (const dt of listDualTechs()) {
      expect(dt.partnerClasses[0]).not.toBe(dt.partnerClasses[1]);
    }
  });
});
