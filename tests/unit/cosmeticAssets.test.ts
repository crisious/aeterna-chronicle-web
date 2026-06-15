import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  createCosmeticRuntimeKey,
  getAllCosmeticAssetSpecs,
  type CosmeticSeason,
} from '../../client/src/data/cosmeticAssetSpecs';

interface SpriteRosterItem {
  category: string;
  runtimeKey: string;
  runtimePng: string;
  cosmeticId?: string;
  cosmeticSeason?: number;
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

function readRuntimeIdsBySeason(season: CosmeticSeason): string[] {
  const dir = resolve(process.cwd(), `client/public/assets/generated/cosmetics/season${season}`);

  return readdirSync(dir)
    .filter((fileName) => fileName.endsWith('.png'))
    .map((fileName) => fileName.replace(/\.png$/, ''))
    .sort((a, b) => a.localeCompare(b));
}

describe('cosmetic assets', () => {
  it('cosmetic preload SSOT는 runtime 폴더 150개 파일과 정확히 일치한다', () => {
    const specs = getAllCosmeticAssetSpecs();

    expect(specs).toHaveLength(150);
    expect(new Set(specs.map((spec) => spec.runtimeKey)).size).toBe(150);
    expect(new Set(specs.map((spec) => spec.runtimePath)).size).toBe(150);

    for (const season of [1, 2, 3] as const) {
      const expectedIds = specs
        .filter((spec) => spec.season === season)
        .map((spec) => spec.cosmeticId)
        .sort((a, b) => a.localeCompare(b));

      expect(expectedIds).toEqual(readRuntimeIdsBySeason(season));
    }
  });

  it('cosmetic runtime PNG는 512x512이고 Aseprite 로스터와 연결된다', () => {
    const roster = readSpriteRoster();

    for (const spec of getAllCosmeticAssetSpecs()) {
      const runtimePng = `client/public/${spec.runtimePath}`;
      const diskPath = resolve(process.cwd(), runtimePng);

      expect(existsSync(diskPath), spec.runtimePath).toBe(true);
      expect(readPngSize(diskPath), spec.runtimePath).toEqual({ w: 512, h: 512 });
      expect(spec.runtimeKey).toBe(createCosmeticRuntimeKey(spec.season, spec.cosmeticId));
      expect(
        roster.some(
          (item) => item.category === 'cosmetic'
            && item.cosmeticId === spec.cosmeticId
            && item.cosmeticSeason === spec.season
            && item.runtimePng === runtimePng
            && item.runtimeKey === spec.runtimeKey,
        ),
        spec.runtimePath,
      ).toBe(true);
    }
  });
});
