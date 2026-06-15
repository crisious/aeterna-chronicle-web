import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ZONE_ENV_CONFIG } from '../../client/src/data/zoneEnvironment';
import { resolveZoneBackground } from '../../client/src/data/zoneBackgrounds';

interface SpriteRosterItem {
  category: string;
  environmentBackgroundId?: string;
  environmentTileId?: string;
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

describe('zone backgrounds', () => {
  it('주요 월드맵 지역은 현재 시간대에서 서로 다른 필드 배경 키를 가진다', () => {
    const zoneIds = [
      'aether_plains',
      'memory_forest',
      'malatus_sanctuary',
      'shadow_gorge',
      'crystal_cave',
    ];

    const backgrounds = zoneIds.map((zoneId) => resolveZoneBackground(zoneId, 'present'));

    expect(new Set(backgrounds.map((background) => background.farKey)).size).toBe(zoneIds.length);
    expect(new Set(backgrounds.map((background) => background.farPath)).size).toBe(zoneIds.length);
  });

  it('같은 지역도 시간대에 따라 텍스처 키가 달라지고 같은 필드 원본을 재사용한다', () => {
    const present = resolveZoneBackground('malatus_sanctuary', 'present');
    const future = resolveZoneBackground('malatus_sanctuary', 'ruined_future');

    expect(present.farKey).not.toBe(future.farKey);
    expect(present.farPath).toBe(future.farPath);
  });

  it('필드 배경은 탑다운 필드용 DAY 원본만 사용한다', () => {
    const zoneIds = [
      'aether_plains',
      'memory_forest',
      'malatus_sanctuary',
      'shadow_gorge',
      'crystal_cave',
    ];
    const eras = ['ancient', 'present', 'ruined_future'] as const;

    for (const zoneId of zoneIds) {
      for (const era of eras) {
        const background = resolveZoneBackground(zoneId, era);

        expect(background.phase).toBe('DAY');
        expect(background.farPath).toMatch(/-BG-FAR-DAY\.png$/);
        expect(background.skyPath).toMatch(/-BG-SKY-DAY\.png$/);
      }
    }
  });

  it('말라투스 성소는 횡스크롤형 SYL DUSK/NIGHT 대신 성소형 필드 원본을 사용한다', () => {
    const background = resolveZoneBackground('malatus_sanctuary', 'ancient');

    expect(background.prefix).toBe('TEM');
    expect(background.farPath).toBe('assets/generated/environment/backgrounds/TEM-BG-FAR-DAY.png');
  });

  it('GameScene은 지역별 고유 배경 텍스처 키를 사용한다', () => {
    const source = readFileSync(resolve(process.cwd(), 'client/src/scenes/GameScene.ts'), 'utf8');

    expect(source).not.toContain("this.load.image('zone_bg_far'");
    expect(source).not.toContain("this.load.image('zone_bg_sky'");
  });

  it('런타임 필드 배경은 Aseprite 환경 배경 로스터와 1280x720 규격을 가진다', () => {
    const roster = readSpriteRoster();
    const zoneIds = [
      'aether_plains',
      'memory_forest',
      'malatus_sanctuary',
      'shadow_gorge',
      'crystal_cave',
      'forgotten_citadel',
      'chrono_spire',
    ];
    const backgroundPaths = new Set<string>();

    for (const zoneId of zoneIds) {
      const background = resolveZoneBackground(zoneId, 'present');
      backgroundPaths.add(background.farPath);
      backgroundPaths.add(background.skyPath);
    }

    for (const scenePath of [
      'assets/generated/environment/backgrounds/ERB-BG-SKY-DUSK.png',
      'assets/generated/environment/backgrounds/ERB-BG-MID-DUSK.png',
      'assets/generated/environment/backgrounds/SYL-BG-FAR-DAY.png',
      'assets/generated/environment/backgrounds/SYL-BG-MID-DAY.png',
      'assets/generated/environment/backgrounds/ABY-BG-FAR-NIGHT.png',
      'assets/generated/environment/backgrounds/DUNGEON-BG-FAR.png',
    ]) {
      backgroundPaths.add(scenePath);
    }

    for (const assetPath of backgroundPaths) {
      const pathParts = assetPath.split('/');
      const assetId = pathParts[pathParts.length - 1]?.replace(/\.png$/, '');
      const diskPath = resolve(process.cwd(), 'client/public', assetPath);

      expect(existsSync(diskPath), assetPath).toBe(true);
      expect(readPngSize(diskPath), assetPath).toEqual({ w: 1280, h: 720 });
      expect(
        roster.some((item) => item.category === 'environmentBackground' && item.environmentBackgroundId === assetId),
        assetPath,
      ).toBe(true);
    }
  });

  it('존 지면 타일은 Aseprite 환경 타일 로스터와 256x256 규격을 가진다', () => {
    const roster = readSpriteRoster();
    const tilePaths = new Set(
      Object.values(ZONE_ENV_CONFIG)
        .map((config) => config.groundTile)
        .filter((value): value is string => typeof value === 'string'),
    );

    for (const assetPath of tilePaths) {
      const pathParts = assetPath.split('/');
      const fileName = pathParts[pathParts.length - 1] ?? '';
      const assetId = fileName.replace(/\.png$/, '');
      const diskPath = resolve(process.cwd(), 'client/public', assetPath);

      expect(existsSync(diskPath), assetPath).toBe(true);
      expect(readPngSize(diskPath), assetPath).toEqual({ w: 256, h: 256 });
      expect(
        roster.some((item) => item.category === 'environmentTile' && item.environmentTileId === assetId),
        assetPath,
      ).toBe(true);
    }
  });

  it('환경 배경 폴더 전체는 Aseprite 로스터와 1280x720 규격을 가진다', () => {
    const roster = readSpriteRoster();
    const backgroundDir = resolve(process.cwd(), 'client/public/assets/generated/environment/backgrounds');
    const backgroundIds = readPngIdsFromDir(backgroundDir);

    expect(backgroundIds.length).toBeGreaterThan(0);

    for (const assetId of backgroundIds) {
      const diskPath = resolve(backgroundDir, `${assetId}.png`);

      expect(readPngSize(diskPath), assetId).toEqual({ w: 1280, h: 720 });
      expect(
        roster.some((item) => item.category === 'environmentBackground' && item.environmentBackgroundId === assetId),
        assetId,
      ).toBe(true);
    }
  });

  it('환경 타일 폴더 전체는 Aseprite 로스터와 256x256 규격을 가진다', () => {
    const roster = readSpriteRoster();
    const tileDir = resolve(process.cwd(), 'client/public/assets/generated/environment/tiles');
    const tileIds = readPngIdsFromDir(tileDir);

    expect(tileIds.length).toBeGreaterThan(0);

    for (const assetId of tileIds) {
      const diskPath = resolve(tileDir, `${assetId}.png`);

      expect(readPngSize(diskPath), assetId).toEqual({ w: 256, h: 256 });
      expect(
        roster.some((item) => item.category === 'environmentTile' && item.environmentTileId === assetId),
        assetId,
      ).toBe(true);
    }
  });
});
