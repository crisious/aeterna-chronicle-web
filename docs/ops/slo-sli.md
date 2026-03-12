# SLO/SLI 정의 — P12-14 모니터링 고도화

> 작성일: 2026-03-12
> 대상: 에테르나 크로니클 프로덕션 서비스

---

## SLI (Service Level Indicators)

서비스 품질을 측정하는 핵심 지표.

| SLI | 정의 | 측정 방법 | Prometheus 쿼리 |
|-----|------|-----------|-----------------|
| **가용성** | 정상 응답(2xx/3xx) 비율 | HTTP 상태 코드 기반 | `sum(rate(aeterna_http_requests_total{status!~"5.."}[5m])) / sum(rate(aeterna_http_requests_total[5m]))` |
| **지연시간** | API 응답 p95 | 요청 처리 시간 히스토그램 | `histogram_quantile(0.95, rate(aeterna_http_request_duration_ms_bucket[5m]))` |
| **처리량** | 초당 처리 요청수 | RPS 카운터 | `sum(rate(aeterna_http_requests_total[1m]))` |
| **에러율** | 5xx 응답 비율 | HTTP 5xx / 전체 | `sum(rate(aeterna_http_requests_total{status=~"5.."}[5m])) / sum(rate(aeterna_http_requests_total[5m]))` |
| **DB 지연** | DB 쿼리 p95 | 쿼리 시간 히스토그램 | `histogram_quantile(0.95, rate(aeterna_db_query_duration_ms_bucket[5m]))` |
| **캐시 히트율** | Redis 캐시 적중 비율 | 히트 / (히트 + 미스) | `aeterna_cache_hit_rate` |
| **동시접속** | 현재 CCU | 소켓 연결 수 | `aeterna_ccu_current` |

---

## SLO (Service Level Objectives)

각 SLI에 대한 목표 수치. 28일 롤링 윈도우 기준.

| SLO | 목표 | 허용 범위 | 에러 버짓 (28일) |
|-----|------|-----------|------------------|
| **가용성** | 99.9% | 월 43분 다운타임 | 0.1% |
| **API 응답 p95** | < 300ms | 500ms까지 warning | - |
| **API 응답 p99** | < 1,000ms | 2,000ms까지 warning | - |
| **에러율** | < 0.1% | 1%까지 warning | 0.1% |
| **DB 쿼리 p95** | < 100ms | 250ms까지 warning | - |
| **캐시 히트율** | > 85% | 60%까지 warning | - |
| **동시접속 처리** | 10,000 CCU | 5,000~10,000 정상 | - |
| **배포 성공률** | 99% | - | 월 1회 롤백 허용 |

---

## 에러 버짓 정책

### 가용성 에러 버짓: 0.1% (28일 = 40.3분)

| 남은 버짓 | 정책 |
|-----------|------|
| > 50% | 정상 배포 진행 |
| 25~50% | 고위험 변경 동결, 안정화 우선 |
| < 25% | 버그 수정/인프라 개선만 배포 |
| 소진 | 모든 변경 동결, 인시던트 리뷰 |

---

## SLO 계층

### Tier 1 — Critical (즉시 대응)
- 가용성 < 99.5%
- 에러율 > 5%
- 전체 서비스 다운

### Tier 2 — High (30분 내 대응)
- API p95 > 500ms
- DB p95 > 250ms
- CCU 급감 (30분 내 50%+ 감소)

### Tier 3 — Medium (4시간 내 대응)
- 캐시 히트율 < 60%
- 특정 엔드포인트 에러율 > 1%
- N+1 쿼리 경고 누적

### Tier 4 — Low (다음 스프린트)
- 번들 크기 증가
- 비핵심 엔드포인트 지연
- 로그 볼륨 급증

---

## 대시보드 & 알림 연계

| 모니터링 도구 | 용도 | 설정 파일 |
|--------------|------|-----------|
| Grafana | 대시보드 시각화 | `tools/monitoring/grafana-dashboard.json` |
| Prometheus | 메트릭 수집 + 알림 | `tools/monitoring/prometheus-alerts.yml` |
| Sentry | 에러 트래킹 | `server/src/apm/sentryInit.ts` |
| Loki | 로그 수집 | `server/src/logging/lokiTransport.ts` |

---

## 리뷰 주기

| 주기 | 활동 |
|------|------|
| 일간 | 자동 SLO 대시보드 확인 (Grafana) |
| 주간 | 에러 버짓 소진율 리뷰 |
| 월간 | SLO 적정성 검토, 목표 조정 |
| 분기 | SLI 지표 추가/제거, 아키텍처 리뷰 |
