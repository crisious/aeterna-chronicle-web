// AeternaAttributeSet.cpp
// 에테르나 크로니클 — 어트리뷰트 셋 구현

#include "AeternaAttributeSet.h"
#include "GameplayEffectExtension.h"
#include "Net/UnrealNetwork.h"
#include "AeternaChronicle/AeternaChronicle.h"

UAeternaAttributeSet::UAeternaAttributeSet()
{
    // ─── 기본값 초기화 ───
    InitHealth(100.f);
    InitMaxHealth(100.f);
    InitMana(50.f);
    InitMaxMana(50.f);
    InitAttackPower(10.f);
    InitDefensePower(5.f);
    InitSpeed(100.f);
    InitCriticalRate(0.05f);      // 5%
    InitCriticalDamage(1.5f);     // 150%
    InitIncomingDamage(0.f);
    InitIncomingHealing(0.f);
}

void UAeternaAttributeSet::PreAttributeChange(const FGameplayAttribute& Attribute, float& NewValue)
{
    Super::PreAttributeChange(Attribute, NewValue);

    // ─── 값 클램핑 (변경 전 보정) ───
    if (Attribute == GetHealthAttribute())
    {
        NewValue = FMath::Clamp(NewValue, 0.f, GetMaxHealth());
    }
    else if (Attribute == GetManaAttribute())
    {
        NewValue = FMath::Clamp(NewValue, 0.f, GetMaxMana());
    }
    else if (Attribute == GetCriticalRateAttribute())
    {
        NewValue = FMath::Clamp(NewValue, 0.f, 1.f);
    }
    else if (Attribute == GetCriticalDamageAttribute())
    {
        // 크리티컬 데미지 최소 100% (1.0)
        NewValue = FMath::Max(NewValue, 1.f);
    }
}

void UAeternaAttributeSet::PostGameplayEffectExecute(const FGameplayEffectModCallbackData& Data)
{
    Super::PostGameplayEffectExecute(Data);

    // ─── 메타 어트리뷰트 처리 ───

    // 데미지 수신 → HP 차감
    if (Data.EvaluatedData.Attribute == GetIncomingDamageAttribute())
    {
        const float LocalDamage = GetIncomingDamage();
        SetIncomingDamage(0.f); // 메타 어트리뷰트 리셋

        if (LocalDamage > 0.f)
        {
            const float NewHealth = GetHealth() - LocalDamage;
            SetHealth(FMath::Clamp(NewHealth, 0.f, GetMaxHealth()));

            UE_LOG(LogAeternaCombat, Log, TEXT("데미지 적용: %.1f → HP: %.1f / %.1f"),
                LocalDamage, GetHealth(), GetMaxHealth());

            // HP가 0 이하면 사망 처리 (이벤트 브로드캐스트)
            if (GetHealth() <= 0.f)
            {
                // TODO: 사망 이벤트 — GameplayEvent로 전파
                UE_LOG(LogAeternaCombat, Warning, TEXT("캐릭터 사망!"));
            }
        }
    }

    // 힐 수신 → HP 증가
    if (Data.EvaluatedData.Attribute == GetIncomingHealingAttribute())
    {
        const float LocalHealing = GetIncomingHealing();
        SetIncomingHealing(0.f);

        if (LocalHealing > 0.f)
        {
            const float NewHealth = GetHealth() + LocalHealing;
            SetHealth(FMath::Clamp(NewHealth, 0.f, GetMaxHealth()));

            UE_LOG(LogAeternaCombat, Log, TEXT("힐 적용: %.1f → HP: %.1f / %.1f"),
                LocalHealing, GetHealth(), GetMaxHealth());
        }
    }
}

void UAeternaAttributeSet::GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const
{
    Super::GetLifetimeReplicatedProps(OutLifetimeProps);

    // ─── 네트워크 복제 등록 ───
    DOREPLIFETIME_CONDITION_NOTIFY(UAeternaAttributeSet, Health, COND_None, REPNOTIFY_Always);
    DOREPLIFETIME_CONDITION_NOTIFY(UAeternaAttributeSet, MaxHealth, COND_None, REPNOTIFY_Always);
    DOREPLIFETIME_CONDITION_NOTIFY(UAeternaAttributeSet, Mana, COND_None, REPNOTIFY_Always);
    DOREPLIFETIME_CONDITION_NOTIFY(UAeternaAttributeSet, MaxMana, COND_None, REPNOTIFY_Always);
    DOREPLIFETIME_CONDITION_NOTIFY(UAeternaAttributeSet, AttackPower, COND_None, REPNOTIFY_Always);
    DOREPLIFETIME_CONDITION_NOTIFY(UAeternaAttributeSet, DefensePower, COND_None, REPNOTIFY_Always);
    DOREPLIFETIME_CONDITION_NOTIFY(UAeternaAttributeSet, Speed, COND_None, REPNOTIFY_Always);
    DOREPLIFETIME_CONDITION_NOTIFY(UAeternaAttributeSet, CriticalRate, COND_None, REPNOTIFY_Always);
    DOREPLIFETIME_CONDITION_NOTIFY(UAeternaAttributeSet, CriticalDamage, COND_None, REPNOTIFY_Always);
}

// ─── OnRep 콜백 구현 ───
void UAeternaAttributeSet::OnRep_Health(const FGameplayAttributeData& OldHealth)
{
    GAMEPLAYATTRIBUTE_REPNOTIFY(UAeternaAttributeSet, Health, OldHealth);
}

void UAeternaAttributeSet::OnRep_MaxHealth(const FGameplayAttributeData& OldMaxHealth)
{
    GAMEPLAYATTRIBUTE_REPNOTIFY(UAeternaAttributeSet, MaxHealth, OldMaxHealth);
}

void UAeternaAttributeSet::OnRep_Mana(const FGameplayAttributeData& OldMana)
{
    GAMEPLAYATTRIBUTE_REPNOTIFY(UAeternaAttributeSet, Mana, OldMana);
}

void UAeternaAttributeSet::OnRep_MaxMana(const FGameplayAttributeData& OldMaxMana)
{
    GAMEPLAYATTRIBUTE_REPNOTIFY(UAeternaAttributeSet, MaxMana, OldMaxMana);
}

void UAeternaAttributeSet::OnRep_AttackPower(const FGameplayAttributeData& OldAttackPower)
{
    GAMEPLAYATTRIBUTE_REPNOTIFY(UAeternaAttributeSet, AttackPower, OldAttackPower);
}

void UAeternaAttributeSet::OnRep_DefensePower(const FGameplayAttributeData& OldDefensePower)
{
    GAMEPLAYATTRIBUTE_REPNOTIFY(UAeternaAttributeSet, DefensePower, OldDefensePower);
}

void UAeternaAttributeSet::OnRep_Speed(const FGameplayAttributeData& OldSpeed)
{
    GAMEPLAYATTRIBUTE_REPNOTIFY(UAeternaAttributeSet, Speed, OldSpeed);
}

void UAeternaAttributeSet::OnRep_CriticalRate(const FGameplayAttributeData& OldCriticalRate)
{
    GAMEPLAYATTRIBUTE_REPNOTIFY(UAeternaAttributeSet, CriticalRate, OldCriticalRate);
}

void UAeternaAttributeSet::OnRep_CriticalDamage(const FGameplayAttributeData& OldCriticalDamage)
{
    GAMEPLAYATTRIBUTE_REPNOTIFY(UAeternaAttributeSet, CriticalDamage, OldCriticalDamage);
}
