/**
 * NetworkManager — 클라이언트 네트워크 레이어 단일 진입점 (P10-12)
 *
 * Socket + REST 통합 관리.
 * 씬별 직접 소켓/fetch 호출 대신 이 매니저를 경유한다.
 * 연결 상태 관리, 재연결 로직을 중앙화한다.
 *
 * P10-08의 NetworkService와 통합하여 단일 네트워크 진입점을 제공한다.
 */

import { io, Socket } from 'socket.io-client';

// ── 타입 정의 ─────────────────────────────────────────────────

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export interface NetworkConfig {
  /** 서버 URL */
  serverUrl: string;
  /** 최대 재연결 시도 횟수 */
  maxReconnectAttempts: number;
  /** 재연결 간격 (ms) */
  reconnectIntervalMs: number;
  /** REST 요청 타임아웃 (ms) */
  restTimeoutMs: number;
}

export type ConnectionChangeHandler = (state: ConnectionState) => void;
export type EventHandler = (data: unknown) => void;

// ── 기본 설정 ─────────────────────────────────────────────────

const DEFAULT_CONFIG: NetworkConfig = {
  serverUrl: (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SERVER_URL)
    || 'http://localhost:3000',
  maxReconnectAttempts: 5,
  reconnectIntervalMs: 3000,
  restTimeoutMs: 10_000,
};

// ── NetworkManager 클래스 ─────────────────────────────────────

class NetworkManager {
  private socket: Socket | null = null;
  private config: NetworkConfig;
  private _state: ConnectionState = 'disconnected';
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  private connectionChangeHandlers: ConnectionChangeHandler[] = [];
  private eventHandlers: Map<string, EventHandler[]> = new Map();

  constructor(config?: Partial<NetworkConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ── 연결 상태 ───────────────────────────────────────────────

  get state(): ConnectionState {
    return this._state;
  }

  get isConnected(): boolean {
    return this._state === 'connected' && (this.socket?.connected ?? false);
  }

  get socketId(): string | undefined {
    return this.socket?.id;
  }

  /**
   * 연결 상태 변경 구독
   */
  onConnectionChange(handler: ConnectionChangeHandler): () => void {
    this.connectionChangeHandlers.push(handler);
    return () => {
      this.connectionChangeHandlers = this.connectionChangeHandlers.filter((h) => h !== handler);
    };
  }

  // ── Socket 연결 ─────────────────────────────────────────────

  /**
   * 서버에 소켓 연결
   */
  connect(serverUrl?: string): void {
    if (this.socket?.connected) {
      console.warn('[NetworkManager] 이미 연결됨');
      return;
    }

    const url = serverUrl ?? this.config.serverUrl;
    this.setState('connecting');
    this.reconnectAttempt = 0;

    this.socket = io(url, {
      reconnection: false, // 자체 재연결 로직 사용
    });

    this.socket.on('connect', () => {
      this.reconnectAttempt = 0;
      this.setState('connected');
      console.log(`[NetworkManager] 연결 성공: ${this.socket?.id}`);
    });

    this.socket.on('disconnect', (reason) => {
      console.log(`[NetworkManager] 연결 끊김: ${reason}`);
      if (reason !== 'io client disconnect') {
        this.attemptReconnect();
      } else {
        this.setState('disconnected');
      }
    });

    this.socket.on('connect_error', (err) => {
      console.warn(`[NetworkManager] 연결 오류: ${err.message}`);
      this.attemptReconnect();
    });

    // 등록된 이벤트 핸들러 재바인딩
    for (const [event, handlers] of this.eventHandlers) {
      for (const handler of handlers) {
        this.socket.on(event, handler);
      }
    }
  }

  /**
   * 연결 종료
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.socket?.disconnect();
    this.socket = null;
    this.setState('disconnected');
  }

  // ── Socket 이벤트 ───────────────────────────────────────────

  /**
   * 소켓 이벤트 전송
   */
  emit(event: string, data: unknown): void {
    if (!this.socket?.connected) {
      console.warn(`[NetworkManager] 전송 실패 (미연결): ${event}`);
      return;
    }
    this.socket.emit(event, data);
  }

  /**
   * 소켓 이벤트 리스너 등록
   * (재연결 시 자동 복원됨)
   */
  on(event: string, handler: EventHandler): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
    this.socket?.on(event, handler);

    return () => this.off(event, handler);
  }

  /**
   * 소켓 이벤트 리스너 제거
   */
  off(event: string, handler: EventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const idx = handlers.indexOf(handler);
      if (idx >= 0) handlers.splice(idx, 1);
    }
    this.socket?.off(event, handler);
  }

  // ── REST API ────────────────────────────────────────────────

  /**
   * REST GET 요청
   */
  async get<T = unknown>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(path, this.config.serverUrl);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(this.config.restTimeoutMs),
    });

    if (!response.ok) {
      throw new Error(`[NetworkManager] GET ${path} failed: ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * REST POST 요청
   */
  async post<T = unknown>(path: string, body?: unknown): Promise<T> {
    const url = new URL(path, this.config.serverUrl);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(this.config.restTimeoutMs),
    });

    if (!response.ok) {
      throw new Error(`[NetworkManager] POST ${path} failed: ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  // ── 재연결 로직 ─────────────────────────────────────────────

  private attemptReconnect(): void {
    if (this.reconnectAttempt >= this.config.maxReconnectAttempts) {
      console.error(`[NetworkManager] 최대 재연결 시도 초과 (${this.config.maxReconnectAttempts}회)`);
      this.setState('error');
      return;
    }

    this.reconnectAttempt++;
    this.setState('reconnecting');

    const delay = this.config.reconnectIntervalMs * Math.min(this.reconnectAttempt, 5);
    console.log(`[NetworkManager] 재연결 시도 ${this.reconnectAttempt}/${this.config.maxReconnectAttempts} (${delay}ms 후)`);

    this.reconnectTimer = setTimeout(() => {
      this.socket?.connect();
    }, delay);
  }

  private setState(state: ConnectionState): void {
    if (this._state === state) return;
    this._state = state;
    for (const handler of this.connectionChangeHandlers) {
      try {
        handler(state);
      } catch (err) {
        console.error('[NetworkManager] connectionChange 핸들러 오류:', err);
      }
    }
  }
}

// ── 싱글턴 인스턴스 ───────────────────────────────────────────

export const networkManager = new NetworkManager();
export { NetworkManager };
