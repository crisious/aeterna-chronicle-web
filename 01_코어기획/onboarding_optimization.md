# 에테르나 크로니클 — 온보딩 최적화

> **작성일:** 2026-03-13 | **버전:** v1.0 | **분류:** 코어기획 — 접근성  
> **티켓:** P17-17 (#325) | **선행:** P17-16 (튜토리얼 재설계)

---

## 1. 개요

첫 30분 경험(FTUE — First-Time User Experience)을 최적화하여, 이탈률을 최소화하고 핵심 게임플레이 루프까지 빠르게 도달시킨다.

---

## 2. 6단계 퍼널

| 단계 | 이벤트 | 목표 전환률 | 측정 이벤트 코드 |
|------|--------|------------|----------------|
| F1 | 설치 → 첫 실행 | 95% | `app_first_launch` |
| F2 | 첫 실행 → 캐릭터 생성 완료 | 90% | `character_created` |
| F3 | 캐릭터 생성 → 첫 전투 완료 | 85% | `first_combat_complete` |
| F4 | 첫 전투 → 첫 던전 입장 | 75% | `first_dungeon_enter` |
| F5 | 첫 던전 → 첫 던전 클리어 | 70% | `first_dungeon_clear` |
| F6 | 첫 던전 클리어 → 첫 PvP 입장 | 40% | `first_pvp_enter` |

### 2.1 퍼널 목표 요약

- **F1→F3 (5분 이내):** 클라이언트 실행부터 첫 전투까지 5분 벽을 넘기지 않는다
- **F3→F5 (20분 이내):** 첫 전투부터 첫 던전 클리어까지 20분 이내
- **전체 FTUE (30분):** 설치부터 핵심 루프(던전 반복) 진입까지 30분

---

## 3. A/B 테스트 설계 (3종)

### 3.1 Test A: 시작 지점 변형

| 변형 | 설명 | 가설 |
|------|------|------|
| **A-Control** | 스토리 인트로(30초 컷씬 → 대망각 설명 → 에리언 각성) → 이동 튜토리얼 | 세계관 몰입이 리텐션을 높인다 |
| **A-Variant** | 즉시 전투(보스 등장 → 패배 → 시간 역행 → "3시간 전..." 플래시백) → 본편 시작 | 액션 훅이 이탈률을 줄인다 |

**측정 지표:**
- F1→F2 전환률 (캐릭터 생성 도달)
- F2→F3 전환률 (첫 전투 완료)
- 첫 세션 평균 플레이 시간
- D1 리텐션 (24시간 내 재접속률)

**트래픽 배분:** 50/50 | **최소 표본:** 각 1,000명 | **테스트 기간:** CBT 2주

### 3.2 Test B: 보상 타이밍 변형

| 변형 | 설명 | 가설 |
|------|------|------|
| **B-Control** | 일반 보상 — 튜토리얼 완료 후 일괄 지급 | 기본 경험 |
| **B-Variant** | 즉시 보상 — 각 행동 직후 보상 (이동 → 포션, 전투 → 장비, 스킬 → 스킬포인트) | 빈번한 보상이 초기 참여도를 높인다 |

**측정 지표:**
- 튜토리얼 스킵률 (스킵하는 유저 비율)
- 튜토리얼 완료율
- F3→F4 전환률 (첫 던전 도달)

**트래픽 배분:** 50/50 | **최소 표본:** 각 1,000명 | **테스트 기간:** CBT 2주

### 3.3 Test C: 가이드 NPC 유무

| 변형 | 설명 | 가설 |
|------|------|------|
| **C-Control** | 가이드 NPC 없음 — UI 팝업만으로 안내 | 깔끔한 UX |
| **C-Variant** | 가이드 NPC 동행 — 첫 30분간 화면 가장자리에 미니 NPC가 상황별 대사 출력 | 인격화된 가이드가 이탈률을 줄인다 |

> ⚠️ 가이드 NPC는 금지 목록 외 신규 캐릭터를 사용 (예: "훈련관 마르코")

**측정 지표:**
- 전체 퍼널 전환률 (F1→F6)
- "도움말이 유용했나요?" 인게임 설문 (1~5점)
- 가이드 NPC 대사 클릭률

**트래픽 배분:** 50/50 | **최소 표본:** 각 1,000명 | **테스트 기간:** CBT 2주

---

## 4. 메트릭 수집 이벤트 목록

### 4.1 퍼널 이벤트

| 이벤트 코드 | 타입 | 파라미터 | 발화 시점 |
|------------|------|----------|-----------|
| `app_first_launch` | milestone | `platform`, `os_version`, `device_spec` | 최초 앱 실행 |
| `character_created` | milestone | `class_id`, `creation_time_sec`, `veteran_mode` | 캐릭터 생성 완료 |
| `tutorial_module_start` | progress | `module_id`, `trigger_type` | 튜토리얼 모듈 시작 |
| `tutorial_module_complete` | progress | `module_id`, `duration_sec` | 튜토리얼 모듈 완료 |
| `tutorial_module_skip` | progress | `module_id`, `skip_reason` | 튜토리얼 모듈 스킵 |
| `first_combat_complete` | milestone | `enemy_count`, `duration_sec`, `deaths` | 첫 전투 완료 |
| `first_dungeon_enter` | milestone | `dungeon_id`, `difficulty`, `time_from_create_min` | 첫 던전 입장 |
| `first_dungeon_clear` | milestone | `dungeon_id`, `duration_sec`, `deaths`, `difficulty` | 첫 던전 클리어 |
| `first_pvp_enter` | milestone | `pvp_type`, `level`, `time_from_create_min` | 첫 PvP 입장 |

### 4.2 이탈 감지 이벤트

| 이벤트 코드 | 타입 | 파라미터 | 발화 시점 |
|------------|------|----------|-----------|
| `session_end` | system | `duration_sec`, `last_screen`, `last_action` | 세션 종료 |
| `afk_detected` | system | `afk_duration_sec`, `screen`, `funnel_stage` | 60초+ 무입력 |
| `death_rage_quit` | derived | `deaths_in_5min`, `session_duration_sec` | 5분 내 3회+ 사망 후 종료 |
| `tutorial_abandon` | derived | `module_id`, `step`, `duration_sec` | 튜토리얼 도중 세션 종료 |

### 4.3 참여도 이벤트

| 이벤트 코드 | 타입 | 파라미터 | 발화 시점 |
|------------|------|----------|-----------|
| `level_up` | progress | `level`, `time_from_create_min` | 레벨업 |
| `skill_first_use` | progress | `skill_id`, `class_id` | 스킬 최초 사용 |
| `item_first_equip` | progress | `item_grade`, `slot` | 장비 최초 장착 |
| `active_pause_use` | interaction | `context`(combat/menu), `duration_sec` | Active Pause 사용 |
| `difficulty_change` | setting | `from`, `to`, `funnel_stage` | 난이도 변경 |
| `accessibility_toggle` | setting | `feature`, `enabled`, `funnel_stage` | 접근성 기능 토글 |

### 4.4 A/B 테스트 이벤트

| 이벤트 코드 | 타입 | 파라미터 | 발화 시점 |
|------------|------|----------|-----------|
| `ab_assigned` | system | `test_id`, `variant`, `user_id` | A/B 그룹 배정 |
| `ab_exposure` | system | `test_id`, `variant`, `screen` | 변형 콘텐츠 노출 |

---

## 5. 이탈 지점 분석 프레임워크

### 5.1 단계별 이탈 원인 가설

| 퍼널 구간 | 주요 이탈 원인 (가설) | 대응 |
|-----------|---------------------|------|
| F1→F2 | 긴 로딩/패치, 캐릭터 생성 복잡 | 사전 다운로드, 간소화 옵션 |
| F2→F3 | 튜토리얼 지루함, 조작 혼란 | 숙련자 모드, 상황 팁 |
| F3→F4 | 목표 불명확, 레벨링 막힘 | 퀘스트 가이드 강화, 즉시 보상 |
| F4→F5 | 던전 난이도, 반복 사망 | 스토리 난이도 안내, 자동전투 |
| F5→F6 | PvP 진입 장벽, 공포감 | PvP 튜토리얼, 연습 매칭 |

### 5.2 대시보드 구성

```
┌──────────────────────────────────────────┐
│  📊 FTUE 대시보드                         │
├──────────────────────────────────────────┤
│                                          │
│  퍼널 전환률 (실시간)                      │
│  F1 ██████████████████████ 100%          │
│  F2 ████████████████████░ 90%            │
│  F3 █████████████████░░░ 85%             │
│  F4 ███████████████░░░░░ 75%             │
│  F5 ██████████████░░░░░░ 70%             │
│  F6 ████████░░░░░░░░░░░░ 40%             │
│                                          │
│  평균 FTUE 시간: 24분 ✅ (<30분 목표)      │
│  D1 리텐션: 42%                           │
│  사망-이탈 비율: 12%                       │
│                                          │
│  A/B 현황                                 │
│  Test A: n=1,240 | p=0.03 ✅ 유의미       │
│  Test B: n=890  | p=0.12 ⬜ 미달          │
│  Test C: n=1,100 | p=0.08 ⬜ 미달          │
│                                          │
└──────────────────────────────────────────┘
```

---

## 6. 구현 우선순위

| 우선순위 | 항목 | 출시 시점 |
|----------|------|-----------|
| P0 | 퍼널 이벤트 수집 + 대시보드 | CBT 전 |
| P0 | A/B 테스트 인프라 (Firebase Remote Config) | CBT 전 |
| P1 | Test A (시작 지점 변형) | CBT |
| P1 | Test B (보상 타이밍 변형) | CBT |
| P2 | Test C (가이드 NPC) | OBT |
| P2 | 이탈 감지 자동 알림 (Sentry + Slack) | OBT |

---

## 7. 변경 이력

| 버전 | 날짜 | 내용 |
|------|------|------|
| v1.0 | 2026-03-13 | 6단계 퍼널 + A/B 3종 + 이벤트 33개 정의 |
