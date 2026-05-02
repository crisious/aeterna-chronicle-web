/**
 * client/src/perf/SceneMemoryGuard.ts — 씬 전환 메모리 누수 가드 (Build)
 *
 * 스프린트: 에테르나 크로니클 성능 최적화 (Build 단계)
 * 작성: 계섬월 (Staff Engineer)
 *
 * 책임:
 *   - 씬 진입/종료 시 heap + 텍스처/리스너/타이머 카운트 캡처
 *   - 종료 직후 강제 GC 시도 후 잔여 자원 차감
 *   - 누수 판정: growthMb > threshold || leaked* > 0
 *   - 5분 윈도우 메모리 증가 측정 (게이트 검증)
 *
 * 비책임:
 *   - 실제 자원 해제 (각 씬의 shutdown 핸들러)
 *   - 렌더 시간 측정 (HotspotProfiler)
 *
 * 새는 메모리는 결국 프레임을 끊는다 — 검의 날이 무뎌지면 사람이 다친다.
 */

import type { MemoryDiagnostic } from './types';

export interface SceneMemoryGuardConfig {
  growthThresholdMb: number;
  forceGcIfAvailable: boolean;
  settleDelayMs: number;
  enabled: boolean;
  /** 진단 이력 보관 상한 (링버퍼) */
  diagnosticsRingSize: number;
}

export const DEFAULT_MEMORY_GUARD_CONFIG: SceneMemoryGuardConfig = {
  growthThresholdMb: 10,
  forceGcIfAvailable: true,
  settleDelayMs: 200,
  enabled: false,
  diagnosticsRingSize: 32,
};

export interface MemoryProbe {
  readHeapMb(): number | undefined;
  listTextureKeys(): string[];
  countActiveListeners(): number;
  countActiveTimers(): number;
  tryForceGc(): boolean;
}

export interface MemoryCheckpoint {
  sceneKey: string;
  capturedAtMs: number;
  heapMb?: number;
  textureKeys: Set<string>;
  listenerCount: number;
  timerCount: number;
}

/** 미지원 환경용 no-op probe */
export const NOOP_MEMORY_PROBE: MemoryProbe = {
  readHeapMb: () => undefined,
  listTextureKeys: () => [],
  countActiveListeners: () => 0,
  countActiveTimers: () => 0,
  tryForceGc: () => false,
};

function delay(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class SceneMemoryGuard {
  private probe: MemoryProbe;
  private config: SceneMemoryGuardConfig;
  private checkpoints = new Map<string, MemoryCheckpoint>();
  private diagnostics: MemoryDiagnostic[] = [];
  private sessionStartHeapMb?: number;

  constructor(
    probe: MemoryProbe,
    config: SceneMemoryGuardConfig = DEFAULT_MEMORY_GUARD_CONFIG,
  ) {
    this.probe = probe;
    this.config = { ...config };
    if (this.config.enabled) {
      this.sessionStartHeapMb = probe.readHeapMb();
    }
  }

  onSceneEnter(sceneKey: string): MemoryCheckpoint {
    const cp: MemoryCheckpoint = {
      sceneKey,
      capturedAtMs: Date.now(),
      heapMb: this.config.enabled ? this.probe.readHeapMb() : undefined,
      textureKeys: new Set(this.config.enabled ? this.probe.listTextureKeys() : []),
      listenerCount: this.config.enabled ? this.probe.countActiveListeners() : 0,
      timerCount: this.config.enabled ? this.probe.countActiveTimers() : 0,
    };
    this.checkpoints.set(sceneKey, cp);
    if (
      this.config.enabled &&
      this.sessionStartHeapMb === undefined &&
      cp.heapMb !== undefined
    ) {
      this.sessionStartHeapMb = cp.heapMb;
    }
    return cp;
  }

  async onSceneExit(sceneKey: string): Promise<MemoryDiagnostic> {
    const baseline = this.checkpoints.get(sceneKey);
    // baseline 없거나 disabled — 누수 없음으로 판정 (no-op)
    if (!baseline || !this.config.enabled) {
      const diag: MemoryDiagnostic = {
        sceneKey,
        heapOnEnterMb: baseline?.heapMb ?? 0,
        heapOnExitMb: 0,
        growthMb: 0,
        leakedTextureKeys: [],
        leakedListenerCount: 0,
        leakedTimerCount: 0,
        isLeak: false,
      };
      return diag;
    }

    await delay(this.config.settleDelayMs);
    if (this.config.forceGcIfAvailable) {
      this.probe.tryForceGc();
      // GC 후 한 번 더 settle (단축)
      await delay(Math.min(this.config.settleDelayMs, 100));
    }

    const heapOnExitMb = this.probe.readHeapMb() ?? 0;
    const heapOnEnterMb = baseline.heapMb ?? 0;
    const growthMb = Math.max(0, heapOnExitMb - heapOnEnterMb);

    const currentTextures = new Set(this.probe.listTextureKeys());
    const leakedTextureKeys: string[] = [];
    for (const key of currentTextures) {
      if (!baseline.textureKeys.has(key)) leakedTextureKeys.push(key);
    }

    const currentListenerCount = this.probe.countActiveListeners();
    const leakedListenerCount = Math.max(
      0,
      currentListenerCount - baseline.listenerCount,
    );

    const currentTimerCount = this.probe.countActiveTimers();
    const leakedTimerCount = Math.max(0, currentTimerCount - baseline.timerCount);

    const isLeak =
      growthMb > this.config.growthThresholdMb ||
      leakedTextureKeys.length > 0 ||
      leakedListenerCount > 0 ||
      leakedTimerCount > 0;

    const diag: MemoryDiagnostic = {
      sceneKey,
      heapOnEnterMb,
      heapOnExitMb,
      growthMb,
      leakedTextureKeys,
      leakedListenerCount,
      leakedTimerCount,
      isLeak,
    };

    this.checkpoints.delete(sceneKey);
    this.pushDiagnostic(diag);
    return diag;
  }

  private pushDiagnostic(diag: MemoryDiagnostic): void {
    this.diagnostics.push(diag);
    const overflow = this.diagnostics.length - this.config.diagnosticsRingSize;
    if (overflow > 0) this.diagnostics.splice(0, overflow);
  }

  getSessionGrowthMb(): number {
    if (!this.config.enabled || this.sessionStartHeapMb === undefined) return 0;
    const current = this.probe.readHeapMb();
    if (current === undefined) return 0;
    return Math.max(0, current - this.sessionStartHeapMb);
  }

  getRecentDiagnostics(limit = 20): MemoryDiagnostic[] {
    return this.diagnostics.slice(-limit);
  }

  reset(): void {
    this.checkpoints.clear();
    this.diagnostics.length = 0;
    this.sessionStartHeapMb = this.config.enabled
      ? this.probe.readHeapMb()
      : undefined;
  }

  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    if (enabled && this.sessionStartHeapMb === undefined) {
      this.sessionStartHeapMb = this.probe.readHeapMb();
    }
  }
}
