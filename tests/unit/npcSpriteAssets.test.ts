import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

interface SpriteRosterItem {
  category: string;
  runtimePng: string;
  runtimeKey: string;
  npcSpriteId?: string;
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

function parseNpcId(spriteId: string): string {
  const match = /^(.+)_sprite$/u.exec(spriteId);

  if (!match) {
    throw new Error(`Invalid NPC sprite id: ${spriteId}`);
  }

  return match[1];
}

function readSpriteIds(): string[] {
  const runtimeDir = resolve(process.cwd(), 'client/public/assets/generated/characters/npc_sprites');

  return readdirSync(runtimeDir)
    .filter((fileName) => /^[0-9]{2}_.+_sprite\.png$/u.test(fileName))
    .filter((fileName) => {
      const size = readPngSize(resolve(runtimeDir, fileName));

      return size.w === 256 && size.h === 384;
    })
    .map((fileName) => fileName.replace(/\.png$/u, ''))
    .sort((a, b) => a.localeCompare(b));
}

function expectGeneratedAtlas(spriteId: string) {
  const atlasPath = resolve(process.cwd(), `assets/generated/aseprite/npcSprite/${spriteId}.json`);
  const atlas = JSON.parse(readFileSync(atlasPath, 'utf8')) as {
    size: { w: number; h: number };
    sprites: Array<{ w: number; h: number }>;
    tags: Array<{ name: string }>;
    count: number;
  };

  expect(atlas.size, spriteId).toEqual({ w: 256, h: 384 });
  expect(atlas.count, spriteId).toBe(1);
  expect(atlas.sprites, spriteId).toHaveLength(1);
  expect(atlas.sprites[0], spriteId).toMatchObject({ w: 256, h: 384 });
  expect(atlas.tags, spriteId).toEqual([]);
}

describe('NPC sprite runtime images', () => {
  it('NPC 256x384 sprite 세트 전체는 Aseprite 로스터와 연결된다', () => {
    const roster = readSpriteRoster();
    const runtimeDir = resolve(process.cwd(), 'client/public/assets/generated/characters/npc_sprites');
    const spriteIds = readSpriteIds();

    expect(spriteIds).toHaveLength(40);

    for (const spriteId of spriteIds) {
      const npcId = parseNpcId(spriteId);
      const runtimePng = `client/public/assets/generated/characters/npc_sprites/${spriteId}.png`;

      expect(readPngSize(resolve(runtimeDir, `${spriteId}.png`)), spriteId).toEqual({ w: 256, h: 384 });
      expectGeneratedAtlas(spriteId);
      expect(
        roster.some((item) => (
          item.category === 'npcSprite'
          && item.npcSpriteId === spriteId
          && item.npcId === npcId
          && item.runtimePng === runtimePng
          && item.runtimeKey === spriteId
        )),
        spriteId,
      ).toBe(true);
    }
  });
});
