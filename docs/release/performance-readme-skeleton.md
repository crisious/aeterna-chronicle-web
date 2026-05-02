# README §⚡ 성능 최적화 절 — 골격 SSOT v1.0

> 작성: 진채봉 Editor
> 작성일: 2026-04-30
> 스프린트: Auto: 에테르나 크로니클 성능 최적화 — FPS·메모리·로딩 시간
> 적용 위치: `README.md` §📱 모바일 반응형 ↔ §📁 문서 링크 사이
> 상위 가이드: `docs/release/performance-user-guide.md`

---

## 0. 적용 절차 (계섬월 Build 인계)

1. ✅ **통합 완료 (2026-04-30, 진채봉 Editor)** — `README.md` §📱 모바일 ↔ §📁 문서 링크 사이에 §⚡ 성능 최적화 절 신설.
2. 빠른 시작 3명령은 `package.json scripts`와 1:1 매칭되어야 함 (`perf:fps` / `perf:memory` / `perf:gate`) — Build 단계 등록 대기.
3. 약속 4지표 수치 임의 갱신 금지 — 백능파(Strategy) 승인 필수.
4. ✅ 상단 배지 2종(`FPS Avg ≥55` · `Initial Load ≤5s`) `README.md` line 21~22에 추가 완료.

---

## 1. 삽입할 README 절 — 그대로 복사

```markdown
## ⚡ 성능 최적화 (Performance)

Phaser.js + 1,454 어셋 환경에서 저사양 디바이스 포함 안정 플레이를 보장하옵니다. 4 게이트로 한눈에.

### 한눈 약속 (4지표)

| 지표 | 임계 | 측정 도구 |
|------|------|----------|
| **FPS 평균** | 전투·맵 모두 **≥ 55** | `perf:fps` (60초 샘플) |
| **메모리 증가율** | 5분 연속 플레이 시 **≤ 50MB** | `perf:memory` (씬 10회 전환) |
| **초기 로딩** | 첫 플레이 가능 시점 **≤ 5초** | `perf:load` (3G·4G·WiFi) |
| **번들 청크** | 초기 chunk **≤ 2MB gzipped** | `perf:bundle` (rollup-plugin-visualizer) |

### 빠른 시작

```bash
# 전투·맵 60초 FPS 샘플링 (평균/p1/p5 보고)
npm run perf:fps

# 씬 10회 전환 + 5분 idle 메모리 추적
npm run perf:memory

# 4 게이트 일괄 실행 (CI 진입점)
npm run perf:gate
```

### 4 게이트 흐름

| 순서 | 게이트 | 검사 항목 |
|------|--------|----------|
| 1 | **Profile (FPS)** | 전투 씬·월드맵 60초 샘플, 평균·p1·p5·드롭 카운트 |
| 2 | **Memory** | 씬 전환 시 텍스처/이벤트 리스너 정리, 5분 메모리 증가 |
| 3 | **Lazy Load** | 챕터별 어셋 청크 분할, 초기 번들·후속 chunk 임계 |
| 4 | **Bundle** | 이미지 압축률·텍스처 아틀라스 적용·최종 산출물 크기 |

### 자세한 가이드

- [성능 최적화 사용자 가이드](docs/release/performance-user-guide.md) — 9개 절 + FAQ
- [에러 메시지 카피 SSOT](docs/release/performance-error-messages.md) — 16 슬롯 ko/en
- [PR / 커밋 컨벤션](docs/release/performance-pr-template.md) — 7 스코프·봉인 4항
- [CHANGELOG 초안](docs/release/performance-changelog-draft.md) — 실측 치환용 슬롯 가이드

### Ship-gate 4-AND (예고)

본 성능 게이트는 출시 전 다음 4-AND 조건의 한 축:

```
perf:gate ∧ mobile:gate ∧ save:gate ∧ data:validate = ALL PASS → ship
```

네 조건 중 하나라도 FAIL이면 출시 차단. 백능파 승인 없이 우회 불가.
```

---

## 2. 상단 배지 — 추가할 마크다운

`README.md` 상단 배지 묶음 끝에 다음 2줄 추가:

```markdown
[![FPS Avg](https://img.shields.io/badge/FPS%20Avg-%E2%89%A555-brightgreen?style=for-the-badge)](#-성능-최적화-performance)
[![Initial Load](https://img.shields.io/badge/Initial%20Load-%E2%89%A45s-success?style=for-the-badge)](#-성능-최적화-performance)
```

배지 갱신 정책:

- FPS 평균 < 55 → 배지 색 `red`, 실측치 표기
- 초기 로딩 > 5s → 배지 색 `orange`, 실측치 표기
- 회복 후 즉시 `brightgreen`/`success`로 환원, 백능파 승인 없이 임계치 자체는 변경 금지.

---

## 3. 봉인 항목 (이소화 비협상)

| 봉인 | 내용 |
|------|------|
| 1 | 약속 4지표 수치 (≥55 / ≤50MB / ≤5s / ≤2MB) — 임의 갱신 금지 |
| 2 | 4 게이트 순서 (Profile → Memory → Lazy → Bundle) — 재배치 금지 |
| 3 | 빠른 시작 3명령 (`perf:fps` / `perf:memory` / `perf:gate`) — 이름 변경 금지 |
| 4 | Ship-gate 4-AND — 단일 게이트 우회 금지 (`perf:gate` 단독 통과로 ship 불가) |

---

## 4. 변경 이력

| 버전 | 날짜 | 비고 |
|------|------|------|
| v1.0 | 2026-04-30 | 진채봉 Editor 신설 — Auto: 성능 최적화 스프린트 assets 단계 |

— *흩어진 어셋이 한 곡조에 실려 가도록 하옵나이다.*
