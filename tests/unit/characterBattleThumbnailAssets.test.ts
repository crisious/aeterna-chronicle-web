import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

interface SpriteRosterItem {
  category: string;
  runtimePng: string;
  runtimeKey: string;
  characterBattleThumbnailId?: string;
  characterClassId?: string;
}

interface CharacterBattleThumbnailSpec {
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

function readThumbnailSpecs(): CharacterBattleThumbnailSpec[] {
  const runtimeDir = resolve(process.cwd(), 'client/public/assets/generated/characters/class_main/battle');

  return readdirSync(runtimeDir)
    .filter((fileName) => fileName.endsWith('.png'))
    .map((fileName) => {
      const match = /^char_battle_(.+)\.png$/u.exec(fileName);
      if (!match) {
        return null;
      }

      const id = fileName.replace(/\.png$/u, '');

      return {
        id,
        classId: match[1],
        runtimePng: `client/public/assets/generated/characters/class_main/battle/${fileName}`,
        runtimeKey: id,
      };
    })
    .filter((spec): spec is CharacterBattleThumbnailSpec => spec !== null)
    .sort((a, b) => a.id.localeCompare(b.id));
}

function expectGeneratedAtlas(spec: CharacterBattleThumbnailSpec) {
  const atlasPath = resolve(process.cwd(), `assets/generated/aseprite/characterBattleThumbnail/${spec.id}.json`);
  const atlas = JSON.parse(readFileSync(atlasPath, 'utf8')) as {
    size: { w: number; h: number };
    sprites: Array<{ w: number; h: number }>;
    tags: Array<{ name: string }>;
    count: number;
  };

  expect(atlas.size, spec.id).toEqual({ w: 64, h: 96 });
  expect(atlas.count, spec.id).toBe(1);
  expect(atlas.sprites, spec.id).toHaveLength(1);
  expect(atlas.sprites[0], spec.id).toMatchObject({ w: 64, h: 96 });
  expect(atlas.tags, spec.id).toEqual([]);
}

describe('character battle thumbnail runtime images', () => {
  it('전투 썸네일 전체는 64x96 Aseprite 로스터와 BattleScene 키로 연결된다', () => {
    const roster = readSpriteRoster();
    const specs = readThumbnailSpecs();

    expect(specs).toHaveLength(6);

    for (const spec of specs) {
      expect(readPngSize(resolve(process.cwd(), spec.runtimePng)), spec.id).toEqual({ w: 64, h: 96 });
      expectGeneratedAtlas(spec);
      expect(
        roster.some((item) => (
          item.category === 'characterBattleThumbnail'
          && item.characterBattleThumbnailId === spec.id
          && item.characterClassId === spec.classId
          && item.runtimePng === spec.runtimePng
          && item.runtimeKey === spec.runtimeKey
        )),
        spec.id,
      ).toBe(true);
    }
  });

  it('BattleScene fallback 로드는 전투 썸네일 runtime 경로를 사용한다', () => {
    const battleSceneSource = readFileSync(resolve(process.cwd(), 'client/src/scenes/BattleScene.ts'), 'utf8');

    expect(battleSceneSource).toContain('assets/generated/characters/class_main/battle/char_battle_${cid}.png');
  });
});
