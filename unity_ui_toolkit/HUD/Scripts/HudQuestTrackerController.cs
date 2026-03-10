using System.Collections.Generic;
using UnityEngine.UIElements;

namespace Aeterna.UI
{
    public class HudQuestTrackerController
    {
        private readonly VisualElement questList;

        public HudQuestTrackerController(VisualElement root)
        {
            questList = root.Q<VisualElement>("questList");
        }

        public void Set(List<QuestItem> quests)
        {
            questList.Clear();
            var count = 0;
            foreach (var q in quests)
            {
                if (count++ >= 3) break;

                var row = new VisualElement();
                row.AddToClassList("quest-row");
                row.Add(new Label($"[{(q.IsMainQuest ? "MAIN" : "SUB")}] {q.Title}"));
                row.Add(new Label(q.ObjectiveText));
                row.Add(new Label($"{q.ProgressCurrent}/{q.ProgressTarget}" + (q.DistanceMeters > 0 ? $" · {q.DistanceMeters}m" : string.Empty)));
                questList.Add(row);
            }
        }
    }
}
