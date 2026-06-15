import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

interface SpriteRosterItem {
  category: string;
  runtimePng: string;
  runtimeKey: string;
  skillIconId?: string;
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

describe('skill icon assets', () => {
  it('AssetManager 공용 스킬 아이콘 210개는 Aseprite 로스터와 64x64 규격을 가진다', () => {
    const roster = readSpriteRoster();

    for (let index = 1; index <= 210; index += 1) {
      const padded = String(index).padStart(3, '0');
      const skillIconId = `CMN-SKL-${padded}`;
      const runtimePng = `client/public/assets/generated/ui/icons/skills/${skillIconId}.png`;
      const diskPath = resolve(process.cwd(), runtimePng);

      expect(readPngSize(diskPath), skillIconId).toEqual({ w: 64, h: 64 });
      expect(
        roster.some((item) => (
          item.category === 'skillIcon'
          && item.skillIconId === skillIconId
          && item.runtimePng === runtimePng
          && item.runtimeKey === `icon_skill_${padded}`
        )),
        skillIconId,
      ).toBe(true);
    }
  });

  it('스킬 아이콘 런타임 폴더 전체는 Aseprite 로스터와 64x64 규격을 가진다', () => {
    const roster = readSpriteRoster();
    const runtimeDir = resolve(process.cwd(), 'client/public/assets/generated/ui/icons/skills');
    const runtimeFiles = readdirSync(runtimeDir)
      .filter((fileName) => fileName.endsWith('.png'))
      .sort((a, b) => a.localeCompare(b));

    expect(runtimeFiles.length).toBe(424);

    for (const fileName of runtimeFiles) {
      const skillIconId = fileName.replace(/\.png$/, '');
      const runtimePng = `client/public/assets/generated/ui/icons/skills/${fileName}`;

      expect(readPngSize(resolve(runtimeDir, fileName)), skillIconId).toEqual({ w: 64, h: 64 });
      expect(
        roster.some((item) => (
          item.category === 'skillIcon'
          && item.skillIconId === skillIconId
          && item.runtimePng === runtimePng
        )),
        skillIconId,
      ).toBe(true);
    }
  });
});
