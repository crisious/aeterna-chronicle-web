import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CHARACTER_SPRITE_MANIFEST,
  CHARACTER_BASE_FRAME_COUNT,
  CHARACTER_DIRECTION_ORDER,
  CHARACTER_MOTION_FRAMES,
  getCharacterSpriteAnimationKey,
  getCharacterSpriteResource,
  getCharacterFrameRange,
} from '../../client/src/assets/characterSpriteManifest';

function readSceneSource(sceneFileName: string): string {
  return readFileSync(resolve(process.cwd(), 'client/src/scenes', sceneFileName), 'utf8');
}

function readClientSource(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), 'client/src', relativePath), 'utf8');
}

describe('character sprite manifest', () => {
  const expectedDirections = ['D', 'DL', 'L', 'UL', 'U'] as const;
  const expectedMotions = ['idle', 'walk', 'attack_melee', 'cast', 'hit', 'death', 'ready', 'victory'] as const;
  const motionRanges = {
    idle: { from: 0, to: 3 },
    walk: { from: 4, to: 9 },
    attack_melee: { from: 10, to: 15 },
    cast: { from: 16, to: 20 },
    hit: { from: 21, to: 23 },
    death: { from: 24, to: 29 },
    ready: { from: 30, to: 33 },
    victory: { from: 34, to: 39 },
  } as const;

  it('Ether Knight full 5-direction runtime paths are defined', () => {
    const resource = getCharacterSpriteResource('ether_knight');

    expect(resource).toEqual({
      classId: 'ether_knight',
      textureKey: 'char_sprite_ether_knight_base',
      imagePath: 'assets/generated/characters/sprites/char_ether_knight_base.png',
      jsonPath: 'assets/generated/characters/sprites/char_ether_knight_base.json',
      frameWidth: 64,
      frameHeight: 64,
      directions: expectedDirections,
      motions: expectedMotions,
    });
  });

  it('Memory Weaver full 5-direction runtime paths are defined', () => {
    const resource = getCharacterSpriteResource('memory_weaver');

    expect(resource).toEqual({
      classId: 'memory_weaver',
      textureKey: 'char_sprite_memory_weaver_base',
      imagePath: 'assets/generated/characters/sprites/char_memory_weaver_base.png',
      jsonPath: 'assets/generated/characters/sprites/char_memory_weaver_base.json',
      frameWidth: 64,
      frameHeight: 64,
      directions: expectedDirections,
      motions: expectedMotions,
    });
  });

  it('Shadow Weaver full 5-direction runtime paths are defined', () => {
    const resource = getCharacterSpriteResource('shadow_weaver');

    expect(resource).toEqual({
      classId: 'shadow_weaver',
      textureKey: 'char_sprite_shadow_weaver_base',
      imagePath: 'assets/generated/characters/sprites/char_shadow_weaver_base.png',
      jsonPath: 'assets/generated/characters/sprites/char_shadow_weaver_base.json',
      frameWidth: 64,
      frameHeight: 64,
      directions: expectedDirections,
      motions: expectedMotions,
    });
  });

  it('Memory Breaker full 5-direction runtime paths are defined', () => {
    const resource = getCharacterSpriteResource('memory_breaker');

    expect(resource).toEqual({
      classId: 'memory_breaker',
      textureKey: 'char_sprite_memory_breaker_base',
      imagePath: 'assets/generated/characters/sprites/char_memory_breaker_base.png',
      jsonPath: 'assets/generated/characters/sprites/char_memory_breaker_base.json',
      frameWidth: 64,
      frameHeight: 64,
      directions: expectedDirections,
      motions: expectedMotions,
    });
  });

  it('Time Guardian full 5-direction runtime paths are defined', () => {
    const resource = getCharacterSpriteResource('time_guardian');

    expect(resource).toEqual({
      classId: 'time_guardian',
      textureKey: 'char_sprite_time_guardian_base',
      imagePath: 'assets/generated/characters/sprites/char_time_guardian_base.png',
      jsonPath: 'assets/generated/characters/sprites/char_time_guardian_base.json',
      frameWidth: 64,
      frameHeight: 64,
      directions: expectedDirections,
      motions: expectedMotions,
    });
  });

  it('Void Wanderer full 5-direction runtime paths are defined', () => {
    const resource = getCharacterSpriteResource('void_wanderer');

    expect(resource).toEqual({
      classId: 'void_wanderer',
      textureKey: 'char_sprite_void_wanderer_base',
      imagePath: 'assets/generated/characters/sprites/char_void_wanderer_base.png',
      jsonPath: 'assets/generated/characters/sprites/char_void_wanderer_base.json',
      frameWidth: 64,
      frameHeight: 64,
      directions: expectedDirections,
      motions: expectedMotions,
    });
  });

  it('builds Ether Knight animation keys', () => {
    for (const direction of expectedDirections) {
      for (const motion of expectedMotions) {
        expect(getCharacterSpriteAnimationKey('ether_knight', motion, direction)).toBe(
          `char_sprite_ether_knight_${motion}_${direction}`,
        );
      }
    }
  });

  it('builds Memory Weaver animation keys', () => {
    for (const direction of expectedDirections) {
      for (const motion of expectedMotions) {
        expect(getCharacterSpriteAnimationKey('memory_weaver', motion, direction)).toBe(
          `char_sprite_memory_weaver_${motion}_${direction}`,
        );
      }
    }
  });

  it('builds Shadow Weaver animation keys', () => {
    for (const direction of expectedDirections) {
      for (const motion of expectedMotions) {
        expect(getCharacterSpriteAnimationKey('shadow_weaver', motion, direction)).toBe(
          `char_sprite_shadow_weaver_${motion}_${direction}`,
        );
      }
    }
  });

  it('builds Memory Breaker animation keys', () => {
    for (const direction of expectedDirections) {
      for (const motion of expectedMotions) {
        expect(getCharacterSpriteAnimationKey('memory_breaker', motion, direction)).toBe(
          `char_sprite_memory_breaker_${motion}_${direction}`,
        );
      }
    }
  });

  it('builds Time Guardian animation keys', () => {
    for (const direction of expectedDirections) {
      for (const motion of expectedMotions) {
        expect(getCharacterSpriteAnimationKey('time_guardian', motion, direction)).toBe(
          `char_sprite_time_guardian_${motion}_${direction}`,
        );
      }
    }
  });

  it('builds Void Wanderer animation keys', () => {
    for (const direction of expectedDirections) {
      for (const motion of expectedMotions) {
        expect(getCharacterSpriteAnimationKey('void_wanderer', motion, direction)).toBe(
          `char_sprite_void_wanderer_${motion}_${direction}`,
        );
      }
    }
  });

  it('keeps texture keys unique', () => {
    const textureKeys = CHARACTER_SPRITE_MANIFEST.map((resource) => resource.textureKey);

    expect(new Set(textureKeys).size).toBe(textureKeys.length);
  });

  it('returns undefined for unknown class ids', () => {
    expect(getCharacterSpriteResource('unknown_class')).toBeUndefined();
  });

  it('Ether Knight runtime JSON matches the 200-frame 64x64 5-direction contract', () => {
    const resource = getCharacterSpriteResource('ether_knight');
    if (!resource) throw new Error('ether_knight sprite resource is missing');

    const metadata = JSON.parse(
      readFileSync(resolve(process.cwd(), resource.jsonPath), 'utf8'),
    ) as {
      count: number;
      size: { w: number; h: number };
      sprites: Array<{ w: number; h: number }>;
      tags: Array<{ name: string; from: number; to: number }>;
    };

    expect(metadata.count).toBe(200);
    expect(metadata.size).toEqual({ w: 2560, h: 320 });
    expect(metadata.sprites).toHaveLength(200);
    for (const frame of metadata.sprites) {
      expect(frame.w).toBe(resource.frameWidth);
      expect(frame.h).toBe(resource.frameHeight);
    }
    const actualTags = Object.fromEntries(metadata.tags.map(({ name, from, to }) => [name, { from, to }]));
    const expectedTags = Object.fromEntries(
      expectedDirections.flatMap((direction, directionIndex) => (
        expectedMotions.map((motion) => {
          const range = motionRanges[motion];
          const frameOffset = directionIndex * 40;

          return [`${motion}_${direction}`, { from: frameOffset + range.from, to: frameOffset + range.to }];
        })
      )),
    );
    expect(actualTags).toEqual(expectedTags);
  });

  it('Memory Weaver runtime JSON matches the 200-frame 64x64 5-direction contract', () => {
    const resource = getCharacterSpriteResource('memory_weaver');
    if (!resource) throw new Error('memory_weaver sprite resource is missing');

    const metadata = JSON.parse(
      readFileSync(resolve(process.cwd(), resource.jsonPath), 'utf8'),
    ) as {
      count: number;
      size: { w: number; h: number };
      sprites: Array<{ w: number; h: number }>;
      tags: Array<{ name: string; from: number; to: number }>;
    };

    expect(metadata.count).toBe(200);
    expect(metadata.size).toEqual({ w: 2560, h: 320 });
    expect(metadata.sprites).toHaveLength(200);
    for (const frame of metadata.sprites) {
      expect(frame.w).toBe(resource.frameWidth);
      expect(frame.h).toBe(resource.frameHeight);
    }
    const actualTags = Object.fromEntries(metadata.tags.map(({ name, from, to }) => [name, { from, to }]));
    const expectedTags = Object.fromEntries(
      expectedDirections.flatMap((direction, directionIndex) => (
        expectedMotions.map((motion) => {
          const range = motionRanges[motion];
          const frameOffset = directionIndex * 40;

          return [`${motion}_${direction}`, { from: frameOffset + range.from, to: frameOffset + range.to }];
        })
      )),
    );
    expect(actualTags).toEqual(expectedTags);
  });

  it('Shadow Weaver runtime JSON matches the 200-frame 64x64 5-direction contract', () => {
    const resource = getCharacterSpriteResource('shadow_weaver');
    if (!resource) throw new Error('shadow_weaver sprite resource is missing');

    const metadata = JSON.parse(
      readFileSync(resolve(process.cwd(), resource.jsonPath), 'utf8'),
    ) as {
      count: number;
      size: { w: number; h: number };
      sprites: Array<{ w: number; h: number }>;
      tags: Array<{ name: string; from: number; to: number }>;
    };

    expect(metadata.count).toBe(200);
    expect(metadata.size).toEqual({ w: 2560, h: 320 });
    expect(metadata.sprites).toHaveLength(200);
    for (const frame of metadata.sprites) {
      expect(frame.w).toBe(resource.frameWidth);
      expect(frame.h).toBe(resource.frameHeight);
    }
    const actualTags = Object.fromEntries(metadata.tags.map(({ name, from, to }) => [name, { from, to }]));
    const expectedTags = Object.fromEntries(
      expectedDirections.flatMap((direction, directionIndex) => (
        expectedMotions.map((motion) => {
          const range = motionRanges[motion];
          const frameOffset = directionIndex * 40;

          return [`${motion}_${direction}`, { from: frameOffset + range.from, to: frameOffset + range.to }];
        })
      )),
    );
    expect(actualTags).toEqual(expectedTags);
  });

  it('Memory Breaker runtime JSON matches the 200-frame 64x64 5-direction contract', () => {
    const resource = getCharacterSpriteResource('memory_breaker');
    if (!resource) throw new Error('memory_breaker sprite resource is missing');

    const metadata = JSON.parse(
      readFileSync(resolve(process.cwd(), resource.jsonPath), 'utf8'),
    ) as {
      count: number;
      size: { w: number; h: number };
      sprites: Array<{ w: number; h: number }>;
      tags: Array<{ name: string; from: number; to: number }>;
    };

    expect(metadata.count).toBe(200);
    expect(metadata.size).toEqual({ w: 2560, h: 320 });
    expect(metadata.sprites).toHaveLength(200);
    for (const frame of metadata.sprites) {
      expect(frame.w).toBe(resource.frameWidth);
      expect(frame.h).toBe(resource.frameHeight);
    }
    const actualTags = Object.fromEntries(metadata.tags.map(({ name, from, to }) => [name, { from, to }]));
    const expectedTags = Object.fromEntries(
      expectedDirections.flatMap((direction, directionIndex) => (
        expectedMotions.map((motion) => {
          const range = motionRanges[motion];
          const frameOffset = directionIndex * 40;

          return [`${motion}_${direction}`, { from: frameOffset + range.from, to: frameOffset + range.to }];
        })
      )),
    );
    expect(actualTags).toEqual(expectedTags);
  });

  it('Time Guardian runtime JSON matches the 200-frame 64x64 5-direction contract', () => {
    const resource = getCharacterSpriteResource('time_guardian');
    if (!resource) throw new Error('time_guardian sprite resource is missing');

    const metadata = JSON.parse(
      readFileSync(resolve(process.cwd(), resource.jsonPath), 'utf8'),
    ) as {
      count: number;
      size: { w: number; h: number };
      sprites: Array<{ w: number; h: number }>;
      tags: Array<{ name: string; from: number; to: number }>;
    };

    expect(metadata.count).toBe(200);
    expect(metadata.size).toEqual({ w: 2560, h: 320 });
    expect(metadata.sprites).toHaveLength(200);
    for (const frame of metadata.sprites) {
      expect(frame.w).toBe(resource.frameWidth);
      expect(frame.h).toBe(resource.frameHeight);
    }
    const actualTags = Object.fromEntries(metadata.tags.map(({ name, from, to }) => [name, { from, to }]));
    const expectedTags = Object.fromEntries(
      expectedDirections.flatMap((direction, directionIndex) => (
        expectedMotions.map((motion) => {
          const range = motionRanges[motion];
          const frameOffset = directionIndex * 40;

          return [`${motion}_${direction}`, { from: frameOffset + range.from, to: frameOffset + range.to }];
        })
      )),
    );
    expect(actualTags).toEqual(expectedTags);
  });

  it('Void Wanderer runtime JSON matches the 200-frame 64x64 5-direction contract', () => {
    const resource = getCharacterSpriteResource('void_wanderer');
    if (!resource) throw new Error('void_wanderer sprite resource is missing');

    const metadata = JSON.parse(
      readFileSync(resolve(process.cwd(), resource.jsonPath), 'utf8'),
    ) as {
      count: number;
      size: { w: number; h: number };
      sprites: Array<{ w: number; h: number }>;
      tags: Array<{ name: string; from: number; to: number }>;
    };

    expect(metadata.count).toBe(200);
    expect(metadata.size).toEqual({ w: 2560, h: 320 });
    expect(metadata.sprites).toHaveLength(200);
    for (const frame of metadata.sprites) {
      expect(frame.w).toBe(resource.frameWidth);
      expect(frame.h).toBe(resource.frameHeight);
    }
    const actualTags = Object.fromEntries(metadata.tags.map(({ name, from, to }) => [name, { from, to }]));
    const expectedTags = Object.fromEntries(
      expectedDirections.flatMap((direction, directionIndex) => (
        expectedMotions.map((motion) => {
          const range = motionRanges[motion];
          const frameOffset = directionIndex * 40;

          return [`${motion}_${direction}`, { from: frameOffset + range.from, to: frameOffset + range.to }];
        })
      )),
    );
    expect(actualTags).toEqual(expectedTags);
  });

  it('GameScene integrates manifest sprite resources with the player fallback texture', () => {
    const source = readSceneSource('GameScene.ts');

    expect(source).toContain("import { getCharacterSpriteResource } from '../assets/characterSpriteManifest';");
    expect(source).toContain('getCharacterSpriteResource(this.currentCharacterClassId)');
    expect(source).toContain('queueCharacterSprite(playerSpriteResource)');
    expect(source).toContain('this.load.spritesheet(characterSpriteResource.textureKey, characterSpriteResource.imagePath');
    expect(source).toContain('frameWidth: characterSpriteResource.frameWidth');
    expect(source).toContain('frameHeight: characterSpriteResource.frameHeight');
    expect(source).toContain('this.textures.exists(characterSpriteResource.textureKey)');
    expect(source).toContain('this.physics.add.sprite(640, 360, textureKey, 0)');
    expect(source).toContain('this.player.setFrame(0)');
    expect(source).toContain("'player_sprite'");
  });

  it('GameScene renders remote players with Aseprite character sprites before rectangle fallback', () => {
    const source = readSceneSource('GameScene.ts');
    const networkSource = readClientSource('network/NetworkManager.ts');

    expect(source).toContain("import { CHARACTER_SPRITE_MANIFEST } from '../assets/characterSpriteManifest';");
    expect(source).toContain('const queuedCharacterTextureKeys = new Set<string>()');
    expect(source).toContain('for (const characterSpriteResource of CHARACTER_SPRITE_MANIFEST)');
    expect(source).toContain("characterClass?: string");
    expect(source).toContain("const remoteClassId = d.characterClass?.trim() ?? ''");
    expect(source).toContain('const remoteSpriteResource = remoteClassId ? getCharacterSpriteResource(remoteClassId) : undefined');
    expect(source).toContain('this.add.image(d.x, d.y, remoteSpriteResource.textureKey, 0)');
    expect(source).toContain('sprite.setFrame(0)');
    expect(source).toContain('Phaser.Textures.FilterMode.NEAREST');
    expect(source).toContain('Aseprite remote player sprite 로드 실패 시에만 사용하는 안전 fallback');
    expect(source).toContain('this.add.rectangle(d.x, d.y, 40, 56, 0x4488ff)');
    expect(networkSource).toContain("'world:playerJoined': { characterId: string; name: string; x: number; y: number; characterClass?: string }");
  });

  it('GameScene skips network setup in offline QA mode', () => {
    const source = readSceneSource('GameScene.ts');
    const hudSource = readClientSource('services/HUDOrchestrator.ts');

    expect(source).toContain('if (this.sceneData.offlineQa === true)');
    expect(source).toContain("this.connectionLabel?.setText('● 로컬 QA').setColor('#ffcc44')");
    expect(source).toContain('return;');
    expect(source).toContain('this.zoneInfo = null;');
    expect(source).toContain('networkManager.getZoneInfo(this.currentZoneId)');
    expect(source).toContain('networkManager.connect()');
    expect(source).toContain('skipQuestLoad: this.sceneData.offlineQa === true');
    expect(hudSource).toContain('interface HUDOrchestratorOptions');
    expect(hudSource).toContain('skipQuestLoad?: boolean');
    expect(hudSource).toContain('if (!this.options.skipQuestLoad)');
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

    expect(source).toContain("from '../assets/characterSpriteManifest'");
    expect(source).toContain('getCharacterSpriteResource');
    expect(source).toContain('getCharacterSpriteAnimationKey');
    expect(source).toContain('getCharacterFrameRange');
    expect(source).toContain('const spriteResource = getCharacterSpriteResource(cid)');
    expect(source).toContain('this.load.spritesheet(spriteResource.textureKey, spriteResource.imagePath');
    expect(source).toContain('frameWidth: spriteResource.frameWidth');
    expect(source).toContain('frameHeight: spriteResource.frameHeight');
    expect(source).toContain('const spriteResource = getCharacterSpriteResource(classId)');
    expect(source).toContain('this.textures.exists(spriteResource.textureKey)');
    // 애니메이션 배선: 정적 add.image 가 아니라 add.sprite 로 만들어 태그 재생.
    expect(source).toContain('this.add.sprite(pos.x, pos.y, spriteResource.textureKey, 0)');
    expect(source).toContain("this._playCharMotion(charSprite, classId, 'idle', 'D')");
    expect(source).toContain('this.anims.generateFrameNumbers(resource.textureKey, { start: from, end: to })');
    expect(source).toContain("this._playAllyMotion(a => !a.isDead, 'victory')");
    expect(source).toContain("this._playAllyMotion(() => true, 'death')");
    expect(source).toContain('Phaser.Textures.FilterMode.NEAREST');
    expect(source).toContain('Phaser.Textures.FilterMode.LINEAR');
    expect(source).toContain('this.add.rectangle(pos.x, pos.y, 48, 64, 0x4488ff)');
  });

  describe('frame-range SSOT', () => {
    it('exposes the 40-frame layout constants', () => {
      expect(CHARACTER_BASE_FRAME_COUNT).toBe(40);
      expect(CHARACTER_DIRECTION_ORDER).toEqual(['D', 'DL', 'L', 'UL', 'U']);
    });

    it('motion frame table matches the documented contract (attack_ranged falls back to melee)', () => {
      for (const [motion, range] of Object.entries(motionRanges)) {
        expect(CHARACTER_MOTION_FRAMES[motion as keyof typeof motionRanges]).toEqual(range);
      }
      // attack_ranged shares the melee block so missing-ranged classes don't index past the sheet.
      expect(CHARACTER_MOTION_FRAMES.attack_ranged).toEqual(CHARACTER_MOTION_FRAMES.attack_melee);
    });

    it('getCharacterFrameRange offsets by direction index × 40', () => {
      // D is the first block — no offset.
      expect(getCharacterFrameRange('idle', 'D')).toEqual({ from: 0, to: 3 });
      expect(getCharacterFrameRange('victory', 'D')).toEqual({ from: 34, to: 39 });
      // L is index 2 → +80.
      expect(getCharacterFrameRange('idle', 'L')).toEqual({ from: 80, to: 83 });
      // U is index 4 → +160; victory tops out at 199 (last frame of a 200-frame sheet).
      expect(getCharacterFrameRange('victory', 'U')).toEqual({ from: 194, to: 199 });
    });

    it('every direction × motion range stays within the per-class 200-frame sheet', () => {
      const totalFrames = CHARACTER_BASE_FRAME_COUNT * CHARACTER_DIRECTION_ORDER.length;
      for (const direction of CHARACTER_DIRECTION_ORDER) {
        for (const motion of Object.keys(CHARACTER_MOTION_FRAMES) as (keyof typeof CHARACTER_MOTION_FRAMES)[]) {
          const { from, to } = getCharacterFrameRange(motion, direction);
          expect(from).toBeGreaterThanOrEqual(0);
          expect(to).toBeLessThan(totalFrames);
          expect(from).toBeLessThanOrEqual(to);
        }
      }
    });
  });

  it('DungeonScene prioritizes manifest character sprites before side illustration fallback', () => {
    const source = readSceneSource('DungeonScene.ts');

    expect(source).toContain("import { getCharacterSpriteResource } from '../assets/characterSpriteManifest';");
    expect(source).toContain('private _getPlayerClassId(): string');
    expect(source).toContain('getCharacterSpriteResource(this._getPlayerClassId()) ?? getCharacterSpriteResource');
    expect(source).toContain('this.load.spritesheet(playerSpriteResource.textureKey, playerSpriteResource.imagePath');
    expect(source).toContain('frameWidth: playerSpriteResource.frameWidth');
    expect(source).toContain('frameHeight: playerSpriteResource.frameHeight');
    expect(source).toContain("this.load.image('dungeon_player'");
    expect(source).toContain('this.textures.exists(playerSpriteResource.textureKey)');
    expect(source).toContain('this.add.image(PLAYER_X, py, playerSpriteResource.textureKey, 0)');
    expect(source).toContain('sprite.setFrame(0)');
    expect(source).toContain('Phaser.Textures.FilterMode.NEAREST');
    expect(source).toContain("this.add.image(PLAYER_X, py, 'dungeon_player')");
    expect(source).toContain('this.add.rectangle(PLAYER_X, py, 40, 50, 0x4488ff)');
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
    expect(source).toContain("phaserGame.scene.start('DungeonScene', {");
    expect(source).toContain('characterClass,');
  });
});
