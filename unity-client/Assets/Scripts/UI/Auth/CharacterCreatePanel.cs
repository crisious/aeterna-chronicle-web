using System;
using UnityEngine;
using UnityEngine.UIElements;
using EternaChronicle.Network;

namespace EternaChronicle.UI.Auth
{
    /// <summary>
    /// 캐릭터 생성 패널 — 4클래스 선택 + 이름 입력 + 외형 선택
    /// </summary>
    public class CharacterCreatePanel : MonoBehaviour
    {
        [SerializeField] private UIDocument uiDocument;

        private VisualElement _root;
        private TextField _nameField;
        private Label _classDescLabel;
        private Label _errorLabel;
        private Button _createButton;
        private VisualElement _loadingSpinner;

        // 4클래스 버튼
        private Button _btnEtherKnight;
        private Button _btnMemoryWeaver;
        private Button _btnShadowWalker;
        private Button _btnMemoryDestroyer;

        private string _selectedClass;

        /// <summary>클래스 정보 구조체</summary>
        [Serializable]
        private struct ClassInfo
        {
            public string id;
            public string name;
            public string description;
            public string stats;
        }

        private readonly ClassInfo[] _classes = new[]
        {
            new ClassInfo
            {
                id = "ether_knight", name = "에테르 기사",
                description = "근접 물리 딜러. 빠른 연속 공격과 반격 기술에 특화.",
                stats = "STR ★★★★ | DEX ★★★ | INT ★ | VIT ★★★"
            },
            new ClassInfo
            {
                id = "memory_weaver", name = "기억술사",
                description = "원소 마법 딜러. 화/빙/뇌 원소를 조합하는 광역 공격 전문.",
                stats = "STR ★ | DEX ★★ | INT ★★★★ | VIT ★★"
            },
            new ClassInfo
            {
                id = "shadow_weaver", name = "그림자 직조사",
                description = "은신과 암살 특화. 급소 공격과 상태이상 부여에 능함.",
                stats = "STR ★★ | DEX ★★★★ | INT ★★ | VIT ★★"
            },
            new ClassInfo
            {
                id = "memory_breaker", name = "기억 파괴자",
            },
            new ClassInfo {
                id = "time_guardian", name = "시간 수호자",
                description = "봉인 12인의 힘을 계승한 시간의 수호자. 챕터 7 이후 해금.",
                icon = "class-time-guardian"

                description = "봉인 해제 클래스. 대상의 기억을 조작하여 약화시키는 이능 전사.",
                stats = "STR ★★ | DEX ★★ | INT ★★★★ | VIT ★★★"
            }
        };

        private void OnEnable()
        {
            _root = uiDocument.rootVisualElement;
            BindUI();
        }

        private void BindUI()
        {
            _nameField = _root.Q<TextField>("character-name");
            _classDescLabel = _root.Q<Label>("class-description");
            _errorLabel = _root.Q<Label>("error-label");
            _createButton = _root.Q<Button>("create-button");
            _loadingSpinner = _root.Q("loading-spinner");

            _btnEtherKnight = _root.Q<Button>("class-ether-knight");
            _btnMemoryWeaver = _root.Q<Button>("class-memory-weaver");
            _btnShadowWalker = _root.Q<Button>("class-shadow-walker");
            _btnMemoryDestroyer = _root.Q<Button>("class-memory-destroyer");

            _btnEtherKnight?.RegisterCallback<ClickEvent>(_ => SelectClass(0));
            _btnMemoryWeaver?.RegisterCallback<ClickEvent>(_ => SelectClass(1));
            _btnShadowWalker?.RegisterCallback<ClickEvent>(_ => SelectClass(2));
            _btnMemoryDestroyer?.RegisterCallback<ClickEvent>(_ => SelectClass(3));
            _createButton?.RegisterCallback<ClickEvent>(_ => OnCreateClicked());

            HideError();
            HideLoading();
            SelectClass(0); // 기본 선택
        }

        private void SelectClass(int index)
        {
            var info = _classes[index];
            _selectedClass = info.id;

            if (_classDescLabel != null)
                _classDescLabel.text = $"<b>{info.name}</b>\n{info.description}\n{info.stats}";

            // 선택 하이라이트
            var buttons = new[] { _btnEtherKnight, _btnMemoryWeaver, _btnShadowWalker, _btnMemoryDestroyer };
            for (int i = 0; i < buttons.Length; i++)
            {
                if (buttons[i] == null) continue;
                buttons[i].RemoveFromClassList("class-selected");
                if (i == index) buttons[i].AddToClassList("class-selected");
            }
        }

        private void OnCreateClicked()
        {
            var name = _nameField?.value?.Trim() ?? "";

            if (string.IsNullOrEmpty(name))
            {
                ShowError("캐릭터 이름을 입력해주세요.");
                return;
            }

            if (name.Length < 2 || name.Length > 12)
            {
                ShowError("이름은 2~12자여야 합니다.");
                return;
            }

            if (string.IsNullOrEmpty(_selectedClass))
            {
                ShowError("클래스를 선택해주세요.");
                return;
            }

            ShowLoading();
            HideError();

            RestApiClient.Instance.Post<CharacterCreateResponse>("/characters/create",
                new { name, className = _selectedClass },
                response =>
                {
                    HideLoading();
                    Debug.Log($"[CharCreate] Created {response.character.name} ({response.character.className})");
                    UnityEngine.SceneManagement.SceneManager.LoadScene("MainGame");
                },
                error =>
                {
                    HideLoading();
                    ShowError(error.message);
                });
        }

        private void ShowError(string msg)
        {
            if (_errorLabel == null) return;
            _errorLabel.text = msg;
            _errorLabel.style.display = DisplayStyle.Flex;
        }

        private void HideError()
        {
            if (_errorLabel != null) _errorLabel.style.display = DisplayStyle.None;
        }

        private void ShowLoading()
        {
            if (_loadingSpinner != null) _loadingSpinner.style.display = DisplayStyle.Flex;
            if (_createButton != null) _createButton.SetEnabled(false);
        }

        private void HideLoading()
        {
            if (_loadingSpinner != null) _loadingSpinner.style.display = DisplayStyle.None;
            if (_createButton != null) _createButton.SetEnabled(true);
        }
    }

    [Serializable]
    public class CharacterCreateResponse
    {
        public CharacterDetail character;
    }

    [Serializable]
    public class CharacterDetail
    {
        public string id;
        public string name;
        public string className;
        public int level;
        public int exp;
    }
}
