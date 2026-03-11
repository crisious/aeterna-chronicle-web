// ConsoleHudOverlay.h
// 에테르나 크로니클 — 콘솔 HUD 오버레이
// 기존 ue5_umg HUD를 콘솔 환경에 맞게 래핑 — Safe Zone, 게임패드 퀵슬롯, UI 스케일
#pragma once

#include "CoreMinimal.h"
#include "Blueprint/UserWidget.h"
#include "ConsoleHudOverlay.generated.h"

class UHudOverlayWidget;
class USafeZoneWrapper;
class UResolutionManager;
class UConsoleUIManager;

// ─── 퀵슬롯 바인딩 (게임패드 D-pad + 트리거 조합) ──────────
USTRUCT(BlueprintType)
struct FConsoleQuickSlotBinding
{
    GENERATED_BODY()

    /** 기본 슬롯 인덱스 (D-pad 4방향: 0=위, 1=오른쪽, 2=아래, 3=왼쪽) */
    UPROPERTY(EditAnywhere, BlueprintReadWrite) int32 BaseSlotIndex = 0;

    /** 확장 슬롯: LT 홀드 + D-pad (인덱스 4~7) */
    UPROPERTY(EditAnywhere, BlueprintReadWrite) int32 ExtendedSlotIndex = 4;

    /** 표시용 키 힌트 텍스트 */
    UPROPERTY(EditAnywhere, BlueprintReadWrite) FString KeyHintText;
};

// ═══════════════════════════════════════════════════════════════
// UConsoleHudOverlay
// 기존 UHudOverlayWidget을 Safe Zone 안에 배치하고 콘솔 입력 처리 추가
// ═══════════════════════════════════════════════════════════════
UCLASS()
class AETERNACHRONICLE_API UConsoleHudOverlay : public UUserWidget
{
    GENERATED_BODY()

public:
    // ── 초기화 ──────────────────────────────────────────────

    /** HUD 초기화 — 플랫폼 감지, Safe Zone 적용, 스케일 설정 */
    UFUNCTION(BlueprintCallable, Category = "ConsoleHUD")
    void InitializeConsoleHUD();

    // ── 퀵슬롯 (게임패드) ───────────────────────────────────

    /** D-pad 퀵슬롯 사용 (방향 0~3 기본, LT 홀드 시 4~7 확장) */
    UFUNCTION(BlueprintCallable, Category = "ConsoleHUD")
    void UseQuickSlot(int32 DirectionIndex, bool bExtended = false);

    /** 현재 LT(확장 트리거) 홀드 상태 설정 */
    UFUNCTION(BlueprintCallable, Category = "ConsoleHUD")
    void SetExtendedTriggerHeld(bool bHeld);

    /** 퀵슬롯 키 힌트 갱신 (마우스↔게임패드 전환 시) */
    UFUNCTION(BlueprintCallable, Category = "ConsoleHUD")
    void RefreshQuickSlotHints();

    // ── UI 스케일 ───────────────────────────────────────────

    /** 해상도 변경에 따른 HUD 스케일 자동 조절 */
    UFUNCTION(BlueprintCallable, Category = "ConsoleHUD")
    void OnResolutionChanged(float NewUIScale);

    // ── Safe Zone 연동 ──────────────────────────────────────

    /** Safe Zone 패딩 변경 시 HUD 레이아웃 재조정 */
    UFUNCTION(BlueprintCallable, Category = "ConsoleHUD")
    void OnSafeZoneUpdated(float NewPadding);

protected:
    virtual void NativeConstruct() override;
    virtual void NativeTick(const FGeometry& MyGeometry, float InDeltaTime) override;

    // ── 바인드 위젯 ─────────────────────────────────────────

    /** 기존 HUD 오버레이 위젯 (ue5_umg에서 포팅) */
    UPROPERTY(meta = (BindWidget)) TObjectPtr<UHudOverlayWidget> InnerHudOverlay;

    /** Safe Zone 래퍼 */
    UPROPERTY(meta = (BindWidget)) TObjectPtr<USafeZoneWrapper> HudSafeZone;

    // ── 상태 ────────────────────────────────────────────────

    /** 현재 확장 트리거(LT) 홀드 여부 */
    UPROPERTY() bool bExtendedTriggerHeld = false;

    /** 게임패드 퀵슬롯 바인딩 설정 */
    UPROPERTY(EditAnywhere, Category = "ConsoleHUD")
    TArray<FConsoleQuickSlotBinding> QuickSlotBindings;

    /** 현재 UI 스케일 팩터 */
    UPROPERTY() float CurrentUIScale = 1.0f;

    // ── 내부 함수 ───────────────────────────────────────────

    /** 퀵슬롯 바인딩 기본값 생성 (D-pad 4방향 × 2세트) */
    void SetupDefaultBindings();

    /** 게임패드 입력 바인딩 등록 */
    void BindGamepadInputs();

    /** 입력 모드에 따른 UI 힌트 텍스트 결정 */
    FString GetHintTextForSlot(int32 SlotIndex, bool bGamepadMode) const;

    /** 해상도 매니저 변경 이벤트 수신 */
    UFUNCTION()
    void HandleUIScaleChanged(float NewScale);
};
