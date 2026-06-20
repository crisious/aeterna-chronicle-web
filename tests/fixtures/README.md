# 테스트 시드 & Mock Fixtures

> 작성: 심요연 (Data Analyst) · 2026-04-21 · 스프린트 "에테르나 크로니클 게임 프로젝트 개선"

본궁이 살피건대, 데이터는 스스로 말하지 않고 그 사용처가 분명할 때 비로소 진실을 드러냅니다.
이 디렉토리의 파일들은 **실제 프로덕션 데이터가 아닌 재현 가능한 테스트 자원**입니다.

## 파일 인덱스

| 파일 | 용도 | 참조 문서 |
|---|---|---|
| `players.seed.json` | 5단계 성장 곡선 플레이어 샘플 (Lv1/15/30/50/80) | `03_데이터테이블/combat_balance_table.md` |
| `combat-scenarios.seed.json` | 전투 회귀 검증 — 콤보·크리·상태이상·P2W 가드 | `CHANGELOG.md#1.0.0-rc.2` |
| `verify-core.scenarios.json` | **verify-core.mjs 3 시나리오 minimal seed** (battle 1 turn / save round-trip / map scene swap) | `scripts/dev-cycle/verify-core.mjs` |
| `npc-choice-events.mock.json` | 텔레메트리 스키마 v1 mock 페이로드 6건 | `03_데이터테이블/npc_choice_event_telemetry_schema_v1.md` |
| `ui-inventory-save.scenarios.json` | UI 인벤토리 + 세이브 통합 시나리오 (계섬월) | `tests/integration/ui-inventory-save-flow.test.ts` |
| `damage-legibility.fixtures.json` | **전투 피드백 가독성** — 데미지 팝업·상태이상 동시표시·폭주·사용성 자극 시드 | `DESIGN.md#1`, `client/src/constants/battle-tokens.ts` |
| `../benchmarks/damage-legibility-contrast.json` | **데미지/결과 색 WCAG 대비비 + 색약 ΔE 벤치** (생성물) | `scripts/analytics/damage-legibility-contrast.mjs` |
| `../benchmarks/performance-cases.json` | 성능 SLO 벤치 케이스 7종 | `DESIGN.md` |
| `../benchmarks/verify-core-baseline.json` | **verify-core baseline + trend 임계** | `scripts/dev-cycle/verify-core.mjs` |
| `../../scripts/analytics/queries.sql` | KPI·UX·밸런스 SQL 쿼리 8종 | 텔레메트리 스키마 v1 |
| `../../scripts/analytics/verify-trend.mjs` | **verify-trend.json 7일 롤업 분석기** | `tests/benchmarks/verify-core-baseline.json` |
| `../../scripts/analytics/damage-legibility-contrast.mjs` | **전투 색 가독성 분석기** — SSOT 색 → WCAG/ΔE 벤치 재생성 (`node … [--json]`) | `client/src/constants/battle-tokens.ts` |

## 사용 규칙

1. **민감정보 금지** — `playerIdHash` 는 `sha256:mock_*` 접두사를 유지하세요.
2. **버전 고정** — fixture 변경 시 `_meta.version` 을 bump 하고 CHANGELOG 에 기록.
3. **Idempotency** — `npc-choice-events.mock.json` 의 4번 이벤트는 의도적 중복입니다. `telemetry.dialogue_choice_clean` 뷰(Q6)로 필터링되어야 합니다.

## 회귀 테스트 연결 지점

- `combat-scenarios.seed.json#combat-combo-3hit` → `tests/unit/combatEngine.test.ts`
- `combat-scenarios.seed.json#combat-p2w-guard` → `server/security/p2wGuard.test.ts`
- `players.seed.json` → E2E 엔딩 분기 시나리오 (`tests/e2e/ending-flow.spec.ts`)
- `verify-core.scenarios.json#battle` → `scripts/dev-cycle/verify-core.mjs --scenario=battle` + 신설 vitest `tests/integration/verify-core/battle-1turn.test.ts`
- `verify-core.scenarios.json#save` → `scripts/dev-cycle/verify-core.mjs --scenario=save` + 신설 vitest `tests/unit/save/verify-roundtrip.test.ts`
- `verify-core.scenarios.json#map` → `scripts/dev-cycle/verify-core.mjs --scenario=map` + 신설 vitest `tests/integration/verify-core/scene-swap.test.ts`

## verify-core 시드 사용법

```ts
import { loadJsonFixture } from '../helpers/loadFixture';
const seed = loadJsonFixture<typeof import('../fixtures/verify-core.scenarios.json')>('verify-core.scenarios.json');
// seed.battle / seed.save / seed.map  — 각 시나리오 1개 (배열 아님, in-process minimal)
```

trend 분석:
```bash
node scripts/analytics/verify-trend.mjs --window=7d        # 사람용 출력
node scripts/analytics/verify-trend.mjs --window=7d --json # CI 파이프용
```

## 다음 단계

- [x] fixture 로더 유틸 `tests/helpers/loadFixture.ts` 추가
- [ ] **`verify-core.scenarios.json` 실배선 PR** — 계섬월 Build 인계 (3 시나리오 vitest 신설)
- [ ] **baseline p50/p95 채움** — 실배선 PR landing 직후 10회 자동 실행 후 `verify-core-baseline.json` 갱신
- [ ] CI 단계에 벤치 케이스 FPS 회귀 감시 추가 (gstack + Lighthouse)
- [ ] A/B 쿼리(Q8)에 카이제곱 유의성 검정 래퍼 작성

### 전투 피드백 가독성 스프린트 인계 (Assets → Build)

> 분석 근거: `../benchmarks/damage-legibility-contrast.json` (재생성 가능). 수치가 가리키는 3개 처방:

- [ ] **P0 — `immune`(무효, #9b59b6) 대비 보강** — 배경 위 3.65:1 로 7색 중 유일 AAA-large 미달. 명도 상향 또는 아이콘 병기 (가춘운 디자인 토큰 → DESIGN.md §5 SSOT 절차)
- [ ] **P0 — 스프라이트 위 팝업 텍스트 스트로크/backdrop** — mid-sprite 위 5종(heal/miss/weak/resist/immune) AA 미달. 1-2px 다크 스트로크(#0a0a14)로 회복 (계섬월 BattleScene 팝업 렌더)
- [ ] **P1 — `저항↔무효` 색약 보강** — deuteranopia ΔE=14.95(WARN). 색 단독 금지, 라벨/형태 병기 필수 (`damage-legibility.fixtures.json#dmg-type-full-matrix`)
- [ ] **P1 — 상태이상 8중↑ 요약 칩** — `status-overflow-density` density 8/15 OVERFLOW. 우선순위 정렬(control>dot>debuff>buff) + '+N' 칩 (StatusEffectRenderer)
- [ ] **Test/QA — 사용성 자극 3종 실행** — `usabilityTestStimuli.tasks` (T1 resist/immune 식별 · T2 디버프 카운트 · T3 폭주 속 치명타). 색약 시뮬 그룹 대조 (적경홍 Test 단계)
