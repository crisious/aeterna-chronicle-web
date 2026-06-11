# Aseprite Pipeline

## 목적과 현재 범위

이 파이프라인은 사람이 보정한 `.ase`/`.aseprite` 원본을 Aseprite CLI로 export해 에테르나 크로니클의 PNG sprite sheet와 JSON atlas로 변환한다. AI 아트 파이프라인은 seed/reference 생성과 후처리에 계속 사용하고, Aseprite는 QA 반려 에셋이나 애니메이션 일관성이 필요한 에셋의 수동 보정 SSOT(Single Source of Truth)로 사용한다.

현재 범위는 다음 단계다.

1. Aseprite 실행 파일 탐색 및 설치 확인
2. `.ase`/`.aseprite` 원본 batch export
3. Aseprite JSON을 런타임 atlas JSON 형태로 정규화
4. PNG/JSON/프레임/tag 정합성 검증
5. character roster 기반 단일 캐릭터 build 및 선택적 runtime publish

NPC/일반 atlas publish는 리뷰 후 수동 배치를 유지한다. 캐릭터 파일럿은 `npm run art:character:build -- <character-id> --publish`로 `client/public/assets/generated` 심링크를 경유하는 runtime sprite 경로에 게시할 수 있다.

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
| character roster runtime | `client/public/assets/generated/characters/sprites` | roster의 `runtimePng`/`runtimeJson`이 가리키는 캐릭터 파일럿 publish 경로 |

현재 export 스크립트는 카테고리별 export 폴더에 basename 기준으로 산출물을 만든다. 예를 들어 `npc` 카테고리는 `assets/generated/aseprite/npc/<basename>.png`와 `assets/generated/aseprite/npc/<basename>.aseprite.json`을 생성한다.

`client/public/assets/generated`는 `assets/generated`를 가리키는 심링크다. 캐릭터 런타임 경로는 브라우저에서 `assets/generated/characters/sprites/...`로 로드한다.

## 카테고리 규격

| 카테고리 | 프레임 | sheetType | 필수 tag |
|----------|--------|-----------|----------|
| `character` | 64x64 | `rows` | `idle_D`, `walk_D`, `attack_melee_D`, `cast_D`, `hit_D`, `death_D` |
| `npc` | 64x64 | `rows` | `idle_D`, `talk_D` |
| `monster` | 64x64 | `rows` | `idle`, `attack`, `hit`, `death` |
| `vfx` | 64x64 | `horizontal` | `start`, `loop`, `end` |
| `ui` | 32x32 | `packed` | 없음 |
| `tile` | 32x32 | `rows` | 없음 |

NPC는 반드시 64x64 프레임을 사용한다. `idle_D`, `talk_D` tag는 Aseprite timeline의 frame range를 가져야 하며, `from`/`to` 값은 정수이고 실제 frame index 범위 안에 있어야 한다.

## Character Sprite Workflow

캐릭터 스프라이트는 `assets/source/aseprite/character/character-sprite-roster.json`을 기준으로 검증한다. 첫 파일럿은 `char_ether_knight_base`이며 source `.aseprite`는 64x64 프레임 캔버스, 10프레임, export sheet `640x64` 규격이다.

### 1) Roster 검증

```powershell
npm run art:character:roster
```

### 2) 단일 캐릭터 build/검증

```powershell
npm run art:character:build -- char_ether_knight_base
```

예상 산출물:

- `assets/generated/aseprite/character/char_ether_knight_base.png`
- `assets/generated/aseprite/character/char_ether_knight_base.aseprite.json`
- `assets/generated/aseprite/character/char_ether_knight_base.json`

### 3) 런타임 publish

```powershell
npm run art:character:build -- char_ether_knight_base --publish
```

publish 후 runtime 산출물은 다음 경로에서 확인한다.

- `assets/generated/characters/sprites/char_ether_knight_base.png`
- `assets/generated/characters/sprites/char_ether_knight_base.json`
- `client/public/assets/generated/characters/sprites/...` 심링크 경유

런타임 계약은 `client/src/assets/characterSpriteManifest.ts`가 가진다. `GameScene`과 `BattleScene`은 해당 manifest를 읽어 `load.spritesheet(..., { frameWidth: 64, frameHeight: 64 })`로 로드하고, 생성 후 `setFrame(0)`을 적용해 640px strip 전체 렌더링을 피한다.

브라우저 QA는 다음 파라미터로 확인한다.

```text
?debugScene=world&class=ether_knight&era=present
?debugScene=battle&class=ether_knight&era=present
```

full motion 제작은 field/battle QA 통과 후 `attack_melee_D`, `cast_D`, `hit_D`, `death_D`를 추가한다.

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

### 1) Export

```powershell
npm run art:aseprite:export -- npc assets/source/aseprite/npc/erebos/npc_ghost_merchant_gorodi.aseprite
```

예상 산출물:

- `assets/generated/aseprite/npc/npc_ghost_merchant_gorodi.png`
- `assets/generated/aseprite/npc/npc_ghost_merchant_gorodi.aseprite.json`

### 2) JSON 정규화

```powershell
node tools/aseprite-pipeline/normalize-aseprite-json.mjs `
  assets/generated/aseprite/npc/npc_ghost_merchant_gorodi.aseprite.json `
  assets/generated/aseprite/npc/npc_ghost_merchant_gorodi.json `
  npc_ghost_merchant_gorodi `
  npc_ghost_merchant_gorodi.png
```

정규화 JSON은 `atlas`, `image`, `size`, `sprites`, `tags`, `layers`, `count` 필드를 가진다.

### 3) 검증

```powershell
npm run art:aseprite:validate -- npc `
  assets/generated/aseprite/npc/npc_ghost_merchant_gorodi.png `
  assets/generated/aseprite/npc/npc_ghost_merchant_gorodi.json
```

검증은 PNG signature와 `IHDR`/`IDAT`/`IEND`, PNG 크기와 atlas `size` 일치, 모든 frame 좌표/크기, frame count, 필수 tag와 tag range를 확인한다.

## 제작 규칙

- 원본은 `assets/source/aseprite/<category>/...` 아래의 `.ase` 또는 `.aseprite`로 저장한다.
- Aseprite 원본은 사람이 편집하는 최종 기준이다. AI 생성 이미지는 reference 또는 seed로만 사용한다.
- 캐릭터/NPC/몬스터/VFX는 tag 이름으로 애니메이션 범위를 정의한다.
- NPC는 `idle_D`, `talk_D` tag가 필수이며 모든 frame이 64x64여야 한다.
- export 후 raw Aseprite JSON을 정규화하고, PNG와 정규화 JSON을 함께 검증한다.
- PNG/JSON 검증을 통과하지 못한 산출물은 publish 대상이 아니다.
- 숨김 reference/background layer가 export에 섞이지 않도록 export 전 Aseprite 파일을 정리한다.

## Publish 규칙

NPC/일반 atlas는 리뷰를 통과한 검증 완료 PNG/JSON만 `client/public/assets/atlas` 아래의 런타임 대상 위치로 수동 복사한다. 캐릭터 파일럿은 roster에 등록된 runtime 경로로만 publish한다.

```powershell
npm run art:character:build -- char_ether_knight_base --publish
```

publish 대상은 `client/public/assets/generated/characters/sprites`이며, 이 경로는 `client/public/assets/generated` 심링크를 통해 `assets/generated/characters/sprites`와 연결된다.
