#include "HudDialogueBoxWidget.h"

void UHudDialogueBoxWidget::Show(const FDialogueData& InDialogue)
{
    SetVisibility(ESlateVisibility::Visible);
    BP_OnDialogueShown(InDialogue);
}

void UHudDialogueBoxWidget::Hide()
{
    SetVisibility(ESlateVisibility::Collapsed);
    BP_OnDialogueHidden();
}
