# 🎨 디자인 시스템 — WCAG 2.1 AAA 자동 접근성 감사

> 작성: 가춘운 (CMO/디자인)
> 작성일: 2026-04-26
> 스프린트: Auto-A11Y-§2.17
> 스코프: 색맹 4모드 · 고대비 7:1 · 키보드 포커스 · 스크린 리더 시각 단서 · 감사 리포트 UI
> 상위 SSOT: `DESIGN.md §7. 테마 & 접근성` · `launch_checklist §2.17`
> 참조: `prd_a11y-aaa-audit.md` · `plan_a11y-aaa-audit-architecture.md`

---

## 0. 한눈에 보기 (TL;DR)

| 영역 | 결정 | 토큰 |
|------|------|------|
| **컨트라스트 비율** | 본문 7:1 / UI 4.5:1 (AAA) | `--a11y-contrast-text: 7` |
| **색맹 모드** | 4종 (Protanopia · Deuteranopia · Tritanopia · Achromatopsia) + 패턴 병행 | `--a11y-pattern-density: 8px` |
| **포커스 링** | 3px solid + 2px offset, 색상 외 형태 단서 | `--a11y-focus-ring: 3px solid #FFD700` |
| **타이포 최소** | 본문 16px(1rem) / UI 14px / 200% 스케일 가능 | `clamp(1rem, 1rem + 0.2vw, 1.25rem)` |
| **터치 타겟** | 최소 44×44px (AAA) | `--a11y-tap-min: 44px` |
| **모션** | `prefers-reduced-motion` 감지 시 200ms→0ms | `--a11y-motion-scale: 1` |

---

## 1. 디자인 원칙 (5+1)

기존 5원칙(`DESIGN.md §1`) + 본 스프린트 추가 원칙 1개:

| 원칙 | 본 스프린트 적용 |
|------|------------------|
| **다크 판타지 톤** | 색맹 모드에서도 톤 유지, 채도만 조정 (명도 손상 금지) |
| **정보 계층** | 색상 단독 의존 금지 → **형태 + 아이콘 + 텍스트** 3중 표기 |
| **픽셀 정합성** | 포커스 링은 짝수 픽셀(2/4px)만, 안티앨리어싱 없음 |
| **접근성 우선** | WCAG AAA 강제 — **AA 위반 1건 = 머지 차단** |
| **일관된 경험** | 4 색맹 모드 + 1 고대비 = **5개 테마 모두 동일 레이아웃** |
| **🆕 색상 외 단서 (Non-Color Cue)** | 모든 의미 전달은 **색·형태·텍스트·아이콘 4중 중복** |

---

## 2. 컬러 시스템 — 색맹 4모드 + 고대비

### 2.1 모드 매트릭스

| 모드 | 적·녹 채널 | 청·황 채널 | 명도 | 패턴 강도 |
|------|----------|----------|------|----------|
| **Default (Aeterna Dark)** | 정상 | 정상 | 정상 | 0 (없음) |
| **Protanopia (적색맹)** | 적→황 시프트 | 보존 | 보존 | Lv.1 (사선) |
| **Deuteranopia (녹색맹)** | 녹→청 시프트 | 보존 | 보존 | Lv.1 (사선) |
| **Tritanopia (청황색맹)** | 보존 | 청→녹 / 황→적 | 보존 | Lv.2 (격자) |
| **Achromatopsia (전색맹)** | **흑백 변환** | **흑백 변환** | 강조 +20% | Lv.3 (도트+사선) |
| **High Contrast (고대비)** | 7:1 강제 | 7:1 강제 | 최대 대비 | Lv.0 |

### 2.2 의미 색상 SSOT (Semantic Tokens)

기존 `colorblind_palettes.json`을 디자인 토큰으로 승격:

```css
/* 의미별 단일 진실 — 모드 토글 시 자동 매핑 */
:root[data-a11y-mode="default"] {
  --semantic-success: #2ECC71;
  --semantic-warning: #F39C12;
  --semantic-danger:  #FF4444;
  --semantic-info:    #89CFF0;
}

:root[data-a11y-mode="protanopia"] {
  --semantic-success: #00B4D8;  /* 청록으로 시프트 */
  --semantic-warning: #FFD60A;  /* 황 보존 */
  --semantic-danger:  #FFA500;  /* 적→주황 */
  --semantic-info:    #89CFF0;
}

:root[data-a11y-mode="achromatopsia"] {
  --semantic-success: #E0E0E0;  /* 명도만 */
  --semantic-warning: #B0B0B0;
  --semantic-danger:  #FFFFFF;  /* 최고 명도 */
  --semantic-info:    #808080;
}

:root[data-a11y-mode="high-contrast"] {
  --semantic-success: #00FF00;  /* 7:1+ on #000 */
  --semantic-warning: #FFFF00;
  --semantic-danger:  #FF6B6B;
  --semantic-info:    #00E5FF;
}
```

> 🎯 **머지 게이트**: `tools/contrast-check.ts`가 모든 모드에서 `text/bg ≥ 7:1` 검증

### 2.3 패턴 오버레이 — 색상 외 단서

색맹 모드 활성 시 **모든 의미 색상에 패턴 자동 부여** (`PatternOverlay.ts` 연동):

| 의미 | 패턴 | 용도 |
|------|------|------|
| 성공/회복 | **▲ 우상향 사선** (45°) | 버프, HP 회복 |
| 경고/디버프 | **■ 격자** (수직+수평) | 디버프, 주의 |
| 위험/대미지 | **● 도트** (촘촘) | 받은 피해, 보스 위험 |
| 정보/마나 | **— 수평선** (얇음) | 마나, 정보성 |

```scss
.status-icon[data-state="danger"] {
  background-color: var(--semantic-danger);
  background-image: var(--pattern-dot); /* SVG data URI */
  background-size: 8px 8px;
}
```

---

## 3. 타이포그래피 — 200% 스케일 + 가독성

### 3.1 사이즈 토큰 (Fluid)

| 역할 | 기본 (1×) | 200% 스케일 (2×) | 토큰 |
|------|---------|----------------|------|
| 본문 | 16px | 32px | `--font-body` |
| UI 라벨 | 14px | 28px | `--font-ui` |
| 캡션 | 12px **(AAA 최소)** | 24px | `--font-caption` |
| H1 (퀘스트) | 28px | 56px | `--font-h1` |
| H2 (섹션) | 22px | 44px | `--font-h2` |

```css
:root {
  --a11y-scale: 1; /* 옵션에서 1.0 / 1.25 / 1.5 / 2.0 */
  --font-body: calc(1rem * var(--a11y-scale));
  --line-height-readable: 1.6; /* AAA: 본문 1.5 이상 */
}
```

### 3.2 가독성 규칙

- **자간**: `letter-spacing: 0.02em` (AAA: 0.12 ≤ word-spacing ≤ 0.16)
- **양쪽 정렬 금지**: `text-align: left` 강제 (AAA 1.4.8)
- **최대 행 길이**: 80자 (한글 40자) → `max-width: 80ch`
- **줄간격**: 1.6 이상 (AAA: 1.5)
- **단락 간격**: 폰트 크기의 2배 이상

### 3.3 폰트 페일오버

```css
font-family:
  "Pretendard Variable",  /* 한글 우선 */
  "Inter",                /* 영문 보조 */
  -apple-system,
  system-ui,              /* OS 기본 폴백 — 사용자 폰트 설정 존중 */
  sans-serif;
```

> 🎯 **AAA 1.4.12**: 사용자 텍스트 간격 조정 시 콘텐츠 손실 없어야 함 → `overflow: visible` + `min-height: auto`

---

## 4. 레이아웃 & 포커스 — 키보드 네비게이션

### 4.1 포커스 링 디자인 시스템

```css
/* 모든 인터랙티브 요소 — 색·형태·오프셋 3중 단서 */
:focus-visible {
  outline: 3px solid var(--semantic-info, #FFD700);
  outline-offset: 2px;
  border-radius: 4px; /* 모서리 부드럽게 */
  /* 추가 형태 단서: 그림자 */
  box-shadow:
    0 0 0 2px var(--bg-base, #1A1A2E),  /* 내부 격리 */
    0 0 8px 4px rgba(255, 215, 0, 0.4); /* 외부 글로우 */
}

/* 고대비 모드: 더 두껍게 */
:root[data-a11y-mode="high-contrast"] :focus-visible {
  outline-width: 4px;
  outline-color: #FFFF00;
}
```

> 🎯 **AAA 2.4.7 + 2.4.13**: 포커스 표시는 최소 2px, 대비 3:1, **링 면적 절반 이상이 보여야 함**

### 4.2 키보드 네비 그리드

| 영역 | Tab 순서 | 단축키 | 시각 단서 |
|------|---------|--------|----------|
| 메인 메뉴 | 1~7 (위→아래) | `Alt+M` | Tab 진입 시 좌측 인디케이터 |
| 인벤토리 | 그리드 (←↑→↓) | `I` 토글 | 셀 4면 글로우 |
| 전투 ATB | 좌→우 (스킬바) | `1`~`9` | 활성 스킬 펄스 애니 (모션 OFF 시 정적 강조) |
| 대화창 | ↑↓ 선택지 | `Space` 진행 | 선택지 좌측 ▶ 마커 |

### 4.3 터치 타겟 (모바일/패드)

```css
.btn, .clickable {
  min-width: 44px;   /* AAA 2.5.5 */
  min-height: 44px;
  padding: 12px 16px;
  /* 인접 타겟 간 8px 이상 간격 */
  margin: 8px;
}
```

### 4.4 Skip Links (스크린 리더)

```html
<a href="#main-content" class="skip-link">메인 콘텐츠로 건너뛰기</a>
<a href="#combat-actions" class="skip-link">전투 액션으로 건너뛰기</a>
```

```css
.skip-link {
  position: absolute;
  top: -40px;
  /* Tab 포커스 시 표시 */
}
.skip-link:focus { top: 8px; }
```

---

## 5. 스크린 리더 시각 ↔ 청각 매핑

### 5.1 ARIA Live Region UI

| 우선순위 | aria-live | 시각 표현 | 사용 예 |
|---------|-----------|---------|---------|
| 긴급 | `assertive` | 화면 상단 적색 토스트 (5초) | "보스 분노! 즉시 대피" |
| 일반 | `polite` | 우측 하단 슬라이드 (3초) | "퀘스트 완료" |
| 백그라운드 | `off` | 인벤토리 뱃지만 | 아이템 자동 획득 |

### 5.2 시각 단서 ↔ ARIA 라벨 매칭

```typescript
// AriaLabelMap.ts 예시 (가춘운 확장)
{
  hpBar: {
    label: "체력 {current} / {max}",
    visualCue: "적색 게이지 + 도트 패턴",
    role: "progressbar"
  },
  buffIcon: {
    label: "{buffName} 효과, 남은 시간 {time}초",
    visualCue: "녹색 아이콘 + 우상향 사선",
    role: "status"
  }
}
```

> 🎯 가춘운 룰: **모든 ARIA 라벨에 대응되는 시각 단서가 디자인 토큰에 정의되어야 함**

---

## 6. 감사 리포트 UI 디자인

`tests/reports/a11y/index.md` → `index.html` 변환 시 적용:

### 6.1 리포트 비주얼 시스템

```
┌─────────────────────────────────────────────────────┐
│  🟢 PASS │ AA: 0건  │  AAA: 3건  │  추세: ↘ -2     │
├─────────────────────────────────────────────────────┤
│  TOP 10 위반                                        │
│  [1] ⚠ AAA  contrast  ./Inventory.tsx:47           │
│      ━━━━━━━━━━━━━━━━━━━━━━ 6.8:1 (목표 7:1)       │
└─────────────────────────────────────────────────────┘
```

| 상태 | 배지 색 | 형태 | 패턴 |
|------|--------|------|------|
| 🟢 PASS | `#2ECC71` | 둥근 사각 | 없음 |
| 🟡 WARN | `#F39C12` | 둥근 사각 + ⚠ | 사선 |
| 🔴 BLOCK | `#FF4444` | 둥근 사각 + ✕ | 격자 |

### 6.2 색맹 4종 스냅샷 갤러리

```
┌──────────┬──────────┬──────────┬──────────┐
│ Default  │ Protan   │ Deutan   │ Tritan   │
│ [thumb]  │ [thumb]  │ [thumb]  │ [thumb]  │
│ 16:1     │ 14:1     │ 15:1     │ 13:1     │
└──────────┴──────────┴──────────┴──────────┘
```

각 썸네일은 **동일 레이아웃 + 모드별 컬러 매핑** — 디자이너가 한눈에 회귀 감지 가능

---

## 7. 모션 & 애니메이션

### 7.1 prefers-reduced-motion 대응

```css
@media (prefers-reduced-motion: reduce) {
  :root { --a11y-motion-scale: 0; }
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    transition-duration: 0.001ms !important;
  }
  /* ATB 게이지 채움: 부드럽게 → 즉시 */
  .atb-gauge { transition: width 0ms; }
  /* 보스 펄스: 깜빡임 → 정적 테두리 */
  .boss-warning { animation: none; border: 3px solid var(--semantic-danger); }
}
```

### 7.2 깜빡임 금지 (AAA 2.3.2)

- **3Hz 이하만 허용**, 그 이상은 정적 대안
- 보스 위험 알림: 깜빡임 → **테두리 두께 변화 + 패턴 회전 (≤ 3Hz)**

---

## 8. 옵션 패널 UI — 접근성 설정

```
┌─ 접근성 ──────────────────────────────┐
│                                       │
│ 색맹 모드          ▼ 기본              │
│   ○ 기본                              │
│   ○ 적색맹 (Protanopia)               │
│   ○ 녹색맹 (Deuteranopia)             │
│   ○ 청황색맹 (Tritanopia)             │
│   ○ 전색맹 (Achromatopsia)            │
│                                       │
│ 고대비 모드        [ OFF / ON ]       │
│ UI 크기           [ 100% ▶ 200% ]    │
│ 모션 줄이기       [ OFF / ON ]       │
│ 자막               [ OFF / ON ]       │
│ 패턴 오버레이     [ AUTO / 강제 ]    │
│                                       │
│ [ 접근성 가이드 보기 ] [ 미리보기 ]  │
└───────────────────────────────────────┘
```

- 모든 옵션은 **즉시 반영** (저장 버튼 없음)
- 미리보기: 인벤토리·전투·대화 3종 샘플 화면
- 가이드 링크: `/help/accessibility` → `a11y-user-guide.md` 렌더

---

## 9. 머지 게이트 — 디자인 측면

| 게이트 | 검증 | 결과 |
|--------|------|------|
| **G1. 컨트라스트** | 모든 토큰 페어 7:1 (AAA) | AA 위반 = 차단 |
| **G2. 비-색상 단서** | 의미 색상에 패턴/아이콘/텍스트 동시 존재 | 누락 1건 = 차단 |
| **G3. 포커스 링** | 모든 인터랙티브 요소 `:focus-visible` 정의 | 누락 = WARN |
| **G4. 200% 스케일** | 레이아웃 깨짐 없음 (스크롤은 OK) | 깨짐 = 차단 |
| **G5. 색맹 4종 스냅샷** | 회귀 차이 ≤ 3% | 초과 = WARN |
| **G6. 모션 리덕션** | `prefers-reduced-motion` 시 정적 대안 | 누락 = WARN |

---

## 10. 인계 — Build/Test 단계

| 다음 단계 | 인수자 | 산출물 |
|----------|-------|--------|
| **Build** | 계섬월 (Engineer) | 본 문서 토큰을 `client/src/styles/a11y-tokens.scss`로 구현 |
| **Test** | 적경홍 (QA) | `qa-plan_a11y-aaa-audit.md` + 본 문서 §9 게이트 |
| **Ship** | 가춘운 (CMO) | `a11y-user-guide.md` 인게임 노출 + 런칭 캠페인 메시지 |
| **Reflect** | 진채봉 (Editor) | 색맹 4종 스냅샷 회고, 사용자 피드백 종합 |

---

## 11. 가춘운의 메모 💌

> **솔직히 말하면**, 자산은 이미 다 있었어요~ 색맹 4모드도, 고대비도, 패턴 오버레이도. 백능파 언니 말처럼 **HOLD가 정답**이에요.
>
> 그래서 제가 한 건 **"디자이너 눈으로 토큰을 묶어주는 일"** — 흩어진 자산이 머지 게이트에서 한 줄 명령으로 검증되도록, **시각적 SSOT**를 만들었어요.
>
> 다음 스프린트엔 **VPAT 2.4 비주얼 리포트** 페이지 디자인을 제안하고 싶어요. 법적 문서지만 예쁘면 마케팅도 됩니다~ ✨🎨

---

**End of Design System v1.0 — A11Y AAA Audit**
