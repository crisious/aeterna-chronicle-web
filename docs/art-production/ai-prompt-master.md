# 에테르나 크로니클 — AI 이미지 생성 마스터 프롬프트

> 작성일: 2026-03-12 | 버전: v1.0  
> 티켓: P13-15  
> 참조: asset-pipeline/prompt-templates.md, style-guide.md, sprite-spec.md

---

## 1) 개요

P11에서 구축한 프롬프트 템플릿(`asset-pipeline/prompt-templates.md`)을 기반으로,  
**Stable Diffusion / DALL-E / Midjourney** 각 엔진에 최적화된 마스터 프롬프트 세트를 정의한다.

### 1.1 설계 원칙

| 원칙 | 설명 |
|------|------|
| 스타일 일관성 | 모든 에셋에 공통 프리픽스/서픽스 적용, 동일 비주얼 톤 유지 |
| 엔진 최적화 | 각 AI 엔진의 프롬프트 문법·강도 조절 방식에 맞춘 변환 |
| 재현성 | seed, cfg_scale, sampler 등 파라미터를 명시해 동일 결과 재현 |
| 카테고리별 구조 | 캐릭터/몬스터/배경/아이콘/이펙트/UI 각 카테고리 전용 프롬프트 구조 |

---

## 2) 공통 프리픽스 / 서픽스 / 네거티브

### 2.1 공통 프리픽스 (모든 에셋)

```
[PREFIX — 모든 엔진 공통]
2D pixel art RPG, dark fantasy, Korean MMORPG aesthetic,
hand-painted textures, consistent art direction,
game asset, clean edges
```

### 2.2 공통 서픽스 (모든 에셋)

```
[SUFFIX — 모든 엔진 공통]
masterpiece quality, highly detailed pixel art,
professional game sprite, production-ready,
sharp pixel edges, no anti-aliasing on sprite boundary
```

### 2.3 공통 네거티브 프롬프트

```
[NEGATIVE — SD/DALL-E 공통]
3D render, realistic photo, photorealistic, blurry, watermark,
text overlay, logo, signature, low quality, worst quality,
deformed, extra limbs, disfigured, bad anatomy, bad proportions,
Western cartoon style, chibi (unless specified), noisy, grain,
JPEG artifacts, cropped, out of frame, duplicate,
morbid, mutilated, poorly drawn face, mutation
```

### 2.4 Midjourney 전용 네거티브

```
--no 3d render, photo, realistic, blurry, watermark, text,
logo, low quality, deformed, extra limbs, cartoon, chibi,
noise, grain, jpeg artifacts
```

---

## 3) Stable Diffusion 마스터 프롬프트

### 3.1 권장 모델 / 설정

| 항목 | 권장값 |
|------|--------|
| 체크포인트 | `pixel-art-xl-v1.1` 또는 `dreamshaper-xl-v2` |
| VAE | `sdxl-vae-fp16-fix` |
| Sampler | DPM++ 2M Karras |
| Steps | 30~40 |
| CFG Scale | 7~9 |
| Resolution | 512×512 → 2× upscale (최종 1024×1024) |
| Seed | 기록 필수 (재현용) |
| Clip Skip | 2 |

### 3.2 카테고리별 SD 프롬프트

#### 캐릭터 (Character)

```
(masterpiece:1.3), (best quality:1.2), 2D pixel art RPG character sprite,
dark fantasy Korean MMORPG style,
{class_name}, {gender}, {armor_description}, {weapon_description},
standing idle pose, front-facing, full body view,
{color_palette} color scheme, {region_theme} aesthetic,
64x64 pixel art, (clean pixel edges:1.4), transparent background,
game sprite sheet ready, hand-painted textures,
(consistent art direction:1.2)

Negative: [공통 네거티브]
```

**가중치 규칙:**
- `(clean pixel edges:1.4)` — 경계선 선명도 강조
- `(masterpiece:1.3)` — 품질 부스트
- `(consistent art direction:1.2)` — 스타일 일관성

#### 몬스터 (Monster)

```
(masterpiece:1.3), (best quality:1.2), 2D pixel art RPG monster sprite,
dark fantasy creature, {monster_name}, {grade} grade,
{size_class} creature, {body_description},
{elemental_trait}, {region_theme} environment adapted,
{attack_feature}, menacing but stylized,
{size_px}x{size_px} pixel art, transparent background,
clear silhouette at small scale, game sprite ready

Negative: [공통 네거티브], cute, friendly, cartoon
```

**등급별 추가 태그:**

| 등급 | 추가 태그 |
|------|----------|
| 일반 (Normal) | `simple design, moderate detail` |
| 엘리트 (Elite) | `(glowing aura:1.2), ornate markings, enhanced detail` |
| 보스 (Boss) | `(epic scale:1.3), dramatic lighting, unique silhouette, boss monster` |
| 레이드 (Raid) | `(colossal:1.4), (epic:1.3), multi-phase form, overwhelming presence` |

#### 배경 (Background / Tilemap)

```
(masterpiece:1.3), 2D pixel art RPG game background,
dark fantasy landscape, {region_name} region,
{time_of_day} lighting, {weather_condition},
{layer_type}: {layer_description},
parallax-ready layer, seamless tile edges,
atmospheric perspective, {color_palette},
RPG game environment, high detail pixel art

Negative: [공통 네거티브], character, person, UI element
```

**레이어별 프롬프트:**

| 레이어 | 추가 태그 |
|--------|----------|
| 하늘 (Sky) | `sky gradient, clouds, celestial, wide panorama` |
| 원경 (Far BG) | `distant mountains/buildings, low detail, atmospheric haze` |
| 중경 (Mid BG) | `medium detail, environmental props, depth cues` |
| 근경 (Near BG) | `high detail, interactive-looking elements, ground plane` |

#### 아이콘 (Icon)

```
(masterpiece:1.3), 2D pixel art RPG icon,
{icon_type}: {item_name}, {rarity_grade} grade,
{icon_description}, centered composition,
32x32 pixel art, (sharp edges:1.3),
{rarity_border_color} border glow,
dark background or transparent, game UI icon,
readable at small scale, distinctive silhouette

Negative: [공통 네거티브], text, label, complex background
```

**등급별 테두리/이펙트:**

| 등급 | 테두리 색상 | 이펙트 |
|------|------------|--------|
| 일반 | `#808080` 회색 | 없음 |
| 고급 | `#2ECC71` 녹색 | 미세 발광 |
| 희귀 | `#3498DB` 청색 | 발광 |
| 영웅 | `#9B59B6` 보라 | 파티클 |
| 전설 | `#F39C12` 금색 | 불꽃 오라 |
| 신화 | `#E74C3C` 적금 | 불꽃+파티클 |

#### 이펙트 (VFX)

```
(masterpiece:1.3), 2D pixel art RPG spell effect,
{effect_type}: {skill_name}, {element} element,
{effect_description}, {color_palette},
dynamic motion, energy particles,
transparent background, sprite sheet frame,
(no character:1.3), isolated effect only,
dark fantasy magical style

Negative: [공통 네거티브], character, person, weapon, background scene
```

#### UI 요소 (UI)

```
(masterpiece:1.2), 2D pixel art RPG UI element,
dark fantasy theme, {ui_element_type},
{element_description}, {ui_color_scheme},
clean design, (pixel perfect:1.3),
game HUD element, production ready,
consistent with dark medieval aesthetic

Negative: [공통 네거티브], 3D, modern UI, flat design, material design
```

---

## 4) DALL-E 마스터 프롬프트

### 4.1 권장 설정

| 항목 | 권장값 |
|------|--------|
| 모델 | DALL-E 3 |
| Size | 1024×1024 (정사각) |
| Quality | HD |
| Style | Natural |

> **DALL-E 특성**: 가중치 문법(`(tag:1.3)`) 미지원. 자연어 서술로 강조.

### 4.2 카테고리별 DALL-E 프롬프트

#### 캐릭터

```
Create a 2D pixel art RPG character sprite in a dark fantasy Korean MMORPG style.
The character is a {class_name} ({gender}), wearing {armor_description},
wielding {weapon_description}.
Pose: standing idle, front-facing, full body visible.
Color scheme: {color_palette}.
Art style: 64x64 pixel art with clean, sharp pixel edges. No anti-aliasing on borders.
The sprite must have a completely transparent background and be ready for use
in a game sprite sheet. The art should be highly detailed within the pixel art constraints,
with hand-painted texture feel. Dark fantasy atmosphere with subtle glowing elements.
DO NOT include any text, watermarks, or 3D rendering effects.
```

#### 몬스터

```
Create a 2D pixel art RPG monster sprite in dark fantasy style.
Monster: {monster_name}, a {size_class} {grade} grade creature.
Description: {body_description}. Element: {elemental_trait}.
The monster should look {grade_adjective} and fit a {region_theme} environment.
Size: {size_px}x{size_px} pixel art. Transparent background.
The design should have a clear, distinctive silhouette even at small scale.
Dark fantasy RPG aesthetic, menacing but stylized (not grotesque).
No text, no watermark, no 3D effects.
```

| 등급 | grade_adjective |
|------|----------------|
| 일반 | "common but threatening" |
| 엘리트 | "powerful with glowing aura and ornate markings" |
| 보스 | "massive and imposing with dramatic lighting and unique form" |
| 레이드 | "colossal and overwhelming with multi-phase visual design" |

#### 배경 / 아이콘 / 이펙트 / UI

> DALL-E는 단일 이미지 생성에 최적화. 타일맵/스프라이트 시트 생성은 SD 권장.
> DALL-E는 **컨셉 아트** 및 **레퍼런스 이미지** 생성에 활용.

```
[배경 레퍼런스]
Create a 2D pixel art RPG game background scene for {region_name} region.
{region_description}. {time_of_day} lighting.
Dark fantasy atmosphere with {color_palette} color scheme.
Parallax-ready composition with distinct foreground/midground/background layers.
Pixel art style, detailed environment, atmospheric depth.

[아이콘]
Create a 2D pixel art RPG {icon_type} icon.
Item: {item_name}, {rarity_grade} grade.
Description: {icon_description}. 32x32 pixel art, centered,
{rarity_border_color} glowing border. Dark background. Game UI ready.

[이펙트]
Create a 2D pixel art magical effect sprite.
Effect: {skill_name}, {element} element. {effect_description}.
Transparent background, no character or weapon visible.
Only the magical effect itself. Dynamic, colorful energy particles.
```

---

## 5) Midjourney 마스터 프롬프트

### 5.1 권장 설정

| 항목 | 권장값 |
|------|--------|
| 버전 | `--v 6.1` |
| Stylize | `--s 250` (기본~중간, 픽셀아트 유지) |
| Quality | `--q 1` |
| Aspect | `--ar 1:1` (캐릭터/몬스터/아이콘) |
| Chaos | `--c 10` (약간의 변형) |

> **Midjourney 특성**: `::가중치` 문법 사용. 네거티브는 `--no` 파라미터.

### 5.2 카테고리별 MJ 프롬프트

#### 캐릭터

```
2D pixel art RPG character sprite::2, dark fantasy Korean MMORPG::1.5,
{class_name}, {gender}, {armor_description}, {weapon_description},
standing idle front-facing full body, {color_palette} color scheme,
64x64 pixel art::2, clean pixel edges, transparent background::1.5,
game sprite sheet ready, hand-painted textures, masterpiece quality
--ar 1:1 --v 6.1 --s 200 --no 3d render photo realistic blurry watermark text
```

#### 몬스터

```
2D pixel art RPG {grade} monster sprite::2, dark fantasy creature::1.5,
{monster_name}, {size_class}, {body_description},
{elemental_trait}, {region_theme} adapted,
menacing stylized design, clear silhouette::1.5,
{size_px}x{size_px} pixel art, transparent background,
game sprite ready, dark fantasy RPG
--ar 1:1 --v 6.1 --s 250 --no 3d photo realistic cute cartoon chibi
```

#### 배경

```
2D pixel art RPG background::2, dark fantasy landscape::1.5,
{region_name}, {region_description},
{time_of_day} lighting, {color_palette},
atmospheric perspective, parallax game background,
detailed pixel art environment::1.5
--ar 16:9 --v 6.1 --s 300 --no character person UI text
```

#### 아이콘

```
2D pixel art RPG icon::2, {icon_type}::1.5,
{item_name}, {rarity_grade} grade, {icon_description},
32x32 pixel art, centered, {rarity_border_color} glow,
dark background, game UI icon, readable at small scale
--ar 1:1 --v 6.1 --s 200 --no text label complex-background 3d
```

---

## 6) LoRA / ControlNet 활용 가이드

### 6.1 LoRA (Low-Rank Adaptation) — 스타일 일관성

| LoRA | 용도 | 적용 강도 | 비고 |
|------|------|----------|------|
| `pixel-art-style-v2` | 픽셀아트 강제 | 0.6~0.8 | 기본 적용 |
| `game-sprite-v1` | 게임 스프라이트 정형화 | 0.4~0.6 | 캐릭터/몬스터 |
| `dark-fantasy-lora` | 다크 판타지 톤 | 0.3~0.5 | 분위기 보정 |
| `custom-aeterna-v1` (자체 학습) | 에테르나 전용 스타일 | 0.7~0.9 | 프로젝트 전용 |

#### 자체 LoRA 학습 가이드

```
[학습 데이터]
- 승인된 레퍼런스 이미지 50~100장
- 캡션: "aeterna_style, 2D pixel art, dark fantasy RPG, {카테고리}"
- 해상도: 512×512 (크롭)

[학습 설정]
- 베이스 모델: SDXL 1.0
- 학습률: 1e-4
- 에포크: 20~30
- 배치 사이즈: 4
- Dim/Alpha: 32/16
- 레귤러라이제이션: dreambooth 스타일

[사용법]
프롬프트에 `<lora:custom-aeterna-v1:0.8>` 추가
트리거 워드: "aeterna_style"
```

### 6.2 ControlNet — 포즈/구조 제어

| ControlNet 모델 | 용도 | 적용 시나리오 |
|----------------|------|-------------|
| `openpose` | 캐릭터 포즈 제어 | 8방향 스프라이트 포즈 통일 |
| `canny` | 외곽선 기반 생성 | 기존 스케치 → 컬러 변환 |
| `depth` | 깊이감 기반 구도 | 배경 Parallax 레이어 분리 |
| `segmentation` | 영역 분리 | UI 요소 정밀 배치 |
| `reference_only` | 스타일 참조 | 기존 에셋과 스타일 통일 |

#### 포즈 제어 워크플로우 (캐릭터 8방향)

```
[Step 1] 기본 포즈 스켈레톤 준비
- 8방향 × 7모션 = 56개 포즈 스켈레톤 (OpenPose 형식)
- 실제 제작: 5방향 × 7모션 = 35개 (나머지 미러링)

[Step 2] ControlNet 적용
- model: openpose
- weight: 0.8~1.0
- guidance_start: 0.0
- guidance_end: 0.8

[Step 3] 배치 생성
- 동일 seed + 동일 프롬프트 + 포즈만 변경
- 결과: 포즈 일관성 유지된 멀티 방향 스프라이트
```

#### 스타일 전이 워크플로우

```
[Step 1] 레퍼런스 이미지 선정
- 프로젝트 승인 에셋 중 스타일 대표작 3~5장

[Step 2] reference_only ControlNet 적용
- weight: 0.5~0.7 (너무 높으면 복사됨)
- style_fidelity: 0.7

[Step 3] IP-Adapter 병용 (선택)
- IP-Adapter + reference_only 조합으로 스타일 고정력 극대화
- IP-Adapter weight: 0.4~0.6
```

---

## 7) 엔진별 사용 권장 매트릭스

| 카테고리 | 1순위 엔진 | 2순위 | 사유 |
|----------|-----------|-------|------|
| 캐릭터 스프라이트 | **Stable Diffusion** | Midjourney | ControlNet 포즈 제어 필수 |
| 몬스터 스프라이트 | **Stable Diffusion** | DALL-E | 배치 생성 + LoRA 일관성 |
| 배경 (컨셉) | **Midjourney** | DALL-E | 구도/분위기 최고 품질 |
| 배경 (타일맵) | **Stable Diffusion** | - | img2img 타일 시드 필수 |
| 아이콘 | **Stable Diffusion** | DALL-E | 소형 에셋 정밀도 |
| 이펙트 | **Stable Diffusion** | - | 투명 배경 + 시퀀스 생성 |
| UI 요소 | **Stable Diffusion** | DALL-E | 정밀 레이아웃 제어 |
| 컨셉 아트 | **Midjourney** | DALL-E | 빠른 아이디에이션 |
| 컷씬 일러스트 | **Midjourney** | DALL-E | 고품질 단일 이미지 |

---

## 8) 프롬프트 관리 규칙

### 8.1 버전 관리

| 규칙 | 설명 |
|------|------|
| 시드 기록 | 모든 승인 에셋의 seed, cfg_scale, steps를 메타데이터로 기록 |
| 프롬프트 히스토리 | 수정 이력을 Git으로 관리 (이 문서 자체) |
| A/B 테스트 로그 | 프롬프트 변형 테스트 결과를 `docs/art-production/prompt-ab-log.md`에 기록 |

### 8.2 네이밍 규칙 (생성 파일)

```
{engine}_{category}_{name}_{variant}_{seed}.png

예시:
  sd_char_ether-knight_idle-front_42857.png
  mj_bg_erebos_night_concept_v2.png
  dalle_icon_fire-sword_legendary_01.png
```

### 8.3 품질 승인 프로세스

```
[생성] → [1차 자동 QA (qa_checker.py)]
       → [2차 수동 리뷰 (아트 디렉터)]
       → [승인 → 후처리 파이프라인 투입]
       → [반려 → 프롬프트 조정 후 재생성]
```

---

## 9) 지역별 프롬프트 변수 매핑

| 지역 | region_theme | color_palette | weather | 특수 태그 |
|------|-------------|---------------|---------|----------|
| 에레보스 | ruined dark city, collapsed buildings | dark grey, deep purple, faint blue glow | fog, ash particles | memory fragments, broken crystals |
| 실반헤임 | enchanted forest, ancient trees | emerald green, golden light, moss tones | dappled sunlight, fireflies | memory vines, glowing sap |
| 솔라리스 사막 | scorched desert, ancient ruins | burnt orange, gold, crimson | heat haze, sandstorm | flame runes, mirages |
| 아르겐티움 | imperial fortress, grand architecture | silver, royal blue, crimson banners | overcast, dramatic clouds | imperial flags, marble |
| 북방 영원빙원 | frozen tundra, ice caves | ice blue, white, pale violet | blizzard, aurora | frozen memory shards |
| 브리탈리아 | harbor city, ships | teal, warm wood, copper | sea mist, sunset | lanterns, cargo |
| 망각의 고원 | corrupted wasteland | void black, sickly green, blood red | dark storm, lightning | corruption tendrils |
| 무한 안개해 | misty ocean, ghost ships | fog white, deep navy, pale green | dense fog, eerie calm | ghost lights |
| 기억의 심연 | underwater abyss | abyssal blue, bioluminescent | underwater particles | deep sea creatures |

---

*끝. 이 문서는 에셋 생산 시작 전 전체 팀이 숙지해야 하는 마스터 레퍼런스.*
