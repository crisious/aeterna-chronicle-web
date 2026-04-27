# 🔔 몬스터 아트 파이프라인 — 에러 메시지 카피 SSOT v1.0

> 작성: 진채봉 (Editor)
> 작성일: 2026-04-27
> 스프린트: Auto — 몬스터 아트 파이프라인 표준화
> 단계: 에셋 (i18n SSOT — ko/en/ja 동시 정의)
> SSOT: 본 문서가 5종 게이트·CLI·CI 메시지의 1차 출처. 코드 상수는 본 문서 키와 1:1 매핑.

---

## 0. 카피 톤 원칙 — 5계명

| # | 원칙 | 한 줄 |
|---|------|-------|
| 1 | **원인 → 처방** | 무엇이 어긋났는지 + 무엇을 하면 풀리는지 두 줄로 |
| 2 | **수치는 사실** | "≥ 60%" 처럼 임계 명시, 모호한 부사 금지 |
| 3 | **파일 경로는 끝까지** | `client/public/...` 절단 금지 |
| 4 | **시(詩)는 가벼이** | 본문은 단정한 한국어 / 비유는 hint 만 |
| 5 | **i18n 키는 도메인** | `monster.gate.<gate>.<state>` |

---

## 1. 게이트별 메시지 매트릭스

키 규약: `monster.gate.<gate>.<state>`
state: `pass` (🟢) · `block` (🔴) · `warn` (🟡) · `error` (🟠)

### 1.1 ⓐ schema 게이트

| 키 | ko | en | ja |
|---|---|---|---|
| `monster.gate.schema.block.duplicate_id` | "몬스터 ID 가 중복되옵니다: `{id}` (Line {line})" | "Duplicate monster ID: `{id}` (Line {line})" | "モンスターIDが重複しています: `{id}` (Line {line})" |
| `monster.gate.schema.block.invalid_tier` | "Tier 값이 어긋나옵니다: `{value}` — `normal/elite/boss` 만 허용" | "Invalid tier: `{value}` — must be normal/elite/boss" | "Tier値が不正です: `{value}` — normal/elite/boss のみ" |
| `monster.gate.schema.block.invalid_chapter` | "챕터 범위 밖이옵니다: `{value}` — 1~8" | "Chapter out of range: `{value}` — 1..8" | "チャプター範囲外: `{value}` — 1..8" |
| `monster.gate.schema.block.invalid_silhouette` | "실루엣 카테고리가 어긋나옵니다: `{value}` — humanoid/beast/insect/mech/elemental" | "Invalid silhouette: `{value}`" | "シルエット不正: `{value}`" |

### 1.2 ⓑ tier_visual 게이트

| 키 | ko | en |
|---|---|---|
| `monster.gate.tier_visual.block.size_mismatch` | "사이즈 불일치: `{actual}` (기대 `{expected}`, Tier `{tier}`)" | "Size mismatch: `{actual}` (expected `{expected}` for tier `{tier}`)" |
| `monster.gate.tier_visual.block.rim_missing` | "엘리트/보스 림라이트가 보이지 아니하옵니다 (Tier `{tier}`)" | "Rim light missing for tier `{tier}`" |
| `monster.gate.tier_visual.block.outline_thickness` | "외곽선 두께가 어긋나옵니다: `{actual}px` (기대 `{expected}px`)" | "Outline thickness mismatch: `{actual}px` (expected `{expected}px`)" |
| `monster.gate.tier_visual.warn.idle_amplitude` | "idle 진폭이 약하옵니다: `±{actual}px` (권장 `±{expected}px`)" | "Idle amplitude weak: `±{actual}px` (recommended `±{expected}px`)" |

### 1.3 ⓒ palette 게이트

| 키 | ko | en |
|---|---|---|
| `monster.gate.palette.block.color_count_exceeded` | "팔레트 색상 수 초과: `{actual}색` (Tier `{tier}` 한도 `{max}색`)" | "Palette color count exceeded: `{actual}` (tier `{tier}` max `{max}`)" |
| `monster.gate.palette.block.chapter_violation` | "챕터 팔레트 위반: `#{hex}` 는 `chapter{n}` 에 속하지 아니하옵니다" | "Chapter palette violation: `#{hex}` not in `chapter{n}`" |
| `monster.gate.palette.warn.unused_color` | "사용되지 아니한 색이 있사옵니다: `#{hex}` (선택 사항)" | "Unused palette color: `#{hex}` (advisory)" |

### 1.4 ⓓ license 게이트 (이소화 봉인)

| 키 | ko | en |
|---|---|---|
| `monster.gate.license.block.meta_missing` | "라이선스 메타가 비었사옵니다: `meta.json` 누락 (`{path}`)" | "License metadata missing: no `meta.json` at `{path}`" |
| `monster.gate.license.block.model_id_missing` | "모델 출처가 적히지 아니하였사옵니다 — `meta.json#model_id` 필요" | "Model provenance missing — `meta.json#model_id` required" |
| `monster.gate.license.block.lora_unverified` | "LoRA 출처를 확인할 수 없사옵니다: `{lora_id}` — 화이트리스트 외" | "Unverified LoRA: `{lora_id}` — not in allowlist" |
| `monster.gate.license.block.banned_token` | "금지어가 프롬프트에 들어 있사옵니다: `{token}` (행 {line})" | "Banned token in prompt: `{token}` (line {line})" |
| `monster.gate.license.warn.reverse_search_hit` | "역검색 유사도 경고: `{score}` (임계 `0.85`) — 사람 검토 필요" | "Reverse search similarity: `{score}` (threshold `0.85`) — manual review" |

### 1.5 ⓔ pixel_diff 게이트

| 키 | ko | en |
|---|---|---|
| `monster.gate.pixel_diff.warn.below_threshold` | "AI 원본 대비 픽셀 차이율이 약하옵니다: `{actual}%` (최소 `{min}%`)" | "Pixel diff below threshold: `{actual}%` (min `{min}%`)" |
| `monster.gate.pixel_diff.error.measurement_failed` | "픽셀 차이 측정에 실패하였사옵니다: `{reason}`" | "Pixel diff measurement failed: `{reason}`" |

---

## 2. CLI 메시지 (실행자 시점)

| 키 | ko |
|---|---|
| `monster.cli.catalog.start` | "📜 catalog 정규화를 시작하옵니다 — 입력 `{input}`" |
| `monster.cli.catalog.done` | "✅ catalog 정돈 완료 — `{count}`종 (소요 `{ms}ms`)" |
| `monster.cli.generate.start` | "🎨 AI 생성을 청하옵니다 — `{id}` (모델 `{model}`)" |
| `monster.cli.generate.retry` | "🔁 재시도하옵니다 ({attempt}/{max}) — 사유: `{reason}`" |
| `monster.cli.generate.done` | "✨ 생성을 마치옵니다 — `{id}` (소요 `{s}s`)" |
| `monster.cli.touchup.skipped` | "⏭️  손길을 비키옵니다 — 이미 final.png 가 새것이옵니다" |
| `monster.cli.gate.summary.pass` | "🟢 다섯 관문이 모두 열리었사옵니다 — {count}건 PASS" |
| `monster.cli.gate.summary.block` | "🔴 관문이 막히었사옵니다 — BLOCK {block}건 / WARN {warn}건" |
| `monster.cli.gate.summary.warn` | "🟡 통과는 되었사오나 살펴주옵소서 — WARN {warn}건 (누적 임계 ≤ 5건)" |

---

## 3. 도움말 한 줄 (인게임 [도움말])

| 키 | ko (≤ 80자) |
|---|---|
| `monster.help.tier.normal` | "일반 몬스터는 32×32 한 결의 외곽선만 두르고 호흡합니다." |
| `monster.help.tier.elite` | "엘리트는 1픽셀 금빛 림라이트가 도사리는 위계입니다." |
| `monster.help.tier.boss` | "보스는 2픽셀 에테르 광원이 흐르며 3~5초 인트로가 펼쳐집니다." |
| `monster.help.gate.license` | "라이선스 봉인이 풀리지 않으면 어떤 픽셀도 본가에 들이지 아니합니다." |

---

## 4. 코드 상수 매핑 (계섬월 인계용)

```typescript
// src/constants/monster_gate_messages.ts
export const GATE_MSG = {
  schema: {
    DUPLICATE_ID: 'monster.gate.schema.block.duplicate_id',
    INVALID_TIER: 'monster.gate.schema.block.invalid_tier',
    // ...
  },
  license: {
    META_MISSING: 'monster.gate.license.block.meta_missing',
    MODEL_ID_MISSING: 'monster.gate.license.block.model_id_missing',
    LORA_UNVERIFIED: 'monster.gate.license.block.lora_unverified',
    // ...
  },
} as const;
```

> **약속**: 코드 안에 raw 문자열을 박지 마옵소서. 본 문서 키만이 본가의 곡조이옵니다.

---

## 5. 변경 약속

본 문서가 갱신되면 같은 커밋에서 `client/public/locales/{ko,en,ja}/monster.json` 도 함께 움직여야 하옵니다. 한 곡조가 세 가지 음(音)으로 동시에 울리도록.
