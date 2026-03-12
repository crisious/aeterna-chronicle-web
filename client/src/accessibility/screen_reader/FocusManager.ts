/**
 * FocusManager — 포커스 순서 + 트랩 + 복원 (P17-13)
 *
 * WCAG 2.1 AA 기준:
 *   - 2.1.1 키보드: 모든 기능 키보드 접근 가능
 *   - 2.4.3 포커스 순서: 논리적 순서 유지
 *   - 2.4.7 포커스 가시성: 포커스 인디케이터 항상 표시
 */

import { getAriaMap, type ScreenAriaMap, type AriaElementDef } from './AriaLabelMap';

// ─── 타입 ───────────────────────────────────────────────────────

interface FocusTrapState {
  /** 트랩 대상 화면 */
  screenId: string;
  /** 트랩 활성화 전 포커스 요소 */
  previousFocus: HTMLElement | null;
  /** 트랩 내 포커스 가능 요소 목록 */
  focusableElements: HTMLElement[];
  /** 현재 포커스 인덱스 */
  currentIndex: number;
}

interface FocusHistoryEntry {
  screenId: string;
  elementSelector: string;
}

// ─── FocusManager ───────────────────────────────────────────────

export class FocusManager {
  private trapStack: FocusTrapState[] = [];
  private focusHistory: FocusHistoryEntry[] = [];
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;
  private focusStyleInjected = false;

  // ── 초기화 ─────────────────────────────────────────────────

  /** 포커스 관리 시스템 시작 */
  init(): void {
    this.injectFocusStyles();
    this.bindGlobalKeyHandler();
  }

  /** 포커스 관리 시스템 해제 */
  destroy(): void {
    this.unbindGlobalKeyHandler();
    this.trapStack = [];
    this.focusHistory = [];
  }

  // ── 포커스 트랩 ────────────────────────────────────────────

  /**
   * 모달/다이얼로그 열 때 포커스 트랩 활성화
   * Tab/Shift+Tab이 트랩 내 요소들 사이에서만 순환
   */
  pushTrap(screenId: string): void {
    const map = getAriaMap(screenId);
    if (!map || !map.focusTrap) return;

    // 현재 포커스 저장
    const previousFocus = document.activeElement as HTMLElement | null;

    // 트랩 내 포커스 가능 요소 수집
    const focusableElements = this.collectFocusable(map);

    const state: FocusTrapState = {
      screenId,
      previousFocus,
      focusableElements,
      currentIndex: 0,
    };

    this.trapStack.push(state);

    // 첫 요소로 포커스 이동
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }
  }

  /**
   * 모달/다이얼로그 닫을 때 포커스 트랩 해제
   * 이전 포커스 위치로 복원
   */
  popTrap(): void {
    const state = this.trapStack.pop();
    if (!state) return;

    // 이전 포커스 복원
    if (state.previousFocus && document.contains(state.previousFocus)) {
      state.previousFocus.focus();
    }
  }

  /** 현재 트랩 활성 여부 */
  isTrapped(): boolean {
    return this.trapStack.length > 0;
  }

  /** 현재 트랩의 다음 요소로 포커스 */
  focusNextInTrap(): void {
    const state = this.currentTrap();
    if (!state || state.focusableElements.length === 0) return;

    state.currentIndex = (state.currentIndex + 1) % state.focusableElements.length;
    state.focusableElements[state.currentIndex].focus();
  }

  /** 현재 트랩의 이전 요소로 포커스 */
  focusPrevInTrap(): void {
    const state = this.currentTrap();
    if (!state || state.focusableElements.length === 0) return;

    state.currentIndex = state.currentIndex <= 0
      ? state.focusableElements.length - 1
      : state.currentIndex - 1;
    state.focusableElements[state.currentIndex].focus();
  }

  // ── 포커스 히스토리 ────────────────────────────────────────

  /** 화면 전환 시 포커스 위치 기록 */
  saveFocusPosition(screenId: string): void {
    const active = document.activeElement as HTMLElement | null;
    if (!active) return;

    const selector = this.getElementSelector(active);
    if (selector) {
      // 같은 화면 기존 기록 덮어쓰기
      const existing = this.focusHistory.findIndex(h => h.screenId === screenId);
      if (existing >= 0) {
        this.focusHistory[existing].elementSelector = selector;
      } else {
        this.focusHistory.push({ screenId, elementSelector: selector });
      }
    }
  }

  /** 화면 복귀 시 포커스 위치 복원 */
  restoreFocusPosition(screenId: string): boolean {
    const entry = this.focusHistory.find(h => h.screenId === screenId);
    if (!entry) return false;

    const element = document.querySelector(entry.elementSelector) as HTMLElement | null;
    if (element) {
      element.focus();
      return true;
    }
    return false;
  }

  // ── ARIA 속성 적용 ─────────────────────────────────────────

  /** 화면의 ARIA 매핑을 DOM에 적용 */
  applyAriaMap(screenId: string): void {
    const map = getAriaMap(screenId);
    if (!map) return;

    for (const elDef of map.elements) {
      const el = document.querySelector(elDef.selector) as HTMLElement | null;
      if (!el) continue;

      el.setAttribute('role', elDef.role);
      if (elDef.label) {
        el.setAttribute('aria-label', elDef.label);
      }
      el.setAttribute('tabindex', String(elDef.tabindex));

      if (elDef.live) {
        el.setAttribute('aria-live', elDef.live);
      }

      if (elDef.extra) {
        for (const [key, value] of Object.entries(elDef.extra)) {
          el.setAttribute(key, value);
        }
      }
    }
  }

  // ── 내부 헬퍼 ──────────────────────────────────────────────

  private currentTrap(): FocusTrapState | null {
    return this.trapStack.length > 0
      ? this.trapStack[this.trapStack.length - 1]
      : null;
  }

  /** 화면 매핑에서 포커스 가능 요소 수집 */
  private collectFocusable(map: ScreenAriaMap): HTMLElement[] {
    const elements: HTMLElement[] = [];

    // focusOrder 기준 정렬
    const sorted = [...map.elements]
      .filter(e => e.tabindex >= 0)
      .sort((a, b) => (a.focusOrder ?? 999) - (b.focusOrder ?? 999));

    for (const elDef of sorted) {
      const el = document.querySelector(elDef.selector) as HTMLElement | null;
      if (el && !el.hasAttribute('disabled')) {
        elements.push(el);
      }
    }

    return elements;
  }

  /** DOM 요소의 고유 선택자 생성 */
  private getElementSelector(el: HTMLElement): string | null {
    if (el.id) return `#${el.id}`;
    const ariaId = el.dataset.ariaId;
    if (ariaId) return `[data-aria-id="${ariaId}"]`;
    return null;
  }

  /** 글로벌 키 핸들러 — 트랩 내 Tab 제어 */
  private bindGlobalKeyHandler(): void {
    if (this.keyHandler) return;

    this.keyHandler = (e: KeyboardEvent) => {
      if (!this.isTrapped()) return;

      if (e.key === 'Tab') {
        e.preventDefault();
        if (e.shiftKey) {
          this.focusPrevInTrap();
        } else {
          this.focusNextInTrap();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.popTrap();
      }
    };

    document.addEventListener('keydown', this.keyHandler, true);
  }

  private unbindGlobalKeyHandler(): void {
    if (this.keyHandler) {
      document.removeEventListener('keydown', this.keyHandler, true);
      this.keyHandler = null;
    }
  }

  /** 포커스 표시기 스타일 주입 */
  private injectFocusStyles(): void {
    if (this.focusStyleInjected) return;

    const style = document.createElement('style');
    style.id = 'aeterna-focus-styles';
    style.textContent = `
      /* 기본 포커스 인디케이터 */
      :focus-visible {
        outline: 3px solid #4488FF;
        outline-offset: 2px;
      }

      /* 고대비 모드 포커스 인디케이터 */
      .aeterna-high-contrast :focus-visible {
        outline: 3px solid #00FF00;
        outline-offset: 2px;
        box-shadow: 0 0 0 5px rgba(0, 255, 0, 0.3);
      }

      /* 포커스 트랩 활성 시 배경 어둡게 */
      .aeterna-focus-trap-active::before {
        content: '';
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        z-index: 9998;
        pointer-events: none;
      }
    `;
    document.head.appendChild(style);
    this.focusStyleInjected = true;
  }
}

/** 싱글톤 인스턴스 */
export const focusManager = new FocusManager();
