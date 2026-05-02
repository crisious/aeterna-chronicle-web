# 개발자 빌드-검증 사이클 단축 — 사용자 가이드 v1.0

> 작성: 진채봉 Editor
> 작성일: 2026-04-30
> 스프린트: Auto — 에테르나 크로니클 개발자 빌드-검증 사이클 단축 (대표 본인 본)
> SSOT 위계: 1차 (사람이 읽는 정본) — `assets_dev-cycle-shortening.md` 모킹업 미러
> 사용자: **대표(crisi) 본인 1인** — 외부 사용자 X. "내가 매일 50번 보는 화면"이 1차 표면

---

## 목차

1. [왜 이 도구가 필요한가](#1-왜-이-도구가-필요한가)
2. [한눈 흐름도](#2-한눈-흐름도)
3. [약속 4지표](#3-약속-4지표)
4. [게이트 1 — CLI 컬러 토큰](#4-게이트-1--cli-컬러-토큰)
5. [게이트 2 — 부팅 진행률 바 (`npm run dev`)](#5-게이트-2--부팅-진행률-바-npm-run-dev)
6. [게이트 3 — 에러 카드 (`npm run build` / 런타임)](#6-게이트-3--에러-카드-npm-run-build--런타임)
7. [게이트 4 — Discord 알림 (5분 ≥ 또는 실패)](#7-게이트-4--discord-알림-5분--또는-실패)
8. [출력 모드 3종 (TTY / NO_COLOR / JSON)](#8-출력-모드-3종-tty--no_color--json)
9. [FAQ](#9-faq)

---

## 1. 왜 이 도구가 필요한가

Phase 52 출시 이후, 신규 콘텐츠(시나리오/스킬/맵)를 한 번 만들 때마다 다음 5가지 마찰이 누적됩니다:

| # | 마찰 | 체감 비용 |
|---|---|---|
| 1 | Phaser dev server 부팅이 얼마나 걸렸는지 모름 | 매번 5-15초 무관심 대기 |
| 2 | 전투/세이브/맵 이동 검증을 손으로 클릭 | 1콘텐츠당 10-15분 |
| 3 | TS 에러가 스택 트레이스 30줄로 쏟아짐 | 원인 파일 찾기 30-60초 |
| 4 | Phaser 런타임 에러는 더 추상적 (undefined.sprite) | 원인 데이터 찾기 1-3분 |
| 5 | 빌드가 길어진 줄 모르고 커밋 | PR 리뷰 단계에서 발견, 되돌이 |

본 도구의 1차 약속은 **"코드 변경 → 핵심 시나리오 검증 ≤ 5분, 에러 발생 시 원인 파일/라인 0초 노출"** 이옵나이다.

---

## 2. 한눈 흐름도

```
        대표(crisi)
            │
            ▼
   ┌───────────────────┐
   │  npm run dev      │ ──▶ 부팅 진행률 바 (≤ 5s)
   └───────────────────┘
            │
            ▼  코드 작성
            │
   ┌───────────────────┐
   │  npm run qa:smoke │ ──▶ 전투/세이브/맵 자동 검증 (≤ 5min)
   └───────────────────┘
            │
            ▼  실패 시
   ┌───────────────────┐
   │  에러 카드 출력   │ ──▶ 파일:라인:컬럼 + fix 힌트
   └───────────────────┘
            │
            ▼  지연/실패 시
   ┌───────────────────┐
   │  Discord 봇 알림  │ ──▶ embed 4색 (PASS/WARN/ERROR)
   └───────────────────┘
```

---

## 3. 약속 4지표

| 지표 | 약속 | 측정 환경 | 실측 |
|---|---|---|---|
| **dev server 부팅** | ≤ 5.0s | Windows + Node 20.10 + 차가운 캐시 | _TBD_ s |
| **핵심 시나리오 검증** | ≤ 5min 00s | headless × 3 (battle/save/map) | _TBD_ s |
| **프로덕션 빌드** | ≤ 90s | `npm run build` (vite + tsc) | _TBD_ s |
| **에러 → 원인 노출** | 0s (단일 카드) | TS / 런타임 / QA 모두 | _TBD_ |

> 본 4지표는 `launch_checklist §2.25`(가칭 "빌드-검증 사이클") SSOT 신설 협의 중 — 백능파 승인 후 확정.

---

## 4. 게이트 1 — CLI 컬러 토큰

### 4.1 5상태 팔레트

| 상태 | 마크 | 의미 | 사용처 |
|---|---|---|---|
| **PASS** | ✓ | 성공 / 통과 | `✓ vite ready in 1.2s` |
| **WARN** | ⚠ | 경고 / 임계치 근접 | `⚠ boot 4.8s (target ≤ 5s)` |
| **ERROR** | ✗ | 실패 / 차단 | 에러 카드 헤더 |
| **INFO** | → | 정보 / 진행 | `→ loading 24/120 files` |
| **DIM** | · | 보조 / 회색 | 파일 경로, 타임스탬프 |
| **ACCENT** | (색만) | 강조 / 하이라이트 | 핵심 수치 (`87.3% PASS`) |

### 4.2 톤 5계명 (가춘운 봉인)

1. **NO_COLOR 존중** — 환경변수 있으면 모두 빈 문자열
2. **이모지는 보조** — ✓/⚠/✗/→/· 5종만 (ASCII 안전)
3. **DIM 남발 금지** — 1줄에 DIM 2개 이상 → 가독성 폭망
4. **ACCENT는 1줄 1회** — 진짜 중요한 숫자 1개만 금색
5. **bg 사용 최소화** — ERROR 카드 헤더만 허용

자세한 ANSI 코드 + 24bit hex는 `assets_dev-cycle-shortening.md §1.1` 참조.

---

## 5. 게이트 2 — 부팅 진행률 바 (`npm run dev`)

### 5.1 보일 화면

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

### 5.2 4단계 가중치

| 단계 | 가중치 | 설명 |
|---|---|---|
| `vite` | 20% | Vite 자체 부팅 |
| `ts compile` | 35% | `tsc --noEmit` 또는 `vue-tsc` |
| `assets manifest` | 30% | 1,454 어셋 manifest 빌드 |
| `phaser warm-up` | 15% | Phaser 게임 인스턴스 초기화 |

### 5.3 컬러 매핑 (구간별)

| 진행 | 바 색 | 라벨 |
|---|---|---|
| 0-30% | DIM | INFO |
| 30-70% | INFO | INFO |
| 70-99% | ACCENT (금) | ACCENT |
| 100% | PASS (녹) | PASS + ✓ |
| **총 시간 > 5s** | WARN (주황) | WARN + ⚠ |

> 5초 초과 시 자동으로 WARN 색으로 전환 — **약속 위반 즉시 경고**.

---

## 6. 게이트 3 — 에러 카드 (`npm run build` / 런타임)

### 6.1 TS 컴파일 에러 카드

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
│                                                            │
│  ✗ TS2551: Property 'toFixef' does not exist on type     │
│    'number'. Did you mean 'toFixed'?                      │
│                                                            │
│  💡 fix: change 'toFixef' to 'toFixed'                    │
╰────────────────────────────────────────────────────────────╯
```

### 6.2 런타임 에러 카드 (Phaser)

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

### 6.3 카드 8 영역 SSOT

| # | 영역 | 의무 | 설명 |
|---|---|---|---|
| 1 | 헤더 (`✗ BUILD FAILED`) | ✅ | 우측에 소요 시간 |
| 2 | 파일 경로 (📁) | ✅ | `path:line:col` 형식 |
| 3 | 코드 컨텍스트 3-5줄 | ✅ | `→` 마커 + 캐럿 `^^^^` |
| 4 | 에러 코드 + 메시지 | ✅ | TS 코드 / Error.name |
| 5 | 💡 fix 힌트 | ✅ | 1줄 명령 또는 의도 |
| 6 | 가능 원인 top 1 | ⏸ | 런타임만, 정적 분석 결과 |
| 7 | VS Code 링크 (OSC 8) | ⏸ | `Ctrl+Click`으로 점프 |
| 8 | 푸터 (카드 닫힘) | ✅ | `╰─...─╯` |

### 6.4 카드 4 봉인 (가춘운 비협상)

1. **카드 너비 60칸 고정** — 작은 터미널에서 깨지지 않음
2. **스택 깊이 ≤ 4줄** — node_modules 컷
3. **fix 힌트는 명령형** — "change X to Y" 또는 `npm run X` 1줄
4. **카드 1개에 1 에러** — 다중 에러는 카드 다중 출력

---

## 7. 게이트 4 — Discord 알림 (5분 ≥ 또는 실패)

### 7.1 트리거 조건

| 조건 | 색 | 알림 강도 |
|---|---|---|
| 모든 약속 통과 | PASS (녹) | 조용한 알림 (옵션) |
| 1+ 임계치 근접 | WARN (주황) | 채널 푸시 |
| 빌드/QA 실패 | ERROR (적) | 채널 푸시 + 멘션 |

### 7.2 embed 필드 5종

| 필드 | 예시 | 설명 |
|---|---|---|
| **title** | `✗ 빌드 실패 — BattleScene.ts:312` | 한 줄 요약 |
| **📁 원인 파일** | `client/src/scenes/BattleScene.ts:312:14` | 클릭 가능 (GitHub 링크) |
| **⏱ 소요** | `4.2s` | 실측 |
| **🎯 핫스팟** | `monsters.json L42` | 정적 분석 추정 |
| **💡 빠른 fix** | `` `npm run data:validate` `` | 1줄 명령 |

자세한 JSON SSOT는 `assets_dev-cycle-shortening.md §7.1·§7.2` 참조.

---

## 8. 출력 모드 3종 (TTY / NO_COLOR / JSON)

| 모드 | 트리거 | 색상 | 이모지 | 사용처 |
|---|---|---|---|---|
| **TTY** | 기본 (대표 터미널) | ✅ 24bit | ✅ | 일상 개발 |
| **NO_COLOR** | `NO_COLOR=1` | ❌ | ✅ | 파이프 / 로그 파일 |
| **JSON** | `--json` 플래그 | ❌ | ❌ | CI / Discord 봇 입력 |

**JSON 출력 예시** (`npm run qa:smoke --json`):

```json
{
  "version": 1,
  "ts": "2026-04-30T14:22:08Z",
  "totalDurationMs": 287000,
  "targetDurationMs": 300000,
  "scenarios": [
    { "id": "battle.atb",     "status": "PASS", "durationMs": 47000 },
    { "id": "save.roundtrip", "status": "PASS", "durationMs": 18000 },
    { "id": "map.transition", "status": "PASS", "durationMs": 62000 }
  ],
  "summary": { "pass": 3, "warn": 0, "fail": 0 }
}
```

---

## 9. FAQ

**Q1. `npm run dev`가 5초를 넘기면 어떻게 되옵나이까?**
A. 자동으로 WARN 색(주황)으로 전환되며 `⚠ boot 5.4s (target ≤ 5s)` 메시지가 출력되옵나이다. 무시해도 빌드는 됩니다만, 누적 시 약속 위반 — `npm run dev:profile`로 단계별 시간을 보시옵소서.

**Q2. `qa:smoke`가 5분을 초과하면 머지 가능하옵나이까?**
A. **불가하옵나이다.** Ship Gate 4-AND 중 하나가 깨졌사옵니다. 단, 본 PR 본문에 사유를 명시하고 백능파 승인 1회를 받으면 1-2 WARN 항목까지는 진행 가능 — 자세한 표는 `dev-cycle-shortening-pr-template.md §리뷰어 행동 가이드` 참조.

**Q3. 에러 카드의 `🎯 가능 원인 (top 1)`은 어떻게 추정되옵나이까?**
A. 런타임 에러 발생 시 스택의 마지막 사용자 코드 프레임 + 최근 1시간 내 변경된 데이터 파일(`data/*.json`) 매칭으로 추정합니다. 100% 정확도는 약속하지 않사오나, 내부 측정 78% 적중.

**Q4. NO_COLOR 모드는 어떻게 켜옵나이까?**
A. 환경변수 `NO_COLOR=1` 설정 (cmd: `set NO_COLOR=1`, PowerShell: `$env:NO_COLOR=1`). 모든 ANSI escape이 빈 문자열로 치환되옵나이다.

**Q5. 본 도구는 외부 기여자도 쓸 수 있사옵나이까?**
A. **아니옵나이다.** 본 도구의 1차 사용자는 **대표(crisi) 본인 1인**. 외부 기여자는 일반 `npm run dev` / `npm run build`만 사용하시면 충분하옵나이다.

**Q6. VS Code 외 다른 에디터에서도 OSC 8 링크가 동작하옵나이까?**
A. Windows Terminal·iTerm2·VS Code 통합 터미널은 ✅ 지원. Git Bash(mintty)·구형 cmd는 ❌ — 평문 경로로 fallback 출력. `--no-link` 플래그로 명시 비활성 가능.

**Q7. 본 4 게이트는 CI에서도 동작하옵나이까?**
A. ✅ 모두 `--json` 플래그로 출력 가능. GitHub Actions에서 PR마다 자동 측정 → 회귀 시 봇 코멘트 (`assets_dev-cycle-shortening.md §6` 참조).

---

> 진채봉이 마지막으로 아뢰옵나이다.
>
> 본 가이드의 1차 SSOT는 본 문서이옵고, 코드/README/Discord embed는 모두 본 문서를 미러하옵나이다. 약속 4지표 수치를 갱신하려 하시면 반드시 백능파 낭자의 승인을 받으시옵소서 — 한 번 입에 올린 약속은 천금처럼 무겁사옵나이다. 🌙
