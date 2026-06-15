import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ZONE_ENV_CONFIG } from '../../client/src/data/zoneEnvironment';

interface SpriteRosterItem {
  category: string;
  runtimeKey: string;
  runtimePng: string;
  environmentObjectId?: string;
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

describe('environment object assets', () => {
  it('존 환경 오브젝트 참조는 Aseprite 로스터와 256x256 런타임 PNG를 가진다', () => {
    const roster = readSpriteRoster();
    const objectPaths = new Set(
      Object.values(ZONE_ENV_CONFIG).flatMap((config) => config.objects.map((object) => object.path)),
    );

    expect(objectPaths.size).toBe(30);

    for (const assetPath of objectPaths) {
      const pathParts = assetPath.split('/');
      const assetId = pathParts[pathParts.length - 1]?.replace(/\.png$/, '');
      const diskPath = resolve(process.cwd(), 'client/public', assetPath);

      expect(existsSync(diskPath), assetPath).toBe(true);
      expect(readPngSize(diskPath), assetPath).toEqual({ w: 256, h: 256 });
      expect(
        roster.some(
          (item) => item.category === 'environmentObject'
            && item.environmentObjectId === assetId
            && item.runtimePng === `client/public/assets/generated/environment/objects/${assetId}.png`
            && item.runtimeKey === `env_object_${assetId}`,
        ),
        assetPath,
      ).toBe(true);
    }
  });

  it('환경 오브젝트 폴더 전체는 Aseprite 로스터와 256x256 규격을 가진다', () => {
    const roster = readSpriteRoster();
    const objectDir = resolve(process.cwd(), 'client/public/assets/generated/environment/objects');
    const objectIds = readPngIdsFromDir(objectDir);

    expect(objectIds.length).toBe(30);

    for (const assetId of objectIds) {
      const diskPath = resolve(objectDir, `${assetId}.png`);

      expect(readPngSize(diskPath), assetId).toEqual({ w: 256, h: 256 });
      expect(
        roster.some(
          (item) => item.category === 'environmentObject'
            && item.environmentObjectId === assetId
            && item.runtimeKey === `env_object_${assetId}`,
        ),
        assetId,
      ).toBe(true);
    }
  });

  it('GameScene은 현재 존 환경 오브젝트를 preload하고 Aseprite 이미지로 배치한다', () => {
    const gameSceneSource = readFileSync(resolve(process.cwd(), 'client/src/scenes/GameScene.ts'), 'utf8');
    const mainSource = readFileSync(resolve(process.cwd(), 'client/src/main.ts'), 'utf8');

    expect(gameSceneSource).toContain('envObjectQa?: boolean');
    expect(gameSceneSource).toContain('const envConfig = ZONE_ENV_CONFIG[this.currentZoneId]');
    expect(gameSceneSource).toContain('this.load.image(obj.key, obj.path)');
    expect(gameSceneSource).toContain('this._placeEnvironmentObjects(worldW, worldH)');
    expect(gameSceneSource).toContain('const img = this.add.image(x, y, obj.key)');
    expect(gameSceneSource).toContain('img.setOrigin(0.5, 1)');
    expect(gameSceneSource).toContain("document.body.dataset.aeternaEnvObjectQa = JSON.stringify");
    expect(gameSceneSource).toContain("new URLSearchParams(window.location.search).get('envObjectQa') === '1'");
    expect(mainSource).toContain("envObjectQa: params.get('envObjectQa') === '1'");
  });
});
