import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

interface SpriteRosterItem {
  category: string;
  runtimePng: string;
  runtimeKey: string;
  environmentParticleTextureId?: string;
}

interface EnvironmentParticleTextureSpec {
  id: string;
  category: string;
  runtimePng: string;
  runtimeKey: string;
  width: number;
  height: number;
}

const ENVIRONMENT_PARTICLE_TEXTURES: EnvironmentParticleTextureSpec[] = [
  {
    id: 'particle_rain',
    category: 'environmentParticleRainTexture',
    runtimePng: 'client/public/assets/generated/vfx/particles/particle_rain.png',
    runtimeKey: 'particle_rain',
    width: 2,
    height: 10,
  },
  {
    id: 'particle_snow',
    category: 'environmentParticleSnowTexture',
    runtimePng: 'client/public/assets/generated/vfx/particles/particle_snow.png',
    runtimeKey: 'particle_snow',
    width: 6,
    height: 10,
  },
  {
    id: 'particle_ether_beam',
    category: 'environmentParticleEtherBeamTexture',
    runtimePng: 'client/public/assets/generated/vfx/particles/particle_ether_beam.png',
    runtimeKey: 'particle_ether_beam',
    width: 6,
    height: 16,
  },
];

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

function expectGeneratedAtlas(spec: EnvironmentParticleTextureSpec) {
  const atlasPath = resolve(process.cwd(), `assets/generated/aseprite/${spec.category}/${spec.id}.json`);
  const atlas = JSON.parse(readFileSync(atlasPath, 'utf8')) as {
    size: { w: number; h: number };
    sprites: Array<{ w: number; h: number }>;
    tags: Array<{ name: string }>;
    count: number;
  };

  expect(atlas.size, spec.id).toEqual({ w: spec.width, h: spec.height });
  expect(atlas.count, spec.id).toBe(1);
  expect(atlas.sprites, spec.id).toHaveLength(1);
  expect(atlas.sprites[0], spec.id).toMatchObject({ w: spec.width, h: spec.height });
  expect(atlas.tags, spec.id).toEqual([]);
}

describe('environment particle runtime textures', () => {
  it('환경 파티클은 Aseprite 로스터와 TransitionEffects preload/render 경로를 가진다', () => {
    const roster = readSpriteRoster();
    const transitionSource = readFileSync(resolve(process.cwd(), 'client/src/scenes/TransitionEffects.ts'), 'utf8');
    const battleSceneSource = readFileSync(resolve(process.cwd(), 'client/src/scenes/BattleScene.ts'), 'utf8');

    for (const spec of ENVIRONMENT_PARTICLE_TEXTURES) {
      expect(readPngSize(resolve(process.cwd(), spec.runtimePng)), spec.id).toEqual({
        w: spec.width,
        h: spec.height,
      });
      expectGeneratedAtlas(spec);
      expect(
        roster.some((item) => (
          item.category === spec.category
          && item.environmentParticleTextureId === spec.id
          && item.runtimePng === spec.runtimePng
          && item.runtimeKey === spec.runtimeKey
        )),
        spec.id,
      ).toBe(true);
      expect(transitionSource).toContain(`key: '${spec.runtimeKey}'`);
      expect(transitionSource).toContain(`path: 'assets/generated/vfx/particles/${spec.id}.png'`);
      expect(transitionSource).toContain(`width: ${spec.width}`);
      expect(transitionSource).toContain(`height: ${spec.height}`);
    }

    expect(transitionSource).toContain('ENVIRONMENT_PARTICLE_TEXTURES');
    expect(transitionSource).toContain('preloadEnvironmentParticleTextures');
    expect(transitionSource).toContain('scene.load.image(texture.key, texture.path)');
    expect(transitionSource).toContain('const texture = ENVIRONMENT_PARTICLE_TEXTURES[type]');
    expect(transitionSource).toContain('const texKey = texture.key');
    expect(transitionSource).toContain('Aseprite particle PNG 로드 실패 시에만 사용하는 안전 fallback');
    expect(transitionSource).toContain('gfx.generateTexture(texKey, texture.width, texture.height)');
    expect(battleSceneSource).toContain("import { preloadEnvironmentParticleTextures } from './TransitionEffects'");
    expect(battleSceneSource).toContain('preloadEnvironmentParticleTextures(this)');
  });
});
