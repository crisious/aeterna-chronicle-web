/**
 * P28-14: 에러 핸들링 강화
 *
 * - 글로벌 에러 바운더리
 * - 크래시 리포팅
 * - 오프라인 감지
 * - 에러 복구 전략
 */

// ─── 에러 심각도 ──────────────────────────────────────────────────

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface CrashReport {
  id: string;
  timestamp: string;
  severity: ErrorSeverity;
  message: string;
  stack?: string;
  context: {
    scene?: string;
    action?: string;
    characterId?: string;
    browserInfo: string;
  };
  recovered: boolean;
}

// ─── ErrorBoundaryManager ─────────────────────────────────────

export class ErrorBoundaryManager {
  private reports: CrashReport[] = [];
  private maxReports = 50;
  private onlineListeners: Array<(online: boolean) => void> = [];
  private isOnline = true;
  private reportEndpoint: string;

  constructor(reportEndpoint = '/api/error/report') {
    this.reportEndpoint = reportEndpoint;
    this.setupGlobalHandlers();
    this.setupOfflineDetection();
  }

  /**
   * 글로벌 에러 핸들러 설정
   */
  private setupGlobalHandlers(): void {
    // 미처리 에러
    window.addEventListener('error', (event) => {
      this.handleError({
        severity: 'error',
        message: event.message,
        stack: event.error?.stack,
        action: 'unhandled_error',
      });
    });

    // 미처리 Promise rejection
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError({
        severity: 'error',
        message: `Unhandled Promise Rejection: ${event.reason}`,
        stack: event.reason?.stack,
        action: 'unhandled_rejection',
      });
    });

    // 리소스 로드 실패
    window.addEventListener('error', (event) => {
      if (event.target && (event.target as HTMLElement).tagName) {
        const el = event.target as HTMLElement;
        this.handleError({
          severity: 'warning',
          message: `리소스 로드 실패: ${el.tagName} ${(el as HTMLImageElement).src || ''}`,
          action: 'resource_load_error',
        });
      }
    }, true);
  }

  /**
   * 오프라인 감지
   */
  private setupOfflineDetection(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.onlineListeners.forEach(fn => fn(true));
      console.info('[ErrorBoundary] 온라인 복귀');
      this.flushPendingReports();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.onlineListeners.forEach(fn => fn(false));
      console.warn('[ErrorBoundary] 오프라인 감지');
    });
  }

  /**
   * 에러 처리 + 크래시 리포트 생성
   */
  handleError(params: {
    severity: ErrorSeverity;
    message: string;
    stack?: string;
    scene?: string;
    action?: string;
    characterId?: string;
  }): CrashReport {
    const report: CrashReport = {
      id: `err_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      timestamp: new Date().toISOString(),
      severity: params.severity,
      message: params.message,
      stack: params.stack,
      context: {
        scene: params.scene,
        action: params.action,
        characterId: params.characterId,
        browserInfo: `${navigator.userAgent} | ${window.innerWidth}x${window.innerHeight}`,
      },
      recovered: false,
    };

    this.reports.push(report);
    if (this.reports.length > this.maxReports) {
      this.reports.shift();
    }

    // 로컬 저장
    this.saveReportsToStorage();

    // 서버 전송 (online일 때)
    if (this.isOnline && params.severity !== 'info') {
      this.sendReport(report).catch(() => { /* 전송 실패 시 무시 — 로컬에 보관 */ });
    }

    // 크리티컬 에러 시 복구 시도
    if (params.severity === 'critical') {
      this.attemptRecovery(report);
    }

    return report;
  }

  /**
   * 복구 시도 (크리티컬 에러)
   */
  private attemptRecovery(report: CrashReport): void {
    console.warn(`[ErrorBoundary] 크리티컬 에러 복구 시도: ${report.message}`);

    // 전략 1: 현재 씬 재시작
    try {
      const game = (window as any).__PHASER_GAME__;
      if (game && report.context.scene) {
        game.scene.start(report.context.scene);
        report.recovered = true;
        console.info('[ErrorBoundary] 씬 재시작으로 복구 성공');
        return;
      }
    } catch { /* */ }

    // 전략 2: 메인 메뉴로 복귀
    try {
      const game = (window as any).__PHASER_GAME__;
      if (game) {
        game.scene.start('MainMenuScene');
        report.recovered = true;
        console.info('[ErrorBoundary] 메인 메뉴로 복구');
        return;
      }
    } catch { /* */ }

    // 전략 3: 페이지 새로고침
    console.error('[ErrorBoundary] 복구 불가 — 페이지 새로고침');
    // 데이터 저장 후 리로드
    this.saveReportsToStorage();
    // window.location.reload(); // 자동 리로드는 위험 — 사용자에게 안내
  }

  /**
   * 리포트 서버 전송
   */
  private async sendReport(report: CrashReport): Promise<void> {
    try {
      await fetch(this.reportEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
      });
    } catch {
      // 전송 실패 — 로컬 보관
    }
  }

  /**
   * 대기 중인 리포트 일괄 전송 (온라인 복귀 시)
   */
  private async flushPendingReports(): Promise<void> {
    const pending = this.reports.filter(r => r.severity !== 'info');
    for (const report of pending) {
      await this.sendReport(report).catch(() => {});
    }
  }

  /**
   * 로컬 스토리지 저장
   */
  private saveReportsToStorage(): void {
    try {
      // 최근 20건만 저장
      const recent = this.reports.slice(-20);
      localStorage.setItem('aeterna_crash_reports', JSON.stringify(recent));
    } catch { /* storage full */ }
  }

  /**
   * 오프라인 상태 리스너 등록
   */
  onOnlineStatusChange(listener: (online: boolean) => void): () => void {
    this.onlineListeners.push(listener);
    return () => {
      this.onlineListeners = this.onlineListeners.filter(l => l !== listener);
    };
  }

  /**
   * 현재 오프라인 여부
   */
  get offline(): boolean {
    return !this.isOnline;
  }

  /**
   * 최근 리포트 조회
   */
  getReports(limit = 10): CrashReport[] {
    return this.reports.slice(-limit);
  }
}

/** 싱글톤 인스턴스 */
export const errorBoundary = new ErrorBoundaryManager();
