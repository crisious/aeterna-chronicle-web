export type ChronoEraId = 'ancient' | 'present' | 'ruined_future';

export interface ChronoEra {
  id: ChronoEraId;
  label: string;
  shortLabel: string;
  yearLabel: string;
  tintColor: number;
  enemyHpMultiplier: number;
  enemyAttackSpeedMultiplier: number;
  rewardMultiplier: number;
  monsterLevelOffset: number;
  ambientLine: string;
}

export interface ChronoZoneProjection {
  eraId: ChronoEraId;
  zoneId: string;
  displayName: string;
  tintColor: number;
  monsterLevelOffset: number;
  enemyHpMultiplier: number;
  enemyAttackSpeedMultiplier: number;
  rewardMultiplier: number;
  ambientLine: string;
}

export interface ChronoBattleSeed {
  eraId: ChronoEraId;
  zoneId: string;
  monsterId: string;
  monsterName: string;
  enemyHpMultiplier: number;
  enemyAttackSpeedMultiplier: number;
  rewardMultiplier: number;
}

export const CHRONO_ERAS: readonly ChronoEra[] = [
  {
    id: 'ancient',
    label: '고대 왕국',
    shortLabel: '고대',
    yearLabel: 'A.E. -12000',
    tintColor: 0x6fd3ff,
    enemyHpMultiplier: 0.9,
    enemyAttackSpeedMultiplier: 0.95,
    rewardMultiplier: 1,
    monsterLevelOffset: -2,
    ambientLine: '무너진 기억이 아직 살아 있는 시간대',
  },
  {
    id: 'present',
    label: '현재 대륙',
    shortLabel: '현재',
    yearLabel: 'A.E. 212',
    tintColor: 0xc8a2ff,
    enemyHpMultiplier: 1,
    enemyAttackSpeedMultiplier: 1,
    rewardMultiplier: 1,
    monsterLevelOffset: 0,
    ambientLine: '대망각 이후 모험이 시작되는 기준 시간대',
  },
  {
    id: 'ruined_future',
    label: '붕괴미래',
    shortLabel: '붕괴미래',
    yearLabel: 'A.E. 999',
    tintColor: 0xff8844,
    enemyHpMultiplier: 1.25,
    enemyAttackSpeedMultiplier: 1.15,
    rewardMultiplier: 1.25,
    monsterLevelOffset: 6,
    ambientLine: '잘못된 선택이 굳어져 세계가 마모된 시간대',
  },
] as const;

const ERA_INDEX = new Map<ChronoEraId, ChronoEra>(
  CHRONO_ERAS.map((era) => [era.id, era]),
);

const ZONE_LABELS: Record<string, string> = {
  aether_plains: '에테르 평원',
  memory_forest: '기억의 숲',
  malatus_sanctuary: '말라투스 성소',
  shadow_gorge: '그림자 협곡',
  crystal_cave: '결정 동굴',
  forgotten_citadel: '잊혀진 성채',
  chrono_spire: '시간의 첨탑',
};

export function getChronoEra(eraId: ChronoEraId): ChronoEra {
  return ERA_INDEX.get(eraId) ?? ERA_INDEX.get('present')!;
}

export function cycleChronoEra(current: ChronoEraId, direction: 1 | -1): ChronoEraId {
  const currentIndex = CHRONO_ERAS.findIndex((era) => era.id === current);
  const safeIndex = currentIndex >= 0 ? currentIndex : 1;
  const nextIndex = (safeIndex + direction + CHRONO_ERAS.length) % CHRONO_ERAS.length;
  return CHRONO_ERAS[nextIndex].id;
}

export function projectZoneToEra(zoneId: string, eraId: ChronoEraId): ChronoZoneProjection {
  const era = getChronoEra(eraId);
  const baseZoneName = ZONE_LABELS[zoneId] ?? zoneId;

  return {
    eraId: era.id,
    zoneId,
    displayName: `${era.shortLabel} ${baseZoneName}`,
    tintColor: era.tintColor,
    monsterLevelOffset: era.monsterLevelOffset,
    enemyHpMultiplier: era.enemyHpMultiplier,
    enemyAttackSpeedMultiplier: era.enemyAttackSpeedMultiplier,
    rewardMultiplier: era.rewardMultiplier,
    ambientLine: era.ambientLine,
  };
}

export function buildChronoBattleSeed(
  zoneId: string,
  eraId: ChronoEraId,
  monsterId: string,
  baseMonsterName = '시간 균열체',
): ChronoBattleSeed {
  const projection = projectZoneToEra(zoneId, eraId);

  return {
    eraId: projection.eraId,
    zoneId,
    monsterId,
    monsterName: `${getChronoEra(eraId).shortLabel} ${baseMonsterName}`,
    enemyHpMultiplier: projection.enemyHpMultiplier,
    enemyAttackSpeedMultiplier: projection.enemyAttackSpeedMultiplier,
    rewardMultiplier: projection.rewardMultiplier,
  };
}
