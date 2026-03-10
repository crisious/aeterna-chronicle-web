#include "HudQuestTrackerWidget.h"

void UHudQuestTrackerWidget::ApplyQuests(const TArray<FQuestItem>& InQuests, int32 MaxVisible)
{
    TArray<FQuestItem> Visible;
    const int32 Count = FMath::Min(MaxVisible, InQuests.Num());
    for (int32 Index = 0; Index < Count; ++Index)
    {
        Visible.Add(InQuests[Index]);
    }

    BP_OnQuestUpdated(Visible);
}
