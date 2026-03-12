# 에테르나 크로니클 — 아트 에셋 파이프라인 도구

> 티켓: P13-16  
> 버전: v1.0

---

## 개요

AI로 생성한 이미지 에셋을 게임에 사용 가능한 스프라이트 시트로 변환하는 자동화 파이프라인.

```
원본 이미지 → [배경 제거] → [색보정] → [QA 검증] → [스프라이트 시트 조립]
               remove_bg    color_correct   qa_checker   spritesheet_assembler
```

## 의존성 설치

```bash
pip install Pillow numpy rembg
```

## 도구 목록

| 스크립트 | 역할 | 핵심 의존성 |
|----------|------|------------|
| `remove_bg.py` | 배경 제거 (투명 PNG) | rembg, Pillow |
| `color_correct.py` | 지역별 팔레트 색보정 | Pillow, numpy |
| `spritesheet_assembler.py` | 프레임 → 시트 조립 | Pillow |
| `qa_checker.py` | 에셋 품질 자동 검증 | Pillow |
| `batch_pipeline.py` | 전체 워크플로우 일괄 실행 | 위 모듈 전체 |

---

## 사용법

### 1) 배경 제거

```bash
# 단일 파일
python remove_bg.py raw/knight.png output/knight_nobg.png

# 배치 모드
python remove_bg.py raw/ output/nobg/ --batch --model isnet-anime
```

옵션:
- `--model`: rembg 모델 (`isnet-anime` 기본, `u2net`, `u2netp` 등)
- `--alpha-matting`: 경계 부드럽게 (단일 모드)

### 2) 색보정

```bash
# 단일 파일 (에레보스 팔레트)
python color_correct.py input.png output.png --palette erebos --strength 0.5

# 배치 모드
python color_correct.py input_dir/ output_dir/ --batch --palette silvanheim
```

지원 팔레트: `global`, `erebos`, `silvanheim`, `solaris`, `argentium`, `frozen`, `britalia`, `oblivion`, `mist_sea`, `abyss`

### 3) 스프라이트 시트 조립

```bash
# 일반 시트 (자동 레이아웃)
python spritesheet_assembler.py frames/ output.png --frame-size 64

# 프리셋 사용
python spritesheet_assembler.py frames/ output.png --preset character

# 캐릭터 전체 시트 (5방향 × 7모션)
python spritesheet_assembler.py char_frames/ char_sheet.png --character
```

프리셋: `character`, `monster_s/m/l/xl`, `icon`, `effect`

### 4) QA 검증

```bash
# 단일 파일
python qa_checker.py check input.png --expected-size 64 --check-alpha

# 배치 검증
python qa_checker.py batch input_dir/ --report qa_report.json

# 네이밍 규칙 검증
python qa_checker.py naming input_dir/
```

### 5) 전체 파이프라인

```bash
# 전체 실행
python batch_pipeline.py raw_images/ output/ --palette erebos --preset character

# 특정 단계만
python batch_pipeline.py raw/ output/ --steps remove_bg color_correct

# 단계: remove_bg, color_correct, qa_check, assemble_sheet
```

---

## 디렉터리 구조

```
tools/art-pipeline/
├── README.md                    ← 이 파일
├── remove_bg.py                 ← 배경 제거
├── color_correct.py             ← 색보정
├── spritesheet_assembler.py     ← 시트 조립
├── qa_checker.py                ← QA 검증
└── batch_pipeline.py            ← 배치 파이프라인

[파이프라인 실행 시 생성]
output/
├── 01_nobg/                     ← 배경 제거된 이미지
├── 02_color_corrected/          ← 색보정된 이미지
├── 03_qa_passed/                ← QA 통과 이미지
├── 04_spritesheet/              ← 최종 스프라이트 시트 + JSON 메타
└── pipeline_report.json         ← 실행 리포트
```

---

## 팔레트 참조

`color_correct.py`에 내장된 9개 지역 팔레트는 `docs/art-production/style-guide.md`의 색상 체계 기준.

| 팔레트 키 | 지역 | 주요 톤 |
|-----------|------|---------|
| global | 공통 | 심연 남색, 기억 청색 |
| erebos | 에레보스 | 어두운 보라-회색 |
| silvanheim | 실반헤임 | 에메랄드 녹색 |
| solaris | 솔라리스 | 모래-금빛-적색 |
| argentium | 아르겐티움 | 은색-로열블루 |
| frozen | 영원빙원 | 빙색-오로라 보라 |
| britalia | 브리탈리아 | 틸-나무-구리 |
| oblivion | 망각의 고원 | 공허 흑-병든 녹 |
| mist_sea | 안개해 | 안개 흰-딥 네이비 |
| abyss | 기억의 심연 | 심해-생물발광 |
