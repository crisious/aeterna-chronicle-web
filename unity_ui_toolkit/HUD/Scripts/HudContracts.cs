using System;
using System.Collections.Generic;

namespace Aeterna.UI
{
    [Serializable]
    public struct HudStatusProps
    {
        public int HpCurrent;
        public int HpMax;
        public int MpCurrent;
        public int MpMax;
        public int Level;
        public float ExpRatio;
        public string CharacterName;
        public float DangerHpThreshold;
    }

    [Serializable]
    public struct QuickSlotData
    {
        public int SlotIndex;
        public string Icon;
        public string Label;
        public int CooldownMs;
        public int RemainingCooldownMs;
        public int StackCount;
        public bool IsUsable;
        public string Hotkey;
    }

    [Serializable]
    public struct QuestItem
    {
        public string QuestId;
        public string Title;
        public string ObjectiveText;
        public int ProgressCurrent;
        public int ProgressTarget;
        public bool IsMainQuest;
        public bool IsCompleted;
        public int DistanceMeters;
    }

    [Serializable]
    public struct DialogueChoice
    {
        public string ChoiceId;
        public string Text;
        public bool Disabled;
        public string Hint;
    }

    [Serializable]
    public struct DialogueData
    {
        public string SpeakerName;
        public string BodyText;
        public List<DialogueChoice> Choices;
        public bool CanSkip;
    }
}
