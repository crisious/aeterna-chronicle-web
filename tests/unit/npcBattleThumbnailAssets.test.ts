import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

interface SpriteRosterItem {
  category: string;
  runtimePng: string;
  runtimeKey: string;
  npcBattleThumbnailId?: string;
  npcId?: string;
}

interface NpcBattleThumbnailSpec {
  id: string;
  npcId: string;
  runtimePng: string;
  runtimeKey: string;
}

const RUNTIME_KEYS_BY_NPC_ID: Record<string, string> = {
  '01_cryo': 'npc_merchant_sprite',
  '04_mateus': 'npc_guide_sprite',
};

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

function parseNpcId(thumbnailId: string): string {
  const match = /^(.+)_sprite$/u.exec(thumbnailId);

  if (!match) {
    throw new Error(`Invalid NPC battle thumbnail id: ${thumbnailId}`);
  }

  return match[1];
}

function readThumbnailSpecs(): NpcBattleThumbnailSpec[] {
  const runtimeDir = resolve(process.cwd(), 'client/public/assets/generated/characters/npc_battle');

  return readdirSync(runtimeDir)
    .filter((fileName) => fileName.endsWith('.png'))
    .map((fileName) => {
      const id = fileName.replace(/\.png$/u, '');
      const npcId = parseNpcId(id);

      return {
        id,
        npcId,
        runtimePng: `client/public/assets/generated/characters/npc_battle/${fileName}`,
        runtimeKey: RUNTIME_KEYS_BY_NPC_ID[npcId] ?? `npc_battle_${id}`,
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

function expectGeneratedAtlas(spec: NpcBattleThumbnailSpec) {
  const atlasPath = resolve(process.cwd(), `assets/generated/aseprite/npcBattleThumbnail/${spec.id}.json`);
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

describe('NPC battle thumbnail runtime images', () => {
  it('GameScene NPC battle fallback PNG 전체는 64x96 Aseprite 로스터와 연결된다', () => {
    const roster = readSpriteRoster();
    const specs = readThumbnailSpecs();

    expect(specs).toHaveLength(2);

    for (const spec of specs) {
      expect(readPngSize(resolve(process.cwd(), spec.runtimePng)), spec.id).toEqual({ w: 64, h: 96 });
      expectGeneratedAtlas(spec);
      expect(
        roster.some((item) => (
          item.category === 'npcBattleThumbnail'
          && item.npcBattleThumbnailId === spec.id
          && item.npcId === spec.npcId
          && item.runtimePng === spec.runtimePng
          && item.runtimeKey === spec.runtimeKey
        )),
        spec.id,
      ).toBe(true);
    }
  });

  it('GameScene은 NPC battle thumbnail runtime 경로와 Phaser key를 사용한다', () => {
    const gameSceneSource = readFileSync(resolve(process.cwd(), 'client/src/scenes/GameScene.ts'), 'utf8');

    expect(gameSceneSource).toContain("this.load.image('npc_guide_sprite', 'assets/generated/characters/npc_battle/04_mateus_sprite.png')");
    expect(gameSceneSource).toContain("this.load.image('npc_merchant_sprite', 'assets/generated/characters/npc_battle/01_cryo_sprite.png')");
  });
});
