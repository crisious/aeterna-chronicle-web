# Retro — Phase 55-S5: Phase 4 부분 (crit_echo + move_damage_aura)

**날짜**: 2026-05-01
**스프린트**: 단일 사이클, 1일 (자동 진행)
**스코프**: Phase 4 stub 5종 중 매니저 신설 불필요 한 단순 트리거 2종 즉시 구현

## 산출물

| 영역 | 파일 | 변경 |
|---|---|---|
| modifier bag | `server/src/skill/passiveResolver.ts` | bag 9→11 필드, ALWAYS_KIND 2종 추가, accumulatePassive switch 확장 |
| hooks | `server/src/combat/passiveCombatHooks.ts` | computeCritEchoDamage + applyMoveDamageAura 신규 |
| engine | `server/src/combat/combatEngine.ts` | CombatParticipant +2 필드, processTick aura, executeAttack/Skill 에 crit_echo |
| route | `server/src/routes/combatRoutes.ts` | addParticipant 호출에 2 필드 전달 |
| 클라 가시화 | `client/src/skills/passiveEffectFormatter.ts` | crit_echo / move_damage_aura → implemented 분류, IMPLEMENTED_EFFECT_TYPES 11개 |
| 회귀 테스트 | `tests/unit/passiveCombatHooks.test.ts` | 38 → 48 (+10) |
| 회귀 테스트 | `tests/unit/passiveResolver.test.ts` | 17 → 18 (split test) |
| 회귀 테스트 | `tests/unit/passiveEffectFormatter.test.ts` | 재분류 (9구현+5stub → 11구현+3stub), 총 20 유지 |

## 적용된 effect 2종

| type | 트리거 시점 | 동작 |
|---|---|---|
| `crit_echo` | 공격/스킬 데미지 직후, isCritical 일 때 | `baseDamage × critEchoPercent/100` 추가 데미지 1회. 추가 crit roll 없음. cheat_death 도 echo 데미지에 반응 |
| `move_damage_aura` | 매 tick 시작 (mp_regen/hp_regen 다음) | `actor.moveDamageAuraValue` 만큼 적군 alive 전체에 광역 데미지. 사망 처리 + logDamage |

## Phase 4 잔여 3종 (다음 sprint)

| type | 보류 사유 |
|---|---|
| `auto_resurrect` | 사망 후 N초 부활 — `engine` 에 deferred event queue 필요 (사망/타이머/부활 사이클) |
| `poison_amplify` | `statusEffectManager.tick` 의 dot 계산에 attacker side modifier 주입 필요. effect 가 누가 시전했는지 추적해야 함 |
| `drain_amplify` | 흡수(라이프스틸) 메커니즘 자체가 `damageCalculator` 에 부재 — 신규 mechanism 필요 |

## 수치 검증

- `crit_echo` 30% × 100 dmg crit → +30 echo
- `move_damage_aura` 15 × 3 enemies (alive) → 각 -15 hp, 사망한 enemy skip
- `cheat_death` + `crit_echo`: echo 데미지가 fatal 일 때도 cheat_death 발동 가능 (중첩 방어)
- 클라 표시: `매 턴 적군 전체에 15 데미지`, `크리티컬 시 추가 데미지 +30%`

## 디자인 결정

1. **crit_echo 추가 crit 없음**: echo 자체에 또 crit roll 하면 무한 echo 가능성. 한 번만.
2. **echo 도 cheat_death 반응**: 두 번째 fatal 으로 죽이려는 경우에도 같은 메커니즘 — 일관성.
3. **aura 는 party → monsters 단방향**: 몬스터의 move_damage_aura 는 시드 데이터에 없음. 구현은 양방향 가능하나 현 시점 invocation 만 단방향.
4. **stub 3 잔여 명시**: pending 사유를 retro 에 기재 — 다음 sprint 가 구체적으로 무엇을 추가해야 할지 알 수 있게.

## 검증

- typecheck: 0 errors
- lint: 0 errors / 314 warnings (불변)
- 전체 unit: 365 → **376** (+11)
- contract: 31

## 한 줄 요약

> 14 effect type 중 11종 구현 (78%). 잔여 3종은 매니저 신설 동반 — 별 sprint.

## P55 시리즈 누적 (이 세션)

| Sprint | 구현 effect | 테스트 누적 | 누적 진척 |
|---|---|---|---|
| S1 | resolver 5 modifier 산출 | +15 | 5/14 |
| S2 | engine consumption (상시) | +21 | 5/14 |
| S3 | trigger 4 (reflect/proj/cheat_death/hp_regen) | +19 | 9/14 |
| S4 | 클라 가시화 (formatter) | +20 | 9/14 + UX |
| **S5** | **trigger 2 (crit_echo/aura)** | **+11** | **11/14 (78%)** |
| **합** | **11/14 effect + 클라 UX** | **+86** | **78%** |
