# 🌸 접근성 PR 본문 템플릿 v1.0

> 작성: 진채봉 (Editor) · 한 통의 PR 도 한 곡의 시조처럼 짜이옵소서
> 스프린트: Auto — WCAG 2.1 AAA 자동 접근성 감사
> 단계: 에셋 (텍스트 SSOT — PR 본문 / 커밋 메시지 컨벤션)
> 연계: `a11y-audit-cli-guide.md` · `a11y-audit-report-template.md` · `launch_checklist.md §2.17`
> 노출 위치: `.github/PULL_REQUEST_TEMPLATE/a11y.md` (Build 단계 인계 — 본 문서를 그대로 복사하옵소서)

---

## 0. 사용 규칙

1. 접근성 관련 PR (코드·문서 모두) 은 **반드시 본 템플릿 사용**.
2. `<!-- -->` 주석은 작성자 안내. 머지 전 모두 제거.
3. 체크박스는 **자가 점검** 용. 한 칸이라도 비어 있으면 리뷰 요청 금지.
4. `tests/reports/a11y/index.md` 자동 코멘트와 본 PR 본문은 **상호 보완** 입니다.

---

## 1. PR 제목 컨벤션

```
a11y(<scope>): <72자 이내 한 줄 요약>
```

| `<scope>` | 사용처 |
|-----------|--------|
| `colorblind` | 색맹 모드 / 시뮬레이션 / 시각 회귀 |
| `contrast` | 콘트라스트 7:1 / 4.5:1 / 3:1 |
| `keyboard` | 포커스 / 탭 순서 / 키 리바인딩 |
| `aria` | ARIA 라벨·역할·라이브 리전 |
| `screen-reader` | NVDA / JAWS / VoiceOver |
| `motion` | 모션 감소 / 자동 진행 |
| `caption` | 자막 / 시각화 큐 |
| `audit` | 감사 도구 / CI / 리포트 |
| `docs` | 가이드 / 카피 / VPAT |

### 제목 예시

```
a11y(colorblind): Protan/Deutan 시뮬 시각 회귀 임계 3% 적용
a11y(audit): Axe + ColorBlindSim 5종 Probe 통합 러너
a11y(docs): VPAT 2.4 자동 갱신 파이프라인 인덱스
```

---

## 2. PR 본문 템플릿 (그대로 복사)

```markdown
## 🌸 요약

<!-- 1-2 문장. "무엇을, 왜, 어느 게이트에 영향" 만 적사옵소서. -->

## 🎯 스프린트 / 토픽

- 스프린트: <!-- 예: Auto: WCAG 2.1 AAA 자동 접근성 감사 - 색맹 모드 -->
- 관련 launch_checklist 항: §2.17
- 관련 PRD: `docs/release/prd_a11y-aaa-audit.md`

## 🔍 변경 분류

- [ ] 신규 기능 (코드)
- [ ] 회귀 버그 수정
- [ ] 감사 도구 / CI 변경
- [ ] 문서 / 카피 / SSOT
- [ ] VPAT 갱신
- [ ] 기타: ____________

## 📊 자동 감사 결과

<!-- 다음 표는 `tests/reports/a11y/index.md` 의 헤더 표를 복사하옵소서. -->

| 등급 | 위반 | Δ 직전 main | 게이트 |
|------|------|-----------|--------|
| AA   | 0    | 0          | 🟢 PASS |
| AAA  | 0    | 0          | 🟢 PASS |
| 색맹 4종 | 통과 | -      | 🟢 PASS |
| 키보드 | 통과 | -        | 🟢 PASS |
| ARIA | 통과 | -          | 🟢 PASS |

> 🟢 = 머지 가능 / 🟡 = AAA 추세 감시 / 🔴 = 머지 차단

리포트 전문: <!-- CI 아티팩트 URL 또는 `tests/reports/a11y/index.md` 링크 -->

## 🧪 회귀 테스트 케이스

<!-- 추가/수정한 케이스 ID. test-case-template.md 형식 준수. -->

- [ ] TC-A11Y-CB-001 …
- [ ] TC-A11Y-KB-001 …
- [ ] TC-A11Y-AR-001 …

## 📝 i18n 키 변경

<!-- a11y-error-messages.md 키를 추가/변경했다면 ko/en/ja 3로케일 동시 반영 확인. -->

- [ ] `a11y-error-messages.md` 갱신 완료 (1차 SSOT)
- [ ] `client/src/i18n/{ko,en,ja}.json` 단일 PR 동기화 완료
- [ ] 신규 키 ____ 개 / 변경 키 ____ 개

## 📚 문서 갱신

- [ ] `a11y-user-guide.md` (사용자 영향 시)
- [ ] `a11y-audit-cli-guide.md` (CLI / npm script 변경 시)
- [ ] `CHANGELOG.md` 항목 추가
- [ ] `launch_checklist.md §2.17` 상태 갱신
- [ ] VPAT 2.4 영향 여부: ☐ 있음 / ☐ 없음

## 🎨 스크린샷 / 영상

<!-- 색맹 4종 비교 / 포커스 링 가시성 / 스크린 리더 출력 캡처 등 -->

| 모드 | Before | After |
|------|--------|-------|
| Normal | | |
| Protan | | |
| Deutan | | |
| Tritan | | |

## ⛔ 알려진 제약 / TODO

<!-- 본 PR 에서 의도적으로 미해결로 둔 항목과 후속 PR 번호. -->

## 👥 팀 인계

- [ ] 두련사 (SRE) — CI 워크플로 영향 확인
- [ ] 적경홍 (QA) — 회귀 시나리오 추가 검수
- [ ] 이소화 (Security) — 감사 산출물 PII 노출 0건 재확인
- [ ] 진채봉 (Editor) — 문서/카피 톤 검수
- [ ] 백능파 (PM) — 머지 게이트 최종 승인

---

🤖 본 PR 은 `a11y-pr-template.md` v1.0 을 따릅니다.
```

---

## 3. 커밋 메시지 컨벤션

### 3.1 형식

```
a11y(<scope>): <한 줄 요약, 72자 이내>

<본문 — 왜 이 변경이 필요한지, 무엇을 바꾸지 않았는지>

Refs: launch_checklist §2.17, BUG-A11Y-XXX
Co-Authored-By: <동반 에이전트 이름> <noreply@anthropic.com>
```

### 3.2 좋은 예 / 나쁜 예

| 구분 | 메시지 | 평 |
|------|--------|---|
| 🟢 좋음 | `a11y(keyboard): 인벤토리 그리드 스킵 링크 추가 (Tab 17→3 단축)` | 범위·효과 명확 |
| 🟢 좋음 | `a11y(aria): 전투 ATB 게이지 aria-valuenow 라이브 갱신` | 무엇을 어떻게 |
| 🔴 나쁨 | `fix: 접근성 개선` | 범위 불명 |
| 🔴 나쁨 | `a11y: 여러 가지 수정` | 일괄 커밋 — 분할 요청 |

### 3.3 본문 작성 권고

- **왜** 변경했는지 1-3 문장.
- AAA 영향 시 **위반 키 인용**: `wcag2aaa.color-contrast-enhanced` 등.
- 시각 회귀 베이스라인을 의도적으로 갱신했다면 그 이유 명시.
- 의존성·타이밍 등 **부수 효과 없음** 을 한 줄로 단언.

---

## 4. 리뷰어 행동 가이드 (참고)

> 리뷰어는 본 템플릿이 갖추어졌는지부터 확인하고, 그 다음에 코드를 보옵소서.

1. ☐ PR 제목 `a11y(<scope>):` 형식 일치
2. ☐ 자동 감사 결과 표 PASS 여부
3. ☐ 시각 회귀 베이스라인 변경 시 **근거 문장** 존재
4. ☐ i18n 키 변경 시 ko/en/ja 동시 반영
5. ☐ `launch_checklist §2.17` 상태 갱신 여부

> 본 4번이 누락된 PR 은 **머지 보류**. 진채봉이 톤·문서를 보강한 뒤 재요청하옵소서.
