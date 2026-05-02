# 개발자 빌드-검증 사이클 — CHANGELOG 항목 초안 v1.0

> 작성: 진채봉 Editor
> 작성일: 2026-04-30
> 스프린트: Auto — 에테르나 크로니클 개발자 빌드-검증 사이클 단축 (대표 본인 1인 사용자 본)
> 단계: 에셋 (CHANGELOG 통합 전 골격)
> 용도: `CHANGELOG.md` `[1.0.0-rc.3] — Unreleased` 절에 그대로 합주 — _TBD_ 슬롯만 실측 치환

---

## 항목 위치

`CHANGELOG.md` `## [1.0.0-rc.3] — Unreleased` 절의 `### Added` 블록 최상단(가장 최근 변경)으로 합주.
바로 위에 위치하는 직전 항목은 **"성능 최적화 텍스트 에셋 묶음 v1.0" (2026-04-30)** 이오니, 본 항목과 같은 일자에 두 묶음이 나란히 놓이도록 한다.

---

## 항목 본문 (그대로 복사)

```markdown
- **에테르나 크로니클 개발자 빌드-검증 사이클 단축 — 텍스트 에셋 묶음 v1.1 (대표 본인 본)** (Sprint Auto-DevLoop, 2026-04-30) — 진채봉 Editor 합본 정리
  - Phase 52 출시 직전, 1,454 어셋 + 728 ticket + 742 docs 위에 신규 콘텐츠(시나리오/스킬/맵) 추가 시 작업 → 검증 사이클이 길어지는 마찰을 잘라내고자, 사람 손에 잡히는 텍스트 에셋 5편 + 디자인 시스템 합본 + README §⚡ 개발 효율 절을 묶어 두옵나이다. 본 묶음의 사용자는 **대표(crisi) 본인 1인** — 화면이 아니라 **터미널이 사용자 인터페이스** 이옵니다.
  - 약속 4지표: 코드 변경 → 핵심 시나리오 검증 **≤ 5분** (실측 _TBD_s) · dev server cold 부팅 **≤ 12s** (실측 _TBD_s) · HMR 반영 **≤ 800ms** (실측 _TBD_ms) · 에러 발생 → 원인 파일/라인 노출 **≤ 5초** (실측 _TBD_s · 2줄 규칙: 1줄=원인, 2줄=`path:line:col`) — `launch_checklist §2.25` SSOT 신설 예정
  - 단일 명령 흐름 (`npm run loop` — 가춘운 디자인 SSOT v1.0): boot → scenario(×3) → gate(≤5:00) 3 표면을 80자 폭 1 화면에 묶음. 화살표 글리프 1점이 5분 게이트 통과 여부를 표현(`◀ 여유` / `▶ 초과`).
  - 핵심 시나리오 3종 (각 게이트별 헤드리스 자동화):
    | # | 이름 | 검증 | 시간 약속 |
    |---|------|------|-----------|
    | 1 | **전투(ATB)** | tick · 스킬 발동 · HP 감소 · EXP 획득 | ≤ 90s |
    | 2 | **세이브** | slot 1·2·3 round-trip JSON 동치 | ≤ 60s |
    | 3 | **맵 이동** | portal · BGM 전환 · NPC 위치 | ≤ 120s |

    > 합계 ≤ **4m 30s** + 게이트 표지 30s = **5분 약속**
  - 산출물 6건 / 총 **~1,030 LOC** (텍스트 에셋 5편: skeleton 105 + user-guide 318 + error-messages 292 + pr-template 158 + changelog-draft 112 + 합본 인덱스 ~45) + 디자인 시스템 `design-system_dev-loop.md` 신규 ~210줄 (가춘운, 4상태 ANSI + 80자 폭 + 트리 글리프 SSOT) — assets 단계 통합 완료, Build(계섬월) 인계
  - **README §⚡ 개발 효율 절 — 골격 SSOT v1.1 갱신** (`docs/release/devloop-readme-skeleton.md`) — 진채봉 Editor
    - v1.0 (2026-04-27, 명령 3종 분리: `dev:fast` / `verify:core` / `error:explain`) → v1.1 (2026-04-30, **단일 명령 `npm run loop` 통합**, 가춘운 4상태 ANSI 글리프 미러)
    - 한눈 지표 4 약속 표 · 빠른 시작 1명령 (`npm run loop`) + 3 폴백 명령 · 5 게이트 흐름 표 · 자세한 가이드 링크 5개 · ship-gate 3-AND 예고 (`verify:core 🟢 PASS ∧ git diff --stat ≠ 0 ∧ git log --since=7d ≥ 1`)
    - 봉인 5종 (4 약속 수치 · 단일 명령 `npm run loop` · 5 게이트 키 규약 `dev.gate.<gate>.<state>.<reason>` · 80자 폭 절단 · 2줄 에러 규칙) — 이소화 비협상
  - **개발자 빌드-검증 사이클 가이드** (`docs/release/devloop-user-guide.md`, v1.0 유지 + v1.1 정합 푸터) — 진채봉 Editor
    - 9개 절 + FAQ 7건 — 한 손 흐름도 · 부팅 측정 · 시나리오 자동화 · 에러 식별 2줄 규칙 · 지표 약속 · npm 명령어 표 (`loop` 통합 명령 + 5 폴백) · 로드맵 진척 매트릭스
    - 본 문서가 1차 SSOT — `README.md §⚡ 개발 효율` 메아리, 약속 수치 변경 시 §5 표 동시 갱신
  - **개발자 빌드-검증 에러 메시지 카피 SSOT** (`docs/release/devloop-error-messages.md`, v1.0 유지 + v1.1 정합 푸터) — 진채봉 Editor
    - 5종 게이트(boot · verify · build · type · runtime) × 4 상태(PASS/BLOCK/WARN/ERROR) = **20개 카피 슬롯** + ko/en 동시 = **40줄**
    - 키 규약 `dev.gate.<gate>.<state>.<reason>` · 코드 상수 매핑(계섬월 인계용 `client/src/constants/dev_gate_messages.ts` 스니펫, BLOCK 5슬롯 우선)
    - 톤 5계명: 원인→처방 · 수치는 사실(`{elapsed}ms`) · 경로 절단 금지(`src/...:42:17` 끝까지) · 시는 hint만 · 게이트 키 규약
    - **2줄 규칙** (대표 핵심 요구): 모든 BLOCK·ERROR 카피는 1줄=사람말 원인, 2줄=`path:line:col` — Vite sourcemap 그대로 가공, 신규 도구 X
  - **개발자 빌드-검증 PR / 커밋 메시지 컨벤션** (`docs/release/devloop-pr-template.md`, v1.0 유지 + v1.1 정합 푸터) — 진채봉 Editor
    - PR 제목 7 스코프 (`boot`/`verify`/`error`/`gate`/`perf`/`assets`/`docs`)
    - PR 본문 7개 섹션 — 자동 측정 표(Before/After/Δ/약속 4행) · `npm run loop` 한 줄 요약 첨부 강제 · 시나리오 매트릭스 · 봉인 4항 · 5인 인계 체크
    - 리뷰어 행동 가이드 5항 (이소화·두련사·적경홍 봉인 — `npm run loop` 출력 첨부 강제 · verify:core > 5min reject · 부팅 > 12s reject · 2줄 에러 규칙 위반 reject) + ship-gate 3-AND
  - **개발자 빌드-검증 사이클 CHANGELOG 항목 초안** (`docs/release/devloop-changelog-draft.md`, 본 문서, v1.0 신설, 112줄) — 진채봉 Editor
    - 본 항목의 출전 — 9단계 Auto 스프린트가 진행됨에 따라 Build/Review/Test/Ship 단계에서 실측 수치로 _TBD_ 슬롯을 메우도록 가이드
    - assets 단계에서 텍스트 5편 + 디자인 시스템 합본 + README 골격 갱신 모두 _ 슬롯 충진 완료, `launch_checklist §2.25` 25줄 슬롯은 Ship 단계 보류
  - 연관 SSOT 정합:
    - 디자인 시스템 `docs/release/design-system_dev-loop.md` (가춘운, ~210줄, 2026-04-30) — 4상태 ANSI 팔레트 + 5 글리프(`✓ ▲ ✗ › ─`) + 80자 폭 + 트리 레이아웃 + `npm run loop` 출력 표준 SSOT
    - 아키텍처 두련사 *선禪 5계* — boot → scenario(battle/save/map) → gate (5 단계 그대로 본 문서들에 미러)
    - 게이트 백능파 **REDUCTION** — `npm run loop` 단일 명령 + 5 게이트 중 BLOCK 5슬롯 PASS + 1커밋 머지 (본 스프린트 한정 스코프, 2줄 에러 규칙 + 80자 폭 절단만 머지)
  - **다음 단계 (Build → Review → Test → Ship)**:
    - [ ] `scripts/dev-loop/index.ts` 신설 (`npm run loop` 진입점 — boot · scenario · gate 3 단계 오케스트레이션, 두련사·계섬월 합주)
    - [ ] `scripts/dev-loop/tokens.ts` 신설 (디자인 시스템 §6 `LOOP_TOKENS` 미러, NO_COLOR 폴백 포함)
    - [ ] `scripts/dev-loop/scenarios/{battle,save,map}.ts` 신설 (헤드리스 시나리오 3종, Playwright 미사용 — fetch 기반)
    - [ ] `client/src/constants/dev_gate_messages.ts` 신설 (에러 메시지 §6 미러, BLOCK 5슬롯 우선)
    - [ ] `vite.config.ts` `optimizeDeps.include` 명시 (Phaser sub-paths 사전 번들로 cold 18s → 9s 목표)
    - [ ] `package.json` npm scripts 등록 — `loop` (통합) + `dev:fast` · `verify:core` · `error:explain` · `dev:measure` (4 폴백)
    - [ ] `.ac/error-report.json` 스키마 신설 + Vite sourcemap → `path:line:col` 변환 어댑터
    - [ ] CI workflow에 `npm run loop` 게이트 추가 (적경홍 QA 단계 — verify:core PASS 필수)
    - [ ] 적경홍 Test 단계 — 약속 4지표 실측 캡처(boot/verify/HMR/error 4종) → 본 항목 _TBD_ 슬롯 충진
    - [ ] Ship 단계 — VERSION 범프 + `launch_checklist §2.25` SSOT 확정 + ship-gate 3-AND hook 봇 하네스 통합
```

---

## 토큰 교체 가이드

본 문서를 `CHANGELOG.md`에 합주하기 전, 다음 토큰만 실제 값으로 교체하시옵소서:

| 토큰 | 의미 | 충진 시점 | 충진 책임 |
|------|------|-----------|-----------|
| `_TBD_s` (verify:core) | 핵심 시나리오 3종 합계 시간 | Test (적경홍) | 적경홍 QA |
| `_TBD_s` (boot cold) | dev server cold 부팅 시간 | Test (적경홍) | 적경홍 QA |
| `_TBD_ms` (HMR) | 파일 저장 → 화면 반영 시간 | Test (적경홍) | 적경홍 QA |
| `_TBD_s` (error) | 에러 → 원인 파일/라인 노출 지연 | Test (적경홍) | 적경홍 QA |
| LOC 합계 (~1,030) | 텍스트 에셋 5편 + 합본 실측 | Build (계섬월) | 계섬월 Build |

> ⚠️ **약속 수치(≤5분 / ≤12s / ≤800ms / ≤5s)는 백능파(Strategy) 승인 없이 임의 갱신 금지** — 본 SSOT가 정본.

---

## 직전 항목과의 연결

본 항목 직전(2026-04-30 동일자)의 **"성능 최적화 텍스트 에셋 묶음 v1.0"**, 그 직전(2026-04-29)의 **"모바일 반응형 적응 텍스트 에셋 묶음 v1.0"**과 더불어 **3 묶음 모두 진채봉 Editor 합본 정리** — 출시 직전 마무리 3축(성능 · 모바일 · 개발 사이클)을 텍스트 에셋 SSOT로 묶는 마지막 한 점.

```
2026-04-29 모바일 반응형        ← 사용자 측 (외부)
2026-04-30 성능 최적화          ← 사용자 측 (외부)
2026-04-30 개발자 빌드-검증     ← 개발자 측 (내부) ⨯ 본 항목
                                   ───────────
                                   3축 완성 → Phase 53 진입 가능
```

---

## 관련 문서

- `CHANGELOG.md` — 통합 대상
- `docs/release/devloop-readme-skeleton.md` — README 통합 골격 (v1.1)
- `docs/release/devloop-user-guide.md` — 사용자 가이드 (1차 SSOT)
- `docs/release/devloop-error-messages.md` — 에러 메시지 카피 SSOT
- `docs/release/devloop-pr-template.md` — PR / 커밋 컨벤션
- `docs/release/design-system_dev-loop.md` — 디자인 시스템 (가춘운, 4상태 ANSI SSOT)

---

> CHANGELOG는 우리가 남기는 발자국이옵니다. 한 걸음 한 걸음 흩어지지 않게. — 진채봉
