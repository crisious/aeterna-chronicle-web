// ──────────────────────────────────────────────────────────────────────────
// scripts/cli/clickable-link.mjs
// OSC 8 하이퍼링크 — 에러 라인을 VS Code/Windows Terminal에서 Ctrl+Click 점프
// ──────────────────────────────────────────────────────────────────────────
// 1차 SSOT: docs/release/assets_dev-cycle-shortening.md §8.2
// 작성: 가춘운 CMO/Design — 2026-04-30
//
// fallback 정책 (assets §8.3):
//   Windows Terminal / VS Code / iTerm2  → 하이퍼링크 (Ctrl+Click)
//   Git Bash (mintty)                    → 평문 경로
//   NO_COLOR=1 또는 --no-link            → 평문 경로

import { basename, isAbsolute, resolve } from 'node:path';

const noLink =
    !!process.env.NO_COLOR ||
    !!process.env.NO_LINK ||
    process.argv.includes('--no-link') ||
    process.argv.includes('--json');

// mintty/Git Bash 감지 — TERM_PROGRAM이 설정되지 않거나 mintty면 평문
const term = process.env.TERM_PROGRAM ?? '';
const isMintty = process.env.MSYSTEM || term === 'mintty';

export const linkSupported = process.stdout.isTTY && !noLink && !isMintty;

/**
 * 절대 경로 + 라인/컬럼 → OSC 8 하이퍼링크 또는 평문 fallback
 * @param {string} absPath
 * @param {number} line
 * @param {number} [col]
 * @param {string} [label] — 표시할 라벨 (기본: basename + line + col)
 * @returns {string}
 */
export function clickableLink(absPath, line, col = 1, label) {
    const norm = isAbsolute(absPath) ? absPath : resolve(absPath);
    const url = `file:///${norm.replace(/\\/g, '/')}:${line}:${col}`;
    const display = label ?? `${basename(norm)}:${line}:${col}`;
    if (!linkSupported) return display;
    // OSC 8 시퀀스 (assets §8.1)
    return `\x1b]8;;${url}\x1b\\${display}\x1b]8;;\x1b\\`;
}

/**
 * 상대 경로 라벨 + 점프 가능 링크 (양쪽 모두 깔끔하게)
 * @param {string} absPath
 * @param {number} line
 * @param {number} [col]
 * @param {string} [cwd]
 */
export function relativeClickable(absPath, line, col = 1, cwd = process.cwd()) {
    const norm = isAbsolute(absPath) ? absPath : resolve(cwd, absPath);
    const rel = norm
        .replace(cwd.replace(/\\/g, '/'), '')
        .replace(/\\/g, '/')
        .replace(/^\//, '');
    return clickableLink(norm, line, col, `${rel}:${line}:${col}`);
}

// ── self-test ─────────────────────────────────────────────────────────────
if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
    const sample = resolve(
        process.cwd(),
        'client/src/scenes/battle/AtbGauge.ts',
    );
    console.log('\nclickable-link.mjs — 미리보기\n');
    console.log('  linkSupported:', linkSupported);
    console.log('  clickable    :', clickableLink(sample, 84, 23));
    console.log('  relative     :', relativeClickable(sample, 84, 23));
    console.log('');
}
