using System;
using System.Collections;
using System.Collections.Generic;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;
using Newtonsoft.Json;

namespace EternaChronicle.Network
{
    /// <summary>
    /// REST API 클라이언트 — 인증, 인벤토리, 상점, 캐릭터 CRUD 등
    /// UnityWebRequest 기반 (WebGL 호환)
    /// </summary>
    public class RestApiClient : MonoBehaviour
    {
        public static RestApiClient Instance { get; private set; }

        [Header("API")]
        [SerializeField] private string baseUrl = "https://api.eterna-chronicle.com/api";
        [SerializeField] private float defaultTimeout = 15f;

        private string _accessToken;
        private string _refreshToken;

        public string AccessToken => _accessToken;

        private void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }

        public void SetTokens(string access, string refresh)
        {
            _accessToken = access;
            _refreshToken = refresh;
        }

        // ── GET ──
        public void Get<T>(string endpoint, Action<T> onSuccess, Action<ApiError> onError = null)
        {
            StartCoroutine(RequestCoroutine("GET", endpoint, null, onSuccess, onError));
        }

        // ── POST ──
        public void Post<T>(string endpoint, object body, Action<T> onSuccess, Action<ApiError> onError = null)
        {
            StartCoroutine(RequestCoroutine("POST", endpoint, body, onSuccess, onError));
        }

        // ── PUT ──
        public void Put<T>(string endpoint, object body, Action<T> onSuccess, Action<ApiError> onError = null)
        {
            StartCoroutine(RequestCoroutine("PUT", endpoint, body, onSuccess, onError));
        }

        // ── DELETE ──
        public void Delete<T>(string endpoint, Action<T> onSuccess, Action<ApiError> onError = null)
        {
            StartCoroutine(RequestCoroutine("DELETE", endpoint, null, onSuccess, onError));
        }

        private IEnumerator RequestCoroutine<T>(
            string method, string endpoint, object body,
            Action<T> onSuccess, Action<ApiError> onError)
        {
            var url = $"{baseUrl}{endpoint}";
            UnityWebRequest req;

            switch (method)
            {
                case "POST":
                case "PUT":
                    var json = body != null ? JsonConvert.SerializeObject(body) : "{}";
                    req = new UnityWebRequest(url, method)
                    {
                        uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(json)),
                        downloadHandler = new DownloadHandlerBuffer()
                    };
                    req.SetRequestHeader("Content-Type", "application/json");
                    break;
                case "DELETE":
                    req = UnityWebRequest.Delete(url);
                    req.downloadHandler = new DownloadHandlerBuffer();
                    break;
                default:
                    req = UnityWebRequest.Get(url);
                    break;
            }

            // Auth header
            if (!string.IsNullOrEmpty(_accessToken))
                req.SetRequestHeader("Authorization", $"Bearer {_accessToken}");

            req.timeout = (int)defaultTimeout;
            yield return req.SendWebRequest();

            if (req.result == UnityWebRequest.Result.Success)
            {
                try
                {
                    var result = JsonConvert.DeserializeObject<T>(req.downloadHandler.text);
                    onSuccess?.Invoke(result);
                }
                catch (Exception ex)
                {
                    onError?.Invoke(new ApiError { code = -1, message = $"Parse error: {ex.Message}" });
                }
            }
            else if (req.responseCode == 401)
            {
                // 토큰 만료 → refresh 시도
                yield return RefreshTokenCoroutine();
                if (!string.IsNullOrEmpty(_accessToken))
                {
                    // 재시도
                    StartCoroutine(RequestCoroutine(method, endpoint, body, onSuccess, onError));
                }
                else
                {
                    onError?.Invoke(new ApiError { code = 401, message = "Authentication failed" });
                }
            }
            else
            {
                var errorMsg = req.downloadHandler?.text ?? req.error;
                Debug.LogWarning($"[API] {method} {endpoint} → {req.responseCode}: {errorMsg}");
                onError?.Invoke(new ApiError
                {
                    code = (int)req.responseCode,
                    message = errorMsg
                });
            }

            req.Dispose();
        }

        private IEnumerator RefreshTokenCoroutine()
        {
            if (string.IsNullOrEmpty(_refreshToken)) yield break;

            var url = $"{baseUrl}/auth/refresh";
            var body = JsonConvert.SerializeObject(new { refreshToken = _refreshToken });
            var req = new UnityWebRequest(url, "POST")
            {
                uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(body)),
                downloadHandler = new DownloadHandlerBuffer()
            };
            req.SetRequestHeader("Content-Type", "application/json");
            req.timeout = 10;
            yield return req.SendWebRequest();

            if (req.result == UnityWebRequest.Result.Success)
            {
                var result = JsonConvert.DeserializeObject<TokenResponse>(req.downloadHandler.text);
                _accessToken = result.accessToken;
                _refreshToken = result.refreshToken;
                Debug.Log("[API] Token refreshed");
            }
            else
            {
                Debug.LogWarning("[API] Token refresh failed — forcing re-login");
                _accessToken = null;
                _refreshToken = null;
                AuthManager.Instance?.ForceLogout();
            }

            req.Dispose();
        }
    }

    [Serializable]
    public class ApiError
    {
        public int code;
        public string message;
    }

    [Serializable]
    public class TokenResponse
    {
        public string accessToken;
        public string refreshToken;
        public int expiresIn;
    }
}
