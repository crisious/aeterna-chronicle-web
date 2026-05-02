/**
 * client/src/perf/index.ts — 성능 최적화 모듈 barrel export (stub)
 *
 * 스프린트: 에테르나 크로니클 성능 최적화 (Asset 단계)
 * 작성: 계섬월 (Staff Engineer)
 *
 * 4개 영역 — 각 영역은 단일 책임:
 *   1) HotspotProfiler  — 함수 단위 hotspot 식별 (FPS 게이트)
 *   2) SceneMemoryGuard — 씬 전환 누수 가드 (5분 +50MB 게이트)
 *   3) AssetChunkLoader — 청크 분할 lazy 로딩 (초기 로딩 ≤ 5초 게이트)
 *   4) AssetBudgetReporter — 빌드 사이즈 예산 (CI 게이트)
 *
 * 구현은 development 단계. 본 파일은 시그니처/타입만 export.
 */

export * from './types';
export * from './HotspotProfiler';
export * from './SceneMemoryGuard';
export * from './AssetChunkLoader';
export * from './AssetBudgetReport';
