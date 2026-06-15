import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

interface SpriteRosterItem {
  category: string;
  runtimePng: string;
  runtimeKey: string;
  monsterPortraitId?: string;
  monsterBattleIconId?: string;
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

describe('monster single-frame runtime images', () => {
  it('normal 몬스터 초상화 폴더 전체는 Aseprite 로스터와 256x256 규격을 가진다', () => {
    const roster = readSpriteRoster();
    const runtimeDir = resolve(process.cwd(), 'client/public/assets/generated/monsters/normal');
    const monsterIds = readPngIdsFromDir(runtimeDir);

    expect(monsterIds.length).toBe(120);

    for (const monsterId of monsterIds) {
      const runtimePng = `client/public/assets/generated/monsters/normal/${monsterId}.png`;

      expect(readPngSize(resolve(runtimeDir, `${monsterId}.png`)), monsterId).toEqual({ w: 256, h: 256 });
      expect(
        roster.some((item) => (
          item.category === 'monsterPortrait'
          && item.monsterPortraitId === monsterId
          && item.runtimePng === runtimePng
          && item.runtimeKey === `monster_portrait_${monsterId}`
        )),
        monsterId,
      ).toBe(true);
    }
  });

  it('battle 몬스터 아이콘 폴더 전체는 Aseprite 로스터와 64x64 규격을 가진다', () => {
    const roster = readSpriteRoster();
    const runtimeDir = resolve(process.cwd(), 'client/public/assets/generated/monsters/battle');
    const monsterIds = readPngIdsFromDir(runtimeDir);

    expect(monsterIds.length).toBe(120);

    for (const monsterId of monsterIds) {
      const runtimePng = `client/public/assets/generated/monsters/battle/${monsterId}.png`;

      expect(readPngSize(resolve(runtimeDir, `${monsterId}.png`)), monsterId).toEqual({ w: 64, h: 64 });
      expect(
        roster.some((item) => (
          item.category === 'monsterBattleIcon'
          && item.monsterBattleIconId === monsterId
          && item.runtimePng === runtimePng
          && item.runtimeKey === `monster_battle_icon_${monsterId}`
        )),
        monsterId,
      ).toBe(true);
    }
  });

  it('normal과 battle 몬스터 이미지 ID 집합은 동일하다', () => {
    const normalDir = resolve(process.cwd(), 'client/public/assets/generated/monsters/normal');
    const battleDir = resolve(process.cwd(), 'client/public/assets/generated/monsters/battle');

    expect(readPngIdsFromDir(battleDir)).toEqual(readPngIdsFromDir(normalDir));
  });
});
