// SafeZoneWrapper.cpp
// 에테르나 크로니클 — Safe Zone 래퍼 구현
#include "SafeZoneWrapper.h"

#include "Components/SafeZone.h"
#include "Components/Overlay.h"
#include "Widgets/Layout/SSafeZone.h"
#include "GameFramework/GameUserSettings.h"

// ═══════════════════════════════════════════════════════════════
// 생성자
// ═══════════════════════════════════════════════════════════════

USafeZoneWrapper::USafeZoneWrapper(const FObjectInitializer& ObjectInitializer)
    : Super(ObjectInitializer)
{
}

// ═══════════════════════════════════════════════════════════════
// 라이프사이클
// ═══════════════════════════════════════════════════════════════

void USafeZoneWrapper::NativeConstruct()
{
    Super::NativeConstruct();
    InitializeForCurrentPlatform();
}

// ═══════════════════════════════════════════════════════════════
// 초기화
// ═══════════════════════════════════════════════════════════════

void USafeZoneWrapper::InitializeForCurrentPlatform()
{
    DetectedPlatform = DetectCurrentPlatform();
    const float DefaultPadding = GetDefaultSafeZoneForPlatform(DetectedPlatform);

    // 저장된 사용자 설정이 있으면 그것을 우선 사용
    // (SaveGame 태그 — GameUserSettings에서 로드)
    if (SafeZonePadding <= 0.0f || SafeZonePadding > 1.0f)
    {
        SafeZonePadding = DefaultPadding;
    }

    ApplySafeZonePadding();

    UE_LOG(LogTemp, Log, TEXT("[SafeZone] 플랫폼=%d, 패딩=%.2f"),
        static_cast<int32>(DetectedPlatform), SafeZonePadding);
}

void USafeZoneWrapper::InitializeForPlatform(EConsolePlatform Platform)
{
    DetectedPlatform = Platform;
    SafeZonePadding = GetDefaultSafeZoneForPlatform(Platform);
    ApplySafeZonePadding();
}

// ═══════════════════════════════════════════════════════════════
// Safe Zone 제어
// ═══════════════════════════════════════════════════════════════

void USafeZoneWrapper::SetSafeZonePadding(float InPadding)
{
    SafeZonePadding = FMath::Clamp(InPadding, 0.5f, 1.0f);
    ApplySafeZonePadding();
    OnSafeZoneChanged.Broadcast(SafeZonePadding);

    UE_LOG(LogTemp, Log, TEXT("[SafeZone] 패딩 변경 → %.2f"), SafeZonePadding);
}

float USafeZoneWrapper::GetDefaultSafeZoneForPlatform(EConsolePlatform Platform)
{
    // 플랫폼별 기본 Safe Zone 비율
    // 값이 낮을수록 더 많은 여백 (= 더 안전)
    switch (Platform)
    {
    case EConsolePlatform::PS5:      return 0.90f;  // 소니 TRC 권장 90%
    case EConsolePlatform::XboxX:    return 0.93f;  // Xbox XR 권장 93%
    case EConsolePlatform::XboxS:    return 0.93f;
    case EConsolePlatform::Switch2:  return 0.90f;  // 닌텐도 가이드라인
    case EConsolePlatform::PC:
    default:                         return 1.00f;  // PC는 전체 화면 사용
    }
}

// ═══════════════════════════════════════════════════════════════
// 내부 함수
// ═══════════════════════════════════════════════════════════════

EConsolePlatform USafeZoneWrapper::DetectCurrentPlatform()
{
    // UE5 플랫폼 매크로 기반 감지
#if PLATFORM_PS5
    return EConsolePlatform::PS5;
#elif PLATFORM_XBOXONE || PLATFORM_XSX
    // Xbox Series X|S 구분 — GPU 메모리 기준 간이 판별
    const uint64 VideoMemMB = FPlatformMemory::GetConstants().TotalPhysical / (1024 * 1024);
    return (VideoMemMB > 12000) ? EConsolePlatform::XboxX : EConsolePlatform::XboxS;
#elif PLATFORM_SWITCH
    return EConsolePlatform::Switch2;
#else
    return EConsolePlatform::PC;
#endif
}

void USafeZoneWrapper::ApplySafeZonePadding()
{
    if (!InnerSafeZone) return;

    // UMG SafeZone 위젯의 패딩을 비율로 설정
    // SSafeZone은 FDisplayMetrics의 TitleSafePaddingSize를 참조하지만,
    // 여기서는 사용자 오버라이드를 지원하기 위해 수동 마진 적용
    FMargin SafeMargin;
    const float MarginRatio = (1.0f - SafeZonePadding) * 0.5f;

    // 뷰포트 크기 기반 마진 계산
    FVector2D ViewportSize;
    if (GEngine && GEngine->GameViewport)
    {
        GEngine->GameViewport->GetViewportSize(ViewportSize);
    }
    else
    {
        ViewportSize = FVector2D(1920.0f, 1080.0f);
    }

    SafeMargin.Left   = ViewportSize.X * MarginRatio;
    SafeMargin.Right  = ViewportSize.X * MarginRatio;
    SafeMargin.Top    = ViewportSize.Y * MarginRatio;
    SafeMargin.Bottom = ViewportSize.Y * MarginRatio;

    // SSafeZone의 SetSafeAreaScale 사용 (UE5.5 API)
    InnerSafeZone->SetPadding(SafeMargin);

    UE_LOG(LogTemp, Verbose, TEXT("[SafeZone] 마진 적용: L=%.0f R=%.0f T=%.0f B=%.0f"),
        SafeMargin.Left, SafeMargin.Right, SafeMargin.Top, SafeMargin.Bottom);
}
