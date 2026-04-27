/**
 * shared/types/performance.ts — 클라이언트 성능 텔레메트리 DTO
 *
 * 스프린트: 에테르나 크로니클 게임 프로젝트 개선 (에셋/stub 단계)
 * 작성: 계섬월 (Staff Engineer)
 *
 * 목적: 클라이언트의 FPS / 프레임타임 / 메모리 샘플을 서버 APM으로 전송하여
 *       실 플레이어 기기에서의 런타임 회귀를 탐지한다.
 *
 * 구현은 development 단계. 여기는 시그니처/타입 정의만.
 */

import type { InputMode } from './telemetry';

/** 성능 샘플 한 건 (고정 간격 수집) */
export interface PerfSample {
  /** 샘플 시각 (클라이언트 ISO) */
  ts: string;
  /** 순간 FPS (최근 N프레임 평균) */
  fps: number;
  /** 프레임 렌더 시간 p50 (ms) */
  frameMsP50: number;
  /** 프레임 렌더 시간 p95 (ms) */
  frameMsP95: number;
  /** JS 힙 사용량 (MB, performance.memory 가능 시) */
  heapUsedMb?: number;
  /** 활성 파티클 수 (ObjectPool.getStats 기반) */
  activeParticles?: number;
  /** 활성 텍스처 추정 용량 (MB) */
  textureMb?: number;
}

/** 씬/스테이지별 컨텍스트 태그 */
export interface PerfSceneTag {
  sceneKey: string;
  chapterId?: string;
  regionId?: string;
  /** 전투 중 여부 (콤보/이펙트 부하 분리용) */
  inCombat: boolean;
  /** 활성 적 수 (전투 중일 때만) */
  enemyCount?: number;
}

/** 서버로 배치 전송되는 페이로드 */
export interface PerfTelemetryBatch {
  eventId: string;
  eventTs: string;
  sessionId: string;
  playerIdHash: string;
  buildVersion: string;
  platform: 'web' | 'unity' | 'ue5' | 'ps5' | 'xbox';
  userAgent?: string;
  /** 하드웨어 티어 추정 ('low' | 'mid' | 'high') */
  hwTier?: 'low' | 'mid' | 'high';
  inputMode: InputMode;
  scene: PerfSceneTag;
  samples: PerfSample[];
  /** 배치 내 샘플 간격 (ms) */
  sampleIntervalMs: number;
  idempotencyKey: string;
}

/** 서버 수신 응답 */
export interface PerfTelemetryIngestResult {
  accepted: number;
  dropped: number;
  reason?: 'rate_limited' | 'schema_invalid' | 'duplicate';
}
