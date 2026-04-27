/**
 * 온보딩 디렉터 — Stub
 *
 * 첫 30분 경험의 오케스트레이터. 단계 전환·코치마크 큐잉·게이트 평가를
 * 하나의 진입점으로 모은다.
 *
 * 책임 분리:
 *  - 디렉터: 단계 전환 + 큐 관리 + 텔레메트리 emit
 *  - Overlay: 단일 코치마크 노출/스킵/진행
 *  - Progress: 진행 영속화 + 게이트 평가
 *  - Registry: 코치마크 SSOT
 *
 * 외부 시스템(BattleScene, DialogueUI, SaveSystem)은 이벤트 버스로 결속.
 * 직접 참조 금지 — 결합도를 칼로 베어둔다.
 */

import type * as Phaser from 'phaser';
import { CoachmarkOverlay } from './CoachmarkOverlay';
import { OnboardingProgress } from './OnboardingProgress';
import {
  ONBOARDING_COACHMARKS,
  coachmarksForPhase,
  isLearningCoachmark,
} from './OnboardingStepRegistry';
import {
  ONBOARDING_PHASES,
  type CoachmarkSpec,
  type OnboardingEvent,
  type OnboardingGateResult,
  type OnboardingPhaseId,
} from './types';

export interface OnboardingDirectorOptions {
  scene: Phaser.Scene;
  progress?: OnboardingProgress;
  /** 텔레메트리 싱크 — telemetry/perfTelemetry 또는 dialogueTelemetry로 라우팅 */
  emit?: (event: OnboardingEvent) => void;
  /** 외부 이벤트 버스 — 전투/대화/세이브에서 발화하는 이벤트 수신 */
  eventBus?: Phaser.Events.EventEmitter;
}

/**
 * 디렉터 — 단계 전환과 큐 소비를 담당.
 *
 * 사용법(예정):
 *   const director = new OnboardingDirector({ scene, eventBus });
 *   director.start();
 *   // ... 외부 이벤트 → 큐 진행 → onComplete()
 */
export class OnboardingDirector {
  private readonly opts: OnboardingDirectorOptions;
  private readonly progress: OnboardingProgress;
  private readonly overlay: CoachmarkOverlay;
  private queue: CoachmarkSpec[] = [];
  private started = false;

  constructor(opts: OnboardingDirectorOptions) {
    this.opts = opts;
    this.progress = opts.progress ?? new OnboardingProgress();
    this.overlay = new CoachmarkOverlay({
      scene: opts.scene,
      onAdvance: (spec, latencyMs) => this.handleAdvance(spec, latencyMs),
      onSkip: (spec) => this.handleSkip(spec),
    });
  }

  // ─── 라이프사이클 ──────────────────────────────────────

  /** 온보딩 시작 — opening_cinematic부터 진입 */
  start(): void {
    if (this.started) return;
    this.started = true;
    this.enterPhase('opening_cinematic');
  }

  /** 단계 진입 — 큐 적재 + 텔레메트리 */
  private enterPhase(phase: OnboardingPhaseId): void {
    this.progress.enterPhase(phase);
    this.queue = [...coachmarksForPhase(phase)];
    this.opts.emit?.({ type: 'phase_enter', phase, tMs: performance.now() });
    // STUB: bind 외부 이벤트 트리거 — eventBus.on(...)
    this.pumpQueue();
  }

  /** 큐에서 다음 코치마크 노출 */
  private pumpQueue(): void {
    const next = this.queue.shift();
    if (!next) {
      // 단계 내 코치마크 모두 소비 → 다음 단계
      this.completeCurrentPhase();
      return;
    }
    this.overlay.show(next);
    this.opts.emit?.({ type: 'coachmark_shown', coachmarkId: next.id, tMs: performance.now() });
  }

  // ─── 콜백 ──────────────────────────────────────────────

  private handleAdvance(spec: CoachmarkSpec, latencyMs: number): void {
    this.opts.emit?.({ type: 'coachmark_advanced', coachmarkId: spec.id, latencyMs });
    if (isLearningCoachmark(spec)) {
      this.progress.markSystemLearned(spec.system);
      this.opts.emit?.({
        type: 'system_learned',
        system: spec.system,
        tMs: performance.now(),
      });
    }
    this.pumpQueue();
  }

  private handleSkip(spec: CoachmarkSpec): void {
    this.opts.emit?.({ type: 'skip_requested', phase: spec.phase, reason: 'user' });
    // 스킵해도 학습은 가산하지 않음 — 이탈 방지 위해 단계 자체는 진행.
    this.pumpQueue();
  }

  private completeCurrentPhase(): void {
    const phase = this.progress.getState().currentPhase;
    this.progress.completePhase(phase);
    this.opts.emit?.({ type: 'phase_complete', phase, tMs: performance.now() });

    const idx = ONBOARDING_PHASES.indexOf(phase);
    const nextPhase = ONBOARDING_PHASES[idx + 1];
    if (nextPhase) {
      this.enterPhase(nextPhase);
    } else {
      this.finishOnboarding();
    }
  }

  private finishOnboarding(): void {
    const totalMs = this.progress.getState().elapsedActiveMs;
    const coverage = this.progress.getSystemCoverage();
    this.opts.emit?.({ type: 'onboarding_complete', totalMs, coverage });
    this.progress.save();
  }

  // ─── 외부 진입점 ───────────────────────────────────────

  /** 전체 스킵 — 재진입 플레이어용 */
  skipAll(): void {
    this.progress.requestSkipAll();
    this.overlay.destroy();
    this.opts.emit?.({
      type: 'skip_requested',
      phase: this.progress.getState().currentPhase,
      reason: 'skip_all',
    });
    this.finishOnboarding();
  }

  /** 재시청 — 메인 메뉴 → 도움말에서 단일 코치마크 다시 보기 */
  replay(coachmarkId: string): void {
    const spec = ONBOARDING_COACHMARKS.find((c) => c.id === coachmarkId && c.replayable);
    if (!spec) return;
    this.opts.emit?.({ type: 'replay_requested', coachmarkId });
    // STUB: 임시 overlay 띄우기 — 진행 상태에 영향 주지 않음
    this.overlay.show(spec);
  }

  /** 게이트 평가 — launch_checklist §2.20(예정) ship-gate 입력 */
  evaluateGate(): OnboardingGateResult {
    // STUB: dropoutByPhase는 텔레메트리 집계 후 채움.
    const dropoutByPhase = ONBOARDING_PHASES.reduce(
      (acc, p) => {
        acc[p] = 0;
        return acc;
      },
      {} as Record<OnboardingPhaseId, number>,
    );

    const systemCoverage = this.progress.getSystemCoverage();
    const within30minRate = this.progress.isWithinBudget() ? 1 : 0; // 단일 세션 측정 — 집계는 backend에서.

    return {
      systemCoverage,
      within30minRate,
      dropoutByPhase,
      pass: systemCoverage >= 1.0 && within30minRate >= 1.0,
    };
  }

  destroy(): void {
    this.overlay.destroy();
    // STUB: eventBus.off(...)
  }
}
