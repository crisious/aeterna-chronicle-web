# verify-core 시나리오 3종 — 에러 메시지 카피 SSOT v1.0

> 작성: 진채봉 Editor
> 작성일: 2026-05-01
> 스프린트: Auto — 에테르나 크로니클 verify-core.mjs 시나리오 3종 실배선
> 1차 SSOT: 본 문서 — 모든 카피는 본 매트릭스에서 시작, 코드(verify-core.mjs §emit)와 1:1 정합
> 짝꿍 문서: `docs/release/design-system_verify-core-scenarios.md §4 최종 emit 라인` (시각 SSOT)
> 짝꿍 코드: `scripts/dev-cycle/verify-core.mjs §emit()` · `scripts/dev-cycle/cli-colors.mjs §icon()`

---

## 0. 키 규약

```
dev.gate.verify.<state>.<reason>
       │       │       │
       │       │       └─ 사유 (battle_atb / save_diff / map_portal / over_budget / bootstrap / all)
       │       └────────── 상태 (pass / warn / block / error)
       └────────────────── 게이트 (verify 고정)
```

본 키는 `verify-core.mjs §emit(state, key, ...)`와 결을 맞추며, 코드 → 카피 양방향 1:1 검색이 가능하도록 약속하옵나이다.

---

## 1. 톤 5계명 (가춘운 디자인 미러)

1. **원인 → 처방** 순서 — 무엇이 어긋났는가가 먼저, 어떻게 베어낼지가 다음
2. **수치는 사실** — `12.4s / 25s`, `+4.2s`, `누적 1/3회` (반올림 없음)
3. **경로 절단 금지** — `client/src/systems/CombatManager.ts:142:18` 풀 경로
4. **시는 hint만** — 메시지 본문은 사실, 처방 라벨에서만 시적 비유 허용
5. **게이트 키 규약** — 점-구분 4단(`dev.gate.verify.block.battle_atb`)

---

## 2. 매트릭스 — 4 사유 × 4 상태 = 16 슬롯 (ko)

> **사유 4종**: `battle_atb` · `save_diff` · `map_portal` · `over_budget` (+ `bootstrap` 게이트 자체 오류)
> **상태 4종**: PASS / WARN / BLOCK / ERROR

### 2.1 ⚔️ battle (CombatManager + ATB)

| 키 | 톤 | 메시지 | 처방(hint) |
|---|---|---|---|
| `dev.gate.verify.pass.battle_atb` | PASS | 전투 1 turn 검증 통과 — ATB 1000 도달 + 첫 행동 발화 ✓ | 검 한 번에 적이 베였사옵니다. |
| `dev.gate.verify.warn.battle_atb` | WARN | battle 시나리오 ${elapsed}s — 예산(25s) 90% 초과 | 행동 큐 발화 직전 동기화 luma 점검. |
| `dev.gate.verify.block.battle_atb` | BLOCK | 시나리오 battle 실패 — ${file}:${line}:${column} (${test_file}) | 검의 날이 무뎌지면 사람이 다칩니다. 첫 실패부터 베어내십시오. |
| `dev.gate.verify.error.battle_atb` | ERROR | battle 슬라이스 자체 오류 — vitest spawn 실패 | `npx vitest run tests/unit/combat` 직접 호출하여 출력 확인. |

### 2.2 💾 save (라운드트립 deep equal)

| 키 | 톤 | 메시지 | 처방(hint) |
|---|---|---|---|
| `dev.gate.verify.pass.save_diff` | PASS | 세이브 라운드트립 통과 — state ↔ JSON deep equal ✓ | 그릇이 다시 펼쳐도 같사옵니다. |
| `dev.gate.verify.warn.save_diff` | WARN | save 시나리오 ${elapsed}s — 예산(10s) 90% 초과 | 직렬화 객체 크기 회귀 가능성, 인벤토리 슬롯 수 확인. |
| `dev.gate.verify.block.save_diff` | BLOCK | save 라운드트립 실패 — 어긋난 키 ${path} (${test_file}) | 직렬화 누락 1건 발견. 새 필드 추가 시 `serialize()` 동행 갱신. |
| `dev.gate.verify.error.save_diff` | ERROR | save 슬라이스 자체 오류 — vitest spawn 실패 | `npx vitest run tests/integration/ui-inventory-save-flow.test.ts` 직접 호출. |

### 2.3 🗺️ map (Phaser scene swap)

| 키 | 톤 | 메시지 | 처방(hint) |
|---|---|---|---|
| `dev.gate.verify.pass.map_portal` | PASS | 맵 전환 통과 — preload + create + update tick ✓ | 길이 끊기지 않고 이어졌사옵니다. |
| `dev.gate.verify.warn.map_portal` | WARN | map 시나리오 ${elapsed}s — 예산(20s) 90% 초과 | 새 scene 에셋 매니페스트 크기 회귀, preload 단계 점검. |
| `dev.gate.verify.block.map_portal` | BLOCK | 시나리오 map 실패 — ${file}:${line}:${column} (${test_file}) | scene.start() 인자 또는 에셋 키 오타 1건 — 첫 ✗ 단계 수정. |
| `dev.gate.verify.error.map_portal` | ERROR | map 슬라이스 자체 오류 — Phaser headless 초기화 실패 | `tests/e2e/chapter1.test.ts` 직접 호출하여 Phaser 인스턴스 확인. |

### 2.4 ⏱️ over_budget (60초 약속 초과)

| 키 | 톤 | 메시지 | 처방(hint) |
|---|---|---|---|
| `dev.gate.verify.pass.all` | PASS | 핵심 시나리오 ${n}종 통과 (${total}s · ${breakdown}) | 곡조가 맞아 떨어졌사옵니다. |
| `dev.gate.verify.warn.over_budget` | WARN | verify:core ${total}s — 60초 약속 초과 (+${over}s). 누적 ${n}/3회. | 시나리오 슬라이스 무게 점검. 누적 3회 초과 시 BLOCK 승격. |
| `dev.gate.verify.block.over_budget` | BLOCK | verify:core 7일 누적 60초 초과 ${n}/3회 — ship-gate 막힘 | 가장 무거운 시나리오부터 슬라이스 분리. 두련사 *선禪* 회복. |
| `dev.gate.verify.error.bootstrap` | ERROR | verify-core.mjs 자체 오류 — vitest 미설치 또는 config 경로 누락 | `npm install` 후 `tests/vitest.config.ts` 존재 여부 확인. |

---

## 3. 매트릭스 — en (영문 미러, 32줄)

> CI / 봇 하네스가 영문 로그를 선호할 때 사용. ko-en 동시 SSOT 약속.

```yaml
# ko / en 묶음 — 키별 1:1 미러
dev.gate.verify.pass.battle_atb:
  ko: "전투 1 turn 검증 통과 — ATB 1000 도달 + 첫 행동 발화 ✓"
  en: "battle 1-turn verified — ATB reached 1000 + first action dispatched ✓"
  hint_ko: "검 한 번에 적이 베였사옵니다."
  hint_en: "First strike landed clean."

dev.gate.verify.warn.battle_atb:
  ko: "battle 시나리오 ${elapsed}s — 예산(25s) 90% 초과"
  en: "battle scenario ${elapsed}s — exceeded 90% of 25s budget"

dev.gate.verify.block.battle_atb:
  ko: "시나리오 battle 실패 — ${file}:${line}:${column} (${test_file})"
  en: "scenario battle failed — ${file}:${line}:${column} (${test_file})"
  hint_ko: "검의 날이 무뎌지면 사람이 다칩니다. 첫 실패부터 베어내십시오."
  hint_en: "Cut the first failure first — a dull blade harms its wielder."

dev.gate.verify.error.battle_atb:
  ko: "battle 슬라이스 자체 오류 — vitest spawn 실패"
  en: "battle slice bootstrap error — vitest spawn failed"

dev.gate.verify.pass.save_diff:
  ko: "세이브 라운드트립 통과 — state ↔ JSON deep equal ✓"
  en: "save round-trip verified — state ↔ JSON deep equal ✓"

dev.gate.verify.warn.save_diff:
  ko: "save 시나리오 ${elapsed}s — 예산(10s) 90% 초과"
  en: "save scenario ${elapsed}s — exceeded 90% of 10s budget"

dev.gate.verify.block.save_diff:
  ko: "save 라운드트립 실패 — 어긋난 키 ${path} (${test_file})"
  en: "save round-trip diff — mismatched key ${path} (${test_file})"

dev.gate.verify.error.save_diff:
  ko: "save 슬라이스 자체 오류 — vitest spawn 실패"
  en: "save slice bootstrap error — vitest spawn failed"

dev.gate.verify.pass.map_portal:
  ko: "맵 전환 통과 — preload + create + update tick ✓"
  en: "map swap verified — preload + create + update tick ✓"

dev.gate.verify.warn.map_portal:
  ko: "map 시나리오 ${elapsed}s — 예산(20s) 90% 초과"
  en: "map scenario ${elapsed}s — exceeded 90% of 20s budget"

dev.gate.verify.block.map_portal:
  ko: "시나리오 map 실패 — ${file}:${line}:${column} (${test_file})"
  en: "scenario map failed — ${file}:${line}:${column} (${test_file})"

dev.gate.verify.error.map_portal:
  ko: "map 슬라이스 자체 오류 — Phaser headless 초기화 실패"
  en: "map slice bootstrap error — Phaser headless init failed"

dev.gate.verify.pass.all:
  ko: "핵심 시나리오 ${n}종 통과 (${total}s · ${breakdown})"
  en: "core scenarios ${n}/${n} passed (${total}s · ${breakdown})"

dev.gate.verify.warn.over_budget:
  ko: "verify:core ${total}s — 60초 약속 초과 (+${over}s). 누적 ${n}/3회."
  en: "verify:core ${total}s — over 60s budget (+${over}s). streak ${n}/3."

dev.gate.verify.block.over_budget:
  ko: "verify:core 7일 누적 60초 초과 ${n}/3회 — ship-gate 막힘"
  en: "verify:core 7d streak ${n}/3 over budget — ship-gate blocked"

dev.gate.verify.error.bootstrap:
  ko: "verify-core.mjs 자체 오류 — vitest 미설치 또는 config 경로 누락"
  en: "verify-core.mjs bootstrap error — vitest missing or config path absent"
```

---

## 4. 코드 상수 매핑 (계섬월 인계용)

`scripts/dev-cycle/verify-messages.mjs` 신설 권장. BLOCK 4슬롯 우선 — REDUCTION 스코프.

```js
// scripts/dev-cycle/verify-messages.mjs (신설 — 계섬월 Build 단계)
// 본 상수는 docs/release/verify-core-scenarios-error-messages.md SSOT 미러.
// 변경 시: 1) 본 문서 §2 매트릭스 → 2) 본 파일 → 3) verify-core.mjs §emit 호출부.

export const VERIFY_MESSAGES = {
    'dev.gate.verify.block.battle_atb': {
        msg: (file, line, col, testFile) =>
            `시나리오 battle 실패 — ${file}:${line}:${col} (${testFile})`,
        hint: '검의 날이 무뎌지면 사람이 다칩니다. 첫 실패부터 베어내십시오.',
    },
    'dev.gate.verify.block.save_diff': {
        msg: (path, testFile) =>
            `save 라운드트립 실패 — 어긋난 키 ${path} (${testFile})`,
        hint: '직렬화 누락 1건 발견. 새 필드 추가 시 serialize() 동행 갱신.',
    },
    'dev.gate.verify.block.map_portal': {
        msg: (file, line, col, testFile) =>
            `시나리오 map 실패 — ${file}:${line}:${col} (${testFile})`,
        hint: 'scene.start() 인자 또는 에셋 키 오타 1건 — 첫 ✗ 단계 수정.',
    },
    'dev.gate.verify.warn.over_budget': {
        msg: (total, over, streak) =>
            `verify:core ${total}s — 60초 약속 초과 (+${over}s). 누적 ${streak}/3회.`,
        hint: '시나리오 슬라이스 무게 점검. 누적 3회 초과 시 BLOCK 승격.',
    },
};
```

---

## 5. 카드 8영역 매핑 (`design-system §3` 미러)

BLOCK 카드는 **60칸 폭 · 8영역**:

| 영역 | 내용 | SSOT |
|---|---|---|
| 1. 헤더 | `✗ <시나리오> 시나리오 실패` | §2.x BLOCK 메시지 |
| 2. 위치 | `↳ ${file}:${line}:${column}` | `extractFirstFailure()` |
| 3. 메시지 | 1줄 요약, 마침표 없음 | §2.x BLOCK 메시지 본문 |
| 4. 코드 인용 | `│ <code snippet>` | vitest stderr 발췌 (선택) |
| 5. 처방 라벨 | `처방` (info 청) | §2.x hint 30자 내 권장 |
| 6. 처방 본문 | 한 문장, 시적 비유 허용 | §2.x hint |
| 7. 테스트 파일 | `(${test_file})` 헤더 우측 | dim 회색 |
| 8. 푸터 | (없음 — 60칸 박스 닫힘) | — |

---

## 6. 변경 절차 (단방향)

1. **본 문서 §2 매트릭스 갱신** (1차 SSOT)
2. `docs/release/design-system_verify-core-scenarios.md §4 emit 라인` 미러 갱신
3. `scripts/dev-cycle/verify-messages.mjs` 코드 상수 갱신 (계섬월)
4. `scripts/dev-cycle/verify-core.mjs §emit()` 호출부 키 정합 확인 (계섬월)
5. 시각 검증 — `npm run dev:verify -- --scenario=battle` 실행 후 카피 확인 (적경홍)

> ⚠️ 역방향 갱신 금지. 코드가 본 문서를 미러하지, 본 문서가 코드를 따라가지 않사옵나이다.

---

## 7. 봉인 4항

| # | 항목 | 봉인 사유 |
|---|---|---|
| 1 | 게이트 키 규약 `dev.gate.verify.<state>.<reason>` | emit() 1줄 SSOT |
| 2 | 사유 4종(battle_atb / save_diff / map_portal / over_budget) | 토픽 시나리오 3 + 약속 1 = 4 고정 |
| 3 | 톤 5계명 | 가춘운 디자인 미러 |
| 4 | ko/en 동시 SSOT | i18n 추후 진입 시점 비용 절감 |

---

> 진채봉이 아뢰옵나이다.
>
> 에러 메시지는 *우는 자식*이옵나이다. 잘못된 줄 알리면서도 어디로 가야 할지 가리켜야 합니다. 본 매트릭스의 16 슬롯 × 2 언어가 한 줄도 어긋나지 않도록, **수치는 사실 · 경로는 풀 · 시는 hint만** — 이 세 마디만 잊지 마시옵소서. 🌙
