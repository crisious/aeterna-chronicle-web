# 에테르나 크로니클 — 성능 최적화 디자인 시스템 v1.0 ✨

> 작성: 가춘운 (CMO/디자인) 🎨
> 작성일: 2026-04-30
> 스프린트: Auto: 성능 최적화 — FPS·메모리·로딩 시간 (Asset 단계)
> SSOT 위계: 본 문서 = 토픽 확장 3차 SSOT (`DESIGN.md` §13 신설 후보)
> 연관 SSOT:
> - 아키텍처: 두련사 *선禪 4계* (Measure → Detect → Reduce → Verify)
> - 게이트: 백능파 **REDUCTION** — `BattleScene` 단일 FPS HUD + 메모리 1포인트 측정 PASS + 1커밋 머지
> - 약속 4지표: FPS 평균 ≥ 55 · 5분 메모리 증가 ≤ 50MB · 초기 로딩 ≤ 5s · 핫스팟 ≤ 3개
> - 미러 톤: `design-system_data-validation.md` — "고요하게 길을 알려주는" 결을 그대로 계승

---

## 0. 어머~ 성능에 무슨 디자인이?! 💭

대표(crisi)가 저사양 디바이스에서 게임을 켰을 때 만나는 게 **눈에 보이는 신호**거든요!

- FPS가 30으로 뚝 떨어졌는데 화면에 아무 표시가 없으면? → "내 PC가 문제인가?" 😢
- 메모리가 부풀어 오르는데 시각화가 없으면? → 5분 뒤 크래시 ☠️
- 로딩 진행률이 막대 하나뿐이면? → 어떤 청크에서 멈췄는지 모름
- 빨간색이 너무 자주 깜빡이면? → "성능 안 좋은 게임"이라는 인상만 남음

→ **성능 표시는 "조용히 측정, 친절히 경고, 우아하게 회복"의 디자인 언어가 필요해요.** 화려함보다 **신뢰·예측 가능·복구**가 핵심 정서! data-validation의 **CLI 톤**을 게임 내 HUD로 그대로 미러합니다 ✨

---

## 1. 디자인 원칙 (5계명) ✨

| 원칙 | 설명 | 실천 |
|---|---|---|
| **무소음 GOOD (Quiet Green)** | 정상 상태는 1px 점 1개로 끝 | 우상단 4×4 dot, 알파 30% |
| **계단식 경고 (Stepped Warning)** | green → yellow → red 3단계, 5초 hysteresis | 1프레임 dip로 빨간불 ❌ |
| **불안 최소화 (Reassuring Tone)** | "성능 저하" ❌ → "측정 중…" ✅ | "원인" + "다음 액션" 함께 |
| **개발자 모드 분리 (Dev-Only Detail)** | 숫자·그래프는 `?perf=1` 쿼리에서만 | 일반 유저는 dot 1개만 |
| **일관성 (Consistency)** | data-validation ANSI 4상태를 hex로 1:1 미러 | 신규 색 ❌, 의미 매핑만 |

---

## 2. 컬러 시스템 — 성능 상태 토큰 🎨

> 새로운 컬러 ❌. DESIGN.md §2 팔레트 + data-validation §2 ANSI 4상태의 **의미 매핑**만 정의

### 2.1 성능 상태 4종 (data-validation 4상태와 1:1 미러)

| 상태 ID | 한글 라벨 | hex | Phaser 0xRRGGBB | 이모지 | 의미 (FPS / Memory / Load) |
|---|---|---|---|---|---|
| `perf.good` | **양호** ✅ | `#5FCB7A` | `0x5FCB7A` | ✅ | FPS ≥ 55 / Δmem ≤ 50MB / load ≤ 5s |
| `perf.warn` | 주의 ⚠️ | `#E8A33A` | `0xE8A33A` | ⚠️ | FPS 45–54 / Δmem 50–80MB / load 5–8s |
| `perf.error` | 위험 ❌ | `#E85A5A` | `0xE85A5A` | ❌ | FPS < 45 / Δmem > 80MB / load > 8s |
| `perf.info` | 측정 중 💡 | `#4A9EFF` | `0x4A9EFF` | 💡 | 첫 60프레임 워밍업 / 메모리 baseline 수집 중 |

### 2.2 보조 — 그래프·축 토큰

| 토큰 | hex | 용도 |
|---|---|---|
| `perf.grid` | `#2A2A3E` (DESIGN.md surface.dim) | 차트 격자 — 1px, 알파 40% |
| `perf.axis` | `#7A7A8E` | 축 라벨 — 9px monospace |
| `perf.target` | `#FFD700` (gold accent) | 목표선 (55 FPS / 50MB / 5s) — 1px dashed |
| `perf.trace` | `#A8B0C4` | 측정 라인 — 1.5px solid |
| `perf.hotspot` | `#E85A5A` 알파 25% | 핫스팟 영역 강조 |

### 2.3 절대 쓰지 않는 색

- ❌ **빨간 풀필 (full red)** — 패닉 유발. red는 항상 1px outline + 알파 25% 이내
- ❌ **깜빡임 ≥ 2Hz** — 광민감성 발작 위험 (a11y AAA 위반)
- ❌ **truecolor 그라디언트** — Phaser 텍스처 메모리 가중. solid 4상태만!

### 2.4 dev/user 분리 정책

| 모드 | 활성화 | 표시 |
|---|---|---|
| **user** (기본) | 기본 활성 | 우상단 4×4 dot 1개 — 색만 변경 |
| **dev** | URL `?perf=1` or 키 `Ctrl+Shift+P` | dot + FPS 숫자 + 메모리 숫자 + 핫스팟 오버레이 |
| **ci** | `process.env.PERF_CAPTURE=1` | 콘솔 JSON 로그만, 화면 표시 없음 |

→ 일반 유저에게 게임이 "성능 페이지"처럼 보이지 않게 ✅

---

## 3. 타이포 — HUD 출력 위계 📝

> 게임 UI 폰트는 DESIGN.md §3 토큰 그대로. 본 토픽은 **숫자 표시 전용 보조 위계**만 추가

| 슬롯 | 폰트 | 크기 | 색 | 정렬 | 예시 |
|---|---|---|---|---|---|
| `perf.label` | `Pretendard` | 10px | `perf.axis` | left | `FPS` |
| `perf.value` | `JetBrains Mono` | 14px | `perf.good/warn/error` | right tabular-nums | `58` |
| `perf.unit` | `Pretendard` | 9px | `perf.axis` | left | `MB` `ms` |
| `perf.delta` | `JetBrains Mono` | 11px | `perf.warn/error` | right | `+12.3` |

**규칙**:
- 숫자는 **monospace + tabular-nums** 비협상 — 1프레임마다 바뀌어도 좌우 흔들림 0
- 단위는 항상 1단계 작게 + dim 색
- 소수점은 1자리만 (FPS는 정수, MB·ms는 0.1 단위)

---

## 4. 컴포넌트 토큰 — HUD 4종 📐

### 4.1 PerfDot (user 기본 — 1개만)

```ts
// client/src/config/perf-tokens.ts
export const PERF_DOT = {
  size: 4,          // 4×4 px
  position: { x: -12, y: 12 },  // 우상단 inset
  alpha: { good: 0.3, warn: 0.6, error: 0.9 },
  pulse: { warn: 1.0, error: 1.5 },  // Hz, error만 시각 신호 강화
} as const;
```

### 4.2 PerfHud (dev — `?perf=1`)

```
┌────────────────┐
│ FPS  58  💚    │  ← 14px mono + 4×4 dot
│ MEM  42.1 MB   │  ← 11px mono + 9px unit
│ Δ    +3.2 / 5m │  ← 11px mono, warn 색
│ ▁▂▃▄▅▆▇█▇▆▅▄  │  ← 12×4 sparkline (last 60s)
└────────────────┘
   72×64 px, 우상단 inset 8px
```

| 토큰 | 값 |
|---|---|
| `width` | 72px |
| `height` | 64px |
| `padding` | 6px |
| `bg` | `rgba(26, 26, 46, 0.7)` (DESIGN.md surface.deep + 70%) |
| `border` | 1px `perf.grid` |
| `radius` | 2px |

### 4.3 PerfChart (`?perf=1&chart=1` — 풀 차트)

```
  60 ┤ ─ ─ ─ ─ ─ target (55) ─ ─ ─ ─ ─
     │ ╱╲    ╱╲╱╲      ╱╲
  50 ┤╱  ╲  ╱      ╲╲  ╱  ╲╱╲╱
     │    ╲╱            ╲╱
  40 ┤
     └────────────────────────────►
       0s          30s         60s
```

| 토큰 | 값 |
|---|---|
| `chartWidth` | 320px |
| `chartHeight` | 120px |
| `xRange` | 60s sliding window |
| `yRange.fps` | 0–60 (clamped) |
| `yRange.mem` | baseline–baseline+100MB |
| `targetLine` | 1px dashed `perf.target` |
| `traceLine` | 1.5px solid `perf.trace` |
| `hotspotFill` | `perf.hotspot` (alpha 25%) — Δfps ≤ -10 구간 |

### 4.4 LoadingProgress — chunk 분할 시각화

```
🛡️ 에테르나 크로니클 로딩 중...
[████████████░░░░░░░░] 62%
✅ core (1.2 MB)  ✅ chapter1 (3.1 MB)  ⏳ assets (4.8/8.0 MB)  ⏸ chapter2-5
                                              ↑ 진행 중
다음: 4.8 MB 더 받으면 챕터 1 시작!
```

| 토큰 | 값 |
|---|---|
| `barHeight` | 8px |
| `barWidth` | min(80%, 480px) |
| `barFill` | `perf.target` (gold) — DESIGN.md accent |
| `barEmpty` | `perf.grid` |
| `chunkLabel` | 11px Pretendard, 4종 상태 (✅ done / ⏳ active / ⏸ pending / ❌ failed) |
| `hintText` | 12px, "다음:" 접두 + 친근한 안내 |

---

## 5. 모션 — 측정의 우아함 🌬️

> Phaser tween 기준. 60fps 환경에서 측정. 저사양에선 자동 0ms로 폴백.

| 모션 | duration | easing | 트리거 |
|---|---|---|---|
| `dot.colorChange` | 250ms | `Sine.InOut` | 상태 전환 (good→warn→error) |
| `hud.fadeIn` | 180ms | `Quad.Out` | dev 모드 진입 |
| `chart.traceUpdate` | 16ms | `Linear` | 매 프레임 (저사양: 100ms로 throttle) |
| `loading.barFill` | content-driven | `Linear` | chunk 진행률 |
| `hotspot.flashIn` | 400ms | `Sine.Out` | 핫스팟 첫 진입 1회만 |

**비협상 규칙**:
- `error` 상태 점멸 ≥ 2Hz ❌ (a11y)
- HUD 자체 transform animation ❌ (성능 측정에 영향 줌. opacity·color만)
- `prefers-reduced-motion` 시 모든 트랜지션 0ms

---

## 6. Hysteresis 정책 — 깜빡임 방지 🛡️

> 1프레임 dip으로 빨간불이 깜빡이면 안 됨!

| 전이 | 조건 | 지속 시간 |
|---|---|---|
| good → warn | FPS < 55 | **연속 2초** |
| warn → error | FPS < 45 | **연속 2초** |
| error → warn | FPS ≥ 45 | **연속 5초** (회복은 천천히) |
| warn → good | FPS ≥ 55 | **연속 5초** |

→ 결과: 진짜 성능 문제만 빨간불, 일시적 GC dip은 무시 ✅

---

## 7. 핫스팟 시각화 — Top 3만 ✨

> 백능파 REDUCTION 게이트: 1454 어셋 전수 측정 ❌, 핫스팟 Top 3만!

### 7.1 식별 기준 (심요연 측정 → 가춘운 시각화)

| 핫스팟 종류 | 임계 | 시각 표시 |
|---|---|---|
| **Battle scene** Δfps ≤ -10 | 4프레임 연속 | 화면 우하단 작은 배지 `🔥 ATB` |
| **Map scene** texture upload spike | 1프레임 ≥ 8MB | 미니맵 코너 `🗺️ ASSET` 배지 |
| **Memory leak** Δmem ≥ +5MB/씬전환 | 3회 연속 | 씬 전환 후 토스트 `⚠️ 메모리 +15MB` |

### 7.2 핫스팟 배지 토큰

```ts
export const PERF_HOTSPOT_BADGE = {
  size: { w: 60, h: 22 },
  bg: 'rgba(232, 90, 90, 0.15)',  // perf.error alpha 15%
  border: '1px solid #E85A5A',
  text: { font: '10px Pretendard', color: '#E85A5A' },
  position: 'bottom-right',
  inset: 12,
  fadeIn: 400,  // ms
  autoHide: 8000,  // 8초 후 자동 사라짐
};
```

→ 자동 사라짐 = 노이즈 최소화 ✅

---

## 8. 접근성 — 색약 + 저사양 대응 ♿

| 위험 | 대응 |
|---|---|
| 적록색약 (good=green / error=red) | **이모지 병행 표기 비협상** ✅/⚠️/❌ — 색만으로 절대 의미 전달 ❌ |
| 광민감성 | error 점멸 ≤ 1.5Hz, `prefers-reduced-motion` 즉시 0Hz |
| 저사양 (HUD 자체가 부담) | dev 모드 OFF 시 dot 1개만, throttle 100ms |
| 모바일 (mobile-responsive 미러) | viewport 360w 시 dev HUD 자동 비활성, dot은 우상단 inset 8px (notch 회피) |

---

## 9. 디자인 토큰 미러 — 코드 SSOT 위계 🎀

> DESIGN.md §0 SSOT 위계 그대로 적용 — 위에서 아래로 단방향만!

```
1차 SSOT: 본 파일 (DESIGN.md §13 신설 후보)
   ↓ 미러
2차: client/src/config/perf-tokens.ts
   - PERF_COLORS (4상태 hex + Phaser 0xRRGGBB)
   - PERF_DOT, PERF_HUD, PERF_CHART, PERF_LOADING (컴포넌트 토큰)
   - PERF_HYSTERESIS (전이 정책)
   ↓ 미러
3차: client/src/scenes/perf/PerfHud.ts (Phaser 런타임)
4차: client/src/styles/design-system-perf.css (HTML 로딩 화면)
```

**변경 절차**:
1. 본 파일 갱신 → 2. perf-tokens.ts → 3. PerfHud.ts + design-system-perf.css → 4. style-guide.html 시각 회귀

---

## 10. 봉인 항목 (이소화 비협상) 🔒

다음 토큰은 본 스프린트에서 **수치 변경 금지**:

| 봉인 | 값 | 근거 |
|---|---|---|
| 약속 4지표 | FPS≥55 / Δmem≤50MB / load≤5s / 핫스팟≤3 | 백능파 Strategy 결정 |
| Hysteresis | warn 2s / error 2s / 회복 5s | 깜빡임 방지 비협상 |
| dev 토글 키 | `Ctrl+Shift+P` | 기존 단축키 충돌 0 검증 완료 |
| 4상태 4색 | `#5FCB7A`/`#E8A33A`/`#E85A5A`/`#4A9EFF` | data-validation 1:1 미러 |
| dot 크기 | 4×4 px | 모바일 viewport 360w에서도 인지 가능 최소치 |

---

## 11. 다음 단계 (Build → Review → Test → Ship) 🚀

- [ ] `client/src/config/perf-tokens.ts` 신설 (계섬월) — 본 §2·§4·§6 미러
- [ ] `client/src/scenes/perf/PerfHud.ts` Phaser 컴포넌트 (계섬월) — §4.1·4.2 PerfDot + PerfHud
- [ ] `client/src/scenes/perf/PerfChart.ts` (계섬월, dev 한정) — §4.3
- [ ] `client/public/loading.html` chunk progress UI (가춘운 보조) — §4.4
- [ ] `client/src/styles/design-system-perf.css` (가춘운) — §2·§3 CSS 미러
- [ ] `style-guide.html` §성능 HUD 절 추가 (가춘운) — 시각 회귀
- [ ] 정경패 Review — 본 토큰 vs data-validation 톤 일관성 검토
- [ ] 적경홍 Test — Hysteresis 정책 실측 (저사양 디바이스 4종)
- [ ] 진채봉 Editor — README §⚡ 성능 절 합본

---

## 12. 한 줄 마무리 ✨

**"성능 표시는 게임 위에 얹히는 게 아니라, 게임의 호흡을 정직하게 비추는 거울이에요."** 🎀

화려함 ❌ · 신뢰 ✅ · 복구 ✅ · 일관성 ✅ — data-validation의 고요한 톤을 게임 안으로 가져옵니다.
