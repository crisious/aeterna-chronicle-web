# 개발자 빌드-검증 사이클 — PR / 커밋 메시지 컨벤션 v1.0

> 작성: 진채봉 Editor
> 작성일: 2026-04-30
> 스프린트: Auto — 에테르나 크로니클 개발자 빌드-검증 사이클 단축 (대표 본인 본)
> SSOT 위계: 1차 — `.github/PULL_REQUEST_TEMPLATE.md`의 *dev-cycle 섹션* 미러 대상

---

## 1. PR 제목 컨벤션

### 1.1 형식

```
{type}(dev-cycle/{scope}): {요약}
```

### 1.2 7 스코프

| 스코프 | 적용 | 예시 |
|---|---|---|
| `boot` | dev server 부팅 단축 / 진행률 바 | `feat(dev-cycle/boot): vite 부팅 진행률 4단계 바 추가` |
| `smoke` | qa:smoke 시나리오 자동화 | `feat(dev-cycle/smoke): 전투 ATB 시나리오 headless 검증 추가` |
| `build` | `npm run build` 단축 / 청크 분리 | `perf(dev-cycle/build): manualChunks battle 분리로 12s 단축` |
| `error` | 에러 카드 렌더러 | `feat(dev-cycle/error): TS 에러 카드 60칸 폭 단일 출력` |
| `cli` | CLI 컬러 토큰 / OSC 8 링크 | `feat(dev-cycle/cli): cli-colors.ts 5상태 ANSI 팔레트` |
| `discord` | Discord 봇 알림 embed | `feat(dev-cycle/discord): 빌드 실패 시 4색 embed 푸시` |
| `docs` | 가이드/SSOT 문서 갱신 | `docs(dev-cycle): 약속 4지표 실측 갱신` |

---

## 2. PR 본문 7 섹션

### 2.1 템플릿 (그대로 복사)

```markdown
## 🤖 빌드-검증 사이클 측정

| 메트릭 | base (main) | this PR | Δ | 약속 | 상태 |
|---|---|---|---|---|---|
| dev server 부팅 | 4.2s | **4.8s** | +0.6s | ≤ 5.0s | ⚠ |
| `qa:smoke` 총 소요 | 4m 47s | **5m 19s** | +32s | ≤ 5m 00s | ✗ |
| `build` 시간 | 78s | 81s | +3s | ≤ 90s | ✓ |
| TS 에러 수 | 0 | 0 | 0 | = 0 | ✓ |

**결과: 4/4 중 2개 회귀** — `qa:smoke` 약속 위반 (FAIL)

## 🎯 핫스팟 매트릭스 (Top 3)

| # | 파일 | LOC Δ | 영향 게이트 | 비고 |
|---|---|---|---|---|
| 1 | `client/src/scenes/BattleScene.ts` | +312-340 (+28) | smoke, runtime | ATB 큐 로직 추가 |
| 2 | `data/monsters.json` | +12 entries | runtime | wraith_lv3~lv14 추가 |
| 3 | `client/src/scenes/AtbGauge.ts` | +84:23 변경 | build | TS2551 fix 포함 |

## 🔴 회귀 4항 봉인 점검

- [ ] dev server 부팅 ≤ 5.0s
- [x] qa:smoke 핵심 시나리오 ≤ 5min
- [ ] 프로덕션 빌드 ≤ 90s
- [x] TS 에러 = 0

## 🧪 자동 측정 로그

📁 측정 로그: `logs/perf-pr-{number}.json`
🔍 회귀 원인 후보: `BattleScene.ts` (312-340 신설), `monsters.json` (+12 entries)

## 💡 회귀 사유 (1 ⚠ / 1 ✗ 인 경우 필수)

> 본 PR은 wraith 레벨 12종을 추가하므로 monster preload 시간이 +0.6s 늘어났사옵나이다.
> qa:smoke의 통합 5분 시나리오에서 OOM 발생 — battle 4 frame 9842. 이는 별도 PR `#XXX`에서 텍스처 정리 누락 fix 예정이옵나이다.

## 🤝 5인 인계 체크

- [ ] 두련사(아키텍처) — vite plugin 진입점 영향 검토
- [ ] 가춘운(디자인) — 에러 카드 봉인 5항 (너비 60칸 / 이모지 4종 / fix 1줄 / 스택 ≤ 4줄 / 카드 1개당 1 에러)
- [ ] 이소화(Review) — Ship Gate 4-AND 검증
- [ ] 적경홍(Test) — 약속 4지표 실측 캡처 첨부
- [ ] 심요연(Ship) — Discord embed 미리보기 (옵션)

## 📜 봉인 4항

- [ ] 약속 4지표 수치 임의 갱신 X (백능파 승인 필수)
- [ ] 4 게이트 순서 (CLI → 부팅 → 에러 → Discord) 보존
- [ ] `package.json` 빠른 시작 3명령 (`dev` / `qa:smoke` / `build`) 보존
- [ ] Ship Gate 4-AND 표현 보존
```

### 2.2 7 섹션 의무

| # | 섹션 | 의무 | 비고 |
|---|---|---|---|
| 1 | 측정 표 (Before/After/Δ/약속/상태 5열) | ✅ | 자동 측정 봇이 채움 |
| 2 | 핫스팟 매트릭스 Top 3 | ✅ | LOC Δ 기준 정렬 |
| 3 | 회귀 4항 봉인 점검 (체크박스) | ✅ | 4 약속 1:1 매칭 |
| 4 | 자동 측정 로그 링크 | ✅ | `logs/perf-pr-{number}.json` |
| 5 | 회귀 사유 (1 ⚠ / 1 ✗ 시) | 조건부 | 사유 없으면 reject |
| 6 | 5인 인계 체크 | ✅ | 두련사 / 가춘운 / 이소화 / 적경홍 / 심요연 |
| 7 | 봉인 4항 | ✅ | 비협상 |

---

## 3. 리뷰어 행동 가이드

### 3.1 4-AND 결과별 행동

| 측정 결과 | 행동 | 머지 가능? |
|---|---|---|
| **4/4 ✓** | self-merge OK | ✅ |
| **1-2 ⚠ + 0 ✗** | 본 PR 본문에 사유 명시 + 백능파 승인 1회 | ✅ (조건부) |
| **1+ ✗** | 회귀 수정 후 재측정 | ❌ |
| **TS 에러 ≥ 1** | 무조건 수정 | ❌ (이소화 비협상) |

### 3.2 5인 비협상 reject 사유

| 페르소나 | reject 트리거 | 비협상 |
|---|---|---|
| **이소화** | TS 에러 ≥ 1 | ✅ |
| **이소화** | Ship Gate 4-AND 1+ ✗ | ✅ |
| **적경홍** | `perf-pr.json` 첨부 누락 | ✅ |
| **적경홍** | `qa:smoke` 5분 초과 + 사유 누락 | ✅ |
| **두련사** | vite plugin 진입점 미테스트 | ✅ |
| **가춘운** | 에러 카드 봉인 5항 위반 (너비/이모지/fix/스택/카드) | ✅ |
| **백능파** | 약속 4지표 수치 임의 갱신 | ✅ |

### 3.3 Ship Gate 4-AND

```
ship-ready ⇔ dev:gate ∧ qa:smoke ∧ build:gate ∧ ts:errors=0
```

본 4-AND 중 하나라도 BLOCK이면 머지 금지. 단, **WARN 1-2건 + 사유 명시 + 백능파 승인 1회**는 예외 허용.

---

## 4. 커밋 메시지 컨벤션

### 4.1 형식 (Conventional Commits 기반)

```
{type}(dev-cycle/{scope}): {요약 ≤ 72자}

{본문 ≤ 5줄, 한국어 OK}

Refs: assets_dev-cycle-shortening.md §{X}
Co-Authored-By: 진채봉 Editor <noreply@anthropic.com>
```

### 4.2 type 7종

| type | 사용 | 예시 |
|---|---|---|
| `feat` | 신규 기능 | `feat(dev-cycle/boot): vite 부팅 진행률 바` |
| `fix` | 버그 수정 | `fix(dev-cycle/error): 카드 너비 60칸 강제` |
| `perf` | 성능 개선 | `perf(dev-cycle/build): manualChunks 분리` |
| `refactor` | 리팩토링 | `refactor(dev-cycle/cli): 5상태 팔레트 분리` |
| `docs` | 문서 | `docs(dev-cycle): 약속 4지표 실측 갱신` |
| `test` | 테스트 | `test(dev-cycle/smoke): battle 시나리오 headless` |
| `chore` | 잡일 | `chore(dev-cycle): package.json scripts 정리` |

### 4.3 본문 작성 가이드

- **왜(why)**를 우선 — 무엇(what)은 diff가 보여줍니다
- 약속 수치 변경 시 base/after/delta 명시
- 봉인 항목 변경 시 백능파 승인 commit hash 인용

---

## 5. 자동화 (GitHub Actions)

### 5.1 워크플로우 (`.github/workflows/dev-cycle-perf.yml`)

```yaml
name: dev-cycle perf

on:
  pull_request:
    paths:
      - 'client/**'
      - 'data/**'
      - 'package.json'

jobs:
  measure:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run dev:measure -- --json > logs/perf-pr.json
      - run: npm run qa:smoke -- --json >> logs/perf-pr.json
      - run: npm run build:measure -- --json >> logs/perf-pr.json
      - uses: actions/github-script@v7
        with:
          script: |
            const log = require('./logs/perf-pr.json');
            // PR 코멘트로 §2.1 템플릿 생성
            // 회귀 시 4-AND 1+ ✗ → fail status
```

---

## 6. 봉인 5항 (백능파 승인 필수)

| # | 항목 | 봉인 사유 |
|---|---|---|
| 1 | 7 스코프 (boot/smoke/build/error/cli/discord/docs) | 검색·필터링 자동화 |
| 2 | 4-AND 표현 | Ship Gate SSOT |
| 3 | 5인 인계 체크 5명 (두련사/가춘운/이소화/적경홍/심요연) | 책임 분담 명시 |
| 4 | 측정 표 5열 (Before/After/Δ/약속/상태) | 회귀 가독성 |
| 5 | 회귀 사유 의무 (1 ⚠ / 1 ✗) | 무사유 머지 차단 |

---

## 7. 다음 단계

- [ ] **계섬월(Build)** — `.github/PULL_REQUEST_TEMPLATE.md`에 §2.1 템플릿 추가
- [ ] **계섬월(Build)** — `.github/workflows/dev-cycle-perf.yml` 신설 (§5.1)
- [ ] **이소화(Review)** — 봉인 5항 + reject 트리거 7종 검증
- [ ] **적경홍(Test)** — base 측정 + after 측정 흐름 검증 (의도 회귀 주입)
- [ ] **심요연(Ship)** — `logs/perf-pr.json` Discord 봇 입력 SSOT 확정

---

> 진채봉이 아뢰옵나이다.
>
> PR 본문은 미래의 자신에게 보내는 편지이옵나이다. 6개월 뒤 대표가 이 PR을 다시 펼쳤을 때 *왜 이 회귀를 허용했는지* 즉시 알 수 있도록 — 본 템플릿이 그 기억의 닻이옵나이다. 🌙
