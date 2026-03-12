# 에셋 적용 가이드 — Unity WebGL 통합 매뉴얼

> 문서 ID: P16-14 | 버전: v1.0 | 작성일: 2026-03-13  
> 대상: Unity 2022.3 LTS + WebGL 빌드  
> 에셋 총 수: 1,248개

---

## 1. 폴더 구조 매핑

### 1.1 소스 → Unity 매핑 테이블

| 소스 경로 (`assets/`) | Unity 경로 (`unity-client/Assets/Resources/`) | 설명 |
|---|---|---|
| `prompts/characters/` | `Sprites/Characters/` | 캐릭터 일러스트 + 스프라이트 |
| `prompts/monsters/` | `Sprites/Monsters/` | 몬스터 스프라이트 (Normal/Elite/Boss/Raid) |
| `prompts/npcs/` | `Sprites/NPCs/` | NPC 초상화 + 스프라이트 |
| `prompts/environment/tiles/` | `Tilemaps/Tiles/` | 9지역 오토타일세트 |
| `prompts/environment/backgrounds/` | `Backgrounds/` | 패럴랙스 배경 (sky/far/mid/near) |
| `prompts/ui/icons/items/` | `UI/Icons/Items/` | 아이템 아이콘 64×64 |
| `prompts/ui/icons/skills/` | `UI/Icons/Skills/` | 스킬 아이콘 64×64 |
| `prompts/ui/icons/status/` | `UI/Icons/Status/` | 상태이상/버프 아이콘 |
| `prompts/ui/frames/` | `UI/Frames/` | HUD/인벤/상점/설정/버튼 프레임 |
| `prompts/vfx/skills/` | `VFX/Skills/` | 전투 이펙트 스프라이트 시트 |
| `prompts/vfx/common/` | `VFX/Common/` | 공통 이펙트 (히트/힐/사망 등) |
| `prompts/cosmetics/` | `Cosmetics/` | 시즌별 코스메틱 에셋 |

### 1.2 Unity 프로젝트 디렉토리 구조

```
unity-client/
└── Assets/
    ├── Resources/
    │   ├── Sprites/
    │   │   ├── Characters/
    │   │   │   ├── EtherKnight/     # 클래스별 서브폴더
    │   │   │   ├── Memorist/
    │   │   │   ├── ShadowWeaver/
    │   │   │   ├── MemoryBreaker/
    │   │   │   └── TimeGuardian/
    │   │   ├── Monsters/
    │   │   │   ├── Normal/          # 등급별
    │   │   │   ├── Elite/
    │   │   │   ├── Boss/
    │   │   │   ├── Raid/
    │   │   │   └── TemporalRift/    # 시간의 균열 전용
    │   │   └── NPCs/
    │   │       ├── Portraits/
    │   │       └── Sprites/
    │   ├── Tilemaps/
    │   │   ├── Tiles/
    │   │   │   ├── Erebos/
    │   │   │   ├── Silvanheiml/
    │   │   │   ├── Solaris/
    │   │   │   ├── NorthernIceField/
    │   │   │   ├── Argentium/
    │   │   │   ├── Britalia/
    │   │   │   ├── FogSea/
    │   │   │   ├── MemoryAbyss/
    │   │   │   └── TemporalRift/
    │   │   └── Palettes/            # Tilemap Palette 에셋
    │   ├── Backgrounds/
    │   │   └── {Region}/
    │   │       ├── day/
    │   │       ├── night/
    │   │       └── dusk/
    │   ├── UI/
    │   │   ├── Icons/
    │   │   │   ├── Items/           # 100종
    │   │   │   ├── Skills/          # 150종
    │   │   │   └── Status/          # 25종
    │   │   └── Frames/
    │   │       ├── Default/         # 다크판타지 테마
    │   │       ├── Dark/            # 심연 테마
    │   │       └── Season/          # 시간의균열 테마
    │   ├── VFX/
    │   │   ├── Skills/              # 180종 (6클래스 × 30)
    │   │   └── Common/              # 30종
    │   ├── Cosmetics/
    │   │   ├── Season1/
    │   │   ├── Season2/
    │   │   └── Season3/
    │   └── manifest.json
    ├── Editor/
    │   └── AssetImporter.cs         # 커스텀 임포터
    └── Scripts/
        └── AssetLoader.cs           # 비동기 에셋 로더
```

---

## 2. Sprite Import Settings

### 2.1 캐릭터/몬스터/NPC 스프라이트

```yaml
# Unity Sprite Import Settings
Texture Type: Sprite (2D and UI)
Sprite Mode: Multiple              # 스프라이트 시트인 경우
Pixels Per Unit: 32                # 32px = 1 Unity Unit
Filter Mode: Point (no filter)     # 픽셀아트 선명도 유지
Compression: None                  # 개발 중 무압축
Max Size: 2048                     # 캐릭터: 512, 몬스터: 1024, 보스: 2048
Read/Write Enabled: false          # WebGL 메모리 절약
Generate Mip Maps: false           # 2D 게임 불필요
sRGB (Color Texture): true
Alpha Source: Input Texture Alpha
Alpha Is Transparency: true
```

### 2.2 아이콘 (64×64)

```yaml
Texture Type: Sprite (2D and UI)
Sprite Mode: Single
Pixels Per Unit: 64
Filter Mode: Point (no filter)
Max Size: 64
Compression: None
Wrap Mode: Clamp
```

### 2.3 배경 (패럴랙스)

```yaml
Texture Type: Sprite (2D and UI)
Sprite Mode: Single
Pixels Per Unit: 16                # 배경은 넓은 범위
Filter Mode: Bilinear              # 배경은 부드러운 필터링
Max Size: 4096                     # 배경 해상도
Wrap Mode: Repeat                  # 수평 심리스 대응
Compression: ASTC 6x6             # WebGL 프로덕션 압축
```

### 2.4 VFX 스프라이트 시트

```yaml
Texture Type: Sprite (2D and UI)
Sprite Mode: Multiple
Pixels Per Unit: 32
Filter Mode: Bilinear              # 이펙트는 부드러움 우선
Max Size: 512                      # 8프레임 × 64px = 512
Compression: ASTC 4x4             # 이펙트 품질 우선
Read/Write Enabled: false
```

### 2.5 WebGL 플랫폼 오버라이드

```yaml
# WebGL Platform Override (모든 텍스처)
Format: ASTC 6x6                  # 기본 압축
Override For WebGL: true
Max Size: [텍스처 유형별 상이]
Compression Quality: Normal
```

---

## 3. Animation Controller 설정

### 3.1 캐릭터 Animator Controller

```
CharacterAnimator.controller
├── Base Layer
│   ├── Idle (Default)          # 4프레임, Loop
│   ├── Walk                    # 8프레임, Loop
│   ├── Run                     # 6프레임, Loop
│   ├── Attack_01               # 6프레임, Once
│   ├── Attack_02               # 8프레임, Once
│   ├── Skill                   # Variable, Once
│   ├── Hit                     # 3프레임, Once
│   ├── Death                   # 6프레임, Once
│   └── Victory                 # 8프레임, Loop
└── Override Layer (코스메틱)
    └── [코스메틱 스킨별 오버라이드]

Parameters:
  - Speed (Float)               : Walk/Run 전환
  - IsAttacking (Bool)          : 공격 상태
  - SkillIndex (Int)            : 스킬 번호 (0~29)
  - IsHit (Trigger)             : 피격
  - IsDead (Bool)               : 사망
  - IsVictory (Bool)            : 승리

Transitions:
  Idle → Walk     : Speed > 0.1
  Walk → Run      : Speed > 0.5
  Any → Attack    : IsAttacking = true
  Any → Hit       : IsHit (trigger)
  Any → Death     : IsDead = true
  Any → Victory   : IsVictory = true
```

### 3.2 몬스터 Animator Controller

```
MonsterAnimator.controller
├── Base Layer
│   ├── Idle (Default)          # 4프레임, Loop
│   ├── Walk                    # 6프레임, Loop
│   ├── Attack                  # 6프레임, Once
│   ├── SpecialAttack           # 8프레임, Once (Elite+ 전용)
│   ├── Hit                     # 3프레임, Once
│   └── Death                   # 6프레임, Once
└── Phase Layer (보스 전용)
    ├── Phase1                  # 기본
    ├── Phase2                  # HP 50% 이하
    └── Phase3                  # HP 20% 이하 (레이드 보스)

Parameters:
  - Speed (Float)
  - AttackType (Int)            : 0=일반, 1=특수
  - IsHit (Trigger)
  - IsDead (Bool)
  - BossPhase (Int)             : 보스 페이즈 전환
```

### 3.3 VFX Animation

```
VFXAnimator.controller
├── Play (Default)              # 전체 프레임 재생, Once
└── Loop (선택)                 # 지속 이펙트용, Loop

Parameters:
  - IsLooping (Bool)            : 지속 이펙트 여부
  
Settings:
  - Sample Rate: 12 FPS         # 이펙트 기본
  - Sample Rate (Fast): 24 FPS  # 빠른 이펙트
```

---

## 4. Tilemap Palette 구성법

### 4.1 Tilemap 계층 구조

```
Scene Hierarchy:
└── Grid (Grid Component)
    ├── Ground          # 지형 기본 (Sorting Order: 0)
    ├── GroundDecor     # 지형 장식 (Sorting Order: 1)
    ├── Wall            # 벽/장애물 (Sorting Order: 2)
    ├── WallTop         # 벽 상단 (Sorting Order: 3)
    ├── Object          # 상호작용 오브젝트 (Sorting Order: 4)
    └── Collision       # 충돌 레이어 (렌더링 OFF)
```

### 4.2 Tile Palette 생성 절차

1. **Palette 생성**: `Window → 2D → Tile Palette → Create New Palette`
2. **지역별 Palette 명명**: `Palette_{RegionName}` (예: `Palette_Erebos`)
3. **타일 등록**: 오토타일 세트를 Palette에 드래그
4. **Rule Tile 설정**: 각 타일에 인접 규칙(Adjacent Rule) 적용

```csharp
// Rule Tile 설정 예시 (에레보스 지면)
[CreateAssetMenu(menuName = "2D/Tiles/Erebos Ground Rule Tile")]
public class ErebosGroundRuleTile : RuleTile<ErebosGroundRuleTile.Neighbor>
{
    public class Neighbor : RuleTile.TilingRule.Neighbor
    {
        public const int Void = 3;      // 빈 공간
        public const int Water = 4;     // 물 타일
    }
}
```

### 4.3 오토타일 배치 규격

| 타일 유형 | 세트 구성 | 규격 |
|-----------|-----------|------|
| 지면 (Ground) | 47-tile blob | 32×32px/tile |
| 벽 (Wall) | 16-tile minimal | 32×32px/tile |
| 장식 (Decor) | 개별 타일 | 32×32px (가변) |
| 물/용암 | 4프레임 애니메이션 | 32×32px × 4frame |
| 전환 (Transition) | 8-tile edge | 32×32px/tile |

### 4.4 지역별 Palette 파일

```
Assets/Resources/Tilemaps/Palettes/
├── Palette_Erebos.asset
├── Palette_Silvanheiml.asset
├── Palette_Solaris.asset
├── Palette_NorthernIceField.asset
├── Palette_Argentium.asset
├── Palette_Britalia.asset
├── Palette_FogSea.asset
├── Palette_MemoryAbyss.asset
└── Palette_TemporalRift.asset
```

---

## 5. 에셋 타입별 임포트 체크리스트

### 5.1 캐릭터 에셋 (42종)

- [ ] 일러스트 3뷰(front/side/back) × 6클래스 = 18장 임포트
- [ ] 스프라이트 시트 4방향 × 6클래스 = 24세트 슬라이싱
- [ ] Animator Controller 6개 생성 및 연결
- [ ] Prefab 생성 (클래스별)
- [ ] 코스메틱 오버라이드 레이어 테스트

### 5.2 몬스터 에셋 (228종)

- [ ] Normal 120종 + Elite 40종 + Boss 30종 + Raid 8종 + TemporalRift 30종
- [ ] 등급별 스프라이트 해상도 확인 (Normal: 128px, Elite: 256px, Boss: 512px, Raid: 1024px)
- [ ] Animator Controller 등급별 템플릿 적용
- [ ] 보스 페이즈 전환 애니메이션 테스트
- [ ] 레이드 보스 3페이즈 동작 확인

### 5.3 NPC 에셋 (60종)

- [ ] 초상화 30종 임포트 (256×256)
- [ ] 스프라이트 30종 임포트 (Idle/Talk 애니메이션)
- [ ] 대화 시스템 연동 테스트

### 5.4 환경 에셋 (162종)

- [ ] 타일세트 9지역 × 9세트 = 81세트 → Rule Tile 생성
- [ ] Palette 9개 구성
- [ ] 배경 9지역 × 4레이어 × 3시간대 = 108장 (기존 36 + P16 72)
- [ ] 패럴랙스 스크롤 테스트 (각 레이어 속도)
- [ ] 시간대 전환 블렌딩 테스트

### 5.5 UI 에셋 (365종)

- [ ] 아이템 아이콘 100종 (등급 테두리 적용 확인)
- [ ] 스킬 아이콘 150종 (클래스 색상 확인)
- [ ] 상태 아이콘 25종 (적색/청색 구분)
- [ ] UI 프레임 90종 (9-slice 설정)
- [ ] 3테마(기본/다크/시즌) 전환 테스트

### 5.6 VFX 에셋 (210종)

- [ ] 스킬 이펙트 180종 스프라이트 시트 슬라이싱
- [ ] 공통 이펙트 30종 슬라이싱
- [ ] 12 FPS / 24 FPS 재생 속도 확인
- [ ] 파티클 정렬(Sorting Order) 확인

### 5.7 코스메틱 에셋 (150종)

- [ ] 시즌 1/2/3 × 50종 임포트
- [ ] 스킨 오버라이드 적용 테스트
- [ ] 무기 외형 교체 테스트
- [ ] 오라/펫 이펙트 레이어 확인

---

## 6. 트러블슈팅

### 6.1 WebGL 텍스처 제한

| 문제 | 원인 | 해결 |
|------|------|------|
| 텍스처 검은색 표시 | Max Size 초과 (WebGL: 4096 제한) | Max Size ≤ 4096으로 설정 |
| 로딩 시 프리징 | 동기 로딩 사용 | `AssetLoader.cs` 비동기 로딩 사용 |
| ASTC 미지원 브라우저 | iOS Safari 구버전 | ETC2 폴백 설정 |
| 텍스처 깨짐 (NPOT) | Non-Power-of-Two 텍스처 | POT 크기로 리사이즈 (32/64/128/256/512/1024/2048/4096) |
| 알파 블렌딩 이상 | Pre-multiplied Alpha | Shader에서 `Blend SrcAlpha OneMinusSrcAlpha` |

### 6.2 메모리 이슈

| 문제 | 원인 | 해결 |
|------|------|------|
| OOM 크래시 | 씬 전체 에셋 동시 로딩 | 프로그레시브 로딩 (P0→P3 우선순위) |
| 메모리 누수 | 씬 전환 시 미해제 | `Resources.UnloadUnusedAssets()` 호출 |
| VRAM 초과 | 아틀라스 과다 로딩 | 씬별 메모리 예산 준수 (최대 256MB) |
| 느린 초기 로딩 | IndexedDB 캐시 미스 | 첫 로딩 후 자동 캐싱 (AssetLoader) |
| GC 스파이크 | 대량 Texture2D 생성 | 오브젝트 풀링 + 아틀라스 공유 |

### 6.3 애니메이션 이슈

| 문제 | 원인 | 해결 |
|------|------|------|
| 스프라이트 떨림 | Pixels Per Unit 불일치 | 모든 에셋 PPU = 32 통일 |
| 전환 깜빡임 | Transition Duration 0 | Has Exit Time = false, Duration = 0.1 |
| 이펙트 느린 재생 | Sample Rate 미설정 | VFX: 12 FPS, 빠른 이펙트: 24 FPS |
| Rule Tile 미매칭 | 인접 규칙 오류 | Tile Palette에서 Preview 확인 |

### 6.4 빌드 이슈

| 문제 | 원인 | 해결 |
|------|------|------|
| 빌드 크기 폭증 | 미사용 에셋 포함 | Addressables 또는 AssetBundle 사용 |
| 로딩 화면 무한 | CORS 설정 누락 | 서버 `Access-Control-Allow-Origin: *` |
| 폰트 깨짐 | Dynamic Font WebGL 미지원 | SDF Font (TextMeshPro) 사용 |
| 오디오 미재생 | 자동재생 정책 | 사용자 인터랙션 후 AudioContext.resume() |

---

## 7. 빠른 시작 (Quick Start)

```bash
# 1. 에셋 다운로드 (생성된 이미지를 Unity 프로젝트로 복사)
cp -r assets/output/* unity-client/Assets/Resources/

# 2. Unity 에디터에서 Reimport
# Assets → Reimport All (또는 변경된 폴더만)

# 3. Import Settings 일괄 적용
# Editor/AssetImporter.cs 실행 (커스텀 PostProcesser)

# 4. Tilemap Palette 구성
# Window → 2D → Tile Palette에서 지역별 Palette 생성

# 5. Prefab 생성
# 캐릭터/몬스터/NPC Prefab에 Animator + SpriteRenderer 연결

# 6. 빌드 테스트
# File → Build Settings → WebGL → Build And Run
```

---

> **다음 단계**: `optimization-guide.md`에서 WebGL 최적화 상세 적용
