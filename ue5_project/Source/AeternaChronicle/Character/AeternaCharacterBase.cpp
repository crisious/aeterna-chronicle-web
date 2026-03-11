// AeternaCharacterBase.cpp
// 에테르나 크로니클 — 기본 캐릭터 구현

#include "AeternaCharacterBase.h"
#include "AeternaChronicle/Combat/AeternaAbilitySystemComponent.h"
#include "AeternaChronicle/Combat/AeternaAttributeSet.h"
#include "AeternaChronicle/Combat/AeternaGameplayAbility.h"
#include "AeternaChronicle/AeternaChronicle.h"
#include "Net/UnrealNetwork.h"
#include "Components/CapsuleComponent.h"

AAeternaCharacterBase::AAeternaCharacterBase()
{
    PrimaryActorTick.bCanEverTick = true;

    // ─── GAS 컴포넌트 생성 ───
    AbilitySystemComponent = CreateDefaultSubobject<UAeternaAbilitySystemComponent>(TEXT("AbilitySystemComponent"));
    AbilitySystemComponent->SetIsReplicated(true);

    // 어트리뷰트 셋 생성
    AttributeSet = CreateDefaultSubobject<UAeternaAttributeSet>(TEXT("AttributeSet"));
}

UAbilitySystemComponent* AAeternaCharacterBase::GetAbilitySystemComponent() const
{
    return AbilitySystemComponent;
}

float AAeternaCharacterBase::GetHealth() const
{
    return AttributeSet ? AttributeSet->GetHealth() : 0.f;
}

float AAeternaCharacterBase::GetMaxHealth() const
{
    return AttributeSet ? AttributeSet->GetMaxHealth() : 0.f;
}

float AAeternaCharacterBase::GetMana() const
{
    return AttributeSet ? AttributeSet->GetMana() : 0.f;
}

float AAeternaCharacterBase::GetMaxMana() const
{
    return AttributeSet ? AttributeSet->GetMaxMana() : 0.f;
}

bool AAeternaCharacterBase::IsAlive() const
{
    return GetHealth() > 0.f;
}

void AAeternaCharacterBase::BeginPlay()
{
    Super::BeginPlay();
}

void AAeternaCharacterBase::PossessedBy(AController* NewController)
{
    Super::PossessedBy(NewController);

    // 서버에서 GAS 초기화
    if (AbilitySystemComponent)
    {
        AbilitySystemComponent->InitializeAbilitySystem(this, this);
        InitializeAbilities();
    }
}

void AAeternaCharacterBase::InitializeAbilities()
{
    if (!HasAuthority() || !AbilitySystemComponent)
    {
        return;
    }

    // 기본 어빌리티 부여
    if (DefaultAbilities.Num() > 0)
    {
        AbilitySystemComponent->GrantDefaultAbilities(DefaultAbilities);
    }

    // 기본 스탯 이펙트 적용
    if (DefaultStatsEffect)
    {
        AbilitySystemComponent->ApplyInitialStats(DefaultStatsEffect, CharacterLevel);
    }

    UE_LOG(LogAeterna, Log, TEXT("캐릭터 초기화 완료: %s (Lv.%d)"), *GetName(), CharacterLevel);
}

void AAeternaCharacterBase::HandleDeath()
{
    UE_LOG(LogAeterna, Log, TEXT("캐릭터 사망: %s"), *GetName());

    // 사망 이벤트 브로드캐스트
    OnCharacterDied.Broadcast(this);

    // 모든 활성 어빌리티 취소
    if (AbilitySystemComponent)
    {
        AbilitySystemComponent->CancelAllAbilities();
    }

    // 콜리전 비활성화
    GetCapsuleComponent()->SetCollisionEnabled(ECollisionEnabled::NoCollision);
    GetMesh()->SetCollisionEnabled(ECollisionEnabled::NoCollision);

    // 이동 정지
    GetCharacterMovement()->StopMovementImmediately();
    GetCharacterMovement()->DisableMovement();

    // TODO: 사망 애니메이션 재생 → 일정 시간 후 Destroy 또는 리스폰
}

void AAeternaCharacterBase::GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const
{
    Super::GetLifetimeReplicatedProps(OutLifetimeProps);

    DOREPLIFETIME(AAeternaCharacterBase, CharacterLevel);
}

void AAeternaCharacterBase::OnRep_CharacterLevel()
{
    // 레벨 변경 시 클라이언트 UI 갱신 등
    UE_LOG(LogAeterna, Log, TEXT("캐릭터 레벨 변경: %s → Lv.%d"), *GetName(), CharacterLevel);
}
