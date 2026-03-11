// DamageExecution.cpp
// 에테르나 크로니클 — 데미지 Execution 구현

#include "DamageExecution.h"
#include "AeternaAttributeSet.h"
#include "AbilitySystemComponent.h"
#include "AeternaChronicle/AeternaChronicle.h"

// ─── 어트리뷰트 캡처 선언 (정적) ───
struct FAeternaDamageStatics
{
    DECLARE_ATTRIBUTE_CAPTUREDEF(AttackPower);
    DECLARE_ATTRIBUTE_CAPTUREDEF(DefensePower);
    DECLARE_ATTRIBUTE_CAPTUREDEF(CriticalRate);
    DECLARE_ATTRIBUTE_CAPTUREDEF(CriticalDamage);

    FAeternaDamageStatics()
    {
        // Source 캡처 (공격자)
        DEFINE_ATTRIBUTE_CAPTUREDEF(UAeternaAttributeSet, AttackPower, Source, false);
        DEFINE_ATTRIBUTE_CAPTUREDEF(UAeternaAttributeSet, CriticalRate, Source, false);
        DEFINE_ATTRIBUTE_CAPTUREDEF(UAeternaAttributeSet, CriticalDamage, Source, false);

        // Target 캡처 (피격자)
        DEFINE_ATTRIBUTE_CAPTUREDEF(UAeternaAttributeSet, DefensePower, Target, false);
    }
};

static const FAeternaDamageStatics& DamageStatics()
{
    static FAeternaDamageStatics Statics;
    return Statics;
}

UDamageExecution::UDamageExecution()
{
    // ─── 캡처 어트리뷰트 등록 ───
    RelevantAttributesToCapture.Add(DamageStatics().AttackPowerDef);
    RelevantAttributesToCapture.Add(DamageStatics().DefensePowerDef);
    RelevantAttributesToCapture.Add(DamageStatics().CriticalRateDef);
    RelevantAttributesToCapture.Add(DamageStatics().CriticalDamageDef);
}

void UDamageExecution::Execute_Implementation(
    const FGameplayEffectCustomExecutionParameters& ExecutionParams,
    FGameplayEffectCustomExecutionOutput& OutExecutionOutput) const
{
    // ─── 소스/타겟 ASC 획득 ───
    const UAbilitySystemComponent* SourceASC = ExecutionParams.GetSourceAbilitySystemComponent();
    const UAbilitySystemComponent* TargetASC = ExecutionParams.GetTargetAbilitySystemComponent();

    if (!SourceASC || !TargetASC)
    {
        UE_LOG(LogAeternaCombat, Warning, TEXT("데미지 계산 실패: ASC 누락"));
        return;
    }

    const AActor* SourceActor = SourceASC->GetAvatarActor();
    const AActor* TargetActor = TargetASC->GetAvatarActor();

    // ─── 스펙에서 이펙트 컨텍스트 추출 ───
    const FGameplayEffectSpec& Spec = ExecutionParams.GetOwningSpec();

    // ─── 어트리뷰트 값 캡처 ───
    float AttackPower = 0.f;
    ExecutionParams.AttemptCalculateCapturedAttributeMagnitude(
        DamageStatics().AttackPowerDef, FAggregatorEvaluateParameters(), AttackPower);

    float DefensePower = 0.f;
    ExecutionParams.AttemptCalculateCapturedAttributeMagnitude(
        DamageStatics().DefensePowerDef, FAggregatorEvaluateParameters(), DefensePower);

    float CritRate = 0.f;
    ExecutionParams.AttemptCalculateCapturedAttributeMagnitude(
        DamageStatics().CriticalRateDef, FAggregatorEvaluateParameters(), CritRate);

    float CritDamageMultiplier = 1.5f;
    ExecutionParams.AttemptCalculateCapturedAttributeMagnitude(
        DamageStatics().CriticalDamageDef, FAggregatorEvaluateParameters(), CritDamageMultiplier);

    // ─── 어빌리티 배율 (SetByCaller 또는 기본 1.0) ───
    float AbilityMultiplier = Spec.GetSetByCallerMagnitude(
        FGameplayTag::RequestGameplayTag(FName("Data.DamageMultiplier")), false, 1.0f);

    // ─── 속성 상성 배율 ───
    float ElementMultiplier = 1.0f;
    // SetByCaller로 전달받은 속성 인덱스에서 상성 계산
    const float SourceElement = Spec.GetSetByCallerMagnitude(
        FGameplayTag::RequestGameplayTag(FName("Data.SourceElement")), false, 0.f);
    const float TargetElement = Spec.GetSetByCallerMagnitude(
        FGameplayTag::RequestGameplayTag(FName("Data.TargetElement")), false, 0.f);

    if (SourceElement > 0.f && TargetElement > 0.f)
    {
        ElementMultiplier = FElementAffinityTable::GetAffinityMultiplier(
            static_cast<EElementType>(FMath::RoundToInt(SourceElement)),
            static_cast<EElementType>(FMath::RoundToInt(TargetElement)));
    }

    // ═══════════════════════════════════════
    // 데미지 계산 파이프라인
    // ═══════════════════════════════════════

    // 1단계: 기본 데미지 = ATK * 어빌리티 배율
    float BaseDamage = AttackPower * AbilityMultiplier;

    // 2단계: 방어력 감쇄 = BaseDmg * (DEF / (DEF + 100))
    float DefReduction = CalculateDefenseReduction(BaseDamage, DefensePower);
    float NetDamage = BaseDamage - DefReduction;

    // 최소 데미지 보장 (1)
    NetDamage = FMath::Max(NetDamage, 1.f);

    // 3단계: 크리티컬 판정
    bool bCritical = RollCritical(CritRate);
    if (bCritical)
    {
        NetDamage *= CritDamageMultiplier;
    }

    // 4단계: 속성 상성 적용
    float FinalDamage = NetDamage * ElementMultiplier;

    // 최종 데미지 (소수점 절사)
    FinalDamage = FMath::TruncToFloat(FinalDamage);

    UE_LOG(LogAeternaCombat, Log,
        TEXT("데미지 계산: ATK=%.0f * Mult=%.2f = Base=%.0f → DEF=%.0f 감쇄=%.0f → Net=%.0f → %s → 속성=%.2f → Final=%.0f"),
        AttackPower, AbilityMultiplier, BaseDamage,
        DefensePower, DefReduction, NetDamage,
        bCritical ? TEXT("CRIT!") : TEXT("Normal"),
        ElementMultiplier, FinalDamage);

    // ─── 결과 출력: IncomingDamage 메타 어트리뷰트에 기록 ───
    if (FinalDamage > 0.f)
    {
        OutExecutionOutput.AddOutputModifier(
            FGameplayModifierEvaluatedData(
                UAeternaAttributeSet::GetIncomingDamageAttribute(),
                EGameplayModOp::Additive,
                FinalDamage));
    }
}

bool UDamageExecution::RollCritical(float CritRate)
{
    return FMath::FRand() < FMath::Clamp(CritRate, 0.f, 1.f);
}

float UDamageExecution::CalculateDefenseReduction(float BaseDamage, float Defense)
{
    // 방어력 공식: BaseDmg * (DEF / (DEF + 100))
    // DEF=0 → 0% 감쇄, DEF=100 → 50% 감쇄, DEF=200 → 66% 감쇄
    if (Defense <= 0.f)
    {
        return 0.f;
    }
    return BaseDamage * (Defense / (Defense + 100.f));
}
