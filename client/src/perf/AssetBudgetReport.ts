/**
 * client/src/perf/AssetBudgetReport.ts — 빌드 산출물 사이즈 예산 리포터 (Build)
 *
 * 스프린트: 에테르나 크로니클 성능 최적화 (Build 단계)
 * 작성: 계섬월 (Staff Engineer)
 *
 * 책임:
 *   - dist/ 산출물 스캔 → 분류 + bytes/gzipBytes 산정
 *   - PERF_BUDGETS 임계 대조 → violations 추출
 *   - PASS/WARN/FAIL 판정 → CI 게이트 exit code 매핑
 *
 * 비책임:
 *   - 실제 압축/atlas 빌드 (vite plugin / TexturePacker)
 *   - 런타임 측정 (HotspotProfiler/SceneMemoryGuard)
 *
 * Node 전용 — fs/zlib 사용. 브라우저 번들에 포함되지 않도록 import 경로 격리.
 */

import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { gzipSync } from 'node:zlib';

import {
  PERF_BUDGETS,
  type AssetBudgetEntry,
  type AssetBudgetReport,
  type PerfBudgetKey,
} from './types';

export interface AssetBudgetScannerConfig {
  rootDir: string;
  initialBundlePatterns: string[];
  gzipExtensions: string[];
  warnThresholdPct: number;
}

export const DEFAULT_BUDGET_SCANNER_CONFIG: AssetBudgetScannerConfig = {
  rootDir: 'dist',
  initialBundlePatterns: ['index.html', 'assets/index-*.js', 'assets/index-*.css'],
  gzipExtensions: ['.js', '.css', '.json', '.svg', '.html'],
  warnThresholdPct: 80,
};

export interface FileMeta {
  path: string;
  rawBytes: number;
  gzipBytes?: number;
  ext: string;
}

export type AssetKindClassifier = (file: FileMeta) => AssetBudgetEntry['kind'];

/** 단순 glob — '*' 한 종류만 허용 (보안/속도) */
function globMatch(pattern: string, target: string): boolean {
  const normalized = target.replace(/\\/g, '/');
  const parts = pattern.split('*');
  if (parts.length === 1) return normalized === pattern;
  let idx = 0;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part === '') continue;
    if (i === 0) {
      if (!normalized.startsWith(part)) return false;
      idx = part.length;
      continue;
    }
    if (i === parts.length - 1) {
      return normalized.endsWith(part) && normalized.length - part.length >= idx;
    }
    const found = normalized.indexOf(part, idx);
    if (found < 0) return false;
    idx = found + part.length;
  }
  return true;
}

export const defaultClassifier: AssetKindClassifier = (file) => {
  const ext = file.ext.toLowerCase();
  const p = file.path.replace(/\\/g, '/').toLowerCase();
  if (ext === '.png' || ext === '.jpg' || ext === '.jpeg' || ext === '.webp') {
    if (p.includes('/atlas/') || p.includes('/atlases/') || /atlas[-_]/.test(p)) {
      return 'atlas';
    }
    return 'image';
  }
  if (ext === '.mp3' || ext === '.ogg' || ext === '.wav' || ext === '.m4a') {
    return 'audio';
  }
  if (ext === '.json') return 'json';
  if (ext === '.js' || ext === '.mjs' || ext === '.cjs' || ext === '.css') {
    return 'code';
  }
  return 'other';
};

export class AssetBudgetReporter {
  private config: AssetBudgetScannerConfig;
  private classifier: AssetKindClassifier;

  constructor(
    config: AssetBudgetScannerConfig = DEFAULT_BUDGET_SCANNER_CONFIG,
    classifier: AssetKindClassifier = defaultClassifier,
  ) {
    this.config = { ...config };
    this.classifier = classifier;
  }

  async scan(): Promise<FileMeta[]> {
    const root = this.config.rootDir;
    const files: FileMeta[] = [];
    await this.walk(root, files);
    return files;
  }

  private async walk(dir: string, out: FileMeta[]): Promise<void> {
    let entries: import('node:fs').Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await this.walk(full, out);
        continue;
      }
      if (!entry.isFile()) continue;
      const ext = path.extname(entry.name).toLowerCase();
      let raw: Buffer;
      try {
        raw = await fs.readFile(full);
      } catch {
        continue;
      }
      const meta: FileMeta = {
        path: full,
        rawBytes: raw.byteLength,
        ext,
      };
      if (this.config.gzipExtensions.includes(ext)) {
        try {
          meta.gzipBytes = gzipSync(raw).byteLength;
        } catch {
          // gzip 실패는 fatal 아님 — gzipBytes 미정으로 두고 raw로 평가
        }
      }
      out.push(meta);
    }
  }

  evaluate(files: FileMeta[]): AssetBudgetEntry[] {
    return files.map((f) => {
      const kind = this.classifier(f);
      const entry: AssetBudgetEntry = {
        path: f.path,
        kind,
        rawBytes: f.rawBytes,
        gzipBytes: f.gzipBytes,
        overBudget: false,
      };
      const budgetKey = matchBudgetKey(entry);
      if (budgetKey) {
        const limitBytes = PERF_BUDGETS[budgetKey] * 1024;
        const measured = entry.gzipBytes ?? entry.rawBytes;
        if (measured > limitBytes) {
          entry.overBudget = true;
          entry.budgetKey = budgetKey;
        }
      }
      return entry;
    });
  }

  async scanAndReport(): Promise<AssetBudgetReport> {
    const files = await this.scan();
    const entries = this.evaluate(files);

    let totalRawBytes = 0;
    let totalGzipBytes = 0;
    let initialBundleBytes = 0;
    const violations: AssetBudgetEntry[] = [];

    for (const e of entries) {
      totalRawBytes += e.rawBytes;
      totalGzipBytes += e.gzipBytes ?? e.rawBytes;
      if (this.isInitialBundle(e.path)) {
        initialBundleBytes += e.gzipBytes ?? e.rawBytes;
      }
      if (e.overBudget) violations.push(e);
    }

    // 초기 번들 합계 자체가 예산 초과인지 별도 검사
    const initialBudgetBytes = PERF_BUDGETS.initialBundleMaxKb * 1024;
    const warnBytes = initialBudgetBytes * (this.config.warnThresholdPct / 100);
    let verdict: 'PASS' | 'WARN' | 'FAIL' = 'PASS';
    if (initialBundleBytes > initialBudgetBytes || violations.length > 0) {
      verdict = 'FAIL';
    } else if (initialBundleBytes > warnBytes) {
      verdict = 'WARN';
    }

    return {
      generatedAt: new Date().toISOString(),
      totalRawBytes,
      totalGzipBytes,
      initialBundleBytes,
      violations,
      verdict,
    };
  }

  private isInitialBundle(filePath: string): boolean {
    const rel = path.relative(this.config.rootDir, filePath).replace(/\\/g, '/');
    return this.config.initialBundlePatterns.some((p) => globMatch(p, rel));
  }

  formatReport(report: AssetBudgetReport, mode: 'tty' | 'json' = 'tty'): string {
    if (mode === 'json') {
      return JSON.stringify(report, null, 2);
    }
    const noColor = !!process.env.NO_COLOR;
    const color = (code: string, s: string): string =>
      noColor ? s : `[${code}m${s}[0m`;
    const verdictColor =
      report.verdict === 'PASS' ? '32' : report.verdict === 'WARN' ? '33' : '31';

    const kb = (b: number): string => `${(b / 1024).toFixed(1)} KB`;
    const lines: string[] = [];
    lines.push(`Asset Budget Report — ${report.generatedAt}`);
    lines.push(`  Verdict:        ${color(verdictColor, report.verdict)}`);
    lines.push(`  Total raw:      ${kb(report.totalRawBytes)}`);
    lines.push(`  Total gzip:     ${kb(report.totalGzipBytes)}`);
    lines.push(
      `  Initial bundle: ${kb(report.initialBundleBytes)} / ${PERF_BUDGETS.initialBundleMaxKb} KB`,
    );
    if (report.violations.length === 0) {
      lines.push(`  Violations:     none`);
    } else {
      lines.push(`  Violations:     ${report.violations.length}`);
      for (const v of report.violations) {
        const measured = v.gzipBytes ?? v.rawBytes;
        lines.push(
          `    - [${v.kind}] ${v.path} → ${kb(measured)} (budget: ${v.budgetKey})`,
        );
      }
    }
    return lines.join('\n');
  }
}

/** 단일 항목이 어느 예산을 초과했는지 키 매칭 */
export function matchBudgetKey(entry: AssetBudgetEntry): PerfBudgetKey | undefined {
  if (entry.kind === 'atlas') return 'atlasMaxKb';
  // 코드/JSON은 initialBundle 합산에서 평가하므로 단일 파일 매칭은 atlas만
  return undefined;
}
