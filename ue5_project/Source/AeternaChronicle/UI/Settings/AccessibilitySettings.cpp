// AccessibilitySettings.cpp
// 에테르나 크로니클 — 접근성 설정 구현
#include "AccessibilitySettings.h"
#include "../ControllerNavigation.h"

#include "Components/ComboBoxString.h"
#include "Components/Slider.h"
#include "Components/TextBlock.h"
#include "Components/CheckBox.h"
#include "Engine/PostProcessVolume.h"
#include "Kismet/GameplayStatics.h"
#include "Materials/MaterialInstanceDynamic.h"

// ═══════════════════════════════════════════════════════════════
// 라이프사이클
// ═══════════════════════════════════════════════════════════════

void UAccessibilitySettings::NativeConstruct()
{
    Super::NativeConstruct();
    PopulateOptions();

    // 콜백 바인딩
    if (ColorBlindCombo)
        ColorBlindCombo->OnSelectionChanged.AddDynamic(this, &UAccessibilitySettings::OnColorBlindChanged);
    if (ColorBlindIntensity)
        ColorBlindIntensity->OnValueChanged.AddDynamic(this, &UAccessibilitySettings::OnColorBlindIntensityChanged);
    if (SubtitleSizeCombo)
        SubtitleSizeCombo->OnSelectionChanged.AddDynamic(this, &UAccessibilitySettings::OnSubtitleSizeSelected);
    if (SubtitleBGOpacity)
        SubtitleBGOpacity->OnValueChanged.AddDynamic(this, &UAccessibilitySettings::OnSubtitleBGOpacityChanged);
    if (ControllerMappingCombo)
        ControllerMappingCombo->OnSelectionChanged.AddDynamic(this, &UAccessibilitySettings::OnControllerMappingChanged);
    if (HapticFeedbackCheckBox)
        HapticFeedbackCheckBox->OnCheckStateChanged.AddDynamic(this, &UAccessibilitySettings::OnHapticToggled);
    if (ReduceMotionCheckBox)
        ReduceMotionCheckBox->OnCheckStateChanged.AddDynamic(this, &UAccessibilitySettings::OnReduceMotionToggled);
    if (HighContrastCheckBox)
        HighContrastCheckBox->OnCheckStateChanged.AddDynamic(this, &UAccessibilitySettings::OnHighContrastToggled);

    InitializeFromCurrentSettings();
}

// ═══════════════════════════════════════════════════════════════
// 초기화 / 적용
// ═══════════════════════════════════════════════════════════════

void UAccessibilitySettings::InitializeFromCurrentSettings()
{
    // 저장된 설정에서 복원 (GameUserSettings 또는 SaveGame)
    // TODO: SaveGame 시스템 연동

    if (ColorBlindCombo)
        ColorBlindCombo->SetSelectedIndex(static_cast<int32>(PendingColorBlind));
    if (ColorBlindIntensity)
        ColorBlindIntensity->SetValue(PendingColorBlindIntensity);
    if (SubtitleSizeCombo)
        SubtitleSizeCombo->SetSelectedIndex(static_cast<int32>(PendingSubtitleSize));
    if (SubtitleBGOpacity)
        SubtitleBGOpacity->SetValue(PendingSubtitleBGOpacity);
    if (ControllerMappingCombo)
        ControllerMappingCombo->SetSelectedIndex(static_cast<int32>(PendingControllerMapping));
    if (HapticFeedbackCheckBox)
        HapticFeedbackCheckBox->SetIsChecked(bPendingHaptic);
    if (ReduceMotionCheckBox)
        ReduceMotionCheckBox->SetIsChecked(bPendingReduceMotion);
    if (HighContrastCheckBox)
        HighContrastCheckBox->SetIsChecked(bPendingHighContrast);

    UpdateSubtitlePreview();
}

void UAccessibilitySettings::ApplySettings()
{
    // 색맹 필터 적용
    ApplyColorBlindFilter(PendingColorBlind);

    // 컨트롤러 매핑 적용
    APlayerController* PC = UGameplayStatics::GetPlayerController(this, 0);
    if (PC)
    {
        UControllerNavigation* Nav = PC->FindComponentByClass<UControllerNavigation>();
        if (Nav)
        {
            Nav->SetButtonMapping(PendingControllerMapping);
        }
    }

    // 햅틱 피드백
    if (PC)
    {
        // UE5 Enhanced Input 햅틱 설정
        // 구현: IInputInterface를 통한 진동 활성/비활성
    }

    // 화면 흔들림 감소
    if (bPendingReduceMotion)
    {
        // 카메라 쉐이크 배율 0으로 설정
        if (PC && PC->PlayerCameraManager)
        {
            // PlayerCameraManager->SetCameraShakeScale(0.0f);
        }
    }

    // 이벤트 브로드캐스트
    OnColorBlindModeChanged.Broadcast(PendingColorBlind);
    OnSubtitleSizeChanged.Broadcast(PendingSubtitleSize);

    UE_LOG(LogTemp, Log, TEXT("[Accessibility] 설정 적용 — 색맹=%d, 자막=%d, 매핑=%d"),
        static_cast<int32>(PendingColorBlind),
        static_cast<int32>(PendingSubtitleSize),
        static_cast<int32>(PendingControllerMapping));
}

void UAccessibilitySettings::ResetToDefaults()
{
    PendingColorBlind = EColorBlindMode::None;
    PendingColorBlindIntensity = 1.0f;
    PendingSubtitleSize = ESubtitleSize::Medium;
    PendingSubtitleBGOpacity = 0.7f;
    PendingControllerMapping = EButtonMappingPreset::Western;
    bPendingHaptic = true;
    bPendingReduceMotion = false;
    bPendingHighContrast = false;

    InitializeFromCurrentSettings();
}

// ═══════════════════════════════════════════════════════════════
// 색맹 필터
// ═══════════════════════════════════════════════════════════════

void UAccessibilitySettings::ApplyColorBlindFilter(EColorBlindMode Mode)
{
    // UE5 내장 색맹 시뮬레이션 CVar 사용
    FString CVarCmd;
    switch (Mode)
    {
    case EColorBlindMode::Protanopia:
        CVarCmd = TEXT("r.ColorDeficiency 1");  // Protanopia
        break;
    case EColorBlindMode::Deuteranopia:
        CVarCmd = TEXT("r.ColorDeficiency 2");  // Deuteranopia
        break;
    case EColorBlindMode::Tritanopia:
        CVarCmd = TEXT("r.ColorDeficiency 3");  // Tritanopia
        break;
    case EColorBlindMode::None:
    default:
        CVarCmd = TEXT("r.ColorDeficiency 0");  // 기본
        break;
    }

    if (GEngine)
    {
        GEngine->Exec(nullptr, *CVarCmd);

        // 색맹 보정 모드 활성화 (시뮬레이션이 아닌 보정)
        if (Mode != EColorBlindMode::None)
        {
            GEngine->Exec(nullptr, TEXT("r.ColorDeficiencyCorrection 1"));
        }
        else
        {
            GEngine->Exec(nullptr, TEXT("r.ColorDeficiencyCorrection 0"));
        }
    }

    UE_LOG(LogTemp, Log, TEXT("[Accessibility] 색맹 필터 → %d"), static_cast<int32>(Mode));
}

int32 UAccessibilitySettings::SubtitleSizeToPoints(ESubtitleSize Size)
{
    switch (Size)
    {
    case ESubtitleSize::Small:  return 14;
    case ESubtitleSize::Medium: return 18;
    case ESubtitleSize::Large:  return 24;
    case ESubtitleSize::XLarge: return 32;
    default:                    return 18;
    }
}

// ═══════════════════════════════════════════════════════════════
// 콜백
// ═══════════════════════════════════════════════════════════════

void UAccessibilitySettings::OnColorBlindChanged(FString SelectedItem, ESelectInfo::Type SelectionType)
{
    if (SelectedItem.Contains(TEXT("적색맹")))       PendingColorBlind = EColorBlindMode::Protanopia;
    else if (SelectedItem.Contains(TEXT("녹색맹")))  PendingColorBlind = EColorBlindMode::Deuteranopia;
    else if (SelectedItem.Contains(TEXT("청색맹")))  PendingColorBlind = EColorBlindMode::Tritanopia;
    else                                            PendingColorBlind = EColorBlindMode::None;
}

void UAccessibilitySettings::OnColorBlindIntensityChanged(float Value)
{
    PendingColorBlindIntensity = FMath::Clamp(Value, 0.0f, 1.0f);
}

void UAccessibilitySettings::OnSubtitleSizeSelected(FString SelectedItem, ESelectInfo::Type SelectionType)
{
    if (SelectedItem.Contains(TEXT("작게")))       PendingSubtitleSize = ESubtitleSize::Small;
    else if (SelectedItem.Contains(TEXT("크게")))  PendingSubtitleSize = ESubtitleSize::Large;
    else if (SelectedItem.Contains(TEXT("매우")))  PendingSubtitleSize = ESubtitleSize::XLarge;
    else                                          PendingSubtitleSize = ESubtitleSize::Medium;

    UpdateSubtitlePreview();
}

void UAccessibilitySettings::OnSubtitleBGOpacityChanged(float Value)
{
    PendingSubtitleBGOpacity = FMath::Clamp(Value, 0.0f, 1.0f);
    UpdateSubtitlePreview();
}

void UAccessibilitySettings::OnControllerMappingChanged(FString SelectedItem, ESelectInfo::Type SelectionType)
{
    if (SelectedItem.Contains(TEXT("일본식")))
        PendingControllerMapping = EButtonMappingPreset::Japanese;
    else
        PendingControllerMapping = EButtonMappingPreset::Western;
}

void UAccessibilitySettings::OnHapticToggled(bool bIsChecked)
{
    bPendingHaptic = bIsChecked;
}

void UAccessibilitySettings::OnReduceMotionToggled(bool bIsChecked)
{
    bPendingReduceMotion = bIsChecked;
}

void UAccessibilitySettings::OnHighContrastToggled(bool bIsChecked)
{
    bPendingHighContrast = bIsChecked;
}

// ═══════════════════════════════════════════════════════════════
// 헬퍼
// ═══════════════════════════════════════════════════════════════

void UAccessibilitySettings::PopulateOptions()
{
    if (ColorBlindCombo)
    {
        ColorBlindCombo->ClearOptions();
        ColorBlindCombo->AddOption(TEXT("없음 (기본)"));
        ColorBlindCombo->AddOption(TEXT("적색맹 (Protanopia)"));
        ColorBlindCombo->AddOption(TEXT("녹색맹 (Deuteranopia)"));
        ColorBlindCombo->AddOption(TEXT("청색맹 (Tritanopia)"));
    }

    if (SubtitleSizeCombo)
    {
        SubtitleSizeCombo->ClearOptions();
        SubtitleSizeCombo->AddOption(TEXT("작게 (14pt)"));
        SubtitleSizeCombo->AddOption(TEXT("보통 (18pt)"));
        SubtitleSizeCombo->AddOption(TEXT("크게 (24pt)"));
        SubtitleSizeCombo->AddOption(TEXT("매우 크게 (32pt)"));
    }

    if (ControllerMappingCombo)
    {
        ControllerMappingCombo->ClearOptions();
        ControllerMappingCombo->AddOption(TEXT("서양식 (A=확인, B=취소)"));
        ControllerMappingCombo->AddOption(TEXT("일본식 (B=확인, A=취소)"));
    }
}

void UAccessibilitySettings::UpdateSubtitlePreview()
{
    if (!SubtitlePreview) return;

    const int32 FontSize = SubtitleSizeToPoints(PendingSubtitleSize);

    // 미리보기 텍스트 설정
    SubtitlePreview->SetText(FText::FromString(
        TEXT("이것은 자막 미리보기입니다.\nThis is a subtitle preview.")));

    // 폰트 크기 변경
    FSlateFontInfo FontInfo = SubtitlePreview->GetFont();
    FontInfo.Size = FontSize;
    SubtitlePreview->SetFont(FontInfo);

    // 배경 투명도는 부모 브러시에서 처리 (블루프린트 연동)
}
