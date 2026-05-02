# 에테르나 크로니클 — 빌드-검증 사이클 단축 시각 에셋 팩 v1.0 ✨

> 작성: 가춘운 (CMO/디자인) 🎨
> 작성일: 2026-04-30
> 스프린트: Auto: 에테르나 크로니클 개발자 빌드-검증 사이클 단축 (Asset 단계)
> SSOT 위계: 4차 (런타임 시각 자원) — `design-system_dev-cycle-shortening.md` (3차) 미러 예정
> 인계 대상: 계섬월(Build) — 본 팩의 모킹업·토큰·코드 그대로 CLI/Discord/GitHub에 박으면 끝
> 게이트(백능파 REDUCTION): `npm run dev` 부팅 진행률 바 + `npm run qa:smoke` 자동화 검증 + 에러 카드 1종 — **본 팩의 §1·§2·§4·§7만 본 스프린트 스코프**, 나머지는 사전 도면
> **수신자: 대표(crisi) 본인** — 외부 사용자 X. "내가 매일 5초씩 보는 화면"이 시각 에셋의 1차 표면

---

## 0. 어머~ 빌드 도구에 무슨 시각 에셋이?! 💭

대표가 하루 50번 보는 **빌드-검증 표면**을 8개로 묶었어요. 모두 코드/텍스트 — PNG 0개, 어셋 누적 부담 0! 🎀

| # | 표면 | 누가 봄 | 본 팩의 산출 | 본 스프린트 |
|---|---|---|---|---|
| 1 | **CLI 컬러 토큰** (`npm run dev/qa/build`) | 대표 본인 | ANSI 코드 + 4상태 팔레트 | ✅ 필수 |
| 2 | **부팅 진행률 바** (`npm run dev` 시작) | 대표 본인 | ASCII 모킹업 + Phaser 단계 | ✅ 필수 |
| 3 | **QA 시나리오 결과 표** (`npm run qa:smoke`) | 대표 본인 | ASCII 표 4종 (전투/세이브/맵/통합) | ⏸ 사전 도면 |
| 4 | **에러 카드** (빌드 실패 시 단일 카드) | 대표 본인 | ASCII 카드 + 원인 파일/라인 강조 | ✅ 필수 |
| 5 | **README 배지** (shields.io) | 외부 방문자 | SVG 명세 3종 (Build / QA / Boot) | ⏸ 사전 도면 |
| 6 | **PR 임베드** (빌드 시간 회귀 시 봇) | 리뷰어 | 마크다운 카드 SSOT | ⏸ 사전 도면 |
| 7 | **Discord 봇 알림** (빌드 ≥ 5분 또는 실패) | 팀 채널 | embed JSON SSOT | ✅ 필수 |
| 8 | **VS Code 클릭 링크** (에러 라인 점프) | 대표 본인 | OSC 8 / file:// 스니펫 | ⏸ 사전 도면 |

> 본 스프린트 스코프 4개(§1·§2·§4·§7)는 **계섬월이 1커밋에 머지** — 백능파 REDUCTION 약속.

---

## 1. CLI 컬러 토큰 — `npm run dev/qa/build` 모든 출력의 SSOT 🎨

> 디자인 시스템(3차) 컬러를 ANSI escape에 미러. **터미널 = 게임 화면과 동일한 다크 판타지 톤**.

### 1.1 5상태 팔레트

| 상태 | 의미 | Hex (디자인 시스템) | ANSI fg | ANSI bg | 사용처 |
|---|---|---|---|---|---|
| **PASS** | 성공 / 통과 | `#5FCB7A` 🌿 | `\x1b[38;2;95;203;122m` | — | `✓ vite ready in 1.2s` |
| **WARN** | 경고 / 임계치 근접 | `#E8A33A` 🍂 | `\x1b[38;2;232;163;58m` | — | `⚠ boot 4.8s (target ≤ 5s)` |
| **ERROR** | 실패 / 차단 | `#E85A5A` 🔥 | `\x1b[38;2;232;90;90m` | `\x1b[48;2;42;20;20m` | 에러 카드 헤더 |
| **INFO** | 정보 / 진행 | `#4A9EFF` 💎 | `\x1b[38;2;74;158;255m` | — | `→ loading 24/120 files` |
| **DIM** | 보조 / 회색 | `#6B7280` 🌫️ | `\x1b[38;2;107;114;128m` | — | 파일 경로, 타임스탬프 |
| **ACCENT** | 강조 / 하이라이트 | `#D4A857` 👑 | `\x1b[38;2;212;168;87m` | — | 핵심 수치 (`87.3% PASS`) |

### 1.2 코드 상수 (계섬월 인계용)

```ts
// scripts/cli/cli-colors.ts (신설 예정)
const supportsColor = process.stdout.isTTY && !process.env.NO_COLOR;

export const C = supportsColor ? {
  pass:   '\x1b[38;2;95;203;122m',
  warn:   '\x1b[38;2;232;163;58m',
  error:  '\x1b[38;2;232;90;90m',
  info:   '\x1b[38;2;74;158;255m',
  dim:    '\x1b[38;2;107;114;128m',
  accent: '\x1b[38;2;212;168;87m',
  bold:   '\x1b[1m',
  reset:  '\x1b[0m',
} : new Proxy({}, { get: () => '' }) as Record<string, string>;

// 사용 예시
console.log(`${C.pass}✓${C.reset} vite ready in ${C.accent}1.2s${C.reset}`);
```

### 1.3 톤 5계명 (가춘운 봉인)

1. **NO_COLOR 존중** — 환경변수 있으면 모두 빈 문자열 (CI 로그, 파이프 출력 호환)
2. **이모지는 보조** — 색약 대응. ✓/⚠/✗/→/· 5종만 사용 (ASCII 안전)
3. **DIM 남발 금지** — 1줄에 DIM 2개 이상 → 가독성 폭망
4. **ACCENT는 1줄 1회** — 진짜 중요한 숫자 1개만 금색
5. **bg 사용 최소화** — ERROR 카드 헤더만 허용, 본문은 fg only

### 1.4 출력 모드 3종

| 모드 | 트리거 | 색상 | 이모지 | 사용처 |
|---|---|---|---|---|
| **TTY** | 기본 (대표 터미널) | ✅ 24bit | ✅ | 일상 개발 |
| **NO_COLOR** | `NO_COLOR=1` | ❌ | ✅ | 파이프 / 로그 파일 |
| **JSON** | `--json` 플래그 | ❌ | ❌ | CI / Discord 봇 입력 |

---

## 2. 부팅 진행률 바 — `npm run dev` 시작 화면 🚀

> Phaser dev server 부팅을 4단계로 가시화. **체감 시간 단축이 1차 목표** — 실제 단축 + 사용자 인지 단축.

### 2.1 ASCII 모킹업 (대표가 매일 보는 화면)

```
╭─ 에테르나 크로니클 dev server ────────────────────────╮
│                                                        │
│  → vite             [████████████████████] 100%  0.9s  │
│  → ts compile       [████████████████████] 100%  1.4s  │
│  → assets manifest  [████████████░░░░░░░░]  62%       │
│  → phaser warm-up   [░░░░░░░░░░░░░░░░░░░░]   0%       │
│                                                        │
│  ⏱  elapsed 2.3s    target ≤ 5.0s    ETA ~1.8s        │
╰────────────────────────────────────────────────────────╯
```

### 2.2 4상태 진행 모킹업

```
시작 (0%)
→ vite             [░░░░░░░░░░░░░░░░░░░░]   0%

진행 (40%)
→ vite             [████████░░░░░░░░░░░░]  40%

근접 (90%)
→ vite             [██████████████████░░]  90%

완료 (100%)
→ vite             [████████████████████] 100%  0.9s ✓
```

### 2.3 컬러 매핑

| 진행 구간 | 바 색 | 라벨 색 |
|---|---|---|
| 0-30% | DIM `#6B7280` | INFO `#4A9EFF` |
| 30-70% | INFO `#4A9EFF` | INFO |
| 70-99% | ACCENT `#D4A857` | ACCENT |
| 100% | PASS `#5FCB7A` | PASS + ✓ |
| **총 시간 > 5s** | WARN `#E8A33A` | WARN + ⚠ |

### 2.4 Vite 플러그인 스니펫 (계섬월 인계)

```ts
// client/vite-plugins/boot-progress.ts
import { C } from '../../scripts/cli/cli-colors';

interface Stage { name: string; weight: number; t0?: number; t1?: number; }

export function bootProgressPlugin() {
  const stages: Stage[] = [
    { name: 'vite',            weight: 0.20 },
    { name: 'ts compile',      weight: 0.35 },
    { name: 'assets manifest', weight: 0.30 },
    { name: 'phaser warm-up',  weight: 0.15 },
  ];
  const t0 = Date.now();
  let printed = false;

  return {
    name: 'aeterna:boot-progress',
    configureServer(server) {
      server.httpServer?.once('listening', () => {
        if (printed) return;
        printed = true;
        const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
        const color = +elapsed > 5.0 ? C.warn : C.pass;
        const mark  = +elapsed > 5.0 ? '⚠' : '✓';
        console.log(`\n${color}${mark} dev server ready${C.reset} in ${C.accent}${elapsed}s${C.reset}`);
      });
    },
  };
}
```

---

## 3. QA 시나리오 결과 표 — `npm run qa:smoke` ⚔️

> 핵심 시나리오(전투/세이브/맵 이동) 자동화 결과를 한눈에. 5분 안에 결판나야 함.

### 3.1 ASCII 표 (3 시나리오 × 4 상태)

```
╭─ qa:smoke ─ 핵심 시나리오 자동 검증 ──────────────────────────╮
│                                                                │
│  시나리오            상태   소요    핵심 검증              비고 │
│  ───────────────────────────────────────────────────────────── │
│  ⚔ 전투 (ATB)      ✓ PASS  47s    HP/MP/ATB 게이지 정상       │
│  💾 세이브/로드    ✓ PASS  18s    JSON round-trip 100%        │
│  🗺 맵 이동        ⚠ WARN  62s    페이드 100ms 초과 (target)  │
│  🎯 통합 5분 플레이 ✗ FAIL 4m 12s  battle 4 OOM at frame 9842 │
│                                                                │
│  ───────────────────────────────────────────────────────────── │
│  총 소요 5m 19s    PASS 2/4    target ≤ 5m 00s            ⚠   │
│                                                                │
│  📁 logs/qa-2026-04-30T14-22-08.json                          │
╰────────────────────────────────────────────────────────────────╯
```

### 3.2 상태 4종 컬러 매핑

| 상태 | 마크 | fg 색 | 의미 |
|---|---|---|---|
| **PASS** | ✓ | `#5FCB7A` | 모든 어설션 통과 |
| **WARN** | ⚠ | `#E8A33A` | 통과했으나 임계치 근접 (target 80%↑) |
| **FAIL** | ✗ | `#E85A5A` | 어설션 실패 / 타임아웃 |
| **SKIP** | · | `#6B7280` | 의존성 부재 / 명시적 skip |

### 3.3 JSON 출력 SSOT (Discord 봇/CI 입력용)

```json
{
  "version": 1,
  "ts": "2026-04-30T14:22:08Z",
  "totalDurationMs": 319000,
  "targetDurationMs": 300000,
  "scenarios": [
    { "id": "battle.atb",      "label": "전투 (ATB)",   "status": "PASS", "durationMs": 47000,  "checks": 12 },
    { "id": "save.roundtrip",  "label": "세이브/로드", "status": "PASS", "durationMs": 18000,  "checks": 8  },
    { "id": "map.transition",  "label": "맵 이동",      "status": "WARN", "durationMs": 62000,  "checks": 6, "warnings": ["fade 100ms 초과"] },
    { "id": "integration.5min","label": "통합 5분",     "status": "FAIL", "durationMs": 252000, "error": { "type": "OOM", "frame": 9842, "scene": "battle" } }
  ],
  "summary": { "pass": 2, "warn": 1, "fail": 1, "skip": 0 }
}
```

---

## 4. 에러 카드 — 빌드 실패 시 단일 카드 🔥

> 가독성 1순위: **원인 파일/라인을 0초 안에 식별**. 스택 트레이스 길게 늘어놓지 않음.

### 4.1 ASCII 모킹업 (TS 에러)

```
╭─ ✗ BUILD FAILED ─────────────────────────────────── 4.2s ─╮
│                                                            │
│  📁 client/src/scenes/battle/AtbGauge.ts:84:23            │
│                                                            │
│   82 │     const ratio = current / max;                   │
│   83 │     this.fill.scaleX = ratio;                      │
│ → 84 │     this.label.text = `${current.toFixef(1)}`;     │
│      │                                ^^^^^^^^             │
│   85 │   }                                                 │
│   86 │ }                                                   │
│                                                            │
│  ✗ TS2551: Property 'toFixef' does not exist on type     │
│    'number'. Did you mean 'toFixed'?                      │
│                                                            │
│  💡 fix: change 'toFixef' to 'toFixed'                    │
│                                                            │
│  → click to open in VS Code:                              │
│    file:///C:/fork/.../AtbGauge.ts:84:23                  │
╰────────────────────────────────────────────────────────────╯
```

### 4.2 ASCII 모킹업 (런타임 에러 — Phaser)

```
╭─ ✗ RUNTIME ERROR ────────────────────────── BattleScene ──╮
│                                                            │
│  📁 client/src/scenes/BattleScene.ts:312:14               │
│                                                            │
│  TypeError: Cannot read property 'sprite' of undefined    │
│                                                            │
│  → at BattleScene.executeAction (BattleScene.ts:312:14)   │
│  → at AtbController.tick      (AtbController.ts:78:9)     │
│                                                            │
│  🎯 가능 원인 (top 1):                                     │
│    monsters.json:42 의 'wraith_lv3' 엔트리 누락           │
│    → check: data/monsters.json line 42                    │
│                                                            │
│  💡 fix: npm run data:validate 실행 후 누락 키 채우기     │
╰────────────────────────────────────────────────────────────╯
```

### 4.3 카드 8 영역 SSOT

| # | 영역 | 컬러 | 너비 | 의무 | 비고 |
|---|---|---|---|---|---|
| 1 | 헤더 (`✗ BUILD FAILED`) | ERROR fg + 약간의 ERROR bg | full | ✅ | 우측에 소요 시간 |
| 2 | 파일 경로 (📁) | ACCENT | full | ✅ | `path:line:col` 형식 |
| 3 | 코드 컨텍스트 (3-5줄) | DIM (이외) + ERROR (해당 줄) | full | ✅ | `→` 마커 + 캐럿 `^^^^` |
| 4 | 에러 코드 + 메시지 | ERROR | full | ✅ | TS 코드 / Error.name 표기 |
| 5 | 💡 fix 힌트 | ACCENT | 1줄 | ✅ | 1줄 명령 또는 의도 |
| 6 | 가능 원인 top 1 | INFO | 2줄 | ⏸ | 런타임만, 정적 분석 결과 |
| 7 | VS Code 링크 | INFO | 1줄 | ⏸ | OSC 8 / file:// |
| 8 | 푸터 (없음 — 카드 닫힘) | DIM | — | ✅ | `╰─...─╯` |

### 4.4 톤 5계명 (가춘운 봉인)

1. **카드 너비 60칸 고정** — 줄바꿈 예측 가능 (작은 터미널도 깨지지 않음)
2. **스택 깊이 ≤ 4줄** — 사용자가 작성한 파일까지만, node_modules 컷
3. **fix 힌트는 명령형** — "change X to Y" 또는 `npm run X` 1줄
4. **이모지 4종 고정** — ✗ 📁 → 💡 만 사용 (혼란 방지)
5. **카드 1개에 1 에러** — 다중 에러는 카드 다중 출력, 절대 합치지 마

---

## 5. README 배지 — 외부 방문자용 (사전 도면) 🏆

> shields.io 정적 배지 3종. Phase 52 README 배지 그룹과 동일 스타일.

### 5.1 SVG 명세

| 배지 | 좌측 라벨 | 우측 값 | 색 | 조건 |
|---|---|---|---|---|
| **Boot Time** | `Boot Time` | `≤5s` | brightgreen | dev server 부팅 ≤ 5s |
| **QA Coverage** | `QA Smoke` | `100%` | brightgreen | 핵심 시나리오 4/4 PASS |
| **Build Time** | `Build` | `≤90s` | success | `npm run build` 90초 이내 |

### 5.2 Markdown 스니펫 (계섬월 인계)

```md
[![Boot Time](https://img.shields.io/badge/Boot%20Time-%E2%89%A45s-brightgreen?style=for-the-badge)](#-개발자-도구)
[![QA Smoke](https://img.shields.io/badge/QA%20Smoke-100%25-brightgreen?style=for-the-badge)](#-qa-자동화)
[![Build](https://img.shields.io/badge/Build-%E2%89%A490s-success?style=for-the-badge)](#-빌드)
```

### 5.3 위치 (README §🛠️ 개발자 도구 — 신설 예정)

기존 배지 그룹(Phase / Tickets / TS Errors / FPS Avg) 직후, **Mobile Viewport 배지 위에**.

---

## 6. PR 임베드 — 빌드 시간 회귀 시 봇 카드 (사전 도면) 📊

> GitHub Actions가 PR마다 측정 → 회귀 감지 시 봇 코멘트.

### 6.1 마크다운 카드 SSOT

```md
## 🤖 빌드-검증 사이클 측정

| 메트릭 | base (main) | this PR | Δ | 약속 | 상태 |
|---|---|---|---|---|---|
| dev server 부팅 | 4.2s | **4.8s** | +0.6s | ≤ 5.0s | ⚠ |
| `qa:smoke` 총 소요 | 4m 47s | **5m 19s** | +32s | ≤ 5m 00s | ✗ |
| `build` 시간 | 78s | 81s | +3s | ≤ 90s | ✓ |
| TS 에러 수 | 0 | 0 | 0 | = 0 | ✓ |

**결과: 4/4 중 2개 회귀** — `qa:smoke` 약속 위반 (FAIL)

📁 측정 로그: [logs/perf-pr-487.json](#)
🔍 회귀 원인 후보: `BattleScene.ts` (312-340 신설), `monsters.json` (+12 entries)

> 본 카드는 자동 생성 — 가춘운 SSOT `assets_dev-cycle-shortening.md §6`
```

### 6.2 4 행동 가이드

| 상태 | 행동 | 머지 가능? |
|---|---|---|
| 4/4 ✓ | self-merge | ✅ |
| 1-2 ⚠ | 본 PR 본문에 사유 명시 | ✅ (백능파 승인 1) |
| 1+ ✗ | 회귀 수정 후 재측정 | ❌ |
| TS 에러 ≥ 1 | 무조건 수정 | ❌ (이소화 비협상) |

---

## 7. Discord 봇 알림 — 빌드 실패/지연 ⏰

> 5분 ≥ 빌드 또는 실패 시 봇 채널 푸시. 디자인 시스템 컬러를 embed에 미러.

### 7.1 embed JSON SSOT (실패 케이스)

```json
{
  "embeds": [{
    "title": "✗ 빌드 실패 — BattleScene.ts:312",
    "description": "**TypeError: Cannot read property 'sprite' of undefined**\n\n`monsters.json:42` 의 `wraith_lv3` 엔트리 누락",
    "color": 15227482,
    "fields": [
      { "name": "📁 원인 파일", "value": "`client/src/scenes/BattleScene.ts:312:14`", "inline": false },
      { "name": "⏱ 소요",        "value": "4.2s",                                       "inline": true  },
      { "name": "🎯 핫스팟",     "value": "monsters.json L42",                          "inline": true  },
      { "name": "💡 빠른 fix",    "value": "`npm run data:validate`",                    "inline": false }
    ],
    "footer": { "text": "에테르나 빌드 봇 · 가춘운 SSOT v1.0" },
    "timestamp": "2026-04-30T14:22:08Z"
  }]
}
```

### 7.2 embed JSON SSOT (지연 케이스)

```json
{
  "embeds": [{
    "title": "⚠ qa:smoke 약속 초과 — 5m 19s",
    "description": "핵심 시나리오 검증이 **5분 약속을 19초 초과**했어요. 한 번 보세요~",
    "color": 15246138,
    "fields": [
      { "name": "⚔ 전투",   "value": "✓ 47s",   "inline": true },
      { "name": "💾 세이브", "value": "✓ 18s",   "inline": true },
      { "name": "🗺 맵",     "value": "⚠ 62s",   "inline": true },
      { "name": "🎯 통합",   "value": "✗ 4m 12s OOM frame 9842", "inline": false }
    ],
    "footer": { "text": "에테르나 빌드 봇 · target ≤ 5m 00s" }
  }]
}
```

### 7.3 4 색 SSOT (decimal)

| 상태 | Hex | Decimal | 트리거 |
|---|---|---|---|
| PASS | `#5FCB7A` | 6277498 | 모든 약속 통과 (조용한 알림) |
| WARN | `#E8A33A` | 15246138 | 1+ 약속 임계치 근접 |
| ERROR | `#E85A5A` | 15227482 | 빌드/QA 실패 |
| INFO | `#4A9EFF` | 4889855 | 측정 시작 알림 (선택) |

---

## 8. VS Code 클릭 링크 — 에러 라인 점프 (사전 도면) 🔗

> 모던 터미널(Windows Terminal, iTerm2, VS Code 통합 터미널)이 OSC 8 하이퍼링크 지원 → 에러 카드 §7 영역에 박음.

### 8.1 OSC 8 시퀀스 SSOT

```
\x1b]8;;file:///C:/fork/aeterna-chronicle-web2/client/src/scenes/BattleScene.ts:312:14\x1b\\
client/src/scenes/BattleScene.ts:312:14
\x1b]8;;\x1b\\
```

### 8.2 헬퍼 함수 (계섬월 인계)

```ts
// scripts/cli/clickable-link.ts
export function clickableLink(absPath: string, line: number, col = 1): string {
  const url = `file:///${absPath.replace(/\\/g, '/')}:${line}:${col}`;
  const label = `${path.basename(absPath)}:${line}:${col}`;
  // 모던 터미널: 하이퍼링크 / 구형: 평문 fallback
  return `\x1b]8;;${url}\x1b\\${label}\x1b]8;;\x1b\\`;
}
```

### 8.3 fallback 정책

| 환경 | 출력 | 비고 |
|---|---|---|
| Windows Terminal / VS Code | 하이퍼링크 (Ctrl+Click) | 기본 |
| Git Bash (mintty) | 평문 경로 | OSC 8 미지원 |
| `NO_COLOR=1` 또는 `--no-link` | 평문 경로 | 명시적 비활성 |

---

## 9. 어셋 인벤토리 — 인계 체크리스트 (계섬월) 📦

| # | 산출물 | 위치 | 상태 |
|---|---|---|---|
| 1 | CLI 컬러 토큰 | `scripts/cli/cli-colors.ts` | ⏸ 신설 (§1.2 그대로) |
| 2 | 부팅 진행률 플러그인 | `client/vite-plugins/boot-progress.ts` | ⏸ 신설 (§2.4 그대로) |
| 3 | QA JSON 스키마 | `scripts/qa/qa-schema.ts` | ⏸ 신설 (§3.3 그대로) |
| 4 | 에러 카드 렌더러 | `scripts/cli/error-card.ts` | ⏸ 신설 (§4.1·§4.2 모킹업) |
| 5 | OSC 8 헬퍼 | `scripts/cli/clickable-link.ts` | ⏸ 신설 (§8.2 그대로) |
| 6 | Discord embed 빌더 | `scripts/qa/discord-embed.ts` | ⏸ 신설 (§7.1·§7.2 SSOT) |
| 7 | README 배지 3종 | `README.md` §🛠️ 개발자 도구 | ⏸ 신설 (§5.2) |
| 8 | PR 봇 코멘트 템플릿 | `.github/workflows/perf-comment.yml` | ⏸ 신설 (§6.1) |

> **본 스프린트 REDUCTION 스코프**: #1, #2, #4, #6 만 1커밋 머지. 나머지 #3·#5·#7·#8은 사전 도면.

---

## 10. 봉인 — 변경 절차 (가춘운 비협상) 🔐

본 팩이 **빌드-검증 시각 자원의 1차 SSOT**. 변경하려면:

1. 본 문서 §해당 표/모킹업 갱신
2. 디자인 시스템(`design-system_dev-cycle-shortening.md` 3차) 미러 갱신
3. 코드 상수(§1.2 / §2.4 / §8.2) 미러 갱신
4. README 배지 / Discord embed 미러 갱신
5. 시각 회귀 — `npm run dev` 실측 + Discord 봇 테스트 메시지

**역방향 갱신 금지** — 코드 → 문서 변경 절대 X. 디자인 SSOT 위계 비협상.

봉인 5항:

| # | 항목 | 봉인 사유 |
|---|---|---|
| 1 | 카드 너비 60칸 (§4) | 작은 터미널 호환성 |
| 2 | 5상태 컬러 + ACCENT (§1.1) | 색약 대응 + 게임 화면 톤 일치 |
| 3 | 이모지 4+5종 고정 (§1.3 / §4.4) | 인지 부하 최소화 |
| 4 | embed 4 색 (§7.3) | Discord 채널 톤 일관성 |
| 5 | NO_COLOR / --json 모드 (§1.4) | CI 호환성 비협상 |

---

## 11. 다음 단계 (Build → Review → Test → Ship) 🎯

- [ ] **계섬월(Build)** — §9 인벤토리 #1·#2·#4·#6 1커밋 머지 (REDUCTION 스코프)
- [ ] **계섬월(Build)** — `package.json` 스크립트 등록: `dev` (§2 적용), `qa:smoke` (§3 출력), `build` (에러 카드 §4 적용)
- [ ] **이소화(Review)** — 카드 너비 60칸 / 5상태 컬러 / 이모지 4종 봉인 검증
- [ ] **적경홍(Test)** — 실제 부팅 시간 측정 → §5 README 배지 값 확정 (≤5s 검증)
- [ ] **적경홍(Test)** — TS 에러 의도 주입 → §4 에러 카드 모킹업이 실제로 출력되는지 확인
- [ ] **심요연(Ship)** — Discord 봇 webhook 등록 → §7 embed 4색 실측 캡처
- [ ] **백능파(Strategy)** — `launch_checklist §2.25` (가칭 "빌드-검증 사이클") SSOT 신설 협의

---

> 어머~ 다 됐다~! 💖
>
> 대표가 `npm run dev` 칠 때마다 보는 화면이 **금색 진행률 + 녹색 ✓ + 깔끔한 에러 카드**가 되면, 빌드-검증이 **마찰**이 아니라 **리듬**이 돼요. 게임 만드는 손맛은 도구의 손맛에서 시작한다구요~ ✨
>
> 계섬월 언니~ 이 토큰·모킹업·코드 그대로 박으면 끝! 봉인 5항만 지켜주시면 가춘운 OK~ 🎀⚔️
