# 테스트 시드 & Mock Fixtures

> 작성: 심요연 (Data Analyst) · 2026-04-21 · 스프린트 "에테르나 크로니클 게임 프로젝트 개선"

본궁이 살피건대, 데이터는 스스로 말하지 않고 그 사용처가 분명할 때 비로소 진실을 드러냅니다.
이 디렉토리의 파일들은 **실제 프로덕션 데이터가 아닌 재현 가능한 테스트 자원**입니다.

## 파일 인덱스

| 파일 | 용도 | 참조 문서 |
|---|---|---|
| `players.seed.json` | 5단계 성장 곡선 플레이어 샘플 (Lv1/15/30/50/80) | `03_데이터테이블/combat_balance_table.md` |
| `combat-scenarios.seed.json` | 전투 회귀 검증 — 콤보·크리·상태이상·P2W 가드 | `CHANGELOG.md#1.0.0-rc.2` |
| `npc-choice-events.mock.json` | 텔레메트리 스키마 v1 mock 페이로드 6건 | `03_데이터테이블/npc_choice_event_telemetry_schema_v1.md` |
| `../benchmarks/performance-cases.json` | 성능 SLO 벤치 케이스 7종 | `DESIGN.md` |
| `../../scripts/analytics/queries.sql` | KPI·UX·밸런스 SQL 쿼리 8종 | 텔레메트리 스키마 v1 |

## 사용 규칙

1. **민감정보 금지** — `playerIdHash` 는 `sha256:mock_*` 접두사를 유지하세요.
2. **버전 고정** — fixture 변경 시 `_meta.version` 을 bump 하고 CHANGELOG 에 기록.
3. **Idempotency** — `npc-choice-events.mock.json` 의 4번 이벤트는 의도적 중복입니다. `telemetry.dialogue_choice_clean` 뷰(Q6)로 필터링되어야 합니다.

## 회귀 테스트 연결 지점

- `combat-scenarios.seed.json#combat-combo-3hit` → `tests/unit/combatEngine.test.ts`
- `combat-scenarios.seed.json#combat-p2w-guard` → `server/security/p2wGuard.test.ts`
- `players.seed.json` → E2E 엔딩 분기 시나리오 (`tests/e2e/ending-flow.spec.ts`)

## 다음 단계

- [ ] fixture 로더 유틸 `tests/helpers/loadFixture.ts` 추가
- [ ] CI 단계에 벤치 케이스 FPS 회귀 감시 추가 (gstack + Lighthouse)
- [ ] A/B 쿼리(Q8)에 카이제곱 유의성 검정 래퍼 작성
