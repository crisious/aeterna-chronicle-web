/**
 * opsScheduler — 서버 운영 로직 분리 (P10-13)
 *
 * APM 초기화, ops alert, 이벤트 sync, sanction expiry, mail purge 등
 * 운영 스케줄링 로직을 도메인 조립과 물리적으로 분리한다.
 *
 * server.ts에서 이 모듈의 start/stop만 호출하면 된다.
 * (현재 server.ts 수정 금지이므로, 향후 통합 시 사용할 준비 모듈)
 */

import { FastifyInstance } from 'fastify';
import { Server as SocketIOServer } from 'socket.io';
import { initApm, shutdownApm } from '../apm';
import { opsAlertManager } from './opsAlertManager';
import { syncEventStatus } from '../event/eventEngine';
import { expireOverdueSanctions } from '../report/reportManager';
import { purgeExpiredMails } from '../social/mailSystem';

// ── 타입 정의 ─────────────────────────────────────────────────

export interface OpsSchedulerConfig {
  /** 이벤트 상태 동기화 간격 (ms), 기본 5분 */
  eventSyncIntervalMs: number;
  /** 만료 제재 해제 간격 (ms), 기본 5분 */
  sanctionExpireIntervalMs: number;
  /** 만료 우편 정리 간격 (ms), 기본 1시간 */
  mailPurgeIntervalMs: number;
}

const DEFAULT_CONFIG: OpsSchedulerConfig = {
  eventSyncIntervalMs: 5 * 60 * 1000,
  sanctionExpireIntervalMs: 5 * 60 * 1000,
  mailPurgeIntervalMs: 60 * 60 * 1000,
};

// ── OpsScheduler 클래스 ───────────────────────────────────────

class OpsScheduler {
  private timers: Map<string, ReturnType<typeof setInterval>> = new Map();
  private config: OpsSchedulerConfig;
  private logger: { info: (msg: string) => void; error: (msg: string) => void; warn: (msg: string) => void };
  private running = false;

  constructor(config?: Partial<OpsSchedulerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logger = {
      info: (msg: string) => console.log(`[OpsScheduler] ${msg}`),
      error: (msg: string) => console.error(`[OpsScheduler] ${msg}`),
      warn: (msg: string) => console.warn(`[OpsScheduler] ${msg}`),
    };
  }

  /**
   * APM 초기화 + 운영 타이머 전부 시작
   */
  async start(fastify: FastifyInstance, io: SocketIOServer): Promise<void> {
    if (this.running) {
      this.logger.warn('이미 실행 중');
      return;
    }

    // APM 초기화
    await initApm(fastify, io);
    this.logger.info('APM 초기화 완료');

    // ops alert 메트릭 수집 훅
    fastify.addHook('onResponse', (req, reply, done) => {
      const latency = reply.elapsedTime ?? 0;
      const isError = reply.statusCode >= 500;
      opsAlertManager.recordRequest(latency, isError);
      done();
    });
    this.logger.info('OpsAlert 메트릭 훅 등록');

    // 이벤트 상태 동기화 타이머
    this.startTimer('eventSync', this.config.eventSyncIntervalMs, async () => {
      try {
        const result = await syncEventStatus();
        if (result.activated > 0 || result.deactivated > 0) {
          this.logger.info(`이벤트 활성화 ${result.activated}건, 비활성화 ${result.deactivated}건`);
        }
      } catch (err) {
        this.logger.error(`이벤트 동기화 실패: ${err}`);
      }
    });

    // 만료 제재 자동 해제 타이머
    this.startTimer('sanctionExpire', this.config.sanctionExpireIntervalMs, async () => {
      try {
        const count = await expireOverdueSanctions();
        if (count > 0) this.logger.info(`만료 제재 ${count}건 해제`);
      } catch (err) {
        this.logger.error(`만료 제재 해제 실패: ${err}`);
      }
    });

    // 만료 우편 정리 타이머
    this.startTimer('mailPurge', this.config.mailPurgeIntervalMs, async () => {
      try {
        const count = await purgeExpiredMails();
        if (count > 0) this.logger.info(`만료 우편 ${count}건 삭제`);
      } catch (err) {
        this.logger.error(`만료 우편 정리 실패: ${err}`);
      }
    });

    this.running = true;
    this.logger.info(`타이머 ${this.timers.size}개 가동 완료`);
  }

  /**
   * 전체 정지 — graceful shutdown 시 호출
   */
  async stop(): Promise<void> {
    if (!this.running) return;

    for (const [name, timer] of this.timers) {
      clearInterval(timer);
      this.logger.info(`타이머 '${name}' 정지`);
    }
    this.timers.clear();

    await shutdownApm();
    this.logger.info('APM 종료 완료');

    this.running = false;
    this.logger.info('전체 정지 완료');
  }

  /**
   * 실행 상태 조회
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * 등록된 타이머 목록
   */
  getTimerNames(): string[] {
    return Array.from(this.timers.keys());
  }

  // ── 내부 ────────────────────────────────────────────────────

  private startTimer(name: string, intervalMs: number, fn: () => Promise<void>): void {
    const timer = setInterval(() => void fn(), intervalMs);
    this.timers.set(name, timer);
    this.logger.info(`타이머 '${name}' 시작 (${intervalMs / 1000}초 간격)`);
  }
}

// ── 싱글턴 인스턴스 ───────────────────────────────────────────

export const opsScheduler = new OpsScheduler();
export { OpsScheduler };
