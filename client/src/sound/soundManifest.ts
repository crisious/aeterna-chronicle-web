/**
 * 사운드 매니페스트 — 100개 사운드 에셋 정의
 * P4-05: 사운드 시스템
 */

// ─── 타입 정의 ──────────────────────────────────────────────────
export type SoundType = 'bgm' | 'sfx' | 'ambient' | 'voice';
export type SoundCategory =
  | 'bgm_field'
  | 'bgm_dungeon'
  | 'bgm_battle'
  | 'bgm_ui'
  | 'sfx_combat'
  | 'sfx_ui'
  | 'sfx_system'
  | 'ambient'
  | 'voice_npc'
  | 'voice_combat';

export interface SoundEntry {
  /** 고유 키 (SoundManager에서 참조용) */
  key: string;
  /** 에셋 경로 (public/assets/audio 기준) */
  path: string;
  /** 사운드 유형 */
  type: SoundType;
  /** 기본 볼륨 (0.0 ~ 1.0) */
  volume: number;
  /** 루프 여부 */
  loop: boolean;
  /** 카테고리 (볼륨 그룹, 필터링) */
  category: SoundCategory;
}

// ─── BGM (15) ───────────────────────────────────────────────────
const BGM_ENTRIES: SoundEntry[] = [
  { key: 'bgm_main_theme', path: 'audio/bgm/main_theme.ogg', type: 'bgm', volume: 0.7, loop: true, category: 'bgm_field' },
  { key: 'bgm_argentium', path: 'audio/bgm/argentium.ogg', type: 'bgm', volume: 0.65, loop: true, category: 'bgm_field' },
  { key: 'bgm_veiled_forest', path: 'audio/bgm/veiled_forest.ogg', type: 'bgm', volume: 0.6, loop: true, category: 'bgm_field' },
  { key: 'bgm_crystal_cavern', path: 'audio/bgm/crystal_cavern.ogg', type: 'bgm', volume: 0.6, loop: true, category: 'bgm_dungeon' },
  { key: 'bgm_abyssal_rift', path: 'audio/bgm/abyssal_rift.ogg', type: 'bgm', volume: 0.65, loop: true, category: 'bgm_dungeon' },
  { key: 'bgm_forgotten_archive', path: 'audio/bgm/forgotten_archive.ogg', type: 'bgm', volume: 0.55, loop: true, category: 'bgm_dungeon' },
  { key: 'bgm_boss_generic', path: 'audio/bgm/boss_generic.ogg', type: 'bgm', volume: 0.8, loop: true, category: 'bgm_battle' },
  { key: 'bgm_boss_chronos', path: 'audio/bgm/boss_chronos.ogg', type: 'bgm', volume: 0.85, loop: true, category: 'bgm_battle' },
  { key: 'bgm_boss_oblivion', path: 'audio/bgm/boss_oblivion.ogg', type: 'bgm', volume: 0.85, loop: true, category: 'bgm_battle' },
  { key: 'bgm_pvp_arena', path: 'audio/bgm/pvp_arena.ogg', type: 'bgm', volume: 0.75, loop: true, category: 'bgm_battle' },
  { key: 'bgm_guild_hall', path: 'audio/bgm/guild_hall.ogg', type: 'bgm', volume: 0.5, loop: true, category: 'bgm_field' },
  { key: 'bgm_village_peace', path: 'audio/bgm/village_peace.ogg', type: 'bgm', volume: 0.55, loop: true, category: 'bgm_field' },
  { key: 'bgm_title_screen', path: 'audio/bgm/title_screen.ogg', type: 'bgm', volume: 0.7, loop: true, category: 'bgm_ui' },
  { key: 'bgm_ending_memory', path: 'audio/bgm/ending_memory.ogg', type: 'bgm', volume: 0.75, loop: false, category: 'bgm_ui' },
  { key: 'bgm_ending_oblivion', path: 'audio/bgm/ending_oblivion.ogg', type: 'bgm', volume: 0.75, loop: false, category: 'bgm_ui' },
];

// ─── SFX 전투 (25) ──────────────────────────────────────────────
const SFX_COMBAT_ENTRIES: SoundEntry[] = [
  { key: 'sfx_sword_slash_1', path: 'audio/sfx/combat/sword_slash_1.ogg', type: 'sfx', volume: 0.6, loop: false, category: 'sfx_combat' },
  { key: 'sfx_sword_slash_2', path: 'audio/sfx/combat/sword_slash_2.ogg', type: 'sfx', volume: 0.6, loop: false, category: 'sfx_combat' },
  { key: 'sfx_sword_slash_3', path: 'audio/sfx/combat/sword_slash_3.ogg', type: 'sfx', volume: 0.6, loop: false, category: 'sfx_combat' },
  { key: 'sfx_heavy_strike', path: 'audio/sfx/combat/heavy_strike.ogg', type: 'sfx', volume: 0.7, loop: false, category: 'sfx_combat' },
  { key: 'sfx_magic_fire', path: 'audio/sfx/combat/magic_fire.ogg', type: 'sfx', volume: 0.65, loop: false, category: 'sfx_combat' },
  { key: 'sfx_magic_ice', path: 'audio/sfx/combat/magic_ice.ogg', type: 'sfx', volume: 0.65, loop: false, category: 'sfx_combat' },
  { key: 'sfx_magic_lightning', path: 'audio/sfx/combat/magic_lightning.ogg', type: 'sfx', volume: 0.7, loop: false, category: 'sfx_combat' },
  { key: 'sfx_magic_heal', path: 'audio/sfx/combat/magic_heal.ogg', type: 'sfx', volume: 0.55, loop: false, category: 'sfx_combat' },
  { key: 'sfx_magic_dark', path: 'audio/sfx/combat/magic_dark.ogg', type: 'sfx', volume: 0.65, loop: false, category: 'sfx_combat' },
  { key: 'sfx_arrow_shoot', path: 'audio/sfx/combat/arrow_shoot.ogg', type: 'sfx', volume: 0.55, loop: false, category: 'sfx_combat' },
  { key: 'sfx_arrow_hit', path: 'audio/sfx/combat/arrow_hit.ogg', type: 'sfx', volume: 0.5, loop: false, category: 'sfx_combat' },
  { key: 'sfx_critical_hit', path: 'audio/sfx/combat/critical_hit.ogg', type: 'sfx', volume: 0.8, loop: false, category: 'sfx_combat' },
  { key: 'sfx_guard_block', path: 'audio/sfx/combat/guard_block.ogg', type: 'sfx', volume: 0.6, loop: false, category: 'sfx_combat' },
  { key: 'sfx_guard_break', path: 'audio/sfx/combat/guard_break.ogg', type: 'sfx', volume: 0.75, loop: false, category: 'sfx_combat' },
  { key: 'sfx_dodge_roll', path: 'audio/sfx/combat/dodge_roll.ogg', type: 'sfx', volume: 0.45, loop: false, category: 'sfx_combat' },
  { key: 'sfx_hit_flesh', path: 'audio/sfx/combat/hit_flesh.ogg', type: 'sfx', volume: 0.55, loop: false, category: 'sfx_combat' },
  { key: 'sfx_hit_metal', path: 'audio/sfx/combat/hit_metal.ogg', type: 'sfx', volume: 0.6, loop: false, category: 'sfx_combat' },
  { key: 'sfx_hit_magic', path: 'audio/sfx/combat/hit_magic.ogg', type: 'sfx', volume: 0.55, loop: false, category: 'sfx_combat' },
  { key: 'sfx_skill_activate', path: 'audio/sfx/combat/skill_activate.ogg', type: 'sfx', volume: 0.6, loop: false, category: 'sfx_combat' },
  { key: 'sfx_skill_ultimate', path: 'audio/sfx/combat/skill_ultimate.ogg', type: 'sfx', volume: 0.85, loop: false, category: 'sfx_combat' },
  { key: 'sfx_buff_apply', path: 'audio/sfx/combat/buff_apply.ogg', type: 'sfx', volume: 0.5, loop: false, category: 'sfx_combat' },
  { key: 'sfx_debuff_apply', path: 'audio/sfx/combat/debuff_apply.ogg', type: 'sfx', volume: 0.5, loop: false, category: 'sfx_combat' },
  { key: 'sfx_enemy_death', path: 'audio/sfx/combat/enemy_death.ogg', type: 'sfx', volume: 0.6, loop: false, category: 'sfx_combat' },
  { key: 'sfx_player_death', path: 'audio/sfx/combat/player_death.ogg', type: 'sfx', volume: 0.7, loop: false, category: 'sfx_combat' },
  { key: 'sfx_revive', path: 'audio/sfx/combat/revive.ogg', type: 'sfx', volume: 0.65, loop: false, category: 'sfx_combat' },
];

// ─── SFX UI (15) ────────────────────────────────────────────────
const SFX_UI_ENTRIES: SoundEntry[] = [
  { key: 'sfx_ui_click', path: 'audio/sfx/ui/click.ogg', type: 'sfx', volume: 0.4, loop: false, category: 'sfx_ui' },
  { key: 'sfx_ui_hover', path: 'audio/sfx/ui/hover.ogg', type: 'sfx', volume: 0.2, loop: false, category: 'sfx_ui' },
  { key: 'sfx_ui_open', path: 'audio/sfx/ui/open.ogg', type: 'sfx', volume: 0.45, loop: false, category: 'sfx_ui' },
  { key: 'sfx_ui_close', path: 'audio/sfx/ui/close.ogg', type: 'sfx', volume: 0.4, loop: false, category: 'sfx_ui' },
  { key: 'sfx_ui_confirm', path: 'audio/sfx/ui/confirm.ogg', type: 'sfx', volume: 0.5, loop: false, category: 'sfx_ui' },
  { key: 'sfx_ui_cancel', path: 'audio/sfx/ui/cancel.ogg', type: 'sfx', volume: 0.4, loop: false, category: 'sfx_ui' },
  { key: 'sfx_ui_error', path: 'audio/sfx/ui/error.ogg', type: 'sfx', volume: 0.5, loop: false, category: 'sfx_ui' },
  { key: 'sfx_ui_level_up', path: 'audio/sfx/ui/level_up.ogg', type: 'sfx', volume: 0.8, loop: false, category: 'sfx_ui' },
  { key: 'sfx_ui_achievement', path: 'audio/sfx/ui/achievement.ogg', type: 'sfx', volume: 0.75, loop: false, category: 'sfx_ui' },
  { key: 'sfx_ui_quest_accept', path: 'audio/sfx/ui/quest_accept.ogg', type: 'sfx', volume: 0.6, loop: false, category: 'sfx_ui' },
  { key: 'sfx_ui_quest_complete', path: 'audio/sfx/ui/quest_complete.ogg', type: 'sfx', volume: 0.7, loop: false, category: 'sfx_ui' },
  { key: 'sfx_ui_item_pickup', path: 'audio/sfx/ui/item_pickup.ogg', type: 'sfx', volume: 0.5, loop: false, category: 'sfx_ui' },
  { key: 'sfx_ui_item_equip', path: 'audio/sfx/ui/item_equip.ogg', type: 'sfx', volume: 0.5, loop: false, category: 'sfx_ui' },
  { key: 'sfx_ui_gold_gain', path: 'audio/sfx/ui/gold_gain.ogg', type: 'sfx', volume: 0.45, loop: false, category: 'sfx_ui' },
  { key: 'sfx_ui_notification', path: 'audio/sfx/ui/notification.ogg', type: 'sfx', volume: 0.55, loop: false, category: 'sfx_ui' },
];

// ─── SFX 시스템 (10) ────────────────────────────────────────────
const SFX_SYSTEM_ENTRIES: SoundEntry[] = [
  { key: 'sfx_sys_login', path: 'audio/sfx/system/login.ogg', type: 'sfx', volume: 0.6, loop: false, category: 'sfx_system' },
  { key: 'sfx_sys_logout', path: 'audio/sfx/system/logout.ogg', type: 'sfx', volume: 0.5, loop: false, category: 'sfx_system' },
  { key: 'sfx_sys_mail_arrive', path: 'audio/sfx/system/mail_arrive.ogg', type: 'sfx', volume: 0.55, loop: false, category: 'sfx_system' },
  { key: 'sfx_sys_party_invite', path: 'audio/sfx/system/party_invite.ogg', type: 'sfx', volume: 0.6, loop: false, category: 'sfx_system' },
  { key: 'sfx_sys_party_join', path: 'audio/sfx/system/party_join.ogg', type: 'sfx', volume: 0.5, loop: false, category: 'sfx_system' },
  { key: 'sfx_sys_guild_notice', path: 'audio/sfx/system/guild_notice.ogg', type: 'sfx', volume: 0.55, loop: false, category: 'sfx_system' },
  { key: 'sfx_sys_trade_request', path: 'audio/sfx/system/trade_request.ogg', type: 'sfx', volume: 0.55, loop: false, category: 'sfx_system' },
  { key: 'sfx_sys_chat_whisper', path: 'audio/sfx/system/chat_whisper.ogg', type: 'sfx', volume: 0.4, loop: false, category: 'sfx_system' },
  { key: 'sfx_sys_screenshot', path: 'audio/sfx/system/screenshot.ogg', type: 'sfx', volume: 0.5, loop: false, category: 'sfx_system' },
  { key: 'sfx_sys_server_message', path: 'audio/sfx/system/server_message.ogg', type: 'sfx', volume: 0.6, loop: false, category: 'sfx_system' },
];

// ─── 환경음 (15) ────────────────────────────────────────────────
const AMBIENT_ENTRIES: SoundEntry[] = [
  { key: 'amb_forest_day', path: 'audio/ambient/forest_day.ogg', type: 'ambient', volume: 0.35, loop: true, category: 'ambient' },
  { key: 'amb_forest_night', path: 'audio/ambient/forest_night.ogg', type: 'ambient', volume: 0.3, loop: true, category: 'ambient' },
  { key: 'amb_ocean_waves', path: 'audio/ambient/ocean_waves.ogg', type: 'ambient', volume: 0.4, loop: true, category: 'ambient' },
  { key: 'amb_river_stream', path: 'audio/ambient/river_stream.ogg', type: 'ambient', volume: 0.35, loop: true, category: 'ambient' },
  { key: 'amb_cave_drip', path: 'audio/ambient/cave_drip.ogg', type: 'ambient', volume: 0.3, loop: true, category: 'ambient' },
  { key: 'amb_cave_wind', path: 'audio/ambient/cave_wind.ogg', type: 'ambient', volume: 0.25, loop: true, category: 'ambient' },
  { key: 'amb_rain_light', path: 'audio/ambient/rain_light.ogg', type: 'ambient', volume: 0.4, loop: true, category: 'ambient' },
  { key: 'amb_rain_heavy', path: 'audio/ambient/rain_heavy.ogg', type: 'ambient', volume: 0.5, loop: true, category: 'ambient' },
  { key: 'amb_snow_wind', path: 'audio/ambient/snow_wind.ogg', type: 'ambient', volume: 0.3, loop: true, category: 'ambient' },
  { key: 'amb_volcano_rumble', path: 'audio/ambient/volcano_rumble.ogg', type: 'ambient', volume: 0.45, loop: true, category: 'ambient' },
  { key: 'amb_city_crowd', path: 'audio/ambient/city_crowd.ogg', type: 'ambient', volume: 0.3, loop: true, category: 'ambient' },
  { key: 'amb_market_bustle', path: 'audio/ambient/market_bustle.ogg', type: 'ambient', volume: 0.35, loop: true, category: 'ambient' },
  { key: 'amb_dungeon_eerie', path: 'audio/ambient/dungeon_eerie.ogg', type: 'ambient', volume: 0.25, loop: true, category: 'ambient' },
  { key: 'amb_ether_hum', path: 'audio/ambient/ether_hum.ogg', type: 'ambient', volume: 0.2, loop: true, category: 'ambient' },
  { key: 'amb_clockwork_tick', path: 'audio/ambient/clockwork_tick.ogg', type: 'ambient', volume: 0.3, loop: true, category: 'ambient' },
];

// ─── 보이스 (20) ────────────────────────────────────────────────
const VOICE_ENTRIES: SoundEntry[] = [
  // NPC 인사 (10)
  { key: 'voice_npc_erien_greet', path: 'audio/voice/npc/erien_greet.ogg', type: 'voice', volume: 0.7, loop: false, category: 'voice_npc' },
  { key: 'voice_npc_nuariel_greet', path: 'audio/voice/npc/nuariel_greet.ogg', type: 'voice', volume: 0.7, loop: false, category: 'voice_npc' },
  { key: 'voice_npc_kael_greet', path: 'audio/voice/npc/kael_greet.ogg', type: 'voice', volume: 0.65, loop: false, category: 'voice_npc' },
  { key: 'voice_npc_merchant_greet', path: 'audio/voice/npc/merchant_greet.ogg', type: 'voice', volume: 0.6, loop: false, category: 'voice_npc' },
  { key: 'voice_npc_guard_greet', path: 'audio/voice/npc/guard_greet.ogg', type: 'voice', volume: 0.6, loop: false, category: 'voice_npc' },
  { key: 'voice_npc_elder_greet', path: 'audio/voice/npc/elder_greet.ogg', type: 'voice', volume: 0.65, loop: false, category: 'voice_npc' },
  { key: 'voice_npc_blacksmith_greet', path: 'audio/voice/npc/blacksmith_greet.ogg', type: 'voice', volume: 0.6, loop: false, category: 'voice_npc' },
  { key: 'voice_npc_innkeeper_greet', path: 'audio/voice/npc/innkeeper_greet.ogg', type: 'voice', volume: 0.6, loop: false, category: 'voice_npc' },
  { key: 'voice_npc_quest_giver_greet', path: 'audio/voice/npc/quest_giver_greet.ogg', type: 'voice', volume: 0.65, loop: false, category: 'voice_npc' },
  { key: 'voice_npc_mysterious_greet', path: 'audio/voice/npc/mysterious_greet.ogg', type: 'voice', volume: 0.55, loop: false, category: 'voice_npc' },
  // 전투 보이스 (10)
  { key: 'voice_combat_attack_1', path: 'audio/voice/combat/attack_1.ogg', type: 'voice', volume: 0.6, loop: false, category: 'voice_combat' },
  { key: 'voice_combat_attack_2', path: 'audio/voice/combat/attack_2.ogg', type: 'voice', volume: 0.6, loop: false, category: 'voice_combat' },
  { key: 'voice_combat_skill_cast', path: 'audio/voice/combat/skill_cast.ogg', type: 'voice', volume: 0.65, loop: false, category: 'voice_combat' },
  { key: 'voice_combat_ultimate', path: 'audio/voice/combat/ultimate.ogg', type: 'voice', volume: 0.75, loop: false, category: 'voice_combat' },
  { key: 'voice_combat_hit_1', path: 'audio/voice/combat/hit_1.ogg', type: 'voice', volume: 0.55, loop: false, category: 'voice_combat' },
  { key: 'voice_combat_hit_2', path: 'audio/voice/combat/hit_2.ogg', type: 'voice', volume: 0.55, loop: false, category: 'voice_combat' },
  { key: 'voice_combat_critical', path: 'audio/voice/combat/critical.ogg', type: 'voice', volume: 0.7, loop: false, category: 'voice_combat' },
  { key: 'voice_combat_dodge', path: 'audio/voice/combat/dodge.ogg', type: 'voice', volume: 0.5, loop: false, category: 'voice_combat' },
  { key: 'voice_combat_death', path: 'audio/voice/combat/death.ogg', type: 'voice', volume: 0.65, loop: false, category: 'voice_combat' },
  { key: 'voice_combat_victory', path: 'audio/voice/combat/victory.ogg', type: 'voice', volume: 0.7, loop: false, category: 'voice_combat' },
];

// ─── 전체 매니페스트 (100개) ────────────────────────────────────
export const SOUND_MANIFEST: ReadonlyArray<SoundEntry> = [
  ...BGM_ENTRIES,
  ...SFX_COMBAT_ENTRIES,
  ...SFX_UI_ENTRIES,
  ...SFX_SYSTEM_ENTRIES,
  ...AMBIENT_ENTRIES,
  ...VOICE_ENTRIES,
] as const;

/** 키 기반 빠른 조회용 Map */
export const SOUND_MAP: ReadonlyMap<string, SoundEntry> = new Map(
  SOUND_MANIFEST.map((entry) => [entry.key, entry])
);

/** 카테고리별 필터 헬퍼 */
export function getSoundsByCategory(category: SoundCategory): SoundEntry[] {
  return SOUND_MANIFEST.filter((e) => e.category === category);
}

/** 타입별 필터 헬퍼 */
export function getSoundsByType(type: SoundType): SoundEntry[] {
  return SOUND_MANIFEST.filter((e) => e.type === type);
}
