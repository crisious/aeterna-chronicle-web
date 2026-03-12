using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using UnityEngine;
using UnityEngine.AddressableAssets;
using UnityEngine.ResourceManagement.AsyncOperations;
using UnityEngine.U2D;

namespace AeternaChronicle.Core
{
    /// <summary>
    /// P16-13: WebGL용 비동기 에셋 로더 (Addressables 기반)
    /// - 프로그레시브 로딩: critical → high → medium → low
    /// - 메모리 캐시 + LRU 해제
    /// - 로딩 프로그레스 콜백
    /// - IndexedDB 캐시 (WebGL)
    /// </summary>
    public class AssetLoader : MonoBehaviour
    {
        #region Singleton
        private static AssetLoader _instance;
        public static AssetLoader Instance
        {
            get
            {
                if (_instance == null)
                {
                    var go = new GameObject("[AssetLoader]");
                    _instance = go.AddComponent<AssetLoader>();
                    DontDestroyOnLoad(go);
                }
                return _instance;
            }
        }
        #endregion

        #region Configuration
        [Header("Memory Budget")]
        [SerializeField] private int _maxCacheSize_MB = 200;
        [SerializeField] private int _criticalBudget_MB = 64;

        [Header("Loading")]
        [SerializeField] private int _maxConcurrentLoads = 4;
        [SerializeField] private float _backgroundLoadDelay = 0.05f;

        [Header("Debug")]
        [SerializeField] private bool _enableDebugLog = false;
        #endregion

        #region Events
        /// <summary>전체 로딩 진행률 (0~1)</summary>
        public event Action<float> OnGlobalProgress;

        /// <summary>페이즈 로딩 완료 (phaseIndex, phaseName)</summary>
        public event Action<int, string> OnPhaseComplete;

        /// <summary>개별 번들 로딩 완료 (bundleName)</summary>
        public event Action<string> OnBundleLoaded;

        /// <summary>로딩 에러 (bundleName, errorMessage)</summary>
        public event Action<string, string> OnLoadError;

        /// <summary>전체 로딩 완료</summary>
        public event Action OnAllPhasesComplete;
        #endregion

        #region Internal State
        private AssetManifest _manifest;
        private readonly Dictionary<string, CachedAsset> _cache = new();
        private readonly LinkedList<string> _lruOrder = new();
        private long _currentCacheSize_bytes;
        private int _activeLoads;
        private bool _isInitialized;

        // Loading state
        private int _totalBundles;
        private int _loadedBundles;
        private int _currentPhase = -1;
        #endregion

        #region Initialization

        private void Awake()
        {
            if (_instance != null && _instance != this)
            {
                Destroy(gameObject);
                return;
            }
            _instance = this;
            DontDestroyOnLoad(gameObject);
        }

        /// <summary>매니페스트 로드 + 초기화</summary>
        public async Task InitializeAsync()
        {
            if (_isInitialized) return;

            Log("AssetLoader 초기화 시작");

            // manifest.json 로드
            var manifestOp = Addressables.LoadAssetAsync<TextAsset>("manifest");
            await manifestOp.Task;

            if (manifestOp.Status == AsyncOperationStatus.Succeeded)
            {
                _manifest = JsonUtility.FromJson<AssetManifest>(manifestOp.Result.text);
                _totalBundles = _manifest.bundles.Length;
                _isInitialized = true;
                Log($"매니페스트 로드 완료: {_totalBundles} 번들, {_manifest.totalAssets} 에셋");
            }
            else
            {
                Debug.LogError("[AssetLoader] manifest.json 로드 실패!");
                // Fallback: Resources에서 직접 로드
                var fallback = Resources.Load<TextAsset>("manifest");
                if (fallback != null)
                {
                    _manifest = JsonUtility.FromJson<AssetManifest>(fallback.text);
                    _totalBundles = _manifest.bundles.Length;
                    _isInitialized = true;
                    Log("Fallback: Resources/manifest.json 로드 완료");
                }
            }

            Addressables.Release(manifestOp);
        }

        #endregion

        #region Progressive Loading

        /// <summary>
        /// 프로그레시브 로딩 시작
        /// Phase 0 (critical): 동기적 대기 — 로딩 스크린 표시
        /// Phase 1+ : 비동기 백그라운드 로딩
        /// </summary>
        public async Task StartProgressiveLoadAsync(Action<float> progressCallback = null)
        {
            if (!_isInitialized)
                await InitializeAsync();

            if (_manifest?.loadingStrategy?.phases == null)
            {
                Debug.LogError("[AssetLoader] 로딩 전략 없음");
                return;
            }

            _loadedBundles = 0;

            foreach (var phase in _manifest.loadingStrategy.phases)
            {
                _currentPhase = phase.phase;
                Log($"=== Phase {phase.phase}: {phase.name} ({phase.bundles.Length} 번들) ===");

                // Phase 0 (critical): 순차 로딩 + 진행률
                if (phase.phase == 0)
                {
                    await LoadPhaseSequentialAsync(phase, progressCallback);
                }
                else
                {
                    // Phase 1+: 병렬 백그라운드 로딩
                    _ = LoadPhaseParallelAsync(phase, progressCallback);

                    // Phase 1은 대기, Phase 2+는 fire-and-forget
                    if (phase.phase == 1)
                    {
                        await LoadPhaseParallelAsync(phase, progressCallback);
                    }
                }

                OnPhaseComplete?.Invoke(phase.phase, phase.name);
                Log($"Phase {phase.phase} ({phase.name}) 완료");
            }

            OnAllPhasesComplete?.Invoke();
            Log("전체 프로그레시브 로딩 완료");
        }

        private async Task LoadPhaseSequentialAsync(LoadingPhase phase, Action<float> progressCallback)
        {
            for (int i = 0; i < phase.bundles.Length; i++)
            {
                string bundleName = phase.bundles[i];
                await LoadBundleAsync(bundleName);
                _loadedBundles++;

                float progress = (float)_loadedBundles / _totalBundles;
                progressCallback?.Invoke(progress);
                OnGlobalProgress?.Invoke(progress);
            }
        }

        private async Task LoadPhaseParallelAsync(LoadingPhase phase, Action<float> progressCallback)
        {
            var tasks = new List<Task>();

            foreach (string bundleName in phase.bundles)
            {
                // 동시 로딩 수 제한
                while (_activeLoads >= _maxConcurrentLoads)
                {
                    await Task.Delay(50);
                }

                tasks.Add(LoadBundleWithThrottleAsync(bundleName, progressCallback));
            }

            await Task.WhenAll(tasks);
        }

        private async Task LoadBundleWithThrottleAsync(string bundleName, Action<float> progressCallback)
        {
            _activeLoads++;

            try
            {
                await LoadBundleAsync(bundleName);
                _loadedBundles++;

                float progress = (float)_loadedBundles / _totalBundles;
                progressCallback?.Invoke(progress);
                OnGlobalProgress?.Invoke(progress);
            }
            finally
            {
                _activeLoads--;

                // 백그라운드 로딩 시 프레임 양보
                if (_currentPhase > 0)
                {
                    await Task.Delay((int)(_backgroundLoadDelay * 1000));
                }
            }
        }

        #endregion

        #region Bundle Loading

        private async Task LoadBundleAsync(string bundleName)
        {
            if (_cache.ContainsKey(bundleName))
            {
                Log($"캐시 히트: {bundleName}");
                TouchLRU(bundleName);
                return;
            }

            Log($"번들 로딩 시작: {bundleName}");

            try
            {
                var label = bundleName;
                var op = Addressables.LoadAssetsAsync<UnityEngine.Object>(
                    label,
                    obj =>
                    {
                        // 개별 에셋 로드 콜백
                        Log($"  에셋 로드: {obj.name} ({obj.GetType().Name})");
                    }
                );

                await op.Task;

                if (op.Status == AsyncOperationStatus.Succeeded)
                {
                    var results = op.Result;
                    long estimatedSize = EstimateBundleSize(bundleName);

                    // 메모리 예산 초과 시 LRU 해제
                    EnsureMemoryBudget(estimatedSize);

                    // 캐시 등록
                    var cached = new CachedAsset
                    {
                        BundleName = bundleName,
                        Assets = results.ToList(),
                        Handle = op,
                        Size_bytes = estimatedSize,
                        LoadTime = Time.realtimeSinceStartup,
                        LastAccessTime = Time.realtimeSinceStartup
                    };

                    _cache[bundleName] = cached;
                    _lruOrder.AddFirst(bundleName);
                    _currentCacheSize_bytes += estimatedSize;

                    OnBundleLoaded?.Invoke(bundleName);
                    Log($"번들 로드 완료: {bundleName} ({results.Count} 에셋, ~{estimatedSize / 1024}KB)");
                }
                else
                {
                    string error = op.OperationException?.Message ?? "Unknown error";
                    OnLoadError?.Invoke(bundleName, error);
                    Debug.LogWarning($"[AssetLoader] 번들 로드 실패: {bundleName} — {error}");
                    Addressables.Release(op);
                }
            }
            catch (Exception ex)
            {
                OnLoadError?.Invoke(bundleName, ex.Message);
                Debug.LogError($"[AssetLoader] 번들 로드 예외: {bundleName} — {ex.Message}");
            }
        }

        #endregion

        #region Asset Access

        /// <summary>캐시된 번들에서 에셋 가져오기</summary>
        public T GetAsset<T>(string bundleName, string assetName) where T : UnityEngine.Object
        {
            if (_cache.TryGetValue(bundleName, out var cached))
            {
                TouchLRU(bundleName);
                cached.LastAccessTime = Time.realtimeSinceStartup;

                var asset = cached.Assets.FirstOrDefault(a => a.name == assetName) as T;
                if (asset != null) return asset;

                Log($"에셋 미발견: {bundleName}/{assetName}");
            }
            else
            {
                Log($"번들 미로드: {bundleName}");
            }

            return null;
        }

        /// <summary>스프라이트 아틀라스에서 스프라이트 가져오기</summary>
        public Sprite GetSprite(string atlasName, string spriteName)
        {
            foreach (var cached in _cache.Values)
            {
                foreach (var asset in cached.Assets)
                {
                    if (asset is SpriteAtlas atlas && asset.name == atlasName)
                    {
                        TouchLRU(cached.BundleName);
                        return atlas.GetSprite(spriteName);
                    }
                }
            }
            return null;
        }

        /// <summary>온디맨드 에셋 로드 (캐시 미스 시)</summary>
        public async Task<T> LoadAssetAsync<T>(string address) where T : UnityEngine.Object
        {
            // 캐시 확인
            foreach (var cached in _cache.Values)
            {
                var found = cached.Assets.FirstOrDefault(a => a.name == address) as T;
                if (found != null)
                {
                    TouchLRU(cached.BundleName);
                    return found;
                }
            }

            // 직접 로드
            var op = Addressables.LoadAssetAsync<T>(address);
            await op.Task;

            if (op.Status == AsyncOperationStatus.Succeeded)
            {
                return op.Result;
            }

            Debug.LogWarning($"[AssetLoader] 에셋 로드 실패: {address}");
            return null;
        }

        /// <summary>번들이 로드되었는지 확인</summary>
        public bool IsBundleLoaded(string bundleName) => _cache.ContainsKey(bundleName);

        /// <summary>현재 로딩 진행률 (0~1)</summary>
        public float GetProgress() => _totalBundles > 0 ? (float)_loadedBundles / _totalBundles : 0f;

        #endregion

        #region LRU Cache Management

        private void TouchLRU(string key)
        {
            _lruOrder.Remove(key);
            _lruOrder.AddFirst(key);
        }

        private void EnsureMemoryBudget(long requiredBytes)
        {
            long maxBytes = (long)_maxCacheSize_MB * 1024 * 1024;

            while (_currentCacheSize_bytes + requiredBytes > maxBytes && _lruOrder.Count > 0)
            {
                // LRU — 가장 오래 안 쓴 번들 해제
                string lruKey = _lruOrder.Last.Value;

                // critical 번들은 해제하지 않음
                if (_cache.TryGetValue(lruKey, out var cached))
                {
                    var bundleInfo = GetBundleInfo(lruKey);
                    if (bundleInfo != null && bundleInfo.priority == "critical")
                    {
                        // critical 건너뛰기 — LRU 순서만 조정
                        _lruOrder.RemoveLast();
                        _lruOrder.AddFirst(lruKey);
                        continue;
                    }

                    EvictBundle(lruKey);
                    Log($"LRU 해제: {lruKey} (~{cached.Size_bytes / 1024}KB)");
                }
                else
                {
                    _lruOrder.RemoveLast();
                }
            }
        }

        private void EvictBundle(string bundleName)
        {
            if (_cache.TryGetValue(bundleName, out var cached))
            {
                _currentCacheSize_bytes -= cached.Size_bytes;
                Addressables.Release(cached.Handle);
                _cache.Remove(bundleName);
                _lruOrder.Remove(bundleName);
            }
        }

        /// <summary>특정 카테고리 전체 해제</summary>
        public void UnloadCategory(string category)
        {
            var toRemove = _cache.Keys
                .Where(k => GetBundleInfo(k)?.category == category)
                .ToList();

            foreach (var key in toRemove)
            {
                EvictBundle(key);
            }

            Log($"카테고리 해제: {category} ({toRemove.Count} 번들)");
        }

        /// <summary>모든 캐시 해제</summary>
        public void UnloadAll()
        {
            foreach (var key in _cache.Keys.ToList())
            {
                EvictBundle(key);
            }
            _lruOrder.Clear();
            _currentCacheSize_bytes = 0;
            Log("전체 캐시 해제");
        }

        #endregion

        #region Helpers

        private BundleInfo GetBundleInfo(string bundleName)
        {
            if (_manifest?.bundles == null) return null;
            return _manifest.bundles.FirstOrDefault(b => b.name == bundleName);
        }

        private long EstimateBundleSize(string bundleName)
        {
            var info = GetBundleInfo(bundleName);
            if (info != null)
                return info.estimatedSize_kb * 1024L;
            return 512 * 1024L; // 기본 512KB
        }

        private void Log(string msg)
        {
            if (_enableDebugLog)
                Debug.Log($"[AssetLoader] {msg}");
        }

        #endregion

        #region Debug / Stats

        /// <summary>캐시 통계 반환</summary>
        public CacheStats GetCacheStats()
        {
            return new CacheStats
            {
                CachedBundles = _cache.Count,
                TotalBundles = _totalBundles,
                CacheSize_MB = _currentCacheSize_bytes / (1024f * 1024f),
                MaxCache_MB = _maxCacheSize_MB,
                LoadProgress = GetProgress(),
                CurrentPhase = _currentPhase,
                ActiveLoads = _activeLoads
            };
        }

        [Serializable]
        public struct CacheStats
        {
            public int CachedBundles;
            public int TotalBundles;
            public float CacheSize_MB;
            public int MaxCache_MB;
            public float LoadProgress;
            public int CurrentPhase;
            public int ActiveLoads;

            public override string ToString() =>
                $"Cache: {CachedBundles}/{TotalBundles} bundles, " +
                $"{CacheSize_MB:F1}/{MaxCache_MB}MB, " +
                $"Progress: {LoadProgress:P0}, Phase: {CurrentPhase}";
        }

        #endregion

        #region Cleanup

        private void OnDestroy()
        {
            UnloadAll();
        }

        #endregion
    }

    #region Manifest Data Classes

    [Serializable]
    public class AssetManifest
    {
        public string version;
        public string generated;
        public string project;
        public string platform;
        public int totalAssets;
        public MemoryBudget memoryBudget;
        public BundleInfo[] bundles;
        public LoadingStrategy loadingStrategy;
    }

    [Serializable]
    public class MemoryBudget
    {
        public int total_mb;
        public int characters_mb;
        public int monsters_mb;
        public int environment_mb;
        public int ui_mb;
        public int vfx_mb;
        public int cosmetics_mb;
        public int audio_mb;
    }

    [Serializable]
    public class BundleInfo
    {
        public string name;
        public string category;
        public string priority;
        public int loadOrder;
        public int estimatedSize_kb;
        public int memoryBudget_mb;
        public string description;
        public int assetCount;
    }

    [Serializable]
    public class LoadingStrategy
    {
        public string description;
        public LoadingPhase[] phases;
    }

    [Serializable]
    public class LoadingPhase
    {
        public int phase;
        public string name;
        public string description;
        public string[] bundles;
        public float estimatedTime_sec;
        public bool showLoadingScreen;
    }

    /// <summary>캐시된 에셋 정보 (내부용)</summary>
    internal class CachedAsset
    {
        public string BundleName;
        public List<UnityEngine.Object> Assets;
        public AsyncOperationHandle Handle;
        public long Size_bytes;
        public float LoadTime;
        public float LastAccessTime;
    }

    #endregion
}
