# Character Sprite Production

캐릭터 스프라이트는 사람이 편집하는 `.aseprite` 원본을 SSOT로 두고, roster 검증 -> export/normalize/validate -> runtime publish 순서로 처리한다. 현재 파일럿은 `char_ether_knight_base` 단일 캐릭터다.

## Pilot Target

첫 캐릭터 파일럿은 `char_ether_knight_base`다. Aseprite 설치/실행 경로는 Windows Steam 설치 기준으로 다음 값을 사용한다.

```text
C:\Program Files (x86)\Steam\steamapps\common\Aseprite\Aseprite.exe
```

## Aseprite Document Settings

| Setting | Value |
| --- | --- |
| Source Canvas | `64x64` per frame |
| Frame Size | `64x64` |
| Frames | `10` |
| Direction | `D` only |
| Motions | `idle` 4 frames, `walk` 6 frames |
| Exported Sprite Sheet | `640x64` (`10` frames x `64x64`) |
| Background | Transparent |
| Palette | `assets/source/aseprite/palettes/aeterna-core.gpl` |
| Layers | `shadow`, `body`, `armor`, `weapon`, `accent`, hidden `reference` |

## Required Tags

| Tag | Aseprite Timeline Frames | Export JSON Frames |
| --- | --- | --- |
| `idle_D` | `1-4` | `0-3` |
| `walk_D` | `5-10` | `4-9` |

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

## Visual Rules

- 2px black outline을 기본 외곽선으로 사용한다.
- Anti-aliasing 없이 hard pixel edge로 작업한다.
- 모든 프레임의 발 기준점은 x=32, y=58±2 근처에 둔다.
- `aeterna-core.gpl`의 `Memory Cyan`, `Silver`, `Steel`, `Gold Accent`, `Deep Navy`를 주 색상으로 사용한다.
- frame 0은 `64x64`와 `32x32` 미리보기 모두에서 기본 idle pose로 읽혀야 한다.

## CLI Reproduction

파일럿 원본은 Aseprite CLI와 Lua 스크립트로 재생성할 수 있다.

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
```

## Promotion Rule

`source-ready` 파일럿은 다음 조건을 모두 통과한 뒤에만 `published`로 승격한다.

1. `npm run art:character:build -- char_ether_knight_base --publish`가 0으로 종료한다.
2. character sprite manifest test가 통과한다.
3. field/battle 장면에서 missing texture가 발생하지 않는다.

## Runtime Application

- `client/src/assets/characterSpriteManifest.ts`가 `textureKey`, `imagePath`, `jsonPath`, `frameWidth: 64`, `frameHeight: 64` 계약을 제공한다.
- `GameScene`과 `BattleScene`은 `load.spritesheet(..., { frameWidth: 64, frameHeight: 64 })`로 로드한다.
- 씬에서 스프라이트 생성 후 `setFrame(0)`을 호출해 640px strip 전체가 한 장으로 렌더링되는 문제를 방지한다.
- static PNG fallback은 다른 클래스 파일럿이 준비될 때까지 유지한다.

## Browser QA

다음 URL 파라미터로 field/battle 장면을 확인한다.

```text
?debugScene=world&class=ether_knight&era=present
?debugScene=battle&class=ether_knight&era=present
```

체크 포인트:

- `char_sprite_ether_knight_base` missing texture 오류가 없어야 한다.
- field 플레이어와 battle 액터가 64x64 첫 프레임으로 보여야 한다.
- 640x64 strip 전체가 화면에 늘어져 보이면 `spritesheet` 로드 또는 `setFrame(0)` 적용을 확인한다.

## Expansion Order

| Order | Class ID | Scope |
| --- | --- | --- |
| 1 | `ether_knight` | `idle_D`, `walk_D` pilot |
| 2 | `ether_knight` | full D direction motions |
| 3 | `ether_knight` | 5 produced directions: D, DL, L, UL, U |
| 4 | `memory_weaver` | `idle_D`, `walk_D` pilot |
| 5 | `shadow_weaver` | `idle_D`, `walk_D` pilot |
| 6 | `memory_breaker` | `idle_D`, `walk_D` pilot |
| 7 | `time_guardian` | `idle_D`, `walk_D` pilot |
| 8 | `void_wanderer` | `idle_D`, `walk_D` pilot |
