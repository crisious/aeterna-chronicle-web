import { getAllItemIconSpecs } from '../data/itemIconSpecs';
import { getAllStatusIconSpecs } from '../data/statusIconSpecs';

export type SpriteResourceCategory = 'npc' | 'monster' | 'vfx' | 'ui' | 'tile' | 'worldmap' | 'skillIcon' | 'itemIcon' | 'statusIcon';
export type SpriteResourceKind = 'image' | 'spritesheet';

export interface SpriteResource {
  readonly id: string;
  readonly category: SpriteResourceCategory;
  readonly kind: SpriteResourceKind;
  readonly key: string;
  readonly path: string;
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly frameCount: number;
  readonly npcId?: string;
  readonly lobbyNpcId?: string;
  readonly monsterId?: string;
  readonly vfxId?: string;
  readonly zoneId?: string;
  readonly skillIconId?: string;
  readonly uiIconId?: string;
  readonly itemIconId?: string;
  readonly statusIconId?: string;
}

const ITEM_ICON_RESOURCE_ENTRIES: readonly SpriteResource[] = getAllItemIconSpecs().map((spec) => ({
  id: `item_${spec.iconId.toLowerCase().replace(/-/g, '_')}_icon`,
  category: 'itemIcon',
  kind: 'image',
  key: spec.runtimeKey,
  path: spec.runtimePath,
  frameWidth: 64,
  frameHeight: 64,
  frameCount: 1,
  itemIconId: spec.iconId,
}));

const STATUS_ICON_RESOURCE_ENTRIES: readonly SpriteResource[] = getAllStatusIconSpecs().map((spec) => ({
  id: spec.runtimeKey,
  category: 'statusIcon',
  kind: 'image',
  key: spec.runtimeKey,
  path: spec.runtimePath,
  frameWidth: 32,
  frameHeight: 32,
  frameCount: 1,
  statusIconId: spec.iconId,
}));

const SPRITE_RESOURCE_ENTRIES = [
  {
    id: 'npc_ghost_merchant_gorodi',
    category: 'npc',
    kind: 'spritesheet',
    key: 'npc_ghost_merchant_gorodi_sprite',
    path: 'assets/generated/characters/npc_sprites/npc_ghost_merchant_gorodi.png',
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 6,
    npcId: 'npc_ghost_merchant',
  },
  {
    id: 'npc_elder_mateus',
    category: 'npc',
    kind: 'spritesheet',
    key: 'npc_elder_mateus_sprite',
    path: 'assets/generated/characters/npc_sprites/npc_elder_mateus.png',
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 6,
    lobbyNpcId: 'elder',
  },
  {
    id: 'npc_merchant_mira',
    category: 'npc',
    kind: 'spritesheet',
    key: 'npc_merchant_mira_sprite',
    path: 'assets/generated/characters/npc_sprites/npc_merchant_mira.png',
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 6,
    lobbyNpcId: 'merchant',
  },
  {
    id: 'npc_blacksmith_kalen',
    category: 'npc',
    kind: 'spritesheet',
    key: 'npc_blacksmith_kalen_sprite',
    path: 'assets/generated/characters/npc_sprites/npc_blacksmith_kalen.png',
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 6,
    lobbyNpcId: 'blacksmith',
  },
  {
    id: 'npc_memory_fragment_board',
    category: 'npc',
    kind: 'spritesheet',
    key: 'npc_memory_fragment_board_sprite',
    path: 'assets/generated/characters/npc_sprites/npc_memory_fragment_board.png',
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 6,
    lobbyNpcId: 'quest_board',
  },
  {
    id: 'npc_guild_hashir',
    category: 'npc',
    kind: 'spritesheet',
    key: 'npc_guild_hashir_sprite',
    path: 'assets/generated/characters/npc_sprites/npc_guild_hashir.png',
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 6,
    lobbyNpcId: 'party_recruit',
  },
  {
    id: 'mon_erebos_fog_rat_normal',
    category: 'monster',
    kind: 'spritesheet',
    key: 'mon_erebos_fog_rat_normal_sprite',
    path: 'assets/generated/monsters/sprites/mon_erebos_fog_rat_normal.png',
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 12,
    monsterId: 'mon_erebos_fog_rat',
  },
  {
    id: 'mon_erebos_memory_beetle_normal',
    category: 'monster',
    kind: 'spritesheet',
    key: 'mon_erebos_memory_beetle_normal_sprite',
    path: 'assets/generated/monsters/sprites/mon_erebos_memory_beetle_normal.png',
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 12,
    monsterId: 'mon_erebos_memory_beetle',
  },
  {
    id: 'mon_erebos_memory_dust_normal',
    category: 'monster',
    kind: 'spritesheet',
    key: 'mon_erebos_memory_dust_normal_sprite',
    path: 'assets/generated/monsters/sprites/mon_erebos_memory_dust_normal.png',
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 12,
    monsterId: 'mon_erebos_memory_dust',
  },
  {
    id: 'vfx_hit_slash',
    category: 'vfx',
    kind: 'spritesheet',
    key: 'vfx_hit_slash_sprite',
    path: 'assets/generated/vfx/sprites/vfx_hit_slash.png',
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 8,
    vfxId: 'vfx_hit_slash',
  },
  {
    id: 'zone_aether_plains',
    category: 'worldmap',
    kind: 'image',
    key: 'zone_aether_plains',
    path: 'assets/generated/ui/worldmap/zone_aether_plains.png',
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 1,
    zoneId: 'aether_plains',
  },
  {
    id: 'zone_memory_forest',
    category: 'worldmap',
    kind: 'image',
    key: 'zone_memory_forest',
    path: 'assets/generated/ui/worldmap/zone_memory_forest.png',
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 1,
    zoneId: 'memory_forest',
  },
  {
    id: 'zone_malatus_sanctuary',
    category: 'worldmap',
    kind: 'image',
    key: 'zone_malatus_sanctuary',
    path: 'assets/generated/ui/worldmap/zone_malatus_sanctuary.png',
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 1,
    zoneId: 'malatus_sanctuary',
  },
  {
    id: 'zone_shadow_gorge',
    category: 'worldmap',
    kind: 'image',
    key: 'zone_shadow_gorge',
    path: 'assets/generated/ui/worldmap/zone_shadow_gorge.png',
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 1,
    zoneId: 'shadow_gorge',
  },
  {
    id: 'zone_crystal_cave',
    category: 'worldmap',
    kind: 'image',
    key: 'zone_crystal_cave',
    path: 'assets/generated/ui/worldmap/zone_crystal_cave.png',
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 1,
    zoneId: 'crystal_cave',
  },
  {
    id: 'zone_forgotten_citadel',
    category: 'worldmap',
    kind: 'image',
    key: 'zone_forgotten_citadel',
    path: 'assets/generated/ui/worldmap/zone_forgotten_citadel.png',
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 1,
    zoneId: 'forgotten_citadel',
  },
  {
    id: 'zone_chrono_spire',
    category: 'worldmap',
    kind: 'image',
    key: 'zone_chrono_spire',
    path: 'assets/generated/ui/worldmap/zone_chrono_spire.png',
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 1,
    zoneId: 'chrono_spire',
  },
  {
    id: 'skill_ek_slash_icon',
    category: 'skillIcon',
    kind: 'image',
    key: 'skill_ek_slash_icon',
    path: 'assets/generated/ui/icons/skills/skill_ek_slash.png',
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 1,
    skillIconId: 'skill_ek_slash',
  },
  {
    id: 'ui_icon_battle_bgm_playing',
    category: 'ui',
    kind: 'image',
    key: 'ui_icon_battle_bgm_playing',
    path: 'assets/generated/ui/icons/system/battle_bgm_playing.png',
    frameWidth: 32,
    frameHeight: 32,
    frameCount: 1,
    uiIconId: 'battle_bgm_playing',
  },
  {
    id: 'ui_icon_battle_bgm_missing',
    category: 'ui',
    kind: 'image',
    key: 'ui_icon_battle_bgm_missing',
    path: 'assets/generated/ui/icons/system/battle_bgm_missing.png',
    frameWidth: 32,
    frameHeight: 32,
    frameCount: 1,
    uiIconId: 'battle_bgm_missing',
  },
  {
    id: 'ui_icon_settings_title',
    category: 'ui',
    kind: 'image',
    key: 'ui_icon_settings_title',
    path: 'assets/generated/ui/icons/system/settings_title.png',
    frameWidth: 32,
    frameHeight: 32,
    frameCount: 1,
    uiIconId: 'settings_title',
  },
  {
    id: 'ui_icon_settings_sound',
    category: 'ui',
    kind: 'image',
    key: 'ui_icon_settings_sound',
    path: 'assets/generated/ui/icons/system/settings_sound.png',
    frameWidth: 32,
    frameHeight: 32,
    frameCount: 1,
    uiIconId: 'settings_sound',
  },
  {
    id: 'ui_icon_settings_language',
    category: 'ui',
    kind: 'image',
    key: 'ui_icon_settings_language',
    path: 'assets/generated/ui/icons/system/settings_language.png',
    frameWidth: 32,
    frameHeight: 32,
    frameCount: 1,
    uiIconId: 'settings_language',
  },
  {
    id: 'ui_icon_settings_accessibility',
    category: 'ui',
    kind: 'image',
    key: 'ui_icon_settings_accessibility',
    path: 'assets/generated/ui/icons/system/settings_accessibility.png',
    frameWidth: 32,
    frameHeight: 32,
    frameCount: 1,
    uiIconId: 'settings_accessibility',
  },
  {
    id: 'ui_icon_settings_keybind',
    category: 'ui',
    kind: 'image',
    key: 'ui_icon_settings_keybind',
    path: 'assets/generated/ui/icons/system/settings_keybind.png',
    frameWidth: 32,
    frameHeight: 32,
    frameCount: 1,
    uiIconId: 'settings_keybind',
  },
  {
    id: 'ui_icon_chat_system',
    category: 'ui',
    kind: 'image',
    key: 'ui_icon_chat_system',
    path: 'assets/generated/ui/icons/system/chat_system.png',
    frameWidth: 32,
    frameHeight: 32,
    frameCount: 1,
    uiIconId: 'chat_system',
  },
  {
    id: 'skill_ek_shield_icon',
    category: 'skillIcon',
    kind: 'image',
    key: 'skill_ek_shield_icon',
    path: 'assets/generated/ui/icons/skills/skill_ek_shield.png',
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 1,
    skillIconId: 'skill_ek_shield',
  },
  {
    id: 'skill_ek_charge_icon',
    category: 'skillIcon',
    kind: 'image',
    key: 'skill_ek_charge_icon',
    path: 'assets/generated/ui/icons/skills/skill_ek_charge.png',
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 1,
    skillIconId: 'skill_ek_charge',
  },
  {
    id: 'skill_ek_explode_icon',
    category: 'skillIcon',
    kind: 'image',
    key: 'skill_ek_explode_icon',
    path: 'assets/generated/ui/icons/skills/skill_ek_explode.png',
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 1,
    skillIconId: 'skill_ek_explode',
  },
  {
    id: 'skill_ek_passive_icon',
    category: 'skillIcon',
    kind: 'image',
    key: 'skill_ek_passive_icon',
    path: 'assets/generated/ui/icons/skills/skill_ek_passive.png',
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 1,
    skillIconId: 'skill_ek_passive',
  },
  {
    id: 'skill_ek_ultimate_icon',
    category: 'skillIcon',
    kind: 'image',
    key: 'skill_ek_ultimate_icon',
    path: 'assets/generated/ui/icons/skills/skill_ek_ultimate.png',
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 1,
    skillIconId: 'skill_ek_ultimate',
  },
  {
    id: 'skill_mw_arrow_icon',
    category: 'skillIcon',
    kind: 'image',
    key: 'skill_mw_arrow_icon',
    path: 'assets/generated/ui/icons/skills/skill_mw_arrow.png',
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 1,
    skillIconId: 'skill_mw_arrow',
  },
  {
    id: 'skill_mw_bolt_icon',
    category: 'skillIcon',
    kind: 'image',
    key: 'skill_mw_bolt_icon',
    path: 'assets/generated/ui/icons/skills/skill_mw_bolt.png',
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 1,
    skillIconId: 'skill_mw_bolt',
  },
  {
    id: 'skill_mw_heal_icon',
    category: 'skillIcon',
    kind: 'image',
    key: 'skill_mw_heal_icon',
    path: 'assets/generated/ui/icons/skills/skill_mw_heal.png',
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 1,
    skillIconId: 'skill_mw_heal',
  },
  {
    id: 'skill_mw_storm_icon',
    category: 'skillIcon',
    kind: 'image',
    key: 'skill_mw_storm_icon',
    path: 'assets/generated/ui/icons/skills/skill_mw_storm.png',
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 1,
    skillIconId: 'skill_mw_storm',
  },
  {
    id: 'skill_mw_passive_icon',
    category: 'skillIcon',
    kind: 'image',
    key: 'skill_mw_passive_icon',
    path: 'assets/generated/ui/icons/skills/skill_mw_passive.png',
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 1,
    skillIconId: 'skill_mw_passive',
  },
  {
    id: 'skill_mw_ultimate_icon',
    category: 'skillIcon',
    kind: 'image',
    key: 'skill_mw_ultimate_icon',
    path: 'assets/generated/ui/icons/skills/skill_mw_ultimate.png',
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 1,
    skillIconId: 'skill_mw_ultimate',
  },
  {
    id: 'skill_sw_stab_icon',
    category: 'skillIcon',
    kind: 'image',
    key: 'skill_sw_stab_icon',
    path: 'assets/generated/ui/icons/skills/skill_sw_stab.png',
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 1,
    skillIconId: 'skill_sw_stab',
  },
  {
    id: 'skill_sw_vital_icon',
    category: 'skillIcon',
    kind: 'image',
    key: 'skill_sw_vital_icon',
    path: 'assets/generated/ui/icons/skills/skill_sw_vital.png',
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 1,
    skillIconId: 'skill_sw_vital',
  },
  {
    id: 'skill_sw_smoke_icon',
    category: 'skillIcon',
    kind: 'image',
    key: 'skill_sw_smoke_icon',
    path: 'assets/generated/ui/icons/skills/skill_sw_smoke.png',
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 1,
    skillIconId: 'skill_sw_smoke',
  },
  {
    id: 'skill_sw_explosion_icon',
    category: 'skillIcon',
    kind: 'image',
    key: 'skill_sw_explosion_icon',
    path: 'assets/generated/ui/icons/skills/skill_sw_explosion.png',
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 1,
    skillIconId: 'skill_sw_explosion',
  },
  {
    id: 'skill_sw_passive_icon',
    category: 'skillIcon',
    kind: 'image',
    key: 'skill_sw_passive_icon',
    path: 'assets/generated/ui/icons/skills/skill_sw_passive.png',
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 1,
    skillIconId: 'skill_sw_passive',
  },
  {
    id: 'skill_sw_ultimate_icon',
    category: 'skillIcon',
    kind: 'image',
    key: 'skill_sw_ultimate_icon',
    path: 'assets/generated/ui/icons/skills/skill_sw_ultimate.png',
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 1,
    skillIconId: 'skill_sw_ultimate',
  },
  {
    id: 'skill_mb_shatter_icon',
    category: 'skillIcon',
    kind: 'image',
    key: 'skill_mb_shatter_icon',
    path: 'assets/generated/ui/icons/skills/skill_mb_shatter.png',
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 1,
    skillIconId: 'skill_mb_shatter',
  },
  {
    id: 'skill_mb_ground_icon',
    category: 'skillIcon',
    kind: 'image',
    key: 'skill_mb_ground_icon',
    path: 'assets/generated/ui/icons/skills/skill_mb_ground.png',
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 1,
    skillIconId: 'skill_mb_ground',
  },
  {
    id: 'skill_mb_rage_icon',
    category: 'skillIcon',
    kind: 'image',
    key: 'skill_mb_rage_icon',
    path: 'assets/generated/ui/icons/skills/skill_mb_rage.png',
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 1,
    skillIconId: 'skill_mb_rage',
  },
  {
    id: 'skill_mb_storm_icon',
    category: 'skillIcon',
    kind: 'image',
    key: 'skill_mb_storm_icon',
    path: 'assets/generated/ui/icons/skills/skill_mb_storm.png',
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 1,
    skillIconId: 'skill_mb_storm',
  },
  {
    id: 'skill_mb_passive_icon',
    category: 'skillIcon',
    kind: 'image',
    key: 'skill_mb_passive_icon',
    path: 'assets/generated/ui/icons/skills/skill_mb_passive.png',
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 1,
    skillIconId: 'skill_mb_passive',
  },
  {
    id: 'skill_mb_ultimate_icon',
    category: 'skillIcon',
    kind: 'image',
    key: 'skill_mb_ultimate_icon',
    path: 'assets/generated/ui/icons/skills/skill_mb_ultimate.png',
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 1,
    skillIconId: 'skill_mb_ultimate',
  },
  {
    id: 'skill_tg_stop_icon',
    category: 'skillIcon',
    kind: 'image',
    key: 'skill_tg_stop_icon',
    path: 'assets/generated/ui/icons/skills/skill_tg_stop.png',
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 1,
    skillIconId: 'skill_tg_stop',
  },
  {
    id: 'skill_tg_slow_icon',
    category: 'skillIcon',
    kind: 'image',
    key: 'skill_tg_slow_icon',
    path: 'assets/generated/ui/icons/skills/skill_tg_slow.png',
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 1,
    skillIconId: 'skill_tg_slow',
  },
  {
    id: 'skill_tg_haste_icon',
    category: 'skillIcon',
    kind: 'image',
    key: 'skill_tg_haste_icon',
    path: 'assets/generated/ui/icons/skills/skill_tg_haste.png',
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 1,
    skillIconId: 'skill_tg_haste',
  },
  {
    id: 'skill_tg_reverse_icon',
    category: 'skillIcon',
    kind: 'image',
    key: 'skill_tg_reverse_icon',
    path: 'assets/generated/ui/icons/skills/skill_tg_reverse.png',
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 1,
    skillIconId: 'skill_tg_reverse',
  },
  {
    id: 'skill_tg_eternity_icon',
    category: 'skillIcon',
    kind: 'image',
    key: 'skill_tg_eternity_icon',
    path: 'assets/generated/ui/icons/skills/skill_tg_eternity.png',
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 1,
    skillIconId: 'skill_tg_eternity',
  },
  {
    id: 'skill_vw_bullet_icon',
    category: 'skillIcon',
    kind: 'image',
    key: 'skill_vw_bullet_icon',
    path: 'assets/generated/ui/icons/skills/skill_vw_bullet.png',
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 1,
    skillIconId: 'skill_vw_bullet',
  },
  {
    id: 'skill_vw_warp_icon',
    category: 'skillIcon',
    kind: 'image',
    key: 'skill_vw_warp_icon',
    path: 'assets/generated/ui/icons/skills/skill_vw_warp.png',
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 1,
    skillIconId: 'skill_vw_warp',
  },
  {
    id: 'skill_vw_tether_icon',
    category: 'skillIcon',
    kind: 'image',
    key: 'skill_vw_tether_icon',
    path: 'assets/generated/ui/icons/skills/skill_vw_tether.png',
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 1,
    skillIconId: 'skill_vw_tether',
  },
  {
    id: 'skill_vw_rift_icon',
    category: 'skillIcon',
    kind: 'image',
    key: 'skill_vw_rift_icon',
    path: 'assets/generated/ui/icons/skills/skill_vw_rift.png',
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 1,
    skillIconId: 'skill_vw_rift',
  },
  {
    id: 'skill_vw_explosion_icon',
    category: 'skillIcon',
    kind: 'image',
    key: 'skill_vw_explosion_icon',
    path: 'assets/generated/ui/icons/skills/skill_vw_explosion.png',
    frameWidth: 64,
    frameHeight: 64,
    frameCount: 1,
    skillIconId: 'skill_vw_explosion',
  },
  ...STATUS_ICON_RESOURCE_ENTRIES,
  ...ITEM_ICON_RESOURCE_ENTRIES,
] as const satisfies readonly SpriteResource[];

export const SPRITE_RESOURCE_MANIFEST: readonly SpriteResource[] = SPRITE_RESOURCE_ENTRIES;

const SPRITE_RESOURCE_BY_ID: ReadonlyMap<string, SpriteResource> = new Map(
  SPRITE_RESOURCE_MANIFEST.map((resource) => [resource.id, resource] as const),
);

const SPRITE_RESOURCE_BY_NPC_ID: ReadonlyMap<string, SpriteResource> = new Map(
  SPRITE_RESOURCE_MANIFEST
    .filter((resource) => typeof resource.npcId === 'string')
    .map((resource) => [resource.npcId as string, resource] as const),
);

const SPRITE_RESOURCE_BY_LOBBY_NPC_ID: ReadonlyMap<string, SpriteResource> = new Map(
  SPRITE_RESOURCE_MANIFEST
    .filter((resource) => typeof resource.lobbyNpcId === 'string')
    .map((resource) => [resource.lobbyNpcId as string, resource] as const),
);

const SPRITE_RESOURCE_BY_MONSTER_ID: ReadonlyMap<string, SpriteResource> = new Map(
  SPRITE_RESOURCE_MANIFEST
    .filter((resource) => typeof resource.monsterId === 'string')
    .map((resource) => [resource.monsterId as string, resource] as const),
);

const SPRITE_RESOURCE_BY_VFX_ID: ReadonlyMap<string, SpriteResource> = new Map(
  SPRITE_RESOURCE_MANIFEST
    .filter((resource) => typeof resource.vfxId === 'string')
    .map((resource) => [resource.vfxId as string, resource] as const),
);

const SPRITE_RESOURCE_BY_ZONE_ID: ReadonlyMap<string, SpriteResource> = new Map(
  SPRITE_RESOURCE_MANIFEST
    .filter((resource) => typeof resource.zoneId === 'string')
    .map((resource) => [resource.zoneId as string, resource] as const),
);

const SPRITE_RESOURCE_BY_SKILL_ICON_ID: ReadonlyMap<string, SpriteResource> = new Map(
  SPRITE_RESOURCE_MANIFEST
    .filter((resource) => typeof resource.skillIconId === 'string')
    .map((resource) => [resource.skillIconId as string, resource] as const),
);

const SPRITE_RESOURCE_BY_UI_ICON_ID: ReadonlyMap<string, SpriteResource> = new Map(
  SPRITE_RESOURCE_MANIFEST
    .filter((resource) => typeof resource.uiIconId === 'string')
    .map((resource) => [resource.uiIconId as string, resource] as const),
);

const SPRITE_RESOURCE_BY_ITEM_ICON_ID: ReadonlyMap<string, SpriteResource> = new Map(
  SPRITE_RESOURCE_MANIFEST
    .filter((resource) => typeof resource.itemIconId === 'string')
    .map((resource) => [resource.itemIconId as string, resource] as const),
);

const SPRITE_RESOURCE_BY_STATUS_ICON_ID: ReadonlyMap<string, SpriteResource> = new Map(
  SPRITE_RESOURCE_MANIFEST
    .filter((resource) => typeof resource.statusIconId === 'string')
    .map((resource) => [resource.statusIconId as string, resource] as const),
);

export function getSpriteResource(id: string): SpriteResource | undefined {
  return SPRITE_RESOURCE_BY_ID.get(id);
}

export function getSpriteResourceForNpc(npcId: string): SpriteResource | undefined {
  return SPRITE_RESOURCE_BY_NPC_ID.get(npcId);
}

export function getSpriteResourceForLobbyNpc(lobbyNpcId: string): SpriteResource | undefined {
  return SPRITE_RESOURCE_BY_LOBBY_NPC_ID.get(lobbyNpcId);
}

export function getSpriteResourceForMonster(monsterId: string): SpriteResource | undefined {
  return SPRITE_RESOURCE_BY_MONSTER_ID.get(monsterId);
}

export function getSpriteResourceForVfx(vfxId: string): SpriteResource | undefined {
  return SPRITE_RESOURCE_BY_VFX_ID.get(vfxId);
}

export function getSpriteResourceForWorldZoneIcon(zoneId: string): SpriteResource | undefined {
  return SPRITE_RESOURCE_BY_ZONE_ID.get(zoneId);
}

export function getSpriteResourceForSkillIcon(skillIconId: string): SpriteResource | undefined {
  return SPRITE_RESOURCE_BY_SKILL_ICON_ID.get(skillIconId);
}

export function getSpriteResourceForUiIcon(uiIconId: string): SpriteResource | undefined {
  return SPRITE_RESOURCE_BY_UI_ICON_ID.get(uiIconId);
}

export function getSpriteResourceForItemIcon(itemIconId: string): SpriteResource | undefined {
  return SPRITE_RESOURCE_BY_ITEM_ICON_ID.get(itemIconId);
}

export function getSpriteResourceForStatusIcon(statusIconId: string): SpriteResource | undefined {
  return SPRITE_RESOURCE_BY_STATUS_ICON_ID.get(statusIconId);
}
