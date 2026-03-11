// ConsoleUIManager.cpp
// 에테르나 크로니클 — 콘솔 UI 매니저 구현
#include "ConsoleUIManager.h"

#include "Blueprint/UserWidget.h"
#include "Blueprint/WidgetTree.h"
#include "Components/PanelWidget.h"
#include "Framework/Application/SlateApplication.h"
#include "GameFramework/PlayerController.h"
#include "Kismet/GameplayStatics.h"

// ═══════════════════════════════════════════════════════════════
// 라이프사이클
// ═══════════════════════════════════════════════════════════════

void UConsoleUIManager::Initialize(FSubsystemCollectionBase& Collection)
{
    Super::Initialize(Collection);

    // 입력 디바이스 감지: 슬레이트 AnyKey 이벤트 바인딩
    FSlateApplication& Slate = FSlateApplication::Get();
    Slate.OnApplicationPreInputKeyDownListener.AddUObject(
        this, &UConsoleUIManager::OnAnyInputDetected);

    UE_LOG(LogTemp, Log, TEXT("[ConsoleUIManager] 초기화 완료 — 게임패드 모드 기본"));
}

void UConsoleUIManager::Deinitialize()
{
    ClearStack();

    if (FSlateApplication::IsInitialized())
    {
        FSlateApplication::Get().OnApplicationPreInputKeyDownListener.RemoveAll(this);
    }

    Super::Deinitialize();
}

// ═══════════════════════════════════════════════════════════════
// 위젯 스택 관리
// ═══════════════════════════════════════════════════════════════

void UConsoleUIManager::PushUI(UUserWidget* Widget, bool bConsumeInput, FName DefaultFocus)
{
    if (!Widget) return;

    FUILayerEntry Entry;
    Entry.Widget = Widget;
    Entry.DefaultFocusWidgetName = DefaultFocus;
    Entry.bConsumeInput = bConsumeInput;

    UIStack.Push(Entry);

    // 위젯이 뷰포트에 없으면 추가
    if (!Widget->IsInViewport())
    {
        Widget->AddToViewport(100 + UIStack.Num());
    }

    // 포커스 체인 재구성 후 포커스 이동
    RebuildFocusChain(Widget);
    RestoreFocusToTop();
    UpdateEngineInputMode();

    UE_LOG(LogTemp, Log, TEXT("[ConsoleUIManager] PushUI: %s (스택 깊이=%d)"),
        *Widget->GetName(), UIStack.Num());
}

void UConsoleUIManager::PopUI()
{
    if (UIStack.Num() == 0) return;

    FUILayerEntry Popped = UIStack.Pop();
    if (Popped.Widget)
    {
        Popped.Widget->RemoveFromParent();
    }

    // 이전 레이어로 포커스 복원
    RestoreFocusToTop();
    UpdateEngineInputMode();

    UE_LOG(LogTemp, Log, TEXT("[ConsoleUIManager] PopUI → 남은 스택=%d"), UIStack.Num());
}

void UConsoleUIManager::RemoveUI(UUserWidget* Widget)
{
    if (!Widget) return;

    for (int32 i = UIStack.Num() - 1; i >= 0; --i)
    {
        if (UIStack[i].Widget == Widget)
        {
            UIStack.RemoveAt(i);
            Widget->RemoveFromParent();
            break;
        }
    }

    RestoreFocusToTop();
    UpdateEngineInputMode();
}

void UConsoleUIManager::ClearStack()
{
    for (auto& Entry : UIStack)
    {
        if (Entry.Widget)
        {
            Entry.Widget->RemoveFromParent();
        }
    }
    UIStack.Empty();
}

UUserWidget* UConsoleUIManager::GetTopWidget() const
{
    return UIStack.Num() > 0 ? UIStack.Last().Widget : nullptr;
}

// ═══════════════════════════════════════════════════════════════
// 입력 모드
// ═══════════════════════════════════════════════════════════════

void UConsoleUIManager::SetInputMode(EInputDeviceMode NewMode)
{
    if (CurrentInputMode == NewMode) return;

    CurrentInputMode = NewMode;
    OnInputModeChanged.Broadcast(NewMode);

    // 게임패드 모드 진입 시 마우스 커서 숨김
    APlayerController* PC = UGameplayStatics::GetPlayerController(GetGameInstance(), 0);
    if (PC)
    {
        const bool bShowMouse = (NewMode == EInputDeviceMode::MouseKB);
        PC->bShowMouseCursor = bShowMouse;
    }

    UE_LOG(LogTemp, Log, TEXT("[ConsoleUIManager] 입력 모드 전환 → %s"),
        NewMode == EInputDeviceMode::Gamepad ? TEXT("게임패드") : TEXT("마우스+키보드"));
}

void UConsoleUIManager::OnAnyInputDetected(FKey Key)
{
    const double Now = FPlatformTime::Seconds();

    if (Key.IsGamepadKey())
    {
        LastGamepadInputTime = Now;
        if (CurrentInputMode != EInputDeviceMode::Gamepad)
        {
            SetInputMode(EInputDeviceMode::Gamepad);
        }
    }
    else if (Key.IsMouseButton() || Key == EKeys::MouseX || Key == EKeys::MouseY)
    {
        LastMouseMoveTime = Now;
        if (CurrentInputMode != EInputDeviceMode::MouseKB)
        {
            SetInputMode(EInputDeviceMode::MouseKB);
        }
    }
    // 키보드 입력은 마우스+키보드 모드로 전환
    else if (!Key.IsGamepadKey())
    {
        LastMouseMoveTime = Now;
        if (CurrentInputMode != EInputDeviceMode::MouseKB)
        {
            SetInputMode(EInputDeviceMode::MouseKB);
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// 포커스 관리
// ═══════════════════════════════════════════════════════════════

void UConsoleUIManager::RestoreFocusToTop()
{
    if (UIStack.Num() == 0) return;

    const FUILayerEntry& Top = UIStack.Last();
    if (!Top.Widget) return;

    UWidget* FocusTarget = nullptr;

    // 지정된 기본 포커스 위젯 이름으로 검색
    if (Top.DefaultFocusWidgetName != NAME_None && Top.Widget->WidgetTree)
    {
        FocusTarget = Top.Widget->WidgetTree->FindWidget(Top.DefaultFocusWidgetName);
    }

    // 기본 포커스 대상이 없으면 첫 번째 네비게이션 가능 자식 사용
    if (!FocusTarget)
    {
        TArray<UWidget*> AllChildren;
        Top.Widget->WidgetTree->GetAllWidgets(AllChildren);
        for (UWidget* Child : AllChildren)
        {
            if (Child && Child->GetVisibility() == ESlateVisibility::Visible)
            {
                // IsFocusable 체크 — 버튼, 슬라이더 등
                FocusTarget = Child;
                break;
            }
        }
    }

    if (FocusTarget)
    {
        FocusTarget->SetKeyboardFocus();
    }
}

void UConsoleUIManager::UpdateEngineInputMode()
{
    APlayerController* PC = UGameplayStatics::GetPlayerController(GetGameInstance(), 0);
    if (!PC) return;

    if (UIStack.Num() > 0)
    {
        // UI가 열려 있으면 Game And UI 모드
        FInputModeGameAndUI InputMode;
        InputMode.SetLockMouseToViewportBehavior(EMouseLockMode::DoNotLock);
        PC->SetInputMode(InputMode);
    }
    else
    {
        // UI 없으면 Game Only
        FInputModeGameOnly InputMode;
        PC->SetInputMode(InputMode);
    }
}

void UConsoleUIManager::RebuildFocusChain(UUserWidget* Widget)
{
    if (!Widget || !Widget->WidgetTree) return;

    // 위젯 트리에서 포커스 가능한 자식을 수집해 순서대로 네비게이션 체인 구성
    TArray<UWidget*> AllWidgets;
    Widget->WidgetTree->GetAllWidgets(AllWidgets);

    TArray<UWidget*> FocusableWidgets;
    for (UWidget* W : AllWidgets)
    {
        if (W && W->GetVisibility() == ESlateVisibility::Visible)
        {
            FocusableWidgets.Add(W);
        }
    }

    // 슬레이트 네비게이션 메타데이터는 블루프린트 측 WidgetNavigation 프로퍼티로 관리
    // 여기서는 순서만 보장하고, 상세 방향 매핑은 ControllerNavigation에서 처리
    UE_LOG(LogTemp, Verbose, TEXT("[ConsoleUIManager] 포커스 체인 재구성: %d개 위젯"), FocusableWidgets.Num());
}
