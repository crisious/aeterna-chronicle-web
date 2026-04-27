import { frameSplitStep } from './frame_split.ts';
import { outlineStep } from './outline.ts';
import { quantizeStep } from './quantize.ts';
import { rembgStep } from './rembg.ts';
import { MONSTER_TOUCHUP_STEP_ORDER } from '../types.ts';
import type {
  MonsterTouchupContext,
  MonsterTouchupResult,
  MonsterTouchupStepDescriptor,
  MonsterTouchupStepId,
} from '../types.ts';

export { MONSTER_TOUCHUP_STEP_ORDER };

export const MONSTER_TOUCHUP_STEPS: Record<MonsterTouchupStepId, MonsterTouchupStepDescriptor> = {
  rembg: rembgStep,
  quantize: quantizeStep,
  outline: outlineStep,
  frame_split: frameSplitStep,
};

export function getMonsterTouchupStep(stepId: MonsterTouchupStepId): MonsterTouchupStepDescriptor {
  return MONSTER_TOUCHUP_STEPS[stepId];
}

export async function runMonsterTouchupPipeline(context: MonsterTouchupContext): Promise<MonsterTouchupResult[]> {
  const results: MonsterTouchupResult[] = [];
  let currentContext = context;

  for (const stepId of MONSTER_TOUCHUP_STEP_ORDER) {
    const step = getMonsterTouchupStep(stepId);
    const result = await step.run(currentContext);
    results.push(result);
    currentContext = {
      ...currentContext,
      inputPath: result.outputPath,
    };
  }

  return results;
}
