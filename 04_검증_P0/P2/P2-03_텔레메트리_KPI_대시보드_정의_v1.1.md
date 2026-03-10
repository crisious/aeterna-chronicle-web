# 에테르나 크로니클 — P2-03 텔레메트리 KPI 대시보드 정의 v1.1

> 작성일: 2026-03-06  
> 상태: Done (v1.1 범위)  
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

### 2.3 SQL 기준 테이블(가정)
- `telemetry_dialogue_choice_events`
  - `event_ts timestamptz`
  - `session_id text`
  - `chapter_id text`
  - `scene_id text`
  - `npc_id text`
  - `dialogue_node_id text`
  - `choice_id text`
  - `platform text`
  - `build_version text`
  - `idempotency_key text`
  - `deduped boolean`

---

## 3) KPI 정의

### 3.1 선택지 선택률 (Choice Share)

정의:
- 특정 노드에서 각 선택지가 차지하는 비율

식:
- `choice_share = choice_count / total_choices_in_node`

차원:
- chapterId, sceneId, npcId, dialogueNodeId, choiceId
- platform, buildVersion (분할 비교)

---

### 3.2 엔딩 기여도 (Ending Contribution)

정의:
- 특정 선택지가 최종 엔딩 타입(A/B/C/D/패배)에 미치는 상대 영향도

1차 근사식(v1.1):
- `contribution(choice, ending) = P(ending | choice) - P(ending | node_baseline)`

주의:
- 인과 추론이 아닌 관측 상관 지표
- 표본 수 임계치 미만(예: n<100)은 신뢰도 경고 표시

---

### 3.3 이탈률 (Drop-off Rate)

정의:
- 노드 진입 대비 다음 스토리 진행 이벤트 미발생 비율

근사식(v1.1):
- `dropoff(node) = 1 - progressed_sessions(node) / entered_sessions(node)`

운영 기준:
- `dropoff >= 0.35`인 노드는 경고 구간

---

## 4) KPI SQL 초안 (PostgreSQL)

> 파라미터: `:from_ts`, `:to_ts`, `:chapter_id?`, `:platform?`, `:build_version?`

### 4.1 Choice Share

```sql
WITH filtered AS (
  SELECT
    chapter_id,
    scene_id,
    npc_id,
    dialogue_node_id,
    choice_id,
    platform,
    build_version
  FROM telemetry_dialogue_choice_events
  WHERE event_ts >= :from_ts
    AND event_ts < :to_ts
    AND deduped = false
    AND (:chapter_id IS NULL OR chapter_id = :chapter_id)
    AND (:platform IS NULL OR platform = :platform)
    AND (:build_version IS NULL OR build_version = :build_version)
),
node_total AS (
  SELECT
    chapter_id, scene_id, npc_id, dialogue_node_id,
    COUNT(*) AS total_choices
  FROM filtered
  GROUP BY 1,2,3,4
),
choice_count AS (
  SELECT
    chapter_id, scene_id, npc_id, dialogue_node_id, choice_id,
    COUNT(*) AS choice_count
  FROM filtered
  GROUP BY 1,2,3,4,5
)
SELECT
  c.chapter_id,
  c.scene_id,
  c.npc_id,
  c.dialogue_node_id,
  c.choice_id,
  c.choice_count,
  n.total_choices,
  ROUND(c.choice_count::numeric / NULLIF(n.total_choices, 0), 4) AS choice_share
FROM choice_count c
JOIN node_total n
  USING (chapter_id, scene_id, npc_id, dialogue_node_id)
ORDER BY c.chapter_id, c.scene_id, c.npc_id, c.dialogue_node_id, choice_share DESC;
```

### 4.2 Drop-off Rate (진입/진행 이벤트 근사)

> 가정: 같은 `session_id` 내에서 노드 선택 이벤트가 있으면 entered,
> 이후 다음 노드(`dialogue_node_id` 변경) 이벤트가 있으면 progressed로 간주.

```sql
WITH filtered AS (
  SELECT
    event_ts,
    session_id,
    chapter_id,
    scene_id,
    npc_id,
    dialogue_node_id
  FROM telemetry_dialogue_choice_events
  WHERE event_ts >= :from_ts
    AND event_ts < :to_ts
    AND deduped = false
),
ordered AS (
  SELECT
    *,
    LEAD(dialogue_node_id) OVER (
      PARTITION BY session_id, chapter_id
      ORDER BY event_ts
    ) AS next_node
  FROM filtered
),
node_sessions AS (
  SELECT DISTINCT
    chapter_id,
    scene_id,
    npc_id,
    dialogue_node_id,
    session_id,
    (next_node IS NOT NULL AND next_node <> dialogue_node_id) AS progressed
  FROM ordered
)
SELECT
  chapter_id,
  scene_id,
  npc_id,
  dialogue_node_id,
  COUNT(*) AS entered_sessions,
  COUNT(*) FILTER (WHERE progressed) AS progressed_sessions,
  ROUND(
    1 - (COUNT(*) FILTER (WHERE progressed))::numeric / NULLIF(COUNT(*), 0),
    4
  ) AS dropoff_rate
FROM node_sessions
GROUP BY 1,2,3,4
ORDER BY dropoff_rate DESC;
```

### 4.3 Ending Contribution (집계 테이블 조인)

> 가정: 플레이 세션 엔딩 결과 테이블 `session_ending_results(session_id, ending_type)` 존재.

```sql
WITH choices AS (
  SELECT
    session_id,
    chapter_id,
    scene_id,
    npc_id,
    dialogue_node_id,
    choice_id
  FROM telemetry_dialogue_choice_events
  WHERE event_ts >= :from_ts
    AND event_ts < :to_ts
    AND deduped = false
),
joined AS (
  SELECT
    c.chapter_id,
    c.scene_id,
    c.npc_id,
    c.dialogue_node_id,
    c.choice_id,
    e.ending_type,
    c.session_id
  FROM choices c
  JOIN session_ending_results e
    ON e.session_id = c.session_id
),
choice_prob AS (
  SELECT
    chapter_id, scene_id, npc_id, dialogue_node_id, choice_id, ending_type,
    COUNT(DISTINCT session_id) AS sess_cnt
  FROM joined
  GROUP BY 1,2,3,4,5,6
),
choice_total AS (
  SELECT
    chapter_id, scene_id, npc_id, dialogue_node_id, choice_id,
    COUNT(DISTINCT session_id) AS total_sess
  FROM joined
  GROUP BY 1,2,3,4,5
),
node_prob AS (
  SELECT
    chapter_id, scene_id, npc_id, dialogue_node_id, ending_type,
    COUNT(DISTINCT session_id) AS sess_cnt
  FROM joined
  GROUP BY 1,2,3,4,5
),
node_total AS (
  SELECT
    chapter_id, scene_id, npc_id, dialogue_node_id,
    COUNT(DISTINCT session_id) AS total_sess
  FROM joined
  GROUP BY 1,2,3,4
)
SELECT
  cp.chapter_id,
  cp.scene_id,
  cp.npc_id,
  cp.dialogue_node_id,
  cp.choice_id,
  cp.ending_type,
  ROUND(cp.sess_cnt::numeric / NULLIF(ct.total_sess, 0), 4) AS p_ending_given_choice,
  ROUND(np.sess_cnt::numeric / NULLIF(nt.total_sess, 0), 4) AS p_ending_given_node,
  ROUND(
    (cp.sess_cnt::numeric / NULLIF(ct.total_sess, 0))
    - (np.sess_cnt::numeric / NULLIF(nt.total_sess, 0)),
    4
  ) AS contribution,
  ct.total_sess AS sample_n
FROM choice_prob cp
JOIN choice_total ct
  USING (chapter_id, scene_id, npc_id, dialogue_node_id, choice_id)
JOIN node_prob np
  USING (chapter_id, scene_id, npc_id, dialogue_node_id, ending_type)
JOIN node_total nt
  USING (chapter_id, scene_id, npc_id, dialogue_node_id)
ORDER BY contribution DESC;
```

---

## 5) API 응답 스키마 (JSON)

### 5.1 GET `/kpi/choice-share`

```json
{
  "range": { "from": "2026-03-01T00:00:00Z", "to": "2026-03-02T00:00:00Z" },
  "filters": { "chapterId": "CH3", "platform": "pc", "buildVersion": "0.3.1" },
  "rows": [
    {
      "chapterId": "CH3",
      "sceneId": "CH3_S2",
      "npcId": "npc_rete",
      "dialogueNodeId": "N_0321",
      "choiceId": "C_A",
      "choiceCount": 421,
      "totalChoices": 1000,
      "choiceShare": 0.421
    }
  ]
}
```

### 5.2 GET `/kpi/dropoff`

```json
{
  "range": { "from": "2026-03-01T00:00:00Z", "to": "2026-03-02T00:00:00Z" },
  "threshold": 0.35,
  "rows": [
    {
      "chapterId": "CH4",
      "sceneId": "CH4_S1",
      "npcId": "npc_guard",
      "dialogueNodeId": "N_4102",
      "enteredSessions": 287,
      "progressedSessions": 170,
      "dropoffRate": 0.408,
      "severity": "warn"
    }
  ]
}
```

### 5.3 GET `/kpi/ending-contribution`

```json
{
  "range": { "from": "2026-03-01T00:00:00Z", "to": "2026-03-08T00:00:00Z" },
  "rows": [
    {
      "chapterId": "CH3",
      "sceneId": "CH3_S4",
      "npcId": "npc_kayel",
      "dialogueNodeId": "N_3410",
      "choiceId": "C_B",
      "endingType": "A",
      "pEndingGivenChoice": 0.62,
      "pEndingGivenNode": 0.48,
      "contribution": 0.14,
      "sampleN": 214,
      "confidence": "normal"
    }
  ]
}
```

---

## 6) 신뢰도 규칙

- dedupe 기준: `idempotencyKey`
- 이상치 제거:
  - 미래 시각 이벤트
  - latencyMs 음수
- 표본 수 경고:
  - n < 30: `low`
  - 30 <= n < 100: `medium`
  - n >= 100: `normal`

---

## 7) 대시보드 패널 확정

- Executive 카드
- Choice Funnel
- Ending Matrix
- Drop-off Heatmap

(패널 정의는 v1과 동일, SQL/응답 스키마만 v1.1에서 고정)

---

## 8) DoD (P2-03 v1.1)

- [x] KPI 계산 SQL 초안 확정
- [x] 대시보드 패널 4종 정의 완료
- [x] API 응답 스키마(JSON) 정의
- [x] 임계치(drop-off 35%) 경고 규칙 반영

---

## 9) 후속 작업

1. `schema.prisma` 잠금 해제 후 실제 컬럼명과 SQL 정합성 최종 맞춤
2. 샘플 1일치 데이터로 쿼리 실행 결과 캡처(v1.2)
3. Notion 대시보드 구현 티켓(P2-03 하위) 분해
