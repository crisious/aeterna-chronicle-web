/**
 * scripts/lib/validation_tokens.ts — 데이터 검증 CLI 시각 토큰 런타임 (가춘운 Build 단계)
 *
 * SSOT 위계:
 *   1차) DESIGN.md §2 (팔레트)
 *   2차) docs/release/design-system_data-validation.md §2 (CLI ANSI 토큰)
 *   3차) docs/release/assets_data-validation.md §7 (코드 미러 명세)
 *   4차) 본 파일 — assets §7 글자 단위 미러
 *
 * 변경 절차: 위에서 아래로만. 코드 → 문서 역방향 ❌
 *
 * 봉인 (이소화 비협상):
 *   1) 이모지 매핑 4종 (✅⚠️❌💡) 외 신규 ❌ — 🚫🛑🔥 절대 금지
 *   2) ANSI 16색만 — 256색·truecolor ❌
 *   3) NO_COLOR=1 자동 감지 — 옵션 아니라 필수
 *   4) 🛡️ 도메인 마크 변경 시 design-system 동시 갱신
 *
 * 어머~ CLI 한 줄에도 디자인이 살아 있어야죠 ✨
 */

/** TTY + NO_COLOR 폴백 — CI 로그 안전 */
const isTTY = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;

/** ANSI 코드 래퍼 — 비-TTY에서는 plain 통과 */
const wrap = (code: string) => (s: string): string =>
  isTTY ? `\x1b[${code}m${s}\x1b[0m` : s;

/**
 * 컬러 토큰 — assets §7 글자 단위 미러
 * design-system §2.1 (검증 상태 4종) + §2.2 (정보 강조 4종)
 */
export const C = {
  // §2.1 검증 상태 4종
  pass: wrap('32'),     // green   #5FCB7A
  warn: wrap('33'),     // yellow  #E8A33A
  error: wrap('31'),    // red     #E85A5A
  info: wrap('36'),     // cyan    #4A9EFF

  // §2.2 정보 강조 4종
  path: wrap('1;37'),   // bold white  — 파일 경로
  field: wrap('35'),    // magenta     — JSON 키
  value: wrap('2;37'),  // dim white   — 실제값
  expected: wrap('36'), // cyan        — 기대값
  tree: wrap('2'),      // dim         — └─ 트리 기호
} as const;

/**
 * 이모지 토큰 — assets §2 다중 표면 매핑
 * NO_COLOR=1에서는 텍스트 라벨 폴백 (`[PASS]` 등)
 */
export const ICON = {
  pass: isTTY ? '✅' : '[PASS]',
  warn: isTTY ? '⚠️' : '[WARN]',
  error: isTTY ? '❌' : '[ERROR]',
  info: isTTY ? '💡' : '[INFO]',
  shield: isTTY ? '🛡️' : '[*]',  // 도메인 마크 (비협상)
  tree: isTTY ? '└─' : '`-',
} as const;

/**
 * 헥스 컬러 미러 (참조용 — README 배지/Discord embed/웹 가이드 페이지에서 사용)
 * design-system §2.1 표 그대로
 */
export const HEX = {
  pass: '#5FCB7A',
  warn: '#E8A33A',
  error: '#E85A5A',
  info: '#4A9EFF',
  field: '#C77DFF',
  value: '#AAAAAA',
  tree: '#888888',
} as const;

/** Discord embed color (int) — assets §2 표 */
export const DISCORD_COLOR = {
  pass: 6278266,    // #5FCB7A
  warn: 15246138,   // #E8A33A
  error: 15226458,  // #E85A5A
  info: 4889855,    // #4A9EFF
} as const;

/** shields.io label color — assets §2 표 */
export const SHIELDS_COLOR = {
  pass: 'brightgreen',
  warn: 'yellow',
  error: 'red',
  info: 'blue',
} as const;

// ──────────────────────────────────────────────────────────────
// 출력 포맷 헬퍼 — design-system §4 표준 포맷 SSOT
// ──────────────────────────────────────────────────────────────

/** §3.1 헤더 — `─── 🛡️  Aeterna Data Validation v1.0 ───` */
export function formatHeader(title: string = 'Aeterna Data Validation v1.0'): string {
  return `─── ${ICON.shield}  ${title} ───`;
}

/**
 * §4.1 PASS — 무소음 1줄
 * `✅ data/monsters/monster_data.json — 142 entries · schema OK`
 */
export function formatPass(file: string, count: number, label: string = 'entries'): string {
  return `${ICON.pass} ${C.path(file)} — ${count} ${label} · schema OK`;
}

/**
 * §4.2 ERROR — 정확히 2줄 (path 1줄 + reason 1줄)
 * 1줄: `  ❌ data/monsters/chapter4_boss.json:128`
 * 2줄: `    └─ monsters[3].stats.hp = `999999` (expected: integer ≤ 50000)`
 */
export function formatError(
  path: string,
  line: number,
  field: string,
  value: unknown,
  expected: string
): string {
  return [
    `  ${ICON.error} ${C.path(`${path}:${line}`)}`,
    `    ${C.tree(ICON.tree)} ${C.field(field)} = \`${C.value(String(value))}\` (expected: ${C.expected(expected)})`,
  ].join('\n');
}

/**
 * §4.3 WARN — outlier (±2σ 밖, 2줄)
 * 2줄: `    └─ monsters[3].stats.hp = `48000` (outlier: μ=12000, σ=4500, +8.0σ)`
 */
export function formatWarn(
  path: string,
  line: number,
  field: string,
  value: unknown,
  mu: number,
  sigma: number,
  z: number
): string {
  const sign = z >= 0 ? '+' : '';
  return [
    `  ${ICON.warn} ${C.path(`${path}:${line}`)}`,
    `    ${C.tree(ICON.tree)} ${C.field(field)} = \`${C.value(String(value))}\` (outlier: μ=${mu}, σ=${sigma}, ${sign}${z.toFixed(1)}σ)`,
  ].join('\n');
}

/**
 * §4.4 요약 푸터 — 카운트 1줄 + 다음 액션 1줄 (PASS·WARN·ERROR 순 비협상)
 */
export function formatFooter(
  pass: number,
  warn: number,
  error: number,
  durationSec: number,
  nextHint: string
): string {
  return [
    '─────────────────────────────────────────',
    `${ICON.pass} ${pass} PASS · ${ICON.warn} ${warn} WARN · ${ICON.error} ${error} ERROR · ${durationSec.toFixed(1)}s`,
    `${ICON.info} ${nextHint}`,
  ].join('\n');
}

/** §6 반응형 — 터미널 폭 (CI 로그/JSON 모드용 헬퍼) */
export const TERM = {
  isTTY,
  width: process.stdout.columns ?? 80,
  isCI: Boolean(process.env.CI),
} as const;
