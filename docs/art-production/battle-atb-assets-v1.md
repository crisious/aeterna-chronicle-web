# ⚔️ ATB 전투 에셋 패키지 v1.0

> 작성: 가춘운 (CMO/디자인) ✨
> 스프린트: "에테르나 크로니클 전투 시스템 개선 — FF6 ATB"
> 단계: **Assets** (구현 자원 준비)
> 선행: `battle-design-system-v1.md` (Plan), `DESIGN.md v1.0`
> 스코프: 구현 즉시 투입 가능한 **토큰 · SVG · ASCII 목업 · 애니메이션 명세**

---

## 📦 본 패키지 산출물 목록

| # | 파일/섹션 | 타입 | 소비자 |
|---|-----------|------|--------|
| 1 | `design-system-battle.css` | CSS 변수·클래스 | 프론트 HUD |
| 2 | `battle-tokens.ts` 스펙 | Phaser 상수 | 계섬월 (전투 렌더) |
| 3 | ATB 게이지 SVG 3종 | 인라인 SVG | HUD 위젯 |
| 4 | 스킬 타입 아이콘 12종 | SVG 16×16 | 스킬 바 |
| 5 | 대미지 팝업 컴포넌트 | CSS 애니메이션 | 전투 VFX |
| 6 | 전투 화면 ASCII 목업 | 레이아웃 | 계섬월·정경패 |
| 7 | 턴 큐 타임라인 위젯 | SVG + 토큰 | HUD 상단 |
| 8 | 상태이상 아이콘 (신규 8종) | SVG 12×12 | 파티/적 프레임 |

---

## 1. `design-system-battle.css` (전투 전용 시트)

> 위치: `client/src/styles/design-system-battle.css`
> `design-system.css` 뒤에 링크하여 캐스케이드 확장.

```css
/* ==========================================================================
   Aeterna Chronicle — Battle Design System v1.0
   FF6-inspired ATB battle HUD tokens & components
   ========================================================================== */

/* ---------- 1. ATB/전투 토큰 ---------- */
:root {
  /* ATB 게이지 */
  --ac-atb-empty:         #2A2A3A;
  --ac-atb-charging-1:    #3A5A7A;       /* 0~33% */
  --ac-atb-charging-2:    #5A7FA8;       /* 33~66% */
  --ac-atb-charging-3:    #7AAFD0;       /* 66~99% */
  --ac-atb-ready:         #89CFF0;       /* 100% */
  --ac-atb-ready-glow:    rgba(137,207,240,.85);
  --ac-atb-frozen:        #4A4A5A;

  /* 적 ATB */
  --ac-atb-enemy-empty:   #3A2A2A;
  --ac-atb-enemy-charge:  #8A3A3A;
  --ac-atb-enemy-ready:   #FF4444;
  --ac-atb-enemy-glow:    rgba(255,68,68,.75);

  /* 턴 큐 타임라인 */
  --ac-turn-active:       #FFD700;
  --ac-turn-queued:       #89CFF0;
  --ac-turn-skipped:      #606060;
  --ac-turn-bg:           #14141F;

  /* 대미지 팝업 */
  --ac-dmg-normal:        #FFFFFF;
  --ac-dmg-critical:      #FFD700;
  --ac-dmg-heal:          #2ECC71;
  --ac-dmg-miss:          #A0A0A0;
  --ac-dmg-weak:          #FF6B35;
  --ac-dmg-resist:        #3498DB;
  --ac-dmg-immune:        #9B59B6;

  /* 스킬 타입 컬러 */
  --ac-skill-physical:    #C19A6B;
  --ac-skill-magic:       #9B59B6;
  --ac-skill-heal:        #2ECC71;
  --ac-skill-buff:        #F1C40F;
  --ac-skill-debuff:      #8E44AD;
  --ac-skill-ultimate:    #FF4D8B;

  /* 레이어 Z-index (FF6 위계) */
  --ac-z-battle-bg:        0;
  --ac-z-battle-entity:   10;
  --ac-z-battle-vfx:      20;
  --ac-z-battle-hud:      30;
  --ac-z-battle-popup:    40;
  --ac-z-battle-modal:    50;
}

/* ---------- 2. ATB 게이지 바 ---------- */
.ac-atb-bar {
  position: relative;
  width: 100%;
  height: 8px;
  background: var(--ac-atb-empty);
  border: 1px solid var(--ac-atb-frozen);
  border-radius: 2px;
  overflow: hidden;
  image-rendering: pixelated;
}
.ac-atb-bar__fill {
  height: 100%;
  background: linear-gradient(
    90deg,
    var(--ac-atb-charging-1) 0%,
    var(--ac-atb-charging-2) 50%,
    var(--ac-atb-charging-3) 100%
  );
  transition: width 80ms linear;
}
.ac-atb-bar[data-state="ready"] .ac-atb-bar__fill {
  background: var(--ac-atb-ready);
  animation: ac-atb-pulse 0.6s ease-in-out infinite alternate;
}
.ac-atb-bar[data-state="frozen"] .ac-atb-bar__fill {
  background: var(--ac-atb-frozen);
  animation: none;
}
.ac-atb-bar--enemy .ac-atb-bar__fill {
  background: var(--ac-atb-enemy-charge);
}
.ac-atb-bar--enemy[data-state="ready"] .ac-atb-bar__fill {
  background: var(--ac-atb-enemy-ready);
  animation: ac-atb-enemy-warn 0.4s ease-in-out infinite alternate;
}

@keyframes ac-atb-pulse {
  from { box-shadow: 0 0 4px var(--ac-atb-ready-glow); }
  to   { box-shadow: 0 0 12px var(--ac-atb-ready-glow), 0 0 2px #FFF inset; }
}
@keyframes ac-atb-enemy-warn {
  from { box-shadow: 0 0 4px var(--ac-atb-enemy-glow); }
  to   { box-shadow: 0 0 16px var(--ac-atb-enemy-glow); }
}

/* ---------- 3. 턴 큐 타임라인 ---------- */
.ac-turn-queue {
  display: flex;
  gap: 4px;
  padding: 6px 8px;
  background: var(--ac-turn-bg);
  border: 1px solid var(--ac-atb-frozen);
  border-radius: 3px;
}
.ac-turn-slot {
  width: 32px; height: 32px;
  border: 2px solid var(--ac-turn-queued);
  border-radius: 2px;
  image-rendering: pixelated;
  position: relative;
}
.ac-turn-slot[data-active="true"] {
  border-color: var(--ac-turn-active);
  box-shadow: 0 0 8px var(--ac-turn-active);
  transform: scale(1.1);
}
.ac-turn-slot[data-skipped="true"] {
  border-color: var(--ac-turn-skipped);
  opacity: 0.5;
}

/* ---------- 4. 대미지 팝업 ---------- */
.ac-dmg {
  position: absolute;
  font-family: var(--ac-font-pixel, monospace);
  font-weight: 700;
  text-shadow: 2px 2px 0 #000;
  pointer-events: none;
  animation: ac-dmg-float 0.9s ease-out forwards;
  image-rendering: pixelated;
  z-index: var(--ac-z-battle-popup);
}
.ac-dmg--normal   { font-size: 16px; color: var(--ac-dmg-normal); }
.ac-dmg--critical { font-size: 32px; color: var(--ac-dmg-critical); animation: ac-dmg-crit 0.9s ease-out forwards; }
.ac-dmg--heal     { font-size: 18px; color: var(--ac-dmg-heal); }
.ac-dmg--miss     { font-size: 14px; color: var(--ac-dmg-miss); font-style: italic; }
.ac-dmg--weak     { font-size: 22px; color: var(--ac-dmg-weak); }
.ac-dmg--resist   { font-size: 14px; color: var(--ac-dmg-resist); }
.ac-dmg--immune   { font-size: 14px; color: var(--ac-dmg-immune); }

@keyframes ac-dmg-float {
  0%   { transform: translateY(0)     scale(0.6); opacity: 0; }
  15%  { transform: translateY(-8px)  scale(1.1); opacity: 1; }
  100% { transform: translateY(-40px) scale(1);   opacity: 0; }
}
@keyframes ac-dmg-crit {
  0%   { transform: translateY(0)     scale(0.4); opacity: 0; }
  10%  { transform: translateY(-4px)  scale(1.4); opacity: 1; }
  30%  { transform: translateY(-12px) scale(1.1); }
  100% { transform: translateY(-50px) scale(1);   opacity: 0; }
}

/* ---------- 5. 스킬 카드 (명대사 등장) ---------- */
.ac-skill-cast-card {
  padding: 12px 20px;
  background: linear-gradient(180deg, #1A1A2E 0%, #0D0D1A 100%);
  border: 2px solid var(--ac-turn-active);
  border-radius: 4px;
  color: var(--ac-turn-active);
  font-family: var(--ac-font-pixel, monospace);
  font-size: 24px;
  text-shadow: 0 0 8px var(--ac-turn-active);
  animation: ac-skill-card-in 0.5s cubic-bezier(.2,.8,.2,1) both;
  image-rendering: pixelated;
}
@keyframes ac-skill-card-in {
  0%   { transform: translateX(-40px) scaleX(0); opacity: 0; }
  60%  { transform: translateX(0)     scaleX(1.05); opacity: 1; }
  100% { transform: translateX(0)     scaleX(1); opacity: 1; }
}

/* ---------- 6. 스킬 타입 뱃지 ---------- */
.ac-skill-badge {
  display: inline-block;
  width: 16px; height: 16px;
  border-radius: 2px;
  image-rendering: pixelated;
}
.ac-skill-badge--physical { background: var(--ac-skill-physical); }
.ac-skill-badge--magic    { background: var(--ac-skill-magic); }
.ac-skill-badge--heal     { background: var(--ac-skill-heal); }
.ac-skill-badge--buff     { background: var(--ac-skill-buff); }
.ac-skill-badge--debuff   { background: var(--ac-skill-debuff); }
.ac-skill-badge--ultimate {
  background: var(--ac-skill-ultimate);
  animation: ac-atb-pulse 1s ease-in-out infinite alternate;
}

/* ---------- 7. 접근성 ---------- */
@media (prefers-reduced-motion: reduce) {
  .ac-atb-bar[data-state="ready"] .ac-atb-bar__fill,
  .ac-atb-bar--enemy[data-state="ready"] .ac-atb-bar__fill,
  .ac-skill-badge--ultimate {
    animation: none;
  }
  .ac-dmg { animation-duration: 0.01ms; }
}
```

---

## 2. Phaser 상수 스펙 — `client/src/constants/battle-tokens.ts`

```ts
/**
 * Battle Design Tokens — SSOT for Phaser renderer
 * Mirrors design-system-battle.css. 숫자값 1:1 동기화 유지.
 */
export const BATTLE_COLORS = {
  atb: {
    empty:       0x2A2A3A,
    charging1:   0x3A5A7A,
    charging2:   0x5A7FA8,
    charging3:   0x7AAFD0,
    ready:       0x89CFF0,
    frozen:      0x4A4A5A,
    enemy:       0x8A3A3A,
    enemyReady:  0xFF4444,
  },
  turn: {
    active:      0xFFD700,
    queued:      0x89CFF0,
    skipped:     0x606060,
    bg:          0x14141F,
  },
  damage: {
    normal:      0xFFFFFF,
    critical:    0xFFD700,
    heal:        0x2ECC71,
    miss:        0xA0A0A0,
    weak:        0xFF6B35,
    resist:      0x3498DB,
    immune:      0x9B59B6,
  },
  skill: {
    physical:    0xC19A6B,
    magic:       0x9B59B6,
    heal:        0x2ECC71,
    buff:        0xF1C40F,
    debuff:      0x8E44AD,
    ultimate:    0xFF4D8B,
  },
} as const;

export const BATTLE_DEPTH = {
  background: 0,
  entity:    10,
  vfx:       20,
  hud:       30,
  popup:     40,
  modal:     50,
} as const;

export const BATTLE_TIMING = {
  atbTickMs:       80,      // 게이지 1% 차는 시간
  atbFullMs:       8000,    // 기본 1회전 (속도1.0 기준)
  skillCardMs:     500,     // 스킬명 카드 등장
  damagePopupMs:   900,     // 대미지 팝업 수명
  critPopupMs:     900,
  turnIndicatorMs: 200,     // 턴 큐 슬롯 슬라이드
} as const;

export const ATB_SPEED_MOD = {
  haste:  1.5,
  slow:   0.5,
  stop:   0.0,
  normal: 1.0,
} as const;
```

---

## 3. ATB 게이지 SVG 위젯 (3종)

### 3.1 아군 ATB (charging 상태)

```svg
<svg width="120" height="10" viewBox="0 0 120 10" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
  <rect x="0" y="0" width="120" height="10" fill="#2A2A3A" stroke="#4A4A5A"/>
  <defs>
    <linearGradient id="atb-charge" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"  stop-color="#3A5A7A"/>
      <stop offset="50%" stop-color="#5A7FA8"/>
      <stop offset="100%" stop-color="#7AAFD0"/>
    </linearGradient>
  </defs>
  <rect x="1" y="1" width="80" height="8" fill="url(#atb-charge)"/>
  <rect x="81" y="1" width="1" height="8" fill="#89CFF0" opacity="0.6"/>
</svg>
```

### 3.2 아군 ATB (ready — 가득찬 상태, 펄스)

```svg
<svg width="120" height="10" viewBox="0 0 120 10" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
  <rect x="0" y="0" width="120" height="10" fill="#2A2A3A" stroke="#89CFF0"/>
  <rect x="1" y="1" width="118" height="8" fill="#89CFF0">
    <animate attributeName="opacity" values="0.7;1;0.7" dur="0.6s" repeatCount="indefinite"/>
  </rect>
  <rect x="1" y="1" width="118" height="2" fill="#FFFFFF" opacity="0.4"/>
</svg>
```

### 3.3 적 ATB (경고 — 행동 임박)

```svg
<svg width="120" height="10" viewBox="0 0 120 10" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
  <rect x="0" y="0" width="120" height="10" fill="#3A2A2A" stroke="#FF4444"/>
  <rect x="1" y="1" width="118" height="8" fill="#FF4444">
    <animate attributeName="fill" values="#FF4444;#FFAA55;#FF4444" dur="0.4s" repeatCount="indefinite"/>
  </rect>
</svg>
```

---

## 4. 스킬 타입 아이콘 세트 (12종, 16×16 SVG)

> 원칙: **crispEdges · 단색+1px 아웃라인 · 2px 픽셀 그리드**

| ID | 이름 | 컬러 토큰 | 픽토그램 컨셉 |
|----|------|----------|---------------|
| `atk` | 공격 | `--ac-skill-physical` | 검 ⚔️ (사선) |
| `mag` | 마법 | `--ac-skill-magic` | 별⭐ + 궤적 |
| `heal` | 회복 | `--ac-skill-heal` | 십자+ |
| `buff` | 강화 | `--ac-skill-buff` | 상승 화살표↑ |
| `debuff` | 약화 | `--ac-skill-debuff` | 하강 화살표↓ |
| `ult` | 궁극기 | `--ac-skill-ultimate` | 6각별 + 글로우 |
| `def` | 방어 | `--ac-skill-physical` | 방패 |
| `item` | 아이템 | `--ac-text-primary` | 포션 병 |
| `escape` | 도주 | `--ac-text-secondary` | 발자국 |
| `wait` | 대기 | `--ac-atb-frozen` | 모래시계 |
| `swap` | 스왑 | `--ac-atb-ready` | 화살표 교차 |
| `chain` | 연계 | `--ac-skill-buff` | 체인 링크 |

**공격(atk) 아이콘 예시 SVG**:
```svg
<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
  <rect x="0" y="0" width="16" height="16" fill="none"/>
  <path d="M2,14 L4,12 L10,6 L12,8 L6,14 Z M11,3 L13,3 L13,5 L11,7 L9,5 Z" fill="#C19A6B" stroke="#000" stroke-width="1"/>
  <rect x="12" y="2" width="2" height="2" fill="#FFD700"/>
</svg>
```

**궁극기(ult) 아이콘 예시 SVG**:
```svg
<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">
  <rect width="16" height="16" fill="none"/>
  <polygon points="8,1 10,6 15,7 11,10 12,15 8,12 4,15 5,10 1,7 6,6" fill="#FF4D8B" stroke="#000"/>
  <circle cx="8" cy="8" r="2" fill="#FFD700">
    <animate attributeName="r" values="2;3;2" dur="1s" repeatCount="indefinite"/>
  </circle>
</svg>
```

나머지 10개 아이콘은 `docs/art-production/icon-design/overview.md`에 동일 규격으로 계섬월이 생성 요청 → 이소화가 SVG 옵티마이즈.

---

## 5. 상태이상 아이콘 확장 (12×12, 신규 8종)

기존 8종(`assets-sprint-improvement.md §3`) + **ATB 전투 전용 8종** 신규:

| ID | 이름 | 컬러 | 효과 |
|----|------|------|------|
| `atb-freeze` | ATB 정지 | `#89CFF0` | 게이지 얼음 결정 |
| `atb-slow` | ATB 감속 | `#4A4A5A` | 거북이 실루엣 |
| `atb-haste` | ATB 가속 | `#FFD700` | 번개 지그재그 |
| `reflect` | 반사 | `#9B59B6` | 거울 |
| `counter` | 카운터 | `#FF6B35` | 붉은 원 + 칼 |
| `regen` | 재생 | `#2ECC71` | 녹색 나선 |
| `doom` | 카운트다운 | `#6A1B1B` | 해골 + 숫자 |
| `berserk` | 광폭화 | `#FF4444` | 붉은 눈 |

**ATB 정지(atb-freeze) 12×12 SVG**:
```svg
<svg width="12" height="12" viewBox="0 0 12 12" shape-rendering="crispEdges">
  <rect width="12" height="12" fill="#14141F"/>
  <path d="M6,1 L6,11 M1,6 L11,6 M2,2 L10,10 M10,2 L2,10" stroke="#89CFF0" stroke-width="1"/>
  <circle cx="6" cy="6" r="1.5" fill="#FFF"/>
</svg>
```

---

## 6. 전투 화면 ASCII 레이아웃 목업 (1920×1080 FHD 기준)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [턴 큐 타임라인]  ◆ 에리언 → ★ 고블린A → ◆ 루시안 → ◆ 세라 → ★ 고블린B    │ z=30
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                                                                              │
│                         [배경: 에레보스 폐허]                                  │ z=0
│                                                                              │
│                                                                              │
│      ┌────────────┐                              ┌────────────┐              │
│      │  고블린 A   │                              │ 고블린 B    │              │ z=10
│      │   HP ▓▓▓░  │                              │  HP ▓░░░░   │              │
│      │  ATB ▓▓▓▓  │◀ 경고                         │ ATB ▓▓░░░   │              │
│      └────────────┘                              └────────────┘              │
│                                                                              │
│                           ★ CRITICAL 1247! ★                                 │ z=40
│                                                                              │
│                                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│  파티 상태 (좌)                              │  커맨드 패널 (우)                  │
│  ┌──────────────┐  ┌──────────────┐          │  ┌─────────────────────────┐   │
│  │ 에리언 Lv.32  │  │ 루시안 Lv.30  │          │  │ ▶ 공격                   │   │ z=30
│  │ HP 420/500   │  │ HP 380/400   │          │  │   마법                   │   │
│  │ MP 120/200   │  │ MP  80/150   │          │  │   아이템                 │   │
│  │ ATB ▓▓▓▓░    │  │ ATB ▓░░░░    │          │  │   방어                   │   │
│  │ [독] [가속]   │  │ [—]           │          │  │   도주                   │   │
│  └──────────────┘  └──────────────┘          │  └─────────────────────────┘   │
│  ┌──────────────┐  ┌──────────────┐          │  콤보 게이지: C ▓▓▓░░ → B       │
│  │ 세라 Lv.31   │  │ 카엘 Lv.29   │          │                                │
│  │ ...          │  │ ...          │          │                                │
│  └──────────────┘  └──────────────┘          │                                │
└──────────────────────────────────────────────────────────────────────────────┘

영역 비율:
 • 상단 턴 큐:          h=48px
 • 배틀 필드:           h=560px  (16:9 기준 메인 영역)
 • 하단 HUD:            h=240px
 • 파티 패널 4칸:       280×104px × 4 (2×2 그리드)
 • 커맨드 패널:         320×180px (우측 고정)
 • 콤보 게이지:         우측 하단, 320×36px
```

---

## 7. 턴 큐 타임라인 위젯 상세

### 구조

```
[◆ 에리언] [★ 고블린A] [◆ 루시안] [◆ 세라] [★ 고블린B] [◆ 카엘]
  active     queued       queued     queued    queued     queued
  (32×32)    (32×32)
  gold글로우  회색 테두리
```

### 슬롯 SVG

```svg
<svg width="32" height="32" viewBox="0 0 32 32" shape-rendering="crispEdges">
  <!-- 활성 슬롯 (턴 진행 중) -->
  <rect x="1" y="1" width="30" height="30" fill="#1A1A2E"
        stroke="#FFD700" stroke-width="2"/>
  <rect x="3" y="3" width="26" height="26" fill="#16213E"/>
  <!-- 캐릭터 초상 placeholder -->
  <rect x="8" y="8" width="16" height="16" fill="#89CFF0"/>
  <!-- 턴 번호 -->
  <text x="4" y="30" font-size="8" fill="#FFD700" font-family="monospace">1</text>
</svg>
```

---

## 8. 대미지 팝업 컴포넌트 상세

| 타입 | 폰트 | 컬러 | 크기 | 애니메이션 | 사운드 훅 |
|------|------|------|------|-----------|----------|
| Normal | Pixel | `#FFFFFF` | 16px | float 0.9s | `sfx/hit_01.ogg` |
| Critical | Pixel Bold | `#FFD700` | 32px | crit 0.9s (scale 1.4) | `sfx/hit_crit.ogg` + shake |
| Heal | Pixel | `#2ECC71` | 18px | float 0.9s (위로 +10px) | `sfx/heal.ogg` |
| Miss | Pixel Italic | `#A0A0A0` | 14px | fade 0.6s | `sfx/miss.ogg` |
| Weak! | Pixel Bold | `#FF6B35` | 22px | crit 0.9s + "WEAK!" 텍스트 | `sfx/weak.ogg` |
| Resist | Pixel | `#3498DB` | 14px | float 0.7s | `sfx/resist.ogg` |
| Immune | Pixel | `#9B59B6` | 14px | float 0.7s | `sfx/immune.ogg` |

**크리티컬 연출 추가 효과**:
- 카메라 쉐이크: `camera.shake(150, 0.005)`
- 화이트 플래시: 0.1s alpha 0.4 흰색 레이어
- 타격 대상 slightly red tint 0.15s

---

## 9. 구현 우선순위 (Build 단계 인계)

| P | 작업 | 담당 | 산출물 |
|---|------|------|--------|
| P0 | `design-system-battle.css` 생성 + 링크 | 계섬월 | `client/src/styles/design-system-battle.css` |
| P0 | `battle-tokens.ts` 상수 생성 | 계섬월 | `client/src/constants/battle-tokens.ts` |
| P0 | ATB 게이지 CSS 위젯 3종 적용 | 계섬월 | HUD 컴포넌트 |
| P1 | 대미지 팝업 컴포넌트 구현 | 계섬월 | `client/src/game/ui/DamagePopup.ts` |
| P1 | 스킬 타입 아이콘 12종 SVG 에셋화 | 이소화 | `client/public/icons/skill/*.svg` |
| P1 | 턴 큐 타임라인 위젯 구현 | 계섬월 | `client/src/game/ui/TurnQueue.ts` |
| P2 | 신규 상태이상 아이콘 8종 | 이소화 | `client/public/icons/status/*.svg` |
| P2 | 스킬 카드 등장 애니메이션 | 계섬월 | `ac-skill-cast-card` 적용 |
| P3 | 접근성 미디어쿼리 검증 | 가춘운 | QA 리포트 |

---

## 10. QA 체크리스트 (Review 단계)

- [ ] ATB 게이지 100% 도달 시 펄스 글로우 정상 작동 (60fps)
- [ ] 크리티컬 팝업이 일반 팝업 대비 2배 크기로 표시
- [ ] 적 ATB ready 시 붉은 경고 색상 + 진동 애니메이션
- [ ] 턴 큐 active 슬롯만 금색 테두리 + scale 1.1
- [ ] 12종 스킬 아이콘 모두 16×16 그리드 정렬, crispEdges
- [ ] `prefers-reduced-motion` 시 모든 펄스·플로트 애니메이션 정지
- [ ] `prefers-contrast: more` 시 경계선 +1px 굵어짐
- [ ] 색약 모드: 대미지 컬러 외 폰트 굵기·이탤릭 중복 표기
- [ ] 1920×1080 / 1440×900 / 1280×800 3단계 레이아웃 무너짐 없음

---

## 11. 팀 인계 메시지 💌

- **계섬월 언니** ⚔️ — CSS·TS 토큰 파일 2개만 먼저 뚝딱 깔아주시면 바로 HUD 붙일 수 있어요!
- **이소화** ✨ — 아이콘 20종(스킬12+상태이상8) SVG 옵티마이즈 부탁해요~!
- **심요연** 📊 — 애니메이션 FPS/번들 크기 Build 끝나고 측정 부탁드려요!
- **진채봉 언니** 📜 — 릴리즈 노트에 "FF6 스타일 ATB HUD 리뉴얼" 임팩트 컷 넣어주세요!

---

**버전**: v1.0 (2026-04-22)
**다음 단계**: Build — 계섬월이 `design-system-battle.css` + `battle-tokens.ts`부터 착수
