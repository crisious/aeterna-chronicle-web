# UI 스케일링 + 고대비 — 설계 문서 (P17-14)

> 작성일: 2026-03-13 | 버전: v1.0
> 상태: Sprint 3-4 (#322)
> 기준: WCAG 2.1 AA (1.4.3 대비, 1.4.4 텍스트 크기)

---

## 1. 개요

**두 기능을 통합 관리:**
1. **UI 스케일링** — 75%~200% 5단계 + 폰트 독립 조절
2. **고대비 테마** — 명암비 7:1 이상 전 UI 토큰 재정의

---

## 2. UI 스케일링

### 2.1 스케일 단계

| 단계 | 배율 | CSS 변수 | 용도 |
|------|------|---------|------|
| 1 | 75% | `--ui-scale: 0.75` | 고해상도 모니터 (4K+) |
| 2 | 100% | `--ui-scale: 1.0` | 기본값 |
| 3 | 125% | `--ui-scale: 1.25` | 약간 큰 UI 선호 |
| 4 | 150% | `--ui-scale: 1.5` | 저시력 사용자 |
| 5 | 200% | `--ui-scale: 2.0` | 최대 확대 |

### 2.2 폰트 크기 독립 조절

| 단계 | 크기 | CSS 변수 | 적용 대상 |
|------|------|---------|----------|
| 1 | 12pt | `--font-size-base: 12px` | 전체 텍스트 |
| 2 | 14pt | `--font-size-base: 14px` | |
| 3 | 16pt | `--font-size-base: 16px` | 기본값 |
| 4 | 18pt | `--font-size-base: 18px` | |
| 5 | 20pt | `--font-size-base: 20px` | |
| 6 | 24pt | `--font-size-base: 24px` | 최대 |

**폰트 스케일 체계 (상대 단위):**

```css
:root {
  --font-size-base: 16px;
  --font-size-xs: calc(var(--font-size-base) * 0.75);   /* 12px */
  --font-size-sm: calc(var(--font-size-base) * 0.875);  /* 14px */
  --font-size-md: var(--font-size-base);                  /* 16px */
  --font-size-lg: calc(var(--font-size-base) * 1.25);    /* 20px */
  --font-size-xl: calc(var(--font-size-base) * 1.5);     /* 24px */
  --font-size-2xl: calc(var(--font-size-base) * 2);      /* 32px */
}
```

### 2.3 레이아웃 붕괴 방지

#### Flexbox/Grid 기반 유동 레이아웃

```css
/* ❌ 고정 레이아웃 (붕괴 위험) */
.hud-panel {
  width: 320px;
  height: 64px;
  left: 10px;
}

/* ✅ 유동 레이아웃 */
.hud-panel {
  width: clamp(200px, 25vw, 400px);
  min-height: calc(48px * var(--ui-scale));
  padding: calc(8px * var(--ui-scale));
  left: calc(10px * var(--ui-scale));
}
```

#### 스케일 적용 기준

| 요소 유형 | 스케일 방식 | 비고 |
|----------|-----------|------|
| 텍스트 | `--font-size-*` 변수 | 독립 조절 가능 |
| 버튼/패널 크기 | `calc(기준값 * var(--ui-scale))` | UI 스케일 연동 |
| 아이콘 | `calc(24px * var(--ui-scale))` | 텍스트와 별도 |
| 여백/간격 | `calc(기준값 * var(--ui-scale))` | 비례 유지 |
| 게임 캔버스 | 스케일 영향 없음 | 해상도 독립 |
| 자막 | 별도 크기 설정 (자막 시스템) | 접근성 자막과 독립 |

### 2.4 브레이크포인트 정의

| 이름 | 조건 | 레이아웃 변경 |
|------|------|-------------|
| `compact` | `--ui-scale >= 1.5` 또는 `viewport < 1280px` | HUD 2줄 → 1줄 압축 |
| `expanded` | `--ui-scale <= 0.75` 또는 `viewport >= 2560px` | 추가 정보 패널 표시 |
| `mobile` | `viewport < 768px` | 수직 스택 레이아웃 |

```css
/* 컴팩트 모드 — 큰 스케일 시 */
@container hud (max-width: 600px) {
  .hud-skills {
    flex-wrap: wrap;
    gap: calc(4px * var(--ui-scale));
  }
  .hud-minimap {
    display: none; /* 전체 맵으로 대체 */
  }
}
```

---

## 3. 고대비 테마

### 3.1 설계 원칙

| 원칙 | WCAG 기준 | 구현 |
|------|----------|------|
| 텍스트 대비 7:1 이상 | 1.4.6 AAA | 전경색/배경색 쌍 전수 검증 |
| 포커스 인디케이터 3px+ | 2.4.7 AA | 고대비 테두리 + 글로우 |
| 비텍스트 대비 3:1 이상 | 1.4.11 AA | 아이콘/경계선 대비 보장 |

### 3.2 고대비 팔레트 (전체 UI 토큰)

#### 배경 토큰

| 토큰 | 기본 테마 | 고대비 | 대비비 | 용도 |
|------|---------|--------|--------|------|
| `--bg-primary` | `#1a1a2e` | `#000000` | — | 메인 배경 |
| `--bg-secondary` | `#16213e` | `#0a0a0a` | — | 보조 배경 |
| `--bg-panel` | `rgba(0,0,0,0.7)` | `rgba(0,0,0,0.95)` | — | 패널/카드 |
| `--bg-modal` | `rgba(0,0,0,0.8)` | `rgba(0,0,0,0.98)` | — | 모달 배경 |
| `--bg-hover` | `#2a2a4e` | `#1a1a1a` | — | 호버 상태 |
| `--bg-active` | `#3a3a5e` | `#2a2a2a` | — | 활성 상태 |
| `--bg-input` | `#0f3460` | `#000000` | — | 입력 필드 |

#### 텍스트 토큰

| 토큰 | 기본 테마 | 고대비 | 대비비 (vs bg-primary) | 용도 |
|------|---------|--------|----------------------|------|
| `--text-primary` | `#e0e0e0` | `#FFFFFF` | 21:1 | 본문 텍스트 |
| `--text-secondary` | `#a0a0a0` | `#E0E0E0` | 15.3:1 | 보조 텍스트 |
| `--text-muted` | `#666666` | `#BBBBBB` | 11.5:1 | 비활성 텍스트 |
| `--text-accent` | `#e94560` | `#FF6680` | 7.2:1 | 강조 텍스트 |
| `--text-link` | `#4488FF` | `#66AAFF` | 8.1:1 | 링크/상호작용 |
| `--text-success` | `#44CC44` | `#66FF66` | 12.4:1 | 성공/버프 |
| `--text-warning` | `#FFCC00` | `#FFDD44` | 16.7:1 | 경고 |
| `--text-error` | `#FF4444` | `#FF6666` | 7.8:1 | 오류/디버프 |

#### 경계선 / UI 토큰

| 토큰 | 기본 테마 | 고대비 | 용도 |
|------|---------|--------|------|
| `--border-default` | `#333333` | `#888888` | 기본 테두리 |
| `--border-focus` | `#4488FF` | `#00FF00` | 포커스 인디케이터 |
| `--border-accent` | `#e94560` | `#FFD700` | 강조 테두리 |
| `--border-panel` | `#2a2a4e` | `#AAAAAA` | 패널 경계 |
| `--focus-glow` | `none` | `0 0 0 5px rgba(0,255,0,0.3)` | 포커스 글로우 |
| `--focus-width` | `2px` | `3px` | 포커스 두께 |

#### 게임 UI 특수 토큰

| 토큰 | 기본 테마 | 고대비 | 용도 |
|------|---------|--------|------|
| `--hp-bar-fg` | `#44CC44` | `#66FF66` | HP 바 전경 |
| `--hp-bar-bg` | `#333333` | `#1a1a1a` | HP 바 배경 |
| `--mp-bar-fg` | `#4488FF` | `#66AAFF` | MP 바 전경 |
| `--mp-bar-bg` | `#333333` | `#1a1a1a` | MP 바 배경 |
| `--exp-bar-fg` | `#FFCC00` | `#FFDD44` | EXP 바 전경 |
| `--cooldown-overlay` | `rgba(0,0,0,0.5)` | `rgba(0,0,0,0.8)` | 쿨다운 오버레이 |
| `--rarity-common` | `#AAAAAA` | `#CCCCCC` | 일반 등급 |
| `--rarity-uncommon` | `#44CC44` | `#66FF66` | 고급 등급 |
| `--rarity-rare` | `#4488FF` | `#66AAFF` | 희귀 등급 |
| `--rarity-epic` | `#AA44FF` | `#CC66FF` | 영웅 등급 |
| `--rarity-legendary` | `#FF8800` | `#FFAA44` | 전설 등급 |
| `--rarity-mythic` | `#FF2222` | `#FF6666` | 신화 등급 |
| `--tooltip-bg` | `rgba(0,0,0,0.9)` | `#000000` | 툴팁 배경 |
| `--tooltip-border` | `#555555` | `#FFFFFF` | 툴팁 테두리 |

---

## 4. 레이아웃 테스트 매트릭스

### 4.1 스케일 × 해상도 테스트

| 해상도 | 75% | 100% | 125% | 150% | 200% |
|--------|:---:|:----:|:----:|:----:|:----:|
| 1280×720 | □ | □ | □ | □ | □ |
| 1920×1080 | □ | □ | □ | □ | □ |
| 2560×1440 | □ | □ | □ | □ | □ |
| 3840×2160 | □ | □ | □ | □ | □ |

**검증 항목 (각 셀):**
- [ ] HUD 요소 화면 내 유지
- [ ] 텍스트 잘림 없음
- [ ] 버튼 클릭/탭 가능 영역 유지 (최소 44×44px)
- [ ] 패널 겹침 없음
- [ ] 스크롤 가능 (넘칠 때)

### 4.2 폰트 크기 × 스케일 테스트

| 폰트 | 75% | 100% | 150% | 200% |
|------|:---:|:----:|:----:|:----:|
| 12pt | □ | □ | □ | □ |
| 16pt | □ | □ | □ | □ |
| 20pt | □ | □ | □ | □ |
| 24pt | □ | □ | □ | □ |

**검증 항목:**
- [ ] 텍스트 읽기 가능
- [ ] 라벨-값 쌍 정렬 유지
- [ ] 버튼 텍스트 오버플로 없음
- [ ] 대화 텍스트 박스 스크롤 정상

### 4.3 고대비 모드 테스트

| 화면 | 텍스트 대비 7:1 | 포커스 3px+ | 비텍스트 3:1 | 읽기 가능 |
|------|:--------------:|:-----------:|:------------:|:--------:|
| 메인 메뉴 | □ | □ | □ | □ |
| HUD | □ | □ | □ | □ |
| 인벤토리 | □ | □ | □ | □ |
| 대화 상자 | □ | □ | □ | □ |
| 전투 화면 | □ | □ | □ | □ |
| 설정 | □ | □ | □ | □ |
| 월드 맵 | □ | □ | □ | □ |
| 채팅 | □ | □ | □ | □ |
| 던전 선택 | □ | □ | □ | □ |
| 캐릭터 선택 | □ | □ | □ | □ |

---

## 5. 구현 아키텍처

### 5.1 파일 구조

```
client/src/accessibility/display/
├── README.md                   ← 이 문서
├── high_contrast_palette.json  ← 고대비 팔레트 토큰
├── DisplayScaler.ts            ← UI 스케일 + 폰트 크기 관리
└── HighContrastTheme.ts        ← 고대비 테마 적용
```

### 5.2 DisplayScaler 인터페이스

```typescript
interface DisplayScalerConfig {
  uiScale: number;           // 0.75 | 1.0 | 1.25 | 1.5 | 2.0
  fontSizeBase: number;      // 12 | 14 | 16 | 18 | 20 | 24
  highContrast: boolean;
}

class DisplayScaler {
  setUiScale(scale: number): void;
  setFontSize(size: number): void;
  getEffectiveSize(basePx: number): number;
  isCompactMode(): boolean;
  /** 레이아웃 재계산 트리거 */
  recalculate(): void;
}
```

### 5.3 HighContrastTheme 인터페이스

```typescript
class HighContrastTheme {
  enable(): void;
  disable(): void;
  isEnabled(): boolean;
  /** 특정 토큰값 조회 */
  getToken(name: string): string;
  /** 대비비 검증 (디버그용) */
  validateContrast(fg: string, bg: string): { ratio: number; passes: boolean };
}
```
