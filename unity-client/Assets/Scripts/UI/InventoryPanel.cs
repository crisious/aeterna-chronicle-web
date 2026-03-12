using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UIElements;
using EternaChronicle.Network;

namespace EternaChronicle.UI
{
    /// <summary>
    /// 인벤토리 패널 — 아이템 목록, 장비 장착, 아이템 사용/분해/거래
    /// </summary>
    public class InventoryPanel : MonoBehaviour
    {
        [SerializeField] private UIDocument inventoryDocument;

        private VisualElement _root;
        private VisualElement _itemGrid;
        private VisualElement _equipmentSlots;
        private Label _itemDetailName;
        private Label _itemDetailDesc;
        private Label _itemDetailStats;
        private Button _useButton;
        private Button _equipButton;
        private Button _dropButton;
        private Label _weightLabel;
        private Label _capacityLabel;

        private List<InventoryItem> _items = new();
        private InventoryItem _selectedItem;

        // 탭 필터
        private string _currentTab = "all";

        public event Action<InventoryItem> OnItemUsed;
        public event Action<InventoryItem> OnItemEquipped;

        private void OnEnable()
        {
            _root = inventoryDocument.rootVisualElement;
            BindUI();
            LoadInventory();
        }

        private void BindUI()
        {
            _itemGrid = _root.Q("item-grid");
            _equipmentSlots = _root.Q("equipment-slots");
            _itemDetailName = _root.Q<Label>("item-name");
            _itemDetailDesc = _root.Q<Label>("item-description");
            _itemDetailStats = _root.Q<Label>("item-stats");
            _useButton = _root.Q<Button>("use-button");
            _equipButton = _root.Q<Button>("equip-button");
            _dropButton = _root.Q<Button>("drop-button");
            _weightLabel = _root.Q<Label>("weight");
            _capacityLabel = _root.Q<Label>("capacity");

            _useButton?.RegisterCallback<ClickEvent>(_ => UseSelectedItem());
            _equipButton?.RegisterCallback<ClickEvent>(_ => EquipSelectedItem());
            _dropButton?.RegisterCallback<ClickEvent>(_ => DropSelectedItem());

            // 탭 버튼
            var tabs = new[] { "all", "equipment", "consumable", "material", "quest" };
            foreach (var tab in tabs)
            {
                var btn = _root.Q<Button>($"tab-{tab}");
                var t = tab;
                btn?.RegisterCallback<ClickEvent>(_ => FilterByTab(t));
            }

            // 정렬
            var sortBtn = _root.Q<Button>("sort-button");
            sortBtn?.RegisterCallback<ClickEvent>(_ => SortItems());

            HideDetail();
        }

        public void LoadInventory()
        {
            RestApiClient.Instance.Get<InventoryResponse>("/inventory",
                response =>
                {
                    _items = new List<InventoryItem>(response.items);
                    RefreshGrid();
                    UpdateCapacity(response.currentWeight, response.maxWeight,
                        response.usedSlots, response.maxSlots);
                },
                error => Debug.LogWarning($"[Inventory] Load failed: {error.message}"));
        }

        private void RefreshGrid()
        {
            _itemGrid?.Clear();

            var filtered = _currentTab == "all"
                ? _items
                : _items.FindAll(i => i.category == _currentTab);

            foreach (var item in filtered)
            {
                var slot = CreateItemSlot(item);
                _itemGrid?.Add(slot);
            }
        }

        private VisualElement CreateItemSlot(InventoryItem item)
        {
            var slot = new VisualElement();
            slot.AddToClassList("item-slot");
            slot.AddToClassList($"rarity-{item.rarity}");

            var icon = new VisualElement();
            icon.AddToClassList("item-icon");
            slot.Add(icon);

            if (item.quantity > 1)
            {
                var qtyLabel = new Label($"x{item.quantity}");
                qtyLabel.AddToClassList("item-quantity");
                slot.Add(qtyLabel);
            }

            slot.RegisterCallback<ClickEvent>(_ => SelectItem(item));

            return slot;
        }

        private void SelectItem(InventoryItem item)
        {
            _selectedItem = item;
            ShowDetail(item);
        }

        private void ShowDetail(InventoryItem item)
        {
            if (_itemDetailName != null) _itemDetailName.text = item.name;
            if (_itemDetailDesc != null) _itemDetailDesc.text = item.description;
            if (_itemDetailStats != null) _itemDetailStats.text = FormatStats(item);

            if (_useButton != null)
                _useButton.style.display = item.category == "consumable" ? DisplayStyle.Flex : DisplayStyle.None;
            if (_equipButton != null)
                _equipButton.style.display = item.category == "equipment" ? DisplayStyle.Flex : DisplayStyle.None;
            if (_dropButton != null)
                _dropButton.style.display = item.category != "quest" ? DisplayStyle.Flex : DisplayStyle.None;
        }

        private void HideDetail()
        {
            if (_itemDetailName != null) _itemDetailName.text = "";
            if (_itemDetailDesc != null) _itemDetailDesc.text = "아이템을 선택하세요";
            if (_useButton != null) _useButton.style.display = DisplayStyle.None;
            if (_equipButton != null) _equipButton.style.display = DisplayStyle.None;
            if (_dropButton != null) _dropButton.style.display = DisplayStyle.None;
        }

        private void UseSelectedItem()
        {
            if (_selectedItem == null) return;
            RestApiClient.Instance.Post<UseItemResponse>("/inventory/use",
                new { itemId = _selectedItem.id },
                _ => { OnItemUsed?.Invoke(_selectedItem); LoadInventory(); },
                error => Debug.LogWarning($"[Inventory] Use failed: {error.message}"));
        }

        private void EquipSelectedItem()
        {
            if (_selectedItem == null) return;
            RestApiClient.Instance.Post<EquipResponse>("/inventory/equip",
                new { itemId = _selectedItem.id },
                _ => { OnItemEquipped?.Invoke(_selectedItem); LoadInventory(); },
                error => Debug.LogWarning($"[Inventory] Equip failed: {error.message}"));
        }

        private void DropSelectedItem()
        {
            if (_selectedItem == null) return;
            RestApiClient.Instance.Post<DropResponse>("/inventory/drop",
                new { itemId = _selectedItem.id, quantity = 1 },
                _ => LoadInventory(),
                error => Debug.LogWarning($"[Inventory] Drop failed: {error.message}"));
        }

        private void FilterByTab(string tab)
        {
            _currentTab = tab;
            RefreshGrid();
        }

        private void SortItems()
        {
            _items.Sort((a, b) =>
            {
                var catCmp = string.Compare(a.category, b.category, StringComparison.Ordinal);
                if (catCmp != 0) return catCmp;
                var rarCmp = b.rarityLevel.CompareTo(a.rarityLevel);
                return rarCmp != 0 ? rarCmp : string.Compare(a.name, b.name, StringComparison.Ordinal);
            });
            RefreshGrid();
        }

        private void UpdateCapacity(float weight, float maxWeight, int slots, int maxSlots)
        {
            if (_weightLabel != null) _weightLabel.text = $"{weight:F1}/{maxWeight:F1}";
            if (_capacityLabel != null) _capacityLabel.text = $"{slots}/{maxSlots}";
        }

        private string FormatStats(InventoryItem item)
        {
            if (item.stats == null) return "";
            var parts = new List<string>();
            if (item.stats.atk > 0) parts.Add($"ATK +{item.stats.atk}");
            if (item.stats.def > 0) parts.Add($"DEF +{item.stats.def}");
            if (item.stats.hp > 0) parts.Add($"HP +{item.stats.hp}");
            if (item.stats.mp > 0) parts.Add($"MP +{item.stats.mp}");
            if (item.stats.spd > 0) parts.Add($"SPD +{item.stats.spd}");
            return string.Join("\n", parts);
        }
    }

    [Serializable] public class InventoryItem
    {
        public string id;
        public string name;
        public string description;
        public string category;
        public string rarity;
        public int rarityLevel;
        public int quantity;
        public bool equipped;
        public string iconPath;
        public ItemStats stats;
    }

    [Serializable] public class ItemStats { public int atk, def, hp, mp, spd; }
    [Serializable] public class InventoryResponse { public InventoryItem[] items; public float currentWeight, maxWeight; public int usedSlots, maxSlots; }
    [Serializable] public class UseItemResponse { public bool success; }
    [Serializable] public class EquipResponse { public bool success; }
    [Serializable] public class DropResponse { public bool success; }
}
