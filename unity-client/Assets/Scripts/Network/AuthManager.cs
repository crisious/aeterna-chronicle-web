using System;
using UnityEngine;
using Newtonsoft.Json;

namespace EternaChronicle.Network
{
    /// <summary>
    /// 인증 매니저 — 로그인/회원가입/JWT 관리/자동 로그인
    /// PlayerPrefs에 refreshToken 저장 (WebGL localStorage 매핑)
    /// </summary>
    public class AuthManager : MonoBehaviour
    {
        public static AuthManager Instance { get; private set; }

        public event Action<PlayerInfo> OnLoginSuccess;
        public event Action<string> OnLoginFailed;
        public event Action OnLogout;

        public bool IsLoggedIn { get; private set; }
        public PlayerInfo CurrentPlayer { get; private set; }

        private const string PREF_REFRESH_TOKEN = "eterna_refresh_token";
        private const string PREF_REMEMBER_ME = "eterna_remember_me";

        private void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }

        private void Start()
        {
            // 자동 로그인 시도
            if (PlayerPrefs.GetInt(PREF_REMEMBER_ME, 0) == 1)
            {
                var savedToken = PlayerPrefs.GetString(PREF_REFRESH_TOKEN, "");
                if (!string.IsNullOrEmpty(savedToken))
                    TryAutoLogin(savedToken);
            }
        }

        /// <summary>이메일/비밀번호 로그인</summary>
        public void Login(string email, string password, bool rememberMe = false)
        {
            RestApiClient.Instance.Post<LoginResponse>("/auth/login",
                new { email, password },
                response =>
                {
                    HandleLoginSuccess(response, rememberMe);
                },
                error =>
                {
                    Debug.LogWarning($"[Auth] Login failed: {error.message}");
                    OnLoginFailed?.Invoke(error.message);
                });
        }

        /// <summary>회원가입</summary>
        public void Register(string email, string username, string password)
        {
            RestApiClient.Instance.Post<LoginResponse>("/auth/register",
                new { email, username, password },
                response =>
                {
                    HandleLoginSuccess(response, false);
                },
                error =>
                {
                    OnLoginFailed?.Invoke(error.message);
                });
        }

        /// <summary>게스트 로그인</summary>
        public void LoginAsGuest()
        {
            RestApiClient.Instance.Post<LoginResponse>("/auth/guest",
                new { deviceId = SystemInfo.deviceUniqueIdentifier },
                response =>
                {
                    HandleLoginSuccess(response, false);
                },
                error =>
                {
                    OnLoginFailed?.Invoke(error.message);
                });
        }

        /// <summary>로그아웃</summary>
        public void Logout()
        {
            IsLoggedIn = false;
            CurrentPlayer = null;
            PlayerPrefs.DeleteKey(PREF_REFRESH_TOKEN);
            PlayerPrefs.SetInt(PREF_REMEMBER_ME, 0);
            PlayerPrefs.Save();

            RestApiClient.Instance.SetTokens(null, null);
            WebSocketClient.Instance?.Disconnect();
            OnLogout?.Invoke();
        }

        /// <summary>서버에서 강제 로그아웃 시 호출</summary>
        public void ForceLogout()
        {
            Debug.LogWarning("[Auth] Forced logout — session expired");
            Logout();
        }

        private void TryAutoLogin(string refreshToken)
        {
            RestApiClient.Instance.SetTokens(null, refreshToken);
            RestApiClient.Instance.Post<LoginResponse>("/auth/refresh",
                new { refreshToken },
                response => HandleLoginSuccess(response, true),
                error =>
                {
                    Debug.Log("[Auth] Auto-login failed — clearing saved token");
                    PlayerPrefs.DeleteKey(PREF_REFRESH_TOKEN);
                    PlayerPrefs.Save();
                });
        }

        private void HandleLoginSuccess(LoginResponse response, bool rememberMe)
        {
            RestApiClient.Instance.SetTokens(response.accessToken, response.refreshToken);
            CurrentPlayer = response.player;
            IsLoggedIn = true;

            if (rememberMe)
            {
                PlayerPrefs.SetString(PREF_REFRESH_TOKEN, response.refreshToken);
                PlayerPrefs.SetInt(PREF_REMEMBER_ME, 1);
                PlayerPrefs.Save();
            }

            // WebSocket 연결
            WebSocketClient.Instance?.Connect(response.accessToken);

            Debug.Log($"[Auth] Logged in as {CurrentPlayer.username} (id={CurrentPlayer.id})");
            OnLoginSuccess?.Invoke(CurrentPlayer);
        }
    }

    [Serializable]
    public class LoginResponse
    {
        public string accessToken;
        public string refreshToken;
        public int expiresIn;
        public PlayerInfo player;
    }

    [Serializable]
    public class PlayerInfo
    {
        public string id;
        public string username;
        public string email;
        public int level;
        public string activeCharacterId;
        public CharacterSummary[] characters;
    }

    [Serializable]
    public class CharacterSummary
    {
        public string id;
        public string name;
        public string className;
        public int level;
    }
}
