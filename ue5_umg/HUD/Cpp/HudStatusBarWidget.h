#pragma once

#include "CoreMinimal.h"
#include "Blueprint/UserWidget.h"
#include "HudContracts.h"
#include "HudStatusBarWidget.generated.h"

UCLASS()
class UHudStatusBarWidget : public UUserWidget
{
    GENERATED_BODY()

public:
    UFUNCTION(BlueprintImplementableEvent) void BP_OnStatusUpdated(const FHudStatusProps& InStatus);
    UFUNCTION(BlueprintCallable) void ApplyStatus(const FHudStatusProps& InStatus);

private:
    bool bCriticalNotified = false;
};
