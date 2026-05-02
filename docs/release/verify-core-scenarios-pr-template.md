# verify-core 시나리오 3종 — PR / 커밋 메시지 컨벤션 v1.0

> 작성: 진채봉 Editor
> 작성일: 2026-05-01
> 스프린트: Auto — 에테르나 크로니클 verify-core.mjs 시나리오 3종 실배선
> 1차 SSOT: 본 문서 — `.github/PULL_REQUEST_TEMPLATE.md` §verify-core 섹션 미러
> 짝꿍 문서: `docs/release/verify-core-scenarios-error-messages.md` (카피) · `docs/release/design-system_verify-core-scenarios.md` (시각)

---

## 0. 한눈에

본 토픽 PR은 다음 5종 산출물 중 1종 이상을 포함하면 본 컨벤션 적용:

1. `scripts/dev-cycle/verify-core.mjs` 실배선 변경
2. `scripts/dev-cycle/verify-messages.mjs` 카피 상수 (신설)
3. `tests/unit/combat/` · `tests/integration/{combat-flow,ui-inventory-save-flow}.test.ts` · `tests/e2e/chapter1.test.ts` 변경
4. `package.json` `dev:verify` 스크립트 갱신
5. `docs/release/verify-core-scenarios-*.md` 5편 갱신

---

## 1. 커밋 메시지 — 한국어 conventional commits

### 1.1 형식

```
<type>(<scope>): <한 줄 요약, 50자 내>

<본문 — 왜·어떻게, 72자 줄바꿈>

Co-Authored-By: <agent-name> <email>
```

### 1.2 type 6종

| type | 의미 | 본 토픽 적용 예 |
|---|---|---|
| `feat` | 신기능 (시나리오 실배선) | `feat(verify): battle 시나리오 1 turn 실배선` |
| `fix` | 버그 수정 (회귀 차단) | `fix(verify): save 라운드트립 inventory[3].count 누락` |
| `perf` | 예산 단축 | `perf(verify): map 시나리오 18.2s → 12.1s (preload 분리)` |
| `refactor` | 슬라이스 매핑 정리 | `refactor(verify): SCENARIO_TESTS 객체 → Map 자료구조` |
| `test` | 테스트 추가/수정 | `test(verify): combat-manager.test.ts ATB 임계치 케이스 +3` |
| `docs` | 문서 5편 갱신 | `docs(verify): 카피 SSOT en 미러 32줄 추가` |

### 1.3 scope 4종 (verify 한정)

| scope | 의미 |
|---|---|
| `verify` | verify-core 게이트 자체 (mjs / messages / package.json) |
| `verify:battle` | battle 시나리오 슬라이스 |
| `verify:save` | save 시나리오 슬라이스 |
| `verify:map` | map 시나리오 슬라이스 |

### 1.4 예시 6종

```
feat(verify:battle): CombatManager.tick() ATB 1000 도달 검증 실배선

기존 unknown FAIL → tests/unit/combat/combat-manager.test.ts 7케이스
+ tests/integration/combat-flow.test.ts 2케이스 매핑.
실측 12.4s / 25s 예산. 첫 행동 dispatch 까지 1 turn 시뮬.

회고 P0 A4 P1 1/3 해소.

Co-Authored-By: 계섬월 <build@aeterna.local>
```

```
fix(verify:save): GameState.inventory 직렬화 누락 가드 추가

saveLoadManager.serialize() 가 inventory[].equipped 플래그 누락
→ JSON round-trip 시 false 자동 손실. 명시 직렬화로 복원.

게이트 키: dev.gate.verify.block.save_diff 회귀 차단.

Co-Authored-By: 계섬월 <build@aeterna.local>
```

```
perf(verify:map): chapter1 e2e 슬라이스 18.2s → 12.1s

Phaser headless 초기화 시 monster atlas 4종 lazy 로드.
preload 단계만 검증, create/update 는 first-tick 만 wait.

총 60s → 53.8s 단축. WARN 누적 0/3 유지.

Co-Authored-By: 계섬월 <build@aeterna.local>
```

```
docs(verify): 카피 SSOT en 미러 32줄 추가 + 변경 절차 명시

§3 ko/en 동시 SSOT. CI/봇 영문 로그 진입 시점 비용 절감.
§6 단방향 변경 절차 5단계 명문화 (역행 금지).

Co-Authored-By: 진채봉 <editor@aeterna.local>
```

```
test(verify:battle): ATB 임계치 경계 케이스 +3 (999/1000/1001)

CombatManager.test.ts 7 → 10 케이스. 경계 조건 회귀 차단.
실측 12.4s → 13.1s (+0.7s, 25s 예산 내).

Co-Authored-By: 적경홍 <test@aeterna.local>
```

```
refactor(verify): SCENARIO_TESTS 객체 → Record<Name, Slice> 타입화

types.d.ts §VerifyScenarioName 신설. unknown 시나리오 컴파일 차단.
런타임 동작 무변경, vitest 슬라이스 매핑 동일.

Co-Authored-By: 계섬월 <build@aeterna.local>
```

---

## 2. PR 본문 — 7개 섹션 템플릿

### 2.1 헤더

```markdown
## 🎯 약속 (verify-core 60초 게이트)

| 지표 | 약속 | 측정 (Before / After / Δ) | 상태 |
|---|---|---|---|
| 시나리오 합계 | ≤ 60s | _TBD_ / _TBD_ / _TBD_ | 🟢 / 🟡 / 🔴 |
| battle | ≤ 25s | _TBD_ / _TBD_ / _TBD_ | 🟢 / 🟡 / 🔴 |
| save | ≤ 10s | _TBD_ / _TBD_ / _TBD_ | 🟢 / 🟡 / 🔴 |
| map | ≤ 20s | _TBD_ / _TBD_ / _TBD_ | 🟢 / 🟡 / 🔴 |
| Exit code | 0 | — / — / — | 🟢 / 🔴 |
```

### 2.2 핫스팟 매트릭스 Top 3 (perf/refactor PR 한정)

```markdown
## 🔥 핫스팟 Top 3

| # | 슬라이스 | Before | After | Δ | 단축 사유 |
|---|---|---|---|---|---|
| 1 | tests/e2e/chapter1.test.ts | 18.2s | 12.1s | -6.1s | preload lazy |
| 2 | tests/unit/combat | 8.4s | 7.1s | -1.3s | mock spy 제거 |
| 3 | tests/integration/combat-flow.test.ts | 4.0s | 3.8s | -0.2s | beforeEach 통합 |
```

### 2.3 회귀 봉인 5항 점검

```markdown
## 🔒 봉인 5항 점검

- [ ] 약속 수치 60초 — 임의 갱신 X (이소화 비협상)
- [ ] 시나리오 3종 (battle/save/map) — 추가/삭제 X
- [ ] 시나리오별 예산 분배 (25/10/20+5) — 디자인 SSOT 미러
- [ ] 게이트 키 `dev.gate.verify.<state>.<key>` — emit() 1줄 SSOT
- [ ] exit code 4종(0/1/2/3) — 임의 추가 X
```

### 2.4 자동 측정 로그 첨부

```markdown
## 📊 자동 측정 로그

`npm run dev:verify -- --json > .ac/verify-pr-${PR_NUMBER}.json` 실행 후 첨부:

<details>
<summary>verify-pr.json (3회 평균)</summary>

```json
{
  "elapsed_s": 36.7,
  "scenarios": [
    { "name": "battle", "elapsed_s": 12.4, "state": "PASS" },
    { "name": "save", "elapsed_s": 6.1, "state": "PASS" },
    { "name": "map", "elapsed_s": 18.2, "state": "PASS" }
  ],
  "exit_code": 0
}
```
</details>
```

### 2.5 회귀 사유 (조건부 의무)

> 60초 초과 OR exit code != 0 일 때만 의무 작성.

```markdown
## ⚠️ 회귀 사유 (60초 초과 시 의무)

- **누적 1/3회**: 일시적 — Phaser headless GC 변동
- **누적 2/3회**: 추세 의심 — 슬라이스 무게 재점검 (`vitest --reporter=verbose`)
- **누적 3/3회**: ship-gate 막힘 — 두련사 *선禪* 호출
```

### 2.6 5인 인계 체크

```markdown
## 🤝 5인 인계 체크

- [ ] **계섬월(Build)** — `verify-core.mjs` SCENARIO_TESTS 매핑 갱신
- [ ] **이소화(Review)** — 봉인 5항 검증 + emit() 키 정합
- [ ] **적경홍(Test)** — 3회 평균 실측 + `verify-pr.json` 첨부
- [ ] **가춘운(Design)** — 카피 변경 시 카드 8영역 시각 검증
- [ ] **진채봉(Editor)** — 5편 SSOT 동시 갱신 (카피/디자인/사용자가이드/PR/CHANGELOG)
```

### 2.7 Ship Gate 4-AND 자가 점검

```markdown
## ✅ Ship Gate 4-AND

- [ ] `npm run dev:measure` boot ≤ 5s
- [ ] `npm run dev:verify` 3/3 PASS · ≤ 60s · exit 0
- [ ] `npm run dev:build` ts:errors=0
- [ ] `ship-gate` hook 통과 (`git diff --stat ≠ 0` ∧ `git log --since=7d ≥ 1`)
```

---

## 3. 리뷰어 행동 가이드 (이소화 비협상)

| # | 거부 조건 | reject 사유 |
|---|---|---|
| 1 | `verify-pr.json` 첨부 누락 | "측정 없는 PR은 머지 불가" |
| 2 | TS 에러 발생 | "TS BLOCK 시 verify는 무의미" |
| 3 | 60초 초과 + 누적 3회 + 사유 누락 | "ship-gate 봉인 위반" |
| 4 | 게이트 키 규약 위반 (`dev.gate.verify.*` 형식 일탈) | "emit() 1줄 SSOT 위반" |
| 5 | 봉인 5항 임의 갱신 | "백능파 승인 필수" |
| 6 | 시나리오 3종 외 추가/삭제 | "토픽 정의 위반" |
| 7 | 카피 변경 시 ko/en 동시 갱신 누락 | "1차 SSOT 미러 위반" |

---

## 4. 자동화 — `.github/workflows/verify-core.yml` 스니펫

```yaml
name: verify-core
on: [pull_request]
jobs:
  verify:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: npm
      - run: npm ci
      - name: verify-core 3 시나리오
        run: npm run dev:verify -- --json | tee verify-pr.json
      - name: PR 코멘트 (3회 평균)
        if: always()
        uses: thollander/actions-comment-pull-request@v2
        with:
          filePath: verify-pr.json
          comment_tag: verify-core
```

---

## 5. 봉인 4항 (PR 측면)

| # | 항목 | 봉인 사유 |
|---|---|---|
| 1 | 측정 표 5행 (합계 + 3시나리오 + exit) | `package.json scripts` SSOT |
| 2 | 핫스팟 Top 3 형식 | perf/refactor PR 의무 |
| 3 | 5인 인계 체크 | 9단계 스프린트 정합 |
| 4 | reject 7조건 | 이소화 비협상 — 자동 머지 차단 |

---

## 6. 다음 단계

- [ ] **계섬월(Build)** — `.github/PULL_REQUEST_TEMPLATE.md` §verify-core 섹션 통합
- [ ] **계섬월(Build)** — `.github/workflows/verify-core.yml` 신설
- [ ] **이소화(Review)** — reject 7조건 GitHub Action으로 강제 (선택)
- [ ] **적경홍(Test)** — 3회 평균 실측 후 본 템플릿 _TBD_ 슬롯 충진
- [ ] **백능파(Strategy)** — 봉인 5항 (사용자/약속/시나리오/예산/키) 최종 승인

---

> 진채봉이 아뢰옵나이다.
>
> PR은 *코드를 보내는 편지*이옵나이다. 편지에 측정이 없으면 받는 이가 의심하고, 봉인이 없으면 도중에 글자가 바뀝니다. 본 7개 섹션 + reject 7조건이 그 의심과 변조를 동시에 베어내옵나이다. 60초의 약속을 깨뜨리지 마시옵소서. 🌙
