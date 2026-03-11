// AeternaPlayerCharacter.cpp
// 에테르나 크로니클 — 플레이어 캐릭터 구현

#include "AeternaPlayerCharacter.h"
#include "AeternaChronicle/Combat/AeternaAbilitySystemComponent.h"
#include "AeternaChronicle/Network/ServerConnection.h"
#include "AeternaChronicle/AeternaChronicle.h"

#include "Camera/CameraComponent.h"
#include "GameFramework/SpringArmComponent.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "EnhancedInputComponent.h"
#include "EnhancedInputSubsystems.h"
#include "InputMappingContext.h"

AAeternaPlayerCharacter::AAeternaPlayerCharacter()
{
    PrimaryActorTick.bCanEverTick = true;

    // ─── 카메라 붐 설정 ───
    CameraBoom = CreateDefaultSubobject<USpringArmComponent>(TEXT("CameraBoom"));
    CameraBoom->SetupAttachment(RootComponent);
    CameraBoom->TargetArmLength = 400.f;
    CameraBoom->bUsePawnControlRotation = true;
    CameraBoom->bDoCollisionTest = true;

    // ─── 팔로우 카메라 ───
    FollowCamera = CreateDefaultSubobject<UCameraComponent>(TEXT("FollowCamera"));
    FollowCamera->SetupAttachment(CameraBoom, USpringArmComponent::SocketName);
    FollowCamera->bUsePawnControlRotation = false;

    // ─── 이동 설정 ───
    bUseControllerRotationPitch = false;
    bUseControllerRotationYaw = false;
    bUseControllerRotationRoll = false;

    GetCharacterMovement()->bOrientRotationToMovement = true;
    GetCharacterMovement()->RotationRate = FRotator(0.f, 540.f, 0.f);
    GetCharacterMovement()->MaxWalkSpeed = 600.f;
    GetCharacterMovement()->JumpZVelocity = 600.f;
    GetCharacterMovement()->AirControl = 0.2f;

    // ─── 서버 연결 컴포넌트 ───
    ServerConnection = CreateDefaultSubobject<UAeternaServerConnection>(TEXT("ServerConnection"));
}

void AAeternaPlayerCharacter::BeginPlay()
{
    Super::BeginPlay();

    // Enhanced Input 매핑 등록
    if (const APlayerController* PC = Cast<APlayerController>(Controller))
    {
        if (UEnhancedInputLocalPlayerSubsystem* Subsystem =
            ULocalPlayer::GetSubsystem<UEnhancedInputLocalPlayerSubsystem>(PC->GetLocalPlayer()))
        {
            if (DefaultMappingContext)
            {
                Subsystem->AddMappingContext(DefaultMappingContext, 0);
            }
        }
    }

    // 서버 연결 시작
    if (ServerConnection && IsLocallyControlled())
    {
        ServerConnection->Connect();
    }

    UE_LOG(LogAeterna, Log, TEXT("플레이어 캐릭터 초기화 완료"));
}

void AAeternaPlayerCharacter::SetupPlayerInputComponent(UInputComponent* PlayerInputComponent)
{
    Super::SetupPlayerInputComponent(PlayerInputComponent);

    UEnhancedInputComponent* EnhancedInput = Cast<UEnhancedInputComponent>(PlayerInputComponent);
    if (!EnhancedInput)
    {
        UE_LOG(LogAeterna, Error, TEXT("Enhanced Input Component 캐스팅 실패"));
        return;
    }

    // ─── 입력 바인딩 ───
    if (MoveAction)
    {
        EnhancedInput->BindAction(MoveAction, ETriggerEvent::Triggered, this, &AAeternaPlayerCharacter::HandleMove);
    }
    if (LookAction)
    {
        EnhancedInput->BindAction(LookAction, ETriggerEvent::Triggered, this, &AAeternaPlayerCharacter::HandleLook);
    }
    if (JumpAction)
    {
        EnhancedInput->BindAction(JumpAction, ETriggerEvent::Started, this, &AAeternaPlayerCharacter::HandleJump);
    }
    if (AttackAction)
    {
        EnhancedInput->BindAction(AttackAction, ETriggerEvent::Started, this, &AAeternaPlayerCharacter::HandleAttack);
    }
    if (DodgeAction)
    {
        EnhancedInput->BindAction(DodgeAction, ETriggerEvent::Started, this, &AAeternaPlayerCharacter::HandleDodge);
    }
    if (InteractAction)
    {
        EnhancedInput->BindAction(InteractAction, ETriggerEvent::Started, this, &AAeternaPlayerCharacter::HandleInteract);
    }

    // 스킬 슬롯 (람다 바인딩)
    if (Skill1Action) EnhancedInput->BindAction(Skill1Action, ETriggerEvent::Started, this, 
        [this](const FInputActionValue&) { HandleSkill(1); });
    if (Skill2Action) EnhancedInput->BindAction(Skill2Action, ETriggerEvent::Started, this,
        [this](const FInputActionValue&) { HandleSkill(2); });
    if (Skill3Action) EnhancedInput->BindAction(Skill3Action, ETriggerEvent::Started, this,
        [this](const FInputActionValue&) { HandleSkill(3); });
    if (Skill4Action) EnhancedInput->BindAction(Skill4Action, ETriggerEvent::Started, this,
        [this](const FInputActionValue&) { HandleSkill(4); });
}

void AAeternaPlayerCharacter::Tick(float DeltaTime)
{
    Super::Tick(DeltaTime);

    // 위치 동기화
    TimeSinceLastSync += DeltaTime;
    if (TimeSinceLastSync >= PositionSyncInterval && IsLocallyControlled())
    {
        SyncPositionToServer();
        TimeSinceLastSync = 0.f;
    }
}

// ─── 입력 핸들러 구현 ───

void AAeternaPlayerCharacter::HandleMove(const FInputActionValue& Value)
{
    const FVector2D MovementVector = Value.Get<FVector2D>();

    if (Controller)
    {
        const FRotator Rotation = Controller->GetControlRotation();
        const FRotator YawRotation(0, Rotation.Yaw, 0);

        const FVector ForwardDirection = FRotationMatrix(YawRotation).GetUnitAxis(EAxis::X);
        const FVector RightDirection = FRotationMatrix(YawRotation).GetUnitAxis(EAxis::Y);

        AddMovementInput(ForwardDirection, MovementVector.Y);
        AddMovementInput(RightDirection, MovementVector.X);
    }
}

void AAeternaPlayerCharacter::HandleLook(const FInputActionValue& Value)
{
    const FVector2D LookAxisVector = Value.Get<FVector2D>();
    AddControllerYawInput(LookAxisVector.X);
    AddControllerPitchInput(LookAxisVector.Y);
}

void AAeternaPlayerCharacter::HandleJump()
{
    Jump();
}

void AAeternaPlayerCharacter::HandleAttack()
{
    if (AbilitySystemComponent)
    {
        AbilitySystemComponent->TryActivateAbilityByInputID(0); // 0 = 기본 공격
    }
}

void AAeternaPlayerCharacter::HandleSkill(int32 SkillSlot)
{
    if (AbilitySystemComponent)
    {
        AbilitySystemComponent->TryActivateAbilityByInputID(SkillSlot);
    }
}

void AAeternaPlayerCharacter::HandleDodge()
{
    // TODO: 회피 어빌리티 활성화
    if (AbilitySystemComponent)
    {
        AbilitySystemComponent->TryActivateAbilityByTag(
            FGameplayTag::RequestGameplayTag(FName("Ability.Dodge")));
    }
}

void AAeternaPlayerCharacter::HandleInteract()
{
    // TODO: 상호작용 대상 검색 + 상호작용 실행
    UE_LOG(LogAeterna, Log, TEXT("상호작용 시도"));
}

void AAeternaPlayerCharacter::SyncPositionToServer()
{
    if (!ServerConnection || !ServerConnection->IsConnected())
    {
        return;
    }

    const FVector Location = GetActorLocation();
    const FString State = GetCharacterMovement()->IsFalling() ? TEXT("jumping") :
                          GetVelocity().Size() > 10.f ? TEXT("moving") : TEXT("idle");

    // Protobuf PlayerMove 메시지 전송
    ServerConnection->SendPlayerMove(TEXT("local_player"), Location.X, Location.Y, State);
}
