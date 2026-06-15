import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

interface SpriteRosterItem {
  category: string;
  runtimePng: string;
  runtimeKey: string;
  characterIllustrationId?: string;
  characterClassId?: string;
  characterIllustrationView?: string;
  characterAdvancement?: number;
}

interface CharacterIllustrationSpec {
  group: 'class_main' | 'class_advanced';
  id: string;
  classId: string;
  view: string;
  advancement: number;
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

function resolveRuntimeKey(spec: Omit<CharacterIllustrationSpec, 'runtimeKey'>): string {
  if (spec.group === 'class_advanced') {
    return `char_${spec.classId}_adv${spec.advancement}`;
  }

  if (spec.view === 'front') {
    return `char_${spec.classId}`;
  }

  if (spec.view === 'side') {
    return `char_illust_${spec.classId}_side`;
  }

  return spec.id;
}

function readClassMainSpecs(): CharacterIllustrationSpec[] {
  const runtimeDir = resolve(process.cwd(), 'client/public/assets/generated/characters/class_main');

  return readdirSync(runtimeDir)
    .filter((fileName) => fileName.endsWith('.png'))
    .map((fileName) => {
      const match = /^char_illust_(.+)_(front|side|back)\.png$/u.exec(fileName);
      if (!match) {
        return null;
      }

      const baseSpec = {
        group: 'class_main' as const,
        id: fileName.replace(/\.png$/u, ''),
        classId: match[1],
        view: match[2],
        advancement: 0,
        runtimePng: `client/public/assets/generated/characters/class_main/${fileName}`,
      };

      return {
        ...baseSpec,
        runtimeKey: resolveRuntimeKey(baseSpec),
      };
    })
    .filter((spec): spec is CharacterIllustrationSpec => spec !== null)
    .sort((a, b) => a.id.localeCompare(b.id));
}

function readClassAdvancedSpecs(): CharacterIllustrationSpec[] {
  const runtimeDir = resolve(process.cwd(), 'client/public/assets/generated/characters/class_advanced');

  return readdirSync(runtimeDir)
    .filter((fileName) => fileName.endsWith('.png'))
    .map((fileName) => {
      const match = /^char_illust_(.+)_adv([1-9][0-9]*)_front\.png$/u.exec(fileName);
      if (!match) {
        return null;
      }

      const baseSpec = {
        group: 'class_advanced' as const,
        id: fileName.replace(/\.png$/u, ''),
        classId: match[1],
        view: 'front',
        advancement: Number.parseInt(match[2], 10),
        runtimePng: `client/public/assets/generated/characters/class_advanced/${fileName}`,
      };

      return {
        ...baseSpec,
        runtimeKey: resolveRuntimeKey(baseSpec),
      };
    })
    .filter((spec): spec is CharacterIllustrationSpec => spec !== null)
    .sort((a, b) => a.id.localeCompare(b.id));
}

function expectGeneratedAtlas(spec: CharacterIllustrationSpec) {
  const atlasPath = resolve(process.cwd(), `assets/generated/aseprite/characterIllustration/${spec.id}.json`);
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

describe('character illustration runtime images', () => {
  it('기본 클래스 일러스트 전체는 256x384 Aseprite 로스터와 연결된다', () => {
    const roster = readSpriteRoster();
    const specs = readClassMainSpecs();

    expect(specs).toHaveLength(18);

    for (const spec of specs) {
      expect(readPngSize(resolve(process.cwd(), spec.runtimePng)), spec.id).toEqual({ w: 256, h: 384 });
      expectGeneratedAtlas(spec);
      expect(
        roster.some((item) => (
          item.category === 'characterIllustration'
          && item.characterIllustrationId === spec.id
          && item.characterClassId === spec.classId
          && item.characterIllustrationView === spec.view
          && item.runtimePng === spec.runtimePng
          && item.runtimeKey === spec.runtimeKey
        )),
        spec.id,
      ).toBe(true);
    }
  });

  it('전직 클래스 일러스트 전체는 256x384 Aseprite 로스터와 연결된다', () => {
    const roster = readSpriteRoster();
    const specs = readClassAdvancedSpecs();

    expect(specs).toHaveLength(18);

    for (const spec of specs) {
      expect(readPngSize(resolve(process.cwd(), spec.runtimePng)), spec.id).toEqual({ w: 256, h: 384 });
      expectGeneratedAtlas(spec);
      expect(
        roster.some((item) => (
          item.category === 'characterIllustration'
          && item.characterIllustrationId === spec.id
          && item.characterClassId === spec.classId
          && item.characterIllustrationView === spec.view
          && item.characterAdvancement === spec.advancement
          && item.runtimePng === spec.runtimePng
          && item.runtimeKey === spec.runtimeKey
        )),
        spec.id,
      ).toBe(true);
    }
  });
});
