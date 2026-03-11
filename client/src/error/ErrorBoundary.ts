/**
 * ErrorBoundary.ts — 클라이언트 에러 경계 + 복구 시스템 (P5-17)
 *
 * 기능:
 * - Phaser 씬 에러 캐치 + 복구 화면
 * - 네트워크 끊김 감지 + 재연결 UI
 * - 에러 리포팅 (서버 POST /api/errors)
 */

// ── 타입 정의 ──────────────────────────────────────────────

/** 에러 리포트 */
interface ErrorReport {
  errorType: 'runtime' | 'network' | 'scene' | 'unknown';
  message: string;
  stack?: string;
  scene?: string;
  userAgent?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

/** 네트워크 상태 */
enum NetworkState {
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  RECONNECTING = 'RECONNECTING',
}

/** 재연결 설정 */
interface ReconnectConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

// ── 상수 ────────────────────────────────────────────────────

const API_BASE = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_URL ?? 'http://localhost:3000';
const ERROR_REPORT_URL = `${API_BASE}/api/errors`;

const DEFAULT_RECONNECT: ReconnectConfig = {
  maxAttempts: 10,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
};

// ── ErrorBoundary 클래스 ────────────────────────────────────

export class ErrorBoundary {
  private game: Phaser.Game | null = null;
  private networkState: NetworkState = NetworkState.CONNECTED;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private errorQueue: ErrorReport[] = [];
  private isFlushingErrors = false;
  private _listeners: Array<(state: NetworkState) => void> = [];

  /**
   * ErrorBoundary 초기화
   * @param game Phaser.Game 인스턴스
   */
  initialize(game: Phaser.Game): void {
    this.game = game;
    this._setupGlobalHandlers();
    this._setupNetworkMonitor();
    console.info('[ErrorBoundary] 초기화 완료');
  }

  /**
   * 네트워크 상태 변경 리스너 등록
   */
  onNetworkChange(listener: (state: NetworkState) => void): () => void {
    this._listeners.push(listener);
    return () => {
      this._listeners = this._listeners.filter(l => l !== listener);
    };
  }

  /**
   * 현재 네트워크 상태
   */
  getNetworkState(): NetworkState {
    return this.networkState;
  }

  /**
   * 수동 에러 리포트
   */
  reportError(type: ErrorReport['errorType'], message: string, metadata?: Record<string, unknown>): void {
    const report: ErrorReport = {
      errorType: type,
      message,
      timestamp: new Date().toISOString(),
      userAgent: navigator?.userAgent,
      metadata,
    };
    this._queueError(report);
  }

  /**
   * 정리 (게임 종료 시)
   */
  destroy(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    window.removeEventListener('online', this._handleOnline);
    window.removeEventListener('offline', this._handleOffline);
    window.removeEventListener('error', this._handleWindowError);
    window.removeEventListener('unhandledrejection', this._handleUnhandledRejection);

    this._listeners = [];
    this.game = null;
    console.info('[ErrorBoundary] 정리 완료');
  }

  // ── private: 글로벌 에러 핸들러 ──

  private _setupGlobalHandlers(): void {
    // window.onerror
    window.addEventListener('error', this._handleWindowError);

    // Promise unhandled rejection
    window.addEventListener('unhandledrejection', this._handleUnhandledRejection);
  }

  private _handleWindowError = (event: ErrorEvent): void => {
    const currentScene = this._getCurrentSceneKey();
    const report: ErrorReport = {
      errorType: 'runtime',
      message: event.message || 'Unknown runtime error',
      stack: event.error?.stack,
      scene: currentScene,
      userAgent: navigator?.userAgent,
      timestamp: new Date().toISOString(),
      metadata: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    };

    this._queueError(report);
    this._showRecoveryScreen(report.message, currentScene);
  };

  private _handleUnhandledRejection = (event: PromiseRejectionEvent): void => {
    const reason = event.reason;
    const message = reason instanceof Error ? reason.message : String(reason);
    const stack = reason instanceof Error ? reason.stack : undefined;

    const report: ErrorReport = {
      errorType: 'runtime',
      message: `Unhandled Promise: ${message}`,
      stack,
      scene: this._getCurrentSceneKey(),
      userAgent: navigator?.userAgent,
      timestamp: new Date().toISOString(),
    };

    this._queueError(report);
  };

  // ── private: 네트워크 모니터 ──

  private _setupNetworkMonitor(): void {
    window.addEventListener('online', this._handleOnline);
    window.addEventListener('offline', this._handleOffline);

    // 초기 상태 확인
    if (!navigator.onLine) {
      this._setNetworkState(NetworkState.DISCONNECTED);
    }
  }

  private _handleOnline = (): void => {
    console.info('[ErrorBoundary] 네트워크 복구 감지');
    this.reconnectAttempt = 0;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this._setNetworkState(NetworkState.CONNECTED);
    this._hideReconnectUI();
    this._flushErrorQueue(); // 보류 중이던 에러 전송
  };

  private _handleOffline = (): void => {
    console.warn('[ErrorBoundary] 네트워크 끊김 감지');
    this._setNetworkState(NetworkState.DISCONNECTED);
    this._showReconnectUI();
    this._startReconnectLoop();
  };

  private _setNetworkState(state: NetworkState): void {
    if (this.networkState === state) return;
    this.networkState = state;
    for (const listener of this._listeners) {
      try { listener(state); } catch { /* ignore */ }
    }
  }

  // ── private: 재연결 루프 ──

  private _startReconnectLoop(): void {
    if (this.reconnectTimer) return;

    const attempt = (): void => {
      this.reconnectAttempt++;
      this._setNetworkState(NetworkState.RECONNECTING);

      if (this.reconnectAttempt > DEFAULT_RECONNECT.maxAttempts) {
        console.error('[ErrorBoundary] 최대 재연결 시도 초과');
        this._setNetworkState(NetworkState.DISCONNECTED);
        return;
      }

      // 지수 백오프 + jitter
      const delay = Math.min(
        DEFAULT_RECONNECT.baseDelayMs * Math.pow(2, this.reconnectAttempt - 1),
        DEFAULT_RECONNECT.maxDelayMs,
      );
      const jitter = delay * (0.5 + Math.random() * 0.5);

      this._updateReconnectUI(this.reconnectAttempt, DEFAULT_RECONNECT.maxAttempts);

      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;

        // 핑 체크
        fetch(`${API_BASE}/api/health`, { method: 'GET', signal: AbortSignal.timeout(5000) })
          .then(res => {
            if (res.ok) {
              this._handleOnline();
            } else {
              attempt();
            }
          })
          .catch(() => {
            attempt();
          });
      }, jitter);
    };

    attempt();
  }

  // ── private: 에러 리포팅 (서버 전송) ──

  private _queueError(report: ErrorReport): void {
    this.errorQueue.push(report);

    // 큐 크기 제한 (메모리 보호)
    if (this.errorQueue.length > 50) {
      this.errorQueue = this.errorQueue.slice(-50);
    }

    this._flushErrorQueue();
  }

  private async _flushErrorQueue(): Promise<void> {
    if (this.isFlushingErrors || this.errorQueue.length === 0) return;
    if (this.networkState !== NetworkState.CONNECTED) return;

    this.isFlushingErrors = true;

    while (this.errorQueue.length > 0) {
      const report = this.errorQueue[0];
      try {
        await fetch(ERROR_REPORT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(report),
          signal: AbortSignal.timeout(5000),
        });
        this.errorQueue.shift(); // 전송 성공 시 제거
      } catch {
        // 전송 실패 시 다음 기회에 재시도
        break;
      }
    }

    this.isFlushingErrors = false;
  }

  // ── private: UI 표시 ──

  /** 현재 활성 씬 키 */
  private _getCurrentSceneKey(): string {
    if (!this.game) return 'unknown';
    const scenes = this.game.scene.getScenes(true);
    return scenes.length > 0 ? scenes[0].scene.key : 'unknown';
  }

  /** 복구 화면 표시 (씬 에러 시) */
  private _showRecoveryScreen(message: string, scene?: string): void {
    if (!this.game) return;

    // 기존 오버레이 제거
    this._removeOverlay('error-overlay');

    const overlay = document.createElement('div');
    overlay.id = 'error-overlay';
    overlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.85); display: flex; flex-direction: column;
      align-items: center; justify-content: center; z-index: 9999;
      font-family: monospace; color: #ff6b6b;
    `;

    overlay.innerHTML = `
      <div style="text-align:center; max-width:500px; padding:20px;">
        <h2 style="color:#ff6b6b; margin-bottom:16px;">⚠ 예기치 않은 오류</h2>
        <p style="color:#ccc; margin-bottom:8px;">씬: ${scene ?? 'unknown'}</p>
        <p style="color:#888; font-size:12px; margin-bottom:24px; word-break:break-all;">
          ${message.substring(0, 200)}
        </p>
        <button id="error-retry-btn" style="
          padding:12px 32px; background:#4a90d9; color:white; border:none;
          border-radius:4px; cursor:pointer; font-size:14px; margin-right:8px;
        ">타이틀로 돌아가기</button>
        <button id="error-reload-btn" style="
          padding:12px 32px; background:#666; color:white; border:none;
          border-radius:4px; cursor:pointer; font-size:14px;
        ">새로고침</button>
      </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('error-retry-btn')?.addEventListener('click', () => {
      this._removeOverlay('error-overlay');
      // 모든 씬 정지 후 메인 메뉴로
      this.game?.scene.getScenes(true).forEach(s => this.game?.scene.stop(s.scene.key));
      this.game?.scene.start('MainMenuScene');
    });

    document.getElementById('error-reload-btn')?.addEventListener('click', () => {
      window.location.reload();
    });
  }

  /** 재연결 UI 표시 */
  private _showReconnectUI(): void {
    this._removeOverlay('reconnect-overlay');

    const overlay = document.createElement('div');
    overlay.id = 'reconnect-overlay';
    overlay.style.cssText = `
      position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
      background: rgba(0,0,0,0.9); color: #ffd93d; padding: 16px 32px;
      border-radius: 8px; z-index: 9998; font-family: monospace; font-size: 14px;
      border: 1px solid #ffd93d;
    `;
    overlay.innerHTML = `
      <span id="reconnect-text">⚡ 서버 연결이 끊어졌습니다. 재연결 중...</span>
    `;

    document.body.appendChild(overlay);
  }

  /** 재연결 UI 업데이트 */
  private _updateReconnectUI(attempt: number, max: number): void {
    const el = document.getElementById('reconnect-text');
    if (el) {
      el.textContent = `⚡ 재연결 중... (${attempt}/${max})`;
    }
  }

  /** 재연결 UI 숨기기 */
  private _hideReconnectUI(): void {
    this._removeOverlay('reconnect-overlay');
  }

  /** DOM 오버레이 제거 */
  private _removeOverlay(id: string): void {
    const existing = document.getElementById(id);
    if (existing) existing.remove();
  }
}

// ── 싱글턴 인스턴스 ─────────────────────────────────────────

/** 전역 ErrorBoundary 인스턴스 */
export const errorBoundary = new ErrorBoundary();

export default errorBoundary;
