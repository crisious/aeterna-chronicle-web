import { writeTouchupStageResult } from '../helpers.ts';
import type { MonsterTouchupContext, MonsterTouchupResult, MonsterTouchupStepDescriptor } from '../types.ts';

async function runRembgStep(context: MonsterTouchupContext): Promise<MonsterTouchupResult> {
  return writeTouchupStageResult(context, 'rembg', 'touchup_auto', {
    backgroundRemoved: true,
  });
}

export const rembgStep: MonsterTouchupStepDescriptor = {
  id: 'rembg',
  labelKo: '배경 제거',
  consumes: 'ai_raw',
  produces: 'touchup_auto',
  requiresManualReview: false,
  run: runRembgStep,
};
