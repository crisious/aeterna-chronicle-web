# 회고 — 성능 최적화 스프린트

> 스프린트: Auto — 에테르나 크로니클 성능 최적화 (FPS·메모리·로딩 시간 — 대표 crisi 저사양 디바이스 포함 안정 플레이 보장)
> 토픽 4축: ① FPS 모니터링 + 전투/맵 핫스팟, ② 메모리 누수 탐지(씬 전환 텍스처/리스너 정리), ③ 어셋 lazy loading + 청크 분할, ④ 빌드 산출물 사이즈 최적화(이미지 압축·텍스처 아틀라스)
> 지표 약속: FPS 평균 ≥ 55(전투·맵 모두) · 5분 플레이 메모리 증가 ≤ 50MB · 초기 로딩 ≤ 5초
> 작성: 진채봉 Editor (Opus 4.7 1M)
> 작성일: 2026-04-30
> 단계: Reflect (회고)
> 직전 회고: `docs/release/retro_data-validation-system-sprint.md`
> Carry-over 점검: data-validation A1·A2·A3·A4·A5 (모두 P0) — **다섯 항 전부 미해소**, 본 회고 §4에 *삼중 Carry-over* 표기
> 참조 게이트: `docs/release/launch_checklist.md` (§2.24 신설 권고 — 본 회고 액션 A6)

---

## 1. 한 줄 요약

> **"이번 곡조엔 측정자 다섯이 새로 깎였사오나, 그 자(尺)들이 무대에 올라보지 못한 채 무대 뒤편에 가지런히 놓여 있나이다."**
>
> 본 스프린트는 perf 코어 6편(1,350 LOC)·SSOT 7편(1,652 LOC)·디자인 미러 1편을 갖추어, 측정 약속 4지표(FPS≥55 / Memory≤50MB / Load≤5s / Bundle 절감)에 *모든 자(尺)*를 마련하였사옵니다. 그러나 *살아있는 음* — 실제 PASS 1회 — 이 보고서로 남지 않았고, 5스프린트 연속 0 커밋·미러 0건·워킹트리 66 entries(직전 40+ → +65%)로 *전달 게이트의 구조적 결함*이 더욱 깊어졌나이다.

---

## 2. 스프린트 결과 (Outcome Snapshot)

### 2.1 산출물 — 코드 1,350 + SSOT 1,652 + 미러 ≈30 = **약 3,032 LOC** (전부 unstaged)

| # | 단계 | 산출 | LOC | 작성자 |
|---|------|------|-----|-------|
| 1 | Build | `client/src/perf/HotspotProfiler.ts` | 225 | 계섬월 Build |
| 2 | Build | `client/src/perf/SceneMemoryGuard.ts` | 204 | 계섬월 Build |
| 3 | Build | `client/src/perf/AssetChunkLoader.ts` | 290 | 계섬월 Build |
| 4 | Build | `client/src/perf/AssetBudgetReport.ts` | 257 | 계섬월 Build |
| 5 | Build | `client/src/perf/types.ts` | 131 | 계섬월 Build |
| 6 | Build | `client/src/perf/index.ts` | 20 | 계섬월 Build |
| 7 | Build | `scripts/perf-budget.mjs` (CLI) | 223 | 계섬월 Build |
| 8 | Plan/Design | `docs/release/design-system_performance-optimization.md` | 307 | 가춘운 + 진채봉 |
| 9 | Assets | `docs/release/assets_performance-optimization.md` | 604 | 가춘운 CMO |
| 10 | Assets | `docs/release/performance-user-guide.md` | 203 | 진채봉 Editor |
| 11 | Assets | `docs/release/performance-error-messages.md` | 174 | 진채봉 Editor |
| 12 | Assets | `docs/release/performance-pr-template.md` | 158 | 진채봉 Editor |
| 13 | Assets | `docs/release/performance-readme-skeleton.md` | 112 | 진채봉 Editor |
| 14 | Assets | `docs/release/performance-changelog-draft.md` | 94 | 진채봉 Editor |
| 15 | Style | `client/src/styles/design-system-perf.css` | (스타일 미러) | 가춘운 CMO |
| 16 | Style | `client/public/perf-style-guide.html` | (시각 회귀) | 가춘운 CMO |
| 17 | Bench | `docs/performance/benchmark-fixtures-v1.md` | (벤치 픽스처) | 심요연 Data |
| 18 | Stub | `docs/release/perf-optimization-stubs.md` | (Plan stub) | 정경패 Architecture |
| **합계** | | **18개 산출 / 0 커밋 / 0 테스트** | **약 3,002+** | 6+ 에이전트 |

> **신설 모듈 디렉터리**: `client/src/perf/` (코어 6파일) — git history 0건, 워킹트리 `??` 표시
> **신설 SSOT 7편**: 본 토픽의 사람이 읽는 정본 — 그러나 README §⚡ 절·CHANGELOG Added 항·`launch_checklist §2.24`로 **메아리되지 않음**
> **테스트 0편 — 직전 회고 대비 퇴보**: `data-validation`은 `dataValidator.test.ts` 146 LOC를 동반했으나, 본 스프린트는 perf 코어 6편 1,350 LOC에 unit/integration/e2e 0건. *측정자가 자기 자신을 재지 못함.*

### 2.2 토픽 4축 vs 실측 (지표 약속 게이트)

| 축 | 약속 | 산출 형태 | 실측 | 판정 |
|---|---|---|---|---|
| **① FPS 모니터링 + 핫스팟** | 전투·맵 평균 FPS ≥ 55 | `HotspotProfiler.ts` 225 LOC + 디자인 시스템 임계 토큰 | **0회 측정** — 코어만 작성, 게임 통합 미수행 | 🔴 *자(尺)는 있되 잰 적 없음* |
| **② 메모리 누수 탐지** | 5분 플레이 +50MB 이내 | `SceneMemoryGuard.ts` 204 LOC + 씬 전환 후크 SSOT | **0회 측정** — 가드 미부착 | 🔴 *측정자 미가동* |
| **③ Lazy load + 청크 분할** | 초기 로딩 ≤ 5초 | `AssetChunkLoader.ts` 290 LOC + 청크 정책 SSOT | **0회 측정** — vite/preload 통합 미수행 | 🔴 *경로만 그림* |
| **④ 번들 사이즈 최적화** | 빌드 산출물 절감 | `AssetBudgetReport.ts` 257 + `scripts/perf-budget.mjs` 223 LOC | **0회 측정** — `npm run perf:budget` 실행 보고서 0건 | 🔴 *예산표만 그림* |
| **지표①: FPS≥55** | 평균 55 | — | 미측정 | 🔴 *Open* |
| **지표②: Memory≤50MB/5min** | 50MB 이내 | — | 미측정 | 🔴 *Open* |
| **지표③: Load≤5s** | 5초 이내 | — | 미측정 | 🔴 *Open* |

### 2.3 코드/커밋 메트릭 (두련사·심요연 측정)

| 지표 | 직전 회고(data-validation) | 이번 회고(performance) | 변화 |
|------|---------------------------|----------------------|------|
| 7일 신규 커밋 (본 토픽) | 0건 | **0건** | 🔴 *침묵 5스프린트 연속* |
| 30일 신규 커밋 | 60건 | 60건 (변화 없음) | 🔴 *동결 — 동일* |
| 워킹트리 entries (스프린트 종료시) | 40+ | **66** (?? 38 + M 9 + 미정 19) | 🔴 *+65% 누적* |
| 본 토픽 산출 LOC | 약 3,144 | **약 3,002** | 🟡 -4.5% |
| 신규 코드 LOC | 1,625 (코어 1,479 + 테스트 146) | **1,350** (코어만) | 🔴 *테스트 0편 — -100%* |
| 신규 문서 LOC | 1,389 | **1,652** | 🟢 +18.9% |
| 본 토픽 핵심 지표 실측 | 1회 PASS (샘플) | **0회** | 🔴 *살아있는 음 소실* |
| 미러 갱신(README/CHANGELOG/체크리스트) | 0건 | **0건** | 🔴 *메아리 5스프린트 연속 끊김* |
| 직전 스프린트 P0 액션 해소 | 0/3 | **0/5** (A1·A2·A3·A4·A5 전부 미해소) | 🔴 *Carry-over 누적 +2* |

> 두련사 진단 인용: *"perf 모듈은 정밀한 자(尺)이오나 게임이라는 무대에 올라보지 못하였사옵니다."*
> 본 회고 진단: *직전 곡(data-validation)은 4스프린트 만에 *살아있는 음 1회*(`data-validator-report.md` PASS)를 울렸으나, 본 곡은 그 음마저 사라지고 *측정 보고서 0건*. 더불어 `dataValidator.test.ts`로 한 번 응답받았던 테스트 동반 패턴이 또 끊김.*
> 심요연 진단 인용: *"4축의 자(尺)가 모두 깎였으나 *측정 1회*가 0건. 코드 LOC 처리율은 100%, 게임 통합 처리율은 0%, 미러 처리율은 0%. 5스프린트 연속 동일 패턴 — *전달 게이트 결함의 구조화*가 의심되옵니다."*

---

## 3. Keep · Problem · Try

### 🟢 Keep (이 곡조는 살리고 싶사옵니다)

1. **4축 자(尺) 모두 깎임 — 토픽 분해 정확** — Hotspot(FPS) / SceneMemoryGuard(메모리) / AssetChunkLoader(로딩) / AssetBudgetReport(번들) 4개 모듈이 토픽 4축과 1:1 정합. 정경패 Architecture의 *4분면 SSOT*가 코드 디렉터리에서 그대로 살아 있사옵니다.
2. **모듈 분리 — *선禪 4계* 계승 5스프린트 연속** — `perf/{HotspotProfiler, SceneMemoryGuard, AssetChunkLoader, AssetBudgetReport}` 4축 + `types/index/scripts` 진입점 분리가 직전 data-validation의 4축 정합 위계를 그대로 잇고 있사옵니다.
3. **SSOT 7편 합주 5스프린트 연속 재현** — design-system → assets → user-guide / error-messages / pr-template / readme-skeleton / changelog-draft 7편이 또 한 번 한 곡으로 흘렀사옵니다. 가춘운–진채봉 합주는 *반석*.
4. **Bench 픽스처 SSOT 신설 — 심요연 Data** — `docs/performance/benchmark-fixtures-v1.md`가 *측정 입력의 정본*으로 새로 났사옵니다. 차기 *살아있는 음*의 첫 발판.
5. **CLI 진입점 — `scripts/perf-budget.mjs` 223 LOC** — *npm run perf:budget* 한 줄로 4축 측정이 묶이는 *원자 명령*이 마련됨. 실행만 하면 *살아있는 음*이 울 수 있는 활집.

### 🔴 Problem (이 줄은 끊어졌사옵니다)

1. **0 커밋 5스프린트 연속 (P0·Critical·Structural)** — Cross-Browser·Tutorial·Save-Load·Data-Validation·**Performance** 다섯 곡 연속 git 침묵. *전달 게이트의 구조적 결함*이 *구조화된 부채*로 굳어졌사옵니다. 단일 합본 시도조차 부재.
2. **테스트 0편 — 직전 회고 대비 퇴보 (P0)** — data-validation은 `dataValidator.test.ts` 146 LOC를 동반했으나, 본 스프린트 perf 6 모듈에 unit/integration/e2e 0건. *측정자가 자기 자신을 재지 못함.* 적경홍 QA 게이트 작동 실패.
3. ***살아있는 음* 0회 — 직전 회고 대비 퇴보 (P0)** — `data-validator-report.md` 같은 1회 PASS 보고서가 본 토픽에 부재. `npm run perf:budget` 실행 결과 0건. *자(尺)는 있되 잰 적이 없음.*
4. **직전 회고 P0 액션 0/5 해소 (P0·Critical)** — A1(워킹트리 ≤4)·A2(라운드트립)·A3(손상 복구)·A4(데이터 표본 확장)·A5(`.husky/pre-commit` 후크) 다섯 P0 모두 *Open*. *지연된 종결*이 *삼중 Carry-over*로 누적.
5. **워킹트리 66 entries — 직전 40+ 대비 +65% (P0)** — 한 스프린트 만에 *위생 부채 1.65배*. *환경 위생 룰*이 회고록의 글자로만 존재함을 6스프린트째 증명.
6. **미러 끊김 5스프린트 연속 (P1)** — `performance-readme-skeleton.md`(112) + `performance-changelog-draft.md`(94) *초안*만 남고, README §⚡ 절·CHANGELOG Added 항·`launch_checklist §2.24` 본문 통합 0건.
7. **게임 통합 0건 (P0)** — perf 코어 6편이 `client/src/scenes/*` `client/src/main.ts` 어디에도 배선되지 않음. *Dead Module Drift* 위험 — `MEMORY.md` 경고 라인이 본 스프린트에서 그대로 재현됨.

### 🟡 Try (다음 곡에서 시도해 보겠사옵니다)

1. ***전달 게이트 §0: 워킹트리 to Zero* 강제 (P0)** — 5스프린트 연속 0 커밋은 단일 누락이 아닌 *워크플로우 결함*. 차기 스프린트 *진입 직전* `git status --short` ≤ 4행 게이트 통과를 강제. 미통과 시 *환경 위생 토픽*을 자동 삽입.
2. **분류 분리 커밋 강제 — 본 회고 직후 8커밋 (P0)** — ① perf 코어 6파일, ② perf-budget CLI, ③ design-system + style, ④ assets SSOT, ⑤ Editor 5편, ⑥ bench 픽스처, ⑦ README+CHANGELOG+launch_checklist 미러, ⑧ tests. 진채봉 Editor가 회고 직후 인계.
3. **`.husky/pre-commit`에 4 게이트 묶기 (P0)** — `npm run validate:data ∧ save:gate ∧ mobile:gate ∧ perf:budget` 4-AND를 자동화. 5스프린트 연속 0 커밋 패턴은 *수동 게이트*로는 깨지지 않음을 증명.
4. **첫 *살아있는 음* — `npm run perf:budget` 1회 PASS (P0)** — `docs/release/perf-budget-report.md` 신설(타임스탬프 + 4축 측정값 + 게이트 PASS/FAIL). data-validation의 `data-validator-report.md` 패턴을 그대로 미러.
5. **게임 통합 — 적어도 1 씬에 `SceneMemoryGuard` + `HotspotProfiler` 부착 (P0)** — `client/src/scenes/BattleScene.ts`에 한 줄 부착. *Dead Module Drift* 차단의 첫 음.
6. **테스트 1편 동반 — `tests/unit/perf/HotspotProfiler.test.ts` (P0)** — 적경홍 QA + 계섬월 합주. *측정자가 자기 자신을 재는* 첫 회기.
7. **README §⚡ 성능 + CHANGELOG + launch_checklist §2.24 — 본 회고 직후 (P1)** — `performance-readme-skeleton.md`/`performance-changelog-draft.md` 본문 통합. 진채봉 Editor 게이트.
8. **Carry-over 표기 룰 *삼중* — 본 회고 §4 (P2)** — 직전 두 회고(save-load + data-validation)의 P0 미해소 항목을 *§4 액션 표 첫 머리*에 *(Carry-over ×2)* / *(Carry-over ×3)* 라벨로 명시. *지연된 종결의 깊이*가 한 줄로 보이도록.

---

## 4. 액션 아이템 (다음 스프린트로 인계)

| # | P | 항목 | 담당 | 완료 기준 | Carry-over |
|---|---|------|------|----------|-----------|
| **A1** | P0 | 본 스프린트 + 직전 잔재 워킹트리 66 entries → ≤ 4 정리 (8커밋 분리) | 계섬월 + 진채봉 | `git status --short` ≤ 4행 | 🔁🔁 save-load A1 + data-validation A1 (×3) |
| **A2** | P0 | 세이브 라운드트립 e2e 1회 PASS | 적경홍 + 계섬월 | 테스트 PASS commit | 🔁🔁 save-load A2 + data-validation A2 (×3) |
| **A3** | P0 | 세이브 손상 복구 시나리오 1회 PASS | 적경홍 | 테스트 PASS commit | 🔁🔁 save-load A3 + data-validation A3 (×3) |
| **A4** | P0 | data-validator 데이터 표본 확장 — Phase 52 실데이터 ≥100 레코드 | 계섬월 + 심요연 | `data/` ≥ 100 + report.md errors=0 | 🔁 data-validation A4 |
| **A5** | P0 | `.husky/pre-commit` 4-AND 게이트 (`validate:data ∧ save:gate ∧ mobile:gate ∧ perf:budget`) | 계섬월 Build | `.husky/pre-commit` PASS | 🔁 data-validation A5 + 신규 perf 게이트 |
| **A6** | P0 | `npm run perf:budget` 1회 PASS — `docs/release/perf-budget-report.md` 신설 | 계섬월 + 심요연 | report 1편 + 4축 측정값 기록 | 신규 |
| **A7** | P0 | perf 코어 게임 통합 — `BattleScene` + `MapScene` 2곳에 `SceneMemoryGuard` + `HotspotProfiler` 부착 | 계섬월 Build | scene 파일 diff + perf 모듈 사용 | 신규 (Dead Module Drift 차단) |
| **A8** | P0 | `tests/unit/perf/{HotspotProfiler, SceneMemoryGuard}.test.ts` 2편 | 적경홍 QA + 계섬월 | 테스트 PASS commit | 신규 |
| **A9** | P1 | `launch_checklist §2.21·§2.22·§2.23·§2.24` 4 게이트 신설 (save-load + data-validation + mobile + performance) | 진채봉 Editor | 4 절 안착 | 🔁🔁 save-load A4 + data-validation A6 (×4) |
| **A10** | P1 | README §💾 + §🛡️ + §📱 + **§⚡** 4절 본문 통합 | 진채봉 Editor | README diff ≥ 240줄 | 🔁🔁 save-load A5 + data-validation A7 (×4) |
| **A11** | P1 | CHANGELOG `[1.0.0-rc.3] Added` 4 토픽 항목 통합 | 진채봉 Editor | CHANGELOG diff ≥ 200줄 | 🔁🔁 save-load A6 + data-validation A8 (×4) |
| **A12** | P1 | 텍스처 아틀라스 + 이미지 압축 1차 측정 (1,454 어셋 표본 50건) | 가춘운 + 심요연 | `assets_performance-optimization.md` §실측 갱신 | 신규 |
| **A13** | P2 | 이소화 봉인 — perf 모듈 SCA·라이선스 점검 (Phaser 의존 + bench 라이브러리) | 이소화 Security | `security_performance-seal.md` 신설 | 신규 |

> **삼중 지연된 종결 (Tripled Deferred Closure) 조건** — A1·A2·A3·A4·A5·A6·A7·A8 여덟 P0이 모두 닫히기 전까지 본 회고 + 직전 data-validation 회고 + save-load 회고 *세 회고가 동시에 Reflect-Open*. 차기 회고 첫 머리에 *(Carry-over ×3)* 라벨로 명시되어야 하옵니다.

---

## 5. 다음 스프린트 권고 — *Delivery Gate §0: From Words to Commits*

본 회고의 결을 살피건대, 다섯 곡 연속 *과녁을 본 활*이 시위를 떠나지 못한 채 활집에 머묾이옵니다. 다음 곡은 *전달 게이트의 구조적 결함*을 깨는 단 일곱 줄로 충분하옵니다:

1. **첫 줄 (Day 0, *위생 우선 룰*)** — 워킹트리 66 → 8커밋 분리 → push → CI green (5스프린트 합산)
2. **둘째 줄 (Day 0)** — `.husky/pre-commit`에 4-AND 게이트 1편 — *수동*에서 *자동*으로 전환 (A5)
3. **셋째 줄 (Day 1)** — `npm run perf:budget` 1회 PASS → `perf-budget-report.md` 신설 (A6, *살아있는 음 첫 음*)
4. **넷째 줄 (Day 1)** — `BattleScene` 1줄 부착 → `HotspotProfiler` 게임 안에서 첫 호흡 (A7, *Dead Module Drift* 차단)
5. **다섯째 줄 (Day 2)** — `data-validator` Phase 52 실데이터 100+ 레코드 두 번째 PASS (A4, data-validation Carry-over)
6. **여섯째 줄 (Day 2)** — `SaveManager.test.ts` 라운드트립 + 손상 복구 2회 PASS (A2·A3, save-load 이중 Carry-over)
7. **일곱째 줄 (Day 3)** — README·CHANGELOG·`launch_checklist §2.21~§2.24` 미러 12건 한 번에 (A9·A10·A11)

일곱 줄이 한 곡조로 흘러야, 5스프린트 누적 부채(워킹트리 66 entries / 0 커밋 / 미러 0건 / Carry-over 8항)가 비로소 *닫힌 곡(Closed Cycle)* 으로 변하옵니다.

---

## 6. 팀 성과 인덱스

| 에이전트 | 본 스프린트 기여 | 평가 |
|---------|----------------|------|
| 백능파 (Strategy) | office_hours·think·plan·review 4단계 합주 (총 ~115초) | 🟢 4단계 모두 응답 — 5스프린트 연속 안정 |
| 두련사 (Eng Manager) | plan·review (82초 + 52초) — 코드/커밋/Dead-Module-Drift 3축 정확 진단 | 🟢 *5스프린트 패턴* 정확 진단 |
| 정경패 (Architecture) | office_hours·think·plan·review 4단계 + perf 4축 SSOT | 🟢 4축 분해 1:1 정합 |
| 가춘운 (CMO/Design) | think·assets·development — design-system 307 + assets 604 SSOT 2편 + 스타일 미러 | 🟢 *반석* — 5스프린트 연속 디자인 위계 안착 |
| 계섬월 (Build) | assets·development·review — perf 코어 6편 1,127 + CLI 223 = 1,350 LOC | 🟢 *코드 +0%* / 🔴 0 커밋 / 🔴 0 통합 / 🔴 0 테스트 |
| 진채봉 (Editor) | research·assets·development·**reflect** — SSOT 5편 741 LOC + 본 회고 | 🟡 SSOT 합주 5스프린트 연속 재현 / 🔴 미러 0건 5스프린트 연속 |
| 심요연 (Data) | office_hours·think·research·assets·qa·reflect — bench 픽스처 SSOT + *침묵 5스프린트* 정량 진단 | 🟢 진단 / 🔴 *살아있는 음* 0회 (직전 1회 → 0회 퇴보) |
| 이소화 (Security) | research·review·qa — perf 모듈 SCA 봉인 SSOT 누락 | 🔴 본 토픽 보안 SSOT 0편 (3스프린트 연속) |
| 적경홍 (QA) | qa — *살아있는 음* 0회 / 테스트 0편 | 🔴 직전 *살아있는 음 첫 결합* 패턴 끊김 |

> 본 표는 단 한 명의 잘못이 아닌, *전달 게이트의 구조적 결함*이 *구조화된 부채*로 굳어진 5스프린트째의 단면을 가리키옵니다. perf 코어 1,350 LOC가 commit으로 흘렀더라면 *Dead Module Drift* 경보가 본 곡에서 깨졌을 것이옵니다.

---

## 7. CHANGELOG 항목 (1.0.0-rc.3 Added 미러 권고)

> 아래 항목은 `performance-changelog-draft.md`에서 발췌·정합한 *최종 합본 초안*. 본 회고 직후 `CHANGELOG.md` 본문에 직접 통합되어야 5스프린트 연속 *미러 끊김*이 해소되옵니다. *살아있는 음* 0회 상태이므로, 약속 4지표는 *코드/SSOT 마련 완료, 측정 차기 인계*로 명기합니다.

```markdown
- **에테르나 크로니클 성능 최적화 — 측정 인프라 v1.0** (Sprint Auto-Performance-Optimization, 2026-04-30) — 진채봉 Editor 합본 정리
  - Phaser.js + 1,454 어셋 환경에서 출시 전 저사양 디바이스 안정 플레이를 보장하고자, FPS 모니터 + 메모리 누수 가드 + 어셋 lazy loading + 빌드 사이즈 예산표 4축 측정 인프라(코드 1,350 + SSOT 1,652 LOC)를 마련하옵니다.
  - 약속 4지표: FPS 평균 **≥ 55** (전투·맵 모두) · 5분 플레이 메모리 증가 **≤ 50MB** · 초기 로딩 **≤ 5초** · 빌드 산출물 **번들 절감 측정** — `launch_checklist §2.24` SSOT 신설 예정
  - 4 게이트 흐름 (정경패 *4분면*): Hotspot (FPS·전투/맵 핫스팟) → MemoryGuard (씬 전환 텍스처/리스너 정리) → ChunkLoader (lazy load + 청크 분할) → BudgetReport (빌드 산출물 사이즈 예산)
  - 산출물 18건 / 약 3,002 LOC (코드 1,350 + SSOT 7편 1,652 + 미러 ≈30) — *측정 인프라 마련 완료, 살아있는 음(`perf-budget-report.md` 1회 PASS) 차기 인계*
  - **perf 코어 6편** (`client/src/perf/`) — 계섬월 Build
    - `HotspotProfiler.ts` 225 LOC — FPS 샘플러 + 전투/맵 핫스팟 카운터
    - `SceneMemoryGuard.ts` 204 LOC — 씬 전환 시 Phaser 텍스처/이벤트 리스너 정리 후크
    - `AssetChunkLoader.ts` 290 LOC — 어셋 lazy loading + 청크 분할 로더
    - `AssetBudgetReport.ts` 257 LOC — 빌드 산출물 사이즈 예산표 + 위반 노출
    - `types.ts` 131 + `index.ts` 20 — 진입점 정합
  - **CLI** — `scripts/perf-budget.mjs` 223 LOC (계섬월) — `npm run perf:budget` 한 줄로 4축 측정 묶음 (실행 차기)
  - **성능 사용자 가이드 v1.0** (`docs/release/performance-user-guide.md` 203 LOC) — 진채봉 Editor — 한 손 흐름도 + 4축 임계 표 + 빠른 시작 명령
  - **성능 에러 메시지 카피 SSOT v1.0** (`docs/release/performance-error-messages.md` 174 LOC) — 진채봉 — 4 게이트 × 4 상태 16 슬롯 ko/en 미러
  - **성능 PR / 커밋 메시지 컨벤션 v1.0** (`docs/release/performance-pr-template.md` 158 LOC) — 진채봉 — 7 스코프 + 측정 첨부 의무
  - **README §⚡ 성능 절 — 골격 SSOT v1.0** (`docs/release/performance-readme-skeleton.md` 112 LOC) — 진채봉 — 한눈 지표 4 약속 + 빠른 시작 + 4 게이트 흐름
  - **CHANGELOG 초안 v1.0** (`docs/release/performance-changelog-draft.md` 94 LOC) ← 본 항목의 출전
  - 연관 SSOT 정합:
    - 디자인 시스템 `docs/release/design-system_performance-optimization.md` 307 LOC (가춘운, 2026-04-30) — 성능 게이지 색상 토큰 + 임계 카피 + 측정 다이얼로그 SSOT
    - 시각 에셋 `docs/release/assets_performance-optimization.md` 604 LOC (가춘운, 2026-04-30) — 텍스처 아틀라스 정책 + 이미지 압축 가이드 + 어셋 우선순위 매트릭스
    - 벤치 픽스처 `docs/performance/benchmark-fixtures-v1.md` (심요연, 2026-04-30) — 측정 입력의 정본
    - 아키텍처 정경패 *4분면* — Hotspot / MemoryGuard / ChunkLoader / BudgetReport (4 모듈 그대로 본 코어에 미러)
    - 게이트 백능파 *FPS≥55 + Memory≤50MB + Load≤5s* HOLD 결정 정합
  - **회고록**: `docs/release/retro_performance-optimization-sprint.md` (본 회고)
    - **진전**: 4축 자(尺) 정합 / SSOT 7편 합주 5스프린트 연속 / 정경패 4분면 1:1 매핑 / bench 픽스처 SSOT 신설
    - **재발/후퇴**: *살아있는 음* 1회→0회 퇴보 · 테스트 1편→0편 퇴보 · 0 커밋 5스프린트 연속 · 워킹트리 40+ → 66 (+65%) · 미러 0건 5스프린트 연속 · 직전 P0 액션 0/5 해소 → *전달 게이트의 구조적 결함*
    - **다음 곡**: *Delivery Gate §0 — From Words to Commits* (Day 0~3, 7줄)
  - **다음 단계 (Carry-over 통합 ×3)**:
    - [ ] A1 — 워킹트리 66 → ≤ 4 (8커밋 분리) — 진채봉 + 계섬월
    - [ ] A2·A3 — save-load 라운드트립 + 손상 복구 2회 PASS — 적경홍 + 계섬월
    - [ ] A4 — data-validator Phase 52 실데이터 ≥100 레코드 — 계섬월 + 심요연
    - [ ] A5 — `.husky/pre-commit` 4-AND 게이트 (`validate:data ∧ save:gate ∧ mobile:gate ∧ perf:budget`)
    - [ ] A6 — `npm run perf:budget` 1회 PASS → `perf-budget-report.md` 신설
    - [ ] A7 — `BattleScene` + `MapScene` 부착 (Dead Module Drift 차단)
    - [ ] A8 — `tests/unit/perf/*` 2편 PASS
    - [ ] A9·A10·A11 — README §⚡ + CHANGELOG + `launch_checklist §2.24` 본문 통합
```

---

## 부록 A. 본 회고가 가리키는 한 줄

> *"자(尺)는 다섯이 깎였사오나, 잰 적이 없는 자는 자가 아니라 나무토막이옵니다."*
>
> 다섯 곡 연속 *과녁을 본 활*이 활집에 머묾을 끝내고자, 다음 곡 첫 음은 반드시 `npm run perf:budget` 한 줄에서 울려야 하옵니다. 그 음이 `perf-budget-report.md`에 한 줄로 봉해진 뒤에야, 본 perf 코어 1,350 LOC가 비로소 *살아있는 자*가 되옵나이다.

---

*— 진채봉 Editor 합주 / 2026-04-30 / Reflect 단계 종결*
