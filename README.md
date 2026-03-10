# ⚔️ 에테르나 크로니클 (Aeterna Chronicle)

> **실시간 반자동 전투 RPG** | PC 웹 브라우저 + Unity + Unreal Engine 5

![Status](https://img.shields.io/badge/Phase-2-blue) ![Platform](https://img.shields.io/badge/Platform-Web%20%7C%20Unity%20%7C%20UE5-green) ![License](https://img.shields.io/badge/License-Private-red)

---

## 🌍 세계관

**대망각**이 세계를 덮친 지 212년. 신들의 기억이 소멸하고, 에테르 결정만이 과거의 흔적을 품고 있다.

플레이어는 **에리언** — 잊혀진 기억을 되살릴 수 있는 마지막 기억술사. 4개의 신성 기억 파편을 찾아 대륙을 횡단하며, 기억과 망각 사이에서 세계의 운명을 결정한다.

### 6개 지역
| 지역 | 테마 | 특징 |
|------|------|------|
| 🏰 아르겐티움 | 제국의 심장 | 시작 도시, 정치적 음모 |
| 🌳 실반헤임 | 기억의 숲 | 엘프 영토, 세계수 |
| 🏜️ 솔라리스 사막 | 불꽃의 땅 | 고대 유적, 화염 부족 |
| 🌑 에레보스 | 망각의 폐허 | 최종 던전, 망각의 핵심 |
| 🏔️ 북방 영원빙원 | 얼어붙은 기억 | 기억석 사원 |
| ⚓ 브리탈리아 | 자유항 | 무역 거점, 정보 허브 |

---

## 🎮 핵심 시스템

### 클래스
| 클래스 | 역할 | 전직 (Lv.30/50/80) |
|--------|------|-------------------|
| ⚔️ 에테르 기사 | 근접 탱커/딜러 | 수호자 → 파멸자 → 에테르 폭주자 |
| 🔮 기억술사 | 원거리 마법 | 기억 직조사 → 시간 조율사 → 기억 지배자 |
| 🗡️ 그림자 직조사 | 암살/서포터 | 환영사 → 영혼 수확자 → 공허의 군주 |

### 전투
- **실시간 반자동 전투** — 스킬 8슬롯 + 소비아이템 4슬롯
- **Active Pause** (스페이스바) — 전술적 일시정지
- **기억 공명** — 에테르 결정 기반 특수 스킬

### 멀티 엔딩 (4종)
- 🌟 **기억의 수호자** — 모든 파편 수집 + 전원 생존
- 📖 **마지막 증인의 선택** — 기본 엔딩
- 🌑 **망각의 선택** — 배신 루트
- 👁️ **신들의 귀환** — 히든 엔딩

---

## 📁 프로젝트 구조

```
에테르나크로니클/
├── 00_인덱스/           # 시나리오·월드맵·캐릭터 인덱스
├── 01_코어기획/         # GDD, 시스템, 스토리, 기술 아키텍처 (21문서)
├── 02_UI_UX/            # UI/UX 설계, BGM, 인트로 영상
├── 03_데이터테이블/     # 전투·몬스터·아이템 밸런스 테이블
├── 04_검증_P0/          # Phase 0/1/2 검증 리포트
│   ├── P0/              # 전투데이터·엔딩·수직슬라이스 검증
│   ├── P1/              # HUD포팅·QA·텔레메트리·경제보정
│   ├── P2/              # 픽셀패리티·KPI·자동화·L10N
│   └── 공통/            # SSOT 규칙·밸런스 검증표
├── 시나리오/
│   ├── 챕터/            # 챕터 1~5 메인 시나리오
│   ├── NPC대화/         # 챕터별·캐릭터별 대화 스크립트
│   └── 세계관외전/      # 발견 문서·세계관 이벤트
├── 월드맵/              # 6개 지역 상세 설계
├── 캐릭터/              # ~30명 캐릭터 프로필 + 외전
├── client/              # Phaser.js 웹 클라이언트
├── server/              # Node.js + Fastify + Prisma
├── ue5_umg/             # UE5 HUD (C++ UMG 위젯)
├── unity_ui_toolkit/    # Unity HUD (C# UI Toolkit)
└── tools/               # 자동화 도구
    ├── notion_sync/     # Obsidian → Notion 동기화
    └── regression/      # 엔딩회귀·SaveLoad·L10N 테스트
```

---

## 🛠️ 기술 스택

| 계층 | 기술 |
|------|------|
| **웹 클라이언트** | Phaser.js 3 + TypeScript + Vite |
| **Unity 클라이언트** | Unity 2022 LTS + UI Toolkit |
| **UE5 클라이언트** | Unreal Engine 5 + UMG + C++ |
| **서버** | Node.js + Fastify + Socket.io |
| **DB** | PostgreSQL + Prisma ORM |
| **캐시** | Redis (100ms 상태 캐시 → 30초 DB 동기화) |
| **인프라** | Docker + Nginx + GitHub Actions |
| **문서** | Obsidian + Notion (자동 동기화) |

---

## 🚀 개발 현황

### Phase 로드맵
| Phase | 상태 | 내용 |
|-------|------|------|
| **Phase 1** | ✅ 완료 | 웹 프로토타입, HUD 4컴포넌트, 챕터 1~2 |
| **Phase 2** | 🔄 진행 | 멀티엔진 포팅, 텔레메트리, QA 자동화 |
| **Phase 3** | ⏳ 예정 | 길드/PvP, 시즌 시스템, 라이브 서비스 |

### 코어기획 문서 (21개)
- GDD v2.2, 게임 시스템 v1.1, 스토리 기획 v1.1
- 수익화 · QA · 사운드 · 로컬라이제이션 · 펫 · 제작
- NPC AI · 길드 · PvP · 접근성 · 어드민 도구 · 소셜

---

## 📋 설계 원칙

- **SSOT** (Single Source of Truth) — 각 설계 요소의 정본 문서 1개
- **P2W 제로** — 코스메틱/편의 과금만 허용
- **WCAG 2.1 AA** — 접근성 기준 준수
- **자동화 우선** — 엔딩 회귀, SaveLoad 무결성, L10N 정합성 자동 검증

---

## 🔧 로컬 개발

```bash
# 웹 클라이언트
cd client && npm install && npm run dev

# 서버
cd server && npm install && npx prisma generate && npm run dev

# Notion 동기화
python3 tools/notion_sync/sync_runner.py --mode incremental

# 회귀 테스트
python3 tools/regression/ending_regression_runner.py
python3 tools/regression/saveload_integrity_runner.py
python3 tools/regression/l10n_key_integrity_runner.py
```

---

<p align="center">
  <i>기억은 사라져도, 이야기는 남는다.</i>
</p>
