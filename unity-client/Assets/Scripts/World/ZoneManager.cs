using System;
using System.Collections.Generic;
using UnityEngine;
using Newtonsoft.Json;
using EternaChronicle.Network;

namespace EternaChronicle.World
{
    /// <summary>
    /// 존 매니저 — 6지역 + 안개해 관리, 존 전환, NPC/포탈 스폰
    /// </summary>
    public class ZoneManager : MonoBehaviour
    {
        public static ZoneManager Instance { get; private set; }

        public event Action<ZoneInfo> OnZoneChanged;
        public event Action<ZoneInfo> OnZoneLoaded;

        public ZoneInfo CurrentZone { get; private set; }
        public Dictionary<string, ZoneInfo> ZoneCache { get; private set; } = new();

        [Header("Zone Definitions (로컬 캐시용)")]
        [SerializeField] private ZoneDefinition[] zoneDefinitions;

        private void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }

        private void Start()
        {
            // 서버에서 존 목록 로드
            LoadZoneList();
        }

        /// <summary>존 목록 서버 로드</summary>
        public void LoadZoneList()
        {
            RestApiClient.Instance.Get<ZoneListResponse>("/world/zones",
                response =>
                {
                    ZoneCache.Clear();
                    foreach (var zone in response.zones)
                        ZoneCache[zone.id] = zone;
                    Debug.Log($"[Zone] Loaded {response.zones.Length} zones");
                },
                error => Debug.LogWarning($"[Zone] Zone list load failed: {error.message}"));
        }

        /// <summary>존 진입 — 텔레포트/포탈/초기 스폰</summary>
        public void EnterZone(string zoneId, Vector2? spawnPos = null)
        {
            if (!ZoneCache.TryGetValue(zoneId, out var zoneInfo))
            {
                Debug.LogError($"[Zone] Unknown zone: {zoneId}");
                return;
            }

            CurrentZone = zoneInfo;
            OnZoneChanged?.Invoke(zoneInfo);

            // Tilemap 로드
            TilemapLoader.Instance?.LoadZone(zoneId);

            // 서버에 존 진입 알림
            WebSocketClient.Instance?.Send("zone:enter", new
            {
                zoneId,
                x = spawnPos?.x ?? zoneInfo.defaultSpawnX,
                y = spawnPos?.y ?? zoneInfo.defaultSpawnY
            });

            // 존 상세 데이터 로드 (NPC, 포탈, 스폰포인트)
            RestApiClient.Instance.Get<ZoneDetailResponse>($"/world/zones/{zoneId}",
                detail =>
                {
                    SpawnZoneEntities(detail);
                    OnZoneLoaded?.Invoke(zoneInfo);
                    Debug.Log($"[Zone] Entered: {zoneInfo.name} ({zoneInfo.id})");
                },
                error => Debug.LogWarning($"[Zone] Detail load failed: {error.message}"));
        }

        /// <summary>포탈 사용 — 다른 존으로 이동</summary>
        public void UsePortal(string targetZoneId, float targetX, float targetY)
        {
            // 페이드 아웃 → 존 전환 → 페이드 인
            EnterZone(targetZoneId, new Vector2(targetX, targetY));
        }

        private void SpawnZoneEntities(ZoneDetailResponse detail)
        {
            // NPC, 포탈, 몬스터 스폰포인트는 서버 데이터 기반으로 생성
            // 실제 GameObject 인스턴스화는 프리팹 매니저에서 처리
            if (detail.npcs != null)
                Debug.Log($"[Zone] NPCs: {detail.npcs.Length}");
            if (detail.portals != null)
                Debug.Log($"[Zone] Portals: {detail.portals.Length}");
            if (detail.spawnPoints != null)
                Debug.Log($"[Zone] Monster spawns: {detail.spawnPoints.Length}");
        }
    }

    [Serializable]
    public class ZoneInfo
    {
        public string id;
        public string name;
        public string region;        // 대륙/지역
        public int recommendedLevel;
        public float defaultSpawnX;
        public float defaultSpawnY;
        public string bgmId;
        public string ambientId;
    }

    [Serializable]
    public class ZoneListResponse
    {
        public ZoneInfo[] zones;
    }

    [Serializable]
    public class ZoneDetailResponse
    {
        public NpcSpawn[] npcs;
        public PortalData[] portals;
        public SpawnPointData[] spawnPoints;
    }

    [Serializable]
    public class NpcSpawn
    {
        public string npcId;
        public string name;
        public float x, y;
        public string role; // shop, quest, dialog
    }

    [Serializable]
    public class PortalData
    {
        public string targetZoneId;
        public float x, y;
        public float targetX, targetY;
        public int requiredLevel;
    }

    [Serializable]
    public class SpawnPointData
    {
        public string monsterId;
        public float x, y;
        public float radius;
        public int maxCount;
        public float respawnSec;
    }

    [Serializable]
    public struct ZoneDefinition
    {
        public string id;
        public string displayName;
        public Sprite mapIcon;
    }
}
