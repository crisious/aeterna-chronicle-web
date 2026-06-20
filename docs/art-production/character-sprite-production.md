# Character Sprite Production

캐릭터 스프라이트는 사람이 편집하는 `.aseprite` 원본을 SSOT로 두고, roster 검증 -> export/normalize/validate -> runtime publish 순서로 처리한다. 현재 런타임 대상은 6개 기본 클래스 전부의 5방향 full motion 스프라이트다.

## Current Target

현재 full motion 대상은 `char_ether_knight_base`, `char_memory_weaver_base`, `char_shadow_weaver_base`, `char_memory_breaker_base`, `char_time_guardian_base`, `char_void_wanderer_base`다. Aseprite 설치/실행 경로는 Windows Steam 설치 기준으로 다음 값을 사용한다.

```text
C:\Program Files (x86)\Steam\steamapps\common\Aseprite\Aseprite.exe
```

## Aseprite Document Settings

| Setting | Value |
| --- | --- |
| Source Canvas | `64x64` per frame |
| Frame Size | `64x64` |
| Frames | `200` (`40` frames x `5` directions) |
| Direction | `D`, `DL`, `L`, `UL`, `U` |
| Motions | `idle` 4 frames, `walk` 6 frames, `attack_melee` 6 frames, `cast` 5 frames, `hit` 3 frames, `death` 6 frames, `ready` 4 frames, `victory` 6 frames |
| Exported Sprite Sheet | `2560x320` (`40` columns x `5` rows x `64x64`) |
| Export Layout | `tools/aseprite-pipeline/aseprite.config.json` character `sheetColumns: 40` |
| Background | Transparent |
| Palette | `assets/source/aseprite/palettes/aeterna-core.gpl` |
| Layers | `shadow`, `body`, `armor`, `weapon`, `accent`, hidden `reference` |

## Required Tags

### Base Class Full Motion

각 방향은 40프레임 블록을 사용한다. JSON frame offset은 `D=0`, `DL=40`, `L=80`, `UL=120`, `U=160`이다.

| Motion | Timeline Frames per Direction | JSON Frames before Direction Offset |
| --- | --- | --- |
| `idle` | `1-4` | `0-3` |
| `walk` | `5-10` | `4-9` |
| `attack_melee` | `11-16` | `10-15` |
| `cast` | `17-21` | `16-20` |
| `hit` | `22-24` | `21-23` |
| `death` | `25-30` | `24-29` |
| `ready` | `31-34` | `30-33` |
| `victory` | `35-40` | `34-39` |

필수 tag는 `{motion}_{direction}` 형식의 40개다. 예: `idle_D`, `victory_D`, `idle_DL`, `victory_DL`, `idle_L`, `victory_L`, `idle_UL`, `victory_UL`, `idle_U`, `victory_U`.

## Path Contract

| 구분 | 경로 |
| --- | --- |
| Source `.aseprite` | `assets/source/aseprite/character/ether_knight/char_ether_knight_base.aseprite` |
| Generated export | `assets/generated/aseprite/character/char_ether_knight_base.png` |
| Generated atlas | `assets/generated/aseprite/character/char_ether_knight_base.json` |
| Runtime sprite | `assets/generated/characters/sprites/char_ether_knight_base.png` |
| Runtime atlas | `assets/generated/characters/sprites/char_ether_knight_base.json` |
| Client public route | `client/public/assets/generated` 심링크 경유 |
| Runtime manifest | `client/src/assets/characterSpriteManifest.ts` |

Memory Weaver full motion도 같은 경로 규칙을 사용한다.

| 구분 | 경로 |
| --- | --- |
| Source `.aseprite` | `assets/source/aseprite/character/memory_weaver/char_memory_weaver_base.aseprite` |
| Generated export | `assets/generated/aseprite/character/char_memory_weaver_base.png` |
| Generated atlas | `assets/generated/aseprite/character/char_memory_weaver_base.json` |
| Runtime sprite | `assets/generated/characters/sprites/char_memory_weaver_base.png` |
| Runtime atlas | `assets/generated/characters/sprites/char_memory_weaver_base.json` |

Shadow Weaver full motion도 같은 경로 규칙을 사용한다.

| 구분 | 경로 |
| --- | --- |
| Source `.aseprite` | `assets/source/aseprite/character/shadow_weaver/char_shadow_weaver_base.aseprite` |
| Generated export | `assets/generated/aseprite/character/char_shadow_weaver_base.png` |
| Generated atlas | `assets/generated/aseprite/character/char_shadow_weaver_base.json` |
| Runtime sprite | `assets/generated/characters/sprites/char_shadow_weaver_base.png` |
| Runtime atlas | `assets/generated/characters/sprites/char_shadow_weaver_base.json` |

Memory Breaker full motion도 같은 경로 규칙을 사용한다.

| 구분 | 경로 |
| --- | --- |
| Source `.aseprite` | `assets/source/aseprite/character/memory_breaker/char_memory_breaker_base.aseprite` |
| Generated export | `assets/generated/aseprite/character/char_memory_breaker_base.png` |
| Generated atlas | `assets/generated/aseprite/character/char_memory_breaker_base.json` |
| Runtime sprite | `assets/generated/characters/sprites/char_memory_breaker_base.png` |
| Runtime atlas | `assets/generated/characters/sprites/char_memory_breaker_base.json` |

Time Guardian full motion도 같은 경로 규칙을 사용한다.

| 구분 | 경로 |
| --- | --- |
| Source `.aseprite` | `assets/source/aseprite/character/time_guardian/char_time_guardian_base.aseprite` |
| Generated export | `assets/generated/aseprite/character/char_time_guardian_base.png` |
| Generated atlas | `assets/generated/aseprite/character/char_time_guardian_base.json` |
| Runtime sprite | `assets/generated/characters/sprites/char_time_guardian_base.png` |
| Runtime atlas | `assets/generated/characters/sprites/char_time_guardian_base.json` |

Void Wanderer full motion도 같은 경로 규칙을 사용한다.

| 구분 | 경로 |
| --- | --- |
| Source `.aseprite` | `assets/source/aseprite/character/void_wanderer/char_void_wanderer_base.aseprite` |
| Generated export | `assets/generated/aseprite/character/char_void_wanderer_base.png` |
| Generated atlas | `assets/generated/aseprite/character/char_void_wanderer_base.json` |
| Runtime sprite | `assets/generated/characters/sprites/char_void_wanderer_base.png` |
| Runtime atlas | `assets/generated/characters/sprites/char_void_wanderer_base.json` |

## Visual Rules

- 2px black outline을 기본 외곽선으로 사용한다.
- Anti-aliasing 없이 hard pixel edge로 작업한다.
- 모든 프레임의 발 기준점은 x=32, y=58±2 근처에 둔다.
- `aeterna-core.gpl`의 `Memory Cyan`, `Silver`, `Steel`, `Gold Accent`, `Deep Navy`를 주 색상으로 사용한다.
- frame 0은 `64x64`와 `32x32` 미리보기 모두에서 기본 idle pose로 읽혀야 한다.

## CLI Reproduction

Ether Knight 5방향 full motion 원본은 Aseprite CLI와 Lua 스크립트로 재생성할 수 있다. 나머지 기본 클래스는 같은 roster/build 계약으로 관리한다.

```powershell
& "C:\Program Files (x86)\Steam\steamapps\common\Aseprite\Aseprite.exe" `
  --batch `
  --script-param output=assets/source/aseprite/character/ether_knight/char_ether_knight_base.aseprite `
  --script-param palette=assets/source/aseprite/palettes/aeterna-core.gpl `
  --script tools/aseprite-pipeline/scripts/create-ether-knight-pilot.lua
```

생성 후 roster와 단일 캐릭터 build 검증을 실행한다.

```powershell
Test-Path assets/source/aseprite/character/ether_knight/char_ether_knight_base.aseprite
npm run art:character:roster
npm run art:character:build -- char_ether_knight_base
```

런타임에 게시할 때만 `--publish`를 붙인다.

```powershell
npm run art:character:build -- char_ether_knight_base --publish
npm run art:character:build -- char_memory_weaver_base --publish
npm run art:character:build -- char_shadow_weaver_base --publish
npm run art:character:build -- char_memory_breaker_base --publish
npm run art:character:build -- char_time_guardian_base --publish
npm run art:character:build -- char_void_wanderer_base --publish
```

## Promotion Rule

`source-ready` 스프라이트는 다음 조건을 모두 통과한 뒤에만 `published`로 승격한다.

1. `npm run art:character:build -- <character-id> --publish`가 0으로 종료한다.
2. character sprite manifest test가 통과한다.
3. field/battle 장면에서 missing texture가 발생하지 않는다.

## Current QA State

2026-06-20 기준 `char_ether_knight_base`, `char_memory_weaver_base`, `char_shadow_weaver_base`, `char_memory_breaker_base`, `char_time_guardian_base`, `char_void_wanderer_base`는 모두 roster `phase: full`, `status: published` 상태다.

- Published atlas: 모든 기본 클래스가 `2560x320`, `200` frames, 5 directions, 40 motion tags다.
- Motion tags: `idle`, `walk`, `attack_melee`, `cast`, `hit`, `death`, `ready`, `victory` x `D`, `DL`, `L`, `UL`, `U`.
- 자동 검증: `npm run art:character:roster`, 6개 `npm run art:character:build -- <character-id> --publish`, manifest/pipeline/asset-integrity vitest, `npm --prefix client run typecheck`, `npm run build:client`.
- Browser QA: `BattleScene`, `GameScene`, `DungeonScene`에서 `char_sprite_ether_knight_base`, `char_sprite_memory_weaver_base`, `char_sprite_shadow_weaver_base`, `char_sprite_memory_breaker_base`, `char_sprite_time_guardian_base`, `char_sprite_void_wanderer_base` texture가 로드되고, frame `0` 표시 크기 `64x64`를 확인했다. `DungeonScene`은 `debugScene=dungeon`에서 manifest sheet를 우선 표시하고 side illustration은 fallback으로만 남긴다.
- `debugScene=world`는 월드맵 씬이므로 캐릭터 스프라이트를 직접 생성하지 않는다. 필드 캐릭터 검증은 `GameScene` 기준으로 수행한다. 던전 플레이어 검증은 `?debugScene=dungeon&renderer=canvas&class=ether_knight`를 사용한다.

## Runtime Application

- `client/src/assets/characterSpriteManifest.ts`가 `textureKey`, `imagePath`, `jsonPath`, `frameWidth: 64`, `frameHeight: 64` 계약을 제공한다.
- `GameScene`, `BattleScene`, `DungeonScene`은 `load.spritesheet(..., { frameWidth: 64, frameHeight: 64 })`로 로드한다.
- 씬에서 스프라이트 생성 후 `setFrame(0)`을 호출해 2560x320 sheet 전체가 한 장으로 렌더링되는 문제를 방지한다.
- static PNG fallback은 manifest sheet가 누락된 비정상 입력과 신규 미등록 클래스에 대한 안전 fallback으로만 유지한다.

## Browser QA

다음 URL 파라미터로 field/battle 장면을 확인한다.

```text
?debugScene=game&class=ether_knight&era=present
?debugScene=battle&class=ether_knight&era=present
?debugScene=game&class=memory_weaver&era=present
?debugScene=battle&class=memory_weaver&era=present
?debugScene=battle&class=memory_weaver&era=present&renderer=canvas
?debugScene=game&class=shadow_weaver&era=present
?debugScene=battle&class=shadow_weaver&era=present
?debugScene=battle&class=shadow_weaver&era=present&renderer=canvas
?debugScene=game&class=memory_breaker&era=present
?debugScene=battle&class=memory_breaker&era=present
?debugScene=battle&class=memory_breaker&era=present&renderer=canvas
?debugScene=game&class=time_guardian&era=present
?debugScene=battle&class=time_guardian&era=present
?debugScene=battle&class=time_guardian&era=present&renderer=canvas
?debugScene=game&class=void_wanderer&era=present
?debugScene=battle&class=void_wanderer&era=present
?debugScene=battle&class=void_wanderer&era=present&renderer=canvas
```

체크 포인트:

- `char_sprite_ether_knight_base`, `char_sprite_memory_weaver_base`, `char_sprite_shadow_weaver_base`, `char_sprite_memory_breaker_base`, `char_sprite_time_guardian_base`, `char_sprite_void_wanderer_base` missing texture 오류가 없어야 한다.
- field 플레이어와 battle 액터가 64x64 첫 프레임으로 보여야 한다.
- 2560x320 sheet 전체가 화면에 늘어져 보이면 `spritesheet` 로드 또는 `setFrame(0)` 적용을 확인한다.
- `debugScene=world`는 `WorldScene` 직접 진입이므로 필드 플레이어 검증은 `debugScene=game` 기준으로 수행한다.

## Expansion Order

| Order | Class ID | Scope |
| --- | --- | --- |
| 1 | `ether_knight` | 5-direction full motion |
| 2 | `memory_weaver` | 5-direction full motion |
| 3 | `shadow_weaver` | 5-direction full motion |
| 4 | `memory_breaker` | 5-direction full motion |
| 5 | `time_guardian` | 5-direction full motion |
| 6 | `void_wanderer` | 5-direction full motion |

위 확장 순서의 현재 상태: 2026-06-20 기준 1-6 완료. 다음 단계는 클래스별 motion 품질 보정, 방향별 silhouette 차별화, combo/skill 전용 pose 추가다.
