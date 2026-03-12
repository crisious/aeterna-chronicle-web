/**
 * NetworkService — 소켓/REST 호출 래핑 (P10-08)
 *
 * GameScene에서 분리된 네트워크 통신 전담 서비스.
 * socket.io 연결 관리 + Protobuf 코덱 인코딩/디코딩을 캡슐화한다.
 * GameScene은 이 서비스의 고수준 API만 호출한다.
 */

import { io, Socket } from 'socket.io-client';
import {
  loadProto,
  encodePlayerMove,
  decodePlayerMove,
  encodeJoinRoom,
  decodePlayerJoined,
  decodePlayerAction,
} from '../../../shared/codec/gameCodec';

// ── 타입 정의 ─────────────────────────────────────────────────

export interface PlayerMovePayload {
  characterId: string;
  x: number;
  y: number;
  state: string;
}

export interface PlayerJoinedPayload {
  roomId: string;
  characterId: string;
}

export type NetworkEventHandler = (data: unknown) => void;

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

// ── NetworkService ────────────────────────────────────────────

export class NetworkService {
  private socket: Socket | null = null;
  private connectionState: ConnectionState = 'disconnected';
  private lastMoveEmitTime = 0;
  private readonly moveThrottleMs = 200;
  private listeners: Map<string, NetworkEventHandler[]> = new Map();

  /** 현재 연결 상태 */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /** 소켓 ID (연결 시) */
  getSocketId(): string | undefined {
    return this.socket?.id;
  }

  /** 연결 여부 */
  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * 서버 연결 초기화
   * @param serverUrl 서버 URL (기본: VITE_SERVER_URL 또는 localhost:3000)
   */
  async connect(serverUrl?: string): Promise<void> {
    const url = serverUrl
      ?? (import.meta as any).env?.VITE_SERVER_URL
      ?? 'http://localhost:3000';

    this.connectionState = 'connecting';

    try {
      this.socket = io(url, { reconnectionAttempts: 3 });

      this.socket.on('connect', () => {
        this.connectionState = 'connected';
        console.log(`[NetworkService] 서버 접속 성공: ${this.socket?.id}`);

        // Protobuf 코덱 초기화 후 자동 joinRoom
        loadProto().then(() => {
          console.log('[NetworkService] Protobuf 코덱 초기화 완료');
          const joinBuf = encodeJoinRoom({
            roomId: 'tutorial_map',
            characterId: this.socket?.id ?? '',
          });
          this.socket?.emit('joinRoom', joinBuf);
        });
      });

      // 바이너리/JSON 수신 핸들러 등록
      this.registerProtobufHandler('playerMoved', decodePlayerMove);
      this.registerProtobufHandler('playerJoined', decodePlayerJoined);
      this.registerProtobufHandler('playerActionCasted', decodePlayerAction);

      this.socket.on('connect_error', () => {
        this.connectionState = 'error';
        console.warn('[NetworkService] 서버 오프라인. 싱글 모드 유지.');
      });

      this.socket.on('disconnect', () => {
        this.connectionState = 'disconnected';
      });
    } catch (error) {
      this.connectionState = 'error';
      console.error('[NetworkService] 연결 실패:', error);
    }
  }

  /**
   * 플레이어 이동 데이터를 쓰로틀링하여 전송
   */
  emitPlayerMove(payload: PlayerMovePayload): void {
    if (!this.socket?.connected) return;

    const now = Date.now();
    if (now - this.lastMoveEmitTime < this.moveThrottleMs) return;
    this.lastMoveEmitTime = now;

    const moveBuf = encodePlayerMove(payload);
    this.socket.emit('playerMove', moveBuf);
  }

  /**
   * 범용 소켓 이벤트 전송
   */
  emit(event: string, data: unknown): void {
    if (!this.socket?.connected) return;
    this.socket.emit(event, data);
  }

  /**
   * 외부에서 소켓 이벤트 리스너 등록
   */
  on(event: string, handler: NetworkEventHandler): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(handler);
    this.socket?.on(event, handler);
  }

  /**
   * 소켓 이벤트 리스너 제거
   */
  off(event: string, handler: NetworkEventHandler): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      const idx = handlers.indexOf(handler);
      if (idx >= 0) handlers.splice(idx, 1);
    }
    this.socket?.off(event, handler);
  }

  /**
   * 연결 종료
   */
  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.connectionState = 'disconnected';
    this.listeners.clear();
  }

  // ── 내부 ────────────────────────────────────────────────────

  /**
   * Protobuf 바이너리 / JSON fallback 자동 디코딩 핸들러 등록
   */
  private registerProtobufHandler(
    event: string,
    decoder: (buf: Uint8Array) => unknown,
  ): void {
    this.socket?.on(event, (data: unknown) => {
      let decoded: unknown;
      if (data instanceof ArrayBuffer || data instanceof Uint8Array) {
        decoded = decoder(
          data instanceof ArrayBuffer ? new Uint8Array(data) : data,
        );
      } else {
        decoded = data; // JSON fallback
      }
      console.log(`[NetworkService] ${event}:`, decoded);

      // 등록된 외부 리스너에 전달
      const handlers = this.listeners.get(event);
      if (handlers) {
        for (const h of handlers) h(decoded);
      }
    });
  }
}
