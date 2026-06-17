import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  getSpriteResource,
  getSpriteResourceForItemIcon,
  getSpriteResourceForLobbyNpc,
  getSpriteResourceForMonster,
  getSpriteResourceForNpc,
  getSpriteResourceForSkillIcon,
  getSpriteResourceForStatusIcon,
  getSpriteResourceForVfx,
  getSpriteResourceForWorldZoneIcon,
  SPRITE_RESOURCE_MANIFEST,
} from '../../client/src/assets/spriteResourceManifest';
import { classSkills } from '../../client/src/data/classSkills';
import { getItemIconResource, resolveAsepriteItemIconId } from '../../client/src/data/itemIconResources';
import { getAllItemIconSpecs } from '../../client/src/data/itemIconSpecs';
import { getAllSkillTreeIconIds } from '../../client/src/data/skillTreeIcons';
import { getAllStatusIconSpecs } from '../../client/src/data/statusIconSpecs';
import { STATUS_EFFECT_ICON_IDS } from '../../client/src/data/statusEffectIcons';

function readSceneSource(sceneFileName: string): string {
  return readFileSync(resolve(process.cwd(), 'client/src/scenes', sceneFileName), 'utf8');
}

describe('sprite resource manifest', () => {
  it('defines Gorodi field NPC runtime image resource', () => {
    expect(getSpriteResource('npc_ghost_merchant_gorodi')).toEqual({
      id: 'npc_ghost_merchant_gorodi',
      category: 'npc',
      kind: 'spritesheet',
      key: 'npc_ghost_merchant_gorodi_sprite',
      path: 'assets/generated/characters/npc_sprites/npc_ghost_merchant_gorodi.png',
      frameWidth: 64,
      frameHeight: 64,
      frameCount: 6,
      npcId: 'npc_ghost_merchant',
    });
  });

  it('maps the dialogue NPC id to the distinct Gorodi sprite resource id', () => {
    const gorodi = getSpriteResourceForNpc('npc_ghost_merchant');

    expect(gorodi?.id).toBe('npc_ghost_merchant_gorodi');
    expect(gorodi?.key).toBe('npc_ghost_merchant_gorodi_sprite');
    expect(gorodi?.id).not.toBe('npc_ghost_merchant');
  });

  it('maps core lobby NPC ids to Aseprite spritesheet resources', () => {
    expect(getSpriteResourceForLobbyNpc('elder')).toMatchObject({
      id: 'npc_elder_mateus',
      key: 'npc_elder_mateus_sprite',
      frameWidth: 64,
      frameHeight: 64,
      frameCount: 6,
    });
    expect(getSpriteResourceForLobbyNpc('merchant')).toMatchObject({
      id: 'npc_merchant_mira',
      key: 'npc_merchant_mira_sprite',
    });
    expect(getSpriteResourceForLobbyNpc('blacksmith')).toMatchObject({
      id: 'npc_blacksmith_kalen',
      key: 'npc_blacksmith_kalen_sprite',
    });
    expect(getSpriteResourceForLobbyNpc('quest_board')).toMatchObject({
      id: 'npc_memory_fragment_board',
      key: 'npc_memory_fragment_board_sprite',
    });
    expect(getSpriteResourceForLobbyNpc('party_recruit')).toMatchObject({
      id: 'npc_guild_hashir',
      key: 'npc_guild_hashir_sprite',
    });
  });

  it('maps battle monster ids to Aseprite spritesheet resources', () => {
    expect(getSpriteResourceForMonster('mon_erebos_fog_rat')).toMatchObject({
      id: 'mon_erebos_fog_rat_normal',
      category: 'monster',
      kind: 'spritesheet',
      key: 'mon_erebos_fog_rat_normal_sprite',
      path: 'assets/generated/monsters/sprites/mon_erebos_fog_rat_normal.png',
      frameWidth: 64,
      frameHeight: 64,
      frameCount: 12,
    });
    expect(getSpriteResourceForMonster('mon_erebos_memory_beetle')).toMatchObject({
      id: 'mon_erebos_memory_beetle_normal',
      category: 'monster',
      kind: 'spritesheet',
      key: 'mon_erebos_memory_beetle_normal_sprite',
      path: 'assets/generated/monsters/sprites/mon_erebos_memory_beetle_normal.png',
      frameWidth: 64,
      frameHeight: 64,
      frameCount: 12,
    });
    expect(getSpriteResourceForMonster('mon_erebos_memory_dust')).toMatchObject({
      id: 'mon_erebos_memory_dust_normal',
      category: 'monster',
      kind: 'spritesheet',
      key: 'mon_erebos_memory_dust_normal_sprite',
      path: 'assets/generated/monsters/sprites/mon_erebos_memory_dust_normal.png',
      frameWidth: 64,
      frameHeight: 64,
      frameCount: 12,
    });
  });

  it('maps hit VFX ids to Aseprite spritesheet resources', () => {
    expect(getSpriteResourceForVfx('vfx_hit_slash')).toMatchObject({
      id: 'vfx_hit_slash',
      category: 'vfx',
      kind: 'spritesheet',
      key: 'vfx_hit_slash_sprite',
      path: 'assets/generated/vfx/sprites/vfx_hit_slash.png',
      frameWidth: 64,
      frameHeight: 64,
      frameCount: 8,
    });
  });

  it('maps world zone ids to Aseprite worldmap icon resources', () => {
    expect(getSpriteResourceForWorldZoneIcon('aether_plains')).toEqual({
      id: 'zone_aether_plains',
      category: 'worldmap',
      kind: 'image',
      key: 'zone_aether_plains',
      path: 'assets/generated/ui/worldmap/zone_aether_plains.png',
      frameWidth: 64,
      frameHeight: 64,
      frameCount: 1,
      zoneId: 'aether_plains',
    });
    expect(getSpriteResourceForWorldZoneIcon('chrono_spire')).toMatchObject({
      id: 'zone_chrono_spire',
      key: 'zone_chrono_spire',
      path: 'assets/generated/ui/worldmap/zone_chrono_spire.png',
    });
    expect(getSpriteResourceForWorldZoneIcon('malatus_sanctuary')).toMatchObject({
      id: 'zone_malatus_sanctuary',
      key: 'zone_malatus_sanctuary',
      path: 'assets/generated/ui/worldmap/zone_malatus_sanctuary.png',
    });
  });

  it('maps Ether Knight battle skill icon ids to Aseprite UI icon resources', () => {
    expect(getSpriteResourceForSkillIcon('skill_ek_slash')).toEqual({
      id: 'skill_ek_slash_icon',
      category: 'skillIcon',
      kind: 'image',
      key: 'skill_ek_slash_icon',
      path: 'assets/generated/ui/icons/skills/skill_ek_slash.png',
      frameWidth: 64,
      frameHeight: 64,
      frameCount: 1,
      skillIconId: 'skill_ek_slash',
    });
    expect(getSpriteResourceForSkillIcon('skill_ek_ultimate')).toMatchObject({
      id: 'skill_ek_ultimate_icon',
      key: 'skill_ek_ultimate_icon',
      path: 'assets/generated/ui/icons/skills/skill_ek_ultimate.png',
    });
  });

  it('maps every battle class skill icon id to an Aseprite UI icon resource', () => {
    for (const [classId, slots] of Object.entries(classSkills)) {
      for (const slot of slots) {
        expect(getSpriteResourceForSkillIcon(slot.icon), `${classId}:${slot.icon}`).toMatchObject({
          category: 'skillIcon',
          kind: 'image',
          key: `${slot.icon}_icon`,
          path: `assets/generated/ui/icons/skills/${slot.icon}.png`,
          frameWidth: 64,
          frameHeight: 64,
          frameCount: 1,
          skillIconId: slot.icon,
        });
      }
    }
  });

  it('maps every skill tree icon id to an Aseprite UI icon resource', () => {
    for (const iconId of getAllSkillTreeIconIds()) {
      expect(getSpriteResourceForSkillIcon(iconId), iconId).toMatchObject({
        category: 'skillIcon',
        kind: 'image',
        key: `${iconId}_icon`,
        path: `assets/generated/ui/icons/skills/${iconId}.png`,
        frameWidth: 64,
        frameHeight: 64,
        frameCount: 1,
        skillIconId: iconId,
      });
    }
  });

  it('maps every battle status effect id to an Aseprite UI icon resource', () => {
    for (const iconId of STATUS_EFFECT_ICON_IDS) {
      expect(getSpriteResourceForStatusIcon(iconId), iconId).toMatchObject({
        category: 'statusIcon',
        kind: 'image',
        key: `status_${iconId}_icon`,
        path: `assets/generated/ui/icons/status/status_${iconId}.png`,
        frameWidth: 32,
        frameHeight: 32,
        frameCount: 1,
        statusIconId: iconId,
      });
    }
  });

  it('maps every runtime status icon spec to an Aseprite UI icon resource', () => {
    for (const spec of getAllStatusIconSpecs()) {
      expect(getSpriteResourceForStatusIcon(spec.iconId), spec.iconId).toMatchObject({
        category: 'statusIcon',
        kind: 'image',
        key: spec.runtimeKey,
        path: spec.runtimePath,
        frameWidth: 32,
        frameHeight: 32,
        frameCount: 1,
        statusIconId: spec.iconId,
      });
    }
  });

  it('tracks all 40 status icon specs for AssetManager preload', () => {
    const specs = getAllStatusIconSpecs();

    expect(specs).toHaveLength(40);
    expect(specs.filter((spec) => spec.group === 'legacy_buff')).toHaveLength(5);
    expect(specs.filter((spec) => spec.group === 'legacy_debuff')).toHaveLength(20);
  });

  it('maps every item icon id to an Aseprite UI icon resource', () => {
    for (const spec of getAllItemIconSpecs()) {
      expect(getSpriteResourceForItemIcon(spec.iconId), spec.iconId).toMatchObject({
        category: 'itemIcon',
        kind: 'image',
        key: spec.runtimeKey,
        path: spec.runtimePath,
        frameWidth: 64,
        frameHeight: 64,
        frameCount: 1,
        itemIconId: spec.iconId,
      });
    }
  });

  it('resolves legacy shop and inventory item codes to Aseprite item icons', () => {
    expect(resolveAsepriteItemIconId({ code: 'CON_HP_S' })).toBe('ITM-CON-001');
    expect(resolveAsepriteItemIconId({ itemId: 'WP-010-bronzeSword', type: 'weapon' })).toBe('ITM-WPN-010');
    expect(resolveAsepriteItemIconId({ itemId: 'CS-003-smallPotion', type: 'consumable' })).toBe('ITM-CON-003');
    expect(resolveAsepriteItemIconId({ itemId: 'MAT-002-memoryShard', type: 'material' })).toBe('ITM-MAT-002');
    expect(resolveAsepriteItemIconId({ itemIconId: 'ITM-QST-004' })).toBe('ITM-QST-004');
    expect(getItemIconResource({ itemIconId: 'ITM-MAT-002' })).toMatchObject({
      key: 'icon_item_ITM-MAT_002',
      itemIconId: 'ITM-MAT-002',
    });
  });

  it('keeps sprite resource keys unique', () => {
    const keys = SPRITE_RESOURCE_MANIFEST.map((resource) => resource.key);

    expect(new Set(keys).size).toBe(keys.length);
  });

  it('GameScene loads and resolves NPC sprite resources before rectangle fallback', () => {
    const source = readSceneSource('GameScene.ts');

    expect(source).toContain("getSpriteResourceForNpc(id)");
    expect(source).toContain('this.load.spritesheet(resource.key, resource.path');
    expect(source).toContain('if (resource && this.textures.exists(resource.key))');
  });

  it('GameScene loads and renders Aseprite field monster resources before procedural fallback', () => {
    const source = readSceneSource('GameScene.ts');
    const mainSource = readFileSync(resolve(process.cwd(), 'client/src/main.ts'), 'utf8');

    expect(source).toContain("import { getSpriteResourceForMonster, getSpriteResourceForNpc, getSpriteResourceForSkillIcon, getSpriteResourceForWorldZoneIcon, SPRITE_RESOURCE_MANIFEST } from '../assets/spriteResourceManifest';");
    expect(source).toContain("resource.category !== 'npc' && resource.category !== 'monster'");
    expect(source).toContain('this.load.spritesheet(resource.key, resource.path');
    expect(source).toContain("const cleanId = id.replace(/_\\d+$/u, '')");
    expect(source).toContain('const monsterResource = getSpriteResourceForMonster(cleanId)');
    expect(source).toContain('this.add.image(x, y, monsterResource.key, 0)');
    expect(source).toContain('setDisplaySize(size, size)');
    expect(source).toContain('sprite.setFrame(0)');
    expect(source).toContain('Phaser.Textures.FilterMode.NEAREST');
    expect(source).toContain('Aseprite field monster sprite 로드 실패 시에만 사용하는 안전 fallback');
    expect(source).toContain('GameScene.MONSTER_EMOJIS');
    expect(mainSource).toContain("if (debugScene === 'game')");
    expect(mainSource).toContain("phaserGame.scene.start('GameScene', {");
    expect(mainSource).toContain('offlineQa: true');
  });

  it('GameScene boss field labels render an Aseprite skill icon before the sword glyph fallback', () => {
    const source = readSceneSource('GameScene.ts');
    const mainSource = readFileSync(resolve(process.cwd(), 'client/src/main.ts'), 'utf8');

    expect(source).toContain("getSpriteResourceForMonster, getSpriteResourceForNpc, getSpriteResourceForSkillIcon, getSpriteResourceForWorldZoneIcon, SPRITE_RESOURCE_MANIFEST");
    expect(source).toContain("const GAME_SCENE_BOSS_LABEL_ICON_ID = 'skill_ek_slash'");
    expect(source).toContain('bossLabelIconQa?: boolean');
    expect(source).toContain('private bossLabelIcons: Phaser.GameObjects.Image[] = []');
    expect(source).toContain('private bossLabelIconFallbackCount = 0');
    expect(source).toContain('const bossLabelIconResource = getSpriteResourceForSkillIcon(GAME_SCENE_BOSS_LABEL_ICON_ID)');
    expect(source).toContain('this.load.image(bossLabelIconResource.key, bossLabelIconResource.path)');
    expect(source).toContain('this._spawnMonster(\'mon_erebos_memory_dust\', \'QA 보스 Lv.30\', 1130, 560, true)');
    expect(source).toContain('const bossLabelIconResource = getSpriteResourceForSkillIcon(GAME_SCENE_BOSS_LABEL_ICON_ID)');
    expect(source).toContain('const hasBossLabelIcon = Boolean(bossLabelIconResource && this.textures.exists(bossLabelIconResource.key))');
    expect(source).toContain('this._addBossLabelIcon(x - 24, y + size / 2 + 12, bossLabelIconResource)');
    expect(source).toContain("const bossLabelText = hasBossLabelIcon ? 'BOSS' : '⚔️ BOSS'");
    expect(source).toContain("setName('game_scene_boss_label_icon')");
    expect(source).toContain('icon.setDisplaySize(18, 18)');
    expect(source).toContain('icon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST)');
    expect(source).toContain('document.body.dataset.aeternaGameBossLabelIconQa = JSON.stringify');
    expect(source).toContain('missingBossLabelIconKeys');
    expect(source).not.toContain("this.add.text(x, y + size / 2 + 12, '⚔️ BOSS'");
    expect(mainSource).toContain("bossLabelIconQa: params.get('bossLabelIconQa') === '1'");
  });

  it('GameScene top zone label renders an Aseprite worldmap icon before the location glyph fallback', () => {
    const source = readSceneSource('GameScene.ts');
    const mainSource = readFileSync(resolve(process.cwd(), 'client/src/main.ts'), 'utf8');

    expect(source).toContain("getSpriteResourceForWorldZoneIcon, SPRITE_RESOURCE_MANIFEST");
    expect(source).toContain('zoneLabelIconQa?: boolean');
    expect(source).toContain('private zoneLabelIcon?: Phaser.GameObjects.Image');
    expect(source).toContain('private zoneLabelIconFallbackRendered = false');
    expect(source).toContain('const zoneLabelIconResource = getSpriteResourceForWorldZoneIcon(this.currentZoneId)');
    expect(source).toContain('this.load.image(zoneLabelIconResource.key, zoneLabelIconResource.path)');
    expect(source).toContain('const hasZoneLabelIcon = Boolean(zoneLabelIconResource && this.textures.exists(zoneLabelIconResource.key))');
    expect(source).toContain("this._addZoneLabelIcon(this.zoneLabel.x - this.zoneLabel.displayWidth / 2 - 12, 30, zoneLabelIconResource)");
    expect(source).toContain("setName('game_scene_zone_label_icon')");
    expect(source).toContain('icon.setDisplaySize(18, 18)');
    expect(source).toContain('icon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST)');
    expect(source).toContain('this._writeZoneLabelIconQaProbe({ hasZoneLabelIcon })');
    expect(source).toContain('document.body.dataset.aeternaGameZoneLabelIconQa = JSON.stringify');
    expect(source).toContain('missingZoneLabelIconKeys');
    expect(source).not.toContain("this.zoneLabel = this.add.text(width / 2, 20, `📍 ${this.currentZoneName}  /  ${era.label}`");
    expect(source).not.toContain("this.zoneLabel?.setText(`📍 ${projection.displayName}  /  ${getChronoEra(this.currentEraId).label}`)");
    expect(mainSource).toContain("zoneLabelIconQa: params.get('zoneLabelIconQa') === '1'");
  });

  it('GameScene error screen title renders an Aseprite warning icon before the warning glyph fallback', () => {
    const source = readSceneSource('GameScene.ts');
    const mainSource = readFileSync(resolve(process.cwd(), 'client/src/main.ts'), 'utf8');

    expect(source).toContain("const GAME_SCENE_ERROR_ICON_ID = 'skill_ek_explode'");
    expect(source).toContain('gameErrorIconQa?: boolean');
    expect(source).toContain('private errorScreenIcon?: Phaser.GameObjects.Image');
    expect(source).toContain('private errorScreenIconFallbackRendered = false');
    expect(source).toContain('const errorIconResource = getSpriteResourceForSkillIcon(GAME_SCENE_ERROR_ICON_ID)');
    expect(source).toContain('this.load.image(errorIconResource.key, errorIconResource.path)');
    expect(source).toContain("this._showErrorScreen(new Error('QA error screen probe'))");
    expect(source).toContain('const hasErrorIcon = Boolean(errorIconResource && this.textures.exists(errorIconResource.key))');
    expect(source).toContain("this._addErrorScreenIcon(width / 2 - 96, height / 2 - 60, errorIconResource)");
    expect(source).toContain("const errorTitleLabel = hasErrorIcon ? '존 로딩 실패' : '⚠️ 존 로딩 실패'");
    expect(source).toContain("setName('game_scene_error_title_icon')");
    expect(source).toContain('icon.setDisplaySize(22, 22)');
    expect(source).toContain('icon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST)');
    expect(source).toContain('this._writeGameErrorIconQaProbe({ hasErrorIcon })');
    expect(source).toContain('document.body.dataset.aeternaGameErrorIconQa = JSON.stringify');
    expect(source).toContain('missingGameErrorIconKeys');
    expect(source).not.toContain('this.add.text(width / 2, height / 2 - 60, `⚠️ 존 로딩 실패`');
    expect(mainSource).toContain("gameErrorIconQa: params.get('gameErrorIconQa') === '1'");
  });

  it('GameScene connection status renders an Aseprite icon before circle/x glyph fallback', () => {
    const source = readSceneSource('GameScene.ts');
    const mainSource = readFileSync(resolve(process.cwd(), 'client/src/main.ts'), 'utf8');

    expect(source).toContain("const GAME_SCENE_CONNECTION_ICON_IDS = {");
    expect(source).toContain("connected: 'skill_mw_arrow'");
    expect(source).toContain("offline: 'skill_tg_stop'");
    expect(source).toContain("error: 'skill_ek_explode'");
    expect(source).toContain("gameConnectionIconQa?: 'connected' | 'offline' | 'error'");
    expect(source).toContain('private connectionStatusIcon?: Phaser.GameObjects.Image');
    expect(source).toContain('private connectionStatusIconFallbackRendered = false');
    expect(source).toContain('function getGameSceneConnectionIconResource(mode: GameSceneConnectionIconMode)');
    expect(source).toContain('this.load.image(connectionIconResource.key, connectionIconResource.path)');
    expect(source).toContain('this._renderConnectionStatus(this.sceneData.gameConnectionIconQa)');
    expect(source).toContain("setName('game_scene_connection_status_icon')");
    expect(source).toContain('icon.setDisplaySize(14, 14)');
    expect(source).toContain('icon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST)');
    expect(source).toContain('document.body.dataset.aeternaGameConnectionIconQa = JSON.stringify');
    expect(source).toContain('legacyGlyphPresent');
    expect(source).toContain('missingGameConnectionIconKeys');
    expect(source).not.toContain("this.connectionLabel?.setText('● 로컬 QA')");
    expect(source).not.toContain("this.connectionLabel?.setText(networkManager.isConnected ? '● 온라인' : '○ 오프라인')");
    expect(mainSource).toContain("const gameConnectionIconQaParam = params.get('gameConnectionIconQa')");
    expect(mainSource).toContain("gameConnectionIconQa: gameConnectionIconQaParam === 'connected' || gameConnectionIconQaParam === 'offline' || gameConnectionIconQaParam === 'error'");
  });

  it('LobbyScene uses Aseprite sprite resources before legacy NPC PNG fallback', () => {
    const source = readSceneSource('LobbyScene.ts');

    expect(source).toContain("getSpriteResourceForLobbyNpc(npcId)");
    expect(source).toContain('this.load.spritesheet(resource.key, resource.path');
    expect(source).toContain("getSpriteResourceForLobbyNpc(npc.id)");
    expect(source).toContain('body.setFrame(0)');
  });

  it('LobbyScene connection status renders an Aseprite icon before circle/x glyph fallback', () => {
    const source = readSceneSource('LobbyScene.ts');
    const mainSource = readFileSync(resolve(process.cwd(), 'client/src/main.ts'), 'utf8');

    expect(source).toContain("const LOBBY_CONNECTION_ICON_IDS = {");
    expect(source).toContain("connected: 'skill_mw_arrow'");
    expect(source).toContain("offline: 'skill_tg_stop'");
    expect(source).toContain("error: 'skill_ek_explode'");
    expect(source).toContain("lobbyConnectionIconQa?: 'connected' | 'offline' | 'error'");
    expect(source).toContain('private lobbyConnectionStatusIcon: Phaser.GameObjects.Image | null = null');
    expect(source).toContain('private lobbyConnectionStatusIconFallbackRendered = false');
    expect(source).toContain('function getLobbyConnectionIconResource(mode: LobbyConnectionIconMode)');
    expect(source).toContain('this.load.image(connectionIconResource.key, connectionIconResource.path)');
    expect(source).toContain('this._renderLobbyConnectionStatus(this.characterData.lobbyConnectionIconQa)');
    expect(source).toContain("setName('lobby_connection_status_icon')");
    expect(source).toContain('icon.setDisplaySize(14, 14)');
    expect(source).toContain('icon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST)');
    expect(source).toContain('document.body.dataset.aeternaLobbyConnectionIconQa = JSON.stringify');
    expect(source).toContain('legacyGlyphPresent');
    expect(source).toContain('missingLobbyConnectionIconKeys');
    expect(source).not.toContain("this.connectionIndicator.setText('● 로컬 QA')");
    expect(source).not.toContain("networkManager.isConnected ? '● 온라인' : '○ 연결 중...'");
    expect(mainSource).toContain("const lobbyConnectionIconQaParam = params.get('lobbyConnectionIconQa')");
    expect(mainSource).toContain("lobbyConnectionIconQa: lobbyConnectionIconQaParam === 'connected' || lobbyConnectionIconQaParam === 'offline' || lobbyConnectionIconQaParam === 'error'");
  });

  it('LobbyScene dialogue panel renders an Aseprite portrait title icon before the speech glyph fallback', () => {
    const source = readSceneSource('LobbyScene.ts');
    const mainSource = readFileSync(resolve(process.cwd(), 'client/src/main.ts'), 'utf8');

    expect(source).toContain("const LOBBY_DIALOGUE_TITLE_ICON_NPC_ID = 'merchant'");
    expect(source).toContain('dialogueTitleIconQa?: boolean');
    expect(source).toContain('private lobbyDialogueTitleIcon: Phaser.GameObjects.Image | null = null');
    expect(source).toContain('private lobbyDialogueTitleIconFallbackRendered = false');
    expect(source).toContain('const dialogueTitleIconResource = LOBBY_NPC_PORTRAIT_TEXTURES[npc.id]');
    expect(source).toContain('private _openDialogueTitleIconQaPanel(): void');
    expect(source).toContain("const merchant = TOWN_NPCS.find((npc) => npc.id === LOBBY_DIALOGUE_TITLE_ICON_NPC_ID)");
    expect(source).toContain('this._openNpcDialogue(merchant)');
    expect(source).toContain('private _addLobbyDialogueTitleIcon(');
    expect(source).toContain("setName('lobby_dialogue_title_icon')");
    expect(source).toContain('titleIcon.setDisplaySize(20, 20)');
    expect(source).toContain('titleIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST)');
    expect(source).toContain('const hasDialogueTitleIcon = Boolean(dialogueTitleIconResource && this.textures.exists(dialogueTitleIconResource.key))');
    expect(source).toContain("const titleText = hasDialogueTitleIcon ? npc.name : `💬 ${npc.name}`");
    expect(source).toContain('this._writeDialogueTitleIconQaProbe({ npc, titleText })');
    expect(source).toContain('document.body.dataset.aeternaDialogueTitleIconQa = JSON.stringify');
    expect(source).toContain('missingDialogueTitleIconKeys');
    expect(source).not.toContain("panel.add(this.add.text(0, -70, `💬 ${npc.name}`,");
    expect(mainSource).toContain("dialogueTitleIconQa: params.get('dialogueTitleIconQa') === '1'");
  });

  it('LobbyScene dialogue choice focus uses an Aseprite arrow icon before the focus glyph fallback', () => {
    const source = readSceneSource('LobbyScene.ts');
    const mainSource = readFileSync(resolve(process.cwd(), 'client/src/main.ts'), 'utf8');

    expect(source).toContain("const LOBBY_DIALOGUE_CHOICE_FOCUS_ICON_ID = 'skill_mw_arrow'");
    expect(source).toContain('dialogueChoiceFocusIconQa?: boolean');
    expect(source).toContain('private lobbyDialogueChoiceFocusIcon: Phaser.GameObjects.Image | null = null');
    expect(source).toContain('private lobbyDialogueChoiceFocusIconFallbackRendered = false');
    expect(source).toContain('const dialogueChoiceFocusIconResource = getSpriteResourceForSkillIcon(LOBBY_DIALOGUE_CHOICE_FOCUS_ICON_ID)');
    expect(source).toContain('this.load.image(dialogueChoiceFocusIconResource.key, dialogueChoiceFocusIconResource.path)');
    expect(source).toContain('private _openDialogueChoiceFocusIconQaPanel(): void');
    expect(source).toContain('private _renderDialogueChoiceFocus(');
    expect(source).toContain('private _addLobbyDialogueChoiceFocusIcon(');
    expect(source).toContain("setName('lobby_dialogue_choice_focus_icon')");
    expect(source).toContain('focusIcon.setDisplaySize(14, 14)');
    expect(source).toContain('focusIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST)');
    expect(source).toContain('document.body.dataset.aeternaDialogueChoiceFocusIconQa = JSON.stringify');
    expect(source).toContain('legacyGlyphPresent');
    expect(source).toContain('missingDialogueChoiceFocusIconKeys');
    expect(source).not.toContain("acceptBtn.setText(dialogueIndex === 0 ? '▶ [ 이용하기 ]'");
    expect(source).not.toContain("closeBtn.setText(dialogueIndex === 1 ? '▶ [ 닫기 ]'");
    expect(mainSource).toContain("dialogueChoiceFocusIconQa: params.get('dialogueChoiceFocusIconQa') === '1'");
  });

  it('LobbyScene bottom nav focus uses an Aseprite arrow icon before the focus glyph fallback', () => {
    const source = readSceneSource('LobbyScene.ts');
    const mainSource = readFileSync(resolve(process.cwd(), 'client/src/main.ts'), 'utf8');

    expect(source).toContain("const LOBBY_NAV_FOCUS_ICON_ID = 'skill_mw_arrow'");
    expect(source).toContain('lobbyNavFocusIconQa?: boolean');
    expect(source).toContain('private lobbyNavFocusIcon: Phaser.GameObjects.Image | null = null');
    expect(source).toContain('private lobbyNavFocusIconFallbackRendered = false');
    expect(source).toContain('const navFocusIconResource = getSpriteResourceForSkillIcon(LOBBY_NAV_FOCUS_ICON_ID)');
    expect(source).toContain('private _isLobbyNavFocusIconQaRoute(): boolean');
    expect(source).toContain('private _writeLobbyNavFocusIconQaProbe(): void');
    expect(source).toContain('private _addLobbyNavFocusIcon(');
    expect(source).toContain("setName('lobby_nav_focus_icon')");
    expect(source).toContain('focusIcon.setDisplaySize(14, 14)');
    expect(source).toContain('focusIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST)');
    expect(source).toContain('document.body.dataset.aeternaLobbyNavFocusIconQa = JSON.stringify');
    expect(source).toContain('missingLobbyNavFocusIconKeys');
    expect(source).toContain('activeIndex: this.navIndex');
    expect(source).not.toContain('item.text.setText(isActive ? `▶ ${item.label}` : item.label);');
    expect(mainSource).toContain("lobbyNavFocusIconQa: params.get('lobbyNavFocusIconQa') === '1'");
  });

  it('LobbyScene preloads Aseprite skill tree icon resources', () => {
    const source = readSceneSource('LobbyScene.ts');

    expect(source).toContain('preloadSkillTreeIconResources(this)');
  });

  it('LobbyScene preloads and renders Aseprite item icons for shop and inventory panels', () => {
    const source = readSceneSource('LobbyScene.ts');
    const mainSource = readFileSync(resolve(process.cwd(), 'client/src/main.ts'), 'utf8');

    expect(source).toContain("import { getItemIconResource, preloadItemIconResources } from '../data/itemIconResources';");
    expect(source).toContain("type ItemIconQaMode = 'shop' | 'inventory'");
    expect(source).toContain('itemIconQa?: ItemIconQaMode');
    expect(source).toContain('private _getItemIconQaMode(): ItemIconQaMode | undefined');
    expect(source).toContain('preloadItemIconResources(this)');
    expect(source).toContain('LOBBY_QA_INVENTORY_ITEMS');
    expect(source).toContain("if (itemIconQaMode === 'shop')");
    expect(source).toContain("if (itemIconQaMode === 'inventory')");
    expect(source).toContain('this._addLobbyItemIcon(panel, -214, y + 8, item, 28)');
    expect(source).toContain('this._addLobbyItemIcon(panel, -220, y + 8, item, 28)');
    expect(source).toContain('const iconResource = getItemIconResource(item)');
    expect(source).toContain("setName(`item_icon_${iconResource.itemIconId}`)");
    expect(source).toContain('document.body.dataset.aeternaItemIconQa = JSON.stringify');
    expect(source).toContain('this._recordItemIconQaProbe(iconResource.itemIconId, true)');
    expect(mainSource).toContain("const itemIconQaParam = params.get('itemIconQa')");
    expect(mainSource).toContain("itemIconQa: itemIconQaParam === 'shop' || itemIconQaParam === 'inventory' ? itemIconQaParam : undefined");
  });

  it('LobbyScene gold HUD renders an Aseprite material icon before the coin glyph fallback', () => {
    const source = readSceneSource('LobbyScene.ts');
    const mainSource = readFileSync(resolve(process.cwd(), 'client/src/main.ts'), 'utf8');

    expect(getItemIconResource({ itemIconId: 'ITM-MAT-002' })).toMatchObject({
      itemIconId: 'ITM-MAT-002',
      key: 'icon_item_ITM-MAT_002',
      path: 'assets/generated/ui/icons/items/ITM-MAT-002.png',
    });
    expect(source).toContain("const LOBBY_GOLD_ICON_ID = 'ITM-MAT-002'");
    expect(source).toContain('goldIconQa?: boolean');
    expect(source).toContain('private goldIcon: Phaser.GameObjects.Image | null = null');
    expect(source).toContain('private goldIconFallbackRendered = false');
    expect(source).toContain('const goldIconResource = getItemIconResource({ itemIconId: LOBBY_GOLD_ICON_ID })');
    expect(source).toContain("setName('lobby_gold_icon')");
    expect(source).toContain('this.goldIcon.setDisplaySize(18, 18)');
    expect(source).toContain('this.goldIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST)');
    expect(source).toContain("this._setGoldLabel('999 Gold')");
    expect(source).toContain("this._setGoldLabel(`${gold.toLocaleString()} Gold`)");
    expect(source).toContain('this._writeGoldIconQaProbe()');
    expect(source).toContain('document.body.dataset.aeternaLobbyGoldIconQa = JSON.stringify');
    expect(source).toContain('missingGoldIconKeys');
    expect(source).not.toContain("this.goldText = this.add.text(w - 12, 12, '💰 --- Gold'");
    expect(source).not.toContain("this.goldText.setText('💰 999 Gold')");
    expect(source).not.toContain("this.goldText.setText(`💰 ${gold.toLocaleString()} Gold`)");
    expect(mainSource).toContain("goldIconQa: params.get('goldIconQa') === '1'");
  });

  it('LobbyScene inventory panel renders an Aseprite title icon before the bag glyph fallback', () => {
    const source = readSceneSource('LobbyScene.ts');
    const mainSource = readFileSync(resolve(process.cwd(), 'client/src/main.ts'), 'utf8');

    expect(source).toContain("const LOBBY_INVENTORY_TITLE_ICON_ID = 'ITM-CON-001'");
    expect(source).toContain('inventoryTitleIconQa?: boolean');
    expect(source).toContain('private lobbyInventoryTitleIcon: Phaser.GameObjects.Image | null = null');
    expect(source).toContain('private lobbyInventoryTitleIconFallbackRendered = false');
    expect(source).toContain('const inventoryTitleIconResource = getItemIconResource({ itemIconId: LOBBY_INVENTORY_TITLE_ICON_ID })');
    expect(source).toContain('private _openInventoryTitleIconQaPanel(): void');
    expect(source).toContain('this._showInventoryPanel(LOBBY_QA_INVENTORY_ITEMS)');
    expect(source).toContain('private _addLobbyInventoryTitleIcon(');
    expect(source).toContain("setName('lobby_inventory_title_icon')");
    expect(source).toContain('titleIcon.setDisplaySize(20, 20)');
    expect(source).toContain('titleIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST)');
    expect(source).toContain('const hasInventoryTitleIcon = Boolean(inventoryTitleIconResource && this.textures.exists(inventoryTitleIconResource.key))');
    expect(source).toContain("const titleText = hasInventoryTitleIcon ? `인벤토리 (${items.length}개)` : `🎒 인벤토리 (${items.length}개)`");
    expect(source).toContain('this._writeInventoryTitleIconQaProbe({ titleText })');
    expect(source).toContain('document.body.dataset.aeternaInventoryTitleIconQa = JSON.stringify');
    expect(source).toContain('missingInventoryTitleIconKeys');
    expect(source).not.toContain("panel.add(this.add.text(0, -panelH / 2 + 20, `🎒 인벤토리 (${items.length}개)`,");
    expect(mainSource).toContain("inventoryTitleIconQa: params.get('inventoryTitleIconQa') === '1'");
  });

  it('LobbyScene inventory panel action focus uses an Aseprite arrow icon before row and close glyph fallback', () => {
    const source = readSceneSource('LobbyScene.ts');
    const mainSource = readFileSync(resolve(process.cwd(), 'client/src/main.ts'), 'utf8');
    const inventoryPanelSource = source.slice(
      source.indexOf('private _showInventoryPanel'),
      source.indexOf('private _addLobbyInventoryTitleIcon'),
    );

    expect(source).toContain("const LOBBY_INVENTORY_ACTION_FOCUS_ICON_ID = 'skill_mw_arrow'");
    expect(source).toContain('inventoryActionFocusIconQa?: boolean');
    expect(source).toContain('private lobbyInventoryActionFocusIcon: Phaser.GameObjects.Image | null = null');
    expect(source).toContain('private lobbyInventoryActionFocusIconFallbackRendered = false');
    expect(source).toContain('private lobbyInventoryActionFocusTexts: Phaser.GameObjects.Text[] = []');
    expect(source).toContain('const inventoryActionFocusIconResource = getSpriteResourceForSkillIcon(LOBBY_INVENTORY_ACTION_FOCUS_ICON_ID)');
    expect(source).toContain('private _openInventoryActionFocusIconQaPanel(): void');
    expect(source).toContain('private _writeInventoryActionFocusIconQaProbe(');
    expect(source).toContain('private _renderLobbyInventoryActionFocus(');
    expect(source).toContain('private _addLobbyInventoryActionFocusIcon(');
    expect(source).toContain("setName('lobby_inventory_action_focus_icon')");
    expect(source).toContain('focusIcon.setDisplaySize(14, 14)');
    expect(source).toContain('focusIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST)');
    expect(source).toContain('document.body.dataset.aeternaInventoryActionFocusIconQa = JSON.stringify');
    expect(source).toContain('missingInventoryActionFocusIconKeys');
    expect(source).toContain('activeIndex');
    expect(inventoryPanelSource).not.toContain('nameText.setText(a ? `▶ ${itemName}` : itemName)');
    expect(inventoryPanelSource).not.toContain("closeBtn.setText(a ? '▶ [ 닫기 ]' : '[ 닫기 ]')");
    expect(mainSource).toContain("inventoryActionFocusIconQa: params.get('inventoryActionFocusIconQa') === '1'");
  });

  it('LobbyScene party recruit panel renders an Aseprite title icon before the sword glyph fallback', () => {
    const source = readSceneSource('LobbyScene.ts');
    const mainSource = readFileSync(resolve(process.cwd(), 'client/src/main.ts'), 'utf8');

    expect(source).toContain("const LOBBY_PARTY_RECRUIT_TITLE_ICON_ID = 'skill_ek_slash'");
    expect(source).toContain('partyRecruitIconQa?: boolean');
    expect(source).toContain('private lobbyPartyRecruitTitleIcon: Phaser.GameObjects.Image | null = null');
    expect(source).toContain('private lobbyPartyRecruitTitleIconFallbackRendered = false');
    expect(source).toContain('const partyTitleIconResource = getSpriteResourceForSkillIcon(LOBBY_PARTY_RECRUIT_TITLE_ICON_ID)');
    expect(source).toContain('this.load.image(partyTitleIconResource.key, partyTitleIconResource.path)');
    expect(source).toContain('private _openPartyRecruitIconQaPanel(): void');
    expect(source).toContain("const partyRecruit = TOWN_NPCS.find((npc) => npc.id === 'party_recruit')");
    expect(source).toContain('this._showPartyPanel(partyRecruit)');
    expect(source).toContain('private _addLobbyPartyRecruitTitleIcon(');
    expect(source).toContain("setName('lobby_party_recruit_title_icon')");
    expect(source).toContain('titleIcon.setDisplaySize(20, 20)');
    expect(source).toContain('titleIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST)');
    expect(source).toContain('const hasPartyTitleIcon = Boolean(partyTitleIconResource && this.textures.exists(partyTitleIconResource.key))');
    expect(source).toContain("const titleText = hasPartyTitleIcon ? `${npc.name} — 파티 모집` : `⚔️ ${npc.name} — 파티 모집`");
    expect(source).toContain('this._writePartyRecruitIconQaProbe({ titleText })');
    expect(source).toContain('document.body.dataset.aeternaPartyRecruitIconQa = JSON.stringify');
    expect(source).toContain('missingPartyRecruitTitleIconKeys');
    expect(source).not.toContain("panel.add(this.add.text(0, -90, `⚔️ ${npc.name} — 파티 모집`,");
    expect(mainSource).toContain("partyRecruitIconQa: params.get('partyRecruitIconQa') === '1'");
  });

  it('LobbyScene party panel action focus uses an Aseprite arrow icon before the focus glyph fallback', () => {
    const source = readSceneSource('LobbyScene.ts');
    const mainSource = readFileSync(resolve(process.cwd(), 'client/src/main.ts'), 'utf8');
    const partyPanelSource = source.slice(
      source.indexOf('private _showPartyPanel'),
      source.indexOf('private _addLobbyPartyRecruitTitleIcon'),
    );

    expect(source).toContain("const LOBBY_PARTY_ACTION_FOCUS_ICON_ID = 'skill_mw_arrow'");
    expect(source).toContain('partyActionFocusIconQa?: boolean');
    expect(source).toContain('private lobbyPartyActionFocusIcon: Phaser.GameObjects.Image | null = null');
    expect(source).toContain('private lobbyPartyActionFocusIconFallbackRendered = false');
    expect(source).toContain('private lobbyPartyActionFocusTexts: Phaser.GameObjects.Text[] = []');
    expect(source).toContain('const partyActionFocusIconResource = getSpriteResourceForSkillIcon(LOBBY_PARTY_ACTION_FOCUS_ICON_ID)');
    expect(source).toContain('private _openPartyActionFocusIconQaPanel(): void');
    expect(source).toContain('private _writePartyActionFocusIconQaProbe(');
    expect(source).toContain('private _renderLobbyPartyActionFocus(');
    expect(source).toContain('private _addLobbyPartyActionFocusIcon(');
    expect(source).toContain("setName('lobby_party_action_focus_icon')");
    expect(source).toContain('focusIcon.setDisplaySize(14, 14)');
    expect(source).toContain('focusIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST)');
    expect(source).toContain('document.body.dataset.aeternaPartyActionFocusIconQa = JSON.stringify');
    expect(source).toContain('missingPartyActionFocusIconKeys');
    expect(source).toContain('activeIndex');
    expect(partyPanelSource).not.toContain("createBtn.setText(a ? '▶ [ 파티 생성 ]' : '[ 파티 생성 ]')");
    expect(partyPanelSource).not.toContain("searchBtn.setText(a ? '▶ [ 파티 검색 ]' : '[ 파티 검색 ]')");
    expect(partyPanelSource).not.toContain("closeBtn.setText(a ? '▶ [ 닫기 ]' : '[ 닫기 ]')");
    expect(mainSource).toContain("partyActionFocusIconQa: params.get('partyActionFocusIconQa') === '1'");
  });

  it('LobbyScene shop panel renders an Aseprite title icon before the cart glyph fallback', () => {
    const source = readSceneSource('LobbyScene.ts');
    const mainSource = readFileSync(resolve(process.cwd(), 'client/src/main.ts'), 'utf8');

    expect(source).toContain("const LOBBY_SHOP_TITLE_ICON_ID = 'ITM-CON-001'");
    expect(source).toContain('shopTitleIconQa?: boolean');
    expect(source).toContain('private lobbyShopTitleIcon: Phaser.GameObjects.Image | null = null');
    expect(source).toContain('private lobbyShopTitleIconFallbackRendered = false');
    expect(source).toContain('const shopTitleIconResource = getItemIconResource({ itemIconId: LOBBY_SHOP_TITLE_ICON_ID })');
    expect(source).toContain('private _openShopTitleIconQaPanel(): void');
    expect(source).toContain("const merchant = TOWN_NPCS.find((npc) => npc.id === 'merchant')");
    expect(source).toContain('void this._showShopPanel(merchant)');
    expect(source).toContain('private _addLobbyShopTitleIcon(');
    expect(source).toContain("setName('lobby_shop_title_icon')");
    expect(source).toContain('titleIcon.setDisplaySize(20, 20)');
    expect(source).toContain('titleIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST)');
    expect(source).toContain('const hasShopTitleIcon = Boolean(shopTitleIconResource && this.textures.exists(shopTitleIconResource.key))');
    expect(source).toContain("const titleText = hasShopTitleIcon ? `${npc.name} — 아이템 상점` : `🛒 ${npc.name} — 아이템 상점`");
    expect(source).toContain('this._writeShopTitleIconQaProbe({ titleText })');
    expect(source).toContain('document.body.dataset.aeternaShopTitleIconQa = JSON.stringify');
    expect(source).toContain('missingShopTitleIconKeys');
    expect(source).not.toContain("panel.add(this.add.text(0, -150, `🛒 ${npc.name} — 아이템 상점`,");
    expect(mainSource).toContain("shopTitleIconQa: params.get('shopTitleIconQa') === '1'");
  });

  it('LobbyScene shop panel action focus uses an Aseprite arrow icon before the focus glyph fallback', () => {
    const source = readSceneSource('LobbyScene.ts');
    const mainSource = readFileSync(resolve(process.cwd(), 'client/src/main.ts'), 'utf8');
    const shopPanelSource = source.slice(
      source.indexOf('private async _showShopPanel'),
      source.indexOf('private _addLobbyShopTitleIcon'),
    );

    expect(source).toContain("const LOBBY_SHOP_ACTION_FOCUS_ICON_ID = 'skill_mw_arrow'");
    expect(source).toContain('shopActionFocusIconQa?: boolean');
    expect(source).toContain('private lobbyShopActionFocusIcon: Phaser.GameObjects.Image | null = null');
    expect(source).toContain('private lobbyShopActionFocusIconFallbackRendered = false');
    expect(source).toContain('private lobbyShopActionFocusTexts: Phaser.GameObjects.Text[] = []');
    expect(source).toContain('const shopActionFocusIconResource = getSpriteResourceForSkillIcon(LOBBY_SHOP_ACTION_FOCUS_ICON_ID)');
    expect(source).toContain('private _openShopActionFocusIconQaPanel(): void');
    expect(source).toContain('private _writeShopActionFocusIconQaProbe(');
    expect(source).toContain('private _renderLobbyShopActionFocus(');
    expect(source).toContain('private _addLobbyShopActionFocusIcon(');
    expect(source).toContain("setName('lobby_shop_action_focus_icon')");
    expect(source).toContain('focusIcon.setDisplaySize(14, 14)');
    expect(source).toContain('focusIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST)');
    expect(source).toContain('document.body.dataset.aeternaShopActionFocusIconQa = JSON.stringify');
    expect(source).toContain('missingShopActionFocusIconKeys');
    expect(source).toContain('activeIndex');
    expect(shopPanelSource).not.toContain("buyBtn.setText(a ? '▶[구매]' : '[구매]')");
    expect(shopPanelSource).not.toContain("closeBtn.setText(a ? '▶ [ 닫기 ]' : '[ 닫기 ]')");
    expect(mainSource).toContain("shopActionFocusIconQa: params.get('shopActionFocusIconQa') === '1'");
  });

  it('LobbyScene enhance panel renders an Aseprite title icon before the hammer glyph fallback', () => {
    const source = readSceneSource('LobbyScene.ts');
    const mainSource = readFileSync(resolve(process.cwd(), 'client/src/main.ts'), 'utf8');

    expect(source).toContain("const LOBBY_ENHANCE_TITLE_ICON_ID = 'ITM-MAT-001'");
    expect(source).toContain('enhanceTitleIconQa?: boolean');
    expect(source).toContain('private lobbyEnhanceTitleIcon: Phaser.GameObjects.Image | null = null');
    expect(source).toContain('private lobbyEnhanceTitleIconFallbackRendered = false');
    expect(source).toContain('const enhanceTitleIconResource = getItemIconResource({ itemIconId: LOBBY_ENHANCE_TITLE_ICON_ID })');
    expect(source).toContain('private _openEnhanceTitleIconQaPanel(): void');
    expect(source).toContain("const blacksmith = TOWN_NPCS.find((npc) => npc.id === 'blacksmith')");
    expect(source).toContain('this._showEnhancePanel(blacksmith)');
    expect(source).toContain('private _addLobbyEnhanceTitleIcon(');
    expect(source).toContain("setName('lobby_enhance_title_icon')");
    expect(source).toContain('titleIcon.setDisplaySize(20, 20)');
    expect(source).toContain('titleIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST)');
    expect(source).toContain('const hasEnhanceTitleIcon = Boolean(enhanceTitleIconResource && this.textures.exists(enhanceTitleIconResource.key))');
    expect(source).toContain("const titleText = hasEnhanceTitleIcon ? `${npc.name} — 장비 강화` : `🔨 ${npc.name} — 장비 강화`");
    expect(source).toContain('this._writeEnhanceTitleIconQaProbe({ titleText })');
    expect(source).toContain('document.body.dataset.aeternaEnhanceTitleIconQa = JSON.stringify');
    expect(source).toContain('missingEnhanceTitleIconKeys');
    expect(source).not.toContain("panel.add(this.add.text(0, -90, `🔨 ${npc.name} — 장비 강화`,");
    expect(mainSource).toContain("enhanceTitleIconQa: params.get('enhanceTitleIconQa') === '1'");
  });

  it('LobbyScene enhance panel action focus uses an Aseprite arrow icon before the focus glyph fallback', () => {
    const source = readSceneSource('LobbyScene.ts');
    const mainSource = readFileSync(resolve(process.cwd(), 'client/src/main.ts'), 'utf8');
    const enhancePanelSource = source.slice(
      source.indexOf('private _showEnhancePanel'),
      source.indexOf('private _addLobbyEnhanceTitleIcon'),
    );

    expect(source).toContain("const LOBBY_ENHANCE_ACTION_FOCUS_ICON_ID = 'skill_mw_arrow'");
    expect(source).toContain('enhanceActionFocusIconQa?: boolean');
    expect(source).toContain('private lobbyEnhanceActionFocusIcon: Phaser.GameObjects.Image | null = null');
    expect(source).toContain('private lobbyEnhanceActionFocusIconFallbackRendered = false');
    expect(source).toContain('private lobbyEnhanceActionFocusTexts: Phaser.GameObjects.Text[] = []');
    expect(source).toContain('const enhanceActionFocusIconResource = getSpriteResourceForSkillIcon(LOBBY_ENHANCE_ACTION_FOCUS_ICON_ID)');
    expect(source).toContain('private _openEnhanceActionFocusIconQaPanel(): void');
    expect(source).toContain('private _writeEnhanceActionFocusIconQaProbe(');
    expect(source).toContain('private _renderLobbyEnhanceActionFocus(');
    expect(source).toContain('private _addLobbyEnhanceActionFocusIcon(');
    expect(source).toContain("setName('lobby_enhance_action_focus_icon')");
    expect(source).toContain('focusIcon.setDisplaySize(14, 14)');
    expect(source).toContain('focusIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST)');
    expect(source).toContain('document.body.dataset.aeternaEnhanceActionFocusIconQa = JSON.stringify');
    expect(source).toContain('missingEnhanceActionFocusIconKeys');
    expect(source).toContain('activeIndex');
    expect(enhancePanelSource).not.toContain("closeBtn.setText(a ? '▶ [ 닫기 ]' : '[ 닫기 ]')");
    expect(mainSource).toContain("enhanceActionFocusIconQa: params.get('enhanceActionFocusIconQa') === '1'");
  });

  it('LobbyScene story panel renders an Aseprite title icon before the book glyph fallback', () => {
    const source = readSceneSource('LobbyScene.ts');
    const mainSource = readFileSync(resolve(process.cwd(), 'client/src/main.ts'), 'utf8');

    expect(source).toContain("const LOBBY_STORY_TITLE_ICON_ID = 'ITM-QST-001'");
    expect(source).toContain('storyTitleIconQa?: boolean');
    expect(source).toContain('private lobbyStoryTitleIcon: Phaser.GameObjects.Image | null = null');
    expect(source).toContain('private lobbyStoryTitleIconFallbackRendered = false');
    expect(source).toContain('const storyTitleIconResource = getItemIconResource({ itemIconId: LOBBY_STORY_TITLE_ICON_ID })');
    expect(source).toContain('private _openStoryTitleIconQaPanel(): void');
    expect(source).toContain("const elder = TOWN_NPCS.find((npc) => npc.id === 'elder')");
    expect(source).toContain('this._showStoryPanel(elder)');
    expect(source).toContain('private _addLobbyStoryTitleIcon(');
    expect(source).toContain("setName('lobby_story_title_icon')");
    expect(source).toContain('titleIcon.setDisplaySize(20, 20)');
    expect(source).toContain('titleIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST)');
    expect(source).toContain('const hasStoryTitleIcon = Boolean(storyTitleIconResource && this.textures.exists(storyTitleIconResource.key))');
    expect(source).toContain("const titleText = hasStoryTitleIcon ? `${npc.name} — 메인 스토리` : `📖 ${npc.name} — 메인 스토리`");
    expect(source).toContain('this._writeStoryTitleIconQaProbe({ titleText })');
    expect(source).toContain('document.body.dataset.aeternaStoryTitleIconQa = JSON.stringify');
    expect(source).toContain('missingStoryTitleIconKeys');
    expect(source).not.toContain("panel.add(this.add.text(0, -120, `📖 ${npc.name} — 메인 스토리`,");
    expect(mainSource).toContain("storyTitleIconQa: params.get('storyTitleIconQa') === '1'");
  });

  it('LobbyScene story panel action focus uses an Aseprite arrow icon before the focus glyph fallback', () => {
    const source = readSceneSource('LobbyScene.ts');
    const mainSource = readFileSync(resolve(process.cwd(), 'client/src/main.ts'), 'utf8');
    const storyPanelSource = source.slice(
      source.indexOf('private _showStoryPanel'),
      source.indexOf('private _addLobbyStoryTitleIcon'),
    );

    expect(source).toContain("const LOBBY_STORY_ACTION_FOCUS_ICON_ID = 'skill_mw_arrow'");
    expect(source).toContain('storyActionFocusIconQa?: boolean');
    expect(source).toContain('private lobbyStoryActionFocusIcon: Phaser.GameObjects.Image | null = null');
    expect(source).toContain('private lobbyStoryActionFocusIconFallbackRendered = false');
    expect(source).toContain('private lobbyStoryActionFocusTexts: Phaser.GameObjects.Text[] = []');
    expect(source).toContain('const storyActionFocusIconResource = getSpriteResourceForSkillIcon(LOBBY_STORY_ACTION_FOCUS_ICON_ID)');
    expect(source).toContain('private _openStoryActionFocusIconQaPanel(): void');
    expect(source).toContain('private _writeStoryActionFocusIconQaProbe(');
    expect(source).toContain('private _renderLobbyStoryActionFocus(');
    expect(source).toContain('private _addLobbyStoryActionFocusIcon(');
    expect(source).toContain("setName('lobby_story_action_focus_icon')");
    expect(source).toContain('focusIcon.setDisplaySize(14, 14)');
    expect(source).toContain('focusIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST)');
    expect(source).toContain('document.body.dataset.aeternaStoryActionFocusIconQa = JSON.stringify');
    expect(source).toContain('missingStoryActionFocusIconKeys');
    expect(source).toContain('activeIndex');
    expect(storyPanelSource).not.toContain("startBtn.setText(a ? '▶ [ 챕터 1 시작 ]' : '[ 챕터 1 시작 ]')");
    expect(storyPanelSource).not.toContain("closeBtn.setText(a ? '▶ [ 닫기 ]' : '[ 닫기 ]')");
    expect(mainSource).toContain("storyActionFocusIconQa: params.get('storyActionFocusIconQa') === '1'");
  });

  it('LobbyScene quest panel renders an Aseprite title icon before the scroll glyph fallback', () => {
    const source = readSceneSource('LobbyScene.ts');
    const mainSource = readFileSync(resolve(process.cwd(), 'client/src/main.ts'), 'utf8');

    expect(source).toContain("const LOBBY_QUEST_TITLE_ICON_ID = 'ITM-QST-004'");
    expect(source).toContain('questTitleIconQa?: boolean');
    expect(source).toContain('private lobbyQuestTitleIcon: Phaser.GameObjects.Image | null = null');
    expect(source).toContain('private lobbyQuestTitleIconFallbackRendered = false');
    expect(source).toContain('const questTitleIconResource = getItemIconResource({ itemIconId: LOBBY_QUEST_TITLE_ICON_ID })');
    expect(source).toContain('private _openQuestTitleIconQaPanel(): void');
    expect(source).toContain("this._showQuestPanel(FALLBACK_QUESTS, 'local')");
    expect(source).toContain('private _addLobbyQuestTitleIcon(');
    expect(source).toContain("setName('lobby_quest_title_icon')");
    expect(source).toContain('titleIcon.setDisplaySize(20, 20)');
    expect(source).toContain('titleIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST)');
    expect(source).toContain('const hasQuestTitleIcon = Boolean(questTitleIconResource && this.textures.exists(questTitleIconResource.key))');
    expect(source).toContain("const titleText = hasQuestTitleIcon ? `퀘스트 (${sourceLabel})` : `📜 퀘스트 (${sourceLabel})`");
    expect(source).toContain('this._writeQuestTitleIconQaProbe({ titleText })');
    expect(source).toContain('document.body.dataset.aeternaQuestTitleIconQa = JSON.stringify');
    expect(source).toContain('missingQuestTitleIconKeys');
    expect(source).not.toContain("panel.add(this.add.text(0, -panelH / 2 + 24, `📜 퀘스트 (${sourceLabel})`,");
    expect(mainSource).toContain("questTitleIconQa: params.get('questTitleIconQa') === '1'");
  });

  it('LobbyScene quest panel action focus uses an Aseprite arrow icon before action and close glyph fallback', () => {
    const source = readSceneSource('LobbyScene.ts');
    const mainSource = readFileSync(resolve(process.cwd(), 'client/src/main.ts'), 'utf8');
    const questPanelSource = source.slice(
      source.indexOf('private _showQuestPanel'),
      source.indexOf('private _addLobbyQuestTitleIcon'),
    );

    expect(source).toContain("const LOBBY_QUEST_ACTION_FOCUS_ICON_ID = 'skill_mw_arrow'");
    expect(source).toContain('questActionFocusIconQa?: boolean');
    expect(source).toContain('private lobbyQuestActionFocusIcon: Phaser.GameObjects.Image | null = null');
    expect(source).toContain('private lobbyQuestActionFocusIconFallbackRendered = false');
    expect(source).toContain('private lobbyQuestActionFocusTexts: Phaser.GameObjects.Text[] = []');
    expect(source).toContain('const questActionFocusIconResource = getSpriteResourceForSkillIcon(LOBBY_QUEST_ACTION_FOCUS_ICON_ID)');
    expect(source).toContain('private _openQuestActionFocusIconQaPanel(): void');
    expect(source).toContain('private _writeQuestActionFocusIconQaProbe(');
    expect(source).toContain('private _renderLobbyQuestActionFocus(');
    expect(source).toContain('private _addLobbyQuestActionFocusIcon(');
    expect(source).toContain("setName('lobby_quest_action_focus_icon')");
    expect(source).toContain('focusIcon.setDisplaySize(14, 14)');
    expect(source).toContain('focusIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST)');
    expect(source).toContain('document.body.dataset.aeternaQuestActionFocusIconQa = JSON.stringify');
    expect(source).toContain('missingQuestActionFocusIconKeys');
    expect(source).toContain('activeIndex');
    expect(questPanelSource).not.toContain('actionBtn.setText(a ? `▶ ${actionText}` : actionText)');
    expect(questPanelSource).not.toContain("refreshBtn.setText(a ? '▶ [ 새로고침 ]' : '[ 새로고침 ]')");
    expect(questPanelSource).not.toContain("closeBtn.setText(a ? '▶ [ 닫기 ]' : '[ 닫기 ]')");
    expect(mainSource).toContain("questActionFocusIconQa: params.get('questActionFocusIconQa') === '1'");
  });

  it('BattleScene uses Aseprite monster resources before legacy monster PNG fallback', () => {
    const source = readSceneSource('BattleScene.ts');

    expect(source).toContain('getSpriteResourceForMonster(cleanId)');
    expect(source).toContain('this.load.spritesheet(resource.key, resource.path');
    expect(source).toContain('this.add.image(pos.x, pos.y, monsterResource.key, 0)');
    expect(source).toContain('sprite.setFrame(0)');
  });

  it('BattleScene loads and plays the Aseprite hit slash VFX before procedural fallback', () => {
    const source = readSceneSource('BattleScene.ts');

    expect(source).toContain("getSpriteResourceForVfx('vfx_hit_slash')");
    expect(source).toContain('this.load.spritesheet(hitSlashResource.key, hitSlashResource.path');
    expect(source).toContain('this.add.sprite(x, y, hitSlashResource.key, 0)');
    expect(source).toContain("setName('vfx_hit_slash_instance')");
  });

  it('BattleScene and BattleUI load Aseprite skill icons before text-only fallback', () => {
    const battleSource = readSceneSource('BattleScene.ts');
    const uiSource = readFileSync(resolve(process.cwd(), 'client/src/ui/BattleUI.ts'), 'utf8');

    expect(battleSource).toContain('getSpriteResourceForSkillIcon(slot.icon)');
    expect(battleSource).toContain('this.load.image(skillIconResource.key, skillIconResource.path)');
    expect(uiSource).toContain('getSpriteResourceForSkillIcon(slot.icon)');
    expect(uiSource).toContain('this.scene.add.image(x, y - 7, iconResource.key)');
  });

  it('BattleScene preloads status icons and StatusEffectRenderer renders images before graphics fallback', () => {
    const battleSource = readSceneSource('BattleScene.ts');
    const rendererSource = readFileSync(resolve(process.cwd(), 'client/src/combat/StatusEffectRenderer.ts'), 'utf8');

    expect(battleSource).toContain('preloadStatusIconResources(this)');
    expect(rendererSource).toContain('getStatusIconResource(eff.effectId)');
    expect(rendererSource).toContain('this.scene.add.image(ix, iy, iconResource.key)');
    expect(rendererSource).toContain("setName(`status_icon_${eff.effectId}`)");
  });

  it('BattleScene 방어 상태 표시는 Aseprite shield status icon을 텍스트 fallback보다 먼저 사용한다', () => {
    const battleSource = readSceneSource('BattleScene.ts');

    expect(battleSource).toContain("import { getStatusIconResource, preloadStatusIconResources } from '../data/statusEffectIcons';");
    expect(battleSource).toContain('defendIcon?: Phaser.GameObjects.Image | Phaser.GameObjects.Text');
    expect(battleSource).toContain("const defendIconResource = getStatusIconResource('shield')");
    expect(battleSource).toContain('this.add.image(us.sprite.x, us.sprite.y - 70, defendIconResource.key)');
    expect(battleSource).toContain('defendIcon.setDisplaySize(28, 28)');
    expect(battleSource).toContain('defendIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST)');
    expect(battleSource).toContain('setName(`battle_defend_icon_${us.unit.id}`)');
    expect(battleSource).toContain("this.add.text(us.sprite.x, us.sprite.y - 70, '🛡'");
  });

  it('BattleScene 상태 패널 HP 위험 표시는 Aseprite bleed status icon을 경고 glyph보다 먼저 사용한다', () => {
    const battleSource = readSceneSource('BattleScene.ts');

    expect(getSpriteResourceForStatusIcon('bleed')).toMatchObject({
      id: 'status_bleed_icon',
      key: 'status_bleed_icon',
      path: 'assets/generated/ui/icons/status/status_bleed.png',
      category: 'statusIcon',
      statusIconId: 'bleed',
    });
    expect(battleSource).toContain("const BATTLE_HP_CRITICAL_ICON_ID = 'bleed'");
    expect(battleSource).toContain('const BATTLE_HP_CRITICAL_ICON_SIZE = 12');
    expect(battleSource).toContain('hpCriticalIcon?: Phaser.GameObjects.Image');
    expect(battleSource).toContain('const hpCriticalIconResource = getStatusIconResource(BATTLE_HP_CRITICAL_ICON_ID)');
    expect(battleSource).toContain("setName(`battle_hp_critical_icon_${us.unit.id}`)");
    expect(battleSource).toContain('hpCriticalIcon.setDisplaySize(BATTLE_HP_CRITICAL_ICON_SIZE, BATTLE_HP_CRITICAL_ICON_SIZE)');
    expect(battleSource).toContain('hpCriticalIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST)');
    expect(battleSource).toContain('const hpTextX = hpCriticalIcon ? 176 : 160');
    expect(battleSource).toContain('const hpLabel = `HP ${Math.max(0, us.unit.hp)}/${us.unit.maxHp}`');
    expect(battleSource).toContain('const hasHpCriticalIcon = entry.hpCriticalIcon?.active === true');
    expect(battleSource).toContain('entry.hpCriticalIcon?.setVisible(hpCritical)');
    expect(battleSource).toContain('entry.hp.setText(hpCritical && !hasHpCriticalIcon ? `⚠ ${hpLabel}` : hpLabel)');
    expect(battleSource).not.toContain("entry.hp.setText(`${hpCritical ? '⚠ ' : ''}HP");
  });

  it('BattleScene reflect popup uses the Aseprite shield status icon before shield glyph fallback', () => {
    const battleSource = readSceneSource('BattleScene.ts');
    const mainSource = readFileSync(resolve(process.cwd(), 'client/src/main.ts'), 'utf8');

    expect(battleSource).toContain("const BATTLE_REFLECT_POPUP_ICON_ID = 'shield'");
    expect(battleSource).toContain('const BATTLE_REFLECT_POPUP_ICON_SIZE = 18');
    expect(battleSource).toContain('battleReflectPopupIconQa?: boolean');
    expect(battleSource).toContain('private reflectPopupIcons: Phaser.GameObjects.Image[] = []');
    expect(battleSource).toContain('private reflectPopupTexts: Phaser.GameObjects.Text[] = []');
    expect(battleSource).toContain('private reflectPopupIconFallbackRendered = false');
    expect(battleSource).toContain('const reflectPopupIconResource = getStatusIconResource(BATTLE_REFLECT_POPUP_ICON_ID)');
    expect(battleSource).toContain("setName('battle_reflect_popup_icon')");
    expect(battleSource).toContain('reflectPopupIcon.setDisplaySize(BATTLE_REFLECT_POPUP_ICON_SIZE, BATTLE_REFLECT_POPUP_ICON_SIZE)');
    expect(battleSource).toContain('reflectPopupIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST)');
    expect(battleSource).toContain('const reflectPopupLabel = reflectPopupIcon ? `-${dmg}` : `🛡 -${dmg}`');
    expect(battleSource).toContain("setName('battle_reflect_popup_text')");
    expect(battleSource).toContain('private _startBattleReflectPopupIconQa(): void');
    expect(battleSource).toContain('document.body.dataset.aeternaBattleReflectPopupIconQa = JSON.stringify');
    expect(battleSource).toContain('missingBattleReflectPopupIconKeys');
    expect(battleSource).not.toContain('const text = this.add.text(x, y - 30, `🛡 -${dmg}`');
    expect(mainSource).toContain("battleReflectPopupIconQa: params.get('battleReflectPopupIconQa') === '1'");
  });

  it('BattleScene echo popup uses the Aseprite storm skill icon before sparkle glyph fallback', () => {
    const battleSource = readSceneSource('BattleScene.ts');
    const mainSource = readFileSync(resolve(process.cwd(), 'client/src/main.ts'), 'utf8');

    expect(battleSource).toContain("const BATTLE_ECHO_POPUP_ICON_ID = 'skill_mw_storm'");
    expect(battleSource).toContain('const BATTLE_ECHO_POPUP_ICON_SIZE = 18');
    expect(battleSource).toContain('battleEchoPopupIconQa?: boolean');
    expect(battleSource).toContain('private echoPopupIcons: Phaser.GameObjects.Image[] = []');
    expect(battleSource).toContain('private echoPopupTexts: Phaser.GameObjects.Text[] = []');
    expect(battleSource).toContain('private echoPopupIconFallbackRendered = false');
    expect(battleSource).toContain('const echoPopupIconResource = getSpriteResourceForSkillIcon(BATTLE_ECHO_POPUP_ICON_ID)');
    expect(battleSource).toContain("setName('battle_echo_popup_icon')");
    expect(battleSource).toContain('echoPopupIcon.setDisplaySize(BATTLE_ECHO_POPUP_ICON_SIZE, BATTLE_ECHO_POPUP_ICON_SIZE)');
    expect(battleSource).toContain('echoPopupIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST)');
    expect(battleSource).toContain('const echoPopupLabel = echoPopupIcon ? `ECHO +${dmg}` : `✨ ECHO +${dmg}`');
    expect(battleSource).toContain("setName('battle_echo_popup_text')");
    expect(battleSource).toContain('private _startBattleEchoPopupIconQa(): void');
    expect(battleSource).toContain('document.body.dataset.aeternaBattleEchoPopupIconQa = JSON.stringify');
    expect(battleSource).toContain('missingBattleEchoPopupIconKeys');
    expect(battleSource).not.toContain('const text = this.add.text(x + 30, y - 10, `✨ ECHO +${dmg}`');
    expect(mainSource).toContain("battleEchoPopupIconQa: params.get('battleEchoPopupIconQa') === '1'");
  });

  it('BattleScene combo popup uses the Aseprite storm skill icon before lightning glyph fallback', () => {
    const battleSource = readSceneSource('BattleScene.ts');
    const mainSource = readFileSync(resolve(process.cwd(), 'client/src/main.ts'), 'utf8');

    expect(battleSource).toContain("const BATTLE_COMBO_POPUP_ICON_ID = 'skill_mw_storm'");
    expect(battleSource).toContain('const BATTLE_COMBO_POPUP_ICON_SIZE = 18');
    expect(battleSource).toContain('battleComboPopupIconQa?: boolean');
    expect(battleSource).toContain('private comboPopupIcons: Phaser.GameObjects.Image[] = []');
    expect(battleSource).toContain('private comboPopupTexts: Phaser.GameObjects.Text[] = []');
    expect(battleSource).toContain('private comboPopupIconFallbackRendered = false');
    expect(battleSource).toContain('const comboPopupIconResource = getSpriteResourceForSkillIcon(BATTLE_COMBO_POPUP_ICON_ID)');
    expect(battleSource).toContain('queuedSkillIconKeys.has(comboPopupIconResource.key)');
    expect(battleSource).toContain("setName('battle_combo_popup_icon')");
    expect(battleSource).toContain('comboPopupIcon.setDisplaySize(BATTLE_COMBO_POPUP_ICON_SIZE, BATTLE_COMBO_POPUP_ICON_SIZE)');
    expect(battleSource).toContain('comboPopupIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST)');
    expect(battleSource).toContain('const comboPopupLabel = comboPopupIcon ? `${name} +${bonus}%` : `⚡ ${name} +${bonus}%`');
    expect(battleSource).toContain("setName('battle_combo_popup_text')");
    expect(battleSource).toContain('private _startBattleComboPopupIconQa(): void');
    expect(battleSource).toContain('document.body.dataset.aeternaBattleComboPopupIconQa = JSON.stringify');
    expect(battleSource).toContain('missingBattleComboPopupIconKeys');
    expect(battleSource).not.toContain('const text = this.add.text(x, y, `⚡ ${name} +${bonus}%`');
    expect(mainSource).toContain("battleComboPopupIconQa: params.get('battleComboPopupIconQa') === '1'");
  });

  it('BattleScene critical damage popup uses the Aseprite explosion skill icon before burst glyph fallback', () => {
    const battleSource = readSceneSource('BattleScene.ts');
    const mainSource = readFileSync(resolve(process.cwd(), 'client/src/main.ts'), 'utf8');

    expect(battleSource).toContain("const BATTLE_CRITICAL_POPUP_ICON_ID = 'skill_ek_explode'");
    expect(battleSource).toContain('const BATTLE_CRITICAL_POPUP_ICON_SIZE = 20');
    expect(battleSource).toContain('battleCriticalPopupIconQa?: boolean');
    expect(battleSource).toContain('private criticalPopupIcons: Phaser.GameObjects.Image[] = []');
    expect(battleSource).toContain('private criticalPopupTexts: Phaser.GameObjects.Text[] = []');
    expect(battleSource).toContain('private criticalPopupIconFallbackRendered = false');
    expect(battleSource).toContain('const criticalPopupIconResource = getSpriteResourceForSkillIcon(BATTLE_CRITICAL_POPUP_ICON_ID)');
    expect(battleSource).toContain('queuedSkillIconKeys.has(criticalPopupIconResource.key)');
    expect(battleSource).toContain("setName('battle_critical_popup_icon')");
    expect(battleSource).toContain('criticalPopupIcon.setDisplaySize(BATTLE_CRITICAL_POPUP_ICON_SIZE, BATTLE_CRITICAL_POPUP_ICON_SIZE)');
    expect(battleSource).toContain('criticalPopupIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST)');
    expect(battleSource).toContain("const criticalPrefix = criticalPopupIcon ? '' : '💥'");
    expect(battleSource).toContain("setName('battle_critical_popup_text')");
    expect(battleSource).toContain('private _startBattleCriticalPopupIconQa(): void');
    expect(battleSource).toContain('document.body.dataset.aeternaBattleCriticalPopupIconQa = JSON.stringify');
    expect(battleSource).toContain('missingBattleCriticalPopupIconKeys');
    expect(battleSource).not.toContain("prefix = '💥';");
    expect(mainSource).toContain("battleCriticalPopupIconQa: params.get('battleCriticalPopupIconQa') === '1'");
  });

  it('BattleScene connection badge uses Aseprite icons before circle/x glyph fallback', () => {
    const battleSource = readSceneSource('BattleScene.ts');
    const mainSource = readFileSync(resolve(process.cwd(), 'client/src/main.ts'), 'utf8');

    expect(getSpriteResourceForSkillIcon('skill_tg_stop')).toMatchObject({
      id: 'skill_tg_stop_icon',
      key: 'skill_tg_stop_icon',
      path: 'assets/generated/ui/icons/skills/skill_tg_stop.png',
      category: 'skillIcon',
      skillIconId: 'skill_tg_stop',
    });
    expect(getSpriteResourceForStatusIcon('curse')).toMatchObject({
      id: 'status_curse_icon',
      key: 'status_curse_icon',
      path: 'assets/generated/ui/icons/status/status_curse.png',
      category: 'statusIcon',
      statusIconId: 'curse',
    });
    expect(battleSource).toContain('type BattleConnectionBadgeIconMode = keyof typeof BATTLE_CONNECTION_BADGE_ICON_IDS');
    expect(battleSource).toContain("reconnecting: 'skill_tg_stop'");
    expect(battleSource).toContain("error: 'curse'");
    expect(battleSource).toContain('const BATTLE_CONNECTION_BADGE_ICON_SIZE = 16');
    expect(battleSource).toContain("battleConnectionBadgeIconQa?: 'reconnecting' | 'error'");
    expect(battleSource).toContain('private connectionBadgeIcon?: Phaser.GameObjects.Image');
    expect(battleSource).toContain('private connectionBadgeIconFallbackRendered = false');
    expect(battleSource).toContain('function getBattleConnectionBadgeIconResource(mode: BattleConnectionBadgeIconMode)');
    expect(battleSource).toContain('this.load.image(connectionBadgeReconnectIconResource.key, connectionBadgeReconnectIconResource.path)');
    expect(battleSource).toContain('this.load.image(connectionBadgeErrorIconResource.key, connectionBadgeErrorIconResource.path)');
    expect(battleSource).toContain('this._startBattleConnectionBadgeIconQa()');
    expect(battleSource).toContain('private _renderConnectionBadgeState(mode: BattleConnectionBadgeIconMode): void');
    expect(battleSource).toContain("setName('battle_connection_badge_icon')");
    expect(battleSource).toContain('this.connectionBadgeIcon.setDisplaySize(BATTLE_CONNECTION_BADGE_ICON_SIZE, BATTLE_CONNECTION_BADGE_ICON_SIZE)');
    expect(battleSource).toContain('this.connectionBadgeIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST)');
    expect(battleSource).toContain("const label = hasIcon ? state.label : state.fallbackLabel");
    expect(battleSource).toContain('private _writeBattleConnectionBadgeIconQaProbe(mode: BattleConnectionBadgeIconMode): void');
    expect(battleSource).toContain('document.body.dataset.aeternaBattleConnectionBadgeIconQa = JSON.stringify');
    expect(battleSource).toContain("const legacyGlyphPresent = label.includes('○') || label.includes('✕')");
    expect(battleSource).not.toContain("?.setText(reconnecting ? '○ 재연결 중… 전투 일시정지' : '✕ 연결 실패 — 재시도 중')");
    expect(mainSource).toContain("const battleConnectionBadgeIconQaParam = params.get('battleConnectionBadgeIconQa')");
    expect(mainSource).toContain("battleConnectionBadgeIconQaParam === 'reconnecting' || battleConnectionBadgeIconQaParam === 'error'");
    expect(mainSource).toContain('battleConnectionBadgeIconQa,');
  });

  it('BattleScene 활성 턴 표시는 Aseprite arrow image를 텍스트 fallback보다 먼저 사용한다', () => {
    const battleSource = readSceneSource('BattleScene.ts');

    expect(battleSource).toContain("const BATTLE_ACTIVE_INDICATOR_ICON_ID = 'skill_mw_arrow'");
    expect(battleSource).toContain('activeIndicator: Phaser.GameObjects.Image | Phaser.GameObjects.Text');
    expect(battleSource).toContain('const activeIndicatorResource = getSpriteResourceForSkillIcon(BATTLE_ACTIVE_INDICATOR_ICON_ID)');
    expect(battleSource).toContain('this.load.image(activeIndicatorResource.key, activeIndicatorResource.path)');
    expect(battleSource).toContain('this.add.image(us.sprite.x, indicatorY, activeIndicatorResource.key)');
    expect(battleSource).toContain("setName('battle_active_turn_indicator')");
    expect(battleSource).toContain('indicator.setDisplaySize(28, 28)');
    expect(battleSource).toContain('indicator.setAngle(90)');
    expect(battleSource).toContain("this.add.text(us.sprite.x, indicatorY, '▼'");
  });

  it('BattleScene 타겟 선택 커서는 Aseprite arrow image를 절차 삼각형 fallback보다 먼저 사용한다', () => {
    const battleSource = readSceneSource('BattleScene.ts');
    const targetCursorSource = battleSource.slice(
      battleSource.indexOf('private _drawTargetCursor'),
      battleSource.indexOf('private _confirmTarget'),
    );

    expect(battleSource).toContain("const BATTLE_TARGET_CURSOR_ICON_ID = 'skill_mw_arrow'");
    expect(battleSource).toContain('const BATTLE_TARGET_CURSOR_ICON_SIZE = 24');
    expect(battleSource).toContain('private targetCursorIcon: Phaser.GameObjects.Image | null = null');
    expect(battleSource).toContain('const targetCursorIconResource = getSpriteResourceForSkillIcon(BATTLE_TARGET_CURSOR_ICON_ID)');
    expect(battleSource).toContain('targetCursorIconResource.key !== activeIndicatorResource?.key');
    expect(battleSource).toContain('targetCursorIconResource.key !== commandFocusIconResource?.key');
    expect(battleSource).toContain('targetCursorIconResource.key !== subMenuFocusIconResource?.key');
    expect(battleSource).toContain('this.load.image(targetCursorIconResource.key, targetCursorIconResource.path)');
    expect(battleSource).toContain("setName('battle_target_cursor_icon')");
    expect(battleSource).toContain('this.targetCursorIcon.setDisplaySize(BATTLE_TARGET_CURSOR_ICON_SIZE, BATTLE_TARGET_CURSOR_ICON_SIZE)');
    expect(battleSource).toContain('this.targetCursorIcon.setAngle(90)');
    expect(battleSource).toContain('this.targetCursorIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST)');
    expect(targetCursorSource).toContain('this.targetCursorIcon?.setVisible(false)');
    expect(targetCursorSource).toContain('if (this.targetCursorIcon?.active === true) {');
    expect(targetCursorSource).toContain('this.targetCursorIcon.setPosition(target.sprite.x, target.sprite.y - 56).setVisible(true)');
    expect(targetCursorSource).toContain('} else {');
    expect(targetCursorSource).toContain('this.targetCursor?.strokeTriangle(');
    expect(targetCursorSource).not.toContain('this.targetCursor?.strokeTriangle(\n      target.sprite.x, target.sprite.y - 50,');
  });

  it('BattleScene 타겟 예상 KILL 표식은 Aseprite curse status icon을 skull glyph보다 먼저 사용한다', () => {
    const battleSource = readSceneSource('BattleScene.ts');
    const targetCursorSource = battleSource.slice(
      battleSource.indexOf('private _drawTargetCursor'),
      battleSource.indexOf('private _confirmTarget'),
    );

    expect(battleSource).toContain("const BATTLE_TARGET_PREVIEW_KILL_ICON_ID = 'curse'");
    expect(battleSource).toContain('const BATTLE_TARGET_PREVIEW_KILL_ICON_SIZE = 14');
    expect(battleSource).toContain('private targetPreviewKillIcon: Phaser.GameObjects.Image | null = null');
    expect(battleSource).toContain('const targetPreviewKillIconResource = getStatusIconResource(BATTLE_TARGET_PREVIEW_KILL_ICON_ID)');
    expect(battleSource).toContain("setName('battle_target_preview_kill_icon')");
    expect(battleSource).toContain('this.targetPreviewKillIcon.setDisplaySize(BATTLE_TARGET_PREVIEW_KILL_ICON_SIZE, BATTLE_TARGET_PREVIEW_KILL_ICON_SIZE)');
    expect(battleSource).toContain('this.targetPreviewKillIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST)');
    expect(targetCursorSource).toContain('this.targetPreviewKillIcon?.setVisible(false)');
    expect(targetCursorSource).toContain('const hasKillIcon = isKill && this.targetPreviewKillIcon?.active === true');
    expect(targetCursorSource).toContain('.setText(isKill ? (hasKillIcon ? `~${expected} KILL` : `~${expected} 💀KILL`) : `~${expected}`)');
    expect(targetCursorSource).toContain('this.targetPreviewKillIcon?.setPosition(target.sprite.x - 34, target.sprite.y - 72).setVisible(hasKillIcon)');
    expect(targetCursorSource).not.toContain('.setText(isKill ? `~${expected} 💀KILL` : `~${expected}`)');
    expect(battleSource).toContain('preloadStatusIconResources(this)');
  });

  it('BattleScene 필드 ambient 라인은 Aseprite shield/boss icon을 glyph fallback보다 먼저 사용한다', () => {
    const battleSource = readSceneSource('BattleScene.ts');
    const mainSource = readFileSync(resolve(process.cwd(), 'client/src/main.ts'), 'utf8');

    expect(battleSource).toContain("const BATTLE_FIELD_AMBIENT_ICON_ID = 'shield'");
    expect(battleSource).toContain("const BATTLE_FIELD_BOSS_ICON_ID = 'skill_ek_slash'");
    expect(battleSource).toContain('battleAmbientLineQa?: boolean');
    expect(battleSource).toContain('private fieldAmbientIcons: Phaser.GameObjects.Image[] = []');
    expect(battleSource).toContain('private fieldAmbientIconFallbackKinds: BattleFieldAmbientIconKind[] = []');
    expect(battleSource).toContain('const ambientIconResource = getStatusIconResource(BATTLE_FIELD_AMBIENT_ICON_ID)');
    expect(battleSource).toContain('const bossIconResource = getSpriteResourceForSkillIcon(BATTLE_FIELD_BOSS_ICON_ID)');
    expect(battleSource).toContain('this.load.image(ambientIconResource.key, ambientIconResource.path)');
    expect(battleSource).toContain('this.load.image(bossIconResource.key, bossIconResource.path)');
    expect(battleSource).toContain("this._addFieldAmbientIcon(20, 20, ambientIconResource, 'ambient')");
    expect(battleSource).toContain("this._addFieldAmbientIcon(ambientText.x + ambientText.displayWidth + 18, 20, bossIconResource, 'boss')");
    expect(battleSource).toContain('setName(`battle_field_ambient_${kind}_icon`)');
    expect(battleSource).toContain('icon.setDisplaySize(18, 18)');
    expect(battleSource).toContain('icon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST)');
    expect(battleSource).toContain('const ambientLabel = hasAmbientIcon ? ambientShort : `🛡 ${ambientShort}`');
    expect(battleSource).toContain("const bossLabelSuffix = fieldEnc.hasBossSlot && !hasBossIcon ? ' ⚔️' : ''");
    expect(battleSource).toContain('this._writeBattleAmbientLineQaProbe({ fieldEnc, ambientText, hasAmbientIcon, hasBossIcon })');
    expect(battleSource).toContain('document.body.dataset.aeternaBattleAmbientLineQa');
    expect(battleSource).toContain('missingAmbientIconKeys');
    expect(battleSource).toContain('missingBossIconKeys');
    expect(battleSource).not.toContain("this.add.text(20, 12, `🛡 ${ambientShort}${fieldEnc.hasBossSlot ? ' ⚔️' : ''}`");
    expect(mainSource).toContain("battleAmbientLineQa: params.get('battleAmbientLineQa') === '1'");
  });

  it('BattleScene 인트로 전투 시작 표시는 Aseprite slash icon을 sword glyph보다 먼저 사용한다', () => {
    const battleSource = readSceneSource('BattleScene.ts');
    const mainSource = readFileSync(resolve(process.cwd(), 'client/src/main.ts'), 'utf8');

    expect(battleSource).toContain("const BATTLE_INTRO_ICON_ID = 'skill_ek_slash'");
    expect(battleSource).toContain('battleIntroIconQa?: boolean');
    expect(battleSource).toContain('private battleIntroIcon?: Phaser.GameObjects.Image');
    expect(battleSource).toContain('private battleIntroIconFallbackRendered = false');
    expect(battleSource).toContain('const introIconResource = getSpriteResourceForSkillIcon(BATTLE_INTRO_ICON_ID)');
    expect(battleSource).toContain('this.load.image(introIconResource.key, introIconResource.path)');
    expect(battleSource).toContain("setName('battle_intro_start_icon')");
    expect(battleSource).toContain('introIcon.setDisplaySize(34, 34)');
    expect(battleSource).toContain('introIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST)');
    expect(battleSource).toContain("const introTextLabel = hasIntroIcon ? '전투 시작!' : '⚔ 전투 시작!'");
    expect(battleSource).toContain('this._writeBattleIntroIconQaProbe({ hasIntroIcon, introText })');
    expect(battleSource).toContain('document.body.dataset.aeternaBattleIntroIconQa = JSON.stringify');
    expect(battleSource).toContain('missingIntroIconKeys');
    expect(battleSource).not.toContain("this.add.text(scW / 2, scH / 2 - 40, '⚔ 전투 시작!'");
    expect(mainSource).toContain("battleIntroIconQa: params.get('battleIntroIconQa') === '1'");
  });

  it('BattleScene 커맨드 메뉴는 Aseprite command icons를 이모지 텍스트보다 먼저 사용한다', () => {
    const battleSource = readSceneSource('BattleScene.ts');

    expect(battleSource).toContain("import { getItemIconResource } from '../data/itemIconResources';");
    expect(battleSource).toContain("icon: { kind: 'skill', id: 'skill_ek_slash' }");
    expect(battleSource).toContain("icon: { kind: 'skill', id: 'skill_mw_bolt' }");
    expect(battleSource).toContain("icon: { kind: 'item', itemIconId: 'ITM-CON-001' }");
    expect(battleSource).toContain("icon: { kind: 'status', id: 'shield' }");
    expect(battleSource).toContain("icon: { kind: 'skill', id: 'skill_vw_warp' }");
    expect(battleSource).toContain('function getBattleCommandIconResource(cmd: CommandOption): BattleCommandIconResource | undefined');
    expect(battleSource).toContain('const commandIconResource = getBattleCommandIconResource(cmd)');
    expect(battleSource).toContain('this.load.image(commandIconResource.key, commandIconResource.path)');
    expect(battleSource).toContain('this.add.image(itemX + 12, 24, commandIconResource.key)');
    expect(battleSource).toContain('setName(`battle_command_icon_${cmd.type}`)');
    expect(battleSource).toContain('icon.setDisplaySize(20, 20)');
    expect(battleSource).toContain('icon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST)');
    expect(battleSource).toContain('const label = hasCommandIcon ? cmd.label : cmd.fallbackLabel');
  });

  it('BattleScene command menu focus uses an Aseprite arrow icon before command glyph fallback', () => {
    const battleSource = readSceneSource('BattleScene.ts');
    const mainSource = readFileSync(resolve(process.cwd(), 'client/src/main.ts'), 'utf8');
    const commandMenuSource = battleSource.slice(
      battleSource.indexOf('private _openCommandMenu'),
      battleSource.indexOf('private _closeCommandMenu'),
    );

    expect(battleSource).toContain("const BATTLE_COMMAND_FOCUS_ICON_ID = 'skill_mw_arrow'");
    expect(battleSource).toContain('battleCommandFocusIconQa?: boolean');
    expect(battleSource).toContain('private battleCommandFocusIcon: Phaser.GameObjects.Image | null = null');
    expect(battleSource).toContain('private battleCommandFocusIconFallbackRendered = false');
    expect(battleSource).toContain('private battleCommandFocusTexts: Phaser.GameObjects.Text[] = []');
    expect(battleSource).toContain('const commandFocusIconResource = getSpriteResourceForSkillIcon(BATTLE_COMMAND_FOCUS_ICON_ID)');
    expect(battleSource).toContain('private _writeBattleCommandFocusIconQaProbe(');
    expect(battleSource).toContain('private _renderBattleCommandFocus(');
    expect(battleSource).toContain('private _addBattleCommandFocusIcon(');
    expect(battleSource).toContain("setName('battle_command_focus_icon')");
    expect(battleSource).toContain('focusIcon.setDisplaySize(14, 14)');
    expect(battleSource).toContain('focusIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST)');
    expect(battleSource).toContain('document.body.dataset.aeternaBattleCommandFocusIconQa = JSON.stringify');
    expect(battleSource).toContain('missingBattleCommandFocusIconKeys');
    expect(battleSource).toContain('activeIndex');
    expect(commandMenuSource).not.toContain('t.setText(i === this.cmdMenuIndex ? `▶ ${label}` : `  ${label}`)');
    expect(mainSource).toContain("battleCommandFocusIconQa: params.get('battleCommandFocusIconQa') === '1'");
  });

  it('BattleScene 마법/아이템 서브메뉴는 Aseprite icons를 텍스트 이모지보다 먼저 사용한다', () => {
    const battleSource = readSceneSource('BattleScene.ts');

    expect(battleSource).toContain('icon?: Phaser.GameObjects.Image');
    expect(battleSource).toContain('const skillIconResource = skill.icon ? getSpriteResourceForSkillIcon(skill.icon) : undefined');
    expect(battleSource).toContain('this.add.image(22, 21 + i * 24, skillIconResource.key)');
    expect(battleSource).toContain('setName(`battle_magic_submenu_icon_${skill.skillId}`)');
    expect(battleSource).toContain('skillIcon.setDisplaySize(18, 18)');
    expect(battleSource).toContain('skillIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST)');
    expect(battleSource).toContain("const itemIconResource = getItemIconResource({ itemIconId: 'ITM-CON-001' })");
    expect(battleSource).toContain('this.add.image(34, 40, itemIconResource.key)');
    expect(battleSource).toContain("setName('battle_item_submenu_icon_ITM-CON-001')");
    expect(battleSource).toContain('itemIcon.setDisplaySize(18, 18)');
    expect(battleSource).toContain('const label = hasItemIcon ? itemLabel : itemFallbackLabel');
  });

  it('BattleScene 마법/아이템 서브메뉴 focus는 Aseprite arrow icon을 prefix glyph보다 먼저 사용한다', () => {
    const battleSource = readSceneSource('BattleScene.ts');
    const mainSource = readFileSync(resolve(process.cwd(), 'client/src/main.ts'), 'utf8');
    const subMenuSource = battleSource.slice(
      battleSource.indexOf('private _showMagicSubMenu'),
      battleSource.indexOf('private _performSkill'),
    );

    expect(battleSource).toContain("const BATTLE_SUB_MENU_FOCUS_ICON_ID = 'skill_mw_arrow'");
    expect(battleSource).toContain('battleSubMenuFocusIconQa?:');
    expect(battleSource).toContain('private battleSubMenuFocusIcon: Phaser.GameObjects.Image | null = null');
    expect(battleSource).toContain('private battleSubMenuFocusIconFallbackRendered = false');
    expect(battleSource).toContain('private battleSubMenuFocusTexts: Phaser.GameObjects.Text[] = []');
    expect(battleSource).toContain('const subMenuFocusIconResource = getSpriteResourceForSkillIcon(BATTLE_SUB_MENU_FOCUS_ICON_ID)');
    expect(battleSource).toContain('private _writeBattleSubMenuFocusIconQaProbe(');
    expect(battleSource).toContain('private _renderBattleSubMenuFocus(');
    expect(battleSource).toContain('private _addBattleSubMenuFocusIcon(');
    expect(battleSource).toContain("setName('battle_submenu_focus_icon')");
    expect(battleSource).toContain('focusIcon.setDisplaySize(14, 14)');
    expect(battleSource).toContain('focusIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST)');
    expect(battleSource).toContain('document.body.dataset.aeternaBattleSubMenuFocusIconQa = JSON.stringify');
    expect(battleSource).toContain('missingBattleSubMenuFocusIconKeys');
    expect(battleSource).toContain('subMenuType');
    expect(subMenuSource).not.toContain('it.text.setText(i === this.subMenuIndex ? `▶ ${it.label}` : `  ${it.label}`)');
    expect(mainSource).toContain('const battleSubMenuFocusIconQaParam = params.get(\'battleSubMenuFocusIconQa\')');
    expect(mainSource).toContain("battleSubMenuFocusIconQaParam === 'magic' || battleSubMenuFocusIconQaParam === 'item'");
  });

  it('BattleScene 마법 서브메뉴 쿨다운 상태는 Aseprite stop icon을 쓰고 hourglass glyph를 라벨에 직접 넣지 않는다', () => {
    const battleSource = readSceneSource('BattleScene.ts');
    const magicSubMenuSource = battleSource.slice(
      battleSource.indexOf('private _showMagicSubMenu'),
      battleSource.indexOf('private _showItemSubMenu'),
    );

    expect(battleSource).toContain("const BATTLE_MAGIC_SUB_MENU_COOLDOWN_ICON_ID = 'skill_tg_stop'");
    expect(battleSource).toContain('const BATTLE_MAGIC_SUB_MENU_COOLDOWN_ICON_SIZE = 14');
    expect(battleSource).toContain('cooldownIcon?: Phaser.GameObjects.Image');
    expect(battleSource).toContain('const cooldownIconResource = getSpriteResourceForSkillIcon(BATTLE_MAGIC_SUB_MENU_COOLDOWN_ICON_ID)');
    expect(battleSource).toContain('this.load.image(cooldownIconResource.key, cooldownIconResource.path)');
    expect(magicSubMenuSource).toContain('const hasCooldownIcon = Boolean(onCd && cooldownIconResource && this.textures.exists(cooldownIconResource.key))');
    expect(magicSubMenuSource).toContain('this.add.image(hasSkillIcon ? 178 : 150, 21 + i * 24, cooldownIconResource.key)');
    expect(magicSubMenuSource).toContain('setName(`battle_magic_submenu_cooldown_icon_${skill.skillId}`)');
    expect(magicSubMenuSource).toContain('cooldownIcon.setDisplaySize(BATTLE_MAGIC_SUB_MENU_COOLDOWN_ICON_SIZE, BATTLE_MAGIC_SUB_MENU_COOLDOWN_ICON_SIZE)');
    expect(magicSubMenuSource).toContain('cooldownIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST)');
    expect(magicSubMenuSource).toContain('const label = onCd');
    expect(magicSubMenuSource).toContain('? `${skill.name} CD ${Math.ceil(skill.currentCooldown)}s`');
    expect(magicSubMenuSource).not.toContain('`${skill.name} ⏳${Math.ceil(skill.currentCooldown)}s`');
  });

  it('BattleScene 전투 결과 팝업 보상 표식은 Aseprite icons를 glyph fallback보다 먼저 사용한다', () => {
    const battleSource = readSceneSource('BattleScene.ts');

    expect(battleSource).toContain('const BATTLE_RESULT_REWARD_ICON_IDS = {');
    expect(battleSource).toContain("title: 'skill_ek_ultimate'");
    expect(battleSource).toContain("exp: 'skill_ek_passive'");
    expect(battleSource).toContain("gold: 'ITM-MAT-002'");
    expect(battleSource).toContain("loot: 'ITM-MAT-001'");
    expect(battleSource).toContain('const BATTLE_RESULT_REWARD_ICON_EXPECTED_COUNT = 4');
    expect(battleSource).toContain('function getBattleResultRewardIconResource(kind: BattleResultRewardIconKind): BattleIconResource | undefined');
    expect(battleSource).toContain('return getSpriteResourceForSkillIcon(BATTLE_RESULT_REWARD_ICON_IDS[kind])');
    expect(battleSource).toContain('return getItemIconResource({ itemIconId: BATTLE_RESULT_REWARD_ICON_IDS[kind] })');
    expect(battleSource).toContain('const resultRewardIconResource = getBattleResultRewardIconResource(kind)');
    expect(battleSource).toContain('private battleResultRewardIcons: Phaser.GameObjects.Image[] = []');
    expect(battleSource).toContain('private battleResultRewardIconFallbackKinds: BattleResultRewardIconKind[] = []');
    expect(battleSource).toContain('private _addBattleResultRewardIcon(');
    expect(battleSource).toContain('setName(`battle_result_${kind}_icon`)');
    expect(battleSource).toContain('rewardIcon.setDisplaySize(BATTLE_RESULT_REWARD_ICON_SIZE, BATTLE_RESULT_REWARD_ICON_SIZE)');
    expect(battleSource).toContain('rewardIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST)');
    expect(battleSource).toContain("const titleLabel = hasTitleIcon ? '전투 결과' : '🏆 전투 결과'");
    expect(battleSource).toContain('const expLabel = hasExpIcon ? `경험치: +${exp}` : `✨ 경험치: +${exp}`');
    expect(battleSource).toContain('const goldLabel = hasGoldIcon ? `골드: +${gold}` : `💰 골드: +${gold}`');
    expect(battleSource).toContain("const lootTitleLabel = hasLootIcon ? '전리품:' : '📦 전리품:'");
    expect(battleSource).toContain('resultRewardIcon: {');
    expect(battleSource).toContain('missingBattleResultRewardIconKeys');
    expect(battleSource).toContain('rewardLegacyGlyphPresent');
    expect(battleSource).toContain('rewardTitleLegacyGlyphPresent');
  });

  it('BattleScene 패배 팝업 title은 Aseprite status icon을 heart glyph보다 먼저 사용한다', () => {
    const battleSource = readSceneSource('BattleScene.ts');

    expect(getSpriteResourceForStatusIcon('curse')).toMatchObject({
      id: 'status_curse_icon',
      key: 'status_curse_icon',
      path: 'assets/generated/ui/icons/status/status_curse.png',
      category: 'statusIcon',
      statusIconId: 'curse',
    });
    expect(battleSource).toContain("const BATTLE_DEFEAT_TITLE_ICON_ID = 'curse'");
    expect(battleSource).toContain('const BATTLE_DEFEAT_TITLE_ICON_EXPECTED_COUNT = 1');
    expect(battleSource).toContain('const BATTLE_DEFEAT_TITLE_ICON_SIZE = 18');
    expect(battleSource).toContain('private battleDefeatTitleIcon: Phaser.GameObjects.Image | null = null');
    expect(battleSource).toContain('private battleDefeatTitleIconFallbackRendered = false');
    expect(battleSource).toContain('const defeatTitleIconResource = getStatusIconResource(BATTLE_DEFEAT_TITLE_ICON_ID)');
    expect(battleSource).toContain('private _addBattleDefeatTitleIcon(');
    expect(battleSource).toContain("setName('battle_defeat_title_icon')");
    expect(battleSource).toContain('defeatIcon.setDisplaySize(BATTLE_DEFEAT_TITLE_ICON_SIZE, BATTLE_DEFEAT_TITLE_ICON_SIZE)');
    expect(battleSource).toContain('defeatIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST)');
    expect(battleSource).toContain("const titleLabel = hasTitleIcon ? '전투 실패' : '💔 전투 실패'");
    expect(battleSource).toContain('defeatTitleIcon: {');
    expect(battleSource).toContain('defeatTitleLegacyGlyphPresent');
    expect(battleSource).toContain('missingBattleDefeatTitleIconKeys');
  });

  it('BattleScene 전투 종료 lead banner는 Aseprite icons를 celebration/heart glyph보다 먼저 사용한다', () => {
    const battleSource = readSceneSource('BattleScene.ts');
    const mainSource = readFileSync(resolve(process.cwd(), 'client/src/main.ts'), 'utf8');

    expect(getSpriteResourceForSkillIcon('skill_ek_ultimate')).toMatchObject({
      id: 'skill_ek_ultimate_icon',
      key: 'skill_ek_ultimate_icon',
      path: 'assets/generated/ui/icons/skills/skill_ek_ultimate.png',
    });
    expect(getSpriteResourceForStatusIcon('curse')).toMatchObject({
      id: 'status_curse_icon',
      key: 'status_curse_icon',
      path: 'assets/generated/ui/icons/status/status_curse.png',
    });
    expect(battleSource).toContain('const BATTLE_RESULT_LEAD_ICON_IDS = {');
    expect(battleSource).toContain("victory: 'skill_ek_ultimate'");
    expect(battleSource).toContain("defeat: 'curse'");
    expect(battleSource).toContain('const BATTLE_RESULT_LEAD_ICON_SIZE = 34');
    expect(battleSource).toContain('type BattleResultLeadMode = keyof typeof BATTLE_RESULT_LEAD_ICON_IDS');
    expect(battleSource).toContain('battleResultLeadQa?:');
    expect(battleSource).toContain('private battleResultLeadIcon: Phaser.GameObjects.Image | null = null');
    expect(battleSource).toContain('private battleResultLeadIconFallbackRendered = false');
    expect(battleSource).toContain('private battleResultLeadText: Phaser.GameObjects.Text | null = null');
    expect(battleSource).toContain('function getBattleResultLeadIconResource(mode: BattleResultLeadMode): BattleIconResource | undefined');
    expect(battleSource).toContain('private _showBattleResultLeadBanner(mode: BattleResultLeadMode): void');
    expect(battleSource).toContain('private _addBattleResultLeadIcon(');
    expect(battleSource).toContain('setName(`battle_result_lead_${mode}_icon`)');
    expect(battleSource).toContain('leadIcon.setDisplaySize(BATTLE_RESULT_LEAD_ICON_SIZE, BATTLE_RESULT_LEAD_ICON_SIZE)');
    expect(battleSource).toContain('leadIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST)');
    expect(battleSource).toContain("const label = hasIcon ? 'Victory!' : '🎉 Victory!'");
    expect(battleSource).toContain("const label = hasIcon ? '패배...' : '💔 패배...'");
    expect(battleSource).toContain('private _startBattleResultLeadQa(): void');
    expect(battleSource).toContain('document.body.dataset.aeternaBattleResultLeadQa = JSON.stringify');
    expect(battleSource).toContain('battleResultLeadIcon: {');
    expect(battleSource).toContain('leadLegacyGlyphPresent');
    expect(battleSource).toContain('missingBattleResultLeadIconKeys');
    expect(mainSource).toContain("const battleResultLeadQaParam = params.get('battleResultLeadQa')");
    expect(mainSource).toContain("battleResultLeadQaParam === 'victory' || battleResultLeadQaParam === 'defeat'");
    expect(mainSource).toContain('battleResultLeadQa,');
  });

  it('BattleUI utility buttons use Aseprite skill icons before text emoji fallback', () => {
    const battleUiSource = readFileSync(resolve(process.cwd(), 'client/src/ui/BattleUI.ts'), 'utf8');

    expect(battleUiSource).toContain("const BATTLE_UTILITY_BUTTON_ICON_IDS = {");
    expect(battleUiSource).toContain("pause: 'skill_tg_stop'");
    expect(battleUiSource).toContain("resume: 'skill_mw_arrow'");
    expect(battleUiSource).toContain("flee: 'skill_vw_warp'");
    expect(battleUiSource).toContain('const BATTLE_UTILITY_BUTTON_RENDERED_ICON_COUNT = 2');
    expect(battleUiSource).toContain('for (const iconId of Object.values(BATTLE_UTILITY_BUTTON_ICON_IDS))');
    expect(battleUiSource).toContain('const iconResource = getSpriteResourceForSkillIcon(iconId)');
    expect(battleUiSource).toContain('scene.load.image(iconResource.key, iconResource.path)');
    expect(battleUiSource).toContain("this._addBattleUtilityButtonIcon(pauseX - 44, buttonY, 'pause', BATTLE_UTILITY_BUTTON_ICON_IDS.pause)");
    expect(battleUiSource).toContain("this._addBattleUtilityButtonIcon(fleeX - 24, buttonY, 'flee', BATTLE_UTILITY_BUTTON_ICON_IDS.flee)");
    expect(battleUiSource).toContain('setName(`battle_ui_utility_button_icon_${name}`)');
    expect(battleUiSource).toContain('icon.setDisplaySize(14, 14)');
    expect(battleUiSource).toContain('icon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST)');
    expect(battleUiSource).toContain("const fleeLabel = this.fleeIcon ? '도주' : '🏃 도주'");
    expect(battleUiSource).toContain('private _setPauseButtonPausedState(paused: boolean): void');
    expect(battleUiSource).toContain('const resumeIconResource = getSpriteResourceForSkillIcon(BATTLE_UTILITY_BUTTON_ICON_IDS.resume)');
    expect(battleUiSource).toContain('const targetIconResource = paused ? resumeIconResource : pauseIconResource');
    expect(battleUiSource).toContain('this.pauseIcon.setTexture(targetIconResource.key)');
    expect(battleUiSource).toContain("this.pauseBtn.setText(hasStateIcon ? '일시정지 (P)' : '⏸ 일시정지 (P)')");
    expect(battleUiSource).toContain("this.pauseBtn.setText(hasStateIcon ? '재개 (P)' : '▶ 재개 (P)')");
    expect(battleUiSource).toContain('private _getMissingBattleUtilityButtonIconKeys(): string[]');
    expect(battleUiSource).toContain('utilityButtonIcon: {');
    expect(battleUiSource).toContain('renderedIconCount: this.utilityButtonIcons.length');
    expect(battleUiSource).toContain('expectedTextureKeys');
    expect(battleUiSource).toContain('pauseIconTextureKey');
    expect(battleUiSource).toContain('pauseLabelLegacyGlyphPresent');
    expect(battleUiSource).toContain('missingUtilityButtonIconKeys');
  });

  it('BattleUI log highlight uses Aseprite skill icons before event glyph fallback', () => {
    const battleSource = readSceneSource('BattleScene.ts');
    const battleUiSource = readFileSync(resolve(process.cwd(), 'client/src/ui/BattleUI.ts'), 'utf8');

    expect(battleSource).toContain("import { BattleUI, preloadBattleUiFrameTextures, BATTLE_LOG_HIGHLIGHT_ICON_IDS, BATTLE_LOG_HIGHLIGHT_ITEM_ICON_IDS } from '../ui/BattleUI';");
    expect(battleUiSource).toContain("export const BATTLE_LOG_HIGHLIGHT_ICON_IDS = {");
    expect(battleUiSource).toContain("critical: 'skill_ek_explode'");
    expect(battleUiSource).toContain("chain: 'skill_mw_storm'");
    expect(battleUiSource).toContain("victory: 'skill_ek_ultimate'");
    expect(battleUiSource).toContain("level: 'skill_ek_passive'");
    expect(battleUiSource).toContain('const BATTLE_LOG_HIGHLIGHT_ICON_SIZE = 16');
    expect(battleSource).toContain('for (const iconId of Object.values(BATTLE_LOG_HIGHLIGHT_ICON_IDS))');
    expect(battleSource).toContain('const logHighlightIconResource = getSpriteResourceForSkillIcon(iconId)');
    expect(battleSource).toContain('queuedSkillIconKeys.has(logHighlightIconResource.key)');
    expect(battleUiSource).toContain('type BattleLogHighlightItemIconKind = keyof typeof BATTLE_LOG_HIGHLIGHT_ITEM_ICON_IDS');
    expect(battleUiSource).toContain('| keyof typeof BATTLE_LOG_HIGHLIGHT_ICON_IDS');
    expect(battleUiSource).toContain('| BattleLogHighlightStatusIconKind');
    expect(battleUiSource).toContain('| BattleLogHighlightItemIconKind');
    expect(battleUiSource).toContain('private logHighlightIcon?: Phaser.GameObjects.Image');
    expect(battleUiSource).toContain('private logHighlightIconFallbackRendered = false');
    expect(battleUiSource).toContain('private logHighlightIconKind: BattleLogHighlightIconKind | null = null');
    expect(battleUiSource).toContain('private _inferHighlightIconKind(message: string): BattleLogHighlightIconKind | null');
    expect(battleUiSource).toContain('private _addLogHighlightIcon(kind: BattleLogHighlightIconKind): Phaser.GameObjects.Image | undefined');
    expect(battleUiSource).toContain("setName('battle_ui_log_highlight_icon')");
    expect(battleUiSource).toContain('icon.setDisplaySize(BATTLE_LOG_HIGHLIGHT_ICON_SIZE, BATTLE_LOG_HIGHLIGHT_ICON_SIZE)');
    expect(battleUiSource).toContain('icon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST)');
    expect(battleUiSource).toContain('const highlightText = this._formatLogHighlightText(message, highlightIcon)');
    expect(battleUiSource).toContain("document.body.dataset.aeternaBattleLogHighlightIconQa = JSON.stringify");
    expect(battleUiSource).toContain('missingBattleLogHighlightIconKeys');
    expect(battleUiSource).toContain("new URLSearchParams(window.location.search).get('battleLogHighlightIconQa')");
  });

  it('BattleUI 협공 로그 하이라이트는 Aseprite dual/triple tech icons를 glyph fallback보다 먼저 사용한다', () => {
    const battleSource = readSceneSource('BattleScene.ts');
    const battleUiSource = readFileSync(resolve(process.cwd(), 'client/src/ui/BattleUI.ts'), 'utf8');

    expect(battleUiSource).toContain("dualTech: 'skill_mw_storm'");
    expect(battleUiSource).toContain("tripleTech: 'skill_ek_ultimate'");
    expect(battleUiSource).toContain("if (message.includes('3인 협공')) return 'tripleTech'");
    expect(battleUiSource).toContain("if (message.includes('협공')) return 'dualTech'");
    expect(battleUiSource).toContain("kind === 'dualTech' || kind === 'tripleTech'");
    expect(battleUiSource).toContain("dualTech: '✨ 협공 발동: 크로노 블레이드'");
    expect(battleUiSource).toContain("tripleTech: '🌟 3인 협공 발동: 에테르나 파이널'");
    expect(battleUiSource).toContain('.replace(/[💥🔥🎉🆙⚡✨🌟🔁🏆🛡💀💔⚔💢💧⏳⏭🧪]/gu, \'\')');
    expect(battleUiSource).toContain('const legacyGlyphPresent = /[💥🔥🎉🆙⚡✨🌟🔁🏆🛡💀💔⚔💢💧⏳⏭🧪]/u.test(highlightText)');
    expect(battleSource).not.toContain('`✨ 협공 발동: ${cand.name}`');
    expect(battleSource).not.toContain('`🌟 3인 협공 발동: ${cand.name}`');
    expect(battleSource).not.toContain('`✨ 협공 가능: ${names}`');
    expect(battleSource).not.toContain("`🌟 3인 협공 가능: ${tNames} ('T' 키)`");
  });

  it('BattleUI 방어/반사 로그 하이라이트는 Aseprite shield status icon을 glyph fallback보다 먼저 사용한다', () => {
    const battleSource = readSceneSource('BattleScene.ts');
    const battleUiSource = readFileSync(resolve(process.cwd(), 'client/src/ui/BattleUI.ts'), 'utf8');

    expect(battleUiSource).toContain("import { getStatusIconResource } from '../data/statusEffectIcons'");
    expect(battleUiSource).toContain("export const BATTLE_LOG_HIGHLIGHT_STATUS_ICON_IDS = {");
    expect(battleUiSource).toContain("guard: 'shield'");
    expect(battleUiSource).toContain("type BattleLogHighlightStatusIconKind = keyof typeof BATTLE_LOG_HIGHLIGHT_STATUS_ICON_IDS");
    expect(battleUiSource).toContain('private _getLogHighlightIconResource(kind: BattleLogHighlightIconKind)');
    expect(battleUiSource).toContain('return getStatusIconResource(BATTLE_LOG_HIGHLIGHT_STATUS_ICON_IDS[kind])');
    expect(battleUiSource).toContain("if (m.includes('방어') || m.includes('반사')) return '#90caf9'");
    expect(battleUiSource).toContain("if (message.includes('방어') || message.includes('반사')) return 'guard'");
    expect(battleUiSource).toContain("guard: '🛡 방어 태세!'");
    expect(battleUiSource).toContain('.replace(/[💥🔥🎉🆙⚡✨🌟🔁🏆🛡💀💔⚔💢💧⏳⏭🧪]/gu, \'\')');
    expect(battleUiSource).toContain('const legacyGlyphPresent = /[💥🔥🎉🆙⚡✨🌟🔁🏆🛡💀💔⚔💢💧⏳⏭🧪]/u.test(highlightText)');
    expect(battleSource).toContain('preloadStatusIconResources(this)');
    expect(battleSource).toContain('this.battleUI?.addLog(`반사 → ${attacker.unit.name} : -${reflectDmg}`)');
    expect(battleSource).toContain('this.battleUI?.addLog(`${us.unit.name} 방어 태세!`)');
    expect(battleSource).not.toContain('this.battleUI?.addLog(`🛡 반사 → ${attacker.unit.name} : -${reflectDmg}`)');
    expect(battleSource).not.toContain('this.battleUI?.addLog(`🛡 ${us.unit.name} 방어 태세!`)');
  });

  it('BattleUI 사망 로그 하이라이트는 Aseprite curse status icon을 skull glyph보다 먼저 사용한다', () => {
    const battleSource = readSceneSource('BattleScene.ts');
    const battleUiSource = readFileSync(resolve(process.cwd(), 'client/src/ui/BattleUI.ts'), 'utf8');

    expect(battleUiSource).toContain("death: 'curse'");
    expect(battleUiSource).toContain("if (m.includes('💀') || m.includes('쓰러짐')) return '#ff5555'");
    expect(battleUiSource).toContain("if (message.includes('💀') || message.includes('쓰러짐')) return 'death'");
    expect(battleUiSource).toContain("kind === 'dualTech' || kind === 'tripleTech' || kind === 'guard' || kind === 'death'");
    expect(battleUiSource).toContain("death: '💀 쓰러짐!'");
    expect(battleUiSource).toContain('.replace(/[💥🔥🎉🆙⚡✨🌟🔁🏆🛡💀💔⚔💢💧⏳⏭🧪]/gu, \'\')');
    expect(battleUiSource).toContain('const legacyGlyphPresent = /[💥🔥🎉🆙⚡✨🌟🔁🏆🛡💀💔⚔💢💧⏳⏭🧪]/u.test(highlightText)');
    expect(battleSource).toContain('preloadStatusIconResources(this)');
    expect(battleSource).toContain('this.battleUI?.addLog(`${us.unit.name} 쓰러짐!`)');
    expect(battleSource).not.toContain('this.battleUI?.addLog(`💀 ${us.unit.name} 쓰러짐!`)');
  });

  it('BattleUI 패배 로그 하이라이트는 Aseprite curse status icon을 heart glyph보다 먼저 사용한다', () => {
    const battleSource = readSceneSource('BattleScene.ts');
    const battleUiSource = readFileSync(resolve(process.cwd(), 'client/src/ui/BattleUI.ts'), 'utf8');

    expect(battleUiSource).toContain("defeat: 'curse'");
    expect(battleUiSource).toContain("if (m.includes('💔') || m.includes('패배')) return '#ff5555'");
    expect(battleUiSource).toContain("if (message.includes('💔') || message.includes('패배')) return 'defeat'");
    expect(battleUiSource).toContain("kind === 'guard' || kind === 'death' || kind === 'defeat'");
    expect(battleUiSource).toContain("defeat: '💔 패배...'");
    expect(battleUiSource).toContain('.replace(/[💥🔥🎉🆙⚡✨🌟🔁🏆🛡💀💔⚔💢💧⏳⏭🧪]/gu, \'\')');
    expect(battleUiSource).toContain('const legacyGlyphPresent = /[💥🔥🎉🆙⚡✨🌟🔁🏆🛡💀💔⚔💢💧⏳⏭🧪]/u.test(highlightText)');
    expect(battleSource).toContain('preloadStatusIconResources(this)');
    expect(battleSource).toContain("this.battleUI?.addLog('패배...')");
    expect(battleSource).not.toContain("this.battleUI?.addLog('💔 패배...')");
  });

  it('BattleScene 승리와 서버 결과 로그는 Aseprite log highlight 키워드만 남기고 legacy glyph를 직접 주입하지 않는다', () => {
    const battleSource = readSceneSource('BattleScene.ts');
    const battleUiSource = readFileSync(resolve(process.cwd(), 'client/src/ui/BattleUI.ts'), 'utf8');

    expect(battleUiSource).toContain("if (message.includes('🎉') || message.includes('승리')) return 'victory'");
    expect(battleUiSource).toContain("if (message.includes('⚡') || message.includes('콤보') || message.includes('🔥') || message.includes('CHAIN')) return 'chain'");
    expect(battleUiSource).toContain("if (message.includes('🆙') || message.includes('레벨 업')) return 'level'");
    expect(battleUiSource).toContain("victory: '🎉 승리!'");
    expect(battleUiSource).toContain("chain: '🔥 CHAIN ×2'");
    expect(battleUiSource).toContain("level: '🆙 레벨 업'");
    expect(battleSource).toContain("this.battleUI?.addLog('승리!')");
    expect(battleSource).toContain('this.battleUI?.addLog(`CHAIN ×${this.chainCount}! (${act.damage ?? 0})`)');
    expect(battleSource).toContain("this.battleUI?.addLog('CHAIN MAX 도달! 다음 협공 +50% 데미지')");
    expect(battleSource).toContain('this.battleUI?.addLog(`서버 승리 확인! EXP +${result.expGained}, 골드 +${result.goldGained}`)');
    expect(battleSource).toContain("this.battleUI?.addLog('CHAIN 보너스 +20% 적용!')");
    expect(battleSource).toContain('this.battleUI?.addLog(`레벨 업! Lv.${result.levelUp.newLevel}`)');
    expect(battleSource).not.toContain("this.battleUI?.addLog('🎉 승리!')");
    expect(battleSource).not.toContain('this.battleUI?.addLog(`🔥 CHAIN ×${this.chainCount}! (${act.damage ?? 0})`)');
    expect(battleSource).not.toContain("this.battleUI?.addLog('💥 CHAIN MAX 도달! 다음 협공 +50% 데미지')");
    expect(battleSource).not.toContain('this.battleUI?.addLog(`🎉 서버 승리 확인! EXP +${result.expGained}, 골드 +${result.goldGained}`)');
    expect(battleSource).not.toContain("this.battleUI?.addLog('🔥 CHAIN 보너스 +20% 적용!')");
    expect(battleSource).not.toContain('this.battleUI?.addLog(`🆙 레벨 업! Lv.${result.levelUp.newLevel}`)');
  });

  it('BattleScene 전투 시작 로그는 Aseprite slash log highlight를 쓰고 sword glyph를 직접 주입하지 않는다', () => {
    const battleSource = readSceneSource('BattleScene.ts');
    const battleUiSource = readFileSync(resolve(process.cwd(), 'client/src/ui/BattleUI.ts'), 'utf8');

    expect(battleUiSource).toContain("start: 'skill_ek_slash'");
    expect(battleUiSource).toContain("if (m.includes('⚔') || m.includes('전투 시작')) return '#ffd700'");
    expect(battleUiSource).toContain("if (message.includes('⚔') || message.includes('전투 시작')) return 'start'");
    expect(battleUiSource).toContain("kind === 'critical' || kind === 'chain' || kind === 'victory' || kind === 'level' || kind === 'start'");
    expect(battleUiSource).toContain("start: '⚔ 전투 시작!'");
    expect(battleUiSource).toContain('.replace(/[💥🔥🎉🆙⚡✨🌟🔁🏆🛡💀💔⚔💢💧⏳⏭🧪]/gu, \'\')');
    expect(battleUiSource).toContain('const legacyGlyphPresent = /[💥🔥🎉🆙⚡✨🌟🔁🏆🛡💀💔⚔💢💧⏳⏭🧪]/u.test(highlightText)');
    expect(battleSource).toContain('for (const iconId of Object.values(BATTLE_LOG_HIGHLIGHT_ICON_IDS))');
    expect(battleSource).toContain("this.battleUI?.addLog('전투 시작!')");
    expect(battleSource).not.toContain("this.battleUI?.addLog('⚔️ 전투 시작!')");
  });

  it('BattleScene ECHO 로그는 Aseprite storm log highlight를 쓰고 sparkle glyph를 직접 주입하지 않는다', () => {
    const battleSource = readSceneSource('BattleScene.ts');
    const battleUiSource = readFileSync(resolve(process.cwd(), 'client/src/ui/BattleUI.ts'), 'utf8');

    expect(battleUiSource).toContain("echo: 'skill_mw_storm'");
    expect(battleUiSource).toContain("if (m.includes('ECHO')) return '#6fd3ff'");
    expect(battleUiSource).toContain("if (message.includes('ECHO')) return 'echo'");
    expect(battleUiSource).toContain("kind === 'echo'");
    expect(battleUiSource).toContain("echo: '✨ ECHO! +29'");
    expect(battleUiSource).toContain('.replace(/[💥🔥🎉🆙⚡✨🌟🔁🏆🛡💀💔⚔💢💧⏳⏭🧪]/gu, \'\')');
    expect(battleUiSource).toContain('const legacyGlyphPresent = /[💥🔥🎉🆙⚡✨🌟🔁🏆🛡💀💔⚔💢💧⏳⏭🧪]/u.test(highlightText)');
    expect(battleSource).toContain('for (const iconId of Object.values(BATTLE_LOG_HIGHLIGHT_ICON_IDS))');
    expect(battleSource).toContain('this.battleUI?.addLog(`ECHO! +${echoDmg}`)');
    expect(battleSource).not.toContain('this.battleUI?.addLog(`✨ ECHO! +${echoDmg}`)');
  });

  it('BattleScene 보스 강공 준비 로그는 Aseprite explode log highlight를 쓰고 rage glyph를 직접 주입하지 않는다', () => {
    const battleSource = readSceneSource('BattleScene.ts');
    const battleUiSource = readFileSync(resolve(process.cwd(), 'client/src/ui/BattleUI.ts'), 'utf8');

    expect(battleUiSource).toContain("telegraph: 'skill_ek_explode'");
    expect(battleUiSource).toContain("if (m.includes('💢') || m.includes('강공 준비') || m.includes('강공!')) return '#ff5533'");
    expect(battleUiSource).toContain("if (message.includes('💢') || message.includes('강공 준비') || message.includes('강공!')) return 'telegraph'");
    expect(battleUiSource).toContain("kind === 'telegraph'");
    expect(battleUiSource).toContain("telegraph: '💢 보스 강공 준비!'");
    expect(battleUiSource).toContain('.replace(/[💥🔥🎉🆙⚡✨🌟🔁🏆🛡💀💔⚔💢💧⏳⏭🧪]/gu, \'\')');
    expect(battleUiSource).toContain('const legacyGlyphPresent = /[💥🔥🎉🆙⚡✨🌟🔁🏆🛡💀💔⚔💢💧⏳⏭🧪]/u.test(highlightText)');
    expect(battleSource).toContain('const BATTLE_BOSS_TELEGRAPH_ICON_ID = \'skill_ek_explode\'');
    expect(battleSource).toContain('for (const iconId of Object.values(BATTLE_LOG_HIGHLIGHT_ICON_IDS))');
    expect(battleSource).toContain('this.battleUI?.addLog(`${boss.unit.name} 강공 준비!`)');
    expect(battleSource).not.toContain('this.battleUI?.addLog(`💢 ${boss.unit.name} 강공 준비!`)');
  });

  it('BattleScene 보스 강공 피해 로그는 Aseprite explode log highlight를 쓰고 rage glyph를 직접 주입하지 않는다', () => {
    const battleSource = readSceneSource('BattleScene.ts');
    const battleUiSource = readFileSync(resolve(process.cwd(), 'client/src/ui/BattleUI.ts'), 'utf8');

    expect(battleUiSource).toContain("telegraph: 'skill_ek_explode'");
    expect(battleUiSource).toContain("if (m.includes('💢') || m.includes('강공 준비') || m.includes('강공!')) return '#ff5533'");
    expect(battleUiSource).toContain("if (message.includes('💢') || message.includes('강공 준비') || message.includes('강공!')) return 'telegraph'");
    expect(battleUiSource).toContain("telegraph: '💢 보스 강공 준비!'");
    expect(battleUiSource).toContain('.replace(/[💥🔥🎉🆙⚡✨🌟🔁🏆🛡💀💔⚔💢💧⏳⏭🧪]/gu, \'\')');
    expect(battleUiSource).toContain('const legacyGlyphPresent = /[💥🔥🎉🆙⚡✨🌟🔁🏆🛡💀💔⚔💢💧⏳⏭🧪]/u.test(highlightText)');
    expect(battleSource).toContain("const strongLabel = opts?.strong ? '강공! ' : ''");
    expect(battleSource).toContain('this.battleUI?.addLog(`${strongLabel}${attacker.unit.name} → ${target.unit.name} : ${dmg}${critLabel}`)');
    expect(battleSource).not.toContain("const strongLabel = opts?.strong ? '💢강공! ' : ''");
  });

  it('BattleScene 크리티컬 피해 로그는 Aseprite explode log highlight를 쓰고 burst glyph를 직접 주입하지 않는다', () => {
    const battleSource = readSceneSource('BattleScene.ts');
    const battleUiSource = readFileSync(resolve(process.cwd(), 'client/src/ui/BattleUI.ts'), 'utf8');

    expect(battleUiSource).toContain("critical: 'skill_ek_explode'");
    expect(battleUiSource).toContain("if (m.includes('💥') || m.includes('크리') || m.includes('CRIT')) return '#ffd700'");
    expect(battleUiSource).toContain("if (message.includes('💥') || message.includes('크리') || message.includes('CRIT')) return 'critical'");
    expect(battleUiSource).toContain("critical: '💥 CRIT 88'");
    expect(battleUiSource).toContain('.replace(/[💥🔥🎉🆙⚡✨🌟🔁🏆🛡💀💔⚔💢💧⏳⏭🧪]/gu, \'\')');
    expect(battleUiSource).toContain('const legacyGlyphPresent = /[💥🔥🎉🆙⚡✨🌟🔁🏆🛡💀💔⚔💢💧⏳⏭🧪]/u.test(highlightText)');
    expect(battleSource).toContain("const critLabel = isCritical ? ' 크리티컬!' : ''");
    expect(battleSource).toContain('this.battleUI?.addLog(`${strongLabel}${attacker.unit.name} → ${target.unit.name} : ${dmg}${critLabel}`)');
    expect(battleSource).not.toContain("const critLabel = isCritical ? ' 💥크리티컬!' : ''");
  });

  it('BattleScene MP 부족 로그는 Aseprite mana log highlight를 쓰고 water glyph를 직접 주입하지 않는다', () => {
    const battleSource = readSceneSource('BattleScene.ts');
    const battleUiSource = readFileSync(resolve(process.cwd(), 'client/src/ui/BattleUI.ts'), 'utf8');

    expect(battleUiSource).toContain("mana: 'skill_mw_passive'");
    expect(battleUiSource).toContain("if (m.includes('💧') || m.includes('MP 부족')) return '#6699ff'");
    expect(battleUiSource).toContain("if (message.includes('💧') || message.includes('MP 부족')) return 'mana'");
    expect(battleUiSource).toContain("kind === 'mana'");
    expect(battleUiSource).toContain("mana: '💧 MP 부족 — 에테르 슬래시(MP 15)'");
    expect(battleUiSource).toContain('.replace(/[💥🔥🎉🆙⚡✨🌟🔁🏆🛡💀💔⚔💢💧⏳⏭🧪]/gu, \'\')');
    expect(battleUiSource).toContain('const legacyGlyphPresent = /[💥🔥🎉🆙⚡✨🌟🔁🏆🛡💀💔⚔💢💧⏳⏭🧪]/u.test(highlightText)');
    expect(battleSource).toContain('for (const iconId of Object.values(BATTLE_LOG_HIGHLIGHT_ICON_IDS))');
    expect(battleSource).toContain('this.battleUI?.addLog(`MP 부족 — ${skill.name}(MP ${skill.mpCost})`)');
    expect(battleSource).not.toContain('this.battleUI?.addLog(`💧 MP 부족 — ${skill.name}(MP ${skill.mpCost})`)');
  });

  it('BattleScene 포션 회복 로그는 Aseprite item log highlight를 쓰고 flask glyph를 직접 주입하지 않는다', () => {
    const battleSource = readSceneSource('BattleScene.ts');
    const battleUiSource = readFileSync(resolve(process.cwd(), 'client/src/ui/BattleUI.ts'), 'utf8');

    expect(battleSource).toContain("import { BattleUI, preloadBattleUiFrameTextures, BATTLE_LOG_HIGHLIGHT_ICON_IDS, BATTLE_LOG_HIGHLIGHT_ITEM_ICON_IDS } from '../ui/BattleUI';");
    expect(battleUiSource).toContain("import { getItemIconResource } from '../data/itemIconResources'");
    expect(battleUiSource).toContain('export const BATTLE_LOG_HIGHLIGHT_ITEM_ICON_IDS = {');
    expect(battleUiSource).toContain("itemHeal: 'ITM-CON-001'");
    expect(battleUiSource).toContain('type BattleLogHighlightItemIconKind = keyof typeof BATTLE_LOG_HIGHLIGHT_ITEM_ICON_IDS');
    expect(battleUiSource).toContain('return getItemIconResource({ itemIconId: BATTLE_LOG_HIGHLIGHT_ITEM_ICON_IDS[kind] })');
    expect(battleUiSource).toContain("if (m.includes('🧪') || m.includes('회복')) return '#55ff99'");
    expect(battleUiSource).toContain("if (message.includes('🧪') || message.includes('회복')) return 'itemHeal'");
    expect(battleUiSource).toContain("kind === 'itemHeal'");
    expect(battleUiSource).toContain("itemHeal: '🧪 Erien HP +100 회복!'");
    expect(battleUiSource).toContain('.replace(/[💥🔥🎉🆙⚡✨🌟🔁🏆🛡💀💔⚔💢💧⏳⏭🧪]/gu, \'\')');
    expect(battleUiSource).toContain('const legacyGlyphPresent = /[💥🔥🎉🆙⚡✨🌟🔁🏆🛡💀💔⚔💢💧⏳⏭🧪]/u.test(highlightText)');
    expect(battleSource).toContain('for (const itemIconId of Object.values(BATTLE_LOG_HIGHLIGHT_ITEM_ICON_IDS))');
    expect(battleSource).toContain('const logHighlightItemIconResource = getItemIconResource({ itemIconId })');
    expect(battleSource).toContain('this.battleUI?.addLog(`${target.unit.name} HP +100 회복!`)');
    expect(battleSource).not.toContain('this.battleUI?.addLog(`🧪 ${target.unit.name} HP +100 회복!`)');
  });

  it('BattleScene 스킬/콤보 로그는 Aseprite storm log highlight를 쓰고 lightning glyph를 직접 주입하지 않는다', () => {
    const battleSource = readSceneSource('BattleScene.ts');
    const battleUiSource = readFileSync(resolve(process.cwd(), 'client/src/ui/BattleUI.ts'), 'utf8');

    expect(battleUiSource).toContain("skillHit: 'skill_mw_storm'");
    expect(battleUiSource).toContain("if (m.includes('스킬 발동')) return '#6fd3ff'");
    expect(battleUiSource).toContain("if (message.includes('스킬 발동')) return 'skillHit'");
    expect(battleUiSource).toContain("kind === 'skillHit'");
    expect(battleUiSource).toContain("skillHit: '⚡ 스킬 발동: 에테르 슬래시 → 허수아비 : 88'");
    expect(battleUiSource).toContain('.replace(/[💥🔥🎉🆙⚡✨🌟🔁🏆🛡💀💔⚔💢💧⏳⏭🧪]/gu, \'\')');
    expect(battleUiSource).toContain('const legacyGlyphPresent = /[💥🔥🎉🆙⚡✨🌟🔁🏆🛡💀💔⚔💢💧⏳⏭🧪]/u.test(highlightText)');
    expect(battleSource).toContain('for (const iconId of Object.values(BATTLE_LOG_HIGHLIGHT_ICON_IDS))');
    expect(battleSource).toContain('this.battleUI?.addLog(`콤보: ${combo.name}! +${combo.damageBonus}%`)');
    expect(battleSource).toContain('this.battleUI?.addLog(`스킬 발동: ${skill.name} → ${target.unit.name} : ${dmg}`)');
    expect(battleSource).not.toContain('this.battleUI?.addLog(`⚡ 콤보: ${combo.name}! +${combo.damageBonus}%`)');
    expect(battleSource).not.toContain('this.battleUI?.addLog(`⚡ ${skill.name} → ${target.unit.name} : ${dmg}`)');
  });

  it('BattleScene 쿨다운/대기 로그는 Aseprite stop log highlight를 쓰고 legacy glyph를 직접 주입하지 않는다', () => {
    const battleSource = readSceneSource('BattleScene.ts');
    const battleUiSource = readFileSync(resolve(process.cwd(), 'client/src/ui/BattleUI.ts'), 'utf8');

    expect(battleUiSource).toContain("cooldown: 'skill_tg_stop'");
    expect(battleUiSource).toContain("wait: 'skill_tg_stop'");
    expect(battleUiSource).toContain("if (m.includes('⏳') || m.includes('쿨다운')) return '#c8a2ff'");
    expect(battleUiSource).toContain("if (m.includes('⏭') || m.includes('대기')) return '#c8a2ff'");
    expect(battleUiSource).toContain("if (message.includes('⏳') || message.includes('쿨다운')) return 'cooldown'");
    expect(battleUiSource).toContain("if (message.includes('⏭') || message.includes('대기')) return 'wait'");
    expect(battleUiSource).toContain("kind === 'cooldown' || kind === 'wait'");
    expect(battleUiSource).toContain("cooldown: '⏳ 에테르 슬래시 쿨다운 중'");
    expect(battleUiSource).toContain("wait: '⏭ Erien 대기'");
    expect(battleUiSource).toContain('.replace(/[💥🔥🎉🆙⚡✨🌟🔁🏆🛡💀💔⚔💢💧⏳⏭🧪]/gu, \'\')');
    expect(battleUiSource).toContain('const legacyGlyphPresent = /[💥🔥🎉🆙⚡✨🌟🔁🏆🛡💀💔⚔💢💧⏳⏭🧪]/u.test(highlightText)');
    expect(battleSource).toContain('for (const iconId of Object.values(BATTLE_LOG_HIGHLIGHT_ICON_IDS))');
    expect(battleSource).toContain('this.battleUI?.addLog(`${skill.name} 쿨다운 중`)');
    expect(battleSource).toContain('this.battleUI?.addLog(`${this.activeCommander.unit.name} 대기`)');
    expect(battleSource).not.toContain('this.battleUI?.addLog(`⏳ ${skill.name} 쿨다운 중`)');
    expect(battleSource).not.toContain('this.battleUI?.addLog(`⏭ ${this.activeCommander.unit.name} 대기`)');
  });

  it('BattleScene 협공 버튼은 Aseprite skill icons를 이모지 텍스트보다 먼저 사용한다', () => {
    const battleSource = readSceneSource('BattleScene.ts');

    expect(battleSource).toContain("const BATTLE_COMBO_TECH_BUTTON_ICON_IDS = {");
    expect(battleSource).toContain("dual: 'skill_mw_storm'");
    expect(battleSource).toContain("triple: 'skill_ek_ultimate'");
    expect(battleSource).toContain('for (const iconId of Object.values(BATTLE_COMBO_TECH_BUTTON_ICON_IDS))');
    expect(battleSource).toContain('const comboTechIconResource = getSpriteResourceForSkillIcon(iconId)');
    expect(battleSource).toContain('this.load.image(comboTechIconResource.key, comboTechIconResource.path)');
    expect(battleSource).toContain("this._addComboTechButtonIcon(btnContainer, -52, 0, 'dual', BATTLE_COMBO_TECH_BUTTON_ICON_IDS.dual)");
    expect(battleSource).toContain("this._addComboTechButtonIcon(tBtnContainer, -62, 0, 'triple', BATTLE_COMBO_TECH_BUTTON_ICON_IDS.triple)");
    expect(battleSource).toContain('setName(`battle_combo_tech_button_icon_${name}`)');
    expect(battleSource).toContain('icon.setDisplaySize(18, 18)');
    expect(battleSource).toContain('icon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST)');
    expect(battleSource).toContain("const btnLabel = dualTechIcon ? '협공 (D)' : '✨ 협공 (D)'");
    expect(battleSource).toContain("const tBtnLabel = tripleTechIcon ? '3인 협공 (T)' : '🌟 3인 협공 (T)'");
    expect(battleSource).toContain("const aoePrefix = this._hasComboTechButtonIcon(this.dualTechButton) ? '' : (sel.aoe ? '💥 ' : '✨ ')");
    expect(battleSource).toContain("const aoePrefix = this._hasComboTechButtonIcon(this.tripleTechButton) ? '' : (tSel.aoe ? '💥 🌟 ' : '🌟 ')");
    expect(battleSource).toContain('comboTechButtonIcon: {');
    expect(battleSource).toContain('renderedIconCount: this.comboTechButtonIcons.length');
  });

  it('BattleScene 보스 협공 저항/면역 라벨은 Aseprite shield icon을 glyph fallback보다 먼저 사용한다', () => {
    const battleSource = readSceneSource('BattleScene.ts');

    expect(battleSource).toContain("const BATTLE_BOSS_RESIST_ICON_ID = 'shield'");
    expect(battleSource).toContain('const BATTLE_BOSS_RESIST_ICON_SIZE = 16');
    expect(battleSource).toContain('private _syncBossResistIcon(');
    expect(battleSource).toContain('const bossResistIconResource = getStatusIconResource(BATTLE_BOSS_RESIST_ICON_ID)');
    expect(battleSource).toContain('setName(`battle_boss_resist_icon_${enemy.unit.id}`)');
    expect(battleSource).toContain('bossResistIcon.setDisplaySize(BATTLE_BOSS_RESIST_ICON_SIZE, BATTLE_BOSS_RESIST_ICON_SIZE)');
    expect(battleSource).toContain('bossResistIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST)');
    expect(battleSource).toContain("const label = hasResistIcon ? '협공 면역' : '🛡 협공 면역'");
    expect(battleSource).toContain("const label = hasResistIcon ? parts.join(' / ') : `🛡 ${parts.join(' / ')}`");
    expect(battleSource).not.toContain("const label = '🛡 협공 면역';");
    expect(battleSource).not.toContain("const label = `🛡 ${parts.join(' / ')}`;");
  });

  it('BattleScene CHAIN 라벨은 Aseprite skill icons를 glyph fallback보다 먼저 사용한다', () => {
    const battleSource = readSceneSource('BattleScene.ts');
    const mainSource = readFileSync(resolve(process.cwd(), 'client/src/main.ts'), 'utf8');

    expect(battleSource).toContain("const BATTLE_CHAIN_LABEL_ICON_IDS = {");
    expect(battleSource).toContain("chain: 'skill_mw_storm'");
    expect(battleSource).toContain("max: 'skill_ek_explode'");
    expect(battleSource).toContain('const BATTLE_CHAIN_LABEL_ICON_SIZE = 18');
    expect(battleSource).toContain("battleChainLabelIconQa?: 'chain' | 'max'");
    expect(battleSource).toContain('type BattleChainLabelIconMode = keyof typeof BATTLE_CHAIN_LABEL_ICON_IDS');
    expect(battleSource).toContain('private chainLabelIcon: Phaser.GameObjects.Image | null = null');
    expect(battleSource).toContain('private chainLabelIconFallbackRendered = false');
    expect(battleSource).toContain('private chainLabelIconMode: BattleChainLabelIconMode | null = null');
    expect(battleSource).toContain('for (const iconId of Object.values(BATTLE_CHAIN_LABEL_ICON_IDS))');
    expect(battleSource).toContain('const chainLabelIconResource = getSpriteResourceForSkillIcon(iconId)');
    expect(battleSource).toContain('queuedSkillIconKeys.has(chainLabelIconResource.key)');
    expect(battleSource).toContain('function getBattleChainLabelIconResource(mode: BattleChainLabelIconMode): BattleIconResource | undefined');
    expect(battleSource).toContain("setName('battle_chain_label_icon')");
    expect(battleSource).toContain('chainLabelIcon.setDisplaySize(BATTLE_CHAIN_LABEL_ICON_SIZE, BATTLE_CHAIN_LABEL_ICON_SIZE)');
    expect(battleSource).toContain('chainLabelIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST)');
    expect(battleSource).toContain("const chainPrefix = chainLabelIcon ? '' : (isMax ? '💥 ' : '🔥 ')");
    expect(battleSource).toContain("?.setText(`${chainPrefix}CHAIN ×${this.chainCount}${isMax ? ' MAX' : ''}`)");
    expect(battleSource).toContain('private _startBattleChainLabelIconQa(): void');
    expect(battleSource).toContain('document.body.dataset.aeternaBattleChainLabelIconQa = JSON.stringify');
    expect(battleSource).toContain('missingBattleChainLabelIconKeys');
    expect(battleSource).not.toContain("?.setText(`${isMax ? '💥' : '🔥'} CHAIN ×${this.chainCount}${isMax ? ' MAX' : ''}`)");
    expect(mainSource).toContain("battleChainLabelIconQa: battleChainLabelIconQaParam === 'chain' || battleChainLabelIconQaParam === 'max'");
  });

  it('AssetManager preloads Aseprite item and status icon specs without stale item prefixes', () => {
    const source = readFileSync(resolve(process.cwd(), 'client/src/assets/AssetManager.ts'), 'utf8');

    expect(source).toContain('getAllItemIconSpecs()');
    expect(source).toContain('getAllStatusIconSpecs()');
    expect(source).not.toContain('ITM-CSM');
    expect(source).not.toContain('STS-CC');
  });

  it('registers LoadingScene and passes nextScene data for AssetManager preload routes', () => {
    const mainSource = readFileSync(resolve(process.cwd(), 'client/src/main.ts'), 'utf8');
    const teleportSource = readFileSync(resolve(process.cwd(), 'client/src/gameplay/ZoneTeleportManager.ts'), 'utf8');

    expect(mainSource).toContain("import { LoadingScene } from './scenes/LoadingScene';");
    expect(mainSource).toContain('LoadingScene,');
    expect(teleportSource).toContain("nextScene: 'GameScene'");
    expect(teleportSource).toContain('nextSceneData: {');
    expect(teleportSource).not.toContain('targetScene:');
  });

  it('SkillTreeUI renders Aseprite skill icons before text fallback', () => {
    const uiSource = readFileSync(resolve(process.cwd(), 'client/src/ui/SkillTreeUI.ts'), 'utf8');

    expect(uiSource).toContain('getSkillTreeIconId(skill.classId, skill.tier, skill.icon)');
    expect(uiSource).toContain('getSpriteResourceForSkillIcon(skillIconId)');
    expect(uiSource).toContain('this.scene.add.image(x, y - 2, iconResource.key)');
  });

  it('WorldScene loads Aseprite worldmap icon resources before legacy path fallback', () => {
    const source = readSceneSource('WorldScene.ts');

    expect(source).toContain('getSpriteResourceForWorldZoneIcon(zone.id)');
    expect(source).toContain('this.load.image(resource.key, resource.path)');
    expect(source).toContain('getSpriteResourceForWorldZoneIcon(zone.id)?.key');
  });

  it('WorldScene action buttons render Aseprite skill icons before text symbol fallback', () => {
    const source = readSceneSource('WorldScene.ts');

    expect(source).toContain('getSpriteResourceForSkillIcon');
    expect(source).toContain('const WORLD_ACTION_BUTTON_ICON_IDS = {');
    expect(source).toContain("eraPrev: 'skill_tg_reverse'");
    expect(source).toContain("eraNext: 'skill_tg_haste'");
    expect(source).toContain("back: 'skill_tg_reverse'");
    expect(source).toContain("travel: 'skill_mw_arrow'");
    expect(source).toContain('WORLD_SCENE_EXPECTED_ACTION_BUTTON_ICON_COUNT = 4');
    expect(source).toContain('private worldActionButtonIcons: Phaser.GameObjects.Image[] = []');
    expect(source).toContain('private worldActionButtonTexts: Phaser.GameObjects.Text[] = []');
    expect(source).toContain('fallbackLabel?: string;');
    expect(source).toContain('const queuedActionIconKeys = new Set<string>();');
    expect(source).toContain('for (const iconId of Object.values(WORLD_ACTION_BUTTON_ICON_IDS))');
    expect(source).toContain('const actionIconResource = getSpriteResourceForSkillIcon(iconId)');
    expect(source).toContain('queuedActionIconKeys.has(actionIconResource.key)');
    expect(source).toContain('this.load.image(actionIconResource.key, actionIconResource.path)');
    expect(source).toContain('iconId: WORLD_ACTION_BUTTON_ICON_IDS.eraPrev');
    expect(source).toContain('iconId: WORLD_ACTION_BUTTON_ICON_IDS.eraNext');
    expect(source).toContain('iconId: WORLD_ACTION_BUTTON_ICON_IDS.back');
    expect(source).toContain('iconId: WORLD_ACTION_BUTTON_ICON_IDS.travel');
    expect(source).toContain("      '마을로 돌아가기 (ESC)',\n      '#c8c8d8',");
    expect(source).toContain("      '[Q]',\n      '#88ccff',");
    expect(source).toContain("      '[E]',\n      '#88ccff',");
    expect(source).toContain("      '시간 이동 (Enter)',");
    expect(source).toContain("fallbackLabel: '← 마을로 돌아가기 (ESC)'");
    expect(source).toContain("fallbackLabel: '[Q] ◀'");
    expect(source).toContain("fallbackLabel: '▶ [E]'");
    expect(source).toContain("fallbackLabel: '▶ [ 시간 이동 ] (Enter)'");
    expect(source).toContain('private _addWorldActionButtonIcon(');
    expect(source).toContain('setName(`${options.name}_icon`)');
    expect(source).toContain('icon.setDisplaySize(18, 18)');
    expect(source).toContain('icon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST)');
    expect(source).toContain('const textX = icon ? x + (options.iconTextOffsetX ?? 10) : x');
    expect(source).toContain('const textLabel = icon ? (options.iconLabel ?? label) : (options.fallbackLabel ?? label)');
    expect(source).toContain('this.worldActionButtonTexts.push(text)');
    expect(source).toContain('const renderedActionButtonTexts = this.worldActionButtonTexts.filter(text => text.active)');
    expect(source).toContain('const worldActionButtonLabelsLegacyGlyphPresent = renderedActionButtonTexts.some((text) => /[◀▶←]/u.test(text.text))');
    expect(source).toContain('actionButtonIcon: {');
    expect(source).toContain('renderedCount: renderedActionButtonIcons.length');
    expect(source).toContain('missingIconTextureKeys');
    expect(source).toContain('actionButtonText: {');
    expect(source).toContain('labels: renderedActionButtonTexts.map((text) => text.text)');
    expect(source).toContain('legacyGlyphPresent: worldActionButtonLabelsLegacyGlyphPresent');
  });

  it('WorldScene locked zone markers render an Aseprite status icon before lock emoji fallback', () => {
    const source = readSceneSource('WorldScene.ts');

    expect(source).toContain("import { getStatusIconResource } from '../data/statusEffectIcons';");
    expect(source).toContain("const WORLD_LOCKED_ZONE_STATUS_ICON_ID = 'stun'");
    expect(source).toContain('const WORLD_SCENE_EXPECTED_LOCKED_ZONE_ICON_COUNT = WORLD_ZONES.filter((zone) => !zone.unlocked).length');
    expect(source).toContain('private worldLockedZoneIcons: Phaser.GameObjects.Image[] = []');
    expect(source).toContain('const lockedZoneIconResource = getStatusIconResource(WORLD_LOCKED_ZONE_STATUS_ICON_ID)');
    expect(source).toContain('this.load.image(lockedZoneIconResource.key, lockedZoneIconResource.path)');
    expect(source).toContain('private _addWorldLockedZoneIcon(');
    expect(source).toContain('setName(`world_locked_zone_icon_${zoneId}`)');
    expect(source).toContain('lockIcon.setDisplaySize(22, 22)');
    expect(source).toContain('lockIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST)');
    expect(source).toContain('const lockIcon = this._addWorldLockedZoneIcon(container, zone.id)');
    expect(source).toContain('setName(`world_locked_zone_icon_fallback_${zone.id}`)');
    expect(source).toContain('lockedZoneIcon: {');
    expect(source).toContain('renderedCount: renderedLockedZoneIcons.length');
    expect(source).toContain('missingLockedZoneIconTextureKeys');
  });

  it('WorldScene selected-zone panel renders an Aseprite worldmap icon before color-dot fallback', () => {
    const source = readSceneSource('WorldScene.ts');

    expect(source).toContain('const WORLD_SCENE_EXPECTED_SELECTED_ZONE_PANEL_ICON_COUNT = 1');
    expect(source).toContain('private worldSelectedZonePanelIcons: Phaser.GameObjects.Image[] = []');
    expect(source).toContain('const renderedSelectedZonePanelIcons = this.worldSelectedZonePanelIcons.filter(icon => icon.active)');
    expect(source).toContain('const selectedZonePanelIconResource = this.selectedZone ? getSpriteResourceForWorldZoneIcon(this.selectedZone.id) : undefined');
    expect(source).toContain('missingSelectedZonePanelIconTextureKeys');
    expect(source).toContain('private _addWorldSelectedZonePanelIcon(');
    expect(source).toContain('const selectedZoneIconResource = getSpriteResourceForWorldZoneIcon(zone.id)');
    expect(source).toContain('setName(`world_selected_zone_panel_icon_${zone.id}`)');
    expect(source).toContain('selectedZoneIcon.setDisplaySize(30, 30)');
    expect(source).toContain('selectedZoneIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST)');
    expect(source).toContain('const selectedZoneIcon = this._addWorldSelectedZonePanelIcon(panel, zone)');
    expect(source).toContain('setName(`world_selected_zone_panel_icon_fallback_${zone.id}`)');
    expect(source).toContain('selectedZonePanelIcon: {');
    expect(source).toContain('renderedCount: renderedSelectedZonePanelIcons.length');
  });

  it('WorldScene selected-zone encounter line renders Aseprite status and boss icons before glyph fallback', () => {
    const source = readSceneSource('WorldScene.ts');

    expect(source).toContain("const WORLD_ENCOUNTER_AMBIENT_ICON_ID = 'shield'");
    expect(source).toContain("const WORLD_ENCOUNTER_BOSS_ICON_ID = 'skill_ek_slash'");
    expect(source).toContain('const WORLD_SCENE_EXPECTED_ENCOUNTER_AMBIENT_ICON_COUNT = 1');
    expect(source).toContain('private worldEncounterAmbientIcons: Phaser.GameObjects.Image[] = []');
    expect(source).toContain('private worldEncounterBossIcons: Phaser.GameObjects.Image[] = []');
    expect(source).toContain('private worldEncounterLineText: Phaser.GameObjects.Text | null = null');
    expect(source).toContain('const encounterAmbientIconResource = getStatusIconResource(WORLD_ENCOUNTER_AMBIENT_ICON_ID)');
    expect(source).toContain('this.load.image(encounterAmbientIconResource.key, encounterAmbientIconResource.path)');
    expect(source).toContain('const encounterBossIconResource = getSpriteResourceForSkillIcon(WORLD_ENCOUNTER_BOSS_ICON_ID)');
    expect(source).toContain('this.load.image(encounterBossIconResource.key, encounterBossIconResource.path)');
    expect(source).toContain('private _setWorldEncounterLine(');
    expect(source).toContain('private _addWorldEncounterAmbientIcon(');
    expect(source).toContain("setName('world_encounter_ambient_icon')");
    expect(source).toContain('ambientIcon.setDisplaySize(16, 16)');
    expect(source).toContain('ambientIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST)');
    expect(source).toContain('private _addWorldEncounterBossIcon(');
    expect(source).toContain("setName('world_encounter_boss_icon')");
    expect(source).toContain('bossIcon.setDisplaySize(16, 16)');
    expect(source).toContain('bossIcon.texture.setFilter(Phaser.Textures.FilterMode.NEAREST)');
    expect(source).toContain("this._setWorldEncounterLine(panel, encounterLine, '월드맵 버튼 프레임 QA — 서버 encounter 요청 생략', true)");
    expect(source).toContain("this._setWorldEncounterLine(panel, encounterLine, `${enc.ambientLine} — ${monsters} (최대 ${enc.maxSpawn}체)`, enc.hasBossSlot)");
    expect(source).toContain('const renderedEncounterAmbientIcons = this.worldEncounterAmbientIcons.filter(icon => icon.active)');
    expect(source).toContain('const renderedEncounterBossIcons = this.worldEncounterBossIcons.filter(icon => icon.active)');
    expect(source).toContain('encounterLineIcon: {');
    expect(source).toContain('missingEncounterAmbientIconTextureKeys');
    expect(source).toContain('missingEncounterBossIconTextureKeys');
    expect(source).toContain("this.worldEncounterLineText?.text.includes('🛡')");
    expect(source).toContain("this.worldEncounterLineText?.text.includes('⚔')");
    expect(source).not.toContain("encounterLine.setText('🛡 월드맵 버튼 프레임 QA — 서버 encounter 요청 생략')");
    expect(source).not.toContain("const bossTag = enc.hasBossSlot ? ' ⚔️ 보스 등장 가능' : ''");
    expect(source).not.toContain('encounterLine.setText(`🛡 ${enc.ambientLine}');
  });

  it('WorldScene player marker renders an Aseprite character battle thumbnail before circle fallback', () => {
    const source = readSceneSource('WorldScene.ts');

    expect(source).toContain('const WORLD_SCENE_EXPECTED_PLAYER_MARKER_AVATAR_COUNT = 1');
    expect(source).toContain('const WORLD_PLAYER_MARKER_AVATAR_RESOURCES = {');
    expect(source).toContain("ether_knight: {");
    expect(source).toContain("key: 'char_battle_ether_knight'");
    expect(source).toContain("path: 'assets/generated/characters/class_main/battle/char_battle_ether_knight.png'");
    expect(source).toContain('function getWorldPlayerMarkerAvatarResource(classId?: string)');
    expect(source).toContain('private playerMarker!: Phaser.GameObjects.Image | Phaser.GameObjects.Arc');
    expect(source).toContain('private worldPlayerMarkerAvatar: Phaser.GameObjects.Image | null = null');
    expect(source).toContain('const playerMarkerAvatarResource = getWorldPlayerMarkerAvatarResource(this.sceneData.characterClass)');
    expect(source).toContain('this.load.image(playerMarkerAvatarResource.key, playerMarkerAvatarResource.path)');
    expect(source).toContain('const renderedPlayerMarkerAvatar = this.worldPlayerMarkerAvatar?.active ? this.worldPlayerMarkerAvatar : null');
    expect(source).toContain('missingPlayerMarkerAvatarTextureKeys');
    expect(source).toContain('this.playerMarker = this._addWorldPlayerMarker(');
    expect(source).toContain('private _addWorldPlayerMarker(');
    expect(source).toContain("setName('world_player_marker_avatar')");
    expect(source).toContain('marker.setDisplaySize(24, 36)');
    expect(source).toContain('marker.texture.setFilter(Phaser.Textures.FilterMode.NEAREST)');
    expect(source).toContain("setName('world_player_marker_fallback')");
    expect(source).toContain('playerMarkerAvatar: {');
    expect(source).toContain('renderedCount: renderedPlayerMarkerAvatar ? 1 : 0');
  });

  it('WorldScene renders an Aseprite environment background before flat color fallback', () => {
    const source = readSceneSource('WorldScene.ts');

    expect(source).toContain('zoneId?: string');
    expect(source).toContain('WORLD_SCENE_EXPECTED_BACKGROUND_IMAGE_COUNT = 1');
    expect(source).toContain('WORLD_SCENE_EXPECTED_ACTION_BUTTON_FRAME_COUNT = 4');
    expect(source).toContain('private worldBackgroundImage: Phaser.GameObjects.Image | null = null');
    expect(source).toContain('private worldActionButtonFrames: Phaser.GameObjects.Image[] = []');
    expect(source).toContain('if (data?.zoneId) this.currentZoneId = data.zoneId');
    expect(source).toContain('const worldBackground = this._resolveWorldBackgroundDescriptor()');
    expect(source).toContain('this.load.image(worldBackground.farKey, worldBackground.farPath)');
    expect(source).toContain('this._addWorldBackground(width, height)');
    expect(source).toContain('this._addWorldActionButton(');
    expect(source).toContain("name: 'world_era_prev_action_button'");
    expect(source).toContain("name: 'world_era_next_action_button'");
    expect(source).toContain("name: 'world_back_action_button'");
    expect(source).toContain("name: 'world_travel_action_button'");
    expect(source).toContain('월드맵 버튼 프레임 QA — 서버 encounter 요청 생략');
    expect(source).toContain('private _resolveWorldBackgroundDescriptor(): ReturnType<typeof resolveZoneBackground>');
    expect(source).toContain('this.worldBackgroundImage = this.add.image(width / 2, height / 2, background.farKey)');
    expect(source).toContain("setName('world_scene_background_image')");
    expect(source).toContain('setDisplaySize(width, height)');
    expect(source).toContain('this.worldActionButtonFrames.push(frame)');
    expect(source).toContain('actionButtonFrame');
    expect(source).toContain('Aseprite world scene background 로드 실패 시에만 사용하는 안전 fallback');
    expect(source).toContain('document.body.dataset.aeternaWorldFrameQa = JSON.stringify');
    expect(source).toContain("new URLSearchParams(window.location.search).get('worldFrameQa') === '1'");
  });
});
