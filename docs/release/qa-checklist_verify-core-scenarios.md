# QA 체크리스트 — verify-core.mjs 시나리오 3종 실배선 v1.0

> **작성**: 적경홍 QA Lead (붉은 전의의 여장군 · 전장에서 단련된 치밀함)
> **단계**: Plan (설계) — Build 인계용 SSOT
> **상위 회고**: `docs/release/retro_dev-cycle-shortening-sprint.md` §A4 (P0 P1)
> **PRD**: 정경패 PM (본 스프린트)
> **연관 SSOT**: `docs/release/design-system_verify-core-scenarios.md` (가춘운) · `docs/release/security-checklist_verify-core-scenarios.md` (이소화)
> **약속**: 3 시나리오 PASS · exit code 0 · 단일 실행 ≤ 60초

---

## 1. 작전 개요 — 약속과 전선

**보고드립니다.** 본 토픽은 *대표 신규 콘텐츠 변경 → 자동 검증* 전선의 마지막 결손이옵니다. 회고 A4가 P0 P1로 명시한 *3 시나리오 실배선*을 60초 안에 끝내야, ship-gate 후속 측정 전제가 성립하옵니다.

| 약속 | 측정 키 | 게이트 | 비고 |
|---|---|---|---|
| 단일 실행 ≤ 60초 | `total.elapsed` (s) | ≤ 60.0 | 가춘운 분배: battle 25 / save 10 / map 20 / buffer 5 |
| 3 시나리오 PASS | `results[].ok` | 모두 true | unknown FAIL 0건 |
| Exit code 0 | `process.exit` | === 0 | BLOCK=1 / WARN=2 / ERROR=3 |
| 첫 실패 노출 | `path:line:reason` | stderr 1줄 | format-error 합주 |

**진을 굳혀야 합니다** — 60초 게이트가 무너지면 e2e로 부풀어 ship-gate 본진까지 잃사옵니다.

---

## 2. 현 전선 진단 (Pre-flight)

| 슬라이스 | 현재 매핑 (verify-core.mjs:27-30) | 문제 | 처방 (Build 인계) |
|---|---|---|---|
| **battle** | `tests/unit/combat` 디렉터리 + `integration/combat-flow.test.ts` | 디렉터리 매핑 모호 + 통합 슬라이스 무거움 | `tests/dev-cycle/battle.slice.test.ts` 신설 (단일 슬라이스) |
| **save** | `integration/ui-inventory-save-flow.test.ts` | UI 라운드까지 끌고 와 30s 초과 위험 | `tests/dev-cycle/save.slice.test.ts` 신설 (직렬화 라운드트립만) |
| **map** | `tests/e2e/chapter1.test.ts` | **e2e 진입 — 60초 게이트 즉시 붕괴** | `tests/dev-cycle/map.slice.test.ts` 신설 (Phaser scene 전환 헤드리스) |
| BUDGETS | `battle:90 / save:30 / map:60 / total:300` | 약속(60s)과 5배 어긋남 | `battle:25 / save:10 / map:20 / total:60` 재정좌 |

---

## 3. 시나리오별 테스트 케이스 — Build 인계 정본

### ⚔️ 3.1 Battle 시나리오 (≤ 25초)

**현황**: CombatManager + ATB 게이지 미배선, 첫 행동 PASS 미검증
**판정 기준**: Phaser/DOM 없이 노드 단독에서 실행 가능한 *얇은 슬라이스*

| TC# | 케이스 | 입력 | 기대 출력 | 우선순위 |
|---|---|---|---|---|
| **B-01** | CombatManager 인스턴스화 | `new CombatManager(party, enemies)` | 인스턴스 truthy · 초기 ATB === 0 | P0 |
| **B-02** | ATB 게이지 진행 1 tick | `manager.tick(dt=100ms)` × N | 가장 빠른 캐릭터 게이지 ≥ ATB_FULL | P0 |
| **B-03** | 첫 행동 트리거 | ATB 만충 후 `manager.takeAction()` | `actor`/`target`/`damage` 셋 모두 정의 · 데미지 ≥ 1 | P0 |
| **B-04** | 행동 후 게이지 리셋 | `B-03` 직후 | 행동자 ATB === 0 · 다른 캐릭터 게이지 보존 | P1 |
| **B-05** | 잘못된 입력 방어 | `tick(NaN)` / `tick(-1)` | throw or no-op (무한루프 금지) | P1 |

**환경**: Node 단독 · `vitest run --pool=threads` · DOM 의존 0
**시드**: 고정 RNG (`seed=42`) — 데미지 결정성 확보

### 💾 3.2 Save 시나리오 (≤ 10초)

**현황**: UI inventory까지 끌고 와 30s 초과 위험
**판정 기준**: 순수 직렬화 라운드트립 — UI 0 의존

| TC# | 케이스 | 입력 | 기대 출력 | 우선순위 |
|---|---|---|---|---|
| **S-01** | 초기 상태 직렬화 | `serialize(initialState)` | string · `JSON.parse(s)` 성공 | P0 |
| **S-02** | 라운드트립 동치 | `deserialize(serialize(state))` | `state` 와 `deepEqual` | P0 |
| **S-03** | 스키마 버전 보존 | 직렬화 결과 | `version` 키 존재 · semver 형식 | P0 |
| **S-04** | 파편/인벤토리 보존 | `state.fragments[3]` + `state.inventory[10]` 라운드트립 | 배열 길이 동일 · 각 ID 동일 | P1 |
| **S-05** | 손상 데이터 거부 | `deserialize('{"corrupt":true}')` | throw `SaveSchemaError` (silent fallback 금지) | P1 |
| **S-06** | 빈 상태 라운드트립 | `serialize({})` → deserialize | 동치 · 에러 없음 | P2 |

**환경**: Node 단독 · 파일 IO 0 (in-memory) · 타이머 0

### 🗺️ 3.3 Map 시나리오 (≤ 20초)

**현황**: e2e `chapter1.test.ts`로 60초 게이트 즉시 붕괴 위험
**판정 기준**: Phaser 헤드리스 (`HEADLESS=true`) — 단일 scene swap

| TC# | 케이스 | 입력 | 기대 출력 | 우선순위 |
|---|---|---|---|---|
| **M-01** | Scene 등록 | `game.scene.add('SceneA', ...)` | `scene.keys` 에 `SceneA` 존재 | P0 |
| **M-02** | Scene 시작 | `scene.start('SceneA')` | `SceneA.create()` 1회 호출 (spy) | P0 |
| **M-03** | Scene 전환 | `SceneA → SceneB` | `SceneB.create()` 호출 · `SceneA.shutdown()` 호출 | P0 |
| **M-04** | 새 scene init 완료 | M-03 후 | `SceneB.events.on('create')` 콜백 도달 | P0 |
| **M-05** | 전환 중 자원 정리 | M-03 직후 | `SceneA.children.length === 0` (텍스처 leak 0) | P1 |

**환경**: `phaser` 헤드리스 모드 + `jsdom` · canvas 모킹 (`canvas-mock`)
**주의**: 풀 게임 부팅 금지 — 최소 scene 2개만 등록

---

## 4. QA 체크리스트 (Build → Test → Ship 게이트)

### 4.1 Build 진입 전 체크 (계섬월·두련사 인계)

- [ ] `tests/dev-cycle/` 디렉터리 신설 (battle.slice.test.ts · save.slice.test.ts · map.slice.test.ts)
- [ ] `verify-core.mjs:25-30` `SCENARIO_TESTS` 매핑 갱신 — e2e 경로 제거
- [ ] `verify-core.mjs:18-23` `BUDGETS` 재정좌 — 25/10/20/60
- [ ] `verify-core.mjs:74` `shell: true` 제거 (이소화 Z1 봉인 — 명령 인젝션 차단)
- [ ] `tests/vitest.config.ts` 에 dev-cycle 슬라이스 별도 프로젝트 등록 (포함/제외 명시)
- [ ] vitest `--reporter=dot --no-coverage --silent` 옵션 고정 (시간 절약)

### 4.2 Build 중 체크 (단위)

- [ ] 각 슬라이스 단독 실행 ≤ 예산 (`vitest run tests/dev-cycle/battle.slice.test.ts` ≤ 25s)
- [ ] 슬라이스 간 격리 — 한 슬라이스 실패가 다음을 오염시키지 않음
- [ ] 모킹 경계 명시 — Phaser/DOM 모킹 한곳에 집중 (`tests/dev-cycle/setup.ts`)
- [ ] 결정성 — 3회 연속 실행 동일 결과 (flaky 0건)

### 4.3 QA 실행 체크 (적경홍 본진)

- [ ] **Quick QA** — `npm run dev:verify` 1회 · exit code 0 · ≤ 60s
- [ ] **Standard QA** — 3회 연속 실행 · 평균 elapsed ≤ 55s (10% 마진)
- [ ] **Exhaustive QA** — `--scenario=battle|save|map` 단독 실행 각각 PASS
- [ ] **회귀** — `git stash` → main 비교 → stash pop · 동일 PASS
- [ ] **에러 카피 검증** — 강제 실패 주입 후 `path:line:reason` 1줄 노출 확인
- [ ] **첫 실패 박스** — 가춘운 디자인 SSOT 매칭 (이모지·색상·hint 위치)
- [ ] **JSON 출력** — `--json` 모드 시 스키마 정합 (가춘운 §JSON 스키마)
- [ ] **NO_COLOR** — `NO_COLOR=1` 환경 변수 시 ANSI 제거
- [ ] **타임아웃 회귀** — 의도적 sleep 주입 시 `BUDGETS` 초과 BLOCK 발생

### 4.4 Ship 게이트 (이소화 4-AND 합주)

- [ ] `npm run dev:verify` exit code 0
- [ ] `npm run dev:typecheck` exit code 0
- [ ] `npm run dev:build` exit code 0
- [ ] 보안 SSOT 48 항목 PASS · `shell: true` 0건 (`grep -r "shell: true" scripts/dev-cycle/`)

---

## 5. 헬스 스코어 산출 — Test 단계 진입 시

| 영역 | 가중치 | 측정 방법 | 만점 기준 |
|---|---|---|---|
| **시나리오 PASS율** | 40% | `results.filter(r => r.ok).length / 3` | 3/3 = 100% |
| **시간 게이트** | 25% | `1 - (totalElapsed - 60) / 60` | ≤ 60s = 100%, > 90s = 0% |
| **결정성** | 15% | 3회 실행 동치율 | 3/3 동일 = 100% |
| **에러 가독성** | 10% | 강제 실패 시 `path:line:reason` 노출 | 1줄 요약 = 100% |
| **봉인 정합** | 10% | 이소화 P0 4건 PASS | 4/4 = 100% |

**판정 기준 (출시 전 단계 — Development & QA 어휘)**:
- ≥ 95: 다음 스프린트 후속 측정 진입 가능
- 80~94: WARN — 결손 1건 명시 후 인계
- < 80: BLOCK — Build 재진입

> ⚠️ 라이프사이클 인지: 본 단계는 *Development & QA* — Production *Ship 판정* 어휘 회피. dev 진척률·qa 커버리지·결함 카운트로 평가.

---

## 6. 엣지케이스 매트릭스 — 적의 매복 지점

| # | 매복 | 시나리오 | 방어 |
|---|---|---|---|
| **E-01** | Windows 경로 구분자 (`\` vs `/`) | 전 시나리오 | `path.join`/`resolve` 강제 · 하드코딩 금지 |
| **E-02** | npx 캐시 부재 시 첫 실행 30s+ | 전 시나리오 | CI 사전 워밍업 또는 `vitest` 직접 실행 |
| **E-03** | Phaser 헤드리스 canvas 미설치 | map | `canvas-mock` devDep 명시 · 부재 시 즉시 BLOCK |
| **E-04** | 시드 변경으로 데미지 결정성 깨짐 | battle | `vi.setSystemTime` + RNG seed 픽스처 |
| **E-05** | 직렬화 NaN/Infinity | save | `JSON.stringify` 안전 변환 헬퍼 |
| **E-06** | scene 전환 중 비동기 race | map | `await new Promise(r => scene.events.once('create', r))` |
| **E-07** | 60초 게이트 직전 통과 (59.9s) | total | recent runs 추적 — 3회 연속 시 BLOCK 승격 (이미 verify-core.mjs:164 구현) |
| **E-08** | child process 좀비 | runScenario | `SIGKILL` + `clearTimeout` (이미 구현, 보존) |
| **E-09** | stderr 무한 누적 (메모리) | runScenario | 16KB cap 또는 ring buffer (Build 시 추가) |
| **E-10** | 스냅샷 파일 누수 | save | in-memory 강제 — 파일 IO 0 |

---

## 7. 회귀 테스트 매트릭스

| 회귀 시나리오 | 트리거 | 검증 |
|---|---|---|
| 신규 콘텐츠 추가 | `client/src/data/` 변경 | `npm run dev:verify` 통과 유지 |
| ATB 공식 수정 | `CombatManager` 변경 | B-02·B-03 PASS · 데미지 결정성 |
| 세이브 스키마 마이그레이션 | `version` 증가 | S-03·S-05 PASS · 이전 세이브 거부 또는 마이그레이션 |
| Phaser 버전 업 | `package.json` | M-01~M-05 PASS · 헤드리스 호환 확인 |

---

## 8. Build 인계 — 계섬월·두련사 즉시 행동 (P0)

```
1. mkdir tests/dev-cycle && touch tests/dev-cycle/{battle,save,map}.slice.test.ts
2. tests/dev-cycle/setup.ts — 공통 모킹 (Phaser headless, canvas-mock, RNG seed)
3. verify-core.mjs:18-30 SCENARIO_TESTS + BUDGETS 재정좌
4. verify-core.mjs:74 shell: true 제거 (이소화 Z1)
5. package.json scripts: "dev:verify": "node scripts/dev-cycle/verify-core.mjs"
6. 1회 실행 → 적경홍 헬스 스코어 산출 → Test 단계 진입
```

---

## 9. 5인 인계 매트릭스

| 인계 대상 | 받을 것 | 줄 것 |
|---|---|---|
| **계섬월** (Build) | 본 SSOT §3 TC + §8 행동 | 슬라이스 3종 코드 + verify-core.mjs 갱신본 |
| **두련사** (Eng Manager) | §4.1 게이트 | 60초 초과 시 즉시 알림 hook |
| **심요연** (Data) | §5 헬스 스코어 | `.ac/verify-trend.json` 트렌드 적재 |
| **진채봉** (Editor) | §3 TC | 릴리스 노트 §QA 자동 검증 절 |
| **이소화** (Security) | §4.4 4-AND | 48 항목 PASS 확인 + Z1 봉인 검증 |

---

## 10. 봉인 — 본 SSOT 변경 절차

1. 본 문서 수정
2. 회고 SSOT (`retro_*-sprint.md` §A4) 동기화
3. 디자인 SSOT (가춘운) · 보안 SSOT (이소화) 정합 확인
4. `verify-core.mjs` 코드 미러 갱신
5. 1회 실행 후 헬스 스코어 ≥ 95 확인

**보고 마침. 전선 이상 무, 진을 굳혔사옵니다.** 🗡️
