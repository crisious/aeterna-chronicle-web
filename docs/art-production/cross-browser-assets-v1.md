# 🎨 크로스브라우저 검증 — 시각 에셋 패키지 v1.0

> 작성: 가춘운 (CMO/디자인) · 2026-04-26
> 단계: **에셋(Asset)** · 스프린트: 크로스브라우저 호환성 검증
> 연결: `cross-browser-design-spec.md` (Plan/Think 산출물) → 본 문서(에셋) → Build/Review 인계
> 산출물: 폴백 CSS 시트 1개, 토큰 SSOT 1세트, ASCII 모킹업 4종, SVG 뱃지 3종, QA 시트 템플릿

---

## 0. 산출물 인덱스 ✨

| ID | 자원 | 경로 | 용도 |
|----|------|------|------|
| A1 | 폴백 시트 | `client/src/styles/design-system-compat.css` | Build 단계 즉시 임포트 |
| A2 | 호환 토큰 | 본 문서 §1 (TS/CSS) | RendererDetector·디자인 일관성 |
| A3 | QA 대시보드 모킹업 | 본 문서 §2 | 심요연 회귀 도구 UI |
| A4 | 호환 모드 뱃지 SVG | 본 문서 §3 | 토스트·HUD 코너 표시 |
| A5 | 픽셀 디프 시각화 가이드 | 본 문서 §4 | 60장 베이스라인 검토 |
| A6 | 60장 캡처 시트 템플릿 | 본 문서 §5 | 이소화 QA 인계 |

---

## 1. 호환 토큰 SSOT (`compat-tokens.ts`)

> 계섬월의 `RendererDetector.ts`와 가춘운의 `design-system-compat.css`가 **공유**하는 단일 진실 공급원.

```typescript
// client/src/compat/compat-tokens.ts
// 생성: 가춘운 CMO · 사용처: RendererDetector.ts, BattleScene.ts, UIScene.ts

export const COMPAT_MODE = {
  WEBGL_FULL:   'webgl-full',    // Chrome 정상
  WEBGL_LITE:   'webgl-lite',    // Firefox: postFX 일부 비활성
  CANVAS_2D:    'canvas',        // Safari/iOS: postFX 전면 OFF
  FALLBACK:     'fallback',      // WebGL 컨텍스트 손실 시
} as const;

export type CompatMode = typeof COMPAT_MODE[keyof typeof COMPAT_MODE];

/** 브라우저별 폴백 활성 여부 (디자인 사이드) */
export const COMPAT_FLAGS: Record<CompatMode, {
  postFXGlow: boolean;
  postFXBlur: boolean;
  postFXBloom: boolean;
  cssBackdropFilter: boolean;
  textShadowDouble: boolean;
  animationKeyframes: boolean;
}> = {
  'webgl-full': { postFXGlow: true,  postFXBlur: true,  postFXBloom: true,  cssBackdropFilter: true,  textShadowDouble: true,  animationKeyframes: true  },
  'webgl-lite': { postFXGlow: true,  postFXBlur: false, postFXBloom: false, cssBackdropFilter: true,  textShadowDouble: true,  animationKeyframes: true  },
  'canvas':     { postFXGlow: false, postFXBlur: false, postFXBloom: false, cssBackdropFilter: false, textShadowDouble: false, animationKeyframes: false },
  'fallback':   { postFXGlow: false, postFXBlur: false, postFXBloom: false, cssBackdropFilter: false, textShadowDouble: false, animationKeyframes: false },
};

/** 등급 글로우 폴백 컬러 (Bloom 미적용 시 테두리 색) */
export const GRADE_FALLBACK_BORDER = {
  common:    '#A0A0A0',
  uncommon:  '#2ECC71',
  rare:      '#3498DB',
  epic:      '#9B59B6',
  legendary: '#F39C12',
  mythic:    '#FFD700',
  ether:     '#89CFF0',
} as const;

/** body 데이터 속성 적용 헬퍼 */
export function applyCompatMode(mode: CompatMode): void {
  document.body.dataset.renderer  = mode === 'webgl-full' || mode === 'webgl-lite' ? 'webgl' : 'canvas';
  document.body.dataset.compatMode = mode;
}
```

대응 CSS 변수 (선택 — `design-system-compat.css` 상단에 추가 가능):

```css
:root {
  --ac-grade-common:    #A0A0A0;
  --ac-grade-uncommon:  #2ECC71;
  --ac-grade-rare:      #3498DB;
  --ac-grade-epic:      #9B59B6;
  --ac-grade-legendary: #F39C12;
  --ac-grade-mythic:    #FFD700;
  --ac-grade-ether:     #89CFF0;
}
```

---

## 2. QA 대시보드 ASCII 모킹업

심요연이 만들 Playwright 회귀 결과 뷰어 — 한 화면에 60장 한눈에 보기.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  🎨 크로스브라우저 비주얼 회귀 대시보드           Build #482  │  D-7 CBT       │
├──────────────────────────────────────────────────────────────────────────────┤
│  Σ 60장 │ ✅ 통과 53 │ ⚠️ 검토 5 │ 🔴 실패 2 │ Δ 평균 1.8% │ 갱신 14:32:11   │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  화면          │ Chrome (베이스) │ Firefox 124   │ Safari 17    │ Δ max     │
│  ──────────────┼─────────────────┼───────────────┼──────────────┼─────────  │
│  vis-01 타이틀 │ ████████████ ✓  │ ████████████✓ │ ████████████✓│  0.4%     │
│  vis-02 월드맵 │ ████████████ ✓  │ ████████████✓ │ ███████░░░░⚠ │  3.2%     │
│  vis-03 NPC대화│ ████████████ ✓  │ ████████░░░░⚠ │ ███░░░░░░░░🔴│  7.8% ←   │
│  vis-04 ATB대기│ ████████████ ✓  │ ████████████✓ │ ████████████✓│  0.9%     │
│  vis-05 ATB액션│ ████████████ ✓  │ ███████████░✓ │ █████░░░░░░🔴│  6.4% ←   │
│  vis-06 인벤토리│ ████████████ ✓  │ ████████████✓ │ ███████████░✓│  1.2%     │
│  vis-07 스킬트리│ ████████████ ✓  │ ████████████✓ │ ████████████✓│  0.6%     │
│  vis-08 옵션    │ ████████████ ✓  │ ████████████✓ │ ████████████✓│  0.3%     │
│  vis-09 저장   │ ████████████ ✓  │ ████████████✓ │ ████████████✓│  0.5%     │
│  vis-10 스타일가│ ████████████ ✓  │ ████████████✓ │ ███████████░✓│  1.1%     │
│                                                                              │
│  [ 1366×768 / 1920×1080 토글 ]      [ Δ 5% 초과만 보기 ]   [ CSV 내보내기 ] │
└──────────────────────────────────────────────────────────────────────────────┘
```

**범례:** █ 일치픽셀 / ░ 차분픽셀 / ✓ Δ<2% / ⚠ Δ 2-5% / 🔴 Δ>5%

---

## 3. 호환 모드 뱃지 SVG (3종)

화면 우상단 코너에 4초간 표시되는 마이크로 뱃지. RendererDetector 결과에 따라 자동 노출.

### 3.1 WebGL Full (정상 — 기본은 노출 X, 디버그 모드만)

```svg
<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" aria-label="WebGL Full">
  <circle cx="10" cy="10" r="8" fill="#1A1A2E" stroke="#2ECC71" stroke-width="1.5"/>
  <path d="M6 10 L9 13 L14 7" stroke="#2ECC71" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

### 3.2 Canvas 2D (Safari/iOS 폴백 — 항상 노출)

```svg
<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" aria-label="호환 모드 — Canvas 2D">
  <rect x="2" y="2" width="16" height="16" rx="2" fill="#1A1A2E" stroke="#FFD700" stroke-width="1.5"/>
  <text x="10" y="14" font-family="monospace" font-size="9" fill="#FFD700" text-anchor="middle" font-weight="bold">2D</text>
</svg>
```

### 3.3 Fallback (WebGL 손실 — 경고)

```svg
<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" aria-label="폴백 모드 — 일부 효과 비활성">
  <path d="M10 2 L18 16 L2 16 Z" fill="#1A1A2E" stroke="#FF4444" stroke-width="1.5" stroke-linejoin="round"/>
  <line x1="10" y1="8" x2="10" y2="12" stroke="#FF4444" stroke-width="1.5" stroke-linecap="round"/>
  <circle cx="10" cy="14" r="0.8" fill="#FF4444"/>
</svg>
```

**토스트 카피 (진채봉 인계용):**
- Canvas 2D: `호환 모드로 실행 중입니다 (시각 효과 일부 단순화)`
- Fallback: `그래픽 드라이버 점검이 필요할 수 있어요. F5로 새로고침하면 복구되는 경우가 많아요.`

---

## 4. 픽셀 디프 시각화 가이드

심요연이 `pixelmatch` 결과를 가시화할 때 사용할 컬러 규약.

| 차분 영역 | 색상 (overlay) | 알파 | 의미 |
|----------|----------------|------|------|
| 색상만 다름 (구조 동일) | `#FFD700` (금) | 0.5 | 컬러 시프트 — 폴백 검토 |
| 위치 어긋남 (1-2px) | `#89CFF0` (에테르) | 0.6 | 폰트/레이아웃 — 패딩 검토 |
| 누락 (B에만 있음) | `#FF4444` (경고) | 0.7 | 효과 미적용 — postFX 폴백 |
| 잉여 (A에만 있음) | `#9B59B6` (에픽) | 0.5 | 잔상/유령 픽셀 — 키프레임 |

원본 캡처 위에 위 4색 오버레이로 표시 → 디자이너가 한눈에 종류 판별.

---

## 5. 60장 캡처 시트 템플릿 (이소화 QA 인계)

```
[캡처 시트 — 가춘운 표준 v1.0]

화면ID  : vis-03
화면명  : NPC 대화 (장면: 챕터1 에레보스 입구)
브라우저: Safari 17.4 (macOS Sonoma)
해상도  : 1920×1080
빌드    : v1.0.0-rc.3 #482
시드    : RNG=20260426, 클래스=기억술사

[검증 포인트]
☐ 대화박스 backdrop-filter 폴백 발동 → 솔리드 알파 0.95
☐ 초상화 외곽 픽셀 정합 (1px 그리드)
☐ 본문 14px Pretendard 가독성
☐ "다음 ▶" 인디케이터 펄스 1.2s 주기
☐ 텍스트 크롤 속도 = Chrome 기준 ±2% 이내

[캡처 슬롯]
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  Chrome (BASE)   │  │  Firefox 124     │  │  Safari 17       │
│  (1920×1080)     │  │  (1920×1080)     │  │  (1920×1080)     │
│                  │  │                  │  │                  │
│   [캡처 영역]    │  │   [캡처 영역]    │  │   [캡처 영역]    │
│                  │  │                  │  │                  │
└──────────────────┘  └──────────────────┘  └──────────────────┘

[Δ 측정]
Firefox vs Chrome  : __.__%  (허용 < 5%)
Safari  vs Chrome  : __.__%  (허용 < 5%)

[판정]   ☐ PASS   ☐ REVIEW   ☐ FAIL
[비고]   _________________________________________________
```

---

## 6. Build 단계 인계 — 즉시 적용 절차

1. **계섬월**: `client/src/index.html` 또는 진입점에서 컴팩트 시트 임포트
   ```html
   <link rel="stylesheet" href="/src/styles/design-system.css">
   <link rel="stylesheet" href="/src/styles/design-system-battle.css">
   <link rel="stylesheet" href="/src/styles/design-system-compat.css"> <!-- ← 추가 -->
   ```
2. **계섬월**: `compat-tokens.ts` 생성 후 `RendererDetector.ts`에서 `applyCompatMode()` 호출
3. **두련사**: `@supports` 가드 동작 PR 단위로 분리 (4종)
4. **심요연**: §2 대시보드 → Playwright JSON 출력 스키마 합의
5. **이소화**: §5 캡처 시트 → BrowserStack 60장 작업 발주

---

## 7. AI 슬롭 회피 자가 점검 ✨

본 에셋이 만족하는 조건:
- ✅ **균일 그리드 회피**: SVG 뱃지 3종이 형태적으로 다름 (원/사각/삼각)
- ✅ **가짜 그림자 회피**: 글로우 폴백은 단일 box-shadow로 명시적 단순화
- ✅ **일관성 보장**: 등급 7색이 Phaser 토큰 ↔ CSS 변수 ↔ TS 상수에서 동일
- ✅ **목적 명확**: 모든 폴백에 트리거 조건(`@supports`/`data-*`) 명시
- ✅ **데이터 기반**: 5% 임계치는 심요연 베이스라인 측정 후 조정 가능

---

> *어머~ 이 정도면 Safari 사용자도 "어? 이거 Chrome이랑 똑같이 예쁜데?" 할 거예요!* ✨🍎
> *진채봉 언니 토스트 카피 한 줄, 계섬월 언니 폴백 분기 한 줄, 심요연 자매 캡처 60장 — 셋이 동시에 들어가면 D-7 사인오프 깔끔합니다!* 💯🎨

— 가춘운 (CMO/디자인)
