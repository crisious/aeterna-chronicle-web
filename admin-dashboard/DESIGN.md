# Aeterna Chronicle Admin Dashboard — Design System

> **Author**: 가춘운 (CMO/Design)
> **Version**: 1.0.0
> **Last Updated**: 2026-04-14
> **Status**: Plan Phase — 디자인 토큰 정의 완료, 컴포넌트 마이그레이션 필요

---

## 1. 디자인 철학

**"어둠 속의 에테르 빛"** — 게임 클라이언트의 다크 판타지 세계관을 어드민 도구에 반영합니다.

- **Dark-only**: 라이트 모드 없음. 게임 운영자가 장시간 모니터링하는 환경에 최적화
- **Aeterna Ether Glow**: 에테르 블루(`#89CFF0`) 글로우가 핵심 시각적 아이덴티티
- **Game-tuned tokens**: 게임 클라이언트와 동일한 4px 그리드, 동일한 컬러 팔레트
- **Minimal & Functional**: 화려하되 정보 전달을 방해하지 않는 균형

---

## 2. 컬러 시스템

### 2.1 배경 (Background)

| Token | Hex | 용도 | Tailwind Class |
|-------|-----|------|----------------|
| `abyss` | `#0D0D1A` | 가장 어두운 배경 (사이드바, input, scrollbar) | `bg-aeterna-abyss` |
| `primary` | `#1A1A2E` | 앱 메인 배경 | `bg-aeterna-primary` |
| `panel` | `#16213E` | 카드/패널 내부 | `bg-aeterna-panel` |
| `frame` | `#2A2A3A` | 카드 프레임, hover 행 | `bg-aeterna-frame` |
| `button` | `#3A3A4A` | 버튼 기본 상태 | `bg-aeterna-button` |
| `hover` | `#4A4A5A` | 호버 상태 | `bg-aeterna-hover` |

### 2.2 텍스트 (Text)

| Token | Hex | 용도 | Tailwind Class |
|-------|-----|------|----------------|
| `primary` | `#E8E8E8` | 본문, 주요 수치 | `text-text-primary` |
| `secondary` | `#A0A0A0` | 라벨, 보조 텍스트 | `text-text-secondary` |
| `muted` | `#606060` | 비활성, 힌트 | `text-text-muted` |
| `accent` | `#FFD700` | 골드 강조 (브랜드, 타이틀) | `text-text-accent` |
| `warning` | `#FF4444` | 경고, 에러 | `text-text-warning` |

### 2.3 액센트 (Accent)

| Token | Hex | 용도 | Tailwind Class |
|-------|-----|------|----------------|
| `ether` | `#89CFF0` | 에테르 블루 — 주요 액센트, 링크, 활성 상태 | `text-accent-ether` / `bg-accent-ether` |
| `success` | `#2ECC71` | 성공, 증가, HP | `text-accent-success` |
| `danger` | `#FF4444` | 위험, 감소, 삭제 | `text-accent-danger` |

### 2.4 테두리 (Border)

| Token | Hex | 용도 | Tailwind Class |
|-------|-----|------|----------------|
| `default` | `#5A5A6A` | 기본 테두리 | `border-border-default` |
| `accent` | `#FFD700` | 골드 강조 테두리 | `border-border-accent` |
| `subtle` | `#3A3A4A` | 미세한 구분선 | `border-border-subtle` |

### 2.5 아이템 등급 (Rarity)

| 등급 | Hex | Class |
|------|-----|-------|
| Common | `#808080` | `text-rarity-common` / `badge-common` |
| Uncommon | `#2ECC71` | `text-rarity-uncommon` / `badge-uncommon` |
| Rare | `#3498DB` | `text-rarity-rare` / `badge-rare` |
| Epic | `#9B59B6` | `text-rarity-epic` / `badge-epic` |
| Legendary | `#F39C12` | `text-rarity-legendary` / `badge-legendary` |
| Mythic | `#E74C3C` | `text-rarity-mythic` / `badge-mythic` |
| Ether | `#89CFF0` | `text-rarity-ether` / `badge-ether` |

### 2.6 게이지 (Gauge)

| 게이지 | Hex | 용도 |
|--------|-----|------|
| HP | `#2ECC71` | 체력 바 |
| HP (low) | `#E74C3C` | 체력 위험 |
| MP | `#3498DB` → `#9B59B6` | 마나 바 (그라데이션) |
| EXP | `#F39C12` | 경험치 바 |

---

## 3. 타이포그래피

### 3.1 폰트 패밀리

| 용도 | 폰트 스택 | Tailwind Class |
|------|-----------|----------------|
| **본문** | Pretendard → Noto Sans KR → Inter → system-ui | `font-body` |
| **타이틀** | 여기어때 잘난체 Bold → Pirata One → Cinzel → serif | `font-title` |
| **코드/숫자** | JetBrains Mono → monospace | `font-mono` |

### 3.2 폰트 크기 (Game Token Scale)

| Token | Size | Line Height | 용도 | Class |
|-------|------|-------------|------|-------|
| `game-xs` | 10px | 1.2 | 뱃지, 미세 라벨 | `text-game-xs` |
| `game-sm` | 12px | 1.3 | 테이블 헤더, 보조 텍스트 | `text-game-sm` |
| `game-md` | 14px | 1.4 | 본문 기본 크기 | `text-game-md` |
| `game-lg` | 16px | 1.4 | 강조 본문 | `text-game-lg` |
| `game-xl` | 20px | 1.3 | 섹션 타이틀 | `text-game-xl` |
| `game-2xl` | 24px | 1.2 | KPI 숫자, 대제목 | `text-game-2xl` |
| `game-3xl` | 32px | 1.1 | 히어로 텍스트 | `text-game-3xl` |

### 3.3 사용 규칙

- 본문: `text-game-md font-body text-text-primary`
- 라벨: `text-game-sm font-body text-text-secondary uppercase tracking-wider`
- KPI 수치: `text-game-2xl font-bold font-mono text-text-primary`
- 페이지 제목: `text-game-xl font-bold text-text-primary`
- 브랜드 로고: `text-game-xl font-title text-text-accent`

---

## 4. 스페이싱 & 그리드

### 4.1 4px 베이스 그리드

| Token | Value | 용도 |
|-------|-------|------|
| `game-1` | 4px | 최소 간격, 아이콘 마진 |
| `game-2` | 8px | 뱃지 패딩, 아이템 간 간격 |
| `game-3` | 12px | 인풋 패딩, 작은 카드 갭 |
| `game-4` | 16px | 카드 패딩 기본 |
| `game-5` | 20px | 카드 패딩 넉넉 |
| `game-6` | 24px | 섹션 간 간격 |
| `game-8` | 32px | 페이지 메인 패딩 |
| `game-12` | 48px | 대형 섹션 간격 |

### 4.2 레이아웃 구조

```
+-- Sidebar (240px fixed) --+-- Main Area (flex-1) --------+
|  .sidebar                 |  .admin-header (56px)        |
|  bg-aeterna-abyss         |  bg-aeterna-abyss            |
|                           |  border-b border-subtle      |
|  [Logo]                   +------------------------------+
|  [Nav Items]              |  <main> (flex-1, scroll)     |
|  [Server Status]          |  p-game-6 (24px)             |
|                           |  [Content Grid]              |
+---------------------------+------------------------------+
```

### 4.3 반응형 그리드 패턴

| 뷰포트 | KPI 카드 | 차트 | 비고 |
|---------|----------|------|------|
| `< md` (768px) | 2 col | 1 col | 모바일/태블릿 |
| `md ~ lg` | 3 col | 1 col | 중간 |
| `>= lg` (1024px) | 6 col | 2 col | 데스크톱 기본 |

```html
<!-- KPI 카드 그리드 -->
<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-game-4">

<!-- 차트 그리드 -->
<div class="grid grid-cols-1 lg:grid-cols-2 gap-game-6">
```

---

## 5. 컴포넌트 스타일

### 5.1 패널 / 카드

```html
<!-- 기본 패널 -->
<div class="panel">...</div>
<!-- = bg-aeterna-panel border border-border-default rounded-pixel p-4 -->

<!-- 골드 강조 패널 -->
<div class="panel-accent">...</div>
<!-- = + border-2 border-border-accent + gold glow -->

<!-- 인터랙티브 카드 -->
<div class="card">...</div>
<!-- = bg-aeterna-frame rounded-panel p-5 + hover:ether-glow -->
```

### 5.2 버튼

```html
<button class="btn">기본</button>
<button class="btn-primary">주요 액션</button>
<button class="btn-danger">위험 액션</button>
```

| Variant | Background | Border | Text |
|---------|-----------|--------|------|
| `btn` | `aeterna-button` | `border-default` | `text-primary` |
| `btn-primary` | `#1A3A5A` | `accent-ether` | `accent-ether` |
| `btn-danger` | `#4A1A1A` | `accent-danger` | `#FF6666` |

### 5.3 테이블

```html
<table class="data-table">
  <thead> <!-- bg-aeterna-abyss, text-text-secondary, uppercase --> </thead>
  <tbody> <!-- text-text-primary, hover:bg-aeterna-frame --> </tbody>
</table>
```

### 5.4 입력 필드

```html
<input class="input" placeholder="검색..." />
<!-- bg-aeterna-abyss, border-default, focus:ether glow -->
```

### 5.5 뱃지 (아이템 등급)

```html
<span class="badge-rare">Rare</span>
<span class="badge-legendary">Legendary</span>
<span class="badge-ether">Ether</span>
```

---

## 6. 이펙트 & 애니메이션

### 6.1 박스 섀도우 (에테르 글로우)

| Token | Value | 용도 |
|-------|-------|------|
| `shadow-ether-sm` | `0 0 8px rgba(137,207,240,0.15)` | input focus |
| `shadow-ether` | `0 0 16px rgba(137,207,240,0.2)` | 카드 hover |
| `shadow-ether-lg` | `0 0 30px rgba(137,207,240,0.3)` | 강조 카드 |
| `shadow-gold` | `0 0 12px rgba(255,215,0,0.2)` | 골드 강조 |
| `shadow-danger` | `0 0 12px rgba(255,68,68,0.2)` | 위험 강조 |

### 6.2 트랜지션

| Token | Duration | 용도 |
|-------|----------|------|
| `duration-fast` | 150ms | 버튼 hover, 색상 변경 |
| `duration-normal` | 300ms | 카드 호버, 패널 전환 |
| `duration-slow` | 500ms | 페이지 전환, 모달 |

### 6.3 애니메이션

| Name | Duration | 용도 |
|------|----------|------|
| `ether-pulse` | 2s infinite | 중요 알림, 서버 상태 표시 |
| `fade-in` | 300ms once | 페이지/컴포넌트 진입 |

### 6.4 텍스트 글로우

```html
<span class="text-glow-ether">에테르 빛</span>
<span class="text-glow-gold">골드 빛</span>
```

---

## 7. Chart.js 테마 토큰

Chart.js 색상도 디자인 토큰과 일치해야 합니다.

```typescript
// Chart.js 다크 테마 (디자인 토큰 기반)
const CHART_THEME = {
  legend:     { color: '#A0A0A0' },         // text-secondary
  tooltip:    { bg: '#16213E', border: '#5A5A6A' }, // panel + border-default
  axis:       { ticks: '#606060', grid: '#3A3A4A' }, // text-muted + border-subtle
  title:      { color: '#E8E8E8' },         // text-primary
  // 데이터셋 컬러
  dau:        { line: '#89CFF0', fill: 'rgba(137,207,240,0.1)' },  // accent-ether
  revenue:    { line: '#FFD700', fill: 'rgba(255,215,0,0.1)' },    // text-accent (gold)
  retention:  { line: '#2ECC71', fill: 'rgba(46,204,113,0.1)' },   // accent-success
};
```

---

## 8. 마이그레이션 가이드: 기본 Tailwind -> Aeterna 토큰

> **현재 상태**: 컴포넌트들이 `gray-800`, `amber-400` 등 기본 Tailwind 색상을 사용 중.
> 아래 매핑에 따라 Aeterna 디자인 토큰으로 교체해야 합니다.

### 8.1 배경 색상 매핑

| Before (기본 Tailwind) | After (Aeterna Token) | 비고 |
|------------------------|----------------------|------|
| `bg-gray-900` | `bg-aeterna-primary` | 앱 루트 배경 |
| `bg-gray-800` | `bg-aeterna-panel` or `bg-aeterna-frame` | 카드/패널 |
| `bg-gray-750` | `bg-aeterna-abyss` | thead 배경 |
| `bg-gray-700` | `bg-aeterna-button` | 버튼/인터랙션 |
| `bg-gray-700/50` | `bg-aeterna-frame` | hover 행 |
| `bg-amber-600`, `bg-amber-600/20` | `bg-accent-ether/20` | 활성 nav |

### 8.2 텍스트 색상 매핑

| Before | After | 비고 |
|--------|-------|------|
| `text-white`, `text-gray-100` | `text-text-primary` | 주요 텍스트 |
| `text-gray-300` | `text-text-primary` | 테이블 셀 |
| `text-gray-400` | `text-text-secondary` | 라벨, 보조 |
| `text-gray-500` | `text-text-muted` | 비활성 |
| `text-amber-400` | `text-text-accent` | 골드 강조 |
| `text-green-400` | `text-accent-success` | 증가 표시 |
| `text-red-400`, `text-red-500` | `text-accent-danger` | 감소/경고 |

### 8.3 테두리 매핑

| Before | After | 비고 |
|--------|-------|------|
| `border-gray-700` | `border-border-default` or `border-border-subtle` | 구분선 |
| `border-amber-400` | `border-border-accent` | 활성 nav border |

### 8.4 영향 받는 파일 목록

| 파일 | 교체 필요 항목 |
|------|---------------|
| `App.tsx` | `bg-gray-900 text-gray-100` → `bg-aeterna-primary text-text-primary` |
| `Sidebar.tsx` | `bg-gray-800`, `border-gray-700`, `text-amber-400`, `bg-amber-600/20` 등 전체 |
| `Header.tsx` | `bg-gray-800`, `border-gray-700`, `text-amber-400`, `text-gray-400` 등 전체 |
| `StatCard.tsx` | `bg-gray-800`, `border-gray-700`, `text-green-400`, `text-red-400` 등 전체 |
| `DataTable.tsx` | `bg-gray-800`, `border-gray-700`, `text-gray-400`, `bg-gray-700` 등 전체 |
| `Chart.tsx` | 하드코딩된 hex 색상을 디자인 토큰 상수로 교체 |
| `DashboardPage.tsx` | `text-gray-500`, `text-white`, 차트 데이터셋 hex 교체 |
| `UsersPage.tsx` | 동일 패턴 교체 |
| `ReportsPage.tsx` | 동일 패턴 교체 |
| `AnnouncementsPage.tsx` | 동일 패턴 교체 |
| `EconomyPage.tsx` | 동일 패턴 교체 |

---

## 9. 접근성 & 스크롤바

### 스크롤바 (WebKit)

```css
::-webkit-scrollbar         { width: 6px; height: 6px; }
::-webkit-scrollbar-track   { background: var(--bg-abyss); }
::-webkit-scrollbar-thumb   { background: var(--border-default); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--bg-hover); }
```

### 폰트 렌더링

```css
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
```

---

## 10. Do / Don't

### DO
- Aeterna 토큰 클래스만 사용 (`bg-aeterna-panel`, `text-text-secondary` 등)
- CSS 컴포넌트 클래스 활용 (`.panel`, `.card`, `.btn`, `.data-table`, `.badge-*`)
- 4px 그리드 스페이싱 준수 (`gap-game-4`, `p-game-6`)
- 에테르 글로우를 포커스/호버 상태에 적용

### DON'T
- 기본 Tailwind 색상 직접 사용 금지 (`gray-800`, `amber-400` 등)
- 하드코딩 hex 값 금지 (Chart.js 등에서도 상수 사용)
- 라이트 모드 고려 불필요 (Dark-only)
- `rounded-lg` 등 기본 border-radius 사용 금지 → `rounded-pixel` 또는 `rounded-panel` 사용
