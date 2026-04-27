import { getMonsterTierToken } from '../../../client/src/design_tokens/monster_tier.ts';
import { writeAtlasManifest, writeTouchupStageResult } from '../helpers.ts';
import type { MonsterTouchupContext, MonsterTouchupResult, MonsterTouchupStepDescriptor } from '../types.ts';

async function runFrameSplitStep(context: MonsterTouchupContext): Promise<MonsterTouchupResult> {
  const tierToken = getMonsterTierToken(context.tier);
  const result = await writeTouchupStageResult(context, 'frame_split', 'atlas', {
    atlas: {
      width: tierToken.sprite.widthPx * tierToken.idle.frames,
      height: tierToken.sprite.heightPx,
      frames: tierToken.idle.frames,
    },
  });

  await writeAtlasManifest(context, result.outputPath);
  return result;
}

export const frameSplitStep: MonsterTouchupStepDescriptor = {
  id: 'frame_split',
  labelKo: '프레임 분리/시트화',
  consumes: 'touchup_final',
  produces: 'atlas',
  requiresManualReview: true,
  run: runFrameSplitStep,
};
