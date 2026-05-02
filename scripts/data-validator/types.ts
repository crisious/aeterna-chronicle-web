/**
 * scripts/data-validator/types.ts — 데이터 검증 시스템 타입 SSOT (계섬월 stub)
 *
 * 책임: 콘텐츠 1건 추가 시 schema/참조/밸런스 정합성을 자동 보장.
 * 본 파일은 Asset 단계 골격 — 실제 로직은 Build 단계에서 채운다.
 * 칼날의 결을 미리 정한다. 베는 깊이는 다음 사람의 몫이다.
 */

// ─────────────────────────────────────────────────────────────────────────────
// 데이터 도메인 ID
// ─────────────────────────────────────────────────────────────────────────────
export const DATA_DOMAIN_IDS = ['skill', 'item', 'monster', 'encounter', 'scenario'] as const;
export type DataDomainId = (typeof DATA_DOMAIN_IDS)[number];

// ─────────────────────────────────────────────────────────────────────────────
// CLI 명령
// ─────────────────────────────────────────────────────────────────────────────
export const VALIDATOR_COMMAND_IDS = ['schema', 'refs', 'balance', 'report', 'all'] as const;
export type ValidatorCommandId = (typeof VALIDATOR_COMMAND_IDS)[number];

export interface ValidatorCommandRequest {
  readonly command: ValidatorCommandId;
  readonly domains?: readonly DataDomainId[];
  readonly inputPath?: string;
  readonly outputPath?: string;
  readonly workspaceRoot?: string;
  readonly failOnWarn?: boolean;
  readonly sigmaThreshold?: number; // balance outlier 기준 (default: 2)
}

export interface ValidatorCommandDescriptor {
  readonly id: ValidatorCommandId;
  readonly labelKo: string;
  readonly run: (request: ValidatorCommandRequest) => Promise<ValidationReport>;
}

// ─────────────────────────────────────────────────────────────────────────────
// 위치 단서 — 검증 실패 시 어떤 파일/필드가 문제인지 즉시 노출
// ─────────────────────────────────────────────────────────────────────────────
export interface LocationCue {
  readonly filePath: string;          // 절대/상대 경로
  readonly jsonPointer: string;       // RFC 6901, 예: "/skills/12/effect_id"
  readonly line?: number;             // ajv-errors 또는 source-map 기반
  readonly column?: number;
  readonly snippet?: string;          // 문제 줄 ±2 라인
}

// ─────────────────────────────────────────────────────────────────────────────
// 검증 결과
// ─────────────────────────────────────────────────────────────────────────────
export type ValidationSeverity = 'error' | 'warn' | 'info';
export type ValidationKind = 'schema' | 'reference' | 'balance';

export interface ValidationFinding {
  readonly kind: ValidationKind;
  readonly severity: ValidationSeverity;
  readonly domain: DataDomainId;
  readonly code: string;              // 예: "SCHEMA_MISSING_FIELD", "REF_BROKEN_LINK", "BAL_OUTLIER_2SIGMA"
  readonly messageKo: string;         // 사용자(대표) 가독 한국어
  readonly location: LocationCue;
  readonly hint?: string;             // 처방 힌트 (선택)
  readonly raw?: unknown;             // ajv ErrorObject 등 원본
}

export interface ValidationReport {
  readonly command: ValidatorCommandId;
  readonly startedAt: string;         // ISO 8601
  readonly finishedAt: string;
  readonly durationMs: number;
  readonly totals: {
    readonly files: number;
    readonly records: number;
    readonly errors: number;
    readonly warns: number;
  };
  readonly byDomain: Record<DataDomainId, DomainSummary>;
  readonly findings: readonly ValidationFinding[];
  readonly passed: boolean;           // errors === 0 && (failOnWarn ? warns === 0 : true)
}

export interface DomainSummary {
  readonly files: number;
  readonly records: number;
  readonly errors: number;
  readonly warns: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// 참조 무결성 그래프
// ─────────────────────────────────────────────────────────────────────────────
export type ReferenceEdgeKind =
  | 'skill->effect'
  | 'item->category'
  | 'encounter->monster'
  | 'scenario->skill'
  | 'scenario->item'
  | 'scenario->encounter';

export interface ReferenceEdge {
  readonly from: { domain: DataDomainId; id: string; location: LocationCue };
  readonly to: { domain: DataDomainId; id: string };
  readonly kind: ReferenceEdgeKind;
}

// ─────────────────────────────────────────────────────────────────────────────
// 밸런스 outlier 통계
// ─────────────────────────────────────────────────────────────────────────────
export const BALANCE_METRIC_IDS = ['damage', 'hp', 'exp', 'gold', 'cast_time'] as const;
export type BalanceMetricId = (typeof BALANCE_METRIC_IDS)[number];

export interface BalanceDistribution {
  readonly domain: DataDomainId;
  readonly metric: BalanceMetricId;
  readonly count: number;
  readonly mean: number;
  readonly stdev: number;
  readonly min: number;
  readonly max: number;
  readonly p50: number;
  readonly p95: number;
}

export interface BalanceOutlier {
  readonly recordId: string;
  readonly metric: BalanceMetricId;
  readonly value: number;
  readonly zScore: number;
  readonly location: LocationCue;
}
