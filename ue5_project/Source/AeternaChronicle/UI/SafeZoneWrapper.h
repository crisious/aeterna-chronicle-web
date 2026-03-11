// SafeZoneWrapper.h
// 에테르나 크로니클 — Safe Zone UMG 래퍼
// 플랫폼별 안전 영역 관리 + 런타임 사용자 조절
#pragma once

#include "CoreMinimal.h"
#include "Blueprint/UserWidget.h"
#include "SafeZoneWrapper.generated.h"

class SSafeZone;
class USafeZone;
class UOverlay;

// ─── 플랫폼별 Safe Zone 기본값 ──────────────────────────────
UENUM(BlueprintType)
enum class EConsolePlatform : uint8
{
    PC       UMETA(DisplayName = "PC"),
    PS5      UMETA(DisplayName = "PlayStation 5"),
    XboxX    UMETA(DisplayName = "Xbox Series X"),
    XboxS    UMETA(DisplayName = "Xbox Series S"),
    Switch2  UMETA(DisplayName = "Nintendo Switch 2")
};

// ─── Safe Zone 변경 델리게이트 ──────────────────────────────
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnSafeZoneChanged, float, NewPadding);

// ═══════════════════════════════════════════════════════════════
// USafeZoneWrapper
// 모든 콘솔 UI 위젯의 루트로 사용 — 내부 콘텐츠를 Safe Zone 안에 배치
// ═══════════════════════════════════════════════════════════════
UCLASS()
class AETERNACHRONICLE_API USafeZoneWrapper : public UUserWidget
{
    GENERATED_BODY()

public:
    USafeZoneWrapper(const FObjectInitializer& ObjectInitializer);

    // ── 초기화 ──────────────────────────────────────────────

    /** 플랫폼 자동 감지 후 기본 Safe Zone 비율 적용 */
    UFUNCTION(BlueprintCallable, Category = "SafeZone")
    void InitializeForCurrentPlatform();

    /** 특정 플랫폼으로 수동 초기화 (디버그/테스트용) */
    UFUNCTION(BlueprintCallable, Category = "SafeZone")
    void InitializeForPlatform(EConsolePlatform Platform);

    // ── Safe Zone 제어 ──────────────────────────────────────

    /** Safe Zone 패딩 비율 설정 (0.0 ~ 1.0, 1.0 = 패딩 없음) */
    UFUNCTION(BlueprintCallable, Category = "SafeZone")
    void SetSafeZonePadding(float InPadding);

    /** 현재 Safe Zone 패딩 비율 */
    UFUNCTION(BlueprintPure, Category = "SafeZone")
    float GetSafeZonePadding() const { return SafeZonePadding; }

    /** 플랫폼별 기본 Safe Zone 비율 반환 */
    UFUNCTION(BlueprintPure, Category = "SafeZone")
    static float GetDefaultSafeZoneForPlatform(EConsolePlatform Platform);

    /** 현재 감지된 플랫폼 */
    UFUNCTION(BlueprintPure, Category = "SafeZone")
    EConsolePlatform GetDetectedPlatform() const { return DetectedPlatform; }

    /** Safe Zone 변경 이벤트 — 설정 메뉴 슬라이더 등에서 구독 */
    UPROPERTY(BlueprintAssignable, Category = "SafeZone")
    FOnSafeZoneChanged OnSafeZoneChanged;

protected:
    virtual void NativeConstruct() override;

    // ── 바인드 위젯 ─────────────────────────────────────────

    /** UMG SafeZone 위젯 — 블루프린트에서 바인딩 */
    UPROPERTY(meta = (BindWidget)) TObjectPtr<USafeZone> InnerSafeZone;

    /** SafeZone 내부 콘텐츠 컨테이너 */
    UPROPERTY(meta = (BindWidget)) TObjectPtr<UOverlay> ContentOverlay;

    // ── 상태 ────────────────────────────────────────────────

    /** 현재 Safe Zone 패딩 (0.0 ~ 1.0) */
    UPROPERTY(SaveGame) float SafeZonePadding = 1.0f;

    /** 감지된 콘솔 플랫폼 */
    UPROPERTY() EConsolePlatform DetectedPlatform = EConsolePlatform::PC;

    // ── 내부 함수 ───────────────────────────────────────────

    /** 현재 실행 플랫폼 자동 감지 */
    static EConsolePlatform DetectCurrentPlatform();

    /** Safe Zone 슬레이트 위젯에 패딩 적용 */
    void ApplySafeZonePadding();
};
