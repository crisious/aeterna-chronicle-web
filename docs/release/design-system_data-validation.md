# 에테르나 크로니클 — 데이터 검증 시스템 디자인 시스템 v1.0

> 작성: 가춘운 (CMO/디자인) ✨
> 작성일: 2026-04-28
> 스프린트: Auto: 데이터 검증 시스템 구축 (Plan 단계)
> SSOT 위계: 본 문서 = 토픽 확장 1차 SSOT (DESIGN.md §12 신설 후보)
> 연관 SSOT:
> - PRD: 정경패 — 데이터 검증 시스템 v1.0
> - 아키텍처: 두련사 *선禪 4계* (Schema → Load → Audit → Report)
> - 게이트: 백능파 **REDUCTION** — `monster_data.json` 단일 ajv 검증 PASS + 1커밋 머지

---

## 0. 어머~ CLI에 무슨 디자인이 필요해요? 💭

대표(crisi)가 콘텐츠 1건을 추가할 때마다 만나는 게 **터미널 출력**이거든요!

- 빨간 글자가 콱! 박히면? → 패닉 😢 ("내가 뭘 망쳤지?")
- PASS만 한 줄 떠 있으면? → 안심은 되지만 다음 액션이 헷갈림
- path/field/reason이 한 덩어리로 뭉쳐 있으면? → 어디 고쳐야 할지 안 보임
- 색이 너무 화려하면? → CI 로그에서 ANSI 깨짐 / 가독성 폭망

→ **검증 CLI는 "고요하게 길을 알려주는" 디자인 언어가 필요해요.** 화려함보다 **명료·복구·안심**이 핵심 정서! 세이브·로드 시스템 톤(`design-system_save-load-system.md`)과 **같은 결**로 미러합니다 ✨

---

## 1. 디자인 원칙 (5계명) ✨

| 원칙 | 설명 | 실천 |
|---|---|---|
| **무소음 PASS (Quiet Pass)** | 통과는 한 줄, 이모지 1개로 끝 | `✅ monster_data.json — 142건 PASS` |
| **2줄 ERROR (Two-Line Error)** | 실패는 path 1줄 + reason 1줄 = 정확히 2줄 | 한 화면에 5건 떠도 위계 보존 |
| **불안 최소화 (Reassuring Tone)** | "망가졌다" ❌ → "다시 봐 주실까요?" ✅ | "고치는 법" 항상 함께 제시 |
| **CI 안전 (CI-Safe)** | `NO_COLOR=1` 자동 감지, 이모지 fallback | tty 아닐 때 ANSI 미출력 |
| **일관성 (Consistency)** | save-load 디자인 토큰을 그대로 미러 | 신규 컬러 ❌, 기존 ANSI 16색 조합만 |

---

## 2. 컬러 시스템 — CLI ANSI 토큰 🎨

> 새로운 컬러 ❌. ANSI 16색 + DESIGN.md §2 팔레트의 **의미 매핑**만 정의

### 2.1 검증 상태 4종

| 상태 ID | 한글 라벨 | ANSI 코드 | hex (참조용) | 이모지 | 의미 |
|---|---|---|---|---|---|
| `pass` | **통과** ✅ | `\x1b[32m` (green) | `#5FCB7A` | ✅ | schema 일치 — 다음으로 |
| `warn` | 주의 ⚠️ | `\x1b[33m` (yellow) | `#E8A33A` | ⚠️ | 통과했으나 outlier (±2σ 밖) |
| `error` | 실패 ❌ | `\x1b[31m` (red) | `#E85A5A` | ❌ | schema/참조 위반 — 머지 차단 |
| `info` | 정보 💡 | `\x1b[36m` (cyan) | `#4A9EFF` | 💡 | 통계·요약·힌트 |

### 2.2 보조 — 정보 강조

| 토큰 | ANSI | 용도 |
|---|---|---|
| `path` (파일경로) | `\x1b[1m\x1b[37m` (bold white) | `data/monsters/...json:42` |
| `field` (JSON 키) | `\x1b[35m` (magenta) | `monsters[3].stats.hp` |
| `value` (실제값) | `\x1b[2m\x1b[37m` (dim white) | `"hp": 999999` |
| `expected` (기대값) | `\x1b[36m` (cyan) | `integer ≤ 50000` |

### 2.3 절대 쓰지 않는 색

- ❌ **배경색 (`\x1b[4Xm`)** — 터미널 폭마다 깨짐
- ❌ **밝은 빨강·주황 동시 사용** — 색약 유저에게 동일하게 보임
- ❌ **256색·truecolor** — 일부 CI 러너에서 깨짐. ANSI 16색만!

### 2.4 NO_COLOR 폴백

```ts
const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const c = useColor ? ANSI : { pass:'', warn:'', error:'', reset:'' };
```

→ CI 로그 / GitHub Actions / 파이프 리다이렉트 모두 안전 ✅

---

## 3. 타이포 & 레이아웃 — 출력 위계 📝

> 폰트는 터미널이 정해요. 우리는 **여백·정렬·기호**로만 위계를 만들어요!

### 3.1 4단계 위계

| 레이어 | 형태 | 예시 |
|---|---|---|
| **§ 헤더** | 개행 + ─ 구분선 (40자) | `─── 🛡️  Data Validation ───` |
| **§ 요약 줄** | 1줄, 이모지 + 카운트 | `✅ 142 PASS · ⚠️ 3 WARN · ❌ 0 ERROR` |
| **§ 항목 줄** | 2줄 (path / reason) | (§4 표준 포맷 참조) |
| **§ 푸터** | 개행 + 다음 액션 1줄 | `💡 npm run data:validate:monster -- --fix` |

### 3.2 들여쓰기 규약

- 최상위 요약: 0칸
- 항목 path 줄: 2칸 들여쓰기 + 이모지 1개
- 항목 reason 줄: 4칸 들여쓰기 + `└─` 트리 기호
- 코드/값 인용: backtick `` ` `` 으로 감쌈

---

## 4. 표준 출력 포맷 — "2줄 ERROR" SSOT 🪶

> 두련사 *Report 4계*의 콜레이트 형식. 본 절이 **이 토픽의 핵심 SSOT**!

### 4.1 PASS (조용히, 1줄)

```
✅ monster_data.json — 142 entries · schema OK
```

### 4.2 ERROR (정확히 2줄)

```
  ❌ data/monsters/chapter4_boss.json:128
    └─ monsters[3].stats.hp = `999999` (expected: integer ≤ 50000)
```

**구조 분해**:
- 1줄: `[indent2] [emoji] [bold path]:[line]`
- 2줄: `[indent4] └─ [magenta field] = [dim value] (expected: [cyan rule])`

### 4.3 WARN (outlier, 2줄, ±2σ)

```
  ⚠️ data/monsters/chapter4_boss.json:128
    └─ monsters[3].stats.hp = `48000` (outlier: μ=12000, σ=4500, +8.0σ)
```

### 4.4 요약 푸터 (항상 마지막 3줄)

```
─────────────────────────────────────────
✅ 142 PASS · ⚠️ 3 WARN · ❌ 0 ERROR · 1.4s
💡 다음: npm run data:validate -- --watch
```

→ **카운트는 항상 PASS·WARN·ERROR 순**. 시간은 ms 아닌 s 단위. 다음 액션 1줄은 *반드시* 명령어 형태로!

---

## 5. 카피 톤 — 안심 + 정확 ✨

세이브·로드 카피 5계명을 그대로 미러:

| 계명 | DO | DON'T |
|---|---|---|
| **원인 → 처방** | `expected: integer ≤ 50000` | `invalid value` |
| **수치는 사실** | `+8.0σ` `μ=12000` | `너무 큼` |
| **경로 절단 금지** | `data/monsters/chapter4_boss.json:128` | `...boss.json` |
| **시(詩)는 hint만** | 푸터 1줄에서만 ("기억의 결을 다시 한 번~") | path/reason 줄에 ❌ |
| **도메인 키 규약** | `data.monster.<gate>.<state>` | 자유 카피 |

### 5.1 HOLD/PASS/BLOCK 카피 슬롯 (계섬월 인계용 12슬롯)

```ts
// src/constants/data_validation_messages.ts (계섬월 Build 단계 생성)
export const DATA_MSG = {
  'monster.schema.pass':    { ko: '✅ {file} — {count}건 schema OK',
                              en: '✅ {file} — {count} entries · schema OK' },
  'monster.schema.error':   { ko: '❌ {path}\n  └─ {field} = `{value}` (기대값: {expected})',
                              en: '❌ {path}\n  └─ {field} = `{value}` (expected: {expected})' },
  'monster.outlier.warn':   { ko: '⚠️ {path}\n  └─ {field} = `{value}` (이상치: μ={mu}, σ={sigma}, {z}σ)',
                              en: '⚠️ {path}\n  └─ {field} = `{value}` (outlier: μ={mu}, σ={sigma}, {z}σ)' },
  // ... 4종 게이트(schema/ref/balance/load) × 3 상태 = 12슬롯, ko/en = 24줄
};
```

> **본 스프린트(REDUCTION)에서는 `monster.schema.*` 3슬롯만 구현**. 나머지 9슬롯은 다음 스프린트.

---

## 6. 반응형 — 터미널 폭 적응 📐

| 폭 | 동작 |
|---|---|
| **≥ 80자** (표준) | 위 §4 풀 포맷 |
| **< 80자** (좁은 터미널) | path 줄 자동 줄바꿈, `└─` 들여쓰기는 유지 |
| **CI 로그** | NO_COLOR=1, 이모지 → 텍스트 라벨 (`[PASS]`, `[ERROR]`, `[WARN]`) |
| **JSON 출력** (`--json`) | 본 디자인 무시, 기계가 읽는 모드 (계섬월 Build에서 추가) |

---

## 7. 봉인 (이소화 비협상) 🔒

본 디자인 시스템에서 **임의 변경 금지** 4종:

1. **2줄 ERROR 포맷** — path 1줄 + reason 1줄, 합쳐도/늘려도 ❌
2. **PASS·WARN·ERROR 카운트 순서** — 절대 바뀌지 않음
3. **NO_COLOR 자동 감지** — 옵션 아니라 **필수**
4. **신규 hex/ANSI 추가** — DESIGN.md §2 + ANSI 16색 외 모두 ❌

변경 절차: DESIGN.md §12 갱신 → 본 문서 갱신 → 코드 갱신 (위에서 아래로만)

---

## 8. 인계 체크 (Build 단계 — 계섬월) ✅

- [ ] `src/constants/data_validation_messages.ts` 3슬롯 (REDUCTION 스코프)
- [ ] `scripts/validate-monster-data.ts` 출력이 §4 표준 포맷과 정확히 일치
- [ ] `NO_COLOR=1` 환경변수에서 ANSI 미출력 검증
- [ ] PASS 시 단 1줄, ERROR 시 정확히 2줄 단위 검증 (스냅샷 테스트 1건)
- [ ] 푸터 카운트 순서 PASS·WARN·ERROR 고정 검증

---

> 어머~! 이 정도면 대표(crisi)가 콘텐츠 한 톨 추가할 때마다 **터미널이 다정하게 손잡아 주는** 그림이 그려지지 않나요?! 🎨✨
> path 한 번에 알려주고, reason 한 번에 알려주고, 다음 명령어 한 번에 알려주고 — 이 *세 손짓*이면 충분해요!
