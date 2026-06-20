# Sprite Production Roadmap

## Phase 1: Field NPC Pilot

| Priority | ID | Region | Source | Runtime |
|----------|----|--------|--------|---------|
| 1 | `npc_ghost_merchant_gorodi` | Erebos | `assets/source/aseprite/npc/erebos/npc_ghost_merchant_gorodi.aseprite` | `npc_ghost_merchant_gorodi_sprite` |

Exit criteria:

- Aseprite source exists.
- `idle_D` and `talk_D` tags validate.
- PNG/JSON export validation passes.
- Field scene shows the sprite.
- NPC dialogue remains functional.

Current QA state:

- `npc_ghost_merchant_gorodi` is `in-game-verified` as of 2026-06-12.
- Browser QA confirmed `npc_ghost_merchant_gorodi_sprite` loads as a 6-frame spritesheet and renders frame `0` at `64x64`.
- `pointerdown` dialogue wiring still opens `npc_ghost_merchant` with speaker `유령 상인 고로디`.

## Phase 2: Core Town NPCs

| Priority | ID | Existing Concept | Runtime Key |
|----------|----|------------------|-------------|
| 2 | `npc_elder_mateus` | `04_mateus_sprite` | `npc_elder_mateus_sprite` |
| 3 | `npc_merchant_mira` | `20_mira_sprite` | `npc_merchant_mira_sprite` |
| 4 | `npc_blacksmith_kalen` | `19_kalen_sprite` | `npc_blacksmith_kalen_sprite` |
| 5 | `npc_memory_fragment_board` | `18_memory_fragment_sprite` | `npc_memory_fragment_board_sprite` |
| 6 | `npc_guild_hashir` | `13_hashir_sprite` | `npc_guild_hashir_sprite` |

Production rule:

- Each NPC uses a 384x64 sheet with six 64x64 frames.
- Tags are `idle_D` frames 0-3 and `talk_D` frames 4-5.
- Source files live under `assets/source/aseprite/npc/{region}`.

Current QA state:

- `npc_elder_mateus`, `npc_merchant_mira`, `npc_blacksmith_kalen`, `npc_memory_fragment_board`, and `npc_guild_hashir` are `in-game-verified` as of 2026-06-12.
- Browser QA confirmed all five runtime textures load as 6-frame spritesheets with frame `0` at `64x64`.
- `LobbyScene` maps `elder`, `merchant`, `blacksmith`, `quest_board`, and `party_recruit` through `spriteResourceManifest` before legacy PNG fallback.
- `pointerdown` dialogue wiring opens the expected panels for `장로 마테우스`, `상인 미라`, `대장장이 칼렌`, `기억의 게시판`, and `모험가 길드`.

## Phase 3: Player Class Completion

The player class full-motion set now covers all six base classes: `char_ether_knight_base`, `char_memory_weaver_base`, `char_shadow_weaver_base`, `char_memory_breaker_base`, `char_time_guardian_base`, and `char_void_wanderer_base`.

Exit criteria:

- `idle`, `walk`, `attack_melee`, `cast`, `hit`, `death`, `ready`, and `victory` tags validate for every production direction.
- Runtime atlases are `2560x320`, `200` frames, `5` directions, and `40` motion tags.
- Browser QA covers `BattleScene` and `GameScene` for each promoted class.

Current QA state:

- 2026-06-20: all six base classes are roster `phase: full`, `status: published`.
- `assets/generated/characters/sprites` and `client/public/assets/generated/characters/sprites` contain matching `2560x320` PNG sheets and `200`-sprite runtime JSON atlases.

## Phase 4: Monster And VFX Pilots

Monster pilots:

- `mon_erebos_fog_rat_normal`
- `mon_erebos_memory_beetle_normal`
- `mon_erebos_memory_dust_normal`

VFX pilot:

- `vfx_hit_slash`

Exit criteria:

- Monster has `idle`, `attack`, `hit`, `death`.
- VFX has `start`, `loop`, `end`.
- Runtime frame naming matches Phaser animation config before publish.

Current QA state:

- `mon_erebos_fog_rat_normal`, `mon_erebos_memory_beetle_normal`, and `mon_erebos_memory_dust_normal` are `in-game-verified` as of 2026-06-12.
- Each monster Aseprite export produces a `768x64` sheet with twelve `64x64` frames.
- Required monster tags are `idle` frames 0-3, `attack` frames 4-7, `hit` frames 8-9, and `death` frames 10-11.
- `GameScene` and `BattleScene` map monster ids `mon_erebos_fog_rat`, `mon_erebos_memory_beetle`, and `mon_erebos_memory_dust` through `spriteResourceManifest` before procedural or legacy fallback.
- Browser QA confirmed `mon_erebos_fog_rat_normal_sprite`, `mon_erebos_memory_beetle_normal_sprite`, and `mon_erebos_memory_dust_normal_sprite` load as 12-frame spritesheets and render enemy frame `0` in field/combat scenes.
- `vfx_hit_slash` is `in-game-verified` as of 2026-06-12.
- Aseprite export produced a `512x64` sheet with eight `64x64` frames.
- Required VFX tags are `start` frames 0-1, `loop` frames 2-5, and `end` frames 6-7.
- `BattleScene` maps `vfx_hit_slash` through `spriteResourceManifest` before procedural hit-circle fallback.
- Browser QA confirmed `_showHitVFX()` creates a `vfx_hit_slash_sprite` animation instance at `108.8x108.8` display scale.

## Phase 5: Worldmap UI Icons

Worldmap icon pilots:

- `zone_aether_plains`
- `zone_memory_forest`
- `zone_malatus_sanctuary`
- `zone_shadow_gorge`
- `zone_crystal_cave`
- `zone_forgotten_citadel`
- `zone_chrono_spire`

Exit criteria:

- Each icon has an Aseprite source under `assets/source/aseprite/worldmap`.
- Aseprite export produces a single `64x64` PNG and normalized JSON.
- `WorldScene` loads icons through `spriteResourceManifest` before the legacy path fallback.
- Browser QA confirms all seven zone textures exist and render on the world map.

Current QA state:

- Seven worldmap icons are `in-game-verified` as of 2026-06-12.
- Each export produces a single `64x64` frame with no required animation tags.
- Browser QA confirmed all seven textures load at `64x64`, render as worldmap node images, and open the selected zone panel.
- QA note: selecting `malatus_sanctuary` still receives a non-asset `/api/world/zones/silvanhome_sanctum/encounter` 500 response; this is outside the icon replacement path.

## Phase 6: Battle Skill Icons

Ether Knight skill icon pilots:

- `skill_ek_slash_icon`
- `skill_ek_shield_icon`
- `skill_ek_charge_icon`
- `skill_ek_explode_icon`
- `skill_ek_passive_icon`
- `skill_ek_ultimate_icon`

Additional class skill icon pilots:

- Memory Weaver: `skill_mw_arrow_icon`, `skill_mw_bolt_icon`, `skill_mw_heal_icon`, `skill_mw_storm_icon`, `skill_mw_passive_icon`, `skill_mw_ultimate_icon`
- Shadow Weaver: `skill_sw_stab_icon`, `skill_sw_vital_icon`, `skill_sw_smoke_icon`, `skill_sw_explosion_icon`, `skill_sw_passive_icon`, `skill_sw_ultimate_icon`
- Memory Breaker: `skill_mb_shatter_icon`, `skill_mb_ground_icon`, `skill_mb_rage_icon`, `skill_mb_storm_icon`, `skill_mb_passive_icon`, `skill_mb_ultimate_icon`

Exit criteria:

- Each icon has an Aseprite source under `assets/source/aseprite/skillIcon/{class_id}`.
- Aseprite export produces a single `64x64` PNG and normalized JSON.
- `BattleScene` preloads icons through `spriteResourceManifest`.
- `BattleUI` renders the image icon before the text-only fallback.
- Browser QA confirms each class slot icon is loaded and visible in the battle HUD.

Current QA state:

- Six Ether Knight skill icons are `in-game-verified` as of 2026-06-12.
- Each export produces a single `64x64` frame with no required animation tags.
- Browser QA confirmed all six textures load at `64x64` and render as visible `30x30` HUD slot images in `BattleScene`.
- Memory Weaver, Shadow Weaver, and Memory Breaker skill icons are `in-game-verified` as of 2026-06-12.
- Browser QA confirmed the additional 18 textures load at `64x64` and render as visible `30x30` HUD slot images in `BattleScene`.
- `spriteResourceManifest.test.ts` now verifies every `classSkills` battle slot icon id resolves to an Aseprite `skillIcon` resource.

## Phase 7: Skill Tree UI Icons

Skill tree icon coverage:

- Ether Knight: reuses `skill_ek_slash_icon`, `skill_ek_shield_icon`, `skill_ek_charge_icon`, `skill_ek_explode_icon`, `skill_ek_ultimate_icon`
- Memory Weaver: reuses `skill_mw_arrow_icon`, `skill_mw_heal_icon`, `skill_mw_storm_icon`, `skill_mw_passive_icon`, `skill_mw_ultimate_icon`
- Shadow Weaver: reuses `skill_sw_stab_icon`, `skill_sw_smoke_icon`, `skill_sw_vital_icon`, `skill_sw_explosion_icon`, `skill_sw_ultimate_icon`
- Memory Breaker: reuses `skill_mb_shatter_icon`, `skill_mb_ground_icon`, `skill_mb_rage_icon`, `skill_mb_storm_icon`, `skill_mb_ultimate_icon`
- Time Guardian: `skill_tg_stop_icon`, `skill_tg_slow_icon`, `skill_tg_haste_icon`, `skill_tg_reverse_icon`, `skill_tg_eternity_icon`
- Void Wanderer: `skill_vw_bullet_icon`, `skill_vw_warp_icon`, `skill_vw_tether_icon`, `skill_vw_rift_icon`, `skill_vw_explosion_icon`

Exit criteria:

- Each non-reused icon has an Aseprite source under `assets/source/aseprite/skillIcon/{class_id}`.
- `LobbyScene` preloads skill tree icon resources before `SkillTreeUI` opens.
- `SkillTreeUI` resolves icons through `skillTreeIcons.ts` and `spriteResourceManifest` before text fallback.
- Browser QA confirms all six classes render five `48x48` image icons in the skill tree.

Current QA state:

- Skill tree icons for all six classes are `in-game-verified` as of 2026-06-12.
- Browser QA confirmed 30 skill tree icon textures load at `64x64` and render as visible `48x48` node images.
- Existing `/api/skills/*` 500 responses still fall back to local default skill tree data; this is outside the Aseprite icon replacement path.

## Phase 8: Battle Status Effect Icons And Legacy Status Runtime Library

Status effect icon coverage:

- Debuff/DoT: `status_poison_icon`, `status_burn_icon`, `status_silence_icon`, `status_slow_icon`, `status_blind_icon`, `status_bleed_icon`, `status_curse_icon`, `status_charm_icon`
- Control: `status_freeze_icon`, `status_stun_icon`
- Buff: `status_attack_up_icon`, `status_defense_up_icon`, `status_haste_icon`, `status_regen_icon`, `status_shield_icon`
- Legacy runtime: `STS-BUF-001~005`, `STS-DBF-001~020`

Exit criteria:

- Each icon has an Aseprite source under `assets/source/aseprite/statusIcon/{debuff|control|buff|legacy_buff|legacy_debuff}`.
- Aseprite export produces a single `32x32` PNG and normalized JSON.
- `BattleScene` preloads all status icon resources before combat starts.
- `StatusEffectRenderer` renders Aseprite image icons before the procedural Graphics fallback.
- `AssetManager` preloads the full status icon folder through `statusIconSpecs.ts` without stale `STS-CC` requests.
- Browser or HTTP QA confirms all 40 status icon PNGs load without request failures.

Current QA state:

- Status icon runtime library is `in-game-verified` as of 2026-06-12.
- 40 `statusIcon` runtime PNGs are generated from Aseprite sources: 15 battle status icons plus 25 legacy `STS-*` icons.
- Each export produces a single `32x32` frame with no required animation tags.
- Folder-wide local scan confirms every status icon is `32x32` and no runtime status PNG is missing a roster entry.
- `sprite-production-roster.json` now tracks 1748 total sprite production entries, including 40 `statusIcon` entries.
- `StatusEffectRenderer` preserves SSOT category color as a thin Phaser Graphics border while replacing the core icon art with Aseprite PNG resources.

## Phase 9: UI Item Icons

Item icon coverage:

- Weapon: `ITM-WPN-001` through `ITM-WPN-020`
- Armor: `ITM-ARM-001` through `ITM-ARM-020`
- Accessory: `ITM-ACC-001` through `ITM-ACC-015`
- Consumable: `ITM-CON-001` through `ITM-CON-020`
- Material: `ITM-MAT-001` through `ITM-MAT-015`
- Quest: `ITM-QST-001` through `ITM-QST-010`

Exit criteria:

- Each icon has an Aseprite source under `assets/source/aseprite/itemIcon/{weapon|armor|accessory|consumable|material|quest}`.
- Aseprite export produces a single `64x64` PNG and normalized JSON.
- `AssetManager` preloads item icons from `itemIconSpecs.ts` instead of hard-coded legacy prefix loops.
- `spriteResourceManifest` resolves every item icon by `itemIconId` for future inventory/shop UI migration.
- Browser QA confirms all 100 item icon textures load at `64x64` with no stale `ITM-CSM`, `ITM-SHD`, or `STS-CC` preload requests.

Current QA state:

- All 100 item icons are generated from Aseprite sources as of 2026-06-12.
- Source, generated PNG, normalized JSON, raw Aseprite JSON, and runtime PNG counts are each 100.
- `sprite-production-roster.json` tracks the full item icon set as `in-game-verified` candidates with priorities 67 through 166.
- Browser QA confirmed `LoadingScene` is registered, all 100 item textures load at `64x64`, and item/status icon request failures are 0.
- `ZoneTeleportManager` now passes `nextScene`/`nextSceneData` into `LoadingScene`, keeping the AssetManager preload route active during zone transitions.

## Phase 10: Environment Backgrounds And Ground Tiles

Runtime scene background coverage:

- Main menu: `ERB-BG-SKY-DUSK`, `ERB-BG-MID-DUSK`
- Lobby: `SYL-BG-FAR-DAY`, `SYL-BG-MID-DAY`
- Loading: `ABY-BG-FAR-NIGHT`
- Dungeon and dungeon battle fallback: `DUNGEON-BG-FAR`

Zone background coverage:

- Aether Plains / Erebos: `ERB-BG-FAR-DAY`, `ERB-BG-SKY-DAY`
- Memory Forest / Sylvanhome: `SYL-BG-FAR-DAY`, `SYL-BG-SKY-DAY`
- Temple / Malatus Sanctuary: `TEM-BG-FAR-DAY`, `TEM-BG-SKY-DAY`
- Abyssal field: `ABY-BG-FAR-DAY`, `ABY-BG-SKY-DAY`
- Northern field: `NOR-BG-FAR-DAY`, `NOR-BG-SKY-DAY`
- Argent field: `ARG-BG-FAR-DAY`, `ARG-BG-SKY-DAY`
- Bright field: `BRI-BG-FAR-DAY`, `BRI-BG-SKY-DAY`

Ground tile coverage:

- Runtime zone tiles: `aether_ground_tile`, `ERB-G-01`, `SYL-G-01`, `SOL-G-01`, `NTH-G-01`, `ARG-G-01`, `ABY-G-01`, `BRT-G-01`, `OBL-G-01`, `TMP-G-01`, `FOG-G-01`
- Region tile variants: `ABY/ARG/BRT/ERB/FOG/NTH/OBL/SOL/SYL/TMP-G-##`
- Legacy ground tile aliases: `aby/arg/bri/erb/nor/obl/sol/syl/tem_ground_tile`

Folder-wide coverage:

- Backgrounds: all 119 PNGs in `client/public/assets/generated/environment/backgrounds`
- Tiles: all 96 PNGs in `client/public/assets/generated/environment/tiles`

Exit criteria:

- Each background has an Aseprite source under `assets/source/aseprite/environmentBackground/{region}`.
- Each ground tile has an Aseprite source under `assets/source/aseprite/environmentTile/{region}`.
- Aseprite export produces normalized JSON plus runtime PNGs at `1280x720` for backgrounds and `256x256` for tiles.
- `sprite-production-roster.json` tracks all environment backgrounds and tiles with `environmentBackgroundId` or `environmentTileId`.
- Unit tests verify runtime files, dimensions, and roster coverage for `resolveZoneBackground`, `ZONE_ENV_CONFIG`, and the full environment background/tile folders.
- Browser QA confirms every environment texture loads in Phaser without request failures.

Current QA state:

- 119 environment backgrounds and 96 ground tiles are generated from Aseprite sources as of 2026-06-12.
- `sprite-production-roster.json` tracks 215 environment entries across `environmentBackground` and `environmentTile`.
- Folder-wide environment asset scan confirms every background is `1280x720`, every tile is `256x256`, and no environment PNG is missing a roster entry.

## Phase 11: Generic Skill Icon Library

Skill icon folder-wide coverage:

- Named gameplay icons: 34 class/skill-tree icons from Phases 6 and 7.
- AssetManager common preload icons: `CMN-SKL-001` through `CMN-SKL-210`.
- Legacy class skill library icons: `SKL-ETH-001` through `SKL-ETH-030`, `SKL-MNE-001` through `SKL-MNE-030`, `SKL-SHA-001` through `SKL-SHA-030`, `SKL-MEM-001` through `SKL-MEM-030`, `SKL-TIM-001` through `SKL-TIM-030`, and `SKL-VOI-001` through `SKL-VOI-030`.

Exit criteria:

- Each icon has an Aseprite source under `assets/source/aseprite/skillIcon/{class_or_common}`.
- Aseprite export produces a single `64x64` PNG and normalized JSON for every icon.
- Runtime PNGs in `client/public/assets/generated/ui/icons/skills` are all `64x64`.
- `sprite-production-roster.json` tracks every runtime skill icon with `category: skillIcon` and `skillIconId`.
- `AssetManager` keeps the `CMN-SKL-001~210` preload key/path contract unchanged.
- Browser QA confirms every skill icon texture in the runtime folder loads in Phaser without request failures.

Current QA state:

- 424 runtime skill icons are generated from Aseprite sources as of 2026-06-12.
- `sprite-production-roster.json` tracks 424 `skillIcon` entries.
- Folder-wide skill icon scan confirms every runtime skill icon is `64x64` and no PNG is missing a roster entry.

## Phase 12: Monster Single-Frame Runtime Library

Runtime monster image coverage:

- `normal`: all 120 PNGs in `client/public/assets/generated/monsters/normal`
- `battle`: all 120 PNGs in `client/public/assets/generated/monsters/battle`

Production rule:

- `monsterPortrait` sources live under `assets/source/aseprite/monsterPortrait/{region}` and export to `256x256` single-frame PNGs.
- `monsterBattleIcon` sources live under `assets/source/aseprite/monsterBattleIcon/{region}` and export to `64x64` single-frame PNGs.
- Both categories are tagless and do not replace the animated `monster` category used by the Erebos starting trio.
- `npm run art:monster:images` rebuilds source `.aseprite`, Aseprite export PNG/JSON, runtime PNGs, and `sprite-production-roster.json` entries from the current normal monster ID set.

Exit criteria:

- Runtime `normal` and `battle` folders contain the same monster ID set.
- Every `normal` PNG is `256x256`; every `battle` PNG is `64x64`.
- `sprite-production-roster.json` tracks every runtime PNG with `monsterPortraitId` or `monsterBattleIconId`.
- Unit tests verify folder-wide counts, dimensions, roster coverage, and ID parity.
- Browser QA confirms all 240 textures load in Phaser without request failures.

Current QA state:

- 120 `monsterPortrait` and 120 `monsterBattleIcon` assets are generated from Aseprite sources as of 2026-06-12.
- Folder-wide local scan confirms `normal` is fully `256x256` and `battle` is fully `64x64`.
- `sprite-production-roster.json` now tracks 1011 total sprite production entries, including 240 single-frame monster image entries.

## Phase 13: Monster Boss Single-Frame Runtime Library

Runtime boss image coverage:

- `elite_boss`: all 70 PNGs in `client/public/assets/generated/monsters/elite_boss`
- `raid_boss`: all 38 PNGs in `client/public/assets/generated/monsters/raid_boss`

Production rule:

- `monsterEliteBossPortrait` sources live under `assets/source/aseprite/monsterEliteBossPortrait/{region}` and export to `384x384` single-frame PNGs.
- `monsterRaidBossPortrait` sources live under `assets/source/aseprite/monsterRaidBossPortrait/{region}` and export to `512x512` single-frame PNGs.
- Both categories are tagless and remain separate from normal monster portraits and animated monster spritesheets.
- `npm run art:monster:boss-images` rebuilds source `.aseprite`, Aseprite export PNG/JSON, runtime PNGs, and `sprite-production-roster.json` entries from the current boss runtime folders.

Exit criteria:

- Every `elite_boss` PNG is `384x384`; every `raid_boss` PNG is `512x512`.
- `sprite-production-roster.json` tracks every runtime PNG with `monsterEliteBossId` or `monsterRaidBossId`.
- Unit tests verify folder-wide counts, dimensions, and roster coverage.
- Browser QA confirms all 108 boss textures load in Phaser without request failures.

Current QA state:

- 70 `monsterEliteBossPortrait` and 38 `monsterRaidBossPortrait` assets are generated from Aseprite sources as of 2026-06-12.
- Folder-wide local scan confirms `elite_boss` is fully `384x384` and `raid_boss` is fully `512x512`.
- `sprite-production-roster.json` now tracks 1119 total sprite production entries, including 108 boss single-frame monster image entries.

## Phase 14: UI Frame Runtime Library

Runtime UI frame coverage:

- Button frames: `UI-BTN-001~006` across `DEF`, `DAR`, and `SEA`
- HUD frames: `UI-HUD-001~008` across `DEF`, `DAR`, and `SEA`
- Inventory frames: `UI-INV-001~006` across `DEF`, `DAR`, and `SEA`
- Settings frames: `UI-SET-001~004` across `DEF`, `DAR`, and `SEA`
- Shop frames: `UI-SHP-001~006` across `DEF`, `DAR`, and `SEA`

Production rule:

- `uiFrame` sources live under `assets/source/aseprite/uiFrame/{theme}/{family}` and export to `512x512` single-frame PNGs.
- `npm run art:ui:frames` rebuilds source `.aseprite`, Aseprite export PNG/JSON, runtime PNGs, and `sprite-production-roster.json` entries from the current UI frame runtime folder.

Exit criteria:

- Runtime `ui/frames` contains 90 PNGs.
- Every UI frame PNG is `512x512`.
- `sprite-production-roster.json` tracks every runtime PNG with `uiFrameId`.
- Unit tests verify folder-wide counts, dimensions, roster coverage, and BattleUI skill slot integration.
- Browser QA confirms all 90 UI frame textures load in Phaser without request failures.

Current QA state:

- 90 `uiFrame` assets are generated from Aseprite sources as of 2026-06-12.
- Folder-wide local scan confirms every runtime UI frame is `512x512`.
- `sprite-production-roster.json` now tracks 1209 total sprite production entries, including 90 UI frame entries.
- `BattleScene.preload()` now loads `UI-BTN-001-DEF` as the battle skill slot frame and `BattleUI` renders it before the procedural rectangle fallback.
- `LobbyScene.preload()` now loads `UI-HUD-002-DEF` as the lobby minimap frame and `_drawMinimap()` renders it before the procedural rectangle fallback.

## Phase 15: Environment Object Runtime Library

Runtime environment object coverage:

- Aether/Erebos field props: `aether_tree_01`, `aether_rock_01`, `aether_crystal_01`, `erb_ruin_pillar`, `erb_fog_lantern`, `erb_dead_tree`
- Sylvanheim/Solaris/Boreal props: `syl_ancient_tree`, `syl_mushroom_cluster`, `syl_flower_bed`, `sol_cactus`, `sol_sand_rock`, `sol_crystal_cluster`, `nor_ice_pillar`, `nor_snow_tree`, `nor_frozen_rock`
- Argentium/Abyss/Britalia props: `arg_gear_post`, `arg_steam_vent`, `arg_crate_stack`, `aby_void_crystal`, `aby_stalactite`, `aby_glowing_moss`, `bri_barrel`, `bri_anchor`, `bri_fishing_net`
- Oblivion/Chrono/Fog props: `obl_cracked_stone`, `obl_memory_wisp`, `tem_time_shard`, `tem_broken_clock`, `fog_ghost_lantern`, `fog_driftwood`

Production rule:

- `environmentObject` sources live under `assets/source/aseprite/environmentObject/{region}` and export to `256x256` transparent single-frame PNGs.
- `npm run art:environment:objects` rebuilds source `.aseprite`, Aseprite export PNG/JSON, runtime PNGs, and `sprite-production-roster.json` entries from the current environment object runtime folder.

Exit criteria:

- Runtime `environment/objects` contains 30 PNGs.
- Every environment object PNG is `256x256`.
- `sprite-production-roster.json` tracks every runtime PNG with `environmentObjectId`.
- Unit tests verify `ZONE_ENV_CONFIG` references, folder-wide counts, dimensions, and roster coverage.
- Browser QA confirms all 30 environment object textures load in Phaser without request failures.

Current QA state:

- 30 `environmentObject` assets are generated from Aseprite sources as of 2026-06-12.
- Folder-wide local scan confirms every runtime environment object is `256x256`.
- `sprite-production-roster.json` now tracks 1239 total sprite production entries, including 30 environment object entries.

## Phase 16: Cosmetic Runtime Library

Runtime cosmetic coverage:

- Season 1: all 50 PNGs in `client/public/assets/generated/cosmetics/season1`
- Season 2: all 50 PNGs in `client/public/assets/generated/cosmetics/season2`
- Season 3: all 50 PNGs in `client/public/assets/generated/cosmetics/season3`

Production rule:

- `cosmetic` sources live under `assets/source/aseprite/cosmetic/season{n}/{kind}` and export to `512x512` transparent single-frame PNGs.
- `npm run art:cosmetics` rebuilds source `.aseprite`, Aseprite export PNG/JSON, runtime PNGs, and `sprite-production-roster.json` entries from the current cosmetic runtime folders.
- `client/src/data/cosmeticAssetSpecs.ts` is the client preload SSOT and must match the runtime folders exactly.

Exit criteria:

- Each season folder contains 50 PNGs.
- Every cosmetic PNG is `512x512`.
- `sprite-production-roster.json` tracks every runtime PNG with `cosmeticId` and `cosmeticSeason`.
- Unit tests verify folder-wide counts, dimensions, roster coverage, and preload SSOT parity.
- Browser QA confirms all 150 cosmetic textures load in Phaser without request failures.

Current QA state:

- 150 `cosmetic` assets are generated from Aseprite sources as of 2026-06-12.
- Folder-wide local scan confirms every runtime cosmetic is `512x512`.
- `sprite-production-roster.json` now tracks 1389 total sprite production entries, including 150 cosmetic entries.
- `AssetManager.preloadCosmetics()` now loads only actual runtime filenames instead of stale `COS-AURA_*` season1 and `COS-ITEM_S*_*` season2/3 requests.

## Phase 17: VFX Runtime Library

Runtime VFX coverage:

- Common VFX: all 30 PNG strips in `client/public/assets/generated/vfx/common`
- Class skill VFX: all 180 PNG strips across `client/public/assets/generated/vfx/skills/{ether_knight,memory_weaver,shadow_weaver,memory_breaker,time_guardian,void_wanderer}`

Production rule:

- `vfx` sources live under `assets/source/aseprite/vfx/library/{common|skills/<class_id>}` and export to `512x64` horizontal strips.
- Each strip contains eight `64x64` frames and must define `start` frames 0-1, `loop` frames 2-5, and `end` frames 6-7.
- `npm run art:vfx:library` rebuilds source `.aseprite`, Aseprite export PNG/JSON, runtime PNGs, and `sprite-production-roster.json` entries from the current VFX runtime folders.
- The existing `vfx_hit_slash` manifest pilot remains separate under `client/public/assets/generated/vfx/sprites`.

Exit criteria:

- Runtime VFX preload folders contain 210 PNG strips.
- Every runtime VFX strip is `512x64`.
- Every generated JSON has eight `64x64` frames and `start`, `loop`, `end` tags.
- `sprite-production-roster.json` tracks every runtime strip with `category: vfx` and `vfxId`.
- Unit tests verify folder-wide counts, dimensions, JSON tags, and roster coverage.
- Browser QA confirms all 210 VFX textures load in Phaser without request failures.

Current QA state:

- 210 VFX runtime strips are generated from Aseprite sources as of 2026-06-12.
- Folder-wide local scan confirms every runtime VFX strip is `512x64`.
- `sprite-production-roster.json` now tracks 1599 total sprite production entries, including 211 `vfx` entries: 210 runtime preload strips plus the existing `vfx_hit_slash` pilot.

## Phase 18: Character Illustration Runtime Library

Runtime character illustration coverage:

- Main class illustrations: all 18 PNGs in `client/public/assets/generated/characters/class_main`
- Advanced class illustrations: all 18 PNGs in `client/public/assets/generated/characters/class_advanced`
- The separate `client/public/assets/generated/characters/class_main/battle` `64x96` thumbnails are tracked in Phase 19.

Production rule:

- `characterIllustration` sources live under `assets/source/aseprite/characterIllustration/{class_main|class_advanced}/{class_id}` and export to `256x384` transparent single-frame PNGs.
- `npm run art:character:illustrations` rebuilds source `.aseprite`, Aseprite export PNG/JSON, runtime PNGs, and `sprite-production-roster.json` entries from the current runtime folders.
- Runtime keys mirror client usage where possible: `char_<class_id>` for main front, `char_illust_<class_id>_side` for main side, and `char_<class_id>_adv<n>` for advanced front.

Exit criteria:

- Runtime character illustration folders contain 36 PNGs.
- Every runtime character illustration is `256x384`.
- Every generated JSON has one `256x384` frame and no required tags.
- `sprite-production-roster.json` tracks every runtime illustration with `category: characterIllustration` and `characterIllustrationId`.
- Unit tests verify folder-wide counts, dimensions, JSON frames, and roster coverage.
- Browser QA confirms all 36 character illustration textures load in Phaser without request failures.

Current QA state:

- 36 `characterIllustration` runtime PNGs are generated from Aseprite sources as of 2026-06-12.
- Folder-wide local scan confirms every runtime character illustration is `256x384`.
- At Phase 18 completion, `sprite-production-roster.json` tracked 1635 total sprite production entries, including 36 `characterIllustration` entries.
- Browser QA confirms all 36 character illustration textures load into Phaser texture manager at `256x384` without character asset request failures.

## Phase 19: Character Battle Thumbnail Runtime Library

Runtime character battle thumbnail coverage:

- Main class battle thumbnails: all 6 PNGs in `client/public/assets/generated/characters/class_main/battle`

Production rule:

- `characterBattleThumbnail` sources live under `assets/source/aseprite/characterBattleThumbnail/class_main/{class_id}` and export to `64x96` transparent single-frame PNGs.
- `npm run art:character:battle-thumbnails` rebuilds source `.aseprite`, Aseprite export PNG/JSON, runtime PNGs, and `sprite-production-roster.json` entries from the current battle thumbnail runtime folder.
- `BattleScene` fallback key `char_battle_<class_id>` loads `assets/generated/characters/class_main/battle/char_battle_<class_id>.png`.

Exit criteria:

- Runtime character battle thumbnail folder contains 6 PNGs.
- Every runtime character battle thumbnail is `64x96`.
- Every generated JSON has one `64x96` frame and no required tags.
- `sprite-production-roster.json` tracks every runtime thumbnail with `category: characterBattleThumbnail` and `characterBattleThumbnailId`.
- Unit tests verify folder-wide counts, dimensions, JSON frames, roster coverage, and `BattleScene` path compatibility.
- Browser QA confirms all 6 character battle thumbnail textures load in Phaser without request failures.

Current QA state:

- 6 `characterBattleThumbnail` runtime PNGs are generated from Aseprite sources as of 2026-06-12.
- Folder-wide local scan confirms every runtime character battle thumbnail is `64x96`.
- `sprite-production-roster.json` now tracks 1641 total sprite production entries, including 6 `characterBattleThumbnail` entries.
- `BattleScene` fallback loading now targets `assets/generated/characters/class_main/battle/char_battle_<class_id>.png` instead of the larger side illustration path.
- Browser QA confirms all 42 character illustration/thumbnail textures load into Phaser texture manager, and BattleScene requests the 6 battle thumbnail PNGs with HTTP 200 and no old side-illustration battle requests.

## Phase 20: NPC Portrait Runtime Library

Runtime NPC portrait coverage:

- NPC portraits: all 40 PNGs in `client/public/assets/generated/characters/npc`

Production rule:

- `npcPortrait` sources live under `assets/source/aseprite/npcPortrait/{npc_id}` and export to `512x512` transparent single-frame PNGs.
- `npm run art:npc:portraits` rebuilds source `.aseprite`, Aseprite export PNG/JSON, runtime PNGs, and `sprite-production-roster.json` entries from the current NPC portrait runtime folder.
- The existing `npc` category remains reserved for 64x64 tagged field NPC animation sprites.

Exit criteria:

- Runtime NPC portrait folder contains 40 PNGs.
- Every runtime NPC portrait is `512x512`.
- Every generated JSON has one `512x512` frame and no required tags.
- `sprite-production-roster.json` tracks every runtime portrait with `category: npcPortrait` and `npcPortraitId`.
- Unit tests verify folder-wide counts, dimensions, JSON frames, and roster coverage.
- Browser QA confirms all 40 NPC portrait textures load in Phaser without request failures.

Current QA state:

- 40 `npcPortrait` runtime PNGs are generated from Aseprite sources as of 2026-06-12.
- Folder-wide local scan confirms every runtime NPC portrait is `512x512`.
- `sprite-production-roster.json` now tracks 1681 total sprite production entries, including 40 `npcPortrait` entries.
- Browser QA confirms all 40 NPC portrait textures load into Phaser texture manager at `512x512` without NPC portrait asset request failures.

## Phase 21: NPC 256x384 Sprite Runtime Library

Runtime NPC sprite coverage:

- NPC sprites: all 40 `256x384` PNGs in `client/public/assets/generated/characters/npc_sprites`

Production rule:

- `npcSprite` sources live under `assets/source/aseprite/npcSprite/{npc_id}` and export to `256x384` transparent single-frame PNGs.
- `npm run art:npc:sprites` rebuilds source `.aseprite`, Aseprite export PNG/JSON, runtime PNGs, and `sprite-production-roster.json` entries from the current NPC sprite runtime folder.
- The `npc_sprites` runtime folder is mixed. The `npcSprite` builder only processes `^[0-9]{2}_.+_sprite.png$` files with `256x384` dimensions.
- Existing `384x64` field NPC animation sheets remain managed by the `npc` category and `spriteResourceManifest`.

Exit criteria:

- Runtime NPC sprite folder contains 40 matching `256x384` PNGs.
- Every generated JSON has one `256x384` frame and no required tags.
- `sprite-production-roster.json` tracks every runtime NPC sprite with `category: npcSprite` and `npcSpriteId`.
- Unit tests verify folder-wide counts, dimensions, JSON frames, and roster coverage.
- Vite HTTP QA confirms all 40 runtime NPC sprite PNGs return `200` with `256x384` PNG headers.
- Browser page asset QA confirms Lobby-observed NPC sprite requests load without console errors.

Current QA state:

- 40 `npcSprite` runtime PNGs are generated from Aseprite sources as of 2026-06-12.
- Folder-wide local scan confirms every runtime NPC sprite is `256x384`.
- `sprite-production-roster.json` now tracks 1721 total sprite production entries, including 40 `npcSprite` entries.
- Vite HTTP QA confirms all 40 NPC sprite files return `200` and parse as `256x384` PNGs.
- Browser page asset QA on `?debugScene=lobby&renderer=canvas` confirms `03_lumina_sprite.png`, `04_mateus_sprite.png`, and the five existing 6-frame field NPC sheets are requested without console errors.
- In-app Browser direct PNG navigation for all 40 was not used because the Browser URL policy blocked direct asset traversal with `ERR_BLOCKED_BY_CLIENT`.

## Phase 22: NPC Battle Thumbnail Runtime Library

Runtime NPC battle thumbnail coverage:

- NPC battle thumbnails: all 2 PNGs in `client/public/assets/generated/characters/npc_battle`

Production rule:

- `npcBattleThumbnail` sources live under `assets/source/aseprite/npcBattleThumbnail/{npc_id}` and export to `64x96` transparent single-frame PNGs.
- `npm run art:npc:battle-thumbnails` rebuilds source `.aseprite`, Aseprite export PNG/JSON, runtime PNGs, and `sprite-production-roster.json` entries from the current NPC battle runtime folder.
- GameScene runtime keys are intentionally different from the filenames: `01_cryo` maps to `npc_merchant_sprite`, and `04_mateus` maps to `npc_guide_sprite`.

Exit criteria:

- Runtime NPC battle folder contains 2 PNGs.
- Every runtime NPC battle thumbnail is `64x96`.
- Every generated JSON has one `64x96` frame and no required tags.
- `sprite-production-roster.json` tracks every runtime NPC battle thumbnail with `category: npcBattleThumbnail` and `npcBattleThumbnailId`.
- Unit tests verify folder-wide counts, dimensions, JSON frames, roster coverage, and GameScene key/path compatibility.
- Browser or HTTP QA confirms both NPC battle thumbnail PNGs load without request failures.

Current QA state:

- 2 `npcBattleThumbnail` runtime PNGs are generated from Aseprite sources as of 2026-06-12.
- Folder-wide local scan confirms every runtime NPC battle thumbnail is `64x96`.
- `sprite-production-roster.json` now tracks 1723 total sprite production entries, including 2 `npcBattleThumbnail` entries.
- Vite HTTP QA confirms both NPC battle thumbnail files return `200` and parse as `64x96` PNGs.

## Phase 23: Character Legacy Sprite Sheet Runtime Library

Runtime character sprite sheet coverage:

- Legacy sprite sheets: all 24 `char_sprite_*_sprite_sheet.png` files in `client/public/assets/generated/characters/sprites`

Production rule:

- `characterSpriteSheet` sources live under `assets/source/aseprite/characterSpriteSheet/{class_id}` and export to `256x384` transparent single-frame PNGs.
- `npm run art:character:sprite-sheets` rebuilds source `.aseprite`, Aseprite export PNG/JSON, runtime PNGs, and `sprite-production-roster.json` entries from the current legacy sprite sheet runtime files.
- The `character` category and `character-sprite-roster.json` remain responsible for animated `char_<class>_base.png/json` sprites.

Exit criteria:

- Runtime `characters/sprites` contains 24 matching legacy `char_sprite_*_sprite_sheet.png` PNGs.
- Every matching legacy PNG is `256x384`.
- Every generated JSON has one `256x384` frame and no required tags.
- `sprite-production-roster.json` tracks every legacy sprite sheet with `category: characterSpriteSheet` and `characterSpriteSheetId`.
- Unit tests verify folder-wide counts, dimensions, JSON frames, and roster coverage.
- Vite HTTP QA confirms all 24 legacy sprite sheet PNGs return `200` with `256x384` PNG headers.

Current QA state:

- 24 `characterSpriteSheet` runtime PNGs are generated from Aseprite sources as of 2026-06-12.
- Folder-wide local scan confirms every legacy character sprite sheet is `256x384`.
- `sprite-production-roster.json` now tracks 1772 total sprite production entries, including 24 `characterSpriteSheet` entries.
- Vite HTTP QA confirms all 24 legacy character sprite sheet files return `200` and parse as `256x384` PNGs.
- In-app Browser QA on `?debugScene=lobby&renderer=canvas` confirms one game canvas renders with no browser console error logs.

## Phase 24: Runtime Atlas Derivative Repacking

Runtime atlas coverage:

- Generated atlas outputs: all 50 `atlas_*.png/json` pairs in `assets/generated/atlas`
- Public atlas runtime: all 50 `atlas_*.png/json` pairs copied to `client/public/assets/atlas`
- Legacy public aliases: `characters.png/json`, `effects.png/json`, and `ui.png/json` are regenerated as Phaser `load.atlas()` compatibility files from Aseprite-derived runtime PNGs.

Production rule:

- Atlas files are derived publish artifacts, not direct Aseprite source files.
- `npm run art:atlas:pack` repacks validated individual Aseprite runtime PNGs from `assets/generated/...` into `assets/generated/atlas/atlas_*.png/json`.
- The same command publishes matching `atlas_*` PNG/JSON files to `client/public/assets/atlas`.
- The same command also refreshes the three core `characters/effects/ui` aliases with TexturePacker JSON, preserving legacy frame keys needed by runtime code such as `EffectManager`.
- The packer fails if any source image does not fit the configured atlas bounds, preventing silent 49/50-style omissions.

Exit criteria:

- `assets/generated/atlas` contains 50 `atlas_*.png/json` pairs.
- `client/public/assets/atlas` contains matching public copies for every generated `atlas_*` pair.
- Every atlas JSON size matches its PNG header dimensions.
- Every atlas JSON count matches its sprite list length.
- Every sprite rectangle is inside the atlas PNG bounds.
- `characters/effects/ui` alias JSON remains Phaser-compatible and keeps its required frame keys.
- Source-backed atlas groups include every expected generated source PNG: status icons, skill icons, item icons, cosmetics, UI frames, VFX, character illustration/sprite-sheet groups, background groups, and tile groups.
- Unit tests verify atlas source count, metadata, bounds, public publish copies, and core alias compatibility.

Current QA state:

- `npm run art:atlas:pack` completes 50 atlas repacks from current Aseprite-generated runtime assets as of 2026-06-12.
- `atlas_icon_status` now includes 40 status icons instead of the legacy 9-sprite subset.
- `atlas_icon_skills` now includes 424 skill icons.
- `atlas_cosmetic_s1`, `atlas_cosmetic_s2`, and `atlas_cosmetic_s3` now include 50 files each instead of 49.
- Monster atlas region matching now uses filename region slugs and `BOSS-*` codes, avoiding the old `NOR` versus `_normal` substring collision.
- `tests/unit/atlasPackerAssets.test.ts`, `tests/unit/asepritePipeline.test.ts`, and `tests/integration/asset-integrity.test.ts` pass with 74 tests.
- Vite HTTP QA confirms all 50 public `atlas_*` PNG/JSON pairs return `200`, PNG signatures are valid, and JSON sizes match PNG headers.
- In-app Browser QA on `?debugScene=lobby&renderer=canvas` confirms one game canvas renders with no browser console error logs after atlas repacking.

## Phase 25: Story CG Runtime Library

Runtime story CG coverage:

- Chapter CGs: `ch1_erebos`, `ch2_sylvanheim`, `ch3_solaris`, `ch4_argentium`, `ch5_plateau`
- Ending and defeat CGs: `defeat_oblivion`, `ending_a_guardian`, `ending_b_witness`, `ending_c_oblivion`, `ending_d_return`
- Runtime paths stay compatible with existing code under `client/public/assets/cg`.

Production rule:

- `storyCg` is a `1216x832` single-frame Aseprite category with no required animation tags.
- `npm run art:story:cg` rebuilds source `.aseprite`, Aseprite export PNG/JSON, runtime PNGs, and `sprite-production-roster.json` entries from the current `client/public/assets/cg` runtime file set.
- Chapter files are sourced under `assets/source/aseprite/storyCg/chapters`; defeat and ending files are sourced under `assets/source/aseprite/storyCg/ending`.
- The runtime publish target remains `client/public/assets/cg` because `GameScene` and `EndingScene` load those paths directly.

Exit criteria:

- All 10 story CG runtime files exist.
- Every story CG runtime PNG is `1216x832`.
- Every story CG has a matching source `.aseprite`, generated PNG, normalized JSON, and roster entry.
- `GameScene` and `EndingScene` still reference the expected runtime paths.
- Unit tests verify runtime file coverage, dimensions, path references, and roster metadata.

Current QA state:

- `npm run art:story:cg` generates all 10 Story CG assets as of 2026-06-12.
- `sprite-production-roster.json` now tracks 1782 total sprite production entries, including 10 `storyCg` entries.
- `tests/unit/storyCgAssets.test.ts`, `tests/unit/runtimeImageRosterCoverage.test.ts`, `tests/unit/runtimeImageReferenceCoverage.test.ts`, `tests/unit/atlasPackerAssets.test.ts`, `tests/unit/asepritePipeline.test.ts`, and `tests/integration/asset-integrity.test.ts` pass with 79 tests.
- Public runtime image coverage now has no uncovered PNG after excluding atlas derivatives and the `assets/generated/aseprite` export mirror; the remaining six `char_<class>_base.png` files are covered by `character-sprite-roster.json`.
- Client source/data image literal coverage now has no missing public files and no unrostered direct image references after excluding atlas derivatives and the Aseprite export mirror.
- Vite HTTP QA confirms all 10 public Story CG PNG files return `200` and parse as `1216x832` PNGs.
- In-app Browser QA on `?debugScene=world&renderer=canvas&zone=aether_plains` confirms one game canvas renders with no browser console error logs after Story CG replacement.

## Phase 26: Fallback Texture Runtime Library

Runtime fallback texture coverage:

- `placeholder`: 64x64 common missing-asset texture.
- `placeholder_sm`: 32x32 compact missing-asset texture.
- Runtime paths live under `client/public/assets/generated/ui/placeholders`.

Production rule:

- `fallbackTexture` is a 64x64 single-frame Aseprite category with no required animation tags.
- `fallbackTextureSmall` is a 32x32 single-frame Aseprite category with no required animation tags.
- `npm run art:fallback:textures` rebuilds source `.aseprite`, Aseprite export PNG/JSON, runtime PNGs, and `sprite-production-roster.json` entries for both placeholder textures.
- `AssetManager.createPlaceholders()` now preloads the Aseprite PNGs first, then creates procedural placeholder textures only if a runtime PNG key is still missing after loader completion.

Exit criteria:

- Both placeholder runtime PNGs exist and match their configured dimensions.
- Both placeholder textures have source `.aseprite`, generated PNG, normalized JSON, and roster entries.
- `AssetManager` references the runtime paths and keeps a procedural safety fallback for load failure.
- Unit tests verify dimensions, JSON frames, roster metadata, and AssetManager path integration.

Current QA state:

- `npm run art:fallback:textures` generates both fallback textures as of 2026-06-12.
- `sprite-production-roster.json` now tracks 1784 total sprite production entries, including 2 fallback texture entries.
- `tests/unit/fallbackTextureAssets.test.ts`, `tests/unit/runtimeImageReferenceCoverage.test.ts`, `tests/unit/runtimeImageRosterCoverage.test.ts`, `tests/unit/storyCgAssets.test.ts`, `tests/unit/atlasPackerAssets.test.ts`, `tests/unit/asepritePipeline.test.ts`, and `tests/integration/asset-integrity.test.ts` pass with 80 tests.
- `npm --prefix client run typecheck` and `npm run build:client` pass after AssetManager integration.
- Vite HTTP QA confirms `placeholder.png` returns `200`; in-app Browser QA confirms the local canvas page boots with no browser error logs.

## Phase 27: Effect Fallback Texture Runtime Library

Runtime effect fallback texture coverage:

- `hit_fallback_slash`: 32x32 hit slash fallback.
- `hit_fallback_blunt`: 32x32 hit blunt fallback.
- `hit_fallback_magic`: 32x32 hit magic fallback.
- `buff_fallback`: 24x24 buff/debuff icon fallback.
- Runtime paths live under `client/public/assets/generated/vfx/fallback`.

Production rule:

- `effectFallbackTexture` is a 32x32 single-frame Aseprite category with no required animation tags.
- `effectFallbackTextureSmall` is a 24x24 single-frame Aseprite category with no required animation tags.
- `npm run art:effect:fallbacks` rebuilds source `.aseprite`, Aseprite export PNG/JSON, runtime PNGs, and `sprite-production-roster.json` entries for the four `EffectManager` fallback textures.
- `BattleScene.preload()` now preloads `EFFECT_FALLBACK_TEXTURES`; `EffectManager.ensureFallbackTextures()` creates procedural fallback only when the Aseprite PNG key is still missing.

Exit criteria:

- All four effect fallback runtime PNGs exist and match their configured dimensions.
- All four effect fallback textures have source `.aseprite`, generated PNG, normalized JSON, and roster entries.
- `BattleScene` references the runtime paths through `EFFECT_FALLBACK_TEXTURES` and keeps a procedural safety fallback through `EffectManager`.
- Unit tests verify dimensions, JSON frames, roster metadata, BattleScene preload integration, and EffectManager fallback path integration.

Current QA state:

- `npm run art:effect:fallbacks` generates all four effect fallback textures as of 2026-06-12.
- `sprite-production-roster.json` now tracks 1788 total sprite production entries, including 4 effect fallback texture entries.
- `npm run art:sprite:roster` passes after the new categories and roster entries.
- `tests/unit/effectFallbackTextureAssets.test.ts`, `tests/unit/fallbackTextureAssets.test.ts`, `tests/unit/runtimeImageReferenceCoverage.test.ts`, `tests/unit/runtimeImageRosterCoverage.test.ts`, `tests/unit/storyCgAssets.test.ts`, `tests/unit/atlasPackerAssets.test.ts`, `tests/unit/asepritePipeline.test.ts`, and `tests/integration/asset-integrity.test.ts` pass with 81 tests.

## Phase 28: Dungeon Monster Preview Aseprite Runtime Wiring

Runtime dungeon monster preview coverage:

- Normal wave preview: `mon_erebos_ruin_skeleton_normal`, `mon_erebos_fog_wolf_normal`, `mon_erebos_memory_ghost_normal`, `mon_erebos_broken_golem_normal`, `mon_erebos_ruin_spider_normal`.
- Boss wave preview: `mon_erebos_memory_absorber_normal`.
- Runtime paths reuse existing `client/public/assets/generated/monsters/battle/<monster-id>.png` `monsterBattleIcon` files.

Production rule:

- No duplicate category is introduced; DungeonScene consumes the existing `monsterBattleIcon` Aseprite runtime library.
- `DungeonScene.preload()` loads `DUNGEON_MONSTER_PREVIEW_TEXTURES` first.
- Normal previews render at `56x56`; boss preview renders at `80x80`.
- The old `dmon_*` generateTexture rectangle and emoji marker remain only as a safety fallback when an Aseprite preview texture is missing.

Exit criteria:

- All six DungeonScene preview monster PNGs exist in the `monsterBattleIcon` runtime folder.
- All six PNGs are covered by `sprite-production-roster.json` with `category: monsterBattleIcon`.
- DungeonScene preload and render paths use the Aseprite texture keys before procedural fallback.
- Unit tests verify runtime PNG dimensions, roster metadata, and DungeonScene source wiring.

Current QA state:

- The six DungeonScene preview IDs are already present in the Aseprite `monsterBattleIcon` runtime library as of 2026-06-12.
- `tests/unit/dungeonMonsterPreviewAssets.test.ts`, `tests/unit/runtimeImageReferenceCoverage.test.ts`, `tests/unit/runtimeImageRosterCoverage.test.ts`, `tests/unit/monsterImageAssets.test.ts`, and `tests/unit/asepritePipeline.test.ts` pass with 68 tests.
- `npm --prefix client run typecheck` passes after DungeonScene integration.
- In-app Browser QA from `?debugScene=lobby&renderer=canvas` into `DungeonScene` confirms all six `assets/generated/monsters/battle/*.png` preview images are observed in the rendered page asset inventory with no browser warn/error logs.

## Phase 29: Battle Monster Fallback Texture Runtime Library

Runtime battle monster fallback coverage:

- `battle_monster_fallback`: 60x60 generic normal enemy fallback.
- `battle_boss_fallback`: 90x90 generic boss enemy fallback.
- Runtime paths live under `client/public/assets/generated/monsters/fallback`.

Production rule:

- `battleMonsterFallbackTexture` is a 60x60 single-frame Aseprite category with no required animation tags.
- `battleMonsterBossFallbackTexture` is a 90x90 single-frame Aseprite category with no required animation tags.
- `npm run art:battle:monster-fallbacks` rebuilds source `.aseprite`, Aseprite export PNG/JSON, runtime PNGs, and `sprite-production-roster.json` entries for the two generic `BattleScene` monster fallback textures.
- `BattleScene.preload()` now preloads `BATTLE_MONSTER_FALLBACK_TEXTURES`; `_spawnEnemies()` creates `_mon_prog_*` procedural fallback only when the Aseprite fallback key is still missing.

Exit criteria:

- Both battle monster fallback runtime PNGs exist and match their configured dimensions.
- Both fallback textures have source `.aseprite`, generated PNG, normalized JSON, and roster entries.
- `BattleScene` uses monster manifest sprite, legacy static PNG, Aseprite fallback PNG, procedural fallback in that order.
- Unit tests verify dimensions, JSON frames, roster metadata, BattleScene preload integration, and procedural safety fallback retention.

Current QA state:

- `npm run art:battle:monster-fallbacks` generates both battle monster fallback textures as of 2026-06-12.
- `sprite-production-roster.json` now tracks 1790 total sprite production entries, including 2 battle monster fallback texture entries.
- `npm run art:sprite:roster` passes after the new categories and roster entries.
- `tests/unit/battleMonsterFallbackTextureAssets.test.ts`, `tests/unit/runtimeImageReferenceCoverage.test.ts`, `tests/unit/runtimeImageRosterCoverage.test.ts`, `tests/unit/effectFallbackTextureAssets.test.ts`, `tests/unit/dungeonMonsterPreviewAssets.test.ts`, `tests/unit/asepritePipeline.test.ts`, and `tests/integration/asset-integrity.test.ts` pass with 75 tests.
- `npm --prefix client run typecheck` and `npm run build:client` pass after BattleScene integration.
- Vite HTTP QA confirms both fallback PNGs return `200`; in-app Browser QA on `?debugScene=battle&renderer=canvas&zone=aether_plains` observes both fallback PNGs in page assets with no browser warn/error logs.

## Phase 30: Environment Particle Texture Runtime Library

Runtime environment particle coverage:

- `particle_rain`: 2x10 rain streak texture.
- `particle_snow`: 6x10 snow flake texture.
- `particle_ether_beam`: 6x16 ether beam streak texture.
- Runtime paths live under `client/public/assets/generated/vfx/particles`.

Production rule:

- `environmentParticleRainTexture` is a 2x10 single-frame Aseprite category with no required animation tags.
- `environmentParticleSnowTexture` is a 6x10 single-frame Aseprite category with no required animation tags.
- `environmentParticleEtherBeamTexture` is a 6x16 single-frame Aseprite category with no required animation tags.
- `npm run art:environment:particles` rebuilds source `.aseprite`, Aseprite export PNG/JSON, runtime PNGs, and `sprite-production-roster.json` entries for the three `TransitionEffects` environment particle textures.
- `BattleScene.preload()` calls `preloadEnvironmentParticleTextures(scene)` to load the Aseprite PNGs; `VfxPlayer.createEnvironmentParticles()` creates procedural fallback only when the Aseprite particle key is still missing.

Exit criteria:

- All three environment particle runtime PNGs exist and match their configured dimensions.
- All three particle textures have source `.aseprite`, generated PNG, normalized JSON, and roster entries.
- `TransitionEffects` references the runtime paths and keeps procedural fallback only as a safety path.
- Unit tests verify dimensions, JSON frames, roster metadata, BattleScene preload integration, and fallback retention.

Current QA state:

- `npm run art:environment:particles` generates all three environment particle textures as of 2026-06-12.
- `sprite-production-roster.json` now tracks 1793 total sprite production entries, including 3 environment particle texture entries.
- `npm run art:sprite:roster` passes after the new particle categories and roster entries.
- `tests/unit/environmentParticleTextureAssets.test.ts`, `tests/unit/runtimeImageReferenceCoverage.test.ts`, `tests/unit/runtimeImageRosterCoverage.test.ts`, `tests/unit/asepritePipeline.test.ts`, and `tests/integration/asset-integrity.test.ts` pass with 73 tests.
- `npm --prefix client run typecheck` and `npm run build:client` pass after BattleScene and `TransitionEffects` integration.
- Vite HTTP QA confirms `particle_rain.png`, `particle_snow.png`, and `particle_ether_beam.png` return `200`; in-app Browser QA on `?debugScene=battle&renderer=canvas&zone=aether_plains` observes all three particle PNGs in page assets with one visible canvas and no browser warn/error logs.

## Phase 31: Battle Skill Slot UI Frame Runtime Wiring

Runtime battle UI frame coverage:

- `UI-BTN-001-DEF`: 512x512 Aseprite button frame used as the `BattleUI` skill slot background.
- Runtime path lives under `client/public/assets/generated/ui/frames/UI-BTN-001-DEF.png`.

Production rule:

- `BattleScene.preload()` must load the slot frame with runtime key `ui_frame_UI-BTN-001-DEF` before `BattleUI` is constructed.
- `BattleUI` must render the Aseprite frame first and keep the old rectangle slot only as a missing-texture safety fallback.
- The element color remains a thin Phaser stroke overlay so gameplay readability is preserved while the base art comes from Aseprite.

Exit criteria:

- The UI frame PNG exists and remains tracked by the `uiFrame` roster entry.
- `BattleScene` preloads the frame and `BattleUI` renders it with `setDisplaySize(SKILL_SLOT_SIZE, SKILL_SLOT_SIZE)`.
- Unit tests verify the preload/render/fallback contract.
- Browser QA confirms the battle scene observes the UI frame PNG in page assets with no browser warn/error logs.

Current QA state:

- `tests/unit/uiFrameAssets.test.ts`, `tests/unit/runtimeImageReferenceCoverage.test.ts`, `tests/unit/runtimeImageRosterCoverage.test.ts`, and `tests/integration/asset-integrity.test.ts` pass with 12 tests after BattleUI integration.
- `npm --prefix client run typecheck` and `npm run build:client` pass after the BattleUI/BattleScene import and preload changes.
- In-app Browser QA on `?debugScene=battle&renderer=canvas&zone=aether_plains` observes `UI-BTN-001-DEF.png` in page assets with one visible canvas and no browser warn/error logs.

## Phase 32: Lobby Minimap UI Frame Runtime Wiring

Runtime lobby UI frame coverage:

- `UI-HUD-002-DEF`: 512x512 Aseprite HUD frame used as the `LobbyScene` minimap background.
- Runtime path lives under `client/public/assets/generated/ui/frames/UI-HUD-002-DEF.png`.

Production rule:

- `LobbyScene.preload()` must load the minimap frame with runtime key `ui_frame_UI-HUD-002-DEF` before `_drawMinimap()` runs.
- `_drawMinimap()` must render the Aseprite frame first and keep the old rectangle background only as a missing-texture safety fallback.
- NPC minimap dots and the thin green stroke overlay stay as Phaser primitives for dynamic gameplay readability.

Exit criteria:

- The UI frame PNG exists and remains tracked by the `uiFrame` roster entry.
- `LobbyScene` preloads the frame and renders it with `setDisplaySize(MINIMAP_SIZE, MINIMAP_SIZE)`.
- Unit tests verify the preload/render/fallback contract.
- Browser QA confirms the lobby scene observes the UI frame PNG in page assets with no browser warn/error logs.

Current QA state:

- `tests/unit/uiFrameAssets.test.ts`, `tests/unit/runtimeImageReferenceCoverage.test.ts`, `tests/unit/runtimeImageRosterCoverage.test.ts`, and `tests/integration/asset-integrity.test.ts` pass with 13 tests after Lobby minimap integration.
- `npm --prefix client run typecheck` and `npm run build:client` pass after the `LobbyScene` preload/render changes.
- Vite HTTP QA confirms `UI-HUD-002-DEF.png` returns `200`; in-app Browser QA on `?debugScene=lobby&renderer=canvas&zone=aether_plains` observes `UI-HUD-002-DEF.png` in page assets with one visible canvas and no browser warn/error logs.

## Phase 33: Main Menu Aseprite Background And Particle Runtime Wiring

Runtime main menu coverage:

- Background sky: `ERB-BG-SKY-DUSK`, rendered as `title_bg`.
- Background mid layer: `ERB-BG-MID-DUSK`, rendered as `title_bg_mid`.
- Title particle: `particle_ether_beam`, reused from the environment particle runtime library.

Production rule:

- `MainMenuScene.preload()` must load the two title background PNGs through `MAIN_MENU_BACKGROUND_TEXTURES`.
- `MainMenuScene.create()` must render the Aseprite sky background first and call `_drawGradientBg()` only as a missing-texture safety fallback.
- `_spawnAetherParticles()` must render the Aseprite `particle_ether_beam` image first and keep the old rectangle particle only as a missing-texture safety fallback.
- The title readability overlay remains a Phaser rectangle because it is a dynamic opacity layer, not a source art replacement target.

Exit criteria:

- Both title background PNGs exist, remain tracked by `environmentBackground` roster entries, and are `1280x720`.
- `particle_ether_beam.png` exists, remains tracked by the `environmentParticleEtherBeamTexture` roster entry, and is `6x16`.
- Unit tests verify the preload/render/fallback contract for `MainMenuScene`.
- Browser QA confirms the main menu observes all three PNGs in page assets with no browser warn/error logs.

Current QA state:

- `tests/unit/mainMenuAsepriteAssets.test.ts`, `tests/unit/zoneBackgrounds.test.ts`, `tests/unit/environmentParticleTextureAssets.test.ts`, `tests/unit/runtimeImageReferenceCoverage.test.ts`, `tests/unit/runtimeImageRosterCoverage.test.ts`, and `tests/integration/asset-integrity.test.ts` pass with 21 tests after MainMenu integration.
- `npm --prefix client run typecheck` and `npm run build:client` pass after the `MainMenuScene` preload/render changes.
- Vite HTTP QA confirms `ERB-BG-SKY-DUSK.png`, `ERB-BG-MID-DUSK.png`, and `particle_ether_beam.png` return `200`; in-app Browser QA on `?renderer=canvas` observes all three PNGs in page assets with one visible canvas and no browser warn/error logs.

## Phase 34: Worldmap Selection Panel UI Frame Runtime Wiring

Runtime worldmap UI frame coverage:

- `UI-HUD-003-DEF`: 512x512 Aseprite HUD frame used as the `WorldScene` selected-zone info panel background.
- `UI-HUD-004-DEF`: 512x512 Aseprite HUD frame used as the `WorldScene` selected-zone preview frame.
- Runtime paths live under `client/public/assets/generated/ui/frames`.

Production rule:

- `WorldScene.preload()` must load both worldmap panel frames through `WORLD_UI_FRAME_TEXTURES`.
- `_onZoneClick()` must render the Aseprite info panel frame first and keep the old black rectangle only as a missing-texture safety fallback.
- `_onZoneClick()` must render the Aseprite preview frame first and keep the old dark preview rectangle only as a missing-texture safety fallback.
- Dynamic stroke overlays remain Phaser rectangles so era tint/readability can update per selected zone.

Exit criteria:

- Both UI frame PNGs exist, remain tracked by `uiFrame` roster entries, and are `512x512`.
- `WorldScene` preloads `UI-HUD-003-DEF` and `UI-HUD-004-DEF`, then renders them with `setDisplaySize(760, 124)` and `setDisplaySize(156, 88)`.
- Unit tests verify the preload/render/fallback contract.
- Browser QA confirms the worldmap scene observes both PNGs in page assets with no browser warn/error logs.

Current QA state:

- `tests/unit/uiFrameAssets.test.ts`, `tests/unit/runtimeImageReferenceCoverage.test.ts`, `tests/unit/runtimeImageRosterCoverage.test.ts`, and `tests/integration/asset-integrity.test.ts` pass with 14 tests after WorldScene panel integration.
- `npm --prefix client run typecheck` and `npm run build:client` pass after the `WorldScene` preload/render changes.
- Vite HTTP QA confirms `UI-HUD-003-DEF.png` and `UI-HUD-004-DEF.png` return `200`; in-app Browser QA on `?debugScene=world&renderer=canvas&zone=aether_plains` observes both PNGs in page assets with one visible canvas and no browser warn/error logs.

## Phase 35: Main Menu Modal UI Frame Runtime Wiring

Runtime main menu modal frame coverage:

- `UI-SET-001-DEF`: 512x512 Aseprite settings frame used as the `MainMenuScene` login/register modal background.
- `UI-HUD-005-DEF`: 512x512 Aseprite HUD frame used as the `MainMenuScene` credits overlay background.
- Runtime paths live under `client/public/assets/generated/ui/frames`.

Production rule:

- `MainMenuScene.preload()` must load both modal frames through `MAIN_MENU_UI_FRAME_TEXTURES`.
- `_showLoginUI()` must render the Aseprite login frame first and keep the old black rectangle only as a missing-texture safety fallback.
- `_showCreditsOverlay()` must render the Aseprite credits frame first and keep the old black rectangle only as a missing-texture safety fallback.
- Thin stroke overlays remain Phaser rectangles so focus/readability styling can stay dynamic.

Exit criteria:

- Both UI frame PNGs exist, remain tracked by `uiFrame` roster entries, and are `512x512`.
- `MainMenuScene` preloads `UI-SET-001-DEF` and `UI-HUD-005-DEF`, then renders them with `setDisplaySize(360, 280)` and `setDisplaySize(400, 300)`.
- Unit tests verify the preload/render/fallback contract for main menu backgrounds, particles, and modal frames.
- Browser QA confirms the main menu observes both modal PNGs in page assets with no browser warn/error logs.

Current QA state:

- `tests/unit/mainMenuAsepriteAssets.test.ts`, `tests/unit/uiFrameAssets.test.ts`, `tests/unit/runtimeImageReferenceCoverage.test.ts`, `tests/unit/runtimeImageRosterCoverage.test.ts`, and `tests/integration/asset-integrity.test.ts` pass with 15 tests after MainMenu modal frame integration.
- `npm --prefix client run typecheck` and `npm run build:client` pass after the `MainMenuScene` modal frame preload/render changes.
- Vite HTTP QA confirms `UI-SET-001-DEF.png` and `UI-HUD-005-DEF.png` return `200`; in-app Browser QA on `?renderer=canvas` opens the login modal through the keyboard path, observes both modal PNGs in page assets, and reports no browser warn/error logs.

## Phase 36: Settings Screen UI Frame Runtime Wiring

Runtime settings UI frame coverage:

- `UI-SET-002-DEF`: 512x512 Aseprite settings frame used as the `SettingsScene` main options panel.
- `UI-SET-003-DEF`: 512x512 Aseprite settings frame used as the `SettingsScene` keybind panel.
- `UI-SET-004-DEF`: 512x512 Aseprite settings frame used as the `SettingsScene` footer action panel.
- Runtime paths live under `client/public/assets/generated/ui/frames`.

Production rule:

- `SettingsScene.preload()` must load all three settings frames through `SETTINGS_UI_FRAME_TEXTURES`.
- `SettingsScene.create()` must render the three Aseprite frames before the text, slider, toggle, and button controls.
- `_addSettingsFrame()` must keep a procedural rectangle only as a missing-texture safety fallback.
- Existing text controls, slider bars, and keyboard navigation stay as Phaser primitives because they are dynamic stateful UI.

Exit criteria:

- All three UI frame PNGs exist, remain tracked by `uiFrame` roster entries, and are `512x512`.
- `SettingsScene` preloads `UI-SET-002-DEF`, `UI-SET-003-DEF`, and `UI-SET-004-DEF`, then renders them as the main, keybind, and footer panels.
- Unit tests verify the preload/render/fallback contract.
- Browser QA confirms the settings screen observes all three PNGs in page assets with no browser warn/error logs.

Current QA state:

- `tests/unit/uiFrameAssets.test.ts`, `tests/unit/runtimeImageReferenceCoverage.test.ts`, `tests/unit/runtimeImageRosterCoverage.test.ts`, and `tests/integration/asset-integrity.test.ts` pass with 15 tests after SettingsScene frame integration.
- `npm --prefix client run typecheck` and `npm run build:client` pass after the `SettingsScene` preload/render changes.
- Vite HTTP QA confirms `UI-SET-002-DEF.png`, `UI-SET-003-DEF.png`, and `UI-SET-004-DEF.png` return `200`; in-app Browser QA enters the settings path from the main menu on `?renderer=canvas`, observes all three PNGs in page assets, and reports no browser warn/error logs.

## Phase 37: Character Select Card UI Frame Runtime Wiring

Runtime character select UI frame coverage:

- `UI-INV-001-DEF`: 512x512 Aseprite inventory frame used as the existing character row card background.
- `UI-INV-002-DEF`: 512x512 Aseprite inventory frame used as the class creation card background.
- Runtime paths live under `client/public/assets/generated/ui/frames`.

Production rule:

- `CharacterSelectScene.preload()` must load both card frames through `CHARACTER_SELECT_UI_FRAME_TEXTURES`.
- Existing character rows and class cards must render the Aseprite frame first and keep the old procedural rectangle only as a missing-texture safety fallback.
- Transparent hit rectangles stay in front of the frame so hover, selected, and keyboard focus state remains dynamic.
- `?debugScene=characterSelect&renderer=canvas` starts `CharacterSelectScene` with `offlineQa` fallback data so browser QA does not depend on the auth/API server.

Exit criteria:

- Both UI frame PNGs exist, remain tracked by `uiFrame` roster entries, and are `512x512`.
- `CharacterSelectScene` preloads `UI-INV-001-DEF` and `UI-INV-002-DEF`, then renders them with `setDisplaySize(500, 65)` and `setDisplaySize(CARD_WIDTH, CARD_HEIGHT)`.
- Unit tests verify the preload/render/fallback contract and the debug-scene offline QA entry point.
- Browser QA confirms the character select scene observes both PNGs in page assets with no browser warn/error logs.

Current QA state:

- `tests/unit/uiFrameAssets.test.ts`, `tests/unit/runtimeImageReferenceCoverage.test.ts`, `tests/unit/runtimeImageRosterCoverage.test.ts`, and `tests/integration/asset-integrity.test.ts` pass with 16 tests after CharacterSelectScene frame integration.
- `npm --prefix client run typecheck` and `npm run build:client` pass after the `CharacterSelectScene` preload/render changes.
- Vite HTTP QA confirms `UI-INV-001-DEF.png` and `UI-INV-002-DEF.png` return `200`; in-app Browser QA on `?debugScene=characterSelect&renderer=canvas` observes both PNGs in page assets with one visible canvas and no browser warn/error logs.

## Phase 38: Cutscene Dialogue UI Frame Runtime Wiring

Runtime cutscene UI frame coverage:

- `UI-HUD-006-DEF`: 512x512 Aseprite HUD frame used as the `CutsceneScene` lower dialogue box background.
- Runtime path lives under `client/public/assets/generated/ui/frames/UI-HUD-006-DEF.png`.

Production rule:

- `CutsceneScene.preload()` must load the dialogue frame through `CUTSCENE_UI_FRAME_TEXTURES`.
- `CutsceneScene.create()` must render the Aseprite frame first and keep the old procedural rectangle only as a missing-texture safety fallback.
- The thin stroke overlay remains a Phaser rectangle so dialogue readability can stay dynamic across viewport sizes.
- `?debugScene=cutscene&renderer=canvas` starts a deterministic sample cutscene for browser QA.

Exit criteria:

- The UI frame PNG exists, remains tracked by the `uiFrame` roster entry, and is `512x512`.
- `CutsceneScene` preloads `UI-HUD-006-DEF`, then renders it with `setDisplaySize(width - 40, boxHeight - 20)`.
- Unit tests verify the preload/render/fallback contract and the debug-scene entry point.
- Browser QA confirms the cutscene scene observes the PNG in page assets with no browser warn/error logs.

Current QA state:

- `tests/unit/uiFrameAssets.test.ts`, `tests/unit/runtimeImageReferenceCoverage.test.ts`, `tests/unit/runtimeImageRosterCoverage.test.ts`, and `tests/integration/asset-integrity.test.ts` pass with 17 tests after CutsceneScene frame integration.
- `npm --prefix client run typecheck` and `npm run build:client` pass after the `CutsceneScene` preload/render changes.
- Vite HTTP QA confirms `UI-HUD-006-DEF.png` returns `200`; in-app Browser QA on `?debugScene=cutscene&renderer=canvas` observes the PNG in page assets with one visible canvas and no browser warn/error logs.

## Phase 39: Lobby Modal UI Frame Runtime Wiring

Runtime lobby modal UI frame coverage:

- `UI-HUD-007-DEF`: general `LobbyScene` NPC dialogue modal frame.
- `UI-HUD-008-DEF`: story modal frame.
- `UI-SHP-001-DEF`: item shop modal frame.
- `UI-SHP-002-DEF`: equipment enhance modal frame.
- `UI-SHP-003-DEF`: party recruit modal frame.
- `UI-INV-003-DEF`: inventory modal frame.
- `UI-INV-004-DEF`: quest board modal frame.
- Runtime paths live under `client/public/assets/generated/ui/frames`.

Production rule:

- `LobbyScene.preload()` must load the minimap and all modal frames through `LOBBY_UI_FRAME_TEXTURES`.
- `_addLobbyModalFrame()` must render the Aseprite frame first and keep the old procedural rectangle only as a missing-texture safety fallback.
- Stroke overlays remain Phaser rectangles so NPC/service color, focus readability, and modal outlines can stay dynamic.

Exit criteria:

- All seven new modal frame PNGs exist, remain tracked by `uiFrame` roster entries, and are `512x512`.
- `LobbyScene` uses `UI-HUD-007-DEF`, `UI-HUD-008-DEF`, `UI-SHP-001-DEF`, `UI-SHP-002-DEF`, `UI-SHP-003-DEF`, `UI-INV-003-DEF`, and `UI-INV-004-DEF` for the matching modal backgrounds.
- Unit tests verify the preload/render/fallback contract for the modal frame helper and each mapped panel.
- Browser QA confirms the lobby scene observes all lobby frame PNGs in page assets with no browser warn/error logs.

Current QA state:

- `tests/unit/uiFrameAssets.test.ts`, `tests/unit/runtimeImageReferenceCoverage.test.ts`, `tests/unit/runtimeImageRosterCoverage.test.ts`, and `tests/integration/asset-integrity.test.ts` pass with 18 tests after LobbyScene modal frame integration.
- `npm --prefix client run typecheck` and `npm run build:client` pass after the `LobbyScene` preload/render changes.
- Vite HTTP QA confirms `UI-HUD-007-DEF.png`, `UI-HUD-008-DEF.png`, `UI-SHP-001-DEF.png`, `UI-SHP-002-DEF.png`, `UI-SHP-003-DEF.png`, `UI-INV-003-DEF.png`, and `UI-INV-004-DEF.png` return `200`; in-app Browser QA on `?debugScene=lobby&renderer=canvas&zone=aether_plains` observes those seven plus `UI-HUD-002-DEF.png` in page assets with one visible canvas and no browser warn/error logs.

## Phase 40: Battle HUD And Command Menu UI Frame Runtime Wiring

Runtime battle UI frame coverage:

- `UI-HUD-001-DEF`: `BattleScene` lower HUD panel background.
- `UI-BTN-002-DEF`: `BattleScene` horizontal command menu background.
- `UI-BTN-003-DEF`: `BattleScene` magic and skill submenu background.
- `UI-BTN-004-DEF`: `BattleScene` item submenu background.
- Runtime paths live under `client/public/assets/generated/ui/frames`.

Production rule:

- `BattleScene.preload()` must load all four frames through `BATTLE_SCENE_UI_FRAME_TEXTURES`.
- `_addBattleSceneFrame()` must render the Aseprite frame first and keep the old procedural rectangle only as a missing-texture safety fallback.
- Stroke overlays and separators remain Phaser primitives so combat readability can stay dynamic across viewport sizes.

Exit criteria:

- All four UI frame PNGs exist, remain tracked by `uiFrame` roster entries, and are `512x512`.
- `BattleScene` uses `UI-HUD-001-DEF`, `UI-BTN-002-DEF`, `UI-BTN-003-DEF`, and `UI-BTN-004-DEF` for the lower HUD, command menu, magic submenu, and item submenu backgrounds.
- Unit tests verify the preload/render/fallback contract for each mapped frame.
- Browser QA confirms the battle scene observes all four PNGs in page assets with no browser warn/error logs.

Current QA state:

- `tests/unit/uiFrameAssets.test.ts`, `tests/unit/runtimeImageReferenceCoverage.test.ts`, `tests/unit/runtimeImageRosterCoverage.test.ts`, and `tests/integration/asset-integrity.test.ts` pass with 19 tests after BattleScene HUD and command menu frame integration.
- `npm --prefix client run typecheck` and `npm run build:client` pass after the `BattleScene` preload/render changes.
- Vite HTTP QA confirms `UI-HUD-001-DEF.png`, `UI-BTN-002-DEF.png`, `UI-BTN-003-DEF.png`, and `UI-BTN-004-DEF.png` return `200`; in-app Browser QA on `?debugScene=battle&renderer=canvas&zone=aether_plains` observes all four PNGs in page assets with one visible canvas and no browser warn/error logs.

## Phase 41: Loading Scene UI Frame Runtime Wiring

Runtime loading UI frame coverage:

- `UI-HUD-005-DEF`: `LoadingScene` central loading information panel frame.
- `UI-BTN-005-DEF`: `LoadingScene` progress track frame.
- Runtime paths live under `client/public/assets/generated/ui/frames`.

Production rule:

- `LoadingScene.preload()` must load both frames during Phase 1 so `create()` can render them before the bulk AssetManager queue starts.
- `_addLoadingFrame()` must render the Aseprite frame first and keep the old procedural rectangle only as a missing-texture safety fallback.
- The progress fill stays a Phaser rectangle because it is width-mutated by loader progress events.
- `?debugScene=loading&renderer=canvas` starts `LoadingScene` with `qaHold` enabled so browser QA can inspect the final loading UI without an automatic scene transition.

Exit criteria:

- Both UI frame PNGs exist, remain tracked by `uiFrame` roster entries, and are `512x512`.
- `LoadingScene` preloads `UI-HUD-005-DEF` and `UI-BTN-005-DEF`, then renders them with `setDisplaySize(720, 620)` and `setDisplaySize(barW + 34, barH + 26)`.
- Unit tests verify the preload/render/fallback contract and debug-scene hold entry point.
- Browser QA confirms the loading scene observes both PNGs in page assets with no browser warn/error logs.

Current QA state:

- `tests/unit/uiFrameAssets.test.ts`, `tests/unit/runtimeImageReferenceCoverage.test.ts`, `tests/unit/runtimeImageRosterCoverage.test.ts`, and `tests/integration/asset-integrity.test.ts` pass with 20 tests after LoadingScene frame integration.
- `npm --prefix client run typecheck` and `npm run build:client` pass after the `LoadingScene` preload/render changes.
- Vite HTTP QA confirms `UI-HUD-005-DEF.png` and `UI-BTN-005-DEF.png` return `200`; in-app Browser QA on `?debugScene=loading&renderer=canvas` observes both PNGs in page assets with one visible canvas and no browser warn/error logs.

## Phase 42: Skill Tree UI Frame Runtime Wiring

Runtime skill tree UI frame coverage:

- `UI-SET-002-DEF`: `SkillTreeUI` main skill tree panel frame.
- `UI-SET-003-DEF`: `SkillTreeUI` selected skill detail panel frame.
- Runtime paths live under `client/public/assets/generated/ui/frames`.

Production rule:

- `SkillTreeUI` owns `SKILL_TREE_UI_FRAME_TEXTURES`, `preloadSkillTreeUiFrameTextures()`, and `_addSkillTreeFrame()` so the panel/detail texture contract stays local to the skill tree UI.
- `LobbyScene.preload()` must call `preloadSkillTreeUiFrameTextures()` before the skill tree can be opened.
- The skill tree uses dedicated texture keys (`ui_frame_skill_tree_main_panel`, `ui_frame_skill_tree_detail_panel`) even though the PNGs are shared with `SettingsScene`, avoiding Phaser texture cache collisions between scene owners.
- Class color strokes and selection highlights remain Phaser primitives so class identity and state feedback can stay dynamic.
- `?debugScene=lobby&renderer=canvas&zone=aether_plains&skillTreeQa=1&class=ether_knight` starts LobbyScene, opens the skill tree, and installs cache-busted QA preload probes for browser asset verification.

Exit criteria:

- Both UI frame PNGs exist, remain tracked by `uiFrame` roster entries, and are `512x512`.
- `SkillTreeUI` renders `UI-SET-002-DEF` for the main panel and `UI-SET-003-DEF` for the detail panel, with the old procedural rectangles only as missing-texture safety fallback.
- Unit tests verify the preload/render/fallback contract, texture-key isolation, lobby preload, and debug QA route.
- Browser QA confirms the lobby skill tree route observes both PNGs in page assets with no browser warn/error logs.

Current QA state:

- `tests/unit/uiFrameAssets.test.ts` passes with 11 tests after SkillTreeUI frame integration.
- `tests/unit/uiFrameAssets.test.ts`, `tests/unit/runtimeImageReferenceCoverage.test.ts`, `tests/unit/runtimeImageRosterCoverage.test.ts`, and `tests/integration/asset-integrity.test.ts` pass with 21 tests after SkillTreeUI frame integration.
- `npm --prefix client run typecheck` and `npm run build:client` pass after the `SkillTreeUI`/`LobbyScene` preload changes.
- In-app Browser QA on `?debugScene=lobby&renderer=canvas&zone=aether_plains&skillTreeQa=1&class=ether_knight` observes `UI-SET-002-DEF.png` and `UI-SET-003-DEF.png` in page assets, one visible canvas, and no browser warn/error logs.

## Phase 43: Dungeon Player Character Sprite Runtime Wiring

Runtime dungeon player sprite coverage:

- `char_ether_knight_base`: full 5-direction character sprite sheet used as the `DungeonScene` player sprite when `characterClass=ether_knight`.
- The other base class pilot sheets (`char_memory_weaver_base`, `char_shadow_weaver_base`, `char_memory_breaker_base`, `char_time_guardian_base`, `char_void_wanderer_base`) use the same manifest path for their D-direction pilot frame.
- Runtime paths live under `client/public/assets/generated/characters/sprites`.

Production rule:

- `DungeonScene.preload()` must resolve `characterClass` through `characterSpriteManifest` and load the Aseprite sheet via `load.spritesheet(..., { frameWidth: 64, frameHeight: 64 })`.
- `_createPlayer()` must render manifest frame `0` first and keep the old side illustration plus rectangle as safety fallbacks only.
- The fallback side illustration is still preloaded so a missing sprite sheet does not blank the player.
- `?debugScene=dungeon&renderer=canvas&class=ether_knight` starts DungeonScene directly for browser QA.

Exit criteria:

- `DungeonScene` uses `getCharacterSpriteResource()` before `dungeon_player`.
- The player render path calls `setFrame(0)` on the manifest texture and keeps `Phaser.Textures.FilterMode.NEAREST` for pixel-art presentation.
- Unit tests verify the preload/render/fallback contract and the debug-scene route.
- Browser QA confirms the dungeon route observes the character sprite sheet with no browser warn/error logs.

Current QA state:

- `tests/unit/characterSpriteManifest.test.ts` passes with 29 tests after DungeonScene player sprite integration.
- `tests/unit/characterSpriteManifest.test.ts`, `tests/unit/characterIllustrationAssets.test.ts`, `tests/unit/dungeonMonsterPreviewAssets.test.ts`, `tests/unit/runtimeImageReferenceCoverage.test.ts`, `tests/unit/runtimeImageRosterCoverage.test.ts`, and `tests/integration/asset-integrity.test.ts` pass with 42 tests after DungeonScene integration.
- `npm --prefix client run typecheck` and `npm run build:client` pass after the `DungeonScene`/debug route changes.
- In-app Browser QA on `?debugScene=dungeon&renderer=canvas&class=ether_knight` observes `char_ether_knight_base.png`, one visible canvas, and no browser warn/error logs.

## Phase 44: GameScene Field Monster Sprite Runtime Wiring

Runtime field monster sprite coverage:

- `mon_erebos_fog_rat_normal`: field monster sheet for `mon_erebos_fog_rat`.
- `mon_erebos_memory_beetle_normal`: field monster sheet for `mon_erebos_memory_beetle`.
- `mon_erebos_memory_dust_normal`: field monster sheet for `mon_erebos_memory_dust`.
- Runtime paths live under `client/public/assets/generated/monsters/sprites`.

Production rule:

- `GameScene.preload()` must load `npc` and `monster` spritesheet resources from `spriteResourceManifest`.
- `_spawnMonster()` must resolve the clean monster id through `getSpriteResourceForMonster()` and render Aseprite frame `0` before procedural color/emoji fallback.
- Procedural color rectangles and emoji overlays remain only as missing-texture safety fallback.
- `?debugScene=game&renderer=canvas&zone=aether_plains&class=ether_knight` starts GameScene directly for browser QA.

Exit criteria:

- The three Erebos field monster sheets remain tracked by `spriteResourceManifest` and the Aseprite production roster.
- `GameScene` requests the three monster sheets and uses `Phaser.Textures.FilterMode.NEAREST` for pixel-art presentation.
- Unit tests verify preload/render/fallback ordering and the debug-scene route.
- Browser QA confirms the field scene observes all three monster sheets with no browser warn/error logs.

Current QA state:

- `tests/unit/spriteResourceManifest.test.ts` passes with 26 tests after GameScene field monster integration.
- `tests/unit/spriteResourceManifest.test.ts`, `tests/unit/runtimeImageReferenceCoverage.test.ts`, `tests/unit/runtimeImageRosterCoverage.test.ts`, `tests/integration/asset-integrity.test.ts`, and `tests/unit/monsterImageAssets.test.ts` pass with 39 tests after GameScene integration.
- `npm --prefix client run typecheck` and `npm run build:client` pass after the `GameScene`/debug route changes.
- In-app Browser QA on `?debugScene=game&renderer=canvas&zone=aether_plains&class=ether_knight` observes `mon_erebos_fog_rat_normal.png`, `mon_erebos_memory_beetle_normal.png`, and `mon_erebos_memory_dust_normal.png`, one visible canvas, and no browser warn/error logs.

## Phase 45: GameScene Remote Player Character Sprite Runtime Wiring

Runtime remote player sprite coverage:

- `GameScene` preloads all entries from `CHARACTER_SPRITE_MANIFEST` so socket-spawned remote players can render the correct base class sheet when `world:playerJoined.characterClass` is present.
- The local player still resolves `characterClass` through `getCharacterSpriteResource()` and falls back to `player_sprite` only when the manifest texture is missing.
- Runtime paths remain under `client/public/assets/generated/characters/sprites`.

Production rule:

- `GameScene.preload()` queues character sprite sheets through a de-duplicated texture-key set to avoid duplicate Phaser loader entries.
- `world:playerJoined` accepts optional `characterClass`; when present and loaded, `GameScene` renders Aseprite frame `0` at the remote player position and applies `Phaser.Textures.FilterMode.NEAREST`.
- Remote player rectangles remain only as missing-texture or missing-class safety fallback.
- `offlineQa` debug routes skip zone API, socket setup, and HUD active quest loading so browser QA can verify graphics without backend noise.

Exit criteria:

- All six base class character sheets are observed in `GameScene` browser QA.
- The remote-player socket event type allows optional `characterClass` without breaking older payloads.
- Unit tests verify the all-character preload, remote player render/fallback path, and offline QA network skip.
- Browser QA confirms the field scene observes all six character sheets plus the three starter monster sheets with no browser warn/error logs.

Current QA state:

- `tests/unit/characterSpriteManifest.test.ts` and `tests/unit/spriteResourceManifest.test.ts` pass with 57 tests after remote player sprite integration.
- `npm --prefix client run typecheck` and `npm run build:client` pass after the `GameScene`/`HUDOrchestrator` changes.
- In-app Browser QA on `?debugScene=game&renderer=canvas&zone=aether_plains&class=memory_weaver` observes all six `char_*_base.png` character sprite sheets, the three Erebos monster sprite sheets, one visible canvas, and no browser warn/error logs.

## Phase 46: Lobby Shop And Inventory Item Icon Runtime Wiring

Runtime UI item icon coverage:

- `LobbyScene.preload()` preloads the 100 `itemIconSpecs.ts` resources through `preloadItemIconResources()`.
- `itemIconResources.ts` resolves explicit `itemIconId`/`iconId` first, then maps legacy shop and inventory item codes to `ITM-*` Aseprite IDs.
- Shop consumable codes `CON_HP_S`, `CON_HP_M`, `CON_MP_S`, `CON_HP_L`, and `CON_MP_M` map to `ITM-CON-001` through `ITM-CON-005`.
- Inventory sample codes cover weapon, consumable, and material rows through `ITM-WPN-001`, `ITM-CON-003`, and `ITM-MAT-002`.

Production rule:

- `LobbyScene` row rendering uses Phaser `Image` objects named `item_icon_<ITM-ID>` with `28x28` display size when the runtime texture exists.
- Text labels, prices, quantities, focus markers, and row backgrounds remain Phaser primitives because they are dynamic UI state.
- Missing or unresolved icons do not block the panel; they fall back to the existing text-only row.
- `?debugScene=lobby&renderer=canvas&itemIconQa=shop|inventory` opens deterministic QA panels and writes `document.body.dataset.aeternaItemIconQa` for Browser verification.

Exit criteria:

- Unit tests verify legacy shop/inventory code resolution and `LobbyScene` preload/render hooks.
- Browser QA confirms the shop QA panel renders all expected consumable icon IDs with `missingIconIds: []`.
- Browser QA confirms the inventory QA panel renders weapon, consumable, and material icon IDs with `missingIconIds: []`.
- Client typecheck and build pass after the runtime wiring.

Current QA state:

- `tests/unit/spriteResourceManifest.test.ts` and `tests/unit/uiFrameAssets.test.ts` pass with 39 tests after item icon UI integration.
- `npm --prefix client run typecheck` and `npm run build:client` pass after the `LobbyScene`/`itemIconResources` changes.
- In-app Browser QA on `?debugScene=lobby&renderer=canvas&itemIconQa=shop` reports rendered IDs `ITM-CON-001`, `ITM-CON-002`, `ITM-CON-003`, `ITM-CON-004`, and `ITM-CON-005` with no missing IDs or warn/error logs.
- In-app Browser QA on `?debugScene=lobby&renderer=canvas&itemIconQa=inventory` reports rendered IDs `ITM-WPN-001`, `ITM-CON-003`, and `ITM-MAT-002` with no missing IDs or warn/error logs.

## Phase 47: Battle Result Popup UI Frame Runtime Wiring

Runtime battle result popup coverage:

- `UI-INV-005-DEF`: `BattleScene` victory result and reward popup background.
- `UI-INV-006-DEF`: `BattleScene` defeat return popup background.
- Runtime paths live under `client/public/assets/generated/ui/frames`.

Production rule:

- `BattleScene.preload()` loads both popup frames through `BATTLE_SCENE_UI_FRAME_TEXTURES`.
- `_showResultPopup()` and `_showDefeatPopup()` render Aseprite frames through `_addBattleSceneFrame()` before falling back to the old procedural rectangle path.
- Reward text, loot rows, close buttons, keyboard exit bindings, and stroke overlays remain Phaser primitives because they are dynamic combat state.
- `?debugScene=battle&renderer=canvas&battleResultFrameQa=victory|defeat` opens deterministic popup QA states and writes `document.body.dataset.aeternaBattleResultFrameQa`.
- `MainMenuScene` skips decorative title preload during debug-scene redirects to avoid duplicate texture-key queueing before the target debug scene starts.

Exit criteria:

- Unit tests verify preload, render, fallback, and debug route contracts for both popup frame IDs.
- Browser QA confirms the victory popup reports `ui_frame_UI-INV-005-DEF` with `missingFrameKeys: []`.
- Browser QA confirms the defeat popup reports `ui_frame_UI-INV-006-DEF` with `missingFrameKeys: []`.
- Client typecheck and build pass after the runtime wiring.

Current QA state:

- `tests/unit/uiFrameAssets.test.ts` and `tests/unit/mainMenuAsepriteAssets.test.ts` pass with 12 tests after BattleScene result popup integration and debug preload cleanup.
- `npm --prefix client run typecheck` and `npm run build:client` pass after the `BattleScene`/`MainMenuScene` changes.
- In-app Browser QA on `?debugScene=battle&renderer=canvas&battleResultFrameQa=victory` reports `status: ready`, rendered frame `ui_frame_UI-INV-005-DEF`, one visible canvas, and no current-navigation warn/error logs.
- In-app Browser QA on `?debugScene=battle&renderer=canvas&battleResultFrameQa=defeat` reports `status: ready`, rendered frame `ui_frame_UI-INV-006-DEF`, one visible canvas, and no current-navigation warn/error logs.

## Phase 48: Feedback Form UI Frame Runtime Wiring

Runtime feedback form frame coverage:

- `UI-SET-002-DEF`: `FeedbackForm` 500x600 feedback panel background.
- Runtime path lives under `client/public/assets/generated/ui/frames/UI-SET-002-DEF.png`.

Production rule:

- `FeedbackForm.preload()` loads the panel frame through `FEEDBACK_FORM_UI_FRAME_TEXTURES`.
- `_addFeedbackFormFrame()` renders the Aseprite frame first and keeps the old procedural rectangle only as a missing-texture safety fallback.
- HTML `input`/`textarea`, type buttons, submit/close buttons, keyboard focus state, and validation feedback remain dynamic UI.
- `?debugScene=feedback&renderer=canvas` opens a deterministic feedback form QA state and writes `document.body.dataset.aeternaFeedbackFrameQa`.

Exit criteria:

- Unit tests verify the frame preload/render/fallback contract and debug route.
- Browser QA confirms the feedback form reports `ui_frame_UI-SET-002-DEF` with `missingFrameKeys: []`.
- Browser QA confirms the title input and description textarea still exist after the Phaser panel frame replacement.
- Client typecheck and build pass after the runtime wiring.

Current QA state:

- `tests/unit/uiFrameAssets.test.ts` passes with 12 tests after FeedbackForm panel frame integration.
- `npm --prefix client run typecheck` and `npm run build:client` pass after the `FeedbackForm`/debug route changes.
- In-app Browser QA on `?debugScene=feedback&renderer=canvas` reports `status: ready`, rendered frame `ui_frame_UI-SET-002-DEF`, one visible canvas, title/description DOM inputs present, and no current-navigation warn/error logs.

## Phase 49: Battle Log Panel UI Frame Runtime Wiring

Runtime battle log panel frame coverage:

- `UI-HUD-008-DEF`: `BattleUI` top-right combat log panel background.
- Runtime path lives under `client/public/assets/generated/ui/frames/UI-HUD-008-DEF.png`.

Production rule:

- `BattleScene.preload()` loads the log panel frame through `preloadBattleUiFrameTextures()` together with the skill slot frame.
- `BattleUI._createLogPanel()` renders the Aseprite frame first and keeps the old semi-transparent rectangle only as a missing-texture safety fallback.
- Log lines, keyword highlight text, pause/flee buttons, and combat state remain dynamic Phaser objects.
- `?debugScene=battle&renderer=canvas&battleLogFrameQa=1` writes `document.body.dataset.aeternaBattleLogFrameQa` for Browser verification.

Exit criteria:

- Unit tests verify the BattleUI preload/render/fallback and QA route contracts for the log panel frame.
- Browser QA confirms the battle log panel reports `ui_frame_UI-HUD-008-DEF` with `missingFrameKeys: []`.
- Browser QA confirms the battle canvas remains visible and both `UI-HUD-008-DEF.png` and `UI-BTN-001-DEF.png` are observed.
- Client typecheck and build pass after the runtime wiring.

Current QA state:

- `tests/unit/uiFrameAssets.test.ts` passes with 12 tests after BattleUI log panel frame integration.
- `npm --prefix client run typecheck` and `npm run build:client` pass after the `BattleUI` changes.
- In-app Browser QA on `?debugScene=battle&renderer=canvas&zone=aether_plains&battleLogFrameQa=1` reports `status: ready`, rendered frame `ui_frame_UI-HUD-008-DEF`, one visible canvas, relevant page assets `UI-HUD-008-DEF.png` and `UI-BTN-001-DEF.png`, and no current-navigation warn/error logs.
- The in-app Browser screenshot API timed out on this canvas-heavy page, so local Playwright screenshot fallback was used for visual evidence; it confirmed both frame PNG responses returned `200`, one visible `1920x1080` game canvas was scaled to `1280x720`, and console warn/error logs were empty.

## Phase 50: Field HUD DOM Panel UI Frame Runtime Wiring

Runtime field HUD frame coverage:

- `UI-HUD-007-DEF`: `HudOverlay` bottom-left status panel background.
- `UI-HUD-001-DEF`: `HudOverlay` bottom quickslot panel background.
- `UI-HUD-008-DEF`: `HudOverlay` top-right quest tracker background.
- `UI-HUD-006-DEF`: `HudOverlay` field dialogue panel background.
- Runtime paths live under `client/public/assets/generated/ui/frames`.

Production rule:

- `HudOverlay` applies the Aseprite frames through CSS `background-image` layers on the existing DOM panels, preserving the dark readability gradient above each frame.
- HP/MP/EXP fill bars, quickslot contents, quest rows, quest map buttons, dialogue speaker/body text, and choice buttons remain dynamic DOM elements.
- `?debugScene=game&renderer=canvas&hudFrameQa=1` opens a deterministic offline field HUD state, forces the dialogue panel open, and writes `document.body.dataset.aeternaHudFrameQa`.

Exit criteria:

- Unit tests verify the HUD frame asset IDs, CSS background wiring, QA dataset contract, and debug route flag.
- Browser QA confirms all four field HUD frame backgrounds report `hasFrameBackground: true` with `missingFrameKeys: []`.
- Browser QA confirms all four frame PNGs are observed as page assets and the game canvas remains visible.
- Client typecheck and build pass after the runtime wiring.

Current QA state:

- `tests/unit/uiFrameAssets.test.ts` passes with 13 tests after Field HUD DOM panel frame integration.
- `npm --prefix client run typecheck` and `npm run build:client` pass after the `HudOverlay`/`GameScene`/debug route changes.
- In-app Browser QA on `?debugScene=game&renderer=canvas&zone=aether_plains&hudFrameQa=1` reports `status: ready`, rendered frames `ui_frame_UI-HUD-007-DEF`, `ui_frame_UI-HUD-001-DEF`, `ui_frame_UI-HUD-008-DEF`, and `ui_frame_UI-HUD-006-DEF`, all four panel elements visible, one visible canvas, no missing frame keys, and no current-navigation warn/error logs.
- In-app Browser page assets include `UI-HUD-007-DEF.png`, `UI-HUD-001-DEF.png`, `UI-HUD-008-DEF.png`, and `UI-HUD-006-DEF.png`.
- The in-app Browser screenshot API timed out on this canvas-heavy page, so local Playwright screenshot fallback was used for visual evidence; it confirmed the four frame PNG responses returned `200`, one visible `1920x1080` game canvas was scaled to `1280x720`, and console warn/error logs were empty.

## Phase 51: Dungeon HUD And Reward UI Frame Runtime Wiring

Runtime dungeon UI frame coverage:

- `UI-HUD-007-DEF`: `DungeonScene` bottom-left player HP/MP status panel background.
- `UI-BTN-006-DEF`: `DungeonScene` Battle action button background.
- `UI-INV-005-DEF`: `DungeonScene` clear reward panel background.
- Runtime paths live under `client/public/assets/generated/ui/frames`.

Production rule:

- `DungeonScene.preload()` loads all three frame PNGs through `DUNGEON_UI_FRAME_TEXTURES`.
- `_addDungeonFrame()` renders the Aseprite frame first and keeps the old procedural rectangle only as a missing-texture safety fallback.
- HP/MP fill bars, wave/timer text, enemy preview labels, reward values, keyboard shortcuts, and click handlers remain dynamic Phaser UI.
- `?debugScene=dungeon&renderer=canvas&dungeonFrameQa=ready` opens the wave-ready state and writes `document.body.dataset.aeternaDungeonFrameQa` for status/action frame verification.
- `?debugScene=dungeon&renderer=canvas&dungeonFrameQa=clear` opens the dungeon-clear state and writes the same dataset for status/reward frame verification.

Exit criteria:

- Unit tests verify the DungeonScene preload/render/fallback contract and debug route parser.
- Browser QA confirms ready mode reports `ui_frame_dungeon_status_panel` and `ui_frame_dungeon_action_button` with `missingFrameKeys: []`.
- Browser QA confirms clear mode reports `ui_frame_dungeon_status_panel` and `ui_frame_dungeon_reward_panel` with `missingFrameKeys: []`.
- Client typecheck and build pass after the runtime wiring.

Current QA state:

- `tests/unit/uiFrameAssets.test.ts` passes with 14 tests after DungeonScene HUD/reward frame integration.
- `npm --prefix client run typecheck` and `npm run build:client` pass after the `DungeonScene`/debug route changes.
- In-app Browser QA on `?debugScene=dungeon&renderer=canvas&dungeonFrameQa=ready` reports `status: ready`, rendered frames `ui_frame_dungeon_status_panel` and `ui_frame_dungeon_action_button`, one visible canvas, no missing frame keys, and no current-navigation warn/error logs.
- In-app Browser QA on `?debugScene=dungeon&renderer=canvas&dungeonFrameQa=clear` reports `status: ready`, rendered frames `ui_frame_dungeon_status_panel` and `ui_frame_dungeon_reward_panel`, one visible canvas, no missing frame keys, and no current-navigation warn/error logs.
- In-app Browser page assets include `UI-HUD-007-DEF.png`, `UI-BTN-006-DEF.png`, and `UI-INV-005-DEF.png`.
- The in-app Browser screenshot API timed out on this canvas-heavy page, so local Chrome/Playwright screenshot fallback was used for visual evidence; it confirmed the status/action/reward frames render at fixed size and the action frame no longer inherits the text pulse scale.

## Phase 52: Battle Pace Button UI Frame Runtime Wiring

Runtime battle pace button frame coverage:

- `UI-BTN-006-DEF`: `BattleScene` AUTO, Speed, and ATB mode button backgrounds.
- Runtime path lives under `client/public/assets/generated/ui/frames/UI-BTN-006-DEF.png`.

Production rule:

- `BattleScene.preload()` loads `UI-BTN-006-DEF` through `BATTLE_SCENE_UI_FRAME_TEXTURES.paceButton` with the isolated key `ui_frame_battle_pace_button`.
- `_addBattleSceneFrame()` renders three fixed-size Aseprite button frames behind the existing Phaser text labels.
- AUTO/Speed/ATB labels, color changes, mouse clicks, and keyboard shortcuts remain dynamic Phaser text/handlers.
- `?debugScene=battle&renderer=canvas&battlePaceFrameQa=1` writes `document.body.dataset.aeternaBattlePaceFrameQa` with `renderedFrameCount`.

Exit criteria:

- Unit tests verify the pace button preload/render/QA route contract.
- Browser QA confirms `renderedFrameCount >= 3`, `missingFrameKeys: []`, one visible canvas, and no current-navigation warn/error logs.
- Client typecheck and build pass after the runtime wiring.

Current QA state:

- Phase 52 is runtime-verified as of 2026-06-13.
- `npx vitest run --config tests/vitest.config.ts tests/unit/uiFrameAssets.test.ts`, `npm --prefix client run typecheck`, and `npm run build:client` pass after the pace button wiring.
- Browser asset QA on `?debugScene=battle&renderer=canvas&zone=aether_plains&battlePaceFrameQa=1` confirms `UI-BTN-006-DEF.png` is loaded alongside the battle UI frame assets.
- Chrome/Playwright runtime QA reports active scene `BattleScene`, `status: ready`, `renderedFrameKeys: ["ui_frame_battle_pace_button"]`, `renderedFrameCount: 3`, `expectedFrameCount: 3`, `missingFrameKeys: []`, and one visible `1920x1080` canvas scaled to `1280x720`.
- The only warn/error-level console entry during the final pass was the unrelated `favicon.ico` 404; no frame, texture, or scene runtime errors were observed.

## Phase 53: Battle Combo Tech Button UI Frame Runtime Wiring

Runtime battle combo tech button frame coverage:

- `UI-BTN-006-DEF`: `BattleScene` 협공 and 3인 협공 candidate button backgrounds.
- Runtime path lives under `client/public/assets/generated/ui/frames/UI-BTN-006-DEF.png`.

Production rule:

- `BattleScene.preload()` loads `UI-BTN-006-DEF` through `BATTLE_SCENE_UI_FRAME_TEXTURES.comboTechButton` with the isolated key `ui_frame_battle_combo_tech_button`.
- `_addBattleSceneFrame()` renders two fixed-size Aseprite button frames inside the existing dual/triple tech button containers.
- Candidate visibility, hotkeys, click handlers, and combo resolution remain dynamic combat logic.
- `?debugScene=battle&renderer=canvas&battleComboTechFrameQa=1` forces both candidate button containers visible for screenshot QA and writes `document.body.dataset.aeternaBattleComboTechFrameQa` with `renderedFrameCount`.

Exit criteria:

- Unit tests verify the combo tech button preload/render/QA route contract.
- Browser QA confirms `renderedFrameCount >= 2`, `missingFrameKeys: []`, one visible canvas, and no current-navigation warn/error logs except unrelated browser chrome asset requests such as `favicon.ico`.
- Client typecheck and build pass after the runtime wiring.

Current QA state:

- Phase 53 is runtime-verified as of 2026-06-13.
- `npx vitest run --config tests/vitest.config.ts tests/unit/uiFrameAssets.test.ts`, `npm --prefix client run typecheck`, and `npm run build:client` pass after the combo tech button wiring.
- In-app Browser asset QA on `?debugScene=battle&renderer=canvas&zone=aether_plains&battleComboTechFrameQa=1` observes `UI-BTN-006-DEF.png` alongside the battle UI frame assets, one visible canvas, and no current-navigation warn/error logs.
- Chrome/Playwright runtime QA reports `status: ready`, `renderedFrameKeys: ["ui_frame_battle_combo_tech_button"]`, `renderedFrameCount: 2`, `expectedFrameCount: 2`, `missingFrameKeys: []`, active scene `BattleScene`, both candidate containers visible, both candidate frame primaries as `Image`, label texts intact, and one visible `1920x1080` canvas scaled to `1280x720`.
- The in-app Browser screenshot API timed out on this canvas-heavy page, so local Chrome/Playwright screenshot fallback was used for visual evidence.
- The only warn/error-level console entry during the Chrome fallback pass was the unrelated `favicon.ico` 404; no frame, texture, or scene runtime errors were observed.

## Phase 54: Feedback Form Button UI Frame Runtime Wiring

Runtime feedback form button frame coverage:

- `UI-BTN-006-DEF`: `FeedbackForm` feedback type, submit, and close button backgrounds.
- Runtime path lives under `client/public/assets/generated/ui/frames/UI-BTN-006-DEF.png`.

Production rule:

- `FeedbackForm.preload()` loads `UI-BTN-006-DEF` through `FEEDBACK_FORM_UI_FRAME_TEXTURES.button` with the isolated key `ui_frame_feedback_form_button`.
- `_addFeedbackFormFrame()` renders the panel frame and seven fixed-size button frames before the Phaser text labels.
- HTML title/description/priority inputs and dynamic button labels/focus text remain runtime UI.
- `?debugScene=feedback&renderer=canvas` writes `document.body.dataset.aeternaFeedbackFrameQa` with `panelRenderedFrameCount` and `buttonRenderedFrameCount`.

Exit criteria:

- Unit tests verify the feedback form panel/button preload/render/QA contract.
- Browser QA confirms `buttonRenderedFrameCount >= 7`, `missingFrameKeys: []`, one visible canvas, and no current-navigation warn/error logs except unrelated browser chrome asset requests such as `favicon.ico`.
- Client typecheck and build pass after the runtime wiring.

Current QA state:

- Phase 54 is runtime-verified as of 2026-06-13.
- `npx vitest run --config tests/vitest.config.ts tests/unit/uiFrameAssets.test.ts`, `npm --prefix client run typecheck`, and `npm run build:client` pass after the feedback form button wiring.
- In-app Browser QA on `?debugScene=feedback&renderer=canvas` reports `status: ready`, `renderedFrameKeys: ["ui_frame_UI-SET-002-DEF", "ui_frame_feedback_form_button"]`, `panelRenderedFrameCount: 1`, `buttonRenderedFrameCount: 7`, `expectedButtonFrameCount: 7`, `missingFrameKeys: []`, two visible DOM input controls, one visible canvas, and no current-navigation warn/error logs.
- In-app Browser page assets include `UI-SET-002-DEF.png` and `UI-BTN-006-DEF.png`.
- The in-app Browser screenshot API timed out on this canvas-heavy page, so local Chrome/Playwright screenshot fallback was used for visual evidence; it confirmed active scene `FeedbackForm`, both frame textures available, and one visible `1920x1080` canvas scaled to `1280x720`.
- The only warn/error-level console entry during the Chrome fallback pass was the unrelated `favicon.ico` 404; no frame, texture, or scene runtime errors were observed.

## Phase 55: Settings Scene Action Button UI Frame Runtime Wiring

Runtime settings action button frame coverage:

- `UI-BTN-006-DEF`: `SettingsScene` feedback and back button backgrounds.
- Runtime path lives under `client/public/assets/generated/ui/frames/UI-BTN-006-DEF.png`.

Production rule:

- `SettingsScene.preload()` loads `UI-BTN-006-DEF` through `SETTINGS_UI_FRAME_TEXTURES.actionButton` with the isolated key `ui_frame_settings_action_button`.
- `_addSettingsFrame()` renders the three settings panel frames and two fixed-size action button frames before the Phaser text labels.
- Settings label, slider/toggle/cycle state, feedback launch logic, back navigation, and keyboard focus state remain dynamic Phaser UI.
- `?debugScene=settings&renderer=canvas` opens a deterministic settings QA state and writes `document.body.dataset.aeternaSettingsFrameQa` with `panelRenderedFrameCount` and `buttonRenderedFrameCount`.

Exit criteria:

- Unit tests verify the settings panel/button preload/render/QA route contract.
- Browser QA confirms `buttonRenderedFrameCount >= 2`, `missingFrameKeys: []`, one visible canvas, and no current-navigation warn/error logs except unrelated browser chrome asset requests such as `favicon.ico`.
- Client typecheck and build pass after the runtime wiring.

Current QA state:

- Phase 55 is runtime-verified as of 2026-06-13.
- `npx vitest run --config tests/vitest.config.ts tests/unit/uiFrameAssets.test.ts`, `npm --prefix client run typecheck`, and `npm run build:client` pass after the settings action button wiring.
- In-app Browser QA on `?debugScene=settings&renderer=canvas&settingsFrameQa=1` reports `status: ready`, rendered frame keys `["ui_frame_UI-SET-002-DEF", "ui_frame_UI-SET-003-DEF", "ui_frame_UI-SET-004-DEF", "ui_frame_settings_action_button"]`, `panelRenderedFrameCount: 3`, `buttonRenderedFrameCount: 2`, `expectedButtonFrameCount: 2`, `missingFrameKeys: []`, one visible canvas, and no current-navigation warn/error logs.
- In-app Browser page assets include `UI-SET-002-DEF.png`, `UI-SET-003-DEF.png`, `UI-SET-004-DEF.png`, and `UI-BTN-006-DEF.png`.
- The in-app Browser screenshot API timed out on this canvas-heavy page, so local Chrome/Playwright screenshot fallback was used for visual evidence; it confirmed active scene `SettingsScene`, all four frame textures available, all four PNG responses returned `200`, and one visible `1920x1080` canvas scaled to `1280x720`.
- A follow-up Chrome response scan found no app requests with `>=400` status.

## Phase 56: Field HUD DOM Button UI Frame Runtime Wiring

Runtime field HUD DOM button frame coverage:

- `UI-BTN-006-DEF`: `HudOverlay` quickslot, quest map, and dialogue choice button backgrounds.
- Runtime path lives under `client/public/assets/generated/ui/frames/UI-BTN-006-DEF.png`.

Production rule:

- `HudOverlay` applies `UI-BTN-006-DEF` through CSS `background-image` layers using the `ui_frame_hud_dom_button` contract.
- `.hud-slot`, `.hud-quest-map-btn`, and `.hud-dialogue-choice` keep DOM button semantics and dynamic text/focus/cooldown state while replacing their flat background fills with Aseprite button frames.
- `?debugScene=game&renderer=canvas&zone=aether_plains&hudFrameQa=1` writes `document.body.dataset.aeternaHudFrameQa` with panel frame states plus `buttonFrame.visibleButtonCount` and `buttonFrame.framedButtonCount`.

Exit criteria:

- Unit tests verify the HUD button frame asset ID, CSS wiring, and QA dataset contract.
- Browser QA confirms `renderedButtonFrameKey: "ui_frame_hud_dom_button"`, `buttonFrame.visibleButtonCount > 0`, `buttonFrame.visibleButtonCount === buttonFrame.framedButtonCount`, `missingFrameKeys: []`, one visible canvas, and no current-navigation warn/error logs.
- Client typecheck and build pass after the runtime wiring.

Current QA state:

- Phase 56 is runtime-verified as of 2026-06-13.
- `npx vitest run --config tests/vitest.config.ts tests/unit/uiFrameAssets.test.ts`, `npm --prefix client run typecheck`, and `npm run build:client` pass after the HUD button frame wiring.
- In-app Browser opens `?debugScene=game&renderer=canvas&zone=aether_plains&hudFrameQa=1` and confirms one visible canvas, but its current Phaser DOMElement path does not expose `#hud-root`; the in-app screenshot API also times out on this canvas-heavy page.
- Local Chrome/Playwright fallback on the same URL confirms `status: "ready"`, `renderedButtonFrameKey: "ui_frame_hud_dom_button"`, `buttonFrame.visibleButtonCount: 16`, `buttonFrame.framedButtonCount: 16`, `missingFrameKeys: []`, one visible `1920x1080` canvas scaled to `1280x720`, and no warn/error console logs.
- Chrome response scan confirms `UI-HUD-007-DEF.png`, `UI-HUD-001-DEF.png`, `UI-HUD-008-DEF.png`, `UI-HUD-006-DEF.png`, and `UI-BTN-006-DEF.png` all return `200`, with no app requests at `>=400` status. Visual evidence was captured at `C:\Users\crisi\AppData\Local\Temp\aeterna-hud-dom-button-frame-phase56-rerun.png`.

## Phase 57: Field Environment Object Runtime Wiring

Runtime field environment object coverage:

- `ZONE_ENV_CONFIG` object entries under `assets/generated/environment/objects/*.png`.
- `aether_plains` currently renders `aether_tree_01`, `aether_rock_01`, and `aether_crystal_01` as Aseprite image objects in `GameScene`.

Production rule:

- `GameScene.preload()` loads only the current zone's environment object PNGs to keep field entry cost scoped.
- `GameScene.createWorld()` calls `_placeEnvironmentObjects()` after background setup; each object is rendered with `this.add.image(x, y, obj.key)`, bottom-center origin, deterministic seeded placement, and Y-depth sorting.
- Procedural placeholder geometry is not used for environment objects. Missing textures are skipped and reported through the QA probe.
- `?debugScene=game&renderer=canvas&zone=aether_plains&envObjectQa=1` writes `document.body.dataset.aeternaEnvObjectQa` with expected/rendered counts, per-object texture load state, and missing texture keys.

Exit criteria:

- Unit tests verify `ZONE_ENV_CONFIG` folder coverage, PNG dimensions, roster links, `GameScene` preload/render wiring, and the debug-scene QA route.
- Browser QA confirms `status: "ready"`, `expectedObjectCount === renderedObjectCount`, `missingTextureKeys: []`, one visible canvas, relevant environment object PNG responses at `200`, and no warn/error logs.
- Client typecheck and build pass after the runtime wiring.

Current QA state:

- Phase 57 is runtime-verified as of 2026-06-13.
- `npx vitest run --config tests/vitest.config.ts tests/unit/environmentObjectAssets.test.ts`, `npm --prefix client run typecheck`, and `npm run build:client` pass after the GameScene environment object wiring.
- In-app Browser QA on `?debugScene=game&renderer=canvas&zone=aether_plains&envObjectQa=1` confirms `status: "ready"`, `expectedObjectCount: 45`, `renderedObjectCount: 45`, `missingTextureKeys: []`, and no current-navigation warn/error logs.
- The in-app Browser screenshot API timed out on this canvas-heavy page, so local Chrome/Playwright screenshot fallback was used for visual evidence.
- Local Chrome/Playwright fallback on the same URL confirms `aether_tree_01.png`, `aether_rock_01.png`, and `aether_crystal_01.png` all return `200`, no app requests at `>=400` status, no warn/error console logs, and one visible `1920x1080` canvas scaled to `1280x720`. Visual evidence was captured at `C:\Users\crisi\AppData\Local\Temp\aeterna-field-env-objects-phase57.png`.

## Phase 58: Minimap Overlay UI Frame Runtime Wiring

Runtime minimap overlay frame coverage:

- `UI-HUD-002-DEF`: standalone `MinimapOverlay` panel frame background.
- Runtime path lives under `client/public/assets/generated/ui/frames/UI-HUD-002-DEF.png`.

Production rule:

- `preloadMinimapOverlayUiFrameTextures()` loads `UI-HUD-002-DEF` through the isolated `ui_frame_minimap_overlay_panel` key.
- `MinimapOverlay` renders the Aseprite panel frame first, keeps the rectangle hit area invisible, and exposes the old procedural rectangle/stroke only as a missing-texture safety fallback.
- Dynamic minimap content remains runtime UI: zone label, coordinate label, player/marker/waypoint graphics, fullscreen toggle, and click-to-waypoint coordinate conversion.
- `?debugScene=minimapOverlay&renderer=canvas&minimapOverlayFrameQa=1` starts `MinimapOverlayQaScene` and writes `document.body.dataset.aeternaMinimapOverlayFrameQa` with rendered frame keys, missing frame keys, marker count, and panel/content sizes.

Exit criteria:

- Unit tests verify the minimap overlay preload/render/fallback contract and debug route registration.
- Browser QA confirms `status: "ready"`, `renderedFrameKeys: ["ui_frame_minimap_overlay_panel"]`, `renderedFrameCount: 1`, `expectedFrameCount: 1`, `missingFrameKeys: []`, one visible canvas, and no current-navigation warn/error logs.
- Client typecheck and build pass after the runtime wiring.

Current QA state:

- Phase 58 is runtime-verified as of 2026-06-13.
- `npx vitest run --config tests/vitest.config.ts tests/unit/uiFrameAssets.test.ts`, `npm --prefix client run typecheck`, and `npm run build:client` pass after the `MinimapOverlay` frame wiring.
- In-app Browser QA on `?debugScene=minimapOverlay&renderer=canvas&minimapOverlayFrameQa=1` reports `status: "ready"`, `renderedFrameKeys: ["ui_frame_minimap_overlay_panel"]`, `renderedFrameCount: 1`, `expectedFrameCount: 1`, `missingFrameKeys: []`, `markerCount: 6`, one visible canvas, and no current-navigation warn/error logs.
- In-app Browser page assets include `UI-HUD-002-DEF.png` and `MinimapOverlayQaScene.ts`.
- The in-app Browser screenshot API timed out on this canvas-heavy page, so local Chrome/Playwright screenshot fallback was used for visual evidence.
- Local Chrome/Playwright fallback on the same URL confirms `UI-HUD-002-DEF.png` returns `200`, no app requests at `>=400` status, no warn/error console logs, one visible `1920x1080` canvas scaled to `1280x720`, and `49/49` sampled canvas pixels are nonblank. Visual evidence was captured at `C:\Users\crisi\AppData\Local\Temp\aeterna-minimap-overlay-frame-phase58.png`.

## Phase 59: DialogueBox UI Frame Runtime Wiring

Runtime DialogueBox frame coverage:

- `UI-HUD-006-DEF`: standalone `DialogueBox` NPC dialogue panel background.
- `UI-BTN-006-DEF`: standalone `DialogueBox` choice button backgrounds.
- Runtime paths live under `client/public/assets/generated/ui/frames`.

Production rule:

- `preloadDialogueBoxUiFrameTextures()` loads both frame PNGs through isolated keys `ui_frame_dialogue_box_panel` and `ui_frame_dialogue_box_choice_button`.
- `DialogueBox` renders the Aseprite panel frame first, keeps the main rectangle as an invisible click/skip hit area, and exposes the old procedural panel rectangle only as a missing-texture safety fallback.
- Choice buttons render fixed-size Aseprite button frames behind the existing dynamic labels. Choice callback logic, disabled state, hover tint, keyboard numeric shortcuts, typing effect, skip/next handling, speaker/body text, and portrait rendering remain dynamic Phaser UI.
- `?debugScene=dialogueBox&renderer=canvas&dialogueBoxFrameQa=1` starts `DialogueBoxQaScene` and writes `document.body.dataset.aeternaDialogueBoxFrameQa` with rendered frame keys, missing frame keys, panel dimensions, and choice button frame counts.

Exit criteria:

- Unit tests verify the DialogueBox preload/render/fallback contract and debug route registration.
- Browser QA confirms `status: "ready"`, rendered frame keys include `ui_frame_dialogue_box_panel` and `ui_frame_dialogue_box_choice_button`, `choiceButtonFrame.renderedFrameCount === 3`, `missingFrameKeys: []`, one visible canvas, and no current-navigation warn/error logs.
- Client typecheck and build pass after the runtime wiring.

Current QA state:

- Phase 59 is runtime-verified as of 2026-06-13.
- `npx vitest run --config tests/vitest.config.ts tests/unit/uiFrameAssets.test.ts`, `npm --prefix client run typecheck`, and `npm run build:client` pass after the `DialogueBox` frame wiring.
- In-app Browser was attempted on `?debugScene=dialogueBox&renderer=canvas&dialogueBoxFrameQa=1`, but the tab remained on the loading overlay without exposing `window.__aeternaGame` or `aeternaDialogueBoxFrameQa`; no warn/error logs were reported there. Local Chrome/Playwright fallback was used for authoritative runtime verification.
- Local Chrome/Playwright QA on the same URL reports active scene `DialogueBoxQaScene`, `status: "ready"`, rendered frame keys `["ui_frame_dialogue_box_panel", "ui_frame_dialogue_box_choice_button"]`, `choiceButtonFrame.renderedFrameCount: 3`, `choiceButtonFrame.expectedFrameCount: 3`, `missingFrameKeys: []`, one visible canvas, and no warn/error console logs.
- Chrome response scan confirms `UI-HUD-006-DEF.png` and `UI-BTN-006-DEF.png` both return `200`, with no app requests at `>=400` status.
- Visual QA caught a pre-existing choice-button overflow when a bottom-anchored `DialogueBox` displayed choices below the panel. `DialogueBox.showChoices()` now places choices above the panel when the lower layout would exceed the scene height.
- Local screenshot fallback confirms the three choice button frames remain visible inside the viewport, one `1920x1080` canvas is scaled to `1280x720`, and `49/49` sampled canvas pixels are nonblank. Visual evidence was captured at `C:\Users\crisi\AppData\Local\Temp\aeterna-dialogue-box-frame-phase59.png`.

## Phase 60: ChatUI Frame Runtime Wiring

Runtime ChatUI frame coverage:

- `UI-HUD-008-DEF`: standalone `ChatUI` panel background.
- `UI-BTN-006-DEF`: standalone `ChatUI` input field background.
- Runtime paths live under `client/public/assets/generated/ui/frames`.

Production rule:

- `preloadChatUiFrameTextures()` loads both frame PNGs through isolated keys `ui_frame_chat_panel` and `ui_frame_chat_input`.
- `ChatUI` renders the Aseprite panel frame first, keeps the panel rectangle as a low-alpha readability/hit layer, and exposes the old procedural stroke only as a missing-texture fallback.
- The input field renders a fixed-size Aseprite button frame behind the existing dynamic placeholder/input text. Focus tint, enter-to-send, emoji insertion, channel tabs, unread counts, socket event handlers, and message row refresh remain dynamic Phaser UI.
- `?debugScene=chat&renderer=canvas&chatFrameQa=1` starts `ChatUiQaScene` and writes `document.body.dataset.aeternaChatFrameQa` with rendered frame keys, missing frame keys, panel/input frame dimensions, tab count, message count, and visible canvas count.

Exit criteria:

- Unit tests verify the ChatUI preload/render/fallback contract and debug route registration.
- Browser QA confirms `status: "ready"`, rendered frame keys include `ui_frame_chat_panel` and `ui_frame_chat_input`, `renderedFrameCount === expectedFrameCount`, `missingFrameKeys: []`, one visible canvas, and no current-navigation warn/error logs.
- Client typecheck and build pass after the runtime wiring.

Current QA state:

- Phase 60 is runtime-verified as of 2026-06-13.
- `npx vitest run --config tests/vitest.config.ts tests/unit/uiFrameAssets.test.ts`, `npm --prefix client run typecheck`, and `npm run build:client` pass after the `ChatUI` frame wiring and frame-safe layout inset.
- In-app Browser QA on `?debugScene=chat&renderer=canvas&chatFrameQa=1` reports `status: "ready"`, rendered frame keys `["ui_frame_chat_panel", "ui_frame_chat_input"]`, `renderedFrameCount: 2`, `expectedFrameCount: 2`, `missingFrameKeys: []`, `tabCount: 4`, `messageCount: 3`, one visible canvas, and no current-navigation warn/error logs.
- In-app Browser page assets include `ChatUiQaScene.ts`, `ChatUI.ts`, `UI-HUD-008-DEF.png`, and `UI-BTN-006-DEF.png`.
- Local Chrome/Playwright QA on the same URL reports active scene `ChatUiQaScene`, `inputFrame.displayWidth: 356`, `inputFrame.displayHeight: 24`, `UI-HUD-008-DEF.png` and `UI-BTN-006-DEF.png` responses at `200`, no app requests at `>=400` status, no warn/error console logs, and `49/49` sampled canvas pixels nonblank.
- Visual QA moved the QA scene footer label away from the chat input and added frame-safe ChatUI content insets so tab/message/input text no longer sits on the Aseprite frame edges. Visual evidence was captured at `C:\Users\crisi\AppData\Local\Temp\aeterna-chat-ui-frame-phase60.png`.

## Phase 61: Standalone Minimap Frame Runtime Wiring

Runtime standalone Minimap frame coverage:

- `UI-HUD-002-DEF`: standalone `Minimap` panel background.
- Runtime path lives under `client/public/assets/generated/ui/frames/UI-HUD-002-DEF.png`.

Production rule:

- `preloadMinimapUiFrameTextures()` loads `UI-HUD-002-DEF` through the isolated `ui_frame_minimap_panel` key.
- `Minimap` renders the Aseprite panel frame first, keeps the rectangle as a low-alpha hit/readability layer, and exposes the old procedural stroke only as a missing-texture fallback.
- Player, NPC, monster, portal, and quest marker dots remain dynamic Phaser primitives. World-to-minimap conversion and click-to-move conversion use a frame content inset when the Aseprite frame is present so markers do not sit on the decorative border.
- `?debugScene=minimap&renderer=canvas&minimapFrameQa=1` starts `MinimapQaScene` and writes `document.body.dataset.aeternaMinimapFrameQa` with rendered frame keys, missing frame keys, panel dimensions, content inset, marker count, player dot position, and visible canvas count.

Exit criteria:

- Unit tests verify the standalone Minimap preload/render/fallback contract and debug route registration.
- Browser QA confirms `status: "ready"`, `renderedFrameKeys: ["ui_frame_minimap_panel"]`, `renderedFrameCount === expectedFrameCount`, `missingFrameKeys: []`, one visible canvas, and no current-navigation warn/error logs.
- Client typecheck and build pass after the runtime wiring.

Current QA state:

- Phase 61 is runtime-verified as of 2026-06-13.
- `npx vitest run --config tests/vitest.config.ts tests/unit/uiFrameAssets.test.ts`, `npm --prefix client run typecheck`, and `npm run build:client` pass after the standalone `Minimap` frame wiring and QA probe update.
- In-app Browser QA on `?debugScene=minimap&renderer=canvas&minimapFrameQa=1` reports `status: "ready"`, rendered frame keys `["ui_frame_minimap_panel"]`, `renderedFrameCount: 1`, `expectedFrameCount: 1`, `missingFrameKeys: []`, `contentInset: 10`, `contentSize: 160`, `markerCount: 4`, one visible canvas, and no current-navigation warn/error logs.
- In-app Browser page assets include `MinimapQaScene.ts`, `Minimap.ts`, and `UI-HUD-002-DEF.png`.
- Local Chrome/Playwright QA on the same URL reports active scene `MinimapQaScene`, `UI-HUD-002-DEF.png` response at `200`, no app requests at `>=400` status, no warn/error console logs, and `49/49` sampled canvas pixels nonblank.
- Local Playwright click QA on the minimap content area moves the player dot from `(50, 70)` to `(150, 130)`, confirming click-to-world and world-to-minimap conversion are using the Aseprite frame content inset.
- Visual evidence was captured at `C:\Users\crisi\AppData\Local\Temp\aeterna-minimap-frame-phase61.png`.

## Phase 62: Tutorial Flow Panel Frame Runtime Wiring

Runtime tutorial flow frame coverage:

- `UI-HUD-005-DEF`: standalone `TutorialFlowManager` tutorial panel background.
- Runtime path lives under `client/public/assets/generated/ui/frames/UI-HUD-005-DEF.png`.

Production rule:

- `preloadTutorialFlowUiFrameTextures()` loads `UI-HUD-005-DEF` through the isolated `ui_frame_tutorial_flow_panel` key.
- `TutorialFlowManager` renders the Aseprite panel frame first at `620x280`, keeps the rectangle as a low-alpha readability/hit layer, places dynamic tutorial copy inside `panelContentBounds`, and exposes the old procedural stroke only as a missing-texture fallback.
- Tutorial title, body copy, progress text, skip button, trigger handling, and localStorage progress save/restore remain dynamic Phaser logic.
- `?debugScene=tutorialFlow&renderer=canvas&tutorialFlowFrameQa=1` starts `TutorialFlowQaScene` and writes `document.body.dataset.aeternaTutorialFlowFrameQa` with rendered frame keys, missing frame keys, panel dimensions, content bounds, current step, trigger, and visible canvas count.

Exit criteria:

- Unit tests verify the tutorial flow preload/render/fallback contract and debug route registration.
- Browser QA confirms `status: "ready"`, `renderedFrameKeys: ["ui_frame_tutorial_flow_panel"]`, `renderedFrameCount === expectedFrameCount`, `missingFrameKeys: []`, one visible canvas, and no current-navigation warn/error logs.
- Client typecheck and build pass after the runtime wiring.

Current QA state:

- Phase 62 is runtime-verified as of 2026-06-13.
- `npx vitest run --config tests/vitest.config.ts tests/unit/uiFrameAssets.test.ts`, `npm --prefix client run typecheck`, and `npm run build:client` pass after the `TutorialFlowManager` frame wiring and frame-safe layout update.
- In-app Browser QA on `?debugScene=tutorialFlow&renderer=canvas&tutorialFlowFrameQa=1` reports `status: "ready"`, rendered frame keys `["ui_frame_tutorial_flow_panel"]`, `renderedFrameCount: 1`, `expectedFrameCount: 1`, `missingFrameKeys: []`, `panelFrame.displayWidth: 620`, `panelFrame.displayHeight: 280`, `panelContentBounds.width: 464`, `panelContentBounds.height: 134`, one visible canvas, and no current-navigation warn/error logs.
- In-app Browser page assets include `TutorialFlowQaScene.ts`, `TutorialFlowManager.ts`, and `UI-HUD-005-DEF.png`.
- Local Chrome/Playwright QA on the same URL reports active scene `TutorialFlowQaScene`, `UI-HUD-005-DEF.png` response at `200`, no app requests at `>=400` status, no warn/error console logs, and `49/49` sampled canvas pixels nonblank.
- Local Playwright click QA advances the tutorial from `welcome` to `movement_wasd`, confirming the overlay pointer trigger still works after the Aseprite panel frame and content bounds update.
- Visual evidence was captured at `C:\Users\crisi\AppData\Local\Temp\aeterna-tutorial-flow-frame-phase62.png`.

## Phase 63: ComboUI Chain Gauge Frame Runtime Wiring

Runtime combo UI frame coverage:

- `UI-BTN-005-DEF`: standalone `ComboUI` chain gauge track frame.
- Runtime path lives under `client/public/assets/generated/ui/frames/UI-BTN-005-DEF.png`.

Production rule:

- `preloadComboUiFrameTextures()` loads `UI-BTN-005-DEF` through the isolated `ui_frame_combo_chain_gauge` key.
- `ComboUI` renders the Aseprite chain gauge frame first at `136x22`, keeps the existing background/fill rectangles as dynamic readability and gauge state layers, and records missing-texture fallback state in QA.
- Hit counter, multiplier, gauge decay/fill color, combo achieved text, hint rows, and screen shake setting remain dynamic Phaser logic.
- `?debugScene=combo&renderer=canvas&comboFrameQa=1` starts `ComboUiQaScene` and writes `document.body.dataset.aeternaComboFrameQa` with rendered frame keys, missing frame keys, chain gauge dimensions, hit count, gauge fill width, hint count, combo text visibility, and visible canvas count.

Exit criteria:

- Unit tests verify the ComboUI preload/render/fallback contract, BattleScene preload wiring, and debug route registration.
- Browser QA confirms `status: "ready"`, `renderedFrameKeys: ["ui_frame_combo_chain_gauge"]`, `renderedFrameCount === expectedFrameCount`, `missingFrameKeys: []`, one visible canvas, and no current-navigation warn/error logs.
- Client typecheck and build pass after the runtime wiring.

Current QA state:

- Phase 63 is runtime-verified as of 2026-06-13.
- `npx vitest run --config tests/vitest.config.ts tests/unit/uiFrameAssets.test.ts`, `npm --prefix client run typecheck`, and `npm run build:client` pass after the `ComboUI` chain gauge frame wiring.
- In-app Browser QA on `?debugScene=combo&renderer=canvas&comboFrameQa=1` reports `status: "ready"`, rendered frame keys `["ui_frame_combo_chain_gauge"]`, `renderedFrameCount: 1`, `expectedFrameCount: 1`, `missingFrameKeys: []`, `chainGaugeFrame.displayWidth: 136`, `chainGaugeFrame.displayHeight: 22`, `currentHitCount: 24`, `gaugeRemaining: 1`, `gaugeFillWidth: 120`, `hintCount: 2`, `comboTextVisible: true`, one visible canvas, and no current-navigation warn/error logs.
- In-app Browser page assets include `ComboUiQaScene.ts`, `ComboUI.ts`, and `UI-BTN-005-DEF.png`.
- Local Chrome/Playwright QA on the same URL reports active scene `ComboUiQaScene`, `UI-BTN-005-DEF.png`, `ComboUiQaScene.ts`, and `ComboUI.ts` responses at `200`, no app requests at `>=400` status, no warn/error console logs, and `49/49` sampled canvas pixels nonblank.
- Local Playwright runtime probe after gauge decay reports `gaugeRemaining: 0.91` and `gaugeFillWidth: 109.21136`, confirming the Aseprite frame does not freeze the dynamic gauge fill.
- Visual evidence was captured at `C:\Users\crisi\AppData\Local\Temp\aeterna-combo-frame-phase63.png`.

## Phase 64: Battle Skill Tooltip Frame Runtime Wiring

Runtime battle skill tooltip frame coverage:

- `UI-HUD-005-DEF`: `BattleUI` skill hover tooltip background.
- Runtime path lives under `client/public/assets/generated/ui/frames/UI-HUD-005-DEF.png`.

Production rule:

- `preloadBattleUiFrameTextures()` loads `UI-HUD-005-DEF` through the isolated `ui_frame_battle_skill_tooltip` key.
- `BattleUI._showTooltip()` renders the Aseprite tooltip frame first at `150x70` for the current default 3-line skill tooltip, keeps the rectangle as a low-alpha readability layer, and exposes the old stroke rectangle only as a missing-texture fallback.
- Skill name, damage, MP/CD text, hover lifecycle, slot click handling, and cooldown overlays remain dynamic Phaser UI logic.
- `?debugScene=battle&renderer=canvas&zone=aether_plains&battleTooltipFrameQa=1` opens `BattleScene`, forces the first skill tooltip open, and writes `document.body.dataset.aeternaBattleSkillTooltipFrameQa` with rendered frame keys, missing frame keys, tooltip dimensions, selected slot name, line count, and visible canvas count.

Exit criteria:

- Unit tests verify the BattleUI tooltip frame preload/render/fallback contract and QA route trigger.
- Browser QA confirms `status: "ready"`, `renderedFrameKeys: ["ui_frame_battle_skill_tooltip"]`, `renderedFrameCount === expectedFrameCount`, `missingFrameKeys: []`, one visible canvas, and no current-navigation warn/error logs.
- Client typecheck and build pass after the runtime wiring.

Current QA state:

- Phase 64 is runtime-verified as of 2026-06-13.
- `npx vitest run --config tests/vitest.config.ts tests/unit/uiFrameAssets.test.ts` passes with 21 tests after the `BattleUI` skill tooltip frame wiring.
- `npm --prefix client run typecheck` passes after the tooltip frame wiring.
- In-app Browser QA on `?debugScene=battle&renderer=canvas&zone=aether_plains&battleTooltipFrameQa=1` reports `status: "ready"`, rendered frame keys `["ui_frame_battle_skill_tooltip"]`, `renderedFrameCount: 1`, `expectedFrameCount: 1`, `missingFrameKeys: []`, `skillTooltipFrame.displayWidth: 150`, `skillTooltipFrame.displayHeight: 70`, `slotName: "에테르 슬래시"`, `lineCount: 3`, one visible canvas, and no current-navigation warn/error logs.
- In-app Browser page assets include `BattleScene.ts`, `BattleUI.ts`, and `UI-HUD-005-DEF.png`.
- Local Chrome/Playwright QA on the same URL confirms `UI-HUD-005-DEF.png`, `BattleScene.ts`, and `BattleUI.ts` responses at `200`, no app requests at `>=400` status, no warn/error console logs, and `42/42` sampled canvas pixels nonblank.
- Visual evidence was captured at `C:\Users\crisi\AppData\Local\Temp\aeterna-battle-tooltip-frame-phase64.png`.

## Phase 65: Battle Utility Button Frame Runtime Wiring

Runtime battle utility button frame coverage:

- `UI-BTN-006-DEF`: `BattleUI` pause and flee button backgrounds.
- Runtime path lives under `client/public/assets/generated/ui/frames/UI-BTN-006-DEF.png`.

Production rule:

- `preloadBattleUiFrameTextures()` loads `UI-BTN-006-DEF` through the isolated `ui_frame_battle_utility_button` key.
- `BattleUI._createButtons()` renders two Aseprite utility button frames first: pause at `116x26` and flee at `72x26`.
- Pause/resume label changes, P key pause handling, flee click delegation, and button text color remain dynamic Phaser UI logic.
- `?debugScene=battle&renderer=canvas&zone=aether_plains&battleUtilityButtonFrameQa=1` opens `BattleScene` and writes `document.body.dataset.aeternaBattleUtilityButtonFrameQa` with rendered frame keys, missing frame keys, frame display sizes, pause/flee labels, and visible canvas count.

Exit criteria:

- Unit tests verify the BattleUI utility button frame preload/render/fallback contract and QA route trigger.
- Browser QA confirms `status: "ready"`, `renderedFrameKeys: ["ui_frame_battle_utility_button"]`, `renderedFrameCount === expectedFrameCount`, `missingFrameKeys: []`, one visible canvas, and no current-navigation warn/error logs.
- Client typecheck and build pass after the runtime wiring.

Current QA state:

- Phase 65 is runtime-verified as of 2026-06-13.
- `npx vitest run --config tests/vitest.config.ts tests/unit/uiFrameAssets.test.ts` passes with 22 tests after the `BattleUI` utility button frame wiring.
- `npm --prefix client run typecheck` passes after the utility button frame wiring.
- In-app Browser QA on `?debugScene=battle&renderer=canvas&zone=aether_plains&battleUtilityButtonFrameQa=1` reports `status: "ready"`, rendered frame keys `["ui_frame_battle_utility_button"]`, `renderedFrameCount: 2`, `expectedFrameCount: 2`, `missingFrameKeys: []`, button frame names `["battle_ui_utility_button_frame_pause", "battle_ui_utility_button_frame_flee"]`, display sizes `116x26` and `72x26`, pause label `⏸ 일시정지 (P)`, flee label `🏃 도주`, one visible canvas, and no current-navigation warn/error logs.
- In-app Browser page assets include `BattleScene.ts`, `BattleUI.ts`, and `UI-BTN-006-DEF.png`.
- Local Chrome/Playwright QA on the same URL confirms `UI-BTN-006-DEF.png`, `BattleScene.ts`, and `BattleUI.ts` responses at `200`, no app requests at `>=400` status, no warn/error console logs, and `42/42` sampled canvas pixels nonblank.
- Visual evidence was captured at `C:\Users\crisi\AppData\Local\Temp\aeterna-battle-utility-buttons-phase65.png`.

## Phase 66: Settings Slider Track Frame Runtime Wiring

Runtime settings slider track frame coverage:

- `UI-BTN-005-DEF`: `SettingsScene` BGM, SFX, and subtitle background opacity slider track backgrounds.
- Runtime path lives under `client/public/assets/generated/ui/frames/UI-BTN-005-DEF.png`.

Production rule:

- `SettingsScene.preload()` loads `UI-BTN-005-DEF` through the isolated `ui_frame_settings_slider_track` key.
- `SettingsScene._addSlider()` renders three Aseprite slider track frames first at `228x24`, then overlays the dynamic primitive background/fill bars.
- Slider labels, percentage values, pointer updates, keyboard `ArrowLeft/ArrowRight` adjustment, and persisted settings writes remain dynamic Phaser UI logic.
- `?debugScene=settings&renderer=canvas&settingsFrameQa=1` opens `SettingsScene` and writes `document.body.dataset.aeternaSettingsFrameQa` with panel/button/slider frame counts, slider frame display sizes, missing frame keys, and visible canvas state.

Exit criteria:

- Unit tests verify the `SettingsScene` slider track frame preload/render/fallback contract and QA route trigger.
- Browser QA confirms `status: "ready"`, `renderedFrameKeys` includes `ui_frame_settings_slider_track`, `sliderRenderedFrameCount === expectedSliderFrameCount`, `missingFrameKeys: []`, one visible canvas, and no current-navigation warn/error logs.
- Client typecheck and build pass after the runtime wiring.

Current QA state:

- Phase 66 is runtime-verified as of 2026-06-13.
- `npx vitest run --config tests/vitest.config.ts tests/unit/uiFrameAssets.test.ts` passes with 22 tests after the `SettingsScene` slider track frame wiring.
- `npm --prefix client run typecheck` and `npm run build:client` pass after the slider track frame wiring.
- In-app Browser QA on `?debugScene=settings&renderer=canvas&settingsFrameQa=1` reports `status: "ready"`, rendered frame keys `["ui_frame_UI-SET-002-DEF", "ui_frame_UI-SET-003-DEF", "ui_frame_UI-SET-004-DEF", "ui_frame_settings_action_button", "ui_frame_settings_slider_track"]`, `panelRenderedFrameCount: 3`, `buttonRenderedFrameCount: 2`, `sliderRenderedFrameCount: 3`, `expectedSliderFrameCount: 3`, `missingFrameKeys: []`, slider frame display sizes `228x24`, one visible canvas, and no current-navigation warn/error logs.
- In-app Browser page assets include `SettingsScene.ts`, `UI-SET-002-DEF.png`, `UI-SET-003-DEF.png`, `UI-SET-004-DEF.png`, `UI-BTN-006-DEF.png`, and `UI-BTN-005-DEF.png`.
- Local Chrome/Playwright QA on the same URL confirms all five frame PNGs and `SettingsScene.ts` return `200`, no warn/error console logs, and `48/48` sampled canvas pixels nonblank.
- Visual evidence was captured at `C:\Users\crisi\AppData\Local\Temp\aeterna-settings-slider-track-phase66.png`.

## Phase 67: ChatUI Channel Tab Button Frame Runtime Wiring

Runtime ChatUI tab button frame coverage:

- `UI-BTN-006-DEF`: standalone `ChatUI` general, party, guild, and whisper channel tab button backgrounds.
- Runtime path lives under `client/public/assets/generated/ui/frames/UI-BTN-006-DEF.png`.

Production rule:

- `preloadChatUiFrameTextures()` loads `UI-BTN-006-DEF` through the isolated `ui_frame_chat_tab_button` key in addition to the existing chat input key.
- `ChatUI.createChatPanel()` renders four Aseprite channel tab frames first at `68x22`, then overlays the existing dynamic tab label text.
- Active channel state uses frame tint/alpha and text font style; channel switching, unread count text, socket message handling, and message row refresh remain dynamic Phaser UI logic.
- `?debugScene=chat&renderer=canvas&chatFrameQa=1` starts `ChatUiQaScene` and writes `document.body.dataset.aeternaChatFrameQa` with panel/input/tab frame keys, tab frame display sizes, missing frame keys, message counts, and visible canvas count.

Exit criteria:

- Unit tests verify the ChatUI tab button frame preload/render/fallback contract and QA route trigger.
- Browser QA confirms `status: "ready"`, `renderedFrameKeys` includes `ui_frame_chat_tab_button`, `tabButtonFrame.renderedCount === tabButtonFrame.expectedCount`, `missingFrameKeys: []`, one visible canvas, and no current-navigation warn/error logs.
- Client typecheck and build pass after the runtime wiring.

Current QA state:

- Phase 67 is runtime-verified as of 2026-06-13.
- `npx vitest run --config tests/vitest.config.ts tests/unit/uiFrameAssets.test.ts` passes with 22 tests after the `ChatUI` tab button frame wiring.
- `npm --prefix client run typecheck` and `npm run build:client` pass after the tab button frame wiring.
- In-app Browser QA on `?debugScene=chat&renderer=canvas&chatFrameQa=1` reports `status: "ready"`, rendered frame keys `["ui_frame_chat_panel", "ui_frame_chat_tab_button", "ui_frame_chat_input"]`, `renderedFrameCount: 3`, `expectedFrameCount: 3`, `tabButtonFrame.renderedCount: 4`, `tabButtonFrame.expectedCount: 4`, `missingFrameKeys: []`, one visible canvas, and no current-navigation warn/error logs.
- In-app Browser click QA switches from `activeChannel: "general"` to `activeChannel: "party"` and resets the party tab label from `파티(1)` to `파티`.
- In-app Browser page assets include `ChatUiQaScene.ts`, `ChatUI.ts`, `UI-HUD-008-DEF.png`, and `UI-BTN-006-DEF.png`.
- Local Chrome/Playwright QA on the same URL confirms `ChatUiQaScene.ts`, `ChatUI.ts`, `UI-HUD-008-DEF.png`, and `UI-BTN-006-DEF.png` responses at `200`, no warn/error console logs, and `48/48` sampled canvas pixels nonblank.
- Visual evidence was captured at `C:\Users\crisi\AppData\Local\Temp\aeterna-chat-tab-buttons-phase67.png`.

## Phase 68: ChatUI Emoji Button Frame Runtime Wiring

Runtime ChatUI emoji button frame coverage:

- `UI-BTN-006-DEF`: standalone `ChatUI` emoji insertion button background inside the input row.
- Runtime path lives under `client/public/assets/generated/ui/frames/UI-BTN-006-DEF.png`.

Production rule:

- `preloadChatUiFrameTextures()` loads `UI-BTN-006-DEF` through the isolated `ui_frame_chat_emoji_button` key in addition to the existing chat input and channel tab keys.
- `ChatUI.createChatPanel()` renders one Aseprite emoji button frame at `24x20`, then overlays the existing emoji label.
- Emoji selection, random emoji insertion, input buffer update, placeholder/focus text, enter-to-send, and socket message handling remain dynamic Phaser UI logic.
- `?debugScene=chat&renderer=canvas&chatFrameQa=1` starts `ChatUiQaScene` and writes `document.body.dataset.aeternaChatFrameQa` with panel/input/tab/emoji frame keys, emoji frame dimensions, input buffer length, input text preview, missing frame keys, and visible canvas count.

Exit criteria:

- Unit tests verify the ChatUI emoji button frame preload/render/fallback contract and QA route trigger.
- Browser QA confirms `status: "ready"`, `renderedFrameKeys` includes `ui_frame_chat_emoji_button`, `emojiButtonFrame.rendered === true`, `missingFrameKeys: []`, one visible canvas, and no current-navigation warn/error logs.
- Click QA confirms the emoji button updates `inputBufferLength` and `inputTextPreview` without breaking the existing chat frame state.
- Client typecheck and build pass after the runtime wiring.

Current QA state:

- Phase 68 is runtime-verified as of 2026-06-13.
- `npx vitest run --config tests/vitest.config.ts tests/unit/uiFrameAssets.test.ts` passes with 22 tests after the `ChatUI` emoji button frame wiring.
- `npm --prefix client run typecheck` and `npm run build:client` pass after the emoji button frame wiring.
- In-app Browser QA on `?debugScene=chat&renderer=canvas&chatFrameQa=1` reports `status: "ready"`, rendered frame keys `["ui_frame_chat_panel", "ui_frame_chat_tab_button", "ui_frame_chat_input", "ui_frame_chat_emoji_button"]`, `renderedFrameCount: 4`, `expectedFrameCount: 4`, `emojiButtonFrame.rendered: true`, `emojiButtonFrame.displayWidth: 24`, `emojiButtonFrame.displayHeight: 20`, `missingFrameKeys: []`, one visible canvas, and no current-navigation warn/error logs.
- In-app Browser click QA on the emoji button changes `inputBufferLength` from `0` to a positive value and updates `inputTextPreview` from the placeholder to an inserted emoji.
- In-app Browser page assets include `ChatUiQaScene.ts`, `ChatUI.ts`, `UI-HUD-008-DEF.png`, and `UI-BTN-006-DEF.png`.
- Local Chrome/Playwright QA on the same URL confirms `ChatUiQaScene.ts`, `ChatUI.ts`, `UI-HUD-008-DEF.png`, and `UI-BTN-006-DEF.png` responses at `200`, no warn/error console logs, and `48/48` sampled canvas pixels nonblank.
- Visual evidence was captured at `C:\Users\crisi\AppData\Local\Temp\aeterna-chat-emoji-button-phase68.png`.

## Phase 69: Main Menu Button Frame Runtime Wiring

Runtime main menu button frame coverage:

- `UI-BTN-006-DEF`: `MainMenuScene` title menu button background for Game Start, Settings, and Credits.
- Runtime path lives under `client/public/assets/generated/ui/frames/UI-BTN-006-DEF.png`.

Production rule:

- `MainMenuScene.preload()` loads `UI-BTN-006-DEF` through the isolated `ui_frame_main_menu_button` key in addition to the existing title background, particle, login modal, and credits modal assets.
- `MainMenuScene.create()` renders three Aseprite menu button frames at `260x38` behind the existing dynamic menu labels.
- Keyboard focus, pointer click, focus tint/alpha, login/register flow, settings route, credits overlay, and title BGM trigger remain dynamic Phaser UI logic.
- `?debugScene=mainMenu&renderer=canvas&mainMenuFrameQa=1` keeps the main menu active and writes `document.body.dataset.aeternaMainMenuFrameQa` with rendered frame keys, frame counts, display sizes, active menu index, menu labels, missing frame keys, and visible canvas count.

Exit criteria:

- Unit tests verify the main menu background, particle, modal frame, and menu button frame preload/render/fallback contracts.
- Browser QA confirms `status: "ready"`, `renderedFrameKeys: ["ui_frame_main_menu_button"]`, `renderedFrameCount === expectedFrameCount`, `missingFrameKeys: []`, three `260x38` button frames, one visible canvas, and no current-navigation warn/error logs.
- Keyboard QA confirms ArrowDown changes `activeMenuIndex` from `0` to `1` without breaking the frame probe.
- Client typecheck and build pass after the runtime wiring.

Current QA state:

- Phase 69 is runtime-verified as of 2026-06-13.
- `npx vitest run --config tests/vitest.config.ts tests/unit/mainMenuAsepriteAssets.test.ts tests/unit/uiFrameAssets.test.ts` passes with 23 tests after the `MainMenuScene` menu button frame wiring.
- `npm --prefix client run typecheck` and `npm run build:client` pass after the menu button frame wiring.
- In-app Browser QA on `?debugScene=mainMenu&renderer=canvas&mainMenuFrameQa=1` reports `status: "ready"`, rendered frame keys `["ui_frame_main_menu_button"]`, `renderedFrameCount: 3`, `expectedFrameCount: 3`, `missingFrameKeys: []`, three `260x38` button frames, one visible canvas, and no current-navigation warn/error logs.
- In-app Browser keyboard QA changes `activeMenuIndex` from `0` to `1` after `ArrowDown`, confirming the Aseprite frame does not block dynamic menu focus state.
- In-app Browser page assets include `MainMenuScene.ts`, `ERB-BG-SKY-DUSK.png`, `ERB-BG-MID-DUSK.png`, `particle_ether_beam.png`, `UI-SET-001-DEF.png`, `UI-HUD-005-DEF.png`, and `UI-BTN-006-DEF.png`.
- Local Chrome/Playwright QA on the same URL confirms all seven relevant assets return `200`, no warn/error console logs, one visible `1920x1080` canvas fitted to `1280x720`, `49/49` sampled canvas pixels nonblank, and `ArrowDown` updates `activeMenuIndex` from `0` to `1`.
- Visual evidence was captured at `C:\Users\crisi\AppData\Local\Temp\aeterna-main-menu-buttons-phase69.png`.

## Phase 70: Main Menu Modal Button Frame Runtime Wiring

Runtime main menu modal button frame coverage:

- `UI-BTN-006-DEF`: `MainMenuScene` login/register/close modal action button background and credits overlay close button background.
- Runtime path lives under `client/public/assets/generated/ui/frames/UI-BTN-006-DEF.png`.

Production rule:

- `MainMenuScene.preload()` loads `UI-BTN-006-DEF` through the isolated `ui_frame_main_menu_modal_button` key in addition to the existing title menu button key.
- `_showLoginUI()` renders three Aseprite modal button frames for login, register, and close actions at `112x30`, `92x30`, and `34x28`.
- `_showCreditsOverlay()` renders one Aseprite modal button frame for the credits close action at `154x30`.
- Login/register/close pointer handlers, register prompt, login flow, credits overlay lifecycle, keyboard focus, and title menu state remain dynamic Phaser UI logic.
- `?debugScene=mainMenu&renderer=canvas&mainMenuFrameQa=1` writes `document.body.dataset.aeternaMainMenuFrameQa` with `activeModal`, modal frame counts, expected counts, display sizes, missing frame keys, and visible canvas count.

Exit criteria:

- Unit tests verify the modal button frame preload/render/fallback contract and active modal QA payload.
- Browser QA confirms the login modal reports `activeModal: "login"`, `modalButtonFrame.renderedCount: 3`, `modalButtonFrame.expectedCount: 3`, `missingFrameKeys: []`, and no current-navigation warn/error logs.
- Local Playwright click QA confirms the login modal, login close, credits modal, and credits close pointer paths keep the QA probe consistent.
- Client typecheck and build pass after the runtime wiring.

Current QA state:

- Phase 70 is runtime-verified as of 2026-06-13.
- `npx vitest run --config tests/vitest.config.ts tests/unit/mainMenuAsepriteAssets.test.ts tests/unit/uiFrameAssets.test.ts` passes with 23 tests after the `MainMenuScene` modal button frame wiring.
- `npm --prefix client run typecheck` and `npm run build:client` pass after the modal button frame wiring.
- In-app Browser QA on `?debugScene=mainMenu&renderer=canvas&mainMenuFrameQa=1&qaRun=phase70` opens the login modal through the keyboard path and reports `activeModal: "login"`, `modalButtonFrame.renderedCount: 3`, `modalButtonFrame.expectedCount: 3`, `missingFrameKeys: []`, three modal frame sizes, one visible canvas, and no current-navigation warn/error logs.
- Local Playwright QA on the same URL confirms `MainMenuScene.ts`, `ERB-BG-SKY-DUSK.png`, `ERB-BG-MID-DUSK.png`, `particle_ether_beam.png`, `UI-SET-001-DEF.png`, `UI-HUD-005-DEF.png`, and `UI-BTN-006-DEF.png` responses at `200`; click QA opens/closes the login modal and credits overlay; the credits close frame reports `154x30`; no warn/error console logs are emitted; one visible `1920x1080` canvas fits `1280x720`; and `49/49` sampled canvas pixels are nonblank.
- Visual evidence was captured at `C:\Users\crisi\AppData\Local\Temp\aeterna-main-menu-modal-buttons-phase70.png`.

## Phase 71: Main Menu Login Input Frame Runtime Wiring

Runtime main menu login input frame coverage:

- `UI-BTN-006-DEF`: `MainMenuScene` username/password DOM input background frame in the login/register modal.
- Runtime path lives under `client/public/assets/generated/ui/frames/UI-BTN-006-DEF.png`.

Production rule:

- `MainMenuScene.preload()` loads `UI-BTN-006-DEF` through the isolated `ui_frame_main_menu_modal_input` key in addition to the existing title menu and modal action button keys.
- `_createInput()` assigns `data-aeterna-frame-key`, `data-aeterna-frame-path`, and a CSS `background-image` using `UI-BTN-006-DEF.png` to both login DOM inputs.
- Input value, placeholder, password masking, autocomplete, aria label, Enter/Shift+Enter handlers, validation, and auth requests remain dynamic DOM/Auth logic.
- `?debugScene=mainMenu&renderer=canvas&mainMenuFrameQa=1` writes `modalInputFrame` with CSS background URLs, DOM display sizes, rendered count, expected count, and missing frame keys.

Exit criteria:

- Unit tests verify the modal input frame preload/CSS/QA contract.
- Browser QA confirms the login modal reports `modalInputFrame.renderedCount: 2`, `modalInputFrame.expectedCount: 2`, CSS backgrounds using `UI-BTN-006-DEF.png`, `missingFrameKeys: []`, and no current-navigation warn/error logs.
- Local Playwright QA confirms the two DOM inputs are visible, carry the frame data attributes, and keep the canvas nonblank.
- Client typecheck and build pass after the runtime wiring.

Current QA state:

- Phase 71 is runtime-verified as of 2026-06-13.
- `npx vitest run --config tests/vitest.config.ts tests/unit/mainMenuAsepriteAssets.test.ts tests/unit/uiFrameAssets.test.ts` passes with 23 tests after the `MainMenuScene` login input frame wiring.
- `npm --prefix client run typecheck` and `npm run build:client` pass after the login input frame wiring.
- In-app Browser QA on `?debugScene=mainMenu&renderer=canvas&mainMenuFrameQa=1&qaRun=phase71` opens the login modal through the keyboard path and reports `status: "ready"`, `activeModal: "login"`, `modalInputFrame.renderedCount: 2`, `modalInputFrame.expectedCount: 2`, `missingFrameKeys: []`, two `160x34` visible DOM inputs with `ui_frame_main_menu_modal_input`, one visible canvas, and no current-navigation warn/error logs.
- Local Playwright QA on the same URL confirms `MainMenuScene.ts`, `ERB-BG-SKY-DUSK.png`, `ERB-BG-MID-DUSK.png`, `particle_ether_beam.png`, `UI-SET-001-DEF.png`, `UI-HUD-005-DEF.png`, and `UI-BTN-006-DEF.png` responses at `200`; both inputs use CSS `url("/assets/generated/ui/frames/UI-BTN-006-DEF.png")`; no warn/error console logs are emitted; and `49/49` sampled canvas pixels are nonblank.
- Visual evidence was captured at `C:\Users\crisi\AppData\Local\Temp\aeterna-main-menu-input-frames-phase71.png`.

## Phase 72: Character Select Name Input Frame Runtime Wiring

Runtime character select name input frame coverage:

- `UI-BTN-006-DEF`: `CharacterSelectScene` character name DOM input background frame in create mode.
- Runtime path lives under `client/public/assets/generated/ui/frames/UI-BTN-006-DEF.png`.

Production rule:

- `CharacterSelectScene.preload()` loads `UI-BTN-006-DEF` through the isolated `ui_frame_character_select_name_input` key in addition to the existing character row and class card frame keys.
- `_createNameInput()` assigns `data-aeterna-frame-key`, `data-aeterna-frame-path`, and a CSS `background-image` using `UI-BTN-006-DEF.png` to the character name DOM input.
- DOM input placement uses the game canvas CSS scale so the input remains inside the visible viewport under Phaser Scale.FIT.
- Input value, placeholder, max length, aria label, Enter-to-create handler, class selection, validation, and character creation request remain dynamic DOM/Auth logic.
- `?debugScene=characterSelect&renderer=canvas&characterSelectFrameQa=1` writes `document.body.dataset.aeternaCharacterSelectFrameQa` with input frame CSS background URLs, DOM display sizes, rendered count, expected count, missing frame keys, mode, and visible canvas count.

Exit criteria:

- Unit tests verify the character select name input frame preload/CSS/QA contract and canvas-scale DOM placement.
- Browser QA confirms create mode reports `nameInputFrame.renderedCount: 1`, `nameInputFrame.expectedCount: 1`, CSS background using `UI-BTN-006-DEF.png`, `missingFrameKeys: []`, and no current-navigation warn/error logs.
- Local Playwright QA confirms the DOM input is visible inside the viewport, carries the frame data attributes, and keeps the canvas nonblank.
- Client typecheck and build pass after the runtime wiring.

Current QA state:

- Phase 72 is runtime-verified as of 2026-06-13.
- `npx vitest run --config tests/vitest.config.ts tests/unit/uiFrameAssets.test.ts` passes with 22 tests after the `CharacterSelectScene` name input frame wiring.
- `npm --prefix client run typecheck` and `npm run build:client` pass after the name input frame wiring.
- In-app Browser QA on `?debugScene=characterSelect&renderer=canvas&characterSelectFrameQa=1&qaRun=phase72-fix` reports `status: "ready"`, `mode: "create"`, `nameInputFrame.renderedCount: 1`, `nameInputFrame.expectedCount: 1`, `missingFrameKeys: []`, one `160x34` visible DOM input with `ui_frame_character_select_name_input`, viewport-contained coordinates `x: 560, y: 590`, one visible canvas, and no current-navigation warn/error logs.
- Local Playwright QA on the same URL confirms `CharacterSelectScene.ts`, `UI-INV-001-DEF.png`, `UI-INV-002-DEF.png`, `UI-BTN-006-DEF.png`, and sampled class illustration PNGs respond at `200`; the input uses CSS `url("/assets/generated/ui/frames/UI-BTN-006-DEF.png")`; the input stays within the `1280x720` viewport; no warn/error console logs are emitted; and `49/49` sampled canvas pixels are nonblank.
- Visual evidence was captured at `C:\Users\crisi\AppData\Local\Temp\aeterna-character-select-name-input-frame-phase72.png`.

## Phase 73: Character Select Create Action Button Frame Runtime Wiring

Runtime character select create action button frame coverage:

- `UI-BTN-006-DEF`: `CharacterSelectScene` create-mode `[ 캐릭터 생성 ]` action button background frame.
- Runtime path lives under `client/public/assets/generated/ui/frames/UI-BTN-006-DEF.png`.

Production rule:

- `CharacterSelectScene.preload()` loads `UI-BTN-006-DEF` through the isolated `ui_frame_character_select_action_button` key in addition to the existing character row, class card, and name input frame keys.
- `_addCharacterSelectActionButton()` renders the Aseprite button frame at `230x38`, overlays the dynamic label text, and keeps the transparent hit area as the pointer target.
- Create validation, selected class state, error text, name input Enter handling, and character creation request remain dynamic Phaser/DOM/Auth logic.
- `?debugScene=characterSelect&renderer=canvas&characterSelectFrameQa=1` writes `actionButtonFrame`, `selectedClassId`, and `errorText` into `document.body.dataset.aeternaCharacterSelectFrameQa` so button rendering and validation behavior can be checked together.

Exit criteria:

- Unit tests verify the action button frame preload/render/QA contract.
- Browser QA confirms create mode reports `actionButtonFrame.renderedCount: 1`, `actionButtonFrame.expectedCount: 1`, `missingFrameKeys: []`, and no current-navigation warn/error logs.
- Click QA confirms pressing the framed create button with no selected class updates `errorText` to `클래스를 선택해 주세요.` without breaking the frame probe.
- Client typecheck and build pass after the runtime wiring.

Current QA state:

- Phase 73 is runtime-verified as of 2026-06-13.
- `npx vitest run --config tests/vitest.config.ts tests/unit/uiFrameAssets.test.ts` passes with 22 tests after the `CharacterSelectScene` action button frame wiring.
- `npm --prefix client run typecheck` passes after the action button frame wiring.
- `npm run build:client` passes after the action button frame wiring.
- In-app Browser QA on `?debugScene=characterSelect&renderer=canvas&characterSelectFrameQa=1&qaRun=phase73` reports `status: "ready"`, `mode: "create"`, `nameInputFrame.renderedCount: 1`, `actionButtonFrame.renderedCount: 1`, `actionButtonFrame.expectedCount: 1`, `missingFrameKeys: []`, one visible canvas, and no current-navigation warn/error logs.
- In-app Browser click QA on the framed create button changes `errorText` from `""` to `클래스를 선택해 주세요.` while preserving `status: "ready"` and `missingFrameKeys: []`.
- Local Playwright QA on `?debugScene=characterSelect&renderer=canvas&characterSelectFrameQa=1&qaRun=phase73-local` confirms `CharacterSelectScene.ts`, `UI-INV-001-DEF.png`, `UI-INV-002-DEF.png`, and `UI-BTN-006-DEF.png` return `200`; click QA reproduces the validation error text; no warn/error console logs are emitted; and `49/49` sampled canvas pixels are nonblank.
- Visual evidence was captured at `C:\Users\crisi\AppData\Local\Temp\aeterna-character-select-action-button-frame-phase73.png`.

## Phase 74: Ending Story Panel And Prompt Track Frame Runtime Wiring

Runtime ending UI frame coverage:

- `UI-HUD-006-DEF`: `EndingScene` epilogue story panel frame.
- `UI-BTN-006-DEF`: `EndingScene` bottom input prompt track frame.
- Runtime paths live under `client/public/assets/generated/ui/frames/UI-HUD-006-DEF.png` and `client/public/assets/generated/ui/frames/UI-BTN-006-DEF.png`.

Production rule:

- `EndingScene.preload()` loads `UI-HUD-006-DEF` through the isolated `ui_frame_ending_story_panel` key and `UI-BTN-006-DEF` through the isolated `ui_frame_ending_prompt_track` key.
- `_addEndingFrame()` renders the Aseprite frame first and falls back to the previous rectangle only when the frame texture is missing.
- The story panel uses a Phaser readability layer inside the frame so the Aseprite border remains visible while epilogue text stays legible.
- Ending CG, title/body/epilogue text fade timing, playthrough text, prompt animation, and title return input remain dynamic Phaser UI logic.
- `?debugScene=ending&renderer=canvas&endingFrameQa=1` starts `EndingScene` with QA data and writes `document.body.dataset.aeternaEndingFrameQa` with story panel frame, prompt track frame, missing frame keys, ending type, and visible canvas count.
- `LoadingProgress.complete()` now removes the HTML loading overlay through both `transitionend` and a 700ms fallback timer, preventing transition suppression from covering debug-scene visual QA.

Exit criteria:

- Unit tests verify the ending frame preload/render/QA contract and debug route trigger.
- Browser QA confirms the ending frame probe reports `storyPanelFrame.renderedCount: 1`, `promptTrackFrame.renderedCount: 1`, `missingFrameKeys: []`, one visible canvas, and no current-navigation warn/error logs.
- Local Playwright QA confirms `EndingScene.ts`, `LoadingProgress.ts`, `UI-HUD-006-DEF.png`, `UI-BTN-006-DEF.png`, and `ending_a_guardian.png` respond with `200`.
- Local Playwright visual QA confirms the loading overlay is removed, the canvas is nonblank, and the story panel does not hide the ending text.
- Client typecheck and build pass after the runtime wiring.

Current QA state:

- Phase 74 is runtime-verified as of 2026-06-13.
- `npx vitest run --config tests/vitest.config.ts tests/unit/uiFrameAssets.test.ts` passes with 23 tests after the `EndingScene` frame wiring.
- `npm --prefix client run typecheck` passes after the `EndingScene` frame wiring.
- In-app Browser QA on `?debugScene=ending&renderer=canvas&endingFrameQa=1&endingType=TRUE_GUARDIAN&qaRun=phase74-final-browser` reports `status: "ready"`, `endingType: "TRUE_GUARDIAN"`, `storyPanelFrame.renderedCount: 1`, `storyPanelFrame.expectedCount: 1`, `promptTrackFrame.renderedCount: 1`, `promptTrackFrame.expectedCount: 1`, `missingFrameKeys: []`, one visible canvas, and no current-navigation warn/error logs.
- Local Playwright QA on `?debugScene=ending&renderer=canvas&endingFrameQa=1&endingType=TRUE_GUARDIAN&qaRun=phase74-final-local` confirms `EndingScene.ts`, `LoadingProgress.ts`, `UI-HUD-006-DEF.png`, `UI-BTN-006-DEF.png`, and `ending_a_guardian.png` return `200`; loading overlay `present: false`; no warn/error console logs are emitted; and `160/160` sampled canvas pixels are nonblank.
- Visual evidence was captured at `C:\Users\crisi\AppData\Local\Temp\aeterna-ending-frame-phase74-final.png`.

## Phase 75: Field Portal Teleport Panel And Button Frame Runtime Wiring

Runtime field portal UI frame coverage:

- `UI-HUD-006-DEF`: `ZoneTeleportManager` field portal teleport panel frame.
- `UI-BTN-006-DEF`: `ZoneTeleportManager` `[ 이동 ]` and `[ 취소 ]` portal action button frames.
- Runtime paths live under `client/public/assets/generated/ui/frames/UI-HUD-006-DEF.png` and `client/public/assets/generated/ui/frames/UI-BTN-006-DEF.png`.

Production rule:

- `GameScene.preload()` calls `preloadZoneTeleportUiFrameTextures()` so portal panel/button frames are queued before the field scene starts.
- `_addPortalUiFrame()` renders the Aseprite panel/button image first and falls back to the previous rectangle only when the frame texture is missing.
- `_addPortalButton()` overlays the dynamic label and transparent hit area on top of the Aseprite button frame, preserving hover color and callback behavior.
- Portal name, target zone label, pointer hit area, hover color, cancel callback, and actual teleport callback remain dynamic Phaser UI logic.
- `?debugScene=game&renderer=canvas&zoneTeleportFrameQa=1` starts a deterministic offline QA portal through `_startZoneTeleportFrameQa()` and writes `document.body.dataset.aeternaZoneTeleportFrameQa` with panel/button frame counts, display sizes, missing frame keys, portal metadata, and visible canvas count.

Exit criteria:

- Unit tests verify the field portal frame preload/render/QA contract and debug route trigger.
- Browser QA confirms the portal frame probe reports `panelFrame.renderedCount: 1`, `buttonFrame.renderedCount: 2`, `missingFrameKeys: []`, one visible canvas, and no current-navigation warn/error logs.
- Local Playwright QA confirms `GameScene.ts`, `ZoneTeleportManager.ts`, `UI-HUD-006-DEF.png`, and `UI-BTN-006-DEF.png` respond with `200`.
- Local Playwright visual QA confirms the field map is visible, the portal panel/buttons render on top of the map after the chapter title card clears, and the canvas is nonblank.
- Client typecheck and build pass after the runtime wiring.

Current QA state:

- Phase 75 is runtime-verified as of 2026-06-13.
- `npx vitest run --config tests/vitest.config.ts tests/unit/uiFrameAssets.test.ts tests/unit/spriteResourceManifest.test.ts` passes with 52 tests after the `ZoneTeleportManager` frame wiring.
- `npm --prefix client run typecheck` passes after the portal frame wiring.
- In-app Browser QA on `?debugScene=game&renderer=canvas&zone=aether_plains&zoneTeleportFrameQa=1&qaRun=phase75-browser-fresh` reports `status: "ready"`, `portalId: "qa_portal_memory_forest"`, `portalName: "기억의 숲 관문"`, `targetZoneId: "memory_forest"`, `panelFrame.renderedCount: 1`, `panelFrame.expectedCount: 1`, `buttonFrame.renderedCount: 2`, `buttonFrame.expectedCount: 2`, `missingFrameKeys: []`, one visible canvas, no loading overlay, and no current-navigation warn/error logs.
- Local Playwright QA on `?debugScene=game&renderer=canvas&zone=aether_plains&zoneTeleportFrameQa=1&qaRun=phase75-local-probe` confirms `GameScene.ts`, `ZoneTeleportManager.ts`, `UI-HUD-006-DEF.png`, and `UI-BTN-006-DEF.png` return `200`; no warn/error console logs are emitted; and `160/160` sampled canvas pixels are nonblank.
- Local Playwright visual QA on `?debugScene=game&renderer=canvas&zone=aether_plains&zoneTeleportFrameQa=1&qaRun=phase75-final-visible` confirms the portal panel and two framed portal action buttons are visible over the field after the chapter title card clears.
- Visual evidence was captured at `C:\Users\crisi\AppData\Local\Temp\aeterna-zone-teleport-frame-phase75-visible.png`.

## Phase 76: World Map Background Runtime Wiring

Runtime world map background coverage:

- `ERB-BG-FAR-DAY`: `WorldScene` full-screen world map background image for the default/current `aether_plains` route.
- Runtime path lives under `client/public/assets/generated/environment/backgrounds/ERB-BG-FAR-DAY.png`.

Production rule:

- `WorldScene.preload()` resolves the current zone through `resolveZoneBackground()` and queues its `farPath` before the scene is created.
- `_addWorldBackground()` renders the Aseprite environment background image first at the full game canvas size.
- The old solid color rectangle remains only as a missing-texture safety fallback.
- World map node icons, connection lines, keyboard highlight, era controls, selected-zone panel, and travel callback remain dynamic Phaser UI logic.
- `?debugScene=world&renderer=canvas&worldFrameQa=1` writes `document.body.dataset.aeternaWorldFrameQa` with the background image key/path, rendered count, display size, missing keys, zone/era metadata, and visible canvas count.

Exit criteria:

- Unit tests verify the world map background preload/render/fallback/QA contract.
- Browser QA confirms the world background probe reports `backgroundImage.renderedCount: 1`, `backgroundImage.expectedCount: 1`, `missingFrameKeys: []`, one visible canvas, and no current-navigation warn/error logs.
- Browser asset inventory confirms `ERB-BG-FAR-DAY.png`, the worldmap UI frames, and core worldmap icons are observed on the page.
- Local Playwright QA confirms `WorldScene.ts`, `ERB-BG-FAR-DAY.png`, `UI-HUD-003-DEF.png`, `UI-HUD-004-DEF.png`, and `zone_aether_plains.png` respond with `200`.
- Local Playwright visual QA confirms the Aseprite environment background is visible behind the world map node graph and does not cover labels or controls.
- Client typecheck and build pass after the runtime wiring.

Current QA state:

- Phase 76 is runtime-verified as of 2026-06-13.
- `npm --prefix client run typecheck` passes after the `WorldScene` background wiring.
- `npx vitest run --config tests/vitest.config.ts tests/unit/spriteResourceManifest.test.ts tests/unit/uiFrameAssets.test.ts` passes with 53 tests after the `WorldScene` background contract was added.
- `npm run build:client` passes after the runtime wiring.
- In-app Browser QA on `?debugScene=world&renderer=canvas&worldFrameQa=1&era=present&qaRun=phase76` reports `status: "ready"`, `zoneId: "aether_plains"`, `eraId: "present"`, `backgroundImage.key: "zone_bg_far_aether_plains_present_day"`, `backgroundImage.path: "assets/generated/environment/backgrounds/ERB-BG-FAR-DAY.png"`, `backgroundImage.renderedCount: 1`, `backgroundImage.expectedCount: 1`, `backgroundImage.displayWidth: 1920`, `backgroundImage.displayHeight: 1080`, `missingFrameKeys: []`, one visible canvas, and no current-navigation warn/error logs.
- Browser page asset inventory confirms `ERB-BG-FAR-DAY.png`, `UI-HUD-003-DEF.png`, `UI-HUD-004-DEF.png`, `zone_aether_plains.png`, and `zone_memory_forest.png` are observed as image resources.
- Local Playwright QA on `?debugScene=world&renderer=canvas&worldFrameQa=1&era=present&qaRun=phase76-local` confirms `WorldScene.ts`, `ERB-BG-FAR-DAY.png`, `UI-HUD-003-DEF.png`, `UI-HUD-004-DEF.png`, and `zone_aether_plains.png` return `200`; no warn/error console logs are emitted; the loading overlay is removed; and `160/160` sampled canvas pixels are nonblank.
- Visual evidence was captured at `C:\Users\crisi\AppData\Local\Temp\aeterna-world-background-phase76.png`.

## Phase 77: World Map Action Button Frame Runtime Wiring

Runtime world map action button frame coverage:

- `UI-BTN-006-DEF`: `WorldScene` Q/E era navigation buttons, return-to-town button, and selected-zone travel button backgrounds.
- Runtime path lives under `client/public/assets/generated/ui/frames/UI-BTN-006-DEF.png`.

Production rule:

- `WorldScene.preload()` loads `UI-BTN-006-DEF` through the isolated `ui_frame_world_action_button` key.
- `_addWorldActionButton()` renders the Aseprite button frame first, overlays the dynamic Phaser text label, and binds the same pointer callback to both frame and text.
- Q/E era cycling, ESC return, selected-zone travel, keyboard navigation, hover tint, and text labels remain dynamic Phaser UI logic.
- `?debugScene=world&renderer=canvas&worldFrameQa=1` opens the current unlocked zone panel so the travel button frame is included in QA, and writes `actionButtonFrame` into `document.body.dataset.aeternaWorldFrameQa`.
- The QA route skips the async encounter request and writes deterministic encounter text, so frame QA does not depend on API/server availability.

Exit criteria:

- Unit tests verify the world map action button preload/render/QA contract.
- Browser QA confirms `actionButtonFrame.renderedCount: 4`, `actionButtonFrame.expectedCount: 4`, `missingFrameKeys: []`, one visible canvas, and no current-navigation warn/error logs.
- Browser asset inventory confirms `UI-BTN-006-DEF.png` is observed with the world map frame/background assets.
- Local Playwright QA confirms `WorldScene.ts`, `UI-BTN-006-DEF.png`, `UI-HUD-003-DEF.png`, `UI-HUD-004-DEF.png`, `zone_aether_plains.png`, and `ERB-BG-FAR-DAY.png` respond with `200`.
- Local Playwright visual QA confirms the four framed buttons are visible, text remains readable, and no failed non-favicon responses occur.
- Client typecheck and build pass after the runtime wiring.

Current QA state:

- Phase 77 is runtime-verified as of 2026-06-13.
- `npm --prefix client run typecheck` passes after the `WorldScene` action button frame wiring.
- `npx vitest run --config tests/vitest.config.ts tests/unit/spriteResourceManifest.test.ts tests/unit/uiFrameAssets.test.ts` passes with 53 tests after the action button frame contract was added.
- In-app Browser QA on `?debugScene=world&renderer=canvas&worldFrameQa=1&era=present&qaRun=phase77-fix` reports `status: "ready"`, `actionButtonFrame.key: "ui_frame_world_action_button"`, `actionButtonFrame.path: "assets/generated/ui/frames/UI-BTN-006-DEF.png"`, `actionButtonFrame.renderedCount: 4`, `actionButtonFrame.expectedCount: 4`, display sizes `76x28`, `76x28`, `220x30`, `194x32`, `missingFrameKeys: []`, one visible canvas, no loading overlay, and no current-navigation warn/error logs.
- Browser page asset inventory confirms `UI-BTN-006-DEF.png`, `UI-HUD-003-DEF.png`, `UI-HUD-004-DEF.png`, `zone_aether_plains.png`, and `ERB-BG-FAR-DAY.png` are observed as image resources.
- Local Playwright QA on `?debugScene=world&renderer=canvas&worldFrameQa=1&era=present&qaRun=phase77-local-fix` confirms `WorldScene.ts`, `UI-BTN-006-DEF.png`, `UI-HUD-003-DEF.png`, `UI-HUD-004-DEF.png`, `zone_aether_plains.png`, and `ERB-BG-FAR-DAY.png` return `200`; no warn/error console logs are emitted; there are no failed non-favicon responses; the loading overlay is removed; and `160/160` sampled canvas pixels are nonblank.
- Visual evidence was captured at `C:\Users\crisi\AppData\Local\Temp\aeterna-world-action-buttons-phase77.png`.

## Phase 78: Cutscene Skip And Next Button Frame Runtime Wiring

Runtime cutscene UI frame coverage:

- `UI-HUD-006-DEF`: `CutsceneScene` lower dialogue box frame.
- `UI-BTN-006-DEF`: `CutsceneScene` skip and next action button frames.
- Runtime paths live under `client/public/assets/generated/ui/frames/UI-HUD-006-DEF.png` and `client/public/assets/generated/ui/frames/UI-BTN-006-DEF.png`.

Production rule:

- `CutsceneScene.preload()` loads `UI-HUD-006-DEF` through `ui_frame_UI-HUD-006-DEF` and `UI-BTN-006-DEF` through the isolated `ui_frame_cutscene_action_button` key.
- `_addCutsceneFrame()` renders the Aseprite dialogue frame first and falls back to the previous rectangle only when the frame texture is missing.
- `_addCutsceneActionButton()` renders the Aseprite button frame first, overlays the dynamic Phaser text label, and binds the same pointer callback to both frame and text.
- Cutscene title/body/speaker text, progress label, keyboard advance/skip input, and scene return flow remain dynamic Phaser UI logic.
- `?debugScene=cutscene&renderer=canvas&cutsceneFrameQa=1` writes `document.body.dataset.aeternaCutsceneFrameQa` with dialogue box frame, action button frame, missing frame keys, dialogue index, and visible canvas count.

Exit criteria:

- Unit tests verify the cutscene dialogue box/action button preload/render/QA contract and debug route trigger.
- Browser QA confirms `dialogueBoxFrame.renderedCount: 1`, `actionButtonFrame.renderedCount: 2`, `missingFrameKeys: []`, one visible canvas, and no current-navigation warn/error logs.
- Browser asset inventory confirms `CutsceneScene.ts`, `UI-HUD-006-DEF.png`, and `UI-BTN-006-DEF.png` are observed on the page.
- Local Playwright QA confirms `CutsceneScene.ts`, `UI-HUD-006-DEF.png`, and `UI-BTN-006-DEF.png` respond with `200`.
- Local Playwright visual QA confirms the skip and next button frames are visible and text remains readable.
- Client typecheck and build pass after the runtime wiring.

Current QA state:

- Phase 78 is runtime-verified as of 2026-06-13.
- `npm --prefix client run typecheck` passes after the `CutsceneScene` action button frame wiring.
- `npx vitest run --config tests/vitest.config.ts tests/unit/uiFrameAssets.test.ts` passes with 24 tests after the cutscene action button frame contract was added.
- `npm run build:client` passes after the runtime wiring.
- In-app Browser QA on `?debugScene=cutscene&renderer=canvas&cutsceneFrameQa=1&qaRun=phase78-browser` reports `status: "ready"`, `cutsceneId: "debug-cutscene-frame"`, `dialogueBoxFrame.renderedCount: 1`, `dialogueBoxFrame.expectedCount: 1`, `actionButtonFrame.renderedCount: 2`, `actionButtonFrame.expectedCount: 2`, display sizes `120x34` and `184x34`, `missingFrameKeys: []`, one visible canvas, and no current-navigation warn/error logs.
- Browser page asset inventory confirms `CutsceneScene.ts`, `UI-HUD-006-DEF.png`, and `UI-BTN-006-DEF.png` are observed as page assets.
- Local Playwright QA on `?debugScene=cutscene&renderer=canvas&cutsceneFrameQa=1&qaRun=phase78-local` confirms `CutsceneScene.ts`, `UI-HUD-006-DEF.png`, and `UI-BTN-006-DEF.png` return `200`; no warn/error console logs are emitted; there are no failed non-favicon responses; the loading overlay is removed; and `43/160` sampled canvas pixels are nonblank.
- Visual evidence was captured at `C:\Users\crisi\AppData\Local\Temp\aeterna-cutscene-action-buttons-phase78.png`.

## Phase 79: Tutorial Flow Skip Button Frame Runtime Wiring

Runtime tutorial UI frame coverage:

- `UI-HUD-005-DEF`: `TutorialFlowManager` tutorial guidance panel frame.
- `UI-BTN-006-DEF`: `TutorialFlowManager` skip button frame.
- Runtime paths live under `client/public/assets/generated/ui/frames/UI-HUD-005-DEF.png` and `client/public/assets/generated/ui/frames/UI-BTN-006-DEF.png`.

Production rule:

- `preloadTutorialFlowUiFrameTextures()` loads `UI-HUD-005-DEF` through `ui_frame_tutorial_flow_panel` and `UI-BTN-006-DEF` through the isolated `ui_frame_tutorial_flow_skip_button` key.
- `TutorialFlowManager.showStep()` renders the Aseprite panel frame first, keeps the rectangle as a low-alpha readability/hit layer, and renders the skip button Aseprite frame before overlaying the dynamic `[스킵] ESC` text.
- The skip button frame, fallback rectangle, and text all bind to the same `skip()` callback, preserving mouse skip behavior while ESC remains keyboard-driven.
- Tutorial title/body/progress text, trigger handling, localStorage progress persistence, overlay dimmer, and event advancement remain dynamic Phaser UI logic.
- `?debugScene=tutorialFlow&renderer=canvas&tutorialFlowFrameQa=1` writes `document.body.dataset.aeternaTutorialFlowFrameQa` with panel frame, skip button frame, missing frame keys, panel content bounds, current step, and visible canvas count.

Exit criteria:

- Unit tests verify the tutorial panel/skip button preload/render/QA contract and debug route trigger.
- Browser QA confirms `renderedFrameCount: 2`, `expectedFrameCount: 2`, `panelFrame.renderedCount: 1`, `skipButtonFrame.renderedCount: 1`, `missingFrameKeys: []`, one visible canvas, and no current-navigation warn/error logs.
- Browser asset inventory confirms `TutorialFlowQaScene.ts`, `TutorialFlowManager.ts`, `UI-HUD-005-DEF.png`, and `UI-BTN-006-DEF.png` are observed on the page.
- Local Playwright QA confirms `TutorialFlowQaScene.ts`, `TutorialFlowManager.ts`, `UI-HUD-005-DEF.png`, and `UI-BTN-006-DEF.png` respond with `200`.
- Local Playwright click QA confirms clicking the framed skip button switches the QA payload to `status: "hidden"` and `active: false`.
- Client typecheck and build pass after the runtime wiring.

Current QA state:

- Phase 79 is runtime-verified as of 2026-06-13.
- `npm --prefix client run typecheck` passes after the `TutorialFlowManager` skip button frame wiring.
- `npx vitest run --config tests/vitest.config.ts tests/unit/uiFrameAssets.test.ts` passes with 24 tests after the tutorial skip button frame contract was added.
- In-app Browser QA on `?debugScene=tutorialFlow&renderer=canvas&tutorialFlowFrameQa=1&qaRun=phase79-browser` reports `status: "ready"`, `renderedFrameKeys: ["ui_frame_tutorial_flow_panel", "ui_frame_tutorial_flow_skip_button"]`, `renderedFrameCount: 2`, `expectedFrameCount: 2`, `panelFrame.renderedCount: 1`, `skipButtonFrame.renderedCount: 1`, `skipButtonFrame.displayWidth: 126`, `skipButtonFrame.displayHeight: 30`, `missingFrameKeys: []`, one visible canvas, and no current-navigation warn/error logs. The loading overlay is removed after its transition window.
- Browser page asset inventory confirms `TutorialFlowQaScene.ts`, `TutorialFlowManager.ts`, `UI-HUD-005-DEF.png`, and `UI-BTN-006-DEF.png` are observed as page assets.
- Local Playwright QA on `?debugScene=tutorialFlow&renderer=canvas&tutorialFlowFrameQa=1&qaRun=phase79-local` confirms `TutorialFlowQaScene.ts`, `TutorialFlowManager.ts`, `UI-HUD-005-DEF.png`, and `UI-BTN-006-DEF.png` return `200`; no warn/error console logs are emitted; there are no failed non-favicon responses; the loading overlay is removed; and `160/160` sampled canvas pixels are nonblank.
- Local Playwright click QA on `?debugScene=tutorialFlow&renderer=canvas&tutorialFlowFrameQa=1&qaRun=phase79-click` confirms the framed skip button changes the QA payload to `status: "hidden"` and `active: false`.
- Visual evidence was captured at `C:\Users\crisi\AppData\Local\Temp\aeterna-tutorial-skip-button-frame-phase79.png`.

## Phase 80: Skill Tree Action Button Frame Runtime Wiring

Runtime skill tree UI frame coverage:

- `UI-SET-002-DEF`: `SkillTreeUI` main panel frame.
- `UI-SET-003-DEF`: `SkillTreeUI` detail panel frame.
- `UI-BTN-006-DEF`: `SkillTreeUI` main close/reset button frames and detail unlock/upgrade/close button frames.
- Runtime paths live under `client/public/assets/generated/ui/frames/UI-SET-002-DEF.png`, `client/public/assets/generated/ui/frames/UI-SET-003-DEF.png`, and `client/public/assets/generated/ui/frames/UI-BTN-006-DEF.png`.

Production rule:

- `preloadSkillTreeUiFrameTextures()` loads `UI-BTN-006-DEF` through the isolated `ui_frame_skill_tree_action_button` key in addition to the existing main/detail panel frame keys.
- `_addSkillTreeActionButton()` renders the Aseprite action button frame first, overlays the dynamic Phaser text label, and binds the same pointer callback to frame, fallback, and text.
- `skillTreeQa=1` uses deterministic `DEFAULT_SKILLS` and grants local QA skill points so panel/detail/action button frame rendering can be verified without the skill API.
- `?debugScene=lobby&renderer=canvas&skillTreeQa=1` writes `document.body.dataset.aeternaSkillTreeFrameQa` with main panel frame, detail panel frame, action button frame, missing frame keys, and visible canvas count.
- Skill names, requirement checks, unlock/upgrade behavior, class color stroke, selection highlight, and reset confirmation remain dynamic Phaser UI/gameplay logic.

Exit criteria:

- Unit tests verify the SkillTreeUI main/detail/action button preload/render/QA contract, cache-busted debug preload path, and deterministic QA skill data path.
- Browser QA confirms one visible canvas, no loading overlay, and no current-navigation warn/error logs.
- Local Playwright QA confirms `SkillTreeUI.ts`, `LobbyScene.ts`, `UI-SET-002-DEF.png`, `UI-SET-003-DEF.png`, and `UI-BTN-006-DEF.png` return `200`.
- Local Playwright QA confirms initial `actionButtonFrame.renderedCount: 4`, `expectedCount: 4`, `renderedMainCount: 2`, `renderedDetailCount: 2`, and `missingFrameKeys: []`.
- Local Playwright click QA confirms clicking the detail close button changes `detailPanelFrame.renderedCount` and `expectedCount` to `0`, with `actionButtonFrame.renderedCount: 2` and `renderedDetailCount: 0`.
- Client typecheck and build pass after the runtime wiring.

Current QA state:

- Phase 80 is runtime-verified as of 2026-06-13.
- `npm --prefix client run typecheck` passes after the `SkillTreeUI` action button frame wiring.
- `npx vitest run --config tests/vitest.config.ts tests/unit/uiFrameAssets.test.ts tests/unit/spriteResourceManifest.test.ts` passes with 53 tests after the skill tree action button frame contract was added.
- `npm run build:client` passes after the runtime wiring.
- In-app Browser QA on `?debugScene=lobby&renderer=canvas&zone=aether_plains&skillTreeQa=1&class=ether_knight&level=15&qaRun=phase80-browser` confirms one visible canvas, no loading overlay, and no current-navigation warn/error logs. The Browser evaluate surface did not expose the QA dataset, so the dataset assertion is covered by local Playwright.
- Local Playwright QA on `?debugScene=lobby&renderer=canvas&zone=aether_plains&skillTreeQa=1&class=ether_knight&level=15&qaRun=phase80-local` confirms `SkillTreeUI.ts`, `LobbyScene.ts`, `UI-SET-002-DEF.png`, `UI-SET-003-DEF.png`, and `UI-BTN-006-DEF.png` return `200`; no page errors or unexpected console warn/error logs are emitted; there are no failed non-favicon responses; and `160/160` sampled canvas pixels are nonblank.
- Local Playwright detail close click QA confirms `currentDetailOpen` changes from `true` to `false`, `detailPanelFrame.renderedCount` changes from `1` to `0`, and `actionButtonFrame.renderedCount` changes from `4` to `2`.
- Visual evidence was captured at `C:\Users\crisi\AppData\Local\Temp\aeterna-skill-tree-action-buttons-phase80.png`.

## Phase 81: Coachmark Overlay Frame Runtime Wiring

Runtime onboarding coachmark UI frame coverage:

- `UI-HUD-005-DEF`: `CoachmarkOverlay` guidance panel frame.
- `UI-BTN-006-DEF`: `CoachmarkOverlay` skip and next action button frames.
- Runtime paths live under `client/public/assets/generated/ui/frames/UI-HUD-005-DEF.png` and `client/public/assets/generated/ui/frames/UI-BTN-006-DEF.png`.

Production rule:

- `preloadCoachmarkUiFrameTextures()` loads `UI-HUD-005-DEF` through `ui_frame_coachmark_panel` and `UI-BTN-006-DEF` through the isolated `ui_frame_coachmark_action_button` key.
- `CoachmarkOverlay.show()` renders the Aseprite panel frame first, overlays the dynamic title/body/hint text, and renders skip/next action button frames before their dynamic labels.
- The same click callback is bound through the action button hit area so framed buttons preserve `skip()` and `advance()` behavior.
- Highlight rectangle placement, click/key/auto advance trigger handling, skip callbacks, telemetry callbacks, and queue ownership remain dynamic Phaser/onboarding logic.
- `?debugScene=coachmark&renderer=canvas&coachmarkFrameQa=1` starts `CoachmarkQaScene` and writes `document.body.dataset.aeternaCoachmarkFrameQa` with panel/action button frame counts, display sizes, missing frame keys, and visible canvas count.

Exit criteria:

- Unit tests verify the `CoachmarkOverlay` panel/action button preload/render/QA contract and `debugScene=coachmark` registration.
- Browser QA confirms `panelFrame.renderedCount: 1`, `actionButtonFrame.renderedCount: 2`, `missingFrameKeys: []`, one visible canvas, no loading overlay, and no current-navigation warn/error logs.
- Local Playwright QA confirms `CoachmarkOverlay.ts`, `CoachmarkQaScene.ts`, `UI-HUD-005-DEF.png`, and `UI-BTN-006-DEF.png` return `200`.
- Local Playwright click QA confirms clicking the framed next button changes the QA payload to `status: "hidden"`, `active: false`, `panelFrame.renderedCount: 0`, and `actionButtonFrame.renderedCount: 0`.
- Client typecheck and build pass after the runtime wiring.

Current QA state:

- Phase 81 is runtime-verified as of 2026-06-13.
- `npm --prefix client run typecheck` passes after the `CoachmarkOverlay` frame wiring.
- `npx vitest run --config tests/vitest.config.ts tests/unit/uiFrameAssets.test.ts tests/unit/spriteResourceManifest.test.ts` passes with 54 tests after the coachmark frame contract was added.
- In-app Browser QA on `?debugScene=coachmark&renderer=canvas&coachmarkFrameQa=1&qaRun=phase81-browser-rerun` reports `status: "ready"`, `currentId: "coachmark.frame.qa"`, `panelFrame.renderedCount: 1`, `panelFrame.expectedCount: 1`, `actionButtonFrame.renderedCount: 2`, `actionButtonFrame.expectedCount: 2`, display sizes `92x32` and `96x32`, `missingFrameKeys: []`, one visible canvas, no loading overlay, and no current-navigation warn/error logs.
- Local Playwright QA on `?debugScene=coachmark&renderer=canvas&coachmarkFrameQa=1&qaRun=phase81-local-rerun` confirms `CoachmarkOverlay.ts`, `CoachmarkQaScene.ts`, `UI-HUD-005-DEF.png`, and `UI-BTN-006-DEF.png` return `200`; no page errors or console warn/error logs are emitted; there are no failed non-favicon responses; and `160/160` sampled canvas pixels are nonblank.
- Local Playwright click QA confirms the framed next button changes `status` from `ready` to `hidden`, clears the active coachmark, and drops panel/action button rendered counts to `0`.
- Visual evidence was captured at `C:\Users\crisi\AppData\Local\Temp\aeterna-coachmark-action-buttons-phase81.png`.

## Phase 82: TutorialManager DOM Frame Runtime Wiring

Runtime legacy tutorial UI frame coverage:

- `UI-HUD-005-DEF`: `TutorialManager` 5-step tutorial speech bubble panel frame.
- `UI-BTN-006-DEF`: `TutorialManager` skip and next action button frames.
- Runtime paths live under `client/public/assets/generated/ui/frames/UI-HUD-005-DEF.png` and `client/public/assets/generated/ui/frames/UI-BTN-006-DEF.png`.

Production rule:

- `preloadTutorialManagerUiFrameTextures()` loads `UI-HUD-005-DEF` through `ui_frame_tutorial_manager_panel` and `UI-BTN-006-DEF` through the isolated `ui_frame_tutorial_manager_action_button` key.
- `TutorialManager.renderOverlay()` applies those frames to the legacy DOM overlay through CSS `background-image` layers, while keeping the SVG highlight mask, stage label/body text, skip/next callbacks, localStorage progress, and optional server sync dynamic.
- DOM inline `style="..."` strings must use single-quoted asset URLs such as `url('/assets/generated/ui/frames/UI-HUD-005-DEF.png')`; double-quoted URLs inside the HTML attribute were verified to parse as `url("")` and drop the frame image.
- `?debugScene=tutorialManager&renderer=canvas&tutorialManagerFrameQa=1` starts `TutorialManagerQaScene` and writes `document.body.dataset.aeternaTutorialManagerFrameQa` with panel/action button frame counts, CSS background URLs, display sizes, current step, missing frame keys, and visible canvas count.

Exit criteria:

- Unit tests verify the `TutorialManager` panel/action button preload/render/QA contract, single-quoted DOM URL contract, and `debugScene=tutorialManager` registration.
- Browser QA confirms `panelFrame.renderedCount: 1`, `actionButtonFrame.renderedCount: 2`, `missingFrameKeys: []`, CSS backgrounds point at the real frame PNGs, one visible canvas, no current-navigation warn/error logs, and the loading overlay is removed after its transition window.
- Browser click QA confirms the framed next button advances the tutorial payload from `currentStepName: "movement"` to `currentStepName: "combat"`.
- Local Playwright QA confirms `TutorialManager.ts`, `TutorialManagerQaScene.ts`, `UI-HUD-005-DEF.png`, and `UI-BTN-006-DEF.png` return `200`.
- Client typecheck and build pass after the runtime wiring.

Current QA state:

- Phase 82 is runtime-verified as of 2026-06-13.
- `npm --prefix client run typecheck` passes after the `TutorialManager` frame wiring.
- `npx vitest run --config tests/vitest.config.ts tests/unit/uiFrameAssets.test.ts tests/unit/spriteResourceManifest.test.ts` passes with 55 tests after the tutorial manager frame contract was added.
- In-app Browser QA on `?debugScene=tutorialManager&renderer=canvas&tutorialManagerFrameQa=1&qaRun=phase82-browser-fixed` reports `status: "ready"`, `currentStepName: "movement"`, `panelFrame.renderedCount: 1`, `panelFrame.expectedCount: 1`, `actionButtonFrame.renderedCount: 2`, `actionButtonFrame.expectedCount: 2`, CSS background URLs for `UI-HUD-005-DEF.png` and `UI-BTN-006-DEF.png`, `missingFrameKeys: []`, one visible canvas, and no current-navigation warn/error logs.
- In-app Browser click QA confirms the framed next button advances `currentStepName` from `movement` to `combat` while keeping panel/action button frame counts at `1` and `2`.
- Local Playwright QA on `?debugScene=tutorialManager&renderer=canvas&tutorialManagerFrameQa=1&qaRun=phase82-local` confirms `TutorialManager.ts`, `TutorialManagerQaScene.ts`, `UI-HUD-005-DEF.png`, and `UI-BTN-006-DEF.png` return `200`; no page errors or console warn/error logs are emitted; there are no failed non-favicon responses; the loading overlay is removed; and `272` sampled canvas pixels are nonblank.
- Local Playwright click QA confirms the framed next button advances `currentStepName` from `movement` to `combat`.
- Visual evidence was captured at `C:\Users\crisi\AppData\Local\Temp\aeterna-tutorial-manager-frame-phase82.png`.

## Phase 83: Transition Loading Indicator Frame Runtime Wiring

Runtime transition loading UI frame coverage:

- `UI-HUD-005-DEF`: `SceneTransitionManager.showLoadingIndicator()` central loading panel frame.
- `UI-BTN-005-DEF`: spinner track frame behind the dynamic arc spinner.
- Runtime paths live under `client/public/assets/generated/ui/frames/UI-HUD-005-DEF.png` and `client/public/assets/generated/ui/frames/UI-BTN-005-DEF.png`.

Production rule:

- `preloadTransitionLoadingUiFrameTextures()` loads `UI-HUD-005-DEF` through `ui_frame_transition_loading_panel` and `UI-BTN-005-DEF` through the isolated `ui_frame_transition_loading_spinner_track` key.
- `SceneTransitionManager.showLoadingIndicator()` renders the Aseprite panel and spinner track frames before the dynamic arc spinner/text, while keeping the full-screen dimmer, rotating arc, and loading-dot animation dynamic.
- The old procedural panel/track rectangles remain only as missing-texture safety fallback.
- `?debugScene=transitionLoading&renderer=canvas&transitionLoadingFrameQa=1` starts `TransitionLoadingQaScene` and writes `document.body.dataset.aeternaTransitionLoadingFrameQa` with panel/spinner track frame counts, display sizes, missing frame keys, and visible canvas count.

Exit criteria:

- Unit tests verify the transition loading panel/spinner track preload/render/QA contract and `debugScene=transitionLoading` registration.
- Browser QA confirms `panelFrame.renderedCount: 1`, `spinnerTrackFrame.renderedCount: 1`, `missingFrameKeys: []`, one visible canvas, no current-navigation warn/error logs, and the loading overlay is removed after its transition window.
- Local Playwright QA confirms `TransitionEffects.ts`, `TransitionLoadingQaScene.ts`, `UI-HUD-005-DEF.png`, and `UI-BTN-005-DEF.png` return `200`.
- Client typecheck and build pass after the runtime wiring.

Current QA state:

- Phase 83 is runtime-verified as of 2026-06-13.
- `npm --prefix client run typecheck` passes after the transition loading frame wiring.
- `npx vitest run --config tests/vitest.config.ts tests/unit/uiFrameAssets.test.ts tests/unit/environmentParticleTextureAssets.test.ts tests/unit/spriteResourceManifest.test.ts` passes with 57 tests after the transition loading frame contract was added.
- In-app Browser QA on `?debugScene=transitionLoading&renderer=canvas&transitionLoadingFrameQa=1&qaRun=phase83-browser` reports `status: "ready"`, `panelFrame.renderedCount: 1`, `panelFrame.expectedCount: 1`, `panelFrame.displayWidth: 360`, `panelFrame.displayHeight: 180`, `spinnerTrackFrame.renderedCount: 1`, `spinnerTrackFrame.expectedCount: 1`, `spinnerTrackFrame.displayWidth: 92`, `spinnerTrackFrame.displayHeight: 38`, `missingFrameKeys: []`, one visible canvas, and no current-navigation warn/error logs. The HTML loading overlay is removed after its transition window.
- Local Playwright QA on `?debugScene=transitionLoading&renderer=canvas&transitionLoadingFrameQa=1&qaRun=phase83-local` confirms `TransitionEffects.ts`, `TransitionLoadingQaScene.ts`, `UI-HUD-005-DEF.png`, and `UI-BTN-005-DEF.png` return `200`; no page errors or console warn/error logs are emitted; there are no failed non-favicon responses; the loading overlay is removed; and `272` sampled canvas pixels are nonblank.
- Visual evidence was captured at `C:\Users\crisi\AppData\Local\Temp\aeterna-transition-loading-frame-phase83.png`.

## Phase 84: Navigation Arrow Image Runtime Wiring

Runtime navigation direction image coverage:

- `skill_mw_arrow.png`: `NavigationManager` screen-fixed direction arrow for off-screen waypoint or tracked quest targets.
- Runtime path lives under `client/public/assets/generated/ui/icons/skills/skill_mw_arrow.png`.

Production rule:

- `preloadNavigationArrowTexture()` loads `skill_mw_arrow.png` through the isolated `ui_navigation_direction_arrow` key.
- `NavigationManager.renderArrow()` renders the Aseprite image first, reuses one `Phaser.GameObjects.Image` instance across updates, and applies dynamic position, rotation, alpha, tint, and display size from the current target direction.
- The old procedural `Graphics.fillTriangle()` arrow remains only as a missing-texture safety fallback.
- `?debugScene=navigationArrow&renderer=canvas&navigationArrowQa=1` starts `NavigationArrowQaScene` and writes `document.body.dataset.aeternaNavigationArrowFrameQa` with image count, display size, rotation, missing key list, fallback usage, and visible canvas count.

Exit criteria:

- Unit tests verify the `NavigationManager` arrow image preload/render/QA contract and `debugScene=navigationArrow` registration.
- Browser QA confirms `renderedImageCount: 1`, `expectedImageCount: 1`, `arrowImage.rendered: true`, `fallbackArrowRendered: false`, `missingFrameKeys: []`, one visible canvas, no loading overlay, and no current-navigation warn/error logs.
- Local Playwright QA confirms `NavigationManager.ts`, `NavigationArrowQaScene.ts`, `skill_mw_arrow.png`, and `UI-HUD-002-DEF.png` return `200`.
- Client typecheck and build pass after the runtime wiring.

Current QA state:

- Phase 84 is runtime-verified as of 2026-06-13.
- `npm --prefix client run typecheck` passes after the navigation arrow image wiring.
- `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts tests\unit\spriteResourceManifest.test.ts` passes with 57 tests after the navigation arrow contract was added.
- In-app Browser QA on `?debugScene=navigationArrow&renderer=canvas&navigationArrowQa=1&qaRun=phase84-browser` reports `status: "ready"`, `renderedImageCount: 1`, `expectedImageCount: 1`, `arrowImage.rendered: true`, display size `48x48`, `fallbackArrowRendered: false`, `missingFrameKeys: []`, one visible canvas, and no current-navigation warn/error logs. The HTML loading overlay is removed after its transition window.
- Local Playwright QA on `?debugScene=navigationArrow&renderer=canvas&navigationArrowQa=1&qaRun=phase84-local` confirms `NavigationManager.ts`, `NavigationArrowQaScene.ts`, `skill_mw_arrow.png`, and `UI-HUD-002-DEF.png` return `200`; no page errors or console warn/error logs are emitted; there are no failed non-favicon responses; the loading overlay is removed; and `32400` sampled canvas pixels are nonblank.
- Visual evidence was captured at `C:\Users\crisi\AppData\Local\Temp\aeterna-navigation-arrow-frame-phase84.png`.

## Phase 85: Field HUD Quickslot Icon Runtime Wiring

Runtime field HUD icon coverage:

- `skill_ek_slash.png`, `skill_mw_storm.png`, `skill_ek_shield.png`, `skill_mw_heal.png`, `skill_tg_haste.png`, `skill_ek_charge.png`, `skill_tg_stop.png`, `skill_mw_ultimate.png`, `skill_vw_warp.png`, `skill_vw_tether.png`: default field HUD skill quickslot icons.
- `ITM-CON-001.png`, `ITM-MAT-001.png`: default potion/material quickslot item icons.
- Runtime paths live under `client/public/assets/generated/ui/icons/skills` and `client/public/assets/generated/ui/icons/items`.

Production rule:

- `HudOverlay.makeDefaultSlots()` resolves default quickslot image resources through `getSpriteResourceForSkillIcon()` and `getItemIconResource()`.
- `HudOverlay.renderQuickSlots()` builds the slot DOM with explicit child nodes and inserts `img.slot-icon-image` before the dynamic label/cooldown/stack text.
- Each icon carries `data-aeterna-icon-key` and `data-aeterna-icon-path` so QA can identify the exact resource contract.
- The old `◆` glyph remains only as a missing-path or image-load-error fallback.
- `?debugScene=game&renderer=canvas&hudFrameQa=1` writes `document.body.dataset.aeternaHudFrameQa.quickSlotIcon` with expected/rendered image count, natural image size, missing icon keys, and per-icon path state.
- Hotkeys, labels, cooldowns, stack counts, disabled state, button frame CSS, quest rows, dialogue choices, and HP/MP/EXP bars remain dynamic DOM UI logic.

Exit criteria:

- Unit tests verify the HudOverlay quickslot icon import, DOM image element, fallback data attributes, CSS sizing, default slot resource mapping, and `aeternaHudFrameQa.quickSlotIcon` QA contract.
- Browser QA confirms `aeternaHudFrameQa.status: "ready"`, `quickSlotIcon.renderedImageCount: 12`, `expectedImageCount: 12`, `missingIconKeys: []`, one visible canvas, and no current-navigation warn/error logs.
- Local Playwright QA confirms `HudOverlay.ts`, the ten skill icon PNGs, the two item icon PNGs, `UI-HUD-001-DEF.png`, and `UI-BTN-006-DEF.png` return `200`.
- Local Playwright QA confirms the DOM has 12 `.slot-icon-image` nodes, no incomplete icons, no failed non-favicon responses, no app-level console warn/error logs, and a nonblank canvas. Headless Chromium may emit `CONTEXT_LOST_WEBGL` warnings during page teardown/probing; these are tracked separately from HUD asset failures.
- Client typecheck and build pass after the runtime wiring.

Current QA state:

- Phase 85 is runtime-verified as of 2026-06-13.
- `npm --prefix client run typecheck` passes after the field HUD quickslot icon wiring.
- `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts tests\unit\spriteResourceManifest.test.ts tests\unit\skillIconAssets.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts` passes with 60 tests.
- `npm run build:client` passes after the runtime wiring.
- In-app Browser QA on `?debugScene=game&renderer=canvas&zone=aether_plains&class=ether_knight&hudFrameQa=1&qaRun=phase85-browser-rerun-*` reports `status: "ready"`, `quickSlotIcon.renderedImageCount: 12`, `quickSlotIcon.expectedImageCount: 12`, `missingIconKeys: []`, DOM icon count `12`, `naturalWidth/naturalHeight: 64x64`, viewport-scaled rect about `13x13` from the `20x20` CSS rule, one visible canvas, and no warn/error logs.
- Local Playwright QA on `?debugScene=game&renderer=canvas&zone=aether_plains&class=ether_knight&hudFrameQa=1&qaRun=phase85-playwright-rerun-*` confirms `HudOverlay.ts`, all quickslot skill/item PNGs, `UI-HUD-001-DEF.png`, and `UI-BTN-006-DEF.png` return `200`; no failed non-favicon responses or request failures are emitted; `aeternaHudFrameQa` is `ready`; all icon CSS rules are `20x20`; and `576/576` sampled canvas pixels are nonblank. The only console warnings observed were two headless Chromium `WebGL: CONTEXT_LOST_WEBGL: loseContext: context lost` messages, with no HUD or asset load error.
- Visual evidence was captured at `C:\Users\crisi\AppData\Local\Temp\aeterna-hud-quickslot-icons-phase85.png`.

## Phase 86: Field HUD Status Avatar Runtime Wiring

Runtime field HUD avatar coverage:

- `char_battle_ether_knight.png`, `char_battle_memory_weaver.png`, `char_battle_shadow_weaver.png`, `char_battle_memory_breaker.png`, `char_battle_time_guardian.png`, `char_battle_void_wanderer.png`: field HUD status avatar source images for the six main class ids.
- Runtime path lives under `client/public/assets/generated/characters/class_main/battle`.
- Each runtime avatar is a `64x96` Aseprite PNG and shares the existing character battle thumbnail production workflow.

Production rule:

- `GameScene` resolves the active class id through `getCharacterHudAvatarResource()` and passes `avatarImageKey`/`avatarUrl` into `HUDOrchestrator` and `HudOverlay`.
- `HudOverlay.renderAvatar()` writes `img#hud-avatar-image` inside the status avatar button and keeps the status name, level, HP/MP/EXP bars, and numeric labels as dynamic DOM UI.
- The old orange procedural avatar circle is no longer the primary render path; it is now an image container, and load failure hides only the image rather than breaking the status panel.
- `?debugScene=game&renderer=canvas&hudFrameQa=1` writes `document.body.dataset.aeternaHudFrameQa.hudAvatar` with expected/rendered state, `char_battle_*` key/path, natural image size, and missing key status.

Exit criteria:

- Unit tests verify the HudOverlay avatar props, DOM image element, CSS image fitting, GameScene class-id resource map, and `aeternaHudFrameQa.hudAvatar` QA contract.
- Browser QA confirms `aeternaHudFrameQa.status: "ready"`, `hudAvatar.key: "char_battle_ether_knight"`, `hudAvatar.rendered: true`, `naturalWidth/naturalHeight: 64x96`, one visible canvas, and no current-navigation warn/error logs.
- Local Playwright QA confirms `HudOverlay.ts`, `GameScene.ts`, and `char_battle_ether_knight.png` return `200`; DOM has one `#hud-avatar-image`; and the canvas is nonblank.
- Client typecheck, related unit tests, and client build pass after the runtime wiring.

Current QA state:

- Phase 86 is runtime-verified as of 2026-06-13.
- `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts` passes with 28 tests after the RED expectation is implemented.
- `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts tests\unit\characterBattleThumbnailAssets.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts` passes with 31 tests.
- `npm --prefix client run typecheck` passes after the field HUD status avatar wiring.
- In-app Browser QA on `?debugScene=game&renderer=canvas&zone=aether_plains&class=ether_knight&hudFrameQa=1&qaRun=phase86-iab-*` reports `status: "ready"`, `hudAvatar.key: "char_battle_ether_knight"`, `hudAvatar.path: "assets/generated/characters/class_main/battle/char_battle_ether_knight.png"`, `hudAvatar.rendered: true`, `naturalWidth/naturalHeight: 64x96`, DOM avatar count `1`, quickslot rendered/expected count `12/12`, one visible canvas, and no warn/error logs.
- Local Playwright QA on `?debugScene=game&renderer=canvas&zone=aether_plains&class=ether_knight&hudFrameQa=1&qaRun=phase86-debug-*` confirms `HudOverlay.ts`, `GameScene.ts`, and `char_battle_ether_knight.png` return `200`; `aeternaHudFrameQa` is `ready`; the avatar DOM src is `/assets/generated/characters/class_main/battle/char_battle_ether_knight.png`; no console warn/error logs or failed requests are emitted; and sampled canvas pixels are nonblank.

## Phase 87: Lobby NPC Portrait Runtime Wiring

Runtime lobby NPC portrait coverage:

- `npc_portrait_19_kalen_portrait.png`: blacksmith dialogue portrait.
- `npc_portrait_20_mira_portrait.png`: merchant dialogue portrait.
- `npc_portrait_18_memory_fragment_portrait.png`: quest board dialogue portrait.
- `npc_portrait_13_hashir_portrait.png`: party recruit dialogue portrait.
- `npc_portrait_04_mateus_portrait.png`: elder dialogue and story panel portrait.
- Runtime paths live under `client/public/assets/generated/characters/npc`.

Production rule:

- `LobbyScene` preloads the five portrait textures through `LOBBY_NPC_PORTRAIT_TEXTURES`.
- `_addLobbyNpcPortrait()` renders the 512x512 Aseprite portrait first at panel-specific display size.
- The previous NPC sprite portrait path is retained only as a missing-texture fallback by using the lobby NPC sprite frame 0.
- Dialogue/story panel frames, labels, keyboard focus, pointer callbacks, and NPC actions remain dynamic Phaser UI logic.

Exit criteria:

- Unit tests verify the portrait texture map, runtime paths, preload loop, `_addLobbyNpcPortrait()` helper, dialogue/story panel usage, and removal of the old `npc_sprites/*_sprite.png` portrait preload.
- NPC portrait asset tests keep the 40-file `512x512` Aseprite roster coverage intact.
- Browser QA confirms the five portrait PNGs are observed as image resources on the lobby debug scene.
- Local Playwright QA confirms the elder dialogue panel renders `npc_portrait_04_mateus_portrait` at `96x96`, and the elder story panel renders the same texture at `112x112`.

Current QA state:

- Phase 87 is runtime-verified as of 2026-06-13.
- `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts` passes with 29 tests after the RED expectation is implemented.
- `npm --prefix client run typecheck` passes after the lobby portrait wiring.
- `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts tests\unit\npcPortraitAssets.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts` passes with 31 tests.
- In-app Browser page asset inventory on `?debugScene=lobby&renderer=canvas&qaRun=phase87-iab2-*` observes `LobbyScene.ts` plus `npc_portrait_19_kalen_portrait.png`, `npc_portrait_20_mira_portrait.png`, `npc_portrait_13_hashir_portrait.png`, `npc_portrait_18_memory_fragment_portrait.png`, and `npc_portrait_04_mateus_portrait.png` as loaded resources. Current in-app Browser read-only page scope did not expose `window.__aeternaGame`, so scene object assertions were verified with local Playwright.
- Local Playwright QA on `?debugScene=lobby&renderer=canvas&qaRun=phase87-container-*` confirms `LobbyScene` has the five portrait textures in cache, no failed non-favicon responses, no console warn/error logs, one visible canvas, the elder dialogue panel portrait image uses `npc_portrait_04_mateus_portrait` at `96x96`, and the elder story panel portrait image uses `npc_portrait_04_mateus_portrait` at `112x112`.

## Phase 88: Battle Defend Status Icon Runtime Wiring

Runtime battle defend icon coverage:

- `status_shield.png`: battle defend command overhead status icon.
- Runtime path lives under `client/public/assets/generated/ui/icons/status/status_shield.png`.
- Runtime texture key is `status_shield_icon`, shared with the existing status icon manifest.

Production rule:

- `BattleScene` continues to preload all status icons through `preloadStatusIconResources(this)`.
- `_performDefend()` resolves `getStatusIconResource('shield')` and renders the loaded texture as a `28x28` Phaser image named `battle_defend_icon_<unitId>`.
- Defense lifetime, defense stat snapshot restoration, and per-frame follow behavior stay in the existing local defend logic.
- The previous `🛡` text object is retained only as a missing-texture fallback.

Exit criteria:

- Unit tests verify that `BattleScene` imports `getStatusIconResource`, allows `defendIcon` to be an image or text fallback, resolves the `shield` status icon, renders it with nearest filtering, and keeps the text fallback path.
- Status icon asset tests keep the 40-file `32x32` Aseprite status icon roster coverage intact.
- Browser QA confirms `BattleScene.ts`, `spriteResourceManifest.ts`, `statusIconSpecs.ts`, and `status_shield.png` are observed as page resources on the battle debug scene.
- Local Playwright QA confirms `_performDefend()` creates an `Image` object using `status_shield_icon` at `28x28`, not the text fallback.

Current QA state:

- Phase 88 is runtime-verified as of 2026-06-13.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts` failed one new test before implementation because `BattleScene` did not import/use `getStatusIconResource('shield')`.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts` passes with 30 tests after implementation.
- `npm --prefix client run typecheck` passes after the defend icon wiring.
- `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\statusIconAssets.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts` passes with 32 tests.
- In-app Browser page asset inventory on `?debugScene=battle&renderer=canvas&qaRun=phase88-iab-*` observes `BattleScene.ts`, `spriteResourceManifest.ts`, `statusIconSpecs.ts`, and `status_shield.png` with no warn/error logs.
- Local Playwright QA on `?debugScene=battle&renderer=canvas&qaRun=phase88-local-*` confirms `status_shield.png` returns `200`; `status_shield_icon` exists in texture cache; `_performDefend()` creates `battle_defend_icon_player_1` as an `Image` with texture key `status_shield_icon`, `28x28` display size, and no text fallback; no failed non-favicon responses, request failures, or console warn/error logs are emitted; one visible canvas is nonblank.

## Phase 89: Battle Active Turn Indicator Arrow Runtime Wiring

Runtime battle active turn indicator coverage:

- `skill_mw_arrow.png`: battle active commander overhead turn indicator.
- Runtime path lives under `client/public/assets/generated/ui/icons/skills/skill_mw_arrow.png`.
- Runtime texture key is `skill_mw_arrow_icon`, shared with the existing skill icon manifest.

Production rule:

- `BattleScene.preload()` resolves `getSpriteResourceForSkillIcon('skill_mw_arrow')` through the shared manifest and queues the image regardless of the current class skill slot list.
- `_showActiveIndicator()` renders the loaded texture as a `28x28` Phaser image named `battle_active_turn_indicator` and rotates it 90 degrees so the existing right-arrow asset reads as a downward turn marker.
- Existing active commander selection, indicator position, pulse tween, and `_clearActiveIndicator()` cleanup remain unchanged.
- The previous `▼` text object is retained only as a missing-texture fallback.

Exit criteria:

- Unit tests verify the active indicator icon id constant, preload call, image-first render path, display size, rotation, image object type, and text fallback path.
- Skill icon asset tests keep the Aseprite skill icon roster coverage intact.
- Browser QA confirms `BattleScene.ts`, `spriteResourceManifest.ts`, and `skill_mw_arrow.png` are observed as page resources on the battle debug scene.
- Local Playwright QA confirms `_showActiveIndicator()` creates an `Image` object using `skill_mw_arrow_icon` at `28x28`, with angle `90`, and no text fallback.

Current QA state:

- Phase 89 implementation started on 2026-06-13.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts` failed one new test before implementation because `BattleScene` did not define/preload/use `skill_mw_arrow` for the active turn indicator.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts` passes with 31 tests after implementation.
- `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\skillIconAssets.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts` passes with 34 tests.
- `npm --prefix client run typecheck` passes after the active turn indicator wiring.
- `npm run build:client` passes after the active turn indicator wiring.
- In-app Browser page asset inventory on `?debugScene=battle&renderer=canvas&qaRun=phase89-iab-*` observes `BattleScene.ts`, `spriteResourceManifest.ts`, `classSkills.ts`, and `skill_mw_arrow.png`; asset summary is 174 total resources with 56 images, one visible `1920x1080` canvas, and no warn/error logs.
- Local Playwright QA on `?debugScene=battle&renderer=canvas&qaRun=phase89-local-*` confirms `skill_mw_arrow_icon` exists in texture cache; `_showActiveIndicator()` creates `battle_active_turn_indicator` as an `Image` with texture key `skill_mw_arrow_icon`, `28x28` display size, angle `90`, and no text fallback; no failed non-favicon responses, request failures, or console warn/error logs are emitted; one visible canvas is nonblank.

## Phase 90: Battle Command Menu Icon Runtime Wiring

Runtime battle command menu icon coverage:

- Attack command: `skill_ek_slash.png` / texture key `skill_ek_slash_icon`.
- Magic command: `skill_mw_bolt.png` / texture key `skill_mw_bolt_icon`.
- Item command: `ITM-CON-001.png` / texture key `icon_item_ITM-CON_001`.
- Defend command: `status_shield.png` / texture key `status_shield_icon`.
- Flee command: `skill_vw_warp.png` / texture key `skill_vw_warp_icon`.

Production rule:

- `COMMANDS` stores a plain label, legacy emoji fallback label, and Aseprite icon descriptor per command.
- `getBattleCommandIconResource()` resolves command descriptors through the existing skill icon, status icon, and item icon SSOT helpers.
- `BattleScene.preload()` queues every command icon before the command menu can open.
- `_openCommandMenu()` renders each loaded icon as a `20x20` Phaser image named `battle_command_icon_<commandType>` and keeps the command label as dynamic text beside the image.
- Existing command execution callbacks, pointer hover selection, keyboard selection, and `_highlightCommand()` behavior remain dynamic Phaser UI logic.
- If a command icon texture is missing, the menu uses the old emoji label fallback for that command.

Exit criteria:

- Unit tests verify the five command icon mappings, resource resolver, preload calls, image-first render path, nearest filtering, display size, object names, and fallback label path.
- Skill, status, and item icon asset tests keep the Aseprite roster coverage intact.
- Browser QA confirms all five icon PNGs are observed as page resources on the battle debug scene.
- Local Playwright QA confirms opening the command menu creates five `Image` objects named `battle_command_icon_*`, each with the expected texture key and `20x20` display size.

Current QA state:

- Phase 90 implementation started on 2026-06-13.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts` failed one new test before implementation because `BattleScene` did not import `getItemIconResource` or define command icon descriptors/resolution.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts` passes with 32 tests after implementation.
- `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\skillIconAssets.test.ts tests\unit\statusIconAssets.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts` passes with 36 tests.
- `npm --prefix client run typecheck` passes after the command menu icon wiring.
- `npm run build:client` passes after the command menu icon wiring.
- In-app Browser page asset inventory on `?debugScene=battle&renderer=canvas&qaRun=phase90-iab-*` observes `BattleScene.ts`, `spriteResourceManifest.ts`, `itemIconResources.ts`, `statusEffectIcons.ts`, `skill_ek_slash.png`, `skill_mw_bolt.png`, `ITM-CON-001.png`, `status_shield.png`, and `skill_vw_warp.png`; asset summary is 177 total resources with 59 images, one visible `1920x1080` canvas, and no warn/error logs.
- Local Playwright QA on `?debugScene=battle&renderer=canvas&qaRun=phase90-local-container-*` confirms `skill_ek_slash_icon`, `skill_mw_bolt_icon`, `icon_item_ITM-CON_001`, `status_shield_icon`, and `skill_vw_warp_icon` exist in texture cache; `_openCommandMenu()` creates five `Image` objects named `battle_command_icon_attack`, `battle_command_icon_magic`, `battle_command_icon_item`, `battle_command_icon_defend`, and `battle_command_icon_flee` with the expected texture keys, `20x20` display size, and no emoji fallback command labels; no failed non-favicon responses, request failures, or console warn/error logs are emitted; one visible canvas is nonblank.

## Phase 91: Battle Magic and Item Submenu Icon Runtime Wiring

Runtime battle submenu icon coverage:

- Magic submenu rows: each `SkillSlot.icon` resolves through `getSpriteResourceForSkillIcon()` and renders its Aseprite skill icon beside the row label.
- Item submenu potion row: `ITM-CON-001.png` / texture key `icon_item_ITM-CON_001`.

Production rule:

- `BattleScene._showMagicSubMenu()` keeps the existing skill availability, cooldown, MP cost, pointer callback, and keyboard selection logic.
- Loaded skill icons render as `18x18` Phaser images named `battle_magic_submenu_icon_<skillId>` before the dynamic skill label text.
- Unusable skill icons keep the same disabled state as their row text through reduced alpha.
- `BattleScene._showItemSubMenu()` resolves the potion icon through `getItemIconResource({ itemIconId: 'ITM-CON-001' })` and renders it as `battle_item_submenu_icon_ITM-CON-001`.
- If the item icon texture is missing, the row uses the previous `🧪 포션 (HP +100)` fallback label.

Exit criteria:

- Unit tests verify magic submenu skill icon resolution, image-first render path, nearest filtering, display size, object naming, item icon resolution, and item fallback label path.
- Skill and item icon asset tests keep the Aseprite roster coverage intact.
- Browser QA confirms the battle debug scene loads the skill and potion PNGs needed by the opened submenus.
- Local Playwright QA confirms opening the magic and item submenus creates image objects with expected texture keys and `18x18` display size.

Current QA state:

- Phase 91 implementation started on 2026-06-13.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts` failed one new test before implementation because `BattleScene` did not define submenu icon objects/resolution.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts` passes with 33 tests after implementation.
- `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\skillIconAssets.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts` passes with 36 tests.
- `npm --prefix client run typecheck` passes after the submenu icon wiring.
- `npm run build:client` passes after the submenu icon wiring.
- In-app Browser page asset inventory on `?debugScene=battle&renderer=canvas&qaRun=phase91-iab-*` observes `BattleScene.ts`, `spriteResourceManifest.ts`, `itemIconResources.ts`, `classSkills.ts`, `skill_ek_slash.png`, `skill_ek_shield.png`, `skill_ek_charge.png`, `skill_ek_explode.png`, `skill_ek_passive.png`, `skill_ek_ultimate.png`, and `ITM-CON-001.png`; asset summary is 177 total resources with 59 images, one visible `1920x1080` canvas, and no warn/error logs.
- Local Playwright QA on `?debugScene=battle&renderer=canvas&qaRun=phase91-local-*` confirms default Ether Knight magic submenu rows create six `Image` objects named `battle_magic_submenu_icon_<skillId>` with texture keys `skill_ek_slash_icon`, `skill_ek_shield_icon`, `skill_ek_charge_icon`, `skill_ek_explode_icon`, `skill_ek_passive_icon`, and `skill_ek_ultimate_icon`, each at `18x18`; the item submenu creates `battle_item_submenu_icon_ITM-CON-001` as an `Image` with texture key `icon_item_ITM-CON_001` at `18x18`; no emoji fallback submenu labels, failed non-favicon responses, request failures, or console warn/error logs are emitted; one visible canvas is nonblank.

## Phase 92: BattleUI Utility Button Icon Runtime Wiring

Runtime battle utility button icon coverage:

- Pause utility button: `skill_tg_stop.png` / texture key `skill_tg_stop_icon`.
- Flee utility button: `skill_vw_warp.png` / texture key `skill_vw_warp_icon`.

Production rule:

- `preloadBattleUiFrameTextures()` queues the two utility button icon textures in addition to the existing utility button frame.
- `BattleUI._createButtons()` renders each loaded icon as a `14x14` Phaser image named `battle_ui_utility_button_icon_pause` or `battle_ui_utility_button_icon_flee`.
- Pause/resume label changes, P key handling, flee delegation to `BattleScene._attemptFlee()`, and button frame rendering stay in the existing `BattleUI` logic.
- If an icon texture is missing, the button keeps the previous text-symbol fallback labels: `⏸ 일시정지 (P)`, `▶ 재개 (P)`, and `🏃 도주`.

Exit criteria:

- Unit tests verify the utility icon id map, preload loop, image-first render path, nearest filtering, display size, object names, fallback labels, and QA payload icon counts.
- Skill icon asset tests keep the Aseprite skill icon roster coverage intact.
- Browser QA confirms `skill_tg_stop.png` and `skill_vw_warp.png` are observed as page resources on the battle debug scene.
- Local Playwright QA confirms the utility button icons render as `Image` objects with expected texture keys and `14x14` display size, while labels contain no icon glyphs when textures are loaded.

Current QA state:

- Phase 92 implementation started on 2026-06-13.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts` failed one new test before implementation because `BattleUI` did not define/preload/render utility button skill icons.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts` passes with 34 tests after implementation.
- `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\skillIconAssets.test.ts tests\unit\uiFrameAssets.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts` passes with 66 tests.
- `npm --prefix client run typecheck` passes after the utility button icon wiring.
- `npm run build:client` passes after the utility button icon wiring.
- In-app Browser page asset inventory on `?debugScene=battle&renderer=canvas&zone=aether_plains&battleUtilityButtonFrameQa=1&qaRun=phase92-iab-*` observes `BattleScene.ts`, `BattleUI.ts`, `spriteResourceManifest.ts`, `UI-BTN-006-DEF.png`, `skill_tg_stop.png`, and `skill_vw_warp.png`; asset summary is 178 total resources with 60 images, one visible `1920x1080` canvas, and no warn/error logs. The QA dataset reports `renderedIconCount: 2`, texture keys `skill_tg_stop_icon` and `skill_vw_warp_icon`, labels `일시정지 (P)` and `도주`, and no missing frame keys.
- Local Playwright QA on the same route confirms `battle_ui_utility_button_icon_pause` and `battle_ui_utility_button_icon_flee` are `Image` objects with texture keys `skill_tg_stop_icon` and `skill_vw_warp_icon`, each at `14x14`; utility labels contain no `⏸`, `▶`, or `🏃` fallback glyphs; no failed non-favicon responses, request failures, or console warn/error logs are emitted.

## Phase 93: Battle Combo Tech Button Icon Runtime Wiring

Runtime battle combo tech button icon coverage:

- Dual Tech candidate button: `skill_mw_storm.png` / texture key `skill_mw_storm_icon`.
- Triple Tech candidate button: `skill_ek_ultimate.png` / texture key `skill_ek_ultimate_icon`.

Production rule:

- `BattleScene.preload()` queues both combo tech button icon textures independently of the current class skill slots.
- The Dual Tech button renders its loaded icon as `battle_combo_tech_button_icon_dual`; the Triple Tech button renders `battle_combo_tech_button_icon_triple`.
- Both icons use `18x18` display size and nearest filtering.
- Candidate visibility, D/T activation, Shift+D/Shift+T cycling, element tint, and AOE candidate selection remain in the existing battle logic.
- If icon textures are missing, the button keeps the previous `✨`, `🌟`, and `💥` text prefix fallback labels.

Exit criteria:

- Unit tests verify the combo tech icon id map, preload loop, image-first render path, nearest filtering, display size, object names, fallback labels, and QA payload icon counts.
- Skill icon asset tests keep the Aseprite skill icon roster coverage intact.
- Browser QA confirms `skill_mw_storm.png` and `skill_ek_ultimate.png` are observed as page resources on the battle debug scene.
- Local Playwright QA confirms both combo tech icons render as `Image` objects with expected texture keys and `18x18` display size, while button labels contain no combo glyph prefixes when textures are loaded.

Current QA state:

- Phase 93 implementation started on 2026-06-13.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts` failed one new test before implementation because `BattleScene` did not define/preload/render combo tech button skill icons.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts` passes with 35 tests after implementation.
- `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\skillIconAssets.test.ts tests\unit\uiFrameAssets.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts` passes with 67 tests.
- `npm --prefix client run typecheck` passes after the combo tech button icon wiring.
- `npm run build:client` passes after the combo tech button icon wiring.
- In-app Browser page asset inventory on `?debugScene=battle&renderer=canvas&zone=aether_plains&battleComboTechFrameQa=1&qaRun=phase93-iab` observes `BattleScene.ts`, `spriteResourceManifest.ts`, `UI-BTN-006-DEF.png`, `skill_mw_storm.png`, and `skill_ek_ultimate.png`; asset summary is 179 total resources with 61 images, one visible `1920x1080` canvas, and no warn/error logs. The QA dataset reports `renderedIconCount: 2`, texture keys `skill_mw_storm_icon` and `skill_ek_ultimate_icon`, labels `협공 (D)` and `3인 협공 (T)`, and no missing frame/icon keys.
- Local Playwright QA on the same route confirms `battle_combo_tech_button_icon_dual` and `battle_combo_tech_button_icon_triple` are `Image` objects with texture keys `skill_mw_storm_icon` and `skill_ek_ultimate_icon`, each at `18x18`; combo tech labels contain no `✨`, `🌟`, or `💥` fallback glyph prefixes; no failed non-favicon responses, request failures, or console warn/error logs are emitted.

## Phase 94: WorldScene Action Button Icon Runtime Wiring

Runtime world action button icon coverage:

- Previous era button: `skill_tg_reverse.png` / texture key `skill_tg_reverse_icon`.
- Next era button: `skill_tg_haste.png` / texture key `skill_tg_haste_icon`.
- Return-to-town button: `skill_vw_warp.png` / texture key `skill_vw_warp_icon`.
- Selected-zone travel button: `skill_mw_arrow.png` / texture key `skill_mw_arrow_icon`.

Production rule:

- `WorldScene.preload()` queues the four action button icon textures in addition to the existing world action button frame.
- `_addWorldActionButton()` renders each loaded icon as an `18x18` Phaser image named `<buttonName>_icon`.
- Era cycling, ESC/back behavior, selected-zone travel, hover tint, keyboard shortcuts, and the selected-zone panel lifecycle remain in the existing `WorldScene` logic.
- If icon textures are missing, the buttons keep the previous text-symbol fallback labels: `[Q] ◀`, `▶ [E]`, `← 마을로 돌아가기 (ESC)`, and `▶ [ 시간 이동 ] (Enter)`.

Exit criteria:

- Unit tests verify the WorldScene action icon id map, preload loop, image-first render path, nearest filtering, display size, object names, fallback labels, and QA payload icon counts.
- Skill icon asset tests keep the Aseprite skill icon roster coverage intact.
- Browser QA confirms `skill_tg_reverse.png`, `skill_tg_haste.png`, `skill_vw_warp.png`, and `skill_mw_arrow.png` are observed as page resources on the world debug scene.
- Local Playwright QA confirms all four action button icons render as `Image` objects with expected texture keys and `18x18` display size, while button labels contain no direction glyphs when textures are loaded.

Current QA state:

- Phase 94 implementation started on 2026-06-13.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts` failed one new test before implementation because `WorldScene` did not define/preload/render action button skill icons.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts` passes with 36 tests after implementation.
- `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\skillIconAssets.test.ts tests\unit\uiFrameAssets.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts` passes with 68 tests.
- `npm --prefix client run typecheck` passes after the WorldScene action button icon wiring.
- `npm run build:client` passes after the WorldScene action button icon wiring.
- In-app Browser page asset inventory on `?debugScene=world&renderer=canvas&zone=aether_plains&worldFrameQa=1&qaRun=phase94-iab` observes `WorldScene.ts`, `spriteResourceManifest.ts`, `UI-BTN-006-DEF.png`, `skill_tg_reverse.png`, `skill_tg_haste.png`, `skill_vw_warp.png`, and `skill_mw_arrow.png`; asset summary is 138 total resources with 20 images, one visible `1920x1080` canvas, and no warn/error logs. The QA dataset reports `actionButtonIcon.renderedCount: 4`, texture keys `skill_tg_reverse_icon`, `skill_tg_haste_icon`, `skill_vw_warp_icon`, and `skill_mw_arrow_icon`, and no missing frame/icon keys.
- Local Playwright QA on `?debugScene=world&renderer=canvas&zone=aether_plains&worldFrameQa=1&qaRun=phase94-local-rerun` confirms `world_era_prev_action_button_icon`, `world_era_next_action_button_icon`, `world_back_action_button_icon`, and `world_travel_action_button_icon` are image objects with expected texture keys and `18x18` display size; labels are `[Q]`, `[E]`, `마을로 돌아가기 (ESC)`, and `시간 이동 (Enter)` with no `◀`, `▶`, or `←` fallback glyphs; no failed non-favicon responses, request failures, page errors, or console warn/error logs are emitted.

## Phase 95: WorldScene Locked Zone Status Icon Runtime Wiring

Runtime world locked-zone icon coverage:

- Locked zone marker: `status_stun.png` / texture key `status_stun_icon`.
- Current locked zones: `forgotten_citadel`, `chrono_spire`.

Production rule:

- `WorldScene.preload()` queues `status_stun.png` through `getStatusIconResource('stun')`.
- `_createZoneNode()` renders a loaded `status_stun_icon` image on top of each `unlocked: false` zone node.
- The marker uses `22x22` display size and nearest filtering.
- Zone labels, disabled click behavior, node alpha, keyboard navigation over unlocked zones, and world map action buttons remain in the existing `WorldScene` logic.
- If the status icon texture is missing, the locked zone keeps the previous `🔒` text fallback.

Exit criteria:

- Unit tests verify the locked zone icon id, preload path, image-first render path, nearest filtering, display size, object names, fallback label path, and QA payload icon counts.
- Status icon asset tests keep the Aseprite status icon roster coverage intact.
- Browser QA confirms `status_stun.png` is observed as a page resource on the world debug scene.
- Local Playwright QA confirms locked zone markers render as image objects with `status_stun_icon` and `22x22` display size, while no `🔒` fallback text objects are created when the texture is loaded.

Current QA state:

- Phase 95 implementation started on 2026-06-13.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts` failed one new test before implementation because `WorldScene` did not import/preload/render locked zone status icons.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts` passes with 37 tests after implementation.
- `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\statusIconAssets.test.ts tests\unit\skillIconAssets.test.ts tests\unit\uiFrameAssets.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts` passes with 70 tests.
- `npm --prefix client run typecheck` passes after the WorldScene locked-zone status icon wiring.
- `npm run build:client` passes after the WorldScene locked-zone status icon wiring.
- In-app Browser page asset inventory on `?debugScene=world&renderer=canvas&zone=aether_plains&worldFrameQa=1&qaRun=phase95-iab` observes `WorldScene.ts`, `spriteResourceManifest.ts`, `statusEffectIcons.ts`, and `status_stun.png`; asset summary is 139 total resources with 21 images, one visible `1920x1080` canvas, and no warn/error logs. The QA dataset reports `lockedZoneIcon.renderedCount: 2`, texture key `status_stun_icon`, display size `22x22`, and no missing frame/icon keys.
- Local Playwright QA on `?debugScene=world&renderer=canvas&zone=aether_plains&worldFrameQa=1&qaRun=phase95-local` confirms `world_locked_zone_icon_forgotten_citadel` and `world_locked_zone_icon_chrono_spire` are image objects with texture key `status_stun_icon` and `22x22` display size; no `🔒` fallback text objects are created; no failed non-favicon responses, request failures, page errors, or console warn/error logs are emitted.

## Phase 96: WorldScene Selected Zone Panel Icon Runtime Wiring

Runtime world selected-zone panel icon coverage:

- Selected-zone info panel marker: selected zone `zone_<zoneId>.png` / texture key `zone_<zoneId>`.
- Current QA route coverage: `aether_plains` uses `zone_aether_plains.png`.

Production rule:

- `WorldScene.preload()` already queues all worldmap zone icons through `getSpriteResourceForWorldZoneIcon(zone.id)`.
- `_onZoneClick()` renders the selected zone's loaded worldmap icon as `world_selected_zone_panel_icon_<zoneId>`.
- The marker uses `30x30` display size and nearest filtering.
- Selected-zone description text, era ambience line, encounter loading, travel button callback, and panel frame/preview rendering remain in the existing `WorldScene` logic.
- If the selected zone icon texture is missing, the panel keeps the previous `projection.tintColor` circle fallback named `world_selected_zone_panel_icon_fallback_<zoneId>`.

Exit criteria:

- Unit tests verify the selected-zone panel icon count, resource lookup, image-first render path, nearest filtering, display size, object names, fallback path, and QA payload icon counts.
- Worldmap icon asset tests keep the Aseprite worldmap icon roster coverage intact.
- Browser QA confirms `zone_aether_plains.png` is observed as a page resource on the world debug scene and `aeternaWorldFrameQa.selectedZonePanelIcon` reports one rendered icon.
- Local Playwright QA confirms the selected-zone panel marker renders as an image object with `zone_aether_plains` and `30x30` display size, while no color-dot fallback object is created when the texture is loaded.

Current QA state:

- Phase 96 implementation started on 2026-06-13.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts` failed one new test before implementation because `WorldScene` did not define/render/QA-probe the selected-zone panel icon.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts` passes with 38 tests after implementation.
- `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\statusIconAssets.test.ts tests\unit\skillIconAssets.test.ts tests\unit\uiFrameAssets.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts` passes with 71 tests.
- `npm --prefix client run typecheck` passes after the WorldScene selected-zone panel icon wiring.
- `npm run build:client` passes after the WorldScene selected-zone panel icon wiring.
- In-app Browser page asset inventory on `?debugScene=world&renderer=canvas&zone=aether_plains&worldFrameQa=1&qaRun=phase96-iab` observes `WorldScene.ts`, `spriteResourceManifest.ts`, `UI-HUD-003-DEF.png`, `UI-HUD-004-DEF.png`, `UI-BTN-006-DEF.png`, `zone_aether_plains.png`, and `ERB-BG-FAR-DAY.png`; asset summary is 139 total resources with 21 images, one visible `1920x1080` canvas, and no warn/error logs. The QA dataset reports `selectedZonePanelIcon.renderedCount: 1`, texture key `zone_aether_plains`, display size `30x30`, and no missing frame/icon keys.
- Local Playwright QA on `?debugScene=world&renderer=canvas&zone=aether_plains&worldFrameQa=1&qaRun=phase96-local-rerun` confirms `world_selected_zone_panel_icon_aether_plains` is an image object with texture key `zone_aether_plains` and `30x30` display size; no `world_selected_zone_panel_icon_fallback_aether_plains` fallback object is created; no failed non-favicon responses, request failures, page errors, or console warn/error logs are emitted.

## Phase 97: WorldScene Player Marker Avatar Runtime Wiring

Runtime world player marker avatar coverage:

- Player marker avatar: `char_battle_<classId>.png` / texture key `char_battle_<classId>`.
- Current QA route coverage: `ether_knight` uses `char_battle_ether_knight.png`.

Production rule:

- `WorldScene.preload()` queues the active class id's character battle thumbnail through `getWorldPlayerMarkerAvatarResource()`.
- `_addWorldPlayerMarker()` renders the loaded class thumbnail as `world_player_marker_avatar`.
- The marker uses `24x36` display size, nearest filtering, and the existing pulse/tween movement path.
- World node selection, travel tween completion, scene transition, and class handoff into `GameScene` remain in the existing `WorldScene` logic.
- If the class thumbnail texture is missing, the map keeps the previous white circle fallback named `world_player_marker_fallback`.

Exit criteria:

- Unit tests verify the player marker avatar resource map, preload path, image-first render path, nearest filtering, display size, object names, fallback path, and QA payload icon counts.
- Character battle thumbnail asset tests keep the Aseprite 64x96 thumbnail roster coverage intact.
- Browser QA confirms `char_battle_ether_knight.png` is observed as a page resource on the world debug scene and `aeternaWorldFrameQa.playerMarkerAvatar` reports one rendered image.
- Local Playwright QA confirms the player marker renders as an image object with `char_battle_ether_knight` and `24x36` display size, while no circle fallback object is created when the texture is loaded.

Current QA state:

- Phase 97 implementation started on 2026-06-13.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts` failed one new test before implementation because `WorldScene` still used only the procedural circle player marker.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts` passes with 39 tests after implementation.
- `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\characterBattleThumbnailAssets.test.ts tests\unit\uiFrameAssets.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts` passes with 71 tests.
- `npm --prefix client run typecheck` passes after the WorldScene player marker avatar wiring.
- `npm run build:client` passes after the WorldScene player marker avatar wiring.
- In-app Browser page asset inventory on `?debugScene=world&renderer=canvas&zone=aether_plains&class=ether_knight&worldFrameQa=1&qaRun=phase97-iab` observes `WorldScene.ts`, `spriteResourceManifest.ts`, `UI-HUD-003-DEF.png`, `UI-HUD-004-DEF.png`, `UI-BTN-006-DEF.png`, `char_battle_ether_knight.png`, `zone_aether_plains.png`, and `ERB-BG-FAR-DAY.png`; asset summary is 140 total resources with 22 images, one visible `1920x1080` canvas, and no warn/error logs. The QA dataset reports `playerMarkerAvatar.renderedCount: 1`, texture key `char_battle_ether_knight`, display size `24x36`, and no missing frame/avatar keys.
- Local Playwright QA on `?debugScene=world&renderer=canvas&zone=aether_plains&class=ether_knight&worldFrameQa=1&qaRun=phase97-local` confirms `world_player_marker_avatar` is an image object with texture key `char_battle_ether_knight` and `24x36` display size; no `world_player_marker_fallback` circle object is created; no failed non-favicon responses, request failures, page errors, or console warn/error logs are emitted.

## Phase 98: Standalone Minimap Player Marker Icon Runtime Wiring

Runtime standalone Minimap player marker coverage:

- Player marker icon: `char_battle_ether_knight.png` / texture key `char_battle_ether_knight`.
- Current QA route coverage: `?debugScene=minimap&renderer=canvas&minimapFrameQa=1` uses the Ether Knight battle thumbnail as the generic standalone player marker.

Production rule:

- `preloadMinimapUiFrameTextures()` now queues both the `UI-HUD-002-DEF` panel frame and `char_battle_ether_knight.png`.
- `_createPlayerMarkerIcon()` renders the loaded character battle thumbnail as `minimap_player_marker_icon`.
- The marker uses `10x14` display size and nearest filtering, while player position updates continue to use the existing minimap coordinate conversion.
- NPC/monster/portal/quest markers, zone label, click-to-move conversion, and panel frame inset handling remain in the existing `Minimap` logic.
- If the character battle thumbnail texture is missing, standalone `Minimap` keeps the previous green circle fallback named `minimap_player_marker_fallback`.

Exit criteria:

- Unit tests verify the player marker texture key/path, preload path, image-first render path, nearest filtering, display size, object names, fallback path, and QA payload marker icon counts.
- Character battle thumbnail asset tests keep the Aseprite 64x96 thumbnail roster coverage intact.
- Browser QA confirms `aeternaMinimapFrameQa.playerMarkerIcon` reports one rendered image with no missing marker icon keys.
- Local Playwright QA confirms the player marker renders as an image object with `char_battle_ether_knight` and `10x14` display size, while no circle fallback object is created when the texture is loaded.

Current QA state:

- Phase 98 implementation started on 2026-06-13.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts` failed one new test before implementation because standalone `Minimap` still used only the procedural player circle.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts` passes with 29 tests after implementation.
- `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts tests\unit\characterBattleThumbnailAssets.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts` passes with 32 tests.
- `npm --prefix client run typecheck` passes after the standalone Minimap player marker image wiring.
- `npm run build:client` passes after the standalone Minimap player marker image wiring.
- In-app Browser QA on `?debugScene=minimap&renderer=canvas&minimapFrameQa=1&qaRun=phase98-iab` observes `MinimapQaScene.ts`, `Minimap.ts`, `UI-HUD-002-DEF.png`, and `char_battle_ether_knight.png`; the QA dataset reports `playerMarkerIcon.renderedCount: 1`, texture key `char_battle_ether_knight`, display size `10x14`, `fallbackRendered: false`, no missing frame/marker icon keys, one visible canvas, and no warn/error console logs.
- Local Playwright QA on `?debugScene=minimap&renderer=canvas&minimapFrameQa=1&qaRun=phase98-local` confirms active scene `MinimapQaScene`, `minimap_player_marker_icon` is an image object with texture key `char_battle_ether_knight` and `10x14` display size, no `minimap_player_marker_fallback` object is created, and no page errors or console warn/error logs are emitted.

## Phase 99: Lobby Minimap NPC Marker Runtime Wiring

Runtime lobby minimap NPC marker coverage:

- Lobby NPC markers: `npc_blacksmith_kalen.png`, `npc_merchant_mira.png`, `npc_memory_fragment_board.png`, `npc_guild_hashir.png`, `npc_elder_mateus.png`.
- Runtime texture keys: `npc_blacksmith_kalen_sprite`, `npc_merchant_mira_sprite`, `npc_memory_fragment_board_sprite`, `npc_guild_hashir_sprite`, `npc_elder_mateus_sprite`.

Production rule:

- `LobbyScene.preload()` already queues each town NPC spritesheet through `getSpriteResourceForLobbyNpc()`.
- `_drawMinimap()` now calls `_addLobbyMinimapNpcMarker()` for each `TOWN_NPCS` entry instead of creating a procedural circle directly.
- `_addLobbyMinimapNpcMarker()` renders loaded NPC spritesheet frame 0 as `lobby_minimap_npc_marker_<npcId>`.
- Each marker uses `10x10` display size and nearest filtering.
- Lobby minimap frame, label, NPC world positions, click/dialogue logic, keyboard navigation, and modal flows remain in the existing `LobbyScene` logic.
- If an NPC spritesheet texture is missing, the marker keeps the previous color circle fallback named `lobby_minimap_npc_marker_fallback_<npcId>`.

Exit criteria:

- Unit tests verify the lobby minimap marker image-first render path, nearest filtering, display size, object names, fallback path, and QA payload.
- NPC sprite asset tests keep the Aseprite NPC spritesheet roster coverage intact.
- Browser QA confirms `aeternaLobbyMinimapMarkerQa` reports five rendered marker images with no missing marker texture keys or fallback ids.
- Local Playwright QA confirms the five minimap markers render as image objects with NPC sprite texture keys and `10x10` display size, while no circle fallback objects are created when textures are loaded.

Current QA state:

- Phase 99 implementation started on 2026-06-13.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts` failed one new test before implementation because `LobbyScene._drawMinimap()` still created only procedural circle NPC markers.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts` passes with 29 tests after implementation.
- `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts tests\unit\spriteResourceManifest.test.ts tests\unit\npcSpriteAssets.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts` passes with 70 tests.
- `npm --prefix client run typecheck` passes after the LobbyScene minimap NPC marker wiring.
- In-app Browser QA on `?debugScene=lobby&renderer=canvas&lobbyMinimapMarkerQa=1&qaRun=phase99-iab` observes `LobbyScene.ts`, `UI-HUD-002-DEF.png`, and all five lobby NPC spritesheet PNGs; the QA dataset reports `renderedMarkerCount: 5`, `expectedMarkerCount: 5`, marker display size `10x10`, no missing marker texture keys, no fallback marker ids, one visible canvas, and no warn/error console logs.
- Local Playwright QA on `?debugScene=lobby&renderer=canvas&lobbyMinimapMarkerQa=1&qaRun=phase99-local` confirms active scene `LobbyScene`; all five `lobby_minimap_npc_marker_<npcId>` objects are `Image` objects with NPC sprite texture keys and `10x10` display size; no `lobby_minimap_npc_marker_fallback_<npcId>` objects are created; and no page errors or console warn/error logs are emitted.

## Phase 100: Standalone Minimap Dynamic Marker Runtime Wiring

Runtime standalone Minimap dynamic marker coverage:

- NPC marker: `npc_merchant_mira.png` / texture key `npc_merchant_mira_sprite`.
- Monster marker: `mon_erebos_memory_dust_normal.png` / texture key `mon_erebos_memory_dust_normal_sprite`.
- Portal marker: `skill_vw_warp.png` / texture key `skill_vw_warp_icon`.
- Quest marker: `ITM-QST-004.png` / texture key `icon_item_ITM-QST_004`.

Production rule:

- `preloadMinimapUiFrameTextures()` now queues the standalone minimap panel frame, player marker thumbnail, and dynamic marker icons/spritesheets.
- `_renderMarkers()` creates each marker through `_createMarkerVisual()` instead of creating a procedural circle directly.
- Loaded dynamic marker textures render as `minimap_marker_icon_<type>_<id>` image objects.
- Dynamic marker images use `10x10` display size, nearest filtering, and spritesheet frame `0` where applicable.
- Zone label, marker position updates, click-to-move conversion, socket event routing, and panel frame inset handling remain in the existing `Minimap` logic.
- If a dynamic marker texture is missing, the marker keeps the previous color circle fallback named `minimap_marker_fallback_<type>_<id>`.

Exit criteria:

- Unit tests verify the dynamic marker texture table, preload paths, image-first render path, spritesheet frame selection, display size, object names, fallback path, and QA payload.
- NPC sprite, monster sprite, skill icon, runtime image reference, and sprite resource manifest tests keep the Aseprite resource coverage intact.
- Browser QA confirms `aeternaMinimapFrameQa.dynamicMarkerIcon` reports four rendered marker images with no missing marker texture keys or fallback ids.
- Local Playwright QA confirms all four standalone minimap dynamic markers render as image objects with expected texture keys and `10x10` display size, while no circle fallback objects are created when textures are loaded.

Current QA state:

- Phase 100 implementation started on 2026-06-13.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts` failed one new test before implementation because standalone `Minimap` did not define `MINIMAP_DYNAMIC_MARKER_TEXTURES`.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts` passes with 29 tests after implementation.
- `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts tests\unit\spriteResourceManifest.test.ts tests\unit\npcSpriteAssets.test.ts tests\unit\skillIconAssets.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\monsterPipeline.runtime.test.ts tests\unit\monsterImageAssets.test.ts` passes with 79 tests.
- `npm --prefix client run typecheck` passes after the standalone Minimap dynamic marker image wiring.
- `npm run build:client` passes after the standalone Minimap dynamic marker image wiring.
- In-app Browser QA on `?debugScene=minimap&renderer=canvas&minimapFrameQa=1&qaRun=phase100-iab` observes `Minimap.ts`, `MinimapQaScene.ts`, `UI-HUD-002-DEF.png`, `char_battle_ether_knight.png`, `npc_merchant_mira.png`, `mon_erebos_memory_dust_normal.png`, `skill_vw_warp.png`, and `ITM-QST-004.png`; the QA dataset reports `dynamicMarkerIcon.renderedCount: 4`, `expectedCount: 4`, no missing marker icon keys, no fallback marker ids, one visible canvas, and no warn/error console logs.
- Local Playwright QA on `?debugScene=minimap&renderer=canvas&minimapFrameQa=1&qaRun=phase100-local` confirms active scene `MinimapQaScene`; all four `minimap_marker_icon_<type>_<id>` objects are `Image` objects with expected texture keys and `10x10` display size; `minimap_player_marker_icon` remains an `Image` object with `char_battle_ether_knight` and `10x14` display size; no `minimap_marker_fallback_<type>_<id>` objects are created; and no page errors or console warn/error logs are emitted.

## Phase 101: MinimapOverlay Marker Icon Runtime Wiring

Runtime MinimapOverlay marker icon coverage:

- Player marker: `char_battle_ether_knight.png` / texture key `char_battle_ether_knight`.
- NPC marker: `npc_ghost_merchant_gorodi.png` / texture key `npc_ghost_merchant_gorodi_sprite`.
- Monster and monster aggro marker: `mon_erebos_memory_dust_normal.png` / texture key `mon_erebos_memory_dust_normal_sprite`.
- Dungeon marker: `zone_crystal_cave.png` / texture key `zone_crystal_cave`.
- Quest marker: `ITM-QST-004.png` / texture key `icon_item_ITM-QST_004`.
- Waypoint marker: `skill_vw_warp.png` / texture key `skill_vw_warp_icon`.

Production rule:

- `preloadMinimapOverlayUiFrameTextures()` now queues the overlay panel frame and marker icon/spritesheet textures.
- `MinimapOverlay` keeps `markerGraphics` only for missing-texture fallback and the monster aggro emphasis ring.
- Loaded marker textures render into the marker icon layer as `minimap_overlay_marker_icon_<type>_<id>` image objects.
- The player marker renders as `minimap_overlay_player_marker_icon`.
- Marker icon display sizes remain compact for overlay readability: player `10x14`, NPC/monster `10x10`, aggro/dungeon `12x12`, quest/waypoint `11x11`.
- Zone label, coordinate label, fullscreen resizing, waypoint conversion, click input, and map content inset handling remain in the existing `MinimapOverlay` logic.

Exit criteria:

- Unit tests verify the overlay marker texture table, preload paths, image-first render path, spritesheet frame selection, display sizes, object names, and QA payload.
- NPC sprite, monster sprite, skill icon, status icon, runtime image reference, and sprite resource manifest tests keep the Aseprite resource coverage intact.
- Browser QA confirms `aeternaMinimapOverlayFrameQa.markerIcon` reports six rendered marker images with no missing marker texture keys or fallback ids.
- Local Playwright QA confirms all overlay marker icons render as `Image` objects with expected texture keys and display sizes, while no marker fallback path is used when textures are loaded.

Current QA state:

- Phase 101 implementation started on 2026-06-13.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts` failed one new test before implementation because `MinimapOverlay` did not define `MINIMAP_OVERLAY_MARKER_TEXTURES`.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts` passes with 29 tests after implementation.
- `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts tests\unit\spriteResourceManifest.test.ts tests\unit\npcSpriteAssets.test.ts tests\unit\skillIconAssets.test.ts tests\unit\statusIconAssets.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\monsterPipeline.runtime.test.ts tests\unit\monsterImageAssets.test.ts` passes with 80 tests.
- `npm --prefix client run typecheck` passes after the MinimapOverlay marker icon wiring.
- `npm run build:client` passes after the MinimapOverlay marker icon wiring.
- In-app Browser QA on `?debugScene=minimapOverlay&renderer=canvas&minimapOverlayFrameQa=1&qaRun=phase101-iab` observes `MinimapOverlay.ts`, `MinimapOverlayQaScene.ts`, `UI-HUD-002-DEF.png`, `char_battle_ether_knight.png`, `npc_ghost_merchant_gorodi.png`, `mon_erebos_memory_dust_normal.png`, `zone_crystal_cave.png`, `ITM-QST-004.png`, and `skill_vw_warp.png`; the QA dataset reports `markerIcon.renderedCount: 6`, `expectedCount: 6`, no missing marker icon keys, no fallback marker ids, one visible canvas, and no warn/error console logs.
- Local Playwright QA on `?debugScene=minimapOverlay&renderer=canvas&minimapOverlayFrameQa=1&qaRun=phase101-local` confirms active scene `MinimapOverlayQaScene`; all five `minimap_overlay_marker_icon_<type>_<id>` objects and `minimap_overlay_player_marker_icon` are `Image` objects with expected texture keys and display sizes; no page errors or console warn/error logs are emitted.

## Phase 102: FeedbackForm Type Icon Runtime Wiring

Runtime FeedbackForm type icon coverage:

- Bug type: `status_poison.png` / texture key `status_poison_icon`.
- Feature type: `status_haste.png` / texture key `status_haste_icon`.
- Balance type: `status_shield.png` / texture key `status_shield_icon`.
- UX type: `status_charm.png` / texture key `status_charm_icon`.
- Other type: `status_stun.png` / texture key `status_stun_icon`.

Production rule:

- `FeedbackForm.preload()` now queues the panel/button UI frames and five type status icon PNGs through `getStatusIconResource()`.
- Type buttons still use `UI-BTN-006-DEF.png` as their button frame.
- Loaded type icon textures render as `feedback_form_type_icon_<type>` image objects.
- Type icon display size is fixed at `18x18` for compact button readability.
- Button labels, pointer handlers, keyboard focus handling, submit flow, close flow, and HTML input/textarea behavior remain in the existing `FeedbackForm` logic.
- If a type icon texture is missing, the type button keeps the previous emoji label fallback and records the fallback type id.

Exit criteria:

- Unit tests verify the type icon texture table, `getStatusIconResource()` mapping, preload path, image-first render path, display size, object names, fallback tracking, and QA payload.
- Status icon, runtime image reference, and sprite resource manifest tests keep the reused Aseprite status icon coverage intact.
- Browser QA confirms `aeternaFeedbackFrameQa.typeIcon` reports five rendered type icons with no missing type icon keys or fallback ids.
- Local Playwright QA confirms all five feedback type icons render as `Image` objects with expected texture keys and `18x18` display size, while no emoji type fallback labels are created when textures are loaded.

Current QA state:

- Phase 102 implementation started on 2026-06-13.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts` failed one new test before implementation because `FeedbackForm` did not import `getStatusIconResource()` or define `FEEDBACK_FORM_TYPE_ICON_TEXTURES`.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts` passes with 29 tests after implementation.
- `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts tests\unit\statusIconAssets.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\spriteResourceManifest.test.ts` passes with 70 tests.
- `npm --prefix client run typecheck` passes after the FeedbackForm type icon wiring.
- `npm run build:client` passes after the FeedbackForm type icon wiring.
- The existing dev server on port `5173` was restarted because it initially served the stale pre-change `FeedbackForm.ts`; after restart the served source contains `FEEDBACK_FORM_TYPE_ICON_TEXTURES`.
- In-app Browser QA on `?debugScene=feedback&renderer=canvas&qaRun=phase102-iab-restarted` observes `FeedbackForm.ts`, `UI-SET-002-DEF.png`, `UI-BTN-006-DEF.png`, `status_poison.png`, `status_haste.png`, `status_shield.png`, `status_charm.png`, and `status_stun.png`; the QA dataset reports `typeIcon.renderedCount: 5`, `expectedCount: 5`, no missing type icon keys, no fallback type ids, one visible canvas, and no warn/error console logs.
- Local Playwright QA on `?debugScene=feedback&renderer=canvas&qaRun=phase102-local` confirms active scene `FeedbackForm`; all five `feedback_form_type_icon_<type>` objects are `Image` objects with expected texture keys and `18x18` display size; no emoji type fallback labels, failed non-favicon responses, request failures, page errors, or console warn/error logs are emitted.

## Phase 103: SettingsScene Action Icon Runtime Wiring

Runtime SettingsScene action icon coverage:

- Feedback action: `skill_mw_arrow.png` / texture key `skill_mw_arrow_icon`.
- Back action: `skill_tg_reverse.png` / texture key `skill_tg_reverse_icon`.

Production rule:

- `SettingsScene.preload()` now queues the two action skill icon PNGs through `getSpriteResourceForSkillIcon()` in addition to the existing settings panel, action button, and slider track frames.
- Feedback/back buttons still use `UI-BTN-006-DEF.png` as their button frame.
- Loaded action icon textures render as `settings_action_icon_feedback` and `settings_action_icon_back` image objects.
- Action icon display size is fixed at `18x18` for compact footer button readability.
- Button labels, pointer handlers, feedback form launch, back navigation, keyboard focus text, and settings persistence remain in the existing `SettingsScene` logic.
- If an action icon texture is missing, the button keeps the previous `📝` or `◀` label fallback and records the fallback action id.

Exit criteria:

- Unit tests verify the action icon texture table, `getSpriteResourceForSkillIcon()` mapping, preload path, image-first render path, display size, object names, fallback tracking, and QA payload.
- Skill icon, runtime image reference, and sprite resource manifest tests keep the reused Aseprite skill icon coverage intact.
- Browser QA confirms `aeternaSettingsFrameQa.actionIcon` reports two rendered action icons with no missing action icon keys or fallback ids.
- Local Playwright QA confirms both SettingsScene action icons render as `Image` objects with expected texture keys and `18x18` display size, while no emoji/glyph fallback labels are created when textures are loaded.

Current QA state:

- Phase 103 implementation started on 2026-06-13.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts` failed one new test before implementation because `SettingsScene` did not import `getSpriteResourceForSkillIcon()` or define the action icon texture table.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts` passes with 29 tests after implementation.
- `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts tests\unit\skillIconAssets.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\spriteResourceManifest.test.ts` passes with 71 tests.
- `npm --prefix client run typecheck` passes after the SettingsScene action icon wiring.
- `npm run build:client` passes after the SettingsScene action icon wiring.
- In-app Browser QA on `?debugScene=settings&renderer=canvas&settingsFrameQa=1&qaRun=phase103-iab` observes `SettingsScene.ts`, `UI-SET-002-DEF.png`, `UI-SET-003-DEF.png`, `UI-SET-004-DEF.png`, `UI-BTN-006-DEF.png`, `UI-BTN-005-DEF.png`, `skill_mw_arrow.png`, and `skill_tg_reverse.png`; the QA dataset reports `actionIcon.renderedCount: 2`, `expectedCount: 2`, no missing action icon keys, no fallback action ids, one visible canvas, and no warn/error console logs.
- Local Playwright QA on `?debugScene=settings&renderer=canvas&settingsFrameQa=1&qaRun=phase103-local` confirms active scene `SettingsScene`; `settings_action_icon_feedback` and `settings_action_icon_back` are `Image` objects with expected texture keys and `18x18` display size; no `📝 피드백 보내기` or `◀ 뒤로가기` fallback labels, failed non-favicon responses, request failures, page errors, or console warn/error logs are emitted.

## Phase 104: CharacterSelect Existing Avatar Runtime Wiring

Runtime CharacterSelect existing character avatar coverage:

- Ether Knight existing row: `char_battle_ether_knight.png` / texture key `char_battle_ether_knight`.
- The runtime table also covers `char_battle_memory_weaver.png`, `char_battle_shadow_weaver.png`, `char_battle_memory_breaker.png`, `char_battle_time_guardian.png`, and `char_battle_void_wanderer.png` for server-provided existing characters.

Production rule:

- `CharacterSelectScene.preload()` now queues all six `char_battle_*` Aseprite battle thumbnail PNGs in addition to the existing class front illustrations and UI frames.
- Existing character rows use `character_select_existing_avatar_<classId>` image objects before the name/class/stat text.
- Avatar display size is fixed at `28x42` so the 64x96 source thumbnail reads clearly inside the 500x65 row.
- Character selection, create-mode class cards, DOM name input, action button frame, keyboard focus, and API selection flow remain in the existing `CharacterSelectScene` logic.
- If an avatar texture is missing, the row keeps the previous color circle fallback and records the fallback class id.
- `characterSelectExistingQa=1` seeds one offline existing Ether Knight row for deterministic browser QA without auth/API dependency.

Exit criteria:

- Unit tests verify the avatar resource table, preload path, existing-row image-first render path, display size, object names, fallback tracking, deterministic QA seed, debug route param, and QA payload.
- Character battle thumbnail and runtime image reference tests keep the reused Aseprite thumbnail coverage intact.
- Browser QA confirms `aeternaCharacterSelectFrameQa.existingCharacterAvatar` reports one rendered existing avatar with no missing avatar keys or fallback class ids.

Current QA state:

- Phase 104 implementation started on 2026-06-13.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts` failed one new test before implementation because `CharacterSelectScene` did not define the existing avatar count/table or row avatar QA contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts` passes with 29 tests after implementation.
- `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts tests\unit\characterBattleThumbnailAssets.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts` passes with 32 tests.
- `npm --prefix client run typecheck` passes after the CharacterSelect existing avatar wiring.
- `npm run build:client` passes after the CharacterSelect existing avatar wiring.
- In-app Browser QA on `?debugScene=characterSelect&renderer=canvas&characterSelectFrameQa=1&characterSelectExistingQa=1&qaRun=phase104-iab` observes `CharacterSelectScene.ts`, six `char_illust_*_front.png` images, six `char_battle_*.png` images, `UI-INV-001-DEF.png`, `UI-INV-002-DEF.png`, and `UI-BTN-006-DEF.png`; the QA dataset reports `existingCharacterAvatar.renderedCount: 1`, `expectedCount: 1`, texture key `char_battle_ether_knight`, display size `28x42`, no missing existing avatar keys, no fallback class ids, one visible canvas, and no warn/error console logs.

## Phase 105: SkillTree Node Icon Runtime QA Wiring

Runtime SkillTree node icon coverage:

- Ether Knight skill tree QA route: `skill_ek_slash.png`, `skill_ek_shield.png`, `skill_ek_charge.png`, `skill_ek_explode.png`, `skill_ek_ultimate.png`.
- Runtime texture keys: `skill_ek_slash_icon`, `skill_ek_shield_icon`, `skill_ek_charge_icon`, `skill_ek_explode_icon`, `skill_ek_ultimate_icon`.
- The preload path also covers all six class skill tree icon rosters through `preloadSkillTreeIconResources()`.

Production rule:

- `LobbyScene.preload()` already queues skill tree icon resources before `SkillTreeUI` opens.
- `SkillTreeUI._renderTree()` names loaded node images as `skill_tree_node_icon_<skillId>`.
- Loaded node icons use `48x48` display size and nearest filtering.
- Skill node background, level label, name text, pointer callbacks, detail panel, and respec flow remain in the existing dynamic Phaser UI logic.
- If a node icon texture is missing, the node keeps the previous text icon fallback named `skill_tree_node_icon_fallback_<skillId>` and records the fallback skill id.
- `skillTreeQa=1` writes `aeternaSkillTreeFrameQa.skillNodeIcon` with expected/rendered counts, expected/rendered texture keys, display sizes, fallback skill ids, and missing icon keys.

Exit criteria:

- Unit tests verify the node icon expected count, image-first render path, object names, fallback tracking, and QA payload.
- Skill icon, runtime image reference, and sprite resource manifest tests keep the reused Aseprite skill icon coverage intact.
- Browser QA confirms `aeternaSkillTreeFrameQa.skillNodeIcon` reports five rendered node icons with no missing icon keys or fallback ids.

Current QA state:

- Phase 105 implementation started on 2026-06-13.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts` failed one new test before implementation because `SkillTreeUI` did not define the node icon QA count/arrays or fallback tracking contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts` passes with 29 tests after implementation.
- `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts tests\unit\skillIconAssets.test.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts` passes with 71 tests.
- `npm --prefix client run typecheck` passes after the SkillTree node icon QA wiring.
- `npm run build:client` passes after the SkillTree node icon QA wiring.
- In-app Browser QA on `?debugScene=lobby&renderer=canvas&zone=aether_plains&skillTreeQa=1&class=ether_knight&level=15&qaRun=phase105-iab` reports `skillNodeIcon.renderedCount: 5`, `expectedCount: 5`, texture keys `skill_ek_slash_icon`, `skill_ek_shield_icon`, `skill_ek_charge_icon`, `skill_ek_explode_icon`, `skill_ek_ultimate_icon`, display size `48x48`, no missing skill node icon keys, no fallback skill node icon ids, one visible canvas, and no warn/error console logs.

## Phase 106: Lobby Bottom Nav Icon Runtime Wiring

Runtime Lobby bottom nav icon coverage:

- World nav: `zone_aether_plains.png` / texture key `zone_aether_plains`.
- Dungeon nav: `zone_crystal_cave.png` / texture key `zone_crystal_cave`.
- Inventory nav: `ITM-CON-001.png` / texture key `icon_item_ITM-CON_001`.
- Skill nav: `skill_ek_slash.png` / texture key `skill_ek_slash_icon`.
- Quest nav: `ITM-QST-004.png` / texture key `icon_item_ITM-QST_004`.

Production rule:

- `LobbyScene.preload()` now queues the five bottom nav icon resources through `spriteResourceManifest` and `itemIconResources`.
- `_drawNavButtons()` renders loaded nav textures as `lobby_nav_icon_<id>` image objects before the dynamic text label.
- Loaded nav icons use `18x18` display size and nearest filtering for compact footer readability.
- Button focus, pointer handlers, keyboard navigation, scene switching, modal opening, and text labels remain in the existing dynamic Phaser UI logic.
- If a nav icon texture is missing, the button keeps the previous emoji label fallback and records the fallback nav id.
- `lobbyNavIconQa=1` writes `aeternaLobbyNavIconQa` with expected/rendered counts, expected/rendered texture keys, display sizes, fallback nav ids, and missing icon keys.

Exit criteria:

- Unit tests verify the nav icon texture table, resource resolution, preload path, image-first render path, display size, object names, fallback tracking, and QA payload.
- Skill icon, item icon, worldmap icon, runtime image reference, and sprite resource manifest tests keep the reused Aseprite resource coverage intact.
- Browser QA confirms `aeternaLobbyNavIconQa` reports five rendered nav icons with no missing icon keys or fallback ids.

Current QA state:

- Phase 106 implementation started on 2026-06-13.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts` failed one new test before implementation because `LobbyScene` did not define `LOBBY_NAV_ICON_TEXTURES` or the nav icon QA contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts` passes with 29 tests after implementation.
- `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts tests\unit\skillIconAssets.test.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\itemIconAssets.test.ts` passes with 71 tests for the matched related suites.
- `npm --prefix client run typecheck` passes after the Lobby bottom nav icon wiring.
- `npm run build:client` passes after the Lobby bottom nav icon wiring.
- In-app Browser QA on `?debugScene=lobby&renderer=canvas&zone=aether_plains&lobbyNavIconQa=1&qaRun=phase106-iab` reports `status: "ready"`, `renderedCount: 5`, `expectedCount: 5`, texture keys `zone_aether_plains`, `zone_crystal_cave`, `icon_item_ITM-CON_001`, `skill_ek_slash_icon`, `icon_item_ITM-QST_004`, display size `18x18`, no missing nav icon keys, no fallback nav icon ids, one visible canvas, and no warn/error console logs.

## Phase 107: DialogueBox Next Indicator Icon Runtime Wiring

Runtime DialogueBox next indicator icon coverage:

- Next indicator: `skill_mw_arrow.png` / texture key `skill_mw_arrow_icon`.

Production rule:

- `preloadDialogueBoxUiFrameTextures()` now queues the next indicator skill icon in addition to the panel and choice button frames.
- `DialogueBox` renders the loaded next indicator as `dialogue_box_next_indicator_icon`.
- The next indicator uses `16x16` display size, nearest filtering, and `90` degree rotation to preserve the previous downward prompt semantics.
- Speaker/body text, typing animation, skip/next callbacks, choice rendering, and keyboard input remain in the existing dynamic Phaser UI logic.
- If the icon texture is missing, the indicator keeps the previous `▼` glyph fallback named `dialogue_box_next_indicator_fallback`.
- `dialogueBoxNextIndicatorQa=1` drives a no-choice QA dialogue so the next indicator is visible and writes `aeternaDialogueBoxFrameQa.nextIndicatorIcon`.

Exit criteria:

- Unit tests verify the icon id, preload path, image-first render path, display size, rotation, fallback object name, QA route, and QA payload.
- Skill icon, runtime image reference, and sprite resource manifest tests keep the reused Aseprite skill icon coverage intact.
- Browser QA confirms `aeternaDialogueBoxFrameQa.nextIndicatorIcon` renders `skill_mw_arrow_icon` with no missing icon keys or fallback glyph.

Current QA state:

- Phase 107 implementation started on 2026-06-13.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts` failed one new assertion before implementation because `DialogueBox.ts` did not import `getSpriteResourceForSkillIcon()` or define the next indicator icon contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts` passes with 29 tests after implementation.
- `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts tests\unit\skillIconAssets.test.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts` passes with 71 tests.
- `npm --prefix client run typecheck` passes after the DialogueBox next indicator icon wiring.
- In-app Browser QA on `?debugScene=dialogueBox&renderer=canvas&dialogueBoxFrameQa=1&dialogueBoxNextIndicatorQa=1&qaRun=phase107-iab` reports `status: "ready"`, `nextIndicatorIcon.rendered: true`, `visible: true`, texture key `skill_mw_arrow_icon`, display size `16x16`, angle `90`, no missing icon keys, no fallback glyph, one visible canvas, and no warn/error console logs.

## Phase 108: ChatUI Emoji Button Icon Runtime Wiring

Runtime ChatUI emoji button icon coverage:

- Emoji button icon: `status_charm.png` / texture key `status_charm_icon`.

Production rule:

- `preloadChatUiFrameTextures()` now queues the charm status icon in addition to the panel/input/tab/emoji button frames.
- `ChatUI` renders the loaded icon as `chat_emoji_button_icon` on top of the existing Aseprite emoji button frame.
- The loaded icon uses `16x16` display size and nearest filtering for compact chat input readability.
- Channel switching, message rows, unread count, emoji insertion, input buffer handling, and socket event behavior remain in the existing dynamic Phaser UI logic.
- If the icon texture is missing, the button keeps the previous `😀` glyph fallback named `chat_emoji_button_fallback`.
- `chatFrameQa=1` writes `aeternaChatFrameQa.emojiButtonIcon` with icon id, texture key/path, display size, fallback state, and missing icon keys.

Exit criteria:

- Unit tests verify the status icon id, preload path, image-first render path, display size, fallback object name, QA route, and QA payload.
- Status icon, runtime image reference, and sprite resource manifest tests keep the reused Aseprite status icon coverage intact.
- Browser QA confirms `aeternaChatFrameQa.emojiButtonIcon` renders `status_charm_icon` with no missing icon keys or fallback glyph.

Current QA state:

- Phase 108 implementation started on 2026-06-13.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts` failed one new assertion before implementation because `ChatUI.ts` did not import `getSpriteResourceForStatusIcon()` or define the emoji button icon contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts` passes with 29 tests after implementation.
- `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts tests\unit\statusIconAssets.test.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts` passes with 70 tests.
- `npm --prefix client run typecheck` passes after the ChatUI emoji button icon wiring.
- `npm run build:client` passes after the ChatUI emoji button icon wiring; the only noted build warning is Vite's CJS Node API deprecation warning.
- In-app Browser QA on `?debugScene=chat&renderer=canvas&chatFrameQa=1&qaRun=phase108-iab` reports `status: "ready"`, `emojiButtonIcon.rendered: true`, `visible: true`, texture key `status_charm_icon`, path `assets/generated/ui/icons/status/status_charm.png`, display size `16x16`, no missing icon keys, no fallback glyph, one visible canvas, and no warn/error console logs.

## Phase 109: SkillTree Reset Action Icon Runtime Wiring

Runtime SkillTree reset action icon coverage:

- Reset action icon: `skill_tg_reverse.png` / texture key `skill_tg_reverse_icon`.

Production rule:

- `preloadSkillTreeUiFrameTextures()` now queues the reset action skill icon in addition to the main/detail/action button frames.
- `SkillTreeUI` renders the loaded reset icon as `skill_tree_reset_action_icon` on top of the existing Aseprite action button frame.
- The loaded icon uses `18x18` display size and nearest filtering for compact footer-button readability.
- Skill node rendering, detail panel behavior, reset confirmation, reset request, focus ring, and button callback behavior remain in the existing dynamic Phaser UI logic.
- If the icon texture is missing, the reset button keeps the previous glyph label fallback and records fallback state.
- `skillTreeQa=1` writes `aeternaSkillTreeFrameQa.resetActionIcon` with icon id, texture key/path, display size, fallback state, and missing icon keys.

Exit criteria:

- Unit tests verify the reset action icon id, preload path, image-first render path, display size, fallback state, QA route, and QA payload.
- Skill icon, runtime image reference, and sprite resource manifest tests keep the reused Aseprite skill icon coverage intact.
- Browser QA confirms `aeternaSkillTreeFrameQa.resetActionIcon` renders `skill_tg_reverse_icon` with no missing icon keys or fallback glyph.

Current QA state:

- Phase 109 implementation started on 2026-06-13.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts` failed one new assertion before implementation because `SkillTreeUI.ts` did not define `SKILL_TREE_RESET_ACTION_ICON_ID` or the reset action icon QA contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts` passes with 29 tests after implementation.
- `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts tests\unit\skillIconAssets.test.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts` passes with 71 tests.
- `npm --prefix client run typecheck` passes after the SkillTree reset action icon wiring.
- `npm run build:client` passes after the SkillTree reset action icon wiring; the only noted build warning is Vite's CJS Node API deprecation warning.
- In-app Browser QA on `?debugScene=lobby&renderer=canvas&zone=aether_plains&skillTreeQa=1&class=ether_knight&level=15&qaRun=phase109-iab` reports `status: "ready"`, `resetActionIcon.renderedCount: 1`, `expectedCount: 1`, texture key `skill_tg_reverse_icon`, path `assets/generated/ui/icons/skills/skill_tg_reverse.png`, display size `18x18`, no missing icon keys, no fallback glyph, one visible canvas, and no warn/error console logs.

## Phase 110: WorldScene Title Icon Runtime Wiring

Runtime WorldScene title icon coverage:

- Title map icon: `zone_aether_plains.png` / texture key `zone_aether_plains`.

Production rule:

- `WorldScene` reuses the existing worldmap icon resource for the title map marker.
- The loaded icon renders as `world_title_map_icon` with `24x24` display size and nearest filtering.
- The title text, chrono controls, world node selection, action buttons, selected-zone panel, and scene transitions remain in the existing dynamic Phaser UI logic.
- If the icon texture is missing, the title keeps the previous `🗺️` glyph fallback named `world_title_map_icon_fallback`.
- `worldFrameQa=1` writes `aeternaWorldFrameQa.titleIcon` with zone id, texture key/path, display size, fallback state, and missing icon keys.

Exit criteria:

- Unit tests verify the title icon zone id, image-first render path, display size, nearest filtering, fallback object name, and QA payload fields.
- Worldmap icon, runtime image reference, and sprite resource manifest tests keep the reused Aseprite worldmap icon coverage intact.
- Browser QA confirms `aeternaWorldFrameQa.titleIcon` renders `zone_aether_plains` with no missing icon keys or fallback glyph.

Current QA state:

- Phase 110 implementation started on 2026-06-13.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts` failed one new assertion before implementation because `WorldScene.ts` did not define `WORLD_TITLE_ICON_ZONE_ID` or the title icon QA contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts` passes with 29 tests after implementation.
- `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts` passes with 69 tests.
- `npm --prefix client run typecheck` passes after the WorldScene title icon wiring.
- `npm run build:client` passes after the WorldScene title icon wiring; the only noted build warning is Vite's CJS Node API deprecation warning.
- In-app Browser QA on `?debugScene=world&renderer=canvas&zone=aether_plains&worldFrameQa=1&class=ether_knight&qaRun=phase110-iab` reports `status: "ready"`, `titleIcon.renderedCount: 1`, `expectedCount: 1`, texture key `zone_aether_plains`, path `assets/generated/ui/worldmap/zone_aether_plains.png`, display size `24x24`, `fallbackRendered: false`, no missing icon keys, `missingFrameKeys: []`, one visible canvas, and no warn/error console logs.
- In-app Browser page asset inventory reports 140 total resources with 22 images and observes `WorldScene.ts`, `spriteResourceManifest.ts`, `zone_aether_plains.png`, `UI-HUD-003-DEF.png`, `UI-HUD-004-DEF.png`, `UI-BTN-006-DEF.png`, `ERB-BG-FAR-DAY.png`, and `char_battle_ether_knight.png`.

## Phase 111: HudOverlay Quest Map Button Icon Runtime Wiring

Runtime HudOverlay quest map button icon coverage:

- Quest map button icon: `zone_malatus_sanctuary.png` / texture key `zone_malatus_sanctuary`.

Production rule:

- `questRowView` resolves `QuestItem.mapZoneId` through `getSpriteResourceForWorldZoneIcon()`.
- If a worldmap icon resource exists, the DOM button renders `.hud-quest-map-icon` as a `16x16` image and keeps the visible label as `월드맵 열기 (ESC)` without the legacy `🗺` glyph.
- If `mapZoneId` does not resolve to a worldmap resource, such as item target `frostmoss_sap`, the map button is hidden and only `actionHint` remains.
- Button click delegation, `data-map-zone-id`, `ui.event.quest.open_map`, quickslot behavior, and dialogue DOM behavior remain in the existing logic.
- `hudFrameQa=1` writes `aeternaHudFrameQa.questMapIcon` with expected/rendered image count, missing quest map icon keys, and actual image states.

Exit criteria:

- Unit tests verify the image-first quest map button HTML, icon path/key data attributes, removal of the legacy glyph label, and hidden-button behavior for non-worldmap IDs.
- HUD frame asset tests verify the `.hud-quest-map-icon` CSS contract and `questMapIcon` QA payload fields.
- Browser QA confirms one rendered quest map icon for `malatus_sanctuary`, no fallback map glyphs, and no bogus map button for `frostmoss_sap`.

Current QA state:

- Phase 111 implementation started on 2026-06-13.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\questRowView.test.ts tests\unit\uiFrameAssets.test.ts` failed before implementation because `questRowView` did not render `.hud-quest-map-icon` and `HudOverlay` did not expose the quest map icon QA contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\questRowView.test.ts tests\unit\uiFrameAssets.test.ts` passes with 36 tests after implementation.
- A second RED case confirmed `mapZoneId: "frostmoss_sap"` still rendered a legacy map button before the hidden-button guard. The corrected `questRowView` test now passes with 8 tests.
- `npx vitest run --config tests\vitest.config.ts tests\unit\questRowView.test.ts tests\unit\uiFrameAssets.test.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts` passes with 77 tests.
- `npm --prefix client run typecheck` passes after the HudOverlay quest map icon wiring.
- `npm run build:client` passes after the HudOverlay quest map icon wiring; the only noted build warning is Vite's CJS Node API deprecation warning.
- In-app Browser QA on `?debugScene=game&renderer=canvas&zone=aether_plains&hudFrameQa=1&class=ether_knight&qaRun=phase111-final-iab` reports `status: "ready"`, `questMapIcon.renderedImageCount: 1`, `expectedImageCount: 1`, texture key `zone_malatus_sanctuary`, path `assets/generated/ui/worldmap/zone_malatus_sanctuary.png`, natural size `64x64`, no missing quest map icon keys, one visible quest map button for `malatus_sanctuary`, no legacy glyph fallback, no `frostmoss_sap` map button, one visible canvas, and no warn/error console logs.
- In-app Browser page asset inventory reports 248 total resources with 43 images and observes `HudOverlay.ts`, `questRowView.ts`, `spriteResourceManifest.ts`, `zone_malatus_sanctuary.png`, `UI-HUD-008-DEF.png`, `UI-BTN-006-DEF.png`, and `char_battle_ether_knight.png`.

## Phase 112: ZoneTeleport Portal Title Icon Runtime Wiring

Runtime ZoneTeleport portal title icon coverage:

- Portal title icon: `skill_vw_warp.png` / texture key `skill_vw_warp_icon`.

Production rule:

- `preloadZoneTeleportUiFrameTextures()` queues the portal title skill icon in addition to the existing portal panel/button frames.
- `ZoneTeleportManager` renders `zone_teleport_title_icon` beside the portal name at `18x18` with nearest filtering.
- If the icon texture is missing, only then does `zone_teleport_title_icon_fallback` render the previous `🌀` glyph.
- Portal name text, target zone label, move/cancel hit areas, hover colors, and teleport callback behavior remain in the existing dynamic Phaser UI logic.
- `zoneTeleportFrameQa=1` writes `aeternaZoneTeleportFrameQa.titleIcon` and `missingTitleIconKeys`.

Exit criteria:

- Unit tests verify title icon preload, render object name, display size, nearest filtering, fallback object name, removal of the inline title glyph string, and QA payload fields.
- Sprite resource manifest and runtime image reference tests keep the reused Aseprite skill icon coverage intact.
- Browser QA confirms `titleIcon.rendered: true`, `fallbackRendered: false`, no missing title icon keys, and no warn/error console logs.

Current QA state:

- Phase 112 implementation started on 2026-06-13.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts` failed one new assertion before implementation because `ZoneTeleportManager.ts` did not import `getSpriteResourceForSkillIcon()` or define the title icon contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts` passes with 30 tests after implementation.
- `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts` passes with 70 tests.
- `npm --prefix client run typecheck` passes after the ZoneTeleport title icon wiring.
- In-app Browser QA on `?debugScene=game&renderer=canvas&zone=aether_plains&zoneTeleportFrameQa=1&qaRun=phase112-final-iab` reports `status: "ready"`, `portalId: "qa_portal_memory_forest"`, `portalName: "기억의 숲 관문"`, `targetZoneId: "memory_forest"`, `panelFrame.renderedCount: 1`, `buttonFrame.renderedCount: 2`, `titleIcon.rendered: true`, texture key `skill_vw_warp_icon`, path `assets/generated/ui/icons/skills/skill_vw_warp.png`, display size `18x18`, `fallbackRendered: false`, `missingTitleIconKeys: []`, `missingFrameKeys: []`, one visible canvas, and no warn/error console logs.

## Phase 113: Dungeon Action Button Icon Runtime Wiring

Runtime Dungeon action button icon coverage:

- Battle action icon: `skill_ek_slash.png` / texture key `skill_ek_slash_icon`.

Production rule:

- `DungeonScene.preload()` queues `DUNGEON_ACTION_BUTTON_ICON_ID` in addition to the existing dungeon status/action/reward UI frames.
- Ready-mode battle button renders `dungeon_action_button_icon` at `22x22` with nearest filtering and changes the visible button text to `Battle!`.
- If the icon texture is missing, the button keeps the previous `⚔ Battle!` label fallback.
- Button frame, hover tint, click/keyboard launch behavior, enemy previews, reward panel, and clear-mode QA remain in the existing dynamic Phaser UI logic.
- `dungeonFrameQa=ready` writes `aeternaDungeonFrameQa.actionButtonIcon` and `missingActionButtonIconKeys`.

Exit criteria:

- Unit tests verify the action icon id, preload path, render object name, display size, nearest filtering, fallback label, and QA payload fields.
- Sprite resource manifest and runtime image reference tests keep the reused Aseprite skill icon coverage intact.
- Browser QA confirms `actionButtonIcon.rendered: true`, texture key `skill_ek_slash_icon`, display size `22x22`, `fallbackRendered: false`, and no missing action icon keys.

Current QA state:

- Phase 113 implementation started on 2026-06-13.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts` failed one new assertion before implementation because `DungeonScene.ts` did not import `getSpriteResourceForSkillIcon()` or define the action button icon contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts` passes with 30 tests after implementation.
- `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts` passes with 70 tests.
- `npm --prefix client run typecheck` passes after the Dungeon action button icon wiring.
- `npm run build:client` passes after the Dungeon action button icon wiring; the only noted build warning is Vite's CJS Node API deprecation warning.
- In-app Browser QA on `?debugScene=dungeon&renderer=canvas&dungeonFrameQa=ready&class=ether_knight&qaRun=phase113-final-iab` reports `status: "ready"`, `mode: "ready"`, `actionButtonIcon.rendered: true`, texture key `skill_ek_slash_icon`, path `assets/generated/ui/icons/skills/skill_ek_slash.png`, display size `22x22`, `fallbackRendered: false`, `missingActionButtonIconKeys: []`, `missingFrameKeys: []`, one visible canvas, and no warn/error console logs.

## Phase 114: Cutscene Action Button Icon Runtime Wiring

Runtime Cutscene action button icon coverage:

- Skip action icon: `skill_tg_haste.png` / texture key `skill_tg_haste_icon`.
- Next action icon: `skill_mw_arrow.png` / texture key `skill_mw_arrow_icon`.

Production rule:

- `CutsceneScene.preload()` queues `CUTSCENE_ACTION_BUTTON_ICON_IDS` in addition to the existing dialogue box/action button frames.
- `_addCutsceneActionButton()` renders each loaded icon as `<buttonName>_icon` at `16x16` with nearest filtering on top of the existing Aseprite action button frame.
- When icons are present, skip/next labels use text-only `스킵` and `다음`; progress updates use `다음 (<index>/<total>)` without the legacy `▶` glyph.
- If an icon texture is missing, the button keeps the previous `[ 스킵 ]` or `다음 ▶` label fallback and records the fallback action id.
- Dialogue box frame, action button frame, title/body text, progress updates, click handlers, keyboard input, and return-scene behavior remain in the existing dynamic Phaser UI logic.
- `cutsceneFrameQa=1` writes `aeternaCutsceneFrameQa.actionButtonIcon` and `missingActionButtonIconKeys`.

Exit criteria:

- Unit tests verify the action icon ids, preload path, render object name, display size, nearest filtering, fallback labels, and QA payload fields.
- Sprite resource manifest and runtime image reference tests keep the reused Aseprite skill icon coverage intact.
- Browser QA confirms `actionButtonIcon.renderedCount: 2`, texture keys `skill_tg_haste_icon` and `skill_mw_arrow_icon`, display size `16x16`, no fallback action ids, and no missing icon keys.

Current QA state:

- Phase 114 implementation started on 2026-06-13.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts` failed one new assertion before implementation because `CutsceneScene.ts` did not import `getSpriteResourceForSkillIcon()` or define the action button icon contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts` passes with 30 tests after implementation.
- `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts` passes with 70 tests.
- `npm --prefix client run typecheck` passes after the Cutscene action button icon wiring.
- `npm run build:client` passes after the Cutscene action button icon wiring; the only noted build warning is Vite's CJS Node API deprecation warning.
- In-app Browser QA on `?debugScene=cutscene&renderer=canvas&cutsceneFrameQa=1&qaRun=phase114-final-iab` reports `status: "ready"`, `cutsceneId: "debug-cutscene-frame"`, `actionButtonFrame.renderedCount: 2`, `actionButtonIcon.renderedCount: 2`, texture keys `skill_tg_haste_icon` and `skill_mw_arrow_icon`, display size `16x16`, `fallbackActionIds: []`, `missingActionButtonIconKeys: []`, `missingFrameKeys: []`, one visible canvas, and no warn/error console logs.

## Phase 115: MainMenu Button Icon Runtime Wiring

Runtime MainMenu button icon coverage:

- Start icon: `skill_mw_arrow.png` / texture key `skill_mw_arrow_icon`.
- Settings icon: `skill_tg_reverse.png` / texture key `skill_tg_reverse_icon`.
- Credits icon: `ITM-QST-004.png` / texture key `icon_item_ITM-QST_004`.

Production rule:

- `MainMenuScene.preload()` queues the three button icon resources in addition to the existing title background, particle, and UI frame textures.
- The title menu renders each loaded icon as `main_menu_button_icon_<index>` at `20x20` with nearest filtering on top of the existing `UI-BTN-006-DEF` button frame.
- When all icons are present, menu labels are text-only `게임 시작`, `설정`, and `크레딧`; if an icon texture is missing, the button keeps the previous keyboard focus prefix fallback.
- Icon pointer interaction uses the same focus and action callback path as the text and frame hit areas.
- `mainMenuFrameQa=1` writes `aeternaMainMenuFrameQa.menuButtonIcon` and `missingMenuButtonIconKeys`.

Exit criteria:

- Unit tests verify the icon resource imports, icon spec list, preload path, render object name, display size, nearest filtering, fallback tracking, and QA payload fields.
- Sprite resource manifest and runtime image reference tests keep the reused skill/item icon coverage intact.
- Browser QA confirms three rendered button icons, no fallback indexes, no missing icon keys, and no warn/error console logs.

Current QA state:

- Phase 115 implementation started on 2026-06-13.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\mainMenuAsepriteAssets.test.ts` failed before implementation because `MainMenuScene.ts` did not import `getSpriteResourceForItemIcon()` / `getSpriteResourceForSkillIcon()` or define the button icon contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\mainMenuAsepriteAssets.test.ts` passes with 1 test after implementation.
- `npx vitest run --config tests\vitest.config.ts tests\unit\mainMenuAsepriteAssets.test.ts tests\unit\uiFrameAssets.test.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts` passes with 71 tests.
- `npm --prefix client run typecheck` passes after the MainMenu button icon wiring.
- `npm run build:client` passes after the MainMenu button icon wiring; the only noted build warning is Vite's CJS Node API deprecation warning.
- In-app Browser QA on `?debugScene=mainMenu&renderer=canvas&mainMenuFrameQa=1&qaRun=phase115-final-iab` reports `status: "ready"`, `menuButtonFrame.renderedCount: 3`, `menuButtonIcon.renderedCount: 3`, texture keys `skill_mw_arrow_icon`, `skill_tg_reverse_icon`, and `icon_item_ITM-QST_004`, display size `20x20`, `fallbackIndexes: []`, `missingMenuButtonIconKeys: []`, `missingFrameKeys: []`, one visible canvas, and no warn/error console logs.
- In-app Browser click QA on the start icon opens the login modal, keeps `qaStatus: "ready"`, reports modal action frame count `3`, modal input frame count `2`, hides menu icons while the modal is active, and emits no warn/error console logs.

## Phase 116: TutorialFlow Skip Button Icon Runtime Wiring

Runtime TutorialFlow skip button icon coverage:

- Skip action icon: `skill_tg_haste.png` / texture key `skill_tg_haste_icon`.

Production rule:

- `preloadTutorialFlowUiFrameTextures()` queues the skip button skill icon in addition to the existing tutorial panel and skip button frame textures.
- `TutorialFlowManager.showStep()` renders `tutorial_flow_skip_button_icon` at `16x16` with nearest filtering on top of the existing `UI-BTN-006-DEF` skip button frame.
- When the icon is present, the skip label is text-only `스킵 ESC`; if the icon texture is missing, the button keeps the previous `[스킵] ESC` label fallback.
- Icon pointer interaction uses the same hover and skip callback path as the button frame and text.
- `tutorialFlowFrameQa=1` writes `aeternaTutorialFlowFrameQa.skipButtonIcon` and `missingSkipButtonIconKeys`.

Exit criteria:

- Unit tests verify the icon resource import, icon id, preload path, render object name, display size, nearest filtering, fallback label, and QA payload fields.
- Sprite resource manifest and runtime image reference tests keep the reused Time Guardian skill icon coverage intact.
- Browser QA confirms the skip button icon renders, the fallback path is not used, the icon click triggers skip, and no warn/error console logs appear.

Current QA state:

- Phase 116 implementation started on 2026-06-13.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts` failed before implementation because `TutorialFlowManager.ts` did not import `getSpriteResourceForSkillIcon()` or define the skip icon contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts` passes with 30 tests after implementation.
- `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts` passes with 70 tests.
- `npm --prefix client run typecheck` passes after the TutorialFlow skip button icon wiring.
- `npm run build:client` passes after the TutorialFlow skip button icon wiring; the only noted build warning is Vite's CJS Node API deprecation warning.
- In-app Browser QA on `?debugScene=tutorialFlow&renderer=canvas&tutorialFlowFrameQa=1&qaRun=phase116-final-iab` reports `status: "ready"`, `currentStepId: "welcome"`, `renderedFrameCount: 2`, `skipButtonFrame.renderedCount: 1`, `skipButtonIcon.renderedCount: 1`, texture key `skill_tg_haste_icon`, display size `16x16`, `fallbackRendered: false`, `missingSkipButtonIconKeys: []`, `missingFrameKeys: []`, one visible canvas, and no warn/error console logs.
- In-app Browser click QA on the skip icon transitions the tutorial flow to `status: "hidden"`, `active: false`, preserves empty `missingSkipButtonIconKeys`, and emits no warn/error console logs.

## Phase 117: Coachmark Action Button Icon Runtime Wiring

Runtime Coachmark action button icon coverage:

- Skip action icon: `skill_tg_haste.png` / texture key `skill_tg_haste_icon`.
- Next action icon: `skill_mw_arrow.png` / texture key `skill_mw_arrow_icon`.

Production rule:

- `preloadCoachmarkUiFrameTextures()` queues both action button skill icons in addition to the existing coachmark panel and action button frame textures.
- `CoachmarkOverlay.addActionButton()` renders each loaded icon as `coachmark_action_button_icon_<id>` at `16x16` with nearest filtering on top of the existing `UI-BTN-006-DEF` action button frame.
- When the icon is present, action labels are text-only `스킵` and `다음`; if an icon texture is missing, the button keeps the text-only fallback and records the missing action id.
- Icon pointer interaction uses the same hit area, hover state, skip callback, and advance callback as the button frame and text.
- `coachmarkFrameQa=1` writes `aeternaCoachmarkFrameQa.actionButtonIcon` and `missingActionButtonIconKeys`.

Exit criteria:

- Unit tests verify the action icon resource import, icon id map, preload path, render object name, display size, nearest filtering, fallback tracking, and QA payload fields.
- Sprite resource manifest and runtime image reference tests keep the reused Time Guardian and Memory Weaver skill icon coverage intact.
- Browser QA confirms both action button icons render, the fallback path is not used, clicking the next icon hit area hides the coachmark, and no warn/error console logs appear.

Current QA state:

- Phase 117 implementation started on 2026-06-13.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts` failed before implementation because `CoachmarkOverlay.ts` did not import `getSpriteResourceForSkillIcon()` or define the action button icon contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts` passes with 30 tests after implementation.
- `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts` passes with 70 tests.
- `npm --prefix client run typecheck` passes after the Coachmark action button icon wiring.
- `npm run build:client` passes after the Coachmark action button icon wiring; the only noted build warning is Vite's CJS Node API deprecation warning.
- In-app Browser QA on `?debugScene=coachmark&renderer=canvas&coachmarkFrameQa=1&qaRun=phase117-final-iab` reports `status: "ready"`, `currentId: "coachmark.frame.qa"`, `actionButtonFrame.renderedCount: 2`, `actionButtonIcon.renderedCount: 2`, display size `16x16`, `fallbackIds: []`, `missingActionButtonIconKeys: []`, `missingFrameKeys: []`, one visible canvas, and no warn/error console logs.
- In-app Browser click QA on the next icon hit area transitions the coachmark to `status: "hidden"`, `active: false`, clears panel/action button rendered counts to `0`, preserves empty `missingActionButtonIconKeys`, and emits no warn/error console logs.

## Phase 118: Ending Prompt Icon Runtime Wiring

Runtime Ending prompt icon coverage:

- Prompt track icon: `skill_mw_arrow.png` / texture key `skill_mw_arrow_icon`.

Production rule:

- `EndingScene.preload()` queues the prompt skill icon in addition to the existing ending story panel and prompt track frame textures.
- `EndingScene.create()` renders `ending_prompt_icon` at `16x16` with nearest filtering on top of the existing `UI-BTN-006-DEF` prompt track frame.
- When the icon is present, the prompt copy remains text-only; if the icon texture is missing, the prompt track keeps a small `>` text fallback and records the missing icon key.
- The prompt icon uses the same delayed alpha pulse as the prompt text, while keyboard/pointer title return input stays on the existing `EndingScene` delayed input binding.
- `endingFrameQa=1` writes `aeternaEndingFrameQa.promptIcon` and `missingPromptIconKeys`.

Exit criteria:

- Unit tests verify the icon resource import, icon id, preload path, render object name, display size, nearest filtering, fallback tracking, and QA payload fields.
- Sprite resource manifest and runtime image reference tests keep the reused Memory Weaver skill icon coverage intact.
- Browser QA confirms the prompt icon renders, the fallback path is not used, no prompt icon key is missing, and no warn/error console logs appear.

Current QA state:

- Phase 118 implementation started on 2026-06-13.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts` failed before implementation because `EndingScene.ts` did not import `getSpriteResourceForSkillIcon()` or define the prompt icon contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts` passes with 30 tests after implementation.
- `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts` passes with 70 tests.
- `npm --prefix client run typecheck` passes after the Ending prompt icon wiring.
- `npm run build:client` passes after the Ending prompt icon wiring; the only noted build warning is Vite's CJS Node API deprecation warning.
- In-app Browser QA on `?debugScene=ending&renderer=canvas&endingFrameQa=1&endingType=TRUE_GUARDIAN&qaRun=phase118-final-iab` reports `status: "ready"`, `endingType: "TRUE_GUARDIAN"`, `storyPanelFrame.renderedCount: 1`, `promptTrackFrame.renderedCount: 1`, `promptIcon.renderedCount: 1`, texture key `skill_mw_arrow_icon`, display size `16x16`, `fallbackRendered: false`, `missingPromptIconKeys: []`, `missingFrameKeys: []`, one visible canvas, and no warn/error console logs.

## Phase 119: HUD Quest Action Hint Icon Runtime Wiring

Runtime HUD quest action hint icon coverage:

- Quest action hint icon: `skill_mw_arrow.png` / texture key `skill_mw_arrow_icon`.

Production rule:

- `questRowView.buildQuestRowHtml()` renders each incomplete quest `actionHint` as `img.hud-quest-action-icon` plus `span.hud-quest-action-text` instead of the previous raw `▶` text marker.
- The icon uses `getSpriteResourceForSkillIcon('skill_mw_arrow')` and the published runtime path `assets/generated/ui/icons/skills/skill_mw_arrow.png`.
- If the skill icon resource is missing, the row falls back to a small `>` marker while preserving the escaped action hint text.
- `HudOverlay` styles the action hint row as a fixed `14x14` pixel icon plus text, so image load state cannot resize the quest tracker layout.
- `hudFrameQa=1` writes `aeternaHudFrameQa.questActionIcon` and `missingQuestActionIconKeys`.

Exit criteria:

- Unit tests verify the action hint icon DOM contract, manifest key/path, text wrapper, and legacy `▶` removal.
- HUD frame asset tests verify the new QA payload fields and fixed icon CSS.
- Sprite resource manifest and runtime image reference tests keep the reused Memory Weaver skill icon coverage intact.
- Browser QA confirms all default incomplete quest action hints render the Aseprite icon, no legacy glyph is present, and no warn/error console logs appear.

Current QA state:

- Phase 119 implementation started on 2026-06-13.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\questRowView.test.ts tests\unit\uiFrameAssets.test.ts` failed before implementation because `questRowView.ts` still rendered the raw `▶` marker and `HudOverlay.ts` had no `questActionIcon` QA contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\questRowView.test.ts tests\unit\uiFrameAssets.test.ts` passes with 38 tests after implementation.
- `npx vitest run --config tests\vitest.config.ts tests\unit\questRowView.test.ts tests\unit\uiFrameAssets.test.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts` passes with 78 tests.
- `npm --prefix client run typecheck` passes after the HUD quest action hint icon wiring.
- `npm run build:client` passes after the HUD quest action hint icon wiring; the only noted build warning is Vite's CJS Node API deprecation warning.
- In-app Browser QA on `?debugScene=game&renderer=canvas&zone=aether_plains&hudFrameQa=1&class=ether_knight&qaRun=phase119-final-iab` reports `status: "ready"`, `questActionIcon.renderedImageCount: 2`, `questActionIcon.expectedImageCount: 2`, texture key `skill_mw_arrow_icon`, natural size `64x64`, `missingQuestActionIconKeys: []`, `legacyGlyphPresent: false`, `questMapIcon.renderedImageCount: 1`, `quickSlotIcon.renderedImageCount: 12`, and no warn/error console logs.

## Phase 120: FeedbackForm Title Icon Runtime Wiring

Runtime FeedbackForm title icon coverage:

- Feedback form title icon: `skill_mw_arrow.png` / texture key `skill_mw_arrow_icon`.

Production rule:

- `FeedbackForm.preload()` queues the title skill icon in addition to the existing panel/button UI frames and five type status icons.
- `FeedbackForm.create()` renders `feedback_form_title_icon` at `22x22` with nearest filtering next to the title copy.
- The visible title text is now `피드백 보내기`; the previous `📝` title prefix only remains as a missing-texture safety fallback represented by a small `>` marker.
- Submit, close, type selection, keyboard focus, and HTML input/textarea behavior remain in the existing `FeedbackForm` logic.
- `?debugScene=feedback&renderer=canvas` writes `aeternaFeedbackFrameQa.titleIcon` and `missingTitleIconKeys`.

Exit criteria:

- Unit tests verify the title icon import, resource id, preload path, render object name, display size, fallback tracking, and QA payload fields.
- Sprite resource manifest and runtime image reference tests keep the reused Memory Weaver skill icon coverage intact.
- Browser QA confirms the title icon renders, title fallback is not used, type icons still render, and no warn/error console logs appear.

Current QA state:

- Phase 120 implementation started on 2026-06-13.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts` failed before implementation because `FeedbackForm.ts` did not import `getSpriteResourceForSkillIcon()` or define the title icon contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts` passes with 30 tests after implementation.
- `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts` passes with 70 tests.
- `npm --prefix client run typecheck` passes after the FeedbackForm title icon wiring.
- `npm run build:client` passes after the FeedbackForm title icon wiring; the only noted build warning is Vite's CJS Node API deprecation warning.
- In-app Browser QA on `?debugScene=feedback&renderer=canvas&qaRun=phase120-final-iab` reports `status: "ready"`, `titleIcon.renderedCount: 1`, `titleIcon.renderedKey: "skill_mw_arrow_icon"`, display size `22x22`, `fallbackTitleIconRendered: false`, `missingTitleIconKeys: []`, `typeIcon.renderedCount: 5`, `missingTypeIconKeys: []`, one visible canvas, two visible input controls, and no warn/error console logs.

## Phase 121: FeedbackForm Submit Icon Runtime Wiring

Runtime FeedbackForm submit icon coverage:

- Feedback form submit button icon: `skill_mw_arrow.png` / texture key `skill_mw_arrow_icon`.

Production rule:

- `FeedbackForm.preload()` queues the submit skill icon in addition to the existing panel/button UI frames, title icon, and five type status icons.
- `FeedbackForm.create()` renders `feedback_form_submit_icon` at `20x20` with nearest filtering inside the submit button.
- The visible submit text is now `제출`; the previous `✅ 제출` label and focused `▶ ✅ 제출` label are removed from the normal render path.
- If the submit icon texture is missing, `feedback_form_submit_icon_fallback` renders a small `>` marker while the submit label remains text-only.
- Submit click, keyboard activation, close, type selection, and HTML input/textarea behavior remain in the existing `FeedbackForm` logic.
- `?debugScene=feedback&renderer=canvas` writes `aeternaFeedbackFrameQa.submitIcon` and `missingSubmitIconKeys`.

Exit criteria:

- Unit tests verify the submit icon resource id, preload path, render object name, display size, fallback tracking, QA payload fields, and legacy `✅`/`▶ ✅` submit labels removal.
- Sprite resource manifest and runtime image reference tests keep the reused Memory Weaver skill icon coverage intact.
- Browser QA confirms the submit icon renders, submit fallback is not used, title/type icons still render, and no warn/error console logs appear.

Current QA state:

- Phase 121 implementation started on 2026-06-13.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts` failed before implementation because `FeedbackForm.ts` did not define `FEEDBACK_FORM_SUBMIT_ICON_ID` or the submit icon contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts` passes with 30 tests after implementation.
- `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts` passes with 70 tests.
- `npm --prefix client run typecheck` passes after the FeedbackForm submit icon wiring.
- `npm run build:client` passes after the FeedbackForm submit icon wiring; the only noted build warning is Vite's CJS Node API deprecation warning.
- In-app Browser QA on `?debugScene=feedback&renderer=canvas&qaRun=phase121-final-iab` reports `status: "ready"`, `submitIcon.renderedCount: 1`, `submitIcon.renderedKey: "skill_mw_arrow_icon"`, display size `20x20`, `fallbackSubmitIconRendered: false`, `missingSubmitIconKeys: []`, `titleIcon.renderedCount: 1`, `typeIcon.renderedCount: 5`, one visible canvas, two visible input controls, and no warn/error console logs.

## Phase 122: FeedbackForm Close Icon Runtime Wiring

Runtime FeedbackForm close icon coverage:

- Feedback form close button icon: `skill_tg_reverse.png` / texture key `skill_tg_reverse_icon`.

Production rule:

- `FeedbackForm.preload()` queues the close skill icon in addition to the existing panel/button UI frames, title icon, submit icon, and five type status icons.
- `FeedbackForm.create()` renders `feedback_form_close_icon` at `18x18` with nearest filtering inside the top-right close button.
- The previous visible `✕` close glyph is removed from the normal render path.
- If the close icon texture is missing, `feedback_form_close_icon_fallback` renders a small ASCII `x` marker.
- Close click, keyboard activation, submit, type selection, and HTML input/textarea behavior remain in the existing `FeedbackForm` logic.
- `?debugScene=feedback&renderer=canvas` writes `aeternaFeedbackFrameQa.closeIcon` and `missingCloseIconKeys`.

Exit criteria:

- Unit tests verify the close icon resource id, preload path, render object name, display size, fallback tracking, QA payload fields, and legacy `✕` close glyph removal.
- Sprite resource manifest and runtime image reference tests keep the reused Time Guardian reverse skill icon coverage intact.
- Browser QA confirms the close icon renders, close fallback is not used, title/submit/type icons still render, and no warn/error console logs appear.

Current QA state:

- Phase 122 implementation started on 2026-06-13.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts` failed before implementation because `FeedbackForm.ts` did not define `FEEDBACK_FORM_CLOSE_ICON_ID` or the close icon contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts` passes with 30 tests after implementation.
- `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts` passes with 70 tests.
- `npm --prefix client run typecheck` passes after the FeedbackForm close icon wiring.
- `npm run build:client` passes after the FeedbackForm close icon wiring; the only noted build warning is Vite's CJS Node API deprecation warning.
- In-app Browser QA on `?debugScene=feedback&renderer=canvas&qaRun=phase122-final-iab` reports `status: "ready"`, `closeIcon.renderedCount: 1`, `closeIcon.renderedKey: "skill_tg_reverse_icon"`, display size `18x18`, `fallbackCloseIconRendered: false`, `missingCloseIconKeys: []`, `titleIcon.renderedCount: 1`, `submitIcon.renderedCount: 1`, `typeIcon.renderedCount: 5`, one visible canvas, two visible input controls, and no warn/error console logs.

## Phase 123: SkillTree Close Action Icon Runtime Wiring

Runtime SkillTree close action icon coverage:

- Skill tree main/detail close button icon: `skill_tg_reverse.png` / texture key `skill_tg_reverse_icon`.

Production rule:

- `preloadSkillTreeUiFrameTextures()` keeps the existing reset action icon preload and also declares the close action icon preload path. Because reset and close currently share `skill_tg_reverse_icon`, duplicate queueing is skipped when the keys match.
- `SkillTreeUI` renders `skill_tree_close_action_icon` and `skill_tree_detail_close_action_icon` as `16x16` Aseprite images on top of the existing `UI-BTN-006-DEF` action button frames.
- The previous visible `✕` close glyph is removed from the normal SkillTree render path. Texture-missing fallback uses a small ASCII `x`.
- Detail keyboard focus now targets the close icon image when it exists, preserving a nonzero focus-ring bound.
- `_syncMainRing()` now restores the reset button through `_setResetButtonLabel('ready')`, so the reset button does not reintroduce the old `🔄 스킬 리셋` label when the reset icon is active.
- `skillTreeQa=1` writes `aeternaSkillTreeFrameQa.closeActionIcon` with icon id, texture key/path, expected/rendered count, display sizes, fallback ids, and missing icon keys.

Exit criteria:

- Unit tests verify the close icon resource id, preload path, render helper, main/detail icon names, fallback tracking, QA payload fields, and legacy `✕` close glyph removal.
- Sprite resource manifest and runtime image reference tests keep the reused Time Guardian reverse skill icon coverage intact.
- Browser QA confirms both main and detail close icons render, no close fallback is used, reset/node icons still render, and no warn/error console logs appear.

Current QA state:

- Phase 123 implementation started on 2026-06-13.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts` failed before implementation because `SkillTreeUI.ts` did not define `SKILL_TREE_CLOSE_ACTION_ICON_ID` or the close icon QA contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts` passes with 30 tests after implementation.
- `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts` passes with 70 tests.
- `npm --prefix client run typecheck` passes after the SkillTree close action icon wiring.
- `npm run build:client` passes after the SkillTree close action icon wiring; the only noted build warning is Vite's CJS Node API deprecation warning.
- In-app Browser QA on `?debugScene=lobby&renderer=canvas&skillTreeQa=1&class=ether_knight&level=15&qaRun=phase123-final-iab` reports `status: "ready"`, `closeActionIcon.renderedCount: 2`, `closeActionIcon.expectedCount: 2`, texture key `skill_tg_reverse_icon`, two visible `16x16` close icons, `fallbackCloseActionIconIds: []`, `missingIconKeys: []`, `resetActionIcon.renderedCount: 1`, `skillNodeIcon.renderedCount: 5`, one visible canvas, and no warn/error console logs.

## Phase 124: SkillTree Title Icon Runtime Wiring

Runtime SkillTree title icon coverage:

- Skill tree title icon: current class tier-1 skill icon via `getSkillTreeIconId(classId, 1)`.
- Ether Knight QA route uses `skill_ek_slash.png` / texture key `skill_ek_slash_icon`.

Production rule:

- `SkillTreeUI` now renders the title as text-only class title plus a separate `20x20` Aseprite image `skill_tree_title_icon`.
- The previous visible `🌳` title glyph is removed from the normal SkillTree render path. Texture-missing fallback uses a small `>` marker.
- The title icon is refreshed whenever `classId` changes through `_setSkillTreeTitle()`, so class-specific title art tracks the current skill tree.
- `skillTreeQa=1` writes `aeternaSkillTreeFrameQa.titleIcon` with icon id, texture key/path, expected/rendered count, display size, fallback state, and missing icon keys.

Exit criteria:

- Unit tests verify the title icon tier, class icon resolution, render object name, display size, fallback tracking, QA payload fields, and legacy `🌳` title glyph removal.
- Sprite resource manifest and runtime image reference tests keep the class skill icon coverage intact.
- Browser QA confirms the title icon renders for Ether Knight, no title fallback is used, close/reset/node icons still render, and no warn/error console logs appear.

Current QA state:

- Phase 124 implementation started on 2026-06-13.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts` failed before implementation because `SkillTreeUI.ts` did not define `SKILL_TREE_TITLE_ICON_TIER` or the title icon QA contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts` passes with 30 tests after implementation.
- `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts` passes with 70 tests.
- `npm --prefix client run typecheck` passes after the SkillTree title icon wiring.
- `npm run build:client` passes after the SkillTree title icon wiring; the only noted build warning is Vite's CJS Node API deprecation warning.
- In-app Browser QA on `?debugScene=lobby&renderer=canvas&skillTreeQa=1&class=ether_knight&level=15&qaRun=phase124-final-iab` reports `status: "ready"`, `titleIcon.renderedCount: 1`, `titleIcon.expectedCount: 1`, texture key `skill_ek_slash_icon`, display size `20x20`, `fallbackTitleIconRendered: false`, `missingTitleIconKeys: []`, `closeActionIcon.renderedCount: 2`, `resetActionIcon.renderedCount: 1`, `skillNodeIcon.renderedCount: 5`, one visible canvas, and no warn/error console logs.

## Phase 125: SkillTree Branch Detail Icon Runtime Wiring

Runtime SkillTree branch detail icon coverage:

- Branch detail line icon: `skill_mw_storm.png` / texture key `skill_mw_storm_icon`.
- Locked branch detail line icon: `skill_tg_stop.png` / texture key `skill_tg_stop_icon`.

Production rule:

- `preloadSkillTreeUiFrameTextures()` queues the two detail line skill icons in addition to the existing panel/action/title/reset/close icon resources.
- `SkillTreeUI` renders branch and locked branch detail lines with `14x14` Aseprite images named `skill_tree_branch_detail_icon` and `skill_tree_locked_detail_icon`.
- The previous visible `⚔` branch glyph and `✗` locked glyph are removed from the normal SkillTree detail render path. Texture-missing fallback uses small ASCII markers.
- `skillTreeQa=1` now uses deterministic Ether Knight branch skills (`ek_ether_explode_sword` with unlocked sibling `ek_combo_strike`) so Browser QA opens a detail panel that exercises both branch and locked detail lines.
- `skillTreeQa=1` writes `aeternaSkillTreeFrameQa.detailLineIcon` with expected/rendered count, expected/rendered texture keys, display sizes, fallback ids, and missing icon keys.

Exit criteria:

- Unit tests verify the branch/locked icon ids, preload path, deterministic branch QA data, render helper, icon object names, fallback tracking, QA payload fields, and legacy glyph removal.
- Sprite resource manifest and runtime image reference tests keep the reused Memory Weaver storm and Time Guardian stop skill icon coverage intact.
- Browser QA confirms both detail line icons render with no fallback or missing keys, while title/reset/close/node icons still render.

Current QA state:

- Phase 125 implementation started on 2026-06-13.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts` failed before implementation because `SkillTreeUI.ts` did not define `SKILL_TREE_BRANCH_DETAIL_ICON_ID` or the detail line icon QA contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts` passes with 30 tests after implementation.
- `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts` passes with 70 tests.
- `npm --prefix client run typecheck` passes after the SkillTree branch detail icon wiring.
- `npm run build:client` passes after the SkillTree branch detail icon wiring; the only noted build warning is Vite's CJS Node API deprecation warning.
- In-app Browser QA on `?debugScene=lobby&renderer=canvas&skillTreeQa=1&class=ether_knight&level=15&qaRun=phase125-final-iab` reports `status: "ready"`, `detailLineIcon.renderedCount: 2`, `detailLineIcon.expectedCount: 2`, rendered keys `skill_mw_storm_icon` and `skill_tg_stop_icon`, two visible `14x14` detail line icons, `fallbackDetailLineIconIds: []`, `missingDetailLineIconKeys: []`, `titleIcon.renderedCount: 1`, `closeActionIcon.renderedCount: 2`, `resetActionIcon.renderedCount: 1`, `skillNodeIcon.renderedCount: 5`, one visible canvas, and no warn/error console logs.

## Phase 126: MainMenu Modal Close Icon Runtime Wiring

Runtime MainMenu modal close icon coverage:

- Login modal close icon: `skill_tg_reverse.png` / texture key `skill_tg_reverse_icon`.
- Credits overlay close icon: `skill_tg_reverse.png` / texture key `skill_tg_reverse_icon`.

Production rule:

- `MainMenuScene.preload()` declares the modal close icon through `getSpriteResourceForSkillIcon('skill_tg_reverse')`, while skipping duplicate loader queueing when the title menu Settings icon already queues the same texture key.
- `_showLoginUI()` and `_showCreditsOverlay()` render close actions with a shared `_addMainMenuModalCloseIcon()` helper and `16x16` Aseprite images named `main_menu_login_close_icon` and `main_menu_credits_close_icon`.
- The previous visible login close `✕` glyph is removed from the normal render path. Texture-missing fallback uses a small ASCII `x` marker.
- `mainMenuFrameQa=1` writes `aeternaMainMenuFrameQa.modalCloseIcon` with icon id, texture key/path, expected/rendered count, display sizes, fallback ids, and missing icon keys.

Exit criteria:

- Unit tests verify the modal close icon resource id, preload path, render helper, login/credits icon names, fallback tracking, QA payload fields, and legacy `✕` close glyph removal.
- Sprite resource manifest and runtime image reference tests keep the reused Time Guardian reverse skill icon coverage intact.
- Browser QA confirms the login modal close icon renders, no modal close fallback is used, modal button/input frames still render, and no warn/error console logs appear.

Current QA state:

- Phase 126 implementation started on 2026-06-13.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\mainMenuAsepriteAssets.test.ts` failed before implementation because `MainMenuScene.ts` did not define `MAIN_MENU_MODAL_CLOSE_ICON_ID` or the modal close icon QA contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\mainMenuAsepriteAssets.test.ts` passes with 1 test after implementation.
- `npx vitest run --config tests\vitest.config.ts tests\unit\mainMenuAsepriteAssets.test.ts tests\unit\uiFrameAssets.test.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts` passes with 71 tests.
- `npm --prefix client run typecheck` passes after the MainMenu modal close icon wiring.
- `npm run build:client` passes after the MainMenu modal close icon wiring; the only noted build warning is Vite's CJS Node API deprecation warning.
- In-app Browser QA on `?debugScene=mainMenu&renderer=canvas&mainMenuFrameQa=1&qaRun=phase126-final-iab` reports `status: "ready"`, `activeModal: "login"`, `modalCloseIcon.renderedCount: 1`, `modalCloseIcon.expectedCount: 1`, texture key `skill_tg_reverse_icon`, display size `16x16`, `fallbackModalCloseIconIds: []`, `missingIconKeys: []`, `modalButtonFrame.renderedCount: 3`, `modalInputFrame.renderedCount: 2`, one visible canvas, and no warn/error console logs.

## Phase 127: Dungeon Title Icon Runtime Wiring

Runtime Dungeon title icon coverage:

- Dungeon title icon: `skill_ek_slash.png` / texture key `skill_ek_slash_icon`.

Production rule:

- `DungeonScene.preload()` declares `DUNGEON_TITLE_ICON_ID` through `getSpriteResourceForSkillIcon('skill_ek_slash')`, while skipping duplicate loader queueing when the battle action button already queues the same texture key.
- `DungeonScene.create()` renders `dungeon_title_icon` at `20x20` with nearest filtering beside the dungeon name.
- The previous visible `⚔` dungeon title prefix is removed from the normal render path. Texture-missing fallback keeps `⚔ ${this.config.dungeonName}` for safety.
- `dungeonFrameQa=ready|clear` writes `aeternaDungeonFrameQa.titleIcon` and `missingTitleIconKeys` in addition to the existing frame/action button icon payload.

Exit criteria:

- Unit tests verify the title icon resource id, preload path, render object name, display size, nearest filtering, fallback label, QA payload fields, and legacy inline `⚔` title render removal.
- Sprite resource manifest and runtime image reference tests keep the reused Ether Knight slash skill icon coverage intact.
- Browser QA confirms the dungeon title icon renders with no title fallback or missing icon key while the existing action button icon still renders.

Current QA state:

- Phase 127 implementation started on 2026-06-13.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts` failed before implementation because `DungeonScene.ts` did not define `DUNGEON_TITLE_ICON_ID` or the title icon QA contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts` passes with 30 tests after implementation.
- `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts` passes with 70 tests.
- `npm --prefix client run typecheck` passes after the Dungeon title icon wiring.
- `npm run build:client` passes after the Dungeon title icon wiring; the only noted build warning is Vite's CJS Node API deprecation warning.
- In-app Browser QA on `?debugScene=dungeon&renderer=canvas&dungeonFrameQa=ready&class=ether_knight&qaRun=phase127-final-iab` reports `status: "ready"`, `mode: "ready"`, `titleIcon.rendered: true`, texture key `skill_ek_slash_icon`, display size `20x20`, `fallbackRendered: false`, `missingTitleIconKeys: []`, `actionButtonIcon.rendered: true`, `actionButtonIcon.displayWidth: 22`, `missingActionButtonIconKeys: []`, `missingFrameKeys: []`, one visible canvas, and no warn/error console logs.

## Phase 128: Battle Field Ambient Line Icon Runtime Wiring

Runtime BattleScene field ambient line icon coverage:

- Ambient shield icon: `status_shield.png` / texture key `status_shield_icon`.
- Boss-slot icon: `skill_ek_slash.png` / texture key `skill_ek_slash_icon`.

Production rule:

- `BattleScene.preload()` declares `BATTLE_FIELD_AMBIENT_ICON_ID` through `getStatusIconResource('shield')` and `BATTLE_FIELD_BOSS_ICON_ID` through `getSpriteResourceForSkillIcon('skill_ek_slash')`.
- When a field encounter exists, `BattleScene.create()` renders `battle_field_ambient_ambient_icon` and optional `battle_field_ambient_boss_icon` as separate `18x18` Aseprite images with nearest filtering.
- The normal ambient text now contains only the encounter copy. The previous visible `🛡` prefix and `⚔️` boss suffix remain only as missing-texture fallback strings.
- `battleAmbientLineQa=1` writes `aeternaBattleAmbientLineQa` with icon ids, texture key/path, rendered counts, display sizes, fallback flags, missing key lists, and `legacyGlyphPresent`.

Exit criteria:

- Unit tests verify the ambient/boss icon ids, preload paths, render helper, object names, display size, nearest filtering, glyph fallback strings, QA payload fields, and debug route parser.
- Sprite resource manifest and runtime image reference tests keep the reused shield status icon and Ether Knight slash skill icon coverage intact.
- Browser QA confirms both ambient and boss icons render for `aether_plains`, no legacy glyph remains in the visible ambient text, and no warn/error console logs appear.

Current QA state:

- Phase 128 implementation started on 2026-06-13.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts` failed before implementation because `BattleScene.ts` did not define `BATTLE_FIELD_AMBIENT_ICON_ID` or the ambient icon QA contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts` passes with 40 tests after implementation.
- `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\uiFrameAssets.test.ts` passes with 71 tests.
- `npm --prefix client run typecheck` passes after the Battle field ambient line icon wiring.
- `npm run build:client` passes after the Battle field ambient line icon wiring; the only noted build warning is Vite's CJS Node API deprecation warning.
- In-app Browser QA on `?debugScene=battle&renderer=canvas&zone=aether_plains&battleAmbientLineQa=1&class=ether_knight&qaRun=phase128-iab` reports `status: "ready"`, `ambientIcon.renderedCount: 1`, `ambientIcon.key: "status_shield_icon"`, `bossIcon.renderedCount: 1`, `bossIcon.key: "skill_ek_slash_icon"`, both display sizes `18x18`, `legacyGlyphPresent: false`, `missingAmbientIconKeys: []`, `missingBossIconKeys: []`, one visible canvas, and no warn/error console logs.

## Phase 129: GameScene Boss Label Icon Runtime Wiring

Runtime GameScene field boss label icon coverage:

- Field boss label icon: `skill_ek_slash.png` / texture key `skill_ek_slash_icon`.

Production rule:

- `GameScene.preload()` declares `GAME_SCENE_BOSS_LABEL_ICON_ID` through `getSpriteResourceForSkillIcon('skill_ek_slash')`.
- `_spawnMonster(..., isBoss = true)` renders `game_scene_boss_label_icon` as a separate `18x18` Aseprite image with nearest filtering and keeps the visible label text as `BOSS`.
- The previous visible `⚔️ BOSS` string remains only as a missing-texture fallback.
- `bossLabelIconQa=1` spawns one deterministic QA boss in the offline `debugScene=game` route and writes `aeternaGameBossLabelIconQa` with texture key/path, rendered count, display size, fallback flag, missing key list, and `legacyGlyphPresent`.

Exit criteria:

- Unit tests verify the boss label icon id, preload path, debug route parser, deterministic QA boss spawn, render helper, object name, display size, nearest filtering, fallback string, QA payload fields, and legacy inline boss label removal.
- Sprite resource manifest and runtime image reference tests keep the reused Ether Knight slash skill icon coverage intact.
- Browser QA confirms the boss label icon renders in `GameScene`, visible label text is `BOSS`, no legacy glyph remains, and no warn/error console logs appear after the QA reload.

Current QA state:

- Phase 129 implementation started on 2026-06-13.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts` failed before implementation because `GameScene.ts` did not import `getSpriteResourceForSkillIcon()` or define the boss label icon QA contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts` passes with 41 tests after implementation.
- `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\uiFrameAssets.test.ts tests\unit\environmentObjectAssets.test.ts` passes with 75 tests.
- `npm --prefix client run typecheck` passes after the GameScene boss label icon wiring.
- `npm run build:client` passes after the GameScene boss label icon wiring; the only noted build warning is Vite's CJS Node API deprecation warning.
- In-app Browser QA on `?debugScene=game&renderer=canvas&zone=aether_plains&bossLabelIconQa=1&class=ether_knight&qaRun=phase129-iab-recheck` reports `status: "ready"`, `bossLabelIcon.renderedCount: 1`, texture key `skill_ek_slash_icon`, display size `18x18`, `bossLabelText: "BOSS"`, `fallbackRendered: false`, `legacyGlyphPresent: false`, `missingBossLabelIconKeys: []`, one visible canvas, and no warn/error console logs after the QA reload.

## Phase 130: BattleScene Intro Start Icon Runtime Wiring

Runtime BattleScene intro start icon coverage:

- Battle start intro icon: `skill_ek_slash.png` / texture key `skill_ek_slash_icon`.

Production rule:

- `BattleScene.preload()` declares `BATTLE_INTRO_ICON_ID` through `getSpriteResourceForSkillIcon('skill_ek_slash')`.
- `_playIntro()` renders `battle_intro_start_icon` as a separate `34x34` Aseprite image with nearest filtering and keeps the visible intro text as `전투 시작!`.
- The previous visible `⚔ 전투 시작!` string remains only as a missing-texture fallback.
- `battleIntroIconQa=1` writes `aeternaBattleIntroIconQa` with texture key/path, rendered count, display size, fallback flag, missing key list, and `legacyGlyphPresent`.

Exit criteria:

- Unit tests verify the intro icon id, preload path, debug route parser, render object name, display size, nearest filtering, fallback string, QA payload fields, and legacy inline intro label removal.
- Sprite resource manifest and runtime image reference tests keep the reused Ether Knight slash skill icon coverage intact.
- Browser QA confirms the intro icon renders in `BattleScene`, visible intro text is `전투 시작!`, no legacy glyph remains, and no warn/error console logs appear.

Current QA state:

- Phase 130 implementation started on 2026-06-13.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts` failed before implementation because `BattleScene.ts` did not define `BATTLE_INTRO_ICON_ID` or the intro icon QA contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts` passes with 42 tests after implementation.
- `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\uiFrameAssets.test.ts` passes with 73 tests.
- `npm --prefix client run typecheck` passes after the BattleScene intro start icon wiring.
- `npm run build:client` passes after the BattleScene intro start icon wiring; the only noted build warning is Vite's CJS Node API deprecation warning.
- In-app Browser QA on `?debugScene=battle&renderer=canvas&zone=aether_plains&battleIntroIconQa=1&class=ether_knight&qaRun=phase130-iab` reports `status: "ready"`, `introIcon.renderedCount: 1`, texture key `skill_ek_slash_icon`, display size `34x34`, `introText: "전투 시작!"`, `fallbackRendered: false`, `legacyGlyphPresent: false`, `missingIntroIconKeys: []`, one visible canvas, and no warn/error console logs.

## Phase 131: GameScene Zone Label Icon Runtime Wiring

Runtime GameScene top zone label icon coverage:

- Top zone label icon: `zone_aether_plains.png` / texture key `zone_aether_plains`.

Production rule:

- `GameScene.preload()` resolves the current zone through `getSpriteResourceForWorldZoneIcon(this.currentZoneId)` and queues the matching worldmap PNG.
- `GameScene.create()` renders `game_scene_zone_label_icon` as a separate `18x18` Aseprite image with nearest filtering before the zone/era text.
- The normal zone label text now contains only `존명 / 시대명`. The previous visible `📍` prefix remains only as a missing-texture fallback.
- `zoneLabelIconQa=1` writes `aeternaGameZoneLabelIconQa` with zone id, texture key/path, rendered count, display size, fallback flag, missing key list, and `legacyGlyphPresent`.

Exit criteria:

- Unit tests verify the worldmap icon import, preload path, debug route parser, render helper, object name, display size, nearest filtering, QA payload fields, and legacy inline `📍` zone label removal.
- Sprite resource manifest and runtime image reference tests keep the reused worldmap icon coverage intact.
- Browser QA confirms the zone label icon renders in `GameScene`, visible label text has no legacy glyph, and no warn/error console logs appear.

Current QA state:

- Phase 131 implementation started on 2026-06-13.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts` failed before implementation because `GameScene.ts` did not import `getSpriteResourceForWorldZoneIcon()` or define the zone label icon QA contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts` passes with 43 tests after implementation.
- `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\uiFrameAssets.test.ts tests\unit\environmentObjectAssets.test.ts` passes with 77 tests.
- `npm --prefix client run typecheck` passes after the GameScene zone label icon wiring.
- `npm run build:client` passes after the GameScene zone label icon wiring; the only noted build warning is Vite's CJS Node API deprecation warning.
- In-app Browser QA on `?debugScene=game&renderer=canvas&zone=aether_plains&zoneLabelIconQa=1&class=ether_knight&qaRun=phase131-iab` reports `status: "ready"`, `zoneLabelIcon.renderedCount: 1`, texture key `zone_aether_plains`, path `assets/generated/ui/worldmap/zone_aether_plains.png`, display size `18x18`, `zoneLabelText: "에테르 평원  /  현재 대륙"`, `fallbackRendered: false`, `legacyGlyphPresent: false`, `missingZoneLabelIconKeys: []`, one visible canvas, and no warn/error console logs.

## Phase 132: WorldScene Encounter Line Icon Runtime Wiring

Runtime WorldScene selected-zone encounter line icon coverage:

- Encounter ambient icon: `status_shield.png` / texture key `status_shield_icon`.
- Encounter boss icon: `skill_ek_slash.png` / texture key `skill_ek_slash_icon`.

Production rule:

- `WorldScene.preload()` declares `WORLD_ENCOUNTER_AMBIENT_ICON_ID` through `getStatusIconResource('shield')` and `WORLD_ENCOUNTER_BOSS_ICON_ID` through `getSpriteResourceForSkillIcon('skill_ek_slash')`.
- `_setWorldEncounterLine()` renders `world_encounter_ambient_icon` and optional `world_encounter_boss_icon` as separate `16x16` Aseprite images with nearest filtering inside the selected-zone info panel.
- The normal encounter text contains only the field description and boss availability copy. The previous visible `🛡` and `⚔️` glyphs remain only as missing-texture fallback strings.
- `worldFrameQa=1` renders both deterministic encounter icons while still skipping the server encounter request and writes `aeternaWorldFrameQa.encounterLineIcon`.

Exit criteria:

- Unit tests verify the ambient/boss icon ids, preload paths, render helpers, object names, display sizes, nearest filtering, QA payload fields, and legacy inline encounter glyph removal.
- Sprite resource manifest and runtime image reference tests keep the reused shield status icon and Ether Knight slash skill icon coverage intact.
- Browser QA confirms both encounter icons render in `WorldScene`, visible encounter text has no legacy glyph, and no warn/error console logs appear.

Current QA state:

- Phase 132 implementation started on 2026-06-13.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts` failed before implementation because `WorldScene.ts` did not define `WORLD_ENCOUNTER_AMBIENT_ICON_ID` or the encounter line icon QA contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts` passes with 44 tests after implementation.
- `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\uiFrameAssets.test.ts` passes with 75 tests.
- `npm --prefix client run typecheck` passes after the WorldScene encounter line icon wiring.
- `npm run build:client` passes after the WorldScene encounter line icon wiring; the only noted build warning is Vite's CJS Node API deprecation warning.
- In-app Browser QA on `?debugScene=world&renderer=canvas&zone=aether_plains&worldFrameQa=1&class=ether_knight&qaRun=phase132-iab` reports `status: "ready"`, `encounterLineIcon.ambientIcon.renderedCount: 1`, texture key `status_shield_icon`, `encounterLineIcon.bossIcon.renderedCount: 1`, texture key `skill_ek_slash_icon`, both display sizes `16x16`, `fallbackRendered: false`, `legacyGlyphPresent: false`, `missingEncounterAmbientIconTextureKeys: []`, `missingEncounterBossIconTextureKeys: []`, one visible canvas, and no warn/error console logs.

## Phase 133: LobbyScene Party Recruit Title Icon Runtime Wiring

Runtime LobbyScene party recruit panel title icon coverage:

- Party recruit title icon: `skill_ek_slash.png` / texture key `skill_ek_slash_icon`.

Production rule:

- `LobbyScene.preload()` declares `LOBBY_PARTY_RECRUIT_TITLE_ICON_ID` through `getSpriteResourceForSkillIcon('skill_ek_slash')`.
- `_showPartyPanel()` renders `lobby_party_recruit_title_icon` as a separate `20x20` Aseprite image with nearest filtering before the panel title text.
- The normal title text contains only `모험가 길드 — 파티 모집`. The previous visible `⚔️` glyph remains only as a missing-texture fallback string.
- `partyRecruitIconQa=1` opens the deterministic party recruit panel in the offline `debugScene=lobby` route and writes `aeternaPartyRecruitIconQa`.

Exit criteria:

- Unit tests verify the title icon id, preload path, debug route parser, deterministic QA panel open, render helper, object name, display size, nearest filtering, QA payload fields, and legacy inline title removal.
- Sprite resource manifest and runtime image reference tests keep the reused Ether Knight slash skill icon coverage intact.
- Browser QA confirms the title icon renders in `LobbyScene`, visible title text has no legacy glyph, and no warn/error console logs appear.

Current QA state:

- Phase 133 implementation started on 2026-06-13.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts` failed before implementation because `LobbyScene.ts` did not define `LOBBY_PARTY_RECRUIT_TITLE_ICON_ID` or the party recruit title icon QA contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts` passes with 45 tests after implementation.
- `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\uiFrameAssets.test.ts` passes with 76 tests.
- `npm --prefix client run typecheck` passes after the LobbyScene party recruit title icon wiring.
- `npm run build:client` passes after the LobbyScene party recruit title icon wiring; the only noted build warning is Vite's CJS Node API deprecation warning.
- In-app Browser QA initially had one transient `about:blank` tab crash before app navigation; retry on `?debugScene=lobby&renderer=canvas&partyRecruitIconQa=1&class=ether_knight&qaRun=phase133-iab-retry` reports `status: "ready"`, `titleIcon.renderedCount: 1`, texture key `skill_ek_slash_icon`, path `assets/generated/ui/icons/skills/skill_ek_slash.png`, display size `20x20`, `titleText: "모험가 길드 — 파티 모집"`, `fallbackRendered: false`, `legacyGlyphPresent: false`, `missingPartyRecruitTitleIconKeys: []`, one visible canvas, and no warn/error console logs.

## Phase 134: LobbyScene Shop Title Icon Runtime Wiring

Runtime LobbyScene shop panel title icon coverage:

- Shop title icon: `ITM-CON-001.png` / texture key `icon_item_ITM-CON_001`.

Production rule:

- `LobbyScene` declares `LOBBY_SHOP_TITLE_ICON_ID = 'ITM-CON-001'` and relies on `preloadItemIconResources()` for the runtime item icon texture.
- `_showShopPanel()` renders `lobby_shop_title_icon` as a separate `20x20` Aseprite image with nearest filtering before the panel title text.
- The normal title text contains only `상인 미라 — 아이템 상점`. The previous visible `🛒` glyph remains only as a missing-texture fallback string.
- `shopTitleIconQa=1` opens the deterministic merchant shop panel in the offline `debugScene=lobby` route and writes `aeternaShopTitleIconQa`.

Exit criteria:

- Unit tests verify the shop title icon id, debug route parser, deterministic QA panel open, render helper, object name, display size, nearest filtering, QA payload fields, and legacy inline shop title removal.
- Sprite resource manifest and runtime image reference tests keep the reused consumable item icon coverage intact.
- Browser QA confirms the shop title icon renders in `LobbyScene`, visible title text has no legacy glyph, and no warn/error console logs appear.

Current QA state:

- Phase 134 implementation started on 2026-06-13.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts` failed before implementation because `LobbyScene.ts` did not define `LOBBY_SHOP_TITLE_ICON_ID` or the shop title icon QA contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts` passes with 46 tests after implementation.
- `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\uiFrameAssets.test.ts` passes with 77 tests.
- `npm --prefix client run typecheck` passes after the LobbyScene shop title icon wiring.
- `npm run build:client` passes after the LobbyScene shop title icon wiring; the only noted build warning is Vite's CJS Node API deprecation warning.
- In-app Browser QA on `?debugScene=lobby&renderer=canvas&shopTitleIconQa=1&class=ether_knight&qaRun=phase134-iab` reports `status: "ready"`, `titleIcon.renderedCount: 1`, texture key `icon_item_ITM-CON_001`, path `assets/generated/ui/icons/items/ITM-CON-001.png`, display size `20x20`, `titleText: "상인 미라 — 아이템 상점"`, `fallbackRendered: false`, `legacyGlyphPresent: false`, `missingShopTitleIconKeys: []`, one visible canvas, and no warn/error console logs.

## Phase 135: LobbyScene Quest Title Icon Runtime Wiring

Runtime LobbyScene quest panel title icon coverage:

- Quest title icon: `ITM-QST-004.png` / texture key `icon_item_ITM-QST_004`.

Production rule:

- `LobbyScene` declares `LOBBY_QUEST_TITLE_ICON_ID = 'ITM-QST-004'` and relies on `preloadItemIconResources()` for the runtime quest item icon texture.
- `_showQuestPanel()` renders `lobby_quest_title_icon` as a separate `20x20` Aseprite image with nearest filtering before the panel title text.
- The normal title text contains only `퀘스트 (서버 동기화)` or `퀘스트 (로컬 QA 데이터)`. The previous visible `📜` glyph remains only as a missing-texture fallback string.
- `questTitleIconQa=1` opens the deterministic offline quest panel in the `debugScene=lobby` route and writes `aeternaQuestTitleIconQa`.

Exit criteria:

- Unit tests verify the quest title icon id, debug route parser, deterministic QA panel open, render helper, object name, display size, nearest filtering, QA payload fields, and legacy inline quest title removal.
- Sprite resource manifest and runtime image reference tests keep the reused quest item icon coverage intact.
- Browser QA confirms the quest title icon renders in `LobbyScene`, visible title text has no legacy glyph, and no warn/error console logs appear.

Current QA state:

- Phase 135 implementation started on 2026-06-13.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts` failed before implementation because `LobbyScene.ts` did not define `LOBBY_QUEST_TITLE_ICON_ID` or the quest title icon QA contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts` passes with 47 tests after implementation.
- `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\uiFrameAssets.test.ts` passes with 78 tests.
- `npm --prefix client run typecheck` passes after the LobbyScene quest title icon wiring.
- `npm run build:client` passes after the LobbyScene quest title icon wiring; the only noted build warning is Vite's CJS Node API deprecation warning.
- In-app Browser QA on `?debugScene=lobby&renderer=canvas&questTitleIconQa=1&class=ether_knight&qaRun=phase135-iab` reports `status: "ready"`, `titleIcon.renderedCount: 1`, texture key `icon_item_ITM-QST_004`, path `assets/generated/ui/icons/items/ITM-QST-004.png`, display size `20x20`, `titleText: "퀘스트 (로컬 QA 데이터)"`, `fallbackRendered: false`, `legacyGlyphPresent: false`, `missingQuestTitleIconKeys: []`, one visible canvas, and no warn/error console logs.

## Phase 136: LobbyScene Enhance Title Icon Runtime Wiring

Runtime LobbyScene equipment enhance panel title icon coverage:

- Enhance title icon: `ITM-MAT-001.png` / texture key `icon_item_ITM-MAT_001`.

Production rule:

- `LobbyScene` declares `LOBBY_ENHANCE_TITLE_ICON_ID = 'ITM-MAT-001'` and relies on `preloadItemIconResources()` for the runtime material item icon texture.
- `_showEnhancePanel()` renders `lobby_enhance_title_icon` as a separate `20x20` Aseprite image with nearest filtering before the panel title text.
- The normal title text contains only `대장장이 칼렌 — 장비 강화`. The previous visible `🔨` glyph remains only as a missing-texture fallback string.
- `enhanceTitleIconQa=1` opens the deterministic blacksmith enhance panel in the offline `debugScene=lobby` route and writes `aeternaEnhanceTitleIconQa`.

Exit criteria:

- Unit tests verify the enhance title icon id, debug route parser, deterministic QA panel open, render helper, object name, display size, nearest filtering, QA payload fields, and legacy inline enhance title removal.
- Sprite resource manifest and runtime image reference tests keep the reused material item icon coverage intact.
- Browser QA confirms the enhance title icon renders in `LobbyScene`, visible title text has no legacy glyph, and no warn/error console logs appear.

Current QA state:

- Phase 136 implementation started on 2026-06-13.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts` failed before implementation because `LobbyScene.ts` did not define `LOBBY_ENHANCE_TITLE_ICON_ID` or the enhance title icon QA contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts` passes with 48 tests after implementation.
- `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\uiFrameAssets.test.ts` passes with 79 tests.
- `npm --prefix client run typecheck` passes after the LobbyScene enhance title icon wiring.
- `npm run build:client` passes after the LobbyScene enhance title icon wiring; the only noted build warning is Vite's CJS Node API deprecation warning.
- In-app Browser QA on `?debugScene=lobby&renderer=canvas&enhanceTitleIconQa=1&class=ether_knight&qaRun=phase136-iab` reports `status: "ready"`, `titleIcon.renderedCount: 1`, texture key `icon_item_ITM-MAT_001`, path `assets/generated/ui/icons/items/ITM-MAT-001.png`, display size `20x20`, `titleText: "대장장이 칼렌 — 장비 강화"`, `fallbackRendered: false`, `legacyGlyphPresent: false`, `missingEnhanceTitleIconKeys: []`, one visible canvas, and no warn/error console logs.

## Phase 137: LobbyScene Story Title Icon Runtime Wiring

Runtime LobbyScene main story panel title icon coverage:

- Story title icon: `ITM-QST-001.png` / texture key `icon_item_ITM-QST_001`.

Production rule:

- `LobbyScene` declares `LOBBY_STORY_TITLE_ICON_ID = 'ITM-QST-001'` and relies on `preloadItemIconResources()` for the runtime quest item icon texture.
- `_showStoryPanel()` renders `lobby_story_title_icon` as a separate `20x20` Aseprite image with nearest filtering before the panel title text.
- The normal title text contains only `장로 마테우스 — 메인 스토리`. The previous visible `📖` glyph remains only as a missing-texture fallback string.
- `storyTitleIconQa=1` opens the deterministic elder story panel in the offline `debugScene=lobby` route and writes `aeternaStoryTitleIconQa`.

Exit criteria:

- Unit tests verify the story title icon id, debug route parser, deterministic QA panel open, render helper, object name, display size, nearest filtering, QA payload fields, and legacy inline story title removal.
- Sprite resource manifest and runtime image reference tests keep the reused quest item icon coverage intact.
- Browser QA confirms the story title icon renders in `LobbyScene`, visible title text has no legacy glyph, and no warn/error console logs appear.

Current QA state:

- Phase 137 implementation started on 2026-06-13.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts` failed before implementation because `LobbyScene.ts` did not define `LOBBY_STORY_TITLE_ICON_ID` or the story title icon QA contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts` passes with 49 tests after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\uiFrameAssets.test.ts` passes with 80 tests.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; only the existing Vite CJS Node API deprecation warning is emitted.
- Browser QA: `http://127.0.0.1:5175/?debugScene=lobby&renderer=canvas&storyTitleIconQa=1&class=ether_knight&qaRun=phase137-iab` reports `aeternaStoryTitleIconQa.status = ready`, `icon_item_ITM-QST_001`, `assets/generated/ui/icons/items/ITM-QST-001.png`, `renderedCount = 1`, `expectedCount = 1`, `displaySizes = [{ width: 20, height: 20 }]`, `fallbackRendered = false`, `legacyGlyphPresent = false`, `missingStoryTitleIconKeys = []`, `visibleCanvasCount = 1`, and no warn/error console logs.

## Phase 138: LobbyScene Inventory Title Icon Runtime Wiring

Runtime LobbyScene inventory panel title icon coverage:

- Inventory title icon: `ITM-CON-001.png` / texture key `icon_item_ITM-CON_001`.

Production rule:

- `LobbyScene` declares `LOBBY_INVENTORY_TITLE_ICON_ID = 'ITM-CON-001'` and relies on `preloadItemIconResources()` for the runtime item icon texture.
- `_showInventoryPanel()` renders `lobby_inventory_title_icon` as a separate `20x20` Aseprite image with nearest filtering before the panel title text.
- The normal title text contains only `인벤토리 (N개)`. The previous visible `🎒` glyph remains only as a missing-texture fallback string.
- `inventoryTitleIconQa=1` opens the deterministic QA inventory panel in the offline `debugScene=lobby` route and writes `aeternaInventoryTitleIconQa`.

Exit criteria:

- Unit tests verify the inventory title icon id, debug route parser, deterministic QA panel open, render helper, object name, display size, nearest filtering, QA payload fields, and legacy inline inventory title removal.
- Sprite resource manifest and runtime image reference tests keep the reused consumable item icon coverage intact.
- Browser QA confirms the inventory title icon renders in `LobbyScene`, visible title text has no legacy glyph, and no warn/error console logs appear.

Current QA state:

- Phase 138 implementation started on 2026-06-13.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts` failed before implementation because `LobbyScene.ts` did not define `LOBBY_INVENTORY_TITLE_ICON_ID` or the inventory title icon QA contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts` passes with 50 tests after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\uiFrameAssets.test.ts` passes with 81 tests.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; only the existing Vite CJS Node API deprecation warning is emitted.
- Browser QA: `http://127.0.0.1:5175/?debugScene=lobby&renderer=canvas&inventoryTitleIconQa=1&class=ether_knight&qaRun=phase138-iab-retry` reports `aeternaInventoryTitleIconQa.status = ready`, `icon_item_ITM-CON_001`, `assets/generated/ui/icons/items/ITM-CON-001.png`, `renderedCount = 1`, `expectedCount = 1`, `displaySizes = [{ width: 20, height: 20 }]`, `fallbackRendered = false`, `legacyGlyphPresent = false`, `missingInventoryTitleIconKeys = []`, `visibleCanvasCount = 1`, and no warn/error console logs.

## Phase 139: LobbyScene Dialogue Title Icon Runtime Wiring

Runtime LobbyScene NPC dialogue panel title icon coverage:

- Dialogue title icon: `npc_portrait_20_mira_portrait.png` / texture key `npc_portrait_20_mira_portrait`.

Production rule:

- `LobbyScene` declares `LOBBY_DIALOGUE_TITLE_ICON_NPC_ID = 'merchant'` for deterministic QA coverage and uses `LOBBY_NPC_PORTRAIT_TEXTURES[npc.id]` for the runtime NPC-specific title icon.
- `_openNpcDialogue()` renders `lobby_dialogue_title_icon` as a separate `20x20` Aseprite image with nearest filtering before the panel title text.
- The normal title text contains only the NPC name, for example `상인 미라`. The previous visible `💬` glyph remains only as a missing-texture fallback string.
- `dialogueTitleIconQa=1` opens the deterministic merchant dialogue in the offline `debugScene=lobby` route and writes `aeternaDialogueTitleIconQa`.

Exit criteria:

- Unit tests verify the deterministic merchant NPC id, debug route parser, deterministic QA dialogue open, render helper, object name, display size, nearest filtering, QA payload fields, and legacy inline dialogue title removal.
- Sprite resource manifest and runtime image reference tests keep the reused NPC portrait icon coverage intact.
- Browser QA confirms the dialogue title icon renders in `LobbyScene`, visible title text has no legacy glyph, and no warn/error console logs appear.

Current QA state:

- Phase 139 implementation started on 2026-06-13.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts` failed before implementation because `LobbyScene.ts` did not define `LOBBY_DIALOGUE_TITLE_ICON_NPC_ID` or the dialogue title icon QA contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts` passes with 51 tests after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\uiFrameAssets.test.ts` passes with 82 tests.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; only the existing Vite CJS Node API deprecation warning is emitted.
- Browser QA: `http://127.0.0.1:5175/?debugScene=lobby&renderer=canvas&dialogueTitleIconQa=1&class=ether_knight&qaRun=phase139-iab` reports `aeternaDialogueTitleIconQa.status = ready`, `npc_portrait_20_mira_portrait`, `assets/generated/characters/npc/npc_portrait_20_mira_portrait.png`, `renderedCount = 1`, `expectedCount = 1`, `displaySizes = [{ width: 20, height: 20 }]`, `fallbackRendered = false`, `legacyGlyphPresent = false`, `missingDialogueTitleIconKeys = []`, `visibleCanvasCount = 1`, and no warn/error console logs.

## Phase 140: LobbyScene Dialogue Choice Button Frame Runtime Wiring

Runtime LobbyScene NPC dialogue choice button frame coverage:

- Dialogue choice button frame: `UI-BTN-006-DEF.png` / texture key `ui_frame_lobby_dialogue_choice_button`.

Production rule:

- `LobbyScene` adds `dialogueChoiceButton` to `LOBBY_UI_FRAME_TEXTURES`, so the existing preload loop queues the choice button frame with the other lobby modal frames.
- `_openNpcDialogue()` renders two `lobby_dialogue_choice_button_frame` images behind the `이용하기` and `닫기` labels at `108x34` with nearest filtering.
- Pointer hover/down on the frame mirrors the existing text button interactions. Keyboard navigation, focus prefix, labels, and NPC action callbacks stay in dynamic Phaser logic.
- `dialogueChoiceButtonFrameQa=1` opens the deterministic merchant dialogue in the offline `debugScene=lobby` route and writes `aeternaDialogueChoiceButtonFrameQa`.

Exit criteria:

- Unit tests verify the choice button frame texture key/path, debug route parser, deterministic QA dialogue open, render helper, object name, display size, nearest filtering, QA payload fields, and `main.ts` debug route data wiring.
- UI frame coverage keeps `UI-BTN-006-DEF.png` in the Aseprite roster-backed runtime frame library.
- Browser QA confirms two choice button frames render in `LobbyScene`, text-only fallback is not used, and no warn/error console logs appear.

Current QA state:

- Phase 140 implementation started on 2026-06-13.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts -t "로비 NPC 대화 선택 버튼"` failed before implementation because `LobbyScene.ts` did not define `dialogueChoiceButtonFrameQa` or the choice button frame QA contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts -t "로비 NPC 대화 선택 버튼"` passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\uiFrameAssets.test.ts` passes with 83 tests.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; only the existing Vite CJS Node API deprecation warning is emitted.
- Browser QA: `http://127.0.0.1:5175/?debugScene=lobby&renderer=canvas&dialogueChoiceButtonFrameQa=1&class=ether_knight&qaRun=phase140-iab` reports `aeternaDialogueChoiceButtonFrameQa.status = ready`, `ui_frame_lobby_dialogue_choice_button`, `assets/generated/ui/frames/UI-BTN-006-DEF.png`, `renderedCount = 2`, `expectedCount = 2`, `displaySizes = [{ width: 108, height: 34 }, { width: 108, height: 34 }]`, `fallbackRendered = false`, `missingFrameKeys = []`, `visibleCanvasCount = 1`, and no warn/error console logs.

## Phase 141: LobbyScene Dialogue Choice Focus Icon Runtime Wiring

Runtime LobbyScene NPC dialogue choice focus icon coverage:

- Dialogue choice focus icon: `skill_mw_arrow.png` / texture key `skill_mw_arrow_icon`.

Production rule:

- `LobbyScene.preload()` resolves `getSpriteResourceForSkillIcon('skill_mw_arrow')` and queues the icon with the deterministic skill icon manifest path.
- `_openNpcDialogue()` renders one `lobby_dialogue_choice_focus_icon` image at `14x14` with nearest filtering before the legacy focus glyph fallback.
- Keyboard and pointer focus changes move the same icon between the `이용하기` and `닫기` choices while labels stay text-only.
- Texture-missing fallback keeps the previous `▶` prefix behavior, but normal Aseprite-backed rendering must not leave the legacy glyph in either label.
- `dialogueChoiceFocusIconQa=1` opens the deterministic merchant dialogue in the offline `debugScene=lobby` route and writes `aeternaDialogueChoiceFocusIconQa`.

Exit criteria:

- Unit tests verify the focus icon id, preload call, debug route parser, render helper, object name, display size, nearest filtering, QA payload fields, and removal of the direct legacy `▶` text assignments.
- Browser QA confirms one `skill_mw_arrow_icon` focus image renders in `LobbyScene`, the legacy glyph is absent from labels, no focus icon keys are missing, and no warn/error console logs appear.
- The existing NPC action callbacks, button frame rendering, keyboard navigation, and texture-missing fallback behavior remain unchanged.

Current QA state:

- Phase 141 implementation started on 2026-06-13.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "LobbyScene dialogue choice focus"` failed before implementation because `LobbyScene.ts` did not define `LOBBY_DIALOGUE_CHOICE_FOCUS_ICON_ID` or the focus icon QA contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "LobbyScene dialogue choice focus"` passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\uiFrameAssets.test.ts` passes with 84 tests.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; only the existing Vite CJS Node API deprecation warning is emitted.
- Browser QA: `http://127.0.0.1:5175/?debugScene=lobby&renderer=canvas&dialogueChoiceFocusIconQa=1&class=ether_knight&qaRun=phase141-iab` reports `aeternaDialogueChoiceFocusIconQa.status = ready`, `skill_mw_arrow_icon`, `assets/generated/ui/icons/skills/skill_mw_arrow.png`, `renderedCount = 1`, `expectedCount = 1`, `displaySizes = [{ width: 14, height: 14 }]`, `fallbackRendered = false`, `legacyGlyphPresent = false`, `missingDialogueChoiceFocusIconKeys = []`, `labels = ["[ 이용하기 ]", "[ 닫기 ]"]`, `visibleCanvasCount = 1`, and no warn/error console logs.

## Phase 142: LobbyScene Bottom Nav Focus Icon Runtime Wiring

Runtime LobbyScene bottom navigation focus icon coverage:

- Bottom nav focus icon: `skill_mw_arrow.png` / texture key `skill_mw_arrow_icon`.

Production rule:

- `LobbyScene.preload()` resolves `getSpriteResourceForSkillIcon('skill_mw_arrow')` for the bottom nav focus marker and avoids duplicate queueing when the dialogue choice focus marker already uses the same texture key.
- `_drawNavButtons()` renders one `lobby_nav_focus_icon` image at `14x14` with nearest filtering before the legacy focus glyph fallback.
- Keyboard and pointer focus changes move the same icon to the active nav item while nav labels stay text-only.
- Texture-missing fallback keeps the previous `▶` prefix behavior, but normal Aseprite-backed rendering must not leave the legacy glyph in any bottom nav label.
- `lobbyNavFocusIconQa=1` writes `aeternaLobbyNavFocusIconQa` in the offline `debugScene=lobby` route.

Exit criteria:

- Unit tests verify the focus icon id, debug route parser, render helper, object name, display size, nearest filtering, QA payload fields, and removal of the direct legacy `▶` text assignment.
- Browser QA confirms one `skill_mw_arrow_icon` focus image renders in `LobbyScene`, active nav labels have no legacy glyph, no focus icon keys are missing, and no warn/error console logs appear.
- Existing bottom nav content icons, keyboard navigation, pointer interactions, scene transitions, and texture-missing fallback behavior remain unchanged.

Current QA state:

- Phase 142 implementation started on 2026-06-13.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "LobbyScene bottom nav focus"` failed before implementation because `LobbyScene.ts` did not define `LOBBY_NAV_FOCUS_ICON_ID` or the bottom nav focus icon QA contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "LobbyScene bottom nav focus"` passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\uiFrameAssets.test.ts` passes with 85 tests.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; only the existing Vite CJS Node API deprecation warning is emitted.
- Browser QA: `http://127.0.0.1:5175/?debugScene=lobby&renderer=canvas&lobbyNavFocusIconQa=1&class=ether_knight&qaRun=phase142-iab` reports `aeternaLobbyNavFocusIconQa.status = ready`, `activeIndex = 0`, `skill_mw_arrow_icon`, `assets/generated/ui/icons/skills/skill_mw_arrow.png`, `renderedCount = 1`, `expectedCount = 1`, `displaySizes = [{ width: 14, height: 14 }]`, `fallbackRendered = false`, `legacyGlyphPresent = false`, `missingLobbyNavFocusIconKeys = []`, `labels = ["월드맵", "던전", "인벤토리", "스킬", "퀘스트"]`, `visibleCanvasCount = 1`, and no warn/error console logs.
- Browser QA focus movement: after focusing the canvas and pressing `ArrowRight`, the dataset reports `activeIndex = 1`, the same focus icon remains `visible = true`, its x position moves from `258` to `578`, `legacyGlyphPresent = false`, and no warn/error console logs appear.

## Phase 143: LobbyScene Story Action Focus Icon Runtime Wiring

Runtime LobbyScene story panel action focus icon coverage:

- Story action focus icon: `skill_mw_arrow.png` / texture key `skill_mw_arrow_icon`.

Production rule:

- `LobbyScene.preload()` resolves `getSpriteResourceForSkillIcon('skill_mw_arrow')` for the story action focus marker and avoids duplicate queueing when dialogue choice or bottom nav focus already uses the same texture key.
- `_showStoryPanel()` renders one `lobby_story_action_focus_icon` image at `14x14` with nearest filtering before the legacy focus glyph fallback.
- Keyboard and pointer focus changes move the same icon between `[ 챕터 1 시작 ]` and `[ 닫기 ]` while action labels stay text-only.
- Texture-missing fallback keeps the previous `▶` prefix behavior, but normal Aseprite-backed rendering must not leave the legacy glyph in either story action label.
- `storyActionFocusIconQa=1` opens the deterministic elder story panel in the offline `debugScene=lobby` route and writes `aeternaStoryActionFocusIconQa`.

Exit criteria:

- Unit tests verify the focus icon id, debug route parser, deterministic QA panel open, render helper, object name, display size, nearest filtering, QA payload fields, and removal of direct legacy `▶` text assignments inside the story panel.
- Browser QA confirms one `skill_mw_arrow_icon` focus image renders in `LobbyScene`, active story action labels have no legacy glyph, no focus icon keys are missing, and no warn/error console logs appear.
- Existing story title icon rendering, panel keyboard navigation, pointer interactions, chapter start callback, close callback, and texture-missing fallback behavior remain unchanged.

Current QA state:

- Phase 143 implementation started on 2026-06-13.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "LobbyScene story panel action focus"` failed before implementation because `LobbyScene.ts` did not define `LOBBY_STORY_ACTION_FOCUS_ICON_ID` or the story action focus icon QA contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "LobbyScene story panel action focus"` passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\uiFrameAssets.test.ts` passes with 86 tests.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; only the existing Vite CJS Node API deprecation warning is emitted.
- Browser QA: `http://127.0.0.1:5175/?debugScene=lobby&renderer=canvas&storyActionFocusIconQa=1&class=ether_knight&qaRun=phase143-iab` reports `aeternaStoryActionFocusIconQa.status = ready`, `activeIndex = 0`, `skill_mw_arrow_icon`, `assets/generated/ui/icons/skills/skill_mw_arrow.png`, `renderedCount = 1`, `expectedCount = 1`, `displaySizes = [{ width: 14, height: 14 }]`, `fallbackRendered = false`, `legacyGlyphPresent = false`, `missingStoryActionFocusIconKeys = []`, `labels = ["[ 챕터 1 시작 ]", "[ 닫기 ]"]`, `visibleCanvasCount = 1`, and no warn/error console logs.
- Browser QA focus movement: after focusing the canvas and pressing `ArrowRight`, the dataset reports `activeIndex = 1`, the same focus icon remains `visible = true`, its x position moves from `-142` to `38`, `legacyGlyphPresent = false`, and no warn/error console logs appear.

## Phase 144: LobbyScene Party Action Focus Icon Runtime Wiring

Runtime LobbyScene party recruit panel action focus icon coverage:

- Party action focus icon: `skill_mw_arrow.png` / texture key `skill_mw_arrow_icon`.

Production rule:

- `LobbyScene.preload()` resolves `getSpriteResourceForSkillIcon('skill_mw_arrow')` for the party action focus marker and avoids duplicate queueing when dialogue choice, bottom nav, or story action focus already uses the same texture key.
- `_showPartyPanel()` renders one `lobby_party_action_focus_icon` image at `14x14` with nearest filtering before the legacy focus glyph fallback.
- Keyboard and pointer focus changes move the same icon between `[ 파티 생성 ]`, `[ 파티 검색 ]`, and `[ 닫기 ]` while action labels stay text-only.
- Texture-missing fallback keeps the previous `▶` prefix behavior, but normal Aseprite-backed rendering must not leave the legacy glyph in any party action label.
- `partyActionFocusIconQa=1` opens the deterministic party recruit panel in the offline `debugScene=lobby` route and writes `aeternaPartyActionFocusIconQa`.

Exit criteria:

- Unit tests verify the focus icon id, debug route parser, deterministic QA panel open, render helper, object name, display size, nearest filtering, QA payload fields, and removal of direct legacy `▶` text assignments inside the party panel.
- Browser QA confirms one `skill_mw_arrow_icon` focus image renders in `LobbyScene`, active party action labels have no legacy glyph, no focus icon keys are missing, and no warn/error console logs appear.
- Existing party title icon rendering, panel keyboard navigation, pointer interactions, create/search/close callbacks, and texture-missing fallback behavior remain unchanged.

Current QA state:

- Phase 144 implementation started on 2026-06-13.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "LobbyScene party panel action focus"` failed before implementation because `LobbyScene.ts` did not define `LOBBY_PARTY_ACTION_FOCUS_ICON_ID` or the party action focus icon QA contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "LobbyScene party panel action focus"` passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\uiFrameAssets.test.ts` passes 87 tests.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.
- Browser QA: `http://127.0.0.1:5175/?debugScene=lobby&renderer=canvas&partyActionFocusIconQa=1&class=ether_knight&qaRun=phase144-iab` reports `aeternaPartyActionFocusIconQa.status=ready`, `focusIcon.key=skill_mw_arrow_icon`, `path=assets/generated/ui/icons/skills/skill_mw_arrow.png`, one rendered `14x14` icon, `fallbackRendered=false`, `legacyGlyphPresent=false`, no missing focus icon keys, one visible canvas, and no warn/error console logs.
- Browser input QA: after a CUA canvas click, `ArrowRight` moves the party action focus icon from `[ 파티 생성 ]` at `(-142, 50)` to `[ 파티 검색 ]` at `(18, 50)`, and a second `ArrowRight` moves it to `[ 닫기 ]` at `(-50, 90)` with labels remaining text-only.

## Phase 145: LobbyScene Shop Action Focus Icon Runtime Wiring

Runtime LobbyScene shop panel action focus icon coverage:

- Shop action focus icon: `skill_mw_arrow.png` / texture key `skill_mw_arrow_icon`.

Production rule:

- `LobbyScene.preload()` resolves `getSpriteResourceForSkillIcon('skill_mw_arrow')` for the shop action focus marker and avoids duplicate queueing when dialogue choice, bottom nav, party action, or story action focus already uses the same texture key.
- `_showShopPanel()` renders one `lobby_shop_action_focus_icon` image at `14x14` with nearest filtering before the legacy focus glyph fallback.
- Keyboard and pointer focus changes move the same icon between dynamic `[구매]` buttons and `[ 닫기 ]` while action labels stay text-only.
- Texture-missing fallback keeps the previous `▶` prefix behavior, but normal Aseprite-backed rendering must not leave the legacy glyph in any shop action label.
- `shopActionFocusIconQa=1` opens the deterministic merchant shop panel in the offline `debugScene=lobby` route and writes `aeternaShopActionFocusIconQa`.

Exit criteria:

- Unit tests verify the focus icon id, debug route parser, deterministic QA panel open, render helper, object name, display size, nearest filtering, QA payload fields, and removal of direct legacy `▶` text assignments inside the shop panel.
- Browser QA confirms one `skill_mw_arrow_icon` focus image renders in `LobbyScene`, active shop action labels have no legacy glyph, no focus icon keys are missing, and no warn/error console logs appear.
- Existing shop title icon rendering, item icon rows, panel keyboard navigation, pointer interactions, buy/close callbacks, and texture-missing fallback behavior remain unchanged.

Current QA state:

- Phase 145 implementation started on 2026-06-14.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "LobbyScene shop panel action focus"` failed before implementation because `LobbyScene.ts` did not define `LOBBY_SHOP_ACTION_FOCUS_ICON_ID` or the shop action focus icon QA contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "LobbyScene shop panel action focus"` passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\uiFrameAssets.test.ts` passes 88 tests.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.
- Browser QA: `http://127.0.0.1:5175/?debugScene=lobby&renderer=canvas&shopActionFocusIconQa=1&class=ether_knight&qaRun=phase145-iab` reports `aeternaShopActionFocusIconQa.status=ready`, `focusIcon.key=skill_mw_arrow_icon`, `path=assets/generated/ui/icons/skills/skill_mw_arrow.png`, one rendered `14x14` icon, `fallbackRendered=false`, `legacyGlyphPresent=false`, no missing focus icon keys, six text-only action labels, one visible canvas, and no warn/error console logs.
- Browser input QA: after a CUA canvas click, `ArrowDown` moves the shop action focus icon from the first `[구매]` at `(162, -73)` to the second `[구매]` at `(162, -33)`, and four more `ArrowDown` inputs move it to `[ 닫기 ]` at `(-50, 140)` with labels remaining text-only.

## Phase 146: LobbyScene Enhance Action Focus Icon Runtime Wiring

Runtime LobbyScene enhance panel action focus icon coverage:

- Enhance action focus icon: `skill_mw_arrow.png` / texture key `skill_mw_arrow_icon`.

Production rule:

- `LobbyScene.preload()` resolves `getSpriteResourceForSkillIcon('skill_mw_arrow')` for the enhance action focus marker and avoids duplicate queueing when other lobby focus surfaces already use the same texture key.
- `_showEnhancePanel()` renders one `lobby_enhance_action_focus_icon` image at `14x14` with nearest filtering before the legacy focus glyph fallback.
- Keyboard and pointer focus keep the same icon on `[ 닫기 ]` while the action label stays text-only.
- Texture-missing fallback keeps the previous `▶` prefix behavior, but normal Aseprite-backed rendering must not leave the legacy glyph in the enhance action label.
- `enhanceActionFocusIconQa=1` opens the deterministic blacksmith enhance panel in the offline `debugScene=lobby` route and writes `aeternaEnhanceActionFocusIconQa`.

Exit criteria:

- Unit tests verify the focus icon id, debug route parser, deterministic QA panel open, render helper, object name, display size, nearest filtering, QA payload fields, and removal of direct legacy `▶` text assignment inside the enhance panel.
- Browser QA confirms one `skill_mw_arrow_icon` focus image renders in `LobbyScene`, the enhance close label has no legacy glyph, no focus icon keys are missing, and no warn/error console logs appear.
- Existing enhance title icon rendering, panel keyboard navigation, pointer close callback, and texture-missing fallback behavior remain unchanged.

Current QA state:

- Phase 146 implementation started on 2026-06-14.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "LobbyScene enhance panel action focus"` failed before implementation because `LobbyScene.ts` did not define `LOBBY_ENHANCE_ACTION_FOCUS_ICON_ID` or the enhance action focus icon QA contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "LobbyScene enhance panel action focus"` passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\uiFrameAssets.test.ts` passes 89 tests.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.
- Browser QA: `http://127.0.0.1:5175/?debugScene=lobby&renderer=canvas&enhanceActionFocusIconQa=1&class=ether_knight&qaRun=phase146-iab` reports `aeternaEnhanceActionFocusIconQa.status=ready`, `focusIcon.key=skill_mw_arrow_icon`, `path=assets/generated/ui/icons/skills/skill_mw_arrow.png`, one rendered `14x14` icon, `fallbackRendered=false`, `legacyGlyphPresent=false`, `missingEnhanceActionFocusIconKeys=[]`, `[ 닫기 ]` text-only label, one visible canvas, and no warn/error console logs.
- Browser input QA: after a CUA canvas click plus `ArrowRight` and `ArrowDown`, the enhance action focus stays on active index `0`, keeps the icon at `(-50, 90)`, keeps the label text-only, and emits no warn/error console logs.

## Phase 147: LobbyScene Inventory Action Focus Icon Runtime Wiring

Runtime LobbyScene inventory panel row/action focus icon coverage:

- Inventory action focus icon: `skill_mw_arrow.png` / texture key `skill_mw_arrow_icon`.

Production rule:

- `LobbyScene.preload()` resolves `getSpriteResourceForSkillIcon('skill_mw_arrow')` for the inventory action focus marker and avoids duplicate queueing when other lobby focus surfaces already use the same texture key.
- `_showInventoryPanel()` renders one `lobby_inventory_action_focus_icon` image at `14x14` with nearest filtering before the legacy focus glyph fallback.
- Keyboard focus moves the same icon between visible inventory item rows and the `[ 닫기 ]` action while each label stays text-only.
- Texture-missing fallback keeps the previous `▶` prefix behavior, but normal Aseprite-backed rendering must not leave the legacy glyph in item row or close labels.
- `inventoryActionFocusIconQa=1` opens the deterministic inventory panel in the offline `debugScene=lobby` route and writes `aeternaInventoryActionFocusIconQa`.

Exit criteria:

- Unit tests verify the focus icon id, debug route parser, deterministic QA panel open, render helper, object name, display size, nearest filtering, QA payload fields, and removal of direct legacy `▶` text assignment inside the inventory panel.
- Browser QA confirms one `skill_mw_arrow_icon` focus image renders in `LobbyScene`, inventory row and close labels have no legacy glyph, no focus icon keys are missing, and no warn/error console logs appear.
- Existing inventory item icon rendering, title icon rendering, keyboard navigation, item use/equip callback, pointer close callback, and texture-missing fallback behavior remain unchanged.

Current QA state:

- Phase 147 implementation started on 2026-06-14.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "LobbyScene inventory panel action focus"` failed before implementation because `LobbyScene.ts` did not define `LOBBY_INVENTORY_ACTION_FOCUS_ICON_ID` or the inventory action focus icon QA contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "LobbyScene inventory panel action focus"` passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\uiFrameAssets.test.ts` passes 90 tests.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.
- Browser QA: `http://127.0.0.1:5175/?debugScene=lobby&renderer=canvas&inventoryActionFocusIconQa=1&class=ether_knight&qaRun=phase147-iab` reports `aeternaInventoryActionFocusIconQa.status=ready`, `focusIcon.key=skill_mw_arrow_icon`, `path=assets/generated/ui/icons/skills/skill_mw_arrow.png`, one rendered `14x14` icon, `fallbackRendered=false`, `legacyGlyphPresent=false`, `missingInventoryActionFocusIconKeys=[]`, three item row labels plus `[ 닫기 ]` as text-only labels, one visible canvas, and no warn/error console logs.
- Browser input QA: after a CUA canvas click, `ArrowDown` moves active index from `0` to `1` and moves the icon from `(-202, -27)` to `(-202, 9)`; two more `ArrowDown` inputs move it to `[ 닫기 ]` at active index `3` and `(-50, 89)`, with labels remaining text-only and no warn/error console logs.

## Phase 148: LobbyScene Quest Action Focus Icon Runtime Wiring

Runtime LobbyScene quest panel action focus icon coverage:

- Quest action focus icon: `skill_mw_arrow.png` / texture key `skill_mw_arrow_icon`.

Production rule:

- `LobbyScene.preload()` resolves `getSpriteResourceForSkillIcon('skill_mw_arrow')` for the quest panel action focus marker and avoids duplicate queueing when other lobby focus surfaces already use the same texture key.
- `_showQuestPanel()` renders one `lobby_quest_action_focus_icon` image at `14x14` with nearest filtering before the legacy focus glyph fallback.
- Keyboard focus moves the same icon between actionable quest rows, `[ 새로고침 ]`, and `[ 닫기 ]` while each label stays text-only.
- Texture-missing fallback keeps the previous `▶` prefix behavior, but normal Aseprite-backed rendering must not leave the legacy glyph in quest action, refresh, or close labels.
- `questActionFocusIconQa=1` opens the deterministic quest panel in the offline `debugScene=lobby` route and writes `aeternaQuestActionFocusIconQa`.

Exit criteria:

- Unit tests verify the focus icon id, debug route parser, deterministic QA panel open, render helper, object name, display size, nearest filtering, QA payload fields, and removal of direct legacy `▶` text assignment inside the quest panel.
- Browser QA confirms one `skill_mw_arrow_icon` focus image renders in `LobbyScene`, quest action/refresh/close labels have no legacy glyph, no focus icon keys are missing, and no warn/error console logs appear.
- Existing quest title icon rendering, status sorting, accept/complete callbacks, refresh callback, close callback, keyboard navigation, and texture-missing fallback behavior remain unchanged.

Current QA state:

- Phase 148 implementation started on 2026-06-14.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "LobbyScene quest panel action focus"` failed before implementation because `LobbyScene.ts` did not define `LOBBY_QUEST_ACTION_FOCUS_ICON_ID` or the quest action focus icon QA contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "LobbyScene quest panel action focus"` passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\uiFrameAssets.test.ts` passes 91 tests.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.
- Browser QA: `http://127.0.0.1:5175/?debugScene=lobby&renderer=canvas&questActionFocusIconQa=1&class=ether_knight&qaRun=phase148-iab` reports `aeternaQuestActionFocusIconQa.status=ready`, `focusIcon.key=skill_mw_arrow_icon`, `path=assets/generated/ui/icons/skills/skill_mw_arrow.png`, one rendered `14x14` icon, `fallbackRendered=false`, `legacyGlyphPresent=false`, `missingQuestActionFocusIconKeys=[]`, `[ 완료 ]`, `[ 수주 ]`, `[ 새로고침 ]`, `[ 닫기 ]` as text-only labels, one visible canvas, and no warn/error console logs.
- Browser input QA: after a CUA canvas click, `ArrowDown` moves active index from `0` to `1` and moves the icon from `(190, -42)` to `(190, 36)`; two more `ArrowDown` inputs move it to `[ 닫기 ]` at active index `3` and `(42, 194)`, with labels remaining text-only and no warn/error console logs.

## Phase 149: BattleScene Command Menu Focus Icon Runtime Wiring

Runtime BattleScene command menu focus icon coverage:

- Command focus icon: `skill_mw_arrow.png` / texture key `skill_mw_arrow_icon`.

Production rule:

- `BattleScene.preload()` resolves `getSpriteResourceForSkillIcon('skill_mw_arrow')` for the command menu focus marker and avoids duplicate queueing when the active-turn indicator already uses the same texture key.
- `_openCommandMenu()` renders one `battle_command_focus_icon` image at `14x14` with nearest filtering before the legacy focus glyph fallback.
- Keyboard and pointer focus move the same icon between 공격, 마법, 아이템, 방어, 도주 command labels while each label stays text-only.
- Texture-missing fallback keeps the previous `▶` prefix behavior, but normal Aseprite-backed rendering must not leave the legacy glyph in command labels.
- `battleCommandFocusIconQa=1` opens a deterministic command menu in the offline `debugScene=battle` route and writes `aeternaBattleCommandFocusIconQa`.

Exit criteria:

- Unit tests verify the focus icon id, debug route parser, deterministic QA command menu open, render helper, object name, display size, nearest filtering, QA payload fields, and removal of direct legacy `▶` text assignment inside `_highlightCommand()`.
- Browser QA confirms one `skill_mw_arrow_icon` focus image renders in `BattleScene`, command labels have no legacy glyph, no focus icon keys are missing, and no warn/error console logs appear.
- Existing command icons, active-turn indicator, command execution, pointer hover, keyboard navigation, ATB WAIT freeze, and texture-missing fallback behavior remain unchanged.

Current QA state:

- Phase 149 implementation started on 2026-06-14.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "BattleScene command menu focus"` failed before implementation because `BattleScene.ts` did not define `BATTLE_COMMAND_FOCUS_ICON_ID` or the command focus icon QA contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "BattleScene command menu focus"` passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\uiFrameAssets.test.ts` passes 92 tests across 3 files.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.
- Browser QA: `http://127.0.0.1:5175/?debugScene=battle&renderer=canvas&battleCommandFocusIconQa=1&class=ether_knight&qaRun=phase149-iab` reports `aeternaBattleCommandFocusIconQa.status=ready`, `focusIcon.key=skill_mw_arrow_icon`, `path=assets/generated/ui/icons/skills/skill_mw_arrow.png`, one rendered `14x14` icon, `fallbackRendered=false`, `legacyGlyphPresent=false`, `missingBattleCommandFocusIconKeys=[]`, text-only `공격`, `마법`, `아이템`, `방어`, `도주` labels, one visible canvas, and no warn/error console logs.
- Browser input QA: after a CUA canvas click, the first `ArrowRight` moves active index from `0` to `1` and moves the icon from `(12, 24)` to `(132, 24)`; a second `ArrowRight` moves active index to `2` and icon position to `(252, 24)`, with labels remaining text-only and no warn/error console logs.

## Phase 150: BattleUI Pause/Resume Utility Icon Runtime Wiring

Runtime BattleUI pause/resume utility icon coverage:

- Active pause icon: `skill_tg_stop.png` / texture key `skill_tg_stop_icon`.
- Paused resume icon: `skill_mw_arrow.png` / texture key `skill_mw_arrow_icon`.
- Flee icon: `skill_vw_warp.png` / texture key `skill_vw_warp_icon`.

Production rule:

- `preloadBattleUiFrameTextures()` queues all three utility button icon resources before `BattleUI` creates the utility buttons.
- The pause button renders one `battle_ui_utility_button_icon_pause` image at `14x14`; `togglePause()` changes that same image object's texture from stop to resume and back instead of relying on a `▶` text glyph.
- Normal Aseprite-backed labels stay text-only: `일시정지 (P)`, `재개 (P)`, and `도주`.
- Texture-missing fallback keeps the previous `⏸`, `▶`, and `🏃` label glyph behavior.
- `battleUtilityButtonFrameQa=1` records `utilityButtonIcon.expectedTextureKeys`, `pauseIconTextureKey`, `pauseLabelLegacyGlyphPresent`, and `missingUtilityButtonIconKeys`.

Exit criteria:

- Unit tests verify the resume icon id, pause/resume texture-switch helper, missing-icon detector, QA payload fields, and the absence of legacy pause/resume glyphs in the icon-backed path.
- Browser QA confirms the pause icon starts as `skill_tg_stop_icon`, changes to `skill_mw_arrow_icon` after `P`, changes back to `skill_tg_stop_icon` after a second `P`, keeps labels text-only, and reports no warn/error console logs.
- Existing utility button frames, pause/resume keyboard behavior, flee callback, and texture-missing fallback behavior remain unchanged.

Current QA state:

- Phase 150 implementation started on 2026-06-14.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts -t "전투 일시정지 버튼은 pause/resume"` failed before implementation because `BattleUI.ts` did not define the resume icon id or the pause/resume icon texture-switch QA contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts -t "전투 일시정지 버튼은 pause/resume"` passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\spriteResourceManifest.test.ts` passes 93 tests across 3 files.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.
- Browser QA: `http://127.0.0.1:5175/?debugScene=battle&renderer=canvas&battleUtilityButtonFrameQa=1&class=ether_knight&qaRun=phase150-iab` reports `aeternaBattleUtilityButtonFrameQa.status=ready`, frame key `ui_frame_battle_utility_button`, `renderedFrameCount=2`, `expectedFrameCount=2`, `missingFrameKeys=[]`, `missingUtilityButtonIconKeys=[]`, `expectedTextureKeys=["skill_tg_stop_icon","skill_mw_arrow_icon","skill_vw_warp_icon"]`, `renderedIconCount=2`, `expectedRenderedIconCount=2`, initial `pauseIconTextureKey=skill_tg_stop_icon`, initial `pauseLabel=일시정지 (P)`, `fleeLabel=도주`, `pauseLabelLegacyGlyphPresent=false`, one visible canvas, and no warn/error console logs.
- Browser input QA: after a CUA canvas click, the first `P` changes `pauseIconTextureKey` to `skill_mw_arrow_icon` and `pauseLabel` to `재개 (P)`; a second `P` changes `pauseIconTextureKey` back to `skill_tg_stop_icon` and `pauseLabel` back to `일시정지 (P)`, with labels remaining text-only and no warn/error console logs.

## Phase 151: BattleScene Magic/Item Submenu Focus Icon Runtime Wiring

Runtime BattleScene submenu focus icon coverage:

- Submenu focus icon: `skill_mw_arrow.png` / texture key `skill_mw_arrow_icon`.

Production rule:

- `BattleScene.preload()` resolves `getSpriteResourceForSkillIcon('skill_mw_arrow')` for the magic/item submenu focus marker and avoids duplicate queueing when active-turn and command focus indicators already use the same texture key.
- `_showMagicSubMenu()` and `_showItemSubMenu()` render one `battle_submenu_focus_icon` image at `14x14` with nearest filtering before the legacy focus glyph fallback.
- Keyboard and pointer focus move the same icon between visible magic/item rows while each row label stays text-only.
- Texture-missing fallback keeps the previous `▶` prefix behavior, but normal Aseprite-backed rendering must not leave the legacy glyph in submenu labels.
- `battleSubMenuFocusIconQa=magic|item` opens a deterministic submenu in the offline `debugScene=battle` route and writes `aeternaBattleSubMenuFocusIconQa`.

Exit criteria:

- Unit tests verify the focus icon id, debug route parser, deterministic QA submenu open, render helper, object name, display size, nearest filtering, QA payload fields, and removal of direct legacy `▶` text assignment inside `_highlightSubMenu()`.
- Browser QA confirms one `skill_mw_arrow_icon` focus image renders in both magic and item submenus, labels have no legacy glyph, no focus icon keys are missing, and no warn/error console logs appear.
- Existing magic skill row icons, item row icon, cooldown/MP disabled labels, pointer hover, keyboard navigation, skill/item execution callbacks, and texture-missing fallback behavior remain unchanged.

Current QA state:

- Phase 151 implementation started on 2026-06-14.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "서브메뉴 focus"` failed before implementation because `BattleScene.ts` did not define `BATTLE_SUB_MENU_FOCUS_ICON_ID` or the submenu focus icon QA contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "서브메뉴 focus"` passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\uiFrameAssets.test.ts` passes 94 tests across 3 files.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.
- Browser QA, magic submenu: `http://127.0.0.1:5175/?debugScene=battle&renderer=canvas&battleSubMenuFocusIconQa=magic&class=ether_knight&qaRun=phase151-magic-iab` reports `aeternaBattleSubMenuFocusIconQa.status=ready`, `subMenuType=magic`, `itemCount=6`, `focusIcon.key=skill_mw_arrow_icon`, `path=assets/generated/ui/icons/skills/skill_mw_arrow.png`, one rendered `14x14` icon, `fallbackRendered=false`, `legacyGlyphPresent=false`, `missingBattleSubMenuFocusIconKeys=[]`, one visible canvas, and no warn/error console logs. After a CUA canvas click, `ArrowDown` moves `activeIndex` from `0` to `1` and moves the icon from `(8, 21)` to `(8, 45)`, with labels remaining text-only.
- Browser QA, item submenu: `http://127.0.0.1:5175/?debugScene=battle&renderer=canvas&battleSubMenuFocusIconQa=item&class=ether_knight&qaRun=phase151-item-iab` reports `aeternaBattleSubMenuFocusIconQa.status=ready`, `subMenuType=item`, `itemCount=1`, `focusIcon.key=skill_mw_arrow_icon`, `path=assets/generated/ui/icons/skills/skill_mw_arrow.png`, one rendered `14x14` icon at `(20, 40)`, `fallbackRendered=false`, `legacyGlyphPresent=false`, `missingBattleSubMenuFocusIconKeys=[]`, label `포션 (HP +100)` as text-only, one visible canvas, and no warn/error console logs. `ArrowDown` keeps `activeIndex=0` as expected for the single-row item submenu.

## Phase 152: BattleScene Victory Result Reward Icon Runtime Wiring

Runtime BattleScene victory result popup reward icon coverage:

- EXP reward icon: `skill_ek_passive.png` / texture key `skill_ek_passive_icon`.
- Loot title icon: `ITM-MAT-001.png` / texture key `icon_item_ITM-MAT_001`.

Production rule:

- `BattleScene.preload()` resolves `getSpriteResourceForSkillIcon('skill_ek_passive')` and `getItemIconResource({ itemIconId: 'ITM-MAT-001' })` for the victory result popup reward markers. The skill icon preload path tracks already queued class skill icons to avoid duplicate loader entries.
- `_showResultPopup()` renders `battle_result_exp_icon` and `battle_result_loot_icon` images at `18x18` with nearest filtering before the legacy glyph fallback.
- Normal Aseprite-backed labels stay text-only: `경험치: +N` and `전리품:`.
- Texture-missing fallback keeps the previous `✨ 경험치: +N` and `📦 전리품:` behavior.
- `battleResultFrameQa=victory` records `resultRewardIcon`, `rewardTitleLegacyGlyphPresent`, and `missingBattleResultRewardIconKeys` inside `aeternaBattleResultFrameQa`.

Exit criteria:

- Unit tests verify the reward icon ids, preload resolvers, render helper, object names, display size, nearest filtering, text-only labels, and QA payload fields.
- Browser QA confirms two reward icons render in the victory result popup, both are `18x18`, no reward icon keys are missing, and the EXP/loot labels have no legacy `✨`/`📦` glyphs.
- Existing result/defeat popup frames, gold reward text, loot row rendering, close button, Enter/ESC popup exit, and texture-missing fallback behavior remain unchanged.

Current QA state:

- Phase 152 implementation started on 2026-06-14.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "전투 결과 팝업 보상"` failed before implementation because `BattleScene.ts` did not define `BATTLE_RESULT_REWARD_ICON_IDS` or the reward icon QA contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "전투 결과 팝업 보상"` passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\uiFrameAssets.test.ts` passes 95 tests across 3 files.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.
- Browser QA: `http://127.0.0.1:5175/?debugScene=battle&renderer=canvas&battleResultFrameQa=victory&class=ether_knight&qaRun=phase152-iab` reports `aeternaBattleResultFrameQa.status=ready`, frame key `ui_frame_UI-INV-005-DEF`, `resultRewardIcon.expectedCount=2`, `renderedCount=2`, `expectedTextureKeys=["skill_ek_passive_icon","icon_item_ITM-MAT_001"]`, matching rendered texture keys, two `18x18` display sizes, `fallbackKinds=[]`, `missingBattleResultRewardIconKeys=[]`, `rewardTitleLegacyGlyphPresent=false`, one visible canvas, and no warn/error console logs.

## Phase 153: BattleScene Victory Result Title/Gold Reward Icon Runtime Wiring

Runtime BattleScene victory result popup reward icon coverage:

- Title reward icon: `skill_ek_ultimate.png` / texture key `skill_ek_ultimate_icon`.
- EXP reward icon: `skill_ek_passive.png` / texture key `skill_ek_passive_icon`.
- Gold reward icon: `ITM-MAT-002.png` / texture key `icon_item_ITM-MAT_002`.
- Loot title icon: `ITM-MAT-001.png` / texture key `icon_item_ITM-MAT_001`.

Production rule:

- `BattleScene.preload()` resolves all four reward icon kinds through `getBattleResultRewardIconResource()`, and tracks already queued skill icon keys to avoid duplicate loader entries.
- `_showResultPopup()` renders `battle_result_title_icon`, `battle_result_exp_icon`, `battle_result_gold_icon`, and `battle_result_loot_icon` at `18x18` with nearest filtering before legacy fallback.
- Normal Aseprite-backed labels stay text-only: `전투 결과`, `경험치: +N`, `골드: +N`, `전리품:`.
- Texture-missing fallback keeps the previous `🏆`, `✨`, `💰`, `📦` behavior.
- `battleResultFrameQa=victory` records `rewardLegacyGlyphPresent`, `rewardTitleLegacyGlyphPresent`, `resultRewardIcon`, and `missingBattleResultRewardIconKeys`.

Exit criteria:

- Unit tests verify icon ids, the shared result reward resolver, preload loop, render helper, object names, display size, nearest filtering, text-only labels, and QA payload fields.
- Browser QA confirms four reward icons render in the victory result popup, all are `18x18`, no reward icon keys are missing, reward labels have no legacy glyphs, and no warn/error console logs appear.
- Existing result/defeat popup frames, loot row rendering, close button, Enter/ESC popup exit, and texture-missing fallback behavior remain unchanged.

Current QA state:

- Phase 153 implementation started on 2026-06-14.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "전투 결과 팝업 보상"` failed before implementation because `BattleScene.ts` did not define the title/gold reward icon contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "전투 결과 팝업 보상"` passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\uiFrameAssets.test.ts` passes 95 tests across 3 files.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.
- Browser QA: `http://127.0.0.1:5175/?debugScene=battle&renderer=canvas&battleResultFrameQa=victory&class=ether_knight&qaRun=phase153-iab` reports `aeternaBattleResultFrameQa.status=ready`, frame key `ui_frame_UI-INV-005-DEF`, `resultRewardIcon.expectedCount=4`, `renderedCount=4`, `expectedTextureKeys=["skill_ek_ultimate_icon","skill_ek_passive_icon","icon_item_ITM-MAT_002","icon_item_ITM-MAT_001"]`, matching rendered texture keys, four `18x18` display sizes, `fallbackKinds=[]`, `missingBattleResultRewardIconKeys=[]`, `rewardLegacyGlyphPresent=false`, `rewardTitleLegacyGlyphPresent=false`, reward labels `전투 결과`, `경험치: +37`, `골드: +38`, `전리품:`, one visible canvas, and no warn/error console logs.

## Phase 154: BattleScene Defeat Result Title Icon Runtime Wiring

Runtime BattleScene defeat result popup icon coverage:

- Defeat title icon: `status_curse.png` / texture key `status_curse_icon`.

Production rule:

- `BattleScene.preload()` keeps using `preloadStatusIconResources(this)`, so the defeat title icon is loaded with the shared status icon library without a duplicate loader entry.
- `_showDefeatPopup()` renders one `battle_defeat_title_icon` image at `18x18` with nearest filtering before legacy fallback.
- Normal Aseprite-backed defeat title label stays text-only: `전투 실패`.
- Texture-missing fallback keeps the previous `💔 전투 실패` behavior.
- `battleResultFrameQa=defeat` records `defeatTitleIcon`, `defeatTitleLegacyGlyphPresent`, and `missingBattleDefeatTitleIconKeys`.

Exit criteria:

- Unit tests verify the status icon resource id, title icon constants, render helper, object name, display size, nearest filtering, text-only label, and QA payload fields.
- Browser QA confirms one defeat title icon renders in the defeat popup, is `18x18`, no defeat title icon key is missing, the title label has no legacy `💔` glyph, and no warn/error console logs appear.
- Existing victory reward icons, result/defeat popup frames, close button, Enter/ESC popup exit, and texture-missing fallback behavior remain unchanged.

Current QA state:

- Phase 154 implementation started on 2026-06-14.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "패배 팝업 title"` failed before implementation because `BattleScene.ts` did not define the defeat title icon contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "패배 팝업 title"` passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\uiFrameAssets.test.ts` passes 96 tests across 3 files.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.
- Browser QA: `http://127.0.0.1:5175/?debugScene=battle&renderer=canvas&battleResultFrameQa=defeat&class=ether_knight&qaRun=phase154-iab` reports `aeternaBattleResultFrameQa.status=ready`, frame key `ui_frame_UI-INV-006-DEF`, `defeatTitleIcon.expectedCount=1`, `renderedCount=1`, `expectedTextureKeys=["status_curse_icon"]`, matching rendered texture key, one `18x18` display size, `fallbackRendered=false`, `missingBattleDefeatTitleIconKeys=[]`, `defeatTitleLegacyGlyphPresent=false`, reward labels `전투 실패`, `[ 돌아가기 ] (Enter)`, one visible canvas, and no warn/error console logs.

## Phase 155: BattleScene Result Lead Banner Icon Runtime Wiring

Runtime BattleScene result lead banner icon coverage:

- Victory lead icon: `skill_ek_ultimate.png` / texture key `skill_ek_ultimate_icon`.
- Defeat lead icon: `status_curse.png` / texture key `status_curse_icon`.

Production rule:

- `_showVictory()` and `_showDefeat()` route through `_showBattleResultLeadBanner()`.
- `_showBattleResultLeadBanner()` renders one `battle_result_lead_<mode>_icon` image at `34x34` with nearest filtering before legacy fallback.
- Normal labels stay text-only: `Victory!`, `패배...`.
- Texture-missing fallback keeps previous `🎉 Victory!` and `💔 패배...`.
- `battleResultLeadQa=victory|defeat` records `battleResultLeadIcon`, `leadLegacyGlyphPresent`, and `missingBattleResultLeadIconKeys`.

Exit criteria:

- Unit tests verify icon ids, debug route parser, resolver, render helper, object names, display size, nearest filtering, text-only labels, and QA payload fields.
- Browser QA confirms victory/defeat lead icons render, both are `34x34`, no missing keys, no legacy glyphs, and no warn/error logs appear.
- Existing result/defeat popup frames, popup icon behavior, close button, Enter/ESC popup exit, victory sounds, defeat flash, and delayed popup timing remain unchanged.

Current QA state:

- Phase 155 implementation started on 2026-06-14.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "lead banner"` failed before implementation because `BattleScene.ts` did not define the lead banner icon contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "lead banner"` passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\uiFrameAssets.test.ts` passes 97 tests across 3 files.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.
- Browser QA: `battleResultLeadQa=victory` reports `status=ready`, `expectedTextureKeys=["skill_ek_ultimate_icon"]`, matching rendered texture key, one `34x34` display size, `fallbackRendered=false`, `leadLabel="Victory!"`, `leadLegacyGlyphPresent=false`, `missingBattleResultLeadIconKeys=[]`, one visible canvas, and no warn/error console logs. `battleResultLeadQa=defeat` reports `status=ready`, `expectedTextureKeys=["status_curse_icon"]`, matching rendered texture key, one `34x34` display size, `fallbackRendered=false`, `leadLabel="패배..."`, `leadLegacyGlyphPresent=false`, `missingBattleResultLeadIconKeys=[]`, one visible canvas, and no warn/error console logs.

## Phase 156: LobbyScene Gold HUD Icon Runtime Wiring

Runtime LobbyScene gold HUD icon coverage:

- Gold HUD icon: `ITM-MAT-002.png` / texture key `icon_item_ITM-MAT_002`.

Production rule:

- `LobbyScene.preload()` keeps using `preloadItemIconResources(this)`, so the material icon library loads the gold icon without a custom loader path.
- `_drawHud()` renders one `lobby_gold_icon` image at `18x18` with nearest filtering before legacy fallback.
- `_setGoldLabel()` keeps normal labels text-only: `999 Gold`, `<N> Gold`, or `--- Gold`.
- Texture-missing fallback keeps the previous `💰` prefix behavior.
- `goldIconQa=1` records `goldIcon`, `legacyGlyphPresent`, and `missingGoldIconKeys` inside `aeternaLobbyGoldIconQa`.

Exit criteria:

- Unit tests verify the material icon resource id, debug route parser, render object name, display size, nearest filtering, text-only label updater, and QA payload fields.
- Browser QA confirms one gold icon renders in the lobby HUD, is `18x18`, no gold icon key is missing, the gold label has no legacy `💰` glyph, and no warn/error console logs appear.
- Existing offline QA gold value, online gold fetch, shop purchase refresh, HUD text color, and texture-missing fallback behavior remain unchanged.

Current QA state:

- Phase 156 implementation started on 2026-06-14.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "gold HUD"` failed before implementation because `LobbyScene.ts` did not define the gold HUD icon contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "gold HUD"` passes after implementation.
- Typecheck: `npm --prefix client run typecheck` passes.
- Browser QA: `http://127.0.0.1:5175/?debugScene=lobby&renderer=canvas&goldIconQa=1&qaRun=phase156-gold-iab` reports `aeternaLobbyGoldIconQa.status=ready`, `goldIcon.key=icon_item_ITM-MAT_002`, path `assets/generated/ui/icons/items/ITM-MAT-002.png`, one `18x18` display size, `fallbackRendered=false`, `goldLabel="999 Gold"`, `legacyGlyphPresent=false`, `missingGoldIconKeys=[]`, one visible canvas, and no warn/error console logs.

## Phase 157: DungeonScene Clear Title Icon Runtime Wiring

Runtime DungeonScene clear title icon coverage:

- Clear title icon: `skill_ek_ultimate.png` / texture key `skill_ek_ultimate_icon`.

Production rule:

- `DungeonScene.preload()` resolves `getSpriteResourceForSkillIcon('skill_ek_ultimate')` for the clear title icon and avoids duplicate loader entries when other dungeon skill icons already queue the same texture key.
- `_showVictory()` renders one `dungeon_clear_title_icon` image at `26x26` with nearest filtering before legacy fallback.
- Normal Aseprite-backed clear title label stays text-only: `던전 클리어!`.
- Texture-missing fallback keeps the previous `🏆 던전 클리어!` behavior.
- `dungeonFrameQa=clear` records `clearTitleIcon`, `clearTitleLegacyGlyphPresent`, and `missingClearTitleIconKeys`.

Exit criteria:

- Unit tests verify the clear title icon id, preload route, render object name, display size, nearest filtering, text-only label, and QA payload fields.
- Browser QA confirms one clear title icon renders on the dungeon clear screen, is `26x26`, no clear title icon key is missing, the title label has no legacy `🏆` glyph, and no warn/error console logs appear.
- Existing dungeon status/reward frames, dungeon title/action icons, reward text, return button, keyboard return, and texture-missing fallback behavior remain unchanged.

Current QA state:

- Phase 157 implementation started on 2026-06-14.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts -t "클리어 타이틀"` failed before implementation because `DungeonScene.ts` did not define the clear title icon contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts -t "클리어 타이틀"` passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\uiFrameAssets.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts` passes 99 tests across 3 files.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.
- Browser QA: `http://127.0.0.1:5175/?debugScene=dungeon&renderer=canvas&dungeonFrameQa=clear&class=ether_knight&qaRun=phase157-clear-title-iab` reports `aeternaDungeonFrameQa.status=ready`, `mode=clear`, `clearTitleIcon.key=skill_ek_ultimate_icon`, path `assets/generated/ui/icons/skills/skill_ek_ultimate.png`, `displayWidth=26`, `displayHeight=26`, `fallbackRendered=false`, `clearTitleLegacyGlyphPresent=false`, `missingClearTitleIconKeys=[]`, one visible canvas, and no warn/error console logs.

## Phase 158: BattleScene Reflect Popup Icon Runtime Wiring

Runtime BattleScene reflect popup icon coverage:

- Reflect popup icon: `status_shield.png` / texture key `status_shield_icon`.

Production rule:

- `BattleScene.preload()` keeps using `preloadStatusIconResources(this)`, so the reflect popup icon is loaded with the shared status icon library without a duplicate loader entry.
- `_spawnReflectText()` renders one `battle_reflect_popup_icon` image at `18x18` with nearest filtering before legacy fallback.
- Normal Aseprite-backed reflect popup label stays text-only: `-N`.
- Texture-missing fallback keeps the previous `🛡 -N` behavior.
- `battleReflectPopupIconQa=1` records `reflectPopupIcon`, `legacyGlyphPresent`, and `missingBattleReflectPopupIconKeys`.

Exit criteria:

- Unit tests verify the shield icon id, debug route parser, render object name, display size, nearest filtering, text-only damage label, and QA payload fields.
- Browser QA confirms one reflect popup icon renders during a debug battle, is `18x18`, no reflect popup icon key is missing, the popup label has no legacy `🛡` glyph, and no warn/error console logs appear.
- Existing passive reflect damage calculation, attacker positioning, popup color, tween lifecycle, intro/result QA routes, and texture-missing fallback behavior remain unchanged.

Current QA state:

- Phase 158 implementation started on 2026-06-17.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "reflect popup"` failed before implementation because `BattleScene.ts` did not define the reflect popup icon contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "reflect popup"` passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\uiFrameAssets.test.ts` passes 100 tests across 3 files.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.
- Browser QA: `http://127.0.0.1:5175/?debugScene=battle&renderer=canvas&battleReflectPopupIconQa=1&class=ether_knight&qaRun=phase158-reflect-popup-iab` reports `aeternaBattleReflectPopupIconQa.status=ready`, `reflectPopupIcon.iconId=shield`, `expectedTextureKeys=["status_shield_icon"]`, matching rendered texture key, one `18x18` display size, `fallbackRendered=false`, `reflectPopupLabels=["-37"]`, `legacyGlyphPresent=false`, `missingBattleReflectPopupIconKeys=[]`, one visible canvas, and no warn/error console logs. Screenshot review confirms the battle scene rendered nonblank.

## Phase 159: BattleScene Echo Popup Icon Runtime Wiring

Runtime BattleScene echo popup icon coverage:

- Echo popup icon: `skill_mw_storm.png` / texture key `skill_mw_storm_icon`.

Production rule:

- `BattleScene.preload()` already loads `skill_mw_storm.png` through the combo-tech icon preload path, so the echo popup reuses the existing Aseprite skill icon without a duplicate loader entry.
- `_spawnEchoText()` renders one `battle_echo_popup_icon` image at `18x18` with nearest filtering before legacy fallback.
- Normal Aseprite-backed echo popup label stays text-only: `ECHO +N`.
- Texture-missing fallback keeps the previous `✨ ECHO +N` behavior.
- `battleEchoPopupIconQa=1` records `echoPopupIcon`, `legacyGlyphPresent`, and `missingBattleEchoPopupIconKeys`.

Exit criteria:

- Unit tests verify the storm icon id, debug route parser, render object name, display size, nearest filtering, text-only damage label, and QA payload fields.
- Browser QA confirms one echo popup icon renders during a debug battle, is `18x18`, no echo popup icon key is missing, the popup label has no legacy `✨` glyph, and no warn/error console logs appear.
- Existing critEcho damage calculation, popup color, attacker/target positioning, tween lifecycle, combo-tech button icon preload, and texture-missing fallback behavior remain unchanged.

Current QA state:

- Phase 159 implementation started on 2026-06-18.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "echo popup"` failed before implementation because `BattleScene.ts` did not define the echo popup icon contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "echo popup"` passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\uiFrameAssets.test.ts` passes 101 tests across 3 files.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.
- Browser QA: `http://127.0.0.1:5175/?debugScene=battle&renderer=canvas&battleEchoPopupIconQa=1&class=ether_knight&qaRun=phase159-echo-popup-iab` reports `aeternaBattleEchoPopupIconQa.status=ready`, `echoPopupIcon.iconId=skill_mw_storm`, `expectedTextureKeys=["skill_mw_storm_icon"]`, matching rendered texture key, one `18x18` display size, `fallbackRendered=false`, `echoPopupLabels=["ECHO +29"]`, `legacyGlyphPresent=false`, `missingBattleEchoPopupIconKeys=[]`, one visible canvas, and no warn/error console logs. Screenshot review confirms the battle scene rendered nonblank.

## Phase 160: BattleScene Critical Damage Popup Icon Runtime Wiring

Runtime BattleScene critical damage popup icon coverage:

- Critical popup icon: `skill_ek_explode.png` / texture key `skill_ek_explode_icon`.

Production rule:

- `BattleScene.preload()` loads `skill_ek_explode.png` through the shared skill icon preload queue and checks `queuedSkillIconKeys` to avoid duplicate loader entries when Ether Knight skill slots already preload the same texture.
- `_spawnDamageNumber()` renders one `battle_critical_popup_icon` image at `20x20` with nearest filtering before legacy fallback whenever the damage popup type is `critical`.
- Normal Aseprite-backed critical popup label stays text-only: `N`.
- Texture-missing fallback keeps the previous `💥N` behavior.
- `battleCriticalPopupIconQa=1` records `criticalPopupIcon`, `legacyGlyphPresent`, and `missingBattleCriticalPopupIconKeys`.

Exit criteria:

- Unit tests verify the explosion icon id, debug route parser, render object name, display size, nearest filtering, text-only critical damage label, duplicate preload guard, and QA payload fields.
- Browser QA confirms one critical popup icon renders during a debug battle, is `20x20`, no critical popup icon key is missing, the popup label has no legacy `💥` glyph, and no warn/error console logs appear.
- Existing normal/heal damage number labels, critical damage color/font size, tween lifecycle, hit VFX, critEcho/reflect popup routes, and texture-missing fallback behavior remain unchanged.

Current QA state:

- Phase 160 implementation started on 2026-06-18.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "critical damage popup"` failed before implementation because `BattleScene.ts` did not define the critical popup icon contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "critical damage popup"` passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\uiFrameAssets.test.ts` passes 102 tests across 3 files.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.
- Browser QA: `http://127.0.0.1:5175/?debugScene=battle&renderer=canvas&battleCriticalPopupIconQa=1&class=ether_knight&qaRun=phase160-critical-popup-iab` reports `aeternaBattleCriticalPopupIconQa.status=ready`, `criticalPopupIcon.iconId=skill_ek_explode`, `expectedTextureKeys=["skill_ek_explode_icon"]`, matching rendered texture key, one `20x20` display size, `fallbackRendered=false`, `criticalPopupLabels=["88"]`, `legacyGlyphPresent=false`, `missingBattleCriticalPopupIconKeys=[]`, one visible canvas, and no warn/error console logs. Screenshot review confirms the battle scene rendered nonblank.

## Phase 161: BattleScene CHAIN Label Icon Runtime Wiring

Runtime BattleScene CHAIN label icon coverage:

- Normal CHAIN label icon: `skill_mw_storm.png` / texture key `skill_mw_storm_icon`.
- MAX CHAIN label icon: `skill_ek_explode.png` / texture key `skill_ek_explode_icon`.

Production rule:

- `BattleScene.preload()` loads CHAIN label icons through the shared skill icon preload queue and checks `queuedSkillIconKeys` so `skill_mw_storm.png` and `skill_ek_explode.png` are not queued twice when combo buttons, skill slots, or critical popup paths already request them.
- `_renderChainLabel()` renders one `battle_chain_label_icon` image at `18x18` with nearest filtering before legacy fallback.
- Normal Aseprite-backed labels stay text-only: `CHAIN ×N` and `CHAIN ×N MAX`.
- Texture-missing fallback keeps the previous `🔥 CHAIN ×N` and `💥 CHAIN ×N MAX` behavior.
- `battleChainLabelIconQa=chain|max` records `chainLabelIcon`, `legacyGlyphPresent`, and `missingBattleChainLabelIconKeys`.

Exit criteria:

- Unit tests verify the storm/explosion icon ids, debug route parser, render object name, display size, nearest filtering, text-only CHAIN labels, duplicate preload guard, and QA payload fields.
- Browser QA confirms both normal and MAX CHAIN label icons render during a debug battle, each is `18x18`, no CHAIN label icon key is missing, labels have no legacy `🔥`/`💥` glyphs, and no warn/error console logs appear.
- Existing chain count/expiry, MAX chain accent color/font size, ComboUI hit counter update, server combat event handling, combo-tech button icon behavior, and texture-missing fallback behavior remain unchanged.

Current QA state:

- Phase 161 implementation started on 2026-06-18.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "CHAIN 라벨"` failed before implementation because `BattleScene.ts` did not define the CHAIN label icon contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "CHAIN 라벨"` passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\uiFrameAssets.test.ts` passes 103 tests across 3 files.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.
- Browser QA normal: `http://127.0.0.1:5175/?debugScene=battle&renderer=canvas&battleChainLabelIconQa=chain&class=ether_knight&qaRun=phase161-chain-label-chain-iab` reports `aeternaBattleChainLabelIconQa.status=ready`, `mode=chain`, `chainLabelIcon.iconId=skill_mw_storm`, `expectedTextureKeys=["skill_mw_storm_icon"]`, matching rendered texture key, one `18x18` display size, `fallbackRendered=false`, `chainLabelText="CHAIN ×2"`, `legacyGlyphPresent=false`, `missingBattleChainLabelIconKeys=[]`, one visible canvas, and no warn/error console logs.
- Browser QA MAX: `http://127.0.0.1:5175/?debugScene=battle&renderer=canvas&battleChainLabelIconQa=max&class=ether_knight&qaRun=phase161-chain-label-max-iab` reports `aeternaBattleChainLabelIconQa.status=ready`, `mode=max`, `chainLabelIcon.iconId=skill_ek_explode`, `expectedTextureKeys=["skill_ek_explode_icon"]`, matching rendered texture key, one `18x18` display size, `fallbackRendered=false`, `chainLabelText="CHAIN ×4 MAX"`, `legacyGlyphPresent=false`, `missingBattleChainLabelIconKeys=[]`, one visible canvas, and no warn/error console logs. Screenshot review confirms the battle scene rendered nonblank.

## Phase 162: BattleUI Log Highlight Icon Runtime Wiring

Runtime BattleUI log highlight icon coverage:

- Critical highlight icon: `skill_ek_explode.png` / texture key `skill_ek_explode_icon`.
- CHAIN/combo highlight icon: `skill_mw_storm.png` / texture key `skill_mw_storm_icon`.
- Victory highlight icon: `skill_ek_ultimate.png` / texture key `skill_ek_ultimate_icon`.
- Level-up highlight icon: `skill_ek_passive.png` / texture key `skill_ek_passive_icon`.

Production rule:

- `BattleScene.preload()` loads log highlight icons through the shared skill icon preload queue and checks `queuedSkillIconKeys` so existing skill slot, combo, critical popup, and result icon paths do not duplicate texture loads.
- `BattleUI.addLog()` infers a highlight icon from critical, CHAIN/combo, victory, and level-up messages, then renders one `battle_ui_log_highlight_icon` image at `16x16` with nearest filtering before legacy fallback.
- Normal Aseprite-backed highlight labels stay text-only: `CRIT 88`, `CHAIN ×2`, `승리!`, and `레벨 업`.
- Texture-missing fallback keeps the previous `💥`, `🔥`, `🎉`, `🆙`, and `⚡` glyph behavior.
- `battleLogHighlightIconQa=critical|chain|victory|level` records `logHighlightIcon`, `legacyGlyphPresent`, and `missingBattleLogHighlightIconKeys`.

Exit criteria:

- Unit tests verify the four highlight icon ids, preload loop, duplicate preload guard, render object name, display size, nearest filtering, text-only highlight labels, URL QA trigger, and QA payload fields.
- Browser QA confirms all four highlight icons render during a debug battle, each is `16x16`, no highlight icon key is missing, highlight labels have no legacy glyphs, and no warn/error console logs appear.
- Existing log panel frame rendering, normal log line history, color inference, fade tween lifecycle, death highlight text fallback, and texture-missing fallback behavior remain unchanged.

Current QA state:

- Phase 162 implementation started on 2026-06-18.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "log highlight"` failed before implementation because `BattleScene.ts` did not import/preload `BATTLE_LOG_HIGHLIGHT_ICON_IDS` and `BattleUI.ts` did not define the log highlight icon contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "log highlight"` passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\uiFrameAssets.test.ts` passes 104 tests across 3 files.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.
- Browser QA critical: `http://127.0.0.1:5175/?debugScene=battle&renderer=canvas&class=ether_knight&qaRun=phase162-log-highlight-critical&battleLogHighlightIconQa=critical` reports `aeternaBattleLogHighlightIconQa.status=ready`, `kind=critical`, `logHighlightIcon.iconId=skill_ek_explode`, `expectedTextureKeys=["skill_ek_explode_icon"]`, matching rendered texture key, one `16x16` display size, `fallbackRendered=false`, `highlightText="CRIT 88"`, `legacyGlyphPresent=false`, `missingBattleLogHighlightIconKeys=[]`, one visible canvas, and no warn/error console logs.
- Browser QA chain: `http://127.0.0.1:5175/?debugScene=battle&renderer=canvas&class=ether_knight&qaRun=phase162-log-highlight-chain&battleLogHighlightIconQa=chain` reports `aeternaBattleLogHighlightIconQa.status=ready`, `kind=chain`, `logHighlightIcon.iconId=skill_mw_storm`, `expectedTextureKeys=["skill_mw_storm_icon"]`, matching rendered texture key, one `16x16` display size, `fallbackRendered=false`, `highlightText="CHAIN ×2"`, `legacyGlyphPresent=false`, `missingBattleLogHighlightIconKeys=[]`, one visible canvas, and no warn/error console logs.
- Browser QA victory: `http://127.0.0.1:5175/?debugScene=battle&renderer=canvas&class=ether_knight&qaRun=phase162-log-highlight-victory&battleLogHighlightIconQa=victory` reports `aeternaBattleLogHighlightIconQa.status=ready`, `kind=victory`, `logHighlightIcon.iconId=skill_ek_ultimate`, `expectedTextureKeys=["skill_ek_ultimate_icon"]`, matching rendered texture key, one `16x16` display size, `fallbackRendered=false`, `highlightText="승리!"`, `legacyGlyphPresent=false`, `missingBattleLogHighlightIconKeys=[]`, one visible canvas, and no warn/error console logs.
- Browser QA level: `http://127.0.0.1:5175/?debugScene=battle&renderer=canvas&class=ether_knight&qaRun=phase162-log-highlight-level&battleLogHighlightIconQa=level` reports `aeternaBattleLogHighlightIconQa.status=ready`, `kind=level`, `logHighlightIcon.iconId=skill_ek_passive`, `expectedTextureKeys=["skill_ek_passive_icon"]`, matching rendered texture key, one `16x16` display size, `fallbackRendered=false`, `highlightText="레벨 업"`, `legacyGlyphPresent=false`, `missingBattleLogHighlightIconKeys=[]`, one visible canvas, and no warn/error console logs. Screenshot review confirms the battle scene rendered nonblank.

## Phase 163: ComboUI Combo Achieved Icon Runtime Wiring

Runtime ComboUI combo achieved icon coverage:

- Combo achieved icon: `skill_mw_storm.png` / texture key `skill_mw_storm_icon`.

Production rule:

- `preloadComboUiFrameTextures()` loads `skill_mw_storm.png` alongside the existing chain gauge frame texture.
- `ComboUI.showComboAchieved()` renders one `combo_ui_achieved_icon` image at `28x28` with nearest filtering before the combo label.
- Normal Aseprite-backed combo achieved label stays text-only: `전격 강타!`.
- Texture-missing fallback keeps the previous `🔥 전격 강타!` glyph behavior.
- `comboFrameQa=1` records `comboAchievedIcon`, `comboTextLegacyGlyphPresent`, and `missingComboAchievedIconKeys`.

Exit criteria:

- Unit tests verify the combo achieved icon id, preload call, render object name, display size, nearest filtering, text-only normal label, glyph fallback contract, and QA payload fields.
- Browser QA confirms the combo achieved icon renders during the visible combo label window, is `28x28`, no icon key is missing, the combo label has no legacy flame glyph, and no warn/error console logs appear.
- Existing chain gauge frame rendering, hit counter, multiplier, gauge decay, hint rows, screen shake setting, fade tween lifecycle, and texture-missing fallback behavior remain unchanged.

Current QA state:

- Phase 163 implementation started on 2026-06-18.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts -t "콤보 달성"` failed before implementation because `ComboUI.ts` did not import/preload/render the combo achieved skill icon.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts -t "콤보 달성"` passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\uiFrameAssets.test.ts` passes 105 tests across 3 files.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.
- Browser QA: `http://127.0.0.1:5175/?debugScene=combo&renderer=canvas&comboFrameQa=1&qaRun=phase163-combo-achieved-icon-fast` reports `aeternaComboFrameQa.status=ready`, `comboAchievedIcon.iconId=skill_mw_storm`, `expectedTextureKeys=["skill_mw_storm_icon"]`, matching rendered texture key, one `28x28` display size, `fallbackRendered=false`, `comboText="전격 강타!"`, `comboTextLegacyGlyphPresent=false`, `missingComboAchievedIconKeys=[]`, one visible canvas, and no warn/error console logs.

## Phase 164: SettingsScene Focus Icon Runtime Wiring

Runtime SettingsScene focus icon coverage:

- Settings item focus marker: `skill_mw_arrow.png` / texture key `skill_mw_arrow_icon`.

Production rule:

- `SettingsScene.preload()` queues the focus icon through the shared settings skill icon preload helper and de-duplicates it against the existing feedback action icon.
- `SettingsScene` keeps one shared `settings_focus_icon` image and moves it beside the highlighted slider/toggle/cycle label instead of allocating one icon per item.
- Normal Aseprite-backed setting labels stay text-only and do not include the legacy `▶` prefix.
- Texture-missing fallback keeps the previous `▶` prefix behavior.
- `settingsFrameQa=1` records `settingsFocusIcon`, `settingsFocusLabelLegacyGlyphPresent`, and `missingSettingsFocusIconKeys`.

Exit criteria:

- Unit tests verify the focus icon id, duplicate-safe preload helper, shared image object name, display size, nearest filtering, label fallback contract, QA payload fields, and removal of direct `highlighted ? '▶ '` assignments from SettingsScene label render paths.
- Browser QA confirms the focus icon renders on the initial highlighted setting item, is `14x14`, no focus icon key is missing, setting labels have no legacy focus prefix, and no warn/error console logs appear.
- Existing settings panel/action button/slider frame rendering, action button icons, slider fill bars, toggle/cycle values, keyboard navigation, feedback launch, back navigation, and settings persistence remain unchanged.

Current QA state:

- Phase 164 implementation started on 2026-06-18.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts -t "SettingsScene 설정 항목 focus"` failed before implementation because `SettingsScene.ts` did not define/preload/render the focus icon contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts -t "SettingsScene 설정 항목 focus"` passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\uiFrameAssets.test.ts` passes 106 tests across 3 files.
- Typecheck: `npm --prefix client run typecheck` passes.
- Browser QA: `http://127.0.0.1:5175/?debugScene=settings&renderer=canvas&settingsFrameQa=1&qaRun=phase164-settings-focus-iab` reports `aeternaSettingsFrameQa.status=ready`, `settingsFocusIcon.iconId=skill_mw_arrow`, `expectedTextureKey=skill_mw_arrow_icon`, matching rendered texture key, one `14x14` display size, `fallbackRendered=false`, `settingsFocusLabelLegacyGlyphPresent=false`, `missingSettingsFocusIconKeys=[]`, one visible canvas, and no warn/error console logs.

## Phase 165: WorldScene Action Button Label QA Contract

Runtime WorldScene action button label coverage:

- Action button icons: `skill_tg_reverse.png`, `skill_tg_haste.png`, `skill_mw_arrow.png`; the previous-era and town-back buttons both use `skill_tg_reverse.png`.

Production rule:

- `WorldScene` tracks active action button text objects alongside the existing action button frame/icon arrays.
- Aseprite-backed action buttons keep label text free of legacy direction glyphs: `[Q]`, `[E]`, `마을로 돌아가기 (ESC)`, `시간 이동 (Enter)`.
- `WorldActionButtonOptions.fallbackLabel` keeps the previous `◀`, `▶`, and `←` label behavior only when the icon texture is missing.
- `worldFrameQa=1` records `actionButtonText.labels` and `actionButtonText.legacyGlyphPresent` alongside `actionButtonIcon`.

Exit criteria:

- Unit tests verify the action button text tracking field, active text filtering, legacy glyph detection regex, and QA payload fields.
- Browser QA confirms all four action button icons render, no action icon key is missing, action labels are text-only, one canvas is visible, and no warn/error console logs appear.
- Existing background, title icon, action button frame, locked zone icon, selected zone panel icon, encounter line icon, and player marker avatar QA contracts remain unchanged.

Current QA state:

- Phase 165 implementation started on 2026-06-18.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "WorldScene action buttons"` failed before implementation because `WorldScene.ts` did not expose action button text tracking or the `actionButtonText` QA payload.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "WorldScene action buttons"` passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\uiFrameAssets.test.ts` passes 106 tests across 3 files.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.
- Browser QA: `http://127.0.0.1:5175/?debugScene=world&renderer=canvas&worldFrameQa=1&qaRun=phase165-world-action-label-iab` reports `aeternaWorldFrameQa.status=ready`, `actionButtonIcon.renderedCount=4`, `expectedCount=4`, `missingIconTextureKeys=[]`, labels `[Q]`, `[E]`, `마을로 돌아가기 (ESC)`, `시간 이동 (Enter)`, `actionButtonText.legacyGlyphPresent=false`, one visible canvas, and no warn/error console logs.

## Phase 166: FeedbackForm Type Focus Icon Runtime Wiring

Runtime FeedbackForm type focus icon coverage:

- Type focus marker: `skill_mw_arrow.png` / texture key `skill_mw_arrow_icon`.

Production rule:

- `FeedbackForm.preload()` queues the type focus icon alongside the existing panel/button frames, title/submit/close skill icons, and five type status icons.
- `FeedbackForm` keeps one shared `feedback_form_type_focus_icon` image and moves it beside the focused type button instead of writing `▶` into the button label.
- Normal Aseprite-backed type labels stay text-only: `버그`, `기능`, `밸런스`, `UX`, `기타`.
- Texture-missing fallback keeps the previous `▶` prefix behavior.
- `?debugScene=feedback&renderer=canvas` records `typeFocusIcon`, `typeFocusIcon.labels`, `typeFocusIcon.legacyGlyphPresent`, and `missingTypeFocusIconKeys`.

Exit criteria:

- Unit tests verify the focus icon id, preload call, shared image object name, display size, nearest filtering, focus movement helper, label tracking, QA payload fields, and removal of direct `btn.setText(a ? \`▶ ${baseLabel}\` : baseLabel)` assignment.
- Browser QA confirms the type focus icon renders at `14x14`, no type focus icon key is missing, type labels have no legacy focus prefix, one canvas and two input controls are visible, and no warn/error console logs appear.
- Existing feedback panel/button frame rendering, title/submit/close icons, type status icons, selected type restart flow, submit/close callbacks, HTML input/textarea behavior, and frame QA contract remain unchanged.

Current QA state:

- Phase 166 implementation started on 2026-06-18.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts -t "피드백 폼 panel"` failed before implementation because `FeedbackForm.ts` did not define/preload/render the type focus icon contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts -t "피드백 폼 panel"` passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\spriteResourceManifest.test.ts` passes 106 tests across 3 files.
- Typecheck: `npm --prefix client run typecheck` passes.
- Browser QA: `http://127.0.0.1:5175/?debugScene=feedback&renderer=canvas&qaRun=phase166-feedback-type-focus-iab` reports `aeternaFeedbackFrameQa.status=ready`, `typeFocusIcon.iconId=skill_mw_arrow`, `expectedKey=skill_mw_arrow_icon`, matching rendered texture key, one visible `14x14` display size, `fallbackRendered=false`, labels `버그`, `기능`, `밸런스`, `UX`, `기타`, `legacyGlyphPresent=false`, `missingTypeFocusIconKeys=[]`, one visible canvas, two visible input controls, and no warn/error console logs.

## Phase 167: EffectManager Damage Text Icon Pool Wiring

Runtime EffectManager damage/dual-tech text icon coverage:

- Critical damage text icon: `skill_ek_explode.png` / texture key `skill_ek_explode_icon`.
- Dual Tech name text icon: `skill_mw_storm.png` / texture key `skill_mw_storm_icon`.

Production rule:

- `preloadEffectTextIconResources(scene, queuedTextureKeys)` queues the two skill icon PNGs and shares `BattleScene`'s existing queued skill icon set so the loader does not receive duplicate texture keys.
- `DamageTextItem` owns one pooled `Phaser.GameObjects.Image` alongside its pooled text object.
- `spawnDamageText(..., isCritical=true)` displays the damage number as text only and attaches the pooled `skill_ek_explode_icon` image.
- `spawnDualTechEffect()` displays the tech name as text only and attaches the pooled `skill_mw_storm_icon` image.
- Icon position, alpha, depth, visibility, and reset state follow the existing damage text update/release path to avoid per-popup allocations.

Exit criteria:

- Unit tests verify the skill icon ids, duplicate-safe preload helper, pooled image field, icon set/hide helpers, removal of direct `💥${damage}` and `✨ ${techName}` text assignment, and `BattleScene.preload()` integration.
- Related EffectManager fallback texture coverage still verifies Aseprite fallback PNG dimensions, JSON frame metadata, roster entries, and procedural fallback safety.
- Typecheck and client build continue to pass.

Current QA state:

- Phase 167 implementation started on 2026-06-18.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\effectFallbackTextureAssets.test.ts -t "EffectManager damage/dual-tech"` failed before implementation because `EffectManager.ts` did not import `getSpriteResourceForSkillIcon` or define the damage text icon preload/render contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\effectFallbackTextureAssets.test.ts -t "EffectManager damage/dual-tech"` passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\effectFallbackTextureAssets.test.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\uiFrameAssets.test.ts` passes 108 tests across 4 files.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.

## Phase 168: LoadingScene Tip Icon Runtime Wiring

Runtime LoadingScene tip icon coverage:

- Loading tip icon: `skill_mw_bolt.png` / texture key `skill_mw_bolt_icon`.

Production rule:

- `LoadingScene.preload()` queues the tip icon during Phase 1 together with the loading background and UI frame textures so the first loading UI can render it before the bulk AssetManager queue starts.
- `_addLoadingTipIcon()` renders one `loading_tip_icon` image at `18x18` with nearest filtering when the texture is available.
- `_showRandomTip()` keeps tip text free of the legacy `💡` prefix when the Aseprite icon is active.
- Texture-missing fallback keeps the previous `💡` prefix behavior.
- `?debugScene=loading&renderer=canvas` records `aeternaLoadingFrameQa.tipIcon`, `tipIcon.legacyGlyphPresent`, and `missingTipIconKeys`.

Exit criteria:

- Unit tests verify the tip icon id, preload path, runtime image object name, display size, nearest filtering, text fallback contract, QA payload fields, and removal of direct `this.tipText?.setText(\`💡 ${tip}\`)`.
- Existing LoadingScene panel/progress frame, qaHold route, progress fill, loading dots, AssetManager queue, SoundManager preload, and transition behavior remain unchanged.
- Typecheck and client build continue to pass.

Current QA state:

- Phase 168 implementation started on 2026-06-18.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts -t "로딩 화면 panel"` failed before implementation because `LoadingScene.ts` did not import `getSpriteResourceForSkillIcon` or define the tip icon preload/render contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts -t "로딩 화면 panel"` passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts tests\unit\effectFallbackTextureAssets.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\spriteResourceManifest.test.ts` passes 108 tests across 4 files.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.

## Phase 169: CharacterSelect Logout Icon Runtime Wiring

Runtime CharacterSelect logout icon coverage:

- Logout direction/action icon: `skill_tg_reverse.png` / texture key `skill_tg_reverse_icon`.

Production rule:

- `CharacterSelectScene.preload()` queues `skill_tg_reverse_icon` through `spriteResourceManifest`.
- `_addLogoutButton()` renders one `character_select_logout_icon` image at `16x16` with nearest filtering when the texture is available.
- Normal Aseprite-backed logout label stays text-only: `로그아웃`.
- Texture-missing fallback keeps the previous `← 로그아웃` behavior.
- `?debugScene=characterSelect&renderer=canvas&characterSelectFrameQa=1` records `logoutIcon`, `logoutIcon.legacyGlyphPresent`, and `missingLogoutIconKeys`.

Exit criteria:

- Unit tests verify the icon id, preload path, runtime image object name, display size, nearest filtering, text-only label, fallback label, QA payload fields, and existing CharacterSelect card/input/action/existing-avatar frame contracts.
- Existing character selection, create-mode class cards, DOM name input, action button frame, validation error text, keyboard navigation, API selection flow, and existing avatar image contract remain unchanged.
- Typecheck and client build continue to pass.

Current QA state:

- Phase 169 implementation started on 2026-06-18.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts -t "캐릭터 선택"` failed before implementation because `CharacterSelectScene.ts` did not import `getSpriteResourceForSkillIcon` or define the logout icon preload/render contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts -t "캐릭터 선택"` passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts tests\unit\effectFallbackTextureAssets.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\spriteResourceManifest.test.ts` passes 108 tests across 4 files.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.

## Phase 170: WorldScene Action Button Fallback Label Split

Runtime WorldScene action button glyph isolation coverage:

- Previous-era icon: `skill_tg_reverse.png` / texture key `skill_tg_reverse_icon`.
- Town-back icon: `skill_tg_reverse.png` / texture key `skill_tg_reverse_icon`.
- Next-era icon: `skill_tg_haste.png` / texture key `skill_tg_haste_icon`.
- Travel icon: `skill_mw_arrow.png` / texture key `skill_mw_arrow_icon`.

Production rule:

- `WorldActionButtonOptions.fallbackLabel` separates normal text labels from legacy symbol fallback labels.
- Normal Aseprite-backed action labels stay text-only: `[Q]`, `[E]`, `마을로 돌아가기 (ESC)`, `시간 이동 (Enter)`.
- Texture-missing fallback keeps the previous `[Q] ◀`, `▶ [E]`, `← 마을로 돌아가기 (ESC)`, and `▶ [ 시간 이동 ] (Enter)` labels.
- Town-back now uses `skill_tg_reverse` instead of `skill_vw_warp` so its action semantics match the reverse/back affordance.
- `WorldScene.preload()` uses a queued texture-key set so the shared `skill_tg_reverse_icon` is not queued twice.

Exit criteria:

- Unit tests verify the back icon id, fallback label option, duplicate-safe action icon preload set, text-only normal labels, legacy fallback labels, and text label selection expression.
- Existing world frame, title icon, action icon count, locked zone icon, selected zone panel icon, encounter line icon, player marker avatar, background image, keyboard shortcut, and travel callback contracts remain unchanged.

Current QA state:

- Phase 170 implementation started on 2026-06-18.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "WorldScene action buttons"` failed before implementation because `WorldScene.ts` still mapped `back` to `skill_vw_warp` and did not define `fallbackLabel` or duplicate-safe action icon queuing.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "WorldScene action buttons"` passes after implementation.

## Phase 171: ZoneTeleport Action Button Icon Runtime Wiring

Runtime ZoneTeleport action button icon coverage:

- Move action icon: `skill_mw_arrow.png` / texture key `skill_mw_arrow_icon`.
- Cancel action icon: `skill_tg_reverse.png` / texture key `skill_tg_reverse_icon`.

Production rule:

- `preloadZoneTeleportUiFrameTextures()` queues the portal title icon and both action button icons through one duplicate-safe `queuedIconKeys` set.
- `_addPortalButton()` now accepts an action id, text-only label, and bracket fallback label.
- When the action icon texture is present, portal buttons render a `16x16` nearest-filtered image and keep labels as `이동` / `취소`.
- When the action icon texture is missing, the button falls back to the previous `[ 이동 ]` / `[ 취소 ]` bracket labels.
- Hover/click hit areas remain transparent Phaser rectangles, so teleport and cancel callbacks keep the existing behavior.
- `zoneTeleportFrameQa=1` records `actionButtonIcon`, `missingActionIconKeys`, and `fallbackActionIconIds` in addition to the existing panel/button/title icon state.

Exit criteria:

- Unit tests verify the action icon id map, duplicate-safe preload queue, action icon render path, fallback labels, QA probe fields, and legacy move-button call removal.
- Existing ZoneTeleport panel frame, button frame, title icon, portal metadata, target-zone label, hit area, hover color, and teleport callback contracts remain unchanged.

Current QA state:

- Phase 171 implementation started on 2026-06-18.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts -t "필드 포탈 이동/취소 버튼"` failed before implementation because `ZoneTeleportManager.ts` did not define the action icon id map or action icon render/QA contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts -t "필드 포탈 이동/취소 버튼"` passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts` passes with 107 tests across 3 files.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.

## Phase 172: DungeonScene Nav Action Icon Runtime Wiring

Runtime DungeonScene navigation action icon coverage:

- Exit action icon: `skill_tg_reverse.png` / texture key `skill_tg_reverse_icon`.
- Clear-return action icon: `skill_tg_reverse.png` / texture key `skill_tg_reverse_icon`.

Production rule:

- `DungeonScene.preload()` queues `DUNGEON_NAV_ACTION_ICON_IDS` through one duplicate-safe `queuedNavActionIconKeys` set so exit and return do not enqueue the shared reverse texture twice.
- The bottom exit action renders `dungeon_exit_action_icon` at `16x16` with nearest filtering and keeps the visible label as `퇴장 (ESC)` when the texture is present.
- The clear return action renders `dungeon_return_action_icon` at `18x18` with nearest filtering and keeps the visible label as `로비로 복귀` when the texture is present.
- Texture-missing fallback keeps the previous `← 퇴장 (ESC)` and `[ 로비로 복귀 ]` labels.
- `dungeonFrameQa=ready|clear` records `exitActionIcon`, `returnActionIcon`, `missingExitActionIconKeys`, `missingReturnActionIconKeys`, `exitActionLegacyGlyphPresent`, and `returnActionLegacyGlyphPresent` in addition to existing dungeon frame/title/action icon state.

Exit criteria:

- Unit tests verify the nav action icon id map, duplicate-safe preload queue, runtime image object fields, icon helper, text-only normal labels, legacy fallback labels, QA probe fields, and removal of direct legacy button creation strings.
- Existing Dungeon status/reward frames, title/action/clear-title icons, wave start flow, ESC/Enter/Space navigation, return callback, reward text, and texture-missing fallback behavior remain unchanged.

Current QA state:

- Phase 172 implementation started on 2026-06-18.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts -t "던전 퇴장과 클리어 복귀"` failed before implementation because `DungeonScene.ts` did not define `DUNGEON_NAV_ACTION_ICON_IDS` or the nav action icon render/QA contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts -t "던전 퇴장과 클리어 복귀"` passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts` passes with 108 tests across 3 files.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.

## Phase 173: DungeonScene Boss Warning Icon Runtime Wiring

Runtime DungeonScene boss warning icon coverage:

- Boss warning icon: `skill_ek_explode.png` / texture key `skill_ek_explode_icon`.

Production rule:

- `DungeonScene.preload()` queues `DUNGEON_BOSS_WARNING_ICON_ID` through `spriteResourceManifest`.
- `_showBossWarning()` renders `dungeon_boss_warning_icon` at `30x30` with nearest filtering when the texture is present.
- Normal Aseprite-backed warning label stays text-only: `WARNING\n보스 등장!`.
- Texture-missing fallback keeps the previous `⚠ WARNING ⚠\n보스 등장!` label.
- `dungeonFrameQa=boss` opens the boss-warning state directly and records `bossWarningIcon`, `bossWarningLegacyGlyphPresent`, and `missingBossWarningIconKeys`.

Exit criteria:

- Unit tests verify the boss warning icon id, preload path, debug route parser, direct boss QA mode, runtime image object, display size, nearest filtering, text-only label, fallback label, QA payload fields, and removal of the direct warning-glyph text creation string.
- Existing Dungeon status/reward frames, title/action/clear-title icons, nav action icons, normal wave start, boss callback, SFX, flash tween, and texture-missing fallback behavior remain unchanged.

Current QA state:

- Phase 173 implementation started on 2026-06-18.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts -t "던전 보스 경고"` failed before implementation because `DungeonScene.ts` did not define `DUNGEON_BOSS_WARNING_ICON_ID` or the boss warning icon render/QA contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts -t "던전 보스 경고"` passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts` passes with 109 tests across 3 files.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.

## Phase 174: BattleScene Boss Telegraph Icon Runtime Wiring

Runtime BattleScene boss telegraph icon coverage:

- Boss telegraph icon: `skill_ek_explode.png` / texture key `skill_ek_explode_icon`.

Production rule:

- `BattleScene.preload()` resolves `BATTLE_BOSS_TELEGRAPH_ICON_ID` through `getSpriteResourceForSkillIcon('skill_ek_explode')` and shares the existing `queuedSkillIconKeys` set so the critical-popup path and boss-telegraph path do not enqueue the same texture twice.
- `_showBossTelegraph()` renders `battle_boss_telegraph_icon` at `30x30` with nearest filtering when the texture is present.
- Red tint, warning SFX, battle log, delayed strong strike, reduce-motion gating for pulse tweens, and boss-death/target-retarget behavior remain unchanged.
- Texture-missing fallback keeps the previous `⚠` warning text.

Exit criteria:

- Unit tests verify the boss telegraph icon id, display size, duplicate-safe preload path, runtime image object, nearest filtering, fallback text containment, and removal of direct text-warning creation from the normal render path.
- Existing boss strong-attack cadence, 1.6x multiplier, retargeting during telegraph delay, cleanup behavior, critical popup icon path, CHAIN label path, and skill icon loader de-duplication remain unchanged.

Current QA state:

- Phase 174 implementation started on 2026-06-18.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\bossTelegraph.test.ts -t "Aseprite 아이콘"` failed before implementation because `BattleScene.ts` did not define `BATTLE_BOSS_TELEGRAPH_ICON_ID` or the Aseprite boss telegraph render contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\bossTelegraph.test.ts -t "Aseprite 아이콘"` passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\bossTelegraph.test.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts` passes with 76 tests across 3 files.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.

## Phase 175: BattleScene Target Cursor Icon Runtime Wiring

Runtime BattleScene target cursor icon coverage:

- Target cursor icon: `skill_mw_arrow.png` / texture key `skill_mw_arrow_icon`.

Production rule:

- `BattleScene.preload()` resolves `BATTLE_TARGET_CURSOR_ICON_ID` through `getSpriteResourceForSkillIcon('skill_mw_arrow')` and skips duplicate loader entries when the active-turn, command-focus, or submenu-focus path already queues the same texture.
- `_drawTargetCursor()` renders `battle_target_cursor_icon` at `24x24` with nearest filtering and a 90-degree rotation when the texture is present.
- Target selection state, keyboard cycling, pointer target confirmation, expected damage/KILL preview text, and cancel/confirm cleanup behavior remain unchanged.
- Texture-missing fallback keeps the previous `Graphics.strokeTriangle()` target marker.

Exit criteria:

- Unit tests verify the target cursor icon id, display size, duplicate-safe preload checks, runtime image object, rotation, nearest filtering, image-first draw path, cleanup hiding, and procedural triangle fallback isolation.
- Existing active-turn indicator, command focus, submenu focus, target cycling, target confirmation, damage preview, and fallback behavior remain unchanged.

Current QA state:

- Phase 175 implementation started on 2026-06-18.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "타겟 선택 커서"` failed before implementation because `BattleScene.ts` did not define `BATTLE_TARGET_CURSOR_ICON_ID` or the Aseprite target cursor render contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "타겟 선택 커서"` passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\bossTelegraph.test.ts` passes with 77 tests across 3 files.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.

## Phase 176: BattleScene Status Panel HP Critical Icon Runtime Wiring

Runtime BattleScene status panel HP critical icon coverage:

- HP critical icon: `status_bleed.png` / texture key `status_bleed_icon`.

Production rule:

- `BattleScene.preload()` already queues all status icons through `preloadStatusIconResources(this)`, so the HP critical marker reuses the existing status icon preload contract.
- `_createStatusPanel()` creates `battle_hp_critical_icon_<unitId>` at `12x12` with nearest filtering when `status_bleed_icon` exists.
- `_updateStatusPanel()` shows that image when HP is below 25% and keeps the HP label as plain `HP current/max` on the normal texture-backed path.
- Texture-missing or inactive-image fallback keeps the previous `⚠ HP current/max` text prefix.

Exit criteria:

- Unit tests verify the `bleed` status icon manifest entry, HP critical icon id/size constants, runtime image object field, image creation name, display size, nearest filtering, HP text x-offset, visibility update, and glyph fallback isolation.
- Existing HP/MP text updates, HP/MP bar drawing, ATB bar drawing, status panel layout, and status icon preload behavior remain unchanged.

Current QA state:

- Phase 176 implementation started on 2026-06-18.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "HP 위험"` failed before implementation because `BattleScene.ts` did not define `BATTLE_HP_CRITICAL_ICON_ID` or the Aseprite HP critical icon render contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "HP 위험"` passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\bossTelegraph.test.ts` passes with 78 tests across 3 files.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.

## Phase 177: MainMenuScene Focus Icon Runtime Wiring

Runtime MainMenuScene focus icon coverage:

- Menu focus icon: `skill_mw_arrow.png` / texture key `skill_mw_arrow_icon`.

Production rule:

- `MainMenuScene.preload()` resolves `MAIN_MENU_FOCUS_ICON_ID` through `getSpriteResourceForSkillIcon('skill_mw_arrow')` and skips duplicate loader entries when the menu button icon path already queues the same texture.
- `create()` creates one `main_menu_focus_icon` at `14x14` with nearest filtering and places it to the left of the active menu button.
- `_setMenuHighlight()` and `_syncMenuButtonFrames()` move the same image object as the keyboard/pointer focus index changes.
- Texture-missing fallback keeps the previous `▶` label prefix path.
- `mainMenuFrameQa=1` records `menuFocusIcon`, `missingMenuFocusIconKeys`, and `menuLabelLegacyGlyphPresent` with the existing menu frame/button icon state.

Exit criteria:

- Unit tests verify the focus icon id/size/offset constants, duplicate-safe preload path, runtime image object field, image name, display size, nearest filtering, label fallback isolation, sync position, and QA payload fields.
- Existing title background, menu button frames, button internal icons, login/credits modal frames, DOM input frames, modal close icons, keyboard focus ring, pointer activation, and auth flow remain unchanged.

Current QA state:

- Phase 177 implementation started on 2026-06-18.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\mainMenuAsepriteAssets.test.ts -t "메인 메뉴 배경"` failed before implementation because `MainMenuScene.ts` did not define `MAIN_MENU_FOCUS_ICON_ID` or the Aseprite focus icon render contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\mainMenuAsepriteAssets.test.ts -t "메인 메뉴 배경"` passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\mainMenuAsepriteAssets.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\uiFrameAssets.test.ts` passes with 40 tests across 3 files.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.

## Phase 178: GameScene Error Screen Icon Runtime Wiring

Runtime GameScene error screen title icon coverage:

- Error title icon: `skill_ek_explode.png` / texture key `skill_ek_explode_icon`.

Production rule:

- `GameScene.preload()` resolves `GAME_SCENE_ERROR_ICON_ID` through `getSpriteResourceForSkillIcon('skill_ek_explode')`.
- `create()` supports `gameErrorIconQa=1` by opening the deterministic error screen directly through `_showErrorScreen(new Error('QA error screen probe'))`.
- `_showErrorScreen()` renders `game_scene_error_title_icon` at `22x22` with nearest filtering when the texture is present.
- The normal error title text is `존 로딩 실패`; texture-missing fallback keeps the previous `⚠️ 존 로딩 실패` label.
- `gameErrorIconQa=1` records `aeternaGameErrorIconQa` with icon key/path, display size, fallback state, missing key list, and visible canvas count.

Exit criteria:

- Unit tests verify the error icon id, preload path, deterministic QA route, runtime image object field, image name, display size, nearest filtering, glyph fallback isolation, and QA payload fields.
- Existing GameScene error navigation buttons, Enter/Space/ESC keyboard recovery, zone/boss label icon contracts, HUD startup, and offline QA flow remain unchanged.

Current QA state:

- Phase 178 implementation started on 2026-06-18.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "error screen title"` failed before implementation because `GameScene.ts` did not define `GAME_SCENE_ERROR_ICON_ID` or the Aseprite error title icon contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "error screen title"` passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\uiFrameAssets.test.ts` passes with 112 tests across 3 files.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.

## Phase 179: BattleScene Dual Tech Log and Boss Resist Icon Runtime Wiring

Runtime BattleScene/BattleUI 협공 icon coverage:

- Dual Tech log highlight icon: `skill_mw_storm.png` / texture key `skill_mw_storm_icon`.
- Triple Tech log highlight icon: `skill_ek_ultimate.png` / texture key `skill_ek_ultimate_icon`.
- Boss resist/immune label icon: `status_shield.png` / texture key `status_shield_icon`.

Production rule:

- `BattleUI` extends `BATTLE_LOG_HIGHLIGHT_ICON_IDS` with `dualTech` and `tripleTech`, so 협공 로그 하이라이트 reuses the existing pooled `battle_ui_log_highlight_icon` image path.
- 협공 로그 highlight text strips legacy glyphs and renders plain strings such as `협공 발동: 크로노 블레이드` or `3인 협공 발동: 에테르나 파이널` when the texture is present.
- `BattleScene` emits 협공 발동/가능/선택/통계/AOE logs without `✨`, `🌟`, `🔁`, `🏆`, or `💥` prefixes on the normal texture-backed path.
- `_updateBossImmuneLabel()` and `_updateBossResistLabel()` call `_syncBossResistIcon()` to cache `battle_boss_resist_icon_<unitId>` at `16x16` with nearest filtering.
- Texture-missing fallback keeps the previous `🛡 협공 면역` / `🛡 Dual +N%` label strings.

Exit criteria:

- Unit tests verify the dual/triple tech log icon ids, inference paths, QA route expansion, glyph stripping, BattleScene log glyph isolation, boss resist icon id/size, cached image name, display size, nearest filtering, and shield glyph fallback isolation.
- Existing BattleUI critical/chain/victory/level highlight icons, BattleScene 협공 button icons, CHAIN labels, boss telegraph, runtime image references, and UI frame contracts remain unchanged.

Current QA state:

- Phase 179 implementation started on 2026-06-18.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "협공 로그|보스 협공"` failed before implementation because `BattleUI.ts` did not define `dualTech`/`tripleTech` log highlight ids and `BattleScene.ts` did not define `BATTLE_BOSS_RESIST_ICON_ID`.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "협공 로그|보스 협공"` passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\bossTelegraph.test.ts tests\unit\uiFrameAssets.test.ts` passes with 119 tests across 4 files.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.

## Phase 180: BattleUI Guard Log Highlight Status Icon Runtime Wiring

Runtime BattleUI guard/reflect log icon coverage:

- Guard/reflect log highlight icon: `status_shield.png` / texture key `status_shield_icon`.

Production rule:

- `BattleUI` adds `BATTLE_LOG_HIGHLIGHT_STATUS_ICON_IDS.guard = 'shield'` and resolves it through `getStatusIconResource()` instead of the skill icon manifest.
- `_inferHighlightColor()` and `_inferHighlightIconKind()` route `방어` and `반사` log messages to the guard highlight path.
- `_formatLogHighlightText()` strips the legacy `🛡` glyph when an icon is rendered, and the log highlight QA legacy glyph detector includes `🛡`.
- `BattleScene` emits reflect and defend logs as plain text: `반사 → ...` and `<name> 방어 태세!`.
- Texture-missing fallback still supports the existing shield glyph paths in head-over defend markers, reflect popups, ambient lines, and boss resist labels.

Exit criteria:

- Unit tests verify the status icon import, guard status id, status resolver path, color/icon inference, QA message, glyph stripping, QA legacy detector, BattleScene status icon preload, and glyph-free defense/reflect log calls.
- Existing skill-icon log highlights, 협공 log highlights, reflect popup icons, defend head markers, boss resist labels, and BattleScene status icon preload remain unchanged.

Current QA state:

- Phase 180 implementation started on 2026-06-18.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "방어/반사 로그"` failed before implementation because `BattleUI.ts` did not import `getStatusIconResource` or define the guard status icon contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "방어/반사 로그"` passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\bossTelegraph.test.ts tests\unit\uiFrameAssets.test.ts` passes with 120 tests across 4 files.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.

## Phase 181: BattleUI Death Log Highlight Status Icon Runtime Wiring

Runtime BattleUI death log icon coverage:

- Death log highlight icon: `status_curse.png` / texture key `status_curse_icon`.

Production rule:

- `BattleUI` adds `BATTLE_LOG_HIGHLIGHT_STATUS_ICON_IDS.death = 'curse'` and resolves it through the same `getStatusIconResource()` status icon path used by guard/reflect log highlights.
- `_inferHighlightColor()` and `_inferHighlightIconKind()` route `💀` and `쓰러짐` log messages to the death highlight path, preserving the red highlight color.
- `_formatLogHighlightText()` strips the legacy `💀` glyph when an icon is rendered, and the log highlight QA legacy glyph detector includes `💀`.
- `BattleScene` emits death logs as plain text: `<name> 쓰러짐!`.
- Texture-missing fallback still supports the existing curse status icon failure path through the BattleUI highlight fallback bookkeeping.

Exit criteria:

- Unit tests verify the death status id, color/icon inference, QA route expansion, QA message, glyph stripping, QA legacy detector, BattleScene status icon preload, and glyph-free death log call.
- Existing skill-icon log highlights, 협공 log highlights, guard/reflect log highlights, defeat popup curse icon, and BattleScene status icon preload remain unchanged.

Current QA state:

- Phase 181 implementation started on 2026-06-18.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "사망 로그"` failed before implementation because `BattleUI.ts` did not define the death status icon contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "사망 로그"` passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\bossTelegraph.test.ts tests\unit\uiFrameAssets.test.ts` passes with 121 tests across 4 files.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.

## Phase 182: BattleScene Target Preview Kill Status Icon Runtime Wiring

Runtime BattleScene target preview kill icon coverage:

- Target preview KILL icon: `status_curse.png` / texture key `status_curse_icon`.

Production rule:

- `BattleScene` defines `BATTLE_TARGET_PREVIEW_KILL_ICON_ID = 'curse'` and reuses the shared status icon preload path from `preloadStatusIconResources(this)`.
- `create()` creates one hidden `battle_target_preview_kill_icon` image at `14x14` with nearest filtering when the curse status texture is present.
- `_drawTargetCursor()` shows the curse icon beside the expected damage preview only when the selected enemy would be killed by the pending action.
- With the icon present, expected damage text renders as `~N KILL`; texture-missing fallback keeps the previous `~N 💀KILL` string.
- `_drawTargetCursor()`, `_confirmTarget()`, and `_cancelTargetSelect()` all hide the icon to avoid stale target preview state.

Exit criteria:

- Unit tests verify the kill icon id/size, runtime image object, status icon resolver path, image name, display size, nearest filtering, glyph-free text path, fallback text path, and cleanup hiding.
- Existing target cursor arrow icon, damage preview calculation, target cycling, target confirmation, status icon preload, and fallback behavior remain unchanged.

Current QA state:

- Phase 182 implementation started on 2026-06-18.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "예상 KILL"` failed before implementation because `BattleScene.ts` did not define the target preview kill icon contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "예상 KILL"` passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\bossTelegraph.test.ts tests\unit\uiFrameAssets.test.ts` passes with 122 tests across 4 files.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.

## Phase 183: BattleUI Defeat Log Highlight Status Icon Runtime Wiring

Runtime BattleUI defeat log highlight icon coverage:

- Defeat log highlight icon: `status_curse.png` / texture key `status_curse_icon`.

Production rule:

- `BattleUI` extends `BATTLE_LOG_HIGHLIGHT_STATUS_ICON_IDS` with `defeat = 'curse'`, reusing the same shared status icon resolver path as guard/death highlights.
- `_inferHighlightColor()` and `_inferHighlightIconKind()` recognize `패배` and the legacy `💔` fallback glyph as defeat highlight signals.
- `_formatLogHighlightText()` strips `💔` when an icon is rendered, so Aseprite-backed defeat highlights display `패배...` as text only.
- `_getBattleLogHighlightQaKind()` accepts `battleLogHighlightIconQa=defeat` and the QA source message still includes `💔 패배...` to prove glyph stripping.
- `_showDefeat()` sends `패배...` to `BattleUI.addLog()` so normal runtime logs no longer inject the legacy heart glyph before the icon path can render.

Exit criteria:

- Unit tests verify the defeat status icon id, color/icon inference, QA route expansion, QA message, glyph stripping regex, legacy detector, BattleScene status icon preload, and glyph-free defeat log call.
- Existing death/guard/critical/chain/victory/level/dual-tech/triple-tech highlight icons, defeat lead banner, defeat popup title icon, red flash handling, and texture-missing fallback behavior remain unchanged.

Current QA state:

- Phase 183 implementation started on 2026-06-18.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "패배 로그"` failed before implementation because `BattleUI.ts` did not define the defeat log status icon contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "패배 로그"` passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\bossTelegraph.test.ts tests\unit\uiFrameAssets.test.ts` passes with 123 tests across 4 files.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.

## Phase 184: BattleScene Victory And Server Result Log Glyph Isolation

Runtime BattleScene log source cleanup coverage:

- Victory log highlight icon: `skill_ek_ultimate.png` / texture key `skill_ek_ultimate_icon`.
- CHAIN log highlight icon: `skill_mw_storm.png` / texture key `skill_mw_storm_icon`.
- Level-up log highlight icon: `skill_ek_passive.png` / texture key `skill_ek_passive_icon`.

Production rule:

- `_showVictory()` sends `승리!` to `BattleUI.addLog()` so the visible highlight can render the Aseprite victory icon instead of relying on a `🎉` source glyph.
- Server chain tick logs send `CHAIN ×N!`, `CHAIN MAX 도달! ...`, and `CHAIN 보너스 ...` as text-only messages; BattleUI still infers the chain icon from the `CHAIN` keyword.
- Server result victory and level-up logs send `서버 승리 확인!...` and `레벨 업!...` as text-only messages; BattleUI still infers victory/level icons from the Korean keywords.
- BattleUI QA source messages keep `🎉`, `🔥`, and `🆙` fallback glyph strings so glyph stripping and texture-missing fallback contracts remain testable.

Exit criteria:

- Unit tests verify BattleUI still maps `승리`, `CHAIN`, and `레벨 업` to existing Aseprite log highlight icon kinds while BattleScene no longer injects `🎉`, `🔥`, `💥`, or `🆙` into those runtime log calls.
- Existing local victory flow, server victory result handling, chain counter updates, max-chain SFX/shake, level-up SFX, and texture-missing QA fallback behavior remain unchanged.

Current QA state:

- Phase 184 implementation started on 2026-06-18.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "승리와 서버 결과 로그"` failed before implementation because `BattleScene.ts` still sent `🎉 승리!` and other glyph-prefixed server result logs.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "승리와 서버 결과 로그"` passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\bossTelegraph.test.ts tests\unit\uiFrameAssets.test.ts` passes with 124 tests across 4 files.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.

## Phase 185: BattleScene Battle Start Log Highlight Slash Icon Runtime Wiring

Runtime BattleScene battle-start log highlight icon coverage:

- Battle-start log highlight icon: `skill_ek_slash.png` / texture key `skill_ek_slash_icon`.

Production rule:

- `BattleUI` extends `BATTLE_LOG_HIGHLIGHT_ICON_IDS` with `start = 'skill_ek_slash'`, reusing the same Aseprite skill icon resolver and pooled `battle_ui_log_highlight_icon` image path as other skill-backed log highlights.
- `_inferHighlightColor()` and `_inferHighlightIconKind()` recognize `전투 시작` and the legacy `⚔` fallback glyph as battle-start highlight signals.
- `_formatLogHighlightText()` strips `⚔` when an icon is rendered, and the log highlight QA legacy glyph detector includes `⚔`.
- `_getBattleLogHighlightQaKind()` accepts `battleLogHighlightIconQa=start`; its QA source message keeps `⚔ 전투 시작!` to prove glyph stripping.
- `_startFighting()` sends `전투 시작!` to `BattleUI.addLog()` so normal runtime logs no longer inject the legacy sword glyph before the icon path can render.

Exit criteria:

- Unit tests verify the start skill icon id, color/icon inference, QA route expansion, QA message, glyph stripping regex, legacy detector, BattleScene log highlight preload loop, and glyph-free battle-start log call.
- Existing intro overlay slash icon, critical/chain/victory/level/dual-tech/triple-tech/guard/death/defeat log highlights, and texture-missing fallback behavior remain unchanged.

Current QA state:

- Phase 185 implementation started on 2026-06-18.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "전투 시작 로그"` failed before implementation because `BattleUI.ts` did not define the start slash icon contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "전투 시작 로그"` passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\bossTelegraph.test.ts tests\unit\uiFrameAssets.test.ts` passes with 125 tests across 4 files.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.

## Phase 186: BattleScene ECHO Log Highlight Storm Icon Runtime Wiring

Runtime BattleScene ECHO log highlight icon coverage:

- ECHO log highlight icon: `skill_mw_storm.png` / texture key `skill_mw_storm_icon`.

Production rule:

- `BattleUI` extends `BATTLE_LOG_HIGHLIGHT_ICON_IDS` with `echo = 'skill_mw_storm'`, reusing the same pooled `battle_ui_log_highlight_icon` image path as CHAIN and 2인 협공 highlights.
- `_inferHighlightColor()` and `_inferHighlightIconKind()` recognize `ECHO` as a log highlight signal and route it to the storm icon.
- `_formatLogHighlightText()` already strips the legacy `✨` glyph when an icon is rendered, and the QA legacy glyph detector already includes `✨`.
- `_getBattleLogHighlightQaKind()` accepts `battleLogHighlightIconQa=echo`; its QA source message keeps `✨ ECHO! +29` to prove glyph stripping.
- The crit echo runtime log sends `ECHO! +N` to `BattleUI.addLog()` so normal runtime logs no longer inject the legacy sparkle glyph before the icon path can render.

Exit criteria:

- Unit tests verify the echo skill icon id, color/icon inference, QA route expansion, QA message, glyph stripping regex, legacy detector, BattleScene log highlight preload loop, and glyph-free crit echo log call.
- Existing ECHO popup storm icon, CHAIN/dual-tech storm icon reuse, critical/level/victory/start/guard/death/defeat log highlights, and texture-missing fallback behavior remain unchanged.

Current QA state:

- Phase 186 implementation started on 2026-06-18.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "ECHO 로그"` failed before implementation because `BattleUI.ts` did not define the echo storm icon contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "ECHO 로그"` passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\bossTelegraph.test.ts tests\unit\uiFrameAssets.test.ts` passes with 126 tests across 4 files.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.

## Phase 187: BattleScene Boss Telegraph Log Highlight Explode Icon Runtime Wiring

Runtime BattleScene boss telegraph log highlight icon coverage:

- Boss telegraph log highlight icon: `skill_ek_explode.png` / texture key `skill_ek_explode_icon`.

Production rule:

- `BattleUI` extends `BATTLE_LOG_HIGHLIGHT_ICON_IDS` with `telegraph = 'skill_ek_explode'`, reusing the same pooled `battle_ui_log_highlight_icon` image path as critical highlights.
- `_inferHighlightColor()` and `_inferHighlightIconKind()` recognize `강공 준비` and the legacy `💢` fallback glyph as boss telegraph highlight signals.
- `_formatLogHighlightText()` strips `💢` when an icon is rendered, and the log highlight QA legacy glyph detector includes `💢`.
- `_getBattleLogHighlightQaKind()` accepts `battleLogHighlightIconQa=telegraph`; its QA source message keeps `💢 보스 강공 준비!` to prove glyph stripping.
- `_showBossTelegraph()` sends `<boss name> 강공 준비!` to `BattleUI.addLog()` so normal runtime logs no longer inject the legacy rage glyph before the icon path can render.

Exit criteria:

- Unit tests verify the telegraph skill icon id, color/icon inference, QA route expansion, QA message, glyph stripping regex, legacy detector, BattleScene boss telegraph icon constant, log highlight preload loop, and glyph-free boss telegraph log call.
- Existing boss telegraph overhead icon, critical log highlight, critical damage popup, ECHO/CHAIN/dual-tech storm icon reuse, and texture-missing fallback behavior remain unchanged.

Current QA state:

- Phase 187 implementation started on 2026-06-18.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "강공 준비 로그"` failed before implementation because `BattleUI.ts` did not define the telegraph explode icon contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "강공 준비 로그"` passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\bossTelegraph.test.ts tests\unit\uiFrameAssets.test.ts` passes with 127 tests across 4 files.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.

## Phase 188: BattleScene Boss Strong Damage Log Highlight Explode Icon Runtime Wiring

Runtime BattleScene boss strong damage log highlight icon coverage:

- Boss strong damage log highlight icon: `skill_ek_explode.png` / texture key `skill_ek_explode_icon`.

Production rule:

- `BattleUI` reuses `BATTLE_LOG_HIGHLIGHT_ICON_IDS.telegraph = 'skill_ek_explode'` and the pooled `battle_ui_log_highlight_icon` image path for both boss strong prepare and boss strong damage highlights.
- `_inferHighlightColor()` and `_inferHighlightIconKind()` recognize `강공!`, `강공 준비`, and the legacy `💢` fallback glyph as boss strong highlight signals.
- `_formatLogHighlightText()` continues to strip `💢` when an icon is rendered, and the log highlight QA legacy glyph detector keeps `💢`.
- `_applyDamage(..., { strong: true })` sends `강공! <attacker> → <target> : <damage>` to `BattleUI.addLog()` so normal runtime damage logs no longer inject the legacy rage glyph before the icon path can render.
- The QA source message still keeps `💢 보스 강공 준비!` through the telegraph highlight route to prove glyph stripping and texture-missing fallback behavior.

Exit criteria:

- Unit tests verify the telegraph skill icon id, color/icon inference for both `강공 준비` and `강공!`, QA fallback glyph stripping, BattleScene log highlight preload loop, and glyph-free boss strong damage log call.
- Existing boss telegraph overhead icon, boss strong prepare log highlight, critical log highlight, critical damage popup, and texture-missing fallback behavior remain unchanged.

Current QA state:

- Phase 188 implementation started on 2026-06-18.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "강공 피해 로그"` failed before implementation because `BattleUI.ts` did not route `강공!` damage logs to the telegraph explode icon branch.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "강공 피해 로그|강공 준비 로그"` passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\bossTelegraph.test.ts tests\unit\uiFrameAssets.test.ts` passes with 128 tests across 4 files.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.

## Phase 189: BattleScene MP Shortage Log Highlight Mana Icon Runtime Wiring

Runtime BattleScene MP shortage log highlight icon coverage:

- MP shortage log highlight icon: `skill_mw_passive.png` / texture key `skill_mw_passive_icon`.

Production rule:

- `BattleUI` extends `BATTLE_LOG_HIGHLIGHT_ICON_IDS` with `mana = 'skill_mw_passive'`, reusing the same pooled `battle_ui_log_highlight_icon` image path as other skill-backed log highlights.
- `_inferHighlightColor()` and `_inferHighlightIconKind()` recognize `MP 부족` and the legacy `💧` fallback glyph as MP shortage highlight signals.
- `_formatLogHighlightText()` strips `💧` when an icon is rendered, and the log highlight QA legacy glyph detector includes `💧`.
- `_getBattleLogHighlightQaKind()` accepts `battleLogHighlightIconQa=mana`; its QA source message keeps `💧 MP 부족 — 에테르 슬래시(MP 15)` to prove glyph stripping.
- Both direct skill use and magic submenu no-MP paths send `MP 부족 — <skill name>(MP <cost>)` to `BattleUI.addLog()` so normal runtime logs no longer inject the legacy water glyph before the icon path can render.

Exit criteria:

- Unit tests verify the mana skill icon id, color/icon inference, QA route expansion, QA message, glyph stripping regex, legacy detector, BattleScene log highlight preload loop, and glyph-free MP shortage log calls.
- Existing magic/item submenu row icons, skill slot MP cost labels, ECHO/CHAIN/critical/start/telegraph log highlights, and texture-missing fallback behavior remain unchanged.

Current QA state:

- Phase 189 implementation started on 2026-06-18.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "MP 부족 로그"` failed before implementation because `BattleUI.ts` did not define the mana log highlight icon contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "MP 부족 로그"` passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\bossTelegraph.test.ts tests\unit\uiFrameAssets.test.ts` passes with 129 tests across 4 files.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.

## Phase 190: BattleScene Skill And Combo Log Highlight Storm Icon Runtime Wiring

Runtime BattleScene skill/combo log highlight icon coverage:

- Skill hit log highlight icon: `skill_mw_storm.png` / texture key `skill_mw_storm_icon`.
- Combo log highlight icon: `skill_mw_storm.png` / texture key `skill_mw_storm_icon`.

Production rule:

- `BattleUI` extends `BATTLE_LOG_HIGHLIGHT_ICON_IDS` with `skillHit = 'skill_mw_storm'`, reusing the same pooled `battle_ui_log_highlight_icon` image path as CHAIN, ECHO, and 2인 협공 highlights.
- `_inferHighlightColor()` and `_inferHighlightIconKind()` recognize `스킬 발동` as a skill damage highlight signal; existing `콤보` inference continues to route combo logs to the `chain` storm icon branch.
- `_formatLogHighlightText()` already strips the legacy `⚡` glyph when an icon is rendered, and the log highlight QA legacy glyph detector includes `⚡`.
- `_getBattleLogHighlightQaKind()` accepts `battleLogHighlightIconQa=skillHit`; its QA source message keeps `⚡ 스킬 발동: 에테르 슬래시 → 허수아비 : 88` to prove glyph stripping.
- Combo bonus logs send `콤보: <combo name>! +<bonus>%`, and skill damage logs send `스킬 발동: <skill name> → <target> : <damage>` so normal runtime logs no longer inject the legacy lightning glyph before the icon path can render.

Exit criteria:

- Unit tests verify the skillHit skill icon id, color/icon inference, QA route expansion, QA message, glyph stripping regex, legacy detector, BattleScene log highlight preload loop, and glyph-free combo/skill damage log calls.
- Existing CHAIN label icon, ECHO popup/log highlight, combo button icons, skill slot icons, and texture-missing fallback behavior remain unchanged.

Current QA state:

- Phase 190 implementation started on 2026-06-18.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "스킬/콤보 로그"` failed before implementation because `BattleUI.ts` did not define the `skillHit` storm icon contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "스킬/콤보 로그"` passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\bossTelegraph.test.ts tests\unit\uiFrameAssets.test.ts` passes with 130 tests across 4 files.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.

## Phase 191: BattleScene Critical Damage Log Highlight Explode Icon Runtime Wiring

Runtime BattleScene critical damage log highlight icon coverage:

- Critical damage log highlight icon: `skill_ek_explode.png` / texture key `skill_ek_explode_icon`.

Production rule:

- `BattleUI` continues to route `크리`, `CRIT`, and legacy `💥` fallback glyph messages to `BATTLE_LOG_HIGHLIGHT_ICON_IDS.critical = 'skill_ek_explode'`.
- `_formatLogHighlightText()` strips `💥` when an icon is rendered, and the log highlight QA legacy glyph detector includes `💥`.
- `_applyDamage()` sends `<attacker> → <target> : <damage> 크리티컬!` for critical hits, so normal runtime damage logs no longer inject the legacy burst glyph before the icon path can render.
- The QA source message still keeps `💥 CRIT 88` through the critical highlight route to prove glyph stripping and texture-missing fallback behavior.

Exit criteria:

- Unit tests verify the critical skill icon id, color/icon inference, QA message, glyph stripping regex, legacy detector, BattleScene log highlight preload loop, and glyph-free critical damage log call.
- Existing critical damage popup icon, boss strong damage log highlight, skill/combo storm highlight, and texture-missing fallback behavior remain unchanged.

Current QA state:

- Phase 191 implementation started on 2026-06-18.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "크리티컬 피해 로그"` failed before implementation because `BattleScene.ts` still injected `💥` into the critical damage log label.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "크리티컬 피해 로그"` passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\bossTelegraph.test.ts tests\unit\uiFrameAssets.test.ts` passes with 131 tests across 4 files.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.

## Phase 192: BattleScene Combo Popup Storm Icon Runtime Wiring

Runtime BattleScene combo bonus popup icon coverage:

- Combo bonus popup icon: `skill_mw_storm.png` / texture key `skill_mw_storm_icon`.

Production rule:

- `_spawnComboText()` renders `battle_combo_popup_icon` at `18x18` with nearest filtering before legacy fallback.
- The combo popup shares the storm skill icon resource already used by CHAIN/ECHO/skill log highlights, but preloads it through the popup contract as well so the popup does not depend on another UI path.
- When the icon texture exists, the popup label is `<combo name> +<bonus>%` and no longer injects the legacy `⚡` glyph.
- Texture-missing fallback keeps the previous `⚡ <combo name> +<bonus>%` string.
- `?debugScene=battle&renderer=canvas&battleComboPopupIconQa=1` records `aeternaBattleComboPopupIconQa` with rendered icon keys, display sizes, fallback state, missing texture keys, labels, and legacy glyph detection.

Exit criteria:

- Unit tests verify the storm skill icon id, preload guard, popup image object, nearest filtering, glyph-free label branch, fallback branch, QA dataset writer, missing texture key reporting, and debug query param wiring.
- Existing ECHO popup, critical popup, combo log highlight, CHAIN label, and texture-missing fallback behavior remain unchanged.

Current QA state:

- Phase 192 implementation started on 2026-06-18.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "combo popup"` failed before implementation because `BattleScene.ts` did not define the combo popup icon contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "combo popup"` passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\bossTelegraph.test.ts tests\unit\uiFrameAssets.test.ts` passes with 132 tests across 4 files.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.

## Phase 193: BattleScene Cooldown And Wait Log Highlight Stop Icon Runtime Wiring

Runtime BattleScene cooldown/wait log highlight icon coverage:

- Cooldown log highlight icon: `skill_tg_stop.png` / texture key `skill_tg_stop_icon`.
- Wait log highlight icon: `skill_tg_stop.png` / texture key `skill_tg_stop_icon`.

Production rule:

- `BattleUI` extends `BATTLE_LOG_HIGHLIGHT_ICON_IDS` with `cooldown = 'skill_tg_stop'` and `wait = 'skill_tg_stop'`, reusing the pooled `battle_ui_log_highlight_icon` image path.
- `_inferHighlightColor()` and `_inferHighlightIconKind()` recognize `쿨다운` and `대기` keywords, while legacy `⏳` and `⏭` QA/fallback messages still route through the same icon kind.
- `_formatLogHighlightText()` strips `⏳` and `⏭` when an icon is rendered, and the log highlight QA legacy glyph detector includes both glyphs.
- BattleScene cooldown logs send `<skill name> 쿨다운 중`, and the command-menu wait shortcut sends `<unit name> 대기`, so normal runtime logs no longer inject the legacy hourglass/skip glyphs before the icon path can render.

Exit criteria:

- Unit tests verify the stop skill icon ids, color/icon inference, QA route expansion, QA messages, glyph stripping regex, legacy detector, BattleScene log highlight preload loop, and glyph-free cooldown/wait log calls.
- Existing pause utility button icons, skill cooldown overlays, magic submenu disabled rows, MP shortage logs, skill/combo logs, and texture-missing fallback behavior remain unchanged.

Current QA state:

- Phase 193 implementation started on 2026-06-18.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "쿨다운/대기 로그"` failed before implementation because `BattleUI.ts` did not define the cooldown/wait stop icon contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "쿨다운/대기 로그"` passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\bossTelegraph.test.ts tests\unit\uiFrameAssets.test.ts` passes with 133 tests across 4 files.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.

## Phase 194: BattleScene Magic Submenu Cooldown Stop Icon Runtime Wiring

Runtime BattleScene magic submenu cooldown icon coverage:

- Magic submenu cooldown icon: `skill_tg_stop.png` / texture key `skill_tg_stop_icon`.

Production rule:

- `BattleScene.preload()` queues `BATTLE_MAGIC_SUB_MENU_COOLDOWN_ICON_ID = 'skill_tg_stop'` directly so the magic submenu does not depend on BattleUI log highlight preloading.
- `_showMagicSubMenu()` renders `battle_magic_submenu_cooldown_icon_<skillId>` at `14x14` for rows whose `SkillSlot.currentCooldown > 0`.
- Cooldown row labels use `스킬명 CD Ns` text and no longer inject the legacy `⏳Ns` glyph in the normal render path.
- Existing skill row icon, focus arrow icon, MP 부족/쿨다운 click feedback logs, keyboard navigation, and texture-missing behavior remain unchanged.

Exit criteria:

- Unit tests verify the cooldown stop skill icon id, preload call, submenu image object, display size, nearest filtering, glyph-free cooldown label, and absence of the old `⏳Ns` label branch.
- Existing BattleUI cooldown/wait log highlight and magic/item submenu focus icon coverage remain green.

Current QA state:

- Phase 194 implementation started on 2026-06-18.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "마법 서브메뉴 쿨다운"` failed before implementation because `BattleScene.ts` did not define the magic submenu cooldown stop icon contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "마법 서브메뉴 쿨다운"` passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\bossTelegraph.test.ts tests\unit\uiFrameAssets.test.ts` passes with 134 tests across 4 files.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.

## Phase 195: BattleScene Potion Heal Log Highlight Item Icon Runtime Wiring

Runtime BattleScene potion heal log highlight icon coverage:

- Potion heal log highlight icon: `ITM-CON-001.png` / texture key `icon_item_ITM-CON_001`.

Production rule:

- `BattleUI` adds `BATTLE_LOG_HIGHLIGHT_ITEM_ICON_IDS.itemHeal = 'ITM-CON-001'` and resolves that kind through `getItemIconResource()`.
- `BattleScene.preload()` queues `BATTLE_LOG_HIGHLIGHT_ITEM_ICON_IDS` directly so the heal log highlight does not rely on command menu or item submenu icon preloading.
- Potion use logs now send `<unit name> HP +100 회복!`, so the normal runtime log no longer injects the legacy flask glyph before the Aseprite item icon path can render.
- `_formatLogHighlightText()` strips `🧪` only when an icon is rendered, and the QA legacy glyph detector includes `🧪` to keep texture-missing fallback observable.
- Existing item submenu row icon, potion click behavior, heal popup number, SFX, and BattleUI skill/status log highlight paths remain unchanged.

Exit criteria:

- Unit tests verify the item icon id map, item icon resolver, color/icon inference, QA route expansion, QA message, glyph stripping regex, legacy detector, BattleScene item icon preload loop, and glyph-free potion heal log call.
- Existing MP shortage, cooldown/wait, skill/combo, guard/death/defeat, and texture-missing fallback behavior remain green.

Current QA state:

- Phase 195 implementation started on 2026-06-18.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "포션 회복 로그"` failed before implementation because `BattleScene.ts` and `BattleUI.ts` did not define the item log highlight contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "포션 회복 로그"` passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\bossTelegraph.test.ts tests\unit\uiFrameAssets.test.ts` passes with 135 tests across 4 files.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.

## Phase 196: BattleScene Connection Badge Status Icon Runtime Wiring

Runtime BattleScene connection badge icon coverage:

- Reconnecting badge icon: `skill_tg_stop.png` / texture key `skill_tg_stop_icon`.
- Connection error badge icon: `status_curse.png` / texture key `status_curse_icon`.

Production rule:

- `BattleScene.preload()` queues both connection badge icon resources directly so the network status badge does not depend on log highlight, magic submenu, or global status preload side effects.
- `_renderConnectionBadgeState()` is the single path used by `networkManager.onConnectionChange()` and `battleConnectionBadgeIconQa`.
- Reconnecting, connecting, and disconnected states render `battle_connection_badge_icon` with the stop skill icon and the glyph-free label `재연결 중… 전투 일시정지`.
- Error state renders the same image slot with the curse status icon and the glyph-free label `연결 실패 — 재시도 중`.
- Texture-missing fallback keeps the old `○`/`✕` labels observable only through fallback/QA paths.

Exit criteria:

- Unit tests verify the stop skill icon id, curse status icon id, icon mode map, preload calls, image object name, display size, nearest filtering, glyph-free label selection, QA route, QA payload, and removal of the old direct `setText()` glyph branch.
- Existing BattleScene icon contracts, BattleUI log highlight contracts, boss telegraph coverage, and UI frame source contracts remain green.

Current QA state:

- Phase 196 implementation started on 2026-06-18.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "connection badge"` failed before implementation because `BattleScene.ts` did not define the connection badge icon contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "connection badge"` passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\bossTelegraph.test.ts tests\unit\uiFrameAssets.test.ts` passes with 136 tests across 4 files.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.

## Phase 197: GameScene Connection Status Icon Runtime Wiring

Runtime GameScene connection status icon coverage:

- Online status icon: `skill_mw_arrow.png` / texture key `skill_mw_arrow_icon`.
- Offline, connecting, and reconnecting status icon: `skill_tg_stop.png` / texture key `skill_tg_stop_icon`.
- Connection error status icon: `skill_ek_explode.png` / texture key `skill_ek_explode_icon`.

Production rule:

- `GameScene.preload()` queues all three connection status icon resources directly and de-duplicates keys already queued for boss/error title icons.
- `_renderConnectionStatus()` is the single text/icon path used by offline QA startup, `networkManager.onConnectionChange()`, and `gameConnectionIconQa`.
- Normal labels use `온라인`, `오프라인`, `연결 중`, `재연결 중`, or `연결 실패` without the old `●`/`○`/`✕` glyph prefix when the icon texture is present.
- Texture-missing fallback keeps the old status glyph labels observable only through fallback/QA paths.

Exit criteria:

- Unit tests verify the connection icon id map, QA route, preload call, image object name, display size, nearest filtering, QA payload, legacy glyph detector, missing key list, and removal of the old direct `setText()` glyph branches.
- Browser QA verifies `connected`, `offline`, and `error` status modes render exactly one `game_scene_connection_status_icon`, have no legacy glyph in the visible label, report no missing keys, and keep the field canvas nonblank.
- Existing GameScene boss label, zone label, error title, runtime image reference, and UI frame contracts remain green.

Current QA state:

- Phase 197 implementation started on 2026-06-18.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "GameScene connection status"` failed before implementation because `GameScene.ts` did not define the connection status icon contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "GameScene connection status"` passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\uiFrameAssets.test.ts` passes with 132 tests across 3 files.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.
- Browser QA: `?debugScene=game&renderer=canvas&zone=aether_plains&class=ether_knight&gameConnectionIconQa=connected|offline|error` passes with `aeternaGameConnectionIconQa.status = ready`, one rendered icon, `legacyGlyphPresent = false`, empty missing key lists, no console/page errors, and nonblank canvas pixels for all three modes.

## Phase 198: LobbyScene Connection Status Icon Runtime Wiring

Runtime LobbyScene connection status icon coverage:

- Online status icon: `skill_mw_arrow.png` / texture key `skill_mw_arrow_icon`.
- Offline, connecting, and reconnecting status icon: `skill_tg_stop.png` / texture key `skill_tg_stop_icon`.
- Connection error status icon: `skill_ek_explode.png` / texture key `skill_ek_explode_icon`.

Production rule:

- `LobbyScene.preload()` queues all three connection status icon resources directly and de-duplicates keys already queued by existing lobby skill/icon UI paths.
- `_renderLobbyConnectionStatus()` is the single text/icon path used by offline QA startup, `networkManager.onConnectionChange()`, and `lobbyConnectionIconQa`.
- Normal labels use `온라인`, `오프라인`, `연결 중`, `재연결 중`, or `연결 실패` without the old `●`/`○`/`✕` glyph prefix when the icon texture is present.
- Texture-missing fallback keeps the old status glyph labels observable only through fallback/QA paths.

Exit criteria:

- Unit tests verify the lobby connection icon id map, QA route, preload call, image object name, display size, nearest filtering, QA payload, legacy glyph detector, missing key list, and removal of the old direct `setText()` glyph branches.
- Browser QA verifies `connected`, `offline`, and `error` status modes render exactly one `lobby_connection_status_icon`, have no legacy glyph in the visible label, report no missing keys, and keep the lobby canvas nonblank.
- Existing LobbyScene NPC sprite, dialogue/title/focus icon, bottom nav, item icon, GameScene connection icon, runtime image reference, and UI frame contracts remain green.

Current QA state:

- Phase 198 implementation started on 2026-06-18.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "LobbyScene connection status"` failed before implementation because `LobbyScene.ts` did not define the connection status icon contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "LobbyScene connection status"` passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\uiFrameAssets.test.ts` passes with 133 tests across 3 files.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.
- Browser QA: `?debugScene=lobby&renderer=canvas&lobbyConnectionIconQa=connected|offline|error` passes with `aeternaLobbyConnectionIconQa.status = ready`, one rendered icon, `legacyGlyphPresent = false`, empty missing key lists, no console/page errors, and nonblank canvas pixels for all three modes.

## Phase 199: ErrorBoundary DOM Overlay Icon Runtime Wiring

Runtime ErrorBoundary DOM overlay icon coverage:

- Runtime error title icon: `status_curse.png` / DOM `#error-title-icon`.
- Network reconnect badge icon: `skill_tg_stop.png` / DOM `#reconnect-status-icon`.

Production rule:

- `ErrorBoundary` renders error and reconnect overlay icons as generated Aseprite PNG `<img>` elements so these emergency DOM surfaces no longer depend on warning/lightning text glyphs during the normal path.
- `_renderOverlayIcon()` is the single DOM icon HTML path used by both recovery and reconnect overlays.
- `⚠` and `⚡` are only inserted into hidden fallback spans when the image load fails.
- `aeternaErrorBoundaryIconQa` and `aeternaReconnectIconQa` record icon id/path, rendered count, fallback state, and legacy glyph state for browser automation.

Exit criteria:

- Unit tests verify the icon asset ids, runtime paths, DOM element ids, shared renderer, QA datasets, and removal of the old direct glyph strings.
- Browser QA triggers both `ErrorEvent` and `offline` on a running page, verifies image `naturalWidth > 0`, `status = ready`, `renderedCount = 1`, `legacyGlyphPresent = false`, and no console/page errors.
- Existing sprite manifest, ErrorBoundary capture, runtime image reference, and UI frame contracts remain green.

Current QA state:

- Phase 199 implementation started on 2026-06-18.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "ErrorBoundary DOM overlays"` failed before implementation because `ErrorBoundary.ts` did not define the DOM overlay icon contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "ErrorBoundary DOM overlays"` passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\errorBoundaryCapture.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\uiFrameAssets.test.ts` passes with 140 tests across 4 files.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.
- Browser QA: `?renderer=canvas&qaRun=phase199-error-boundary-iab` triggers a runtime `ErrorEvent` and `offline` event; both `aeternaErrorBoundaryIconQa` and `aeternaReconnectIconQa` report `status = ready`, `renderedCount = 1`, `legacyGlyphPresent = false`, loaded image widths `32` and `64`, and no console/page errors.

## Phase 200: BattleUI Reconnect Log Highlight Icon Runtime Wiring

Runtime BattleScene reconnect log highlight icon coverage:

- Reconnect recovery log highlight icon: `skill_tg_stop.png` / texture key `skill_tg_stop_icon`.

Production rule:

- `BattleUI` extends `BATTLE_LOG_HIGHLIGHT_ICON_IDS` with `reconnect = 'skill_tg_stop'`, reusing the pooled `battle_ui_log_highlight_icon` path already used by cooldown and wait highlights.
- `_inferHighlightColor()` and `_inferHighlightIconKind()` recognize `재연결됨`, `전투 재개`, and legacy fallback `🔌` source messages as reconnect highlight signals.
- `_formatLogHighlightText()` strips `🔌` when the Aseprite icon is rendered, and the log highlight QA legacy glyph detector includes `🔌`.
- `_setupConnectionBadge()` now sends `재연결됨 — 전투 재개` to `BattleUI.addLog()` so the normal runtime path no longer injects the plug glyph before the icon path can render.
- Texture-missing and QA source paths keep the previous `🔌 재연결됨 — 전투 재개` fallback message observable for regression coverage.

Exit criteria:

- Unit tests verify the reconnect skill icon id, color/icon inference, QA route expansion, QA source message, glyph stripping regex, legacy detector, BattleScene log highlight preload loop, and glyph-free reconnect recovery log call.
- Browser QA verifies `battleLogHighlightIconQa=reconnect` renders exactly one `battle_ui_log_highlight_icon` with `skill_tg_stop_icon`, `displaySizes = 16x16`, no missing keys, `legacyGlyphPresent = false`, and nonblank canvas output.
- Existing BattleUI log highlight contracts, runtime image reference coverage, UI frame contracts, typecheck, and build remain green.

Current QA state:

- Phase 200 implementation started on 2026-06-18.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "재연결 복구 로그"` failed before implementation because `BattleUI.ts` did not define the reconnect log highlight icon contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "재연결 복구 로그"` passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\uiFrameAssets.test.ts` passes with 135 tests across 3 files.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.
- Browser QA: `?debugScene=battle&renderer=canvas&battleLogHighlightIconQa=reconnect&class=ether_knight&qaRun=phase200-reconnect-log` reports `aeternaBattleLogHighlightIconQa.status = ready`, `kind = reconnect`, `iconId = skill_tg_stop`, `renderedCount = 1`, `displaySizes = 16x16`, `legacyGlyphPresent = false`, empty missing key lists, one visible nonblank canvas, and no console/page errors.

## Phase 201: BattleUI Pacing Log Highlight Icon Runtime Wiring

Runtime BattleScene pacing log highlight icon coverage:

- AUTO mode log highlight icon: `skill_tg_haste.png` / texture key `skill_tg_haste_icon`.
- ATB mode log highlight icon: `skill_tg_stop.png` / texture key `skill_tg_stop_icon`.

Production rule:

- `BattleUI` extends `BATTLE_LOG_HIGHLIGHT_ICON_IDS` with `autoMode = 'skill_tg_haste'` and `atbMode = 'skill_tg_stop'`, reusing the pooled `battle_ui_log_highlight_icon` path used by other skill-backed log highlights.
- `_inferHighlightColor()` and `_inferHighlightIconKind()` recognize `[AUTO]`, `자동 전투`, `ATB 모드`, and the legacy fallback `⚙`/`⏱` source glyphs as pacing highlight signals.
- `_formatLogHighlightText()` strips `⚙` and `⏱` when the Aseprite icon is rendered, and the log highlight QA legacy glyph detector includes both glyphs.
- `_toggleAuto()` now sends `[AUTO] 자동 전투 ON (×1.5)` or `[AUTO] 자동 전투 OFF`, and `_cycleAtbMode()` sends `ATB 모드: <mode> — <description>` so normal runtime pacing logs no longer inject gear/timer glyphs before the icon path can render.
- Texture-missing and QA source paths keep the previous `⚙ [AUTO] 자동 전투 ON (×1.5)` and `⏱ ATB 모드: WAIT — 메뉴/조준 중 정지` fallback messages observable for regression coverage.

Exit criteria:

- Unit tests verify the time guardian skill icon ids, color/icon inference, QA route expansion, QA source messages, glyph stripping regex, legacy detector, BattleScene log highlight preload loop, and glyph-free AUTO/ATB runtime log calls.
- Browser QA verifies `battleLogHighlightIconQa=autoMode` renders exactly one `battle_ui_log_highlight_icon` with `skill_tg_haste_icon`, and `battleLogHighlightIconQa=atbMode` renders exactly one `battle_ui_log_highlight_icon` with `skill_tg_stop_icon`; both report `displaySizes = 16x16`, no missing keys, `legacyGlyphPresent = false`, and nonblank canvas output.
- Existing BattleUI log highlight contracts, runtime image reference coverage, UI frame contracts, typecheck, and build remain green.

Current QA state:

- Phase 201 implementation started on 2026-06-19.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "전투 페이싱 로그"` failed before implementation because `BattleUI.ts` did not define the `autoMode` log highlight icon contract.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "전투 페이싱 로그"` passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\uiFrameAssets.test.ts` passes with 136 tests across 3 files.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.
- Browser QA: `?debugScene=battle&renderer=canvas&battleLogHighlightIconQa=autoMode&class=ether_knight&qaRun=phase201-auto-log` reports `aeternaBattleLogHighlightIconQa.status = ready`, `kind = autoMode`, `iconId = skill_tg_haste`, `renderedCount = 1`, `displaySizes = 16x16`, `legacyGlyphPresent = false`, empty missing key lists, one visible nonblank canvas, and no console/page errors.
- Browser QA: `?debugScene=battle&renderer=canvas&battleLogHighlightIconQa=atbMode&class=ether_knight&qaRun=phase201-atb-log` reports `aeternaBattleLogHighlightIconQa.status = ready`, `kind = atbMode`, `iconId = skill_tg_stop`, `renderedCount = 1`, `displaySizes = 16x16`, `legacyGlyphPresent = false`, empty missing key lists, one visible nonblank canvas, and no console/page errors.

## Phase 202: BattleUI BGM Log Highlight UI Icon Runtime Wiring

Runtime BattleScene BGM log highlight icon coverage:

- BGM playing log highlight icon: `battle_bgm_playing.png` / texture key `ui_icon_battle_bgm_playing`.
- BGM missing log highlight icon: `battle_bgm_missing.png` / texture key `ui_icon_battle_bgm_missing`.

Production rule:

- `tools/aseprite-pipeline/scripts/create-battle-bgm-ui-icon.lua` creates the two 32x32 Aseprite source files under `assets/source/aseprite/ui/icons/system/`, with generated mirror PNG/JSON and runtime PNGs under `client/public/assets/generated/ui/icons/system/`.
- `spriteResourceManifest` now supports `uiIconId`, maps `battle_bgm_playing` and `battle_bgm_missing`, and exposes `getSpriteResourceForUiIcon()`.
- `BattleUI` routes `BGM:` and `BGM 미존재` logs through `BATTLE_LOG_HIGHLIGHT_UI_ICON_IDS`, strips legacy `🎵`/`🔇` glyphs when an icon is rendered, and keeps the legacy glyph source messages only in QA/fallback coverage.
- `BattleScene` BGM runtime logs now send `BGM: <track>` and `BGM 미존재: <track>` without directly injecting music/mute glyphs before the icon path can render.

Exit criteria:

- Unit tests verify the UI icon manifest entries, `uiIconId` map/getter, BattleScene preload loop, BattleUI BGM color/icon inference, QA route expansion, glyph stripping regex, legacy detector, QA source messages, and glyph-free BGM runtime log calls.
- Browser QA verifies `battleLogHighlightIconQa=bgmTrack` renders exactly one `battle_ui_log_highlight_icon` with `ui_icon_battle_bgm_playing`, and `battleLogHighlightIconQa=bgmMissing` renders exactly one icon with `ui_icon_battle_bgm_missing`; both report `displaySizes = 16x16`, no missing keys, `legacyGlyphPresent = false`, and nonblank canvas output.
- Existing BattleUI log highlight contracts, runtime image reference coverage, UI frame contracts, sprite roster validation, typecheck, and build remain green.

Current QA state:

- Phase 202 implementation started on 2026-06-19.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "BGM"` failed before implementation because the BGM UI icon manifest entries and `BATTLE_LOG_HIGHLIGHT_UI_ICON_IDS` contract did not exist.
- GREEN: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "BGM"` passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\uiFrameAssets.test.ts` passes with 138 tests across 3 files.
- Public runtime roster coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\runtimeImageRosterCoverage.test.ts` passes with 1 test.
- Sprite roster: `npm run art:sprite:roster` passes with `{"ok":true,"errors":[]}`.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.
- Browser QA: `?debugScene=battle&renderer=canvas&battleLogHighlightIconQa=bgmTrack&class=ether_knight&qaRun=phase202-bgm-track` reports `aeternaBattleLogHighlightIconQa.status = ready`, `kind = bgmTrack`, `iconId = battle_bgm_playing`, `renderedTextureKeys = ui_icon_battle_bgm_playing`, `renderedCount = 1`, `displaySizes = 16x16`, `highlightText = BGM: bgm_ancient_field`, `legacyGlyphPresent = false`, empty missing key lists, one visible nonblank canvas, and no console/page errors.
- Browser QA: `?debugScene=battle&renderer=canvas&battleLogHighlightIconQa=bgmMissing&class=ether_knight&qaRun=phase202-bgm-missing` reports `aeternaBattleLogHighlightIconQa.status = ready`, `kind = bgmMissing`, `iconId = battle_bgm_missing`, `renderedTextureKeys = ui_icon_battle_bgm_missing`, `renderedCount = 1`, `displaySizes = 16x16`, `highlightText = BGM 미존재: bgm_missing`, `legacyGlyphPresent = false`, empty missing key lists, one visible nonblank canvas, and no console/page errors.

## Phase 203: SettingsScene Section UI Icon Runtime Wiring

Runtime SettingsScene section title icon coverage:

- Settings title icon: `settings_title.png` / texture key `ui_icon_settings_title`.
- Sound section icon: `settings_sound.png` / texture key `ui_icon_settings_sound`.
- Language section icon: `settings_language.png` / texture key `ui_icon_settings_language`.
- Accessibility section icon: `settings_accessibility.png` / texture key `ui_icon_settings_accessibility`.
- Keybind section icon: `settings_keybind.png` / texture key `ui_icon_settings_keybind`.

Production rule:

- `tools/aseprite-pipeline/scripts/create-settings-ui-icon.lua` creates the five 32x32 Aseprite source files under `assets/source/aseprite/ui/icons/system/`, with generated mirror PNG/JSON and runtime PNGs under `client/public/assets/generated/ui/icons/system/`.
- `spriteResourceManifest` maps the five `settings_*` `uiIconId` values through `getSpriteResourceForUiIcon()`.
- `SettingsScene.preload()` queues the section title UI icons, and `_addSettingsSectionHeading()` renders them as Phaser images before text labels.
- Normal labels are `설정`, `사운드`, `언어`, `접근성`, and `키바인드` without the old `⚙`/`🔊`/`🌐`/`♿`/`⌨` prefix glyphs.
- Texture-missing fallback keeps the old section glyphs observable only through fallback/QA paths.
- `aeternaSettingsFrameQa.settingsSectionIcon`, `settingsSectionLabelLegacyGlyphPresent`, and `missingSectionIconKeys` record expected/rendered keys, display sizes, fallback ids, and missing texture keys.

Exit criteria:

- Unit tests verify the five UI icon manifest entries, SettingsScene preload/render helper contract, section image object names, expected section icon count, legacy glyph removal, and QA payload fields.
- Browser QA verifies `settingsFrameQa=1` renders five section icons with `ui_icon_settings_*` texture keys, no section fallback ids, no section missing keys, and no legacy glyphs in section labels.
- Existing SettingsScene frame/action/focus icon contracts, runtime image reference coverage, public runtime roster coverage, sprite roster validation, typecheck, and build remain green.

Current QA state:

- Phase 203 implementation started on 2026-06-19.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts tests\unit\spriteResourceManifest.test.ts -t "SettingsScene 섹션|SettingsScene section|SettingsScene.*Aseprite ui icon|SettingsScene section UI|settings section UI"` failed before implementation because `SettingsScene.ts` did not import `getSpriteResourceForUiIcon()` and the `ui_icon_settings_title` manifest entry was undefined.
- GREEN: the same focused command passes after implementation with 2 tests across 2 files.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\runtimeImageRosterCoverage.test.ts` passes with 141 tests across 4 files.
- Sprite roster: `npm run art:sprite:roster` passes with `{"ok":true,"errors":[]}`.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.
- Browser QA: `?debugScene=settings&renderer=canvas&settingsFrameQa=1&qaRun=phase203-settings-section-icons` reports `aeternaSettingsFrameQa.status = ready`, `settingsSectionIcon.renderedCount = 5`, rendered keys `ui_icon_settings_title`, `ui_icon_settings_sound`, `ui_icon_settings_language`, `ui_icon_settings_accessibility`, `ui_icon_settings_keybind`, display sizes `22x22` for title and `18x18` for the other four sections, `settingsSectionLabelLegacyGlyphPresent = false`, empty `missingSectionIconKeys`, empty `fallbackSectionIconIds`, one visible nonblank canvas, and no console/page errors.
- Visual QA screenshot: `logs/phase203-settings-section-icons-visual.png` shows the title and four section headings with icon-backed labels after the loading overlay clears.

## Phase 204: ChatUI System Message UI Icon Runtime Wiring

Runtime ChatUI system message icon coverage:

- System message prefix icon: `chat_system.png` / texture key `ui_icon_chat_system`.

Production rule:

- `tools/aseprite-pipeline/scripts/create-chat-ui-icon.lua` creates the 32x32 Aseprite source file under `assets/source/aseprite/ui/icons/system/`, with generated mirror PNG/JSON and runtime PNG under `client/public/assets/generated/ui/icons/system/`.
- `spriteResourceManifest` maps `chat_system` through `getSpriteResourceForUiIcon()`.
- `preloadChatUiFrameTextures()` queues the system message UI icon with existing ChatUI frame and emoji icon assets.
- `ChatUI` renders system messages with a `14x14` `chat_system_message_icon_*` image before text when the texture exists.
- Normal system message text no longer injects the old `⚙️` prefix when the icon is rendered; texture-missing fallback keeps that glyph observable only through fallback/QA paths.
- `aeternaChatFrameQa.systemMessageIcon`, `systemMessageLegacyGlyphPresent`, and `missingSystemMessageIconKeys` record expected/rendered count, texture keys, display sizes, legacy glyph presence, and missing texture keys.

Exit criteria:

- Unit tests verify the `ui_icon_chat_system` manifest entry, ChatUI preload/render contract, system message image object names, display size, legacy glyph fallback gate, and QA payload fields.
- Browser QA verifies `chatFrameQa=1` renders one system message icon with `ui_icon_chat_system`, `14x14` display size, no legacy `⚙` glyph in visible messages, and no missing system icon keys.
- Existing ChatUI frame/emoji icon contracts, runtime image reference coverage, public runtime roster coverage, sprite roster validation, typecheck, and build remain green.

Current QA state:

- Phase 204 implementation started on 2026-06-19.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts tests\unit\spriteResourceManifest.test.ts -t "ChatUI.*system|chat system|독립 ChatUI"` failed before implementation because `ChatUI.ts` did not import `getSpriteResourceForUiIcon()` and the `ui_icon_chat_system` manifest entry was undefined.
- GREEN: the same focused command passes after implementation with 2 tests across 2 files.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\runtimeImageRosterCoverage.test.ts` passes with 142 tests across 4 files.
- Sprite roster: `npm run art:sprite:roster` passes with `{"ok":true,"errors":[]}`.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.
- Browser QA: `?debugScene=chat&renderer=canvas&chatFrameQa=1&qaRun=phase204-chat-system-icon` reports `aeternaChatFrameQa.status = ready`, `systemMessageIcon.iconId = chat_system`, `renderedCount = 1`, `expectedVisibleCount = 1`, rendered key `ui_icon_chat_system`, display size `14x14`, `systemMessageLegacyGlyphPresent = false`, empty `missingSystemMessageIconKeys`, `chat_system.png` response status `200`, one visible nonblank canvas, and no console/page errors.
- Visual QA screenshot: `logs/phase204-chat-system-icon.png` shows the standalone ChatUI panel with an image-backed system message row.

## Phase 205: TutorialManager Next Button Icon Runtime Wiring

Runtime TutorialManager next button icon coverage:

- Next button icon: `skill_mw_arrow.png` / texture key `skill_mw_arrow_icon`.

Production rule:

- `preloadTutorialManagerUiFrameTextures()` queues the existing Aseprite `skill_mw_arrow` skill icon with the TutorialManager DOM panel and action button frames.
- `TutorialManager.renderOverlay()` renders the next button as text `다음` plus a DOM `img` backed by `skill_mw_arrow_icon` when the texture exists.
- Phaser DOM layer scaling makes a `24x24` inline image render as `16x16` at the QA viewport; the QA probe records the actual `getBoundingClientRect()` display size.
- Texture-missing fallback keeps the old `다음 →` label observable only through fallback/QA paths.
- `aeternaTutorialManagerFrameQa.nextButtonIcon`, `nextButtonLegacyGlyphPresent`, and `missingNextButtonIconKeys` record expected/rendered count, texture key, display size, natural size, legacy glyph presence, and missing texture keys.

Exit criteria:

- Unit tests verify the TutorialManager next icon preload contract, DOM `img` data attributes, CSS source size, removal of direct `다음 →` normal markup, and QA payload fields.
- Browser QA verifies `tutorialManagerFrameQa=1` renders one next button icon with `skill_mw_arrow_icon`, actual display size `16x16`, no legacy `→` text in the next button, no missing icon keys, and nonblank canvas output.
- Existing TutorialManager frame contracts, runtime image reference coverage, public runtime roster coverage, sprite roster validation, typecheck, and build remain green.

Current QA state:

- Phase 205 implementation started on 2026-06-19.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts -t "TutorialManager는 Aseprite UI frame"` failed before implementation because `TutorialManager.ts` did not import `getSpriteResourceForSkillIcon()` or define the next button icon contract.
- GREEN: the same focused command passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\runtimeImageRosterCoverage.test.ts` passes with 142 tests across 4 files.
- Sprite roster: `npm run art:sprite:roster` passes with `{"ok":true,"errors":[]}`.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.
- Browser QA: `?debugScene=tutorialManager&renderer=canvas&tutorialManagerFrameQa=1&qaRun=phase205-tutorial-manager-next-icon` reports `aeternaTutorialManagerFrameQa.status = ready`, `nextButtonIcon.iconId = skill_mw_arrow`, rendered key `skill_mw_arrow_icon`, `renderedCount = 1`, `expectedCount = 1`, display size `16x16`, natural size `64x64`, `nextButtonLegacyGlyphPresent = false`, empty `missingNextButtonIconKeys`, `skill_mw_arrow.png` response status `200`, one visible nonblank canvas, and no console/page errors.
- Visual QA screenshot: `logs/phase205-tutorial-manager-next-icon.png` shows the TutorialManager DOM next button with an image-backed arrow.

## Phase 206: ComboUI Hint Separator Icon Runtime Wiring

Runtime ComboUI hint separator icon coverage:

- Hint separator icon: `skill_mw_arrow.png` / texture key `skill_mw_arrow_icon`.

Production rule:

- `preloadComboUiFrameTextures()` queues the existing Aseprite `skill_mw_arrow` skill icon with the ComboUI chain gauge frame and combo achieved icon.
- `ComboUI.updateHints()` splits each hint row into left text, a `14x14` `combo_ui_hint_separator_icon_*` image, and right text when the texture exists.
- Normal hint rows no longer inject the old `→` separator glyph while the icon texture is available.
- Texture-missing fallback keeps the old `→` separator observable only through fallback/QA paths.
- `aeternaComboFrameQa.hintSeparatorIcon`, `hintTextLegacyArrowPresent`, and `missingHintSeparatorIconKeys` record expected/rendered count, texture keys, display sizes, legacy glyph presence, and missing texture keys.

Exit criteria:

- Unit tests verify the ComboUI hint separator icon id, preload call, render object names, display size, nearest filtering, removal of the direct normal `→` row string, and QA payload fields.
- Browser QA verifies `comboFrameQa=1` renders two hint separator icons with `skill_mw_arrow_icon`, display size `14x14`, no legacy `→` text in hint rows, no missing icon keys, and nonblank canvas output.
- Existing ComboUI chain gauge, combo achieved icon, runtime image reference coverage, public runtime roster coverage, sprite roster validation, typecheck, and build remain green.

Current QA state:

- Phase 206 implementation started on 2026-06-19.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts -t "힌트 구분자"` failed before implementation because `ComboUI.ts` did not define the hint separator icon contract.
- GREEN: the same focused command passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\runtimeImageRosterCoverage.test.ts` passes with 143 tests across 4 files.
- Sprite roster: `npm run art:sprite:roster` passes with `{"ok":true,"errors":[]}`.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.
- Browser QA: `?debugScene=combo&renderer=canvas&comboFrameQa=1&qaRun=phase206-combo-hint-separator-icon` reports `aeternaComboFrameQa.status = ready`, `hintCount = 2`, `hintSeparatorIcon.iconId = skill_mw_arrow`, rendered keys `skill_mw_arrow_icon`, `renderedCount = 2`, `expectedCount = 2`, display sizes `14x14`, `hintTextLegacyArrowPresent = false`, empty `missingHintSeparatorIconKeys`, `skill_mw_arrow.png` response status `200`, one visible nonblank canvas, and no console/page errors.
- Visual QA screenshot: `logs/phase206-combo-hint-separator-icon.png` shows the ComboUI QA scene with image-backed hint separators.

## Phase 207: GameScene Field Monster Fallback Image Runtime Wiring

Runtime GameScene missing field monster fallback coverage:

- Normal fallback image: `battle_monster_fallback.png` / texture key `battle_monster_fallback`.
- Boss fallback image: `battle_boss_fallback.png` / texture key `battle_boss_fallback`.

Production rule:

- `GameScene.preload()` queues the same Aseprite battle monster fallback PNGs used by `BattleScene`.
- `_spawnMonster()` still uses the monster spritesheet manifest first. If a field monster id has no manifest sprite, it now renders `battle_monster_fallback` or `battle_boss_fallback` before the older color rectangle plus emoji fallback.
- Field display sizes are `56x56` for normal missing monsters and `72x72` for boss missing monsters.
- Texture-missing fallback keeps the old procedural rectangle and `GameScene.MONSTER_EMOJIS` path observable only when the generic Aseprite fallback texture is also unavailable.
- `?debugScene=game&renderer=canvas&fieldMonsterFallbackQa=1` spawns one missing normal monster and one missing boss monster, then writes `aeternaGameFieldMonsterFallbackQa` with rendered count, image keys, display sizes, legacy emoji presence, and missing texture keys.

Exit criteria:

- Unit tests verify `GAME_SCENE_FIELD_MONSTER_FALLBACK_TEXTURES`, preload wiring, debug-scene QA route, image object names, display sizes through QA, legacy emoji fallback gate, and QA payload fields.
- Browser QA verifies two fallback images render with `battle_monster_fallback` and `battle_boss_fallback`, no legacy emoji fallback is visible, both runtime PNG requests return `200`, and the canvas is nonblank.
- Existing GameScene monster sprite manifest, boss label icon, zone label icon, connection icon, runtime image reference coverage, public runtime roster coverage, sprite roster validation, typecheck, and build remain green.

Current QA state:

- Phase 207 implementation started on 2026-06-19.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "missing field monster"` failed before implementation because `GameScene.ts` did not define `fieldMonsterFallbackQa` or `GAME_SCENE_FIELD_MONSTER_FALLBACK_TEXTURES`.
- GREEN: the same focused command passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\runtimeImageRosterCoverage.test.ts` passes with 144 tests across 4 files.
- Sprite roster: `npm run art:sprite:roster` passes with `{"ok":true,"errors":[]}`.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.
- Browser QA: `?debugScene=game&renderer=canvas&fieldMonsterFallbackQa=1&qaRun=phase207-field-monster-fallback` reports `aeternaGameFieldMonsterFallbackQa.status = ready`, `renderedCount = 2`, rendered keys `battle_monster_fallback` and `battle_boss_fallback`, display sizes `56x56` and `72x72`, `legacyEmojiPresent = false`, empty `missingFieldMonsterFallbackKeys`, both fallback PNG responses `200`, one visible nonblank canvas, and no console/page errors.
- Visual QA screenshot: `logs/phase207-field-monster-fallback.png` shows the GameScene field with image-backed missing normal and boss monster fallback sprites.

## Phase 208: GameScene Field NPC Placeholder Runtime Wiring

Runtime GameScene missing field NPC fallback coverage:

- Missing NPC fallback image: `placeholder.png` / texture key `placeholder`.

Production rule:

- `GameScene.preload()` queues the common Aseprite placeholder PNG from `assets/generated/ui/placeholders/placeholder.png`.
- `_spawnNpc()` still uses the NPC spritesheet manifest first, then legacy `NPC_SPRITE_MAP` textures for existing field NPCs.
- If a field NPC id has neither manifest sprite nor legacy texture, `_spawnNpc()` renders the Aseprite `placeholder` image at `48x64` before the older green procedural rectangle fallback.
- Texture-missing fallback keeps the old `32x48` procedural rectangle path observable only when the common Aseprite placeholder texture is also unavailable.
- `?debugScene=game&renderer=canvas&fieldNpcFallbackQa=1` spawns one missing NPC, then writes `aeternaGameFieldNpcFallbackQa` with rendered count, image key, display size, procedural rectangle presence, and missing texture keys.

Exit criteria:

- Unit tests verify `GAME_SCENE_FIELD_NPC_FALLBACK_TEXTURE`, preload wiring, debug-scene QA route, image object names, display sizes through QA, procedural rectangle fallback gate, and QA payload fields.
- Browser QA verifies one fallback image renders with `placeholder`, no procedural rectangle fallback is active, the runtime PNG request returns `200`, and the canvas is nonblank.
- Existing GameScene NPC sprite manifest, field monster fallback, fallback texture, runtime image reference coverage, public runtime roster coverage, sprite roster validation, typecheck, and build remain green.

Current QA state:

- Phase 208 implementation started on 2026-06-19.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "missing field NPC"` failed before implementation because `GameScene.ts` did not define `fieldNpcFallbackQa`.
- GREEN: the same focused command passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts tests\unit\spriteResourceManifest.test.ts tests\unit\fallbackTextureAssets.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\runtimeImageRosterCoverage.test.ts` passes with 146 tests across 5 files.
- Sprite roster: `npm run art:sprite:roster` passes with `{"ok":true,"errors":[]}`.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.
- Browser QA: `?debugScene=game&renderer=canvas&fieldNpcFallbackQa=1&qaRun=phase208-field-npc-fallback` reports `aeternaGameFieldNpcFallbackQa.status = ready`, `renderedCount = 1`, rendered key `placeholder`, display size `48x64`, `proceduralRectanglePresent = false`, empty `missingFieldNpcFallbackKeys`, `placeholder.png` response `200`, one visible nonblank canvas, and no console/page errors.
- Visual QA screenshot: `logs/phase208-field-npc-fallback.png` shows the GameScene field with an image-backed missing NPC placeholder fallback.

## Phase 209: DungeonScene Player Thumbnail Fallback Runtime Wiring

Runtime DungeonScene missing player spritesheet fallback coverage:

- Player fallback image: `char_battle_<classId>.png` / texture key `char_battle_<classId>`.
- Current QA route coverage: `ether_knight` uses `char_battle_ether_knight.png`.

Production rule:

- `DungeonScene.preload()` queues the current class id's Aseprite battle thumbnail from `assets/generated/characters/class_main/battle/char_battle_<classId>.png`.
- `_createPlayer()` still uses `characterSpriteManifest` full character spritesheet frame `0` first.
- If the full spritesheet is unavailable, `_createPlayer()` renders `dungeon_player_thumbnail_fallback` as a `56x84` image before the legacy `dungeon_player` side illustration and rectangle fallback.
- `dungeonPlayerThumbnailFallbackQa=1` intentionally skips the manifest sheet so the thumbnail fallback path can be tested deterministically.
- `aeternaDungeonPlayerThumbnailFallbackQa` records class id, texture key/path, rendered count, display size, legacy side illustration fallback state, rectangle fallback state, visible canvas count, and missing thumbnail keys.

Exit criteria:

- Unit tests verify the thumbnail resource table, preload wiring, debug-scene QA route, fallback object name, display size, legacy fallback gates, and QA payload fields.
- Browser QA verifies one thumbnail fallback image renders with `char_battle_ether_knight`, the side illustration and rectangle fallback stay inactive, the runtime PNG request returns `200`, and the canvas is nonblank.
- Existing DungeonScene player spritesheet behavior, Dungeon frame QA, character battle thumbnail assets, runtime image reference coverage, public runtime roster coverage, sprite roster validation, typecheck, and build remain green.

Current QA state:

- Phase 209 implementation started on 2026-06-19.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\characterSpriteManifest.test.ts -t "battle thumbnail before side illustration"` failed before implementation because `DungeonScene.ts` did not define `dungeonPlayerThumbnailFallbackQa`.
- GREEN: the same focused command passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\characterSpriteManifest.test.ts tests\unit\characterBattleThumbnailAssets.test.ts tests\unit\uiFrameAssets.test.ts tests\unit\spriteResourceManifest.test.ts tests\unit\fallbackTextureAssets.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\runtimeImageRosterCoverage.test.ts` passes with 186 tests across 7 files.
- Sprite roster: `npm run art:sprite:roster` passes with `{"ok":true,"errors":[]}`.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.
- Browser QA: `?debugScene=dungeon&renderer=canvas&dungeonFrameQa=ready&dungeonPlayerThumbnailFallbackQa=1&class=ether_knight&qaRun=phase209-dungeon-player-thumbnail-fallback` reports `aeternaDungeonPlayerThumbnailFallbackQa.status = ready`, `renderedCount = 1`, texture key `char_battle_ether_knight`, path `assets/generated/characters/class_main/battle/char_battle_ether_knight.png`, display size `56x84`, `illustrationFallbackRendered = false`, `rectangleFallbackRendered = false`, empty `missingDungeonPlayerThumbnailKeys`, `char_battle_ether_knight.png` response `200`, one visible nonblank canvas, and no console/page errors.
- Visual QA screenshot: `logs/phase209-dungeon-player-thumbnail-fallback.png` shows DungeonScene with an image-backed player battle thumbnail fallback.

## Phase 210: DungeonScene Clear Reward Icon Runtime Wiring

Runtime DungeonScene clear reward marker coverage:

- EXP reward marker: `skill_ek_passive.png` / texture key `skill_ek_passive_icon`.
- Gold reward marker: `ITM-MAT-002.png` / texture key `icon_item_ITM-MAT_002`.

Production rule:

- `DungeonScene.preload()` queues the EXP skill icon and Gold item icon through the same Aseprite resource helpers used by battle reward UI.
- `_showVictory()` renders `dungeon_reward_exp_icon` and `dungeon_reward_gold_icon` as `18x18` nearest-filtered images beside the reward value text.
- Reward text, lobby return input, and reward calculation stay in the existing dynamic Phaser UI flow.
- If an icon texture is unavailable, the QA probe records the fallback kind and missing texture key instead of silently reporting success.
- `dungeonFrameQa=clear` records `rewardIcon`, `missingRewardIconKeys`, and `rewardLabelLegacyGlyphPresent` so the clear reward panel remains image-backed and free of legacy reward emoji labels.

Exit criteria:

- Unit tests verify reward icon resource ids, preload wiring, image object names, display sizes, fallback tracking, and QA payload fields.
- Browser QA verifies two reward icons render with `skill_ek_passive_icon` and `icon_item_ITM-MAT_002`, both runtime PNG requests return `200`, no reward legacy glyphs are present, and the canvas is nonblank.
- Existing DungeonScene frame/title/return icon behavior, runtime image reference coverage, public runtime roster coverage, sprite roster validation, typecheck, and build remain green.

Current QA state:

- Phase 210 implementation started on 2026-06-19.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts -t "클리어 보상 패널"` failed before implementation because `DungeonScene.ts` did not import `getItemIconResource` or define the clear reward icon runtime contract.
- GREEN: the same focused command passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\runtimeImageRosterCoverage.test.ts` passes with 146 tests across 4 files.
- Sprite roster: `npm run art:sprite:roster` passes with `{"ok":true,"errors":[]}`.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.
- Diff check: `git diff --check` passes with only existing Windows LF-to-CRLF working-copy warnings.
- Browser QA: `?debugScene=dungeon&renderer=canvas&dungeonFrameQa=clear&class=ether_knight&qaRun=phase210-dungeon-clear-reward-icons` reports `aeternaDungeonFrameQa.status = ready`, mode `clear`, reward icon `expectedCount = 2`, `renderedCount = 2`, rendered keys `skill_ek_passive_icon` and `icon_item_ITM-MAT_002`, both display sizes `18x18`, empty `fallbackKinds`, empty `missingRewardIconKeys`, `rewardLabelLegacyGlyphPresent = false`, both reward PNG responses `200`, one visible nonblank canvas, and no console/page errors.
- Visual QA screenshot: `logs/phase210-dungeon-clear-reward-icons.png` shows DungeonScene clear rewards with image-backed EXP and Gold markers.

## Phase 211: DungeonScene Monster Preview Fallback Runtime Wiring

Runtime DungeonScene missing monster preview fallback coverage:

- Normal preview fallback image: `battle_monster_fallback.png` / texture key `battle_monster_fallback`.
- Boss preview fallback image: `battle_boss_fallback.png` / texture key `battle_boss_fallback`.
- Current QA route coverage: normal wave preview fallback uses 4 generic normal fallback images.

Production rule:

- `DungeonScene.preload()` queues both generic Aseprite monster fallback images alongside the normal preview textures.
- `_spawnEnemyPreview()` still uses the monster-specific preview texture first.
- If a preview texture is unavailable, or `dungeonMonsterFallbackQa=1` intentionally bypasses preview textures, the scene renders `dungeon_monster_fallback_normal_<index>` or `dungeon_monster_fallback_boss_<index>` image objects before the old generated texture plus emoji text fallback.
- Normal fallback images render at `56x56`; boss fallback images render at `80x80`.
- `aeternaDungeonMonsterFallbackQa` records expected/rendered count, fallback image texture keys, display sizes, legacy emoji fallback state, visible canvas count, and missing fallback keys.

Exit criteria:

- Unit tests verify `DUNGEON_MONSTER_FALLBACK_TEXTURES`, preload wiring, debug-scene QA route, preview bypass branch, image object names, display sizes through QA, legacy emoji fallback gate, and QA payload fields.
- Browser QA verifies 4 normal fallback images render with `battle_monster_fallback`, no legacy emoji fallback is visible, both normal and boss fallback PNG requests return `200`, and the canvas is nonblank.
- Existing DungeonScene frame/title/reward/player fallback behavior, runtime image reference coverage, public runtime roster coverage, sprite roster validation, typecheck, and build remain green.

Current QA state:

- Phase 211 implementation started on 2026-06-19.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "DungeonScene missing monster previews"` failed before implementation because `DungeonScene.ts` did not define `dungeonMonsterFallbackQa` or the monster preview fallback runtime contract.
- GREEN: the same focused command passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\uiFrameAssets.test.ts tests\unit\characterSpriteManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\runtimeImageRosterCoverage.test.ts` passes with 185 tests across 5 files.
- Sprite roster: `npm run art:sprite:roster` passes with `{"ok":true,"errors":[]}`.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.
- Diff check: `git diff --check` passes with only existing Windows LF-to-CRLF working-copy warnings.
- Browser QA: `?debugScene=dungeon&renderer=canvas&dungeonFrameQa=ready&dungeonMonsterFallbackQa=1&class=ether_knight&qaRun=phase211-dungeon-monster-fallback` reports `aeternaDungeonMonsterFallbackQa.status = ready`, `expectedFallbackCount = 4`, `renderedCount = 4`, fallback image key `battle_monster_fallback`, all display sizes `56x56`, `legacyEmojiPresent = false`, empty `missingDungeonMonsterFallbackKeys`, both fallback PNG responses `200`, one visible nonblank canvas, and no console/page errors.
- Visual QA screenshot: `logs/phase211-dungeon-monster-fallback.png` shows DungeonScene wave previews with image-backed generic monster fallback sprites.

## Phase 212: GameScene Remote Player Thumbnail Fallback Runtime Wiring

Runtime GameScene remote player fallback coverage:

- Remote player fallback image: `char_battle_<classId>.png` / texture key `char_battle_<classId>`.
- Current QA route coverage: `ether_knight` uses `char_battle_ether_knight.png`.

Production rule:

- `GameScene.preload()` queues the character battle thumbnail resources alongside the character spritesheet manifest.
- `_spawnRemotePlayerPreview()` still uses `characterSpriteManifest` full character spritesheet frame `0` first when the remote class spritesheet texture is available.
- If the remote class spritesheet is unavailable, or `remotePlayerFallbackQa=1` intentionally bypasses the spritesheet path, the scene renders `game_scene_remote_player_thumbnail_fallback_<characterId>` as a `40x60` image before the old `40x56` rectangle fallback.
- `aeternaGameRemotePlayerFallbackQa` records class id, thumbnail texture key/path, rendered count, display size, rectangle fallback state, visible canvas count, and missing thumbnail keys.

Exit criteria:

- Unit tests verify debug-scene QA route wiring, character thumbnail preload, remote spawn helper, image object name, display size, rectangle fallback gate, and QA payload fields.
- Browser QA verifies one thumbnail fallback image renders with `char_battle_ether_knight`, the rectangle fallback stays inactive, the runtime PNG request returns `200`, and the canvas is nonblank.
- Existing GameScene remote player spritesheet behavior, Dungeon player/monster fallback behavior, runtime image reference coverage, public runtime roster coverage, sprite roster validation, typecheck, and build remain green.

Current QA state:

- Phase 212 implementation started on 2026-06-19.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\characterSpriteManifest.test.ts -t "remote players"` failed before implementation because `GameScene.ts` did not define `remotePlayerFallbackQa`.
- GREEN: the same focused command passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\characterSpriteManifest.test.ts tests\unit\characterBattleThumbnailAssets.test.ts tests\unit\spriteResourceManifest.test.ts tests\unit\uiFrameAssets.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\runtimeImageRosterCoverage.test.ts` passes with 187 tests across 6 files.
- Sprite roster: `npm run art:sprite:roster` passes with `{"ok":true,"errors":[]}`.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.
- Diff check: `git diff --check` passes with only existing Windows LF-to-CRLF working-copy warnings.
- Browser QA: `?debugScene=game&renderer=canvas&remotePlayerFallbackQa=1&class=ether_knight&qaRun=phase212-remote-player-thumbnail-fallback` reports `aeternaGameRemotePlayerFallbackQa.status = ready`, `expectedCount = 1`, `renderedCount = 1`, thumbnail key `char_battle_ether_knight`, path `assets/generated/characters/class_main/battle/char_battle_ether_knight.png`, display size `40x60`, `rectangleFallbackRendered = false`, empty `missingRemotePlayerThumbnailKeys`, two `char_battle_ether_knight.png` responses `200`, one visible nonblank canvas, and no console/page/request errors.
- Visual QA screenshot: `logs/phase212-remote-player-thumbnail-fallback.png` shows GameScene with an image-backed remote player battle thumbnail fallback.

## Phase 213: GameScene Local Player Thumbnail Fallback Runtime Wiring

Runtime GameScene local player fallback coverage:

- Local player fallback image: `char_battle_<classId>.png` / texture key `char_battle_<classId>`.
- Current QA route coverage: `ether_knight` uses `char_battle_ether_knight.png`.

Production rule:

- `GameScene.preload()` already queues the character battle thumbnail resources alongside the character spritesheet manifest.
- `createPlayer()` still uses the active-skin `characterSpriteManifest` full character spritesheet frame `0` first when that spritesheet texture is available.
- If the local class spritesheet is unavailable, or `localPlayerFallbackQa=1` intentionally bypasses the spritesheet path, the scene uses `char_battle_<classId>` as the local physics sprite texture before the legacy `player_sprite` front illustration/texture fallback.
- The thumbnail fallback keeps the existing physics body, camera follow, input handling, HUD, and combat effect wiring unchanged.
- `aeternaGameLocalPlayerFallbackQa` records class id, selected texture key, thumbnail texture key/path, rendered count, display size, legacy fallback state, visible canvas count, and missing thumbnail keys.

Exit criteria:

- Unit tests verify debug-scene QA route wiring, character thumbnail preload reuse, local player fallback branch, image object name, legacy fallback gate, and QA payload fields.
- Browser QA verifies one local thumbnail fallback sprite renders with `char_battle_ether_knight`, the legacy fallback stays inactive, the runtime PNG request returns `200`, and the canvas is nonblank.
- Existing GameScene local/remote spritesheet behavior, Dungeon player/monster fallback behavior, runtime image reference coverage, public runtime roster coverage, sprite roster validation, typecheck, and build remain green.

Current QA state:

- Phase 213 implementation started on 2026-06-19.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\characterSpriteManifest.test.ts -t "player fallback texture"` failed before implementation because `GameScene.ts` did not define `localPlayerFallbackQa`.
- GREEN: the same focused command passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\characterSpriteManifest.test.ts tests\unit\characterBattleThumbnailAssets.test.ts tests\unit\spriteResourceManifest.test.ts tests\unit\uiFrameAssets.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\runtimeImageRosterCoverage.test.ts` passes with 187 tests across 6 files.
- Sprite roster: `npm run art:sprite:roster` passes with `{"ok":true,"errors":[]}`.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.
- Browser QA: `?debugScene=game&renderer=canvas&localPlayerFallbackQa=1&class=ether_knight&qaRun=phase213-local-player-thumbnail-fallback` reports `aeternaGameLocalPlayerFallbackQa.status = ready`, `classId = ether_knight`, selected texture key `char_battle_ether_knight`, `expectedCount = 1`, `renderedCount = 1`, path `assets/generated/characters/class_main/battle/char_battle_ether_knight.png`, display size `64x96`, `legacyFallbackRendered = false`, empty `missingLocalPlayerThumbnailKeys`, two `char_battle_ether_knight.png` responses `200`, one visible nonblank canvas, and no console/page/request errors.
- Visual QA screenshot: `logs/phase213-local-player-thumbnail-fallback.png` shows GameScene with an image-backed local player battle thumbnail fallback.

## Phase 214: BattleScene Ally Placeholder Fallback Runtime Wiring

Runtime BattleScene missing ally spritesheet/thumbnail fallback coverage:

- Ally fallback image: `placeholder.png` / texture key `placeholder`.
- Current QA route coverage: `missing_class` intentionally has no manifest sheet and no `char_battle_missing_class` thumbnail.

Production rule:

- `BattleScene.preload()` queues the common Aseprite placeholder PNG from `assets/generated/ui/placeholders/placeholder.png`.
- `_spawnAllies()` still uses `characterSpriteManifest` full character spritesheet first, then `char_battle_<classId>.png` battle thumbnail if that static texture is available.
- If both character resources are unavailable, `_spawnAllies()` renders `battle_ally_fallback_<unitId>` as a `48x64` `placeholder` image before the old blue procedural rectangle fallback.
- Texture-missing fallback keeps the old `48x64` blue rectangle path observable only when the common Aseprite placeholder texture is also unavailable.
- `?debugScene=battle&renderer=canvas&battleAllyFallbackQa=1&class=missing_class` writes `aeternaBattleAllyFallbackQa` with expected/rendered count, fallback image key/name, display size, rectangle fallback state, visible canvas count, and missing texture keys.

Exit criteria:

- Unit tests verify `BATTLE_ALLY_FALLBACK_TEXTURE`, preload wiring, debug-scene QA route, fallback object name, display size, rectangle fallback gate, and QA payload fields.
- Browser QA verifies one fallback image renders with `placeholder`, no rectangle fallback is active, the runtime PNG request returns `200`, and the canvas is nonblank.
- Existing BattleScene character sheet/thumbnail behavior, GameScene and DungeonScene player fallback behavior, runtime image reference coverage, public runtime roster coverage, sprite roster validation, typecheck, and build remain green.

Current QA state:

- Phase 214 implementation started on 2026-06-19.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\characterSpriteManifest.test.ts -t "BattleScene prioritizes"` failed before implementation because `BattleScene.ts` did not define `battleAllyFallbackQa`.
- GREEN: the same focused command passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\characterSpriteManifest.test.ts tests\unit\characterBattleThumbnailAssets.test.ts tests\unit\spriteResourceManifest.test.ts tests\unit\uiFrameAssets.test.ts tests\unit\fallbackTextureAssets.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\runtimeImageRosterCoverage.test.ts` passes with 188 tests across 7 files.
- Sprite roster: `npm run art:sprite:roster` passes with `{"ok":true,"errors":[]}`.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.
- Browser QA: `?debugScene=battle&renderer=canvas&battleAllyFallbackQa=1&class=missing_class&qaRun=phase214-battle-ally-placeholder-fallback` reports `aeternaBattleAllyFallbackQa.status = ready`, `expectedCount = 1`, `renderedCount = 1`, fallback texture key `placeholder`, path `assets/generated/ui/placeholders/placeholder.png`, fallback image name `battle_ally_fallback_player_1`, display size `48x64`, `rectangleFallbackRendered = false`, empty `missingBattleAllyFallbackKeys`, `placeholder.png` response `200`, one visible nonblank canvas, and no console/page/request errors.
- Visual QA screenshot: `logs/phase214-battle-ally-placeholder-fallback.png` shows BattleScene with an image-backed ally placeholder fallback.

## Phase 215: CharacterSelect Class Card Avatar Runtime Wiring

Runtime CharacterSelect create-mode class card avatar coverage:

- Class card avatar images: `char_battle_<classId>.png` / texture keys `char_battle_ether_knight`, `char_battle_memory_weaver`, `char_battle_shadow_weaver`, `char_battle_memory_breaker`, `char_battle_time_guardian`, `char_battle_void_wanderer`.
- Current QA route coverage: `debugScene=characterSelect` with no existing character enters create mode and renders all six class cards.

Production rule:

- `CharacterSelectScene.preload()` already queues all six class battle thumbnail PNGs.
- `_createClassCard()` now renders `character_select_class_card_avatar_<classId>` as a `54x81` nearest-filtered Aseprite image before the older front illustration and color circle fallback.
- Texture-missing fallback keeps the previous front illustration path, then the color circle path, observable only when the class battle thumbnail is unavailable.
- `?debugScene=characterSelect&renderer=canvas&characterSelectFrameQa=1` writes `aeternaCharacterSelectFrameQa.classCardAvatar` with expected/rendered count, expected/rendered keys, display sizes, fallback class ids, and missing texture keys.

Exit criteria:

- Unit tests verify class card avatar constants, preload reuse, runtime image object name, display size, fallback tracking arrays, and QA payload fields.
- Browser QA verifies all six class card avatars render with `char_battle_*`, all six runtime PNG requests return `200`, no class card avatar fallback is active, and the canvas is nonblank.
- Existing CharacterSelect card/input/action/logout/existing-avatar frame behavior, character battle thumbnail asset coverage, runtime image reference coverage, public runtime roster coverage, and typecheck remain green.

Current QA state:

- Phase 215 implementation started on 2026-06-19.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts -t "캐릭터 선택 카드는"` failed before implementation because `CharacterSelectScene.ts` did not define `CHARACTER_SELECT_CLASS_CARD_AVATAR_WIDTH`.
- GREEN: the same focused command passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts tests\unit\characterBattleThumbnailAssets.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\runtimeImageRosterCoverage.test.ts` passes with 45 tests across 4 files.
- Typecheck: `npm --prefix client run typecheck` passes.
- Browser QA: `?debugScene=characterSelect&renderer=canvas&characterSelectFrameQa=1&qaRun=phase215-character-select-class-card-avatar` reports `aeternaCharacterSelectFrameQa.status = ready`, mode `create`, class card avatar `expectedCount = 6`, `renderedCount = 6`, rendered keys `char_battle_ether_knight`, `char_battle_memory_weaver`, `char_battle_shadow_weaver`, `char_battle_memory_breaker`, `char_battle_time_guardian`, `char_battle_void_wanderer`, all display sizes `54x81`, empty `missingClassCardAvatarKeys`, empty `fallbackClassCardAvatarIds`, all six thumbnail PNG responses `200`, one visible nonblank canvas, and no console/page/request errors.
- Visual QA screenshot: `logs/phase215-character-select-class-card-avatar.png` shows CharacterSelect create-mode cards with image-backed Aseprite class battle thumbnails.

## Phase 216: Cutscene Narrator Portrait Runtime Wiring

Runtime Cutscene narrator portrait coverage:

- Narrator portrait image: `npc_portrait_18_memory_fragment_portrait.png` / texture key `npc_portrait_18_memory_fragment_portrait`.
- Current QA route coverage: `debugScene=cutscene` starts `CutsceneScene` with speaker `내레이터`.

Production rule:

- `CutsceneScene.preload()` queues the narrator NPC portrait from `assets/generated/characters/npc/npc_portrait_18_memory_fragment_portrait.png`.
- `PORTRAIT_MAP` maps both `내레이터` and `narrator` to the Aseprite NPC portrait key instead of the old missing `portrait_narrator` key.
- `_updatePortrait()` renders `cutscene_portrait_<key>` as a `96x96` nearest-filtered image and records missing portrait keys only when the Aseprite portrait texture is unavailable.
- `?debugScene=cutscene&renderer=canvas&cutsceneFrameQa=1` writes `aeternaCutsceneFrameQa.portrait` with expected/rendered count, rendered keys, display sizes, and `missingCutscenePortraitKeys`.

Exit criteria:

- Unit tests verify narrator portrait constants, preload wiring, portrait key mapping, image render path, display size, nearest filter, and QA payload fields.
- Browser QA verifies one narrator portrait renders with `npc_portrait_18_memory_fragment_portrait`, the runtime PNG request returns `200`, no portrait key is missing, and the canvas is nonblank.
- Existing Cutscene UI frame/action button icon behavior, NPC portrait asset coverage, runtime image reference coverage, public runtime roster coverage, sprite roster validation, typecheck, and build remain green.

Current QA state:

- Phase 216 implementation started on 2026-06-19.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts -t "컷씬 대화 박스"` failed before implementation because `CutsceneScene.ts` did not define `CUTSCENE_PORTRAIT_TEXTURES`.
- GREEN: the same focused command passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\runtimeImageRosterCoverage.test.ts tests\unit\npcPortraitAssets.test.ts` passes with 44 tests across 4 files.
- Sprite roster: `npm run art:sprite:roster` passes with `{"ok":true,"errors":[]}`.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.
- Browser QA: `?debugScene=cutscene&renderer=canvas&cutsceneFrameQa=1&qaRun=phase216-cutscene-portrait` reports `aeternaCutsceneFrameQa.status = ready`, portrait `expectedCount = 1`, `renderedCount = 1`, rendered key `npc_portrait_18_memory_fragment_portrait`, display size `96x96`, empty `missingCutscenePortraitKeys`, `npc_portrait_18_memory_fragment_portrait.png` response `200`, one visible nonblank canvas, and no console/page/request errors.
- Visual QA screenshot: `logs/phase216-cutscene-portrait.png` shows CutsceneScene with an image-backed Aseprite narrator portrait.

## Phase 217: Cutscene Class Portrait Runtime Wiring

Runtime Cutscene class portrait coverage:

- Class portrait images: `char_illust_<classId>_front.png` / texture keys `char_illust_ether_knight_front`, `char_illust_memory_weaver_front`, `char_illust_shadow_weaver_front`, `char_illust_memory_breaker_front`, `char_illust_time_guardian_front`, `char_illust_void_wanderer_front`.
- Current QA route coverage: `debugScene=cutscene&cutsceneSpeaker=ether_knight` starts `CutsceneScene` with speaker `에테르 기사`.

Production rule:

- `CutsceneScene.preload()` queues the narrator portrait plus six basic class front illustration PNGs.
- `PORTRAIT_MAP` maps official class names and legacy scenario role names to Aseprite class portrait keys instead of missing `portrait_*` keys.
- Direct legacy `line.portrait` keys are normalized through `CUTSCENE_LEGACY_PORTRAIT_KEY_MAP`.
- `?debugScene=cutscene&renderer=canvas&cutsceneFrameQa=1&cutsceneSpeaker=ether_knight` writes `aeternaCutsceneFrameQa.portrait` including `preloadedTextureCount`, rendered key, display size, and missing portrait keys.

Exit criteria:

- Unit tests verify class portrait constants, preload paths, speaker mapping, debug route speaker param, QA payload `preloadedTextureCount`, and legacy portrait key normalization.
- Browser QA verifies one class portrait renders with `char_illust_ether_knight_front`, all six class front PNG preload requests return `200`, no missing portrait keys are recorded, and the canvas is nonblank.
- Existing Cutscene UI frame/action icon/narrator portrait behavior, character illustration asset coverage, runtime image reference coverage, public runtime roster coverage, sprite roster validation, typecheck, and build remain green.

Current QA state:

- Phase 217 implementation started on 2026-06-19.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts -t "컷씬 대화 박스"` failed before implementation because `CutsceneScene.ts` did not contain `key: 'char_illust_ether_knight_front'`.
- GREEN: the same focused command passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts tests\unit\characterIllustrationAssets.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\runtimeImageRosterCoverage.test.ts` passes with 45 tests across 4 files.
- Sprite roster: `npm run art:sprite:roster` passes with `{"ok":true,"errors":[]}`.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.
- Browser QA: `?debugScene=cutscene&renderer=canvas&cutsceneFrameQa=1&cutsceneSpeaker=ether_knight&qaRun=phase217-cutscene-class-portrait` reports `aeternaCutsceneFrameQa.status = ready`, portrait `preloadedTextureCount = 7`, `expectedCount = 1`, `renderedCount = 1`, rendered key `char_illust_ether_knight_front`, display size `96x96`, empty `missingCutscenePortraitKeys`, all six class front PNG responses `200`, one visible nonblank canvas, and no console/page/request errors.
- Visual QA screenshot: `logs/phase217-cutscene-class-portrait.png` shows CutsceneScene with an image-backed Aseprite class portrait.

## Phase 218: DungeonScene Boss Name Icon Runtime Wiring

Runtime DungeonScene boss name icon coverage:

- Boss name icon: `skill_ek_explode.png` / texture key `skill_ek_explode_icon`.
- Current QA route coverage: `debugScene=dungeon&dungeonFrameQa=boss` enters the boss warning flow, then spawns the boss preview label.

Production rule:

- `DungeonScene.preload()` already queues `DUNGEON_BOSS_WARNING_ICON_ID` through `spriteResourceManifest`.
- `_spawnEnemyPreview(true)` now renders `dungeon_boss_name_icon_<index>` as an `18x18` Aseprite image beside the boss name.
- If the icon texture is available, the boss name label is text-only, e.g. `기억 흡수자`; the legacy `★ <보스명> ★` string is retained only as a missing-texture fallback.
- `dungeonFrameQa=boss` now calls `_spawnEnemyPreview(true)` after the warning animation so `aeternaDungeonFrameQa.bossNameIcon` records the real boss preview label state.

Exit criteria:

- Unit tests verify the boss name icon size constant, image object name, nearest filtering, text-only label branch, fallback label branch, QA payload fields, and boss QA route preview spawn.
- Browser QA verifies one boss name icon renders with `skill_ek_explode_icon`, display size is `18x18`, no boss name icon key is missing, the boss name label has no `★` glyph, the icon PNG request returns `200`, and the canvas is nonblank.
- Existing Dungeon frame/title/action/reward/boss warning/monster fallback behavior, sprite resource coverage, runtime image reference coverage, public runtime roster coverage, typecheck, and build remain green.

Current QA state:

- Phase 218 implementation started on 2026-06-19.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts -t "던전 보스 경고"` failed before implementation because `DungeonScene.ts` did not define `DUNGEON_BOSS_NAME_ICON_SIZE`.
- GREEN: the same focused command passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\runtimeImageRosterCoverage.test.ts` passes with 147 tests across 4 files.
- Sprite roster: `npm run art:sprite:roster` passes with `{"ok":true,"errors":[]}`.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.
- Browser QA: `?debugScene=dungeon&renderer=canvas&dungeonFrameQa=boss&class=ether_knight&qaRun=phase218-dungeon-boss-name-icon` reports `aeternaDungeonFrameQa.status = ready`, `bossNameIcon.renderedCount = 1`, texture key `skill_ek_explode_icon`, display size `18x18`, empty `missingBossNameIconKeys`, `bossNameLegacyGlyphPresent = false`, `bossNameLabels = ["기억 흡수자"]`, `skill_ek_explode.png` response `200`, one visible nonblank canvas, and no console/page/request errors.
- Visual QA screenshot: `logs/phase218-dungeon-boss-name-icon.png` shows DungeonScene boss preview with an image-backed Aseprite boss name icon and a text-only boss name label.

## Phase 219: LobbyScene Town Title Zone Icon Runtime Wiring

Runtime LobbyScene town title icon coverage:

- Town title icon: `zone_aether_plains.png` / texture key `zone_aether_plains`.
- Current QA route coverage: `debugScene=lobby&lobbyTitleIconQa=1` starts LobbyScene and records the title icon render state.

Production rule:

- `LobbyScene.preload()` resolves `getSpriteResourceForWorldZoneIcon('aether_plains')`, queues `zone_aether_plains` once, and de-duplicates it against the existing bottom nav world icon preload path.
- `_drawTownBackground()` renders `lobby_title_zone_icon` as a `20x20` nearest-filtered Aseprite image beside the town title.
- If the icon texture is available, title text is `아에테리아 마을` with no `☆` decoration. The legacy `☆ 아에테리아 마을 ☆` string is retained only as a missing-texture fallback.
- `lobbyTitleIconQa=1` writes `aeternaLobbyTitleIconQa` with rendered count, texture key/path, display size, fallback state, legacy glyph state, and missing icon keys.

Exit criteria:

- Unit tests verify the worldmap manifest resource, title icon constants, preload path, image object name, display size, nearest filtering, text-only label branch, QA payload fields, and debug route parameter.
- Browser QA verifies one title icon renders with `zone_aether_plains`, display size is `20x20`, no title icon key is missing, the visible title has no `☆`/`★` glyph, the icon PNG request returns `200`, and the canvas is nonblank.
- Existing LobbyScene NPC sprite, connection, dialogue/title/focus, nav, item, gold HUD, UI frame, runtime image reference, public runtime roster coverage, and typecheck remain green.

Current QA state:

- Phase 219 implementation started on 2026-06-19.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "town title"` failed before implementation because `LobbyScene.ts` did not define `LOBBY_TITLE_ICON_ZONE_ID` or the title icon QA contract.
- GREEN: the same focused command passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\uiFrameAssets.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\runtimeImageRosterCoverage.test.ts` passes with 148 tests across 4 files.
- Typecheck: `npm --prefix client run typecheck` passes.
- Browser QA: `?debugScene=lobby&renderer=canvas&lobbyTitleIconQa=1&qaRun=phase219-lobby-title-icon` reports `aeternaLobbyTitleIconQa.status = ready`, `titleIcon.renderedCount = 1`, texture key `zone_aether_plains`, display size `20x20`, title label `아에테리아 마을`, empty `missingLobbyTitleIconKeys`, `titleLabelLegacyGlyphPresent = false`, `zone_aether_plains.png` response `200`, one visible nonblank canvas, and no console/page/request errors.
- Visual QA screenshot: `logs/phase219-lobby-title-icon.png` shows LobbyScene with an image-backed Aseprite town title icon and a text-only town title label.

## Phase 220: LobbyScene NPC Action Notification Icon Runtime Wiring

Runtime LobbyScene NPC action notification icon coverage:

- Shop notification icon: `ITM-CON-001.png` / texture key `icon_item_ITM-CON_001`.
- Enhance notification icon: `ITM-MAT-001.png` / texture key `icon_item_ITM-MAT_001`.
- Quest notification icon: `ITM-QST-004.png` / texture key `icon_item_ITM-QST_004`.
- Party notification icon: `skill_ek_slash.png` / texture key `skill_ek_slash_icon`.
- Story notification icon: `ITM-QST-001.png` / texture key `icon_item_ITM-QST_001`.
- Current QA route coverage: `debugScene=lobby&lobbyNotificationIconQa=shop|enhance|quest|party|story` starts LobbyScene, opens a deterministic notification, and records the notification icon render state.

Production rule:

- `LobbyScene` resolves notification icons through the existing item and skill icon manifests, so the action toast reuses the same Aseprite source assets as the matching panel titles.
- `_showNotification()` renders `lobby_notification_icon` as an `18x18` nearest-filtered Aseprite image before the notification label.
- If the icon texture is available, notification labels are text-only, for example `모험가 길드: 파티원을 모집합니다.`. The legacy `🛒`, `🔨`, `📜`, `⚔`, and `📖` glyph prefixes are retained only as missing-texture fallback behavior.
- `lobbyNotificationIconQa` writes `aeternaLobbyNotificationIconQa` with rendered count, texture key/path, display size, fallback state, legacy glyph state, and missing icon keys.

Exit criteria:

- Unit tests verify the item/skill manifest resources, notification icon union, constants, image object name, display size, nearest filtering, QA payload fields, debug route parameter, and removal of legacy glyph-prefixed action notification strings.
- Browser QA verifies one notification icon renders with the expected texture key, display size is `18x18`, no notification icon key is missing, the visible label has no legacy glyph prefix, the PNG request returns `200`, and the canvas is nonblank.
- Existing LobbyScene NPC sprite, connection, dialogue/title/focus, nav, item, gold HUD, town title, UI frame, runtime image reference, public runtime roster coverage, and typecheck remain green.

Current QA state:

- Phase 220 implementation started on 2026-06-19.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "NPC action notifications"` failed before implementation because `LobbyScene.ts` did not define the notification icon type or QA contract.
- GREEN: the same focused command passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\uiFrameAssets.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\runtimeImageRosterCoverage.test.ts` passes with 149 tests across 4 files.
- Typecheck: `npm --prefix client run typecheck` passes.
- Browser QA: `?debugScene=lobby&renderer=canvas&lobbyNotificationIconQa=party&qaRun=phase220-lobby-notification-icon` reports `aeternaLobbyNotificationIconQa.status = ready`, `notificationIcon.renderedCount = 1`, texture key `skill_ek_slash_icon`, display size `18x18`, notification label `모험가 길드: 파티원을 모집합니다.`, empty `missingLobbyNotificationIconKeys`, `notificationLegacyGlyphPresent = false`, `skill_ek_slash.png` response `200`, one visible nonblank canvas, and no console/page/request errors.
- Visual QA screenshot: `logs/phase220-lobby-notification-icon.png` shows LobbyScene with an image-backed Aseprite NPC action notification icon and a text-only notification label.

## Phase 221: DungeonScene Failure Title Icon Runtime Wiring

Runtime DungeonScene failure title icon coverage:

- Party wipe title icon: `status_curse.png` / texture key `status_curse_icon`.
- Time limit title icon: `skill_tg_stop.png` / texture key `skill_tg_stop_icon`.
- Current QA route coverage: `debugScene=dungeon&dungeonFrameQa=defeat|timeout` starts DungeonScene directly in deterministic failure title states and records the failure title icon render state.

Production rule:

- `DungeonScene.preload()` queues both failure title icons through the existing status/skill icon manifests.
- `_showDungeonFailureText()` renders `dungeon_failure_title_icon` as a `26x26` nearest-filtered Aseprite image beside the center failure title.
- If the icon texture is available, the title label is text-only, e.g. `패배...` or `시간 초과!`. The legacy `💀` and `⏰` glyph prefixes are retained only as missing-texture fallback behavior.
- `composeDungeonGameOverText()` remains unchanged so the existing dungeon game-over SSOT compatibility tests still preserve the legacy first-line lead strings. `DungeonScene` strips the glyph only at the display layer.
- `dungeonFrameQa=defeat|timeout` writes `aeternaDungeonFrameQa.failureTitleIcon`, `failureTitleLegacyGlyphPresent`, `missingFailureTitleIconKeys`, and `failureLabel`.

Exit criteria:

- Unit tests verify the status/skill icon mapping, preload loop, image object name, display size, nearest filtering, text-only display branch, fallback branch, QA payload fields, and expanded debug route parameters.
- Browser QA verifies each failure mode renders the expected icon key at `26x26`, records no missing failure title icon keys, strips the legacy glyph from the visible label, returns `200` for the icon PNG, and keeps the canvas nonblank.
- Existing Dungeon frame/title/action/reward/boss warning/boss name/monster fallback/player fallback behavior, dungeon game-over SSOT tests, sprite resource coverage, runtime image reference coverage, public runtime roster coverage, sprite roster validation, typecheck, and build remain green.

Current QA state:

- Phase 221 implementation started on 2026-06-19.
- RED: `npx vitest run --config tests/vitest.config.ts tests/unit/uiFrameAssets.test.ts -t "던전 실패와 시간초과"` failed before implementation because `DungeonScene.ts` did not import `getStatusIconResource()` or define the failure title icon contract.
- GREEN: the same focused command passes after implementation.
- Related coverage: `npx vitest run --config tests/vitest.config.ts tests/unit/uiFrameAssets.test.ts tests/unit/spriteResourceManifest.test.ts tests/unit/runtimeImageReferenceCoverage.test.ts tests/unit/runtimeImageRosterCoverage.test.ts tests/unit/dungeonGameOverNarration.test.ts` passes with 156 tests across 5 files.
- Sprite roster: `npm run art:sprite:roster` passes with `{"ok":true,"errors":[]}`.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.
- Browser QA: `?debugScene=dungeon&renderer=canvas&dungeonFrameQa=defeat&class=ether_knight&qaRun=phase221-defeat` reports `aeternaDungeonFrameQa.status = ready`, `failureTitleIcon.key = status_curse_icon`, display size `26x26`, empty `missingFailureTitleIconKeys`, `failureTitleLegacyGlyphPresent = false`, label `패배...\n— 기억의 끈이 끊어졌습니다.`, `status_curse.png` response `200`, one visible nonblank canvas, and no console/page/request errors.
- Browser QA: `?debugScene=dungeon&renderer=canvas&dungeonFrameQa=timeout&class=ether_knight&qaRun=phase221-timeout` reports `aeternaDungeonFrameQa.status = ready`, `failureTitleIcon.key = skill_tg_stop_icon`, display size `26x26`, empty `missingFailureTitleIconKeys`, `failureTitleLegacyGlyphPresent = false`, label `시간 초과!\n— 기억의 끈이 끊어졌습니다.`, `skill_tg_stop.png` response `200`, one visible nonblank canvas, and no console/page/request errors.
- Visual QA screenshots: `logs/phase221-dungeon-defeat-failure-title-icon.png` and `logs/phase221-dungeon-timeout-failure-title-icon.png` show DungeonScene failure titles with image-backed Aseprite icons and text-only labels.

## Phase 222: BattleUI Escape Log Highlight Icon Runtime Wiring

Runtime BattleUI escape log highlight coverage:

- Escape success / critical escape icon: `skill_vw_warp.png` / texture key `skill_vw_warp_icon`.
- Escape fail / blocked / forbidden icon: `skill_tg_stop.png` / texture key `skill_tg_stop_icon`.
- Current QA route coverage: `debugScene=battle&battleLogHighlightIconQa=escapeSuccess|escapeFail|escapeBlocked|escapeForbidden|escapeCritical` starts BattleScene, waits until the battle intro has written `전투 시작!`, then injects the deterministic escape log highlight state.

Production rule:

- `BattleUI` maps escape log highlight kinds to existing Aseprite skill icon resources and renders the highlight icon as a `16x16` nearest-filtered image.
- `composeEscapeLog()` remains unchanged so the escape narration SSOT still preserves the legacy `🏃 도주 성공!` and `❌ 도주 실패!` source strings.
- The display layer strips `🏃`, `❌`, `🚧`, `🔒`, and `🆘` only after the icon path is selected, so visible labels are text-only, e.g. `도주 성공!`, `도주 실패!`, `도주 차단!`, `도주 불가!`, and `비상 도주!`.
- The browser QA delay is fixed at `1700ms` so escape log injection happens after the battle intro no longer overwrites the highlight screenshot state.
- `battleLogHighlightIconQa` writes `aeternaBattleLogHighlightIconQa.escapeLegacyGlyphPresent` in addition to the existing legacy glyph field.

Exit criteria:

- Unit tests verify the escape icon mapping, highlight color and kind inference, QA route kinds, source messages, glyph stripping, `escapeLegacyGlyphPresent`, BattleScene escape log source preservation, and QA delay contract.
- Browser QA verifies success and failure render the expected icon keys at `16x16`, record no missing texture keys, strip the escape glyph from the visible highlight, return `200` for the skill icon PNGs, and keep the canvas nonblank.
- Existing escape narration SSOT compatibility, sprite resource coverage, runtime image reference coverage, public runtime roster coverage, sprite roster validation, typecheck, and build remain green.

Current QA state:

- Phase 222 implementation started on 2026-06-19.
- RED: `npx vitest run --config tests/vitest.config.ts tests/unit/spriteResourceManifest.test.ts -t "도주 로그 하이라이트"` failed before implementation because `BattleUI.ts` did not map escape log kinds to Aseprite icons. A second RED on the same focused command caught the missing `BATTLE_LOG_HIGHLIGHT_ICON_QA_DELAY_MS` visual-QA timing contract.
- GREEN: the same focused command passes after implementation.
- Related coverage: `npx vitest run --config tests/vitest.config.ts tests/unit/spriteResourceManifest.test.ts tests/unit/escapeNarration.test.ts tests/unit/runtimeImageReferenceCoverage.test.ts tests/unit/runtimeImageRosterCoverage.test.ts` passes with 115 tests across 4 files.
- Browser QA success route: `?debugScene=battle&renderer=canvas&battleLogHighlightIconQa=escapeSuccess&class=ether_knight&qaRun=phase222-escapeSuccess-large-*` reports `aeternaBattleLogHighlightIconQa.status = ready`, `kind = escapeSuccess`, `sourceMessage = 🏃 도주 성공!`, highlight text `도주 성공!`, icon id `skill_vw_warp`, texture key `skill_vw_warp_icon`, display size `16x16`, empty `missingBattleLogHighlightIconKeys`, `legacyGlyphPresent = false`, `escapeLegacyGlyphPresent = false`, `skill_vw_warp.png` response `200`, one visible nonblank canvas, and no console/page/request errors.
- Browser QA failure route: `?debugScene=battle&renderer=canvas&battleLogHighlightIconQa=escapeFail&class=ether_knight&qaRun=phase222-escapeFail-large-*` reports `aeternaBattleLogHighlightIconQa.status = ready`, `kind = escapeFail`, `sourceMessage = ❌ 도주 실패!`, highlight text `도주 실패!`, icon id `skill_tg_stop`, texture key `skill_tg_stop_icon`, display size `16x16`, empty `missingBattleLogHighlightIconKeys`, `legacyGlyphPresent = false`, `escapeLegacyGlyphPresent = false`, `skill_tg_stop.png` response `200`, one visible nonblank canvas, and no console/page/request errors.
- Visual QA screenshots: `logs/phase222-battle-escape-success-log-icon.png` and `logs/phase222-battle-escape-fail-log-icon.png` show BattleScene log highlights with image-backed Aseprite escape icons and text-only labels.

## Phase 223: BattleScene Damage Element Tag Icon Runtime Wiring

Runtime BattleScene damage element tag icon coverage:

- Fire tag icon: `skill_ek_explode.png` / texture key `skill_ek_explode_icon`.
- Ice tag icon: `skill_mw_storm.png` / texture key `skill_mw_storm_icon`.
- Lightning tag icon: `skill_mw_bolt.png` / texture key `skill_mw_bolt_icon`.
- Shadow tag icon: `skill_mw_ultimate.png` / texture key `skill_mw_ultimate_icon`.
- Holy tag icon: `skill_mw_heal.png` / texture key `skill_mw_heal_icon`.
- Current QA route coverage: `debugScene=battle&battleElementTagIconQa=fire|ice|lightning|shadow|holy` starts BattleScene and injects a deterministic element tag above the first enemy after the intro window.

Production rule:

- `BattleScene.preload()` resolves all element tag icons through the existing skill icon manifest and shares the same preload de-duplication queue used by skill slots, combo labels, critical popups, and other battle skill-icon surfaces.
- `_spawnElementTag()` renders one `battle_element_tag_icon` as a `16x16` nearest-filtered Aseprite image beside the floating element tag whenever the icon texture exists.
- If the icon texture is available, the visible label is text-only: `화염`, `얼음`, `번개`, `그림자`, or `신성`.
- The previous visible `🔥 화염`, `❄ 얼음`, `⚡ 번개`, `🌑 그림자`, and `✨ 신성` strings remain only as missing-texture fallback behavior.
- `formatDamageTypeTag()` remains unchanged for scenario narration and SSOT compatibility; `BattleScene` strips the glyph only at the display layer by using `getDamageTypeLabel()` after the icon path is selected.
- `battleElementTagIconQa` writes `aeternaBattleElementTagIconQa.elementTagIcon`, `elementTagLegacyGlyphPresent`, `missingBattleElementTagIconKeys`, and `activeKind`.

Exit criteria:

- Unit tests verify the five skill icon manifest mappings, element tag icon id map, debug route parser, preload loop, render object names, display size, nearest filtering, text-only branch, fallback branch, and QA payload fields.
- Browser QA verifies all five element tag modes render the expected icon key at `16x16`, record no missing texture keys, strip the legacy element glyph from the visible label, return `200` for the icon PNGs, and keep the canvas nonblank.
- Existing damage type narration SSOT tests, sprite resource coverage, runtime image reference coverage, public runtime roster coverage, sprite roster validation, typecheck, and build remain green.

Current QA state:

- Phase 223 implementation started on 2026-06-19.
- RED: `npx vitest run --config tests/vitest.config.ts tests/unit/spriteResourceManifest.test.ts -t "damage element tag"` failed before implementation because `BattleScene.ts` did not define `BATTLE_ELEMENT_TAG_ICON_IDS` or the element tag icon QA contract.
- GREEN: the same focused command passes after implementation.
- Related coverage: `npx vitest run --config tests/vitest.config.ts tests/unit/spriteResourceManifest.test.ts tests/unit/damageTypeNarration.test.ts tests/unit/runtimeImageReferenceCoverage.test.ts tests/unit/runtimeImageRosterCoverage.test.ts` passes with 120 tests across 4 files.
- Sprite roster: `npm run art:sprite:roster` passes with `{"ok":true,"errors":[]}`.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.
- Browser QA fire/ice/lightning/shadow/holy routes report `aeternaBattleElementTagIconQa.status = ready`, one `16x16` element tag icon, empty `missingBattleElementTagIconKeys`, `elementTagLegacyGlyphPresent = false`, expected skill-icon PNG response `200`, one visible nonblank canvas, and no console/page/request errors.
- Visual QA screenshots: `logs/phase223-battle-element-tag-fire.png`, `logs/phase223-battle-element-tag-ice.png`, `logs/phase223-battle-element-tag-lightning.png`, `logs/phase223-battle-element-tag-shadow.png`, and `logs/phase223-battle-element-tag-holy.png` show BattleScene floating element tags with image-backed Aseprite icons and text-only labels.

## Phase 224: SkillTreeUI Advanced Class Illustration Runtime Wiring

Runtime SkillTreeUI advanced illustration coverage:

- Ether Knight advancement illustrations: `char_illust_ether_knight_adv1_front.png`, `char_illust_ether_knight_adv2_front.png`, and `char_illust_ether_knight_adv3_front.png`.
- Runtime texture keys follow the `characterIllustration` roster contract: `char_<class_id>_adv<n>`.
- Current QA route coverage: `debugScene=lobby&skillTreeQa=1&class=ether_knight` starts LobbyScene, opens SkillTreeUI, and records the advanced illustration render state.

Production rule:

- `AssetManager.preloadAdvancedCharacters()` and `SkillTreeUI` now share the same `char_<class_id>_adv<n>` key shape used by `assets/source/aseprite/sprite-production-roster.json`.
- `LobbyScene.preload()` calls `preloadSkillTreeAdvancedIllustrations()` with the same validated class id used by `_openSkillTree()`.
- `SkillTreeUI._renderTree()` renders three advanced class illustrations as `52x68` nearest-filtered images named `skill_tree_advanced_illustration_<class_id>_<n>`.
- Missing advanced illustration textures are recorded as fallback IDs and missing keys instead of silently disappearing from QA.
- `skillTreeQa=1` writes `aeternaSkillTreeFrameQa.advancedIllustration` with expected/rendered counts, expected/rendered texture keys, display sizes, fallback IDs, and missing illustration keys.

Exit criteria:

- Unit tests verify the roster key shape, SkillTreeUI helper/preload/render/QA contract, LobbyScene preload connection, and AssetManager advanced-character key alignment.
- Browser QA verifies three Ether Knight advanced illustrations render at `52x68`, record no fallback IDs or missing keys, return `200 image/png` for all three runtime PNGs, and keep the canvas nonblank.
- Existing SkillTreeUI frame/icon contracts, character illustration roster validation, sprite roster validation, typecheck, and build remain green.

Current QA state:

- Phase 224 implementation started on 2026-06-20.
- RED: `npx vitest run --config tests/vitest.config.ts tests/unit/uiFrameAssets.test.ts -t "스킬 트리 전직 일러스트"` failed before implementation because `SkillTreeUI.ts` did not define `SKILL_TREE_ADVANCED_ILLUSTRATION_COUNT` or the advanced illustration preload/QA contract.
- GREEN: the same focused command passes after implementation.
- Related coverage: `npx vitest run --config tests/vitest.config.ts tests/unit/uiFrameAssets.test.ts tests/unit/characterIllustrationAssets.test.ts` passes with 45 tests across 2 files.
- Typecheck: `npm --prefix client run typecheck` passes.
- Browser QA: `?debugScene=lobby&renderer=canvas&zone=aether_plains&skillTreeQa=1&class=ether_knight&level=15&qaRun=phase224-skill-tree-advanced-illustrations` reports `aeternaSkillTreeFrameQa.status = ready`, `advancedIllustration.renderedCount = 3`, rendered keys `char_ether_knight_adv1`, `char_ether_knight_adv2`, `char_ether_knight_adv3`, three visible `52x68` images, empty `fallbackAdvancedIllustrationIds`, empty `missingAdvancedIllustrationKeys`, all three runtime PNG responses `200 image/png`, one visible nonblank canvas, and no console/page/request errors.
- Visual QA screenshot: `logs/phase224-skill-tree-advanced-illustrations.png` shows SkillTreeUI with three image-backed Aseprite advanced class illustrations above the skill node layout.

## Phase 225: BattleScene Boss Telegraph Overhead Icon QA Route

Runtime BattleScene boss telegraph overhead icon coverage:

- Boss strong-attack overhead icon: `skill_ek_explode.png` / texture key `skill_ek_explode_icon`.
- Current QA route coverage: `debugScene=battle&battleBossTelegraphIconQa=1` starts BattleScene, marks the first enemy as a deterministic boss, calls `_showBossTelegraph()`, and records the overhead icon render state.

Production rule:

- `BattleScene.preload()` continues resolving `BATTLE_BOSS_TELEGRAPH_ICON_ID = 'skill_ek_explode'` through the existing skill icon manifest and shared skill-icon preload de-duplication queue.
- `_showBossTelegraph()` renders `battle_boss_telegraph_icon` as a `30x30` nearest-filtered Aseprite image whenever `skill_ek_explode_icon` is present.
- The visible `⚠` warning glyph remains only as the texture-missing fallback branch.
- `battleBossTelegraphIconQa=1` writes `aeternaBattleBossTelegraphIconQa` with expected/rendered texture keys, display size, fallback state, missing keys, legacy glyph state, and canvas count.

Exit criteria:

- Unit tests verify the debug route flag, QA starter, deterministic boss setup, `_showBossTelegraph()` invocation, dataset payload fields, fallback tracking, and `main.ts` route parameter.
- Browser QA verifies `skill_ek_explode_icon` renders at `30x30`, records no missing boss telegraph icon keys, avoids the legacy `⚠` glyph on the normal path, returns `200 image/png` for `skill_ek_explode.png`, keeps one visible nonblank canvas, and reports no console/page errors.
- Existing boss telegraph timing/strong-attack behavior, log highlight icon contracts, sprite resource coverage, runtime image reference coverage, public runtime roster coverage, sprite roster validation, typecheck, and build remain green.

Current QA state:

- Phase 225 implementation started on 2026-06-20.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\bossTelegraph.test.ts -t "브라우저 QA route"` failed before implementation because `BattleScene.ts` did not define `battleBossTelegraphIconQa` or the boss telegraph icon QA probe contract.
- GREEN: the same focused command passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\bossTelegraph.test.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\runtimeImageRosterCoverage.test.ts` passes with 116 tests across 4 files.
- Sprite roster: `npm run art:sprite:roster` passes with `{"ok":true,"errors":[]}`.
- Typecheck: `npm --prefix client run typecheck` passes.
- Browser QA: `?debugScene=battle&renderer=canvas&battleBossTelegraphIconQa=1&class=ether_knight&qaRun=phase225-boss-telegraph-icon` reports `aeternaBattleBossTelegraphIconQa.status = ready`, rendered key `skill_ek_explode_icon`, display size `30x30`, empty `missingBattleBossTelegraphIconKeys`, `fallbackRendered = false`, `legacyGlyphPresent = false`, `skill_ek_explode.png` response `200 image/png`, one visible nonblank canvas, and no console/page errors.
- Visual QA screenshot: `logs/phase225-battle-boss-telegraph-icon.png` shows BattleScene with the image-backed Aseprite boss telegraph overhead icon above the enemy.

## Phase 226: BattleScene Hit Slash VFX Aseprite-First Runtime Gate

Runtime BattleScene hit slash VFX coverage:

- Basic hit slash VFX: `vfx_hit_slash.png` / texture key `vfx_hit_slash_sprite`.
- Current QA route coverage: `debugScene=battle&battleHitVfxQa=critical` starts BattleScene, triggers `_showHitVFX()` on the first enemy, and records the active hit slash render state.

Production rule:

- `BattleScene.preload()` continues resolving `vfx_hit_slash` through `getSpriteResourceForVfx()` and loads the `64x64` frame spritesheet before combat starts.
- `_showHitVFX()` now renders the `vfx_hit_slash_sprite` animation as the primary path whenever the texture exists.
- The old procedural circle burst, critical ring, and radial particles are now texture-missing safety fallback only.
- `battleHitVfxQa=normal|critical|element` writes `aeternaBattleHitVfxQa` with expected/rendered texture keys, display size, procedural fallback count, missing keys, and canvas count.

Exit criteria:

- Unit tests verify the QA route mode type, `main.ts` parser, QA starter/probe, hit slash sprite tracking, Aseprite texture gate, and procedural fallback counter.
- Browser QA verifies `vfx_hit_slash_sprite` renders at critical scale `134.4x134.4`, records empty `missingBattleHitVfxKeys`, keeps `proceduralFallbackCount = 0`, returns `200 image/png` for `vfx_hit_slash.png`, keeps one visible nonblank canvas, and reports no console/page errors.
- Existing sprite resource coverage, runtime image reference coverage, public runtime roster coverage, sprite roster validation, typecheck, and build remain green.

Current QA state:

- Phase 226 implementation started on 2026-06-20.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts -t "hit VFX QA"` failed before implementation because `BattleScene.ts` did not define `BattleHitVfxQaMode`, the hit VFX QA probe, or the Aseprite-only procedural fallback gate.
- GREEN: the same focused command passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\spriteResourceManifest.test.ts tests\unit\runtimeImageReferenceCoverage.test.ts tests\unit\runtimeImageRosterCoverage.test.ts` passes with 111 tests across 3 files.
- Sprite roster: `npm run art:sprite:roster` passes with `{"ok":true,"errors":[]}`.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.
- Browser QA: `?debugScene=battle&renderer=canvas&battleHitVfxQa=critical&class=ether_knight&qaRun=phase226-battle-hit-vfx` reports `aeternaBattleHitVfxQa.status = ready`, rendered key `vfx_hit_slash_sprite`, display size `134.4x134.4`, empty `missingBattleHitVfxKeys`, `proceduralFallbackCount = 0`, `vfx_hit_slash.png` response `200 image/png`, one visible nonblank canvas, and no console/page errors.
- Visual QA screenshot: `logs/phase226-battle-hit-vfx.png` shows BattleScene with the image-backed Aseprite hit slash VFX on the enemy and no procedural burst overlay.

## Phase 227: TransitionEffects VfxPlayer Atlas-Missing Fallback Sprite

Runtime TransitionEffects VfxPlayer fallback coverage:

- Atlas-missing hit slash fallback image: `hit_fallback_slash.png` / texture key `hit_fallback_slash`.
- Additional shared fallback images: `hit_fallback_blunt.png`, `hit_fallback_magic.png`, `buff_fallback.png`.
- Current QA route coverage: `debugScene=transitionLoading&transitionVfxFallbackQa=hit_slash` starts the transition loading QA scene, preloads the fallback PNG set, plays `VfxPlayer.play('hit_slash')`, and records the rendered fallback state.

Production rule:

- `preloadVfxFallbackTextures()` loads the four Aseprite fallback PNGs before the transition QA scene starts.
- `VfxPlayer.play()` checks the configured atlas key before generating frames. If `vfx_atlas` is unavailable, it calls the fallback path immediately.
- `playFallback()` renders the mapped Aseprite fallback image first and returns the sprite so QA can inspect the texture key and display size.
- The old procedural circle is retained only as the final safety fallback when the Aseprite fallback PNG texture is also unavailable.
- `transitionVfxFallbackQa=<VfxType>` writes `aeternaTransitionVfxFallbackQa` with expected/rendered texture keys, display size, missing texture keys, procedural fallback state, and canvas count.

Exit criteria:

- Unit tests verify the public fallback texture map, preload helper, fallback selection helper, atlas-missing gate, image sprite path, final procedural fallback comment, and transition QA probe wiring.
- Browser QA verifies `hit_fallback_slash` renders as an image fallback before any procedural circle, the PNG request returns `200 image/png`, the canvas is nonblank, and no console/page errors occur.
- Existing effect fallback texture asset coverage, environment particle texture coverage, UI frame coverage, sprite roster validation, typecheck, and build remain green.

Current QA state:

- Phase 227 implementation started on 2026-06-20.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\effectFallbackTextureAssets.test.ts -t "VfxPlayer atlas-missing"` failed before implementation because `TransitionEffects.ts` did not define `VFX_FALLBACK_TEXTURES`.
- GREEN: the same focused command passes after implementation.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\effectFallbackTextureAssets.test.ts tests\unit\environmentParticleTextureAssets.test.ts tests\unit\uiFrameAssets.test.ts` passes with 47 tests across 3 files.
- Sprite roster: `npm run art:sprite:roster` passes with `{"ok":true,"errors":[]}`.
- Typecheck: `npm --prefix client run typecheck` passes.
- Browser QA: `?debugScene=transitionLoading&renderer=canvas&transitionLoadingFrameQa=1&transitionVfxFallbackQa=hit_slash&qaRun=phase227-vfx-fallback` reports `aeternaTransitionVfxFallbackQa.status = ready`, expected/rendered key `hit_fallback_slash`, display size `59.13648x59.13648`, `fallbackImageRendered = true`, `proceduralFallbackRendered = false`, empty missing texture keys, `hit_fallback_slash.png` response `200 image/png`, one visible nonblank canvas, and no console/page errors.
- Visual QA screenshot: `logs/phase227-transition-vfx-fallback.png` shows TransitionLoadingQaScene with the image-backed Aseprite hit slash fallback over the loading panel.

## Phase 228: HudOverlay Quest Objective Action Icons

Runtime HudOverlay quest action hint icon coverage:

- Explore objective: `skill_vw_warp.png` / texture key `skill_vw_warp_icon`.
- Talk objective: `chat_system.png` / texture key `ui_icon_chat_system`.
- Kill objective: `skill_ek_slash.png` / texture key `skill_ek_slash_icon`.
- Collect objective: `ITM-MAT-001.png` / texture key `icon_item_ITM-MAT_001`.
- Craft objective: `ITM-WPN-001.png` / texture key `icon_item_ITM-WPN_001`.
- Current QA route coverage: `debugScene=game&hudFrameQa=1` starts GameScene with deterministic default HUD quests and records `aeternaHudFrameQa.questActionIcon`.

Production rule:

- `questGuide.ts` resolves the first incomplete objective kind into `actionIconImageKey` and `actionIconImagePath` alongside the existing `actionHint` and `mapZoneId`.
- `questRowView.ts` renders the objective-specific Aseprite image before the action hint text. The old `skill_mw_arrow.png` marker is retained only as a fallback for legacy quest rows that do not provide action icon key/path.
- `HudOverlay.writeHudFrameQaProbe()` now builds the expected quest action icon set from each active quest row's action icon key/path, so `hudFrameQa` validates the actual objective-specific resources instead of the old generic arrow.

Exit criteria:

- Unit tests verify explore/kill objective guide fields, quest guide conversion, quest row image rendering, fallback behavior, and HudOverlay QA probe source contract.
- Browser QA verifies the default explore and collect quests render `skill_vw_warp_icon` and `icon_item_ITM-MAT_001`, do not render `skill_mw_arrow_icon`, report `aeternaHudFrameQa.status = ready`, and expose nonblank icon pixels.
- Existing sprite resource coverage, UI frame coverage, typecheck, and build remain green.

Current QA state:

- Phase 228 implementation started on 2026-06-20.
- RED: `npx vitest run --config tests\vitest.config.ts tests\unit\questGuide.test.ts tests\unit\questRowView.test.ts` failed before implementation because quest guide fields did not include objective-specific action icon key/path and quest row rendering still used the generic arrow.
- RED follow-up: `npx vitest run --config tests\vitest.config.ts tests\unit\uiFrameAssets.test.ts` failed before HudOverlay QA probe alignment because the source still expected `skill_mw_arrow_icon` for every quest action hint.
- GREEN: focused quest guide/row tests, HudOverlay source-contract tests, and related sprite manifest coverage pass.
- Related coverage: `npx vitest run --config tests\vitest.config.ts tests\unit\questGuide.test.ts tests\unit\questRowView.test.ts tests\unit\uiFrameAssets.test.ts tests\unit\spriteResourceManifest.test.ts` passes with 170 tests across 4 files.
- Typecheck: `npm --prefix client run typecheck` passes.
- Build: `npm run build:client` passes; Vite still prints the existing CJS Node API deprecation warning.
- Browser QA desktop and mobile landscape routes report `aeternaHudFrameQa.status = ready`, rendered quest action icon keys `skill_vw_warp_icon` and `icon_item_ITM-MAT_001`, empty generic-arrow usage, nonblank icon pixel probes, and visible screenshots at `logs/phase228-hud-quest-objective-icons-desktop-ready.png` and `logs/phase228-hud-quest-objective-icons-mobile-landscape-ready.png`.
