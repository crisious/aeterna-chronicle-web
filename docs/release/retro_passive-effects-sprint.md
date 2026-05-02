# Retro — Phase 55-S1: 패시브 스킬 효과 적용 (Phase 1)

**날짜**: 2026-05-01
**스프린트**: 단일 사이클, 1일
**스코프**: 18종 passive effect 중 상시(always) 5종 실제 적용 + 13종 stub 등록

## 산출물

| 영역 | 파일 | 변경 |
|---|---|---|
| 타입 + 리졸버 | `server/src/skill/passiveResolver.ts` | 신규 — 215줄 |
| 엔진 인터페이스 | `server/src/combat/combatEngine.ts` | `CombatParticipant` 에 5필드 추가 (optional, default 0) |
| 전투 통합 | `server/src/routes/combatRoutes.ts` | battle init 시 캐릭터별 passive resolve + addParticipant 주입 + 응답에 `passiveTrace` 노출 |
| 회귀 테스트 | `tests/unit/passiveResolver.test.ts` | 15 tests (scaling/accumulate/resolve/applyModifiers) |

## 구현된 effect type (5종)

| type | rawValue 의미 | 누적 필드 |
|---|---|---|
| `mp_regen` | 매 턴 회복 MP | `mpRegenPerTurn` |
| `evasion_up` | 회피 % | `evasionAddPercent` |
| `bonus_hit_chance` | 명중 % | `hitChanceAddPercent` |
| `low_hp_atk_up` | 저체력(<30%) ATK +% | `lowHpAtkBonusPercent` |
| `defense_up_conditional` | 피격 시 일시 DEF +% | `defenseUpConditionalPercent` |

## Phase 2 대기 (13종 stub)

`reflect`, `cheat_death`, `auto_resurrect`, `poison_amplify`, `drain_amplify`, `crit_echo`, `battle_regen`, `projectile_reflect`, `move_damage_aura`

→ enum 등록만 됨, accumulate 시 noop. resolve 결과에서 `pending` 배열에 분류되어 트레이스 가능.

이유: 트리거 기반(피격/사망/크리/이동) effect 는 combat engine 의 trigger hook 변경이 필요 — 단일 sprint 스코프 초과.

## 수치 검증

- 레벨별 스케일링은 `PASSIVE_SCALING.damageBonus` 테이블 그대로 reuse: lv1=0%, lv2=8%, lv3=18%, lv4=30%, lv5=45%
- 예: `mp_regen value=5` 레벨 5 → `floor(5 * 1.45) = 7`
- 다중 패시브는 단순 합산 (예: evasion 15 + 8 → 23%)

## 통합 형태

`POST /combat/start` 응답에 `passiveTrace` 추가:

```json
{
  "success": true,
  "combatId": "...",
  "state": {...},
  "participants": [...],
  "passiveTrace": [
    {
      "characterId": "char_uuid",
      "modifiers": { "mpRegenPerTurn": 7, "evasionAddPercent": 15, ... },
      "applied": [{ "skillCode": "ek_ether_charge", "effectType": "mp_regen", "rawValue": 5, "skillLevel": 5, "scaledValue": 7 }],
      "pending": [{ "skillCode": "ek_counter", "effectType": "reflect" }]
    }
  ]
}
```

## 의도적으로 보류한 것 (다음 sprint 후보)

1. **engine consumption** — 현 시점에서는 modifier 가 `CombatParticipant` 에 저장만 됨. 회피 체크 / hit-chance 적용 / mp_regen tick 가산 / 저체력 ATK 부스트 등 실제 사용은 Phase 55-S2 에서 combat engine 트리거 hook 추가 후 진행.
2. **trigger-based 13종** — Phase 2 별도 sprint. trigger 매니저 신규 필요.
3. **클라이언트 UI** — passive 적용 상태 뱃지/툴팁. UX 디자인 합의 후 별도.

## 회귀 영향

- 전체 테스트: 290 → 305 (+15) 통과
- 기존 30+ test suite 무영향 (옵셔널 필드만 추가)
- typecheck/lint: 0 errors

## 한 줄 요약

> 데이터는 있었지만 죽어있던 18종 패시브 중 5종이 살아났다. 나머지 13종은 다음 칼이다.
