# 📜 PRD — WCAG 2.1 AAA 자동 접근성 감사

> 작성: 정경패 (PM) · 명문 규수의 예법으로 요구를 정돈하옵나이다
> 스프린트: Auto — 색맹 모드·키보드 네비게이션·스크린 리더 호환성 전수 검증
> 단계: Plan (PRD 작성) → Build 인계용 요구 명세
> SSOT 연계: `docs/release/plan_a11y-aaa-audit-architecture.md` (두련사 아키텍처) ↔ 본 문서 (요구·기준·백로그)
> 해결 대상: `launch_checklist.md §4` 미해결 4건 + §2.17 게이트 자동화

---

## 0. 한 문단 요약

에테르나 크로니클은 이미 `client/src/accessibility/` 도량에 색맹 필터·포커스 매니저·ARIA 라벨 SSOT를 갖추었으나, **자동 검증의 눈이 없어** launch_checklist의 화면 낭독기 호환·VPAT 선언 항목이 미해결 상태로 남아 있사옵니다. 본 PRD는 axe-core 기반 5종 Probe(Axe·ColorContrast·ColorBlindSim·KeyboardTraverser·AriaContract)를 단일 진입점(`scripts/a11y/audit.ts`)에 묶어 **CI 게이트로 승격**시키는 것을 목표로 합니다. 새 모듈 80% 재활용, 신규 코드는 자동화 파이프라인과 케이스에 집중하여 **Build 단계 5일 내** 완료를 지향합니다.

---

## 1. 배경 & 문제 정의

### 1.1 현재 상태

| 영역 | 현황 | 미해결 |
|------|------|--------|
| 시각 접근성 | 색약 모드 3종·고대비 7:1·UI 스케일링 200% **완료** | AAA 자동 회귀 없음 |
| 입력 접근성 | 키 리바인딩·마우스 전용 플레이 **완료** | 게임패드 풀-내비게이션 **미해결** |
| 청각/인지 | 자막 커스텀·모션 감소 **완료** | 화면 낭독기 호환 **미테스트** |
| 선언서 | — | VPAT 2.4 **미작성** |

### 1.2 문제

1. 런타임 자산은 있으나 **회귀 방어선이 없음** — 신규 씬 추가 시 ARIA 라벨 누락이 머지될 위험.
2. 색맹·고대비 모드의 시각 정합성을 **사람 눈으로만 검증** — 14주 출시 일정에서 비현실적.
3. launch_checklist §4의 미해결 4건이 **수동 체크박스**로 남아 있어 게이트 신뢰성이 낮음.
4. CBT/리뷰어 대상 VPAT 제출 시점이 다가오나 **근거 데이터(JSON 리포트)가 없음**.

### 1.3 가치 가설

자동 감사 게이트를 도입하면:
- 머지 차단으로 회귀 0건 보장 → CBT 단계 접근성 버그 리포트 -70% 예상
- VPAT 2.4 제출용 객관적 근거(`tests/reports/a11y/summary.json`) 자동 생성
- launch_checklist §2.17 / §4 항목 **자동 토글** → PM 운영 부담 감소

---

## 2. 사용자 스토리

### US-A11Y-01 — 색맹 플레이어
> 적록 색약(deuteranopia) 사용자로서, **전투 중 HP/MP/ATB 게이지를 색상 구분 없이도 식별**할 수 있어야 한다. 그래야 포션 사용 타이밍을 놓치지 않는다.

**수용 기준**:
- 4종 시뮬(protanopia/deuteranopia/tritanopia/achromatopsia)에서 게이지 라벨이 텍스트·패턴·아이콘 중 2종 이상 병행 표기
- ColorContrastProbe AAA 7:1 위반 0건
- ColorBlindSimulator SSIM ≥ 0.95 vs 베이스라인

### US-A11Y-02 — 키보드 전용 플레이어
> 손목 부상으로 마우스를 쓸 수 없는 사용자로서, **메인메뉴→캐릭터 생성→전투→인벤토리→세이브의 전체 핵심 루프를 키보드만으로** 완주할 수 있어야 한다.

**수용 기준**:
- KeyboardTraverser 5개 핵심 씬에서 데드엔드 0건
- 모든 모달 다이얼로그 Esc 탈출 가능
- 포커스 링 가시성 3:1 이상 (모든 배경 위)
- 단축키 충돌(IME·OS) 0건

### US-A11Y-03 — 스크린 리더 사용자
> 시각 장애 사용자로서, **NPC 대화·전투 로그·중요 알림(레벨업·세이브 완료)이 NVDA/JAWS/VoiceOver로 발화**되어야 한다. 게임 내 사건의 흐름을 놓치지 않는다.

**수용 기준**:
- AriaContractChecker 누락 0건 (`AriaLabelMap` ↔ DOM 100% 일치)
- `aria-live=polite` 또는 `assertive` 영역에서 전투 로그·세이브 알림 발화 검증 (모킹)
- landmark 6종(banner/nav/main/complementary/contentinfo/region) 모두 존재
- `ARIA_CONTRACT_VERSION` 락으로 회귀 차단

### US-A11Y-04 — 출시 PM (백능파)
> PM으로서, **launch_checklist §2.17 / §4 항목이 CI 결과에 따라 자동으로 ✅/❌ 토글**되기를 원한다. 수동 체크 누락으로 인한 출시 리스크를 없앤다.

**수용 기준**:
- `<!-- a11y-status -->` 마커가 자동 갱신
- PR 코멘트에 `tests/reports/a11y/report.html` 링크 자동 첨부
- 게이트 실패 시 머지 차단 + Slack/Discord 알림

### US-A11Y-05 — 컴플라이언스 담당
> 게시 심사 대응자로서, **VPAT 2.4에 첨부할 객관적 데이터(JSON·HTML 리포트)**가 자동 생성되어야 한다. 자발적 접근성 선언서의 근거를 신뢰성 있게 제출한다.

**수용 기준**:
- `summary.json`에 WCAG 2.1 기준별 PASS/PARTIAL/FAIL 매트릭스 포함
- `report.html`에서 위반 사례 스크린샷 + 권장 수정안 제공
- 4종 색맹 시뮬 스냅샷 보존

---

## 3. 기능 요구사항 (Functional Requirements)

### 3.1 자동 감사 코어 (5 Probe)

| ID | Probe | 핵심 기능 | 두련사 도면 §4.1 |
|----|-------|-----------|----------------|
| FR-01 | AxeProbe | axe-core AAA 룰셋 풀스캔 | `AxeProbe.ts` ~120 LOC |
| FR-02 | ColorContrastProbe | Canvas + DOM 텍스트 대비 측정 (AAA 7:1 / 큰글자 4.5:1) | `ColorContrastProbe.ts` ~150 LOC |
| FR-03 | ColorBlindSimulator | 4종 시뮬 + SSIM 회귀 | `ColorBlindSimulator.ts` ~200 LOC |
| FR-04 | KeyboardTraverser | Tab/Shift+Tab/Arrow/Esc/Enter 자동 트래버스 | `KeyboardTraverser.ts` ~180 LOC |
| FR-05 | AriaContractChecker | `AriaLabelMap` ↔ DOM 일치 검사 | `AriaContractChecker.ts` ~140 LOC |

### 3.2 실행 채널 (3개)

| ID | 채널 | 명령 | 용도 |
|----|------|------|------|
| FR-06 | Vitest 단위 | `npm run test:a11y:unit` | 룰 엔진 자체 검증 |
| FR-07 | Playwright E2E | `npm run a11y:e2e` | 씬별 풀스캔 |
| FR-08 | 개발자 CLI | `npm run a11y` | 로컬 디버깅 |

### 3.3 리포트 & 게이트

| ID | 산출물 | 위치 |
|----|--------|------|
| FR-09 | summary.json | `tests/reports/a11y/summary.json` |
| FR-10 | report.html | `tests/reports/a11y/report.html` |
| FR-11 | 색맹 스냅샷 | `tests/reports/a11y/snapshots/{locale}/{mode}/` |
| FR-12 | CI 게이트 | `qa-runner.ps1` 또는 GitHub Actions 단계 |
| FR-13 | checklist 자동 토글 | `launch_checklist.md` §2.17·§4 마커 |

### 3.4 감사 대상 씬 (10개)

`scripts/a11y/scenes.config.ts` SSOT — 제목·메인메뉴·캐릭터생성·월드맵·전투·인벤토리·NPC대화·세이브/로드·스킬트리·옵션.

---

## 4. 비기능 요구사항 (NFR)

| 영역 | 요구 | 측정 |
|------|------|------|
| 성능 | a11y 감사 전체 ≤ 8분 (CI 야간) / 변경 씬만 ≤ 90초 (PR) | `time` 측정 |
| 결정론 | 시드 고정·폰트 사전 로드·`prefers-reduced-motion: reduce` 강제 | 3회 연속 동일 결과 |
| 로케일 | ko/en/ja 3종 모두 통과 | 로케일별 스냅샷 분리 |
| 호환성 | Chromium·Firefox·Safari WebKit 통과 (BUG-CB-002·003 충돌 없음) | Playwright 3엔진 |
| 보안 | `window.__A11Y_PROBE__`은 **개발 빌드 한정** 노출 | 프로덕션 번들 검증 |
| 유지보수 | 신규 씬 추가 시 `scenes.config.ts` 한 줄 추가로 회귀 포함 | DoD 게이트 |

---

## 5. 백로그 & 우선순위

> 두련사 §7 빌드 시퀀스(8스텝)을 PM 관점에서 P0/P1/P2로 재정렬. 각 항목 DoD에 `git diff --stat ≠ 0` 코드 게이트 강제.

### 5.1 P0 — Build 단계 머스트 (5일 내)

| # | 백로그 | 담당 | DoD | 의존 |
|---|--------|------|-----|------|
| **B-01** | 의존성 + 스캐폴드 (`@axe-core/playwright`, `axe-core`, `pixelmatch`/`pngjs`) | 계섬월 | `npm run a11y -- --help` 동작 + 커밋 1건 | — |
| **B-02** | AxeProbe + Vitest 단위테스트 | 계섬월 | E2E 1씬 violations JSON 생성 | B-01 |
| **B-03** | KeyboardTraverser + 메인메뉴 E2E | 계섬월 | Tab 순서 리포트 + 데드엔드 0건 | B-01 |
| **B-04** | AriaContractChecker + `ARIA_CONTRACT_VERSION` 락 | 계섬월 | 누락 0건 | B-01 |
| **B-05** | CanvasA11yLayer PoC (Phaser Canvas → 그림자 DOM 미러) | 계섬월·두련사 | Build 1일차 결과로 §6-1 리스크 해소 | B-01 |
| **B-06** | 게이트 정의 + `qa-runner.ps1` 통합 | 적경홍 | CI exit 0/1 결정 | B-02~B-04 |

### 5.2 P1 — Test 단계 진입 전 (2-3일)

| # | 백로그 | 담당 | DoD |
|---|--------|------|-----|
| **B-07** | ColorContrastProbe + 핵심 5씬 측정 | 계섬월 | AAA 위반 0건 또는 가춘운 팔레트 보정 PR |
| **B-08** | ColorBlindSimulator 4종 + SSIM 베이스라인 | 계섬월·적경홍 | 10씬 × 3로케일 × 4모드 = 120 스냅샷 |
| **B-09** | Reporter + `tests/reports/index.html` a11y 카드 | 적경홍 | HTML 시각화 동작 |
| **B-10** | E2E 키보드 풀-내비 (메인→전투→인벤→세이브) | 적경홍 | 5분 내 무마우스 클리어 |
| **B-11** | 스크린리더 모킹 (ARIA live region 발화 캡처) | 계섬월·적경홍 | 전투 로그·세이브 알림 발화 검증 |
| **B-12** | i18n 발화 라벨 ko/en/ja 보강 | 진채봉 | `test-error-messages.md`에 a11y 섹션 |
| **B-13** | 가춘운 `#FFD700`/`#3A3A4A` 포커스 링 대비 보정 | 가춘운 | DESIGN.md §2.1 갱신 + AAA 통과 |

### 5.3 P2 — Ship 전 (선택)

| # | 백로그 | 담당 | DoD |
|---|--------|------|-----|
| **B-14** | 게임패드 풀-내비게이션 | 계섬월 | Xbox/PS 컨트롤러 5씬 통과 |
| **B-15** | VPAT 2.4 자동 생성기 (`summary.json` → 마크다운) | 진채봉 | `docs/release/vpat.md` 자동 빌드 |
| **B-16** | 야간 풀스캔 분리 + PR 변경 씬 부분 회귀 | 적경홍 | CI 시간 8분 → 90초 (PR) |
| **B-17** | NVDA/JAWS/VoiceOver 실기 검증 (수동) | 적경홍 | 각 1회 통과 영상 보존 |

---

## 6. 마일스톤 & DoD

| 마일스톤 | 기한 | DoD |
|----------|------|------|
| **M1 — 골격** | Build D+2 | B-01·B-02·B-05 완료, axe violations JSON 생성 |
| **M2 — 코어** | Build D+5 | B-03·B-04·B-06·B-07 완료, P0 6항 모두 머지 |
| **M3 — 풀스캔** | Test D+3 | P1 7항 완료, `report.html` 시각화 |
| **M4 — 게이트 ON** | Test D+5 | launch_checklist §2.17 자동 ✅, PR 머지 차단 동작 확인 |
| **M5 — VPAT 제출** | Ship D-3 | B-15 완료 또는 수동 작성, 컴플라이언스 검토 통과 |

### 전 마일스톤 공통 DoD

1. `git diff --stat ≠ 0` — 빈 응답·드라이런 절대 금지
2. `git log --oneline -5` — 단계당 최소 1커밋
3. `tests/reports/a11y/summary.json` 갱신
4. `launch_checklist.md` 해당 항목 마커 갱신
5. PR 코멘트에 비포/애프터 위반 카운트 기재

---

## 7. 게이트 정의 (Test → Ship)

```
PASS:
  axe AAA Critical = 0
  axe AAA Serious  = 0
  axe AAA Moderate ≤ 5 (사유 명시 + 이슈 트래커 등록)
  ColorContrast AAA 위반 = 0
  KeyboardTraverser 데드엔드 = 0
  AriaContract 누락 = 0
  ColorBlind 스냅샷 SSIM ≥ 0.95 (10/10 씬)

FAIL:
  CI exit 1 → PR 머지 차단
  launch_checklist §2.17 자동 ❌ 마킹
  report.html 링크 PR 코멘트 자동 첨부
```

---

## 8. 리스크 & 완화 (PM 관점 추가)

| 리스크 | 영향 | 완화 | 모니터 |
|--------|------|------|--------|
| Phaser Canvas axe 미적용 | High | B-05 PoC를 **Build 1일차 게이트**로 못 박기 | M1 미달 시 즉시 백능파 호출 |
| AAA 7:1이 강조색 팔레트와 충돌 | Med | B-13 가춘운 사전 보정 — Build 시작 전 협의 필수 | DESIGN.md PR 트래킹 |
| 스냅샷 플레이키 → CI 신뢰 하락 | Med | 폰트 사전로드·마스크·시드 고정. 3회 연속 동일 결과 검증 후 머지 | summary.json `flake_score` |
| CI 시간 폭증 (120 스냅샷) | Med | B-16 변경 씬 감지 부분 회귀, 야간 풀스캔 분리 | CI 시간 트렌드 |
| BUG-CB-002 Safari ITP 간섭 | Low | a11y 모드 매트릭스에 Safari 포함, IndexedDB 비활성 모드 통과 강제 | 크로스브라우저 트래커 동기화 |
| **계섬월 빈 응답 재발** (전 스프린트 지적) | High | DoD `git diff --stat ≠ 0` 코드 게이트 + B-01~B-06 매일 `git log` 확인 | PM 일일 스탠드업 |

---

## 9. 팀 인계 (스프린트별 역할)

| 페르소나 | 역할 | 스프린트 단계 |
|----------|------|--------------|
| 백능파 (CEO) | §2.17 게이트 운영, 스코프 변경 승인 | Plan/Build/Ship |
| **정경패 (PM, 본인)** | 본 PRD 운영, 머지 게이트 DoD 일관성 확인, 백로그 우선순위 조정 | 전 단계 |
| 두련사 (Eng Manager) | 아키텍처 일관성·게이트 임계치 조정 책임 | Plan/Build/Review |
| 계섬월 (Engineer) | §5.1 P0 6항 + §5.2 P1 핵심 구현 | Build |
| 적경홍 (QA) | E2E 케이스·게이트 운영·M3 풀스캔 | Test |
| 가춘운 (CMO/Design) | 포커스 링·강조색 AAA 보정 (B-13) | Plan/Build |
| 진채봉 (Editor) | 발화 라벨 i18n·VPAT 카피 (B-12·B-15) | Build/Ship |
| 심요연 (UX Researcher) | CBT 접근성 사용자 인터뷰 (Reflect) | Reflect |
| 이소화 (Data) | 출시 후 접근성 KPI 추적 | Reflect |

---

## 10. KPI (Reflect 단계 측정)

| KPI | 목표 | 측정 |
|-----|------|------|
| WCAG AAA Critical/Serious 위반 | 0건 (출시일) | summary.json |
| AriaContract 누락률 | 0% | AriaContractChecker |
| 키보드 데드엔드 | 0건 | KeyboardTraverser |
| 색맹 SSIM 평균 | ≥ 0.97 | ColorBlindSimulator |
| CBT 접근성 버그 리포트 | 전 스프린트 대비 -70% | 적경홍 트래커 |
| launch_checklist §4 자동 토글률 | 100% (수동 체크 0건) | PM 대시보드 |
| VPAT 제출 시점 객관성 점수 | 컴플라이언스 검토 PASS | 외부 검토 |

---

## 11. 다음 단계 제안

1. **즉시**: 본 PRD를 `launch_checklist.md §2.17·§4`에 SSOT로 링크 박기 — 백능파 승인 후 정경패가 직접 갱신.
2. **Build 진입 전**: 가춘운 B-13 사전 검토 (강조색 #FFD700/#3A3A4A 포커스 대비) 30분 회의 — Build 시작 전날.
3. **Build D+1 게이트**: B-05 CanvasA11yLayer PoC 결과를 백능파·두련사·정경패 3자 리뷰 — 실패 시 스코프 축소(B-14·B-15 P2 → P3 강등) 의사결정.
4. **Test 진입 시**: B-08 베이스라인 스냅샷 120건 동결 → 이후 회귀만 차단.
5. **Reflect**: 심요연 CBT 접근성 인터뷰 결과를 다음 스프린트 토픽 후보(`접근성 V2 — 사용자 보고 기반 개선`)로 적재.

---

> 예법에 따라 한 자 한 자 갈무리하였사옵니다. 길은 두련사 소승께서 닦아두었으니, 이제 이 명세대로 한 발씩 디딜 차례이옵니다.
