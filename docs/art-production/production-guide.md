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
