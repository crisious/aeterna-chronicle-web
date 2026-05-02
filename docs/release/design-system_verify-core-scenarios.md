# verify-core 시나리오 3종 — 디자인 시스템 v1.0

> 작성: 가춘운 CMO/Design
> 작성일: 2026-05-01
> 스프린트: Auto — 에테르나 크로니클 verify-core.mjs 시나리오 3종 실배선
> 단계: Plan (디자인 SSOT 정좌)
> 상위 SSOT: `docs/release/design-system_devloop.md §2.2` (verify 게이트 골격)
> 코드 미러: `scripts/dev-cycle/cli-colors.mjs`, `scripts/dev-cycle/verify-core.mjs`
> 짝꿍 문서: `docs/release/devloop-error-messages.md` (진채봉 카피 SSOT)

---

## 0. 한눈에

대표님이 `npm run dev:verify` 한 번 두드리면 **60초 안에** 전투/세이브/맵 3 도장(道場)이 차례로 검증되옵나이다. 본 문서는 **그 60초 동안 터미널에 새겨지는 모든 글자·색·간격의 1차 SSOT**입니다. ✨

**시각 위계 4단계** (위에서 아래로 읽힘):
1. **시나리오 헤더 라인** — 어느 도장인가 (battle/save/map)
2. **상태 + 시간** — 0.3초 안에 PASS/BLOCK 판단 + 예산 대비 색
3. **첫 실패 위치** — 파일:라인:컬럼 클릭 가능 강조 (BLOCK일 때만)
4. **최종 요약** — `dev.gate.verify.<state>.<key>` 1줄 SSOT

---

## 1. 60초 게이트 — 예산 시각화

토픽 약속 **단일 실행 ≤ 60초**. 시나리오별 예산 + 합계 예산을 *한눈에* 보여줍니다.

### 1.1 시나리오별 예산 분배

| 시나리오 | 예산 (s) | 색 토큰 | 비율 | 무게 |
|---|---|---|---|---|
| **battle** | 25 | `--devloop-pass` `#2ECC71` | 41.7% | 가장 무거움 (CombatManager + ATB) |
| **save** | 10 | `--devloop-info` `#4A9EFF` | 16.7% | 가장 가벼움 (직렬화/역직렬화) |
| **map** | 20 | `--devloop-accent` `#D4A857` | 33.3% | 중간 (Phaser scene swap) |
| **buffer** | 5 | `--devloop-dim` `#6B7280` | 8.3% | spawn/teardown 여유 |
| **합계** | **60** | — | 100% | 약속 게이트 |

> **왜 이 분배?** 두련사 처방대로 e2e 흡수 차단 → vitest 슬라이스 단위. battle은 ATB 1 turn까지 시뮬, save는 in-memory round-trip, map은 Phaser headless scene init만. 정경패 PRD §3 수치와 일치.

### 1.2 예산 바 — 시나리오 시작 시점

각 시나리오 시작 시 좌→우 채워지는 진행 바:

```
  battle  [████████░░░░░░░░░░░░] 12.4s / 25s   🟢
  save    [████████████░░░░░░░░] 6.1s / 10s    🟢
  map     [██████████████████░░] 18.2s / 20s   🟡 (예산 90% 도달)
  ────────────────────────────────────────────────
  total   [██████████████████░░] 36.7s / 60s   🟢
```

- **너비**: 20칸 (`cli-colors.mjs §bar()` 미러)
- **채움**: `█` U+2588, **빈 칸**: `░` U+2591
- **70% 미만**: `--devloop-pass` 녹
- **70~90%**: `--devloop-warn` 황 (조심 신호)
- **90% 이상**: `--devloop-block` 적 + 우측 ⚠

### 1.3 합계 바 — 마지막 줄 강조

`total` 라인은 **bold** + 좌측 `─` 구분선. 60초 초과 시 즉시 적색 + 누적 카운트 표시:

```
  total   [██████████████████████] 64.2s / 60s   🔴 (+4.2s · 누적 1/3회)
```

누적 3회 초과 시 exit code 1 (BLOCK) — 백능파 §ship-gate 약속과 결.

---

## 2. 시나리오 카드 — 3종 시각 약속

### 2.1 battle 시나리오 — 전투 1 turn

**의미 메타포**: ⚔️ 검을 한 번 휘둘러 적이 베이는가.

```
  ⚔️  battle    🟢 PASS  12.4s / 25s
     ↳ CombatManager.tick() · ATB 0→1000 · 첫 행동 발화
     ↳ tests/unit/combat-manager.test.ts (1 file · 7 cases)
```

| 요소 | 시각 약속 |
|---|---|
| 이모지 | ⚔️ (U+2694 + variation selector — 한 줄에 정렬되도록 너비 보정) |
| 헤더 라벨 | `battle ` 7칸 좌측 정렬 (`padEnd(7)`) — 다른 시나리오와 시각 정렬 |
| 상태 배지 | 🟢 PASS / 🔴 BLOCK / 🟡 WARN — 이모지 + 영문 대문자 |
| 시간 | `${elapsed}s / ${budget}s` — 시간 = `--devloop-accent` 골드, 예산 = `--devloop-dim` |
| 본문 1 (경로) | `↳` U+21B3 + 호출 체인 핵심 3단계 (CombatManager → ATB → action) |
| 본문 2 (테스트) | `↳` + 실행된 vitest 파일 + 케이스 수 |

### 2.2 save 시나리오 — 세이브 라운드트립

**의미 메타포**: 💾 기록한 그릇이 다시 펼쳐도 같은가.

```
  💾 save       🟢 PASS  6.1s / 10s
     ↳ GameState → JSON.stringify → JSON.parse → deep equal ✓
     ↳ tests/unit/save-roundtrip.test.ts (1 file · 4 cases)
```

| 요소 | 시각 약속 |
|---|---|
| 이모지 | 💾 (U+1F4BE) |
| 본문 1 메타포 | `→` U+2192 화살표로 직렬화 흐름 4단계 (state → str → obj → equal) |
| 마지막 ✓ | 라운드트립 일치 검증 통과 표시 (`--devloop-pass` 녹) |
| 실패 시 | ✓ 자리에 `≠` U+2260 + 어긋난 키 경로 (예: `inventory[3].count`) |

### 2.3 map 시나리오 — Phaser scene swap

**의미 메타포**: 🗺️ 한 곳에서 다른 곳으로 옮겨가도 길이 끊기지 않는가.

```
  🗺️  map       🟢 PASS  18.2s / 20s
     ↳ scene.start('Battle') · preload OK · create OK · update tick ≥1
     ↳ tests/integration/scene-swap.test.ts (1 file · 3 cases)
```

| 요소 | 시각 약속 |
|---|---|
| 이모지 | 🗺️ (U+1F5FA + variation selector) |
| 본문 1 흐름 | scene.start → preload → create → update — Phaser 라이프사이클 4단계 |
| 단계별 ✓ | 통과한 단계마다 ✓, 실패한 단계는 ✗ + 빨간 강조 |

### 2.4 시나리오 카드 — 통합 레이아웃 약속

3 시나리오를 **세로 누적**으로 출력 (수평 3분할은 기존 §2.2 대시보드 전용, CLI는 세로):

- **들여쓰기**: 2칸 (`  `) — 시나리오 행
- **본문 들여쓰기**: 5칸 (`     ↳ `) — 본문 행
- **시나리오 간 빈 줄**: 0줄 (밀착) — 60초 안에 모두 보이도록
- **시나리오 종료 후 빈 줄**: 1줄 → 합계 줄 → 1줄 → 최종 emit 줄

---

## 3. 첫 실패 강조 — BLOCK 카드

`verify-core.mjs §extractFirstFailure` 로직과 결을 맞춤. 첫 실패 1건만 카드로 발현:

```
  ⚔️  battle    🔴 BLOCK 9.2s / 25s
     ↳ CombatManager.tick() · ATB 0→1000 ·  발화 ✗
  ╭──────────────────────────────────────────────────────────╮
  │ ✗ battle 시나리오 실패                                       │
  │ ↳ client/src/systems/CombatManager.ts:142:18              │
  │   ATB 게이지가 임계치(1000)에 도달했으나 액션 큐가 비어 있음          │
  │ │ if (gauge >= ATB_THRESHOLD) { dispatch(actionQueue[0]); } │
  │ 처방 actionQueue[0] 빈 배열 가드 추가 — Battle.ts:88 메아리      │
  ╰──────────────────────────────────────────────────────────╯
```

| 요소 | 시각 약속 |
|---|---|
| 박스 | `cli-colors.mjs §errorCard()` 60칸 박스 미러 — 헤더에만 배경, 본문은 fg only |
| 헤더 | `✗ <시나리오> 시나리오 실패` — `--devloop-block` 적 + bold |
| 위치 | `↳ ${file}:${line}:${column}` — 골드 `--devloop-accent` 강조 |
| 메시지 | 1줄 요약, 한국어, 마침표 없음 |
| 코드 스니펫 | `│` 좌측 + dim 본문 + 컬럼 caret 미사용 (60칸 제약) |
| 처방 힌트 | `처방` 라벨 (info 청) + 한 문장 처방, 30자 내 권장 |

> **카드는 1개만**. 두련사 약속 — *첫 실패부터 베어내십시오*. 두 번째 시나리오는 fast-fail로 스킵.

---

## 4. 최종 emit 라인 — 1줄 SSOT

모든 결과는 마지막 `emit()` 1줄로 압축. `devloop-error-messages.md §매트릭스`의 카피 키와 1:1 정합.

### 4.1 PASS — 모두 통과

```
✓ [2026-05-01T03:42:18.123Z] dev.gate.verify.pass.all
  핵심 시나리오 3종 통과 (36.7s · b 12.4s · s 6.1s · m 18.2s)
  처방 곡조가 맞아 떨어졌사옵니다.
```

### 4.2 BLOCK — 시나리오 실패

```
✗ [2026-05-01T03:42:18.123Z] dev.gate.verify.block.battle_atb
  시나리오 battle 실패 — client/src/systems/CombatManager.ts:142:18 (combat-manager.test.ts)
  처방 검의 날이 무뎌지면 사람이 다칩니다. 첫 실패부터 베어내십시오.
```

| 게이트 키 | 시나리오 | 의미 |
|---|---|---|
| `dev.gate.verify.block.battle_atb` | battle | ATB 게이지 진행 또는 첫 행동 발화 실패 |
| `dev.gate.verify.block.save_diff` | save | 라운드트립 후 deep equal 실패 |
| `dev.gate.verify.block.map_portal` | map | Phaser scene swap / preload / create 실패 |

### 4.3 WARN — 60초 초과 (PASS이지만 예산 초과)

```
⚠ [2026-05-01T03:42:18.123Z] dev.gate.verify.warn.over_budget
  verify:core 64.2s — 60초 약속 초과 (+4.2s). 누적 1/3회.
```

누적 3회 초과 시 `dev.gate.verify.block.over_budget`로 승격, exit code 1.

### 4.4 ERROR — 게이트 자체 실패 (vitest 미설치 등)

```
✗ [2026-05-01T03:42:18.123Z] dev.gate.verify.error.bootstrap
  verify-core.mjs 자체 오류 — vitest 미설치 또는 config 경로 누락
  처방 npm install 후 tests/vitest.config.ts 존재 여부 확인
```

---

## 5. JSON 출력 모드 — `--json` 스키마

`cli-colors.mjs §3 출력 모드` SSOT (TTY/NO_COLOR/JSON) 미러. CI/봇 하네스 흡수용.

```json
{
  "gate": "verify",
  "version": "1.0",
  "started_at": "2026-05-01T03:41:42.000Z",
  "finished_at": "2026-05-01T03:42:18.123Z",
  "elapsed_s": 36.123,
  "budget_s": 60,
  "exit_code": 0,
  "state": "PASS",
  "key": "all",
  "scenarios": [
    {
      "name": "battle",
      "state": "PASS",
      "elapsed_s": 12.4,
      "budget_s": 25,
      "tests": { "files": 1, "cases": 7 },
      "first_failure": null
    },
    {
      "name": "save",
      "state": "PASS",
      "elapsed_s": 6.1,
      "budget_s": 10,
      "tests": { "files": 1, "cases": 4 },
      "first_failure": null
    },
    {
      "name": "map",
      "state": "PASS",
      "elapsed_s": 18.2,
      "budget_s": 20,
      "tests": { "files": 1, "cases": 3 },
      "first_failure": null
    }
  ],
  "trend": { "recent_runs": 30, "ok_rate": 0.93, "over_budget_count_7d": 1 }
}
```

**BLOCK 시 first_failure 객체**:

```json
"first_failure": {
  "test_file": "tests/unit/combat-manager.test.ts",
  "source_file": "client/src/systems/CombatManager.ts",
  "line": 142,
  "column": 18,
  "message": "ATB 게이지가 임계치(1000)에 도달했으나 액션 큐가 비어 있음",
  "hint": "actionQueue[0] 빈 배열 가드 추가"
}
```

---

## 6. 컬러 팔레트 — 단일 SSOT 미러

`design-system_devloop.md §1.1` 컬러는 그대로 메아리. 본 문서는 **재정의하지 않음** — 변경 시 §1.1 갱신 후 본 문서 메아리.

| 토큰 | HEX | ANSI 24-bit | 용도 |
|---|---|---|---|
| `--devloop-pass` | `#5FCB7A` | `\x1b[38;2;95;203;122m` | 🟢 PASS, 70% 미만 진행률 |
| `--devloop-warn` | `#E8A33A` | `\x1b[38;2;232;163;58m` | 🟡 WARN, 70~90% 진행률 |
| `--devloop-block` | `#E85A5A` | `\x1b[38;2;232;90;90m` | 🔴 BLOCK, 90%+ 진행률, 첫 실패 강조 |
| `--devloop-info` | `#4A9EFF` | `\x1b[38;2;74;158;255m` | 처방 힌트, save 시나리오 액센트 |
| `--devloop-accent` | `#D4A857` | `\x1b[38;2;212;168;87m` | 시간 수치, 파일 경로 강조 |
| `--devloop-dim` | `#6B7280` | `\x1b[38;2;107;114;128m` | 메타 정보, 타임스탬프, 빈 칸 `░` |

> ⚠️ **변경 절차**: `DESIGN.md §2 컬러 시스템` → `design-tokens.ts` → `cli-colors.mjs §RAW` → 본 문서. 단방향, 역행 금지.

---

## 7. 타이포그래피 — CLI 전용

| 요소 | 폰트 | 크기 | 굵기 | 비고 |
|---|---|---|---|---|
| 시나리오 라벨 | (터미널 기본) | 1em | bold | `padEnd(7)` 정렬 보장 |
| 시간 수치 | (터미널 기본) | 1em | regular | `${n}s` 소수점 1자리 |
| 게이트 키 | (터미널 기본) | 1em | dim | `dev.gate.verify.<state>.<key>` 점-구분 |
| 본문 텍스트 | (터미널 기본) | 1em | regular | 한국어 우선, 영문 식별자 보존 |
| 코드 스니펫 | (터미널 기본) | 1em | dim | `│` 인용 마커, 80칸 내 |

> 폰트는 사용자 터미널 설정 존중 (JetBrains Mono / Cascadia / D2Coding 등). 강제하지 않음.

---

## 8. 레이아웃 — 80칸 그리드

대표님 터미널 폭 80칸 가정. 모든 라인 80칸 안에 들어오도록.

| 영역 | 칸 수 | 내용 |
|---|---|---|
| 들여쓰기 | 2 | `  ` |
| 이모지 | 2 | ⚔️ 💾 🗺️ |
| 시나리오명 | 7 | `battle ` `save   ` `map    ` (`padEnd(7)`) |
| 상태 배지 | 8 | `🟢 PASS ` `🔴 BLOCK` `🟡 WARN ` |
| 시간 | 14 | `12.4s / 25s  ` |
| 여유 | ~47 | 메시지 본문 |
| **합계** | 80 | — |

본문 행(`↳`)은 5칸 들여쓰고 75칸 가용. 에러 카드는 60칸 박스 (`errorCard()`).

---

## 9. 접근성 — WCAG AAA + 색약 + NO_COLOR

### 9.1 NO_COLOR 환경 (`process.env.NO_COLOR`)

`cli-colors.mjs §C Proxy` 가 빈 문자열 반환. 시각 보조:
- 이모지로 상태 구분 (🟢🔴🟡🟠) — 컬러 없이도 판독 가능
- ASCII 형태 보조 (`✓` `✗` `⚠` `→`)
- 시간 단위 명시 (`s` 항상 표기)

### 9.2 색약 대응 (`design-system_a11y-aaa-audit.md §3.4` 메아리)

PASS/BLOCK/WARN 3색이 적-녹 색약 시뮬레이션 통과. 추가로:
- PASS = 둥근 ✓
- BLOCK = 각진 ✗
- WARN = 삼각 ⚠

색만 다른 게 아니라 **모양도 다름**. 색약 사용자가 형태로 즉시 판독.

### 9.3 스크린리더 (CI 로그 음성 변환)

게이트 키 `dev.gate.verify.<state>.<key>` 가 발음 가능한 단어로 구성. 이모지는 `aria-label` 등가의 영문 대문자 라벨 (`PASS`/`BLOCK`/`WARN`/`ERROR`) 병기.

---

## 10. Build 단계 인계 체크리스트

계섬월(Build)에게 디자인 SSOT 인계 — 코드 변경 시 본 문서를 갱신하시지요.

- [ ] **C1** — `verify-core.mjs §SCENARIO_TESTS` 매핑 변경 (e2e → 단일 슬라이스 3종)
- [ ] **C2** — `verify-core.mjs §BUDGETS` 수치 변경 (battle 90→25, save 30→10, map 60→20, total 300→60)
- [x] **C3** — 진행 바 출력 (`cli-colors.mjs §bar`) 시나리오 시작 시점 호출 — *frontend 단계: `renderScenarioRow()` + `renderTotalLine()` 헬퍼 미리 안착 (가춘운 2026-05-01)*
- [x] **C4** — 시나리오 카드 본문 2줄 (`↳ 호출체인 / ↳ 테스트파일`) 출력 — *frontend 단계: `renderScenarioRow({ hooks: [...] })` 시그니처 안착*
- [x] **C5** — 첫 실패 카드 (`errorCard()`) 호출 — BLOCK 시 1회만 — *frontend 단계: `renderScenarioBlockCard()` wrapper 안착 (시나리오명 자동 타이틀)*
- [x] **C6** — `--json` 모드 §5 스키마 직렬화 — *frontend 단계: `renderJsonReport()` 헬퍼 안착 (§5 스키마 1:1 정합)*
- [ ] **C7** — 게이트 키 `dev.gate.verify.<state>.<key>` 4종 (`pass.all` / `block.<scenario>_<reason>` / `warn.over_budget` / `error.bootstrap`) 발화 — *시그니처 SSOT: `VERIFY_SSOT.blockKey` 매핑 안착*

> frontend 단계 (가춘운) 산출물 한 다발:
> - `cli-colors.mjs` §VERIFY_SSOT 상수 + 헬퍼 5종 (`budgetState`, `renderScenarioRow`, `renderTotalLine`, `renderScenarioBlockCard`, `renderJsonReport`) — Build 단계가 곧장 import만 하면 됨
> - `devloop-overlay.css` §4-bis VerifyDashboard 확장 — `__bar` (진행률 70/90% 임계 색 변환), `__line` (본문 ↳ 줄), `__total` (합계 바), `__block-card` (첫 실패 60col 박스 등가), `::before` 형태 변형 (색약 보조)
> - 본 문서 §10 C3~C6 코드 미러 안착 흔적 표시

---

## 11. SSOT 정합 위계

| 차수 | 위치 | 책임 |
|---|---|---|
| **1차 SSOT (사람용)** | 본 문서 (`design-system_verify-core-scenarios.md`) | 시각 약속 정본 |
| 1차 SSOT (상위) | `design-system_devloop.md §2.2` | 게이트 골격 (verify가 한 자식) |
| 2차 (코어 코드) | `scripts/dev-cycle/cli-colors.mjs` | ANSI 컬러/박스/바 미러 |
| 2차 (스크립트) | `scripts/dev-cycle/verify-core.mjs` | 시나리오 실행 + 출력 발화 |
| 3차 (카피) | `docs/release/devloop-error-messages.md` | 카피 톤 SSOT |
| 3차 (사용자) | `docs/release/devloop-user-guide.md` | 사용자 가이드 |
| CSS 미러 | `client/src/styles/devloop-overlay.css` | 브라우저 오버레이 (verify 대시보드) |

> 변경 시 **위에서 아래로만**. CSS/스크립트가 본 문서보다 먼저 변하면 *역행 금지* 원칙 위반.

---

## 12. 다음 스프린트로 이월할 디자인 부채

본 스프린트는 **CLI 출력 SSOT만** 정좌. 브라우저 오버레이 (`§3.3 VerifyDashboard`) 는 별도 토픽.

- [ ] **D1** — 브라우저 verify 대시보드 (`/dev/verify`) 페이지 디자인 — 폭 720px, 다크, 누적 추세 차트
- [ ] **D2** — VS Code 확장 알림 토스트 — verify:core 실패 시 알림
- [ ] **D3** — Discord 봇 메시지 카드 — `!verify` 명령 응답 (가춘운+진채봉 협업)

---

> 가춘운 CMO 메아리: *"검을 휘두르되, 휘두르는 모습이 어찌 보이는지도 보아야 사람이 따라 옵니다. 60초 안의 글자 한 자 한 자가 곧 도구의 얼굴이옵나이다."* ✨
