using System;
using System.Collections.Generic;
using UnityEngine;
using Newtonsoft.Json.Linq;
using EternaChronicle.Network;

namespace EternaChronicle.Combat
{
    /// <summary>
    /// 전투 시스템 — 반자동 전투 엔진
    /// 서버 권위 모델: 클라이언트는 입력 전송 + 결과 렌더링만 담당
    /// </summary>
    public class CombatSystem : MonoBehaviour
    {
        public static CombatSystem Instance { get; private set; }

        public event Action OnCombatStart;
        public event Action OnCombatEnd;
        public event Action<CombatAction> OnActionExecuted;
        public event Action<DamageInfo> OnDamageDealt;
        public event Action<string> OnTargetDefeated;

        public bool InCombat { get; private set; }
        public string CurrentTargetId { get; private set; }

        [Header("Auto Combat")]
        [SerializeField] private float autoAttackInterval = 1.5f;
        [SerializeField] private bool autoSkillEnabled = true;

        private float _autoAttackTimer;
        private bool _autoCombatActive;
        private readonly Queue<CombatAction> _actionQueue = new();

        // 스킬 쿨다운 추적
        private readonly Dictionary<string, float> _skillCooldowns = new();

        private void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;
        }

        private void OnEnable()
        {
            WebSocketClient.Instance.OnMessage += HandleServerMessage;
        }

        private void OnDisable()
        {
            if (WebSocketClient.Instance != null)
                WebSocketClient.Instance.OnMessage -= HandleServerMessage;
        }

        private void Update()
        {
            if (!InCombat) return;

            // 쿨다운 감소
            UpdateCooldowns(Time.deltaTime);

            // 반자동 전투: 자동 공격
            if (_autoCombatActive)
            {
                _autoAttackTimer -= Time.deltaTime;
                if (_autoAttackTimer <= 0)
                {
                    ExecuteAutoAttack();
                    _autoAttackTimer = autoAttackInterval;
                }
            }

            // 서버 액션 큐 처리
            while (_actionQueue.Count > 0)
            {
                var action = _actionQueue.Dequeue();
                ProcessAction(action);
            }
        }

        /// <summary>전투 시작 (서버 이벤트)</summary>
        public void StartCombat(string targetId)
        {
            InCombat = true;
            CurrentTargetId = targetId;
            _autoCombatActive = true;
            _autoAttackTimer = 0; // 즉시 첫 공격

            WebSocketClient.Instance.Send("combat:start", new { targetId });
            OnCombatStart?.Invoke();
            Debug.Log($"[Combat] Started vs {targetId}");
        }

        /// <summary>전투 종료</summary>
        public void EndCombat()
        {
            InCombat = false;
            _autoCombatActive = false;
            CurrentTargetId = null;
            OnCombatEnd?.Invoke();
        }

        /// <summary>수동 스킬 사용</summary>
        public void UseSkill(string skillId, string targetId = null)
        {
            if (!InCombat) return;

            if (_skillCooldowns.TryGetValue(skillId, out var cd) && cd > 0)
            {
                Debug.Log($"[Combat] Skill {skillId} on cooldown: {cd:F1}s");
                return;
            }

            WebSocketClient.Instance.Send("combat:skill", new
            {
                skillId,
                targetId = targetId ?? CurrentTargetId
            });
        }

        /// <summary>자동 전투 토글</summary>
        public void ToggleAutoCombat()
        {
            _autoCombatActive = !_autoCombatActive;
            Debug.Log($"[Combat] Auto combat: {(_autoCombatActive ? "ON" : "OFF")}");
        }

        /// <summary>타겟 변경</summary>
        public void SetTarget(string targetId)
        {
            CurrentTargetId = targetId;
            WebSocketClient.Instance.Send("combat:target", new { targetId });
        }

        private void ExecuteAutoAttack()
        {
            if (string.IsNullOrEmpty(CurrentTargetId)) return;

            if (autoSkillEnabled)
            {
                // AI 자동 스킬 선택: 쿨다운 없는 최고 우선순위 스킬
                var bestSkill = SkillManager.Instance?.GetBestAvailableSkill(_skillCooldowns);
                if (bestSkill != null)
                {
                    UseSkill(bestSkill.id);
                    return;
                }
            }

            // 기본 공격
            WebSocketClient.Instance.Send("combat:attack", new { targetId = CurrentTargetId });
        }

        private void HandleServerMessage(string type, JObject data)
        {
            switch (type)
            {
                case "combat:action":
                    var action = data.ToObject<CombatAction>();
                    _actionQueue.Enqueue(action);
                    break;

                case "combat:damage":
                    var dmg = data.ToObject<DamageInfo>();
                    OnDamageDealt?.Invoke(dmg);
                    break;

                case "combat:defeat":
                    var defeatedId = data["targetId"]?.ToString();
                    OnTargetDefeated?.Invoke(defeatedId);
                    if (defeatedId == CurrentTargetId) EndCombat();
                    break;

                case "combat:end":
                    EndCombat();
                    break;

                case "combat:cooldown":
                    var skillId = data["skillId"]?.ToString();
                    var cooldown = data["cooldown"]?.Value<float>() ?? 0;
                    if (skillId != null) _skillCooldowns[skillId] = cooldown;
                    break;

                case "combat:status_effect":
                    StatusEffectDisplay.Instance?.HandleStatusEffect(data);
                    break;

                case "combat:combo":
                    ComboTracker.Instance?.HandleCombo(data);
                    break;
            }
        }

        private void ProcessAction(CombatAction action)
        {
            OnActionExecuted?.Invoke(action);
            // 애니메이션/이펙트 트리거는 별도 컴포넌트에서 처리
        }

        private void UpdateCooldowns(float dt)
        {
            var keys = new List<string>(_skillCooldowns.Keys);
            foreach (var key in keys)
            {
                _skillCooldowns[key] -= dt;
                if (_skillCooldowns[key] <= 0)
                    _skillCooldowns.Remove(key);
            }
        }

        /// <summary>스킬 잔여 쿨다운 조회</summary>
        public float GetCooldown(string skillId)
        {
            return _skillCooldowns.TryGetValue(skillId, out var cd) ? Mathf.Max(0, cd) : 0;
        }
    }

    [Serializable]
    public class CombatAction
    {
        public string actorId;
        public string targetId;
        public string actionType;  // attack, skill, item
        public string skillId;
        public int damage;
        public bool isCritical;
        public string element;     // fire, ice, thunder, dark, light
    }

    [Serializable]
    public class DamageInfo
    {
        public string targetId;
        public int amount;
        public bool isCritical;
        public string damageType;
        public int remainingHp;
        public int maxHp;
    }
}
