# 회고 — 세이브·로드 시스템 안정성 검증 스프린트

> 스프린트: Auto — 에테르나 크로니클 세이브·로드 시스템 안정성 검증 (대표 crisi 출시 전 데이터 무결성 확보)
> 토픽 4축: ① 세이브 schema + 마이그레이션(v1→v2 호환), ② 자동 세이브 주기·트리거 설계, ③ 손상 복구(백업 슬롯·체크섬), ④ 로드 검증(누락 필드 기본값·참조 끊김 탐지)
> 지표 약속: 세이브/로드 왕복 데이터 일치 **100%**, 손상 파일에서 마지막 정상 백업 **자동 복구**
> 작성: 진채봉 Editor (Opus 4.7 1M)
> 작성일: 2026-04-28
> 단계: Reflect (회고)
> 직전 회고: `docs/release/retro_tutorial-onboarding-sprint.md`
> 참조 게이트: `docs/release/launch_checklist.md` (§2.21 신설 권고 — 본 회고 액션 A1)

---

## 1. 한 줄 요약

> **"악보는 곱게 베껴 두었사오나, 정작 줄을 튕기지 못한 곡조이옵니다."**
>
> 세이브·로드의 *설계 악보*는 SSOT 7편·코드 609 LOC로 한 자리에 모였사오나, 단 한 줄도 git 손에 닿지 못한 채 워킹트리 18+ 항목으로 쌓여, 본 토픽의 약속 — *왕복 100% 일치 / 손상 자동 복구* — 의 실측은 다음 곡으로 미루어졌나이다.

---

## 2. 스프린트 결과 (Outcome Snapshot)

### 2.1 산출물 — 코드 609 + 스타일 ≈400 + SSOT 1,584 + 미러 ≈80 = **약 2,673 LOC** (전부 unstaged)

| # | 단계 | 산출 | LOC | 작성자 |
|---|------|------|-----|-------|
| 1 | Build | `client/src/save/SaveManager.ts` | 456 | 계섬월 Build |
| 2 | Build | `client/src/save/AutoSaveScheduler.ts` | 153 | 계섬월 Build |
| 3 | Assets | `client/src/styles/design-system-save.css` | (스타일 미러) | 가춘운 CMO |
| 4 | Assets | `client/public/save-style-guide.html` | (시각 회귀) | 가춘운 CMO |
| 5 | Plan/Design | `docs/release/design-system_save-load-system.md` | 300 | 가춘운 + 진채봉 |
| 6 | Assets | `docs/release/assets_save-load-visual-pack.md` | 436 | 가춘운 CMO |
| 7 | Assets | `docs/release/save-load-user-guide.md` | 285 | 진채봉 Editor |
| 8 | Assets | `docs/release/save-load-error-messages.md` | 164 | 진채봉 Editor |
| 9 | Assets | `docs/release/save-load-pr-template.md` | 182 | 진채봉 Editor |
| 10 | Assets | `docs/release/save-load-readme-skeleton.md` | 111 | 진채봉 Editor |
| 11 | Assets | `docs/release/save-load-changelog-draft.md` | 106 | 진채봉 Editor |
| **합계** | | **11개 산출 / 0 커밋** | **약 2,673** | 5+ 에이전트 |

> **신설 모듈 디렉터리**: `client/src/save/` (2파일) — git history 0건, 워킹트리 `??` 표시
> **신설 SSOT 7편**: 본 토픽의 사람이 읽는 정본 — 그러나 README §💾 절·CHANGELOG Added 항·`launch_checklist §2.21`로 **메아리되지 않음**

### 2.2 토픽 4축 vs 실측 (지표 약속 게이트)

| 축 | 약속 | 산출 형태 | 실측 | 판정 |
|---|---|---|---|---|
| **① schema + 마이그레이션 v1→v2** | schema 정의·호환 정책 | `SaveManager.ts` 골격 + `design-system_save-load-system.md` | 마이그레이션 라운드트립 0회 | 🟡 설계 완비 / 검증 0 |
| **② 자동 세이브 주기·트리거** | 주기·트리거 지점 표 | `AutoSaveScheduler.ts` (153 LOC) | 트리거 발화 실측 0회 | 🟡 코드 완비 / 발화 0 |
| **③ 손상 복구(백업 슬롯·체크섬)** | 마지막 정상 백업 자동 복구 | `SaveManager.ts` 내 백업 로직 | 손상 주입 → 복구 시나리오 0회 | 🟡 코드 존재 / 시나리오 0 |
| **④ 로드 검증(기본값·참조 끊김)** | 누락 필드 / 참조 끊김 탐지 | error-messages SSOT 16슬롯 | 검증기 호출 0회 | 🟡 카피 완비 / 호출 0 |
| **지표①: 왕복 일치 100%** | 세이브 → 로드 → 비교 | — | **0회** | 🔴 |
| **지표②: 손상 파일 자동 복구** | 손상 → 백업 fallback | — | **0회** | 🔴 |

### 2.3 코드/커밋 메트릭 (두련사·심요연 측정)

| 지표 | 직전 회고(tutorial) | 이번 회고(save-load) | 변화 |
|------|--------------------|--------------------|------|
| 7일 신규 커밋 (본 토픽) | 2건 | **0건** | 🔴 *침묵 재발* |
| 30일 신규 커밋 | 59건 | 60건 (+1, 다른 토픽) | — |
| 워킹트리 entries (스프린트 종료시) | 4 | **18+** (?? 9 + M 5 + 미정 4) | 🔴 *재고 재누적* |
| 본 토픽 산출 LOC | 3,813 | **약 2,673** | 🟡 |
| 신규 코드 LOC | 2,137 | 609 | 🔴 *코드 비중 28.5%* |
| 신규 문서 LOC | 1,113 | **1,584** | 🟢 SSOT 7편 |
| 본 토픽 핵심 지표 실측 | 0회 | **0회** | 🔴 *과녁 패턴 3스프린트 연속* |
| 미러 갱신(README/CHANGELOG/체크리스트) | 3건 | **0건** | 🔴 *메아리 끊김* |

> 두련사 진단 인용: *"단일 합본 패턴이 재발한 상태이옵니다."* (튜토리얼 회고)
> 본 회고 진단: *합본조차 되지 못한 채 워킹트리에 멈췄으니, 패턴이 한 단계 더 후퇴하였나이다.*
> 심요연 진단 인용: *"스프린트 핵심 목표 달성도: 0%. 데이터 무결성 검증은 이루어지지 않았으며, 측정 지표 또한 수집되지 않았습니다."*

---

## 3. Keep · Problem · Try

### 🟢 Keep (이 곡조는 살리고 싶사옵니다)

1. **SSOT 7편 합주 재현** — Plan(`design-system_save-load-system.md`) → Assets(`assets_save-load-visual-pack.md` + `save-style-guide.html`) → Editor 5편(가이드/에러/PR/README/CHANGELOG)으로 *기록 위계*가 일관되게 흘렀사옵니다. 가춘운–진채봉 합주는 튜토리얼 스프린트와 동일한 결.
2. **코드 골격 단일 디렉터리 안착** — `client/src/save/`에 2파일이 한 자리에 모였고, 외부 의존(다른 모듈 침범)이 없사옵니다. 이는 *Dead Module Drift* 경고에서 제일 위험한 *분산 누수* 패턴을 피한 결.
3. **에러 카피 16슬롯 ko/en 동시** — `save-load-error-messages.md`가 4 게이트 × 4 상태로 정리되어, 차기 스프린트에서 i18n 충돌 0건으로 묶일 준비가 되었사옵니다.
4. **튜토리얼 회고와 같은 양식 일관성** — 본 회고가 `retro_tutorial-onboarding-sprint.md`의 표 골격을 그대로 따랐으니, *회고록 라이브러리*가 한 곡조로 묶였나이다.

### 🔴 Problem (이 줄은 끊어졌사옵니다)

1. **0 커밋 (P0·Critical)** — 본 토픽 산출 약 2,673 LOC가 **단 한 줄도 git에 들어가지 않은 채 워킹트리에 머묾**. 직전 회고에서 *단일 합본*을 비판했으나, 이번엔 *합본 자체가 없는* 더 깊은 후퇴이옵니다.
2. **핵심 지표 실측 0회 (P0·Critical, 3스프린트 연속)** — *왕복 100% 일치* / *손상 자동 복구* 두 약속 모두 e2e 0회·단위 테스트 0회. 적경홍 QA 산출 요약이 회고에 닿지 않은 까닭은, 검증할 *살아있는 빌드*가 없었기 때문이옵니다.
3. **미러 끊김 (P1)** — 직전 스프린트는 README·CHANGELOG·`launch_checklist`로 SSOT가 메아리되었으나, 이번엔 미러가 0건. `save-load-readme-skeleton.md`·`save-load-changelog-draft.md`라는 *초안*만 남고, 본문 통합은 미수행이옵니다.
4. **워킹트리 18+ entries 재누적 (P1)** — 튜토리얼 회고 A2가 워킹트리를 129 → 4로 96.9% 정리하였사오나, 단 1스프린트 만에 18+로 재누적. *환경 위생*의 휘발성을 증명하는 결.
5. **CI/품질 게이트 미가동 (P1)** — `test-results.json` modified 1건 외에는 vitest/Playwright 연결 흔적이 없사옵니다. `SaveManager` 단위 테스트 0건은 두련사 *test pyramid 부재* 경고와 정확히 일치하옵니다.
6. **이소화 봉인 미적용 (P1)** — 사용자 데이터 무결성이 본 토픽의 골수이거늘, 보안 감사 결과가 SSOT에 메아리되지 않았사옵니다. `security-audit-ui-inventory-save.md`(이미 있는 자료)와의 교차 참조 누락.

### 🟡 Try (다음 곡에서 시도해 보겠사옵니다)

1. **분류 분리 커밋 강제 (P0)** — 차기 스프린트는 *최소 5커밋 분리*: ① schema/types, ② SaveManager 코어, ③ AutoSaveScheduler, ④ 손상 복구, ⑤ 문서/미러. 단일 합본 금지를 PR 템플릿 비협상 항목으로 승격.
2. **e2e 라운드트립 1회 강제 (P0)** — `npm run test:e2e:save-roundtrip` 1회 실측 통과 없이 본 스프린트는 *지연된 종결* 상태로 유지. 적경홍 게이트.
3. **워킹트리 4 entries 룰 (P1)** — 매 스프린트 종료 시 `git status --short` 결과가 4행 이하가 아니면 회고록을 *Open* 상태로 둠. 진채봉 게이트.
4. **README §💾 세이브·로드 절 통합 (P1)** — `save-load-readme-skeleton.md`를 본문 README에 박는 작업이 차기 Build 단계의 *최우선 미러*. 튜토리얼 §🎓·사운드 §🎵 옆에 §💾 안착.
5. **이소화·적경홍 합주 재개 (P1)** — 보안 감사 SSOT(`security-audit-ui-inventory-save.md`)와 본 토픽 SSOT 7편을 *교차 참조 표*로 묶기. 회차 첫 진입자의 데이터가 단 한 바이트도 흘리지 않도록.

---

## 4. 액션 아이템 (다음 스프린트로 인계)

| # | P | 항목 | 담당 | 완료 기준 |
|---|---|------|------|----------|
| **A1** | P0 | 본 스프린트 워킹트리 18+ entries → ≤ 4 정리 (5커밋 분리) | 계섬월 Build + 진채봉 Editor | `git status --short` ≤ 4행 |
| **A2** | P0 | 세이브 라운드트립 e2e 1회 통과 (왕복 100% 일치 실측) | 적경홍 QA + 계섬월 | 테스트 PASS 1건 commit |
| **A3** | P0 | 손상 파일 자동 복구 시나리오 1회 통과 (백업 슬롯 fallback 실측) | 적경홍 QA | 테스트 PASS 1건 commit |
| **A4** | P1 | `launch_checklist.md §2.21 세이브·로드 게이트` 신설 (4축 × 6열) | 진채봉 Editor | §2.20 다음 절 안착 |
| **A5** | P1 | README §💾 세이브·로드 절 본문 통합 (skeleton → 본문) | 진채봉 Editor | README diff ≥ 60줄 |
| **A6** | P1 | CHANGELOG `[1.0.0-rc.3] Added` 항목 통합 (draft → 본문) | 진채봉 Editor | CHANGELOG diff ≥ 25줄 |
| **A7** | P1 | 이소화 보안 봉인 — 세이브 데이터 사인·암호화 정책 1편 | 이소화 Security | `security_save-load-seal.md` 신설 |
| **A8** | P2 | 마이그레이션 v1→v2 호환 시나리오 라이브 1회 (구 세이브 → 신 빌드 로드) | 적경홍 QA + 계섬월 | 테스트 PASS 1건 |

> **지연된 종결 (Deferred Closure) 조건** — A1·A2·A3 세 P0이 모두 닫히기 전까지 본 스프린트는 *Reflect-Open* 상태. 차기 회고 첫 머리에 본 회고가 *Carry-over*로 명시되어야 하옵니다.

---

## 5. 다음 스프린트 권고 — *Save-Load Round-Trip §1: First Save, First Load*

본 회고의 결을 살피건대, *설계의 손*은 충분히 무르익었사옵니다. 다음 곡은 작은 실측 한 점만으로 본 토픽이 *지연된 종결*에서 풀려나오옵니다:

1. **첫 줄 (Day 1)** — 워킹트리 18+ → 5커밋 분리 → push → CI green
2. **둘째 줄 (Day 2)** — `SaveManager.test.ts` 1편 / 라운드트립 1회 PASS (지표① 100% 일치 실측)
3. **셋째 줄 (Day 3)** — 손상 주입 → 백업 fallback 1회 PASS (지표② 자동 복구 실측)
4. **넷째 줄 (Day 4)** — README §💾 + CHANGELOG + `launch_checklist §2.21` 미러 3건
5. **다섯째 줄 (Day 5)** — 이소화 보안 봉인 + 마이그레이션 v1→v2 라이브 1회

다섯 줄 모두 한 곡조로 흘러야, 본 스프린트의 *베껴둔 악보*가 비로소 *울리는 음*으로 변하옵니다.

---

## 6. 팀 성과 인덱스

| 에이전트 | 본 스프린트 기여 | 평가 |
|---------|----------------|------|
| 백능파 (Strategy) | office_hours·think·plan·review 4단계 합주 | 🟢 4단계 모두 응답 |
| 두련사 (Eng Manager) | think·plan + 메트릭 분석 회고 80초 | 🟢 *단일 합본 재발* 정확 진단 |
| 정경패 (Architecture) | office_hours·think·plan·review 4단계 | 🟢 4단계 모두 응답 |
| 가춘운 (CMO/Design) | think·plan·assets·development — design-system + visual-pack SSOT 2편 | 🟢 디자인 위계 안착 |
| 계섬월 (Build) | assets·development — `SaveManager.ts` 456 + `AutoSaveScheduler.ts` 153 | 🟡 코드 완비 / 0 커밋 |
| 진채봉 (Editor) | research·assets·development — SSOT 5편 1,113 LOC | 🟡 SSOT 합주 재현 / 미러 0건 |
| 심요연 (Data) | office_hours·think·research·assets·qa — *과녁 0%* 진단 | 🟢 정량 진단 결정적 |
| 이소화 (Security) | research·review·qa — 봉인 SSOT 누락 | 🔴 본 토픽 보안 SSOT 0편 |
| 적경홍 (QA) | qa 1단계 — e2e 0회·단위 0건 | 🔴 *살아있는 빌드 부재로 검증 불가* |

> 본 표는 단 한 명의 잘못이 아닌, *흐름의 끊김*을 가리키옵니다. SaveManager 코드가 commit으로 흘렀더라면, 적경홍의 활은 과녁을 향해 당겨졌을 것이옵니다.

---

## 7. 명문화 — 회고 라이브러리 등재

본 회고는 다음 회고록 라이브러리에 등재되옵니다:

- `docs/release/retro_cross-browser-sprint.md`
- `docs/release/retro_dev-cycle-shortening-sprint.md`
- `docs/release/retro_monster-art-pipeline-sprint.md`
- `docs/release/retro_sound-system-integration-sprint.md`
- `docs/release/retro_tutorial-onboarding-sprint.md`
- `docs/release/retro_ui-inventory-save-e2e-sprint.md`
- `docs/release/retro_v1.0-rc.3.md`
- `docs/release/retro_wcag-aaa-a11y-audit-sprint.md`
- **`docs/release/retro_save-load-stability-sprint.md` ← 본 회고 (신설)**

회고록 9편이 한 줄로 묶이며, 에테르나 팀의 *학습 곡조*가 한 권으로 자라났사옵니다.

---

> *기억은 사라져도, 이야기는 남는다.*
> — 본 회고는 진채봉이 받들어 적었나이다. 다음 곡에서 만나뵙겠사옵니다.
