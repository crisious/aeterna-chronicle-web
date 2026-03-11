// AeternaAttributeSet.h
// 에테르나 크로니클 — GAS 어트리뷰트 셋 (HP, MP, ATK, DEF, SPD, CritRate, CritDmg)

#pragma once

#include "CoreMinimal.h"
#include "AttributeSet.h"
#include "AbilitySystemComponent.h"
#include "AeternaAttributeSet.generated.h"

// ─── 어트리뷰트 접근 매크로 ───
// ATTRIBUTE_ACCESSORS: Getter/Setter/Init 매크로 자동 생성
#define ATTRIBUTE_ACCESSORS(ClassName, PropertyName) \
    GAMEPLAYATTRIBUTE_PROPERTY_GETTER(ClassName, PropertyName) \
    GAMEPLAYATTRIBUTE_VALUE_GETTER(PropertyName) \
    GAMEPLAYATTRIBUTE_VALUE_SETTER(PropertyName) \
    GAMEPLAYATTRIBUTE_VALUE_INITTER(PropertyName)

/**
 * UAeternaAttributeSet
 * 
 * 에테르나 크로니클의 핵심 캐릭터 스탯.
 * GAS의 FGameplayAttributeData 기반으로 네트워크 복제 및 GE 연동.
 */
UCLASS()
class AETERNACHRONICLE_API UAeternaAttributeSet : public UAttributeSet
{
    GENERATED_BODY()

public:
    UAeternaAttributeSet();

    // ─── UAttributeSet 오버라이드 ───
    virtual void PreAttributeChange(const FGameplayAttribute& Attribute, float& NewValue) override;
    virtual void PostGameplayEffectExecute(const FGameplayEffectModCallbackData& Data) override;
    virtual void GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const override;

    // ═══════════════════════════════════════
    // 기본 스탯
    // ═══════════════════════════════════════

    // 체력 (현재)
    UPROPERTY(BlueprintReadOnly, Category = "어트리뷰트|체력", ReplicatedUsing = OnRep_Health)
    FGameplayAttributeData Health;
    ATTRIBUTE_ACCESSORS(UAeternaAttributeSet, Health)

    // 체력 (최대)
    UPROPERTY(BlueprintReadOnly, Category = "어트리뷰트|체력", ReplicatedUsing = OnRep_MaxHealth)
    FGameplayAttributeData MaxHealth;
    ATTRIBUTE_ACCESSORS(UAeternaAttributeSet, MaxHealth)

    // 마나 (현재)
    UPROPERTY(BlueprintReadOnly, Category = "어트리뷰트|마나", ReplicatedUsing = OnRep_Mana)
    FGameplayAttributeData Mana;
    ATTRIBUTE_ACCESSORS(UAeternaAttributeSet, Mana)

    // 마나 (최대)
    UPROPERTY(BlueprintReadOnly, Category = "어트리뷰트|마나", ReplicatedUsing = OnRep_MaxMana)
    FGameplayAttributeData MaxMana;
    ATTRIBUTE_ACCESSORS(UAeternaAttributeSet, MaxMana)

    // ═══════════════════════════════════════
    // 전투 스탯
    // ═══════════════════════════════════════

    // 공격력
    UPROPERTY(BlueprintReadOnly, Category = "어트리뷰트|전투", ReplicatedUsing = OnRep_AttackPower)
    FGameplayAttributeData AttackPower;
    ATTRIBUTE_ACCESSORS(UAeternaAttributeSet, AttackPower)

    // 방어력
    UPROPERTY(BlueprintReadOnly, Category = "어트리뷰트|전투", ReplicatedUsing = OnRep_DefensePower)
    FGameplayAttributeData DefensePower;
    ATTRIBUTE_ACCESSORS(UAeternaAttributeSet, DefensePower)

    // 속도
    UPROPERTY(BlueprintReadOnly, Category = "어트리뷰트|전투", ReplicatedUsing = OnRep_Speed)
    FGameplayAttributeData Speed;
    ATTRIBUTE_ACCESSORS(UAeternaAttributeSet, Speed)

    // 크리티컬 확률 (0.0 ~ 1.0)
    UPROPERTY(BlueprintReadOnly, Category = "어트리뷰트|전투", ReplicatedUsing = OnRep_CriticalRate)
    FGameplayAttributeData CriticalRate;
    ATTRIBUTE_ACCESSORS(UAeternaAttributeSet, CriticalRate)

    // 크리티컬 데미지 배율 (기본 1.5 = 150%)
    UPROPERTY(BlueprintReadOnly, Category = "어트리뷰트|전투", ReplicatedUsing = OnRep_CriticalDamage)
    FGameplayAttributeData CriticalDamage;
    ATTRIBUTE_ACCESSORS(UAeternaAttributeSet, CriticalDamage)

    // ═══════════════════════════════════════
    // 메타 어트리뷰트 (서버 계산용, 복제 안 함)
    // ═══════════════════════════════════════

    // 수신 데미지 (임시 — PostGameplayEffectExecute에서 HP 차감에 사용)
    UPROPERTY(BlueprintReadOnly, Category = "어트리뷰트|메타")
    FGameplayAttributeData IncomingDamage;
    ATTRIBUTE_ACCESSORS(UAeternaAttributeSet, IncomingDamage)

    // 수신 힐량 (임시)
    UPROPERTY(BlueprintReadOnly, Category = "어트리뷰트|메타")
    FGameplayAttributeData IncomingHealing;
    ATTRIBUTE_ACCESSORS(UAeternaAttributeSet, IncomingHealing)

protected:
    // ─── 네트워크 복제 콜백 ───
    UFUNCTION()
    virtual void OnRep_Health(const FGameplayAttributeData& OldHealth);
    UFUNCTION()
    virtual void OnRep_MaxHealth(const FGameplayAttributeData& OldMaxHealth);
    UFUNCTION()
    virtual void OnRep_Mana(const FGameplayAttributeData& OldMana);
    UFUNCTION()
    virtual void OnRep_MaxMana(const FGameplayAttributeData& OldMaxMana);
    UFUNCTION()
    virtual void OnRep_AttackPower(const FGameplayAttributeData& OldAttackPower);
    UFUNCTION()
    virtual void OnRep_DefensePower(const FGameplayAttributeData& OldDefensePower);
    UFUNCTION()
    virtual void OnRep_Speed(const FGameplayAttributeData& OldSpeed);
    UFUNCTION()
    virtual void OnRep_CriticalRate(const FGameplayAttributeData& OldCriticalRate);
    UFUNCTION()
    virtual void OnRep_CriticalDamage(const FGameplayAttributeData& OldCriticalDamage);
};
