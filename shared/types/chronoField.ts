// 크로노 트리거 필드 컨셉 (CHRONO-S101)
// 같은 zone 도 시대마다 다른 monster pool / boss / 분위기.
// Visible encounter — 필드 sprite 가 직접 보임, 접근 시 같은 배경 전투.

import type { ChronoEraId } from './chronoEraAtb';

export interface FieldMonsterSlot {
  /** monster id (DB or seed) */
  monsterId: string;
  /** 표시 이름 (UI). */
  name: string;
  /** 스폰 가중치 (0~1). 합 1.0 권장. */
  weight: number;
  /** 보스 여부. */
  isBoss?: boolean;
}

export interface FieldEncounterDef {
  /** zone id (예: 'aether_plains'). */
  zoneId: string;
  /** 시대. */
  eraId: ChronoEraId;
  /** 필드에 동시 스폰 가능한 monster pool. */
  monsterPool: readonly FieldMonsterSlot[];
  /** 최대 동시 스폰 수 (1~5 권장). */
  maxSpawn: number;
  /** 보스 필드 indicator 노출 여부. */
  hasBossSlot: boolean;
  /** 필드 분위기 ambient line (UI hint). */
  ambientLine: string;
  /** CHRONO-S111: BGM 트랙 키 (SoundManager 매핑). 미설정 시 default. */
  bgmTrack?: string;
  /** CHRONO-S111/S118: 필드 환경 효과. 'boss_room' 은 최종 보스 분위기 (S118). */
  ambientEffect?: 'mist' | 'dust' | 'glow' | 'void' | 'boss_room' | 'none';
  /** CHRONO-S139: true 시 일반 slot 제외 — 보스 slot 만 spawn (특수 boss-rush). */
  bossOnlyMode?: boolean;
}

const ENCOUNTERS: readonly FieldEncounterDef[] = [
  // ── 에테르 평원 (시대별 3종) ──
  {
    zoneId: 'aether_plains',
    eraId: 'ancient',
    monsterPool: [
      { monsterId: 'ancient_ether_sprite', name: '에테르 정령', weight: 0.5 },
      { monsterId: 'ancient_mist_wolf', name: '안개 늑대', weight: 0.4 },
      { monsterId: 'ancient_relic_golem', name: '유물 골렘', weight: 0.1, isBoss: true },
    ],
    maxSpawn: 3,
    hasBossSlot: true,
    ambientLine: '고대의 에테르가 떠도는 평원',
    bgmTrack: 'bgm_ancient_field',
    ambientEffect: 'mist',
  },
  {
    zoneId: 'aether_plains',
    eraId: 'present',
    monsterPool: [
      { monsterId: 'plains_wolf', name: '평원 늑대', weight: 0.5 },
      { monsterId: 'plains_sprite', name: '평원 정령', weight: 0.4 },
      { monsterId: 'plains_guardian', name: '평원 가디언', weight: 0.1, isBoss: true },
    ],
    maxSpawn: 3,
    hasBossSlot: true,
    ambientLine: '평화로운 에테르 평원',
    bgmTrack: 'bgm_field_calm',
    ambientEffect: 'glow',
  },
  {
    zoneId: 'aether_plains',
    eraId: 'ruined_future',
    monsterPool: [
      { monsterId: 'corrupted_wraith', name: '붕괴 망령', weight: 0.5 },
      { monsterId: 'void_hound', name: '공허 사냥개', weight: 0.4 },
      { monsterId: 'time_devourer', name: '시간 포식자', weight: 0.1, isBoss: true },
    ],
    maxSpawn: 4,
    hasBossSlot: true,
    ambientLine: '시간이 무너진 폐허',
    bgmTrack: 'bgm_ruined_future',
    ambientEffect: 'void',
  },
  // ── 기억의 숲 ──
  {
    zoneId: 'memory_forest',
    eraId: 'ancient',
    monsterPool: [
      { monsterId: 'ancient_dryad', name: '고대 정령목', weight: 0.5 },
      { monsterId: 'memory_wisp', name: '기억의 도깨비불', weight: 0.4 },
      { monsterId: 'forest_guardian', name: '숲의 수호자', weight: 0.1, isBoss: true },
    ],
    maxSpawn: 3,
    hasBossSlot: true,
    ambientLine: '잊혀진 정령의 숨결이 떠도는 숲',
  },
  {
    zoneId: 'memory_forest',
    eraId: 'present',
    monsterPool: [
      { monsterId: 'forest_wolf', name: '숲 늑대', weight: 0.45 },
      { monsterId: 'wisp', name: '도깨비불', weight: 0.45 },
      { monsterId: 'forest_remnant', name: '숲의 잔영', weight: 0.1, isBoss: true },
    ],
    maxSpawn: 3,
    hasBossSlot: true,
    ambientLine: '안개 자욱한 기억의 숲',
  },
  {
    zoneId: 'memory_forest',
    eraId: 'ruined_future',
    monsterPool: [
      { monsterId: 'rotting_dryad', name: '부패된 정령목', weight: 0.5 },
      { monsterId: 'lost_wraith', name: '잃어버린 망령', weight: 0.4 },
      { monsterId: 'forsaken_guardian', name: '버려진 수호자', weight: 0.1, isBoss: true },
    ],
    maxSpawn: 4,
    hasBossSlot: true,
    ambientLine: '잊혀진 모든 것이 썩어가는 숲',
  },
  // ── 그림자 협곡 ──
  {
    zoneId: 'shadow_gorge',
    eraId: 'ancient',
    monsterPool: [
      { monsterId: 'shadow_imp', name: '그림자 임프', weight: 0.5 },
      { monsterId: 'dusk_serpent', name: '황혼 뱀', weight: 0.4 },
      { monsterId: 'dusk_phantom', name: '황혼 환영', weight: 0.1, isBoss: true },
    ],
    maxSpawn: 3,
    hasBossSlot: true,
    ambientLine: '황혼이 영원한 협곡',
  },
  {
    zoneId: 'shadow_gorge',
    eraId: 'present',
    monsterPool: [
      { monsterId: 'shadow_weaver_apprentice', name: '그림자 직조 견습', weight: 0.5 },
      { monsterId: 'gorge_serpent', name: '협곡 뱀', weight: 0.4 },
      { monsterId: 'shadow_lord', name: '그림자 군주', weight: 0.1, isBoss: true },
    ],
    maxSpawn: 4,
    hasBossSlot: true,
    ambientLine: '그림자 세력의 본거지',
  },
  {
    zoneId: 'shadow_gorge',
    eraId: 'ruined_future',
    monsterPool: [
      { monsterId: 'shadow_overflow', name: '그림자 폭주', weight: 0.5 },
      { monsterId: 'void_serpent', name: '공허 뱀', weight: 0.4 },
      { monsterId: 'shadow_eternity', name: '영원의 그림자', weight: 0.1, isBoss: true },
    ],
    maxSpawn: 4,
    hasBossSlot: true,
    ambientLine: '그림자가 모든 빛을 잡아먹은 협곡',
  },
  // ── 말라투스 성소 ──
  {
    zoneId: 'malatus_sanctuary',
    eraId: 'ancient',
    monsterPool: [
      { monsterId: 'sanctuary_acolyte', name: '성소 사제', weight: 0.5 },
      { monsterId: 'silvanhome_warden', name: '실반헤임 경비병', weight: 0.4 },
      { monsterId: 'malatus_avatar', name: '말라투스 화신', weight: 0.1, isBoss: true },
    ],
    maxSpawn: 3,
    hasBossSlot: true,
    ambientLine: '봉인된 신성이 살아있는 성소',
  },
  {
    zoneId: 'malatus_sanctuary',
    eraId: 'present',
    monsterPool: [
      { monsterId: 'lost_acolyte', name: '잃어버린 사제', weight: 0.5 },
      { monsterId: 'sanctuary_guardian', name: '성소 수호자', weight: 0.4 },
      { monsterId: 'broken_seal', name: '부서진 봉인', weight: 0.1, isBoss: true },
    ],
    maxSpawn: 3,
    hasBossSlot: true,
    ambientLine: '잊혀진 봉인이 깨어나는 성소',
  },
  {
    zoneId: 'malatus_sanctuary',
    eraId: 'ruined_future',
    monsterPool: [
      { monsterId: 'corrupted_acolyte', name: '부패된 사제', weight: 0.5 },
      { monsterId: 'broken_warden', name: '부서진 경비병', weight: 0.4 },
      { monsterId: 'fallen_malatus', name: '타락한 말라투스', weight: 0.1, isBoss: true },
    ],
    maxSpawn: 4,
    hasBossSlot: true,
    ambientLine: '신성이 무너진 성소의 잔해',
  },
  // ── 결정 동굴 ──
  {
    zoneId: 'crystal_cave',
    eraId: 'ancient',
    monsterPool: [
      { monsterId: 'crystal_sprite', name: '결정 정령', weight: 0.45 },
      { monsterId: 'ether_crystal_golem', name: '에테르 결정 골렘', weight: 0.45 },
      { monsterId: 'crystal_titan_ancient', name: '고대 결정 거인', weight: 0.1, isBoss: true },
    ],
    maxSpawn: 3,
    hasBossSlot: true,
    ambientLine: '에테르가 결정으로 응결된 동굴',
  },
  {
    zoneId: 'crystal_cave',
    eraId: 'present',
    monsterPool: [
      { monsterId: 'cave_bat', name: '동굴 박쥐', weight: 0.5 },
      { monsterId: 'crystal_lurker', name: '결정 잠복자', weight: 0.4 },
      { monsterId: 'crystal_guardian', name: '결정의 수호자', weight: 0.1, isBoss: true },
    ],
    maxSpawn: 4,
    hasBossSlot: true,
    ambientLine: '깊은 어둠 속의 결정 광맥',
  },
  {
    zoneId: 'crystal_cave',
    eraId: 'ruined_future',
    monsterPool: [
      { monsterId: 'shattered_crystal', name: '깨진 결정체', weight: 0.5 },
      { monsterId: 'void_lurker', name: '공허 잠복자', weight: 0.4 },
      { monsterId: 'chrono_shard_titan', name: '시간 파편 거인', weight: 0.1, isBoss: true },
    ],
    maxSpawn: 4,
    hasBossSlot: true,
    ambientLine: '시간 결정이 산산조각난 동굴',
  },
  // ── 잊혀진 성채 ──
  {
    zoneId: 'forgotten_citadel',
    eraId: 'ancient',
    monsterPool: [
      { monsterId: 'citadel_knight', name: '성채 기사', weight: 0.5 },
      { monsterId: 'ether_archer', name: '에테르 궁수', weight: 0.4 },
      { monsterId: 'citadel_lord', name: '성채 영주', weight: 0.1, isBoss: true },
    ],
    maxSpawn: 4,
    hasBossSlot: true,
    ambientLine: '에테르 문명의 영광이 살아있는 성채',
  },
  {
    zoneId: 'forgotten_citadel',
    eraId: 'present',
    monsterPool: [
      { monsterId: 'undead_knight', name: '죽은 기사', weight: 0.5 },
      { monsterId: 'ruined_archer', name: '폐허의 궁수', weight: 0.4 },
      { monsterId: 'wraith_lord', name: '망령의 영주', weight: 0.1, isBoss: true },
    ],
    maxSpawn: 4,
    hasBossSlot: true,
    ambientLine: '문명이 잊혀진 폐허 성채',
  },
  {
    zoneId: 'forgotten_citadel',
    eraId: 'ruined_future',
    monsterPool: [
      { monsterId: 'void_knight', name: '공허 기사', weight: 0.4 },
      { monsterId: 'shadow_archer', name: '그림자 궁수', weight: 0.4 },
      { monsterId: 'oblivion_overlord', name: '망각의 군주', weight: 0.2, isBoss: true },
    ],
    maxSpawn: 5,
    hasBossSlot: true,
    ambientLine: '존재 자체가 흐려진 영원의 성채',
    bgmTrack: 'bgm_void_citadel',
    ambientEffect: 'boss_room',
  },
  // ── 시간의 첨탑 (최종 지역) ──
  {
    zoneId: 'chrono_spire',
    eraId: 'ancient',
    monsterPool: [
      { monsterId: 'chrono_warden', name: '시간 파수꾼', weight: 0.4 },
      { monsterId: 'ether_seraph', name: '에테르 세라프', weight: 0.4 },
      { monsterId: 'aetherna_eidolon', name: '에테르나 환영', weight: 0.2, isBoss: true },
    ],
    maxSpawn: 4,
    hasBossSlot: true,
    ambientLine: '시간의 근원이 흐르는 첨탑',
    bgmTrack: 'bgm_chrono_ancient',
    ambientEffect: 'glow',
  },
  {
    zoneId: 'chrono_spire',
    eraId: 'present',
    monsterPool: [
      { monsterId: 'chrono_guard', name: '시간 수비병', weight: 0.4 },
      { monsterId: 'sky_seraph', name: '하늘 세라프', weight: 0.4 },
      { monsterId: 'chrono_archon', name: '시간 통치자', weight: 0.2, isBoss: true },
    ],
    maxSpawn: 5,
    hasBossSlot: true,
    ambientLine: '시간이 멈춘 듯한 최후의 첨탑',
    bgmTrack: 'bgm_chrono_present',
    ambientEffect: 'glow',
  },
  {
    zoneId: 'chrono_spire',
    eraId: 'ruined_future',
    monsterPool: [
      { monsterId: 'collapsed_warden', name: '붕괴 파수꾼', weight: 0.3 },
      { monsterId: 'void_seraph', name: '공허 세라프', weight: 0.3 },
      { monsterId: 'aetherna_collapse', name: '에테르나의 종말', weight: 0.4, isBoss: true },
    ],
    maxSpawn: 5,
    hasBossSlot: true,
    ambientLine: '세계가 무너지는 마지막 시간선',
    bgmTrack: 'bgm_final_boss',
    ambientEffect: 'boss_room',
    bossOnlyMode: true,
  },
] as const;

const ENCOUNTER_KEY = (zoneId: string, eraId: ChronoEraId): string => `${zoneId}::${eraId}`;
const ENCOUNTER_INDEX = new Map<string, FieldEncounterDef>(
  ENCOUNTERS.map((e) => [ENCOUNTER_KEY(e.zoneId, e.eraId), e]),
);

// CHRONO-S112: era 기반 BGM + ambientEffect 기본값 (encounter 별 override 가능)
const DEFAULT_BGM_BY_ERA: Record<ChronoEraId, string> = {
  ancient: 'bgm_ancient_field',
  present: 'bgm_field_calm',
  ruined_future: 'bgm_ruined_future',
};
const DEFAULT_EFFECT_BY_ERA: Record<ChronoEraId, 'mist' | 'dust' | 'glow' | 'void' | 'boss_room' | 'none'> = {
  ancient: 'mist',
  present: 'glow',
  ruined_future: 'void',
};

/**
 * zone+era 조합으로 필드 encounter 데이터 조회.
 * 미정의 시 null (caller 가 fallback 처리).
 */
export function resolveFieldEncounter(
  zoneId: string,
  eraId: ChronoEraId,
): FieldEncounterDef | null {
  if (!zoneId) return null;
  const raw = ENCOUNTER_INDEX.get(ENCOUNTER_KEY(zoneId, eraId));
  if (!raw) return null;
  // CHRONO-S112: bgm/effect 미설정 시 era 기본값 채워서 반환
  return {
    ...raw,
    bgmTrack: raw.bgmTrack ?? DEFAULT_BGM_BY_ERA[eraId],
    ambientEffect: raw.ambientEffect ?? DEFAULT_EFFECT_BY_ERA[eraId],
  };
}

/** 전체 encounter 목록. */
export function listFieldEncounters(): readonly FieldEncounterDef[] {
  return ENCOUNTERS;
}

/** 특정 zone 의 모든 era encounter. */
export function listFieldEncountersByZone(zoneId: string): readonly FieldEncounterDef[] {
  if (!zoneId) return [];
  return ENCOUNTERS.filter((e) => e.zoneId === zoneId);
}

/**
 * CHRONO-S115: encounter 의 보스 slot 1개 반환 (or null).
 */
export function getBossSlot(encounter: FieldEncounterDef): FieldMonsterSlot | null {
  return encounter.monsterPool.find((s) => s.isBoss === true) ?? null;
}

/**
 * CHRONO-S115: 전체 encounter 에서 등장하는 unique monster id 목록 (DB 시드 / Wiki 활용).
 */
export function listAllFieldMonsterIds(): readonly string[] {
  const set = new Set<string>();
  for (const e of ENCOUNTERS) {
    for (const slot of e.monsterPool) {
      set.add(slot.monsterId);
    }
  }
  return Array.from(set).sort();
}

/**
 * CHRONO-S136: 전체 encounter 의 보스 슬롯 총합 (Wiki 통계 / 게임 진행도 활용).
 */
export function getTotalFieldBosses(): number {
  return ENCOUNTERS.reduce(
    (n, e) => n + e.monsterPool.filter((s) => s.isBoss === true).length, 0,
  );
}

/**
 * CHRONO-S136: 보스 monster id 목록만 정렬 반환 (BattleScene boss tier 분류 활용).
 */
export function listAllBossMonsterIds(): readonly string[] {
  const set = new Set<string>();
  for (const e of ENCOUNTERS) {
    for (const slot of e.monsterPool) {
      if (slot.isBoss) set.add(slot.monsterId);
    }
  }
  return Array.from(set).sort();
}

/**
 * CHRONO-S103: weighted random monster picker.
 * roll: number (0~1) — Math.random() 또는 deterministic seed 주입.
 * monsterPool weight 누적 비교로 선택.
 */
export function rollFieldMonster(
  encounter: FieldEncounterDef,
  roll: number,
): FieldMonsterSlot | null {
  if (!encounter || encounter.monsterPool.length === 0) return null;
  // CHRONO-S139: bossOnlyMode 시 일반 slot 제외, 보스만 후보
  const pool = encounter.bossOnlyMode
    ? encounter.monsterPool.filter((s) => s.isBoss === true)
    : encounter.monsterPool;
  if (pool.length === 0) return null;
  const totalWeight = pool.reduce((s, m) => s + m.weight, 0);
  const clamped = Math.max(0, Math.min(0.999999, roll)) * totalWeight;
  let acc = 0;
  for (const slot of pool) {
    acc += slot.weight;
    if (clamped < acc) return slot;
  }
  return pool[pool.length - 1];
}

/**
 * CHRONO-S103: encounter 의 maxSpawn 만큼 monster 뽑기.
 * rollProvider: () => number — 매 호출마다 새 roll 반환 (테스트 시 deterministic 가능).
 */
export function rollFieldEncounterSpawns(
  encounter: FieldEncounterDef,
  rollProvider: () => number,
): readonly FieldMonsterSlot[] {
  const out: FieldMonsterSlot[] = [];
  for (let i = 0; i < encounter.maxSpawn; i++) {
    const slot = rollFieldMonster(encounter, rollProvider());
    if (slot) out.push(slot);
  }
  return out;
}
