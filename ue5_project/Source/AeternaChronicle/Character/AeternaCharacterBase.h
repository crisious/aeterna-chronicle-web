// AeternaCharacterBase.h
// 에테르나 크로니클 — 기본 캐릭터 클래스 (GAS 통합)

#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Character.h"
#include "AbilitySystemInterface.h"
#include "GameplayTagContainer.h"
#include "AeternaChronicle/Combat/CombatTypes.h"
#include "AeternaCharacterBase.generated.h"

class UAeternaAbilitySystemComponent;
class UAeternaAttributeSet;
class UAeternaGameplayAbility;
class UGameplayEffect;

/**
 * AAeternaCharacterBase
 * 
 * 모든 에테르나 캐릭터(플레이어, NPC, 몬스터)의 기본 클래스.
 * IAbilitySystemInterface 구현으로 GAS와 통합.
 */
UCLASS(Abstract)
class AETERNACHRONICLE_API AAeternaCharacterBase : public ACharacter, public IAbilitySystemInterface
{
    GENERATED_BODY()

public:
    AAeternaCharacterBase();

    // ─── IAbilitySystemInterface ───
    virtual UAbilitySystemComponent* GetAbilitySystemComponent() const override;

    // ─── 어트리뷰트 접근 ───

    /** 어트리뷰트 셋 반환 */
    UFUNCTION(BlueprintCallable, Category = "어트리뷰트")
    UAeternaAttributeSet* GetAttributeSet() const { return AttributeSet; }

    /** 현재 HP */
    UFUNCTION(BlueprintCallable, Category = "어트리뷰트")
    float GetHealth() const;

    /** 최대 HP */
    UFUNCTION(BlueprintCallable, Category = "어트리뷰트")
    float GetMaxHealth() const;

    /** 현재 MP */
    UFUNCTION(BlueprintCallable, Category = "어트리뷰트")
    float GetMana() const;

    /** 최대 MP */
    UFUNCTION(BlueprintCallable, Category = "어트리뷰트")
    float GetMaxMana() const;

    /** 생존 여부 */
    UFUNCTION(BlueprintCallable, Category = "상태")
    bool IsAlive() const;

    // ─── 전투 속성 ───

    /** 캐릭터 기본 속성 (원소) */
    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "전투")
    EElementType CharacterElement = EElementType::None;

    /** 캐릭터 레벨 */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "스탯", ReplicatedUsing = OnRep_CharacterLevel)
    int32 CharacterLevel = 1;

    // ─── 사망 처리 ───

    /** 사망 이벤트 (블루프린트 바인딩용) */
    DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnCharacterDied, AAeternaCharacterBase*, DiedCharacter);
    
    UPROPERTY(BlueprintAssignable, Category = "이벤트")
    FOnCharacterDied OnCharacterDied;

    /** 사망 처리 */
    UFUNCTION(BlueprintCallable, Category = "전투")
    virtual void HandleDeath();

protected:
    virtual void BeginPlay() override;
    virtual void PossessedBy(AController* NewController) override;
    virtual void GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const override;

    // ─── GAS 컴포넌트 ───

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "어빌리티", meta = (AllowPrivateAccess = "true"))
    TObjectPtr<UAeternaAbilitySystemComponent> AbilitySystemComponent;

    UPROPERTY()
    TObjectPtr<UAeternaAttributeSet> AttributeSet;

    // ─── 기본 어빌리티/이펙트 (에디터에서 지정) ───

    /** 캐릭터 기본 어빌리티 목록 */
    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "어빌리티")
    TArray<TSubclassOf<UAeternaGameplayAbility>> DefaultAbilities;

    /** 캐릭터 기본 스탯 이펙트 (초기화용) */
    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "어빌리티")
    TSubclassOf<UGameplayEffect> DefaultStatsEffect;

    /** GAS 초기화 (서버에서 호출) */
    virtual void InitializeAbilities();

    // ─── 복제 콜백 ───
    UFUNCTION()
    virtual void OnRep_CharacterLevel();
};
