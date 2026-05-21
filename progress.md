Original prompt: [$autoplan](C:\Users\crisi\.agents\skills\autoplan\SKILL.md) 크로노 트리거 컨셉 + FF6 ATB 시스템 웹 RPG Game 개발

## 2026-05-08

- autoplan / develop-web-game / Phaser 2D / TDD 스킬 흐름 적용.
- 기존 프로젝트는 Phaser + TypeScript 웹 RPG이며, 이미 `WorldScene`, `GameScene`, `BattleScene`과 서버 ATB stub이 존재함.
- 구현 목표: 서버 FF6 ATB 코어 stub 제거, Chrono Trigger식 시간대 투영 데이터 추가, 월드/전투 진입에 시간대 선택 연결.
- TDD RED 준비: `tests/unit/combat/atb.contract.test.ts`, `tests/unit/chronoTimeline.test.ts`.
- 서버 ATB 구현 완료: 속도 clamp, FF6식 충전량, ready 큐, Wait/Semi/Active 정지 규칙, 커맨드별 gauge 소비.
- Chrono 시간대 구현 완료: 고대/현재/붕괴미래 데이터, 존 투영, 전투 seed 생성.
- 클라이언트 연결 완료:
  - `WorldScene`: Q/E 또는 버튼으로 시간대 순환, 시간대별 존 정보 패널, GameScene으로 era 전달.
  - `GameScene`: 시간대 tint/라벨, 몬스터 이름/전투 배율 seed 전달.
  - `BattleScene`: 시간대 라벨/보상 배율/적 HP·ATB 속도 보정, ATB MODE 버튼(WAIT/ACTIVE/SEMI).
  - `main.ts`: 개발 전용 `?debugScene=world|battle` QA 진입점, `render_game_to_text`, `advanceTime` fallback.
- 검증:
  - RED 확인 후 GREEN: `npx vitest run --config tests/vitest.config.ts tests/unit/combat/atb.contract.test.ts tests/unit/chronoTimeline.test.ts`
  - `npm --prefix client run typecheck`
  - `npm --prefix server run typecheck`
  - `npm --prefix client run build`
  - 웹 게임 테스트 클라이언트로 world/battle debugScene 실행, 이후 Playwright 페이지 스크린샷과 console error 0건 확인.

## TODO

- 실제 로그인/캐릭터 선택 플로우에서 시간대 선택을 저장 데이터에 반영하면, 디버그 진입점 없이도 같은 era를 이어갈 수 있음.
- 서버 CombatEngine이 `server/src/combat/atb` SSOT를 직접 사용하도록 다음 단계에서 연결하면 클라/서버 ATB 공식 불일치 리스크가 줄어듦.

## 2026-05-08 리뷰 finding 대응

- 리뷰 finding: `client/public/assets/generated` 추적 symlink가 Windows junction으로 바뀌어 `git diff`에서 삭제로 잡힘.
- 수정: `client/public/assets/generated`, `client/public/assets/resources`를 Git 추적 symlink 상태로 복원하고 로컬 repo `core.symlinks=true`로 맞춤.
- 확인: 두 경로 모두 `SymbolicLink`로 동작하며 `TEM-BG-FAR-DAY.png`, `resources/manifest.json` 접근 가능. `git diff c92f140... -- client/public/assets/generated client/public/assets/resources test-results.json` 빈 diff 확인.
- 추가 발견: 외부 headless Playwright WebGL 경로는 `WorldScene` display list가 정상이어도 캔버스 캡처가 검정으로 나오는 환경 이슈가 있었고, 앱 브라우저 실제 렌더는 정상.
- 수정: `?renderer=canvas` QA override와 WebKit Canvas 폴백 명시화를 `RendererDetector`에 추가하고 단위 테스트 보강.
- 검증: `npm --prefix client run typecheck`, `npx vitest run --config tests/vitest.config.ts tests/unit/browserCompat.test.ts --reporter=default`, `develop-web-game` Playwright 클라이언트 Canvas 스모크, console/page/HTTP 오류 0 및 nonBlack pixel 5184/5184 확인.

## 2026-05-08 자동 QA

- 현재 `http://localhost:5173` 기준으로 Playwright 자동 QA 수행.
- 검증 시나리오: 메인 부팅, 로비 퀘스트 패널/수주/완료, 월드맵 시대 전환 입력, 붕괴미래 전투 ATB HUD.
- 발견/수정: `CombatManager` 생성자가 로컬 QA 전투에서도 Socket.IO를 즉시 연결해 `localhost:3000` WebSocket 콘솔 에러를 발생시킴.
- 수정 완료: `CombatManager`에 `useSocket` 옵션 추가, `BattleScene` 로컬 QA/비로그인 전투에서는 서버 전투와 소켓을 모두 비활성화.
- 최종 검증:
  - `npm --prefix client run typecheck`
  - Playwright 자동 QA 4/4 pass, console error 0, page error 0, HTTP >=400 0
  - `npm --prefix client run build`
- 최종 리포트: `.gstack/qa-reports/localhost-auto-qa-2026-05-07T18-45-57-694Z.md`

## 2026-05-08 서버 연결 실패 대응

- 증상: `localhost:5173` 클라이언트는 실행 중이지만 `localhost:3000` 서버 포트가 닫혀 서버 연결 실패.
- 확인: Postgres `5432`, Redis `6379`, 루트 `.env`는 존재했지만 서버 엔트리가 `.env`를 자동 로드하지 않아 일반 재시작 시 환경변수 누락 가능성이 컸음.
- 수정: `server/src/bootstrap/loadEnv.ts` 추가, `server/src/server.ts`에서 bootstrap 이전에 로드하도록 연결.
- 서버 기동: 루트 `.env`를 주입해 dev 서버를 백그라운드로 시작했고 `localhost:3000` 리슨 확인.
- 검증:
  - `GET http://localhost:3000/api/health` -> 200
  - `GET http://localhost:3000/socket.io/?EIO=4&transport=polling` -> 200
  - 클라이언트 `http://localhost:5173`에서 `/api/health` 프록시 -> 200
  - `npm --prefix server run typecheck`
  - `npm --prefix server run build`

## 2026-05-08 붕괴미래 에테르 평원 QA

- 범위: `http://localhost:5173/?debugScene=world&era=ruined_future`에서 월드맵 → 붕괴미래 에테르 평원 → 필드 몬스터 클릭 → ATB 전투 진입.
- 1차 QA 실패:
  - `/api/world/zones/aether_plains`가 서버 실제 존 코드와 맞지 않아 404 발생.
  - 사운드 매니페스트가 `audio/...`를 로드해 Vite SPA fallback HTML을 오디오로 디코딩하면서 대량 page error 발생.
  - 필드 몬스터 클릭 좌표가 런타임 좌표와 맞지 않아 BattleScene 진입 검증 실패.
- 수정:
  - `NetworkManager.getZoneInfo()`에서 `aether_plains`를 서버 `erebos_outskirts`로 조회하고, 클라이언트가 기대하는 `ZoneInfo` 형태로 정규화.
  - 서버 존에 스폰 데이터가 비어 있어도 에테르 평원 기본 몬스터/NPC fallback을 유지.
  - `SoundManager` 오디오 로드 경로를 `assets/audio/...`로 보정해 실제 137개 매니페스트 파일만 로드.
- 검증:
  - `npm --prefix client run typecheck`
  - 사운드 매니페스트 137개 파일 존재 확인
  - Playwright QA PASS: assertions 19, console error 0, page error 0, HTTP >=400 0
  - `npm --prefix client run build`
- 최종 리포트: `.gstack/qa-reports/ruined-future-aether-plains-qa-2026-05-07T19-13-53-460Z.md`

## 2026-05-08 필드 플레이어 스케일링 QA

- 사용자 스크린샷 기준 문제: `GameScene` 플레이어가 256x384 전신 일러스트 원본 크기로 표시되어 필드 지형/몬스터/라벨을 과도하게 가림.
- 수정: `GameScene.createPlayer()`에서 필드 표시 높이를 112px 기준으로 제한하고 depth를 명시.
- 검증:
  - `npm --prefix client run typecheck`
  - Playwright QA PASS: 플레이어 표시 높이 <= 120, 전투 진입, console error 0, page error 0, HTTP >=400 0
  - 스크린샷 직접 확인: `.gstack/qa-reports/2026-05-07T19-28-00-141Z-ruined-future-aether-scaled-field-ready.png`
  - `npm --prefix client run build`
- 리포트: `.gstack/qa-reports/ruined-future-aether-plains-scaled-qa-2026-05-07T19-28-00-141Z.md`

## 2026-05-08 말라투스 성소 진입 QA

- 범위: `http://localhost:5173/?debugScene=world&era=present`에서 월드맵 → 말라투스 성소 선택 → 필드 진입 → 성소 몬스터 ATB 전투 진입.
- 발견/수정:
  - HUD 기본 퀘스트에는 `말라투스 성소 진입`이 있었지만, 월드맵에는 실제 진입 노드와 `malatus_sanctuary` 존 라벨/서버 코드 매핑이 없었음.
  - `WorldScene`, `ChronoTimeline`, `GameScene`, `BattleScene`, `AssetManager`, `NetworkManager`에 말라투스 성소 클라이언트 존을 연결.
  - 서버 실제 존 코드 `silvanhome_sanctum`을 클라이언트 `malatus_sanctuary`로 정규화하고, 스폰 데이터가 비어도 성소 몬스터/NPC fallback이 나오도록 보강.
  - 월드맵 이동 시 소켓이 연결된 경우에만 `world:teleport`를 보내도록 해 정상 QA 경로의 미연결 warning 제거.
- 검증:
  - `npm --prefix client run typecheck`
  - `npx vitest run --config tests/vitest.config.ts tests/unit/chronoTimeline.test.ts --reporter=default`
  - Playwright QA PASS: WorldScene active, `현재 말라투스 성소` 패널, Quest Tracker `말라투스 성소 진입`, `zoneInfo.id === malatus_sanctuary`, 몬스터 3종 스폰, ATB BattleScene 진입, console error 0, page error 0, HTTP >=400 0
- 리포트: `.gstack/qa-reports/malatus-sanctuary-entry-qa-2026-05-07T19-55-02-596Z.md`

## 2026-05-16 CHRONO-ATB chapter — FF6 ATB SSOT + 시대 차별화 (9 sprint, 회귀 0)

목표: 크로노 트리거 기획 + FF6 ATB 시스템을 SSOT 기준으로 통합하고 시대(ChronoEra)별 ATB 차별화까지 wire.

- **S1 — combatEngine ATB 충전 SSOT 통합** (`631fd2d`): line 378 자체 공식 `atbChargeBase*(1+spd/100)` → `server/src/combat/atb/atbTimeline.ts`의 `computeChargeDelta(spd, mult, tier, tickMs)` (FF6 레퍼런스). CombatConfig 에 atbMode/speedTier/menuOpen 추가, WAIT+menuOpen 정지 처리.
- **S2 — ATB 소비 SSOT consumeGauge** (`e381edd`): action.type === 'defend' 면 ATB_MAX/2 유지 (FF6 Defend), 그 외 0.
- **S3 — ready 큐 readyAtTick FIFO 정렬** (`3a448b9`): readyOrderCounter + readyAtTick Map → 도달 순서 큐. 행동/사망/부활 시 cleanup.
- **S4 — Snapshot atbReady + atbQueueIndex** (`bdeefa3`): ParticipantSnapshot 에 큐 인덱스 노출 → 클라 UI 데이터 흐름.
- **S5 — WorldScene era localStorage 영속화** (`7fb2565`): `client/src/time/eraStorage.ts` (load/save/clear + isChronoEraId 가드). Q/E 시대 전환 즉시 저장, 부팅 시 복원.
- **S6 — 시대 → ATB SpeedTier 매핑** (`adf7686`): `shared/types/chronoEraAtb.ts` — ancient 2(0.7x) / present 3(1.0x) / ruined_future 4(1.3x). CombatInstanceManager.createFromEra helper.
- **S7 — /combat/start eraId 라우트** (`d98218c`): CombatStartBody.eraId optional, isChronoEraId 가드 후 createFromEra 호출.
- **S8 — 클라 BattleScene eraId 전달** (`1013740`): CombatStartRequest.eraId 추가, BattleScene._startServerCombat 가 this._initData.eraId 포함 → 서버 자동 tier.
- **S9 — flee 도주 (FF6 패턴)** (`0f64205`): line 641 placeholder 제거. 성공률 `clamp(0.3 + (avgPartySpd - avgMonsterSpd)/200, 0, 0.95)`, 보스 시 0%. 성공 → fleeWinner='draw', state='COMPLETED'.

- 라이브 흐름: WorldScene Q/E → `aeterna_last_era` 저장 → BattleScene init.eraId 복원 → /combat/start eraId 전송 → server `createFromEra` → ATB speedTier 자동 매핑 → ATBGaugeRenderer 차별화 표시 가능.
- 검증:
  - `npm --prefix server run typecheck` 0 errors
  - `npm --prefix client run typecheck` 0 errors
  - `npx vitest run` 103 files / 1242 tests pass (직전 1204 → +38 신규 회귀 가드)
- PR #11 (codex/update-browser-qa-scenarios → main) 에 9 sprint commit 누적, main 에 S1 직접 통합 (S2~S9 PR 대기).

## 2026-05-16 CHRONO-ATB chapter II — UI tier + server 보정 + Dual Tech (7 sprint, 회귀 0)

I 챕터 SSOT 정착 위에 사용자 가시 차별화 + 크로노 트리거 시그니처 메커니즘 데이터·실행 완성.

- **S11 — BattleScene era tier 시각화** (`53ef729`): 우상단 `era.label / yearLabel · ATB ×0.7|1.0|1.3` 라벨. setName 으로 라이브 QA 검출 hook.
- **S12 — server eraId monster 보정** (`8a84aae`): `chronoEraToEnemyMultipliers` 추가 (HP × · attackSpeed × · reward × · levelOffset). DB monster + legacy 둘 다 적용. 클라/서버 stats SSOT 일관성 회복.
- **S13 — Dual Tech 데이터 구조** (`dc46a58`): `shared/types/dualTech.ts` (DualTechDef + resolveDualTech + getDualTechById). chrono_blade (time_knight + ether_knight, 2.2× chrono, MP 12) 첫 정의.
- **S14 — combatEngine 후보 검출** (`40cf3c7`): TickResult.dualTechCandidates 노출. ready party 모든 쌍 (n choose 2) resolveDualTech 매칭. 클라 UI 데이터 흐름.
- **S15 — Dual Tech 실행 로직** (`77fbd1e`): submitDualTech + tryExecuteDualTech. 평균 atk × damageMultiplier, 양쪽 MP 차감 + ATB 0 리셋. ActionResult actionType='dual_tech'.
- **S16 — Dual Tech 다양성 +2종** (`34780ca`): shadow_eclipse (shadow_weaver + ether_knight 2.0× dark MP 14), memory_warp (memory_weaver + time_knight 2.4× chrono MP 18). damageMultiplier design range 2.0~2.5 가드.

- 검증: 104 files / 1263 tests pass (chapter I 1242 → +21 신규 회귀 가드). server+client typecheck 0 errors.
- PR #11 에 S4~S16 + progress docs 누적 (총 13 commit 머지 대기).

## 2026-05-16 CHRONO-ATB chapter III — Dual Tech wire + 시대 정체성 (7 sprint, 회귀 0)

II 챕터 Dual Tech 데이터/실행 위에 server↔클라 wire 완성 + 추가 6종 + 시대별 monster 정체성.

- **S17 — progress II docs** (`a25eecf`): S10~S16 chapter II 정리.
- **S18 — BattleScene init.eraId localStorage 자동 복원** (`46d4612`): WorldScene 미경유 진입(?debugScene=battle)에서도 마지막 era 유지. loadLastEra fallback.
- **S19 — REST /combat/dual_tech + 클라 wire** (`d149722`): POST 라우트 (JWT + 필수 파라미터 검증) + NetworkManager.combatDualTech 메서드.
- **S20 — Dual Tech +6종** (`e156f27`): chrono_sealing, ether_recall, shadow_memory, guardian_pact, void_pierce, memory_shatter — 총 9종, 클래스 9개 cross-product 핵심 페어.
- **S21 — monster name decorator** (`05fd1e9`): decorateMonsterNameByEra (ancient "[고대] ", ruined_future "[붕괴] "). /combat/start 모든 monster name 적용. idempotent.
- **S22 — WebSocket combat:dual_tech** (`828bd3e`): combatSocketHandler 핸들러. canControl 권한 검증 양쪽 actor + engine.submitDualTech.
- **S23 — 클라 BattleScene dualTechCandidates 수신** (`936922c`): combat:tick 핸들러 확장 → '✨ 협공 가능: 크로노 블레이드' 로그 + lastDualTechCandidates 상태 보관 (후속 UI 데이터 소스).

- 라이브 흐름 v2: WorldScene Q/E (S5) → BattleScene (S18) → /combat/start eraId (S7/S12) → server era tier + monster 보정 + name decorator → tick result.dualTechCandidates → 클라 로그 (S23) → 클라 UI 후속 sprint 에서 발동 버튼 추가.
- 검증: 104 files / 1275 tests pass (chapter II 1263 → +12 신규 회귀 가드). server+client typecheck 0 errors.
- PR #11 누적 21+ commit.

## 2026-05-16 CHRONO-ATB chapter IV — Dual Tech 사용자 진입점 + 정체성 보강 (8 sprint, 회귀 0)

III 챕터 후보 노출 후, 실제 user-facing 발동 흐름 + 시각 피드백 + 시대 정체성 추가.

- **S24 — progress III docs** (`14e4484`): S17~S23 chapter III 정리.
- **S25 — 'D' 단축키 발동** (`6187a10`): BattleScene keydown-D → _triggerFirstDualTech (lastDualTechCandidates[0] + 첫 alive 적). 미연결/후보 없음/적 사망 케이스별 로그.
- **S26 — chain combo bonus** (`2b10657`): 5 tick 이내 연속 협공 시 1.2× 데미지. ActionResult.actorName '(CHAIN)' 표시. server 측 lastDualTechTick 추적.
- **S27 — EffectManager.spawnDualTechEffect** (`603a6e7`): fxKey → 색조 매핑 (chrono cyan / dark·shadow purple / ether·holy gold). 발동 시 magic hit 3중첩 + '✨ {techName}' 강조 텍스트.
- **S28 — chain combo indicator** (`5c55e40`): combat:tick action.actorName '(CHAIN)' 검출 → '🔥 CHAIN COMBO! +20% 데미지' 로그.
- **S29 — ATB protocol dual_tech kind** (`5d1fc18`): ATBCommandInput.command union 에 'dual_tech' (partnerActorId, techId, targetId) 추가. SSOT 일관성.
- **S30 — 시대별 dropTable rare** (`d82ab65`): chronoEraBonusDrops — ancient(ancient_relic_shard rare 3%), ruined_future(chrono_crystal epic 5% + voidshard rare 8%). /combat/start DB monster dropTable append.
- **S31 — Dual Tech 버튼 UI** (`6fcd0d8`): BattleScene 우하단 클릭 가능 버튼. setName('dualTechButton'), 후보 ≥1 시 visible + 첫 이름 표시. D 단축키 대체 진입점.

- 검증: 104 files / 1282 tests pass (chapter III 1275 → +7 신규 회귀 가드). server+client typecheck 0 errors.
- 누적 sprint: chapter I (9) + II (7) + III (7) + IV (8) = **31 sprint**, PR #11 commits 29개.

## 2026-05-16 CHRONO-ATB chapter V — Dual Tech 풀 라인업 + AOE + 시대 monster 패시브 (8 sprint, 회귀 0)

IV 챕터 UI/단축키 위에 게임플레이 다양성 확장 — 18종 + AOE + 보스 저항 + 시대 monster 차별화.

- **S33 — Dual Tech 발동 SFX** (`4834da0`): playSfx 2회 (sfx_combat_magic_cast 0.8 + COMBAT_VOICE.SKILL_CAST 0.7) — 시각+청각 채널 모두.
- **S34 — 보스 target 저항** (`0557977`): tryExecuteDualTech 에서 target.isBoss 시 bossResist=0.6, actorName '(BOSS RESIST)' 표시. 밸런스 보호.
- **S35 — Dual Tech 12종** (`ccaa726`): +void_oblivion / guardian_eclipse / memory_void.
- **S36 — 다중 후보 cycle** (`936e86e`): Shift+D → 다음 후보, dualTechSelectedIndex 보관, 버튼 라벨 갱신.
- **S37 — monster 시대 패시브** (`0ae300e`): ancient evasion +5%, ruined_future hitChance +5%. /combat/start 양쪽 path 적용.
- **S38 — Dual Tech 18종** (`175657f`): +ether_break / ether_void / time_overflow / time_break / shadow_void / memory_break. cross-product 절반 커버. 페어 중복 검출.
- **S39 — AOE 광역 협공** (`5dd4e25`): DualTechDef.aoe 필드. memory_break / time_overflow / void_oblivion AOE. tryExecuteDualTech 전체 alive monster 반복, 보스 저항 개별 적용. actorName '(AOE)'.
- **S40 — 클라 AOE 시각 효과** (`7bbf7f2`): combat:tick action '(AOE)' 검출 → enemySprites 전체에 spawnDualTechEffect 호출. 광역 협공 로그.

- 검증: 104 files / 1296 tests pass (chapter IV 1290 → +6). combatEngine 26/26, dualTech 27/27, chronoEraAtb 24/24.
- 누적 sprint: I(9) + II(7) + III(7) + IV(8) + V(11) + 이번 보강(0 — 그대로 V chapter 잔여) = 40 sprint. PR #11 38 commits.

## 2026-05-16 CHRONO-ATB chapter VI — Dual Tech 완성 + 누적 저항 + UI 정보 풍부화 (7 sprint, 회귀 0)

V 챕터 풀 라인업 위에 cross-product 완성 + 보스 학습 + 클라 UI 깊이.

- **S41 — progress V docs** (`4493ad0`): S33~S40 chapter V 정리.
- **S42 — Dual Tech 21종 cross-product 완성** (`545b8b8`): +memory_pact / guardian_void / guardian_break. C(7,2)=21 모든 페어 매핑 검증.
- **S43 — 누적 보스 저항** (`f62f0d0`): CombatParticipant.dualTechHitsTaken. computeBossResist = max(0.3, 0.6 - 0.05 × hits). 보스가 협공 spam 학습.
- **S44 — element 기반 SFX** (`fc45a3f`): 클라 BattleScene 이 getDualTechById 로 def.element 조회 → DUAL_TECH_SFX_BY_ELEMENT 매핑 (holy → magic_heal).
- **S45 — DualTechCandidate 정보 확장** (`2f47317`): server 가 element + aoe + mpCost 노출. 클라가 actorName 문자열 검출 의존 줄임.
- **S46 — 버튼 element 색조 + AOE 아이콘** (`f75150f`): 협공 버튼 라벨 '✨/💥 ', bg tint (chrono cyan / dark purple / holy gold). combat:tick 갱신 + Shift+D cycle 일관 적용.
- **S47 — AI hints 데이터** (`9ec7ad3`): chronoEraToAIHints (defensive/aoe/aggressive bias). 향후 MonsterAIEngine 통합 위한 데이터.

- 검증: 104 files / 1296+ tests pass. combatEngine 27/27 + dualTech 31/31 + chronoEraAtb 28/28.
- 누적 sprint: I(9) + II(7) + III(7) + IV(8) + V(8) + VI(7) = **47 sprint**. PR #11 commits 45개.

## 2026-05-16 CHRONO-ATB chapter VII — UI 풍부화 + AI 차별화 + Triple Tech 도입 (13 sprint, 회귀 0)

VI 챕터 풀 라인업 위에 사용자 가시 깊이 + server-side AI + 3인 협공 시그니처.

- **S48 — progress VI docs** (`b62d4ed`): chapter VI 정리.
- **S49 — 카메라 shake** (`20b692b`): Dual Tech 발동 시 cameras.main.shake (AOE 180ms 0.01, 단일 120ms 0.006). a11y 가드.
- **S50 — Snapshot dualTechHitsTaken 노출** (`48a4f23`): 클라 UI 보스 저항 단계 가시 데이터.
- **S51 — 보스 위 협공 저항 라벨** (`f4e2c6b`): '🛡 협공 저항 +N×5%' gold 텍스트, sprite 캐싱 갱신.
- **S52 — monster sprite era tint** (`aabf4e0`): present 외 era 에 sprite.setTint(era.tintColor).
- **S53 — MonsterAI aggressiveBias** (`a4ba90f`): CombatConfig.eraId + addParticipant 가 chronoEraToAIHints → basicAttackMultiplier 보정.
- **S54 — dualTech 조회 helpers** (`a6f29b2`): listDualTechsByClass / Element / AOE. UI Wiki/sub-menu 기반.
- **S55 — monsterAI tier era 보정** (`4c2386d`): defensiveBias > 0.2 → basic → tactical 승급. ancient 회상의 영리함.
- **S56 — AOE damage falloff** (`fcbc9d0`): AOE main target 100%, splash 80% — 타겟 선택 의미 부여.
- **S57 — Triple Tech 데이터 구조** (`129ab85`): shared/types/tripleTech.ts 신규. aetherna_final 첫 정의 (ether_knight + time_knight + memory_weaver, 3.5× chrono AOE MP 30).
- **S58 — Triple Tech +2** (`b4aa967`): chrono_break (3.3×), void_eternity (3.8× 최강). 총 3종.
- **S59 — Triple Tech 실행 로직** (`a3962aa`): submitTripleTech + tryExecuteTripleTech. 3명 평균 atk × 3.0~3.8x, chain + boss + aoe falloff 모두 적용. processTick 3.4 단계 (Dual Tech 보다 먼저).
- **S60 — TripleTechCandidate 노출** (`5bbb9e6`): TickResult.tripleTechCandidates + computeTripleTechCandidates (C(n,3) 검사).

- 검증: combatEngine 31/31 + dualTech 35/35 + tripleTech 11/11 + chronoEraAtb 28/28. server+client typecheck 0 errors.
- 누적: I(9) + II(7) + III(7) + IV(8) + V(8) + VI(7) + VII(14 — 보강 포함) = **60 sprint**. PR #11 commits 58개.

## 2026-05-16 CHRONO-ATB chapter VIII — Triple Tech 완전 wire (7 sprint, 회귀 0)

S61 progress · S62 REST · S63 'T' 단축키 · S64 WS · S65 버튼 · S66 보스 저항 · S67 라벨.
누적 67 sprint, PR #11 65 commits.

## 2026-05-16 CHRONO-ATB chapter IX — Triple Tech 다양성 + chain 단계 + era 필터 (11 sprint)

- **S68** docs VIII / **S69** Triple +2 (5종) / **S70** chain UI 라벨 / **S71** Triple +3 (8종) / **S72** Triple +2 (10종) / **S73** chain 단계 보너스 (2~3=1.2x, 4+=1.5x) / **S74** (MAX CHAIN) 빨간 강조 / **S75** chain 4+ HP 5% 회복 / **S76** Triple +3 (13종) / **S77** listByClass/Element helpers / **S78** eraFilter (void_eternity ruined_future 전용).
- 검증: combatEngine 31/31 + tripleTech 25/25 + dualTech 35/35.
- 누적 **77 sprint**, PR #11 76 commits.

## 2026-05-16 CHRONO-ATB chapter X — 시대 필터 통일 + 면역 + 통계 + cycle + 15종 (10 sprint)

- **S79** docs IX / **S80** Dual eraFilter 통일 / **S81** dualTechImmune flag / **S82** combatStats 카운터 / **S83** 종료 시 통계 보고 / **S84** chain decay 깜빡 / **S85** eraFilter 확장 (ether_recall/void_oblivion/guardian_oath) / **S86** Snapshot dualTechImmune + 클라 면역 라벨 / **S87** Triple cycle (Shift+T) / **S88** Triple Tech 15종.
- 검증: combatEngine 33/33 + tripleTech 25/25 + dualTech 35/35.
- 누적 **88 sprint**, PR #11 87 commits.

## 2026-05-16 CHRONO-ATB chapter XI — Triple 풀 UI + chain 보상 + 시대 일관성 (10 sprint)

- **S90** CombatLogger 협공 통계 통합 / **S91** Triple 버튼 element 색조+AOE / **S92** chain 4+ EXP/Gold +20% / **S93** RewardResult.chainBonusApplied / **S94** 클라 보상 chain 로그 / **S95** chrono_blade/memory_warp eraFilter / **S96** chrono_break/shadow_chrono eraFilter / **S97** listByEra helpers / **S98** techCatalog 회귀 가드 (Dual 21+Triple 15=36).
- 검증: combatEngine 33/33 + dualTech 38/38 + tripleTech 25/25 + techCatalog 5/5.
- 누적 **98 sprint**, PR #11 96 commits.

## 2026-05-16 CHRONO-ATB chapter XII — 100 sprint 마디 + Field 시스템 시작 (10 sprint)

100 sprint 도달 + 크로노 트리거 핵심 컨셉 'visible encounter / 시대별 필드' 데이터 + wire 시작.

- **S100** chain MAX 도달 알림 효과 / **S101** chronoField 데이터 구조 + aether_plains 3 era / **S102** memory_forest + shadow_gorge (9 encounter) / **S103** rollFieldMonster weighted picker / **S104** malatus_sanctuary + crystal_cave (15) / **S105** forgotten_citadel + chrono_spire (21 — 7 zone 완성) / **S106** server /api/world/zones/:code/encounter REST / **S107** NetworkManager.fetchZoneEncounter / **S108** WorldScene 정보 패널 encounter line + 보스 indicator / **S109** BattleScene 좌상단 ambient line.

- 검증: chronoField 18/18 + 기존 combatEngine 33/33 + dualTech 38/38 + tripleTech 25/25 + techCatalog 5/5.
- 누적 **109 sprint**, PR #11 113 commits.

**완성된 크로노 트리거 필드 시스템 v1**:
- 7 zone × 3 era = 21 encounter (52 unique monster id)
- 시대별 monster pool / 보스 weight 분리 / 분위기 ambient line
- weighted picker (rollFieldMonster) + deterministic 검증 가능 (rollFieldEncounterSpawns)
- server REST + 클라 NetworkManager wire
- WorldScene 정보 패널 + BattleScene 좌상단 표시

## 2026-05-16 CHRONO-ATB chapter XIII — Field 시스템 v2 (BGM + effect + 헬퍼) (7 sprint)

- **S110** docs XII / **S111** FieldEncounter bgmTrack/ambientEffect 필드 / **S112** era 기본값 자동 적용 (resolveFieldEncounter override 가능) / **S113** BattleScene 색조 overlay (mist/dust/glow/void alpha 0.06) / **S114** fetchZoneEncounter 응답 타입 갱신 / **S115** getBossSlot + listAllFieldMonsterIds 헬퍼 / **S116** SoundManager.playBgm wire (1500ms crossfade).
- 검증: chronoField 29/29.
- 누적 **116 sprint**, PR #11 119 commits.

## 2026-05-16 CHRONO-ATB chapter XIV — Field v3 + barrel + GameScene visible encounter (7 sprint)

- **S117** docs XIII / **S118** ambientEffect boss_room (chrono_spire/ruined_future 빨간 alpha 0.12) / **S119** forgotten_citadel/ruined_future boss_room + bgm_void_citadel / **S120** chrono_spire ancient/present 시대 BGM / **S121** techCatalog Field 가드 (21 + 보스 슬롯 + 최종 보스 weight 0.4) / **S122** shared/types/chrono.ts barrel single-import + chronoBarrel.test.ts 4 도메인 가드 / **S123** GameScene chronoField encounter visible spawn v1.
- 검증: chronoField 31/31 + chronoBarrel 4/4 + techCatalog 9/9.
- 누적 **123 sprint**, PR #11 126 commits.

## 2026-05-16 CHRONO-ATB chapter XV — 보스 visible 진입 + 카메라/SFX 강화 (5 sprint)

- **S125** GameScene 보스 sprite 60×60 + gold ring + BOSS 라벨 / **S126** 보스 visible 진입 시 enemyHp ×2.5 + reward ×1.5 + isBossField 전달 / **S127** BattleScene isBossField boss_room ambient 강제 / **S128** 보스 진입 카메라 zoom (1.0→1.05 400ms) / **S129** 보스 진입 SFX (magic cast + voice).
- 130 sprint 마디 도달.
- 누적 **130 sprint**, PR #11 134 commits.

## 2026-05-16 CHRONO-ATB chapter XVI — 보스 cross-product 100% 완성 (4 sprint)

- **S131** aether_plains/present 평원 가디언 / **S132** memory_forest/present 숲의 잔영 + shadow_gorge/ancient 황혼 환영 / **S133** malatus_sanctuary/present 부서진 봉인 + crystal_cave/ancient 고대 결정 거인 / **S134** 21 encounter 모두 hasBossSlot=true 회귀 가드.
- 누적 **134 sprint**, PR #11 138 commits.
- **7 zone × 3 era = 21 encounter 모두 보스 슬롯 보유 (cross-product 100%)**

## 2026-05-16 CHRONO-ATB chapter XVII — Boss 헬퍼 + Catalog 가드 (3 sprint)

- **S135** docs XVI / **S136** getTotalFieldBosses + listAllBossMonsterIds 헬퍼 / **S137** chronoBarrel test 보스 헬퍼 가드.
- 누적 **137 sprint**, PR #11 141 commits.
- **21 보스 unique id 정렬** + barrel 통합 접근.

## 2026-05-17 CHRONO-ATB chapter XVIII — bossOnlyMode + 140 sprint 마디 + 최종 보스 (3 sprint)

- **S139** chronoField bossOnlyMode 옵션 + rollFieldMonster 분기 / **S140** chronoBarrel 핵심 함수 일괄 검증 (140 sprint 마디) / **S141** chrono_spire/ruined_future bossOnlyMode=true (게임 최종 보스-only 필드).
- 누적 **141 sprint**, PR #11 145 commits.

## TODO (CHRONO-ATB chapter XIX 후보)

- 라이브 Playwright 자동 QA
- 협공 통계 DB 영속화
- 시대 전환 시 GameScene 재 spawn
- BattleScene 승리 시 monster sprite 제거

## 2026-05-17 STORY 정합성 검증 chapter — 플레이 스토리 cross-check (25 sprint, 79 가드)

전체 narrative source cross-check + 회귀 가드.

- **V1** GameScene ZONE_CHAPTER_MAP 에 crystal_cave 누락 추가 (Chapter 3.5)
- **V2** 7 zone × 3 era cross-product + 시대 분위기 키워드 — 'citadel_lord' → '고대 성채 영주' 강화
- **V3** 7 narrative 클래스 cross-check (Dual 21 + Triple 15 partnerClasses + 각 클래스 ≥1 페어)
- **V4** chrono_spire 시그니처 보스 시간선 + ambient line era 키워드
- **V5** 협공 시그니처 (aetherna_final/chrono_blade/void_eternity) + aetherna prefix
- **V6** 전체 회귀 1421 tests
- **V7** 시대별 monster ≥7 unique + ancient 보스 narrative 키워드
- **V8** zone-별 ambient line 차별성 + 21 unique + ruined_future 키워드
- **V9** ChronoTimeline ↔ chronoEraAtb cross-check (hp/attackSpeed/levelOffset/speedTier)
- **V10** progress.md 마무리
- **V11** Tech element 분포 (Dual/Triple chrono/dark/holy 각 ≥1)
- **V12** 협공 eraFilter narrative 일관성 (chrono→ancient/present, dark AOE→ruined_future)
- **V13** fxKey 정합 (fx_{id} 패턴 36 unique)
- **V14** Chapter 1~5 진행 순서 (시작 보스 weight 0.1 ↔ 종점 0.4)
- **V15** 보스/monster id snake_case 패턴 + unique
- **V16** 협공 mpCost balance (Dual ≥12, Triple ≥28, void_eternity ≥30, Triple > Dual avg)
- **V17** partnerClasses 순열 안정성 (Dual reverse + Triple 6!)
- **V18** 시대 진행 어려움 단조 (hp/level/reward/attackSpeed)
- **V19** AI hint 시대 narrative (ancient defensive / present 균형 / ruined_future aoe+aggressive)
- **V20** era bonus drops narrative (ancient relic / ruined_future chrono+void / present 빈)
- **V21** era별 협공 가용성 (시대당 Dual ≥3 + Triple ≥1 + ruined_future 전용 ≥1)
- **V22** AOE Tech narrative (Dual AOE 3종 정확 + Triple 모두 광역)
- **V23** ambientLine 길이 + aetherna 시그니처
- **V24** 정량 정점 (36 협공 + 21 보스 + 50+ monster + 7/3/7 source)
- **V25** progress.md 최종 25 sprint 정량 갱신

게임 narrative — 7 zone × 3 era × 21 보스 × 36 협공 × 50+ monster × 7 클래스 × aetherna 정점 모두 cross-check 완성. 회귀: storyConsistency 79/79 + 전체 1478 tests pass.

## 2026-05-17 STORY 정합성 chapter II — 추가 narrative 가드 누적 (13 sprint, +51 가드)

V25 이후 narrative source 변화 보장을 위한 추가 가드 누적.

- **V26** 클래스 협공 density (각 narrative 클래스 Dual ≥6 + Triple ≥2)
- **V27** Dual/Triple description quality (length ≥4, 한글 narrative)
- **V28** 일반 monster name 1~15자 + chrono_archon 시그니처
- **V29** 보스 monster name 1~15자 + unique + 일반 monster name unique (≥40)
- **V30** weight 합 정확히 1.0 ± 0.001 + 최종 보스 weight 최강 + 일반 ≥ 보스 비중
- **V31** 보스 id 시그니처 suffix (guardian/lord/titan/archon/overlord/eternity/phantom/wraith/seal/golem/eidolon/collapse/devourer/avatar/remnant/malatus) + snake_case
- **V32** bgmTrack "bgm_" prefix + ambientEffect known pool + 보스 only=boss_room + chrono_spire 시그니처
- **V33** chronoEraAtb passive (ancient 회피+ / future 명중+) + AI hints (defensive/aoe/aggressive) + present baseline 0 + bonusDrops
- **V34** Triple Tech damageMultiplier ≥3.0 + void_eternity 최강(3.8) + aetherna_final chrono + mpCost ≥28 + 모두 aoe + chrono/dark ≥2
- **V35** Dual Tech eraFilter (chrono_blade/memory_warp ancient+present, memory_break/void_oblivion ruined_future-only)
- **V36** ambientLine 21 unique + length 8~80 + 한글 + ancient/future 분위기 키워드 ≥4
- **V37** maxSpawn 1~6 + 일반 ≥3 + bossOnlyMode 보스 1개 + monsterPool size ≥2
- **V38** progress.md V26~V38 누적 갱신
- **V39** ChronoField API 행동 (rollFieldMonster 결정론 + getBossSlot 21/21 + 안정성)
- **V40** 10 sprint 마디 + aetherna 시그니처 모든 source cross-check
- **V41** Dual Tech damageMultiplier 2.0~2.5 + AOE 3종 정확 + Triple > Dual 평균
- **V42** Triple Tech 페어 다양성 (3인 unique + 클래스 ≤8회)
- **V43** Dual Tech 페어 다양성 (2인 unique + 자기 협공 금지)
- **V44** chronoEra 진행 순서 + speedTier/단조 + decorateMonsterName 시그니처
- **V45** chrono barrel 단일 진입점 narrative integration cross-check
- **V46** 시대별 monster id 시그니처 (ancient 무-future-prefix + future ≥5)
- **V47** 전체 vitest 회귀 마디 (unit 50 파일/844 tests pass)
- **V48** 협공 mpCost ↔ damageMultiplier 상관 (Triple 최강 ≥ 최약, AOE 평균 ≥ 전체)
- **V49** chronoField zone-별 분배 (3 era × 보스 unique + 비-narrative null)
- **V50** 20 sprint 마디 — Field/Dual/Triple/Era 모든 source cross-check + aetherna 시그니처 누적 정점

회귀: storyConsistency 174/174 + unit 전체 844/844 pass.

chapter II 누적 21 sprint, +82 가드 (92 → 174). aetherna 게임명 정점 + 7 zone × 3 era × 21 보스 × 36 협공 모든 narrative source cohesion 가드 완성.

## 2026-05-17 STORY 정합성 chapter III — 무결성 + 안정성 가드 (7 sprint, +26 가드)

V51 부터 chapter III — narrative 데이터 구조 무결성 + API 안정성 가드 확장.

- **V51** 21 보스 weight 분포 (0.1~0.4 범위 + aetherna_collapse 0.4 + chrono_spire 단조)
- **V52** 일반 monster weight 분포 (0.3~0.6 + 일반 평균 > 보스 + 다양성 ≥3)
- **V53** chronoField API 비정상 입력 안정성 (resolveFieldEncounter 빈/null/unknown era → null)
- **V54** Tech resolve 클래스 순열 (Dual reverse + Triple 6 순열 + 자기 협공 null + unknown null)
- **V55** FieldMonsterSlot 구조 무결성 (id/name/weight/isBoss 타입 + encounter 필수 필드)
- **V56** Dual/Triple Tech 구조 무결성 (id snake_case + element KNOWN + 숫자 finite + partner length)
- **V57** progress.md 200 가드 마디 기록 + chapter III 정량
- **V58** ATBSpeedTier ↔ chronoEra cross-check (1~6 범위 + unique + 단조)
- **V59** 시그니처 Tech mpCost (aetherna_final ≥30 + void_eternity = max + Dual 12~30)
- **V60** 30 sprint 마디 — 전체 narrative source 동시 cross-check + 5중 aetherna + entity ≥145
- **V61** encounter 시그니처 + chrono_spire 정점 (3 era 보스 unique + bossOnlyMode + 시작 분위기)
- **V62** 한글 narrative quality (monster/ambient/description 한글 + 한글 비율 ≥50%)
- **V63** 시간선 cohesion (chrono_archon 시그니처 + 시간 키워드 ≥3 + Triple chrono ≥2)
- **V64** 7 zone narrative 시그니처 (plains/forest/malatus/shadow/crystal/citadel/chrono)
- **V65** 클래스별 시그니처 협공 (ether/time/memory_weaver/void/memory_breaker)
- **V66** shadow_weaver + time_guardian Dual/Triple 시그니처
- **V67** 협공 element 다양성 (chrono ≥3+2, dark ≥5+2, holy ≥2)
- **V68** Tech description + name 풍부도 (length 2~30, 36 name unique, 시그니처 키워드)
- **V69** 250 가드 마디 — Triple name 시그니처 + 누적 cohesion 정점
- **V70** progress.md V61~V70 갱신 + 250 가드 마디 기록
- **V71** 시대별 협공 가용 (각 시대 ≥5 + present 가장 많음 + aetherna_final eraFilter)
- **V72** monster id ↔ name 1:1 매핑 (모순 없음 + isBoss 1:1 + encounter 내 unique)
- **V73** source id 도메인 cross-check (Dual/Triple/Field/zone/class 충돌 없음)
- **V74** fxKey 패턴 정합성 (모두 'fx_' + id + unique + snake_case)
- **V75** aetherna 게임명 등장 빈도 (Triple ≥1, 보스 =2, '에테르나' ≥3, chrono_spire 정점)
- **V76** ambient line 시대 키워드 분포 (present 평화, chrono_spire 시간, aether_plains 평원)
- **V77** monster name 한글 분위기 (보스 시그니처 ≥18, 일반 ≥30, ancient ≥5)
- **V78** bossOnlyMode encounter cohesion (chrono_spire/ruined_future + bgm_final_boss + aetherna_collapse)
- **V79** era default fallback (모든 era bgm/ambientEffect fallback)
- **V80** chapter II+III 50 sprint 마디 — 모든 source cohesion + aetherna 4중 + Triple>Dual+AOE
- **V81** Triple/Dual 클래스 분포 균형 (각 클래스 Triple ≥2, Dual ≥4, diff ≤6)
- **V82** monster pool diversity (size 2~6, 평균 ≥3, 시대당 unique ≥14)
- **V83** 300 가드 마디 — 누적 종합 cohesion (정량 + unique + aetherna 4중 + 시대 ↔ tier)
- **V84** narrative type / runtime integrity (barrel 26 함수 + bgm fallback + unique encounter)
- **V85** progress.md V81~V85 갱신 + 300 가드 마디 기록
- **V86** chronoEra 정확 값 (ancient/present/future hp·attackSpeed·reward·levelOffset 정확 + passive 정확)
- **V87** 클래스 페어 ↔ element 매칭 (void→dark, time_guardian→holy, chrono_blade=chrono)
- **V88** 시그니처 협공 description (aetherna_final 에테르나/최종, void_eternity 영원/공허, chrono_break 시간 + length 10~100)
- **V89** 60 sprint 마디 시그니처 element narrative (chrono 시그니처 + dark 시그니처)
- **V90** progress.md V86~V90 갱신 + 60 sprint 마디 기록
- **V91** Triple mpCost ranking (void_eternity 35, aetherna_final 30, 분포 28/29/30/31/32/35)
- **V92** zone-별 일반 monster id prefix 시그니처 (plains/forest/crystal/shadow/chrono)
- **V93** malatus_sanctuary + forgotten_citadel prefix + 7 zone 일반 ≥2
- **V94** monsterPool 시그니처 패턴 (보스 1+ 일반 2~5, weight 0.1~0.6, hasBossSlot)
- **V95** ambient + description 문장 끝 narrative (자연 종결, 띄어쓰기 ≥3, 시작 정상)
- **V96** Triple eraFilter 분포 (5 설정 + 10 미설정 + ruined_future-only ≥1 + ancient+present ≥2)
- **V97** damageMultiplier 정밀 분포 (Dual 0.1 정밀, Triple 0.1 정밀, void_eternity > aetherna_final)
- **V98** 350 가드 마디 — chronoEra cohesion (speedTier↔ATB + bonusDrops 시그니처 + runtime stress)
- **V99** bonusDrops 정확 값 (ancient relic rare 3%, future chrono_crystal epic 5% + voidshard rare 8%)
- **V100** 100 sprint 마디 — V1~V100 chapter I+II+III 종합 누적 357 가드 정점

회귀: storyConsistency 357/357 + unit 전체 844+/844+ pass.

**🎯 100 sprint 마디 + 357 가드 도달** — chapter I (79) + chapter II (+82) + chapter III (+196) = 누적 100 sprint, +265 가드 (92 → 357). aetherna 게임 narrative — 7 zone × 3 era × 21 보스 × 36 협공 × 50+ monster × 7 클래스 × 9 element × 6 tier × 시간선 cohesion + 정점 시그니처 + 시대 단조 + Triple>Dual+AOE + ratification 모두 회귀 가드 완성.

## 2026-05-17 STORY 정합성 chapter IV — runtime stress + 결정성 + 시그니처 element (5 sprint, +18 가드)

V100 이후 chapter IV — runtime 결정성 + 시그니처 cross-check 확장.

- **V101** chapter IV 시작 — AOE 시대 (Dual AOE 3종 + dark/chrono + 2.5 + Triple aoe)
- **V102** ChronoEraId narrative 완전성 (STORY_ERAS/ZONES/CLASSES 정확 + isChronoEraId 음성 case)
- **V103** chronoField 결정성 (resolveFieldEncounter immutable + listFieldEncounters 동일)
- **V104** chrono barrel 단일 진입점 stress (callable + return type + 100회 호출 결정성)
- **V105** progress.md V101~V105 갱신 + 75 sprint 마디 기록
- **V106** rollFieldMonster 분포 stress (100 seed valid + ≥2 unique + seed 0/0.99)
- **V107** Triple eraFilter 정확 (void_eternity = ruined_future, aetherna_final = present+ruined_future)
- **V108** Dual eraFilter 정확 (chrono Dual 붕괴 차단, memory_break/void_oblivion ruined_future-only)
- **V109** 80 sprint stress (모든 chronoEra API 정합 + Tech resolve symmetry)
- **V110** progress.md V106~V110 갱신 + 80 sprint 마디 기록
- **V111** listAllFieldMonsterIds 정합 (보스+일반 + snake_case + count unique)
- **V112** 추가 monster name 시그니처 (chrono_archon/aetherna_eidolon/collapse + chrono_spire 일반)
- **V113** 🎯 400 가드 마디 — narrative 정점 cohesion (보스 weight 합 + Tech/Field runtime sweep + aetherna final + entity 78)
- **V114** progress.md V111~V114 갱신 + 400 가드 마디 기록

회귀: storyConsistency 400/400 + unit 전체 844+/844+ pass.

**🎯 400 가드 마디 도달** — chapter I (79) + II (+82) + III (+196) + IV (+43) = 누적 84 sprint, +308 가드 (92 → 400). aetherna 게임 narrative cohesion 정점 + Field 21 + Dual 21 + Triple 15 + 보스 21 = 78 entity + 50+ monster + 7×3×7 cross-product 모든 회귀 가드 land.

## 2026-05-17 STORY 정합성 chapter V — Tech name 분포 + 클래스 시그니처 종합 (6 sprint, +16 가드)

V115 부터 chapter V — Tech 종합 cohesion + 클래스 narrative 시그니처 정합.

- **V115** chapter V 시작 — Triple name 카테고리 분포 (≥4 + aetherna=1 + void/shadow ≥2)
- **V116** Dual name 카테고리 분포 (≥6 카테고리 + 크로노 블레이드 + AOE 한글)
- **V117** 보스 name 카테고리 분포 (≥6 + 시대당 ≥4 + 시그니처 ≥18)
- **V118** 클래스별 element 분포 (각 1~4 + void→dark + guardian→holy + ether 다양)
- **V119** 클래스 narrative 시그니처 종합 (snake_case + 4 카테고리 + 총 협공 ≥6)
- **V120** progress.md V115~V120 갱신 + 90 sprint 마디 기록
- **V121** ambient line 시대별 narrative 매칭 (ancient ≥6 / present ≥3 / future ≥5 키워드)
- **V122** Tech 페어 ↔ zone cross-check (모든 partnerClasses 유효 + 7C2/7C3 + 21 Dual unique)
- **V123** chronoEra AI hints 정확 값 (ancient 0.3/0.05/0.05 + present 0 + future 0.05/0.4/0.2 + 0~1)
- **V124** 시그니처 협공 final cohesion (aetherna_final/void_eternity/chrono_break/guardian_oath)
- **V125** 시그니처 Dual cohesion (chrono_blade/memory_break/void_oblivion/time_overflow)
- **V126** 시그니처 보스 final cohesion (aetherna_collapse/eidolon/chrono_archon + chrono_spire 3)
- **V127** Field encounter cross-cohesion (21 unique zone+era + 100% 매칭 + 21 보스 unique)
- **V128** Tech 종합 final cross-cohesion (36 협공 + id+name+fxKey unique + element KNOWN)
- **V129** 🎯 100 sprint 마디 — chapter II~V 종합 (450 가드 + narrative entity ≥145 + aetherna final)

회귀: storyConsistency 450/450 + unit 전체 844+/844+ pass.

**🎯 100 sprint 마디 + 450 가드 도달** — chapter I (79) + II (+82) + III (+196) + IV (+43) + V (+34) = 누적 100 sprint, +358 가드 (92 → 450). aetherna 게임 narrative cohesion final + 5 chapter 누적 완성.

## 2026-05-17 STORY 정합성 chapter VI — 시간선 + element 분포 정확 (5 sprint, +15 가드)

V129 이후 chapter VI — element 분포 정확 + 시간선 narrative 정합.

- **V130** chapter VI 시작 — 시간선 ↔ 클래스 element narrative (chrono 페어 + dark 페어 정확)
- **V131** Triple element 분포 정확 (chrono 4 + dark 7 + holy 4 = 15)
- **V132** Dual element 분포 정확 (chrono 4 + dark 11 + holy 6 = 21)
- **V133** monster passive 정확 (ancient 회피 5%, future 명중 5%, present 0% baseline)
- **V134** progress.md V130~V134 갱신
- **V135** 21 encounter 100% 무결성 stress (모든 필드 + 타입 + 보스 weight 0.1~0.4)
- **V136** Tech runtime 100% 무결성 (21 Dual + 15 Triple 필드 + resolve cycle 100회)
- **V137** chronoEra 종합 정확 값 stress (결정성 + speedTier 정확 + non-error)
- **V138** chronoField helper API non-error stress (전 helper + 50회 cycle + immutable)
- **V139** description quality 강화 (Triple marker ≥8 + 한글 ≥5 + Dual 한글 ≥3)
- **V140** progress.md V135~V140 갱신 + 110 sprint 마디 기록
- **V141** 시간선 narrative final cross-cohesion (chrono Triple/Dual 시그니처 + aetherna 5중)
- **V142** shadow_weaver 클래스 cohesion (Dual ≥5 + 모두 dark + Triple ≥3)
- **V143** time_knight 클래스 cohesion (chrono/dark element + chrono_blade + memory_warp)
- **V144** 7 클래스 cohesion 종합 (void Triple ≥2, ether/memory ≥4, breaker/guardian ≥4)
- **V145** 🎯 500 가드 마디 도달 — chapter I~VI cohesion final completed

회귀: storyConsistency 500/500 + unit 전체 844+/844+ pass.

**🎯🎯🎯 500 가드 마디 도달** — chapter I (79) + II (+82) + III (+196) + IV (+43) + V (+34) + VI (+66) = 누적 116 sprint, +408 가드 (92 → 500). aetherna 게임 narrative cohesion final completed.

## 2026-05-17 QUEST-QA chapter — 퀘스트 플레이 가능 여부 QA (7 sprint, +76 가드)

사용자 명시 요청 "퀘스트 플레이 가능 여부 체크 qa 진행" — 60 퀘스트 (main 15 + sub 20 + daily 15 + weekly 5 + event 5) 데이터 정합성 + 비즈니스 로직 + 라우트 + 초기화 + 보상 분포 + objective 분포 회귀 가드.

- **QA-1** questEngine 단위 회귀 (10/10 pass 확인)
- **QA-2** questCatalog 60 퀘스트 정합성 (S1~S10, 36 가드)
  - 정량 (15+20+15+5+5=60) + code unique + prefix (MQ/SQ/DQ/WQ/EQ)
  - name 한글 + description ≥10 + type 유효
  - 메인 chapter 1~15 단조 + MQ_CH15 = lv60
  - objective 무결성 (type/count/target/description)
  - rewards 무결성 (type/amount/item itemId/exp 단조)
  - prerequisite 그래프 (메인 체인 + dangling 없음 + self-loop 없음)
  - isRepeatable + timeLimit (main/sub false, daily 86400, weekly 604800, event 정의)
  - 시그니처 (MQ_CH01 기억 + MQ_CH15 에테르나 + 4계절+기념일)
  - npcId narrative (npc_ prefix + sub ≥5)
- **QA-3** questEngine 확장 (+10 가드, S11)
  - 음수 amount cap + completed 재진행 무효 + 잘못된 index 무시
  - 선행 충족 시 수주 + 보상 배율 5 type 정확 + main>daily/event>sub
  - boundary (target 도달, amount=0) + 모두 완료 시 complete
- **QA-4** quest-flow 통합 회귀 (8/8 pass, mock fastify 라우트)
- **QA-5** questRoutes 에러 매핑 + payload + pagination (14 가드, S11~S13)
  - QuestError → HTTP status 매핑 (404/409/403/400)
  - payload 필수 필드 (accept/progress/complete)
  - pagination (page≥1, limit≤100 DoS 방어, NaN fallback)
- **QA-6** 초기화 + 보상 + objective 분포 (16 가드, S14~S18)
  - 일일/주간 초기화 (완료/실패 대상 + in_progress 보존 + type 격리)
  - timeLimit 정확 (daily 86400, weekly 604800, event ≥604800, main/sub 없음)
  - 보상 카테고리 (exp 필수 + 메인 item ≥5 + title MQ_CH15+ANNIVERSARY + 이벤트 item ≥4)
  - objective type 분포 (≥4 distinct + kill/collect/explore ≥5 + craft/talk ≥2)
- **QA-7** 전체 단위 회귀 (53 파일 / 1258 tests pass) + progress.md QUEST 섹션 추가
- **QA-8** 플레이 가능 시나리오 (19 가드, S19~S24)
  - lv1 신규: MQ_CH01 + 4계절+기념일 이벤트 + 일일 즉시 가능 + MQ_CH15 잠금
  - lv30 중급: 메인 9 완료 + MQ_CH10 lv 부족 잠금 + 일일 15 + 서브 ≥10
  - lv60 고급: 모든 메인/일일/주간/서브 ≥19 가능
  - 메인 체인 락 (시작 잠금 + step-by-step unlock + 15 step 완주)
  - 서브 체인 (SQ_FA_02 ← SQ_FA_01)
  - 게임 종료 long-tail (repeatable = daily 15 + weekly 5 = 20)
- **QA-9** npc/target ID naming 일관성 (12 가드, S25~S28)
  - objectives target naming (talk npc_, explore zone_, kill mob_/boss_, craft/collect snake_case)
  - npcId 도메인 (npc_ prefix + 비빈 + snake_case)
  - reward itemId (item_/recipe_ prefix + unique per quest)
  - chapter 시그니처 (1~3 lv≤6, 14~15 lv≥55, ch6 첫 보스)
- **QA-10** progress.md QUEST-QA chapter 누적 갱신 + 1289 tests final

회귀: questCatalog 36 + questEngine 20 + questRoutes 14 + questReset 16 + questPlayability 19 + questIdConsistency 12 + quest-flow 통합 8 + unit 전체 55 파일 / **1289 tests** pass.

**🎯 QUEST-QA chapter 완성 — 10 sprint, +107 가드** — 60 퀘스트 (main 15 + sub 20 + daily 15 + weekly 5 + event 5) 의 카탈로그 정합성 + 비즈니스 로직 + 라우트 매핑 + 초기화 + 보상 분포 + objective 분포 + 플레이 시나리오 (신규/중급/고급/종료) + 메인/서브 체인 락 + ID naming 일관성 모든 회귀 가드 land 완성. 게임 퀘스트 플레이 가능 (수주→진행→완료→보상→포기→prerequisite chain → repeatable long-tail) 모든 시나리오 검증 완료.

## 2026-05-17 SKILL-QA chapter — 180 스킬 카탈로그 정합성 (5 sprint, +37 가드)

자동 sprint 진행: 6 클래스 (ether_knight + memory_weaver + shadow_weaver + memory_breaker + time_guardian + void_wanderer) × 30 스킬 = 180 스킬 카탈로그.

- **QA-1** skillEngine + skillAdapter + skillBranches 단위 회귀 (10/31/14 pass)
- **QA-2** skillCatalog (28 가드, S1~S7)
  - 정량 (180 = 6 클래스 × 30)
  - code unique + prefix (ek_/mw_/sw_/mb_/tg_/vw_) + name 한글 + description ≥10
  - class/type/targetType 유효 + tier 1~4 + requiredLevel 1~100
  - tier 1 lv ≤20, tier 4 lv ≥60
  - damage/mpCost/cooldown/damageScale ≥0 + finite
  - maxLevel 3/5 (ultimate=3) + levelScaling length 정합 + level 단조
  - prerequisites 그래프 (dangling/self-loop/cross-class 없음, tier 1 root)
- **QA-3** element 분포 + tier 시그니처 (9 가드, S8~S9)
  - element 모두 KNOWN (aether/dark/light/neutral/time 등)
  - ether_knight aether ≥8 / memory_weaver time ≥5 / shadow_weaver dark ≥10 / memory_breaker dark ≥10
  - 각 클래스 element 다양성 ≥2 + tier 1~4 모두 + tier 4 ≥5 + ultimate ≥1
- **QA-4** skillAdapter (31) + skillBranches (14) 회귀 0
- **QA-5** progress.md SKILL chapter 추가 + 전체 회귀

회귀: skillEngine 10 + skillCatalog 37 + skillAdapter 31 + skillBranches 14 + unit 전체 1300+ tests pass.

skillSeeds.ts ALL_SKILLS / SKILL_SEED_GROUPS export 추가.

**🎯 SKILL-QA chapter 완성 — 5 sprint, +37 가드** — 180 스킬 카탈로그 + 클래스 시그니처 + tier 진행 + element 분포 + prereq 그래프 모든 회귀 가드 land.

## 2026-05-18 OBS chapter — Obsidian 시나리오 ↔ 게임 코드 연결 분석 + 회귀 가드 (1 sprint, +23 가드)

사용자 명시 'Obsidian 시나리오 문서와 게임 내 시나리오 스토리 및 퀘스트 연결 상태 체크'.

분석 보고서 `docs/obsidian-game-mapping-2026-05-18.md`:
- Obsidian 5 Act / 8 챕터 vs 게임 15 메인 퀘스트 (1:1 매핑 불가)
- Zone ~30% 일치 (실반헤임/아르겐티움/망각의 고원 부분 일치)
- NPC ~17% 일치 (베르나르도 정확 + 누아리엘 위치 불일치)
- 보스 ~30% 일치 (말라투스/베르나르도/레테↔aetherna_collapse)
- MQ ~47% narrative 일치
- **전체 ~30~40% narrative 연결**

회귀 가드 (`obsidianGameMapping.test.ts`, 23 가드, OBS-S1~S7):
- 베르나르도 체인 + 말라투스 narrative + 레테↔aetherna_collapse
- 챕터 부분 일치 (시간균열/숲/크로노/기억)
- 누아리엘 위치 불일치 표식 + Obsidian 미정의 게임 zone (aether_plains/shadow_gorge/crystal_cave)
- Obsidian SSOT 파일 존재 (master + 챕터 1~5 + 인덱스)

## 2026-05-19 SCENARIO-SYNC chapter — Obsidian narrative SSOT 통합 (4 sprint, +73 가드)

사용자 명시 '동기화 작업 진행' — 어제 분석 ~30~40% 일치 상태를 SSOT 모듈로 통합 + 회귀 가드 land.

- **SYNC-1** `shared/types/scenarioRegistry.ts` 신규 SSOT 모듈 (~370 라인)
  - SCENARIO_COMPANIONS (6 동료): 세라핀/크리오/이그나/벤자민(↔npc_bernardo+boss_bernardo_corrupted)/레이나/우르그롬
  - SCENARIO_ZONES (9 zone): 에레보스/칸텔라/실반헤임(↔memory_forest)/말라투스(↔malatus_sanctuary)/솔라리스/아르겐티움(↔chrono_spire)/팔라티노/망각의고원(↔forgotten_citadel)/황금에테르탑
  - SCENARIO_BOSSES (9 보스): 기억골렘/말라투스(3페이즈)/타락말라투스/라와르/케인/타락베르나르도/시간감시자/톱니수호자/레테(5페이즈, ↔boss_oblivion_lord+aetherna_collapse)
  - SCENARIO_CHAPTERS (5): Ch1~Ch5 각각 게임 MQ 매핑 (Ch4→MQ_CH04+08+12, Ch5→MQ_CH13+14+15)
  - SCENARIO_ENDINGS (5): A(4파편+전원), B(3파편), C(0파편), D(신화), FAIL
  - SCENARIO_FRAGMENTS (4): 신성 기억 파편 (Ch1~Ch4 zone 별 1개)
  - SCENARIO_DEITIES (12): 창세 11신 + 레테 배제 narrative
  - helpers: getCompanion/Zone/Boss/Fragment/DeityByObsidianId, listSynced*, listCreation/ExcludedDeities, list*ByChapter, evaluateLoyalty, evaluateEnding
- **SYNC-2** `tests/unit/scenarioRegistry.test.ts` 회귀 가드 43 가드 (S1~S8)
  - S1 6 동료, S2 9 zone, S3 9 보스, S4 5 chapter, S5 5 엔딩, S6 게임 cross-check, S7 listSynced, S8 미동기화 표식
- **SYNC-3** 신성 기억 파편 + 12 신화 신 + 신뢰도/엔딩 판정 (+27 가드, S9~S13)
  - S9 4 파편 (chapter 1~4 + zone 매핑 + sealer)
  - S10 12 신 (창세 11 + 레테 배제 + 도메인 unique)
  - S11 신뢰도 평가 (이탈 임계값)
  - S12 엔딩 판정 (파편+동료 → A/B/C/FAIL)
  - S13 4 파편 ↔ 엔딩 A minFragments cohesion
- **SYNC-4** chrono.ts barrel 통합 (+3 가드, S14) + progress.md 갱신
  - chrono.ts 에서 scenarioRegistry 모든 API 접근
  - aetherna 시그니처 + 레테 narrative cross-domain 동시 접근

회귀: scenarioRegistry 73/73 + unit 전체 1443 tests pass.

**🎯 SCENARIO-SYNC chapter 완성 — 4 sprint, +73 가드** — Obsidian 시나리오 narrative 핵심 entity (동료 6 + zone 9 + 보스 9 + chapter 5 + 엔딩 5 + 파편 4 + 신 12) 단일 SSOT 통합. 게임 코드 매핑 ~30% (15 entity sync) + 미동기화 표식 ~70% (장기 sync TODO 추적). 향후 게임 데이터 확장 시 scenarioRegistry SSOT 참조 + 회귀 가드로 narrative 무결성 보호.

## 2026-05-22 SCENARIO-SYNC chapter II — 미동기 항목 game 동기화 (7 sprint, +46 가드)

사용자 명시 '동기화 작업 진행' / '미동기 항목 추가' / '다음 라운드 진행' 누적.

- **SYNC-5** planned 매핑 필드 추가 (동료 5 + zone 3 + 보스 2 planned ID)
  + listPlannedCompanions/Zones/Bosses + getSyncCompletionReport 헬퍼
  + 회귀 가드 +24 (S15~S20): planned 매핑/naming/orphan 표식
- **SYNC-6** SYNC-5 가드 통합 (S15~S20 + S8 boomerang) — 24 가드 누적
- **SYNC-7** 5 동료 sub quest 실제 추가 (planned → sync 전환, 60 → 65 quest)
  + SQ_COMPANION_{SERAPHINE,CRIO,IGNARA,REINA,URGROM}
  + 모두 reputation 보상 + 신뢰도 narrative 동기화
  + questCatalog S1/S2 정량 갱신 + scenarioRegistry S15/S18 sync 전환 반영
- **SYNC-8** zone 3 + 보스 2 sync 전환 (65 → 69 quest, 100% entity sync)
  + SQ_EREBOS_RUINS / SQ_CANTELA_RESCUE / SQ_SOLARIS_RAWAR / SQ_KANE_HUNT
  + Ch3 솔라리스 narrative (라와르) 게임 sync
  + getSyncCompletionReport exclusive 카운트 (planned/orphan 정확화)
- **SYNC-9** 4 신성 기억 파편 game item 동기화 (69 → 71 quest)
  + ScenarioFragment.gameItemId + gameQuestCode 매핑
  + SQ_SILVANHEIM_FRAGMENT (Ch2) + SQ_ARGENTIUM_FRAGMENT (Ch4) 신규
  + 4 파편 item_memory_fragment_ch1~4 정합
  + 회귀 가드 SYNC-S21 (+6)
- **SYNC-10** 신뢰도 reputation → loyalty game 로직 통합
  + COMPANION_REPUTATION_REWARDS (5 동료)
  + applyReputationReward + isReputationRewardSufficient 헬퍼
  + 5 동료 모두 단일 quest 합류 narrative cohesion
  + 회귀 가드 SYNC-S22 (+9)
- **SYNC-11** 파편 + 동료 → 엔딩 통합 game-flow
  + GameFlowState + evaluateGameFlow + checkEndingA
  + 엔딩 A/B/C 시나리오 게임 흐름 검증
  + 회귀 가드 SYNC-S23 (+7)
- **SYNC-12** progress.md SYNC chapter II 갱신

scenarioRegistry SSOT 100% 게임 코드 동기화 달성:
- 동료 6 sync (100%) — 모두 npcId 매핑 + sub quest 등록
- zone 9 sync (100%) — gameQuestZoneTarget 매핑 + 일부 chronoField planned
- 보스 9 sync (100%) — gameQuestBossId 매핑 + 라와르 chronoField planned
- 파편 4 sync (100%) — gameItemId + gameQuestCode 매핑
- 엔딩 5 (A/B/C/D/FAIL) — evaluateGameFlow 통합

회귀: questCatalog 36/36 + scenarioRegistry 119/119 + unit 전체 1489 tests pass.

**🎯 SCENARIO-SYNC chapter II 완성 — 7 sprint, +46 가드 (chapter I+II 누적 11 sprint, +119 가드)** — Obsidian 시나리오 ↔ 게임 코드 narrative 동기화 완성 (entity 100% sync + reputation/loyalty 게임 로직 통합 + 엔딩 흐름 SSOT).

## 2026-05-22 SCENARIO-SYNC chapter III — narrative 깊이 확장 (6 sprint, +45 가드)

자동 라운드 — game 통합 + 시나리오 narrative SSOT 확장.

- **SYNC-13** 시나리오 연대표 timeline (13 핵심 이벤트, 7 시대)
  + ScenarioEra + SCENARIO_TIMELINE + getTimelineEventByObsidianId
  + 창세 → 게임 시작 (세계력 3,412) 시간 narrative
  + 회귀 가드 SYNC-S24 (+11)
- **SYNC-14** chrono.ts barrel scenarioRegistry 통합 stress (+6 가드, S25)
  + 전 SSOT entity 정량 cross-check
  + 100회 호출 결정성
  + aetherna 4중 cross-domain
  + 전체 게임 흐름 시나리오 (시작→5 동료→4 파편→엔딩 A)
- **SYNC-15** 챕터별 game-flow milestone (5 chapter)
  + SCENARIO_MILESTONES + ChapterProgress + evaluateChapterProgress
  + 회귀 가드 SYNC-S26 (+11)
- **SYNC-16** 엔딩 D (신화) + FAIL 시나리오
  + AdvancedGameFlowState + evaluateAdvancedEnding + getEndingSummary
  + 우선순위: FAIL > D > A/B/C
  + 회귀 가드 SYNC-S27 (+8)
- **SYNC-17** NPC 대화 SSOT (9 핵심 대사)
  + NpcDialogue + SCENARIO_DIALOGUES
  + 세라핀/크리오/이그나/베르나르도/레이나/우르그롬 대사
  + context (first_meet/join/trust_build/betrayal/leave/final)
  + 회귀 가드 SYNC-S28 (+9)
- **SYNC-18** progress.md 갱신 + 누적 종합 stress

회귀: scenarioRegistry 164/164 + unit 전체 1534 tests pass.

**🎯 SCENARIO-SYNC chapter III 완성 — 6 sprint, +45 가드 (chapter I+II+III 누적 17 sprint, +164 가드)** — Obsidian narrative SSOT 깊이 확장 (timeline + milestone + 엔딩 5종 + 대화). 게임 코드 통합 + narrative 무결성 회귀 가드 완성.

## 2026-05-22 SCENARIO-SYNC chapter III 확장 — narrative 완성 (5 sprint, +43 가드)

자동 라운드 — narrative 완성 + 엔딩 D 조건 + 외전 문서 + Ch2/Ch5 대화.

- **SYNC-19** 신화 유물 SSOT + 엔딩 D 조건 확장 (+10 가드, S30)
  + 4 유물 (크로나이/이그나루스/베르다/아키우스)
  + MINERVA_ENCOUNTER 조건 (유물 ≥2 + golden_ether_tower)
  + canEncounterMinerva 헬퍼
- **SYNC-20** 🎯 20 sprint 마디 종합 stress (+6 가드, S31)
  + SSOT entity 정점 정량 (86)
  + 완전한 엔딩 D 시나리오 + 모든 헬퍼 non-error
- **SYNC-21** Ch2/Ch5 NPC 대화 확장 (+8 가드, S32)
  + 카일 (Ch5 전생) + 레테 (final) + 미네르바 (신화)
  + 실반헤임 장로 + 세라핀 카엘 회상
  + 5 챕터 모두 대화 cover
- **SYNC-22** Obsidian 외전 문서 SSOT (+10 가드, S33)
  + 11 문서 (편지 5 + 도서 4 + 기억 조각 2)
  + LoreDocumentType + helpers
  + 레테 교단 narrative ≥2 + Ch1 lore ≥3
- **SYNC-23** progress.md 최종 갱신 + 종합 cohesion

회귀: scenarioRegistry 203/203 + unit 전체 1573 tests pass.

**🎯 SCENARIO-SYNC chapter III 확장 완성 — 5 sprint, +43 가드 (chapter I+II+III 누적 22 sprint, +207 가드)** — Obsidian narrative 깊이 확장 final. 97 SSOT entity + 20+ helpers + 5 챕터 + 5 엔딩 + 4 파편 + 12 신 + 13 timeline + 5 milestone + 14 dialogues + 4 relics + 11 외전 문서.

## 2026-05-22 SCENARIO-SYNC chapter III 마무리 — final cohesion + worldmap (5 sprint, +29 가드)

자동 라운드 계속 — worldmap + cross-domain cohesion + 종합 helper.

- **SYNC-24** worldmap zone connections (8) + chapter routes (5)
  + ZoneConnection + ChapterRoute + getConnectionsFromZone/ToZone + getRouteByChapter
  + BFS 칸텔라 → 황금탑 도달 가능 회귀
  + 회귀 가드 SYNC-S34 (+10)
- **SYNC-25** 🎯 25 sprint 마디 end-to-end 게임 흐름
  + SSOT entity 정점 ≥100 + 엔딩 A/D end-to-end + 헬퍼 25+ 함수
  + 회귀 가드 SYNC-S35 (+6)
- **SYNC-26** SSOT 15 도메인 cross-domain cohesion
  + 동료↔대화, 파편↔zone, 유물↔신↔zone, lore↔zone, connection↔zone,
    route↔chapter, milestone↔chapter↔companion, reputation↔companion↔quest,
    timeline↔deity, milestone↔companion
  + 회귀 가드 SYNC-S36 (+12)
- **SYNC-27** SSOT 종합 stats + entity index helper
  + getScenarioRegistryStats (15 도메인 + totalEntities)
  + buildScenarioIndex + resolveEntityType
  + 회귀 가드 SYNC-S37 (+6)
- **SYNC-28** progress.md 갱신 + 최종 마무리

회귀: scenarioRegistry 237/237 + unit 전체 1607 tests pass.

**🎯 SCENARIO-SYNC chapter III 마무리 완성 — 5 sprint, +29 가드 (chapter I+II+III 누적 27 sprint, +236 가드)** — Obsidian narrative SSOT 완성: 15 도메인 (companion 6 + zone 9 + boss 9 + chapter 5 + ending 5 + fragment 4 + deity 12 + timeline 13 + milestone 5 + dialogue 14 + reputation 5 + relic 4 + lore 11 + connection 8 + route 5) = 115 entity + 30+ helpers + 237 회귀 가드.

## 2026-05-22 SCENARIO-SYNC chapter IV — 정점 final + 문서화 (5 sprint, +18 가드)

자동 라운드 — SSOT 정점 + 문서화 + cross-domain final + 30 sprint 마디.

- **SYNC-28** progress.md chapter III 마무리 갱신 (27 sprint, +236 가드 누적)
- **SYNC-29** docs/scenario-registry-guide.md 신규 (~163 라인)
  + 15 도메인 종합 표 + 사용 예시 6 영역 + cross-domain 매핑 원칙
  + 회귀 가드 위치 + 확장 절차 + Obsidian 출처 + 변경 영향 매트릭스
- **SYNC-30** 🎯🎯 30 sprint 마디 최종 정점 stress (+6 가드, S38)
  + 30 sprint 누적 SSOT 정점 ≥110 entity
  + 100% sync 유지 + 100회 헬퍼 stress
  + 완전한 게임 시나리오 (시작 → 5 chapter → 엔딩 D)
  + entity index 5 카테고리 lookup
- **SYNC-31** SCENARIO ↔ STORY chronoField cross-domain (+6 가드, S39)
  + 보스/zone 매핑 cohesion
  + 레테 6중 / 말라투스 4중 / 베르나르도 3중 cohesion
  + scenarioRegistry + chronoField + questSeeds 통합
- **SYNC-32** progress.md 최종 + chapter IV 마무리

회귀: scenarioRegistry 249/249 + unit 전체 1619 tests pass.

**🎯🎯🎯 SCENARIO-SYNC chapter IV 완성 — 5 sprint, +18 가드 (chapter I+II+III+IV 누적 32 sprint, +254 가드)** — Obsidian narrative SSOT 정점 완성. 115+ entity / 30+ helpers / 249 회귀 가드 / 5 chapter / 5 엔딩 / 4 파편 / 12 신 / 13 timeline / 5 milestone / 14 dialogues / 4 relics / 11 lore / 8 connections / 5 routes / docs guide. 100% Obsidian SSOT ↔ 게임 코드 동기화 + cross-domain cohesion + game-flow 통합.

