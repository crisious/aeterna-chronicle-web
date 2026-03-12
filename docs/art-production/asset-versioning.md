# 에테르나 크로니클 — 에셋 버전 관리

> 작성일: 2026-03-12 | 버전: v1.0  
> 티켓: P13-18  
> 참조: sprite-spec.md, qa-checklist.md

---

## 1) Git LFS 설정

### 1.1 .gitattributes 설정

```gitattributes
# ── 이미지 에셋 ──
*.png filter=lfs diff=lfs merge=lfs -text
*.jpg filter=lfs diff=lfs merge=lfs -text
*.jpeg filter=lfs diff=lfs merge=lfs -text
*.webp filter=lfs diff=lfs merge=lfs -text
*.gif filter=lfs diff=lfs merge=lfs -text
*.bmp filter=lfs diff=lfs merge=lfs -text

# ── 소스 에셋 (PSD/ASE 등) ──
*.psd filter=lfs diff=lfs merge=lfs -text
*.psb filter=lfs diff=lfs merge=lfs -text
*.aseprite filter=lfs diff=lfs merge=lfs -text
*.ase filter=lfs diff=lfs merge=lfs -text

# ── 오디오 에셋 ──
*.wav filter=lfs diff=lfs merge=lfs -text
*.mp3 filter=lfs diff=lfs merge=lfs -text
*.ogg filter=lfs diff=lfs merge=lfs -text
*.flac filter=lfs diff=lfs merge=lfs -text

# ── 폰트 ──
*.ttf filter=lfs diff=lfs merge=lfs -text
*.otf filter=lfs diff=lfs merge=lfs -text
*.woff2 filter=lfs diff=lfs merge=lfs -text

# ── 3D/기타 대용량 ──
*.fbx filter=lfs diff=lfs merge=lfs -text
*.blend filter=lfs diff=lfs merge=lfs -text
*.zip filter=lfs diff=lfs merge=lfs -text
```

### 1.2 Git LFS 초기화

```bash
# LFS 설치 확인
git lfs install

# 현재 리포에 적용
git lfs track "*.png" "*.jpg" "*.psd" "*.aseprite" "*.wav" "*.mp3"

# 확인
git lfs ls-files
git lfs status
```

### 1.3 LFS 용량 관리

| 항목 | 가이드라인 |
|------|-----------|
| 단일 파일 최대 | 50MB |
| 리포 LFS 총량 목표 | < 5GB (GitHub 기본 한도) |
| 불필요 에셋 정리 | `git lfs prune` 주기적 실행 |
| 대용량 소스 파일 | PSD/ASE는 최종본만 커밋 (WIP는 로컬) |

---

## 2) 에셋 네이밍 규칙

### 2.1 기본 형식

```
{타입}_{지역}_{이름}_{변형}_{크기}.{확장자}

예시:
  char_erebos_ether-knight_idle-front_64x64.png
  mon_silvan_shadow-wolf_elite-attack_48x48.png
  icon_global_fire-sword_legendary_32x32.png
  tile_solaris_sand-floor_v1_32x32.png
  bg_argentium_castle-far_night_1920x1080.png
  vfx_global_fireball-impact_frame03_128x128.png
  ui_global_btn-confirm_default_120x40.png
```

### 2.2 타입 접두사

| 접두사 | 에셋 타입 | 예시 |
|--------|----------|------|
| `char` | 플레이어 캐릭터 | char_erebos_ether-knight_... |
| `npc` | NPC | npc_erebos_eva_idle_... |
| `mon` | 몬스터 | mon_silvan_shadow-wolf_... |
| `icon` | 아이콘 (아이템/스킬/상태) | icon_global_heal-potion_... |
| `tile` | 타일맵 타일 | tile_solaris_sand-floor_... |
| `bg` | 배경 레이어 | bg_frozen_tundra-far_... |
| `vfx` | 이펙트/파티클 | vfx_global_fireball_... |
| `ui` | UI 요소 | ui_global_panel-inventory_... |

### 2.3 지역 약어

| 약어 | 지역 |
|------|------|
| `erebos` | 에레보스 |
| `silvan` | 실반헤임 |
| `solaris` | 솔라리스 사막 |
| `argent` | 아르겐티움 |
| `frozen` | 북방 영원빙원 |
| `brita` | 브리탈리아 |
| `obliv` | 망각의 고원 |
| `mist` | 무한 안개해 |
| `abyss` | 기억의 심연 |
| `global` | 공통/지역 무관 |

### 2.4 변형 (Variant) 규칙

| 카테고리 | 변형 예시 |
|----------|----------|
| 캐릭터 모션 | `idle-front`, `walk-left`, `attack-melee-d0` |
| 몬스터 등급 | `normal`, `elite`, `boss`, `raid` |
| 아이콘 등급 | `common`, `rare`, `epic`, `legendary`, `mythic` |
| 타일 변형 | `v1`, `v2`, `v3` |
| 시간대 | `day`, `night`, `dusk` |
| UI 상태 | `default`, `hover`, `pressed`, `disabled` |
| 이펙트 프레임 | `frame01`, `frame02`, ... |

### 2.5 규칙 요약

| 규칙 | 설명 |
|------|------|
| 소문자만 | 대문자 금지 |
| 하이픈 구분 | 단어 사이는 하이픈 (`-`), 필드 사이는 언더스코어 (`_`) |
| 공백 금지 | 파일명에 공백 없음 |
| 크기 필수 | `WxH` 형식으로 실제 픽셀 크기 명시 |
| 확장자 | `.png` (스프라이트), `.jpg` (배경 컨셉), `.json` (메타) |

---

## 3) 폴더 구조 표준

```
assets/
├── characters/               ← 플레이어 캐릭터
│   ├── ether-knight/
│   │   ├── sprites/          ← 개별 프레임
│   │   │   ├── idle/
│   │   │   ├── walk/
│   │   │   ├── attack_melee/
│   │   │   ├── cast/
│   │   │   ├── hit/
│   │   │   └── death/
│   │   ├── sheets/           ← 조립된 스프라이트 시트
│   │   ├── portraits/        ← 초상화/대화창 이미지
│   │   └── concept/          ← 컨셉 아트
│   ├── mnemonist/
│   ├── shadow-weaver/
│   ├── memory-breaker/
│   └── time-keeper/
│
├── npcs/                     ← NPC
│   ├── main-story/           ← 메인 스토리 NPC
│   │   ├── eva/
│   │   ├── crio/
│   │   └── ...
│   └── merchants/            ← 상인 등 기능 NPC
│
├── monsters/                 ← 몬스터
│   ├── erebos/
│   │   ├── normal/
│   │   ├── elite/
│   │   └── boss/
│   ├── silvanheim/
│   └── ...
│
├── tiles/                    ← 타일맵
│   ├── erebos/
│   │   ├── floor/
│   │   ├── wall/
│   │   ├── decoration/
│   │   └── collision/
│   └── ...
│
├── backgrounds/              ← 배경 레이어
│   ├── erebos/
│   │   ├── sky/
│   │   ├── far/
│   │   ├── mid/
│   │   └── near/
│   └── ...
│
├── icons/                    ← 아이콘
│   ├── items/
│   │   ├── weapons/
│   │   ├── armor/
│   │   ├── consumables/
│   │   └── materials/
│   ├── skills/
│   │   ├── ether-knight/
│   │   ├── mnemonist/
│   │   └── ...
│   ├── buffs/
│   └── status/
│
├── vfx/                      ← 이펙트
│   ├── skills/
│   ├── hits/
│   ├── projectiles/
│   ├── auras/
│   └── environment/
│
├── ui/                       ← UI 에셋
│   ├── hud/
│   ├── panels/
│   ├── buttons/
│   ├── frames/
│   └── themes/
│
├── cosmetics/                ← 코스메틱
│   ├── skins/
│   ├── weapons/
│   ├── auras/
│   └── pets/
│
├── cutscenes/                ← 컷씬 일러스트
│   ├── chapter-01/
│   ├── chapter-02/
│   └── ...
│
└── _raw/                     ← AI 생성 원본 (후처리 전, Git 미추적)
    ├── batch_20260312/
    └── ...
```

---

## 4) 브랜치 전략 (에셋 전용)

### 4.1 브랜치 구조

```
main
├── develop                   ← 개발 통합
│   ├── feature/art-*         ← 기능별 아트 작업
│   └── feature/code-*        ← 코드 작업
├── art/characters            ← 캐릭터 에셋 전용
├── art/monsters              ← 몬스터 에셋 전용
├── art/environment           ← 환경(타일/배경) 전용
├── art/ui-icons              ← UI/아이콘 전용
├── art/vfx                   ← 이펙트 전용
└── release/*                 ← 릴리즈
```

### 4.2 브랜치 규칙

| 규칙 | 설명 |
|------|------|
| 에셋 전용 브랜치 | 대용량 에셋은 `art/*` 브랜치에서 작업 |
| 코드와 분리 | 코드 PR과 에셋 PR 분리 (LFS 충돌 방지) |
| 머지 방향 | `art/*` → `develop` → `main` |
| 리뷰 | 에셋 PR은 QA 체크리스트 통과 후 머지 |
| 스쿼시 머지 | 에셋 브랜치는 squash merge (히스토리 정리) |

### 4.3 커밋 메시지 규칙

```
art(타입): 작업 설명

예시:
  art(char): 에테르 기사 idle 스프라이트 5방향 추가
  art(mon): 에레보스 일반 몬스터 5종 배경 제거 + 색보정
  art(icon): 무기 아이콘 20종 추가 (일반~영웅)
  art(tile): 실반헤임 바닥 타일 v2 교체
  art(vfx): 파이어볼 이펙트 시퀀스 12프레임
  art(ui): 인벤토리 패널 다크 테마
  fix(art): 그림자 직조사 walk 프레임 5 크기 수정
```

---

## 5) _raw 디렉터리 정책

| 규칙 | 설명 |
|------|------|
| Git 미추적 | `assets/_raw/`는 `.gitignore`에 등록 |
| 로컬 보관 | AI 생성 원본은 로컬/NAS에 보관 |
| 배치 ID | `batch_YYYYMMDD_HHMMSS/` 형식으로 생성 단위 관리 |
| 삭제 주기 | QA 통과 + 후처리 완료 후 30일 보관 → 삭제 |

---

*끝. 모든 에셋 파일은 이 규칙을 준수하여 관리한다.*
