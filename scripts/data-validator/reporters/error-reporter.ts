/**
 * scripts/data-validator/reporters/error-reporter.ts — 검증 결과 출력 (계섬월 Build)
 *
 * 출력 채널:
 *   - console: 사람 가독, ANSI 색상 + LocationCue 한 줄 + hint
 *   - json:    CI/봇 소비, ValidationReport 그대로
 *   - md:      CHANGELOG/PR 본문 첨부
 */
import fs from 'node:fs';
import path from 'node:path';

import type {
  DataDomainId,
  ValidationFinding,
  ValidationKind,
  ValidationReport,
  ValidationSeverity,
} from '../types.ts';
import { formatLocation } from '../errors.ts';

export type ReporterFormat = 'console' | 'json' | 'md';

export interface ReporterOptions {
  readonly format: ReporterFormat;
  readonly outputPath?: string;
  readonly color?: boolean;
  readonly maxFindings?: number;
}

const COLOR = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
};

function severityColor(sev: ValidationSeverity, enable: boolean): { open: string; close: string } {
  if (!enable) return { open: '', close: '' };
  if (sev === 'error') return { open: COLOR.red + COLOR.bold, close: COLOR.reset };
  if (sev === 'warn') return { open: COLOR.yellow, close: COLOR.reset };
  return { open: COLOR.gray, close: COLOR.reset };
}

export function formatFindingLine(finding: ValidationFinding, color = false): string {
  const sev = finding.severity.toUpperCase().padEnd(5);
  const c = severityColor(finding.severity, color);
  const head = `${c.open}[${sev}]${c.close} ${finding.code}  ${formatLocation(finding.location)}`;
  const body = `        ${finding.messageKo}`;
  const hint = finding.hint ? `\n        ↳ ${finding.hint}` : '';
  const snippet = finding.location.snippet ? `\n${finding.location.snippet}` : '';
  return `${head}\n${body}${hint}${snippet}`;
}

function emitConsole(report: ValidationReport, options: ReporterOptions): void {
  const color = options.color ?? !!process.stdout.isTTY;
  const max = options.maxFindings ?? 50;
  const out: string[] = [];
  out.push(
    `\n=== data-validator: ${report.command} (${report.durationMs}ms) ===`,
    `files=${report.totals.files} records=${report.totals.records} errors=${report.totals.errors} warns=${report.totals.warns}`,
    `passed=${report.passed ? 'YES' : 'NO'}`,
    '',
  );

  // 도메인 요약
  for (const domain of Object.keys(report.byDomain) as DataDomainId[]) {
    const s = report.byDomain[domain];
    if (s.records === 0 && s.errors === 0 && s.warns === 0) continue;
    out.push(`  · ${domain.padEnd(10)} files=${s.files} records=${s.records} err=${s.errors} warn=${s.warns}`);
  }
  out.push('');

  // 심각도 우선 정렬
  const sorted = [...report.findings].sort(
    (a, b) => severityRank(a.severity) - severityRank(b.severity),
  );
  for (const finding of sorted.slice(0, max)) {
    out.push(formatFindingLine(finding, color));
    out.push('');
  }
  if (sorted.length > max) {
    out.push(`...${sorted.length - max}건 추가 (전체는 --output json/md 로 확인)`);
  }
  // eslint-disable-next-line no-console
  console.log(out.join('\n'));
}

function severityRank(sev: ValidationSeverity): number {
  if (sev === 'error') return 0;
  if (sev === 'warn') return 1;
  return 2;
}

function emitJson(report: ValidationReport, options: ReporterOptions): void {
  const target = options.outputPath ?? 'data-validator-report.json';
  fs.mkdirSync(path.dirname(path.resolve(target)), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(report, null, 2), 'utf8');
}

function emitMarkdown(report: ValidationReport, options: ReporterOptions): void {
  const target = options.outputPath ?? 'data-validator-report.md';
  const lines: string[] = [];
  lines.push(`# data-validator 리포트 — \`${report.command}\``);
  lines.push('');
  lines.push(`- 실행: ${report.startedAt} → ${report.finishedAt} (${report.durationMs}ms)`);
  lines.push(`- 결과: **${report.passed ? '✅ PASS' : '❌ FAIL'}** (errors=${report.totals.errors}, warns=${report.totals.warns})`);
  lines.push(`- 파일=${report.totals.files} · 레코드=${report.totals.records}`);
  lines.push('');
  lines.push('## 도메인 요약');
  lines.push('');
  lines.push('| 도메인 | 파일 | 레코드 | 에러 | 경고 |');
  lines.push('|---|---:|---:|---:|---:|');
  for (const domain of Object.keys(report.byDomain) as DataDomainId[]) {
    const s = report.byDomain[domain];
    lines.push(`| ${domain} | ${s.files} | ${s.records} | ${s.errors} | ${s.warns} |`);
  }
  lines.push('');
  lines.push('## Findings');
  lines.push('');
  const grouped = groupFindings(report.findings);
  for (const [kind, list] of grouped) {
    lines.push(`### ${kind} (${list.length})`);
    lines.push('');
    for (const f of list) {
      lines.push(`- **[${f.severity.toUpperCase()}] ${f.code}** \`${formatLocation(f.location)}\``);
      lines.push(`  - ${f.messageKo}`);
      if (f.hint) lines.push(`  - 힌트: ${f.hint}`);
    }
    lines.push('');
  }
  fs.mkdirSync(path.dirname(path.resolve(target)), { recursive: true });
  fs.writeFileSync(target, lines.join('\n'), 'utf8');
}

function groupFindings(findings: readonly ValidationFinding[]): Map<ValidationKind, ValidationFinding[]> {
  const m = new Map<ValidationKind, ValidationFinding[]>();
  for (const f of findings) {
    if (!m.has(f.kind)) m.set(f.kind, []);
    m.get(f.kind)!.push(f);
  }
  return m;
}

export async function emitReport(report: ValidationReport, options: ReporterOptions): Promise<void> {
  switch (options.format) {
    case 'console': emitConsole(report, options); return;
    case 'json':    emitJson(report, options); return;
    case 'md':      emitMarkdown(report, options); return;
    default: {
      const exhaustive: never = options.format;
      throw new TypeError(`[data-validator] unsupported format: ${exhaustive as string}`);
    }
  }
}
