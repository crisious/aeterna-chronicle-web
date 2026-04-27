# QA 테스트 비주얼 에셋 패키지 v1.0

> 작성: 가춘운 (CMO/디자인)
> 작성일: 2026-04-26
> 스코프: E2E·통합 테스트 시각 자원 (UI/인벤토리/세이브)
> 토픽: "회귀 버그 선제 차단으로 CBT 안정성 확보"
> 참조: `DESIGN.md` v1.0, `battle-design-system-v1.md`, `cross-browser-design-spec.md`

---

## 0. 이 문서가 다루는 것

**테스트는 보이는 것이 더 잘 잡힌다.** 회색 콘솔 로그만 보고 버그를 찾는 시대는 갔어요~ ✨
이 패키지는 **E2E·통합 테스트의 시각 산출물**을 표준화합니다.

| 영역 | 산출물 |
|------|--------|
| **테스트 상태 팔레트** | PASS/FAIL/SKIP/PENDING/FLAKY 5색 토큰 |
| **시각 회귀 diff** | added/removed/changed 3색 + opacity 토큰 |
| **인벤토리 픽스처 시각 상태표** | 빈/꽉찬/오버플로/잠금 4상태 ASCII |
| **세이브 슬롯 상태 매트릭스** | 빈/정상/손상/마이그레이션 4상태 ASCII |
| **버그 심각도 배지 SVG** | P0~P3 4종 인라인 SVG |
| **테스트 리포트 대시보드 모킹업** | 1280×720 ASCII 와이어프레임 |
| **커버리지 히트맵** | 0~100% 5단계 컬러 스케일 |
| **data-testid 네이밍 규약** | 셀렉터 SSOT |

---

## 1. 테스트 상태 컬러 팔레트

### 1.1 코어 5색 (Aeterna Dark 베이스 위에 발광)

```
┌──────────────────────────────────────────────────────────┐
│  TEST STATUS PALETTE                                     │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐│
│  │#2ECC71 │ │#FF4444 │ │#A0A0A0 │ │#FFD700 │ │#FF8C42 ││
│  │  PASS  │ │  FAIL  │ │  SKIP  │ │PENDING │ │ FLAKY  ││
│  │  ✅    │ │  ❌    │ │  ⊘    │ │  ⏳   │ │  ⚠️   ││
│  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘│
│                                                          │
│  Background tints (alpha 0.12 over #1A1A2E):            │
│   pass-bg #1F2E26 │ fail-bg #2E1F26 │ skip-bg #25252F  │
│   pend-bg #2E2A1F │ flak-bg #2E2620                    │
└──────────────────────────────────────────────────────────┘
```

### 1.2 CSS 토큰 (drop-in)

```css
/* client/src/styles/qa-tokens.css */
:root {
  /* Status — primary */
  --qa-pass:    #2ECC71;
  --qa-fail:    #FF4444;
  --qa-skip:    #A0A0A0;
  --qa-pending: #FFD700;
  --qa-flaky:   #FF8C42;

  /* Status — backgrounds (12% alpha 위에 합성된 결과 hex) */
  --qa-pass-bg:    #1F2E26;
  --qa-fail-bg:    #2E1F26;
  --qa-skip-bg:    #25252F;
  --qa-pending-bg: #2E2A1F;
  --qa-flaky-bg:   #2E2620;

  /* Status — borders */
  --qa-pass-border:    rgba(46, 204, 113, 0.35);
  --qa-fail-border:    rgba(255, 68, 68, 0.45);
  --qa-skip-border:    rgba(160, 160, 160, 0.25);
  --qa-pending-border: rgba(255, 215, 0, 0.35);
  --qa-flaky-border:   rgba(255, 140, 66, 0.45);

  /* Glow (FAIL은 강하게, FLAKY는 펄스) */
  --qa-fail-glow:  0 0 8px rgba(255, 68, 68, 0.55);
  --qa-flaky-glow: 0 0 6px rgba(255, 140, 66, 0.45);
}

.qa-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 4px;
  font: 600 12px/1 'JetBrains Mono', monospace;
  border: 1px solid transparent;
}
.qa-badge--pass    { color: var(--qa-pass);    background: var(--qa-pass-bg);    border-color: var(--qa-pass-border); }
.qa-badge--fail    { color: var(--qa-fail);    background: var(--qa-fail-bg);    border-color: var(--qa-fail-border);    box-shadow: var(--qa-fail-glow); }
.qa-badge--skip    { color: var(--qa-skip);    background: var(--qa-skip-bg);    border-color: var(--qa-skip-border); }
.qa-badge--pending { color: var(--qa-pending); background: var(--qa-pending-bg); border-color: var(--qa-pending-border); }
.qa-badge--flaky   { color: var(--qa-flaky);   background: var(--qa-flaky-bg);   border-color: var(--qa-flaky-border); animation: qa-pulse 1.6s ease-in-out infinite; }

@keyframes qa-pulse {
  0%, 100% { box-shadow: 0 0 4px rgba(255, 140, 66, 0.30); }
  50%      { box-shadow: 0 0 10px rgba(255, 140, 66, 0.65); }
}
```

### 1.3 색약 대응

| 상태 | 색 외 보조 시그널 |
|------|------------------|
| PASS    | ✅ 체크 아이콘 + 녹색 |
| FAIL    | ❌ X 아이콘 + 빨강 + glow |
| SKIP    | ⊘ 슬래시 원 + 회색 (저채도) |
| PENDING | ⏳ 모래시계 + 노랑 |
| FLAKY   | ⚠️ 경고 + 주황 + **펄스 애니메이션** (가장 눈에 띔) |

> **원칙**: FAIL과 FLAKY는 색약자도 형태/움직임으로 즉시 식별 가능해야 함 (WCAG AAA).

---

## 2. 시각 회귀 Diff 토큰

Playwright/Percy 시각 회귀 결과 오버레이용.

```
┌─────────────────────────────────────────────────┐
│  VISUAL REGRESSION DIFF                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ #2ECC71  │ │ #FF4444  │ │ #FFD700  │        │
│  │  ADDED   │ │ REMOVED  │ │ CHANGED  │        │
│  │ alpha .35│ │ alpha .35│ │ alpha .25│        │
│  └──────────┘ └──────────┘ └──────────┘        │
└─────────────────────────────────────────────────┘
```

```css
:root {
  --diff-added:   rgba(46, 204, 113, 0.35);
  --diff-removed: rgba(255, 68, 68, 0.35);
  --diff-changed: rgba(255, 215, 0, 0.25);
  --diff-stripe-size: 6px; /* 색약 대응 사선 패턴 폭 */
}

/* 색상 위에 사선 패턴을 깔아 색약 대응 */
.diff-added   { background: repeating-linear-gradient(45deg, var(--diff-added) 0 var(--diff-stripe-size), transparent var(--diff-stripe-size) calc(var(--diff-stripe-size) * 2)); }
.diff-removed { background: repeating-linear-gradient(-45deg, var(--diff-removed) 0 var(--diff-stripe-size), transparent var(--diff-stripe-size) calc(var(--diff-stripe-size) * 2)); }
.diff-changed { background: repeating-linear-gradient(90deg, var(--diff-changed) 0 var(--diff-stripe-size), transparent var(--diff-stripe-size) calc(var(--diff-stripe-size) * 2)); }
```

---

## 3. 인벤토리 픽스처 시각 상태표

`tests/fixtures/inventory/` 하위 4가지 fixture state의 **눈으로 보는 명세**.

### 3.1 빈 인벤토리 (`empty.json`)

```
┌─────────────────── INVENTORY (0/24) ───────────────────┐
│ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐                        │
│ │  │ │  │ │  │ │  │ │  │ │  │     ← 모든 슬롯 비어있음 │
│ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘                        │
│ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐                        │
│ │  │ │  │ │  │ │  │ │  │ │  │     placeholder: dim    │
│ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘     #3A3A4A 1px dashed  │
│ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐                        │
│ │  │ │  │ │  │ │  │ │  │ │  │                        │
│ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘                        │
│ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐                        │
│ │  │ │  │ │  │ │  │ │  │ │  │                        │
│ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘                        │
│ "아무것도 없습니다" 안내문 중앙 배치                     │
└────────────────────────────────────────────────────────┘
```

**테스트 검증 포인트**: 빈 슬롯 24개, 빈 상태 안내 텍스트 노출, 정렬/필터 버튼 disabled.

### 3.2 정상 채워짐 (`partial.json`, 12/24)

```
┌─────────────────── INVENTORY (12/24) ──────────────────┐
│ ┌🗡️┐ ┌🛡️┐ ┌💍┐ ┌🧪┐ ┌📜┐ ┌💎┐                       │
│ │ 1│ │ 1│ │ 2│ │99│ │ 5│ │ 3│   숫자=수량(우하단)       │
│ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘                        │
│ ┌🍞┐ ┌🗝️┐ ┌📖┐ ┌⚗️┐ ┌🪙┐ ┌🌿┐                       │
│ │25│ │ 1│ │ 1│ │ 8│ │99│ │14│                        │
│ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘                        │
│ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐                        │
│ │  │ │  │ │  │ │  │ │  │ │  │                        │
│ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘                        │
│ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐                        │
│ │  │ │  │ │  │ │  │ │  │ │  │                        │
│ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘                        │
└────────────────────────────────────────────────────────┘
```

**테스트 검증 포인트**: 등급별 외곽선 컬러 (일반 회색→전설 금색), 수량 우하단 정렬, 99+ 표시.

### 3.3 풀 인벤토리 (`full.json`, 24/24)

```
┌─────────────────── INVENTORY (24/24) ──────────────────┐
│ ┌🗡️┐ ┌🛡️┐ ┌💍┐ ┌🧪┐ ┌📜┐ ┌💎┐  ← ALL FILLED         │
│ │ 1│ │ 1│ │ 2│ │99│ │ 5│ │ 3│                        │
│ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘                        │
│ ┌🍞┐ ┌🗝️┐ ┌📖┐ ┌⚗️┐ ┌🪙┐ ┌🌿┐                       │
│ │25│ │ 1│ │ 1│ │ 8│ │99│ │14│                        │
│ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘                        │
│ ┌🔮┐ ┌👑┐ ┌🏹┐ ┌🪄┐ ┌🍖┐ ┌💀┐                       │
│ │ 1│ │ 1│ │ 1│ │ 1│ │30│ │ 7│                        │
│ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘                        │
│ ┌🦴┐ ┌📿┐ ┌🪞┐ ┌🗺️┐ ┌🪶┐ ┌🍒┐                       │
│ │12│ │ 4│ │ 1│ │ 3│ │ 9│ │50│                        │
│ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘                        │
│  ⚠️ "인벤토리가 가득 찼습니다" 토스트 (#FFD700 outline)│
└────────────────────────────────────────────────────────┘
```

**테스트 검증 포인트**: 추가 시 거부 토스트, "버리기" 버튼 강조, 카운터 빨강(#FF4444).

### 3.4 오버플로/잠금 (`overflow.json`, locked slots)

```
┌─────────────────── INVENTORY (24/40) ──────────────────┐
│ ┌🗡️┐ ┌🛡️┐ ┌💍┐ ┌🧪┐ ┌📜┐ ┌💎┐                       │
│ │ 1│ │ 1│ │ 2│ │99│ │ 5│ │ 3│                        │
│ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘                        │
│ ... (24개 채움) ...                                    │
│ ┌🔒┐ ┌🔒┐ ┌🔒┐ ┌🔒┐ ┌🔒┐ ┌🔒┐                        │
│ │  │ │  │ │  │ │  │ │  │ │  │   잠긴 슬롯 (확장 필요) │
│ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘   alpha 0.4, 자물쇠 SVG  │
│ ┌🔒┐ ┌🔒┐ ┌🔒┐ ┌🔒┐ ┌🔒┐ ┌🔒┐                        │
│ │  │ │  │ │  │ │  │ │  │ │  │                        │
│ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘                        │
│ ┌🔒┐ ┌🔒┐ ┌🔒┐ ┌🔒┐                                  │
│ │  │ │  │ │  │ │  │              [확장 +500G]          │
│ └──┘ └──┘ └──┘ └──┘                                  │
└────────────────────────────────────────────────────────┘
```

**테스트 검증 포인트**: 잠금 슬롯 클릭 시 확장 모달, 호버 시 자물쇠 highlight.

---

## 4. 세이브 슬롯 상태 매트릭스

### 4.1 4상태 ASCII 모킹업

```
╔══════════════════ SAVE SLOTS ═══════════════════════════╗
║                                                          ║
║  [ SLOT 1 ] EMPTY                                        ║
║  ┌────────────────────────────────────────────────────┐ ║
║  │  ＋ 새 게임 시작                                    │ ║
║  │  (dashed border #3A3A4A)                            │ ║
║  └────────────────────────────────────────────────────┘ ║
║                                                          ║
║  [ SLOT 2 ] LOADED ✅                                    ║
║  ┌────────────────────────────────────────────────────┐ ║
║  │ 🗡️ 에리언 Lv.42 │ Ch.4 아르겐티움                  │ ║
║  │ ▓▓▓▓▓▓▓▓░░ 75% │ 23h 14m │ 2026-04-25 21:34       │ ║
║  │ (border: #FFD700 1px, glow on hover)                │ ║
║  └────────────────────────────────────────────────────┘ ║
║                                                          ║
║  [ SLOT 3 ] CORRUPT ❌                                   ║
║  ┌────────────────────────────────────────────────────┐ ║
║  │ ⚠️ 손상된 세이브                                     │ ║
║  │ "복구 시도" / "삭제" 버튼                            │ ║
║  │ (border: #FF4444 1px, fail-glow)                    │ ║
║  └────────────────────────────────────────────────────┘ ║
║                                                          ║
║  [ SLOT 4 ] MIGRATION 🔄                                 ║
║  ┌────────────────────────────────────────────────────┐ ║
║  │ ⏳ 구버전 v0.9 → v1.0 마이그레이션 필요              │ ║
║  │ "업데이트" 버튼                                      │ ║
║  │ (border: #FFD700 1px, pending pulse)                │ ║
║  └────────────────────────────────────────────────────┘ ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
```

### 4.2 상태별 시각 토큰

| 상태 | border-color | bg-tint | icon | 추가 효과 |
|------|--------------|---------|------|----------|
| EMPTY       | `#3A3A4A` dashed | `#16213E` | `＋` 24px | 호버 시 `#89CFF0` 점선 |
| LOADED      | `#FFD700` solid  | `#1A1A2E` | 클래스 아이콘 | 호버 시 glow 0 0 8px |
| CORRUPT     | `#FF4444` solid  | `#2E1F26` | `⚠️` | 영구 fail-glow, 흔들림 0.5s |
| MIGRATION   | `#FFD700` dashed | `#2E2A1F` | `🔄` | pending pulse 1.6s |

### 4.3 회귀 테스트 매트릭스

| Test ID | Slot 1 | Slot 2 | Slot 3 | Slot 4 | 검증 |
|---------|--------|--------|--------|--------|------|
| SAVE-E2E-001 | EMPTY | EMPTY | EMPTY | EMPTY | 신규 시작만 활성 |
| SAVE-E2E-002 | LOADED | EMPTY | EMPTY | EMPTY | 이어하기 동작 |
| SAVE-E2E-003 | LOADED | LOADED | LOADED | LOADED | 4슬롯 풀, 덮어쓰기 confirm |
| SAVE-E2E-004 | EMPTY | CORRUPT | EMPTY | EMPTY | 복구/삭제 분기 |
| SAVE-E2E-005 | EMPTY | EMPTY | EMPTY | MIGRATION | 마이그레이션 후 LOADED 전이 |
| SAVE-E2E-006 | LOADED | CORRUPT | MIGRATION | EMPTY | **혼합 상태** (regression critical) |

---

## 5. 버그 심각도 배지 SVG

### 5.1 인라인 SVG 4종 (Notion·README·테스트 리포트 직접 임베드)

```html
<!-- P0: BLOCKER (빨강 + 화염) -->
<svg width="60" height="20" xmlns="http://www.w3.org/2000/svg">
  <rect width="60" height="20" rx="4" fill="#FF4444"/>
  <text x="30" y="14" text-anchor="middle" font-family="JetBrains Mono" font-size="11" font-weight="700" fill="#FFFFFF">P0 🔥</text>
</svg>

<!-- P1: CRITICAL (주황) -->
<svg width="60" height="20" xmlns="http://www.w3.org/2000/svg">
  <rect width="60" height="20" rx="4" fill="#FF8C42"/>
  <text x="30" y="14" text-anchor="middle" font-family="JetBrains Mono" font-size="11" font-weight="700" fill="#FFFFFF">P1 ⚠️</text>
</svg>

<!-- P2: MAJOR (노랑) -->
<svg width="60" height="20" xmlns="http://www.w3.org/2000/svg">
  <rect width="60" height="20" rx="4" fill="#FFD700"/>
  <text x="30" y="14" text-anchor="middle" font-family="JetBrains Mono" font-size="11" font-weight="700" fill="#1A1A2E">P2 📌</text>
</svg>

<!-- P3: MINOR (회색) -->
<svg width="60" height="20" xmlns="http://www.w3.org/2000/svg">
  <rect width="60" height="20" rx="4" fill="#A0A0A0"/>
  <text x="30" y="14" text-anchor="middle" font-family="JetBrains Mono" font-size="11" font-weight="700" fill="#1A1A2E">P3 💭</text>
</svg>
```

### 5.2 마크다운 배지 (shields.io 호환)

```
![P0](https://img.shields.io/badge/P0-BLOCKER-FF4444?style=flat-square)
![P1](https://img.shields.io/badge/P1-CRITICAL-FF8C42?style=flat-square)
![P2](https://img.shields.io/badge/P2-MAJOR-FFD700?style=flat-square)
![P3](https://img.shields.io/badge/P3-MINOR-A0A0A0?style=flat-square)
```

---

## 6. 테스트 리포트 대시보드 모킹업

`tests/reports/index.html` 1280×720 와이어프레임.

```
╔══════════════════════════════════════════════════════════════════════════╗
║  ⚔️ Aeterna Chronicle — QA Dashboard         🔄 Last run: 2 min ago      ║
║  ─────────────────────────────────────────────────────────────────────── ║
║                                                                          ║
║  ┌─ SUMMARY ──────────────┐  ┌─ COVERAGE ────────────────────────┐     ║
║  │  Total      ▓▓▓▓ 1,247  │  │  Lines      ▓▓▓▓▓▓▓▓░░  82.3%    │     ║
║  │  ✅ Pass    ▓▓▓▓ 1,198  │  │  Branches   ▓▓▓▓▓▓▓░░░  74.1%    │     ║
║  │  ❌ Fail    ▓░░░     12  │  │  Functions  ▓▓▓▓▓▓▓▓▓░  91.5%    │     ║
║  │  ⊘ Skip    ▓░░░     31  │  │  Statements ▓▓▓▓▓▓▓▓░░  83.0%    │     ║
║  │  ⚠️ Flaky   ░░░░      6  │  │                                   │     ║
║  └────────────────────────┘  └───────────────────────────────────┘     ║
║                                                                          ║
║  ┌─ BY MODULE ──────────────────────────────────────────────────────┐  ║
║  │ Module             │ Pass │ Fail │ Skip │ Flaky │ Coverage │ ▼  │  ║
║  │ ─────────────────────────────────────────────────────────────── │  ║
║  │ ui/                │  342 │   2  │   8  │   1   │  88.4%   │ ✅ │  ║
║  │ inventory/         │  187 │   0  │   3  │   0   │  94.2%   │ ✅ │  ║
║  │ save/              │  124 │   4🔥│   2  │   2⚠️ │  79.1%   │ ❌ │  ║
║  │ combat/            │  298 │   1  │  12  │   1   │  85.7%   │ ✅ │  ║
║  │ network/           │   89 │   3  │   4  │   2⚠️ │  71.3%   │ ⚠️ │  ║
║  │ scenes/            │  158 │   2  │   2  │   0   │  82.0%   │ ✅ │  ║
║  └────────────────────────────────────────────────────────────────┘  ║
║                                                                          ║
║  ┌─ FAILING TESTS (TOP 5) ──────────────────────────────────────────┐  ║
║  │ 🔥 P0 │ save.test.ts › corrupt slot recovery                     │  ║
║  │ 🔥 P0 │ save.test.ts › migration v0.9 → v1.0                     │  ║
║  │ ⚠️ P1 │ inventory.test.ts › overflow toast on full               │  ║
║  │ 📌 P2 │ ui/dialog.test.ts › ESC during IME composition (FF)      │  ║
║  │ 📌 P2 │ network/sync.test.ts › retry after disconnect            │  ║
║  └────────────────────────────────────────────────────────────────┘  ║
║                                                                          ║
║  ┌─ TREND (7 days) ─────────────────────────────────────────────────┐  ║
║  │  Pass% ┃                                       ▓▓▓▓               │  ║
║  │   100% ┃                              ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓             │  ║
║  │    95% ┃               ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓                            │  ║
║  │    90% ┃  ▓▓▓▓▓▓▓▓▓▓▓▓▓                                            │  ║
║  │        ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━     │  ║
║  │         4/20  4/21  4/22  4/23  4/24  4/25  4/26                  │  ║
║  └────────────────────────────────────────────────────────────────┘  ║
╚══════════════════════════════════════════════════════════════════════════╝
```

### 6.1 컴포넌트 토큰 매핑

| 영역 | 베이스 컬러 | 폰트 | 크기 |
|------|-----------|------|------|
| 헤더 | `#0D0D1A` | Cinzel 18px | 32h |
| 카드 패널 | `#16213E` border `#3A3A4A` | JetBrains Mono 13px | 패딩 16 |
| Pass 그래프 | `#2ECC71` | - | 막대 8px |
| Fail 그래프 | `#FF4444` glow | - | 막대 8px |
| Trend 라인 | `#89CFF0` | - | 2px stroke |

---

## 7. 커버리지 히트맵 컬러 스케일

코드 라인별 커버리지 시각화 (IDE 사이드바·리포트 인라인).

```
┌──────────────────────────────────────────────────────┐
│  COVERAGE HEATMAP (5 stops)                          │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐        │
│  │#FF4444│ │#FF8C42│ │#FFD700│ │#9CCC65│ │#2ECC71│   │
│  │ 0-49% │ │50-69% │ │70-79% │ │80-89% │ │90-100%│   │
│  │ ❌    │ │ ⚠️    │ │ 📌    │ │ 👍    │ │ ✅    │   │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘        │
└──────────────────────────────────────────────────────┘
```

```css
:root {
  --cov-0:   #FF4444;  /*  0–49%  치명적 */
  --cov-50:  #FF8C42;  /* 50–69%  부족   */
  --cov-70:  #FFD700;  /* 70–79%  경계   */
  --cov-80:  #9CCC65;  /* 80–89%  양호   */
  --cov-90:  #2ECC71;  /* 90–100% 우수   */
}

/* 사이드바 1px 라인 인디케이터 */
.cov-line { border-left: 3px solid var(--cov-0); }
.cov-line[data-cov="50"] { border-left-color: var(--cov-50); }
.cov-line[data-cov="70"] { border-left-color: var(--cov-70); }
.cov-line[data-cov="80"] { border-left-color: var(--cov-80); }
.cov-line[data-cov="90"] { border-left-color: var(--cov-90); }
```

---

## 8. data-testid 네이밍 규약 (셀렉터 SSOT)

E2E 테스트가 리팩토링에 휘둘리지 않도록 **클래스/ID 대신 `data-testid`** 사용.

### 8.1 네이밍 패턴

```
data-testid="<scope>-<component>-<element>[-<modifier>]"
```

| Scope | Component | Element | Modifier | 예시 |
|-------|-----------|---------|----------|------|
| `inv` | `slot` | `item` | `:hover` `:disabled` | `inv-slot-item-3` |
| `inv` | `slot` | `count` | - | `inv-slot-count-3` |
| `inv` | `tab` | `equipment` | `:active` | `inv-tab-equipment` |
| `save` | `slot` | `card` | `:loaded` `:corrupt` | `save-slot-card-2` |
| `save` | `slot` | `delete-btn` | - | `save-slot-delete-btn-2` |
| `ui` | `modal` | `confirm` | - | `ui-modal-confirm` |
| `ui` | `toast` | `error` | - | `ui-toast-error` |
| `combat` | `atb` | `gauge` | `:ready` | `combat-atb-gauge-1` |
| `combat` | `cmd` | `attack-btn` | - | `combat-cmd-attack-btn` |

### 8.2 금지 패턴

| ❌ 금지 | ✅ 권장 | 이유 |
|--------|---------|------|
| `.button.primary` | `data-testid="ui-modal-confirm"` | 스타일 변경 시 깨짐 |
| `#save-slot-2` | `data-testid="save-slot-card-2"` | ID 중복 위험 |
| `text=확인` | `data-testid="ui-modal-confirm"` | i18n 시 깨짐 (한/영/일 3로케일) |
| `nth-child(3)` | `data-testid="inv-slot-3"` | DOM 순서 변경 시 깨짐 |

### 8.3 Playwright 도우미

```typescript
// tests/helpers/selectors.ts
export const sel = {
  inv: {
    slot:  (i: number) => `[data-testid="inv-slot-${i}"]`,
    item:  (i: number) => `[data-testid="inv-slot-item-${i}"]`,
    count: (i: number) => `[data-testid="inv-slot-count-${i}"]`,
    tab:   (name: string) => `[data-testid="inv-tab-${name}"]`,
  },
  save: {
    card:      (i: number) => `[data-testid="save-slot-card-${i}"]`,
    deleteBtn: (i: number) => `[data-testid="save-slot-delete-btn-${i}"]`,
  },
  ui: {
    confirm: '[data-testid="ui-modal-confirm"]',
    toast:   (kind: 'error' | 'success' | 'warn') => `[data-testid="ui-toast-${kind}"]`,
  },
} as const;
```

---

## 9. 빌드/리뷰 체크리스트

### 9.1 Build 단계 인계 (계섬월 → 가춘운)

- [ ] `client/src/styles/qa-tokens.css` 생성 (§1.2 토큰)
- [ ] `tests/fixtures/inventory/{empty,partial,full,overflow}.json` 4종 정합 (§3)
- [ ] `tests/fixtures/save/{empty,loaded,corrupt,migration}.json` 4종 정합 (§4)
- [ ] `tests/helpers/selectors.ts` 생성 (§8.3)
- [ ] 모든 테스트 대상 컴포넌트에 `data-testid` 부여 (§8.1 패턴)

### 9.2 Review 단계 (가춘운 design-review)

- [ ] Diff 토큰이 색약 사선 패턴 포함 (§2)
- [ ] FAIL/FLAKY 배지가 색 외 형태/움직임으로 구별 (§1.3)
- [ ] 인벤토리 4상태 fixture가 ASCII 모킹업과 일치 (§3)
- [ ] 세이브 4상태 시각 토큰 일치 (§4.2)
- [ ] 대시보드 컬러가 DESIGN.md v1.0 팔레트 안에서만 작동 (§6.1)

### 9.3 Test 단계 인계 (가춘운 → 적경홍)

- [ ] 회귀 매트릭스 SAVE-E2E-001~006 실행 (§4.3)
- [ ] 시각 회귀 baseline 저장 (Playwright `toHaveScreenshot`)
- [ ] 커버리지 임계값 게이트: `save/` ≥ 90%, `inventory/` ≥ 95%, `ui/` ≥ 85%
- [ ] FLAKY 6건 → 격리 후 별도 트래커

---

## 10. 다음 스프린트 후보

| 우선순위 | 항목 | 담당 |
|---------|------|------|
| P1 | Storybook 8.x 도입 + qa-tokens 적용 | 가춘운 + 계섬월 |
| P1 | 시각 회귀 자동 비교 (Percy/Chromatic) | 적경홍 |
| P2 | 커버리지 트렌드 차트 PNG 생성 자동화 | 심요연 |
| P2 | 리포트 대시보드 i18n (한/영/일) | 진채봉 |
| P3 | Discord 알림 카드 디자인 (FAIL 시) | 가춘운 |

---

> **춘운's note** 💃
> "QA가 예쁘면 버그도 잘 보여요~ 색 하나, 사선 패턴 하나로 회귀 발견 시간이 절반이 된답니다.
> 특히 **세이브 SAVE-E2E-006 혼합 상태**는 진짜 회귀 단골이니까 적경홍 언니 꼭 챙겨주세요! ⚔️✨"
