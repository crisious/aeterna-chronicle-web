import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

interface SpriteRosterItem {
  category: string;
  runtimeKey: string;
  runtimePng: string;
  requiredTags: string[];
  vfxId?: string;
}

interface VfxTarget {
  groupId: string;
  runtimeSubdir: string;
  vfxId: string;
  runtimeKey: string;
}

interface NormalizedVfxJson {
  size: { w: number; h: number };
  sprites: unknown[];
  tags: Array<{ name: string; from: number; to: number }>;
  count: number;
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

function createRuntimeKey(groupId: string, vfxId: string): string {
  const number = vfxId.match(/-(\d{3})$/)?.[1];

  if (!number) {
    throw new Error(`Invalid VFX id: ${vfxId}`);
  }

  return groupId === 'common' ? `vfx_common_${number}` : `vfx_${groupId}_${number}`;
}

function readRuntimeTargets(): VfxTarget[] {
  const runtimeRoot = resolve(process.cwd(), 'client/public/assets/generated/vfx');
  const targets: VfxTarget[] = [];

  for (const fileName of readdirSync(resolve(runtimeRoot, 'common'))) {
    if (!fileName.endsWith('.png')) continue;
    const vfxId = fileName.replace(/\.png$/, '');
    targets.push({
      groupId: 'common',
      runtimeSubdir: 'common',
      vfxId,
      runtimeKey: createRuntimeKey('common', vfxId),
    });
  }

  const skillsRoot = resolve(runtimeRoot, 'skills');
  for (const classId of readdirSync(skillsRoot)) {
    for (const fileName of readdirSync(resolve(skillsRoot, classId))) {
      if (!fileName.endsWith('.png')) continue;
      const vfxId = fileName.replace(/\.png$/, '');
      targets.push({
        groupId: classId,
        runtimeSubdir: `skills/${classId}`,
        vfxId,
        runtimeKey: createRuntimeKey(classId, vfxId),
      });
    }
  }

  return targets.sort((a, b) => a.runtimeSubdir.localeCompare(b.runtimeSubdir) || a.vfxId.localeCompare(b.vfxId));
}

describe('VFX library assets', () => {
  it('preload VFX runtime folders contain 210 Aseprite-backed 512x64 strips', () => {
    const roster = readSpriteRoster();
    const targets = readRuntimeTargets();

    expect(targets).toHaveLength(210);

    for (const target of targets) {
      const runtimePng = `client/public/assets/generated/vfx/${target.runtimeSubdir}/${target.vfxId}.png`;
      const generatedJson = resolve(process.cwd(), `assets/generated/aseprite/vfx/${target.vfxId}.json`);
      const runtimePath = resolve(process.cwd(), runtimePng);

      expect(existsSync(runtimePath), runtimePng).toBe(true);
      expect(readPngSize(runtimePath), runtimePng).toEqual({ w: 512, h: 64 });
      expect(
        roster.some(
          (item) => item.category === 'vfx'
            && item.vfxId === target.vfxId
            && item.runtimePng === runtimePng
            && item.runtimeKey === target.runtimeKey
            && item.requiredTags.join(',') === 'start,loop,end',
        ),
        runtimePng,
      ).toBe(true);
      expect(existsSync(generatedJson), target.vfxId).toBe(true);
    }
  });

  it('generated VFX JSON keeps eight frames and required animation tags', () => {
    for (const target of readRuntimeTargets()) {
      const generatedJson = resolve(process.cwd(), `assets/generated/aseprite/vfx/${target.vfxId}.json`);
      const atlas = JSON.parse(readFileSync(generatedJson, 'utf8')) as NormalizedVfxJson;

      expect(atlas.size, target.vfxId).toEqual({ w: 512, h: 64 });
      expect(atlas.count, target.vfxId).toBe(8);
      expect(atlas.sprites, target.vfxId).toHaveLength(8);
      expect(atlas.tags.map((tag) => [tag.name, tag.from, tag.to]), target.vfxId).toEqual([
        ['start', 0, 1],
        ['loop', 2, 5],
        ['end', 6, 7],
      ]);
    }
  });
});
