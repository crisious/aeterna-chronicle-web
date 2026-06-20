/**
 * battleFeedbackPresenter.ts — 전투 피드백 렌더 오케스트레이션 인터페이스 (에셋 골격)
 *
 * ─── 역할 ─────────────────────────────────────────────────────
 *   damageFeedbackResolver 가 산정한 ResolvedDamageStyle 을 받아 화면에 띄운다.
 *   3곳으로 분산된 데미지 팝업 경로(BattleScene 인라인 / EffectManager.spawnDamageText
 *   / StatusEffectRenderer.showDotDamage)를 단일 진입점으로 묶기 위한 표면(surface).
 *
 *   해소(분류·색)는 resolver, 배치(좌표·스태거·풀)·트윈·모션 가드는 본 presenter.
 *
 * ─── 담당 PRD 백로그 ──────────────────────────────────────────
 *   B5  동시 DoT 결정적 스택 배치(겹침 0, K5) — staggerOffset 소비
 *   B7  팝업 풀 상한 회수(가장 오래된 것부터)
 *   B10 모션 감소 가드(점멸→정적, 쉐이크 억제, FR-6)
 *
 * ⚠️ 에셋 단계: 인터페이스·시그니처 골격만. Phaser 구현체는 Build.
 * 작성: 계섬월 (Staff Engineer) — 에셋 단계
 * 작성일: 2026-06-20
 */

import { DAMAGE_STAGGER, staggerOffset } from '../constants/battle-feedback-tokens';
import type { ResolvedDamageStyle } from './damageFeedbackResolver';

// ─── 좌표 + 배치 ───────────────────────────────────────────────

/** 월드 좌표(앵커 — 보통 타깃 스프라이트 중심) */
export interface AnchorPoint {
  readonly x: number;
  readonly y: number;
}

/**
 * presenter 에 넘기는 단일 팝업 요청.
 * style 은 resolver 가 만든 것을 그대로 — presenter 는 색/문구를 재해석하지 않는다.
 */
export interface DamagePopupRequest {
  readonly anchor: AnchorPoint;
  readonly value: number;
  readonly style: ResolvedDamageStyle;
  /** 같은 프레임 동일 타깃 연속 팝업 식별(겹침 해소) — 미지정 시 단발 */
  readonly targetId?: string;
}

// ─── 모션 가드 (B10 / FR-6) ───────────────────────────────────

/**
 * 모션 감소 정책 조회. `prefers-reduced-motion` 또는 게임 내 설정 중 하나라도 ON 이면
 * 점멸/쉐이크를 정적 표현으로 강등한다. 정보(무슨 효과인지)는 100% 보존.
 */
export interface MotionGuard {
  /** 점멸 허용 여부(화상 등). false = 정적 오버레이로 대체. */
  allowBlink(): boolean;
  /** 카메라 쉐이크 허용 여부(크리티컬 등). */
  allowShake(): boolean;
  /** 팝업 상승 트윈 지속(ms) — 모션 감소 시 단축/0 가능. */
  popupDurationMs(base: number): number;
}

// ─── presenter 표면 ───────────────────────────────────────────

/**
 * 전투 피드백 표시 단일 진입점.
 * 구현체(Build)는 Phaser.Scene 텍스트 풀을 보유하고 스태거/회수를 관리한다.
 */
export interface BattleFeedbackPresenter {
  /**
   * 데미지/힐/약점 팝업 1건 표시(또는 스태거 큐 적재).
   * 동일 targetId 연속 호출은 staggerOffset 으로 결정적 분산.
   */
  showDamage(req: DamagePopupRequest): void;

  /**
   * DoT 틱 팝업 — 동시 다발 시 결정적 세로 스택(K5 겹침 0).
   * @param hitIndex 같은 타깃 동시 틱의 0-base 인덱스
   */
  showDotTick(req: DamagePopupRequest, hitIndex: number): void;

  /** 프레임 갱신(상승·페이드·풀 회수·점멸 토글). delta = ms. */
  update(delta: number): void;

  /** 전체 팝업 파괴 + 풀 반환(전투 종료). */
  destroy(): void;
}

// ─── 스태거 배치 헬퍼 (순수 — 골격 단계 노출 가능) ─────────────

/** 스태거 적용 후 최종 좌표 + 등장 지연. resolver/presenter 공용. */
export interface StaggeredPlacement {
  readonly x: number;
  readonly y: number;
  readonly delayMs: number;
  /** 풀 상한 초과로 합산(… ×N) 처리 대상인지 */
  readonly overflow: boolean;
}

/**
 * 앵커 + 동시 인덱스 → 결정적 배치 좌표.
 * `Math.random()` 분산을 대체(PRD US-BF-04). DAMAGE_STAGGER 토큰 소비.
 *
 * @param anchor 기준 좌표
 * @param index  동시 팝업 0-base 인덱스
 */
export function placeStaggered(anchor: AnchorPoint, index: number): StaggeredPlacement {
  const off = staggerOffset(index);
  return {
    x: anchor.x + off.x,
    y: anchor.y + off.y,
    delayMs: off.delayMs,
    overflow: index >= DAMAGE_STAGGER.maxConcurrent,
  };
}

/**
 * presenter 구현체 팩토리(Build 에서 Phaser.Scene 주입).
 * ⚠️ 골격: 시그니처만. 구현은 Build B5/B7.
 */
export function createBattleFeedbackPresenter(
  _scene: unknown,
  _motionGuard: MotionGuard,
): BattleFeedbackPresenter {
  // TODO(Build B5/B7): Phaser.Scene 텍스트 풀 + 스태거 큐 + 풀 상한 회수 구현.
  throw new Error('[asset-stub] createBattleFeedbackPresenter 미구현 — Build B5/B7');
}
