using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using EternaChronicle.Network;

namespace EternaChronicle.Combat
{
    /// <summary>
    /// 스킬 매니저 — 4클래스 스킬 관리 + 자동 전투 스킬 선택
    /// 서버에서 스킬 목록 동기화, 클라이언트는 렌더링/입력만 담당
    /// </summary>
    public class SkillManager : MonoBehaviour
    {
        public static SkillManager Instance { get; private set; }

        public event Action<List<SkillData>> OnSkillsLoaded;
        public event Action<string, int> OnSkillLevelUp;

        public List<SkillData> Skills { get; private set; } = new();
        public List<SkillData> EquippedSkills { get; private set; } = new();

        [Header("Skill Slots")]
        [SerializeField] private int maxEquippedSkills = 8;

        private void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;
        }

        /// <summary>서버에서 스킬 목록 로드</summary>
        public void LoadSkills()
        {
            RestApiClient.Instance.Get<SkillListResponse>("/characters/skills",
                response =>
                {
                    Skills = new List<SkillData>(response.skills);
                    EquippedSkills = Skills.Where(s => s.equipped).Take(maxEquippedSkills).ToList();
                    OnSkillsLoaded?.Invoke(Skills);
                    Debug.Log($"[Skill] Loaded {Skills.Count} skills, {EquippedSkills.Count} equipped");
                },
                error => Debug.LogWarning($"[Skill] Load failed: {error.message}"));
        }

        /// <summary>스킬 장착/해제</summary>
        public void EquipSkill(string skillId, int slotIndex)
        {
            RestApiClient.Instance.Post<SkillEquipResponse>("/characters/skills/equip",
                new { skillId, slotIndex },
                response =>
                {
                    var skill = Skills.Find(s => s.id == skillId);
                    if (skill != null)
                    {
                        skill.equipped = true;
                        skill.slotIndex = slotIndex;
                        RefreshEquippedList();
                    }
                },
                error => Debug.LogWarning($"[Skill] Equip failed: {error.message}"));
        }

        /// <summary>자동 전투용 — 쿨다운 없는 최적 스킬 반환</summary>
        public SkillData GetBestAvailableSkill(Dictionary<string, float> cooldowns)
        {
            return EquippedSkills
                .Where(s => !cooldowns.ContainsKey(s.id) || cooldowns[s.id] <= 0)
                .OrderByDescending(s => s.autoPriority)
                .ThenByDescending(s => s.damage)
                .FirstOrDefault();
        }

        /// <summary>클래스별 스킬 필터</summary>
        public List<SkillData> GetSkillsByClass(string className)
        {
            return Skills.Where(s => s.className == className || s.className == "common").ToList();
        }

        /// <summary>스킬 타입별 필터</summary>
        public List<SkillData> GetSkillsByType(SkillType type)
        {
            return Skills.Where(s => s.type == type).ToList();
        }

        private void RefreshEquippedList()
        {
            EquippedSkills = Skills
                .Where(s => s.equipped)
                .OrderBy(s => s.slotIndex)
                .Take(maxEquippedSkills)
                .ToList();
        }
    }

    [Serializable]
    public class SkillData
    {
        public string id;
        public string name;
        public string description;
        public string className;     // ether_knight, memory_weaver, shadow_weaver, memory_breaker, common
        public SkillType type;
        public int level;
        public int maxLevel;
        public int damage;
        public float cooldown;
        public int mpCost;
        public string element;       // fire, ice, thunder, dark, light, physical
        public float range;
        public bool isAoe;
        public float aoeRadius;
        public string[] statusEffects; // 부여하는 상태이상
        public bool equipped;
        public int slotIndex;
        public int autoPriority;     // 자동 전투 우선순위 (높을수록 우선)
        public string iconPath;
    }

    public enum SkillType
    {
        Active,
        Passive,
        Ultimate,
        Combo
    }

    [Serializable]
    public class SkillListResponse
    {
        public SkillData[] skills;
    }

    [Serializable]
    public class SkillEquipResponse
    {
        public bool success;
        public string message;
    }
}
