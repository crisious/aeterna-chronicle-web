/**
 * 온보딩 진행 상태 관리 — Stub
 *
 * 책임:
 *  - 단계/시스템 학습 상태를 localStorage에 영속화
 *  - 활동 시간(elapsedActiveMs) 누적 — 30분 ≤ 보장 측정
 *  - 5종 시스템 100% 학습 게이트
 *  - 스킵/재시청 결정 로직
 *
 * 본 파일은 인터페이스 + 메서드 시그니처만. 구현은 development 단계.
 */

import {
  CORE_SYSTEMS,
  type CoreSystemId,
  type OnboardingPhaseId,
  type OnboardingProgressState,
} from './types';

const STORAGE_KEY = 'aeterna_onboarding_progress_v1';

/** 신규 플레이어 초기 상태 팩토리 */
export function createInitialProgress(now: number = Date.now()): OnboardingProgressState {
  // STUB: 5종 시스템 모두 false
  const systemsLearned = CORE_SYSTEMS.reduce(
    (acc, sys) => {
      acc[sys] = false;
      return acc;
    },
    {} as Record<CoreSystemId, boolean>,
  );

  return {
    currentPhase: 'opening_cinematic',
    completedPhases: new Set<OnboardingPhaseId>(),
    systemsLearned,
    startedAtMs: now,
    elapsedActiveMs: 0,
    skippedAll: false,
  };
}

/**
 * 진행 상태 매니저 — director가 보유하는 단일 인스턴스.
 */
export class OnboardingProgress {
  private state: OnboardingProgressState;

  constructor(initial?: OnboardingProgressState) {
    this.state = initial ?? createInitialProgress();
  }

  // ─── 조회 ──────────────────────────────────────────────

  getState(): Readonly<OnboardingProgressState> {
    return this.state;
  }

  /** 5종 시스템 학습 커버리지 (0.0 ~ 1.0) */
  getSystemCoverage(): number {
    const learned = CORE_SYSTEMS.filter((s) => this.state.systemsLearned[s]).length;
    return learned / CORE_SYSTEMS.length;
  }

  /** 30분(=1,800,000ms) 이내 여부 */
  isWithinBudget(budgetMs: number = 30 * 60 * 1000): boolean {
    return this.state.elapsedActiveMs <= budgetMs;
  }

  /** 학습 보장 게이트 — 5종 모두 true이면 PASS */
  hasFullCoverage(): boolean {
    return CORE_SYSTEMS.every((s) => this.state.systemsLearned[s]);
  }

  // ─── 상태 변경 ─────────────────────────────────────────

  markSystemLearned(system: CoreSystemId): void {
    if (this.state.systemsLearned[system]) return;
    this.state.systemsLearned = { ...this.state.systemsLearned, [system]: true };
    // STUB: 텔레메트리 emit + persist
  }

  enterPhase(phase: OnboardingPhaseId): void {
    this.state.currentPhase = phase;
    // STUB: 텔레메트리 + persist
  }

  completePhase(phase: OnboardingPhaseId): void {
    const next = new Set(this.state.completedPhases);
    next.add(phase);
    this.state.completedPhases = next;
    // STUB
  }

  /** 활동 시간 가산 — 메뉴/일시정지 시간은 제외하고 호출 */
  addActiveMs(deltaMs: number): void {
    this.state.elapsedActiveMs += Math.max(0, deltaMs);
  }

  requestSkipAll(): void {
    this.state.skippedAll = true;
    // STUB: persist
  }

  // ─── 영속화 ────────────────────────────────────────────

  /** localStorage에서 복원. 없으면 null. */
  static load(storage: Storage = globalThis.localStorage): OnboardingProgress | null {
    // STUB: JSON parse + Set 복원 + 마이그레이션
    void storage;
    void STORAGE_KEY;
    return null;
  }

  /** 현재 상태를 localStorage에 저장 */
  save(storage: Storage = globalThis.localStorage): void {
    // STUB: Set → array 직렬화
    void storage;
  }

  /** 진행 초기화 — 재시청 메뉴에서 "처음부터" 선택 시 */
  reset(): void {
    this.state = createInitialProgress();
    // STUB: persist
  }
}
