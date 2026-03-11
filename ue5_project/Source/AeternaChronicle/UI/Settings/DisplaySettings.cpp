// DisplaySettings.cpp
// 에테르나 크로니클 — 디스플레이 설정 메뉴 구현
#include "DisplaySettings.h"

#include "../ResolutionManager.h"
#include "../SafeZoneWrapper.h"

#include "Components/ComboBoxString.h"
#include "Components/Slider.h"
#include "Components/CheckBox.h"
#include "Components/TextBlock.h"
#include "Kismet/GameplayStatics.h"

// ═══════════════════════════════════════════════════════════════
// 라이프사이클
// ═══════════════════════════════════════════════════════════════

void UDisplaySettings::NativeConstruct()
{
    Super::NativeConstruct();

    // 콤보박스 옵션 채우기
    PopulateResolutionOptions();
    PopulateFrameRateOptions();

    // 콜백 바인딩
    if (ResolutionCombo)
        ResolutionCombo->OnSelectionChanged.AddDynamic(this, &UDisplaySettings::OnResolutionChanged);
    if (FrameRateCombo)
        FrameRateCombo->OnSelectionChanged.AddDynamic(this, &UDisplaySettings::OnFrameRateChanged);
    if (HDRCheckBox)
        HDRCheckBox->OnCheckStateChanged.AddDynamic(this, &UDisplaySettings::OnHDRToggled);
    if (HDRBrightnessSlider)
        HDRBrightnessSlider->OnValueChanged.AddDynamic(this, &UDisplaySettings::OnHDRBrightnessChanged);
    if (HDRUIBrightnessSlider)
        HDRUIBrightnessSlider->OnValueChanged.AddDynamic(this, &UDisplaySettings::OnHDRUIBrightnessChanged);
    if (SafeZoneSlider)
        SafeZoneSlider->OnValueChanged.AddDynamic(this, &UDisplaySettings::OnSafeZoneChanged);
    if (UIScaleSlider)
        UIScaleSlider->OnValueChanged.AddDynamic(this, &UDisplaySettings::OnUIScaleChanged);

    // 현재 설정으로 초기화
    InitializeFromCurrentSettings();
}

// ═══════════════════════════════════════════════════════════════
// 초기화 / 적용
// ═══════════════════════════════════════════════════════════════

void UDisplaySettings::InitializeFromCurrentSettings()
{
    UGameInstance* GI = UGameplayStatics::GetGameInstance(this);
    if (!GI) return;

    UResolutionManager* ResMgr = GI->GetSubsystem<UResolutionManager>();
    if (!ResMgr) return;

    // 해상도
    PendingResolution = ResMgr->GetCurrentPreset();
    if (ResolutionCombo)
    {
        const int32 Idx = static_cast<int32>(PendingResolution);
        ResolutionCombo->SetSelectedIndex(Idx);
    }

    // 프레임레이트
    PendingFrameRate = ResMgr->GetFrameRateTarget();
    if (FrameRateCombo)
    {
        FrameRateCombo->SetSelectedIndex(static_cast<int32>(PendingFrameRate));
    }

    // HDR
    PendingHDR = ResMgr->GetHDRSettings();
    if (HDRCheckBox)
        HDRCheckBox->SetIsChecked(PendingHDR.bEnabled);
    if (HDRBrightnessSlider)
        HDRBrightnessSlider->SetValue(PendingHDR.PeakBrightnessNits / 10000.0f);
    if (HDRUIBrightnessSlider)
        HDRUIBrightnessSlider->SetValue(PendingHDR.UIBrightnessMultiplier / 2.0f);
    UpdateHDRWidgetStates();

    // UI 스케일
    PendingUIScale = ResMgr->GetUIScale();
    if (UIScaleSlider)
        UIScaleSlider->SetValue((PendingUIScale - 0.5f) / 1.5f); // 0.5~2.0 → 0.0~1.0
    if (UIScaleLabel)
        UIScaleLabel->SetText(FText::FromString(FString::Printf(TEXT("%.0f%%"), PendingUIScale * 100.0f)));

    // Safe Zone (사용 가능한 래퍼에서 읽기)
    PendingSafeZone = 1.0f;
    if (SafeZoneSlider)
        SafeZoneSlider->SetValue((PendingSafeZone - 0.5f) / 0.5f); // 0.5~1.0 → 0.0~1.0
    if (SafeZoneLabel)
        SafeZoneLabel->SetText(FText::FromString(FString::Printf(TEXT("%.0f%%"), PendingSafeZone * 100.0f)));

    // HDR 지원 표시
    if (HDRSupportLabel)
    {
        const bool bSupported = ResMgr->IsHDRSupported();
        HDRSupportLabel->SetText(FText::FromString(
            bSupported ? TEXT("HDR 지원됨") : TEXT("HDR 미지원")));
    }
}

void UDisplaySettings::ApplySettings()
{
    UGameInstance* GI = UGameplayStatics::GetGameInstance(this);
    if (!GI) return;

    UResolutionManager* ResMgr = GI->GetSubsystem<UResolutionManager>();
    if (!ResMgr) return;

    // 설정 적용 순서: 해상도 → 프레임레이트 → HDR → UI 스케일
    ResMgr->SetResolutionPreset(PendingResolution);
    ResMgr->SetFrameRateTarget(PendingFrameRate);
    ResMgr->SetHDRSettings(PendingHDR);
    ResMgr->SetUIScale(PendingUIScale);

    // Safe Zone은 글로벌 브로드캐스트로 모든 SafeZoneWrapper에 전달
    // TODO: SaveGame 시스템 연동 — 사용자 설정 영속화

    UE_LOG(LogTemp, Log, TEXT("[DisplaySettings] 설정 적용 완료"));
}

void UDisplaySettings::ResetToDefaults()
{
    UGameInstance* GI = UGameplayStatics::GetGameInstance(this);
    if (!GI) return;

    UResolutionManager* ResMgr = GI->GetSubsystem<UResolutionManager>();
    if (ResMgr)
    {
        ResMgr->ApplyPlatformDefaults();
    }

    // UI 갱신
    InitializeFromCurrentSettings();
    UE_LOG(LogTemp, Log, TEXT("[DisplaySettings] 기본값 리셋 완료"));
}

// ═══════════════════════════════════════════════════════════════
// 콜백
// ═══════════════════════════════════════════════════════════════

void UDisplaySettings::OnResolutionChanged(FString SelectedItem, ESelectInfo::Type SelectionType)
{
    if (SelectedItem == TEXT("1080p"))      PendingResolution = EResolutionPreset::Res_1080p;
    else if (SelectedItem == TEXT("1440p")) PendingResolution = EResolutionPreset::Res_1440p;
    else if (SelectedItem == TEXT("4K"))    PendingResolution = EResolutionPreset::Res_4K;
    else                                   PendingResolution = EResolutionPreset::Res_Auto;
}

void UDisplaySettings::OnFrameRateChanged(FString SelectedItem, ESelectInfo::Type SelectionType)
{
    if (SelectedItem == TEXT("30 FPS"))        PendingFrameRate = EFrameRateTarget::FPS_30;
    else if (SelectedItem == TEXT("60 FPS"))   PendingFrameRate = EFrameRateTarget::FPS_60;
    else if (SelectedItem == TEXT("120 FPS"))  PendingFrameRate = EFrameRateTarget::FPS_120;
    else                                      PendingFrameRate = EFrameRateTarget::FPS_Unlimited;
}

void UDisplaySettings::OnHDRToggled(bool bIsChecked)
{
    PendingHDR.bEnabled = bIsChecked;
    UpdateHDRWidgetStates();
}

void UDisplaySettings::OnHDRBrightnessChanged(float Value)
{
    // 슬라이더 0.0~1.0 → 400~10000 니트
    PendingHDR.PeakBrightnessNits = FMath::Lerp(400.0f, 10000.0f, Value);
    if (HDRBrightnessLabel)
    {
        HDRBrightnessLabel->SetText(FText::FromString(
            FString::Printf(TEXT("%.0f nit"), PendingHDR.PeakBrightnessNits)));
    }
}

void UDisplaySettings::OnHDRUIBrightnessChanged(float Value)
{
    // 슬라이더 0.0~1.0 → 0.5~2.0
    PendingHDR.UIBrightnessMultiplier = FMath::Lerp(0.5f, 2.0f, Value);
}

void UDisplaySettings::OnSafeZoneChanged(float Value)
{
    // 슬라이더 0.0~1.0 → 0.5~1.0
    PendingSafeZone = FMath::Lerp(0.5f, 1.0f, Value);
    if (SafeZoneLabel)
    {
        SafeZoneLabel->SetText(FText::FromString(
            FString::Printf(TEXT("%.0f%%"), PendingSafeZone * 100.0f)));
    }
}

void UDisplaySettings::OnUIScaleChanged(float Value)
{
    // 슬라이더 0.0~1.0 → 0.5~2.0
    PendingUIScale = FMath::Lerp(0.5f, 2.0f, Value);
    if (UIScaleLabel)
    {
        UIScaleLabel->SetText(FText::FromString(
            FString::Printf(TEXT("%.0f%%"), PendingUIScale * 100.0f)));
    }
}

// ═══════════════════════════════════════════════════════════════
// 헬퍼
// ═══════════════════════════════════════════════════════════════

void UDisplaySettings::PopulateResolutionOptions()
{
    if (!ResolutionCombo) return;

    ResolutionCombo->ClearOptions();
    ResolutionCombo->AddOption(TEXT("자동 감지"));
    ResolutionCombo->AddOption(TEXT("1080p"));
    ResolutionCombo->AddOption(TEXT("1440p"));
    ResolutionCombo->AddOption(TEXT("4K"));
}

void UDisplaySettings::PopulateFrameRateOptions()
{
    if (!FrameRateCombo) return;

    FrameRateCombo->ClearOptions();
    FrameRateCombo->AddOption(TEXT("30 FPS"));
    FrameRateCombo->AddOption(TEXT("60 FPS"));
    FrameRateCombo->AddOption(TEXT("120 FPS"));
    FrameRateCombo->AddOption(TEXT("무제한"));
}

void UDisplaySettings::UpdateHDRWidgetStates()
{
    const bool bHDREnabled = PendingHDR.bEnabled;
    if (HDRBrightnessSlider)
        HDRBrightnessSlider->SetIsEnabled(bHDREnabled);
    if (HDRUIBrightnessSlider)
        HDRUIBrightnessSlider->SetIsEnabled(bHDREnabled);
    if (HDRBrightnessLabel)
        HDRBrightnessLabel->SetVisibility(bHDREnabled ? ESlateVisibility::Visible : ESlateVisibility::Collapsed);
}
