using UnityEngine;
using UnityEngine.UIElements;
using EternaChronicle.Network;
using EternaChronicle.Combat;
using EternaChronicle.World;
using Newtonsoft.Json.Linq;

namespace EternaChronicle.UI
{
    /// <summary>
    /// HUD 컨트롤러 — HP/MP 바, 경험치, 퀵슬롯, 타겟 정보
    /// </summary>
    public class HUDController : MonoBehaviour
    {
        public static HUDController Instance { get; private set; }

        [SerializeField] private UIDocument hudDocument;

        // Player
        private ProgressBar _hpBar;
        private ProgressBar _mpBar;
        private ProgressBar _expBar;
        private Label _levelLabel;
        private Label _nameLabel;
        private Label _goldLabel;
        private Label _crystalLabel;

        // Target
        private VisualElement _targetFrame;
        private Label _targetName;
        private ProgressBar _targetHpBar;
        private Label _targetLevel;

        // Quick Slots
        private VisualElement _skillBar;
        private readonly Button[] _skillSlots = new Button[8];

        // Notifications
        private VisualElement _notificationArea;

        private void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;
        }

        private void OnEnable()
        {
            var root = hudDocument.rootVisualElement;

            // Player frame
            _hpBar = root.Q<ProgressBar>("hp-bar");
            _mpBar = root.Q<ProgressBar>("mp-bar");
            _expBar = root.Q<ProgressBar>("exp-bar");
            _levelLabel = root.Q<Label>("level");
            _nameLabel = root.Q<Label>("player-name");
            _goldLabel = root.Q<Label>("gold-amount");
            _crystalLabel = root.Q<Label>("crystal-amount");

            // Target frame
            _targetFrame = root.Q("target-frame");
            _targetName = root.Q<Label>("target-name");
            _targetHpBar = root.Q<ProgressBar>("target-hp");
            _targetLevel = root.Q<Label>("target-level");
            HideTarget();

            // Skill bar
            _skillBar = root.Q("skill-bar");
            for (int i = 0; i < 8; i++)
            {
                _skillSlots[i] = root.Q<Button>($"skill-slot-{i}");
                int slotIdx = i;
                _skillSlots[i]?.RegisterCallback<ClickEvent>(_ => OnSkillSlotClicked(slotIdx));
            }

            _notificationArea = root.Q("notifications");

            // 이벤트 구독
            CombatSystem.Instance.OnDamageDealt += OnDamageDealt;
            WebSocketClient.Instance.OnMessage += HandleServerUpdate;
        }

        private void OnDisable()
        {
            if (CombatSystem.Instance != null)
                CombatSystem.Instance.OnDamageDealt -= OnDamageDealt;
            if (WebSocketClient.Instance != null)
                WebSocketClient.Instance.OnMessage -= HandleServerUpdate;
        }

        /// <summary>플레이어 스탯 갱신</summary>
        public void UpdatePlayerStats(int hp, int maxHp, int mp, int maxMp, int exp, int maxExp, int level)
        {
            if (_hpBar != null) { _hpBar.value = hp; _hpBar.highValue = maxHp; _hpBar.title = $"{hp}/{maxHp}"; }
            if (_mpBar != null) { _mpBar.value = mp; _mpBar.highValue = maxMp; _mpBar.title = $"{mp}/{maxMp}"; }
            if (_expBar != null) { _expBar.value = exp; _expBar.highValue = maxExp; }
            if (_levelLabel != null) _levelLabel.text = $"Lv.{level}";
        }

        /// <summary>재화 갱신</summary>
        public void UpdateCurrency(long gold, int crystals)
        {
            if (_goldLabel != null) _goldLabel.text = FormatNumber(gold);
            if (_crystalLabel != null) _crystalLabel.text = crystals.ToString("N0");
        }

        /// <summary>타겟 표시</summary>
        public void ShowTarget(string name, int level, int hp, int maxHp)
        {
            if (_targetFrame != null) _targetFrame.style.display = DisplayStyle.Flex;
            if (_targetName != null) _targetName.text = name;
            if (_targetLevel != null) _targetLevel.text = $"Lv.{level}";
            if (_targetHpBar != null) { _targetHpBar.value = hp; _targetHpBar.highValue = maxHp; }
        }

        public void HideTarget()
        {
            if (_targetFrame != null) _targetFrame.style.display = DisplayStyle.None;
        }

        /// <summary>알림 표시 (레벨업, 아이템 획득 등)</summary>
        public void ShowNotification(string text, float duration = 3f)
        {
            if (_notificationArea == null) return;

            var label = new Label(text);
            label.AddToClassList("notification-item");
            _notificationArea.Add(label);

            // 자동 제거
            label.schedule.Execute(() => label.RemoveFromHierarchy())
                .StartingIn((long)(duration * 1000));
        }

        private void OnSkillSlotClicked(int index)
        {
            var equipped = SkillManager.Instance?.EquippedSkills;
            if (equipped == null || index >= equipped.Count) return;

            CombatSystem.Instance?.UseSkill(equipped[index].id);
        }

        private void OnDamageDealt(DamageInfo info)
        {
            // 타겟 HP 갱신
            if (info.targetId == CombatSystem.Instance?.CurrentTargetId)
            {
                if (_targetHpBar != null)
                {
                    _targetHpBar.value = info.remainingHp;
                    _targetHpBar.highValue = info.maxHp;
                }
            }
        }

        private void HandleServerUpdate(string type, JObject data)
        {
            switch (type)
            {
                case "player:stats":
                    UpdatePlayerStats(
                        data["hp"]?.Value<int>() ?? 0, data["maxHp"]?.Value<int>() ?? 1,
                        data["mp"]?.Value<int>() ?? 0, data["maxMp"]?.Value<int>() ?? 1,
                        data["exp"]?.Value<int>() ?? 0, data["maxExp"]?.Value<int>() ?? 1,
                        data["level"]?.Value<int>() ?? 1);
                    break;

                case "player:currency":
                    UpdateCurrency(
                        data["gold"]?.Value<long>() ?? 0,
                        data["crystals"]?.Value<int>() ?? 0);
                    break;

                case "player:levelup":
                    var newLevel = data["level"]?.Value<int>() ?? 1;
                    ShowNotification($"🎉 레벨 업! Lv.{newLevel}");
                    break;

                case "item:obtained":
                    var itemName = data["itemName"]?.ToString();
                    var qty = data["quantity"]?.Value<int>() ?? 1;
                    ShowNotification($"📦 {itemName} x{qty} 획득!");
                    break;
            }
        }

        private string FormatNumber(long n)
        {
            if (n >= 1_000_000) return $"{n / 1_000_000f:F1}M";
            if (n >= 1_000) return $"{n / 1_000f:F1}K";
            return n.ToString("N0");
        }
    }
}
