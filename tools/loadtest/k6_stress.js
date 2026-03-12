/**
 * k6_stress.js — 에테르나 크로니클 스트레스 테스트 (5000/10000 VU)
 * P12-12: 대규모 동시접속 시나리오
 *
 * 실행:
 *   k6 run --env SCENARIO=medium tools/loadtest/k6_stress.js   # 5000 VU
 *   k6 run --env SCENARIO=heavy  tools/loadtest/k6_stress.js   # 10000 VU
 *   k6 run --env SCENARIO=spike  tools/loadtest/k6_stress.js   # 스파이크 테스트
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// ── 커스텀 메트릭 ──

const loginLatency = new Trend('login_latency', true);
const combatLatency = new Trend('combat_latency', true);
const shopLatency = new Trend('shop_latency', true);
const pvpLatency = new Trend('pvp_latency', true);
const socialLatency = new Trend('social_latency', true);
const errorRate = new Rate('error_rate');
const timeouts = new Counter('timeout_count');

// ── 설정 ──

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const SCENARIO = __ENV.SCENARIO || 'medium';

const SCENARIOS = {
  // 5000 VU — 중규모 스트레스
  medium: {
    stages: [
      { duration: '2m', target: 1000 },
      { duration: '3m', target: 2500 },
      { duration: '3m', target: 5000 },
      { duration: '15m', target: 5000 },  // 15분 유지
      { duration: '3m', target: 2500 },
      { duration: '2m', target: 0 },
    ],
    thresholds: {
      http_req_duration: ['p(95)<800', 'p(99)<2000'],
      error_rate: ['rate<0.02'],
      http_reqs: ['rate>10000'],
    },
  },
  // 10000 VU — 대규모 스트레스
  heavy: {
    stages: [
      { duration: '3m', target: 2000 },
      { duration: '4m', target: 5000 },
      { duration: '5m', target: 10000 },
      { duration: '15m', target: 10000 }, // 15분 유지
      { duration: '5m', target: 5000 },
      { duration: '3m', target: 0 },
    ],
    thresholds: {
      http_req_duration: ['p(95)<1500', 'p(99)<5000'],
      error_rate: ['rate<0.05'],
      http_reqs: ['rate>15000'],
    },
  },
  // 스파이크 테스트 — 갑작스러운 트래픽 폭증
  spike: {
    stages: [
      { duration: '1m', target: 500 },
      { duration: '30s', target: 8000 },   // 급증
      { duration: '5m', target: 8000 },    // 유지
      { duration: '30s', target: 500 },    // 급감
      { duration: '2m', target: 500 },     // 안정화
      { duration: '30s', target: 10000 },  // 2차 급증
      { duration: '5m', target: 10000 },
      { duration: '2m', target: 0 },
    ],
    thresholds: {
      http_req_duration: ['p(95)<2000'],
      error_rate: ['rate<0.10'],
    },
  },
};

const selectedScenario = SCENARIOS[SCENARIO] || SCENARIOS.medium;

export const options = {
  stages: selectedScenario.stages,
  thresholds: {
    ...selectedScenario.thresholds,
    login_latency: ['p(95)<1500'],
    combat_latency: ['p(95)<500'],
    shop_latency: ['p(95)<300'],
    http_req_failed: ['rate<0.05'],
  },
  tags: {
    testType: 'stress',
    scenario: SCENARIO,
    game: 'aeterna-chronicle',
  },
};

// ── 헬퍼 ──

function headers(token) {
  return {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    timeout: '10s',
  };
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── 시나리오 데이터 ──

const ZONES = ['starting_village', 'verdant_plains', 'whispering_forest', 'crystal_cave', 'flame_mountain'];
const SKILLS = ['slash', 'fireball', 'heal', 'backstab', 'rapidShot', 'thunderBolt', 'iceWall'];
const SHOP_ITEMS = ['hpPotion_small', 'mpPotion_small', 'scroll_teleport', 'buff_food_str'];

// ── 메인 시나리오 ──

export default function () {
  let token = null;
  const username = `stress_${__VU}_${__ITER}`;

  // ── 인증 ──
  group('auth', () => {
    const start = Date.now();
    const res = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify({ username, password: 'StressTest123!' }),
      headers(),
    );
    loginLatency.add(Date.now() - start);

    const ok = check(res, { 'login 200': (r) => r.status === 200 });
    errorRate.add(!ok);

    if (res.status === 200) {
      try { token = JSON.parse(res.body).token; } catch { /* skip */ }
    }
    if (res.timings.duration > 10000) timeouts.add(1);

    sleep(rand(1, 2));
  });

  if (!token) return;

  // ── 전투 시나리오 ──
  group('combat', () => {
    const start = Date.now();

    // 던전 진입
    http.post(
      `${BASE_URL}/api/dungeon/enter`,
      JSON.stringify({ dungeonId: `dungeon_${rand(1, 30)}`, difficulty: pick(['normal', 'hard']) }),
      headers(token),
    );

    // 스킬 연타 (5회)
    for (let i = 0; i < 5; i++) {
      http.post(
        `${BASE_URL}/api/skill/use`,
        JSON.stringify({ skillId: pick(SKILLS), targetId: `mob_${rand(1, 20)}` }),
        headers(token),
      );
      sleep(0.2);
    }

    combatLatency.add(Date.now() - start);
    sleep(1);
  });

  // ── 상점 ──
  group('shop', () => {
    const start = Date.now();

    http.get(`${BASE_URL}/api/shop/list?category=consumable`, headers(token));

    http.post(
      `${BASE_URL}/api/shop/buy`,
      JSON.stringify({ itemId: pick(SHOP_ITEMS), quantity: rand(1, 5) }),
      headers(token),
    );

    shopLatency.add(Date.now() - start);
    sleep(1);
  });

  // ── PvP 매칭 ──
  if (__ITER % 3 === 0) {
    group('pvp', () => {
      const start = Date.now();

      http.post(
        `${BASE_URL}/api/pvp/queue`,
        JSON.stringify({ mode: pick(['ranked', 'casual']), tier: rand(1, 10) }),
        headers(token),
      );

      http.get(`${BASE_URL}/api/pvp/status`, headers(token));

      pvpLatency.add(Date.now() - start);
      sleep(2);
    });
  }

  // ── 소셜 (리더보드 + 길드) ──
  if (__ITER % 5 === 0) {
    group('social', () => {
      const start = Date.now();

      http.get(`${BASE_URL}/api/ranking/season?limit=100`, headers(token));
      http.get(`${BASE_URL}/api/guild/my`, headers(token));
      http.get(`${BASE_URL}/api/friend/list`, headers(token));

      socialLatency.add(Date.now() - start);
      sleep(1);
    });
  }

  // ── 시즌패스 조회 ──
  if (__ITER % 10 === 0) {
    group('seasonpass', () => {
      http.get(`${BASE_URL}/api/seasonpass/progress`, headers(token));
      sleep(0.5);
    });
  }

  sleep(rand(1, 3));
}

// ── 결과 요약 ──

export function handleSummary(data) {
  const metrics = data.metrics;
  const summary = {
    testName: `Aeterna Chronicle Stress Test (${SCENARIO})`,
    timestamp: new Date().toISOString(),
    scenario: SCENARIO,
    vus_max: metrics.vus_max ? metrics.vus_max.values.max : 0,
    http_reqs_total: metrics.http_reqs ? metrics.http_reqs.values.count : 0,
    http_reqs_rate: metrics.http_reqs ? metrics.http_reqs.values.rate.toFixed(1) : 0,
    p95_ms: metrics.http_req_duration ? metrics.http_req_duration.values['p(95)'].toFixed(1) : 0,
    p99_ms: metrics.http_req_duration ? metrics.http_req_duration.values['p(99)'].toFixed(1) : 0,
    avg_ms: metrics.http_req_duration ? metrics.http_req_duration.values.avg.toFixed(1) : 0,
    error_rate: metrics.error_rate ? (metrics.error_rate.values.rate * 100).toFixed(2) + '%' : '0%',
    timeouts: metrics.timeout_count ? metrics.timeout_count.values.count : 0,
  };

  return {
    [`tools/loadtest/stress_${SCENARIO}_report.json`]: JSON.stringify(summary, null, 2),
    stdout: `
══════════════════════════════════════════════
  에테르나 크로니클 — 스트레스 테스트 (${SCENARIO.toUpperCase()})
══════════════════════════════════════════════
  최대 VU: ${summary.vus_max}
  총 요청: ${summary.http_reqs_total}
  RPS:     ${summary.http_reqs_rate}
  p95:     ${summary.p95_ms}ms
  p99:     ${summary.p99_ms}ms
  에러율:  ${summary.error_rate}
  타임아웃: ${summary.timeouts}
══════════════════════════════════════════════
`,
  };
}
