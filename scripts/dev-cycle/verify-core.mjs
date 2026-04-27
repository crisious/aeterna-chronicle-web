#!/usr/bin/env node
// ── verify 게이트 — 핵심 3시나리오 자동 검증 ───────────────────
// 시나리오: battle (전투 ATB) · save (세이브 round-trip) · map (맵 이동 portal)
// 사용: node scripts/dev-cycle/verify-core.mjs [--scenario=battle|save|map|all]
// 종료 코드: 0 PASS · 1 BLOCK · 2 WARN · 3 ERROR
// 약속: 5분 이내 (battle ≤ 90s · save ≤ 30s · map ≤ 60s + buffer)

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';

const ROOT = resolve(new URL('../../', import.meta.url).pathname.replace(/^\//, ''));
const STATE_DIR = join(ROOT, '.ac');
const STATE_FILE = join(STATE_DIR, 'verify-trend.json');

const BUDGETS = {
    battle: 90,
    save: 30,
    map: 60,
    total: 300,
};

const SCENARIO_TESTS = {
    // 기존 vitest 스위트의 빠른 슬라이스만 골라 시나리오에 매핑
    battle: ['tests/unit/combat', 'tests/integration/combat-flow.test.ts'],
    save: ['tests/integration/ui-inventory-save-flow.test.ts'],
    map: ['tests/e2e/chapter1.test.ts'],
};

const args = new Map(
    process.argv.slice(2).map((a) => {
        const [k, v] = a.split('=');
        return [k.replace(/^--/, ''), v ?? true];
    }),
);
const target = args.get('scenario') ?? 'all';

function ensureStateDir() {
    if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
}

function loadTrend() {
    ensureStateDir();
    if (!existsSync(STATE_FILE)) return { runs: [] };
    try {
        return JSON.parse(readFileSync(STATE_FILE, 'utf8'));
    } catch {
        return { runs: [] };
    }
}

function saveTrend(state) {
    writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function emit(state, key, message, hint) {
    const stamp = new Date().toISOString();
    process.stdout.write(`[${stamp}] dev.gate.verify.${state.toLowerCase()}.${key}\n`);
    process.stdout.write(`  ${message}\n`);
    if (hint) process.stdout.write(`  hint: ${hint}\n`);
}

async function runScenario(name) {
    const paths = SCENARIO_TESTS[name];
    if (!paths) return { name, ok: false, elapsed: 0, error: 'unknown scenario' };
    const startedAt = performance.now();

    return new Promise((resolveP) => {
        const child = spawn(
            'npx',
            ['vitest', 'run', '--config', 'tests/vitest.config.ts', '--reporter=dot', ...paths],
            { cwd: ROOT, shell: true, env: { ...process.env, FORCE_COLOR: '0', CI: '1' } },
        );
        let stdout = '';
        let stderr = '';
        child.stdout.on('data', (c) => (stdout += c.toString()));
        child.stderr.on('data', (c) => (stderr += c.toString()));

        const hardTimeout = setTimeout(
            () => {
                child.kill('SIGKILL');
                resolveP({
                    name,
                    ok: false,
                    elapsed: (performance.now() - startedAt) / 1000,
                    error: 'timeout',
                    stderr,
                });
            },
            (BUDGETS[name] + 30) * 1000,
        );

        child.on('exit', (code) => {
            clearTimeout(hardTimeout);
            const elapsed = (performance.now() - startedAt) / 1000;
            resolveP({ name, ok: code === 0, elapsed, code, stdout, stderr });
        });
    });
}

function extractFirstFailure(text) {
    if (!text) return null;
    // vitest "FAIL  tests/.../foo.test.ts > suite > case"  +  " ❯ src/...:42:17"
    const failMatch = text.match(/FAIL\s+(\S+\.test\.ts)/);
    const locMatch = text.match(/❯\s+(\S+):(\d+):(\d+)/) || text.match(/at\s+(\S+):(\d+):(\d+)/);
    return {
        testFile: failMatch?.[1],
        file: locMatch?.[1],
        line: locMatch?.[2],
        column: locMatch?.[3],
    };
}

(async () => {
    const startTotal = performance.now();
    const trend = loadTrend();
    const scenarios = target === 'all' ? Object.keys(SCENARIO_TESTS) : [target];
    const results = [];

    for (const s of scenarios) {
        const r = await runScenario(s);
        results.push(r);
        const status = r.ok ? '✓' : '✗';
        process.stdout.write(`  [${status}] ${s}: ${r.elapsed.toFixed(1)}s\n`);
        if (!r.ok && r.elapsed > BUDGETS[s] * 0.99) break; // fast-fail on timeout
    }

    const totalElapsed = (performance.now() - startTotal) / 1000;
    const failures = results.filter((r) => !r.ok);

    // 첫 실패 요약 노출
    if (failures.length > 0) {
        const first = failures[0];
        const loc = extractFirstFailure(first.stdout + '\n' + first.stderr);
        const fileLoc = loc?.file ? `${loc.file}:${loc.line}:${loc.column}` : (first.error ?? 'unknown');
        const reasonKey =
            first.name === 'battle'
                ? 'battle_atb'
                : first.name === 'save'
                  ? 'save_diff'
                  : 'map_portal';
        emit(
            'BLOCK',
            reasonKey,
            `🔴 시나리오 \`${first.name}\` 실패 — ${fileLoc}${loc?.testFile ? ` (${loc.testFile})` : ''}`,
            '검의 날이 무뎌지면 사람이 다칩니다. 첫 실패부터 베어내십시오.',
        );
        trend.runs = (trend.runs ?? []).concat({ at: Date.now(), totalElapsed, ok: false });
        trend.runs = trend.runs.slice(-30);
        saveTrend(trend);
        process.exit(1);
    }

    // 예산 초과 체크
    if (totalElapsed > BUDGETS.total) {
        const recent = (trend.runs ?? [])
            .filter((r) => Date.now() - r.at < 7 * 24 * 3600 * 1000)
            .filter((r) => r.totalElapsed > BUDGETS.total).length;
        emit(
            'WARN',
            'over_budget',
            `🟡 verify:core ${totalElapsed.toFixed(1)}s — 5분 약속 초과 (${(totalElapsed - BUDGETS.total).toFixed(1)}s). 누적 ${recent + 1}/3회.`,
        );
        trend.runs = (trend.runs ?? []).concat({ at: Date.now(), totalElapsed, ok: true });
        trend.runs = trend.runs.slice(-30);
        saveTrend(trend);
        process.exit(recent + 1 > 3 ? 1 : 2);
    }

    const breakdown = results
        .map((r) => `${r.name[0]} ${r.elapsed.toFixed(1)}s`)
        .join(' · ');
    emit(
        'PASS',
        'all',
        `🟢 핵심 시나리오 ${results.length}종 통과 (${totalElapsed.toFixed(1)}s · ${breakdown})`,
        '곡조가 맞아 떨어졌사옵니다.',
    );
    trend.runs = (trend.runs ?? []).concat({ at: Date.now(), totalElapsed, ok: true });
    trend.runs = trend.runs.slice(-30);
    saveTrend(trend);
    process.exit(0);
})();
