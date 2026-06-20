/**
 * Battle Feedback Tokens — 데미지·상태이상 가독성 런타임 토큰 (4차 레이어)
 *
 * ─── SSOT 위계 ────────────────────────────────────────────────
 *   1차 SSOT: `docs/art-production/battle-feedback-readability-v1.md` (정본)
 *             + `/DESIGN.md` §5 컴포넌트 토큰
 *   2차 (코어): `client/src/config/design-tokens.ts`
 *   3차 (CSS 미러): `client/src/styles/design-system-battle.css` §4·§14
 *   4차 (본 파일): Phaser 런타임 (0xRRGGBB 정수) + DOM 보조 (#RRGGBB 문자열)
 *
 *   ⚠️ 통폐합 대상 — 본 파일이 상태이상 색의 단일 출처입니다.
 *     · combat/StatusEffectRenderer.ts EFFECT_VISUALS → 본 토큰 import 로 치환(계섬월 Build)
 *     · constants/battle-tokens.ts BATTLE_COLORS.damage → 본 파일과 1:1 유지
 *
 * 작성: 가춘운 (CMO/디자인) — 에셋 단계 (구현 자원 준비)
 * 작성일: 2026-06-20
 */

/* ──────────────────────────────────────────────────────────
 * 1. 데미지 팝업 가독성 — 형태 마커 + 크기(v1) + 색
 *    색약 대응: 색 외 prefix 글리프로 종류 1차 식별.
 * ────────────────────────────────────────────────────────── */
export interface DamageFeedbackSpec {
  /** 색약 대응 형태 prefix (빈 문자열 = 마커 없음) */
  readonly marker: string;
  /** DOM 색 (#RRGGBB) */
  readonly colorCss: string;
  /** Phaser 색 (0xRRGGBB) */
  readonly colorHex: number;
  /** v1 가독성 보정 폰트 크기 (px) */
  readonly fontSize: number;
}

export const DAMAGE_FEEDBACK = {
  normal:   { marker: '',  colorCss: '#FFFFFF', colorHex: 0xffffff, fontSize: 16 },
  critical: { marker: '★', colorCss: '#FFD700', colorHex: 0xffd700, fontSize: 36 },
  weak:     { marker: '▲', colorCss: '#FF6B35', colorHex: 0xff6b35, fontSize: 24 },
  resist:   { marker: '▼', colorCss: '#3498DB', colorHex: 0x3498db, fontSize: 18 },
  immune:   { marker: '⊘', colorCss: '#9B59B6', colorHex: 0x9b59b6, fontSize: 18 },
  heal:     { marker: '✚', colorCss: '#2ECC71', colorHex: 0x2ecc71, fontSize: 20 },
  miss:     { marker: '✗', colorCss: '#A0A0A0', colorHex: 0xa0a0a0, fontSize: 16 },
} satisfies Record<string, DamageFeedbackSpec>;

/** 8방향 1px 검정 픽셀 아웃라인 (DOM text-shadow). prefers-contrast 시 OUTLINE_STRONG. */
export const DAMAGE_OUTLINE =
  '-1px -1px 0 #000, 0 -1px 0 #000, 1px -1px 0 #000, ' +
  '-1px 0 0 #000, 1px 0 0 #000, ' +
  '-1px 1px 0 #000, 0 1px 0 #000, 1px 1px 0 #000';

export const DAMAGE_OUTLINE_STRONG =
  '-2px -2px 0 #000, 0 -2px 0 #000, 2px -2px 0 #000, ' +
  '-2px 0 0 #000, 2px 0 0 #000, ' +
  '-2px 2px 0 #000, 0 2px 0 #000, 2px 2px 0 #000';

/** Phaser Text stroke 등가 (thickness px) */
export const DAMAGE_STROKE = { color: '#000000', thickness: 2 } as const;

/* ──────────────────────────────────────────────────────────
 * 2. 다단히트 스태거 — 동일 타깃 연속 팝업 겹침 해소
 * ────────────────────────────────────────────────────────── */
export const DAMAGE_STAGGER = {
  /** n번째 팝업 등장 지연 = n * delayMs */
  delayMs: 90,
  /** 짝/홀 인덱스 좌우 분산 (px) */
  offsetX: 14,
  /** n번째마다 시작 높이 누적 상향 (px) */
  offsetY: -6,
  /** 초과 시 합산 표기 (… ×N) */
  maxConcurrent: 6,
} as const;

/** 인덱스 → 스태거 좌표 오프셋 (0-base) */
export function staggerOffset(index: number): { x: number; y: number; delayMs: number } {
  const sign = index % 2 === 0 ? -1 : 1;
  return {
    x: sign * DAMAGE_STAGGER.offsetX,
    y: index * DAMAGE_STAGGER.offsetY,
    delayMs: index * DAMAGE_STAGGER.delayMs,
  };
}

/* ──────────────────────────────────────────────────────────
 * 3. 상태이상 통합 토큰 — 색(v1 보정) + 글리프 + 카테고리 + 대비등급
 *    3중 잉여(색·형태·테두리)로 색약/저대비 환경 식별 보장.
 * ────────────────────────────────────────────────────────── */
export type StatusCategory = 'dot' | 'control' | 'debuff' | 'buff';
export type ContrastGrade = 'AAA' | 'AA' | 'AA-graphic';

export interface StatusFeedbackSpec {
  readonly label: string;
  /** 색약 대응 폴백 글리프 (PNG 로드 실패 시 텍스트 표시) */
  readonly glyph: string;
  /** v1 가독성 보정 색 (DOM) */
  readonly colorCss: string;
  /** v1 가독성 보정 색 (Phaser) */
  readonly colorHex: number;
  readonly category: StatusCategory;
  /** 배경 #0D0D1A 기준 WCAG 등급 */
  readonly contrast: ContrastGrade;
}

export const STATUS_FEEDBACK: Record<string, StatusFeedbackSpec> = {
  // ── dot (지속 피해) ──
  poison: { label: '독',   glyph: '☠', colorCss: '#3DD13D', colorHex: 0x3dd13d, category: 'dot', contrast: 'AAA' },
  burn:   { label: '화상', glyph: '▲', colorCss: '#FF5A2C', colorHex: 0xff5a2c, category: 'dot', contrast: 'AA' },
  bleed:  { label: '출혈', glyph: '◆', colorCss: '#E03A3A', colorHex: 0xe03a3a, category: 'dot', contrast: 'AA' },
  // ── control (행동 제어) ──
  stun:    { label: '기절', glyph: '✦', colorCss: '#FFE14D', colorHex: 0xffe14d, category: 'control', contrast: 'AAA' },
  silence: { label: '침묵', glyph: '⊘', colorCss: '#A35FD1', colorHex: 0xa35fd1, category: 'control', contrast: 'AA' },
  freeze:  { label: '빙결', glyph: '❄', colorCss: '#5FC8FF', colorHex: 0x5fc8ff, category: 'control', contrast: 'AAA' },
  charm:   { label: '매혹', glyph: '♥', colorCss: '#FF7FD1', colorHex: 0xff7fd1, category: 'control', contrast: 'AA' },
  // ── debuff (약화) ──
  slow:  { label: '감속', glyph: '↓', colorCss: '#6E92D6', colorHex: 0x6e92d6, category: 'debuff', contrast: 'AA' },
  blind: { label: '실명', glyph: '◐', colorCss: '#8A8A9E', colorHex: 0x8a8a9e, category: 'debuff', contrast: 'AA' },
  curse: { label: '저주', glyph: '✸', colorCss: '#9B4DC4', colorHex: 0x9b4dc4, category: 'debuff', contrast: 'AA-graphic' },
  // ── buff (강화) ──
  attack_up:  { label: '공격↑', glyph: '⚔', colorCss: '#FF9933', colorHex: 0xff9933, category: 'buff', contrast: 'AA' },
  defense_up: { label: '방어↑', glyph: '⛊', colorCss: '#5599FF', colorHex: 0x5599ff, category: 'buff', contrast: 'AA' },
  haste:      { label: '가속↑', glyph: '⏩', colorCss: '#4DE88A', colorHex: 0x4de88a, category: 'buff', contrast: 'AAA' },
  regen:      { label: '재생↑', glyph: '✚', colorCss: '#9BE85A', colorHex: 0x9be85a, category: 'buff', contrast: 'AAA' },
  shield:     { label: '보호', glyph: '⛨', colorCss: '#FFD94D', colorHex: 0xffd94d, category: 'buff', contrast: 'AAA' },
} as const;

/* ──────────────────────────────────────────────────────────
 * 4. 카테고리 테두리 — 형태 잉여 #2 (PatternOverlay 연동)
 * ────────────────────────────────────────────────────────── */
export interface CategoryBorderSpec {
  readonly colorCss: string;
  readonly colorHex: number;
  /** PatternOverlay 패턴 키 */
  readonly pattern: 'dotted' | 'solid-bold' | 'solid' | 'double';
  /** 칩 정렬 우선순위 (낮을수록 먼저 — 위험 우선) */
  readonly priority: number;
}

export const STATUS_CATEGORY_BORDER: Record<StatusCategory, CategoryBorderSpec> = {
  control: { colorCss: '#FF4D6A', colorHex: 0xff4d6a, pattern: 'solid-bold', priority: 0 },
  dot:     { colorCss: '#FF7A3C', colorHex: 0xff7a3c, pattern: 'dotted',     priority: 1 },
  debuff:  { colorCss: '#9B59B6', colorHex: 0x9b59b6, pattern: 'solid',      priority: 2 },
  buff:    { colorCss: '#FFD700', colorHex: 0xffd700, pattern: 'double',     priority: 3 },
} as const;

/* ──────────────────────────────────────────────────────────
 * 5. 상태이상 칩 치수 (CSS .ac-status-chip 와 동기)
 * ────────────────────────────────────────────────────────── */
export const STATUS_CHIP = {
  size: 18,
  sizeMobile: 16,
  glyphFontSize: 11,
  stackBadgeSize: 8,
  durationBarHeight: 2,
  /** 트레이 최대 표시 후 +N 오버플로 */
  maxDisplay: 4,
} as const;

/* ──────────────────────────────────────────────────────────
 * 6. 유틸
 * ────────────────────────────────────────────────────────── */
/** 효과 ID → 통합 스펙 (미정의 시 undefined → 호출측 폴백) */
export function getStatusFeedback(effectId: string): StatusFeedbackSpec | undefined {
  return STATUS_FEEDBACK[effectId];
}

/** 효과 ID → 카테고리 테두리 (정렬·렌더용) */
export function getCategoryBorder(effectId: string): CategoryBorderSpec | undefined {
  const spec = STATUS_FEEDBACK[effectId];
  return spec ? STATUS_CATEGORY_BORDER[spec.category] : undefined;
}

/** 트레이 정렬: control > dot > debuff > buff (위험 먼저), 동순위는 잔여시간 짧은 순 */
export function sortByPriority<T extends { effectId: string; remainingDuration?: number }>(effects: T[]): T[] {
  return [...effects].sort((a, b) => {
    const pa = getCategoryBorder(a.effectId)?.priority ?? 99;
    const pb = getCategoryBorder(b.effectId)?.priority ?? 99;
    if (pa !== pb) return pa - pb;
    return (a.remainingDuration ?? 0) - (b.remainingDuration ?? 0);
  });
}

export type DamageFeedbackKey = keyof typeof DAMAGE_FEEDBACK;
export type StatusFeedbackKey = keyof typeof STATUS_FEEDBACK;
