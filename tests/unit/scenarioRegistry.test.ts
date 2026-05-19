/**
 * Unit tests — scenarioRegistry (SYNC-2)
 *
 * Obsidian 시나리오 SSOT 통합 모듈의 데이터 정합성 + 게임 코드 cross-domain 매핑 회귀 가드.
 */
import { describe, it, expect } from 'vitest';
import {
  SCENARIO_COMPANIONS,
  SCENARIO_ZONES,
  SCENARIO_BOSSES,
  SCENARIO_CHAPTERS,
  SCENARIO_ENDINGS,
  getCompanionByObsidianId,
  getZoneByObsidianId,
  getBossByObsidianId,
  listCompanionsByChapter,
  listBossesByChapter,
  getChapterByNumber,
  getEndingByCode,
  listSyncedCompanions,
  listSyncedZones,
  listSyncedBosses,
} from '../../shared/types/scenarioRegistry';
import { ALL_QUEST_SEEDS } from '../../server/src/quest/questSeeds';

describe('SYNC-S1 — SCENARIO_COMPANIONS 정합성 (Obsidian 6 동료)', () => {
  it('SCENARIO_COMPANIONS 6명 동료 narrative', () => {
    expect(SCENARIO_COMPANIONS.length).toBe(6);
  });

  it('동료 6명 obsidianId 모두 unique snake_case', () => {
    const ids = SCENARIO_COMPANIONS.map((c) => c.obsidianId);
    expect(new Set(ids).size).toBe(6);
    for (const id of ids) {
      expect(id.match(/^[a-z][a-z0-9_]*$/), `${id} snake_case`).not.toBeNull();
    }
  });

  it('동료 6명 한글 name + role 비빈', () => {
    const korean = /[가-힣]/;
    for (const c of SCENARIO_COMPANIONS) {
      expect(korean.test(c.name), `${c.obsidianId} 한글 name`).toBe(true);
      expect(c.role.length, `${c.obsidianId} role`).toBeGreaterThan(0);
    }
  });

  it('동료 joinChapter 1~4 narrative (Obsidian Ch1~Ch4 합류)', () => {
    for (const c of SCENARIO_COMPANIONS) {
      expect(c.joinChapter, `${c.obsidianId} chapter`).toBeGreaterThanOrEqual(1);
      expect(c.joinChapter).toBeLessThanOrEqual(4);
    }
  });

  it('Ch1 합류 동료: seraphine + maestro_crio (Obsidian 시작 동료)', () => {
    const ch1 = listCompanionsByChapter(1);
    const ids = ch1.map((c) => c.obsidianId);
    expect(ids).toContain('seraphine');
    expect(ids).toContain('maestro_crio');
  });

  it('Ch4 합류 동료 ≥ 3 (벤자민 + 레이나 + 우르그롬)', () => {
    const ch4 = listCompanionsByChapter(4);
    expect(ch4.length).toBeGreaterThanOrEqual(3);
    const ids = ch4.map((c) => c.obsidianId);
    expect(ids).toContain('benjamin_cross');
    expect(ids).toContain('reina');
    expect(ids).toContain('urgrom');
  });

  it('loyaltyThreshold 모두 1~100 범위', () => {
    for (const c of SCENARIO_COMPANIONS) {
      expect(c.loyaltyThreshold).toBeGreaterThanOrEqual(1);
      expect(c.loyaltyThreshold).toBeLessThanOrEqual(100);
    }
  });
});

describe('SYNC-S2 — SCENARIO_ZONES Obsidian narrative + 게임 매핑', () => {
  it('SCENARIO_ZONES 9개 zone narrative', () => {
    expect(SCENARIO_ZONES.length).toBe(9);
  });

  it('zone obsidianId 모두 unique snake_case', () => {
    const ids = SCENARIO_ZONES.map((z) => z.obsidianId);
    expect(new Set(ids).size).toBe(SCENARIO_ZONES.length);
    for (const id of ids) {
      expect(id.match(/^[a-z][a-z0-9_]*$/), `${id} snake_case`).not.toBeNull();
    }
  });

  it('zone chapter 1~5 범위 (Obsidian 5 chapter)', () => {
    for (const z of SCENARIO_ZONES) {
      expect(z.chapter, `${z.obsidianId} chapter`).toBeGreaterThanOrEqual(1);
      expect(z.chapter).toBeLessThanOrEqual(5);
    }
  });

  it('5 챕터 모두 ≥ 1 zone 보유', () => {
    for (let ch = 1; ch <= 5; ch += 1) {
      const zones = SCENARIO_ZONES.filter((z) => z.chapter === ch);
      expect(zones.length, `Ch${ch} zone count`).toBeGreaterThanOrEqual(1);
    }
  });

  it('실반헤임 (Ch2) 게임 매핑: memory_forest + zone_veiled_forest', () => {
    const z = getZoneByObsidianId('silvanheim');
    expect(z).toBeDefined();
    expect(z!.gameZoneId).toBe('memory_forest');
    expect(z!.gameQuestZoneTarget).toBe('zone_veiled_forest');
  });

  it('아르겐티움 (Ch4) 게임 매핑: chrono_spire + zone_argentium_sewer', () => {
    const z = getZoneByObsidianId('argentium');
    expect(z).toBeDefined();
    expect(z!.gameZoneId).toBe('chrono_spire');
    expect(z!.gameQuestZoneTarget).toBe('zone_argentium_sewer');
  });

  it('망각의 고원 (Ch5) 게임 매핑: forgotten_citadel + zone_oblivion_throne', () => {
    const z = getZoneByObsidianId('oblivion_plateau');
    expect(z!.gameZoneId).toBe('forgotten_citadel');
    expect(z!.gameQuestZoneTarget).toBe('zone_oblivion_throne');
  });

  it('에레보스 (Ch1) + 솔라리스 (Ch3) 게임 zone 매핑 없음 — sync 후속 작업 표식', () => {
    const erebos = getZoneByObsidianId('erebos');
    const solaris = getZoneByObsidianId('solaris');
    expect(erebos).toBeDefined();
    expect(solaris).toBeDefined();
    expect(erebos!.gameZoneId).toBeUndefined();
    expect(solaris!.gameZoneId).toBeUndefined();
  });
});

describe('SYNC-S3 — SCENARIO_BOSSES + 게임 보스 매핑', () => {
  it('SCENARIO_BOSSES 9개 보스 narrative', () => {
    expect(SCENARIO_BOSSES.length).toBe(9);
  });

  it('보스 obsidianId 모두 unique', () => {
    const ids = SCENARIO_BOSSES.map((b) => b.obsidianId);
    expect(new Set(ids).size).toBe(SCENARIO_BOSSES.length);
  });

  it('말라투스 (Ch2) chronoField 매핑 = malatus_avatar', () => {
    const b = getBossByObsidianId('malatus_ancient');
    expect(b!.gameChronoBossId).toBe('malatus_avatar');
    expect(b!.phases).toBe(3);
  });

  it('레테 (Ch5 최종) 매핑: questSeeds boss_oblivion_lord + chronoField aetherna_collapse', () => {
    const b = getBossByObsidianId('lethe');
    expect(b!.gameQuestBossId).toBe('boss_oblivion_lord');
    expect(b!.gameChronoBossId).toBe('aetherna_collapse');
    expect(b!.phases).toBe(5);
  });

  it('타락한 베르나르도 (Ch4) 매핑 = boss_bernardo_corrupted', () => {
    const b = getBossByObsidianId('corrupted_bernardo');
    expect(b!.gameQuestBossId).toBe('boss_bernardo_corrupted');
  });

  it('Ch5 보스 ≥ 3 (time_watcher + gear_guardian + lethe)', () => {
    const ch5 = listBossesByChapter(5);
    expect(ch5.length).toBeGreaterThanOrEqual(3);
  });
});

describe('SYNC-S4 — SCENARIO_CHAPTERS 정합성 + 게임 메인 퀘스트 매핑', () => {
  it('SCENARIO_CHAPTERS 5 chapter narrative (Obsidian Ch1~Ch5)', () => {
    expect(SCENARIO_CHAPTERS.length).toBe(5);
  });

  it('5 chapter 모두 chapter 1~5 정확', () => {
    const chapters = SCENARIO_CHAPTERS.map((c) => c.chapter).sort();
    expect(chapters).toEqual([1, 2, 3, 4, 5]);
  });

  it('각 chapter title 한글 narrative + location 비빈', () => {
    const korean = /[가-힣]/;
    for (const c of SCENARIO_CHAPTERS) {
      expect(korean.test(c.title), `Ch${c.chapter} title`).toBe(true);
      expect(c.location.length).toBeGreaterThan(0);
    }
  });

  it('Ch4 (아르겐티움) → MQ_CH04 + MQ_CH08 + MQ_CH12 매핑 (베르나르도 체인)', () => {
    const ch4 = getChapterByNumber(4)!;
    expect(ch4.gameMainQuests).toContain('MQ_CH04');
    expect(ch4.gameMainQuests).toContain('MQ_CH08');
    expect(ch4.gameMainQuests).toContain('MQ_CH12');
  });

  it('Ch5 (망각의 고원) → MQ_CH13 + MQ_CH14 + MQ_CH15 (최종 결전)', () => {
    const ch5 = getChapterByNumber(5)!;
    expect(ch5.gameMainQuests).toContain('MQ_CH13');
    expect(ch5.gameMainQuests).toContain('MQ_CH14');
    expect(ch5.gameMainQuests).toContain('MQ_CH15');
  });

  it('chapter gameMainQuests 모두 실제 ALL_QUEST_SEEDS 에 존재', () => {
    const codes = new Set(ALL_QUEST_SEEDS.map((q) => q.code));
    for (const c of SCENARIO_CHAPTERS) {
      for (const mq of c.gameMainQuests) {
        expect(codes.has(mq), `Ch${c.chapter} ${mq} not found`).toBe(true);
      }
    }
  });

  it('Ch3 (솔라리스) → gameMainQuests = [] (현재 미동기화 표식)', () => {
    const ch3 = getChapterByNumber(3)!;
    expect(ch3.gameMainQuests.length).toBe(0);
  });
});

describe('SYNC-S5 — SCENARIO_ENDINGS 멀티 엔딩 narrative', () => {
  it('5 엔딩 (A/B/C/D/FAIL) 정의', () => {
    expect(SCENARIO_ENDINGS.length).toBe(5);
    const codes = SCENARIO_ENDINGS.map((e) => e.code);
    expect(codes).toContain('A');
    expect(codes).toContain('B');
    expect(codes).toContain('C');
    expect(codes).toContain('D');
    expect(codes).toContain('FAIL');
  });

  it('엔딩 A: 신성 기억 파편 4개 + 동료 전원 생존 필수', () => {
    const a = getEndingByCode('A')!;
    expect(a.minFragments).toBe(4);
    expect(a.requireAllCompanions).toBe(true);
  });

  it('엔딩 B: 파편 3개 + 동료 선택', () => {
    const b = getEndingByCode('B')!;
    expect(b.minFragments).toBe(3);
    expect(b.requireAllCompanions).toBe(false);
  });

  it('엔딩 A 가 가장 엄격한 조건 (minFragments 최고)', () => {
    const a = getEndingByCode('A')!;
    const others = SCENARIO_ENDINGS.filter((e) => e.code !== 'A');
    for (const o of others) {
      expect(a.minFragments, `A vs ${o.code}`).toBeGreaterThanOrEqual(o.minFragments);
    }
  });

  it('엔딩 모두 한글 name + signature 한글', () => {
    const korean = /[가-힣]/;
    for (const e of SCENARIO_ENDINGS) {
      expect(korean.test(e.name), `${e.code} name`).toBe(true);
      expect(korean.test(e.signature), `${e.code} signature`).toBe(true);
    }
  });
});

describe('SYNC-S6 — 게임 코드 cross-check (매핑 정합성)', () => {
  it('동료 gameNpcId 모두 questSeeds 의 npcId 또는 objective target 에 존재', () => {
    // 모든 questSeeds 의 npcId + objective.target 집합
    const usedNpcs = new Set<string>();
    for (const q of ALL_QUEST_SEEDS) {
      if (q.npcId) usedNpcs.add(q.npcId);
      for (const obj of q.objectives) {
        if (obj.type === 'talk' && obj.target.startsWith('npc_')) {
          usedNpcs.add(obj.target);
        }
      }
    }
    for (const c of SCENARIO_COMPANIONS) {
      if (c.gameNpcId) {
        expect(usedNpcs.has(c.gameNpcId), `companion ${c.obsidianId} npcId '${c.gameNpcId}' in game`).toBe(true);
      }
    }
  });

  it('보스 gameQuestBossId 모두 questSeeds 의 kill objective target 에 존재', () => {
    const questBosses = new Set<string>();
    for (const q of ALL_QUEST_SEEDS) {
      for (const obj of q.objectives) {
        if (obj.type === 'kill' && obj.target.startsWith('boss_')) {
          questBosses.add(obj.target);
        }
      }
    }
    for (const b of SCENARIO_BOSSES) {
      if (b.gameQuestBossId) {
        expect(questBosses.has(b.gameQuestBossId), `boss ${b.obsidianId} '${b.gameQuestBossId}' in quest`).toBe(true);
      }
    }
  });

  it('zone gameZoneId 모두 chronoField 의 valid zone (STORY_ZONES)', async () => {
    const { listFieldEncounters } = await import('../../shared/types/chronoField');
    const validZones = new Set(listFieldEncounters().map((e) => e.zoneId));
    for (const z of SCENARIO_ZONES) {
      if (z.gameZoneId) {
        expect(validZones.has(z.gameZoneId), `zone ${z.obsidianId} '${z.gameZoneId}' in chronoField`).toBe(true);
      }
    }
  });

  it('보스 gameChronoBossId 모두 chronoField listAllBossMonsterIds 에 존재', async () => {
    const { listAllBossMonsterIds } = await import('../../shared/types/chronoField');
    const chronoBosses = new Set(listAllBossMonsterIds());
    for (const b of SCENARIO_BOSSES) {
      if (b.gameChronoBossId) {
        expect(chronoBosses.has(b.gameChronoBossId), `boss ${b.obsidianId} '${b.gameChronoBossId}' in chronoField`).toBe(true);
      }
    }
  });
});

describe('SYNC-S7 — synced helper 함수 narrative', () => {
  it('listSyncedCompanions ≥ 1 (벤자민 = 베르나르도 매핑)', () => {
    const synced = listSyncedCompanions();
    expect(synced.length).toBeGreaterThanOrEqual(1);
    const ids = synced.map((c) => c.obsidianId);
    expect(ids).toContain('benjamin_cross');
  });

  it('listSyncedZones ≥ 4 (실반헤임/말라투스/아르겐티움/팔라티노/망각/황금탑)', () => {
    const synced = listSyncedZones();
    expect(synced.length).toBeGreaterThanOrEqual(4);
  });

  it('listSyncedBosses ≥ 5 (말라투스 + 베르나르도 + time_watcher + gear_guardian + 레테)', () => {
    const synced = listSyncedBosses();
    expect(synced.length).toBeGreaterThanOrEqual(5);
  });
});

describe('SYNC-S8 — 미동기화 항목 표식 (장기 작업 추적)', () => {
  it('미동기화 동료 ≥ 5 (sync TODO)', () => {
    const unsynced = SCENARIO_COMPANIONS.filter((c) => !c.gameNpcId && !c.gameBossId);
    expect(unsynced.length).toBeGreaterThanOrEqual(5);
  });

  it('미동기화 zone ≥ 2 (에레보스/솔라리스 + 칸텔라)', () => {
    const unsynced = SCENARIO_ZONES.filter((z) => !z.gameZoneId && !z.gameQuestZoneTarget);
    expect(unsynced.length).toBeGreaterThanOrEqual(2);
  });

  it('미동기화 보스 ≥ 2 (라와르 + 케인)', () => {
    const unsynced = SCENARIO_BOSSES.filter((b) => !b.gameChronoBossId && !b.gameQuestBossId);
    expect(unsynced.length).toBeGreaterThanOrEqual(2);
  });
});
