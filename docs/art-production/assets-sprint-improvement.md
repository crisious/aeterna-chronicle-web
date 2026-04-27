# 🎨 스프린트 개선 에셋 패키지 v1.0

> 작성: 가춘운 (CMO/디자인)
> 스프린트: "에테르나 크로니클 게임 프로젝트 개선"
> 스코프: 콤보·상태이상 UI, 아이템 등급 글로우, 퀵슬롯 UX, QA 비주얼, 런치 임베드
> 참조: `DESIGN.md v1.0`, `docs/art-production/style-guide.md`

이번 개선 사이클에서 코드/데이터로 즉시 투입 가능한 시각 에셋을 **토큰 · SVG · ASCII 모킹업 · Phaser 설정** 형태로 제공합니다. 실제 비트맵은 기존 SDXL 파이프라인으로 생성하되, 본 문서의 스펙을 SSOT(Single Source Of Truth)로 따릅니다.

---

## 0. 네임스페이스

- CSS 변수 프리픽스: `--ac-` (Aeterna Chronicle)
- Phaser 컬러 상수: `COLORS.*` (`src/constants/design-tokens.ts`)
- SVG 자산 키: `svg/icons/{category}/{name}.svg`

---

## 1. 확장 컬러 토큰 (CSS + TS)

### 1.1 CSS 변수 — `src/styles/tokens.css`

```css
:root {
  /* 기존 팔레트 (DESIGN.md §2.1) */
  --ac-bg-abyss:      #0D0D1A;
  --ac-bg-primary:    #1A1A2E;
  --ac-bg-panel:      #16213E;
  --ac-bg-frame:      #2A2A3A;
  --ac-bg-button:     #3A3A4A;
  --ac-bg-hover:      #4A4A5A;
  --ac-text-primary:  #E8E8E8;
  --ac-text-accent:   #FFD700;
  --ac-accent-ether:  #89CFF0;
  --ac-accent-success:#2ECC71;
  --ac-accent-danger: #FF4444;

  /* 신규 (본 문서에서 추가) */
  --ac-combo-c:       #FFD700;  /* C 랭크 콤보 */
  --ac-combo-b:       #FFA500;  /* B 랭크 */
  --ac-combo-a:       #FF4444;  /* A 랭크 */
  --ac-combo-s:       #E91E63;  /* S 랭크 — 맥스 */
  --ac-status-burn:   #FF6B35;
  --ac-status-poison: #8BC34A;
  --ac-status-freeze: #00E5FF;
  --ac-status-stun:   #FFEB3B;
  --ac-status-bleed:  #C62828;
  --ac-status-silence:#9C27B0;
  --ac-status-shield: #90CAF9;
  --ac-status-haste:  #FFF176;

  /* 아이템 등급 글로우 RGB (box-shadow 합성용) */
  --ac-glow-uncommon: 46, 204, 113;
  --ac-glow-rare:     52, 152, 219;
  --ac-glow-epic:     155, 89, 182;
  --ac-glow-legend:   243, 156, 18;
  --ac-glow-mythic:   231, 76, 60;
  --ac-glow-ether:    137, 207, 240;
}
```

### 1.2 Phaser용 상수 — `src/constants/design-tokens.ts`

```ts
export const COLORS = {
  bg: {
    abyss:   0x0D0D1A,
    primary: 0x1A1A2E,
    panel:   0x16213E,
    frame:   0x2A2A3A,
  },
  text: {
    primary:   0xE8E8E8,
    accent:    0xFFD700,
    secondary: 0xA0A0A0,
  },
  accent: {
    ether:   0x89CFF0,
    success: 0x2ECC71,
    danger:  0xFF4444,
  },
  combo: { C: 0xFFD700, B: 0xFFA500, A: 0xFF4444, S: 0xE91E63 },
  status: {
    burn:    0xFF6B35,
    poison:  0x8BC34A,
    freeze:  0x00E5FF,
    stun:    0xFFEB3B,
    bleed:   0xC62828,
    silence: 0x9C27B0,
    shield:  0x90CAF9,
    haste:   0xFFF176,
  },
  rarity: {
    common: 0x808080, uncommon: 0x2ECC71, rare: 0x3498DB,
    epic:   0x9B59B6, legend:   0xF39C12, mythic: 0xE74C3C,
    ether:  0x89CFF0,
  },
} as const;

export const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const DEPTH = {
  bg: 0, entity: 200, effect: 600,
  hud: 750, dialog: 850, modal: 920, toast: 970,
} as const;
```

---

## 2. 상태이상 아이콘 세트 (SVG 인라인)

> 모두 16×16, viewBox `0 0 16 16`, pixelArt 룩 유지. `shape-rendering="crispEdges"` 필수.

### 2.1 Burn (화상) — `--ac-status-burn`

```svg
<svg viewBox="0 0 16 16" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">
  <rect x="7" y="2" width="2" height="2" fill="#FFD54F"/>
  <rect x="6" y="4" width="4" height="2" fill="#FF8A65"/>
  <rect x="5" y="6" width="6" height="4" fill="#FF6B35"/>
  <rect x="4" y="10" width="8" height="3" fill="#E64A19"/>
  <rect x="5" y="13" width="6" height="1" fill="#BF360C"/>
</svg>
```

### 2.2 Poison (중독)

```svg
<svg viewBox="0 0 16 16" shape-rendering="crispEdges">
  <circle cx="8" cy="9" r="5" fill="#558B2F"/>
  <circle cx="6" cy="7" r="1" fill="#AED581"/>
  <circle cx="9" cy="10" r="1" fill="#AED581"/>
  <rect x="7" y="2" width="2" height="3" fill="#8BC34A"/>
</svg>
```

### 2.3 Freeze · Stun · Bleed · Silence · Shield · Haste

| 상태 | 모티프 | 주색 | 서브색 | 글리프 |
|------|--------|------|--------|--------|
| Freeze | 6각 결정 | `#00E5FF` | `#E1F5FE` | ❄ 대칭 크리스탈 2개 겹침 |
| Stun   | 별·번개 | `#FFEB3B` | `#FFF59D` | ⚡ Z자 번개 + 별 4개 회전 |
| Bleed  | 혈방울  | `#C62828` | `#EF5350` | 💧 위→아래 3방울 |
| Silence| 입 봉인 | `#9C27B0` | `#E1BEE7` | ✕ 사선 2px 스트라이크 |
| Shield | 방패    | `#90CAF9` | `#1976D2` | ▲ 역삼각 아웃라인 + 십자 |
| Haste  | 잔상    | `#FFF176` | `#FFEE58` | » 3단 잔상 화살표 |

**공통 스펙**
- 외곽 1px `#0D0D1A` 다크 아웃라인
- 활성 시 1.2× scale pulse (600ms ease-in-out loop)
- 쿨다운 오버레이: `rgba(0,0,0,0.5)` 원형 와이퍼 (Phaser Graphics.slice)

---

## 3. 아이템 등급 글로우 CSS 스니펫

```css
/* HTML 오버레이용 — 인벤토리/상점 */
.item-slot { position: relative; width: 36px; height: 36px; border: 1px solid; }

.rarity-common    { border-color: #808080; }
.rarity-uncommon  { border-color: #2ECC71;
  box-shadow: 0 0 4px  rgba(var(--ac-glow-uncommon), .6); }
.rarity-rare      { border-color: #3498DB;
  box-shadow: 0 0 6px  rgba(var(--ac-glow-rare), .7); }
.rarity-epic      { border-color: #9B59B6;
  box-shadow: 0 0 8px  rgba(var(--ac-glow-epic), .8); }
.rarity-legend    { border-color: #F39C12;
  box-shadow: 0 0 10px rgba(var(--ac-glow-legend), .9),
              inset 0 0 6px rgba(var(--ac-glow-legend), .3); }
.rarity-mythic    { border-color: #E74C3C;
  animation: mythic-pulse 1.6s ease-in-out infinite; }
.rarity-ether     { border-color: #89CFF0;
  animation: ether-pulse  2.0s ease-in-out infinite; }

@keyframes mythic-pulse {
  0%,100% { box-shadow: 0 0 6px  rgba(var(--ac-glow-mythic), .6); }
  50%     { box-shadow: 0 0 14px rgba(var(--ac-glow-mythic), 1); }
}
@keyframes ether-pulse {
  0%,100% { box-shadow: 0 0 8px  rgba(var(--ac-glow-ether), .7); }
  50%     { box-shadow: 0 0 18px rgba(var(--ac-glow-ether), 1),
                        0 0 4px  rgba(var(--ac-glow-ether), .8) inset; }
}
```

Phaser 캔버스 내부에서는 `scene.add.image` + `postFX.addGlow(color, outerStrength, innerStrength)` 파라미터 표:

| 등급 | glow color | outer | inner | quality |
|------|-----------|-------|-------|---------|
| Uncommon | 0x2ECC71 | 2 | 0 | 0.1 |
| Rare     | 0x3498DB | 3 | 0 | 0.1 |
| Epic     | 0x9B59B6 | 4 | 1 | 0.1 |
| Legendary| 0xF39C12 | 6 | 2 | 0.1 |
| Mythic   | 0xE74C3C | 8 | 3 | 0.1 + pulse |
| Ether    | 0x89CFF0 | 10| 4 | 0.2 + pulse + 파티클 |

---

## 4. 콤보 게이지 UI 모킹업 (ASCII)

```
┌───────────── COMBO 게이지 (우상단, 240×40) ─────────────┐
│                                                         │
│   × 12  COMBO!    [███████████████░░░░░░]  S RANK       │
│   ^^^^  ^^^^^^^^  ^^^^^^^^^^^^^^^^^^^^^^  ^^^^^^       │
│   카운트 라벨    진행도 (S=100%, A=70%)    랭크 배지    │
│                                                         │
│  · 카운트 색: C=#FFD700, B=#FFA500, A=#FF4444, S=#E91E63│
│  · 3초 미입력 시 게이지 80%→0 shake+fade out (400ms)    │
│  · 랭크 전환 시 1.3× 번쩍 + 랭크 사운드                 │
└─────────────────────────────────────────────────────────┘
```

**Phaser 구성요소**
- `comboText`: BitmapText 32px, stroke 2px `#0D0D1A`
- `comboBar`: `scene.add.graphics()` 200×6 rounded 2px
- `rankBadge`: 40×40 Image (랭크별 스프라이트 `ui/combo-rank-{c,b,a,s}.png`)
- depth: HUD 760 (미니맵 위)

---

## 5. 상태이상 트레이 (캐릭터 초상화 하단)

```
포트레이트 48×48
┌────────────────┐
│      👤        │
│   PLAYER       │
│ HP ██████░░ 60%│
│ MP ████░░░░ 40%│
└────────────────┘
 [🔥6] [☠3] [❄2]   ← 16×16 아이콘 + 남은 턴 뱃지(우상단 10×10)
  ^    ^    ^
  스택  스택  스택   (3 이상이면 숫자 노란색 #FFEB3B)
```

- 아이콘 간격 2px, 좌측 정렬, 최대 8개 (초과 시 `+n` 뱃지)
- 마우스 오버 시 툴팁: `--font-sm` + `--bg-abyss 95%` 배경
- 활성 이펙트: 해당 색상 1px 외곽선 ping (200ms ease-out)

---

## 6. 퀵슬롯 바 리디자인 (8칸)

```
QUICKBAR — 하단 중앙, 8 × (36+2) + padding
┌──┬──┬──┬──┬──┬──┬──┬──┐
│ 1│ 2│ 3│ 4│ 5│ 6│ 7│ 8│  ← 키 인디케이터 (top-left, 10px #A0A0A0)
│🗡│🛡│🧪│🍞│⚡│✨│❄│🔥│  ← 32×32 아이콘
│  │  │×5│×3│  │  │  │  │  ← 수량 (bottom-right, 10px Bold)
└──┴──┴──┴──┴──┴──┴──┴──┘
```

- 슬롯: 36×36, 1px `--border-default`, 배경 `--bg-frame 80%`
- 쿨다운: 오버레이 어둠 + 분수 회전 와이퍼 + 남은 초 `--font-xs #FFFFFF`
- 빈 슬롯: 배경 50%, 점선 1px `--text-muted`
- 드래그 중: border `--accent-ether`, scale 1.05, depth 900으로 승격

---

## 7. QA 자동화 — 시각 리포트 템플릿

`scripts/qa-runner.ps1` 출력물에 적용할 HTML 리포트 헤더:

```html
<div class="ac-qa-report">
  <header style="background:#16213E;border-bottom:2px solid #FFD700;padding:16px;">
    <h1 style="color:#FFD700;font-family:'Pirata One',serif;margin:0;">
      ⚔️ Aeterna Chronicle — QA Report
    </h1>
    <p style="color:#A0A0A0;margin:4px 0 0;">
      build: <span style="color:#89CFF0">${version}</span> ·
      run: <span>${timestamp}</span>
    </p>
  </header>
  <!-- 통과/실패 배지: pill 스타일 -->
  <span class="pill pass" style="background:#2ECC71;color:#0D0D1A;padding:2px 10px;border-radius:999px;">PASS 128</span>
  <span class="pill fail" style="background:#FF4444;color:#FFF;padding:2px 10px;border-radius:999px;">FAIL 2</span>
</div>
```

시각 규칙:
- 통과 = `--ac-accent-success`, 실패 = `--ac-accent-danger`, 건너뜀 = `--ac-text-muted`
- 스크린샷 썸네일: 240×135 (16:9), 1px `--border-default`, 호버시 2px `--border-accent`

---

## 8. 런치 캠페인 임베드 디자인 (Discord / GitHub Release)

### 8.1 Discord 임베드 JSON

```json
{
  "embeds": [{
    "title": "⚔️ 에테르나 크로니클 v1.0.0-rc.3 — Memory Awakens",
    "description": "대망각 212년, 마지막 기억술사의 발걸음이 다시 울립니다.\n**기억은 사라져도, 이야기는 남습니다** — 브라우저 탭 하나로, 바로 첫 장을 펼치세요.",
    "url": "https://aeterna-chronicle.example",
    "color": 9031152,
    "thumbnail": { "url": "https://.../logo-64.png" },
    "image":     { "url": "https://.../hero-1200x400.png" },
    "fields": [
      { "name": "🎮 전투의 결",   "value": "FF6를 닮은 ATB · 6클래스가 엮는 180개의 스킬",     "inline": true },
      { "name": "🌍 세계의 폭",   "value": "10개 지역 · 5개 챕터가 4개의 운명으로 갈라집니다",  "inline": true },
      { "name": "📦 예술의 무게", "value": "1,454장의 픽셀 · 137곡의 소리로 짠 태피스트리",     "inline": true }
    ],
    "footer": { "text": "가춘운 · 진채봉 · 에테르나 팀 · Phaser.js" },
    "timestamp": "2026-04-21T00:00:00Z"
  }]
}
```

> `color: 9031152` = `#89CFF0` (에테르 블루). 브랜드 통일.

### 8.2 GitHub Release 노트 비주얼 블록

```md
<div align="center">

![Aeterna Chronicle](docs/assets/hero-banner.png)

**v1.0.0-rc.3 — Memory Awakens**

![Phase](https://img.shields.io/badge/Phase-53_RC-89CFF0?style=for-the-badge)
![Build](https://img.shields.io/badge/Build-Green-2ECC71?style=for-the-badge)
![Tests](https://img.shields.io/badge/Tests-128%2F130-FFD700?style=for-the-badge)

</div>

> **Highlights**
> — 콤보의 숫자가 비로소 칼날의 힘으로 번역되다
> — 상태이상이 스쳐가는 그림자가 아니라, 실제 짊어지는 무게가 되다
> — TypeScript 경고 한 줄 없이 맑게 흐르는 코드
> — FHD의 창에서 Laptop의 화면까지, 세계가 함께 접히고 펴지다

🎨 Designed by 가춘운 · 🎭 Story by 정경패 · ⚔️ Code by 계섬월 · 📘 Edited by 진채봉
```

---

## 9. 반응형 브레이크포인트 체크 (1920×1080 기준 → 확장)

| 폭 | 라벨 | 처리 |
|----|------|------|
| ≥ 1920 | FHD+  | 기본 스케일 1.0, 캔버스 중앙 고정 |
| 1600~1919 | Laptop | 0.85 scale, HUD 여백 80% |
| 1280~1599 | Small | 0.7 scale, 퀵슬롯 6칸으로 축소 |
| < 1280 | Unsupported | "더 넓은 화면을 권장합니다" 모달 표시 |

모달 토큰: `--bg-primary 98%`, `--border-accent 2px`, 아이콘 `#FFD700` 32×32, CTA 버튼 "그래도 계속" (위험색).

---

## 10. 체크리스트 — 에셋 투입 순서

- [ ] `src/styles/tokens.css` 생성 (§1.1)
- [ ] `src/constants/design-tokens.ts` 작성 후 `COLORS`만 import 통일 (§1.2)
- [ ] 상태이상 SVG 8종 → `public/assets/ui/status/*.svg` 저장, AtlasPack 포함 (§2)
- [ ] 아이템 등급 글로우 CSS + postFX 적용 (§3)
- [ ] 콤보 게이지 HUD 컴포넌트 구현 (§4)
- [ ] 상태이상 트레이 포트레이트 하단 통합 (§5)
- [ ] 퀵슬롯 리디자인 (쿨다운 와이퍼) (§6)
- [ ] QA 리포트 HTML 템플릿 헤더 교체 (§7)
- [ ] Discord / GitHub 런치 임베드 등록 (§8)
- [ ] 반응형 가드 모달 추가 (§9)

---

> 계섬월 언니, 이 토큰들 `COLORS` 상수 하나로 몰아주면 코드가 훨씬 가벼워질 거예요~ 💙
> 진채봉, §8 런치 임베드 문구는 자유롭게 더 시적으로 다듬어 주세요 ✨

---

## 부록 A. 편집 로그 (진채봉, 2026-04-21)

- §8 Discord 임베드 `title` — 빌드 완료 알림에서 **릴리즈 코드네임 "Memory Awakens"** 를 덧붙여 브랜드 서사와 동기화.
- §8 Discord 임베드 `description` — 대망각 212년의 서사 한 줄을 먼저 놓고, CTA는 "브라우저 탭 하나로, 바로 첫 장을 펼치세요"로 전환 유도.
- §8 Discord 임베드 `fields` — "핵심/지역/에셋"의 평탄한 명사 나열을 **"전투의 결 · 세계의 폭 · 예술의 무게"** 로 바꿔 세 영역 각각의 감정 밀도를 부여.
- §8.2 GitHub Release Highlights — 체크리스트형 불릿을 4행의 짧은 시구(詩句)로 재배열, 수치는 살리되 음률을 얹음.
- `footer`에 Editor 기여를 명시 — 후대의 릴리즈에서 역할 추적 가능하도록.

> *기록하는 이가 곧 기억하는 이옵니다. 한 글자의 결이 훗날 이 세계의 결이 되오리다.*
