#include "HudQuickSlotBarWidget.h"

void UHudQuickSlotBarWidget::ApplySlots(const TArray<FQuickSlotData>& InSlots, const FString& InputMode)
{
    CachedSlots = InSlots;
    CachedInputMode = InputMode;
    BP_OnSlotsUpdated(CachedSlots, CachedInputMode);
}

void UHudQuickSlotBarWidget::TickCooldown(int32 DeltaMs)
{
    bool bDirty = false;
    for (FQuickSlotData& Slot : CachedSlots)
    {
        if (Slot.RemainingCooldownMs <= 0) continue;
        Slot.RemainingCooldownMs = FMath::Max(0, Slot.RemainingCooldownMs - DeltaMs);
        bDirty = true;
    }

    if (bDirty)
    {
        BP_OnSlotsUpdated(CachedSlots, CachedInputMode);
    }
}
