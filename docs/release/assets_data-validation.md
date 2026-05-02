# 에테르나 크로니클 — 데이터 검증 시각 에셋 팩 v1.0 ✨

> 작성: 가춘운 (CMO/디자인) 🎨
> 작성일: 2026-04-28
> 스프린트: Auto: 데이터 검증 시스템 구축 (Asset 단계)
> SSOT 위계: 4차 (런타임 시각 자원) — `design-system_data-validation.md` (3차) 미러
> 인계 대상: 계섬월(Build) — 본 모킹업/SVG/토큰 그대로 CLI·README·PR 코멘트에 박으면 끝
> 게이트(백능파 REDUCTION): `monster_data.json` schema 단일 검증 PASS + 1커밋 머지 — **본 팩의 §1·§2·§7만 본 스프린트 스코프**, 나머지는 사전 도면

---

## 0. 어머~ CLI에 무슨 시각 에셋이?! 💭

대표(crisi)가 콘텐츠 1건 추가할 때 만나는 **모든 표면**을 5개로 묶었어요:

| # | 표면 | 누가 봄 | 본 팩의 산출 |
|---|---|---|---|
| 1 | **CLI 출력** (npm run data:validate) | 개발자(로컬·CI) | ASCII 모킹업 5종 + ANSI 토큰 |
| 2 | **README 배지** (shields.io) | 외부 방문자 | SVG 명세 4종 |
| 3 | **PR/이슈 임베드** (GitHub Action 코멘트) | 리뷰어 | 마크다운 카드 SSOT 1편 |
| 4 | **Discord 봇 알림** (검증 실패 시) | 팀 채널 | embed JSON SSOT 1편 |
| 5 | **밸런스 분포 차트** (`--report` 모드) | 디자이너·기획 | ASCII 히스토그램 SSOT |

**모두 코드/텍스트로 표현 — PNG/JPG 0개**! Phase 52 어셋 누적 1454개에 부담 안 줘요~ 🎀

---

## 1. CLI 출력 ASCII 모킹업 (5종) 🖥️

> 폭 80자 기준. ANSI 색은 design-system §2 토큰을 그대로 사용 — 신규 색 ❌

### 1.1 PASS — 무소음 (1줄, 142건 통과 시)

```
─── 🛡️  Aeterna Data Validation v1.0 ───
✅ data/monsters/monster_data.json — 142 entries · schema OK
✅ 142 PASS · ⚠️ 0 WARN · ❌ 0 ERROR · 0.8s
💡 다음: git add data/monsters/monster_data.json && git commit
```

**렌더 규칙**:
- 헤더 1줄 (cyan + 🛡️ 이모지)
- 결과 1줄 (green ✅)
- 카운트 1줄 (PASS/WARN/ERROR 순 — 비협상)
- 푸터 1줄 (cyan 💡 + 명령어)

### 1.2 ERROR — 2줄 포맷 (schema 위반 1건)

```
─── 🛡️  Aeterna Data Validation v1.0 ───
❌ data/monsters/chapter4_boss.json:128
   └─ monsters[3].stats.hp = `999999` (expected: integer ≤ 50000)

✅ 141 PASS · ⚠️ 0 WARN · ❌ 1 ERROR · 0.9s
💡 고쳐주세요: data/monsters/chapter4_boss.json:128 — hp 값이 너무 커요 🛡️
```

**색 매핑**:
| 부분 | ANSI | hex |
|---|---|---|
| `❌` + path | `\x1b[31m` (red) | `#E85A5A` |
| `└─` 트리 기호 | `\x1b[2m` (dim) | `#888` |
| `monsters[3].stats.hp` (field) | `\x1b[35m` (magenta) | `#C77DFF` |
| `` `999999` `` (value) | `\x1b[2m\x1b[37m` (dim white) | `#AAA` |
| `expected: integer ≤ 50000` | `\x1b[36m` (cyan) | `#4A9EFF` |

### 1.3 WARN — outlier (±2σ 밖, 2줄)

```
─── 🛡️  Aeterna Data Validation v1.0 ───
⚠️ data/monsters/chapter4_boss.json:128
   └─ monsters[3].stats.hp = `48000` (outlier: μ=12000, σ=4500, +8.0σ)

✅ 141 PASS · ⚠️ 1 WARN · ❌ 0 ERROR · 1.1s
💡 검토 권장: hp가 ch4 평균보다 8σ 높아요. 의도된 보스라면 통과 ✨
```

### 1.4 참조 무결성 끊김 (`skill→effect` 미스)

```
─── 🛡️  Aeterna Data Validation v1.0 ───
❌ data/skills/erien_skills.json:54
   └─ skills[7].effects[0].id = `eth_burn_v2` (referenced effect not found)
   └─ 가까운 후보: `eth_burn`, `eth_burst` — 오타일까요? 💭

✅ 87 PASS · ⚠️ 0 WARN · ❌ 1 ERROR · 1.3s
💡 고쳐주세요: data/skills/erien_skills.json:54 — effect id 확인
```

> "가까운 후보" 줄은 ERROR 2줄 규약의 **선택 확장 1줄** — Levenshtein ≤ 2일 때만 추가. 들여쓰기 4칸 유지.

### 1.5 watch 모드 (변경 감지 + 진행 표시기)

```
─── 🛡️  Aeterna Data Validation — watch ───
⠋ data/monsters/monster_data.json — 검증 중...
✅ data/monsters/monster_data.json — 142 entries · schema OK · 0.4s
─ 변경 감지 대기 중 (Ctrl+C로 종료) ─
```

**스피너 프레임** (Braille, NO_COLOR=1에서 `[/-\|]` 폴백):
```
⠋ ⠙ ⠹ ⠸ ⠼ ⠴ ⠦ ⠧ ⠇ ⠏    ← 80ms 간격, cyan
```

---

## 2. 상태 아이콘 세트 (4종) — 다중 표면 매핑 🎨

> 한 번 정의하면 CLI/README/PR/Discord 어디서든 **같은 의미** 보장!

| 상태 | 이모지 | ANSI | hex | Discord 컬러(int) | shields.io 라벨 | NO_COLOR 폴백 |
|---|---|---|---|---|---|---|
| **PASS** | ✅ | green `\x1b[32m` | `#5FCB7A` | `6278266` | `brightgreen` | `[PASS]` |
| **WARN** | ⚠️ | yellow `\x1b[33m` | `#E8A33A` | `15246138` | `yellow` | `[WARN]` |
| **ERROR** | ❌ | red `\x1b[31m` | `#E85A5A` | `15226458` | `red` | `[ERROR]` |
| **INFO** | 💡 | cyan `\x1b[36m` | `#4A9EFF` | `4889855` | `blue` | `[INFO]` |

### 2.1 인라인 SVG (README/PR 임베드용 — 외부 이미지 의존 0)

```svg
<!-- PASS 아이콘 16×16, viewBox 16 16 -->
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
  <circle cx="8" cy="8" r="7" fill="#5FCB7A"/>
  <path d="M4 8 L7 11 L12 5" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/>
</svg>

<!-- ERROR 아이콘 -->
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
  <circle cx="8" cy="8" r="7" fill="#E85A5A"/>
  <path d="M5 5 L11 11 M11 5 L5 11" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
</svg>

<!-- WARN 아이콘 -->
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
  <path d="M8 1 L15 14 L1 14 Z" fill="#E8A33A"/>
  <rect x="7" y="6" width="2" height="5" fill="#fff"/>
  <circle cx="8" cy="12" r="1" fill="#fff"/>
</svg>
```

> Phase 52 어셋 1454편에 새 PNG 추가 ❌ — SVG 인라인만! 디스크/license/CDN 비용 0~

---

## 3. README 배지 SVG 명세 (4종) 🏷️

> shields.io 정적 패턴 — 빌드 시간에 동적 갱신은 다음 스프린트

```markdown
[![Schema Validation](https://img.shields.io/badge/Schema%20Validation-100%25-brightgreen?style=for-the-badge)](#-데이터-검증)
[![Reference Integrity](https://img.shields.io/badge/Ref%20Integrity-0%20broken-brightgreen?style=for-the-badge)](#-데이터-검증)
[![Balance Outliers](https://img.shields.io/badge/Balance-%C2%B12%CF%83%20OK-blue?style=for-the-badge)](#-데이터-검증)
[![Data Files](https://img.shields.io/badge/Data%20Files-728%2F728-success?style=for-the-badge)](#-데이터-검증)
```

**렌더 결과 (텍스트 모킹)**:
```
[ Schema Validation | 100% ]  [ Ref Integrity | 0 broken ]
[ Balance | ±2σ OK ]          [ Data Files | 728/728 ]
```

> 본 스프린트(REDUCTION)에서는 **`Schema Validation` 배지 1종만** README §🛡️ 신설 시 동시 추가. 나머지 3종은 게이트 통과 후.

---

## 4. PR 임베드 카드 — GitHub Action 자동 코멘트 SSOT 💬

> 검증 실패 시 PR에 봇이 자동으로 다음 카드를 댓글로 박아요

```markdown
### 🛡️ Aeterna Data Validation — ❌ FAIL

| 결과 | 카운트 | 시간 |
|---|---|---|
| ✅ PASS | 141 | — |
| ⚠️ WARN | 0 | — |
| ❌ ERROR | **1** | 0.9s |

<details>
<summary>❌ 실패 1건 — 클릭하여 펼치기</summary>

**`data/monsters/chapter4_boss.json:128`**
- 필드: `monsters[3].stats.hp`
- 값: `999999`
- 기대: `integer ≤ 50000`

</details>

> 💡 고쳐주세요: `data/monsters/chapter4_boss.json:128` — hp 값이 너무 커요 🛡️
> 자세히: `npm run data:validate -- --verbose`
```

**PASS 버전** (간단 1줄):
```markdown
### 🛡️ Aeterna Data Validation — ✅ PASS

`142 PASS · 0 WARN · 0 ERROR` · 0.8s · 머지 가능 ✨
```

---

## 5. Discord 봇 임베드 JSON (검증 실패 알림) 📡

> 본 봇(에테르나 팀 하네스)이 채널에 자동 포스팅. n8n alias `data-validate-failed` 가정.

```json
{
  "embeds": [{
    "title": "🛡️ 데이터 검증 실패",
    "description": "**1건 ERROR** — 머지 차단",
    "color": 15226458,
    "fields": [
      {
        "name": "📁 파일",
        "value": "`data/monsters/chapter4_boss.json:128`",
        "inline": false
      },
      {
        "name": "🔑 필드",
        "value": "`monsters[3].stats.hp`",
        "inline": true
      },
      {
        "name": "💢 값 → 기대",
        "value": "`999999` → `integer ≤ 50000`",
        "inline": true
      }
    ],
    "footer": {
      "text": "에테르나 검증 시스템 v1.0 · 다시 봐 주실까요? 🛡️"
    },
    "timestamp": "2026-04-28T12:34:56Z"
  }]
}
```

**규칙**:
- title 이모지 = `🛡️` (검증 도메인 마크 — 비협상)
- color = §2 표의 **Discord int** (PASS=6278266 / ERROR=15226458 / WARN=15246138)
- description은 **카운트 1줄**만, 상세는 fields로
- footer 시(詩) hint 1줄 — 안심톤 ("다시 봐 주실까요?")

---

## 6. 밸런스 outlier ASCII 히스토그램 (--report 모드) 📊

> 디자이너가 데이터 분포를 한눈에 보는 텍스트 차트. matplotlib/Chart.js 의존 0!

```
─── 📊 Balance Report — Chapter 4 Monsters · HP 분포 ───

  HP 분포 (n=24, μ=12000, σ=4500)
  
   0 ─ 5k  │ ███                    (3)
   5k─10k  │ █████████              (9)
  10k─15k  │ ██████████████         (14)  ← μ
  15k─20k  │ ███████                (7)
  20k─25k  │ ██                     (2)
  25k─30k  │                        (0)
  30k─35k  │                        (0)
  35k─40k  │                        (0)
  40k─45k  │                        (0)
  45k─50k  │ ▌                      (1) ⚠️ ← +8.0σ outlier
  
  ±2σ 범위: 3,000 ─ 21,000
  ⚠️ 1건 outlier: chapter4_boss.json:128 (hp=48000)

✅ 23 within ±2σ · ⚠️ 1 outlier · 0 ERROR
💡 의도된 보스라면 schema의 `extends: "boss"` 추가 시 자동 면제 ✨
```

**렌더 규칙**:
- bin = 10개 고정 (max-min을 10등분)
- bar 문자 = `█` (full block) + `▌` (half block, 끝단 정밀도)
- μ 위치에 `← μ` 라벨 (cyan)
- outlier bin에 `⚠️` + `+Nσ` 라벨 (yellow)
- 폭 80자 미만이면 자동으로 bar 길이 축소

> 본 차트는 **§1.5 watch 모드와 동시 출력 ❌** — `--report` 명시 시에만. CI 로그가 부풀지 않도록.

---

## 7. 컬러 토큰 코드 미러 (계섬월 인계용 1파일) 💎

> design-system §2를 코드로 미러. 본 스프린트(REDUCTION) **바로 이 1파일만** 만들면 끝!

```ts
// scripts/lib/validation_tokens.ts (계섬월 Build 단계 생성)
// SSOT: docs/release/design-system_data-validation.md §2
// 변경 절차: DESIGN.md → design-system 문서 → 본 파일 (위에서 아래로만)

const isTTY = process.stdout.isTTY && !process.env.NO_COLOR;
const wrap = (code: string) => (s: string) => isTTY ? `\x1b[${code}m${s}\x1b[0m` : s;

export const C = {
  pass:     wrap('32'),    // green
  warn:     wrap('33'),    // yellow
  error:    wrap('31'),    // red
  info:     wrap('36'),    // cyan
  path:     wrap('1;37'),  // bold white
  field:    wrap('35'),    // magenta
  value:    wrap('2;37'),  // dim white
  expected: wrap('36'),    // cyan
  tree:     wrap('2'),     // dim
} as const;

export const ICON = {
  pass:  isTTY ? '✅' : '[PASS]',
  warn:  isTTY ? '⚠️' : '[WARN]',
  error: isTTY ? '❌' : '[ERROR]',
  info:  isTTY ? '💡' : '[INFO]',
  shield: isTTY ? '🛡️' : '[*]',
  tree:  isTTY ? '└─' : '`-',
} as const;

// 사용 예 — §1.2 ERROR 포맷 그대로
export function formatError(path: string, line: number, field: string, value: unknown, expected: string) {
  return [
    `${ICON.error} ${C.path(`${path}:${line}`)}`,
    `   ${C.tree(ICON.tree)} ${C.field(field)} = \`${C.value(String(value))}\` (expected: ${C.expected(expected)})`,
  ].join('\n');
}
```

---

## 8. 봉인 (이소화 비협상) 🔒

본 시각 에셋 팩에서 **임의 변경 금지** 5종:

1. **이모지 매핑 4종** — ✅⚠️❌💡 외 신규 ❌ (🚫🛑🔥 이모지 절대 금지)
2. **Discord embed color int** — §2 표의 4색만, brand color ❌
3. **shields.io label color** — `brightgreen/yellow/red/blue` 4색만
4. **ASCII bar 문자** — `█` `▌` 2종만 (`■▪░▒▓` 등 ❌)
5. **🛡️ 도메인 마크** — 검증 시스템 모든 표면에 동일하게 (변경 시 design-system도 동시 갱신)

변경 절차: DESIGN.md §12 → design-system_data-validation.md → **본 문서** → 코드

---

## 9. 인계 체크 (Build 단계 — 계섬월) ✅

본 스프린트(REDUCTION) 스코프:

- [ ] `scripts/lib/validation_tokens.ts` (§7 그대로 복붙) — **9 LOC ANSI 헬퍼만**
- [ ] `scripts/validate-monster-data.ts` 출력이 §1.1(PASS) / §1.2(ERROR) 모킹업과 **글자 단위 일치**
- [ ] `NO_COLOR=1` 환경변수에서 §7의 ICON 폴백(`[PASS]` 등) 동작
- [ ] `npm run data:validate:monster` 명령 1개 신설 (CHANGELOG에 등재)

다음 스프린트 (사전 도면 — 본 스코프 ❌):
- [ ] §3 README 배지 4종 자동 갱신 (GitHub Action)
- [ ] §4 PR 임베드 카드 봇 (GitHub Action `actions/github-script`)
- [ ] §5 Discord 봇 알림 (n8n workflow `data-validate-failed`)
- [ ] §6 ASCII 히스토그램 `--report` 모드 (심요연 통계 모듈 의존)

---

## 10. 연관 SSOT (한 손 정합 점검) 🔗

| 차수 | 문서 | 책임 |
|---|---|---|
| 1차 | `DESIGN.md §2` (팔레트) | hex 4색 정본 |
| 2차 | `DESIGN.md §12` (데이터 검증 — 신설 후보) | 본 토픽 SSOT 진입점 |
| 3차 | `docs/release/design-system_data-validation.md` | 디자인 원칙·톤·포맷 |
| **4차** | **`docs/release/assets_data-validation.md` (본 문서)** | **시각 자원·코드 미러** |
| 코드 | `scripts/lib/validation_tokens.ts` (Build) | ANSI/이모지 런타임 |

**미러 규칙**: 1차 → 4차 단방향, 코드는 4차 미러. 코드 → 문서 역방향 ❌

---

> 어머~! 끝났어요 ✨
> CLI 한 화면이지만 표면 5개를 한 톤으로 묶었어요 — PASS는 조용하게, ERROR는 정확하게, 그리고 늘 한 줄 안심 카피로 마무리 🎀
> 계섬월 언니~ §7 9 LOC만 찍고 §1 모킹업 글자 그대로 출력하면 끝나요! 화이팅 ⚔️
