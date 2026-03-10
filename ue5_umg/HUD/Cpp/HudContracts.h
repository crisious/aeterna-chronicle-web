#pragma once

#include "CoreMinimal.h"
#include "HudContracts.generated.h"

USTRUCT(BlueprintType)
struct FHudStatusProps
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite) int32 HpCurrent = 100;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) int32 HpMax = 100;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) int32 MpCurrent = 100;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) int32 MpMax = 100;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) int32 Level = 1;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) float ExpRatio = 0.0f;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) FString AvatarUrl;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) FString CharacterName = TEXT("Erien");
    UPROPERTY(EditAnywhere, BlueprintReadWrite) float DangerHpThreshold = 0.2f;
};

USTRUCT(BlueprintType)
struct FQuickSlotData
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite) int32 SlotIndex = 0;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) FString Icon;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) FString Label;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) int32 CooldownMs = 0;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) int32 RemainingCooldownMs = 0;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) int32 StackCount = 0;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) bool bIsUsable = true;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) FString Hotkey;
};

USTRUCT(BlueprintType)
struct FQuestItem
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite) FString QuestId;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) FString Title;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) FString ObjectiveText;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) int32 ProgressCurrent = 0;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) int32 ProgressTarget = 0;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) bool bIsMainQuest = false;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) bool bIsCompleted = false;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) int32 DistanceMeters = 0;
};

USTRUCT(BlueprintType)
struct FDialogueChoice
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite) FString ChoiceId;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) FString Text;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) bool bDisabled = false;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) FString Hint;
};

USTRUCT(BlueprintType)
struct FDialogueData
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite) FString SpeakerName;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) FString BodyText;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) TArray<FDialogueChoice> Choices;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) bool bCanSkip = true;
    UPROPERTY(EditAnywhere, BlueprintReadWrite) int32 AutoAdvanceMs = 0;
};
