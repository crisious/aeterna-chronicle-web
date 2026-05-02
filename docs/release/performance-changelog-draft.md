# 성능 최적화 CHANGELOG 항목 초안 v1.0

> 작성: 진채봉 Editor
> 작성일: 2026-04-30
> 스프린트: Auto: 성능 최적화 — FPS·메모리·로딩 시간
> 출전: 본 문서는 9단계 Auto 스프린트 진행에 따라 Build/Review/Test/Ship 단계에서 _TBD_ 슬롯이 실측치로 치환되도록 안내하는 가이드입니다.
> 최종 위치: `CHANGELOG.md` `[1.0.0-rc.3] — Unreleased` `### Added` 섹션 최상단 (모바일 반응형 항목 위)
> ✅ **CHANGELOG 통합 완료 (2026-04-30, 진채봉 Editor)** — 모바일 반응형 항목 위 신규 entry로 머지. _TBD_ 슬롯 4종(`_FPS_AVG_` / `_MEM_DELTA_` / `_LOAD_4G_` / `_BUNDLE_GZ_`)은 적경홍 Test 단계 대기.

---

## 0. 슬롯 충진 가이드

| 슬롯 표기 | 충진 단계 | 책임 | 비고 |
|----------|----------|------|------|
| `_LOC_` | assets 단계 | 진채봉 | 본 문서 §2 산출물 LOC 합산 |
| `_FPS_AVG_` | Test 단계 | 적경홍 | `perf:fps` 60초 샘플 평균 |
| `_MEM_DELTA_` | Test 단계 | 적경홍 | `perf:memory` 5분 idle 증가 |
| `_LOAD_4G_` | Test 단계 | 적경홍 | `perf:load` 4G first-interactive |
| `_BUNDLE_GZ_` | Test 단계 | 적경홍 | `perf:bundle` 초기 chunk gzipped |
| `_DATE_` | Ship 단계 | 진채봉 | 머지 commit 기준 |

---

## 1. CHANGELOG 항목 — 그대로 복사

```markdown
- **에테르나 크로니클 성능 최적화 — 텍스트 에셋 묶음 v1.0** (Sprint Auto-Performance, _DATE_) — 진채봉 Editor 합본 정리
  - Phase 52 출시 직전, 1,454 어셋 + Phaser.js 환경에서 저사양 디바이스 포함 안정 플레이를 보장하고자, 사람 손에 잡히는 텍스트 에셋 5편 + 디자인 시스템 합본 + 시각 에셋 묶음 + README §⚡ 성능 최적화 절을 묶어 두옵나이다.
  - 약속 4지표: 전투·맵 FPS 평균 **≥ 55** (실측 _FPS_AVG_) · 5분 플레이 메모리 증가 **≤ 50MB** (실측 _MEM_DELTA_MB) · 초기 로딩 4G 기준 **≤ 5초** (실측 _LOAD_4G_s) · 초기 chunk **≤ 2MB gzipped** (실측 _BUNDLE_GZ_MB) — `launch_checklist §2.24` SSOT 신설 예정
  - 4 게이트 흐름 (두련사 *선禪 4계*): Profile (FPS 60초 샘플 + 핫스팟 식별) → Memory (씬 전환 텍스처/리스너 정리 + 5분 idle 증가) → Lazy (챕터별 어셋 청크 분할 + manualChunks) → Bundle (이미지 압축 + 텍스처 아틀라스 + Brotli)
  - 산출물 5건 / 총 **740 LOC** (SSOT 5편: skeleton 112 + user-guide 203 + error-messages 174 + pr-template 158 + changelog-draft 93) + README §⚡ 신설 예정 ~70줄 + `launch_checklist §2.24` 신설 예정 ~25줄 = **~835줄** — assets 단계 통합 완료, Build(계섬월) 인계
  - **README §⚡ 성능 최적화 절 통합 예정** (`README.md` §📱 모바일 반응형 ↔ §📁 문서 링크 사이) — 한눈 지표 4 약속 표 · 빠른 시작 3명령(`npm run perf:fps` / `perf:memory` / `perf:gate`) · 4 게이트 흐름 표 · 자세한 가이드 링크 4개 · ship-gate 4-AND 예고 (`perf:gate ∧ mobile:gate ∧ save:gate ∧ data:validate`) · 상단 배지 2종(`FPS Avg ≥55` · `Initial Load ≤5s`) 추가
  - **성능 최적화 사용자 가이드 v1.0** (`docs/release/performance-user-guide.md`) — 진채봉 Editor
    - 9개 절 + FAQ 7건 — 한 손 흐름도(Profile → Memory → Lazy → Bundle) · 약속 4지표 표 · 4 게이트 상세(전투/월드맵 측정 환경 명시) · 핫스팟 우선순위 4종(전투 ATB/월드맵 카메라/NPC 페이드/인벤토리) · 메모리 정리 체크리스트 5종(textures/events/tweens/sound/cache) · 청크 분할 정책 5종(core/chapter-N/battle) · 압축 기법 5종(pngquant/WebP/atlas/OGG/Brotli) · 출력 모드 3종(TTY/NO_COLOR/JSON)
    - 본 문서가 1차 SSOT — `README.md §⚡ 성능 최적화` 메아리, 약속 수치 변경 시 §1 표 동시 갱신
  - **성능 최적화 에러 메시지 카피 SSOT v1.0** (`docs/release/performance-error-messages.md`) — 진채봉 Editor
    - 4종 게이트(profile · memory · lazy · bundle) × 4 상태(PASS/WARN/ERROR/BLOCK) = **16개 카피 슬롯** + ko/en 동시 = **32줄**
    - 키 규약 `perf.<gate>.<state>.<reason>` · 코드 상수 매핑(계섬월 인계용 `client/src/constants/performance_messages.ts` 스니펫, REDUCTION 스코프 4 BLOCK 슬롯 우선)
    - 톤 5계명(가춘운 디자인 미러): 원인→처방 · 수치는 사실(`58.3fps / 35.8MB / 5.4s / 2.1MB`) · 경로 절단 금지 · 시는 hint만 · 게이트 키 규약
  - **성능 최적화 PR / 커밋 메시지 컨벤션 v1.0** (`docs/release/performance-pr-template.md`) — 진채봉 Editor
    - PR 제목 7 스코프 (`fps`/`memory`/`lazy`/`bundle`/`atlas`/`gate`/`docs`)
    - PR 본문 7개 섹션 — 자동 측정 표(Before/After/Δ/약속 5행) · 핫스팟 매트릭스(Top 3) · 메모리 누수 점검 표 · 청크·번들 분포 트리 · 봉인 4항 · 5인 인계 체크
    - 리뷰어 행동 가이드 5항 (이소화·두련사·적경홍 봉인 — `perf:gate` JSON 첨부 강제 · p1 < 30 reject · 메모리 +51MB도 reject · `manualChunks` 미설정 reject) + ship-gate 4-AND
  - **README §⚡ 성능 최적화 절 — 골격 SSOT v1.0** (`docs/release/performance-readme-skeleton.md`) — 진채봉 Editor
    - `README.md §⚡ 성능 최적화` 신설 골격 — 한눈 지표 4 약속 표 · 빠른 시작 3명령 · 4 게이트 흐름 표 · 자세한 가이드 링크 4개 · ship-gate 4-AND 예고
    - 약속 수치 임의 갱신 금지 — 백능파(Strategy) 승인 필수 명시
    - 봉인 항목 4종 (4 약속 수치 · 4 게이트 순서 · 빠른 시작 3명령 · 4-AND) — 이소화 비협상
    - 선택 배지 2종 (`FPS Avg ≥55` · `Initial Load ≤5s`) 추가 안내
  - **성능 최적화 CHANGELOG 항목 초안 v1.0** (`docs/release/performance-changelog-draft.md`) — 진채봉 Editor
    - 본 항목의 출전 — 9단계 Auto 스프린트가 진행됨에 따라 Build/Review/Test/Ship 단계에서 실측 수치로 _TBD_ 슬롯을 메우도록 가이드
    - assets 단계에서 5편 LOC 슬롯·README §⚡ 70줄 슬롯·launch_checklist §2.24 25줄 슬롯 모두 _LOC_ 표기
  - 연관 SSOT 정합:
    - 디자인 시스템 `docs/release/design-system_performance.md` (가춘운, 신설 예정) — FPS HUD 오버레이 토큰 + 메모리 경고 색 + 로딩 progress bar SSOT
    - 시각 에셋 `docs/release/assets_performance.md` (가춘운, 신설 예정) — Profile/Memory/Lazy/Bundle 게이트별 콘솔 ASCII 모킹업 + 디스코드 embed 카드 시안
    - 아키텍처 두련사 *선禪 4계* — Profile → Memory → Lazy → Bundle (4 단계 그대로 본 문서들에 미러)
    - 게이트 백능파 **HOLD-by-default** — 약속 4지표 우회 금지 + ship-gate 4-AND
  - **다음 단계 (Build → Review → Test → Ship)**:
    - [ ] `client/src/debug/FPSMonitor.ts` 신설 (1초 단위 평균/p1/p5 + 핫스팟 캡처, 두련사·계섬월 합주)
    - [ ] `client/src/scenes/BaseScene.ts` shutdown() 5항 체크리스트 적용 (textures/events/tweens/sound/cache)
    - [ ] `vite.config.ts` `manualChunks` 설정 (core/chapter-N/battle 분리)
    - [ ] `client/src/loaders/LazyLoader.ts` 신설 (`import.meta.glob` 기반 dynamic import)
    - [ ] `client/src/constants/performance_messages.ts` BLOCK 4슬롯 카피 (에러 메시지 §6 미러)
    - [ ] `npm run perf:*` 5종 npm scripts 등록 (`package.json`)
    - [ ] 빌드 파이프라인에 `pngquant` + `oxipng` + 텍스처 아틀라스 단계 추가
    - [ ] CI workflow에 `perf:gate` 게이트 추가 (적경홍 QA 단계)
    - [ ] 적경홍 Test 단계 — 약속 4지표 실측 캡처(60초 FPS + 5분 메모리 + 4G 로딩 + bundle gz) → CHANGELOG 본 항목 _TBD_ 슬롯 충진
    - [ ] Ship 단계 — _DATE_ 슬롯 충진 + VERSION 범프 + `launch_checklist §2.24` SSOT 확정
```

---

## 2. 본 묶음의 산출물 LOC (assets 단계 충진 완료)

| 산출물 | LOC | 비고 |
|--------|-----|------|
| `performance-readme-skeleton.md` | 112 | README §⚡ 골격 |
| `performance-user-guide.md` | 203 | 9개 절 + FAQ |
| `performance-error-messages.md` | 174 | 16 슬롯 ko/en |
| `performance-pr-template.md` | 158 | 7 스코프 + 7 섹션 |
| `performance-changelog-draft.md` | 93 | 본 문서 |
| **합계** | **740** | assets 단계 통합 완료 (`wc -l` 실측) |

> assets 단계 종료 직후 `wc -l` 실측 치환 완료 (Build 단계 진입 가능).

---

## 3. 변경 이력

| 버전 | 날짜 | 비고 |
|------|------|------|
| v1.0 | 2026-04-30 | 진채봉 Editor 신설 — Auto: 성능 최적화 스프린트 assets 단계 |

— *기록되지 않은 성능은, 곧 잊히는 곡조이옵나이다.*
