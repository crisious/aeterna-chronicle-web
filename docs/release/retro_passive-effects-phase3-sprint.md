# Retro — Phase 55-S3: 패시브 트리거 4종 (Phase 3)

**날짜**: 2026-05-01
**스프린트**: 단일 사이클, 1일
**스코프**: 18종 passive 중 트리거 기반 4종 — reflect / projectile_reflect / cheat_death / battle_regen

## 산출물

| 영역 | 파일 | 변경 |
|---|---|---|
| modifier bag 확장 | `server/src/skill/passiveResolver.ts` | bag 5→9 필드, ALWAYS_KIND 4종 promote, accumulatePassive switch 확장 |
| hooks 4 신규 helper | `server/src/combat/passiveCombatHooks.ts` | applyHpRegen, computeReflectDamage, computeProjectileReflectDamage, tryCheatDeath |
| engine 통합 | `server/src/combat/combatEngine.ts` | CombatParticipant +5 필드, addParticipant cheat_death 초기화, processTick hpRegen, executeAttack/Skill 에 cheat_death/reflect 통합 |
| route 통합 | `server/src/routes/combatRoutes.ts` | addParticipant 호출에 4 신규 필드 전달 |
| 회귀 테스트 | `tests/unit/passiveCombatHooks.test.ts` | 21 → 38 (+17) |
| 회귀 테스트 | `tests/unit/passiveResolver.test.ts` | 15 → 17 (+2 갱신/추가) |

## 적용된 트리거 4종

| type | 트리거 시점 | 동작 |
|---|---|---|
| `reflect` | physical 피격 | `damage * reflectPercent/100` 을 attacker 에게 반사. attacker 의 cheat_death 도 반사 데미지에 반응 |
| `projectile_reflect` | magical 피격 | 동일 패턴, 별도 필드 `projectileReflectPercent` |
| `cheat_death` | 사망 직전 | hp - damage ≤ 0 이면 hp=1 유지 + chargesRemaining 1 차감. `chargesMax` 만큼 한 전투당 사용 가능 |
| `battle_regen` | 매 tick 시작 | mp_regen 와 동일 패턴으로 hp 회복 (maxHp 캡, alive 만) |

## Phase 4 보류 (5종 stub 유지)

`auto_resurrect`, `crit_echo`, `poison_amplify`, `drain_amplify`, `move_damage_aura`

→ 각각 별도 매니저 변경 필요:
- `auto_resurrect`: 타이머 기반 (duration:30) — engine 에 delayed event queue 필요
- `crit_echo`: damageCalculator 결과 검사 + 추가 행동 — combat flow 변경
- `poison_amplify` / `drain_amplify`: statusEffectManager 통합 hook 필요
- `move_damage_aura`: ATB 충전 트리거 — processTick 의 ATB 단계 변경

## 디자인 결정

1. **cheat_death init 위치**: `addParticipant` 진입점에서 `cheatDeathChargesMax → cheatDeathChargesRemaining` 복사. 그 외 진입점이 없으므로 정확히 한 번만 초기화됨.
2. **reflect → cheat_death 연쇄**: reflect 데미지로 attacker 가 죽으려 할 때도 attacker 의 `tryCheatDeath` 가 발동. "방어 대 반격" 의 무한 핑퐁은 reflectPercent 100% 미만이라 자연 수렴.
3. **physical/magical 반사 분리**: 한 패시브가 둘 다 가지는 경우 각자 독립 누적. damage type 으로 분기하여 적절한 percent 사용.
4. **battle_regen alive 체크**: 죽은 캐릭터는 회복 안 함. mp_regen 도 동일하게 check 추가됨.

## 검증

- 단위 테스트: 4 신규 helper × 4~6 케이스 = 17 신규 (charges 0/1/2, fatal/non-fatal, alive 체크, percent floor, 0 케이스 등)
- 전체 unit tests: 326 → **345** (+19)
- 전체 contract tests: 31 (불변)
- typecheck/lint: 0 errors

## 한 줄 요약

> 18종 패시브 중 9종이 살았다 — 5종 상시(P1+P2) + 4종 트리거(P3). 남은 5종은 매니저 신설을 동반하므로 별 sprint.

## 누적 진척 (P55 전체)

| Sprint | 구현 effect | tests | LOC 합계 |
|---|---|---|---|
| S1 | resolver, 5종 modifier 산출 | +15 | 215 |
| S2 | engine consumption (회피/명중/atk/def/mp_regen) | +21 | 86 + 48 |
| S3 | trigger 4종 (reflect/proj_reflect/cheat_death/hp_regen) | +19 | 70 + 50 |
| **합** | **9종 / 18 = 50%** | **+55** | **~570** |
