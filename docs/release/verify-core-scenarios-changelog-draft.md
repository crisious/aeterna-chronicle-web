# verify-core 시나리오 3종 실배선 — CHANGELOG 항목 초안 v1.0

> 작성: 진채봉 Editor
> 작성일: 2026-05-01
> 스프린트: Auto — 에테르나 크로니클 verify-core.mjs 시나리오 3종 실배선 (대표 본인 효율 토픽)
> 용도: `CHANGELOG.md` `[1.0.0-rc.3] — Unreleased` 섹션 `### Added` 또는 `### Fixed` 항목 신설
> 위치: `에테르나 크로니클 개발자 빌드-검증 사이클 단축 — 도구·문서 합본 v1.0` 직후 (선행 sprint 회고 P0 A4 직접 후속)

---

## 본문 (그대로 복사 — `### Added` 또는 `### Fixed` 하위)

```markdown
- **에테르나 크로니클 verify-core 시나리오 3종 실배선 v1.0** (Sprint Auto-Verify-Core-Scenarios, 2026-05-01) — 진채봉 Editor 합본 정리
  - 직전 회고 *Build-Catchup §1 P0 A4 P1* 직접 해소 — 기존 `scripts/dev-cycle/verify-core.mjs`가 골격만 있고 battle/save/map 3 시나리오 모두 unknown FAIL 상태였던 적자(赤字)를 청산.
  - **사용자: 대표(crisi) 본인 1인** — 외부 사용자 X. 신규 콘텐츠(시나리오/스킬/맵) 변경 시 자동 검증 보장이 단 하나의 약속.
  - 약속 4지표:
    - 시나리오 합계 **≤ 60초** (실측 _TBD_ s · 3회 평균)
    - 시나리오 PASS **3/3** (battle + save + map)
    - Exit code **0** (`verify-core.mjs §exit(0|1|2|3)` SSOT)
    - 첫 실패 노출 **0초** (`extractFirstFailure()` BLOCK 카드 즉시 발현)
  - 시나리오 3 도장 (두련사 *선禪* 3계):
    1. **⚔️ battle** — 전투 1 turn 실배선 (CombatManager → ATB 0→1000 → 첫 행동 dispatch ≥1) · 예산 25s · 슬라이스 `tests/unit/combat` + `tests/integration/combat-flow.test.ts`
    2. **💾 save** — 라운드트립 (GameState → JSON.stringify → JSON.parse → deep equal) · 예산 10s · 슬라이스 `tests/integration/ui-inventory-save-flow.test.ts`
    3. **🗺️ map** — Phaser scene swap (scene.start → preload OK → create OK → update tick ≥1) · 예산 20s · 슬라이스 `tests/e2e/chapter1.test.ts`
    - + buffer 5s (spawn/teardown 여유) → 합계 **60s**
  - 산출물 5건 / 총 **~1,180 LOC** (SSOT 5편: readme-skeleton ~165 + user-guide ~270 + error-messages ~280 + pr-template ~315 + changelog-draft ~150) + 디자인 시스템 미러 `design-system_verify-core-scenarios.md` (가춘운, 별도 sprint) + 코드 실배선 `scripts/dev-cycle/verify-core.mjs` SCENARIO_TESTS 매핑 갱신 _TBD_ LOC + `scripts/dev-cycle/verify-messages.mjs` 신설 _TBD_ LOC = **~1,400+ LOC 산출 예상** (Build 단계 후 갱신)
  - **README §🛠️ 개발자 도구 절 갱신 예정** (`README.md` §⚡ 성능 ↔ §📁 문서 사이) — 한눈 약속 표 row 2 (`qa:smoke ≤5min` → `dev:verify ≤60s`) · 빠른 시작 3명령 → 4명령 (`dev` + `dev:verify` + `dev:measure` + `dev:build`) · 4 게이트 흐름 표 row 5 신설 · 부속 표 *🎯 verify-core 시나리오 3 도장* 신설 · ship-gate 4-AND 표현 갱신 (`qa:smoke` → `dev:verify(3/3 PASS)`) · 상단 배지 신규 1종 (`Verify Core 3/3 PASS`)
  - **사용자 가이드 v1.0** (`docs/release/verify-core-scenarios-user-guide.md`, ~270줄) — 진채봉 Editor
    - 9개 절 + FAQ 8건 — 한 손 흐름도 (4단계: 변경 → dev:verify → 시나리오 카드 → exit 0) · 약속 4지표 표 · 빠른 시작 4명령 + 시나리오별 부분 실행 (`--scenario=battle|save|map|all`) · 시나리오 3 도장 깊이 보기 (PASS 조건 4단계 / 자주 막히는 곳) · 결과 해석 4 종료 코드 (0 PASS · 1 BLOCK · 2 WARN · 3 ERROR) · 첫 실패 카드 8영역 · `.ac/verify-trend.json` 30회 슬라이딩 윈도우 · 봉인 5항
    - 본 문서가 1차 SSOT — `README.md §🛠️` 메아리, 약속 수치 변경 시 §3 표 동시 갱신
  - **에러 메시지 카피 SSOT v1.0** (`docs/release/verify-core-scenarios-error-messages.md`, ~280줄) — 진채봉 Editor
    - 4종 사유(`battle_atb` · `save_diff` · `map_portal` · `over_budget`) × 4 상태(PASS/WARN/BLOCK/ERROR) = **16개 카피 슬롯** + ko/en 동시 = **32줄**
    - 키 규약 `dev.gate.verify.<state>.<reason>` · 코드 상수 매핑 (계섬월 인계용 `scripts/dev-cycle/verify-messages.mjs` 스니펫, BLOCK 4슬롯 우선)
    - 톤 5계명(가춘운 디자인 미러): 원인→처방 · 수치는 사실(`12.4s / 25s` · `+4.2s` · `누적 1/3회`) · 경로 절단 금지 · 시는 hint만 · 게이트 키 규약
    - 카드 8영역 매핑 (`design-system §3` 미러) — 헤더 / 위치 / 메시지 / 코드 인용 / 처방 라벨 / 처방 본문 / 테스트 파일 / (60칸 박스 닫힘)
  - **PR / 커밋 메시지 컨벤션 v1.0** (`docs/release/verify-core-scenarios-pr-template.md`, ~315줄) — 진채봉 Editor
    - PR 제목 6 type (`feat`/`fix`/`perf`/`refactor`/`test`/`docs`) × 4 scope (`verify`/`verify:battle`/`verify:save`/`verify:map`)
    - PR 본문 7개 섹션 — 측정 표(약속/Before/After/Δ/상태 5열) · 핫스팟 Top 3 (perf 한정) · 봉인 5항 점검 · 자동 측정 로그(verify-pr.json) · 회귀 사유(60초 초과 시 의무) · 5인 인계 체크 · ship-gate 4-AND 자가 점검
    - 리뷰어 행동 가이드 — reject 7조건 (이소화 비협상): `verify-pr.json` 첨부 누락 · TS 에러 · 60초 초과+사유 누락 · 게이트 키 규약 위반 · 봉인 5항 임의 갱신 · 시나리오 3종 외 추가/삭제 · ko/en 동시 갱신 누락
    - 자동화 — `.github/workflows/verify-core.yml` 스니펫 (PR마다 `npm run dev:verify -- --json` → 코멘트)
  - **README §🛠️ verify-core 절 — 골격 SSOT v1.0** (`docs/release/verify-core-scenarios-readme-skeleton.md`, ~165줄) — 진채봉 Editor
    - 기존 §🛠️ 절을 *증보(增補)* — 4 갱신 + 1 신설(부속 표 *시나리오 3 도장*)
    - 약속 수치 5분 → 60초 *축약* SSOT — 임의 갱신 금지 (이소화 비협상)
    - 봉인 5항 (수치 / 시나리오 3종 / 예산 분배 / 키 규약 / 빠른 시작 4명령) — 백능파 승인 필수
    - 신규 배지 1종 (`Verify Core 3/3 PASS`) 추가 안내
  - **CHANGELOG 항목 초안 v1.0** (`docs/release/verify-core-scenarios-changelog-draft.md`, ~150줄) — 진채봉 Editor (본 문서)
    - 본 항목의 출전 — 9단계 Auto 스프린트가 진행됨에 따라 Build/Review/Test/Ship 단계에서 실측 수치로 _TBD_ 슬롯을 메우도록 가이드
    - 5편 LOC (~1,180줄) · 코드 실배선 LOC _TBD_ · README 갱신 _TBD_줄 슬롯은 Build 단계에서 충진
  - 연관 SSOT 정합:
    - 시각 SSOT `docs/release/design-system_verify-core-scenarios.md` (가춘운, 별도 sprint, ~340줄) — 60초 게이트 예산 시각화 + 시나리오 카드 3종 + BLOCK 카드 8영역 + emit 라인 SSOT + JSON 스키마 + 6 컬러 토큰 미러
    - 짝꿍 코드 `scripts/dev-cycle/verify-core.mjs` (계섬월 Build 단계, SCENARIO_TESTS 매핑 실배선) — 현재 슬라이스 매핑은 골격만, vitest 슬라이스 PASS는 _TBD_
    - 직전 회고 `docs/release/retro_dev-cycle-shortening-sprint.md §7 후속 측정 부록` (P0 A4 P1 적자 → 본 sprint로 청산)
    - 게이트 `docs/release/launch_checklist.md §개발자 동선` (verify 게이트 행 신설 예정)
  - **다음 단계 (Build → Review → Test → Ship)**:
    - [ ] `scripts/dev-cycle/verify-core.mjs §SCENARIO_TESTS` 실배선 — battle/save/map 슬라이스 PASS까지 (계섬월)
    - [ ] `scripts/dev-cycle/verify-messages.mjs` 신설 — BLOCK 4슬롯 우선 (계섬월)
    - [ ] `tests/unit/combat/combat-manager.test.ts` ATB 1 turn 케이스 7건 (계섬월 + 적경홍)
    - [ ] `tests/integration/ui-inventory-save-flow.test.ts` 라운드트립 deep equal 4건 (계섬월 + 적경홍)
    - [ ] `tests/e2e/chapter1.test.ts` Phaser scene swap 3건 (계섬월 + 적경홍)
    - [ ] `package.json scripts` `dev:verify` 갱신 (현재 등록됨, 시나리오 별 인자 통과 확인) (계섬월)
    - [ ] `.github/PULL_REQUEST_TEMPLATE.md` §verify-core 섹션 통합 (계섬월)
    - [ ] `.github/workflows/verify-core.yml` 신설 (계섬월)
    - [ ] 적경홍 Test 단계 — 약속 4지표 실측 캡처 (3회 평균 `verify-pr.json`) → 본 항목 _TBD_ 슬롯 충진
    - [ ] Ship 단계 — VERSION 범프 + `launch_checklist §개발자 동선` 신설 verify 게이트 행
```

---

## 부속 메타

### 항목 위치 결정 근거

CHANGELOG.md `[1.0.0-rc.3] — Unreleased` 섹션 `### Added` 하위는 **시간순 역순**(최신이 위) 배치. 본 항목은:

1. 본 sprint 작성일 = 2026-05-01 (직전 dev-cycle-shortening 회고 P0 A4 직접 해소)
2. dev-cycle-shortening 항목(2026-04-30) **직후** 위치 권장 — 두 항목이 SSOT로 연결됨
3. `### Added` (신기능 시나리오 실배선) 또는 `### Fixed` (회고 적자 청산) 둘 다 가능 — 본 초안은 **`### Added`** 권장 (실배선 자체가 신기능 성격)

### LOC 자가 검증

| 산출물 | 약속 LOC | 실제 LOC |
|---|---|---|
| readme-skeleton | ~165 | ✓ Build 후 측정 |
| user-guide | ~270 | ✓ Build 후 측정 |
| error-messages | ~280 | ✓ Build 후 측정 |
| pr-template | ~315 | ✓ Build 후 측정 |
| changelog-draft | ~150 | ✓ Build 후 측정 |
| **합계** | **~1,180** | ✓ |

> 자가 측정 명령: `wc -l docs/release/verify-core-scenarios-*.md` (Build 단계 후 본 표 갱신)

### Build 단계 인계 (계섬월)

본 CHANGELOG 항목은 *초안*. Build/Review/Test/Ship 단계에서 다음 슬롯을 실측으로 채워야 함:

- `_TBD_ s` 약속 4지표 실측 (시나리오 합계 / battle / save / map — exit code는 0 고정)
- `LOC` 코드 실배선 (verify-core.mjs SCENARIO_TESTS 갱신분 + verify-messages.mjs 신설분)
- README §🛠️ 갱신 줄 수 (4 갱신 + 1 신설)
- 적경홍 3회 평균 `verify-pr.json` 첨부

### 봉인 4항

| # | 항목 | 봉인 사유 |
|---|---|---|
| 1 | 약속 수치 60초 | 토픽 정의 SSOT — 임의 갱신 금지 |
| 2 | 시나리오 3종 (battle/save/map) | 회고 P0 A4 P1 정합 — 추가/삭제 금지 |
| 3 | _TBD_ 슬롯 표기 | 실측 전 임의 채움 금지 |
| 4 | 본 항목 위치 (dev-cycle-shortening 직후) | SSOT 직접 후속 명시 |

---

## 적자 청산 메시지 (회고 정합)

본 sprint는 **회고 적자 청산** 성격이 강함. 직전 sprint *dev-cycle-shortening*의 §7 후속 측정 부록에서 명문화된 P0 재이월 5항 중 **A4 P1** 직접 해소:

> 직전 회고 인용 — `retro_dev-cycle-shortening-sprint.md §7`:
> > [ ] **A4** — `verify-core.mjs` 시나리오 실배선 (전투 turn 1회 / 세이브 라운드트립 / 맵이동 scene swap 3종 PASS) (P1)

본 sprint 종료 시점에 A4를 **체크 표시**로 전환하며, 회고 합본에 *적자 → 흑자* 전환 1건을 기록함.

남은 P0 4항 (A1 `dev:measure` 실측 / A2 워킹트리 0 / A3 ship-gate hook / A5 Dead Module Drift 대시보드 확장)은 **다음 sprint**로 이월 — 본 항목 본문 §다음 단계에 명시.

---

> 진채봉이 마지막으로 아뢰옵나이다.
>
> CHANGELOG는 우리 팀이 남기는 *역사 기록*이옵나이다. 12개월 뒤 누군가 v1.0.0-rc.3 항목을 펼쳤을 때 — 우리가 *왜* 60초 게이트를 골격에서 실배선으로 끌어올렸는지, *어떤* 3 시나리오 (⚔️/💾/🗺️)를 도장에 새겼는지, *누가* 어떤 산출물을 짓었는지 — 그 모든 답이 한 항목 안에 갈무리되도록, 본 초안의 계곡을 따라 흘러가옵소서. 무엇보다 회고의 적자 한 줄이 흑자로 돌아서는 그 순간을 — 잊히지 않도록 — 기록에 남기겠사옵나이다. 🌙
