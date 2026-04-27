# 회고 — 개발자 빌드-검증 사이클 단축 스프린트

> 스프린트: Auto — 에테르나 크로니클 개발자 빌드-검증 사이클 단축 (대표 crisi 본인 효율)
> 토픽: Phaser dev server 부팅 측정·단축 / 핵심 시나리오(전투·세이브·맵이동) 자동 검증 / 빌드 에러 가독성·원인 파일 즉시 노출
> 지표 약속: 코드 변경 → 핵심 시나리오 검증 ≤ 5분 · 에러 발생 시 원인 파일/라인 즉시 노출
> 작성: 진채봉 Editor (Opus 4.7 1M)
> 작성일: 2026-04-27
> 단계: Reflect (회고)
> 참조 게이트: `docs/release/launch_checklist.md §개발자 동선`

---

## 1. 한 줄 요약

> **"악기는 다섯 자루(npm scripts) 곱게 깎았으나, 곡(시간)을 한 번도 타지 않았사옵니다."**
> — 도구는 갖췄으되 *변경→검증 ≤ 5분*이라는 본 스프린트의 단 하나뿐인 약속을 측정하지 못한 채 막을 내렸나이다.

---

## 2. 스프린트 결과 (Outcome Snapshot)

### 2.1 산출물 (코드 902 LOC + 문서 1,013 LOC = 1,915 LOC)

| # | 단계 | 산출 | LOC | 작성자 |
|---|------|------|-----|-------|
| 1 | Build | `scripts/dev-cycle/measure-boot.mjs` | 174 | 계섬월 Build |
| 2 | Build | `scripts/dev-cycle/verify-core.mjs` | 184 | 계섬월 Build |
| 3 | Build | `scripts/dev-cycle/format-error.mjs` | 120 | 계섬월 Build |
| 4 | Assets | `client/src/styles/devloop-overlay.css` | 424 | 가춘운 CMO |
| 5 | Plan | `docs/release/design-system_devloop.md` | 233 | 가춘운 CMO |
| 6 | Assets | `docs/release/devloop-user-guide.md` | 234 | 진채봉 Editor |
| 7 | Assets | `docs/release/devloop-error-messages.md` | 291 | 진채봉 Editor |
| 8 | Assets | `docs/release/devloop-pr-template.md` | 151 | 진채봉 Editor |
| 9 | Assets | `docs/release/devloop-readme-skeleton.md` | 104 | 진채봉 Editor |
| **합계** | | | **1,915** | 9 에이전트 |

> npm 인터페이스 5종 신설 — `dev:measure` / `dev:verify` / `dev:fmt-error` / `dev:typecheck` / `dev:build` (`package.json` L55–59).

### 2.2 게이트 통과 약속 (SSOT)

| 게이트 | 기준 | 본 스프린트 결과 |
|--------|------|----------------|
| **부팅 측정 (T_boot)** | `npm run dev:measure` 1회 실행 + 기준선 1개 등재 | 🟡 스크립트 완비, 실측 0회 |
| **핵심 시나리오 검증 (T_verify)** | 전투·세이브·맵이동 3종 자동 PASS | 🟡 verify-core 골격 완비, 실배선 0회 |
| **에러 가독성 (E_legible)** | `tsc`/`build` stderr → 파일:라인:이유 1줄 요약 | 🟢 format-error.mjs 작동 — 단 시·hint 톤 SSOT만 명문 |
| **변경→검증 ≤ 5분** | 측정 1회 이상 | 🔴 0회 (지표 부재) |
| **원인 파일/라인 즉시 노출** | 에러 1건당 path:line 노출 | 🟢 코드 PASS / 🔴 회귀 테스트 0건 |

### 2.3 코드/커밋 메트릭 (두련사 + 심요연 측정)

| 지표 | 수치 | 추세 |
|------|------|------|
| 7일 신규 커밋 | **0건** | 🔴 5스프린트 연속 0 |
| 워킹트리 변경/Untracked | **129 entries** | 🔴 단조 증가 (76 → 122 → 129) |
| 신규 코드 LOC | **902** | 🟢 (3 mjs + overlay.css) |
| 신규 문서 LOC | **1,013** | 🟢 |
| npm 스크립트 배선 | **5종** | 🟢 (인터페이스 완비) |
| **본 토픽 핵심 지표 측정** | **0회** | 🔴 *과녁 보지 않은 활* |

---

## 3. Keep · Problem · Try

### 🟢 Keep (이 곡조는 살리고 싶사옵니다)

1. **계섬월 Build의 478 LOC 도구 3종 안착** — measure-boot / verify-core / format-error가 한 디렉터리(`scripts/dev-cycle/`)에 정좌(正坐)하여 다음 스프린트가 곧장 부를 수 있게 되었나이다. *지난 스프린트 Build 결손이 이번엔 메워졌사옵니다.*
2. **npm 스크립트 5종 인터페이스 통일** — `dev:*` 네임스페이스가 한 줄로 정렬되어, 대표님의 손가락이 헤매지 않도록 SSOT가 잡혔사옵니다.
3. **가춘운의 devloop-overlay.css 424줄** — 부팅·검증·에러 3상태를 단일 디자인 토큰으로 묶어, 다음 스프린트의 시각 합주가 끊김 없이 이어질 것이옵니다.
4. **진채봉 4종 가이드 묶음 (사용자·에러카피·PR·README)** — 도구가 늘어도 흩어지지 않도록 SSOT 4장(章)을 한 결로 엮었사옵니다.

### 🔴 Problem (곡조가 어긋난 마디)

1. **[P0] 본 토픽의 핵심 지표 *변경→검증 ≤ 5분*을 단 한 번도 측정하지 않았사옵니다** — *과녁 보지 않은 활*. 도구를 만들었으되 실측 0회로 막을 내려, 스프린트 성공/실패를 판정할 데이터가 부재하옵니다. (심요연 지적)
2. **[P0] 5스프린트 연속 7일 커밋 0건** — *Dead Module Drift*가 임계를 넘어 단조 증가 중이옵니다. 직전 회고(monster-art)의 A1·A2 부채 청산 권고가 이행되지 못한 채 본 스프린트가 그 위에 1,915 LOC를 덧칠하였사옵니다.
3. **[P0] 워킹트리 122 → 129 entries 단조 증가** — a11y AAA + monster-art + dev-cycle 3개 스프린트의 변경이 한 줄에 뒤엉켜, *어느 줄이 어느 곡인지* 추적이 더욱 어려워졌나이다.
4. **[P1] verify-core.mjs 회귀 테스트 0건** — 전투·세이브·맵이동 3종 시나리오가 골격만 있을 뿐, 실제 PASS/FAIL 한 번도 울려보지 못했사옵니다.
5. **[P2] launch_checklist §개발자 동선** 항목 신설은 갱신되었으나, 본 스프린트 결과가 체크리스트에 다시 메아리(round-trip)치지 않았사옵니다.

### 🟡 Try (다음 곡에서 시도할 것)

| ID | 액션 | 담당 | P | 검증 |
|----|------|------|---|------|
| **A1** | **본 토픽 지표 1회 실측** — `npm run dev:measure && npm run dev:verify` 한 번 돌려 *변경→검증 시간*을 `docs/release/devloop-baseline.json`에 기록 | 계섬월 Build + 적경홍 QA | **P0** | 기준선 JSON 1건 |
| **A2** | **워킹트리 129 → 0 분류 커밋** — a11y / monster-art / dev-cycle / housekeeping 4개 PR로 분리 후 main push (직전 회고 A2 이월) | 계섬월 Build + 진채봉 Editor | **P0** | `git status --short` == 0 |
| **A3** | **봇 하네스 `ship-gate` hook 신설** — `git diff --stat ≠ 0` AND `git log --since=7d ≥ 1` 양쪽 만족 시에만 Reflect 종료 (직전 회고 A1 이월) | 두련사 SRE | **P0** | hook 동작 로그 |
| **A4** | **verify-core.mjs 시나리오 실배선** — 전투(turn 1회)·세이브(라운드트립)·맵이동(scene swap) 3종 PASS 확인 | 적경홍 QA + 계섬월 Build | **P1** | `npm run dev:verify` exit 0 |
| **A5** | ***Dead Module Drift* 주간 대시보드 확장** — 5스프린트 추세 + 측정-부재 지표 별도 트랙 | 심요연 Data | **P2** | 매주 월요일 리포트 |

**A1·A2·A3가 P0이옵니다.** 특히 **A1은 본 스프린트 토픽 그 자체이므로, 다음 스프린트 첫날 첫 시간에 1회 실측이 곧 본 스프린트의 *지연된 종결*이 되옵니다.**

---

## 4. 팀 성과 (에이전트별 기여)

| 에이전트 | 단계 참여 | 산출 | 비고 |
|---------|---------|---------|------|
| 백능파 CSO | OfficeHours·Think·Plan·Review | 의사결정 SSOT | HOLD/GO 판단 일관 |
| 정경패 PM | OfficeHours·Think·Plan | PRD 요건 정돈 | 본 토픽 4요소 명확화 |
| 두련사 SRE | Think·Plan·Reflect | 메트릭 분석 | 5스프린트 추세 식별 |
| 가춘운 CMO | Plan·Assets·Development | 657 LOC | overlay.css 424 + design-system 233 |
| **계섬월 Build** | Assets·Development·Review | **478 LOC** | 🟢 직전 결손 회복 — 본 스프린트 코드 산출 단독 1위 |
| 진채봉 Editor | Assets·Development·Reflect | 780 + 본 문서 | 가이드 4종 묶음 + CHANGELOG·회고 |
| 적경홍 QA | QA | 시나리오 명세 | verify-core 실배선은 차기 |
| 이소화 Security | Research·Review·QA | 안전성 검토 | dev 스크립트 권한 격리 OK |
| 심요연 Data | Think·Research·Assets·QA·Reflect | 메트릭·추세 | *과녁 미관측* 지적이 본 회고 핵 |

---

## 5. 다음 스프린트 권고

> **백능파께 권하옵니다.** 직전 회고(monster-art) A1·A2가 이월된 채로 본 스프린트가 또 한 곡 덧붙었으니, 이제는 신규 토픽을 받지 마시옵소서. 아래 한 곡만 곱게 마쳐야 다음 합주가 비로소 풀릴 것이옵니다.
>
> - **Sprint Name (제안)**: *Build-Catchup §1 — Working Tree Zero + Baseline One*
> - **Outcome**:
>   1. 워킹트리 129 → 0 (분류 PR 4건 안착)
>   2. 7일 커밋 ≥ 5
>   3. `ship-gate` hook 가동
>   4. **본 스프린트 토픽 지표 *변경→검증 ≤ 5분* 1회 실측 + 기준선 등재**
> - **Topic 4요소**:
>   - 대상: 누적 워킹트리 (a11y AAA + monster-art + dev-cycle) + 부팅/검증 기준선
>   - 사용자: 9-에이전트 팀 자체 + 대표(crisi)
>   - 방향성: 문서·도구→측정·코드 안착 전환율 ≥ 80%
>   - 지표: `git status --short` line count, `ship-gate` exit 0율, `devloop-baseline.json` 등재 수

---

## 6. 인계 (Hand-off)

- **본 회고의 SSOT**: 이 문서 (`docs/release/retro_dev-cycle-shortening-sprint.md`)
- **연계 SSOT**:
  - `docs/release/launch_checklist.md §개발자 동선` (게이트)
  - `docs/release/retro_monster-art-pipeline-sprint.md` (직전 — A1·A2 이월)
  - `docs/release/retro_wcag-aaa-a11y-audit-sprint.md` (전전 — 동일 패턴 첫 발현)
  - `docs/release/devloop-user-guide.md` (사용자 SSOT)
- **CHANGELOG**: `[1.0.0-rc.3] - Unreleased` 절에 본 스프린트 산출물 인덱스 + 본 회고 항목 추가 (동시 커밋)

---

> *기록은 거문고 줄과 같사옵니다. 줄을 다섯 자루나 새로 매었으되 한 음도 타지 않았으니, 다음 곡은 짧아도 좋사오니 단 한 음이라도 *측정의 음*을 울려 보고 싶사옵니다.*
> — 진채봉
