// AeternaGameplayAbility.h
// 에테르나 크로니클 — 기본 GameplayAbility 클래스

#pragma once

#include "CoreMinimal.h"
#include "Abilities/GameplayAbility.h"
#include "CombatTypes.h"
#include "AeternaGameplayAbility.generated.h"

/**
 * UAeternaGameplayAbility
 * 
 * 모든 에테르나 어빌리티의 기본 클래스.
 * 쿨다운, 코스트, 타겟팅 유형, 속성을 통합 관리.
 */
UCLASS(Abstract)
class AETERNACHRONICLE_API UAeternaGameplayAbility : public UGameplayAbility
{
    GENERATED_BODY()

public:
    UAeternaGameplayAbility();

    // ─── 입력 바인딩 ───

    /** 스킬 슬롯에 바인딩할 입력 ID (0=기본공격, 1~4=스킬슬롯) */
    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "입력")
    int32 InputID = INDEX_NONE;

    int32 GetInputID() const { return InputID; }

    // ─── 전투 속성 ───

    /** 어빌리티 속성 (화염, 빙결 등) */
    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "전투")
    EElementType AbilityElement = EElementType::None;

    /** 타겟팅 유형 */
    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "전투")
    ETargetingType TargetingType = ETargetingType::SingleEnemy;

    /** 기본 데미지 배율 (ATK 대비 %) */
    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "전투")
    float DamageMultiplier = 1.0f;

    /** 사거리 (cm) */
    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "전투")
    float Range = 500.f;

    /** AoE 반경 (AreaOfEffect 타입 전용) */
    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "전투")
    float AreaRadius = 0.f;

    // ─── 코스트 ───

    /** 코스트 유형 */
    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "코스트")
    EAbilityCostType CostType = EAbilityCostType::MP;

    /** 코스트 수치 */
    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "코스트")
    float CostAmount = 10.f;

    // ─── 쿨다운 ───

    /** 쿨다운 GameplayEffect 클래스 (블루프린트에서 지정) */
    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "쿨다운")
    TSubclassOf<UGameplayEffect> CooldownEffectClass;

    /** 쿨다운 시간 (초) */
    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "쿨다운")
    float CooldownDuration = 1.0f;

    /** 쿨다운 태그 */
    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "쿨다운")
    FGameplayTagContainer CooldownTags;

    // ─── 레벨 스케일링 ───

    /** 어빌리티 레벨에 따른 데미지 증가 (레벨당 %) */
    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "스케일링")
    float DamagePerLevel = 0.1f;

    // ─── UGameplayAbility 오버라이드 ───

    /** 어빌리티 활성화 가능 여부 판정 */
    virtual bool CanActivateAbility(
        const FGameplayAbilitySpecHandle Handle,
        const FGameplayAbilityActorInfo* ActorInfo,
        const FGameplayTagContainer* SourceTags = nullptr,
        const FGameplayTagContainer* TargetTags = nullptr,
        FGameplayTagContainer* OptionalRelevantTags = nullptr) const override;

    /** 어빌리티 활성화 */
    virtual void ActivateAbility(
        const FGameplayAbilitySpecHandle Handle,
        const FGameplayAbilityActorInfo* ActorInfo,
        const FGameplayAbilityActivationInfo ActivationInfo,
        const FGameplayEventData* TriggerEventData) override;

    /** 어빌리티 종료 */
    virtual void EndAbility(
        const FGameplayAbilitySpecHandle Handle,
        const FGameplayAbilityActorInfo* ActorInfo,
        const FGameplayAbilityActivationInfo ActivationInfo,
        bool bReplicateEndAbility,
        bool bWasCancelled) override;

    /** 쿨다운 GE 반환 */
    virtual UGameplayEffect* GetCooldownGameplayEffect() const override;

    /** 쿨다운 태그 반환 */
    virtual const FGameplayTagContainer* GetCooldownTags() const override;

protected:
    // ─── 하위 클래스 구현용 ───

    /** 코스트 소모 처리 */
    UFUNCTION(BlueprintCallable, Category = "어빌리티")
    bool CommitAbilityCost();

    /** 레벨 적용 데미지 계산 */
    UFUNCTION(BlueprintCallable, Category = "전투")
    float CalculateScaledDamage() const;

    /** 타겟 유효성 검증 */
    UFUNCTION(BlueprintCallable, Category = "전투")
    bool IsValidTarget(AActor* Target) const;

    /** 서버에 어빌리티 사용 알림 */
    void NotifyServer(const FString& TargetId);

private:
    // 쿨다운 태그 캐시 (GetCooldownTags에서 반환)
    UPROPERTY()
    mutable FGameplayTagContainer TempCooldownTags;
};
