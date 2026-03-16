/**
 * 구조화 로그 시스템 — P4-18 로그/모니터링
 * 
 * JSON 구조화 로그 출력:
 *   { timestamp, level, service, traceId, message, metadata }
 * 
 * 레벨: debug < info < warn < error < fatal
 * 이중 출력: stdout + 파일
 * 요청별 traceId 자동 부여
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { pushToLoki } from './lokiTransport';

// ── 로그 레벨 ────────────────────────────────────────────────

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

// ── 로그 엔트리 타입 ─────────────────────────────────────────

export interface LogEntry {
  timestamp: string;        // ISO 8601
  level: LogLevel;
  service: string;
  traceId: string;
  message: string;
  metadata?: Record<string, unknown>;
}

// ── 설정 ─────────────────────────────────────────────────────

export interface LoggerConfig {
  /** 서비스 이름 */
  service: string;
  /** 최소 출력 레벨 */
  minLevel: LogLevel;
  /** 파일 출력 경로 (null이면 파일 출력 안 함) */
  logDir: string | null;
  /** stdout 출력 여부 */
  stdout: boolean;
  /** JSON 포맷팅 (pretty: 들여쓰기, compact: 한 줄) */
  format: 'pretty' | 'compact';
}

const DEFAULT_CONFIG: LoggerConfig = {
  service: 'aeterna-server',
  minLevel: (process.env.LOG_LEVEL as LogLevel) || 'info',
  logDir: process.env.LOG_DIR || null,
  stdout: true,
  format: process.env.NODE_ENV === 'production' ? 'compact' : 'pretty',
};

// ── traceId 컨텍스트 (AsyncLocalStorage 대체: 글로벌 맵) ────

const traceContext = new Map<string, string>();
let currentTraceId = 'system';

/** traceId 생성 */
export function generateTraceId(): string {
  return crypto.randomBytes(8).toString('hex');
}

/** 현재 traceId 설정 */
export function setTraceId(traceId: string): void {
  currentTraceId = traceId;
}

/** 현재 traceId 조회 */
export function getTraceId(): string {
  return currentTraceId;
}

/** 요청 ID ↔ traceId 매핑 저장 */
export function mapRequestTrace(requestId: string, traceId: string): void {
  traceContext.set(requestId, traceId);
  // 오래된 매핑 정리 (10000개 초과 시)
  if (traceContext.size > 10000) {
    const keys = Array.from(traceContext.keys());
    for (let i = 0; i < 5000; i++) {
      traceContext.delete(keys[i]);
    }
  }
}

/** 요청 ID로 traceId 조회 */
export function getTraceForRequest(requestId: string): string | undefined {
  return traceContext.get(requestId);
}

// ── 파일 출력 ────────────────────────────────────────────────

let logStream: fs.WriteStream | null = null;

function ensureLogStream(config: LoggerConfig): fs.WriteStream | null {
  if (!config.logDir) return null;
  if (logStream) return logStream;

  try {
    fs.mkdirSync(config.logDir, { recursive: true });
    const today = new Date().toISOString().split('T')[0];
    const filePath = path.join(config.logDir, `aeterna-${today}.log`);
    logStream = fs.createWriteStream(filePath, { flags: 'a' });
    return logStream;
  } catch {
    console.error('[StructuredLogger] 로그 파일 생성 실패:', config.logDir);
    return null;
  }
}

/** 로그 스트림 종료 (graceful shutdown용) */
export function closeLogStream(): void {
  if (logStream) {
    logStream.end();
    logStream = null;
  }
}

// ── 로거 클래스 ──────────────────────────────────────────────

export class StructuredLogger {
  private config: LoggerConfig;

  constructor(config?: Partial<LoggerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** 로그 출력 (코어 메서드) */
  private log(level: LogLevel, message: string, metadata?: Record<string, unknown>): void {
    if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[this.config.minLevel]) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.config.service,
      traceId: currentTraceId,
      message,
      ...(metadata && Object.keys(metadata).length > 0 ? { metadata } : {}),
    };

    const json = this.config.format === 'pretty'
      ? JSON.stringify(entry, null, 2)
      : JSON.stringify(entry);

    // stdout 출력
    if (this.config.stdout) {
      if (level === 'error' || level === 'fatal') {
        process.stderr.write(json + '\n');
      } else {
        process.stdout.write(json + '\n');
      }
    }

    // 파일 출력
    const stream = ensureLogStream(this.config);
    if (stream) {
      stream.write(json + '\n');
    }

    // Loki 전송 (P7-16)
    pushToLoki(entry);
  }

  debug(message: string, metadata?: Record<string, unknown>): void {
    this.log('debug', message, metadata);
  }

  info(message: string, metadata?: Record<string, unknown>): void {
    this.log('info', message, metadata);
  }

  warn(message: string, metadata?: Record<string, unknown>): void {
    this.log('warn', message, metadata);
  }

  error(message: string, metadata?: Record<string, unknown>): void {
    this.log('error', message, metadata);
  }

  fatal(message: string, metadata?: Record<string, unknown>): void {
    this.log('fatal', message, metadata);
  }

  /** 에러 객체를 메타데이터로 변환하는 헬퍼 */
  errorWithStack(message: string, err: Error, extra?: Record<string, unknown>): void {
    this.error(message, {
      error: err.message,
      stack: err.stack,
      name: err.name,
      ...extra,
    });
  }

  /** 자식 로거 생성 (서비스명 오버라이드) */
  child(service: string): StructuredLogger {
    return new StructuredLogger({ ...this.config, service });
  }
}

// ── 기본 로거 인스턴스 (싱글톤) ──────────────────────────────

export const logger = new StructuredLogger();
