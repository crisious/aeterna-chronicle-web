// AeternaGameplayAbility.cpp
// 에테르나 크로니클 — 기본 GameplayAbility 구현

#include "AeternaGameplayAbility.h"
#include "AeternaAbilitySystemComponent.h"
#include "AeternaAttributeSet.h"
#include "AbilitySystemComponent.h"
#include "AeternaChronicle/AeternaChronicle.h"

UAeternaGameplayAbility::UAeternaGameplayAbility()
{
    // ─── 기본 설정 ───
    // 인스턴싱 정책: 액터당 하나 (동시 중복 사용 방지)
    InstancingPolicy = EGameplayAbilityInstancingPolicy::InstancedPerActor;

    // 넷 실행 정책: 로컬 예측 → 서버 확인
    NetExecutionPolicy = EGameplayAbilityNetExecutionPolicy::LocalPredicted;

    // 넷 보안 정책: 서버가 최종 권한
    NetSecurityPolicy = EGameplayAbilityNetSecurityPolicy::ServerOnlyTermination;
}

bool UAeternaGameplayAbility::CanActivateAbility(
    const FGameplayAbilitySpecHandle Handle,
    const FGameplayAbilityActorInfo* ActorInfo,
    const FGameplayTagContainer* SourceTags,
    const FGameplayTagContainer* TargetTags,
    FGameplayTagContainer* OptionalRelevantTags) const
{
    // 부모 검증 (태그 조건, 쿨다운 등)
    if (!Super::CanActivateAbility(Handle, ActorInfo, SourceTags, TargetTags, OptionalRelevantTags))
    {
        return false;
    }

    // ─── 코스트 검증 ───
    const UAbilitySystemComponent* ASC = ActorInfo->AbilitySystemComponent.Get();
    if (!ASC)
    {
        return false;
    }

    const UAeternaAttributeSet* AttrSet = ASC->GetSet<UAeternaAttributeSet>();
    if (!AttrSet)
    {
        return false;
    }

    switch (CostType)
    {
    case EAbilityCostType::MP:
        if (AttrSet->GetMana() < CostAmount)
        {
            UE_LOG(LogAeternaCombat, Verbose, TEXT("마나 부족: %.1f / 필요: %.1f"), 
                AttrSet->GetMana(), CostAmount);
            return false;
        }
        break;

    case EAbilityCostType::HP:
        if (AttrSet->GetHealth() <= CostAmount) // HP 코스트는 사망 방지
        {
            return false;
        }
        break;

    default:
        break;
    }

    return true;
}

void UAeternaGameplayAbility::ActivateAbility(
    const FGameplayAbilitySpecHandle Handle,
    const FGameplayAbilityActorInfo* ActorInfo,
    const FGameplayAbilityActivationInfo ActivationInfo,
    const FGameplayEventData* TriggerEventData)
{
    // 어빌리티 커밋 (코스트 소모 + 쿨다운 적용)
    if (!CommitAbility(Handle, ActorInfo, ActivationInfo))
    {
        EndAbility(Handle, ActorInfo, ActivationInfo, true, true);
        return;
    }

    UE_LOG(LogAeternaCombat, Log, TEXT("어빌리티 활성화: %s (속성: %d, 타겟: %d)"),
        *GetName(), static_cast<int32>(AbilityElement), static_cast<int32>(TargetingType));

    // 하위 클래스에서 구체적 로직 구현
    // Blueprint에서 ActivateAbility 이벤트로 구현 가능
}

void UAeternaGameplayAbility::EndAbility(
    const FGameplayAbilitySpecHandle Handle,
    const FGameplayAbilityActorInfo* ActorInfo,
    const FGameplayAbilityActivationInfo ActivationInfo,
    bool bReplicateEndAbility,
    bool bWasCancelled)
{
    if (bWasCancelled)
    {
        UE_LOG(LogAeternaCombat, Log, TEXT("어빌리티 취소됨: %s"), *GetName());
    }

    Super::EndAbility(Handle, ActorInfo, ActivationInfo, bReplicateEndAbility, bWasCancelled);
}

UGameplayEffect* UAeternaGameplayAbility::GetCooldownGameplayEffect() const
{
    if (CooldownEffectClass)
    {
        return CooldownEffectClass->GetDefaultObject<UGameplayEffect>();
    }
    return nullptr;
}

const FGameplayTagContainer* UAeternaGameplayAbility::GetCooldownTags() const
{
    // 쿨다운 GE의 태그 + 커스텀 태그 병합
    TempCooldownTags.Reset();

    const UGameplayEffect* CooldownGE = GetCooldownGameplayEffect();
    if (CooldownGE)
    {
        CooldownGE->GetGrantedTags().GetGameplayTagArray(TempCooldownTags);
    }

    TempCooldownTags.AppendTags(CooldownTags);
    return &TempCooldownTags;
}

bool UAeternaGameplayAbility::CommitAbilityCost()
{
    UAbilitySystemComponent* ASC = GetAbilitySystemComponentFromActorInfo();
    if (!ASC)
    {
        return false;
    }

    UAeternaAttributeSet* AttrSet = const_cast<UAeternaAttributeSet*>(ASC->GetSet<UAeternaAttributeSet>());
    if (!AttrSet)
    {
        return false;
    }

    // 코스트 차감
    switch (CostType)
    {
    case EAbilityCostType::MP:
        AttrSet->SetMana(AttrSet->GetMana() - CostAmount);
        break;
    case EAbilityCostType::HP:
        AttrSet->SetHealth(AttrSet->GetHealth() - CostAmount);
        break;
    default:
        break;
    }

    return true;
}

float UAeternaGameplayAbility::CalculateScaledDamage() const
{
    const int32 AbilityLevel = GetAbilityLevel();

    // 기본 배율 + 레벨 스케일링
    const float LevelScaling = 1.f + (DamagePerLevel * (AbilityLevel - 1));

    UAbilitySystemComponent* ASC = GetAbilitySystemComponentFromActorInfo();
    if (!ASC)
    {
        return DamageMultiplier * LevelScaling;
    }

    const UAeternaAttributeSet* AttrSet = ASC->GetSet<UAeternaAttributeSet>();
    if (!AttrSet)
    {
        return DamageMultiplier * LevelScaling;
    }

    // ATK * 배율 * 레벨 스케일링
    return AttrSet->GetAttackPower() * DamageMultiplier * LevelScaling;
}

bool UAeternaGameplayAbility::IsValidTarget(AActor* Target) const
{
    if (!Target)
    {
        return TargetingType == ETargetingType::Self;
    }

    // 사거리 체크
    const AActor* OwnerActor = GetAvatarActorFromActorInfo();
    if (OwnerActor && Range > 0.f)
    {
        const float Distance = FVector::Dist(OwnerActor->GetActorLocation(), Target->GetActorLocation());
        if (Distance > Range)
        {
            return false;
        }
    }

    return true;
}

void UAeternaGameplayAbility::NotifyServer(const FString& TargetId)
{
    UAbilitySystemComponent* ASC = GetAbilitySystemComponentFromActorInfo();
    if (UAeternaAbilitySystemComponent* AeternaASC = Cast<UAeternaAbilitySystemComponent>(ASC))
    {
        AeternaASC->NotifyServerAbilityUsed(AbilityTags.First(), TargetId);
    }
}
