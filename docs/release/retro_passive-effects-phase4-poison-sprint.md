# Retro — Phase 55-S7: poison_amplify (DoT 시전자 증폭)

**날짜**: 2026-05-01
**스프린트**: 단일 사이클, 1일 (자동 진행)
**스코프**: 14 effect type 중 13번째 — `poison_amplify` 시전자 측 DoT 데미지 증폭

## 산출물

| 영역 | 파일 | 변경 |
|---|---|---|
| statusEffectManager | `server/src/combat/statusEffectManager.ts` | `tick()` 에 `getDotMultiplier?` 콜백 인자 추가, 호환적 |
| modifier bag | `server/src/skill/passiveResolver.ts` | bag 14→15 필드, accumulatePassive switch |
| engine 통합 | `server/src/combat/combatEngine.ts` | tick 콜백에 `source.poisonAmplifyPercent` 적용 |
| route | `server/src/routes/combatRoutes.ts` | 1 필드 전달 |
| 클라 | `client/src/skills/passiveEffectFormatter.ts` | poison_amplify → implemented |
| 회귀 테스트 | `tests/unit/passiveResolver.test.ts` | 19 → 20 (+1, accumulate split + applied 검증 갱신) |
| 회귀 테스트 | `tests/unit/passiveEffectFormatter.test.ts` | 13 implemented / 1 stub 분류 |

## 동작

```
attacker (poison_amplify=100%) 가 sw_poison_blade 사용
  → target 에 poison effect 적용 (sourceId=attacker.id)
  → 매 2초 tick: _calculateTickDamage 가 base = maxHp×3%×stacks 산출
  → tick 콜백이 attacker.poisonAmplifyPercent=100 → multiplier=2.0
  → 실제 데미지 = base × 2.0 (floor)
```

## 디자인 결정

1. **statusEffectManager.tick 시그너처 후방 호환**: 신규 파라미터는 옵셔널. 미전달 시 multiplier=1 (기존 동작 유지). 다른 호출 site (만약 있다면) 영향 0.
2. **modifier 0 보호**: `Math.max(0, multiplier)` — 음수 multiplier 시 데미지 0.
3. **DoT 종류 무관 공통 적용**: poison/burn/bleed 모두 동일하게 증폭. 시드 데이터에는 poison_amplify 만 명시되지만 hook 자체는 종류 의존 없음.
4. **drain_amplify 잔여 사유 명시**: `lifesteal` effect type 이 데이터에는 있으나(sw_soul_drain) 엔진 수확 로직이 부재. 별 sprint 에서 lifesteal mechanism 신설과 함께 drain_amplify 도 동시 구현 권장.

## 검증

- typecheck/lint: 0 errors
- 전체 unit: 389 → **390** (+1, 기존 테스트 분할/추가 위주)
- 기존 combatEngine 10 tests: 무영향

## Phase 4 잔여 1종 (drain_amplify)

`damageCalculator` / `executeSkill` 에 lifesteal 처리 신설 필요. skill.effect 가 lifesteal 일 때 attacker.hp += damage × value/100 × (1 + drainAmplifyPct/100). 별도 sprint.

## 한 줄 요약

> 14 effect type 중 13종 구현 (93%). 잔여 1종(drain_amplify)은 lifesteal mechanism 신설과 함께 별 sprint.

## P55 시리즈 누적 (이 세션)

| Sprint | effect 추가 | 누적 진척 | tests |
|---|---|---|---|
| S1 | 5 modifier 산출 | 5/14 | +15 |
| S2 | engine consumption | 5/14 | +21 |
| S3 | trigger 4 | 9/14 | +19 |
| S4 (B) | 클라 가시화 | 9/14 + UX | +20 |
| S5 | crit_echo + aura | 11/14 | +11 |
| S6 | auto_resurrect | 12/14 | +13 |
| **S7** | **poison_amplify** | **13/14 (93%)** | **+1** |
| **합** | **13/14 effect + UX** | **93%** | **+100** |
