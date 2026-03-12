using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Networking;

namespace EternaChronicle.Core
{
    /// <summary>
    /// 에셋 번들 매니저 — WebGL 환경 에셋 스트리밍 + 캐싱
    /// Addressables 보조 레이어: 수동 번들 관리가 필요한 경우 사용
    /// </summary>
    public class AssetBundleManager : MonoBehaviour
    {
        public static AssetBundleManager Instance { get; private set; }

        [Header("CDN")]
        [SerializeField] private string cdnBaseUrl = "https://cdn.eterna-chronicle.com/bundles/webgl/";
        [SerializeField] private int maxConcurrentDownloads = 3;
        [SerializeField] private int maxCachedBundles = 20;

        public event Action<string, float> OnBundleProgress;
        public event Action<string> OnBundleLoaded;
        public event Action<string, string> OnBundleError;

        private readonly Dictionary<string, AssetBundle> _loadedBundles = new();
        private readonly Dictionary<string, BundleManifestEntry> _manifest = new();
        private readonly Queue<string> _downloadQueue = new();
        private readonly HashSet<string> _downloading = new();
        private readonly LinkedList<string> _lruOrder = new(); // LRU 캐시 순서

        private void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }

        /// <summary>매니페스트 로드 (게임 시작 시 1회)</summary>
        public void LoadManifest(Action onComplete = null)
        {
            StartCoroutine(LoadManifestCoroutine(onComplete));
        }

        private IEnumerator LoadManifestCoroutine(Action onComplete)
        {
            var url = $"{cdnBaseUrl}manifest.json";
            var req = UnityWebRequest.Get(url);
            yield return req.SendWebRequest();

            if (req.result == UnityWebRequest.Result.Success)
            {
                var entries = JsonUtility.FromJson<BundleManifest>(req.downloadHandler.text);
                _manifest.Clear();
                foreach (var entry in entries.bundles)
                    _manifest[entry.name] = entry;

                Debug.Log($"[Bundle] Manifest loaded: {_manifest.Count} bundles");
            }
            else
            {
                Debug.LogError($"[Bundle] Manifest load failed: {req.error}");
            }

            req.Dispose();
            onComplete?.Invoke();
        }

        /// <summary>번들 로드 (캐시 우선)</summary>
        public void LoadBundle(string bundleName, Action<AssetBundle> onLoaded = null)
        {
            // 이미 로드됨
            if (_loadedBundles.TryGetValue(bundleName, out var existing))
            {
                TouchLRU(bundleName);
                onLoaded?.Invoke(existing);
                return;
            }

            // 다운로드 큐에 추가
            _downloadQueue.Enqueue(bundleName);
            StartCoroutine(ProcessQueue(bundleName, onLoaded));
        }

        /// <summary>번들에서 에셋 로드</summary>
        public T LoadAsset<T>(string bundleName, string assetName) where T : UnityEngine.Object
        {
            if (!_loadedBundles.TryGetValue(bundleName, out var bundle))
            {
                Debug.LogWarning($"[Bundle] Bundle not loaded: {bundleName}");
                return null;
            }

            TouchLRU(bundleName);
            return bundle.LoadAsset<T>(assetName);
        }

        /// <summary>번들에서 에셋 비동기 로드</summary>
        public void LoadAssetAsync<T>(string bundleName, string assetName, Action<T> onLoaded) where T : UnityEngine.Object
        {
            if (!_loadedBundles.TryGetValue(bundleName, out var bundle))
            {
                // 번들 로드 후 에셋 로드
                LoadBundle(bundleName, loadedBundle =>
                {
                    if (loadedBundle != null)
                        StartCoroutine(LoadAssetAsyncCoroutine(loadedBundle, assetName, onLoaded));
                });
                return;
            }

            TouchLRU(bundleName);
            StartCoroutine(LoadAssetAsyncCoroutine(bundle, assetName, onLoaded));
        }

        private IEnumerator LoadAssetAsyncCoroutine<T>(AssetBundle bundle, string assetName, Action<T> onLoaded) where T : UnityEngine.Object
        {
            var request = bundle.LoadAssetAsync<T>(assetName);
            yield return request;
            onLoaded?.Invoke(request.asset as T);
        }

        /// <summary>번들 언로드</summary>
        public void UnloadBundle(string bundleName, bool unloadAllLoadedObjects = false)
        {
            if (_loadedBundles.TryGetValue(bundleName, out var bundle))
            {
                bundle.Unload(unloadAllLoadedObjects);
                _loadedBundles.Remove(bundleName);
                _lruOrder.Remove(bundleName);
                Debug.Log($"[Bundle] Unloaded: {bundleName}");
            }
        }

        /// <summary>모든 번들 언로드</summary>
        public void UnloadAll()
        {
            foreach (var kvp in _loadedBundles)
                kvp.Value.Unload(true);
            _loadedBundles.Clear();
            _lruOrder.Clear();
        }

        private IEnumerator ProcessQueue(string targetBundle, Action<AssetBundle> onLoaded)
        {
            // 동시 다운로드 제한
            while (_downloading.Count >= maxConcurrentDownloads)
                yield return null;

            if (!_downloadQueue.Contains(targetBundle))
                yield break;

            // 큐에서 제거하고 다운로드 시작
            _downloading.Add(targetBundle);

            if (!_manifest.TryGetValue(targetBundle, out var entry))
            {
                Debug.LogWarning($"[Bundle] Not in manifest: {targetBundle}");
                _downloading.Remove(targetBundle);
                OnBundleError?.Invoke(targetBundle, "Not in manifest");
                yield break;
            }

            var url = $"{cdnBaseUrl}{entry.path}";
            var hash = Hash128.Parse(entry.hash);

            var req = UnityWebRequestAssetBundle.GetAssetBundle(url, hash);
            var op = req.SendWebRequest();

            while (!op.isDone)
            {
                OnBundleProgress?.Invoke(targetBundle, req.downloadProgress);
                yield return null;
            }

            if (req.result == UnityWebRequest.Result.Success)
            {
                var bundle = DownloadHandlerAssetBundle.GetContent(req);
                _loadedBundles[targetBundle] = bundle;
                TouchLRU(targetBundle);
                EnforceCacheLimit();

                OnBundleLoaded?.Invoke(targetBundle);
                onLoaded?.Invoke(bundle);
                Debug.Log($"[Bundle] Loaded: {targetBundle} ({entry.sizeMB:F1}MB)");
            }
            else
            {
                OnBundleError?.Invoke(targetBundle, req.error);
                Debug.LogWarning($"[Bundle] Download failed: {targetBundle} — {req.error}");
                onLoaded?.Invoke(null);
            }

            _downloading.Remove(targetBundle);
            req.Dispose();
        }

        /// <summary>LRU 캐시 관리</summary>
        private void TouchLRU(string bundleName)
        {
            _lruOrder.Remove(bundleName);
            _lruOrder.AddLast(bundleName);
        }

        private void EnforceCacheLimit()
        {
            while (_loadedBundles.Count > maxCachedBundles && _lruOrder.Count > 0)
            {
                var oldest = _lruOrder.First.Value;
                _lruOrder.RemoveFirst();
                UnloadBundle(oldest, true);
                Debug.Log($"[Bundle] LRU evicted: {oldest}");
            }
        }

        /// <summary>캐시 상태</summary>
        public int LoadedBundleCount => _loadedBundles.Count;
        public int QueuedDownloads => _downloadQueue.Count;
        public int ActiveDownloads => _downloading.Count;
    }

    [Serializable]
    public class BundleManifest
    {
        public BundleManifestEntry[] bundles;
    }

    [Serializable]
    public class BundleManifestEntry
    {
        public string name;
        public string path;
        public string hash;
        public float sizeMB;
        public string[] dependencies;
    }
}
