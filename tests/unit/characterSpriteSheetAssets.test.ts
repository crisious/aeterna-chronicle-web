import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

interface SpriteRosterItem {
  category: string;
  runtimePng: string;
  runtimeKey: string;
  characterSpriteSheetId?: string;
  characterClassId?: string;
}

interface CharacterSpriteSheetSpec {
  id: string;
  classId: string;
  runtimePng: string;
  runtimeKey: string;
}

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

function readCharacterSpriteSheetSpecs(): CharacterSpriteSheetSpec[] {
  const runtimeDir = resolve(process.cwd(), 'client/public/assets/generated/characters/sprites');

  return readdirSync(runtimeDir)
    .filter((fileName) => /^char_sprite_.+_sprite_sheet\.png$/u.test(fileName))
    .map((fileName) => {
      const match = /^char_sprite_(.+)_(base|adv[1-9][0-9]*|2nd|3rd|4th)_sprite_sheet\.png$/u.exec(fileName);
      if (!match) {
        return null;
      }

      const id = fileName.replace(/\.png$/u, '');

      return {
        id,
        classId: match[1],
        runtimePng: `client/public/assets/generated/characters/sprites/${fileName}`,
        runtimeKey: id,
      };
    })
    .filter((spec): spec is CharacterSpriteSheetSpec => spec !== null)
    .sort((a, b) => a.id.localeCompare(b.id));
}

function expectGeneratedAtlas(spec: CharacterSpriteSheetSpec) {
  const atlasPath = resolve(process.cwd(), `assets/generated/aseprite/characterSpriteSheet/${spec.id}.json`);
  const atlas = JSON.parse(readFileSync(atlasPath, 'utf8')) as {
    size: { w: number; h: number };
    sprites: Array<{ w: number; h: number }>;
    tags: Array<{ name: string }>;
    count: number;
  };

  expect(atlas.size, spec.id).toEqual({ w: 256, h: 384 });
  expect(atlas.count, spec.id).toBe(1);
  expect(atlas.sprites, spec.id).toHaveLength(1);
  expect(atlas.sprites[0], spec.id).toMatchObject({ w: 256, h: 384 });
  expect(atlas.tags, spec.id).toEqual([]);
}

describe('character legacy sprite sheet runtime images', () => {
  it('legacy character sprite_sheet PNG 전체는 Aseprite 로스터와 256x384 규격을 가진다', () => {
    const roster = readSpriteRoster();
    const specs = readCharacterSpriteSheetSpecs();

    expect(specs).toHaveLength(24);

    for (const spec of specs) {
      expect(readPngSize(resolve(process.cwd(), spec.runtimePng)), spec.id).toEqual({ w: 256, h: 384 });
      expectGeneratedAtlas(spec);
      expect(
        roster.some((item) => (
          item.category === 'characterSpriteSheet'
          && item.characterSpriteSheetId === spec.id
          && item.characterClassId === spec.classId
          && item.runtimePng === spec.runtimePng
          && item.runtimeKey === spec.runtimeKey
        )),
        spec.id,
      ).toBe(true);
    }
  });
});
