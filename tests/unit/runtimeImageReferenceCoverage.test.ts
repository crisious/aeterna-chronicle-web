import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path, { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

interface SpriteRosterItem {
  runtimePng?: string;
}

interface CharacterSpriteRosterItem {
  runtimePng?: string;
}

interface ImageReference {
  filePath: string;
  assetPath: string;
}

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.json', '.css', '.html']);
const IMAGE_PATH_PATTERN = /(?:^|["'`(=:,\s])((?:\/)?assets\/[^"'`),\s]+?\.(?:png|jpe?g|webp))/giu;

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/gu, '/');
}

function collectSourceFiles(directory: string): string[] {
  const files: string[] = [];

  for (const fileName of readdirSync(directory)) {
    const filePath = path.join(directory, fileName);
    const stats = statSync(filePath);

    if (stats.isDirectory()) {
      files.push(...collectSourceFiles(filePath));
      continue;
    }

    if (SOURCE_EXTENSIONS.has(path.extname(fileName))) {
      files.push(filePath);
    }
  }

  return files.sort();
}

function stripComments(content: string, extension: string): string {
  if (extension === '.json') {
    return content;
  }

  return content
    .replace(/\/\*[\s\S]*?\*\//gu, '')
    .replace(/(^|[^:])\/\/.*$/gmu, '$1');
}

function extractImageReferences(filePath: string): ImageReference[] {
  const extension = path.extname(filePath);
  const content = stripComments(readFileSync(filePath, 'utf8'), extension);
  const references: ImageReference[] = [];
  let match: RegExpExecArray | null;

  IMAGE_PATH_PATTERN.lastIndex = 0;
  while ((match = IMAGE_PATH_PATTERN.exec(content)) !== null) {
    const assetPath = match[1].replace(/^\/+/u, '');

    if (!assetPath.includes('${')) {
      references.push({
        filePath: normalizePath(path.relative(process.cwd(), filePath)),
        assetPath,
      });
    }
  }

  return references;
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

function isDerivedOrExportMirror(assetPath: string): boolean {
  return (
    assetPath.startsWith('assets/atlas/')
    || assetPath.startsWith('assets/generated/atlas/')
    || assetPath.startsWith('assets/generated/aseprite/')
  );
}

describe('runtime image reference coverage', () => {
  it('client source/data image literals resolve to public files and Aseprite-backed runtime entries', () => {
    const sourceFiles = collectSourceFiles(resolve(process.cwd(), 'client/src'));
    const references = sourceFiles.flatMap(extractImageReferences);
    const uniqueReferences = Array.from(
      new Map(references.map((reference) => [`${reference.filePath}:${reference.assetPath}`, reference])).values(),
    );
    const rosterRuntimePngs = new Set([
      ...readSpriteRosterRuntimePngs(),
      ...readCharacterRosterRuntimePngs(),
    ]);
    const missingFiles: ImageReference[] = [];
    const uncoveredReferences: ImageReference[] = [];

    expect(uniqueReferences.length).toBeGreaterThan(0);

    for (const reference of uniqueReferences) {
      const publicPath = normalizePath(`client/public/${reference.assetPath}`);

      if (!existsSync(resolve(process.cwd(), publicPath))) {
        missingFiles.push(reference);
        continue;
      }

      if (!isDerivedOrExportMirror(reference.assetPath) && !rosterRuntimePngs.has(publicPath)) {
        uncoveredReferences.push(reference);
      }
    }

    expect(missingFiles).toEqual([]);
    expect(uncoveredReferences).toEqual([]);
  });
});
