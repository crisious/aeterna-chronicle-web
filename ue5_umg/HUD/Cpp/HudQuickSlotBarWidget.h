#pragma once

#include "CoreMinimal.h"
#include "Blueprint/UserWidget.h"
#include "HudContracts.h"
#include "HudQuickSlotBarWidget.generated.h"

UCLASS()
class UHudQuickSlotBarWidget : public UUserWidget
{
    GENERATED_BODY()

public:
    UFUNCTION(BlueprintImplementableEvent) void BP_OnSlotsUpdated(const TArray<FQuickSlotData>& InSlots, const FString& InputMode);
    UFUNCTION(BlueprintCallable) void ApplySlots(const TArray<FQuickSlotData>& InSlots, const FString& InputMode);
    UFUNCTION(BlueprintCallable) void TickCooldown(int32 DeltaMs);

private:
    UPROPERTY() TArray<FQuickSlotData> CachedSlots;
    FString CachedInputMode = TEXT("keyboard");
};
