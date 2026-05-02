# 시각 에셋 묶음 — 모바일 반응형 적응 v1.0

> 작성: 가춘운 (CMO/디자인)
> 작성일: 2026-04-29
> 스코프: 모바일 viewport 4종(360/375/414/430) ASCII 모킹업 + SVG 아이콘 + 컬러 토큰 코드 + 임베드 스니펫
> 1차 SSOT: `docs/release/design-system_mobile-responsive.md`
> 본 문서는 **시각 자원의 코드/명세 표현** — 실제 PNG/SVG 산출은 Build 단계 계섬월 인계.

---

## §1. 컬러 팔레트 — 모바일 전용 토큰 (TS 미러용)

```ts
// client/src/config/design-tokens.mobile.ts (신설 제안)
export const MOBILE_TOKENS = {
  viewport: {
    MOB_360: { width: 360, height: 800, alias: 'galaxy-a-base' },
    MOB_375: { width: 375, height: 812, alias: 'iphone-mini' },
    MOB_414: { width: 414, height: 896, alias: 'iphone-plus' },
    MOB_430: { width: 430, height: 932, alias: 'iphone-pro-max' },
  },

  // 터치 타깃 (px)
  touch: {
    critical: 48, // 전투 액션, 세이브 확정
    primary:  44, // 메뉴, 대화 NEXT
    secondary: 40,
    inline:    32,
    minGap:     8,
  },

  // 제스처 임계값
  gesture: {
    tapMaxDurationMs: 200,
    tapMaxMoveTolPx:    8,
    longPressMinMs:   500,
    panMinMovePx:       8,
    pinchMinScaleDelta: 0.05,
    inputLagBudgetMs: 100, // 약속 SLO
  },

  // 폰트 (모바일 최소 14px 비협상)
  font: {
    body:       14,
    dialog:     16,
    label:      12, // 보조 라벨만
    h1:         24,
    h2:         20,
    hud_number: 18,
  },

  // 포커스 링 (3px — 손가락 보정)
  focus: {
    ringWidthPx: 3,
    ringColor:  '#00FF00',
  },

  // 모바일 다크 강제
  forceDarkOnMobile: true,
} as const;
```

---

## §2. ASCII 모킹업 — 4 viewport × 4 시나리오 매트릭스

### 2.1 이동(월드맵) — MOB_360

```
┌──[44px safe-top + HUD]──┐
│ ❤ 320/450  💎 80/120    │  ← HP/MP 144×40
│                  ┌────┐ │
│                  │mini│ │  ← 미니맵 80×80
│                  │ 🗺 │ │
│                  └────┘ │
│                         │
│      [ player @  ]      │  ← Phaser 캔버스 (FIT)
│                         │
│                         │
│  (1손가락 pan = 이동)    │
│                         │
├──[하단 핫바 영역]────────┤
│   ⚔   🛡   ✨   ☰      │  ← 48×48 ×4 + 메뉴
│  공격 방어 스킬 메뉴     │
└──[34px safe-bottom]─────┘
```

### 2.2 대화 — MOB_375

```
┌──[44px notch]───────────┐
│                         │
│     [scene render]      │
│                         │
│                         │
├─────────────────────────┤  ← 대화 시트 (시트업)
│ [👤48] 진채봉              │
│                         │
│ "이 글이 14px이면        │
│  눈에 잘 보이는구려.       │
│  서두르지 마시오."        │
│                         │
│ [ ▶  NEXT  탭하시오 ]   │  ← 48px 행
└──[34px home indicator]──┘
```

### 2.3 전투(ATB) — MOB_414

```
┌──[44px safe-top]────────┐
│ ⚔ HP 320/450  💎 80/120 │
│                         │
│       [👹 boss ]        │  ← 적 sprite
│                         │
│                         │
│  [party 1] [party 2]    │
│  [party 3] [party 4]    │
│                         │
│  ATB ▮▮▮▮▮▮▮▮░░ 80%    │  ← 진행 게이지
├─────────────────────────┤
│  ⚔   🛡   ✨   📦      │  ← 4슬롯 (각 48×48)
│ 공격 방어 스킬 아이템      │
└──[34px safe-bottom]─────┘

(스킬 ✨ 탭 → 슬라이드업 2열 그리드)
┌─────────────────────────┐
│  ✨ 스킬 선택            │
│ ┌────┬────┐              │
│ │ ❄1 │ 🔥2 │              │  ← 48×48 그리드
│ ├────┼────┤              │
│ │ ⚡3 │ 🌙4 │              │
│ └────┴────┘              │
│   [ 닫기 ]               │
└─────────────────────────┘
```

### 2.4 세이브 — MOB_430

```
┌──[59px Dynamic Island]──┐
│  💾 세이브 / 로드        │
│ ─────────────────────── │
│ ┌─────────────────────┐ │
│ │ 슬롯 1  Ch.4 망각고원 │ │  ← 행 64px
│ │ Lv.42  플레이 12:34  │ │     (CRITICAL 48 + 패딩)
│ │ 2026-04-28 14:30    │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ 슬롯 2  Ch.3 솔라리스│ │
│ │ Lv.28  플레이 06:12  │ │
│ │ 2026-04-25 22:11    │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ + 새 슬롯            │ │
│ └─────────────────────┘ │
│                         │
│ [세이브] [로드] [취소]   │  ← 각 48px
└──[34px safe-bottom]─────┘
```

---

## §3. 아이콘 세트 — 모바일 핫바 SVG 명세

| 아이콘 | 의미 | viewBox | stroke-width | 색상 |
|---|---|---|---|---|
| ⚔ | 공격 | `0 0 24 24` | 2 | `#FFD700` (gold) |
| 🛡 | 방어 | `0 0 24 24` | 2 | `#4FC3F7` (cyan) |
| ✨ | 스킬 | `0 0 24 24` | 2 | `#FF6680` (magenta) |
| 📦 | 아이템 | `0 0 24 24` | 2 | `#A5D6A7` (green) |
| ☰ | 메뉴 | `0 0 24 24` | 2 | `#FFFFFF` |

**SVG 템플릿** (모든 아이콘 공통 스켈레톤):

```svg
<svg width="48" height="48" viewBox="0 0 24 24"
     role="img" aria-label="공격" focusable="false">
  <!-- 48×48 컨테이너 + 24×24 그래픽 = 12px 패딩 (터치 hit-zone 보장) -->
  <rect x="0" y="0" width="24" height="24" fill="transparent"/>
  <!-- icon path here -->
  <path d="..." stroke="#FFD700" stroke-width="2" fill="none"
        stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

**규칙**:
- `aria-label` 한국어 필수 (스크린리더 호환)
- `focusable="false"` — 키보드는 부모 button이 받음
- 컨테이너 48×48 안에 24×24 그래픽 = **12px 패딩으로 터치 hit-zone 확보**

---

## §4. CSS 임베드 스니펫 — 미디어 쿼리 SSOT

```css
/* client/src/styles/design-system-mobile.css (신설 제안) */

/* 4종 viewport 매트릭스 */
@media (max-width: 430px) and (min-width: 415px) { /* MOB_430 */
  .hud-skill-grid { gap: 14px; }
}
@media (max-width: 414px) and (min-width: 376px) { /* MOB_414 */
  .hud-skill-grid { gap: 12px; }
}
@media (max-width: 375px) and (min-width: 361px) { /* MOB_375 */
  .hud-skill-grid { gap: 10px; }
}
@media (max-width: 360px) { /* MOB_360 (좁음 — 가장 빡빡) */
  .hud-skill-grid { gap: 8px; }
  .dialog-portrait { width: 40px; height: 40px; } /* 48 → 40 축소 허용 */
}

/* 모바일 공통 */
@media (max-width: 430px) {
  :root {
    --font-body: 14px;
    --font-dialog: 16px;
    --touch-target-min: 44px;
  }

  .hotbar {
    padding-bottom: max(12px, env(safe-area-inset-bottom));
    padding-left:   max(12px, env(safe-area-inset-left));
    padding-right:  max(12px, env(safe-area-inset-right));
  }

  /* hover 의존 UI 제거 — focus-visible 폴백 */
  .menu-item:hover { background: transparent; }
  .menu-item:focus-visible { outline: 3px solid #00FF00; }
}

/* 가로 회전 안내 (옵션 — 진채봉 카피) */
@media (max-width: 430px) and (orientation: landscape) {
  .orientation-hint { display: flex; } /* "세로 모드를 권장합니다" */
}
```

---

## §5. 임베드 디자인 — Discord 미리보기 카드 (런칭 캠페인용)

```
[Discord Embed — 모바일 출시 발표 시안]
┌──────────────────────────────────────┐
│ ⚔️ 에테르나 크로니클 — 모바일 대응 ✨ │
│                                      │
│ 기억은 사라져도, 손가락은 남는다.        │
│                                      │
│ 📱 4종 viewport 완전 대응 (360~430)   │
│ 👆 터치 인식 ≤ 100ms                  │
│ 🌑 OLED 절전 다크모드                 │
│ 🔍 본문 14px+ — 햇빛에서도 읽힌다      │
│                                      │
│ [thumbnail: ASCII 핫바 모킹업]        │
│                                      │
│ 🎮 지금 즉시 플레이 →                 │
└──────────────────────────────────────┘
Color: #FFD700 (left bar)
```

**색상 코드 (Discord embed `color` 정수)**: `#FFD700` → `16766720`

---

## §6. 알림(토스트) 디자인 명세 — 모바일

| 상태 | 배경 | 텍스트 | 위치 | 폭 |
|---|---|---|---|---|
| INFO | `#1A1A2E` + alpha .92 | `#FFFFFF` 14px | 상단 + safe-top + 12px | width - 32px |
| SUCCESS | `#2E7D32` | `#FFFFFF` 14px | 상단 | width - 32px |
| WARN | `#F9A825` | `#1A1A2E` 14px | 상단 | width - 32px |
| ERROR | `#7E1F2C` | `#FFFFFF` 14px | 상단 | width - 32px |

**자동 사라짐**: INFO/SUCCESS 3s, WARN 5s, ERROR 수동 닫기 (× 버튼 48×48).

---

## §7. 봉인 항목 (이소화 비협상)

1. 4종 viewport 별칭 (`MOB_360/375/414/430`) — 추가/제거 시 백능파 승인
2. 터치 타깃 CRITICAL 48 / PRIMARY 44 — WCAG AAA 미러
3. 본문 폰트 ≥ 14px — 라벨(12px) 외 비협상
4. ASCII 모킹업 4 시나리오 (이동/대화/전투/세이브) — Test 단계 비교 기준
5. 핫바 4슬롯 색상 매핑 (⚔gold/🛡cyan/✨magenta/📦green/☰white)

---

## §8. 다음 단계 인계

- **두련사 (Plan)**: `client/src/config/design-tokens.mobile.ts` 신설 (§1 코드 그대로 미러)
- **계섬월 (Build)**: `TouchAdapter.ts` + 핫바 React/Phaser 컴포넌트 (§3 SVG 4종 + §4 CSS)
- **정경패 (Review)**: 4 viewport 시각 회귀 — `client/public/style-guide-mobile.html` 신설 권장
- **적경홍 (Test)**: §2 ASCII 모킹업 4×4 매트릭스 = 16건 시나리오 검증
- **진채봉 (Ship)**: §5 Discord embed + §6 토스트 카피 한국어 본문
- **심요연 (Reflect)**: 약속 SLO(지연 100ms / 폰트 14px / 동작률 100%) 실측 → 다음 스프린트 보정

---

## §9. 산출 요약

| 산출물 | LOC | 상태 |
|---|---|---|
| `docs/release/design-system_mobile-responsive.md` | ~210 | ✅ 본 스프린트 |
| `docs/release/assets_mobile-responsive.md` (본 문서) | ~270 | ✅ 본 스프린트 |
| `client/src/config/design-tokens.mobile.ts` (코드 미러) | ~50 (제안) | ⏳ Build (계섬월) |
| `client/src/styles/design-system-mobile.css` | ~80 (제안) | ⏳ Build |
| `client/public/style-guide-mobile.html` 시각 회귀 | ~120 (제안) | ⏳ Review |

**합계 (본 단계 에셋)**: ~480줄 텍스트 SSOT — Build 단계로 흘려보냅니다 🎨📱
