-- =====================================================================
-- 에테르나 크로니클 — 분석 쿼리 라이브러리 v1.0
-- 작성: 심요연 (Data Analyst)
-- 작성일: 2026-04-21
-- 대상 테이블: telemetry.dialogue_choice / combat.session / player.progression
--   (NPC Choice Event Telemetry Schema v1 기준 — `npc_choice_event_telemetry_schema_v1.md`)
-- 목적: 릴리즈 전후 KPI·밸런스·UX 이상 징후를 한 눈에 살피기 위함.
-- 사용 전: 파티션 키(event_ts::date), build_version 필터를 반드시 적용할 것.
-- =====================================================================


-- ---------------------------------------------------------------------
-- Q1. [KPI] 일별 DAU / 세션 / 이탈 지점
-- 본궁이 살피건대, 플레이어의 발길이 어느 장면에서 머무는지 먼저 읽어야 합니다.
-- ---------------------------------------------------------------------
WITH daily_sessions AS (
  SELECT
    DATE(event_ts)                                AS day,
    build_version,
    COUNT(DISTINCT player_id_hash)                AS dau,
    COUNT(DISTINCT session_id)                    AS sessions,
    COUNT(*)                                      AS choice_events
  FROM telemetry.dialogue_choice
  WHERE event_ts >= CURRENT_DATE - INTERVAL '14 days'
  GROUP BY 1, 2
)
SELECT
  day,
  build_version,
  dau,
  sessions,
  choice_events,
  ROUND(choice_events::numeric / NULLIF(sessions, 0), 2) AS choices_per_session
FROM daily_sessions
ORDER BY day DESC, build_version;


-- ---------------------------------------------------------------------
-- Q2. [UX] 선택지 결정 지연(latency) 분포 — 혼란 지점 탐지
-- 5초 미만은 즉답, 30초 초과는 고민 또는 이탈 위험 구간으로 해석합니다.
-- ---------------------------------------------------------------------
SELECT
  chapter_id,
  scene_id,
  dialogue_node_id,
  COUNT(*)                                                   AS samples,
  ROUND(AVG(latency_ms))                                     AS avg_latency_ms,
  ROUND(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY latency_ms)) AS p50_ms,
  ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms)) AS p95_ms,
  SUM(CASE WHEN latency_ms > 30000 THEN 1 ELSE 0 END)        AS slow_count
FROM telemetry.dialogue_choice
WHERE event_ts >= CURRENT_DATE - INTERVAL '7 days'
  AND latency_ms IS NOT NULL
GROUP BY 1, 2, 3
HAVING COUNT(*) >= 30
ORDER BY p95_ms DESC
LIMIT 20;


-- ---------------------------------------------------------------------
-- Q3. [밸런스] 선택지 편향 — 한쪽으로 쏠림 감지
-- 한 노드에서 특정 선택지 비중이 85% 이상이면 더미 선택지일 가능성.
-- ---------------------------------------------------------------------
WITH node_totals AS (
  SELECT dialogue_node_id, COUNT(*) AS total
  FROM telemetry.dialogue_choice
  WHERE event_ts >= CURRENT_DATE - INTERVAL '14 days'
  GROUP BY 1
),
node_choice AS (
  SELECT dialogue_node_id, choice_id, COUNT(*) AS chose
  FROM telemetry.dialogue_choice
  WHERE event_ts >= CURRENT_DATE - INTERVAL '14 days'
  GROUP BY 1, 2
)
SELECT
  nc.dialogue_node_id,
  nc.choice_id,
  nc.chose,
  nt.total,
  ROUND(100.0 * nc.chose / nt.total, 1) AS pct
FROM node_choice nc
JOIN node_totals nt USING (dialogue_node_id)
WHERE nt.total >= 100
  AND (100.0 * nc.chose / nt.total) >= 85.0
ORDER BY pct DESC;


-- ---------------------------------------------------------------------
-- Q4. [엔딩 분기] 플레이어별 엔딩 진척도 스냅샷
-- 파편이 마지막에 어느 계곡으로 흐르는지, 그 물길을 미리 읽습니다.
-- ---------------------------------------------------------------------
WITH ending_agg AS (
  SELECT
    player_id_hash,
    SUM(COALESCE((ending_progress_delta->>'A')::int, 0)) AS end_a,
    SUM(COALESCE((ending_progress_delta->>'B')::int, 0)) AS end_b,
    SUM(COALESCE((ending_progress_delta->>'C')::int, 0)) AS end_c,
    SUM(COALESCE((ending_progress_delta->>'D')::int, 0)) AS end_d,
    MAX(event_ts)                                        AS last_seen
  FROM telemetry.dialogue_choice
  WHERE event_ts >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY 1
)
SELECT
  CASE
    WHEN GREATEST(end_a, end_b, end_c, end_d) = end_a THEN 'A (최선)'
    WHEN GREATEST(end_a, end_b, end_c, end_d) = end_b THEN 'B (정통)'
    WHEN GREATEST(end_a, end_b, end_c, end_d) = end_c THEN 'C (비극)'
    ELSE 'D (히든)'
  END                                   AS projected_ending,
  COUNT(*)                              AS players,
  ROUND(AVG(end_a + end_b + end_c + end_d), 1) AS avg_total_progress
FROM ending_agg
GROUP BY 1
ORDER BY players DESC;


-- ---------------------------------------------------------------------
-- Q5. [신뢰도] 동료별 평균 신뢰도 & 이반(negative) 비율
-- ---------------------------------------------------------------------
WITH trust_unnest AS (
  SELECT
    player_id_hash,
    key   AS npc_id,
    SUM(value::int) AS trust_sum
  FROM telemetry.dialogue_choice,
       LATERAL jsonb_each_text(trust_delta)
  WHERE event_ts >= CURRENT_DATE - INTERVAL '30 days'
    AND trust_delta IS NOT NULL
  GROUP BY 1, 2
)
SELECT
  npc_id,
  COUNT(*)                                              AS players,
  ROUND(AVG(trust_sum), 1)                              AS avg_trust,
  ROUND(100.0 * SUM(CASE WHEN trust_sum < 0 THEN 1 ELSE 0 END) / COUNT(*), 1) AS negative_pct
FROM trust_unnest
GROUP BY 1
ORDER BY negative_pct DESC;


-- ---------------------------------------------------------------------
-- Q6. [중복 제거] idempotency_key 기준 정제 뷰
-- at-least-once 전송을 전제로 하므로, 집계 전 반드시 dedupe 먼저.
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW telemetry.dialogue_choice_clean AS
SELECT DISTINCT ON (idempotency_key)
  event_id,
  event_ts,
  session_id,
  player_id_hash,
  chapter_id,
  scene_id,
  npc_id,
  dialogue_node_id,
  choice_id,
  build_version,
  platform,
  latency_ms,
  trust_delta,
  ending_progress_delta,
  reward_delta,
  branch_tag
FROM telemetry.dialogue_choice
ORDER BY idempotency_key, event_ts ASC;


-- ---------------------------------------------------------------------
-- Q7. [전투 밸런스] 챕터별 보스전 평균 클리어 턴수 & 전멸률
-- ---------------------------------------------------------------------
SELECT
  chapter_id,
  boss_id,
  COUNT(*)                                                       AS attempts,
  ROUND(AVG(turns_to_clear) FILTER (WHERE outcome = 'victory'), 1) AS avg_turns_victory,
  ROUND(100.0 * SUM(CASE WHEN outcome = 'defeat' THEN 1 ELSE 0 END) / COUNT(*), 1) AS wipe_rate_pct
FROM combat.boss_attempt
WHERE event_ts >= CURRENT_DATE - INTERVAL '14 days'
GROUP BY 1, 2
ORDER BY wipe_rate_pct DESC;


-- ---------------------------------------------------------------------
-- Q8. [A/B 테스트 템플릿] 빌드 버전별 선택지 비율 비교
-- ---------------------------------------------------------------------
WITH ab AS (
  SELECT
    build_version,
    dialogue_node_id,
    choice_id,
    COUNT(*) AS c
  FROM telemetry.dialogue_choice_clean
  WHERE build_version IN ('1.0.0-rc.2', '1.0.0-rc.3')
    AND event_ts >= CURRENT_DATE - INTERVAL '7 days'
  GROUP BY 1, 2, 3
)
SELECT
  dialogue_node_id,
  choice_id,
  SUM(c) FILTER (WHERE build_version = '1.0.0-rc.2') AS rc2_count,
  SUM(c) FILTER (WHERE build_version = '1.0.0-rc.3') AS rc3_count
FROM ab
GROUP BY 1, 2
ORDER BY 1, 2;
