// ResolutionManager.cpp
// 에테르나 크로니클 — 해상도 + HDR + UI 스케일링 구현
#include "ResolutionManager.h"

#include "GameFramework/GameUserSettings.h"
#include "Engine/Engine.h"
#include "Kismet/KismetSystemLibrary.h"
#include "HAL/PlatformMisc.h"

// ST.2084 PQ 커브 상수
namespace PQConstants
{
    constexpr float M1 = 0.1593017578125f;      // 2610 / 16384
    constexpr float M2 = 78.84375f;             // 2523 / 4096 * 128
    constexpr float C1 = 0.8359375f;            // 3424 / 4096
    constexpr float C2 = 18.8515625f;           // 2413 / 4096 * 32
    constexpr float C3 = 18.6875f;              // 2392 / 4096 * 32
    constexpr float MaxLuminance = 10000.0f;    // 니트
}

// ═══════════════════════════════════════════════════════════════
// 라이프사이클
// ═══════════════════════════════════════════════════════════════

void UResolutionManager::Initialize(FSubsystemCollectionBase& Collection)
{
    Super::Initialize(Collection);
    DetectAndApplyDefaults();
    UE_LOG(LogTemp, Log, TEXT("[ResolutionManager] 초기화 완료 — %dx%d, HDR=%s"),
        CurrentResolution.X, CurrentResolution.Y,
        HDRConfig.bEnabled ? TEXT("ON") : TEXT("OFF"));
}

// ═══════════════════════════════════════════════════════════════
// 해상도
// ═══════════════════════════════════════════════════════════════

void UResolutionManager::SetResolutionPreset(EResolutionPreset Preset)
{
    CurrentPreset = Preset;

    if (Preset == EResolutionPreset::Res_Auto)
    {
        // 디스플레이 네이티브 해상도 감지
        FDisplayMetrics Metrics;
        FDisplayMetrics::RebuildDisplayMetrics(Metrics);
        CurrentResolution = FIntPoint(Metrics.PrimaryDisplayWidth, Metrics.PrimaryDisplayHeight);
    }
    else
    {
        CurrentResolution = PresetToResolution(Preset);
    }

    // UE5 해상도 적용
    if (UGameUserSettings* Settings = GEngine ? GEngine->GetGameUserSettings() : nullptr)
    {
        Settings->SetScreenResolution(CurrentResolution);
        Settings->SetFullscreenMode(EWindowMode::Fullscreen);
        Settings->ApplyResolutionSettings(false);
    }

    // UI 스케일 자동 조정
    AutoDetectUIScale();
    OnResolutionChanged.Broadcast(CurrentPreset, CurrentResolution);

    UE_LOG(LogTemp, Log, TEXT("[ResolutionManager] 해상도 변경 → %dx%d"), 
        CurrentResolution.X, CurrentResolution.Y);
}

FIntPoint UResolutionManager::PresetToResolution(EResolutionPreset Preset)
{
    switch (Preset)
    {
    case EResolutionPreset::Res_1080p: return FIntPoint(1920, 1080);
    case EResolutionPreset::Res_1440p: return FIntPoint(2560, 1440);
    case EResolutionPreset::Res_4K:    return FIntPoint(3840, 2160);
    default:                           return FIntPoint(1920, 1080);
    }
}

// ═══════════════════════════════════════════════════════════════
// 프레임레이트
// ═══════════════════════════════════════════════════════════════

void UResolutionManager::SetFrameRateTarget(EFrameRateTarget Target)
{
    CurrentFrameRate = Target;

    float FPSLimit = 0.0f;
    switch (Target)
    {
    case EFrameRateTarget::FPS_30:        FPSLimit = 30.0f;  break;
    case EFrameRateTarget::FPS_60:        FPSLimit = 60.0f;  break;
    case EFrameRateTarget::FPS_120:       FPSLimit = 120.0f; break;
    case EFrameRateTarget::FPS_Unlimited: FPSLimit = 0.0f;   break;
    }

    if (UGameUserSettings* Settings = GEngine ? GEngine->GetGameUserSettings() : nullptr)
    {
        Settings->SetFrameRateLimitCVar(FPSLimit);
    }

    // 콘솔 명령으로도 보장
    if (GEngine)
    {
        const FString Cmd = FPSLimit > 0.0f
            ? FString::Printf(TEXT("t.MaxFPS %f"), FPSLimit)
            : TEXT("t.MaxFPS 0");
        GEngine->Exec(nullptr, *Cmd);
    }

    UE_LOG(LogTemp, Log, TEXT("[ResolutionManager] 프레임레이트 타겟 → %.0f FPS"), FPSLimit);
}

// ═══════════════════════════════════════════════════════════════
// HDR
// ═══════════════════════════════════════════════════════════════

void UResolutionManager::SetHDRSettings(const FHDRSettings& InSettings)
{
    HDRConfig = InSettings;

    if (HDRConfig.bEnabled && IsHDRSupported())
    {
        // UE5 HDR 출력 활성화
        if (GEngine)
        {
            GEngine->Exec(nullptr, TEXT("r.HDR.EnableHDROutput 1"));

            // ST.2084 PQ 커브 톤매핑 설정
            if (HDRConfig.bUseST2084)
            {
                GEngine->Exec(nullptr, TEXT("r.HDR.Display.OutputDevice 3")); // ST.2084
            }

            // 피크 밝기 설정
            const FString PeakCmd = FString::Printf(
                TEXT("r.HDR.Display.ColorGamut 2")); // Rec.2020
            GEngine->Exec(nullptr, *PeakCmd);

            // UI 밝기 보정
            const float UILuminance = HDRConfig.PaperWhiteNits * HDRConfig.UIBrightnessMultiplier;
            const FString UICmd = FString::Printf(
                TEXT("r.HDR.UI.Level %.2f"), UILuminance);
            GEngine->Exec(nullptr, *UICmd);
        }
    }
    else
    {
        // HDR 비활성화
        if (GEngine)
        {
            GEngine->Exec(nullptr, TEXT("r.HDR.EnableHDROutput 0"));
        }
    }

    OnHDRSettingsChanged.Broadcast(HDRConfig);
    UE_LOG(LogTemp, Log, TEXT("[ResolutionManager] HDR %s — 피크=%.0f nit, 페이퍼화이트=%.0f nit"),
        HDRConfig.bEnabled ? TEXT("활성화") : TEXT("비활성화"),
        HDRConfig.PeakBrightnessNits, HDRConfig.PaperWhiteNits);
}

bool UResolutionManager::IsHDRSupported() const
{
    // UE5 HDR 디스플레이 감지
    FDisplayMetrics Metrics;
    FDisplayMetrics::RebuildDisplayMetrics(Metrics);

    // 플랫폼별 HDR 지원 체크
#if PLATFORM_PS5 || PLATFORM_XSX
    return true; // 콘솔은 기본 HDR 지원
#else
    // PC: 모니터 HDR 지원 여부 확인 (UE5 내부 API)
    return GEngine ? GEngine->IsHDREnabled() : false;
#endif
}

// ═══════════════════════════════════════════════════════════════
// UI 스케일
// ═══════════════════════════════════════════════════════════════

void UResolutionManager::SetUIScale(float InScale)
{
    UIScaleFactor = FMath::Clamp(InScale, 0.5f, 2.0f);
    OnUIScaleChanged.Broadcast(UIScaleFactor);

    UE_LOG(LogTemp, Log, TEXT("[ResolutionManager] UI 스케일 → %.2f"), UIScaleFactor);
}

void UResolutionManager::AutoDetectUIScale()
{
    // 해상도 기반 DPI 스케일 자동 계산
    // 기준: 1080p = 1.0x, 1440p = 1.33x, 4K = 2.0x
    const float PixelHeight = static_cast<float>(CurrentResolution.Y);

    if (PixelHeight >= 2160.0f)
    {
        UIScaleFactor = 2.0f;
    }
    else if (PixelHeight >= 1440.0f)
    {
        UIScaleFactor = 1.33f;
    }
    else
    {
        UIScaleFactor = 1.0f;
    }

    OnUIScaleChanged.Broadcast(UIScaleFactor);
    UE_LOG(LogTemp, Log, TEXT("[ResolutionManager] 자동 UI 스케일 → %.2f (해상도 Y=%d)"),
        UIScaleFactor, CurrentResolution.Y);
}

void UResolutionManager::ApplyPlatformDefaults()
{
    DetectAndApplyDefaults();
}

// ═══════════════════════════════════════════════════════════════
// ST.2084 PQ 변환
// ═══════════════════════════════════════════════════════════════

float UResolutionManager::LinearToPQ(float LinearValue)
{
    // 입력: 선형 밝기 [0, 1] (1.0 = 10000 니트)
    const float Y = FMath::Max(LinearValue, 0.0f);
    const float Ym1 = FMath::Pow(Y, PQConstants::M1);
    const float Numerator = PQConstants::C1 + PQConstants::C2 * Ym1;
    const float Denominator = 1.0f + PQConstants::C3 * Ym1;
    return FMath::Pow(Numerator / Denominator, PQConstants::M2);
}

float UResolutionManager::PQToLinear(float PQValue)
{
    // 입력: PQ 인코딩 값 [0, 1]
    const float Vp = FMath::Max(PQValue, 0.0f);
    const float Vpm2 = FMath::Pow(Vp, 1.0f / PQConstants::M2);
    const float Numerator = FMath::Max(Vpm2 - PQConstants::C1, 0.0f);
    const float Denominator = PQConstants::C2 - PQConstants::C3 * Vpm2;
    return FMath::Pow(Numerator / FMath::Max(Denominator, SMALL_NUMBER), 1.0f / PQConstants::M1);
}

// ═══════════════════════════════════════════════════════════════
// 플랫폼 기본값
// ═══════════════════════════════════════════════════════════════

void UResolutionManager::DetectAndApplyDefaults()
{
#if PLATFORM_PS5
    // PS5: 4K + HDR + 60FPS 기본
    SetResolutionPreset(EResolutionPreset::Res_4K);
    SetFrameRateTarget(EFrameRateTarget::FPS_60);
    FHDRSettings PS5HDR;
    PS5HDR.bEnabled = true;
    PS5HDR.PeakBrightnessNits = 1000.0f;
    PS5HDR.PaperWhiteNits = 200.0f;
    PS5HDR.bUseST2084 = true;
    SetHDRSettings(PS5HDR);

#elif PLATFORM_XSX
    // Xbox Series X: 4K + HDR + 60FPS
    SetResolutionPreset(EResolutionPreset::Res_4K);
    SetFrameRateTarget(EFrameRateTarget::FPS_60);
    FHDRSettings XboxHDR;
    XboxHDR.bEnabled = true;
    XboxHDR.PeakBrightnessNits = 1000.0f;
    XboxHDR.bUseST2084 = true;
    SetHDRSettings(XboxHDR);

#elif PLATFORM_XBOXONE
    // Xbox Series S: 1440p + HDR + 60FPS
    SetResolutionPreset(EResolutionPreset::Res_1440p);
    SetFrameRateTarget(EFrameRateTarget::FPS_60);
    FHDRSettings XboxSHDR;
    XboxSHDR.bEnabled = true;
    XboxSHDR.PeakBrightnessNits = 800.0f;
    XboxSHDR.bUseST2084 = true;
    SetHDRSettings(XboxSHDR);

#else
    // PC: 자동 감지
    SetResolutionPreset(EResolutionPreset::Res_Auto);
    SetFrameRateTarget(EFrameRateTarget::FPS_60);

    // HDR은 디스플레이 지원 시에만 활성화
    FHDRSettings PCHDR;
    PCHDR.bEnabled = IsHDRSupported();
    PCHDR.PeakBrightnessNits = 1000.0f;
    PCHDR.PaperWhiteNits = 200.0f;
    PCHDR.bUseST2084 = true;
    SetHDRSettings(PCHDR);
#endif
}
