# 에셋 최적화 가이드 — WebGL 퍼포먼스 튜닝

> 문서 ID: P16-15 | 버전: v1.0 | 작성일: 2026-03-13  
> 대상: Unity 2022.3 LTS + WebGL | 메모리 상한: 256MB VRAM

---

## 1. WebGL 텍스처 압축

### 1.1 포맷 비교

| 포맷 | 압축률 | 품질 | 디코딩 속도 | WebGL 지원 | 권장 용도 |
|------|--------|------|-------------|-----------|-----------|
| ASTC 4×4 | 8:1 | ★★★★★ | 빠름 | WebGL2 (대부분) | VFX, 캐릭터 (고품질) |
| ASTC 6×6 | 12:1 | ★★★★☆ | 빠름 | WebGL2 | 배경, 타일셋 (기본) |
| ASTC 8×8 | 16:1 | ★★★☆☆ | 빠름 | WebGL2 | UI 프레임 (허용) |
| ETC2 RGB | 6:1 | ★★★★☆ | 빠름 | WebGL2 | 폴백 (ASTC 미지원) |
| ETC2 RGBA | 4:1 | ★★★☆☆ | 빠름 | WebGL2 | 알파 포함 폴백 |
| RGBA 32 | 1:1 | ★★★★★ | 즉시 | 전체 | 개발 전용 (무압축) |

### 1.2 에셋 타입별 압축 전략

| 에셋 카테고리 | 추천 포맷 | Max Size | 예상 VRAM | 비고 |
|---------------|-----------|----------|-----------|------|
| 캐릭터 스프라이트 | ASTC 4×4 | 512 | 0.17 MB/장 | 고품질 필수 |
| 몬스터 Normal | ASTC 6×6 | 256 | 0.04 MB/장 | 대량이므로 압축 우선 |
| 몬스터 Elite | ASTC 4×4 | 512 | 0.17 MB/장 | |
| 몬스터 Boss | ASTC 4×4 | 1024 | 0.67 MB/장 | |
| 몬스터 Raid | ASTC 4×4 | 2048 | 2.67 MB/장 | 최대 2장 동시 |
| NPC 초상화 | ASTC 6×6 | 256 | 0.04 MB/장 | |
| NPC 스프라이트 | ASTC 6×6 | 256 | 0.04 MB/장 | |
| 타일셋 | ASTC 6×6 | 512 | 0.17 MB/세트 | 9-patch 세트 |
| 배경 레이어 | ASTC 6×6 | 4096 | 10.67 MB/장 | 레이어 분리로 경감 |
| 아이콘 (64×64) | ASTC 4×4 | 64 | 0.003 MB/장 | 아틀라스화 권장 |
| UI 프레임 | ASTC 8×8 | 512 | 0.11 MB/장 | 9-slice |
| VFX 시트 | ASTC 4×4 | 512 | 0.17 MB/시트 | 프레임 품질 중요 |
| 코스메틱 | ASTC 4×4 | 512 | 0.17 MB/장 | 씬 당 일부만 로딩 |

### 1.3 압축 적용 스크립트

```csharp
// Editor/TextureCompressor.cs
using UnityEditor;
using UnityEngine;

public class TextureCompressor : AssetPostprocessor
{
    void OnPreprocessTexture()
    {
        TextureImporter importer = (TextureImporter)assetImporter;
        
        // WebGL 플랫폼 설정
        var webglSettings = new TextureImporterPlatformSettings
        {
            name = "WebGL",
            overridden = true,
            maxTextureSize = GetMaxSize(assetPath),
            format = GetFormat(assetPath),
            compressionQuality = 50
        };
        
        importer.SetPlatformTextureSettings(webglSettings);
    }
    
    static int GetMaxSize(string path)
    {
        if (path.Contains("Icons/")) return 64;
        if (path.Contains("Monsters/Normal/")) return 256;
        if (path.Contains("Monsters/Raid/")) return 2048;
        if (path.Contains("Backgrounds/")) return 4096;
        return 512; // 기본값
    }
    
    static TextureImporterFormat GetFormat(string path)
    {
        if (path.Contains("Icons/") || path.Contains("VFX/") || 
            path.Contains("Characters/"))
            return TextureImporterFormat.ASTC_4x4;
        if (path.Contains("Frames/"))
            return TextureImporterFormat.ASTC_8x8;
        return TextureImporterFormat.ASTC_6x6; // 기본
    }
}
```

---

## 2. 아틀라스 최적화

### 2.1 아틀라스 분류 및 크기

| 아틀라스 이름 | 포함 에셋 | 최대 크기 | Padding | Trim | 예상 효율 |
|---------------|-----------|-----------|---------|------|-----------|
| `Atlas_Icons_Items` | 아이템 아이콘 100종 | 1024×1024 | 2px | Yes | 92% |
| `Atlas_Icons_Skills` | 스킬 아이콘 150종 | 2048×1024 | 2px | Yes | 90% |
| `Atlas_Icons_Status` | 상태 아이콘 25종 | 512×512 | 2px | Yes | 88% |
| `Atlas_UI_Default` | 기본 테마 UI 프레임 | 2048×2048 | 4px | No | 85% |
| `Atlas_UI_Dark` | 다크 테마 UI 프레임 | 2048×2048 | 4px | No | 85% |
| `Atlas_UI_Season` | 시즌 테마 UI 프레임 | 2048×2048 | 4px | No | 85% |
| `Atlas_VFX_Common` | 공통 이펙트 30종 | 2048×2048 | 2px | Yes | 80% |
| `Atlas_Monster_{Rank}` | 등급별 몬스터 | 4096×4096 | 2px | Yes | 75% |
| `Atlas_Char_{Class}` | 클래스별 캐릭터 | 2048×2048 | 2px | Yes | 82% |

### 2.2 빈 공간 최소화 전략

```
1. 정렬 알고리즘: MaxRects (Best Short Side Fit)
   - 작은 에셋부터 큰 에셋 순으로 배치
   - 회전 허용 (Rotation: Enabled)

2. Padding 규칙:
   - 아이콘/UI: 2px (미핑 블리드 방지)
   - 타일셋: 0px (심리스 필수)
   - VFX: 2px (블렌딩 영역)

3. POT (Power of Two) 강제:
   - WebGL은 NPOT 텍스처 제한
   - 모든 아틀라스 POT 크기 (512/1024/2048/4096)

4. 미사용 영역 < 15% 목표:
   - 15% 초과 시 아틀라스 분할 검토
   - 자주 함께 로딩되는 에셋끼리 그룹핑
```

### 2.3 Unity Sprite Atlas 설정

```csharp
// Sprite Atlas 생성 (에디터)
// Assets → Create → 2D → Sprite Atlas

// Atlas 설정
Type: Master
Include in Build: true
Allow Rotation: true
Tight Packing: true
Padding: 2

// 플랫폼 오버라이드 (WebGL)
Max Texture Size: 4096
Format: ASTC 6x6
Compression Quality: Normal
```

---

## 3. 메모리 예산 (씬별 VRAM 한도)

### 3.1 전체 예산 배분

```
총 WebGL VRAM 예산: 256 MB
├── 시스템 예약: 32 MB (12.5%)
├── 상시 로딩 (UI/HUD): 24 MB (9.4%)
├── 씬 가변 예산: 160 MB (62.5%)
└── 버퍼/여유: 40 MB (15.6%)
```

### 3.2 씬 유형별 예산

| 씬 유형 | VRAM 한도 | 상세 배분 |
|---------|-----------|-----------|
| **필드 탐색** | 120 MB | 배경 45MB + 타일 25MB + 캐릭터 10MB + NPC 15MB + 오브젝트 25MB |
| **일반 전투** | 100 MB | 배경 30MB + 캐릭터 15MB + 몬스터 25MB + VFX 20MB + UI 10MB |
| **보스 전투** | 140 MB | 배경 30MB + 캐릭터 15MB + 보스 40MB + VFX 35MB + UI 20MB |
| **레이드** | 160 MB | 배경 30MB + 캐릭터 30MB(4인) + 보스 50MB + VFX 30MB + UI 20MB |
| **마을/상점** | 80 MB | 배경 25MB + NPC 20MB + UI 30MB + 아이콘 5MB |
| **인벤토리** | 50 MB | UI 프레임 15MB + 아이콘 아틀라스 25MB + 장비 미리보기 10MB |
| **메인 메뉴** | 40 MB | 배경 20MB + UI 15MB + 로고 5MB |

### 3.3 메모리 예산 모니터링

```csharp
// Runtime 메모리 모니터
public class VRAMBudgetMonitor : MonoBehaviour
{
    [SerializeField] private float warningThresholdMB = 200f;
    [SerializeField] private float criticalThresholdMB = 240f;
    
    void Update()
    {
        float usedMB = Profiler.GetAllocatedMemoryForGraphicsDriver() / (1024f * 1024f);
        
        if (usedMB > criticalThresholdMB)
        {
            Debug.LogError($"[VRAM] CRITICAL: {usedMB:F1}MB / 256MB");
            ForceUnloadLowPriority();
        }
        else if (usedMB > warningThresholdMB)
        {
            Debug.LogWarning($"[VRAM] WARNING: {usedMB:F1}MB / 256MB");
        }
    }
    
    void ForceUnloadLowPriority()
    {
        // P3 우선순위 에셋부터 언로드
        AssetLoader.Instance.UnloadByPriority(3);
        Resources.UnloadUnusedAssets();
        System.GC.Collect();
    }
}
```

---

## 4. LOD 전략 (거리별 해상도 전환)

### 4.1 2D LOD 규격

| LOD 레벨 | 적용 조건 | 해상도 배율 | 용도 |
|----------|-----------|-------------|------|
| LOD0 (High) | 화면 점유 > 20% | 100% (원본) | 보스, 클로즈업 |
| LOD1 (Medium) | 화면 점유 5~20% | 50% | 필드 일반 표시 |
| LOD2 (Low) | 화면 점유 < 5% | 25% | 멀리 있는 NPC/몬스터 |
| LOD3 (Silhouette) | 화면 가장자리 | 실루엣만 | 미니맵 표시용 |

### 4.2 LOD 전환 구현

```csharp
public class SpriteLOD : MonoBehaviour
{
    [SerializeField] private Sprite[] lodSprites;  // LOD0~3
    private SpriteRenderer sr;
    private Camera mainCam;
    
    void Start()
    {
        sr = GetComponent<SpriteRenderer>();
        mainCam = Camera.main;
    }
    
    void LateUpdate()
    {
        float screenRatio = CalculateScreenRatio();
        int lodLevel = screenRatio > 0.2f ? 0 :
                       screenRatio > 0.05f ? 1 :
                       screenRatio > 0.01f ? 2 : 3;
        
        if (lodLevel < lodSprites.Length && lodSprites[lodLevel] != null)
            sr.sprite = lodSprites[lodLevel];
    }
    
    float CalculateScreenRatio()
    {
        Bounds bounds = sr.bounds;
        Vector3 min = mainCam.WorldToViewportPoint(bounds.min);
        Vector3 max = mainCam.WorldToViewportPoint(bounds.max);
        return Mathf.Abs((max.x - min.x) * (max.y - min.y));
    }
}
```

### 4.3 LOD 에셋 생성 파이프라인

```
원본(LOD0) → Downscale 50%(LOD1) → Downscale 25%(LOD2) → Silhouette(LOD3)

자동화:
1. CI/CD에서 원본 이미지 검출
2. ImageMagick으로 리사이즈: convert input.png -resize 50% lod1.png
3. 실루엣 생성: convert input.png -alpha extract -threshold 50% lod3.png
4. 아틀라스 재패킹
```

---

## 5. 프로파일링 가이드

### 5.1 Unity Profiler 설정

```
1. 프로파일러 활성화:
   Window → Analysis → Profiler

2. WebGL 프로파일링:
   Build Settings → Development Build ✓
   Build Settings → Autoconnect Profiler ✓
   
3. 측정 항목:
   - GPU: Rendering Time (목표: < 16ms @60fps)
   - Memory: Total Used (목표: < 256MB)
   - Loading: Asset Load Time (목표: < 3초/씬)
```

### 5.2 핵심 성능 지표 (KPI)

| 지표 | 목표값 | 경고값 | 위험값 |
|------|--------|--------|--------|
| FPS | ≥ 60 | < 45 | < 30 |
| 프레임 시간 | ≤ 16ms | > 22ms | > 33ms |
| Draw Calls | ≤ 100 | > 150 | > 200 |
| VRAM 사용 | ≤ 200MB | > 220MB | > 240MB |
| 씬 전환 시간 | ≤ 2초 | > 4초 | > 8초 |
| 초기 로딩 | ≤ 5초 | > 10초 | > 20초 |
| GC 간격 | ≥ 30초 | < 10초 | < 3초 |
| 에셋 캐시 히트율 | ≥ 80% | < 60% | < 40% |

### 5.3 Draw Call 최적화 체크리스트

```
□ 동일 머터리얼 배칭 활성화 (Dynamic Batching)
□ SpriteRenderer.sortingOrder 기반 배칭 그룹화
□ Sprite Atlas 사용으로 배칭 극대화
□ UI Canvas 분리 (Static UI / Dynamic UI)
□ 카메라 Culling — 화면 밖 오브젝트 비활성화
□ 파티클 시스템 풀링 (생성/삭제 반복 방지)
```

### 5.4 프로파일링 워크플로우

```
1. 기준 측정 (Baseline)
   → 빈 씬에서 기본 메트릭 수집

2. 에셋 추가 측정
   → 카테고리별 순차 추가, 각 단계 메트릭 기록

3. 스트레스 테스트
   → 최악 케이스: 레이드 보스 + 4인 파티 + 최대 VFX

4. 회귀 테스트
   → CI/CD에서 빌드마다 자동 성능 테스트 실행

5. 보고서 생성
   → 빌드 번호 + 측정 일시 + KPI 테이블 + 변동 그래프
```

---

## 6. 최적화 체크리스트 (릴리스 전)

- [ ] 모든 텍스처 ASTC 압축 적용 확인
- [ ] NPOT 텍스처 0건
- [ ] 아틀라스 빈 공간 < 15%
- [ ] 씬별 VRAM ≤ 할당 예산
- [ ] Draw Calls ≤ 100 (일반 씬)
- [ ] 초기 로딩 ≤ 5초 (캐시 미스 기준)
- [ ] 씬 전환 ≤ 2초
- [ ] GC 스파이크 0건 (전투 중)
- [ ] LOD 전환 시 시각적 팝핑 없음
- [ ] IndexedDB 캐시 정상 동작 확인
- [ ] 메모리 누수 테스트 통과 (10분 연속 플레이)

---

> **참조**: `integration-guide.md` (에셋 임포트) | `atlas-spec.md` (아틀라스 설계)
