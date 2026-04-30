#!/usr/bin/env node
// ── boot 게이트 — Phaser dev server 부팅 시간 측정 ─────────────
// 사용: node scripts/dev-cycle/measure-boot.mjs [--cold|--warm] [--port=5173]
// 종료 코드: 0 PASS · 1 BLOCK · 2 WARN · 3 ERROR
// SSOT: docs/release/devloop-error-messages.md §1, dev_gate_messages.ts

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { C, colorize, bar, icon } from './cli-colors.mjs';

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
    const head = `${colorize(state, icon(state))} ${C.dim}[${stamp}]${C.reset} ${C.dim}dev.gate.boot.${state.toLowerCase()}.${key}${C.reset}`;
    process.stdout.write(`${head}\n  ${message}\n`);
    if (hint) process.stdout.write(`  ${C.info}처방${C.reset} ${C.dim}${hint}${C.reset}\n`);
}

// ── 부팅 4단계 진행률 — 가춘운 §2.1 미러 ────────────────────────
// vite (0~30%) · ts compile (30~60%) · assets manifest (60~85%) · phaser warm-up (85~100%)
const STAGES = [
    { name: 'vite           ', re: /vite\s+v\d|optimizing\s+deps/i, weight: 30 },
    { name: 'ts compile     ', re: /tsc|typecheck|tsconfig|building/i, weight: 30 },
    { name: 'assets manifest', re: /transforming|loading|manifest|module\s+graph/i, weight: 25 },
    { name: 'phaser warm-up ', re: /ready in|local:\s+http/i, weight: 15 },
];

function makeProgress(startedAt) {
    const reached = STAGES.map(() => 0); // 0 = 미진입, 1 = 진입(반쯤), 2 = 완료
    let lastRender = 0;
    return {
        observe(line) {
            for (let i = 0; i < STAGES.length; i++) {
                if (reached[i] < 2 && STAGES[i].re.test(line)) {
                    // 다음 단계 신호가 오면 이전 단계는 자동 완료
                    for (let j = 0; j < i; j++) reached[j] = 2;
                    reached[i] = Math.max(reached[i], 1);
                }
            }
        },
        complete() {
            for (let i = 0; i < STAGES.length; i++) reached[i] = 2;
        },
        render(force = false) {
            const now = performance.now();
            if (!force && now - lastRender < 200) return;
            lastRender = now;
            if (!process.stdout.isTTY) return;
            const elapsed = ((now - startedAt) / 1000).toFixed(1);
            const lines = STAGES.map((s, i) => {
                const pct = reached[i] === 2 ? 100 : reached[i] === 1 ? 50 : 0;
                const state = pct === 100 ? 'PASS' : pct >= 50 ? 'INFO' : 'DIM';
                return `  ${C.dim}→${C.reset} ${s.name} ${bar(pct, 20, state)} ${pct.toString().padStart(3)}%`;
            });
            // 5줄 이전 출력 위로 이동 후 덮어쓰기
            if (lastRender > 1) process.stdout.write(`\x1b[${STAGES.length + 1}A`);
            process.stdout.write(lines.join('\n') + '\n');
            process.stdout.write(`  ${C.dim}⏱${C.reset} elapsed ${C.accent}${elapsed}s${C.reset}\n`);
        },
    };
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
    const progress = makeProgress(startedAt);
    const tick = setInterval(() => progress.render(), 250);

    return new Promise((resolveP) => {
        const onReady = () => {
            if (resolved) return;
            resolved = true;
            elapsed = performance.now() - startedAt;
            progress.complete();
            progress.render(true);
            clearInterval(tick);
            child.kill('SIGTERM');
            // grace timeout to ensure SIGKILL on Windows
            setTimeout(() => child.kill('SIGKILL'), 1500);
        };

        const onLine = (chunk) => {
            // ANSI escape codes 제거 — vite는 FORCE_COLOR=0/NO_COLOR 무시하고 ANSI 출력 (2026-04-30 발견)
            const s = chunk.toString().replace(/\x1b\[[0-9;]*m/g, '');
            progress.observe(s);
            // Vite ready signature
            if (/ready in \d+\s*ms|Local:\s+http/.test(s)) onReady();
        };

        child.stdout.on('data', onLine);
        child.stderr.on('data', (c) => {
            stderrBuf += c.toString();
            onLine(c);
        });

        child.on('exit', (code) => {
            clearInterval(tick);
            if (!resolved) {
                ensureStateDir();
                writeFileSync(CRASH_LOG, stderrBuf);
                emit(
                    'ERROR',
                    'crash',
                    `dev server 충돌 — vite 프로세스 종료 코드 ${code}. 로그 ${C.accent}.ac/dev-crash.log${C.reset} 확인.`,
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
                clearInterval(tick);
                child.kill('SIGKILL');
                elapsed = performance.now() - startedAt;
                resolveP({ exitCode: 1, elapsed, timedOut: true });
            }
        }, BUDGET_COLD_MS * 2);
    });
}

(async () => {
    const trend = loadTrend();
    if (process.stdout.isTTY) {
        process.stdout.write(
            `${C.dim}╭─${C.reset} ${C.bold}에테르나 dev server${C.reset} ${C.dim}(${mode}, port ${port})${C.reset}\n`,
        );
    }
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
            `dev server 부팅 ${C.accent}${formatMs(elapsed)}ms${C.reset} — ${formatMs(budget)}ms 초과. ${C.dim}client/vite.config.ts optimizeDeps 점검.${C.reset}`,
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
            `부팅 ${C.accent}${formatMs(elapsed)}ms${C.reset} — 목표 ${formatMs(budget)}ms 근접 (${percent}%). 누적 ${recent}/${WARN_TREND_MAX}회.`,
        );
        process.exit(recent > WARN_TREND_MAX ? 1 : 2);
    }

    saveTrend(trend);
    emit(
        'PASS',
        'ready',
        `dev server 부팅 완료 (${C.accent}${formatMs(elapsed)}ms${C.reset} · ${mode})`,
        '달이 떠올랐사옵니다. 개발을 시작하시지요.',
    );
    process.exit(0);
})();
