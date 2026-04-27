/**
 * Battle Design Tokens — Phaser 런타임 상수 (4차 레이어)
 *
 * ─── SSOT 위계 (Phase 54 정리) ────────────────────────────────
 *   1차 SSOT: `/DESIGN.md` §5 컴포넌트 토큰 + docs/art-production/battle-atb-assets-v1.md
 *   2차 (코어): `client/src/config/design-tokens.ts`
 *   3차 (CSS 미러): `client/src/styles/design-system-battle.css` — 본 파일과 1:1 매칭
 *   4차 (본 파일): Phaser 런타임 (0xRRGGBB 정수 형식) — CSS 미러의 코드 변환
 *
 *   변경 절차:
 *     1) DESIGN.md §5 또는 battle-atb-assets-v1.md 갱신
 *     2) `design-system-battle.css` 갱신 (CSS #RRGGBB)
 *     3) 본 파일 갱신 (Phaser 0xRRGGBB)
 *     4) 시각 회귀 테스트 (battle-style-guide.html)
 *
 * 작성: 가춘운 (CMO/디자인) — Build 단계
 * 선행: docs/art-production/battle-atb-assets-v1.md (Assets)
 * SSOT 위계 명시: Phase 54 (2026-04-27)
 */

/* ──────────────────────────────────────────────────────────
 * 1. 컬러 (Phaser 0xRRGGBB 형식 — CSS #RRGGBB 와 값만 다르게)
 * ────────────────────────────────────────────────────────── */
export const BATTLE_COLORS = {
  /** ATB 게이지 (아군) */
  atb: {
    empty:      0x2a2a3a,
    charging1:  0x3a5a7a,
    charging2:  0x5a7fa8,
    charging3:  0x7aafd0,
    ready:      0x89cff0,
    readyGlow:  0x89cff0, // alpha는 0.85 런타임 지정
    frozen:     0x4a4a5a,
  },
  /** ATB 게이지 (적) */
  atbEnemy: {
    empty:      0x3a2a2a,
    charging:   0x8a3a3a,
    ready:      0xff4444,
    readyGlow:  0xff4444, // alpha는 0.75 런타임 지정
  },
  /** 턴 큐 타임라인 */
  turn: {
    active:     0xffd700,
    queued:     0x89cff0,
    skipped:    0x606060,
    bg:         0x14141f,
  },
  /** 대미지 팝업 */
  damage: {
    normal:     0xffffff,
    critical:   0xffd700,
    heal:       0x2ecc71,
    miss:       0xa0a0a0,
    weak:       0xff6b35,
    resist:     0x3498db,
    immune:     0x9b59b6,
  },
  /** 스킬 타입 */
  skill: {
    physical:   0xc19a6b,
    magic:      0x9b59b6,
    heal:       0x2ecc71,
    buff:       0xf1c40f,
    debuff:     0x8e44ad,
    ultimate:   0xff4d8b,
  },
} as const;

/* ──────────────────────────────────────────────────────────
 * 2. 레이어 깊이 (Phaser depth / CSS z-index 동기화)
 * ────────────────────────────────────────────────────────── */
export const BATTLE_DEPTH = {
  background: 0,
  entity:    10,
  vfx:       20,
  hud:       30,
  popup:     40,
  modal:     50,
} as const;

/* ──────────────────────────────────────────────────────────
 * 3. 타이밍 (ms) — CSS 애니메이션 duration과 1:1
 * ────────────────────────────────────────────────────────── */
export const BATTLE_TIMING = {
  /** 게이지 1% 차는 시간 */
  atbTickMs:       80,
  /** 기본 1회전 (속도 1.0 기준) */
  atbFullMs:       8000,
  /** 스킬명 카드 등장 */
  skillCardMs:     500,
  /** 대미지 팝업 수명 (일반) */
  damagePopupMs:   900,
  /** 크리티컬 팝업 수명 */
  critPopupMs:     900,
  /** 턴 큐 슬롯 슬라이드 */
  turnIndicatorMs: 200,
  /** 크리티컬 카메라 쉐이크 */
  critShakeMs:     150,
  critShakeIntensity: 0.005,
} as const;

/* ──────────────────────────────────────────────────────────
 * 4. ATB 속도 보정 (haste/slow/stop 버프 배율)
 * ────────────────────────────────────────────────────────── */
export const ATB_SPEED_MOD = {
  haste:  1.5,
  slow:   0.5,
  stop:   0.0,
  normal: 1.0,
} as const;

/* ──────────────────────────────────────────────────────────
 * 5. 게이지 상태 임계값 (%) — 색상 단계 전환
 * ────────────────────────────────────────────────────────── */
export const ATB_THRESHOLDS = {
  stage1: 0,     // charging1 (#3A5A7A)
  stage2: 33,    // charging2 (#5A7FA8)
  stage3: 66,    // charging3 (#7AAFD0)
  ready:  100,   // ready    (#89CFF0 + pulse)
} as const;

/* ──────────────────────────────────────────────────────────
 * 6. 유틸: 게이지 % → 현재 색상 (Phaser용)
 * ────────────────────────────────────────────────────────── */
export function atbColorForPercent(pct: number, isEnemy = false): number {
  if (isEnemy) {
    return pct >= ATB_THRESHOLDS.ready
      ? BATTLE_COLORS.atbEnemy.ready
      : BATTLE_COLORS.atbEnemy.charging;
  }
  if (pct >= ATB_THRESHOLDS.ready)  return BATTLE_COLORS.atb.ready;
  if (pct >= ATB_THRESHOLDS.stage3) return BATTLE_COLORS.atb.charging3;
  if (pct >= ATB_THRESHOLDS.stage2) return BATTLE_COLORS.atb.charging2;
  return BATTLE_COLORS.atb.charging1;
}

/* ──────────────────────────────────────────────────────────
 * 7. 대미지 팝업 폰트 크기 (CSS font-size와 동기)
 * ────────────────────────────────────────────────────────── */
export const DAMAGE_POPUP_SIZE = {
  normal:    16,
  critical:  32,
  heal:      18,
  miss:      14,
  weak:      22,
  resist:    14,
  immune:    14,
} as const;

export type BattleColorKey = keyof typeof BATTLE_COLORS;
export type DamageType     = keyof typeof BATTLE_COLORS.damage;
export type SkillType      = keyof typeof BATTLE_COLORS.skill;
