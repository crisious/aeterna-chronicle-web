import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CHARACTER_SPRITE_MANIFEST,
  getCharacterSpriteAnimationKey,
  getCharacterSpriteResource,
} from '../../client/src/assets/characterSpriteManifest';

function readSceneSource(sceneFileName: string): string {
  return readFileSync(resolve(process.cwd(), 'client/src/scenes', sceneFileName), 'utf8');
}

function readClientSource(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), 'client/src', relativePath), 'utf8');
}

describe('character sprite manifest', () => {
  it('Ether Knight pilot runtime paths are defined', () => {
    const resource = getCharacterSpriteResource('ether_knight');

    expect(resource).toEqual({
      classId: 'ether_knight',
      textureKey: 'char_sprite_ether_knight_base',
      imagePath: 'assets/generated/characters/sprites/char_ether_knight_base.png',
      jsonPath: 'assets/generated/characters/sprites/char_ether_knight_base.json',
      frameWidth: 64,
      frameHeight: 64,
      directions: ['D'],
      motions: ['idle', 'walk'],
    });
  });

  it('builds Ether Knight animation keys', () => {
    expect(getCharacterSpriteAnimationKey('ether_knight', 'idle', 'D')).toBe(
      'char_sprite_ether_knight_idle_D',
    );
    expect(getCharacterSpriteAnimationKey('ether_knight', 'walk', 'D')).toBe(
      'char_sprite_ether_knight_walk_D',
    );
  });

  it('keeps texture keys unique', () => {
    const textureKeys = CHARACTER_SPRITE_MANIFEST.map((resource) => resource.textureKey);

    expect(new Set(textureKeys).size).toBe(textureKeys.length);
  });

  it('returns undefined for unknown class ids', () => {
    expect(getCharacterSpriteResource('unknown_class')).toBeUndefined();
  });

  it('Ether Knight runtime JSON matches the 10-frame 64x64 strip contract', () => {
    const resource = getCharacterSpriteResource('ether_knight');
    if (!resource) throw new Error('ether_knight sprite resource is missing');

    const metadata = JSON.parse(
      readFileSync(resolve(process.cwd(), resource.jsonPath), 'utf8'),
    ) as { count: number; sprites: Array<{ w: number; h: number }> };

    expect(metadata.count).toBe(10);
    expect(metadata.sprites).toHaveLength(10);
    for (const frame of metadata.sprites) {
      expect(frame.w).toBe(resource.frameWidth);
      expect(frame.h).toBe(resource.frameHeight);
    }
  });

  it('GameScene integrates manifest sprite resources with the player fallback texture', () => {
    const source = readSceneSource('GameScene.ts');

    expect(source).toContain("import { getCharacterSpriteResource } from '../assets/characterSpriteManifest';");
    expect(source).toContain('getCharacterSpriteResource(this.currentCharacterClassId)');
    expect(source).toContain('this.load.spritesheet(playerSpriteResource.textureKey, playerSpriteResource.imagePath');
    expect(source).toContain('frameWidth: playerSpriteResource.frameWidth');
    expect(source).toContain('frameHeight: playerSpriteResource.frameHeight');
    expect(source).toContain('this.textures.exists(playerSpriteResource.textureKey)');
    expect(source).toContain('this.physics.add.sprite(640, 360, textureKey, 0)');
    expect(source).toContain('this.player.setFrame(0)');
    expect(source).toContain("'player_sprite'");
  });

  it('GameScene forwards characterClass when returning to WorldScene', () => {
    const source = readSceneSource('GameScene.ts');
    const directWorldSceneStarts = source.match(/this\.scene\.start\('WorldScene'/g) ?? [];
    const worldSceneHelperCalls = source.match(/this\.startWorldScene\(\)/g) ?? [];

    expect(source).toContain('private sceneData: GameSceneData = {}');
    expect(source).toContain('this.sceneData = data ?? {}');
    expect(source).toContain('private startWorldScene(): void');
    expect(source).toContain("this.scene.start('WorldScene', {");
    expect(source).toContain('...this.sceneData');
    expect(source).toContain('characterClass: this.currentCharacterClassId');
    expect(directWorldSceneStarts).toHaveLength(1);
    expect(worldSceneHelperCalls).toHaveLength(5);
  });

  it('GameScene preserves scene data when returning to LobbyScene or entering BattleScene', () => {
    const source = readSceneSource('GameScene.ts');
    const directLobbySceneStarts = source.match(/this\.scene\.start\('LobbyScene'/g) ?? [];

    expect(source).toContain('characterName?: string');
    expect(source).toContain('className?: string');
    expect(source).toContain('baseStats?: { hp: number; mp: number; atk: number; def: number }');
    expect(source).toContain('private startLobbyScene(): void');
    expect(source).toContain("this.scene.start('LobbyScene', {");
    expect(source).toContain("this.scene.start('BattleScene', {");
    expect(source).toContain('zoneName: this.currentZoneName');
    expect(directLobbySceneStarts).toHaveLength(1);
  });

  it('BattleScene prioritizes manifest sprite resources before static battle fallbacks', () => {
    const source = readSceneSource('BattleScene.ts');

    expect(source).toContain("import { getCharacterSpriteResource } from '../assets/characterSpriteManifest';");
    expect(source).toContain('const spriteResource = getCharacterSpriteResource(cid)');
    expect(source).toContain('this.load.spritesheet(spriteResource.textureKey, spriteResource.imagePath');
    expect(source).toContain('frameWidth: spriteResource.frameWidth');
    expect(source).toContain('frameHeight: spriteResource.frameHeight');
    expect(source).toContain('const spriteResource = getCharacterSpriteResource(classId)');
    expect(source).toContain('this.textures.exists(spriteResource.textureKey)');
    expect(source).toContain('this.add.image(pos.x, pos.y, spriteResource.textureKey, 0)');
    expect(source).toContain('sprite.setFrame(0)');
    expect(source).toContain('Phaser.Textures.FilterMode.NEAREST');
    expect(source).toContain('Phaser.Textures.FilterMode.LINEAR');
    expect(source).toContain('this.add.rectangle(pos.x, pos.y, 48, 64, 0x4488ff)');
  });

  it('WorldScene forwards characterClass when entering GameScene', () => {
    const source = readSceneSource('WorldScene.ts');

    expect(source).toContain('interface WorldSceneData');
    expect(source).toContain('characterName?: string');
    expect(source).toContain('characterClass?: string');
    expect(source).toContain('className?: string');
    expect(source).toContain('baseStats?: { hp: number; mp: number; atk: number; def: number }');
    expect(source).toContain('private sceneData: WorldSceneData = {}');
    expect(source).toContain('this.sceneData = data ?? {}');
    expect(source).toContain('...this.sceneData');
    expect(source).toContain('characterClass: this.sceneData.characterClass');
  });

  it('WorldScene preserves scene data when returning to LobbyScene', () => {
    const source = readSceneSource('WorldScene.ts');
    const directLobbySceneStarts = source.match(/this\.scene\.start\('LobbyScene'/g) ?? [];
    const lobbySceneHelperCalls = source.match(/this\.startLobbyScene\(\)/g) ?? [];

    expect(source).toContain('private startLobbyScene(): void');
    expect(source).toContain("this.scene.start('LobbyScene', {");
    expect(source).toContain('eraId: this.currentEraId');
    expect(source).toContain('this.sceneData = { ...this.sceneData, eraId: nextEraId }');
    expect(directLobbySceneStarts).toHaveLength(1);
    expect(lobbySceneHelperCalls).toHaveLength(2);
  });

  it('BattleScene preserves init data when returning to GameScene', () => {
    const source = readSceneSource('BattleScene.ts');

    expect(source).toContain('characterName?: string');
    expect(source).toContain('className?: string');
    expect(source).toContain('baseStats?: { hp: number; mp: number; atk: number; def: number }');
    expect(source).toContain("this.scene.start('GameScene', {");
    expect(source).toContain('...this._initData');
  });

  it('debug scene bootstrap forwards class query parameters into runtime scenes', () => {
    const source = readClientSource('main.ts');

    expect(source).toContain("const characterClass = params.get('class')?.trim() || 'ether_knight'");
    expect(source).toContain("phaserGame.scene.start('WorldScene', { eraId, characterClass })");
    expect(source).toContain('characterClass,');
  });
});
