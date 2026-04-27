import { getMonsterTierToken } from '../../../client/src/design_tokens/monster_tier.ts';
import { writeTouchupStageResult } from '../helpers.ts';
import type { MonsterTouchupContext, MonsterTouchupResult, MonsterTouchupStepDescriptor } from '../types.ts';

async function runOutlineStep(context: MonsterTouchupContext): Promise<MonsterTouchupResult> {
  const tierToken = getMonsterTierToken(context.tier);
  return writeTouchupStageResult(context, 'outline', 'touchup_auto', {
    outline: tierToken.outline,
  });
}

export const outlineStep: MonsterTouchupStepDescriptor = {
  id: 'outline',
  labelKo: '외곽선 정규화',
  consumes: 'touchup_auto',
  produces: 'touchup_auto',
  requiresManualReview: false,
  run: runOutlineStep,
};
