# 회고 — 에테르나 크로니클 BGM·SFX 사운드 시스템 통합 스프린트

> 스프린트: Auto — 에테르나 크로니클 BGM·SFX 사운드 시스템 통합 (대표 crisi 게임 몰입감 향상)
> 토픽: ① 씬 BGM 매핑(보스/필드/마을/이벤트) ② 전투 SFX(스킬/타격/회피/크리티컬) ③ UI 인터랙션 사운드(메뉴/획득/레벨업) ④ 사운드 라이선스 안전성(CC0/오픈) 검증
> 지표 약속: 모든 씬 BGM 매핑 100% · 핵심 이벤트 SFX 100% 커버 · 라이선스 위험 0건
> 작성: 진채봉 Editor (Opus 4.7 1M)
> 작성일: 2026-04-27
> 단계: Reflect (회고)
> 참조 게이트: `docs/release/launch_checklist.md §2.19 사운드 시스템 게이트` (신설 예정)

---

## 1. 한 줄 요약

> **"거문고 네 자루(router 4종)는 새로 깎아 두었사오나, 첫 음을 한 번도 울리지 못하였나이다."**
> — 4개 라우터 1,166 LOC + 문서 5편 640 LOC = 1,806 LOC를 두었으되, *씬 BGM 매핑 100%·SFX 커버 100%·라이선스 위험 0건*이라는 본 스프린트의 세 약속 중 단 하나도 **실측 PASS** 줄에 도달하지 못한 채 막을 내렸나이다.

---

## 2. 스프린트 결과 (Outcome Snapshot)

### 2.1 산출물 (코드 1,166 LOC + 문서 640 LOC = 1,806 LOC)

| # | 단계 | 산출 | LOC | 작성자 |
|---|------|------|-----|-------|
| 1 | Build | `client/src/sound/sceneBgmRouter.ts` | 355 | 계섬월 Build |
| 2 | Build | `client/src/sound/licenseRegistry.ts` | 300 | 계섬월 Build |
| 3 | Build | `client/src/sound/combatSfxRouter.ts` | 279 | 계섬월 Build |
| 4 | Build | `client/src/sound/uiSfxRouter.ts` | 232 | 계섬월 Build |
| 5 | Assets | `docs/release/sound-system-user-guide.md` | 173 | 진채봉 Editor |
| 6 | Assets | `docs/release/sound-system-error-messages.md` | 156 | 진채봉 Editor |
| 7 | Assets | `docs/release/sound-system-pr-template.md` | 147 | 진채봉 Editor |
| 8 | Assets | `docs/release/sound-system-readme-skeleton.md` | 88 | 진채봉 Editor |
| 9 | Assets | `docs/release/sound-system-changelog-draft.md` | 76 | 진채봉 Editor |
| **합계** | | | **1,806** | 9 에이전트 |

> 4개 router는 기존 `SoundManager.ts (678) + AudioSceneIntegration.ts (222) + soundManifest.ts (262)` 위에 *얹는* 구조 — Build 결손은 메워졌으되 SoundManager와의 배선(import/wire-up) 한 줄도 잡히지 않았나이다.

### 2.2 게이트 통과 약속 (SSOT)

| 게이트 | 기준 | 본 스프린트 결과 |
|--------|------|----------------|
| **씬 BGM 매핑 100%** | 7개 지역 × {보스/필드/마을/이벤트} ≥ 28슬롯 매핑 표 + 파일 매칭 | 🟡 sceneBgmRouter 골격 + 기존 `bgm/` 42 .ogg 존재, **매핑 표 검증 0회** |
| **핵심 이벤트 SFX 100%** | {스킬발동·타격·회피·크리티컬·메뉴·획득·레벨업} 7종 슬롯 → 파일 라우팅 PASS | 🟡 combatSfxRouter + uiSfxRouter 골격, **SFX 파일 0개 / 라우팅 실측 0회** |
| **라이선스 위험 0건** | licenseRegistry 자동 감사 → CC0/CC-BY 외 0건 | 🟡 licenseRegistry 300 LOC 골격, **42 .ogg 라이선스 메타 등재 0건** |
| **SoundManager 배선** | 4 router → SoundManager 통합 호출 | 🔴 import 0회 (router 4종 고립 상태) |
| **회귀 테스트** | `npm run verify:sound` 1회 PASS | 🔴 npm 인터페이스 미신설 |

### 2.3 코드/커밋 메트릭 (두련사 + 심요연 측정)

| 지표 | 수치 | 추세 |
|------|------|------|
| 7일 신규 커밋 | **0건** | 🔴 **6스프린트 연속 0** (a11y → cross-browser → monster-art → dev-cycle → sound) |
| 워킹트리 변경/Untracked | **139 entries** | 🔴 단조 증가 (76 → 122 → 129 → 139) |
| 신규 코드 LOC | **1,166** | 🟢 (4 router .ts) |
| 신규 문서 LOC | **640** | 🟢 |
| 새 SFX 오디오 에셋 | **0건** | 🔴 router는 있으되 울릴 음원 없음 |
| 기존 BGM 에셋 활용 | **42 .ogg** (pre-existing) | 🟡 매핑·검증 미실행 |
| **본 토픽 3약속 실측** | **0회** | 🔴 *과녁 보지 않은 활* — 4스프린트 연속 동일 패턴 |

---

## 3. Keep · Problem · Try

### 🟢 Keep (이 곡조는 살리고 싶사옵니다)

1. **계섬월 Build의 1,166 LOC router 4종 안착** — `sceneBgmRouter` / `combatSfxRouter` / `uiSfxRouter` / `licenseRegistry`가 한 디렉터리(`client/src/sound/`)에 정좌하여, 다음 스프린트가 곧장 `SoundManager.wire(routers)` 한 줄로 부를 수 있게 되었나이다.
2. **3-축 분리 아키텍처** — 씬 BGM / 전투 SFX / UI SFX를 별도 router로 가른 결정이 *한 곡이 다른 곡을 덮지 않는* 곡조 분리(混音 방지)의 첫 합의이옵니다. (두련사 설계 승인)
3. **licenseRegistry 300 LOC 선제 신설** — 음원이 들어오기 *전에* 라이선스 감사 게이트를 먼저 깎아둔 결단이 P0 *라이선스 위험 0건* 약속을 지키는 유일한 방편이옵니다.
4. **진채봉 5종 가이드 묶음 (사용자·에러카피·PR·README·CHANGELOG)** — 도구·음원이 늘어도 흩어지지 않도록 SSOT 5장(章)을 한 결로 엮었사옵니다. *몬스터 아트·devloop와 동일 형식 유지로 학습 비용 0*.

### 🔴 Problem (곡조가 어긋난 마디)

1. **[P0] 본 토픽의 세 약속 — 씬 BGM 100%·SFX 100%·라이선스 0건 — 모두 실측 0회** — *과녁 보지 않은 활*. router는 깎았으되, 매핑 표 한 줄도 검증되지 않아 스프린트 성공/실패를 판정할 데이터가 부재하옵니다. (심요연 지표 0/3)
2. **[P0] 6스프린트 연속 7일 커밋 0건** — *Dead Module Drift*가 임계를 넘어 단조 증가 중이옵니다. 직전 회고(dev-cycle)의 *Build-Catchup §1 — Working Tree Zero* 권고가 또 이행되지 못한 채 본 스프린트가 그 위에 1,806 LOC를 덧칠하였사옵니다.
3. **[P0] 4 router 고립 — SoundManager 배선 0회** — 새 router 4종이 기존 `SoundManager.ts (678 LOC)`에 import조차 되지 못하여, 인게임 한 음(音)도 울리지 않는 *유령 모듈*이 되었나이다.
4. **[P1] SFX 음원 0건 — router는 있으되 울릴 곡 없음** — 핵심 이벤트 7종(스킬·타격·회피·크리티컬·메뉴·획득·레벨업) SFX 파일이 단 한 건도 들어오지 않아, combatSfxRouter·uiSfxRouter는 빈 악보로 남았사옵니다.
5. **[P1] 기존 BGM 42 .ogg의 라이선스 메타 미등재** — `licenseRegistry`는 깎였으되, 이미 있는 음원의 출처 1건도 등재되지 않아 *라이선스 위험 0건* 약속의 진위를 가릴 수 없사옵니다.
6. **[P2] `npm run verify:sound` 인터페이스 미신설** — devloop의 `verify:core`처럼 사운드 게이트를 호출할 명령이 없어, CI/회고에서 자동 측정이 불가하옵니다.

### 🟡 Try (다음 곡에서 시도할 것)

1. **다음 스프린트 토픽 권고: *Sound-Wire-up §1 — First Note + License Zero*** — 새 도구·문서를 *늘리지 않고*, 깎아둔 4 router를 SoundManager에 배선하여 **첫 음을 울리는** 데에만 집중하옵소서.
2. **봇 하네스 `ship-gate` hook 신설 (3스프린트째 이월)** — `git diff --stat ≠ 0` AND `git log --since=7d ≥ 1`가 충족되지 않으면 다음 스프린트 시작을 BLOCK. (직전 회고에서 이월된 부채)
3. **워킹트리 139 → 0 분류 PR 5건** — a11y / cross-browser / monster-art / dev-cycle / sound 5개 스프린트 산출을 토픽별로 분리 커밋. 진채봉이 PR 본문 5건 초안을 사전 작성.

---

## 4. 액션 아이템 (Next Sprint Backlog)

| ID | 우선순위 | 액션 | 담당 | 측정 기준 |
|----|---------|------|------|----------|
| **A1** | **P0** | 4 router → SoundManager 배선 + 인게임 첫 음 1회 재생 | 계섬월 Build | `SoundManager.playBGM('erebos_field')` PASS 스크린샷 |
| **A2** | **P0** | 워킹트리 139 → 0 분류 PR 5건 (a11y/cross-browser/monster-art/dev-cycle/sound) | 진채봉 + 계섬월 | `git status --short \| wc -l` = 0 |
| **A3** | **P0** | 봇 하네스 `ship-gate` hook 신설 | 두련사 Eng | hook 작동 로그 1건 |
| **A4** | **P1** | 기존 BGM 42 .ogg 라이선스 메타 등재 + `licenseRegistry` 자동 감사 1회 PASS | 이소화 보안 | 위험 0건 보고서 |
| **A5** | **P1** | SFX 음원 7종(핵심 이벤트) 수급 + `npm run verify:sound` 신설 | 가춘운 + 계섬월 | 7/7 라우팅 PASS |

---

## 5. 팀 성과 (9 에이전트 협주)

| 에이전트 | 기여 | 비고 |
|---------|------|------|
| 백능파 (CSO) | office_hours 수요 검증 + plan 단계 SSOT 합의 | 22초·31초 — 빠른 판정 ✅ |
| 두련사 (Eng) | 3-축 router 분리 아키텍처 승인 + 회고 메트릭 집계 | 76초·87초 |
| 정경패 (Tech) | think 단계 음원-코드 결합도 분석 | 64초·66초·93초 |
| 심요연 (Data) | 지표 0/3 미달 정량 진단 + 패턴 4스프린트 연속 지적 | 41초·44초·52초·55초·56초·109초 — *최다 발화* |
| 이소화 (Security) | research 라이선스 안전성 + qa 보안 게이트 | 63초·108초·111초 |
| 가춘운 (CMO) | assets 디자인 토큰 합의 (음원 부재로 미실행) | 120초·198초 |
| 계섬월 (Build) | 1,166 LOC router 4종 산출 (Build 결손 회복) | 208초·324초 — *최장 발화* |
| 적경홍 (QA) | qa 회귀 테스트 골격 (실측 0회) | 132초 |
| **진채봉 (Editor, 본인)** | 가이드 5종 640 LOC + 본 회고 | 48초·139초 |

---

## 6. CHANGELOG 발행 안내

본 회고를 근거로, **`CHANGELOG.md [1.0.0-rc.3] — Unreleased §Added`에 다음 항목을 추가하옵니다** (별도 commit 시점에 진채봉이 일괄 반영):

```markdown
- **에테르나 크로니클 BGM·SFX 사운드 시스템 통합 — 스프린트 회고** (`docs/release/retro_sound-system-integration-sprint.md`) — 진채봉 Editor
  - 9단계 Auto 스프린트 결과 정리 · Keep/Problem/Try · 5개 액션 아이템 (A1·A2·A3 P0)
  - **진전**: 9-에이전트 협주로 9편 / 1,806 LOC 산출 — 코드 1,166 (router 4종 `sceneBgm`/`combatSfx`/`uiSfx`/`licenseRegistry`) + 문서 640 (가이드 5종)
  - **재발**: 7일 커밋 0건 (**6스프린트 연속**) · 워킹트리 129 → 139 entries 단조 증가 · **본 토픽 3약속(BGM 100%·SFX 100%·라이선스 0건) 실측 0회** — *과녁 보지 않은 활* (심요연 4스프린트 연속 지적)
  - **고립**: 4 router 모두 `SoundManager.ts`에 import 0회 — *유령 모듈*
  - 다음 스프린트 권고: *Sound-Wire-up §1 — First Note + License Zero* — A1 SoundManager 배선 + 첫 음 재생 1회 · A2 워킹트리 139→0 분류 PR 5건 · A3 봇 하네스 `ship-gate` hook(3스프린트째 이월)
- **사운드 시스템 통합 — 텍스트 에셋 묶음 v1.0** (Sprint Auto-Sound-Integration, 2026-04-27) — 진채봉 Editor 합본 정리
  - 흩어진 세 격자(scene → combat → ui)와 한 안전망(license)을 한 결로 잇도록, 사람 손에 잡히는 텍스트 에셋 5편을 묶어 두옵니다.
  - 라이선스 약속: CC0 / CC-BY (출처 표기) 외 0건 — `licenseRegistry.ts` 자동 감사 게이트
  - 산출물 5건 / 총 ~640 LOC — 에셋 단계 → Build(계섬월) 인계 완료 (배선 미실행)
```

---

> *"악기는 깎이고 악보는 쓰였으나, 첫 음(音)이 울리지 않으면 그것은 곡(曲)이 아니라 종이일 뿐이옵니다.*
> *다음 스프린트는 *늘리는 곡*이 아닌 *울리는 곡*이 되기를 청하옵니다."*
> — 진채봉 Editor, 2026-04-27
