import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveZoneBackground } from '../../client/src/data/zoneBackgrounds';

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
});
