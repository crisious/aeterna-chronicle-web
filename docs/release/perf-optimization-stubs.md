# 성능 최적화 — 코드 stub SSOT v1.0

> 스프린트: Auto-Performance-Optimization (Asset 단계)
> 작성: 계섬월 (Staff Engineer) · 2026-04-30
> 단계: Asset (코드 stub) — Build 단계에서 실 구현 인계
> 1차 SSOT — 모듈 시그니처/책임 분담의 정본. 코드는 본 문서를 미러한다.

---

## 1. 약속 4지표 (게이트 SSOT)

| 지표 | 임계 | 측정 모듈 | 게이트 키 |
|---|---|---|---|
| FPS 평균 (전투/맵) | ≥ 55 | `HotspotProfiler` + `perfTelemetry` | `fpsAvgMin` |
| FPS p1 (튀는 프레임) | ≥ 30 | `HotspotProfiler` topByP95 | `fpsP1Min` |
| 5분 메모리 증가 | ≤ 50 MB | `SceneMemoryGuard.getSessionGrowthMb` | `memGrowthMaxMb` |
| 초기 로딩 | ≤ 5,000 ms | `AssetChunkLoader.getInitialLoadMs` | `initialLoadMaxMs` |
| 초기 번들 (gzip) | ≤ 2,048 KB | `AssetBudgetReporter.scanAndReport` | `initialBundleMaxKb` |
| 단일 atlas | ≤ 4,096 KB | `AssetBudgetReporter` | `atlasMaxKb` |

> 모든 임계는 `client/src/perf/types.ts`의 `PERF_BUDGETS` 상수에 미러됨. 임의 변경 금지 — 백능파(Strategy) 승인 필수.

---

## 2. 모듈 4 — 단일 책임 분담 (두련사 *선禪 4계*)

```
[HotspotProfiler]   ──→ FPS 핫스팟 식별 (어디서 끊기는가)
[SceneMemoryGuard]  ──→ 씬 전환 누수 가드 (무엇이 새는가)
[AssetChunkLoader]  ──→ 청크 lazy 로드  (언제 로드하는가)
[AssetBudgetReport] ──→ 빌드 사이즈 예산 (얼마까지 허용하는가)
```

각 모듈은 **단일 책임**. 서로 호출하지 않으며 `perfTelemetry` 하나만 공통 의존.

### 2.1 `HotspotProfiler` — 함수 단위 측정
- `begin(scopeId) → ProfileHandle` / `measure(scopeId, fn)` / `measureAsync`
- `getSamples()` / `buildReport(sceneKey, inCombat)` → `HotspotReport`
- 윈도우 통계: call/total/avg/p95/max
- production 빌드는 `enabled: false` 강제 → no-op
- 측정 자체가 성능을 훼손해선 안 됨 (`sampleRate` 게이트)

### 2.2 `SceneMemoryGuard` — 누수 진단
- `onSceneEnter(sceneKey)` → baseline 캡처 (heap/textures/listeners/timers)
- `onSceneExit(sceneKey)` → `MemoryDiagnostic` (settle → tryForceGc → 차감)
- 의존 분리: `MemoryProbe` 인터페이스로 Phaser 어댑터 주입
- 누수 판정: `growthMb > threshold || leaked* > 0`

### 2.3 `AssetChunkLoader` — 청크 분할
- 매니페스트 group: `preload | chapter | region | battle | optional`
- `bootPreload()` — preload 그룹만 동기 (초기 로딩 게이트 측정 시작)
- `ensureFor(trigger)` — sceneKey/chapterId로 필요한 청크 보장
- `prefetch(ids)` — idle 큐 / `evict(ids)` / `runGc()` 메모리 압박 시
- 의존 분리: `ChunkManifestProvider` + `ChunkPhaserAdapter`

### 2.4 `AssetBudgetReporter` — CI 게이트
- `scan() → FileMeta[]` (dist/ 재귀 + gzipBytes 산정)
- `evaluate(files)` → `AssetBudgetEntry[]` (overBudget 마킹)
- `scanAndReport()` → `AssetBudgetReport` (PASS/WARN/FAIL)
- `formatReport(report, 'tty'|'json')` — NO_COLOR 존중
- WARN 임계: 예산의 80% 도달

---

## 3. 산출물 — 6 파일 / ~520 LOC

| 경로 | 책임 | LOC |
|---|---|---|
| `client/src/perf/types.ts` | 공통 타입 + `PERF_BUDGETS` SSOT | ~145 |
| `client/src/perf/HotspotProfiler.ts` | 핫스팟 측정 stub | ~110 |
| `client/src/perf/SceneMemoryGuard.ts` | 메모리 누수 가드 stub | ~135 |
| `client/src/perf/AssetChunkLoader.ts` | 청크 lazy 로드 stub | ~130 |
| `client/src/perf/AssetBudgetReport.ts` | 빌드 예산 리포터 stub | ~110 |
| `client/src/perf/index.ts` | barrel export | ~20 |

---

## 4. 기존 모듈과의 경계 (중복 회피)

| 기존 | 본 stub | 경계 |
|---|---|---|
| `client/src/telemetry/perfTelemetry.ts` | — | 샘플링/배치 전송. 본 stub은 **호출하지 않음** |
| `client/src/utils/PerformanceOptimizer.ts` | — | 일반 최적화 헬퍼. hotspot/memory 측정 책임 분리 |
| `client/src/assets/AssetManager.ts` | `AssetChunkLoader` | AssetManager는 path/preload, ChunkLoader는 lazy/evict |
| `shared/types/performance.ts` | `types.ts` | 전송 DTO vs 런타임/예산 타입 — 분리 유지 |

> 인계 시 주의 (Build 단계 — 본인 계섬월): `AssetChunkLoader.ChunkPhaserAdapter` 구현은 `AssetManager`의 path 상수를 재사용하되 LoaderPlugin 호출만 위임. 양방향 의존 금지.

---

## 5. Build 단계 인계 체크리스트 (계섬월 → 계섬월)

- [ ] `HotspotProfiler` — performance.now 윈도우 + p95 quickselect 구현
- [ ] `HotspotProfiler` — `BattleScene.update` / `MapScene.render` / `TweenManager.tick` 측정 포인트 삽입
- [ ] `SceneMemoryGuard.MemoryProbe` — Phaser TextureManager / EventEmitter 어댑터 구현
- [ ] `SceneMemoryGuard` — 모든 씬의 shutdown 핸들러에 `onSceneExit` 배선
- [ ] `AssetChunkLoader.ChunkManifestProvider` — chunks.json 생성 (chapter/region 단위)
- [ ] `AssetChunkLoader.ChunkPhaserAdapter` — Phaser LoaderPlugin 위임 구현
- [ ] `AssetBudgetReporter` — Node CLI (`scripts/perf-budget.mjs`) + CI workflow 추가
- [ ] `npm run perf:budget` / `perf:report` / `perf:gate` 3종 등록
- [ ] `launch_checklist §2.24 perf-gate` SSOT 신설 (4 약속 표 + 게이트 흐름)
- [ ] CHANGELOG `[1.0.0-rc.3]` 항목 추가 — assets 단계 LOC 실측

---

## 6. 봉인 항목 (이소화 비협상 — Build 단계까지 변경 금지)

1. **`PERF_BUDGETS` 6개 임계값** — 변경 시 백능파 승인 + DESIGN.md 미러
2. **모듈 4개 단일 책임 경계** — 한 모듈이 다른 모듈을 직접 호출 금지
3. **Phaser 의존 격리** — `MemoryProbe` / `ChunkPhaserAdapter` 인터페이스 경유 필수
4. **production no-op 보장** — `HotspotProfiler.enabled` / `SceneMemoryGuard.enabled` 기본 false

---

## 7. ship-gate 4-AND (예고)

```
perf:gate ∧ mobile:gate ∧ save:gate ∧ data:validate
```

`perf:gate` = `fps:check ∧ memory:check ∧ load:check ∧ budget:check`

— 검의 날을 갈기 전에 칼집부터 맞춘다. 4 모듈의 시그니처는 Build 단계에서 그대로 살이 붙는다.
