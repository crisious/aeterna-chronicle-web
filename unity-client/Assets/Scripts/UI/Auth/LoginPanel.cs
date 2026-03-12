using UnityEngine;
using UnityEngine.UIElements;
using EternaChronicle.Network;

namespace EternaChronicle.UI.Auth
{
    /// <summary>
    /// 로그인 패널 — UI Toolkit 기반 인증 플로우
    /// LoginPanel.uxml + LoginPanel.uss 바인딩
    /// </summary>
    public class LoginPanel : MonoBehaviour
    {
        [SerializeField] private UIDocument uiDocument;
        [SerializeField] private VisualTreeAsset loginTemplate;
        [SerializeField] private VisualTreeAsset registerTemplate;

        private VisualElement _root;
        private TextField _emailField;
        private TextField _passwordField;
        private TextField _usernameField;
        private Toggle _rememberMeToggle;
        private Button _loginButton;
        private Button _registerButton;
        private Button _guestButton;
        private Button _switchToRegisterButton;
        private Button _switchToLoginButton;
        private Label _errorLabel;
        private VisualElement _loadingSpinner;

        private bool _isRegisterMode;

        private void OnEnable()
        {
            _root = uiDocument.rootVisualElement;
            BindLoginUI();

            AuthManager.Instance.OnLoginSuccess += OnLoginSuccess;
            AuthManager.Instance.OnLoginFailed += OnLoginFailed;
        }

        private void OnDisable()
        {
            if (AuthManager.Instance != null)
            {
                AuthManager.Instance.OnLoginSuccess -= OnLoginSuccess;
                AuthManager.Instance.OnLoginFailed -= OnLoginFailed;
            }
        }

        private void BindLoginUI()
        {
            _emailField = _root.Q<TextField>("email-field");
            _passwordField = _root.Q<TextField>("password-field");
            _usernameField = _root.Q<TextField>("username-field");
            _rememberMeToggle = _root.Q<Toggle>("remember-me");
            _loginButton = _root.Q<Button>("login-button");
            _registerButton = _root.Q<Button>("register-button");
            _guestButton = _root.Q<Button>("guest-button");
            _switchToRegisterButton = _root.Q<Button>("switch-to-register");
            _switchToLoginButton = _root.Q<Button>("switch-to-login");
            _errorLabel = _root.Q<Label>("error-label");
            _loadingSpinner = _root.Q("loading-spinner");

            // 패스워드 마스킹
            if (_passwordField != null) _passwordField.isPasswordField = true;

            // 초기 상태
            SetRegisterMode(false);
            HideError();
            HideLoading();

            // 이벤트 바인딩
            _loginButton?.RegisterCallback<ClickEvent>(_ => OnLoginClicked());
            _registerButton?.RegisterCallback<ClickEvent>(_ => OnRegisterClicked());
            _guestButton?.RegisterCallback<ClickEvent>(_ => OnGuestClicked());
            _switchToRegisterButton?.RegisterCallback<ClickEvent>(_ => SetRegisterMode(true));
            _switchToLoginButton?.RegisterCallback<ClickEvent>(_ => SetRegisterMode(false));

            // Enter 키 로그인
            _passwordField?.RegisterCallback<KeyDownEvent>(e =>
            {
                if (e.keyCode == KeyCode.Return || e.keyCode == KeyCode.KeypadEnter)
                {
                    if (_isRegisterMode) OnRegisterClicked();
                    else OnLoginClicked();
                }
            });
        }

        private void SetRegisterMode(bool isRegister)
        {
            _isRegisterMode = isRegister;
            _usernameField?.SetEnabled(isRegister);
            if (_usernameField != null)
                _usernameField.style.display = isRegister ? DisplayStyle.Flex : DisplayStyle.None;

            if (_loginButton != null)
                _loginButton.style.display = isRegister ? DisplayStyle.None : DisplayStyle.Flex;
            if (_registerButton != null)
                _registerButton.style.display = isRegister ? DisplayStyle.Flex : DisplayStyle.None;
            if (_switchToRegisterButton != null)
                _switchToRegisterButton.style.display = isRegister ? DisplayStyle.None : DisplayStyle.Flex;
            if (_switchToLoginButton != null)
                _switchToLoginButton.style.display = isRegister ? DisplayStyle.Flex : DisplayStyle.None;
            if (_rememberMeToggle != null)
                _rememberMeToggle.style.display = isRegister ? DisplayStyle.None : DisplayStyle.Flex;

            HideError();
        }

        private void OnLoginClicked()
        {
            var email = _emailField?.value?.Trim() ?? "";
            var password = _passwordField?.value ?? "";

            if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(password))
            {
                ShowError("이메일과 비밀번호를 입력해주세요.");
                return;
            }

            ShowLoading();
            AuthManager.Instance.Login(email, password, _rememberMeToggle?.value ?? false);
        }

        private void OnRegisterClicked()
        {
            var email = _emailField?.value?.Trim() ?? "";
            var username = _usernameField?.value?.Trim() ?? "";
            var password = _passwordField?.value ?? "";

            if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(username) || string.IsNullOrEmpty(password))
            {
                ShowError("모든 필드를 입력해주세요.");
                return;
            }

            if (password.Length < 8)
            {
                ShowError("비밀번호는 8자 이상이어야 합니다.");
                return;
            }

            ShowLoading();
            AuthManager.Instance.Register(email, username, password);
        }

        private void OnGuestClicked()
        {
            ShowLoading();
            AuthManager.Instance.LoginAsGuest();
        }

        private void OnLoginSuccess(PlayerInfo player)
        {
            HideLoading();
            Debug.Log($"[LoginPanel] Welcome, {player.username}!");

            // 캐릭터가 있으면 메인으로, 없으면 캐릭터 생성으로
            if (player.characters != null && player.characters.Length > 0)
                UnityEngine.SceneManagement.SceneManager.LoadScene("MainGame");
            else
                UnityEngine.SceneManagement.SceneManager.LoadScene("CharacterCreate");
        }

        private void OnLoginFailed(string errorMsg)
        {
            HideLoading();
            ShowError(errorMsg);
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
            if (_loginButton != null) _loginButton.SetEnabled(false);
            if (_registerButton != null) _registerButton.SetEnabled(false);
        }

        private void HideLoading()
        {
            if (_loadingSpinner != null) _loadingSpinner.style.display = DisplayStyle.None;
            if (_loginButton != null) _loginButton.SetEnabled(true);
            if (_registerButton != null) _registerButton.SetEnabled(true);
        }
    }
}
