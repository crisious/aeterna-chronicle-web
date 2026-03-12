# Steam 배포 준비 (P17-08)

> 작성일: 2026-03-13 | 버전: v1.0
> 상태: Sprint 3-4 (#316)

---

## 1. Steamworks 앱 설정

### 1.1 앱 메타데이터

| 항목 | 값 |
|------|-----|
| 앱 이름 | Aeterna Chronicle (에테르나 크로니클) |
| 장르 | RPG, 인디, 액션, 어드벤처 |
| 개발사 | [개발팀명] |
| 배급사 | (셀프 퍼블리싱 / 미정) |
| 지원 언어 | 한국어(풀), 영어(풀), 일본어(UI+자막) |
| 출시 형태 | 정식 출시 (Early Access 아님) |

### 1.2 디포(Depot) 구성

| 디포 ID | 플랫폼 | 설명 |
|---------|--------|------|
| [앱ID]+1 | Windows x64 | 메인 빌드 (DirectX 12 / Vulkan) |
| [앱ID]+2 | macOS ARM/x64 | Universal Binary (Metal) |
| [앱ID]+3 | Linux x64 | Vulkan 기반 |
| [앱ID]+10 | 공통 | 에셋 번들 (언어팩, 사운드, 텍스처) |

### 1.3 빌드 브랜치

| 브랜치 | 용도 | 접근 |
|--------|------|------|
| `default` (stable) | 정식 출시 빌드 | 공개 |
| `beta` | 공개 베타 / 핫픽스 선행 테스트 | 비밀번호 보호 |
| `dev` | 내부 개발 빌드 | 비밀번호 보호 + 팀 전용 |
| `playtest` | Steam Playtest (OBT) 전용 | Playtest 앱 연동 |

---

## 2. 업적 시스템 (30개)

### 2.1 스토리 업적 (8개)

| # | ID | 이름 (한) | 이름 (영) | 설명 | 아이콘 사양 |
|---|-----|----------|----------|------|-----------|
| 1 | `story_ch1_clear` | 잃어버린 기억 | Lost Memories | 챕터 1 완료 | 에레보스 실루엣, 64×64 JPG |
| 2 | `story_ch2_clear` | 시간의 균열 | Temporal Rift | 챕터 2 완료 | 시간 균열 이펙트 |
| 3 | `story_ch3_clear` | 파편의 부름 | Call of Fragments | 챕터 3 완료 | 4파편 아이콘 |
| 4 | `story_ch4_clear` | 그림자의 심연 | Abyssal Shadow | 챕터 4 완료 | 심연 문양 |
| 5 | `story_ch5_clear` | 기억의 직조 | Memory Weave | 챕터 5 완료 | 직조 문양 |
| 6 | `story_ch6_clear` | 시간의 수호자 | Time's Guardian | 챕터 6 완료 | 시계 문양 |
| 7 | `story_ch7_clear` | 공허를 넘어 | Beyond the Void | 챕터 7 완료 (최종) | 에리언 각성 |
| 8 | `story_all_endings` | 모든 길의 끝 | All Roads End | 모든 엔딩 확인 | 다중 경로 문양 |

### 2.2 던전 업적 (6개)

| # | ID | 이름 (한) | 이름 (영) | 조건 |
|---|-----|----------|----------|------|
| 9 | `dungeon_first_clear` | 첫 발걸음 | First Steps | 던전 최초 1회 클리어 |
| 10 | `dungeon_10_clear` | 모험의 시작 | Adventurer | 서로 다른 던전 10개 클리어 |
| 11 | `dungeon_30_clear` | 숙련된 탐험가 | Seasoned Explorer | 서로 다른 던전 30개 클리어 |
| 12 | `dungeon_all_clear` | 완전 정복 | Full Conquest | 전체 65개 던전 클리어 |
| 13 | `dungeon_no_death` | 불사의 의지 | Undying Will | 던전 1회 무사망 클리어 (하드 이상) |
| 14 | `dungeon_speed_run` | 질주하는 자 | Speed Runner | 특정 던전 제한 시간 내 클리어 |

### 2.3 PvP 업적 (4개)

| # | ID | 이름 (한) | 이름 (영) | 조건 |
|---|-----|----------|----------|------|
| 15 | `pvp_first_win` | 첫 승리 | First Victory | PvP 최초 승리 |
| 16 | `pvp_10_wins` | 전장의 전사 | Warrior of the Arena | PvP 10승 |
| 17 | `pvp_100_wins` | 전설의 투사 | Legendary Fighter | PvP 100승 |
| 18 | `pvp_rank_master` | 최정상 | Apex Predator | PvP 랭크 마스터 달성 |

### 2.4 수집 업적 (6개)

| # | ID | 이름 (한) | 이름 (영) | 조건 |
|---|-----|----------|----------|------|
| 19 | `collect_monster_50` | 몬스터 도감 50 | Monster Log 50 | 50종 몬스터 처치 |
| 20 | `collect_monster_all` | 만물의 사냥꾼 | Hunter of All | 193종 몬스터 전부 처치 |
| 21 | `collect_region_all` | 세계의 방랑자 | World Wanderer | 9개 지역 전부 방문 |
| 22 | `collect_class_all` | 만능의 전사 | Master of All | 6종 클래스 전부 레벨 30+ |
| 23 | `collect_equipment_100` | 장비 수집가 | Gear Collector | 고유 장비 100종 획득 |
| 24 | `collect_lore_all` | 기억의 조각 | Memory Fragments | 전체 로어 문서 수집 |

### 2.5 비밀 업적 (6개)

| # | ID | 이름 (한) | 이름 (영) | 조건 | 비밀 힌트 |
|---|-----|----------|----------|------|----------|
| 25 | `secret_hidden_boss` | 숨겨진 적 | Hidden Foe | 히든 보스 처치 | "깊은 곳에 무언가가…" |
| 26 | `secret_easter_egg` | 개발자의 메모 | Dev's Note | 이스터에그 발견 | "벽을 자세히 보면…" |
| 27 | `secret_pacifist` | 비폭력주의 | Pacifist | 특정 구간 전투 없이 통과 | "때로는 싸우지 않는 것이…" |
| 28 | `secret_time_paradox` | 시간의 역설 | Time Paradox | 시간 역행 이벤트 트리거 | "시간은 직선이 아니다" |
| 29 | `secret_void_message` | 공허의 속삭임 | Void Whisper | 공허 차원 숨겨진 메시지 | "귀 기울이면…" |
| 30 | `secret_true_ending` | 진정한 결말 | True Ending | 진엔딩 달성 | "모든 파편이 하나가 될 때" |

### 2.6 업적 아이콘 사양

| 항목 | 규격 |
|------|------|
| 잠금 해제 아이콘 | 64×64 JPG, 256색 이상, 투명 배경 불가 |
| 잠금 상태 아이콘 | 64×64 JPG, 흑백/실루엣 버전 |
| 파일명 규칙 | `{achievement_id}.jpg` / `{achievement_id}_locked.jpg` |

---

## 3. 트레이딩 카드 시스템

### 3.1 트레이딩 카드 (6종 — 클래스별)

| # | 카드명 (한) | 카드명 (영) | 대응 클래스 | 아트 설명 |
|---|-----------|-----------|-----------|----------|
| 1 | 에테르 기사의 맹세 | Oath of the Ether Knight | ether_knight | 빛나는 검과 에테르 갑옷 |
| 2 | 기억의 직조 | Memory's Weave | memory_weaver | 빛나는 기억 실타래 |
| 3 | 그림자의 춤 | Shadow's Dance | shadow_weaver | 그림자 속 이중 칼날 |
| 4 | 기억 파쇄자 | Shattered Memories | memory_breaker | 파편이 흩어지는 전장 |
| 5 | 시간의 문 | Gate of Time | time_guardian | 시간의 모래시계와 방패 |
| 6 | 공허의 방랑 | Void Wandering | void_wanderer | 공허 차원 사이의 걸음 |

### 3.2 카드 규격

| 항목 | 규격 |
|------|------|
| 카드 이미지 | 206×184 PNG |
| 대형 카드 | 630×1000 PNG |
| 보더 포함 | Steam 자체 프레임 사용 |

### 3.3 배지 (5단계)

| 단계 | 배지명 (한) | 배지명 (영) | 필요 카드 |
|------|-----------|-----------|----------|
| 1 | 초심자 | Initiate | 카드 1장 |
| 2 | 수련자 | Apprentice | 카드 2장 |
| 3 | 숙련자 | Adept | 카드 3장 |
| 4 | 달인 | Expert | 카드 5장 |
| 5 | 전설 | Legend | 카드 6장 (풀셋) |

### 3.4 이모티콘 (5종)

| # | 이모티콘명 | 이미지 설명 | 규격 |
|---|----------|-----------|------|
| 1 | `:aeterna_sword:` | 에테르 검 | 54×54 PNG, 투명 배경 |
| 2 | `:aeterna_fragment:` | 기억 파편 | 54×54 PNG |
| 3 | `:aeterna_clock:` | 시간 모래시계 | 54×54 PNG |
| 4 | `:aeterna_void:` | 공허 포탈 | 54×54 PNG |
| 5 | `:aeterna_heart:` | 에테르 하트 | 54×54 PNG |

### 3.5 프로필 배경 (3종)

| # | 배경명 (한) | 배경명 (영) | 해상도 | 설명 |
|---|-----------|-----------|--------|------|
| 1 | 에레보스의 새벽 | Dawn of Erebos | 1920×1080 JPG | 시작 도시 풍경 |
| 2 | 시간의 사원 | Temple of Time | 1920×1080 JPG | 시간의 사원 내부 |
| 3 | 공허의 경계 | Edge of the Void | 1920×1080 JPG | 공허 차원 진입부 |

---

## 4. 빌드 자동화 (CI/CD)

### 4.1 GitHub Actions → SteamPipe 파이프라인

```yaml
# .github/workflows/steam-deploy.yml
name: Steam Build & Deploy

on:
  push:
    tags:
      - 'v*'  # v1.0.0 등 태그 푸시 시 실행
  workflow_dispatch:
    inputs:
      branch:
        description: 'Steam 브랜치 (default/beta/dev)'
        required: true
        default: 'beta'

env:
  STEAM_APP_ID: ${{ secrets.STEAM_APP_ID }}
  STEAM_USERNAME: ${{ secrets.STEAM_USERNAME }}

jobs:
  build-windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Install dependencies
        run: npm ci
      - name: Build (Windows)
        run: npm run build:windows
      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: build-windows
          path: dist/windows/

  build-macos:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Install dependencies
        run: npm ci
      - name: Build (macOS Universal)
        run: npm run build:macos
      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: build-macos
          path: dist/macos/

  build-linux:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Install dependencies
        run: npm ci
      - name: Build (Linux)
        run: npm run build:linux
      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: build-linux
          path: dist/linux/

  deploy-steam:
    needs: [build-windows, build-macos, build-linux]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Download all build artifacts
        uses: actions/download-artifact@v4
      - name: Install SteamCMD
        uses: CyberAndrii/setup-steamcmd@v1
      - name: Configure SteamPipe VDF
        run: |
          mkdir -p steam_build/scripts
          envsubst < steam_build/templates/app_build.vdf > steam_build/scripts/app_build.vdf
      - name: Upload to Steam
        env:
          STEAM_CONFIG_VDF: ${{ secrets.STEAM_CONFIG_VDF }}
        run: |
          mkdir -p ~/Steam/config
          echo "$STEAM_CONFIG_VDF" | base64 -d > ~/Steam/config/config.vdf
          steamcmd +login $STEAM_USERNAME +run_app_build $(pwd)/steam_build/scripts/app_build.vdf +quit
```

### 4.2 SteamPipe VDF 템플릿

```vdf
// steam_build/templates/app_build.vdf
"AppBuild"
{
  "AppID" "${STEAM_APP_ID}"
  "Desc" "Automated build from GitHub Actions"
  "ContentRoot" "../"
  "BuildOutput" "../output/"
  "Depots"
  {
    "${STEAM_APP_ID}1"
    {
      "FileMapping"
      {
        "LocalPath" "build-windows/*"
        "DepotPath" "."
        "recursive" "1"
      }
    }
    "${STEAM_APP_ID}2"
    {
      "FileMapping"
      {
        "LocalPath" "build-macos/*"
        "DepotPath" "."
        "recursive" "1"
      }
    }
    "${STEAM_APP_ID}3"
    {
      "FileMapping"
      {
        "LocalPath" "build-linux/*"
        "DepotPath" "."
        "recursive" "1"
      }
    }
  }
}
```

### 4.3 빌드 브랜치 전환 스크립트

```bash
#!/bin/bash
# scripts/steam-set-branch.sh
# Usage: ./steam-set-branch.sh <branch> [password]

BRANCH=${1:-default}
PASSWORD=${2:-""}

echo "Setting live branch to: $BRANCH"

steamcmd +login $STEAM_USERNAME \
  +set_app_build_live $STEAM_APP_ID $BRANCH $PASSWORD \
  +quit

echo "Branch '$BRANCH' is now live."
```

---

## 5. DRM & 안티치트

| 항목 | 선택 | 사유 |
|------|------|------|
| DRM | **DRM-Free** | 인디 RPG — 신뢰 기반 배포, 커뮤니티 호감 |
| Steam DRM Wrapper | 사용 안 함 | 오프라인 플레이 보장 |
| 안티치트 (PvP) | EasyAntiCheat (EAC) | PvP 랭킹 무결성, Steam 네이티브 지원 |
| 세이브 검증 | 서버사이드 해시 | 싱글 세이브 변조 방지 (경고만, 차단 안 함) |

---

## 6. 클라우드 저장 (Steam Cloud)

| 항목 | 값 |
|------|-----|
| 동기화 경로 | `{userdatapath}/saves/` |
| 최대 용량 | 100MB (세이브 슬롯 10개 × ~10MB) |
| 충돌 해결 | 타임스탬프 기반 최신 우선 + 사용자 선택 다이얼로그 |
| 설정 파일 포함 | `settings.json`, `keybindings.json`, `accessibility.json` |

---

## 7. 시스템 요구사항 (Steamworks 등록용)

### 최소 사양

| 항목 | Windows | macOS | Linux |
|------|---------|-------|-------|
| OS | Windows 10 64-bit | macOS 12+ | Ubuntu 20.04+ |
| CPU | Intel i5-6600 / AMD Ryzen 3 1200 | Apple M1 / Intel i5 | Intel i5-6600 |
| RAM | 8 GB | 8 GB | 8 GB |
| GPU | GTX 960 / RX 470 (2GB VRAM) | Metal 지원 GPU | GTX 960 (Vulkan) |
| 저장 공간 | 4 GB | 4 GB | 4 GB |
| DirectX | 12 | — | — |

### 권장 사양

| 항목 | Windows | macOS | Linux |
|------|---------|-------|-------|
| OS | Windows 11 | macOS 14+ | Ubuntu 22.04+ |
| CPU | Intel i7-9700 / AMD Ryzen 5 3600 | Apple M2 | Intel i7-9700 |
| RAM | 16 GB | 16 GB | 16 GB |
| GPU | GTX 1070 / RX 580 (4GB) | Apple M2 내장 | GTX 1070 |
| 저장 공간 | 6 GB (SSD 권장) | 6 GB | 6 GB |

---

## 8. 출시 전 검증 체크리스트 (Steamworks 전용)

- [ ] Steamworks 파트너 프로그램 가입 완료
- [ ] 앱 ID 발급 및 디포 설정 완료
- [ ] 스토어 페이지 에셋 업로드 (캡슐, 스크린샷, 트레일러)
- [ ] 빌드 업로드 + 3개 디포 검증
- [ ] 업적 30개 등록 + 아이콘 업로드
- [ ] 트레이딩 카드 6종 + 배지/이모티콘/배경 등록
- [ ] Steam Cloud 설정 + 동기화 테스트
- [ ] 컨트롤러 지원 설정 (부분 지원)
- [ ] 연령 등급 자체 분류 완료
- [ ] 출시일/가격 설정
- [ ] 리뷰 빌드 전송 (프레스 전용 키 발급)
- [ ] 위시리스트 알림 확인
