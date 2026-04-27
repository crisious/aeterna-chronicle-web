import * as fs from 'node:fs';
import * as path from 'node:path';

import type { StaticAuditSummary } from './types';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function renderMarkdownReport(summary: StaticAuditSummary): string {
  const lines: string[] = [
    '# WCAG 2.1 AAA 정적 접근성 감사 보고서',
    '',
    `- 실행 시각: ${summary.timestamp}`,
    `- 목표 등급: ${summary.wcagLevel}`,
    `- probe 실패 수: ${summary.failedProbes}`,
    `- 수동 잔여 체크: ${summary.manualChecksPending.join(', ') || '없음'}`,
    '',
    '| Probe | 상태 | 위반 수 |',
    '|------|------|--------|',
  ];

  for (const probe of summary.probes) {
    lines.push(`| ${probe.id} | ${probe.passed ? 'PASS' : 'FAIL'} | ${probe.violations.length} |`);
  }

  for (const probe of summary.probes) {
    lines.push('', `## ${probe.id}`);
    if (probe.violations.length === 0) {
      lines.push('- 위반 없음');
      continue;
    }

    for (const violation of probe.violations) {
      lines.push(`- [${violation.severity}] ${violation.code}: ${violation.message}`);
    }
  }

  return lines.join('\n');
}

export function renderHtmlReport(summary: StaticAuditSummary): string {
  const rows = summary.probes
    .map((probe) => `<tr><td>${escapeHtml(probe.id)}</td><td>${probe.passed ? 'PASS' : 'FAIL'}</td><td>${probe.violations.length}</td></tr>`)
    .join('');

  const sections = summary.probes
    .map((probe) => {
      const items = probe.violations.length === 0
        ? '<li>위반 없음</li>'
        : probe.violations
          .map((violation) => `<li><strong>${escapeHtml(violation.code)}</strong> [${escapeHtml(violation.severity)}] ${escapeHtml(violation.message)}</li>`)
          .join('');

      return `<section><h2>${escapeHtml(probe.id)}</h2><ul>${items}</ul></section>`;
    })
    .join('');

  return [
    '<!doctype html>',
    '<html lang="ko">',
    '<head>',
    '<meta charset="utf-8" />',
    '<title>Aeterna A11Y Audit</title>',
    '<style>body{font-family:Segoe UI,sans-serif;margin:32px;background:#111;color:#eee}table{border-collapse:collapse;width:100%;margin:16px 0}td,th{border:1px solid #444;padding:8px;text-align:left}section{margin-top:24px}strong{color:#ffd700}</style>',
    '</head>',
    '<body>',
    '<h1>WCAG 2.1 AAA 정적 접근성 감사 보고서</h1>',
    `<p>실행 시각: ${escapeHtml(summary.timestamp)}</p>`,
    `<p>probe 실패 수: ${summary.failedProbes}</p>`,
    '<table><thead><tr><th>Probe</th><th>상태</th><th>위반 수</th></tr></thead>',
    `<tbody>${rows}</tbody></table>`,
    sections,
    '</body>',
    '</html>',
  ].join('');
}

export function writeAuditArtifacts(rootDir: string, summary: StaticAuditSummary): void {
  const outputDir = path.join(rootDir, 'tests', 'reports', 'a11y');
  fs.mkdirSync(outputDir, { recursive: true });

  fs.writeFileSync(path.join(outputDir, 'summary.json'), JSON.stringify(summary, null, 2), 'utf-8');
  fs.writeFileSync(path.join(outputDir, 'index.md'), renderMarkdownReport(summary), 'utf-8');
  fs.writeFileSync(path.join(outputDir, 'report.html'), renderHtmlReport(summary), 'utf-8');
}
