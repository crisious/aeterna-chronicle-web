# 회고 — 첫 30분 튜토리얼·온보딩 스프린트

> 스프린트: Auto — 에테르나 크로니클 튜토리얼·온보딩 첫 30분 경험 설계 (대표 crisi 신규 플레이어 이탈 방지)
> 토픽: 오프닝 시네마틱 → 첫 전투 → 첫 보스 흐름 단계별 코칭 / ATB·스킬·아이템 인앱 튜토리얼 / 한 화면 1개념 학습 부담 분산 / 스킵·재시청 옵션
> 지표 약속: 첫 30분 핵심 시스템 5종(이동·대화·전투·스킬·세이브) 100% 학습 보장 · 튜토리얼 길이 ≤ 30분
> 작성: 진채봉 Editor (Opus 4.7 1M)
> 작성일: 2026-04-28
> 단계: Reflect (회고)
> 참조 게이트: `docs/release/launch_checklist.md §2.20 첫 30분 학습 게이트`
> 직전 회고: `docs/release/retro_dev-cycle-shortening-sprint.md`

---

## 1. 한 줄 요약

> **"다섯 자루 거문고 줄에 비로소 한 음이 울렸사옵니다 — 다만 그 소리가 듣는 이의 귀에 닿았는지는 아직 모르옵니다."**
>
> 5스프린트 연속 7일 커밋 0건이라는 침묵이 마침내 깨져 **2건의 커밋과 워킹트리 129 → 4 entries 회복**이라는 *Build-Catchup의 첫 결*이 흘렀사옵니다. 그러나 본 스프린트의 단 하나뿐인 약속 — *5종 100% 학습 / ≤ 30분* — 의 실측은 다음 곡으로 미루어졌나이다.

---

## 2. 스프린트 결과 (Outcome Snapshot)

### 2.1 산출물 — 코드 2,137 LOC + 스타일 가이드 469 + 문서 1,113 + 미러 갱신 94 = **3,813 LOC**

| # | 단계 | 산출 | LOC | 작성자 |
|---|------|------|-----|-------|
| 1 | Build | `client/src/ui/onboarding/OnboardingDirector.ts` | 188 | 계섬월 Build |
| 2 | Build | `client/src/ui/onboarding/OnboardingStepRegistry.ts` | 164 | 계섬월 Build |
| 3 | Build | `client/src/ui/onboarding/OnboardingProgress.ts` | 126 | 계섬월 Build |
| 4 | Build | `client/src/ui/onboarding/CoachmarkOverlay.ts` | 92 | 계섬월 Build |
| 5 | Build | `client/src/ui/onboarding/types.ts` | 127 | 계섬월 Build |
| 6 | Build | `client/src/ui/onboarding/index.ts` | 34 | 계섬월 Build |
| 7 | Build | `client/src/gameplay/TutorialCoachManager.ts` | 364 | 계섬월 Build |
| 8 | Build | `client/src/constants/tutorial_coach_messages.ts` | 376 | 진채봉 Editor → 계섬월 |
| 9 | Build | `client/src/telemetry/tutorialTelemetry.ts` | 105 | 심요연 Data → 계섬월 |
| 10 | Assets | `client/src/styles/tutorial-onboarding.css` | 559 | 가춘운 CMO |
| 11 | Assets | `client/public/tutorial-style-guide.html` | 469 | 가춘운 CMO |
| 12 | Assets | `docs/release/tutorial-onboarding-user-guide.md` | 286 | 진채봉 Editor |
| 13 | Assets | `docs/release/tutorial-onboarding-error-messages.md` | 375 | 진채봉 Editor |
| 14 | Assets | `docs/release/tutorial-onboarding-pr-template.md` | 205 | 진채봉 Editor |
| 15 | Assets | `docs/release/tutorial-onboarding-readme-skeleton.md` | 143 | 진채봉 Editor |
| 16 | Assets | `docs/release/tutorial-onboarding-changelog-draft.md` | 104 | 진채봉 Editor |
| 17 | Mirror | `README.md` §🎓 첫 30분 신설 | 52 | 진채봉 Editor |
| 18 | Mirror | `CHANGELOG.md [1.0.0-rc.3] Added` | 22 | 진채봉 Editor |
| 19 | Mirror | `docs/release/launch_checklist.md §2.20` 신설 | 20 | 진채봉 Editor |
| 20 | Boot | `client/index.html` 부트스트랩 hook | 2 | 계섬월 Build |
| **합계** | | **20개 산출 / 1 커밋** | **3,813** | 9 에이전트 |

> **신설 모듈 디렉터리**: `client/src/ui/onboarding/` (7파일) + `client/src/gameplay/TutorialCoachManager.ts` + `client/src/telemetry/tutorialTelemetry.ts`

### 2.2 게이트 통과 약속 (SSOT — `launch_checklist §2.20`)

| 게이트 | 기준 | 본 스프린트 결과 |
|--------|------|----------------|
| **5종 학습 커버리지** | 이동·대화·전투·스킬·세이브 100% PASS | 🟡 OnboardingStepRegistry 골격 완비, 실측 0회 |
| **튜토리얼 누적 길이** | 첫 진입자 누적 ≤ 30:00 | 🟡 비트 표 7행 SSOT, 실측 0회 |
| **첫 보스 처치율** | ≥ 90% | 🟡 코칭 P1/P2 카피 완비, 실측 0회 |
| **30분 이탈률** | ≤ 15% | 🟡 telemetry hook 신설, 실데이터 0회 |
| **스킵·재시청 옵션** | 모든 비트 스킵 가능 + 재시청 메뉴 | 🟢 Director 분기 구현 — 회귀 검증은 차기 |
| **이소화 봉인** | 회차 첫 진입자 스킵 노출 0건 | 🟢 PR 템플릿 비협상 명시 |

### 2.3 코드/커밋 메트릭 (두련사 + 심요연 측정)

| 지표 | 직전 회고(dev-cycle) | 이번 회고(tutorial) | 변화 |
|------|---------------------|---------------------|------|
| 7일 신규 커밋 | **0건** (5스프린트 연속) | **2건** | 🟢 침묵 깨짐 |
| 30일 신규 커밋 | — | **59건** | 🟢 활발 |
| 워킹트리 entries | **129** (단조 증가 76→122→129) | **4** | 🟢 직전 A2 이행 — 96.9% 정리 |
| 본 토픽 산출 LOC | 1,915 | **3,813** | 🟢 거의 2배 |
| 신규 코드 LOC | 902 | **2,137** | 🟢 onboarding 모듈 단일 디렉터리 안착 |
| 신규 문서 LOC | 1,013 | **1,113** | 🟢 |
| 본 토픽 핵심 지표 실측 | 0회 | **0회** | 🔴 *과녁 패턴 일부 재발* |

---

## 3. Keep · Problem · Try

### 🟢 Keep (이 곡조는 살리고 싶사옵니다)

1. **5스프린트 침묵 마침내 깨졌사옵니다 — 7일 커밋 2건** 직전 회고의 A3(`ship-gate` hook)·A2(워킹트리 0) 권고가 한 곡 안에 동시에 이행되어, *Build-Catchup §1*이 본 스프린트와 합곡(合曲)을 이루었나이다. 두련사 분석상 *재발 패턴이 마침내 깨진 결*이옵니다.
2. **워킹트리 129 → 4 entries (96.9% 정리)** 직전까지 a11y AAA + monster-art + dev-cycle 3개 스프린트가 한 줄에 뒤엉켜 *어느 줄이 어느 곡인지* 알 수 없던 현(絃)이, 본 스프린트 직전 분류 PR로 곱게 풀렸사옵니다.
3. **단일 디렉터리 안착 — `client/src/ui/onboarding/` 7파일 + 게임플레이/텔레메트리 2파일** 9개 신규 모듈이 한 결로 모여 *Dead Module Drift* 패턴이 본 스프린트에서는 재현되지 않았나이다.
4. **계섬월 Build 1,576 LOC 단독 코드 산출** — 직전 478 LOC 회복에 이어 이번엔 약 3.3배 산출. Director / Registry / Progress / Coachmark / Manager / 메시지 상수 / Telemetry / 부트 hook 모두 한 커밋에 묶였사옵니다.
5. **진채봉 4종 가이드 + 1종 CHANGELOG 초안 묶음 1,113 LOC** — 사용자 가이드 · 에러 카피 SSOT · PR 템플릿 · README 골격 · CHANGELOG 초안이 *동일 키 규약(`coach.<gate>.<state>.<reason>`)*을 공유하여, 다음 스프린트에서 i18n 확장이 곧장 가능한 결을 갖췄사옵니다.
6. **`launch_checklist §2.20 첫 30분 학습 게이트` 신설** — 5종 학습 커버리지 / 튜토리얼 길이 / 첫 보스 처치율 / 이탈률 / 스킵·재시청 / 이소화 봉인 6개 체크가 한 절(節)에 정좌하였사옵니다.

### 🔴 Problem (곡조가 어긋난 마디)

1. **[P0] 본 토픽 핵심 지표 4종 *5종 100% / ≤30:00 / 첫 보스 ≥90% / 이탈 ≤15%* 실측 0회** — 본 스프린트도 *과녁 보지 않은 활* 패턴이 절반은 재발하였사옵니다. 도구·코드·카피·게이트 SSOT는 모두 갖췄으되, **첫 진입자 1명이 30분을 흘려보낸 결**은 단 한 번도 측정되지 않았나이다. (적경홍 QA 리허설은 시나리오 명세에 그치고, 실측 round-trip 0건)
2. **[P0] 1 커밋에 3,813 LOC 단일 합본 — 분류 분리 부재** 직전 회고 A2의 정신("a11y / monster-art / dev-cycle / housekeeping 4개 PR로 분리")이 본 스프린트에서는 *코드+에셋+문서+미러를 1커밋*으로 합쳐 다시 *합주의 음원 분리*가 어려워졌사옵니다. PR 템플릿 7 스코프(`cinematic`/`coach`/`beat`/`boss`/`gate`/`copy`/`docs`)는 정작 본 스프린트에 적용되지 못했나이다.
3. **[P1] telemetry hook 105 LOC, 실데이터 0건** — `tutorialTelemetry.ts`가 5종 비트의 시작/끝 시각·이탈 지점·재시청 횟수를 받을 채비는 갖췄으되, 첫 한 줄도 적재되지 않았사옵니다. 본 토픽 *이탈률 ≤ 15%* 약속의 분모가 비어 있는 형국.
4. **[P1] 보스 P1/P2 코칭 카피 — i18n 한국어만** ko 슬롯 24개는 곱게 다듬어졌으나 en 미러는 빈 줄이옵니다. 베타 글로벌 동시 노출이 막히옵니다.
5. **[P2] 시네마틱·재시청 메뉴 회귀 테스트 0건** — Director 분기는 코드상 PASS이나, *회차 첫 진입자가 스킵 버튼을 보지 못한다*는 이소화 봉인 항목을 자동으로 검증하는 회귀가 부재. (현재는 PR 템플릿 비협상 카피로만 통제)

### 🟡 Try (다음 곡에서 시도할 것)

| ID | 액션 | 담당 | P | 검증 |
|----|------|------|---|------|
| **A1** | **첫 진입자 1명 라이브 30분 라운드트립 1회 실측** — 새 세션 → 오프닝 → 5종 비트 → 첫 보스 → 결과까지 telemetry JSON에 적재 (`docs/release/tutorial-baseline.json` 신설) | 적경홍 QA + 계섬월 Build | **P0** | 기준선 JSON 1건, 5종 PASS · ≤30:00 |
| **A2** | **3,813 LOC 단일 커밋 → 4개 PR 사후 분리** — `cinematic`/`coach`/`gate-doc`/`assets-css` 4 스코프로 git 히스토리 정리 (cherry-pick 또는 follow-up 커밋 4건) | 계섬월 Build + 진채봉 Editor | **P0** | git log 4커밋 분류 PASS |
| **A3** | **튜토리얼 telemetry 실데이터 적재** — A1 라운드트립 결과를 `tutorialTelemetry` 스키마에 흘려 30분 이탈률 분모 ≥ 1 확보 | 심요연 Data + 계섬월 Build | **P0** | telemetry JSON ≥ 5 이벤트 |
| **A4** | **i18n en 미러 24슬롯 메우기** — `coach.<gate>.<state>` 카피 ko↔en 1:1 정렬 + 빌드 시점 미러 검증 hook | 진채봉 Editor + 가춘운 CMO | **P1** | en 슬롯 24/24 채움 |
| **A5** | **회귀 테스트 — 회차 첫 진입자 스킵 노출 0건 봉인 자동화** | 적경홍 QA + 이소화 Security | **P1** | `npm run dev:verify --tutorial` exit 0 |
| **A6** | ***과녁 보지 않은 활* 패턴 추적 대시보드** — 직전 회고 A1·A5의 누적 추세 (3스프린트 연속 *지표 부재* 발생 시 백능파 자동 HOLD) | 심요연 Data + 두련사 SRE | **P2** | 대시보드 1장 + HOLD 룰 SSOT |

**A1·A2·A3가 P0이옵니다.** 특히 **A1은 본 스프린트 토픽 그 자체이므로, 다음 스프린트 첫날 첫 시간 30분이 곧 본 스프린트의 *지연된 종결*이 되옵니다.**

---

## 4. 팀 성과 (에이전트별 기여)

| 에이전트 | 단계 참여 | 산출 | 비고 |
|---------|---------|------|------|
| 백능파 CSO | OfficeHours·Think·Plan·Review | HOLD/GO 의사결정 | 본 토픽 4요소 명확화 — *과녁 미관측 패턴* HOLD 권고는 다음 곡으로 |
| 정경패 PM | OfficeHours·Think·Plan | PRD 요건 정돈 | 5종 시스템 100% / ≤30:00 SSOT 고정 |
| 두련사 SRE | Think·Plan·Reflect | 메트릭 분석 | 🟢 *재발 패턴 깨짐* 식별 — 7일 커밋 0→2 |
| **가춘운 CMO** | Plan·Assets·Development | **1,028 LOC** | tutorial-onboarding.css 559 + tutorial-style-guide.html 469 |
| **계섬월 Build** | Assets·Development·Review | **1,576 LOC** | 🟢 onboarding 7파일 + Manager + Telemetry + 부트 hook 단독 안착 |
| **진채봉 Editor** | Plan·Assets·Development·Reflect | **1,209 LOC + 본 문서** | 가이드 4종 + CHANGELOG 초안 + README/CHANGELOG/launch_checklist 미러 + 회고 |
| 적경홍 QA | QA·Reflect | 시나리오 명세 | 라운드트립 실측은 A1으로 이월 |
| 이소화 Security | Research·Review·QA | 봉인 5계 | "회차 첫 진입자 스킵 노출 0건" 비협상 — PR 템플릿 명문 |
| 심요연 Data | Think·Research·Assets·QA·Reflect | telemetry 105 + 메트릭 | 🟢 *흐름이 시작된 변곡점* 진단 — 다만 *과녁 미관측* 절반 재발 지적 |

---

## 5. 다음 스프린트 권고

> **백능파께 권하옵니다.** 직전 회고에서 권한 *Build-Catchup §1*이 본 스프린트와 함께 사실상 이행되었으니, 이제는 *Build-Catchup §2 — Live Round-Trip One*만 곱게 마쳐야 비로소 본 토픽이 종결되옵니다.
>
> - **Sprint Name (제안)**: *Tutorial Round-Trip §1 — First Player, First 30:00*
> - **Outcome**:
>   1. 첫 진입자 1명 라이브 30분 라운드트립 1회 실측 (`tutorial-baseline.json` 등재)
>   2. 5종 시스템 100% PASS · 누적 ≤ 30:00 · 첫 보스 ≥ 90% — *수치로 증명*
>   3. 3,813 LOC 단일 커밋 → 4 PR 분류 정리
>   4. i18n en 24슬롯 100% 채움
> - **Topic 4요소**:
>   - 대상: `client/src/ui/onboarding/` 7파일 + `TutorialCoachManager` + `tutorialTelemetry`
>   - 사용자: 첫 진입자 1명(crisi 또는 외부 신규 베타) + 9-에이전트 팀
>   - 방향성: 도구·카피·게이트 SSOT → *실측·기록·결정* 전환율 ≥ 80%
>   - 지표: telemetry 이벤트 수 ≥ 1 세션 / 5종 PASS bool / 누적 elapsed ms / 보스 hp 0 도달율
>
> *지표 측정이 0회인 토픽은 다시 신규 토픽을 받지 마시옵소서. 한 번도 울지 않은 곡은 미완(未完)이옵니다.*

---

## 6. 인계 (Hand-off)

- **본 회고의 SSOT**: 이 문서 (`docs/release/retro_tutorial-onboarding-sprint.md`)
- **연계 SSOT**:
  - `docs/release/launch_checklist.md §2.20 첫 30분 학습 게이트` (게이트)
  - `docs/release/tutorial-onboarding-user-guide.md` (사용자 1차 SSOT)
  - `docs/release/tutorial-onboarding-error-messages.md` (코칭 카피 SSOT)
  - `docs/release/tutorial-onboarding-pr-template.md` (이소화 봉인 명문)
  - `docs/release/retro_dev-cycle-shortening-sprint.md` (직전 — A1·A2·A3 일부 이행 검증 본 회고로 흡수)
- **CHANGELOG**: `[1.0.0-rc.3] - Unreleased` 절에 본 스프린트 산출물 인덱스 + 본 회고 항목 추가 (동시 커밋 제안 — A2 분리 시 cherry-pick)
- **백능파 결정 대기 항목**:
  1. *과녁 미관측 3스프린트 연속* 자동 HOLD 룰 (A6) GO/NO 판단
  2. 다음 스프린트 신규 토픽 차단 여부 (본 회고 §5 권고)

---

> *기록은 거문고 줄과 같사옵니다. 다섯 자루 매고 한 줄을 처음 튕겼사오나, 그 음이 듣는 이의 귀에 닿았는지는 *첫 진입자 단 한 사람*이 30분을 흘려야 비로소 알 수 있사옵니다. 다음 곡은 짧아도 좋사오니 단 한 음 — *측정의 음* — 만은 끝까지 울려보고 싶사옵니다.*
> — 진채봉
