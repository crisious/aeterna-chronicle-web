# Retro — P56-S1: skillAdapter (DB Skill → Combat 어댑터)

**날짜**: 2026-05-01
**스프린트**: P56-S1 단일 사이클 (자동 진행)
**스코프**: 두 스킬 시스템 통합 1단계 — pure 어댑터 + 단위 테스트. engine wiring 은 P56-S2 분리.

## 통합 대상 두 시스템

| 시스템 | 파일 | 역할 |
|---|---|---|
| **DB Skill** | `server/src/skill/skillSeeds.ts` + `skillEngine.ts` + Prisma `Skill` | 180 스킬, 해금/레벨업/장착 |
| **Combat SkillSystem** | `server/src/combat/skillSystem.ts` | 30 hardcoded SKILL_DATABASE — 실시간 전투 시 캐스팅 |

**불일치**:
- ID 다름: DB `ek_ether_slash` ↔ Combat `ek_slash`
- 필드 다름: DB `damageScale/effect/cooldown(s)` ↔ Combat `damageMultiplier/statusEffect/cooldownTicks`
- Element 종류 다름: DB 10종 (aether/time/void/ice 추가) ↔ Combat 7종

## 산출물

| 영역 | 파일 | 변경 |
|---|---|---|
| 어댑터 | `server/src/combat/skillAdapter.ts` | 신규 — 매핑 헬퍼 5개 + main 어댑터 + DB 일괄 로드 |
| 테스트 | `tests/unit/skillAdapter.test.ts` | 19 tests — 매핑/추론/추출/통합 |

## 매핑 규칙 요약

### Element (10 → 7)
| DB | Combat | 사유 |
|---|---|---|
| fire/water/wind/earth/light/dark/neutral | 동일 | 직접 매핑 |
| aether | light | 빛/마법 에너지 |
| time | neutral | combat 에 time 없음 |
| void | dark | 공허 → 어둠 |
| ice | water | 얼음 → 물 |

### DamageType (DB 부재 → 추론)
- 클래스 기본값:
  - ether_knight / memory_breaker / shadow_weaver → `physical`
  - memory_weaver / time_guardian / void_wanderer → `magical`
- effect.type silence/curse → `magical` override
- 추후 P56-S2 시 individual override 추가 가능

### TargetType (string → number)
- single/self → 1
- aoe → -1 (전체)
- multi → 3

### Status Effect 추출
- effect.type 이 `stun/freeze/silence/slow/poison/burn/bleed/blind/curse` 일 때만
- value 가 0~100 이면 chance, 아니면 default 50%
- passive effect (mp_regen/reflect/lifesteal 등) 은 무시

### Cooldown
- DB 초 단위 (소수점 가능) → `Math.floor`, 음수 보호 (max 0)
- 1 tick = 1 초 가정 (engine.processTick 기준)

## 검증

- 단위 테스트: 19 — element 매핑(3) + 데미지 타입 추론(3) + 타겟 카운트(1) + status 추출(4) + main 어댑터(6) + DB load(2)
- 전체 unit: 390 → **409** (+19)
- contract: 31 (불변)
- typecheck/lint: 0 errors

## 의도적으로 보류한 것

1. **engine wiring** (P56-S2): combatInstanceManager 가 init 시 `loadCombatSkillsFromDb()` 호출 + cache. `getSkillById` 가 cache 우선 fallback 로 SKILL_DATABASE 보강. 위험: 비동기 init, 기존 30 스킬과 충돌 처리.
2. **lifesteal mechanism** (P56-S3): executeSkill 에서 `skill.effect.type === 'lifesteal'` 처리 + drain_amplify modifier 적용. 어댑터에는 lifesteal 추출 hook 자리만 마련.
3. **DB seed 검증**: 실제 DB 가 180 스킬로 채워졌는지는 별 작업 (`prisma:generate` + seed 스크립트).
4. **Individual damageType override**: skillSeeds 의 mb_mind_crush 같은 예외(physical 클래스인데 magical) 는 override 매핑 테이블 추가 시 정확화. 현재는 effect 기반.

## 한 줄 요약

> DB Skill ↔ Combat SkillDef 어댑터 pure 함수 19 테스트 그린. P56-S2 engine wiring 으로 lifesteal/drain_amplify 무대 마련.

## P56 chapter 누적

| Sprint | 산출 | 상태 |
|---|---|---|
| **S1** | skillAdapter pure 함수 + 19 tests | ✅ |
| S2 | engine wiring (init prefetch + getSkillById fallback) | 대기 |
| S3 | lifesteal mechanism + drain_amplify 본격 구현 | 대기 |
