#pragma once

#include "CoreMinimal.h"
#include "Blueprint/UserWidget.h"
#include "HudContracts.h"
#include "HudDialogueBoxWidget.generated.h"

UCLASS()
class UHudDialogueBoxWidget : public UUserWidget
{
    GENERATED_BODY()

public:
    UFUNCTION(BlueprintImplementableEvent) void BP_OnDialogueShown(const FDialogueData& InDialogue);
    UFUNCTION(BlueprintImplementableEvent) void BP_OnDialogueHidden();

    UFUNCTION(BlueprintCallable) void Show(const FDialogueData& InDialogue);
    UFUNCTION(BlueprintCallable) void Hide();
};
