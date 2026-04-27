import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, test } from 'vitest';

import {
  MONSTER_TIER_ORDER,
  MONSTER_TIER_TOKENS,
  getMonsterTierToken,
} from '../../client/src/design_tokens/monster_tier';
import {
  runMonsterPipelineCommand,
} from '../../scripts/monster-pipeline/cli';
import {
  MONSTER_PROVIDER_IDS,
  MONSTER_PROVIDERS,
  getMonsterProvider,
} from '../../scripts/monster-pipeline/providers';
import {
  MONSTER_TOUCHUP_STEP_ORDER,
  MONSTER_TOUCHUP_STEPS,
  getMonsterTouchupStep,
} from '../../scripts/monster-pipeline/touchup';

describe('monster pipeline contracts', () => {
  test('tier token SSOT는 normal → elite → boss 순으로 위계가 상승해야 한다', () => {
    expect(MONSTER_TIER_ORDER).toEqual(['normal', 'elite', 'boss']);

    const normal = getMonsterTierToken('normal');
    const elite = getMonsterTierToken('elite');
    const boss = getMonsterTierToken('boss');

    expect(normal.sprite.widthPx).toBeLessThan(elite.sprite.widthPx);
    expect(elite.sprite.widthPx).toBeLessThan(boss.sprite.widthPx);

    expect(normal.palette.maxColors).toBe(16);
    expect(elite.palette.maxColors).toBe(24);
    expect(boss.palette.maxColors).toBe(32);

    expect(normal.idle.frames).toBeLessThan(elite.idle.frames);
    expect(elite.idle.frames).toBeLessThan(boss.idle.frames);

    expect(MONSTER_TIER_TOKENS.boss.sprite.allowAsymmetric).toBe(true);
  });

  test('touchup 단계는 rembg → quantize → outline → frame_split 순서를 유지해야 한다', () => {
    expect(MONSTER_TOUCHUP_STEP_ORDER).toEqual([
      'rembg',
      'quantize',
      'outline',
      'frame_split',
    ]);

    expect(getMonsterTouchupStep('outline')).toMatchObject({
      id: 'outline',
      produces: 'touchup_auto',
      requiresManualReview: false,
    });

    expect(MONSTER_TOUCHUP_STEPS.frame_split.produces).toBe('atlas');
  });

  test('provider registry는 firefly와 sdxl 두 경로를 노출해야 한다', () => {
    expect(MONSTER_PROVIDER_IDS).toEqual(['firefly', 'sdxl']);

    expect(getMonsterProvider('firefly')).toMatchObject({
      id: 'firefly',
      commercialSafeDefault: true,
      requiresModelLicenseUrl: true,
    });

    expect(MONSTER_PROVIDERS.sdxl.supportsLora).toBe(true);
  });

  test('generate 명령은 dry-run에서도 메타가 포함된 산출물을 반환해야 한다', async () => {
    const workspaceRoot = await mkdtemp(path.join(tmpdir(), 'monster-pipeline-contract-'));

    try {
      const artifact = await runMonsterPipelineCommand({
        command: 'generate',
        monsterId: 'mon_erebos_fog_wolf_normal',
        dryRun: true,
        workspaceRoot,
      });

      expect(artifact).toMatchObject({
        assetId: 'mon_erebos_fog_wolf_normal',
        stage: 'ai_raw',
        meta: {
          assetId: 'mon_erebos_fog_wolf_normal',
          tier: 'normal',
          region: 'erebos',
          providerId: 'firefly',
        },
      });
    } finally {
      await rm(workspaceRoot, { recursive: true, force: true });
    }
  });
});
