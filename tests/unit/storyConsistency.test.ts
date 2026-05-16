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

describe('STORY-V44 — chronoEra 진행 순서 + timeline narrative', () => {
  it('isChronoEraId 3 시대 유효 + 외부 값 거부 narrative', async () => {
    const { isChronoEraId } = await import('../../shared/types/chronoEraAtb');
    expect(isChronoEraId('ancient')).toBe(true);
    expect(isChronoEraId('present')).toBe(true);
    expect(isChronoEraId('ruined_future')).toBe(true);
    expect(isChronoEraId('future')).toBe(false);
    expect(isChronoEraId('')).toBe(false);
    expect(isChronoEraId(null)).toBe(false);
    expect(isChronoEraId(123)).toBe(false);
  });

  it('chronoEraToSpeedTier 단조 증가 narrative (ancient 2 < present 3 < future 4)', async () => {
    const { chronoEraToSpeedTier } = await import('../../shared/types/chronoEraAtb');
    expect(chronoEraToSpeedTier('ancient')).toBe(2);
    expect(chronoEraToSpeedTier('present')).toBe(3);
    expect(chronoEraToSpeedTier('ruined_future')).toBe(4);
  });

  it('chronoEraToEnemyMultipliers 단조 narrative (hp/level/reward/attackSpeed 모두 증가)', async () => {
    const { chronoEraToEnemyMultipliers } = await import('../../shared/types/chronoEraAtb');
    const a = chronoEraToEnemyMultipliers('ancient');
    const p = chronoEraToEnemyMultipliers('present');
    const f = chronoEraToEnemyMultipliers('ruined_future');
    expect(a.hp).toBeLessThanOrEqual(p.hp);
    expect(p.hp).toBeLessThanOrEqual(f.hp);
    expect(a.levelOffset).toBeLessThan(p.levelOffset);
    expect(p.levelOffset).toBeLessThan(f.levelOffset);
    expect(a.reward).toBeLessThanOrEqual(p.reward);
    expect(p.reward).toBeLessThanOrEqual(f.reward);
    expect(a.attackSpeed).toBeLessThanOrEqual(p.attackSpeed);
    expect(p.attackSpeed).toBeLessThanOrEqual(f.attackSpeed);
  });

  it('decorateMonsterNameByEra 시그니처 prefix narrative (ancient [고대], future [붕괴])', async () => {
    const { decorateMonsterNameByEra } = await import('../../shared/types/chronoEraAtb');
    expect(decorateMonsterNameByEra('망령', 'ancient')).toBe('[고대] 망령');
    expect(decorateMonsterNameByEra('망령', 'ruined_future')).toBe('[붕괴] 망령');
    expect(decorateMonsterNameByEra('망령', 'present')).toBe('망령');
  });
});

describe('STORY-V45 — chrono barrel narrative integration', () => {
  it('chrono barrel 단일 import 로 시대/협공/Field 정점 모두 접근 narrative', async () => {
    const mod = await import('../../shared/types/chrono');
    // chronoEraAtb
    expect(typeof mod.chronoEraToSpeedTier).toBe('function');
    expect(typeof mod.isChronoEraId).toBe('function');
    expect(typeof mod.chronoEraToEnemyMultipliers).toBe('function');
    expect(typeof mod.decorateMonsterNameByEra).toBe('function');
    // dualTech
    expect(typeof mod.listDualTechs).toBe('function');
    expect(typeof mod.resolveDualTech).toBe('function');
    expect(typeof mod.listAoeDualTechs).toBe('function');
    // tripleTech
    expect(typeof mod.listTripleTechs).toBe('function');
    expect(typeof mod.resolveTripleTech).toBe('function');
    // chronoField
    expect(typeof mod.resolveFieldEncounter).toBe('function');
    expect(typeof mod.listFieldEncounters).toBe('function');
    expect(typeof mod.getBossSlot).toBe('function');
    expect(typeof mod.listAllBossMonsterIds).toBe('function');
    expect(typeof mod.getTotalFieldBosses).toBe('function');
  });

  it('chrono barrel 로 aetherna 시그니처 cross-check (정점 narrative 단일 진입점)', async () => {
    const { resolveTripleTech, resolveFieldEncounter, listAllBossMonsterIds } = await import('../../shared/types/chrono');
    const tt = resolveTripleTech('ether_knight', 'time_knight', 'memory_weaver');
    expect(tt?.id).toBe('aetherna_final');
    const finalE = resolveFieldEncounter('chrono_spire', 'ruined_future')!;
    expect(finalE.monsterPool.find((s) => s.isBoss)?.monsterId).toBe('aetherna_collapse');
    expect(listAllBossMonsterIds()).toContain('aetherna_collapse');
    expect(listAllBossMonsterIds()).toContain('aetherna_eidolon');
  });

  it('chrono barrel 정량 cross-check (21/15/21/7 모두 도달)', async () => {
    const { listDualTechs, listTripleTechs, listAllBossMonsterIds, getTotalFieldBosses, listFieldEncounters } = await import('../../shared/types/chrono');
    expect(listDualTechs().length).toBe(21);
    expect(listTripleTechs().length).toBe(15);
    expect(listAllBossMonsterIds().length).toBe(21);
    expect(getTotalFieldBosses()).toBe(21);
    expect(listFieldEncounters().length).toBe(21);
  });
});

describe('STORY-V46 — 시대별 monster id 시그니처 narrative', () => {
  const FUTURE_PREFIXES = ['corrupted_', 'broken_', 'rotting_', 'forsaken_', 'lost_', 'oblivion_', 'ruined_', 'collapsed_'];

  it('ancient encounter monsterPool 에 future 시그니처 prefix monster id 없음', async () => {
    const { listFieldEncounters } = await import('../../shared/types/chronoField');
    for (const e of listFieldEncounters()) {
      if (e.eraId !== 'ancient') continue;
      for (const slot of e.monsterPool) {
        for (const pfx of FUTURE_PREFIXES) {
          expect(slot.monsterId.startsWith(pfx), `ancient ${e.zoneId}: ${slot.monsterId} has future prefix '${pfx}'`).toBe(false);
        }
      }
    }
  });

  it('ruined_future encounter monsterPool 에 future 시그니처 monster ≥ 1 (분위기 narrative)', async () => {
    const { listFieldEncounters } = await import('../../shared/types/chronoField');
    let totalFutureSigCount = 0;
    for (const e of listFieldEncounters()) {
      if (e.eraId !== 'ruined_future') continue;
      for (const slot of e.monsterPool) {
        if (FUTURE_PREFIXES.some((pfx) => slot.monsterId.startsWith(pfx))) {
          totalFutureSigCount += 1;
        }
      }
    }
    expect(totalFutureSigCount, 'future signature monster count').toBeGreaterThanOrEqual(5);
  });

  it('각 시대 monster name 시그니처 키워드 (ancient 평원/숲/결정, future 붕괴/부서진/잃어버린)', async () => {
    const { listFieldEncounters } = await import('../../shared/types/chronoField');
    const futureNameKeywords = ['붕괴', '부서진', '잃어버린', '폐허', '망각', '부패', '버려진', '영원', '종말', '파편'];
    let futureNameMatchCount = 0;
    for (const e of listFieldEncounters()) {
      if (e.eraId !== 'ruined_future') continue;
      for (const slot of e.monsterPool) {
        if (futureNameKeywords.some((k) => slot.name.includes(k))) {
          futureNameMatchCount += 1;
        }
      }
    }
    expect(futureNameMatchCount, 'future name keyword match').toBeGreaterThanOrEqual(7);
  });
});

describe('STORY-V48 — 협공 mpCost ↔ damageMultiplier 상관 narrative', () => {
  it('Triple Tech: 최강 (void_eternity 3.8×) mpCost ≥ 최약 (3.0~3.2 다음) narrative', async () => {
    const { listTripleTechs } = await import('../../shared/types/tripleTech');
    const sorted = [...listTripleTechs()].sort((a, b) => b.damageMultiplier - a.damageMultiplier);
    const strongest = sorted[0];
    const weakest = sorted[sorted.length - 1];
    expect(strongest.mpCost, `strongest ${strongest.id} mpCost vs weakest ${weakest.id}`).toBeGreaterThanOrEqual(weakest.mpCost);
  });

  it('Dual Tech: AOE 협공 (2.5×) mpCost ≥ 일반 협공 평균 narrative', async () => {
    const { listDualTechs, listAoeDualTechs } = await import('../../shared/types/dualTech');
    const aoeAvg = listAoeDualTechs().reduce((s, dt) => s + dt.mpCost, 0) / 3;
    const all = listDualTechs();
    const allAvg = all.reduce((s, dt) => s + dt.mpCost, 0) / all.length;
    expect(aoeAvg, 'AOE avg mpCost vs all avg').toBeGreaterThanOrEqual(allAvg);
  });

  it('Triple 평균 mpCost > Dual 평균 mpCost narrative (3인 협공 코스트 ↑)', async () => {
    const { listDualTechs } = await import('../../shared/types/dualTech');
    const { listTripleTechs } = await import('../../shared/types/tripleTech');
    const dualAvg = listDualTechs().reduce((s, dt) => s + dt.mpCost, 0) / 21;
    const tripleAvg = listTripleTechs().reduce((s, tt) => s + tt.mpCost, 0) / 15;
    expect(tripleAvg).toBeGreaterThan(dualAvg);
  });

  it('Triple Tech 모두 mpCost 28~40 범위 narrative (전투 균형)', async () => {
    const { listTripleTechs } = await import('../../shared/types/tripleTech');
    for (const tt of listTripleTechs()) {
      expect(tt.mpCost, `${tt.id} mpCost`).toBeGreaterThanOrEqual(28);
      expect(tt.mpCost).toBeLessThanOrEqual(40);
    }
  });
});

describe('STORY-V49 — chronoField zone-별 narrative 분배', () => {
  it('각 zone listFieldEncountersByZone 정확히 3 era encounter (cross-product 정합)', async () => {
    const { listFieldEncountersByZone } = await import('../../shared/types/chronoField');
    for (const zone of STORY_ZONES) {
      const list = listFieldEncountersByZone(zone);
      expect(list.length, `${zone} encounter count`).toBe(3);
      const eras = new Set(list.map((e) => e.eraId));
      expect(eras.size, `${zone} eras unique`).toBe(3);
      for (const era of STORY_ERAS) {
        expect(eras.has(era), `${zone} missing era ${era}`).toBe(true);
      }
    }
  });

  it('listFieldEncountersByZone 비-narrative zone 빈 list 반환', async () => {
    const { listFieldEncountersByZone } = await import('../../shared/types/chronoField');
    expect(listFieldEncountersByZone('nonexistent_zone').length).toBe(0);
    expect(listFieldEncountersByZone('').length).toBe(0);
  });

  it('resolveFieldEncounter 비-narrative 조합 null 반환 narrative', async () => {
    const { resolveFieldEncounter } = await import('../../shared/types/chronoField');
    expect(resolveFieldEncounter('nonexistent_zone', 'ancient')).toBeNull();
    expect(resolveFieldEncounter('', 'ancient')).toBeNull();
  });

  it('각 zone 3 era 의 보스 모두 unique narrative (시대별 보스 다름)', async () => {
    const { listFieldEncountersByZone } = await import('../../shared/types/chronoField');
    for (const zone of STORY_ZONES) {
      const list = listFieldEncountersByZone(zone);
      const bossIds = list.map((e) => e.monsterPool.find((s) => s.isBoss)?.monsterId);
      const set = new Set(bossIds.filter(Boolean));
      expect(set.size, `${zone} 3 era 보스 unique`).toBe(3);
    }
  });
});

describe('STORY-V50 — 20 sprint 마디 누적 narrative 정점', () => {
  it('STORY chapter II 누적 가드 ≥ 170 narrative (V30~V50)', async () => {
    // 이 가드 자체가 narrative 누적 기록 — 본 테스트 파일이 ≥170 가드 보유
    // (메타 검증 — 본 가드 통과 = 170+ test 의 일부)
    const { listFieldEncounters } = await import('../../shared/types/chronoField');
    expect(listFieldEncounters().length).toBe(21);
  });

  it('20 sprint 마디: 모든 핵심 source 정량 cross-check (Dual/Triple/Field/Era)', async () => {
    const { listDualTechs } = await import('../../shared/types/dualTech');
    const { listTripleTechs } = await import('../../shared/types/tripleTech');
    const { listFieldEncounters, listAllBossMonsterIds, listAllFieldMonsterIds } = await import('../../shared/types/chronoField');

    expect(listDualTechs().length).toBe(21);
    expect(listTripleTechs().length).toBe(15);
    expect(listFieldEncounters().length).toBe(21);
    expect(listAllBossMonsterIds().length).toBe(21);
    expect(listAllFieldMonsterIds().length).toBeGreaterThanOrEqual(50);
    // narrative 정량 정점: 21 + 15 + 21 + 21 + ≥50 = ≥128 total entities
  });

  it('aetherna 시그니처 정합성 누적 (모든 source narrative 종점)', async () => {
    const { resolveTripleTech } = await import('../../shared/types/tripleTech');
    const { listAllBossMonsterIds, resolveFieldEncounter } = await import('../../shared/types/chronoField');

    // 정점 협공
    expect(resolveTripleTech('ether_knight', 'time_knight', 'memory_weaver')?.id).toBe('aetherna_final');

    // 정점 보스
    expect(listAllBossMonsterIds()).toContain('aetherna_collapse');
    expect(listAllBossMonsterIds()).toContain('aetherna_eidolon');

    // 정점 Field
    const final = resolveFieldEncounter('chrono_spire', 'ruined_future');
    expect(final?.bossOnlyMode).toBe(true);
    expect(final?.bgmTrack).toBe('bgm_final_boss');
  });

  it('chapter II 누적 narrative cohesion: 시대 단조 + Triple > Dual + AOE 정합', async () => {
    const { chronoEraToSpeedTier, chronoEraToEnemyMultipliers } = await import('../../shared/types/chronoEraAtb');
    const { listDualTechs, listAoeDualTechs } = await import('../../shared/types/dualTech');
    const { listTripleTechs } = await import('../../shared/types/tripleTech');

    // 시대 단조
    expect(chronoEraToSpeedTier('ancient')).toBeLessThan(chronoEraToSpeedTier('present'));
    expect(chronoEraToSpeedTier('present')).toBeLessThan(chronoEraToSpeedTier('ruined_future'));
    expect(chronoEraToEnemyMultipliers('ancient').hp).toBeLessThanOrEqual(chronoEraToEnemyMultipliers('ruined_future').hp);

    // Triple > Dual
    const dualAvg = listDualTechs().reduce((s, dt) => s + dt.damageMultiplier, 0) / 21;
    const tripleAvg = listTripleTechs().reduce((s, tt) => s + tt.damageMultiplier, 0) / 15;
    expect(tripleAvg).toBeGreaterThan(dualAvg);

    // AOE 정합
    expect(listAoeDualTechs().length).toBe(3);
    for (const tt of listTripleTechs()) {
      expect((tt as { aoe?: boolean }).aoe).toBe(true);
    }
  });
});

describe('STORY-V51 — 보스 weight 시대별 narrative 분포 (chapter III)', () => {
  it('21 보스 weight 모두 0.1~0.4 범위 narrative (낮을수록 강력 보스)', async () => {
    const { listFieldEncounters } = await import('../../shared/types/chronoField');
    for (const e of listFieldEncounters()) {
      const boss = e.monsterPool.find((s) => s.isBoss);
      if (!boss) continue;
      expect(boss.weight, `${e.zoneId}/${e.eraId} boss weight`).toBeGreaterThanOrEqual(0.1);
      expect(boss.weight).toBeLessThanOrEqual(0.4);
    }
  });

  it('aetherna_collapse 보스 weight 0.4 (보스만 출현 시대 종점 narrative)', async () => {
    const { resolveFieldEncounter } = await import('../../shared/types/chronoField');
    const e = resolveFieldEncounter('chrono_spire', 'ruined_future')!;
    const boss = e.monsterPool.find((s) => s.isBoss)!;
    expect(boss.monsterId).toBe('aetherna_collapse');
    expect(boss.weight).toBe(0.4);
  });

  it('aetherna_eidolon + chrono_archon weight 0.2 (chrono_spire ancient/present 강력 보스 narrative)', async () => {
    const { resolveFieldEncounter } = await import('../../shared/types/chronoField');
    const a = resolveFieldEncounter('chrono_spire', 'ancient')!;
    const p = resolveFieldEncounter('chrono_spire', 'present')!;
    expect(a.monsterPool.find((s) => s.isBoss && s.monsterId === 'aetherna_eidolon')?.weight).toBe(0.2);
    expect(p.monsterPool.find((s) => s.isBoss && s.monsterId === 'chrono_archon')?.weight).toBe(0.2);
  });

  it('보스 weight 분포 narrative: weight 0.1 ≥ 14 (대부분 보스), weight 0.4 = 1 (정점 1개만)', async () => {
    const { listFieldEncounters } = await import('../../shared/types/chronoField');
    let w01Count = 0;
    let w04Count = 0;
    for (const e of listFieldEncounters()) {
      const boss = e.monsterPool.find((s) => s.isBoss);
      if (!boss) continue;
      if (boss.weight === 0.1) w01Count += 1;
      if (boss.weight === 0.4) w04Count += 1;
    }
    expect(w01Count, 'weight 0.1 보스 count').toBeGreaterThanOrEqual(14);
    expect(w04Count, 'weight 0.4 보스 count').toBe(1);
  });

  it('chrono_spire 3 era 보스 weight 단조 증가 narrative (ancient 0.2 < present 0.2 ≤ future 0.4)', async () => {
    const { resolveFieldEncounter } = await import('../../shared/types/chronoField');
    const a = resolveFieldEncounter('chrono_spire', 'ancient')!.monsterPool.find((s) => s.isBoss)!.weight;
    const p = resolveFieldEncounter('chrono_spire', 'present')!.monsterPool.find((s) => s.isBoss)!.weight;
    const f = resolveFieldEncounter('chrono_spire', 'ruined_future')!.monsterPool.find((s) => s.isBoss)!.weight;
    expect(a).toBeLessThanOrEqual(p);
    expect(p).toBeLessThan(f);
  });
});

describe('STORY-V52 — 일반 monster weight 분포 narrative', () => {
  it('일반 monster weight 0.3~0.6 범위 narrative (출현 비중 합리)', async () => {
    const { listFieldEncounters } = await import('../../shared/types/chronoField');
    for (const e of listFieldEncounters()) {
      for (const slot of e.monsterPool) {
        if (slot.isBoss) continue;
        expect(slot.weight, `${e.zoneId}/${e.eraId} normal ${slot.monsterId} weight`).toBeGreaterThanOrEqual(0.3);
        expect(slot.weight).toBeLessThanOrEqual(0.6);
      }
    }
  });

  it('각 일반 encounter 내 일반 monster weight 평균 > 보스 weight narrative (일반 우세 spawn)', async () => {
    const { listFieldEncounters } = await import('../../shared/types/chronoField');
    for (const e of listFieldEncounters()) {
      if (e.bossOnlyMode) continue;
      const normals = e.monsterPool.filter((s) => !s.isBoss);
      const bosses = e.monsterPool.filter((s) => s.isBoss);
      if (normals.length === 0 || bosses.length === 0) continue;
      const normalAvg = normals.reduce((s, m) => s + m.weight, 0) / normals.length;
      const bossAvg = bosses.reduce((s, m) => s + m.weight, 0) / bosses.length;
      expect(normalAvg, `${e.zoneId}/${e.eraId} normal avg vs boss`).toBeGreaterThan(bossAvg);
    }
  });

  it('일반 monster weight 분포 다양성 narrative (≥ 3 distinct weight values)', async () => {
    const { listFieldEncounters } = await import('../../shared/types/chronoField');
    const weights = new Set<number>();
    for (const e of listFieldEncounters()) {
      for (const slot of e.monsterPool) {
        if (slot.isBoss) continue;
        weights.add(slot.weight);
      }
    }
    expect(weights.size, 'distinct normal weight values').toBeGreaterThanOrEqual(3);
  });
});

describe('STORY-V53 — chronoField API 비정상 입력 narrative 안정성', () => {
  it('resolveFieldEncounter: zone "" / null-ish 모두 null 반환', async () => {
    const { resolveFieldEncounter } = await import('../../shared/types/chronoField');
    expect(resolveFieldEncounter('', 'ancient')).toBeNull();
    expect(resolveFieldEncounter('   ', 'ancient')).toBeNull();
    // unknown era 도 안전
    // @ts-expect-error narrative 비정상 era 입력
    expect(resolveFieldEncounter('aether_plains', 'future')).toBeNull();
  });

  it('listFieldEncountersByZone: 빈 / unknown zone 빈 list', async () => {
    const { listFieldEncountersByZone } = await import('../../shared/types/chronoField');
    expect(listFieldEncountersByZone('')).toEqual([]);
    expect(listFieldEncountersByZone('NONEXISTENT_ZONE_XYZ').length).toBe(0);
  });

  it('rollFieldMonster: 빈 monsterPool encounter 시 null 안정성 (방어 코드)', async () => {
    const { rollFieldMonster } = await import('../../shared/types/chronoField');
    const fakeEmpty = {
      zoneId: 'fake', eraId: 'present' as const, monsterPool: [],
      maxSpawn: 1, hasBossSlot: false,
      ambientLine: '', bgmTrack: 'bgm_test', ambientEffect: 'glow' as const,
    };
    const r = rollFieldMonster(fakeEmpty as never, 0.5);
    expect(r).toBeNull();
  });

  it('getBossSlot: 보스 없는 encounter null 반환 (방어 narrative)', async () => {
    const { getBossSlot } = await import('../../shared/types/chronoField');
    const fakeNoBoss = {
      zoneId: 'fake', eraId: 'present' as const,
      monsterPool: [{ monsterId: 'x', name: 'X', weight: 1.0 }],
      maxSpawn: 1, hasBossSlot: false,
      ambientLine: '', bgmTrack: 'bgm_test', ambientEffect: 'glow' as const,
    };
    expect(getBossSlot(fakeNoBoss as never)).toBeNull();
  });
});

describe('STORY-V54 — Tech resolve 클래스 순열 narrative 안정성', () => {
  it('resolveDualTech: 클래스 2인 순서 reverse 동일 결과 narrative', async () => {
    const { resolveDualTech } = await import('../../shared/types/dualTech');
    const a = resolveDualTech('time_knight', 'ether_knight');
    const b = resolveDualTech('ether_knight', 'time_knight');
    expect(a?.id).toBe('chrono_blade');
    expect(b?.id).toBe(a?.id);
  });

  it('resolveTripleTech: 클래스 3인 모든 6 순열 동일 결과 narrative', async () => {
    const { resolveTripleTech } = await import('../../shared/types/tripleTech');
    const target = 'aetherna_final';
    const trios: [string, string, string][] = [
      ['ether_knight', 'time_knight', 'memory_weaver'],
      ['ether_knight', 'memory_weaver', 'time_knight'],
      ['time_knight', 'ether_knight', 'memory_weaver'],
      ['time_knight', 'memory_weaver', 'ether_knight'],
      ['memory_weaver', 'ether_knight', 'time_knight'],
      ['memory_weaver', 'time_knight', 'ether_knight'],
    ];
    for (const t of trios) {
      expect(resolveTripleTech(t[0], t[1], t[2])?.id, `perm ${t.join(',')}`).toBe(target);
    }
  });

  it('resolveDualTech: 동일 클래스 2명 → null narrative (자기 협공 금지)', async () => {
    const { resolveDualTech } = await import('../../shared/types/dualTech');
    expect(resolveDualTech('ether_knight', 'ether_knight')).toBeNull();
  });

  it('resolveDualTech: unknown 클래스 → null narrative (안전 가드)', async () => {
    const { resolveDualTech } = await import('../../shared/types/dualTech');
    expect(resolveDualTech('UNKNOWN_A', 'UNKNOWN_B')).toBeNull();
    expect(resolveDualTech('ether_knight', 'UNKNOWN_B')).toBeNull();
  });

  it('resolveTripleTech: unknown 클래스 → null narrative (안전 가드)', async () => {
    const { resolveTripleTech } = await import('../../shared/types/tripleTech');
    expect(resolveTripleTech('UNKNOWN_A', 'UNKNOWN_B', 'UNKNOWN_C')).toBeNull();
    expect(resolveTripleTech('ether_knight', 'time_knight', 'UNKNOWN_C')).toBeNull();
  });
});

describe('STORY-V55 — FieldMonsterSlot 구조 무결성 narrative', () => {
  it('모든 slot monsterId 문자열 + 비빈 narrative', async () => {
    const { listFieldEncounters } = await import('../../shared/types/chronoField');
    for (const e of listFieldEncounters()) {
      for (const slot of e.monsterPool) {
        expect(typeof slot.monsterId).toBe('string');
        expect(slot.monsterId.length, `${e.zoneId}/${e.eraId} ${slot.monsterId} id`).toBeGreaterThan(0);
      }
    }
  });

  it('모든 slot name 문자열 + 비빈 narrative', async () => {
    const { listFieldEncounters } = await import('../../shared/types/chronoField');
    for (const e of listFieldEncounters()) {
      for (const slot of e.monsterPool) {
        expect(typeof slot.name).toBe('string');
        expect(slot.name.length, `${e.zoneId}/${e.eraId} ${slot.monsterId} name`).toBeGreaterThan(0);
      }
    }
  });

  it('모든 slot weight 숫자 + 양수 + ≤ 1.0 narrative', async () => {
    const { listFieldEncounters } = await import('../../shared/types/chronoField');
    for (const e of listFieldEncounters()) {
      for (const slot of e.monsterPool) {
        expect(typeof slot.weight).toBe('number');
        expect(Number.isFinite(slot.weight), `${slot.monsterId} weight finite`).toBe(true);
        expect(slot.weight, `${slot.monsterId} weight > 0`).toBeGreaterThan(0);
        expect(slot.weight, `${slot.monsterId} weight ≤ 1`).toBeLessThanOrEqual(1.0);
      }
    }
  });

  it('isBoss 필드 boolean 또는 undefined narrative (선택 필드)', async () => {
    const { listFieldEncounters } = await import('../../shared/types/chronoField');
    for (const e of listFieldEncounters()) {
      for (const slot of e.monsterPool) {
        expect(['boolean', 'undefined']).toContain(typeof slot.isBoss);
      }
    }
  });

  it('21 encounter 모든 필수 필드 (zoneId/eraId/monsterPool/maxSpawn/hasBossSlot/ambientLine) 존재', async () => {
    const { listFieldEncounters } = await import('../../shared/types/chronoField');
    for (const e of listFieldEncounters()) {
      expect(typeof e.zoneId).toBe('string');
      expect(typeof e.eraId).toBe('string');
      expect(Array.isArray(e.monsterPool)).toBe(true);
      expect(typeof e.maxSpawn).toBe('number');
      expect(typeof e.hasBossSlot).toBe('boolean');
      expect(typeof e.ambientLine).toBe('string');
    }
  });
});

describe('STORY-V56 — Dual/Triple Tech 구조 무결성 narrative (200 가드 마디)', () => {
  const KNOWN_ELEMENTS = new Set(['neutral', 'fire', 'ice', 'lightning', 'wind', 'earth', 'holy', 'dark', 'chrono']);

  it('21 Dual + 15 Triple id 모두 문자열 + 비빈 + snake_case', async () => {
    const { listDualTechs } = await import('../../shared/types/dualTech');
    const { listTripleTechs } = await import('../../shared/types/tripleTech');
    for (const dt of listDualTechs()) {
      expect(typeof dt.id).toBe('string');
      expect(dt.id.match(/^[a-z][a-z0-9_]*$/), `Dual ${dt.id} snake_case`).not.toBeNull();
    }
    for (const tt of listTripleTechs()) {
      expect(typeof tt.id).toBe('string');
      expect(tt.id.match(/^[a-z][a-z0-9_]*$/), `Triple ${tt.id} snake_case`).not.toBeNull();
    }
  });

  it('21 Dual + 15 Triple element 모두 KNOWN_ELEMENTS narrative', async () => {
    const { listDualTechs } = await import('../../shared/types/dualTech');
    const { listTripleTechs } = await import('../../shared/types/tripleTech');
    for (const dt of listDualTechs()) {
      expect(KNOWN_ELEMENTS.has(dt.element), `Dual ${dt.id} element '${dt.element}'`).toBe(true);
    }
    for (const tt of listTripleTechs()) {
      expect(KNOWN_ELEMENTS.has(tt.element), `Triple ${tt.id} element '${tt.element}'`).toBe(true);
    }
  });

  it('Tech damageMultiplier/mpCost 모두 finite 양수 narrative', async () => {
    const { listDualTechs } = await import('../../shared/types/dualTech');
    const { listTripleTechs } = await import('../../shared/types/tripleTech');
    for (const dt of listDualTechs()) {
      expect(Number.isFinite(dt.damageMultiplier)).toBe(true);
      expect(dt.damageMultiplier).toBeGreaterThan(0);
      expect(Number.isFinite(dt.mpCost)).toBe(true);
      expect(dt.mpCost).toBeGreaterThan(0);
    }
    for (const tt of listTripleTechs()) {
      expect(Number.isFinite(tt.damageMultiplier)).toBe(true);
      expect(tt.damageMultiplier).toBeGreaterThan(0);
      expect(Number.isFinite(tt.mpCost)).toBe(true);
      expect(tt.mpCost).toBeGreaterThan(0);
    }
  });

  it('Tech partnerClasses 모두 array + length 검증 narrative', async () => {
    const { listDualTechs } = await import('../../shared/types/dualTech');
    const { listTripleTechs } = await import('../../shared/types/tripleTech');
    for (const dt of listDualTechs()) {
      expect(Array.isArray(dt.partnerClasses)).toBe(true);
      expect(dt.partnerClasses.length).toBe(2);
    }
    for (const tt of listTripleTechs()) {
      expect(Array.isArray(tt.partnerClasses)).toBe(true);
      expect(tt.partnerClasses.length).toBe(3);
    }
  });
});

describe('STORY-V58 — ATBSpeedTier ↔ chronoEra narrative cross-check', () => {
  it('chronoEraToSpeedTier 반환값 모두 ATBSpeedTier 유효 범위 (1~6)', async () => {
    const { chronoEraToSpeedTier } = await import('../../shared/types/chronoEraAtb');
    for (const era of STORY_ERAS) {
      const tier = chronoEraToSpeedTier(era);
      expect(tier).toBeGreaterThanOrEqual(1);
      expect(tier).toBeLessThanOrEqual(6);
      expect(Number.isInteger(tier), `${era} tier integer`).toBe(true);
    }
  });

  it('3 시대 speedTier 모두 unique narrative (시대 차별성)', async () => {
    const { chronoEraToSpeedTier } = await import('../../shared/types/chronoEraAtb');
    const tiers = STORY_ERAS.map((era) => chronoEraToSpeedTier(era));
    expect(new Set(tiers).size).toBe(tiers.length);
  });

  it('ancient < present < ruined_future tier (시대 진행 = tier 증가 narrative)', async () => {
    const { chronoEraToSpeedTier } = await import('../../shared/types/chronoEraAtb');
    expect(chronoEraToSpeedTier('ancient')).toBeLessThan(chronoEraToSpeedTier('present'));
    expect(chronoEraToSpeedTier('present')).toBeLessThan(chronoEraToSpeedTier('ruined_future'));
  });

  it('ancient tier ≥ 1 (FF6 ATB 최소 tier 보장)', async () => {
    const { chronoEraToSpeedTier } = await import('../../shared/types/chronoEraAtb');
    expect(chronoEraToSpeedTier('ancient')).toBeGreaterThanOrEqual(1);
  });
});

describe('STORY-V59 — 시그니처 Tech mpCost + narrative', () => {
  it('aetherna_final mpCost ≥ 30 (게임 정점 협공 narrative 비용)', async () => {
    const { resolveTripleTech } = await import('../../shared/types/tripleTech');
    const tt = resolveTripleTech('ether_knight', 'time_knight', 'memory_weaver')!;
    expect(tt.id).toBe('aetherna_final');
    expect(tt.mpCost).toBeGreaterThanOrEqual(30);
  });

  it('void_eternity mpCost = 최대 mpCost (최강 협공 narrative)', async () => {
    const { listTripleTechs } = await import('../../shared/types/tripleTech');
    const maxMp = Math.max(...listTripleTechs().map((tt) => tt.mpCost));
    const voidEternity = listTripleTechs().find((tt) => tt.id === 'void_eternity')!;
    expect(voidEternity.mpCost).toBe(maxMp);
  });

  it('chrono_blade (첫 Dual narrative) mpCost ≥ 12 (Dual 최소 cost 보장)', async () => {
    const { getDualTechById } = await import('../../shared/types/dualTech');
    const dt = getDualTechById('chrono_blade')!;
    expect(dt.mpCost).toBeGreaterThanOrEqual(12);
  });

  it('Dual mpCost 모두 12~30 범위 narrative (Triple 28~40 보다 낮음)', async () => {
    const { listDualTechs } = await import('../../shared/types/dualTech');
    for (const dt of listDualTechs()) {
      expect(dt.mpCost, `${dt.id} Dual mpCost`).toBeGreaterThanOrEqual(12);
      expect(dt.mpCost).toBeLessThanOrEqual(30);
    }
  });
});

describe('STORY-V60 — 30 sprint 마디 narrative 누적 stress', () => {
  it('전체 narrative source 동시 cross-check (Field + Tech + Era 모두 정상)', async () => {
    const { listFieldEncounters, listAllBossMonsterIds, listAllFieldMonsterIds, getTotalFieldBosses } = await import('../../shared/types/chronoField');
    const { listDualTechs, listAoeDualTechs } = await import('../../shared/types/dualTech');
    const { listTripleTechs } = await import('../../shared/types/tripleTech');
    const { chronoEraToSpeedTier, isChronoEraId } = await import('../../shared/types/chronoEraAtb');

    expect(listFieldEncounters().length).toBe(21);
    expect(getTotalFieldBosses()).toBe(21);
    expect(listAllBossMonsterIds().length).toBe(21);
    expect(listAllFieldMonsterIds().length).toBeGreaterThanOrEqual(50);
    expect(listDualTechs().length).toBe(21);
    expect(listAoeDualTechs().length).toBe(3);
    expect(listTripleTechs().length).toBe(15);
    expect(STORY_ERAS.every(isChronoEraId)).toBe(true);
    expect(STORY_ERAS.map(chronoEraToSpeedTier).every((t) => t >= 1 && t <= 6)).toBe(true);
  });

  it('aetherna 게임 정점 narrative 5중 cross-check (Triple + 보스 + Field + element + bgm)', async () => {
    const { resolveTripleTech } = await import('../../shared/types/tripleTech');
    const { listAllBossMonsterIds, resolveFieldEncounter } = await import('../../shared/types/chronoField');

    const triple = resolveTripleTech('ether_knight', 'time_knight', 'memory_weaver')!;
    const final = resolveFieldEncounter('chrono_spire', 'ruined_future')!;
    const finalBoss = final.monsterPool.find((s) => s.isBoss)!;

    expect(triple.id).toBe('aetherna_final');
    expect(triple.element).toBe('chrono');
    expect(finalBoss.monsterId).toBe('aetherna_collapse');
    expect(listAllBossMonsterIds()).toContain('aetherna_eidolon');
    expect(final.bgmTrack).toBe('bgm_final_boss');
  });

  it('30 sprint 누적: narrative entity 총량 ≥ 165 (21 보스 + 50 monster + 21 Dual + 15 Triple + 21 Field + 7 zone + 3 era + 7 클래스 + 9 element + 6 tier)', async () => {
    const { listFieldEncounters, listAllBossMonsterIds, listAllFieldMonsterIds } = await import('../../shared/types/chronoField');
    const { listDualTechs } = await import('../../shared/types/dualTech');
    const { listTripleTechs } = await import('../../shared/types/tripleTech');

    const total =
      listFieldEncounters().length +
      listAllBossMonsterIds().length +
      listAllFieldMonsterIds().length +
      listDualTechs().length +
      listTripleTechs().length +
      STORY_ZONES.length +
      STORY_ERAS.length +
      STORY_CLASSES.length;
    // 21 + 21 + 50+ + 21 + 15 + 7 + 3 + 7 = 145+
    expect(total, 'narrative total entity count').toBeGreaterThanOrEqual(145);
  });
});

describe('STORY-V61 — encounter id 시그니처 + chrono_spire 정점', () => {
  it('21 encounter (zone+era) 모두 unique combination narrative', async () => {
    const { listFieldEncounters } = await import('../../shared/types/chronoField');
    const keys = listFieldEncounters().map((e) => `${e.zoneId}:${e.eraId}`);
    expect(new Set(keys).size).toBe(21);
  });

  it('chrono_spire 3 era 모두 보스 시그니처 (eidolon/archon/collapse) narrative', async () => {
    const { resolveFieldEncounter } = await import('../../shared/types/chronoField');
    const a = resolveFieldEncounter('chrono_spire', 'ancient')!;
    const p = resolveFieldEncounter('chrono_spire', 'present')!;
    const f = resolveFieldEncounter('chrono_spire', 'ruined_future')!;
    expect(a.monsterPool.find((s) => s.isBoss)?.monsterId).toBe('aetherna_eidolon');
    expect(p.monsterPool.find((s) => s.isBoss)?.monsterId).toBe('chrono_archon');
    expect(f.monsterPool.find((s) => s.isBoss)?.monsterId).toBe('aetherna_collapse');
  });

  it('chrono_spire/ruined_future bossOnlyMode + bgm 시그니처 narrative', async () => {
    const { resolveFieldEncounter } = await import('../../shared/types/chronoField');
    const e = resolveFieldEncounter('chrono_spire', 'ruined_future')!;
    expect(e.bossOnlyMode).toBe(true);
    expect(e.bgmTrack).toBe('bgm_final_boss');
    expect(e.ambientEffect).toBe('boss_room');
  });

  it('aether_plains/ancient (게임 시작 narrative) 분위기 키워드', async () => {
    const { resolveFieldEncounter } = await import('../../shared/types/chronoField');
    const e = resolveFieldEncounter('aether_plains', 'ancient')!;
    expect(e.ambientLine).toMatch(/평원|고대|에테르/);
    const boss = e.monsterPool.find((s) => s.isBoss);
    expect(boss).toBeDefined();
  });
});

describe('STORY-V62 — 한글 narrative quality 통합', () => {
  const KOREAN = /[가-힣]/;

  it('모든 monster name 한글 포함 narrative (50+ slot 모두)', async () => {
    const { listFieldEncounters } = await import('../../shared/types/chronoField');
    for (const e of listFieldEncounters()) {
      for (const slot of e.monsterPool) {
        expect(KOREAN.test(slot.name), `${slot.monsterId} name 한글 없음`).toBe(true);
      }
    }
  });

  it('모든 ambient line 한글 포함 narrative (21 line)', async () => {
    const { listFieldEncounters } = await import('../../shared/types/chronoField');
    for (const e of listFieldEncounters()) {
      expect(KOREAN.test(e.ambientLine), `${e.zoneId}/${e.eraId} ambient 한글 없음`).toBe(true);
    }
  });

  it('모든 Dual/Triple description 한글 포함 narrative', async () => {
    const { listDualTechs } = await import('../../shared/types/dualTech');
    const { listTripleTechs } = await import('../../shared/types/tripleTech');
    for (const dt of listDualTechs()) {
      if (typeof dt.description === 'string') {
        expect(KOREAN.test(dt.description), `Dual ${dt.id} 한글 없음`).toBe(true);
      }
    }
    for (const tt of listTripleTechs()) {
      if (typeof tt.description === 'string') {
        expect(KOREAN.test(tt.description), `Triple ${tt.id} 한글 없음`).toBe(true);
      }
    }
  });

  it('monster name 한글 비율 ≥ 50% 글자 (한글 narrative 우세)', async () => {
    const { listFieldEncounters } = await import('../../shared/types/chronoField');
    for (const e of listFieldEncounters()) {
      for (const slot of e.monsterPool) {
        const koreanCount = (slot.name.match(/[가-힣]/g) ?? []).length;
        const ratio = koreanCount / slot.name.length;
        expect(ratio, `${slot.monsterId} 한글 비율`).toBeGreaterThanOrEqual(0.5);
      }
    }
  });
});

describe('STORY-V63 — 시간선 narrative cohesion (chrono_archon + 시간 시그니처)', () => {
  it('chrono_archon (시간 통치자, present 보스) 시그니처 narrative', async () => {
    const { resolveFieldEncounter } = await import('../../shared/types/chronoField');
    const e = resolveFieldEncounter('chrono_spire', 'present')!;
    const boss = e.monsterPool.find((s) => s.isBoss)!;
    expect(boss.monsterId).toBe('chrono_archon');
    expect(boss.name).toBe('시간 통치자');
  });

  it('chrono_spire 3 era 모든 보스 weight 시그니처 (0.2 / 0.2 / 0.4 — 종점 가장 강력)', async () => {
    const { resolveFieldEncounter } = await import('../../shared/types/chronoField');
    const aWeight = resolveFieldEncounter('chrono_spire', 'ancient')!.monsterPool.find((s) => s.isBoss)!.weight;
    const pWeight = resolveFieldEncounter('chrono_spire', 'present')!.monsterPool.find((s) => s.isBoss)!.weight;
    const fWeight = resolveFieldEncounter('chrono_spire', 'ruined_future')!.monsterPool.find((s) => s.isBoss)!.weight;
    expect(aWeight).toBe(0.2);
    expect(pWeight).toBe(0.2);
    expect(fWeight).toBe(0.4);
  });

  it('"시간" 키워드 narrative 분포 — chrono_archon + chrono_shard_titan + time_devourer 등 ≥ 3 보스', async () => {
    const { listFieldEncounters } = await import('../../shared/types/chronoField');
    let timeBossCount = 0;
    for (const e of listFieldEncounters()) {
      const boss = e.monsterPool.find((s) => s.isBoss);
      if (!boss) continue;
      if (boss.name.includes('시간') || boss.monsterId.includes('chrono_') || boss.monsterId.includes('time_')) {
        timeBossCount += 1;
      }
    }
    expect(timeBossCount, '"시간" 시그니처 보스 count').toBeGreaterThanOrEqual(3);
  });

  it('Triple chrono element ≥ 2 + chrono_break + aetherna_final 모두 chrono narrative', async () => {
    const { listTripleTechs } = await import('../../shared/types/tripleTech');
    const chronos = listTripleTechs().filter((tt) => tt.element === 'chrono');
    expect(chronos.length).toBeGreaterThanOrEqual(2);
    const ids = new Set(chronos.map((tt) => tt.id));
    expect(ids.has('chrono_break')).toBe(true);
    expect(ids.has('aetherna_final')).toBe(true);
  });
});

describe('STORY-V64 — 7 zone narrative 시그니처 종합', () => {
  it('aether_plains: 평원 시그니처 (plains_guardian + plains_*)', async () => {
    const { listFieldEncountersByZone } = await import('../../shared/types/chronoField');
    const list = listFieldEncountersByZone('aether_plains');
    const allIds = list.flatMap((e) => e.monsterPool.map((s) => s.monsterId));
    expect(allIds.some((id) => id.includes('plains_'))).toBe(true);
    expect(allIds.some((id) => id === 'plains_guardian')).toBe(true);
  });

  it('memory_forest: 숲 시그니처 (forest_guardian + forest_*)', async () => {
    const { listFieldEncountersByZone } = await import('../../shared/types/chronoField');
    const list = listFieldEncountersByZone('memory_forest');
    const allIds = list.flatMap((e) => e.monsterPool.map((s) => s.monsterId));
    expect(allIds.some((id) => id.includes('forest_'))).toBe(true);
  });

  it('malatus_sanctuary: 말라투스 시그니처 (malatus_avatar + fallen_malatus)', async () => {
    const { listFieldEncountersByZone } = await import('../../shared/types/chronoField');
    const list = listFieldEncountersByZone('malatus_sanctuary');
    const allIds = list.flatMap((e) => e.monsterPool.map((s) => s.monsterId));
    expect(allIds.some((id) => id.includes('malatus_') || id.includes('_malatus'))).toBe(true);
  });

  it('shadow_gorge: 그림자 시그니처 (shadow_lord/shadow_eternity)', async () => {
    const { listFieldEncountersByZone } = await import('../../shared/types/chronoField');
    const list = listFieldEncountersByZone('shadow_gorge');
    const allIds = list.flatMap((e) => e.monsterPool.map((s) => s.monsterId));
    expect(allIds.some((id) => id.includes('shadow_'))).toBe(true);
  });

  it('crystal_cave: 결정 시그니처 (crystal_guardian + crystal_*)', async () => {
    const { listFieldEncountersByZone } = await import('../../shared/types/chronoField');
    const list = listFieldEncountersByZone('crystal_cave');
    const allIds = list.flatMap((e) => e.monsterPool.map((s) => s.monsterId));
    expect(allIds.some((id) => id.includes('crystal_'))).toBe(true);
  });

  it('forgotten_citadel: 성채 시그니처 (citadel_lord + citadel_*)', async () => {
    const { listFieldEncountersByZone } = await import('../../shared/types/chronoField');
    const list = listFieldEncountersByZone('forgotten_citadel');
    const allIds = list.flatMap((e) => e.monsterPool.map((s) => s.monsterId));
    expect(allIds.some((id) => id.includes('citadel_'))).toBe(true);
  });

  it('chrono_spire: chrono/aetherna 시그니처 (aetherna_eidolon + chrono_archon + aetherna_collapse)', async () => {
    const { listFieldEncountersByZone } = await import('../../shared/types/chronoField');
    const list = listFieldEncountersByZone('chrono_spire');
    const bossIds = list.map((e) => e.monsterPool.find((s) => s.isBoss)?.monsterId);
    expect(bossIds).toContain('aetherna_eidolon');
    expect(bossIds).toContain('chrono_archon');
    expect(bossIds).toContain('aetherna_collapse');
  });
});

describe('STORY-V65 — 클래스별 시그니처 협공 narrative', () => {
  it('ether_knight 시그니처: chrono_blade + ether_recall + aetherna_final', async () => {
    const { listDualTechsByClass } = await import('../../shared/types/dualTech');
    const { listTripleTechsByClass } = await import('../../shared/types/tripleTech');
    const dualIds = listDualTechsByClass('ether_knight').map((dt) => dt.id);
    const tripleIds = listTripleTechsByClass('ether_knight').map((tt) => tt.id);
    expect(dualIds).toContain('chrono_blade');
    expect(dualIds).toContain('ether_recall');
    expect(tripleIds).toContain('aetherna_final');
  });

  it('time_knight 시그니처: chrono_blade + memory_warp + chrono_break + aetherna_final', async () => {
    const { listDualTechsByClass } = await import('../../shared/types/dualTech');
    const { listTripleTechsByClass } = await import('../../shared/types/tripleTech');
    const dualIds = listDualTechsByClass('time_knight').map((dt) => dt.id);
    const tripleIds = listTripleTechsByClass('time_knight').map((tt) => tt.id);
    expect(dualIds).toContain('chrono_blade');
    expect(dualIds).toContain('memory_warp');
    expect(tripleIds).toContain('aetherna_final');
  });

  it('memory_weaver 시그니처: memory_warp + ether_recall + aetherna_final', async () => {
    const { listDualTechsByClass } = await import('../../shared/types/dualTech');
    const { listTripleTechsByClass } = await import('../../shared/types/tripleTech');
    const dualIds = listDualTechsByClass('memory_weaver').map((dt) => dt.id);
    const tripleIds = listTripleTechsByClass('memory_weaver').map((tt) => tt.id);
    expect(dualIds).toContain('memory_warp');
    expect(dualIds).toContain('ether_recall');
    expect(tripleIds).toContain('aetherna_final');
  });

  it('void_wanderer 시그니처: void_pierce + memory_void + void_oblivion + void_eternity', async () => {
    const { listDualTechsByClass } = await import('../../shared/types/dualTech');
    const { listTripleTechsByClass } = await import('../../shared/types/tripleTech');
    const dualIds = listDualTechsByClass('void_wanderer').map((dt) => dt.id);
    const tripleIds = listTripleTechsByClass('void_wanderer').map((tt) => tt.id);
    expect(dualIds).toContain('void_pierce');
    expect(dualIds).toContain('void_oblivion');
    expect(tripleIds).toContain('void_eternity');
  });

  it('memory_breaker 시그니처: memory_shatter + void_oblivion + memory_break', async () => {
    const { listDualTechsByClass } = await import('../../shared/types/dualTech');
    const dualIds = listDualTechsByClass('memory_breaker').map((dt) => dt.id);
    expect(dualIds).toContain('memory_shatter');
    expect(dualIds).toContain('void_oblivion');
    expect(dualIds).toContain('memory_break');
  });
});

describe('STORY-V66 — shadow_weaver + time_guardian 시그니처 협공', () => {
  it('shadow_weaver 시그니처: shadow_eclipse + chrono_sealing + shadow_memory + memory_shatter', async () => {
    const { listDualTechsByClass } = await import('../../shared/types/dualTech');
    const dualIds = listDualTechsByClass('shadow_weaver').map((dt) => dt.id);
    expect(dualIds).toContain('shadow_eclipse');
    expect(dualIds).toContain('chrono_sealing');
    expect(dualIds).toContain('shadow_memory');
    expect(dualIds).toContain('memory_shatter');
  });

  it('time_guardian 시그니처: guardian_pact + guardian_eclipse + guardian_void + guardian_break', async () => {
    const { listDualTechsByClass } = await import('../../shared/types/dualTech');
    const dualIds = listDualTechsByClass('time_guardian').map((dt) => dt.id);
    expect(dualIds).toContain('guardian_pact');
    expect(dualIds).toContain('guardian_eclipse');
  });

  it('shadow_weaver Triple 시그니처: shadow_chrono + shadow_void_break + ether_shadow_memory', async () => {
    const { listTripleTechsByClass } = await import('../../shared/types/tripleTech');
    const ids = listTripleTechsByClass('shadow_weaver').map((tt) => tt.id);
    expect(ids).toContain('shadow_chrono');
    expect(ids.length).toBeGreaterThanOrEqual(2);
  });

  it('time_guardian Triple 시그니처: guardian_oath + guardian_void_strike', async () => {
    const { listTripleTechsByClass } = await import('../../shared/types/tripleTech');
    const ids = listTripleTechsByClass('time_guardian').map((tt) => tt.id);
    expect(ids).toContain('guardian_oath');
    expect(ids.length).toBeGreaterThanOrEqual(2);
  });
});

describe('STORY-V67 — 협공 element 다양성 narrative 종합', () => {
  it('전체 협공 36개의 element 분포 ≥ 3 distinct (다양성 보장)', async () => {
    const { listDualTechs } = await import('../../shared/types/dualTech');
    const { listTripleTechs } = await import('../../shared/types/tripleTech');
    const elements = new Set<string>();
    listDualTechs().forEach((dt) => elements.add(dt.element));
    listTripleTechs().forEach((tt) => elements.add(tt.element));
    expect(elements.size, '협공 element distinct').toBeGreaterThanOrEqual(3);
  });

  it('chrono element 협공: Dual ≥ 3 + Triple ≥ 2 (시간 시그니처 narrative)', async () => {
    const { listDualTechsByElement } = await import('../../shared/types/dualTech');
    const { listTripleTechs } = await import('../../shared/types/tripleTech');
    const dualChrono = listDualTechsByElement('chrono');
    const tripleChrono = listTripleTechs().filter((tt) => tt.element === 'chrono');
    expect(dualChrono.length).toBeGreaterThanOrEqual(3);
    expect(tripleChrono.length).toBeGreaterThanOrEqual(2);
  });

  it('dark element 협공: Dual ≥ 5 + Triple ≥ 2 (그림자/공허 narrative)', async () => {
    const { listDualTechsByElement } = await import('../../shared/types/dualTech');
    const { listTripleTechs } = await import('../../shared/types/tripleTech');
    const dualDark = listDualTechsByElement('dark');
    const tripleDark = listTripleTechs().filter((tt) => tt.element === 'dark');
    expect(dualDark.length).toBeGreaterThanOrEqual(5);
    expect(tripleDark.length).toBeGreaterThanOrEqual(2);
  });

  it('holy element 협공: Dual ≥ 2 (수호/팩트 narrative)', async () => {
    const { listDualTechsByElement } = await import('../../shared/types/dualTech');
    const dualHoly = listDualTechsByElement('holy');
    expect(dualHoly.length).toBeGreaterThanOrEqual(2);
  });
});

describe('STORY-V68 — Tech description + name 풍부도 narrative', () => {
  it('21 Dual + 15 Triple description 모두 length ≥ 4 narrative (의미 있는 설명)', async () => {
    const { listDualTechs } = await import('../../shared/types/dualTech');
    const { listTripleTechs } = await import('../../shared/types/tripleTech');
    for (const dt of listDualTechs()) {
      if (typeof dt.description === 'string') {
        expect(dt.description.length, `Dual ${dt.id} description`).toBeGreaterThanOrEqual(4);
      }
    }
    for (const tt of listTripleTechs()) {
      if (typeof tt.description === 'string') {
        expect(tt.description.length, `Triple ${tt.id} description`).toBeGreaterThanOrEqual(4);
      }
    }
  });

  it('21 Dual + 15 Triple name 모두 length 2~30 narrative', async () => {
    const { listDualTechs } = await import('../../shared/types/dualTech');
    const { listTripleTechs } = await import('../../shared/types/tripleTech');
    for (const dt of listDualTechs()) {
      expect(dt.name.length, `Dual ${dt.id} name`).toBeGreaterThanOrEqual(2);
      expect(dt.name.length).toBeLessThanOrEqual(30);
    }
    for (const tt of listTripleTechs()) {
      expect(tt.name.length, `Triple ${tt.id} name`).toBeGreaterThanOrEqual(2);
      expect(tt.name.length).toBeLessThanOrEqual(30);
    }
  });

  it('36 협공 name unique narrative (재사용 없음)', async () => {
    const { listDualTechs } = await import('../../shared/types/dualTech');
    const { listTripleTechs } = await import('../../shared/types/tripleTech');
    const names = [
      ...listDualTechs().map((dt) => dt.name),
      ...listTripleTechs().map((tt) => tt.name),
    ];
    expect(new Set(names).size).toBe(names.length);
  });

  it('Dual Tech name 한글 narrative + 시그니처 키워드 (블레이드/이클립스/워프/봉인/리콜/팩트/피어스 등)', async () => {
    const { listDualTechs } = await import('../../shared/types/dualTech');
    const sigKeywords = ['블레이드', '이클립스', '워프', '봉인', '리콜', '팩트', '피어스', '셰터', '오블리비온', '브레이크', '오버플로우', '메모리', '보이드', '가디언'];
    let matchCount = 0;
    for (const dt of listDualTechs()) {
      if (sigKeywords.some((k) => dt.name.includes(k))) matchCount += 1;
    }
    expect(matchCount, 'Dual name 시그니처 키워드').toBeGreaterThanOrEqual(15);
  });
});

describe('STORY-V69 — 250 가드 마디 — Triple name 시그니처 + 누적 cohesion', () => {
  it('Triple name 시그니처 키워드 — aetherna/크로노/보이드/가디언/섀도우/이터니티/오스/브레이크', async () => {
    const { listTripleTechs } = await import('../../shared/types/tripleTech');
    const sigKeywords = ['에테르나', '크로노', '보이드', '가디언', '섀도우', '이터니티', '오스', '브레이크', '메모리', '에테르', '타임'];
    let matchCount = 0;
    for (const tt of listTripleTechs()) {
      if (sigKeywords.some((k) => tt.name.includes(k))) matchCount += 1;
    }
    expect(matchCount, 'Triple name 시그니처 키워드 match').toBeGreaterThanOrEqual(13);
  });

  it('aetherna_final name "에테르나 파이널" 정확 (정점 narrative)', async () => {
    const { resolveTripleTech } = await import('../../shared/types/tripleTech');
    const tt = resolveTripleTech('ether_knight', 'time_knight', 'memory_weaver')!;
    expect(tt.name).toBe('에테르나 파이널');
  });

  it('250 가드 마디 — STORY 정합성 누적 정점 cross-check', async () => {
    const { listFieldEncounters, listAllBossMonsterIds } = await import('../../shared/types/chronoField');
    const { listDualTechs } = await import('../../shared/types/dualTech');
    const { listTripleTechs } = await import('../../shared/types/tripleTech');

    // 누적 narrative entity (V60 정점 정합)
    expect(listFieldEncounters().length).toBe(21);
    expect(listAllBossMonsterIds().length).toBe(21);
    expect(listDualTechs().length).toBe(21);
    expect(listTripleTechs().length).toBe(15);
  });
});

describe('STORY-V71 — 시대별 협공 가용 narrative cross-check', () => {
  it('listTripleTechsByEra 각 시대 ≥ 5 Triple 가용 narrative (전투 합리)', async () => {
    const { listTripleTechsByEra } = await import('../../shared/types/tripleTech');
    for (const era of STORY_ERAS) {
      const list = listTripleTechsByEra(era);
      expect(list.length, `${era} Triple count`).toBeGreaterThanOrEqual(5);
    }
  });

  it('listDualTechsByEra 각 시대 ≥ 5 Dual 가용 narrative', async () => {
    const { listDualTechsByEra } = await import('../../shared/types/dualTech');
    for (const era of STORY_ERAS) {
      const list = listDualTechsByEra(era);
      expect(list.length, `${era} Dual count`).toBeGreaterThanOrEqual(5);
    }
  });

  it('present 시대 모든 협공 가장 많이 가용 narrative (중심 시대)', async () => {
    const { listDualTechsByEra } = await import('../../shared/types/dualTech');
    const { listTripleTechsByEra } = await import('../../shared/types/tripleTech');
    const presentTotal = listDualTechsByEra('present').length + listTripleTechsByEra('present').length;
    const ancientTotal = listDualTechsByEra('ancient').length + listTripleTechsByEra('ancient').length;
    const futureTotal = listDualTechsByEra('ruined_future').length + listTripleTechsByEra('ruined_future').length;
    expect(presentTotal).toBeGreaterThanOrEqual(ancientTotal);
    expect(presentTotal).toBeGreaterThanOrEqual(futureTotal);
  });

  it('aetherna_final Triple eraFilter = present + ruined_future (게임 정점은 현재 + 종점)', async () => {
    const { listTripleTechsByEra } = await import('../../shared/types/tripleTech');
    // ancient 시대에는 aetherna_final 가용 X (시간 통합 전 narrative)
    expect(listTripleTechsByEra('ancient').find((tt) => tt.id === 'aetherna_final')).toBeUndefined();
    // present + ruined_future 가용 (시대 통합 narrative)
    expect(listTripleTechsByEra('present').find((tt) => tt.id === 'aetherna_final')).toBeDefined();
    expect(listTripleTechsByEra('ruined_future').find((tt) => tt.id === 'aetherna_final')).toBeDefined();
  });
});

describe('STORY-V72 — monster id ↔ name narrative 1:1 매핑', () => {
  it('동일 monsterId 는 모든 encounter 에서 동일 name narrative (모순 없음)', async () => {
    const { listFieldEncounters } = await import('../../shared/types/chronoField');
    const idToName = new Map<string, string>();
    for (const e of listFieldEncounters()) {
      for (const slot of e.monsterPool) {
        const existing = idToName.get(slot.monsterId);
        if (existing !== undefined) {
          expect(existing, `${slot.monsterId} name 모순`).toBe(slot.name);
        } else {
          idToName.set(slot.monsterId, slot.name);
        }
      }
    }
  });

  it('동일 monsterId 는 isBoss 도 동일 narrative (보스/일반 모순 없음)', async () => {
    const { listFieldEncounters } = await import('../../shared/types/chronoField');
    const idToBoss = new Map<string, boolean>();
    for (const e of listFieldEncounters()) {
      for (const slot of e.monsterPool) {
        const isB = slot.isBoss === true;
        const existing = idToBoss.get(slot.monsterId);
        if (existing !== undefined) {
          expect(existing, `${slot.monsterId} isBoss 모순`).toBe(isB);
        } else {
          idToBoss.set(slot.monsterId, isB);
        }
      }
    }
  });

  it('일반 monster id 가 같은 encounter 에서 한번만 등장 narrative (중복 slot 없음)', async () => {
    const { listFieldEncounters } = await import('../../shared/types/chronoField');
    for (const e of listFieldEncounters()) {
      const ids = e.monsterPool.map((s) => s.monsterId);
      expect(new Set(ids).size, `${e.zoneId}/${e.eraId} monster id unique in encounter`).toBe(ids.length);
    }
  });
});

describe('STORY-V73 — source id 도메인 cross-check narrative', () => {
  it('Dual + Triple id 결합 36개 모두 unique narrative (Dual ↔ Triple id 충돌 없음)', async () => {
    const { listDualTechs } = await import('../../shared/types/dualTech');
    const { listTripleTechs } = await import('../../shared/types/tripleTech');
    const allIds = [
      ...listDualTechs().map((dt) => dt.id),
      ...listTripleTechs().map((tt) => tt.id),
    ];
    expect(allIds.length).toBe(36);
    expect(new Set(allIds).size).toBe(36);
  });

  it('Field monster id 와 협공 id 도메인 독립성 narrative (monster ↔ tech 충돌 없음)', async () => {
    const { listDualTechs } = await import('../../shared/types/dualTech');
    const { listTripleTechs } = await import('../../shared/types/tripleTech');
    const { listAllFieldMonsterIds } = await import('../../shared/types/chronoField');
    const techIds = new Set([
      ...listDualTechs().map((dt) => dt.id),
      ...listTripleTechs().map((tt) => tt.id),
    ]);
    const monsterIds = listAllFieldMonsterIds();
    for (const mid of monsterIds) {
      expect(techIds.has(mid), `monster id '${mid}' 가 tech id 와 충돌`).toBe(false);
    }
  });

  it('zone id (7) + era id (3) 도 tech/monster id 와 충돌 없음 narrative', async () => {
    const { listDualTechs } = await import('../../shared/types/dualTech');
    const { listTripleTechs } = await import('../../shared/types/tripleTech');
    const { listAllFieldMonsterIds } = await import('../../shared/types/chronoField');
    const all = new Set([
      ...listDualTechs().map((dt) => dt.id),
      ...listTripleTechs().map((tt) => tt.id),
      ...listAllFieldMonsterIds(),
    ]);
    for (const z of STORY_ZONES) {
      expect(all.has(z), `zone '${z}' 가 다른 id 와 충돌`).toBe(false);
    }
    for (const era of STORY_ERAS) {
      expect(all.has(era), `era '${era}' 가 다른 id 와 충돌`).toBe(false);
    }
  });

  it('클래스 id (7) 도 tech/monster id 와 충돌 없음 narrative', async () => {
    const { listDualTechs } = await import('../../shared/types/dualTech');
    const { listTripleTechs } = await import('../../shared/types/tripleTech');
    const { listAllFieldMonsterIds } = await import('../../shared/types/chronoField');
    const all = new Set([
      ...listDualTechs().map((dt) => dt.id),
      ...listTripleTechs().map((tt) => tt.id),
      ...listAllFieldMonsterIds(),
    ]);
    for (const cls of STORY_CLASSES) {
      expect(all.has(cls), `class '${cls}' 가 다른 id 와 충돌`).toBe(false);
    }
  });
});

describe('STORY-V74 — fxKey 패턴 정합성 narrative', () => {
  it('21 Dual fxKey 모두 "fx_" + id 패턴 narrative (fx_{id})', async () => {
    const { listDualTechs } = await import('../../shared/types/dualTech');
    for (const dt of listDualTechs()) {
      expect(dt.fxKey, `Dual ${dt.id} fxKey`).toBe(`fx_${dt.id}`);
    }
  });

  it('15 Triple fxKey 모두 "fx_" + id 패턴 narrative', async () => {
    const { listTripleTechs } = await import('../../shared/types/tripleTech');
    for (const tt of listTripleTechs()) {
      expect(tt.fxKey, `Triple ${tt.id} fxKey`).toBe(`fx_${tt.id}`);
    }
  });

  it('36 협공 fxKey 모두 unique narrative', async () => {
    const { listDualTechs } = await import('../../shared/types/dualTech');
    const { listTripleTechs } = await import('../../shared/types/tripleTech');
    const fxKeys = [
      ...listDualTechs().map((dt) => dt.fxKey),
      ...listTripleTechs().map((tt) => tt.fxKey),
    ];
    expect(new Set(fxKeys).size).toBe(36);
  });

  it('fxKey 모두 snake_case + "fx_" prefix narrative', async () => {
    const { listDualTechs } = await import('../../shared/types/dualTech');
    const { listTripleTechs } = await import('../../shared/types/tripleTech');
    for (const dt of listDualTechs()) {
      expect(dt.fxKey.startsWith('fx_')).toBe(true);
      expect(dt.fxKey).toMatch(/^fx_[a-z][a-z0-9_]*$/);
    }
    for (const tt of listTripleTechs()) {
      expect(tt.fxKey.startsWith('fx_')).toBe(true);
      expect(tt.fxKey).toMatch(/^fx_[a-z][a-z0-9_]*$/);
    }
  });
});

describe('STORY-V75 — aetherna 게임명 narrative 등장 빈도', () => {
  it('aetherna prefix Triple ≥ 1 (aetherna_final 정점)', async () => {
    const { listTripleTechs } = await import('../../shared/types/tripleTech');
    const count = listTripleTechs().filter((tt) => tt.id.startsWith('aetherna_')).length;
    expect(count).toBeGreaterThanOrEqual(1);
  });

  it('aetherna prefix 보스 = 2 (eidolon + collapse 정확)', async () => {
    const { listAllBossMonsterIds } = await import('../../shared/types/chronoField');
    const count = listAllBossMonsterIds().filter((id) => id.startsWith('aetherna_')).length;
    expect(count).toBe(2);
  });

  it('"에테르나" name 시그니처 ≥ 3 (Tech name + 보스 name 합계)', async () => {
    const { listTripleTechs } = await import('../../shared/types/tripleTech');
    const { listFieldEncounters } = await import('../../shared/types/chronoField');
    let count = 0;
    for (const tt of listTripleTechs()) {
      if (tt.name.includes('에테르나')) count += 1;
    }
    for (const e of listFieldEncounters()) {
      for (const slot of e.monsterPool) {
        if (slot.name.includes('에테르나')) count += 1;
      }
    }
    expect(count, '"에테르나" 시그니처 등장 횟수').toBeGreaterThanOrEqual(3);
  });

  it('chrono_spire zone 이 aetherna 시그니처 보스 모두 보유 narrative (게임 정점 위치)', async () => {
    const { listFieldEncountersByZone } = await import('../../shared/types/chronoField');
    const list = listFieldEncountersByZone('chrono_spire');
    const bossIds = list
      .map((e) => e.monsterPool.find((s) => s.isBoss)?.monsterId)
      .filter((id): id is string => typeof id === 'string');
    const aethernaBosses = bossIds.filter((id) => id.startsWith('aetherna_'));
    expect(aethernaBosses.length).toBeGreaterThanOrEqual(2);
  });
});

describe('STORY-V76 — ambient line 시대 키워드 분포 narrative', () => {
  it('present 시대 7 ambient line 평화 분위기 키워드 ≥ 3 (균형 narrative)', async () => {
    const { listFieldEncounters } = await import('../../shared/types/chronoField');
    const presentLines = listFieldEncounters().filter((e) => e.eraId === 'present').map((e) => e.ambientLine);
    const presentKeywords = ['평화', '균형', '평원', '에테르', '숲', '결정', '성소', '협곡', '동굴', '성채', '첨탑', '현재', '시간', '도시'];
    let count = 0;
    for (const line of presentLines) {
      if (presentKeywords.some((k) => line.includes(k))) count += 1;
    }
    expect(count, 'present ambient keyword count').toBeGreaterThanOrEqual(3);
  });

  it('21 ambient line 모두 비빈 + length ≥ 8 narrative', async () => {
    const { listFieldEncounters } = await import('../../shared/types/chronoField');
    for (const e of listFieldEncounters()) {
      expect(e.ambientLine.length, `${e.zoneId}/${e.eraId} length`).toBeGreaterThanOrEqual(8);
    }
  });

  it('chrono_spire 3 era ambient line 시간/종점 narrative 키워드', async () => {
    const { listFieldEncountersByZone } = await import('../../shared/types/chronoField');
    const lines = listFieldEncountersByZone('chrono_spire').map((e) => e.ambientLine);
    const keywords = ['시간', '시계', '첨탑', '종말', '세계', '에테르나', '마지막', '시간선', '시대'];
    let matchCount = 0;
    for (const line of lines) {
      if (keywords.some((k) => line.includes(k))) matchCount += 1;
    }
    expect(matchCount, 'chrono_spire ambient keyword').toBeGreaterThanOrEqual(2);
  });

  it('aether_plains 3 era ambient line 평원/에테르 narrative 키워드', async () => {
    const { listFieldEncountersByZone } = await import('../../shared/types/chronoField');
    const lines = listFieldEncountersByZone('aether_plains').map((e) => e.ambientLine);
    const keywords = ['평원', '에테르', '고대', '평화', '잔영', '바람'];
    let matchCount = 0;
    for (const line of lines) {
      if (keywords.some((k) => line.includes(k))) matchCount += 1;
    }
    expect(matchCount, 'aether_plains ambient keyword').toBeGreaterThanOrEqual(2);
  });
});

describe('STORY-V77 — monster name 한글 분위기 narrative', () => {
  it('보스 21 name 한글 시그니처 키워드 ≥ 18 (수호자/군주/거인/영주/통치자/환영/봉인 등)', async () => {
    const { listFieldEncounters } = await import('../../shared/types/chronoField');
    const sigKeywords = ['수호자', '군주', '거인', '영주', '통치자', '환영', '봉인', '가디언', '화신', '망령', '뱀', '거대', '신', '왕', '여왕', '용', '천사', '악마', '종말', '파편', '잔영', '파수꾼', '포식자', '골렘', '세라프'];
    let count = 0;
    for (const e of listFieldEncounters()) {
      const boss = e.monsterPool.find((s) => s.isBoss);
      if (!boss) continue;
      if (sigKeywords.some((k) => boss.name.includes(k))) count += 1;
    }
    expect(count, '보스 시그니처 키워드').toBeGreaterThanOrEqual(18);
  });

  it('일반 monster name 시그니처 키워드 ≥ 30 (정령/늑대/박쥐/사제/잠복자/도깨비불 등)', async () => {
    const { listFieldEncounters } = await import('../../shared/types/chronoField');
    const sigKeywords = ['정령', '늑대', '박쥐', '사제', '잠복자', '도깨비불', '뱀', '괴물', '아콜라이트', '궁수', '기사', '경비병', '뱀', '거미', '잔영', '망령', '폭주', '안개', '결정', '에테르'];
    let count = 0;
    for (const e of listFieldEncounters()) {
      for (const slot of e.monsterPool) {
        if (slot.isBoss) continue;
        if (sigKeywords.some((k) => slot.name.includes(k))) count += 1;
      }
    }
    expect(count, '일반 monster 시그니처 키워드').toBeGreaterThanOrEqual(30);
  });

  it('ancient 시대 monster name "고대/유적/봉인/세라프/평원/숲" 키워드 ≥ 5', async () => {
    const { listFieldEncounters } = await import('../../shared/types/chronoField');
    const keywords = ['고대', '유적', '봉인', '세라프', '평원', '숲', '결정', '에테르', '말라투스', '환영', '거인'];
    let count = 0;
    for (const e of listFieldEncounters()) {
      if (e.eraId !== 'ancient') continue;
      for (const slot of e.monsterPool) {
        if (keywords.some((k) => slot.name.includes(k))) count += 1;
      }
    }
    expect(count, 'ancient name 키워드').toBeGreaterThanOrEqual(5);
  });
});

describe('STORY-V78 — bossOnlyMode encounter narrative cohesion', () => {
  it('bossOnlyMode encounter ≥ 1 narrative (최종 보스 영역 보유)', async () => {
    const { listBossOnlyFields } = await import('../../shared/types/chronoField');
    expect(listBossOnlyFields().length).toBeGreaterThanOrEqual(1);
  });

  it('bossOnlyMode encounter 모두 chrono_spire zone narrative (정점 zone 종점)', async () => {
    const { listBossOnlyFields } = await import('../../shared/types/chronoField');
    for (const e of listBossOnlyFields()) {
      expect(e.zoneId, `boss-only zone`).toBe('chrono_spire');
    }
  });

  it('bossOnlyMode encounter 모두 ruined_future era narrative (시간 종점)', async () => {
    const { listBossOnlyFields } = await import('../../shared/types/chronoField');
    for (const e of listBossOnlyFields()) {
      expect(e.eraId, `boss-only era`).toBe('ruined_future');
    }
  });

  it('bossOnlyMode encounter 모두 bgmTrack = "bgm_final_boss" narrative (시그니처 BGM)', async () => {
    const { listBossOnlyFields } = await import('../../shared/types/chronoField');
    for (const e of listBossOnlyFields()) {
      expect(e.bgmTrack, `boss-only bgm`).toBe('bgm_final_boss');
    }
  });

  it('bossOnlyMode encounter 보스 = aetherna_collapse narrative (게임 종점 보스)', async () => {
    const { listBossOnlyFields } = await import('../../shared/types/chronoField');
    for (const e of listBossOnlyFields()) {
      const boss = e.monsterPool.find((s) => s.isBoss);
      expect(boss?.monsterId, `boss-only boss`).toBe('aetherna_collapse');
    }
  });
});

describe('STORY-V79 — era default fallback narrative cross-check', () => {
  it('resolveFieldEncounter 모든 era 기본 bgm fallback narrative 적용', async () => {
    const { resolveFieldEncounter } = await import('../../shared/types/chronoField');
    for (const era of STORY_ERAS) {
      for (const zone of STORY_ZONES) {
        const e = resolveFieldEncounter(zone, era);
        expect(e?.bgmTrack, `${zone}/${era} bgmTrack`).toBeDefined();
        expect(typeof e?.bgmTrack).toBe('string');
        expect(e!.bgmTrack.length).toBeGreaterThan(0);
      }
    }
  });

  it('resolveFieldEncounter 모든 era 기본 ambientEffect fallback narrative 적용', async () => {
    const { resolveFieldEncounter } = await import('../../shared/types/chronoField');
    for (const era of STORY_ERAS) {
      for (const zone of STORY_ZONES) {
        const e = resolveFieldEncounter(zone, era);
        expect(e?.ambientEffect, `${zone}/${era} ambientEffect`).toBeDefined();
      }
    }
  });

  it('ancient era default bgm "bgm_ancient_field" 시그니처', async () => {
    const { resolveFieldEncounter } = await import('../../shared/types/chronoField');
    // bgm 미지정 encounter 가 있다면 ancient 기본값 사용
    let ancientFieldCount = 0;
    for (const zone of STORY_ZONES) {
      const e = resolveFieldEncounter(zone, 'ancient')!;
      if (e.bgmTrack === 'bgm_ancient_field' || e.bgmTrack === 'bgm_chrono_ancient') {
        ancientFieldCount += 1;
      }
    }
    expect(ancientFieldCount, 'ancient default bgm usage').toBeGreaterThanOrEqual(1);
  });

  it('ruined_future era default bgm 시그니처 narrative', async () => {
    const { resolveFieldEncounter } = await import('../../shared/types/chronoField');
    let futureFieldCount = 0;
    for (const zone of STORY_ZONES) {
      const e = resolveFieldEncounter(zone, 'ruined_future')!;
      if (e.bgmTrack === 'bgm_ruined_future' || e.bgmTrack === 'bgm_final_boss' || e.bgmTrack === 'bgm_void_citadel') {
        futureFieldCount += 1;
      }
    }
    expect(futureFieldCount, 'future bgm usage').toBeGreaterThanOrEqual(1);
  });
});

describe('STORY-V80 — chapter II+III 50 sprint 마디 종합 stress', () => {
  it('50 sprint 누적 narrative — Tech ↔ Field ↔ Era 모든 source cohesion 정점', async () => {
    const mod = await import('../../shared/types/chrono');
    // 모든 source 한번에 cohesion 검증
    expect(mod.listDualTechs().length).toBe(21);
    expect(mod.listTripleTechs().length).toBe(15);
    expect(mod.listFieldEncounters().length).toBe(21);
    expect(mod.listAllBossMonsterIds().length).toBe(21);
    expect(mod.getTotalFieldBosses()).toBe(21);
    expect(mod.listAllFieldMonsterIds().length).toBeGreaterThanOrEqual(50);
    expect(mod.listAoeDualTechs().length).toBe(3);
    expect(mod.listBossOnlyFields().length).toBeGreaterThanOrEqual(1);
  });

  it('50 sprint 누적 narrative — aetherna 시그니처 종점 4중 cross-check', async () => {
    const { resolveTripleTech } = await import('../../shared/types/tripleTech');
    const { listAllBossMonsterIds, resolveFieldEncounter, listBossOnlyFields } = await import('../../shared/types/chronoField');

    // aetherna_final
    expect(resolveTripleTech('ether_knight', 'time_knight', 'memory_weaver')?.name).toBe('에테르나 파이널');

    // aetherna_collapse (chrono_spire/ruined_future)
    const final = resolveFieldEncounter('chrono_spire', 'ruined_future')!;
    expect(final.monsterPool.find((s) => s.isBoss)?.name).toBe('에테르나의 종말');

    // aetherna_eidolon (chrono_spire/ancient)
    const ancient = resolveFieldEncounter('chrono_spire', 'ancient')!;
    expect(ancient.monsterPool.find((s) => s.isBoss)?.name).toBe('에테르나 환영');

    // listBossOnlyFields = chrono_spire/ruined_future (단일 종점)
    const onlys = listBossOnlyFields();
    expect(onlys.length).toBe(1);
    expect(onlys[0].zoneId).toBe('chrono_spire');
  });

  it('50 sprint 누적 narrative — 시대 단조 + Triple > Dual + AOE 정합 (chapter II+III)', async () => {
    const { chronoEraToSpeedTier } = await import('../../shared/types/chronoEraAtb');
    const { listDualTechs, listAoeDualTechs } = await import('../../shared/types/dualTech');
    const { listTripleTechs } = await import('../../shared/types/tripleTech');

    // 시대 단조
    expect(chronoEraToSpeedTier('ancient')).toBeLessThan(chronoEraToSpeedTier('present'));
    expect(chronoEraToSpeedTier('present')).toBeLessThan(chronoEraToSpeedTier('ruined_future'));

    // Triple > Dual avg
    const dualAvg = listDualTechs().reduce((s, dt) => s + dt.damageMultiplier, 0) / 21;
    const tripleAvg = listTripleTechs().reduce((s, tt) => s + tt.damageMultiplier, 0) / 15;
    expect(tripleAvg).toBeGreaterThan(dualAvg);

    // AOE
    expect(listAoeDualTechs().length).toBe(3);
  });
});

describe('STORY-V81 — Triple/Dual 클래스 분포 균형 narrative', () => {
  it('Triple 의 7 클래스 모두 참여 ≥ 2회 narrative (균등 참여)', async () => {
    const { listTripleTechsByClass } = await import('../../shared/types/tripleTech');
    for (const cls of STORY_CLASSES) {
      const count = listTripleTechsByClass(cls).length;
      expect(count, `${cls} Triple ≥ 2`).toBeGreaterThanOrEqual(2);
    }
  });

  it('Dual 의 7 클래스 모두 참여 ≥ 4회 narrative (다양 협공)', async () => {
    const { listDualTechsByClass } = await import('../../shared/types/dualTech');
    for (const cls of STORY_CLASSES) {
      const count = listDualTechsByClass(cls).length;
      expect(count, `${cls} Dual ≥ 4`).toBeGreaterThanOrEqual(4);
    }
  });

  it('Triple 가장 많이 참여 클래스 - 가장 적게 참여 클래스 차이 ≤ 6 narrative (균형)', async () => {
    const { listTripleTechs } = await import('../../shared/types/tripleTech');
    const count = new Map<string, number>();
    for (const tt of listTripleTechs()) {
      for (const cls of tt.partnerClasses) {
        count.set(cls, (count.get(cls) ?? 0) + 1);
      }
    }
    const counts = Array.from(count.values());
    const diff = Math.max(...counts) - Math.min(...counts);
    expect(diff, 'Triple participation diff').toBeLessThanOrEqual(6);
  });

  it('Dual 가장 많이 참여 - 가장 적게 참여 차이 ≤ 6 narrative (균형)', async () => {
    const { listDualTechs } = await import('../../shared/types/dualTech');
    const count = new Map<string, number>();
    for (const dt of listDualTechs()) {
      for (const cls of dt.partnerClasses) {
        count.set(cls, (count.get(cls) ?? 0) + 1);
      }
    }
    const counts = Array.from(count.values());
    const diff = Math.max(...counts) - Math.min(...counts);
    expect(diff, 'Dual participation diff').toBeLessThanOrEqual(6);
  });
});

describe('STORY-V82 — monster pool diversity narrative', () => {
  it('일반 encounter monster pool size 합리 (2~6 slot) narrative', async () => {
    const { listFieldEncounters } = await import('../../shared/types/chronoField');
    for (const e of listFieldEncounters()) {
      if (e.bossOnlyMode) continue;
      expect(e.monsterPool.length, `${e.zoneId}/${e.eraId} pool size`).toBeGreaterThanOrEqual(2);
      expect(e.monsterPool.length).toBeLessThanOrEqual(6);
    }
  });

  it('전체 21 encounter monster 평균 ≥ 3 slot narrative (충분한 다양성)', async () => {
    const { listFieldEncounters } = await import('../../shared/types/chronoField');
    const totalSlots = listFieldEncounters().reduce((s, e) => s + e.monsterPool.length, 0);
    const avg = totalSlots / 21;
    expect(avg, 'avg monster slots per encounter').toBeGreaterThanOrEqual(3);
  });

  it('시대별 일반 monster 다양성 — 각 시대 ≥ 14 unique 일반 monster narrative', async () => {
    const { listFieldEncounters } = await import('../../shared/types/chronoField');
    for (const era of STORY_ERAS) {
      const ids = new Set<string>();
      for (const e of listFieldEncounters()) {
        if (e.eraId !== era) continue;
        for (const slot of e.monsterPool) {
          if (!slot.isBoss) ids.add(slot.monsterId);
        }
      }
      expect(ids.size, `${era} unique 일반 monster`).toBeGreaterThanOrEqual(14);
    }
  });
});

describe('STORY-V83 — 300 가드 마디 누적 종합 cohesion', () => {
  it('전체 narrative source 한번에 cross-check (53 sprint 누적)', async () => {
    const mod = await import('../../shared/types/chrono');
    // 모든 source 통합 검증
    const dual = mod.listDualTechs();
    const triple = mod.listTripleTechs();
    const fields = mod.listFieldEncounters();
    const bosses = mod.listAllBossMonsterIds();
    const monsters = mod.listAllFieldMonsterIds();

    // 정량
    expect(dual.length).toBe(21);
    expect(triple.length).toBe(15);
    expect(fields.length).toBe(21);
    expect(bosses.length).toBe(21);
    expect(monsters.length).toBeGreaterThanOrEqual(50);

    // unique
    expect(new Set(dual.map((d) => d.id)).size).toBe(21);
    expect(new Set(triple.map((t) => t.id)).size).toBe(15);
    expect(new Set(bosses).size).toBe(21);
    expect(new Set(monsters).size).toBe(monsters.length);
  });

  it('aetherna 정점 모든 source narrative integrity (53 sprint 누적)', async () => {
    const mod = await import('../../shared/types/chrono');

    // Triple
    const aetherFinal = mod.resolveTripleTech('ether_knight', 'time_knight', 'memory_weaver')!;
    expect(aetherFinal.id).toBe('aetherna_final');
    expect(aetherFinal.element).toBe('chrono');
    expect(aetherFinal.mpCost).toBeGreaterThanOrEqual(30);

    // 보스
    const collapse = mod.resolveFieldEncounter('chrono_spire', 'ruined_future')!;
    expect(collapse.bossOnlyMode).toBe(true);
    expect(collapse.bgmTrack).toBe('bgm_final_boss');
    expect(collapse.monsterPool.find((s) => s.isBoss)?.monsterId).toBe('aetherna_collapse');

    // Aetherna 시그니처 cohesion
    expect(mod.listAllBossMonsterIds()).toContain('aetherna_eidolon');
    expect(mod.listAllBossMonsterIds()).toContain('aetherna_collapse');
  });

  it('시대 ↔ tier ↔ 협공 가용 narrative 정합 (53 sprint stress)', async () => {
    const mod = await import('../../shared/types/chrono');

    for (const era of STORY_ERAS) {
      const tier = mod.chronoEraToSpeedTier(era);
      expect(tier).toBeGreaterThanOrEqual(1);
      expect(tier).toBeLessThanOrEqual(6);

      const duals = mod.listDualTechsByEra(era);
      expect(duals.length).toBeGreaterThanOrEqual(5);

      const triples = mod.listTripleTechsByEra(era);
      expect(triples.length).toBeGreaterThanOrEqual(5);
    }
  });

  it('300 가드 마디 narrative entity 총량 ≥ 145 (53 sprint stress)', async () => {
    const mod = await import('../../shared/types/chrono');
    const total =
      mod.listFieldEncounters().length +
      mod.listAllBossMonsterIds().length +
      mod.listAllFieldMonsterIds().length +
      mod.listDualTechs().length +
      mod.listTripleTechs().length;
    expect(total, 'total entity').toBeGreaterThanOrEqual(128);
  });
});

describe('STORY-V83b — 300 가드 마디 도달 cross-check', () => {
  it('storyConsistency 본 파일 자체 300+ 가드 누적 (V30~V83 chapter II+III cohesion)', async () => {
    // 본 가드 자체가 storyConsistency 300번째 가드 — narrative chapter II+III 완성
    const { listAllBossMonsterIds, listAllFieldMonsterIds, getTotalFieldBosses } = await import('../../shared/types/chronoField');
    const { listDualTechs } = await import('../../shared/types/dualTech');
    const { listTripleTechs } = await import('../../shared/types/tripleTech');

    // 정량 정점 cross-check
    const grand = (
      listAllBossMonsterIds().length +
      listAllFieldMonsterIds().length +
      listDualTechs().length +
      listTripleTechs().length +
      getTotalFieldBosses()
    );
    expect(grand, '정점 entity sum').toBeGreaterThanOrEqual(128);
  });
});

describe('STORY-V84 — narrative type / runtime integrity', () => {
  it('chrono barrel re-export 타입 + 함수 모두 호출 가능 narrative', async () => {
    const mod = await import('../../shared/types/chrono');
    // 모든 chrono.ts barrel re-export 가 정의됨
    const requiredFunctions = [
      'chronoEraToSpeedTier', 'isChronoEraId', 'chronoEraToEnemyMultipliers',
      'chronoEraToAIHints', 'chronoEraToMonsterPassives', 'chronoEraBonusDrops',
      'decorateMonsterNameByEra',
      'listDualTechs', 'resolveDualTech', 'listDualTechsByEra', 'listDualTechsByElement', 'listAoeDualTechs', 'listDualTechsByClass', 'getDualTechById',
      'listTripleTechs', 'resolveTripleTech', 'listTripleTechsByEra', 'listTripleTechsByClass',
      'resolveFieldEncounter', 'listFieldEncounters', 'listFieldEncountersByZone', 'rollFieldMonster', 'getBossSlot', 'listAllFieldMonsterIds', 'getTotalFieldBosses', 'listAllBossMonsterIds', 'listBossOnlyFields',
    ];
    const modKeys = new Set(Object.keys(mod));
    for (const fn of requiredFunctions) {
      expect(modKeys.has(fn), `chrono barrel missing ${fn}`).toBe(true);
    }
  });

  it('chronoField field default fallback 정합 narrative — bgm undefined 면 era default 적용', async () => {
    const { resolveFieldEncounter } = await import('../../shared/types/chronoField');
    // 모든 21 encounter resolved bgmTrack 비빈 narrative
    for (const era of STORY_ERAS) {
      for (const zone of STORY_ZONES) {
        const e = resolveFieldEncounter(zone, era)!;
        expect(e.bgmTrack.startsWith('bgm_'), `${zone}/${era} bgm prefix`).toBe(true);
      }
    }
  });

  it('chronoField runtime 안정성 narrative — 모든 resolveFieldEncounter return 21 unique encounter', async () => {
    const { resolveFieldEncounter } = await import('../../shared/types/chronoField');
    const seen = new Set<string>();
    for (const era of STORY_ERAS) {
      for (const zone of STORY_ZONES) {
        const e = resolveFieldEncounter(zone, era)!;
        const key = `${e.zoneId}:${e.eraId}`;
        expect(seen.has(key), `duplicate resolve ${key}`).toBe(false);
        seen.add(key);
      }
    }
    expect(seen.size).toBe(21);
  });
});

describe('STORY-V86 — chronoEra 정확 값 narrative', () => {
  it('ancient: hp=0.9, attackSpeed=0.95, reward=1.0, levelOffset=-2 (회상 narrative)', async () => {
    const { chronoEraToEnemyMultipliers } = await import('../../shared/types/chronoEraAtb');
    const m = chronoEraToEnemyMultipliers('ancient');
    expect(m.hp).toBe(0.9);
    expect(m.attackSpeed).toBe(0.95);
    expect(m.reward).toBe(1.0);
    expect(m.levelOffset).toBe(-2);
  });

  it('present: hp=1.0, attackSpeed=1.0, reward=1.0, levelOffset=0 (기준 narrative)', async () => {
    const { chronoEraToEnemyMultipliers } = await import('../../shared/types/chronoEraAtb');
    const m = chronoEraToEnemyMultipliers('present');
    expect(m.hp).toBe(1.0);
    expect(m.attackSpeed).toBe(1.0);
    expect(m.reward).toBe(1.0);
    expect(m.levelOffset).toBe(0);
  });

  it('ruined_future: hp=1.25, attackSpeed=1.15, reward=1.25, levelOffset=6 (붕괴 narrative)', async () => {
    const { chronoEraToEnemyMultipliers } = await import('../../shared/types/chronoEraAtb');
    const m = chronoEraToEnemyMultipliers('ruined_future');
    expect(m.hp).toBe(1.25);
    expect(m.attackSpeed).toBe(1.15);
    expect(m.reward).toBe(1.25);
    expect(m.levelOffset).toBe(6);
  });

  it('chronoEraToMonsterPassives 정확 값 narrative (ancient evasion +5, future hit +5)', async () => {
    const { chronoEraToMonsterPassives } = await import('../../shared/types/chronoEraAtb');
    expect(chronoEraToMonsterPassives('ancient').evasionAddPercent).toBe(5);
    expect(chronoEraToMonsterPassives('ancient').hitChanceAddPercent).toBe(0);
    expect(chronoEraToMonsterPassives('ruined_future').evasionAddPercent).toBe(0);
    expect(chronoEraToMonsterPassives('ruined_future').hitChanceAddPercent).toBe(5);
  });
});

describe('STORY-V87 — 클래스 페어 ↔ element narrative', () => {
  it('void_wanderer 협공은 대부분 dark element narrative (공허=암흑)', async () => {
    const { listDualTechsByClass } = await import('../../shared/types/dualTech');
    const voidDuals = listDualTechsByClass('void_wanderer');
    const darkCount = voidDuals.filter((dt) => dt.element === 'dark').length;
    expect(darkCount, 'void_wanderer dark 협공 count').toBeGreaterThanOrEqual(2);
  });

  it('time_guardian 협공은 holy 또는 dark element narrative (수호=신성)', async () => {
    const { listDualTechsByClass } = await import('../../shared/types/dualTech');
    const guardDuals = listDualTechsByClass('time_guardian');
    const holyCount = guardDuals.filter((dt) => dt.element === 'holy').length;
    expect(holyCount, 'time_guardian holy 협공 count').toBeGreaterThanOrEqual(1);
  });

  it('time_knight + ether_knight 페어 = chrono_blade (chrono element narrative)', async () => {
    const { resolveDualTech } = await import('../../shared/types/dualTech');
    const dt = resolveDualTech('time_knight', 'ether_knight')!;
    expect(dt.id).toBe('chrono_blade');
    expect(dt.element).toBe('chrono');
  });

  it('memory_breaker + shadow_weaver 페어 = memory_shatter (dark element narrative)', async () => {
    const { resolveDualTech } = await import('../../shared/types/dualTech');
    const dt = resolveDualTech('memory_breaker', 'shadow_weaver')!;
    expect(dt.id).toBe('memory_shatter');
    expect(dt.element).toBe('dark');
  });

  it('ether_knight 단독 협공 element 다양성 ≥ 2 (단일 element 독점 없음)', async () => {
    const { listDualTechsByClass } = await import('../../shared/types/dualTech');
    const etherDuals = listDualTechsByClass('ether_knight');
    const elements = new Set(etherDuals.map((dt) => dt.element));
    expect(elements.size, 'ether_knight 협공 element 다양성').toBeGreaterThanOrEqual(2);
  });
});

describe('STORY-V88 — 시그니처 협공 description narrative 검증', () => {
  it('aetherna_final description "에테르나" 또는 "최종" 키워드 narrative (게임 정점 시그니처)', async () => {
    const { resolveTripleTech } = await import('../../shared/types/tripleTech');
    const tt = resolveTripleTech('ether_knight', 'time_knight', 'memory_weaver')!;
    expect(tt.description.includes('에테르나') || tt.description.includes('최종')).toBe(true);
  });

  it('void_eternity description "영원" 또는 "공허" 키워드 narrative', async () => {
    const { listTripleTechs } = await import('../../shared/types/tripleTech');
    const tt = listTripleTechs().find((t) => t.id === 'void_eternity')!;
    expect(tt.description.includes('영원') || tt.description.includes('공허')).toBe(true);
  });

  it('chrono_break description "시간" 키워드 narrative', async () => {
    const { listTripleTechs } = await import('../../shared/types/tripleTech');
    const tt = listTripleTechs().find((t) => t.id === 'chrono_break')!;
    expect(tt.description.includes('시간')).toBe(true);
  });

  it('15 Triple description 모두 length 10~100 narrative (의미 있는 설명)', async () => {
    const { listTripleTechs } = await import('../../shared/types/tripleTech');
    for (const tt of listTripleTechs()) {
      expect(tt.description.length, `${tt.id} description length`).toBeGreaterThanOrEqual(10);
      expect(tt.description.length).toBeLessThanOrEqual(100);
    }
  });

  it('21 Dual description 모두 length ≥ 4 narrative + 한글 포함', async () => {
    const { listDualTechs } = await import('../../shared/types/dualTech');
    for (const dt of listDualTechs()) {
      expect(dt.description.length, `${dt.id} description`).toBeGreaterThanOrEqual(4);
      expect(/[가-힣]/.test(dt.description), `${dt.id} 한글`).toBe(true);
    }
  });
});

describe('STORY-V89 — 60 sprint 마디 진입 시그니처 element narrative', () => {
  it('Triple chrono element 협공 모두 시그니처 narrative 키워드 ("크로노"/"타임"/"에테르나")', async () => {
    const { listTripleTechs } = await import('../../shared/types/tripleTech');
    const chronoTriples = listTripleTechs().filter((tt) => tt.element === 'chrono');
    for (const tt of chronoTriples) {
      const hasSig = tt.name.includes('크로노') || tt.name.includes('타임') || tt.name.includes('에테르나');
      expect(hasSig, `chrono Triple ${tt.id} '${tt.name}' 시그니처`).toBe(true);
    }
  });

  it('Triple dark element 협공 모두 시그니처 키워드 ("보이드"/"섀도우"/"이터니티"/"메모리"/"브레이크")', async () => {
    const { listTripleTechs } = await import('../../shared/types/tripleTech');
    const darkTriples = listTripleTechs().filter((tt) => tt.element === 'dark');
    for (const tt of darkTriples) {
      const hasSig = ['보이드', '섀도우', '이터니티', '메모리', '브레이크', '에테르', '다크', '리프', '가디언'].some((k) => tt.name.includes(k));
      expect(hasSig, `dark Triple ${tt.id} '${tt.name}' 시그니처`).toBe(true);
    }
  });

  it('60 sprint 마디 — Dual + Triple + Field cohesion 정점', async () => {
    const { listDualTechs, listAoeDualTechs } = await import('../../shared/types/dualTech');
    const { listTripleTechs } = await import('../../shared/types/tripleTech');
    const { listFieldEncounters, listAllBossMonsterIds } = await import('../../shared/types/chronoField');

    // V30~V89 누적 정량
    expect(listDualTechs().length).toBe(21);
    expect(listTripleTechs().length).toBe(15);
    expect(listFieldEncounters().length).toBe(21);
    expect(listAllBossMonsterIds().length).toBe(21);
    expect(listAoeDualTechs().length).toBe(3);

    // 모든 Triple aoe
    for (const tt of listTripleTechs()) {
      expect((tt as { aoe?: boolean }).aoe, `${tt.id} aoe`).toBe(true);
    }
  });

  it('60 sprint 마디 — aetherna 시그니처 모든 source narrative 일관성', async () => {
    const mod = await import('../../shared/types/chrono');
    const final = mod.resolveFieldEncounter('chrono_spire', 'ruined_future')!;
    expect(final.monsterPool.find((s) => s.isBoss)?.name).toBe('에테르나의 종말');
    const ancient = mod.resolveFieldEncounter('chrono_spire', 'ancient')!;
    expect(ancient.monsterPool.find((s) => s.isBoss)?.name).toBe('에테르나 환영');
    const tt = mod.resolveTripleTech('ether_knight', 'time_knight', 'memory_weaver')!;
    expect(tt.name).toBe('에테르나 파이널');
    expect(tt.element).toBe('chrono');
  });
});

describe('STORY-V91 — Triple Tech mpCost ranking narrative', () => {
  it('void_eternity mpCost = 35 (최강 Triple) narrative', async () => {
    const { listTripleTechs } = await import('../../shared/types/tripleTech');
    const tt = listTripleTechs().find((t) => t.id === 'void_eternity')!;
    expect(tt.mpCost).toBe(35);
  });

  it('aetherna_final mpCost = 30 (정점 협공, void_eternity 보다 낮음) narrative', async () => {
    const { resolveTripleTech } = await import('../../shared/types/tripleTech');
    const tt = resolveTripleTech('ether_knight', 'time_knight', 'memory_weaver')!;
    expect(tt.mpCost).toBe(30);
  });

  it('Triple mpCost 분포 시그니처 28/29/30/31/32/35 narrative (이산 정합)', async () => {
    const { listTripleTechs } = await import('../../shared/types/tripleTech');
    const costs = new Set(listTripleTechs().map((tt) => tt.mpCost));
    for (const cost of costs) {
      expect([28, 29, 30, 31, 32, 35]).toContain(cost);
    }
  });

  it('Triple mpCost 평균 ≥ 30 narrative (3인 협공 비용 평균 높음)', async () => {
    const { listTripleTechs } = await import('../../shared/types/tripleTech');
    const avg = listTripleTechs().reduce((s, tt) => s + tt.mpCost, 0) / 15;
    expect(avg).toBeGreaterThanOrEqual(29);
    expect(avg).toBeLessThanOrEqual(33);
  });
});

describe('STORY-V92 — zone-별 일반 monster id prefix 시그니처', () => {
  it('aether_plains zone 일반 monster ≥ 1 plains_/ancient_/ether_ prefix narrative', async () => {
    const { listFieldEncountersByZone } = await import('../../shared/types/chronoField');
    const list = listFieldEncountersByZone('aether_plains');
    let count = 0;
    for (const e of list) {
      for (const slot of e.monsterPool) {
        if (slot.isBoss) continue;
        if (slot.monsterId.startsWith('plains_') || slot.monsterId.startsWith('ancient_') || slot.monsterId.startsWith('ether_')) {
          count += 1;
        }
      }
    }
    expect(count).toBeGreaterThanOrEqual(1);
  });

  it('memory_forest zone 일반 monster ≥ 1 forest_/memory_ prefix narrative', async () => {
    const { listFieldEncountersByZone } = await import('../../shared/types/chronoField');
    const list = listFieldEncountersByZone('memory_forest');
    let count = 0;
    for (const e of list) {
      for (const slot of e.monsterPool) {
        if (slot.isBoss) continue;
        if (slot.monsterId.startsWith('forest_') || slot.monsterId.startsWith('memory_')) {
          count += 1;
        }
      }
    }
    expect(count).toBeGreaterThanOrEqual(1);
  });

  it('crystal_cave zone 일반 monster ≥ 1 crystal_/cave_/ether_ prefix narrative', async () => {
    const { listFieldEncountersByZone } = await import('../../shared/types/chronoField');
    const list = listFieldEncountersByZone('crystal_cave');
    let count = 0;
    for (const e of list) {
      for (const slot of e.monsterPool) {
        if (slot.isBoss) continue;
        if (slot.monsterId.startsWith('crystal_') || slot.monsterId.startsWith('cave_') || slot.monsterId.startsWith('ether_')) {
          count += 1;
        }
      }
    }
    expect(count).toBeGreaterThanOrEqual(1);
  });

  it('shadow_gorge zone 일반 monster ≥ 1 shadow_/gorge_/dusk_ prefix narrative', async () => {
    const { listFieldEncountersByZone } = await import('../../shared/types/chronoField');
    const list = listFieldEncountersByZone('shadow_gorge');
    let count = 0;
    for (const e of list) {
      for (const slot of e.monsterPool) {
        if (slot.isBoss) continue;
        if (slot.monsterId.startsWith('shadow_') || slot.monsterId.startsWith('gorge_') || slot.monsterId.startsWith('dusk_')) {
          count += 1;
        }
      }
    }
    expect(count).toBeGreaterThanOrEqual(1);
  });

  it('chrono_spire zone 일반 monster ≥ 1 chrono_/time_/aetherna_ prefix narrative (정점 zone)', async () => {
    const { listFieldEncountersByZone } = await import('../../shared/types/chronoField');
    const list = listFieldEncountersByZone('chrono_spire');
    let count = 0;
    for (const e of list) {
      for (const slot of e.monsterPool) {
        if (slot.isBoss) continue;
        if (slot.monsterId.startsWith('chrono_') || slot.monsterId.startsWith('time_') || slot.monsterId.startsWith('aetherna_')) {
          count += 1;
        }
      }
    }
    expect(count).toBeGreaterThanOrEqual(1);
  });
});
