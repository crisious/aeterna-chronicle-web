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
