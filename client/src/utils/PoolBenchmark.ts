/**
 * PoolBenchmark — ObjectPool 성능 벤치마크 유틸
 *
 * 개발 모드에서 풀 사용 vs 매번 new 방식의 성능 차이를 측정한다.
 * GC 압력 비교 및 acquire/release 사이클 처리량 확인용.
 */

import { ObjectPool } from './ObjectPool';

/** 벤치마크 결과 */
interface BenchmarkResult {
  label: string;
  iterations: number;
  totalMs: number;
  avgUs: number;       // 평균 마이크로초/사이클
  opsPerSec: number;
}

/** 벤치마크용 더미 오브젝트 */
interface DummyObject {
  x: number;
  y: number;
  alpha: number;
  active: boolean;
  data: number[];
}

function createDummy(): DummyObject {
  return {
    x: 0,
    y: 0,
    alpha: 1,
    active: true,
    data: [0, 0, 0, 0] // 약간의 메모리 부하 시뮬레이션
  };
}

function resetDummy(obj: DummyObject): void {
  obj.x = 0;
  obj.y = 0;
  obj.alpha = 1;
  obj.active = false;
}

/**
 * 풀 사용 벤치마크: acquire → 속성 변경 → release 사이클
 */
function benchmarkPooled(iterations: number): BenchmarkResult {
  const pool = new ObjectPool<DummyObject>(createDummy, 256, resetDummy);
  pool.warmUp(64);

  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    const obj = pool.acquire();
    obj.x = i;
    obj.y = i * 2;
    obj.alpha = 0.5;
    obj.active = true;
    pool.release(obj);
  }
  const elapsed = performance.now() - start;

  return {
    label: 'ObjectPool (acquire/release)',
    iterations,
    totalMs: elapsed,
    avgUs: (elapsed / iterations) * 1000,
    opsPerSec: Math.round(iterations / (elapsed / 1000))
  };
}

/**
 * new 방식 벤치마크: 매번 new 생성 → 속성 변경 → 참조 해제
 */
function benchmarkRaw(iterations: number): BenchmarkResult {
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    const obj = createDummy();
    obj.x = i;
    obj.y = i * 2;
    obj.alpha = 0.5;
    obj.active = true;
    // 참조 해제 — GC가 수거
    void obj;
  }
  const elapsed = performance.now() - start;

  return {
    label: 'Raw new (create/discard)',
    iterations,
    totalMs: elapsed,
    avgUs: (elapsed / iterations) * 1000,
    opsPerSec: Math.round(iterations / (elapsed / 1000))
  };
}

/**
 * 다중 동시 활성 오브젝트 시나리오 — 실전에 가까운 패턴
 * 20개를 동시에 acquire → 전부 release
 */
function benchmarkBurst(iterations: number): BenchmarkResult {
  const pool = new ObjectPool<DummyObject>(createDummy, 256, resetDummy);
  pool.warmUp(64);
  const burstSize = 20;
  const cycles = Math.floor(iterations / burstSize);

  const start = performance.now();
  for (let c = 0; c < cycles; c++) {
    const batch: DummyObject[] = [];
    for (let i = 0; i < burstSize; i++) {
      const obj = pool.acquire();
      obj.x = c * burstSize + i;
      obj.active = true;
      batch.push(obj);
    }
    for (const obj of batch) {
      pool.release(obj);
    }
  }
  const elapsed = performance.now() - start;
  const actualOps = cycles * burstSize;

  return {
    label: `Pool burst (${burstSize} simultaneous)`,
    iterations: actualOps,
    totalMs: elapsed,
    avgUs: (elapsed / actualOps) * 1000,
    opsPerSec: Math.round(actualOps / (elapsed / 1000))
  };
}

function formatResult(r: BenchmarkResult): string {
  return [
    `  📊 ${r.label}`,
    `     반복: ${r.iterations.toLocaleString()}회`,
    `     총 시간: ${r.totalMs.toFixed(2)}ms`,
    `     평균: ${r.avgUs.toFixed(3)}µs/op`,
    `     처리량: ${r.opsPerSec.toLocaleString()} ops/s`
  ].join('\n');
}

/**
 * 풀 벤치마크 실행 — 개발 모드 전용
 *
 * 사용법:
 *   import { runPoolBenchmark } from './utils/PoolBenchmark';
 *   runPoolBenchmark(); // 콘솔 출력
 */
export function runPoolBenchmark(iterations = 1000): void {
  console.log('═══════════════════════════════════════════');
  console.log('  ObjectPool 벤치마크 시작');
  console.log(`  반복 횟수: ${iterations.toLocaleString()}`);
  console.log('═══════════════════════════════════════════');

  const poolResult = benchmarkPooled(iterations);
  const rawResult = benchmarkRaw(iterations);
  const burstResult = benchmarkBurst(iterations);

  console.log('\n' + formatResult(poolResult));
  console.log('\n' + formatResult(rawResult));
  console.log('\n' + formatResult(burstResult));

  // 비교 분석
  const ratio = rawResult.totalMs > 0
    ? (rawResult.totalMs / poolResult.totalMs).toFixed(2)
    : 'N/A';
  const gcNote = poolResult.totalMs < rawResult.totalMs
    ? '✅ 풀이 더 빠름 (GC 압력 감소)'
    : '⚠️ raw가 더 빠름 (소규모에서는 가능)';

  console.log('\n───────────────────────────────────────────');
  console.log(`  비교: Pool vs Raw = ${ratio}x`);
  console.log(`  판정: ${gcNote}`);
  console.log('───────────────────────────────────────────');

  // 풀 통계
  const pool = new ObjectPool<DummyObject>(createDummy, 256, resetDummy);
  pool.warmUp(32);
  for (let i = 0; i < 100; i++) {
    const obj = pool.acquire();
    pool.release(obj);
  }
  const stats = pool.getStats();
  console.log('\n  풀 통계 샘플:');
  console.log(`    active: ${stats.active}, pooled: ${stats.pooled}`);
  console.log(`    created: ${stats.created}, recycled: ${stats.recycled}`);
  console.log('═══════════════════════════════════════════\n');
}
