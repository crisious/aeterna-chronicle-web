# 에테르나 크로니클 — README §🛡️ 데이터 검증 골격 SSOT v1.0

> 작성: 진채봉 (Editor) 🪶
> 작성일: 2026-04-28
> 스프린트: Auto: 데이터 검증 시스템 구축 (Asset 단계)
> SSOT 위계: 본 문서 = README 절(節) 골격 1차 SSOT
> 통합 대상: `README.md` — `§💾 세이브·로드` 절과 `§📁 문서 링크` 절 *사이* 에 신설
> 정합 대상: 진채봉 — `data-validation-user-guide.md` (1차 SSOT 정본)

---

## 0. 통합 위치 — README 어디에 끼우는가 📍

`README.md` 의 다음 절(節) **사이** 에 신설하옵니다.

```
... §🎓 첫 30분 — 신규 플레이어 학습 보장 ...
... §💾 세이브·로드 시스템 ...
[👇 여기에 §🛡️ 데이터 검증 신설]
... §📁 문서 링크 ...
```

> 이유: 세이브·로드 다음으로 *콘텐츠 운영자* 가 가장 자주 만나는 시스템. 절 위치는 운영 빈도순.

---

## 1. 상단 배지 — 2종 신설 🏷️

`README.md` 상단 배지 영역에 다음 2배지 추가.

```markdown
[![Schema Validation](https://img.shields.io/badge/Schema%20Validation-100%25-brightgreen?style=for-the-badge)](#-데이터-검증)
[![Reference Integrity](https://img.shields.io/badge/Reference%20Integrity-0%20broken-success?style=for-the-badge)](#-데이터-검증)
```

> 약속 수치 변경 시 본 골격 §1 + 사용자 가이드 §0 + design-system_data-validation.md 동시 갱신 (위에서 아래로만)

---

## 2. README §🛡️ 데이터 검증 — 본문 골격 (복붙 가능)

```markdown
## 🛡️ 데이터 검증 — 콘텐츠 정합성 자동 보장

> Phase 52 누적 데이터(스킬·아이템·몬스터·시나리오 JSON 수백~수천 건) 위에 콘텐츠 1건 추가할 때마다, 검증 시스템이 4 게이트로 정합성을 약속하옵니다.

### 한눈 지표 (4 약속)

| 약속 | 측정 | 목표 |
|---|---|---|
| **Schema 통과** | ajv 검증 PASS율 | **100%** (전 데이터 파일) |
| **참조 무결성** | 끊긴 참조 수 | **0건** (skill→effect, item→category, encounter→monster) |
| **밸런스 정합** | outlier (HP/데미지/EXP) | **±2σ 내** |
| **실패 노출** | path:line:field 표기율 | **100%** (모든 ERROR 줄) |

### 빠른 시작 — 3명령

```bash
# 콘텐츠 추가 직후 (4 게이트 풀)
npm run data:validate

# 도메인별 빠른 검증
npm run data:validate:monster

# 변경 감지 watch 모드
npm run data:validate -- --watch
```

### 4 게이트 흐름 (두련사 *선禪 4계*)

| # | 게이트 | 역할 | 실패 시 |
|---|---|---|---|
| 1 | **Schema** | ajv 검증 (JSON Schema draft-2020-12) | ❌ 머지 차단 |
| 2 | **Load** | 실제 적재 (파싱·중복 ID) | ❌ 머지 차단 |
| 3 | **Audit** | 참조 무결성 (skill→effect 등 3종) | ❌ 머지 차단 |
| 4 | **Report** | 밸런스 outlier ±2σ 통계 | ⚠️ ±3σ 초과만 차단 |

### 자세한 가이드

- 📖 [사용자 가이드](docs/release/data-validation-user-guide.md) — 1차 SSOT (정본)
- 🎨 [디자인 시스템](docs/release/design-system_data-validation.md) — 출력 포맷·ANSI 토큰
- ❌ [에러 메시지 카피](docs/release/data-validation-error-messages.md) — 16슬롯 ko/en
- 📋 [PR / 커밋 컨벤션](docs/release/data-validation-pr-template.md) — 7 스코프

### ship-gate 3-AND (예고)

본 시스템이 만족하는 3-AND 게이트 — 셋 다 PASS여야 콘텐츠 PR 머지 가능:

1. ✅ Schema 100% PASS (`npm run data:validate` exit 0)
2. ✅ 끊긴 참조 0건 (`npm run data:audit:refs` exit 0)
3. ✅ Balance outlier ±3σ 초과 0건 (±2σ는 WARN 허용)

> 본 게이트는 적경홍 QA 단계에서 자동화 — `launch_checklist §2.22` SSOT 신설 예정
```

---

## 3. 봉인 (이소화 비협상) 🔒

본 README 절은 다음 4항이 *임의 변경 금지* 이옵니다.

1. **4 약속 수치** — 100% / 0건 / ±2σ / 100% (변경 시 백능파 승인)
2. **4 게이트 순서** — Schema → Load → Audit → Report (두련사 *선禪 4계*)
3. **빠른 시작 3명령** — 추가 가능, 제거/이름 변경 ❌
4. **ship-gate 3-AND** — OR ❌, AND 만

---

## 4. 통합 절차 (계섬월 Build 인계) ✅

본 골격을 실제 `README.md` 에 통합하는 5단계 절차.

1. `README.md` 에서 `§💾 세이브·로드` 절 종료점 (`---`) 위치 식별
2. 본 문서 §1 배지 2종을 상단 배지 블록에 추가
3. 본 문서 §2 본문을 `§💾` 와 `§📁 문서 링크` *사이* 에 통째로 삽입
4. 링크 4종 (`docs/release/data-validation-*.md`) 실제 파일 존재 확인 — 없으면 stub 생성
5. CHANGELOG `§1.0.0-rc.4 Added` 에 본 통합 항목 미러 (진채봉 — `data-validation-changelog-draft.md` 참조)

---

## 5. 다음 단계 — 인계 체크 ✅

- [ ] README.md 에 §🛡️ 데이터 검증 절 신설 (계섬월 Build)
- [ ] 상단 배지 2종 추가 (`Schema Validation 100%`, `Reference Integrity 0 broken`)
- [ ] `data-validation-user-guide.md` 등 4편 링크 작동 확인
- [ ] `launch_checklist §2.22` (데이터 검증) SSOT 신설 (정경패 합의 후)
- [ ] CHANGELOG `§1.0.0-rc.4 Added` 미러 항목 추가 (진채봉 — Ship 단계)
