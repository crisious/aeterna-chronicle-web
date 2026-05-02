/**
 * client/src/perf/types.ts — 성능 최적화 모듈 공통 타입 (stub)
 *
 * 스프린트: 에테르나 크로니클 성능 최적화 (Asset 단계)
 * 작성: 계섬월 (Staff Engineer)
 *
 * 약속 4지표 (SSOT):
 *   - FPS 평균 ≥ 55 (전투/맵 모두)
 *   - 5분 플레이 메모리 증가 ≤ 50MB
 *   - 초기 로딩 ≤ 5초
 *   - 핫스팟 식별 누락 0건 (전투/맵 진입 시 자동 프로파일)
 *
 * 구현은 development 단계. 여기는 시그니처/타입 정의만.
 * 검의 날을 갈기 전에 칼집부터 맞춘다.
 */

/** 성능 게이트 임계값 (SSOT — DESIGN.md / launch_checklist 미러 대상) */
export const PERF_BUDGETS = {
  /** 평균 FPS 하한 (전투/맵 공통) */
  fpsAvgMin: 55,
  /** p1 FPS 하한 — 99%의 프레임이 이 값 이상 */
  fpsP1Min: 30,
  /** 5분 메모리 증가 상한 (MB) */
  memGrowthMaxMb: 50,
  /** 초기 로딩 상한 (ms) */
  initialLoadMaxMs: 5_000,
  /** 초기 번들 상한 (KB, gzip) */
  initialBundleMaxKb: 2_048,
  /** 단일 텍스처 atlas 상한 (KB) */
  atlasMaxKb: 4_096,
} as const;

export type PerfBudgetKey = keyof typeof PERF_BUDGETS;

/** 핫스팟 측정 단위 — 한 스코프의 누적 통계 */
export interface HotspotSample {
  /** 스코프 식별자 (예: 'BattleScene.update', 'MapScene.render') */
  scopeId: string;
  /** 호출 횟수 */
  callCount: number;
  /** 누적 실행 시간 (ms) */
  totalMs: number;
  /** 평균 실행 시간 (ms) */
  avgMs: number;
  /** p95 실행 시간 (ms) */
  p95Ms: number;
  /** 최대 실행 시간 (ms) */
  maxMs: number;
  /** 측정 윈도우 시작 시각 (epoch ms) */
  windowStartMs: number;
}

/** 핫스팟 리포트 — 상위 N개 정렬 결과 */
export interface HotspotReport {
  generatedAt: string;
  sceneKey: string;
  inCombat: boolean;
  /** totalMs 내림차순 상위 N */
  topByTotal: HotspotSample[];
  /** p95Ms 내림차순 상위 N (튀는 프레임 식별) */
  topByP95: HotspotSample[];
}

/** 메모리 누수 진단 결과 */
export interface MemoryDiagnostic {
  sceneKey: string;
  /** 씬 진입 시 heap (MB) */
  heapOnEnterMb: number;
  /** 씬 종료 직후 heap (MB, GC 강제 후) */
  heapOnExitMb: number;
  /** 누적 증가 (MB) */
  growthMb: number;
  /** 미해제 텍스처 키 (Phaser TextureManager 차감) */
  leakedTextureKeys: string[];
  /** 미해제 이벤트 리스너 수 (EventEmitter 잔여 카운트) */
  leakedListenerCount: number;
  /** 미해제 타이머/트윈 수 */
  leakedTimerCount: number;
  /** 누수 판정 — growthMb > threshold 또는 leaked* > 0 */
  isLeak: boolean;
}

/** 에셋 청크 — 챕터/지역/전투 단위 묶음 */
export interface AssetChunkManifest {
  chunkId: string;
  /** 그룹 분류 — preload(boot), chapter, region, battle, optional */
  group: 'preload' | 'chapter' | 'region' | 'battle' | 'optional';
  /** 트리거 — 진입할 때 자동 로드되는 sceneKey 또는 chapterId 목록 */
  triggers: string[];
  /** 포함 에셋 키 목록 (AssetManager의 path 키) */
  assetKeys: string[];
  /** 예상 다운로드 크기 (KB, gzip 후) */
  estimatedKb: number;
  /** 우선순위 — 낮을수록 먼저 로드 */
  priority: number;
}

/** 청크 로드 상태 */
export type ChunkLoadState =
  | 'idle'
  | 'queued'
  | 'loading'
  | 'loaded'
  | 'failed'
  | 'evicted';

/** 빌드 사이즈 예산 리포트 항목 */
export interface AssetBudgetEntry {
  path: string;
  /** 분류 — image, atlas, audio, json, code */
  kind: 'image' | 'atlas' | 'audio' | 'json' | 'code' | 'other';
  /** 원본 크기 (bytes) */
  rawBytes: number;
  /** gzip 후 크기 (bytes) — 코드/JSON만 */
  gzipBytes?: number;
  /** 예산 초과 여부 */
  overBudget: boolean;
  /** 초과 임계 키 (PERF_BUDGETS에서 매칭) */
  budgetKey?: PerfBudgetKey;
}

export interface AssetBudgetReport {
  generatedAt: string;
  totalRawBytes: number;
  totalGzipBytes: number;
  initialBundleBytes: number;
  /** 예산 초과 항목만 추림 */
  violations: AssetBudgetEntry[];
  /** PASS/WARN/FAIL */
  verdict: 'PASS' | 'WARN' | 'FAIL';
}
