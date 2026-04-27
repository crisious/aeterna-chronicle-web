import { getMonsterTierToken } from '../../../client/src/design_tokens/monster_tier.ts';
import { resolveMetaPath, writeJsonFile, writeTouchupStageResult } from '../helpers.ts';
import type { MonsterTouchupContext, MonsterTouchupResult, MonsterTouchupStepDescriptor } from '../types.ts';

async function runQuantizeStep(context: MonsterTouchupContext): Promise<MonsterTouchupResult> {
  const tierToken = getMonsterTierToken(context.tier);
  const result = await writeTouchupStageResult(context, 'quantize', 'touchup_auto', {
    palette: {
      maxColors: tierToken.palette.maxColors,
      fileName: tierToken.palette.fileName,
    },
  });

  await writeJsonFile(result.outputPath.replace(/\.png$/u, '.palette.json'), {
    assetId: context.assetId,
    tier: context.tier,
    maxColors: tierToken.palette.maxColors,
    paletteFile: tierToken.palette.fileName,
    metaPath: resolveMetaPath(result.outputPath),
  });

  return result;
}

export const quantizeStep: MonsterTouchupStepDescriptor = {
  id: 'quantize',
  labelKo: '팔레트 양자화',
  consumes: 'touchup_auto',
  produces: 'touchup_auto',
  requiresManualReview: false,
  run: runQuantizeStep,
};
