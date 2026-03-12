# 에테르나 크로니클 — AI 에셋 프롬프트 템플릿

> 작성일: 2026-03-12 | 버전: v1.0  
> 티켓: P11-08  
> 참조: overview.md, bgm_ai_music_design.md

---

## 1) 공통 프롬프트 규칙

### 1.1 프롬프트 구조

```
[스타일 태그], [주제 설명], [포즈/구도], [색상/조명], [배경], [기술 태그]
```

### 1.2 공통 스타일 태그 (모든 에셋)

```
2D pixel art RPG, dark fantasy, Korean MMORPG style,
hand-painted textures, consistent art direction,
game asset, transparent background, clean edges
```

### 1.3 네거티브 프롬프트 (공통)

```
3D render, realistic photo, blurry, watermark, text, logo,
low quality, deformed, extra limbs, disfigured, bad anatomy,
Western cartoon style, anime style (unless specified),
noisy, grain, JPEG artifacts, cropped
```

---

## 2) 캐릭터 프롬프트 템플릿

### 2.1 플레이어 캐릭터 (정면 스탠딩)

```
Template: CHARACTER_STANDING

2D pixel art RPG character sprite, {class_name}, {gender},
{armor_description}, {weapon_description},
standing idle pose, front-facing, full body,
{color_palette} color scheme, dark fantasy medieval setting,
64x64 pixel art, clean pixel edges, transparent background,
game sprite sheet ready, no anti-aliasing on edges

Variables:
  class_name: "에테르 기사" | "기억술사" | "그림자 직조사" | "시간 수호자"
  gender: "male" | "female"
  armor_description: 클래스별 방어구 설명
  weapon_description: 클래스별 무기 설명
  color_palette: 클래스별 주요 색상 3~4색
```

### 2.2 클래스별 프롬프트 변수

#### 에테르 기사 (Ether Knight)

```
armor_description: "heavy plate armor with glowing ether runes, blue energy lines on pauldrons, sturdy shield"
weapon_description: "one-handed longsword with ethereal blue glow, kite shield with memory crest"
color_palette: "steel blue, silver, midnight blue, faint cyan glow"
```

#### 기억술사 (Mnemonist)

```
armor_description: "flowing dark robe with memory crystal ornaments, hood with runic trim, floating book"
weapon_description: "ornate staff topped with memory crystal orb, arcane tome in off-hand"
color_palette: "deep purple, gold accents, teal memory glow, dark crimson"
```

#### 그림자 직조사 (Shadow Weaver)

```
armor_description: "light leather armor with shadow-woven cloak, hooded, multiple belt pouches"
weapon_description: "compound shortbow with shadow-infused string, quiver with glowing arrows"
color_palette: "charcoal black, deep green, silver edge highlights, violet shadow wisps"
```

#### 시간 수호자 (Time Keeper) — 5번째 클래스

```
armor_description: "chrono-plated medium armor with clock gear motifs, temporal energy flowing from seams, half-cape with hourglass emblem"
weapon_description: "twin chrono-blades connected by temporal chain, floating clock fragments orbit"
color_palette: "antique gold, sand white, turquoise temporal glow, bronze accents"
```

### 2.3 캐릭터 8방향 스프라이트

```
Template: CHARACTER_DIRECTIONAL

2D pixel art RPG character sprite, {class_name},
{direction} facing, {animation_type} animation frame {frame_number},
{armor_description},
64x64 pixel art, clean edges, transparent background,
consistent with front-facing reference sheet

Variables:
  direction: "front" | "front-left" | "left" | "back-left" | "back" | "back-right" | "right" | "front-right"
  animation_type: "idle" | "walk" | "attack" | "cast" | "hit" | "death"
  frame_number: 0~7 (애니메이션 프레임 인덱스)
```

### 2.4 NPC 캐릭터

```
Template: NPC_CHARACTER

2D pixel art RPG NPC character, {npc_name}, {npc_role},
{appearance_description}, {outfit_description},
standing idle pose, {expression},
{region} setting aesthetic, 64x64 pixel art,
transparent background, game sprite ready

예시 (에바):
  npc_name: "에바 (Eva)"
  npc_role: "주인공의 동반자, 기억 인도자"
  appearance_description: "young woman, silver-white hair, gentle eyes, ethereal presence"
  outfit_description: "white flowing dress with memory crystal pendant, translucent shawl"
  expression: "calm and wise"
  region: "에레보스 (ruined city)"
```

---

## 3) 몬스터 프롬프트 템플릿

### 3.1 일반 몬스터 (Normal)

```
Template: MONSTER_NORMAL

2D pixel art RPG monster sprite, {monster_name},
{size_class} creature, {body_description},
{attack_feature}, {elemental_trait},
{region_theme} environment adapted,
{size_px}x{size_px} pixel art, menacing but not grotesque,
transparent background, game sprite sheet ready,
dark fantasy style, clear silhouette at small scale

Variables:
  size_class: "tiny (32px)" | "small (48px)" | "medium (64px)" | "large (96px)"
  region_theme: 지역별 테마 키워드
```

### 3.2 엘리트 몬스터 (Elite)

```
Template: MONSTER_ELITE

2D pixel art RPG elite monster sprite, {monster_name},
{size_class} creature, enhanced {body_description},
glowing {elite_aura_color} aura, {elite_markings},
more detailed and ornate than normal variant,
{region_theme} aesthetic, {size_px}x{size_px} pixel art,
transparent background, imposing presence,
subtle particle effects around body

Variables:
  elite_aura_color: 지역별 오라 색상
  elite_markings: "golden rune markings" | "cracked energy veins" | "shadow tendrils"
```

### 3.3 보스 몬스터 (Boss)

```
Template: MONSTER_BOSS

2D pixel art RPG boss monster, {boss_name}, {chapter} boss,
{size_class} massive creature, {body_description},
{boss_mechanic_visual}, {phase_description},
dramatic lighting with {boss_aura_color} energy emanating,
detailed and ornate design, unique silhouette,
{region_theme} environment adapted,
{size_px}x{size_px} pixel art, transparent background,
epic scale, dark fantasy, clear visual hierarchy

Variables:
  boss_mechanic_visual: 보스 기믹의 시각적 표현
  phase_description: "phase 1: dormant" | "phase 2: enraged" | "phase 3: desperate"
```

### 3.4 지역별 몬스터 테마 키워드

| 지역 | theme 키워드 |
|------|-------------|
| 에레보스 | ruined city, fog, spectral, crumbling stone, memory echoes |
| 실반헤임 | enchanted forest, bioluminescence, overgrown, ancient wood, spore |
| 솔라리스 사막 | scorching desert, glass sand, ether crystals, heat haze, sun-bleached |
| 북방 영원빙원 | frozen tundra, ice crystal, aurora shimmer, permafrost, time-locked |
| 아르겐티움 | steampunk city, clockwork, golden spire, imperial, mechanical |
| 브리탈리아 자유항 | harbor town, pirate, misty sea, rusty metal, nautical |
| 무한 안개해 | endless fog sea, ghostly ships, deep sea creatures, bioluminescent |
| 기억의 심연 | abyssal deep, memory fragments floating, pressure cracks, void whispers |

---

## 4) 타일맵 프롬프트 템플릿

### 4.1 바닥 타일

```
Template: TILE_FLOOR

2D pixel art RPG tileset, {region_name} floor tiles,
{material_description}, {wear_level} condition,
top-down view, seamless tileable pattern,
{tile_size}x{tile_size} pixel art, {lighting_direction},
{region_palette} color palette, game tileset ready,
no perspective distortion, flat top-down

Variables:
  material_description: "cobblestone" | "wooden planks" | "sand dunes" | "ice sheet" | "marble"
  wear_level: "pristine" | "slightly worn" | "heavily weathered" | "crumbling"
  tile_size: 32 | 64
  lighting_direction: "top-left soft light" (기본)
```

### 4.2 장식 오브젝트

```
Template: TILE_DECORATION

2D pixel art RPG decoration object, {object_name},
{region_name} themed, {material_and_style},
top-down RPG perspective, {size_in_tiles} tile(s) footprint,
transparent background, {region_palette} palette,
interactable appearance: {interactable},
pixel art, game-ready asset

Variables:
  object_name: "tree" | "rock" | "lamp post" | "barrel" | "fountain" | "bookshelf"
  interactable: "yes (slight glow)" | "no (static)"
```

### 4.3 Parallax 배경

```
Template: PARALLAX_BACKGROUND

2D digital painting, {region_name} parallax background layer,
{layer_description}, {depth_level} depth,
horizontal scrolling game background, 1920x{layer_height} pixels,
{atmosphere} atmosphere, {time_of_day} lighting,
painterly style with subtle pixel texture, seamless horizontal tile,
{region_palette} color scheme, dark fantasy RPG

Variables:
  depth_level: "far background (sky)" | "mid background (mountains)" | "near background (trees/buildings)"
  layer_height: 720 | 540 | 360 (레이어별 상이)
```

---

## 5) UI 아이콘 프롬프트 템플릿

### 5.1 아이템 아이콘

```
Template: ICON_ITEM

2D pixel art RPG item icon, {item_name}, {item_type},
{item_description}, {rarity_tier} rarity,
64x64 pixel art, centered composition,
{rarity_border_color} border glow,
dark background gradient, clean and readable at small scale,
game UI icon style, no text

Variables:
  item_type: "weapon" | "armor" | "accessory" | "consumable" | "material" | "quest"
  rarity_tier: "common" | "uncommon" | "rare" | "epic" | "legendary" | "mythic"
  rarity_border_color: "gray" | "green" | "blue" | "purple" | "orange" | "red-gold"
```

### 5.2 스킬 아이콘

```
Template: ICON_SKILL

2D pixel art RPG skill icon, {skill_name}, {class_name} class skill,
{skill_visual_description}, {element_type} element,
64x64 pixel art, diamond or circle frame,
{class_color} primary color, dynamic action composition,
dark background, glowing effect, game UI ready

Variables:
  element_type: "physical" | "fire" | "ice" | "lightning" | "shadow" | "holy" | "temporal"
  class_color: 클래스별 시그니처 색상
```

### 5.3 상태이상/버프 아이콘

```
Template: ICON_STATUS

2D pixel art RPG status effect icon, {effect_name},
{effect_visual}, {positive_negative} effect,
32x32 pixel art (upscaled to 64x64), simple and readable,
{effect_color} dominant color, small recognizable symbol,
dark background, game HUD icon, universally understandable

Variables:
  positive_negative: "positive buff (bright)" | "negative debuff (dark/red)"
  effect_color: 효과별 대표 색상
```

---

## 6) 배경 프롬프트 템플릿

### 6.1 대화 배경 (비주얼 노벨)

```
Template: DIALOGUE_BACKGROUND

2D digital painting, {location_name} interior/exterior,
{scene_description}, {mood} atmosphere,
visual novel background style, 1280x720 resolution,
{time_of_day} lighting, {region_palette} palette,
detailed environment, no characters, slightly blurred depth of field,
dark fantasy RPG setting

Variables:
  mood: "peaceful" | "tense" | "melancholic" | "ominous" | "celebratory"
```

---

## 7) LoRA/모델 커스텀 가이드

### 7.1 권장 LoRA 훈련 세트

| LoRA 이름 | 훈련 데이터 | 목적 |
|----------|-----------|------|
| `etterna-pixel-v1` | 기존 게임 에셋 50장 + 컨셉 아트 | 전체 스타일 통일 |
| `etterna-char-v1` | 캐릭터 시트 30장 | 캐릭터 일관성 |
| `etterna-monster-v1` | 몬스터 컨셉 40장 | 몬스터 스타일 |
| `etterna-tile-v1` | 타일셋 20장 | 타일 이음새 품질 |

### 7.2 LoRA 훈련 파라미터

```
Base Model: Stable Diffusion XL 1.0
Training Steps: 1500~3000
Learning Rate: 1e-4
Batch Size: 4
Resolution: 1024x1024
Rank: 32
Alpha: 16
```

---

## 8) 프롬프트 CSV 예시 (배치 생성용)

```csv
id,template,class_name,direction,animation,frame,prompt_override
CHAR-001,CHARACTER_STANDING,에테르 기사,front,idle,0,
CHAR-002,CHARACTER_STANDING,기억술사,front,idle,0,
CHAR-003,CHARACTER_STANDING,그림자 직조사,front,idle,0,
CHAR-004,CHARACTER_STANDING,시간 수호자,front,idle,0,
MON-001,MONSTER_NORMAL,기억 침식쥐,front,idle,0,"tiny vermin, glowing red eyes, tattered fur, memory wisps"
MON-002,MONSTER_NORMAL,공허 박쥐,front,idle,0,"spectral bat, translucent wings, void energy trails"
```

---

## 9) 버전 관리

- 프롬프트 변경 시 이 문서 버전을 올리고 변경 로그에 기록
- 생성된 에셋은 `assets/raw/` 에 원본 보관, `assets/processed/` 에 정제본 보관
- 프롬프트 CSV는 Git으로 버전 관리하여 재현성 확보
