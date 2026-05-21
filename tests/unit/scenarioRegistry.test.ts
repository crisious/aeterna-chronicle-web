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

  it('에레보스 (Ch1) + 솔라리스 (Ch3) gameQuestZoneTarget sync 완료 (SYNC-8 questSeeds 추가)', () => {
    const erebos = getZoneByObsidianId('erebos');
    const solaris = getZoneByObsidianId('solaris');
    expect(erebos).toBeDefined();
    expect(solaris).toBeDefined();
    expect(erebos!.gameQuestZoneTarget).toBe('zone_erebos_city');
    expect(solaris!.gameQuestZoneTarget).toBe('zone_solaris_desert');
    // chronoField zone 추가는 다음 라운드 (plannedGameZoneId 유지)
    expect(erebos!.plannedGameZoneId).toBe('erebos_ruins');
    expect(solaris!.plannedGameZoneId).toBe('solaris_dunes');
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

  it('Ch3 (솔라리스) gameMainQuests = [] — sub quest SQ_SOLARIS_RAWAR 로 sync (메인 미정의)', () => {
    const ch3 = getChapterByNumber(3)!;
    expect(ch3.gameMainQuests.length).toBe(0);
    // SYNC-8: Ch3 narrative 는 sub quest 로만 sync
    const sq = ALL_QUEST_SEEDS.find((q) => q.code === 'SQ_SOLARIS_RAWAR');
    expect(sq, 'SQ_SOLARIS_RAWAR exists for Ch3').toBeDefined();
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

describe('SYNC-S8 — 미동기화 항목 표식 (SYNC-8 후 모든 entity sync 완료)', () => {
  it('미동기화 동료 = 0 (6 동료 모두 sync 완료)', () => {
    const unsynced = SCENARIO_COMPANIONS.filter((c) => !c.gameNpcId && !c.gameBossId);
    expect(unsynced.length).toBe(0);
  });

  it('미동기화 zone = 0 (SYNC-8 후 9 zone 모두 sync 완료)', () => {
    const unsynced = SCENARIO_ZONES.filter((z) => !z.gameZoneId && !z.gameQuestZoneTarget);
    expect(unsynced.length).toBe(0);
  });

  it('미동기화 보스 = 0 (SYNC-8 후 9 보스 모두 sync 완료)', () => {
    const unsynced = SCENARIO_BOSSES.filter((b) => !b.gameChronoBossId && !b.gameQuestBossId);
    expect(unsynced.length).toBe(0);
  });
});

// ════════════════════════════════════════════════════════════════
// SYNC-3 — 신성 기억 파편 + 신화 신 + 신뢰도 + 엔딩 판정 가드
// ════════════════════════════════════════════════════════════════

import {
  SCENARIO_FRAGMENTS,
  SCENARIO_DEITIES,
  evaluateLoyalty,
  evaluateEnding,
  getFragmentByObsidianId,
  getDeityByObsidianId,
  listCreationDeities,
  listExcludedDeities,
} from '../../shared/types/scenarioRegistry';

describe('SYNC-S9 — SCENARIO_FRAGMENTS 4 신성 기억 파편', () => {
  it('SCENARIO_FRAGMENTS = 4 (Ch1~Ch4 각 1개)', () => {
    expect(SCENARIO_FRAGMENTS.length).toBe(4);
  });

  it('각 chapter 1~4 정확히 1 파편 보유', () => {
    const chapters = SCENARIO_FRAGMENTS.map((f) => f.chapter).sort();
    expect(chapters).toEqual([1, 2, 3, 4]);
  });

  it('각 파편 zone 매핑 narrative (에레보스/실반헤임/솔라리스/아르겐티움)', () => {
    const zonesByChapter = new Map<number, string>();
    for (const f of SCENARIO_FRAGMENTS) zonesByChapter.set(f.chapter, f.zoneObsidianId);
    expect(zonesByChapter.get(1)).toBe('erebos');
    expect(zonesByChapter.get(2)).toBe('silvanheim');
    expect(zonesByChapter.get(3)).toBe('solaris');
    expect(zonesByChapter.get(4)).toBe('argentium');
  });

  it('각 파편 zone 이 SCENARIO_ZONES 에 정의 (dangling 없음)', () => {
    const zoneIds = new Set(SCENARIO_ZONES.map((z) => z.obsidianId));
    for (const f of SCENARIO_FRAGMENTS) {
      expect(zoneIds.has(f.zoneObsidianId), `${f.obsidianId} zone`).toBe(true);
    }
  });

  it('카일 봉인 파편 = Ch1 (에레보스) — 전생 봉인 narrative', () => {
    const f = getFragmentByObsidianId('fragment_erebos');
    expect(f).toBeDefined();
    expect(f!.sealer).toContain('카일');
  });

  it('라와르 봉인 파편 = Ch3 (솔라리스) — 솔리안 왕 봉인', () => {
    const f = getFragmentByObsidianId('fragment_solaris');
    expect(f).toBeDefined();
    expect(f!.sealer).toContain('라와르');
  });
});

describe('SYNC-S10 — SCENARIO_DEITIES 12 신화 신', () => {
  it('SCENARIO_DEITIES = 12 (창세 11신 + 레테 배제)', () => {
    expect(SCENARIO_DEITIES.length).toBe(12);
  });

  it('창세 11신 (inCreation=true) = 11', () => {
    expect(listCreationDeities().length).toBe(11);
  });

  it('레테 배제 (inCreation=false) = 1 — 망각의 신 narrative', () => {
    const excluded = listExcludedDeities();
    expect(excluded.length).toBe(1);
    expect(excluded[0].obsidianId).toBe('lethe');
    expect(excluded[0].domain).toBe('망각');
  });

  it('12 신 obsidianId 모두 unique snake_case', () => {
    const ids = SCENARIO_DEITIES.map((d) => d.obsidianId);
    expect(new Set(ids).size).toBe(12);
    for (const id of ids) {
      expect(id.match(/^[a-z][a-z0-9_]*$/)).not.toBeNull();
    }
  });

  it('12 신 한글 name + 한글 domain narrative', () => {
    const korean = /[가-힣]/;
    for (const d of SCENARIO_DEITIES) {
      expect(korean.test(d.name), `${d.obsidianId} 한글 name`).toBe(true);
      expect(korean.test(d.domain), `${d.obsidianId} 한글 domain`).toBe(true);
    }
  });

  it('크로나이 (시간) 신 정의 — 게임 chrono_spire 시그니처 narrative', () => {
    const d = getDeityByObsidianId('chronai');
    expect(d).toBeDefined();
    expect(d!.domain).toBe('시간');
  });

  it('12 신 domain 모두 unique (관장 영역 중첩 없음)', () => {
    const domains = SCENARIO_DEITIES.map((d) => d.domain);
    expect(new Set(domains).size).toBe(12);
  });
});

describe('SYNC-S11 — 신뢰도 평가 evaluateLoyalty', () => {
  it('세라핀 신뢰도 50 (threshold) → 이탈 안 함', () => {
    const r = evaluateLoyalty('seraphine', 50);
    expect(r.hasLeft).toBe(false);
  });

  it('세라핀 신뢰도 49 (threshold 미만) → 이탈', () => {
    const r = evaluateLoyalty('seraphine', 49);
    expect(r.hasLeft).toBe(true);
  });

  it('이그나 신뢰도 20 (threshold) → 이탈 안 함', () => {
    const r = evaluateLoyalty('ignara', 20);
    expect(r.hasLeft).toBe(false);
  });

  it('이그나 신뢰도 19 → 이탈 (Ch4 합류 실패)', () => {
    const r = evaluateLoyalty('ignara', 19);
    expect(r.hasLeft).toBe(true);
  });

  it('unknown 동료 → hasLeft=false (안전 가드)', () => {
    const r = evaluateLoyalty('unknown_companion', 0);
    expect(r.hasLeft).toBe(false);
  });
});

describe('SYNC-S12 — 엔딩 판정 evaluateEnding', () => {
  it('파편 4 + 전원 생존 → 엔딩 A (수호자)', () => {
    const r = evaluateEnding(4, true);
    expect(r.achievableEnding).toBe('A');
  });

  it('파편 4 + 동료 일부 이탈 → 엔딩 B (전원 조건 미달)', () => {
    const r = evaluateEnding(4, false);
    expect(r.achievableEnding).toBe('B');
  });

  it('파편 3 + 전원 생존 → 엔딩 B (증언)', () => {
    const r = evaluateEnding(3, true);
    expect(r.achievableEnding).toBe('B');
  });

  it('파편 3 + 동료 이탈 → 엔딩 B', () => {
    const r = evaluateEnding(3, false);
    expect(r.achievableEnding).toBe('B');
  });

  it('파편 2 → 엔딩 C (수용)', () => {
    const r = evaluateEnding(2, true);
    expect(r.achievableEnding).toBe('C');
  });

  it('파편 0 → 엔딩 C (망각)', () => {
    const r = evaluateEnding(0, false);
    expect(r.achievableEnding).toBe('C');
  });

  it('판정 결과 fragmentsCollected + allCompanionsAlive 보존', () => {
    const r = evaluateEnding(3, true);
    expect(r.fragmentsCollected).toBe(3);
    expect(r.allCompanionsAlive).toBe(true);
  });
});

describe('SYNC-S13 — 4 파편 ↔ 엔딩 narrative cohesion', () => {
  it('SCENARIO_FRAGMENTS 총 4 = 엔딩 A minFragments', () => {
    const endingA = SCENARIO_ENDINGS.find((e) => e.code === 'A')!;
    expect(SCENARIO_FRAGMENTS.length).toBe(endingA.minFragments);
  });

  it('SCENARIO_FRAGMENTS 4 chapter 모두 SCENARIO_CHAPTERS 1~4 정확 매칭', () => {
    const fragmentChapters = SCENARIO_FRAGMENTS.map((f) => f.chapter).sort();
    const chapterNums = SCENARIO_CHAPTERS.filter((c) => c.chapter <= 4).map((c) => c.chapter).sort();
    expect(fragmentChapters).toEqual(chapterNums);
  });
});

describe('SYNC-S14 — chrono.ts barrel scenarioRegistry 통합', () => {
  it('chrono barrel 에서 scenarioRegistry 핵심 API 접근 가능', async () => {
    const mod = await import('../../shared/types/chrono');
    expect(Array.isArray(mod.SCENARIO_COMPANIONS)).toBe(true);
    expect(Array.isArray(mod.SCENARIO_ZONES)).toBe(true);
    expect(Array.isArray(mod.SCENARIO_BOSSES)).toBe(true);
    expect(Array.isArray(mod.SCENARIO_CHAPTERS)).toBe(true);
    expect(Array.isArray(mod.SCENARIO_ENDINGS)).toBe(true);
    expect(Array.isArray(mod.SCENARIO_FRAGMENTS)).toBe(true);
    expect(Array.isArray(mod.SCENARIO_DEITIES)).toBe(true);
  });

  it('chrono barrel 에서 helper 함수 호출 가능', async () => {
    const mod = await import('../../shared/types/chrono');
    expect(typeof mod.getCompanionByObsidianId).toBe('function');
    expect(typeof mod.getZoneByObsidianId).toBe('function');
    expect(typeof mod.getBossByObsidianId).toBe('function');
    expect(typeof mod.evaluateLoyalty).toBe('function');
    expect(typeof mod.evaluateEnding).toBe('function');
  });

  it('chrono barrel 통합 cross-check: aetherna 시그니처 + 레테 narrative 동시 접근', async () => {
    const mod = await import('../../shared/types/chrono');
    // chronoField aetherna_collapse
    expect(mod.listAllBossMonsterIds()).toContain('aetherna_collapse');
    // scenarioRegistry 레테 → aetherna_collapse 매핑
    const lethe = mod.getBossByObsidianId('lethe');
    expect(lethe?.gameChronoBossId).toBe('aetherna_collapse');
  });
});

// ════════════════════════════════════════════════════════════════
// SYNC-5/6 — 미동기 항목 planned 매핑 회귀 가드
// ════════════════════════════════════════════════════════════════

import {
  listPlannedCompanions,
  listPlannedZones,
  listPlannedBosses,
  getSyncCompletionReport,
} from '../../shared/types/scenarioRegistry';

describe('SYNC-S15 — planned 동료 매핑 (SYNC-7 후 모두 sync 전환)', () => {
  it('planned 동료 = 0 (SYNC-7 후 5 동료 questSeeds 에 실제 추가)', () => {
    const planned = listPlannedCompanions();
    expect(planned.length).toBe(0);
  });

  it('6 동료 모두 gameNpcId sync 완료 (questSeeds 등장)', () => {
    for (const c of SCENARIO_COMPANIONS) {
      expect(c.gameNpcId, `${c.obsidianId} gameNpcId`).toBeDefined();
      expect(c.gameNpcId!.match(/^npc_[a-z][a-z0-9_]*$/), `${c.obsidianId} npc_ prefix`).not.toBeNull();
    }
  });

  it('세라핀/크리오/이그나/레이나/우르그롬 gameNpcId 매핑 정확', () => {
    const map = new Map(SCENARIO_COMPANIONS.map((c) => [c.obsidianId, c.gameNpcId]));
    expect(map.get('seraphine')).toBe('npc_seraphine');
    expect(map.get('maestro_crio')).toBe('npc_maestro_crio');
    expect(map.get('ignara')).toBe('npc_ignara');
    expect(map.get('reina')).toBe('npc_reina');
    expect(map.get('urgrom')).toBe('npc_urgrom');
  });

  it('5 동료 모두 SQ_COMPANION_* sub quest 에 등장 (questSeeds 실제 등록)', () => {
    const COMPANION_QUEST_CODES = [
      'SQ_COMPANION_SERAPHINE', 'SQ_COMPANION_CRIO', 'SQ_COMPANION_IGNARA',
      'SQ_COMPANION_REINA', 'SQ_COMPANION_URGROM',
    ];
    const codes = new Set(ALL_QUEST_SEEDS.map((q) => q.code));
    for (const code of COMPANION_QUEST_CODES) {
      expect(codes.has(code), `${code} in questSeeds`).toBe(true);
    }
  });

  it('5 동료 sub quest 모두 npcId = scenarioRegistry gameNpcId 매핑', () => {
    const COMPANION_QUEST_TO_NPC: Record<string, string> = {
      'SQ_COMPANION_SERAPHINE': 'npc_seraphine',
      'SQ_COMPANION_CRIO': 'npc_maestro_crio',
      'SQ_COMPANION_IGNARA': 'npc_ignara',
      'SQ_COMPANION_REINA': 'npc_reina',
      'SQ_COMPANION_URGROM': 'npc_urgrom',
    };
    for (const [code, expectedNpc] of Object.entries(COMPANION_QUEST_TO_NPC)) {
      const q = ALL_QUEST_SEEDS.find((x) => x.code === code);
      expect(q, `${code} found`).toBeDefined();
      expect(q!.npcId, `${code} npcId`).toBe(expectedNpc);
    }
  });
});

describe('SYNC-S16 — planned zone 매핑 (SYNC-8 후 chronoField planned 만)', () => {
  it('planned zone = 2 (에레보스/솔라리스 chronoField 예정, 칸텔라는 questSeeds 완료)', () => {
    const planned = listPlannedZones();
    // 에레보스 + 솔라리스 plannedGameZoneId 남음 (chronoField 추가 예정)
    expect(planned.length).toBe(2);
    const ids = planned.map((z) => z.obsidianId).sort();
    expect(ids).toEqual(['erebos', 'solaris']);
  });

  it('에레보스 + 솔라리스 gameQuestZoneTarget sync 완료 + plannedGameZoneId 남음', () => {
    const erebos = SCENARIO_ZONES.find((z) => z.obsidianId === 'erebos')!;
    const solaris = SCENARIO_ZONES.find((z) => z.obsidianId === 'solaris')!;
    expect(erebos.gameQuestZoneTarget).toBe('zone_erebos_city');
    expect(erebos.plannedGameZoneId).toBe('erebos_ruins');
    expect(solaris.gameQuestZoneTarget).toBe('zone_solaris_desert');
    expect(solaris.plannedGameZoneId).toBe('solaris_dunes');
  });

  it('칸텔라 (Ch1) 마을 gameQuestZoneTarget sync 완료 + chronoField 미예정', () => {
    const cantela = SCENARIO_ZONES.find((z) => z.obsidianId === 'cantela_village')!;
    expect(cantela.gameQuestZoneTarget).toBe('zone_cantela_village');
    expect(cantela.plannedGameZoneId).toBeUndefined();
  });

  it('3 zone 모두 SQ_EREBOS_RUINS / SQ_CANTELA_RESCUE / SQ_SOLARIS_RAWAR 등록', () => {
    const codes = new Set(ALL_QUEST_SEEDS.map((q) => q.code));
    expect(codes.has('SQ_EREBOS_RUINS')).toBe(true);
    expect(codes.has('SQ_CANTELA_RESCUE')).toBe(true);
    expect(codes.has('SQ_SOLARIS_RAWAR')).toBe(true);
  });
});

describe('SYNC-S17 — planned 보스 매핑 (SYNC-8 후 chronoField planned 만)', () => {
  it('planned 보스 = 1 (라와르 chronoField 예정, 케인은 questSeeds 완료)', () => {
    const planned = listPlannedBosses();
    expect(planned.length).toBe(1);
    expect(planned[0].obsidianId).toBe('rawar');
  });

  it('라와르 (Ch3) gameQuestBossId sync + plannedGameChronoBossId 남음 (chronoField 예정)', () => {
    const rawar = SCENARIO_BOSSES.find((b) => b.obsidianId === 'rawar')!;
    expect(rawar.gameQuestBossId).toBe('boss_rawar');
    expect(rawar.plannedGameChronoBossId).toBe('rawar_ancient_king');
    expect(rawar.phases).toBe(3);
  });

  it('케인 (Ch4) gameQuestBossId sync 완료 (chronoField 미예정)', () => {
    const kane = SCENARIO_BOSSES.find((b) => b.obsidianId === 'kane')!;
    expect(kane.gameQuestBossId).toBe('boss_kane_corrupted');
    expect(kane.plannedGameChronoBossId).toBeUndefined();
  });

  it('SQ_SOLARIS_RAWAR / SQ_KANE_HUNT 모두 questSeeds 등록', () => {
    const codes = new Set(ALL_QUEST_SEEDS.map((q) => q.code));
    expect(codes.has('SQ_SOLARIS_RAWAR')).toBe(true);
    expect(codes.has('SQ_KANE_HUNT')).toBe(true);
  });
});

describe('SYNC-S18 — getSyncCompletionReport 종합 커버리지 (SYNC-8 후 100% sync)', () => {
  it('동료 커버리지: 6 sync / 0 planned / 0 orphan', () => {
    const r = getSyncCompletionReport();
    expect(r.companions.total).toBe(6);
    expect(r.companions.synced).toBe(6);
    expect(r.companions.planned).toBe(0);
    expect(r.companions.orphan).toBe(0);
  });

  it('zone 커버리지: 9 sync / 0 orphan (SYNC-8 완료)', () => {
    const r = getSyncCompletionReport();
    expect(r.zones.total).toBe(9);
    expect(r.zones.synced).toBe(9);
    expect(r.zones.orphan).toBe(0);
  });

  it('보스 커버리지: 9 sync / 0 orphan (SYNC-8 완료)', () => {
    const r = getSyncCompletionReport();
    expect(r.bosses.total).toBe(9);
    expect(r.bosses.synced).toBe(9);
    expect(r.bosses.orphan).toBe(0);
  });

  it('전체 커버리지 percentage = 100 (SYNC-8 후 모든 entity sync+planned)', () => {
    const r = getSyncCompletionReport();
    expect(r.coveragePercent).toBe(100);
  });
});

describe('SYNC-S19 — planned ID naming 일관성', () => {
  it('모든 planned NPC id snake_case + npc_ prefix', () => {
    for (const c of SCENARIO_COMPANIONS) {
      if (c.plannedGameNpcId) {
        expect(c.plannedGameNpcId.match(/^npc_[a-z][a-z0-9_]*$/), `${c.obsidianId}`).not.toBeNull();
      }
    }
  });

  it('모든 planned zone target snake_case + zone_ prefix', () => {
    for (const z of SCENARIO_ZONES) {
      if (z.plannedGameQuestZoneTarget) {
        expect(z.plannedGameQuestZoneTarget.match(/^zone_[a-z][a-z0-9_]*$/), `${z.obsidianId}`).not.toBeNull();
      }
    }
  });

  it('모든 planned 보스 questSeeds id snake_case + boss_ prefix', () => {
    for (const b of SCENARIO_BOSSES) {
      if (b.plannedGameQuestBossId) {
        expect(b.plannedGameQuestBossId.match(/^boss_[a-z][a-z0-9_]*$/), `${b.obsidianId}`).not.toBeNull();
      }
    }
  });

  it('planned ID 와 sync 완료 ID 중복 없음 (전 도메인)', () => {
    for (const c of SCENARIO_COMPANIONS) {
      if (c.gameNpcId && c.plannedGameNpcId) {
        expect.fail(`${c.obsidianId} 이중 정의 (sync + planned)`);
      }
    }
    for (const z of SCENARIO_ZONES) {
      if (z.gameQuestZoneTarget && z.plannedGameQuestZoneTarget) {
        expect.fail(`${z.obsidianId} 이중 정의 (sync + planned)`);
      }
    }
    for (const b of SCENARIO_BOSSES) {
      if (b.gameQuestBossId && b.plannedGameQuestBossId) {
        expect.fail(`${b.obsidianId} 이중 정의 (sync + planned)`);
      }
    }
  });
});

describe('SYNC-S30 — 신화 유물 SSOT + 엔딩 D 조건 (SYNC-19)', () => {
  it('SCENARIO_MYTHIC_RELICS 4 유물 (열두 신 중 4신 매핑)', async () => {
    const { SCENARIO_MYTHIC_RELICS } = await import('../../shared/types/scenarioRegistry');
    expect(SCENARIO_MYTHIC_RELICS.length).toBe(4);
  });

  it('각 유물 obsidianId unique + relic_ prefix', async () => {
    const { SCENARIO_MYTHIC_RELICS } = await import('../../shared/types/scenarioRegistry');
    const ids = SCENARIO_MYTHIC_RELICS.map((r) => r.obsidianId);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id.startsWith('relic_'), `${id} relic_ prefix`).toBe(true);
    }
  });

  it('각 유물 한글 name + zoneObsidianId SCENARIO_ZONES 존재', async () => {
    const { SCENARIO_MYTHIC_RELICS, SCENARIO_ZONES } = await import('../../shared/types/scenarioRegistry');
    const korean = /[가-힣]/;
    const zoneIds = new Set(SCENARIO_ZONES.map((z) => z.obsidianId));
    for (const r of SCENARIO_MYTHIC_RELICS) {
      expect(korean.test(r.name), `${r.obsidianId} 한글`).toBe(true);
      expect(zoneIds.has(r.zoneObsidianId), `${r.obsidianId} zone`).toBe(true);
    }
  });

  it('각 유물 deityObsidianId SCENARIO_DEITIES 존재 (창세 11신)', async () => {
    const { SCENARIO_MYTHIC_RELICS, SCENARIO_DEITIES } = await import('../../shared/types/scenarioRegistry');
    const creationDeities = new Set(
      SCENARIO_DEITIES.filter((d) => d.inCreation).map((d) => d.obsidianId),
    );
    for (const r of SCENARIO_MYTHIC_RELICS) {
      expect(creationDeities.has(r.deityObsidianId), `${r.obsidianId} deity`).toBe(true);
    }
  });

  it('MINERVA_ENCOUNTER 조건: 신화 유물 ≥2 + golden_ether_tower 탐사', async () => {
    const { MINERVA_ENCOUNTER } = await import('../../shared/types/scenarioRegistry');
    expect(MINERVA_ENCOUNTER.minMythicRelics).toBe(2);
    expect(MINERVA_ENCOUNTER.requiredZones).toContain('golden_ether_tower');
  });

  it('canEncounterMinerva: 0 유물 → false', async () => {
    const { canEncounterMinerva } = await import('../../shared/types/scenarioRegistry');
    expect(canEncounterMinerva(new Set(), new Set(['golden_ether_tower']))).toBe(false);
  });

  it('canEncounterMinerva: 2 유물 + golden_ether_tower → true', async () => {
    const { canEncounterMinerva } = await import('../../shared/types/scenarioRegistry');
    expect(
      canEncounterMinerva(
        new Set(['relic_chronai_hourglass', 'relic_ignarus_flame']),
        new Set(['golden_ether_tower']),
      ),
    ).toBe(true);
  });

  it('canEncounterMinerva: 4 유물 but no golden_ether_tower → false (zone 필수)', async () => {
    const { canEncounterMinerva, SCENARIO_MYTHIC_RELICS } = await import('../../shared/types/scenarioRegistry');
    const allRelics = new Set(SCENARIO_MYTHIC_RELICS.map((r) => r.obsidianId));
    expect(canEncounterMinerva(allRelics, new Set())).toBe(false);
  });

  it('getMythicRelicByObsidianId + listRelicsByDeity 헬퍼 동작', async () => {
    const { getMythicRelicByObsidianId, listRelicsByDeity } = await import('../../shared/types/scenarioRegistry');
    expect(getMythicRelicByObsidianId('relic_chronai_hourglass')?.name).toBe('크로나이의 모래시계');
    expect(listRelicsByDeity('chronai').length).toBeGreaterThanOrEqual(1);
    expect(listRelicsByDeity('lethe').length).toBe(0); // 레테는 배제, 유물 없음
  });

  it('4 유물 zone 분포 narrative (아르겐티움/솔라리스/실반헤임/에레보스)', async () => {
    const { SCENARIO_MYTHIC_RELICS } = await import('../../shared/types/scenarioRegistry');
    const zones = new Set(SCENARIO_MYTHIC_RELICS.map((r) => r.zoneObsidianId));
    expect(zones.has('argentium')).toBe(true);
    expect(zones.has('solaris')).toBe(true);
    expect(zones.has('silvanheim')).toBe(true);
    expect(zones.has('erebos')).toBe(true);
  });
});

describe('SYNC-S29 — 누적 종합 stress + 18 sprint cohesion (SYNC-18)', () => {
  it('전 SSOT entity 정량 (chapter III 완료)', async () => {
    const mod = await import('../../shared/types/chrono');
    expect(mod.SCENARIO_COMPANIONS.length).toBe(6);
    expect(mod.SCENARIO_ZONES.length).toBe(9);
    expect(mod.SCENARIO_BOSSES.length).toBe(9);
    expect(mod.SCENARIO_CHAPTERS.length).toBe(5);
    expect(mod.SCENARIO_ENDINGS.length).toBe(5);
    expect(mod.SCENARIO_FRAGMENTS.length).toBe(4);
    expect(mod.SCENARIO_DEITIES.length).toBe(12);
    expect(mod.SCENARIO_TIMELINE.length).toBe(13);
    expect(mod.SCENARIO_MILESTONES.length).toBe(5);
    expect(mod.SCENARIO_DIALOGUES.length).toBeGreaterThanOrEqual(9);
    expect(mod.COMPANION_REPUTATION_REWARDS.length).toBe(5);
  });

  it('SSOT 헬퍼 함수 모두 chrono barrel 접근 (18 sprint 누적)', async () => {
    const mod = await import('../../shared/types/chrono');
    // SYNC-1~17 누적 helpers
    expect(typeof mod.getCompanionByObsidianId).toBe('function');
    expect(typeof mod.getZoneByObsidianId).toBe('function');
    expect(typeof mod.getBossByObsidianId).toBe('function');
    expect(typeof mod.getFragmentByObsidianId).toBe('function');
    expect(typeof mod.getDeityByObsidianId).toBe('function');
    expect(typeof mod.getTimelineEventByObsidianId).toBe('function');
    expect(typeof mod.getMilestoneByChapter).toBe('function');
    expect(typeof mod.getDialoguesByNpc).toBe('function');
    expect(typeof mod.evaluateLoyalty).toBe('function');
    expect(typeof mod.evaluateEnding).toBe('function');
    expect(typeof mod.evaluateGameFlow).toBe('function');
    expect(typeof mod.evaluateAdvancedEnding).toBe('function');
    expect(typeof mod.evaluateChapterProgress).toBe('function');
    expect(typeof mod.applyReputationReward).toBe('function');
    expect(typeof mod.getSyncCompletionReport).toBe('function');
  });

  it('전 entity sync 100% + coverage = 100%', async () => {
    const { getSyncCompletionReport } = await import('../../shared/types/scenarioRegistry');
    const r = getSyncCompletionReport();
    expect(r.coveragePercent).toBe(100);
    expect(r.companions.synced).toBe(6);
    expect(r.zones.synced).toBe(9);
    expect(r.bosses.synced).toBe(9);
  });

  it('완전한 엔딩 A 시나리오: timeline + milestone + dialogue + reputation + ending', async () => {
    const mod = await import('../../shared/types/scenarioRegistry');

    // 1. 게임 시작 timeline event
    const start = mod.getTimelineEventByObsidianId('game_start_cantela');
    expect(start?.worldYear).toBe(3412);

    // 2. Ch1 milestone — 세라핀+크리오 합류
    const ch1 = mod.getMilestoneByChapter(1);
    expect(ch1?.unlockedCompanions).toContain('seraphine');
    expect(ch1?.unlockedCompanions).toContain('maestro_crio');

    // 3. 세라핀 first_meet 대화
    const seraphineDialogues = mod.getDialoguesByNpc('npc_seraphine');
    expect(seraphineDialogues.length).toBeGreaterThanOrEqual(1);

    // 4. 세라핀 quest 완료 → loyalty 50
    const rep = mod.applyReputationReward('seraphine', 0, 'SQ_COMPANION_SERAPHINE');
    expect(rep.newLoyalty).toBe(50);
    expect(rep.meetsThreshold).toBe(true);

    // 5. 엔딩 A 도달 (전 시나리오 완주)
    const allLoyalty = { seraphine: 50, maestro_crio: 40, ignara: 20, benjamin_cross: 40, reina: 30, urgrom: 40 };
    const allQuests = new Set([
      'SQ_EREBOS_RUINS', 'SQ_SILVANHEIM_FRAGMENT',
      'SQ_SOLARIS_RAWAR', 'SQ_ARGENTIUM_FRAGMENT',
    ]);
    expect(mod.checkEndingA({ completedQuests: allQuests, companionLoyalty: allLoyalty })).toBe(true);
  });

  it('chapter III 추가 항목 (timeline/milestone/dialogue) cohesion', async () => {
    const mod = await import('../../shared/types/scenarioRegistry');
    // 모든 milestone Ch ↔ timeline Ch 매핑 가능
    for (const m of mod.SCENARIO_MILESTONES) {
      const chapter = mod.getChapterByNumber(m.chapter);
      expect(chapter, `Ch${m.chapter} chapter`).toBeDefined();
    }
    // 모든 dialogue chapter ↔ chapter 매핑 가능
    for (const d of mod.SCENARIO_DIALOGUES) {
      const chapter = mod.getChapterByNumber(d.chapter);
      expect(chapter, `dialogue Ch${d.chapter}`).toBeDefined();
    }
  });
});

describe('SYNC-S28 — NPC 대화 SSOT (SYNC-17)', () => {
  it('SCENARIO_DIALOGUES ≥ 9 대화 entry', async () => {
    const { SCENARIO_DIALOGUES } = await import('../../shared/types/scenarioRegistry');
    expect(SCENARIO_DIALOGUES.length).toBeGreaterThanOrEqual(9);
  });

  it('모든 dialogue obsidianId unique snake_case', async () => {
    const { SCENARIO_DIALOGUES } = await import('../../shared/types/scenarioRegistry');
    const ids = SCENARIO_DIALOGUES.map((d) => d.obsidianId);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id.match(/^[a-z][a-z0-9_]*$/), `${id} snake_case`).not.toBeNull();
    }
  });

  it('모든 dialogue gameNpcId 가 SCENARIO_COMPANIONS 의 gameNpcId 또는 게임 NPC 존재', async () => {
    const { SCENARIO_DIALOGUES, SCENARIO_COMPANIONS } = await import('../../shared/types/scenarioRegistry');
    const companionNpcs = new Set(
      SCENARIO_COMPANIONS.flatMap((c) => [c.gameNpcId, c.plannedGameNpcId]).filter((x): x is string => !!x),
    );
    // npc_bernardo_final 같은 보스 페어도 허용 (베르나르도 체인)
    const allowedNpcs = new Set([...companionNpcs, 'npc_bernardo_final']);
    for (const d of SCENARIO_DIALOGUES) {
      expect(allowedNpcs.has(d.gameNpcId) || d.gameNpcId.startsWith('npc_'), `${d.obsidianId} npc '${d.gameNpcId}'`).toBe(true);
    }
  });

  it('모든 dialogue 한글 line + length ≥ 10', async () => {
    const { SCENARIO_DIALOGUES } = await import('../../shared/types/scenarioRegistry');
    const korean = /[가-힣]/;
    for (const d of SCENARIO_DIALOGUES) {
      expect(korean.test(d.line), `${d.obsidianId} 한글`).toBe(true);
      expect(d.line.length, `${d.obsidianId} length`).toBeGreaterThanOrEqual(10);
    }
  });

  it('모든 dialogue context valid (first_meet/join/trust_build/betrayal/leave/final)', async () => {
    const { SCENARIO_DIALOGUES } = await import('../../shared/types/scenarioRegistry');
    const VALID = new Set(['first_meet', 'join', 'trust_build', 'betrayal', 'leave', 'final']);
    for (const d of SCENARIO_DIALOGUES) {
      expect(VALID.has(d.context), `${d.obsidianId} context '${d.context}'`).toBe(true);
    }
  });

  it('chapter 1~5 범위 + 모든 sync 동료 대화 ≥ 1', async () => {
    const { SCENARIO_DIALOGUES, SCENARIO_COMPANIONS, getDialoguesByNpc } = await import('../../shared/types/scenarioRegistry');
    for (const d of SCENARIO_DIALOGUES) {
      expect(d.chapter).toBeGreaterThanOrEqual(1);
      expect(d.chapter).toBeLessThanOrEqual(5);
    }
    // 모든 sync 동료 ≥ 1 대화
    for (const c of SCENARIO_COMPANIONS) {
      if (c.gameNpcId) {
        const dialogues = getDialoguesByNpc(c.gameNpcId);
        expect(dialogues.length, `${c.obsidianId} dialogues`).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('베르나르도 체인 narrative — betrayal + final 대화 보유', async () => {
    const { getDialoguesByNpc, getDialoguesByContext } = await import('../../shared/types/scenarioRegistry');
    const bernardo = getDialoguesByNpc('npc_bernardo');
    const bernardoFinal = getDialoguesByNpc('npc_bernardo_final');
    expect(bernardo.some((d) => d.context === 'betrayal')).toBe(true);
    expect(bernardoFinal.some((d) => d.context === 'final')).toBe(true);
    // betrayal context 가드
    const betrayals = getDialoguesByContext('betrayal');
    expect(betrayals.length).toBeGreaterThanOrEqual(1);
  });

  it('getDialoguesByChapter: Ch1 대화 ≥ 3 (세라핀 + 크리오 narrative)', async () => {
    const { getDialoguesByChapter } = await import('../../shared/types/scenarioRegistry');
    const ch1 = getDialoguesByChapter(1);
    expect(ch1.length).toBeGreaterThanOrEqual(3);
  });

  it('SYNC-17 cohesion: dialogues 5 sync 동료 모두 cover (벤자민 포함 6명)', async () => {
    const { SCENARIO_DIALOGUES, SCENARIO_COMPANIONS } = await import('../../shared/types/scenarioRegistry');
    const dialogueNpcs = new Set(SCENARIO_DIALOGUES.map((d) => d.gameNpcId));
    const coveredCompanions = SCENARIO_COMPANIONS.filter(
      (c) => c.gameNpcId && dialogueNpcs.has(c.gameNpcId),
    );
    // 최소 5 동료 대화 보유 (벤자민/세라핀/크리오/이그나/레이나/우르그롬)
    expect(coveredCompanions.length).toBeGreaterThanOrEqual(5);
  });
});

describe('SYNC-S27 — 엔딩 D (신화) + FAIL 시나리오 (SYNC-16)', () => {
  it('FAIL 우선: defeatedByLethe = true → FAIL (다른 조건 무관)', async () => {
    const { evaluateAdvancedEnding } = await import('../../shared/types/scenarioRegistry');
    const r = evaluateAdvancedEnding({
      completedQuests: new Set([
        'SQ_EREBOS_RUINS', 'SQ_SILVANHEIM_FRAGMENT',
        'SQ_SOLARIS_RAWAR', 'SQ_ARGENTIUM_FRAGMENT',
      ]),
      companionLoyalty: { seraphine: 50, maestro_crio: 40, ignara: 20, benjamin_cross: 40, reina: 30, urgrom: 40 },
      defeatedByLethe: true,
    });
    expect(r.achievableEnding).toBe('FAIL');
    expect(r.isFailure).toBe(true);
  });

  it('엔딩 D: 미네르바 만남 + 신화 유물 2개 → D (A 우선순위 위)', async () => {
    const { evaluateAdvancedEnding } = await import('../../shared/types/scenarioRegistry');
    const r = evaluateAdvancedEnding({
      completedQuests: new Set([
        'SQ_EREBOS_RUINS', 'SQ_SILVANHEIM_FRAGMENT',
        'SQ_SOLARIS_RAWAR', 'SQ_ARGENTIUM_FRAGMENT',
      ]),
      companionLoyalty: { seraphine: 50, maestro_crio: 40, ignara: 20, benjamin_cross: 40, reina: 30, urgrom: 40 },
      metMinerva: true,
      mythicRelicsCount: 2,
    });
    expect(r.achievableEnding).toBe('D');
    expect(r.canAchieveEndingD).toBe(true);
    expect(r.isFailure).toBe(false);
  });

  it('엔딩 D 미달: 미네르바만 만났음 (유물 0) → 기본 A 평가', async () => {
    const { evaluateAdvancedEnding } = await import('../../shared/types/scenarioRegistry');
    const r = evaluateAdvancedEnding({
      completedQuests: new Set([
        'SQ_EREBOS_RUINS', 'SQ_SILVANHEIM_FRAGMENT',
        'SQ_SOLARIS_RAWAR', 'SQ_ARGENTIUM_FRAGMENT',
      ]),
      companionLoyalty: { seraphine: 50, maestro_crio: 40, ignara: 20, benjamin_cross: 40, reina: 30, urgrom: 40 },
      metMinerva: true,
      mythicRelicsCount: 0,
    });
    expect(r.achievableEnding).toBe('A');
    expect(r.canAchieveEndingD).toBe(false);
  });

  it('엔딩 D 미달: 유물 2 있지만 미네르바 만남 X → 기본 평가', async () => {
    const { evaluateAdvancedEnding } = await import('../../shared/types/scenarioRegistry');
    const r = evaluateAdvancedEnding({
      completedQuests: new Set(['SQ_EREBOS_RUINS']),
      companionLoyalty: {},
      mythicRelicsCount: 5,
    });
    expect(r.achievableEnding).toBe('C');
    expect(r.canAchieveEndingD).toBe(false);
  });

  it('FAIL 이 D 보다 우선 (defeatedByLethe + metMinerva)', async () => {
    const { evaluateAdvancedEnding } = await import('../../shared/types/scenarioRegistry');
    const r = evaluateAdvancedEnding({
      completedQuests: new Set(),
      companionLoyalty: {},
      defeatedByLethe: true,
      metMinerva: true,
      mythicRelicsCount: 5,
    });
    expect(r.achievableEnding).toBe('FAIL');
    expect(r.isFailure).toBe(true);
  });

  it('getEndingSummary 5 엔딩 모두 한글 narrative 반환', async () => {
    const { getEndingSummary } = await import('../../shared/types/scenarioRegistry');
    const korean = /[가-힣]/;
    for (const code of ['A', 'B', 'C', 'D', 'FAIL'] as const) {
      const summary = getEndingSummary(code);
      expect(summary.length, `${code} summary`).toBeGreaterThan(0);
      expect(korean.test(summary), `${code} 한글`).toBe(true);
    }
  });

  it('getEndingSummary 형식: "code: name — signature"', async () => {
    const { getEndingSummary } = await import('../../shared/types/scenarioRegistry');
    expect(getEndingSummary('A')).toContain('A:');
    expect(getEndingSummary('A')).toContain('—');
  });

  it('SYNC-16 cohesion: 4 시나리오 종합 (A/B/C/D/FAIL 모두 도달 가능)', async () => {
    const { evaluateAdvancedEnding } = await import('../../shared/types/scenarioRegistry');
    const allLoyalty = { seraphine: 50, maestro_crio: 40, ignara: 20, benjamin_cross: 40, reina: 30, urgrom: 40 };
    const allFragments = new Set([
      'SQ_EREBOS_RUINS', 'SQ_SILVANHEIM_FRAGMENT',
      'SQ_SOLARIS_RAWAR', 'SQ_ARGENTIUM_FRAGMENT',
    ]);
    // A
    expect(evaluateAdvancedEnding({ completedQuests: allFragments, companionLoyalty: allLoyalty }).achievableEnding).toBe('A');
    // B (3 파편)
    const threeFragments = new Set([...allFragments].slice(0, 3));
    expect(evaluateAdvancedEnding({ completedQuests: threeFragments, companionLoyalty: allLoyalty }).achievableEnding).toBe('B');
    // C (1 파편)
    expect(evaluateAdvancedEnding({ completedQuests: new Set(['SQ_EREBOS_RUINS']), companionLoyalty: {} }).achievableEnding).toBe('C');
    // D
    expect(evaluateAdvancedEnding({ completedQuests: allFragments, companionLoyalty: allLoyalty, metMinerva: true, mythicRelicsCount: 2 }).achievableEnding).toBe('D');
    // FAIL
    expect(evaluateAdvancedEnding({ completedQuests: new Set(), companionLoyalty: {}, defeatedByLethe: true }).achievableEnding).toBe('FAIL');
  });
});

describe('SYNC-S26 — 챕터별 milestone game-flow (SYNC-15)', () => {
  it('SCENARIO_MILESTONES 5 chapter (Ch1~Ch5)', async () => {
    const { SCENARIO_MILESTONES } = await import('../../shared/types/scenarioRegistry');
    expect(SCENARIO_MILESTONES.length).toBe(5);
    const chapters = SCENARIO_MILESTONES.map((m) => m.chapter).sort();
    expect(chapters).toEqual([1, 2, 3, 4, 5]);
  });

  it('각 milestone startBeat + endBeat 한글 narrative', async () => {
    const { SCENARIO_MILESTONES } = await import('../../shared/types/scenarioRegistry');
    const korean = /[가-힣]/;
    for (const m of SCENARIO_MILESTONES) {
      expect(korean.test(m.startBeat), `Ch${m.chapter} startBeat`).toBe(true);
      expect(korean.test(m.endBeat), `Ch${m.chapter} endBeat`).toBe(true);
    }
  });

  it('각 milestone requiredQuests 모두 ALL_QUEST_SEEDS 에 존재', async () => {
    const { SCENARIO_MILESTONES } = await import('../../shared/types/scenarioRegistry');
    const codes = new Set(ALL_QUEST_SEEDS.map((q) => q.code));
    for (const m of SCENARIO_MILESTONES) {
      for (const q of m.requiredQuests) {
        expect(codes.has(q), `Ch${m.chapter} ${q}`).toBe(true);
      }
    }
  });

  it('각 milestone unlockedCompanions 모두 SCENARIO_COMPANIONS 에 존재', async () => {
    const { SCENARIO_MILESTONES, SCENARIO_COMPANIONS } = await import('../../shared/types/scenarioRegistry');
    const companionIds = new Set(SCENARIO_COMPANIONS.map((c) => c.obsidianId));
    for (const m of SCENARIO_MILESTONES) {
      for (const c of m.unlockedCompanions) {
        expect(companionIds.has(c), `Ch${m.chapter} companion ${c}`).toBe(true);
      }
    }
  });

  it('각 milestone collectedFragment 모두 SCENARIO_FRAGMENTS 에 존재 (Ch5 제외)', async () => {
    const { SCENARIO_MILESTONES, SCENARIO_FRAGMENTS } = await import('../../shared/types/scenarioRegistry');
    const fragmentIds = new Set(SCENARIO_FRAGMENTS.map((f) => f.obsidianId));
    for (const m of SCENARIO_MILESTONES) {
      if (m.collectedFragment) {
        expect(fragmentIds.has(m.collectedFragment), `Ch${m.chapter} ${m.collectedFragment}`).toBe(true);
      }
    }
  });

  it('Ch1~Ch4 각 파편 collected narrative (Ch5 는 4 파편 통합)', async () => {
    const { getMilestoneByChapter } = await import('../../shared/types/scenarioRegistry');
    expect(getMilestoneByChapter(1)!.collectedFragment).toBe('fragment_erebos');
    expect(getMilestoneByChapter(2)!.collectedFragment).toBe('fragment_silvanheim');
    expect(getMilestoneByChapter(3)!.collectedFragment).toBe('fragment_solaris');
    expect(getMilestoneByChapter(4)!.collectedFragment).toBe('fragment_argentium');
    expect(getMilestoneByChapter(5)!.collectedFragment).toBeUndefined();
  });

  it('전 6 동료 합류 = 5 milestone unlockedCompanions 합계', async () => {
    const { SCENARIO_MILESTONES, SCENARIO_COMPANIONS } = await import('../../shared/types/scenarioRegistry');
    const unlocked = new Set<string>();
    for (const m of SCENARIO_MILESTONES) {
      for (const c of m.unlockedCompanions) unlocked.add(c);
    }
    expect(unlocked.size).toBe(SCENARIO_COMPANIONS.length);
  });

  it('evaluateChapterProgress: Ch1 시작 전 (0 quest 완료) → progressRatio 0', async () => {
    const { evaluateChapterProgress } = await import('../../shared/types/scenarioRegistry');
    const p = evaluateChapterProgress(1, new Set());
    expect(p.isComplete).toBe(false);
    expect(p.progressRatio).toBe(0);
    expect(p.pendingQuests.length).toBeGreaterThan(0);
  });

  it('evaluateChapterProgress: Ch1 모든 quest 완료 → isComplete=true, progressRatio=1', async () => {
    const { evaluateChapterProgress, getMilestoneByChapter } = await import('../../shared/types/scenarioRegistry');
    const ch1 = getMilestoneByChapter(1)!;
    const p = evaluateChapterProgress(1, new Set(ch1.requiredQuests));
    expect(p.isComplete).toBe(true);
    expect(p.progressRatio).toBe(1);
    expect(p.pendingQuests.length).toBe(0);
  });

  it('evaluateChapterProgress: Ch1 절반 진행 → progressRatio ≈ 0.5', async () => {
    const { evaluateChapterProgress, getMilestoneByChapter } = await import('../../shared/types/scenarioRegistry');
    const ch1 = getMilestoneByChapter(1)!;
    const half = ch1.requiredQuests.slice(0, Math.floor(ch1.requiredQuests.length / 2));
    const p = evaluateChapterProgress(1, new Set(half));
    expect(p.isComplete).toBe(false);
    expect(p.progressRatio).toBeCloseTo(0.5, 1);
  });

  it('evaluateChapterProgress: 잘못된 chapter → 안전 fallback', async () => {
    const { evaluateChapterProgress } = await import('../../shared/types/scenarioRegistry');
    const p = evaluateChapterProgress(99, new Set());
    expect(p.isComplete).toBe(false);
    expect(p.progressRatio).toBe(0);
  });
});

describe('SYNC-S25 — barrel 통합 + 전 entity cross-domain stress (SYNC-14)', () => {
  it('chrono.ts barrel 에서 scenarioRegistry 신규 API (SYNC-9~13) 모두 접근', async () => {
    const mod = await import('../../shared/types/chrono');
    expect(typeof mod.applyReputationReward).toBe('function');
    expect(typeof mod.isReputationRewardSufficient).toBe('function');
    expect(typeof mod.evaluateGameFlow).toBe('function');
    expect(typeof mod.checkEndingA).toBe('function');
    expect(typeof mod.getTimelineEventByObsidianId).toBe('function');
    expect(typeof mod.listTimelineEventsByEra).toBe('function');
    expect(Array.isArray(mod.COMPANION_REPUTATION_REWARDS)).toBe(true);
    expect(Array.isArray(mod.SCENARIO_TIMELINE)).toBe(true);
  });

  it('전 SSOT entity 정량 cross-check (단일 barrel 접근)', async () => {
    const mod = await import('../../shared/types/chrono');
    expect(mod.SCENARIO_COMPANIONS.length).toBe(6);
    expect(mod.SCENARIO_ZONES.length).toBe(9);
    expect(mod.SCENARIO_BOSSES.length).toBe(9);
    expect(mod.SCENARIO_CHAPTERS.length).toBe(5);
    expect(mod.SCENARIO_ENDINGS.length).toBe(5);
    expect(mod.SCENARIO_FRAGMENTS.length).toBe(4);
    expect(mod.SCENARIO_DEITIES.length).toBe(12);
    expect(mod.COMPANION_REPUTATION_REWARDS.length).toBe(5);
    expect(mod.SCENARIO_TIMELINE.length).toBe(13);
  });

  it('barrel 통합 stress — 100회 호출 결정성', async () => {
    const mod = await import('../../shared/types/chrono');
    const baseline = mod.getSyncCompletionReport();
    for (let i = 0; i < 100; i += 1) {
      const r = mod.getSyncCompletionReport();
      expect(r.coveragePercent).toBe(baseline.coveragePercent);
      expect(r.companions.synced).toBe(baseline.companions.synced);
      expect(r.zones.synced).toBe(baseline.zones.synced);
      expect(r.bosses.synced).toBe(baseline.bosses.synced);
    }
  });

  it('100% sync 달성: coveragePercent = 100 (SYNC-8 완료 + SYNC-9~11 게임 로직 통합)', async () => {
    const { getSyncCompletionReport } = await import('../../shared/types/scenarioRegistry');
    const r = getSyncCompletionReport();
    expect(r.coveragePercent).toBe(100);
    expect(r.companions.orphan).toBe(0);
    expect(r.zones.orphan).toBe(0);
    expect(r.bosses.orphan).toBe(0);
  });

  it('aetherna 게임명 narrative 4중 cross-domain cohesion final', async () => {
    const { resolveTripleTech } = await import('../../shared/types/tripleTech');
    const { resolveFieldEncounter } = await import('../../shared/types/chronoField');
    const { getBossByObsidianId } = await import('../../shared/types/scenarioRegistry');
    // 1) Triple aetherna_final
    expect(resolveTripleTech('ether_knight', 'time_knight', 'memory_weaver')?.id).toBe('aetherna_final');
    // 2) Field aetherna_collapse 보스
    const finalE = resolveFieldEncounter('chrono_spire', 'ruined_future')!;
    expect(finalE.monsterPool.find((s) => s.isBoss)?.monsterId).toBe('aetherna_collapse');
    // 3) Obsidian 레테 → game 매핑
    const lethe = getBossByObsidianId('lethe');
    expect(lethe!.gameChronoBossId).toBe('aetherna_collapse');
    expect(lethe!.gameQuestBossId).toBe('boss_oblivion_lord');
    // 4) 연대표 레테 narrative
    const { getTimelineEventByObsidianId } = await import('../../shared/types/scenarioRegistry');
    expect(getTimelineEventByObsidianId('lethe_belief_formation')).toBeDefined();
  });

  it('스토리 → 게임 흐름 (시작→파편→동료→엔딩) 통합 시나리오', async () => {
    const { applyReputationReward, evaluateGameFlow, checkEndingA } = await import('../../shared/types/scenarioRegistry');
    // 1. 시작: 게임 시작 (loyalty 0)
    let loyalty: Record<string, number> = {};
    // 2. 동료 합류 quest 완료 (5명)
    for (const [c, q] of [
      ['seraphine', 'SQ_COMPANION_SERAPHINE'],
      ['maestro_crio', 'SQ_COMPANION_CRIO'],
      ['ignara', 'SQ_COMPANION_IGNARA'],
      ['reina', 'SQ_COMPANION_REINA'],
      ['urgrom', 'SQ_COMPANION_URGROM'],
    ] as const) {
      loyalty[c] = applyReputationReward(c, 0, q).newLoyalty;
    }
    loyalty.benjamin_cross = 40;
    // 3. 4 파편 회수 quest 완료
    const completedQuests = new Set([
      'SQ_EREBOS_RUINS',
      'SQ_SILVANHEIM_FRAGMENT',
      'SQ_SOLARIS_RAWAR',
      'SQ_ARGENTIUM_FRAGMENT',
    ]);
    const state = { completedQuests, companionLoyalty: loyalty };
    const flow = evaluateGameFlow(state);
    // 4. 엔딩 A 달성
    expect(flow.fragmentsCollected).toBe(4);
    expect(flow.aliveCompanions.length).toBe(6);
    expect(checkEndingA(state)).toBe(true);
  });
});

describe('SYNC-S24 — 시나리오 연대표 timeline narrative (SYNC-13)', () => {
  it('SCENARIO_TIMELINE 13 핵심 이벤트', async () => {
    const { SCENARIO_TIMELINE } = await import('../../shared/types/scenarioRegistry');
    expect(SCENARIO_TIMELINE.length).toBe(13);
  });

  it('이벤트 obsidianId 모두 unique snake_case', async () => {
    const { SCENARIO_TIMELINE } = await import('../../shared/types/scenarioRegistry');
    const ids = SCENARIO_TIMELINE.map((e) => e.obsidianId);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id.match(/^[a-z][a-z0-9_]*$/), `${id} snake_case`).not.toBeNull();
    }
  });

  it('7 시대 모두 ≥ 1 이벤트 (creation/ancient_myth/solian/kalimar/great_forgetting/post_forgetting/present)', async () => {
    const { SCENARIO_TIMELINE } = await import('../../shared/types/scenarioRegistry');
    const eras = new Set(SCENARIO_TIMELINE.map((e) => e.era));
    expect(eras.size).toBe(7);
    expect(eras.has('creation')).toBe(true);
    expect(eras.has('ancient_myth')).toBe(true);
    expect(eras.has('solian')).toBe(true);
    expect(eras.has('kalimar')).toBe(true);
    expect(eras.has('great_forgetting')).toBe(true);
    expect(eras.has('post_forgetting')).toBe(true);
    expect(eras.has('present')).toBe(true);
  });

  it('모든 이벤트 한글 name + summary length ≥ 10', async () => {
    const { SCENARIO_TIMELINE } = await import('../../shared/types/scenarioRegistry');
    const korean = /[가-힣]/;
    for (const e of SCENARIO_TIMELINE) {
      expect(korean.test(e.name), `${e.obsidianId} 한글 name`).toBe(true);
      expect(e.summary.length, `${e.obsidianId} summary`).toBeGreaterThanOrEqual(10);
    }
  });

  it('worldYear 정의된 이벤트는 단조 증가 (시간 순서 narrative)', async () => {
    const { SCENARIO_TIMELINE } = await import('../../shared/types/scenarioRegistry');
    const withYear = SCENARIO_TIMELINE.filter((e) => e.worldYear !== undefined);
    for (let i = 1; i < withYear.length; i += 1) {
      expect(withYear[i].worldYear!, `${withYear[i].obsidianId} year`).toBeGreaterThan(withYear[i - 1].worldYear!);
    }
  });

  it('대망각 = 세계력 3,200년 (200년 전 봉인 의식)', async () => {
    const { getTimelineEventByObsidianId } = await import('../../shared/types/scenarioRegistry');
    const e = getTimelineEventByObsidianId('great_forgetting_event');
    expect(e).toBeDefined();
    expect(e!.worldYear).toBe(3200);
    expect(e!.era).toBe('great_forgetting');
  });

  it('게임 시작 = 세계력 3,412년 (칸텔라 마을 사건)', async () => {
    const { getTimelineEventByObsidianId } = await import('../../shared/types/scenarioRegistry');
    const e = getTimelineEventByObsidianId('game_start_cantela');
    expect(e!.worldYear).toBe(3412);
    expect(e!.era).toBe('present');
  });

  it('대망각 → 게임 시작 = 212년 narrative (세계력 3,200 → 3,412)', async () => {
    const { getTimelineEventByObsidianId } = await import('../../shared/types/scenarioRegistry');
    const forgetting = getTimelineEventByObsidianId('great_forgetting_event')!;
    const start = getTimelineEventByObsidianId('game_start_cantela')!;
    expect(start.worldYear! - forgetting.worldYear!).toBe(212);
  });

  it('listTimelineEventsByEra: creation 시대 = 2 이벤트 (열두 신 창조 + 에테르 결정)', async () => {
    const { listTimelineEventsByEra } = await import('../../shared/types/scenarioRegistry');
    const creation = listTimelineEventsByEra('creation');
    expect(creation.length).toBe(2);
  });

  it('레테 narrative cross-domain: 연대표 + 신화 신 + 보스 시그니처', async () => {
    const { getTimelineEventByObsidianId, getDeityByObsidianId, getBossByObsidianId } = await import('../../shared/types/scenarioRegistry');
    // 연대표: 레테 신념 형성 + 솔리안 멸망 (레테 강림)
    expect(getTimelineEventByObsidianId('lethe_belief_formation')).toBeDefined();
    expect(getTimelineEventByObsidianId('solian_collapse')!.summary).toContain('레테');
    // 신화 신: 레테 (배제)
    const lethe = getDeityByObsidianId('lethe');
    expect(lethe!.inCreation).toBe(false);
    // 보스: 레테 = aetherna_collapse
    const lethBoss = getBossByObsidianId('lethe');
    expect(lethBoss!.gameQuestBossId).toBe('boss_oblivion_lord');
  });

  it('SCENARIO_FRAGMENTS sealer narrative ↔ 연대표 cohesion (카일/라와르)', async () => {
    const { SCENARIO_FRAGMENTS } = await import('../../shared/types/scenarioRegistry');
    const fragmentSealers = SCENARIO_FRAGMENTS.map((f) => f.sealer).join(' ');
    expect(fragmentSealers).toContain('카일');
    expect(fragmentSealers).toContain('라와르');
  });
});

describe('SYNC-S23 — 파편 + 동료 → 엔딩 통합 game-flow (SYNC-11)', () => {
  it('엔딩 A 시나리오: 4 파편 quest 모두 완료 + 6 동료 모두 threshold', async () => {
    const { evaluateGameFlow, checkEndingA } = await import('../../shared/types/scenarioRegistry');
    const state = {
      completedQuests: new Set([
        'SQ_EREBOS_RUINS',
        'SQ_SILVANHEIM_FRAGMENT',
        'SQ_SOLARIS_RAWAR',
        'SQ_ARGENTIUM_FRAGMENT',
      ]),
      companionLoyalty: {
        seraphine: 50, maestro_crio: 40, ignara: 20,
        benjamin_cross: 40, reina: 30, urgrom: 40,
      },
    };
    const e = evaluateGameFlow(state);
    expect(e.fragmentsCollected).toBe(4);
    expect(e.aliveCompanions.length).toBe(6);
    expect(e.leftCompanions.length).toBe(0);
    expect(e.achievableEnding).toBe('A');
    expect(checkEndingA(state)).toBe(true);
  });

  it('엔딩 B 시나리오: 3 파편 (Ch4 미수집)', async () => {
    const { evaluateGameFlow } = await import('../../shared/types/scenarioRegistry');
    const state = {
      completedQuests: new Set([
        'SQ_EREBOS_RUINS',
        'SQ_SILVANHEIM_FRAGMENT',
        'SQ_SOLARIS_RAWAR',
      ]),
      companionLoyalty: {
        seraphine: 50, maestro_crio: 40, ignara: 20,
        benjamin_cross: 40, reina: 30, urgrom: 40,
      },
    };
    const e = evaluateGameFlow(state);
    expect(e.fragmentsCollected).toBe(3);
    expect(e.achievableEnding).toBe('B');
  });

  it('엔딩 B 시나리오: 4 파편 + 동료 일부 이탈 (전원 조건 미달)', async () => {
    const { evaluateGameFlow } = await import('../../shared/types/scenarioRegistry');
    const state = {
      completedQuests: new Set([
        'SQ_EREBOS_RUINS',
        'SQ_SILVANHEIM_FRAGMENT',
        'SQ_SOLARIS_RAWAR',
        'SQ_ARGENTIUM_FRAGMENT',
      ]),
      companionLoyalty: {
        seraphine: 50, maestro_crio: 40, ignara: 10, // 이그나 threshold 20 미만 → 이탈
        benjamin_cross: 40, reina: 30, urgrom: 40,
      },
    };
    const e = evaluateGameFlow(state);
    expect(e.fragmentsCollected).toBe(4);
    expect(e.aliveCompanions.length).toBe(5);
    expect(e.leftCompanions).toContain('ignara');
    expect(e.achievableEnding).toBe('B');
  });

  it('엔딩 C 시나리오: 파편 2 이하 + 동료 무관', async () => {
    const { evaluateGameFlow } = await import('../../shared/types/scenarioRegistry');
    const state = {
      completedQuests: new Set(['SQ_EREBOS_RUINS']),
      companionLoyalty: {
        seraphine: 50, maestro_crio: 40, ignara: 20,
        benjamin_cross: 40, reina: 30, urgrom: 40,
      },
    };
    const e = evaluateGameFlow(state);
    expect(e.fragmentsCollected).toBe(1);
    expect(e.achievableEnding).toBe('C');
  });

  it('엔딩 C 시나리오: 파편 0 + 동료 0 (최악)', async () => {
    const { evaluateGameFlow } = await import('../../shared/types/scenarioRegistry');
    const state = {
      completedQuests: new Set<string>(),
      companionLoyalty: {},
    };
    const e = evaluateGameFlow(state);
    expect(e.fragmentsCollected).toBe(0);
    expect(e.aliveCompanions.length).toBe(0);
    expect(e.leftCompanions.length).toBe(6);
    expect(e.achievableEnding).toBe('C');
  });

  it('aliveCompanions + leftCompanions = 6 (전 동료 평가)', async () => {
    const { evaluateGameFlow } = await import('../../shared/types/scenarioRegistry');
    const state = {
      completedQuests: new Set<string>(),
      companionLoyalty: { seraphine: 50, ignara: 5 },
    };
    const e = evaluateGameFlow(state);
    expect(e.aliveCompanions.length + e.leftCompanions.length).toBe(6);
  });

  it('SYNC-11 cohesion: 모든 5 동료 quest 완료 후 → 6 동료 생존 (벤자민 = 메인 퀘스트 매핑)', async () => {
    const { applyReputationReward, evaluateGameFlow } = await import('../../shared/types/scenarioRegistry');
    let loyalty: Record<string, number> = {};
    const QUESTS: Array<[string, string]> = [
      ['seraphine', 'SQ_COMPANION_SERAPHINE'],
      ['maestro_crio', 'SQ_COMPANION_CRIO'],
      ['ignara', 'SQ_COMPANION_IGNARA'],
      ['reina', 'SQ_COMPANION_REINA'],
      ['urgrom', 'SQ_COMPANION_URGROM'],
    ];
    for (const [c, q] of QUESTS) {
      const r = applyReputationReward(c, 0, q);
      loyalty[c] = r.newLoyalty;
    }
    // 벤자민은 questSeeds reputation 보상이 없지만 narrative 상 화해 선택 시 생존
    loyalty.benjamin_cross = 40;

    const state = {
      completedQuests: new Set<string>(),
      companionLoyalty: loyalty,
    };
    const e = evaluateGameFlow(state);
    expect(e.aliveCompanions.length).toBe(6);
  });
});

describe('SYNC-S22 — 신뢰도 reputation → loyalty 매핑 (SYNC-10)', () => {
  it('5 동료 모두 COMPANION_REPUTATION_REWARDS 에 정의 (벤자민 제외)', async () => {
    const { COMPANION_REPUTATION_REWARDS } = await import('../../shared/types/scenarioRegistry');
    expect(COMPANION_REPUTATION_REWARDS.length).toBe(5);
    const ids = COMPANION_REPUTATION_REWARDS.map((r) => r.companionObsidianId).sort();
    expect(ids).toEqual(['ignara', 'maestro_crio', 'reina', 'seraphine', 'urgrom']);
  });

  it('각 reputation 보상의 questCode 모두 ALL_QUEST_SEEDS 존재', async () => {
    const { COMPANION_REPUTATION_REWARDS } = await import('../../shared/types/scenarioRegistry');
    const codes = new Set(ALL_QUEST_SEEDS.map((q) => q.code));
    for (const r of COMPANION_REPUTATION_REWARDS) {
      expect(codes.has(r.questCode), `${r.companionObsidianId} questCode '${r.questCode}'`).toBe(true);
    }
  });

  it('각 reputation 보상이 quest 의 reputation reward.amount 와 정확 일치 (cohesion)', async () => {
    const { COMPANION_REPUTATION_REWARDS } = await import('../../shared/types/scenarioRegistry');
    for (const r of COMPANION_REPUTATION_REWARDS) {
      const q = ALL_QUEST_SEEDS.find((x) => x.code === r.questCode);
      expect(q, `${r.questCode} found`).toBeDefined();
      const repReward = q!.rewards.find((rw) => rw.type === 'reputation');
      expect(repReward, `${r.questCode} reputation reward`).toBeDefined();
      expect(repReward!.amount, `${r.questCode} amount`).toBe(r.amount);
    }
  });

  it('각 동료의 reputation 보상 >= loyaltyThreshold (단일 quest 합류 narrative)', async () => {
    const { isReputationRewardSufficient } = await import('../../shared/types/scenarioRegistry');
    for (const obsidianId of ['seraphine', 'maestro_crio', 'ignara', 'reina', 'urgrom']) {
      expect(isReputationRewardSufficient(obsidianId), `${obsidianId} sufficient`).toBe(true);
    }
  });

  it('applyReputationReward: 세라핀 quest 완료 → loyalty 0 + 50 = 50 (threshold 도달)', async () => {
    const { applyReputationReward } = await import('../../shared/types/scenarioRegistry');
    const r = applyReputationReward('seraphine', 0, 'SQ_COMPANION_SERAPHINE');
    expect(r.newLoyalty).toBe(50);
    expect(r.meetsThreshold).toBe(true);
  });

  it('applyReputationReward: 이그나 quest 완료 → 0 + 20 = 20 (threshold)', async () => {
    const { applyReputationReward } = await import('../../shared/types/scenarioRegistry');
    const r = applyReputationReward('ignara', 0, 'SQ_COMPANION_IGNARA');
    expect(r.newLoyalty).toBe(20);
    expect(r.meetsThreshold).toBe(true);
  });

  it('applyReputationReward: 잘못된 questCode → loyalty 변화 없음', async () => {
    const { applyReputationReward } = await import('../../shared/types/scenarioRegistry');
    const r = applyReputationReward('seraphine', 30, 'UNKNOWN_QUEST');
    expect(r.newLoyalty).toBe(30);
    expect(r.meetsThreshold).toBe(false);
  });

  it('applyReputationReward: 잘못된 companion → loyalty 변화 없음', async () => {
    const { applyReputationReward } = await import('../../shared/types/scenarioRegistry');
    const r = applyReputationReward('unknown_companion', 0, 'SQ_COMPANION_SERAPHINE');
    expect(r.newLoyalty).toBe(0);
    expect(r.meetsThreshold).toBe(false);
  });

  it('SYNC-10 cohesion: 모든 5 동료 단일 quest 합류 narrative (1 quest = loyalty 충족)', async () => {
    const { applyReputationReward } = await import('../../shared/types/scenarioRegistry');
    const REWARD_QUESTS: Array<[string, string]> = [
      ['seraphine',    'SQ_COMPANION_SERAPHINE'],
      ['maestro_crio', 'SQ_COMPANION_CRIO'],
      ['ignara',       'SQ_COMPANION_IGNARA'],
      ['reina',        'SQ_COMPANION_REINA'],
      ['urgrom',       'SQ_COMPANION_URGROM'],
    ];
    for (const [companion, quest] of REWARD_QUESTS) {
      const r = applyReputationReward(companion, 0, quest);
      expect(r.meetsThreshold, `${companion} single-quest threshold`).toBe(true);
    }
  });
});

describe('SYNC-S21 — 4 파편 game item 동기화 (SYNC-9)', () => {
  it('4 파편 모두 gameItemId + gameQuestCode 매핑 완료', () => {
    for (const f of SCENARIO_FRAGMENTS) {
      expect(f.gameItemId, `${f.obsidianId} gameItemId`).toBeDefined();
      expect(f.gameQuestCode, `${f.obsidianId} gameQuestCode`).toBeDefined();
    }
  });

  it('4 파편 gameItemId = item_memory_fragment_ch1~4 (chapter 매핑)', () => {
    for (const f of SCENARIO_FRAGMENTS) {
      expect(f.gameItemId).toBe(`item_memory_fragment_ch${f.chapter}`);
    }
  });

  it('4 파편 gameQuestCode 모두 ALL_QUEST_SEEDS 에 존재', () => {
    const codes = new Set(ALL_QUEST_SEEDS.map((q) => q.code));
    for (const f of SCENARIO_FRAGMENTS) {
      expect(codes.has(f.gameQuestCode!), `${f.obsidianId} ${f.gameQuestCode}`).toBe(true);
    }
  });

  it('각 파편 회수 quest 의 item reward 가 gameItemId 매칭', () => {
    for (const f of SCENARIO_FRAGMENTS) {
      const q = ALL_QUEST_SEEDS.find((x) => x.code === f.gameQuestCode);
      expect(q, `${f.gameQuestCode} found`).toBeDefined();
      const itemReward = q!.rewards.find((r) => r.type === 'item' && r.itemId === f.gameItemId);
      expect(itemReward, `${f.gameQuestCode} ${f.gameItemId} reward`).toBeDefined();
    }
  });

  it('SYNC-9 신규 추가: SQ_SILVANHEIM_FRAGMENT (Ch2) + SQ_ARGENTIUM_FRAGMENT (Ch4)', () => {
    const codes = new Set(ALL_QUEST_SEEDS.map((q) => q.code));
    expect(codes.has('SQ_SILVANHEIM_FRAGMENT')).toBe(true);
    expect(codes.has('SQ_ARGENTIUM_FRAGMENT')).toBe(true);
  });

  it('4 파편 zoneObsidianId 모두 SCENARIO_ZONES 에 sync 완료 (Obsidian zone 매핑)', () => {
    const zonesWithGame = new Set(
      SCENARIO_ZONES.filter((z) => z.gameZoneId || z.gameQuestZoneTarget).map((z) => z.obsidianId),
    );
    for (const f of SCENARIO_FRAGMENTS) {
      expect(zonesWithGame.has(f.zoneObsidianId), `${f.obsidianId} zone ${f.zoneObsidianId} sync`).toBe(true);
    }
  });
});

describe('SYNC-S20 — 미동기화 카운트 갱신 (SYNC-8 후 전 entity sync+planned)', () => {
  it('SYNC-8 후 orphan 동료 = 0', () => {
    const orphan = SCENARIO_COMPANIONS.filter(
      (c) => !c.gameNpcId && !c.gameBossId && !c.plannedGameNpcId && !c.plannedGameBossId,
    );
    expect(orphan.length).toBe(0);
  });

  it('SYNC-8 후 orphan zone = 0 (9 zone 모두 sync)', () => {
    const orphan = SCENARIO_ZONES.filter(
      (z) =>
        !z.gameZoneId && !z.gameQuestZoneTarget &&
        !z.plannedGameZoneId && !z.plannedGameQuestZoneTarget,
    );
    expect(orphan.length).toBe(0);
  });

  it('SYNC-8 후 orphan 보스 = 0 (9 보스 모두 sync)', () => {
    const orphan = SCENARIO_BOSSES.filter(
      (b) =>
        !b.gameChronoBossId && !b.gameQuestBossId &&
        !b.plannedGameChronoBossId && !b.plannedGameQuestBossId,
    );
    expect(orphan.length).toBe(0);
  });
});
