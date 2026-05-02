# 모바일 반응형 에러 메시지 카피 SSOT v1.0

> 작성: 진채봉 Editor
> 작성일: 2026-04-29
> 스코프: 4 게이트 × 4 상태 = 16 슬롯 × ko/en = 32줄
> 키 규약: `mobile.<gate>.<state>.<reason>`
> 디자인 미러: `docs/release/design-system_data-validation.md` §5.1 (ANSI 16색·2줄 ERROR 표준)

---

## 0. 톤 5계명 (가춘운 디자인 미러)

1. **원인 → 처방** 순서. 무엇이 잘못됐는가 한 줄, 어떻게 고치는가 한 줄.
2. **수치는 사실** — `p95=132ms`, `viewport=360`, `fontSize=12px`. 문학적 표현 금지.
3. **경로 절단 금지** — `client/src/scenes/Battle.ts:142:atbBar` 전부 표시.
4. **시는 hint만** — 본문은 사실, hint 라인에서만 운율 허용.
5. **도메인 키 규약** — `mobile.viewport.error.cutoff` 처럼 일관된 4단계.

---

## 1. 게이트 1 — Viewport (4 슬롯)

### 1.1 PASS

```
ko: [mobile.viewport.pass.ok] 4 viewport(360/375/414/430) 16/16 시나리오 통과 ✓
en: [mobile.viewport.pass.ok] 4 viewports (360/375/414/430), 16/16 scenarios passed ✓
```

### 1.2 WARN (≤ 1건 잘림 — 영향도 낮음)

```
ko: [mobile.viewport.warn.minor_clip] mob-414 인벤토리 우측 4px 잘림 (영향: 시각 한정)
    hint: HUD 우측 패딩 +8px 권고
en: [mobile.viewport.warn.minor_clip] mob-414 inventory clipped 4px right (visual only)
    hint: increase HUD right padding by +8px
```

### 1.3 ERROR (시나리오 1건 이상 미동작)

```
ko: [mobile.viewport.error.cutoff] mob-360 전투 ATB 게이지 viewport-out
    path: client/src/scenes/Battle.ts:142:atbBar.x=372 (viewport=360)
en: [mobile.viewport.error.cutoff] mob-360 battle ATB bar out of viewport
    path: client/src/scenes/Battle.ts:142:atbBar.x=372 (viewport=360)
```

### 1.4 BLOCK (4 viewport 중 2개 이상 미동작 — ship 차단)

```
ko: [mobile.viewport.block.ship_gate] 4 viewport 중 2개 이상 시나리오 미동작 → 출시 차단
    hint: 백능파 승인 없이 우회 불가
en: [mobile.viewport.block.ship_gate] ≥2 of 4 viewports failed → ship blocked
    hint: bypass requires Strategy (Baek) approval
```

---

## 2. 게이트 2 — Touch Latency (4 슬롯)

### 2.1 PASS

```
ko: [mobile.touch.pass.ok] 터치 지연 p95=82ms (≤ 100ms) ✓
en: [mobile.touch.pass.ok] touch latency p95=82ms (≤ 100ms) ✓
```

### 2.2 WARN (90ms ≤ p95 < 100ms)

```
ko: [mobile.touch.warn.borderline] 터치 지연 p95=94ms 임계 근접
    hint: pointer 이벤트 핸들러 동기화 점검 권고
en: [mobile.touch.warn.borderline] touch latency p95=94ms near threshold
    hint: review pointer event handler synchronization
```

### 2.3 ERROR (100ms ≤ p95 < 200ms)

```
ko: [mobile.touch.error.slow] 터치 지연 p95=132ms (한도 100ms 초과)
    path: client/src/input/touch-handler.ts:58:onPointerDown
en: [mobile.touch.error.slow] touch latency p95=132ms (limit 100ms exceeded)
    path: client/src/input/touch-handler.ts:58:onPointerDown
```

### 2.4 BLOCK (p95 ≥ 200ms — 사용 불가)

```
ko: [mobile.touch.block.unusable] 터치 지연 p95=240ms → 사용 불가 → 출시 차단
    hint: 입력 핸들러 우선순위 재설계 필요
en: [mobile.touch.block.unusable] touch latency p95=240ms → unusable → ship blocked
    hint: input handler priority redesign required
```

---

## 3. 게이트 3 — UI Variant (Safe Area · 4 슬롯)

### 3.1 PASS

```
ko: [mobile.ui.pass.ok] HUD·메뉴·전투 UI safe-area 침범 0건 ✓
en: [mobile.ui.pass.ok] HUD/menu/battle UI safe-area violations: 0 ✓
```

### 3.2 WARN (배경 이미지만 침범)

```
ko: [mobile.ui.warn.bg_only] safe-area 침범 1건 — 배경 이미지(zIndex=-10) 한정 → 허용
en: [mobile.ui.warn.bg_only] safe-area violation: 1 (background image, zIndex=-10) → allowed
```

### 3.3 ERROR (인터랙션 요소가 노치 아래)

```
ko: [mobile.ui.error.notch_overlap] 닫기 버튼이 노치 아래 가려짐 (mob-430)
    path: client/src/scenes/Inventory.ts:204:closeBtn.y=12 (sa-top=59)
en: [mobile.ui.error.notch_overlap] close button hidden under notch (mob-430)
    path: client/src/scenes/Inventory.ts:204:closeBtn.y=12 (sa-top=59)
```

### 3.4 BLOCK (전투 UI가 holm 인디케이터 영역 침범)

```
ko: [mobile.ui.block.combat_unreachable] 전투 스킬 슬롯 일부 home indicator 영역 → 출시 차단
    hint: safe-area-inset-bottom 보정 필수
en: [mobile.ui.block.combat_unreachable] battle skill slot overlaps home indicator → ship blocked
    hint: safe-area-inset-bottom padding required
```

---

## 4. 게이트 4 — Font Audit (4 슬롯)

### 4.1 PASS

```
ko: [mobile.font.pass.ok] 본문 텍스트 fontSize ≥ 14px 100% 충족 ✓
en: [mobile.font.pass.ok] body text fontSize ≥ 14px: 100% ✓
```

### 4.2 WARN (시스템 토스트 12px — 허용 범위)

```
ko: [mobile.font.warn.allowed_small] 토스트 메시지 12px (시스템 메시지 예외 적용)
en: [mobile.font.warn.allowed_small] toast message 12px (system message exception)
```

### 4.3 ERROR (본문 텍스트 < 14px)

```
ko: [mobile.font.error.too_small] 본문 텍스트 fontSize=12px (최소 14px)
    path: client/src/scenes/Dialogue.ts:88:bodyText
en: [mobile.font.error.too_small] body text fontSize=12px (min 14px)
    path: client/src/scenes/Dialogue.ts:88:bodyText
```

### 4.4 BLOCK (대화 본문이 < 12px — 가독 불가)

```
ko: [mobile.font.block.unreadable] 대화 본문 fontSize=10px → 가독 불가 → 출시 차단
en: [mobile.font.block.unreadable] dialogue body fontSize=10px → unreadable → ship blocked
```

---

## 5. 코드 상수 매핑 (계섬월 인계)

```ts
// client/src/constants/mobile_responsive_messages.ts
// REDUCTION 스코프 — 본 스프린트는 ERROR 4슬롯 우선 구현, 나머지는 다음 스프린트
export const MOBILE_MESSAGES = {
  'mobile.viewport.error.cutoff': {
    ko: 'mob-{vp} {scene} {element} viewport-out',
    en: 'mob-{vp} {scene} {element} out of viewport',
  },
  'mobile.touch.error.slow': {
    ko: '터치 지연 p95={ms}ms (한도 100ms 초과)',
    en: 'touch latency p95={ms}ms (limit 100ms exceeded)',
  },
  'mobile.ui.error.notch_overlap': {
    ko: '{element}이 노치 아래 가려짐 ({vp})',
    en: '{element} hidden under notch ({vp})',
  },
  'mobile.font.error.too_small': {
    ko: '본문 텍스트 fontSize={px}px (최소 14px)',
    en: 'body text fontSize={px}px (min 14px)',
  },
} as const;
```

---

## 6. 출력 규약 (이소화 봉인)

- **2줄 ERROR** — 본문 1줄 + path 1줄. 그 이상은 hint 라인으로 분리.
- **카운트 순서** — `[gate.state.reason]` → 본문 → path → hint.
- **NO_COLOR=1** 환경에서는 ANSI 코드 제거, 같은 정보 그대로 노출.
- **outlier 면제 절차** — 백능파 승인 메모를 PR 본문에 명기, `// MOBILE_WARN_ALLOW: 사유` 주석 동반.

---

> 본 문서가 카피 1차 SSOT. 슬롯 추가/수정 시 `mobile_responsive_messages.ts` 동시 갱신, 가춘운 디자인 시스템 §5.1 ANSI 미러 검증 필수.
