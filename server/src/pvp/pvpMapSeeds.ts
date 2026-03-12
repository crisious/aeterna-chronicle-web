/**
 * pvpMapSeeds.ts — PvP 맵 시드 데이터 (P8-15)
 *
 * 시즌 1: 기본 아레나 (기존)
 * 시즌 2: 안개해 아레나, 심해 콜로세움
 *
 * 각 맵은 고유 환경 효과와 지형 특성을 가짐.
 */

// ─── 타입 ─────────────────────────────────────────────────────

export interface PvpMapDef {
  id: string;
  name: string;
  nameEn: string;
  nameJa: string;
  season: number;
  description: string;
  /** 맵 크기 (타일 기준) */
  width: number;
  height: number;
  /** 환경 효과 — 전투 중 일정 간격으로 발동 */
  environmentEffects: EnvironmentEffect[];
  /** 지형 오브젝트 */
  terrainFeatures: TerrainFeature[];
  /** 스폰 포인트 (1v1 기준 2개, 3v3 기준 6개) */
  spawnPoints: SpawnPoint[];
  /** 최소 레이팅 제한 (0 = 제한 없음) */
  minRating: number;
  /** 맵 해금 조건 */
  unlockCondition?: string;
}

export interface EnvironmentEffect {
  id: string;
  name: string;
  description: string;
  /** 발동 주기 (초) */
  intervalSec: number;
  /** 효과 지속 시간 (초) */
  durationSec: number;
  /** 효과 타입 */
  type: 'damage' | 'debuff' | 'buff' | 'terrain_change' | 'vision';
  /** 효과 수치 (%) */
  value: number;
}

export interface TerrainFeature {
  id: string;
  name: string;
  type: 'obstacle' | 'cover' | 'hazard' | 'interactive';
  x: number;
  y: number;
  radius: number;
  effect?: string;
}

export interface SpawnPoint {
  team: 'A' | 'B';
  index: number;
  x: number;
  y: number;
}

// ─── 시즌 2 맵 정의 ──────────────────────────────────────────

export const PVP_MAP_SEEDS: readonly PvpMapDef[] = [
  // ── 시즌 2 맵 1: 안개해 아레나 ─────────────────────────────
  {
    id: 'arena_mistsea',
    name: '안개해 아레나',
    nameEn: 'Mistsea Arena',
    nameJa: '霧海アリーナ',
    season: 2,
    description:
      '무한 안개해의 떠다니는 폐선 위에 세워진 투기장. ' +
      '주기적으로 안개가 밀려와 시야를 제한하고, ' +
      '해류가 바닥 타일을 이동시킨다.',
    width: 40,
    height: 30,
    minRating: 0,
    environmentEffects: [
      {
        id: 'dense_fog',
        name: '짙은 안개',
        description: '모든 플레이어의 시야 범위가 50% 감소',
        intervalSec: 45,
        durationSec: 15,
        type: 'vision',
        value: -50,
      },
      {
        id: 'sea_current',
        name: '해류 변동',
        description: '무작위 2x2 타일이 이동하여 지형이 변경',
        intervalSec: 60,
        durationSec: 5,
        type: 'terrain_change',
        value: 0,
      },
    ],
    terrainFeatures: [
      { id: 'wreck_bow', name: '난파선 선수', type: 'cover', x: 10, y: 15, radius: 3 },
      { id: 'wreck_stern', name: '난파선 선미', type: 'cover', x: 30, y: 15, radius: 3 },
      { id: 'whirlpool', name: '소용돌이', type: 'hazard', x: 20, y: 15, radius: 2, effect: 'pull_center' },
      { id: 'floating_crate', name: '표류 상자', type: 'interactive', x: 20, y: 8, radius: 1, effect: 'random_buff' },
      { id: 'coral_reef', name: '산호 장벽', type: 'obstacle', x: 15, y: 22, radius: 2 },
      { id: 'coral_reef_2', name: '산호 장벽 2', type: 'obstacle', x: 25, y: 22, radius: 2 },
    ],
    spawnPoints: [
      { team: 'A', index: 0, x: 5, y: 15 },
      { team: 'A', index: 1, x: 5, y: 10 },
      { team: 'A', index: 2, x: 5, y: 20 },
      { team: 'B', index: 0, x: 35, y: 15 },
      { team: 'B', index: 1, x: 35, y: 10 },
      { team: 'B', index: 2, x: 35, y: 20 },
    ],
  },

  // ── 시즌 2 맵 2: 심해 콜로세움 ─────────────────────────────
  {
    id: 'arena_deepsea_colosseum',
    name: '심해 콜로세움',
    nameEn: 'Abyssal Colosseum',
    nameJa: '深海コロセウム',
    season: 2,
    description:
      '해저 깊은 곳에 잠든 고대 투기장. ' +
      '수압이 전투원의 이동속도를 저하시키고, ' +
      '심해 생물이 주기적으로 양 팀에 피해를 입힌다.',
    width: 36,
    height: 36,
    minRating: 1200,
    unlockCondition: 'season2_unlock OR rating >= 1200',
    environmentEffects: [
      {
        id: 'water_pressure',
        name: '수압',
        description: '모든 플레이어 이동속도 -20% (상시)',
        intervalSec: 0,
        durationSec: 9999,
        type: 'debuff',
        value: -20,
      },
      {
        id: 'abyssal_leviathan',
        name: '심해 괴수 출현',
        description: '맵 중앙에 AOE 피해 (최대 HP의 10%)',
        intervalSec: 30,
        durationSec: 3,
        type: 'damage',
        value: 10,
      },
      {
        id: 'bioluminescence',
        name: '발광 조류',
        description: '무작위 한 팀에 공격력 +15% 버프',
        intervalSec: 50,
        durationSec: 10,
        type: 'buff',
        value: 15,
      },
    ],
    terrainFeatures: [
      { id: 'central_pillar', name: '고대 기둥', type: 'obstacle', x: 18, y: 18, radius: 3 },
      { id: 'trench_left', name: '좌측 해구', type: 'hazard', x: 8, y: 18, radius: 4, effect: 'slow_50' },
      { id: 'trench_right', name: '우측 해구', type: 'hazard', x: 28, y: 18, radius: 4, effect: 'slow_50' },
      { id: 'thermal_vent_1', name: '열수구 1', type: 'interactive', x: 12, y: 8, radius: 1, effect: 'heal_5_percent' },
      { id: 'thermal_vent_2', name: '열수구 2', type: 'interactive', x: 24, y: 28, radius: 1, effect: 'heal_5_percent' },
      { id: 'coral_wall', name: '산호벽', type: 'cover', x: 18, y: 8, radius: 2 },
      { id: 'coral_wall_2', name: '산호벽 2', type: 'cover', x: 18, y: 28, radius: 2 },
    ],
    spawnPoints: [
      { team: 'A', index: 0, x: 4, y: 18 },
      { team: 'A', index: 1, x: 4, y: 12 },
      { team: 'A', index: 2, x: 4, y: 24 },
      { team: 'B', index: 0, x: 32, y: 18 },
      { team: 'B', index: 1, x: 32, y: 12 },
      { team: 'B', index: 2, x: 32, y: 24 },
    ],
  },
];

/**
 * 시즌별 맵 목록 조회
 */
export function getMapsBySeason(season: number): PvpMapDef[] {
  return PVP_MAP_SEEDS.filter(m => m.season === season);
}

/**
 * 맵 ID로 조회
 */
export function getMapById(mapId: string): PvpMapDef | undefined {
  return PVP_MAP_SEEDS.find(m => m.id === mapId);
}

/**
 * 유저 레이팅 기준 입장 가능한 시즌 2 맵 필터
 */
export function getAvailableMaps(season: number, userRating: number): PvpMapDef[] {
  return PVP_MAP_SEEDS.filter(
    m => m.season === season && userRating >= m.minRating,
  );
}
