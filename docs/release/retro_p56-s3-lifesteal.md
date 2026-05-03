# Retro — P56-S3: lifesteal mechanism + drain_amplify 본격 구현

**날짜**: 2026-05-03
**스프린트**: P56-S3 단일 사이클 (자동 진행)
**스코프**: P55 chapter 의 마지막 잔여 effect — `drain_amplify` 와 그 전제인 lifesteal 메커니즘 동시 구현. P55 14/14 종료.

## 산출물

| 영역 | 파일 | 변경 |
|---|---|---|
| 어댑터 | `server/src/combat/skillAdapter.ts` | `extractLifestealPercent` 추출 + `mapDbSkillToCombatDef` 의 lifestealPercent 채움 |
| skillSystem | `server/src/combat/skillSystem.ts` | `SkillDefinition` 에 `lifestealPercent?: number` 추가 |
| hooks | `server/src/combat/passiveCombatHooks.ts` | `applyLifesteal(attacker, lifestealPct, damage)` — drain_amplify 곱 적용 + maxHp cap + alive guard. PassiveCombatant 에 `drainAmplifyPercent` |
| resolver | `server/src/skill/passiveResolver.ts` | bag 15→16 필드, ALWAYS_KIND 에 drain_amplify 추가, accumulate switch |
| engine | `server/src/combat/combatEngine.ts` | `executeSkill` 에서 `skill.lifestealPercent > 0` 면 `applyLifesteal` 호출 → logHeal. CombatParticipant `drainAmplifyPercent` |
| route | `server/src/routes/combatRoutes.ts` | addParticipant 호출에 drainAmplifyPercent 전달 |
| 클라 formatter | `client/src/skills/passiveEffectFormatter.ts` | drain_amplify → implemented (PENDING 0) |
| 회귀 테스트 | `tests/unit/skillAdapter.test.ts` (+5) `passiveCombatHooks.test.ts` (+9) `passiveResolver.test.ts` (변경) `passiveEffectFormatter.test.ts` (변경) | 415 → 430 (+15) |

## 동작

```
sw_soul_drain (skill.effect = { type: 'lifesteal', value: 50 }) 사용
  ↓ getSkillById('sw_soul_drain') → P56-S2 cache 에서 SkillDef 반환
  ↓ executeSkill: 데미지 적용 (cheat_death/critEcho 처리)
  ↓ skill.lifestealPercent === 50 → applyLifesteal(actor, 50, damage) 호출
  ↓ baseHeal = damage × 0.5
  ↓ drain_amplify 50% 장착 → amplified = floor(baseHeal × 1.5)
  ↓ actor.hp += amplified (maxHp cap)
  ↓ logger.logHeal(actor, actor, amplified, skillId)
```

## 디자인 결정

1. **lifesteal/drain_amplify 동시 구현**: drain_amplify 만 따로 구현하면 lifesteal 자체가 없어 무의미. 한 sprint 에서 두 메커니즘 동시 land.
2. **lifesteal hook 위치**: `executeSkill` 의 reflect/projectile_reflect 직전. damage 가 result.damage(원본 계산값)로 계산되어 cheat_death 발동 여부 무관. drain_amplify 는 attacker 의 passive modifier 라 attacker 기준.
3. **alive=false attacker 보호**: 죽은 attacker 는 회복 안 함 (reflect 데미지로 죽었을 때 등).
4. **floor 적용**: `Math.floor(baseHeal × (1 + drainAmp/100))` — 최종값만 floor 하여 정밀도 손실 최소화.
5. **mapDbSkillToCombatDef 에 lifestealPercent 통합**: P56-S1 어댑터가 statusEffect 만 추출하던 것을 lifesteal 까지 확장. effect 의 다른 active type (heal, drain) 은 추후 sprint.

## P55 chapter 종료

| effect | 구현 sprint |
|---|---|
| mp_regen / evasion_up / bonus_hit_chance / low_hp_atk_up / defense_up_conditional | P55-S1+S2 |
| reflect / projectile_reflect / cheat_death / battle_regen | P55-S3 |
| crit_echo / move_damage_aura | P55-S5 |
| auto_resurrect | P55-S6 |
| poison_amplify | P55-S7 |
| **drain_amplify** | **P56-S3 (이 sprint)** |
| **합계** | **14/14 = 100%** |

## P56 chapter 종료 (3 sprint)

| Sprint | 내용 | 상태 |
|---|---|---|
| S1 | skillAdapter pure 함수 + 19 tests | ✅ |
| S2 | engine wiring (lazy init + cache fallback) | ✅ |
| S3 | lifesteal mechanism + drain_amplify | ✅ |

## 검증

- 단위 테스트 +15:
  - hooks: applyLifesteal 9 (0 pct/0 dmg/정상/drain_amplify/cap/already max/alive false/100% 증폭/floor)
  - adapter: extractLifestealPercent 4, mapDbSkill 에 lifesteal 2
- 전체 unit: 415 → **430** (+15)
- contract: 31 (불변)
- typecheck/lint: 0 errors
- 기존 combatEngine 10 tests 회귀 영향 0건

## 한 줄 요약

> P55 chapter 종료 — 14 effect type 모두 구현. drain_amplify + lifesteal 동시 land. 어댑터 매핑이 P56 chapter 를 가능케 함.

## 누적 (이 세션)

- P55: 14/14 effect (100%)
- P56: 3/3 sprint (어댑터/wiring/lifesteal)
- 0 회귀, 430 unit + 31 contract = 461 tests
