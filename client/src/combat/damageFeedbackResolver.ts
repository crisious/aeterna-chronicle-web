/**
 * damageFeedbackResolver.ts — 데미지·DoT 피드백 분류 + SSOT 스타일 해소 (에셋 골격)
 *
 * ─── 역할 ─────────────────────────────────────────────────────
 *   서버 전투 결과(값·크리·힐·미스·속성 상성)를 받아 **표시 메타를 클라에서 산정**하고,
 *   SSOT 토큰(색·폰트·글리프·라벨)으로 묶은 단일 스타일 객체를 렌더러에 넘긴다.
 *   PRD `prd_battle-feedback-readability.md` §7 B2 `resolveDamageStyle()` 의 골격.
 *
 * ─── 순수성 ───────────────────────────────────────────────────
 *   Phaser/DOM 비의존 — 단위 테스트 타깃(PRD K3 색약 SSIM · K4 약점/저항 스냅샷).
 *   렌더(좌표·트윈·풀)는 battleFeedbackPresenter.ts 가 담당.
 *
 * ─── SSOT 위계 (소비 전용 — 역방향 갱신 금지) ──────────────────
 *   색·글리프·크기 : constants/battle-feedback-tokens.ts (DAMAGE_FEEDBACK)
 *   폰트 크기      : constants/battle-tokens.ts (DAMAGE_POPUP_SIZE)
 *   라벨 문구      : i18n/{ko,en,ja}.json (키 경유 — 하드코딩 금지, NFR §8)
 *
 * ⚠️ 에셋 단계: 타입·시그니처 골격만. 분류 로직 본문은 Build B2 에서 구현.
 * 작성: 계섬월 (Staff Engineer) — 에셋 단계
 * 작성일: 2026-06-20
 */

import {
  DAMAGE_FEEDBACK,
  STATUS_FEEDBACK,
  type DamageFeedbackKey,
  type DamageFeedbackSpec,
  type StatusFeedbackKey,
} from '../constants/battle-feedback-tokens';
import { DAMAGE_POPUP_SIZE } from '../constants/battle-tokens';

// ─── 입력: 클라 산정 전 원시 전투 결과 ─────────────────────────

/**
 * 속성 상성 — 서버 데미지 공식 결과를 클라가 분류한 표시용 등급.
 * (서버 스키마 불변 — 비목표 §2.2. 클라가 배수/플래그로부터 산정.)
 */
export type ElementEffectiveness = 'weak' | 'resist' | 'immune' | 'neutral';

/**
 * 데미지 팝업 1건의 분류 입력.
 * `DamageEvent`(services/CombatEffectManager) 를 표시 분류용으로 확장한 형.
 * 좌표(x/y)는 표시 메타가 아니므로 제외 — 분류는 좌표를 모른다(순수성).
 */
export interface DamageFeedbackInput {
  /** 데미지/힐 절대값(부호 없음). 0 허용(미스/면역 시 무시). */
  readonly value: number;
  /** 크리티컬 여부 */
  readonly isCritical?: boolean;
  /** 회복 여부(부호 `+` · 상승 방향) */
  readonly isHeal?: boolean;
  /** 회피/빗나감 — 숫자 대신 "MISS" 라벨 우선 */
  readonly isMiss?: boolean;
  /** 속성 상성(미지정 시 neutral) */
  readonly effectiveness?: ElementEffectiveness;
  /** DoT 출처 효과 ID(poison/burn/bleed…) — 지정 시 색 소스가 STATUS_FEEDBACK 으로 전환 */
  readonly dotEffectId?: StatusFeedbackKey | string;
  /** 다단히트 인덱스(0-base) — 스태거 배치용. presenter 가 소비. */
  readonly hitIndex?: number;
}

// ─── 출력: 렌더러가 그대로 소비하는 해소된 스타일 ──────────────

/** 부호 표기 — 힐 `+`, 흡혈/반사 데미지 `−`, 일반 없음 */
export type SignPrefix = '' | '+' | '−';

/**
 * 분류 + 토큰 합성 결과. 렌더러(Phaser/DOM)는 이 객체만 보고 그린다.
 * 색·형태·라벨 3중 잉여를 보장(WCAG AAA 색-비의존, PRD G2).
 */
export interface ResolvedDamageStyle {
  /** 분류된 피드백 종류 */
  readonly key: DamageFeedbackKey;
  /** 색약 대응 형태 prefix 글리프(빈 문자열 = 없음) */
  readonly marker: string;
  /** i18n 라벨 키(예: 'battle.feedback.weak'). null = 숫자만 표시 */
  readonly labelKey: string | null;
  /** DOM 색 (#RRGGBB) */
  readonly colorCss: string;
  /** Phaser 색 (0xRRGGBB) */
  readonly colorHex: number;
  /** 폰트 크기(px) — DAMAGE_POPUP_SIZE SSOT, 14px 봉인 준수 */
  readonly fontSizePx: number;
  /** 굵게 강조 여부(크리티컬 등) */
  readonly emphasizeBold: boolean;
  /** false = 숫자 대신 라벨 우선(면역/미스) */
  readonly showValue: boolean;
  /** 값 앞 부호 */
  readonly signPrefix: SignPrefix;
}

// ─── i18n 라벨 키 매핑 (키 SSOT — 문구는 i18n 리소스) ──────────

/**
 * 피드백 종류 → i18n 라벨 키. null 인 종류는 라벨 없이 숫자/부호만.
 * ⚠️ 골격: 키 네임스페이스만 선언. ko/en/ja 리소스 추가는 Build B4(컨벤션상 PR 동시).
 */
export const DAMAGE_LABEL_KEY: Readonly<Record<DamageFeedbackKey, string | null>> = {
  normal: null,
  critical: 'battle.feedback.critical',
  weak: 'battle.feedback.weak',
  resist: 'battle.feedback.resist',
  immune: 'battle.feedback.immune',
  heal: null,
  miss: 'battle.feedback.miss',
};

// ─── 분류기 (Build B2 구현) ────────────────────────────────────

/**
 * 원시 입력 → 단일 피드백 종류 분류.
 *
 * 우선순위(상호배타 해소): miss > immune > heal > critical > weak > resist > normal.
 * (면역은 약점/크리보다 우선 — "안 통함"이 최상위 신호. 미스는 데미지 자체 부재.)
 * 단락 평가 — 첫 일치에서 즉시 반환. 순서가 곧 규칙이다.
 *
 * @returns DAMAGE_FEEDBACK 의 키
 */
export function classifyDamage(input: DamageFeedbackInput): DamageFeedbackKey {
  if (input.isMiss) return 'miss';
  if (input.effectiveness === 'immune') return 'immune';
  if (input.isHeal) return 'heal';
  if (input.isCritical) return 'critical';
  if (input.effectiveness === 'weak') return 'weak';
  if (input.effectiveness === 'resist') return 'resist';
  return 'normal';
}

/**
 * 분류 + SSOT 토큰 합성 → 렌더용 스타일.
 * PRD §7 B2 핵심 헬퍼. DoT(`dotEffectId` 지정) 면 색 소스를 STATUS_FEEDBACK 으로 전환.
 *
 * 폰트는 `DAMAGE_POPUP_SIZE`(battle-tokens) 단일 출처 — 14px 봉인 보장.
 * (DAMAGE_FEEDBACK.fontSize 는 색·마커 동반 메타일 뿐 폰트 SSOT 가 아니다. 이중화 주의: B1 정합 대상.)
 *
 * @example
 *   resolveDamageStyle({ value: 240, effectiveness: 'weak' })
 *   // → { key:'weak', marker:'▲', labelKey:'battle.feedback.weak',
 *   //     colorHex:0xff6b35, fontSizePx:22, showValue:true, signPrefix:'' }
 */
export function resolveDamageStyle(input: DamageFeedbackInput): ResolvedDamageStyle {
  // DoT 출처(지속피해 틱)면 색 소스를 효과별 토큰으로 전환 — 분류 우선순위 우회.
  if (input.dotEffectId != null && input.dotEffectId !== '') {
    return resolveDotStyle(String(input.dotEffectId), input.isHeal ? -input.value : input.value);
  }

  const key = classifyDamage(input);
  const spec = DAMAGE_FEEDBACK[key];

  // 면역·미스는 숫자가 무의미 → 라벨 우선(숫자 숨김). 그 외엔 값 표시.
  const showValue = key !== 'immune' && key !== 'miss';

  return {
    key,
    marker: spec.marker,
    labelKey: DAMAGE_LABEL_KEY[key],
    colorCss: spec.colorCss,
    colorHex: spec.colorHex,
    fontSizePx: DAMAGE_POPUP_SIZE[key], // 14px 봉인 단일 출처
    emphasizeBold: key === 'critical',
    showValue,
    signPrefix: key === 'heal' ? '+' : '',
  };
}

/**
 * DoT 전용 스타일 — 색 소스가 효과별(STATUS_FEEDBACK[effectId]) 로 바뀐다.
 * 미정의 효과는 normal/heal 폴백(절대 throw 금지 — 표시 계층은 전투를 막지 않는다).
 *
 * @param effectId  DoT 효과 ID(poison/burn/bleed…)
 * @param damage    틱 데미지(음수 = 재생/heal)
 */
export function resolveDotStyle(effectId: string, damage: number): ResolvedDamageStyle {
  const status = STATUS_FEEDBACK[effectId as StatusFeedbackKey];
  const isHeal = damage < 0;
  const baseKey: DamageFeedbackKey = isHeal ? 'heal' : 'normal';
  const fallback = DAMAGE_FEEDBACK[baseKey];

  // 효과 토큰 우선, 미정의 시 normal/heal 색·마커로 폴백. 글리프는 색-비의존 단서(WCAG).
  return {
    key: baseKey,
    marker: status?.glyph ?? fallback.marker,
    labelKey: null, // DoT 틱은 라벨 없이 숫자+글리프(효과 식별은 상태이상 트레이가 담당)
    colorCss: status?.colorCss ?? fallback.colorCss,
    colorHex: status?.colorHex ?? fallback.colorHex,
    fontSizePx: DAMAGE_POPUP_SIZE[baseKey], // 14px 봉인
    emphasizeBold: false,
    showValue: true,
    signPrefix: isHeal ? '+' : '',
  };
}

// ─── 조회 유틸 (순수 — 골격 단계에서 안전하게 노출 가능) ────────

/** 피드백 종류 → 정적 토큰 스펙(색·글리프·크기). 미구현 분류와 무관한 순수 조회. */
export function getDamageSpec(key: DamageFeedbackKey): DamageFeedbackSpec {
  return DAMAGE_FEEDBACK[key];
}

/** 피드백 종류 → SSOT 폰트 크기(px). 14px 봉인 단일 출처. */
export function getDamageFontSize(key: DamageFeedbackKey): number {
  return DAMAGE_POPUP_SIZE[key];
}

/** 피드백 종류 → i18n 라벨 키(없으면 null). */
export function getDamageLabelKey(key: DamageFeedbackKey): string | null {
  return DAMAGE_LABEL_KEY[key];
}
