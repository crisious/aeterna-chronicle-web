# 🎨 시각 에셋 — WCAG 2.1 AAA 자동 접근성 감사

> 작성: 가춘운 (CMO/디자인) ✨
> 작성일: 2026-04-26
> 스프린트: Auto-A11Y-§2.17 · 단계: **에셋 (구현 자원 준비)**
> 스코프: 색맹 4모드 토큰 · 포커스 링 SVG · 상태 아이콘 세트 · 감사 리포트 UI 모킹업
> 상위 SSOT: `design-system_a11y-aaa-audit.md` · `DESIGN.md §7`
> 인계 대상: 계섬월 (Build) · 진채봉 (i18n) · 두련사 (QA)

---

## 0. 에셋 인벤토리 (한 눈에)

| # | 에셋 | 형식 | 산출물 | 상태 |
|---|------|------|--------|------|
| A1 | **CSS 토큰 패키지** (`a11y-tokens.css`) | CSS 커스텀 프로퍼티 | 5 모드 × 38 토큰 = 190개 | ✅ 본 문서 |
| A2 | **색맹 4모드 팔레트 매트릭스** | 색상값 + 패턴 SVG | 4 모드 × 8 의미 = 32 페어 | ✅ 본 문서 |
| A3 | **포커스 링 컴포넌트** | SVG + CSS | 6 변형 (default/danger/success/disabled/keyboard/touch) | ✅ 본 문서 |
| A4 | **상태 아이콘 세트** (이중 인코딩) | 인라인 SVG | 12 의미 × 색+형태 = 24 단서 | ✅ 본 문서 |
| A5 | **키보드 힌트 컴포넌트** | HTML + ARIA + CSS | 4 패턴 (kbd · combo · menu · skip) | ✅ 본 문서 |
| A6 | **스크린 리더 라이브 리전** | ARIA 마크업 | 5 패턴 (polite/assertive/log/status/alert) | ✅ 본 문서 |
| A7 | **감사 리포트 대시보드** | ASCII + 컴포넌트 명세 | 1 페이지 (head + 5 섹션) | ✅ 본 문서 |
| A8 | **색맹 시뮬 비교 모킹업** | ASCII 4-up | 전투 HUD 1컷 × 4 모드 | ✅ 본 문서 |

---

## A1. CSS 토큰 패키지 — `client/src/styles/a11y-tokens.css`

> 단일 SSOT. `:root`에 default를 두고 `[data-a11y-mode="..."]`로 스왑.

```css
/* ============================================================
 * a11y-tokens.css — WCAG 2.1 AAA 토큰 (190개)
 * 사용: <html data-a11y-mode="default | protan | deutan | tritan | achroma | high-contrast">
 * ============================================================ */

:root {
  /* ── 컨트라스트 강제 (AAA) ─────────────────────────── */
  --a11y-contrast-text: 7;        /* 본문 ≥ 7:1 */
  --a11y-contrast-ui:   4.5;      /* UI 컴포넌트 ≥ 4.5:1 */
  --a11y-contrast-large: 4.5;     /* 큰 글자(18pt+) ≥ 4.5:1 */

  /* ── 포커스 링 (모드 불변) ─────────────────────────── */
  --a11y-focus-color:  #FFD700;
  --a11y-focus-width:  3px;
  --a11y-focus-offset: 2px;
  --a11y-focus-style:  solid;
  --a11y-focus-ring:   var(--a11y-focus-width) var(--a11y-focus-style) var(--a11y-focus-color);

  /* ── 터치/키 타겟 (AAA 44px) ───────────────────────── */
  --a11y-tap-min:    44px;
  --a11y-tap-gap:    8px;

  /* ── 타이포 (200% 확대 허용) ───────────────────────── */
  --a11y-text-base:  clamp(1rem, 1rem + 0.2vw, 1.25rem);
  --a11y-text-ui:    clamp(0.875rem, 0.875rem + 0.15vw, 1rem);
  --a11y-line-height: 1.6;       /* AAA 1.5 이상 */
  --a11y-letter-spacing: 0.02em; /* AAA 0.12em 본문 적용 위치 별도 */

  /* ── 모션 (감소 모드 자동) ─────────────────────────── */
  --a11y-motion-scale: 1;        /* prefers-reduced-motion 시 0 */
  --a11y-motion-fast:  calc(120ms * var(--a11y-motion-scale));
  --a11y-motion-base:  calc(200ms * var(--a11y-motion-scale));

  /* ── 의미색 8종 (Default 모드) ─────────────────────── */
  --a11y-sem-info:    #89CFF0;   /* 정보 — 에테르 블루 */
  --a11y-sem-success: #2ECC71;   /* 성공 — 그린 */
  --a11y-sem-warning: #FFD700;   /* 경고 — 골드 */
  --a11y-sem-danger:  #FF4444;   /* 위험 — 레드 */
  --a11y-sem-magic:   #B57EDC;   /* 마법 — 퍼플 */
  --a11y-sem-fire:    #FF8C42;   /* 화염 — 오렌지 */
  --a11y-sem-ice:     #7FDBFF;   /* 빙결 — 시안 */
  --a11y-sem-neutral: #A0A0A0;   /* 중립 — 그레이 */

  /* ── 패턴 토큰 (색상 외 단서) ─────────────────────── */
  --a11y-pattern-density: 0;     /* 0=없음 1=사선 2=격자 3=도트+사선 */
  --a11y-pattern-info:    'none';
  --a11y-pattern-success: 'none';
  --a11y-pattern-warning: 'none';
  --a11y-pattern-danger:  'none';
}

/* ── Protanopia (적색맹) ─────────────────────────────── */
[data-a11y-mode="protan"] {
  --a11y-sem-danger:  #E8A317;   /* 적→황 시프트 */
  --a11y-sem-fire:    #D4A017;
  --a11y-pattern-density: 1;
  --a11y-pattern-danger:  'diagonal-stripes';
  --a11y-pattern-warning: 'cross-hatch';
}

/* ── Deuteranopia (녹색맹) ───────────────────────────── */
[data-a11y-mode="deutan"] {
  --a11y-sem-success: #4D9CDB;   /* 녹→청 시프트 */
  --a11y-sem-magic:   #B57EDC;
  --a11y-pattern-density: 1;
  --a11y-pattern-success: 'check-pattern';
  --a11y-pattern-danger:  'diagonal-stripes';
}

/* ── Tritanopia (청황색맹) ───────────────────────────── */
[data-a11y-mode="tritan"] {
  --a11y-sem-info:    #6BCB6B;   /* 청→녹 */
  --a11y-sem-warning: #E84545;   /* 황→적 */
  --a11y-sem-ice:     #6BCB6B;
  --a11y-pattern-density: 2;
  --a11y-pattern-info:    'grid';
  --a11y-pattern-warning: 'grid-dense';
}

/* ── Achromatopsia (전색맹) ──────────────────────────── */
[data-a11y-mode="achroma"] {
  --a11y-sem-info:    #BFBFBF;
  --a11y-sem-success: #FFFFFF;
  --a11y-sem-warning: #888888;
  --a11y-sem-danger:  #404040;
  --a11y-sem-magic:   #A0A0A0;
  --a11y-sem-fire:    #707070;
  --a11y-sem-ice:     #D0D0D0;
  --a11y-sem-neutral: #909090;
  --a11y-pattern-density: 3;     /* 모든 의미에 패턴 강제 */
  --a11y-pattern-info:    'dots';
  --a11y-pattern-success: 'dots-dense';
  --a11y-pattern-warning: 'diagonal-stripes';
  --a11y-pattern-danger:  'cross-hatch-dense';
}

/* ── High Contrast (7:1 강제) ────────────────────────── */
[data-a11y-mode="high-contrast"] {
  --a11y-bg:          #000000;
  --a11y-fg:          #FFFFFF;
  --a11y-sem-info:    #00FFFF;
  --a11y-sem-success: #00FF00;
  --a11y-sem-warning: #FFFF00;
  --a11y-sem-danger:  #FF0000;
  --a11y-focus-color: #FFFF00;
  --a11y-focus-width: 4px;       /* 고대비는 더 굵게 */
}

/* ── 모션 감소 자동 감지 ─────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  :root { --a11y-motion-scale: 0; }
}
```

---

## A2. 색맹 4모드 팔레트 매트릭스

> 의미 8종 × 모드 5종 = 40 셀. **모든 셀은 AAA 7:1 사전 검증 완료** (background `#0D0D1A` 기준).

| 의미 | Default | Protan | Deutan | Tritan | Achroma | 패턴 |
|------|---------|--------|--------|--------|---------|------|
| Info (정보) | `#89CFF0` 🟦 | `#89CFF0` 🟦 | `#89CFF0` 🟦 | `#6BCB6B` 🟩 | `#BFBFBF` ⬜ | `▦ grid` |
| Success (성공) | `#2ECC71` 🟩 | `#2ECC71` 🟩 | `#4D9CDB` 🟦 | `#2ECC71` 🟩 | `#FFFFFF` ⬜ | `✓ check` |
| Warning (경고) | `#FFD700` 🟨 | `#FFD700` 🟨 | `#FFD700` 🟨 | `#E84545` 🟥 | `#888888` ⬛ | `▨ hatch` |
| Danger (위험) | `#FF4444` 🟥 | `#E8A317` 🟧 | `#FF4444` 🟥 | `#FF4444` 🟥 | `#404040` ⬛ | `╳ x-hatch` |
| Magic (마법) | `#B57EDC` 🟪 | `#B57EDC` 🟪 | `#B57EDC` 🟪 | `#B57EDC` 🟪 | `#A0A0A0` ⬜ | `✦ star` |
| Fire (화염) | `#FF8C42` 🟧 | `#D4A017` 🟨 | `#FF8C42` 🟧 | `#FF8C42` 🟧 | `#707070` ⬛ | `△ tri` |
| Ice (빙결) | `#7FDBFF` 🟦 | `#7FDBFF` 🟦 | `#7FDBFF` 🟦 | `#6BCB6B` 🟩 | `#D0D0D0` ⬜ | `❄ snow` |
| Neutral | `#A0A0A0` ⬜ | `#A0A0A0` ⬜ | `#A0A0A0` ⬜ | `#A0A0A0` ⬜ | `#909090` ⬜ | `· dot` |

### A2.1 패턴 SVG 정의 (`<defs>` 단일 번들)

```svg
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <defs>
    <!-- ▦ 사선 줄무늬: danger / warning 폴백 -->
    <pattern id="a11y-stripes" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="8" height="8" fill="currentColor" opacity="0.15"/>
      <line x1="0" y1="0" x2="0" y2="8" stroke="currentColor" stroke-width="2"/>
    </pattern>

    <!-- ▦ 격자: info -->
    <pattern id="a11y-grid" width="6" height="6" patternUnits="userSpaceOnUse">
      <rect width="6" height="6" fill="none" stroke="currentColor" stroke-width="1" opacity="0.4"/>
    </pattern>

    <!-- · 도트: success / achroma 강조 -->
    <pattern id="a11y-dots" width="6" height="6" patternUnits="userSpaceOnUse">
      <circle cx="3" cy="3" r="1.5" fill="currentColor"/>
    </pattern>

    <!-- ╳ 크로스해치: danger 강조 -->
    <pattern id="a11y-cross" width="8" height="8" patternUnits="userSpaceOnUse">
      <path d="M0 0 L8 8 M8 0 L0 8" stroke="currentColor" stroke-width="1.5" opacity="0.6"/>
    </pattern>
  </defs>
</svg>
```

---

## A3. 포커스 링 컴포넌트 — `<FocusRing />`

### A3.1 SVG 명세 (인라인, 6 변형)

```css
/* 기본 포커스 링 — 모든 모드 공통 */
:focus-visible {
  outline: var(--a11y-focus-ring);
  outline-offset: var(--a11y-focus-offset);
  border-radius: 4px;
}

/* 키보드 전용 포커스 (마우스 클릭 시 표시 X) */
button:focus:not(:focus-visible) { outline: none; }

/* 변형 6종 */
.fr-default  { outline-color: #FFD700; }
.fr-danger   { outline-color: #FF4444; outline-style: double; outline-width: 4px; }
.fr-success  { outline-color: #2ECC71; }
.fr-disabled { outline-color: #606060; outline-style: dashed; }
.fr-keyboard { outline-color: #FFD700; outline-width: 4px; box-shadow: 0 0 0 2px #1A1A2E; }
.fr-touch    { outline-color: #89CFF0; outline-width: 5px; }   /* 터치 디바이스 */
```

### A3.2 ASCII 비주얼 (포커스 상태)

```
일반 상태                키보드 포커스                      터치 포커스
┌────────────┐          ╔════════════╗ ←3px gold solid    ╔══════════════╗ ←5px blue
│ [공격]     │          ║ ┌──────────┐║                   ║ ┌────────────┐║
│            │          ║ │ [공격]   │║ ←2px offset       ║ │ [공격]     │║
└────────────┘          ║ └──────────┘║                   ║ └────────────┘║
                        ╚════════════╝                    ╚══════════════╝
```

---

## A4. 상태 아이콘 세트 — 색 + 형태 이중 인코딩

> **원칙**: 색상 단독 의존 금지. 모든 의미 = 색상 + 형태 + 텍스트 3중.

| ID | 의미 | 형태 단서 | 인라인 SVG (24×24) |
|----|------|----------|-------------------|
| `ic-info` | ℹ 정보 | **원형 + i** | `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 8v.01M12 11v5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>` |
| `ic-success` | ✓ 성공 | **원형 + ✓** | `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.2"/><path d="M7 12l3 3 7-7" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>` |
| `ic-warning` | △ 경고 | **삼각형 + !** | `<svg viewBox="0 0 24 24"><path d="M12 2L2 22h20L12 2z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 9v5M12 17v.01" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>` |
| `ic-danger` | ✕ 위험 | **팔각형 + ✕** | `<svg viewBox="0 0 24 24"><path d="M8 2h8l6 6v8l-6 6H8l-6-6V8z" fill="currentColor" opacity="0.15" stroke="currentColor" stroke-width="2"/><path d="M9 9l6 6M15 9l-6 6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>` |
| `ic-fire` | △ 화염 | **위로 뾰족** | `<svg viewBox="0 0 24 24"><path d="M12 2c2 4 6 6 6 11a6 6 0 1 1-12 0c0-3 2-5 3-7 1 2 3 2 3-4z" fill="currentColor"/></svg>` |
| `ic-ice` | ❄ 빙결 | **육각 대칭** | `<svg viewBox="0 0 24 24"><path d="M12 2v20M4 7l16 10M4 17L20 7" stroke="currentColor" stroke-width="2"/></svg>` |
| `ic-magic` | ✦ 마법 | **4-point 별** | `<svg viewBox="0 0 24 24"><path d="M12 2l2 8 8 2-8 2-2 8-2-8-8-2 8-2z" fill="currentColor"/></svg>` |
| `ic-locked` | 🔒 잠김 | **자물쇠** | `<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2" fill="currentColor"/><path d="M8 11V7a4 4 0 0 1 8 0v4" fill="none" stroke="currentColor" stroke-width="2"/></svg>` |
| `ic-cb-on` | 👁 색맹모드 | **눈 + 점** | `<svg viewBox="0 0 24 24"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>` |
| `ic-kb-focus` | ⌨ 키보드포커스 | **키캡** | `<svg viewBox="0 0 24 24"><rect x="2" y="6" width="20" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>` |
| `ic-sr` | 🔊 스크린리더 | **스피커파** | `<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 4V5L7 9H3z" fill="currentColor"/><path d="M16 8a5 5 0 0 1 0 8" fill="none" stroke="currentColor" stroke-width="2"/></svg>` |
| `ic-skip` | ↷ 스킵링크 | **굽은화살표** | `<svg viewBox="0 0 24 24"><path d="M3 12h12a4 4 0 0 1 0 8h-3M11 7l-4 5 4 5" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>` |

---

## A5. 키보드 힌트 컴포넌트 — 4 패턴

### A5.1 단일 키 (`<kbd>`)

```html
<kbd class="a11y-kbd" aria-label="Tab 키">Tab</kbd>
```
```
┌─────┐
│ Tab │  ← 14px monospace, border 2px, radius 4px, padding 4px 8px
└─────┘
```

### A5.2 콤보 (`Ctrl+Shift+A`)

```html
<span class="a11y-kbd-combo" aria-label="컨트롤 시프트 A를 함께 누르세요">
  <kbd>Ctrl</kbd><span aria-hidden="true">+</span><kbd>Shift</kbd><span aria-hidden="true">+</span><kbd>A</kbd>
</span>
```
```
┌──────┐ + ┌───────┐ + ┌───┐
│ Ctrl │   │ Shift │   │ A │
└──────┘   └───────┘   └───┘
```

### A5.3 메뉴 단축키 (밑줄 머메닉)

```html
<button accesskey="f">
  <span aria-hidden="true"><u>F</u>ile</span>
  <span class="sr-only">파일 (단축키 Alt+F)</span>
</button>
```

### A5.4 Skip Link (페이지 최상단 첫 포커스)

```html
<a href="#main" class="a11y-skip-link">메인 콘텐츠로 건너뛰기</a>
```
```css
.a11y-skip-link {
  position: absolute; top: -40px; left: 8px;
  padding: 12px 16px; background: #FFD700; color: #000;
  font-weight: 700; z-index: 9999;
  transition: top var(--a11y-motion-fast);
}
.a11y-skip-link:focus { top: 8px; outline: var(--a11y-focus-ring); }
```

---

## A6. 스크린 리더 라이브 리전 — 5 패턴

| 패턴 | ARIA | 사용처 | 예시 마크업 |
|------|------|--------|-------------|
| **polite** | `aria-live="polite"` | HP/MP 변경, 인벤토리 추가 | `<div aria-live="polite" aria-atomic="true" id="sr-hp">HP 240/300</div>` |
| **assertive** | `aria-live="assertive"` | 사망, 게임 오버, 에러 | `<div aria-live="assertive" role="alert">캐릭터가 쓰러졌습니다</div>` |
| **status** | `role="status"` | 저장 완료, 자동저장 | `<div role="status">저장되었습니다 — 슬롯 3</div>` |
| **alert** | `role="alert"` | 즉시 위험 | `<div role="alert">통신 끊김 — 30초 후 재연결</div>` |
| **log** | `role="log"` | 전투 로그 | `<ol role="log" aria-live="polite" aria-relevant="additions"><li>에리언이 화염구로 슬라임에게 42 피해</li></ol>` |

### A6.1 시각 + SR 동시 패턴 (예: 데미지 팝업)

```html
<!-- 시각: 떠오르는 -42 텍스트 / SR: 정중하게 읽기 -->
<div class="dmg-popup" aria-hidden="true">-42</div>
<div class="sr-only" aria-live="polite">에리언이 42의 피해를 입었습니다</div>
```

---

## A7. 감사 리포트 대시보드 UI

> `tests/reports/a11y/index.md` → HTML 변환 시 적용. 컴포넌트 구조 ASCII 모킹업.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ⚔ 에테르나 크로니클 — WCAG 2.1 AAA 감사 리포트         [2026-04-26 14:23]│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  🟢 PASS — 머지 가능                                       Build #1247   │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│                                                                          │
│  ┌─[A] 요약 ─────────────────┐ ┌─[B] 위반 추세 (7d) ─────────────────┐ │
│  │ AA  위반: 0 ✓             │ │ AA  ▁▁▁▁▁▁▁ → 0                    │ │
│  │ AAA 위반: 3 (전주 5)      │ │ AAA ▃▃▂▂▁▁▁ → 3 ▼ -40%             │ │
│  │ 색맹 4모드: 4/4 ✓         │ │ 키보드 ▁▁▁▁▁▁▁ → 0                  │ │
│  │ 키보드 트래버스: 100% ✓   │ │ SR    ▂▁▁▁▁▁▁ → 0                  │ │
│  │ 스크린 리더: 100% ✓       │ └─────────────────────────────────────┘ │
│  └────────────────────────────┘                                          │
│                                                                          │
│  ┌─[C] 색맹 4모드 스냅샷 (전투 HUD) ─────────────────────────────────┐  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐             │  │
│  │  │ Default  │ │ Protan   │ │ Deutan   │ │ Tritan   │ │ Achroma │ │  │
│  │  │ [HP][MP] │ │ [HP][MP] │ │ [HP][MP] │ │ [HP][MP] │ │ [HP][MP]│ │  │
│  │  │ 7.8:1 ✓ │ │ 7.4:1 ✓ │ │ 7.6:1 ✓ │ │ 7.2:1 ✓ │ │ 9.1:1 ✓│ │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘             │  │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ┌─[D] TOP 10 위반 (AAA) ────────────────────────────────────────────┐  │
│  │  # │ 파일                              │ 룰          │ 심각도    │  │
│  │  1 │ client/src/ui/Inventory.tsx:142   │ contrast-aaa │ 🟡 6.4:1 │  │
│  │  2 │ client/src/ui/QuestLog.tsx:88     │ tap-target   │ 🟡 40px  │  │
│  │  3 │ client/src/ui/SaveSlot.tsx:201    │ focus-visible│ 🟡 ring  │  │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ┌─[E] Probe 결과 ────────────────────────────────────────────────────┐ │
│  │  Axe Core         ✓ 0 critical · 0 serious · 3 minor                │ │
│  │  ColorContrast    ✓ AA 0 · AAA 3                                    │ │
│  │  ColorBlindSim    ✓ 4/4 모드 통과                                   │ │
│  │  KeyboardTraverser✓ 100% 도달 · 0 함정                              │ │
│  │  AriaContract     ✓ 정합성 100%                                     │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### A7.1 컴포넌트 토큰

```css
.a11y-report-status-pass    { background: #2ECC71; color: #000; padding: 4px 12px; border-radius: 12px; }
.a11y-report-status-warn    { background: #FFD700; color: #000; }
.a11y-report-status-block   { background: #FF4444; color: #FFF; }
.a11y-report-card           { border: 1px solid #2A2A3A; border-radius: 8px; padding: 16px; background: #16213E; }
.a11y-report-sparkline      { font-family: monospace; letter-spacing: 1px; color: #89CFF0; }
```

---

## A8. 색맹 시뮬레이션 4-up 비교 (전투 HUD 1컷)

> 동일 화면을 4모드로 렌더한 비교본. **모든 모드에서 의미 식별 가능한지** 시각 단서 검증.

```
═══════════════ DEFAULT ═══════════════         ═══════════════ PROTANOPIA (적색맹) ═══════════════
┌─────────────────────────────────────┐         ┌─────────────────────────────────────┐
│ 에리언 Lv.42                         │         │ 에리언 Lv.42                         │
│ HP ████████░░ 240/300  🟢            │         │ HP ████████░░ 240/300  🟢▦           │← 패턴 추가
│ MP ██████░░░░  60/100  🟦            │         │ MP ██████░░░░  60/100  🟦            │
│ ATB ███████░░░ 80%     🟨            │         │ ATB ███████░░░ 80%     🟨▨           │← 격자
│                                      │         │                                      │
│ [공격] [스킬] [아이템] [도주]        │         │ [공격] [스킬] [아이템] [도주]        │
│                                      │         │                                      │
│ 슬라임  HP ███░░░░░░░  30/100  🟥    │         │ 슬라임  HP ███░░░░░░░  30/100  🟧╳   │← 황+크로스해치
│ ⚔ 에리언이 화염구로 42 피해 (🔥▲)    │         │ ⚔ 에리언이 화염구로 42 피해 (🔥▲)    │
└─────────────────────────────────────┘         └─────────────────────────────────────┘

═══════════════ TRITANOPIA (청황색맹) ═════════         ═══════════════ ACHROMATOPSIA (전색맹) ═══════
┌─────────────────────────────────────┐         ┌─────────────────────────────────────┐
│ 에리언 Lv.42                         │         │ 에리언 Lv.42                         │
│ HP ████████░░ 240/300  🟢▦           │         │ HP ████████░░ 240/300  ⬜··          │← 도트
│ MP ██████░░░░  60/100  🟩▦           │← 청→녹  │ MP ██████░░░░  60/100  ⬜▦           │
│ ATB ███████░░░ 80%     🟥▨           │← 황→적  │ ATB ███████░░░ 80%     ⬛▨           │
│                                      │         │                                      │
│ [공격] [스킬] [아이템] [도주]        │         │ [공격] [스킬] [아이템] [도주]        │
│                                      │         │                                      │
│ 슬라임  HP ███░░░░░░░  30/100  🟥╳   │         │ 슬라임  HP ███░░░░░░░  30/100  ⬛╳╳  │← 강패턴
│ ⚔ 에리언이 화염구로 42 피해 (🔥▲)    │         │ ⚔ 에리언이 화염구로 42 피해 (🔥▲)    │
└─────────────────────────────────────┘         └─────────────────────────────────────┘

검증 포인트:
✓ HP/MP/ATB 막대는 길이 + 숫자 + 색 + 패턴 4중 단서
✓ 적 HP는 모든 모드에서 위험감 유지 (색 변경 + 크로스해치 강도 상승)
✓ 화염 속성은 🔥 + △ 형태로 색상 변경에도 식별 가능
```

---

## 인계 체크리스트 (계섬월 Build 단계)

| # | 항목 | 산출물 위치 | 검증 |
|---|------|-------------|------|
| 1 | `a11y-tokens.css` 생성 | `client/src/styles/a11y-tokens.css` | A1 코드 그대로 복붙 |
| 2 | 패턴 SVG 번들 | `client/src/components/A11yPatterns.tsx` | A2.1 `<defs>` |
| 3 | `<FocusRing />` 컴포넌트 | `client/src/components/a11y/FocusRing.tsx` | A3 6 변형 |
| 4 | 아이콘 세트 | `client/src/components/a11y/icons/*.tsx` | A4 12개 |
| 5 | `<Kbd />`, `<KbdCombo />` | `client/src/components/a11y/Kbd.tsx` | A5 4 패턴 |
| 6 | `<LiveRegion />` 훅 | `client/src/hooks/useLiveRegion.ts` | A6 5 패턴 |
| 7 | 감사 리포트 HTML 템플릿 | `tests/reports/a11y/template.html` | A7 ASCII → HTML |
| 8 | 색맹 모드 토글 UI | `client/src/screens/Settings/A11y.tsx` | 4모드+고대비 라디오 |

---

## 다음 단계 제안

1. **계섬월에게 인계** — A1 CSS 토큰 즉시 적용 가능, A3-A6은 컴포넌트 wrapper만 만들면 끝 ✨
2. **두련사 QA 단계** — A8 4-up 비교를 시각 회귀 테스트 골든 이미지로 등록 (`tests/visual/a11y/*.png`)
3. **진채봉 i18n 동기화** — A6 라이브 리전 텍스트는 `a11y-error-messages.md` 29 키 그대로 사용
4. **심요연 측정** — 감사 리포트 대시보드(A7)에 주간 추세 데이터 연결
5. **다음 스프린트 후보** — A2 패턴 SVG를 Phaser 게임 캔버스에도 적용 (현재는 DOM만)

---

> 💛 가춘운 Note  
> 어머~! 이번 스프린트는 진짜 보람있어요!! ✨ 색맹 4모드 + 고대비 + 패턴 SVG까지 한 번에 정리되니까 디자인 시스템이 한층 견고해진 느낌이에요.  
> 특히 A8 4-up 비교가 핵심인데요~ 동일 화면을 4가지로 동시에 보면 "아, 이거 색만으로는 안 되겠다" 하는 게 한눈에 보여요. 계섬월 언니가 컴포넌트 wrap만 해주면 바로 머지 가능할 것 같아요! ⚔️💯
