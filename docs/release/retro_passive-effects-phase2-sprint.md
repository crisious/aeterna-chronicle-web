# Retro — Phase 55-S2: 패시브 스킬 효과 — 엔진 consumption (Phase 2)

**날짜**: 2026-05-01
**스프린트**: 단일 사이클, 1일
**스코프**: S1 에서 산출만 되던 5종 modifier 의 실제 게임 적용

## 산출물

| 영역 | 파일 | 변경 |
|---|---|---|
| 순수 함수 hooks | `server/src/combat/passiveCombatHooks.ts` | 신규 — 86줄 |
| 엔진 통합 | `server/src/combat/combatEngine.ts` | tick mp_regen / executeAttack miss·atk·def / executeSkill miss·atk·def + ActionResult.missed 필드 |
| 회귀 테스트 | `tests/unit/passiveCombatHooks.test.ts` | 21 tests |

## 적용된 effect (실제 게임피드 영향)

| type | 적용 시점 | 동작 |
|---|---|---|
| `mp_regen` | 매 tick 시작 직후 | `actor.mp += mpRegenPerTurn` (maxMp 캡) |
| `evasion_up` + `bonus_hit_chance` | 공격/스킬 데미지 직전 | `rollMiss(attacker, defender)` — miss 시 damage=0 + `ActionResult.missed=true` |
| `low_hp_atk_up` | 데미지 계산 시점 | actor.hp < 30% maxHp 면 attackStat *= (1 + bonus%) |
| `defense_up_conditional` | 피격 시점 | defenseStat *= (1 + bonus%) |

## 디자인 결정

1. **순수 함수 분리**: `passiveCombatHooks.ts` 의 모든 함수가 `PassiveCombatant` 인터페이스(구조적 타입)에만 의존하여 `CombatParticipant` 의존을 제거. CombatEngine 의 import 만 추가하면 결합도 0.
2. **Math.random rng 주입 가능**: `rollMiss(attacker, defender, rng?)` — 테스트 시 `() => 0.10` 같이 주입해서 결정적 검증.
3. **physical 만 low_hp_atk_up 적용**: 마법(matk)에는 적용 안 함. 데이터/시드의 의도(passive 가 ATK 계열에 묶여 있음)와 일치.
4. **defense_up_conditional 트리거 단순화**: skill 시드에는 "조건부" 표기만 있고 명세 부재. 본 sprint 에서는 "피격 시 = damage 계산 시점에 항상 적용"으로 해석. 추후 더 엄격한 트리거(예: HP 임계 이하 시만) 가 필요하면 별 sprint 에서 강화.
5. **회피 정확히 missChance 일 때 hit**: `rng() < missChance` → 경계는 hit.

## 검증 수치

- 단위 테스트: hp 30% / 30 hp 이하 등 경계 + 기본 패스 21건
- 엔진 회귀: 기존 combatEngine 10 tests 영향 0건
- 전체 unit: 305 → **326** (+21)
- typecheck/lint: 0 errors

## 의도적으로 보류한 것

1. **trigger-based 13종**: reflect/cheat_death/auto_resurrect/poison_amplify 등. trigger 매니저 신규 필요 — Phase 55-S3.
2. **클라이언트 표시**: miss 발생 시 화면 "MISS!" 텍스트, mp_regen 숫자 popup. UX 별 sprint.
3. **회피 시 어그로**: `executeAttack` 의 어그로 추가는 hit 시에만. miss 시 어그로 0 — 의도적(맞지 않은 것에 어그로 안 쌓임).

## 한 줄 요약

> S1 에서 modifier 만 산출하던 패시브가 이제 실제로 작동한다. 회피, 명중, MP 회복, 저체력 분노, 피격 방어 — 5종이 게임피드를 흔든다.
