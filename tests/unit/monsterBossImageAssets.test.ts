import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

interface SpriteRosterItem {
  category: string;
  runtimePng: string;
  runtimeKey: string;
  monsterEliteBossId?: string;
  monsterRaidBossId?: string;
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

function readPngIdsFromDir(dirPath: string): string[] {
  return readdirSync(dirPath)
    .filter((fileName) => fileName.endsWith('.png'))
    .map((fileName) => fileName.replace(/\.png$/, ''))
    .sort((a, b) => a.localeCompare(b));
}

describe('monster boss runtime images', () => {
  it('elite boss 폴더 전체는 Aseprite 로스터와 384x384 규격을 가진다', () => {
    const roster = readSpriteRoster();
    const runtimeDir = resolve(process.cwd(), 'client/public/assets/generated/monsters/elite_boss');
    const bossIds = readPngIdsFromDir(runtimeDir);

    expect(bossIds.length).toBe(70);

    for (const bossId of bossIds) {
      const runtimePng = `client/public/assets/generated/monsters/elite_boss/${bossId}.png`;

      expect(readPngSize(resolve(runtimeDir, `${bossId}.png`)), bossId).toEqual({ w: 384, h: 384 });
      expect(
        roster.some((item) => (
          item.category === 'monsterEliteBossPortrait'
          && item.monsterEliteBossId === bossId
          && item.runtimePng === runtimePng
          && item.runtimeKey === `monster_elite_boss_${bossId}`
        )),
        bossId,
      ).toBe(true);
    }
  });

  it('raid boss 폴더 전체는 Aseprite 로스터와 512x512 규격을 가진다', () => {
    const roster = readSpriteRoster();
    const runtimeDir = resolve(process.cwd(), 'client/public/assets/generated/monsters/raid_boss');
    const bossIds = readPngIdsFromDir(runtimeDir);

    expect(bossIds.length).toBe(38);

    for (const bossId of bossIds) {
      const runtimePng = `client/public/assets/generated/monsters/raid_boss/${bossId}.png`;

      expect(readPngSize(resolve(runtimeDir, `${bossId}.png`)), bossId).toEqual({ w: 512, h: 512 });
      expect(
        roster.some((item) => (
          item.category === 'monsterRaidBossPortrait'
          && item.monsterRaidBossId === bossId
          && item.runtimePng === runtimePng
          && item.runtimeKey === `monster_raid_boss_${bossId}`
        )),
        bossId,
      ).toBe(true);
    }
  });
});
