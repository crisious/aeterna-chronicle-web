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
  },
  {
    zoneId: 'aether_plains',
    eraId: 'present',
    monsterPool: [
      { monsterId: 'plains_wolf', name: '평원 늑대', weight: 0.6 },
      { monsterId: 'plains_sprite', name: '평원 정령', weight: 0.4 },
    ],
    maxSpawn: 3,
    hasBossSlot: false,
    ambientLine: '평화로운 에테르 평원',
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
      { monsterId: 'forest_wolf', name: '숲 늑대', weight: 0.5 },
      { monsterId: 'wisp', name: '도깨비불', weight: 0.5 },
    ],
    maxSpawn: 3,
    hasBossSlot: false,
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
      { monsterId: 'shadow_imp', name: '그림자 임프', weight: 0.6 },
      { monsterId: 'dusk_serpent', name: '황혼 뱀', weight: 0.4 },
    ],
    maxSpawn: 3,
    hasBossSlot: false,
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
] as const;

const ENCOUNTER_KEY = (zoneId: string, eraId: ChronoEraId): string => `${zoneId}::${eraId}`;
const ENCOUNTER_INDEX = new Map<string, FieldEncounterDef>(
  ENCOUNTERS.map((e) => [ENCOUNTER_KEY(e.zoneId, e.eraId), e]),
);

/**
 * zone+era 조합으로 필드 encounter 데이터 조회.
 * 미정의 시 null (caller 가 fallback 처리).
 */
export function resolveFieldEncounter(
  zoneId: string,
  eraId: ChronoEraId,
): FieldEncounterDef | null {
  if (!zoneId) return null;
  return ENCOUNTER_INDEX.get(ENCOUNTER_KEY(zoneId, eraId)) ?? null;
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
 * CHRONO-S103: weighted random monster picker.
 * roll: number (0~1) — Math.random() 또는 deterministic seed 주입.
 * monsterPool weight 누적 비교로 선택.
 */
export function rollFieldMonster(
  encounter: FieldEncounterDef,
  roll: number,
): FieldMonsterSlot | null {
  if (!encounter || encounter.monsterPool.length === 0) return null;
  const clamped = Math.max(0, Math.min(0.999999, roll));
  let acc = 0;
  for (const slot of encounter.monsterPool) {
    acc += slot.weight;
    if (clamped < acc) return slot;
  }
  // weight 합 < 1.0 edge case — 마지막 slot fallback
  return encounter.monsterPool[encounter.monsterPool.length - 1];
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
