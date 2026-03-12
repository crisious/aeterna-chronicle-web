using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Tilemaps;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using EternaChronicle.Network;

namespace EternaChronicle.World
{
    /// <summary>
    /// Tilemap 로더 — 서버에서 맵 데이터를 받아 Unity Tilemap으로 렌더링
    /// 6지역 + 안개해 맵 지원. 청크 기반 동적 로딩.
    /// </summary>
    public class TilemapLoader : MonoBehaviour
    {
        public static TilemapLoader Instance { get; private set; }

        [Header("Tilemaps")]
        [SerializeField] private Tilemap groundTilemap;
        [SerializeField] private Tilemap collisionTilemap;
        [SerializeField] private Tilemap decorationTilemap;
        [SerializeField] private Tilemap fogOfWarTilemap;

        [Header("Tile Assets")]
        [SerializeField] private TileBase[] groundTiles;     // 인덱스로 참조
        [SerializeField] private TileBase[] collisionTiles;
        [SerializeField] private TileBase[] decorationTiles;
        [SerializeField] private TileBase fogTile;

        [Header("Chunk Settings")]
        [SerializeField] private int chunkSize = 16;
        [SerializeField] private int loadRadius = 2; // 현재 청크 기준 반경

        private readonly Dictionary<Vector2Int, ChunkData> _loadedChunks = new();
        private readonly HashSet<Vector2Int> _loadingChunks = new();
        private Vector2Int _lastPlayerChunk = new(int.MinValue, int.MinValue);
        private string _currentZoneId;

        private void Awake()
        {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this;
        }

        /// <summary>존 진입 시 호출</summary>
        public void LoadZone(string zoneId)
        {
            if (_currentZoneId == zoneId) return;

            _currentZoneId = zoneId;
            ClearAllChunks();
            _lastPlayerChunk = new Vector2Int(int.MinValue, int.MinValue);
            Debug.Log($"[Tilemap] Zone changed: {zoneId}");
        }

        /// <summary>플레이어 위치 기반 청크 갱신 (매 프레임 or 이동 시)</summary>
        public void UpdatePlayerPosition(Vector3 worldPos)
        {
            var currentChunk = WorldToChunk(worldPos);
            if (currentChunk == _lastPlayerChunk) return;

            _lastPlayerChunk = currentChunk;
            LoadSurroundingChunks(currentChunk);
            UnloadDistantChunks(currentChunk);
        }

        private Vector2Int WorldToChunk(Vector3 worldPos)
        {
            return new Vector2Int(
                Mathf.FloorToInt(worldPos.x / chunkSize),
                Mathf.FloorToInt(worldPos.y / chunkSize));
        }

        private void LoadSurroundingChunks(Vector2Int center)
        {
            for (int dx = -loadRadius; dx <= loadRadius; dx++)
            {
                for (int dy = -loadRadius; dy <= loadRadius; dy++)
                {
                    var chunkCoord = new Vector2Int(center.x + dx, center.y + dy);
                    if (_loadedChunks.ContainsKey(chunkCoord) || _loadingChunks.Contains(chunkCoord))
                        continue;

                    RequestChunk(chunkCoord);
                }
            }
        }

        private void UnloadDistantChunks(Vector2Int center)
        {
            var toRemove = new List<Vector2Int>();
            foreach (var coord in _loadedChunks.Keys)
            {
                if (Mathf.Abs(coord.x - center.x) > loadRadius + 1 ||
                    Mathf.Abs(coord.y - center.y) > loadRadius + 1)
                {
                    toRemove.Add(coord);
                }
            }

            foreach (var coord in toRemove)
            {
                ClearChunkTiles(coord);
                _loadedChunks.Remove(coord);
            }
        }

        private void RequestChunk(Vector2Int coord)
        {
            _loadingChunks.Add(coord);
            var endpoint = $"/world/chunk?zone={_currentZoneId}&cx={coord.x}&cy={coord.y}";

            RestApiClient.Instance.Get<ChunkData>(endpoint,
                data =>
                {
                    _loadingChunks.Remove(coord);
                    _loadedChunks[coord] = data;
                    RenderChunk(coord, data);
                },
                error =>
                {
                    _loadingChunks.Remove(coord);
                    Debug.LogWarning($"[Tilemap] Chunk load failed: {coord} — {error.message}");
                });
        }

        private void RenderChunk(Vector2Int chunkCoord, ChunkData data)
        {
            var origin = new Vector3Int(chunkCoord.x * chunkSize, chunkCoord.y * chunkSize, 0);

            for (int y = 0; y < chunkSize; y++)
            {
                for (int x = 0; x < chunkSize; x++)
                {
                    var idx = y * chunkSize + x;
                    var pos = new Vector3Int(origin.x + x, origin.y + y, 0);

                    // Ground
                    if (data.ground != null && idx < data.ground.Length && data.ground[idx] >= 0)
                    {
                        var tileIdx = data.ground[idx];
                        if (tileIdx < groundTiles.Length)
                            groundTilemap.SetTile(pos, groundTiles[tileIdx]);
                    }

                    // Collision
                    if (data.collision != null && idx < data.collision.Length && data.collision[idx] >= 0)
                    {
                        var tileIdx = data.collision[idx];
                        if (tileIdx < collisionTiles.Length)
                            collisionTilemap.SetTile(pos, collisionTiles[tileIdx]);
                    }

                    // Decoration
                    if (data.decoration != null && idx < data.decoration.Length && data.decoration[idx] >= 0)
                    {
                        var tileIdx = data.decoration[idx];
                        if (tileIdx < decorationTiles.Length)
                            decorationTilemap.SetTile(pos, decorationTiles[tileIdx]);
                    }

                    // Fog of War (미탐험 영역)
                    if (data.explored != null && idx < data.explored.Length && !data.explored[idx])
                    {
                        fogOfWarTilemap.SetTile(pos, fogTile);
                    }
                }
            }
        }

        private void ClearChunkTiles(Vector2Int chunkCoord)
        {
            var origin = new Vector3Int(chunkCoord.x * chunkSize, chunkCoord.y * chunkSize, 0);
            for (int y = 0; y < chunkSize; y++)
            {
                for (int x = 0; x < chunkSize; x++)
                {
                    var pos = new Vector3Int(origin.x + x, origin.y + y, 0);
                    groundTilemap.SetTile(pos, null);
                    collisionTilemap.SetTile(pos, null);
                    decorationTilemap.SetTile(pos, null);
                    fogOfWarTilemap.SetTile(pos, null);
                }
            }
        }

        private void ClearAllChunks()
        {
            groundTilemap.ClearAllTiles();
            collisionTilemap.ClearAllTiles();
            decorationTilemap.ClearAllTiles();
            fogOfWarTilemap.ClearAllTiles();
            _loadedChunks.Clear();
            _loadingChunks.Clear();
        }
    }

    [Serializable]
    public class ChunkData
    {
        public int[] ground;       // chunkSize*chunkSize 타일 인덱스
        public int[] collision;
        public int[] decoration;
        public bool[] explored;    // 전장의 안개
    }
}
