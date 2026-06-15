import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

interface SpriteRosterItem {
  category: string;
  runtimePng: string;
  runtimeKey: string;
  storyCgId?: string;
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

function readStoryCgRuntimeFiles(): string[] {
  const root = resolve(process.cwd(), 'client/public/assets/cg');
  const chapterDir = join(root, 'chapters');
  const rootFiles = readdirSync(root)
    .filter((fileName) => fileName.endsWith('.png'))
    .map((fileName) => fileName);
  const chapterFiles = readdirSync(chapterDir)
    .filter((fileName) => fileName.endsWith('.png'))
    .map((fileName) => `chapters/${fileName}`);

  return [...rootFiles, ...chapterFiles].sort((a, b) => a.localeCompare(b));
}

describe('story CG runtime images', () => {
  it('CG 폴더 전체는 Aseprite 로스터와 1216x832 규격을 가진다', () => {
    const roster = readSpriteRoster();
    const sourceFiles = [
      readFileSync(resolve(process.cwd(), 'client/src/scenes/GameScene.ts'), 'utf8'),
      readFileSync(resolve(process.cwd(), 'client/src/scenes/EndingScene.ts'), 'utf8'),
    ].join('\n');
    const runtimeFiles = readStoryCgRuntimeFiles();

    expect(runtimeFiles).toEqual([
      'chapters/ch1_erebos.png',
      'chapters/ch2_sylvanheim.png',
      'chapters/ch3_solaris.png',
      'chapters/ch4_argentium.png',
      'chapters/ch5_plateau.png',
      'defeat_oblivion.png',
      'ending_a_guardian.png',
      'ending_b_witness.png',
      'ending_c_oblivion.png',
      'ending_d_return.png',
    ]);

    for (const relativeFile of runtimeFiles) {
      const storyCgId = relativeFile.replace(/^chapters\//u, '').replace(/\.png$/u, '');
      const runtimePng = `client/public/assets/cg/${relativeFile}`;
      const runtimePath = resolve(process.cwd(), runtimePng);

      expect(existsSync(runtimePath), relativeFile).toBe(true);
      expect(readPngSize(runtimePath), relativeFile).toEqual({ w: 1216, h: 832 });
      expect(sourceFiles.includes(`assets/cg/${relativeFile}`), relativeFile).toBe(true);
      expect(
        roster.some((item) => (
          item.category === 'storyCg'
          && item.storyCgId === storyCgId
          && item.runtimePng === runtimePng
          && item.runtimeKey === `story_cg_${storyCgId}`
        )),
        relativeFile,
      ).toBe(true);
    }
  });
});
