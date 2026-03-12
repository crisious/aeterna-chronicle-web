using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UIElements;
using EternaChronicle.Network;

namespace EternaChronicle.UI
{
    /// <summary>
    /// 상점 패널 — NPC 상점 + 크리스탈 상점 + 시즌패스 상점
    /// </summary>
    public class ShopPanel : MonoBehaviour
    {
        [SerializeField] private UIDocument shopDocument;

        private VisualElement _root;
        private VisualElement _itemList;
        private Label _shopTitle;
        private Label _goldDisplay;
        private Label _crystalDisplay;

        // Detail
        private Label _detailName;
        private Label _detailDesc;
        private Label _detailPrice;
        private Button _buyButton;
        private Button _buyBulkButton;

        private List<ShopItem> _shopItems = new();
        private ShopItem _selectedItem;
        private ShopType _currentShop = ShopType.Npc;

        public enum ShopType { Npc, Crystal, SeasonPass }

        public void OpenShop(ShopType type, string shopId = null)
        {
            _currentShop = type;
            gameObject.SetActive(true);

            var endpoint = type switch
            {
                ShopType.Npc => $"/shop/npc/{shopId}",
                ShopType.Crystal => "/shop/crystal",
                ShopType.SeasonPass => "/shop/seasonpass",
                _ => "/shop/npc"
            };

            RestApiClient.Instance.Get<ShopResponse>(endpoint,
                response =>
                {
                    _shopItems = new List<ShopItem>(response.items);
                    if (_shopTitle != null) _shopTitle.text = response.shopName;
                    RefreshList();
                },
                error => Debug.LogWarning($"[Shop] Load failed: {error.message}"));
        }

        private void OnEnable()
        {
            _root = shopDocument.rootVisualElement;
            _itemList = _root.Q("shop-items");
            _shopTitle = _root.Q<Label>("shop-title");
            _goldDisplay = _root.Q<Label>("shop-gold");
            _crystalDisplay = _root.Q<Label>("shop-crystal");
            _detailName = _root.Q<Label>("shop-detail-name");
            _detailDesc = _root.Q<Label>("shop-detail-desc");
            _detailPrice = _root.Q<Label>("shop-detail-price");
            _buyButton = _root.Q<Button>("buy-button");
            _buyBulkButton = _root.Q<Button>("buy-bulk-button");

            _buyButton?.RegisterCallback<ClickEvent>(_ => BuyItem(1));
            _buyBulkButton?.RegisterCallback<ClickEvent>(_ => BuyItem(10));

            var closeBtn = _root.Q<Button>("shop-close");
            closeBtn?.RegisterCallback<ClickEvent>(_ => gameObject.SetActive(false));
        }

        private void RefreshList()
        {
            _itemList?.Clear();
            foreach (var item in _shopItems)
            {
                var row = new VisualElement();
                row.AddToClassList("shop-row");
                row.AddToClassList($"rarity-{item.rarity}");

                var nameLabel = new Label(item.name);
                nameLabel.AddToClassList("shop-item-name");
                row.Add(nameLabel);

                var priceLabel = new Label(FormatPrice(item));
                priceLabel.AddToClassList("shop-item-price");
                row.Add(priceLabel);

                if (item.stock >= 0)
                {
                    var stockLabel = new Label($"재고: {item.stock}");
                    stockLabel.AddToClassList("shop-item-stock");
                    row.Add(stockLabel);
                }

                row.RegisterCallback<ClickEvent>(_ => SelectShopItem(item));
                _itemList?.Add(row);
            }
        }

        private void SelectShopItem(ShopItem item)
        {
            _selectedItem = item;
            if (_detailName != null) _detailName.text = item.name;
            if (_detailDesc != null) _detailDesc.text = item.description;
            if (_detailPrice != null) _detailPrice.text = FormatPrice(item);

            if (_buyButton != null) _buyButton.SetEnabled(item.stock != 0);
        }

        private void BuyItem(int quantity)
        {
            if (_selectedItem == null) return;

            RestApiClient.Instance.Post<BuyResponse>("/shop/buy",
                new { itemId = _selectedItem.id, quantity, shopType = _currentShop.ToString().ToLower() },
                response =>
                {
                    Debug.Log($"[Shop] Bought {_selectedItem.name} x{quantity}");
                    HUDController.Instance?.ShowNotification($"구매 완료: {_selectedItem.name} x{quantity}");
                    OpenShop(_currentShop); // 새로고침
                },
                error => Debug.LogWarning($"[Shop] Buy failed: {error.message}"));
        }

        private string FormatPrice(ShopItem item)
        {
            if (item.crystalPrice > 0) return $"💎 {item.crystalPrice}";
            return $"🪙 {item.goldPrice:N0}";
        }
    }

    [Serializable] public class ShopItem
    {
        public string id, name, description, rarity;
        public int goldPrice, crystalPrice;
        public int stock; // -1 = 무한
    }
    [Serializable] public class ShopResponse { public string shopName; public ShopItem[] items; }
    [Serializable] public class BuyResponse { public bool success; public string message; }
}
