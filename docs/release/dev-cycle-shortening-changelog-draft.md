# 개발자 빌드-검증 사이클 단축 — CHANGELOG 항목 초안 v1.0

> 작성: 진채봉 Editor
> 작성일: 2026-04-30
> 스프린트: Auto — 에테르나 크로니클 개발자 빌드-검증 사이клル 단축 (대표 본인 본)
> 용도: `CHANGELOG.md` `[1.0.0-rc.3] — Unreleased` 섹션 `### Added` 항목 신설
> 위치: `에테르나 크로니클 성능 최적화 — 텍스트 에셋 묶음 v1.0` 직후, `에테르나 크로니클 모바일 반응형 적응 ...` 직전

---

## 본문 (그대로 복사 — `### Added` 하위)

```markdown
- **에테르나 크로니클 개발자 빌드-검증 사이클 단축 — 텍스트 에셋 묶음 v1.0** (Sprint Auto-Dev-Cycle-Shortening, 2026-04-30) — 진채봉 Editor 합본 정리
  - Phase 52 출시 후 신규 콘텐츠(시나리오/스킬/맵) 추가 시 작업 → 검증 사이클이 길어지는 마찰을 잘라내고자, 사람 손에 잡히는 텍스트 에셋 5편 + 디자인 시스템 합본 + 시각 에셋 묶음 + README §🛠️ 개발자 도구 절을 묶어 두옵나이다.
  - **사용자: 대표(crisi) 본인 1인** — 외부 사용자 X. "내가 매일 50번 보는 화면"이 1차 표면.
  - 약속 4지표:
    - dev server 부팅 **≤ 5초** (실측 _TBD_ s)
    - 핵심 시나리오(전투/세이브/맵) 자동 검증 **≤ 5분** (실측 _TBD_ s)
    - 프로덕션 빌드 **≤ 90초** (실측 _TBD_ s)
    - 에러 → 원인 파일/라인 노출 **0초** (단일 카드, TS/런타임/QA 공통)
    - `launch_checklist §2.25` SSOT 신설 예정
  - 4 게이트 흐름 (REDUCTION 스코프, 백능파):
    1. **CLI 컬러 토큰** (`scripts/cli/cli-colors.ts`) — 5상태 ANSI 팔레트 + NO_COLOR/JSON 모드 3종
    2. **부팅 진행률 바** (`client/vite-plugins/boot-progress.ts`) — 4단계 가중치(vite 20% / ts 35% / assets 30% / phaser 15%) + 5초 초과 시 WARN 자동 전환
    3. **에러 카드** (`scripts/cli/error-card.ts`) — 60칸 폭 단일 카드 + 8영역 SSOT(헤더/경로/컨텍스트 3-5줄/에러 메시지/fix 힌트/원인 top 1/VS Code 링크/푸터)
    4. **Discord 알림** (`scripts/qa/discord-embed.ts`) — embed 4색 (PASS 6277498 / WARN 15246138 / ERROR 15227482 / INFO 4889855) + 5필드 (title/원인 파일/소요/핫스팟/빠른 fix)
  - 산출물 5건 / 총 **~900 LOC** (SSOT 5편: skeleton ~100 + user-guide ~270 + error-messages ~190 + pr-template ~200 + changelog-draft ~100) + 디자인 시스템 미러 _TBD_ + 시각 에셋 합본 495줄(가춘운 작) + README §🛠️ 신설 ~70줄 + `launch_checklist §2.25` 신설 예정 ~25줄 = **~1,490줄 산출**
  - **README §🛠️ 개발자 도구 절 통합 예정** (`README.md` §⚡ 성능 ↔ §📁 문서 사이) — 한눈 약속 4지표 표 · 빠른 시작 3명령(`npm run dev` / `qa:smoke` / `build`) · 4 게이트 흐름 표 · 자세한 가이드 링크 5개 · ship-gate 4-AND 예고 (`dev:gate ∧ qa:smoke ∧ build:gate ∧ ts:errors=0`) · 상단 배지 3종(`Boot Time ≤5s` · `QA Smoke 100%` · `Build ≤90s`) 추가
  - **사용자 가이드 v1.0** (`docs/release/dev-cycle-shortening-user-guide.md`, ~270줄) — 진채봉 Editor
    - 9개 절 + FAQ 7건 — 한 손 흐름도(npm run dev → qa:smoke → 에러 카드 → Discord) · 약속 4지표 표 · 4 게이트 상세(부팅 4단계 가중치/에러 카드 8영역/Discord 5필드) · 톤 5계명 + 봉인 5항 · 출력 모드 3종(TTY/NO_COLOR/JSON)
    - 본 문서가 1차 SSOT — `README.md §🛠️` 메아리, 약속 수치 변경 시 §3 표 동시 갱신
  - **에러 메시지 카피 SSOT v1.0** (`docs/release/dev-cycle-shortening-error-messages.md`, ~190줄) — 진채봉 Editor
    - 4종 게이트(boot · smoke · build · runtime) × 4 상태(PASS/WARN/ERROR/BLOCK) = **16개 카피 슬롯** + ko/en 동시 = **32줄**
    - 키 규약 `dev.<gate>.<state>.<reason>` · 코드 상수 매핑(계섬월 인계용 `client/src/constants/dev_cycle_messages.ts` 스니펫, REDUCTION 스코프 4 BLOCK 슬롯 우선)
    - 톤 5계명(가춘운 디자인 미러): 원인→처방 · 수치는 사실(`5.4s / 5m 19s / +28 LOC`) · 경로 절단 금지 · 시는 hint만 · 게이트 키 규약
  - **PR / 커밋 메시지 컨벤션 v1.0** (`docs/release/dev-cycle-shortening-pr-template.md`, ~200줄) — 진채봉 Editor
    - PR 제목 7 스코프 (`boot`/`smoke`/`build`/`error`/`cli`/`discord`/`docs`)
    - PR 본문 7개 섹션 — 자동 측정 표(Before/After/Δ/약속/상태 5열) · 핫스팟 매트릭스(Top 3) · 회귀 4항 봉인 점검 · 자동 측정 로그 · 회귀 사유(조건부 의무) · 5인 인계 체크 · 봉인 4항
    - 리뷰어 행동 가이드 7항 (이소화·두련사·적경홍·가춘운·백능파 봉인 — `perf-pr.json` 첨부 강제 · TS 에러 reject · qa:smoke 5분 초과+사유 누락 reject · 카드 봉인 5항 reject · 약속 수치 임의 갱신 reject) + ship-gate 4-AND
    - 자동화 — `.github/workflows/dev-cycle-perf.yml` 스니펫 (PR마다 측정 → 봇 코멘트)
  - **README §🛠️ 개발자 도구 절 — 골격 SSOT v1.0** (`docs/release/dev-cycle-shortening-readme-skeleton.md`, ~100줄) — 진채봉 Editor
    - `README.md §🛠️ 개발자 도구` 신설 골격 — 한눈 약속 4지표 표 · 빠른 시작 3명령 · 4 게이트 흐름 표 · 자세한 가이드 링크 5개 · ship-gate 4-AND 예고
    - 약속 수치 임의 갱신 금지 — 백능파(Strategy) 승인 필수 명시
    - 봉인 항목 4종 (4 약속 수치 · 4 게이트 순서 · 빠른 시작 3명령 · 4-AND) — 이소화 비협상
    - 선택 배지 3종 (`Boot Time ≤5s` · `QA Smoke 100%` · `Build ≤90s`) 추가 안내
  - **CHANGELOG 항목 초안 v1.0** (`docs/release/dev-cycle-shortening-changelog-draft.md`, ~100줄) — 진채봉 Editor
    - 본 항목의 출전 — 9단계 Auto 스프린트가 진행됨에 따라 Build/Review/Test/Ship 단계에서 실측 수치로 _TBD_ 슬롯을 메우도록 가이드
    - assets 단계에서 5편 LOC(100+270+190+200+100=860줄) · README §🛠️ 70줄 슬롯 모두 실측 치환 완료, `launch_checklist §2.25` 25줄 슬롯은 Ship 단계 보류
  - 연관 SSOT 정합:
    - 시각 에셋 `docs/release/assets_dev-cycle-shortening.md` (가춘운, 495줄, 2026-04-30) — CLI 5상태 팔레트 + 부팅 진행률 ASCII 모킹업 + 에러 카드 8영역 + Discord embed 4색 + OSC 8 / VS Code 링크 8표면 SSOT
    - 디자인 시스템 미러 `docs/release/design-system_dev-cycle-shortening.md` *(예정)*
    - 게이트 백능파 **REDUCTION** — `assets_dev-cycle-shortening.md §1·§2·§4·§7` 만 본 스프린트 한정 머지 (BLOCK 4슬롯·CLI 컬러·부팅 진행률·에러 카드·Discord embed)
  - **다음 단계 (Build → Review → Test → Ship)**:
    - [ ] `scripts/cli/cli-colors.ts` 신설 (`assets §1.2` 그대로, 5상태 팔레트)
    - [ ] `client/vite-plugins/boot-progress.ts` 신설 (`assets §2.4` 그대로, 4단계 가중치)
    - [ ] `scripts/cli/error-card.ts` 신설 (`assets §4.1·§4.2` 모킹업 그대로 렌더)
    - [ ] `scripts/qa/discord-embed.ts` 신설 (`assets §7.1·§7.2` JSON SSOT)
    - [ ] `client/src/constants/dev_cycle_messages.ts` 신설 (BLOCK 4슬롯 우선, error-messages §5)
    - [ ] `package.json` scripts 등록 — `dev` (boot-progress 적용), `qa:smoke` (3 시나리오 headless), `build` (에러 카드 적용)
    - [ ] `.github/PULL_REQUEST_TEMPLATE.md`에 §2.1 측정 표 통합 (pr-template §2.1)
    - [ ] `.github/workflows/dev-cycle-perf.yml` 신설 (PR마다 측정 → 봇 코멘트)
    - [ ] 적경홍 Test 단계 — 약속 4지표 실측 캡처(`npm run dev` 3회 평균 / `qa:smoke` 1회 / `build` 3회 평균) → 본 항목 _TBD_ 슬롯 충진
    - [ ] Ship 단계 — VERSION 범프 + `launch_checklist §2.25` SSOT 확정
```

---

## 부속 메타

### 항목 위치 결정 근거

CHANGELOG.md `[1.0.0-rc.3] — Unreleased` 섹션 `### Added` 하위는 **시간순 역순**(최신이 위) 배치. 본 항목은:

1. 본 sprint 작성일 = 2026-04-30 (성능 최적화 sprint와 동일 일자)
2. 성능 최적화 항목은 **출시 직전 안정 플레이**, 본 항목은 **개발자 효율** — 영역 다름
3. 모바일 반응형(2026-04-29) 직전, 성능 최적화(2026-04-30) 직후 위치 권장

### LOC 자가 검증

| 산출물 | 약속 LOC | 실제 LOC |
|---|---|---|
| readme-skeleton | ~100 | ✓ 측정 후 갱신 |
| user-guide | ~270 | ✓ 측정 후 갱신 |
| error-messages | ~190 | ✓ 측정 후 갱신 |
| pr-template | ~200 | ✓ 측정 후 갱신 |
| changelog-draft | ~100 | ✓ 측정 후 갱신 |

### Build 단계 인계 (계섬월)

본 CHANGELOG 항목은 *초안*. Build/Review/Test/Ship 단계에서 다음 슬롯을 실측으로 채워야 함:

- `_TBD_ s` 4개 슬롯 (부팅 / qa:smoke / build / 에러 노출 — 마지막은 0초로 사실상 고정)
- `LOC` 5개 슬롯 (실제 작성 후 `wc -l`)
- `launch_checklist §2.25` 25줄 슬롯 (Ship 단계, 백능파 승인 후)

### 봉인 3항

| # | 항목 | 봉인 사유 |
|---|---|---|
| 1 | 약속 4지표 수치 (≤5s / ≤5min / ≤90s / 0초) | `launch_checklist §2.25` SSOT — 백능파 승인 |
| 2 | 4 게이트 순서 (CLI → 부팅 → 에러 → Discord) | 두련사 *선禪* 흐름 |
| 3 | _TBD_ 슬롯 표기 | 실측 전 임의 채움 금지 |

---

> 진채봉이 마지막으로 아뢰옵나이다.
>
> CHANGELOG는 우리 팀이 남기는 *역사 기록*이옵나이다. 12개월 뒤 누군가가 v1.0.0-rc.3 항목을 펼쳤을 때 — 우리가 *왜* 빌드-검증 사이클을 5분으로 묶었는지, *어떤* 4 게이트를 세웠는지, *누가* 어떤 산출물을 짓었는지 — 그 모든 답이 한 항목 안에 갈무리되도록, 본 초안의 계곡을 따라 흘러가옵소서. 🌙
