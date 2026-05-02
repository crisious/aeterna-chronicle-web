/**
 * scripts/data-validator/validators/balance-outlier.ts — 밸런스 outlier 탐지 (계섬월 Build)
 *
 * z-score = (value - mean) / stdev
 *   |z| ≥ sigma  → warn (BAL_OUTLIER_2SIGMA)
 *   |z| ≥ sigma*1.5 (default 3.0) → error (BAL_OUTLIER_3SIGMA)
 *
 * 도메인×metric 매핑:
 *   skill:    damage, cast_time
 *   monster:  hp, exp
 *   item:     gold (price)
 *   encounter, scenario: 직접 metric 없음 — skip
 */
import type {
  BalanceDistribution,
  BalanceMetricId,
  BalanceOutlier,
  DataDomainId,
  LocationCue,
  ValidationFinding,
  ValidationSeverity,
} from '../types.ts';
import { DATA_DOMAIN_IDS } from '../types.ts';
import { assertLocation } from '../errors.ts';
import {
  buildSnippet,
  loadJsonWithSourceMap,
  locateByPointer,
  resolveDataGlob,
  resolveWorkspaceRoot,
} from '../helpers.ts';

export interface BalanceAuditOptions {
  readonly sigmaThreshold?: number;
  readonly groupBy?: readonly ('chapter' | 'tier' | 'class')[];
}

export interface BalanceAuditResult {
  readonly distributions: readonly BalanceDistribution[];
  readonly outliers: readonly BalanceOutlier[];
  readonly findings: readonly ValidationFinding[];
}

const DOMAIN_METRIC_KEYS: Record<DataDomainId, ReadonlyArray<{ metric: BalanceMetricId; field: string }>> = {
  skill: [
    { metric: 'damage', field: 'damage' },
    { metric: 'cast_time', field: 'castTime' },
  ],
  item: [
    { metric: 'gold', field: 'price' },
  ],
  monster: [
    { metric: 'hp', field: 'hp' },
    { metric: 'exp', field: 'exp' },
  ],
  encounter: [],
  scenario: [],
};

interface Sample {
  readonly value: number;
  readonly recordId: string;
  readonly location: LocationCue;
}

export function computeDistribution(
  domain: DataDomainId,
  metric: BalanceMetricId,
  values: readonly number[],
): BalanceDistribution {
  const count = values.length;
  if (count === 0) {
    return { domain, metric, count: 0, mean: 0, stdev: 0, min: 0, max: 0, p50: 0, p95: 0 };
  }
  let sum = 0;
  for (const v of values) sum += v;
  const mean = sum / count;
  let sqSum = 0;
  for (const v of values) sqSum += (v - mean) * (v - mean);
  const stdev = count > 1 ? Math.sqrt(sqSum / (count - 1)) : 0;
  const sorted = [...values].sort((a, b) => a - b);
  const pct = (p: number): number => {
    if (sorted.length === 0) return 0;
    const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
    return sorted[idx]!;
  };
  return {
    domain,
    metric,
    count,
    mean,
    stdev,
    min: sorted[0]!,
    max: sorted[sorted.length - 1]!,
    p50: pct(50),
    p95: pct(95),
  };
}

function collectSamples(domain: DataDomainId, workspaceRoot: string): Map<BalanceMetricId, Sample[]> {
  const samples = new Map<BalanceMetricId, Sample[]>();
  const metricSpec = DOMAIN_METRIC_KEYS[domain];
  if (metricSpec.length === 0) return samples;

  const files = resolveDataGlob(domain, workspaceRoot);
  for (const filePath of files) {
    const { data, pointers, raw } = loadJsonWithSourceMap(filePath);
    let records: { record: unknown; pointer: string }[] = [];
    if (Array.isArray(data)) {
      records = data.map((r, i) => ({ record: r, pointer: `/${i}` }));
    } else if (data && typeof data === 'object' && Array.isArray((data as { records?: unknown[] }).records)) {
      records = (data as { records: unknown[] }).records.map((r, i) => ({ record: r, pointer: `/records/${i}` }));
    } else if (data && typeof data === 'object') {
      records = [{ record: data, pointer: '' }];
    }

    for (const { record, pointer } of records) {
      if (!record || typeof record !== 'object') continue;
      const rec = record as Record<string, unknown>;
      const recordId = typeof rec.id === 'string' ? rec.id : `${filePath}#${pointer}`;
      for (const { metric, field } of metricSpec) {
        const value = rec[field];
        if (typeof value !== 'number' || !Number.isFinite(value)) continue;
        const fieldPointer = `${pointer}/${field}`;
        const { line, column } = locateByPointer(pointers, fieldPointer);
        const cue: LocationCue = {
          filePath,
          jsonPointer: fieldPointer,
          line,
          column,
          snippet: buildSnippet(raw, line),
        };
        if (!samples.has(metric)) samples.set(metric, []);
        samples.get(metric)!.push({ value, recordId, location: cue });
      }
    }
  }
  return samples;
}

export async function auditBalance(
  options: BalanceAuditOptions = {},
  workspaceRoot?: string,
): Promise<BalanceAuditResult> {
  const sigma = options.sigmaThreshold ?? 2;
  const errorSigma = sigma * 1.5; // ±3σ 기본
  const root = workspaceRoot ?? resolveWorkspaceRoot();

  const distributions: BalanceDistribution[] = [];
  const outliers: BalanceOutlier[] = [];
  const findings: ValidationFinding[] = [];

  for (const domain of DATA_DOMAIN_IDS) {
    const samples = collectSamples(domain, root);
    for (const [metric, list] of samples) {
      const dist = computeDistribution(domain, metric, list.map((s) => s.value));
      distributions.push(dist);
      if (dist.count < 3 || dist.stdev === 0) continue; // 표본 부족 — 검증 의미 없음

      for (const sample of list) {
        const z = (sample.value - dist.mean) / dist.stdev;
        const absZ = Math.abs(z);
        if (absZ < sigma) continue;
        outliers.push({
          recordId: sample.recordId,
          metric,
          value: sample.value,
          zScore: z,
          location: sample.location,
        });
        const severity: ValidationSeverity = absZ >= errorSigma ? 'error' : 'warn';
        const code = absZ >= errorSigma ? 'BAL_OUTLIER_3SIGMA' : 'BAL_OUTLIER_2SIGMA';
        findings.push({
          kind: 'balance',
          severity,
          domain,
          code,
          messageKo:
            `[${domain}.${metric}] ${sample.recordId} = ${sample.value} ` +
            `(z=${z.toFixed(2)}, μ=${dist.mean.toFixed(1)}, σ=${dist.stdev.toFixed(1)}, n=${dist.count})`,
          location: assertLocation(sample.location, 'balance', domain),
          hint:
            absZ >= errorSigma
              ? `±3σ 초과 — 즉시 점검. 의도된 보스/유니크라면 별도 그룹 분리.`
              : `±2σ 초과 — 챕터/티어별 분포 갈리면 groupBy 추가 검토.`,
        });
      }
    }
  }

  return { distributions, outliers, findings };
}
