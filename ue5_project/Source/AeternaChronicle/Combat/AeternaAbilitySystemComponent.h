// AeternaAbilitySystemComponent.h
// 에테르나 크로니클 — GAS AbilitySystemComponent 확장

#pragma once

#include "CoreMinimal.h"
#include "AbilitySystemComponent.h"
#include "AeternaAbilitySystemComponent.generated.h"

class UAeternaGameplayAbility;

/**
 * UAeternaAbilitySystemComponent
 * 
 * GAS의 핵심 컴포넌트. 어빌리티 부여/활성화/취소를 관리.
 * 클라이언트 예측(Prediction) 지원 및 서버 연동 포함.
 */
UCLASS(ClassGroup=(Custom), meta=(BlueprintSpawnableComponent))
class AETERNACHRONICLE_API UAeternaAbilitySystemComponent : public UAbilitySystemComponent
{
    GENERATED_BODY()

public:
    UAeternaAbilitySystemComponent();

    // ─── 초기화 ───

    /** 
     * 어빌리티 시스템 초기화.
     * 캐릭터 생성 시 호출 — 기본 어빌리티 및 이펙트 부여.
     */
    void InitializeAbilitySystem(AActor* InOwnerActor, AActor* InAvatarActor);

    /**
     * 기본 어빌리티 세트를 일괄 부여.
     * DataAsset 또는 직접 지정 방식으로 어빌리티 TSubclassOf 배열을 받음.
     */
    UFUNCTION(BlueprintCallable, Category = "어빌리티")
    void GrantDefaultAbilities(const TArray<TSubclassOf<UAeternaGameplayAbility>>& AbilitiesToGrant);

    /**
     * 단일 어빌리티 부여 + 핸들 반환.
     */
    UFUNCTION(BlueprintCallable, Category = "어빌리티")
    FGameplayAbilitySpecHandle GrantAbility(TSubclassOf<UAeternaGameplayAbility> AbilityClass, int32 Level = 1);

    // ─── 어빌리티 활성화 ───

    /** 태그 기반 어빌리티 활성화 */
    UFUNCTION(BlueprintCallable, Category = "어빌리티")
    bool TryActivateAbilityByTag(FGameplayTag AbilityTag);

    /** 입력 ID 기반 어빌리티 활성화 (스킬 슬롯 연동) */
    UFUNCTION(BlueprintCallable, Category = "어빌리티")
    bool TryActivateAbilityByInputID(int32 InputID);

    // ─── 어빌리티 취소 ───

    /** 특정 태그를 가진 활성 어빌리티 전부 취소 */
    UFUNCTION(BlueprintCallable, Category = "어빌리티")
    void CancelAbilitiesWithTag(FGameplayTag Tag);

    // ─── 상태 조회 ───

    /** 현재 활성화된 어빌리티가 있는지 확인 */
    UFUNCTION(BlueprintCallable, Category = "어빌리티")
    bool HasActiveAbilityWithTag(FGameplayTag Tag) const;

    /** 쿨다운 잔여 시간 조회 */
    UFUNCTION(BlueprintCallable, Category = "어빌리티")
    float GetCooldownTimeRemaining(FGameplayTag CooldownTag) const;

    // ─── 기본 GameplayEffect (레벨업/버프/디버프) ───

    /** 기본 스탯 이펙트 적용 (캐릭터 초기화 시) */
    UFUNCTION(BlueprintCallable, Category = "이펙트")
    void ApplyInitialStats(TSubclassOf<UGameplayEffect> StatsEffect, int32 Level = 1);

    // ─── 서버 연동 ───

    /** 서버에 어빌리티 사용 알림 (WebSocket 전송) */
    void NotifyServerAbilityUsed(FGameplayTag AbilityTag, const FString& TargetId);

protected:
    virtual void BeginPlay() override;

    // 부여된 기본 어빌리티 핸들 캐시
    UPROPERTY()
    TArray<FGameplayAbilitySpecHandle> GrantedAbilityHandles;

    // 초기화 완료 여부
    bool bAbilitiesInitialized = false;
};
