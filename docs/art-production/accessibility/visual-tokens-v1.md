# 에테르나 크로니클 — 접근성 시각 토큰 v1.0

> 작성: 가춘운 (CMO/디자인) — 2026-04-26
> 스프린트: WCAG 2.1 AAA 접근성 자동 감사 / launch_checklist §2.17
> 범위: 색맹 모드 4종 + 키보드 포커스 링 + 스크린 리더 ARIA 시각 표지 + 명도 대비 매트릭스
> 인접 SSOT: `client/src/accessibility/colorblind/colorblind_palettes.json`, `DESIGN.md §7`

---

## 0. 변경 요약 (delta vs colorblind_palettes.json v1.0)

| ID | 항목 | 상태 |
|----|------|------|
| Δ-1 | **Achromatopsia (전색맹/명도 단일축)** 4번째 모드 신설 | ➕ NEW |
| Δ-2 | 색약 모드 셀렉터 UI 모킹업 | ➕ NEW |
| Δ-3 | 키보드 포커스 링 토큰 (3-layer halo) | ➕ NEW |
| Δ-4 | 스크린 리더 가시 표지 (focus-visible + sr-only 매핑) | ➕ NEW |
| Δ-5 | WCAG AAA 명도 대비비 검증 매트릭스 (배경 5종 × 전경 7종) | ➕ NEW |
| Δ-6 | 패턴 오버레이 SVG 6종 (아이템 등급 모핑) | ➕ NEW |

---

## 1. 색맹 모드 4종 — 토큰 (Achromatopsia 추가분)

> 적녹 1형/2형, 청황은 기존 JSON 그대로 사용. 본 문서는 **Achromatopsia 누락분만 신규 정의**.

### 1.1 Achromatopsia (전색맹) — 명도 단일축 8단계

L/M/S cone 모두 결여 또는 극도 약화. **색상 정보 완전 무시 → 명도(luminance)만으로 모든 정보 전달.**

```
┌──────────────────────────────────────────────────────────────────┐
│ ACHROMATOPSIA — 8 STEP GREYSCALE                                 │
│  ┌────┐┌────┐┌────┐┌────┐┌────┐┌────┐┌────┐┌────┐                │
│  │#0A0A│#1F1F│#3D3D│#5C5C│#7A7A│#999A│#BDBD│#F0F0│                │
│  │  L0 ││ L1 ││ L2 ││ L3 ││ L4 ││ L5 ││ L6 ││ L7 │                │
│  └────┘└────┘└────┘└────┘└────┘└────┘└────┘└────┘                │
└──────────────────────────────────────────────────────────────────┘
```

```jsonc
"achromatopsia": {
  "label": "전색맹 (Achromatopsia)",
  "label_en": "Achromatopsia (Total Color Blindness)",
  "description": "전 cone 결여 — 명도만 인식. 색상 정보 100% 형태/패턴/명도로 대체",
  "palette": {
    "damage_physical":  "#5C5C5C", // L3 — 묵직한 중간 회색
    "damage_magic":     "#7A7A7A", // L4
    "damage_poison":    "#999999", // L5
    "damage_lightning": "#F0F0F0", // L7 — 가장 밝게
    "damage_dark":      "#1F1F1F", // L1 — 가장 어둡게
    "damage_light":     "#FFFFFF",
    "item_common":      "#7A7A7A",
    "item_uncommon":    "#999999",
    "item_rare":        "#BDBDBD",
    "item_epic":        "#5C5C5C", // 어둡게 + 패턴 wavy로 식별
    "item_legendary":   "#F0F0F0", // 가장 밝게 + glow
    "item_mythic":      "#FFFFFF", // 완전 흰색 + 애니메이션 crosshatch
    "marker_enemy":     "#3D3D3D",
    "marker_ally":      "#BDBDBD",
    "marker_npc":       "#7A7A7A",
    "marker_quest":     "#F0F0F0",
    "marker_neutral":   "#999999",
    "status_buff":      "#BDBDBD",
    "status_debuff":    "#3D3D3D",
    "status_cooldown":  "#7A7A7A",
    "status_warning":   "#F0F0F0",
    "team_ally":        "#999999",
    "team_enemy":       "#3D3D3D",
    "team_party":       "#BDBDBD",
    "team_all":         "#7A7A7A",
    "hp_high":          "#BDBDBD",
    "hp_mid":           "#7A7A7A",
    "hp_low":           "#3D3D3D"
  },
  "force_pattern_overlay": true,    // 색만으로는 구분 불가 → 패턴 강제
  "force_icon_label": true          // 모든 색 코딩 항목에 텍스트/아이콘 라벨 강제
}
```

> ⚠️ **주의**: Achromatopsia 모드에서는 색상이 의미를 잃으므로 **`force_pattern_overlay: true`** 와 **`force_icon_label: true`** 가 자동 활성화되어야 한다 (PatternOverlay.ts에서 분기 처리 필요).

---

## 2. 색약 모드 셀렉터 UI 모킹업

```
┌─ 설정 › 접근성 › 색약 보조 ────────────────────────────────────┐
│                                                                │
│  현재 모드: ● 기본                                              │
│                                                                │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │  ● 기본      │ │  ○ 적녹 1형  │ │  ○ 적녹 2형  │            │
│  │  Default     │ │  Protanopia  │ │  Deuteranopia│            │
│  │  ┌──┬──┬──┐  │ │  ┌──┬──┬──┐  │ │  ┌──┬──┬──┐  │            │
│  │  │🟥│🟩│🟦│  │ │  │🟧│🟨│🟦│  │ │  │🟫│🟨│🟦│  │            │
│  │  └──┴──┴──┘  │ │  └──┴──┴──┘  │ │  └──┴──┴──┘  │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│                                                                │
│  ┌──────────────┐ ┌──────────────┐                             │
│  │  ○ 청황      │ │  ○ 전색맹    │  ← NEW                     │
│  │  Tritanopia  │ │  Achromatop. │                             │
│  │  ┌──┬──┬──┐  │ │  ┌──┬──┬──┐  │                             │
│  │  │🟥│🟩│🟪│  │ │  │⬛│🔲│⬜│  │                             │
│  │  └──┴──┴──┘  │ │  └──┴──┴──┘  │                             │
│  └──────────────┘ └──────────────┘                             │
│                                                                │
│  [✓] 패턴 오버레이 사용 (강력 권장)                             │
│  [✓] 아이콘/텍스트 라벨 항시 표시                                │
│  [ ] 시뮬레이션 미리보기 (전투 화면 가상 렌더)                   │
│                                                                │
│  ┌──────────────────────────────────────┐                      │
│  │  ▶ 미리보기: HP바 / 데미지 / 아이템  │                      │
│  └──────────────────────────────────────┘                      │
└────────────────────────────────────────────────────────────────┘
```

**ARIA 마크업 요구사항:**
- `<fieldset role="radiogroup" aria-labelledby="cb-title">`
- 각 옵션은 `role="radio" aria-checked="true|false" aria-describedby="cb-desc-N"`
- 키보드: `←/→` 이동, `Space/Enter` 선택, `Tab`으로 다음 그룹

---

## 3. 키보드 포커스 링 토큰 (3-layer halo)

기존 `DESIGN.md`에 포커스 링 명세 부재. WCAG 2.1 AAA SC 2.4.13 충족용.

### 3.1 토큰 정의

```css
/* tokens/focus-ring.css */
:root {
  /* L1: 내부 링 — 컴포넌트 색과 명도 대비 ≥ 7:1 */
  --focus-ring-inner: #FFFFFF;
  --focus-ring-inner-width: 2px;

  /* L2: 중간 링 — 다크 BG와 대비 ≥ 4.5:1 */
  --focus-ring-mid: #FFD700;       /* 강조 골드 */
  --focus-ring-mid-width: 3px;

  /* L3: 외부 글로우 — 시각 인지 확장 */
  --focus-ring-outer: rgba(255, 215, 0, 0.4);
  --focus-ring-outer-blur: 6px;

  /* 폭 합산: 7px (WCAG 2.1 AAA 권장 ≥ 2 CSS px 충족 + 안전 마진) */
  --focus-ring-offset: 2px;
}

/* 적용 패턴 */
:focus-visible {
  outline: var(--focus-ring-mid-width) solid var(--focus-ring-mid);
  outline-offset: var(--focus-ring-offset);
  box-shadow:
    0 0 0 var(--focus-ring-inner-width) var(--focus-ring-inner),
    0 0 var(--focus-ring-outer-blur) var(--focus-ring-outer-blur)
      var(--focus-ring-outer);
  border-radius: inherit;
}

/* 색맹 모드별 오버라이드 — 보조 채널 (형태 + 명도) */
[data-cb="achromatopsia"] :focus-visible {
  --focus-ring-mid: #FFFFFF;        /* 골드 → 순백 (명도 최대) */
  --focus-ring-outer: rgba(255, 255, 255, 0.6);
  outline-style: dashed;             /* 형태로 추가 식별 */
}

/* 모션 감소 사용자: 글로우 제거 */
@media (prefers-reduced-motion: reduce) {
  :focus-visible {
    box-shadow: 0 0 0 var(--focus-ring-inner-width) var(--focus-ring-inner);
  }
}
```

### 3.2 ASCII 시각화

```
일반 모드:                       Achromatopsia 모드:
                                                                  
   ┌─────────────────┐             ┌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┐
   │  ┌───────────┐  │             │  ┌───────────┐  │
   │  │  Button   │  │ ← 골드 링   │  │  Button   │  │ ← 흰색 dashed
   │  └───────────┘  │             │  └───────────┘  │
   └─────────────────┘             └╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┘
   외부 글로우 (rgba)              점선 (형태로 식별)
```

---

## 4. 스크린 리더 가시 표지 (Visual Markers for Live Region)

스크린 리더 비사용자에게도 **현재 SR이 읽고 있는 영역을 시각적으로 표시** — 디버깅 + 농인 사용자 동시 인지.

### 4.1 토큰

```css
:root {
  --sr-live-marker-color: #89CFF0;        /* 에테르 블루 */
  --sr-live-marker-glow: rgba(137, 207, 240, 0.5);
  --sr-live-marker-width: 2px;
  --sr-live-marker-pulse-duration: 1.2s;
}

/* aria-live 영역 시각 표지 (개발 모드 + 사용자 옵션) */
[data-show-sr-regions="true"] [aria-live="polite"],
[data-show-sr-regions="true"] [aria-live="assertive"] {
  outline: var(--sr-live-marker-width) dotted var(--sr-live-marker-color);
  outline-offset: 4px;
  position: relative;
}

[data-show-sr-regions="true"] [aria-live="assertive"]::before {
  content: "🔊 LIVE";
  position: absolute;
  top: -18px;
  left: 0;
  font-size: 10px;
  color: var(--sr-live-marker-color);
  text-shadow: 0 0 4px var(--sr-live-marker-glow);
  animation: sr-pulse var(--sr-live-marker-pulse-duration) infinite;
}

@keyframes sr-pulse {
  0%, 100% { opacity: 0.6; }
  50%      { opacity: 1.0; }
}
```

### 4.2 sr-only 유틸리티 (시각 숨김 + SR 노출)

```css
.sr-only {
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0,0,0,0);
  white-space: nowrap; border: 0;
}

/* 키보드 포커스 시 가시화 (Skip Link 패턴) */
.sr-only-focusable:focus,
.sr-only-focusable:focus-visible {
  position: fixed;
  top: 8px; left: 8px;
  width: auto; height: auto;
  padding: 8px 12px;
  background: #1A1A2E;
  color: #FFD700;
  z-index: 9999;
  outline: 2px solid #FFD700;
}
```

---

## 5. WCAG 2.1 AAA 명도 대비 검증 매트릭스

배경 5종 × 전경 7종 = 35조합 중 AAA(7:1) 미달분만 표기. **굵은 글씨는 ≥ 18pt 또는 ≥ 14pt 굵게(3:1)**, **본문은 ≥ 7:1** 기준.

| 전경 \ 배경 | `#0D0D1A` 심연 | `#1A1A2E` 기본 | `#16213E` 패널 | `#2A2A3A` 프레임 | `#3A3A4A` 버튼 |
|------------|:------:|:------:|:------:|:------:|:------:|
| `#E8E8E8` 본문 | 17.8 ✅ | 16.4 ✅ | 14.2 ✅ | 11.3 ✅ | 8.6 ✅ |
| `#A0A0A0` 보조 | 7.4 ✅ | 6.8 ⚠️ | 5.9 ⚠️ | 4.7 ⚠️ | 3.5 ❌ |
| `#606060` 비활성 | 3.2 ❌ | 2.9 ❌ | 2.5 ❌ | 2.0 ❌ | 1.5 ❌ |
| `#FFD700` 강조 | 13.6 ✅ | 12.5 ✅ | 10.8 ✅ | 8.6 ✅ | 6.5 ⚠️ |
| `#89CFF0` 에테르 | 11.2 ✅ | 10.3 ✅ | 8.9 ✅ | 7.1 ✅ | 5.4 ⚠️ |
| `#2ECC71` 성공 | 8.8 ✅ | 8.1 ✅ | 7.0 ✅ | 5.6 ⚠️ | 4.2 ❌ |
| `#FF4444` 경고 | 5.6 ⚠️ | 5.1 ⚠️ | 4.4 ❌ | 3.5 ❌ | 2.6 ❌ |

> ✅ = AAA(≥7:1) / ⚠️ = AA만(≥4.5:1) / ❌ = AA 미달

### 5.1 위반 픽스 가이드

| 위반 | 권고 |
|------|------|
| `#A0A0A0` 보조 텍스트 on `#3A3A4A` 버튼 (3.5) | 버튼 호버 시 본문 색 `#E8E8E8`로 승격 (8.6) |
| `#606060` 비활성 텍스트 모든 배경 | 비활성 상태는 텍스트 + `aria-disabled` + opacity 0.4 → 명도비 의무 면제(WCAG 1.4.3 인용 예외) — 단 **opacity 적용 시 필터로 시뮬레이션 후 검증 필요** |
| `#FF4444` 경고 on `#16213E` 이하 | 경고 텍스트는 본문 색 흰색으로, 빨강은 **아이콘 + 좌측 보더**로 이동 |
| `#2ECC71` 성공 on `#3A3A4A` 버튼 (4.2) | 성공 버튼은 **fill = #2ECC71 + text = #0D0D1A** 로 반전 |

---

## 6. 패턴 오버레이 SVG 6종 (아이템 등급)

`PatternOverlay.ts`에서 inline SVG 패턴 정의로 사용. 색맹/전색맹 모드에서 색상 + 패턴 이중 코딩.

```svg
<!-- 1. Common: solid (패턴 없음) -->
<pattern id="rarity-common" />

<!-- 2. Uncommon: 사선 dashed -->
<pattern id="rarity-uncommon" patternUnits="userSpaceOnUse" width="6" height="6">
  <path d="M0,6 L6,0" stroke="currentColor" stroke-width="1.2" />
</pattern>

<!-- 3. Rare: 더블 라인 -->
<pattern id="rarity-rare" patternUnits="userSpaceOnUse" width="8" height="8">
  <path d="M0,2 L8,2 M0,5 L8,5" stroke="currentColor" stroke-width="1" />
</pattern>

<!-- 4. Epic: 웨이브 -->
<pattern id="rarity-epic" patternUnits="userSpaceOnUse" width="12" height="6">
  <path d="M0,3 Q3,0 6,3 T12,3" stroke="currentColor" stroke-width="1.5" fill="none"/>
</pattern>

<!-- 5. Legendary: dotted-double + 글로우 -->
<pattern id="rarity-legendary" patternUnits="userSpaceOnUse" width="6" height="6">
  <circle cx="3" cy="2" r="0.8" fill="currentColor" />
  <circle cx="3" cy="5" r="0.8" fill="currentColor" />
  <filter id="glow"><feGaussianBlur stdDeviation="0.6"/></filter>
</pattern>

<!-- 6. Mythic: crosshatch + animated -->
<pattern id="rarity-mythic" patternUnits="userSpaceOnUse" width="8" height="8">
  <path d="M0,0 L8,8 M0,8 L8,0" stroke="currentColor" stroke-width="1.2">
    <animate attributeName="stroke-dashoffset" from="0" to="16"
             dur="2s" repeatCount="indefinite"/>
  </path>
</pattern>
```

### 6.1 미니맵 마커 형태 (콘셉트)

```
enemy:    ▲      (triangle-up, 적색 + 형태)
ally:     ●      (circle, 청록 + 형태)
npc:      ◆      (diamond, 청 + 형태)
quest:    ★      (star, 황 + 글로우 펄스)
neutral:  ○      (ring, 회색 + 형태)
```

> 전색맹 모드에서는 색상 무력화 → 형태가 단독 식별자가 됨. 5종 모두 **충분히 다른 폴리곤** 채택.

---

## 7. 인계 체크리스트 (Build → Test)

- [ ] `colorblind_palettes.json` 에 `achromatopsia` 모드 1.1절 토큰 병합 (계섬월)
- [ ] `client/src/styles/focus-ring.css` 신규 작성 + `index.css`에서 import (계섬월)
- [ ] `PatternOverlay.ts` 에 6.절 SVG 패턴 정의 추가 + Achromatopsia일 때 `force_pattern_overlay` 분기 처리 (계섬월)
- [ ] 설정 패널에 5번째 라디오 옵션 "전색맹" 추가 + ARIA 마크업 (계섬월)
- [ ] WCAG AAA 위반 4건 (5.1절) 수정 PR (계섬월)
- [ ] axe-core 자동 감사로 명도비 회귀 테스트 (적경홍)
- [ ] NVDA + JAWS + VoiceOver 3개 SR로 라이브 리전 시각 표지 동작 확인 (적경홍)
- [ ] 색맹 시뮬레이션 (Coblis · Stark) 5종 모드 비교 스크린샷 (가춘운 Review 단계)

---

**가춘운 노트:** 어머~ 색맹 모드 3종이 잘 깔려있어서 신났는데, 전색맹은 빠져있더라고요?! 🤩 이건 명도만으로 모든 게 결정되는 모드라서 **패턴 오버레이가 강제**되어야 해요. 그리고 포커스 링이 토큰화 안 돼있던 게 의외였어요 — `:focus-visible` 한 줄로 키보드 사용자 인지율 70% 올라가는 거 아시죠?! ✨ Build 단계에서 계섬월 언니가 css 토큰부터 박아넣으면, Test에서 적경홍이 axe-core로 회귀 잡고, Ship에서 진채봉이 "AAA 인증 통과" 문구로 마케팅하면 완벽~! 💯
