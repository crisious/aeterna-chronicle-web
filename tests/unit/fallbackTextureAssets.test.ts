import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

interface SpriteRosterItem {
  category: string;
  runtimePng: string;
  runtimeKey: string;
  fallbackTextureId?: string;
}

interface FallbackTextureSpec {
  id: string;
  category: string;
  runtimePng: string;
  runtimeKey: string;
  width: number;
  height: number;
}

const FALLBACK_TEXTURES: FallbackTextureSpec[] = [
  {
    id: 'placeholder',
    category: 'fallbackTexture',
    runtimePng: 'client/public/assets/generated/ui/placeholders/placeholder.png',
    runtimeKey: 'placeholder',
    width: 64,
    height: 64,
  },
  {
    id: 'placeholder_sm',
    category: 'fallbackTextureSmall',
    runtimePng: 'client/public/assets/generated/ui/placeholders/placeholder_sm.png',
    runtimeKey: 'placeholder_sm',
    width: 32,
    height: 32,
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

function expectGeneratedAtlas(spec: FallbackTextureSpec) {
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

describe('fallback texture runtime images', () => {
  it('공용 placeholder texture는 Aseprite 로스터와 AssetManager 경로를 가진다', () => {
    const roster = readSpriteRoster();
    const assetManagerSource = readFileSync(resolve(process.cwd(), 'client/src/assets/AssetManager.ts'), 'utf8');

    for (const spec of FALLBACK_TEXTURES) {
      expect(readPngSize(resolve(process.cwd(), spec.runtimePng)), spec.id).toEqual({
        w: spec.width,
        h: spec.height,
      });
      expectGeneratedAtlas(spec);
      expect(
        roster.some((item) => (
          item.category === spec.category
          && item.fallbackTextureId === spec.id
          && item.runtimePng === spec.runtimePng
          && item.runtimeKey === spec.runtimeKey
        )),
        spec.id,
      ).toBe(true);
      expect(assetManagerSource).toContain(`key: '${spec.runtimeKey}'`);
      expect(assetManagerSource).toContain(`/ui/placeholders/${spec.id}.png`);
    }

    expect(assetManagerSource).toContain('this._loadImage(texture.key, texture.path)');
    expect(assetManagerSource).toContain('this._ensureProceduralPlaceholders()');
  });
});
