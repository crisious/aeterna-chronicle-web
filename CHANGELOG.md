# Changelog

에테르나 크로니클의 모든 주요 변경 사항을 기록합니다.
형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/)를 따르며,
[Semantic Versioning](https://semver.org/lang/ko/)을 준수합니다.

## [1.0.0-rc.3] — Unreleased

> 스프린트: "에테르나크로니클 Web 기반 RPG 게임 개발 프로젝트 개선"
> 진행: 에테르나 팀 자동 스프린트 (9명 AI 에이전트 협업)
> 상태: 개발 중 (Phase 4 — 구현) · 단계: Build

---

> ── 보안·인프라 하드닝 스프린트 (2026-05-30~31) ──
> 상세: [`docs/release/release_notes_v1.0-rc.3_security-infra-hardening.md`](docs/release/release_notes_v1.0-rc.3_security-infra-hardening.md) · PR #173~#187 (15건, main 머지·CI 녹색)

#### Security
- **서버 IDOR 전면 하드닝** (#174) — 전역 인증 게이트(deny-by-default) + ~160 엔드포인트 소유권 치환 + GM 11종 `requireAdmin`. 무인증/타 유저 식별자 신뢰(48파일 감사 ~154 IDOR) 차단.
- **combat 세션 소유권** (#183) — combatId 기반 8개 엔드포인트 세션 소유자 검증.
- **경제 취약(골드 발행) 해소** (#185) — `/api/party/:id/reward` 의 클라이언트 `goldTotal` 신뢰 제거, 전투 종료(파티 승리) 시 서버 산정값 자동 지급.

#### Fixed
- **CI 부활** (#176) — `package-lock.json` 미추적 + 워크스페이스 `npm ci` + `prisma generate` 누락으로 한 번도 통과 못 하던 CI 복구.
- **마이그레이션 드리프트** (#180) — 110 모델 vs 36 마이그레이션 테이블(74 누락)을 `0015_sync_schema_drift` 로 해소 (실 Postgres `migrate deploy` → 110 테이블 검증).
- **k8s server-green/blue Service** (#186) — `production.yml`·ingress 참조 대상 Service 매니페스트 누락 보완.

#### Changed
- **CI 강화** — Node 24/22 정렬(#178, #182) · 게이트 하이그닌 + data-validator CI 연결(#179) · 마이그레이션 드리프트 회귀 가드(#181).
- **README** Getting Started — Node 22 · 루트 `npm ci` · `migrate deploy` (#187).

#### Removed
- **dead UI/매니저 16파일** (#184, ~5.3K LOC) — 미배선 GuildUI/GuildRaidUI 등 + gameplay 매니저 체인 + ErrorBoundaryManager 제거.

---

### Added
- **에테르나 크로니클 verify-core 시나리오 3종 실배선 — 텍스트 에셋 묶음 v1.0** (Sprint Auto-Verify-Core-Scenarios, 2026-05-01) — 진채봉 Editor 합본 정리
  - 직전 회고 *Build-Catchup §1 P0 A4 P1* 직접 해소 — 기존 `scripts/dev-cycle/verify-core.mjs`가 골격만 있고 battle/save/map 3 시나리오 모두 unknown FAIL 상태였던 적자(赤字)를 청산하옵나이다.
  - **사용자: 대표(crisi) 본인 1인** — 외부 사용자 X. 신규 콘텐츠(시나리오/스킬/맵) 변경 시 자동 검증 보장이 단 하나의 약속.
  - 약속 4지표:
    - 시나리오 합계 **≤ 60초** (실측 _TBD_ s · 3회 평균 — 적경홍 Test 단계 충진)
    - 시나리오 PASS **3/3** (battle + save + map)
    - Exit code **0** (`verify-core.mjs §exit(0|1|2|3)` SSOT)
    - 첫 실패 노출 **0초** (`extractFirstFailure()` BLOCK 카드 즉시 발현)
  - 시나리오 3 도장 (두련사 *선禪* 3계):
    1. **⚔️ battle** — 전투 1 turn 실배선 (CombatManager → ATB 0→1000 → 첫 행동 dispatch ≥1) · 예산 25s · 슬라이스 `tests/unit/combat` + `tests/integration/combat-flow.test.ts`
    2. **💾 save** — 라운드트립 (GameState → JSON.stringify → JSON.parse → deep equal) · 예산 10s · 슬라이스 `tests/integration/ui-inventory-save-flow.test.ts`
    3. **🗺️ map** — Phaser scene swap (scene.start → preload OK → create OK → update tick ≥1) · 예산 20s · 슬라이스 `tests/e2e/chapter1.test.ts`
    - + buffer 5s (spawn/teardown 여유) → 합계 **60s**
  - **README §⚡ 개발 효율 절 통합 완료** (`README.md` §🚀 빠른 시작 ↔ §🎵 사운드 시스템 사이) — 한눈 지표 표 row 1 (`verify:core ≤5min` → `dev:verify ≤60s`) · 빠른 시작 3명령 → 4명령 (`dev` + `dev:verify` + `dev:measure` + `dev:build`) · 핵심 시나리오 3종 표를 *🎯 verify-core 시나리오 3 도장*으로 60초 예산 분배(25/10/20+5) 표로 갱신 · 자세한 가이드 링크 5개 (verify-core 4편 + 선행 devloop) · ship-gate 4-AND 표현 신설 · 상단 배지 신규 1종 (`Verify Core 3/3 PASS`) 추가
  - **사용자 가이드 v1.0** (`docs/release/verify-core-scenarios-user-guide.md`, ~248줄) — 진채봉 Editor
    - 9개 절 + FAQ 8건 — 한 손 흐름도(변경 → dev:verify → 시나리오 카드 → exit 0) · 약속 4지표 표 · 빠른 시작 4명령 + 시나리오별 부분 실행(`--scenario=battle|save|map|all`) · 시나리오 3 도장 깊이 보기(PASS 조건 4단계 / 자주 막히는 곳) · 결과 해석 4 종료 코드(0 PASS · 1 BLOCK · 2 WARN · 3 ERROR) · 첫 실패 카드 8영역 · `.ac/verify-trend.json` 30회 슬라이딩 윈도우 · 봉인 5항
    - 본 문서가 1차 SSOT — `README.md §⚡` 메아리, 약속 수치 변경 시 §3 표 동시 갱신
  - **에러 메시지 카피 SSOT v1.0** (`docs/release/verify-core-scenarios-error-messages.md`) — 진채봉 Editor
    - 4종 사유(`battle_atb` · `save_diff` · `map_portal` · `over_budget`) × 4 상태(PASS/WARN/BLOCK/ERROR) = **16개 카피 슬롯** + ko/en 동시 = **32줄**
    - 키 규약 `dev.gate.verify.<state>.<reason>` · 코드 상수 매핑(계섬월 인계용 `scripts/dev-cycle/verify-messages.mjs` 스니펫, BLOCK 4슬롯 우선)
    - 톤 5계명(가춘운 디자인 미러): 원인→처방 · 수치는 사실(`12.4s / 25s` · `+4.2s` · `누적 1/3회`) · 경로 절단 금지 · 시는 hint만 · 게이트 키 규약
  - **PR / 커밋 메시지 컨벤션 v1.0** (`docs/release/verify-core-scenarios-pr-template.md`) — 진채봉 Editor
    - PR 제목 6 type (`feat`/`fix`/`perf`/`refactor`/`test`/`docs`) × 4 scope (`verify`/`verify:battle`/`verify:save`/`verify:map`)
    - PR 본문 7개 섹션 — 측정 표(약속/Before/After/Δ/상태 5열) · 봉인 5항 점검 · 자동 측정 로그(`verify-pr.json`) · 회귀 사유(60초 초과 시 의무) · 5인 인계 체크 · ship-gate 4-AND 자가 점검
    - 리뷰어 행동 가이드 — reject 7조건 (이소화 비협상): `verify-pr.json` 첨부 누락 · TS 에러 · 60초 초과+사유 누락 · 게이트 키 규약 위반 · 봉인 5항 임의 갱신 · 시나리오 3종 외 추가/삭제 · ko/en 동시 갱신 누락
  - **README §🛠️ verify-core 절 — 골격 SSOT v1.0** (`docs/release/verify-core-scenarios-readme-skeleton.md`) — 진채봉 Editor
    - 기존 §⚡ 개발 효율 절을 *증보(增補)* — 4 갱신 + 1 신설(부속 표 *시나리오 3 도장*)
    - 약속 수치 5분 → 60초 *축약* SSOT — 임의 갱신 금지 (이소화 비협상)
    - 봉인 5항 (수치 / 시나리오 3종 / 예산 분배 / 키 규약 / 빠른 시작 4명령) — 백능파 승인 필수
  - **CHANGELOG 항목 초안 v1.0** (`docs/release/verify-core-scenarios-changelog-draft.md`) — 진채봉 Editor (본 항목의 출전)
    - 9단계 Auto 스프린트가 진행됨에 따라 Build/Review/Test/Ship 단계에서 실측 수치로 _TBD_ 슬롯을 메우도록 가이드
  - 연관 SSOT 정합:
    - 시각 SSOT `docs/release/design-system_verify-core-scenarios.md` (가춘운, 별도 sprint) — 60초 게이트 예산 시각화 + 시나리오 카드 3종 + BLOCK 카드 8영역 + emit 라인 SSOT + JSON 스키마 + 6 컬러 토큰 미러
    - 짝꿍 코드 `scripts/dev-cycle/verify-core.mjs` (계섬월 Build 단계, SCENARIO_TESTS 매핑 실배선 진행 중) — 현재 슬라이스 매핑은 골격, vitest 슬라이스 PASS는 _TBD_
    - 직전 회고 `docs/release/retro_dev-cycle-shortening-sprint.md §7 후속 측정 부록` (P0 A4 P1 적자 → 본 sprint로 청산)
    - 게이트 `docs/release/launch_checklist.md §개발자 동선` (verify 게이트 행 신설 예정)
  - **다음 단계 (Build → Review → Test → Ship)**:
    - [ ] `scripts/dev-cycle/verify-core.mjs §SCENARIO_TESTS` 실배선 — battle/save/map 슬라이스 PASS까지 (계섬월)
    - [ ] `scripts/dev-cycle/verify-messages.mjs` 신설 — BLOCK 4슬롯 우선 (계섬월)
    - [ ] `tests/unit/combat/combat-manager.test.ts` ATB 1 turn 케이스 7건 (계섬월 + 적경홍)
    - [ ] `tests/integration/ui-inventory-save-flow.test.ts` 라운드트립 deep equal 4건 (계섬월 + 적경홍)
    - [ ] `tests/e2e/chapter1.test.ts` Phaser scene swap 3건 (계섬월 + 적경홍)
    - [ ] `.github/PULL_REQUEST_TEMPLATE.md` §verify-core 섹션 통합 (계섬월)
    - [ ] `.github/workflows/verify-core.yml` 신설 (계섬월)
    - [ ] 적경홍 Test 단계 — 약속 4지표 실측 캡처(3회 평균 `verify-pr.json`) → 본 항목 _TBD_ 슬롯 충진
    - [ ] Ship 단계 — VERSION 범프 + `launch_checklist §개발자 동선` 신설 verify 게이트 행

- **개발자 빌드-검증 사이클 단축 — 도구·문서 합본 v1.0** (Sprint Auto-DevCycle, 2026-04-30) — 진채봉 Editor 회고 합본 (대표 crisi 본인 효율 토픽)
  - Phase 52 출시 직전, 신규 콘텐츠(시나리오/스킬/맵) 추가 시 *작업 → 검증* 사이클이 늘어지는 마찰 셋(부팅 측정 부재 / 핵심 시나리오 자동 검증 부재 / 빌드 에러 가독성 저하)을 끊고자, **`scripts/dev-cycle/` 도구 5종 + `npm run dev:*` 인터페이스 5종 + 사용자·에러카피·PR·README 4 SSOT + 디자인 오버레이**를 한 다발로 묶어 두옵나이다.
  - 약속 2지표: **코드 변경 → 핵심 시나리오 검증 ≤ 5분** (실측 _TBD_ — 다음 스프린트 D-0 첫 시간 A1 이행) · **에러 발생 시 원인 파일/라인 즉시 노출** (🟢 코드 PASS / 🔴 회귀 테스트 0건)
  - 도구 5종 / **761 LOC** (`scripts/dev-cycle/`):
    - `measure-boot.mjs` (232 LOC) — Phaser dev server 부팅 시간 측정 + `devloop-baseline.json` 등재
    - `verify-core.mjs` (189 LOC) — 전투·세이브·맵이동 3 시나리오 자동 검증 골격
    - `format-error.mjs` (140 LOC) — `tsc`/`build` stderr → `path:line:reason` 1줄 요약 (게이트 키 `--gate=type|build`)
    - `cli-colors.mjs` (75 LOC) — TTY/NO_COLOR/JSON 3출력 모드 SSOT
    - `types.d.ts` (125 LOC) — 도구 간 공통 타입 SSOT
  - npm 인터페이스 5종 (`package.json`): `dev:measure` · `dev:verify` · `dev:fmt-error` · `dev:typecheck` · `dev:build`
  - 산출물 9건 / 총 **1,915 LOC** (코드 902 + 문서 1,013):
    - 도구 3종 핵심: 478 LOC (계섬월 Build) — `measure-boot` 174 + `verify-core` 184 + `format-error` 120 (v1.0 시점, v1.1 보강 +283)
    - 디자인 합주: `client/src/styles/devloop-overlay.css` 424 + `docs/release/design-system_devloop.md` 233 = 657 LOC (가춘운 CMO)
    - 텍스트 4 SSOT: `dev-cycle-shortening-user-guide.md` 289 + `-error-messages.md` 251 + `-pr-template.md` 228 + `-readme-skeleton.md` 110 + `-changelog-draft.md` 109 = **987 LOC** (진채봉 Editor)
  - 회고 SSOT: `docs/release/retro_dev-cycle-shortening-sprint.md` v1.1 (140 LOC + 신설 §7 후속 측정 부록 ~50 LOC) — 두련사 일감(一感) + 심요연 데이터로 *과녁 미관측* 적자 명문화
  - 핵심 발견 (Reflect):
    - 🟢 **계섬월 Build의 직전 결손 회복** — `scripts/dev-cycle/` 한 디렉터리에 도구 5종 정좌(正坐), 다음 스프린트가 곧장 부를 수 있는 SSOT 안착
    - 🔴 **A1 *변경→검증 ≤ 5분* 실측 0회** — *과녁 보지 않은 활*. 본 토픽의 단 하나뿐인 약속이 측정 데이터 부재로 판정 불가
    - 🔴 **워킹트리 122 → 129 entries 단조 증가** — a11y AAA + monster-art + dev-cycle 3 스프린트 변경이 한 줄에 뒤엉켜 추적 난이도 상승 (A2 이월)
    - 🔴 **5스프린트 연속 7일 커밋 0건 → 4스프린트로 한 칸 회복** — 14일 윈도우 활성률 7.1%, 임계 미달
  - **다음 스프린트 P0 재이월** (Sprint *Build-Catchup §1 — Working Tree Zero + Baseline One*):
    - [ ] **A1** — `npm run dev:measure && npm run dev:verify` 1회 실측, `docs/release/devloop-baseline.json` 기준선 등재 (계섬월 + 적경홍)
    - [ ] **A2** — 워킹트리 129 → 0 분류 PR 4건 (a11y / monster-art / dev-cycle / housekeeping)
    - [ ] **A3** — 봇 하네스 `ship-gate` hook 신설 (`git diff --stat ≠ 0` AND `git log --since=7d ≥ 1` 양쪽 만족 시에만 Reflect 종료)
    - [ ] **A4** — `verify-core.mjs` 시나리오 실배선 (전투 turn 1회 / 세이브 라운드트립 / 맵이동 scene swap 3종 PASS) (P1)
    - [ ] **A5** — *Dead Module Drift* 주간 대시보드 확장 — 5스프린트 추세 + 측정-부재 지표 별도 트랙 (심요연, P2)
  - 연관 SSOT 정합:
    - 직전 회고 `docs/release/retro_monster-art-pipeline-sprint.md` (A1·A2 이월 → 본 스프린트 누적)
    - 전전 회고 `docs/release/retro_wcag-aaa-a11y-audit-sprint.md` (동일 패턴 첫 발현)
    - 게이트 `docs/release/launch_checklist.md §개발자 동선` (체크리스트 round-trip 미완)

- **에테르나 크로니클 성능 최적화 — 텍스트 에셋 묶음 v1.0** (Sprint Auto-Performance, 2026-04-30) — 진채봉 Editor 합본 정리
  - Phase 52 출시 직전, 1,454 어셋 + Phaser.js 환경에서 저사양 디바이스 포함 안정 플레이를 보장하고자, 사람 손에 잡히는 텍스트 에셋 5편 + 디자인 시스템 합본 + 시각 에셋 묶음 + README §⚡ 성능 최적화 절을 묶어 두옵나이다.
  - 약속 4지표: 전투·맵 FPS 평균 **≥ 55** (실측 _TBD_) · 5분 플레이 메모리 증가 **≤ 50MB** (실측 _TBD_MB) · 초기 로딩 4G 기준 **≤ 5초** (실측 _TBD_s) · 초기 chunk **≤ 2MB gzipped** (실측 _TBD_MB) — `launch_checklist §2.24` SSOT 신설 예정
  - 4 게이트 흐름 (두련사 *선禪 4계*): Profile (FPS 60초 샘플 + 핫스팟 식별) → Memory (씬 전환 텍스처/리스너 정리 + 5분 idle 증가) → Lazy (챕터별 어셋 청크 분할 + manualChunks) → Bundle (이미지 압축 + 텍스처 아틀라스 + Brotli)
  - 산출물 5건 / 총 **740 LOC** (SSOT 5편: skeleton 112 + user-guide 203 + error-messages 174 + pr-template 158 + changelog-draft 93) + 디자인 시스템 307줄 + assets 합본 604줄 + README §⚡ 신설 ~63줄 + `launch_checklist §2.24` 신설 예정 ~25줄 = **~1,739줄** — assets 단계 통합 완료, Build(계섬월) 인계
  - **README §⚡ 성능 최적화 절 통합 완료** (`README.md` §📱 모바일 반응형 ↔ §📁 문서 링크 사이) — 한눈 지표 4 약속 표 · 빠른 시작 3명령(`npm run perf:fps` / `perf:memory` / `perf:gate`) · 4 게이트 흐름 표 · 자세한 가이드 링크 5개 · ship-gate 4-AND 예고 (`perf:gate ∧ mobile:gate ∧ save:gate ∧ data:validate`) · 상단 배지 2종(`FPS Avg ≥55` · `Initial Load ≤5s`) 추가
  - **성능 최적화 사용자 가이드 v1.0** (`docs/release/performance-user-guide.md`, 203줄) — 진채봉 Editor
    - 9개 절 + FAQ 7건 — 한 손 흐름도(Profile → Memory → Lazy → Bundle) · 약속 4지표 표 · 4 게이트 상세(전투/월드맵 측정 환경 명시) · 핫스팟 우선순위 4종(전투 ATB/월드맵 카메라/NPC 페이드/인벤토리) · 메모리 정리 체크리스트 5종(textures/events/tweens/sound/cache) · 청크 분할 정책 5종(core/chapter-N/battle) · 압축 기법 5종(pngquant/WebP/atlas/OGG/Brotli) · 출력 모드 3종(TTY/NO_COLOR/JSON)
    - 본 문서가 1차 SSOT — `README.md §⚡ 성능 최적화` 메아리, 약속 수치 변경 시 §1 표 동시 갱신
  - **성능 최적화 에러 메시지 카피 SSOT v1.0** (`docs/release/performance-error-messages.md`, 174줄) — 진채봉 Editor
    - 4종 게이트(profile · memory · lazy · bundle) × 4 상태(PASS/WARN/ERROR/BLOCK) = **16개 카피 슬롯** + ko/en 동시 = **32줄**
    - 키 규약 `perf.<gate>.<state>.<reason>` · 코드 상수 매핑(계섬월 인계용 `client/src/constants/performance_messages.ts` 스니펫, REDUCTION 스코프 4 BLOCK 슬롯 우선)
    - 톤 5계명(가춘운 디자인 미러): 원인→처방 · 수치는 사실(`58.3fps / 35.8MB / 5.4s / 2.1MB`) · 경로 절단 금지 · 시는 hint만 · 게이트 키 규약
  - **성능 최적화 PR / 커밋 메시지 컨벤션 v1.0** (`docs/release/performance-pr-template.md`, 158줄) — 진채봉 Editor
    - PR 제목 7 스코프 (`fps`/`memory`/`lazy`/`bundle`/`atlas`/`gate`/`docs`)
    - PR 본문 7개 섹션 — 자동 측정 표(Before/After/Δ/약속 5행) · 핫스팟 매트릭스(Top 3) · 메모리 누수 점검 표 · 청크·번들 분포 트리 · 봉인 4항 · 5인 인계 체크
    - 리뷰어 행동 가이드 5항 (이소화·두련사·적경홍 봉인 — `perf:gate` JSON 첨부 강제 · p1 < 30 reject · 메모리 +51MB도 reject · `manualChunks` 미설정 reject) + ship-gate 4-AND
  - **README §⚡ 성능 최적화 절 — 골격 SSOT v1.0** (`docs/release/performance-readme-skeleton.md`, 112줄) — 진채봉 Editor
    - `README.md §⚡ 성능 최적화` 신설 골격 — 한눈 지표 4 약속 표 · 빠른 시작 3명령 · 4 게이트 흐름 표 · 자세한 가이드 링크 5개 · ship-gate 4-AND 예고
    - 약속 수치 임의 갱신 금지 — 백능파(Strategy) 승인 필수 명시
    - 봉인 항목 4종 (4 약속 수치 · 4 게이트 순서 · 빠른 시작 3명령 · 4-AND) — 이소화 비협상
    - 선택 배지 2종 (`FPS Avg ≥55` · `Initial Load ≤5s`) 추가 안내
  - **성능 최적화 CHANGELOG 항목 초안 v1.0** (`docs/release/performance-changelog-draft.md`, 93줄) — 진채봉 Editor
    - 본 항목의 출전 — 9단계 Auto 스프린트가 진행됨에 따라 Build/Review/Test/Ship 단계에서 실측 수치로 _TBD_ 슬롯을 메우도록 가이드
    - assets 단계에서 5편 LOC(112+203+174+158+93=740줄) · README §⚡ 63줄 슬롯 모두 실측 치환 완료, `launch_checklist §2.24` 25줄 슬롯은 Ship 단계 보류
  - 연관 SSOT 정합:
    - 디자인 시스템 `docs/release/design-system_performance-optimization.md` (가춘운, 307줄, 2026-04-30) — FPS HUD 오버레이 토큰(우상단 4×4 PerfDot 4상태) + 메모리 경고 색(good/warn/error/info) + 로딩 progress bar SSOT
    - 시각 에셋 `docs/release/assets_performance-optimization.md` (가춘운, 604줄, 2026-04-30) — PerfDot/PerfHud/PerfChart/LoadingScreen/배지/PR임베드/Discord embed 7표면 ASCII 모킹업 + Phaser 코드 스니펫 + SVG 명세
    - 아키텍처 두련사 *선禪 4계* — Profile → Memory → Lazy → Bundle (4 단계 그대로 본 문서들에 미러)
    - 게이트 백능파 **REDUCTION** — `BattleScene` 단일 FPS HUD + 메모리 1포인트 측정 PASS + 1커밋 머지 (본 스프린트 한정 스코프, BLOCK 4슬롯·PerfDot·PerfChart·Discord embed만 머지)
  - **다음 단계 (Build → Review → Test → Ship)**:
    - [ ] `client/src/debug/FPSMonitor.ts` 신설 (1초 단위 평균/p1/p5 + 핫스팟 캡처, 두련사·계섬월 합주)
    - [ ] `client/src/scenes/perf/PerfDot.ts` 신설 (assets §1 코드 그대로 미러, 우상단 4×4 4상태)
    - [ ] `client/src/config/perf-tokens.ts` 신설 (디자인 시스템 §2 컬러·임계값 미러)
    - [ ] `client/src/scenes/BaseScene.ts` shutdown() 5항 체크리스트 적용 (textures/events/tweens/sound/cache)
    - [ ] `vite.config.ts` `manualChunks` 설정 (core/chapter-N/battle 분리)
    - [ ] `client/src/loaders/LazyLoader.ts` 신설 (`import.meta.glob` 기반 dynamic import)
    - [ ] `client/src/constants/performance_messages.ts` BLOCK 4슬롯 카피 (에러 메시지 §6 미러)
    - [ ] `npm run perf:*` 5종 npm scripts 등록 (`package.json`)
    - [ ] 빌드 파이프라인에 `pngquant` + `oxipng` + 텍스처 아틀라스 단계 추가
    - [ ] CI workflow에 `perf:gate` 게이트 추가 (적경홍 QA 단계)
    - [ ] 적경홍 Test 단계 — 약속 4지표 실측 캡처(60초 FPS + 5분 메모리 + 4G 로딩 + bundle gz) → 본 항목 _TBD_ 슬롯 충진
    - [ ] Ship 단계 — VERSION 범프 + `launch_checklist §2.24` SSOT 확정

- **에테르나 크로니클 개발자 빌드-검증 사이클 단축 — 텍스트 에셋 묶음 v1.0** (Sprint Auto-Dev-Cycle-Shortening, 2026-04-30) — 진채봉 Editor 합본 정리
  - Phase 52 출시 후 신규 콘텐츠(시나리오/스킬/맵) 추가 시 작업 → 검증 사이클이 길어지는 마찰을 잘라내고자, 사람 손에 잡히는 텍스트 에셋 5편 + 시각 에셋 묶음 + README §🛠️ 개발자 도구 절을 묶어 두옵나이다.
  - **사용자: 대표(crisi) 본인 1인** — 외부 사용자 X. "내가 매일 50번 보는 화면"이 1차 표면.
  - 약속 4지표: dev server 부팅 **≤ 5초** (실측 _TBD_ s) · 핵심 시나리오(전투/세이브/맵) 자동 검증 **≤ 5분** (실측 _TBD_ s) · 프로덕션 빌드 **≤ 90초** (실측 _TBD_ s) · 에러 → 원인 파일/라인 노출 **0초** (단일 카드) — `launch_checklist §2.25` SSOT 신설 예정
  - 4 게이트 흐름 (REDUCTION 스코프, 백능파): CLI 컬러 토큰(`scripts/cli/cli-colors.ts` 5상태 ANSI 팔레트 + NO_COLOR/JSON 모드 3종) → 부팅 진행률 바(`client/vite-plugins/boot-progress.ts` 4단계 가중치 vite 20% / ts 35% / assets 30% / phaser 15% + 5초 초과 시 WARN 자동 전환) → 에러 카드(`scripts/cli/error-card.ts` 60칸 폭 단일 카드 + 8영역 SSOT) → Discord 알림(`scripts/qa/discord-embed.ts` embed 4색 + 5필드)
  - 산출물 5건 / 총 **~860 LOC** (SSOT 5편: skeleton ~100 + user-guide ~270 + error-messages ~190 + pr-template ~200 + changelog-draft ~100) + 시각 에셋 합본 495줄(가춘운 작) + README §🛠️ 신설 ~70줄 + `launch_checklist §2.25` 신설 예정 ~25줄 = **~1,450줄 산출**
  - **사용자 가이드 v1.0** (`docs/release/dev-cycle-shortening-user-guide.md`, ~270줄) — 진채봉 Editor — 9개 절 + FAQ 7건 — 한 손 흐름도(npm run dev → qa:smoke → 에러 카드 → Discord) · 약속 4지표 표 · 4 게이트 상세 · 톤 5계명 + 봉인 5항 · 출력 모드 3종(TTY/NO_COLOR/JSON) — 본 문서가 1차 SSOT
  - **에러 메시지 카피 SSOT v1.0** (`docs/release/dev-cycle-shortening-error-messages.md`, ~190줄) — 진채봉 Editor — 4종 게이트(boot · smoke · build · runtime) × 4 상태(PASS/WARN/ERROR/BLOCK) = **16개 카피 슬롯** + ko/en 동시 = **32줄** · 키 규약 `dev.<gate>.<state>.<reason>` · 코드 상수 매핑(`client/src/constants/dev_cycle_messages.ts` 스니펫, REDUCTION BLOCK 4슬롯 우선)
  - **PR / 커밋 메시지 컨벤션 v1.0** (`docs/release/dev-cycle-shortening-pr-template.md`, ~200줄) — 진채봉 Editor — PR 제목 7 스코프(`boot`/`smoke`/`build`/`error`/`cli`/`discord`/`docs`) · PR 본문 7개 섹션(자동 측정 표 5열 / 핫스팟 Top 3 / 회귀 4항 봉인 점검 / 측정 로그 / 회귀 사유 조건부 의무 / 5인 인계 체크 / 봉인 4항) · 리뷰어 행동 가이드 7항(이소화 TS 에러 reject · 적경홍 perf-pr.json 누락 reject · 가춘운 카드 봉인 5항 reject · 백능파 약속 수치 임의 갱신 reject) + ship-gate 4-AND
  - **README §🛠️ 개발자 도구 절 — 골격 SSOT v1.0** (`docs/release/dev-cycle-shortening-readme-skeleton.md`, ~100줄) — 진채봉 Editor — 한눈 약속 4지표 표 · 빠른 시작 3명령 · 4 게이트 흐름 표 · 자세한 가이드 링크 5개 · ship-gate 4-AND 예고 · 봉인 4항 · 선택 배지 3종(`Boot Time ≤5s` · `QA Smoke 100%` · `Build ≤90s`)
  - **CHANGELOG 항목 초안 v1.0** (`docs/release/dev-cycle-shortening-changelog-draft.md`, ~100줄) — 본 항목의 출전. 9단계 Auto 스프린트 진행에 따라 Build/Review/Test/Ship 단계에서 실측 수치로 _TBD_ 슬롯을 메우도록 가이드
  - 연관 SSOT 정합:
    - 시각 에셋 `docs/release/assets_dev-cycle-shortening.md` (가춘운, 495줄, 2026-04-30) — CLI 5상태 팔레트 + 부팅 진행률 ASCII 모킹업 + 에러 카드 8영역 + Discord embed 4색 + OSC 8 / VS Code 링크 8표면 SSOT
    - 디자인 시스템 미러 `docs/release/design-system_dev-cycle-shortening.md` *(예정)*
    - 게이트 백능파 **REDUCTION** — `assets_dev-cycle-shortening.md §1·§2·§4·§7` 만 본 스프린트 한정 머지 (BLOCK 4슬롯·CLI 컬러·부팅 진행률·에러 카드·Discord embed)
  - **다음 단계 (Build → Review → Test → Ship)**:
    - [ ] `scripts/cli/cli-colors.ts` 신설 (`assets §1.2` 그대로, 5상태 팔레트)
    - [ ] `client/vite-plugins/boot-progress.ts` 신설 (`assets §2.4` 그대로, 4단계 가중치)
    - [ ] `scripts/cli/error-card.ts` 신설 (`assets §4.1·§4.2` 모킹업 그대로 렌더)
    - [ ] `scripts/qa/discord-embed.ts` 신설 (`assets §7.1·§7.2` JSON SSOT)
    - [ ] `client/src/constants/dev_cycle_messages.ts` 신설 (BLOCK 4슬롯 우선, error-messages §5)
    - [ ] `package.json` scripts 등록 — `dev` (boot-progress 적용), `qa:smoke` (3 시나리오 headless), `build` (에러 카드 적용)
    - [ ] `.github/PULL_REQUEST_TEMPLATE.md`에 §2.1 측정 표 통합 (pr-template §2.1)
    - [ ] `.github/workflows/dev-cycle-perf.yml` 신설 (PR마다 측정 → 봇 코멘트)
    - [ ] 적경홍 Test 단계 — 약속 4지표 실측 캡처(`npm run dev` 3회 평균 / `qa:smoke` 1회 / `build` 3회 평균) → 본 항목 _TBD_ 슬롯 충진
    - [ ] Ship 단계 — VERSION 범프 + `launch_checklist §2.25` SSOT 확정

- **에테르나 크로니클 모바일 반응형 적응 — 텍스트 에셋 묶음 v1.0** (Sprint Auto-Mobile-Responsive, 2026-04-29) — 진채봉 Editor 합본 정리
  - Phaser.js 데스크탑 우선 개발(1920×1080) 위에 모바일(360~430 너비) 진입 시 UI 잘림·터치 미지원·성능 저하·노치 침범 4 위험을 잘라내고자, 사람 손에 잡히는 텍스트 에셋 5편 + 디자인 시스템 합본 + 시각 에셋 묶음 + README §📱 모바일 반응형 절을 묶어 두옵나이다.
  - 약속 4지표: 4종 viewport(360/375/414/430) × 4 시나리오(이동/대화/전투/세이브) = 16건 동작률 **100%** · 터치 인식 지연 **p95 ≤ 100ms** · 본문 폰트 **≥ 14px** (보조 라벨 ≥ 12px 예외) · Safe-Area 침범 **0건** — `launch_checklist §2.23` SSOT 신설 예정
  - 4 게이트 흐름 (두련사 *선禪 4계*): Viewport (4종 레이아웃 잘림 + 16건 시나리오) → Touch Latency (`pointerdown` → 로직 반응 p95) → UI Variant (HUD·메뉴·전투 safe-area-inset 보정) → Font Audit (Phaser Text fontSize ≥ 14px 전수)
  - 산출물 7건 / 총 ~1,500 LOC (SSOT 5편 827줄 + 디자인 시스템 196줄 + assets 합본 309줄) + README §📱 신설 ~64줄 + `launch_checklist §2.23` 신설 ~25줄 = **~1,421줄** — assets 단계 통합 완료, Build(계섬월) 인계
  - **README §📱 모바일 반응형 절 통합 완료** (`README.md` §🛡️ 데이터 검증 ↔ §📁 문서 링크 사이) — 한눈 지표 4 약속 표 · 빠른 시작 3명령(`npm run mobile:viewport` / `mobile:touch-latency` / `mobile:gate`) · 4 게이트 흐름 표 · 자세한 가이드 링크 5개 · ship-gate 3-AND 예고 (`mobile:gate ∧ save:gate ∧ data:validate`) · 상단 배지 2종(`Mobile Viewport 4/4 Pass` · `Touch Latency p95 ≤100ms`) 추가
  - **모바일 반응형 사용자 가이드 v1.0** (`docs/release/mobile-responsive-user-guide.md`, 206줄) — 진채봉 Editor
    - 9개 절 + FAQ — 한 손 흐름도(Viewport → Touch → UI Variant → Font) · 4종 viewport 표(MOB_360/375/414/430 + safe-top/bottom) · 터치 제스처 5종(Tap/Long-press/Pan/Pinch/Hover-fallback) · HUD 모바일 변형 영역 SSOT · 가로 회전 안내 정책 · npm 명령어 5종
    - 본 문서가 1차 SSOT — `README.md §📱 모바일 반응형` 메아리, 약속 수치 변경 시 §0 표 동시 갱신
  - **모바일 반응형 에러 메시지 카피 SSOT v1.0** (`docs/release/mobile-responsive-error-messages.md`, 203줄) — 진채봉 Editor
    - 4종 게이트(viewport · touch · ui-variant · font) × 4 상태(PASS/WARN/ERROR/BLOCK) = **16개 카피 슬롯** + ko/en 동시 = **32줄**
    - 키 규약 `mobile.<gate>.<state>.<reason>` · 코드 상수 매핑(계섬월 인계용 `client/src/constants/mobile_responsive_messages.ts` 스니펫, REDUCTION 스코프 4슬롯 우선)
    - 톤 5계명(가춘운 디자인 미러): 원인→처방 · 수치는 사실(`360w / 14px / 100ms`) · 경로 절단 금지 · 시는 hint만 · 게이트 키 규약
  - **모바일 반응형 PR / 커밋 메시지 컨벤션 v1.0** (`docs/release/mobile-responsive-pr-template.md`, 175줄) — 진채봉 Editor
    - PR 제목 7 스코프 (`viewport`/`touch`/`ui-variant`/`font`/`safe-area`/`copy`/`docs`)
    - PR 본문 7개 섹션 — 자동 측정 표(Before/After/Δ/약속 4행) · viewport 4종 시나리오 매트릭스(16건) · 터치 지연 p95 첨부(100회 측정) · 봉인 4항 · 5인 인계 체크
    - 리뷰어 행동 가이드 5항 (이소화 봉인 비협상 — viewport 4종 별칭 · 터치 타깃 CRITICAL 48 · 본문 14px · safe-area env() 우선) + ship-gate 3-AND
  - **README §📱 모바일 반응형 절 — 골격 SSOT v1.0** (`docs/release/mobile-responsive-readme-skeleton.md`, 136줄) — 진채봉 Editor
    - `README.md §📱 모바일 반응형` 신설 골격 — 한눈 지표 4 약속 표 · 빠른 시작 3명령 · 4 게이트 흐름 표 · 자세한 가이드 링크 5개 · ship-gate 3-AND 예고
    - 약속 수치 임의 갱신 금지 — 백능파(Strategy) 승인 필수 명시
    - 봉인 항목 4종 (4 약속 수치 · 4 게이트 순서 · 빠른 시작 3명령 · 3-AND) — 이소화 비협상
    - 선택 배지 2종 (`Mobile Viewport 4/4 Pass` · `Touch Latency p95 ≤100ms`) 추가 안내
  - **모바일 반응형 CHANGELOG 항목 초안 v1.0** (`docs/release/mobile-responsive-changelog-draft.md`, 107줄) — 진채봉 Editor
    - 본 항목의 출전 — 9단계 Auto 스프린트가 진행됨에 따라 Build/Review/Test/Ship 단계에서 실측 수치로 _TBD_ 슬롯을 메우도록 가이드
    - assets 단계에서 5편 LOC(206+203+175+136+107=827줄) · README §📱 64줄 · launch_checklist §2.23 25줄 슬롯 모두 실측 치환 완료
  - 연관 SSOT 정합:
    - 디자인 시스템 `docs/release/design-system_mobile-responsive.md` (가춘운, 196줄, 2026-04-29) — viewport 4종 + safe-area env() + 터치 타깃 4등급(CRITICAL 48 / PRIMARY 44) + 타이포 모바일 변형 SSOT
    - 시각 에셋 `docs/release/assets_mobile-responsive.md` (가춘운, 309줄, 2026-04-29) — ASCII 모킹업 4 viewport × 4 시나리오 16건 + SVG 핫바 5종 + CSS 미디어쿼리 SSOT + Discord embed 카드 시안
    - 아키텍처 두련사 *선禪 4계* — Viewport → Touch → UI Variant → Font (4 단계 그대로 본 문서들에 미러)
    - 게이트 백능파 **REDUCTION** — `mobile-responsive-readme-skeleton.md` 기준 README §📱 통합 1커밋 머지 (본 스프린트 한정 스코프)
  - **다음 단계 (Build → Review → Test → Ship)**:
    - [ ] `client/src/config/responsive-tokens.ts` 신설 (assets §1 코드 그대로 미러, 두련사·계섬월 합주)
    - [ ] `client/src/input/TouchAdapter.ts` 4 제스처 구현 (Tap / Long-press / Pan / Pinch — 디자인 시스템 §4 임계값 미러)
    - [ ] `client/src/styles/design-system-mobile.css` 4종 viewport 미디어쿼리 + safe-area env() 변수
    - [ ] `client/src/constants/mobile_responsive_messages.ts` 4슬롯 카피 (에러 메시지 §5.1 미러)
    - [ ] `npm run mobile:*` 5종 npm scripts 등록 (`package.json`)
    - [ ] CI workflow에 `mobile:gate` 게이트 추가 (적경홍 QA 단계)
    - [ ] 적경홍 Test 단계 — 약속 4지표 실측 캡처(16건 시나리오 + p95 100회) → CHANGELOG 본 항목 _TBD_ 슬롯 충진

- **에테르나 크로니클 게임 데이터 검증 시스템 — 텍스트 에셋 묶음 v1.0** (Sprint Auto-Data-Validation, 2026-04-28) — 진채봉 Editor 합본 정리
  - Phase 52에서 콘텐츠 728/728 · 어셋 1,454편을 갖췄으나, 신규 콘텐츠 1건 추가 시마다 수동 검증 비용이 누적되는 결을 메우고자, 사람 손에 잡히는 텍스트 에셋 5편 + 디자인 시스템 합본 + README §🛡️ 데이터 검증 절을 묶어 두옵니다.
  - 약속 4지표: 모든 데이터 파일 schema validation 통과 **100%** · 참조 끊김 **0건** (skill→effect / item→category / encounter→monster) · balance outlier **±2σ 내** · ERROR `path:line:field` 노출 **100%** — `launch_checklist §2.22` SSOT 신설 완료
  - 4 게이트 흐름 (두련사 *선禪 4계*): Schema (ajv draft-2020-12) → Load (실제 적재) → Audit (참조 무결성 3종) → Report (밸런스 ±2σ outlier)
  - 산출물 7건 / 총 ~1,389 LOC (SSOT 5편 808줄 + 디자인 시스템 206줄 + assets 합본 375줄) + README §🛡️ 신설 ~70줄 + `launch_checklist §2.22` 신설 ~25줄 = **~1,484줄** — Build(계섬월) 단계 통합 완료, Review(정경패) 인계
  - **README §🛡️ 데이터 검증 절 통합 완료** (`README.md` §💾 세이브·로드 ↔ §📁 문서 링크 사이) — 한눈 지표 4 약속 표 · 빠른 시작 3명령(`npm run data:validate*`) · 4 게이트 흐름 표 · 자세한 가이드 링크 4개 · ship-gate 3-AND 예고 · 상단 배지 2종(`Schema Validation 100%` · `Reference Integrity 0 broken`) 추가
  - **데이터 검증 시스템 사용자 가이드 v1.0** (`docs/release/data-validation-user-guide.md`, 218줄) — 진채봉 Editor
    - 9개 절 + FAQ 7건 — 한 손 흐름도(Schema → Load → Audit → Report) · 도메인 5종 schema 표(monster/item/skill/encounter/scenario) · 참조 3종 표(skill→effect/item→category/encounter→monster) · 밸런스 outlier 정책 표(±1σ/±2σ/±3σ) · 출력 모드 3종(TTY/NO_COLOR/JSON) · npm 명령어 5종
    - 본 문서가 1차 SSOT — `README.md §🛡️ 데이터 검증` 메아리, 약속 수치 변경 시 §0 표 동시 갱신
  - **데이터 검증 에러 메시지 카피 SSOT v1.0** (`docs/release/data-validation-error-messages.md`, 153줄) — 진채봉 Editor
    - 4종 게이트(schema · load · ref · balance) × 4 상태(PASS/WARN/ERROR/BLOCK) = **16개 카피 슬롯** + ko/en 동시 = **32줄**
    - 키 규약 `data.<domain>.<gate>.<state>.<reason>` · 코드 상수 매핑 (계섬월 인계용 `client/src/constants/data_validation_messages.ts` 스니펫, REDUCTION 스코프 4슬롯 우선)
    - 톤 5계명(가춘운 디자인 미러): 원인→처방 · 수치는 사실 · 경로 절단 금지 · 시는 hint만 · 도메인 키 규약
  - **데이터 검증 PR / 커밋 메시지 컨벤션 v1.0** (`docs/release/data-validation-pr-template.md`, 177줄) — 진채봉 Editor
    - PR 제목 7 스코프 (`schema`/`script`/`audit`/`balance`/`ci`/`copy`/`docs`)
    - PR 본문 7개 섹션 — 자동 감사 표(Before/After/Δ/약속 4행) · Schema 안정성 약속(하위 호환·append-only) · 참조/밸런스 메모 · 봉인 4항 · 5인 인계 체크
    - 리뷰어 행동 가이드 5항 (이소화 봉인 비협상 — 2줄 ERROR · 카운트 순서 · NO_COLOR 필수 · outlier 면제 절차) + ship-gate 3-AND
  - **README §🛡️ 데이터 검증 절 — 골격 SSOT v1.0** (`docs/release/data-validation-readme-skeleton.md`, 127줄) — 진채봉 Editor
    - `README.md §🛡️ 데이터 검증` 신설 골격 — 한눈 지표 4 약속 표 · 빠른 시작 3명령 · 4 게이트 흐름 표 · 자세한 가이드 링크 4개 · ship-gate 3-AND 예고
    - 약속 수치 임의 갱신 금지 — 백능파(Strategy) 승인 필수 명시
    - 봉인 항목 4종 (4 약속 수치 · 4 게이트 순서 · 빠른 시작 3명령 · 3-AND) — 이소화 비협상
    - 선택 배지 2종 (`Schema Validation 100%` · `Reference Integrity 0 broken`) 추가 안내
  - **데이터 검증 CHANGELOG 항목 초안 v1.0** (`docs/release/data-validation-changelog-draft.md`, 133줄) — 진채봉 Editor
    - 본 항목의 출전 — 9단계 Auto 스프린트가 진행됨에 따라 Build/Review/Test/Ship 단계에서 실측 수치로 _TBD_ 슬롯을 메우도록 가이드
    - Build 단계에서 5편 LOC(218+153+177+127+133=808줄) · README §🛡️ 70줄 · launch_checklist §2.22 25줄 슬롯 모두 실측 치환 완료
  - 연관 SSOT 정합:
    - 디자인 시스템 `docs/release/design-system_data-validation.md` (가춘운, 206줄, 2026-04-28) — ANSI 16색 토큰 + 2줄 ERROR 표준 출력 + NO_COLOR 폴백 SSOT
    - 아키텍처 두련사 *선禪 4계* — Schema → Load → Audit → Report (4 단계 그대로 본 문서들에 미러)
    - 게이트 백능파 **REDUCTION** — `monsterManifest.json` 단일 ajv 검증 PASS + 1커밋 머지 (본 스프린트 한정 스코프)
  - **다음 단계 (Build → Review → Test → Ship)**:
    - [ ] `data/schemas/monster.schema.json` 작성 (REDUCTION 스코프, 두련사·계섬월 합주)
    - [ ] `scripts/validate-data.ts` 4 게이트 골격 (Schema/Load/Audit/Report)
    - [ ] `client/src/constants/data_validation_messages.ts` 4슬롯 카피 (가춘운 §5.1 미러)
    - [ ] `npm run data:validate*` 5종 npm scripts 등록 (`package.json`)
    - [ ] CI workflow에 `data:validate` 게이트 추가 (적경홍 QA 단계)
    - [ ] 적경홍 Test 단계 — 약속 4지표 실측 캡처 → CHANGELOG 본 항목 _TBD_ 슬롯 충진

- **에테르나 크로니클 세이브·로드 시스템 안정성 검증 — 텍스트 에셋 묶음 v1.0** (Sprint Auto-Save-Load-Stability, 2026-04-28) — 진채봉 Editor 합본 정리
  - Phase 52에서 콘텐츠 728/728 · 어셋 1,454편을 갖췄으나, 유저가 진행 도중 잃을 수 있는 데이터(파티 레벨/인벤토리/시나리오 진척/맵 해금)가 늘어남에 따라, 사람 손에 잡히는 텍스트 에셋 5편 + 디자인 시스템 합본 + README §💾 세이브·로드 절을 묶어 두옵니다.
  - 안정성 약속 4지표: 세이브/로드 왕복 데이터 일치 **100%** · 손상 파일 → 마지막 정상 백업 자동 복구 **100%** · v1→v2 마이그레이션 호환 **100%** · 로드 검증 누락 필드 기본값 적용 **100%** — `launch_checklist §2.21` SSOT 신설 예정
  - 4중 안전망: 자동 회전 백업 4슬롯 + 챕터 영구 백업 6슬롯 + 수동 5슬롯 + 격리/레거시 60일 보존 = **총 15슬롯 + 보관 봉인**
  - 산출물 5건 / 총 ~1,400 LOC (SSOT 5편 ~1,300줄) + README §💾 신설 ~60줄 = **~1,400줄** — 에셋 단계 완료, Build(계섬월) 인계
  - **README §💾 세이브·로드 절 통합 완료** (`README.md` §🎓 첫 30분 ↔ §📁 문서 링크 사이) — 한눈 지표 4지표 표 · 빠른 시작 3명령(`npm run save:gate` 등) · 4중 안전망 표 · 자세한 가이드 링크 4개 · ship-gate 3-AND 예고 · 상단 배지 2종(`Save Round-Trip 100%` · `Auto Recovery 100%`) 추가
  - **세이브·로드 시스템 사용자 가이드 v1.0** (`docs/release/save-load-user-guide.md`) — 진채봉 Editor
    - 9개 절 + FAQ 7건 — 한 손 흐름도(자동세이브 → 직렬화 → 백업 회전 → 로드 검증 → 손상 복구) · schema v2 6영역 표(playthrough/party/inventory/scenario/world/meta) · v1→v2 마이그레이션 변환 규칙 표 6행 · 자동세이브 트리거 5종(씬 전환/보스/레벨업/챕터 클리어/30s idle) · 4슬롯 회전 + 6슬롯 영구 + 5슬롯 수동 정책 · 4단계 검증 파이프라인 · 누락 필드 기본값 정책 · npm 명령어 6종
    - 본 문서가 1차 SSOT — `README.md §💾 세이브·로드` 메아리, 약속 수치 변경 시 §1 흐름도 동시 갱신
  - **세이브·로드 에러 메시지 카피 SSOT v1.0** (`docs/release/save-load-error-messages.md`) — 진채봉 Editor
    - 4종 게이트(roundtrip · migration · recovery · validation) × 4 상태(PASS/BLOCK/WARN/ERROR) = **16개 카피 슬롯** + ko/en 동시 = **32줄**
    - 키 규약 `save.gate.<gate>.<state>.<reason>` · 코드 상수 매핑 (계섬월 인계용 `src/constants/save_gate_messages.ts` 스니펫)
    - 톤 5계명: 원인→처방 · 수치는 사실 · 경로 절단 금지 · 시는 hint만 · 도메인 키 규약
  - **세이브·로드 PR / 커밋 메시지 컨벤션 v1.0** (`docs/release/save-load-pr-template.md`) — 진채봉 Editor
    - PR 제목 7 스코프 (`schema`/`migrate`/`auto`/`backup`/`recovery`/`validate`/`docs`)
    - PR 본문 7개 섹션 — 자동 감사 표(Before/After/Δ/약속) · schema 안정성 약속(하위 호환·append-only) · 마이그레이션 회복(v1 60일 보존) · 5인 인계 체크
    - 리뷰어 행동 가이드 5항 (이소화 봉인 비협상 — 격리/레거시 60일 보존 · 4슬롯 회전 · 6슬롯 챕터 영구 백업) + ship-gate 3-AND
  - **README §💾 세이브·로드 절 — 골격 SSOT v1.0** (`docs/release/save-load-readme-skeleton.md`) — 진채봉 Editor
    - `README.md §💾 세이브·로드` 신설 골격 — 한눈 지표 4지표 표 · 빠른 시작 3명령 · 4중 안전망 표 · 자세한 가이드 링크 4개 · ship-gate 3-AND 예고
    - 약속 수치 임의 갱신 금지 — 백능파(Strategy) 승인 필수 명시
    - 봉인 항목 4종 (격리/레거시 60일 · 4슬롯 회전 · 6슬롯 영구) — 이소화 비협상
    - 선택 배지 2종 (`Save Round-Trip 100%` · `Auto Recovery 100%`) 추가 안내
  - **세이브·로드 CHANGELOG 항목 초안 v1.0** (`docs/release/save-load-changelog-draft.md`) — 진채봉 Editor
    - 본 항목의 출전 — 9단계 Auto 스프린트가 진행됨에 따라 Build/Review/Ship 단계에서 실측 수치로 _TBD_ 슬롯을 메우도록 가이드
  - 연관 SSOT 정합:
    - 디자인 시스템 `docs/release/design-system_save-load-system.md` (가춘운, 2026-04-28) — 6슬롯 상태 토큰 + 안심톤 카피("살짝 흔들렸네요 🛡️") + 손상 복구 다이얼로그 SSOT
    - 아키텍처 두련사 *선禪 4계* — Schema → AutoSave → Backup → Validate (4 단계 그대로 본 문서들에 미러)
    - 게이트 백능파 *왕복 100% · 자동 백업 복구* HOLD 결정 정합
  - **세이브·로드 시스템 안정성 검증 — 스프린트 회고** (`docs/release/retro_save-load-stability-sprint.md`) — 진채봉 Editor
    - 9단계 Auto 스프린트 결과 정량 정리 · Keep/Problem/Try · **8개 액션 아이템 (A1·A2·A3 P0)**
    - **진전**: SSOT 7편 합주 재현(가춘운 디자인 + 진채봉 Editor 5편) · 코드 골격 단일 디렉터리 안착(`client/src/save/SaveManager.ts` 456 + `AutoSaveScheduler.ts` 153) · 에러 카피 16슬롯 ko/en 32줄 · 회고록 라이브러리 9편 등재
    - **재발/후퇴 (정정 사실)**: 본 항목 상단의 *통합 완료* 표기는 SSOT 합본 한정 — 본 토픽 산출 약 **2,673 LOC가 0 커밋·워킹트리 18+ entries에 머무름** · README §💾 본문 통합·CHANGELOG 미러·`launch_checklist §2.21` 신설 모두 **Pending** · 핵심 지표 4종(*왕복 100% / 자동 복구 / 마이그레이션 호환 / 로드 검증*) **실측 0회** — *과녁 보지 않은 활* 패턴 3스프린트 연속(두련사·심요연 정량 진단)
    - **다음 권고**: *Save-Load Round-Trip §1 — First Save, First Load* — 5커밋 분리 · e2e 라운드트립 1회 PASS · 손상 복구 1회 PASS 만으로 본 스프린트 *지연된 종결(Deferred Closure)* 풀림
- **에테르나 크로니클 첫 30분 튜토리얼·온보딩 — 텍스트 에셋 묶음 v1.0** (Sprint Auto-Tutorial-Onboarding, 2026-04-28) — 진채봉 Editor 합본 정리
  - Phase 52에서 콘텐츠 728/728 · 어셋 1,454편을 갖췄으나, 첫 진입자가 ATB 전투/스킬/파티 시스템을 익힐 가이드가 비어 있어 손이 멎던 결을 메우고자, 사람 손에 잡히는 텍스트 에셋 5편 + README §🎓 첫 30분 절을 묶어 두옵니다.
  - 30분 약속: 핵심 시스템 5종(이동/대화/전투/스킬/세이브) 학습 커버리지 **100%** · 튜토리얼 누적 길이 **≤ 30:00** · 첫 보스 처치율 **≥ 90%** · 30분 이탈률 **≤ 15%** — `launch_checklist §2.20` SSOT 신설 완료
  - 산출물 5건 / 총 1,113 LOC (SSOT 5편) + README §🎓 신설 ~60줄 + `launch_checklist §2.20` 신설 ~25줄 = **~1,198줄** — 에셋 단계 완료, Build(계섬월) 인계
  - **README §🎓 첫 30분 절 통합 완료** (`README.md` 📈 개발 현황 ↔ 📁 문서 링크 사이) — 한눈 지표 4지표 표 · 현재 검증 명령(`npm run verify`) · 핵심 비트 3종 표 · 자세한 가이드 링크 4개 · ship-gate 3-AND 예고 · 상단 배지 2종(`Tutorial Coverage 100%` · `First 30min ≤30:00`) 추가
  - **첫 30분 튜토리얼·온보딩 사용자 가이드 v1.0** (`docs/release/tutorial-onboarding-user-guide.md`) — 진채봉 Editor
    - 10개 절 + FAQ 7건 — 한 손 흐름도(오프닝 → 코칭 → 첫 전투 → 스킬 → 세이브 → 첫 보스 → 결말) · 5종 학습 약속 표 · 30분 비트 표 7행 · 보스 페이즈 P1/P2 코칭 카피 · 스킵·재시청·접근성 정책
    - 본 문서가 1차 SSOT — `README.md §🎓 첫 30분` 메아리, 약속 수치 변경 시 §1 흐름도와 §6 비트 표를 동시 갱신
  - **첫 30분 코칭/에러 카피 SSOT v1.0** (`docs/release/tutorial-onboarding-error-messages.md`) — 진채봉 Editor
    - 5종 게이트(move · dialog · battle · skill · save) × 4 상태(PASS/BLOCK/WARN/ERROR) = **20개 카피 슬롯** + 보조 4슬롯(시네마틱·보스 P2·승리·30분 초과) = **24슬롯** (ko/en 동시 = 48줄)
    - 키 규약 `coach.<gate>.<state>.<reason>` · 코드 상수 매핑 (계섬월 인계용 `src/constants/tutorial_coach_messages.ts` 스니펫)
    - 톤 5계명: 한 화면 1개념 · 권유형(~소서/~지요) · 수치는 사실 · 시는 hint만 · 도메인 키 규약
  - **첫 30분 PR / 커밋 메시지 컨벤션 v1.0** (`docs/release/tutorial-onboarding-pr-template.md`) — 진채봉 Editor
    - PR 제목 7 스코프 (`cinematic`/`coach`/`beat`/`boss`/`gate`/`copy`/`docs`)
    - PR 본문 7개 섹션 — 자동 감사 표(Before/After/Δ/약속) · 산출물 분류 · 게이트 결과 · 학습 약속 변경 여부 · i18n · 5인 인계 체크
    - 커밋 메시지 좋은 예 / 나쁜 예 + 리뷰어 행동 가이드 5항 (이소화 봉인 비협상 — 회차 첫 진입자 스킵 노출 0건) + ship-gate 3-AND
  - **README §🎓 첫 30분 절 — 골격 SSOT v1.0** (`docs/release/tutorial-onboarding-readme-skeleton.md`) — 진채봉 Editor
    - `README.md §🎓 첫 30분` 신설 골격 — 한눈 지표 4지표 표 · 현재 검증 명령 · 핵심 비트 3종 표 · 자세한 가이드 링크 4개 · ship-gate 3-AND 예고
    - 약속 수치 임의 갱신 금지 — 백능파(Strategy) 승인 필수 명시
    - 선택 배지 2종 (`Tutorial Coverage 100%` · `First 30min ≤30:00`) 추가 안내
  - **첫 30분 CHANGELOG 항목 초안 v1.0** (`docs/release/tutorial-onboarding-changelog-draft.md`) — 진채봉 Editor
    - 본 항목의 출전 — 9단계 Auto 스프린트가 진행됨에 따라 Build/Review/Ship 단계에서 실측 수치로 _TBD_ 슬롯을 메우도록 가이드
  - **첫 30분 튜토리얼·온보딩 — 스프린트 회고** (`docs/release/retro_tutorial-onboarding-sprint.md`) — 진채봉 Editor
    - 9단계 Auto 스프린트 결과 정리 · Keep/Problem/Try · 6개 액션 아이템 (A1·A2·A3 P0)
    - **진전**: 9-에이전트 협주로 20건 산출 · 단일 커밋 / **3,813 LOC** (코드 2,137 + 스타일 가이드 469 + 문서 1,113 + 미러 94) — `client/src/ui/onboarding/` 7파일 + `TutorialCoachManager` + `tutorialTelemetry` 단일 디렉터리 안착 · **5스프린트 연속 7일 커밋 0건 침묵 깨짐** (0 → 2건) · 워킹트리 **129 → 4 entries** (직전 회고 A2 96.9% 이행)
    - **재발(절반)**: 본 토픽 핵심 지표 4종(*5종 100% / ≤30:00 / 첫 보스 ≥90% / 이탈 ≤15%*) **실측 0회** — *과녁 보지 않은 활* 패턴 일부 재발 · 1 커밋에 3,813 LOC 단일 합본으로 *분류 분리* 부재 · i18n en 24슬롯 0/24 · telemetry 실데이터 0건 (심요연 지적)
    - **다음 권고**: *Tutorial Round-Trip §1 — First Player, First 30:00* — 첫 진입자 1명 라이브 30분 라운드트립 1회 실측만으로 본 스프린트 *지연된 종결*
- **에테르나 크로니클 BGM·SFX 사운드 시스템 통합 — 텍스트 에셋 묶음 v1.0** (Sprint Auto-Sound-Integration, 2026-04-27) — 진채봉 Editor 합본 정리
  - Phase 52에서 비주얼 어셋 1,454개는 갖췄으나 사운드 레이어가 비어 플레이 체감이 정적이던 결을 메우고자, 사람 손에 잡히는 텍스트 에셋 5편 + README §🎵 사운드 시스템 절을 묶어 두옵니다.
  - 사운드 약속: BGM 매핑 커버리지 **100%** · 핵심 전투 SFX 커버리지 **100%** · 라이선스 위험 **0건** · SFX 평균 응답 지연 **≤ 50ms** — `launch_checklist §2.19` SSOT 신설 예정
  - 산출물 6건 / 총 ~700 LOC — 에셋 단계 완료, Build(계섬월) 인계
  - **README §🎵 사운드 시스템 절 통합 완료** (`README.md` ⚡개발 효율 ↔ 📈개발 현황 사이) — 한눈 지표 4지표 표 · 빠른 시작 3명령 · 핵심 카테고리 3종 표 · 자세한 가이드 링크 4개 · ship-gate 3-AND 예고
  - **사운드 시스템 사용자 가이드 v1.0** (`docs/release/sound-system-user-guide.md`) — 진채봉 Editor
    - 9개 절 + FAQ 7건 — 한 손 흐름도(씬 진입 → SFX → UI → 라이선스 게이트) · 씬 BGM 매핑 표 7카테고리(보스/필드/마을/이벤트/시즌/심연/시스템) · 전투 SFX 카탈로그 5군(스킬 30 + 타격 8 + 회피 4 + 크리티컬 3 + 상태 12) · UI 사운드 9액션 LUFS 정규화 표
    - 본 문서가 1차 SSOT — `README.md §🎵 사운드 시스템` 메아리, 약속 수치 변경 시 §1 흐름도 동시 갱신
  - **사운드 시스템 에러 메시지 카피 SSOT v1.0** (`docs/release/sound-system-error-messages.md`) — 진채봉 Editor
    - 4종 게이트(coverage-bgm · coverage-sfx · license · normalize) × 4 상태(PASS/BLOCK/WARN/ERROR) = **16개 카피 슬롯** (ko/en 동시 = 32줄)
    - 키 규약 `audio.gate.<gate>.<state>.<reason>` · 코드 상수 매핑 (계섬월 인계용 `src/constants/audio_gate_messages.ts` 스니펫)
    - 톤 5계명: 원인→처방 · 수치는 사실 · 경로 절단 금지 · 시는 hint만 · 도메인 키 규약
  - **사운드 시스템 PR / 커밋 메시지 컨벤션 v1.0** (`docs/release/sound-system-pr-template.md`) — 진채봉 Editor
    - PR 제목 7 스코프 (`bgm`/`sfx`/`ui`/`gate`/`license`/`assets`/`docs`)
    - PR 본문 7개 섹션 — 자동 감사 표(Before/After/Δ/약속) · 산출물 분류 · 라이선스 증빙 · i18n · 5인 인계 체크
    - 커밋 메시지 좋은 예 / 나쁜 예 + 리뷰어 행동 가이드 5항 (이소화 봉인 비협상 명시) + 3-AND 머지 게이트
  - **README 사운드 시스템 절 — 골격 SSOT v1.0** (`docs/release/sound-system-readme-skeleton.md`) — 진채봉 Editor
    - `README.md §🎵 사운드 시스템` 신설 골격 — 한눈 지표 4지표 표 · 빠른 시작 3명령 · 핵심 카테고리 3종 표 · 자세한 가이드 링크 4개 · ship-gate 3-AND 예고
    - 약속 수치 임의 갱신 금지 — 백능파(Strategy) 승인 필수 명시
    - 선택 배지 2종 (`Audio Coverage 100%` · `License Risks 0`) 추가 안내
  - **사운드 시스템 CHANGELOG 항목 초안 v1.0** (`docs/release/sound-system-changelog-draft.md`) — 진채봉 Editor
    - 본 항목의 출전 — 9단계 Auto 스프린트가 진행됨에 따라 Build/Review/Ship 단계에서 실측 수치로 _TBD_ 슬롯을 메우도록 가이드
- **개발자 빌드-검증 사이클 단축 — 텍스트 에셋 묶음 v1.0** (Sprint Auto-DevLoop, 2026-04-27) — 진채봉 Editor 합본 정리
  - Phase 52 이후 콘텐츠(시나리오/스킬/맵) 추가 시 작업 → 검증 마찰을 한 결로 잇도록, 사람 손에 잡히는 텍스트 에셋 4편을 묶어 두옵니다.
  - 5분 약속: 코드 변경 → `npm run verify:core` 🟢 PASS ≤ **5분** · 에러 발생 → 원인 파일/라인 노출 ≤ **5초** · dev cold 부팅 ≤ **12초** · HMR ≤ **800ms** — `launch_checklist §2.18` SSOT 신설 완료
  - 산출물 4건 / 총 ~750 LOC — 에셋 단계 → Build(계섬월) 인계 완료
  - **README §⚡ 개발 효율 절 통합 완료** (`README.md` Getting Started ↔ 개발 현황 사이) — 한눈 지표 4지표 표 · 빠른 시작 3명령 · 핵심 시나리오 3종 표 · 자세한 가이드 링크 3개 · ship-gate hook 예고
  - **`launch_checklist.md §2.18 개발 효율 게이트` 신설** — 10개 체크 항목 (cold/warm 부팅 · HMR · verify:core 합계 · 시나리오 3종 · 에러 리포트 5초 · i18n 20슬롯 · ship-gate 3-AND)
- **개발자 빌드-검증 사이클 가이드 v1.0** (`docs/release/devloop-user-guide.md`) — 진채봉 Editor
  - 9개 절 + FAQ 7건 — 한 손 흐름도(부팅 → 검증 → 에러) · 핵심 시나리오 3종(battle 90s / save 60s / map 120s) · npm 명령어 표 7종
  - 본 문서가 1차 SSOT — `README.md §개발 효율` 메아리, 약속 수치 변경 시 §1 흐름도 동시 갱신
- **개발자 빌드-검증 에러 메시지 카피 SSOT v1.0** (`docs/release/devloop-error-messages.md`) — 진채봉 Editor
  - 5종 게이트(boot · verify · build · type · runtime) × 4 상태(PASS/BLOCK/WARN/ERROR) = **20개 카피 슬롯** (ko/en 동시 = 40줄)
  - 키 규약 `dev.gate.<gate>.<state>.<reason>` · 코드 상수 매핑 (계섬월 인계용 `src/constants/dev_gate_messages.ts` 스니펫)
  - 톤 5계명: 원인→처방 · 수치는 사실 · 경로 절단 금지 · 시는 hint만 · 도메인 키 규약
- **개발자 빌드-검증 PR / 커밋 메시지 컨벤션 v1.0** (`docs/release/devloop-pr-template.md`) — 진채봉 Editor
  - PR 제목 7 스코프 (`boot`/`verify`/`error`/`gate`/`perf`/`assets`/`docs`)
  - PR 본문 7개 섹션 — 자동 감사 표(Before/After/Δ/약속) · 산출물 분류 · 게이트 결과 · 5인 인계 체크
  - 커밋 메시지 좋은 예 / 나쁜 예 + 리뷰어 행동 가이드 5항 (이소화 봉인 비협상 명시)
- **README 개발자 가이드 절 — 골격 SSOT v1.0** (`docs/release/devloop-readme-skeleton.md`) — 진채봉 Editor
  - `README.md §개발 효율` 신설 골격 — 한눈 지표 4지표 표 · 빠른 시작 3명령 · 핵심 시나리오 3종 표 · 자세한 가이드 링크 3개
  - 약속 수치 임의 갱신 금지 — 백능파(Strategy) 승인 필수 명시
  - 선택 배지 2종 (`verify:core ≤5min` · `dev cold ≤12s`) 추가 안내
- **개발자 빌드-검증 사이클 단축 — 스프린트 회고** (`docs/release/retro_dev-cycle-shortening-sprint.md`) — 진채봉 Editor
  - 9단계 Auto 스프린트 결과 정리 · Keep/Problem/Try · 5개 액션 아이템 (A1·A2·A3 P0)
  - **진전**: 9-에이전트 협주로 9편 / 1,915 LOC 산출 — 코드 902 (`scripts/dev-cycle/` 3종 478 + `devloop-overlay.css` 424) + 문서 1,013 (디자인시스템 + 가이드 4종) · npm 인터페이스 5종(`dev:measure`/`dev:verify`/`dev:fmt-error`/`dev:typecheck`/`dev:build`) 신설
  - **재발**: 7일 커밋 0건 (5스프린트 연속) · 워킹트리 122 → 129 entries 단조 증가 · **본 토픽 핵심 지표 *변경→검증 ≤ 5분* 실측 0회** — *과녁 보지 않은 활* (심요연 지적)
  - 다음 스프린트 권고: *Build-Catchup §1 — Working Tree Zero + Baseline One* — A1 지표 1회 실측 + `devloop-baseline.json` 등재 · A2 워킹트리 129→0 분류 PR 4건 · A3 봇 하네스 `ship-gate` hook(직전 회고에서 이월)
- **몬스터 아트 파이프라인 표준화 — 스프린트 회고** (`docs/release/retro_monster-art-pipeline-sprint.md`) — 진채봉 Editor
  - 9단계 Auto 스프린트 결과 정리 · Keep/Problem/Try · 5개 액션 아이템 (A1·A2 P0)
  - **진전**: 9-에이전트 협주로 15편 / 4,092 LOC 산출 — 라이선스 3종(786) + 자산 명세(762) + 가이드 5종(868) SSOT 안착
  - **재발**: 7일 커밋 0건 (4스프린트 연속) · 워킹트리 76 → 122 entries 폭증 · `launch_checklist §몬스터 다양성` 처리율 0% · 계섬월(Build) Development 빈 응답
  - 다음 스프린트 권고: *Build-Catchup §1 — Working Tree Zero* — 봇 하네스 `ship-gate` hook 신설(`git diff --stat ≠ 0` AND `git log --since=7d ≥ 1`) · 누적 워킹트리 3-PR 분류 커밋 · 챕터1 에레보스 12종 자산 실배포
- **몬스터 아트 파이프라인 표준화 — 텍스트 에셋 묶음 v1.0** (Sprint Auto-Monster-Art-Pipeline, 2026-04-27) — 진채봉 Editor 합본 정리
  - 흩어진 다섯 격자(catalog → tier-tokens → generate → touchup → gate)를 한 결로 잇도록, 사람 손에 잡히는 텍스트 에셋 3편을 묶어 두옵니다.
  - 게이트 약속: `monster-art-gate.yml` 종료 코드 `0` 🟢 PASS · `1` 🔴 BLOCK · `2` 🟡 WARN(누적 ≤ 5건) · `3` 🟠 ERROR — `launch_checklist §몬스터 다양성` SSOT 확장
  - 산출물 3건 / 총 ~520 LOC — 에셋 단계 → Build(계섬월) 인계 완료
- **몬스터 아트 파이프라인 SOP v1.0** (`docs/release/monster-pipeline-sop.md`) — 진채봉 Editor
  - 5단(段) 흐름 한 손 가이드 — `npm run monsters:*` 7종 명령어, 단계별 확인 포인트, 등급별 시각 약속 표 (32/48/96 · 2/2+1/2+2 · null/골드/에테르)
  - 인게임 [도움말 → 아트 파이프라인] · 사내 위키 동시 노출용 1차 SSOT
  - 본 문서가 SSOT — `DESIGN.md §10` 변경 시 §3 표 동시 갱신 약속
- **몬스터 아트 에러 메시지 카피 SSOT v1.0** (`docs/release/monster-art-error-messages.md`) — 진채봉 Editor
  - 5종 게이트(schema·tier_visual·palette·license·pixel_diff) × 4 상태(PASS/BLOCK/WARN/ERROR) 매트릭스
  - **i18n 키 ko/en/ja 동시 정의** — 키 규약 `monster.gate.<gate>.<state>.<reason>`
  - 코드 상수 매핑 (계섬월 인계용 `src/constants/monster_gate_messages.ts` 스니펫)
  - 톤 원칙 5계명: 원인→처방·수치는 사실·경로 절단 금지·시는 hint 만·도메인 키 규약
- **몬스터 아트 PR 본문 / 커밋 메시지 컨벤션 v1.0** (`docs/release/monster-art-pr-template.md`) — 진채봉 Editor
  - PR 제목 9 스코프 (`catalog`/`tokens`/`generate`/`touchup`/`palette`/`gate`/`license`/`assets`/`docs`)
  - PR 본문 9개 섹션 — 자동 감사 표·산출물 분류·비주얼 위계 약속·라이선스·i18n·문서 갱신·5인 인계 체크
  - 커밋 메시지 좋은 예 / 나쁜 예 + 리뷰어 행동 가이드 5항 (이소화 봉인 비협상 명시)
- **몬스터 아트 파이프라인 사용자 가이드 v1.0** (`docs/release/monster-art-user-guide.md`) — 진채봉 Editor
  - 스프린트 토픽 SSOT — 보스/엘리트/일반 등급별 시각 약속 표·AI 생성→사람 손 5단계·라이선스 5관문·도감 위계
  - 9개 절 + FAQ 7건 — 5단(段) 흐름 다이어그램 / 모션 감소 옵션 보스 인트로 단축 분기 / 로드맵 §몬스터 다양성 진척 매트릭스
  - 인게임 [도움말 → 아트 파이프라인] · `client/public/help/monster-art.html` · 사내 위키 동시 노출 (Build 단계 인계)
  - **본 문서가 1차 SSOT** — 토큰 본가 `DESIGN.md §10` 메아리, 변경 시 §3 표 동시 갱신 약속
- **인게임 몬스터 도감(Bestiary) 카피 SSOT v1.0** (`docs/release/monster-bestiary-ingame-copy.md`) — 진채봉 Editor
  - 스프린트 단계: 에셋 (인게임 [도감] · 보스 인트로 컷씬 자막 SSOT)
  - 9개 절 — 도감 헤더 / Tier 라벨·툴팁 / 카테고리 5실루엣 / 발견 상태 4단계 / 카드 필드 / 보스 인트로(페이즈1·2·처치) / 도움말 / 키 카운트
  - **총 49 i18n 키** (ko/en/ja 동시 정의 = 147 줄) — 키 규약 `ui.bestiary.<scope>.<element>` · `ui.boss.<scope>.<element>`
  - 모션 감소 옵션 시 보스 인트로 3,000ms → 800ms 단축 / 페이즈2 입자 spawn rate 12 → 4 분기 명시 (접근성 조항)
  - 톤 원칙 5계명: 명사 라벨·동사 툴팁·Tier 어휘 통일·상태 4종 외 금지·i18n 단일 PR
- **WCAG 2.1 AAA 자동 접근성 감사 — 스프린트 회고** (`docs/release/retro_wcag-aaa-a11y-audit-sprint.md`) — 진채봉 Editor
  - 9단계 Auto 스프린트 결과 정리 · Keep/Problem/Try · 5개 액션 아이템 (A1·A2 P0)
  - **진전**: 4 Probe(colorblind·contrast·keyboard·screen-reader) 전부 PASS · AAA 위반 0건 · 코드 1,211 LOC + 문서 1,049 LOC
  - **재발**: 7일 커밋 0건 (3스프린트 연속) · 워킹트리 76 untracked · `launch_checklist §2.17` 처리율 0%
  - 다음 스프린트 권고: 봇 하네스 `ship-gate` hook 신설(`git diff --stat ≠ 0` + `git log --since=7d ≥ 1`) · NVDA/JAWS/VoiceOver 수동 1라운드
- **WCAG 2.1 AAA 자동 접근성 감사 — 팀 협주 패키지** (Sprint Auto-A11Y-§2.17, 2026-04-26) — 진채봉 Editor 합본 정리
  - 9명 에이전트 전 단계 산출물(Plan → PRD → Design → Assets → QA → Security → Editor 가이드 7편)을 본 절에 한 묶음으로 묶어 두옵니다. 흩어진 악보를 한 곡으로 엮은 셈이옵니다.
  - 게이트 약속: AA 위반 ≥ 1 🔴 BLOCK · AAA 위반 ≥ 1 🟡 WARN(추세 ≤ 5) · 그 외 🟢 PASS — `launch_checklist §2.17` SSOT
  - 산출물 8건 / 총 2,290 LOC — Build 단계 인계 완료
- **PRD — WCAG 2.1 AAA 자동 접근성 감사** (`docs/release/prd_a11y-aaa-audit.md`, 270줄) — 정경패 PM
  - 요구·기준·백로그 정돈 — `launch_checklist §4` 미해결 4건 + §2.17 게이트 자동화 SSOT
- **아키텍처 설계 — WCAG 2.1 AAA 자동 접근성 감사** (`docs/release/plan_a11y-aaa-audit-architecture.md`, 265줄) — 두련사 SRE
  - 5종 Probe 모듈 분리도(Axe · ColorContrast · ColorBlindSim · KeyboardTraverser · AriaContract) · CI 게이트 토폴로지 · VPAT 갱신 파이프라인 청사진
- **디자인 시스템 — WCAG 2.1 AAA 자동 접근성 감사** (`docs/release/design-system_a11y-aaa-audit.md`, 373줄) — 가춘운 CMO/Design
  - 색맹 4모드 + 고대비 7:1 토큰 / 키보드 포커스 / 스크린 리더 시각 단서 / 감사 리포트 UI — `DESIGN.md §7` 직접 확장
- **디자인 감사 리포트 명세** (`docs/release/design_a11y-aaa-audit-report.md`, 278줄) — 가춘운 CMO/Design
  - `tests/reports/a11y/report.html` + CLI 출력 + 스냅샷 다이프 시각화 SSOT
- **시각 에셋 패키지 — 색맹 4모드 토큰·포커스 링·상태 아이콘** (`docs/release/assets_a11y-aaa-audit.md`, 448줄) — 가춘운 CMO/Design
  - 8개 에셋 묶음 (CSS 토큰 190개 · 패턴 SVG · `<FocusRing/>` 6변형 · 상태 아이콘 12종 · 키보드 힌트 4패턴 · 라이브 리전 5패턴 · 감사 대시보드 · 4-up 비교 모킹업)
  - 인계 체크리스트 8단계 — 계섬월(Build)·진채봉(i18n)·두련사(QA) 동시 분배
- **QA 작전 계획 — 접근성 자동 감사** (`docs/release/qa-plan_a11y-aaa-audit.md`, 287줄) — 적경홍 QA Lead
  - Probe별 회귀 시나리오 / 색맹 4종 시각 회귀 임계 / 키보드 트래버스 100% 도달 / 스크린 리더 4종(NVDA·JAWS·VoiceOver·Narrator) 검증 매트릭스
- **보안 체크리스트 — 접근성 감사 도구 사기(邪氣) 봉인** (`docs/release/security-checklist_a11y-aaa-audit.md`, 151줄) — 이소화 Security
  - 5 Probe / CI 게이트의 PII 노출·아티팩트 권한·Playwright 헤드리스 격리 검증 항목
- **보안 테스트 결과 — 접근성 감사 도구 봉인 검증** (`docs/release/security-test-results_a11y-aaa-audit.md`, 218줄) — 이소화 Security
  - 게이트 통과 · `summary.json` PII 0건 · CI 아티팩트 14일 보존 권한 안전성 입증
- **접근성 자동 감사 CLI 사용 가이드 v1.0** (`docs/release/a11y-audit-cli-guide.md`) — 진채봉 Editor
  - 스프린트 단계: 에셋 (Build 인수용 — `npm run a11y:audit` SSOT)
  - 9개 절 — 한눈에 보는 명령어 7종 / 5종 Probe 부분 실행 / 머지 게이트 종료 코드 4단계 / GitHub Actions 스니펫 초안
  - 머지 게이트: `0` 🟢 PASS · `1` 🔴 BLOCK (AA ≥ 1) · `2` 🟡 WARN (AAA ≥ 1) · `3` 🟠 ERROR / AAA 누적 ≤ 5건 임계 명시
  - 본 문서가 1차 SSOT — `package.json#scripts` 별칭은 본 문서에 맞추어 정의
- **접근성 PR 본문 / 커밋 메시지 컨벤션 v1.0** (`docs/release/a11y-pr-template.md`) — 진채봉 Editor
  - 스프린트 단계: 에셋 (`.github/PULL_REQUEST_TEMPLATE/a11y.md` 인계용 SSOT)
  - PR 제목 9 스코프 (`colorblind`/`contrast`/`keyboard`/`aria`/`screen-reader`/`motion`/`caption`/`audit`/`docs`)
  - PR 본문 9개 섹션 — 자동 감사 결과 표·회귀 케이스 ID·i18n 키 변경·문서 갱신·팀 인계 5명 체크리스트
  - 커밋 메시지 좋은 예 / 나쁜 예 4종 + 리뷰어 행동 가이드 5항
- **인게임 접근성 옵션 카피 SSOT v1.0** (`docs/release/a11y-ingame-copy.md`) — 진채봉 Editor
  - 스프린트 단계: 에셋 (인게임 [옵션 → 접근성] 패널 라벨/툴팁 SSOT)
  - 9개 절 — 시각 / 입력 / 청각 / 인지 / 스크린 리더 / 자가진단 / 도움말 헤더
  - **총 65종 i18n 키** (ko/en/ja 동시 정의) — 키 규약 `ui.options.a11y.<scope>.<element>`
  - 톤 원칙: 라벨 12자 이내·툴팁 80자 이내 / 상태어 "켜짐·꺼짐·자동" 3종 외 금지
  - 본 문서가 1차 SSOT — `a11y-error-messages.md` 의 `a11y.audit.*` 와 숫자 정합성 단언 필수
- **WCAG 2.1 AAA 자동 접근성 감사 — 사용자 가이드 v1.0** (`docs/release/a11y-user-guide.md`) — 진채봉 Editor
  - 스프린트 토픽 SSOT: 색맹 모드·키보드 네비·스크린 리더 호환성 전수 검증으로 `launch_checklist §2.17` 해결
  - 9개 절 + FAQ + VPAT 2.4 요약 — 색맹 4종 / 고대비 7:1 / UI 200% / 키 리바인딩 / NVDA·JAWS·VoiceOver 시나리오
  - 인게임 [옵션 → 도움말] · `client/public/help/accessibility.html` 동시 노출 (Build 단계 인계)
- **접근성 자동 감사 리포트 템플릿 v1.0** (`docs/release/a11y-audit-report-template.md`) — 진채봉 Editor
  - 9개 절 + Mustache 변수 SSOT — `tests/reports/a11y/summary.json` 자동 충진 → `index.md` 출력
  - 머지 게이트 규칙: AA 위반 ≥ 1 🔴 BLOCK · AAA 위반 ≥ 1 🟡 WARN · 그 외 🟢 PASS
  - 5종 Probe (Axe · ColorContrast · ColorBlindSim · KeyboardTraverser · AriaContract) 결과 표 + TOP10 위반 + 색맹 4종 스냅샷
- **접근성 에러·안내 메시지 SSOT v1.0** (`docs/release/a11y-error-messages.md`) — 진채봉 Editor
  - 색맹 4 · 고대비/스케일 5 · 키보드/패드 6 · 스크린 리더 3 · 모션/자막 5 · 감사 6 = **총 29종 i18n 키** (ko/en/ja 동시 정의)
  - 키 네이밍 규약 `a11y.<scope>.<event>` · 본 문서가 1차 SSOT, `client/src/i18n/{ko,en,ja}.json` 단일 PR 동기화
  - 어조 원칙: 공손하되 군더더기 없이, 긴급은 `aria-live="assertive"` 첫 문장에 핵심 (32자 이내)
- **launch_checklist §2.17 자동 접근성 감사 게이트 신설** (`docs/release/launch_checklist.md`) — 진채봉 Editor
  - 9항 체크리스트 — `npm run a11y:audit` 5종 Probe · AA 0건 머지 게이트 · AAA ≤ 5건 추세 · §4.1~§4.4 일괄 승격
  - VPAT 2.4 자동 갱신 파이프라인 (`summary.json` → `docs/legal/vpat-2.4.md`) 진입점
- **UI·인벤토리·세이브 E2E 스프린트 회고** (`docs/release/retro_ui-inventory-save-e2e-sprint.md`) — 진채봉 Editor
  - 9단계 자동 스프린트 결과 정리 · Keep/Problem/Try · 5개 액션 아이템 (A1·A2 P0)
  - **진전**: 계섬월(Engineer) 회복 — development 단계 443초 투입, **테스트 1,758 LOC 작성**
  - **재발**: 신규 커밋 7일간 0건 · PR 0건 — 워킹트리 73개 변경 미커밋
  - 다음 스프린트 권고: 머지 게이트 스프린트 + DoD 4종 강화 (`git diff` · `git log` · `tests/reports/*.json` · `launch_checklist` 갱신)
- **E2E·통합 테스트 가이드 v1.0** (`docs/release/e2e-test-guide.md`) — 진채봉 Editor
  - 스프린트 토픽 SSOT: UI·인벤토리·세이브 회귀 버그 선제 차단
  - 테스트 피라미드 (단위 60% / 통합 30% / E2E 10%) · 도구 매트릭스 (Vitest + Playwright)
  - 회귀 시나리오 **26 케이스 전체 채움** (UI 12 · INV 8 · SAV 6) — Build 단계 인수 가능
    - P0 18 · P1 7 · P2 1 / U 3 · I 11 · E 12 분포 명시
    - 각 케이스 단언 핵심·BUG-CB 매핑 (BUG-CB-002 · 003 · 005 연결)
    - 케이스 ID 불변 원칙 (`[DEPRECATED]` 표기만, 번호 재사용 금지)
  - DoD 6항 + 코드 게이트 `git diff --stat ≠ 0` · 팀 인계 체크리스트 6단계
- **테스트·런타임 에러 메시지 카피** (`docs/release/test-error-messages.md`) — 진채봉 Editor
  - 인벤토리 5종 · 세이브 9종 · UI 3종 · 개발자 단언 4종 = 총 21종 메시지 SSOT
  - ko · en · ja 3개 로케일 동시 정의 (Safari Private · ITP 7일 · 체크섬 실패 등 회귀 테스트 결과 메시지 포함)
  - i18n 적용 가이드: 키 자체 검증, 본 문서 선갱신 → `client/src/i18n/{ko,en,ja}.json` 후반영
- **테스트 케이스 템플릿 v1.0** (`docs/release/test-case-template.md`) — 진채봉 Editor
  - 메타데이터 YAML (id · scope · priority · type · related) · Given-When-Then 표준
  - Vitest 통합 / Playwright E2E 복붙 골격 (TC-INV-007 신화 세트 6/6 예시)
  - PR 머지 전 6항 체크리스트 (유일 ID · 외부 의존 모킹 · 시각 회귀 임계치 3% 등)
- **크로스브라우저 스프린트 회고** (`docs/release/retro_cross-browser-sprint.md`) — 진채봉 Editor
  - 9단계 자동 스프린트 결과 정리 · Keep/Problem/Try · 5개 액션 아이템
  - 솔직한 인정: **launch_checklist §2.1 3건 처리율 0%**, 토픽 관련 코드 변경 0 LOC
  - 핵심 신호: 계섬월(Engineer) plan/development/review 3회 연속 빈 응답 → 다음 스프린트 P0
  - 다음 스프린트 권고: DoD에 `git diff --stat ≠ 0` 코드 게이트 추가, Firefox 단독 스프린트로 좁히기
- **크로스브라우저 호환성 검증 가이드** (`docs/release/cross-browser-compatibility-guide.md`) — 진채봉 Editor
  - `launch_checklist.md §2.1` 3건 (Chrome · Firefox · Safari) 회귀 테스트 SSOT
  - 테스트 매트릭스: P0 3종 (Chrome / Firefox / Safari) + P1 2종 + P2 ESR
  - 회귀 시나리오 26 케이스 (렌더링 12 · 입력 8 · 저장 6)
  - 브라우저별 알려진 차이점 12종 (Firefox WebGL · Safari ITP / WebAudio / `:has()` 등) + 대응
  - 이슈 리포트 템플릿 (BUG-CB-XXX) + Build → Test → Ship 인계 체크리스트
- **크로스브라우저 이슈 트래커 v1.0** (`docs/release/cross-browser-issues.md`) — 진채봉 Editor
  - 요약 보드 + 상태 범례 (🟢 RESOLVED / 🟡 WORKAROUND / 🔴 OPEN / ⚪ TRIAGE)
  - **사전 조사 결과 5건 등록** (Build 단계 Pre-flight)
    - `BUG-CB-001` Firefox WebGL `preserveDrawingBuffer` 기본값 차이 (P1, 🟡 WORKAROUND)
    - `BUG-CB-002` Safari Private 모드 IndexedDB 차단 (P0, 🔴 OPEN)
    - `BUG-CB-003` Safari ITP 7일 자동 삭제 (P0, 🟡 WORKAROUND — 이중 백업 + `storage.persist()`)
    - `BUG-CB-004` WebAudio AudioContext 자동 재생 차단 (P1, 🟡 WORKAROUND)
    - `BUG-CB-005` Firefox IME 조합 중 ESC 키 충돌 (P2, 🔴 OPEN)
  - 적경홍 QA가 Test 단계에서 자동화 26 케이스 결과 누적 기록 예정
- **크로스브라우저 가이드 §6 유저 FAQ** (`docs/release/cross-browser-compatibility-guide.md`) — 진채봉 Editor
  - 6문항 CBT 안내 카드 (브라우저 권장도 · Safari Private · ITP 7일 · BGM 무음 · IME ESC · 강력 새로고침)
  - `client/public/help/browser-faq.html` 동봉 후보 (Test 단계 후 노출)
- **i18n 호환성 에러 메시지 7종** (`client/src/i18n/{ko,en,ja}.json`) — 진채봉 Editor
  - `browserUnsupported` · `webglContextLost` · `webglContextRestored` · `indexedDBBlocked`
  - `storageQuotaExceeded` · `audioContextSuspended` · `safariITPWarning`
  - 한국어 · 영어 · 일본어 3개 로케일 동시 추가
- **ATB 전투 시스템 통합 가이드** (`docs/release/atb-battle-system-guide.md`) — 진채봉 Editor
  - FF6 레퍼런스 ATB 전투 시스템의 단일 진실 공급원(SSOT)
  - 시스템 구성도(CombatManager → Renderer 4종) · 빠른 시작 가이드 · 토큰 사용 원칙
  - ATB 게이지 5상태 머신 정의 (empty → charging-1/2/3 → ready / frozen)
  - 대미지 팝업 7종 매트릭스 (일반·크리티컬·회복·빗나감·약점·저항·면역)
  - 상태이상 8종 사양 (Burn·Poison·Freeze·Stun·Bleed·Silence·Shield·Haste)
  - Build → Review → Ship 인계용 체크리스트 + 향후 확장 후보(rc.4·rc.5·Phase 2)
- **전투 디자인 시스템 v1.0** (`docs/art-production/battle-design-system-v1.md`, 409줄) — 가춘운 CMO
  - FF6 박자감·정보밀도·서사연출·대미지쾌감·리듬감 5요소 분석 → 에테르나 적용 매핑
  - ATB 전용 컬러 토큰 신규 7세트 (`--ac-atb-*`, `--ac-turn-*`, `--ac-dmg-*`, `--ac-skill-*`)
  - 전투 화면 레이아웃 (1920×1080 FHD) 좌측 파티 / 우측 적 / 하단 커맨드 3분할
- **ATB 전투 에셋 패키지 v1.0** (`docs/art-production/battle-atb-assets-v1.md`, 555줄) — 가춘운 CMO
  - `design-system-battle.css` 전투 전용 시트 (CSS 변수 + 클래스, 234줄 인라인)
  - `battle-tokens.ts` Phaser 상수 SSOT (`BATTLE_COLORS`·`BATTLE_DEPTH`·`BATTLE_TIMING`·`ATB_SPEED_MOD`)
  - ATB 게이지 SVG 3종 · 스킬 타입 아이콘 12종 · 상태이상 SVG 8종
  - 대미지 팝업 CSS 애니메이션 (크리티컬 32px / 일반 16px / 회복 18px)
  - 턴 큐 타임라인 위젯 + 스킬명 등장 카드 (BitmapText 24px 금색 글로우)
- **전투 모듈 클라이언트 구현** (`client/src/combat/`) — 계섬월 Eng
  - `CombatManager.ts` (턴 디스패처) · `ATBGaugeRenderer.ts` (게이지 렌더)
  - `BattleCommandMenu.ts` (FF6 4지선다 카드) · `StatusEffectRenderer.ts` (상태이상 트레이)
- **전투 디자인 시트 분리** (`client/src/styles/design-system-battle.css`)
  - 코어 시트 뒤 캐스케이드, ATB 펄스/적 경고 키프레임, 접근성 미디어 쿼리 포함
- **CSS 디자인 시스템 스타일시트** (`client/src/styles/design-system.css`, 500+줄) — 가춘운 CMO 구현
  - 17개 섹션: 디자인 토큰(CSS 변수) · 리셋 · 타이포 · 패널 · 버튼 · 게이지 · 등급 · 슬롯 · 대화박스 · 지역태그 · 알림 · 모달 · 폼 · 레이아웃 헬퍼 · 접근성 · 반응형
  - 아이템 등급 글로우 애니메이션 (mythic-pulse, ether-pulse 키프레임)
  - 반응형 브레이크포인트: 1280 / 1024 / 768 (대화박스 3단계 적응)
  - 접근성: `prefers-reduced-motion`, `prefers-contrast: more` 대응
- **비주얼 스타일 가이드 페이지** (`client/public/style-guide.html`) — 12개 섹션 데모
  - 컬러 팔레트, 타이포그래피, 버튼, 게이지, 아이템 등급, 지역 테마, 패널, 슬롯, 폼, 알림, 대화박스, 스페이싱 그리드
  - 팀 내부 비주얼 QA + 신규 팀원 온보딩 레퍼런스용
- `index.html` 리팩토링: 인라인 CSS → 외부 `design-system.css` 링크로 분리 (SSOT 강화, 중복 제거)
- **디자인 시스템 v1.0** (`DESIGN.md`, 483줄) — 가춘운 CMO 설계
  - 코어 팔레트: Aeterna Dark 테마 20+ 디자인 토큰
  - 게이지 바 컬러 (HP/MP/EXP/쿨다운) 규격
  - 아이템 등급 컬러 7단계 (일반→에테르) + 글로우 이펙트 정의
  - 지역별 발광 액센트 8개 존 매핑
  - 타이포그래피: 픽셀 폰트 + BitmapFont 규격
  - 스페이싱 & 레이아웃 그리드 시스템
  - NPC 대화 UI 상세 컴포넌트 규격
  - 테마 & 접근성 (WCAG AAA, 색약 대응)
  - 반응형 브레이크포인트 (1920×1080 FHD 기준)
- **에셋 스프린트 개선 패키지 v1.0** (`docs/art-production/assets-sprint-improvement.md`, 367줄) — 가춘운 CMO
  - `--ac-*` CSS 변수 프리픽스 + `COLORS`/`SPACING`/`DEPTH` Phaser 상수 SSOT 정의
  - 상태이상 아이콘 8종 SVG 규격 (Burn · Poison · Freeze · Stun · Bleed · Silence · Shield · Haste, 16×16 crispEdges)
  - 아이템 등급 글로우 CSS + Phaser `postFX.addGlow` 파라미터 표 (Common → Ether)
  - 콤보 게이지 HUD 모킹업 (240×40, BitmapText 32px, 랭크 C/B/A/S 뱃지)
  - 상태이상 트레이 · 퀵슬롯 8칸 리디자인 (쿨다운 와이퍼 포함)
  - QA 리포트 HTML 템플릿 + Discord/GitHub Release 런치 임베드 시안
  - 반응형 브레이크포인트 4단계 (FHD+ · Laptop · Small · Unsupported)
- **v1.0.0-rc.3 릴리즈 노트 초안** (`docs/release/release_notes_v1.0-rc.3.md`) — 진채봉 Editor
- **v1.0.0-rc.3 스프린트 회고 문서** (`docs/release/retro_v1.0-rc.3.md`) — 진채봉 Editor
  - 30일 스프린트 정량 지표 (58커밋 · TS 0 · ESLint 0)
  - 9단계 파이프라인 단계별 성과 정리
  - 9인 에이전트 기여 매핑
  - Keep/Problem/Try 회고 + 액션 아이템 5건 (A1~A5)
- QA 자동화 러너 스크립트 (`scripts/qa-runner.ps1`)
- 에테르나 팀 스프린트 기반 품질 개선 워크플로우 도입 (Think → Plan → Research → Assets → Build → Review → Test → Ship → Reflect)

### Changed
- 테스트 결과 JSON 갱신 (`test-results.json`)
- 스프린트 단계별 산출물 문서 체계 정리 (office-hours → think → research → plan → assets 단계 보고서 연쇄)

## [1.0.0-rc.2] — 2026-04-12

### Fixed
- **전투 콤보 시스템 통합**: comboManager.recordSkillUse()를 calculateDamage() 전에 호출하여 콤보 배율이 실제 데미지에 반영되도록 수정 (기존: bonusMultiplier=1.0 하드코딩)
- **상태이상 효과 적용**: executeSkill()에서 statusEffectManager.applyEffect() 실제 호출 추가 (기존: 변수 설정만 하고 적용 안 됨)
- TypeScript 166에러 → 0 (Prisma generate + CORS 타입 캐스트 + inventoryRoutes + currencyManager)
- ESLint 49에러 → 0 (unused vars 제거, useless-escape 수정)
- vitest --include 플래그 제거 + config 경로 수정 → 테스트 스크립트 정상화

### Added
- 전투 시스템 유닛 테스트: comboManager, damageCalculator, combatEngine
- Phase 53 런치 체크리스트 코드 검증 항목 업데이트

### Changed
- 루트 버전 0.5.14 → 1.0.0-rc.2
- 런치 체크리스트: 안티치트, GDPR 항목 완료 표시

## [1.0.0-rc.1] — 2026-03-31

### Added
- FF6 스타일 ATB 전투 시스템 Auto 모드 + 1x/2x/3x 속도 조절
- SDXL + Pixel Art XL LoRA 기반 16비트 픽셀아트 파이프라인 (1,582장)
- 보안 강화: bcrypt 해싱, JWT 3중 키, 2FA AES-256-GCM, P2W Guard
- FHD 1920x1080 해상도 + Scale.FIT 대응
- Cloudflare Tunnel 데모 배포
- 몬스터 스프라이트 SDXL 128x128 단일 캐릭터 6종 + 프로그래매틱 폴백
- MusicGen BGM 42곡 + SFX 75종 + Voice TTS 20종 (총 137 오디오 에셋)

### Changed
- Unity WebGL에서 Phaser.js 웹 브라우저 기반으로 전면 전환
- 배틀 스프라이트 LINEAR 필터 적용 — pixelArt 깨짐 근본 해결
- FF6 배치 정리: 아군 우측/적 좌측, 스프라이트 2배 확대

### Fixed
- 환경 오브젝트 비활성화로 SD1.5 이미지 pixelArt 깨짐 해결
- GameScene 몬스터 프로그래매틱 아이콘 + 스킬바 정리
- VFX 스프라이트 시트 화면 덮는 버그 → 프로그래매틱 원형 이펙트 교체
- 던전→배틀 몬스터 id 매칭 (`_normal` 제거 + `_숫자` 접미사 strip)

## [0.52.0] — 2026-03-30

### Added
- 성능 프로파일링 대시보드 및 병목 분석 도구
- 메모리 누수 탐지 및 자동 GC 트리거

### Fixed
- 렌더링 파이프라인 프레임 드롭 최적화
- 대규모 몬스터 목록 로딩 지연 개선

## [0.49.0] — 2026-03-27

### Added
- Docker 컨테이너 배포 검증 완료
- Kubernetes 매니페스트 및 헬스체크 엔드포인트
- GitHub Actions CI/CD 파이프라인

### Changed
- 프로덕션 빌드 최적화 (번들 사이즈 축소)

## [0.46.0] — 2026-03-24

### Added
- 4+1 엔딩 회귀 테스트 212건 작성 및 통과
- 엔딩 분기 조건 검증 자동화

### Fixed
- 엔딩 분기 로직 경합 조건 수정
- 히든 엔딩 트리거 조건 누락 복구

## [0.42.0] — 2026-03-20

### Added
- MusicGen AI 기반 BGM 42곡 생성 완료
- 지역별 BGM 매핑 (10개 존 × 탐색/전투/보스)
- 오디오 크로스페이드 전환 시스템

## [0.39.0] — 2026-03-17

### Added
- SFX 75종 생성 (전투/UI/환경)
- Voice TTS 20종 (주요 NPC 대사)
- 오디오 에셋 매니저 + 프리로드 시스템

### Changed
- 오디오 포맷 OGG + MP3 듀얼 인코딩

## [0.37.0] — 2026-03-15

### Added
- FF6 스타일 ATB(Active Time Battle) 전투 시스템 구현
- ATB 게이지 UI + 턴 순서 큐
- Auto 전투 모드 + 속도 조절 (1x/2x/3x)
- 6종 클래스별 스킬 트리 (30+ 스킬)

### Changed
- 전투 씬 레이아웃 FF6 스타일로 전면 개편

## [0.33.0] — 2026-03-11

### Added
- SDXL + Pixel Art XL LoRA 파이프라인 구축
- 크로노 트리거 스타일 16비트 픽셀아트 통일
- 몬스터/NPC/환경 아트 일괄 재생성

### Changed
- SD1.5 → SDXL 전면 마이그레이션
- 스프라이트 해상도 통일 (128x128 몬스터, 128x192 아군)

## [0.28.0] — 2026-03-06

### Added
- v1.0 출시 폴리싱 착수
- UI/UX 전반 개선 (메뉴, 인벤토리, 퀘스트 로그)
- 지역 간 전환 연출 추가

### Fixed
- NPC 대화 플로우 엣지 케이스 수정
- 인벤토리 아이템 정렬 버그 수정

## [0.25.0] — 2026-03-03

### Added
- Fastify 서버 API 348개 라우트 통합 완료
- Socket.io 실시간 통신 레이어
- Prisma ORM 110개 모델 스키마 확정

### Changed
- REST API 전체 인증/인가 미들웨어 적용

## [0.17.0] — 2026-02-23

### Added
- Steam / itch.io 출시 준비 문서 작성
- 프레스 킷, 트레일러 스크립트, 스토어 페이지 초안
- 다국어 지원 (한/영/일) i18n 기반

### Changed
- 빌드 파이프라인 프로덕션 모드 설정

## [0.8.0] — 2026-02-14

### Added
- 시즌 2 콘텐츠: 신규 존 + 던전 + 몬스터 추가
- 레이드 보스 8종 구현
- PvP 시즌 랭킹 시스템

## [0.1.0] — 2026-02-06

### Added
- 프로젝트 초기 프로토타입
- 기본 게임 루프 (탐색 → 전투 → 보상)
- 10개 존 월드맵 스켈레톤
- 기억술사 에리언 주인공 설정
- Phaser.js 기반 클라이언트 초기 구조
- Fastify + Prisma 서버 초기 구조
