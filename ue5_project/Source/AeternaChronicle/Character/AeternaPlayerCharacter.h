// AeternaPlayerCharacter.h
// 에테르나 크로니클 — 플레이어 캐릭터 (입력 바인딩 + HUD 연동)

#pragma once

#include "CoreMinimal.h"
#include "AeternaCharacterBase.h"
#include "InputActionValue.h"
#include "AeternaPlayerCharacter.generated.h"

class UInputMappingContext;
class UInputAction;
class UAeternaServerConnection;
class UCameraComponent;
class USpringArmComponent;

/**
 * AAeternaPlayerCharacter
 * 
 * 플레이어가 조작하는 캐릭터.
 * Enhanced Input 바인딩, 카메라, 서버 연동 포함.
 */
UCLASS()
class AETERNACHRONICLE_API AAeternaPlayerCharacter : public AAeternaCharacterBase
{
    GENERATED_BODY()

public:
    AAeternaPlayerCharacter();

protected:
    virtual void BeginPlay() override;
    virtual void SetupPlayerInputComponent(UInputComponent* PlayerInputComponent) override;
    virtual void Tick(float DeltaTime) override;

    // ─── 카메라 ───

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "카메라")
    TObjectPtr<USpringArmComponent> CameraBoom;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "카메라")
    TObjectPtr<UCameraComponent> FollowCamera;

    // ─── Enhanced Input ───

    /** 입력 매핑 컨텍스트 */
    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "입력")
    TObjectPtr<UInputMappingContext> DefaultMappingContext;

    /** 이동 입력 액션 */
    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "입력")
    TObjectPtr<UInputAction> MoveAction;

    /** 시점 입력 액션 */
    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "입력")
    TObjectPtr<UInputAction> LookAction;

    /** 점프 입력 액션 */
    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "입력")
    TObjectPtr<UInputAction> JumpAction;

    /** 기본 공격 입력 액션 */
    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "입력")
    TObjectPtr<UInputAction> AttackAction;

    /** 스킬 1~4 입력 액션 */
    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "입력")
    TObjectPtr<UInputAction> Skill1Action;
    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "입력")
    TObjectPtr<UInputAction> Skill2Action;
    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "입력")
    TObjectPtr<UInputAction> Skill3Action;
    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "입력")
    TObjectPtr<UInputAction> Skill4Action;

    /** 회피 입력 액션 */
    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "입력")
    TObjectPtr<UInputAction> DodgeAction;

    /** 상호작용 입력 액션 */
    UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "입력")
    TObjectPtr<UInputAction> InteractAction;

    // ─── 입력 핸들러 ───

    void HandleMove(const FInputActionValue& Value);
    void HandleLook(const FInputActionValue& Value);
    void HandleJump();
    void HandleAttack();
    void HandleSkill(int32 SkillSlot);
    void HandleDodge();
    void HandleInteract();

    // ─── 서버 연동 ───

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "네트워크")
    TObjectPtr<UAeternaServerConnection> ServerConnection;

    /** 서버에 위치 동기화 (주기적) */
    void SyncPositionToServer();

    /** 위치 동기화 주기 (초) */
    UPROPERTY(EditDefaultsOnly, Category = "네트워크")
    float PositionSyncInterval = 0.1f; // 100ms

private:
    float TimeSinceLastSync = 0.f;
};
