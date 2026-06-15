import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

interface SpriteRosterItem {
  category: string;
  runtimePng: string;
  runtimeKey: string;
  battleMonsterFallbackTextureId?: string;
}

interface BattleMonsterFallbackTextureSpec {
  id: string;
  category: string;
  runtimePng: string;
  runtimeKey: string;
  width: number;
  height: number;
}

const BATTLE_MONSTER_FALLBACK_TEXTURES: BattleMonsterFallbackTextureSpec[] = [
  {
    id: 'battle_monster_fallback',
    category: 'battleMonsterFallbackTexture',
    runtimePng: 'client/public/assets/generated/monsters/fallback/battle_monster_fallback.png',
    runtimeKey: 'battle_monster_fallback',
    width: 60,
    height: 60,
  },
  {
    id: 'battle_boss_fallback',
    category: 'battleMonsterBossFallbackTexture',
    runtimePng: 'client/public/assets/generated/monsters/fallback/battle_boss_fallback.png',
    runtimeKey: 'battle_boss_fallback',
    width: 90,
    height: 90,
  },
];

function readPngSize(filePath: string): { w: number; h: number } {
  const buffer = readFileSync(filePath);

  return {
    w: buffer.readUInt32BE(16),
    h: buffer.readUInt32BE(20),
  };
}

function readSpriteRoster(): SpriteRosterItem[] {
  const rosterPath = resolve(process.cwd(), 'assets/source/aseprite/sprite-production-roster.json');
  const roster = JSON.parse(readFileSync(rosterPath, 'utf8')) as { items: SpriteRosterItem[] };

  return roster.items;
}

function expectGeneratedAtlas(spec: BattleMonsterFallbackTextureSpec) {
  const atlasPath = resolve(process.cwd(), `assets/generated/aseprite/${spec.category}/${spec.id}.json`);
  const atlas = JSON.parse(readFileSync(atlasPath, 'utf8')) as {
    size: { w: number; h: number };
    sprites: Array<{ w: number; h: number }>;
    tags: Array<{ name: string }>;
    count: number;
  };

  expect(atlas.size, spec.id).toEqual({ w: spec.width, h: spec.height });
  expect(atlas.count, spec.id).toBe(1);
  expect(atlas.sprites, spec.id).toHaveLength(1);
  expect(atlas.sprites[0], spec.id).toMatchObject({ w: spec.width, h: spec.height });
  expect(atlas.tags, spec.id).toEqual([]);
}

describe('battle monster fallback runtime images', () => {
  it('전투 몬스터 fallback은 Aseprite 로스터와 BattleScene preload/render 경로를 가진다', () => {
    const roster = readSpriteRoster();
    const battleSceneSource = readFileSync(resolve(process.cwd(), 'client/src/scenes/BattleScene.ts'), 'utf8');

    for (const spec of BATTLE_MONSTER_FALLBACK_TEXTURES) {
      expect(readPngSize(resolve(process.cwd(), spec.runtimePng)), spec.id).toEqual({
        w: spec.width,
        h: spec.height,
      });
      expectGeneratedAtlas(spec);
      expect(
        roster.some((item) => (
          item.category === spec.category
          && item.battleMonsterFallbackTextureId === spec.id
          && item.runtimePng === spec.runtimePng
          && item.runtimeKey === spec.runtimeKey
        )),
        spec.id,
      ).toBe(true);
      expect(battleSceneSource).toContain(`key: '${spec.runtimeKey}'`);
      expect(battleSceneSource).toContain(`path: 'assets/generated/monsters/fallback/${spec.id}.png'`);
      expect(battleSceneSource).toContain(`displaySize: ${spec.width}`);
    }

    expect(battleSceneSource).toContain('BATTLE_MONSTER_FALLBACK_TEXTURES');
    expect(battleSceneSource).toContain('for (const texture of Object.values(BATTLE_MONSTER_FALLBACK_TEXTURES))');
    expect(battleSceneSource).toContain('this.load.image(texture.key, texture.path)');
    expect(battleSceneSource).toContain('const legacyMonsterPath = MONSTER_IMAGE_MANIFEST[cleanId]');
    expect(battleSceneSource).toContain('if (legacyMonsterPath && !this.textures.exists(texKey))');
    expect(battleSceneSource).toContain('const fallbackTexture = isBoss');
    expect(battleSceneSource).toContain('this.add.image(pos.x, pos.y, fallbackTexture.key)');
    expect(battleSceneSource).toContain('setDisplaySize(fallbackTexture.displaySize, fallbackTexture.displaySize)');
    expect(battleSceneSource).toContain('sprite.texture.setFilter(Phaser.Textures.FilterMode.NEAREST)');
    expect(battleSceneSource).toContain('Aseprite fallback 로드 실패 시에만 사용하는 안전 fallback');
    expect(battleSceneSource).toContain('gfx.generateTexture(fallbackKey, size, size)');
  });
});
