import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, test } from 'vitest';

import { buildMonsterCatalog } from '../../scripts/monster-pipeline/catalog';
import { runMonsterPipelineCommand } from '../../scripts/monster-pipeline/cli';
import { generateMonsterAsset } from '../../scripts/monster-pipeline/generate';
import { runMonsterTouchupPipeline } from '../../scripts/monster-pipeline/touchup';

const EMPTY_PNG_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4////fwAJ+wP9KobjigAAAABJRU5ErkJggg==',
  'base64',
);

async function makeWorkspace(prefix: string): Promise<string> {
  return mkdtemp(path.join(tmpdir(), prefix));
}

describe('monster pipeline runtime', () => {
  test('catalog 빌드는 tier/region/variant 정보를 정규화하고 JSON을 기록해야 한다', async () => {
    const workspaceRoot = await makeWorkspace('monster-pipeline-catalog-');
    const sourceRoot = path.join(workspaceRoot, 'assets', 'generated', 'monsters');
    const outputPath = path.join(workspaceRoot, 'out', 'monster_catalog.json');

    try {
      await mkdir(path.join(sourceRoot, 'normal'), { recursive: true });
      await mkdir(path.join(sourceRoot, 'elite_boss'), { recursive: true });
      await mkdir(path.join(sourceRoot, 'raid_boss'), { recursive: true });

      await writeFile(path.join(sourceRoot, 'normal', 'mon_erebos_fog_wolf_normal.png'), EMPTY_PNG_BUFFER);
      await writeFile(path.join(sourceRoot, 'elite_boss', 'mon_solaris_sand_elemental_elite.png'), EMPTY_PNG_BUFFER);
      await writeFile(path.join(sourceRoot, 'raid_boss', 'mon_argentium_gear_spider_boss.png'), EMPTY_PNG_BUFFER);

      const entries = await buildMonsterCatalog({
        sourcePath: sourceRoot,
        outputPath,
      });

      expect(entries).toEqual([
        expect.objectContaining({
          id: 'mon_argentium_gear_spider_boss',
          tier: 'boss',
          region: 'argentium',
          silhouetteClass: 'mechanical',
          variantNamespace: '__v00',
        }),
        expect.objectContaining({
          id: 'mon_erebos_fog_wolf_normal',
          tier: 'normal',
          region: 'erebos',
          silhouetteClass: 'beast',
          variantNamespace: '__v00',
        }),
        expect.objectContaining({
          id: 'mon_solaris_sand_elemental_elite',
          tier: 'elite',
          region: 'solaris',
          silhouetteClass: 'elemental',
          variantNamespace: '__v00',
        }),
      ]);

      const written = JSON.parse(await readFile(outputPath, 'utf8'));
      expect(written).toHaveLength(3);
      expect(written[0].id).toBe('mon_argentium_gear_spider_boss');
    } finally {
      await rm(workspaceRoot, { recursive: true, force: true });
    }
  });

  test('generate는 dry-run에서도 placeholder 이미지와 sidecar 메타를 남겨야 한다', async () => {
    const workspaceRoot = await makeWorkspace('monster-pipeline-generate-');

    try {
      const artifact = await generateMonsterAsset({
        monsterId: 'mon_erebos_fog_wolf_normal',
        tier: 'normal',
        region: 'erebos',
        dryRun: true,
        workspaceRoot,
      });

      expect(await stat(artifact.imagePath)).toMatchObject({ isFile: expect.any(Function) });

      const sidecar = JSON.parse(await readFile(artifact.imagePath.replace(/\.png$/u, '.meta.json'), 'utf8'));
      expect(sidecar).toMatchObject({
        assetId: 'mon_erebos_fog_wolf_normal',
        tier: 'normal',
        region: 'erebos',
        providerId: 'firefly',
        licenseId: 'adobe-firefly-commercial',
      });
      expect(sidecar.seed).toEqual(expect.any(Number));
      expect(sidecar.promptText).toContain('fog wolf');
    } finally {
      await rm(workspaceRoot, { recursive: true, force: true });
    }
  });

  test('touchup 파이프라인은 단계별 파일과 atlas 메타를 순서대로 생성해야 한다', async () => {
    const workspaceRoot = await makeWorkspace('monster-pipeline-touchup-');
    const inputPath = path.join(workspaceRoot, 'raw', 'mon_erebos_fog_wolf_normal.png');
    const outputPath = path.join(workspaceRoot, 'processed');

    try {
      await mkdir(path.dirname(inputPath), { recursive: true });
      await writeFile(inputPath, EMPTY_PNG_BUFFER);

      const results = await runMonsterTouchupPipeline({
        assetId: 'mon_erebos_fog_wolf_normal',
        tier: 'normal',
        region: 'erebos',
        inputPath,
        outputPath,
        meta: {
          assetId: 'mon_erebos_fog_wolf_normal',
          tier: 'normal',
          region: 'erebos',
          providerId: 'firefly',
          licenseId: 'adobe-firefly-commercial',
          licenseUrl: 'https://www.adobe.com/products/firefly.html',
        },
      });

      expect(results.map((item) => item.stepId)).toEqual([
        'rembg',
        'quantize',
        'outline',
        'frame_split',
      ]);

      const atlasManifestPath = results.at(-1)?.outputPath.replace(/\.png$/u, '.json');
      expect(atlasManifestPath).toBeTruthy();
      const atlasManifest = JSON.parse(await readFile(atlasManifestPath!, 'utf8'));
      expect(atlasManifest.meta.assetId).toBe('mon_erebos_fog_wolf_normal');
      expect(atlasManifest.animations.idle.frames).toBe(4);
      expect(atlasManifest.animations.attack.frames).toBe(4);
    } finally {
      await rm(workspaceRoot, { recursive: true, force: true });
    }
  });

  test('all 명령은 generate와 touchup을 묶고 수동 검수 대기 상태를 반환해야 한다', async () => {
    const workspaceRoot = await makeWorkspace('monster-pipeline-all-');

    try {
      const summary = await runMonsterPipelineCommand({
        command: 'all',
        monsterId: 'mon_erebos_fog_wolf_normal',
        dryRun: true,
        workspaceRoot,
      });

      expect(summary).toMatchObject({
        assetId: 'mon_erebos_fog_wolf_normal',
        nextAction: 'manual_review_required',
      });
      expect(summary).toHaveProperty('touchupResults');
    } finally {
      await rm(workspaceRoot, { recursive: true, force: true });
    }
  });
});
