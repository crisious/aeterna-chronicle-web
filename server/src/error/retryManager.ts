/**
 * retryManager.ts — 외부 API/DB 호출 재시도 + 서킷 브레이커 (P5-17)
 *
 * 기능:
 * - 지수 백오프 재시도 (최대 3회, 기본 1초 → 2초 → 4초)
 * - 서킷 브레이커: 연속 실패 5회 → 30초 OPEN → HALF_OPEN 재시도
 * - 호출 대상별 독립 서킷 관리
 */

// ── 타입 정의 ──────────────────────────────────────────────

/** 서킷 브레이커 상태 */
enum CircuitState {
  CLOSED = 'CLOSED',       // 정상 — 요청 통과
  OPEN = 'OPEN',           // 차단 — 요청 즉시 거부
  HALF_OPEN = 'HALF_OPEN', // 시험 — 1회 요청 허용 후 판단
}

/** 서킷 브레이커 내부 상태 */
interface CircuitInfo {
  state: CircuitState;
  failureCount: number;
  lastFailureTime: number;
  successCount: number;
}

/** 재시도 옵션 */
export interface RetryOptions {
  /** 최대 재시도 횟수 (기본: 3) */
  maxRetries?: number;
  /** 초기 대기 시간 ms (기본: 1000) */
  baseDelayMs?: number;
  /** 백오프 승수 (기본: 2) */
  multiplier?: number;
  /** 최대 대기 시간 ms (기본: 30000) */
  maxDelayMs?: number;
  /** 재시도 가능 에러 판별 함수 */
  isRetryable?: (error: Error) => boolean;
  /** 서킷 브레이커 사용 여부 (기본: true) */
  useCircuitBreaker?: boolean;
  /** 서킷 브레이커 키 (대상 식별용) */
  circuitKey?: string;
}

/** 서킷 브레이커 설정 */
export interface CircuitBreakerConfig {
  /** 차단 임계 실패 횟수 (기본: 5) */
  failureThreshold?: number;
  /** OPEN 유지 시간 ms (기본: 30000) */
  openDurationMs?: number;
  /** HALF_OPEN 성공 임계값 (기본: 1) */
  halfOpenSuccessThreshold?: number;
}

// ── 기본값 ──────────────────────────────────────────────────

const DEFAULT_RETRY: Required<Pick<RetryOptions, 'maxRetries' | 'baseDelayMs' | 'multiplier' | 'maxDelayMs'>> = {
  maxRetries: 3,
  baseDelayMs: 1000,
  multiplier: 2,
  maxDelayMs: 30000,
};

const DEFAULT_CIRCUIT: Required<CircuitBreakerConfig> = {
  failureThreshold: 5,
  openDurationMs: 30000,
  halfOpenSuccessThreshold: 1,
};

// ── 서킷 브레이커 에러 ──────────────────────────────────────

export class CircuitOpenError extends Error {
  constructor(key: string) {
    super(`서킷 브레이커 OPEN — 대상: ${key}. ${DEFAULT_CIRCUIT.openDurationMs / 1000}초 후 재시도 가능.`);
    this.name = 'CircuitOpenError';
  }
}

// ── RetryManager 클래스 ─────────────────────────────────────

class RetryManager {
  private circuits: Map<string, CircuitInfo> = new Map();
  private circuitConfig: Required<CircuitBreakerConfig>;

  constructor(circuitConfig?: CircuitBreakerConfig) {
    this.circuitConfig = { ...DEFAULT_CIRCUIT, ...circuitConfig };
  }

  /**
   * 재시도 가능한 비동기 함수 실행
   *
   * @param fn 실행할 비동기 함수
   * @param options 재시도 옵션
   * @returns 함수 반환값
   *
   * @example
   * ```ts
   * const data = await retryManager.execute(
   *   () => fetchExternalAPI('/data'),
   *   { circuitKey: 'external-api', maxRetries: 3 }
   * );
   * ```
   */
  async execute<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
    const {
      maxRetries = DEFAULT_RETRY.maxRetries,
      baseDelayMs = DEFAULT_RETRY.baseDelayMs,
      multiplier = DEFAULT_RETRY.multiplier,
      maxDelayMs = DEFAULT_RETRY.maxDelayMs,
      isRetryable = this.defaultIsRetryable,
      useCircuitBreaker = true,
      circuitKey = 'default',
    } = options;

    // 서킷 브레이커 체크
    if (useCircuitBreaker) {
      this.checkCircuit(circuitKey);
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await fn();

        // 성공 시 서킷 브레이커 리셋
        if (useCircuitBreaker) {
          this.onSuccess(circuitKey);
        }

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // 서킷 브레이커 실패 기록
        if (useCircuitBreaker) {
          this.onFailure(circuitKey);
        }

        // 마지막 시도이거나 재시도 불가능한 에러
        if (attempt >= maxRetries || !isRetryable(lastError)) {
          break;
        }

        // 지수 백오프 대기
        const delay = Math.min(baseDelayMs * Math.pow(multiplier, attempt), maxDelayMs);
        const jitter = delay * (0.5 + Math.random() * 0.5); // 50~100% jitter

        console.warn(
          `[RetryManager] 재시도 ${attempt + 1}/${maxRetries} — ` +
          `대기 ${Math.round(jitter)}ms — 에러: ${lastError.message}` +
          (circuitKey !== 'default' ? ` — 대상: ${circuitKey}` : ''),
        );

        await this.sleep(jitter);

        // 재시도 전 서킷 재확인
        if (useCircuitBreaker) {
          this.checkCircuit(circuitKey);
        }
      }
    }

    throw lastError!;
  }

  /**
   * 서킷 브레이커 상태 조회
   */
  getCircuitState(key: string): CircuitState {
    const circuit = this.circuits.get(key);
    if (!circuit) return CircuitState.CLOSED;

    // OPEN 상태에서 시간 경과 시 HALF_OPEN 전환
    if (
      circuit.state === CircuitState.OPEN &&
      Date.now() - circuit.lastFailureTime >= this.circuitConfig.openDurationMs
    ) {
      circuit.state = CircuitState.HALF_OPEN;
      circuit.successCount = 0;
    }

    return circuit.state;
  }

  /**
   * 특정 서킷 수동 리셋
   */
  resetCircuit(key: string): void {
    this.circuits.delete(key);
    console.info(`[RetryManager] 서킷 리셋: ${key}`);
  }

  /**
   * 전체 서킷 리셋
   */
  resetAll(): void {
    this.circuits.clear();
    console.info('[RetryManager] 전체 서킷 리셋');
  }

  /**
   * 서킷 상태 요약 (디버그/모니터링용)
   */
  getCircuitSummary(): Record<string, { state: CircuitState; failureCount: number }> {
    const summary: Record<string, { state: CircuitState; failureCount: number }> = {};
    this.circuits.forEach((info, key) => {
      summary[key] = { state: this.getCircuitState(key), failureCount: info.failureCount };
    });
    return summary;
  }

  // ── private ──

  /** 서킷 체크 — OPEN이면 즉시 에러 */
  private checkCircuit(key: string): void {
    const state = this.getCircuitState(key);
    if (state === CircuitState.OPEN) {
      throw new CircuitOpenError(key);
    }
  }

  /** 성공 시 서킷 상태 업데이트 */
  private onSuccess(key: string): void {
    const circuit = this.circuits.get(key);
    if (!circuit) return;

    if (circuit.state === CircuitState.HALF_OPEN) {
      circuit.successCount++;
      if (circuit.successCount >= this.circuitConfig.halfOpenSuccessThreshold) {
        // HALF_OPEN → CLOSED
        circuit.state = CircuitState.CLOSED;
        circuit.failureCount = 0;
        circuit.successCount = 0;
        console.info(`[RetryManager] 서킷 CLOSED: ${key}`);
      }
    } else {
      // CLOSED 상태에서 성공 시 실패 카운트 리셋
      circuit.failureCount = 0;
    }
  }

  /** 실패 시 서킷 상태 업데이트 */
  private onFailure(key: string): void {
    let circuit = this.circuits.get(key);
    if (!circuit) {
      circuit = {
        state: CircuitState.CLOSED,
        failureCount: 0,
        lastFailureTime: 0,
        successCount: 0,
      };
      this.circuits.set(key, circuit);
    }

    circuit.failureCount++;
    circuit.lastFailureTime = Date.now();

    // HALF_OPEN에서 실패 → 다시 OPEN
    if (circuit.state === CircuitState.HALF_OPEN) {
      circuit.state = CircuitState.OPEN;
      console.warn(`[RetryManager] 서킷 재OPEN: ${key} (HALF_OPEN 중 실패)`);
      return;
    }

    // 실패 임계치 도달 → OPEN
    if (circuit.failureCount >= this.circuitConfig.failureThreshold) {
      circuit.state = CircuitState.OPEN;
      console.warn(
        `[RetryManager] 서킷 OPEN: ${key} — ` +
        `연속 실패 ${circuit.failureCount}회, ` +
        `${this.circuitConfig.openDurationMs / 1000}초 차단`,
      );
    }
  }

  /** 기본 재시도 가능 판별 (네트워크/타임아웃/5xx) */
  private defaultIsRetryable(error: Error): boolean {
    const message = error.message.toLowerCase();
    const retryablePatterns = [
      'econnrefused', 'econnreset', 'epipe', 'etimedout',
      'socket hang up', 'network', 'timeout',
      'too many connections', '503', '502', '500',
      'deadlock', 'lock timeout',
    ];
    return retryablePatterns.some(p => message.includes(p));
  }

  /** Promise 기반 sleep */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ── 싱글턴 인스턴스 ─────────────────────────────────────────

/** 전역 RetryManager 인스턴스 */
export const retryManager = new RetryManager();

export default retryManager;
