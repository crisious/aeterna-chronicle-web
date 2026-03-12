using System;
using System.Collections.Generic;
using System.Text;
using UnityEngine;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace EternaChronicle.Network
{
    /// <summary>
    /// WebSocket 클라이언트 — 서버 실시간 통신 (전투/채팅/파티/길드 이벤트)
    /// WebGL 환경에서는 NativeWebSocket (jslib) 을 사용한다.
    /// </summary>
    public class WebSocketClient : MonoBehaviour
    {
        public static WebSocketClient Instance { get; private set; }

        [Header("Connection")]
        [SerializeField] private string serverUrl = "wss://api.eterna-chronicle.com/ws";
        [SerializeField] private float reconnectInterval = 3f;
        [SerializeField] private int maxReconnectAttempts = 10;

        public event Action OnConnected;
        public event Action OnDisconnected;
        public event Action<string, JObject> OnMessage;

        private enum ConnectionState { Disconnected, Connecting, Connected, Reconnecting }
        private ConnectionState _state = ConnectionState.Disconnected;
        private int _reconnectAttempts;
        private float _reconnectTimer;
        private string _authToken;

        // WebGL: JavaScript WebSocket 인터페이스
#if UNITY_WEBGL && !UNITY_EDITOR
        [System.Runtime.InteropServices.DllImport("__Internal")]
        private static extern int WebSocket_Create(string url);
        [System.Runtime.InteropServices.DllImport("__Internal")]
        private static extern void WebSocket_Send(int id, string data);
        [System.Runtime.InteropServices.DllImport("__Internal")]
        private static extern void WebSocket_Close(int id);
        [System.Runtime.InteropServices.DllImport("__Internal")]
        private static extern int WebSocket_GetState(int id);

        private int _wsId = -1;
#else
        // Editor/Standalone: System.Net.WebSockets
        private System.Net.WebSockets.ClientWebSocket _ws;
        private System.Threading.CancellationTokenSource _cts;
#endif

        private readonly Queue<(string type, JObject payload)> _messageQueue = new();

        private void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }

        /// <summary>토큰 설정 후 연결 시작</summary>
        public void Connect(string token)
        {
            _authToken = token;
            _reconnectAttempts = 0;
            StartConnection();
        }

        public void Disconnect()
        {
            _state = ConnectionState.Disconnected;
#if UNITY_WEBGL && !UNITY_EDITOR
            if (_wsId >= 0) WebSocket_Close(_wsId);
#else
            _cts?.Cancel();
            _ws?.Dispose();
#endif
            OnDisconnected?.Invoke();
        }

        /// <summary>이벤트 전송</summary>
        public void Send(string eventType, object data = null)
        {
            var msg = JsonConvert.SerializeObject(new { type = eventType, data });
#if UNITY_WEBGL && !UNITY_EDITOR
            if (_wsId >= 0) WebSocket_Send(_wsId, msg);
#else
            SendAsync(msg);
#endif
        }

        private void StartConnection()
        {
            _state = ConnectionState.Connecting;
            var url = $"{serverUrl}?token={_authToken}";

#if UNITY_WEBGL && !UNITY_EDITOR
            _wsId = WebSocket_Create(url);
            // WebGL 환경에서는 JavaScript 콜백으로 상태 관리
            _state = ConnectionState.Connected;
            OnConnected?.Invoke();
#else
            ConnectAsync(url);
#endif
        }

#if !UNITY_WEBGL || UNITY_EDITOR
        private async void ConnectAsync(string url)
        {
            try
            {
                _ws = new System.Net.WebSockets.ClientWebSocket();
                _cts = new System.Threading.CancellationTokenSource();
                await _ws.ConnectAsync(new Uri(url), _cts.Token);

                _state = ConnectionState.Connected;
                _reconnectAttempts = 0;
                OnConnected?.Invoke();
                Debug.Log("[WS] Connected");

                _ = ReceiveLoop();
            }
            catch (Exception ex)
            {
                Debug.LogWarning($"[WS] Connection failed: {ex.Message}");
                TryReconnect();
            }
        }

        private async System.Threading.Tasks.Task ReceiveLoop()
        {
            var buffer = new byte[8192];
            var sb = new StringBuilder();

            while (_ws.State == System.Net.WebSockets.WebSocketState.Open)
            {
                try
                {
                    var result = await _ws.ReceiveAsync(
                        new ArraySegment<byte>(buffer), _cts.Token);

                    if (result.MessageType == System.Net.WebSockets.WebSocketMessageType.Close)
                    {
                        TryReconnect();
                        return;
                    }

                    sb.Append(Encoding.UTF8.GetString(buffer, 0, result.Count));

                    if (result.EndOfMessage)
                    {
                        var json = JObject.Parse(sb.ToString());
                        var type = json["type"]?.ToString() ?? "unknown";
                        var data = json["data"] as JObject ?? new JObject();
                        lock (_messageQueue) _messageQueue.Enqueue((type, data));
                        sb.Clear();
                    }
                }
                catch (Exception ex)
                {
                    Debug.LogWarning($"[WS] Receive error: {ex.Message}");
                    TryReconnect();
                    return;
                }
            }
        }

        private async void SendAsync(string data)
        {
            if (_ws?.State != System.Net.WebSockets.WebSocketState.Open) return;
            var bytes = Encoding.UTF8.GetBytes(data);
            await _ws.SendAsync(new ArraySegment<byte>(bytes),
                System.Net.WebSockets.WebSocketMessageType.Text, true, _cts.Token);
        }
#endif

        private void TryReconnect()
        {
            if (_reconnectAttempts >= maxReconnectAttempts)
            {
                Debug.LogError("[WS] Max reconnect attempts reached");
                _state = ConnectionState.Disconnected;
                OnDisconnected?.Invoke();
                return;
            }

            _state = ConnectionState.Reconnecting;
            _reconnectAttempts++;
            _reconnectTimer = reconnectInterval * _reconnectAttempts; // exponential-ish
        }

        private void Update()
        {
            // 재접속 타이머
            if (_state == ConnectionState.Reconnecting)
            {
                _reconnectTimer -= Time.deltaTime;
                if (_reconnectTimer <= 0) StartConnection();
            }

            // 메인 스레드에서 메시지 디스패치
            lock (_messageQueue)
            {
                while (_messageQueue.Count > 0)
                {
                    var (type, payload) = _messageQueue.Dequeue();
                    OnMessage?.Invoke(type, payload);
                }
            }
        }

        // === WebGL JavaScript 콜백 (jslib에서 호출) ===

        /// <summary>JavaScript에서 메시지 수신 시 호출</summary>
        public void OnWebGLMessage(string rawJson)
        {
            try
            {
                var json = JObject.Parse(rawJson);
                var type = json["type"]?.ToString() ?? "unknown";
                var data = json["data"] as JObject ?? new JObject();
                OnMessage?.Invoke(type, data);
            }
            catch (Exception ex)
            {
                Debug.LogWarning($"[WS] WebGL parse error: {ex.Message}");
            }
        }

        public void OnWebGLOpen(string _) { _state = ConnectionState.Connected; OnConnected?.Invoke(); }
        public void OnWebGLClose(string _) { TryReconnect(); }
    }
}
