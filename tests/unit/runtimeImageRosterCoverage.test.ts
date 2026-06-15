import { readdirSync, readFileSync, statSync } from 'node:fs';
import path, { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

interface SpriteRosterItem {
  runtimePng?: string;
}

interface CharacterSpriteRosterItem {
  runtimePng?: string;
}

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/gu, '/');
}

function collectImageFiles(directory: string): string[] {
  const files: string[] = [];

  for (const fileName of readdirSync(directory)) {
    const filePath = path.join(directory, fileName);
    const stats = statSync(filePath);

    if (stats.isDirectory()) {
      files.push(...collectImageFiles(filePath));
      continue;
    }

    if (/\.(png|jpe?g|webp)$/iu.test(fileName)) {
      files.push(normalizePath(path.relative(process.cwd(), filePath)));
    }
  }

  return files.sort();
}

function readSpriteRosterRuntimePngs(): string[] {
  const rosterPath = resolve(process.cwd(), 'assets/source/aseprite/sprite-production-roster.json');
  const roster = JSON.parse(readFileSync(rosterPath, 'utf8')) as { items: SpriteRosterItem[] };

  return roster.items
    .map((item) => item.runtimePng)
    .filter((runtimePng): runtimePng is string => Boolean(runtimePng))
    .map(normalizePath);
}

function readCharacterRosterRuntimePngs(): string[] {
  const rosterPath = resolve(process.cwd(), 'assets/source/aseprite/character/character-sprite-roster.json');
  const roster = JSON.parse(readFileSync(rosterPath, 'utf8')) as { characters: CharacterSpriteRosterItem[] };

  return roster.characters
    .map((item) => item.runtimePng)
    .filter((runtimePng): runtimePng is string => Boolean(runtimePng))
    .map(normalizePath);
}

function isDerivedOrExportMirror(filePath: string): boolean {
  return (
    filePath.startsWith('client/public/assets/atlas/')
    || filePath.startsWith('client/public/assets/generated/atlas/')
    || filePath.startsWith('client/public/assets/generated/aseprite/')
    // 리컬러 코스메틱(Phase D Part②)은 base 스프라이트의 팔레트 스왑 파생물로
    // Aseprite 소스가 없어 source roster 모델에 안 맞는다. atlas 처럼 derived 로 제외.
    || filePath.startsWith('client/public/assets/generated/characters/recolors/')
  );
}

describe('public runtime image roster coverage', () => {
  it('atlas 파생물과 export mirror를 제외한 public runtime 이미지는 Aseprite roster에 연결되어 있다', () => {
    const publicImages = collectImageFiles(resolve(process.cwd(), 'client/public/assets'));
    const rosterRuntimePngs = new Set([
      ...readSpriteRosterRuntimePngs(),
      ...readCharacterRosterRuntimePngs(),
    ]);
    const uncovered = publicImages.filter((filePath) => !isDerivedOrExportMirror(filePath) && !rosterRuntimePngs.has(filePath));

    expect(uncovered).toEqual([]);
  });
});
