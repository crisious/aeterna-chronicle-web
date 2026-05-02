# Retro — Phase 55-S4 (B): 패시브 클라이언트 가시화

**날짜**: 2026-05-01
**스프린트**: 단일 사이클, 1일
**스코프**: 스킬 트리 UI 디테일 패널에 패시브 효과 한국어 표시 — 9 구현 + 5 stub + unknown fallback

## 산출물

| 영역 | 파일 | 변경 |
|---|---|---|
| 한국어 변환기 | `client/src/skills/passiveEffectFormatter.ts` | 신규 — 14 effect type + status 분류 |
| 레벨 스케일링 미러 | `client/src/skills/passiveLevelScaling.ts` | 신규 — 서버 PASSIVE_SCALING 동기화 |
| UI 통합 | `client/src/ui/SkillTreeUI.ts` | SkillDef 에 `effect`/`type` 옵셔널 추가, `_showSkillDetail` 에 패시브 라인 |
| 회귀 테스트 | `tests/unit/passiveEffectFormatter.test.ts` | 20 tests |

## 표시 예시

| 패시브 (skill+effect) | 스킬 트리 디테일 패널 표시 (lv=5 기준) |
|---|---|
| ek_ether_charge / mp_regen 5 | **패시브: 매 턴 MP +7 회복** |
| sw_evasion / evasion_up 15 | **패시브: 회피율 +21%** |
| mb_low_hp / low_hp_atk_up 80 | **패시브: HP 30% 미만 시 공격력 +116%** |
| ek_counter / reflect 20 | **패시브: 물리 피격 시 29% 데미지 반사** |
| tg_chronostasis / battle_regen 10 | **패시브: 매 턴 HP +14 회복** |
| ek_indomitable / cheat_death 1 | **패시브: 사망 시 1회 1HP 로 생존** |
| (Phase 4) auto_resurrect | **패시브: 사망 후 일정 시간 뒤 부활 (구현 대기)** |

## 색상 분류 (status hint)

- `implemented`: `#88ccff` (밝은 파랑) — 9종
- `pending`: `#999999` (회색) — 5종 (Phase 4 대기)
- `unknown`: `#cc6666` (붉은 회색) — 서버 데이터 누락/미인식 fallback

## 디자인 결정

1. **레벨 스케일링 미러**: 서버 `PASSIVE_SCALING.damageBonus` 와 동일한 식을 클라에 복제. 자동 동기화는 안 되지만 단순 매핑이라 drift 위험 낮음. 추후 SSOT 가 되면 별 sprint 에서 통합.
2. **lv=0 fallback**: 미해금 스킬도 디테일 보여줄 때 `Math.max(1, currentLevel||1)` 로 레벨 1 기준 효과 미리보기.
3. **type 가드**: `skill.type === 'passive'` 체크 후에만 렌더 — active/ultimate 는 효과 라인 미표시.
4. **SkillDef 확장 옵셔널**: 기존 클라 코드(DEFAULT_SKILLS fallback) 가 `type`/`effect` 없이도 깨지지 않게 옵셔널.

## 검증

- 단위 테스트: 20 — 9 구현 + 5 stub + 1 unknown + 5 상수 검증
- 전체 unit: 345 → **365** (+20)
- 전체 contract: 31
- typecheck/lint: 0 errors

## 배틀 화면 가시화는 보류 (B 의 다른 부분)

`BattleScene` 의 MISS! 텍스트, mp_regen popup, passive 뱃지 등은 **미구현**. 사유:
- 클라 BattleScene 은 자체 시뮬레이터 — 서버 ActionResult 가 가시 전투에 흐르지 않음
- 통합하려면 (a) 클라 패시브 미러 (S1+S2 로직 복제) 또는 (b) 서버 tick action[] socket broadcast 가 필요
- 둘 다 별 sprint 가치. 현 sprint 에서는 스킬 UI 만으로 사용자 가시 가치 확보.

## 한 줄 요약

> 사용자가 스킬 트리에서 패시브 효과를 한국어로 즉시 확인. 18종 중 9 구현 / 5 대기 / unknown 의 색상 분류로 진척도 가시화.

## P55 누적 (이번 세션)

| Sprint | 스코프 | tests | 누적 effect 구현 |
|---|---|---|---|
| S1 | resolver, modifier 산출 | +15 | 0 → 5 |
| S2 | engine consumption (상시) | +21 | 5 / 18 |
| S3 | 트리거 4종 | +19 | 9 / 18 |
| S4 (B) | 클라 UI 가시화 | +20 | 9 / 18 (가시화) |
| **합** | **2 phase 구현 + 가시화** | **+75** | **50%** |
