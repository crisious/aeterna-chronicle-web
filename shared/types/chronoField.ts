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
