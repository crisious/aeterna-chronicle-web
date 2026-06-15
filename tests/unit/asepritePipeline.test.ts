import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const configPath = path.resolve(__dirname, '../../tools/aseprite-pipeline/aseprite.config.json');
const execFileAsync = promisify(execFile);

function createPngChunk(type: string, data = Buffer.alloc(0)): Buffer {
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  return chunk;
}

function createMinimalPng(width: number, height: number): Buffer {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  return Buffer.concat([signature, createPngChunk('IHDR', ihdr), createPngChunk('IDAT'), createPngChunk('IEND')]);
}

function createHeaderOnlyPng(width: number, height: number): Buffer {
  const buffer = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buffer, 0);
  buffer.writeUInt32BE(13, 8);
  buffer.write('IHDR', 12, 4, 'ascii');
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  buffer[24] = 8;
  buffer[25] = 6;

  return buffer;
}

function createPngWithTruncatedIdat(width: number, height: number): Buffer {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  const truncatedIdatHeader = Buffer.alloc(8);
  truncatedIdatHeader.writeUInt32BE(4, 0);
  truncatedIdatHeader.write('IDAT', 4, 4, 'ascii');

  return Buffer.concat([signature, createPngChunk('IHDR', ihdr), truncatedIdatHeader, Buffer.from([0x00, 0x01])]);
}

describe('aseprite pipeline config', () => {
  test('all categories match the graphics pipeline contract', () => {
    const config = JSON.parse(readFileSync(configPath, 'utf8'));

    expect(config).toEqual({
      sourceRoot: 'assets/source/aseprite',
      exportRoot: 'assets/generated/aseprite',
      publishRoot: 'client/public/assets/atlas',
      categories: {
        character: {
          frameWidth: 64,
          frameHeight: 64,
          padding: 2,
          sheetType: 'rows',
          sheetColumns: 40,
          requiredTags: ['idle_D', 'walk_D', 'attack_melee_D', 'cast_D', 'hit_D', 'death_D', 'ready_D', 'victory_D'],
        },
        characterIllustration: {
          frameWidth: 256,
          frameHeight: 384,
          padding: 0,
          sheetType: 'rows',
          requiredTags: [],
        },
        characterBattleThumbnail: {
          frameWidth: 64,
          frameHeight: 96,
          padding: 0,
          sheetType: 'rows',
          requiredTags: [],
        },
        characterSpriteSheet: {
          frameWidth: 256,
          frameHeight: 384,
          padding: 0,
          sheetType: 'rows',
          requiredTags: [],
        },
        npcBattleThumbnail: {
          frameWidth: 64,
          frameHeight: 96,
          padding: 0,
          sheetType: 'rows',
          requiredTags: [],
        },
        npc: {
          frameWidth: 64,
          frameHeight: 64,
          padding: 2,
          sheetType: 'rows',
          requiredTags: ['idle_D', 'talk_D'],
        },
        npcPortrait: {
          frameWidth: 512,
          frameHeight: 512,
          padding: 0,
          sheetType: 'rows',
          requiredTags: [],
        },
        npcSprite: {
          frameWidth: 256,
          frameHeight: 384,
          padding: 0,
          sheetType: 'rows',
          requiredTags: [],
        },
        monster: {
          frameWidth: 64,
          frameHeight: 64,
          padding: 2,
          sheetType: 'rows',
          requiredTags: ['idle', 'attack', 'hit', 'death'],
        },
        monsterPortrait: {
          frameWidth: 256,
          frameHeight: 256,
          padding: 0,
          sheetType: 'rows',
          requiredTags: [],
        },
        monsterBattleIcon: {
          frameWidth: 64,
          frameHeight: 64,
          padding: 0,
          sheetType: 'rows',
          requiredTags: [],
        },
        monsterEliteBossPortrait: {
          frameWidth: 384,
          frameHeight: 384,
          padding: 0,
          sheetType: 'rows',
          requiredTags: [],
        },
        monsterRaidBossPortrait: {
          frameWidth: 512,
          frameHeight: 512,
          padding: 0,
          sheetType: 'rows',
          requiredTags: [],
        },
        vfx: {
          frameWidth: 64,
          frameHeight: 64,
          padding: 2,
          sheetType: 'horizontal',
          requiredTags: ['start', 'loop', 'end'],
        },
        ui: {
          frameWidth: 32,
          frameHeight: 32,
          padding: 1,
          sheetType: 'packed',
          requiredTags: [],
        },
        uiFrame: {
          frameWidth: 512,
          frameHeight: 512,
          padding: 0,
          sheetType: 'rows',
          requiredTags: [],
        },
        cosmetic: {
          frameWidth: 512,
          frameHeight: 512,
          padding: 0,
          sheetType: 'rows',
          requiredTags: [],
        },
        worldmap: {
          frameWidth: 64,
          frameHeight: 64,
          padding: 0,
          sheetType: 'rows',
          requiredTags: [],
        },
        skillIcon: {
          frameWidth: 64,
          frameHeight: 64,
          padding: 0,
          sheetType: 'rows',
          requiredTags: [],
        },
        itemIcon: {
          frameWidth: 64,
          frameHeight: 64,
          padding: 0,
          sheetType: 'rows',
          requiredTags: [],
        },
        statusIcon: {
          frameWidth: 32,
          frameHeight: 32,
          padding: 0,
          sheetType: 'rows',
          requiredTags: [],
        },
        environmentBackground: {
          frameWidth: 1280,
          frameHeight: 720,
          padding: 0,
          sheetType: 'rows',
          requiredTags: [],
        },
        environmentTile: {
          frameWidth: 256,
          frameHeight: 256,
          padding: 0,
          sheetType: 'rows',
          requiredTags: [],
        },
        environmentObject: {
          frameWidth: 256,
          frameHeight: 256,
          padding: 0,
          sheetType: 'rows',
          requiredTags: [],
        },
        storyCg: {
          frameWidth: 1216,
          frameHeight: 832,
          padding: 0,
          sheetType: 'rows',
          requiredTags: [],
        },
        fallbackTexture: {
          frameWidth: 64,
          frameHeight: 64,
          padding: 0,
          sheetType: 'rows',
          requiredTags: [],
        },
        fallbackTextureSmall: {
          frameWidth: 32,
          frameHeight: 32,
          padding: 0,
          sheetType: 'rows',
          requiredTags: [],
        },
        effectFallbackTexture: {
          frameWidth: 32,
          frameHeight: 32,
          padding: 0,
          sheetType: 'rows',
          requiredTags: [],
        },
        effectFallbackTextureSmall: {
          frameWidth: 24,
          frameHeight: 24,
          padding: 0,
          sheetType: 'rows',
          requiredTags: [],
        },
        battleMonsterFallbackTexture: {
          frameWidth: 60,
          frameHeight: 60,
          padding: 0,
          sheetType: 'rows',
          requiredTags: [],
        },
        battleMonsterBossFallbackTexture: {
          frameWidth: 90,
          frameHeight: 90,
          padding: 0,
          sheetType: 'rows',
          requiredTags: [],
        },
        environmentParticleRainTexture: {
          frameWidth: 2,
          frameHeight: 10,
          padding: 0,
          sheetType: 'rows',
          requiredTags: [],
        },
        environmentParticleSnowTexture: {
          frameWidth: 6,
          frameHeight: 10,
          padding: 0,
          sheetType: 'rows',
          requiredTags: [],
        },
        environmentParticleEtherBeamTexture: {
          frameWidth: 6,
          frameHeight: 16,
          padding: 0,
          sheetType: 'rows',
          requiredTags: [],
        },
        tile: {
          frameWidth: 32,
          frameHeight: 32,
          padding: 0,
          sheetType: 'rows',
          requiredTags: [],
        },
      },
    });
  });
});

describe('sprite production roster contract', () => {
  test('accepts a planned Gorodi NPC sprite entry', async () => {
    const { validateSpriteRoster } = await import('../../tools/aseprite-pipeline/validate-sprite-roster.mjs');

    const result = validateSpriteRoster({
      version: 1,
      items: [
        {
          id: 'npc_ghost_merchant_gorodi',
          category: 'npc',
          priority: 1,
          source: 'assets/source/aseprite/npc/erebos/npc_ghost_merchant_gorodi.aseprite',
          generatedPng: 'assets/generated/aseprite/npc/npc_ghost_merchant_gorodi.png',
          generatedJson: 'assets/generated/aseprite/npc/npc_ghost_merchant_gorodi.json',
          runtimePng: 'client/public/assets/generated/characters/npc_sprites/npc_ghost_merchant_gorodi.png',
          runtimeKey: 'npc_ghost_merchant_gorodi_sprite',
          status: 'planned',
          requiredTags: ['idle_D', 'talk_D'],
          npcId: 'npc_ghost_merchant',
        },
      ],
    });

    expect(result).toEqual({ ok: true, errors: [] });
  });

  test('accepts a single-frame NPC portrait entry without animation tags', async () => {
    const { validateSpriteRoster } = await import('../../tools/aseprite-pipeline/validate-sprite-roster.mjs');

    const result = validateSpriteRoster({
      version: 1,
      items: [
        {
          id: 'npc_portrait_01_cryo_portrait',
          category: 'npcPortrait',
          priority: 2,
          source: 'assets/source/aseprite/npcPortrait/01_cryo/npc_portrait_01_cryo_portrait.aseprite',
          generatedPng: 'assets/generated/aseprite/npcPortrait/npc_portrait_01_cryo_portrait.png',
          generatedJson: 'assets/generated/aseprite/npcPortrait/npc_portrait_01_cryo_portrait.json',
          runtimePng: 'client/public/assets/generated/characters/npc/npc_portrait_01_cryo_portrait.png',
          runtimeKey: 'npc_portrait_01_cryo_portrait',
          status: 'planned',
          requiredTags: [],
          npcPortraitId: 'npc_portrait_01_cryo_portrait',
          npcId: '01_cryo',
        },
      ],
    });

    expect(result).toEqual({ ok: true, errors: [] });
  });

  test('accepts a single-frame NPC sprite entry without animation tags', async () => {
    const { validateSpriteRoster } = await import('../../tools/aseprite-pipeline/validate-sprite-roster.mjs');

    const result = validateSpriteRoster({
      version: 1,
      items: [
        {
          id: 'npc_sprite_01_cryo',
          category: 'npcSprite',
          priority: 3,
          source: 'assets/source/aseprite/npcSprite/01_cryo/01_cryo_sprite.aseprite',
          generatedPng: 'assets/generated/aseprite/npcSprite/01_cryo_sprite.png',
          generatedJson: 'assets/generated/aseprite/npcSprite/01_cryo_sprite.json',
          runtimePng: 'client/public/assets/generated/characters/npc_sprites/01_cryo_sprite.png',
          runtimeKey: '01_cryo_sprite',
          status: 'planned',
          requiredTags: [],
          npcSpriteId: '01_cryo_sprite',
          npcId: '01_cryo',
        },
      ],
    });

    expect(result).toEqual({ ok: true, errors: [] });
  });

  test('accepts a single-frame NPC battle thumbnail entry without animation tags', async () => {
    const { validateSpriteRoster } = await import('../../tools/aseprite-pipeline/validate-sprite-roster.mjs');

    const result = validateSpriteRoster({
      version: 1,
      items: [
        {
          id: 'npc_battle_thumbnail_04_mateus',
          category: 'npcBattleThumbnail',
          priority: 4,
          source: 'assets/source/aseprite/npcBattleThumbnail/04_mateus/04_mateus_sprite.aseprite',
          generatedPng: 'assets/generated/aseprite/npcBattleThumbnail/04_mateus_sprite.png',
          generatedJson: 'assets/generated/aseprite/npcBattleThumbnail/04_mateus_sprite.json',
          runtimePng: 'client/public/assets/generated/characters/npc_battle/04_mateus_sprite.png',
          runtimeKey: 'npc_guide_sprite',
          status: 'planned',
          requiredTags: [],
          npcBattleThumbnailId: '04_mateus_sprite',
          npcId: '04_mateus',
        },
      ],
    });

    expect(result).toEqual({ ok: true, errors: [] });
  });

  test('accepts a single-frame character illustration entry without animation tags', async () => {
    const { validateSpriteRoster } = await import('../../tools/aseprite-pipeline/validate-sprite-roster.mjs');

    const result = validateSpriteRoster({
      version: 1,
      items: [
        {
          id: 'character_illustration_char_illust_ether_knight_front',
          category: 'characterIllustration',
          priority: 2,
          source: 'assets/source/aseprite/characterIllustration/class_main/ether_knight/char_illust_ether_knight_front.aseprite',
          generatedPng: 'assets/generated/aseprite/characterIllustration/char_illust_ether_knight_front.png',
          generatedJson: 'assets/generated/aseprite/characterIllustration/char_illust_ether_knight_front.json',
          runtimePng: 'client/public/assets/generated/characters/class_main/char_illust_ether_knight_front.png',
          runtimeKey: 'char_ether_knight',
          status: 'planned',
          requiredTags: [],
          characterIllustrationId: 'char_illust_ether_knight_front',
          characterClassId: 'ether_knight',
          characterIllustrationView: 'front',
        },
      ],
    });

    expect(result).toEqual({ ok: true, errors: [] });
  });

  test('accepts a single-frame character battle thumbnail entry without animation tags', async () => {
    const { validateSpriteRoster } = await import('../../tools/aseprite-pipeline/validate-sprite-roster.mjs');

    const result = validateSpriteRoster({
      version: 1,
      items: [
        {
          id: 'character_battle_thumbnail_ether_knight',
          category: 'characterBattleThumbnail',
          priority: 3,
          source: 'assets/source/aseprite/characterBattleThumbnail/class_main/ether_knight/char_battle_ether_knight.aseprite',
          generatedPng: 'assets/generated/aseprite/characterBattleThumbnail/char_battle_ether_knight.png',
          generatedJson: 'assets/generated/aseprite/characterBattleThumbnail/char_battle_ether_knight.json',
          runtimePng: 'client/public/assets/generated/characters/class_main/battle/char_battle_ether_knight.png',
          runtimeKey: 'char_battle_ether_knight',
          status: 'planned',
          requiredTags: [],
          characterBattleThumbnailId: 'char_battle_ether_knight',
          characterClassId: 'ether_knight',
        },
      ],
    });

    expect(result).toEqual({ ok: true, errors: [] });
  });

  test('accepts a single-frame character sprite sheet entry without animation tags', async () => {
    const { validateSpriteRoster } = await import('../../tools/aseprite-pipeline/validate-sprite-roster.mjs');

    const result = validateSpriteRoster({
      version: 1,
      items: [
        {
          id: 'character_sprite_sheet_char_sprite_memory_weaver_base_sprite_sheet',
          category: 'characterSpriteSheet',
          priority: 4,
          source: 'assets/source/aseprite/characterSpriteSheet/memory_weaver/char_sprite_memory_weaver_base_sprite_sheet.aseprite',
          generatedPng: 'assets/generated/aseprite/characterSpriteSheet/char_sprite_memory_weaver_base_sprite_sheet.png',
          generatedJson: 'assets/generated/aseprite/characterSpriteSheet/char_sprite_memory_weaver_base_sprite_sheet.json',
          runtimePng: 'client/public/assets/generated/characters/sprites/char_sprite_memory_weaver_base_sprite_sheet.png',
          runtimeKey: 'char_sprite_memory_weaver_base_sprite_sheet',
          status: 'planned',
          requiredTags: [],
          characterSpriteSheetId: 'char_sprite_memory_weaver_base_sprite_sheet',
          characterClassId: 'memory_weaver',
        },
      ],
    });

    expect(result).toEqual({ ok: true, errors: [] });
  });

  test('rejects unknown categories and paths outside project roots', async () => {
    const { validateSpriteRoster } = await import('../../tools/aseprite-pipeline/validate-sprite-roster.mjs');

    const result = validateSpriteRoster({
      version: 1,
      items: [
        {
          id: 'bad_entry',
          category: 'portrait',
          priority: 1,
          source: '../bad.aseprite',
          generatedPng: 'tmp/bad.png',
          generatedJson: 'tmp/bad.json',
          runtimePng: 'client/public/assets/generated/bad.png',
          runtimeKey: 'bad_entry',
          status: 'planned',
          requiredTags: [],
        },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        'bad_entry: unknown category portrait',
        'bad_entry: source must be inside assets/source/aseprite',
        'bad_entry: generatedPng must be inside assets/generated/aseprite',
        'bad_entry: generatedJson must be inside assets/generated/aseprite',
        'bad_entry: requiredTags must be a non-empty array',
      ]),
    );
  });

  test('accepts a single-frame worldmap icon entry without animation tags', async () => {
    const { validateSpriteRoster } = await import('../../tools/aseprite-pipeline/validate-sprite-roster.mjs');

    const result = validateSpriteRoster({
      version: 1,
      items: [
        {
          id: 'zone_aether_plains',
          category: 'worldmap',
          priority: 11,
          source: 'assets/source/aseprite/worldmap/zone_aether_plains.aseprite',
          generatedPng: 'assets/generated/aseprite/worldmap/zone_aether_plains.png',
          generatedJson: 'assets/generated/aseprite/worldmap/zone_aether_plains.json',
          runtimePng: 'client/public/assets/generated/ui/worldmap/zone_aether_plains.png',
          runtimeKey: 'zone_aether_plains',
          status: 'planned',
          requiredTags: [],
          zoneId: 'aether_plains',
        },
      ],
    });

    expect(result).toEqual({ ok: true, errors: [] });
  });

  test('accepts a VFX strip entry with start loop end tags', async () => {
    const { validateSpriteRoster } = await import('../../tools/aseprite-pipeline/validate-sprite-roster.mjs');

    const result = validateSpriteRoster({
      version: 1,
      items: [
        {
          id: 'vfx_common_001',
          category: 'vfx',
          priority: 12,
          source: 'assets/source/aseprite/vfx/library/common/VFX-CMN-001.aseprite',
          generatedPng: 'assets/generated/aseprite/vfx/VFX-CMN-001.png',
          generatedJson: 'assets/generated/aseprite/vfx/VFX-CMN-001.json',
          runtimePng: 'client/public/assets/generated/vfx/common/VFX-CMN-001.png',
          runtimeKey: 'vfx_common_001',
          status: 'planned',
          requiredTags: ['start', 'loop', 'end'],
          vfxId: 'VFX-CMN-001',
        },
      ],
    });

    expect(result).toEqual({ ok: true, errors: [] });
  });

  test('accepts a single-frame UI frame entry without animation tags', async () => {
    const { validateSpriteRoster } = await import('../../tools/aseprite-pipeline/validate-sprite-roster.mjs');

    const result = validateSpriteRoster({
      version: 1,
      items: [
        {
          id: 'ui_frame_UI-BTN-001-DEF',
          category: 'uiFrame',
          priority: 12,
          source: 'assets/source/aseprite/uiFrame/def/btn/UI-BTN-001-DEF.aseprite',
          generatedPng: 'assets/generated/aseprite/uiFrame/UI-BTN-001-DEF.png',
          generatedJson: 'assets/generated/aseprite/uiFrame/UI-BTN-001-DEF.json',
          runtimePng: 'client/public/assets/generated/ui/frames/UI-BTN-001-DEF.png',
          runtimeKey: 'ui_frame_UI-BTN-001-DEF',
          status: 'planned',
          requiredTags: [],
          uiFrameId: 'UI-BTN-001-DEF',
        },
      ],
    });

    expect(result).toEqual({ ok: true, errors: [] });
  });

  test('accepts a single-frame cosmetic entry without animation tags', async () => {
    const { validateSpriteRoster } = await import('../../tools/aseprite-pipeline/validate-sprite-roster.mjs');

    const result = validateSpriteRoster({
      version: 1,
      items: [
        {
          id: 'cosmetic_s2_COS_AURA_S2_01',
          category: 'cosmetic',
          priority: 13,
          source: 'assets/source/aseprite/cosmetic/season2/aura/COS-AURA_S2_01.aseprite',
          generatedPng: 'assets/generated/aseprite/cosmetic/COS-AURA_S2_01.png',
          generatedJson: 'assets/generated/aseprite/cosmetic/COS-AURA_S2_01.json',
          runtimePng: 'client/public/assets/generated/cosmetics/season2/COS-AURA_S2_01.png',
          runtimeKey: 'cosmetic_s2_COS_AURA_S2_01',
          status: 'planned',
          requiredTags: [],
          cosmeticId: 'COS-AURA_S2_01',
          cosmeticSeason: 2,
        },
      ],
    });

    expect(result).toEqual({ ok: true, errors: [] });
  });

  test('accepts a single-frame status effect icon entry without animation tags', async () => {
    const { validateSpriteRoster } = await import('../../tools/aseprite-pipeline/validate-sprite-roster.mjs');

    const result = validateSpriteRoster({
      version: 1,
      items: [
        {
          id: 'status_poison_icon',
          category: 'statusIcon',
          priority: 52,
          source: 'assets/source/aseprite/statusIcon/debuff/status_poison.aseprite',
          generatedPng: 'assets/generated/aseprite/statusIcon/status_poison.png',
          generatedJson: 'assets/generated/aseprite/statusIcon/status_poison.json',
          runtimePng: 'client/public/assets/generated/ui/icons/status/status_poison.png',
          runtimeKey: 'status_poison_icon',
          status: 'planned',
          requiredTags: [],
          statusIconId: 'poison',
        },
      ],
    });

    expect(result).toEqual({ ok: true, errors: [] });
  });

  test('accepts a single-frame item icon entry without animation tags', async () => {
    const { validateSpriteRoster } = await import('../../tools/aseprite-pipeline/validate-sprite-roster.mjs');

    const result = validateSpriteRoster({
      version: 1,
      items: [
        {
          id: 'item_itm_wpn_001_icon',
          category: 'itemIcon',
          priority: 67,
          source: 'assets/source/aseprite/itemIcon/weapon/ITM-WPN-001.aseprite',
          generatedPng: 'assets/generated/aseprite/itemIcon/ITM-WPN-001.png',
          generatedJson: 'assets/generated/aseprite/itemIcon/ITM-WPN-001.json',
          runtimePng: 'client/public/assets/generated/ui/icons/items/ITM-WPN-001.png',
          runtimeKey: 'icon_item_ITM-WPN_001',
          status: 'planned',
          requiredTags: [],
          itemIconId: 'ITM-WPN-001',
        },
      ],
    });

    expect(result).toEqual({ ok: true, errors: [] });
  });

  test('accepts single-frame environment background, tile, and object entries without animation tags', async () => {
    const { validateSpriteRoster } = await import('../../tools/aseprite-pipeline/validate-sprite-roster.mjs');

    const result = validateSpriteRoster({
      version: 1,
      items: [
        {
          id: 'env_bg_erb_far_day',
          category: 'environmentBackground',
          priority: 167,
          source: 'assets/source/aseprite/environmentBackground/erb/ERB-BG-FAR-DAY.aseprite',
          generatedPng: 'assets/generated/aseprite/environmentBackground/ERB-BG-FAR-DAY.png',
          generatedJson: 'assets/generated/aseprite/environmentBackground/ERB-BG-FAR-DAY.json',
          runtimePng: 'client/public/assets/generated/environment/backgrounds/ERB-BG-FAR-DAY.png',
          runtimeKey: 'env_bg_ERB_BG_FAR_DAY',
          status: 'planned',
          requiredTags: [],
          environmentBackgroundId: 'ERB-BG-FAR-DAY',
        },
        {
          id: 'env_tile_erb_g_01',
          category: 'environmentTile',
          priority: 168,
          source: 'assets/source/aseprite/environmentTile/erb/ERB-G-01.aseprite',
          generatedPng: 'assets/generated/aseprite/environmentTile/ERB-G-01.png',
          generatedJson: 'assets/generated/aseprite/environmentTile/ERB-G-01.json',
          runtimePng: 'client/public/assets/generated/environment/tiles/ERB-G-01.png',
          runtimeKey: 'env_tile_ERB_G_01',
          status: 'planned',
          requiredTags: [],
          environmentTileId: 'ERB-G-01',
        },
        {
          id: 'env_object_erb_ruin_pillar',
          category: 'environmentObject',
          priority: 169,
          source: 'assets/source/aseprite/environmentObject/erb/erb_ruin_pillar.aseprite',
          generatedPng: 'assets/generated/aseprite/environmentObject/erb_ruin_pillar.png',
          generatedJson: 'assets/generated/aseprite/environmentObject/erb_ruin_pillar.json',
          runtimePng: 'client/public/assets/generated/environment/objects/erb_ruin_pillar.png',
          runtimeKey: 'env_object_erb_ruin_pillar',
          status: 'planned',
          requiredTags: [],
          environmentObjectId: 'erb_ruin_pillar',
        },
      ],
    });

    expect(result).toEqual({ ok: true, errors: [] });
  });

  test('accepts a single-frame story CG entry outside generated runtime folder', async () => {
    const { validateSpriteRoster } = await import('../../tools/aseprite-pipeline/validate-sprite-roster.mjs');

    const result = validateSpriteRoster({
      version: 1,
      items: [
        {
          id: 'story_cg_ch1_erebos',
          category: 'storyCg',
          priority: 173,
          source: 'assets/source/aseprite/storyCg/chapters/ch1_erebos.aseprite',
          generatedPng: 'assets/generated/aseprite/storyCg/ch1_erebos.png',
          generatedJson: 'assets/generated/aseprite/storyCg/ch1_erebos.json',
          runtimePng: 'client/public/assets/cg/chapters/ch1_erebos.png',
          runtimeKey: 'story_cg_ch1_erebos',
          status: 'planned',
          requiredTags: [],
          storyCgId: 'ch1_erebos',
        },
      ],
    });

    expect(result).toEqual({ ok: true, errors: [] });
  });

  test('accepts single-frame monster portrait and battle icon entries without animation tags', async () => {
    const { validateSpriteRoster } = await import('../../tools/aseprite-pipeline/validate-sprite-roster.mjs');

    const result = validateSpriteRoster({
      version: 1,
      items: [
        {
          id: 'monster_portrait_mon_erebos_fog_rat_normal',
          category: 'monsterPortrait',
          priority: 169,
          source: 'assets/source/aseprite/monsterPortrait/erebos/mon_erebos_fog_rat_normal.aseprite',
          generatedPng: 'assets/generated/aseprite/monsterPortrait/mon_erebos_fog_rat_normal.png',
          generatedJson: 'assets/generated/aseprite/monsterPortrait/mon_erebos_fog_rat_normal.json',
          runtimePng: 'client/public/assets/generated/monsters/normal/mon_erebos_fog_rat_normal.png',
          runtimeKey: 'monster_portrait_mon_erebos_fog_rat_normal',
          status: 'planned',
          requiredTags: [],
          monsterPortraitId: 'mon_erebos_fog_rat_normal',
        },
        {
          id: 'monster_battle_icon_mon_erebos_fog_rat_normal',
          category: 'monsterBattleIcon',
          priority: 170,
          source: 'assets/source/aseprite/monsterBattleIcon/erebos/mon_erebos_fog_rat_normal.aseprite',
          generatedPng: 'assets/generated/aseprite/monsterBattleIcon/mon_erebos_fog_rat_normal.png',
          generatedJson: 'assets/generated/aseprite/monsterBattleIcon/mon_erebos_fog_rat_normal.json',
          runtimePng: 'client/public/assets/generated/monsters/battle/mon_erebos_fog_rat_normal.png',
          runtimeKey: 'monster_battle_icon_mon_erebos_fog_rat_normal',
          status: 'planned',
          requiredTags: [],
          monsterBattleIconId: 'mon_erebos_fog_rat_normal',
        },
      ],
    });

    expect(result).toEqual({ ok: true, errors: [] });
  });

  test('accepts single-frame monster boss portrait entries without animation tags', async () => {
    const { validateSpriteRoster } = await import('../../tools/aseprite-pipeline/validate-sprite-roster.mjs');

    const result = validateSpriteRoster({
      version: 1,
      items: [
        {
          id: 'monster_elite_boss_BOSS-ERB-SHADOW',
          category: 'monsterEliteBossPortrait',
          priority: 171,
          source: 'assets/source/aseprite/monsterEliteBossPortrait/erebos/BOSS-ERB-SHADOW.aseprite',
          generatedPng: 'assets/generated/aseprite/monsterEliteBossPortrait/BOSS-ERB-SHADOW.png',
          generatedJson: 'assets/generated/aseprite/monsterEliteBossPortrait/BOSS-ERB-SHADOW.json',
          runtimePng: 'client/public/assets/generated/monsters/elite_boss/BOSS-ERB-SHADOW.png',
          runtimeKey: 'monster_elite_boss_BOSS-ERB-SHADOW',
          status: 'planned',
          requiredTags: [],
          monsterEliteBossId: 'BOSS-ERB-SHADOW',
        },
        {
          id: 'monster_raid_boss_raid_boss_chronos_prime_phase1',
          category: 'monsterRaidBossPortrait',
          priority: 172,
          source: 'assets/source/aseprite/monsterRaidBossPortrait/temporal/raid_boss_chronos_prime_phase1.aseprite',
          generatedPng: 'assets/generated/aseprite/monsterRaidBossPortrait/raid_boss_chronos_prime_phase1.png',
          generatedJson: 'assets/generated/aseprite/monsterRaidBossPortrait/raid_boss_chronos_prime_phase1.json',
          runtimePng: 'client/public/assets/generated/monsters/raid_boss/raid_boss_chronos_prime_phase1.png',
          runtimeKey: 'monster_raid_boss_raid_boss_chronos_prime_phase1',
          status: 'planned',
          requiredTags: [],
          monsterRaidBossId: 'raid_boss_chronos_prime_phase1',
        },
      ],
    });

    expect(result).toEqual({ ok: true, errors: [] });
  });
});

describe('character sprite roster contract', () => {
  function createEtherKnightPilotRoster() {
    return {
      version: 1,
      characters: [
        {
          id: 'char_ether_knight_base',
          classId: 'ether_knight',
          phase: 'pilot',
          source: 'assets/source/aseprite/character/ether_knight/char_ether_knight_base.aseprite',
          generatedPng: 'assets/generated/aseprite/character/char_ether_knight_base.png',
          generatedJson: 'assets/generated/aseprite/character/char_ether_knight_base.json',
          runtimePng: 'client/public/assets/generated/characters/sprites/char_ether_knight_base.png',
          runtimeJson: 'client/public/assets/generated/characters/sprites/char_ether_knight_base.json',
          textureKey: 'char_sprite_ether_knight_base',
          frameWidth: 64,
          frameHeight: 64,
          directions: ['D'],
          motions: ['idle', 'walk'],
          requiredTags: ['idle_D', 'walk_D'],
          status: 'planned',
        },
      ],
    };
  }

  test('accepts the Ether Knight pilot roster entry', async () => {
    const { validateCharacterSpriteRoster } = await import(
      '../../tools/aseprite-pipeline/validate-character-sprite-roster.mjs'
    );

    const result = validateCharacterSpriteRoster(createEtherKnightPilotRoster());

    expect(result).toEqual({ ok: true, errors: [] });
  });

  test('accepts .ase source files for character sprite roster entries', async () => {
    const { validateCharacterSpriteRoster } = await import(
      '../../tools/aseprite-pipeline/validate-character-sprite-roster.mjs'
    );
    const roster = createEtherKnightPilotRoster();
    const character = roster.characters[0];

    character.source = 'assets/source/aseprite/character/ether_knight/char_ether_knight_base.ase';

    const result = validateCharacterSpriteRoster(roster);

    expect(result).toEqual({ ok: true, errors: [] });
  });

  test('reports concrete errors when sprite paths are outside allowed roots', async () => {
    const { validateCharacterSpriteRoster } = await import(
      '../../tools/aseprite-pipeline/validate-character-sprite-roster.mjs'
    );
    const roster = createEtherKnightPilotRoster();
    const character = roster.characters[0];

    character.source = 'assets/source/aseprite/npc/char_ether_knight_base.aseprite';
    character.generatedPng = 'assets/generated/aseprite/npc/char_ether_knight_base.png';
    character.generatedJson = 'assets/generated/aseprite/npc/char_ether_knight_base.json';
    character.runtimePng = 'client/public/assets/generated/monsters/char_ether_knight_base.png';
    character.runtimeJson = 'client/public/assets/generated/monsters/char_ether_knight_base.json';

    const result = validateCharacterSpriteRoster(roster);

    expect(result).toEqual({
      ok: false,
      errors: [
        'Character "char_ether_knight_base" source must be inside assets/source/aseprite/character: assets/source/aseprite/npc/char_ether_knight_base.aseprite.',
        'Character "char_ether_knight_base" generatedPng must be inside assets/generated/aseprite/character: assets/generated/aseprite/npc/char_ether_knight_base.png.',
        'Character "char_ether_knight_base" generatedJson must be inside assets/generated/aseprite/character: assets/generated/aseprite/npc/char_ether_knight_base.json.',
        'Character "char_ether_knight_base" runtimePng must be inside client/public/assets/generated/characters/sprites: client/public/assets/generated/monsters/char_ether_knight_base.png.',
        'Character "char_ether_knight_base" runtimeJson must be inside client/public/assets/generated/characters/sprites: client/public/assets/generated/monsters/char_ether_knight_base.json.',
      ],
    });
  });

  test('rejects character sprite paths with valid roots but invalid file extensions', async () => {
    const { validateCharacterSpriteRoster } = await import(
      '../../tools/aseprite-pipeline/validate-character-sprite-roster.mjs'
    );
    const roster = createEtherKnightPilotRoster();
    const character = roster.characters[0];

    character.source = 'assets/source/aseprite/character/ether_knight/char_ether_knight_base.png';
    character.generatedPng = 'assets/generated/aseprite/character/char_ether_knight_base.json';
    character.generatedJson = 'assets/generated/aseprite/character/char_ether_knight_base.png';
    character.runtimePng = 'client/public/assets/generated/characters/sprites/char_ether_knight_base.json';
    character.runtimeJson = 'client/public/assets/generated/characters/sprites/char_ether_knight_base.png';

    const result = validateCharacterSpriteRoster(roster);

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        'Character "char_ether_knight_base" source must use .ase or .aseprite extension: assets/source/aseprite/character/ether_knight/char_ether_knight_base.png.',
        'Character "char_ether_knight_base" generatedPng must use .png extension: assets/generated/aseprite/character/char_ether_knight_base.json.',
        'Character "char_ether_knight_base" generatedJson must use .json extension: assets/generated/aseprite/character/char_ether_knight_base.png.',
        'Character "char_ether_knight_base" runtimePng must use .png extension: client/public/assets/generated/characters/sprites/char_ether_knight_base.json.',
        'Character "char_ether_knight_base" runtimeJson must use .json extension: client/public/assets/generated/characters/sprites/char_ether_knight_base.png.',
      ]),
    );
  });

  test('requires full phase character sprites to include every production tag', async () => {
    const { validateCharacterSpriteRoster } = await import(
      '../../tools/aseprite-pipeline/validate-character-sprite-roster.mjs'
    );
    const roster = createEtherKnightPilotRoster();
    const character = roster.characters[0];

    character.phase = 'full';

    const result = validateCharacterSpriteRoster(roster);

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        'Character "char_ether_knight_base" phase "full" requiredTags must include "attack_melee_D".',
        'Character "char_ether_knight_base" phase "full" requiredTags must include "cast_D".',
        'Character "char_ether_knight_base" phase "full" requiredTags must include "hit_D".',
        'Character "char_ether_knight_base" phase "full" requiredTags must include "death_D".',
      ]),
    );
  });

  test('rejects unsupported character sprite phases', async () => {
    const { validateCharacterSpriteRoster } = await import(
      '../../tools/aseprite-pipeline/validate-character-sprite-roster.mjs'
    );
    const roster = createEtherKnightPilotRoster();
    const character = roster.characters[0];

    character.phase = 'prototype';

    const result = validateCharacterSpriteRoster(roster);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain('Character "char_ether_knight_base" phase must be one of pilot, full, production, full-production.');
  });
});

describe('character sprite build wrapper', () => {
  function createEtherKnightBuildRoster() {
    return {
      version: 1,
      characters: [
        {
          id: 'char_ether_knight_base',
          classId: 'ether_knight',
          phase: 'pilot',
          source: 'assets/source/aseprite/character/ether_knight/char_ether_knight_base.aseprite',
          generatedPng: 'assets/generated/aseprite/character/char_ether_knight_base.png',
          generatedJson: 'assets/generated/aseprite/character/char_ether_knight_base.json',
          runtimePng: 'client/public/assets/generated/characters/sprites/char_ether_knight_base.png',
          runtimeJson: 'client/public/assets/generated/characters/sprites/char_ether_knight_base.json',
          textureKey: 'char_sprite_ether_knight_base',
          frameWidth: 64,
          frameHeight: 64,
          directions: ['D'],
          motions: ['idle', 'walk'],
          requiredTags: ['idle_D', 'walk_D'],
          status: 'planned',
        },
      ],
    };
  }

  test('resolveCharacterBuildTarget reads roster paths and derives raw Aseprite JSON path', async () => {
    const { resolveCharacterBuildTarget } = await import('../../tools/aseprite-pipeline/build-character-sprite.mjs');

    expect(resolveCharacterBuildTarget(createEtherKnightBuildRoster(), 'char_ether_knight_base')).toEqual({
      id: 'char_ether_knight_base',
      category: 'character',
      atlasName: 'char_ether_knight_base',
      source: 'assets/source/aseprite/character/ether_knight/char_ether_knight_base.aseprite',
      generatedPng: 'assets/generated/aseprite/character/char_ether_knight_base.png',
      rawJson: 'assets/generated/aseprite/character/char_ether_knight_base.aseprite.json',
      generatedJson: 'assets/generated/aseprite/character/char_ether_knight_base.json',
      runtimePng: 'client/public/assets/generated/characters/sprites/char_ether_knight_base.png',
      runtimeJson: 'client/public/assets/generated/characters/sprites/char_ether_knight_base.json',
    });
  });

  test('resolveCharacterBuildTarget rejects unknown ids', async () => {
    const { resolveCharacterBuildTarget } = await import('../../tools/aseprite-pipeline/build-character-sprite.mjs');

    expect(() => resolveCharacterBuildTarget({ version: 1, characters: [] }, 'missing')).toThrow(
      'Unknown character sprite id: missing',
    );
  });

  test('buildCharacterSprite orchestrates export normalization validation and publish with roster requiredTags', async () => {
    const { buildCharacterSprite } = await import('../../tools/aseprite-pipeline/build-character-sprite.mjs');
    const roster = createEtherKnightBuildRoster();
    const atlas = {
      size: { w: 128, h: 64 },
      sprites: [
        { name: 'char_ether_knight_base_idle_0', x: 0, y: 0, w: 64, h: 64 },
        { name: 'char_ether_knight_base_walk_0', x: 64, y: 0, w: 64, h: 64 },
      ],
      tags: [
        { name: 'idle_D', from: 0, to: 0 },
        { name: 'walk_D', from: 1, to: 1 },
      ],
      count: 2,
    };
    const calls: string[] = [];
    const copiedFiles: Array<{ source: string; destination: string }> = [];
    const mkdirCalls: Array<{ directory: string; options: { recursive?: boolean } }> = [];

    const result = buildCharacterSprite({
      id: 'char_ether_knight_base',
      publish: true,
      dependencies: {
        loadRoster: () => roster,
        validateRoster: (candidate: unknown) => {
          expect(candidate).toBe(roster);
          return { ok: true, errors: [] };
        },
        runExport: (args: { category: string; sourceFile: string }) => {
          calls.push('runExport');
          expect(args).toEqual({
            category: 'character',
            sourceFile: 'assets/source/aseprite/character/ether_knight/char_ether_knight_base.aseprite',
          });
          return {
            sheetFile: 'assets/generated/aseprite/character/char_ether_knight_base.png',
            dataFile: 'assets/generated/aseprite/character/char_ether_knight_base.aseprite.json',
          };
        },
        normalize: (rawJson: string, generatedJson: string, atlasName: string, sheetFileName: string) => {
          calls.push('normalize');
          expect([rawJson, generatedJson, atlasName, sheetFileName]).toEqual([
            'assets/generated/aseprite/character/char_ether_knight_base.aseprite.json',
            'assets/generated/aseprite/character/char_ether_knight_base.json',
            'char_ether_knight_base',
            'char_ether_knight_base.png',
          ]);
          return atlas;
        },
        loadConfig: () => ({
          categories: {
            character: {
              frameWidth: 64,
              frameHeight: 64,
              padding: 2,
              sheetType: 'rows',
              requiredTags: ['idle_D', 'walk_D', 'attack_melee_D', 'cast_D', 'hit_D', 'death_D'],
            },
          },
        }),
        readText: (filePath: string) => {
          expect(filePath).toBe('assets/generated/aseprite/character/char_ether_knight_base.json');
          return JSON.stringify(atlas);
        },
        readSize: (filePath: string) => {
          expect(filePath).toBe('assets/generated/aseprite/character/char_ether_knight_base.png');
          return { w: 128, h: 64 };
        },
        validateAtlas: ({
          atlas: actualAtlas,
          categoryConfig,
          pngSize,
        }: {
          atlas: typeof atlas;
          categoryConfig: {
            frameWidth: number;
            frameHeight: number;
            padding: number;
            sheetType: string;
            requiredTags: string[];
          };
          pngSize: { w: number; h: number };
        }) => {
          calls.push('validateAtlas');
          expect(actualAtlas).toEqual(atlas);
          expect(pngSize).toEqual({ w: 128, h: 64 });
          expect(categoryConfig).toMatchObject({
            frameWidth: 64,
            frameHeight: 64,
            padding: 2,
            sheetType: 'rows',
          });
          expect(categoryConfig.requiredTags).toEqual(['idle_D', 'walk_D']);
          return { ok: true, errors: [] };
        },
        mkdir: (directory: string, options: { recursive?: boolean }) => {
          mkdirCalls.push({ directory, options });
        },
        copyFile: (source: string, destination: string) => {
          copiedFiles.push({ source, destination });
        },
      },
    });

    expect(calls).toEqual(['runExport', 'normalize', 'validateAtlas']);
    expect(mkdirCalls).toEqual([
      {
        directory: path.dirname('client/public/assets/generated/characters/sprites/char_ether_knight_base.png'),
        options: { recursive: true },
      },
    ]);
    expect(copiedFiles).toEqual([
      {
        source: 'assets/generated/aseprite/character/char_ether_knight_base.png',
        destination: 'client/public/assets/generated/characters/sprites/char_ether_knight_base.png',
      },
      {
        source: 'assets/generated/aseprite/character/char_ether_knight_base.json',
        destination: 'client/public/assets/generated/characters/sprites/char_ether_knight_base.json',
      },
    ]);
    expect(result).toEqual({
      target: {
        id: 'char_ether_knight_base',
        category: 'character',
        atlasName: 'char_ether_knight_base',
        source: 'assets/source/aseprite/character/ether_knight/char_ether_knight_base.aseprite',
        generatedPng: 'assets/generated/aseprite/character/char_ether_knight_base.png',
        rawJson: 'assets/generated/aseprite/character/char_ether_knight_base.aseprite.json',
        generatedJson: 'assets/generated/aseprite/character/char_ether_knight_base.json',
        runtimePng: 'client/public/assets/generated/characters/sprites/char_ether_knight_base.png',
        runtimeJson: 'client/public/assets/generated/characters/sprites/char_ether_knight_base.json',
      },
      validation: { ok: true, errors: [] },
    });
  });

  test('buildCharacterSprite rejects Aseprite export targets that do not match the roster target', async () => {
    const { buildCharacterSprite } = await import('../../tools/aseprite-pipeline/build-character-sprite.mjs');
    const calls: string[] = [];

    expect(() =>
      buildCharacterSprite({
        id: 'char_ether_knight_base',
        dependencies: {
          loadRoster: () => createEtherKnightBuildRoster(),
          validateRoster: () => ({ ok: true, errors: [] }),
          runExport: () => {
            calls.push('runExport');
            return {
              sheetFile: 'assets/generated/aseprite/character/wrong.png',
              dataFile: 'assets/generated/aseprite/character/wrong.aseprite.json',
            };
          },
          normalize: () => {
            calls.push('normalize');
          },
        },
      }),
    ).toThrow('Aseprite export target mismatch:');
    expect(calls).toEqual(['runExport']);
  });

  test('parseBuildCharacterSpriteArgs accepts publish before or after the character id', async () => {
    const { parseBuildCharacterSpriteArgs } = await import('../../tools/aseprite-pipeline/build-character-sprite.mjs');

    expect(parseBuildCharacterSpriteArgs(['char_ether_knight_base'])).toEqual({
      id: 'char_ether_knight_base',
      publish: false,
    });
    expect(parseBuildCharacterSpriteArgs(['char_ether_knight_base', '--publish'])).toEqual({
      id: 'char_ether_knight_base',
      publish: true,
    });
    expect(parseBuildCharacterSpriteArgs(['--publish', 'char_ether_knight_base'])).toEqual({
      id: 'char_ether_knight_base',
      publish: true,
    });
  });

  test('parseBuildCharacterSpriteArgs rejects unknown flags and extra positional ids', async () => {
    const { parseBuildCharacterSpriteArgs } = await import('../../tools/aseprite-pipeline/build-character-sprite.mjs');

    expect(() => parseBuildCharacterSpriteArgs(['char_ether_knight_base', '--dry-run'])).toThrow(
      'Unknown option: --dry-run',
    );
    expect(() => parseBuildCharacterSpriteArgs(['char_ether_knight_base', 'char_shadow_weaver_base'])).toThrow(
      'Expected exactly one character id.',
    );
  });
});

// Windows 경로(C:\\)·path.delimiter 의존 테스트 — 비-Windows CI(ubuntu)에서는 스킵.
// aseprite 파이프라인은 Windows dev 도구이며 find-aseprite 는 OS 기본 path 의미로 후보를 구성한다.
describe.skipIf(process.platform !== 'win32')('aseprite executable finder', () => {
  test('ASEPRITE_EXE takes priority over PATH and default candidates when it exists and can run', async () => {
    const { findAsepriteExecutable } = await import('../../tools/aseprite-pipeline/find-aseprite.mjs');
    const asepriteExe = 'C:\\Tools\\Aseprite\\aseprite.exe';
    const pathCandidate = 'C:\\PathBin\\aseprite.exe';
    const checkedCandidates: string[] = [];

    const result = findAsepriteExecutable(
      { PATH: 'C:\\PathBin', ASEPRITE_EXE: asepriteExe },
      {
        existsSync: (candidate: string) => candidate === asepriteExe || candidate === pathCandidate,
        canRun: (candidate: string) => {
          checkedCandidates.push(candidate);
          return candidate === asepriteExe || candidate === pathCandidate;
        },
      },
    );

    expect(result).toBe(asepriteExe);
    expect(checkedCandidates).toEqual([asepriteExe]);
  });

  test('PATH candidate is used when ASEPRITE_EXE is absent', async () => {
    const { findAsepriteExecutable } = await import('../../tools/aseprite-pipeline/find-aseprite.mjs');
    const pathCandidate = 'C:\\PathBin\\aseprite.exe';

    const result = findAsepriteExecutable(
      { PATH: 'C:\\PathBin', ASEPRITE_EXE: undefined },
      {
        existsSync: (candidate: string) => candidate === pathCandidate,
        canRun: (candidate: string) => candidate === pathCandidate,
      },
    );

    expect(result).toBe(pathCandidate);
  });

  test('Steam install candidate is used when PATH and ASEPRITE_EXE are absent', async () => {
    const { findAsepriteExecutable } = await import('../../tools/aseprite-pipeline/find-aseprite.mjs');
    const steamCandidate = 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Aseprite\\Aseprite.exe';

    const result = findAsepriteExecutable(
      { PATH: '', Path: '', ASEPRITE_EXE: undefined },
      {
        existsSync: (candidate: string) => candidate === steamCandidate,
        canRun: (candidate: string) => candidate === steamCandidate,
      },
    );

    expect(result).toBe(steamCandidate);
  });

  test('skips existing but non-runnable candidate and returns a later runnable candidate', async () => {
    const { findAsepriteExecutable } = await import('../../tools/aseprite-pipeline/find-aseprite.mjs');
    const nonRunnableCandidate = 'C:\\FirstBin\\aseprite.exe';
    const runnableCandidate = 'C:\\SecondBin\\aseprite.exe';

    const result = findAsepriteExecutable(
      { PATH: ['C:\\FirstBin', 'C:\\SecondBin'].join(path.delimiter), ASEPRITE_EXE: undefined },
      {
        existsSync: (candidate: string) => candidate === nonRunnableCandidate || candidate === runnableCandidate,
        canRun: (candidate: string) => candidate === runnableCandidate,
      },
    );

    expect(result).toBe(runnableCandidate);
  });

  test('returns null when PATH is empty and ASEPRITE_EXE is absent', async () => {
    const { findAsepriteExecutable } = await import('../../tools/aseprite-pipeline/find-aseprite.mjs');

    const result = findAsepriteExecutable(
      { PATH: '', Path: '', ASEPRITE_EXE: undefined },
      {
        existsSync: () => false,
        canRun: () => false,
      },
    );

    expect(result).toBeNull();
  });

  test('CLI entrypoint detection normalizes Windows path case and separators', async () => {
    const { isCliEntrypoint } = await import('../../tools/aseprite-pipeline/find-aseprite.mjs');
    const modulePath = 'C:\\Repo\\tools\\aseprite-pipeline\\find-aseprite.mjs';
    const argvPath = 'c:/repo/tools/aseprite-pipeline/find-aseprite.mjs';

    expect(isCliEntrypoint(argvPath, pathToFileURL(modulePath).href, 'win32')).toBe(true);
  });

  test('CLI entrypoint detection resolves relative argv path before comparing', async () => {
    const { isCliEntrypoint } = await import('../../tools/aseprite-pipeline/find-aseprite.mjs');
    const modulePath = path.resolve('tools/aseprite-pipeline/find-aseprite.mjs');

    expect(isCliEntrypoint('tools/aseprite-pipeline/find-aseprite.mjs', pathToFileURL(modulePath).href)).toBe(true);
  });
});

describe('aseprite export command builder', () => {
  test('buildExportArgs includes required Aseprite export flags', async () => {
    const { buildExportArgs } = await import('../../tools/aseprite-pipeline/export-aseprite.mjs');

    const args = buildExportArgs({
      sourceFile: 'assets/source/aseprite/character/hero.aseprite',
      sheetFile: 'assets/generated/aseprite/character/hero.png',
      dataFile: 'assets/generated/aseprite/character/hero.aseprite.json',
      categoryConfig: {
        sheetType: 'rows',
      },
    });

    expect(args).toEqual([
      '-b',
      'assets/source/aseprite/character/hero.aseprite',
      '--list-tags',
      '--list-layers',
      '--format',
      'json-array',
      '--sheet-type',
      'rows',
      '--sheet',
      'assets/generated/aseprite/character/hero.png',
      '--data',
      'assets/generated/aseprite/character/hero.aseprite.json',
    ]);
  });

  test('buildExportArgs enables sheet packing for packed sheets', async () => {
    const { buildExportArgs } = await import('../../tools/aseprite-pipeline/export-aseprite.mjs');

    const args = buildExportArgs({
      sourceFile: 'assets/source/aseprite/ui/icons.aseprite',
      sheetFile: 'assets/generated/aseprite/ui/icons.png',
      dataFile: 'assets/generated/aseprite/ui/icons.aseprite.json',
      categoryConfig: {
        sheetType: 'packed',
      },
    });

    expect(args).toContain('--sheet-pack');
  });

  test('buildExportArgs supports fixed sprite sheet rows and columns', async () => {
    const { buildExportArgs } = await import('../../tools/aseprite-pipeline/export-aseprite.mjs');

    const args = buildExportArgs({
      sourceFile: 'assets/source/aseprite/character/hero.aseprite',
      sheetFile: 'assets/generated/aseprite/character/hero.png',
      dataFile: 'assets/generated/aseprite/character/hero.aseprite.json',
      categoryConfig: {
        sheetType: 'rows',
        sheetColumns: 30,
        sheetRows: 5,
      },
    });

    expect(args).toEqual(
      expect.arrayContaining(['--sheet-columns', '30', '--sheet-rows', '5']),
    );
  });

  test('resolveExportTarget maps source files to generated category targets', async () => {
    const { resolveExportTarget } = await import('../../tools/aseprite-pipeline/export-aseprite.mjs');
    const config = JSON.parse(readFileSync(configPath, 'utf8'));

    expect(resolveExportTarget(config, 'character', 'assets/source/aseprite/character/hero.aseprite')).toEqual({
      sheetFile: path.normalize('assets/generated/aseprite/character/hero.png'),
      dataFile: path.normalize('assets/generated/aseprite/character/hero.aseprite.json'),
    });
  });

  test('exportAseprite rejects unknown categories', async () => {
    const { exportAseprite } = await import('../../tools/aseprite-pipeline/export-aseprite.mjs');

    expect(() =>
      exportAseprite({
        category: 'unknown',
        sourceFile: 'assets/source/aseprite/unknown/hero.aseprite',
        dependencies: {
          loadConfig: () => JSON.parse(readFileSync(configPath, 'utf8')),
          findAsepriteExecutable: () => 'aseprite',
        },
      }),
    ).toThrow('Unknown Aseprite category: unknown');
  });

  test('exportAseprite rejects missing executable', async () => {
    const { exportAseprite } = await import('../../tools/aseprite-pipeline/export-aseprite.mjs');

    expect(() =>
      exportAseprite({
        category: 'character',
        sourceFile: 'assets/source/aseprite/character/hero.aseprite',
        dependencies: {
          loadConfig: () => JSON.parse(readFileSync(configPath, 'utf8')),
          findAsepriteExecutable: () => null,
        },
      }),
    ).toThrow('Aseprite executable not found');
  });

  test('exportAseprite rejects source files outside the configured category root', async () => {
    const { exportAseprite } = await import('../../tools/aseprite-pipeline/export-aseprite.mjs');

    expect(() =>
      exportAseprite({
        category: 'character',
        sourceFile: 'assets/source/aseprite/monster/slime.aseprite',
        asepriteExe: 'aseprite',
        dependencies: {
          loadConfig: () => JSON.parse(readFileSync(configPath, 'utf8')),
        },
      }),
    ).toThrow('Aseprite source file must be inside');
  });

  test('exportAseprite creates the output directory and invokes Aseprite without a shell command', async () => {
    const { exportAseprite } = await import('../../tools/aseprite-pipeline/export-aseprite.mjs');
    const mkdirCalls: Array<{ directory: string; options: { recursive?: boolean } }> = [];
    const spawnCalls: Array<{ command: string; args: string[]; options: { shell?: boolean; encoding?: string } }> = [];

    const target = exportAseprite({
      category: 'character',
      sourceFile: 'assets/source/aseprite/character/hero.aseprite',
      dependencies: {
        loadConfig: () => JSON.parse(readFileSync(configPath, 'utf8')),
        findAsepriteExecutable: () => 'C:\\Tools\\Aseprite\\aseprite.exe',
        mkdirSync: (directory: string, options: { recursive?: boolean }) => {
          mkdirCalls.push({ directory, options });
        },
        spawnSync: (command: string, args: string[], options: { shell?: boolean; encoding?: string }) => {
          spawnCalls.push({ command, args, options });
          return { status: 0, stdout: '', stderr: '' };
        },
      },
    });

    expect(target).toEqual({
      sheetFile: path.normalize('assets/generated/aseprite/character/hero.png'),
      dataFile: path.normalize('assets/generated/aseprite/character/hero.aseprite.json'),
    });
    expect(mkdirCalls).toEqual([
      {
        directory: path.normalize('assets/generated/aseprite/character'),
        options: { recursive: true },
      },
    ]);
    expect(spawnCalls).toHaveLength(1);
    expect(spawnCalls[0].command).toBe('C:\\Tools\\Aseprite\\aseprite.exe');
    expect(spawnCalls[0].args).toContain(path.normalize('assets/source/aseprite/character/hero.aseprite'));
    expect(spawnCalls[0].options.shell).toBeUndefined();
  });

  test('exportAseprite throws stderr and stdout when Aseprite exits with nonzero status', async () => {
    const { exportAseprite } = await import('../../tools/aseprite-pipeline/export-aseprite.mjs');

    expect(() =>
      exportAseprite({
        category: 'character',
        sourceFile: 'assets/source/aseprite/character/hero.aseprite',
        dependencies: {
          loadConfig: () => JSON.parse(readFileSync(configPath, 'utf8')),
          findAsepriteExecutable: () => 'aseprite',
          mkdirSync: () => undefined,
          spawnSync: () => ({ status: 1, stdout: 'export stdout', stderr: 'export stderr' }),
        },
      }),
    ).toThrow(/export stderr[\s\S]*export stdout/);
  });
});

describe('aseprite json normalizer', () => {
  test('converts json-array frames to the project atlas schema', async () => {
    const { normalizeAsepriteJson } = await import('../../tools/aseprite-pipeline/normalize-aseprite-json.mjs');
    const tags = [{ name: 'idle_D', from: 0, to: 1, direction: 'forward' }];
    const layers = [{ name: 'body', opacity: 255, blendMode: 'normal' }];

    const normalized = normalizeAsepriteJson({
      atlasName: 'atlas_character_hero',
      sheetFileName: 'hero.png',
      asepriteJson: {
        frames: [
          { filename: 'hero_idle_0', frame: { x: 0, y: 0, w: 64, h: 64 } },
          { filename: 'hero_idle_1', frame: { x: 64, y: 0, w: 64, h: 64 } },
        ],
        meta: {
          size: { w: 128, h: 64 },
          frameTags: tags,
          layers,
        },
      },
    });

    expect(normalized).toEqual({
      atlas: 'atlas_character_hero',
      image: 'hero.png',
      size: { w: 128, h: 64 },
      sprites: [
        { name: 'hero_idle_0', x: 0, y: 0, w: 64, h: 64 },
        { name: 'hero_idle_1', x: 64, y: 0, w: 64, h: 64 },
      ],
      tags,
      layers,
      count: 2,
    });
  });

  test('handles json-hash frames object and defaults missing meta size', async () => {
    const { normalizeAsepriteJson } = await import('../../tools/aseprite-pipeline/normalize-aseprite-json.mjs');

    const normalized = normalizeAsepriteJson({
      atlasName: 'atlas_ui_icons',
      sheetFileName: 'icons.png',
      asepriteJson: {
        frames: {
          'potion.png': { frame: { x: 4, y: 8, w: 16, h: 16 } },
          'sword.png': { frame: { x: 24, y: 8, w: 16, h: 16 } },
        },
        meta: {},
      },
    });

    expect(normalized).toEqual({
      atlas: 'atlas_ui_icons',
      image: 'icons.png',
      size: { w: 0, h: 0 },
      sprites: [
        { name: 'potion.png', x: 4, y: 8, w: 16, h: 16 },
        { name: 'sword.png', x: 24, y: 8, w: 16, h: 16 },
      ],
      tags: [],
      layers: [],
      count: 2,
    });
  });

  test('returns an empty sprite list when frames are missing or invalid', async () => {
    const { normalizeAsepriteJson } = await import('../../tools/aseprite-pipeline/normalize-aseprite-json.mjs');

    expect(
      normalizeAsepriteJson({
        atlasName: 'atlas_empty',
        sheetFileName: 'empty.png',
        asepriteJson: { meta: { size: { w: 32, h: 32 } } },
      }),
    ).toMatchObject({
      sprites: [],
      count: 0,
      size: { w: 32, h: 32 },
    });

    expect(
      normalizeAsepriteJson({
        atlasName: 'atlas_empty',
        sheetFileName: 'empty.png',
        asepriteJson: { frames: 'invalid' },
      }),
    ).toMatchObject({
      sprites: [],
      count: 0,
      size: { w: 0, h: 0 },
    });
  });

  test('normalizeFile reads input json, writes formatted output, and returns normalized object', async () => {
    const { normalizeFile } = await import('../../tools/aseprite-pipeline/normalize-aseprite-json.mjs');
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'aseprite-normalize-'));
    const inputFile = path.join(tempDir, 'hero.aseprite.json');
    const outputFile = path.join(tempDir, 'hero.atlas.json');

    try {
      await writeFile(
        inputFile,
        JSON.stringify({
          frames: [{ filename: 'hero_idle_0', frame: { x: 0, y: 0, w: 64, h: 64 } }],
          meta: { size: { w: 64, h: 64 } },
        }),
        'utf8',
      );

      const normalized = normalizeFile(inputFile, outputFile, 'atlas_character_hero', 'hero.png');
      const output = await readFile(outputFile, 'utf8');

      expect(normalized).toEqual({
        atlas: 'atlas_character_hero',
        image: 'hero.png',
        size: { w: 64, h: 64 },
        sprites: [{ name: 'hero_idle_0', x: 0, y: 0, w: 64, h: 64 }],
        tags: [],
        layers: [],
        count: 1,
      });
      expect(output).toBe(`${JSON.stringify(normalized, null, 2)}\n`);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});

describe('aseprite export validation gate', () => {
  test('readPngSize reads dimensions from a minimal PNG IHDR buffer', async () => {
    const { readPngSize } = await import('../../tools/aseprite-pipeline/validate-aseprite-export.mjs');
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'aseprite-validate-png-'));
    const pngFile = path.join(tempDir, 'atlas.png');

    try {
      await writeFile(pngFile, createMinimalPng(128, 64));

      expect(readPngSize(pngFile)).toEqual({ w: 128, h: 64 });
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  test('readPngSize rejects non-PNG files', async () => {
    const { readPngSize } = await import('../../tools/aseprite-pipeline/validate-aseprite-export.mjs');
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'aseprite-validate-png-'));
    const invalidFile = path.join(tempDir, 'atlas.txt');

    try {
      await writeFile(invalidFile, 'not a png', 'utf8');

      expect(() => readPngSize(invalidFile)).toThrow('Invalid PNG signature');
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  test('readPngSize rejects header-only PNG data without IDAT and IEND chunks', async () => {
    const { readPngSize } = await import('../../tools/aseprite-pipeline/validate-aseprite-export.mjs');
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'aseprite-validate-png-'));
    const pngFile = path.join(tempDir, 'atlas.png');

    try {
      await writeFile(pngFile, createHeaderOnlyPng(128, 64));

      expect(() => readPngSize(pngFile)).toThrow('missing IDAT chunk');
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  test('readPngSize rejects truncated PNG chunks', async () => {
    const { readPngSize } = await import('../../tools/aseprite-pipeline/validate-aseprite-export.mjs');
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'aseprite-validate-png-'));
    const pngFile = path.join(tempDir, 'atlas.png');

    try {
      await writeFile(pngFile, createPngWithTruncatedIdat(128, 64));

      expect(() => readPngSize(pngFile)).toThrow('truncated IDAT chunk');
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  test('validateAtlas accepts expected frame dimensions and required tags', async () => {
    const { validateAtlas } = await import('../../tools/aseprite-pipeline/validate-aseprite-export.mjs');

    const result = validateAtlas({
      pngSize: { w: 128, h: 64 },
      categoryConfig: { frameWidth: 64, frameHeight: 64, requiredTags: ['idle_D', 'walk_D'] },
      atlas: {
        size: { w: 128, h: 64 },
        sprites: [
          { name: 'hero_idle_0', x: 0, y: 0, w: 64, h: 64 },
          { name: 'hero_walk_0', x: 64, y: 0, w: 64, h: 64 },
        ],
        tags: [{ name: 'idle_D' }, { name: 'walk_D' }],
      },
    });

    expect(result).toEqual({ ok: true, errors: [] });
  });

  test('validateAtlas reports frame dimensions, missing tags, and PNG size mismatches', async () => {
    const { validateAtlas } = await import('../../tools/aseprite-pipeline/validate-aseprite-export.mjs');

    const result = validateAtlas({
      pngSize: { w: 128, h: 64 },
      categoryConfig: { frameWidth: 64, frameHeight: 64, requiredTags: ['idle_D', 'walk_D'] },
      atlas: {
        size: { w: 64, h: 64 },
        sprites: [{ name: 'hero_idle_0', x: 96, y: 0, w: 32, h: 64 }],
        tags: [{ name: 'idle_D' }],
      },
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        'Atlas meta size 64x64 does not match PNG size 128x64.',
        'Sprite "hero_idle_0" has size 32x64, expected 64x64.',
        'Missing required tag "walk_D".',
      ]),
    );
  });

  test('validateAtlas rejects required tag ranges that are non-integer, reversed, or outside sprites', async () => {
    const { validateAtlas } = await import('../../tools/aseprite-pipeline/validate-aseprite-export.mjs');

    const result = validateAtlas({
      pngSize: { w: 128, h: 64 },
      categoryConfig: { frameWidth: 64, frameHeight: 64, requiredTags: ['idle_D', 'walk_D', 'cast_D'] },
      atlas: {
        size: { w: 128, h: 64 },
        sprites: [
          { name: 'hero_idle_0', x: 0, y: 0, w: 64, h: 64 },
          { name: 'hero_walk_0', x: 64, y: 0, w: 64, h: 64 },
        ],
        tags: [
          { name: 'idle_D', from: 0.5, to: 1 },
          { name: 'walk_D', from: 1, to: 0 },
          { name: 'cast_D', from: 0, to: 2 },
        ],
      },
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        'Tag "idle_D" frame range must use integer from/to values.',
        'Tag "walk_D" frame range 1..0 is invalid.',
        'Tag "cast_D" frame range 0..2 is outside sprite index range 0..1.',
      ]),
    );
  });

  test('validateAtlas rejects atlas count when it is non-integer or does not match sprites length', async () => {
    const { validateAtlas } = await import('../../tools/aseprite-pipeline/validate-aseprite-export.mjs');
    const baseAtlas = {
      size: { w: 128, h: 64 },
      sprites: [
        { name: 'hero_idle_0', x: 0, y: 0, w: 64, h: 64 },
        { name: 'hero_walk_0', x: 64, y: 0, w: 64, h: 64 },
      ],
      tags: [],
    };

    const nonIntegerResult = validateAtlas({
      pngSize: { w: 128, h: 64 },
      categoryConfig: { frameWidth: 64, frameHeight: 64, requiredTags: [] },
      atlas: { ...baseAtlas, count: 1.5 },
    });
    const mismatchResult = validateAtlas({
      pngSize: { w: 128, h: 64 },
      categoryConfig: { frameWidth: 64, frameHeight: 64, requiredTags: [] },
      atlas: { ...baseAtlas, count: 3 },
    });

    expect(nonIntegerResult.ok).toBe(false);
    expect(nonIntegerResult.errors).toContain('Atlas count must be an integer when present.');
    expect(mismatchResult.ok).toBe(false);
    expect(mismatchResult.errors).toContain('Atlas count 3 does not match sprite count 2.');
  });

  test('validateAtlas rejects sprite rectangles with non-integer coordinates or sizes', async () => {
    const { validateAtlas } = await import('../../tools/aseprite-pipeline/validate-aseprite-export.mjs');

    const result = validateAtlas({
      pngSize: { w: 128, h: 64 },
      categoryConfig: { frameWidth: 64, frameHeight: 64, requiredTags: [] },
      atlas: {
        size: { w: 128, h: 64 },
        sprites: [{ name: 'hero_idle_0', x: 0.5, y: 0, w: 64, h: 64 }],
        tags: [],
      },
    });

    expect(result).toEqual({
      ok: false,
      errors: ['Sprite "hero_idle_0" has an invalid frame rectangle.'],
    });
  });

  test('loadConfig reads a config file from the provided path', async () => {
    const { loadConfig } = await import('../../tools/aseprite-pipeline/validate-aseprite-export.mjs');
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'aseprite-validate-config-'));
    const customConfigPath = path.join(tempDir, 'aseprite.config.json');
    const config = { categories: { ui: { frameWidth: 32, frameHeight: 32, requiredTags: [] } } };

    try {
      await writeFile(customConfigPath, JSON.stringify(config), 'utf8');

      expect(loadConfig(customConfigPath)).toEqual(config);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  test('CLI prints a JSON validation result and exits successfully for valid exports', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'aseprite-validate-cli-'));
    const pngFile = path.join(tempDir, 'hero.png');
    const atlasFile = path.join(tempDir, 'hero.atlas.json');

    try {
      await writeFile(pngFile, createMinimalPng(64, 64));
      await writeFile(
        atlasFile,
        JSON.stringify({
          size: { w: 64, h: 64 },
          sprites: [{ name: 'hero_idle_0', x: 0, y: 0, w: 64, h: 64 }],
          tags: [
            { name: 'idle_D' },
            { name: 'walk_D' },
            { name: 'attack_melee_D' },
            { name: 'cast_D' },
            { name: 'hit_D' },
            { name: 'death_D' },
            { name: 'ready_D' },
            { name: 'victory_D' },
          ],
        }),
        'utf8',
      );

      const { stdout, stderr } = await execFileAsync(process.execPath, [
        'tools/aseprite-pipeline/validate-aseprite-export.mjs',
        'character',
        pngFile,
        atlasFile,
      ]);

      expect(stderr).toBe('');
      expect(JSON.parse(stdout)).toEqual({ ok: true, errors: [] });
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
