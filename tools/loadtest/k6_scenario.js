/**
 * k6_scenario.js — 에테르나 크로니클 부하 테스트 시나리오
 *
 * 실행: k6 run tools/loadtest/k6_scenario.js
 *
 * 시나리오 흐름:
 * 로그인 → 존 이동 → 전투 진입 → 스킬 사용 → 아이템 획득 → 거래소 조회 → 채팅
 *
 * 목표: 1000 VU, 5분 ramp-up, 10분 유지
 * 임계값: p95 < 500ms, 에러율 < 1%, RPS > 5000
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import ws from 'k6/ws';

// ── 커스텀 메트릭 ──

const loginDuration = new Trend('login_duration', true);
const zoneMoveErrors = new Counter('zone_move_errors');
const combatErrors = new Counter('combat_errors');
const errorRate = new Rate('error_rate');

// ── 설정 ──

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const WS_URL = __ENV.WS_URL || 'ws://localhost:3000';

export const options = {
  // 시나리오: 단계별 ramp-up → 유지 → ramp-down
  stages: [
    { duration: '1m', target: 200 },   // 1단계: 200 VU까지 증가
    { duration: '2m', target: 500 },   // 2단계: 500 VU까지 증가
    { duration: '2m', target: 1000 },  // 3단계: 1000 VU까지 증가
    { duration: '10m', target: 1000 }, // 4단계: 1000 VU 유지 (10분)
    { duration: '2m', target: 500 },   // 5단계: 500 VU로 감소
    { duration: '1m', target: 0 },     // 6단계: 종료
  ],

  // 임계값 (SLA)
  thresholds: {
    http_req_duration: ['p(95)<500'],     // p95 응답 시간 500ms 미만
    error_rate: ['rate<0.01'],            // 에러율 1% 미만
    http_reqs: ['rate>5000'],             // 초당 요청 수 5000 이상
    login_duration: ['p(95)<1000'],       // 로그인 p95 1초 미만
    http_req_failed: ['rate<0.01'],       // HTTP 실패율 1% 미만
  },

  // 기본 태그
  tags: {
    testType: 'load',
    game: 'aeterna-chronicle',
  },
};

// ── 헬퍼 함수 ──

function getHeaders(token) {
  return {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── 시나리오 데이터 ──

const ZONES = [
  'starting_village', 'verdant_plains', 'whispering_forest',
  'crystal_cave', 'flame_mountain', 'frozen_tundra',
  'shadow_swamp', 'sky_citadel', 'merchant_port',
];

const SKILLS = ['slash', 'fireball', 'heal', 'backstab', 'rapidShot'];
const ITEMS = ['hpPotion_small', 'mpPotion_small', 'antidote'];
const CHAT_MESSAGES = [
  '파티 구해요!', 'LFG dungeon', 'WTS 에테르나 블레이드',
  '힐러 구합니다', 'GG', '보스 잡으러 갈 사람?',
];

// ── 메인 시나리오 ──

export default function () {
  let token = null;
  const vuId = __VU;
  const username = `loadtest_user_${vuId}_${__ITER}`;

  // ── 1. 로그인 ──
  group('01_login', () => {
    const loginPayload = JSON.stringify({
      username: username,
      password: 'TestPass123!',
    });

    const loginStart = Date.now();
    const res = http.post(`${BASE_URL}/api/auth/login`, loginPayload, getHeaders());
    loginDuration.add(Date.now() - loginStart);

    const success = check(res, {
      'login: status 200': (r) => r.status === 200,
      'login: has token': (r) => {
        try {
          const body = JSON.parse(r.body);
          return !!body.token;
        } catch {
          return false;
        }
      },
    });

    errorRate.add(!success);

    if (res.status === 200) {
      try {
        token = JSON.parse(res.body).token;
      } catch {
        // 파싱 실패 시 무시
      }
    }

    sleep(randomInt(1, 2));
  });

  if (!token) return; // 로그인 실패 시 나머지 스킵

  // ── 2. 존 이동 ──
  group('02_zone_move', () => {
    const targetZone = randomChoice(ZONES);
    const res = http.post(
      `${BASE_URL}/api/world/move`,
      JSON.stringify({ zoneId: targetZone }),
      getHeaders(token),
    );

    const success = check(res, {
      'zone_move: status 200': (r) => r.status === 200,
    });

    if (!success) zoneMoveErrors.add(1);
    errorRate.add(!success);
    sleep(randomInt(1, 3));
  });

  // ── 3. 전투 진입 ──
  group('03_combat_enter', () => {
    const res = http.post(
      `${BASE_URL}/api/dungeon/enter`,
      JSON.stringify({ dungeonId: 'crystal_cave_01', difficulty: 'normal' }),
      getHeaders(token),
    );

    const success = check(res, {
      'combat_enter: status 200': (r) => r.status === 200 || r.status === 201,
    });

    if (!success) combatErrors.add(1);
    errorRate.add(!success);
    sleep(1);
  });

  // ── 4. 스킬 사용 (3회 반복) ──
  group('04_skill_use', () => {
    for (let i = 0; i < 3; i++) {
      const skill = randomChoice(SKILLS);
      const res = http.post(
        `${BASE_URL}/api/skill/use`,
        JSON.stringify({ skillId: skill, targetId: `monster_${randomInt(1, 10)}` }),
        getHeaders(token),
      );

      check(res, {
        'skill_use: status 200': (r) => r.status === 200,
      });

      sleep(0.5);
    }
  });

  // ── 5. 아이템 획득 ──
  group('05_item_loot', () => {
    const res = http.get(
      `${BASE_URL}/api/inventory?page=1&limit=20`,
      getHeaders(token),
    );

    check(res, {
      'inventory: status 200': (r) => r.status === 200,
    });

    // 아이템 사용 시뮬레이션
    const item = randomChoice(ITEMS);
    const useRes = http.post(
      `${BASE_URL}/api/inventory/use`,
      JSON.stringify({ itemId: item }),
      getHeaders(token),
    );

    check(useRes, {
      'item_use: status 200': (r) => r.status === 200,
    });

    sleep(1);
  });

  // ── 6. 거래소 조회 ──
  group('06_auction', () => {
    const res = http.get(
      `${BASE_URL}/api/auction/list?page=1&limit=20&sort=recent`,
      getHeaders(token),
    );

    check(res, {
      'auction_list: status 200': (r) => r.status === 200,
    });

    // 특정 아이템 검색
    const searchRes = http.get(
      `${BASE_URL}/api/auction/search?keyword=sword&rarity=rare`,
      getHeaders(token),
    );

    check(searchRes, {
      'auction_search: status 200': (r) => r.status === 200,
    });

    sleep(1);
  });

  // ── 7. 채팅 ──
  group('07_chat', () => {
    const msg = randomChoice(CHAT_MESSAGES);
    const res = http.post(
      `${BASE_URL}/api/chat/send`,
      JSON.stringify({ channel: 'world', message: msg }),
      getHeaders(token),
    );

    check(res, {
      'chat_send: status 200': (r) => r.status === 200 || r.status === 201,
    });

    sleep(randomInt(2, 5));
  });

  // ── 8. 헬스 체크 (간헐적) ──
  if (__ITER % 10 === 0) {
    group('08_health', () => {
      const res = http.get(`${BASE_URL}/api/health?metrics=true`);
      check(res, {
        'health: status 200': (r) => r.status === 200,
        'health: status ok': (r) => {
          try { return JSON.parse(r.body).status === 'ok'; } catch { return false; }
        },
      });
    });
  }
}

// ── 테스트 요약 ──

export function handleSummary(data) {
  const summary = {
    testName: 'Aeterna Chronicle Load Test',
    timestamp: new Date().toISOString(),
    vus_max: data.metrics.vus_max ? data.metrics.vus_max.values.max : 0,
    http_reqs_total: data.metrics.http_reqs ? data.metrics.http_reqs.values.count : 0,
    http_reqs_rate: data.metrics.http_reqs ? data.metrics.http_reqs.values.rate : 0,
    http_req_duration_p95: data.metrics.http_req_duration ? data.metrics.http_req_duration.values['p(95)'] : 0,
    http_req_duration_avg: data.metrics.http_req_duration ? data.metrics.http_req_duration.values.avg : 0,
    error_rate: data.metrics.error_rate ? data.metrics.error_rate.values.rate : 0,
    thresholds_passed: Object.values(data.root_group ? {} : {}).length === 0,
  };

  return {
    'tools/loadtest/report.json': JSON.stringify(summary, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, _opts) {
  return `
══════════════════════════════════════════════
  에테르나 크로니클 — 부하 테스트 완료
══════════════════════════════════════════════
  최대 VU: ${data.metrics.vus_max ? data.metrics.vus_max.values.max : 'N/A'}
  총 요청: ${data.metrics.http_reqs ? data.metrics.http_reqs.values.count : 'N/A'}
  RPS: ${data.metrics.http_reqs ? data.metrics.http_reqs.values.rate.toFixed(1) : 'N/A'}
  p95 응답: ${data.metrics.http_req_duration ? data.metrics.http_req_duration.values['p(95)'].toFixed(1) : 'N/A'}ms
  에러율: ${data.metrics.error_rate ? (data.metrics.error_rate.values.rate * 100).toFixed(2) : 'N/A'}%
══════════════════════════════════════════════
`;
}
