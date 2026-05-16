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

## TODO (CHRONO-ATB chapter IV 후보)

- BattleScene UI 발동 버튼 / 단축키 'D' → combatDualTech 호출 (lastDualTechCandidates 사용)
- EffectManager 가 fxKey ('fx_chrono_blade' 등) 매핑 → 협공 시각 효과 재생
- 시대별 monster dropTable rare 슬롯 추가 (ruined_future 드롭률 +)
- ATBCommandInput protocol 의 dual_tech kind 분기 (현재 separate event)
- Dual Tech 콤보 효과 — 연속 발동 시 보너스 (FF6 chain)
- 라이브 Playwright 자동 QA: era 전환 → 전투 → Dual Tech 후보 표시 검증

