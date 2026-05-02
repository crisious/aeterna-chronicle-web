# 에테르나 크로니클 — 성능 최적화 시각 에셋 팩 v1.0 ✨

> 작성: 가춘운 (CMO/디자인) 🎨
> 작성일: 2026-04-30
> 스프린트: Auto: 성능 최적화 — FPS·메모리·로딩 시간 (Asset 단계)
> SSOT 위계: 4차 (런타임 시각 자원) — `design-system_performance-optimization.md` (3차) 미러
> 인계 대상: 계섬월(Build) — 본 모킹업/SVG/토큰 그대로 Phaser·HTML·README·Discord에 박으면 끝
> 게이트(백능파 REDUCTION): `BattleScene` 단일 FPS HUD + 메모리 1포인트 측정 PASS + 1커밋 머지 — **본 팩의 §1·§3·§7만 본 스프린트 스코프**, 나머지는 사전 도면

---

## 0. 어머~ 성능에 무슨 시각 에셋이?! 💭

대표(crisi)가 게임을 켤 때 만나는 **성능 관련 모든 표면**을 7개로 묶었어요:

| # | 표면 | 누가 봄 | 본 팩의 산출 | 본 스프린트 스코프 |
|---|---|---|---|---|
| 1 | **PerfDot** (게임 우상단 1px) | 모든 유저 | Phaser 코드 + ASCII | ✅ 필수 |
| 2 | **PerfHud** (`?perf=1`) | 개발자 | ASCII 모킹업 4종 | ⏸ 사전 도면 |
| 3 | **PerfChart** (60s sliding) | 개발자 | ASCII + SVG | ✅ 필수 |
| 4 | **LoadingScreen** (chunk 분할) | 모든 유저 | HTML/CSS 코드 | ⏸ 사전 도면 |
| 5 | **README 배지** (shields.io) | 외부 방문자 | SVG 명세 4종 | ⏸ 사전 도면 |
| 6 | **PR 임베드** (perf 회귀 시 봇 코멘트) | 리뷰어 | 마크다운 카드 SSOT | ⏸ 사전 도면 |
| 7 | **Discord 봇 알림** (5분 메모리 ≥ 50MB) | 팀 채널 | embed JSON SSOT | ✅ 필수 |

**모두 코드/텍스트로 표현 — PNG/JPG 0개**! Phase 52 어셋 누적 1454개에 부담 안 줘요~ 🎀

---

## 1. PerfDot — 게임 화면 우상단 (모든 유저) 🟢

> 4×4 px, 우상단 inset 12px. 색만 4상태로 변경. 알파는 상태별 차등.

### 1.1 ASCII 위치 모킹업

```
┌──────────────────────────────────────────┐
│                                       •  │ ← 4×4 dot (우상단 inset 12)
│                                          │
│           [ 게임 화면 ]                  │
│                                          │
│  ⚔️ 에리언 LV.12              🛡️ HP 1234 │
└──────────────────────────────────────────┘
```

### 1.2 4상태 ASCII (확대 8x)

```
good (FPS ≥ 55)        warn (FPS 45-54)      error (FPS < 45)      info (측정 중)
──────────             ──────────             ──────────             ──────────
  ████                   ████                   ████                   ████
  ████ alpha 30%         ████ alpha 60%         ████ alpha 90%         ████ alpha 30%
  #5FCB7A                #E8A33A                #E85A5A 🌬️1.5Hz       #4A9EFF
```

### 1.3 Phaser 구현 스니펫 (계섬월 인계)

```ts
// client/src/scenes/perf/PerfDot.ts
import { PERF_COLORS, PERF_DOT } from '../../config/perf-tokens';

export class PerfDot extends Phaser.GameObjects.Rectangle {
  private state: 'good' | 'warn' | 'error' | 'info' = 'info';

  constructor(scene: Phaser.Scene) {
    const { x, y } = PERF_DOT.position;
    super(scene, scene.scale.width + x, y, PERF_DOT.size, PERF_DOT.size, PERF_COLORS.info);
    scene.add.existing(this);
    this.setOrigin(1, 0).setDepth(9999).setScrollFactor(0);
  }

  update(state: typeof this.state) {
    if (this.state === state) return;
    this.scene.tweens.add({
      targets: this,
      fillColor: PERF_COLORS[state],
      alpha: PERF_DOT.alpha[state] ?? 0.3,
      duration: 250,
      ease: 'Sine.InOut',
    });
    this.state = state;
  }
}
```

---

## 2. PerfHud — `?perf=1` 개발자 모드 (사전 도면) 🖥️

> 본 스프린트는 PerfDot 1개만 머지. PerfHud는 다음 스프린트.

### 2.1 ASCII 모킹업 (정상 — good)

```
┌────────────────┐
│ FPS  58  💚    │
│ MEM  42.1 MB   │
│ Δ    +3.2 / 5m │
│ ▁▂▂▃▃▂▂▁▂▃▂▂  │
└────────────────┘
   72×64 px, 우상단
```

### 2.2 ASCII 모킹업 (주의 — warn)

```
┌────────────────┐
│ FPS  48  ⚠️    │  ← yellow
│ MEM  68.4 MB   │
│ Δ   +18.2 / 5m │  ← yellow (50MB 초과 임박)
│ ▆▇█▇▆▅▄▃▄▅▆▇  │
└────────────────┘
🔥 핫스팟: ATB tween (battle:127)  ← 자동 표시
```

### 2.3 ASCII 모킹업 (위험 — error)

```
┌────────────────┐
│ FPS  32  ❌    │  ← red, 1.5Hz pulse
│ MEM  87.6 MB   │
│ Δ   +37.4 / 5m │  ← red (임계 초과)
│ █████████████  │
└────────────────┘
❌ 메모리 누수 의심: TextureManager 미해제 (scene:Map3 → Map4)
💡 다음: F5로 baseline 재측정 / Ctrl+Shift+M로 leak 보고
```

### 2.4 ASCII 모킹업 (측정 중 — info, 첫 60프레임)

```
┌────────────────┐
│ FPS  --  💡    │  ← cyan, 워밍업
│ MEM  -- MB     │
│ Δ    -- / 5m   │
│ ░░░░░░░░░░░░░  │  ← baseline 수집 중
└────────────────┘
💡 측정 중... 60프레임 후 표시
```

---

## 3. PerfChart — 60s sliding window ASCII + SVG 📊

### 3.1 ASCII 차트 (콘솔 출력 — `npm run perf:report`)

```
─── ⚡ Aeterna Performance Report — 2026-04-30 14:23:15 ───

FPS (60s sliding)
  60 ┤ ─ ─ ─ ─ ─ ─ ─ ─ ─ target (55) ─ ─ ─ ─ ─ ─ ─ ─
     │ ╱╲    ╱╲╱╲      ╱╲          ╱╲
  50 ┤╱  ╲  ╱      ╲╲  ╱  ╲╱╲╱  ╱╲╱  ╲╱╲╱╲
     │    ╲╱            ╲╱
  40 ┤                                          ▼ hotspot
     │                                          ▒▒
  30 ┤                                          ▒▒▒▒
     └────────────────────────────────────────────────►
       0s              30s              60s

Memory (5min sliding)
 100 ┤
     │                                       ╱─
  80 ┤ ─ ─ ─ ─ ─ ─ ─ ─ ─ target (+50MB) ╱─ ─ ─
     │                              ╱─╱
  60 ┤                       ╱─╱─╱
     │                ╱─╱─╱─
  40 ┤ ━━━━━━━━━━━━━━╱
     └────────────────────────────────────────────►
       0min  1min  2min  3min  4min  5min

📊 요약:
  FPS  avg=52.3 ⚠️  min=31 ❌ p95=58 ✅
  MEM  baseline=42.1MB  current=78.4MB  Δ+36.3MB ⚠️
  핫스팟 Top 3:
    1. ATB tween (battle:127)         Δfps -22  4 occurrences
    2. TextureManager (Map3→Map4)     Δmem +12MB 2 occurrences
    3. AudioManager.preload (boss BGM) Δfps -8   1 occurrence

💡 다음: client/src/scenes/battle/AtbBar.ts:127 — tween count 줄이기
```

**렌더 규칙**:
- 폭 80자 비협상
- target 라인은 dashed `─`
- trace 라인은 `╱` `╲` `─` 만 사용 (1-line history)
- hotspot은 `▒▒` 블록으로 강조
- 색은 design-system §2 ANSI 토큰 그대로 (NO_COLOR 폴백)

### 3.2 SVG 차트 (HTML 렌더용)

```svg
<!-- client/public/perf-chart-template.svg — 320×120 -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 120" width="320" height="120">
  <!-- 배경 -->
  <rect width="320" height="120" fill="#1A1A2E" />

  <!-- 격자 -->
  <g stroke="#2A2A3E" stroke-width="1" opacity="0.4">
    <line x1="0" y1="30" x2="320" y2="30" />
    <line x1="0" y1="60" x2="320" y2="60" />
    <line x1="0" y1="90" x2="320" y2="90" />
  </g>

  <!-- 목표선 (55 FPS) -->
  <line x1="0" y1="40" x2="320" y2="40" stroke="#FFD700" stroke-width="1" stroke-dasharray="4 4" />
  <text x="4" y="38" fill="#FFD700" font-family="monospace" font-size="9">target 55</text>

  <!-- 측정 라인 (placeholder — JS에서 path d 동적 생성) -->
  <path id="perf-trace" d="M0,50 L20,45 L40,55 L60,42 L80,58" fill="none" stroke="#A8B0C4" stroke-width="1.5" />

  <!-- 핫스팟 영역 (예시: 60-80s) -->
  <rect x="240" y="0" width="40" height="120" fill="#E85A5A" opacity="0.25" />

  <!-- 축 라벨 -->
  <g fill="#7A7A8E" font-family="monospace" font-size="9">
    <text x="0" y="115">0s</text>
    <text x="150" y="115">30s</text>
    <text x="295" y="115">60s</text>
  </g>
</svg>
```

→ JS에서 `<path d>`만 매 프레임 갱신 (16ms throttle, 저사양 100ms) ✅

---

## 4. LoadingScreen — chunk 분할 (사전 도면) 🌀

### 4.1 ASCII 모킹업

```
╔══════════════════════════════════════════════╗
║                                              ║
║            ⚔️  에테르나 크로니클             ║
║                                              ║
║         기억은 사라져도, 이야기는 남는다     ║
║                                              ║
║  [████████████░░░░░░░░░░░]  62%             ║
║                                              ║
║  ✅ core (1.2 MB)                            ║
║  ✅ chapter1 (3.1 MB)                        ║
║  ⏳ assets (4.8 / 8.0 MB)  ← 진행 중         ║
║  ⏸ chapter2-5 (대기 중)                     ║
║                                              ║
║  💡 곧 챕터 1을 시작할 수 있어요!            ║
║                                              ║
╚══════════════════════════════════════════════╝
```

### 4.2 HTML/CSS 스니펫 (계섬월 인계)

```html
<!-- client/public/loading.html -->
<div class="loading-root">
  <h1 class="loading-title">⚔️ 에테르나 크로니클</h1>
  <p class="loading-tagline">기억은 사라져도, 이야기는 남는다</p>

  <div class="loading-bar">
    <div class="loading-bar-fill" id="loading-progress" style="width: 0%"></div>
  </div>
  <div class="loading-percent" id="loading-percent">0%</div>

  <ul class="loading-chunks" id="loading-chunks">
    <li data-state="pending">⏸ core (1.2 MB)</li>
    <li data-state="pending">⏸ chapter1 (3.1 MB)</li>
    <li data-state="pending">⏸ assets (8.0 MB)</li>
    <li data-state="pending">⏸ chapter2-5</li>
  </ul>

  <p class="loading-hint" id="loading-hint">💡 측정 중...</p>
</div>

<style>
.loading-root { background:#1A1A2E; color:#E8E8F0; font-family: Pretendard, sans-serif; padding: 64px; text-align:center; }
.loading-title { font-size: 32px; color: #FFD700; margin: 0 0 8px; }
.loading-tagline { font-size: 14px; color: #A8B0C4; margin: 0 0 32px; }
.loading-bar { width: min(80%, 480px); height: 8px; background: #2A2A3E; border-radius: 2px; margin: 0 auto; overflow: hidden; }
.loading-bar-fill { height: 100%; background: #FFD700; transition: width 200ms linear; }
.loading-percent { font-family: 'JetBrains Mono', monospace; font-size: 14px; margin: 8px 0 24px; }
.loading-chunks { list-style: none; padding: 0; font-size: 11px; color: #A8B0C4; }
.loading-chunks li[data-state="done"] { color: #5FCB7A; }
.loading-chunks li[data-state="active"] { color: #4A9EFF; font-weight: bold; }
.loading-chunks li[data-state="failed"] { color: #E85A5A; }
.loading-hint { font-size: 12px; color: #A8B0C4; margin-top: 24px; }
</style>
```

---

## 5. README 배지 (shields.io 사전 도면) 🏷️

> 본 스프린트 머지 후 README 상단에 4종 추가 후보. Build 단계 실측 후 수치 채움.

| 배지 ID | shields.io URL 템플릿 | 색 |
|---|---|---|
| `fps-avg` | `https://img.shields.io/badge/FPS%20Avg-58-brightgreen?style=for-the-badge` | brightgreen ≥55 / yellow 45-54 / red <45 |
| `mem-5min` | `https://img.shields.io/badge/Mem%20%2B5min-%2B42MB-success?style=for-the-badge` | success ≤50MB / yellow 50-80 / red >80 |
| `init-load` | `https://img.shields.io/badge/Init%20Load-4.2s-blue?style=for-the-badge` | blue ≤5s / yellow 5-8s / red >8s |
| `hotspots` | `https://img.shields.io/badge/Hotspots-2-yellow?style=for-the-badge` | success 0 / yellow 1-3 / red >3 |

### 5.1 README §⚡ 성능 절 골격 (진채봉 Editor 인계용)

```markdown
## ⚡ 성능 (Performance)

저사양 디바이스에서도 안정 플레이! 4종 약속 지표:

| 지표 | 약속 | 현재 |
|---|---|---|
| FPS 평균 | ≥ 55 | 58 ✅ |
| 5분 메모리 증가 | ≤ 50 MB | +42 MB ✅ |
| 초기 로딩 | ≤ 5 s | 4.2 s ✅ |
| 핫스팟 (Δfps≤-10) | ≤ 3 개 | 2 개 ⚠️ |

### 빠른 시작
```bash
npm run perf:hud      # PerfDot 게임 내 표시
npm run perf:report   # 60s sliding 콘솔 리포트
npm run perf:gate     # CI ship-gate (3-AND)
```

### 4 게이트 흐름 (두련사 *선禪 4계*)
Measure → Detect → Reduce → Verify
```

---

## 6. PR 임베드 — perf 회귀 시 봇 코멘트 (사전 도면) 🤖

### 6.1 마크다운 카드 SSOT

```markdown
## ⚡ 성능 회귀 감지

| 지표 | base (main) | head (PR #${PR}) | Δ | 상태 |
|---|---|---|---|---|
| FPS avg | 58 | 52 | **-6** | ⚠️ |
| FPS p95 | 60 | 58 | -2 | ✅ |
| Mem +5min | +42 MB | +63 MB | **+21 MB** | ⚠️ |
| Init load | 4.2 s | 4.5 s | +0.3 s | ✅ |
| Hotspots | 2 | 4 | **+2** | ❌ |

### 🔥 신규 핫스팟 (Top 3)

1. **`client/src/scenes/battle/AtbBar.ts:127`** — Δfps -22 (4회)
2. **`client/src/scenes/MapScene.ts:284`** — Δmem +12MB (씬 전환 시)
3. **`client/src/loaders/AudioPreloader.ts:45`** — Δfps -8 (1회, 보스 BGM)

### 💡 다음 액션
- AtbBar tween count 줄이기 (#L127)
- MapScene texture 해제 (`scene.textures.remove()`)
- 보스 BGM lazy load (encounter 시작 시)

[자세한 차트 보기](https://etherna-perf.vercel.app/pr/${PR}) · [이전 PR과 비교](https://etherna-perf.vercel.app/compare)
```

---

## 7. Discord 봇 알림 — 5분 메모리 임계 ✅ 본 스프린트 ✨

> 봇 채널 #etherna-perf로 5분마다 측정. Δmem ≥ 50MB or FPS p95 < 55 시 즉시 알림.

### 7.1 embed JSON SSOT (good — 정상)

```json
{
  "embeds": [{
    "title": "⚡ 에테르나 성능 헬스체크 — 정상",
    "color": 6277498,
    "fields": [
      { "name": "FPS avg / p95", "value": "58 / 60 ✅", "inline": true },
      { "name": "Memory +5min", "value": "+42 MB ✅", "inline": true },
      { "name": "Init load", "value": "4.2 s ✅", "inline": true },
      { "name": "Hotspots", "value": "0 ✅", "inline": false }
    ],
    "footer": { "text": "에테르나 perf-bot · 5min sliding" },
    "timestamp": "2026-04-30T14:23:15Z"
  }]
}
```

### 7.2 embed JSON SSOT (warn — 메모리 임박)

```json
{
  "embeds": [{
    "title": "⚠️ 에테르나 성능 헬스체크 — 메모리 임박",
    "color": 15246138,
    "description": "5분 메모리 증가가 약속(50MB)에 임박했어요. 곧 정밀 측정 권장!",
    "fields": [
      { "name": "FPS avg / p95", "value": "52 / 58 ⚠️", "inline": true },
      { "name": "Memory +5min", "value": "**+48 MB** ⚠️", "inline": true },
      { "name": "Init load", "value": "4.4 s ✅", "inline": true },
      { "name": "Hotspot Top 1", "value": "`ATB tween (battle:127)` Δfps -22 (4회)", "inline": false }
    ],
    "footer": { "text": "에테르나 perf-bot · 5min sliding" }
  }]
}
```

### 7.3 embed JSON SSOT (error — 임계 초과)

```json
{
  "embeds": [{
    "title": "❌ 에테르나 성능 헬스체크 — 임계 초과",
    "color": 15227994,
    "description": "**메모리 누수 의심.** 5분 +87 MB — 약속(50MB) 초과! 즉시 조사 권장.",
    "fields": [
      { "name": "FPS avg / p95", "value": "32 / 48 ❌", "inline": true },
      { "name": "Memory +5min", "value": "**+87 MB** ❌", "inline": true },
      { "name": "Init load", "value": "5.8 s ⚠️", "inline": true },
      { "name": "🔥 Hotspot Top 3", "value": "1. `ATB tween` Δfps -22\n2. `TextureManager` Δmem +12MB\n3. `AudioPreloader` Δfps -8", "inline": false },
      { "name": "💡 다음", "value": "심요연 분석 후 정경패 PRD 패치 → 계섬월 hotfix PR", "inline": false }
    ],
    "footer": { "text": "에테르나 perf-bot · 5min sliding · 즉시 대응 권장" }
  }]
}
```

### 7.4 색 코드 (Discord embed 정수)

| 상태 | hex | 정수 (10진) |
|---|---|---|
| good | `#5FCB7A` | `6277498` |
| warn | `#E8A33A` | `15246138` |
| error | `#E85A5A` | `15227994` |
| info | `#4A9EFF` | `4889343` |

→ 4상태 모두 design-system §2 그대로 미러 ✅

---

## 8. 핫스팟 배지 — 게임 내 토스트 ✨

### 8.1 ASCII 모킹업

```
┌─────────────────────────────────────┐
│                                     │
│         [ 게임 화면 ]               │
│                                     │
│                            ┌──────┐ │
│                            │🔥 ATB│ │ ← 60×22 우하단 inset 12
│                            └──────┘ │
└─────────────────────────────────────┘
   8초 후 자동 fade-out
```

### 8.2 SVG 배지 명세

```svg
<!-- 60×22 -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 22">
  <rect x="0.5" y="0.5" width="59" height="21" rx="2"
        fill="#E85A5A" fill-opacity="0.15"
        stroke="#E85A5A" stroke-width="1" />
  <text x="30" y="15" text-anchor="middle"
        font-family="Pretendard, sans-serif" font-size="10" fill="#E85A5A">
    🔥 ATB
  </text>
</svg>
```

### 8.3 3종 핫스팟 라벨 SSOT

| 종류 | 라벨 | 트리거 |
|---|---|---|
| Battle FPS dip | `🔥 ATB` | BattleScene Δfps ≤ -10, 4프레임 연속 |
| Map asset spike | `🗺️ ASSET` | MapScene texture upload ≥ 8MB/frame |
| Memory leak | `⚠️ +12MB` | 씬 전환 후 Δmem ≥ +5MB, 3회 연속 |

→ 라벨 텍스트는 봉인 (이소화 비협상) ✅

---

## 9. 디자인 토큰 코드 SSOT (계섬월 인계용) 🎀

```ts
// client/src/config/perf-tokens.ts
// SSOT: docs/release/design-system_performance-optimization.md §2·§4·§6
// 미러 절차: 본 파일 갱신 시 design-system 문서도 동기 — 단방향(문서 → 코드)

export const PERF_COLORS = {
  good:  { hex: '#5FCB7A', phaser: 0x5FCB7A, ansi: '\x1b[32m', emoji: '✅' },
  warn:  { hex: '#E8A33A', phaser: 0xE8A33A, ansi: '\x1b[33m', emoji: '⚠️' },
  error: { hex: '#E85A5A', phaser: 0xE85A5A, ansi: '\x1b[31m', emoji: '❌' },
  info:  { hex: '#4A9EFF', phaser: 0x4A9EFF, ansi: '\x1b[36m', emoji: '💡' },
} as const;

export const PERF_DOT = {
  size: 4,
  position: { x: -12, y: 12 },
  alpha: { good: 0.3, warn: 0.6, error: 0.9, info: 0.3 },
  pulseHz: { warn: 0, error: 1.5, good: 0, info: 0 },
} as const;

export const PERF_HUD = {
  width: 72, height: 64, padding: 6,
  bg: 'rgba(26, 26, 46, 0.7)',
  borderColor: '#2A2A3E',
  radius: 2,
  font: { label: '10px Pretendard', value: '14px JetBrains Mono', unit: '9px Pretendard', delta: '11px JetBrains Mono' },
} as const;

export const PERF_CHART = {
  width: 320, height: 120,
  xRangeSec: 60,
  yRangeFps: { min: 0, max: 60 },
  yRangeMemMb: 100,  // baseline + 100MB
  targetLineColor: '#FFD700',
  traceColor: '#A8B0C4',
  hotspotColor: '#E85A5A',
  hotspotAlpha: 0.25,
  throttleMs: 16,            // 저사양: 100ms
  throttleMsLowSpec: 100,
} as const;

export const PERF_HYSTERESIS = {
  goodToWarn: { threshold: 55, durationMs: 2000 },
  warnToError: { threshold: 45, durationMs: 2000 },
  errorToWarn: { threshold: 45, durationMs: 5000 },
  warnToGood: { threshold: 55, durationMs: 5000 },
} as const;

export const PERF_HOTSPOT_BADGE = {
  size: { w: 60, h: 22 },
  bgAlpha: 0.15,
  borderWidth: 1,
  textFont: '10px Pretendard',
  position: 'bottom-right',
  inset: 12,
  fadeInMs: 400,
  autoHideMs: 8000,
  labels: { battle: '🔥 ATB', map: '🗺️ ASSET', memory: '⚠️ +{delta}MB' },
} as const;

export const PERF_LOADING = {
  barWidth: 480,
  barHeight: 8,
  barFill: '#FFD700',
  barEmpty: '#2A2A3E',
  chunkLabelStates: {
    done:    { color: '#5FCB7A', icon: '✅' },
    active:  { color: '#4A9EFF', icon: '⏳' },
    pending: { color: '#A8B0C4', icon: '⏸' },
    failed:  { color: '#E85A5A', icon: '❌' },
  },
} as const;
```

→ 본 코드 그대로 `client/src/config/perf-tokens.ts`로 복사 가능 ✅

---

## 10. 봉인 항목 (이소화 비협상) 🔒

| 봉인 | 값 | 근거 |
|---|---|---|
| PerfDot 크기 | 4×4 px | 모바일 360w viewport에서도 인지 가능 최소치 |
| 4상태 색 | `#5FCB7A`/`#E8A33A`/`#E85A5A`/`#4A9EFF` | data-validation 1:1 미러 |
| 핫스팟 배지 라벨 텍스트 | `🔥 ATB` / `🗺️ ASSET` / `⚠️ +XMB` | i18n 후에도 이모지 + 영문 코드 유지 |
| Discord embed 색 정수 | 6277498/15246138/15227994/4889343 | hex 4상태 매핑 비협상 |
| 차트 60s window | 비협상 | 두련사 아키텍처 결정 |

---

## 11. 본 스프린트 산출 정리 (백능파 REDUCTION) 🎯

### 본 스프린트 통합 머지 (필수 ✅)
- §1 PerfDot — 4상태 + Phaser 코드 (`client/src/scenes/perf/PerfDot.ts`)
- §3 PerfChart ASCII (`npm run perf:report` 콘솔 출력)
- §7 Discord embed 3상태 (good/warn/error)
- §9 perf-tokens.ts 코드 SSOT
- §10 봉인 5항

### 다음 스프린트 사전 도면 (⏸ 보류)
- §2 PerfHud (4종 ASCII 모킹업) — Build 단계에 다시
- §4 LoadingScreen (HTML/CSS) — 청크 분할 구현 완료 후
- §5 README 배지 4종 — 실측 수치 확보 후 진채봉 Editor
- §6 PR 임베드 봇 — 측정 인프라 구축 후

---

## 12. 다음 단계 (Build → Review → Test → Ship) 🚀

- [ ] `client/src/config/perf-tokens.ts` 신설 — §9 그대로 (계섬월)
- [ ] `client/src/scenes/perf/PerfDot.ts` 신설 — §1.3 코드 (계섬월)
- [ ] `client/src/scenes/BattleScene.ts` PerfDot 인스턴스 추가 (계섬월) — REDUCTION 게이트 1포인트
- [ ] `npm run perf:report` 스크립트 등록 — §3.1 ASCII 출력 (계섬월)
- [ ] Discord 봇 워크플로우 perf-alert (n8n) — §7 embed 3상태 (가춘운+심요연)
- [ ] `style-guide.html` §성능 HUD 절 추가 — §1·§2 ASCII (가춘운)
- [ ] 정경패 Review — 본 팩 vs 디자인 시스템 일관성
- [ ] 적경홍 Test — PerfDot Hysteresis 실측 (저사양 4종 디바이스)
- [ ] 진채봉 Editor — README §⚡ 성능 절 통합 (실측 수치 확보 후)

---

## 13. 한 줄 마무리 ✨

**"FPS 숫자 하나가 화면에 뜨기 전에, 디자이너가 100번 측정의 우아함을 설계해 둬야 해요."** 🎀

PerfDot 1픽셀이 결국 게임의 신뢰를 짊어지거든요! data-validation의 고요한 ANSI 톤을 게임 화면 위로 그대로 가져옵니다 ✨
