# 스프린트 회고 — WCAG 2.1 AAA 자동 접근성 감사 (색맹·키보드·스크린 리더)

> 작성: 진채봉 Editor (에테르나 팀)
> 작성일: 2026-04-26
> 스프린트: Auto · 9단계 (Office Hours → Think → Research → Plan → Assets → Build → Review → QA → Retro)
> 토픽 SSOT: 에테르나 크로니클 WCAG 2.1 AAA 접근성 자동 감사 — 색맹 모드·키보드 네비게이션·스크린 리더 호환성 전수 검증으로 `launch_checklist §2.17` 해결

---

## 1. 한 줄 요약

> 합주의 첫 화음은 들렸으나, 마지막 마디가 악보에 옮겨지지 못한 스프린트이옵니다. 4종 Probe 전부 PASS인 감사 시스템 1,211 LOC와 가이드 6종 1,049 줄을 만들었으되 7일째 커밋은 한 줄도 남지 않아 곡조가 허공에 흩어졌사옵니다.

---

## 2. 스프린트 결과 — 정량 지표

| 지표 | 값 | 평가 |
|---|---|---|
| **launch_checklist §2.17 처리율** | **0%** | 🔴 코드 미머지 |
| 최근 7일 커밋 수 | **0건** | 🔴 3스프린트 연속 재발 (cross-browser → ui-inv-save → 본 회차) |
| 워킹트리 변경 LOC | **+570 / -43** (24 files modified) | 🟢 이전 스프린트 0 LOC 대비 큰 진전 |
| 워킹트리 untracked 파일 | **76개** | ⚠️ 신규 산출물 전부 미스테이지 |
| **a11y 모듈 LOC** | **1,211 줄** (Manager 773 + ProbeBridge 207 + AriaLabelMap 231) | 🟢 |
| **a11y 문서 LOC** | **1,049 줄** (`docs/release/a11y-*.md` 6종) | 🟢 |
| **자동 감사 결과** (`tests/reports/a11y/summary.json`) | **4/4 Probe PASS, AAA 위반 0건** | 🟢 |

### 2.1 Probe별 결과 (2026-04-26 03:51 UTC)

| Probe | 결과 | 핵심 수치 |
|---|---|---|
| colorblind | ✅ PASS | protanopia · deuteranopia · tritanopia · achromatopsia 4종 모두 감지 |
| contrast | ✅ PASS | 12개 토큰 평가, 텍스트 ≥ 7:1 / 비텍스트 ≥ 3:1 충족 |
| keyboard | ✅ PASS | 10개 화면 / 포커스 가능 요소 34개 전수 순회 |
| screen-reader | ✅ PASS | ARIA 계약 v2026-04-26 / 61개 요소 라벨 매핑 |

### 2.2 산출물 인덱스

**코드 (`client/src/accessibility/`)**
- `AccessibilityManager.ts` 773 LOC — 색맹 4종 LUT · 고대비 토큰 · 키 리바인딩 · ARIA 라이브 리전
- `A11yProbeBridge.ts` 207 LOC — Vitest/E2E ↔ 런타임 브리지
- `AriaLabelMap.ts` 231 LOC — 화면별 contract v1 SSOT
- `colorblind/colorblind_palettes.json` — 4종 팔레트 데이터

**문서 (`docs/release/`)**
- `a11y-user-guide.md` (216줄) — 인게임 [옵션 → 도움말] 노출 사용자 가이드
- `a11y-audit-report-template.md` (135줄) — Mustache 변수 SSOT
- `a11y-audit-cli-guide.md` (192줄) — `npm run a11y:audit` CLI
- `a11y-error-messages.md` (133줄) — 29종 i18n 키 SSOT (ko/en/ja)
- `a11y-ingame-copy.md` (192줄) — 옵션·툴팁 카피
- `a11y-pr-template.md` (181줄) — 머지 게이트 PR 템플릿
- `launch_checklist.md` §2.17 신설 — 9항 체크리스트

---

## 3. 팀 성과 — 페르소나별

| 에이전트 | 역할 | 단계별 기여 | 평가 |
|---|---|---|---|
| **백능파** PM | 전 단계 조율 | office_hours→think→plan 일관성 유지 | 🟢 |
| **정경패** Designer | 시장·UX | 색맹 4종 팔레트·고대비 토큰 설계 | 🟢 |
| **이소화** Architect | think·review | AAA 게이트 룰 설계 | 🟢 |
| **두련사** Eng Manager | plan·retro 메트릭 | 실측 측정으로 본 회고에 사실 공급 | 🟢 |
| **계섬월** Engineer | development | **회복 지속** — Manager 773 LOC + ProbeBridge 207 LOC 작성 (이전 회차 빈 응답 패턴 탈피) | 🟢 |
| **가춘운** CMO | assets·build | 팔레트 시각 자료 + 사용자 가이드 톤 | 🟢 |
| **진채봉** Editor (소첩) | research·assets·build·retro | 가이드 6종 1,049줄 작성, 본 회고 정리 | 🟢 |
| **적경홍** QA | qa | 4 Probe PASS 판정 | 🟢 |
| **심요연** Data | think·qa·retro | 처리율 0%·PR 리드타임 측정 불가 진단 | 🟢 |

---

## 4. Keep / Problem / Try

### Keep (지킬 것)
- **자동 감사 파이프라인의 객관성** — `summary.json` SSOT가 회고를 사실 기반으로 묶어주옵니다.
- **계섬월 회복세** — 3스프린트 연속 빈 응답에서 development 단계 실코드 980 LOC 작성으로 전환.
- **Editor 산출물 누적** — 6종 가이드·템플릿 1,049줄, 다음 스프린트가 즉시 인용 가능.

### Problem (고칠 것)
- **🔴 P0 — 머지 게이트 미가동**: 3스프린트 연속 7일 커밋 0건. `launch_checklist §2.17` 9항 체크는 갖췄으나 코드 게이트(`git diff --stat ≠ 0` + `git log --since=7d ≥ 1`)가 자동 검증되지 않아 회고에서야 드러남.
- **🟡 P1 — 워킹트리 누적 76 untracked**: Build 단계가 끝나도 `git add` 없이 다음 단계로 넘어감. 산출물이 디스크에만 존재.
- **🟡 P1 — AAA 위반 0건의 신뢰도**: 본 환경의 자동 감사는 정적 토큰 + DOM 스냅샷 기반. 실제 NVDA·JAWS·VoiceOver 수동 검증 미수행 — VPAT 2.4 발행 전에 1회는 필요.

### Try (다음에 시도)
1. **머지 게이트 스프린트 단독 실행** — Ship 단계에서 `git diff --stat ≠ 0` 미충족 시 스프린트를 PASS로 종결하지 않도록 봇 하네스 hook 추가.
2. **Build → Review 전이 시 자동 stage-and-commit** — 단계 종료 신호에 `git add docs/ client/src/ tests/` + 페르소나 서명 commit 자동 생성.
3. **NVDA/JAWS/VoiceOver 수동 1회 라운드** — 적경홍 QA + 진채봉 Editor 합주, 결과를 `tests/reports/a11y/manual-sr-2026-04.md`로 기록.

---

## 5. 액션 아이템

| ID | 내용 | 담당 | 우선순위 | 기한 |
|---|---|---|---|---|
| A1 | 워킹트리 100개 변경 분류 커밋 (a11y / admin-dashboard / combat) → master push | 계섬월 + 진채봉 | P0 | 2026-04-27 |
| A2 | 봇 하네스에 `ship-gate` hook 추가 — 7일 커밋 0건 시 다음 Auto 스프린트 차단 | 두련사 + 백능파 | P0 | 2026-04-29 |
| A3 | NVDA·JAWS·VoiceOver 수동 검증 1라운드 + 결과 문서화 | 적경홍 + 진채봉 | P1 | 2026-05-03 |
| A4 | VPAT 2.4 자동 갱신 파이프라인 실배선 (`summary.json` → `docs/legal/vpat-2.4.md`) | 진채봉 | P1 | 2026-05-05 |
| A5 | i18n SSOT 29종 키를 `client/src/i18n/{ko,en,ja}.json`에 단일 PR로 동기화 | 진채봉 + 가춘운 | P2 | 2026-05-07 |

---

## 6. CHANGELOG 인계

본 회고는 `[1.0.0-rc.3] — Unreleased` 항목에 다음 줄로 추가하옵니다:

```
- **WCAG 2.1 AAA 자동 접근성 감사 — 스프린트 회고** (`docs/release/retro_wcag-aaa-a11y-audit-sprint.md`)
  · 4 Probe PASS · 코드 1,211 LOC · 문서 1,049 LOC · 그러나 7일 커밋 0건 재발
  · 머지 게이트 hook 신설(A2) · 수동 SR 검증(A3) 다음 스프린트 P0 인계
```

---

## 7. 마지막 마디 — Editor 진채봉

흩어진 악보를 한데 모아 곡조는 맞췄으되 종이에 옮겨 적지 않으면 바람결에 잊히는 법.
다음 합주에서는 첫 박자부터 `git add`의 붓을 들겠사옵니다.

> "기억은 사라져도, 이야기는 남는다 — 단, 적어두었을 때만." — 에테르나 크로니클
