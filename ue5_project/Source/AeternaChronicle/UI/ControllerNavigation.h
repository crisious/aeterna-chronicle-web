// ControllerNavigation.h
// 에테르나 크로니클 — 게임패드 포커스 내비게이션 시스템
// D-pad/스틱 → 위젯 포커스, A/B → 확인/취소, 트리거/범퍼 → 탭 전환
#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "ControllerNavigation.generated.h"

class UUserWidget;
class UWidget;
class UConsoleUIManager;

// ─── 버튼 매핑 프리셋 ───────────────────────────────────────
UENUM(BlueprintType)
enum class EButtonMappingPreset : uint8
{
    Western  UMETA(DisplayName = "서양식 (A=확인, B=취소)"),
    Japanese UMETA(DisplayName = "일본식 (B=확인, A=취소)")
};

// ─── 네비게이션 방향 ────────────────────────────────────────
UENUM(BlueprintType)
enum class ENavDirection : uint8
{
    Up,
    Down,
    Left,
    Right
};

// ─── 탭 전환 이벤트 ─────────────────────────────────────────
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnTabChanged, int32, NewTabIndex);
DECLARE_DYNAMIC_MULTICAST_DELEGATE(FOnConfirmPressed);
DECLARE_DYNAMIC_MULTICAST_DELEGATE(FOnCancelPressed);

// ═══════════════════════════════════════════════════════════════
// UControllerNavigation
// PlayerController에 부착하는 컴포넌트 — 게임패드 UI 내비게이션 전담
// ═══════════════════════════════════════════════════════════════
UCLASS(ClassGroup = (UI), meta = (BlueprintSpawnableComponent))
class AETERNACHRONICLE_API UControllerNavigation : public UActorComponent
{
    GENERATED_BODY()

public:
    UControllerNavigation();

    // ── 초기화 ──────────────────────────────────────────────

    virtual void BeginPlay() override;
    virtual void TickComponent(float DeltaTime, ELevelTick TickType,
        FActorComponentTickFunction* ThisTickFunction) override;

    // ── 버튼 매핑 ───────────────────────────────────────────

    /** 확인/취소 버튼 매핑 프리셋 설정 */
    UFUNCTION(BlueprintCallable, Category = "Navigation")
    void SetButtonMapping(EButtonMappingPreset Preset);

    UFUNCTION(BlueprintPure, Category = "Navigation")
    EButtonMappingPreset GetButtonMapping() const { return CurrentMapping; }

    // ── 내비게이션 ──────────────────────────────────────────

    /** 지정 방향으로 포커스 이동 */
    UFUNCTION(BlueprintCallable, Category = "Navigation")
    void NavigateFocus(ENavDirection Direction);

    /** 현재 포커스된 위젯 반환 */
    UFUNCTION(BlueprintPure, Category = "Navigation")
    UWidget* GetCurrentFocusedWidget() const;

    /** 탭 인덱스 변경 (범퍼/트리거) */
    UFUNCTION(BlueprintCallable, Category = "Navigation")
    void SwitchTab(int32 Direction);

    /** 현재 탭 인덱스 */
    UFUNCTION(BlueprintPure, Category = "Navigation")
    int32 GetCurrentTabIndex() const { return CurrentTabIndex; }

    /** 탭 총 개수 설정 (위젯에서 등록) */
    UFUNCTION(BlueprintCallable, Category = "Navigation")
    void SetTabCount(int32 Count) { TabCount = FMath::Max(Count, 1); }

    // ── 이벤트 ──────────────────────────────────────────────

    UPROPERTY(BlueprintAssignable) FOnTabChanged OnTabChanged;
    UPROPERTY(BlueprintAssignable) FOnConfirmPressed OnConfirmPressed;
    UPROPERTY(BlueprintAssignable) FOnCancelPressed OnCancelPressed;

    // ── 설정 ────────────────────────────────────────────────

    /** 스틱 데드존 (0.0 ~ 1.0) */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Navigation",
        meta = (ClampMin = "0.0", ClampMax = "0.5"))
    float StickDeadzone = 0.25f;

    /** 스틱 연속 입력 반복 간격 (초) */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Navigation",
        meta = (ClampMin = "0.05", ClampMax = "0.5"))
    float StickRepeatInterval = 0.15f;

    /** 첫 반복까지 대기 시간 (초) */
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Navigation",
        meta = (ClampMin = "0.1", ClampMax = "1.0"))
    float StickRepeatDelay = 0.3f;

protected:
    // 현재 버튼 매핑
    UPROPERTY() EButtonMappingPreset CurrentMapping = EButtonMappingPreset::Western;

    // 탭 상태
    UPROPERTY() int32 CurrentTabIndex = 0;
    UPROPERTY() int32 TabCount = 1;

    // 스틱 반복 입력 타이머
    float StickHoldTime = 0.0f;
    float LastRepeatTime = 0.0f;
    ENavDirection LastStickDirection = ENavDirection::Up;
    bool bStickHeld = false;

    // ConsoleUIManager 캐시 참조
    UPROPERTY() TWeakObjectPtr<UConsoleUIManager> UIManager;

    // ── 입력 핸들러 ─────────────────────────────────────────

    /** D-pad 입력 처리 */
    void HandleDPadInput(ENavDirection Direction);

    /** 스틱 아날로그 입력 → 방향 변환 */
    ENavDirection StickToDirection(FVector2D StickValue) const;

    /** 확인 버튼 처리 — 현재 포커스 위젯 활성화 */
    void HandleConfirm();

    /** 취소 버튼 처리 — UI 스택 Pop 또는 커스텀 동작 */
    void HandleCancel();

    /** LB/RB 트리거 → 탭 전환 */
    void HandleTabSwitch(int32 Direction);

    /** 포커스 가능한 위젯 목록 수집 (현재 최상단 UI에서) */
    TArray<UWidget*> CollectFocusableWidgets() const;

    /** 방향에 따라 다음 포커스 대상 결정 (공간 기반 검색) */
    UWidget* FindNextFocusWidget(UWidget* Current, ENavDirection Direction) const;

    /** 위젯의 화면 좌표 중심점 반환 */
    static FVector2D GetWidgetScreenCenter(UWidget* Widget);
};
