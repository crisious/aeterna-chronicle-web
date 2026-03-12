using System;
using System.Collections;
using UnityEngine;

namespace EternaChronicle.Core
{
    /// <summary>
    /// WebGL 최적화 — 메모리 관리, 프레임 제한, GC 제어, 텍스처 압축
    /// WebGL 환경의 제약(단일 스레드, 제한된 메모리)에 맞춘 최적화
    /// </summary>
    public class WebGLOptimizer : MonoBehaviour
    {
        public static WebGLOptimizer Instance { get; private set; }

        [Header("Performance")]
        [SerializeField] private int targetFrameRate = 60;
        [SerializeField] private float gcInterval = 30f;         // GC 강제 수집 간격 (초)
        [SerializeField] private float memoryWarningMB = 400f;   // 메모리 경고 임계치

        [Header("Quality Scaling")]
        [SerializeField] private bool autoQualityScaling = true;
        [SerializeField] private float fpsCheckInterval = 5f;
        [SerializeField] private int lowFpsThreshold = 25;
        [SerializeField] private int highFpsThreshold = 55;

        [Header("Loading")]
        [SerializeField] private int maxConcurrentLoads = 3;

        private float _gcTimer;
        private float _fpsTimer;
        private int _frameCount;
        private float _currentFps;
        private int _currentQualityLevel = 1;    // 0=Low, 1=Mid, 2=High
        private int _qualityChangeCount;

        // WebGL JavaScript 호출
#if UNITY_WEBGL && !UNITY_EDITOR
        [System.Runtime.InteropServices.DllImport("__Internal")]
        private static extern float WebGL_GetTotalMemoryMB();
        [System.Runtime.InteropServices.DllImport("__Internal")]
        private static extern float WebGL_GetUsedMemoryMB();
        [System.Runtime.InteropServices.DllImport("__Internal")]
        private static extern void WebGL_ShowLoadingProgress(float progress);
        [System.Runtime.InteropServices.DllImport("__Internal")]
        private static extern void WebGL_HideLoadingScreen();
#endif

        private void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;
            DontDestroyOnLoad(gameObject);

            ApplyInitialSettings();
        }

        private void ApplyInitialSettings()
        {
            Application.targetFrameRate = targetFrameRate;

            // WebGL 기본 최적화
#if UNITY_WEBGL
            // V-Sync off for consistent frame rate
            QualitySettings.vSyncCount = 0;

            // 비동기 셰이더 컴파일 비활성화 (WebGL 미지원)
            // 텍스처 스트리밍 비활성화
            QualitySettings.streamingMipmapsActive = false;
#endif

            Debug.Log($"[WebGL] Optimizer initialized — target {targetFrameRate}fps, quality level {_currentQualityLevel}");
        }

        private void Update()
        {
            // FPS 추적
            _frameCount++;
            _fpsTimer += Time.unscaledDeltaTime;
            if (_fpsTimer >= fpsCheckInterval)
            {
                _currentFps = _frameCount / _fpsTimer;
                _frameCount = 0;
                _fpsTimer = 0;

                if (autoQualityScaling)
                    AutoAdjustQuality();
            }

            // 주기적 GC
            _gcTimer += Time.unscaledDeltaTime;
            if (_gcTimer >= gcInterval)
            {
                _gcTimer = 0;
                ForceGC();
            }
        }

        /// <summary>자동 품질 조정</summary>
        private void AutoAdjustQuality()
        {
            if (_qualityChangeCount > 10) return; // 과도한 변경 방지

            if (_currentFps < lowFpsThreshold && _currentQualityLevel > 0)
            {
                _currentQualityLevel--;
                QualitySettings.SetQualityLevel(_currentQualityLevel, true);
                _qualityChangeCount++;
                Debug.Log($"[WebGL] Quality lowered to {_currentQualityLevel} (FPS: {_currentFps:F0})");
            }
            else if (_currentFps > highFpsThreshold && _currentQualityLevel < 2)
            {
                _currentQualityLevel++;
                QualitySettings.SetQualityLevel(_currentQualityLevel, true);
                _qualityChangeCount++;
                Debug.Log($"[WebGL] Quality raised to {_currentQualityLevel} (FPS: {_currentFps:F0})");
            }
        }

        /// <summary>강제 GC 수집</summary>
        public void ForceGC()
        {
            var before = GC.GetTotalMemory(false) / (1024f * 1024f);
            GC.Collect();
            GC.WaitForPendingFinalizers();
            var after = GC.GetTotalMemory(false) / (1024f * 1024f);
            Debug.Log($"[WebGL] GC: {before:F1}MB → {after:F1}MB (freed {before - after:F1}MB)");
        }

        /// <summary>메모리 사용량 조회 (MB)</summary>
        public float GetMemoryUsageMB()
        {
#if UNITY_WEBGL && !UNITY_EDITOR
            return WebGL_GetUsedMemoryMB();
#else
            return GC.GetTotalMemory(false) / (1024f * 1024f);
#endif
        }

        /// <summary>메모리 경고 체크</summary>
        public bool IsMemoryWarning()
        {
            return GetMemoryUsageMB() > memoryWarningMB;
        }

        /// <summary>로딩 진행률 표시 (WebGL HTML 오버레이)</summary>
        public void ShowLoadingProgress(float progress)
        {
#if UNITY_WEBGL && !UNITY_EDITOR
            WebGL_ShowLoadingProgress(progress);
#else
            Debug.Log($"[Loading] {progress * 100:F0}%");
#endif
        }

        /// <summary>로딩 화면 숨기기</summary>
        public void HideLoadingScreen()
        {
#if UNITY_WEBGL && !UNITY_EDITOR
            WebGL_HideLoadingScreen();
#else
            Debug.Log("[Loading] Complete");
#endif
        }

        /// <summary>현재 성능 상태</summary>
        public PerformanceStats GetStats()
        {
            return new PerformanceStats
            {
                fps = _currentFps,
                memoryMB = GetMemoryUsageMB(),
                qualityLevel = _currentQualityLevel,
                isMemoryWarning = IsMemoryWarning()
            };
        }
    }

    [Serializable]
    public struct PerformanceStats
    {
        public float fps;
        public float memoryMB;
        public int qualityLevel;
        public bool isMemoryWarning;
    }
}
