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

  it('builds textureKey-based animation keys for every class (skin-safe)', () => {
    for (const resource of CHARACTER_SPRITE_MANIFEST) {
      for (const direction of expectedDirections) {
        for (const motion of expectedMotions) {
          expect(getCharacterSpriteAnimationKey(resource.textureKey, motion, direction)).toBe(
            `${resource.textureKey}_${motion}_${direction}`,
          );
        }
      }
    }
  });

  it('resolves recolor skin resources with distinct texture + animation keys', () => {
    const base = getCharacterSpriteResource('ether_knight');
    const ember = getCharacterSpriteResource('ether_knight', 'ember');
    expect(base).toBeDefined();
    expect(ember).toBeDefined();
    // 스킨은 별도 textureKey + recolors/ 경로, 프레임 레이아웃은 base 와 동일.
    expect(ember!.textureKey).toBe('char_sprite_ether_knight_ember');
    expect(ember!.textureKey).not.toBe(base!.textureKey);
    expect(ember!.imagePath).toBe('assets/generated/characters/recolors/char_ether_knight_ember.png');
    expect(ember!.frameWidth).toBe(base!.frameWidth);
    expect(ember!.motions).toEqual(base!.motions);
    // anim 키가 스킨별로 분리돼야 base/스킨이 서로의 프레임을 재생하지 않는다.
    expect(getCharacterSpriteAnimationKey(ember!.textureKey, 'idle', 'D'))
      .not.toBe(getCharacterSpriteAnimationKey(base!.textureKey, 'idle', 'D'));
    // 2번째 시즌(frost)도 동일 패턴으로 해석.
    expect(getCharacterSpriteResource('time_guardian', 'frost')!.textureKey).toBe('char_sprite_time_guardian_frost');
    expect(getCharacterSpriteResource('time_guardian', 'frost')!.imagePath).toBe('assets/generated/characters/recolors/char_time_guardian_frost.png');
    // 미지원 스킨/'base'/미지정은 base 로 폴백.
    expect(getCharacterSpriteResource('ether_knight', 'base')!.textureKey).toBe(base!.textureKey);
    expect(getCharacterSpriteResource('ether_knight', 'nonexistent')!.textureKey).toBe(base!.textureKey);
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
    const mainSource = readClientSource('main.ts');

    expect(source).toContain("from '../assets/characterSpriteManifest'");
    expect(source).toContain('getCharacterSpriteAnimationKey');
    expect(source).toContain('getCharacterFrameRange');
    expect(source).toContain('getCharacterSpriteResource(this.currentCharacterClassId)');
    // 로컬 플레이어는 활성 스킨으로 해석·로드(원격은 base 유지).
    expect(source).toContain("import { getActiveCharacterSkin } from './SettingsScene'");
    expect(source).toContain('getCharacterSpriteResource(this.currentCharacterClassId, getActiveCharacterSkin())');
    expect(source).toContain('queueCharacterSprite(playerSpriteResource)');
    expect(source).toContain('this.load.spritesheet(characterSpriteResource.textureKey, characterSpriteResource.imagePath');
    expect(source).toContain('frameWidth: characterSpriteResource.frameWidth');
    expect(source).toContain('frameHeight: characterSpriteResource.frameHeight');
    expect(source).toContain('this.textures.exists(characterSpriteResource.textureKey)');
    expect(source).toContain('localPlayerFallbackQa?: boolean');
    expect(source).toContain('private localPlayerThumbnailFallbackRendered = false');
    expect(source).toContain('private localPlayerLegacyFallbackRendered = false');
    expect(source).toContain('const playerSpriteResource = this.sceneData.localPlayerFallbackQa === true');
    expect(source).toContain('const playerThumbnailResource = getCharacterHudAvatarResource(this.currentCharacterClassId)');
    expect(source).toContain('this.textures.exists(playerThumbnailResource.key)');
    expect(source).toContain('? playerThumbnailResource.key');
    expect(source).toContain('this.physics.add.sprite(640, 360, textureKey, 0)');
    expect(source).toContain('this.player.setFrame(0)');
    expect(source).toContain("this.player.setName('game_scene_local_player_thumbnail_fallback')");
    expect(source).toContain('this.localPlayerThumbnailFallbackRendered = true');
    expect(source).toContain('this.localPlayerLegacyFallbackRendered = true');
    expect(source).toContain('document.body.dataset.aeternaGameLocalPlayerFallbackQa = JSON.stringify');
    expect(source).toContain('missingLocalPlayerThumbnailKeys');
    expect(mainSource).toContain("localPlayerFallbackQa: params.get('localPlayerFallbackQa') === '1'");
    expect(source).toContain("'player_sprite'");
    // 필드 애니메이션: 스폰 idle + 이동 시 walk/idle(방향 + flipX 미러).
    expect(source).toContain("this._playPlayerAnim('idle')");
    expect(source).toContain('const moving = this._updatePlayerFacing(!!isLeft, !!isRight, !!isUp, !!isDown)');
    expect(source).toContain("this._playPlayerAnim(moving ? 'walk' : 'idle')");
    expect(source).toContain('this.player.setFlipX(this._playerFlipX)');
    expect(source).toContain('this.player.play(key, true)');
  });

  it('GameScene renders remote players with Aseprite character sprites before rectangle fallback', () => {
    const source = readSceneSource('GameScene.ts');
    const mainSource = readClientSource('main.ts');
    const networkSource = readClientSource('network/NetworkManager.ts');

    expect(source).toContain("import { CHARACTER_SPRITE_MANIFEST } from '../assets/characterSpriteManifest';");
    expect(source).toContain('const queuedCharacterTextureKeys = new Set<string>()');
    expect(source).toContain('for (const characterSpriteResource of CHARACTER_SPRITE_MANIFEST)');
    expect(source).toContain('remotePlayerFallbackQa?: boolean');
    expect(source).toContain('private remotePlayerThumbnailFallbackImages: Phaser.GameObjects.Image[] = []');
    expect(source).toContain('private remotePlayerRectangleFallbackRendered = false');
    expect(source).toContain('for (const avatarResource of Object.values(CHARACTER_HUD_AVATAR_RESOURCES))');
    expect(source).toContain('this.load.image(avatarResource.key, avatarResource.path)');
    expect(source).toContain("characterClass?: string");
    expect(source).toContain("const remoteClassId = d.characterClass?.trim() ?? ''");
    expect(source).toContain('const remoteSpriteResource = this.sceneData.remotePlayerFallbackQa === true');
    expect(source).toContain(': (remoteClassId ? getCharacterSpriteResource(remoteClassId) : undefined)');
    expect(source).toContain('const remoteThumbnailResource = getCharacterHudAvatarResource(remoteClassId)');
    // 원격 플레이어도 정적 add.image 가 아니라 add.sprite + idle 루프.
    expect(source).toContain('this.add.sprite(d.x, d.y, remoteSpriteResource.textureKey, 0)');
    expect(source).toContain("this._ensureCharFieldAnim(remoteClassId, 'idle', 'D')");
    expect(source).toContain('Phaser.Textures.FilterMode.NEAREST');
    expect(source).toContain('Aseprite remote player sprite 로드 실패 시 character battle thumbnail을 먼저 사용한다');
    expect(source).toContain('this.add.image(d.x, d.y, remoteThumbnailResource.key)');
    expect(source).toContain("setName(`game_scene_remote_player_thumbnail_fallback_${d.characterId}`)");
    expect(source).toContain('setDisplaySize(40, 60)');
    expect(source).toContain('this.remotePlayerThumbnailFallbackImages.push(thumbnail)');
    expect(source).toContain('Aseprite remote player thumbnail까지 로드 실패 시에만 사용하는 안전 fallback');
    expect(source).toContain('this.add.rectangle(d.x, d.y, 40, 56, 0x4488ff)');
    expect(source).toContain('this.remotePlayerRectangleFallbackRendered = true');
    expect(source).toContain("this._spawnRemotePlayerPreview({");
    expect(source).toContain('document.body.dataset.aeternaGameRemotePlayerFallbackQa = JSON.stringify');
    expect(source).toContain('missingRemotePlayerThumbnailKeys');
    expect(source).toContain('rectangleFallbackRendered: this.remotePlayerRectangleFallbackRendered');
    expect(mainSource).toContain("remotePlayerFallbackQa: params.get('remotePlayerFallbackQa') === '1'");
    expect(networkSource).toContain("'world:playerJoined': { characterId: string; name: string; x: number; y: number; characterClass?: string }");
  });

  it('GameScene skips network setup in offline QA mode', () => {
    const source = readSceneSource('GameScene.ts');
    const hudSource = readClientSource('services/HUDOrchestrator.ts');

    expect(source).toContain('if (this.sceneData.offlineQa === true)');
    expect(source).toContain("this._renderConnectionStatus('connected', '로컬 QA', '#ffcc44')");
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
    const mainSource = readClientSource('main.ts');

    expect(source).toContain("from '../assets/characterSpriteManifest'");
    expect(source).toContain('getCharacterSpriteResource');
    expect(source).toContain('getCharacterSpriteAnimationKey');
    expect(source).toContain('getCharacterFrameRange');
    // 아군은 로컬 파티 → 활성 스킨으로 해석(스킨='base'면 원본).
    expect(source).toContain('const spriteResource = getCharacterSpriteResource(cid, getActiveCharacterSkin())');
    expect(source).toContain('this.load.spritesheet(spriteResource.textureKey, spriteResource.imagePath');
    expect(source).toContain('frameWidth: spriteResource.frameWidth');
    expect(source).toContain('frameHeight: spriteResource.frameHeight');
    expect(source).toContain('const spriteResource = getCharacterSpriteResource(classId, getActiveCharacterSkin())');
    expect(source).toContain('this.textures.exists(spriteResource.textureKey)');
    // 애니메이션 배선: 정적 add.image 가 아니라 add.sprite 로 만들어 태그 재생.
    expect(source).toContain('this.add.sprite(pos.x, pos.y, spriteResource.textureKey, 0)');
    // 전투 진입: ready 포즈 1회 → idle 루프(Phase B 수용 기준).
    expect(source).toContain('this._playCharIntro(charSprite, classId)');
    expect(source).toContain("this._ensureCharAnim(classId, 'ready', 'D')");
    expect(source).toContain('this.anims.generateFrameNumbers(resource.textureKey, { start: from, end: to })');
    // 승리=생존 아군 victory, 개별 사망=_killUnit 의 death 포즈.
    expect(source).toContain("this._playAllyMotion(a => !a.isDead, 'victory')");
    expect(source).toContain("this._playCharMotion(spr, classId, 'death', 'D')");
    // 전투 액션 모션: 공격=attack_melee, 스킬=cast, 피격=hit(단발→idle 복귀).
    expect(source).toContain('private _playCharAction(');
    expect(source).toContain("this._playAttackerAction(attacker, 'attack_melee')");
    expect(source).toContain("this._playAttackerAction(attacker, 'cast')");
    expect(source).toContain('this._playHitReaction(attacker, target)');
    // #280 회귀 가드: Image|Sprite 둘 다 틴트 가능하도록 타입가드 경유.
    expect(source).toContain('private _canTint(');
    expect(source).toContain('if (this._canTint(us.sprite)) us.sprite.setTint(0x666666)');
    expect(source).toContain('battleAllyFallbackQa?: boolean');
    expect(source).toContain('const BATTLE_ALLY_FALLBACK_TEXTURE = {');
    expect(source).toContain("key: 'placeholder'");
    expect(source).toContain("path: 'assets/generated/ui/placeholders/placeholder.png'");
    expect(source).toContain('this.load.image(BATTLE_ALLY_FALLBACK_TEXTURE.key, BATTLE_ALLY_FALLBACK_TEXTURE.path)');
    expect(source).toContain('private battleAllyFallbackImages: Phaser.GameObjects.Image[] = []');
    expect(source).toContain('private battleAllyRectangleFallbackRendered = false');
    expect(source).toContain('this.textures.exists(BATTLE_ALLY_FALLBACK_TEXTURE.key)');
    expect(source).toContain('this.add.image(pos.x, pos.y, BATTLE_ALLY_FALLBACK_TEXTURE.key)');
    expect(source).toContain("setName(`battle_ally_fallback_${unit.id}`)");
    expect(source).toContain('setDisplaySize(BATTLE_ALLY_FALLBACK_TEXTURE.displayWidth, BATTLE_ALLY_FALLBACK_TEXTURE.displayHeight)');
    expect(source).toContain('this.battleAllyFallbackImages.push(fallbackImage)');
    expect(source).toContain('this.battleAllyRectangleFallbackRendered = true');
    expect(source).toContain('this._writeBattleAllyFallbackQaProbe(units)');
    expect(source).toContain('document.body.dataset.aeternaBattleAllyFallbackQa = JSON.stringify');
    expect(source).toContain('missingBattleAllyFallbackKeys');
    expect(mainSource).toContain("battleAllyFallbackQa: params.get('battleAllyFallbackQa') === '1'");
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

  // SSOT 의 진짜 가치는 *실제 생성 시트와 일치할 때*만 성립한다. 단위 테스트
  // (위)는 getCharacterFrameRange 의 내부 일관성만, 런타임 JSON 계약(다른
  // 블록)은 프레임 *수*만 본다. 여기서는 manifest SSOT 의 범위가 각 클래스
  // 생성 Aseprite 태그(<motion>_<direction>)의 from/to 와 정확히 같은지
  // 교차검증해 "시트 레이아웃 변경 후 SSOT 미갱신"(또는 그 반대) 드리프트를
  // 잡는다. 생성 JSON 은 LFS 가 아니라(PNG 만 LFS) CI 에서도 읽힌다.
  describe('frame-range SSOT matches generated Aseprite tags', () => {
    interface AsepriteTag {
      name: string;
      from: number;
      to: number;
    }

    for (const resource of CHARACTER_SPRITE_MANIFEST) {
      it(`${resource.classId}: every <motion>_<direction> tag range equals getCharacterFrameRange`, () => {
        const json = JSON.parse(readFileSync(resolve(process.cwd(), resource.jsonPath), 'utf8')) as {
          tags?: AsepriteTag[];
        };
        const tagByName = new Map((json.tags ?? []).map((t) => [t.name, t]));
        expect(tagByName.size).toBeGreaterThan(0);

        for (const motion of resource.motions) {
          for (const direction of resource.directions) {
            const tagName = `${motion}_${direction}`;
            const tag = tagByName.get(tagName);
            expect(tag, `missing generated tag ${tagName} in ${resource.jsonPath}`).toBeDefined();
            const range = getCharacterFrameRange(motion, direction);
            expect({ from: range.from, to: range.to }).toEqual({ from: tag!.from, to: tag!.to });
          }
        }
      });
    }
  });

  it('DungeonScene prioritizes manifest character sprites before side illustration fallback', () => {
    const source = readSceneSource('DungeonScene.ts');

    expect(source).toContain("from '../assets/characterSpriteManifest'");
    expect(source).toContain('getCharacterSpriteAnimationKey');
    expect(source).toContain('getCharacterFrameRange');
    expect(source).toContain('private _getPlayerClassId(): string');
    // 활성 스킨으로 해석(스킨='base'면 원본).
    expect(source).toContain('getCharacterSpriteResource(this._getPlayerClassId(), skin) ?? getCharacterSpriteResource(');
    expect(source).toContain("import { getActiveCharacterSkin } from './SettingsScene'");
    expect(source).toContain('this.load.spritesheet(playerSpriteResource.textureKey, playerSpriteResource.imagePath');
    expect(source).toContain('frameWidth: playerSpriteResource.frameWidth');
    expect(source).toContain('frameHeight: playerSpriteResource.frameHeight');
    expect(source).toContain("this.load.image('dungeon_player'");
    expect(source).toContain('this.textures.exists(playerSpriteResource.textureKey)');
    // 던전 플레이어: 정적 add.image 가 아니라 add.sprite + idle 루프.
    expect(source).toContain('this.add.sprite(PLAYER_X, py, playerSpriteResource.textureKey, 0)');
    expect(source).toContain('this._ensureCharIdleAnim(playerSpriteResource.classId)');
    expect(source).toContain('Phaser.Textures.FilterMode.NEAREST');
    expect(source).toContain("this.add.image(PLAYER_X, py, 'dungeon_player')");
    expect(source).toContain('this.add.rectangle(PLAYER_X, py, 40, 50, 0x4488ff)');
  });

  it('DungeonScene uses an Aseprite battle thumbnail before side illustration player fallback', () => {
    const source = readSceneSource('DungeonScene.ts');
    const mainSource = readFileSync(resolve(process.cwd(), 'client/src/main.ts'), 'utf8');

    expect(source).toContain('dungeonPlayerThumbnailFallbackQa?: boolean');
    expect(source).toContain('const DUNGEON_PLAYER_THUMBNAIL_TEXTURES = {');
    expect(source).toContain("key: 'char_battle_ether_knight'");
    expect(source).toContain("path: 'assets/generated/characters/class_main/battle/char_battle_ether_knight.png'");
    expect(source).toContain('function getDungeonPlayerThumbnailResource(classId: string)');
    expect(source).toContain('private dungeonPlayerThumbnailFallbackImage?: Phaser.GameObjects.Image');
    expect(source).toContain('private dungeonPlayerIllustrationFallbackRendered = false');
    expect(source).toContain('private dungeonPlayerRectangleFallbackRendered = false');
    expect(source).toContain('const playerThumbnailResource = getDungeonPlayerThumbnailResource(this._getPlayerClassId())');
    expect(source).toContain('this.load.image(playerThumbnailResource.key, playerThumbnailResource.path)');
    expect(source).toContain('this.add.image(PLAYER_X, py, playerThumbnailResource.key)');
    expect(source).toContain("setName('dungeon_player_thumbnail_fallback')");
    expect(source).toContain('this.dungeonPlayerThumbnailFallbackImage = thumbnail');
    expect(source).toContain("this.add.image(PLAYER_X, py, 'dungeon_player')");
    expect(source).toContain('this.dungeonPlayerIllustrationFallbackRendered = true');
    expect(source).toContain('this.dungeonPlayerRectangleFallbackRendered = true');
    expect(source).toContain('document.body.dataset.aeternaDungeonPlayerThumbnailFallbackQa = JSON.stringify');
    expect(source).toContain('missingDungeonPlayerThumbnailKeys');
    expect(mainSource).toContain("dungeonPlayerThumbnailFallbackQa: params.get('dungeonPlayerThumbnailFallbackQa') === '1'");
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
