using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UIElements;
using Newtonsoft.Json.Linq;
using EternaChronicle.Network;

namespace EternaChronicle.UI
{
    /// <summary>
    /// 채팅 패널 — 전체/파티/길드/귓속말 채널
    /// WebSocket 실시간 통신
    /// </summary>
    public class ChatPanel : MonoBehaviour
    {
        [SerializeField] private UIDocument chatDocument;
        [SerializeField] private int maxMessages = 200;

        private VisualElement _root;
        private ScrollView _messageScroll;
        private TextField _inputField;
        private Button _sendButton;

        private ChatChannel _currentChannel = ChatChannel.All;
        private readonly Dictionary<ChatChannel, List<ChatMessage>> _channels = new();
        private string _whisperTarget;

        public enum ChatChannel { All, Party, Guild, Whisper, System }

        private void OnEnable()
        {
            _root = chatDocument.rootVisualElement;
            _messageScroll = _root.Q<ScrollView>("chat-messages");
            _inputField = _root.Q<TextField>("chat-input");
            _sendButton = _root.Q<Button>("send-button");

            _sendButton?.RegisterCallback<ClickEvent>(_ => SendMessage());
            _inputField?.RegisterCallback<KeyDownEvent>(e =>
            {
                if (e.keyCode == KeyCode.Return || e.keyCode == KeyCode.KeypadEnter)
                    SendMessage();
            });

            // 채널 탭
            foreach (ChatChannel ch in Enum.GetValues(typeof(ChatChannel)))
            {
                _channels[ch] = new List<ChatMessage>();
                var btn = _root.Q<Button>($"tab-{ch.ToString().ToLower()}");
                var channel = ch;
                btn?.RegisterCallback<ClickEvent>(_ => SwitchChannel(channel));
            }

            WebSocketClient.Instance.OnMessage += HandleServerMessage;
        }

        private void OnDisable()
        {
            if (WebSocketClient.Instance != null)
                WebSocketClient.Instance.OnMessage -= HandleServerMessage;
        }

        private void SendMessage()
        {
            var text = _inputField?.value?.Trim();
            if (string.IsNullOrEmpty(text)) return;

            // 명령어 파싱
            if (text.StartsWith("/"))
            {
                HandleCommand(text);
                _inputField.value = "";
                return;
            }

            WebSocketClient.Instance.Send("chat:send", new
            {
                channel = _currentChannel.ToString().ToLower(),
                message = text,
                whisperTarget = _currentChannel == ChatChannel.Whisper ? _whisperTarget : null
            });

            _inputField.value = "";
            _inputField.Focus();
        }

        private void HandleCommand(string text)
        {
            var parts = text.Split(' ', 2);
            var cmd = parts[0].ToLower();

            switch (cmd)
            {
                case "/w" or "/whisper":
                    if (parts.Length > 1)
                    {
                        var whisperParts = parts[1].Split(' ', 2);
                        _whisperTarget = whisperParts[0];
                        _currentChannel = ChatChannel.Whisper;
                        if (whisperParts.Length > 1)
                        {
                            WebSocketClient.Instance.Send("chat:send", new
                            {
                                channel = "whisper",
                                message = whisperParts[1],
                                whisperTarget = _whisperTarget
                            });
                        }
                    }
                    break;

                case "/party" or "/p":
                    SwitchChannel(ChatChannel.Party);
                    break;

                case "/guild" or "/g":
                    SwitchChannel(ChatChannel.Guild);
                    break;

                case "/all" or "/a":
                    SwitchChannel(ChatChannel.All);
                    break;

                default:
                    AddSystemMessage($"알 수 없는 명령어: {cmd}");
                    break;
            }
        }

        private void HandleServerMessage(string type, JObject data)
        {
            if (type != "chat:message") return;

            var msg = new ChatMessage
            {
                sender = data["sender"]?.ToString() ?? "???",
                message = data["message"]?.ToString() ?? "",
                channel = ParseChannel(data["channel"]?.ToString()),
                timestamp = DateTime.Now,
                isSystem = data["isSystem"]?.Value<bool>() ?? false
            };

            AddMessage(msg);
        }

        private void AddMessage(ChatMessage msg)
        {
            if (_channels.TryGetValue(msg.channel, out var list))
            {
                list.Add(msg);
                if (list.Count > maxMessages)
                    list.RemoveAt(0);
            }

            // 전체 채널에도 추가 (시스템 메시지 등)
            if (msg.channel != ChatChannel.All && _channels.TryGetValue(ChatChannel.All, out var allList))
            {
                allList.Add(msg);
                if (allList.Count > maxMessages)
                    allList.RemoveAt(0);
            }

            // 현재 채널이면 화면 갱신
            if (msg.channel == _currentChannel || _currentChannel == ChatChannel.All)
                AppendMessageUI(msg);
        }

        private void AddSystemMessage(string text)
        {
            AddMessage(new ChatMessage
            {
                sender = "시스템",
                message = text,
                channel = ChatChannel.System,
                timestamp = DateTime.Now,
                isSystem = true
            });
        }

        private void SwitchChannel(ChatChannel channel)
        {
            _currentChannel = channel;
            RefreshMessages();

            // 탭 하이라이트
            foreach (ChatChannel ch in Enum.GetValues(typeof(ChatChannel)))
            {
                var btn = _root.Q<Button>($"tab-{ch.ToString().ToLower()}");
                btn?.RemoveFromClassList("tab-active");
                if (ch == channel) btn?.AddToClassList("tab-active");
            }
        }

        private void RefreshMessages()
        {
            _messageScroll?.Clear();
            if (!_channels.TryGetValue(_currentChannel, out var list)) return;

            foreach (var msg in list)
                AppendMessageUI(msg);
        }

        private void AppendMessageUI(ChatMessage msg)
        {
            if (_messageScroll == null) return;

            var label = new Label();
            var channelTag = msg.channel switch
            {
                ChatChannel.Party => "<color=#5599ff>[파티]</color>",
                ChatChannel.Guild => "<color=#55ff55>[길드]</color>",
                ChatChannel.Whisper => "<color=#ff88ff>[귓속말]</color>",
                ChatChannel.System => "<color=#ffcc00>[시스템]</color>",
                _ => "<color=#cccccc>[전체]</color>"
            };

            var timeStr = msg.timestamp.ToString("HH:mm");
            label.text = msg.isSystem
                ? $"<color=#888>{timeStr}</color> {channelTag} {msg.message}"
                : $"<color=#888>{timeStr}</color> {channelTag} <b>{msg.sender}</b>: {msg.message}";

            label.enableRichText = true;
            label.AddToClassList("chat-message");
            _messageScroll.Add(label);

            // 스크롤 맨 아래로
            _messageScroll.schedule.Execute(() =>
                _messageScroll.scrollOffset = new Vector2(0, float.MaxValue));
        }

        private ChatChannel ParseChannel(string ch) => ch?.ToLower() switch
        {
            "party" => ChatChannel.Party,
            "guild" => ChatChannel.Guild,
            "whisper" => ChatChannel.Whisper,
            "system" => ChatChannel.System,
            _ => ChatChannel.All
        };
    }

    [Serializable]
    public class ChatMessage
    {
        public string sender;
        public string message;
        public ChatPanel.ChatChannel channel;
        public DateTime timestamp;
        public bool isSystem;
    }
}
