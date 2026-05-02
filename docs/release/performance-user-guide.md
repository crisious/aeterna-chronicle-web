# 성능 최적화 사용자 가이드 v1.0

> 작성: 진채봉 Editor
> 작성일: 2026-04-30
> 스프린트: Auto: 성능 최적화 — FPS·메모리·로딩 시간
> 1차 SSOT: 본 문서 (사람이 읽는 정본). README §⚡는 본 문서를 미러.

---

## 0. 한 손 흐름도

```
[Profile FPS] ──▶ [Memory] ──▶ [Lazy Load] ──▶ [Bundle]
   60s 샘플       씬 10회 전환    chunk 분할      산출물 압축
   ≥55 fps       ≤50MB 증가      초기 ≤2MB       이미지·아틀라스
```

핵심: **Profile부터 시작 — 측정 없이는 최적화 없다.** 핫스팟 식별 → 영향도 큰 곳 우선 → 재측정.

---

## 1. 약속 4지표 (SSOT)

| 지표 | 임계 | 측정 환경 | 비고 |
|------|------|----------|------|
| FPS 평균 | ≥ 55 | 전투(아르겐티움 도시 외곽) + 월드맵(에레보스) 각 60초 | p1 ≥ 30, 드롭 카운트 측정 |
| 메모리 증가 | ≤ 50MB / 5분 | 씬 10회 전환 후 idle 5분 | `performance.memory.usedJSHeapSize` |
| 초기 로딩 | ≤ 5초 | 3G Slow / 4G / WiFi 각 측정 | first interactive 기준 |
| 초기 번들 | ≤ 2MB gzipped | `dist/assets/index-*.js` + 첫 chunk | 후속 chunk는 라우팅 시 lazy |

> ⚠️ 임의 갱신 금지 — 변경은 백능파(Strategy) 승인 필수.

---

## 2. 4 게이트 상세

### 2.1 Profile (FPS 모니터링)

**목적**: 전투·월드맵에서 평균 ≥ 55fps 보장 + 핫스팟 식별.

**도구**:
- `client/src/debug/FPSMonitor.ts` — 1초 단위 평균/p1/p5 보고
- Chrome DevTools Performance 탭 — 프레임 차트 캡처 (10초)
- `npm run perf:fps` — 자동화 진입점

**핫스팟 우선순위**:

| 순위 | 영역 | 흔한 원인 |
|------|------|----------|
| 1 | 전투 ATB 스킬 이펙트 | 파티클 다발·동시 트윈 |
| 2 | 월드맵 카메라 추적 | 매 프레임 sprite sort |
| 3 | NPC 대화 페이드 | 텍스트 리렌더링 |
| 4 | 인벤토리 스크롤 | 비활성 아이템 렌더 |

### 2.2 Memory (누수 탐지)

**목적**: 씬 전환 시 텍스처·이벤트 리스너·트윈 정리, 5분 idle 시 ≤50MB 증가.

**점검 체크리스트** (씬 `shutdown()`에서):

- [ ] `this.textures.remove(key)` — 씬 전용 텍스처 해제
- [ ] `this.events.off()` — 자체 이벤트 리스너 해제
- [ ] `this.tweens.killAll()` — 진행 중 트윈 종료
- [ ] `this.sound.stopAll()` — BGM·SFX 중단 (지속 BGM은 예외 처리)
- [ ] `this.cache.audio.remove(key)` — 일회용 오디오 해제

**측정 방법**:
1. Chrome DevTools Memory 탭 → Heap snapshot 1차
2. 씬 10회 전환 + 5분 idle
3. Heap snapshot 2차 → 1차 대비 ≤ 50MB

### 2.3 Lazy Load (어셋 청크 분할)

**목적**: 초기 번들 ≤ 2MB gzipped, 챕터별 어셋은 진입 시 lazy.

**분할 정책**:

| 청크 | 포함 | 로드 시점 |
|------|------|----------|
| `core` | 엔진·UI·메인 메뉴 | 초기 (≤ 2MB) |
| `chapter-1` | 에레보스 어셋 | Ch.1 진입 시 |
| `chapter-2` | 실반헤임 어셋 | Ch.2 진입 시 |
| `battle` | 전투 이펙트·UI | 첫 인카운터 시 |
| `chapter-N` | 각 챕터 | 해당 챕터 진입 시 |

**Vite 설정 키워드**: `manualChunks` + `dynamicImport` + `import.meta.glob`

### 2.4 Bundle (산출물 사이즈)

**목적**: 1,454 어셋의 총 사이즈를 디스크·네트워크 양면에서 줄임.

**적용 기법**:

| 기법 | 도구 | 기대 효과 |
|------|------|----------|
| PNG 압축 (lossless) | `pngquant` / `oxipng` | -30~50% |
| WebP 변환 (지원 브라우저) | `sharp` | -25~35% |
| 텍스처 아틀라스 | TexturePacker / `free-tex-packer-cli` | drawcall 감소 |
| 오디오 비트레이트 | OGG 96kbps (BGM) / 64kbps (SFX) | -40% |
| Brotli 압축 (정적) | Vite 빌드 + 서버 헤더 | -15~25% |

---

## 3. 빠른 시작 (npm scripts)

```bash
npm run perf:fps        # FPS 샘플 60초
npm run perf:memory     # 메모리 누수 탐지
npm run perf:load       # 초기 로딩 측정 (3G/4G/WiFi)
npm run perf:bundle     # 빌드 산출물 분석 + 시각화
npm run perf:gate       # 4 게이트 일괄 (CI 진입점)
```

`package.json` 등록은 계섬월(Build) 단계에서 진행.

---

## 4. 출력 모드

| 모드 | 진입 | 용도 |
|------|------|------|
| TTY | 기본 | 컬러 + 표 + 핫스팟 강조 |
| `NO_COLOR=1` | env | CI 로그 가독성 |
| `--json` | flag | 자동화 (JSON Report → CHANGELOG 슬롯 충진) |

---

## 5. 핫스팟 보고 형식 (Profile 게이트)

```
[FPS Profile] battle/aergentium_outskirts (60s)
─────────────────────────────────────────────────
  avg:    58.3 fps  ✅ (≥ 55)
  p1:     42.1 fps  ✅ (≥ 30)
  p5:     49.7 fps
  drops:  3 (frames < 30fps)

핫스팟 (CPU > 8ms):
  1. ParticleEmitter.tick()      12.4ms  scenes/BattleScene.ts:142
  2. SortChildren by depth        9.1ms  client/src/util/depth.ts:23
  3. NPCDialogText.layout()       8.7ms  scenes/NPCScene.ts:88
```

---

## 6. 메모리 누수 보고 형식

```
[Memory Audit] scene-transition × 10 + idle 5min
─────────────────────────────────────────────────
  initial:  142.3 MB
  after:    178.1 MB
  delta:    +35.8 MB  ✅ (≤ 50MB)

미해제 의심:
  • Texture: bg-erebos-cave-2  (3.2MB)  ← TownScene.shutdown() 누락
  • Listener: pointermove × 4  ← BattleHUD.destroy() 누락
```

---

## 7. 자주 묻는 질문 (FAQ)

**Q1. p1 30fps 미만이면 무조건 FAIL?**
A. 예. 평균 ≥ 55라도 한 순간 5fps 까지 떨어지면 체감 끊김. p1 ≥ 30 봉인.

**Q2. 청크 분할 후 첫 챕터 진입이 느려졌어요.**
A. `<link rel="prefetch">` 로 메인 메뉴 idle 시 prefetch. `client/src/loaders/PrefetchManager.ts` 신설 권장.

**Q3. WebP 변환했는데 사파리에서 깨져요.**
A. `<picture>` 가 아닌 Phaser는 capability detection 후 fallback PNG 로드. `Loader.imageWithFallback()` 헬퍼 추가.

**Q4. `performance.memory` 가 Firefox에서 undefined입니다.**
A. Chromium 전용 API. Firefox는 about:memory 수동 캡처 또는 CI Chromium 한정 게이트로 운영.

**Q5. 텍스처 아틀라스로 묶으면 동적 어셋(NPC 초상화)도 묶어야 하나요?**
A. 아니오. 동시 사용 빈도가 높은 정적 UI(전투 HUD·아이콘)만 아틀라스. 챕터별 NPC 초상화는 lazy load 유지.

**Q6. 5분 idle 메모리 증가가 +51MB 나왔습니다. 1MB 차이도 FAIL?**
A. 예. 봉인 임계는 협상 불가. 누수 원인을 잡아 수치를 낮추는 것이 정공법.

**Q7. 모바일·데스크탑 임계가 다른가요?**
A. 동일. 저사양 디바이스 보장이 본 스프린트의 목적이므로 모바일이 통과하면 데스크탑은 자동 통과.

---

## 8. 연관 SSOT

- 디자인 시스템: `docs/release/design-system_performance.md` (가춘운, 신설 예정)
- 시각 에셋: `docs/release/assets_performance.md` (가춘운, 신설 예정)
- 아키텍처: 두련사 *선禪 4계* — Profile → Memory → Lazy → Bundle
- 게이트 정책: 백능파 **HOLD-by-default** + ship-gate 4-AND
- 측정 책임: 적경홍 QA (Test 단계 실측 캡처 → 본 가이드 §1 표 충진)

---

## 9. 변경 이력

| 버전 | 날짜 | 비고 |
|------|------|------|
| v1.0 | 2026-04-30 | 진채봉 Editor 신설 — Auto: 성능 최적화 스프린트 assets 단계 |

— *측정 없이는 개선 없고, 기록 없이는 측정 없사옵니다.*
