# 부하 테스트 가이드 — 에테르나 크로니클

## 개요

서버의 성능 한계와 병목 지점을 파악하기 위한 부하 테스트 설정.
k6 (메인) + Artillery (대안) 두 가지 도구를 제공한다.

## SLA 목표

| 지표 | 목표 | 비고 |
|------|------|------|
| p95 응답 시간 | < 500ms | 모든 API 엔드포인트 |
| p99 응답 시간 | < 1000ms | |
| 에러율 | < 1% | HTTP 4xx/5xx |
| 초당 요청 (RPS) | > 5000 | 피크 기준 |
| 동시 접속 (VU) | 1000 | 유지 10분 |

## 사전 준비

### 1. 서버 환경

```bash
# 프로덕션 모사 환경에서 서버 실행
NODE_ENV=production npm run start

# Redis 실행 (필수)
redis-server

# PostgreSQL 실행 + 테스트 데이터 시딩
npx prisma db seed
npx ts-node tools/staging/seed.ts
```

### 2. 테스트 도구 설치

```bash
# k6 설치 (macOS)
brew install k6

# Artillery 설치 (npm)
npm install -g artillery@latest
```

### 3. 테스트 유저 생성

```bash
# 부하 테스트용 유저 1000명 일괄 생성 (서버 측 스크립트 필요)
curl -X POST http://localhost:3000/api/admin/seed-loadtest-users \
  -H "Content-Type: application/json" \
  -d '{"count": 1000, "prefix": "loadtest_user_"}'
```

## 실행 방법

### k6 (권장)

```bash
# 기본 실행
k6 run tools/loadtest/k6_scenario.js

# 환경변수 지정
k6 run -e BASE_URL=http://your-server:3000 tools/loadtest/k6_scenario.js

# 결과를 JSON으로 출력
k6 run --out json=results.json tools/loadtest/k6_scenario.js

# InfluxDB + Grafana 연동
k6 run --out influxdb=http://localhost:8086/k6 tools/loadtest/k6_scenario.js

# 간단 스모크 테스트 (VU 5, 30초)
k6 run --vus 5 --duration 30s tools/loadtest/k6_scenario.js
```

### Artillery (대안)

```bash
# 기본 실행
npx artillery run tools/loadtest/artillery_config.yml

# JSON 리포트 생성
npx artillery run --output report.json tools/loadtest/artillery_config.yml

# HTML 리포트 변환
npx artillery report report.json

# 퀵 테스트
npx artillery quick --count 100 --num 10 http://localhost:3000/api/health
```

## 시나리오 구성

### 전체 게임 플로우 (k6 기본)

```
로그인 → 존 이동 → 전투 진입 → 스킬 사용(3회) → 아이템 획득 → 거래소 조회 → 채팅
```

### 부하 단계 (k6)

| 단계 | 시간 | VU | 설명 |
|------|------|------|------|
| 1 | 0~1분 | 0→200 | 워밍업 |
| 2 | 1~3분 | 200→500 | 증가 |
| 3 | 3~5분 | 500→1000 | 최대 도달 |
| 4 | 5~15분 | 1000 | 유지 |
| 5 | 15~17분 | 1000→500 | 감소 |
| 6 | 17~18분 | 500→0 | 종료 |

## 리포트 템플릿

### 부하 테스트 결과 리포트

```
══════════════════════════════════════════════
  에테르나 크로니클 — 부하 테스트 리포트
══════════════════════════════════════════════

■ 테스트 정보
  일시: YYYY-MM-DD HH:MM
  환경: [local / staging / production]
  도구: k6 v0.x.x
  서버: [CPU/RAM/인스턴스 스펙]

■ 결과 요약
  ┌──────────────────┬──────────┬──────────┐
  │ 지표             │ 결과     │ SLA      │
  ├──────────────────┼──────────┼──────────┤
  │ 최대 VU          │          │ 1000     │
  │ 총 요청 수       │          │ -        │
  │ RPS (초당 요청)  │          │ > 5000   │
  │ p50 응답 시간    │          │ -        │
  │ p95 응답 시간    │          │ < 500ms  │
  │ p99 응답 시간    │          │ < 1000ms │
  │ 에러율           │          │ < 1%     │
  └──────────────────┴──────────┴──────────┘

■ 엔드포인트별 상세
  ┌────────────────────────┬──────┬──────┬──────┬──────┐
  │ Endpoint               │ 요청 │ p50  │ p95  │ 에러 │
  ├────────────────────────┼──────┼──────┼──────┼──────┤
  │ POST /api/auth/login   │      │      │      │      │
  │ POST /api/world/move   │      │      │      │      │
  │ POST /api/dungeon/enter│      │      │      │      │
  │ POST /api/skill/use    │      │      │      │      │
  │ GET  /api/inventory    │      │      │      │      │
  │ GET  /api/auction/list │      │      │      │      │
  │ POST /api/chat/send    │      │      │      │      │
  │ GET  /api/health       │      │      │      │      │
  └────────────────────────┴──────┴──────┴──────┴──────┘

■ 병목 분석
  1. [엔드포인트/서비스] — [원인 및 상세]
  2. ...

■ 권장 조치
  1. [구체적 개선 사항]
  2. ...

■ 결론
  SLA 충족 여부: [PASS / FAIL]
  다음 테스트 일정: YYYY-MM-DD

══════════════════════════════════════════════
```

## 모니터링 연동

### Grafana + InfluxDB

```bash
# InfluxDB에 k6 결과 전송
k6 run --out influxdb=http://localhost:8086/k6 tools/loadtest/k6_scenario.js
```

Grafana 대시보드 ID `2587` (k6 공식) 또는 프로젝트 커스텀 대시보드를 사용한다.

### APM 연동

서버의 `/api/health?metrics=true` 엔드포인트로 APM 메트릭을 확인하며,
부하 테스트 중 CPU/메모리/DB 커넥션 풀을 함께 모니터링한다.

## 주의사항

- 프로덕션 환경에서는 절대 실행하지 않는다
- 테스트 데이터(유저, 거래 등)는 테스트 후 정리한다
- 네트워크 지연을 고려해 서버와 같은 네트워크에서 실행을 권장
- WebSocket 부하 테스트는 별도 시나리오로 분리 (향후 추가)
