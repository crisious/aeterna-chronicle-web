<div align="center">

# ⚔️ 에테르나 크로니클 (Aeterna Chronicle)

**기억은 사라져도, 이야기는 남는다.**

[![Phase](https://img.shields.io/badge/Phase-43%20Complete-blue?style=for-the-badge)](#-개발-현황)
[![Tickets](https://img.shields.io/badge/Notion-728%2F728%20Done-success?style=for-the-badge)](#-개발-현황)
[![Docs](https://img.shields.io/badge/Docs-742%2B%20MD-orange?style=for-the-badge)](#-프로젝트-통계)
[![Assets](https://img.shields.io/badge/Assets-1%2C575%20Total-ff69b4?style=for-the-badge)](#-프로젝트-통계)
[![Commits](https://img.shields.io/badge/Commits-202%2B-blueviolet?style=for-the-badge)](#-프로젝트-통계)

*실시간 반자동 전투 RPG — PC 웹 브라우저 + UE5 데스크톱*

</div>

---

## 🌍 세계관

대망각이 세계를 덮친 지 212년. 신들의 기억이 소멸하고, 에테르 결정만이 과거의 흔적을 품고 있다.
플레이어는 **에리언** — 잊혀진 기억을 되살릴 수 있는 마지막 기억술사. 4개의 신성 기억 파편을 찾아 대륙을 횡단하며, 기억과 망각 사이에서 세계의 운명을 결정한다.

<details>
<summary><b>🗺️ 10개 지역</b></summary>

| 지역 | 테마 | 챕터 |
|------|------|------|
| 🌑 에레보스 | 망각의 폐허 | Ch.1 |
| 🌳 실반헤임 | 기억의 숲 | Ch.2 |
| 🏜️ 솔라리스 사막 | 불꽃의 땅 | Ch.3 |
| 🏰 아르겐티움 | 제국의 심장 | Ch.4 |
| 🏔️ 북방 영원빙원 | 얼어붙은 기억 | Ch.4 |
| ⚓ 브리탈리아 | 자유항 | Ch.3~4 |
| 💀 망각의 고원 | 최종 결전 | Ch.5 |
| 🌊 무한 안개해 | 봉인의 바다 | Ch.6 |
| 🌀 기억의 심연 | 심해 심연 | Ch.7 |
| ⏳ 시간의 균열 | 왜곡된 시공간 | Ch.8 |

</details>

---

## 🎮 핵심 시스템

### 클래스 (6종)

| 클래스 | 역할 | 해금 |
|--------|------|------|
| ⚔️ 에테르 기사 | 근접 탱커/딜러 | 기본 |
| 🔮 기억술사 | 원거리 마법 딜러 | 기본 |
| 🗡️ 그림자 직조사 | 암살/서포터 | 기본 |
| 💥 기억 파괴자 | 근접 딜러/디버퍼 | Ch.6 |
| ⏳ 시간 수호자 | 서포터/컨트롤러 | 시즌3 |
| 🌀 허공의 방랑자 | 하이브리드 | 시즌4 |

각 클래스 Lv.30/50/80 3단계 전직 · 총 180스킬 (6×30)

### 전투

- **실시간 반자동** — 스킬 8슬롯 + 소비아이템 4슬롯
- **Active Pause** (`Space`) — 전술적 일시정지, 동료 직접 명령
- **기억 공명** — 에테르 결정 기반 특수 스킬 발동
- **장비** — 12 카테고리 / 6등급 (일반~신화) / 에테르 소켓 커스텀 빌드

### 멀티 엔딩 (4+1종)

| 엔딩 | 조건 |
|------|------|
| 🌟 기억의 수호자 (트루) | 파편 4개 + 전원 생존 |
| 📖 마지막 증인의 선택 (기본) | 파편 3개 이상 |
| 🌑 망각의 선택 (배신) | betrayal_score ≥ 70 |
| 👁️ 신들의 귀환 (히든) | sacred_artifacts = 12 |

---

## 🛠️ 기술 스택

| 클라이언트 | 서버 | 데이터 | 인프라 |
|-----------|------|--------|--------|
| Phaser.js (웹) · Unity · UE5 | Fastify + Socket.io | PostgreSQL + Redis | Docker · k8s · CI/CD |
| TypeScript | Prisma ORM (110 모델) | Protobuf 바이너리 통신 | 9 워크플로우 |

---

## 📊 프로젝트 통계

| 항목 | 수치 | 항목 | 수치 |
|------|------|------|------|
| Phase | 43 (P0~P43) | 커밋 | 208+ |
| Notion 티켓 | 728/728 Done | 문서 | 742+ MD |
| 클래스 | 6종 | 시즌 | 4개 · 챕터 8개 |
| 던전 | 69종 ×3난이도 | 몬스터 | 197종 |
| 이미지 | 1,383장 (AI) | 오디오 | BGM 42 (MusicGen) + SFX 75 (MusicGen) + Voice 20 (TTS) = 137 ✅ |
| 아틀라스 | 50 PNG + 50 JSON | DB 모델 | 110 (Prisma) |
| API | 44 REST + 8 Socket | UI | 18종 |
| 에셋 총계 | 1,575개 | 정합성 검증 | 395+ 항목, 184+ 수정 |

---

## 🚀 Getting Started

```bash
# 사전 요구: PostgreSQL 16 + Redis + Node.js 20+
cp .env.example .env          # DATABASE_URL 수정

# 서버
cd server && npm install
npx prisma generate && npx prisma db push
npm run seed                   # DB 시딩 (1118건 — 18단계)
npx tsc --noEmitOnError false
cp ../shared/proto/game.proto dist/shared/proto/
node dist/server/src/server.js # → http://localhost:3000

# 클라이언트 (새 터미널)
cd client && npm install
npm run dev                    # → http://localhost:5173 (Vite proxy → :3000)
```

---

## 📈 개발 현황

**43 Phase 완료 · 728 티켓 전부 Done · 208+ 커밋 · v1.0 릴리즈 준비 완료**

| Phase | 내용 | 요약 |
|-------|------|------|
| P38 | 미해결 이슈 전수 수정 | GameScene 안정화 · TODO 0건 · E2E 92/92 · Notion 728티켓 |
| P37 | FF6 전투 시스템 | 사이드뷰 ATB · 커맨드 메뉴 · 데미지 팝업 · 승리 연출 |
| P36 | 픽셀아트 에셋 교체 | 배경 114장 · NPC 30장 · 몬스터 120장 · 캐릭터 18장 |
| P35 | QA 핫픽스 4건 | NPC 매핑 · 전투 키입력 · 전투 그래픽 · 초기 아이템 지급 |
| P34B | 에셋 매니페스트 + 전수 검증 | 오디오 138개 연결 · 이미지 1,383장 확인 · 에셋 완전체 1,575개 |
| P34 | 오디오 SFX 75+Voice 20 완성 | SFX 75개 생성 · Voice 20개 생성 · 오디오 파이프라인 완료 |
| P39 | 오디오 에셋 AI 생성 | BGM 42곡 MusicGen AI 생성 + SFX 75 프로시저럴 + Voice 20 포먼트 합성 · 137/137 완료 |
| P40 | SFX AI 교체 + Voice TTS | SFX 75개 MusicGen AI 교체 · Voice 20개 macOS TTS 생성 · 137/137 유효 |
| P42 | E2E 테스트 확장 | 10개 신규 E2E (combat/character/ending/shop/party/trade/save/world/raid/story) · 24→34 파일 |
| P43 | ACE-Step 보스곡 리마스터 | 핵심 5곡 ACE-Step v1 3.5B 생성 (보스3+메인테마+엔딩) · 평균 4배 고품질 |
| P45 | 로딩 최적화 | 오디오 lazy load (21 essential→116 deferred) · WebP 변환 스크립트 (61% 절감) · Vite gzip/brotli · 로딩 화면 |
| P33B | UI 비주얼 + BGM 연결 | 로딩 화면 강화 · HUD 아이콘 · BGM 씬 매핑 · 42 BGM 정적 서빙 |
| P33 | 시딩 완전 복구 + E2E 테스트 | seed 1118건 18단계 전체 통과 · E2E 22파일 0실패 |
| P32 | 시딩 복구 + Docker + 빌드 | seed 933건 · Dockerfile 검증 · tsc 0에러 |
| P31 | tsc 전수 수정 | 서버 389→0 · 클라이언트 63→0 · 224파일 수정 |
| P30 | 실플레이 QA | E2E 186/199 통과 · 정합 수정 |
| P29 | QA 핫픽스 | API 정합성 전수 수정 + tsc 54건 해소 |
| P28 | v1.0 폴리싱 | 밸런스 · 오디오 · VFX · 접근성 WCAG 2.1 AA |
| P27 | 멀티플레이어 소셜 | 파티/거래/경매/채팅/길드/PvP UI 11종 |

<details>
<summary><b>정합성 검증 상세</b></summary>

누적 395+ 항목 검증, 184+ 건 수정 완료 (P0~P38).
세계관·캐릭터·월드맵·코드 전역 SSOT 통일 — mnemonist 0건, 카엘 0건, 금지어 0건.
DB 시딩 1118건 (18단계, 22테이블) 정합성 확인 완료.
에셋 전수 확인: 이미지 1,383장 + 오디오 138개 + 아틀라스/JSON 54개 = 1,575개.

</details>

---

## 📁 문서 링크

| 카테고리 | 경로 | 문서 수 |
|----------|------|---------|
| 코어기획 | `01_코어기획/` | 21개 (GDD · 시스템 · 수익화 · QA 등) |
| 시나리오 | `시나리오/` | 챕터 1~8 + NPC 대화 + 외전 |
| 캐릭터 | `캐릭터/` | 30명 프로필 + 외전 + 마스터 |
| 월드맵 | `월드맵/` | 10개 지역 상세 설계 |
| 아키텍처 | `docs/architecture/` | 서버 부트스트랩 · 공유 계약 · 기능 토글 |
| 에셋 파이프라인 | `docs/asset-pipeline/` | 8개 (프롬프트 · 스프라이트 · BGM · SFX 등) |
| 아트 프로덕션 | `docs/art-production/` | 18개 (스타일 가이드 · AI 프롬프트 · QA 등) |
| 검증 | `04_검증_P0/` | P0~P38 개연성 검토 + 에셋 매니페스트 |

---

## 📋 설계 원칙

| 원칙 | 설명 |
|------|------|
| 📌 **SSOT** | 각 설계 요소의 정본 문서를 1개만 지정 |
| 🚫 **P2W 제로** | 코스메틱/편의 과금만 — 스탯 직접 판매 금지 |
| ♿ **WCAG 2.1 AA** | 색맹 모드, 키보드 전용, 난이도 조절 |
| 🤖 **자동화 우선** | 엔딩 회귀 · SaveLoad · L10N 자동 검증 |
| 🔄 **Obsidian ↔ Notion** | 양방향 문서 동기화 파이프라인 |

---

<div align="center">

### 🤝 기여

이 프로젝트는 현재 공개되어 있습니다.

---

<sub>Built with ⚔️ and ☕ — 기억과 망각의 경계에서</sub>

[![GitHub](https://img.shields.io/badge/GitHub-crisious-181717?style=flat-square&logo=github)](https://github.com/crisious)

</div>
