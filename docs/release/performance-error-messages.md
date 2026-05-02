# 성능 최적화 에러 메시지 카피 SSOT v1.0

> 작성: 진채봉 Editor
> 작성일: 2026-04-30
> 스프린트: Auto: 성능 최적화 — FPS·메모리·로딩 시간
> 키 규약: `perf.<gate>.<state>.<reason>`
> 코드 미러: `client/src/constants/performance_messages.ts` (계섬월 Build 단계 신설)

---

## 0. 톤 5계명 (가춘운 디자인 미러)

1. **원인 → 처방** — 무엇이 잘못됐고, 무엇을 해야 하는지 한 줄에.
2. **수치는 사실만** — `54.2 fps / 51.3MB / 5.4s / 2.1MB` 처럼 실측치 표기, 추정 금지.
3. **경로 절단 금지** — `client/src/scenes/BattleScene.ts:142` 풀 경로 노출.
4. **시는 hint만** — 본문은 사실. 시적 표현은 `hint:` 접미에만.
5. **게이트 키 규약** — `perf.<profile|memory|lazy|bundle>.<pass|warn|error|block>.<reason>`

---

## 1. 카피 매트릭스 (4 게이트 × 4 상태 = 16 슬롯)

| 게이트 \ 상태 | PASS | WARN | ERROR | BLOCK |
|---|---|---|---|---|
| **Profile** | 1.1 | 1.2 | 1.3 | 1.4 |
| **Memory** | 2.1 | 2.2 | 2.3 | 2.4 |
| **Lazy** | 3.1 | 3.2 | 3.3 | 3.4 |
| **Bundle** | 4.1 | 4.2 | 4.3 | 4.4 |

---

## 2. 게이트 1 — Profile (FPS)

### 1.1 PASS · `perf.profile.pass.in_threshold`

- **ko**: `[Profile] 평균 {avg}fps · p1 {p1}fps — 임계 ≥55 통과`
- **en**: `[Profile] avg {avg}fps · p1 {p1}fps — within ≥55 threshold`
- **hint** (선택): `흐름이 끊기지 않는 곡조이옵나이다.`

### 1.2 WARN · `perf.profile.warn.near_threshold`

- **ko**: `[Profile] 평균 {avg}fps — 임계 55에 근접 (margin {margin}fps). {top_hotspot} 최적화 권장`
- **en**: `[Profile] avg {avg}fps — close to ≥55 threshold (margin {margin}fps). Optimize {top_hotspot}`

### 1.3 ERROR · `perf.profile.error.below_avg`

- **ko**: `[Profile] 평균 {avg}fps · 임계 55 미달. 핫스팟: {hotspot_path}:{line} ({cost}ms)`
- **en**: `[Profile] avg {avg}fps below ≥55 threshold. Hotspot: {hotspot_path}:{line} ({cost}ms)`

### 1.4 BLOCK · `perf.profile.block.p1_dropped`

- **ko**: `[Profile] p1 {p1}fps · 임계 30 미달 — 출시 차단. 프레임 드롭 {drops}회 / 60초`
- **en**: `[Profile] p1 {p1}fps below ≥30 threshold — ship blocked. {drops} drops in 60s`

---

## 3. 게이트 2 — Memory

### 2.1 PASS · `perf.memory.pass.no_leak`

- **ko**: `[Memory] 5분 증가 {delta}MB — 임계 ≤50MB 통과`
- **en**: `[Memory] 5min delta {delta}MB — within ≤50MB threshold`

### 2.2 WARN · `perf.memory.warn.suspicious_listener`

- **ko**: `[Memory] 증가 {delta}MB — 임계 통과. 의심 리스너 {count}건: {scene_name}.shutdown() 점검`
- **en**: `[Memory] delta {delta}MB within threshold. {count} suspicious listeners — review {scene_name}.shutdown()`

### 2.3 ERROR · `perf.memory.error.texture_not_released`

- **ko**: `[Memory] 미해제 텍스처 {key} ({size}MB) · 씬 {scene_name} 전환 후 잔존. shutdown()에 textures.remove() 추가`
- **en**: `[Memory] Texture {key} ({size}MB) not released after {scene_name} transition. Add textures.remove() to shutdown()`

### 2.4 BLOCK · `perf.memory.block.threshold_exceeded`

- **ko**: `[Memory] 5분 증가 {delta}MB · 임계 50MB 초과 — 출시 차단. 누수 의심 경로: {path}`
- **en**: `[Memory] 5min delta {delta}MB exceeds ≤50MB — ship blocked. Suspected leak: {path}`

---

## 4. 게이트 3 — Lazy Load

### 3.1 PASS · `perf.lazy.pass.chunk_split`

- **ko**: `[Lazy] 초기 chunk {size_mb}MB gzipped · 후속 {chunk_count}개 분리 — 임계 ≤2MB 통과`
- **en**: `[Lazy] Initial chunk {size_mb}MB gzipped · {chunk_count} lazy chunks — within ≤2MB threshold`

### 3.2 WARN · `perf.lazy.warn.large_chunk`

- **ko**: `[Lazy] {chunk_name} {size_mb}MB — 임계 통과. 추가 분할 권장 (예상 절감 {estimated}MB)`
- **en**: `[Lazy] {chunk_name} is {size_mb}MB — within threshold. Further split recommended (est. {estimated}MB)`

### 3.3 ERROR · `perf.lazy.error.initial_too_large`

- **ko**: `[Lazy] 초기 chunk {size_mb}MB · 임계 2MB 초과. 가장 큰 의존성: {dep_name} ({dep_size}MB)`
- **en**: `[Lazy] Initial chunk {size_mb}MB exceeds ≤2MB threshold. Heaviest dep: {dep_name} ({dep_size}MB)`

### 3.4 BLOCK · `perf.lazy.block.no_split`

- **ko**: `[Lazy] manualChunks 미설정 — 단일 번들 {size_mb}MB. vite.config.ts manualChunks 필수 — 출시 차단`
- **en**: `[Lazy] manualChunks not configured — single bundle {size_mb}MB. vite.config.ts manualChunks required — ship blocked`

---

## 5. 게이트 4 — Bundle

### 4.1 PASS · `perf.bundle.pass.optimized`

- **ko**: `[Bundle] 산출물 {total_mb}MB · 이미지 압축률 {compress}% · 아틀라스 {atlas_count}개 — 통과`
- **en**: `[Bundle] Output {total_mb}MB · img compression {compress}% · {atlas_count} atlases — pass`

### 4.2 WARN · `perf.bundle.warn.uncompressed_asset`

- **ko**: `[Bundle] 미압축 자산 {count}건 — 임계 통과. {largest_asset} {size}MB 압축 시 {savings}MB 절감 예상`
- **en**: `[Bundle] {count} uncompressed assets — within threshold. {largest_asset} {size}MB → est. {savings}MB savings`

### 4.3 ERROR · `perf.bundle.error.image_oversized`

- **ko**: `[Bundle] 이미지 {asset_path} {size}MB · 임계 1MB 초과. pngquant/oxipng 적용 필수`
- **en**: `[Bundle] Image {asset_path} {size}MB exceeds ≤1MB threshold. Apply pngquant/oxipng`

### 4.4 BLOCK · `perf.bundle.block.size_regression`

- **ko**: `[Bundle] 산출물 {total_mb}MB · 직전 빌드 대비 +{regression}MB 증가 — 출시 차단. 백능파 승인 필수`
- **en**: `[Bundle] Output {total_mb}MB · +{regression}MB regression vs last build — ship blocked. Strategy approval required`

---

## 6. 코드 미러 스니펫 (계섬월 Build 단계 인계)

```typescript
// client/src/constants/performance_messages.ts
// SSOT: docs/release/performance-error-messages.md
// 변경 시 본 문서 §2-§5 동시 갱신.

export const PERF_MESSAGES = {
  profile: {
    pass:  { in_threshold:    'perf.profile.pass.in_threshold' },
    warn:  { near_threshold:  'perf.profile.warn.near_threshold' },
    error: { below_avg:       'perf.profile.error.below_avg' },
    block: { p1_dropped:      'perf.profile.block.p1_dropped' },
  },
  memory: {
    pass:  { no_leak:               'perf.memory.pass.no_leak' },
    warn:  { suspicious_listener:   'perf.memory.warn.suspicious_listener' },
    error: { texture_not_released:  'perf.memory.error.texture_not_released' },
    block: { threshold_exceeded:    'perf.memory.block.threshold_exceeded' },
  },
  lazy: {
    pass:  { chunk_split:        'perf.lazy.pass.chunk_split' },
    warn:  { large_chunk:        'perf.lazy.warn.large_chunk' },
    error: { initial_too_large:  'perf.lazy.error.initial_too_large' },
    block: { no_split:           'perf.lazy.block.no_split' },
  },
  bundle: {
    pass:  { optimized:           'perf.bundle.pass.optimized' },
    warn:  { uncompressed_asset:  'perf.bundle.warn.uncompressed_asset' },
    error: { image_oversized:     'perf.bundle.error.image_oversized' },
    block: { size_regression:     'perf.bundle.block.size_regression' },
  },
} as const;
```

REDUCTION 스코프: `block` 4슬롯(출시 차단 카피) 우선 구현. `pass`/`warn`은 후속.

---

## 7. 변경 이력

| 버전 | 날짜 | 비고 |
|------|------|------|
| v1.0 | 2026-04-30 | 진채봉 Editor 신설 — 4 게이트 × 4 상태 = 16 슬롯, ko/en 32줄 |

— *에러도 시(詩)이옵나이다. 다만 정직한 시.*
