# README §🛠️ verify-core 시나리오 3종 — 골격 SSOT v1.0

> 작성: 진채봉 Editor
> 작성일: 2026-05-01
> 스프린트: Auto — 에테르나 크로니클 verify-core.mjs 시나리오 3종 실배선 (대표 본인 본)
> SSOT 위계: 4차 (런타임 텍스트) — `docs/release/design-system_verify-core-scenarios.md` (1차) 미러
> 용도: 기존 `README.md §🛠️ 개발자 도구 — 빌드-검증 사이클` 절을 *증보(增補)* — `qa:smoke` → `dev:verify` 실배선 반영
> 비고: 선행 sprint의 `dev-cycle-shortening-readme-skeleton.md` v1.0을 본 문서가 *대체하지 않고 갱신* — `verify-core` 부분만 차내 교체

---

## 위치 제안

기존 `README.md §🛠️ 개발자 도구 — 빌드-검증 사이클` 절 안의 **§🎯 한눈 약속 4지표** 표 행 2 (핵심 시나리오 검증)와 **§🚀 빠른 시작 — 3 명령** 두 군데를 갱신. 절 자체를 새로 만들지는 않사옵나이다.

추가로 상단 배지 그룹(기존 24개)에 **신규 배지 1종** 추가 — `Verify Core` 시나리오 3/3 PASS 배지:

```md
[![Verify Core](https://img.shields.io/badge/Verify%20Core-3%2F3%20PASS-brightgreen?style=for-the-badge)](#-개발자-도구--빌드-검증-사이클)
```

위치: `QA Smoke 100%` 배지 직후. 배지 색은 `_TBD_` — 적경홍 Test 단계에서 실측 후 확정.

---

## 갱신 1 — §🎯 한눈 약속 4지표 표 (Row 2 교체)

### 변경 전 (현재)

```markdown
| 핵심 시나리오 검증 | ≤ **5분** | `npm run qa:smoke` |
```

### 변경 후 (갱신 1)

```markdown
| 핵심 시나리오 검증 (battle/save/map) | ≤ **60초** | `npm run dev:verify` |
```

> ⚠️ 약속 수치 5분 → **60초**로 *축약*. 토픽 정의 SSOT — 임의 갱신 금지(이소화 비협상).

---

## 갱신 2 — §🚀 빠른 시작 (3명령 → 4명령)

### 변경 전

```bash
npm run dev        # 부팅 진행률 바 + ≤5s 약속
npm run qa:smoke   # 전투/세이브/맵 자동 검증 + ≤5min 약속
npm run build      # 에러 발생 시 단일 카드(파일:라인:컬럼)
```

### 변경 후

```bash
npm run dev          # 부팅 진행률 바 + ≤5s 약속
npm run dev:verify   # 전투/세이브/맵 3 시나리오 자동 검증 + ≤60s 약속
npm run dev:measure  # 부팅 시간 + 누적 회귀 추세 (.ac/boot-trend.json)
npm run dev:build    # 에러 발생 시 단일 카드(파일:라인:컬럼)
```

> 시나리오별 부분 실행: `npm run dev:verify -- --scenario=battle|save|map`

---

## 갱신 3 — §📋 4 게이트 흐름 표 (Row 5 신설)

기존 4행 끝에 **5번째 행** 신설:

```markdown
| 5 | **verify-core 시나리오** | `scripts/dev-cycle/verify-core.mjs` — battle/save/map 3종 vitest 슬라이스 |
```

---

## 신설 — §🎯 verify-core 시나리오 3 도장 (절 내 부속 표)

§📋 4 게이트 흐름 표 직후, **새로운 부속 표** 1개 신설:

```markdown
### 🎯 verify-core 시나리오 3 도장 — 60초 안에 베어내는 핵심

| 시나리오 | 의미 | 예산 | 게이트 키 (BLOCK 시) | 슬라이스 |
|---|---|---|---|---|
| ⚔️ **battle** | 전투 1 turn — CombatManager → ATB → 첫 행동 | 25s | `dev.gate.verify.block.battle_atb` | `tests/unit/combat` + `tests/integration/combat-flow.test.ts` |
| 💾 **save**   | 라운드트립 — state → JSON.stringify → JSON.parse → deep equal | 10s | `dev.gate.verify.block.save_diff` | `tests/integration/ui-inventory-save-flow.test.ts` |
| 🗺️ **map**    | Phaser scene swap — start → preload → create → update tick | 20s | `dev.gate.verify.block.map_portal` | `tests/e2e/chapter1.test.ts` |
| — | buffer (spawn/teardown) | 5s | — | — |
| **합계** | — | **60s** | — | — |

> 누적 60초 초과 3회 시 exit code 1 (BLOCK). `.ac/verify-trend.json` 30회 슬라이딩 윈도우.
```

---

## 갱신 4 — §🔒 Ship Gate 4-AND (verify 게이트 명시)

### 변경 전

```
ship-ready ⇔ dev:gate ∧ qa:smoke ∧ build:gate ∧ ts:errors=0
```

### 변경 후

```
ship-ready ⇔ dev:measure(boot ≤5s) ∧ dev:verify(3/3 PASS) ∧ dev:build(ts:errors=0) ∧ ship-gate hook
```

본 4-AND 중 하나라도 BLOCK이면 머지 금지 — 이소화 비협상.

---

## 봉인 5항 (백능파 승인 필수)

| # | 항목 | 봉인 사유 |
|---|---|---|
| 1 | 약속 수치 60초 | 토픽 정의 SSOT — 임의 갱신 금지 |
| 2 | 시나리오 3종 (battle/save/map) | 회고 P0 A4 P1 정합 — 추가/삭제 금지 |
| 3 | 시나리오별 예산 분배 (25/10/20+5) | 두련사 *선禪* + `design-system_verify-core-scenarios.md §1.1` SSOT |
| 4 | 게이트 키 규약 `dev.gate.verify.<state>.<key>` | `cli-colors.mjs` + emit() 1줄 SSOT |
| 5 | 빠른 시작 4명령 (`dev` / `dev:verify` / `dev:measure` / `dev:build`) | `package.json` scripts SSOT |

---

## 다음 단계

- [ ] **계섬월(Build)** — 본 갱신 1~4를 `README.md §🛠️ 개발자 도구` 절에 통합
- [ ] **계섬월(Build)** — `verify-core.mjs` 시나리오 3종 실배선 (현재 unknown FAIL → battle/save/map 매핑 확정)
- [ ] **이소화(Review)** — 봉인 5항 검증 + 4-AND 표현 확인
- [ ] **적경홍(Test)** — 약속 수치 60초 실측 → 배지 색 확정 (3/3 PASS, exit 0, ≤60s)
- [ ] **백능파(Strategy)** — 60초 약속이 `launch_checklist §2.25` 동행 가능 여부 협의
- [ ] **심요연(Data)** — `.ac/verify-trend.json` 7일 윈도우 대시보드 구상 (P2)

---

> 진채봉이 아뢰옵나이다.
>
> README는 대표가 매일 첫 5초 안에 보는 *문지방*이옵나이다. 그 문지방에 `verify-core` 3 도장이 차곡히 쌓이면, 신규 시나리오를 더할 때마다 검의 무게가 손에 잡힙니다. **5분 → 60초**로 약속을 깎아내린 자리에는, 실배선의 진심만이 남아야 하옵니다. 🌙
