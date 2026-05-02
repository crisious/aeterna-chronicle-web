// ── CLI 컬러 SSOT — 가춘운 §1 미러 (ANSI 24-bit) ───────────────
// 사용처: measure-boot.mjs · verify-core.mjs · format-error.mjs
// 톤 5계명: NO_COLOR 존중 · 이모지 보조 · DIM 절제 · ACCENT 1회 · bg 최소
// SSOT: docs/release/assets_dev-cycle-shortening.md §1.1, §1.2

const useColor = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;

const RAW = {
    pass: '\x1b[38;2;95;203;122m',
    warn: '\x1b[38;2;232;163;58m',
    error: '\x1b[38;2;232;90;90m',
    info: '\x1b[38;2;74;158;255m',
    dim: '\x1b[38;2;107;114;128m',
    accent: '\x1b[38;2;212;168;87m',
    bgError: '\x1b[48;2;42;20;20m',
    bold: '\x1b[1m',
    reset: '\x1b[0m',
};

export const C = useColor
    ? RAW
    : new Proxy({}, { get: () => '' });

const ICONS = { PASS: '✓', WARN: '⚠', BLOCK: '✗', ERROR: '✗', INFO: '→', DIM: '·' };

export function icon(state) {
    return ICONS[state] ?? '·';
}

export function colorize(state, text) {
    const map = { PASS: C.pass, WARN: C.warn, BLOCK: C.error, ERROR: C.error, INFO: C.info, DIM: C.dim, ACCENT: C.accent };
    return `${map[state] ?? ''}${text}${C.reset}`;
}

// ── 진행률 바 — 가춘운 §2.1 모킹업 미러 ────────────────────────
// width 20 칸 ASCII bar, 상태별 컬러
export function bar(percent, width = 20, state = 'INFO') {
    const p = Math.max(0, Math.min(100, Math.round(percent)));
    const filled = Math.round((p / 100) * width);
    const empty = width - filled;
    const fill = colorize(state, '█'.repeat(filled));
    const rest = `${C.dim}${'░'.repeat(empty)}${C.reset}`;
    return `[${fill}${rest}]`;
}

// ── verify-core 시나리오 SSOT — 가춘운 §1.1 §2 §4 미러 ──────────
// 출처: docs/release/design-system_verify-core-scenarios.md
// 코드는 본 SSOT를 미러하는 2차 — 변경은 §11 위계 따라 하향 전파
export const VERIFY_SSOT = {
    // §1.1 시나리오별 예산 분배 (s) — 합계 60s 약속
    budgets: { battle: 25, save: 10, map: 20, buffer: 5, total: 60 },
    // §2.1~2.3 의미 메타포 이모지
    emoji: { battle: '⚔️ ', save: '💾', map: '🗺️ ' },
    // §2 헤더 라벨 — padEnd(7) 정렬 보장
    label: { battle: 'battle ', save: 'save   ', map: 'map    ' },
    // §4.2 게이트 키 매핑
    blockKey: { battle: 'battle_atb', save: 'save_diff', map: 'map_portal' },
    // §3 BLOCK 카드 폭 (errorCard 기본 60col 미러)
    cardWidth: 60,
};

// §1.2 진행 바 임계 — 70% 황 / 90% 적
export function budgetState(percent) {
    if (percent < 70) return 'PASS';
    if (percent < 90) return 'WARN';
    return 'BLOCK';
}

// §2.4 시나리오 행 1줄 + 본문 2줄 — verify-core.mjs §main 루프에서 1회 호출
// state: 'PASS' | 'BLOCK' | 'WARN'
// hooks: 본문 ↳ 행 2개 (호출체인 / 테스트파일·케이스)
export function renderScenarioRow({ name, state, elapsedSec, hooks = [] }) {
    const budget = VERIFY_SSOT.budgets[name] ?? 0;
    const percent = budget > 0 ? (elapsedSec / budget) * 100 : 0;
    const barState = budgetState(percent);
    const tColor = barState === 'PASS' ? C.accent : barState === 'WARN' ? C.warn : C.error;
    const stateBadge = `${colorize(state, icon(state))} ${colorize(state, state.padEnd(5))}`;
    const emoji = VERIFY_SSOT.emoji[name] ?? '·';
    const label = VERIFY_SSOT.label[name] ?? name.padEnd(7);
    const time = `${tColor}${elapsedSec.toFixed(1)}s${C.reset} ${C.dim}/ ${budget}s${C.reset}`;
    const head = `  ${emoji} ${C.bold}${label}${C.reset} ${stateBadge} ${time}`;
    const lines = [head];
    for (const h of hooks) lines.push(`     ${C.dim}↳${C.reset} ${h}`);
    return lines.join('\n');
}

// §1.3 합계 바 1줄 — 마지막 줄 강조 + 60s 초과 시 누적 카운트
export function renderTotalLine({ totalSec, recentOverBudget = 0 }) {
    const budget = VERIFY_SSOT.budgets.total;
    const percent = (totalSec / budget) * 100;
    const overBudget = totalSec > budget;
    const state = overBudget ? 'BLOCK' : budgetState(percent);
    const meter = bar(Math.min(percent, 100), 22, state);
    const sep = `  ${C.dim}${'─'.repeat(50)}${C.reset}`;
    const t = totalSec.toFixed(1);
    const tColor = overBudget ? C.error : percent >= 70 ? C.warn : C.accent;
    const suffix = overBudget
        ? ` ${C.error}🔴${C.reset} ${C.dim}(+${(totalSec - budget).toFixed(1)}s · 누적 ${recentOverBudget + 1}/3회)${C.reset}`
        : ` ${colorize(state, icon(state))}`;
    return `${sep}\n  ${C.bold}total  ${C.reset} ${meter} ${tColor}${t}s${C.reset} ${C.dim}/ ${budget}s${C.reset}${suffix}`;
}

// §3 첫 실패 카드 + §2.x 본문 — BLOCK 시 1회만
// 메아리: errorCard() 60칸 박스 + 시나리오 색 톤
export function renderScenarioBlockCard({ name, file, line, column, message, snippet, hint }) {
    const title = `${name} 시나리오 실패`;
    return errorCard({ title, file, line, column, message, snippet, hint });
}

// §5 JSON 모드 결과 직렬화 — `--json` 플래그 흡수
export function renderJsonReport({ startedAt, finishedAt, scenarios, exitCode, state, key, trend }) {
    const elapsedS = (finishedAt - startedAt) / 1000;
    return JSON.stringify({
        gate: 'verify',
        version: '1.0',
        started_at: new Date(startedAt).toISOString(),
        finished_at: new Date(finishedAt).toISOString(),
        elapsed_s: Number(elapsedS.toFixed(3)),
        budget_s: VERIFY_SSOT.budgets.total,
        exit_code: exitCode,
        state,
        key,
        scenarios: scenarios.map((s) => ({
            name: s.name,
            state: s.state,
            elapsed_s: Number((s.elapsed ?? 0).toFixed(3)),
            budget_s: VERIFY_SSOT.budgets[s.name] ?? null,
            tests: s.tests ?? null,
            first_failure: s.firstFailure ?? null,
        })),
        trend: trend ?? null,
    }, null, 2);
}

// ── 단일 에러 카드 — 가춘운 §4 미러 ────────────────────────────
// 60col 박스, 헤더에만 bg, 본문은 fg only
export function errorCard({ title, file, line, column, message, snippet, hint }) {
    const W = 60;
    const pad = (s) => s + ' '.repeat(Math.max(0, W - visibleLen(s) - 2));
    const top = `${C.error}╭${'─'.repeat(W - 2)}╮${C.reset}`;
    const bot = `${C.error}╰${'─'.repeat(W - 2)}╯${C.reset}`;
    const hdr = `${C.bgError}${C.error}${C.bold} ✗ ${title} ${C.reset}`;
    const lines = [top, `${C.error}│${C.reset} ${pad(hdr)}${C.error}│${C.reset}`];

    const loc = `${C.dim}↳${C.reset} ${C.accent}${file}${C.reset}:${C.accent}${line}${C.reset}:${C.dim}${column}${C.reset}`;
    lines.push(`${C.error}│${C.reset} ${pad(loc)}${C.error}│${C.reset}`);
    lines.push(`${C.error}│${C.reset} ${pad(`  ${message}`)}${C.error}│${C.reset}`);

    if (snippet) {
        lines.push(`${C.error}│${C.reset} ${pad(`${C.dim}│${C.reset} ${snippet}`)}${C.error}│${C.reset}`);
    }
    if (hint) {
        lines.push(`${C.error}│${C.reset} ${pad(`${C.info}처방${C.reset} ${hint}`)}${C.error}│${C.reset}`);
    }
    lines.push(bot);
    return lines.join('\n');
}

// ANSI escape 무시한 가시 길이 측정
function visibleLen(s) {
    return s.replace(/\x1b\[[0-9;]*m/g, '').length;
}

export default {
    C,
    icon,
    colorize,
    bar,
    errorCard,
    VERIFY_SSOT,
    budgetState,
    renderScenarioRow,
    renderTotalLine,
    renderScenarioBlockCard,
    renderJsonReport,
};
