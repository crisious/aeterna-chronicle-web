using UnityEngine;
using UnityEngine.UIElements;

namespace Aeterna.UI
{
    public class HudStatusBarController
    {
        private readonly Label nameLabel;
        private readonly Label levelLabel;
        private readonly Label hpText;
        private readonly Label mpText;
        private readonly VisualElement hpFill;
        private readonly VisualElement mpFill;
        private readonly VisualElement expFill;

        public HudStatusBarController(VisualElement root)
        {
            nameLabel = root.Q<Label>("characterName");
            levelLabel = root.Q<Label>("levelLabel");
            hpText = root.Q<Label>("hpText");
            mpText = root.Q<Label>("mpText");
            hpFill = root.Q<VisualElement>("hpFill");
            mpFill = root.Q<VisualElement>("mpFill");
            expFill = root.Q<VisualElement>("expFill");
        }

        public void Set(HudStatusProps props)
        {
            nameLabel.text = props.CharacterName;
            levelLabel.text = $"Lv.{props.Level}";
            hpText.text = $"{props.HpCurrent}/{props.HpMax}";
            mpText.text = $"{props.MpCurrent}/{props.MpMax}";

            hpFill.style.width = Length.Percent(SafeRatio(props.HpCurrent, props.HpMax) * 100f);
            mpFill.style.width = Length.Percent(SafeRatio(props.MpCurrent, props.MpMax) * 100f);
            expFill.style.width = Length.Percent(Mathf.Clamp01(props.ExpRatio) * 100f);
        }

        private static float SafeRatio(int current, int max)
        {
            if (max <= 0) return 0f;
            return Mathf.Clamp01((float)current / max);
        }
    }
}
