#include "HudOverlayWidget.h"
#include "HudStatusBarWidget.h"
#include "HudQuickSlotBarWidget.h"
#include "HudQuestTrackerWidget.h"
#include "HudDialogueBoxWidget.h"

void UHudOverlayWidget::SetStatus(const FHudStatusProps& InStatus)
{
    if (HudStatusBar) { HudStatusBar->ApplyStatus(InStatus); }
}

void UHudOverlayWidget::SetQuickSlots(const TArray<FQuickSlotData>& InSlots, const FString& InputMode)
{
    if (HudQuickSlotBar) { HudQuickSlotBar->ApplySlots(InSlots, InputMode); }
}

void UHudOverlayWidget::SetQuestList(const TArray<FQuestItem>& InQuests)
{
    if (HudQuestTracker) { HudQuestTracker->ApplyQuests(InQuests); }
}

void UHudOverlayWidget::ShowDialogue(const FDialogueData& InDialogue)
{
    if (HudDialogueBox) { HudDialogueBox->Show(InDialogue); }
}

void UHudOverlayWidget::HideDialogue()
{
    if (HudDialogueBox) { HudDialogueBox->Hide(); }
}
