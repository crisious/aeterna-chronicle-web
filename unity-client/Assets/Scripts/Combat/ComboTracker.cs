using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UIElements;
using Newtonsoft.Json.Linq;

namespace EternaChronicle.Combat
{
    /// <summary>
    /// 콤보 추적기 — 연속 공격 콤보 카운트 + 콤보 스킬 트리거
    /// 서버에서 콤보 상태를 관리하며, 클라이언트는 표시 + 입력 처리
    /// </summary>
    public class ComboTracker : MonoBehaviour
    {
        public static ComboTracker Instance { get; private set; }

        [Header("Combo")]
        [SerializeField] private float comboResetTime = 3f;
        [SerializeField] private UIDocument comboUI;

        public event Action<int> OnComboChanged;
        public event Action<ComboSkillTrigger> OnComboSkillAvailable;

        public int CurrentCombo { get; private set; }
        public int MaxCombo { get; private set; }
        public float ComboTimer { get; private set; }

        private Label _comboCountLabel;
        private Label _comboMultiplierLabel;
        private VisualElement _comboBar;
        private VisualElement _comboContainer;

        // 콤보 스킬 정의: 특정 콤보 수 도달 시 발동 가능한 특수 스킬
        private readonly List<ComboSkillTrigger> _comboTriggers = new()
        {
            new ComboSkillTrigger { requiredCombo = 5,  skillId = "combo_strike",    name = "콤보 타격" },
            new ComboSkillTrigger { requiredCombo = 10, skillId = "combo_burst",     name = "콤보 폭발" },
            new ComboSkillTrigger { requiredCombo = 15, skillId = "combo_finisher",  name = "콤보 피니셔" },
            new ComboSkillTrigger { requiredCombo = 20, skillId = "combo_ultimate",  name = "궁극 콤보" },
        };

        private void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;
        }

        private void OnEnable()
        {
            if (comboUI == null) return;
            var root = comboUI.rootVisualElement;
            _comboContainer = root.Q("combo-container");
            _comboCountLabel = root.Q<Label>("combo-count");
            _comboMultiplierLabel = root.Q<Label>("combo-multiplier");
            _comboBar = root.Q("combo-timer-bar");

            HideCombo();
        }

        private void Update()
        {
            if (CurrentCombo <= 0) return;

            ComboTimer -= Time.deltaTime;
            UpdateComboUI();

            if (ComboTimer <= 0)
                ResetCombo();
        }

        /// <summary>서버 콤보 이벤트 핸들러</summary>
        public void HandleCombo(JObject data)
        {
            var action = data["action"]?.ToString();

            switch (action)
            {
                case "hit":
                    var newCombo = data["combo"]?.Value<int>() ?? CurrentCombo + 1;
                    SetCombo(newCombo);
                    break;

                case "break":
                    ResetCombo();
                    break;

                case "skill_available":
                    var skillId = data["skillId"]?.ToString();
                    var trigger = _comboTriggers.Find(t => t.skillId == skillId);
                    if (trigger != null)
                        OnComboSkillAvailable?.Invoke(trigger);
                    break;
            }
        }

        /// <summary>콤보 설정</summary>
        public void SetCombo(int count)
        {
            CurrentCombo = count;
            if (count > MaxCombo) MaxCombo = count;
            ComboTimer = comboResetTime;

            OnComboChanged?.Invoke(CurrentCombo);
            ShowCombo();

            // 콤보 스킬 트리거 체크
            foreach (var trigger in _comboTriggers)
            {
                if (CurrentCombo == trigger.requiredCombo)
                {
                    OnComboSkillAvailable?.Invoke(trigger);
                    Debug.Log($"[Combo] Skill available: {trigger.name} at {trigger.requiredCombo} combo!");
                }
            }
        }

        /// <summary>콤보 리셋</summary>
        public void ResetCombo()
        {
            CurrentCombo = 0;
            ComboTimer = 0;
            HideCombo();
            OnComboChanged?.Invoke(0);
        }

        /// <summary>현재 콤보 배율 (데미지 보너스)</summary>
        public float GetComboMultiplier()
        {
            if (CurrentCombo < 3) return 1f;
            if (CurrentCombo < 5) return 1.1f;
            if (CurrentCombo < 10) return 1.25f;
            if (CurrentCombo < 15) return 1.5f;
            if (CurrentCombo < 20) return 1.75f;
            return 2.0f;
        }

        private void ShowCombo()
        {
            if (_comboContainer != null)
                _comboContainer.style.display = DisplayStyle.Flex;
        }

        private void HideCombo()
        {
            if (_comboContainer != null)
                _comboContainer.style.display = DisplayStyle.None;
        }

        private void UpdateComboUI()
        {
            if (_comboCountLabel != null)
                _comboCountLabel.text = $"{CurrentCombo}";

            if (_comboMultiplierLabel != null)
                _comboMultiplierLabel.text = $"x{GetComboMultiplier():F2}";

            if (_comboBar != null && comboResetTime > 0)
            {
                var pct = Mathf.Clamp01(ComboTimer / comboResetTime);
                _comboBar.style.width = new Length(pct * 100, LengthUnit.Percent);

                // 색상 변화: 녹 → 노 → 빨
                var color = Color.Lerp(Color.red, Color.green, pct);
                _comboBar.style.backgroundColor = color;
            }
        }
    }

    [Serializable]
    public class ComboSkillTrigger
    {
        public int requiredCombo;
        public string skillId;
        public string name;
    }
}
