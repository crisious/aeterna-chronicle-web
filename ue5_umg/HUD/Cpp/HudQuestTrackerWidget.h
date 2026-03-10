#pragma once

#include "CoreMinimal.h"
#include "Blueprint/UserWidget.h"
#include "HudContracts.h"
#include "HudQuestTrackerWidget.generated.h"

UCLASS()
class UHudQuestTrackerWidget : public UUserWidget
{
    GENERATED_BODY()

public:
    UFUNCTION(BlueprintImplementableEvent) void BP_OnQuestUpdated(const TArray<FQuestItem>& InVisibleQuests);
    UFUNCTION(BlueprintCallable) void ApplyQuests(const TArray<FQuestItem>& InQuests, int32 MaxVisible = 3);
};
