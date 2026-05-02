#!/usr/bin/env node
// ── verify-trend 분석기 — .ac/verify-trend.json 7일 롤업 ─────────────
// 작성: 심요연 (Data Analyst) · 2026-05-01
// 토픽: verify-core.mjs 시나리오 3종 실배선
// 사용: node scripts/analytics/verify-trend.mjs [--window=7d|30d|all] [--json]
// 출력: passRate, p50/p95 totalElapsed, overBudget 누적, 회귀 델타
//
// "수치가 말해주는 바는 — 검의 무뎌짐인지, 자루의 헐거움인지"

import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(new URL('../../', import.meta.url).pathname.replace(/^\//, ''));
const TREND_FILE = join(ROOT, '.ac', 'verify-trend.json');
const BASELINE_FILE = join(ROOT, 'tests', 'benchmarks', 'verify-core-baseline.json');

const args = new Map(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.split('=');
    return [k.replace(/^--/, ''), v ?? true];
  }),
);
const windowArg = args.get('window') ?? '7d';
const asJson = args.get('json') === true;

const WINDOW_MS = {
  '7d': 7 * 24 * 3600 * 1000,
  '30d': 30 * 24 * 3600 * 1000,
  all: Number.POSITIVE_INFINITY,
}[windowArg] ?? 7 * 24 * 3600 * 1000;

function loadJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return fallback;
  }
}

function quantile(sorted, q) {
  if (sorted.length === 0) return null;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

function median(arr) {
  return quantile([...arr].sort((a, b) => a - b), 0.5);
}

const trend = loadJson(TREND_FILE, { runs: [] });
const baseline = loadJson(BASELINE_FILE, { promise: { totalMaxSec: 60 }, budgets: { total: { softSec: 60 } } });

const now = Date.now();
const inWindow = (trend.runs ?? []).filter((r) => now - r.at < WINDOW_MS);
const elapsedAll = inWindow.map((r) => r.totalElapsed);
const elapsedPass = inWindow.filter((r) => r.ok).map((r) => r.totalElapsed);
const sortedAll = [...elapsedAll].sort((a, b) => a - b);

const promiseSec = baseline.promise?.totalMaxSec ?? 60;
const overBudget = inWindow.filter((r) => r.totalElapsed > promiseSec).length;

const recent7 = inWindow.slice(-10).map((r) => r.totalElapsed);
const baselineMedian = median(inWindow.slice(0, Math.max(1, inWindow.length - 10)).map((r) => r.totalElapsed)) ?? null;
const recentMedian = median(recent7) ?? null;
const regressionPct =
  baselineMedian && recentMedian ? ((recentMedian - baselineMedian) / baselineMedian) * 100 : null;

const summary = {
  window: windowArg,
  runs: inWindow.length,
  passCount: elapsedPass.length,
  passRate: inWindow.length > 0 ? elapsedPass.length / inWindow.length : null,
  overBudget,
  promiseSec,
  p50: quantile(sortedAll, 0.5),
  p95: quantile(sortedAll, 0.95),
  min: sortedAll[0] ?? null,
  max: sortedAll[sortedAll.length - 1] ?? null,
  regressionPct,
  alert: {
    overBudgetExceedsThreshold: overBudget >= (baseline.trendThresholds?.consecutiveOverBudget ?? 3),
    regressionExceedsThreshold:
      regressionPct !== null &&
      regressionPct > (baseline.trendThresholds?.regressionDeltaPct ?? 25),
  },
};

if (asJson) {
  process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
  process.exit(0);
}

const fmt = (v, digits = 1) => (v == null ? '—' : v.toFixed(digits));
const lines = [
  `verify-trend ${windowArg} 윈도우 — 본궁의 살핌`,
  `─────────────────────────────────────────────`,
  `실행 횟수            ${summary.runs}회`,
  `통과율               ${fmt((summary.passRate ?? 0) * 100, 1)}% (${summary.passCount}/${summary.runs})`,
  `예산 초과 (>${promiseSec}s)   ${summary.overBudget}회`,
  `중앙값 (p50)         ${fmt(summary.p50)}s`,
  `상위 5% (p95)        ${fmt(summary.p95)}s`,
  `최저/최고            ${fmt(summary.min)}s / ${fmt(summary.max)}s`,
  `회귀 델타            ${summary.regressionPct == null ? '—' : `${fmt(summary.regressionPct)}%`}`,
  ``,
  `경보:`,
  `  예산 누적 초과     ${summary.alert.overBudgetExceedsThreshold ? '🔴 임계 초과' : '🟢 정상'}`,
  `  회귀 의심          ${summary.alert.regressionExceedsThreshold ? '🔴 +25% 초과' : '🟢 정상'}`,
];
process.stdout.write(lines.join('\n') + '\n');
process.exit(summary.alert.overBudgetExceedsThreshold || summary.alert.regressionExceedsThreshold ? 2 : 0);
