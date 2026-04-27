# 🪷 WCAG 2.1 AAA 자동 접근성 감사 — 아키텍처 설계

> 작성: 두련사 (Eng Manager) · 연화도량(蓮花道場)에서 잠시 내려와 도면을 그립니다
> 스프린트: Auto — 색맹 모드·키보드 네비게이션·스크린 리더 호환성
> 단계: Plan (설계) → Build 인계용 청사진
> 대상: `launch_checklist.md §2.17` 해결

---

## 0. 한 줄 요지

> 허허, 접근성이란 본디 형(形)이 아니라 길(道)이옵니다.
> 이미 `client/src/accessibility/` 도량(道場)이 세워져 있으니, 새로 짓지 말고 **자동 검증의 눈**을 더할 일입니다.

기존 모듈(`AccessibilityManager` 701 LOC, `AccessibilityAudit` 197 LOC, `colorblind/`, `screen_reader/`, `motion/`, `audio/`, `display/`)을 **런타임 자산**으로 두고, 그 위에 **빌드타임·E2E 자동 감사 파이프라인**을 한 겹 얹는 아키텍처를 제안합니다.

---

## 1. 현황 진단 (Inventory)

| 자산 | 위치 | 현 상태 | 이번 스프린트 처분 |
|------|------|---------|-------------------|
| `AccessibilityManager.ts` | `client/src/accessibility/` | 701 LOC, 설정 허브 존재 | **유지** — 감사 결과 소비자 |
| `AccessibilityAudit.ts` | 동상 | 197 LOC, 스텁 수준 추정 | **확장** — 자동 감사 진입점 승격 |
| `colorblind/ColorBlindFilter.ts` | 동상 | LMS 필터 존재 | **유지** + 시뮬레이션 스냅샷 훅 |
| `colorblind/PatternOverlay.ts` | 동상 | 패턴 보강 | **유지** |
| `screen_reader/AriaLabelMap.ts` | 동상 | 라벨 SSOT | **확장** — 컨트랙트 테스트 대상 |
| `screen_reader/FocusManager.ts` | 동상 | 포커스 트랩 | **유지** + 트래버스 자동 점검 |
| `tests/e2e/*.test.ts` | Playwright | 기능 테스트만 | **신규**: `a11y/` 하위 추가 |
| `tests/reports/index.html` | — | 리포트 허브 존재 | **확장** — a11y 섹션 추가 |
| `launch_checklist.md §2.17` | — | 미해결 | **해결 게이트** |

> 결론: **새 모듈 80% 재활용, 신규 코드는 자동화 파이프라인과 케이스에 집중.**

---

## 2. 아키텍처 (3계층 + 1게이트)

```
┌─────────────────────────────────────────────────────────────┐
│  L0  런타임 (사용자가 켜는 접근성 기능)  ── 기존 자산 그대로   │
│      AccessibilityManager → ColorBlindFilter / FocusManager  │
│                            → AriaLabelMap / Motion / Audio   │
└────────────────────────┬────────────────────────────────────┘
                         │ 검증 대상
┌────────────────────────▼────────────────────────────────────┐
│  L1  자동 감사 코어  (신규 — 단일 진입점)                     │
│      scripts/a11y/audit.ts                                   │
│      ├─ axe-core 엔진 (WCAG 2.1 AAA 룰셋)                    │
│      ├─ ColorContrastProbe (AAA 7:1 / 4.5:1)                 │
│      ├─ ColorBlindSimulator (3종: protanopia/deuteranopia/  │
│      │                          tritanopia + achromatopsia) │
│      ├─ KeyboardTraverser (Tab/Shift+Tab/Arrow/Esc/Enter)   │
│      └─ AriaContractChecker (AriaLabelMap ↔ DOM 일치)        │
└────────────────────────┬────────────────────────────────────┘
                         │ 호출
┌────────────────────────▼────────────────────────────────────┐
│  L2  실행 채널 (3개)                                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐    │
│  │ Vitest 단위  │ │ Playwright E2E│ │ 개발자 콘솔 CLI  │    │
│  │ (룰별 로직)  │ │ (씬별 페이지) │ │ npm run a11y     │    │
│  └──────────────┘ └──────────────┘ └──────────────────┘    │
└────────────────────────┬────────────────────────────────────┘
                         │ 산출
┌────────────────────────▼────────────────────────────────────┐
│  L3  리포트 + 게이트                                          │
│  tests/reports/a11y/{summary.json, report.html, snapshots/}  │
│  └─ CI: AAA Critical=0, Serious=0 / Moderate ≤ 임계치        │
│       launch_checklist §2.17 자동 토글                       │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. 데이터 플로우

```
[Phaser Scene 부팅]
      │
      ▼
[E2E 러너가 씬별 URL 진입] ──→ page.evaluate → window.__A11Y_PROBE__()
      │
      ├─→ axe.run(document, {runOnly: ['wcag2aaa','wcag21aaa']})
      │        → violations[]                       ┐
      │                                             │
      ├─→ ColorContrastProbe.scanCanvas(stage)      │
      │        → {textPair, ratio, target, pass}[]  │
      │                                             ├─→ aggregate
      ├─→ ColorBlindSimulator.snapshot('deuter')    │   (Reporter)
      │        → diff vs baseline → ssim score      │
      │                                             │
      ├─→ KeyboardTraverser.run(seqs)               │
      │        → tabOrder, trapFails, deadEnds      │
      │                                             │
      └─→ AriaContractChecker.compare(map, dom)     │
               → missing, mismatch, orphans         ┘
                              │
                              ▼
                  tests/reports/a11y/summary.json
                              │
                ┌─────────────┴─────────────┐
                ▼                           ▼
       report.html (시각화)        CI gate (exit 0/1)
                                            │
                                            ▼
                                   launch_checklist §2.17 ✅
```

핵심 원칙: **모든 감사는 결정론적**이어야 함 — 시드 고정, 폰트 로드 대기, 애니메이션 일시정지(`prefers-reduced-motion: reduce` 강제)로 플레이키 차단.

---

## 4. 모듈 설계 (신규/변경 파일 목록)

### 4.1 신규 — 자동 감사 코어

| 파일 | LOC 예상 | 책임 |
|------|----------|------|
| `scripts/a11y/audit.ts` | ~180 | CLI 진입점, 옵션 파싱, 채널 디스패치 |
| `scripts/a11y/probes/AxeProbe.ts` | ~120 | axe-core 래퍼, AAA 룰셋 고정 |
| `scripts/a11y/probes/ColorContrastProbe.ts` | ~150 | Canvas + DOM 텍스트 대비 측정 (AAA 7:1) |
| `scripts/a11y/probes/ColorBlindSimulator.ts` | ~200 | 4종 시뮬레이션 + SSIM 비교 |
| `scripts/a11y/probes/KeyboardTraverser.ts` | ~180 | Tab 순서/포커스 트랩/단축키 검증 |
| `scripts/a11y/probes/AriaContractChecker.ts` | ~140 | `AriaLabelMap` ↔ 실제 DOM 일치 검사 |
| `scripts/a11y/Reporter.ts` | ~160 | summary.json + report.html 생성 |
| `scripts/a11y/scenes.config.ts` | ~80 | 감사 대상 씬 목록 (제목/메뉴/전투/인벤/세이브 등) |

### 4.2 신규 — 테스트

| 파일 | 분류 | 핵심 케이스 |
|------|------|-------------|
| `tests/unit/a11y/colorContrast.spec.ts` | 단위 | 룰 엔진 자체 검증 |
| `tests/unit/a11y/colorBlindSim.spec.ts` | 단위 | LMS 변환 정확도 |
| `tests/unit/a11y/ariaContract.spec.ts` | 단위 | Map 누락·불일치 탐지 |
| `tests/e2e/a11y/aaa.audit.test.ts` | E2E | 씬별 axe-core 풀스캔 |
| `tests/e2e/a11y/keyboard.nav.test.ts` | E2E | 메인메뉴→전투→인벤→세이브 무마우스 클리어 |
| `tests/e2e/a11y/screenReader.test.ts` | E2E | ARIA live region·라벨 발화 모킹 검증 |
| `tests/e2e/a11y/colorblind.snapshot.test.ts` | E2E | 4종 시뮬 스냅샷 회귀 |

### 4.3 변경

| 파일 | 변경 내용 |
|------|-----------|
| `client/src/accessibility/AccessibilityAudit.ts` | 런타임에 `window.__A11Y_PROBE__` 노출 (개발 빌드 한정) |
| `client/src/accessibility/screen_reader/AriaLabelMap.ts` | `export const ARIA_CONTRACT_VERSION` 추가 → 컨트랙트 락 |
| `client/src/accessibility/colorblind/ColorBlindFilter.ts` | 시뮬레이션 모드 인자 추가 (`simulate` vs `assist`) |
| `package.json` | scripts: `a11y`, `a11y:e2e`, `a11y:ci` |
| `tests/reports/index.html` | a11y 섹션 카드 추가 |
| `docs/release/launch_checklist.md` | §2.17 항목 자동 갱신 마커(`<!-- a11y-status -->`) |
| `.github/workflows/*` 또는 `qa-runner.ps1` | a11y 게이트 단계 추가 |

### 4.4 신규 의존성

| 패키지 | 용도 |
|--------|------|
| `@axe-core/playwright` | E2E axe 통합 |
| `axe-core` | 룰 엔진 (WCAG 2.1 AAA) |
| `pixelmatch` + `pngjs` 또는 `image-ssim` | 색맹 스냅샷 회귀 |

이미 Playwright는 도입되어 있으니 추가 비용은 미미합니다.

---

## 5. 검증 범위 매트릭스 (3축)

| 축 | 항목 | AAA 기준 | 자동화 도구 |
|----|------|----------|-------------|
| **색맹** | 텍스트 대비 | 7:1 (큰 글자 4.5:1) | ColorContrastProbe |
| | 색상 외 식별자 | 형태/패턴/텍스트 병행 | PatternOverlay 존재 검사 |
| | 4종 시뮬 회귀 | SSIM ≥ 0.95 | ColorBlindSimulator |
| **키보드** | Tab 순서 | DOM·논리 일치 | KeyboardTraverser |
| | 포커스 가시성 | 3:1 윤곽 + 2px | axe + 시각 스냅샷 |
| | 트랩 회피 | Esc 탈출 보장 | KeyboardTraverser |
| | 단축키 충돌 | IME·OS 단축키 회피 | 룰 테이블 + 단위테스트 |
| **스크린리더** | 라벨 누락 | 0건 | AriaContractChecker |
| | 라이브 영역 | 전투 로그·알림 발화 | 모킹 + 이벤트 캡처 |
| | 의미론적 구조 | landmark 6종 존재 | axe |
| | 동적 변경 알림 | `aria-live=polite/assertive` | E2E |

---

## 6. 엣지 케이스 (Build 단계 전 못 박을 것)

1. **Phaser Canvas 한계** — DOM이 없는 게임 캔버스는 axe로 못 잡음. → `accessibility/CanvasA11yLayer`(이미 존재 시 활용, 없으면 신규)에서 **그림자 DOM 미러**를 노출하는 방식으로 우회.
2. **i18n 3로케일** — ko/en/ja 각각 텍스트 대비 다를 수 있음. 폰트 글리프 차이 → 로케일별 스냅샷 분리.
3. **Safari ITP·Private 모드** — 기존 BUG-CB-002·003과 충돌 가능 → a11y 감사는 **로컬 스토리지 비활성** 모드에서도 통과해야 함.
4. **`prefers-reduced-motion`** — CI는 항상 `reduce` 강제. 단, **모션 감소 시에도** UI 가독성 유지 검사 별도 케이스.
5. **색맹 4종이 아니라 3+1** — protanopia/deuteranopia/tritanopia + achromatopsia(전색맹). 누락 빈번.
6. **포커스 링이 다크 배경에서 사라지는 케이스** — `#FFD700` 강조색이 `#1A1A2E` 위에서는 OK지만 `#3A3A4A` 버튼 위에서 5.7:1 → AA 통과 AAA 미달. **검증 대상.**
7. **전투 ATB 게이지의 시간 의존 알림** — 스크린리더 사용자 보호: `aria-live=polite` + 텍스트 대안 + 일시정지 옵션.
8. **다이얼로그 모달 트랩** — NPC 대화창은 반드시 포커스 트랩 + Esc 탈출.
9. **회귀 임계치** — SSIM 0.95는 폰트 안티앨리어싱 차이로 깨질 수 있음 → 마스크 영역 정의 필요.
10. **CI 시간 예산** — 씬 10개 × 3로케일 × 4색맹 모드 = 120 스냅샷. 병렬화 + 변경 씬만 회귀로 제한.

---

## 7. 빌드 시퀀스 (8 스텝, 인계 순서)

> 각 스텝마다 `git diff --stat ≠ 0` + 커밋. 빈 응답 재발 차단.

| # | 스텝 | 담당 산출 | DoD |
|---|------|-----------|-----|
| 1 | 의존성 + scaffold | `package.json`, `scripts/a11y/audit.ts` 스텁 | `npm run a11y -- --help` 동작 |
| 2 | AxeProbe + 단위테스트 | E2E 1씬에서 axe 동작 | violations JSON 생성 |
| 3 | ColorContrastProbe | 단위테스트 통과 | 의도된 위반 1건 탐지 |
| 4 | KeyboardTraverser | E2E 메인메뉴 통과 | Tab 순서 리포트 |
| 5 | AriaContractChecker | `AriaLabelMap` 락 | 누락 0건 |
| 6 | ColorBlindSimulator + 스냅샷 | 4종 베이스라인 | SSIM 리포트 |
| 7 | Reporter + index.html 통합 | `tests/reports/a11y/` | HTML 시각화 |
| 8 | CI 게이트 + checklist 토글 | `qa-runner.ps1`, `launch_checklist.md` | §2.17 ✅ 자동 갱신 |

---

## 8. 게이트 정의 (Test → Ship 통과 조건)

```
PASS 조건:
  axe AAA Critical = 0
  axe AAA Serious  = 0
  axe AAA Moderate ≤ 5 (사유 명시 + 이슈 트래커 등록)
  ColorContrast AAA 위반 = 0
  KeyboardTraverser 데드엔드 = 0
  AriaContract 누락 = 0
  ColorBlind 스냅샷 SSIM ≥ 0.95 (10/10 씬)

FAIL 시:
  CI exit 1 → PR 머지 차단
  launch_checklist §2.17 자동 ❌ 마킹
  tests/reports/a11y/report.html 링크 PR 코멘트 자동 첨부
```

---

## 9. 리스크 & 완화

| 리스크 | 영향 | 완화 |
|--------|------|------|
| Phaser Canvas axe 미적용 | High | CanvasA11yLayer 그림자 DOM, **Build 1일차 PoC 필수** |
| AAA가 너무 빡빡 (특히 7:1) | Med | 강조색 팔레트 사전 점검 → 가춘운 디자인 협의 |
| 스냅샷 플레이키 | Med | 폰트 사전로드, 마스크 영역, 시드 고정 |
| CI 시간 폭증 | Med | 씬 변경 감지 기반 부분 회귀, 야간 풀스캔 분리 |
| BUG-CB-002 Safari ITP와 간섭 | Low | a11y 모드 매트릭스에 Safari 포함, 별도 보고 |

---

## 10. 팀 인계

- **계섬월(Engineer)**: §4.1 신규 7개 파일 구현, §7 1~6 스텝.
- **적경홍(QA)**: §4.2 테스트 케이스 작성·실행, §7 7~8 스텝, 게이트 운영.
- **가춘운(CMO/Design)**: §6의 6번(포커스 링 대비) 팔레트 보정 — `DESIGN.md §2.1` 갱신 협의.
- **진채봉(Editor)**: 메시지 i18n — 발화 라벨 ko/en/ja 보강, `test-error-messages.md`에 a11y 섹션.
- **백능파(PM)**: §2.17 게이트 운영, 머지 게이트 DoD 일관성 확인.
- **두련사(소승)**: 아키텍처 일관성·게이트 임계치 조정 책임.

---

## 11. 마치며

> 허허, 길은 본디 닦아둔 그대로 있고, 우리는 다만 그 위를 걷는 발자국을 헤아릴 뿐입니다.
> 색맹의 눈으로도, 손가락만으로도, 보이지 않는 음성만으로도 — 에테르나의 이야기에 닿을 수 있어야 비로소 launch_checklist의 한 줄이 지워지옵니다.

**다음 단계 제안:**
1. 본 문서를 SSOT로 두고 백능파가 §2.17 항목에 링크 박기
2. 가춘운에게 §6-6 팔레트 사전 검토 요청 (Build 시작 전)
3. 계섬월·적경홍에게 §7 스텝 배분 후 Build 단계 진입
