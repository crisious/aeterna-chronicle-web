/**
 * 코치마크 오버레이 UI — Stub
 *
 * 한 화면 1개념 원칙을 강제한다. 동시 노출 금지 — 큐로 직렬화.
 * 스킵·재시청 버튼은 본 오버레이에서 제공.
 *
 * 본 파일은 Phaser 컴포넌트의 시그니처만. 렌더링은 development 단계.
 * 디자인 토큰: `client/src/config/design-tokens.ts` + `design_tokens/onboarding.ts`(예정).
 */

import type * as Phaser from 'phaser';
import type { CoachmarkSpec } from './types';

export interface CoachmarkOverlayOptions {
  /** 오버레이가 부착될 씬 */
  scene: Phaser.Scene;
  /** 스킵 클릭 핸들러 */
  onSkip?: (spec: CoachmarkSpec) => void;
  /** 진행 트리거 발화 시 호출 */
  onAdvance?: (spec: CoachmarkSpec, latencyMs: number) => void;
  /** 재시청 메뉴 진입 시 호출 (메인 메뉴에서 외부 트리거) */
  onReplayRequested?: (spec: CoachmarkSpec) => void;
}

/**
 * 코치마크 오버레이 — 단일 인스턴스가 큐를 소비한다.
 *
 * 사용법(예정):
 *   const overlay = new CoachmarkOverlay({ scene, onAdvance });
 *   overlay.show(spec);
 *   // ... 트리거 충족 시 자동으로 hide() 후 onAdvance 호출
 */
export class CoachmarkOverlay {
  private readonly opts: CoachmarkOverlayOptions;
  private current: CoachmarkSpec | null = null;
  private shownAtMs = 0;

  constructor(opts: CoachmarkOverlayOptions) {
    this.opts = opts;
    // STUB: 컨테이너·말풍선·하이라이트 마스크·스킵 버튼 생성 — 구현 단계.
  }

  /**
   * 코치마크 1건 노출. 이미 노출된 것이 있으면 즉시 교체하지 않고
   * 호출자가 큐 단에서 직렬화해야 한다.
   */
  show(spec: CoachmarkSpec): void {
    // STUB: 현재 활성 코치마크 검사 — 동시 노출 금지
    if (this.current !== null) {
      // 검의 날이 무뎌지면 사람이 다친다 — 동시 노출은 학습을 죽인다.
      // 구현 단계에서 큐로 직렬화하거나 경고 throw.
      return;
    }
    this.current = spec;
    this.shownAtMs = performance.now();
    // STUB: 텍스트·하이라이트·트리거 바인딩
  }

  /** 강제 종료 — phase 전환 시 호출 */
  hide(): void {
    // STUB
    this.current = null;
  }

  /** 진행 트리거 충족 시 호출 (외부 시스템 또는 내부 클릭) */
  advance(): void {
    if (!this.current) return;
    const latency = performance.now() - this.shownAtMs;
    const spec = this.current;
    this.hide();
    this.opts.onAdvance?.(spec, latency);
  }

  /** 스킵 버튼 클릭 핸들러 — skippable=false면 무시 */
  skip(): void {
    if (!this.current || !this.current.skippable) return;
    const spec = this.current;
    this.hide();
    this.opts.onSkip?.(spec);
  }

  /** 현재 노출 중인 spec — 테스트·디버그용 */
  getCurrent(): CoachmarkSpec | null {
    return this.current;
  }

  /** 리소스 해제 */
  destroy(): void {
    this.hide();
    // STUB: Phaser 객체 정리
  }
}
