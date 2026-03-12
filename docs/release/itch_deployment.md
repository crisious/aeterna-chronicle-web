# itch.io 배포 준비 (P17-09)

> 작성일: 2026-03-13 | 버전: v1.0
> 상태: Sprint 3-4 (#317)

---

## 1. itch.io 페이지 구성

### 1.1 기본 정보

| 항목 | 값 |
|------|-----|
| 프로젝트 URL | `https://[개발자].itch.io/aeterna-chronicle` |
| 분류 | Game |
| 장르 | RPG |
| 태그 | rpg, indie, action-rpg, story-rich, korean, pixel-art, accessibility, colorblind-friendly |
| 플랫폼 | Windows, macOS, Linux |
| 상태 | Released |
| 커뮤니티 | Comments 활성 + Devlog 활성 |

### 1.2 페이지 레이아웃

```
┌──────────────────────────────────────────────┐
│  [커버 이미지 — 630×500]                       │
├──────────────────────────────────────────────┤
│  게임 제목 + 부제                              │
│  GIF 1: 전투 시스템 (320×240, 15fps, <5MB)     │
│  ──────────────────────                       │
│  ★ 주요 특징 5줄                               │
│  GIF 2: 던전 탐험 (320×240)                    │
│  ──────────────────────                       │
│  ★ 스토리 소개 (스포일러 없이)                   │
│  GIF 3: 클래스 전환 (320×240)                  │
│  ──────────────────────                       │
│  ★ 접근성 안내                                 │
│  스크린샷 5장                                  │
│  ──────────────────────                       │
│  ★ 시스템 요구사양                              │
│  다운로드 버튼                                  │
└──────────────────────────────────────────────┘
```

### 1.3 커버 이미지 & 에셋 규격

| 에셋 | 규격 | 비고 |
|------|------|------|
| 커버 이미지 | 630×500 PNG | 메인 키 아트 + 로고 |
| 배너 | 960×120 PNG | 상단 배너 (선택) |
| 스크린샷 | 1920×1080 PNG × 5장 | 전투/탐험/UI/보스/접근성 |
| GIF | 320×240, 15fps, <5MB × 3개 | 핵심 게임플레이 루프 |
| 아이콘 | 315×250 PNG | 검색 결과 썸네일 |

---

## 2. 페이지 설명문

### 2.1 한국어 설명

```markdown
# 에테르나 크로니클

**대망각으로부터 3,200년 — 잃어버린 기억을 되찾는 여정**

에리언은 기억을 잃은 채 에레보스에서 깨어납니다. 흩어진 4개의 기억 파편을
되찾으며, 대망각의 진실과 자신의 정체를 밝혀가는 ARPG입니다.

## ✨ 주요 특징

- **6종 클래스** — 에테르 기사, 기억의 직조자, 그림자 직조자,
  기억 파쇄자, 시간의 수호자, 공허의 방랑자
- **9개 지역, 65개 던전** — 각 지역마다 고유한 시각적·전투 테마
- **193종 몬스터** — 도감 수집과 전략적 약점 시스템
- **풍부한 접근성** — 색약 모드 3종, 키 리바인딩, 화면 낭독기 호환,
  UI 스케일링, 자막 커스텀, 모션 감소 모드
- **깊은 세계관** — 대망각 이전의 역사, 시간-기억-공허의 삼위 구조

## 🎮 게임 정보

- **장르**: 액션 RPG
- **플레이 시간**: 메인 스토리 20~30시간, 풀 클리어 60시간+
- **언어**: 한국어, English, 日本語
- **컨트롤러**: 부분 지원
```

### 2.2 영문 설명

```markdown
# Aeterna Chronicle

**3,200 years after the Great Oblivion — a journey to reclaim lost memories**

Erien awakens in Erebos with no memories. Recover four scattered memory
fragments and uncover the truth behind the Great Oblivion in this story-driven ARPG.

## ✨ Key Features

- **6 Classes** — Ether Knight, Memory Weaver, Shadow Weaver,
  Memory Breaker, Time Guardian, Void Wanderer
- **9 Regions, 65 Dungeons** — unique visual and combat themes per region
- **193 Monster species** — collectible bestiary with strategic weakness system
- **Full Accessibility Suite** — 3 colorblind modes, key rebinding, screen reader,
  UI scaling, subtitle customization, reduced motion mode
- **Deep Lore** — pre-Oblivion history, Time-Memory-Void trinity

## 🎮 Game Info

- **Genre**: Action RPG
- **Playtime**: 20-30h main story, 60h+ completionist
- **Languages**: 한국어, English, 日本語
- **Controller**: Partial support
```

---

## 3. 가격 전략

### 3.1 가격 모델

| 항목 | 값 | 사유 |
|------|-----|------|
| 기본 가격 | **$14.99 USD** | 인디 RPG 시장 기준 (20-30시간 메인) |
| 한국 가격 | ₩16,500 | PPP 보정 (Steam과 동일) |
| 최저 가격 설정 | **$9.99** | 번들/할인 시 최저선 |
| Name Your Price | **사용 안 함** | 정식 출시 — 고정 가격 |
| 무료 데모 | **별도 페이지** | 데모용 별도 프로젝트 생성 |

### 3.2 할인 전략

| 시점 | 할인율 | 기간 | 비고 |
|------|--------|------|------|
| 출시 주간 | 10% | 7일 | 런칭 프로모션 |
| 출시 1개월 후 | — | — | 할인 없음 (쿨다운) |
| 시즌 세일 | 20~25% | 세일 기간 | itch.io 시즌 이벤트 참여 |
| 번들 참여 | 30~50% | 번들 기간 | 인디 번들 기획 시 |
| 1주년 | 30% | 7일 | 기념 할인 |

### 3.3 번들 구성 (향후)

| 번들명 | 포함 항목 | 할인율 |
|--------|---------|--------|
| Aeterna Complete | 본편 + OST + 아트북(PDF) | 25% |
| Supporter Pack | 본편 + 개발 일지 PDF + 벽지팩 | 15% |

---

## 4. 데모 빌드

### 4.1 데모 범위

| 항목 | 값 |
|------|-----|
| 포함 콘텐츠 | 챕터 1 (에레보스 지역 전체) |
| 플레이 시간 | 약 60~90분 |
| 사용 가능 클래스 | ether_knight, memory_weaver (2종) |
| 레벨 캡 | Lv.15 |
| 던전 | 에레보스 소속 던전만 (약 7개) |
| 몬스터 | 에레보스 소속만 (약 20종) |
| PvP | 비활성 |
| 접근성 기능 | 전부 사용 가능 |

### 4.2 세이브 이관

| 항목 | 값 |
|------|-----|
| 데모→정식 이관 | **가능** |
| 이관 방식 | `saves/demo_save.json` → 정식 빌드 자동 감지 |
| 이관 내용 | 캐릭터 레벨, 인벤토리, 진행도 |
| 이관 제한 | 데모 전용 아이템(★표시) 제거 |
| 알림 | 정식 빌드 첫 실행 시 "데모 세이브 발견" 팝업 |

### 4.3 데모 빌드 분리 방법

```bash
# scripts/build-demo.sh
#!/bin/bash

# 정식 빌드에서 데모 빌드 추출
npm run build:all

# 챕터 1 에셋만 포함
node scripts/extract-demo.js \
  --chapters 1 \
  --regions erebos \
  --level-cap 15 \
  --classes ether_knight,memory_weaver \
  --output dist/demo/

# 데모 전용 설정 주입
cp config/demo-config.json dist/demo/config.json

echo "Demo build created at dist/demo/"
```

---

## 5. 개발 로그 (Devlog) 포맷

### 5.1 포스팅 계획

| 시점 | 주제 | 길이 |
|------|------|------|
| 출시 D-60 | "개발 시작 이야기" | 800~1200자 |
| 출시 D-30 | "전투 시스템 해부" | 1000~1500자 |
| 출시 D-14 | "접근성에 대한 우리의 약속" | 800~1000자 |
| 출시일 | "출시합니다!" | 500~800자 |
| 출시 D+7 | "첫 주 회고 + 패치 노트" | 600~1000자 |
| 출시 D+30 | "한 달 데이터 공유" | 800~1200자 |

### 5.2 Devlog 템플릿

```markdown
# [제목]

> 작성일: YYYY-MM-DD

[도입 — 2~3줄]

## 핵심 내용

[본문 — 이미지/GIF 2~3개 포함]

## 다음 소식

[예고 — 1~2줄]

---

피드백은 댓글이나 [Discord 서버](링크)로 보내주세요!
```

---

## 6. itch.io 전용 설정

### 6.1 butler (itch.io CLI) 업로드

```bash
# butler 설치 후
butler push dist/windows/ [개발자]/aeterna-chronicle:windows
butler push dist/macos/   [개발자]/aeterna-chronicle:macos
butler push dist/linux/   [개발자]/aeterna-chronicle:linux

# 데모 (별도 프로젝트)
butler push dist/demo/windows/ [개발자]/aeterna-chronicle-demo:windows
butler push dist/demo/macos/   [개발자]/aeterna-chronicle-demo:macos
butler push dist/demo/linux/   [개발자]/aeterna-chronicle-demo:linux
```

### 6.2 채널 태그

| 채널명 | 플랫폼 | 다운로드 라벨 |
|--------|--------|-------------|
| `windows` | Windows | "Download for Windows" |
| `macos` | macOS | "Download for macOS" |
| `linux` | Linux | "Download for Linux" |

### 6.3 itch.io app 호환

| 항목 | 값 |
|------|-----|
| `.itch.toml` | 포함 (실행파일 경로 지정) |
| 자동 업데이트 | butler 패칭 지원 (자동) |
| 실행 파일 | Windows: `AeternaChronicle.exe`, macOS: `AeternaChronicle.app`, Linux: `AeternaChronicle` |

```toml
# .itch.toml
[[actions]]
name = "Play Aeterna Chronicle"
path = "AeternaChronicle.exe"
platform = "windows"

[[actions]]
name = "Play Aeterna Chronicle"
path = "AeternaChronicle.app"
platform = "osx"

[[actions]]
name = "Play Aeterna Chronicle"
path = "AeternaChronicle"
platform = "linux"
```

---

## 7. 출시 전 체크리스트 (itch.io 전용)

- [ ] 페이지 생성 + 기본 정보 입력
- [ ] 커버 이미지 업로드 (630×500)
- [ ] 스크린샷 5장 + GIF 3개 업로드
- [ ] 한/영 설명문 입력
- [ ] 가격 설정 ($14.99)
- [ ] 3개 플랫폼 빌드 butler 업로드
- [ ] `.itch.toml` 동봉 확인
- [ ] 데모 프로젝트 별도 생성 + 업로드
- [ ] Devlog 첫 포스트 작성
- [ ] 태그 설정 (8개+)
- [ ] 커뮤니티 댓글 활성화
- [ ] Steam 페이지 상호 링크
