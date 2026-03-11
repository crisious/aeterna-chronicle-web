// ControllerNavigation.cpp
// 에테르나 크로니클 — 게임패드 포커스 내비게이션 구현
#include "ControllerNavigation.h"
#include "ConsoleUIManager.h"

#include "Blueprint/UserWidget.h"
#include "Blueprint/WidgetTree.h"
#include "Components/Button.h"
#include "Components/Slider.h"
#include "Components/ComboBoxString.h"
#include "Framework/Application/SlateApplication.h"
#include "GameFramework/PlayerController.h"
#include "Kismet/GameplayStatics.h"

// ═══════════════════════════════════════════════════════════════
// 생성자 / 라이프사이클
// ═══════════════════════════════════════════════════════════════

UControllerNavigation::UControllerNavigation()
{
    PrimaryComponentTick.bCanEverTick = true;
    PrimaryComponentTick.TickInterval = 0.016f; // ~60Hz 폴링
}

void UControllerNavigation::BeginPlay()
{
    Super::BeginPlay();

    // ConsoleUIManager 참조 획득
    if (UGameInstance* GI = UGameplayStatics::GetGameInstance(this))
    {
        UIManager = GI->GetSubsystem<UConsoleUIManager>();
    }

    // Enhanced Input 바인딩 — 게임패드 액션 매핑
    APlayerController* PC = Cast<APlayerController>(GetOwner());
    if (PC && PC->InputComponent)
    {
        // D-pad 바인딩
        PC->InputComponent->BindAction("UI_DPadUp", IE_Pressed, this,
            &UControllerNavigation::HandleDPadInput, ENavDirection::Up);
        PC->InputComponent->BindAction("UI_DPadDown", IE_Pressed, this,
            &UControllerNavigation::HandleDPadInput, ENavDirection::Down);
        PC->InputComponent->BindAction("UI_DPadLeft", IE_Pressed, this,
            &UControllerNavigation::HandleDPadInput, ENavDirection::Left);
        PC->InputComponent->BindAction("UI_DPadRight", IE_Pressed, this,
            &UControllerNavigation::HandleDPadInput, ENavDirection::Right);

        // 확인/취소 (프리셋에 따라 매핑 달라짐 — HandleConfirm/Cancel 내부에서 분기)
        PC->InputComponent->BindAction("UI_FaceBottom", IE_Pressed, this,
            &UControllerNavigation::HandleConfirm);
        PC->InputComponent->BindAction("UI_FaceRight", IE_Pressed, this,
            &UControllerNavigation::HandleCancel);

        // 범퍼 → 탭 전환
        PC->InputComponent->BindAction("UI_LeftBumper", IE_Pressed, this,
            &UControllerNavigation::HandleTabSwitch, -1);
        PC->InputComponent->BindAction("UI_RightBumper", IE_Pressed, this,
            &UControllerNavigation::HandleTabSwitch, 1);
    }

    UE_LOG(LogTemp, Log, TEXT("[ControllerNav] 초기화 완료 — 매핑=%s"),
        CurrentMapping == EButtonMappingPreset::Western ? TEXT("서양식") : TEXT("일본식"));
}

// ═══════════════════════════════════════════════════════════════
// Tick — 아날로그 스틱 연속 입력 처리
// ═══════════════════════════════════════════════════════════════

void UControllerNavigation::TickComponent(float DeltaTime, ELevelTick TickType,
    FActorComponentTickFunction* ThisTickFunction)
{
    Super::TickComponent(DeltaTime, TickType, ThisTickFunction);

    // UIManager가 없거나 UI 스택이 비어있으면 스킵
    if (!UIManager.IsValid() || UIManager->GetStackDepth() == 0) return;

    // 왼쪽 스틱 아날로그 값 읽기
    APlayerController* PC = Cast<APlayerController>(GetOwner());
    if (!PC) return;

    const float AxisX = PC->GetInputAnalogKeyState(EKeys::Gamepad_LeftX);
    const float AxisY = PC->GetInputAnalogKeyState(EKeys::Gamepad_LeftY);
    const FVector2D StickValue(AxisX, AxisY);

    if (StickValue.Size() > StickDeadzone)
    {
        const ENavDirection Dir = StickToDirection(StickValue);

        if (!bStickHeld || Dir != LastStickDirection)
        {
            // 새로운 방향 — 즉시 반응
            bStickHeld = true;
            LastStickDirection = Dir;
            StickHoldTime = 0.0f;
            LastRepeatTime = 0.0f;
            NavigateFocus(Dir);
        }
        else
        {
            // 같은 방향 유지 — 반복 입력
            StickHoldTime += DeltaTime;
            if (StickHoldTime > StickRepeatDelay)
            {
                LastRepeatTime += DeltaTime;
                if (LastRepeatTime >= StickRepeatInterval)
                {
                    LastRepeatTime = 0.0f;
                    NavigateFocus(Dir);
                }
            }
        }
    }
    else
    {
        bStickHeld = false;
        StickHoldTime = 0.0f;
    }
}

// ═══════════════════════════════════════════════════════════════
// 버튼 매핑
// ═══════════════════════════════════════════════════════════════

void UControllerNavigation::SetButtonMapping(EButtonMappingPreset Preset)
{
    CurrentMapping = Preset;
    UE_LOG(LogTemp, Log, TEXT("[ControllerNav] 버튼 매핑 전환 → %s"),
        Preset == EButtonMappingPreset::Western ? TEXT("서양식") : TEXT("일본식"));
}

// ═══════════════════════════════════════════════════════════════
// 내비게이션
// ═══════════════════════════════════════════════════════════════

void UControllerNavigation::NavigateFocus(ENavDirection Direction)
{
    UWidget* Current = GetCurrentFocusedWidget();
    if (!Current) return;

    UWidget* Next = FindNextFocusWidget(Current, Direction);
    if (Next && Next != Current)
    {
        Next->SetKeyboardFocus();
    }
}

UWidget* UControllerNavigation::GetCurrentFocusedWidget() const
{
    // 슬레이트에서 현재 키보드 포커스 위젯 추적
    TSharedPtr<SWidget> FocusedSlate = FSlateApplication::Get().GetKeyboardFocusedWidget();
    if (!FocusedSlate.IsValid()) return nullptr;

    // 최상단 UI 위젯 트리에서 매칭되는 UWidget 검색
    if (!UIManager.IsValid()) return nullptr;
    UUserWidget* TopWidget = UIManager->GetTopWidget();
    if (!TopWidget || !TopWidget->WidgetTree) return nullptr;

    TArray<UWidget*> AllWidgets;
    TopWidget->WidgetTree->GetAllWidgets(AllWidgets);

    for (UWidget* W : AllWidgets)
    {
        if (W && W->GetCachedWidget() == FocusedSlate)
        {
            return W;
        }
    }
    return nullptr;
}

void UControllerNavigation::SwitchTab(int32 Direction)
{
    HandleTabSwitch(Direction);
}

// ═══════════════════════════════════════════════════════════════
// 입력 핸들러
// ═══════════════════════════════════════════════════════════════

void UControllerNavigation::HandleDPadInput(ENavDirection Direction)
{
    NavigateFocus(Direction);
}

ENavDirection UControllerNavigation::StickToDirection(FVector2D StickValue) const
{
    // 주 축 결정 — 절대값이 큰 쪽 우선
    if (FMath::Abs(StickValue.X) > FMath::Abs(StickValue.Y))
    {
        return StickValue.X > 0.0f ? ENavDirection::Right : ENavDirection::Left;
    }
    else
    {
        // UE 좌표계: Y 양수 = 위
        return StickValue.Y > 0.0f ? ENavDirection::Up : ENavDirection::Down;
    }
}

void UControllerNavigation::HandleConfirm()
{
    // 일본식: FaceBottom(A/Cross) = 취소, FaceRight(B/Circle) = 확인
    // 서양식: FaceBottom(A/Cross) = 확인 (기본)
    if (CurrentMapping == EButtonMappingPreset::Japanese)
    {
        // 일본식에서 FaceBottom은 취소
        OnCancelPressed.Broadcast();
        if (UIManager.IsValid())
        {
            UIManager->PopUI();
        }
        return;
    }

    // 서양식 — 확인 동작
    OnConfirmPressed.Broadcast();

    // 현재 포커스 위젯이 버튼이면 클릭 시뮬레이션
    UWidget* Focused = GetCurrentFocusedWidget();
    if (UButton* Btn = Cast<UButton>(Focused))
    {
        // 블루프린트 OnClicked 트리거
        Btn->OnClicked.Broadcast();
    }
}

void UControllerNavigation::HandleCancel()
{
    if (CurrentMapping == EButtonMappingPreset::Japanese)
    {
        // 일본식에서 FaceRight(B/Circle) = 확인
        OnConfirmPressed.Broadcast();

        UWidget* Focused = GetCurrentFocusedWidget();
        if (UButton* Btn = Cast<UButton>(Focused))
        {
            Btn->OnClicked.Broadcast();
        }
        return;
    }

    // 서양식 — 취소/뒤로가기
    OnCancelPressed.Broadcast();
    if (UIManager.IsValid())
    {
        UIManager->PopUI();
    }
}

void UControllerNavigation::HandleTabSwitch(int32 Direction)
{
    const int32 NewIndex = FMath::Clamp(CurrentTabIndex + Direction, 0, TabCount - 1);
    if (NewIndex != CurrentTabIndex)
    {
        CurrentTabIndex = NewIndex;
        OnTabChanged.Broadcast(CurrentTabIndex);
        UE_LOG(LogTemp, Log, TEXT("[ControllerNav] 탭 전환 → %d/%d"), CurrentTabIndex, TabCount);
    }
}

// ═══════════════════════════════════════════════════════════════
// 포커스 위젯 검색
// ═══════════════════════════════════════════════════════════════

TArray<UWidget*> UControllerNavigation::CollectFocusableWidgets() const
{
    TArray<UWidget*> Result;
    if (!UIManager.IsValid()) return Result;

    UUserWidget* TopWidget = UIManager->GetTopWidget();
    if (!TopWidget || !TopWidget->WidgetTree) return Result;

    TArray<UWidget*> All;
    TopWidget->WidgetTree->GetAllWidgets(All);

    for (UWidget* W : All)
    {
        if (!W || W->GetVisibility() != ESlateVisibility::Visible) continue;

        // 포커스 가능한 위젯 타입 필터
        if (W->IsA<UButton>() || W->IsA<USlider>() || W->IsA<UComboBoxString>())
        {
            Result.Add(W);
        }
    }
    return Result;
}

UWidget* UControllerNavigation::FindNextFocusWidget(UWidget* Current, ENavDirection Direction) const
{
    TArray<UWidget*> Candidates = CollectFocusableWidgets();
    if (Candidates.Num() == 0) return nullptr;

    const FVector2D CurrentCenter = GetWidgetScreenCenter(Current);
    UWidget* BestCandidate = nullptr;
    float BestScore = TNumericLimits<float>::Max();

    for (UWidget* Candidate : Candidates)
    {
        if (Candidate == Current) continue;

        const FVector2D CandCenter = GetWidgetScreenCenter(Candidate);
        const FVector2D Delta = CandCenter - CurrentCenter;

        // 방향 필터링 — 목표 방향과 일치하는 후보만
        bool bValidDirection = false;
        switch (Direction)
        {
        case ENavDirection::Up:    bValidDirection = (Delta.Y < -5.0f); break;
        case ENavDirection::Down:  bValidDirection = (Delta.Y > 5.0f);  break;
        case ENavDirection::Left:  bValidDirection = (Delta.X < -5.0f); break;
        case ENavDirection::Right: bValidDirection = (Delta.X > 5.0f);  break;
        }

        if (!bValidDirection) continue;

        // 점수 계산: 주 축 거리 + 부 축 패널티
        float PrimaryDist = 0.0f;
        float SecondaryDist = 0.0f;

        switch (Direction)
        {
        case ENavDirection::Up:
        case ENavDirection::Down:
            PrimaryDist = FMath::Abs(Delta.Y);
            SecondaryDist = FMath::Abs(Delta.X);
            break;
        case ENavDirection::Left:
        case ENavDirection::Right:
            PrimaryDist = FMath::Abs(Delta.X);
            SecondaryDist = FMath::Abs(Delta.Y);
            break;
        }

        // 부 축 거리에 가중치 2.0 — 같은 행/열 우선
        const float Score = PrimaryDist + SecondaryDist * 2.0f;
        if (Score < BestScore)
        {
            BestScore = Score;
            BestCandidate = Candidate;
        }
    }

    return BestCandidate;
}

FVector2D UControllerNavigation::GetWidgetScreenCenter(UWidget* Widget)
{
    if (!Widget) return FVector2D::ZeroVector;

    const FGeometry& Geo = Widget->GetCachedGeometry();
    const FVector2D LocalSize = Geo.GetLocalSize();
    const FVector2D AbsPos = Geo.GetAbsolutePosition();
    const float Scale = Geo.GetAccumulatedRenderTransform().GetMatrix().GetScale().GetComponentForAxis(EAxis::X);

    return AbsPos + (LocalSize * Scale * 0.5f);
}
