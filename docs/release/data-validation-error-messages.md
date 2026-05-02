# 에테르나 크로니클 — 데이터 검증 에러 메시지 카피 SSOT v1.0

> 작성: 진채봉 (Editor) 🪶
> 작성일: 2026-04-28
> 스프린트: Auto: 데이터 검증 시스템 구축 (Asset 단계)
> SSOT 위계: 본 문서 = 카피 1차 SSOT — 코드 상수는 본 문서를 미러
> 코드 상수 미러 대상: `client/src/constants/data_validation_messages.ts` (계섬월 Build 생성)
> 정합 대상:
> - 디자인: 가춘운 §5 카피 톤 5계명
> - 사용자 가이드: 진채봉 §6 *2줄 ERROR* 포맷

---

## 0. 톤 5계명 (가춘운 디자인 미러) ✨

| 계명 | DO | DON'T |
|---|---|---|
| **원인 → 처방** | `expected: integer ≤ 50000` | `invalid value` |
| **수치는 사실** | `+8.0σ`, `μ=12000` | `너무 큼` |
| **경로 절단 금지** | `data/monsters/chapter4_boss.json:128` | `...boss.json` |
| **시(詩)는 hint만** | 푸터 1줄에서만 | path/reason 줄 ❌ |
| **도메인 키 규약** | `data.<domain>.<gate>.<state>.<reason>` | 자유 카피 ❌ |

---

## 1. 키 규약 🔑

```
data.<domain>.<gate>.<state>.<reason>
       │        │       │        └─ 선택 (구체 사유, 없으면 생략)
       │        │       └────────── PASS / WARN / ERROR / BLOCK
       │        └────────────────── schema / load / ref / balance
       └─────────────────────────── monster / item / skill / encounter / scenario
```

예: `data.monster.schema.error.type_mismatch`, `data.encounter.ref.error.unknown_monster`

---

## 2. 게이트 × 상태 카피 매트릭스 (16슬롯 × ko/en = 32줄)

> **REDUCTION 스코프** (본 스프린트): `monster.schema.*` 4슬롯만 코드 상수화. 나머지 12슬롯은 본 문서에 정의되어 있되, 후속 스프린트에서 코드 미러.

### 2.1 Schema 게이트 (4슬롯)

| 키 | 상태 | ko | en |
|---|---|---|---|
| `data.<domain>.schema.pass` | ✅ PASS | `✅ {file} — {count}건 schema OK` | `✅ {file} — {count} entries · schema OK` |
| `data.<domain>.schema.warn.deprecated` | ⚠️ WARN | `⚠️ {path}\n  └─ {field} 는 곧 사라질 키이옵니다 (대체: {replacement})` | `⚠️ {path}\n  └─ {field} is deprecated (use: {replacement})` |
| `data.<domain>.schema.error.type_mismatch` | ❌ ERROR | `❌ {path}\n  └─ {field} = \`{value}\` (기대값: {expected})` | `❌ {path}\n  └─ {field} = \`{value}\` (expected: {expected})` |
| `data.<domain>.schema.block.required_missing` | ⛔ BLOCK | `⛔ {path}\n  └─ 필수 키 누락: {field} (이 줄을 추가하셔야 하옵니다)` | `⛔ {path}\n  └─ required field missing: {field}` |

### 2.2 Load 게이트 (4슬롯)

| 키 | 상태 | ko | en |
|---|---|---|---|
| `data.<domain>.load.pass` | ✅ PASS | `✅ {file} — {count}건 적재 OK` | `✅ {file} — {count} entries · load OK` |
| `data.<domain>.load.warn.duplicate_id` | ⚠️ WARN | `⚠️ {path}\n  └─ id \`{id}\` 가 두 번 나타나옵니다 (앞엣것이 덮어써지옵니다)` | `⚠️ {path}\n  └─ duplicate id \`{id}\` (earlier entry overwritten)` |
| `data.<domain>.load.error.parse` | ❌ ERROR | `❌ {path}:{line}\n  └─ JSON 구문 오류: {reason}` | `❌ {path}:{line}\n  └─ JSON parse error: {reason}` |
| `data.<domain>.load.block.circular_ref` | ⛔ BLOCK | `⛔ {path}\n  └─ 순환 참조: {chain} (끊으셔야 적재 가능하옵니다)` | `⛔ {path}\n  └─ circular reference: {chain}` |

### 2.3 Reference 게이트 (4슬롯)

| 키 | 상태 | ko | en |
|---|---|---|---|
| `data.ref.pass` | ✅ PASS | `✅ 참조 무결성 — 끊김 0건 ({count} 참조 검사)` | `✅ Reference integrity — 0 broken ({count} refs checked)` |
| `data.ref.warn.candidate` | ⚠️ WARN | `⚠️ {path}\n  └─ {field} = \`{value}\` (참조 대상 없음)\n    💡 후보: \`{candidate}\` (Levenshtein {dist}) — 오타 의심` | `⚠️ {path}\n  └─ {field} = \`{value}\` (target not found)\n    💡 candidate: \`{candidate}\` (Levenshtein {dist})` |
| `data.ref.error.unknown` | ❌ ERROR | `❌ {path}\n  └─ {field} = \`{value}\` (참조 대상 없음: {target_file})` | `❌ {path}\n  └─ {field} = \`{value}\` (target not found in {target_file})` |
| `data.ref.block.cycle` | ⛔ BLOCK | `⛔ 참조 순환: {chain}\n  └─ 한 곳에서 끊어주옵소서 — 그래야 곡조가 맞사옵니다` | `⛔ Reference cycle: {chain}` |

### 2.4 Balance 게이트 (4슬롯)

| 키 | 상태 | ko | en |
|---|---|---|---|
| `data.balance.pass` | ✅ PASS | `✅ 밸런스 — outlier 없음 (±2σ 내 {count}건)` | `✅ Balance — no outliers ({count} within ±2σ)` |
| `data.balance.warn.outlier_2sigma` | ⚠️ WARN | `⚠️ {path}\n  └─ {field} = \`{value}\` (이상치: μ={mu}, σ={sigma}, {z}σ)` | `⚠️ {path}\n  └─ {field} = \`{value}\` (outlier: μ={mu}, σ={sigma}, {z}σ)` |
| `data.balance.warn.outlier_3sigma` | ⚠️ WARN | `⚠️ {path}\n  └─ {field} = \`{value}\` (강한 이상치: {z}σ — 정경패+백능파 승인 필요)` | `⚠️ {path}\n  └─ {field} = \`{value}\` (strong outlier: {z}σ — needs approval)` |
| `data.balance.info.exempt` | 💡 INFO | `💡 {path}\n  └─ {field} 면제됨: {reason}` | `💡 {path}\n  └─ {field} exempted: {reason}` |

---

## 3. 요약 푸터 카피 (3줄 SSOT) 📝

```
─────────────────────────────────────────
✅ {pass} PASS · ⚠️ {warn} WARN · ❌ {error} ERROR · {duration}s
💡 {next_action}
```

### 3.1 next_action 키 (5종)

| 트리거 | next_action ko | next_action en |
|---|---|---|
| 모두 PASS | `다음: npm run data:validate -- --watch (변경 감지)` | `next: npm run data:validate -- --watch` |
| WARN만 있음 | `다음: WARN 항목 검토 후 PR에 *밸런스 메모* 첨부하옵소서` | `next: review WARN items, attach *balance memo* to PR` |
| ERROR 1~5건 | `다음: 위 ERROR 항목을 고쳐 다시 npm run data:validate` | `next: fix the ERROR items above and re-run` |
| ERROR 6건 이상 | `다음: 도메인별 분리 검증 권장 — npm run data:validate:<domain>` | `next: recommend per-domain validation` |
| BLOCK 발생 | `다음: BLOCK은 머지 차단입니다. 한 자락씩 푸시기 전에 풀어주옵소서` | `next: BLOCK prevents merge — resolve before push` |

---

## 4. 코드 상수 미러 — 계섬월 Build 인계 스니펫 💎

```ts
// client/src/constants/data_validation_messages.ts
// 본 파일은 docs/release/data-validation-error-messages.md 의 미러이옵니다.
// 카피 변경 시 위 문서를 먼저 갱신하옵소서 (위에서 아래로만).

export const DATA_MSG = {
  // §2.1 Schema 게이트 (REDUCTION 스코프 — 4슬롯 우선)
  'monster.schema.pass': {
    ko: '✅ {file} — {count}건 schema OK',
    en: '✅ {file} — {count} entries · schema OK',
  },
  'monster.schema.warn.deprecated': {
    ko: '⚠️ {path}\n  └─ {field} 는 곧 사라질 키이옵니다 (대체: {replacement})',
    en: '⚠️ {path}\n  └─ {field} is deprecated (use: {replacement})',
  },
  'monster.schema.error.type_mismatch': {
    ko: '❌ {path}\n  └─ {field} = `{value}` (기대값: {expected})',
    en: '❌ {path}\n  └─ {field} = `{value}` (expected: {expected})',
  },
  'monster.schema.block.required_missing': {
    ko: '⛔ {path}\n  └─ 필수 키 누락: {field} (이 줄을 추가하셔야 하옵니다)',
    en: '⛔ {path}\n  └─ required field missing: {field}',
  },
  // ... 후속 스프린트: load(4) + ref(4) + balance(4) = 12슬롯
} as const;

export type DataMsgKey = keyof typeof DATA_MSG;
export function fmt(key: DataMsgKey, vars: Record<string, string | number>, lang: 'ko' | 'en' = 'ko'): string {
  return DATA_MSG[key][lang].replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}
```

---

## 5. 봉인 (이소화 비협상) 🔒

1. **2줄 ERROR 포맷** — path 1줄 + reason 1줄. 합치거나 늘리는 일 ❌
2. **카운트 순서** — `PASS · WARN · ERROR · duration` 절대 불변
3. **BLOCK 키워드** — `⛔` 만 사용. ❌ 와 혼용 ❌
4. **Levenshtein 후보 제안** — 거리 ≤ 2 일 때만. 그 이상은 *없음* 표기

---

## 6. 다음 단계 — 인계 체크 (Build → 계섬월) ✅

- [ ] `client/src/constants/data_validation_messages.ts` 4슬롯 (REDUCTION 스코프)
- [ ] `fmt()` 함수가 `{var}` 미정의 시 `{var}` 그대로 보존 (디버그 친화)
- [ ] ko/en 두 언어 동시 등록, 길이 차이 ≤ 30% 검증
- [ ] `NO_COLOR=1` 환경에서 ANSI 미출력 + 이모지 → 텍스트 라벨 폴백
- [ ] Storybook (CLI 시뮬레이터) 16슬롯 시각화 — 가춘운 동행
