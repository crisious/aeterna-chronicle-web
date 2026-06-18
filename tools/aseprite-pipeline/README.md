# Aseprite Pipeline

## 목적과 현재 범위

이 파이프라인은 사람이 보정한 `.ase`/`.aseprite` 원본을 Aseprite CLI로 export해 에테르나 크로니클의 PNG sprite sheet와 JSON atlas로 변환한다. AI 아트 파이프라인은 seed/reference 생성과 후처리에 계속 사용하고, Aseprite는 QA 반려 에셋이나 애니메이션 일관성이 필요한 에셋의 수동 보정 SSOT(Single Source of Truth)로 사용한다.

현재 범위는 다음 단계다.

1. Aseprite 실행 파일 탐색 및 설치 확인
2. `.ase`/`.aseprite` 원본 batch export
3. Aseprite JSON을 런타임 atlas JSON 형태로 정규화
4. PNG/JSON/프레임/tag 정합성 검증
5. character roster 기반 단일 캐릭터 build 및 선택적 runtime publish
6. sprite production roster 기반 NPC/일반 그래픽 제작 상태 추적
7. 개별 Aseprite runtime PNG에서 legacy atlas PNG/JSON 파생물 재패킹
8. 스토리/챕터/엔딩 CG 단일 이미지 제작 및 기존 `assets/cg` runtime 경로 publish
9. 공용 fallback/placeholder texture를 Aseprite runtime PNG로 publish
10. 전투 hit/buff fallback texture를 Aseprite runtime PNG로 publish
11. 던전 몬스터 preview를 기존 Aseprite `monsterBattleIcon` runtime PNG로 표시
12. 전투 몬스터 generic fallback texture를 Aseprite runtime PNG로 publish
13. 환경 파티클 rain/snow/ether beam texture를 Aseprite runtime PNG로 publish

고로디 NPC 파일럿과 core town NPC 3종은 `client/src/assets/spriteResourceManifest.ts`를 통해 `client/public/assets/generated/characters/npc_sprites` 런타임 경로에 연결되어 있다. 캐릭터 스프라이트는 `npm run art:character:build -- <character-id> --publish`로 `client/public/assets/generated` 심링크를 경유하는 runtime sprite 경로에 게시할 수 있다. Atlas PNG/JSON은 직접 편집 원본이 아니라 개별 Aseprite 산출물을 다시 묶은 파생 publish 대상이다.

## Aseprite 설치 확인

Aseprite를 설치한 뒤 프로젝트 루트에서 실행 파일 탐색을 확인한다.

```powershell
npm run art:aseprite:check
```

정상 상태에서는 Aseprite 실행 파일 경로가 출력된다. 자동 탐색이 실패하면 현재 셸에 `ASEPRITE_EXE`를 지정한 뒤 다시 확인한다.

```powershell
$env:ASEPRITE_EXE="C:\Program Files (x86)\Steam\steamapps\common\Aseprite\Aseprite.exe"
npm run art:aseprite:check
```

`art:aseprite:export`도 같은 탐색 로직을 사용한다. CI나 공유 작업 PC처럼 설치 경로가 표준 위치가 아니면 `ASEPRITE_EXE`를 명시해 실행 파일을 고정한다.

현재 Windows 작업 PC는 Steam 설치 경로를 사용한다. 새 PowerShell에서도 자동으로 잡히도록 사용자 환경변수에 다음 값을 등록한다.

```powershell
[Environment]::SetEnvironmentVariable(
  "ASEPRITE_EXE",
  "C:\Program Files (x86)\Steam\steamapps\common\Aseprite\Aseprite.exe",
  "User"
)
```

## 루트 경로

기본 루트 경로와 카테고리 규격은 `tools/aseprite-pipeline/aseprite.config.json`이 기준이다. 캐릭터 런타임 publish 대상은 config가 아니라 `assets/source/aseprite/character/character-sprite-roster.json`의 `runtimePng`/`runtimeJson`이 기준이다.

| 구분 | 경로 | 용도 |
|------|------|------|
| sourceRoot | `assets/source/aseprite` | 사람이 편집하는 `.ase`/`.aseprite` 원본 |
| exportRoot | `assets/generated/aseprite` | Aseprite CLI가 만든 PNG와 raw JSON, 정규화 JSON |
| publishRoot | `client/public/assets/atlas` | NPC/일반 atlas 리뷰 통과 후 수동 배치 경로 |
| generated atlas output | `assets/generated/atlas` | 개별 runtime PNG에서 재패킹한 `atlas_*` PNG/JSON 파생물 |
| public atlas runtime | `client/public/assets/atlas` | Phaser `assets/atlas/...` 경로로 제공되는 runtime atlas PNG/JSON |
| character roster runtime | `client/public/assets/generated/characters/sprites` | roster의 `runtimePng`/`runtimeJson`이 가리키는 캐릭터 publish 경로 |
| character sprite sheet runtime | `client/public/assets/generated/characters/sprites` | legacy `char_sprite_*_sprite_sheet.png` `256x384` 단일 PNG 경로 |
| character illustration runtime | `client/public/assets/generated/characters/{class_main,class_advanced}` | 캐릭터 선택/필드/전투에서 쓰는 `256x384` 단일 PNG 경로 |
| character battle thumbnail runtime | `client/public/assets/generated/characters/class_main/battle` | 전투 fallback 및 필드 HUD 상태 아바타용 `64x96` 단일 PNG 경로 |
| NPC battle thumbnail runtime | `client/public/assets/generated/characters/npc_battle` | GameScene NPC fallback용 `64x96` 단일 PNG 경로 |
| NPC portrait runtime | `client/public/assets/generated/characters/npc` | NPC 대화/도감 portrait용 `512x512` 단일 PNG 경로 |
| NPC sprite runtime | `client/public/assets/generated/characters/npc_sprites` | NPC 40종 `256x384` 단일 PNG와 6프레임 field NPC sheet 혼합 경로 |
| sprite resource runtime | `client/public/assets/generated/characters/npc_sprites` | `spriteResourceManifest`가 가리키는 NPC 파일럿 publish 경로 |
| worldmap icon runtime | `client/public/assets/generated/ui/worldmap` | `spriteResourceManifest`가 가리키는 월드맵 지역 아이콘 publish 경로 |
| item icon runtime | `client/public/assets/generated/ui/icons/items` | 상점/인벤토리용 `ITM-*` `64x64` 단일 PNG 경로 |
| status icon runtime | `client/public/assets/generated/ui/icons/status` | Battle status 15개와 legacy `STS-*` 25개 `32x32` 단일 PNG 경로 |
| UI frame runtime | `client/public/assets/generated/ui/frames` | HUD/Inventory/Shop/Button frame용 `512x512` 단일 PNG 경로 |
| cosmetic runtime | `client/public/assets/generated/cosmetics/season{1,2,3}` | 시즌 코스메틱용 `512x512` 단일 PNG 경로 |
| VFX runtime | `client/public/assets/generated/vfx/{common,skills}` | AssetManager preload용 `512x64` 8프레임 VFX 스트립 경로 |
| environment particle runtime | `client/public/assets/generated/vfx/particles` | TransitionEffects 환경 파티클용 `2x10`/`6x10`/`6x16` 단일 PNG 경로 |
| environment object runtime | `client/public/assets/generated/environment/objects` | 필드 장식물용 `256x256` 투명 단일 PNG 경로 |
| monster portrait runtime | `client/public/assets/generated/monsters/normal` | 전투 fallback과 몬스터 목록용 `256x256` 단일 PNG 경로 |
| monster battle icon runtime | `client/public/assets/generated/monsters/battle` | 전투/도감 UI용 `64x64` 단일 PNG 경로 |
| battle monster fallback runtime | `client/public/assets/generated/monsters/fallback` | BattleScene generic fallback용 `60x60`/`90x90` 단일 PNG 경로 |
| monster elite boss runtime | `client/public/assets/generated/monsters/elite_boss` | 엘리트/보스용 `384x384` 단일 PNG 경로 |
| monster raid boss runtime | `client/public/assets/generated/monsters/raid_boss` | 레이드 보스 phase용 `512x512` 단일 PNG 경로 |
| story CG runtime | `client/public/assets/cg` | 챕터 타이틀, 엔딩, 패배 CG용 `1216x832` 단일 PNG 경로 |
| fallback texture runtime | `client/public/assets/generated/ui/placeholders` | 누락 에셋 표시용 `64x64`/`32x32` placeholder PNG 경로 |
| effect fallback texture runtime | `client/public/assets/generated/vfx/fallback` | 전투 hit/buff fallback용 `32x32`/`24x24` 단일 PNG 경로 |

현재 export 스크립트는 카테고리별 export 폴더에 basename 기준으로 산출물을 만든다. 예를 들어 `npc` 카테고리는 `assets/generated/aseprite/npc/<basename>.png`와 `assets/generated/aseprite/npc/<basename>.aseprite.json`을 생성한다.

`client/public/assets/generated`는 `assets/generated`를 가리키는 심링크다. 캐릭터 런타임 경로는 브라우저에서 `assets/generated/characters/sprites/...`로 로드한다.

## 카테고리 규격

| 카테고리 | 프레임 | sheetType | 필수 tag |
|----------|--------|-----------|----------|
| `character` | 64x64 | `rows` | `idle_D`, `walk_D`, `attack_melee_D`, `cast_D`, `hit_D`, `death_D` |
| `characterIllustration` | 256x384 | `rows` | 없음 |
| `characterBattleThumbnail` | 64x96 | `rows` | 없음 |
| `characterSpriteSheet` | 256x384 | `rows` | 없음 |
| `npcBattleThumbnail` | 64x96 | `rows` | 없음 |
| `npc` | 64x64 | `rows` | `idle_D`, `talk_D` |
| `npcPortrait` | 512x512 | `rows` | 없음 |
| `npcSprite` | 256x384 | `rows` | 없음 |
| `monster` | 64x64 | `rows` | `idle`, `attack`, `hit`, `death` |
| `monsterPortrait` | 256x256 | `rows` | 없음 |
| `monsterBattleIcon` | 64x64 | `rows` | 없음 |
| `monsterEliteBossPortrait` | 384x384 | `rows` | 없음 |
| `monsterRaidBossPortrait` | 512x512 | `rows` | 없음 |
| `vfx` | 64x64 | `horizontal` | `start`, `loop`, `end` |
| `ui` | 32x32 | `packed` | 없음 |
| `uiFrame` | 512x512 | `rows` | 없음 |
| `cosmetic` | 512x512 | `rows` | 없음 |
| `worldmap` | 64x64 | `rows` | 없음 |
| `skillIcon` | 64x64 | `rows` | 없음 |
| `itemIcon` | 64x64 | `rows` | 없음 |
| `statusIcon` | 32x32 | `rows` | 없음 |
| `environmentBackground` | 1280x720 | `rows` | 없음 |
| `environmentTile` | 256x256 | `rows` | 없음 |
| `environmentObject` | 256x256 | `rows` | 없음 |
| `storyCg` | 1216x832 | `rows` | 없음 |
| `fallbackTexture` | 64x64 | `rows` | 없음 |
| `fallbackTextureSmall` | 32x32 | `rows` | 없음 |
| `effectFallbackTexture` | 32x32 | `rows` | 없음 |
| `effectFallbackTextureSmall` | 24x24 | `rows` | 없음 |
| `battleMonsterFallbackTexture` | 60x60 | `rows` | 없음 |
| `battleMonsterBossFallbackTexture` | 90x90 | `rows` | 없음 |
| `environmentParticleRainTexture` | 2x10 | `rows` | 없음 |
| `environmentParticleSnowTexture` | 6x10 | `rows` | 없음 |
| `environmentParticleEtherBeamTexture` | 6x16 | `rows` | 없음 |
| `tile` | 32x32 | `rows` | 없음 |

NPC는 반드시 64x64 프레임을 사용한다. `idle_D`, `talk_D` tag는 Aseprite timeline의 frame range를 가져야 하며, `from`/`to` 값은 정수이고 실제 frame index 범위 안에 있어야 한다.

## Character Sprite Workflow

캐릭터 스프라이트는 `assets/source/aseprite/character/character-sprite-roster.json`을 기준으로 검증한다. 현재 런타임 대상은 `char_ether_knight_base` Ether Knight 5방향 full motion과 나머지 기본 클래스 5종의 D 방향 파일럿이다. Ether Knight source `.aseprite`는 64x64 프레임 캔버스, 150프레임, export sheet `1920x320` 규격이며 character export는 `sheetColumns: 30`을 사용해 방향별 30프레임을 한 행에 배치한다. D 방향 파일럿은 `640x64`, 10프레임, `idle_D`/`walk_D` 규격이다.

### 1) Roster 검증

```powershell
npm run art:character:roster
```

### 2) 단일 캐릭터 build/검증

```powershell
npm run art:character:build -- char_ether_knight_base
npm run art:character:build -- char_memory_weaver_base
npm run art:character:build -- char_shadow_weaver_base
npm run art:character:build -- char_memory_breaker_base
npm run art:character:build -- char_time_guardian_base
npm run art:character:build -- char_void_wanderer_base
```

예상 산출물:

- `assets/generated/aseprite/character/char_ether_knight_base.png`
- `assets/generated/aseprite/character/char_ether_knight_base.aseprite.json`
- `assets/generated/aseprite/character/char_ether_knight_base.json`

### 3) 런타임 publish

```powershell
npm run art:character:build -- char_ether_knight_base --publish
npm run art:character:build -- char_memory_weaver_base --publish
npm run art:character:build -- char_shadow_weaver_base --publish
npm run art:character:build -- char_memory_breaker_base --publish
npm run art:character:build -- char_time_guardian_base --publish
npm run art:character:build -- char_void_wanderer_base --publish
```

publish 후 runtime 산출물은 다음 경로에서 확인한다.

- `assets/generated/characters/sprites/char_ether_knight_base.png`
- `assets/generated/characters/sprites/char_ether_knight_base.json`
- `assets/generated/characters/sprites/char_memory_weaver_base.png`
- `assets/generated/characters/sprites/char_memory_weaver_base.json`
- `assets/generated/characters/sprites/char_shadow_weaver_base.png`
- `assets/generated/characters/sprites/char_shadow_weaver_base.json`
- `assets/generated/characters/sprites/char_memory_breaker_base.png`
- `assets/generated/characters/sprites/char_memory_breaker_base.json`
- `assets/generated/characters/sprites/char_time_guardian_base.png`
- `assets/generated/characters/sprites/char_time_guardian_base.json`
- `assets/generated/characters/sprites/char_void_wanderer_base.png`
- `assets/generated/characters/sprites/char_void_wanderer_base.json`
- `client/public/assets/generated/characters/sprites/...` 심링크 경유

런타임 계약은 `client/src/assets/characterSpriteManifest.ts`가 가진다. `GameScene`, `BattleScene`, `DungeonScene`은 해당 manifest를 읽어 `load.spritesheet(..., { frameWidth: 64, frameHeight: 64 })`로 로드하고, 생성 후 `setFrame(0)`을 적용해 1920x320 sheet 전체 렌더링을 피한다. `GameScene`은 로컬 플레이어 선택 class와 `CHARACTER_SPRITE_MANIFEST` 전체를 preload해 `world:playerJoined.characterClass`가 있는 원격 플레이어도 Aseprite sheet frame `0`으로 표시한다. `characterClass`가 없거나 texture가 없을 때만 기존 원격 플레이어 사각형 fallback을 사용한다. `DungeonScene`은 manifest sheet를 먼저 표시하고, 기존 `dungeon_player` side illustration과 절차 사각형은 안전 fallback으로만 사용한다.

브라우저 QA는 다음 파라미터로 확인한다.

```text
?debugScene=world&class=ether_knight&era=present
?debugScene=battle&class=ether_knight&era=present
?debugScene=game&renderer=canvas&zone=aether_plains&class=memory_weaver
```

Ether Knight 5방향 제작은 `D`, `DL`, `L`, `UL`, `U` 각각에 `idle`, `walk`, `attack_melee`, `cast`, `hit`, `death` tag를 포함한다. Memory Weaver, Shadow Weaver, Memory Breaker, Time Guardian, Void Wanderer 파일럿은 `idle_D`, `walk_D` tag를 포함한다. 다음 확장 단계는 D 방향 파일럿 5종의 추가 방향 또는 class별 full motion 승격이다.

## Character Illustration Workflow

캐릭터 일러스트 원본은 `assets/source/aseprite/characterIllustration/{class_main|class_advanced}/{class_id}` 아래에 둔다.

```text
assets/source/aseprite/characterIllustration/class_main/ether_knight/char_illust_ether_knight_front.aseprite
assets/source/aseprite/characterIllustration/class_main/ether_knight/char_illust_ether_knight_side.aseprite
assets/source/aseprite/characterIllustration/class_advanced/void_wanderer/char_illust_void_wanderer_adv3_front.aseprite
```

Runtime publish 대상:

```text
client/public/assets/generated/characters/class_main/<illustration-id>.png
client/public/assets/generated/characters/class_advanced/<illustration-id>.png
```

`characterIllustration`은 `256x384` 단일 프레임 PNG이며 animation tag를 요구하지 않는다. 전체 재생성은 다음 명령으로 실행한다.

```powershell
npm run art:character:illustrations
```

일부만 다시 만들 때는 `class_main/<id>` 또는 `<id>` 형식으로 지정한다.

```powershell
npm run art:character:illustrations -- --ids class_main/char_illust_ether_knight_front,char_illust_void_wanderer_adv3_front
```

빌더는 `client/public/assets/generated/characters/class_main`과 `class_advanced`의 파일명을 기준으로 Aseprite source를 만들고, export, JSON 정규화, PNG 검증, runtime publish, `sprite-production-roster.json` 병합까지 수행한다. `class_main/battle`의 `64x96` 썸네일은 아래 전투 썸네일 워크플로우가 별도 관리한다.

검증:

- `sprite-production-roster.json`은 `characterIllustration` 36개를 추적한다.
- `tests/unit/characterIllustrationAssets.test.ts`가 runtime 폴더 전체의 파일 수, PNG 규격, JSON frame, 로스터 연결을 검증한다.

## Character Battle Thumbnail Workflow

전투 fallback 썸네일 원본은 `assets/source/aseprite/characterBattleThumbnail/class_main/{class_id}` 아래에 둔다.

```text
assets/source/aseprite/characterBattleThumbnail/class_main/ether_knight/char_battle_ether_knight.aseprite
assets/source/aseprite/characterBattleThumbnail/class_main/void_wanderer/char_battle_void_wanderer.aseprite
```

Runtime publish 대상:

```text
client/public/assets/generated/characters/class_main/battle/<thumbnail-id>.png
```

`characterBattleThumbnail`은 `64x96` 단일 프레임 PNG이며 animation tag를 요구하지 않는다. 전체 재생성은 다음 명령으로 실행한다.

```powershell
npm run art:character:battle-thumbnails
```

일부만 다시 만들 때는 class id 또는 thumbnail id를 지정한다.

```powershell
npm run art:character:battle-thumbnails -- --ids ether_knight,char_battle_void_wanderer
```

빌더는 `client/public/assets/generated/characters/class_main/battle`의 파일명을 기준으로 Aseprite source를 만들고, export, JSON 정규화, PNG 검증, runtime publish, `sprite-production-roster.json` 병합까지 수행한다. `BattleScene` fallback 키 `char_battle_<class_id>`는 이 썸네일 경로를 로드한다.

검증:

- `sprite-production-roster.json`은 `characterBattleThumbnail` 6개를 추적한다.
- `tests/unit/characterBattleThumbnailAssets.test.ts`가 runtime 폴더 전체의 파일 수, PNG 규격, JSON frame, 로스터 연결을 검증한다.

## Character Sprite Sheet Legacy Workflow

Legacy character sprite sheet 원본은 `assets/source/aseprite/characterSpriteSheet/{class_id}` 아래에 둔다.

```text
assets/source/aseprite/characterSpriteSheet/ether_knight/char_sprite_ether_knight_base_sprite_sheet.aseprite
assets/source/aseprite/characterSpriteSheet/memory_weaver/char_sprite_memory_weaver_adv1_sprite_sheet.aseprite
```

Runtime publish 대상:

```text
client/public/assets/generated/characters/sprites/char_sprite_<class_or_variant>_sprite_sheet.png
```

`characterSpriteSheet`는 `256x384` 단일 프레임 PNG이며 animation tag를 요구하지 않는다. 이 카테고리는 `character` 애니메이션 시트(`char_<class>_base.png/json`)와 분리해서 기존 public `char_sprite_*_sprite_sheet.png` 파일만 보증한다. 전체 재생성은 다음 명령으로 실행한다.

```powershell
npm run art:character:sprite-sheets
```

일부 ID만 재생성할 수 있다.

```powershell
npm run art:character:sprite-sheets -- --ids char_sprite_memory_weaver_base_sprite_sheet,char_sprite_void_wanderer_adv3_sprite_sheet
```

빌더는 `client/public/assets/generated/characters/sprites`에서 `^char_sprite_.+_sprite_sheet.png$` 파일만 대상으로 삼고, `tools/aseprite-pipeline/scripts/create-character-illustration.lua`로 source `.aseprite`를 생성한 뒤 export, JSON 정규화, PNG 검증, runtime publish, `sprite-production-roster.json` 병합까지 수행한다.

검증:

- `sprite-production-roster.json`은 `characterSpriteSheet` 24개를 추적한다.
- `tests/unit/characterSpriteSheetAssets.test.ts`가 runtime 폴더의 legacy sprite_sheet 파일 수, PNG 규격, JSON frame, 로스터 연결을 검증한다.

## NPC Battle Thumbnail Workflow

GameScene NPC 전투 fallback 썸네일 원본은 `assets/source/aseprite/npcBattleThumbnail/{npc_id}` 아래에 둔다.

```text
assets/source/aseprite/npcBattleThumbnail/01_cryo/01_cryo_sprite.aseprite
assets/source/aseprite/npcBattleThumbnail/04_mateus/04_mateus_sprite.aseprite
```

Runtime publish 대상:

```text
client/public/assets/generated/characters/npc_battle/<thumbnail-id>.png
```

`npcBattleThumbnail`은 `64x96` 단일 프레임 PNG이며 animation tag를 요구하지 않는다. 전체 재생성은 다음 명령으로 실행한다.

```powershell
npm run art:npc:battle-thumbnails
```

일부만 다시 만들 때는 npc id 또는 thumbnail id를 지정한다.

```powershell
npm run art:npc:battle-thumbnails -- --ids 01_cryo,04_mateus_sprite
```

빌더는 `client/public/assets/generated/characters/npc_battle`의 파일명을 기준으로 Aseprite source를 만들고, export, JSON 정규화, PNG 검증, runtime publish, `sprite-production-roster.json` 병합까지 수행한다. 현재 GameScene runtime key는 `01_cryo`가 `npc_merchant_sprite`, `04_mateus`가 `npc_guide_sprite`다.

검증:

- `sprite-production-roster.json`은 `npcBattleThumbnail` 2개를 추적한다.
- `tests/unit/npcBattleThumbnailAssets.test.ts`가 runtime 폴더 전체의 파일 수, PNG 규격, JSON frame, 로스터 연결, GameScene key/path 계약을 검증한다.

## NPC Portrait Workflow

NPC portrait 원본은 `assets/source/aseprite/npcPortrait/{npc_id}` 아래에 둔다.

```text
assets/source/aseprite/npcPortrait/01_cryo/npc_portrait_01_cryo_portrait.aseprite
assets/source/aseprite/npcPortrait/30_time_echo/npc_portrait_30_time_echo_portrait.aseprite
```

Runtime publish 대상:

```text
client/public/assets/generated/characters/npc/<portrait-id>.png
```

`npcPortrait`은 `512x512` 단일 프레임 PNG이며 animation tag를 요구하지 않는다. 전체 재생성은 다음 명령으로 실행한다.

```powershell
npm run art:npc:portraits
```

일부만 다시 만들 때는 portrait id 또는 `npc-id`를 지정한다.

```powershell
npm run art:npc:portraits -- --ids npc_portrait_01_cryo_portrait,30_time_echo
```

빌더는 `client/public/assets/generated/characters/npc`의 파일명을 기준으로 Aseprite source를 만들고, export, JSON 정규화, PNG 검증, runtime publish, `sprite-production-roster.json` 병합까지 수행한다. 기존 `npc` 카테고리는 64x64 animation tag가 필요한 필드 NPC 스프라이트용으로 유지한다.

검증:

- `sprite-production-roster.json`은 `npcPortrait` 40개를 추적한다.
- `tests/unit/npcPortraitAssets.test.ts`가 runtime 폴더 전체의 파일 수, PNG 규격, JSON frame, 로스터 연결을 검증한다.

## NPC Sprite Workflow

NPC 256x384 스프라이트 원본은 `assets/source/aseprite/npcSprite/{npc_id}` 아래에 둔다.

```text
assets/source/aseprite/npcSprite/01_cryo/01_cryo_sprite.aseprite
assets/source/aseprite/npcSprite/30_time_echo/30_time_echo_sprite.aseprite
```

Runtime publish 대상:

```text
client/public/assets/generated/characters/npc_sprites/<sprite-id>.png
```

`npcSprite`는 `256x384` 단일 프레임 PNG이며 animation tag를 요구하지 않는다. 전체 재생성은 다음 명령으로 실행한다.

```powershell
npm run art:npc:sprites
```

일부만 다시 만들 때는 sprite id 또는 `npc-id`를 지정한다.

```powershell
npm run art:npc:sprites -- --ids 01_cryo_sprite,30_time_echo
```

빌더는 `client/public/assets/generated/characters/npc_sprites`에서 `^[0-9]{2}_.+_sprite.png$`이면서 `256x384`인 파일만 대상으로 삼는다. 같은 폴더의 `npc_ghost_merchant_gorodi.png`, `npc_elder_mateus.png` 같은 `384x64` 6프레임 field NPC sheet는 기존 `npc` 카테고리와 `spriteResourceManifest`가 계속 관리한다.

검증:

- `sprite-production-roster.json`은 `npcSprite` 40개를 추적한다.
- `tests/unit/npcSpriteAssets.test.ts`가 runtime 폴더의 256x384 NPC sprite 파일 수, PNG 규격, JSON frame, 로스터 연결을 검증한다.

## Status Icon 라이브러리

Status icon 원본은 `assets/source/aseprite/statusIcon/{debuff|control|buff|legacy_buff|legacy_debuff}/...` 아래에 둔다.

```text
assets/source/aseprite/statusIcon/debuff/status_poison.aseprite
assets/source/aseprite/statusIcon/buff/status_attack_up.aseprite
assets/source/aseprite/statusIcon/legacy_buff/STS-BUF-001.aseprite
assets/source/aseprite/statusIcon/legacy_debuff/STS-DBF-001.aseprite
```

런타임 산출물:

```text
client/public/assets/generated/ui/icons/status/<status-icon-id>.png
```

`statusIcon`은 `32x32` 단일 프레임 PNG이며 animation tag를 요구하지 않는다. 전체 재생성은 다음 명령으로 실행한다.

```powershell
npm run art:status:icons
```

일부 ID만 재생성할 수 있다.

```powershell
npm run art:status:icons -- --ids poison,STS-BUF-001,STS-DBF-020
```

빌더는 `client/public/assets/generated/ui/icons/status`의 파일명을 기준으로 15개 전투 상태이상 아이콘과 25개 legacy `STS-*` 아이콘을 읽고, `tools/aseprite-pipeline/scripts/create-status-effect-icon.lua`로 source `.aseprite`를 생성한 뒤 export, JSON 정규화, PNG 검증, runtime publish, `sprite-production-roster.json` 병합까지 수행한다. 클라이언트 preload는 `client/src/data/statusIconSpecs.ts`의 실제 파일명 SSOT를 사용한다.

현재 상태:

- Status icon 40개가 Aseprite source/export/runtime 경로에 생성되어 있다.
- `sprite-production-roster.json`은 `statusIcon` 40개를 추적한다.
- `BattleScene`은 방어 커맨드의 머리 위 상태 표시에서 `getStatusIconResource('shield')`를 조회하고, `status_shield_icon` texture가 있으면 `28x28` Aseprite image로 먼저 렌더한다. texture 누락 시에만 기존 `🛡` text fallback을 사용한다.
- `tests/unit/statusIconAssets.test.ts`가 runtime 폴더 전체의 파일 수, PNG 규격, JSON frame, 로스터 연결을 검증한다.
- `tests/unit/spriteResourceManifest.test.ts`가 `BattleScene` 방어 상태 표시의 Aseprite shield icon 우선 렌더 계약을 검증한다.

## Item Icon Workflow

Item icon 원본은 `assets/source/aseprite/itemIcon/{weapon|armor|accessory|consumable|material|quest}/...` 아래에 둔다. 각 아이콘은 `64x64` 단일 프레임 PNG이며 animation tag를 요구하지 않는다.

개별 export와 전체 검증은 다음 명령으로 실행한다.

```powershell
npm run art:aseprite:export -- itemIcon assets/source/aseprite/itemIcon/weapon/ITM-WPN-001.aseprite
npm run art:aseprite:validate
```

현재 런타임 계약:

- Runtime PNG는 `client/public/assets/generated/ui/icons/items/ITM-*.png` 경로에서 제공한다.
- `client/src/data/itemIconSpecs.ts`가 100개 `ITM-*` 아이콘의 `runtimeKey`/`runtimePath` SSOT다.
- `client/src/data/itemIconResources.ts`는 상점 legacy consumable 코드와 inventory item code를 Aseprite `ITM-*` 아이콘으로 해석한다.
- `LobbyScene.preload()`는 `preloadItemIconResources()`로 100개 texture를 preload한다.
- 상점/인벤토리 row는 texture가 있으면 `28x28` image icon을 표시하고, texture 누락 시 텍스트 row fallback만 남긴다.

현재 상태:

- Item icon 100개가 Aseprite source/export/runtime 경로에 생성되어 있다.
- `tests/unit/spriteResourceManifest.test.ts`가 item icon ID 해석, shop/inventory legacy code 매핑, `LobbyScene` preload/render 연결을 검증한다.
- In-app Browser QA는 `?debugScene=lobby&renderer=canvas&itemIconQa=shop`에서 `ITM-CON-001`부터 `ITM-CON-005`까지 렌더링, `?debugScene=lobby&renderer=canvas&itemIconQa=inventory`에서 `ITM-WPN-001`, `ITM-CON-003`, `ITM-MAT-002` 렌더링을 확인한다.

## 브러쉬와 팔레트 설정

프로젝트 기본 팔레트:

```text
assets/source/aseprite/palettes/aeterna-core.gpl
```

Aseprite에서 `Palette > Load Palette`로 위 GPL 파일을 불러온다. 브러쉬 수치와 작업 규칙은 다음 문서를 기준으로 맞춘다.

```text
assets/source/aseprite/brushes/README.md
```

핵심 프리셋은 `Pixel Pencil 1`, `Pixel Pencil 2`, `Shadow Block`, `Glow Dot`, `Hard Eraser` 다섯 개다. 모든 프리셋은 anti-aliasing 없는 hard edge 작업을 전제로 하며, NPC/캐릭터 기본 외곽선은 2px 검정으로 고정한다.

## NPC 파일럿: 유령 상인 Gorodi

Gorodi 파일럿 원본은 `assets/source/aseprite/npc/...` 아래에 둔다.

```text
assets/source/aseprite/npc/erebos/npc_ghost_merchant_gorodi.aseprite
```

현재 상태:

- Roster: `assets/source/aseprite/sprite-production-roster.json`
- Runtime manifest: `client/src/assets/spriteResourceManifest.ts`
- Runtime key: `npc_ghost_merchant_gorodi_sprite`
- Runtime path: `assets/generated/characters/npc_sprites/npc_ghost_merchant_gorodi.png`
- Status: `in-game-verified`

### 1) Roster 검증

```powershell
npm run art:sprite:roster
```

### 2) Export

```powershell
npm run art:aseprite:export -- npc assets/source/aseprite/npc/erebos/npc_ghost_merchant_gorodi.aseprite
```

예상 산출물:

- `assets/generated/aseprite/npc/npc_ghost_merchant_gorodi.png`
- `assets/generated/aseprite/npc/npc_ghost_merchant_gorodi.aseprite.json`

### 3) JSON 정규화

```powershell
node tools/aseprite-pipeline/normalize-aseprite-json.mjs `
  assets/generated/aseprite/npc/npc_ghost_merchant_gorodi.aseprite.json `
  assets/generated/aseprite/npc/npc_ghost_merchant_gorodi.json `
  npc_ghost_merchant_gorodi `
  npc_ghost_merchant_gorodi.png
```

정규화 JSON은 `atlas`, `image`, `size`, `sprites`, `tags`, `layers`, `count` 필드를 가진다.

### 4) 검증

```powershell
npm run art:aseprite:validate -- npc `
  assets/generated/aseprite/npc/npc_ghost_merchant_gorodi.png `
  assets/generated/aseprite/npc/npc_ghost_merchant_gorodi.json
```

검증은 PNG signature와 `IHDR`/`IDAT`/`IEND`, PNG 크기와 atlas `size` 일치, 모든 frame 좌표/크기, frame count, 필수 tag와 tag range를 확인한다.

### 5) Runtime publish

```powershell
Copy-Item `
  -LiteralPath assets/generated/aseprite/npc/npc_ghost_merchant_gorodi.png `
  -Destination client/public/assets/generated/characters/npc_sprites/npc_ghost_merchant_gorodi.png `
  -Force
```

`GameScene`은 `getSpriteResourceForNpc('npc_ghost_merchant')`로 위 리소스를 찾고, `load.spritesheet(..., { frameWidth: 64, frameHeight: 64 })`로 로드한 뒤 frame `0`을 필드 NPC 표시 프레임으로 사용한다.

## Town NPC 파일럿: Mateus, Mira, Kalen, Board, Hashir

Core town NPC 원본은 `assets/source/aseprite/npc/town/...` 아래에 둔다.

```text
assets/source/aseprite/npc/town/npc_elder_mateus.aseprite
assets/source/aseprite/npc/town/npc_merchant_mira.aseprite
assets/source/aseprite/npc/town/npc_blacksmith_kalen.aseprite
assets/source/aseprite/npc/town/npc_memory_fragment_board.aseprite
assets/source/aseprite/npc/town/npc_guild_hashir.aseprite
```

현재 상태:

- Runtime manifest: `client/src/assets/spriteResourceManifest.ts`
- Runtime paths: `assets/generated/characters/npc_sprites/npc_elder_mateus.png`, `npc_merchant_mira.png`, `npc_blacksmith_kalen.png`, `npc_memory_fragment_board.png`, `npc_guild_hashir.png`
- Status: `in-game-verified`
- Browser QA: `LobbyScene` texture load, frame `0` render, and dialogue `pointerdown` response verified on 2026-06-12

생성 스크립트는 `tools/aseprite-pipeline/scripts/create-town-npc-pilot.lua`를 사용한다.

```powershell
& "C:\Program Files (x86)\Steam\steamapps\common\Aseprite\Aseprite.exe" `
  -b `
  --script-param output=assets/source/aseprite/npc/town/npc_elder_mateus.aseprite `
  --script-param palette=assets/source/aseprite/palettes/aeterna-core.gpl `
  --script-param npc=elder_mateus `
  --script tools/aseprite-pipeline/scripts/create-town-npc-pilot.lua
```

`--script-param npc=` 값은 `elder_mateus`, `merchant_mira`, `blacksmith_kalen`, `memory_fragment_board`, `guild_hashir` 중 하나다. export/normalize/validate 순서는 Gorodi와 동일하며, `LobbyScene`은 `getSpriteResourceForLobbyNpc('elder' | 'merchant' | 'blacksmith' | 'quest_board' | 'party_recruit')`로 새 spritesheet를 먼저 로드하고 기존 PNG는 fallback으로만 사용한다.

## Monster 파일럿: Erebos Starting Trio

시작 필드 monster 파일럿 원본은 `assets/source/aseprite/monster/erebos/...` 아래에 둔다.

```text
assets/source/aseprite/monster/erebos/mon_erebos_fog_rat_normal.aseprite
assets/source/aseprite/monster/erebos/mon_erebos_memory_beetle_normal.aseprite
assets/source/aseprite/monster/erebos/mon_erebos_memory_dust_normal.aseprite
```

현재 상태:

- Runtime manifest: `client/src/assets/spriteResourceManifest.ts`
- Runtime paths: `assets/generated/monsters/sprites/mon_erebos_fog_rat_normal.png`, `mon_erebos_memory_beetle_normal.png`, `mon_erebos_memory_dust_normal.png`
- Runtime keys: `mon_erebos_fog_rat_normal_sprite`, `mon_erebos_memory_beetle_normal_sprite`, `mon_erebos_memory_dust_normal_sprite`
- Monster ids: `mon_erebos_fog_rat`, `mon_erebos_memory_beetle`, `mon_erebos_memory_dust`
- Status: `in-game-verified`
- Browser QA: `GameScene` field texture load plus `BattleScene` texture load, frame `0` render, and enemy display verified for `mon_erebos_fog_rat_normal`, `mon_erebos_memory_beetle_normal`, and `mon_erebos_memory_dust_normal`

생성 스크립트는 신규 파일은 `tools/aseprite-pipeline/scripts/create-erebos-monster-pilot.lua`, 기존 memory dust 파일럿은 `tools/aseprite-pipeline/scripts/create-memory-dust-monster-pilot.lua`를 사용한다.

```powershell
& "C:\Program Files (x86)\Steam\steamapps\common\Aseprite\Aseprite.exe" `
  -b `
  --script-param output=assets/source/aseprite/monster/erebos/mon_erebos_fog_rat_normal.aseprite `
  --script-param palette=assets/source/aseprite/palettes/aeterna-core.gpl `
  --script-param monster=fog_rat `
  --script tools/aseprite-pipeline/scripts/create-erebos-monster-pilot.lua

& "C:\Program Files (x86)\Steam\steamapps\common\Aseprite\Aseprite.exe" `
  -b `
  --script-param output=assets/source/aseprite/monster/erebos/mon_erebos_memory_beetle_normal.aseprite `
  --script-param palette=assets/source/aseprite/palettes/aeterna-core.gpl `
  --script-param monster=memory_beetle `
  --script tools/aseprite-pipeline/scripts/create-erebos-monster-pilot.lua

& "C:\Program Files (x86)\Steam\steamapps\common\Aseprite\Aseprite.exe" `
  -b `
  --script-param output=assets/source/aseprite/monster/erebos/mon_erebos_memory_dust_normal.aseprite `
  --script-param palette=assets/source/aseprite/palettes/aeterna-core.gpl `
  --script tools/aseprite-pipeline/scripts/create-memory-dust-monster-pilot.lua
```

export/normalize/validate 순서:

```powershell
npm run art:aseprite:export -- monster assets/source/aseprite/monster/erebos/mon_erebos_fog_rat_normal.aseprite
npm run art:aseprite:export -- monster assets/source/aseprite/monster/erebos/mon_erebos_memory_beetle_normal.aseprite
npm run art:aseprite:export -- monster assets/source/aseprite/monster/erebos/mon_erebos_memory_dust_normal.aseprite
node tools/aseprite-pipeline/normalize-aseprite-json.mjs `
  assets/generated/aseprite/monster/mon_erebos_fog_rat_normal.aseprite.json `
  assets/generated/aseprite/monster/mon_erebos_fog_rat_normal.json `
  mon_erebos_fog_rat_normal `
  mon_erebos_fog_rat_normal.png
node tools/aseprite-pipeline/normalize-aseprite-json.mjs `
  assets/generated/aseprite/monster/mon_erebos_memory_beetle_normal.aseprite.json `
  assets/generated/aseprite/monster/mon_erebos_memory_beetle_normal.json `
  mon_erebos_memory_beetle_normal `
  mon_erebos_memory_beetle_normal.png
node tools/aseprite-pipeline/normalize-aseprite-json.mjs `
  assets/generated/aseprite/monster/mon_erebos_memory_dust_normal.aseprite.json `
  assets/generated/aseprite/monster/mon_erebos_memory_dust_normal.json `
  mon_erebos_memory_dust_normal `
  mon_erebos_memory_dust_normal.png
npm run art:aseprite:validate -- monster `
  assets/generated/aseprite/monster/mon_erebos_fog_rat_normal.png `
  assets/generated/aseprite/monster/mon_erebos_fog_rat_normal.json
npm run art:aseprite:validate -- monster `
  assets/generated/aseprite/monster/mon_erebos_memory_beetle_normal.png `
  assets/generated/aseprite/monster/mon_erebos_memory_beetle_normal.json
npm run art:aseprite:validate -- monster `
  assets/generated/aseprite/monster/mon_erebos_memory_dust_normal.png `
  assets/generated/aseprite/monster/mon_erebos_memory_dust_normal.json
```

`GameScene`과 `BattleScene`은 `getSpriteResourceForMonster('mon_erebos_fog_rat' | 'mon_erebos_memory_beetle' | 'mon_erebos_memory_dust')`로 새 spritesheet를 먼저 로드한다. `GameScene`은 필드 표시 프레임 `0`을 먼저 사용하고 색 사각형/이모지는 누락 시 fallback으로만 생성한다. `BattleScene`은 기존 `assets/generated/monsters/normal/<id>_normal.png` 단일 PNG를 fallback으로만 사용한다. 전투 표시 프레임은 `0`이며 정상 몬스터 display scale은 `1.5`다.

## Monster 단일 이미지 라이브러리

전체 일반 몬스터 단일 이미지는 두 카테고리로 분리한다.

```text
assets/source/aseprite/monsterPortrait/{region}/<monster-id>.aseprite
assets/source/aseprite/monsterBattleIcon/{region}/<monster-id>.aseprite
```

런타임 산출물:

```text
client/public/assets/generated/monsters/normal/<monster-id>.png
client/public/assets/generated/monsters/battle/<monster-id>.png
```

`monsterPortrait`는 `256x256`, `monsterBattleIcon`은 `64x64` 단일 프레임 PNG다. 두 카테고리는 애니메이션 tag가 없으며, 기존 `monster` 카테고리의 `idle`/`attack`/`hit`/`death` 스프라이트시트와 충돌하지 않는다.

전체 재생성은 다음 명령으로 실행한다.

```powershell
npm run art:monster:images
```

일부 ID만 재생성할 때는 쉼표로 구분한다.

```powershell
npm run art:monster:images -- --ids mon_erebos_fog_rat_normal,mon_erebos_memory_beetle_normal
```

빌더는 현재 `client/public/assets/generated/monsters/normal` 폴더의 파일명을 기준으로 몬스터 ID를 읽고, `tools/aseprite-pipeline/scripts/create-monster-image.lua`로 source `.aseprite`를 생성한 뒤 export, JSON 정규화, PNG 검증, runtime publish, `sprite-production-roster.json` 병합까지 수행한다.

현재 상태:

- `normal` 120개와 `battle` 120개가 Aseprite source/export/runtime 경로에 생성되어 있다.
- `sprite-production-roster.json`은 `monsterPortrait` 120개와 `monsterBattleIcon` 120개를 추적한다.
- `tests/unit/monsterImageAssets.test.ts`가 runtime 폴더 전체의 파일 수, PNG 규격, 로스터 연결, 양쪽 ID 집합 일치를 검증한다.

### DungeonScene Monster Preview 연결

`DungeonScene`은 웨이브 preview 몬스터 6종을 `client/public/assets/generated/monsters/battle`의 기존 `monsterBattleIcon` PNG로 preload한다.

```text
client/public/assets/generated/monsters/battle/mon_erebos_ruin_skeleton_normal.png
client/public/assets/generated/monsters/battle/mon_erebos_fog_wolf_normal.png
client/public/assets/generated/monsters/battle/mon_erebos_memory_ghost_normal.png
client/public/assets/generated/monsters/battle/mon_erebos_broken_golem_normal.png
client/public/assets/generated/monsters/battle/mon_erebos_ruin_spider_normal.png
client/public/assets/generated/monsters/battle/mon_erebos_memory_absorber_normal.png
```

현재 상태:

- 일반 preview 5종은 `56x56` 표시 크기, 보스 preview 1종은 `80x80` 표시 크기로 렌더한다.
- 플레이어는 `characterSpriteManifest`의 Aseprite character sheet를 먼저 로드하고 frame `0`을 표시한다.
- `DungeonScene.preload()`는 `DUNGEON_MONSTER_PREVIEW_TEXTURES`를 순회해 Aseprite PNG를 먼저 로드한다.
- Aseprite PNG key가 없을 때만 기존 `dmon_*` generateTexture와 이모지 fallback을 생성한다.
- `tests/unit/dungeonMonsterPreviewAssets.test.ts`가 6개 runtime PNG의 `64x64` 규격, `monsterBattleIcon` 로스터 연결, `DungeonScene` preload/render 연결을 검증한다.

### BattleScene Monster Fallback 연결

`BattleScene`은 특정 몬스터 스프라이트나 legacy 단일 PNG가 없을 때 generic Aseprite fallback PNG를 먼저 사용한다. 기존 `_mon_prog_*` generateTexture와 이모지 fallback은 Aseprite PNG key가 없을 때만 생성하는 안전 경로로 남긴다.

```text
assets/source/aseprite/battleMonsterFallbackTexture/battle_monster_fallback.aseprite
assets/source/aseprite/battleMonsterBossFallbackTexture/battle_boss_fallback.aseprite
assets/generated/aseprite/battleMonsterFallbackTexture/battle_monster_fallback.png
assets/generated/aseprite/battleMonsterBossFallbackTexture/battle_boss_fallback.png
client/public/assets/generated/monsters/fallback/battle_monster_fallback.png
client/public/assets/generated/monsters/fallback/battle_boss_fallback.png
```

전체 재생성은 다음 명령으로 실행한다.

```powershell
npm run art:battle:monster-fallbacks
```

일부 ID만 재생성할 수 있다.

```powershell
npm run art:battle:monster-fallbacks -- --ids battle_monster_fallback,battle_boss_fallback
```

현재 상태:

- `battle_monster_fallback`은 `60x60`, `battle_boss_fallback`은 `90x90` 단일 프레임 Aseprite export다.
- `BattleScene.preload()`는 `BATTLE_MONSTER_FALLBACK_TEXTURES`를 순회해 두 PNG를 먼저 로드한다.
- `_spawnEnemies()`는 몬스터 manifest sprite, legacy `mon_battle_*` PNG, generic Aseprite fallback, procedural fallback 순서로 이미지를 선택한다.
- `tests/unit/battleMonsterFallbackTextureAssets.test.ts`가 runtime PNG 규격, JSON frame, 로스터 연결, `BattleScene` preload/render 연결을 검증한다.

## Monster 보스 단일 이미지 라이브러리

보스 단일 이미지는 일반 몬스터 단일 이미지와 별도 카테고리로 관리한다.

```text
assets/source/aseprite/monsterEliteBossPortrait/{region}/<boss-id>.aseprite
assets/source/aseprite/monsterRaidBossPortrait/{region}/<raid-boss-id>.aseprite
```

런타임 산출물:

```text
client/public/assets/generated/monsters/elite_boss/<boss-id>.png
client/public/assets/generated/monsters/raid_boss/<raid-boss-id>.png
```

`monsterEliteBossPortrait`는 `384x384`, `monsterRaidBossPortrait`는 `512x512` 단일 프레임 PNG다. 전체 재생성은 다음 명령으로 실행한다.

```powershell
npm run art:monster:boss-images
```

일부 그룹이나 ID만 재생성할 수 있다.

```powershell
npm run art:monster:boss-images -- --groups elite --ids BOSS-ERB-SHADOW
npm run art:monster:boss-images -- --groups raid --ids raid_boss_chronos_prime_phase1
```

빌더는 `client/public/assets/generated/monsters/elite_boss`와 `client/public/assets/generated/monsters/raid_boss`의 파일명을 기준으로 Aseprite source를 만들고, export, JSON 정규화, PNG 검증, runtime publish, `sprite-production-roster.json` 병합까지 수행한다.

현재 상태:

- `elite_boss` 70개와 `raid_boss` 38개가 Aseprite source/export/runtime 경로에 생성되어 있다.
- `sprite-production-roster.json`은 `monsterEliteBossPortrait` 70개와 `monsterRaidBossPortrait` 38개를 추적한다.
- `tests/unit/monsterBossImageAssets.test.ts`가 runtime 폴더 전체의 파일 수, PNG 규격, 로스터 연결을 검증한다.

## VFX 파일럿: Hit Slash

첫 VFX 파일럿 원본은 `assets/source/aseprite/vfx/common/...` 아래에 둔다.

```text
assets/source/aseprite/vfx/common/vfx_hit_slash.aseprite
```

현재 상태:

- Runtime manifest: `client/src/assets/spriteResourceManifest.ts`
- Runtime path: `assets/generated/vfx/sprites/vfx_hit_slash.png`
- Runtime key: `vfx_hit_slash_sprite`
- VFX id: `vfx_hit_slash`
- Status: `in-game-verified`
- Browser QA: `BattleScene` texture load and `_showHitVFX()` sprite animation instance verified on 2026-06-12

생성 스크립트는 `tools/aseprite-pipeline/scripts/create-hit-slash-vfx-pilot.lua`를 사용한다.

```powershell
& "C:\Program Files (x86)\Steam\steamapps\common\Aseprite\Aseprite.exe" `
  -b `
  --script-param output=assets/source/aseprite/vfx/common/vfx_hit_slash.aseprite `
  --script-param palette=assets/source/aseprite/palettes/aeterna-core.gpl `
  --script tools/aseprite-pipeline/scripts/create-hit-slash-vfx-pilot.lua
```

export/normalize/validate 순서:

```powershell
npm run art:aseprite:export -- vfx assets/source/aseprite/vfx/common/vfx_hit_slash.aseprite
node tools/aseprite-pipeline/normalize-aseprite-json.mjs `
  assets/generated/aseprite/vfx/vfx_hit_slash.aseprite.json `
  assets/generated/aseprite/vfx/vfx_hit_slash.json `
  vfx_hit_slash `
  vfx_hit_slash.png
npm run art:aseprite:validate -- vfx `
  assets/generated/aseprite/vfx/vfx_hit_slash.png `
  assets/generated/aseprite/vfx/vfx_hit_slash.json
```

`BattleScene`은 `getSpriteResourceForVfx('vfx_hit_slash')`로 새 spritesheet를 먼저 로드한다. `_showHitVFX()`는 `vfx_hit_slash_sprite` animation을 생성하고, 기존 프로그래매틱 원형 버스트는 fallback 겸 타격 보강 효과로 유지한다.

## VFX Runtime 라이브러리

AssetManager preload용 VFX 원본은 `assets/source/aseprite/vfx/library/{common|skills/<class_id>}/...` 아래에 둔다.

```text
assets/source/aseprite/vfx/library/common/VFX-CMN-001.aseprite
assets/source/aseprite/vfx/library/skills/ether_knight/VFX-ETH-001.aseprite
assets/source/aseprite/vfx/library/skills/void_wanderer/VFX-VOI-001.aseprite
```

런타임 산출물:

```text
client/public/assets/generated/vfx/common/<vfx-id>.png
client/public/assets/generated/vfx/skills/<class_id>/<vfx-id>.png
```

`vfx`는 `64x64` 프레임 8개를 가로로 export한 `512x64` 스트립이며 `start`, `loop`, `end` animation tag가 필수다. 전체 재생성은 다음 명령으로 실행한다.

```powershell
npm run art:vfx:library
```

일부 ID만 재생성할 수 있다.

```powershell
npm run art:vfx:library -- --ids common/VFX-CMN-001,skills/ether_knight/VFX-ETH-001
```

빌더는 `client/public/assets/generated/vfx/common`과 `client/public/assets/generated/vfx/skills/*`의 파일명을 기준으로 Aseprite source를 만들고, export, JSON 정규화, PNG 검증, runtime publish, `sprite-production-roster.json` 병합까지 수행한다. 기존 `client/public/assets/generated/vfx/sprites/vfx_hit_slash.png` 파일럿은 별도 manifest 기반 전투 VFX로 유지한다.

현재 상태:

- VFX runtime 210개가 Aseprite source/export/runtime 경로에 생성되어 있다.
- `sprite-production-roster.json`은 AssetManager preload용 `vfx` 210개와 기존 `vfx_hit_slash` 파일럿을 추적한다.
- `tests/unit/vfxLibraryAssets.test.ts`가 runtime 폴더 전체의 파일 수, PNG 규격, JSON frame/tag, 로스터 연결을 검증한다.

## Worldmap Icon 파일럿

월드맵 지역 아이콘 원본은 `assets/source/aseprite/worldmap/...` 아래에 둔다.

```text
assets/source/aseprite/worldmap/zone_aether_plains.aseprite
assets/source/aseprite/worldmap/zone_memory_forest.aseprite
assets/source/aseprite/worldmap/zone_malatus_sanctuary.aseprite
assets/source/aseprite/worldmap/zone_shadow_gorge.aseprite
assets/source/aseprite/worldmap/zone_crystal_cave.aseprite
assets/source/aseprite/worldmap/zone_forgotten_citadel.aseprite
assets/source/aseprite/worldmap/zone_chrono_spire.aseprite
```

현재 상태:

- Runtime manifest: `client/src/assets/spriteResourceManifest.ts`
- Runtime path: `assets/generated/ui/worldmap/<zone-key>.png`
- Runtime keys: `zone_aether_plains`, `zone_memory_forest`, `zone_malatus_sanctuary`, `zone_shadow_gorge`, `zone_crystal_cave`, `zone_forgotten_citadel`, `zone_chrono_spire`
- Status: `in-game-verified`
- Browser QA: seven icon textures load at `64x64`, render as `WorldScene` node images, and open the selected zone panel on 2026-06-12

생성 스크립트는 `tools/aseprite-pipeline/scripts/create-worldmap-zone-icon.lua`를 사용한다.

```powershell
& "C:\Program Files (x86)\Steam\steamapps\common\Aseprite\Aseprite.exe" `
  -b `
  --script-param output=assets/source/aseprite/worldmap/zone_aether_plains.aseprite `
  --script-param palette=assets/source/aseprite/palettes/aeterna-core.gpl `
  --script-param zone=aether_plains `
  --script tools/aseprite-pipeline/scripts/create-worldmap-zone-icon.lua
```

export/normalize/validate 순서는 다른 단일 프레임 리소스와 동일하다. `WorldScene`은 `getSpriteResourceForWorldZoneIcon(zone.id)`로 새 아이콘을 먼저 로드하고 기존 `assets/generated/ui/worldmap/<iconKey>.png` 경로는 fallback으로 유지한다.

## Skill Icon 파일럿: Ether Knight

에테르 기사 전투 HUD 스킬 아이콘 원본은 `assets/source/aseprite/skillIcon/ether_knight/...` 아래에 둔다.

```text
assets/source/aseprite/skillIcon/ether_knight/skill_ek_slash.aseprite
assets/source/aseprite/skillIcon/ether_knight/skill_ek_shield.aseprite
assets/source/aseprite/skillIcon/ether_knight/skill_ek_charge.aseprite
assets/source/aseprite/skillIcon/ether_knight/skill_ek_explode.aseprite
assets/source/aseprite/skillIcon/ether_knight/skill_ek_passive.aseprite
assets/source/aseprite/skillIcon/ether_knight/skill_ek_ultimate.aseprite
```

현재 상태:

- Runtime manifest: `client/src/assets/spriteResourceManifest.ts`
- Runtime path: `assets/generated/ui/icons/skills/<skill-icon-id>.png`
- Runtime keys: `skill_ek_slash_icon`, `skill_ek_shield_icon`, `skill_ek_charge_icon`, `skill_ek_explode_icon`, `skill_ek_passive_icon`, `skill_ek_ultimate_icon`
- Status: `in-game-verified`
- Browser QA: six icon textures load at `64x64` and render as visible `30x30` HUD slot images in `BattleScene` on 2026-06-12

생성 스크립트는 `tools/aseprite-pipeline/scripts/create-ether-knight-skill-icon.lua`를 사용한다.

```powershell
& "C:\Program Files (x86)\Steam\steamapps\common\Aseprite\Aseprite.exe" `
  -b `
  --script-param output=assets/source/aseprite/skillIcon/ether_knight/skill_ek_slash.aseprite `
  --script-param palette=assets/source/aseprite/palettes/aeterna-core.gpl `
  --script-param skill=skill_ek_slash `
  --script tools/aseprite-pipeline/scripts/create-ether-knight-skill-icon.lua
```

`BattleScene`은 `getSpriteResourceForSkillIcon(slot.icon)`으로 새 아이콘을 preload하고, `BattleUI`는 로드된 텍스처가 있을 때 슬롯 안에 `30x30` 이미지 아이콘을 먼저 표시한다.

## UI Frame 라이브러리

UI frame 원본은 `assets/source/aseprite/uiFrame/{theme}/{family}/...` 아래에 둔다.

```text
assets/source/aseprite/uiFrame/def/btn/UI-BTN-001-DEF.aseprite
assets/source/aseprite/uiFrame/dar/hud/UI-HUD-001-DAR.aseprite
assets/source/aseprite/uiFrame/sea/shp/UI-SHP-001-SEA.aseprite
```

런타임 산출물:

```text
client/public/assets/generated/ui/frames/<ui-frame-id>.png
```

`uiFrame`은 `512x512` 단일 프레임 PNG이며 animation tag를 요구하지 않는다. 전체 재생성은 다음 명령으로 실행한다.

```powershell
npm run art:ui:frames
```

일부 ID만 재생성할 수 있다.

```powershell
npm run art:ui:frames -- --ids UI-BTN-001-DEF,UI-HUD-001-DAR
```

빌더는 `client/public/assets/generated/ui/frames`의 파일명을 기준으로 Aseprite source를 만들고, export, JSON 정규화, PNG 검증, runtime publish, `sprite-production-roster.json` 병합까지 수행한다.

현재 상태:

- UI frame 90개가 Aseprite source/export/runtime 경로에 생성되어 있다.
- `sprite-production-roster.json`은 `uiFrame` 90개를 추적한다.
- `BattleScene.preload()`는 `UI-BTN-001-DEF`, `UI-HUD-008-DEF`, `UI-HUD-005-DEF`, `UI-BTN-006-DEF`를 `BattleUI` frame으로 preload하고, `BattleUI`는 로드된 frame을 전투 스킬 슬롯 배경, 우측 상단 로그 패널 배경, 스킬 hover tooltip 배경, 일시정지/도주 utility button 배경으로 먼저 표시한다.
- `BattleUI` utility button 내부 아이콘은 active pause 상태의 `skill_tg_stop.png`, paused/resume 상태의 `skill_mw_arrow.png`, 도주 상태의 `skill_vw_warp.png`를 `14x14` Aseprite image로 먼저 표시한다. pause 버튼은 `togglePause()` 상태에 맞춰 같은 image object의 texture를 stop/resume icon으로 교체하고, 아이콘이 있으면 label은 텍스트만 유지한다. texture 누락 시에만 기존 `⏸`, `▶`, `🏃` 기호/이모지 label fallback을 사용한다. `battleUtilityButtonFrameQa=1`는 `utilityButtonIcon.expectedTextureKeys`, `pauseIconTextureKey`, `pauseLabelLegacyGlyphPresent`, `missingUtilityButtonIconKeys`에 pause/resume/flee 아이콘 상태를 기록한다.
- `BattleScene` 마법/아이템 서브메뉴 focus marker는 `skill_mw_arrow.png`를 `14x14` Aseprite image `battle_submenu_focus_icon`으로 먼저 표시한다. 마법/아이템 row icon은 기존 skill/item Aseprite image를 유지하고, focus marker만 같은 image object를 이동시켜 label에는 `▶` prefix를 넣지 않는다. texture 누락 시에만 기존 `▶` prefix fallback을 사용한다. `battleSubMenuFocusIconQa=magic|item`는 `aeternaBattleSubMenuFocusIconQa`에 focus icon, active index, legacy glyph, missing key 상태를 기록한다.
- `BattleScene.preload()`는 `UI-HUD-001-DEF`, `UI-BTN-002-DEF`, `UI-BTN-003-DEF`, `UI-BTN-004-DEF`를 전투 하단 HUD, 커맨드 메뉴, 마법/스킬 서브메뉴, 아이템 서브메뉴 frame으로 preload하고, `_addBattleSceneFrame()`은 로드된 frame을 먼저 표시한다.
- `BattleScene.preload()`는 `UI-INV-005-DEF`와 `UI-INV-006-DEF`를 전투 결과/패배 팝업 frame으로 preload하고, `_showResultPopup()`/`_showDefeatPopup()`은 로드된 frame을 먼저 표시한다.
- `BattleScene.preload()`는 `UI-BTN-006-DEF`를 `ui_frame_battle_pace_button` key로 preload하고, `_addBattleSceneFrame()`은 AUTO/Speed/ATB 전투 페이싱 버튼 배경 frame 3개를 먼저 표시한다.
- `BattleScene.preload()`는 `UI-BTN-006-DEF`를 `ui_frame_battle_combo_tech_button` key로도 preload하고, 협공/3인 협공 후보 버튼 배경 frame 2개를 먼저 표시한다.
- `GameScene`의 `HudOverlay`는 `UI-HUD-007-DEF`, `UI-HUD-001-DEF`, `UI-HUD-008-DEF`, `UI-HUD-006-DEF`를 상태, 퀵슬롯, 퀘스트 트래커, 필드 대화창 DOM panel의 CSS background frame으로 먼저 표시하고, `UI-BTN-006-DEF`를 `ui_frame_hud_dom_button` 계약으로 quickslot/퀘스트 맵/대화 선택지 버튼 CSS background에 적용한다. 기본 퀵슬롯 12칸은 `spriteResourceManifest`의 skill icon PNG와 `itemIconResources`의 item icon PNG를 `img.slot-icon-image`로 먼저 표시하고, 상태 패널 아바타는 현재 class id에 맞는 `char_battle_*` PNG를 `img#hud-avatar-image`로 먼저 표시한다. 퀘스트 맵 버튼은 `QuestItem.mapZoneId`가 `getSpriteResourceForWorldZoneIcon()`으로 해석될 때만 `zone_<mapZoneId>.png`를 `img.hud-quest-map-icon` `16x16` 이미지로 표시한다. `frostmoss_sap`처럼 월드맵 리소스가 아닌 목표 ID는 버튼을 렌더하지 않고 action hint만 유지해 기존 `🗺` glyph fallback이 노출되지 않게 한다. 이미지 load 실패 시에만 quickslot은 기존 `◆` 텍스트 fallback을, 아바타는 숨김 fallback을 사용한다. `?debugScene=game&renderer=canvas&hudFrameQa=1`는 `document.body.dataset.aeternaHudFrameQa.quickSlotIcon`, `questMapIcon`, `hudAvatar`에 expected/rendered image count, natural size, 누락 key를 기록한다.
- `HudOverlay` 퀘스트 action hint marker는 `skill_mw_arrow.png` / `skill_mw_arrow_icon`을 `img.hud-quest-action-icon` `14x14` 이미지로 먼저 표시하고, 안내 문구는 `span.hud-quest-action-text`로 분리한다. skill icon 리소스가 없을 때만 `>` fallback을 사용하며, `hudFrameQa=1`는 `aeternaHudFrameQa.questActionIcon`과 `missingQuestActionIconKeys`에 expected/rendered image count, natural size, 누락 key를 기록한다.
- `ZoneTeleportManager`는 `UI-HUD-006-DEF`를 `ui_frame_zone_teleport_panel` key로, `UI-BTN-006-DEF`를 `ui_frame_zone_teleport_button` key로 preload/render해 필드 포탈 이동 panel과 이동/취소 button frame을 먼저 표시한다. 포탈명 제목 아이콘은 `skill_vw_warp.png`를 `zone_teleport_title_icon` `18x18` image로 먼저 표시하고, 이동/취소 action button 내부 아이콘은 `skill_mw_arrow.png`와 `skill_tg_reverse.png`를 `16x16` image로 먼저 표시한다. texture 누락 시에만 기존 `🌀` glyph fallback 또는 `[ 이동 ]`/`[ 취소 ]` bracket label fallback을 사용한다. `?debugScene=game&renderer=canvas&zoneTeleportFrameQa=1`는 `document.body.dataset.aeternaZoneTeleportFrameQa`에 panel/button frame, `titleIcon`, `actionButtonIcon`, `missingActionIconKeys`, `fallbackActionIconIds` 렌더 상태를 기록한다.
- `DungeonScene.preload()`는 `UI-HUD-007-DEF`, `UI-BTN-006-DEF`, `UI-INV-005-DEF`를 하단 상태 panel, 전투 시작 버튼, 클리어 보상 panel frame으로 preload하고, `_addDungeonFrame()`은 로드된 frame을 먼저 표시한다. 던전 제목 아이콘은 `skill_ek_slash.png`를 `dungeon_title_icon` `20x20` image로 먼저 표시하고, 전투 시작 버튼 내부 아이콘은 같은 리소스를 `dungeon_action_button_icon` `22x22` image로 먼저 표시한다. texture 누락 시에만 기존 `⚔` 제목 prefix와 `⚔ Battle!` label fallback을 사용한다. `?debugScene=dungeon&renderer=canvas&dungeonFrameQa=ready`는 `document.body.dataset.aeternaDungeonFrameQa.titleIcon`, `actionButtonIcon`, `missingTitleIconKeys`, `missingActionButtonIconKeys`에 던전 제목/전투 버튼 아이콘 렌더 상태를 기록한다.
- `DungeonScene` 퇴장/클리어 복귀 버튼은 `skill_tg_reverse.png` / `skill_tg_reverse_icon`을 각각 `dungeon_exit_action_icon` `16x16`, `dungeon_return_action_icon` `18x18` image로 먼저 표시한다. icon texture가 있으면 label은 `퇴장 (ESC)`와 `로비로 복귀`처럼 text-only로 유지하고, texture 누락 시에만 기존 `← 퇴장 (ESC)` / `[ 로비로 복귀 ]` fallback label을 사용한다. `?debugScene=dungeon&renderer=canvas&dungeonFrameQa=ready|clear`는 `aeternaDungeonFrameQa.exitActionIcon`, `returnActionIcon`, `missingExitActionIconKeys`, `missingReturnActionIconKeys`, `exitActionLegacyGlyphPresent`, `returnActionLegacyGlyphPresent`에 렌더 상태를 기록한다.
- `DungeonScene` 보스 경고 연출은 `skill_ek_explode.png` / `skill_ek_explode_icon`을 `dungeon_boss_warning_icon` `30x30` image로 먼저 표시한다. icon texture가 있으면 경고 text는 `WARNING\n보스 등장!`만 유지하고, texture 누락 시에만 기존 `⚠ WARNING ⚠\n보스 등장!` fallback label을 사용한다. `?debugScene=dungeon&renderer=canvas&dungeonFrameQa=boss`는 보스 경고 상태로 직접 진입해 `aeternaDungeonFrameQa.bossWarningIcon`, `bossWarningLegacyGlyphPresent`, `missingBossWarningIconKeys`에 렌더 상태를 기록한다.
- `LobbyScene.preload()`는 `UI-HUD-002-DEF`를 로비 미니맵 frame으로 preload하고, `_drawMinimap()`은 로드된 frame을 미니맵 배경으로 먼저 표시한다. 미니맵 NPC marker 5개는 기존 로비 NPC spritesheet frame 0을 `10x10` Aseprite image로 먼저 표시하고, texture 누락 시에만 기존 색상 원형 fallback을 사용한다. 하단 nav 버튼 5개는 `zone_aether_plains.png`, `zone_crystal_cave.png`, `ITM-CON-001.png`, `skill_ek_slash.png`, `ITM-QST-004.png`를 `18x18` Aseprite image로 먼저 표시하고, texture 누락 시에만 기존 이모지 label fallback을 사용한다. `?debugScene=lobby&renderer=canvas&lobbyMinimapMarkerQa=1`는 `document.body.dataset.aeternaLobbyMinimapMarkerQa`에 marker image/fallback 상태를, `lobbyNavIconQa=1`는 `document.body.dataset.aeternaLobbyNavIconQa`에 nav icon image/fallback 상태를 기록한다.
- `LobbyScene` 인벤토리 panel title은 `ITM-CON-001.png` / `icon_item_ITM-CON_001`을 `lobby_inventory_title_icon` `20x20` Aseprite image로 먼저 표시한다. title text는 `인벤토리 (N개)`처럼 텍스트만 유지하고, texture 누락 시에만 기존 `🎒` glyph title fallback을 사용한다. `?debugScene=lobby&renderer=canvas&inventoryTitleIconQa=1`는 `document.body.dataset.aeternaInventoryTitleIconQa`에 title icon 렌더 상태, 표시 크기, fallback 여부, legacy glyph 존재 여부를 기록한다.
- `LobbyScene` 인벤토리 panel action focus는 `skill_mw_arrow.png` / `skill_mw_arrow_icon`을 `lobby_inventory_action_focus_icon` `14x14` Aseprite image로 먼저 표시한다. focus 이동 시 같은 icon 위치만 현재 아이템 행 또는 `[ 닫기 ]` action 왼쪽으로 갱신하고 label은 텍스트만 유지한다. texture 누락 시에만 기존 `▶` text prefix fallback을 사용한다. `?debugScene=lobby&renderer=canvas&inventoryActionFocusIconQa=1`는 `document.body.dataset.aeternaInventoryActionFocusIconQa`에 focus icon 렌더 상태, active index, 표시 크기, fallback 여부, legacy glyph 존재 여부, 누락 key를 기록한다.
- `LobbyScene` 파티 모집 panel title은 `skill_ek_slash.png` / `skill_ek_slash_icon`을 `lobby_party_recruit_title_icon` `20x20` Aseprite image로 먼저 표시한다. title text는 `모험가 길드 — 파티 모집`처럼 텍스트만 유지하고, texture 누락 시에만 기존 `⚔️` glyph title fallback을 사용한다. `?debugScene=lobby&renderer=canvas&partyRecruitIconQa=1`는 `document.body.dataset.aeternaPartyRecruitIconQa`에 title icon 렌더 상태, 표시 크기, fallback 여부, legacy glyph 존재 여부를 기록한다.
- `LobbyScene` 파티 모집 panel action focus는 `skill_mw_arrow.png` / `skill_mw_arrow_icon`을 `lobby_party_action_focus_icon` `14x14` Aseprite image로 먼저 표시한다. focus 이동 시 같은 icon 위치만 `[ 파티 생성 ]`/`[ 파티 검색 ]`/`[ 닫기 ]` 사이에서 갱신하고 label은 텍스트만 유지한다. texture 누락 시에만 기존 `▶` text prefix fallback을 사용한다. `?debugScene=lobby&renderer=canvas&partyActionFocusIconQa=1`는 `document.body.dataset.aeternaPartyActionFocusIconQa`에 focus icon 렌더 상태, active index, 표시 크기, fallback 여부, legacy glyph 존재 여부, 누락 key를 기록한다.
- `LobbyScene` 상점 panel title은 `ITM-CON-001.png` / `icon_item_ITM-CON_001`을 `lobby_shop_title_icon` `20x20` Aseprite image로 먼저 표시한다. title text는 `상인 미라 — 아이템 상점`처럼 텍스트만 유지하고, texture 누락 시에만 기존 `🛒` glyph title fallback을 사용한다. `?debugScene=lobby&renderer=canvas&shopTitleIconQa=1`는 `document.body.dataset.aeternaShopTitleIconQa`에 title icon 렌더 상태, 표시 크기, fallback 여부, legacy glyph 존재 여부를 기록한다.
- `LobbyScene` 상점 panel action focus는 `skill_mw_arrow.png` / `skill_mw_arrow_icon`을 `lobby_shop_action_focus_icon` `14x14` Aseprite image로 먼저 표시한다. focus 이동 시 같은 icon 위치만 현재 `[구매]` 또는 `[ 닫기 ]` action 왼쪽으로 갱신하고 label은 텍스트만 유지한다. texture 누락 시에만 기존 `▶` text prefix fallback을 사용한다. `?debugScene=lobby&renderer=canvas&shopActionFocusIconQa=1`는 `document.body.dataset.aeternaShopActionFocusIconQa`에 focus icon 렌더 상태, active index, 표시 크기, fallback 여부, legacy glyph 존재 여부, 누락 key를 기록한다.
- `LobbyScene` 장비 강화 panel title은 `ITM-MAT-001.png` / `icon_item_ITM-MAT_001`을 `lobby_enhance_title_icon` `20x20` Aseprite image로 먼저 표시한다. title text는 `대장장이 칼렌 — 장비 강화`처럼 텍스트만 유지하고, texture 누락 시에만 기존 `🔨` glyph title fallback을 사용한다. `?debugScene=lobby&renderer=canvas&enhanceTitleIconQa=1`는 `document.body.dataset.aeternaEnhanceTitleIconQa`에 title icon 렌더 상태, 표시 크기, fallback 여부, legacy glyph 존재 여부를 기록한다.
- `LobbyScene` 장비 강화 panel action focus는 `skill_mw_arrow.png` / `skill_mw_arrow_icon`을 `lobby_enhance_action_focus_icon` `14x14` Aseprite image로 먼저 표시한다. focus 시 같은 icon을 `[ 닫기 ]` action 왼쪽에 유지하고 label은 텍스트만 유지한다. texture 누락 시에만 기존 `▶` text prefix fallback을 사용한다. `?debugScene=lobby&renderer=canvas&enhanceActionFocusIconQa=1`는 `document.body.dataset.aeternaEnhanceActionFocusIconQa`에 focus icon 렌더 상태, active index, 표시 크기, fallback 여부, legacy glyph 존재 여부, 누락 key를 기록한다.
- `LobbyScene` 메인 스토리 panel title은 `ITM-QST-001.png` / `icon_item_ITM-QST_001`을 `lobby_story_title_icon` `20x20` Aseprite image로 먼저 표시한다. title text는 `장로 마테우스 — 메인 스토리`처럼 텍스트만 유지하고, texture 누락 시에만 기존 `📖` glyph title fallback을 사용한다. `?debugScene=lobby&renderer=canvas&storyTitleIconQa=1`는 `document.body.dataset.aeternaStoryTitleIconQa`에 title icon 렌더 상태, 표시 크기, fallback 여부, legacy glyph 존재 여부를 기록한다.
- `LobbyScene` 메인 스토리 panel action focus는 `skill_mw_arrow.png` / `skill_mw_arrow_icon`을 `lobby_story_action_focus_icon` `14x14` Aseprite image로 먼저 표시한다. focus 이동 시 같은 icon 위치만 `[ 챕터 1 시작 ]`/`[ 닫기 ]` 사이에서 갱신하고 label은 텍스트만 유지한다. texture 누락 시에만 기존 `▶` text prefix fallback을 사용한다. `?debugScene=lobby&renderer=canvas&storyActionFocusIconQa=1`는 `document.body.dataset.aeternaStoryActionFocusIconQa`에 focus icon 렌더 상태, active index, 표시 크기, fallback 여부, legacy glyph 존재 여부, 누락 key를 기록한다.
- `LobbyScene` 퀘스트 panel title은 `ITM-QST-004.png` / `icon_item_ITM-QST_004`를 `lobby_quest_title_icon` `20x20` Aseprite image로 먼저 표시한다. title text는 `퀘스트 (서버 동기화)` 또는 `퀘스트 (로컬 QA 데이터)`처럼 텍스트만 유지하고, texture 누락 시에만 기존 `📜` glyph title fallback을 사용한다. `?debugScene=lobby&renderer=canvas&questTitleIconQa=1`는 `document.body.dataset.aeternaQuestTitleIconQa`에 title icon 렌더 상태, 표시 크기, fallback 여부, legacy glyph 존재 여부를 기록한다.
- `LobbyScene` 퀘스트 panel action focus는 `skill_mw_arrow.png` / `skill_mw_arrow_icon`을 `lobby_quest_action_focus_icon` `14x14` Aseprite image로 먼저 표시한다. focus 이동 시 같은 icon 위치만 `[ 수주 ]`/`[ 완료 ]`/`[ 새로고침 ]`/`[ 닫기 ]` action 왼쪽으로 갱신하고 label은 텍스트만 유지한다. texture 누락 시에만 기존 `▶` text prefix fallback을 사용한다. `?debugScene=lobby&renderer=canvas&questActionFocusIconQa=1`는 `document.body.dataset.aeternaQuestActionFocusIconQa`에 focus icon 렌더 상태, active index, 표시 크기, fallback 여부, legacy glyph 존재 여부, 누락 key를 기록한다.
- `Minimap`은 `UI-HUD-002-DEF`를 `ui_frame_minimap_panel` key로 preload하고, standalone 미니맵 panel frame을 먼저 표시한다. 플레이어 마커는 `char_battle_ether_knight.png`를 `10x14` Aseprite image로 먼저 표시하고, NPC/monster/portal/quest 마커는 `npc_merchant_mira.png`, `mon_erebos_memory_dust_normal.png`, `skill_vw_warp.png`, `ITM-QST-004.png`를 `10x10` Aseprite image로 먼저 표시한다. texture 누락 시에만 기존 원형 fallback을 사용한다. `?debugScene=minimap&renderer=canvas&minimapFrameQa=1`는 `document.body.dataset.aeternaMinimapFrameQa`에 panel frame, content inset, marker 렌더 상태, `playerMarkerIcon`, `dynamicMarkerIcon`, fallback id, 누락 key를 기록한다.
- `MinimapOverlay`는 `UI-HUD-002-DEF`를 `ui_frame_minimap_overlay_panel` key로 preload하고, 독립 미니맵 panel frame을 먼저 표시한다. 플레이어/NPC/monster/dungeon/quest/waypoint marker는 `char_battle_ether_knight.png`, `npc_ghost_merchant_gorodi.png`, `mon_erebos_memory_dust_normal.png`, `zone_crystal_cave.png`, `ITM-QST-004.png`, `skill_vw_warp.png`를 Aseprite image로 먼저 표시하고, texture 누락 시에만 기존 Graphics fallback을 사용한다. `?debugScene=minimapOverlay&renderer=canvas&minimapOverlayFrameQa=1`는 `document.body.dataset.aeternaMinimapOverlayFrameQa`에 프레임/마커 렌더 상태, `markerIcon`, fallback id, 누락 key를 기록한다.
- `NavigationManager`는 `skill_mw_arrow.png`를 `ui_navigation_direction_arrow` key로 preload하고, 화면 밖 웨이포인트/퀘스트 목표 방향 화살표를 Aseprite image로 먼저 표시한다. `?debugScene=navigationArrow&renderer=canvas&navigationArrowQa=1`는 `document.body.dataset.aeternaNavigationArrowFrameQa`에 image 렌더 상태와 절차 삼각형 fallback 사용 여부를 기록한다.
- `BattleScene`은 같은 `skill_mw_arrow.png`를 `skill_mw_arrow_icon` key로 preload하고, active commander 머리 위 턴 표시를 `28x28` 회전 image로 먼저 표시한다. texture 누락 시에만 기존 `▼` text fallback을 사용하며, `tests/unit/spriteResourceManifest.test.ts`가 이 계약을 검증한다.
- `BattleScene` 타겟 선택 커서는 같은 `skill_mw_arrow.png` / `skill_mw_arrow_icon`을 재사용하고, `battle_target_cursor_icon` `24x24` 회전 image를 선택 대상 머리 위에 먼저 표시한다. texture 누락 시에만 기존 `Graphics.strokeTriangle()` 절차 삼각형 fallback을 사용한다.
- `BattleScene` 상태 패널 HP critical marker는 `status_bleed.png` / `status_bleed_icon`을 재사용하고, `battle_hp_critical_icon_<unitId>` `12x12` image를 HP 25% 미만일 때 먼저 표시한다. texture 누락 또는 image 비활성화 시에만 기존 `⚠ HP` text fallback을 사용한다.
- `BattleScene` 커맨드 메뉴는 공격 `skill_ek_slash.png`, 마법 `skill_mw_bolt.png`, 아이템 `ITM-CON-001.png`, 방어 `status_shield.png`, 도주 `skill_vw_warp.png`를 command icon으로 preload/render한다. texture 누락 시에만 기존 이모지 label fallback을 사용하며, 커맨드 실행과 선택 highlight는 기존 Phaser UI 로직을 유지한다.
- `BattleScene` 커맨드 메뉴 focus는 같은 `skill_mw_arrow.png` / `skill_mw_arrow_icon`을 재사용하고, `battle_command_focus_icon` `14x14` Aseprite image를 먼저 표시한다. 키보드/포인터 focus 이동 시 같은 icon 위치만 현재 command 왼쪽으로 갱신하고 label은 `공격`, `마법`, `아이템`, `방어`, `도주` 텍스트만 유지한다. texture 누락 시에만 기존 `▶` text prefix fallback을 사용한다. `?debugScene=battle&renderer=canvas&battleCommandFocusIconQa=1`는 deterministic command menu를 열고 `document.body.dataset.aeternaBattleCommandFocusIconQa`에 focus icon 렌더 상태, active index, 표시 크기, fallback 여부, legacy glyph 존재 여부, 누락 key를 기록한다.
- `BattleScene` 마법/아이템 서브메뉴는 각 `SkillSlot.icon`의 skill icon PNG와 포션 `ITM-CON-001.png`를 row icon으로 먼저 렌더한다. 쿨다운 중인 마법 row는 `skill_tg_stop.png` / `skill_tg_stop_icon`을 `battle_magic_submenu_cooldown_icon_<skillId>` `14x14` image로 추가 표시하고, label은 `스킬명 CD Ns` 텍스트만 사용한다. 스킬/아이템 label, MP 비용, 쿨다운 초, 포션 회복 로그, pointer/keyboard 선택은 기존 동적 UI 로직을 유지하고, texture 누락 시에만 item row 이모지 label fallback을 사용한다. MP 부족 로그는 `BattleUI` log highlight에서 `skill_mw_passive.png` Aseprite icon을 먼저 표시하고, 포션 회복 로그는 `ITM-CON-001.png` Aseprite item icon을 먼저 표시한다. `💧`와 `🧪` glyph는 texture-missing/QA fallback source message에만 남긴다.
- `BattleScene` 전투 연결 상태 배지는 재연결 계열에 `skill_tg_stop.png` / `skill_tg_stop_icon`, 연결 실패에 `status_curse.png` / `status_curse_icon`을 `battle_connection_badge_icon` `16x16` image로 먼저 표시한다. 정상 label은 `재연결 중… 전투 일시정지`, `연결 실패 — 재시도 중`처럼 glyph 없는 텍스트만 유지하고, texture 누락 시에만 기존 `○`/`✕` fallback label을 사용한다. `?debugScene=battle&renderer=canvas&battleConnectionBadgeIconQa=reconnecting|error`는 `document.body.dataset.aeternaBattleConnectionBadgeIconQa`에 icon 렌더 상태, fallback 여부, legacy glyph 존재 여부, 누락 key를 기록한다.
- `LobbyScene.preload()`는 `UI-HUD-007-DEF`, `UI-HUD-008-DEF`, `UI-SHP-001-DEF`, `UI-SHP-002-DEF`, `UI-SHP-003-DEF`, `UI-INV-003-DEF`, `UI-INV-004-DEF`를 주요 모달 frame으로 preload하고, `_addLobbyModalFrame()`은 로드된 frame을 먼저 표시한다.
- `LobbyScene`은 `LOBBY_NPC_PORTRAIT_TEXTURES`로 로비 NPC 5종의 512x512 portrait PNG를 preload하고, 대화/스토리 패널에서 `_addLobbyNpcPortrait()`로 먼저 표시한다. 대장장이 칼렌, 상인 미라, 기억의 게시판, 모험가 길드, 장로 마테우스는 `client/public/assets/generated/characters/npc/npc_portrait_*_portrait.png`를 사용하며, texture 누락 시에만 기존 NPC sprite frame 0을 portrait fallback으로 표시한다.
- `LobbyScene` NPC 대화 panel title은 `LOBBY_NPC_PORTRAIT_TEXTURES[npc.id]`를 재사용해 title 왼쪽에 `lobby_dialogue_title_icon` `20x20` Aseprite image를 먼저 표시한다. title text는 NPC 이름만 유지하고, texture 누락 시에만 기존 `💬` glyph title fallback을 사용한다. `?debugScene=lobby&renderer=canvas&dialogueTitleIconQa=1`는 deterministic merchant dialogue를 열고 `document.body.dataset.aeternaDialogueTitleIconQa`에 title icon 렌더 상태, 표시 크기, fallback 여부, legacy glyph 존재 여부를 기록한다.
- `LobbyScene` NPC 대화 panel 선택 버튼은 `UI-BTN-006-DEF.png`를 `ui_frame_lobby_dialogue_choice_button` key로 preload하고, `이용하기`/`닫기` 버튼 뒤에 `lobby_dialogue_choice_button_frame` `108x34` Aseprite image 2개를 먼저 표시한다. pointer/keyboard callback과 focus label은 기존 Phaser text 로직을 유지하고, frame texture 누락 시에만 text-only fallback을 사용한다. `?debugScene=lobby&renderer=canvas&dialogueChoiceButtonFrameQa=1`는 deterministic merchant dialogue를 열고 `document.body.dataset.aeternaDialogueChoiceButtonFrameQa`에 button frame 렌더 상태, 표시 크기, fallback 여부, 누락 key를 기록한다.
- `LobbyScene` NPC 대화 panel 선택 focus는 `skill_mw_arrow.png` / `skill_mw_arrow_icon`을 preload하고, `lobby_dialogue_choice_focus_icon` `14x14` Aseprite image를 먼저 표시한다. focus 이동 시 icon 위치만 `이용하기`/`닫기` 사이에서 갱신하고 label은 `[ 이용하기 ]`, `[ 닫기 ]` 텍스트만 유지한다. texture 누락 시에만 기존 `▶` text prefix fallback을 사용한다. `?debugScene=lobby&renderer=canvas&dialogueChoiceFocusIconQa=1`는 deterministic merchant dialogue를 열고 `document.body.dataset.aeternaDialogueChoiceFocusIconQa`에 focus icon 렌더 상태, 표시 크기, fallback 여부, legacy glyph 존재 여부, 누락 key를 기록한다.
- `LobbyScene` 하단 nav focus는 `skill_mw_arrow.png` / `skill_mw_arrow_icon`을 재사용하고, `lobby_nav_focus_icon` `14x14` Aseprite image를 먼저 표시한다. focus 이동 시 같은 icon 위치만 현재 nav 항목 왼쪽으로 갱신하고 label은 `월드맵`, `던전`, `인벤토리`, `스킬`, `퀘스트` 텍스트만 유지한다. texture 누락 시에만 기존 `▶` text prefix fallback을 사용한다. `?debugScene=lobby&renderer=canvas&lobbyNavFocusIconQa=1`는 `document.body.dataset.aeternaLobbyNavFocusIconQa`에 focus icon 렌더 상태, active index, 표시 크기, fallback 여부, legacy glyph 존재 여부, 누락 key를 기록한다.
- `LobbyScene` 인벤토리 panel action focus는 같은 `skill_mw_arrow.png` / `skill_mw_arrow_icon`을 재사용하고, `lobby_inventory_action_focus_icon` `14x14` Aseprite image를 먼저 표시한다. 키보드 focus 이동 시 같은 icon 위치만 현재 아이템 행 또는 `[ 닫기 ]` action 왼쪽으로 갱신하고 label은 아이템명 또는 `[ 닫기 ]` 텍스트만 유지한다. texture 누락 시에만 기존 `▶` text prefix fallback을 사용한다. `?debugScene=lobby&renderer=canvas&inventoryActionFocusIconQa=1`는 deterministic inventory panel을 열고 `document.body.dataset.aeternaInventoryActionFocusIconQa`에 focus icon 렌더 상태, active index, 표시 크기, fallback 여부, legacy glyph 존재 여부, 누락 key를 기록한다.
- `LobbyScene` 파티 모집 panel action focus는 같은 `skill_mw_arrow.png` / `skill_mw_arrow_icon`을 재사용하고, `lobby_party_action_focus_icon` `14x14` Aseprite image를 먼저 표시한다. 키보드/포인터 focus 이동 시 같은 icon 위치만 현재 action 왼쪽으로 갱신하고 label은 `[ 파티 생성 ]`, `[ 파티 검색 ]`, `[ 닫기 ]` 텍스트만 유지한다. texture 누락 시에만 기존 `▶` text prefix fallback을 사용한다. `?debugScene=lobby&renderer=canvas&partyActionFocusIconQa=1`는 deterministic party recruit panel을 열고 `document.body.dataset.aeternaPartyActionFocusIconQa`에 focus icon 렌더 상태, active index, 표시 크기, fallback 여부, legacy glyph 존재 여부, 누락 key를 기록한다.
- `LobbyScene` 상점 panel action focus는 같은 `skill_mw_arrow.png` / `skill_mw_arrow_icon`을 재사용하고, `lobby_shop_action_focus_icon` `14x14` Aseprite image를 먼저 표시한다. 키보드/포인터 focus 이동 시 같은 icon 위치만 현재 action 왼쪽으로 갱신하고 label은 `[구매]`, `[ 닫기 ]` 텍스트만 유지한다. texture 누락 시에만 기존 `▶` text prefix fallback을 사용한다. `?debugScene=lobby&renderer=canvas&shopActionFocusIconQa=1`는 deterministic merchant shop panel을 열고 `document.body.dataset.aeternaShopActionFocusIconQa`에 focus icon 렌더 상태, active index, 표시 크기, fallback 여부, legacy glyph 존재 여부, 누락 key를 기록한다.
- `LobbyScene` 장비 강화 panel action focus는 같은 `skill_mw_arrow.png` / `skill_mw_arrow_icon`을 재사용하고, `lobby_enhance_action_focus_icon` `14x14` Aseprite image를 먼저 표시한다. 키보드/포인터 focus 시 같은 icon을 현재 action 왼쪽에 유지하고 label은 `[ 닫기 ]` 텍스트만 유지한다. texture 누락 시에만 기존 `▶` text prefix fallback을 사용한다. `?debugScene=lobby&renderer=canvas&enhanceActionFocusIconQa=1`는 deterministic blacksmith enhance panel을 열고 `document.body.dataset.aeternaEnhanceActionFocusIconQa`에 focus icon 렌더 상태, active index, 표시 크기, fallback 여부, legacy glyph 존재 여부, 누락 key를 기록한다.
- `LobbyScene` 메인 스토리 panel action focus는 같은 `skill_mw_arrow.png` / `skill_mw_arrow_icon`을 재사용하고, `lobby_story_action_focus_icon` `14x14` Aseprite image를 먼저 표시한다. 키보드/포인터 focus 이동 시 같은 icon 위치만 현재 action 왼쪽으로 갱신하고 label은 `[ 챕터 1 시작 ]`, `[ 닫기 ]` 텍스트만 유지한다. texture 누락 시에만 기존 `▶` text prefix fallback을 사용한다. `?debugScene=lobby&renderer=canvas&storyActionFocusIconQa=1`는 deterministic elder story panel을 열고 `document.body.dataset.aeternaStoryActionFocusIconQa`에 focus icon 렌더 상태, active index, 표시 크기, fallback 여부, legacy glyph 존재 여부, 누락 key를 기록한다.
- `LobbyScene` 퀘스트 panel action focus는 같은 `skill_mw_arrow.png` / `skill_mw_arrow_icon`을 재사용하고, `lobby_quest_action_focus_icon` `14x14` Aseprite image를 먼저 표시한다. 키보드 focus 이동 시 같은 icon 위치만 현재 수주/완료/새로고침/닫기 action 왼쪽으로 갱신하고 label은 `[ 수주 ]`, `[ 완료 ]`, `[ 새로고침 ]`, `[ 닫기 ]` 텍스트만 유지한다. texture 누락 시에만 기존 `▶` text prefix fallback을 사용한다. `?debugScene=lobby&renderer=canvas&questActionFocusIconQa=1`는 deterministic quest panel을 열고 `document.body.dataset.aeternaQuestActionFocusIconQa`에 focus icon 렌더 상태, active index, 표시 크기, fallback 여부, legacy glyph 존재 여부, 누락 key를 기록한다.
- `WorldScene.preload()`는 현재 지역의 `resolveZoneBackground().farPath` Aseprite 환경 배경을 전체 월드맵 배경으로 preload하고, `_addWorldBackground()`는 로드된 background image를 먼저 표시한다. `?debugScene=world&renderer=canvas&worldFrameQa=1`는 `document.body.dataset.aeternaWorldFrameQa`에 background image 렌더 상태를 기록한다.
- `WorldScene` 타이틀 지도 표식은 기존 Aseprite worldmap icon runtime PNG를 재사용한다. `zone_aether_plains.png`를 `24x24` image로 먼저 표시하고, texture 누락 시에만 기존 `🗺️` 텍스트 fallback을 유지한다. `worldFrameQa=1` 경로는 `aeternaWorldFrameQa.titleIcon`에 title icon 렌더 상태와 fallback 상태를 기록한다.
- `WorldScene.preload()`는 `UI-BTN-006-DEF`를 `ui_frame_world_action_button` key로 preload하고, `_addWorldActionButton()`은 Q/E 시대 전환, 마을 복귀, 시간 이동 버튼 frame 4개를 먼저 표시한다. `worldFrameQa=1` 경로는 선택 패널을 자동으로 열고 `aeternaWorldFrameQa.actionButtonFrame`에 4개 frame 렌더 상태를 기록한다.
- `WorldScene` 액션 버튼 내부 아이콘은 기존 Aseprite skill icon runtime PNG를 재사용한다. 이전 시대는 `skill_tg_reverse.png`, 다음 시대는 `skill_tg_haste.png`, 마을 복귀도 `skill_tg_reverse.png`, 시간 이동은 `skill_mw_arrow.png`를 `18x18` 이미지로 먼저 표시하고, texture 누락 시에만 `fallbackLabel`의 `◀`, `▶`, `←` 기호 포함 label을 사용한다. 마을 복귀와 이전 시대가 같은 reverse icon을 공유하므로 preload는 동일 texture key를 한 번만 큐잉한다. `worldFrameQa=1` 경로는 `aeternaWorldFrameQa.actionButtonIcon`과 `actionButtonText.labels`, `actionButtonText.legacyGlyphPresent`를 함께 기록해 icon-backed label이 `[Q]`, `[E]`, `마을로 돌아가기 (ESC)`, `시간 이동 (Enter)`처럼 text-only인지 검증한다.
- `WorldScene` 잠금 지역 마커는 기존 Aseprite status icon runtime PNG를 재사용한다. `unlocked: false` 지역은 `status_stun.png`를 `22x22` image로 먼저 표시하고, texture 누락 시에만 `🔒` 텍스트 fallback을 유지한다. `worldFrameQa=1` 경로는 `aeternaWorldFrameQa.lockedZoneIcon`에 2개 잠금 마커 렌더 상태를 기록한다.
- `WorldScene` 선택 지역 정보 패널의 지역 식별 마커는 기존 Aseprite worldmap icon runtime PNG를 재사용한다. 선택된 zone의 `zone_<zoneId>.png`를 `30x30` image로 먼저 표시하고, texture 누락 시에만 기존 `projection.tintColor` 원형 fallback을 유지한다. `worldFrameQa=1` 경로는 `aeternaWorldFrameQa.selectedZonePanelIcon`에 선택 패널 아이콘 렌더 상태를 기록한다.
- `WorldScene` 현재 위치 플레이어 마커는 기존 Aseprite character battle thumbnail runtime PNG를 재사용한다. 현재 class id의 `char_battle_<classId>.png`를 `24x36` image로 먼저 표시하고, texture 누락 시에만 기존 흰색 원형 fallback을 유지한다. `worldFrameQa=1` 경로는 `aeternaWorldFrameQa.playerMarkerAvatar`에 플레이어 마커 이미지 렌더 상태를 기록한다.
- `WorldScene.preload()`는 `UI-HUD-003-DEF`와 `UI-HUD-004-DEF`를 월드맵 선택 패널과 배경 프리뷰 frame으로 preload하고, `_onZoneClick()`은 로드된 frame을 먼저 표시한다.
- `MainMenuScene.preload()`는 `UI-SET-001-DEF`와 `UI-HUD-005-DEF`를 로그인/크레딧 모달 frame으로 preload하고, `UI-BTN-006-DEF`를 `ui_frame_main_menu_button`, `ui_frame_main_menu_modal_button`, `ui_frame_main_menu_modal_input` key로 preload해 타이틀 메뉴 버튼 3개, 로그인/가입/닫기 버튼 3개, 크레딧 닫기 버튼 1개, 로그인 DOM input 2개 배경 frame을 먼저 표시한다. 타이틀 메뉴 버튼 내부 아이콘은 `skill_mw_arrow.png`, `skill_tg_reverse.png`, `ITM-QST-004.png`를 `20x20` image로 먼저 표시하고, 메뉴 focus marker는 `skill_mw_arrow.png` / `skill_mw_arrow_icon`을 `main_menu_focus_icon` `14x14` image로 먼저 표시한다. focus 이동 시 image 위치만 현재 버튼 왼쪽으로 갱신하고 label은 텍스트만 유지한다. 로그인/크레딧 모달 닫기 액션은 `skill_tg_reverse.png`를 `16x16` image로 먼저 표시한다. texture 누락 시에만 기존 focus/glyph label 또는 작은 ASCII `x` fallback을 유지한다. `_showLoginUI()`와 `_showCreditsOverlay()`는 로드된 modal/action/input frame과 close icon을 먼저 표시하고, 메뉴 선택/키보드 포커스/인증 흐름은 동적 Phaser UI 로직으로 유지한다. `mainMenuFrameQa=1` 경로는 `aeternaMainMenuFrameQa.menuButtonIcon`, `menuFocusIcon`, `modalCloseIcon`, `missingMenuButtonIconKeys`, `missingMenuFocusIconKeys`, `menuLabelLegacyGlyphPresent`에 버튼/focus/닫기 아이콘 렌더 상태를 기록한다.
- `LoadingScene.preload()`는 `UI-HUD-005-DEF`와 `UI-BTN-005-DEF`를 중앙 로딩 panel과 progress track frame으로 preload하고, `_addLoadingFrame()`은 로드된 frame을 먼저 표시한다. Loading tip icon은 `skill_mw_bolt.png` / `skill_mw_bolt_icon`을 `18x18` Aseprite image로 먼저 표시하고, tip 본문은 glyph 없는 text로 유지한다. texture 누락 시에만 기존 `💡` prefix fallback을 사용한다. `?debugScene=loading&renderer=canvas`는 `aeternaLoadingFrameQa.tipIcon`에 icon 렌더 상태, legacy glyph, missing key를 기록한다.
- `SettingsScene.preload()`는 `UI-SET-002-DEF`, `UI-SET-003-DEF`, `UI-SET-004-DEF`를 설정 본문, 키바인드, 하단 액션 panel frame으로 preload하고, `UI-BTN-006-DEF`를 `ui_frame_settings_action_button` key로 preload해 피드백/뒤로가기 액션 버튼 frame 2개를 먼저 표시한다. `UI-BTN-005-DEF`는 `ui_frame_settings_slider_track` key로 preload해 BGM/SFX/자막 배경 불투명도 slider track frame 3개를 먼저 표시한다. `skill_mw_arrow.png`와 `skill_tg_reverse.png`는 피드백/뒤로가기 버튼 내부 `18x18` action icon으로 먼저 표시하고, 설정 항목 focus marker는 `skill_mw_arrow.png`를 `settings_focus_icon` `14x14` image로 재사용한다. texture가 있으면 slider/toggle/cycle label에는 `▶` prefix를 넣지 않고, texture 누락 시에만 legacy prefix fallback을 사용한다. fill bar, 값 갱신, 버튼 label/callback은 Phaser 동적 UI로 유지하며, `settingsFrameQa=1`은 `aeternaSettingsFrameQa.actionIcon`, `settingsFocusIcon`, `settingsFocusLabelLegacyGlyphPresent`, `missingSettingsFocusIconKeys`에 아이콘 렌더 상태를 기록한다.
- `FeedbackForm.preload()`는 `UI-SET-002-DEF`를 피드백 폼 panel frame으로 preload하고, `UI-BTN-006-DEF`를 `ui_frame_feedback_form_button` key로 preload해 유형 선택/제출/닫기 버튼 frame 7개를 먼저 표시한다. 제목 아이콘은 `skill_mw_arrow.png` / `skill_mw_arrow_icon`을 `feedback_form_title_icon` `22x22` image로 먼저 표시하고, 제출 버튼 아이콘은 같은 리소스를 `feedback_form_submit_icon` `20x20` image로 먼저 표시한다. 닫기 버튼 아이콘은 `skill_tg_reverse.png` / `skill_tg_reverse_icon`을 `feedback_form_close_icon` `18x18` image로 먼저 표시한다. texture 누락 시에만 작은 `>` 또는 `x` fallback을 사용한다. 유형 선택 버튼은 `status_poison.png`, `status_haste.png`, `status_shield.png`, `status_charm.png`, `status_stun.png`를 `18x18` image로 먼저 렌더하고, 유형 선택 focus는 `skill_mw_arrow.png` / `skill_mw_arrow_icon`을 `feedback_form_type_focus_icon` `14x14` image 하나로 먼저 표시한다. texture가 있으면 유형 label은 텍스트만 유지하고, texture 누락 시에만 기존 이모지 label 또는 `▶` focus prefix fallback을 사용한다. `?debugScene=feedback&renderer=canvas`는 `document.body.dataset.aeternaFeedbackFrameQa.titleIcon`, `missingTitleIconKeys`, `submitIcon`, `missingSubmitIconKeys`, `closeIcon`, `missingCloseIconKeys`, `typeIcon`, `typeFocusIcon`, `missingTypeFocusIconKeys`에 expected/rendered count, texture key, fallback id, 누락 key, legacy glyph 여부를 기록한다.
- `LobbyScene.preload()`와 `SkillTreeUI`는 `UI-SET-002-DEF`, `UI-SET-003-DEF`를 스킬 트리 main/detail panel frame으로 preload/render하고, `UI-BTN-006-DEF`를 `ui_frame_skill_tree_action_button` key로 preload해 main close/reset 및 detail unlock/upgrade/close action button frame을 먼저 표시한다. `LobbyScene.preload()`는 `preloadSkillTreeIconResources()`로 6개 클래스의 스킬 트리 node icon 후보를 함께 로드하고, `SkillTreeUI`는 각 node의 `skill.icon` 또는 tier fallback을 `spriteResourceManifest` skill icon으로 해석해 `48x48` Aseprite image를 먼저 표시한다. 제목 아이콘은 현재 클래스의 1티어 skill icon을 `20x20` image로 먼저 표시하고, 리셋 action button 내부 아이콘은 `skill_tg_reverse.png` / `skill_tg_reverse_icon`을 `18x18` image로 먼저 표시하며, 메인/상세 닫기 action button 내부 아이콘도 같은 리소스를 `16x16` image로 먼저 표시한다. 상세 패널의 분기/잠김 라인은 `skill_mw_storm.png` / `skill_mw_storm_icon`, `skill_tg_stop.png` / `skill_tg_stop_icon`을 `14x14` image로 먼저 표시한다. texture 누락 시에만 `>`, ASCII `x`, 또는 각 UI별 안전 label fallback을 사용한다. class color stroke, 선택 강조, 버튼 label/callback은 Phaser primitive와 동적 text로 유지하며, `?debugScene=lobby&renderer=canvas&skillTreeQa=1`는 `document.body.dataset.aeternaSkillTreeFrameQa`에 panel/action button frame 렌더 상태와 `titleIcon`, `skillNodeIcon`, `resetActionIcon`, `closeActionIcon`, `detailLineIcon` expected/rendered count, texture key, fallback state, 누락 key를 기록한다.
- `CharacterSelectScene.preload()`는 `UI-INV-001-DEF`와 `UI-INV-002-DEF`를 기존 캐릭터 row와 클래스 생성 card frame으로 preload하고, `UI-BTN-006-DEF`를 `ui_frame_character_select_name_input` 및 `ui_frame_character_select_action_button` key로 preload해 캐릭터명 DOM input CSS background와 생성 액션 버튼 frame을 먼저 표시한다. 기존 캐릭터 row avatar는 class id별 `char_battle_*.png` battle thumbnail을 `28x42` image로 먼저 표시하고, texture 누락 시에만 기존 색 원형 fallback을 사용한다. 로그아웃 버튼은 `skill_tg_reverse.png` / `skill_tg_reverse_icon`을 `character_select_logout_icon` `16x16` image로 먼저 표시하고 label은 `로그아웃` 텍스트만 유지하며, texture 누락 시에만 기존 `← 로그아웃` fallback을 사용한다. `_addCharacterSelectFrame()`은 로드된 card/button frame을 먼저 표시하고, `_createNameInput()`은 canvas CSS scale 기준으로 input 위치를 보정하며, `characterSelectFrameQa=1&characterSelectExistingQa=1`은 `aeternaCharacterSelectFrameQa.existingCharacterAvatar`, `logoutIcon`, `missingLogoutIconKeys`에 렌더 상태를 기록한다.
- `EndingScene.preload()`는 `UI-HUD-006-DEF`를 `ui_frame_ending_story_panel` key로, `UI-BTN-006-DEF`를 `ui_frame_ending_prompt_track` key로 preload해 엔딩 에필로그 story panel과 하단 입력 안내 track frame을 먼저 표시한다. 하단 입력 안내 track 내부 아이콘은 `skill_mw_arrow.png` / `skill_mw_arrow_icon`을 `16x16` Aseprite image로 먼저 표시하고, texture 누락 시에만 `>` text fallback을 사용한다. `_addEndingFrame()`은 로드된 frame을 먼저 표시하고, 본문 가독성 layer, 엔딩 CG, title/body/epilogue text, title 복귀 입력은 동적 Phaser UI로 유지한다. `?debugScene=ending&renderer=canvas&endingFrameQa=1`는 `document.body.dataset.aeternaEndingFrameQa.promptIcon`과 `missingPromptIconKeys`에 prompt icon 렌더 상태를 기록한다.
- `CutsceneScene.preload()`는 `UI-HUD-006-DEF`를 하단 대화 box frame으로, `UI-BTN-006-DEF`를 `ui_frame_cutscene_action_button` key의 스킵/다음 버튼 frame으로 preload하고, `_addCutsceneFrame()`/`_addCutsceneActionButton()`은 로드된 frame을 먼저 표시한다. 스킵/다음 버튼 내부 아이콘은 `skill_tg_haste.png`와 `skill_mw_arrow.png`를 `16x16` Aseprite image로 먼저 표시하고, texture 누락 시에만 기존 `[ 스킵 ]`, `다음 ▶` label fallback을 사용한다. `?debugScene=cutscene&renderer=canvas&cutsceneFrameQa=1`는 `document.body.dataset.aeternaCutsceneFrameQa`에 dialogue box/action button frame과 `actionButtonIcon` 렌더 상태를 기록한다.
- `DialogueBox`는 `UI-HUD-006-DEF`를 독립 NPC 대화 panel frame으로, `UI-BTN-006-DEF`를 선택지 button frame으로 preload/render한다. 다음 표시기는 `skill_mw_arrow.png`를 `16x16` Aseprite image로 먼저 표시하고, texture 누락 시에만 기존 `▼` glyph fallback을 사용한다. `?debugScene=dialogueBox&renderer=canvas&dialogueBoxFrameQa=1`는 `document.body.dataset.aeternaDialogueBoxFrameQa`에 panel/choice frame 렌더 상태를 기록하고, `dialogueBoxNextIndicatorQa=1`는 `nextIndicatorIcon`에 icon image/fallback 상태를 기록한다.
- `ChatUI`는 `UI-HUD-008-DEF`를 독립 채팅 panel frame으로, `UI-BTN-006-DEF`를 입력창 frame, 채널 탭 button frame, 이모지 button frame으로 preload/render한다. 이모지 button 내부 아이콘은 `status_charm.png` / `status_charm_icon`을 `16x16` Aseprite image로 먼저 표시하고, texture 누락 시에만 기존 `😀` glyph fallback을 사용한다. `?debugScene=chat&renderer=canvas&chatFrameQa=1`는 `document.body.dataset.aeternaChatFrameQa`에 panel/input/tab/emoji frame 렌더 상태와 `emojiButtonIcon` image/fallback 상태를 기록한다.
- `TutorialFlowManager`는 `UI-HUD-005-DEF`를 `ui_frame_tutorial_flow_panel` key로 preload하고, `UI-BTN-006-DEF`를 `ui_frame_tutorial_flow_skip_button` key로 preload해 튜토리얼 안내 panel frame과 스킵 버튼 frame을 먼저 표시한다. 스킵 버튼 내부 아이콘은 `skill_tg_haste.png` / `skill_tg_haste_icon`을 `16x16` image로 먼저 표시하고, texture 누락 시에만 기존 `[스킵] ESC` label fallback을 유지한다. 내부 `panelContentBounds`와 scrim을 기준으로 제목/본문/진행률/스킵 버튼을 프레임 장식선 안쪽에 배치하며, `?debugScene=tutorialFlow&renderer=canvas&tutorialFlowFrameQa=1`는 `document.body.dataset.aeternaTutorialFlowFrameQa`에 panel/skip button frame, `skipButtonIcon`, 현재 step 렌더 상태를 기록한다.
- `TutorialManager`는 `UI-HUD-005-DEF`를 `ui_frame_tutorial_manager_panel` key로, `UI-BTN-006-DEF`를 `ui_frame_tutorial_manager_action_button` key로 preload하고, legacy 5단계 DOM 튜토리얼 말풍선과 스킵/다음 button frame을 CSS background로 표시한다. DOM inline style asset URL은 single quote로 작성해야 HTML attribute quoting이 깨지지 않는다. `?debugScene=tutorialManager&renderer=canvas&tutorialManagerFrameQa=1`는 `document.body.dataset.aeternaTutorialManagerFrameQa`에 panel/action button frame, CSS background URL, 현재 step, 누락 key를 기록한다.
- `SceneTransitionManager.showLoadingIndicator()`는 `UI-HUD-005-DEF`를 `ui_frame_transition_loading_panel` key로, `UI-BTN-005-DEF`를 `ui_frame_transition_loading_spinner_track` key로 preload/render해 전환 로딩 panel과 spinner track frame을 먼저 표시한다. dimmer, arc spinner, loading text 점 애니메이션은 동적 Phaser UI로 유지하며, `?debugScene=transitionLoading&renderer=canvas&transitionLoadingFrameQa=1`는 `document.body.dataset.aeternaTransitionLoadingFrameQa`에 panel/spinner track frame 렌더 상태를 기록한다.
- `CoachmarkOverlay`는 `UI-HUD-005-DEF`를 `ui_frame_coachmark_panel` key로, `UI-BTN-006-DEF`를 `ui_frame_coachmark_action_button` key로 preload/render해 온보딩 코치마크 panel과 스킵/다음 action button frame을 먼저 표시한다. 스킵/다음 버튼 내부 아이콘은 `skill_tg_haste.png` / `skill_tg_haste_icon`과 `skill_mw_arrow.png` / `skill_mw_arrow_icon`을 `16x16` Aseprite image로 먼저 표시하고, texture 누락 시에만 텍스트 중심 label fallback을 사용한다. highlight, title/body/hint, advance trigger, skip callback은 Phaser 동적 UI로 유지하며, `?debugScene=coachmark&renderer=canvas&coachmarkFrameQa=1`는 `document.body.dataset.aeternaCoachmarkFrameQa`에 panel/action button frame과 `actionButtonIcon` 렌더 상태를 기록한다.
- `ComboUI`는 `UI-BTN-005-DEF`를 `ui_frame_combo_chain_gauge` key로 preload하고, 우측 상단 chain gauge track frame을 먼저 표시한다. 콤보 달성 라벨은 `skill_mw_storm.png` / `skill_mw_storm_icon`을 `28x28` Aseprite image로 먼저 표시하고, texture가 있으면 label은 `전격 강타!`처럼 텍스트만 사용한다. texture 누락 시에만 기존 `🔥 전격 강타!` fallback을 유지한다. hit counter, multiplier, gauge fill 색상/감소, hint row는 동적 Phaser UI로 유지하며, `?debugScene=combo&renderer=canvas&comboFrameQa=1`는 `document.body.dataset.aeternaComboFrameQa`에 chain gauge frame, hit count, gauge fill, hint 렌더 상태와 `comboAchievedIcon`, `comboTextLegacyGlyphPresent`, `missingComboAchievedIconKeys`를 기록한다.
- `tests/unit/uiFrameAssets.test.ts`가 runtime 폴더 전체의 파일 수, PNG 규격, 로스터 연결, BattleScene/BattleUI 전투 슬롯/로그 패널/스킬 tooltip/utility button, pause/resume/flee utility icon texture 상태와 하단 HUD/커맨드/서브메뉴/결과/패배 팝업/페이싱/협공 버튼 연결, GameScene/HudOverlay 필드 HUD DOM panel/button/quickslot icon/status avatar 연결, DungeonScene 상태/title/action/보상 frame 연결, LobbyScene 미니맵/하단 nav icon/주요 모달/NPC portrait 연결, Minimap standalone panel 및 플레이어/dynamic marker image 연결, MinimapOverlay 독립 panel 연결, NavigationManager 방향 화살표 image 연결, DialogueBox 독립 panel/choice button/next indicator icon 연결, ChatUI 독립 panel/input/tab/emoji button/emoji icon 연결, TutorialFlowManager 안내 panel/skip button 연결, TutorialManager DOM panel/action button 연결, Transition loading panel/spinner track 연결, CoachmarkOverlay panel/action button/action icon 연결, ComboUI chain gauge 연결, WorldScene title icon/선택 패널 연결, LoadingScene panel/progress track/tip icon 연결, SettingsScene panel/action button/action icon/focus marker 연결, FeedbackForm panel/button/title/submit/close/type icon 연결, SkillTreeUI panel/detail/action button/node icon/reset action icon 연결, CharacterSelectScene card/name input/action button/existing avatar/logout icon 연결, CutsceneScene dialogue box/action button 연결을 검증한다. `tests/unit/spriteResourceManifest.test.ts`는 BattleScene 마법/아이템 서브메뉴 focus marker가 `skill_mw_arrow.png` image를 먼저 사용하고 `▶` prefix는 fallback으로만 남는 계약을 추가로 검증한다.
- `tests/unit/mainMenuAsepriteAssets.test.ts`가 MainMenu 배경, 타이틀 입자, 로그인/크레딧 모달 frame 연결을 검증한다.

## Cosmetic 라이브러리

Cosmetic 원본은 `assets/source/aseprite/cosmetic/season{n}/{kind}/...` 아래에 둔다.

```text
assets/source/aseprite/cosmetic/season1/wpn/COS-WPN_01.aseprite
assets/source/aseprite/cosmetic/season2/aura/COS-AURA_S2_01.aseprite
assets/source/aseprite/cosmetic/season3/title/COS-TITLE_S3_01.aseprite
```

런타임 산출물:

```text
client/public/assets/generated/cosmetics/season1/<cosmetic-id>.png
client/public/assets/generated/cosmetics/season2/<cosmetic-id>.png
client/public/assets/generated/cosmetics/season3/<cosmetic-id>.png
```

`cosmetic`은 `512x512` 단일 프레임 PNG이며 animation tag를 요구하지 않는다. 전체 재생성은 다음 명령으로 실행한다.

```powershell
npm run art:cosmetics
```

일부 ID만 재생성할 수 있다.

```powershell
npm run art:cosmetics -- --ids season1/COS-WPN_01,season2/COS-AURA_S2_01
```

빌더는 `client/public/assets/generated/cosmetics/season*`의 파일명을 기준으로 Aseprite source를 만들고, export, JSON 정규화, PNG 검증, runtime publish, `sprite-production-roster.json` 병합까지 수행한다. 클라이언트 preload는 `client/src/data/cosmeticAssetSpecs.ts`의 실제 파일명 SSOT만 사용한다.

현재 상태:

- Cosmetic 150개가 Aseprite source/export/runtime 경로에 생성되어 있다.
- `sprite-production-roster.json`은 `cosmetic` 150개를 추적한다.
- `tests/unit/cosmeticAssets.test.ts`가 runtime 폴더 전체의 파일 수, PNG 규격, 로스터 연결, preload SSOT 일치를 검증한다.

## Environment Object 라이브러리

Environment object 원본은 `assets/source/aseprite/environmentObject/{region}/...` 아래에 둔다.

```text
assets/source/aseprite/environmentObject/aether/aether_tree_01.aseprite
assets/source/aseprite/environmentObject/erb/erb_ruin_pillar.aseprite
assets/source/aseprite/environmentObject/tem/tem_time_shard.aseprite
```

런타임 산출물:

```text
client/public/assets/generated/environment/objects/<environment-object-id>.png
```

`environmentObject`는 `256x256` 투명 단일 프레임 PNG이며 animation tag를 요구하지 않는다. 전체 재생성은 다음 명령으로 실행한다.

```powershell
npm run art:environment:objects
```

일부 ID만 재생성할 수 있다.

```powershell
npm run art:environment:objects -- --ids aether_tree_01,erb_ruin_pillar
```

빌더는 `client/public/assets/generated/environment/objects`의 파일명을 기준으로 Aseprite source를 만들고, export, JSON 정규화, PNG 검증, runtime publish, `sprite-production-roster.json` 병합까지 수행한다.

현재 상태:

- Environment object 30개가 Aseprite source/export/runtime 경로에 생성되어 있다.
- `sprite-production-roster.json`은 `environmentObject` 30개를 추적한다.
- `GameScene.preload()`는 현재 존의 `ZONE_ENV_CONFIG.objects`만 preload하고, `_placeEnvironmentObjects()`는 Aseprite PNG를 bottom-center origin, seeded placement, Y-depth 정렬로 필드에 배치한다.
- `?debugScene=game&renderer=canvas&zone=aether_plains&envObjectQa=1`는 `document.body.dataset.aeternaEnvObjectQa`에 expected/rendered count와 누락 texture key를 기록한다.
- `tests/unit/environmentObjectAssets.test.ts`가 `ZONE_ENV_CONFIG` 참조, runtime 폴더 전체의 파일 수, PNG 규격, 로스터 연결, GameScene preload/render/QA route 연결을 검증한다.

## Fallback Texture Runtime Library

공용 placeholder texture는 에셋 누락 시 디버그/안전 표시로 쓰는 최후 fallback이다. 기존 `AssetManager.createPlaceholders()`의 즉석 마젠타 박스 대신 Aseprite runtime PNG를 먼저 로드하고, 해당 PNG 로드가 실패했을 때만 procedural fallback을 생성한다.

```text
assets/source/aseprite/fallbackTexture/placeholder.aseprite
assets/source/aseprite/fallbackTextureSmall/placeholder_sm.aseprite
assets/generated/aseprite/fallbackTexture/placeholder.png
assets/generated/aseprite/fallbackTextureSmall/placeholder_sm.png
client/public/assets/generated/ui/placeholders/placeholder.png
client/public/assets/generated/ui/placeholders/placeholder_sm.png
```

전체 재생성은 다음 명령으로 실행한다.

```powershell
npm run art:fallback:textures
```

일부 ID만 재생성할 수 있다.

```powershell
npm run art:fallback:textures -- --ids placeholder,placeholder_sm
```

빌더는 `tools/aseprite-pipeline/scripts/create-fallback-texture.lua`로 source를 만들고, export, JSON 정규화, PNG 검증, runtime publish, `sprite-production-roster.json` 병합까지 수행한다.

현재 상태:

- Fallback texture 2개가 Aseprite source/export/runtime 경로에 생성되어 있다.
- `sprite-production-roster.json`은 `fallbackTexture` 1개와 `fallbackTextureSmall` 1개를 추적한다.
- `AssetManager.createPlaceholders()`는 `placeholder`와 `placeholder_sm` PNG를 preload하고, loader 완료 후 누락된 key에 한해서 procedural fallback을 생성한다.
- `tests/unit/fallbackTextureAssets.test.ts`가 runtime PNG 규격, JSON frame, 로스터 연결, AssetManager 경로 연결을 검증한다.

## Effect Fallback Texture Runtime Library

전투 이펙트 fallback texture는 `effects` atlas가 없거나 개별 프레임을 찾지 못했을 때 `EffectManager`가 사용하는 최후 안전 이미지다. 기존 `generateTexture()` 원형/사각형 대신 Aseprite runtime PNG를 `BattleScene.preload()`에서 먼저 로드하고, PNG 로드가 실패했을 때만 procedural fallback을 생성한다.

```text
assets/source/aseprite/effectFallbackTexture/hit_fallback_slash.aseprite
assets/source/aseprite/effectFallbackTexture/hit_fallback_blunt.aseprite
assets/source/aseprite/effectFallbackTexture/hit_fallback_magic.aseprite
assets/source/aseprite/effectFallbackTextureSmall/buff_fallback.aseprite
assets/generated/aseprite/effectFallbackTexture/hit_fallback_slash.png
assets/generated/aseprite/effectFallbackTextureSmall/buff_fallback.png
client/public/assets/generated/vfx/fallback/hit_fallback_slash.png
client/public/assets/generated/vfx/fallback/buff_fallback.png
```

전체 재생성은 다음 명령으로 실행한다.

```powershell
npm run art:effect:fallbacks
```

일부 ID만 재생성할 수 있다.

```powershell
npm run art:effect:fallbacks -- --ids hit_fallback_slash,buff_fallback
```

빌더는 `tools/aseprite-pipeline/scripts/create-effect-fallback-texture.lua`로 source를 만들고, export, JSON 정규화, PNG 검증, runtime publish, `sprite-production-roster.json` 병합까지 수행한다.

현재 상태:

- Effect fallback texture 4개가 Aseprite source/export/runtime 경로에 생성되어 있다.
- `sprite-production-roster.json`은 `effectFallbackTexture` 3개와 `effectFallbackTextureSmall` 1개를 추적한다.
- `BattleScene.preload()`는 `EFFECT_FALLBACK_TEXTURES` 목록을 preload하고, `EffectManager.ensureFallbackTextures()`는 누락된 key에 한해서만 procedural fallback을 생성한다.
- `EffectManager` 풀링 damage text는 `skill_ek_explode.png`와 `skill_mw_storm.png`를 `20x20` Aseprite image로 먼저 붙이고, 숫자/협공명 text는 glyph prefix 없이 유지한다. `preloadEffectTextIconResources(scene, queuedTextureKeys)`는 `BattleScene`의 기존 skill icon preload set을 공유해 loader 중복 큐잉을 막는다.
- `tests/unit/effectFallbackTextureAssets.test.ts`가 runtime PNG 규격, JSON frame, 로스터 연결, BattleScene preload, EffectManager fallback 경로와 damage/dual-tech text icon 계약을 검증한다.

## Environment Particle Texture Runtime Library

환경 파티클 texture는 `TransitionEffects.VfxPlayer.createEnvironmentParticles()`가 비/눈/에테르 광선 이미터에 사용하는 단일 프레임 PNG다. 기존 `generateTexture()` 사각형/원형 대신 Aseprite runtime PNG를 먼저 사용하고, PNG key가 없을 때만 procedural fallback을 생성한다.

```text
assets/source/aseprite/environmentParticleRainTexture/particle_rain.aseprite
assets/source/aseprite/environmentParticleSnowTexture/particle_snow.aseprite
assets/source/aseprite/environmentParticleEtherBeamTexture/particle_ether_beam.aseprite
assets/generated/aseprite/environmentParticleRainTexture/particle_rain.png
assets/generated/aseprite/environmentParticleSnowTexture/particle_snow.png
assets/generated/aseprite/environmentParticleEtherBeamTexture/particle_ether_beam.png
client/public/assets/generated/vfx/particles/particle_rain.png
client/public/assets/generated/vfx/particles/particle_snow.png
client/public/assets/generated/vfx/particles/particle_ether_beam.png
```

전체 재생성은 다음 명령으로 실행한다.

```powershell
npm run art:environment:particles
```

일부 ID만 재생성할 수 있다.

```powershell
npm run art:environment:particles -- --ids particle_rain,particle_snow
```

현재 상태:

- Environment particle texture 3개가 Aseprite source/export/runtime 경로에 생성되어 있다.
- `sprite-production-roster.json`은 `environmentParticleRainTexture`, `environmentParticleSnowTexture`, `environmentParticleEtherBeamTexture`를 각각 1개씩 추적한다.
- `BattleScene.preload()`는 `preloadEnvironmentParticleTextures(scene)`를 호출해 세 PNG를 전투 VFX 경로에 preload하고, `VfxPlayer.createEnvironmentParticles()`는 누락된 key에 한해서만 procedural fallback을 생성한다.
- `MainMenuScene.preload()`는 `particle_ether_beam.png`를 타이틀 입자 texture로 preload하고, `_spawnAetherParticles()`는 누락된 key에 한해서만 rectangle fallback을 생성한다.
- `tests/unit/environmentParticleTextureAssets.test.ts`가 runtime PNG 규격, JSON frame, 로스터 연결, BattleScene preload, TransitionEffects render/fallback 경로 연결을 검증한다.

## Story CG Runtime Library

스토리 CG는 챕터 타이틀, 패배, 엔딩 화면에 직접 로드되는 `1216x832` 단일 PNG다. `client/public/assets/generated`가 아니라 기존 런타임 경로인 `client/public/assets/cg`에 publish한다.

```text
assets/source/aseprite/storyCg/chapters/ch1_erebos.aseprite
assets/source/aseprite/storyCg/ending/ending_d_return.aseprite
assets/generated/aseprite/storyCg/ch1_erebos.png
client/public/assets/cg/chapters/ch1_erebos.png
client/public/assets/cg/ending_d_return.png
```

전체 재생성은 다음 명령으로 실행한다.

```powershell
npm run art:story:cg
```

일부 ID만 재생성할 수 있다.

```powershell
npm run art:story:cg -- --ids ch1_erebos,ending_d_return
```

빌더는 `client/public/assets/cg`의 현재 runtime PNG 목록을 기준으로 Aseprite source를 만들고, export, JSON 정규화, PNG 검증, runtime publish, `sprite-production-roster.json` 병합까지 수행한다. `chapters/*`는 `assets/source/aseprite/storyCg/chapters`, `ending_*`과 `defeat_*`는 `assets/source/aseprite/storyCg/ending` 아래에서 관리한다.

현재 상태:

- Story CG 10개가 Aseprite source/export/runtime 경로에 생성되어 있다.
- `sprite-production-roster.json`은 `storyCg` 10개를 추적한다.
- `tests/unit/storyCgAssets.test.ts`가 챕터/패배/엔딩 CG runtime 파일, `1216x832` PNG 규격, GameScene/EndingScene 경로 참조, 로스터 연결을 검증한다.
- `tests/unit/runtimeImageRosterCoverage.test.ts`가 atlas 파생물과 Aseprite export mirror를 제외한 public runtime PNG 전체가 `sprite-production-roster.json` 또는 `character-sprite-roster.json`에 연결되어 있는지 검증한다.
- `tests/unit/runtimeImageReferenceCoverage.test.ts`가 `client/src`의 TS/TSX/JSON/CSS/HTML image literal을 스캔해 public 파일 존재와 Aseprite roster 연결을 검증한다.

## Runtime Atlas 파생물

Atlas PNG/JSON은 사람이 직접 편집하는 Aseprite source가 아니라, 이미 검증된 개별 Aseprite runtime PNG를 묶은 파생 산출물이다.

```text
assets/generated/atlas/atlas_icon_status.png
assets/generated/atlas/atlas_cosmetic_s1.json
client/public/assets/atlas/atlas_icon_status.png
client/public/assets/atlas/atlas_cosmetic_s1.json
```

전체 재패킹은 다음 명령으로 실행한다.

```powershell
npm run art:atlas:pack
```

`tools/aseprite-pipeline/run-atlas-packer.mjs`는 Pillow가 설치된 Python을 찾는다. 기본 `python`에 Pillow가 없으면 Codex 번들 Python을 사용하고, 고정 경로가 필요하면 `AETERNA_PYTHON_EXE`를 지정한다.

```powershell
$env:AETERNA_PYTHON_EXE="C:\Users\<user>\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
npm run art:atlas:pack
```

재패킹 규칙:

- source는 `assets/generated/...` 아래의 개별 PNG다.
- output은 `assets/generated/atlas/atlas_*.png/json`에 저장하고, 같은 파일을 `client/public/assets/atlas`로 publish한다.
- `characters.png`, `effects.png`, `ui.png` legacy alias는 Phaser `load.atlas()` 호환 TexturePacker JSON으로 별도 재생성한다. 이 alias들은 `atlas_*` 커스텀 메타 스키마를 복사하지 않고, 기존 프레임 키(`hit_slash_01`, `btn_normal` 등)를 유지한 채 Aseprite runtime PNG에서 픽셀을 가져온다.
- packer는 atlas 크기에 들어가지 못한 이미지가 있으면 실패한다. 이전처럼 49/50 형태로 조용히 누락하는 산출물을 허용하지 않는다.

검증:

- `tests/unit/atlasPackerAssets.test.ts`가 50개 `atlas_*` PNG/JSON의 public publish copy, size/count/bounds, source 파일 수 일치와 3개 core alias의 Phaser 호환 JSON/frame key를 검증한다.
- `tests/unit/runtimeImageRosterCoverage.test.ts`는 public runtime PNG coverage를 전역 QA 게이트로 검증하되, atlas 파생물과 `assets/generated/aseprite` export mirror는 직접 runtime SSOT가 아니므로 제외한다.
- `tests/unit/runtimeImageReferenceCoverage.test.ts`는 코드/데이터에서 직접 참조하는 image literal이 public 파일과 roster 근거를 모두 갖는지 검증한다. template literal 동적 경로는 기존 manifest/asset-integrity 테스트가 담당한다.
- 현재 `atlas_icon_status`는 40개 status icon 전체, `atlas_icon_skills`는 424개 skill icon 전체, `atlas_cosmetic_s1~s3`는 시즌별 50개 전체를 포함한다.

## 제작 규칙

- 원본은 `assets/source/aseprite/<category>/...` 아래의 `.ase` 또는 `.aseprite`로 저장한다.
- Aseprite 원본은 사람이 편집하는 최종 기준이다. AI 생성 이미지는 reference 또는 seed로만 사용한다.
- 캐릭터/NPC/몬스터/VFX는 tag 이름으로 애니메이션 범위를 정의한다.
- NPC는 `idle_D`, `talk_D` tag가 필수이며 모든 frame이 64x64여야 한다.
- Monster는 `idle`, `attack`, `hit`, `death` tag가 필수이며 모든 frame이 64x64여야 한다.
- UI frame은 `uiFrame` 512x512 카테고리를 사용하며 tag를 요구하지 않는다.
- Character illustration은 `characterIllustration` 256x384 카테고리를 사용하며 tag를 요구하지 않는다.
- Character battle thumbnail은 `characterBattleThumbnail` 64x96 카테고리를 사용하며 tag를 요구하지 않는다.
- Character legacy sprite sheet는 `characterSpriteSheet` 256x384 카테고리를 사용하며 tag를 요구하지 않는다.
- NPC battle thumbnail은 `npcBattleThumbnail` 64x96 카테고리를 사용하며 tag를 요구하지 않는다.
- NPC portrait는 `npcPortrait` 512x512 카테고리를 사용하며 tag를 요구하지 않는다.
- NPC 256x384 단일 스프라이트는 `npcSprite` 카테고리를 사용하며 tag를 요구하지 않는다.
- Status icon은 `statusIcon` 32x32 카테고리를 사용하며 tag를 요구하지 않는다.
- Cosmetic은 `cosmetic` 512x512 카테고리를 사용하며 tag를 요구하지 않는다.
- Environment object는 `environmentObject` 256x256 카테고리를 사용하며 tag를 요구하지 않는다.
- Monster 단일 이미지는 `monsterPortrait` 256x256, `monsterBattleIcon` 64x64, `monsterEliteBossPortrait` 384x384, `monsterRaidBossPortrait` 512x512 카테고리를 사용하며 tag를 요구하지 않는다.
- Story CG는 `storyCg` 1216x832 카테고리를 사용하며 tag를 요구하지 않는다.
- Fallback texture는 `fallbackTexture` 64x64와 `fallbackTextureSmall` 32x32 카테고리를 사용하며 tag를 요구하지 않는다.
- Effect fallback texture는 `effectFallbackTexture` 32x32와 `effectFallbackTextureSmall` 24x24 카테고리를 사용하며 tag를 요구하지 않는다.
- Battle monster fallback texture는 `battleMonsterFallbackTexture` 60x60과 `battleMonsterBossFallbackTexture` 90x90 카테고리를 사용하며 tag를 요구하지 않는다.
- Environment particle texture는 `environmentParticleRainTexture` 2x10, `environmentParticleSnowTexture` 6x10, `environmentParticleEtherBeamTexture` 6x16 카테고리를 사용하며 tag를 요구하지 않는다.
- VFX는 `start`, `loop`, `end` tag가 필수이며 모든 frame이 64x64여야 한다.
- Runtime atlas는 개별 Aseprite runtime PNG의 파생물이므로 직접 Aseprite source를 만들지 않는다. 누락 없는 재패킹은 `npm run art:atlas:pack`과 `tests/unit/atlasPackerAssets.test.ts`가 보증한다.
- BattleScene 협공 버튼 내부 아이콘은 `skill_mw_storm.png`와 `skill_ek_ultimate.png` Aseprite skill icon을 재사용한다. 런타임 표시는 `18x18`이며, icon texture가 있으면 `✨`, `🌟`, `💥` 텍스트 prefix는 fallback에서만 유지한다.
- BattleScene CHAIN 라벨은 일반 chain에 `skill_mw_storm.png`, MAX chain에 `skill_ek_explode.png` Aseprite skill icon을 재사용한다. 런타임 표시는 `18x18`이며, icon texture가 있으면 label은 `CHAIN ×N`/`CHAIN ×N MAX` 텍스트만 사용하고 `🔥`, `💥` glyph prefix는 fallback에서만 유지한다.
- BattleUI 협공 로그 하이라이트는 2인 협공에 `skill_mw_storm.png`, 3인 협공에 `skill_ek_ultimate.png` Aseprite skill icon을 재사용한다. 런타임 표시는 `16x16`이며, icon texture가 있으면 하이라이트 label은 `협공 발동: ...` / `3인 협공 발동: ...` 텍스트만 사용하고 `✨`, `🌟`, `🔁`, `🏆` glyph는 fallback에서만 유지한다.
- BattleUI 방어/반사 로그 하이라이트는 `status_shield.png` Aseprite status icon을 재사용한다. 런타임 표시는 `16x16`이며, icon texture가 있으면 하이라이트 label은 `방어 태세!` 또는 `반사 → ...` 텍스트만 사용하고 `🛡` glyph는 fallback에서만 유지한다.
- BattleScene 보스 협공 저항/면역 라벨은 `status_shield.png` Aseprite status icon을 재사용한다. 런타임 표시는 `16x16`이며, icon texture가 있으면 label은 `협공 면역` 또는 `Dual +N% / Triple +N%` 텍스트만 사용하고 `🛡` glyph는 fallback에서만 유지한다.
- BattleScene 필드 ambient line의 방패/보스 표식은 `status_shield.png`와 `skill_ek_slash.png` Aseprite icon을 재사용한다. 런타임 표시는 각각 `18x18`이며, icon texture가 있으면 `🛡`, `⚔️` glyph는 fallback에서만 유지한다.
- WorldScene 선택 지역 encounter line의 방패/보스 표식은 `status_shield.png`와 `skill_ek_slash.png` Aseprite icon을 재사용한다. 런타임 표시는 각각 `16x16`이며, icon texture가 있으면 `🛡`, `⚔️` glyph는 fallback에서만 유지한다.
- BattleScene 전투 시작 인트로 오버레이는 `skill_ek_slash.png` Aseprite skill icon을 재사용한다. 런타임 표시는 `34x34`이며, icon texture가 있으면 text는 `전투 시작!`만 사용하고 `⚔ 전투 시작!` glyph 문자열은 fallback에서만 유지한다.
- BattleScene 타겟 선택 커서는 `skill_mw_arrow.png` Aseprite skill icon을 재사용한다. 런타임 표시는 `24x24` 회전 image이며, icon texture가 있으면 `battle_target_cursor_icon`을 먼저 사용하고 절차 삼각형은 fallback에서만 유지한다.
- BattleScene 타겟 예상 KILL 표식은 `status_curse.png` Aseprite status icon을 재사용한다. 런타임 표시는 `14x14`이며, icon texture가 있으면 예상 피해 label은 `~N KILL` 텍스트만 사용하고 `💀KILL` glyph 문자열은 fallback에서만 유지한다.
- BattleScene 상태 패널 HP 위험 표시는 `status_bleed.png` Aseprite status icon을 재사용한다. 런타임 표시는 `12x12`이며, HP 25% 미만일 때 icon texture가 있으면 `battle_hp_critical_icon_<unitId>` image를 먼저 사용하고 `⚠ HP` glyph 문자열은 fallback에서만 유지한다.
- BattleScene 커맨드 메뉴 선택 focus는 `skill_mw_arrow.png` Aseprite skill icon을 재사용한다. 런타임 표시는 `14x14`이며, icon texture가 있으면 command label은 텍스트만 사용하고 `▶` glyph 문자열은 fallback에서만 유지한다.
- BattleUI 일시정지/도주 utility button은 `skill_tg_stop.png`, `skill_mw_arrow.png`, `skill_vw_warp.png` Aseprite skill icon을 재사용한다. 런타임 표시는 `14x14`이며, pause button은 active 상태에서 stop icon, paused/resume 상태에서 arrow icon으로 같은 image object의 texture를 교체한다. icon texture가 있으면 label은 텍스트만 사용하고 `⏸`, `▶`, `🏃` glyph 문자열은 fallback에서만 유지한다.
- BattleUI 전투 로그 하이라이트는 전투 시작 `skill_ek_slash.png`, 크리티컬/보스 강공 준비/보스 강공 피해 `skill_ek_explode.png`, CHAIN/콤보/ECHO/스킬 발동/2인 협공 `skill_mw_storm.png`, MP 부족 `skill_mw_passive.png`, 포션 회복 `ITM-CON-001.png`, 쿨다운/대기/재연결 복구/ATB 모드 `skill_tg_stop.png`, 자동 전투 모드 `skill_tg_haste.png`, BGM 재생/누락 `battle_bgm_playing.png`/`battle_bgm_missing.png` UI icon, 승리/3인 협공 `skill_ek_ultimate.png`, 레벨 업 `skill_ek_passive.png`, 방어/반사 `status_shield.png`, 사망/패배 `status_curse.png` Aseprite icon을 재사용한다. 런타임 표시는 `16x16`이며, icon texture가 있으면 하이라이트 label은 텍스트만 사용하고 `⚔`, `💥`, `🔥`, `🎉`, `🆙`, `⚡`, `✨`, `🌟`, `🔁`, `🏆`, `🛡`, `💀`, `💔`, `💢`, `💧`, `⏳`, `⏭`, `🧪`, `🔌`, `⚙`, `⏱`, `🎵`, `🔇` glyph 문자열은 fallback에서만 유지한다.
- BattleScene 전투 시작/승리/서버 결과/CHAIN/콤보/스킬 발동/레벨업/ECHO/보스 강공 준비/보스 강공 피해/크리티컬 피해/MP 부족/포션 회복/쿨다운/대기/재연결 복구/자동 전투/ATB 모드/BGM 재생/BGM 누락 로그 원문은 `전투 시작`, `승리`, `CHAIN`, `콤보`, `스킬 발동`, `레벨 업`, `ECHO`, `강공 준비`, `강공!`, `크리티컬`, `MP 부족`, `회복`, `쿨다운`, `대기`, `재연결됨 — 전투 재개`, `[AUTO] 자동 전투`, `ATB 모드`, `BGM: <track>`, `BGM 미존재: <track>` 키워드만 전달해 BattleUI Aseprite log highlight icon 경로가 먼저 동작하게 한다. `⚔`, `🎉`, `🔥`, `💥`, `🆙`, `⚡`, `✨`, `💢`, `💧`, `🧪`, `⏳`, `⏭`, `🔌`, `⚙`, `⏱`, `🎵`, `🔇` glyph 문자열은 BattleUI QA/fallback source message에서만 유지한다.
- BattleScene 마법/아이템 서브메뉴 focus marker는 `skill_mw_arrow.png` Aseprite skill icon을 재사용한다. 런타임 표시는 `14x14`이며, 마법 row와 아이템 row의 기존 skill/item icon은 유지하고 focus image만 active row 좌표로 이동한다. icon texture가 있으면 row label은 텍스트만 사용하고 `▶` glyph 문자열은 fallback에서만 유지한다.
- BattleScene 마법 서브메뉴 쿨다운 상태는 `skill_tg_stop.png` Aseprite skill icon을 재사용한다. 런타임 표시는 `14x14`이며, 쿨다운 row에 `battle_magic_submenu_cooldown_icon_<skillId>` image를 추가하고 label은 `스킬명 CD Ns` 텍스트만 사용한다. `⏳Ns` glyph 문자열은 normal render path에서 제거한다.
- BattleScene 승리 결과 팝업 보상 표식은 `skill_ek_ultimate.png`, `skill_ek_passive.png`, `ITM-MAT-002.png`, `ITM-MAT-001.png` Aseprite icon을 재사용한다. 런타임 표시는 각각 `18x18`이며, icon texture가 있으면 title/경험치/골드/전리품 label은 텍스트만 사용하고 `🏆`, `✨`, `💰`, `📦` glyph 문자열은 fallback에서만 유지한다.
- BattleScene 패배 팝업 title 표식은 `status_curse.png` Aseprite status icon을 재사용한다. 런타임 표시는 `18x18`이며, icon texture가 있으면 title label은 `전투 실패` 텍스트만 사용하고 `💔` glyph 문자열은 fallback에서만 유지한다.
- BattleScene 전투 종료 lead banner는 승리 `skill_ek_ultimate.png`, 패배 `status_curse.png` Aseprite icon을 재사용한다. 런타임 표시는 각각 `34x34`이며, icon texture가 있으면 label은 `Victory!`, `패배...` 텍스트만 사용하고 `🎉`, `💔` glyph 문자열은 fallback에서만 유지한다.
- BattleScene 콤보 보너스 팝업은 `skill_mw_storm.png` Aseprite skill icon을 재사용한다. 런타임 표시는 `18x18`이며, icon texture가 있으면 popup label은 `<combo name> +<bonus>%` 텍스트만 사용하고 `⚡ <combo name> +<bonus>%` glyph 문자열은 fallback에서만 유지한다.
- BattleScene ECHO 피해 팝업은 `skill_mw_storm.png` Aseprite skill icon을 재사용한다. 런타임 표시는 `18x18`이며, icon texture가 있으면 popup label은 `ECHO +N` 텍스트만 사용하고 `✨ ECHO +N` glyph 문자열은 fallback에서만 유지한다.
- BattleScene 반사 피해 팝업은 `status_shield.png` Aseprite status icon을 재사용한다. 런타임 표시는 `18x18`이며, icon texture가 있으면 popup label은 `-N` 피해량 텍스트만 사용하고 `🛡 -N` glyph 문자열은 fallback에서만 유지한다.
- BattleScene 크리티컬 데미지 팝업은 `skill_ek_explode.png` Aseprite skill icon을 재사용한다. 런타임 표시는 `20x20`이며, icon texture가 있으면 popup label은 피해량 숫자만 사용하고 `💥N` glyph 문자열은 fallback에서만 유지한다.
- BattleScene 보스 강공 예고 표식은 `skill_ek_explode.png` Aseprite skill icon을 재사용한다. 런타임 표시는 `30x30`이며, icon texture가 있으면 `battle_boss_telegraph_icon` image를 먼저 사용하고 `⚠` text glyph는 texture 누락 fallback에서만 유지한다.
- LobbyScene 상단 골드 HUD는 `ITM-MAT-002.png` Aseprite material icon을 재사용한다. 런타임 표시는 `18x18`이며, icon texture가 있으면 label은 `999 Gold`처럼 금액 텍스트만 사용하고 `💰` glyph 문자열은 fallback에서만 유지한다.
- DungeonScene 클리어 타이틀은 `skill_ek_ultimate.png` Aseprite skill icon을 재사용한다. 런타임 표시는 `26x26`이며, icon texture가 있으면 label은 `던전 클리어!` 텍스트만 사용하고 `🏆` glyph 문자열은 fallback에서만 유지한다.
- GameScene 필드 보스 라벨은 `skill_ek_slash.png` Aseprite skill icon을 재사용한다. 런타임 표시는 `18x18`이며, icon texture가 있으면 라벨 text는 `BOSS`만 사용하고 `⚔️ BOSS` glyph 문자열은 fallback에서만 유지한다.
- GameScene 상단 존 라벨은 `worldmap` 카테고리의 `zone_<zoneId>.png` Aseprite icon을 재사용한다. 런타임 표시는 `18x18`이며, icon texture가 있으면 라벨 text는 `존명 / 시대명`만 사용하고 `📍` glyph 문자열은 fallback에서만 유지한다.
- GameScene 에러 화면 타이틀은 `skill_ek_explode.png` Aseprite skill icon을 재사용한다. 런타임 표시는 `22x22`이며, icon texture가 있으면 title text는 `존 로딩 실패`만 사용하고 `⚠️ 존 로딩 실패` glyph 문자열은 fallback에서만 유지한다.
- GameScene 상단 연결 상태 표시는 온라인에 `skill_mw_arrow.png`, 오프라인/연결 대기 계열에 `skill_tg_stop.png`, 연결 실패에 `skill_ek_explode.png`를 재사용한다. 런타임 표시는 `game_scene_connection_status_icon` `14x14`이며, icon texture가 있으면 label은 `온라인`, `오프라인`, `연결 실패`처럼 glyph 없는 텍스트만 사용하고 `●`/`○`/`✕` 문자열은 fallback에서만 유지한다. `?debugScene=game&renderer=canvas&gameConnectionIconQa=connected|offline|error`는 `aeternaGameConnectionIconQa`에 렌더 수, 표시 크기, fallback, legacy glyph, missing key 상태를 기록한다.
- LobbyScene 하단 연결 상태 표시는 같은 skill icon 세트를 재사용한다. 런타임 표시는 `lobby_connection_status_icon` `14x14`이며, icon texture가 있으면 label은 `온라인`, `오프라인`, `연결 실패`처럼 glyph 없는 텍스트만 사용하고 `●`/`○`/`✕` 문자열은 fallback에서만 유지한다. `?debugScene=lobby&renderer=canvas&lobbyConnectionIconQa=connected|offline|error`는 `aeternaLobbyConnectionIconQa`에 렌더 수, 표시 크기, fallback, legacy glyph, missing key 상태를 기록한다.
- ErrorBoundary DOM 오버레이는 오류 제목에 `status_curse.png`, 재연결 배지에 `skill_tg_stop.png` Aseprite icon을 `<img>`로 재사용한다. 정상 이미지 로드 경로에서는 `예기치 않은 오류`, `재연결 중...` 텍스트만 표시하고 `⚠`, `⚡` glyph는 image load 실패 fallback span에서만 채운다. 자동 QA는 `aeternaErrorBoundaryIconQa`와 `aeternaReconnectIconQa`에 icon id/path, 렌더 수, fallback, legacy glyph 상태를 기록한다.
- export 후 raw Aseprite JSON을 정규화하고, PNG와 정규화 JSON을 함께 검증한다.
- PNG/JSON 검증을 통과하지 못한 산출물은 publish 대상이 아니다.
- 숨김 reference/background layer가 export에 섞이지 않도록 export 전 Aseprite 파일을 정리한다.

## Publish 규칙

NPC/일반 atlas는 리뷰를 통과한 검증 완료 PNG/JSON만 `client/public/assets/atlas`, `client/public/assets/cg`, 또는 manifest가 지정한 `client/public/assets/generated/...` 런타임 대상 위치로 publish한다. 캐릭터 스프라이트는 roster에 등록된 runtime 경로로만 publish한다. NPC portrait는 `npm run art:npc:portraits`, NPC 256x384 sprite는 `npm run art:npc:sprites`, NPC battle thumbnail은 `npm run art:npc:battle-thumbnails`, 캐릭터 일러스트는 `npm run art:character:illustrations`, 캐릭터 전투 썸네일은 `npm run art:character:battle-thumbnails`, character legacy sprite sheet는 `npm run art:character:sprite-sheets`, status icon은 `npm run art:status:icons`, UI frame은 `npm run art:ui:frames`, cosmetic은 `npm run art:cosmetics`, VFX runtime은 `npm run art:vfx:library`, environment object는 `npm run art:environment:objects`, environment particle texture는 `npm run art:environment:particles`, Story CG는 `npm run art:story:cg`, fallback texture는 `npm run art:fallback:textures`, effect fallback texture는 `npm run art:effect:fallbacks`, battle monster fallback texture는 `npm run art:battle:monster-fallbacks`, 몬스터 단일 이미지는 `npm run art:monster:images`와 `npm run art:monster:boss-images`가 roster에 등록된 runtime 경로로 publish한다. Runtime atlas 파생물은 `npm run art:atlas:pack`이 `assets/generated/atlas`와 `client/public/assets/atlas`에 동시에 publish한다.

```powershell
npm run art:character:build -- char_ether_knight_base --publish
```

publish 대상은 `client/public/assets/generated/characters/sprites`이며, 이 경로는 `client/public/assets/generated` 심링크를 통해 `assets/generated/characters/sprites`와 연결된다.
