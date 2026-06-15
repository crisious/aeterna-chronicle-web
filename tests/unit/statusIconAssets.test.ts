import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getAllStatusIconSpecs } from '../../client/src/data/statusIconSpecs';

interface SpriteRosterItem {
  category: string;
  runtimePng: string;
  runtimeKey: string;
  statusIconId?: string;
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

function expectGeneratedAtlas(iconId: string, generatedName: string) {
  const atlasPath = resolve(process.cwd(), `assets/generated/aseprite/statusIcon/${generatedName}.json`);
  const atlas = JSON.parse(readFileSync(atlasPath, 'utf8')) as {
    size: { w: number; h: number };
    sprites: Array<{ w: number; h: number }>;
    tags: Array<{ name: string }>;
    count: number;
  };

  expect(atlas.size, iconId).toEqual({ w: 32, h: 32 });
  expect(atlas.count, iconId).toBe(1);
  expect(atlas.sprites, iconId).toHaveLength(1);
  expect(atlas.sprites[0], iconId).toMatchObject({ w: 32, h: 32 });
  expect(atlas.tags, iconId).toEqual([]);
}

function toGeneratedName(iconId: string): string {
  return iconId.startsWith('STS-') ? iconId : `status_${iconId}`;
}

describe('status icon runtime images', () => {
  it('status icon runtime folder 전체는 Aseprite 로스터와 32x32 규격을 가진다', () => {
    const roster = readSpriteRoster();
    const specs = getAllStatusIconSpecs();
    const runtimeDir = resolve(process.cwd(), 'client/public/assets/generated/ui/icons/status');
    const runtimeFiles = readdirSync(runtimeDir)
      .filter((fileName) => fileName.endsWith('.png'))
      .sort((a, b) => a.localeCompare(b));

    expect(specs).toHaveLength(40);
    expect(runtimeFiles).toEqual(
      specs
        .map((spec) => spec.runtimePath.replace('assets/generated/ui/icons/status/', ''))
        .sort((a, b) => a.localeCompare(b)),
    );

    for (const spec of specs) {
      const runtimePng = spec.runtimePath.replace('assets/generated/', 'client/public/assets/generated/');
      const generatedName = toGeneratedName(spec.iconId);

      expect(readPngSize(resolve(process.cwd(), runtimePng)), spec.iconId).toEqual({ w: 32, h: 32 });
      expectGeneratedAtlas(spec.iconId, generatedName);
      expect(
        roster.some((item) => (
          item.category === 'statusIcon'
          && item.statusIconId === spec.iconId
          && item.runtimePng === runtimePng
          && item.runtimeKey === spec.runtimeKey
        )),
        spec.iconId,
      ).toBe(true);
    }
  });
});
