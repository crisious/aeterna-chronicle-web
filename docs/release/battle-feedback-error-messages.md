# ⚔️ 전투 피드백 가독성 — 에러 메시지 카피 SSOT v1.0

> 작성: 진채봉 Editor
> 작성일: 2026-06-20
> 스코프: 4종 게이트(contrast · legibility · colorblind · overlap) × 4 상태(PASS/BLOCK/WARN/ERROR)
> 톤 5계명: ① 원인→처방 ② 수치는 사실 ③ 경로 절단 금지 ④ 시(詩)는 hint만 ⑤ 도메인 키 규약
> 키 규약: `battle.feedback.<gate>.<state>.<reason>`

---

## 1. 매트릭스 개요

| 게이트 | PASS | BLOCK | WARN | ERROR | 슬롯 합계 |
|--------|:----:|:-----:|:----:|:-----:|:---------:|
| contrast   | 1 | 1 | 1 | 1 | 4 |
| legibility | 1 | 1 | 1 | 1 | 4 |
| colorblind | 1 | 1 | 1 | 1 | 4 |
| overlap    | 1 | 1 | 1 | 1 | 4 |
| **합계**   | **4** | **4** | **4** | **4** | **16** |

ko/en 동시 정의 = 32줄.

---

## 2. contrast (명도 대비)

### 2.1 PASS
- **key**: `battle.feedback.contrast.pass.all-aaa`
- **ko**: `🟢 명도 대비 AAA 충족. 데미지 7종·상태 15종 모두 텍스트 ≥7:1 / 아이콘 ≥3:1.`
- **en**: `🟢 Contrast AAA met. All 7 damage + 15 status pass text ≥7:1 / icon ≥3:1.`
- **hint**: (없음 — 통과 시 다음 게이트로)

### 2.2 BLOCK
- **key**: `battle.feedback.contrast.block.below-aaa`
- **ko**: `🔴 대비 미달 {count}건: {items}. 최저 {ratio}:1 (약속 7:1). → 외곽선 추가 또는 색상 조정 후 재실행.`
- **en**: `🔴 {count} items below AAA: {items}. Lowest {ratio}:1 (target 7:1). → Add outline or adjust color then retry.`

### 2.3 WARN
- **key**: `battle.feedback.contrast.warn.aa-only`
- **ko**: `🟡 AA(4.5:1)만 충족 {count}건: {items}. AAA 권장. (누적 ≤ 3건 통과)`
- **en**: `🟡 {count} items meet AA only: {items}. AAA recommended. (≤3 allowed)`

### 2.4 ERROR
- **key**: `battle.feedback.contrast.error.bg-unresolved`
- **ko**: `🟠 배경색 측정 실패: {item}. 팝업 표시 시점 배경이 동적이라 대비 산출 불가. → 기준 배경 토큰 지정.`
- **en**: `🟠 Background unresolved: {item}. Dynamic backdrop blocks contrast calc. → Pin a reference bg token.`

---

## 3. legibility (최소 폰트)

### 3.1 PASS
- **key**: `battle.feedback.legibility.pass.no-violation`
- **ko**: `🟢 14px 봉인 무위반. 전투 텍스트 {count}개 모두 ≥14px (데미지 28px 기준).`
- **en**: `🟢 14px guard clean. All {count} battle texts ≥14px (damage 28px baseline).`

### 3.2 BLOCK
- **key**: `battle.feedback.legibility.block.below-min`
- **ko**: `🔴 14px 미만 {count}건: {objects}. 최소 {min}px 감지. → TextLegibilityGuard.clampFontPx() 경유로 수정.`
- **en**: `🔴 {count} below 14px: {objects}. Min {min}px detected. → Route through TextLegibilityGuard.clampFontPx().`

### 3.3 WARN
- **key**: `battle.feedback.legibility.warn.unrouted-style`
- **ko**: `🟡 가드 미경유 텍스트 스타일 {count}건: {objects}. 직접 fontSize 지정 발견. (감사 권장)`
- **en**: `🟡 {count} text styles bypass guard: {objects}. Direct fontSize found. (Review suggested)`

### 3.4 ERROR
- **key**: `battle.feedback.legibility.error.viewport-missing`
- **ko**: `🟠 뷰포트 스펙 누락: {object}. fontScale 산출 불가. → MobileViewportSpec 주입 확인.`
- **en**: `🟠 Viewport spec missing: {object}. Cannot compute fontScale. → Verify MobileViewportSpec injection.`

---

## 4. colorblind (색약 비색상 단서)

### 4.1 PASS
- **key**: `battle.feedback.colorblind.pass.full-coverage`
- **ko**: `🟢 비색상 단서 100%. 속성 6종 이모지 + 상태 15종 아이콘 — 색약 3종 시뮬 모두 식별.`
- **en**: `🟢 Non-color cues 100%. 6 element emojis + 15 status icons — identifiable in all 3 CVD sims.`

### 4.2 BLOCK
- **key**: `battle.feedback.colorblind.block.color-only`
- **ko**: `🔴 색상 단독 표시 {count}건: {items}. 색약 시 구분 불가. → 이모지/아이콘/라벨 병행 추가.`
- **en**: `🔴 {count} color-only items: {items}. Indistinct under CVD. → Add emoji/icon/label cue.`

### 4.3 WARN
- **key**: `battle.feedback.colorblind.warn.weak-distinction`
- **ko**: `🟡 색약 시 유사 단서 {count}건: {items}. 형태 차이 미약. (대비 강화 권장)`
- **en**: `🟡 {count} items with weak CVD distinction: {items}. Shapes too similar. (Strengthen recommended)`

### 4.4 ERROR
- **key**: `battle.feedback.colorblind.error.sim-failed`
- **ko**: `🟠 색약 시뮬 실패: {profile}. 팔레트 변환 누락. → colorblind_palettes.json 등재 확인.`
- **en**: `🟠 CVD sim failed: {profile}. Palette transform missing. → Verify colorblind_palettes.json entry.`

---

## 5. overlap (팝업 체류·겹침)

### 5.1 PASS
- **key**: `battle.feedback.overlap.pass.no-overlap`
- **ko**: `🟢 팝업 겹침 0 · 체류 {ms}ms (약속 ≥900ms). 동시 타격 {n}건 모두 스태거 분리.`
- **en**: `🟢 Zero overlap · dwell {ms}ms (target ≥900ms). All {n} simultaneous hits staggered.`

### 5.2 BLOCK
- **key**: `battle.feedback.overlap.block.popups-collide`
- **ko**: `🔴 팝업 겹침 {count}건: 같은 좌표 {coord}. 숫자 가림. → 세로 오프셋 스태거 적용.`
- **en**: `🔴 {count} popup collisions at {coord}. Numbers occluded. → Apply vertical stagger offset.`

### 5.3 WARN
- **key**: `battle.feedback.overlap.warn.short-dwell`
- **ko**: `🟡 체류 단축 {count}건: {ms}ms (<900ms). 빠른 연타 구간 가독 저하 우려. (누적 ≤ 5건 통과)`
- **en**: `🟡 {count} short dwells: {ms}ms (<900ms). Fast combo may hurt readability. (≤5 allowed)`

### 5.4 ERROR
- **key**: `battle.feedback.overlap.error.timing-undefined`
- **ko**: `🟠 타이밍 토큰 부재: {key}. BATTLE_TIMING 미정의. → battle-tokens.ts §3 등재.`
- **en**: `🟠 Timing token absent: {key}. Not in BATTLE_TIMING. → Register in battle-tokens.ts §3.`

---

## 6. 코드 상수 매핑 (계섬월 인계)

```typescript
// client/src/constants/battle_feedback_gate_messages.ts
export const BATTLE_FEEDBACK_GATE_MESSAGES = {
  contrast: {
    pass:  'battle.feedback.contrast.pass.all-aaa',
    block: 'battle.feedback.contrast.block.below-aaa',
    warn:  'battle.feedback.contrast.warn.aa-only',
    error: 'battle.feedback.contrast.error.bg-unresolved',
  },
  legibility: {
    pass:  'battle.feedback.legibility.pass.no-violation',
    block: 'battle.feedback.legibility.block.below-min',
    warn:  'battle.feedback.legibility.warn.unrouted-style',
    error: 'battle.feedback.legibility.error.viewport-missing',
  },
  colorblind: {
    pass:  'battle.feedback.colorblind.pass.full-coverage',
    block: 'battle.feedback.colorblind.block.color-only',
    warn:  'battle.feedback.colorblind.warn.weak-distinction',
    error: 'battle.feedback.colorblind.error.sim-failed',
  },
  overlap: {
    pass:  'battle.feedback.overlap.pass.no-overlap',
    block: 'battle.feedback.overlap.block.popups-collide',
    warn:  'battle.feedback.overlap.warn.short-dwell',
    error: 'battle.feedback.overlap.error.timing-undefined',
  },
} as const;
```

---

> 본 SSOT는 16개 슬롯 × ko/en 동시 정의(32줄)입니다. 카피 변경 시 톤 5계명 준수, 키 변경은 코드 상수와 동시 PR로 갱신. i18n 등재는 `client/src/i18n/{ko,en}.json` 동기.
