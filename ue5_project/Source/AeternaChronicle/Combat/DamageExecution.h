// DamageExecution.h
// 에테르나 크로니클 — 데미지 계산 Execution (GAS GameplayEffectExecutionCalculation)

#pragma once

#include "CoreMinimal.h"
#include "GameplayEffectExecutionCalculation.h"
#include "CombatTypes.h"
#include "DamageExecution.generated.h"

/**
 * UDamageExecution
 * 
 * GAS의 ExecutionCalculation으로 데미지 최종 계산.
 * 공격력 - 방어력 보정, 크리티컬 판정, 속성 상성 배율 적용.
 * 
 * 데미지 공식:
 *   BaseDmg = ATK * AbilityMultiplier
 *   DefReduction = BaseDmg * (DEF / (DEF + 100))
 *   NetDmg = BaseDmg - DefReduction
 *   CritDmg = NetDmg * CritDamageMultiplier (크리티컬 시)
 *   FinalDmg = CritDmg * ElementAffinityMultiplier
 */
UCLASS()
class AETERNACHRONICLE_API UDamageExecution : public UGameplayEffectExecutionCalculation
{
    GENERATED_BODY()

public:
    UDamageExecution();

    /** 데미지 계산 실행 */
    virtual void Execute_Implementation(
        const FGameplayEffectCustomExecutionParameters& ExecutionParams,
        FGameplayEffectCustomExecutionOutput& OutExecutionOutput) const override;

private:
    // ─── 캡처할 어트리뷰트 정의 ───
    // Source (공격자)
    FGameplayEffectAttributeCaptureDefinition AttackPowerDef;
    FGameplayEffectAttributeCaptureDefinition CritRateDef;
    FGameplayEffectAttributeCaptureDefinition CritDamageDef;

    // Target (피격자)
    FGameplayEffectAttributeCaptureDefinition DefensePowerDef;

    // ─── 유틸 ───

    /** 크리티컬 판정 */
    static bool RollCritical(float CritRate);

    /** 방어력 감쇄 계산 */
    static float CalculateDefenseReduction(float BaseDamage, float Defense);
};
