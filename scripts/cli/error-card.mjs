// ──────────────────────────────────────────────────────────────────────────
// scripts/cli/error-card.mjs
// 빌드/런타임 에러를 60칸 단일 카드로 렌더링
// ──────────────────────────────────────────────────────────────────────────
// 1차 SSOT: docs/release/assets_dev-cycle-shortening.md §4
// 작성: 가춘운 CMO/Design — 2026-04-30
//
// 봉인 5항 (가춘운 비협상):
//   1. 카드 너비 60칸 고정
//   2. 스택 깊이 ≤ 4줄 (사용자 작성 파일까지만)
//   3. fix 힌트는 명령형 1줄
//   4. 이모지 4종 고정 (✗ 📁 → 💡)
//   5. 카드 1개에 1 에러

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { C, MARK, accent, dim } from './cli-colors.mjs';
import { clickableLink, linkSupported } from './clickable-link.mjs';

const WIDTH = 60; // 봉인 §1 — 변경 금지

/**
 * @typedef {Object} ErrorCardInput
 * @property {'BUILD'|'RUNTIME'|'TYPE'} kind
 * @property {string} file        — 절대/상대 경로
 * @property {number} line
 * @property {number} [col]
 * @property {string} message     — 1줄 에러 메시지
 * @property {string} [code]      — TS2551 / TypeError 등
 * @property {string} [fixHint]   — 명령형 1줄
 * @property {string[]} [stack]   — node_modules 컷, ≤ 4줄
 * @property {{file: string, line: number}} [rootCause] — 가능 원인 top 1
 * @property {number} [elapsedMs]
 */

// ── 박스 그리기 ────────────────────────────────────────────────────────────

/** ANSI escape + OSC 8 제거 후 visible 부분만 추출 */
function stripAnsi(text) {
    return text
        .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, '') // OSC 8 (link)
        .replace(/\x1b\[[0-9;]*m/g, ''); // SGR
}

/** monospace 1글자 너비 — CJK/이모지는 2칸으로 카운트 */
function visualWidth(text) {
    const v = stripAnsi(text);
    let w = 0;
    for (const ch of v) {
        const cp = ch.codePointAt(0);
        // 대략적: CJK (한글/한자/전각) + 이모지 영역 → 폭 2
        if (
            (cp >= 0x1100 && cp <= 0x115f) || // Hangul Jamo
            (cp >= 0x2e80 && cp <= 0x303e) || // CJK 부수/일본어 punct
            (cp >= 0x3041 && cp <= 0x33ff) || // Hiragana / Katakana / CJK Compat
            (cp >= 0x3400 && cp <= 0x4dbf) || // CJK Ext A
            (cp >= 0x4e00 && cp <= 0x9fff) || // CJK Unified
            (cp >= 0xa000 && cp <= 0xa4cf) || // Yi
            (cp >= 0xac00 && cp <= 0xd7a3) || // Hangul Syllables
            (cp >= 0xf900 && cp <= 0xfaff) || // CJK Compat Ideographs
            (cp >= 0xfe30 && cp <= 0xfe4f) || // CJK Compat Forms
            (cp >= 0xff00 && cp <= 0xff60) || // Fullwidth Forms
            (cp >= 0xffe0 && cp <= 0xffe6) || // Fullwidth signs
            (cp >= 0x1f300 && cp <= 0x1f9ff) || // 이모지
            (cp >= 0x2600 && cp <= 0x27bf) // Misc Symbols + Dingbats
        ) {
            w += 2;
        } else {
            w += 1;
        }
    }
    return w;
}

function pad(text, width) {
    const pad = Math.max(0, width - visualWidth(text));
    return text + ' '.repeat(pad);
}

/** 컬러 escape를 보존하면서 visualWidth 기준으로 잘라내기 */
function truncateByWidth(text, maxWidth) {
    if (visualWidth(text) <= maxWidth) return text;
    let acc = '';
    let w = 0;
    let i = 0;
    let inEsc = false;
    while (i < text.length && w < maxWidth - 1) {
        const ch = text[i];
        if (ch === '\x1b') {
            inEsc = true;
            acc += ch;
            i++;
            continue;
        }
        if (inEsc) {
            acc += ch;
            if (ch === 'm' || ch === '\\' || ch === '\x07') inEsc = false;
            i++;
            continue;
        }
        const cw = visualWidth(ch);
        if (w + cw > maxWidth - 1) break;
        acc += ch;
        w += cw;
        i++;
    }
    return acc + '…';
}

function topBorder(title, right) {
    const inner = ` ${title} `;
    const rightPart = right ? ` ${right} ` : '';
    const dashes = WIDTH - 2 - visualWidth(inner) - visualWidth(rightPart);
    return `${C.dim}╭${C.reset}${C.error}${inner}${C.reset}${C.dim}${'─'.repeat(Math.max(2, dashes))}${C.reset}${rightPart ? `${C.dim}${rightPart}${C.reset}` : ''}${C.dim}╮${C.reset}`;
}

function row(content) {
    const innerWidth = WIDTH - 4;
    // 너무 길면 잘라내고, 짧으면 우측 padding
    const trimmed =
        visualWidth(content) > innerWidth
            ? truncateByWidth(content, innerWidth)
            : content;
    return `${C.dim}│${C.reset} ${pad(trimmed, innerWidth)} ${C.dim}│${C.reset}`;
}

/** 한 줄을 여러 row로 나눠서 출력 (긴 메시지용) */
function wrapRows(text, prefix = '') {
    const innerWidth = WIDTH - 4;
    const prefWidth = visualWidth(prefix);
    const bodyWidth = innerWidth - prefWidth;
    const stripped = stripAnsi(text);
    if (visualWidth(stripped) <= bodyWidth) return [row(prefix + text)];
    // 단순 그리디 분리 (공백 기준, fallback: 강제 자르기)
    const words = stripped.split(/(\s+)/);
    const out = [];
    let line = '';
    let lineW = 0;
    for (const word of words) {
        const ww = visualWidth(word);
        if (lineW + ww > bodyWidth) {
            if (line) out.push(line);
            // 단어 자체가 너무 길면 강제 절단
            if (ww > bodyWidth) {
                out.push(truncateByWidth(word, bodyWidth));
                line = '';
                lineW = 0;
                continue;
            }
            line = word.trimStart();
            lineW = visualWidth(line);
        } else {
            line += word;
            lineW += ww;
        }
    }
    if (line) out.push(line);
    return out.map((l, i) =>
        row(i === 0 ? prefix + l : ' '.repeat(prefWidth) + l),
    );
}

function blank() {
    return row('');
}

function bottomBorder() {
    return `${C.dim}╰${'─'.repeat(WIDTH - 2)}╯${C.reset}`;
}

// ── 코드 컨텍스트 (3-5줄) ─────────────────────────────────────────────────

/**
 * 파일에서 line 주변 ±2줄을 읽어 화살표 마커 + 캐럿 출력
 * 파일 없으면 placeholder
 * @param {string} file
 * @param {number} line
 * @param {number} [col]
 * @param {number} [matchLen]
 */
function codeContext(file, line, col = 1, matchLen = 4) {
    const abs = resolve(file);
    if (!existsSync(abs)) {
        return [row(dim('  (소스 파일을 읽을 수 없음 — 경로 확인)'))];
    }
    let lines;
    try {
        lines = readFileSync(abs, 'utf8').split(/\r?\n/);
    } catch {
        return [row(dim('  (소스 파일 읽기 실패)'))];
    }
    const start = Math.max(1, line - 2);
    const end = Math.min(lines.length, line + 2);
    const lpad = String(end).length;
    const out = [];
    for (let i = start; i <= end; i++) {
        const num = String(i).padStart(lpad, ' ');
        const isHit = i === line;
        const marker = isHit ? `${C.error}→${C.reset}` : ' ';
        const lineText = (lines[i - 1] ?? '').replace(/\t/g, '  ');
        // 라인 너비 제한 (카드 안에 들어가도록)
        const maxBodyLen = WIDTH - 4 - lpad - 4; // " | " + marker
        const trimmed =
            lineText.length > maxBodyLen
                ? lineText.slice(0, maxBodyLen - 1) + '…'
                : lineText;
        const numCol = isHit ? `${C.error}${num}${C.reset}` : `${C.dim}${num}${C.reset}`;
        const body = isHit ? `${C.error}${trimmed}${C.reset}` : `${C.dim}${trimmed}${C.reset}`;
        out.push(row(`${marker} ${numCol} ${C.dim}│${C.reset} ${body}`));
        // 캐럿
        if (isHit && col > 0) {
            const caretIndent = ' '.repeat(2 + lpad + 3 + Math.max(0, col - 1));
            const carets = '^'.repeat(Math.max(1, matchLen));
            out.push(row(`${caretIndent}${C.error}${carets}${C.reset}`));
        }
    }
    return out;
}

// ── 메인 렌더 ──────────────────────────────────────────────────────────────

/**
 * 에러 카드를 콘솔에 출력 가능한 문자열로 렌더
 * @param {ErrorCardInput} input
 * @returns {string}
 */
export function renderErrorCard(input) {
    const {
        kind,
        file,
        line,
        col = 1,
        message,
        code,
        fixHint,
        stack,
        rootCause,
        elapsedMs,
    } = input;

    const titleMap = {
        BUILD: 'BUILD FAILED',
        RUNTIME: 'RUNTIME ERROR',
        TYPE: 'TYPE ERROR',
    };
    const elapsed = elapsedMs ? `${(elapsedMs / 1000).toFixed(1)}s` : '';
    const out = [];
    out.push(topBorder(`${MARK.error} ${titleMap[kind] ?? 'ERROR'}`, elapsed));
    out.push(blank());

    // 영역 2: 파일 경로
    const linkOrPlain = linkSupported
        ? clickableLink(resolve(file), line, col, `${file}:${line}:${col}`)
        : `${file}:${line}:${col}`;
    out.push(row(`📁 ${C.accent}${linkOrPlain}${C.reset}`));
    out.push(blank());

    // 영역 3: 코드 컨텍스트
    out.push(...codeContext(file, line, col));
    out.push(blank());

    // 영역 4: 에러 코드 + 메시지 (긴 메시지는 줄바꿈)
    const codePrefix = code ? `${C.error}${code}${C.reset}: ` : '';
    out.push(
        ...wrapRows(
            `${codePrefix}${C.error}${message}${C.reset}`,
            `${C.error}${MARK.error}${C.reset} `,
        ),
    );
    out.push(blank());

    // 영역 5: fix 힌트
    if (fixHint) {
        out.push(
            ...wrapRows(`${C.accent}${fixHint}${C.reset}`, `💡 ${C.accent}fix:${C.reset} `),
        );
        out.push(blank());
    }

    // 영역 6: 가능 원인 top 1 (RUNTIME만)
    if (rootCause) {
        out.push(row(`🎯 ${C.info}가능 원인 (top 1):${C.reset}`));
        out.push(
            row(
                `   ${C.dim}${rootCause.file}:${rootCause.line}${C.reset} 의심`,
            ),
        );
        out.push(blank());
    }

    // 영역 7: 스택 (≤ 4줄, 봉인 §2)
    if (stack && stack.length) {
        const top = stack.slice(0, 4);
        for (const s of top) {
            out.push(row(`${C.dim}${MARK.info} ${s}${C.reset}`));
        }
        out.push(blank());
    }

    out.push(bottomBorder());
    return out.join('\n');
}

// ── self-test ─────────────────────────────────────────────────────────────
if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
    console.log('\n');
    // assets §4.1 TS 에러 케이스 모킹
    console.log(
        renderErrorCard({
            kind: 'BUILD',
            file: 'client/src/scenes/battle/AtbGauge.ts',
            line: 84,
            col: 23,
            message:
                "Property 'toFixef' does not exist on type 'number'. Did you mean 'toFixed'?",
            code: 'TS2551',
            fixHint: "change 'toFixef' to 'toFixed'",
            elapsedMs: 4200,
        }),
    );
    console.log('\n');
    // assets §4.2 런타임 에러 케이스 모킹
    console.log(
        renderErrorCard({
            kind: 'RUNTIME',
            file: 'client/src/scenes/BattleScene.ts',
            line: 312,
            col: 14,
            message: "Cannot read property 'sprite' of undefined",
            code: 'TypeError',
            fixHint: 'npm run data:validate 실행 후 누락 키 채우기',
            stack: [
                'at BattleScene.executeAction (BattleScene.ts:312:14)',
                'at AtbController.tick      (AtbController.ts:78:9)',
            ],
            rootCause: { file: 'data/monsters.json', line: 42 },
        }),
    );
    console.log('\n');
}
