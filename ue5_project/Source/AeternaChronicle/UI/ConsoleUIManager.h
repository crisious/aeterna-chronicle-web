// ConsoleUIManager.h
// 에테르나 크로니클 — 콘솔 UI 매니저
// 위젯 스택 관리, 포커스 체인, 게임패드/마우스 모드 전환
#pragma once

#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "ConsoleUIManager.generated.h"

class UUserWidget;
class UControllerNavigation;

// ─── 입력 모드 열거 ─────────────────────────────────────────
UENUM(BlueprintType)
enum class EInputDeviceMode : uint8
{
    Gamepad   UMETA(DisplayName = "게임패드"),
    MouseKB   UMETA(DisplayName = "마우스+키보드")
};

// ─── UI 레이어 스택 항목 ─────────────────────────────────────
USTRUCT(BlueprintType)
struct FUILayerEntry
{
    GENERATED_BODY()

    // 레이어에 표시 중인 위젯
    UPROPERTY() TObjectPtr<UUserWidget> Widget = nullptr;

    // 해당 레이어 진입 시 기본 포커스 대상 (옵션)
    UPROPERTY() FName DefaultFocusWidgetName;

    // 레이어 아래 입력을 차단할지 여부
    UPROPERTY() bool bConsumeInput = true;
};

// ─── 입력 모드 변경 델리게이트 ───────────────────────────────
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnInputModeChanged, EInputDeviceMode, NewMode);

// ═══════════════════════════════════════════════════════════════
// UConsoleUIManager
// GameInstanceSubsystem — 전체 게임 인스턴스 수명 동안 유지
// ═══════════════════════════════════════════════════════════════
UCLASS()
class AETERNACHRONICLE_API UConsoleUIManager : public UGameInstanceSubsystem
{
    GENERATED_BODY()

public:
    // ── 라이프사이클 ────────────────────────────────────────
    virtual void Initialize(FSubsystemCollectionBase& Collection) override;
    virtual void Deinitialize() override;

    // ── 위젯 스택 관리 ──────────────────────────────────────

    /** 위젯을 스택 최상단에 푸시. bConsumeInput=true면 하위 레이어 입력 차단 */
    UFUNCTION(BlueprintCallable, Category = "ConsoleUI")
    void PushUI(UUserWidget* Widget, bool bConsumeInput = true, FName DefaultFocus = NAME_None);

    /** 스택 최상단 위젯 제거 후 이전 레이어로 포커스 복원 */
    UFUNCTION(BlueprintCallable, Category = "ConsoleUI")
    void PopUI();

    /** 특정 위젯을 스택에서 직접 제거 (순서 무관) */
    UFUNCTION(BlueprintCallable, Category = "ConsoleUI")
    void RemoveUI(UUserWidget* Widget);

    /** 스택 전체 초기화 (씬 전환 시) */
    UFUNCTION(BlueprintCallable, Category = "ConsoleUI")
    void ClearStack();

    /** 현재 최상단 위젯 반환 */
    UFUNCTION(BlueprintPure, Category = "ConsoleUI")
    UUserWidget* GetTopWidget() const;

    /** 현재 스택 깊이 */
    UFUNCTION(BlueprintPure, Category = "ConsoleUI")
    int32 GetStackDepth() const { return UIStack.Num(); }

    // ── 입력 모드 ───────────────────────────────────────────

    /** 현재 입력 디바이스 모드 */
    UFUNCTION(BlueprintPure, Category = "ConsoleUI")
    EInputDeviceMode GetCurrentInputMode() const { return CurrentInputMode; }

    /** 수동 입력 모드 전환 */
    UFUNCTION(BlueprintCallable, Category = "ConsoleUI")
    void SetInputMode(EInputDeviceMode NewMode);

    /** 입력 모드 변경 이벤트 */
    UPROPERTY(BlueprintAssignable, Category = "ConsoleUI")
    FOnInputModeChanged OnInputModeChanged;

    // ── 포커스 관리 ─────────────────────────────────────────

    /** 최상단 레이어의 기본 포커스 위젯으로 포커스 이동 */
    UFUNCTION(BlueprintCallable, Category = "ConsoleUI")
    void RestoreFocusToTop();

protected:
    // 위젯 스택 (인덱스 0 = 바닥, Last = 최상단)
    UPROPERTY() TArray<FUILayerEntry> UIStack;

    // 현재 입력 모드
    UPROPERTY() EInputDeviceMode CurrentInputMode = EInputDeviceMode::Gamepad;

    // 마지막 마우스 이동 감지 시간 — 자동 모드 전환용
    double LastMouseMoveTime = 0.0;

    // 마지막 게임패드 입력 감지 시간
    double LastGamepadInputTime = 0.0;

    /** 입력 감지 콜백 (AnyKey) — 마우스↔게임패드 자동 전환 */
    void OnAnyInputDetected(FKey Key);

    /** 최상단 레이어에 맞게 UE 입력 모드 (UI Only / Game And UI) 갱신 */
    void UpdateEngineInputMode();

    /** 포커스 체인을 최상단 위젯 내부 네비게이션 가능 자식으로 자동 구성 */
    void RebuildFocusChain(UUserWidget* Widget);
};
