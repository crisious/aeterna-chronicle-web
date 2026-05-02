# 에테르나 크로니클 — 데이터 검증 시스템 CHANGELOG 항목 초안 v1.0

> 작성: 진채봉 (Editor) 🪶
> 작성일: 2026-04-28
> 스프린트: Auto: 데이터 검증 시스템 구축 (Asset 단계)
> SSOT 위계: 본 문서 = CHANGELOG 항목 *초안* SSOT — 9단계 진행에 따라 _TBD_ 슬롯이 실측 수치로 채워지옵니다.
> 통합 대상: `CHANGELOG.md` § `[1.0.0-rc.4]` Added (Ship 단계 — 진채봉)
> 정합 대상:
> - 사용자 가이드: `data-validation-user-guide.md`
> - 에러 메시지: `data-validation-error-messages.md`
> - PR 컨벤션: `data-validation-pr-template.md`
> - README 골격: `data-validation-readme-skeleton.md`
> - 디자인 시스템: `design-system_data-validation.md` (가춘운)

---

## 0. 본 초안의 사용 방식 📖

본 문서는 **9단계 Auto 스프린트가 진행되며 _TBD_ 슬롯이 실측 수치로 채워지는** 살아 있는 초안이옵니다.

| 단계 | 채워지는 슬롯 | 채우는 에이전트 |
|---|---|---|
| Asset (현재) | 항목 골격, 산출물 LOC, 약속 4지표 | 진채봉 |
| Build | npm scripts 등록 명령 5종, 코드 LOC, 4 게이트 구현 | 계섬월 |
| Review | PR 번호, 리뷰어 5인 승인 트레일 | 정경패 |
| Test | 4지표 실측 (Schema PASS율 / 끊긴 참조 / outlier / 노출률) | 적경홍 |
| Ship | 최종 LOC, 커밋 SHA, 머지 시각 | 진채봉 |

> 단계마다 본 문서를 *덮어쓰지 말고* 누적하옵소서. _TBD_ → 실측값 치환만.

---

## 1. CHANGELOG 항목 초안 (복붙 가능)

```markdown
## [1.0.0-rc.4] — Unreleased

### Added

- **에테르나 크로니클 데이터 검증 시스템 — 텍스트 에셋 묶음 v1.0** (Sprint Auto-Data-Validation, 2026-04-28) — 진채봉 Editor 합본 정리
  - Phase 52에서 콘텐츠 728/728 · 어셋 1,454편을 갖췄으나, 신규 콘텐츠 1건 추가 시마다 수동 검증 비용이 누적되는 결을 메우고자, 사람 손에 잡히는 텍스트 에셋 5편 + 디자인 시스템 합본 + README §🛡️ 데이터 검증 절을 묶어 두옵니다.
  - 약속 4지표: 모든 데이터 파일 schema validation 통과 **100%** · 참조 끊김 **0건** · balance outlier **±2σ 내** · ERROR path:line:field 노출 **100%** — `launch_checklist §2.22` SSOT 신설 예정
  - 4 게이트 흐름 (두련사 *선禪 4계*): Schema (ajv) → Load (실제 적재) → Audit (참조 무결성 3종) → Report (밸런스 ±2σ outlier)
  - 산출물 7건 / 총 ~1,389 LOC (SSOT 5편 808줄 + 디자인 시스템 206줄 + assets 합본 375줄) + README §🛡️ 신설 ~70줄 + `launch_checklist §2.22` 신설 ~25줄 = **~1,484줄** — Build(계섬월) 단계 통합 완료, Review(정경패) 인계
  - **README §🛡️ 데이터 검증 절 통합 완료** (`README.md` §💾 세이브·로드 ↔ §📁 문서 링크 사이) — 한눈 지표 4 약속 표 · 빠른 시작 3명령(`npm run data:validate*`) · 4 게이트 흐름 표 · 자세한 가이드 링크 4개 · ship-gate 3-AND 예고 · 상단 배지 2종(`Schema Validation 100%` · `Reference Integrity 0 broken`) 추가
  - **데이터 검증 시스템 사용자 가이드 v1.0** (`docs/release/data-validation-user-guide.md`) — 진채봉 Editor
    - 9개 절 + FAQ 7건 — 한 손 흐름도(Schema → Load → Audit → Report) · 도메인 5종 schema 표(monster/item/skill/encounter/scenario) · 참조 3종 표(skill→effect/item→category/encounter→monster) · 밸런스 outlier 정책 표(±1σ/±2σ/±3σ) · 출력 모드 3종(TTY/NO_COLOR/JSON) · npm 명령어 5종
    - 본 문서가 1차 SSOT — `README.md §🛡️ 데이터 검증` 메아리, 약속 수치 변경 시 §0 표 동시 갱신
  - **데이터 검증 에러 메시지 카피 SSOT v1.0** (`docs/release/data-validation-error-messages.md`) — 진채봉 Editor
    - 4종 게이트(schema · load · ref · balance) × 4 상태(PASS/WARN/ERROR/BLOCK) = **16개 카피 슬롯** + ko/en 동시 = **32줄**
    - 키 규약 `data.<domain>.<gate>.<state>.<reason>` · 코드 상수 매핑 (계섬월 인계용 `client/src/constants/data_validation_messages.ts` 스니펫, REDUCTION 스코프 4슬롯 우선)
    - 톤 5계명(가춘운 디자인 미러): 원인→처방 · 수치는 사실 · 경로 절단 금지 · 시는 hint만 · 도메인 키 규약
  - **데이터 검증 PR / 커밋 메시지 컨벤션 v1.0** (`docs/release/data-validation-pr-template.md`) — 진채봉 Editor
    - PR 제목 7 스코프 (`schema`/`script`/`audit`/`balance`/`ci`/`copy`/`docs`)
    - PR 본문 7개 섹션 — 자동 감사 표(Before/After/Δ/약속 4행) · Schema 안정성 약속(하위 호환·append-only) · 참조/밸런스 메모 · 봉인 4항 · 5인 인계 체크
    - 리뷰어 행동 가이드 5항 (이소화 봉인 비협상 — 2줄 ERROR · 카운트 순서 · NO_COLOR 필수 · outlier 면제 절차) + ship-gate 3-AND
  - **README §🛡️ 데이터 검증 절 — 골격 SSOT v1.0** (`docs/release/data-validation-readme-skeleton.md`) — 진채봉 Editor
    - `README.md §🛡️ 데이터 검증` 신설 골격 — 한눈 지표 4 약속 표 · 빠른 시작 3명령 · 4 게이트 흐름 표 · 자세한 가이드 링크 4개 · ship-gate 3-AND 예고
    - 약속 수치 임의 갱신 금지 — 백능파(Strategy) 승인 필수 명시
    - 봉인 항목 4종 (4 약속 수치 · 4 게이트 순서 · 빠른 시작 3명령 · 3-AND) — 이소화 비협상
    - 선택 배지 2종 (`Schema Validation 100%` · `Reference Integrity 0 broken`) 추가 안내
  - **데이터 검증 CHANGELOG 항목 초안 v1.0** (`docs/release/data-validation-changelog-draft.md`) — 진채봉 Editor
    - 본 항목의 출전 — 9단계 Auto 스프린트가 진행됨에 따라 Build/Review/Test/Ship 단계에서 실측 수치로 _TBD_ 슬롯을 메우도록 가이드
  - 연관 SSOT 정합:
    - 디자인 시스템 `docs/release/design-system_data-validation.md` (가춘운, 2026-04-28) — ANSI 16색 토큰 + 2줄 ERROR 표준 출력 + NO_COLOR 폴백 SSOT
    - 아키텍처 두련사 *선禪 4계* — Schema → Load → Audit → Report (4 단계 그대로 본 문서들에 미러)
    - 게이트 백능파 **REDUCTION** — `monster_data.json` 단일 ajv 검증 PASS + 1커밋 머지
```

---

## 2. _TBD_ 슬롯 채움 가이드 — 단계별 ✏️

### 2.1 Build 단계 (계섬월 인계 후)

다음 _TBD_ 들이 *실측 LOC 와 실측 명령* 으로 치환되옵니다.

| _TBD_ 위치 | 측정 방법 | 예상 형태 |
|---|---|---|
| 산출물 SSOT 5편 LOC 합계 | `wc -l docs/release/data-validation-*.md` | `~1,200줄` |
| README §🛡️ 신설 줄 수 | `git diff README.md \| wc -l` | `~80줄` |
| 코드 LOC (게이트 4종) | `wc -l scripts/validate-data.ts` | `~280줄` |
| Schema LOC | `wc -l data/schemas/monster.schema.json` | `~120줄` |

### 2.2 Test 단계 (적경홍 측정 후)

약속 4지표의 *실측값* 이 채워지옵니다.

| 약속 | 측정 명령 | 예상 PASS |
|---|---|---|
| Schema 통과 | `npm run data:validate -- --json` → `pass_rate` | `100%` |
| 참조 끊김 | `npm run data:audit:refs -- --json` → `broken_count` | `0건` |
| Balance outlier | `npm run data:audit:balance -- --json` → `over_2sigma` | `0~몇건` |
| 실패 노출 | NO_COLOR 환경 의도 ERROR 1건 → path:line:field 정규식 매칭 | `100%` |

### 2.3 Ship 단계 (진채봉 최종 정리)

- [ ] 모든 _TBD_ → 실측값 치환
- [ ] 커밋 SHA / PR 번호 / 머지 시각 추가
- [ ] `CHANGELOG.md` § `[1.0.0-rc.4]` Added 에 본 항목 통째 이식
- [ ] 본 초안 문서는 보관 — 회고에서 *지연된 종결* 패턴 점검 자료로 활용

---

## 3. 회고 연결 — 선행 스프린트 패턴 거울 🪞

세이브·로드 회고(`retro_save-load-stability-sprint.md`)에서 드러난 **과녁 보지 않은 활** 패턴 — *SSOT는 합주되었으나 코드 머지가 0커밋에 머무름* — 을 본 스프린트는 **REDUCTION 게이트** 로 막사옵니다.

| 위험 | 막는 장치 |
|---|---|
| SSOT만 풍성·코드 0커밋 | 백능파 게이트: `monster_data.json` 단일 ajv 검증 PASS + 1커밋 머지 (REDUCTION) |
| 4지표가 약속에만 머무름 | Test 단계 §2.2 실측 명령 4종 의무 |
| README 통합이 미루어짐 | Build 단계 §4 통합 5단계 절차 |
| _TBD_ 가 영구 _TBD_ 로 박제 | 본 문서 §2 단계별 채움 가이드 + Ship 체크 §2.3 |

---

## 4. 봉인 (이소화 비협상) 🔒

1. **CHANGELOG 항목 골격** — §1 의 *Added* 항목 구조 (5편 + README + launch_checklist) 무수정
2. **4 약속 수치** — 100% / 0건 / ±2σ / 100% (수치 하향 시 백능파 승인)
3. **REDUCTION 스코프** — `monster_data.json` 단일 + 1커밋 머지 (확장 시 별도 스프린트)
4. **단계별 채움** — _TBD_ 는 *반드시* 해당 단계 에이전트가 채우고, 다른 단계가 임의로 채우지 않음

---

## 5. 다음 단계 — 인계 체크 ✅

- [ ] Build (계섬월): §2.1 _TBD_ 4슬롯 채움
- [ ] Review (정경패): PR 본문 §0 자동 감사 표 4행 작성
- [ ] Test (적경홍): §2.2 실측 4지표 PASS 캡처
- [ ] Ship (진채봉): §2.3 모든 _TBD_ 치환 → CHANGELOG.md 이식
- [ ] Reflect (진채봉 + 심요연): 본 문서를 회고 입력으로 활용 — *지연된 종결* 재발 점검
