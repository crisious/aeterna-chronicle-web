# Retro — P56-S2: engine wiring (getSkillById cache fallback)

**날짜**: 2026-05-03
**스프린트**: P56-S2 단일 사이클 (자동 진행)
**스코프**: P56-S1 어댑터를 combat 엔진에 연결 — `getSkillById` 가 hardcoded 미스 시 DB cache fallback

## 산출물

| 영역 | 파일 | 변경 |
|---|---|---|
| skillSystem | `server/src/combat/skillSystem.ts` | `dbSkillCache` 모듈 변수 + `setDbSkillCache`/`getDbSkillCache` + `getSkillById` fallback + `getSkillsByClass` dedup 합본 |
| skillAdapter | `server/src/combat/skillAdapter.ts` | `initCombatSkillsFromDb(force?)` 진입점 — single-flight promise + 1회 cache 주입. `_resetInitState()` (테스트용) |
| 라우트 | `server/src/routes/combatRoutes.ts` | `/combat/start` 직전 `await initCombatSkillsFromDb()` (lazy init, idempotent) |
| 회귀 테스트 | `tests/unit/skillAdapter.test.ts` | 19 → 25 (+6) |

## 동작

```
첫 /combat/start 호출
  ↓ initCombatSkillsFromDb() — DB findMany active+ultimate → Map<code, SkillDef>
  ↓ setDbSkillCache(map) — skillSystem 모듈 변수 주입
  ↓ engine.create() ... addParticipant ...
  ↓ executeSkill 내 getSkillById('sw_soul_drain')
    1. SKILL_DATABASE.find — miss
    2. dbSkillCache.get — hit ✅ (P56-S1 어댑터 매핑값)

다음 /combat/start
  ↓ initCombatSkillsFromDb() — initialized=true, 즉시 resolve, fetch 0회

force=true 호출 시
  ↓ 강제 재로드 (DB seed 변경 시 등)
```

## 디자인 결정

1. **Hardcoded 우선, DB 보강**: 기존 30 SKILL_DATABASE 가 우선. 동일 id 가 DB 에 있어도 hardcoded 값 사용. 회귀 0 보장. 추후 점진 마이그레이션 가능.
2. **Lazy init in route**: server bootstrap 미수정. 첫 battle 직전 1회 init. single-flight promise 로 동시 호출 안전.
3. **`getSkillsByClass` dedup**: hardcoded id 와 DB cache id 중복 시 hardcoded 만 포함 (set 기반).
4. **`force` 인자**: 테스트/seed 변경 후 명시적 재로드 가능.
5. **테스트 진입점**: `_resetInitState` export 로 단위 테스트가 깨끗한 상태에서 시작.

## 검증

- 단위 테스트 +6:
  - hardcoded miss → DB fallback 동작
  - hardcoded id 우선 (DB 가 같은 id 다른 값 줘도 hard 사용)
  - 동시 init 호출 → single promise (1회 fetch)
  - 이미 초기화 → 추가 fetch 없음 (idempotent)
  - force=true → 강제 재로드
  - getSkillsByClass dedup
- 전체 unit: 409 → **415** (+6)
- contract: 31 (불변)
- typecheck/lint: 0 errors
- 기존 combatEngine 10 tests 회귀 영향 0건

## 의도적으로 보류한 것

1. **lifesteal mechanism** (P56-S3): `executeSkill` 에서 `skill.effect` 가 lifesteal 인 경우 attacker.hp += damage × value/100. drain_amplify 로 곱 적용. `SkillDefinition` 에 effect 필드 추가 필요 (현재 어댑터가 statusEffect 만 추출).
2. **lifesteal effect 어댑터 통과**: 현재 어댑터의 `mapDbSkillToCombatDef` 가 statusEffect 만 처리. lifesteal/drain/heal 같은 active passive-not-effect 정보는 아직 누락. P56-S3 시 SkillDefinition 에 `lifestealPercent?` 또는 generic `effectMeta?` 필드 추가.
3. **DB seed 보장**: 본 sprint 는 어댑터 + wiring 만. 실 DB 가 180 스킬 seed 됐는지는 별 작업 (`server/src/skill/seed.ts` 또는 `npm run seed`).

## 한 줄 요약

> hardcoded SKILL_DATABASE 와 DB Skill 의 비파괴 통합 — getSkillById 가 두 소스 모두 조회. 회귀 0, lifesteal 무대 마련.

## P56 chapter 진척

| Sprint | 상태 |
|---|---|
| **S1** skillAdapter pure 함수 + 19 tests | ✅ |
| **S2** engine wiring (lazy init + cache fallback) | ✅ |
| S3 lifesteal mechanism + drain_amplify 본격 | 다음 |
