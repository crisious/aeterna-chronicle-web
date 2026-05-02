/**
 * scripts/data-validator/validators/schema-validator.ts — ajv 래퍼 (계섬월 Build)
 *
 * 동작:
 *   1) ajv 2020 + ajv-formats. allErrors=true (한 번에 다 베어낸다).
 *   2) 도메인별 schema는 lazily compile + 캐시.
 *   3) ajv ErrorObject.instancePath → jsonPointer → LocationCue 변환 (assertLocation 통과).
 *   4) 단일 객체 / 배열 / { records: [...] } 세 가지 입력 형태 지원.
 */
import fs from 'node:fs';
import path from 'node:path';

import Ajv2020, { type ErrorObject, type ValidateFunction } from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

import type { DataDomainId, ValidationFinding, LocationCue } from '../types.ts';
import { DATA_DOMAIN_IDS } from '../types.ts';
import { assertLocation } from '../errors.ts';
import {
  buildSnippet,
  loadJsonWithSourceMap,
  locateByPointer,
  resolveDataGlob,
  resolveSchemaPath,
  resolveWorkspaceRoot,
} from '../helpers.ts';

export interface SchemaValidatorOptions {
  readonly strict?: boolean;
  readonly allErrors?: boolean;
  readonly workspaceRoot?: string;
}

export interface SchemaValidatorResult {
  readonly domain: DataDomainId;
  readonly filePath: string;
  readonly recordCount: number;
  readonly findings: readonly ValidationFinding[];
}

interface AjvBundle {
  readonly ajv: Ajv2020;
  readonly validators: Map<DataDomainId, ValidateFunction>;
}

let cachedBundle: AjvBundle | null = null;

function getBundle(options: SchemaValidatorOptions): AjvBundle {
  if (cachedBundle) return cachedBundle;
  const ajv = new Ajv2020({
    strict: options.strict ?? false,
    allErrors: options.allErrors ?? true,
    allowUnionTypes: true,
  });
  // ajv-formats는 default export 형태가 다양 — 안전 호출
  const fmt = (addFormats as unknown as { default?: typeof addFormats });
  const installFormats = fmt.default ?? addFormats;
  installFormats(ajv);
  cachedBundle = { ajv, validators: new Map() };
  return cachedBundle;
}

function compileFor(domain: DataDomainId, options: SchemaValidatorOptions): ValidateFunction {
  const bundle = getBundle(options);
  const cached = bundle.validators.get(domain);
  if (cached) return cached;
  const schemaPath = resolveSchemaPath(domain);
  const schemaJson = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
  const validate = bundle.ajv.compile(schemaJson);
  bundle.validators.set(domain, validate);
  return validate;
}

/**
 * 입력이 {records:[...]} | [...] | {...} 어느 형태든 records 배열로 정규화.
 * pointer prefix는 records 위치 — ajv instancePath와 합쳐서 최종 포인터 산출.
 */
function extractRecords(data: unknown): { records: unknown[]; pointerPrefix: string } {
  if (Array.isArray(data)) return { records: data, pointerPrefix: '' };
  if (data && typeof data === 'object' && Array.isArray((data as { records?: unknown[] }).records)) {
    return { records: (data as { records: unknown[] }).records, pointerPrefix: '/records' };
  }
  return { records: [data], pointerPrefix: '' };
}

function ajvErrorToFinding(
  err: ErrorObject,
  domain: DataDomainId,
  filePath: string,
  recordPointer: string,
  pointers: Map<string, { line: number; column: number }>,
  raw: string,
): ValidationFinding {
  const fullPointer = `${recordPointer}${err.instancePath ?? ''}`;
  const { line, column } = locateByPointer(pointers, fullPointer);
  const cue: LocationCue = assertLocation(
    {
      filePath,
      jsonPointer: fullPointer || '/',
      line,
      column,
      snippet: buildSnippet(raw, line),
    },
    'schema',
    domain,
  );
  const code = `SCHEMA_${(err.keyword ?? 'INVALID').toUpperCase()}`;
  const messageKo = `[${domain}] ${err.message ?? '스키마 위반'}`;
  return {
    kind: 'schema',
    severity: 'error',
    domain,
    code,
    messageKo,
    location: cue,
    hint: hintFor(err),
    raw: err,
  };
}

function hintFor(err: ErrorObject): string | undefined {
  switch (err.keyword) {
    case 'required':
      return `필수 필드 누락: ${(err.params as { missingProperty?: string }).missingProperty}`;
    case 'enum':
      return `허용값: ${JSON.stringify((err.params as { allowedValues?: unknown }).allowedValues)}`;
    case 'pattern':
      return `id 패턴 위반: ${(err.params as { pattern?: string }).pattern}`;
    case 'type':
      return `타입 불일치: ${(err.params as { type?: string }).type} 기대`;
    default:
      return undefined;
  }
}

export async function validateAgainstSchema(
  domain: DataDomainId,
  filePath: string,
  options: SchemaValidatorOptions = {},
): Promise<SchemaValidatorResult> {
  const validate = compileFor(domain, options);
  const { data, pointers, raw } = loadJsonWithSourceMap(filePath);
  const { records, pointerPrefix } = extractRecords(data);
  const findings: ValidationFinding[] = [];
  records.forEach((record, idx) => {
    const recordPointer = pointerPrefix
      ? `${pointerPrefix}/${idx}`
      : Array.isArray(data)
        ? `/${idx}`
        : '';
    const ok = validate(record);
    if (!ok && validate.errors) {
      for (const err of validate.errors) {
        findings.push(ajvErrorToFinding(err, domain, filePath, recordPointer, pointers, raw));
      }
    }
  });
  return { domain, filePath, recordCount: records.length, findings };
}

export async function validateAllSchemas(
  options: SchemaValidatorOptions = {},
): Promise<readonly SchemaValidatorResult[]> {
  const root = resolveWorkspaceRoot(options.workspaceRoot);
  const out: SchemaValidatorResult[] = [];
  for (const domain of DATA_DOMAIN_IDS) {
    const files = resolveDataGlob(domain, root);
    for (const filePath of files) {
      out.push(await validateAgainstSchema(domain, filePath, options));
    }
  }
  return out;
}

/**
 * 테스트용 — schema 캐시 리셋.
 */
export function resetSchemaCache(): void {
  cachedBundle = null;
}

// path import 사용 마커 (linter 안심용; 추후 외부 schema 참조 확장 시 사용)
void path;
