// ─── Wait/Active 모드 컨트롤러 (FF6 레퍼런스) ───────────────────
// UI 상태(menuOpen/targetSelect)와 ATB 진행 여부의 게이트.
// stub: 실제 훅 연결은 Build 단계.

import type { ATBMode } from '../../../../shared/types/atb';

export interface WaitModeState {
  mode: ATBMode;
  /** 아군 어느 누구든 커맨드 메뉴를 연 상태. */
  menuOpen: boolean;
  /** 타겟 커서 선택 중. */
  targetSelecting: boolean;
  /** 아이템 서브메뉴 등 중첩 열림. */
  subMenuDepth: number;
}

/** 초기 상태 팩토리. */
export function createWaitModeState(_mode: ATBMode): WaitModeState {
  throw new Error('NOT_IMPLEMENTED: createWaitModeState');
}

/**
 * 현재 상태에서 ATB 타임라인을 멈춰야 하는지 판정.
 * - ACTIVE: 항상 false (정지 없음).
 * - WAIT:   menuOpen || targetSelecting 이면 true.
 * - SEMI:   targetSelecting 에만 true.
 */
export function shouldFreezeTimeline(_state: WaitModeState): boolean {
  throw new Error('NOT_IMPLEMENTED: shouldFreezeTimeline');
}

/** 메뉴 열림/닫힘 반영. */
export function setMenuOpen(_state: WaitModeState, _open: boolean): WaitModeState {
  throw new Error('NOT_IMPLEMENTED: setMenuOpen');
}

/** 타겟 선택 진입/종료 반영. */
export function setTargetSelecting(
  _state: WaitModeState,
  _selecting: boolean,
): WaitModeState {
  throw new Error('NOT_IMPLEMENTED: setTargetSelecting');
}

/** 모드 런타임 전환 (옵션 메뉴에서 변경). */
export function switchMode(_state: WaitModeState, _next: ATBMode): WaitModeState {
  throw new Error('NOT_IMPLEMENTED: switchMode');
}
