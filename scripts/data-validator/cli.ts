/**
 * scripts/data-validator/cli.ts — 데이터 검증 CLI 진입점 (계섬월 Build)
 *
 * 사용법:
 *   node --experimental-strip-types scripts/data-validator/cli.ts <command> [options]
 *
 * commands: schema | refs | balance | report | all
 * options:
 *   --domain=<id1,id2>     특정 도메인만 (skill,item,monster,encounter,scenario)
 *   --sigma=<n>            balance outlier 기준 (기본 2)
 *   --fail-on-warn         warn도 실패 처리
 *   --output=<path>        json/md 리포트 출력 경로
 *   --format=<fmt>         console|json|md (기본 console)
 *   --workspace=<path>     workspace root override
 */
import { fileURLToPath } from 'node:url';

import { auditBalance } from './validators/balance-outlier.ts';
import { auditReferences } from './validators/reference-auditor.ts';
import { validateAllSchemas } from './validators/schema-validator.ts';
import { emitReport, type ReporterFormat } from './reporters/error-reporter.ts';
import {
  DATA_DOMAIN_IDS,
  VALIDATOR_COMMAND_IDS,
  type DataDomainId,
  type DomainSummary,
  type ValidationFinding,
  type ValidationReport,
  type ValidatorCommandDescriptor,
  type ValidatorCommandId,
  type ValidatorCommandRequest,
} from './types.ts';

interface ParsedArgs extends ValidatorCommandRequest {
  readonly format: ReporterFormat;
}

const DEFAULT_DOMAIN_SUMMARY = (): Record<DataDomainId, DomainSummary> => ({
  skill:     { files: 0, records: 0, errors: 0, warns: 0 },
  item:      { files: 0, records: 0, errors: 0, warns: 0 },
  monster:   { files: 0, records: 0, errors: 0, warns: 0 },
  encounter: { files: 0, records: 0, errors: 0, warns: 0 },
  scenario:  { files: 0, records: 0, errors: 0, warns: 0 },
});

function nowIso(): string {
  return new Date().toISOString();
}

function summarize(
  command: ValidatorCommandId,
  startedAt: string,
  finishedAt: string,
  domainSummary: Record<DataDomainId, DomainSummary>,
  findings: readonly ValidationFinding[],
  failOnWarn: boolean,
): ValidationReport {
  for (const f of findings) {
    if (f.severity === 'error') domainSummary[f.domain].errors++;
    else if (f.severity === 'warn') domainSummary[f.domain].warns++;
  }
  let totalFiles = 0;
  let totalRecords = 0;
  let totalErrors = 0;
  let totalWarns = 0;
  for (const d of Object.values(domainSummary)) {
    totalFiles += d.files;
    totalRecords += d.records;
    totalErrors += d.errors;
    totalWarns += d.warns;
  }
  const durationMs = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
  const passed = totalErrors === 0 && (failOnWarn ? totalWarns === 0 : true);
  return {
    command,
    startedAt,
    finishedAt,
    durationMs,
    totals: { files: totalFiles, records: totalRecords, errors: totalErrors, warns: totalWarns },
    byDomain: domainSummary,
    findings,
    passed,
  };
}

async function runSchema(request: ValidatorCommandRequest): Promise<ValidationReport> {
  const startedAt = nowIso();
  const summary = DEFAULT_DOMAIN_SUMMARY();
  const results = await validateAllSchemas({ workspaceRoot: request.workspaceRoot });
  const findings: ValidationFinding[] = [];
  for (const r of results) {
    if (request.domains && !request.domains.includes(r.domain)) continue;
    summary[r.domain].files++;
    summary[r.domain].records += r.recordCount;
    findings.push(...r.findings);
  }
  return summarize('schema', startedAt, nowIso(), summary, findings, !!request.failOnWarn);
}

async function runRefs(request: ValidatorCommandRequest): Promise<ValidationReport> {
  const startedAt = nowIso();
  const summary = DEFAULT_DOMAIN_SUMMARY();
  const findings = await auditReferences(request.workspaceRoot);
  const filtered = request.domains
    ? findings.filter((f) => request.domains!.includes(f.domain))
    : findings;
  return summarize('refs', startedAt, nowIso(), summary, filtered, !!request.failOnWarn);
}

async function runBalance(request: ValidatorCommandRequest): Promise<ValidationReport> {
  const startedAt = nowIso();
  const summary = DEFAULT_DOMAIN_SUMMARY();
  const result = await auditBalance({ sigmaThreshold: request.sigmaThreshold }, request.workspaceRoot);
  const filtered = request.domains
    ? result.findings.filter((f) => request.domains!.includes(f.domain))
    : result.findings;
  return summarize('balance', startedAt, nowIso(), summary, filtered, !!request.failOnWarn);
}

async function runReport(request: ValidatorCommandRequest): Promise<ValidationReport> {
  // report 단독 — 사실상 all과 동일 동작 (json/md 출력 의도)
  return runAll({ ...request, command: 'report' });
}

async function runAll(request: ValidatorCommandRequest): Promise<ValidationReport> {
  const startedAt = nowIso();
  const summary = DEFAULT_DOMAIN_SUMMARY();
  const findings: ValidationFinding[] = [];

  // 1) schema
  const schemaResults = await validateAllSchemas({ workspaceRoot: request.workspaceRoot });
  for (const r of schemaResults) {
    if (request.domains && !request.domains.includes(r.domain)) continue;
    summary[r.domain].files++;
    summary[r.domain].records += r.recordCount;
    findings.push(...r.findings);
  }

  // 2) references
  const refFindings = await auditReferences(request.workspaceRoot);
  findings.push(...(request.domains ? refFindings.filter((f) => request.domains!.includes(f.domain)) : refFindings));

  // 3) balance
  const balanceResult = await auditBalance({ sigmaThreshold: request.sigmaThreshold }, request.workspaceRoot);
  findings.push(...(request.domains
    ? balanceResult.findings.filter((f) => request.domains!.includes(f.domain))
    : balanceResult.findings));

  return summarize(request.command === 'report' ? 'report' : 'all', startedAt, nowIso(), summary, findings, !!request.failOnWarn);
}

export const VALIDATOR_COMMANDS: Record<ValidatorCommandId, ValidatorCommandDescriptor> = {
  schema:  { id: 'schema',  labelKo: '스키마 검증',                   run: runSchema },
  refs:    { id: 'refs',    labelKo: '참조 무결성 audit',              run: runRefs },
  balance: { id: 'balance', labelKo: '밸런스 outlier 탐지',            run: runBalance },
  report:  { id: 'report',  labelKo: '전체 리포트 생성',              run: runReport },
  all:     { id: 'all',     labelKo: '전체 검증 (스키마+참조+밸런스)', run: runAll },
};

function parseArgs(argv: readonly string[]): ParsedArgs {
  const [, , command, ...rest] = argv;
  if (!command || !(VALIDATOR_COMMAND_IDS as readonly string[]).includes(command)) {
    const list = VALIDATOR_COMMAND_IDS.join(' | ');
    throw new TypeError(
      `[data-validator] command 필수. 사용법: cli.ts <${list}> [--domain=...] [--sigma=2] [--format=console|json|md]`,
    );
  }
  let domains: readonly DataDomainId[] | undefined;
  let sigma: number | undefined;
  let failOnWarn = false;
  let outputPath: string | undefined;
  let format: ReporterFormat = 'console';
  let workspaceRoot: string | undefined;

  for (const arg of rest) {
    if (arg === '--fail-on-warn') { failOnWarn = true; continue; }
    const [key, valueRaw] = arg.split('=', 2);
    const value = valueRaw ?? '';
    switch (key) {
      case '--domain': {
        const ids = value.split(',').map((s) => s.trim()).filter(Boolean);
        for (const id of ids) {
          if (!(DATA_DOMAIN_IDS as readonly string[]).includes(id)) {
            throw new TypeError(`[data-validator] 알 수 없는 도메인: ${id} (허용: ${DATA_DOMAIN_IDS.join(', ')})`);
          }
        }
        domains = ids as readonly DataDomainId[];
        break;
      }
      case '--sigma': {
        const n = Number(value);
        if (!Number.isFinite(n) || n <= 0) throw new TypeError(`[data-validator] --sigma=양수 필요`);
        sigma = n;
        break;
      }
      case '--output':    outputPath = value; break;
      case '--format': {
        if (value !== 'console' && value !== 'json' && value !== 'md') {
          throw new TypeError(`[data-validator] --format=console|json|md`);
        }
        format = value;
        break;
      }
      case '--workspace': workspaceRoot = value; break;
      default:
        throw new TypeError(`[data-validator] 알 수 없는 옵션: ${arg}`);
    }
  }

  return {
    command: command as ValidatorCommandId,
    domains,
    inputPath: undefined,
    outputPath,
    workspaceRoot,
    failOnWarn,
    sigmaThreshold: sigma,
    format,
  };
}

export async function main(argv: readonly string[] = process.argv): Promise<number> {
  const request = parseArgs(argv);
  const descriptor = VALIDATOR_COMMANDS[request.command];
  const report = await descriptor.run(request);
  await emitReport(report, {
    format: request.format,
    outputPath: request.outputPath,
  });
  return report.passed ? 0 : 1;
}

// 직접 실행 가드
const entryPath = process.argv[1] ? fileURLToPath(import.meta.url) : '';
if (entryPath && process.argv[1] && entryPath === process.argv[1]) {
  main(process.argv).then(
    (code) => process.exit(code),
    (err) => {
      // eslint-disable-next-line no-console
      console.error(err);
      process.exit(1);
    },
  );
}
