/**
 * tickManager.ts — 서버 틱 계층화 매니저
 *
 * 세 가지 독립 틱 레이어를 관리한다:
 * - 물리 틱 (20Hz / 50ms): 충돌 판정, 위치 보간
 * - 네트워크 틱 (10Hz / 100ms): 상태 브로드캐스트
 * - 로직 틱 (2Hz / 500ms): AI 업데이트, 스폰, 버프 만료
 *
 * 각 틱은 독립 setInterval로 구동되며, 성능 메트릭을 수집한다.
 */

// ── 타입 정의 ─────────────────────────────────────────────────

/** 틱 레이어 종류 */
export type TickLayer = 'physics' | 'network' | 'logic';

/** 틱 콜백 — deltaMs는 실제 경과 시간 (목표 간격과 다를 수 있음) */
export type TickCallback = (deltaMs: number) => void;

/** 틱 레이어별 성능 메트릭 */
export interface TickMetrics {
  /** 레이어 이름 */
  layer: TickLayer;
  /** 목표 간격 (ms) */
  targetIntervalMs: number;
  /** 마지막 틱 실행 시간 (ms) */
  lastExecutionMs: number;
  /** 평균 실행 시간 (최근 100회, ms) */
  avgExecutionMs: number;
  /** 최대 실행 시간 (최근 100회, ms) */
  maxExecutionMs: number;
  /** 총 틱 횟수 */
  totalTicks: number;
  /** 오버런 횟수 (실행 시간 > 목표 간격) */
  overrunCount: number;
}

/** 내부 레이어 상태 */
interface TickLayerState {
  layer: TickLayer;
  intervalMs: number;
  callbacks: TickCallback[];
  timer: ReturnType<typeof setInterval> | null;
  lastTickTime: number;
  // 메트릭 수집용
  executionTimes: number[];
  totalTicks: number;
  overrunCount: number;
}

// ── 상수 ──────────────────────────────────────────────────────

/** 메트릭 슬라이딩 윈도우 크기 */
const METRICS_WINDOW = 100;

/** 기본 틱 간격 설정 */
const DEFAULT_INTERVALS: Record<TickLayer, number> = {
  physics: 50,    // 20Hz
  network: 100,   // 10Hz
  logic: 500,     // 2Hz
};

// ── TickManager 클래스 ────────────────────────────────────────

export class TickManager {
  private layers: Map<TickLayer, TickLayerState> = new Map();
  private running = false;

  constructor() {
    // 레이어 초기화
    for (const [layer, intervalMs] of Object.entries(DEFAULT_INTERVALS)) {
      this.layers.set(layer as TickLayer, {
        layer: layer as TickLayer,
        intervalMs,
        callbacks: [],
        timer: null,
        lastTickTime: 0,
        executionTimes: [],
        totalTicks: 0,
        overrunCount: 0,
      });
    }
  }

  /**
   * 틱 콜백 등록
   * @param layer 대상 레이어
   * @param callback 틱마다 호출될 함수
   */
  on(layer: TickLayer, callback: TickCallback): void {
    const state = this.layers.get(layer);
    if (!state) throw new Error(`[TickManager] 알 수 없는 레이어: ${layer}`);
    state.callbacks.push(callback);
  }

  /**
   * 특정 레이어에서 콜백 제거
   */
  off(layer: TickLayer, callback: TickCallback): void {
    const state = this.layers.get(layer);
    if (!state) return;
    state.callbacks = state.callbacks.filter(cb => cb !== callback);
  }

  /**
   * 모든 틱 레이어 시작
   */
  start(): void {
    if (this.running) {
      console.warn('[TickManager] 이미 실행 중');
      return;
    }

    this.running = true;
    const now = Date.now();

    for (const state of this.layers.values()) {
      state.lastTickTime = now;
      state.timer = setInterval(() => {
        this.executeTick(state);
      }, state.intervalMs);

      console.log(`[TickManager] ${state.layer} 틱 시작 — ${1000 / state.intervalMs}Hz (${state.intervalMs}ms)`);
    }

    console.log('[TickManager] 모든 틱 레이어 가동 완료');
  }

  /**
   * 모든 틱 레이어 정지 + 리소스 정리
   */
  stop(): void {
    if (!this.running) return;

    for (const state of this.layers.values()) {
      if (state.timer) {
        clearInterval(state.timer);
        state.timer = null;
      }
    }

    this.running = false;
    console.log('[TickManager] 모든 틱 레이어 정지');
  }

  /**
   * 실행 중 여부
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * 전체 메트릭 조회
   */
  getMetrics(): TickMetrics[] {
    const result: TickMetrics[] = [];

    for (const state of this.layers.values()) {
      const times = state.executionTimes;
      const avg = times.length > 0
        ? times.reduce((a, b) => a + b, 0) / times.length
        : 0;
      const max = times.length > 0
        ? Math.max(...times)
        : 0;
      const last = times.length > 0
        ? times[times.length - 1]
        : 0;

      result.push({
        layer: state.layer,
        targetIntervalMs: state.intervalMs,
        lastExecutionMs: Math.round(last * 100) / 100,
        avgExecutionMs: Math.round(avg * 100) / 100,
        maxExecutionMs: Math.round(max * 100) / 100,
        totalTicks: state.totalTicks,
        overrunCount: state.overrunCount,
      });
    }

    return result;
  }

  /**
   * 특정 레이어 메트릭 조회
   */
  getLayerMetrics(layer: TickLayer): TickMetrics | null {
    return this.getMetrics().find(m => m.layer === layer) ?? null;
  }

  // ── 내부 ────────────────────────────────────────────────────

  private executeTick(state: TickLayerState): void {
    const now = Date.now();
    const deltaMs = now - state.lastTickTime;
    state.lastTickTime = now;

    const startTime = performance.now();

    // 등록된 모든 콜백 실행
    for (const cb of state.callbacks) {
      try {
        cb(deltaMs);
      } catch (err) {
        console.error(`[TickManager] ${state.layer} 틱 콜백 에러:`, err);
      }
    }

    const executionMs = performance.now() - startTime;

    // 메트릭 수집
    state.totalTicks++;
    state.executionTimes.push(executionMs);
    if (state.executionTimes.length > METRICS_WINDOW) {
      state.executionTimes.shift();
    }

    // 오버런 감지
    if (executionMs > state.intervalMs) {
      state.overrunCount++;
      if (state.overrunCount % 10 === 1) {
        console.warn(
          `[TickManager] ${state.layer} 오버런 #${state.overrunCount}: ` +
          `${executionMs.toFixed(1)}ms > ${state.intervalMs}ms 목표`
        );
      }
    }
  }
}

/** 싱글톤 인스턴스 */
export const tickManager = new TickManager();
