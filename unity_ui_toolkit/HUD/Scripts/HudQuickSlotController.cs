using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UIElements;

namespace Aeterna.UI
{
    public class HudQuickSlotController
    {
        private readonly Label inputModeLabel;
        private readonly VisualElement slotGrid;
        private readonly List<QuickSlotData> slots = new();

        public HudQuickSlotController(VisualElement root)
        {
            inputModeLabel = root.Q<Label>("inputModeLabel");
            slotGrid = root.Q<VisualElement>("slotGrid");
        }

        public void Set(List<QuickSlotData> nextSlots, string inputMode)
        {
            slots.Clear();
            slots.AddRange(nextSlots);
            inputModeLabel.text = $"Input: {inputMode}";
            Render();
        }

        public void Tick(int deltaMs)
        {
            var dirty = false;
            for (var i = 0; i < slots.Count; i++)
            {
                if (slots[i].RemainingCooldownMs <= 0) continue;
                var s = slots[i];
                s.RemainingCooldownMs = Mathf.Max(0, s.RemainingCooldownMs - deltaMs);
                slots[i] = s;
                dirty = true;
            }
            if (dirty) Render();
        }

        private void Render()
        {
            slotGrid.Clear();
            foreach (var slot in slots)
            {
                var item = new VisualElement();
                item.AddToClassList("slot-item");
                if (slot.RemainingCooldownMs > 0) item.AddToClassList("cooldown");

                item.Add(new Label($"[{slot.Hotkey}] {slot.Label}"));
                item.Add(new Label(slot.RemainingCooldownMs > 0 ? $"CD: {Mathf.CeilToInt(slot.RemainingCooldownMs / 1000f)}s" : "Ready"));
                item.Add(new Label(slot.StackCount > 0 ? $"x{slot.StackCount}" : "-"));

                slotGrid.Add(item);
            }
        }
    }
}
