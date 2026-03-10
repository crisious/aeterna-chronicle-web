#include "HudStatusBarWidget.h"

void UHudStatusBarWidget::ApplyStatus(const FHudStatusProps& InStatus)
{
    const float HpRatio = (InStatus.HpMax > 0) ? static_cast<float>(InStatus.HpCurrent) / static_cast<float>(InStatus.HpMax) : 0.f;
    const bool bCritical = HpRatio <= InStatus.DangerHpThreshold;
    if (bCritical && !bCriticalNotified)
    {
        bCriticalNotified = true;
        // ui.event.status.hp_critical
    }
    if (!bCritical)
    {
        bCriticalNotified = false;
    }

    BP_OnStatusUpdated(InStatus);
}
