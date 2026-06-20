/**
 * damage-legibility-contrast.mjs — 전투 피드백 색상 가독성 분석기
 *
 * 작성: 심요연 (Data Analyst / UX Researcher)
 * 스프린트: "에테르나 크로니클 전투 피드백 UX 개선 — 데미지·상태이상 표시 가독성"
 * 단계: Assets (분석 쿼리 — SSOT 색상 → 정량 가독성 벤치마크 생성기)
 *
 * ── 본궁이 살피건대 ──────────────────────────────────────────────
 * 데미지 팝업과 상태이상 색은 어두운 전투 배경(#1A1A2E) 위에 뜬다.
 * 색은 "있다"고 보이는 것이 아니라 "구별된다"고 보여야 의미가 산다.
 * 이 스크립트는 SSOT 색상을 입력으로 받아 두 가지 진실을 수치로 답한다:
 *   (1) 각 색이 배경 대비 WCAG AA(4.5)/AAA(7.0) 가독 기준을 넘는가
 *   (2) 의미가 충돌하기 쉬운 색쌍이 정상시각·색약(3종)에서 구별되는가 (CIE76 ΔE)
 *
 * 순수 Node.js (의존성 0) — `node scripts/analytics/damage-legibility-contrast.mjs [--json]`
 *
 * ── SSOT 출처 (단일 출처 미러, 값 변경 시 원본 먼저) ─────────────
 *   damage 팝업 7종:  client/src/constants/battle-tokens.ts  BATTLE_COLORS.damage
 *   전투 결과 6종:    client/src/combat/combatResultPalette.ts COMBAT_POPUP_SCREEN_COLORS
 *   배경 기준:        DESIGN.md §1 "#1A1A2E 기반" + battle-tokens ATB empty
 */

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/* ── 1. SSOT 색상 미러 ──────────────────────────────────────── */
// 데미지 팝업 (battle-tokens.ts BATTLE_COLORS.damage / DAMAGE_POPUP_SIZE)
const DAMAGE_COLORS = {
  normal:   { hex: '#ffffff', fontPx: 16, semantic: '일반 피해' },
  critical: { hex: '#ffd700', fontPx: 32, semantic: '치명타' },
  heal:     { hex: '#2ecc71', fontPx: 18, semantic: '회복' },
  miss:     { hex: '#a0a0a0', fontPx: 14, semantic: '빗나감' },
  weak:     { hex: '#ff6b35', fontPx: 22, semantic: '약점' },
  resist:   { hex: '#3498db', fontPx: 14, semantic: '저항' },
  immune:   { hex: '#9b59b6', fontPx: 14, semantic: '무효' },
};

// 전투 결과 팔레트 (combatResultPalette.ts COMBAT_POPUP_SCREEN_COLORS)
const RESULT_COLORS = {
  hit:       { hex: '#ffffff', semantic: '명중' },
  miss:      { hex: '#aaaaaa', semantic: '빗나감' },
  crit:      { hex: '#ffcc00', semantic: '치명타' },
  reflect:   { hex: '#88ccff', semantic: '반사' },
  combo:     { hex: '#ffaa44', semantic: '콤보' },
  crit_echo: { hex: '#cc88ff', semantic: '치명타 잔향' },
};

// 가독성 평가 배경 (어두운 → 중간). 팝업은 배경/엔티티 스프라이트 위 모두에 뜬다.
const BACKGROUNDS = {
  battle_bg:    { hex: '#1a1a2e', note: 'DESIGN.md 기본 다크 판타지 배경' },
  atb_track:    { hex: '#2a2a3a', note: 'ATB 게이지 empty 트랙 위' },
  mid_sprite:   { hex: '#6a6a72', note: '중간 명도 엔티티 스프라이트 위 (최악 케이스)' },
};

// 의미 충돌 위험 색쌍 — 잘못 읽으면 전투 판단이 뒤집히는 쌍을 우선 감사
const CRITICAL_PAIRS = [
  ['weak', 'critical', '약점 vs 치명타 — 둘 다 "강한 타격", 혼동 시 전술 오판'],
  ['heal', 'weak',     '회복 vs 약점 — 적록 채널, 색약 최대 위험'],
  ['heal', 'normal',   '회복(아군 이득) vs 일반피해 — 부호 오인'],
  ['resist', 'immune', '저항(절반) vs 무효(0) — 청/보라 인접'],
  ['critical', 'normal', '치명타 vs 일반 — 폰트크기로도 보강되나 색 단독 검증'],
  ['miss', 'normal',   '빗나감(0) vs 일반피해 — 회색 vs 흰색 명도차'],
];

/* ── 2. 색 변환 유틸 ────────────────────────────────────────── */
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

// sRGB 8bit → 선형 휘도 채널
function srgbToLinear(c) {
  const cs = c / 255;
  return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
}

// WCAG 2.x 상대 휘도
function relLuminance([r, g, b]) {
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

// WCAG 대비비 (1.0 ~ 21.0)
function contrastRatio(hexA, hexB) {
  const la = relLuminance(hexToRgb(hexA));
  const lb = relLuminance(hexToRgb(hexB));
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/* ── 3. 색약 시뮬레이션 (Machado et al. 2009, severity 1.0) ──── */
// sRGB 근사 행렬 — 상대 구별성 비교 목적에 충분
const CVD_MATRIX = {
  protanopia:   [[0.152, 1.053, -0.205], [0.115, 0.786, 0.099], [-0.004, -0.048, 1.052]],
  deuteranopia: [[0.367, 0.861, -0.228], [0.280, 0.673, 0.047], [-0.012, 0.043, 0.969]],
  tritanopia:   [[1.256, -0.077, -0.179], [-0.078, 0.931, 0.148], [0.005, 0.691, 0.304]],
};

function simulateCvd(hex, type) {
  const m = CVD_MATRIX[type];
  const [r, g, b] = hexToRgb(hex);
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
  return [
    clamp(m[0][0] * r + m[0][1] * g + m[0][2] * b),
    clamp(m[1][0] * r + m[1][1] * g + m[1][2] * b),
    clamp(m[2][0] * r + m[2][1] * g + m[2][2] * b),
  ];
}

/* ── 4. CIE76 ΔE (지각 색차) — sRGB → XYZ → Lab ─────────────── */
function rgbToXyz([r, g, b]) {
  const R = srgbToLinear(r), G = srgbToLinear(g), B = srgbToLinear(b);
  return [
    (R * 0.4124 + G * 0.3576 + B * 0.1805) * 100,
    (R * 0.2126 + G * 0.7152 + B * 0.0722) * 100,
    (R * 0.0193 + G * 0.1192 + B * 0.9505) * 100,
  ];
}
function xyzToLab([x, y, z]) {
  const ref = [95.047, 100.0, 108.883];
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(x / ref[0]), fy = f(y / ref[1]), fz = f(z / ref[2]);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
function deltaE(rgbA, rgbB) {
  const [l1, a1, b1] = xyzToLab(rgbToXyz(rgbA));
  const [l2, a2, b2] = xyzToLab(rgbToXyz(rgbB));
  return Math.sqrt((l1 - l2) ** 2 + (a1 - a2) ** 2 + (b1 - b2) ** 2);
}

// ΔE 판정 (CIE76 기준): <10 매우 위험, 10~20 주의, 20~49 식별가능, 50+ 명확
function deltaEVerdict(de) {
  if (de < 10) return 'CRITICAL';   // 사실상 같은 색으로 보임
  if (de < 20) return 'WARN';       // 빠른 전투 흐름에서 혼동 가능
  if (de < 49) return 'PASS';       // 구별 가능
  return 'STRONG';                  // 명확히 다름
}

/* ── 5. 분석 실행 ──────────────────────────────────────────── */
const round = (n, d = 2) => Number(n.toFixed(d));

function analyzeContrast(palette, name) {
  const rows = [];
  for (const [key, info] of Object.entries(palette)) {
    const perBg = {};
    for (const [bgKey, bg] of Object.entries(BACKGROUNDS)) {
      const ratio = contrastRatio(info.hex, bg.hex);
      perBg[bgKey] = {
        ratio: round(ratio),
        // WCAG: 큰 텍스트(18.66px+ / 14px bold) AA=3.0 AAA=4.5, 일반 AA=4.5 AAA=7.0
        // 데미지 팝업은 대부분 굵은 대형 텍스트 → 큰 텍스트 기준 적용
        passAA_large: ratio >= 3.0,
        passAAA_large: ratio >= 4.5,
        passAAA_normal: ratio >= 7.0,
      };
    }
    rows.push({ key, ...info, contrast: perBg });
  }
  return { palette: name, rows };
}

function analyzeCvdPairs(palette) {
  const results = [];
  for (const [a, b, risk] of CRITICAL_PAIRS) {
    if (!palette[a] || !palette[b]) continue;
    const hexA = palette[a].hex, hexB = palette[b].hex;
    const normal = deltaE(hexToRgb(hexA), hexToRgb(hexB));
    const cvd = {};
    for (const type of Object.keys(CVD_MATRIX)) {
      cvd[type] = round(deltaE(simulateCvd(hexA, type), simulateCvd(hexB, type)));
    }
    const worst = Math.min(...Object.values(cvd));
    results.push({
      pair: `${a} ↔ ${b}`,
      risk,
      deltaE_normal: round(normal),
      deltaE_cvd: cvd,
      worstCaseDeltaE: worst,
      verdict: deltaEVerdict(worst),
    });
  }
  return results;
}

const damageContrast = analyzeContrast(DAMAGE_COLORS, 'damage');
const resultContrast = analyzeContrast(RESULT_COLORS, 'combat_result');
const cvdPairs = analyzeCvdPairs(DAMAGE_COLORS);

// ── 요약 통계 ──
const allDamageRows = damageContrast.rows;
const failAAOnMidSprite = allDamageRows.filter((r) => !r.contrast.mid_sprite.passAA_large);
const failAAAOnBattleBg = allDamageRows.filter((r) => !r.contrast.battle_bg.passAAA_large);
const cvdRisks = cvdPairs.filter((p) => p.verdict === 'CRITICAL' || p.verdict === 'WARN');

const report = {
  _meta: {
    description: '전투 피드백 색상 가독성 — WCAG 대비비 + 색약 구별성(ΔE) 벤치마크',
    author: '심요연 (Data Analyst)',
    generator: 'scripts/analytics/damage-legibility-contrast.mjs',
    version: '1.0.0',
    method: 'WCAG 2.x relative luminance / CIE76 ΔE / Machado 2009 CVD severity=1.0',
    note: '재생성: node scripts/analytics/damage-legibility-contrast.mjs --json — SSOT 색 변경 시 재실행',
  },
  backgrounds: BACKGROUNDS,
  thresholds: { wcag_AA_large: 3.0, wcag_AAA_large: 4.5, wcag_AAA_normal: 7.0, deltaE_safe: 20 },
  damageContrast,
  resultContrast,
  cvdPairs,
  summary: {
    damageColorsTotal: allDamageRows.length,
    failAA_onMidSprite: failAAOnMidSprite.map((r) => r.key),
    failAAA_onBattleBg: failAAAOnBattleBg.map((r) => r.key),
    cvdRiskPairs: cvdRisks.map((p) => ({ pair: p.pair, verdict: p.verdict, worstDeltaE: p.worstCaseDeltaE })),
  },
};

/* ── 6. 출력 ──────────────────────────────────────────────── */
const outPath = resolve(__dirname, '../../tests/benchmarks/damage-legibility-contrast.json');
const asJson = process.argv.includes('--json');

writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n', 'utf8');

if (asJson) {
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
} else {
  console.log('\n⚔  전투 피드백 색상 가독성 분석 — 심요연 Data Analyst\n' + '─'.repeat(64));
  console.log('\n[WCAG 대비비 — 데미지 팝업 7종]  (배경 #1A1A2E / mid-sprite #6A6A72)');
  for (const r of allDamageRows) {
    const bg = r.contrast.battle_bg, ms = r.contrast.mid_sprite;
    const flagBg = bg.passAAA_large ? '✓AAA' : bg.passAA_large ? '△AA ' : '✗FAIL';
    const flagMs = ms.passAA_large ? '✓' : '✗';
    console.log(
      `  ${r.key.padEnd(9)} ${r.hex}  배경 ${String(bg.ratio).padStart(5)}:1 ${flagBg}` +
      `   mid-sprite ${String(ms.ratio).padStart(5)}:1 ${flagMs}  (${r.semantic})`,
    );
  }
  console.log('\n[색약 구별성 — 의미 충돌 색쌍 ΔE]  (worst = 3색약 중 최악)');
  for (const p of cvdPairs) {
    const mark = p.verdict === 'CRITICAL' ? '🔴' : p.verdict === 'WARN' ? '🟡' : '🟢';
    console.log(
      `  ${mark} ${p.pair.padEnd(22)} 정상 ΔE=${String(p.deltaE_normal).padStart(5)}` +
      `  worst ΔE=${String(p.worstCaseDeltaE).padStart(5)} [${p.verdict}]`,
    );
    console.log(`        prot=${p.deltaE_cvd.protanopia} deut=${p.deltaE_cvd.deuteranopia} trit=${p.deltaE_cvd.tritanopia}  · ${p.risk}`);
  }
  console.log('\n[요약]');
  console.log(`  mid-sprite 위 AA 미달: ${report.summary.failAA_onMidSprite.join(', ') || '없음'}`);
  console.log(`  battle-bg AAA(대형) 미달: ${report.summary.failAAA_onBattleBg.join(', ') || '없음'}`);
  console.log(`  색약 위험 색쌍: ${cvdRisks.map((p) => `${p.pair}[${p.verdict}]`).join(', ') || '없음'}`);
  console.log(`\n→ 벤치마크 저장: ${outPath}\n`);
}
