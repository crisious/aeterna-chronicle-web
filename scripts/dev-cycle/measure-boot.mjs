#!/usr/bin/env node
// ── boot 게이트 — Phaser dev server 부팅 시간 측정 ─────────────
// 사용: node scripts/dev-cycle/measure-boot.mjs [--cold|--warm] [--port=5173]
// 종료 코드: 0 PASS · 1 BLOCK · 2 WARN · 3 ERROR
// SSOT: docs/release/devloop-error-messages.md §1, dev_gate_messages.ts

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';

const ROOT = resolve(new URL('../../', import.meta.url).pathname.replace(/^\//, ''));
const CLIENT = join(ROOT, 'client');
const STATE_DIR = join(ROOT, '.ac');
const STATE_FILE = join(STATE_DIR, 'boot-trend.json');
const CRASH_LOG = join(STATE_DIR, 'dev-crash.log');

const BUDGET_COLD_MS = 12_000;
const BUDGET_WARM_MS = 4_000;
const WARN_TREND_MAX = 5;

const args = new Map(
    process.argv.slice(2).map((a) => {
        const [k, v] = a.split('=');
        return [k.replace(/^--/, ''), v ?? true];
    }),
);
const mode = args.has('warm') ? 'warm' : 'cold';
const port = Number(args.get('port') ?? 5173);

function ensureStateDir() {
    if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
}

function loadTrend() {
    ensureStateDir();
    if (!existsSync(STATE_FILE)) return { warns: [] };
    try {
        return JSON.parse(readFileSync(STATE_FILE, 'utf8'));
    } catch {
        return { warns: [] };
    }
}

function saveTrend(state) {
    writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

async function clearViteCache() {
    const dirs = [join(CLIENT, 'node_modules/.vite'), join(CLIENT, '.vite')];
    for (const d of dirs) {
        if (existsSync(d)) rmSync(d, { recursive: true, force: true });
    }
}

function formatMs(ms) {
    return Math.round(ms).toLocaleString();
}

function emit(state, key, message, hint) {
    const stamp = new Date().toISOString();
    process.stdout.write(`[${stamp}] dev.gate.boot.${state.toLowerCase()}.${key}\n`);
    process.stdout.write(`  ${message}\n`);
    if (hint) process.stdout.write(`  hint: ${hint}\n`);
}

async function measure() {
    if (mode === 'cold') await clearViteCache();

    const startedAt = performance.now();
    const child = spawn('npm', ['run', 'dev', '--', `--port=${port}`, '--host=127.0.0.1'], {
        cwd: CLIENT,
        env: { ...process.env, FORCE_COLOR: '0' },
        shell: true,
    });

    let elapsed = 0;
    let resolved = false;
    let stderrBuf = '';

    return new Promise((resolveP) => {
        const onReady = () => {
            if (resolved) return;
            resolved = true;
            elapsed = performance.now() - startedAt;
            child.kill('SIGTERM');
            // grace timeout to ensure SIGKILL on Windows
            setTimeout(() => child.kill('SIGKILL'), 1500);
        };

        const onLine = (chunk) => {
            const s = chunk.toString();
            // Vite ready signature
            if (/ready in \d+\s*ms|Local:\s+http/.test(s)) onReady();
        };

        child.stdout.on('data', onLine);
        child.stderr.on('data', (c) => {
            stderrBuf += c.toString();
            onLine(c);
        });

        child.on('exit', (code) => {
            if (!resolved) {
                ensureStateDir();
                writeFileSync(CRASH_LOG, stderrBuf);
                emit(
                    'ERROR',
                    'crash',
                    `🟠 dev server 충돌 — vite 프로세스 종료 코드 ${code}. 로그 \`.ac/dev-crash.log\` 확인.`,
                );
                resolveP({ exitCode: 3 });
                return;
            }
            resolveP({ exitCode: 0, elapsed });
        });

        // hard timeout — guard against hang
        setTimeout(() => {
            if (!resolved) {
                resolved = true;
                child.kill('SIGKILL');
                elapsed = performance.now() - startedAt;
                resolveP({ exitCode: 1, elapsed, timedOut: true });
            }
        }, BUDGET_COLD_MS * 2);
    });
}

(async () => {
    const trend = loadTrend();
    const result = await measure();

    if (result.exitCode === 3) {
        process.exit(3);
    }

    const elapsed = result.elapsed ?? 0;
    const budget = mode === 'cold' ? BUDGET_COLD_MS : BUDGET_WARM_MS;
    const percent = Math.round((elapsed / budget) * 100);

    if (result.timedOut || elapsed > budget) {
        emit(
            'BLOCK',
            'timeout',
            `🔴 dev server 부팅 ${formatMs(elapsed)}ms — ${formatMs(budget)}ms 초과. client/vite.config.ts optimizeDeps 점검.`,
            '구름이 짙사옵니다. optimizeDeps.include에 Phaser sub-paths를 명시하시지요.',
        );
        process.exit(1);
    }

    if (percent >= 80) {
        trend.warns = (trend.warns ?? []).concat({ at: Date.now(), elapsed, mode });
        // keep last 30 only
        trend.warns = trend.warns.slice(-30);
        const recent = trend.warns.filter((w) => Date.now() - w.at < 7 * 24 * 3600 * 1000).length;
        saveTrend(trend);
        emit(
            'WARN',
            'slow',
            `🟡 부팅 ${formatMs(elapsed)}ms — 목표 ${formatMs(budget)}ms 근접 (${percent}%). 누적 ${recent}/${WARN_TREND_MAX}회.`,
        );
        process.exit(recent > WARN_TREND_MAX ? 1 : 2);
    }

    saveTrend(trend);
    emit(
        'PASS',
        'ready',
        `🟢 dev server 부팅 완료 (${formatMs(elapsed)}ms · ${mode})`,
        '달이 떠올랐사옵니다. 개발을 시작하시지요.',
    );
    process.exit(0);
})();
