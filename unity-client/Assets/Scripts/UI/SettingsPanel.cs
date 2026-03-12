using UnityEngine;
using UnityEngine.UIElements;

namespace EternaChronicle.UI
{
    /// <summary>
    /// 설정 패널 — 그래픽/사운드/게임/계정 설정
    /// PlayerPrefs 기반 (WebGL localStorage 호환)
    /// </summary>
    public class SettingsPanel : MonoBehaviour
    {
        [SerializeField] private UIDocument settingsDocument;

        private VisualElement _root;

        // Graphics
        private SliderInt _qualitySlider;
        private Toggle _particleToggle;
        private Toggle _screenShakeToggle;
        private SliderInt _fpsLimitSlider;

        // Audio
        private Slider _masterVolume;
        private Slider _bgmVolume;
        private Slider _sfxVolume;
        private Slider _voiceVolume;
        private Toggle _muteToggle;

        // Game
        private Toggle _autoCombatToggle;
        private Toggle _autoLootToggle;
        private Toggle _showDamageToggle;
        private Toggle _showNamesToggle;
        private DropdownField _languageDropdown;

        // Account
        private Button _logoutButton;
        private Button _deleteAccountButton;

        private void OnEnable()
        {
            _root = settingsDocument.rootVisualElement;
            BindUI();
            LoadSettings();
        }

        private void BindUI()
        {
            // Graphics
            _qualitySlider = _root.Q<SliderInt>("quality-level");
            _particleToggle = _root.Q<Toggle>("particles");
            _screenShakeToggle = _root.Q<Toggle>("screen-shake");
            _fpsLimitSlider = _root.Q<SliderInt>("fps-limit");

            // Audio
            _masterVolume = _root.Q<Slider>("master-volume");
            _bgmVolume = _root.Q<Slider>("bgm-volume");
            _sfxVolume = _root.Q<Slider>("sfx-volume");
            _voiceVolume = _root.Q<Slider>("voice-volume");
            _muteToggle = _root.Q<Toggle>("mute-all");

            // Game
            _autoCombatToggle = _root.Q<Toggle>("auto-combat");
            _autoLootToggle = _root.Q<Toggle>("auto-loot");
            _showDamageToggle = _root.Q<Toggle>("show-damage");
            _showNamesToggle = _root.Q<Toggle>("show-names");
            _languageDropdown = _root.Q<DropdownField>("language");

            // Account
            _logoutButton = _root.Q<Button>("logout");
            _deleteAccountButton = _root.Q<Button>("delete-account");

            // 이벤트
            _qualitySlider?.RegisterValueChangedCallback(e => SetQuality(e.newValue));
            _masterVolume?.RegisterValueChangedCallback(e => SetVolume("master", e.newValue));
            _bgmVolume?.RegisterValueChangedCallback(e => SetVolume("bgm", e.newValue));
            _sfxVolume?.RegisterValueChangedCallback(e => SetVolume("sfx", e.newValue));
            _voiceVolume?.RegisterValueChangedCallback(e => SetVolume("voice", e.newValue));
            _muteToggle?.RegisterValueChangedCallback(e => AudioListener.volume = e.newValue ? 0 : 1);

            _autoCombatToggle?.RegisterValueChangedCallback(e =>
                PlayerPrefs.SetInt("auto_combat", e.newValue ? 1 : 0));
            _autoLootToggle?.RegisterValueChangedCallback(e =>
                PlayerPrefs.SetInt("auto_loot", e.newValue ? 1 : 0));

            _logoutButton?.RegisterCallback<ClickEvent>(_ =>
                Network.AuthManager.Instance?.Logout());

            var closeBtn = _root.Q<Button>("settings-close");
            closeBtn?.RegisterCallback<ClickEvent>(_ => gameObject.SetActive(false));

            var applyBtn = _root.Q<Button>("apply-settings");
            applyBtn?.RegisterCallback<ClickEvent>(_ => SaveSettings());
        }

        private void LoadSettings()
        {
            if (_qualitySlider != null) _qualitySlider.value = PlayerPrefs.GetInt("quality", 1);
            if (_particleToggle != null) _particleToggle.value = PlayerPrefs.GetInt("particles", 1) == 1;
            if (_screenShakeToggle != null) _screenShakeToggle.value = PlayerPrefs.GetInt("screen_shake", 1) == 1;
            if (_fpsLimitSlider != null) _fpsLimitSlider.value = PlayerPrefs.GetInt("fps_limit", 60);

            if (_masterVolume != null) _masterVolume.value = PlayerPrefs.GetFloat("vol_master", 1f);
            if (_bgmVolume != null) _bgmVolume.value = PlayerPrefs.GetFloat("vol_bgm", 0.7f);
            if (_sfxVolume != null) _sfxVolume.value = PlayerPrefs.GetFloat("vol_sfx", 0.8f);
            if (_voiceVolume != null) _voiceVolume.value = PlayerPrefs.GetFloat("vol_voice", 0.9f);

            if (_autoCombatToggle != null) _autoCombatToggle.value = PlayerPrefs.GetInt("auto_combat", 1) == 1;
            if (_autoLootToggle != null) _autoLootToggle.value = PlayerPrefs.GetInt("auto_loot", 1) == 1;
            if (_showDamageToggle != null) _showDamageToggle.value = PlayerPrefs.GetInt("show_damage", 1) == 1;
            if (_showNamesToggle != null) _showNamesToggle.value = PlayerPrefs.GetInt("show_names", 1) == 1;

            if (_languageDropdown != null)
            {
                _languageDropdown.choices = new() { "한국어", "English", "日本語" };
                _languageDropdown.value = PlayerPrefs.GetString("language", "한국어");
            }
        }

        private void SaveSettings()
        {
            PlayerPrefs.SetInt("quality", _qualitySlider?.value ?? 1);
            PlayerPrefs.SetInt("particles", (_particleToggle?.value ?? true) ? 1 : 0);
            PlayerPrefs.SetInt("screen_shake", (_screenShakeToggle?.value ?? true) ? 1 : 0);
            PlayerPrefs.SetInt("fps_limit", _fpsLimitSlider?.value ?? 60);

            PlayerPrefs.SetFloat("vol_master", _masterVolume?.value ?? 1f);
            PlayerPrefs.SetFloat("vol_bgm", _bgmVolume?.value ?? 0.7f);
            PlayerPrefs.SetFloat("vol_sfx", _sfxVolume?.value ?? 0.8f);
            PlayerPrefs.SetFloat("vol_voice", _voiceVolume?.value ?? 0.9f);

            PlayerPrefs.SetInt("show_damage", (_showDamageToggle?.value ?? true) ? 1 : 0);
            PlayerPrefs.SetInt("show_names", (_showNamesToggle?.value ?? true) ? 1 : 0);
            PlayerPrefs.SetString("language", _languageDropdown?.value ?? "한국어");

            PlayerPrefs.Save();
            Debug.Log("[Settings] Saved");
        }

        private void SetQuality(int level)
        {
            QualitySettings.SetQualityLevel(level, true);
            PlayerPrefs.SetInt("quality", level);
        }

        private void SetVolume(string channel, float value)
        {
            PlayerPrefs.SetFloat($"vol_{channel}", value);
            // AudioMixer 연동은 실제 AudioMixer 에셋 필요
        }
    }
}
