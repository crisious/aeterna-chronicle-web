# 🌸 접근성 자동 감사 리포트 템플릿 v1.0

> 작성: 진채봉 (Editor)
> 스프린트: Auto — WCAG 2.1 AAA 자동 접근성 감사
> 단계: 에셋 (리포트 SSOT 템플릿)
> 연계: `scripts/a11y/audit.ts` 출력 → `tests/reports/a11y/summary.json` → 본 템플릿 자동 충진
> 원칙: **사람이 한 화면에서 게이트 결과를 판단**할 수 있어야 한다.

---

## 사용법

1. `npm run a11y:audit` 실행 후 `tests/reports/a11y/summary.json` 생성.
2. `scripts/a11y/render-report.ts` (Build 단계 인계) 가 본 템플릿에 값을 채워 `tests/reports/a11y/index.md` 로 출력.
3. PR 본문에 `index.md` 의 §1 요약 표를 붙여넣어 머지 게이트 판단 근거로 사용.

> 변수 표기: `{{KEY}}` 는 자동 치환. 표기되지 않은 값은 `—` 로 출력.

---

## 1. 한눈에 보는 게이트 결과 — `{{RUN_ID}}`

| 항목 | 값 |
|------|------|
| 실행 시각 | `{{TIMESTAMP_KST}}` |
| 커밋 | `{{COMMIT_SHA}}` (`{{BRANCH}}`) |
| WCAG 수준 | **{{WCAG_LEVEL}}** (목표: AAA) |
| 머지 게이트 | {{GATE_BADGE}}  *(🟢 PASS / 🔴 BLOCK / 🟡 WARN)* |
| AA 위반 | `{{AA_VIOLATIONS}}` 건 |
| AAA 위반 | `{{AAA_VIOLATIONS}}` 건 |
| 신규 회귀 | `{{NEW_REGRESSIONS}}` 건 (vs `main`) |
| 스캔 화면 수 | `{{SCREENS_SCANNED}}` / `{{SCREENS_TOTAL}}` |

> 게이트 규칙: AA 위반 ≥ 1 → 🔴 BLOCK · AAA 위반 ≥ 1 → 🟡 WARN · 그 외 🟢 PASS.

---

## 2. Probe 별 결과

| Probe | 결과 | 위반 | 비고 |
|-------|------|------|------|
| Axe (`@axe-core/playwright`) | {{AXE_STATUS}} | {{AXE_COUNT}} | {{AXE_NOTE}} |
| ColorContrast (7:1 / 4.5:1) | {{CONTRAST_STATUS}} | {{CONTRAST_COUNT}} | {{CONTRAST_NOTE}} |
| ColorBlindSim (4종) | {{CBS_STATUS}} | {{CBS_COUNT}} | {{CBS_NOTE}} |
| KeyboardTraverser | {{KT_STATUS}} | {{KT_COUNT}} | {{KT_NOTE}} |
| AriaContract | {{ARIA_STATUS}} | {{ARIA_COUNT}} | {{ARIA_NOTE}} |

---

## 3. 위반 상세 (TOP 10)

| # | 규칙 | 수준 | 위치 | 화면 | 권고 |
|---|------|------|------|------|------|
{{#each TOP_VIOLATIONS}}
| {{index}} | `{{rule}}` | {{level}} | `{{selector}}` | `{{screen}}` | {{recommendation}} |
{{/each}}

> 전체 목록은 `tests/reports/a11y/violations.json` 참조.

---

## 4. 색맹 시뮬 스냅샷

| 모드 | PNG | 식별 가능 게이지 | 미달 게이지 |
|------|-----|------------------|--------------|
| Protanopia | `{{CBS_PROTAN_PNG}}` | {{CBS_PROTAN_OK}} | {{CBS_PROTAN_FAIL}} |
| Deuteranopia | `{{CBS_DEUTER_PNG}}` | {{CBS_DEUTER_OK}} | {{CBS_DEUTER_FAIL}} |
| Tritanopia | `{{CBS_TRITAN_PNG}}` | {{CBS_TRITAN_OK}} | {{CBS_TRITAN_FAIL}} |
| Achromatopsia | `{{CBS_ACHROM_PNG}}` | {{CBS_ACHROM_OK}} | {{CBS_ACHROM_FAIL}} |

---

## 5. 키보드 트래버스 결과

| 화면 | Tab 순환 | 트랩 | 가시 포커스 |
|------|---------|------|-------------|
{{#each KEYBOARD_SCREENS}}
| `{{name}}` | {{cycleStatus}} | {{trapCount}} | {{focusVisibleStatus}} |
{{/each}}

---

## 6. 스크린 리더 호환성 (수동 보강)

> Probe 자동화는 ARIA 컨트랙트만 검증합니다. 실 리더 검증은 적경홍 QA 가 다음 표를 채웁니다.

| 리더 | 시나리오 | 결과 | 메모 |
|------|---------|------|------|
| NVDA | A11Y-SR-001 | ⚪ | — |
| JAWS | A11Y-SR-002 | ⚪ | — |
| VoiceOver | A11Y-SR-003 | ⚪ | — |

---

## 7. launch_checklist 토글 결과

| 항목 | 이전 | 이번 |
|------|------|------|
| §2.17 — 자동 접근성 감사 | ⚪ | {{LC_2_17}} |
| §4.1 — 화면 낭독기 호환 | 🔴 | {{LC_4_1}} |
| §4.2 — 색맹 모드 | 🟡 | {{LC_4_2}} |
| §4.3 — 키보드 풀-내비 | 🟡 | {{LC_4_3}} |
| §4.4 — VPAT 2.4 | 🔴 | {{LC_4_4}} |

> 본 표 갱신은 `scripts/a11y/update-checklist.ts` (Build 단계 인계) 가 수행.

---

## 8. 추적 BUG 목록

| ID | 영역 | 우선순위 | 상태 | 첫 감지 |
|----|------|----------|------|---------|
{{#each BUGS}}
| `{{id}}` | {{area}} | {{priority}} | {{status}} | `{{firstSeen}}` |
{{/each}}

> 신규 BUG 자동 등록 규칙: AAA 위반 1회 이상 + `main` 비교 시 회귀 → `BUG-A11Y-XXX` 자동 발급.

---

## 9. 인계 — 다음 단계 (Build → Test)

- [ ] AA 위반 0건 유지 — 머지 게이트 ON
- [ ] AAA 위반 ≤ 5건으로 수렴 (Test 단계 목표)
- [ ] `summary.json` → VPAT 2.4 자동 갱신 파이프라인 가동 확인
- [ ] 적경홍 QA 가 §6 스크린 리더 표 충진
- [ ] 진채봉 Editor 가 Ship 단계에서 `release_notes_v1.0-rc.3.md` 에 §1 요약 표 인용

---

## 변경 이력

| 버전 | 날짜 | 변경 | 작성 |
|------|------|------|------|
| 1.0 | 2026-04-26 | 초안 — 9개 절 + Mustache 변수 SSOT | 진채봉 |
