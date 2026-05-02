/**
 * Save System — Auto-Save Scheduler
 *
 * 책임: 자동 세이브 트리거 통합.
 *
 * 트리거 정책:
 *   1) 주기 — DEFAULT_AUTOSAVE_INTERVAL_MS 마다 (보스/인터랙티브 중 보류)
 *   2) 지역 진입·보스 처치·챕터 전환 — notify(...)로 즉시
 *   3) visibilitychange:hidden — 즉시 (best-effort)
 *   4) beforeunload — 동기 호출 후 즉시
 *
 * 디바운스: AUTOSAVE_DEBOUNCE_MS 이내 중복 트리거는 무시.
 */

import type { SaveTriggerKind, SaveResult } from './types';

// ─── 정책 상수 ───────────────────────────────────────────────────────────
export const DEFAULT_AUTOSAVE_INTERVAL_MS = 60_000;
export const AUTOSAVE_DEBOUNCE_MS = 2_000;
export const BLOCK_DURING_BOSS = true;

const MIN_INTERVAL_MS = 10_000;
const MAX_INTERVAL_MS = 10 * 60_000;

// ─── 외부 컨텍스트 ──────────────────────────────────────────────────────
export interface AutoSaveContext {
  performSave: (trigger: SaveTriggerKind) => Promise<SaveResult<void>>;
  isInBossEncounter: () => boolean;
  isInteractive: () => boolean;
  /** Date.now wrapper — 테스트에서 고정 가능 */
  now?: () => number;
}

// ─── 스케줄러 ────────────────────────────────────────────────────────────
export class AutoSaveScheduler {
  private intervalMs: number = DEFAULT_AUTOSAVE_INTERVAL_MS;
  private timerHandle: ReturnType<typeof setInterval> | null = null;
  private lastSaveAtMs: number = 0;
  private running: boolean = false;
  private inflight: boolean = false;

  // 핸들러 참조 보관 — removeEventListener 정합성
  private readonly visibilityHandler: () => void;
  private readonly beforeUnloadHandler: () => void;

  private readonly now: () => number;

  constructor(private readonly ctx: AutoSaveContext) {
    this.now = ctx.now ?? (() => Date.now());
    this.visibilityHandler = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        this.notify('app_pause');
      }
    };
    this.beforeUnloadHandler = () => {
      this.notify('pre_quit');
    };
  }

  start(): void {
    if (this.running) return;
    this.running = true;

    this.timerHandle = setInterval(() => {
      this.notify('autosave_timer');
    }, this.intervalMs);

    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
      document.addEventListener('visibilitychange', this.visibilityHandler);
    }
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('beforeunload', this.beforeUnloadHandler);
    }
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;

    if (this.timerHandle !== null) {
      clearInterval(this.timerHandle);
      this.timerHandle = null;
    }
    if (typeof document !== 'undefined' && typeof document.removeEventListener === 'function') {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
    }
    if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
      window.removeEventListener('beforeunload', this.beforeUnloadHandler);
    }
  }

  /**
   * 트리거 통지. 디바운스/블로킹 정책 적용 후 performSave.
   * fire-and-forget 형태 — 호출자 흐름을 막지 않는다.
   */
  notify(trigger: SaveTriggerKind): void {
    if (!this.running && trigger !== 'pre_quit') return;

    // 보스 중에는 timer/zone_enter/chapter_advance 차단.
    // 단 pre_quit/app_pause는 데이터 보호 우선 — 막지 않음.
    if (
      BLOCK_DURING_BOSS &&
      this.ctx.isInBossEncounter() &&
      trigger !== 'pre_quit' &&
      trigger !== 'app_pause' &&
      trigger !== 'manual'
    ) {
      return;
    }

    // 인터랙티브 메뉴 열림 등에서는 timer만 보류 (이벤트성 트리거는 통과)
    if (trigger === 'autosave_timer' && this.ctx.isInteractive()) {
      return;
    }

    const t = this.now();
    if (t - this.lastSaveAtMs < AUTOSAVE_DEBOUNCE_MS && trigger !== 'pre_quit') {
      return;
    }

    if (this.inflight) return;
    this.inflight = true;
    // 낙관적 갱신 — 디바운스 윈도우는 시작 시점 기준
    this.lastSaveAtMs = t;

    void this.ctx.performSave(trigger).then(
      result => {
        this.inflight = false;
        if (!result.ok) {
          // 실패 시 디바운스 풀어 다음 트리거가 즉시 시도 가능하도록.
          this.lastSaveAtMs = 0;
        }
      },
      () => {
        this.inflight = false;
        this.lastSaveAtMs = 0;
      },
    );
  }

  /** 주기 변경 — 클램프 + 재시작 */
  setInterval(ms: number): void {
    const clamped = Math.max(MIN_INTERVAL_MS, Math.min(MAX_INTERVAL_MS, Math.floor(ms)));
    if (clamped === this.intervalMs) return;
    this.intervalMs = clamped;
    if (this.running && this.timerHandle !== null) {
      clearInterval(this.timerHandle);
      this.timerHandle = setInterval(() => {
        this.notify('autosave_timer');
      }, this.intervalMs);
    }
  }
}
