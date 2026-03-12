using UnityEngine;
using UnityEngine.UIElements;

namespace EternaChronicle.World
{
    /// <summary>
    /// 미니맵 컨트롤러 — 플레이어 위치, 파티원, NPC, 포탈 표시
    /// UI Toolkit VisualElement 기반 오버레이
    /// </summary>
    public class MinimapController : MonoBehaviour
    {
        public static MinimapController Instance { get; private set; }

        [Header("Minimap")]
        [SerializeField] private UIDocument minimapUI;
        [SerializeField] private Camera minimapCamera;
        [SerializeField] private float zoomLevel = 1f;
        [SerializeField] private float maxZoom = 3f;
        [SerializeField] private float minZoom = 0.5f;

        [Header("Icons")]
        [SerializeField] private Sprite playerIcon;
        [SerializeField] private Sprite partyMemberIcon;
        [SerializeField] private Sprite npcIcon;
        [SerializeField] private Sprite portalIcon;
        [SerializeField] private Sprite monsterIcon;

        private VisualElement _minimapContainer;
        private VisualElement _playerMarker;
        private Label _zoneNameLabel;
        private Label _coordsLabel;
        private Transform _playerTransform;
        private bool _isExpanded;

        private void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;
        }

        private void OnEnable()
        {
            if (minimapUI == null) return;
            var root = minimapUI.rootVisualElement;

            _minimapContainer = root.Q("minimap-container");
            _playerMarker = root.Q("player-marker");
            _zoneNameLabel = root.Q<Label>("zone-name");
            _coordsLabel = root.Q<Label>("coords");

            var toggleBtn = root.Q<Button>("toggle-size");
            toggleBtn?.RegisterCallback<ClickEvent>(_ => ToggleExpand());

            var zoomInBtn = root.Q<Button>("zoom-in");
            var zoomOutBtn = root.Q<Button>("zoom-out");
            zoomInBtn?.RegisterCallback<ClickEvent>(_ => SetZoom(zoomLevel + 0.25f));
            zoomOutBtn?.RegisterCallback<ClickEvent>(_ => SetZoom(zoomLevel - 0.25f));

            // 존 변경 이벤트
            ZoneManager.Instance.OnZoneChanged += OnZoneChanged;
        }

        private void OnDisable()
        {
            if (ZoneManager.Instance != null)
                ZoneManager.Instance.OnZoneChanged -= OnZoneChanged;
        }

        public void SetPlayerTransform(Transform player)
        {
            _playerTransform = player;
        }

        private void LateUpdate()
        {
            if (_playerTransform == null || minimapCamera == null) return;

            // 미니맵 카메라 추적
            var pos = _playerTransform.position;
            minimapCamera.transform.position = new Vector3(pos.x, pos.y, minimapCamera.transform.position.z);
            minimapCamera.orthographicSize = 10f / zoomLevel;

            // 좌표 표시
            if (_coordsLabel != null)
                _coordsLabel.text = $"({pos.x:F0}, {pos.y:F0})";

            // 청크 업데이트
            TilemapLoader.Instance?.UpdatePlayerPosition(pos);
        }

        private void OnZoneChanged(ZoneInfo zone)
        {
            if (_zoneNameLabel != null)
                _zoneNameLabel.text = zone.name;
        }

        private void SetZoom(float newZoom)
        {
            zoomLevel = Mathf.Clamp(newZoom, minZoom, maxZoom);
        }

        private void ToggleExpand()
        {
            _isExpanded = !_isExpanded;
            if (_minimapContainer != null)
            {
                _minimapContainer.RemoveFromClassList(_isExpanded ? "minimap-small" : "minimap-large");
                _minimapContainer.AddToClassList(_isExpanded ? "minimap-large" : "minimap-small");
            }
        }

        /// <summary>마커 추가 (파티원, NPC 등)</summary>
        public void AddMarker(string id, MarkerType type, Vector2 worldPos)
        {
            // 미니맵에 동적 마커 추가 로직
            // VisualElement 생성 → 아이콘 할당 → 위치 업데이트
        }

        public void RemoveMarker(string id)
        {
            // 마커 제거
        }

        public enum MarkerType { Player, PartyMember, Npc, Portal, Monster, Quest }
    }
}
