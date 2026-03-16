/**
 * 실시간 운영 알림 매니저 (P6-18)
 *
 * 알림 조건:
 * | 조건           | 임계값          | 채널              |
 * |----------------|-----------------|-------------------|
 * | 서버 에러율    | >5%/분          | Discord + Slack   |
 * | 응답 시간      | p95 >2초        | Discord           |
 * | 동시접속 급감  | -50%/10분       | Discord + Slack   |
 * | DB 연결 실패   | 1회             | Discord + Slack   |
 * | 결제 실패      | 3회/분          | Slack (긴급)      |
 * | 디스크 사용량  | >85%            | Discord           |
 *
 * 중복 알림 방지: 같은 조건 5분 내 재발송 안 함
 */

import { sendOpsAlert, WebhookPayload } from './webhookSender';

// ─── 타입 정의 ──────────────────────────────────────────────────

/** 알림 조건 키 */
export type AlertCondition =
  | 'error_rate'
  | 'high_latency'
  | 'ccu_drop'
  | 'db_connection_failure'
  | 'payment_failure'
  | 'disk_usage';

/** 알림 설정 */
export interface AlertConfig {
  enabled: boolean;
  thresholds: {
    errorRatePercent: number;       // 에러율 % (분당)
    p95LatencyMs: number;           // 응답 시간 p95 (ms)
    ccuDropPercent: number;         // 동시접속 급감 %
    dbFailureCount: number;         // DB 연결 실패 횟수
    paymentFailurePerMin: number;   // 결제 실패 횟수/분
    diskUsagePercent: number;       // 디스크 사용량 %
  };
  cooldownMs: number;               // 중복 방지 간격 (ms)
}

/** 알림 이력 항목 */
export interface AlertHistoryEntry {
  id: string;
  condition: AlertCondition;
  message: string;
  value: number;
  threshold: number;
  channels: { discord: boolean; slack: boolean };
  deliveryResult: { discord: boolean; slack: boolean };
  timestamp: Date;
}

// ─── 채널 매핑 ──────────────────────────────────────────────────
const CHANNEL_MAP: Record<AlertCondition, { discord: boolean; slack: boolean }> = {
  error_rate:            { discord: true,  slack: true },
  high_latency:          { discord: true,  slack: false },
  ccu_drop:              { discord: true,  slack: true },
  db_connection_failure: { discord: true,  slack: true },
  payment_failure:       { discord: false, slack: true },
  disk_usage:            { discord: true,  slack: false },
};

// ─── 메트릭 버퍼 ───────────────────────────────────────────────
interface MetricWindow {
  requestCount: number;
  errorCount: number;
  latencies: number[];
  paymentFailures: number;
  windowStart: number;
}

// ─── OpsAlertManager 클래스 ─────────────────────────────────────
class OpsAlertManager {
  private config: AlertConfig;
  private history: AlertHistoryEntry[] = [];
  private lastAlertTime: Map<AlertCondition, number> = new Map();
  private previousCcu = 0;
  private previousCcuTime = 0;
  private currentWindow: MetricWindow;
  private windowIntervalMs = 60_000; // 1분 윈도우
  private maxHistorySize = 1000;

  constructor() {
    this.config = {
      enabled: (process.env.OPS_ALERT_ENABLED ?? 'true') === 'true',
      thresholds: {
        errorRatePercent: Number(process.env.OPS_ERROR_RATE_THRESHOLD ?? '5'),
        p95LatencyMs: Number(process.env.OPS_P95_LATENCY_THRESHOLD ?? '2000'),
        ccuDropPercent: Number(process.env.OPS_CCU_DROP_THRESHOLD ?? '50'),
        dbFailureCount: 1,
        paymentFailurePerMin: 3,
        diskUsagePercent: Number(process.env.OPS_DISK_USAGE_THRESHOLD ?? '85'),
      },
      cooldownMs: 5 * 60 * 1000, // 5분
    };

    this.currentWindow = this.newWindow();
  }

  // ── 메트릭 윈도우 ─────────────────────────────────────────────
  private newWindow(): MetricWindow {
    return {
      requestCount: 0,
      errorCount: 0,
      latencies: [],
      paymentFailures: 0,
      windowStart: Date.now(),
    };
  }

  private rotateWindowIfNeeded(): void {
    if (Date.now() - this.currentWindow.windowStart >= this.windowIntervalMs) {
      this.evaluateWindow();
      this.currentWindow = this.newWindow();
    }
  }

  // ── 메트릭 기록 API ───────────────────────────────────────────

  /** HTTP 요청 완료 시 호출 */
  recordRequest(latencyMs: number, isError: boolean): void {
    this.rotateWindowIfNeeded();
    this.currentWindow.requestCount++;
    this.currentWindow.latencies.push(latencyMs);
    if (isError) this.currentWindow.errorCount++;
  }

  /** 결제 실패 시 호출 */
  recordPaymentFailure(): void {
    this.rotateWindowIfNeeded();
    this.currentWindow.paymentFailures++;
  }

  /** 동시접속자 수 업데이트 시 호출 */
  recordCcu(ccu: number): void {
    const now = Date.now();
    // 10분 간격으로 급감 체크
    if (this.previousCcuTime > 0 && now - this.previousCcuTime >= 10 * 60 * 1000) {
      if (this.previousCcu > 0) {
        const dropPercent = ((this.previousCcu - ccu) / this.previousCcu) * 100;
        if (dropPercent >= this.config.thresholds.ccuDropPercent) {
          void this.fireAlert('ccu_drop', dropPercent, this.config.thresholds.ccuDropPercent,
            `동시접속 급감: ${this.previousCcu} → ${ccu} (${dropPercent.toFixed(1)}% 감소)`);
        }
      }
      this.previousCcu = ccu;
      this.previousCcuTime = now;
    } else if (this.previousCcuTime === 0) {
      this.previousCcu = ccu;
      this.previousCcuTime = now;
    }
  }

  /** DB 연결 실패 시 호출 */
  recordDbFailure(error: string): void {
    void this.fireAlert('db_connection_failure', 1, this.config.thresholds.dbFailureCount,
      `DB 연결 실패: ${error}`);
  }

  /** 디스크 사용량 체크 (외부에서 주기적 호출) */
  recordDiskUsage(usagePercent: number): void {
    if (usagePercent >= this.config.thresholds.diskUsagePercent) {
      void this.fireAlert('disk_usage', usagePercent, this.config.thresholds.diskUsagePercent,
        `디스크 사용량: ${usagePercent.toFixed(1)}% (임계값: ${this.config.thresholds.diskUsagePercent}%)`);
    }
  }

  // ── 윈도우 평가 ───────────────────────────────────────────────
  private evaluateWindow(): void {
    const w = this.currentWindow;
    if (w.requestCount === 0) return;

    // 에러율 체크
    const errorRate = (w.errorCount / w.requestCount) * 100;
    if (errorRate > this.config.thresholds.errorRatePercent) {
      void this.fireAlert('error_rate', errorRate, this.config.thresholds.errorRatePercent,
        `서버 에러율: ${errorRate.toFixed(1)}%/분 (${w.errorCount}/${w.requestCount})`);
    }

    // p95 응답시간 체크
    if (w.latencies.length > 0) {
      const sorted = [...w.latencies].sort((a, b) => a - b);
      const p95Index = Math.floor(sorted.length * 0.95);
      const p95 = sorted[p95Index] ?? 0;
      if (p95 > this.config.thresholds.p95LatencyMs) {
        void this.fireAlert('high_latency', p95, this.config.thresholds.p95LatencyMs,
          `응답 시간 p95: ${p95.toFixed(0)}ms (임계값: ${this.config.thresholds.p95LatencyMs}ms)`);
      }
    }

    // 결제 실패 체크
    if (w.paymentFailures >= this.config.thresholds.paymentFailurePerMin) {
      void this.fireAlert('payment_failure', w.paymentFailures, this.config.thresholds.paymentFailurePerMin,
        `결제 실패: ${w.paymentFailures}건/분`);
    }
  }

  // ── 알림 발송 ─────────────────────────────────────────────────
  private async fireAlert(
    condition: AlertCondition,
    value: number,
    threshold: number,
    message: string
  ): Promise<void> {
    if (!this.config.enabled) return;

    // 중복 방지: 쿨다운 체크
    const lastTime = this.lastAlertTime.get(condition) ?? 0;
    if (Date.now() - lastTime < this.config.cooldownMs) return;

    this.lastAlertTime.set(condition, Date.now());

    const channels = CHANNEL_MAP[condition];
    const colorMap: Record<AlertCondition, WebhookPayload['color']> = {
      error_rate: 'critical',
      high_latency: 'warning',
      ccu_drop: 'critical',
      db_connection_failure: 'critical',
      payment_failure: 'critical',
      disk_usage: 'warning',
    };

    const payload: WebhookPayload = {
      title: `[${condition.toUpperCase()}] 운영 알림`,
      description: message,
      color: colorMap[condition],
      fields: [
        { name: '현재 값', value: `${value.toFixed(1)}`, inline: true },
        { name: '임계값', value: `${threshold}`, inline: true },
        { name: '환경', value: process.env.NODE_ENV ?? 'unknown', inline: true },
      ],
      timestamp: new Date().toISOString(),
    };

    const deliveryResult = await sendOpsAlert(payload, channels);

    // 이력 기록
    const entry: AlertHistoryEntry = {
      id: `${condition}-${Date.now()}`,
      condition,
      message,
      value,
      threshold,
      channels,
      deliveryResult,
      timestamp: new Date(),
    };
    this.history.push(entry);

    // 이력 크기 제한
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(-this.maxHistorySize);
    }

    console.log(`[OpsAlert] ${condition}: ${message} → Discord:${deliveryResult.discord} Slack:${deliveryResult.slack}`);
  }

  // ── 설정/이력 API ─────────────────────────────────────────────

  /** 알림 이력 조회 */
  getHistory(limit = 50, offset = 0): AlertHistoryEntry[] {
    const sorted = [...this.history].reverse();
    return sorted.slice(offset, offset + limit);
  }

  /** 설정 조회 */
  getConfig(): AlertConfig {
    return { ...this.config };
  }

  /** 설정 업데이트 (partial) */
  updateConfig(partial: Partial<AlertConfig>): AlertConfig {
    if (partial.enabled !== undefined) this.config.enabled = partial.enabled;
    if (partial.cooldownMs !== undefined) this.config.cooldownMs = partial.cooldownMs;
    if (partial.thresholds) {
      this.config.thresholds = { ...this.config.thresholds, ...partial.thresholds };
    }
    return this.getConfig();
  }

  /** 테스트 알림 발송 */
  async sendTestAlert(): Promise<{ discord: boolean; slack: boolean }> {
    const payload: WebhookPayload = {
      title: '[TEST] 운영 알림 테스트',
      description: '테스트 알림입니다. 실제 장애가 아닙니다.',
      color: 'info',
      fields: [
        { name: '환경', value: process.env.NODE_ENV ?? 'unknown', inline: true },
        { name: '시각', value: new Date().toISOString(), inline: true },
      ],
    };
    return sendOpsAlert(payload, { discord: true, slack: true });
  }
}

// 싱글턴 인스턴스
export const opsAlertManager = new OpsAlertManager();
