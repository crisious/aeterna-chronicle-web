#pragma once

#include "CoreMinimal.h"
#include "Blueprint/UserWidget.h"
#include "HudContracts.h"
#include "HudOverlayWidget.generated.h"

class UHudStatusBarWidget;
class UHudQuickSlotBarWidget;
class UHudQuestTrackerWidget;
class UHudDialogueBoxWidget;

UCLASS()
class UHudOverlayWidget : public UUserWidget
{
    GENERATED_BODY()

public:
    UFUNCTION(BlueprintCallable) void SetStatus(const FHudStatusProps& InStatus);
    UFUNCTION(BlueprintCallable) void SetQuickSlots(const TArray<FQuickSlotData>& InSlots, const FString& InputMode);
    UFUNCTION(BlueprintCallable) void SetQuestList(const TArray<FQuestItem>& InQuests);
    UFUNCTION(BlueprintCallable) void ShowDialogue(const FDialogueData& InDialogue);
    UFUNCTION(BlueprintCallable) void HideDialogue();

protected:
    UPROPERTY(meta=(BindWidgetOptional)) TObjectPtr<UHudStatusBarWidget> HudStatusBar;
    UPROPERTY(meta=(BindWidgetOptional)) TObjectPtr<UHudQuickSlotBarWidget> HudQuickSlotBar;
    UPROPERTY(meta=(BindWidgetOptional)) TObjectPtr<UHudQuestTrackerWidget> HudQuestTracker;
    UPROPERTY(meta=(BindWidgetOptional)) TObjectPtr<UHudDialogueBoxWidget> HudDialogueBox;
};
