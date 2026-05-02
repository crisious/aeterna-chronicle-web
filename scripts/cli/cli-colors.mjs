// ──────────────────────────────────────────────────────────────────────────
// scripts/cli/cli-colors.mjs
// CLI 컬러 토큰 — `npm run dev/qa/build` 모든 출력의 SSOT
// ──────────────────────────────────────────────────────────────────────────
// 1차 SSOT: docs/release/assets_dev-cycle-shortening.md §1
// 작성: 가춘운 CMO/Design — 2026-04-30
// 변경 절차: assets §1.1 표 → 본 파일 → 호출자 측 무회귀 — 단방향
// ──────────────────────────────────────────────────────────────────────────
//
// 톤 5계명 (가춘운 봉인):
//   1. NO_COLOR 존중 — 환경변수 있으면 모두 빈 문자열
//   2. 이모지는 보조 (✓/⚠/✗/→/· 5종 ASCII safe)
//   3. DIM 남발 금지 — 1줄에 DIM 2개 이상 → 가독성 폭망
//   4. ACCENT는 1줄 1회 — 진짜 중요한 숫자 1개만 금색
//   5. bg 사용 최소화 — ERROR 카드 헤더만 허용
//
// 출력 모드 3종:
//   TTY        : 24bit + 이모지   (대표 일상 개발)
//   NO_COLOR=1 : 색 없음 + 이모지 (파이프 / 로그파일)
//   --json     : 색 없음 + 이모지 X (CI / Discord 봇 입력)

const isTTY = !!process.stdout.isTTY;
const noColor =
    !!process.env.NO_COLOR || process.argv.includes('--no-color');
export const colorEnabled = isTTY && !noColor;
export const jsonMode = process.argv.includes('--json');
export const emojiEnabled = !jsonMode;

/** @type {Record<string, string>} */
const PALETTE = colorEnabled
    ? {
          // 5상태 + ACCENT (assets §1.1)
          pass: '\x1b[38;2;95;203;122m', //  #5FCB7A
          warn: '\x1b[38;2;232;163;58m', //  #E8A33A
          error: '\x1b[38;2;232;90;90m', //  #E85A5A
          info: '\x1b[38;2;74;158;255m', //  #4A9EFF
          dim: '\x1b[38;2;107;114;128m', //  #6B7280
          accent: '\x1b[38;2;212;168;87m', // #D4A857

          // bg (ERROR 카드 헤더 전용)
          bgError: '\x1b[48;2;42;20;20m',

          // 텍스트 변형
          bold: '\x1b[1m',
          dimAttr: '\x1b[2m',
          italic: '\x1b[3m',
          underline: '\x1b[4m',

          // reset
          reset: '\x1b[0m',
      }
    : new Proxy(
          {},
          {
              get: () => '',
          },
      );

export const C = PALETTE;

// ── 5종 안전 마크 (이모지 fallback) ────────────────────────────────────────
export const MARK = emojiEnabled
    ? { pass: '✓', warn: '⚠', error: '✗', info: '→', dim: '·' }
    : { pass: '[OK]', warn: '[!]', error: '[X]', info: '->', dim: '-' };

// ── 헬퍼: 5상태별 1줄 라벨 ────────────────────────────────────────────────
/**
 * @param {'pass'|'warn'|'error'|'info'|'dim'} state
 * @param {string} label
 * @returns {string}
 */
export function tag(state, label) {
    return `${C[state]}${MARK[state]} ${label}${C.reset}`;
}

// ── 헬퍼: ACCENT 단일 강조 ────────────────────────────────────────────────
/** @param {string|number} v */
export function accent(v) {
    return `${C.accent}${v}${C.reset}`;
}

// ── 헬퍼: DIM 보조 텍스트 ─────────────────────────────────────────────────
/** @param {string} v */
export function dim(v) {
    return `${C.dim}${v}${C.reset}`;
}

// ── 헬퍼: 시각적 헤더 박스 한 줄 ──────────────────────────────────────────
/** @param {string} title @param {string} [right] */
export function header(title, right = '') {
    const width = 60;
    const inner = right
        ? `${title}${' '.repeat(Math.max(1, width - title.length - right.length - 4))}${right}`
        : title;
    return `${C.dim}╭─ ${C.reset}${inner}${C.dim} ─╮${C.reset}`;
}

// ── self-test (직접 실행 시) ──────────────────────────────────────────────
if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
    console.log(`\n${C.bold}cli-colors.mjs — 5상태 + ACCENT 미리보기${C.reset}\n`);
    console.log(tag('pass', `vite ready in ${accent('1.2s')}`));
    console.log(tag('warn', `boot ${accent('4.8s')} ${dim('(target ≤ 5s)')}`));
    console.log(tag('error', `BUILD FAILED ${dim('AtbGauge.ts:84:23')}`));
    console.log(tag('info', `loading ${accent('24/120')} files`));
    console.log(tag('dim', '— 보조 텍스트는 이렇게 회색으로 ——'));
    console.log(`\n${C.dim}TTY=${isTTY} colorEnabled=${colorEnabled} jsonMode=${jsonMode}${C.reset}\n`);
}
