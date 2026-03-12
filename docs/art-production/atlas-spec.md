# 스프라이트 아틀라스 설계 (P16-12)

> 작성일: 2026-03-13 | 버전: v1.0
> 대상: Unity WebGL (Addressables + Sprite Atlas V2)

---

## 1. 전체 아틀라스 분류

| 아틀라스 그룹 | 최대 크기 | 장수 | 메모리(RGBA) | 비고 |
|---|---|---|---|---|
| **캐릭터 (클래스별)** | 2048×2048 | 6장 (클래스당 1) | 24MB | base+adv 스프라이트 통합 |
| **몬스터 (지역별)** | 4096×4096 | 9장 (지역당 1) | 144MB → 압축 후 36MB | ASTC 6×6 압축 |
| **환경 타일 (지역별)** | 2048×2048 | 9장 (지역당 1) | 36MB → 압축 후 9MB | ETC2 압축 |
| **환경 배경** | 4096×2048 | 9장 (지역당 1) | 72MB → 압축 후 18MB | ASTC 8×8 |
| **UI 아이콘** | 2048×2048 | 3장 (아이템/스킬/상태) | 12MB → 압축 후 3MB | ETC2 |
| **UI 프레임** | 2048×2048 | 3장 (테마당 1) | 12MB → 압축 후 3MB | 9-slice |
| **VFX 공통** | 2048×2048 | 1장 | 4MB → 압축 후 1MB | |
| **VFX 스킬 (클래스별)** | 4096×4096 | 6장 (클래스당 1) | 96MB → 압축 후 24MB | ASTC 6×6 |
| **코스메틱 (시즌별)** | 4096×4096 | 3장 (시즌당 1) | 48MB → 압축 후 12MB | ASTC 8×8 |
| **합계** | — | **49장** | — | 압축 후 총 ~130MB |

---

## 2. TexturePacker 규격

### 2.1 공통 설정

```json
{
  "algorithm": "MaxRects",
  "maxWidth": 4096,
  "maxHeight": 4096,
  "sizeConstraints": "POT",
  "forceSquared": false,
  "padding": 2,
  "extrude": 1,
  "allowRotation": false,
  "trimMode": "Trim",
  "trimThreshold": 1,
  "ditherType": "NearestNeighbour",
  "shapePadding": 0,
  "borderPadding": 0,
  "outputFormat": "png",
  "pngOptimizationLevel": 7,
  "textureFormat": "RGBA8888",
  "jpgQuality": 80,
  "scale": 1,
  "scaleMode": "Smooth",
  "premultiplyAlpha": false
}
```

### 2.2 카테고리별 커스텀 설정

| 카테고리 | maxWidth | maxHeight | padding | trimMode | allowRotation |
|---|---|---|---|---|---|
| 캐릭터 | 2048 | 2048 | 2 | Trim | false |
| 몬스터 | 4096 | 4096 | 2 | Trim | false |
| 타일셋 | 2048 | 2048 | 0 | None | false |
| 배경 | 4096 | 2048 | 0 | None | false |
| UI 아이콘 | 2048 | 2048 | 1 | Trim | true |
| UI 프레임 | 2048 | 2048 | 2 | None | false |
| VFX | 4096 | 4096 | 2 | Trim | false |
| 코스메틱 | 4096 | 4096 | 2 | Trim | false |

> **타일셋**: padding=0 + trim=None 필수 (타일 간 이음새 보장)
> **UI 아이콘**: 회전 허용으로 패킹 효율 ↑
> **VFX/캐릭터**: 회전 금지 (프레임 순서 보장)

---

## 3. 아틀라스 상세 설계

### 3.1 캐릭터 아틀라스 (6장)

파일명 패턴: `atlas_char_{class_name}.png`

| 아틀라스 | 내용 | 스프라이트 수 | 크기 |
|---|---|---|---|
| atlas_char_ether_knight | base(48f) + adv1(48f) + adv2(48f) + adv3(48f) | 192 | 2048×2048 |
| atlas_char_memory_weaver | 〃 | 192 | 2048×2048 |
| atlas_char_shadow_weaver | 〃 | 192 | 2048×2048 |
| atlas_char_memory_breaker | 〃 | 192 | 2048×2048 |
| atlas_char_time_guardian | 〃 | 192 | 2048×2048 |
| atlas_char_void_wanderer | 〃 | 192 | 2048×2048 |

각 캐릭터 스프라이트: 64×64px, 4방향 × 3동작(idle/walk/attack) × 4프레임 = 48프레임/등급

### 3.2 몬스터 아틀라스 (9장)

파일명 패턴: `atlas_monster_{region}.png`

| 아틀라스 | 몬스터 수 | 등급 구성 | 크기 |
|---|---|---|---|
| atlas_monster_erebos | 30 | 일반20+엘리트5+보스3+레이드2 | 4096×4096 |
| atlas_monster_silvanhame | 30 | 〃 | 4096×4096 |
| atlas_monster_solaris | 30 | 〃 | 4096×4096 |
| atlas_monster_northern_glacier | 30 | 〃 | 4096×4096 |
| atlas_monster_argentium | 30 | 〃 | 4096×4096 |
| atlas_monster_britalia | 30 | 〃 | 4096×4096 |
| atlas_monster_fog_sea | 30 | 〃 | 4096×4096 |
| atlas_monster_memory_abyss | 30 | 〃 | 4096×4096 |
| atlas_monster_temporal_rift | 30 | 〃 | 4096×4096 |

몬스터 크기: 일반 64×64, 엘리트 96×96, 보스 128×128, 레이드 256×256

### 3.3 환경 아틀라스

#### 타일셋 (9장)
파일명: `atlas_tiles_{region}.png` — 2048×2048

각 지역 9세트 × 47타일/세트 = 423 타일 (16×16px 또는 32×32px)

#### 배경 (9장)
파일명: `atlas_bg_{region}.png` — 4096×2048

각 지역 4레이어 × 3시간대 = 12 이미지 (개별 레이어 960×540px 기준)

### 3.4 UI 아틀라스

| 아틀라스 | 내용 | 스프라이트 수 | 크기 |
|---|---|---|---|
| atlas_ui_icons_items | 아이템 아이콘 100종 | 100 | 2048×2048 |
| atlas_ui_icons_skills | 스킬 아이콘 150종 | 150 | 2048×2048 |
| atlas_ui_icons_status | 상태이상+버프 25종 | 25 | 512×512 |
| atlas_ui_frames_default | 기본 테마 프레임 30종 | 30 | 2048×2048 |
| atlas_ui_frames_dark | 다크 테마 프레임 30종 | 30 | 2048×2048 |
| atlas_ui_frames_season | 시즌 테마 프레임 30종 | 30 | 2048×2048 |

### 3.5 VFX 아틀라스

| 아틀라스 | 내용 | 이펙트 수 | 크기 |
|---|---|---|---|
| atlas_vfx_common | 공통 이펙트 30종 (8f each) | 30 × 8 = 240 | 2048×2048 |
| atlas_vfx_ether_knight | 에테르나이트 VFX 30종 | 240 | 4096×4096 |
| atlas_vfx_memory_weaver | 기억술사 VFX 30종 | 240 | 4096×4096 |
| atlas_vfx_shadow_weaver | 그림자직공 VFX 30종 | 240 | 4096×4096 |
| atlas_vfx_memory_breaker | 기억파괴자 VFX 30종 | 240 | 4096×4096 |
| atlas_vfx_time_guardian | 시간수호자 VFX 30종 | 240 | 4096×4096 |
| atlas_vfx_void_wanderer | 공허방랑자 VFX 30종 | 240 | 4096×4096 |

### 3.6 코스메틱 아틀라스 (3장)

| 아틀라스 | 시즌 | 코스메틱 수 | 크기 |
|---|---|---|---|
| atlas_cosmetic_season1 | 시즌 1 | 50 | 4096×4096 |
| atlas_cosmetic_season2 | 시즌 2 | 50 | 4096×4096 |
| atlas_cosmetic_season3 | 시즌 3 | 50 | 4096×4096 |

---

## 4. 패딩/트리밍/회전 규칙

### 4.1 패딩 (Padding)
- **기본 패딩**: 2px (스프라이트 간 여백 — 밉맵 블리딩 방지)
- **Extrude**: 1px (가장자리 색상 복사 — 텍스처 필터링 아티팩트 방지)
- **타일셋 예외**: padding=0, extrude=0 (심리스 타일링 필수)
- **UI 아이콘**: padding=1 (아이콘 간 최소 여백)

### 4.2 트리밍 (Trimming)
- **기본**: `Trim` (투명 영역 제거 → 패킹 효율 ↑)
- **타일셋**: `None` (정확한 타일 크기 유지 필수)
- **UI 프레임**: `None` (9-slice 기준점 유지)
- **Trim Threshold**: 1 (완전 투명 픽셀만 제거)

### 4.3 회전 (Rotation)
- **기본**: `false` (회전 금지)
- **UI 아이콘**: `true` (패킹 효율 우선, 정방형이라 회전 영향 없음)
- **VFX/캐릭터/몬스터**: `false` 필수 (애니메이션 프레임 순서 + UV 매핑 보장)

---

## 5. Unity Sprite Atlas 설정 가이드

### 5.1 Sprite Atlas V2 설정

```csharp
// Unity Editor 설정 (Project Settings > Editor)
// Sprite Packer Mode: Sprite Atlas V2

// SpriteAtlas 에셋 설정 예시
// Inspector > Sprite Atlas
// - Type: Master
// - Include in Build: true (critical) / false (on-demand)
// - Allow Rotation: false (VFX/Char) / true (UI Icons)
// - Tight Packing: true (UI) / false (타일셋)
// - Padding: 2 (기본) / 0 (타일셋)
```

### 5.2 플랫폼별 텍스처 압축

| 플랫폼 | 포맷 | 품질 | 비고 |
|---|---|---|---|
| WebGL (기본) | ETC2 (RGBA) | Normal | 모든 브라우저 호환 |
| WebGL (고성능) | ASTC 6×6 | High | Chrome/Edge 최신 |
| Standalone | BC7 | High | PC 빌드용 |
| 에디터 | RGBA32 | — | 개발 시 원본 |

### 5.3 Addressables 연동

```csharp
// Addressables Group 설정
// Group Name: "SpriteAtlases_{category}"
// Build Path: RemoteBuildPath
// Load Path: RemoteLoadPath
// Bundle Mode: Pack Together (카테고리별 1번들)
// 
// Labels:
//   "critical" → Phase 0 (씬 진입 전 로딩)
//   "high"     → Phase 1 (진입 직후 백그라운드)
//   "medium"   → Phase 2 (온디맨드)
//   "low"      → Phase 3 (유휴 시 프리로드)
```

### 5.4 런타임 아틀라스 로딩

```csharp
// AssetLoader.cs와 연동
// 1. manifest.json에서 번들 목록 + 우선순위 로드
// 2. Phase 0 (critical) 번들 동기적 로딩
// 3. Phase 1~3 비동기 백그라운드 로딩
// 4. SpriteAtlas.GetSprite(spriteName) 으로 개별 스프라이트 접근
// 5. Late-binding: SpriteAtlasManager.atlasRequested 콜백 등록
```

---

## 6. 메모리 예산 정리

| 카테고리 | 아틀라스 수 | 원본 메모리 | 압축 후 메모리 | 비율 |
|---|---|---|---|---|
| 캐릭터 | 6 | 24 MB | 6 MB | 25% |
| 몬스터 | 9+1 | 160 MB | 40 MB | 25% |
| 환경 | 18 | 108 MB | 27 MB | 25% |
| UI | 6 | 16 MB | 4 MB | 25% |
| VFX | 7 | 100 MB | 25 MB | 25% |
| 코스메틱 | 3 | 48 MB | 12 MB | 25% |
| **합계** | **49** | **456 MB** | **114 MB** | — |

> ✅ 256MB 메모리 예산 내 — 압축 후 114MB + 런타임 오버헤드 ~40MB = ~154MB

---

## 7. 빌드 파이프라인

```bash
# 1. TexturePacker CLI 배치 빌드
texturepacker \
  --format unity-texture2d \
  --data "Assets/SpriteAtlases/{atlas_name}.tpsheet" \
  --sheet "Assets/SpriteAtlases/{atlas_name}.png" \
  --max-width 4096 --max-height 4096 \
  --size-constraints POT \
  --padding 2 --extrude 1 \
  --algorithm MaxRects \
  --trim-mode Trim \
  --disable-rotation \
  "SourceArt/{category}/*.png"

# 2. Unity Addressables 빌드
# Unity CLI: -executeMethod AddressableAssetSettings.BuildPlayerContent

# 3. 번들 업로드 (CDN)
# aws s3 sync Build/ServerData/ s3://aeterna-assets/bundles/ --cache-control "max-age=31536000"
```

---

## 부록: 아틀라스 네이밍 컨벤션

```
atlas_{category}_{subcategory}.png
atlas_{category}_{subcategory}.tpsheet   (TexturePacker 데이터)
atlas_{category}_{subcategory}.spriteatlas  (Unity SpriteAtlas 에셋)

예:
  atlas_char_ether_knight.png
  atlas_monster_erebos.png
  atlas_tiles_silvanhame.png
  atlas_vfx_common.png
  atlas_cosmetic_season1.png
```
