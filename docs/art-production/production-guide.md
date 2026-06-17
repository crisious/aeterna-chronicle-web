# 에테르나 크로니클 — 에셋 프로덕션 가이드

> 작성일: 2026-03-13 | 버전: v1.0  
> 대상: 아트 디렉터, 기획자, 비개발자 포함  
> 상태: P15-19 완료

---

## 목차

1. [시작하기](#1-시작하기)
2. [환경 설정](#2-환경-설정)
3. [프로젝트 구조](#3-프로젝트-구조)
4. [워크플로우 개요](#4-워크플로우-개요)
5. [단계별 가이드](#5-단계별-가이드)
6. [카테고리별 가이드](#6-카테고리별-가이드)
7. [QA 체크리스트](#7-qa-체크리스트)
8. [트러블슈팅](#8-트러블슈팅)
9. [부록](#9-부록)

---

## 1) 시작하기

### 이 가이드가 필요한 사람

- **아트 디렉터**: 프롬프트 수정, QA 기준 조정, 최종 품질 판단
- **기획자**: 에셋 목록 관리, 카탈로그 갱신, 일정 추적
- **개발자**: 파이프라인 스크립트 수정, 빌드 시스템 커스터마이징

### 전체 흐름 (한눈에)

```
📝 프롬프트 작성    JSON 파일에 AI 생성 지시사항 작성
       ↓
🎨 이미지 생성      AI 엔진(SD/DALL-E/MJ)으로 이미지 생성
       ↓
🔄 후처리           배경 제거, 색보정, 크기 조정
       ↓
✅ QA 검증          자동 품질 검사 (해상도, 팔레트, 심리스 등)
       ↓
📋 시트 조립        스프라이트/타일 시트로 조립
       ↓
📚 카탈로그 등록    에셋 DB에 등록 + 진행률 갱신
```

---

## 2) 환경 설정

### 2.1 필수 소프트웨어

| 소프트웨어 | 버전 | 용도 | 설치 |
|-----------|------|------|------|
| Python | 3.10+ | 파이프라인 스크립트 | `brew install python` |
| Make | 3.81+ | 빌드 시스템 | macOS 기본 포함 |
| Pillow | 10.0+ | 이미지 처리 | `pip install Pillow` |
| rembg | 2.0+ | 배경 제거 | `pip install rembg` |
| numpy | 1.24+ | 색상 분석 | `pip install numpy` |
| Aseprite | 1.3+ | 캐릭터/NPC 픽셀아트 원본 편집 및 CLI export | Steam 설치 |

### 2.2 선택 소프트웨어 (AI 엔진)

| 엔진 | 설정 | 비고 |
|------|------|------|
| **Stable Diffusion** | WebUI 로컬 또는 API 서버 URL 필요 | `.env`의 `SD_API_URL` |
| **DALL-E 3** | OpenAI API 키 필요 | `.env`의 `OPENAI_API_KEY` |
| **Midjourney** | Discord 봇 토큰 필요 | `.env`의 `MJ_DISCORD_TOKEN` |

### 2.3 환경변수 설정

프로젝트 루트에 `.env` 파일을 생성합니다:

```bash
# .env (예시 — 실제 키는 비공개)
SD_API_URL=http://localhost:7860
OPENAI_API_KEY=sk-...
MJ_DISCORD_TOKEN=...
MJ_CHANNEL_ID=...
```

### 2.4 첫 실행 테스트

```bash
cd tools/art-pipeline
make status    # 현재 상태 확인
make help      # 명령어 목록
```

---

## 3) 프로젝트 구조

```
에테르나크로니클/
├── assets/
│   ├── prompts/              # 📝 AI 프롬프트 (JSON)
│   │   ├── characters/       #    캐릭터 프롬프트
│   │   │   ├── class_main/   #    6클래스 메인
│   │   │   ├── class_advanced/ #  18전직
│   │   │   ├── npc/          #    NPC 30명
│   │   │   ├── sprites/      #    스프라이트
│   │   │   └── npc_sprites/  #    NPC 스프라이트
│   │   ├── monsters/         #    몬스터 프롬프트
│   │   │   ├── normal/       #    일반 Tier 1
│   │   │   ├── elite_boss/   #    엘리트+보스
│   │   │   └── raid_boss/    #    레이드 보스
│   │   └── environment/      #    환경 프롬프트
│   │       ├── tiles/        #    타일셋
│   │       └── backgrounds/  #    배경
│   ├── generated/            # 🎨 AI 생성 원본
│   ├── processed/            # 🔄 후처리 완료
│   ├── sheets/               # 📋 스프라이트/타일 시트
│   ├── qa-reports/           # ✅ QA 리포트
│   ├── build-logs/           # 📊 빌드 로그
│   ├── catalog.json          # 📚 에셋 카탈로그 (363개)
│   └── controlnet-poses/     # 🦴 ControlNet 포즈
├── tools/art-pipeline/       # 🔧 파이프라인 도구
│   ├── Makefile              #    빌드 시스템
│   ├── batch_generator.py    #    배치 생성 엔진
│   ├── post_process_pipeline.py # 후처리 파이프라인
│   ├── qa_runner.py          #    QA 자동 검증
│   ├── spritesheet_assembler.py # 시트 조립
│   ├── asset_catalog.py      #    카탈로그 매니저
│   ├── remove_bg.py          #    배경 제거
│   ├── color_correct.py      #    색보정
│   └── pose_generator.py     #    포즈 생성/미러링
└── docs/art-production/      # 📖 문서
    ├── production-guide.md   #    이 가이드
    ├── style-guide.md        #    스타일 가이드
    ├── qa-checklist.md       #    QA 체크리스트
    └── ai-prompt-master.md   #    프롬프트 마스터
```

---

## 4) 워크플로우 개요

### 4.1 전체 파이프라인 (한 번에)

```bash
cd tools/art-pipeline
make all ENGINE=sd PARALLEL_JOBS=4
```

이 명령은 순서대로 실행합니다:
1. `setup` — 디렉터리 생성
2. `generate` — 전체 프롬프트에서 이미지 생성
3. `process` — 배경 제거 + 색보정
4. `qa` — 자동 품질 검증
5. `assemble` — 시트 조립
6. `catalog` — 카탈로그 갱신

### 4.2 카테고리별 실행

특정 카테고리만 빌드:

```bash
make characters    # 캐릭터만
make monsters      # 몬스터만
make environment   # 환경만
```

### 4.3 단계별 실행

특정 단계만 수동 실행:

```bash
make generate      # 생성만
make process       # 후처리만
make qa            # QA만
make assemble      # 조립만
make catalog       # 카탈로그만
```

### 4.4 Aseprite 수동 보정 루프

AI 생성 이미지가 QA를 통과하지 못하거나 NPC/캐릭터 애니메이션의 프레임 일관성이 필요한 경우 Aseprite 원본을 수동 보정 SSOT로 승격합니다. 기존 AI 파이프라인은 seed/reference 생성과 후처리에 유지하고, Aseprite 루프는 사람이 보정한 `.aseprite` 원본을 검증 가능한 PNG/JSON atlas로 만드는 보조 경로입니다.

Windows 기준 Aseprite 실행 파일은 다음 경로를 사용합니다.

```text
C:\Program Files (x86)\Steam\steamapps\common\Aseprite\Aseprite.exe
```

```
AI seed/reference
  → Aseprite 원본 편집 (`assets/source/aseprite`)
  → Aseprite CLI export (`npm run art:aseprite:export`)
  → JSON 정규화 (`tools/aseprite-pipeline/normalize-aseprite-json.mjs`)
  → 자동 검증 (`npm run art:aseprite:validate` + 기존 QA)
  → publish (NPC/일반 atlas는 수동, 캐릭터는 roster build `--publish`)
```

설치 확인은 `npm run art:aseprite:check`로 수행하고, 표준 위치에서 Aseprite를 찾지 못하면 `ASEPRITE_EXE`로 실행 파일 경로를 지정합니다. 자세한 명령과 NPC 파일럿 예시는 [Aseprite Pipeline](../../tools/aseprite-pipeline/README.md)을 참조합니다. NPC/일반 atlas는 검증된 PNG/JSON만 리뷰 후 `client/public/assets/atlas` 또는 manifest가 지정한 `client/public/assets/generated/...` 경로로 수동 복사합니다.

#### NPC 스프라이트 제작

일반 그래픽 제작 상태는 [Sprite Production Roadmap](sprite-production-roadmap.md)과 `assets/source/aseprite/sprite-production-roster.json`을 기준으로 추적합니다. 현재 in-game verified NPC는 `npc_ghost_merchant_gorodi`, `npc_elder_mateus`, `npc_merchant_mira`, `npc_blacksmith_kalen`, `npc_memory_fragment_board`, `npc_guild_hashir`입니다.

```powershell
npm run art:sprite:roster
npm run art:aseprite:export -- npc assets/source/aseprite/npc/erebos/npc_ghost_merchant_gorodi.aseprite
node tools/aseprite-pipeline/normalize-aseprite-json.mjs `
  assets/generated/aseprite/npc/npc_ghost_merchant_gorodi.aseprite.json `
  assets/generated/aseprite/npc/npc_ghost_merchant_gorodi.json `
  npc_ghost_merchant_gorodi `
  npc_ghost_merchant_gorodi.png
npm run art:aseprite:validate -- npc `
  assets/generated/aseprite/npc/npc_ghost_merchant_gorodi.png `
  assets/generated/aseprite/npc/npc_ghost_merchant_gorodi.json
```

런타임 계약:

| 구분 | 경로 |
|------|------|
| Source | `assets/source/aseprite/npc/erebos/npc_ghost_merchant_gorodi.aseprite` |
| Aseprite export | `assets/generated/aseprite/npc/npc_ghost_merchant_gorodi.png` |
| Runtime publish | `client/public/assets/generated/characters/npc_sprites/npc_ghost_merchant_gorodi.png` |
| Runtime manifest | `client/src/assets/spriteResourceManifest.ts` |

`GameScene`은 `npc_ghost_merchant`를 `npc_ghost_merchant_gorodi_sprite`로 매핑하고 `load.spritesheet(..., { frameWidth: 64, frameHeight: 64 })`로 로드합니다.

`LobbyScene`은 `elder`, `merchant`, `blacksmith`, `quest_board`, `party_recruit`를 각각 `npc_elder_mateus_sprite`, `npc_merchant_mira_sprite`, `npc_blacksmith_kalen_sprite`, `npc_memory_fragment_board_sprite`, `npc_guild_hashir_sprite`로 매핑합니다. 다섯 리소스 모두 `384x64` sheet, `64x64` frame, `idle_D` 0-3 / `talk_D` 4-5 계약을 따르며 2026-06-12 브라우저 QA에서 텍스처 로딩과 대화 패널 반응을 확인했습니다.

`GameScene`과 `BattleScene`은 시작 필드 몬스터 `mon_erebos_fog_rat`, `mon_erebos_memory_beetle`, `mon_erebos_memory_dust`를 각각 `mon_erebos_fog_rat_normal_sprite`, `mon_erebos_memory_beetle_normal_sprite`, `mon_erebos_memory_dust_normal_sprite`로 매핑합니다. 세 리소스는 `768x64` sheet, `64x64` frame, `idle` 0-3 / `attack` 4-7 / `hit` 8-9 / `death` 10-11 계약을 따르며 `GameScene`은 frame `0`을 필드 몬스터 이미지로 먼저 표시하고 색 사각형/이모지는 누락 시 fallback으로만 생성합니다.

`DungeonScene`은 웨이브 preview 몬스터 `mon_erebos_ruin_skeleton_normal`, `mon_erebos_fog_wolf_normal`, `mon_erebos_memory_ghost_normal`, `mon_erebos_broken_golem_normal`, `mon_erebos_ruin_spider_normal`, `mon_erebos_memory_absorber_normal`를 기존 `monsterBattleIcon` Aseprite PNG로 preload합니다. 일반 preview는 `56x56`, 보스 preview는 `80x80` 표시 크기이며 PNG key가 없을 때만 `dmon_*` 절차 사각형과 이모지 fallback을 생성합니다.

`BattleScene`은 몬스터 전용 sprite manifest와 legacy `mon_battle_*` PNG가 모두 없을 때 `assets/generated/monsters/fallback/battle_monster_fallback.png` 또는 `battle_boss_fallback.png`를 먼저 사용합니다. 두 PNG는 `npm run art:battle:monster-fallbacks`로 재생성하며, Aseprite PNG key가 없을 때만 `_mon_prog_*` 절차 사각형과 이모지 fallback을 생성합니다.

`GameScene` 필드 환경 오브젝트는 `ZONE_ENV_CONFIG`의 현재 존 object 목록만 preload하고, `assets/generated/environment/objects/*.png` Aseprite PNG를 deterministic seeded placement로 배치합니다. 각 오브젝트는 bottom-center origin과 Y-depth 정렬을 사용하며, 누락 texture는 절차 도형으로 대체하지 않고 QA probe의 `missingTextureKeys`로 보고합니다. `?debugScene=game&renderer=canvas&zone=aether_plains&envObjectQa=1`는 `document.body.dataset.aeternaEnvObjectQa`에 expected/rendered object count와 texture load 상태를 기록합니다.

`TransitionEffects`의 환경 파티클은 `assets/generated/vfx/particles/particle_rain.png`, `particle_snow.png`, `particle_ether_beam.png`를 사용합니다. 세 PNG는 `npm run art:environment:particles`로 재생성하며, `BattleScene.preload()`에서 preload합니다. `TransitionEffects`는 PNG key가 없을 때만 기존 `generateTexture()` 파티클 fallback을 생성합니다. `MainMenuScene`의 타이틀 입자도 `particle_ether_beam.png`를 먼저 사용하고, PNG key가 없을 때만 기존 rectangle fallback을 생성합니다.

`SceneTransitionManager.showLoadingIndicator()`는 `UI-HUD-005-DEF.png`를 `ui_frame_transition_loading_panel` key로 preload해 전환 로딩 중앙 panel frame을 먼저 표시하고, `UI-BTN-005-DEF.png`를 `ui_frame_transition_loading_spinner_track` key로 preload해 arc spinner 뒤쪽 track frame을 표시합니다. 전체 화면 dimmer, 회전 arc, `불러오는 중...` 점 애니메이션은 동적 Phaser UI로 유지하며, frame key가 없을 때만 기존 절차 사각형 panel/track fallback을 사용합니다. `?debugScene=transitionLoading&renderer=canvas&transitionLoadingFrameQa=1`은 `aeternaTransitionLoadingFrameQa`에 panel/spinner track frame 렌더 상태와 누락 key를 기록합니다.

`MainMenuScene` 타이틀 배경은 `ERB-BG-SKY-DUSK.png`와 `ERB-BG-MID-DUSK.png` Aseprite 환경 배경을 먼저 렌더하고, `ERB-BG-SKY-DUSK` key가 없을 때만 기존 절차형 그라디언트 fallback을 생성합니다. 로그인/회원가입 모달은 `UI-SET-001-DEF.png`, 크레딧 오버레이는 `UI-HUD-005-DEF.png`를 먼저 렌더하며, 메인 메뉴의 게임 시작/설정/크레딧 버튼은 `UI-BTN-006-DEF.png`를 `ui_frame_main_menu_button` key로 preload해 버튼 배경 frame을 먼저 표시합니다. 세 버튼 내부 아이콘은 `skill_mw_arrow.png`, `skill_tg_reverse.png`, `ITM-QST-004.png`를 `20x20` Aseprite image로 먼저 표시하고, texture가 없을 때만 기존 focus/glyph label fallback을 사용합니다. 로그인/가입/닫기 및 크레딧 닫기 버튼은 같은 PNG를 `ui_frame_main_menu_modal_button` key로 분리 preload해 모달 action frame으로 사용합니다. 로그인/크레딧 모달 닫기 액션은 `skill_tg_reverse.png` / `skill_tg_reverse_icon`을 `16x16` Aseprite image로 먼저 표시하고, texture가 없을 때만 작은 ASCII `x` fallback을 사용합니다. 로그인 DOM input 2개도 같은 PNG를 `ui_frame_main_menu_modal_input` key로 분리 preload하고 CSS background frame으로 사용합니다. 메뉴 label, keyboard focus index, pointer click, 인증 흐름은 동적 Phaser UI 로직으로 유지하고, modal frame key가 없을 때만 기존 검은 사각형 fallback을 생성합니다. `mainMenuFrameQa=1`은 `menuButtonIcon`, `missingMenuButtonIconKeys`, `modalCloseIcon`, frame/input 상태를 함께 기록합니다.

전투 기본 hit slash VFX는 `vfx_hit_slash_sprite`로 매핑합니다. 이 리소스는 `512x64` sheet, `64x64` frame, `start` 0-1 / `loop` 2-5 / `end` 6-7 계약을 따르며 2026-06-12 브라우저 QA에서 `_showHitVFX()` 호출 시 `Sprite` animation 인스턴스 생성을 확인했습니다. 기존 원형 버스트와 크리티컬 링은 보강/fallback 효과로 유지합니다.

`WorldScene`은 월드맵 지역 아이콘 `zone_aether_plains`, `zone_memory_forest`, `zone_malatus_sanctuary`, `zone_shadow_gorge`, `zone_crystal_cave`, `zone_forgotten_citadel`, `zone_chrono_spire`를 `spriteResourceManifest`의 `worldmap` 리소스로 로드합니다. 각 리소스는 단일 `64x64` Aseprite export이며 기존 `assets/generated/ui/worldmap/<iconKey>.png` 직접 경로는 fallback으로 유지합니다. 월드맵 선택 정보 패널은 `UI-HUD-003-DEF.png`, 배경 프리뷰 프레임은 `UI-HUD-004-DEF.png`를 먼저 렌더하고, frame key가 없을 때만 기존 절차 사각형 fallback을 생성합니다.

`WorldScene` 타이틀의 지도 표식은 같은 `worldmap` Aseprite 아이콘 중 `zone_aether_plains.png`를 `24x24` 이미지로 먼저 렌더합니다. texture가 없을 때만 기존 `🗺️` 텍스트 fallback을 사용하며, `worldFrameQa=1` 경로는 `titleIcon`에 zone id, texture key/path, expected/rendered count, 표시 크기, fallback 상태, 누락 key를 기록합니다.

`WorldScene` 전체 배경은 현재 지역의 `resolveZoneBackground()` 결과인 Aseprite 환경 배경 `farPath`를 먼저 preload/render합니다. `worldFrameQa=1` 경로는 `document.body.dataset.aeternaWorldFrameQa`에 배경 이미지 key/path, 렌더 수, 표시 크기, 누락 key를 기록하며, 해당 texture key가 없을 때만 기존 단색 사각형 fallback을 사용합니다.

`WorldScene`의 시대 전환 Q/E 버튼, 마을 복귀 버튼, 선택 패널의 시간 이동 버튼은 `UI-BTN-006-DEF.png`를 `ui_frame_world_action_button` key로 preload해 Aseprite button frame을 먼저 표시합니다. 버튼 label, hover tint, 키보드 단축키, 지역 이동 callback, QA용 encounter 문구는 동적 Phaser UI 로직으로 유지합니다.

`WorldScene` 액션 버튼 내부 아이콘은 Aseprite skill icon을 먼저 사용합니다. 이전 시대 버튼은 `skill_tg_reverse.png`, 다음 시대 버튼은 `skill_tg_haste.png`, 마을 복귀 버튼은 `skill_vw_warp.png`, 시간 이동 버튼은 `skill_mw_arrow.png`를 `18x18` 이미지로 렌더링하고, 아이콘이 있을 때 label은 단축키/텍스트만 표시합니다. icon texture가 없을 때만 기존 `◀`, `▶`, `←` 기호 포함 label fallback을 사용합니다. `worldFrameQa=1` 경로는 `actionButtonIcon` 렌더 상태와 함께 `actionButtonText.labels`, `actionButtonText.legacyGlyphPresent`를 기록해 Aseprite icon 사용 시 버튼 label에 방향 glyph가 남지 않았는지 검증합니다.

`WorldScene` 잠금 지역 마커는 Aseprite status icon을 먼저 사용합니다. `forgotten_citadel`, `chrono_spire`처럼 `unlocked: false`인 지역은 `status_stun.png`를 `22x22` 이미지로 노드 위에 표시하고, texture가 없을 때만 기존 `🔒` 텍스트 fallback을 사용합니다. `worldFrameQa=1` 경로는 `lockedZoneIcon`에 expected/rendered count, texture key, 표시 크기, 누락 key를 기록합니다.

`WorldScene` 선택 지역 정보 패널의 지역 식별 마커도 같은 `worldmap` Aseprite 아이콘을 먼저 사용합니다. 선택된 지역의 `zone_<zoneId>.png`를 `30x30` 이미지로 표시하고, 해당 texture가 없을 때만 기존 `projection.tintColor` 원형 fallback을 사용합니다. `worldFrameQa=1` 경로는 `selectedZonePanelIcon`에 선택 zone id, texture key/path, expected/rendered count, 표시 크기, 누락 key를 기록합니다.

`WorldScene` 선택 지역 정보 패널의 필드 encounter line은 `status_shield.png`와 `skill_ek_slash.png` Aseprite icon을 먼저 사용합니다. ambient 표식은 `world_encounter_ambient_icon` `16x16` image로 표시하고, 보스 슬롯이 있는 encounter 또는 `worldFrameQa=1` 경로에서는 `world_encounter_boss_icon` `16x16` image를 추가합니다. 정상 text는 encounter 설명과 보스 가능 문구만 유지하며, icon texture가 없을 때만 기존 `🛡`/`⚔️` glyph fallback을 사용합니다. `worldFrameQa=1` 경로는 `encounterLineIcon`에 ambient/boss icon key/path, expected/rendered count, 표시 크기, fallback 여부, 누락 key, legacy glyph 존재 여부를 기록합니다.

`WorldScene` 현재 위치 플레이어 마커는 캐릭터 class id에 맞는 `char_battle_*.png` Aseprite 전투 썸네일을 먼저 사용합니다. 월드맵에서는 `24x36` 이미지 마커로 표시하고, texture가 없을 때만 기존 흰색 원형 fallback을 사용합니다. `worldFrameQa=1` 경로는 `playerMarkerAvatar`에 class id, texture key/path, expected/rendered count, 표시 크기, 누락 key를 기록합니다.

`BattleScene`은 에테르 기사 기본 스킬 아이콘 `skill_ek_slash`, `skill_ek_shield`, `skill_ek_charge`, `skill_ek_explode`, `skill_ek_passive`, `skill_ek_ultimate`를 `spriteResourceManifest`의 `skillIcon` 리소스로 로드합니다. `BattleUI`는 텍스처가 있으면 슬롯 중앙에 `30x30` 이미지 아이콘을 표시하고, 이미지가 없을 때만 기존 텍스트 중심 슬롯으로 fallback합니다. 전투 스킬 슬롯 배경은 `assets/generated/ui/frames/UI-BTN-001-DEF.png`를 `ui_frame_UI-BTN-001-DEF`로 preload해 Aseprite UI frame을 먼저 사용하고, frame key가 없을 때만 기존 절차 사각형으로 fallback합니다. 전투 로그 패널은 `UI-HUD-008-DEF.png`를 `ui_frame_UI-HUD-008-DEF`로 preload해 우측 상단 로그 배경 frame을 먼저 사용하고, 로그 텍스트/중요 이벤트 하이라이트는 동적 Phaser text로 유지합니다. 스킬 hover tooltip은 `UI-HUD-005-DEF.png`를 `ui_frame_battle_skill_tooltip` key로 preload해 tooltip 배경 frame을 먼저 표시하고, 스킬명/피해량/MP/CD 텍스트와 hover lifecycle은 동적 Phaser UI로 유지합니다. 전투 일시정지/도주 utility button은 `UI-BTN-006-DEF.png`를 `ui_frame_battle_utility_button` key로 preload해 버튼 배경 frame을 먼저 표시하고, pause/resume label 전환, P 키 입력, 도주 콜백은 기존 동적 BattleUI 로직으로 유지합니다. `BattleScene` 하단 HUD와 커맨드/마법/아이템 메뉴 배경은 `UI-HUD-001-DEF.png`, `UI-BTN-002-DEF.png`, `UI-BTN-003-DEF.png`, `UI-BTN-004-DEF.png`를 preload해 Aseprite frame을 먼저 표시하고, frame key가 없을 때만 기존 절차 사각형으로 fallback합니다. 전투 결과/패배 팝업은 `UI-INV-005-DEF.png`와 `UI-INV-006-DEF.png`를 각각 `ui_frame_UI-INV-005-DEF`, `ui_frame_UI-INV-006-DEF`로 preload해 Aseprite frame을 먼저 표시합니다. 패배 팝업의 title 표식은 `status_curse.png`를 `18x18` 이미지로 먼저 표시하고, icon texture가 없을 때만 기존 `💔` glyph fallback을 사용합니다. 승리 결과 팝업의 title 표식은 `skill_ek_ultimate.png`, 경험치 표식은 `skill_ek_passive.png`, 골드 표식은 `ITM-MAT-002.png`, 전리품 제목 표식은 `ITM-MAT-001.png`를 각각 `18x18` 이미지로 먼저 표시하고, icon texture가 없을 때만 기존 `🏆`/`✨`/`💰`/`📦` glyph fallback을 사용합니다. 전리품 행과 확인 버튼은 동적 Phaser text로 유지합니다. 전투 페이싱 버튼(AUTO/Speed/ATB)은 `UI-BTN-006-DEF.png`를 별도 `ui_frame_battle_pace_button` key로 preload해 세 버튼 배경 frame을 먼저 표시하고, 버튼 label, 색상, 단축키 동작은 동적 Phaser text로 유지합니다. 협공/3인 협공 버튼도 같은 PNG를 별도 `ui_frame_battle_combo_tech_button` key로 preload해 후보 버튼 배경 frame을 먼저 표시하고, 후보 표시 여부와 발동 입력은 기존 전투 로직이 유지합니다. `GameScene` 필드 HUD DOM 패널은 `HudOverlay` CSS background로 `UI-HUD-007-DEF.png`, `UI-HUD-001-DEF.png`, `UI-HUD-008-DEF.png`, `UI-HUD-006-DEF.png`를 상태, 퀵슬롯, 퀘스트 트래커, 필드 대화창 배경에 각각 적용합니다. 필드 HUD quickslot, 퀘스트 맵, 대화 선택지 버튼은 `UI-BTN-006-DEF.png`를 `ui_frame_hud_dom_button` 계약으로 CSS background에 적용하고, HP/MP/EXP bar, 퀘스트 행, 버튼 label/focus/cooldown 상태는 동적 DOM 상태로 유지합니다. 퀘스트 맵 버튼 내부 아이콘은 `QuestItem.mapZoneId`를 `getSpriteResourceForWorldZoneIcon()`로 해석해 `zone_<mapZoneId>.png`를 `16x16` 이미지로 먼저 표시합니다. 월드맵 리소스가 없는 목표 ID는 버튼을 숨기고 `actionHint`만 유지해 기존 `🗺` glyph fallback이 노출되지 않게 합니다. `hudFrameQa=1` 경로는 `questMapIcon`에 expected/rendered image count, 누락 key, 실제 이미지 렌더 상태를 기록합니다. `ZoneTeleportManager`는 `UI-HUD-006-DEF.png`를 `ui_frame_zone_teleport_panel` key로 preload해 포탈 이동 panel frame을 먼저 표시하고, `UI-BTN-006-DEF.png`를 `ui_frame_zone_teleport_button` key로 preload해 이동/취소 button frame 2개를 먼저 표시합니다. 포탈명 제목 아이콘은 `skill_vw_warp.png`를 `18x18` 이미지로 먼저 표시하고, icon texture가 없을 때만 기존 `🌀` glyph fallback을 사용합니다. `zoneTeleportFrameQa=1` 경로는 `titleIcon`과 `missingTitleIconKeys`에 제목 아이콘 렌더 상태를 기록합니다. 포탈명 text, 대상 지역 label, hit area, hover color, 실제 teleport callback은 동적 Phaser UI 로직으로 유지합니다. `DungeonScene` 하단 상태 panel, 전투 시작 버튼, 클리어 보상 panel은 `UI-HUD-007-DEF.png`, `UI-BTN-006-DEF.png`, `UI-INV-005-DEF.png`를 preload해 Aseprite frame을 먼저 표시하고, HP/MP fill, wave text, 보상 text, 입력 처리는 동적 Phaser UI로 유지합니다. 던전 제목 아이콘은 `skill_ek_slash.png`를 `dungeon_title_icon` `20x20` image로 먼저 표시하고, 전투 시작 버튼 내부 아이콘은 같은 리소스를 `dungeon_action_button_icon` `22x22` image로 먼저 표시합니다. icon texture가 없을 때만 기존 `⚔` 제목 prefix와 `⚔ Battle!` label fallback을 사용합니다. `dungeonFrameQa=ready` 경로는 `titleIcon`, `actionButtonIcon`, `missingTitleIconKeys`, `missingActionButtonIconKeys`에 던전 제목/전투 버튼 아이콘 렌더 상태를 기록합니다. `LobbyScene` 미니맵 배경은 `UI-HUD-002-DEF.png`를 `ui_frame_UI-HUD-002-DEF`로 preload해 Aseprite HUD frame을 먼저 사용하고, frame key가 없을 때만 기존 검은 사각형으로 fallback합니다. `MinimapOverlay`도 같은 `UI-HUD-002-DEF.png`를 `ui_frame_minimap_overlay_panel` key로 preload해 독립 미니맵 panel frame을 먼저 표시하고, `?debugScene=minimapOverlay&renderer=canvas&minimapOverlayFrameQa=1`에서 `aeternaMinimapOverlayFrameQa`로 프레임/마커 렌더 상태를 기록합니다. `LobbyScene` 주요 모달은 `UI-HUD-007-DEF.png`, `UI-HUD-008-DEF.png`, `UI-SHP-001-DEF.png`, `UI-SHP-002-DEF.png`, `UI-SHP-003-DEF.png`, `UI-INV-003-DEF.png`, `UI-INV-004-DEF.png`를 preload해 NPC 대화, 스토리, 상점, 강화, 파티, 인벤토리, 퀘스트 panel frame을 먼저 표시합니다. `SkillTreeUI`는 `LobbyScene.preload()`에서 `UI-SET-002-DEF.png`와 `UI-SET-003-DEF.png`를 별도 texture key로 preload해 스킬 트리 main/detail panel frame을 먼저 표시하고, `UI-BTN-006-DEF.png`를 `ui_frame_skill_tree_action_button` key로 preload해 main close/reset 및 detail unlock/upgrade/close action button frame을 먼저 표시합니다. class color stroke, 선택 강조, 버튼 label/callback은 Phaser primitive와 동적 text 로직으로 유지합니다. `MainMenuScene` 로그인/크레딧 모달은 `UI-SET-001-DEF.png`와 `UI-HUD-005-DEF.png`를 preload해 Aseprite frame을 먼저 사용하고, 로그인/가입/닫기 및 크레딧 닫기 버튼은 `UI-BTN-006-DEF.png`를 `ui_frame_main_menu_modal_button` key로, 로그인 DOM input 2개는 `ui_frame_main_menu_modal_input` key로 preload해 모달 action/input frame으로 먼저 표시합니다. `LoadingScene`은 `UI-HUD-005-DEF.png`와 `UI-BTN-005-DEF.png`를 Phase 1 preload에 포함해 중앙 로딩 panel과 progress track frame을 먼저 표시하고, progress fill은 로더 이벤트에 맞춰 Phaser primitive로 유지합니다. `SettingsScene`은 `UI-SET-002-DEF.png`, `UI-SET-003-DEF.png`, `UI-SET-004-DEF.png`를 preload해 설정 본문, 키바인드, 하단 액션 panel frame을 먼저 표시하고, `UI-BTN-006-DEF.png`를 `ui_frame_settings_action_button` key로 preload해 피드백/뒤로가기 액션 버튼 배경 frame 2개를 먼저 표시합니다. 설정 항목 label, slider/toggle/cycle 상태, 버튼 label/focus text는 동적 Phaser UI로 유지합니다. `FeedbackForm`은 `UI-SET-002-DEF.png`를 `ui_frame_UI-SET-002-DEF`로 preload해 500x600 피드백 폼 panel frame을 먼저 표시하고, `UI-BTN-006-DEF.png`를 `ui_frame_feedback_form_button` key로 preload해 유형 선택 5개, 제출, 닫기 버튼 배경 frame을 먼저 표시합니다. 유형 버튼 내부 아이콘은 `status_poison.png`, `status_haste.png`, `status_shield.png`, `status_charm.png`, `status_stun.png`를 `18x18` image로 먼저 렌더하고, icon texture가 없을 때만 기존 이모지 label fallback을 사용합니다. HTML input/textarea와 버튼 label/focus text는 동적 UI로 유지합니다. `CharacterSelectScene`은 `UI-INV-001-DEF.png`와 `UI-INV-002-DEF.png`를 preload해 기존 캐릭터 row와 클래스 생성 card frame을 먼저 표시하고, 캐릭터명 DOM input은 `UI-BTN-006-DEF.png`를 `ui_frame_character_select_name_input` key로, 생성 액션 버튼은 `ui_frame_character_select_action_button` key로 preload해 input/button frame으로 먼저 표시합니다. DOM input 위치는 Phaser canvas CSS scale 기준으로 보정하고, 버튼 hit 영역, validation error text, 선택 강조는 동적 Phaser UI로 유지합니다. `EndingScene`은 `UI-HUD-006-DEF.png`를 `ui_frame_ending_story_panel` key로 preload해 에필로그 story panel frame을 먼저 표시하고, `UI-BTN-006-DEF.png`를 `ui_frame_ending_prompt_track` key로 preload해 하단 입력 안내 track frame을 먼저 표시합니다. 엔딩 CG, title/body/epilogue text, 내부 가독성 layer, title 복귀 입력은 동적 Phaser UI로 유지합니다. `CutsceneScene`은 `UI-HUD-006-DEF.png`를 preload해 하단 대화 box frame을 먼저 표시하고, stroke overlay만 Phaser primitive로 유지하며, `UI-BTN-006-DEF.png`를 `ui_frame_cutscene_action_button` key로 preload해 스킵/다음 버튼 frame 2개를 먼저 표시합니다. 스킵/다음 버튼 내부 아이콘은 `skill_tg_haste.png`, `skill_mw_arrow.png`를 `16x16` image로 먼저 표시하고, icon texture 누락 시에만 기존 `[ 스킵 ]`, `다음 ▶` fallback label을 사용합니다. `cutsceneFrameQa=1` 경로는 `actionButtonIcon`과 `missingActionButtonIconKeys`에 컷씬 버튼 아이콘 렌더 상태를 기록합니다. 컷씬 제목/본문 text, 진행도 label, click/keyboard 입력은 동적 Phaser UI로 유지합니다. 독립 `DialogueBox`는 `UI-HUD-006-DEF.png`를 `ui_frame_dialogue_box_panel` key로, `UI-BTN-006-DEF.png`를 `ui_frame_dialogue_box_choice_button` key로 preload해 NPC 대화 panel과 선택지 버튼 frame을 먼저 표시합니다. 다음 표시기는 `skill_mw_arrow.png`를 `16x16` image로 먼저 표시하고, texture 누락 시에만 기존 `▼` glyph fallback을 사용합니다. `?debugScene=dialogueBox&renderer=canvas&dialogueBoxFrameQa=1&dialogueBoxNextIndicatorQa=1`는 `aeternaDialogueBoxFrameQa.nextIndicatorIcon`에 표시 상태, texture key, 표시 크기, fallback/missing 상태를 기록합니다. 타이핑 효과, speaker/body text, 선택 콜백, skip/next 입력은 동적 Phaser UI로 유지합니다.

`BattleScene` 전투 종료 lead banner는 승리 `skill_ek_ultimate.png`, 패배 `status_curse.png`를 각각 `34x34` 이미지로 먼저 표시하고, icon texture가 없을 때만 기존 `🎉`/`💔` glyph fallback을 사용합니다.

`LobbyScene` 상단 골드 HUD는 `ITM-MAT-002.png`를 `18x18` 이미지로 먼저 표시하고, icon texture가 없을 때만 기존 `💰` glyph fallback을 사용합니다.

`DungeonScene` 클리어 타이틀은 `skill_ek_ultimate.png`를 `26x26` 이미지로 먼저 표시하고, icon texture가 없을 때만 기존 `🏆` glyph fallback을 사용합니다. `dungeonFrameQa=clear` 경로는 `clearTitleIcon`, `clearTitleLegacyGlyphPresent`, `missingClearTitleIconKeys`에 클리어 타이틀 아이콘 렌더 상태를 기록합니다.

`EndingScene` 하단 입력 안내 track 내부 아이콘은 Aseprite skill icon `skill_mw_arrow.png`를 `skill_mw_arrow_icon` texture로 preload해 먼저 사용합니다. prompt track frame과 title 복귀 입력은 기존 `EndingScene` 로직으로 유지하고, icon texture가 없을 때만 `>` text fallback을 표시합니다. `?debugScene=ending&renderer=canvas&endingFrameQa=1`는 `aeternaEndingFrameQa.promptIcon`과 `missingPromptIconKeys`에 prompt icon 렌더 상태를 기록합니다.

`BattleUI` utility button 내부 아이콘은 Aseprite skill icon을 먼저 사용합니다. 일시정지 버튼은 active 상태에서 `skill_tg_stop.png`, paused/resume 상태에서 `skill_mw_arrow.png`, 도주 버튼은 `skill_vw_warp.png`를 `14x14` 이미지로 렌더링하고, 아이콘이 있을 때 label은 `일시정지 (P)`, `재개 (P)`, `도주`처럼 텍스트만 표시합니다. icon texture가 없을 때만 기존 `⏸`, `▶`, `🏃` 기호/이모지 포함 label fallback을 사용합니다. `battleUtilityButtonFrameQa=1`은 `utilityButtonIcon.expectedTextureKeys`, `pauseIconTextureKey`, `pauseLabelLegacyGlyphPresent`, `missingUtilityButtonIconKeys`로 pause/resume/flee 아이콘 상태를 기록합니다.

`BattleUI` 전투 로그 하이라이트도 Aseprite skill icon을 먼저 사용합니다. 크리티컬은 `skill_ek_explode.png`, CHAIN/콤보는 `skill_mw_storm.png`, 승리는 `skill_ek_ultimate.png`, 레벨 업은 `skill_ek_passive.png`를 `16x16` 이미지로 렌더링하고, 아이콘이 있을 때 하이라이트 text는 `CRIT 88`, `CHAIN ×2`, `승리!`, `레벨 업`처럼 glyph 없는 텍스트만 표시합니다. icon texture가 없을 때만 기존 `💥`, `🔥`, `🎉`, `🆙`, `⚡` glyph fallback을 유지합니다. `?debugScene=battle&renderer=canvas&battleLogHighlightIconQa=critical|chain|victory|level`은 `aeternaBattleLogHighlightIconQa`에 icon key, 렌더 수, 표시 크기, fallback 여부, 누락 key, legacy glyph 존재 여부를 기록합니다.

`BattleScene` 마법/아이템 서브메뉴 focus marker는 `skill_mw_arrow.png`를 `14x14` 이미지 `battle_submenu_focus_icon`으로 먼저 표시합니다. 마법/아이템 row 자체 icon은 기존 skill/item Aseprite image를 유지하고, 선택 focus만 별도 image object로 이동시켜 label에는 `▶` prefix를 넣지 않습니다. focus icon texture가 없을 때만 기존 `▶` prefix fallback을 사용합니다. `battleSubMenuFocusIconQa=magic|item`은 `aeternaBattleSubMenuFocusIconQa`에 `subMenuType`, `activeIndex`, `focusIcon`, `legacyGlyphPresent`, `missingBattleSubMenuFocusIconKeys`를 기록합니다.

`BattleScene` 협공/3인 협공 버튼 내부 아이콘은 Aseprite skill icon을 먼저 사용합니다. 협공 버튼은 `skill_mw_storm.png`, 3인 협공 버튼은 `skill_ek_ultimate.png`를 `18x18` 이미지로 렌더링하고, 아이콘이 있을 때 button label과 후보명은 `협공 (D)`, `3인 협공 (T)`, `<후보명> (D/T)`처럼 텍스트만 표시합니다. icon texture가 없을 때만 기존 `✨`, `🌟`, `💥` 기호/이모지 prefix fallback을 사용합니다.

`BattleScene` CHAIN 라벨도 Aseprite skill icon을 먼저 사용합니다. 일반 chain은 `skill_mw_storm.png`, MAX chain은 `skill_ek_explode.png`를 `18x18` 이미지로 렌더링하고, 아이콘이 있을 때 label text는 `CHAIN ×N` 또는 `CHAIN ×N MAX`만 표시합니다. icon texture가 없을 때만 기존 `🔥`/`💥` glyph prefix fallback을 사용합니다. `?debugScene=battle&renderer=canvas&battleChainLabelIconQa=chain|max`는 `aeternaBattleChainLabelIconQa`에 icon key/path, 렌더 수, 표시 크기, fallback 여부, 누락 key, legacy glyph 존재 여부를 기록합니다.

`BattleScene` 방어 커맨드의 머리 위 방어 상태 표시는 `getStatusIconResource('shield')`로 `status_shield.png` Aseprite status icon을 먼저 사용합니다. 방어 수명, 방어력 스냅샷 복원, 캐릭터 추종 위치 갱신은 기존 `_performDefend()` 로직으로 유지하고, `status_shield_icon` texture가 없을 때만 기존 `🛡` 텍스트 fallback을 생성합니다.

`BattleScene` ECHO 피해 팝업은 `skill_mw_storm.png` Aseprite skill icon을 먼저 사용합니다. `_spawnEchoText()`는 `battle_echo_popup_icon`을 `18x18` image로 렌더하고, 아이콘이 있을 때 popup text는 `ECHO +N`만 표시합니다. `skill_mw_storm_icon` texture가 없을 때만 기존 `✨ ECHO +N` 문자열 fallback을 사용합니다. `?debugScene=battle&renderer=canvas&battleEchoPopupIconQa=1`는 `aeternaBattleEchoPopupIconQa`에 icon key/path, 렌더 수, 표시 크기, fallback 여부, 누락 key, legacy glyph 존재 여부를 기록합니다.

`BattleScene` 반사 피해 팝업도 같은 `status_shield.png` Aseprite status icon을 먼저 사용합니다. `_spawnReflectText()`는 `battle_reflect_popup_icon`을 `18x18` image로 렌더하고, 아이콘이 있을 때 popup text는 `-N` 피해량만 표시합니다. `status_shield_icon` texture가 없을 때만 기존 `🛡 -N` 문자열 fallback을 사용합니다. `?debugScene=battle&renderer=canvas&battleReflectPopupIconQa=1`는 `aeternaBattleReflectPopupIconQa`에 icon key/path, 렌더 수, 표시 크기, fallback 여부, 누락 key, legacy glyph 존재 여부를 기록합니다.

`BattleScene` 크리티컬 데미지 팝업은 `skill_ek_explode.png` Aseprite skill icon을 먼저 사용합니다. `_spawnDamageNumber()`는 critical 타입일 때 `battle_critical_popup_icon`을 `20x20` image로 렌더하고, 아이콘이 있을 때 popup text는 피해량 숫자만 표시합니다. `skill_ek_explode_icon` texture가 없을 때만 기존 `💥N` 문자열 fallback을 사용합니다. `?debugScene=battle&renderer=canvas&battleCriticalPopupIconQa=1`는 `aeternaBattleCriticalPopupIconQa`에 icon key/path, 렌더 수, 표시 크기, fallback 여부, 누락 key, legacy glyph 존재 여부를 기록합니다.

`BattleScene` 활성 턴 머리 위 표시도 Aseprite `skill_mw_arrow.png`를 `skill_mw_arrow_icon` texture로 preload해 먼저 사용합니다. `_showActiveIndicator()`는 같은 아이콘을 `28x28` 이미지로 만들고 90도 회전해 하향 포인터로 쓰며, 위치 계산과 펄싱 tween은 기존 active commander 로직을 유지합니다. texture가 없을 때만 기존 `▼` 텍스트 fallback을 생성합니다.

`BattleScene` 좌상단 필드 ambient line의 방패/보스 표식도 Aseprite 아이콘을 먼저 사용합니다. 기본 ambient 표식은 `status_shield.png`를 `battle_field_ambient_ambient_icon` `18x18` image로 렌더하고, `fieldEnc.hasBossSlot`이 true이면 `skill_ek_slash.png`를 `battle_field_ambient_boss_icon` `18x18` image로 추가 렌더합니다. 정상 경로의 ambient text는 실제 설명 문장만 표시하며, icon texture가 없을 때만 기존 `🛡`/`⚔️` glyph fallback을 문자열에 포함합니다. `battleAmbientLineQa=1` 경로는 `aeternaBattleAmbientLineQa`에 ambient/boss icon 렌더 수, 표시 크기, 누락 key, legacy glyph 존재 여부를 기록합니다.

`BattleScene` 전투 시작 인트로 오버레이는 `skill_ek_slash.png` / `skill_ek_slash_icon` Aseprite skill icon을 `battle_intro_start_icon` `34x34` image로 먼저 표시하고, 인트로 text는 `전투 시작!`만 유지합니다. icon texture가 없을 때만 기존 `⚔ 전투 시작!` 문자열 fallback을 사용합니다. `?debugScene=battle&renderer=canvas&battleIntroIconQa=1`는 `aeternaBattleIntroIconQa`에 icon key/path, 렌더 수, 표시 크기, fallback 여부, 누락 key, legacy glyph 존재 여부를 기록합니다.

`BattleScene` 커맨드 메뉴의 공격/마법/아이템/방어/도주 아이콘은 각각 `skill_ek_slash.png`, `skill_mw_bolt.png`, `ITM-CON-001.png`, `status_shield.png`, `skill_vw_warp.png`를 먼저 사용합니다. 메뉴 배경, 선택 highlight, pointer/keyboard 커맨드 실행, label 텍스트는 기존 동적 Phaser UI 로직으로 유지하고, 각 icon texture가 없을 때만 기존 이모지 포함 label fallback을 표시합니다.

`BattleScene` 커맨드 메뉴의 선택 focus 표시는 기존 `▶` text prefix 대신 `skill_mw_arrow.png` / `skill_mw_arrow_icon` Aseprite skill icon을 재사용합니다. `battle_command_focus_icon`을 `14x14` 이미지로 표시하고, 키보드/포인터 focus 이동 시 같은 icon 위치만 공격/마법/아이템/방어/도주 command 왼쪽으로 갱신합니다. command label은 icon이 있을 때 텍스트만 유지하고, focus icon texture가 없을 때만 기존 `▶` prefix fallback을 사용합니다. `?debugScene=battle&renderer=canvas&battleCommandFocusIconQa=1`는 `aeternaBattleCommandFocusIconQa`에 active index, icon key/path, rendered/expected count, 표시 크기, fallback 여부, legacy glyph 존재 여부, 누락 key를 기록합니다.

`BattleScene` 마법/아이템 서브메뉴도 row 앞 아이콘을 Aseprite PNG로 먼저 표시합니다. 마법 서브메뉴는 각 `SkillSlot.icon`을 `getSpriteResourceForSkillIcon()`으로 해결해 `battle_magic_submenu_icon_<skillId>` 이미지를 만들고, 아이템 서브메뉴의 포션 row는 `ITM-CON-001.png`를 `battle_item_submenu_icon_ITM-CON-001` 이미지로 렌더링합니다. 스킬명, MP 비용, 쿨다운/MP 부족 로그, pointer/keyboard 선택은 기존 동적 Phaser UI 로직으로 유지하고, icon texture가 없을 때만 기존 이모지 포함 item label fallback을 사용합니다.

`GameScene` 필드 보스 라벨은 `skill_ek_slash.png` / `skill_ek_slash_icon` Aseprite skill icon을 `game_scene_boss_label_icon` `18x18` image로 먼저 표시하고, 라벨 text는 `BOSS`만 유지합니다. icon texture가 없을 때만 기존 `⚔️ BOSS` 문자열 fallback을 사용합니다. `?debugScene=game&renderer=canvas&bossLabelIconQa=1`는 QA 보스 1개를 추가 스폰하고 `aeternaGameBossLabelIconQa`에 icon key/path, 렌더 수, 표시 크기, fallback 여부, 누락 key, legacy glyph 존재 여부를 기록합니다.

`GameScene` 상단 존 라벨은 현재 zone id를 `getSpriteResourceForWorldZoneIcon()`으로 해석해 `zone_<zoneId>.png` Aseprite worldmap icon을 `game_scene_zone_label_icon` `18x18` image로 먼저 표시하고, 라벨 text는 `존명 / 시대명`만 유지합니다. icon texture가 없을 때만 기존 `📍` 문자열 fallback을 사용합니다. `?debugScene=game&renderer=canvas&zoneLabelIconQa=1`는 `aeternaGameZoneLabelIconQa`에 zone id, icon key/path, 렌더 수, 표시 크기, fallback 여부, 누락 key, legacy glyph 존재 여부를 기록합니다.

`GameScene` 필드 HUD 퀵슬롯 아이콘은 `HudOverlay.makeDefaultSlots()`에서 `getSpriteResourceForSkillIcon()`와 `getItemIconResource()`를 통해 Aseprite 스킬/아이템 PNG를 연결합니다. 기본 12칸은 `skill_ek_slash`, `skill_mw_storm`, `skill_ek_shield`, `skill_mw_heal`, `ITM-CON-001`, `skill_tg_haste`, `skill_ek_charge`, `skill_tg_stop`, `skill_mw_ultimate`, `skill_vw_warp`, `ITM-MAT-001`, `skill_vw_tether`를 사용하며, DOM에는 `img.slot-icon-image`로 표시합니다. 이미지 path가 없거나 load error가 발생할 때만 기존 `◆` 텍스트 fallback을 보이고, `?debugScene=game&renderer=canvas&hudFrameQa=1`는 `aeternaHudFrameQa.quickSlotIcon`에 expected/rendered count, natural size, 누락 key를 기록합니다.

`GameScene` 필드 HUD 상태 패널 아바타는 현재 캐릭터 class id를 `getCharacterHudAvatarResource()`로 해석해 `client/public/assets/generated/characters/class_main/battle/char_battle_*.png` Aseprite 전투 썸네일을 `HudOverlay`의 `avatarUrl`/`avatarImageKey`로 전달합니다. DOM에는 `img#hud-avatar-image`로 표시하며, 이미지 path가 없거나 load error가 발생할 때만 숨김 fallback을 사용합니다. `?debugScene=game&renderer=canvas&hudFrameQa=1`는 `aeternaHudFrameQa.hudAvatar`에 expected/rendered 상태, `char_battle_*` key/path, natural size, 누락 key를 기록합니다. HP/MP/EXP bar와 레벨/이름 text는 기존 동적 DOM 로직으로 유지합니다.

`GameScene` 필드 HUD 퀘스트 액션 힌트는 기존 `▶` 텍스트 기호 대신 `skill_mw_arrow.png` / `skill_mw_arrow_icon` Aseprite skill icon을 `img.hud-quest-action-icon` `14x14` 이미지로 먼저 표시합니다. 진행 안내 문구는 `span.hud-quest-action-text`로 분리해 DOM text 흐름을 유지하고, skill icon 리소스가 없을 때만 작은 `>` fallback을 사용합니다. `?debugScene=game&renderer=canvas&hudFrameQa=1`는 `aeternaHudFrameQa.questActionIcon`에 expected/rendered image count, natural size, 누락 key를 기록합니다.

`LobbyScene` NPC 대화/스토리 패널의 초상화는 `LOBBY_NPC_PORTRAIT_TEXTURES`의 512x512 Aseprite portrait PNG를 먼저 사용합니다. 대장장이 칼렌, 상인 미라, 기억의 게시판, 모험가 길드, 장로 마테우스는 각각 `npc_portrait_19_kalen_portrait.png`, `npc_portrait_20_mira_portrait.png`, `npc_portrait_18_memory_fragment_portrait.png`, `npc_portrait_13_hashir_portrait.png`, `npc_portrait_04_mateus_portrait.png`를 preload하며, texture가 없을 때만 기존 64x64 NPC sprite frame 0을 portrait fallback으로 사용합니다. 패널 frame, 대화/버튼 text, 키보드 탐색, 실제 NPC action callback은 기존 동적 Phaser UI 로직으로 유지합니다.

`LobbyScene` NPC 대화 패널 제목은 기존 `💬` 텍스트 prefix 대신 대화 대상 NPC의 512x512 Aseprite portrait PNG를 재사용합니다. 제목 왼쪽에 `lobby_dialogue_title_icon`을 `20x20` 이미지로 먼저 표시하고, title text는 `상인 미라`처럼 NPC 이름만 유지합니다. texture가 없을 때만 기존 말풍선 glyph 포함 제목 fallback을 사용하며, `?debugScene=lobby&renderer=canvas&dialogueTitleIconQa=1`는 `aeternaDialogueTitleIconQa`에 렌더 수, texture key/path, 표시 크기, fallback 여부, 누락 key, legacy glyph 존재 여부를 기록합니다.

`LobbyScene` NPC 대화 패널의 `이용하기`/`닫기` 선택 버튼은 `UI-BTN-006-DEF.png` / `ui_frame_lobby_dialogue_choice_button` Aseprite button frame을 먼저 사용합니다. 두 버튼 뒤에 `lobby_dialogue_choice_button_frame`을 `108x34` 이미지로 렌더하고, 버튼 label, 포커스 prefix, pointer/keyboard callback은 기존 동적 Phaser text 로직으로 유지합니다. frame texture가 없을 때만 text-only fallback을 사용하며, `?debugScene=lobby&renderer=canvas&dialogueChoiceButtonFrameQa=1`는 `aeternaDialogueChoiceButtonFrameQa`에 rendered/expected count, texture key/path, 표시 크기, fallback 여부, 누락 key를 기록합니다.

`LobbyScene` NPC 대화 패널의 선택 focus 표시는 기존 `▶` text prefix 대신 `skill_mw_arrow.png` / `skill_mw_arrow_icon` Aseprite skill icon을 먼저 사용합니다. `lobby_dialogue_choice_focus_icon`을 `14x14` 이미지로 표시하고, focus 이동 시 아이콘 위치만 `이용하기`/`닫기` 버튼 사이에서 갱신합니다. 버튼 label은 아이콘이 있을 때 `[ 이용하기 ]`, `[ 닫기 ]` 텍스트만 유지하고, texture가 없을 때만 기존 `▶` prefix fallback을 사용합니다. `?debugScene=lobby&renderer=canvas&dialogueChoiceFocusIconQa=1`는 `aeternaDialogueChoiceFocusIconQa`에 icon key/path, rendered/expected count, 표시 크기, fallback 여부, legacy glyph 존재 여부, 누락 key를 기록합니다.

`LobbyScene` 로비 미니맵 NPC marker는 `getSpriteResourceForLobbyNpc()`로 해석한 NPC spritesheet frame 0을 `10x10` Aseprite 이미지로 먼저 표시합니다. 대장장이 칼렌, 상인 미라, 기억의 게시판, 모험가 길드, 장로 마테우스 marker는 각각 `npc_blacksmith_kalen_sprite`, `npc_merchant_mira_sprite`, `npc_memory_fragment_board_sprite`, `npc_guild_hashir_sprite`, `npc_elder_mateus_sprite`를 사용하며, texture가 없을 때만 기존 색상 원형 fallback을 사용합니다. `?debugScene=lobby&renderer=canvas&lobbyMinimapMarkerQa=1`는 `aeternaLobbyMinimapMarkerQa`에 expected/rendered marker count, texture key 목록, fallback id, 누락 key, 표시 크기를 기록합니다.

`LobbyScene` 하단 nav 버튼은 `world`, `dungeon`, `inventory`, `skill`, `quest` 항목을 각각 `zone_aether_plains`, `zone_crystal_cave`, `icon_item_ITM-CON_001`, `skill_ek_slash_icon`, `icon_item_ITM-QST_004` Aseprite 리소스로 먼저 표시합니다. 아이콘은 `18x18` image와 nearest filtering을 사용하며, texture가 없을 때만 기존 이모지 포함 label fallback을 유지합니다. `?debugScene=lobby&renderer=canvas&lobbyNavIconQa=1`는 `document.body.dataset.aeternaLobbyNavIconQa`에 expected/rendered icon count, texture key 목록, fallback id, 누락 key, 표시 크기를 기록합니다.

`LobbyScene` 하단 nav focus 표시는 기존 `▶` text prefix 대신 `skill_mw_arrow.png` / `skill_mw_arrow_icon` Aseprite skill icon을 먼저 사용합니다. `lobby_nav_focus_icon`을 `14x14` 이미지로 표시하고, 키보드/포인터 focus 이동 시 같은 icon 위치만 현재 nav 항목 왼쪽으로 갱신합니다. nav label은 icon이 있을 때 `월드맵`, `던전`, `인벤토리`, `스킬`, `퀘스트` 텍스트만 유지하고, focus icon texture가 없을 때만 기존 `▶` prefix fallback을 사용합니다. `?debugScene=lobby&renderer=canvas&lobbyNavFocusIconQa=1`는 `aeternaLobbyNavFocusIconQa`에 active index, icon key/path, rendered/expected count, 표시 크기, fallback 여부, legacy glyph 존재 여부, 누락 key를 기록합니다.

`LobbyScene` 인벤토리 패널 제목은 기존 `🎒` 텍스트 prefix 대신 `ITM-CON-001.png` / `icon_item_ITM-CON_001` Aseprite item icon을 재사용합니다. 제목 왼쪽에 `lobby_inventory_title_icon`을 `20x20` 이미지로 먼저 표시하고, title text는 `인벤토리 (N개)`처럼 텍스트만 유지합니다. texture가 없을 때만 기존 가방 glyph 포함 제목 fallback을 사용하며, `?debugScene=lobby&renderer=canvas&inventoryTitleIconQa=1`는 `aeternaInventoryTitleIconQa`에 렌더 수, texture key/path, 표시 크기, fallback 여부, 누락 key, legacy glyph 존재 여부를 기록합니다.

`LobbyScene` 인벤토리 패널의 아이템 행/닫기 action focus 표시는 기존 `▶` text prefix 대신 `skill_mw_arrow.png` / `skill_mw_arrow_icon` Aseprite skill icon을 재사용합니다. `lobby_inventory_action_focus_icon`을 `14x14` 이미지로 표시하고, 키보드 focus 이동 시 같은 icon 위치만 현재 아이템 행 또는 `[ 닫기 ]` action 왼쪽으로 갱신합니다. row/action label은 icon이 있을 때 텍스트만 유지하고, focus icon texture가 없을 때만 기존 `▶` prefix fallback을 사용합니다. `?debugScene=lobby&renderer=canvas&inventoryActionFocusIconQa=1`는 `aeternaInventoryActionFocusIconQa`에 active index, icon key/path, rendered/expected count, 표시 크기, fallback 여부, legacy glyph 존재 여부, 누락 key를 기록합니다.

`LobbyScene` 파티 모집 패널 제목은 기존 `⚔️` 텍스트 prefix 대신 `skill_ek_slash.png` / `skill_ek_slash_icon` Aseprite skill icon을 재사용합니다. 제목 왼쪽에 `lobby_party_recruit_title_icon`을 `20x20` 이미지로 먼저 표시하고, title text는 `모험가 길드 — 파티 모집`처럼 텍스트만 유지합니다. texture가 없을 때만 기존 검 glyph 포함 제목 fallback을 사용하며, `?debugScene=lobby&renderer=canvas&partyRecruitIconQa=1`는 `aeternaPartyRecruitIconQa`에 렌더 수, texture key/path, 표시 크기, fallback 여부, 누락 key, legacy glyph 존재 여부를 기록합니다.

`LobbyScene` 파티 모집 패널의 생성/검색/닫기 action focus 표시는 기존 `▶` text prefix 대신 `skill_mw_arrow.png` / `skill_mw_arrow_icon` Aseprite skill icon을 재사용합니다. `lobby_party_action_focus_icon`을 `14x14` 이미지로 표시하고, 키보드/포인터 focus 이동 시 같은 icon 위치만 `[ 파티 생성 ]`, `[ 파티 검색 ]`, `[ 닫기 ]` 사이에서 갱신합니다. action label은 icon이 있을 때 텍스트만 유지하고, focus icon texture가 없을 때만 기존 `▶` prefix fallback을 사용합니다. `?debugScene=lobby&renderer=canvas&partyActionFocusIconQa=1`는 `aeternaPartyActionFocusIconQa`에 active index, icon key/path, rendered/expected count, 표시 크기, fallback 여부, legacy glyph 존재 여부, 누락 key를 기록합니다.

`LobbyScene` 상점 패널 제목은 기존 `🛒` 텍스트 prefix 대신 `ITM-CON-001.png` / `icon_item_ITM-CON_001` Aseprite item icon을 재사용합니다. 제목 왼쪽에 `lobby_shop_title_icon`을 `20x20` 이미지로 먼저 표시하고, title text는 `상인 미라 — 아이템 상점`처럼 텍스트만 유지합니다. texture가 없을 때만 기존 카트 glyph 포함 제목 fallback을 사용하며, `?debugScene=lobby&renderer=canvas&shopTitleIconQa=1`는 `aeternaShopTitleIconQa`에 렌더 수, texture key/path, 표시 크기, fallback 여부, 누락 key, legacy glyph 존재 여부를 기록합니다.

`LobbyScene` 상점 패널의 구매/닫기 action focus 표시는 기존 `▶` text prefix 대신 `skill_mw_arrow.png` / `skill_mw_arrow_icon` Aseprite skill icon을 재사용합니다. `lobby_shop_action_focus_icon`을 `14x14` 이미지로 표시하고, 키보드/포인터 focus 이동 시 같은 icon 위치만 현재 `[구매]` 또는 `[ 닫기 ]` action 왼쪽으로 갱신합니다. action label은 icon이 있을 때 텍스트만 유지하고, focus icon texture가 없을 때만 기존 `▶` prefix fallback을 사용합니다. `?debugScene=lobby&renderer=canvas&shopActionFocusIconQa=1`는 `aeternaShopActionFocusIconQa`에 active index, icon key/path, rendered/expected count, 표시 크기, fallback 여부, legacy glyph 존재 여부, 누락 key를 기록합니다.

`LobbyScene` 장비 강화 패널 제목은 기존 `🔨` 텍스트 prefix 대신 `ITM-MAT-001.png` / `icon_item_ITM-MAT_001` Aseprite material item icon을 재사용합니다. 제목 왼쪽에 `lobby_enhance_title_icon`을 `20x20` 이미지로 먼저 표시하고, title text는 `대장장이 칼렌 — 장비 강화`처럼 텍스트만 유지합니다. texture가 없을 때만 기존 망치 glyph 포함 제목 fallback을 사용하며, `?debugScene=lobby&renderer=canvas&enhanceTitleIconQa=1`는 `aeternaEnhanceTitleIconQa`에 렌더 수, texture key/path, 표시 크기, fallback 여부, 누락 key, legacy glyph 존재 여부를 기록합니다.

`LobbyScene` 장비 강화 패널의 닫기 action focus 표시는 기존 `▶` text prefix 대신 `skill_mw_arrow.png` / `skill_mw_arrow_icon` Aseprite skill icon을 재사용합니다. `lobby_enhance_action_focus_icon`을 `14x14` 이미지로 표시하고, 키보드/포인터 focus 시 같은 icon을 `[ 닫기 ]` action 왼쪽에 유지합니다. action label은 icon이 있을 때 텍스트만 유지하고, focus icon texture가 없을 때만 기존 `▶` prefix fallback을 사용합니다. `?debugScene=lobby&renderer=canvas&enhanceActionFocusIconQa=1`는 `aeternaEnhanceActionFocusIconQa`에 active index, icon key/path, rendered/expected count, 표시 크기, fallback 여부, legacy glyph 존재 여부, 누락 key를 기록합니다.

`LobbyScene` 메인 스토리 패널 제목은 기존 `📖` 텍스트 prefix 대신 `ITM-QST-001.png` / `icon_item_ITM-QST_001` Aseprite quest item icon을 재사용합니다. 제목 왼쪽에 `lobby_story_title_icon`을 `20x20` 이미지로 먼저 표시하고, title text는 `장로 마테우스 — 메인 스토리`처럼 텍스트만 유지합니다. texture가 없을 때만 기존 책 glyph 포함 제목 fallback을 사용하며, `?debugScene=lobby&renderer=canvas&storyTitleIconQa=1`는 `aeternaStoryTitleIconQa`에 렌더 수, texture key/path, 표시 크기, fallback 여부, 누락 key, legacy glyph 존재 여부를 기록합니다.

`LobbyScene` 메인 스토리 패널의 시작/닫기 action focus 표시는 기존 `▶` text prefix 대신 `skill_mw_arrow.png` / `skill_mw_arrow_icon` Aseprite skill icon을 재사용합니다. `lobby_story_action_focus_icon`을 `14x14` 이미지로 표시하고, 키보드/포인터 focus 이동 시 같은 icon 위치만 `[ 챕터 1 시작 ]`과 `[ 닫기 ]` 사이에서 갱신합니다. action label은 icon이 있을 때 텍스트만 유지하고, focus icon texture가 없을 때만 기존 `▶` prefix fallback을 사용합니다. `?debugScene=lobby&renderer=canvas&storyActionFocusIconQa=1`는 `aeternaStoryActionFocusIconQa`에 active index, icon key/path, rendered/expected count, 표시 크기, fallback 여부, legacy glyph 존재 여부, 누락 key를 기록합니다.

`LobbyScene` 퀘스트 패널 제목은 기존 `📜` 텍스트 prefix 대신 `ITM-QST-004.png` / `icon_item_ITM-QST_004` Aseprite item icon을 재사용합니다. 제목 왼쪽에 `lobby_quest_title_icon`을 `20x20` 이미지로 먼저 표시하고, title text는 `퀘스트 (서버 동기화)` 또는 `퀘스트 (로컬 QA 데이터)`처럼 텍스트만 유지합니다. texture가 없을 때만 기존 스크롤 glyph 포함 제목 fallback을 사용하며, `?debugScene=lobby&renderer=canvas&questTitleIconQa=1`는 `aeternaQuestTitleIconQa`에 렌더 수, texture key/path, 표시 크기, fallback 여부, 누락 key, legacy glyph 존재 여부를 기록합니다.

`LobbyScene` 퀘스트 패널의 수주/완료/새로고침/닫기 action focus 표시는 기존 `▶` text prefix 대신 `skill_mw_arrow.png` / `skill_mw_arrow_icon` Aseprite skill icon을 재사용합니다. `lobby_quest_action_focus_icon`을 `14x14` 이미지로 표시하고, 키보드 focus 이동 시 같은 icon 위치만 현재 action 왼쪽으로 갱신합니다. action label은 icon이 있을 때 `[ 수주 ]`, `[ 완료 ]`, `[ 새로고침 ]`, `[ 닫기 ]` 텍스트만 유지하고, focus icon texture가 없을 때만 기존 `▶` prefix fallback을 사용합니다. `?debugScene=lobby&renderer=canvas&questActionFocusIconQa=1`는 `aeternaQuestActionFocusIconQa`에 active index, icon key/path, rendered/expected count, 표시 크기, fallback 여부, legacy glyph 존재 여부, 누락 key를 기록합니다.

`SettingsScene` slider track은 `UI-BTN-005-DEF.png`를 `ui_frame_settings_slider_track` key로 preload해 BGM/SFX/자막 배경 불투명도 3개 slider의 track frame을 먼저 렌더합니다. 값에 따라 변하는 fill bar, label percentage, pointer/keyboard 조작은 기존 Phaser primitive와 설정 저장 로직을 유지합니다.

`SettingsScene` 피드백/뒤로가기 액션 버튼 내부 아이콘은 Aseprite skill icon을 먼저 사용합니다. 피드백 버튼은 `skill_mw_arrow.png`, 뒤로가기 버튼은 `skill_tg_reverse.png`를 `18x18` 이미지로 표시하고, texture가 있을 때 label은 텍스트만 유지합니다. 설정 항목 focus marker도 `skill_mw_arrow.png`를 `settings_focus_icon` `14x14` 이미지로 재사용하고, texture가 있을 때 slider/toggle/cycle label에는 `▶` prefix를 붙이지 않습니다. icon texture가 없을 때만 기존 `📝`, `◀`, `▶` 포함 label fallback을 사용하며, `?debugScene=settings&renderer=canvas&settingsFrameQa=1`는 `aeternaSettingsFrameQa.actionIcon`, `settingsFocusIcon`, `settingsFocusLabelLegacyGlyphPresent`, `missingSettingsFocusIconKeys`에 expected/rendered count, texture key, 표시 크기, fallback id, 누락 key를 기록합니다.

독립 `ChatUI`는 `UI-HUD-008-DEF.png`를 `ui_frame_chat_panel` key로, `UI-BTN-006-DEF.png`를 `ui_frame_chat_input`, `ui_frame_chat_tab_button`, `ui_frame_chat_emoji_button` key로 preload해 채팅 panel, 입력창, 채널 탭, 이모지 button frame을 먼저 표시합니다. 이모지 button 내부 아이콘은 `status_charm.png` / `status_charm_icon`을 `16x16` image로 먼저 렌더하고, texture가 없을 때만 기존 `😀` glyph fallback을 사용합니다. `?debugScene=chat&renderer=canvas&chatFrameQa=1`는 `aeternaChatFrameQa.emojiButtonIcon`에 texture key, 표시 크기, fallback/missing 상태를 기록합니다. 채널 전환 tint/alpha, 메시지 row, 미읽음 카운트, 이모지 선택, 입력 버퍼, 소켓 이벤트 처리는 기존 동적 Phaser UI 로직으로 유지합니다.

standalone `Minimap`은 `UI-HUD-002-DEF.png`를 `ui_frame_minimap_panel` key로 preload해 미니맵 panel frame을 먼저 표시합니다. 플레이어 마커는 `char_battle_ether_knight.png` Aseprite 전투 썸네일을 `10x14` 이미지로 먼저 렌더링하고, texture가 없을 때만 기존 원형 fallback을 사용합니다. NPC/몬스터/포탈/퀘스트 마커는 각각 `npc_merchant_mira_sprite`, `mon_erebos_memory_dust_normal_sprite`, `skill_vw_warp_icon`, `icon_item_ITM-QST_004`를 `10x10` 이미지로 먼저 표시하고, texture가 없을 때만 기존 색상 원형 fallback을 사용합니다. 존 label, 마커 위치 갱신, 클릭 이동 좌표 변환은 동적 Phaser UI로 유지하며, 프레임 장식선과 겹치지 않도록 월드-미니맵 변환과 클릭 좌표를 frame content inset 기준으로 보정합니다. `?debugScene=minimap&renderer=canvas&minimapFrameQa=1`는 `aeternaMinimapFrameQa.playerMarkerIcon`과 `dynamicMarkerIcon`에 texture key/path, expected/rendered count, 표시 크기, fallback id, 누락 key를 기록합니다.

`MinimapOverlay`는 panel frame과 별개로 marker icon layer를 두고 플레이어/NPC/몬스터/던전/퀘스트/웨이포인트를 Aseprite 이미지로 먼저 렌더링합니다. 플레이어는 `char_battle_ether_knight`, NPC는 `npc_ghost_merchant_gorodi_sprite`, 몬스터와 어그로 몬스터는 `mon_erebos_memory_dust_normal_sprite`, 던전은 `zone_crystal_cave`, 퀘스트는 `icon_item_ITM-QST_004`, 웨이포인트는 `skill_vw_warp_icon`을 사용합니다. 어그로 링과 texture 누락 fallback만 기존 `Graphics` 레이어에 남기고, 정상 marker body는 `minimap_overlay_marker_icon_<type>_<id>` 또는 `minimap_overlay_player_marker_icon` 이미지 오브젝트로 표시합니다. `?debugScene=minimapOverlay&renderer=canvas&minimapOverlayFrameQa=1`는 `aeternaMinimapOverlayFrameQa.markerIcon`에 expected/rendered count, texture key 목록, fallback id, 누락 key를 기록합니다.

`FeedbackForm` 유형 선택 버튼은 Aseprite status icon 리소스를 재사용합니다. 버그/기능/밸런스/UX/기타는 각각 `status_poison_icon`, `status_haste_icon`, `status_shield_icon`, `status_charm_icon`, `status_stun_icon`을 `18x18` 이미지로 표시하고, texture가 없을 때만 기존 이모지 포함 label로 fallback합니다. `?debugScene=feedback&renderer=canvas`는 `aeternaFeedbackFrameQa.typeIcon`에 expected/rendered count, texture key 목록, fallback id, 누락 key를 기록합니다.

`FeedbackForm` 제목 아이콘은 기존 `📝` 텍스트 prefix 대신 `skill_mw_arrow.png` / `skill_mw_arrow_icon` Aseprite skill icon을 재사용합니다. 제목 왼쪽에 `feedback_form_title_icon`을 `22x22` 이미지로 표시하고, title text는 `피드백 보내기`만 유지합니다. texture가 없을 때만 작은 `>` fallback을 표시하며, `?debugScene=feedback&renderer=canvas`는 `aeternaFeedbackFrameQa.titleIcon`과 `missingTitleIconKeys`에 렌더 상태를 기록합니다.

`FeedbackForm` 제출 버튼 아이콘도 기존 `✅` 텍스트 prefix 대신 `skill_mw_arrow.png` / `skill_mw_arrow_icon` Aseprite skill icon을 재사용합니다. 제출 label은 `제출`만 유지하고, 버튼 왼쪽에 `feedback_form_submit_icon`을 `20x20` 이미지로 표시합니다. texture가 없을 때만 작은 `>` fallback을 표시하며, `?debugScene=feedback&renderer=canvas`는 `aeternaFeedbackFrameQa.submitIcon`과 `missingSubmitIconKeys`에 렌더 상태를 기록합니다.

`FeedbackForm` 닫기 버튼은 기존 `✕` 텍스트 glyph 대신 `skill_tg_reverse.png` / `skill_tg_reverse_icon` Aseprite skill icon을 재사용합니다. 우상단 버튼 중앙에 `feedback_form_close_icon`을 `18x18` 이미지로 표시하고, texture가 없을 때만 작은 `x` fallback을 표시합니다. `?debugScene=feedback&renderer=canvas`는 `aeternaFeedbackFrameQa.closeIcon`과 `missingCloseIconKeys`에 렌더 상태를 기록합니다.

`CharacterSelectScene` 기존 캐릭터 row avatar는 Aseprite character battle thumbnail을 먼저 사용합니다. class id별 `char_battle_*.png`를 preload하고, 기존 캐릭터 목록에서는 `28x42` 이미지 `character_select_existing_avatar_<classId>`로 표시합니다. texture가 없을 때만 기존 색 원형 fallback을 사용하며, `?debugScene=characterSelect&renderer=canvas&characterSelectFrameQa=1&characterSelectExistingQa=1`는 `aeternaCharacterSelectFrameQa.existingCharacterAvatar`에 expected/rendered count, texture key, 표시 크기, fallback id, 누락 key를 기록합니다.

`SkillTreeUI` 스킬 노드는 Aseprite skill icon 리소스를 먼저 사용합니다. `LobbyScene.preload()`가 `preloadSkillTreeIconResources()`로 6개 클래스의 스킬 트리 후보 icon을 로드하고, `SkillTreeUI`는 각 skill의 `icon` 또는 tier fallback을 `spriteResourceManifest`의 `skillIcon`으로 해석해 `48x48` 이미지 `skill_tree_node_icon_<skillId>`로 표시합니다. 제목 아이콘은 현재 클래스의 1티어 skill icon을 `20x20` 이미지 `skill_tree_title_icon`으로 표시하고, 기존 `🌳` glyph는 normal render path에서 제거합니다. 리셋 action button 내부 아이콘은 `skill_tg_reverse.png` / `skill_tg_reverse_icon`을 `18x18` image로 먼저 렌더하고, texture가 있을 때 label은 `스킬 리셋`, `정말 리셋? (다시 선택)`, `리셋 실패`처럼 텍스트만 표시합니다. 메인/상세 닫기 action button도 같은 `skill_tg_reverse_icon`을 `16x16` 이미지 `skill_tree_close_action_icon`, `skill_tree_detail_close_action_icon`으로 먼저 표시하고, texture가 없을 때만 작은 ASCII `x` fallback을 사용합니다. 상세 패널의 분기/잠김 라인은 `skill_mw_storm_icon`, `skill_tg_stop_icon`을 `14x14` 이미지 `skill_tree_branch_detail_icon`, `skill_tree_locked_detail_icon`으로 먼저 표시하고, 기존 `⚔`/`✗` glyph는 normal render path에서 제거합니다. texture가 없을 때만 안전 fallback marker/label을 사용하며, `?debugScene=lobby&renderer=canvas&skillTreeQa=1`는 `aeternaSkillTreeFrameQa.titleIcon`, `skillNodeIcon`, `resetActionIcon`, `closeActionIcon`, `detailLineIcon`에 expected/rendered count, texture key, 표시 크기, fallback state, 누락 key를 기록합니다.

`NavigationManager` 방향 안내 화살표는 Aseprite skill icon `skill_mw_arrow.png`를 `ui_navigation_direction_arrow` key로 preload해 화면 고정 이미지로 먼저 표시합니다. 웨이포인트/퀘스트 목표 탐색, 화면 밖 여부 계산, 회전 각도, 알파/tint 적용은 동적 Phaser 로직으로 유지하고, texture key가 없을 때만 기존 `Graphics.fillTriangle()` 삼각형 fallback을 사용합니다. `?debugScene=navigationArrow&renderer=canvas&navigationArrowQa=1`는 `aeternaNavigationArrowFrameQa`에 방향 화살표 이미지 렌더 상태, fallback 사용 여부, 누락 key를 기록합니다.

`TutorialFlowManager`는 `UI-HUD-005-DEF.png`를 `ui_frame_tutorial_flow_panel` key로 preload해 튜토리얼 안내 panel frame을 `620x280`으로 먼저 표시하고, `UI-BTN-006-DEF.png`를 `ui_frame_tutorial_flow_skip_button` key로 preload해 스킵 버튼 frame을 먼저 표시합니다. 스킵 버튼 내부 아이콘은 `skill_tg_haste.png`를 `16x16` Aseprite image로 먼저 표시하고, texture 누락 시에만 기존 `[스킵] ESC` label fallback을 사용합니다. 내부 `panelContentBounds`와 scrim을 기준으로 제목/본문/진행률/스킵 버튼을 프레임 장식선 안쪽에 배치하고, overlay dimmer, 키/클릭/event trigger 로직과 localStorage 진행률 저장은 기존 동적 Phaser UI 로직으로 유지합니다. `tutorialFlowFrameQa=1`은 `skipButtonIcon`과 `missingSkipButtonIconKeys`에 아이콘 렌더 상태를 기록합니다.

legacy `TutorialManager` DOM overlay는 `UI-HUD-005-DEF.png`를 `ui_frame_tutorial_manager_panel` key로 preload하고, `UI-BTN-006-DEF.png`를 `ui_frame_tutorial_manager_action_button` key로 preload해 5단계 인게임 튜토리얼 말풍선과 스킵/다음 button frame을 CSS background로 먼저 표시합니다. DOM `style="..."` 내부에서는 asset URL을 single quote로 작성해 HTML attribute quoting이 깨지지 않게 유지하며, highlight mask, 단계 완료 이벤트, localStorage 진행률, 서버 동기화는 기존 동적 로직으로 유지합니다. `?debugScene=tutorialManager&renderer=canvas&tutorialManagerFrameQa=1`는 `aeternaTutorialManagerFrameQa`에 panel/action button frame, CSS background URL, 단계명, 누락 key를 기록합니다.

`CoachmarkOverlay`는 `UI-HUD-005-DEF.png`를 `ui_frame_coachmark_panel` key로 preload해 온보딩 코치마크 panel frame을 먼저 표시하고, `UI-BTN-006-DEF.png`를 `ui_frame_coachmark_action_button` key로 preload해 스킵/다음 action button frame을 먼저 표시합니다. 스킵/다음 버튼 내부 아이콘은 `skill_tg_haste.png`와 `skill_mw_arrow.png`를 `16x16` Aseprite image로 먼저 렌더하고, texture 누락 시에만 텍스트 중심 label fallback을 사용합니다. highlight 영역, title/body/hint text, click/key/auto advance trigger, skip callback은 동적 Phaser UI 로직으로 유지하며, `?debugScene=coachmark&renderer=canvas&coachmarkFrameQa=1`에서 `aeternaCoachmarkFrameQa`로 panel/action button frame과 `actionButtonIcon` 렌더 상태를 기록합니다.

`ComboUI`는 `UI-BTN-005-DEF.png`를 `ui_frame_combo_chain_gauge` key로 preload해 우측 상단 chain gauge track frame을 먼저 표시합니다. 콤보 달성 라벨은 `skill_mw_storm.png`를 `skill_mw_storm_icon` texture로 preload해 `28x28` 이미지로 먼저 표시하고, texture가 있으면 label text는 `전격 강타!`처럼 glyph 없는 텍스트만 사용합니다. texture가 없을 때만 기존 `🔥 전격 강타!` fallback을 사용합니다. hit counter, multiplier, gauge fill 색상/감소, hint row, screen shake setting은 기존 동적 Phaser UI 로직으로 유지합니다. `?debugScene=combo&renderer=canvas&comboFrameQa=1`는 `comboAchievedIcon`, `comboTextLegacyGlyphPresent`, `missingComboAchievedIconKeys`에 콤보 달성 아이콘 렌더 상태를 기록합니다.

`LobbyScene` 상점과 인벤토리는 `itemIconSpecs.ts`의 100개 Aseprite item icon PNG를 `preloadItemIconResources()`로 로드합니다. 상점의 legacy `CON_HP_*`/`CON_MP_*` 코드와 인벤토리의 `WP-*`, `CS-*`, `MAT-*` 코드는 `itemIconResources.ts`에서 `ITM-CON-*`, `ITM-WPN-*`, `ITM-MAT-*`로 해석됩니다. UI row는 texture가 있으면 `28x28` 아이콘 이미지를 먼저 표시하고, texture가 없을 때만 텍스트 중심 row로 남깁니다.

#### 캐릭터 스프라이트 제작

캐릭터 스프라이트는 [Character Sprite Production](character-sprite-production.md)을 기준으로 제작합니다. 현재 런타임 대상은 `char_ether_knight_base` Ether Knight 5방향 full motion과 나머지 기본 클래스 5종의 D 방향 파일럿입니다.

Ether Knight source `.aseprite`는 프레임 캔버스 `64x64`, 150프레임입니다. export sheet는 `1920x320`이며 runtime에서는 `frameWidth: 64`, `frameHeight: 64`로 잘라 씁니다. Aseprite export는 `sheetColumns: 30`으로 30프레임씩 5행을 만든다. D 방향 파일럿은 `640x64`, 10프레임입니다.

```powershell
npm run art:character:roster
npm run art:character:build -- char_ether_knight_base
npm run art:character:build -- char_ether_knight_base --publish
npm run art:character:build -- char_memory_weaver_base
npm run art:character:build -- char_memory_weaver_base --publish
npm run art:character:build -- char_shadow_weaver_base
npm run art:character:build -- char_shadow_weaver_base --publish
npm run art:character:build -- char_memory_breaker_base
npm run art:character:build -- char_memory_breaker_base --publish
npm run art:character:build -- char_time_guardian_base
npm run art:character:build -- char_time_guardian_base --publish
npm run art:character:build -- char_void_wanderer_base
npm run art:character:build -- char_void_wanderer_base --publish
```

경로 계약:

| 구분 | 경로 |
|------|------|
| Source | `assets/source/aseprite/character/...` |
| Aseprite export | `assets/generated/aseprite/character/...` |
| Runtime publish | `assets/generated/characters/sprites/...` |
| Client serve | `client/public/assets/generated` 심링크 경유 |
| Runtime manifest | `client/src/assets/characterSpriteManifest.ts` |

`GameScene`, `BattleScene`, `DungeonScene`은 manifest의 `textureKey`와 `imagePath`를 사용해 `load.spritesheet(..., { frameWidth: 64, frameHeight: 64 })`로 로드하고, 생성 직후 `setFrame(0)`을 적용합니다. `GameScene`은 로컬 플레이어용 선택 class 외에도 `CHARACTER_SPRITE_MANIFEST` 전체를 preload해 `world:playerJoined.characterClass`가 포함된 원격 플레이어를 같은 Aseprite sheet frame `0`으로 표시합니다. `DungeonScene`은 manifest sheet를 우선 표시하고, 기존 side 일러스트 `dungeon_player`와 절차 사각형은 안전 fallback으로만 유지합니다. 이 처리가 없으면 `1920x320` sheet 전체가 한 스프라이트처럼 렌더링될 수 있습니다.

`world:playerJoined.characterClass`는 하위 호환을 위해 optional입니다. 값이 없거나 해당 texture가 로드되지 않았을 때만 기존 원격 플레이어 사각형 fallback을 사용합니다. `debugScene=game` 기반 그래픽 QA에서는 `offlineQa`가 zone API, socket setup, HUD active quest load를 건너뛰어 백엔드 상태와 무관하게 스프라이트 로드/렌더링만 검증합니다.

브라우저 QA 포인트:

```text
?debugScene=world&class=ether_knight&era=present
?debugScene=battle&class=ether_knight&era=present
?debugScene=dungeon&class=ether_knight&renderer=canvas
?debugScene=game&renderer=canvas&zone=aether_plains&class=memory_weaver
```

---

## 5) 단계별 가이드

### 5.1 프롬프트 작성

프롬프트는 JSON 파일로 관리합니다. 기본 구조:

```json
{
  "asset_id": "char_illust_ether_knight",
  "category": "character_illust",
  "color_palette": {
    "primary": "#4682B4",
    "secondary": "#C0C0C0"
  },
  "prompts": {
    "sd": {
      "front": {
        "prompt": "...",
        "negative": "...",
        "params": {"steps": 35, "cfg_scale": 8, "width": 512, "height": 512}
      }
    },
    "dalle": { ... },
    "midjourney": { ... }
  }
}
```

**팁**:
- `color_palette`는 `style-guide.md`의 지역별 팔레트를 참조
- SD 프롬프트에는 `<lora:custom-aeterna-v1:0.8>` LoRA 적용
- negative 프롬프트로 "3D render, realistic photo" 등을 반드시 제외

### 5.2 이미지 생성

```bash
# Stable Diffusion으로 생성
python3 batch_generator.py \
  --input-dir ../../assets/prompts/characters/class_main \
  --output-dir ../../assets/generated/characters/class_main \
  --engine sd \
  --parallel 4

# DALL-E로 생성
python3 batch_generator.py \
  --input-dir ../../assets/prompts/characters/class_main \
  --output-dir ../../assets/generated/characters/class_main \
  --engine dalle
```

**주의사항**:
- SD는 로컬 GPU가 필요합니다 (VRAM 12GB+ 권장)
- DALL-E는 API 비용이 발생합니다 (~$0.04/장)
- 병렬 실행 수는 GPU 메모리에 맞춰 조정

### 5.3 후처리

```bash
python3 post_process_pipeline.py \
  --input-dir ../../assets/generated/characters \
  --output-dir ../../assets/processed/characters \
  --steps "remove_bg,color_correct"
```

후처리 단계:
1. **배경 제거** (`remove_bg`): rembg 사용, 배경 → 투명
2. **색보정** (`color_correct`): 지역/클래스 팔레트에 매칭
3. **심리스 체크** (`seamless_check`): 환경 타일/배경 전용

### 5.4 QA 검증

```bash
python3 qa_runner.py \
  --check resolution,alpha,palette,naming \
  --input-dir ../../assets/processed/characters \
  --report ../../assets/qa-reports/characters.json
```

QA 검증 항목:
| 항목 | 설명 | 기준 |
|------|------|------|
| `resolution` | 해상도 확인 | 카테고리별 기준 크기 |
| `alpha` | 투명 배경 | 배경 영역 α=0 |
| `palette` | 팔레트 준수 | 주요색 ±15 허용오차 |
| `naming` | 파일명 규칙 | 컨벤션 문서 참조 |
| `seamless` | 심리스 타일링 | 좌우 경계 ΔE < 5 |
| `frame_count` | 프레임 수 | 스프라이트 시트 기준 |

### 5.5 시트 조립

```bash
# 스프라이트 시트
python3 spritesheet_assembler.py \
  --input-dir ../../assets/processed/characters/sprites/ether_knight \
  --output-dir ../../assets/sheets/characters \
  --grid "8x7" --frame-size "64x64"

# 오토타일 시트
python3 spritesheet_assembler.py \
  --input-dir ../../assets/processed/environment/tiles/erebos \
  --output-dir ../../assets/sheets/environment \
  --mode "autotile" --tile-size "32x32"
```

---

## 6) 카테고리별 가이드

### 6.1 캐릭터 일러스트

- 프롬프트 위치: `assets/prompts/characters/class_main/`, `class_advanced/`
- 출력 크기: 512×512 (SD), 1024×1024 (DALL-E)
- 뷰: 정면/측면/후면 3뷰
- 특이사항: 전직 계열은 기본 클래스 디자인 연속성 유지

### 6.2 몬스터 스프라이트

- 프롬프트 위치: `assets/prompts/monsters/normal/`, `elite_boss/`
- 출력 크기: 64×64 프레임
- 방향: 4방향 (하/좌/우/상)
- 모션: idle/walk/attack/hit/die (일반), 추가 모션 (엘리트+)
- 특이사항: ControlNet 포즈 연동, 지역별 팔레트 적용

### 6.3 레이드 보스

- 프롬프트 위치: `assets/prompts/monsters/raid_boss/`
- 출력 크기: 1024×1024
- 특이사항: **img2img 체인** — Phase 1(txt2img) → Phase 2~4(img2img)
- Denoising strength: 0.6 → 0.5 → 0.4 (점진 감소)

### 6.4 타일셋

- 프롬프트 위치: `assets/prompts/environment/tiles/`
- 출력 크기: 32×32 per tile
- 구성: 오토타일 9조각 (center/top/bottom/left/right/4corners) + 장식 15종
- 특이사항: **심리스 필수** — 인접 타일 경계 ΔE < 5

### 6.5 배경

- 프롬프트 위치: `assets/prompts/environment/backgrounds/`
- 출력 크기: 레이어별 상이 (Sky 1920×360 ~ Near 1920×720)
- 구성: 4레이어 × 3시간대 = 12장 per 지역
- 특이사항: **수평 심리스 필수**, 알파 채널 레이어별 투명도

---

## 7) QA 체크리스트

### 빠른 체크리스트

- [ ] 해상도가 카테고리 기준에 맞는가?
- [ ] 배경이 완전히 투명한가? (캐릭터/몬스터)
- [ ] 팔레트가 스타일 가이드에 부합하는가?
- [ ] 파일명이 네이밍 컨벤션을 따르는가?
- [ ] 타일이 인접 타일과 심리스로 연결되는가?
- [ ] 배경이 수평으로 반복 가능한가?
- [ ] 스프라이트 시트 프레임 수가 맞는가?
- [ ] 2px 검정 아웃라인이 있는가? (픽셀아트)
- [ ] 3단계 셀 셰이딩이 적용되었는가?

### 반려 시 대응

1. QA 리포트에서 실패 항목 확인
2. 프롬프트 수정 또는 후처리 파라미터 조정
3. 해당 에셋만 재생성: `make generate ENGINE=sd`
4. 재QA: `make qa`

---

## 8) 트러블슈팅

### 일반 문제

| 증상 | 원인 | 해결 |
|------|------|------|
| SD API 연결 실패 | WebUI 미실행 또는 URL 오류 | `.env`의 `SD_API_URL` 확인, WebUI 재시작 |
| DALL-E 429 에러 | API 레이트 리밋 | `RETRY_DELAY=60`으로 늘림 |
| MJ 타임아웃 | Discord 봇 응답 지연 | 재시도, 피크 시간대 회피 |
| 배경 제거 실패 | rembg 모델 미설치 | `pip install rembg[gpu]` |
| 팔레트 QA 반려 | 색보정 미적용 또는 허용오차 | `--tolerance 20`으로 확대 |
| 심리스 실패 | 타일 경계 불일치 | SD Tile 모드 활성화 또는 수동 보정 |

### Synology Drive 관련

| 증상 | 원인 | 해결 |
|------|------|------|
| 파일 쓰기 실패 (Errno 11) | Synology Drive 파일 잠금 | Synology Drive Client 앱 종료 후 재시도 |
| Git push 실패 | 동기화 충돌 | `git pull --rebase` 후 재push |

### 성능 문제

| 증상 | 원인 | 해결 |
|------|------|------|
| 생성 매우 느림 | GPU VRAM 부족 | `PARALLEL_JOBS=2`로 줄임 |
| 메모리 부족 | 대량 이미지 후처리 | 배치 크기 줄임 |
| 시트 조립 오류 | 프레임 수 불일치 | 누락 프레임 확인 후 재생성 |

---

## 9) 부록

### A. 엔진별 프롬프트 팁

#### Stable Diffusion
- LoRA 가중치: `<lora:custom-aeterna-v1:0.8>` (프로젝트 전용)
- 픽셀아트: `<lora:pixel-art-style-v2:0.7>`
- 중요 키워드에 가중치: `(keyword:1.3)`
- Negative에 반드시: `3D render, realistic photo, blurry`

#### DALL-E 3
- 구체적 묘사일수록 좋음 (색상 코드 포함)
- "transparent background" 명시
- 스타일 키워드: "2D pixel art", "dark fantasy Korean MMORPG"

#### Midjourney
- `--niji 6` 파라미터로 일러스트 스타일 강제
- `--s 250~350` stylize로 스타일 강도 조정
- `--ar` 비율 정확히 지정

### B. 색상 팔레트 참조

| 지역 | Primary | Secondary | Accent |
|------|---------|-----------|--------|
| 에레보스 | `#2D2D3F` 안개 회색 | `#5C4A72` 부서진 보라 | `#89CFF0` 기억 잔광 |
| 실반헤임 | `#1B4332` 숲 녹색 | `#6B4423` 고목 갈색 | `#7DF9FF` 발광균 청록 |
| 솔라리스 | `#C2956B` 모래색 | `#8B4513` 적갈색 | `#FFD700` 태양열 금 |

### C. Make 명령어 빠른 참조

```bash
make all                    # 전체 파이프라인
make characters             # 캐릭터만
make monsters               # 몬스터만
make environment            # 환경만
make status                 # 상태 대시보드
make help                   # 도움말
make clean                  # 로그 정리
make all ENGINE=dalle       # DALL-E로 전체 실행
make all PARALLEL_JOBS=8    # 8병렬 실행
```
