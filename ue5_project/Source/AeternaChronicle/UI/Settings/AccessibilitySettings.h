// AccessibilitySettings.h
// 에테르나 크로니클 — 접근성 설정 메뉴
// 색맹 모드, 자막 크기, 컨트롤러 매핑 프리셋
// WCAG 2.1 AA 준수
#pragma once

#include "CoreMinimal.h"
#include "Blueprint/UserWidget.h"
#include "../ControllerNavigation.h"
#include "AccessibilitySettings.generated.h"

class UComboBoxString;
class USlider;
class UTextBlock;
class UCheckBox;

// ─── 색맹 모드 ──────────────────────────────────────────────
UENUM(BlueprintType)
enum class EColorBlindMode : uint8
{
    None          UMETA(DisplayName = "없음 (기본)"),
    Protanopia    UMETA(DisplayName = "적색맹 (Protanopia)"),
    Deuteranopia  UMETA(DisplayName = "녹색맹 (Deuteranopia)"),
    Tritanopia    UMETA(DisplayName = "청색맹 (Tritanopia)")
};

// ─── 자막 크기 프리셋 ───────────────────────────────────────
UENUM(BlueprintType)
enum class ESubtitleSize : uint8
{
    Small   UMETA(DisplayName = "작게 (14pt)"),
    Medium  UMETA(DisplayName = "보통 (18pt)"),
    Large   UMETA(DisplayName = "크게 (24pt)"),
    XLarge  UMETA(DisplayName = "매우 크게 (32pt)")
};

// ─── 접근성 설정 변경 이벤트 ────────────────────────────────
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnColorBlindModeChanged, EColorBlindMode, NewMode);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnSubtitleSizeChanged, ESubtitleSize, NewSize);

// ═══════════════════════════════════════════════════════════════
// UAccessibilitySettings
// 설정 메뉴 → 접근성 탭 위젯
// ═══════════════════════════════════════════════════════════════
UCLASS()
class AETERNACHRONICLE_API UAccessibilitySettings : public UUserWidget
{
    GENERATED_BODY()

public:
    // ── 초기화 / 적용 ───────────────────────────────────────

    UFUNCTION(BlueprintCallable, Category = "Settings|Accessibility")
    void InitializeFromCurrentSettings();

    UFUNCTION(BlueprintCallable, Category = "Settings|Accessibility")
    void ApplySettings();

    UFUNCTION(BlueprintCallable, Category = "Settings|Accessibility")
    void ResetToDefaults();

    // ── 색맹 모드 ───────────────────────────────────────────

    /** 색맹 모드 즉시 적용 (포스트 프로세스 매터리얼 교체) */
    UFUNCTION(BlueprintCallable, Category = "Settings|Accessibility")
    static void ApplyColorBlindFilter(EColorBlindMode Mode);

    /** 현재 색맹 모드 */
    UFUNCTION(BlueprintPure, Category = "Settings|Accessibility")
    EColorBlindMode GetCurrentColorBlindMode() const { return PendingColorBlind; }

    // ── 자막 ────────────────────────────────────────────────

    /** 자막 크기 프리셋 → 실제 폰트 크기(pt) */
    UFUNCTION(BlueprintPure, Category = "Settings|Accessibility")
    static int32 SubtitleSizeToPoints(ESubtitleSize Size);

    // ── 이벤트 ──────────────────────────────────────────────

    UPROPERTY(BlueprintAssignable) FOnColorBlindModeChanged OnColorBlindModeChanged;
    UPROPERTY(BlueprintAssignable) FOnSubtitleSizeChanged OnSubtitleSizeChanged;

protected:
    virtual void NativeConstruct() override;

    // ── 바인드 위젯 ─────────────────────────────────────────

    /** 색맹 모드 콤보박스 */
    UPROPERTY(meta = (BindWidget)) TObjectPtr<UComboBoxString> ColorBlindCombo;

    /** 색맹 강도 슬라이더 (0.0 ~ 1.0) */
    UPROPERTY(meta = (BindWidget)) TObjectPtr<USlider> ColorBlindIntensity;

    /** 자막 크기 콤보박스 */
    UPROPERTY(meta = (BindWidget)) TObjectPtr<UComboBoxString> SubtitleSizeCombo;

    /** 자막 배경 투명도 슬라이더 */
    UPROPERTY(meta = (BindWidget)) TObjectPtr<USlider> SubtitleBGOpacity;

    /** 자막 미리보기 텍스트 */
    UPROPERTY(meta = (BindWidget)) TObjectPtr<UTextBlock> SubtitlePreview;

    /** 컨트롤러 매핑 콤보박스 (서양식/일본식) */
    UPROPERTY(meta = (BindWidget)) TObjectPtr<UComboBoxString> ControllerMappingCombo;

    /** 햅틱 피드백 체크박스 */
    UPROPERTY(meta = (BindWidget)) TObjectPtr<UCheckBox> HapticFeedbackCheckBox;

    /** 화면 흔들림 감소 체크박스 */
    UPROPERTY(meta = (BindWidget)) TObjectPtr<UCheckBox> ReduceMotionCheckBox;

    /** 고대비 UI 체크박스 (WCAG AAA) */
    UPROPERTY(meta = (BindWidget)) TObjectPtr<UCheckBox> HighContrastCheckBox;

    // ── 임시 설정값 ─────────────────────────────────────────

    UPROPERTY() EColorBlindMode PendingColorBlind = EColorBlindMode::None;
    UPROPERTY() float PendingColorBlindIntensity = 1.0f;
    UPROPERTY() ESubtitleSize PendingSubtitleSize = ESubtitleSize::Medium;
    UPROPERTY() float PendingSubtitleBGOpacity = 0.7f;
    UPROPERTY() EButtonMappingPreset PendingControllerMapping = EButtonMappingPreset::Western;
    UPROPERTY() bool bPendingHaptic = true;
    UPROPERTY() bool bPendingReduceMotion = false;
    UPROPERTY() bool bPendingHighContrast = false;

    // ── 콜백 ────────────────────────────────────────────────

    UFUNCTION() void OnColorBlindChanged(FString SelectedItem, ESelectInfo::Type SelectionType);
    UFUNCTION() void OnColorBlindIntensityChanged(float Value);
    UFUNCTION() void OnSubtitleSizeSelected(FString SelectedItem, ESelectInfo::Type SelectionType);
    UFUNCTION() void OnSubtitleBGOpacityChanged(float Value);
    UFUNCTION() void OnControllerMappingChanged(FString SelectedItem, ESelectInfo::Type SelectionType);
    UFUNCTION() void OnHapticToggled(bool bIsChecked);
    UFUNCTION() void OnReduceMotionToggled(bool bIsChecked);
    UFUNCTION() void OnHighContrastToggled(bool bIsChecked);

    // ── 헬퍼 ────────────────────────────────────────────────
    void PopulateOptions();
    void UpdateSubtitlePreview();
};
