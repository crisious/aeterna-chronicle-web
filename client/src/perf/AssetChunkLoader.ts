/**
 * client/src/perf/AssetChunkLoader.ts — 에셋 청크 lazy 로더 (Build)
 *
 * 스프린트: 에테르나 크로니클 성능 최적화 (Build 단계)
 * 작성: 계섬월 (Staff Engineer)
 *
 * 책임:
 *   - 청크 매니페스트 기반 lazy 분할 로드
 *   - bootPreload(): 'preload' 그룹 동기 로드 → 초기 로딩 게이트 측정
 *   - ensureFor(): 트리거(sceneKey/chapterId) 기반 보장 로드
 *   - prefetch / evict / runGc — 메모리 압박 정리
 *   - 동시 다운로드 상한 + 우선순위 큐 + 재시도
 *
 * 비책임:
 *   - 실제 Phaser preload (ChunkPhaserAdapter 위임)
 *   - 텍스처 atlas 생성 (빌드 타임)
 */

import type { AssetChunkManifest, ChunkLoadState } from './types';

export interface AssetChunkLoaderConfig {
  maxConcurrent: number;
  retries: number;
  evictAfterMs: number;
  evictHeapPressureMb: number;
}

export const DEFAULT_CHUNK_LOADER_CONFIG: AssetChunkLoaderConfig = {
  maxConcurrent: 3,
  retries: 2,
  evictAfterMs: 120_000,
  evictHeapPressureMb: 256,
};

export interface ChunkRuntimeStatus {
  chunkId: string;
  state: ChunkLoadState;
  lastChangeMs: number;
  lastUsedMs: number;
  progress: number;
  errorReason?: string;
}

export interface ChunkManifestProvider {
  list(): AssetChunkManifest[];
  byId(chunkId: string): AssetChunkManifest | undefined;
  findByTrigger(trigger: string): AssetChunkManifest[];
}

export interface ChunkPhaserAdapter {
  loadChunk(
    chunk: AssetChunkManifest,
    onProgress: (progress: number) => void,
  ): Promise<void>;
  evictChunk(chunk: AssetChunkManifest): void;
}

/** 우선순위 낮을수록 먼저 (priority asc) */
function comparePriority(a: AssetChunkManifest, b: AssetChunkManifest): number {
  return a.priority - b.priority;
}

interface QueueItem {
  chunk: AssetChunkManifest;
  resolve: () => void;
  reject: (err: unknown) => void;
  /** prefetch는 priority+1000으로 후순위 */
  effectivePriority: number;
}

export class AssetChunkLoader {
  private provider: ChunkManifestProvider;
  private adapter: ChunkPhaserAdapter;
  private config: AssetChunkLoaderConfig;

  private statuses = new Map<string, ChunkRuntimeStatus>();
  private inFlight = new Map<string, Promise<void>>();
  private queue: QueueItem[] = [];
  private activeCount = 0;
  private initialLoadStartMs?: number;
  private initialLoadEndMs?: number;
  /** heap probe — 외부 주입 가능 (선택) */
  private heapProbe?: () => number | undefined;

  constructor(
    provider: ChunkManifestProvider,
    adapter: ChunkPhaserAdapter,
    config: AssetChunkLoaderConfig = DEFAULT_CHUNK_LOADER_CONFIG,
  ) {
    this.provider = provider;
    this.adapter = adapter;
    this.config = { ...config };
  }

  /** 선택: heap pressure 기반 evict 트리거용 probe 주입 */
  setHeapProbe(probe: () => number | undefined): void {
    this.heapProbe = probe;
  }

  async bootPreload(): Promise<void> {
    this.initialLoadStartMs = Date.now();
    const preloads = this.provider
      .list()
      .filter((c) => c.group === 'preload')
      .sort(comparePriority);

    try {
      await Promise.all(preloads.map((c) => this.loadChunkById(c.chunkId)));
    } finally {
      this.initialLoadEndMs = Date.now();
    }
  }

  async ensureFor(trigger: string): Promise<void> {
    const matches = this.provider.findByTrigger(trigger).sort(comparePriority);
    const tasks: Promise<void>[] = [];
    for (const chunk of matches) {
      const status = this.statuses.get(chunk.chunkId);
      if (status?.state === 'loaded') {
        // 이미 로드됨 — lastUsedMs만 갱신
        status.lastUsedMs = Date.now();
        continue;
      }
      tasks.push(this.loadChunkById(chunk.chunkId));
    }
    await Promise.all(tasks);
  }

  prefetch(chunkIds: string[]): void {
    for (const id of chunkIds) {
      const chunk = this.provider.byId(id);
      if (!chunk) continue;
      const status = this.statuses.get(id);
      if (status && (status.state === 'loaded' || status.state === 'loading')) {
        continue;
      }
      // fire-and-forget — 후순위 우선도
      void this.enqueue(chunk, chunk.priority + 1000).catch(() => undefined);
    }
  }

  evict(chunkIds: string[]): void {
    for (const id of chunkIds) {
      const chunk = this.provider.byId(id);
      if (!chunk) continue;
      const status = this.statuses.get(id);
      if (!status || status.state !== 'loaded') continue;
      try {
        this.adapter.evictChunk(chunk);
      } catch {
        // adapter 실패는 evicted 상태 진입을 막지 않음 — 로깅 책임은 호출자
      }
      this.setState(id, 'evicted', 0);
    }
  }

  runGc(): void {
    const now = Date.now();
    const heap = this.heapProbe?.();
    const underPressure =
      heap !== undefined && heap >= this.config.evictHeapPressureMb;

    const candidates: string[] = [];
    for (const status of this.statuses.values()) {
      if (status.state !== 'loaded') continue;
      const idleFor = now - status.lastUsedMs;
      if (idleFor < this.config.evictAfterMs) continue;
      // 압박 시 idleFor만으로 충분, 평시는 idleFor + 매니페스트 group이 optional/region/battle만
      if (underPressure) {
        candidates.push(status.chunkId);
      } else {
        const chunk = this.provider.byId(status.chunkId);
        if (!chunk) continue;
        if (chunk.group === 'preload' || chunk.group === 'chapter') continue;
        candidates.push(status.chunkId);
      }
    }
    if (candidates.length > 0) this.evict(candidates);
  }

  getStatus(chunkId: string): ChunkRuntimeStatus | undefined {
    const s = this.statuses.get(chunkId);
    return s ? { ...s } : undefined;
  }

  snapshot(): ChunkRuntimeStatus[] {
    return Array.from(this.statuses.values()).map((s) => ({ ...s }));
  }

  getInitialLoadMs(): number | undefined {
    if (this.initialLoadStartMs === undefined) return undefined;
    if (this.initialLoadEndMs === undefined) {
      // 진행 중 — 현재 경과
      return Date.now() - this.initialLoadStartMs;
    }
    return this.initialLoadEndMs - this.initialLoadStartMs;
  }

  // --- 내부 ---

  private loadChunkById(chunkId: string): Promise<void> {
    const existing = this.inFlight.get(chunkId);
    if (existing) return existing;

    const status = this.statuses.get(chunkId);
    if (status?.state === 'loaded') {
      status.lastUsedMs = Date.now();
      return Promise.resolve();
    }

    const chunk = this.provider.byId(chunkId);
    if (!chunk) {
      return Promise.reject(new Error(`unknown chunk: ${chunkId}`));
    }
    const p = this.enqueue(chunk, chunk.priority);
    this.inFlight.set(chunkId, p);
    p.finally(() => this.inFlight.delete(chunkId));
    return p;
  }

  private enqueue(chunk: AssetChunkManifest, effectivePriority: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.queue.push({ chunk, resolve, reject, effectivePriority });
      this.queue.sort((a, b) => a.effectivePriority - b.effectivePriority);
      this.setState(chunk.chunkId, 'queued', 0);
      this.pump();
    });
  }

  private pump(): void {
    while (this.activeCount < this.config.maxConcurrent && this.queue.length > 0) {
      const item = this.queue.shift()!;
      this.activeCount++;
      void this.runItem(item);
    }
  }

  private async runItem(item: QueueItem): Promise<void> {
    const { chunk, resolve, reject } = item;
    let lastError: unknown;
    const maxAttempts = Math.max(1, this.config.retries + 1);
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        this.setState(chunk.chunkId, 'loading', 0);
        await this.adapter.loadChunk(chunk, (progress) => {
          const s = this.statuses.get(chunk.chunkId);
          if (s) s.progress = progress;
        });
        this.setState(chunk.chunkId, 'loaded', 1);
        resolve();
        this.activeCount--;
        this.pump();
        return;
      } catch (err) {
        lastError = err;
      }
    }
    const reason = lastError instanceof Error ? lastError.message : String(lastError);
    const s = this.statuses.get(chunk.chunkId);
    if (s) s.errorReason = reason;
    this.setState(chunk.chunkId, 'failed', 0);
    reject(lastError);
    this.activeCount--;
    this.pump();
  }

  private setState(
    chunkId: string,
    state: ChunkLoadState,
    progress: number,
  ): void {
    const now = Date.now();
    const existing = this.statuses.get(chunkId);
    if (!existing) {
      this.statuses.set(chunkId, {
        chunkId,
        state,
        lastChangeMs: now,
        lastUsedMs: state === 'loaded' ? now : 0,
        progress,
      });
      return;
    }
    existing.state = state;
    existing.lastChangeMs = now;
    existing.progress = progress;
    if (state === 'loaded') existing.lastUsedMs = now;
    if (state !== 'failed') existing.errorReason = undefined;
  }
}
