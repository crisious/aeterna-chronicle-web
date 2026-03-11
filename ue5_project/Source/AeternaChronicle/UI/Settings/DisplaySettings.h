// DisplaySettings.h
// 에테르나 크로니클 — 디스플레이 설정 메뉴 위젯
// 해상도, HDR, Safe Zone, UI 스케일, 프레임레이트 설정
#pragma once

#include "CoreMinimal.h"
#include "Blueprint/UserWidget.h"
#include "../ResolutionManager.h"
#include "../SafeZoneWrapper.h"
#include "DisplaySettings.generated.h"

class UComboBoxString;
class USlider;
class UCheckBox;
class UTextBlock;

// ═══════════════════════════════════════════════════════════════
// UDisplaySettings
// 설정 메뉴 → 디스플레이 탭 위젯
// ═══════════════════════════════════════════════════════════════
UCLASS()
class AETERNACHRONICLE_API UDisplaySettings : public UUserWidget
{
    GENERATED_BODY()

public:
    /** 현재 시스템 설정값으로 UI 초기화 */
    UFUNCTION(BlueprintCallable, Category = "Settings|Display")
    void InitializeFromCurrentSettings();

    /** 변경사항 적용 */
    UFUNCTION(BlueprintCallable, Category = "Settings|Display")
    void ApplySettings();

    /** 기본값으로 리셋 */
    UFUNCTION(BlueprintCallable, Category = "Settings|Display")
    void ResetToDefaults();

protected:
    virtual void NativeConstruct() override;

    // ── 바인드 위젯: 해상도 ─────────────────────────────────

    /** 해상도 선택 콤보박스 */
    UPROPERTY(meta = (BindWidget)) TObjectPtr<UComboBoxString> ResolutionCombo;

    /** 현재 해상도 표시 텍스트 */
    UPROPERTY(meta = (BindWidget)) TObjectPtr<UTextBlock> ResolutionLabel;

    // ── 바인드 위젯: 프레임레이트 ───────────────────────────

    /** 프레임레이트 타겟 콤보박스 */
    UPROPERTY(meta = (BindWidget)) TObjectPtr<UComboBoxString> FrameRateCombo;

    // ── 바인드 위젯: HDR ────────────────────────────────────

    /** HDR 활성화 체크박스 */
    UPROPERTY(meta = (BindWidget)) TObjectPtr<UCheckBox> HDRCheckBox;

    /** HDR 피크 밝기 슬라이더 */
    UPROPERTY(meta = (BindWidget)) TObjectPtr<USlider> HDRBrightnessSlider;

    /** HDR 밝기 값 표시 */
    UPROPERTY(meta = (BindWidget)) TObjectPtr<UTextBlock> HDRBrightnessLabel;

    /** HDR UI 밝기 슬라이더 */
    UPROPERTY(meta = (BindWidget)) TObjectPtr<USlider> HDRUIBrightnessSlider;

    /** HDR 지원 여부 표시 */
    UPROPERTY(meta = (BindWidget)) TObjectPtr<UTextBlock> HDRSupportLabel;

    // ── 바인드 위젯: Safe Zone ──────────────────────────────

    /** Safe Zone 크기 슬라이더 (0.5 ~ 1.0) */
    UPROPERTY(meta = (BindWidget)) TObjectPtr<USlider> SafeZoneSlider;

    /** Safe Zone 값 표시 (%) */
    UPROPERTY(meta = (BindWidget)) TObjectPtr<UTextBlock> SafeZoneLabel;

    // ── 바인드 위젯: UI 스케일 ──────────────────────────────

    /** UI 스케일 슬라이더 (0.5 ~ 2.0) */
    UPROPERTY(meta = (BindWidget)) TObjectPtr<USlider> UIScaleSlider;

    /** UI 스케일 값 표시 (%) */
    UPROPERTY(meta = (BindWidget)) TObjectPtr<UTextBlock> UIScaleLabel;

    // ── 임시 설정값 (Apply 전까지 보관) ─────────────────────

    UPROPERTY() EResolutionPreset PendingResolution = EResolutionPreset::Res_Auto;
    UPROPERTY() EFrameRateTarget PendingFrameRate = EFrameRateTarget::FPS_60;
    UPROPERTY() FHDRSettings PendingHDR;
    UPROPERTY() float PendingSafeZone = 1.0f;
    UPROPERTY() float PendingUIScale = 1.0f;

    // ── 콜백 ────────────────────────────────────────────────

    UFUNCTION() void OnResolutionChanged(FString SelectedItem, ESelectInfo::Type SelectionType);
    UFUNCTION() void OnFrameRateChanged(FString SelectedItem, ESelectInfo::Type SelectionType);
    UFUNCTION() void OnHDRToggled(bool bIsChecked);
    UFUNCTION() void OnHDRBrightnessChanged(float Value);
    UFUNCTION() void OnHDRUIBrightnessChanged(float Value);
    UFUNCTION() void OnSafeZoneChanged(float Value);
    UFUNCTION() void OnUIScaleChanged(float Value);

    // ── 헬퍼 ────────────────────────────────────────────────

    /** 콤보박스 옵션 채우기 */
    void PopulateResolutionOptions();
    void PopulateFrameRateOptions();

    /** HDR 관련 위젯 활성/비활성 처리 */
    void UpdateHDRWidgetStates();
};
