# 에테르나 크로니클 — 세이브·로드 시각 에셋 팩 v1.0 ✨

> 작성: 가춘운 (CMO/디자인) 🎨
> 작성일: 2026-04-28
> 스프린트: Auto: 세이브·로드 시스템 안정성 검증 (Asset 단계)
> SSOT 위계: 4차 (런타임 시각 자원) — `design-system_save-load-system.md` (3차) 미러
> 인계 대상: 계섬월(Build) — 본 모킹업/SVG/토큰 그대로 컴포넌트화

---

## 0. 어머~ 이게 뭐예요? 💭

세이브·로드 시스템의 **손에 잡히는 시각 자원 묶음**이에요!

- **ASCII 모킹업** → 계섬월이 컴포넌트 짤 때 레이아웃 그대로 본뜨면 됨
- **인라인 SVG 아이콘 6종** → 외부 이미지 의존 0, 라이선스 위험 0
- **임베드 카드 디자인** → Discord 봇이 자동세이브 알림 보낼 때 쓰는 포맷
- **모션 타임라인** → fade/glow/shake 키프레임 ms 단위 명세
- **컬러 토큰 코드 미러** → CSS 변수 + Phaser 0xRRGGBB 동시 정의

**모두 코드/텍스트로 표현 — PNG/JPG 0개**! Phase 52 어셋 누적 1454개에 부담 안 줘요~ 🎀

---

## 1. 슬롯 카드 ASCII 모킹업 (320×120, 6종) 🎴

> 데스크탑 기준 카드 크기: `width: 320px, height: 120px, radius: 12px, padding: 16px`

### 1.1 활성 슬롯 (active) — 금색 글로우 ⚔️

```
┌──────────────────────────────────────────┐ ← border: 2px solid #FFD24A
│ ⚔️  슬롯 1                    Lv.42 ✨  │   glow: 0 0 12px rgba(255,210,74,.4)
│ ───────────────────────────────────────  │
│  에리언 · 기억술사                        │ ← #F5F5F5 / 18px / 700
│  Ch.4 · 망각의 고원 · 32:14:08           │ ← #C8C8D8 / 14px / 500
│  💾 2분 전 자동저장                       │ ← #FFD24A / 12px / 400
└──────────────────────────────────────────┘
                                       ▲
                          [현재 활성 — 가장 밝게, 우측 ✨ 펄스]
```

### 1.2 백업 슬롯 (backup) — 푸른 절제 🛡️

```
┌──────────────────────────────────────────┐ ← border: 1px solid #4A9EFF
│ 🛡️  백업 슬롯                    Lv.42  │   glow: 0 0 8px rgba(74,158,255,.3)
│ ───────────────────────────────────────  │
│  에리언 · 기억술사                        │
│  Ch.4 · 망각의 고원 · 32:11:42           │
│  🔒 3분 전 안전 보관                      │ ← #4A9EFF / 자물쇠 강조
└──────────────────────────────────────────┘
   "직전 정상 스냅샷 — 손상 시 자동 복구 후보"
```

### 1.3 자동세이브 슬롯 (auto) — 푸른 잔잔함 🌀

```
┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐ ← border: 1px dashed #4A9EFF (60%)
│ 🌀  자동세이브                    Lv.42 │
│ ───────────────────────────────────────  │
│  에리언 · 기억술사                        │ ← #C8C8D8 (살짝 흐림)
│  Ch.4 · 망각의 고원 · 32:14:08           │
│  🕐 방금 전 (트리거: 보스 직전)            │
└─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
   "30초 주기 + 핵심 트리거 (방 전환/보스/레벨업)"
```

### 1.4 손상 슬롯 (corrupted) — 따뜻한 호박색 ⚠️

```
┌══════════════════════════════════════════┐ ← border: 2px solid #E8A33A (이중선)
│ ⚠️  슬롯 2                  체크섬 불일치 │   glow: 0 0 6px rgba(232,163,58,.35)
│ ───────────────────────────────────────  │
│  에리언 · ?                               │ ← #F5E1B8 (호박색 톤)
│  Ch.? · ? · ?:?:?                        │
│  💛 백업 슬롯에서 복구 가능                │ ← 안심 카피!
│                          [복구하기 ▶]    │ ← 호박색 버튼
└══════════════════════════════════════════┘
   ⚠️ 절대 빨강 ❌ — 호박색은 "걱정 말아요" 톤!
```

### 1.5 마이그레이션 필요 (migration) — 인디고 🔄

```
┌──────────────────────────────────────────┐ ← border: 1px solid #7A6BFF
│ 🔄  슬롯 3                  v1 → v2 호환 │
│ ───────────────────────────────────────  │
│  에리언 · 기억술사 (구버전)               │ ← #DCD8FF
│  Ch.3 · 솔라리스 사막 · 18:42:11         │
│  ✨ 자동 변환 후 로드합니다                │
│                          [변환 후 로드 ▶]│
└──────────────────────────────────────────┘
   "유저는 'migration'이란 단어를 절대 안 봅니다 — 자동 변환!"
```

### 1.6 빈 슬롯 (empty) — 차분한 점선 ➕

```
┌─ · ─ · ─ · ─ · ─ · ─ · ─ · ─ · ─ · ─ · ─ ┐ ← border: 1px dashed #3A3A52
│                                          │
│              ➕  빈 슬롯                   │ ← #7A7A92 / 중앙 정렬
│           새 모험을 시작하세요              │
│                                          │
└─ · ─ · ─ · ─ · ─ · ─ · ─ · ─ · ─ · ─ · ─ ┘
```

---

## 2. 인라인 SVG 아이콘 세트 (24×24, 6종) 🎨

> 모두 `currentColor` 사용 — 토큰 색이 자동 적용. PNG ❌, 외부 의존 ❌

### 2.1 `icon-save-active.svg` — 검 (활성) ⚔️

```svg
<svg viewBox="0 0 24 24" width="24" height="24" fill="none"
     stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
  <path d="M14.5 17.5L4 7V3h4l10.5 10.5"/>
  <line x1="13" y1="19" x2="19" y2="13"/>
  <line x1="16" y1="16" x2="20" y2="20"/>
  <line x1="19" y1="21" x2="21" y2="19"/>
</svg>
```

### 2.2 `icon-save-backup.svg` — 방패 (백업) 🛡️

```svg
<svg viewBox="0 0 24 24" width="24" height="24" fill="none"
     stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  <path d="M9 12l2 2 4-4"/>
</svg>
```

### 2.3 `icon-save-auto.svg` — 회전 (자동) 🌀

```svg
<svg viewBox="0 0 24 24" width="24" height="24" fill="none"
     stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
  <path d="M21 12a9 9 0 1 1-3-6.7"/>
  <polyline points="21 4 21 9 16 9"/>
</svg>
```

### 2.4 `icon-save-corrupted.svg` — 경고 다이아몬드 (손상) ⚠️

```svg
<svg viewBox="0 0 24 24" width="24" height="24" fill="none"
     stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 2L2 12l10 10 10-10L12 2z"/>
  <line x1="12" y1="8" x2="12" y2="13"/>
  <circle cx="12" cy="16.5" r="0.6" fill="currentColor"/>
</svg>
```

### 2.5 `icon-save-migration.svg` — 변환 화살표 (마이그레이션) 🔄

```svg
<svg viewBox="0 0 24 24" width="24" height="24" fill="none"
     stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="17 1 21 5 17 9"/>
  <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
  <polyline points="7 23 3 19 7 15"/>
  <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
</svg>
```

### 2.6 `icon-save-empty.svg` — 플러스 (빈 슬롯) ➕

```svg
<svg viewBox="0 0 24 24" width="24" height="24" fill="none"
     stroke="currentColor" stroke-width="1.5" stroke-dasharray="2 2"
     stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="9"/>
  <line x1="12" y1="8" x2="12" y2="16"/>
  <line x1="8" y1="12" x2="16" y2="12"/>
</svg>
```

---

## 3. 자동세이브 토스트 — 무방해 디자인 (우하단) 🎀

### 3.1 ASCII 모킹업 (280×56, 우하단 16px 마진)

```
                                       ┌──────────────────────────┐
                                       │ 💾  자동저장 완료         │ ← #FFD24A 60%
                                       │ 슬롯 auto-3 · 방금 전     │ ← #C8C8D8 12px
                                       └──────────────────────────┘
                                          ▲ fade 200ms in / hold 1300ms / fade 300ms out
```

### 3.2 모션 타임라인 (총 1800ms)

```
0ms       200ms                    1500ms              1800ms
│  fade-in  │      ────hold────     │  fade-out  │
│ opacity:0→1 │   opacity:1, y:0    │ opacity:1→0  │
│ y: +8 → 0   │                     │ y: 0 → -4    │
│ ease-out    │                     │ ease-in      │
```

### 3.3 등장/소멸 우선순위 규칙

| 충돌 상황 | 처리 |
|---|---|
| 토스트 활성 중 새 토스트 | **기존 즉시 fade-out 250ms → 새것 fade-in** (스택 ❌) |
| 보스/시네마틱 진행 중 | **모든 토스트 큐 보류** — 종료 후 1개만 표시 (가장 최근) |
| 손상 복구 토스트 | **무방해 규칙 예외** — 화면 상단 중앙 + 5초 hold + 사용자 dismiss |

---

## 4. 손상 복구 다이얼로그 (480×320, 모달) 💛

### 4.1 ASCII 모킹업

```
┌════════════════════════════════════════════════════┐
│                                                    │
│              💛  걱정 마세요!                       │ ← 24px / 700 / #FFD24A
│                                                    │
│        슬롯 2의 데이터가 일부 손상되었지만,         │ ← 14px / 500 / #F5F5F5
│        백업 슬롯에서 안전하게 복구할 수 있어요.     │
│                                                    │
│  ┌──────────────────────────────────────────────┐  │
│  │ 🛡️  백업: 3분 전 (Ch.4 32:11:42)            │  │ ← #4A9EFF border
│  │     손실: 약 2분 30초 분량 진행              │  │
│  └──────────────────────────────────────────────┘  │
│                                                    │
│       [ 백업으로 복구 ✨ ]   [ 나중에 결정 ]        │
│         ↑ #FFD24A 채움          ↑ #3A3A52 외곽선
│         primary                  ghost
└════════════════════════════════════════════════════┘
        ↑ backdrop: rgba(10,10,20,0.72) blur(4px)
```

### 4.2 카피톤 5계명 (이소화 봉인 비협상 ⚔️)

| 절대 ❌ | 권장 ✅ |
|---|---|
| "치명적 오류" | "걱정 마세요" |
| "데이터 손상" | "일부 손상되었지만" |
| "복구 실패 가능" | "안전하게 복구할 수 있어요" |
| "Save corrupted" | "백업이 있어요" |
| 빨강/검정 톤 | 호박색/금색 톤 |

→ **불안 최소화 = 유저 잔류율** 💎

---

## 5. Discord 임베드 카드 — 운영 알림용 🤖

> 봇이 채널에 자동세이브 통계/손상 감지 알림을 임베드로 포스팅할 때 쓰는 포맷.

### 5.1 정상 자동세이브 통계 (1일 1회 요약)

```json
{
  "embeds": [{
    "title": "💾 자동세이브 일일 리포트",
    "description": "지난 24시간 자동세이브 무사 작동 ✨",
    "color": 16766538,
    "fields": [
      { "name": "🌀 자동세이브 횟수",  "value": "1,247회",       "inline": true },
      { "name": "🛡️ 백업 회전",        "value": "3슬롯 정상",     "inline": true },
      { "name": "✅ 왕복 일치율",       "value": "100.0%",        "inline": true },
      { "name": "⚠️ 손상 감지",        "value": "0건",            "inline": true },
      { "name": "🔄 마이그레이션",      "value": "v1→v2: 12건",   "inline": true },
      { "name": "⏱️ 평균 저장 시간",    "value": "42ms",          "inline": true }
    ],
    "footer": { "text": "에테르나 크로니클 · 가춘운 디자인" },
    "timestamp": "2026-04-28T00:00:00Z"
  }]
}
```

> `color: 16766538` = `#FFD24A` (활성 금색)

### 5.2 손상 감지 알림 (즉시 — 운영자만)

```json
{
  "embeds": [{
    "title": "💛 손상 감지 — 자동 복구 작동",
    "description": "유저 알림 ❌ · 운영자 정보용",
    "color": 15246650,
    "fields": [
      { "name": "📍 슬롯",     "value": "save-2",                "inline": true },
      { "name": "🔍 원인",     "value": "체크섬 불일치",          "inline": true },
      { "name": "🛡️ 복구",    "value": "backup-1 (3분 전)",     "inline": true },
      { "name": "📊 손실",     "value": "≈ 2분 30초",            "inline": true },
      { "name": "✨ 결과",     "value": "왕복 일치 100%",         "inline": true },
      { "name": "🆔 유저 해시", "value": "u_7f...3a9 (익명)",    "inline": true }
    ],
    "footer": { "text": "자동 복구 — 액션 불필요" }
  }]
}
```

> `color: 15246650` = `#E8A33A` (호박색 — 따뜻한 경계)

---

## 6. 컬러 토큰 코드 미러 (계섬월 인계용) 🔧

> CSS + Phaser 동시 정의. `client/src/constants/save-load-tokens.ts` 신설 후보.

```typescript
// client/src/constants/save-load-tokens.ts
// SSOT: design-system_save-load-system.md §2 (3차) 미러
// 변경 절차: DESIGN.md → design-tokens.ts → 본 파일 (위→아래)

export const SAVE_SLOT_COLORS = {
  active:    { hex: '#FFD24A', phaser: 0xFFD24A, alpha: 1.0,  label: '활성' },
  backup:    { hex: '#4A9EFF', phaser: 0x4A9EFF, alpha: 1.0,  label: '백업' },
  auto:      { hex: '#4A9EFF', phaser: 0x4A9EFF, alpha: 0.6,  label: '자동' },
  corrupted: { hex: '#E8A33A', phaser: 0xE8A33A, alpha: 1.0,  label: '손상' },
  migration: { hex: '#7A6BFF', phaser: 0x7A6BFF, alpha: 1.0,  label: '마이그레이션' },
  empty:     { hex: '#3A3A52', phaser: 0x3A3A52, alpha: 1.0,  label: '빈 슬롯' },
} as const;

export const SAVE_SLOT_GLOW = {
  active:    { outer: '0 0 12px rgba(255,210, 74,0.40)', inner: 'inset 0 0 8px rgba(255,210, 74,0.15)' },
  backup:    { outer: '0 0  8px rgba( 74,158,255,0.30)', inner: 'inset 0 0 6px rgba( 74,158,255,0.12)' },
  corrupted: { outer: '0 0  6px rgba(232,163, 58,0.35)', inner: 'inset 0 0 4px rgba(232,163, 58,0.10)' },
} as const;

export const SAVE_TOAST_TIMING = {
  fadeIn:  200,   // ms
  hold:    1300,  // ms
  fadeOut: 300,   // ms
  total:   1800,  // ms (검증용)
  yOffset: 8,     // px (등장 시 +8 → 0)
} as const;

export type SaveSlotState = keyof typeof SAVE_SLOT_COLORS;
```

```css
/* client/src/styles/design-system-save-load.css */
/* SSOT: design-system_save-load-system.md §2 (3차) 미러 */

:root {
  /* 슬롯 상태 */
  --save-slot-active-border:    #FFD24A;
  --save-slot-active-glow:      0 0 12px rgba(255,210, 74,0.40), inset 0 0 8px rgba(255,210, 74,0.15);
  --save-slot-backup-border:    #4A9EFF;
  --save-slot-backup-glow:      0 0  8px rgba( 74,158,255,0.30), inset 0 0 6px rgba( 74,158,255,0.12);
  --save-slot-corrupted-border: #E8A33A;
  --save-slot-corrupted-glow:   0 0  6px rgba(232,163, 58,0.35), inset 0 0 4px rgba(232,163, 58,0.10);

  /* 토스트 모션 */
  --save-toast-fade-in:  200ms;
  --save-toast-hold:    1300ms;
  --save-toast-fade-out: 300ms;
}

@keyframes save-toast-enter {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0);   }
}
@keyframes save-toast-exit {
  from { opacity: 1; transform: translateY(0);   }
  to   { opacity: 0; transform: translateY(-4px);}
}
```

---

## 7. 반응형 브레이크포인트 — 슬롯 그리드 📐

| 화면폭 | 그리드 | 슬롯 카드 | 비고 |
|---|---|---|---|
| ≥ 1280 | 3 col × 2 row | 320×120 | 데스크탑 기본 |
| 1024–1279 | 2 col × 3 row | 320×120 | 패딩 16px |
| 768–1023 | 2 col × 3 row | 280×104 | 메타정보 1줄 축약 |
| < 768 | 1 col × 6 row | 100% × 96 | 모바일 — 글로우 disabled (성능) |

→ DESIGN.md §8 미러. **모바일에서 glow 끄는 것이 핵심** (60fps 사수)

---

## 8. AI 슬롭 감지 체크리스트 (review 단계 인계) 🔍

> 가춘운이 review 단계에서 본 체크리스트로 비주얼 QA 수행 예정.

- [ ] 슬롯 카드에 **빨강(`#FF*`)** 색이 단 한 픽셀이라도 있는가? → ❌ FAIL
- [ ] 손상 다이얼로그 카피에 "Error/Critical/Failed" 단어가 있는가? → ❌ FAIL
- [ ] 토스트 fade 시간이 200/300ms 외 임의값인가? → ❌ FAIL
- [ ] 자동세이브 토스트가 보스 시네마틱 중 표시되는가? → ❌ FAIL
- [ ] 모바일에서 모든 슬롯에 glow가 켜지는가? → ❌ FAIL (60fps 깨짐)
- [ ] 슬롯 상태가 **색상만**으로 구분되는가? (아이콘/텍스트 라벨 없음) → ❌ FAIL (색약 접근성)
- [ ] 슬롯 카드 padding이 16px가 아닌 임의값인가? → ❌ FAIL
- [ ] 마이그레이션 슬롯에 "v1→v2" 같은 기술 용어가 유저에게 노출되는가? → ❌ FAIL

---

## 9. 다음 단계 인계 (계섬월 / 진채봉) 🤝

### 9.1 계섬월 (Build) — 즉시 사용 가능한 자원

1. ✅ `SAVE_SLOT_COLORS` 토큰 객체 → `client/src/constants/save-load-tokens.ts`로 그대로 복사
2. ✅ 6종 SVG 아이콘 → `client/src/assets/icons/save/`에 파일로 저장
3. ✅ ASCII 모킹업 → React/Phaser 컴포넌트 레이아웃 그대로 본뜨기
4. ✅ 토스트 keyframe → `design-system-save-load.css`로 그대로 import

### 9.2 진채봉 (Editor) — 카피 SSOT 검증 필요

1. 📝 손상 복구 다이얼로그 카피 5계명 (§4.2) → `tutorial-onboarding-error-messages.md` 패턴으로 슬롯화
2. 📝 자동세이브 토스트 카피 ko/en 24슬롯 (i18n)
3. 📝 손상 감지 Discord 임베드 운영 가이드

### 9.3 가춘운 본인 (Review) — review 단계에서

1. 🔍 §8 AI 슬롭 체크리스트 8항으로 `/design-review` 자동화
2. 🔍 모바일 60fps 검증 (`/browse` 활용)
3. 🔍 색약 시뮬레이션 (Deuteranopia/Protanopia) — 상태 구분 가능한가

---

## 10. 자가 검증 — 본 에셋 팩이 토픽 4지표 어디에 닿는가? 🎯

| 토픽 지표 | 본 에셋 기여 |
|---|---|
| 1) 세이브 schema + 마이그레이션 | §1.5 마이그레이션 슬롯 UI · §6 토큰의 `migration` 상태 — 유저가 변환 사실을 안전하게 인지 |
| 2) 자동세이브 주기·트리거 | §3 토스트 모션 · §3.3 충돌 규칙 — 트리거 시 무방해 알림 |
| 3) 손상 복구 (백업·체크섬) | §1.4 손상 슬롯 · §4 복구 다이얼로그 · §5.2 운영 알림 — 호박색 톤으로 안심 복구 |
| 4) 로드 시 데이터 검증 | §8 AI 슬롭 체크리스트 + §4.2 카피톤 — 검증 실패 시에도 유저는 "걱정 마세요" 톤만 본다 |

→ **이소화 봉인 비협상**: 손상 시에도 빨강/검정 ❌ · 호박색/금색 ✅ — 유저는 "데이터 잃었다"가 아닌 "복구되고 있다"를 느낀다 💛

---

> 가춘운 ✨ — *"데이터 무결성은 코드가 만들지만, 그 무결성을 유저가 '느끼는' 건 디자인이 만들어요~ 🎀"*
