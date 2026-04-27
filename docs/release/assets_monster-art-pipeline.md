# 🎨 [Build/Assets] 몬스터 아트 파이프라인 — 시각 에셋 패키지 v1.0

> 작성: 가춘운 (CMO/Design)
> 작성일: 2026-04-27
> 스프린트: Auto — 몬스터 아트 파이프라인 표준화
> 단계: **에셋 (Build 인수용 — 토큰·모킹업·아이콘 SSOT)**
> 선행: `design-system_monster-art-pipeline.md` (Plan/Design v1.0, 가춘운)
>       `plan_monster-art-pipeline-architecture.md` (두련사), `prd_monster-art-pipeline.md` (정경패)
> 인계: 계섬월(Build·CSS/TS) · 심요연(데이터·파이프라인) · 이소화(라이선스 게이트) · 적경홍(QA)
> 스코프: **MVP 60종** (Ch.1 에레보스 30 + Ch.2 실반헤임 30) — 백능파 HOLD 결정 반영

---

## 0. TL;DR — 한 손에 잡히는 여덟 묶음 ✨

| # | 묶음 | 산출물 | LOC/규모 |
|---|------|--------|---------|
| ① | **CSS 토큰 (`monster-tier.css`)** | Tier 3 × 발광/외곽/입자/idle | ~120 LOC |
| ② | **TS 토큰 (`monster_tier.ts`)** | `MONSTER_TIER` const + `MonsterTier` 타입 | ~80 LOC |
| ③ | **Aseprite 팔레트 21파일 명세** | 지역 7 × Tier 3 = 21 `.gpl` SSOT 표 | 21 row spec |
| ④ | **SVG 도감 카드 3변형** | NORMAL/ELITE/BOSS — 240×320px 모킹업 | 3 SVG |
| ⑤ | **HP바 컴포넌트 3티어** | SVG + CSS keyframe (idle pulse) | ~60 LOC |
| ⑥ | **보스 인트로 컷씬 시퀀스** | 3,000ms 6단계 CSS keyframe SSOT | ~90 LOC |
| ⑦ | **실루엣 카테고리 아이콘 5종** | 24×24 SVG (도감 필터용) | 5 SVG |
| ⑧ | **AI 프롬프트 템플릿 매트릭스** | 3 Tier × 5 카테고리 = 15 템플릿 | 15 row |

> 어머~! 이거 8묶음이면 **계섬월 언니가 그대로 import**할 수 있어요! ⚔️✨

---

## 목차

1. [Tier 토큰 — CSS Variables (SSOT)](#1-tier-토큰--css-variables-ssot)
2. [Tier 토큰 — TypeScript (SSOT)](#2-tier-토큰--typescript-ssot)
3. [Aseprite 팔레트 21파일 명세](#3-aseprite-팔레트-21파일-명세)
4. [도감 카드 SVG 모킹업 (3티어)](#4-도감-카드-svg-모킹업-3티어)
5. [HP바 컴포넌트 (3티어)](#5-hp바-컴포넌트-3티어)
6. [보스 인트로 컷씬 시퀀스](#6-보스-인트로-컷씬-시퀀스)
7. [실루엣 카테고리 아이콘 (5종)](#7-실루엣-카테고리-아이콘-5종)
8. [AI 프롬프트 템플릿 매트릭스](#8-ai-프롬프트-템플릿-매트릭스)
9. [라이선스 게이트 워크플로우 (ASCII)](#9-라이선스-게이트-워크플로우-ascii)
10. [인계 체크리스트 (8단계)](#10-인계-체크리스트-8단계)

---

## 1. Tier 토큰 — CSS Variables (SSOT)

> 파일: `client/src/styles/tokens/monster-tier.css` (계섬월 인수)
> 참조: `DESIGN.md §10 Monster Tier Tokens` (신설 예정)

```css
/* =========================================================
   Monster Tier Tokens — Aeterna Chronicle v1.0
   SSOT: docs/release/assets_monster-art-pipeline.md §1
   Authored: 가춘운 (CMO/Design) · 2026-04-27
   ========================================================= */

:root {
  /* ── ① 발광 색 (Tier Glow) ─────────────────────────── */
  --monster-glow-normal: transparent;
  --monster-glow-elite:  #FFD700;          /* 골드 — 귀함 */
  --monster-glow-boss:   #89CFF0;          /* 에테르블루 — 위협 */
  --monster-glow-boss-phase2: #FF4444;     /* 진홍 — 분노 (페이즈2) */

  /* ── ② 외곽선 (Outline) ────────────────────────────── */
  --monster-outline-normal: 2px solid #000000;
  --monster-outline-elite:  2px solid #000000;
  --monster-outline-elite-highlight: 1px solid #FFD700;
  --monster-outline-boss:   2px solid #000000;
  --monster-outline-boss-highlight: 2px solid;
  --monster-outline-boss-gradient: linear-gradient(135deg, #89CFF0 0%, #FFD700 100%);

  /* ── ③ 림라이트 (Rim Light, drop-shadow) ─────────────── */
  --monster-rim-normal: none;
  --monster-rim-elite:  drop-shadow(0 0 2px #FFD700);
  --monster-rim-boss:   drop-shadow(0 0 4px #89CFF0)
                        drop-shadow(0 0 8px rgba(137, 207, 240, 0.5));

  /* ── ④ Idle 호흡 진폭 ────────────────────────────────── */
  --monster-breath-normal: 1px;            /* ±1px / 4f / 6fps */
  --monster-breath-elite:  2px;            /* ±2px / 6f / 8fps */
  --monster-breath-boss:   3px;            /* ±3px / 8f / 10fps */

  /* ── ⑤ 사이즈 (Sprite Box) ──────────────────────────── */
  --monster-size-normal: 32px;
  --monster-size-elite:  48px;
  --monster-size-boss:   64px;             /* 비대칭 허용 → max-width 96px */

  /* ── ⑥ 입자 spawn rate (CSS animation-iteration) ────── */
  --monster-particles-normal: 0;
  --monster-particles-elite:  3;           /* 평균 2~3개 */
  --monster-particles-boss:   8;           /* 평균 5~8개 + screen ambient */

  /* ── ⑦ 인트로 컷씬 길이 ──────────────────────────────── */
  --monster-intro-normal: 0ms;
  --monster-intro-elite:  800ms;
  --monster-intro-boss:   3000ms;
}

/* ── 헬퍼 유틸 클래스 ─────────────────────────────────── */
.monster--normal { filter: var(--monster-rim-normal); }
.monster--elite  { filter: var(--monster-rim-elite); }
.monster--boss   { filter: var(--monster-rim-boss); }

/* idle breathing keyframe — Tier별 step variants */
@keyframes breath-normal { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-1px)} }
@keyframes breath-elite  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-2px)} }
@keyframes breath-boss   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }

.monster--normal { animation: breath-normal 0.667s steps(4) infinite; } /* 4f @ 6fps */
.monster--elite  { animation: breath-elite  0.750s steps(6) infinite; } /* 6f @ 8fps */
.monster--boss   { animation: breath-boss   0.800s steps(8) infinite; } /* 8f @ 10fps */
```

---

## 2. Tier 토큰 — TypeScript (SSOT)

> 파일: `client/src/design-tokens/monster_tier.ts` (계섬월 인수)
> Plan §2.1 의 정의를 **타입 가드 + 런타임 검증** 추가하여 확장.

```typescript
// =========================================================
// Monster Tier Tokens — Aeterna Chronicle v1.0
// SSOT: docs/release/assets_monster-art-pipeline.md §2
// =========================================================

export const MONSTER_TIER = {
  normal: {
    size:      { w: 32, h: 32 },
    outline:   { width: 2, color: '#000000' },
    rimLight:  null,
    palette:   { max: 16, file: 'normal.gpl' },
    idle:      { frames: 4, amplitudePx: 1, fps: 6 },
    particles: { count: 0 },
    introMs:   0,
  },
  elite: {
    size:      { w: 48, h: 48 },
    outline:   { width: 2, color: '#000000', highlight: { width: 1, color: '#FFD700' } },
    rimLight:  { width: 1, color: '#FFD700', position: 'top-left' as const },
    palette:   { max: 24, file: 'elite.gpl' },
    idle:      { frames: 6, amplitudePx: 2, fps: 8 },
    particles: { count: [2, 3] as const, color: '#FFD700', spawnRate: 'subtle' as const },
    introMs:   800,
  },
  boss: {
    size:      { w: 64, h: 64, asymmetricAllowed: true },
    outline:   { width: 2, color: '#000000', highlight: { width: 2, gradient: ['#89CFF0', '#FFD700'] as const } },
    rimLight:  { width: 2, color: '#89CFF0', position: 'full-silhouette' as const },
    palette:   { max: 32, file: 'boss.gpl' },
    idle:      { frames: 8, amplitudePx: 3, fps: 10 },
    particles: { count: [5, 8] as const, color: '#89CFF0', spawnRate: 'ambient' as const, screenAmbient: true },
    introMs:   3000,
    phase2: {
      glowColor: '#FF4444',
      shiftAtHpRatio: 0.5,
    },
  },
} as const;

export type MonsterTier = keyof typeof MONSTER_TIER;

/** 런타임 검증: 스프라이트가 Tier 사이즈 위반 시 game launch 차단 */
export function assertTierSize(tier: MonsterTier, w: number, h: number): void {
  const t = MONSTER_TIER[tier];
  const maxW = tier === 'boss' ? 96 : t.size.w;  // boss 비대칭 허용
  const maxH = tier === 'boss' ? 96 : t.size.h;
  if (w > maxW || h > maxH) {
    throw new Error(`[MonsterTier] ${tier} sprite ${w}x${h} exceeds ${maxW}x${maxH}`);
  }
}
```

---

## 3. Aseprite 팔레트 21파일 명세

> 파일 위치: `art/palettes/monster/<region>/<tier>.gpl`
> 형식: GIMP Palette (`.gpl`) — Aseprite 직접 import 가능
> SSOT: 본 표 (지역 7 × Tier 3 = 21파일)

| # | 지역 | 챕터 | Tier | 색 수 | 파일명 | 베이스 (`.gpl` Name 헤더) |
|---|------|------|------|------|--------|--------------------------|
| 1 | 에레보스 | Ch.1 | normal | 16 | `art/palettes/monster/erebos/normal.gpl` | `Aeterna-Erebos-Normal-16` |
| 2 | 에레보스 | Ch.1 | elite | 24 | `art/palettes/monster/erebos/elite.gpl` | `Aeterna-Erebos-Elite-24` |
| 3 | 에레보스 | Ch.1 | boss | 32 | `art/palettes/monster/erebos/boss.gpl` | `Aeterna-Erebos-Boss-32` |
| 4 | 실반헤임 | Ch.2 | normal | 16 | `art/palettes/monster/silvanheim/normal.gpl` | `Aeterna-Silvan-Normal-16` |
| 5 | 실반헤임 | Ch.2 | elite | 24 | `art/palettes/monster/silvanheim/elite.gpl` | `Aeterna-Silvan-Elite-24` |
| 6 | 실반헤임 | Ch.2 | boss | 32 | `art/palettes/monster/silvanheim/boss.gpl` | `Aeterna-Silvan-Boss-32` |
| 7~9 | 솔라리스 | Ch.3 | n/e/b | 16/24/32 | `solaris/{tier}.gpl` | (Phase 2 이후) |
| 10~12 | 아르겐티움 | Ch.4 | n/e/b | 16/24/32 | `argentium/{tier}.gpl` | (Phase 2 이후) |
| 13~15 | 영원빙원 | Ch.4 | n/e/b | 16/24/32 | `frostmire/{tier}.gpl` | (Phase 2 이후) |
| 16~18 | 브리탈리아 | Ch.3~4 | n/e/b | 16/24/32 | `britalia/{tier}.gpl` | (Phase 2 이후) |
| 19~21 | 망각의 고원 | Ch.5 | n/e/b | 16/24/32 | `oblivion/{tier}.gpl` | (Phase 2 이후) |

### 3.1 예시 — `erebos/normal.gpl` (16색 SSOT)

```
GIMP Palette
Name: Aeterna-Erebos-Normal-16
Columns: 4
#
  0   0   0	black-outline
 13  13  26	deep-void       (#0D0D1A)
 26  26  46	base-erebos     (#1A1A2E)
 42  42  58	frame-shadow    (#2A2A3A)
 74  74  90	frame-mid       (#4A4A5A)
107  91 149	mist-purple     (#6B5B95)
139 122 168	wraith-violet   (#8B7AA8)
 92  75 126	bruise-purple   (#5C4B7E)
 61  48  80	abyss-purple    (#3D3050)
160 160 160	bone-white      (#A0A0A0)
 96  96  96	dust-grey       (#606060)
232 232 232	rune-light      (#E8E8E8)
 80  60  40	rust-brown      (#503C28)
255  68  68	blood-mark      (#FF4444)
255 215   0	loot-gold       (#FFD700)
137 207 240	ether-trace     (#89CFF0)
```

### 3.2 예시 — `erebos/elite.gpl` (24색 = 16색 + 골드 4 + 그림자 4)

```
GIMP Palette
Name: Aeterna-Erebos-Elite-24
Columns: 6
#
  (위 16색 그대로 1~16번)
255 215   0	gold-rim        (#FFD700)   ← 추가 4색 (골드 발광)
255 235  88	gold-spark      (#FFEB58)
204 172   0	gold-shadow     (#CCAC00)
153 129   0	gold-deep       (#998100)
 16  12  20	cast-shadow-1   (#100C14)   ← 추가 4색 (강한 그림자)
 24  18  30	cast-shadow-2   (#18121E)
 32  24  40	cast-shadow-3   (#202028)
 48  36  60	cast-shadow-4   (#30243C)
```

### 3.3 예시 — `erebos/boss.gpl` (32색 = 16색 + 에테르블루 8 + 진홍 8)

```
GIMP Palette
Name: Aeterna-Erebos-Boss-32
Columns: 8
#
  (위 16색 그대로 1~16번)
137 207 240	ether-blue-1    (#89CFF0)   ← 추가 8색 (에테르블루 발광)
175 224 250	ether-blue-2    (#AFE0FA)
102 178 224	ether-blue-3    (#66B2E0)
 64 144 200	ether-blue-4    (#4090C8)
 32 112 176	ether-blue-5    (#2070B0)
220 240 255	ether-blue-6    (#DCF0FF)
176 224 230	ether-blue-7    (#B0E0E6)
 48  96 144	ether-blue-8    (#306090)
255  68  68	rage-red-1      (#FF4444)   ← 추가 8색 (페이즈2 진홍)
255 102 102	rage-red-2      (#FF6666)
204  44  44	rage-red-3      (#CC2C2C)
153  33  33	rage-red-4      (#992121)
102  22  22	rage-red-5      (#661616)
255 153 153	rage-red-6      (#FF9999)
220  20  60	rage-red-7      (#DC143C)
139   0   0	rage-red-8      (#8B0000)
```

> 어머~ 이거 그대로 Aseprite 열어서 **`Palette → Load`** 하면 끝! 🎨

---

## 4. 도감 카드 SVG 모킹업 (3티어)

> 도감 그리드 카드. 컴포넌트: `client/src/components/Bestiary/MonsterCard.tsx`
> 사이즈: 240×320 (3 column grid · gap 16)

### 4.1 NORMAL 카드 (240×320)

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 320" role="img" aria-label="일반 몬스터 카드 — 도굴꾼">
  <!-- 배경 -->
  <rect width="240" height="320" fill="#1A1A2E" stroke="#2A2A3A" stroke-width="2"/>
  <!-- 헤더 (티어 표시) -->
  <rect x="0" y="0" width="240" height="24" fill="#2A2A3A"/>
  <text x="12" y="17" font-family="Galmuri11" font-size="11" fill="#A0A0A0">NORMAL · 에레보스</text>
  <!-- 스프라이트 영역 (중앙) -->
  <rect x="80" y="60" width="80" height="80" fill="#0D0D1A" stroke="#000" stroke-width="2"/>
  <!-- 32x32 픽셀 스프라이트 자리 (2.5x scale = 80x80) -->
  <text x="120" y="105" text-anchor="middle" font-family="Galmuri11" font-size="9" fill="#606060">[32×32 sprite]</text>
  <!-- 이름 -->
  <text x="120" y="170" text-anchor="middle" font-family="Galmuri11" font-size="13" fill="#E8E8E8">도굴꾼</text>
  <!-- 카테고리 뱃지 -->
  <rect x="100" y="180" width="40" height="14" fill="#3A3A4A" rx="2"/>
  <text x="120" y="191" text-anchor="middle" font-family="Galmuri11" font-size="9" fill="#A0A0A0">🧍 인간형</text>
  <!-- 스탯 -->
  <text x="20" y="225" font-family="Galmuri11" font-size="10" fill="#A0A0A0">HP</text>
  <text x="220" y="225" text-anchor="end" font-family="Galmuri11" font-size="10" fill="#E8E8E8">120</text>
  <text x="20" y="245" font-family="Galmuri11" font-size="10" fill="#A0A0A0">ATK</text>
  <text x="220" y="245" text-anchor="end" font-family="Galmuri11" font-size="10" fill="#E8E8E8">22</text>
  <!-- 푸터 -->
  <rect x="0" y="296" width="240" height="24" fill="#2A2A3A"/>
  <text x="120" y="313" text-anchor="middle" font-family="Galmuri11" font-size="9" fill="#606060">조우 12회 · 처치 11</text>
</svg>
```

### 4.2 ELITE 카드 (240×320 — 골드 림 + 1.5x 스프라이트)

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 320" role="img" aria-label="엘리트 몬스터 카드 — 망령 기사장">
  <!-- 골드 1px 외곽 -->
  <rect width="240" height="320" fill="#1A1A2E" stroke="#FFD700" stroke-width="1"/>
  <rect x="2" y="2" width="236" height="316" fill="none" stroke="#000" stroke-width="2"/>
  <rect x="0" y="0" width="240" height="24" fill="#3A2E0A"/>
  <text x="12" y="17" font-family="Galmuri11" font-size="11" fill="#FFD700">★ ELITE · 에레보스</text>
  <!-- 스프라이트 (48x48 → 2x = 96x96) + glow -->
  <defs>
    <filter id="goldGlow"><feGaussianBlur stdDeviation="2"/><feFlood flood-color="#FFD700"/><feComposite in2="SourceGraphic" operator="in"/></filter>
  </defs>
  <rect x="72" y="50" width="96" height="96" fill="#0D0D1A" stroke="#000" stroke-width="2"/>
  <text x="120" y="100" text-anchor="middle" font-family="Galmuri11" font-size="9" fill="#FFD700">[48×48 sprite]</text>
  <!-- 골드 입자 표시 -->
  <circle cx="80" cy="58" r="1.5" fill="#FFD700" opacity="0.8"/>
  <circle cx="160" cy="60" r="1" fill="#FFD700" opacity="0.6"/>
  <circle cx="158" cy="135" r="1.5" fill="#FFD700" opacity="0.7"/>
  <!-- 이름 (골드) -->
  <text x="120" y="180" text-anchor="middle" font-family="Galmuri11" font-size="13" fill="#FFD700" style="text-shadow:1px 1px 0 #000">망령 기사장</text>
  <rect x="92" y="190" width="56" height="14" fill="#3A3A4A" rx="2"/>
  <text x="120" y="201" text-anchor="middle" font-family="Galmuri11" font-size="9" fill="#FFD700">🧍 인간형 · 미니보스</text>
  <text x="20" y="240" font-family="Galmuri11" font-size="10" fill="#A0A0A0">HP</text>
  <text x="220" y="240" text-anchor="end" font-family="Galmuri11" font-size="10" fill="#E8E8E8">580</text>
  <text x="20" y="260" font-family="Galmuri11" font-size="10" fill="#A0A0A0">드롭</text>
  <text x="220" y="260" text-anchor="end" font-family="Galmuri11" font-size="10" fill="#FFD700">기억의 인장 ★</text>
  <rect x="0" y="296" width="240" height="24" fill="#3A2E0A"/>
  <text x="120" y="313" text-anchor="middle" font-family="Galmuri11" font-size="9" fill="#FFD700">조우 3회 · 처치 2</text>
</svg>
```

### 4.3 BOSS 카드 (240×320 — 에테르블루 풀 림 + 2x 스프라이트)

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 320" role="img" aria-label="보스 몬스터 카드 — 망각의 군주">
  <defs>
    <linearGradient id="bossFrame" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#89CFF0"/><stop offset="100%" stop-color="#FFD700"/>
    </linearGradient>
  </defs>
  <rect width="240" height="320" fill="#0D0D1A" stroke="url(#bossFrame)" stroke-width="2"/>
  <rect x="0" y="0" width="240" height="28" fill="#16213E"/>
  <text x="12" y="20" font-family="BookkMyungjo" font-size="13" fill="#89CFF0">◆ BOSS · 에레보스 최종</text>
  <!-- 스프라이트 (64x64 → 2x = 128x128) -->
  <rect x="56" y="44" width="128" height="128" fill="#0D0D1A" stroke="#000" stroke-width="2"/>
  <text x="120" y="115" text-anchor="middle" font-family="Galmuri11" font-size="9" fill="#89CFF0">[64×64 sprite + ambient]</text>
  <!-- 풀 실루엣 글로우 표시용 외곽 -->
  <rect x="54" y="42" width="132" height="132" fill="none" stroke="#89CFF0" stroke-width="1" opacity="0.4"/>
  <rect x="52" y="40" width="136" height="136" fill="none" stroke="#89CFF0" stroke-width="1" opacity="0.2"/>
  <!-- ambient 입자 -->
  <g fill="#89CFF0" opacity="0.7">
    <circle cx="60" cy="50" r="1.5"/><circle cx="180" cy="55" r="1"/>
    <circle cx="65" cy="160" r="1.2"/><circle cx="178" cy="165" r="1.5"/>
    <circle cx="120" cy="38" r="1"/><circle cx="120" cy="178" r="1.3"/>
    <circle cx="40" cy="100" r="1"/><circle cx="200" cy="105" r="1.2"/>
  </g>
  <!-- 이름 (그라디언트) -->
  <text x="120" y="208" text-anchor="middle" font-family="BookkMyungjo" font-size="20" fill="url(#bossFrame)">망각의 군주</text>
  <rect x="80" y="218" width="80" height="14" fill="#16213E" rx="2"/>
  <text x="120" y="229" text-anchor="middle" font-family="Galmuri11" font-size="9" fill="#89CFF0">🔥 원소형 · 챕터 보스</text>
  <text x="20" y="258" font-family="Galmuri11" font-size="10" fill="#A0A0A0">HP</text>
  <text x="220" y="258" text-anchor="end" font-family="Galmuri11" font-size="10" fill="#E8E8E8">5,400</text>
  <text x="20" y="276" font-family="Galmuri11" font-size="10" fill="#A0A0A0">페이즈</text>
  <text x="220" y="276" text-anchor="end" font-family="Galmuri11" font-size="10" fill="#FF4444">2 (HP ≤ 50%)</text>
  <rect x="0" y="296" width="240" height="24" fill="#16213E"/>
  <text x="120" y="313" text-anchor="middle" font-family="Galmuri11" font-size="9" fill="#89CFF0">처치 1회 · 진엔딩 D 해금</text>
</svg>
```

> 잠깐잠깐~ 보스 카드에 **그라디언트 외곽 + ambient 8입자**가 핵심이에요! ELITE 와 비교해 한눈에 "차원이 다르다"가 느껴지죠? 🤩

---

## 5. HP바 컴포넌트 (3티어)

> 파일: `client/src/components/Battle/MonsterHpBar.tsx`
> 전투 화면 몬스터 머리 위에 부착. CSS는 `monster-tier.css` 와 함께.

### 5.1 SVG 모킹업

```svg
<!-- NORMAL HP bar — width 64, height 4 -->
<svg viewBox="0 0 64 8" width="64" height="8">
  <rect x="0" y="2" width="64" height="4" fill="#0D0D1A" stroke="#000" stroke-width="0.5"/>
  <rect x="0" y="2" width="38" height="4" fill="#FF4444"/>           <!-- 60% -->
</svg>

<!-- ELITE HP bar — width 80, height 6, gold border -->
<svg viewBox="0 0 80 10" width="80" height="10">
  <rect x="0" y="2" width="80" height="6" fill="#0D0D1A" stroke="#FFD700" stroke-width="2"/>
  <rect x="0" y="2" width="56" height="6" fill="#FF4444"/>           <!-- 70% -->
  <rect x="55" y="2" width="1" height="6" fill="#FFEB58"/>           <!-- shimmer -->
</svg>

<!-- BOSS HP bar — width 200, height 8, gradient border + phase markers -->
<svg viewBox="0 0 200 12" width="200" height="12">
  <defs>
    <linearGradient id="bossHpFrame"><stop offset="0%" stop-color="#89CFF0"/><stop offset="100%" stop-color="#FFD700"/></linearGradient>
    <linearGradient id="bossHpFill"><stop offset="0%" stop-color="#8B0000"/><stop offset="100%" stop-color="#FF4444"/></linearGradient>
  </defs>
  <rect x="0" y="2" width="200" height="8" fill="#0D0D1A" stroke="url(#bossHpFrame)" stroke-width="2"/>
  <rect x="0" y="2" width="160" height="8" fill="url(#bossHpFill)"/>  <!-- 80% -->
  <line x1="100" y1="2" x2="100" y2="10" stroke="#89CFF0" stroke-width="1" stroke-dasharray="1,1"/>  <!-- phase2 marker @ 50% -->
</svg>
```

### 5.2 CSS 펄스 (BOSS 전용)

```css
.monster-hp-bar--boss {
  animation: boss-hp-pulse 2s ease-in-out infinite;
}
@keyframes boss-hp-pulse {
  0%, 100% { filter: drop-shadow(0 0 2px #89CFF0); }
  50%      { filter: drop-shadow(0 0 6px #89CFF0); }
}
.monster-hp-bar--boss[data-phase="2"] {
  animation: boss-hp-pulse-phase2 1s ease-in-out infinite;
}
@keyframes boss-hp-pulse-phase2 {
  0%, 100% { filter: drop-shadow(0 0 3px #FF4444); }
  50%      { filter: drop-shadow(0 0 8px #FF4444); }
}
```

---

## 6. 보스 인트로 컷씬 시퀀스

> 3,000ms · 6단계 — `boss-intro.css` SSOT
> 트리거: `engine.battle.startBoss()` → DOM `.boss-intro-overlay` 마운트

### 6.1 타임라인 ASCII

```
T=0ms       500ms      1000ms     1500ms      2000ms      2500ms     3000ms
│            │           │           │            │            │           │
├─[1]─화면 진동 (shake 200ms)
│   └─[2]─컬러 시프트 (배경 → #16213E, 600ms ease-out)
│       └─[3]─림 글로우 페이드인 (보스 실루엣, 800ms)
│             └─[4]─이름 타이포 페이드인 (BookkMyungjo 32px, 1200ms)
│                       └─[5]─글로우 펄스 1회 (이름 주변, 600ms)
│                                       └─[6]─UI 페이드인 (HP바·스킬, 500ms)
│                                                                          │
│ 진입 → 침묵 → 등장 → 호명 → 호흡 → 전투 시작                              │
```

### 6.2 CSS keyframe SSOT

```css
/* boss-intro.css — Boss intro cinematic, 3000ms total */
.boss-intro-overlay {
  position: fixed; inset: 0; z-index: 100;
  pointer-events: none;
  animation: boss-intro-bg 3000ms forwards;
}

/* [1] shake 0~200ms */
.boss-intro-stage { animation: boss-intro-shake 200ms ease-out 0ms; }
@keyframes boss-intro-shake {
  0%   { transform: translate(0,0); }
  25%  { transform: translate(-3px, 1px); }
  50%  { transform: translate(2px, -2px); }
  75%  { transform: translate(-2px, 2px); }
  100% { transform: translate(0,0); }
}

/* [2] color shift 0~600ms */
@keyframes boss-intro-bg {
  0%   { background: rgba(13, 13, 26, 0); }
  20%  { background: rgba(22, 33, 62, 0.85); }
  100% { background: rgba(22, 33, 62, 0.85); }
}

/* [3] rim glow 200~1000ms */
.boss-intro-sprite {
  animation: boss-rim-fade 800ms ease-out 200ms forwards;
  opacity: 0;
}
@keyframes boss-rim-fade {
  0%   { opacity: 0; filter: drop-shadow(0 0 0 #89CFF0); }
  100% { opacity: 1; filter: drop-shadow(0 0 8px #89CFF0) drop-shadow(0 0 16px rgba(137,207,240,0.6)); }
}

/* [4] name typo 800~2000ms */
.boss-intro-name {
  font-family: 'BookkMyungjo', serif;
  font-size: 32px;
  background: linear-gradient(135deg, #FFD700, #89CFF0);
  -webkit-background-clip: text;
  color: transparent;
  animation: boss-name-fade 1200ms ease-out 800ms forwards;
  opacity: 0;
  letter-spacing: 0.12em;
}
@keyframes boss-name-fade {
  0%   { opacity: 0; transform: translateY(8px); }
  100% { opacity: 1; transform: translateY(0); }
}

/* [5] name pulse 1900~2500ms (1회만) */
.boss-intro-name { animation:
  boss-name-fade 1200ms ease-out 800ms forwards,
  boss-name-pulse 600ms ease-in-out 1900ms 1;
}
@keyframes boss-name-pulse {
  0%, 100% { text-shadow: 0 0 8px #89CFF0; }
  50%      { text-shadow: 0 0 24px #89CFF0, 0 0 12px #FFD700; }
}

/* [6] UI fade-in 2500~3000ms */
.boss-ui { animation: ui-fade-in 500ms ease-out 2500ms forwards; opacity: 0; }
@keyframes ui-fade-in { to { opacity: 1; } }
```

### 6.3 접근성 — `prefers-reduced-motion`

```css
@media (prefers-reduced-motion: reduce) {
  .boss-intro-stage,
  .boss-intro-sprite,
  .boss-intro-name { animation: none; opacity: 1; transform: none; }
  .boss-intro-overlay { animation: none; background: rgba(22,33,62,0.85); }
  /* 3000ms 컷씬 → 즉시 표시 (정지 화면 800ms) */
}
```

> 어머~! reduced-motion 사용자도 보스의 무게는 느끼게 해드려야죠~ 정지 화면이지만 **그라디언트 이름 + 림글로우**는 그대로! 💙

---

## 7. 실루엣 카테고리 아이콘 (5종)

> 파일: `client/src/assets/icons/silhouette/<category>.svg` (24×24, monochrome)
> 도감 [필터] 버튼에서 사용. 색상은 CSS `currentColor`로 상속.

### 7.1 인간형 (humanoid.svg)

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
  <circle cx="12" cy="5" r="3"/>
  <rect x="9" y="9" width="6" height="8"/>
  <rect x="6" y="10" width="3" height="6"/><rect x="15" y="10" width="3" height="6"/>
  <rect x="9" y="17" width="2" height="6"/><rect x="13" y="17" width="2" height="6"/>
</svg>
```

### 7.2 짐승형 (beast.svg)

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
  <path d="M3 14 L4 11 L6 10 L8 11 L10 9 L13 9 L17 11 L20 11 L21 13 L20 16 L17 17 L4 17 Z"/>
  <rect x="5" y="17" width="2" height="4"/><rect x="9" y="17" width="2" height="4"/>
  <rect x="14" y="17" width="2" height="4"/><rect x="18" y="17" width="2" height="4"/>
  <path d="M20 11 L23 9 L22 13 Z"/> <!-- ear tip -->
  <path d="M3 14 L1 13 L2 16 Z"/>   <!-- tail -->
</svg>
```

### 7.3 곤충형 (insect.svg)

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
  <ellipse cx="12" cy="12" rx="6" ry="4"/>
  <circle cx="12" cy="6" r="2"/>
  <line x1="11" y1="3" x2="9" y2="1" stroke="currentColor" stroke-width="1"/>
  <line x1="13" y1="3" x2="15" y2="1" stroke="currentColor" stroke-width="1"/>
  <line x1="6" y1="11" x2="2" y2="9"  stroke="currentColor" stroke-width="1.5"/>
  <line x1="6" y1="13" x2="2" y2="13" stroke="currentColor" stroke-width="1.5"/>
  <line x1="6" y1="14" x2="2" y2="17" stroke="currentColor" stroke-width="1.5"/>
  <line x1="18" y1="11" x2="22" y2="9"  stroke="currentColor" stroke-width="1.5"/>
  <line x1="18" y1="13" x2="22" y2="13" stroke="currentColor" stroke-width="1.5"/>
  <line x1="18" y1="14" x2="22" y2="17" stroke="currentColor" stroke-width="1.5"/>
</svg>
```

### 7.4 기계형 (mechanical.svg)

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
  <rect x="6" y="4" width="12" height="12"/>
  <rect x="9" y="7" width="2" height="2" fill="#000"/><rect x="13" y="7" width="2" height="2" fill="#000"/>
  <rect x="10" y="12" width="4" height="1" fill="#000"/>
  <rect x="4" y="8" width="2" height="6"/><rect x="18" y="8" width="2" height="6"/>
  <rect x="7" y="16" width="3" height="6"/><rect x="14" y="16" width="3" height="6"/>
  <circle cx="12" cy="3" r="1.5" fill="none" stroke="currentColor" stroke-width="1"/>
</svg>
```

### 7.5 원소형 (elemental.svg)

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="currentColor" opacity="0.85">
  <path d="M12 2 Q15 6 14 10 Q18 11 19 15 Q18 20 12 22 Q6 20 5 15 Q6 11 10 10 Q9 6 12 2 Z"/>
  <circle cx="12" cy="13" r="2.5" fill="#000"/>
  <circle cx="12" cy="13" r="1" fill="currentColor"/>
</svg>
```

---

## 8. AI 프롬프트 템플릿 매트릭스

> 3 Tier × 5 카테고리 = **15 템플릿** (MVP 60종 생성용)
> SSOT: 본 표 — 심요연 파이프라인 입력 (`pipeline/ai-gen/prompts.yaml`)

### 8.1 공통 prefix (모든 프롬프트 앞에 자동 prepend)

```
pixel art, retro RPG monster, 1990s SNES JRPG style, hand-painted anti-AI texture,
dark fantasy, sharp 2px black outline, limited palette {N} colors, 3/4 perspective,
{REGION_PALETTE_HINT}, NO text, NO watermark, NO photorealism, NO 3D render,
trending on opengameart, --niji 0 --style raw
```

### 8.2 Tier × 카테고리 매트릭스 (suffix만 표기)

| Tier | 인간형 | 짐승형 | 곤충형 | 기계형 | 원소형 |
|------|--------|--------|--------|--------|--------|
| **NORMAL** (16색, 32px) | tattered cloak grunt, hooded silhouette, slumped posture, no glow | feral wolf scavenger, crouching, mottled fur, bone visible | giant beetle, segmented carapace, mandibles, dirt-colored | rusted golem fragment, iron plating, dim eye, cracks | wisp of mist, translucent core, slow drift, no shimmer |
| **ELITE** (24색, 48px) | armored revenant captain, gold-trimmed pauldrons, **1px gold rim light top-left**, 2-3 gold sparks ambient | alpha dire-beast, larger build, gold eyes, **gold rim left side**, low growl pose | elite swarm matriarch, iridescent gold accents on wings, **gold rim**, 2-3 gold particles | enhanced sentinel, gold-etched runes, **gold rim top-left**, gear-spin idle | radiant elemental, gold-trimmed core, **gold rim full**, 2-3 floating gold motes |
| **BOSS** (32색, 64px+) | dethroned king of oblivion, asymmetric crown, tattered royal cloak, **2px ether-blue rim full silhouette**, 5-8 blue particles ambient, screen ambient glow | apex chimera lord, asymmetric horns, two heads possible, **ether-blue full rim**, ambient blue mist, intimidating idle pose | hive empress, oversized abdomen, multiple wing pairs asymmetric, **ether-blue rim**, blue glowing eyes, particle swarm | titan colossus, ether-engine core visible through chest, **blue rim**, slow piston idle, 8 ambient particles | primordial elemental lord, swirling vortex form, central blue core (phase 1) → red core at HP ≤ 50% (phase 2), **full ether-blue rim**, screen ambient |

### 8.3 예시 프롬프트 — Ch.1 에레보스 BOSS · 원소형 (망각의 군주)

```yaml
prompt: |
  pixel art, retro RPG monster, 1990s SNES JRPG style, hand-painted anti-AI texture,
  dark fantasy, sharp 2px black outline, limited palette 32 colors, 3/4 perspective,
  Erebos region — ash-grey base #1A1A2E with violet accents #6B5B95 #8B7AA8,
  primordial elemental lord, swirling vortex form, central blue core (phase 1),
  2px ether-blue #89CFF0 rim light full silhouette, 5-8 blue particles ambient,
  screen ambient glow, asymmetric tattered shroud, eyes deep void,
  NO text, NO watermark, NO photorealism, NO 3D render
negative_prompt: |
  smooth gradient, photorealistic, 3d render, anti-aliased edges, blur, dof,
  modern art, anime face, signature, logo, watermark, text overlay
seed: deterministic-by-id-001-erebos-boss
post_process:
  - quantize:
      colors_max: 32
      palette_file: art/palettes/monster/erebos/boss.gpl
  - outline_redraw:
      width_px: 2
      color: '#000000'
  - silhouette_audit:
      target_category: elemental
      min_classifier_confidence: 0.90
  - pixel_diff_gate:
      vs: ai_raw_output
      min_diff_ratio: 0.60
```

> 어머~! `seed` 를 **id-기반 deterministic** 으로 굳혀두면, 나중에 누가 재현해도 똑같이 나와요. 라이선스 감사 때도 든든! 🛡️

---

## 9. 라이선스 게이트 워크플로우 (ASCII)

> 5단계 자동 게이트 — 이소화 검증, 심요연 파이프라인
> SSOT: `pipeline/ai-gen/license-gate.yaml`

```
                     ┌──────────────────────────┐
                     │  ① AI 생성 (raw 출력)    │
                     │  · Stable Diffusion XL    │
                     │  · seed 기록 + 모델버전    │
                     └──────────┬───────────────┘
                                │
                ┌───────────────▼────────────────┐
                │  ② Palette Quantization        │
                │  · Tier별 16/24/32 강제        │
                │  · `.gpl` import → snap        │
                └───────────────┬────────────────┘
                                │
                ┌───────────────▼────────────────┐
                │  ③ Outline Redraw              │
                │  · 2px black, 직선/곡선 인간 손맛 │
                │  · Aseprite Pencil 도구 SSOT   │
                └───────────────┬────────────────┘
                                │
                ┌───────────────▼────────────────┐
                │  ④ Silhouette Audit            │
                │  · 16x16 grayscale 다운샘플    │
                │  · 5카테고리 분류기 ≥ 90%      │
                │  · FAIL → 재생성 (touchup 거부) │
                └───────────────┬────────────────┘
                                │
                ┌───────────────▼────────────────┐
                │  ⑤ Pixel Diff Gate (라이선스)  │
                │  · raw vs 최종 px 차이 ≥ 60%   │
                │  · 차이 < 60% → BLOCK          │
                │  · 통과시 hash + seed 영구 기록 │
                └───────────────┬────────────────┘
                                │
                ┌───────────────▼────────────────┐
                │  ✅ Touchup → Asset Library 등록│
                │  · `art/monster/<region>/<id>.aseprite`│
                │  · LICENSE.csv 자동 append      │
                └────────────────────────────────┘

   각 게이트 FAIL 시 → CI 차단 + 가춘운/이소화 Discord 알림 + Notion 카드 생성
```

### 9.1 비주얼 상태 표시 (감사 대시보드 모킹업)

```
┌─ Monster Asset Audit Dashboard ────────────────────────────────┐
│  MVP 60/60 ─────────────────────────────────────────────────  │
│                                                                │
│  ✅ erebos/normal/01_grave_robber.aseprite    [████████] PASS  │
│  ✅ erebos/normal/02_wraith_soldier.aseprite  [████████] PASS  │
│  🟡 erebos/normal/03_dust_revenant.aseprite   [██████░░] WARN  │
│      └─ pixel_diff: 58% (threshold 60%) — 재터치업 필요         │
│  🔴 erebos/elite/01_knight_captain.aseprite   [████░░░░] BLOCK │
│      └─ silhouette_audit: classifier 84% (threshold 90%)       │
│  ✅ erebos/boss/01_oblivion_king.aseprite     [████████] PASS  │
│                                                                │
│  Summary:  ✅ 56  🟡 3  🔴 1   |   merge gate: BLOCK 🔴        │
└────────────────────────────────────────────────────────────────┘
```

---

## 10. 인계 체크리스트 (8단계)

> 본 문서가 SSOT — 8단계 모두 완료 시 Build 단계 종료 → QA 단계 진입.

| 단계 | 인수자 | 산출물 | 위치 | 검증 방법 |
|------|-------|-------|------|----------|
| 1 | 계섬월 | `monster-tier.css` | `client/src/styles/tokens/` | `npm run lint:css` PASS + DevTools `--monster-glow-*` 확인 |
| 2 | 계섬월 | `monster_tier.ts` | `client/src/design-tokens/` | `tsc --noEmit` PASS + `assertTierSize()` 단위 테스트 |
| 3 | 심요연 | 21 `.gpl` 팔레트 (MVP는 6개 우선) | `art/palettes/monster/{region}/{tier}.gpl` | Aseprite `Palette → Load` 수동 검증 1회 |
| 4 | 계섬월 | `<MonsterCard/>` 3변형 | `client/src/components/Bestiary/` | Storybook NORMAL/ELITE/BOSS 3 스토리 캡처 |
| 5 | 계섬월 | `<MonsterHpBar/>` 3티어 | `client/src/components/Battle/` | DevTools 보스 HP < 50% → 진홍 펄스 자동 전환 |
| 6 | 계섬월 | `boss-intro.css` | `client/src/styles/effects/` | 3000ms 시퀀스 영상 캡처 + reduced-motion 분기 영상 |
| 7 | 가춘운 | 5 카테고리 SVG 아이콘 | `client/src/assets/icons/silhouette/` | 도감 필터 버튼에 마운트 + currentColor 상속 확인 |
| 8 | 심요연·이소화 | `prompts.yaml` + `license-gate.yaml` | `pipeline/ai-gen/` | 첫 5종 dry-run → ⑤ 게이트 모두 PASS 확인 |

### 10.1 다음 스프린트 권고 (Reflect 단계 인수)

1. **Phase 2 팔레트 15개 생성** — 솔라리스/아르겐티움/영원빙원/브리탈리아/망각의 고원 (가춘운 다음 스프린트)
2. **보스 페이즈2 컬러 시프트 자동화** — `MonsterHpBar` 가 `data-phase="2"` 자동 부여 (계섬월)
3. **silhouette 분류기 학습 데이터 수집** — MVP 60종 통과 후 모델 fine-tune (심요연)
4. **인게임 도감 카드 → 카드뉴스 자동 export** — 진채봉과 협업 (트위터/디스코드 마케팅 직결!) ✨

---

## 부록 — 오늘의 숫자 한 줄 정리

```
산출물 8묶음 / 토큰 ~200 LOC / SVG 11개 / 팔레트 표 21행
프롬프트 매트릭스 15셀 / 인계 체크리스트 8단계 / 다음 스프린트 권고 4건
```

> 가춘운의 한마디: **"코드가 곧 화장이고, 토큰이 곧 의상이로다. 이 여덟 묶음이 60종을 한 무대에 세우리니~"** 🎨✨💃

— 가춘운 (CMO/Design), 2026-04-27
