# 에테르나 크로니클 — 데이터 검증 PR / 커밋 메시지 컨벤션 v1.0

> 작성: 진채봉 (Editor) 🪶
> 작성일: 2026-04-28
> 스프린트: Auto: 데이터 검증 시스템 구축 (Asset 단계)
> SSOT 위계: 본 문서 = PR/커밋 카피 1차 SSOT
> 적용 대상: 본 토픽 산출 모든 PR + 후속 데이터 추가 PR

---

## 0. 적용 시점

본 컨벤션은 **다음 두 종류 PR** 에 적용되옵니다.

1. **검증 시스템 PR** — schema/script/CI 추가·수정
2. **데이터 추가 PR** — 검증 시스템 통과를 약속하는 신규 콘텐츠

---

## 1. PR 제목 — 7 스코프 SSOT

```
data-validate(<scope>): <한 문장 요약>
```

| 스코프 | 의미 | 예시 |
|---|---|---|
| `schema` | JSON Schema 정의 추가/수정 | `data-validate(schema): monster.schema.json 신설 — REDUCTION 스코프` |
| `script` | 검증 스크립트 (`scripts/validate-data.ts`) | `data-validate(script): 4 게이트 골격 (Schema/Load/Audit/Report)` |
| `audit` | 참조 무결성/순환 탐지 로직 | `data-validate(audit): encounter→monster 끊긴 참조 0건 게이트 추가` |
| `balance` | outlier 통계 + ±2σ 게이트 | `data-validate(balance): 챕터별 HP 분포 outlier 탐지 추가` |
| `ci` | GitHub Actions / pre-commit 훅 | `data-validate(ci): pre-push에 npm run data:validate 추가` |
| `copy` | 에러 메시지 / 출력 포맷 | `data-validate(copy): 2줄 ERROR 포맷 16슬롯 ko/en 등록` |
| `docs` | SSOT/가이드/CHANGELOG | `data-validate(docs): user-guide v1.0 신설` |

> 한 PR이 두 스코프 이상을 건드릴 때는 **가장 핵심 스코프 하나만** 제목에 표기하고, 본문에서 부수 변경을 명시. PR을 쪼개는 길이 *항상* 더 옳사옵니다.

---

## 2. 커밋 메시지 — Conventional Commits 한국어

```
<type>(<scope>): <한 문장 요약>

<본문 — 왜(Why) 중심, 무엇(What)은 diff 가 말함>

Co-Authored-By: <에이전트 이름> <noreply@aeterna-team.local>
```

### 2.1 type ↔ scope 권장 조합

| type | 권장 scope | 예시 |
|---|---|---|
| `feat` | `schema`, `script`, `audit`, `balance` | `feat(schema): monster.schema.json 신설` |
| `fix` | `script`, `audit`, `copy` | `fix(audit): 순환 참조 탐지 시 무한 루프 방지` |
| `docs` | `docs` | `docs(data-validate): user-guide v1.0 추가` |
| `chore` | `ci`, `script` | `chore(ci): pre-push에 data:validate 추가` |
| `refactor` | `script`, `audit` | `refactor(script): 4 게이트를 별도 모듈로 분리` |
| `test` | `script`, `audit`, `balance` | `test(script): NO_COLOR 환경 출력 회귀 테스트` |

> **`feat!` (파괴적 변경)** 은 schema 변경 시에만. PR 본문 §파괴 변경에 마이그레이션 가이드 필수.

---

## 3. PR 본문 — 7 섹션 SSOT 🪶

```markdown
## 0. 자동 감사 (필수)

| 약속 | Before | After | Δ | 약속값 |
|---|---|---|---|---|
| Schema 통과율 | 95% | 100% | +5 | 100% |
| 끊긴 참조 | 3건 | 0건 | −3 | 0건 |
| Balance outlier (±2σ 초과) | — | 0건 | — | 0건 |
| ERROR path:line:field 노출 | 60% | 100% | +40 | 100% |

## 1. 변경 요약 (Why 중심)

(왜 이 변경이 필요했는가? 한 문단)

## 2. 산출물

- [ ] `data/schemas/monster.schema.json` (신설, ~120줄)
- [ ] `scripts/validate-data.ts` (신설, ~280줄)
- [ ] `client/src/constants/data_validation_messages.ts` (4슬롯)
- [ ] npm scripts 5종 등록 (`data:validate*`)

## 3. Schema 안정성 약속

- [ ] 하위 호환 — 기존 monsterManifest.json 무수정 PASS
- [ ] append-only — 필드 *제거* 없음 (deprecated 마킹만)
- [ ] required 키 추가 시 마이그레이션 스크립트 동봉

## 4. 참조 무결성 / 밸런스 메모

(끊긴 참조가 있었다면 어떻게 해결했는지, outlier가 있다면 의도된 것인지)

## 5. 봉인 항목 (이소화 비협상)

- [ ] 2줄 ERROR 포맷 (path 1줄 + reason 1줄) 보존
- [ ] PASS·WARN·ERROR 카운트 순서 보존
- [ ] NO_COLOR 자동 감지 (옵션 아닌 필수)
- [ ] outlier 면제는 정경패 + 백능파 승인 후

## 6. 5인 인계 체크

- [ ] 두련사 (아키텍처) — *선禪 4계* 순서 보존 검토
- [ ] 가춘운 (디자인) — 출력 포맷이 §4 표준과 1:1 일치
- [ ] 정경패 (PRD) — 4지표 약속 정합
- [ ] 적경홍 (QA) — `npm run data:validate` 1회 PASS, NO_COLOR=1 1회 PASS
- [ ] 이소화 (보안/정합) — 봉인 4항 무수정 확인

## 7. ship-gate 3-AND

- [ ] Schema 100% PASS
- [ ] 끊긴 참조 0건
- [ ] Balance outlier ±3σ 초과 0건 (±2σ는 WARN 허용)
```

---

## 4. 리뷰어 행동 가이드 — 5항 ✅

### 4.1 두련사 (아키텍처)
- *선禪 4계* (Schema → Load → Audit → Report) 순서 위반 ❌
- 4 게이트 간 결합도 — 한 게이트 실패가 다음을 멈추는가? (예: Schema 실패 시 Load 스킵)
- 캐시 정책 — `.ac/data-balance-stats.json` TTL/무효화 명시되어 있는가

### 4.2 가춘운 (디자인)
- §4 표준 출력 포맷 (2줄 ERROR) 1:1 일치
- ANSI 16색 외 신규 컬러 ❌ — `\x1b[38;5;` ❌
- NO_COLOR=1 환경에서 ANSI 누출 0건

### 4.3 정경패 (PRD)
- 4지표 약속 (§Schema 100% / Ref 0건 / Balance ±2σ / 노출 100%) 측정 가능한가
- outlier 면제 절차 — 본인 + 백능파 승인 트레일 PR 본문 §4 첨부

### 4.4 적경홍 (QA)
- `npm run data:validate` 1회 PASS 캡처
- `NO_COLOR=1 npm run data:validate` 1회 PASS 캡처
- 의도적 ERROR 1건 주입 → 정확히 path:line:field 노출되는지 캡처

### 4.5 이소화 (보안/정합)
- 봉인 4항 (2줄 ERROR / 카운트 순서 / NO_COLOR 필수 / outlier 승인) 무수정
- 외부 입력(JSON 파일)을 ajv 외 *raw eval* 로 처리하는 코드 없음
- 검증 실패 시 *경로 절단 없이* 전체 경로 노출 — 정보 차단 ❌

---

## 5. 자주 쓰는 PR 제목 예시 (복붙용) 📋

```
data-validate(schema): monster.schema.json 신설 — REDUCTION 스코프
data-validate(script): 4 게이트 골격 (Schema/Load/Audit/Report)
data-validate(audit): encounter→monster 끊긴 참조 0건 게이트 추가
data-validate(balance): 챕터별 HP 분포 outlier 탐지 추가
data-validate(ci): pre-push에 npm run data:validate 추가
data-validate(copy): 2줄 ERROR 포맷 16슬롯 ko/en 등록
data-validate(docs): user-guide / error-messages / pr-template SSOT 합본
```

---

## 6. 봉인 (이소화 비협상) 🔒

1. **PR 제목 7 스코프 외 추가 금지** — 새 스코프 필요 시 본 문서 갱신부터
2. **§0 자동 감사 표 4행 보존** — 행 추가는 가능, 제거 ❌
3. **§5 봉인 4항 무수정 체크** — 한 항목이라도 *X* 면 머지 ❌
4. **ship-gate 3-AND** — OR ❌, AND 만

---

## 7. 다음 단계 — 인계 체크 ✅

- [ ] `.github/PULL_REQUEST_TEMPLATE/data-validate.md` 등록 (본 문서 §3 미러)
- [ ] `commitlint.config.js` 에 `data-validate` 스코프 7종 등록
- [ ] CI workflow에 §4.4 적경홍 캡처 자동 첨부 (`actions/upload-artifact`)
