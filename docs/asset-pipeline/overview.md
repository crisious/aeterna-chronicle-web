# 에테르나 크로니클 — AI 에셋 생성 파이프라인 Overview

> 작성일: 2026-03-12 | 버전: v1.0  
> 티켓: P11-08  
> 참조: prompt-templates.md, character-sprites.md, monster-art-guide.md, tilemap-spec.md, icon-spec.md

---

## 1) 파이프라인 전체 흐름

```
┌─────────────┐    ┌──────────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────────┐
│  1. 기획     │───▶│  2. AI 생성   │───▶│  3. 후처리    │───▶│  4. 시트화   │───▶│  5. 게임 통합 │
│  명세 작성   │    │  프롬프트 실행 │    │  리사이즈/QA  │    │  스프라이트   │    │  엔진 임포트  │
└─────────────┘    └──────────────┘    └──────────────┘    └─────────────┘    └──────────────┘
```

### 1.1 단계별 상세

| 단계 | 입력 | 프로세스 | 출력 | 도구 |
|------|------|---------|------|------|
| **1. 기획 명세** | 게임 디자인 문서 | 에셋 타입별 사양 작성 (해상도/프레임/색상) | 에셋 명세서 (.md) | Obsidian |
| **2. AI 생성** | 프롬프트 템플릿 + 명세 | Stable Diffusion / DALL-E API 호출 | 원본 이미지 (PNG, 1024×1024+) | ComfyUI / DALL-E API |
| **3. 후처리** | 원본 이미지 | 배경 제거 → 리사이즈 → 색상 보정 → 팔레트 통일 | 정제 이미지 (PNG, 투명 배경) | rembg, Pillow, ImageMagick |
| **4. 시트화** | 정제 프레임 이미지들 | 스프라이트 시트 패킹 + JSON 메타데이터 생성 | 시트 PNG + atlas.json | `spritesheet_generator.py` |
| **5. 게임 통합** | 시트 + 메타데이터 | Unity/Phaser 에셋 임포트 → 프리팹/씬 배치 | 게임 내 에셋 | Unity Editor / Phaser Loader |

---

## 2) AI 생성 엔진 비교 및 선택 기준

| 엔진 | 용도 | 장점 | 단점 | 권장 에셋 |
|------|------|------|------|----------|
| **Stable Diffusion XL** (로컬) | 캐릭터/몬스터/타일 | 완전 커스텀, LoRA 훈련 가능, 비용 무제한 | 초기 세팅 복잡, GPU 필요 | 캐릭터 스프라이트, 몬스터, 타일맵 |
| **DALL-E 3** (API) | 아이콘/컨셉아트 | 프롬프트 이해도 높음, 빠른 프로토타입 | 스타일 일관성 약함, API 비용 | UI 아이콘, 컨셉 아트, 배경 |
| **Midjourney v6** | 컨셉 아트/배경 | 미적 품질 최고, 구도 우수 | API 미공개, 배치 어려움 | 배경 일러스트, 홍보 이미지 |
| **ComfyUI** (워크플로우) | 전체 파이프라인 | 노드 기반 자동화, 배치 생성 | 학습 곡선 높음 | 대량 배치 생성 시 |

### 2.1 권장 구성

```
기본 엔진:   Stable Diffusion XL (ComfyUI 워크플로우)
보조 엔진:   DALL-E 3 API (아이콘/빠른 프로토타입)
LoRA 모델:   pixel-art-xl, 2d-rpg-character, fantasy-monster
컨트롤넷:    Canny (라인아트 제어), Depth (포즈 제어)
```

---

## 3) 후처리 파이프라인

### 3.1 공통 후처리 단계

```python
# 후처리 워크플로우 (의사 코드)
for image in generated_images:
    1. remove_background(image)          # rembg 라이브러리
    2. resize(image, target_resolution)   # Pillow / Lanczos
    3. apply_palette(image, region_palette) # 지역별 색상 팔레트 적용
    4. normalize_outline(image)           # 외곽선 두께 통일 (2px)
    5. quality_check(image)               # 품질 자동 검증
    6. export(image, format="PNG-32")     # 투명 배경 PNG 출력
```

### 3.2 에셋 타입별 후처리 차이

| 에셋 타입 | 배경 제거 | 리사이즈 | 팔레트 | 외곽선 | 특수 처리 |
|----------|----------|---------|--------|--------|----------|
| 캐릭터 스프라이트 | ✅ | 64×64 / 128×128 | 클래스별 | 2px 검정 | 8방향 미러링 |
| 몬스터 | ✅ | 등급별 (S~XL) | 지역별 | 2px 검정 | 크기 등급 정규화 |
| 타일맵 | ❌ (타일 자체) | 32×32 / 64×64 | 지역별 | 없음 | 이음새(seam) 검증 |
| UI 아이콘 | ✅ | 64×64 | 등급 테두리 | 등급별 | 테두리 자동 적용 |
| 배경 | ❌ | 1920×1080 | 지역별 | 없음 | Parallax 레이어 분리 |

---

## 4) 스프라이트 시트 생성

### 4.1 시트 규격

| 항목 | 규격 |
|------|------|
| 최대 시트 크기 | 2048×2048 px (GPU 텍스처 제한 호환) |
| 패딩 | 프레임 간 2px (블리딩 방지) |
| 메타데이터 | JSON Atlas (프레임 좌표, 크기, 피벗, 애니메이션 태그) |
| 압축 | PNG-8 (256색 이하) 또는 PNG-32 (반투명 필요 시) |
| 네이밍 | `{category}_{name}_{variant}.png` |

### 4.2 JSON Atlas 포맷

```json
{
  "meta": {
    "app": "에테르나 크로니클 Asset Pipeline",
    "version": "1.0",
    "image": "char_ether_knight_idle.png",
    "size": { "w": 512, "h": 512 },
    "scale": 1
  },
  "frames": {
    "idle_down_0": {
      "frame": { "x": 0, "y": 0, "w": 64, "h": 64 },
      "pivot": { "x": 0.5, "y": 0.9 },
      "duration": 200
    },
    "idle_down_1": {
      "frame": { "x": 64, "y": 0, "w": 64, "h": 64 },
      "pivot": { "x": 0.5, "y": 0.9 },
      "duration": 200
    }
  },
  "animations": {
    "idle_down": ["idle_down_0", "idle_down_1", "idle_down_2", "idle_down_3"],
    "walk_down": ["walk_down_0", "walk_down_1", "walk_down_2", "walk_down_3", "walk_down_4", "walk_down_5"]
  }
}
```

---

## 5) 파일 구조 및 네이밍 컨벤션

### 5.1 디렉터리 구조

```
assets/
├── characters/
│   ├── sprites/         # 캐릭터 스프라이트 시트
│   ├── portraits/       # 대화창 초상화
│   └── raw/             # AI 생성 원본 (미정제)
├── monsters/
│   ├── sprites/
│   └── raw/
├── tiles/
│   ├── tilesets/        # 지역별 타일셋 시트
│   └── backgrounds/     # Parallax 배경
├── ui/
│   ├── icons/           # 아이콘 시트
│   └── elements/        # UI 요소
├── audio/
│   ├── bgm/
│   └── sfx/
└── meta/
    └── atlases/          # JSON Atlas 메타데이터
```

### 5.2 파일 네이밍 규칙

```
{카테고리}_{이름}_{변형}_{해상도}.{확장자}

예시:
  char_ether_knight_idle_64x64.png
  char_ether_knight_walk_spritesheet.png
  mon_memory_golem_attack_128x128.png
  tile_erebos_floor_32x32.png
  icon_item_sword_rare_64x64.png
  bgm_erebos_exploration.ogg
  sfx_ui_button_click.wav
```

---

## 6) 품질 게이트 (QA 체크리스트)

### 6.1 자동 검증 (스크립트)

| 검증 항목 | 기준 | 실패 시 조치 |
|----------|------|-------------|
| 해상도 정합성 | 명세서 기준 ±0px | 리사이즈 재실행 |
| 투명 배경 | alpha 채널 존재 (스프라이트) | rembg 재처리 |
| 팔레트 범위 | 지역별 허용 색상 ±10% | 팔레트 재매핑 |
| 시트 크기 | ≤ 2048×2048 | 시트 분할 |
| 프레임 수 | 명세 프레임 수 일치 | 누락 프레임 재생성 |

### 6.2 수동 검증 (아트 디렉터)

- [ ] 실루엣 구분 가능 여부 (32px 축소 테스트)
- [ ] 애니메이션 자연스러움 (프레임 재생 확인)
- [ ] 스타일 일관성 (같은 지역/카테고리 에셋 비교)
- [ ] 게임 내 배치 테스트 (Unity/Phaser 실제 임포트)

---

## 7) 배치 생성 워크플로우

### 7.1 ComfyUI 배치 워크플로우

```
[프롬프트 CSV 로드] → [SD XL 생성] → [rembg 배경 제거] → [리사이즈] → [팔레트 적용] → [시트 패킹] → [Atlas JSON 생성]
```

### 7.2 배치 실행 명령

```bash
# 1. 프롬프트 템플릿에서 개별 프롬프트 CSV 생성
python tools/asset-pipeline/generate_prompts.py --template character --output prompts/characters.csv

# 2. ComfyUI API로 배치 생성
python tools/asset-pipeline/batch_generate.py --prompts prompts/characters.csv --output raw/characters/

# 3. 후처리
python tools/asset-pipeline/postprocess.py --input raw/characters/ --output processed/characters/ --palette erebos

# 4. 스프라이트 시트 생성
python tools/asset-pipeline/spritesheet_generator.py --input processed/characters/ --output sheets/characters/ --size 64x64 --cols 8
```

---

## 8) 도구 의존성

| 도구 | 버전 | 용도 |
|------|------|------|
| Python | 3.11+ | 스크립트 실행 |
| Pillow | 10.0+ | 이미지 처리 |
| rembg | 2.0+ | 배경 제거 |
| ComfyUI | latest | SD XL 워크플로우 |
| Stable Diffusion XL | 1.0 | 이미지 생성 |
| ImageMagick | 7.1+ | 배치 변환 |
| TexturePacker (옵션) | 6.0+ | 상용 시트 패커 |

### 설치 (requirements.txt)

```
Pillow>=10.0.0
rembg>=2.0.50
numpy>=1.24.0
tqdm>=4.65.0
```

---

## 9) 관련 문서 링크

| 문서 | 설명 |
|------|------|
| [[prompt-templates]] | AI 생성 프롬프트 템플릿 |
| [[character-sprites]] | 캐릭터 스프라이트 시트 사양서 |
| [[monster-art-guide]] | 몬스터 비주얼 가이드 100종 |
| [[tilemap-spec]] | 타일맵 아트 명세 8지역 |
| [[icon-spec]] | UI 아이콘 명세 |
| [[bgm-design]] | BGM 디자인 |
| [[sfx-catalog]] | SFX 카탈로그 |
