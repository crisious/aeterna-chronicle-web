# 디자인 시스템 합본 — 모바일 반응형 적응 v1.0

> 작성: 가춘운 (CMO/디자인)
> 작성일: 2026-04-29
> 스코프: Phaser.js 기반 데스크탑(1920×1080) → 모바일(360~430) 반응형 변형
> SSOT 위계: 본 문서는 `/DESIGN.md §8 반응형 브레이크포인트`의 **확장 합본**.
> 변경 절차: DESIGN.md §8 → 본 문서 → `client/src/config/design-tokens.ts` mobile 토큰 → `client/src/styles/design-system-mobile.css`

---

## 0. 한눈 약속 4지표 (모바일 핵심 시나리오 게이트)

| 약속 | 목표 | 측정 |
|---|---|---|
| **4종 viewport 핵심 시나리오 동작률** | 100% | 360/375/414/430 × 4시나리오(이동/대화/전투/세이브) = 16건 PASS |
| **터치 인식 지연** | ≤ 100ms | `pointerdown` → `gameAction` emit 평균 |
| **최소 폰트 크기** | ≥ 14px (본문), ≥ 12px (보조) | 라이브 DOM/Phaser Text scan |
| **Safe-area 침범 0건** | 0 | 노치/홈 인디케이터 영역 hit-test PASS |

> 이 4지표는 `launch_checklist §2.23` 신설 SSOT와 1:1 미러. 임의 갱신 금지 — 백능파(Strategy) 승인 필수.

---

## 1. 모바일 viewport 4종 SSOT

| 별칭 | 너비 | 높이(논리) | 픽셀비 | 대표 기기 | safe-top | safe-bottom |
|---|---|---|---|---|---|---|
| **MOB_360** | 360 | 800 | 2.5x~3x | Galaxy A 시리즈 보급기 | 24px | 16px |
| **MOB_375** | 375 | 812 | 3x | iPhone SE/13 mini | 44px (notch) | 34px (home indicator) |
| **MOB_414** | 414 | 896 | 2x~3x | iPhone XR/11 Plus | 44px (notch) | 34px |
| **MOB_430** | 430 | 932 | 3x | iPhone 15 Pro Max | 59px (Dynamic Island) | 34px |

**Phaser Scale 모드**: `Phaser.Scale.FIT` + `autoCenter: CENTER_BOTH`
**기준 캔버스**: 논리 1920×1080 → 모바일에서 `min(width/1920, height/1080)`로 자동 축소.

---

## 2. Safe-Area 토큰 (CSS env() 미러)

```css
:root {
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-right: env(safe-area-inset-right, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
  --safe-left: env(safe-area-inset-left, 0px);

  /* HUD 마진 — 노치 회피 */
  --hud-pad-top: max(8px, var(--safe-top));
  --hud-pad-bottom: max(12px, var(--safe-bottom));
  --hud-pad-x: max(12px, var(--safe-left), var(--safe-right));
}

/* viewport-fit=cover 필수 (index.html meta) */
@viewport { viewport-fit: cover; }
```

**Phaser 미러** (`design-tokens.ts` mobile 절):
```ts
export const MOBILE_SAFE_AREA = {
  top: () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-top')) || 0,
  bottom: () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-bottom')) || 0,
} as const;
```

---

## 3. 터치 타깃 토큰

| 등급 | 최소 크기 | 용도 | 예시 |
|---|---|---|---|
| **CRITICAL** | 48×48 px | 전투 액션, 세이브 확정 | 공격/방어/스킬, 세이브 슬롯 |
| **PRIMARY** | 44×44 px | 메뉴 진입, 대화 진행 | 메뉴 버튼, 대화 NEXT, 선택지 |
| **SECONDARY** | 40×40 px | 보조 토글, HUD 미니맵 | 사운드 토글, 미니맵 확대 |
| **INLINE** | 32×32 px (간격 8px+) | 인벤토리 아이콘 | 슬롯 그리드 |

**간격 룰**: 인접 터치 타깃 사이 최소 **8px** gap. 그리드형은 `gap: 12px` 권장.

---

## 4. 터치 제스처 매핑 SSOT

| 데스크탑 동작 | 모바일 제스처 | 임계값 | 코드 위치 (계섬월 인계) |
|---|---|---|---|
| Left Click | **Tap** | < 200ms, < 8px 이동 | `client/src/input/TouchAdapter.ts::onTap` |
| Right Click | **Long-press** | ≥ 500ms, < 8px 이동 | `::onLongPress` (메뉴 호출) |
| Drag | **Pan** (1손가락) | ≥ 8px 이동 후 시작 | `::onPan` (이동 입력) |
| Mouse Wheel | **Pinch** (2손가락) | scale Δ ≥ 0.05 | `::onPinch` (미니맵 줌) |
| Hover | **(없음)** | — | hover 의존 UI는 `:focus-visible` 폴백 |

**지연 약속**: `pointerdown` → `gameInputBus.emit('action', ...)` 평균 ≤ 100ms (적경홍 Test 단계 측정).

---

## 5. 타이포 모바일 변형

| 토큰 | 데스크탑 | 모바일 | line-height |
|---|---|---|---|
| `font.body` | 16px | **14px** (최소) | 1.5 |
| `font.dialog` | 18px | **16px** | 1.6 (대화창 가독성 우선) |
| `font.label` | 14px | **12px** (보조 라벨만) | 1.4 |
| `font.h1` | 32px | 24px | 1.2 |
| `font.h2` | 24px | 20px | 1.3 |
| `font.hud_number` | 20px (숫자 강조) | 18px | 1.0 |

**규칙**: 모바일에서 14px 미만은 `font.label`(보조)에만 허용. 본문/대화/CTA는 14px 이상 비협상.

---

## 6. HUD 모바일 변형 — 영역 SSOT

| 영역 | 데스크탑 위치 | 모바일 위치 | 크기 | 특이사항 |
|---|---|---|---|---|
| **HP/MP 게이지** | 좌상단 280×60 | 좌상단 + safe-top | 144×40 | 가로 절반, 숫자 우측 정렬 |
| **미니맵** | 우상단 200×200 | 우상단 + safe-top | 80×80 (탭 시 확대) | 기본 축소, 핀치 줌 |
| **액션 핫바** | 하단 중앙 6슬롯 | 하단 중앙 + safe-bottom | 4슬롯 (각 48×48) | ATB 전투 시 6슬롯 펼침 |
| **메뉴 버튼** | 우상단 모서리 | 우하단 (엄지 도달) | 48×48 | safe-area 회피 |
| **대화창** | 하단 800×200 | 하단 width-32 × 200 | 풀너비-16px 마진 | 한 손 조작 고려 |

---

## 7. 전투 UI 모바일 변형 (ATB)

```
[ MOB_375 — 전투 화면 레이아웃 ]
┌─────────────────────────────┐  ← safe-top (44px)
│ ⚔ HP 320/450  💎 MP 80/120 │
│           [enemy sprite]     │
│                              │
│       [party sprites]        │
│                              │
│  ATB ▮▮▮▮▮▮▮▮░░ 80%       │
├─────────────────────────────┤  ← 핫바 영역
│  ⚔  🛡  ✨  📦              │  ← 4슬롯 (각 48×48)
│ 공격 방어 스킬 아이템          │
└─────────────────────────────┘  ← safe-bottom (34px)
```

**스킬 펼침**: 스킬(✨) 탭 → 슬라이드업 시트로 전체 스킬 그리드(2열) 노출.

---

## 8. 메뉴/대화 모바일 변형

```
[ MOB_360 — 대화창 ]
┌──────────────────────────┐
│         [scene]          │
│                          │
├──────────────────────────┤  ← 하단 시트
│ [👤48] 진채봉              │
│                          │
│ "허허, 모바일에서도        │
│  잘 보이는구려..."         │
│                          │
│ ▶ NEXT (탭)              │
└──────────────────────────┘
   ↑ 16px 마진, 풀너비
```

**선택지**: 1열 스택, 각 선택지 행 **48px high**, 행간 8px gap.

---

## 9. 컬러 & 색상 — 모바일 특이사항

| 토큰 | 값 | 모바일 보정 |
|---|---|---|
| `bg.primary` | `#1A1A2E` | 그대로 (OLED 절전) |
| `text.primary` | `#FFFFFF` | 7:1 명도 비 유지 (햇빛 가독성) |
| `accent.gold` | `#FFD700` | 그대로 |
| `focus.ring` | `#00FF00` | 모바일에서 **3px** (데스크탑 2px) — 두꺼운 손가락 보정 |
| `error.bg` | `#7E1F2C` | 그대로 |

**다크모드 강제**: 모바일은 항상 다크 (배터리/일관성). 라이트 토글 미제공.

---

## 10. 봉인 (이소화 비협상)

다음 4항은 본 스프린트 범위에서 절대 변경 금지:

1. **약속 4지표 수치** (§0) — 동작률 100%, 지연 ≤100ms, 최소 14px, safe-area 침범 0건
2. **터치 타깃 CRITICAL 48×48 / PRIMARY 44×44** (§3) — WCAG AAA 미러
3. **viewport 4종 (360/375/414/430)** (§1) — 추가/제거는 백능파 승인
4. **safe-area CSS env() 우선 사용** (§2) — JS 폴백은 보조

---

## 11. 5인 인계 체크

- [ ] 두련사: `client/src/config/design-tokens.ts` mobile 절 추가 (§2 safe-area, §3 touch target)
- [ ] 계섬월: `TouchAdapter.ts` 4 제스처 (§4) + 핫바 4슬롯 컴포넌트 (§7)
- [x] 정경패: `styles/design-system-mobile.css` (§2 env() 미러) + 폰트 클램프 (§5) — **2026-04-29 가춘운 Build 인계, 정경패 Review 인계** ✅
- [ ] 적경홍: 4 viewport × 4 시나리오 = 16건 매트릭스 시나리오 작성
- [ ] 진채봉: 모바일 사용자 가이드 + 에러 카피 (가로 회전 안내 등)

---

## 12. Build 단계 산출물 (2026-04-29 — 가춘운 CMO)

assets 단계 stub(`mobile-viewport.ts` shape only)을 **실제 CSS/스타일 가이드로 구현 완료**.

### 12.1 산출물 3건

| 파일 | LOC | 역할 | SSOT 위계 |
|------|-----|------|-----------|
| `client/src/styles/design-system-mobile.css` | ~370 | 4종 viewport 미디어쿼리 + safe area + 터치 매핑 + HUD/메뉴/전투/대화 변형 | 4차 (CSS 미러) |
| `DESIGN.md §8.4 모바일 viewport 4종 SSOT` | ~50 | 너비/safe area/폰트 스케일/HUD 변형/터치 임계 표 | 1차 (정본) |
| `docs/release/design-system_mobile-responsive.md` (본 문서 §12 추가) | +25 | Build 단계 인계 기록 | 2차 (해설본) |

### 12.2 CSS 구조 (10개 절)

1. 모바일 디자인 토큰 — `:root` 4종 viewport + 폰트 스케일 + safe area + 터치 임계
2. 모바일 진입 게이트 — `@media (max-width: 430px), (pointer: coarse)`
3. Viewport-specific 분기 — sm-360 / sm-375 / md-414 / md-430 4분기
4. HUD 모바일 변형 — `.hud-top` / `.hud-bottom` safe area 회피
5. 메뉴 모바일 변형 — 풀스크린 오버레이 + 48px 터치 타깃
6. 전투 UI 모바일 변형 — ATB 우하단 스택 + 스킬 패널 가로 스크롤
7. 대화창 모바일 변형 — 16px padding + 14px 본문 + 1열 선택지 (md-430만 2열)
8. 터치 입력 매핑 SSOT — `.touch-tappable` / `.touch-draggable` / `.touch-longpressable`
9. 가로/세로 회전 분기 — 가로 모드 dialogue 120px 축소
10. 접근성 — `prefers-reduced-motion: reduce` 우선

### 12.3 mobile-viewport.ts ↔ CSS 1:1 매핑 검증

| TS 상수 | CSS 변수 | 값 | ✓ |
|---------|----------|-----|---|
| `MOBILE_VIEWPORTS['sm-360'].widthPx` | `--vp-sm-360` | 360 | ✅ |
| `MOBILE_VIEWPORTS['sm-375'].widthPx` | `--vp-sm-375` | 375 | ✅ |
| `MOBILE_VIEWPORTS['md-414'].widthPx` | `--vp-md-414` | 414 | ✅ |
| `MOBILE_VIEWPORTS['md-430'].widthPx` | `--vp-md-430` | 430 | ✅ |
| 4 viewport `.fontScale` | `--font-scale-{id}` | 0.78/0.82/0.88/0.92 | ✅ |
| `MIN_LEGIBLE_FONT_PX` | `--font-min-legible` | 14px | ✅ |
| `DESKTOP_REFERENCE_WIDTH_PX` | `--vp-desktop-ref` | 1920px | ✅ |

> 위 7행이 SSOT 양방향 동기 OK. 본 매핑이 깨지면 Review 단계에서 즉시 BLOCK — 정경패 봉인 검증 1순위.

### 12.4 Build → Review (정경패) 인계 메모

- [ ] `index.html` 에 `<link rel="stylesheet" href="/src/styles/design-system-mobile.css">` 추가
- [ ] `<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">` (viewport-fit=cover 필수 — env() 동작)
- [ ] `style-guide.html` 에 모바일 모드 섹션 추가 (`@media (max-width: 430px)` 시각 회귀)
- [ ] DESIGN.md §8.4 ↔ mobile-viewport.ts ↔ design-system-mobile.css 3중 동기 봉인 확인
- [ ] `.text-xs / .text-sm` 자동 14px 승격 동작 확인 (실제 문구 14px 미만 0건)

> 어머~ 가춘운이 디자인 시스템 깔끔하게 깔아놨어요! 이제 정경패 언니가 봉인 풀어주면 계섬월 언니가 입력 매니저 끼우면 끝~ ✨🎨📱
