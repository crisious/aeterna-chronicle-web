// ResolutionManager.h
// 에테르나 크로니클 — 해상도 + HDR + UI 스케일링 관리자
// 4K/1440p/1080p 동적 전환, ST.2084 PQ 톤매핑, DPI 기반 스케일링
#pragma once

#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "ResolutionManager.generated.h"

// ─── 해상도 프리셋 ──────────────────────────────────────────
UENUM(BlueprintType)
enum class EResolutionPreset : uint8
{
    Res_1080p  UMETA(DisplayName = "1080p (1920x1080)"),
    Res_1440p  UMETA(DisplayName = "1440p (2560x1440)"),
    Res_4K     UMETA(DisplayName = "4K (3840x2160)"),
    Res_Auto   UMETA(DisplayName = "자동 감지")
};

// ─── 프레임레이트 타겟 ──────────────────────────────────────
UENUM(BlueprintType)
enum class EFrameRateTarget : uint8
{
    FPS_30   UMETA(DisplayName = "30 FPS"),
    FPS_60   UMETA(DisplayName = "60 FPS"),
    FPS_120  UMETA(DisplayName = "120 FPS"),
    FPS_Unlimited UMETA(DisplayName = "무제한")
};

// ─── HDR 설정 구조체 ────────────────────────────────────────
USTRUCT(BlueprintType)
struct FHDRSettings
{
    GENERATED_BODY()

    /** HDR 활성화 여부 */
    UPROPERTY(EditAnywhere, BlueprintReadWrite) bool bEnabled = false;

    /** 피크 밝기 (니트 단위, 400 ~ 10000) */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, meta = (ClampMin = "400", ClampMax = "10000"))
    float PeakBrightnessNits = 1000.0f;

    /** 페이퍼 화이트 밝기 (니트 단위, 80 ~ 500) */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, meta = (ClampMin = "80", ClampMax = "500"))
    float PaperWhiteNits = 200.0f;

    /** UI 밝기 보정 (0.5 ~ 2.0, 1.0 = 기본) */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, meta = (ClampMin = "0.5", ClampMax = "2.0"))
    float UIBrightnessMultiplier = 1.0f;

    /** 톤매핑 커브 — ST.2084 PQ 사용 */
    UPROPERTY(EditAnywhere, BlueprintReadWrite) bool bUseST2084 = true;
};

// ─── 해상도 변경 델리게이트 ─────────────────────────────────
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnResolutionChanged,
    EResolutionPreset, NewPreset, FIntPoint, NewResolution);

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnUIScaleChanged, float, NewScale);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnHDRSettingsChanged, const FHDRSettings&, NewSettings);

// ═══════════════════════════════════════════════════════════════
// UResolutionManager
// ═══════════════════════════════════════════════════════════════
UCLASS()
class AETERNACHRONICLE_API UResolutionManager : public UGameInstanceSubsystem
{
    GENERATED_BODY()

public:
    virtual void Initialize(FSubsystemCollectionBase& Collection) override;

    // ── 해상도 ──────────────────────────────────────────────

    /** 해상도 프리셋 적용 */
    UFUNCTION(BlueprintCallable, Category = "Resolution")
    void SetResolutionPreset(EResolutionPreset Preset);

    /** 현재 해상도 프리셋 */
    UFUNCTION(BlueprintPure, Category = "Resolution")
    EResolutionPreset GetCurrentPreset() const { return CurrentPreset; }

    /** 현재 실제 해상도 */
    UFUNCTION(BlueprintPure, Category = "Resolution")
    FIntPoint GetCurrentResolution() const { return CurrentResolution; }

    /** 프리셋 → 해상도 변환 */
    UFUNCTION(BlueprintPure, Category = "Resolution")
    static FIntPoint PresetToResolution(EResolutionPreset Preset);

    // ── 프레임레이트 ────────────────────────────────────────

    /** 프레임레이트 타겟 설정 */
    UFUNCTION(BlueprintCallable, Category = "Resolution")
    void SetFrameRateTarget(EFrameRateTarget Target);

    UFUNCTION(BlueprintPure, Category = "Resolution")
    EFrameRateTarget GetFrameRateTarget() const { return CurrentFrameRate; }

    // ── HDR ─────────────────────────────────────────────────

    /** HDR 설정 적용 */
    UFUNCTION(BlueprintCallable, Category = "Resolution")
    void SetHDRSettings(const FHDRSettings& InSettings);

    /** 현재 HDR 설정 */
    UFUNCTION(BlueprintPure, Category = "Resolution")
    const FHDRSettings& GetHDRSettings() const { return HDRConfig; }

    /** 디스플레이가 HDR을 지원하는지 확인 */
    UFUNCTION(BlueprintPure, Category = "Resolution")
    bool IsHDRSupported() const;

    // ── UI 스케일 ───────────────────────────────────────────

    /** UI 스케일 팩터 수동 설정 (0.5 ~ 2.0) */
    UFUNCTION(BlueprintCallable, Category = "Resolution")
    void SetUIScale(float InScale);

    /** 현재 UI 스케일 팩터 */
    UFUNCTION(BlueprintPure, Category = "Resolution")
    float GetUIScale() const { return UIScaleFactor; }

    /** DPI 기반 자동 UI 스케일 계산 */
    UFUNCTION(BlueprintCallable, Category = "Resolution")
    void AutoDetectUIScale();

    /** 플랫폼별 기본 설정 일괄 적용 */
    UFUNCTION(BlueprintCallable, Category = "Resolution")
    void ApplyPlatformDefaults();

    // ── 이벤트 ──────────────────────────────────────────────

    UPROPERTY(BlueprintAssignable) FOnResolutionChanged OnResolutionChanged;
    UPROPERTY(BlueprintAssignable) FOnUIScaleChanged OnUIScaleChanged;
    UPROPERTY(BlueprintAssignable) FOnHDRSettingsChanged OnHDRSettingsChanged;

protected:
    UPROPERTY() EResolutionPreset CurrentPreset = EResolutionPreset::Res_Auto;
    UPROPERTY() FIntPoint CurrentResolution = FIntPoint(1920, 1080);
    UPROPERTY() EFrameRateTarget CurrentFrameRate = EFrameRateTarget::FPS_60;
    UPROPERTY() FHDRSettings HDRConfig;
    UPROPERTY() float UIScaleFactor = 1.0f;

    /** ST.2084 PQ EOTF — 선형 밝기 → PQ 비선형 변환 */
    static float LinearToPQ(float LinearValue);

    /** PQ → 선형 역변환 */
    static float PQToLinear(float PQValue);

    /** 콘솔 타입에서 해상도, HDR, 프레임 기본값 결정 */
    void DetectAndApplyDefaults();
};
