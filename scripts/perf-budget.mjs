#!/usr/bin/env node
/**
 * scripts/perf-budget.mjs — 빌드 산출물 사이즈 예산 CI 게이트
 *
 * 스프린트: 에테르나 크로니클 성능 최적화 (Build 단계)
 * 작성: 계섬월 (Staff Engineer)
 *
 * 사용:
 *   node scripts/perf-budget.mjs                # client/dist 스캔 → tty 출력
 *   node scripts/perf-budget.mjs --json         # JSON 출력
 *   node scripts/perf-budget.mjs --root=dist    # 루트 디렉토리 변경
 *
 * Exit code:
 *   0 = PASS / WARN
 *   1 = FAIL  (CI 게이트 차단)
 *
 * AssetBudgetReporter는 TS이므로 본 CLI는 동일 로직의 ESM 미러.
 * PERF_BUDGETS 임계는 SSOT — client/src/perf/types.ts 와 동일하게 유지.
 */

import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { gzipSync } from 'node:zlib';

// SSOT 미러 — types.ts PERF_BUDGETS 와 동일해야 함
const PERF_BUDGETS = {
  initialBundleMaxKb: 2048,
  atlasMaxKb: 4096,
};

const args = process.argv.slice(2);
const flag = (name) => args.find((a) => a === `--${name}`);
const valueOf = (name) => {
  const found = args.find((a) => a.startsWith(`--${name}=`));
  return found ? found.slice(name.length + 3) : undefined;
};

const ROOT = valueOf('root') ?? 'client/dist';
const MODE = flag('json') ? 'json' : 'tty';
const WARN_PCT = 80;
const GZIP_EXT = new Set(['.js', '.css', '.json', '.svg', '.html']);
const INITIAL_PATTERNS = [
  'index.html',
  'assets/index-*.js',
  'assets/index-*.css',
];

const noColor = !!process.env.NO_COLOR;
const color = (code, s) => (noColor ? s : `[${code}m${s}[0m`);
const kb = (b) => `${(b / 1024).toFixed(1)} KB`;

function classify(file) {
  const ext = file.ext;
  const p = file.path.replace(/\\/g, '/').toLowerCase();
  if (['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
    if (p.includes('/atlas/') || p.includes('/atlases/') || /atlas[-_]/.test(p)) {
      return 'atlas';
    }
    return 'image';
  }
  if (['.mp3', '.ogg', '.wav', '.m4a'].includes(ext)) return 'audio';
  if (ext === '.json') return 'json';
  if (['.js', '.mjs', '.cjs', '.css'].includes(ext)) return 'code';
  return 'other';
}

function globMatch(pattern, target) {
  const norm = target.replace(/\\/g, '/');
  const parts = pattern.split('*');
  if (parts.length === 1) return norm === pattern;
  let idx = 0;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part === '') continue;
    if (i === 0) {
      if (!norm.startsWith(part)) return false;
      idx = part.length;
      continue;
    }
    if (i === parts.length - 1) {
      return norm.endsWith(part) && norm.length - part.length >= idx;
    }
    const found = norm.indexOf(part, idx);
    if (found < 0) return false;
    idx = found + part.length;
  }
  return true;
}

async function walk(dir, out) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full, out);
      continue;
    }
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    let raw;
    try {
      raw = await fs.readFile(full);
    } catch {
      continue;
    }
    const meta = { path: full, rawBytes: raw.byteLength, ext };
    if (GZIP_EXT.has(ext)) {
      try {
        meta.gzipBytes = gzipSync(raw).byteLength;
      } catch {
        /* skip */
      }
    }
    out.push(meta);
  }
}

function evaluate(files) {
  return files.map((f) => {
    const kind = classify(f);
    const entry = {
      path: f.path,
      kind,
      rawBytes: f.rawBytes,
      gzipBytes: f.gzipBytes,
      overBudget: false,
    };
    if (kind === 'atlas') {
      const limit = PERF_BUDGETS.atlasMaxKb * 1024;
      const measured = entry.gzipBytes ?? entry.rawBytes;
      if (measured > limit) {
        entry.overBudget = true;
        entry.budgetKey = 'atlasMaxKb';
      }
    }
    return entry;
  });
}

function isInitial(p) {
  const rel = path.relative(ROOT, p).replace(/\\/g, '/');
  return INITIAL_PATTERNS.some((pat) => globMatch(pat, rel));
}

(async () => {
  const files = [];
  await walk(ROOT, files);
  if (files.length === 0) {
    const msg = `[perf-budget] 스캔 대상 없음 — ROOT='${ROOT}' 비어 있습니다. (빌드 미수행?)`;
    if (MODE === 'json') {
      console.log(JSON.stringify({ verdict: 'WARN', reason: msg }, null, 2));
    } else {
      console.warn(msg);
    }
    process.exit(0);
  }

  const entries = evaluate(files);
  let totalRawBytes = 0;
  let totalGzipBytes = 0;
  let initialBundleBytes = 0;
  const violations = [];
  for (const e of entries) {
    totalRawBytes += e.rawBytes;
    totalGzipBytes += e.gzipBytes ?? e.rawBytes;
    if (isInitial(e.path)) {
      initialBundleBytes += e.gzipBytes ?? e.rawBytes;
    }
    if (e.overBudget) violations.push(e);
  }

  const initialBudgetBytes = PERF_BUDGETS.initialBundleMaxKb * 1024;
  const warnBytes = initialBudgetBytes * (WARN_PCT / 100);
  let verdict = 'PASS';
  if (initialBundleBytes > initialBudgetBytes || violations.length > 0) {
    verdict = 'FAIL';
  } else if (initialBundleBytes > warnBytes) {
    verdict = 'WARN';
  }

  const report = {
    generatedAt: new Date().toISOString(),
    totalRawBytes,
    totalGzipBytes,
    initialBundleBytes,
    violations,
    verdict,
  };

  if (MODE === 'json') {
    console.log(JSON.stringify(report, null, 2));
  } else {
    const vc = verdict === 'PASS' ? '32' : verdict === 'WARN' ? '33' : '31';
    console.log(`Asset Budget Report — ${report.generatedAt}`);
    console.log(`  Verdict:        ${color(vc, verdict)}`);
    console.log(`  Total raw:      ${kb(totalRawBytes)}`);
    console.log(`  Total gzip:     ${kb(totalGzipBytes)}`);
    console.log(
      `  Initial bundle: ${kb(initialBundleBytes)} / ${PERF_BUDGETS.initialBundleMaxKb} KB`,
    );
    if (violations.length === 0) {
      console.log(`  Violations:     none`);
    } else {
      console.log(`  Violations:     ${violations.length}`);
      for (const v of violations) {
        const measured = v.gzipBytes ?? v.rawBytes;
        console.log(
          `    - [${v.kind}] ${v.path} → ${kb(measured)} (budget: ${v.budgetKey})`,
        );
      }
    }
  }

  process.exit(verdict === 'FAIL' ? 1 : 0);
})().catch((err) => {
  console.error('[perf-budget] 실행 실패:', err);
  process.exit(2);
});
