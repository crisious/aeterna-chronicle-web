using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UIElements;
using Newtonsoft.Json.Linq;

namespace EternaChronicle.Combat
{
    /// <summary>
    /// 상태이상 표시 — 10종 상태이상 아이콘 + 지속시간 + 스택 관리
    /// 
    /// 지원 상태이상 10종:
    /// 1. 화상 (Burn)         — 지속 화염 데미지
    /// 2. 빙결 (Freeze)       — 이동/공격 불가
    /// 3. 감전 (Shock)        — 행동 지연 + 추가 뇌 데미지
    /// 4. 중독 (Poison)       — 지속 독 데미지 + 힐 감소
    /// 5. 출혈 (Bleed)        — 이동 시 추가 데미지
    /// 6. 실명 (Blind)        — 명중률 감소
    /// 7. 침묵 (Silence)      — 스킬 사용 불가
    /// 8. 속박 (Root)         — 이동 불가 (공격 가능)
    /// 9. 공포 (Fear)         — 랜덤 이동 + 공격 불가
    /// 10. 기억 침식 (Memory Erosion) — 스킬 쿨다운 증가 + 스탯 감소
    /// </summary>
    public class StatusEffectDisplay : MonoBehaviour
    {
        public static StatusEffectDisplay Instance { get; private set; }

        [Header("UI")]
        [SerializeField] private UIDocument statusUI;
        [SerializeField] private Sprite[] statusIcons; // 10종 아이콘

        public event Action<ActiveEffect> OnEffectApplied;
        public event Action<string> OnEffectRemoved;

        private VisualElement _container;
        private readonly Dictionary<string, ActiveEffect> _activeEffects = new();
        private readonly Dictionary<string, VisualElement> _effectElements = new();

        private static readonly string[] EffectNames =
        {
            "burn", "freeze", "shock", "poison", "bleed",
            "blind", "silence", "root", "fear", "memory_erosion"
        };

        private static readonly Dictionary<string, Color> EffectColors = new()
        {
            { "burn", new Color(1f, 0.4f, 0f) },
            { "freeze", new Color(0.4f, 0.8f, 1f) },
            { "shock", new Color(1f, 1f, 0.3f) },
            { "poison", new Color(0.4f, 0.9f, 0.3f) },
            { "bleed", new Color(0.8f, 0.1f, 0.1f) },
            { "blind", new Color(0.5f, 0.5f, 0.5f) },
            { "silence", new Color(0.7f, 0.3f, 0.8f) },
            { "root", new Color(0.6f, 0.4f, 0.2f) },
            { "fear", new Color(0.3f, 0f, 0.5f) },
            { "memory_erosion", new Color(0.8f, 0.2f, 0.9f) }
        };

        private void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;
        }

        private void OnEnable()
        {
            if (statusUI != null)
                _container = statusUI.rootVisualElement.Q("status-effects");
        }

        private void Update()
        {
            // 지속시간 갱신
            var expired = new List<string>();
            foreach (var kvp in _activeEffects)
            {
                kvp.Value.remainingTime -= Time.deltaTime;
                UpdateEffectUI(kvp.Key, kvp.Value);

                if (kvp.Value.remainingTime <= 0)
                    expired.Add(kvp.Key);
            }

            foreach (var id in expired)
                RemoveEffect(id);
        }

        /// <summary>서버 이벤트 핸들러</summary>
        public void HandleStatusEffect(JObject data)
        {
            var action = data["action"]?.ToString(); // apply, remove, tick
            var effectId = data["effectId"]?.ToString();
            var effectType = data["effectType"]?.ToString();

            switch (action)
            {
                case "apply":
                    var effect = new ActiveEffect
                    {
                        id = effectId,
                        type = effectType,
                        stacks = data["stacks"]?.Value<int>() ?? 1,
                        maxStacks = data["maxStacks"]?.Value<int>() ?? 1,
                        remainingTime = data["duration"]?.Value<float>() ?? 5f,
                        totalDuration = data["duration"]?.Value<float>() ?? 5f,
                        sourceId = data["sourceId"]?.ToString()
                    };
                    ApplyEffect(effect);
                    break;

                case "remove":
                    RemoveEffect(effectId);
                    break;

                case "tick":
                    // 틱 데미지/힐 표시
                    var tickDmg = data["damage"]?.Value<int>() ?? 0;
                    if (tickDmg > 0)
                        Debug.Log($"[Status] {effectType} tick: {tickDmg} dmg");
                    break;

                case "stack":
                    if (_activeEffects.TryGetValue(effectId, out var existing))
                    {
                        existing.stacks = data["stacks"]?.Value<int>() ?? existing.stacks;
                        existing.remainingTime = data["duration"]?.Value<float>() ?? existing.remainingTime;
                    }
                    break;
            }
        }

        private void ApplyEffect(ActiveEffect effect)
        {
            _activeEffects[effect.id] = effect;
            CreateEffectUI(effect);
            OnEffectApplied?.Invoke(effect);
        }

        private void RemoveEffect(string effectId)
        {
            _activeEffects.Remove(effectId);
            if (_effectElements.TryGetValue(effectId, out var elem))
            {
                elem.RemoveFromHierarchy();
                _effectElements.Remove(effectId);
            }
            OnEffectRemoved?.Invoke(effectId);
        }

        private void CreateEffectUI(ActiveEffect effect)
        {
            if (_container == null) return;

            var elem = new VisualElement();
            elem.name = $"effect-{effect.id}";
            elem.AddToClassList("status-icon");

            // 색상 테두리
            if (EffectColors.TryGetValue(effect.type, out var color))
                elem.style.borderBottomColor = elem.style.borderTopColor =
                    elem.style.borderLeftColor = elem.style.borderRightColor = color;

            // 스택 표시
            if (effect.maxStacks > 1)
            {
                var stackLabel = new Label($"x{effect.stacks}");
                stackLabel.AddToClassList("stack-count");
                elem.Add(stackLabel);
            }

            // 잔여 시간 바
            var timerBar = new VisualElement();
            timerBar.name = "timer-bar";
            timerBar.AddToClassList("timer-bar");
            elem.Add(timerBar);

            _container.Add(elem);
            _effectElements[effect.id] = elem;
        }

        private void UpdateEffectUI(string effectId, ActiveEffect effect)
        {
            if (!_effectElements.TryGetValue(effectId, out var elem)) return;

            var timerBar = elem.Q("timer-bar");
            if (timerBar != null && effect.totalDuration > 0)
            {
                var pct = Mathf.Clamp01(effect.remainingTime / effect.totalDuration);
                timerBar.style.width = new Length(pct * 100, LengthUnit.Percent);
            }
        }

        /// <summary>특정 상태이상 활성 여부</summary>
        public bool HasEffect(string effectType)
        {
            foreach (var e in _activeEffects.Values)
                if (e.type == effectType) return true;
            return false;
        }

        /// <summary>모든 상태이상 제거 (정화 스킬 등)</summary>
        public void ClearAll()
        {
            var ids = new List<string>(_activeEffects.Keys);
            foreach (var id in ids) RemoveEffect(id);
        }
    }

    [Serializable]
    public class ActiveEffect
    {
        public string id;
        public string type;
        public int stacks;
        public int maxStacks;
        public float remainingTime;
        public float totalDuration;
        public string sourceId;
    }
}
