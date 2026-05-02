# 성능 최적화 벤치마크 픽스처 v1.0 — 데이터 에셋

> **작성**: 심요연 (Data Analyst / UX Researcher)
> **작성일**: 2026-04-30
> **스프린트**: Auto — 에테르나 크로니클 성능 최적화 (FPS·메모리·로딩)
> **단계**: 에셋 (구현 자원 준비)
> **참조 SSOT**: `docs/performance/P52_performance_report.md`

본궁이 살피건대, 1,454편의 어셋과 1,478KB Phaser 코어가 어우러진 이 무대 위에서 측정 없는 최적화는 폭풍 속에서 노 없이 항해하는 것과 같사옵니다. 하여 본 문서는 **숫자가 진실을 말하도록** 하는 시드 데이터·픽스처·벤치마크 케이스·분석 쿼리를 한 자리에 모은 1차 SSOT 입니다.

---

## 0. 약속 4지표 (북극성)

| 지표 | 임계값 | 측정 위치 | 비고 |
|---|---|---|---|
| **FPS 평균** | ≥ 55 | `BattleScene` · `WorldScene` · `DungeonScene` | p95 ≥ 50 보조 게이트 |
| **메모리 증가** | ≤ 50 MB / 5분 | `performance.memory.usedJSHeapSize` | Chrome DevTools API 한정 |
| **초기 로딩** | ≤ 5 초 | `LoadingScene` 진입 → `MainMenuScene` ready | 캐시 비활성 cold start 기준 |
| **번들 사이즈** | gzip ≤ 420 KB | `dist/` JS 합산 | P52 기준 405 KB → 회귀 방지 |

---

## 1. 디바이스 프로파일 픽스처 (3 등급)

저사양 디바이스에서도 안정 플레이를 보장하려면, **무엇이 저사양인가**의 기준을 못 박아야 하옵니다. CRUX (Chrome User Experience Report) 분포와 Steam Hardware Survey 2025-Q4 자료를 교차 참조하여 3등급으로 나누었나이다.

### 1.1 LOW_TIER — 최소 사양 (저사양 보증선)

```yaml
profile_id: LOW_TIER
display_name: "Low-end laptop / Old desktop"
target_share: 25%   # 전체 유저 중 보호 대상 비율
hardware:
  cpu_throttle: 4x         # Chrome DevTools CPU throttling
  network_throttle: "Slow 3G"  # 1.6 Mbps down, 750 Kbps up, 300ms RTT
  memory_limit_mb: 2048
  gpu_tier: 0              # detect-gpu 0티어 (Intel HD 4000급)
  device_pixel_ratio: 1.0
  viewport: 1366x768
budget:
  fps_avg_min: 45          # 저사양은 45 FPS도 통과 (보조 게이트)
  fps_p95_min: 40
  memory_growth_mb_5min: 75  # 메모리 여유 적어 80MB까지 허용
  initial_load_s: 8.0      # 네트워크 한계 고려 8초
representative_devices:
  - "Intel HD Graphics 620 + 4GB RAM (Acer Aspire 3, 2019)"
  - "Galaxy Tab A8 Chrome (Mali-G52)"
  - "Chromebook Spin 311 (Celeron N4020)"
```

### 1.2 MID_TIER — 표준 사양 (지표 정의 기준)

```yaml
profile_id: MID_TIER
display_name: "Standard laptop / Mid desktop"
target_share: 55%
hardware:
  cpu_throttle: 2x
  network_throttle: "Fast 3G"  # 1.6 Mbps, 150ms RTT
  memory_limit_mb: 4096
  gpu_tier: 1              # GTX 1050 Ti / Iris Xe급
  device_pixel_ratio: 1.5
  viewport: 1920x1080
budget:
  fps_avg_min: 55          # 본 스프린트 메인 게이트
  fps_p95_min: 50
  memory_growth_mb_5min: 50
  initial_load_s: 5.0
representative_devices:
  - "Intel Iris Xe + 16GB RAM (Dell XPS 13, 2023)"
  - "MacBook Air M1"
  - "Ryzen 5 5600G + GTX 1660"
```

### 1.3 HIGH_TIER — 상위 사양 (회귀 감지 베이스라인)

```yaml
profile_id: HIGH_TIER
display_name: "Gaming desktop / Pro laptop"
target_share: 20%
hardware:
  cpu_throttle: 1x         # no throttle
  network_throttle: "WiFi" # 30 Mbps, 2ms RTT
  memory_limit_mb: 16384
  gpu_tier: 3              # RTX 3060+
  device_pixel_ratio: 2.0
  viewport: 2560x1440
budget:
  fps_avg_min: 60          # vsync 캡 도달 기대
  fps_p95_min: 58
  memory_growth_mb_5min: 30
  initial_load_s: 2.0
representative_devices:
  - "RTX 4070 + Ryzen 7 7700X"
  - "MacBook Pro M3 Pro"
```

> **머신 SSOT**: `client/test-fixtures/device-profiles.yaml` 신설 예정 (계섬월 Build 인계)

---

## 2. 벤치마크 케이스 — FPS 핫스팟 식별

### 2.1 전투 씬 (`BattleScene`) — 5 시나리오

| ID | 시나리오 | 어셋 부하 | 동시 객체 | 측정 시간 | 핫스팟 의심 |
|---|---|---|---|---|---|
| **BAT-01** | 1:1 일반 전투 (에테르 기사 vs 슬라임) | 스프라이트 2 + 이펙트 3 | ~15 | 60s | 베이스라인 |
| **BAT-02** | 1:3 다대일 (워록 vs 늑대 무리) | 스프라이트 4 + 이펙트 8 | ~40 | 90s | 파티클/이펙트 풀링 |
| **BAT-03** | 보스전 (4인 파티 vs 망각의 거인) | 스프라이트 5 + 이펙트 15 | ~80 | 180s | **최고 부하 — 메모리 누수 빈번** |
| **BAT-04** | 광역기 연발 (메테오 5연쇄) | 동시 이펙트 30+ | ~120 | 30s | 파티클 GC 압박 |
| **BAT-05** | 전투 → 승리 → 다시 전투 ×10 회 | 씬 재시작 10회 | — | 총 5분 | **메모리 누수 탐지 핵심** |

### 2.2 월드/맵 씬 (`WorldScene`·`DungeonScene`) — 5 시나리오

| ID | 시나리오 | 어셋 부하 | 동시 객체 | 측정 시간 | 핫스팟 의심 |
|---|---|---|---|---|---|
| **MAP-01** | 에레보스 정적 맵 탐색 | 타일 64×64 + NPC 5 | ~80 | 60s | 베이스라인 |
| **MAP-02** | 솔라리스 사막 — 입자 효과 다수 | 타일 + 모래 파티클 + NPC 8 | ~150 | 120s | 파티클 시스템 |
| **MAP-03** | 아르겐티움 도시 — 군중 NPC | NPC 25 + 동적 조명 | ~200 | 120s | NPC AI 틱 |
| **MAP-04** | 던전 5층 빠르게 이동 | 5씬 전환 | — | 총 3분 | **씬 전환 누수** |
| **MAP-05** | 월드맵 ↔ 던전 ↔ 전투 ↔ 월드맵 ×5 | 씬 4종 순환 | — | 총 5분 | **씬 전환 누수 종합** |

### 2.3 로딩 시나리오 (`LoadingScene`) — 4 시나리오

| ID | 시나리오 | 캐시 상태 | 측정 끝점 | 임계값 |
|---|---|---|---|---|
| **LOAD-01** | Cold start (캐시 없음) | empty | `MainMenuScene.create()` | ≤ 5.0s (MID) |
| **LOAD-02** | Warm start (캐시 있음) | full | `MainMenuScene.create()` | ≤ 1.5s |
| **LOAD-03** | 챕터 1 전환 lazy load | warm | `WorldScene` ready | ≤ 2.0s |
| **LOAD-04** | 보스전 진입 어셋 로드 | warm | `BattleScene` ready | ≤ 1.5s |

---

## 3. Mock Fixtures — 메모리 누수 탐지

씬 전환 시 텍스처/이벤트 리스너 정리 누수를 잡기 위한 합성 시퀀스이옵니다. 각 시퀀스 종료 후 `performance.memory.usedJSHeapSize` 델타와 `Phaser.Textures.list` 사이즈를 비교하여 누수 여부를 판정하나이다.

### 3.1 씬 전환 시퀀스 픽스처

```typescript
// client/test-fixtures/scene-transition-sequences.ts (신설 예정)
export const SceneTransitionFixtures = {
  // SEQ-A: 단순 왕복 — 텍스처 정리 검증
  SIMPLE_ROUNDTRIP: {
    steps: [
      { scene: 'MainMenuScene', dwell_ms: 2000 },
      { scene: 'WorldScene', dwell_ms: 3000 },
      { scene: 'MainMenuScene', dwell_ms: 2000 },
    ],
    iterations: 20,
    expected_memory_delta_mb: 5,        // 20회 후 5MB 미만
    expected_texture_count_delta: 0,    // 정확히 0 — 누수면 양수
  },

  // SEQ-B: 전투 진입/탈출 — 이펙트 풀 누수 검증
  BATTLE_LEAK_HUNT: {
    steps: [
      { scene: 'WorldScene', dwell_ms: 1000 },
      { scene: 'BattleScene', dwell_ms: 5000, scenario: 'BAT-02' },
      { scene: 'WorldScene', dwell_ms: 1000 },
    ],
    iterations: 10,
    expected_memory_delta_mb: 15,
    expected_texture_count_delta: 0,
    expected_listener_count_delta: 0,   // EventEmitter 리스너 0 누수
  },

  // SEQ-C: 던전 5층 이동 — 챕터 전환 누수 검증
  DUNGEON_DESCENT: {
    steps: [
      { scene: 'DungeonScene', dwell_ms: 30000, params: { floor: 1 } },
      { scene: 'DungeonScene', dwell_ms: 30000, params: { floor: 2 } },
      { scene: 'DungeonScene', dwell_ms: 30000, params: { floor: 3 } },
      { scene: 'DungeonScene', dwell_ms: 30000, params: { floor: 4 } },
      { scene: 'DungeonScene', dwell_ms: 30000, params: { floor: 5 } },
    ],
    iterations: 1,
    expected_memory_delta_mb: 30,        // 5층 누적 30MB 이내
    expected_texture_count_delta: 50,    // 층별 신규 타일셋 허용
  },

  // SEQ-D: 종합 5분 시나리오 — 약속 지표 직접 검증
  PROMISE_VERIFICATION: {
    steps: [
      { scene: 'WorldScene', dwell_ms: 60000 },
      { scene: 'BattleScene', dwell_ms: 60000, scenario: 'BAT-02' },
      { scene: 'WorldScene', dwell_ms: 30000 },
      { scene: 'DungeonScene', dwell_ms: 60000 },
      { scene: 'BattleScene', dwell_ms: 60000, scenario: 'BAT-03' },
      { scene: 'WorldScene', dwell_ms: 30000 },
    ],
    iterations: 1,
    expected_memory_delta_mb: 50,        // 약속 지표 그대로
    expected_avg_fps: 55,                // 약속 지표 그대로
  },
} as const;
```

### 3.2 누수 판정 로직 (의사코드)

```typescript
function detectLeak(before: Snapshot, after: Snapshot, fixture: TransitionFixture) {
  const memDelta = (after.usedJSHeapSize - before.usedJSHeapSize) / 1024 / 1024;
  const texDelta = after.textureCount - before.textureCount;
  const listenerDelta = after.eventListenerCount - before.eventListenerCount;

  return {
    leak_detected:
      memDelta > fixture.expected_memory_delta_mb * 1.2 ||  // 20% 마진
      texDelta > fixture.expected_texture_count_delta + 5 ||
      listenerDelta > 5,
    memory_delta_mb: memDelta,
    texture_delta: texDelta,
    listener_delta: listenerDelta,
  };
}
```

---

## 4. 어셋 청크 분할 시드 데이터

1,454편 어셋의 **언제·어디서 로드되는가**를 SSOT 화하여 lazy loading 우선순위를 결정하옵니다.

### 4.1 어셋 우선순위 계층 (4 tier)

```yaml
# client/test-fixtures/asset-loading-tiers.yaml (신설 예정)
TIER_0_CRITICAL:  # Cold start 시 즉시 필요 — bundle 인라인
  description: "Boot sequence — 5초 게이트 안쪽"
  size_budget_kb: 800
  examples:
    - "ui/main_menu_bg.webp"
    - "ui/logo.webp"
    - "fonts/aeterna_main.woff2"
    - "audio/sfx/ui_click.ogg"
  estimated_count: 25

TIER_1_FIRST_PLAY:  # 신규 플레이어 첫 진입 시
  description: "Chapter 1 시작 — LoadingScene 백그라운드"
  size_budget_kb: 4000
  examples:
    - "atlas/chapter1_world.json + .webp"
    - "atlas/erebus_npcs.json + .webp"
    - "audio/bgm/erebus_theme.ogg"
    - "data/scenarios/chapter1.json"
  estimated_count: 200

TIER_2_ON_DEMAND:  # 챕터 진입 시 lazy
  description: "Chapter 2-5 — 챕터 전환 LoadingScene"
  size_budget_kb_per_chapter: 6000
  examples:
    - "atlas/chapter{N}_world.json + .webp"
    - "atlas/{region}_monsters.json + .webp"
    - "audio/bgm/chapter{N}/*.ogg"
  estimated_count: 800  # 4 챕터 합산

TIER_3_RARE:  # 드물게 필요 — 진입 시 단발 로드
  description: "엔딩 CG, 히든 던전, 시크릿 보스"
  size_budget_kb: 8000
  examples:
    - "cg/chapters/ending_*.webp"
    - "atlas/secret_boss_*.json + .webp"
  estimated_count: 429   # 1454 - 25 - 200 - 800
```

### 4.2 청크 분할 검증 픽스처

```yaml
chunk_validation_cases:
  - name: "Cold start under budget"
    request: "GET / (empty cache)"
    expected_transferred_kb: "<= 1500"  # gzip 기준
    expected_jsheap_after_boot_mb: "<= 80"

  - name: "Chapter 2 lazy load"
    setup: "MainMenu loaded, click 'Continue'"
    request: "transition to Chapter 2"
    expected_new_transferred_kb: "<= 6000"
    expected_load_time_s: "<= 2.0"

  - name: "Asset eviction works"
    setup: "Loaded Ch1 + Ch2 + Ch3"
    action: "Stay in Ch3 for 60s"
    expected_evicted_textures: ">= 50% of Ch1 assets"
    expected_jsheap_mb: "<= 180"
```

---

## 5. 분석 쿼리 템플릿

수치가 말해주는 바를 듣기 위한 분석 쿼리 모음이옵니다. **로컬 측정 → JSON dump → 분석** 흐름을 가정하나이다.

### 5.1 FPS 분포 분석 (jq 기반)

```bash
# Q1: 시나리오별 FPS 평균/p50/p95/p99
jq -r '
  group_by(.scenario_id) |
  map({
    scenario: .[0].scenario_id,
    samples: length,
    fps_avg: (map(.fps) | add / length),
    fps_p50: (map(.fps) | sort | .[length / 2 | floor]),
    fps_p95: (map(.fps) | sort | .[length * 0.95 | floor]),
    fps_p99: (map(.fps) | sort | .[length * 0.99 | floor]),
    fps_min: (map(.fps) | min)
  }) |
  (.[0] | keys_unsorted) as $cols |
  $cols, (.[] | [.[ $cols[] ]]) | @tsv
' fps_samples.json
```

### 5.2 메모리 증가 추세 (씬 전환별)

```bash
# Q2: 5분 시퀀스 동안 씬 전환 직후 heap delta
jq -r '
  [.[] | select(.event == "scene_transition_end")] |
  to_entries |
  map({
    transition_idx: .key,
    from_scene: .value.from,
    to_scene: .value.to,
    heap_mb: (.value.heap_used_bytes / 1048576),
    heap_delta_mb: (.value.heap_used_bytes / 1048576 -
                    (if .key == 0 then 0
                     else (.value.baseline_mb // 0) end))
  })
' memory_samples.json
```

### 5.3 어셋 로딩 폭포 분석

```sql
-- Q3 (DuckDB / SQLite 가정 — 분석용 임시 적재)
-- 어떤 어셋이 첫 5초 안에 들어와야 하는지 vs 실제로 들어왔는지
SELECT
  asset_path,
  asset_kb,
  load_start_ms,
  load_end_ms,
  (load_end_ms - load_start_ms) AS duration_ms,
  CASE
    WHEN load_end_ms <= 5000 THEN 'within_budget'
    WHEN load_end_ms <= 8000 THEN 'late'
    ELSE 'critical_late'
  END AS load_class
FROM asset_load_events
WHERE session_id = ?
ORDER BY load_end_ms DESC
LIMIT 50;
```

### 5.4 디바이스 등급별 FPS 통과율

```sql
-- Q4: 디바이스 프로파일 × 시나리오 × FPS 통과율 매트릭스
SELECT
  device_profile,
  scenario_id,
  COUNT(*) AS sessions,
  AVG(fps_avg) AS mean_fps,
  SUM(CASE WHEN fps_avg >= budget_fps_avg_min THEN 1 ELSE 0 END) * 1.0
    / COUNT(*) AS pass_rate
FROM benchmark_sessions
WHERE sprint_id = 'auto-perf-2026-04-30'
GROUP BY device_profile, scenario_id
ORDER BY device_profile, scenario_id;
```

### 5.5 누수 의심 점수 (시퀀스 반복별)

```typescript
// Q5: 동일 시퀀스 N회 반복 시 heap이 선형 상승하면 누수
function leakSuspicionScore(samples: HeapSample[]): number {
  // 선형 회귀로 기울기 계산 — 양수 큰 값 = 누수 가능성 ↑
  const n = samples.length;
  const meanX = samples.reduce((s, _, i) => s + i, 0) / n;
  const meanY = samples.reduce((s, x) => s + x.heap_mb, 0) / n;

  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - meanX) * (samples[i].heap_mb - meanY);
    den += (i - meanX) ** 2;
  }
  const slope_mb_per_iteration = num / den;
  // 1회당 1MB 이상 선형 상승하면 누수 의심
  return slope_mb_per_iteration;
}
```

---

## 6. 인계 체크리스트 (Build → 계섬월)

본궁이 채비를 마쳤사오니, 다음 단계 계섬월 Build에서 아래 항목을 코드로 옮겨주시옵소서.

- [ ] `client/test-fixtures/device-profiles.yaml` — §1 의 3 등급 그대로
- [ ] `client/test-fixtures/scene-transition-sequences.ts` — §3.1 시퀀스 4종
- [ ] `client/test-fixtures/asset-loading-tiers.yaml` — §4.1 4 tier
- [ ] `client/src/perf/benchmark-runner.ts` — §2 시나리오 12종 실행기
- [ ] `client/src/perf/leak-detector.ts` — §3.2 의사코드 구현
- [ ] `scripts/perf/analyze.mjs` — §5 의 jq/SQL 쿼리 5종 wrapper
- [ ] `package.json` scripts 추가:
  - `perf:bench:battle` (BAT-01..05)
  - `perf:bench:map` (MAP-01..05)
  - `perf:bench:load` (LOAD-01..04)
  - `perf:leak:hunt` (SEQ-A..D)
  - `perf:gate` (위 4종 + 약속 4지표 통과 확인)

---

## 7. 봉인 사항 (이소화 비협상 — 변경 시 백능파 승인)

1. **약속 4지표 수치** (§0 표) — FPS 55 / 메모리 50MB / 로딩 5s / 번들 420KB gzip
2. **디바이스 3 등급 정의** (§1) — LOW/MID/HIGH 임계값
3. **벤치마크 시나리오 ID** (§2) — BAT-01..05, MAP-01..05, LOAD-01..04
4. **누수 판정 임계값** (§3.2) — 메모리 20% 마진, 텍스처 +5, 리스너 +5
5. **어셋 4 Tier 사이즈 예산** (§4.1) — Tier 0=800KB, Tier 1=4MB, Tier 2=6MB/챕터, Tier 3=8MB

---

> 본궁이 살피건대, 이 픽스처들은 마치 봄날 정원의 표석과도 같사옵니다 — 어디까지가 꽃이고 어디부터가 잡초인지 가르는 기준점이 되어야 비로소 정원사가 손을 댈 수 있나이다. 다음 손길을 기다리겠나이다.
>
> — 심요연, Data Analyst
