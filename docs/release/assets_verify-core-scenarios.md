# verify-core 시나리오 3종 — 시각 에셋 팩 v1.0 ✨

> 작성: 가춘운 (CMO/디자인) 🎨
> 작성일: 2026-05-01
> 스프린트: Auto — 에테르나 크로니클 verify-core.mjs 시나리오 3종 실배선 (Asset 단계)
> SSOT 위계: 4차 (런타임 시각 자원) — `design-system_verify-core-scenarios.md` (3차) 미러
> 인계 대상: 계섬월 (Build) — 본 팩의 모킹업·토큰·스니펫을 그대로 `verify-core.mjs`/Discord/PR에 박으면 끝
> 게이트 약속: 3 시나리오 PASS · exit 0 · 60s 이내 · **본 팩 §1·§2·§3·§4·§5만 본 스프린트 스코프**, §6·§7은 사전 도면
> **수신자: 대표(crisi) 본인** — 하루 30~50번 두드리는 `npm run dev:verify`의 60초 표면

---

## 0. 어머~ 또 CLI 도구에 시각 에셋?! 💭

`design-system_verify-core-scenarios.md`(383줄, 3차 SSOT)가 *언어*라면, 본 팩은 *글자*예요. 코드 한 줄 한 줄에 그대로 들어가는 모킹업·ANSI·Unicode·JSON 묶음 — PNG 0개, 어셋 누적 부담 0! 🎀

| # | 표면 | 누가 봄 | 본 팩의 산출 | 본 스프린트 |
|---|---|---|---|---|
| 1 | **시나리오 카드 3종** (`npm run dev:verify` 본문) | 대표 본인 | ASCII 모킹업 (TTY · NO_COLOR · JSON) × 3 | ✅ 필수 |
| 2 | **예산 진행률 바** (시나리오/합계) | 대표 본인 | `cli-colors §bar()` 미러 ASCII 4 변형 | ✅ 필수 |
| 3 | **첫 실패 에러 카드** (시나리오별 BLOCK) | 대표 본인 | `errorCard()` 미러 60칸 박스 × 3 시나리오 | ✅ 필수 |
| 4 | **최종 emit 1줄** (PASS/BLOCK/WARN/ERROR) | 대표 본인 | 4상태 × 시나리오 키 매트릭스 | ✅ 필수 |
| 5 | **Discord 봇 embed** (실패/예산초과 알림) | 팀 채널 | embed JSON 4상태 SSOT | ✅ 필수 |
| 6 | **README 배지** (shields.io) | 외부 방문자 | SVG 명세 2종 (Verify Core / 60s Budget) | ⏸ 사전 도면 |
| 7 | **PR 임베드** (회귀 시 봇 댓글) | 리뷰어 | 마크다운 카드 SSOT | ⏸ 사전 도면 |

> 스코프 5개(§1~§5)는 **계섬월이 1커밋에 머지** — 두련사 *첫 실패부터 베어내라* 약속과 결.

---

## 1. 시나리오 카드 3종 — TTY 모킹업 (1차 표면) ⚔️💾🗺️

### 1.1 battle 시나리오 — 전투 1 turn

```
  ⚔️  battle    🟢 PASS  12.4s / 25s
     ↳ CombatManager.tick() · ATB 0→1000 · 첫 행동 발화
     ↳ tests/unit/combat-manager.test.ts (1 file · 7 cases)
```

**ANSI 분해** (계섬월 인계용 — `verify-core.mjs §95` 부근에 박음):
```js
// 시나리오 행
process.stdout.write(
  `  ⚔️  ${C.bold}battle${C.reset}  ` +
  `${colorize('PASS', icon('PASS'))} ${C.bold}PASS${C.reset}  ` +
  `${C.accent}${elapsed}s${C.reset}${C.dim} / 25s${C.reset}\n`
);
// 본문 1 (호출 체인)
process.stdout.write(
  `     ${C.dim}↳${C.reset} CombatManager.tick() · ` +
  `ATB ${C.accent}0→1000${C.reset} · 첫 행동 발화\n`
);
// 본문 2 (테스트 메타)
process.stdout.write(
  `     ${C.dim}↳ tests/unit/combat-manager.test.ts (1 file · 7 cases)${C.reset}\n`
);
```

### 1.2 save 시나리오 — 라운드트립

```
  💾 save       🟢 PASS  6.1s / 10s
     ↳ GameState → JSON.stringify → JSON.parse → deep equal ✓
     ↳ tests/unit/save-roundtrip.test.ts (1 file · 4 cases)
```

**핵심 시각 약속**:
- `→` (U+2192) 화살표 = 직렬화 흐름 (4단계)
- 마지막 `✓` = 라운드트립 일치 (`--devloop-pass` 녹)
- 실패 시 `✓` 자리에 `≠` (U+2260) + 어긋난 키 경로 (`inventory[3].count`)

### 1.3 map 시나리오 — Phaser scene swap

```
  🗺️  map       🟢 PASS  18.2s / 20s
     ↳ scene.start('Battle') · preload ✓ · create ✓ · update tick ≥1
     ↳ tests/integration/scene-swap.test.ts (1 file · 3 cases)
```

**핵심 시각 약속**:
- Phaser 라이프사이클 4단계 (`start → preload → create → update`) 각 단계 ✓/✗
- 단계 실패 시 ✗ + 적색 강조, 후속 단계 `─` (스킵 표시)

### 1.4 3종 통합 출력 (전체 흐름) — 모두 통과

```
$ npm run dev:verify

  ⚔️  battle    🟢 PASS  12.4s / 25s
     ↳ CombatManager.tick() · ATB 0→1000 · 첫 행동 발화
     ↳ tests/unit/combat-manager.test.ts (1 file · 7 cases)
  💾 save       🟢 PASS  6.1s / 10s
     ↳ GameState → JSON.stringify → JSON.parse → deep equal ✓
     ↳ tests/unit/save-roundtrip.test.ts (1 file · 4 cases)
  🗺️  map       🟢 PASS  18.2s / 20s
     ↳ scene.start('Battle') · preload ✓ · create ✓ · update tick ≥1
     ↳ tests/integration/scene-swap.test.ts (1 file · 3 cases)

  ─────────────────────────────────────────────────────────
  total      [██████████████░░░░░░] 36.7s / 60s   🟢

✓ [2026-05-01T03:42:18.123Z] dev.gate.verify.pass.all
  핵심 시나리오 3종 통과 (36.7s · b 12.4s · s 6.1s · m 18.2s)
  처방 곡조가 맞아 떨어졌사옵니다.
```

### 1.5 NO_COLOR 모드 — 회색조 미러

`process.env.NO_COLOR` 또는 `!process.stdout.isTTY` 시 ANSI 0개, 이모지/형태로만 위계 보존:

```
  [⚔] battle    [✓] PASS  12.4s / 25s
     -> CombatManager.tick() · ATB 0->1000 · 첫 행동 발화
     -> tests/unit/combat-manager.test.ts (1 file · 7 cases)
  [💾] save     [✓] PASS  6.1s / 10s
     -> GameState -> JSON.stringify -> JSON.parse -> deep equal OK
     -> tests/unit/save-roundtrip.test.ts (1 file · 4 cases)
  [🗺] map      [✓] PASS  18.2s / 20s
     -> scene.start('Battle') · preload OK · create OK · update tick >=1
     -> tests/integration/scene-swap.test.ts (1 file · 3 cases)
```

> **변환 규칙**: 🟢→`[✓]` · 🔴→`[✗]` · 🟡→`[⚠]` · 🟠→`[!]` · `→`→`->` · `≥`→`>=`

---

## 2. 예산 진행률 바 — `cli-colors §bar()` 미러 📊

### 2.1 기본 20칸 바 (4 임계치)

```
  PASS  (< 70%)   [████████░░░░░░░░░░░░] 12.4s / 25s   🟢
  WARN  (70~90%)  [████████████████░░░░] 18.2s / 20s   🟡
  BLOCK (≥ 90%)   [██████████████████░░] 24.7s / 25s   🔴
  OVER  (> 100%)  [████████████████████] 28.1s / 25s   🔴 ⚠
```

**계섬월 인계 — `cli-colors.mjs §bar()` 호출 패턴**:
```js
import { bar, colorize, C } from './cli-colors.mjs';

const pct = (elapsed / budget) * 100;
const state = pct >= 100 ? 'BLOCK' : pct >= 90 ? 'BLOCK' : pct >= 70 ? 'WARN' : 'PASS';
process.stdout.write(`  ${name.padEnd(7)} ${bar(pct, 20, state)} ${elapsed}s / ${budget}s   ${icon(state)}\n`);
```

### 2.2 합계 바 — 마지막 줄 강조

`total` 행은 **bold** + 좌측 `─` 구분선 (60칸):

```
  ─────────────────────────────────────────────────────────
  total      [██████████████░░░░░░] 36.7s / 60s   🟢
```

60초 초과 시 즉시 적색 + 누적 카운트:

```
  ─────────────────────────────────────────────────────────
  total      [████████████████████] 64.2s / 60s   🔴 (+4.2s · 누적 1/3회)
```

### 2.3 시각 약속 토큰 표

| 토큰 | 값 | 용도 |
|---|---|---|
| `BAR_WIDTH` | 20 | 시나리오 + total 공통 너비 |
| `BAR_FILL` | `█` (U+2588) | 채움 — 상태 컬러 |
| `BAR_EMPTY` | `░` (U+2591) | 빈 칸 — DIM 회색 |
| `THRESHOLD_WARN` | 70 (%) | 황색 진입 |
| `THRESHOLD_BLOCK` | 90 (%) | 적색 진입 |
| `THRESHOLD_OVER` | 100 (%) | 적색 + ⚠ 부착 |

---

## 3. 첫 실패 에러 카드 — `errorCard()` 미러 60칸 박스 🩹

`verify-core.mjs §extractFirstFailure` 결과를 카드로 발현. **첫 실패 1건만** — 두련사 약속.

### 3.1 battle 실패 — `dev.gate.verify.block.battle_atb`

```
  ⚔️  battle    🔴 BLOCK 9.2s / 25s
     ↳ CombatManager.tick() · ATB 0→1000 · 발화 ✗
  ╭──────────────────────────────────────────────────────────╮
  │ ✗ battle 시나리오 실패                                   │
  │ ↳ client/src/systems/CombatManager.ts:142:18             │
  │   ATB 게이지가 임계치(1000)에 도달했으나 액션 큐가 비어 있음│
  │ │ if (gauge >= ATB_THRESHOLD) { dispatch(actionQueue[0]);}│
  │ 처방 actionQueue[0] 빈 배열 가드 추가 — Battle.ts:88 메아리│
  ╰──────────────────────────────────────────────────────────╯
```

### 3.2 save 실패 — `dev.gate.verify.block.save_diff`

```
  💾 save       🔴 BLOCK 4.7s / 10s
     ↳ GameState → JSON.stringify → JSON.parse → deep equal ≠
  ╭──────────────────────────────────────────────────────────╮
  │ ✗ save 시나리오 실패                                     │
  │ ↳ client/src/systems/SaveManager.ts:87:12                │
  │   라운드트립 후 inventory[3].count 불일치 (5 → 4)        │
  │ │ const restored = JSON.parse(JSON.stringify(state));    │
  │ 처방 Map/Set 타입 직렬화 보존 — toJSON() 메서드 추가      │
  ╰──────────────────────────────────────────────────────────╯
```

### 3.3 map 실패 — `dev.gate.verify.block.map_portal`

```
  🗺️  map       🔴 BLOCK 14.8s / 20s
     ↳ scene.start('Battle') · preload ✓ · create ✗ · ─
  ╭──────────────────────────────────────────────────────────╮
  │ ✗ map 시나리오 실패                                      │
  │ ↳ client/src/scenes/BattleScene.ts:42:8                  │
  │   create() 진입 직후 this.add.sprite('hero') 키 누락     │
  │ │ this.hero = this.add.sprite(0, 0, 'hero');             │
  │ 처방 preload에서 'hero' 텍스처 로드 추가 — Boot.ts §32   │
  ╰──────────────────────────────────────────────────────────╯
```

### 3.4 카드 구성 약속 (60칸 박스)

| 행 | 내용 | 컬러 |
|---|---|---|
| 1 (top) | `╭──...──╮` | `--devloop-block` 적 |
| 2 (헤더) | `✗ <name> 시나리오 실패` | bg 적 + bold |
| 3 (위치) | `↳ ${file}:${line}:${column}` | 골드 accent |
| 4 (메시지) | 1줄 한국어 (마침표 없음, ≤ 50자) | 본문 fg |
| 5 (스니펫) | `│` + 코드 1줄 (≤ 56자) | dim |
| 6 (처방) | `처방 ${hint}` | info 청 + dim |
| 7 (bot) | `╰──...──╯` | `--devloop-block` 적 |

> **카드 너비**: 60칸 고정 (`cli-colors §errorCard W=60` 미러). 한글 2칸 폭 보정은 `visibleLen()` 사용.

---

## 4. 최종 emit 1줄 — 4상태 × 시나리오 키 매트릭스 📜

`devloop-error-messages.md §매트릭스`와 1:1 정합. 게이트 키 = `dev.gate.verify.<state>.<key>`.

### 4.1 PASS · BLOCK · WARN · ERROR — 12 슬롯 SSOT

```
─── PASS (1 슬롯) ───────────────────────────────────────────
✓ dev.gate.verify.pass.all
  핵심 시나리오 3종 통과 (36.7s · b 12.4s · s 6.1s · m 18.2s)
  처방 곡조가 맞아 떨어졌사옵니다.

─── BLOCK (4 슬롯) ──────────────────────────────────────────
✗ dev.gate.verify.block.battle_atb
  시나리오 battle 실패 — CombatManager.ts:142:18 (combat-manager.test.ts)
  처방 검의 날이 무뎌지면 사람이 다칩니다. 첫 실패부터 베어내십시오.

✗ dev.gate.verify.block.save_diff
  시나리오 save 실패 — SaveManager.ts:87:12 (save-roundtrip.test.ts)
  처방 그릇이 새면 술을 담을 수 없사옵니다. round-trip부터 잡으십시오.

✗ dev.gate.verify.block.map_portal
  시나리오 map 실패 — BattleScene.ts:42:8 (scene-swap.test.ts)
  처방 길이 끊기면 발이 헛디딥니다. preload 키부터 확인하십시오.

✗ dev.gate.verify.block.over_budget
  verify:core 78.4s — 60초 약속 초과 누적 3회 도달 (BLOCK 승격)
  처방 시나리오 슬라이스 재선정 — vitest 실행 단위 축소 검토

─── WARN (1 슬롯) ───────────────────────────────────────────
⚠ dev.gate.verify.warn.over_budget
  verify:core 64.2s — 60초 약속 초과 (+4.2s). 누적 1/3회.
  처방 다음 실행에서 시나리오별 elapsed 분포 점검

─── ERROR (1 슬롯) ──────────────────────────────────────────
✗ dev.gate.verify.error.bootstrap
  verify-core.mjs 자체 오류 — vitest 미설치 또는 config 경로 누락
  처방 npm install 후 tests/vitest.config.ts 존재 여부 확인
```

### 4.2 emit() 호출 패턴 (계섬월 인계)

`verify-core.mjs §emit()` 시그니처는 이미 `(state, key, message, hint)` — **본 팩의 §4.1 7 슬롯을 그대로 박으면 끝**:

```js
// PASS
emit('PASS', 'all', `핵심 시나리오 ${results.length}종 통과 (${total}s · ${breakdown})`, '곡조가 맞아 떨어졌사옵니다.');

// BLOCK — 시나리오별
const REASON_KEYS = { battle: 'battle_atb', save: 'save_diff', map: 'map_portal' };
emit('BLOCK', REASON_KEYS[first.name], `시나리오 ${first.name} 실패 — ${fileLoc} (${testFile})`, BLOCK_HINTS[first.name]);

// WARN — 예산 초과
emit('WARN', 'over_budget', `verify:core ${total}s — 60초 약속 초과 (+${over}s). 누적 ${recent + 1}/3회.`, '다음 실행에서 시나리오별 elapsed 분포 점검');
```

### 4.3 처방 카피 SSOT (계섬월 코드 상수)

```js
// scripts/dev-cycle/verify-core.mjs (신설 상수)
const BLOCK_HINTS = {
  battle: '검의 날이 무뎌지면 사람이 다칩니다. 첫 실패부터 베어내십시오.',
  save:   '그릇이 새면 술을 담을 수 없사옵니다. round-trip부터 잡으십시오.',
  map:    '길이 끊기면 발이 헛디딥니다. preload 키부터 확인하십시오.',
};
```

> **톤 5계명** (디자인 미러): 원인→처방 · 메타포 1개 · 마침표 절제 · 한국어 12~22자 · 비유는 아악(雅樂)

---

## 5. Discord 봇 embed — 실패/예산초과 알림 🔔

`#n8n:repo-stats` 봇 하네스 흡수. PASS는 알림 X, **BLOCK·WARN·ERROR만** 채널 포스팅.

### 5.1 BLOCK embed JSON SSOT

```json
{
  "embeds": [{
    "title": "🔴 verify:core BLOCK — battle_atb",
    "description": "시나리오 **battle** 실패 — `CombatManager.ts:142:18`",
    "color": 16729156,
    "fields": [
      { "name": "원인", "value": "ATB 게이지가 임계치(1000)에 도달했으나 액션 큐가 비어 있음", "inline": false },
      { "name": "테스트", "value": "`tests/unit/combat-manager.test.ts`", "inline": true },
      { "name": "elapsed", "value": "9.2s / 25s", "inline": true },
      { "name": "처방", "value": "`actionQueue[0]` 빈 배열 가드 추가 — Battle.ts:88 메아리", "inline": false }
    ],
    "footer": { "text": "dev.gate.verify.block.battle_atb · exit 1" },
    "timestamp": "2026-05-01T03:42:18.123Z"
  }]
}
```

### 5.2 색상 상수 (decimal — Discord embed)

| 상태 | Hex | Decimal | 용도 |
|---|---|---|---|
| PASS | `#2ECC71` | 3066993 | (알림 미사용) |
| BLOCK | `#FF4444` | 16729156 | 시나리오 실패 / 예산 초과 누적 |
| WARN | `#FFD700` | 16766720 | 예산 초과 1~2회 |
| ERROR | `#FF8C42` | 16747586 | 게이트 자체 오류 (vitest 미설치 등) |

### 5.3 embed 제목 패턴 (4상태)

```
🟢 verify:core PASS — all (3종 · 36.7s)         ← 알림 X (참고용 패턴)
🔴 verify:core BLOCK — <key> (<name> · <file>:<line>)
🟡 verify:core WARN — over_budget (+Δs · 누적 N/3회)
🟠 verify:core ERROR — bootstrap (<reason>)
```

### 5.4 n8n 워크플로우 트리거 (계섬월 + 봇 협업)

`verify-core.mjs` 종료 직후 `--json` 모드 결과를 `#n8n:verify-alert` (신설 alias)로 전송. 본 스프린트에서는 alias만 예약 — 실 워크플로우 연결은 **다음 스프린트 P2**.

```
# verify-core.mjs 마지막 줄에 추가 (조건부)
if (process.env.AC_ALERT_HOOK && finalState !== 'PASS') {
  // POST to webhook with §5.1 embed JSON
}
```

---

## 6. README 배지 (사전 도면) — 본 스프린트 스코프 외 ⏸

```markdown
[![Verify Core](https://img.shields.io/badge/Verify%20Core-3%2F3%20PASS-brightgreen?style=for-the-badge)](#-verify-core)
[![Verify Budget](https://img.shields.io/badge/Verify%20Budget-%E2%89%A460s-blue?style=for-the-badge)](#-verify-core)
```

| 배지 | 트리거 | 색 | 비고 |
|---|---|---|---|
| `Verify Core 3/3 PASS` | 마지막 PASS 실행 | brightgreen | 1/3 BLOCK 시 red, 2/3 시 orange |
| `Verify Budget ≤60s` | total ≤ 60 | blue | 초과 시 yellow + `+Δs` 표기 |

→ 다음 스프린트 README §🛠️ 개발 동선 절에 박을 예정.

---

## 7. PR 임베드 (사전 도면) — 본 스프린트 스코프 외 ⏸

PR 마다 `verify:core` 회귀 시 봇 댓글:

```markdown
### 🔴 verify:core 회귀 감지

| 시나리오 | 이전 | 현재 | Δ |
|---|---|---|---|
| ⚔️ battle | 12.4s 🟢 | **24.7s 🔴** | +12.3s |
| 💾 save | 6.1s 🟢 | 6.3s 🟢 | +0.2s |
| 🗺️ map | 18.2s 🟢 | 18.5s 🟢 | +0.3s |
| **total** | **36.7s 🟢** | **49.5s 🟡** | **+12.8s** |

**처방**: `client/src/systems/CombatManager.ts:142` — actionQueue 가드 누락.
```

→ 다음 스프린트 봇 하네스 흡수.

---

## 8. 인계 체크리스트 — 계섬월 Build 단계 📋

| # | 산출 | 코드 위치 | 상태 |
|---|---|---|---|
| 1 | 시나리오 카드 3종 (TTY/NO_COLOR) | `verify-core.mjs §95-130` 출력 블록 | ☐ 박기 대기 |
| 2 | 예산 진행률 바 (시나리오 + total) | `verify-core.mjs §128-134` + `cli-colors §bar()` | ☐ 박기 대기 |
| 3 | 첫 실패 에러 카드 3종 | `verify-core.mjs §138-153` + `cli-colors §errorCard()` | ☐ 박기 대기 |
| 4 | emit 7 슬롯 + `BLOCK_HINTS` 상수 | `verify-core.mjs §148-184` | ☐ 박기 대기 |
| 5 | Discord embed JSON 4상태 | `--json` 모드 + `AC_ALERT_HOOK` 조건부 전송 | ☐ alias 예약만 |
| 6 | NO_COLOR 변환 규칙 | `cli-colors.mjs §useColor proxy` 이미 존재 | ✅ 완료 |
| 7 | 시각 회귀 — 3 시나리오 PASS 출력 캡처 | `docs/release/verify-core-snapshot.txt` 신설 | ☐ Build 후 |

---

## 9. 시각 회귀 픽스처 (Build 후 자동 생성 예정) 🖼️

`npm run dev:verify --json > .ac/verify-snapshot.json` 결과를 `tests/fixtures/verify-core/` 아래 3 케이스로 동결:

```
tests/fixtures/verify-core/
├── pass-all.snapshot.txt        ← §1.4 전체 출력
├── block-battle.snapshot.txt    ← §3.1 카드 + §4.1 BLOCK emit
├── block-save.snapshot.txt      ← §3.2 카드
├── block-map.snapshot.txt       ← §3.3 카드
└── warn-budget.snapshot.txt     ← §4.1 WARN emit
```

→ Test 단계(심요연 + 두련사) 픽스처 비교로 시각 회귀 차단.

---

## 10. 변경 이력

| 버전 | 날짜 | 작성 | 변경 |
|---|---|---|---|
| v1.0 | 2026-05-01 | 가춘운 | Asset 단계 — 시각 자원 5종 SSOT 정좌 (§1·§2·§3·§4·§5) |

---

> **다음 단계** — 본 팩 §1~§5 그대로 계섬월 Build에서 1커밋에 머지. 박을 자리는 §8 체크리스트 그대로. ✨
> *"60초 안에 세 도장이 차례로 검증되옵나이다."* — 가춘운 🎨
