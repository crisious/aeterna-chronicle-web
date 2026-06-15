import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

interface SpriteRosterItem {
  category: string;
  runtimePng: string;
  runtimeKey: string;
  effectFallbackTextureId?: string;
}

interface EffectFallbackTextureSpec {
  id: string;
  category: string;
  runtimePng: string;
  runtimeKey: string;
  width: number;
  height: number;
}

const EFFECT_FALLBACK_TEXTURES: EffectFallbackTextureSpec[] = [
  {
    id: 'hit_fallback_slash',
    category: 'effectFallbackTexture',
    runtimePng: 'client/public/assets/generated/vfx/fallback/hit_fallback_slash.png',
    runtimeKey: 'hit_fallback_slash',
    width: 32,
    height: 32,
  },
  {
    id: 'hit_fallback_blunt',
    category: 'effectFallbackTexture',
    runtimePng: 'client/public/assets/generated/vfx/fallback/hit_fallback_blunt.png',
    runtimeKey: 'hit_fallback_blunt',
    width: 32,
    height: 32,
  },
  {
    id: 'hit_fallback_magic',
    category: 'effectFallbackTexture',
    runtimePng: 'client/public/assets/generated/vfx/fallback/hit_fallback_magic.png',
    runtimeKey: 'hit_fallback_magic',
    width: 32,
    height: 32,
  },
  {
    id: 'buff_fallback',
    category: 'effectFallbackTextureSmall',
    runtimePng: 'client/public/assets/generated/vfx/fallback/buff_fallback.png',
    runtimeKey: 'buff_fallback',
    width: 24,
    height: 24,
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

function expectGeneratedAtlas(spec: EffectFallbackTextureSpec) {
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

describe('effect fallback texture runtime images', () => {
  it('전투 이펙트 fallback은 Aseprite 로스터와 BattleScene preload 경로를 가진다', () => {
    const roster = readSpriteRoster();
    const effectManagerSource = readFileSync(resolve(process.cwd(), 'client/src/effects/EffectManager.ts'), 'utf8');
    const battleSceneSource = readFileSync(resolve(process.cwd(), 'client/src/scenes/BattleScene.ts'), 'utf8');

    for (const spec of EFFECT_FALLBACK_TEXTURES) {
      expect(readPngSize(resolve(process.cwd(), spec.runtimePng)), spec.id).toEqual({
        w: spec.width,
        h: spec.height,
      });
      expectGeneratedAtlas(spec);
      expect(
        roster.some((item) => (
          item.category === spec.category
          && item.effectFallbackTextureId === spec.id
          && item.runtimePng === spec.runtimePng
          && item.runtimeKey === spec.runtimeKey
        )),
        spec.id,
      ).toBe(true);
      expect(effectManagerSource).toContain(`key: '${spec.runtimeKey}'`);
      expect(effectManagerSource).toContain(`/vfx/fallback/${spec.id}.png`);
    }

    expect(battleSceneSource).toContain('EFFECT_FALLBACK_TEXTURES');
    expect(battleSceneSource).toContain('this.load.image(texture.key, texture.path)');
    expect(effectManagerSource).toContain('missingHitTypes');
    expect(effectManagerSource).toContain('needsBuffFallback');
    expect(effectManagerSource).toContain('g.generateTexture(key, 32, 32)');
    expect(effectManagerSource).toContain("g.generateTexture('buff_fallback', 24, 24)");
  });
});
