using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UIElements;

namespace Aeterna.UI
{
    public class HudController : MonoBehaviour
    {
        [SerializeField] private UIDocument rootDocument;
        [SerializeField] private VisualTreeAsset statusAsset;
        [SerializeField] private VisualTreeAsset quickSlotAsset;
        [SerializeField] private VisualTreeAsset questAsset;
        [SerializeField] private VisualTreeAsset dialogueAsset;
        [SerializeField] private StyleSheet hudStyle;

        private HudStatusBarController status;
        private HudQuickSlotController quickSlots;
        private HudQuestTrackerController quest;
        private HudDialogueController dialogue;

        private void Awake()
        {
            var root = rootDocument.rootVisualElement;
            root.styleSheets.Add(hudStyle);

            var statusRoot = statusAsset.Instantiate();
            var quickRoot = quickSlotAsset.Instantiate();
            var questRoot = questAsset.Instantiate();
            var dialogueRoot = dialogueAsset.Instantiate();

            root.Q<VisualElement>("statusMount").Add(statusRoot);
            root.Q<VisualElement>("quickSlotMount").Add(quickRoot);
            root.Q<VisualElement>("questMount").Add(questRoot);
            root.Q<VisualElement>("dialogueMount").Add(dialogueRoot);

            status = new HudStatusBarController(statusRoot);
            quickSlots = new HudQuickSlotController(quickRoot);
            quest = new HudQuestTrackerController(questRoot);
            dialogue = new HudDialogueController(dialogueRoot);
        }

        public void SetStatus(HudStatusProps props) => status.Set(props);
        public void SetQuickSlots(List<QuickSlotData> slots, string inputMode = "keyboard") => quickSlots.Set(slots, inputMode);
        public void SetQuest(List<QuestItem> quests) => quest.Set(quests);
        public void ShowDialogue(DialogueData data) => dialogue.Show(data);
        public void HideDialogue() => dialogue.Hide();

        public void TickCooldown(int deltaMs)
        {
            quickSlots.Tick(deltaMs);
        }
    }
}
