/**
 * scripts/data-validator/errors.ts — 검증 실패 시 위치 노출 + NotImplemented 가드 (계섬월 stub)
 *
 * 검증 실패 메시지는 반드시 LocationCue를 포함한다 — 어디가 부서졌는지 모르면 칼이 무뎌진다.
 */
import type { DataDomainId, LocationCue, ValidationKind } from './types.ts';

export class DataValidatorNotImplementedError extends Error {
  readonly module: string;
  readonly owner: string;
  readonly context: Record<string, unknown>;

  constructor(module: string, owner: string, context: Record<string, unknown> = {}) {
    super(`[data-validator] ${module} not implemented (owner: ${owner})`);
    this.name = 'DataValidatorNotImplementedError';
    this.module = module;
    this.owner = owner;
    this.context = context;
  }
}

export function failValidatorNotImplemented(
  module: string,
  owner: string,
  context: Record<string, unknown> = {},
): never {
  throw new DataValidatorNotImplementedError(module, owner, context);
}

/**
 * 위치 단서가 빠진 finding은 허용하지 않는다.
 * Build 단계에서 ajv ErrorObject → LocationCue 변환기를 채울 때 본 가드를 통과해야 한다.
 */
export function assertLocation(cue: Partial<LocationCue> | undefined, kind: ValidationKind, domain: DataDomainId): LocationCue {
  if (!cue || typeof cue.filePath !== 'string' || typeof cue.jsonPointer !== 'string') {
    throw new Error(
      `[data-validator] ${kind}/${domain} finding은 LocationCue(filePath + jsonPointer)가 필수입니다. 위치를 모르면 베지 않습니다.`,
    );
  }
  return {
    filePath: cue.filePath,
    jsonPointer: cue.jsonPointer,
    line: cue.line,
    column: cue.column,
    snippet: cue.snippet,
  };
}

/** 사용자 가독용 한 줄 포맷 — `path/to/file.json:12  /skills/3/effect_id  REF_BROKEN_LINK` */
export function formatLocation(cue: LocationCue): string {
  const lineSuffix = cue.line ? `:${cue.line}${cue.column ? `:${cue.column}` : ''}` : '';
  return `${cue.filePath}${lineSuffix}  ${cue.jsonPointer}`;
}
