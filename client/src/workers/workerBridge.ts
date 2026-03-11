/**
 * workerBridge.ts — 메인 스레드 ↔ Worker 메시지 브릿지
 *
 * Worker 통신을 Promise 기반으로 추상화하고,
 * Worker 로드 실패 시 메인 스레드 fallback을 자동 적용한다.
 * Vite worker import 방식 사용.
 */

// ── 타입 정의 ─────────────────────────────────────────────────

/** Worker 응답 공통 구조 */
interface WorkerResponse {
  type: string;
  id: string;
  [key: string]: unknown;
}

/** 경로 탐색 결과 */
export interface PathfindResult {
  path: Array<{ x: number; y: number }>;
  found: boolean;
  computeMs: number;
}

/** 충돌 예측 결과 */
export interface CollisionResult {
  collisions: Array<{ entityA: string; entityB: string; time: number }>;
  computeMs: number;
}

/** 인코딩 결과 */
export interface EncodeResult {
  buffer: ArrayBuffer;
}

/** 디코딩 결과 */
export interface DecodeResult {
  payload: Record<string, unknown>;
}

// ── WorkerBridge 클래스 ───────────────────────────────────────

export class WorkerBridge {
  private physicsWorker: Worker | null = null;
  private networkWorker: Worker | null = null;

  /** 대기 중인 요청 → resolve/reject 맵 */
  private pending = new Map<string, {
    resolve: (value: unknown) => void;
    reject: (reason: unknown) => void;
    timeout: ReturnType<typeof setTimeout>;
  }>();

  /** 요청 ID 카운터 */
  private idCounter = 0;

  /** Worker 사용 가능 여부 */
  private physicsReady = false;
  private networkReady = false;

  /** 기본 타임아웃 (ms) */
  private readonly timeoutMs: number;

  constructor(options?: { timeoutMs?: number }) {
    this.timeoutMs = options?.timeoutMs ?? 5000;
  }

  /**
   * Worker 초기화 — Vite worker import 방식
   * Worker 로드 실패 시 해당 Worker는 비활성화되고 fallback 모드로 전환
   */
  async init(): Promise<void> {
    // Physics Worker
    try {
      const PhysicsWorkerModule = await import('./physicsWorker?worker');
      this.physicsWorker = new PhysicsWorkerModule.default();
      this.physicsWorker.onmessage = (e: MessageEvent) => this.handleResponse(e.data as WorkerResponse);
      this.physicsWorker.onerror = (err) => {
        console.error('[WorkerBridge] Physics Worker 에러:', err);
        this.physicsReady = false;
      };
      this.physicsReady = true;
      console.log('[WorkerBridge] Physics Worker 로드 완료');
    } catch (err) {
      console.warn('[WorkerBridge] Physics Worker 로드 실패, fallback 모드:', err);
      this.physicsReady = false;
    }

    // Network Worker
    try {
      const NetworkWorkerModule = await import('./networkWorker?worker');
      this.networkWorker = new NetworkWorkerModule.default();
      this.networkWorker.onmessage = (e: MessageEvent) => this.handleResponse(e.data as WorkerResponse);
      this.networkWorker.onerror = (err) => {
        console.error('[WorkerBridge] Network Worker 에러:', err);
        this.networkReady = false;
      };
      this.networkReady = true;
      console.log('[WorkerBridge] Network Worker 로드 완료');
    } catch (err) {
      console.warn('[WorkerBridge] Network Worker 로드 실패, fallback 모드:', err);
      this.networkReady = false;
    }
  }

  /**
   * 경로 탐색 요청 (Physics Worker 또는 fallback)
   */
  async pathfind(
    startX: number, startY: number,
    endX: number, endY: number,
    obstacles: Array<{ x: number; y: number; width: number; height: number }>,
    gridSize = 64
  ): Promise<PathfindResult> {
    if (!this.physicsReady || !this.physicsWorker) {
      // Fallback: 직선 경로 반환
      return {
        path: [{ x: startX, y: startY }, { x: endX, y: endY }],
        found: true,
        computeMs: 0,
      };
    }

    const result = await this.sendRequest(this.physicsWorker, {
      type: 'pathfind',
      startX, startY, endX, endY, obstacles, gridSize,
    });

    return result as PathfindResult;
  }

  /**
   * 충돌 예측 요청 (Physics Worker 또는 fallback)
   */
  async predictCollisions(
    entities: Array<{ id: string; x: number; y: number; vx: number; vy: number; radius: number }>,
    deltaMs: number
  ): Promise<CollisionResult> {
    if (!this.physicsReady || !this.physicsWorker) {
      return { collisions: [], computeMs: 0 };
    }

    const result = await this.sendRequest(this.physicsWorker, {
      type: 'collision-predict',
      entities, deltaMs,
    });

    return result as CollisionResult;
  }

  /**
   * Protobuf 인코딩 요청 (Network Worker 또는 fallback)
   */
  async encode(messageType: string, payload: Record<string, unknown>): Promise<EncodeResult> {
    if (!this.networkReady || !this.networkWorker) {
      // Fallback: JSON → ArrayBuffer
      const json = JSON.stringify(payload);
      const encoder = new TextEncoder();
      return { buffer: encoder.encode(json).buffer };
    }

    const result = await this.sendRequest(this.networkWorker, {
      type: 'encode',
      messageType,
      payload,
    });

    return result as EncodeResult;
  }

  /**
   * Protobuf 디코딩 요청 (Network Worker 또는 fallback)
   */
  async decode(messageType: string, buffer: ArrayBuffer): Promise<DecodeResult> {
    if (!this.networkReady || !this.networkWorker) {
      // Fallback: ArrayBuffer → JSON 파싱 시도
      const decoder = new TextDecoder();
      try {
        const payload = JSON.parse(decoder.decode(buffer)) as Record<string, unknown>;
        return { payload };
      } catch {
        return { payload: {} };
      }
    }

    const result = await this.sendRequest(this.networkWorker, {
      type: 'decode',
      messageType,
      buffer,
    });

    return result as DecodeResult;
  }

  /**
   * Worker 상태 조회
   */
  getStatus(): { physics: boolean; network: boolean; pendingRequests: number } {
    return {
      physics: this.physicsReady,
      network: this.networkReady,
      pendingRequests: this.pending.size,
    };
  }

  /**
   * 리소스 정리 — Worker 종료
   */
  destroy(): void {
    // 대기 중인 요청 모두 reject
    for (const [id, entry] of this.pending) {
      clearTimeout(entry.timeout);
      entry.reject(new Error('[WorkerBridge] 종료됨'));
      this.pending.delete(id);
    }

    this.physicsWorker?.terminate();
    this.networkWorker?.terminate();
    this.physicsWorker = null;
    this.networkWorker = null;
    this.physicsReady = false;
    this.networkReady = false;

    console.log('[WorkerBridge] 모든 Worker 종료');
  }

  // ── 내부 ────────────────────────────────────────────────────

  private generateId(): string {
    return `req_${++this.idCounter}_${Date.now().toString(36)}`;
  }

  private sendRequest(worker: Worker, data: Record<string, unknown>): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const id = this.generateId();
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`[WorkerBridge] 요청 타임아웃: ${id}`));
      }, this.timeoutMs);

      this.pending.set(id, { resolve, reject, timeout });
      worker.postMessage({ ...data, id });
    });
  }

  private handleResponse(response: WorkerResponse): void {
    if (!response || !response.id) return;

    // 'ready' 신호는 무시
    if (response.type === 'ready') return;

    const entry = this.pending.get(response.id);
    if (!entry) return;

    clearTimeout(entry.timeout);
    this.pending.delete(response.id);
    entry.resolve(response);
  }
}

/** 싱글톤 인스턴스 */
export const workerBridge = new WorkerBridge();
