using UnityEngine.UIElements;

namespace Aeterna.UI
{
    public class HudDialogueController
    {
        private readonly VisualElement root;
        private readonly Label speakerLabel;
        private readonly Label bodyLabel;
        private readonly VisualElement choiceList;

        public HudDialogueController(VisualElement root)
        {
            this.root = root.Q<VisualElement>("hud-dialogue");
            speakerLabel = root.Q<Label>("speakerLabel");
            bodyLabel = root.Q<Label>("bodyLabel");
            choiceList = root.Q<VisualElement>("choiceList");
        }

        public void Show(DialogueData data)
        {
            speakerLabel.text = data.SpeakerName;
            bodyLabel.text = data.BodyText;
            choiceList.Clear();

            if (data.Choices != null)
            {
                foreach (var choice in data.Choices)
                {
                    var button = new Button { text = choice.Text };
                    button.AddToClassList("dialogue-choice");
                    button.SetEnabled(!choice.Disabled);
                    choiceList.Add(button);
                }
            }

            root.style.display = DisplayStyle.Flex;
        }

        public void Hide()
        {
            root.style.display = DisplayStyle.None;
        }
    }
}
