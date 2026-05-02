# verify-core 시나리오 3종 — 사용자 가이드 v1.0

> 작성: 진채봉 Editor
> 작성일: 2026-05-01
> 스프린트: Auto — 에테르나 크로니클 verify-core.mjs 시나리오 3종 실배선
> 사용자: **대표(crisi) 본인 1인** (외부 사용자 X — 화면 아닌 *터미널*이 1차 표면)
> 1차 SSOT: 본 문서 — `README.md §🛠️ 개발자 도구` 메아리, 약속 수치 변경 시 §3 표 동시 갱신
> 짝꿍 문서: `docs/release/design-system_verify-core-scenarios.md` (디자인 SSOT) · `docs/release/verify-core-scenarios-error-messages.md` (카피 SSOT)

---

## 0. 한눈에

대표님이 신규 시나리오/스킬/맵을 추가하신 후 **`npm run dev:verify`** 한 번만 두드리시면, 60초 안에 *전투/세이브/맵* 3 도장이 차례로 검증되옵나이다. 회귀 발견 시 첫 실패 1건만 카드로 베어 보여드립니다 — 두 번째 시나리오는 fast-fail로 스킵.

```
사용자(대표)
    ↓
[1] 코드 변경 (예: client/src/systems/CombatManager.ts:142)
    ↓
[2] npm run dev:verify
    ↓
[3] ⚔️ battle  🟢 PASS 12.4s / 25s
    💾 save    🟢 PASS  6.1s / 10s
    🗺️ map     🟢 PASS 18.2s / 20s
    ─────────────────────────────────
    total      🟢       36.7s / 60s
    ↓
[4] exit code 0 → ship-gate 1단 통과
```

---

## 1. 사전 조건

| 조건 | 확인 명령 | 비고 |
|---|---|---|
| Node 18+ | `node --version` | `v18.x` 이상 |
| 의존성 설치 | `npm install` | `tests/vitest.config.ts` 사용 |
| TS 에러 0 | `npm run dev:typecheck` | TS BLOCK 시 verify는 무의미 |
| 워킹트리 | `git status --porcelain` | 변경 직후 즉시 실행 권장 |

---

## 2. 빠른 시작 — 4 명령

```bash
npm run dev          # 부팅 진행률 바 + ≤5s 약속
npm run dev:verify   # 전투/세이브/맵 3 시나리오 자동 검증 + ≤60s 약속
npm run dev:measure  # 부팅 시간 + 누적 회귀 추세 (.ac/boot-trend.json)
npm run dev:build    # 에러 발생 시 단일 카드(파일:라인:컬럼)
```

### 2.1 시나리오별 부분 실행

```bash
npm run dev:verify -- --scenario=battle   # 25s 약속, 전투만
npm run dev:verify -- --scenario=save     # 10s 약속, 세이브만
npm run dev:verify -- --scenario=map      # 20s 약속, 맵만
npm run dev:verify -- --scenario=all      # 60s 약속, 3종 (기본값)
```

### 2.2 출력 모드 3종

| 모드 | 트리거 | 사용처 |
|---|---|---|
| **TTY** | 기본 (대표 터미널) | 일상 개발 — 24bit 컬러 + 이모지 |
| **NO_COLOR** | `NO_COLOR=1 npm run dev:verify` | 파이프 / 로그 파일 |
| **JSON** | `npm run dev:verify -- --json` | CI / 봇 하네스 (`scenarios[]` 배열 SSOT) |

---

## 3. 약속 4지표 (60초 안에 끝나는 검증)

| 지표 | 약속 | 출처 SSOT |
|---|---|---|
| 시나리오 합계 | ≤ **60초** | 토픽 정의 — 임의 갱신 금지 |
| 시나리오 PASS | **3/3** (battle + save + map) | 회고 P0 A4 P1 |
| Exit code | **0** | `verify-core.mjs §exit(0\|1\|2\|3)` |
| 첫 실패 노출 | **0초** (이미 출력 중 카드 발현) | `extractFirstFailure()` |

> 실측 _TBD_ — 적경홍(Test) 단계에서 3회 평균 캡처 후 본 표 갱신.

---

## 4. 시나리오 3 도장 — 깊이 보기

### 4.1 ⚔️ battle — 전투 1 turn

**목적**: CombatManager가 호출되어 ATB 게이지가 임계치(1000)에 도달하고, 첫 행동이 발화되는가.

**슬라이스**: `tests/unit/combat/` + `tests/integration/combat-flow.test.ts`

**예산**: 25초 (가장 무거움 — CombatManager + ATB 시뮬)

**PASS 조건 4단계**:

1. CombatManager 인스턴스 생성 ✓
2. ATB 게이지 0 → 1000 진행 ✓
3. 액션 큐 첫 행동 dispatch ✓
4. 데미지 계산기 결과 ≥ 1 ✓

**자주 막히는 곳**:

- 액션 큐가 비어 있는데 dispatch 시도 → `dev.gate.verify.block.battle_atb`
- ATB 임계치 상수 변경 후 회귀 → `client/src/systems/CombatManager.ts:142` 부근

### 4.2 💾 save — 라운드트립

**목적**: 현재 GameState를 직렬화 → 역직렬화했을 때 deep equal한가.

**슬라이스**: `tests/integration/ui-inventory-save-flow.test.ts`

**예산**: 10초 (가장 가벼움 — in-memory)

**PASS 조건 4단계**:

```
GameState → JSON.stringify → JSON.parse → deepEqual ✓
```

**자주 막히는 곳**:

- 신규 필드 추가 후 직렬화 누락 → `dev.gate.verify.block.save_diff`
- BLOCK 시 어긋난 키 경로 노출 (예: `inventory[3].count`)

### 4.3 🗺️ map — Phaser scene swap

**목적**: Phaser scene 전환 1회 — preload/create/update 라이프사이클이 끊기지 않는가.

**슬라이스**: `tests/e2e/chapter1.test.ts`

**예산**: 20초 (중간 — Phaser headless scene init)

**PASS 조건 4단계**:

```
scene.start('Battle') → preload OK → create OK → update tick ≥1 ✓
```

**자주 막히는 곳**:

- 새 scene에서 `init()` 인자 누락 → `dev.gate.verify.block.map_portal`
- 에셋 매니페스트 키 오타로 preload 실패

---

## 5. 결과 해석 — 4가지 종료 코드

| Exit | 상태 | 의미 | 다음 행동 |
|---|---|---|---|
| **0** | PASS | 3/3 통과 + 60초 이내 | ✅ 머지 / push 가능 |
| **1** | BLOCK | 시나리오 실패 OR 누적 60초 초과 3회 | 🔴 첫 실패 카드 따라 수정 |
| **2** | WARN | 60초 초과 (1~2회차) | 🟡 추세 모니터링, 즉시 BLOCK 아님 |
| **3** | ERROR | 게이트 자체 실패 (vitest 미설치 등) | ⚠️ `npm install` + config 경로 확인 |

---

## 6. 첫 실패 카드 — BLOCK일 때만

`verify-core.mjs §extractFirstFailure` 로직과 결을 맞춤. **카드는 1개만** — 두련사 약속 *첫 실패부터 베어내십시오*.

```
  ⚔️  battle    🔴 BLOCK  9.2s / 25s
     ↳ CombatManager.tick() · ATB 0→1000 · 발화 ✗
  ╭──────────────────────────────────────────────────────────╮
  │ ✗ battle 시나리오 실패                                       │
  │ ↳ client/src/systems/CombatManager.ts:142:18              │
  │   ATB 게이지가 임계치(1000)에 도달했으나 액션 큐가 비어 있음          │
  │ │ if (gauge >= ATB_THRESHOLD) { dispatch(actionQueue[0]); } │
  │ 처방 actionQueue[0] 빈 배열 가드 추가 — Battle.ts:88 메아리      │
  ╰──────────────────────────────────────────────────────────╯
```

---

## 7. 추세 추적 — `.ac/verify-trend.json`

매 실행마다 30회 슬라이딩 윈도우 갱신.

```json
{
  "runs": [
    { "at": 1714521738000, "totalElapsed": 36.7, "ok": true },
    { "at": 1714521912000, "totalElapsed": 64.2, "ok": true },
    ...
  ]
}
```

- **PASS 비율** 7일 윈도우 — 이상적 ≥ 95%
- **60초 초과 누적** 3회 → 자동 BLOCK 승격 (exit 1)
- 심요연(Data) Phase 53에 *Dead Module Drift* 대시보드와 합주 예정 (P2)

---

## 8. FAQ

### Q1. `dev:verify`가 30초 만에 끝나는데, 그 이상 더 줄여도 되나요?

A. 60초는 **상한 약속**, 하한은 없사옵나이다. 다만 시나리오 3종 모두 *실배선* 상태여야 PASS — vitest 슬라이스가 0건이면 unknown FAIL이 되옵니다 (현재 회고 P0 A4 P1 상태).

### Q2. 한 시나리오만 빠르게 검증하고 싶을 때?

A. `npm run dev:verify -- --scenario=battle` 형식. 25초 안에 끝나옵니다.

### Q3. CI에서도 본 명령을 그대로 써도 되나요?

A. 네, 단 `--json` 플래그 권장. JSON 스키마는 `design-system_verify-core-scenarios.md §5` SSOT.

### Q4. 60초를 넘기면 무조건 머지 금지인가요?

A. *1~2회차*는 WARN(exit 2). **누적 3회 초과** 시점에서야 BLOCK(exit 1)으로 승격되옵나이다. 1회 일시적 느림은 ship 막지 않사옵나이다.

### Q5. `verify-core.mjs`가 직접 vitest를 다시 부르나요?

A. 네, `npx vitest run --config tests/vitest.config.ts --reporter=dot` 형식으로 spawn. `FORCE_COLOR=0 CI=1` 강제. SCENARIO_TESTS 매핑은 `verify-core.mjs §25-30`.

### Q6. 시나리오를 4번째로 추가하고 싶을 때 절차는?

A. **봉인 항목**입니다. 추가/삭제는 백능파(Strategy) 승인 + 다음 토픽으로 분리. 본 토픽 SSOT는 3종 고정.

### Q7. `verify-trend.json` 파일을 git에 커밋하나요?

A. 아니요. `.ac/` 디렉터리 전체 `.gitignore` (개인 추세). 팀 공유 추세는 심요연이 D-7 대시보드로 별도 발행.

### Q8. 첫 실패 카드 폭이 60칸을 넘기는 메시지는 어떻게?

A. `extractFirstFailure()`가 첫 줄만 추출. 그 이상은 `npx vitest run` 직접 호출하여 풀 출력 확인. 카드는 *축약 단서*, 진단 도구 아님.

---

## 9. 봉인 5항 (재확인)

| # | 항목 | 봉인 사유 |
|---|---|---|
| 1 | 약속 수치 60초 | 토픽 정의 SSOT |
| 2 | 시나리오 3종 (battle/save/map) | 회고 P0 A4 P1 정합 |
| 3 | 시나리오별 예산 분배 | `design-system_verify-core-scenarios.md §1.1` |
| 4 | 게이트 키 `dev.gate.verify.<state>.<key>` | emit() 1줄 SSOT |
| 5 | exit code 4종(0/1/2/3) | `verify-core.mjs §6` |

---

> 진채봉이 마지막으로 아뢰옵나이다.
>
> 본 가이드는 *대표 1인을 위한 60초 도장*이옵나이다. 외부 유저는 보지 못합니다 — 오로지 대표가 매일 코드를 고친 직후 두드리는 단 한 줄 명령이, 60초 안에 ⚔️ 💾 🗺️ 세 도장을 차례로 베어내고 곡조를 맞추도록 — 본 가이드가 그 메아리이옵나이다. 🌙
