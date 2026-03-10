# 에테르나크로니클_통합_가이드

# 에테르나 크로니클 — 통합 가이드

> 최종 갱신: 2026-03-10 | 이 문서는 프로젝트 전체의 네비게이션 허브입니다.

---

## 📌 프로젝트 개요

- **장르: **실시간 반자동 전투 RPG (PC 웹 + Unity + UE5)
- **세계관: **기억과 망각의 이원성, 에테르 결정, 대망각 이후 212년
- **클래스: **에테르 기사 / 기억술사 / 그림자 직조사
- **엔딩: **4종 (기억의 수호자 / 마지막 증인 / 망각의 선택 / 신들의 귀환)
- **SSOT 원칙: **각 설계 요소의 정본 문서를 1개만 지정
---

## 📋 코어기획 (21문서)

### 핵심 설계 (SSOT)

- GDD_final.md — 게임 디자인 문서 v2.2 (전체 요약/참조)
- story_design.md — 스토리 기획서 v1.1 (세계관/캐릭터/챕터)
- game_systems.md — 게임 시스템 설계서 v1.1 (클래스/전투/아이템/경제)
- worldmap_design.md — 월드맵 기획 v1.1 (6개 지역)
- 멀티엔딩_플래그_설계.md — 엔딩 조건 SSOT (플래그 기반)
### 기술

- tech_architecture.md — 웹 전용 아키텍처 v1.0 (아카이브)
- 기술아키텍처_멀티엔진.md — 멀티엔진 아키텍처 v2.0 (정본)
### 신규 기획 (v1.0, 2026-03-10)

- monetization_design.md — 수익화 모델 (P2W 제로, 시즌패스, 코스메틱)
- qa_test_plan.md — QA/테스트 전략 (테스트 피라미드, 릴리즈 게이트)
- sound_design.md — 사운드 디자인 (지역별 BGM, SFX, 인터랙티브 오디오)
- localization_strategy.md — 로컬라이제이션 (ko/en/ja/zh)
- pet_system_design.md — 펫 시스템 (획득/성장/전투)
- crafting_system_design.md — 제작 시스템 (에테르 결정 가공)
- npc_ai_design.md — NPC AI (FSM/BT/보스 페이즈)
- guild_system_design.md — 길드 시스템 (생성/전쟁/레이드)
- pvp_balance_design.md — PvP 밸런스 (아레나/정규화/시즌)
- accessibility_design.md — 접근성 (WCAG 2.1 AA)
- admin_tools_design.md — 운영 도구 (GM/밴/대시보드)
- social_system_design.md — 소셜 기능 (친구/차단/신고/우편)
### 운영

- P2_작업_리스트_v1.md — Phase 2 작업 티켓 보드
- 에테르나크로니클_이슈_트래커.md — 이슈 추적
---

## 🎨 UI/UX (5문서)

- ui_ux_design.md — UI/UX 설계서
- UI_UX_멀티엔진_설계.md — 멀티엔진 UI/UX
- bgm_ai_music_design.md — AI 음악 설계
- 인트로_영상_디자인.md — 인트로 영상
- WBP_Binding_Guide.md — UE5 위젯 바인딩 가이드
---

## 📊 데이터테이블 (9문서)

- combat_balance_table.md — 전투 밸런스 테이블
- monster_data_table.md — 몬스터 데이터
- item_data_table.md — 아이템 데이터
- ch3/ch4 튜닝 테이블 — 수직슬라이스 UX 튜닝
- npc_choice_event_telemetry_schema — NPC 선택지 텔레메트리
- 밸런스/아이템옵션 검증표 — EXP/골드/옵션 검증
---

## 📖 시나리오 (23문서)

- 시나리오_마스터.md — 시나리오 총괄
- 챕터1~5_시나리오.md — 메인 스토리 (5챕터)
- NPC대화 스크립트 — 챕터별 + 캐릭터별 대화
- 세계관외전 — 발견문서/세계관이벤트 통합, 연대표
---

## 🌍 월드맵 (10문서)

- 월드맵_마스터.md — 월드맵 총괄
- 6개 지역: 에레보스, 실반헤임, 솔라리스 사막, 아르겐티움, 북방 영원빙원, 브리탈리아 자유항
- 에테르나_세계_허브.md — 세계 허브 설계
---

## 👤 캐릭터 (38문서)

- 캐릭터_마스터.md — 캐릭터 총괄
- 개별 캐릭터 프로필 (~30명)
- 외전 백스토리 (레이나, 벤자민, 세라핀, 우르그롬, 이그나)
---

## ✅ 검증 리포트 (24문서)

- **P0: **전투데이터/엔딩플래그/수직슬라이스/NPC보상/HUD/플레이테스트 (6건)
- **P1: **Unity/UE5 HUD포팅/엔딩QA/챕터3-4/텔레메트리/경제보정/통합테스트 (10건)
- **P2: **픽셀패리티/텔레메트리/KPI/패치노트/동기화/엔딩회귀/SaveLoad/L10N (8건)
---

## 🔧 공통/인덱스

- README.md — 프로젝트 리드미
- SSOT_참조_락_규칙.md — 정본 문서 참조 규칙
- 정합성_검증_체크리스트.md — 문서 간 정합성 체크
- 시나리오/월드맵/캐릭터 인덱스 — 각 영역 인덱스
---

## 🔄 작업 흐름

### 문서 수정 시

1. 해당 영역의 SSOT 문서를 먼저 수정
1. GDD_final.md 요약 섹션 동기화
1. 정합성_검증_체크리스트.md 확인
1. Notion 동기화 실행: python3 tools/notion_sync/sync_runner.py --mode incremental
### 정합성 이슈 발견 시

1. 에테르나크로니클_이슈_트래커.md에 등록
1. SSOT 문서 기준으로 수정
1. 영향받는 문서 일괄 갱신
---

## 📁 코드/도구

- `client/` — Phaser.js 웹 클라이언트
- `server/` — Node+Fastify+Prisma 서버
- `ue5_umg/` — UE5 HUD C++ 위젯
- `unity_ui_toolkit/` — Unity HUD
- `tools/notion_sync/` — Notion 동기화 스크립트
- `tools/regression/` — 자동 회귀 테스트 (엔딩/SaveLoad/L10N)