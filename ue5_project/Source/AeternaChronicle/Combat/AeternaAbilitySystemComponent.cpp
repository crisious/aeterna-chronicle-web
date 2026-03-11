// AeternaAbilitySystemComponent.cpp
// 에테르나 크로니클 — AbilitySystemComponent 구현

#include "AeternaAbilitySystemComponent.h"
#include "AeternaGameplayAbility.h"
#include "AeternaChronicle/AeternaChronicle.h"
#include "AeternaChronicle/Network/ServerConnection.h"

UAeternaAbilitySystemComponent::UAeternaAbilitySystemComponent()
{
    // ─── GAS 기본 설정 ───
    // 복제 모드: 혼합(Mixed) — 플레이어 캐릭터에 적합
    ReplicationMode = EGameplayEffectReplicationMode::Mixed;
}

void UAeternaAbilitySystemComponent::BeginPlay()
{
    Super::BeginPlay();
}

void UAeternaAbilitySystemComponent::InitializeAbilitySystem(AActor* InOwnerActor, AActor* InAvatarActor)
{
    if (bAbilitiesInitialized)
    {
        UE_LOG(LogAeternaCombat, Warning, TEXT("어빌리티 시스템이 이미 초기화됨"));
        return;
    }

    // 소유자/아바타 설정
    InitAbilityActorInfo(InOwnerActor, InAvatarActor);

    bAbilitiesInitialized = true;
    UE_LOG(LogAeternaCombat, Log, TEXT("어빌리티 시스템 초기화 완료: %s"), *InAvatarActor->GetName());
}

void UAeternaAbilitySystemComponent::GrantDefaultAbilities(
    const TArray<TSubclassOf<UAeternaGameplayAbility>>& AbilitiesToGrant)
{
    // 서버에서만 어빌리티 부여
    if (!GetOwner() || !GetOwner()->HasAuthority())
    {
        return;
    }

    for (const TSubclassOf<UAeternaGameplayAbility>& AbilityClass : AbilitiesToGrant)
    {
        if (!AbilityClass)
        {
            continue;
        }

        FGameplayAbilitySpecHandle Handle = GrantAbility(AbilityClass);
        if (Handle.IsValid())
        {
            GrantedAbilityHandles.Add(Handle);
        }
    }

    UE_LOG(LogAeternaCombat, Log, TEXT("기본 어빌리티 %d개 부여 완료"), AbilitiesToGrant.Num());
}

FGameplayAbilitySpecHandle UAeternaAbilitySystemComponent::GrantAbility(
    TSubclassOf<UAeternaGameplayAbility> AbilityClass, int32 Level)
{
    if (!AbilityClass || !GetOwner()->HasAuthority())
    {
        return FGameplayAbilitySpecHandle();
    }

    // CDO에서 InputID 가져오기
    const UAeternaGameplayAbility* AbilityCDO = AbilityClass.GetDefaultObject();
    const int32 InputID = AbilityCDO ? AbilityCDO->GetInputID() : INDEX_NONE;

    FGameplayAbilitySpec AbilitySpec(AbilityClass, Level, InputID, GetOwner());
    return GiveAbility(AbilitySpec);
}

bool UAeternaAbilitySystemComponent::TryActivateAbilityByTag(FGameplayTag AbilityTag)
{
    FGameplayTagContainer TagContainer;
    TagContainer.AddTag(AbilityTag);

    return TryActivateAbilitiesByTag(TagContainer);
}

bool UAeternaAbilitySystemComponent::TryActivateAbilityByInputID(int32 InputID)
{
    // 부여된 어빌리티 중 해당 InputID를 가진 것 검색 → 활성화
    for (const FGameplayAbilitySpec& Spec : GetActivatableAbilities())
    {
        if (Spec.InputID == InputID)
        {
            return TryActivateAbility(Spec.Handle);
        }
    }

    UE_LOG(LogAeternaCombat, Warning, TEXT("InputID %d에 해당하는 어빌리티 없음"), InputID);
    return false;
}

void UAeternaAbilitySystemComponent::CancelAbilitiesWithTag(FGameplayTag Tag)
{
    FGameplayTagContainer TagContainer;
    TagContainer.AddTag(Tag);

    CancelAbilities(&TagContainer);
}

bool UAeternaAbilitySystemComponent::HasActiveAbilityWithTag(FGameplayTag Tag) const
{
    FGameplayTagContainer TagContainer;
    TagContainer.AddTag(Tag);

    TArray<FGameplayAbilitySpec*> MatchingSpecs;
    // const_cast 필요 — UE API 한계
    const_cast<UAeternaAbilitySystemComponent*>(this)->GetActivatableGameplayAbilitySpecsByAllMatchingTags(
        TagContainer, MatchingSpecs);

    for (const FGameplayAbilitySpec* Spec : MatchingSpecs)
    {
        if (Spec->IsActive())
        {
            return true;
        }
    }
    return false;
}

float UAeternaAbilitySystemComponent::GetCooldownTimeRemaining(FGameplayTag CooldownTag) const
{
    FGameplayTagContainer CooldownTags;
    CooldownTags.AddTag(CooldownTag);

    float TimeRemaining = 0.f;
    float Duration = 0.f;

    // 활성 쿨다운 GE에서 잔여 시간 조회
    const_cast<UAeternaAbilitySystemComponent*>(this)->GetActiveEffectsWithAllTags(
        FGameplayTagContainer(CooldownTag));

    // 간소화 — 실제로는 ActiveGameplayEffects 순회 필요
    TArray<FActiveGameplayEffectHandle> ActiveEffects = 
        const_cast<UAeternaAbilitySystemComponent*>(this)->GetActiveEffects(
            FGameplayEffectQuery::MakeQuery_MatchAllOwningTags(CooldownTags));

    for (const FActiveGameplayEffectHandle& Handle : ActiveEffects)
    {
        const float Remaining = GetActiveGameplayEffect(Handle)->GetTimeRemaining(GetWorld()->GetTimeSeconds());
        TimeRemaining = FMath::Max(TimeRemaining, Remaining);
    }

    return TimeRemaining;
}

void UAeternaAbilitySystemComponent::ApplyInitialStats(
    TSubclassOf<UGameplayEffect> StatsEffect, int32 Level)
{
    if (!StatsEffect || !GetOwner()->HasAuthority())
    {
        return;
    }

    FGameplayEffectContextHandle EffectContext = MakeEffectContext();
    EffectContext.AddSourceObject(GetOwner());

    FGameplayEffectSpecHandle SpecHandle = MakeOutgoingSpec(StatsEffect, Level, EffectContext);
    if (SpecHandle.IsValid())
    {
        ApplyGameplayEffectSpecToSelf(*SpecHandle.Data.Get());
        UE_LOG(LogAeternaCombat, Log, TEXT("초기 스탯 이펙트 적용: Level %d"), Level);
    }
}

void UAeternaAbilitySystemComponent::NotifyServerAbilityUsed(
    FGameplayTag AbilityTag, const FString& TargetId)
{
    // WebSocket으로 서버에 어빌리티 사용 알림 전송
    UAeternaServerConnection* ServerConn = GetOwner()->FindComponentByClass<UAeternaServerConnection>();
    if (ServerConn && ServerConn->IsConnected())
    {
        // JSON 패킷 구성
        TSharedPtr<FJsonObject> Packet = MakeShared<FJsonObject>();
        Packet->SetStringField(TEXT("type"), TEXT("ability_use"));
        Packet->SetStringField(TEXT("ability_tag"), AbilityTag.GetTagName().ToString());
        Packet->SetStringField(TEXT("target_id"), TargetId);

        FString PacketStr;
        TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&PacketStr);
        FJsonSerializer::Serialize(Packet.ToSharedRef(), Writer);

        ServerConn->SendMessage(PacketStr);
    }
}
