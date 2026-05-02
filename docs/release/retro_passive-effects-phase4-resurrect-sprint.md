# Retro — Phase 55-S6: auto_resurrect 부활 시스템

**날짜**: 2026-05-01
**스프린트**: 단일 사이클, 1일 (자동 진행)
**스코프**: 14 effect type 중 12번째 — `auto_resurrect` 사망 → 시간 도달 → 부활 사이클 구현

## 산출물

| 영역 | 파일 | 변경 |
|---|---|---|
| modifier bag | `server/src/skill/passiveResolver.ts` | bag 11→14 필드, parseEffect 가 duration 추출, auto_resurrect 특수 케이스(value+duration 모두 사용) |
| hooks | `server/src/combat/passiveCombatHooks.ts` | scheduleAutoResurrect + tryAutoResurrect 신규 |
| engine | `server/src/combat/combatEngine.ts` | CombatParticipant +5 필드, addParticipant 초기화, processTick 시작에 부활 phase, 끝에 schedule phase |
| route | `server/src/routes/combatRoutes.ts` | addParticipant 호출에 3 필드 전달 |
| 클라 | `client/src/skills/passiveEffectFormatter.ts` | auto_resurrect → implemented |
| 회귀 테스트 | `tests/unit/passiveCombatHooks.test.ts` | 48 → 60 (+12) |
| 회귀 테스트 | `tests/unit/passiveResolver.test.ts` | 18 → 19 (+1) |
| 회귀 테스트 | `tests/unit/passiveEffectFormatter.test.ts` | 재분류 (12 구현 / 2 stub) |

## 구현된 effect

| skill | duration | value | 동작 |
|---|---|---|---|
| `mw_memory_reconstruct` | 30 | 100 | 사망 후 30 tick 뒤 HP 100% 부활 |
| `tg_eternal_time` | 0 | 100 | 사망 후 1 tick 뒤 HP 100% 부활 (즉시 다음 tick) |

여러 auto_resurrect 장착 시:
- delay = max(각 duration)
- hpPercent = max(각 scaledValue)
- chargesMax = sum (각 1씩 누적)

## 부활 사이클 (engine)

```
사망 (현재 tick T)
   ↓ (processTick T 끝, scheduleAutoResurrect)
resurrectAtTick = T + delay, charges 1 차감

   ↓ (T+delay tick 시작, tryAutoResurrect)
hp = floor(maxHp × pct/100, 최소 1)
alive = true, atbGauge = 0
resurrectAtTick = undefined (재발동 방지)
```

## 디자인 결정

1. **부활 사이클의 phase 분리**: schedule 은 tick 끝에, revive 는 다음 tick 시작에. 같은 tick 동시 발생 방지로 무한 루프 차단.
2. **delay=0 도 1 tick 후 부활**: schedule(T) → resurrectAtTick=T → 다음 tick T+1 에서 T+1 >= T → 부활. 즉시 부활 의도(skillSeeds tg_eternal_time) 실현.
3. **hpPercent 0 보호**: floor(maxHp × 0/100) = 0 이면 최소 1 보장. RPG 전통상 1 HP 부활.
4. **charges 1회/전투**: cooldown(120s) 은 미구현 — Phase 5 후보. 현재는 한 전투당 N회(skill 수 만큼).
5. **승패 판정과 충돌**: 부활 예약된 사망자도 "alive=false" 로 카운트되어 일시적 KO. 다음 tick 부활 후 전투 재개. (즉시 패배 방지하려면 별도 체크 필요 — 현 시점은 sequence 의존)
6. **parseEffect 에 duration 추출 추가**: 모든 effect type 이 duration 을 안전 파싱. 다른 effect 들은 무시 가능 (auto_resurrect 만 사용).

## 검증

- 단위 테스트: 12 신규 (schedule × 4 + resurrect × 8 = full cycle 검증)
- 전체 unit: 376 → **389** (+13)
- contract: 31
- typecheck/lint: 0 errors
- 기존 combatEngine 10 tests: 무영향

## Phase 4 잔여 stub (2종 — 각각 매니저 통합 필요)

- **poison_amplify** — `statusEffectManager.tick` 의 dot 계산에 attacker side modifier 주입 필요. effect 가 누가 시전했는지 추적 필요
- **drain_amplify** — 흡수(라이프스틸) 메커니즘 자체가 `damageCalculator` 에 부재. 신규 mechanism 필요

## 한 줄 요약

> 14 effect type 중 12종 구현 (86%). 잔여 2종은 다른 매니저 (statusEffectManager / damageCalculator) 통합 동반.

## P55 시리즈 누적 (이 세션)

| Sprint | effect 추가 | 누적 진척 | tests |
|---|---|---|---|
| S1 | 5 modifier 산출 | 5/14 | +15 |
| S2 | engine consumption | 5/14 | +21 |
| S3 | trigger 4 | 9/14 | +19 |
| S4 (B) | 클라 가시화 | 9/14 + UX | +20 |
| S5 | crit_echo + aura | 11/14 | +11 |
| **S6** | **auto_resurrect** | **12/14 (86%)** | **+13** |
| **합** | **12/14 effect** | **86%** | **+99** |
