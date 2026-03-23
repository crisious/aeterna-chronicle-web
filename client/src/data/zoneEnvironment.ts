/**
 * zoneEnvironment.ts — 존별 환경 오브젝트 정의
 *
 * 각 존에 배치할 오브젝트 목록과 배치 규칙을 정의한다.
 * GameScene에서 import하여 preload + _placeEnvironmentObjects에 사용.
 */

export interface EnvObjectDef {
  key: string;       // texture key
  path: string;      // asset path
  count: number;     // how many to place
  scaleMin: number;
  scaleMax: number;
  glow?: boolean;    // pulse animation
  glowAlpha?: [number, number]; // min, max alpha
}

export interface ZoneEnvConfig {
  groundTile?: string;    // tile texture path
  objects: EnvObjectDef[];
}

const OBJ = 'assets/generated/environment/objects';

export const ZONE_ENV_CONFIG: Record<string, ZoneEnvConfig> = {
  aether_plains: {
    groundTile: 'assets/generated/environment/tiles/aether_ground_tile.png',
    objects: [
      { key: 'env_tree',    path: `${OBJ}/aether_tree_01.png`,    count: 15, scaleMin: 0.6, scaleMax: 1.0 },
      { key: 'env_rock',    path: `${OBJ}/aether_rock_01.png`,    count: 20, scaleMin: 0.4, scaleMax: 0.9 },
      { key: 'env_crystal', path: `${OBJ}/aether_crystal_01.png`, count: 10, scaleMin: 0.5, scaleMax: 0.8, glow: true, glowAlpha: [0.7, 1.0] },
    ],
  },

  erebos: {
    groundTile: 'assets/generated/environment/tiles/ERB-G-01.png',
    objects: [
      { key: 'env_ruin_pillar',  path: `${OBJ}/erb_ruin_pillar.png`,  count: 12, scaleMin: 0.5, scaleMax: 1.0 },
      { key: 'env_fog_lantern',  path: `${OBJ}/erb_fog_lantern.png`,  count: 8,  scaleMin: 0.4, scaleMax: 0.8, glow: true, glowAlpha: [0.5, 1.0] },
      { key: 'env_dead_tree',    path: `${OBJ}/erb_dead_tree.png`,    count: 10, scaleMin: 0.6, scaleMax: 1.0 },
    ],
  },

  sylvanheim: {
    groundTile: 'assets/generated/environment/tiles/SYL-G-01.png',
    objects: [
      { key: 'env_ancient_tree',     path: `${OBJ}/syl_ancient_tree.png`,     count: 12, scaleMin: 0.7, scaleMax: 1.1 },
      { key: 'env_mushroom_cluster', path: `${OBJ}/syl_mushroom_cluster.png`, count: 15, scaleMin: 0.4, scaleMax: 0.8, glow: true, glowAlpha: [0.6, 1.0] },
      { key: 'env_flower_bed',      path: `${OBJ}/syl_flower_bed.png`,       count: 20, scaleMin: 0.4, scaleMax: 0.9 },
    ],
  },

  solaris: {
    groundTile: 'assets/generated/environment/tiles/SOL-G-01.png',
    objects: [
      { key: 'env_cactus',          path: `${OBJ}/sol_cactus.png`,          count: 10, scaleMin: 0.5, scaleMax: 1.0 },
      { key: 'env_sand_rock',       path: `${OBJ}/sol_sand_rock.png`,       count: 15, scaleMin: 0.4, scaleMax: 0.9 },
      { key: 'env_crystal_cluster', path: `${OBJ}/sol_crystal_cluster.png`, count: 8,  scaleMin: 0.5, scaleMax: 0.8, glow: true, glowAlpha: [0.6, 1.0] },
    ],
  },

  boreal: {
    groundTile: 'assets/generated/environment/tiles/NTH-G-01.png',
    objects: [
      { key: 'env_ice_pillar',  path: `${OBJ}/nor_ice_pillar.png`,  count: 10, scaleMin: 0.5, scaleMax: 0.9, glow: true, glowAlpha: [0.7, 1.0] },
      { key: 'env_snow_tree',   path: `${OBJ}/nor_snow_tree.png`,   count: 12, scaleMin: 0.6, scaleMax: 1.0 },
      { key: 'env_frozen_rock', path: `${OBJ}/nor_frozen_rock.png`, count: 15, scaleMin: 0.4, scaleMax: 0.9 },
    ],
  },

  argentium: {
    groundTile: 'assets/generated/environment/tiles/ARG-G-01.png',
    objects: [
      { key: 'env_gear_post',   path: `${OBJ}/arg_gear_post.png`,   count: 12, scaleMin: 0.5, scaleMax: 0.9, glow: true, glowAlpha: [0.6, 1.0] },
      { key: 'env_steam_vent',  path: `${OBJ}/arg_steam_vent.png`,  count: 8,  scaleMin: 0.4, scaleMax: 0.8 },
      { key: 'env_crate_stack', path: `${OBJ}/arg_crate_stack.png`, count: 10, scaleMin: 0.5, scaleMax: 0.9 },
    ],
  },

  shadow_gorge: {
    groundTile: 'assets/generated/environment/tiles/ABY-G-01.png',
    objects: [
      { key: 'env_void_crystal', path: `${OBJ}/aby_void_crystal.png`, count: 8,  scaleMin: 0.5, scaleMax: 0.8, glow: true, glowAlpha: [0.5, 1.0] },
      { key: 'env_stalactite',   path: `${OBJ}/aby_stalactite.png`,   count: 10, scaleMin: 0.5, scaleMax: 1.0 },
      { key: 'env_glowing_moss', path: `${OBJ}/aby_glowing_moss.png`, count: 12, scaleMin: 0.4, scaleMax: 0.8, glow: true, glowAlpha: [0.5, 0.9] },
    ],
  },

  britalia: {
    groundTile: 'assets/generated/environment/tiles/BRT-G-01.png',
    objects: [
      { key: 'env_barrel',      path: `${OBJ}/bri_barrel.png`,      count: 10, scaleMin: 0.5, scaleMax: 0.9 },
      { key: 'env_anchor',      path: `${OBJ}/bri_anchor.png`,      count: 6,  scaleMin: 0.5, scaleMax: 0.9 },
      { key: 'env_fishing_net', path: `${OBJ}/bri_fishing_net.png`, count: 8,  scaleMin: 0.4, scaleMax: 0.8 },
    ],
  },

  plateau_oblivion: {
    groundTile: 'assets/generated/environment/tiles/OBL-G-01.png',
    objects: [
      { key: 'env_cracked_stone', path: `${OBJ}/obl_cracked_stone.png`, count: 15, scaleMin: 0.4, scaleMax: 0.9 },
      { key: 'env_memory_wisp',   path: `${OBJ}/obl_memory_wisp.png`,   count: 10, scaleMin: 0.4, scaleMax: 0.7, glow: true, glowAlpha: [0.5, 1.0] },
    ],
  },

  chrono_spire: {
    groundTile: 'assets/generated/environment/tiles/TMP-G-01.png',
    objects: [
      { key: 'env_time_shard',   path: `${OBJ}/tem_time_shard.png`,   count: 8, scaleMin: 0.4, scaleMax: 0.8, glow: true, glowAlpha: [0.6, 1.0] },
      { key: 'env_broken_clock', path: `${OBJ}/tem_broken_clock.png`, count: 6, scaleMin: 0.5, scaleMax: 0.9 },
    ],
  },

  fog_sea: {
    groundTile: 'assets/generated/environment/tiles/FOG-G-01.png',
    objects: [
      { key: 'env_ghost_lantern', path: `${OBJ}/fog_ghost_lantern.png`, count: 10, scaleMin: 0.4, scaleMax: 0.8, glow: true, glowAlpha: [0.4, 1.0] },
      { key: 'env_driftwood',     path: `${OBJ}/fog_driftwood.png`,     count: 12, scaleMin: 0.5, scaleMax: 0.9 },
    ],
  },
};
