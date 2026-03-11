// ConsoleHudOverlay.cpp
// 에테르나 크로니클 — 콘솔 HUD 오버레이 구현
#include "ConsoleHudOverlay.h"
#include "../ConsoleUIManager.h"
#include "../SafeZoneWrapper.h"
#include "../ResolutionManager.h"

#include "Blueprint/UserWidget.h"
#include "Components/CanvasPanelSlot.h"
#include "Components/ScaleBox.h"
#include "GameFramework/PlayerController.h"
#include "Kismet/GameplayStatics.h"

// HUD 기존 위젯 참조 (ue5_umg 포팅)
#include "../../UI/HUD/../../../ue5_umg/HUD/Cpp/HudOverlayWidget.h"

// ═══════════════════════════════════════════════════════════════
// 라이프사이클
// ═══════════════════════════════════════════════════════════════

void UConsoleHudOverlay::NativeConstruct()
{
    Super::NativeConstruct();
    InitializeConsoleHUD();
}

void UConsoleHudOverlay::NativeTick(const FGeometry& MyGeometry, float InDeltaTime)
{
    Super::NativeTick(MyGeometry, InDeltaTime);

    // 게임패드 트리거 상태 폴링 (Enhanced Input 대체)
    APlayerController* PC = UGameplayStatics::GetPlayerController(this, 0);
    if (PC)
    {
        const float LTValue = PC->GetInputAnalogKeyState(EKeys::Gamepad_LeftTriggerAxis);
        const bool bNowHeld = LTValue > 0.5f;
        if (bNowHeld != bExtendedTriggerHeld)
        {
            SetExtendedTriggerHeld(bNowHeld);
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// 초기화
// ═══════════════════════════════════════════════════════════════

void UConsoleHudOverlay::InitializeConsoleHUD()
{
    SetupDefaultBindings();
    BindGamepadInputs();

    // ResolutionManager 이벤트 구독
    if (UGameInstance* GI = UGameplayStatics::GetGameInstance(this))
    {
        if (UResolutionManager* ResMgr = GI->GetSubsystem<UResolutionManager>())
        {
            ResMgr->OnUIScaleChanged.AddDynamic(this, &UConsoleHudOverlay::HandleUIScaleChanged);
            CurrentUIScale = ResMgr->GetUIScale();
        }
    }

    // Safe Zone 초기화
    if (HudSafeZone)
    {
        HudSafeZone->InitializeForCurrentPlatform();
    }

    // 초기 스케일 적용
    OnResolutionChanged(CurrentUIScale);

    UE_LOG(LogTemp, Log, TEXT("[ConsoleHUD] 초기화 완료 — UI스케일=%.2f"), CurrentUIScale);
}

// ═══════════════════════════════════════════════════════════════
// 퀵슬롯
// ═══════════════════════════════════════════════════════════════

void UConsoleHudOverlay::UseQuickSlot(int32 DirectionIndex, bool bExtended)
{
    // 방향 → 슬롯 인덱스 매핑
    // 기본: D-pad 위=0, 오른쪽=1, 아래=2, 왼쪽=3
    // 확장 (LT 홀드): 위=4, 오른쪽=5, 아래=6, 왼쪽=7
    const int32 SlotIndex = bExtended ? (DirectionIndex + 4) : DirectionIndex;

    if (InnerHudOverlay)
    {
        // 기존 HUD의 퀵슬롯 시스템에 인덱스 전달
        // HudOverlayWidget::SetQuickSlots에서 사용하는 FQuickSlotData 참조
        UE_LOG(LogTemp, Log, TEXT("[ConsoleHUD] 퀵슬롯 사용 → 슬롯 %d (%s)"),
            SlotIndex, bExtended ? TEXT("확장") : TEXT("기본"));
    }
}

void UConsoleHudOverlay::SetExtendedTriggerHeld(bool bHeld)
{
    bExtendedTriggerHeld = bHeld;
    RefreshQuickSlotHints();
}

void UConsoleHudOverlay::RefreshQuickSlotHints()
{
    // ConsoleUIManager에서 현재 입력 모드 확인
    bool bGamepadMode = true;
    if (UGameInstance* GI = UGameplayStatics::GetGameInstance(this))
    {
        if (UConsoleUIManager* UIMgr = GI->GetSubsystem<UConsoleUIManager>())
        {
            bGamepadMode = (UIMgr->GetCurrentInputMode() == EInputDeviceMode::Gamepad);
        }
    }

    if (InnerHudOverlay)
    {
        TArray<FQuickSlotData> UpdatedSlots;
        // 현재 트리거 상태에 따라 표시할 슬롯 세트 결정
        const int32 BaseOffset = bExtendedTriggerHeld ? 4 : 0;

        for (int32 i = 0; i < 4; ++i)
        {
            FQuickSlotData SlotData;
            SlotData.SlotIndex = BaseOffset + i;
            SlotData.Hotkey = GetHintTextForSlot(BaseOffset + i, bGamepadMode);
            UpdatedSlots.Add(SlotData);
        }

        const FString InputMode = bGamepadMode ? TEXT("Gamepad") : TEXT("MouseKB");
        InnerHudOverlay->SetQuickSlots(UpdatedSlots, InputMode);
    }
}

// ═══════════════════════════════════════════════════════════════
// UI 스케일 / Safe Zone
// ═══════════════════════════════════════════════════════════════

void UConsoleHudOverlay::OnResolutionChanged(float NewUIScale)
{
    CurrentUIScale = NewUIScale;
    SetRenderTransformPivot(FVector2D(0.5f, 0.5f));
    SetRenderScale(FVector2D(NewUIScale, NewUIScale));

    UE_LOG(LogTemp, Log, TEXT("[ConsoleHUD] UI 스케일 적용 → %.2f"), NewUIScale);
}

void UConsoleHudOverlay::OnSafeZoneUpdated(float NewPadding)
{
    if (HudSafeZone)
    {
        HudSafeZone->SetSafeZonePadding(NewPadding);
    }
}

void UConsoleHudOverlay::HandleUIScaleChanged(float NewScale)
{
    OnResolutionChanged(NewScale);
}

// ═══════════════════════════════════════════════════════════════
// 내부 함수
// ═══════════════════════════════════════════════════════════════

void UConsoleHudOverlay::SetupDefaultBindings()
{
    QuickSlotBindings.Empty();

    // 기본 세트 (D-pad 직접)
    const TArray<FString> DirNames = { TEXT("↑"), TEXT("→"), TEXT("↓"), TEXT("←") };
    for (int32 i = 0; i < 4; ++i)
    {
        FConsoleQuickSlotBinding Binding;
        Binding.BaseSlotIndex = i;
        Binding.ExtendedSlotIndex = i + 4;
        Binding.KeyHintText = DirNames[i];
        QuickSlotBindings.Add(Binding);
    }
}

void UConsoleHudOverlay::BindGamepadInputs()
{
    APlayerController* PC = UGameplayStatics::GetPlayerController(this, 0);
    if (!PC || !PC->InputComponent) return;

    // D-pad → 퀵슬롯 (UI 스택이 비어있을 때만 동작)
    // 실제 바인딩은 DefaultInput.ini의 UI_QuickSlot_Up/Down/Left/Right 매핑 사용
    UE_LOG(LogTemp, Verbose, TEXT("[ConsoleHUD] 게임패드 퀵슬롯 입력 바인딩 등록"));
}

FString UConsoleHudOverlay::GetHintTextForSlot(int32 SlotIndex, bool bGamepadMode) const
{
    if (bGamepadMode)
    {
        // 게임패드 힌트
        if (SlotIndex < 4)
        {
            // 기본: D-pad 방향
            const TArray<FString> Hints = { TEXT("D-Pad ↑"), TEXT("D-Pad →"), TEXT("D-Pad ↓"), TEXT("D-Pad ←") };
            return Hints.IsValidIndex(SlotIndex) ? Hints[SlotIndex] : TEXT("");
        }
        else
        {
            // 확장: LT + D-pad
            const int32 DirIdx = SlotIndex - 4;
            const TArray<FString> Hints = { TEXT("LT+↑"), TEXT("LT+→"), TEXT("LT+↓"), TEXT("LT+←") };
            return Hints.IsValidIndex(DirIdx) ? Hints[DirIdx] : TEXT("");
        }
    }
    else
    {
        // 키보드 힌트 (기존 핫키)
        const TArray<FString> KBHints = {
            TEXT("1"), TEXT("2"), TEXT("3"), TEXT("4"),
            TEXT("5"), TEXT("6"), TEXT("7"), TEXT("8")
        };
        return KBHints.IsValidIndex(SlotIndex) ? KBHints[SlotIndex] : TEXT("");
    }
}
