/**
 * API 성능 벤치마크 스크립트 — P7-19
 *
 * 주요 API 엔드포인트의 응답시간을 측정하고 리포트 출력.
 * 실행: npx ts-node tools/loadtest/api_benchmark.ts
 *
 * 환경변수:
 *   BENCHMARK_URL    — 서버 URL (기본: http://localhost:3000)
 *   BENCHMARK_ROUNDS — 반복 횟수 (기본: 50)
 *   BENCHMARK_TOKEN  — JWT 토큰 (인증 필요 API용)
 */

const BASE_URL = process.env.BENCHMARK_URL || 'http://localhost:3000';
const ROUNDS = parseInt(process.env.BENCHMARK_ROUNDS || '50', 10);
const TOKEN = process.env.BENCHMARK_TOKEN || '';

// ── 벤치마크 대상 엔드포인트 ────────────────────────────────

interface Endpoint {
  name: string;
  method: 'GET' | 'POST';
  path: string;
  body?: Record<string, unknown>;
  requireAuth: boolean;
}

const endpoints: Endpoint[] = [
  // 인증 (비인증)
  { name: 'Health Check', method: 'GET', path: '/api/apm/health', requireAuth: false },

  // 읽기 API (인증)
  { name: 'My Profile', method: 'GET', path: '/api/auth/me', requireAuth: true },
  { name: 'Dungeon List', method: 'GET', path: '/api/dungeons', requireAuth: true },
  { name: 'Monster List', method: 'GET', path: '/api/monsters', requireAuth: true },
  { name: 'Skill List', method: 'GET', path: '/api/skills', requireAuth: true },
  { name: 'Shop Catalog', method: 'GET', path: '/api/shop/catalog', requireAuth: true },
  { name: 'Auction List', method: 'GET', path: '/api/auction', requireAuth: true },
  { name: 'Ranking', method: 'GET', path: '/api/ranking', requireAuth: true },
  { name: 'Craft Recipes', method: 'GET', path: '/api/craft/recipes', requireAuth: true },
  { name: 'Class Tree', method: 'GET', path: '/api/class/tree', requireAuth: true },
  { name: 'NPC List', method: 'GET', path: '/api/npcs', requireAuth: true },
  { name: 'World Zones', method: 'GET', path: '/api/world/zones', requireAuth: true },
  { name: 'Economy Report', method: 'GET', path: '/api/economy/report', requireAuth: true },
  { name: 'Payment Products', method: 'GET', path: '/api/payment/products', requireAuth: true },
  { name: 'Cosmetic Catalog', method: 'GET', path: '/api/cosmetics', requireAuth: true },
  { name: 'APM Metrics', method: 'GET', path: '/api/apm/metrics', requireAuth: false },

  // KPI
  { name: 'KPI Snapshot', method: 'GET', path: '/analytics/kpi', requireAuth: true },
];

// ── 측정 로직 ────────────────────────────────────────────────

interface BenchmarkResult {
  endpoint: string;
  method: string;
  path: string;
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
  successRate: number;
  samples: number;
}

function percentile(sorted: number[], p: number): number {
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

async function benchmarkEndpoint(ep: Endpoint): Promise<BenchmarkResult> {
  const times: number[] = [];
  let successes = 0;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (ep.requireAuth && TOKEN) {
    headers['Authorization'] = `Bearer ${TOKEN}`;
  }

  for (let i = 0; i < ROUNDS; i++) {
    const start = performance.now();
    try {
      const resp = await fetch(`${BASE_URL}${ep.path}`, {
        method: ep.method,
        headers,
        body: ep.body ? JSON.stringify(ep.body) : undefined,
        signal: AbortSignal.timeout(10_000),
      });
      const elapsed = performance.now() - start;
      times.push(elapsed);
      if (resp.status < 500) successes++;
    } catch {
      times.push(performance.now() - start);
    }
  }

  const sorted = [...times].sort((a, b) => a - b);
  const avg = times.reduce((s, t) => s + t, 0) / times.length;

  return {
    endpoint: ep.name,
    method: ep.method,
    path: ep.path,
    min: Math.round(sorted[0] * 100) / 100,
    max: Math.round(sorted[sorted.length - 1] * 100) / 100,
    avg: Math.round(avg * 100) / 100,
    p50: Math.round(percentile(sorted, 50) * 100) / 100,
    p95: Math.round(percentile(sorted, 95) * 100) / 100,
    p99: Math.round(percentile(sorted, 99) * 100) / 100,
    successRate: Math.round((successes / ROUNDS) * 10000) / 100,
    samples: ROUNDS,
  };
}

// ── 메인 실행 ────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  에테르나 크로니클 — API 성능 벤치마크');
  console.log(`  대상: ${BASE_URL}`);
  console.log(`  라운드: ${ROUNDS}회/엔드포인트`);
  console.log(`  시각: ${new Date().toISOString()}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  const results: BenchmarkResult[] = [];

  for (const ep of endpoints) {
    process.stdout.write(`  ⏱ ${ep.name}... `);
    const result = await benchmarkEndpoint(ep);
    results.push(result);
    console.log(`avg ${result.avg}ms / p95 ${result.p95}ms / p99 ${result.p99}ms (${result.successRate}%)`);
  }

  // 요약
  console.log('\n━━━ 요약 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`\n${'엔드포인트'.padEnd(22)} ${'avg'.padStart(8)} ${'p50'.padStart(8)} ${'p95'.padStart(8)} ${'p99'.padStart(8)} ${'성공률'.padStart(8)}`);
  console.log('─'.repeat(62));

  for (const r of results) {
    console.log(
      `${r.endpoint.padEnd(22)} ${(r.avg + 'ms').padStart(8)} ${(r.p50 + 'ms').padStart(8)} ${(r.p95 + 'ms').padStart(8)} ${(r.p99 + 'ms').padStart(8)} ${(r.successRate + '%').padStart(8)}`
    );
  }

  const overallAvg = Math.round(results.reduce((s, r) => s + r.avg, 0) / results.length * 100) / 100;
  const overallP95 = Math.round(results.reduce((s, r) => s + r.p95, 0) / results.length * 100) / 100;

  console.log('─'.repeat(62));
  console.log(`${'전체 평균'.padEnd(22)} ${(overallAvg + 'ms').padStart(8)} ${''.padStart(8)} ${(overallP95 + 'ms').padStart(8)}`);

  // JSON 출력
  console.log('\n📄 JSON 결과:');
  console.log(JSON.stringify(results, null, 2));
}

main().catch(console.error);
