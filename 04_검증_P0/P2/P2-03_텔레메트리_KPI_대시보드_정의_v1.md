# 에테르나 크로니클 — P2-03 텔레메트리 KPI 대시보드 정의 v1

> 작성일: 2026-03-06  
> 상태: In progress  
> 선행 조건: P2-02 영속 이벤트 적재 경로 연결

---

## 1) 목표

- NPC 선택지 텔레메트리를 운영 지표(KPI)로 변환해
  - 선택지 선택률
  - 엔딩 기여도
  - 이탈률
  을 일별/챕터별/씬별로 관측 가능하게 만든다.

---

## 2) 데이터 소스

### 2.1 이벤트 원천
- event: `telemetry:dialogue_choice`
- 키 필드:
  - `eventTs`
  - `sessionId`
  - `chapterId`
  - `sceneId`
  - `npcId`
  - `dialogueNodeId`
  - `choiceId`
  - `idempotencyKey`
  - `platform`
  - `buildVersion`

### 2.2 저장 계층
- Redis timeline/counter (근실시간 집계 보조)
- PostgreSQL 이벤트 테이블(정산/리포트 기준)

---

## 3) KPI 정의

## 3.1 선택지 선택률 (Choice Share)

정의:
- 특정 노드에서 각 선택지가 차지하는 비율

식:
- `choice_share = choice_count / total_choices_in_node`

차원:
- chapterId, sceneId, npcId, dialogueNodeId, choiceId
- platform, buildVersion (분할 비교)

활용:
- 분기 의도 대비 쏠림 검출
- 선택지 문구 난이도/매력도 보정

---

## 3.2 엔딩 기여도 (Ending Contribution)

정의:
- 특정 선택지가 최종 엔딩 타입(A/B/C/D/패배)에 미치는 상대 영향도

1차 근사식(v1):
- `contribution(choice, ending) = P(ending | choice) - P(ending | node_baseline)`

주의:
- 인과 추론이 아닌 관측 상관 지표
- 표본 수 임계치 미만(예: n<100)은 신뢰도 경고 표시

---

## 3.3 이탈률 (Drop-off Rate)

정의:
- 노드 진입 대비 다음 스토리 진행 이벤트 미발생 비율

근사식(v1):
- `dropoff(node) = 1 - progressed_sessions(node) / entered_sessions(node)`

운영 기준:
- `dropoff >= 0.35`인 노드는 경고 구간
- 챕터/플랫폼별 히트맵으로 확인

---

## 4) 대시보드 화면 구성

### 4.1 Executive 카드 (상단)
- DAU(스토리 참여 세션)
- 총 선택지 이벤트 수
- 평균 노드 이탈률
- 상위 변동 선택지 Top 5

### 4.2 Choice Funnel 패널
- 챕터/씬/노드 드릴다운
- 노드별 선택지 점유율 스택바
- 기간 비교(어제 vs 최근7일)

### 4.3 Ending Matrix 패널
- 행: choiceId
- 열: endingType
- 셀: contribution score + 표본 수

### 4.4 Drop-off Heatmap 패널
- 축: chapterId x dialogueNodeId
- 색상: drop-off 비율
- 필터: platform/buildVersion

---

## 5) 집계 배치/슬라이딩 윈도우

- 근실시간(5분): Redis 기반 프리뷰
- 일간 정산(00:10 KST): Postgres 기준 확정 집계
- 주간 리포트(월요일 09:00): 전주 대비 증감률

보관 정책(v1):
- Raw event 90일
- 일별 집계 1년

---

## 6) 품질/신뢰도 규칙

- dedupe 기준: `idempotencyKey`
- 이상치 제거:
  - 미래 시각 이벤트
  - latencyMs 음수
- 표본 수 경고:
  - n < 30: 회색(참고용)
  - 30 <= n < 100: 황색(주의)
  - n >= 100: 정상 신뢰도

---

## 7) DoD (P2-03)

- [ ] KPI 계산 SQL/로직 초안 확정
- [ ] 대시보드 패널 4종 정의 완료
- [ ] 샘플 데이터 1일치로 지표 산출 검증
- [ ] 경고 임계치(drop-off 35%) 동작 확인

---

## 8) 다음 액션

1. P2-02 이벤트 테이블 스키마 확정 후 KPI SQL 고정
2. P2-03 v1.1에서 샘플 쿼리/응답 스키마 추가
3. P2-10 통합 테스트 전 KPI baseline 스냅샷 채집
