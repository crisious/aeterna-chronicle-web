import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

interface SpriteRosterItem {
  category: string;
  runtimePng: string;
  runtimeKey: string;
  npcPortraitId?: string;
  npcId?: string;
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

function parseNpcId(portraitId: string): string {
  const match = /^npc_portrait_(.+)_portrait$/u.exec(portraitId);

  if (!match) {
    throw new Error(`Invalid NPC portrait id: ${portraitId}`);
  }

  return match[1];
}

function readPortraitIds(): string[] {
  const runtimeDir = resolve(process.cwd(), 'client/public/assets/generated/characters/npc');

  return readdirSync(runtimeDir)
    .filter((fileName) => fileName.endsWith('.png'))
    .map((fileName) => fileName.replace(/\.png$/u, ''))
    .sort((a, b) => a.localeCompare(b));
}

function expectGeneratedAtlas(portraitId: string) {
  const atlasPath = resolve(process.cwd(), `assets/generated/aseprite/npcPortrait/${portraitId}.json`);
  const atlas = JSON.parse(readFileSync(atlasPath, 'utf8')) as {
    size: { w: number; h: number };
    sprites: Array<{ w: number; h: number }>;
    tags: Array<{ name: string }>;
    count: number;
  };

  expect(atlas.size, portraitId).toEqual({ w: 512, h: 512 });
  expect(atlas.count, portraitId).toBe(1);
  expect(atlas.sprites, portraitId).toHaveLength(1);
  expect(atlas.sprites[0], portraitId).toMatchObject({ w: 512, h: 512 });
  expect(atlas.tags, portraitId).toEqual([]);
}

describe('NPC portrait runtime images', () => {
  it('NPC portrait 폴더 전체는 512x512 Aseprite 로스터와 연결된다', () => {
    const roster = readSpriteRoster();
    const runtimeDir = resolve(process.cwd(), 'client/public/assets/generated/characters/npc');
    const portraitIds = readPortraitIds();

    expect(portraitIds).toHaveLength(40);

    for (const portraitId of portraitIds) {
      const npcId = parseNpcId(portraitId);
      const runtimePng = `client/public/assets/generated/characters/npc/${portraitId}.png`;

      expect(readPngSize(resolve(runtimeDir, `${portraitId}.png`)), portraitId).toEqual({ w: 512, h: 512 });
      expectGeneratedAtlas(portraitId);
      expect(
        roster.some((item) => (
          item.category === 'npcPortrait'
          && item.npcPortraitId === portraitId
          && item.npcId === npcId
          && item.runtimePng === runtimePng
          && item.runtimeKey === portraitId
        )),
        portraitId,
      ).toBe(true);
    }
  });
});
