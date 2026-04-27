# 보안 체크리스트 — WCAG 2.1 AAA 자동 접근성 감사

> 작성: 이소화 (Security Analyst) · Plan 단계
> SSOT: `plan_a11y-aaa-audit-architecture.md` (두련사) · `prd_a11y-aaa-audit.md` (정경패)
> 스프린트: Auto: WCAG 2.1 AAA 접근성 자동 감사 — 색맹/키보드/스크린리더
> 목표: launch_checklist §2.17 해결 시 도입되는 5 Probe·CI 게이트의 사기(邪氣)를 미리 봉인

---

## 0. 위협 모델 (Threat Surface) — 한눈에

| ID | 자산 | 위협 | 위험도 |
|----|------|------|--------|
| T1 | `scripts/a11y/audit.ts` CLI | 임의 URL 스캔 → SSRF/내부망 정찰 | **상** |
| T2 | `tests/reports/a11y-*.json` | 게임 세이브·플레이어 토큰·DOM PII 유출 | **상** |
| T3 | axe-core·@axe-core/playwright 의존성 | 공급망 침투 | 중 |
| T4 | CI 게이트 산출물 업로드 경로 | 토큰 노출, 산출물 변조 | 중 |
| T5 | CanvasA11yLayer DOM 미러링 | XSS 페이로드가 미러 노드에 그대로 주입 | **상** |
| T6 | `AccessibilityAudit.ts` 런타임 토글 | 권한 없는 사용자가 디버그 패널 활성화 | 하 |
| T7 | 스크린리더 ARIA live region | 안내 메시지에 사용자 입력 그대로 출력 → DOM 기반 XSS | 중 |

> **이소화 소견**: 이 스프린트는 "검증 도구"라 외부 침투 표면은 작으나, **리포트 산출물에 사기가 깃들기 쉽사옵니다.** PII·토큰이 JSON에 무방비로 실리지 않도록 봉인이 시급합니다.

---

## 1. 인증 (Authentication)

자동 감사 도구는 **로컬 CI/개발자 시스템에서만 실행되는 것을 전제**로 합니다. 그러나 인증 토큰을 다루는 흐름이 발생할 수 있어 다음을 확인합니다.

- [ ] **A1.** `scripts/a11y/audit.ts`는 `--url`이 `http://localhost:*` 또는 `https://aeterna-chronicle.*` 이외이면 **`--allow-external` 플래그 없이는 거부** (SSRF 1차 차단)
- [ ] **A2.** Playwright 채널이 인증 쿠키/세션 토큰을 사용해야 한다면, 토큰은 **환경변수 `A11Y_AUTH_TOKEN`로만 주입**, CLI 인자/로그/리포트에 평문 출력 금지 (`process.env` 마스킹 유틸 통과)
- [ ] **A3.** CI 환경에서 `GITHUB_TOKEN` 등 secrets가 axe-core 실행 컨텍스트(브라우저 페이지)로 **주입되지 않음** — 별도 step 분리 + `permissions: contents: read` 최소 권한
- [ ] **A4.** 런타임 디버그 패널(`AccessibilityAudit` UI)은 `import.meta.env.MODE === 'production'` 빌드에서 **번들 트리쉐이킹으로 제거** 또는 feature flag 차단
- [ ] **A5.** 외부 axe 룰셋을 fetch하는 로직이 있다면 **HTTPS + SRI(Subresource Integrity) 해시 고정**, npm 패키지 버전 핀 (캐럿 `^` 금지)

## 2. 인가 (Authorization)

- [ ] **Z1.** 감사 리포트(`tests/reports/a11y-*.json`)는 `.gitignore`에 등재되거나, 커밋 시 **PII 마스킹 후에만** 푸시 (CI 산출물은 artifact로만)
- [ ] **Z2.** GitHub Actions 워크플로 `permissions:` 블록은 **`contents: read` + `checks: write`**만 허용. `pull-requests: write`는 PR 코멘트에 한해 별도 step에서만 부여
- [ ] **Z3.** 산출물을 PR 코멘트로 게시할 때, 외부 fork PR에는 `pull_request_target`이 아닌 **`pull_request` 트리거**만 사용 (토큰 탈취 방지)
- [ ] **Z4.** 런타임 토글(`localStorage.aeterna_a11y_audit`)은 **"디버그 빌드 + 핫키 + 확인 다이얼로그"** 3중 게이트. 일반 플레이어가 우연히 활성화 못하도록
- [ ] **Z5.** CanvasA11yLayer의 미러 DOM은 `aria-hidden="false"`이되 `tabindex` 부여 권한은 **명시적 등록 API**를 통해서만 (전역 자동 부여 금지)

## 3. 입력 검증 (Input Validation)

자동 감사 코어가 받는 모든 입력 — CLI 인자, URL, DOM 텍스트, 사용자 게임 데이터 — 를 적사(赤砂)처럼 걸러냅니다.

### 3.1 CLI / 설정 입력

- [ ] **I1.** `--url` — RFC 3986 파싱 후 **scheme 화이트리스트 (`http`, `https`)**, hostname 정규식 검증, `file://`·`javascript:`·`data:` 거부
- [ ] **I2.** `--config` JSON은 **Zod 스키마**로 strict 파싱. 알 수 없는 키 reject, 깊이 제한 6레벨
- [ ] **I3.** `--out` 경로는 `path.resolve` 후 **저장소 루트 외부 접근 거부** (`..` 정규화 후 prefix 검사) — 임의 파일 덮어쓰기 차단
- [ ] **I4.** Probe ID 화이트리스트: `['contrast', 'keyboard', 'screen-reader', 'canvas', 'motion']` 외 거부
- [ ] **I5.** 타임아웃·재시도 횟수 등 수치 파라미터는 **min/max 범위 강제** (예: timeout 1s~120s)

### 3.2 DOM·게임 데이터 입력

- [ ] **I6.** axe-core 결과의 `node.html` 스니펫을 리포트에 실을 때 **HTML 엔티티 이스케이프 후 길이 512자로 절단** — 리포트가 마크다운/HTML로 렌더될 때 XSS 차단
- [ ] **I7.** 스크린리더 안내 메시지(ARIA live region에 들어가는 텍스트)는 **i18n 키 + 사전 정의 카피만 허용**. 사용자 입력(닉네임 등)은 `escapeHTML()` 통과 필수
- [ ] **I8.** CanvasA11yLayer가 게임 텍스트(NPC 대화)를 DOM 미러로 옮길 때, 원본은 Phaser 텍스트 객체이지만 **`textContent`로만 주입** (`innerHTML` 절대 금지) — DOM 기반 XSS 방어
- [ ] **I9.** 색맹 시뮬레이션 매트릭스 변환은 **고정 상수만 사용**. 외부 입력으로 행렬을 주입받지 않음
- [ ] **I10.** 키보드 트랩 탐지 Probe가 `tabindex` 값을 읽을 때 **숫자 파싱 실패 시 -1 fallback**, NaN으로 인한 무한 루프 방어

### 3.3 리포트 산출물 (T2 — 핵심 봉인)

- [ ] **R1.** JSON 리포트에서 **다음 필드는 항상 마스킹 또는 제외**:
  - URL의 query string (세션 ID 가능성)
  - localStorage·IndexedDB 키 값 전체
  - `<input>`의 `value` 속성
  - 쿠키 헤더, `Authorization` 헤더
  - 게임 세이브 데이터 (`save_*`, `aeterna_save_*` 키)
- [ ] **R2.** PII 마스킹 유틸 `redactPII(report)` 단일 진입점. 정규식: 이메일·전화·JWT(`eyJ...`)·UUID v4 자동 치환 (`[REDACTED]`)
- [ ] **R3.** 스크린샷 첨부 시 **민감 영역 블러 처리** — 또는 스크린샷 자체를 P0 스코프에서 제외하고 P1으로 이월
- [ ] **R4.** 리포트 파일은 `tests/reports/a11y-*.json` 패턴으로만 생성, **`.gitignore`에 `tests/reports/`** 등재 확인
- [ ] **R5.** CI artifact 보존 기간 **30일 이내**, public 저장소면 14일

## 4. 의존성·공급망 (T3)

- [ ] **D1.** `axe-core`, `@axe-core/playwright`, `pa11y` 등 **버전 정확히 핀** (`package.json` exact version), `package-lock.json` 커밋
- [ ] **D2.** `npm audit --production --audit-level=high` CI 게이트 통과 (audit가 a11y 스크립트 의존성도 포함하도록 devDependencies 검사 포함)
- [ ] **D3.** **Snyk 또는 GitHub Dependabot 알림** 활성화 — axe-core CVE 모니터링
- [ ] **D4.** 신규 a11y 의존성 추가 시 **공급망 체크리스트 통과**:
  - npm 다운로드 수 주간 1만 이상
  - 최종 커밋 6개월 이내
  - 메인테이너 2명 이상 또는 OpenSSF 스코어카드 7점 이상
- [ ] **D5.** Playwright 브라우저 바이너리는 **공식 CDN(`playwright.azureedge.net`)에서만** 다운로드. 미러 사용 금지

## 5. CI/CD 게이트 (T4)

- [ ] **C1.** `.github/workflows/a11y-audit.yml`은 `pinned action SHA`로 작성 (`uses: actions/checkout@<40-char-sha>`). 태그(`@v4`) 사용 금지
- [ ] **C2.** workflow_dispatch 수동 트리거에 **input validation** — branch 이름 정규식 `^[a-zA-Z0-9_/-]+$`
- [ ] **C3.** PR 코멘트로 a11y 리포트 게시 시, 코멘트 본문에 **PII 마스킹된 요약만** 포함. 전체 JSON은 artifact 링크로
- [ ] **C4.** Self-hosted runner 사용 금지 (현 시점). GitHub-hosted runner만 허용
- [ ] **C5.** 캐시 키(`actions/cache`)에 **신뢰할 수 없는 입력 포함 금지** — PR 제목, 사용자명 등

## 6. CanvasA11yLayer 특화 (T5 — Build Day 2 PoC)

CanvasA11yLayer는 Phaser 캔버스 위에 보이지 않는 DOM 트리를 만듭니다. 이 신규 표면을 별도로 봉인합니다.

- [ ] **CV1.** 미러 DOM은 `<div role="application" aria-label="...">` 컨테이너 안에 격리. **상위 문서 트리 오염 금지**
- [ ] **CV2.** 미러 노드 생성 API는 `createA11yNode({label, role, bounds})` 단일 진입점. `label`은 **i18n 키 또는 escapeHTML 통과한 문자열만**
- [ ] **CV3.** Phaser 텍스트 객체에서 가져온 원본 문자열에 `<`, `>`, `&` 포함 시 **자동 이스케이프**
- [ ] **CV4.** 미러 노드 라이프사이클은 Phaser 씬 destroy와 동기화. 좀비 노드 → DOM 부풀음 → 메모리 / 정보 누수 방지
- [ ] **CV5.** 키보드 포커스 트랩 — 미러 DOM에 들어간 포커스는 게임 종료/메뉴 닫힘 시 **반드시 캔버스로 복귀** (포커스 도난 방지)

## 7. ARIA Live Region (T7)

- [ ] **LV1.** `aria-live="polite"` 영역에 **사용자 입력 직접 주입 금지** — i18n 카피 + 안전 매개변수만
- [ ] **LV2.** 메시지는 `textContent`로만 설정. `innerHTML` 사용 시 코드 리뷰 P0
- [ ] **LV3.** 메시지 큐는 **rate-limit (초당 5회 이하)** — 스팸형 ARIA 알림으로 인한 스크린리더 장애 방어

## 8. 회귀 방지·모니터링

- [ ] **M1.** 본 체크리스트의 P0 항목 (★표) 위반 시 **CI fail** — `scripts/a11y/security-lint.ts` 작성 (의존성 버전 핀 검증 + `.gitignore` 검증 + redactPII 호출 강제)
- [ ] **M2.** Build 단계 PR diff에서 다음 패턴 자동 차단:
  - `innerHTML\s*=` (CanvasA11yLayer/screen_reader 디렉토리 한정)
  - `eval\(` · `new Function\(`
  - `tests/reports/.*\.json` 커밋 시도
- [ ] **M3.** 월 1회 `npm audit` + axe-core 릴리스 노트 리뷰. CVE 발견 시 24시간 내 패치
- [ ] **M4.** 적경홍 QA의 보안 회귀 테스트 케이스 5종 추가 (XSS payload 게임 닉네임 → ARIA live, 외부 URL → SSRF, `..` 경로 traversal, JWT 마스킹, CanvasA11yLayer textContent)

---

## 9. P0 (Build 5일 내) 필수 항목 ★

> 백능파 CEO HOLD 조건 "P0 스코프 동결" 준수. 아래 8개만 Build 단계에서 강제하옵니다.

| # | 항목 | 검증 방법 |
|---|------|-----------|
| ★1 | I1 — `--url` scheme/hostname 화이트리스트 | unit test 8 케이스 |
| ★2 | I3 — `--out` 경로 traversal 차단 | unit test 4 케이스 |
| ★3 | I8 — CanvasA11yLayer `textContent` 강제 | ESLint `no-inner-html` 룰 + 코드 리뷰 |
| ★4 | R1·R2 — `redactPII()` 호출 + JWT/email 정규식 | unit test + Playwright E2E 1 케이스 |
| ★5 | R4 — `tests/reports/` `.gitignore` 등재 | `git check-ignore` CI 게이트 |
| ★6 | D1·D2 — 의존성 버전 핀 + npm audit high | CI 게이트 |
| ★7 | C1 — Action SHA 핀 | `actionlint` CI 게이트 |
| ★8 | LV2 — ARIA live 영역 `innerHTML` 금지 | ESLint 룰 (screen_reader/ 디렉토리) |

P1·P2(나머지)는 다음 스프린트로 이월.

---

## 10. 위험도 요약 (이소화 종합 판정)

> **상**: T1(SSRF), T2(리포트 PII 유출), T5(CanvasA11yLayer XSS) — Build 단계 P0 봉인 필수
> **중**: T3(공급망), T4(CI), T7(ARIA XSS) — Build 후반 / Test 단계 검증
> **하**: T6(런타임 토글) — feature flag로 충분

기(氣)의 흐름은 본디 검증 도구이니 외부 침투 표면은 좁사오나, **리포트 산출물과 CanvasA11yLayer 미러 DOM**, 이 두 곳에 사기가 깃들기 쉽사옵니다. 위 P0 8항을 Build Day 1 안에 봉인하시옵소서.

— 끝 —
