/**
 * monster-pipeline 오류 정의
 *
 * stub 단계에서 미구현 경계를 명시적으로 끊는다.
 * 조용히 실패하면 다음 단계에서 독이 된다.
 */

export class MonsterPipelineNotImplementedError extends Error {
  readonly code = 'MONSTER_PIPELINE_NOT_IMPLEMENTED';
  readonly stage: string;
  readonly capability: string;
  readonly details?: Record<string, unknown>;

  constructor(stage: string, capability: string, details?: Record<string, unknown>) {
    super(`[monster-pipeline] ${stage}/${capability} 는 stub 단계입니다. 실제 로직은 Development 단계에서 구현하십시오.`);
    this.name = 'MonsterPipelineNotImplementedError';
    this.stage = stage;
    this.capability = capability;
    this.details = details;
  }
}

export function failMonsterPipelineNotImplemented<T>(
  stage: string,
  capability: string,
  details?: Record<string, unknown>,
): T {
  throw new MonsterPipelineNotImplementedError(stage, capability, details);
}
