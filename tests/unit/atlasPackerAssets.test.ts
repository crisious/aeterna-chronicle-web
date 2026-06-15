import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '../..');
const GENERATED_ROOT = path.join(ROOT, 'assets/generated');
const GENERATED_ATLAS_DIR = path.join(GENERATED_ROOT, 'atlas');
const PUBLIC_ATLAS_DIR = path.join(ROOT, 'client/public/assets/atlas');

interface AtlasSprite {
  file: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface RuntimeAtlas {
  atlas: string;
  size: { w: number; h: number };
  sprites: AtlasSprite[];
  count: number;
}

interface TexturePackerFrame {
  frame: { x: number; y: number; w: number; h: number };
  rotated: boolean;
  trimmed: boolean;
  spriteSourceSize: { x: number; y: number; w: number; h: number };
  sourceSize: { w: number; h: number };
}

interface TexturePackerAtlas {
  frames: Record<string, TexturePackerFrame>;
  meta: {
    app: string;
    version: string;
    image: string;
    format: string;
    size: { w: number; h: number };
    scale: string;
  };
}

function readPngSize(filePath: string): { w: number; h: number } {
  const buffer = readFileSync(filePath);
  expect(buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), filePath).toBe(true);
  return {
    w: buffer.readUInt32BE(16),
    h: buffer.readUInt32BE(20),
  };
}

function readAtlas(atlasName: string): RuntimeAtlas {
  return JSON.parse(readFileSync(path.join(GENERATED_ATLAS_DIR, `${atlasName}.json`), 'utf8')) as RuntimeAtlas;
}

function readPublicTextureAtlas(aliasName: string): TexturePackerAtlas {
  return JSON.parse(readFileSync(path.join(PUBLIC_ATLAS_DIR, `${aliasName}.json`), 'utf8')) as TexturePackerAtlas;
}

function pngFiles(relativeDir: string, predicate: (fileName: string) => boolean = () => true): string[] {
  const dir = path.join(GENERATED_ROOT, relativeDir);
  return readdirSync(dir)
    .filter((fileName) => fileName.endsWith('.png') && predicate(fileName))
    .sort();
}

function expectAtlasMatchesFiles(atlasName: string, relativeDir: string, files: string[]): void {
  const atlas = readAtlas(atlasName);
  const actualFiles = atlas.sprites.map((sprite) => sprite.file).sort();

  expect(actualFiles, atlasName).toEqual([...files].sort());
  expect(atlas.count, atlasName).toBe(files.length);

  for (const sprite of atlas.sprites) {
    const sourceSize = readPngSize(path.join(GENERATED_ROOT, relativeDir, sprite.file));
    expect({ w: sprite.w, h: sprite.h }, `${atlasName}:${sprite.file}`).toEqual(sourceSize);
  }
}

function expectAtlasMatchesDirectory(atlasName: string, relativeDir: string, predicate?: (fileName: string) => boolean): void {
  expectAtlasMatchesFiles(atlasName, relativeDir, pngFiles(relativeDir, predicate));
}

describe('runtime atlas packer outputs', () => {
  it('generated atlas PNG/JSON pairs match size, count, and sprite bounds', () => {
    const atlasPngs = readdirSync(GENERATED_ATLAS_DIR)
      .filter((fileName) => fileName.startsWith('atlas_') && fileName.endsWith('.png'))
      .sort();

    expect(atlasPngs).toHaveLength(50);

    for (const pngFile of atlasPngs) {
      const atlasName = pngFile.replace(/\.png$/u, '');
      const generatedPng = path.join(GENERATED_ATLAS_DIR, pngFile);
      const generatedJson = path.join(GENERATED_ATLAS_DIR, `${atlasName}.json`);
      const publicPng = path.join(PUBLIC_ATLAS_DIR, pngFile);
      const publicJson = path.join(PUBLIC_ATLAS_DIR, `${atlasName}.json`);

      expect(existsSync(generatedJson), `${atlasName} generated JSON`).toBe(true);
      expect(existsSync(publicPng), `${atlasName} public PNG`).toBe(true);
      expect(existsSync(publicJson), `${atlasName} public JSON`).toBe(true);

      const pngSize = readPngSize(generatedPng);
      const atlas = readAtlas(atlasName);

      expect(atlas.atlas, atlasName).toBe(atlasName);
      expect(atlas.size, atlasName).toEqual(pngSize);
      expect(atlas.count, atlasName).toBe(atlas.sprites.length);
      expect(JSON.parse(readFileSync(publicJson, 'utf8')), `${atlasName} public JSON copy`).toEqual(atlas);
      expect(readPngSize(publicPng), `${atlasName} public PNG copy`).toEqual(pngSize);

      for (const sprite of atlas.sprites) {
        expect(Number.isInteger(sprite.x), `${atlasName}:${sprite.file}:x`).toBe(true);
        expect(Number.isInteger(sprite.y), `${atlasName}:${sprite.file}:y`).toBe(true);
        expect(Number.isInteger(sprite.w), `${atlasName}:${sprite.file}:w`).toBe(true);
        expect(Number.isInteger(sprite.h), `${atlasName}:${sprite.file}:h`).toBe(true);
        expect(sprite.x).toBeGreaterThanOrEqual(0);
        expect(sprite.y).toBeGreaterThanOrEqual(0);
        expect(sprite.w).toBeGreaterThan(0);
        expect(sprite.h).toBeGreaterThan(0);
        expect(sprite.x + sprite.w, `${atlasName}:${sprite.file}:right`).toBeLessThanOrEqual(atlas.size.w);
        expect(sprite.y + sprite.h, `${atlasName}:${sprite.file}:bottom`).toBeLessThanOrEqual(atlas.size.h);
      }
    }
  });

  it('publishes Phaser-compatible core atlas aliases with required legacy frame keys', () => {
    const expectedFrames: Record<string, string[]> = {
      characters: ['erien_idle_01', 'erien_walk_01', 'erien_walk_02', 'erien_attack_01', 'seraphine_idle_01'],
      effects: [
        'hit_slash_01',
        'hit_slash_02',
        'hit_blunt_01',
        'hit_magic_01',
        'particle_glow',
        'particle_spark',
        'buff_shield',
        'buff_attack_up',
        'debuff_poison',
        'debuff_slow',
      ],
      ui: ['btn_normal', 'btn_hover', 'btn_pressed', 'icon_hp', 'icon_mp', 'slot_frame', 'panel_bg'],
    };

    for (const [aliasName, frameNames] of Object.entries(expectedFrames)) {
      const pngPath = path.join(PUBLIC_ATLAS_DIR, `${aliasName}.png`);
      const jsonPath = path.join(PUBLIC_ATLAS_DIR, `${aliasName}.json`);

      expect(existsSync(pngPath), `${aliasName} alias PNG`).toBe(true);
      expect(existsSync(jsonPath), `${aliasName} alias JSON`).toBe(true);

      const pngSize = readPngSize(pngPath);
      const atlas = readPublicTextureAtlas(aliasName);

      expect(atlas.meta.app, aliasName).toBe('Aeterna Atlas Packer');
      expect(atlas.meta.image, aliasName).toBe(`${aliasName}.png`);
      expect(atlas.meta.size, aliasName).toEqual(pngSize);
      expect(Object.keys(atlas.frames).sort(), aliasName).toEqual([...frameNames].sort());

      for (const frameName of frameNames) {
        const frame = atlas.frames[frameName];
        expect(frame, `${aliasName}:${frameName}`).toBeDefined();
        expect(frame.rotated, `${aliasName}:${frameName}:rotated`).toBe(false);
        expect(frame.trimmed, `${aliasName}:${frameName}:trimmed`).toBe(false);
        expect(frame.frame.w, `${aliasName}:${frameName}:w`).toBeGreaterThan(0);
        expect(frame.frame.h, `${aliasName}:${frameName}:h`).toBeGreaterThan(0);
        expect(frame.frame.x, `${aliasName}:${frameName}:x`).toBeGreaterThanOrEqual(0);
        expect(frame.frame.y, `${aliasName}:${frameName}:y`).toBeGreaterThanOrEqual(0);
        expect(frame.frame.x + frame.frame.w, `${aliasName}:${frameName}:right`).toBeLessThanOrEqual(pngSize.w);
        expect(frame.frame.y + frame.frame.h, `${aliasName}:${frameName}:bottom`).toBeLessThanOrEqual(pngSize.h);
        expect(frame.spriteSourceSize).toEqual({ x: 0, y: 0, w: frame.frame.w, h: frame.frame.h });
        expect(frame.sourceSize).toEqual({ w: frame.frame.w, h: frame.frame.h });
      }
    }
  });

  it('packs every generated icon, cosmetic, UI frame, and VFX image into its derived atlas', () => {
    expectAtlasMatchesDirectory('atlas_icon_items', 'ui/icons/items');
    expectAtlasMatchesDirectory('atlas_icon_skills', 'ui/icons/skills');
    expectAtlasMatchesDirectory('atlas_icon_status', 'ui/icons/status');

    for (const season of [1, 2, 3]) {
      expectAtlasMatchesDirectory(`atlas_cosmetic_s${season}`, `cosmetics/season${season}`);
    }

    expectAtlasMatchesDirectory('atlas_ui_frame_default', 'ui/frames', (fileName) => fileName.includes('-DEF'));
    expectAtlasMatchesDirectory('atlas_ui_frame_dark', 'ui/frames', (fileName) => fileName.includes('-DAR'));
    expectAtlasMatchesDirectory('atlas_ui_frame_seasonal', 'ui/frames', (fileName) => fileName.includes('-SEA'));

    expectAtlasMatchesDirectory('atlas_vfx_common', 'vfx/common');
    for (const classId of ['ether_knight', 'memory_breaker', 'memory_weaver', 'shadow_weaver', 'time_guardian', 'void_wanderer']) {
      expectAtlasMatchesDirectory(`atlas_vfx_${classId}`, `vfx/skills/${classId}`);
    }
  });

  it('packs every generated character illustration and legacy sprite-sheet image into its class atlas', () => {
    for (const classId of ['ether_knight', 'memory_breaker', 'memory_weaver', 'shadow_weaver', 'time_guardian', 'void_wanderer']) {
      const files = [
        ...pngFiles('characters/sprites', (fileName) => fileName.startsWith(`char_sprite_${classId}_`)),
        ...pngFiles('characters/class_main', (fileName) => fileName.includes(classId)),
        ...pngFiles('characters/class_advanced', (fileName) => fileName.includes(classId)),
      ];

      const atlas = readAtlas(`atlas_char_${classId}`);
      const actualFiles = atlas.sprites.map((sprite) => sprite.file).sort();
      expect(actualFiles, classId).toEqual(files.sort());
      expect(atlas.count, classId).toBe(files.length);
    }
  });

  it('packs region-scoped background and tile generated assets into derived atlases', () => {
    const backgroundPrefixes: Record<string, string> = {
      sylvanheim: 'SYL',
      erebos: 'ERB',
      northland: 'NOR',
      britalia: 'BRI',
      fog_sea: 'FOG',
      argentium: 'ARG',
      solaris: 'SOL',
      abyss: 'ABY',
      temporal_rift: 'TEM',
      oblivion: 'OBL',
    };

    for (const [region, prefix] of Object.entries(backgroundPrefixes)) {
      expectAtlasMatchesDirectory(
        `atlas_bg_${region}`,
        'environment/backgrounds',
        (fileName) => fileName.toUpperCase().startsWith(prefix),
      );
    }

    const tilePrefixes: Record<string, string> = {
      sylvanheim: 'SYL',
      erebos: 'ERB',
      northland: 'NTH',
      britalia: 'BRT',
      fog_sea: 'FOG',
      argentium: 'ARG',
      solaris: 'SOL',
      abyss: 'ABY',
      temporal_rift: 'TMP',
    };

    for (const [region, prefix] of Object.entries(tilePrefixes)) {
      expectAtlasMatchesDirectory(
        `atlas_tile_${region}`,
        'environment/tiles',
        (fileName) => fileName.toUpperCase().startsWith(prefix),
      );
    }
  });

  it('packs only matching region monster images into monster atlases', () => {
    const monsterRegions: Record<string, { slugs: string[]; bossCodes: string[] }> = {
      sylvanheim: { slugs: ['sylvanheim', 'silvanhime'], bossCodes: ['SYL'] },
      erebos: { slugs: ['erebos'], bossCodes: ['ERB'] },
      northland: { slugs: ['northland'], bossCodes: ['NOR'] },
      britalia: { slugs: ['britalia'], bossCodes: ['BRT'] },
      fog_sea: { slugs: ['fog_sea'], bossCodes: ['FOG'] },
      argentium: { slugs: ['argentium'], bossCodes: ['ARG'] },
      solaris: { slugs: ['solaris'], bossCodes: ['SOL'] },
      abyss: { slugs: ['abyss'], bossCodes: ['ABY'] },
      temporal_rift: { slugs: ['temporal_rift'], bossCodes: ['TEM', 'TMP'] },
    };

    for (const [region, config] of Object.entries(monsterRegions)) {
      const matchesRegion = (fileName: string): boolean => {
        const stem = fileName.replace(/\.png$/u, '');
        const lowerStem = stem.toLowerCase();
        return config.slugs.some((slug) => lowerStem.startsWith(`mon_${slug}_`))
          || config.bossCodes.some((code) => stem.startsWith(`BOSS-${code}-`));
      };

      const files = [
        ...pngFiles('monsters/normal', matchesRegion),
        ...pngFiles('monsters/elite_boss', matchesRegion),
      ];
      const atlas = readAtlas(`atlas_monster_${region}`);
      const actualFiles = atlas.sprites.map((sprite) => sprite.file).sort();

      expect(actualFiles, region).toEqual(files.sort());
      expect(atlas.count, region).toBe(files.length);
    }
  });
});
