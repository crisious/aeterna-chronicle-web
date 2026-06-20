# 에테르나 크로니클 — 디자인 시스템 v1.0

> 작성: 가춘운 (CMO/디자인)
> 작성일: 2026-04-14
> SSOT 위계 명시: Phase 54 / v1.0.0-rc.3 (2026-04-27)
> 스코프: 클라이언트 UI 통합 + NPC 대화 시스템
> 참조: `docs/art-production/style-guide.md`, `docs/art-production/ui-skin-design.md`

---

## ⚠️ 디자인 토큰 SSOT 위계 (변경 절차)

본 문서가 디자인 시스템의 **1차 SSOT (사람이 읽는 정본)** 입니다. 코드 토큰은 본 문서를 미러합니다 — 단방향. 절대 코드 → 문서 역방향 갱신 금지.

| 차수 | 위치 | 책임 |
|---|---|---|
| **1차 SSOT** | `/DESIGN.md` (본 파일) | 사람이 읽는 정본 — 컬러 팔레트, 타이포, 원칙, 위계 |
| 2차 (코어 코드) | `client/src/config/design-tokens.ts` | 코어 컬러/스페이싱/타이포 토큰의 Phaser+CSS 미러 |
| 3차 (토픽 확장) | `client/src/design_tokens/{topic}.ts` | 토픽별 확장 (예: `monster_tier.ts`) |
| 4차 (런타임 상수) | `client/src/constants/{system}-tokens.ts` | Phaser 0xRRGGBB 변환, 시스템별 런타임 (예: `battle-tokens.ts`) |
| CSS 미러 | `client/src/styles/design-system-*.css` | 4차와 1:1 매칭되는 CSS 변수 |

**변경 절차** — 위에서 아래로만:

1. DESIGN.md (본 파일) 갱신
2. `client/src/config/design-tokens.ts` 코어 미러 갱신
3. 토픽 파일 (`design_tokens/`) 미러 갱신
4. 런타임 상수 (`constants/`) + CSS 미러 갱신
5. 시각 회귀 (`client/public/style-guide.html`, `battle-style-guide.html`) 검증

> 참조: 본 위계는 Phase 54 자동 리뷰에서 "3중 SSOT 의심" 경보 해소 결과 명문화. autoplan-prancy-napping-hedgehog 결정 1.

---

## 목차

1. [디자인 원칙](#1-디자인-원칙)
2. [컬러 시스템](#2-컬러-시스템)
3. [타이포그래피](#3-타이포그래피)
4. [스페이싱 & 레이아웃](#4-스페이싱--레이아웃)
5. [컴포넌트 토큰](#5-컴포넌트-토큰)
6. [NPC 대화 UI 상세](#6-npc-대화-ui-상세)
7. [테마 & 접근성](#7-테마--접근성)
8. [반응형 브레이크포인트](#8-반응형-브레이크포인트)
9. [구현 가이드](#9-구현-가이드)
10. [Monster Tier Tokens — 몬스터 아트 파이프라인 SSOT](#10-monster-tier-tokens--몬스터-아트-파이프라인-ssot)
11. [Sound Design Tokens — BGM·SFX 사운드 시스템 SSOT](#11-sound-design-tokens--bgmsfx-사운드-시스템-ssot)
12. [전투 피드백 — 데미지·상태이상 표시 SSOT](#12-전투-피드백--데미지상태이상-표시-ssot)

---

## 1. 디자인 원칙

| 원칙 | 설명 | 실천 |
|------|------|------|
| **다크 판타지 톤** | 어두운 심연 + 발광 액센트 | `#1A1A2E` 기반, 금/청 포인트 |
| **정보 계층** | 중요한 것이 먼저 보인다 | 밝기/크기로 3단계 위계 |
| **픽셀 정합성** | 1-2px 그리드 정렬 | 안티앨리어싱 금지, 짝수 단위 |
| **접근성 우선** | WCAG AAA, 색약 대응 | 색상 외 형태/아이콘 병행 표기 |
| **일관된 경험** | 모든 화면이 하나의 세계관 | 단일 토큰 시스템으로 통제 |

---

## 2. 컬러 시스템

### 2.1 코어 팔레트 (Aeterna Dark 기본 테마)

```
┌─────────────────────────────────────────────────────┐
│  BACKGROUNDS                                        │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐     │
│  │#0D0D1A│ │#1A1A2E│ │#16213E│ │#2A2A3A│ │#3A3A4A│  │
│  │ 심연  │ │ 기본  │ │ 패널  │ │ 프레임│ │ 버튼  │  │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘     │
│                                                     │
│  TEXT                                               │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐               │
│  │#E8E8E8│ │#A0A0A0│ │#606060│ │#FFD700│            │
│  │ 기본  │ │ 보조  │ │비활성 │ │ 강조  │            │
│  └──────┘ └──────┘ └──────┘ └──────┘               │
│                                                     │
│  ACCENTS                                            │
│  ┌──────┐ ┌──────┐ ┌──────┐                         │
│  │#89CFF0│ │#2ECC71│ │#FF4444│                      │
│  │에테르 │ │ 성공  │ │ 경고  │                      │
│  └──────┘ └──────┘ └──────┘                         │
└─────────────────────────────────────────────────────┘
```

#### 토큰 테이블

| 토큰명 | Hex | 용도 |
|--------|-----|------|
| `--bg-abyss` | `#0D0D1A` | 그림자, 가장 어두운 배경 |
| `--bg-primary` | `#1A1A2E` | 기본 배경, 모달 |
| `--bg-panel` | `#16213E` | 패널, 대화창, 사이드바 |
| `--bg-frame` | `#2A2A3A` | 프레임 채움, 컨테이너 |
| `--bg-button` | `#3A3A4A` | 버튼 기본 상태 |
| `--bg-hover` | `#4A4A5A` | 호버 상태 |
| `--bg-input` | `#0D0D1A` | 텍스트 입력 필드 |
| `--text-primary` | `#E8E8E8` | 일반 텍스트 |
| `--text-secondary` | `#A0A0A0` | 보조 텍스트, 설명 |
| `--text-muted` | `#606060` | 비활성, 힌트 |
| `--text-accent` | `#FFD700` | NPC 이름, 강조, 금색 텍스트 |
| `--text-warning` | `#FF4444` | 피해량, 경고, 삭제 |
| `--accent-ether` | `#89CFF0` | 에테르/기억 발광, 주요 액션 |
| `--accent-success` | `#2ECC71` | 회복, 성공, 완료 |
| `--accent-danger` | `#FF4444` | 위험, 삭제, 에러 |
| `--border-default` | `#5A5A6A` | 일반 테두리 |
| `--border-accent` | `#FFD700` | 강조 테두리 (금색) |
| `--border-subtle` | `#3A3A4A` | 은은한 테두리 |

### 2.2 게이지 바 컬러

| 게이지 | 색상 | 배경 |
|--------|------|------|
| HP | `#E74C3C` → `#2ECC71` (잔량 비례) | `#333333` |
| MP | `#3498DB` → `#9B59B6` (그라데이션) | `#333333` |
| EXP | `#F39C12` (호박색) | `#333333` |
| 쿨다운 | `rgba(0,0,0,0.5)` 오버레이 | 스킬 아이콘 |

### 2.3 아이템 등급 컬러

| 등급 | 테두리 | 글로우 | 텍스트 |
|------|--------|--------|--------|
| 일반 (Common) | `#808080` | 없음 | `#FFFFFF` |
| 고급 (Uncommon) | `#2ECC71` | 약한 녹색 | `#2ECC71` |
| 희귀 (Rare) | `#3498DB` | 약한 청색 | `#3498DB` |
| 영웅 (Epic) | `#9B59B6` | 중간 보라 | `#9B59B6` |
| 전설 (Legendary) | `#F39C12` | 강한 주황 | `#F39C12` |
| 신화 (Mythic) | `#E74C3C` | 강한 적색 + 파티클 | `#E74C3C` |
| 에테르 (Ether) | `#89CFF0` | 펄스 발광 + 파티클 | `#89CFF0` |

### 2.4 지역별 발광 액센트 (요약)

| 지역 | 주요 발광색 | 분위기 키워드 |
|------|-----------|-------------|
| 에레보스 | `#89CFF0` 기억 잔광 | 폐허, 안개, 신비 |
| 실반헤임 | `#7DF9FF` 발광균 | 고대 숲, 생명 |
| 솔라리스 | `#FFD700` 태양열 | 사막, 열기 |
| 아르겐티움 | `#FFA500` 증기 | 기계, 황동 |
| 북방 빙원 | `#00BFFF` 결정 | 빙하, 오로라 |
| 브리탈리아 | `#48D1CC` 해양 | 항구, 바다 |
| 안개해 | `#DDA0DD` 기억안개 | 보라, 유령선 |
| 기억의 심연 | `#FF00FF` 에테르 | 최종, 허공 |

> 전체 지역 팔레트 상세는 `docs/art-production/style-guide.md` 섹션 2.3 참조

---

## 3. 타이포그래피

### 3.1 폰트 스택

| 용도 | 폰트 | 대체(Fallback) | 설명 |
|------|------|----------------|------|
| **게임 UI (캔버스)** | Galmuri11 (한글 픽셀폰트) | Pretendard, Noto Sans KR | quiple/galmuri SIL OFL, local 호스팅(/fonts/Galmuri11.woff2) |
| **제목 (한글, 웹)** | 여기어때 잘난체 Bold | Noto Sans KR Bold | 판타지 느낌 강조 |
| **본문 (한글, 웹)** | Pretendard | Noto Sans KR | 가독성 최우선 |
| **영문 제목** | Pirata One | Cinzel | 다크 판타지 분위기 |
| **영문 본문** | Galmuri11 | system-ui | 게임 톤 일관 (Inter 폐기 — DR-13) |
| **수치/코드** | JetBrains Mono | monospace | 숫자 정렬, 대미지 팝업 |

> **DR-8/10/11/12/13 (2026-05-08)**: Inter 가 AI Slop default font stack 으로
> 분류되어 전수 제거. Galmuri11 한글 픽셀폰트가 게임 UI(Phaser BitmapFont 대신)
> + 영문 본문 fallback 양쪽에 적용되어 다크 판타지 게임 톤 일관.
> jsDelivr CDN 의존도 폐기 → /fonts/Galmuri11.woff2 local 호스팅(505KB, SIL OFL).

### 3.2 타이포 스케일

| 토큰 | 크기 | 행간 | 용도 |
|------|------|------|------|
| `--font-xs` | 10px | 1.2 | 시스템 메시지, 타임스탬프 |
| `--font-sm` | 12px | 1.3 | 보조 텍스트, 아이템 수량 |
| `--font-md` | 14px | 1.4 | 기본 본문, NPC 대화 |
| `--font-lg` | 16px | 1.4 | 강조 본문, 제목 (소) |
| `--font-xl` | 20px | 1.3 | 섹션 제목, NPC 이름 |
| `--font-2xl` | 24px | 1.2 | 화면 제목, 중요 알림 |
| `--font-3xl` | 32px | 1.1 | 대미지 팝업 (크리티컬) |

### 3.3 텍스트 스타일 규칙

| 항목 | 규칙 |
|------|------|
| NPC 이름 | `--font-xl` + Bold + `--text-accent` (금색) |
| NPC 대사 | `--font-md` + Regular + `--text-primary` |
| 선택지 텍스트 | `--font-md` + Regular + `--accent-ether` |
| 비활성 선택지 | `--font-md` + Regular + `--text-muted` |
| 대미지 (일반) | `--font-lg` + Bold + `#FFFFFF` + 1px 외곽선 |
| 대미지 (크리) | `--font-3xl` + Bold + `--text-accent` + 2px 외곽선 |
| 시스템 알림 | `--font-sm` + Italic + `#C0C0C0` |

---

## 4. 스페이싱 & 레이아웃

### 4.1 스페이싱 스케일 (4px 베이스)

| 토큰 | 값 | 용도 |
|------|-----|------|
| `--space-1` | 4px | 아이콘 내부 여백, 미세 간격 |
| `--space-2` | 8px | 인라인 간격, 라벨-값 사이 |
| `--space-3` | 12px | 요소 간 기본 간격 |
| `--space-4` | 16px | 패널 패딩, 섹션 간 간격 |
| `--space-5` | 20px | 카드 패딩, 그룹 간 간격 |
| `--space-6` | 24px | 모달 패딩, 큰 섹션 간격 |
| `--space-8` | 32px | 화면 마진, 주요 영역 간 간격 |
| `--space-12` | 48px | 대형 섹션 분리 |

### 4.2 마스터 레이아웃 (게임 화면)

```
┌────────────────────────────────────────────────────────┐
│ HUD-TOP                                                │
│ [초상화 48px] [HP/MP/EXP 바] ─── 좌상단               │
│ ──────────────────────────────────────────────────────  │
│                                                        │
│                    GAME CANVAS                          │
│                  (Phaser 렌더링 영역)                    │
│                                                        │
│ ──────────────────────────────────────────────────────  │
│ HUD-BOTTOM                                             │
│ [미니맵 128px]  [채팅 300×120]  ──  [퀵슬롯 8칸]       │
│                                    [스킬바 8칸]         │
│                 [메뉴 아이콘 5개]                        │
├────────────────────────────────────────────────────────┤
│ OVERLAY (필요시 표시)                                   │
│ [대화창] [인벤토리] [스킬트리] [상점] [설정]             │
└────────────────────────────────────────────────────────┘
```

### 4.3 Z-Index 계층 (depth)

| 레이어 | Depth | 용도 |
|--------|-------|------|
| 배경/타일 | 0~100 | 맵 바닥, 장식 |
| 엔티티 | 100~500 | 캐릭터, NPC, 몬스터 |
| 이펙트 | 500~700 | 스킬 이펙트, 파티클 |
| HUD | 700~800 | 체력바, 미니맵, 퀵슬롯 |
| 대화/UI 오버레이 | 800~900 | 대화창 (`depth: 850`), 인벤토리 |
| 모달/팝업 | 900~950 | 확인창, 설정창 |
| 알림/토스트 | 950~999 | 시스템 메시지, 토스트 |

### 4.4 슬롯 규격

| 요소 | 크기 | 간격 | 용도 |
|------|------|------|------|
| 인벤토리 슬롯 | 36×36 px | 2px | 아이템 그리드 |
| 퀵슬롯 | 36×36 px | 2px | 소비/포션 |
| 스킬 슬롯 | 36×36 px | 2px | 스킬바 |
| 장비 슬롯 | 40×40 px | 4px | 캐릭터 장비칸 |
| 아이콘 (기본) | 32×32 px | — | 범용 아이콘 |
| 아이콘 (미니) | 16×16 px | — | 인라인 아이콘 |

---

## 5. 컴포넌트 토큰

### 5.1 프레임 (Panel)

| 유형 | 보더 | 배경 | 라운드 | 용도 |
|------|------|------|--------|------|
| 기본 패널 | 1px `--border-default` | `--bg-panel` 90% | 2px | 대화창, 정보 |
| 강조 패널 | 2px `--border-accent` | `--bg-panel` 95% | 2px | 경고, 중요 안내 |
| 투명 패널 | 없음 | `#000000` 60% | 0px | HUD 배경 |
| 모달 | 2px `--border-accent` | `--bg-primary` 98% | 4px | 확인/설정 |
| 툴팁 | 1px `--border-subtle` | `--bg-abyss` 95% | 2px | 아이템 설명 |

### 5.2 버튼

| 상태 | 배경 | 보더 | 텍스트 |
|------|------|------|--------|
| 기본 | `--bg-button` → `--bg-frame` (gradient) | 1px `--border-default` | `--text-primary` |
| 호버 | `--bg-hover` (+15% 밝기) | 동일 | `#FFFFFF` |
| 클릭 | `--bg-frame` (-10% 밝기) | 1px inset shadow | `--text-primary` |
| 비활성 | `#2A2A2A` | 1px `--border-subtle` | `--text-muted` |
| 주요 액션 | `#1A3A5A` → `#0A2A4A` | 1px `--accent-ether` | `--accent-ether` |
| 위험 | `#4A1A1A` → `#3A0A0A` | 1px `--accent-danger` | `#FF6666` |

**사이즈**: S `60×24` / M `120×32` / L `200×40`

### 5.3 입력 요소

| 컴포넌트 | 규격 | 상세 |
|---------|------|------|
| 슬라이더 | 트랙 200×4, 핸들 12×12 | 채움: `--accent-ether` 그라데이션 |
| 토글 | 트랙 24×12, 핸들 10×10 | ON: `--accent-ether`, OFF: `--text-muted` |
| 탭 | 활성: 하단 2px `--text-accent` | 비활성: 하단 1px `--border-subtle` |
| 스크롤바 | 6px 폭, 미니멀 | 썸: `--border-default`, 호버: `--bg-hover` |

### 5.4 ATB 게이지 — 4상태 시각 명세 (Phase 54 신규)

> 멀티플레이어 전투 재접속 (`combatReconnectManager`) 도입에 따른 시각 피드백 SSOT.
> 코드 SSOT: `client/src/combat/ATBGaugeRenderer.ts` + `client/src/constants/battle-tokens.ts §atb`.

**4상태 정의** — 단일 row가 시점별로 가지는 상태:

| # | 상태 ID | 의미 | 시각 토큰 | i18n 라벨 |
|---|---|---|---|---|
| 1 | `charging` | 게이지 충전 중 (0~99%, 정상 연결) | fill `--accent-ether` (#89CFF0), border `--border-subtle` 1px solid | (라벨 없음) |
| 2 | `ready` | 게이지 100% 도달, 행동 가능 | fill 펄스 `--accent-ether ↔ --text-accent` (#89CFF0 ↔ #FFD700), 600ms 펄스, "READY" 라벨 금색 | `combat.atb.ready` |
| 3 | `disconnected` | 소켓 끊김, grace(30s) 내 재접속 대기 | fill `--text-muted` (#606060) 회색 톤, border 1px **dashed** `--text-muted`, 0.55 alpha, "WAIT" 라벨 보조색 | `combat.atb.waiting_reconnect` |
| 4 | `replaced` | 다른 소켓이 세션 탈취 또는 grace 만료 | fill `--accent-warn` (#FF4444) 어두운 톤 0.4 alpha, border 1px solid `--accent-warn`, 사선 패턴 오버레이, "X" 라벨 적색 | `combat.atb.session_replaced` |

**상태 전이 규칙**:

```
                 server snapshot 수신 (해당 actor 포함)
       ┌─────────────────────────────────────────────────────┐
       ▼                                                       │
  [charging] ──gauge≥100──▶ [ready]                            │
       │                       │                               │
       │  socket disconnect    │                               │
       ▼                       ▼                               │
  [disconnected] ◀────────────┘                                │
       │                                                        │
       │  reconnect (grace 내)                                  │
       └────────────────────────────────────────────────────────┘
       │  grace 만료 또는 다른 소켓 register
       ▼
  [replaced]   ───[변화 없음, 다음 전투까지 유지]
```

**모션 감소 옵션 (`prefers-reduced-motion`)**:

- `ready` 펄스: 600ms → **0ms** (정적 금색 fill로 대체)
- `disconnected` dashed border 깜빡임: 비활성, 정적 dashed
- `replaced` 사선 패턴: 정적, 진입 시 하이라이트 애니메이션 없음

**접근성 (WCAG AAA)**:

- 색상 외 형태로 구분: `disconnected`(dashed), `replaced`(사선 패턴), `ready`(라벨 텍스트)
- 색맹 4모드(Protanopia/Deuteranopia/Tritanopia/Achromatopsia)에서도 텍스트 라벨로 식별 가능
- 스크린 리더: ARIA live region에 상태 변화 알림 (`aria-live="polite"`, 메시지 = i18n 라벨)

**구현 체크포인트**:

1. `ATBGaugeRenderer.applySnapshots()`가 connection state를 받도록 시그니처 확장
2. `_drawRow()`에 4상태 분기 (위 표 시각 토큰 적용)
3. `combat:session_replaced` socket 이벤트 → renderer.markReplaced(actorId)
4. `i18n/{ko,en,ja}.json`에 3개 키 추가 (`combat.atb.ready`, `combat.atb.waiting_reconnect`, `combat.atb.session_replaced`)
5. 시각 회귀: `client/public/battle-style-guide.html`에 4상태 미리보기 추가

---

## 6. NPC 대화 UI 상세

> **핵심 포커스 영역** — CEO 지시: NPC 대화 콘텐츠 70% 도달

### 6.1 대화창 구조

```
┌────────────────────────────────────────────────────┐
│  ┌─────────┐                                       │
│  │         │  [NPC 이름]  ← --font-xl, --text-accent (금색)
│  │ 초상화   │                                       │
│  │ 100×100 │  "대화 텍스트가 타이핑 효과로           │
│  │         │   한 글자씩 나타납니다..."               │
│  └─────────┘  ← --font-md, --text-primary           │
│                                                    │
│  ┌──────────────────┐  ┌──────────────────┐        │
│  │  선택지 1          │  │  선택지 2          │      │
│  └──────────────────┘  └──────────────────┘        │
│  ┌──────────────────┐  ┌──────────────────┐        │
│  │  선택지 3          │  │  선택지 4 (비활성)  │      │
│  └──────────────────┘  └──────────────────┘        │
│                                    ▼ 계속 (Space)   │
└────────────────────────────────────────────────────┘
```

### 6.2 대화창 토큰

| 속성 | 값 | 비고 |
|------|-----|------|
| 위치 | 화면 하단 중앙 | `x: center`, `y: bottom - 16px` |
| 크기 | `800 × 200` px (기본) | 반응형 대응 (섹션 8 참조) |
| 패딩 | `16px` (전체) | `--space-4` |
| 배경색 | `#1A1A2E` | `--bg-primary`, alpha 0.92 |
| 보더 | 1px `#5A5A6A` | `--border-default` |
| 라운드 | 2px | 픽셀 정합 |
| 초상화 | `100×100` px | 좌측 배치, 2px 보더 |
| Depth | 850 | UI 오버레이 레이어 |

### 6.3 텍스트 타이핑 효과

| 속성 | 값 |
|------|-----|
| 타이핑 속도 | 30ms/글자 (기본) |
| 스킵 | Space/Enter 키 또는 클릭 → 전체 텍스트 즉시 표시 |
| 다음 대사 | 타이핑 완료 후 Space/Enter/클릭 → 다음 노드 |
| 줄바꿈 | 워드랩, 최대 3줄 |
| 자동 줄바꿈 폭 | 초상화 우측부터 패널 우측 패딩까지 (~660px) |

### 6.4 선택지 버튼

| 상태 | 배경 | 보더 | 텍스트 | 비고 |
|------|------|------|--------|------|
| 기본 | `#1A3A5A` | 1px `--accent-ether` | `--accent-ether` | 호버 가능 |
| 호버 | `#2A4A6A` (+15%) | 1px `--accent-ether` 발광 | `#FFFFFF` | 글로우 효과 |
| 비활성 | `#1A1A2A` | 1px `--border-subtle` | `--text-muted` | 조건 미충족 |
| 선택됨 | `#0A2A4A` | 2px `--accent-ether` | `--accent-ether` | 클릭 피드백 |

- **배치**: 최대 4개, 2열 그리드 (`2×2`)
- **크기**: 각 선택지 `300×36` px
- **간격**: 8px (`--space-2`)
- **비활성 힌트**: 선택지 하단에 `--font-xs`, `--text-muted`로 이유 표시

### 6.5 대화 흐름 상태

```
[대기] ──(NPC 상호작용)──> [로딩]
  │                         │
  │    ┌──(데이터 수신)──────┘
  │    ▼
  │  [타이핑 중] ──(완료/스킵)──> [완료]
  │                               │
  │    ┌──(선택지 있음)────────────┤
  │    ▼                          │
  │  [선택 대기] ──(선택)──> [타이핑 중]
  │                               │
  │    ┌──(다음 노드)─────────────┘
  │    ▼
  │  [타이핑 중] ──(isEnd=true)──> [종료] ──> [대기]
  │
  └──(액션)──> [상점/퀘스트/텔레포트]
```

### 6.6 NPC 대화 후속 액션 UI

| 액션 타입 | 트랜지션 | UI 변화 |
|----------|---------|---------|
| `quest_offer` | 대화창 → 퀘스트 수락 모달 | 금색 강조 프레임 |
| `quest_complete` | 대화창 → 보상 팝업 | 아이템 등급 연출 |
| `shop_open` | 대화창 페이드 → 상점 UI | NPC 초상화 유지 |
| `teleport` | 대화창 닫힘 → 화면 전환 | 페이드 투 블랙 |

---

## 7. 테마 & 접근성

### 7.1 테마 3종

| 테마 | 기본 배경 | 텍스트 | 액센트 | 대비비 |
|------|----------|--------|--------|--------|
| **Aeterna Dark** (기본) | `#1A1A2E` | `#E8E8E8` | `#89CFF0` | AA+ |
| **Abyss Dark** (고대비) | `#000000` | `#FFFFFF` | `#66CCFF` | AAA (21:1) |
| **Season** (시즌별) | 기본 + 틴트 | 동일 | 시즌별 교체 | AA+ |

### 7.2 시즌 액센트

| 시즌 | 프레임 강조 | 액센트 | 배경 틴트 |
|------|-----------|--------|----------|
| S1: 기억의 잔광 | `#89CFF0` | `#B0E0FF` | `#1A1A30` |
| S2: 깨어나는 봉인 | `#FF6347` | `#FF8C00` | `#2E1A1A` |
| S3: 기억의 심연 | `#BF40BF` | `#FF69B4` | `#1A1A2E` |

### 7.3 색약 모드

4가지 색약 모드 지원 (`client/src/accessibility/colorblind/colorblind_palettes.json`):

| 모드 | 대응 | 보조 표기 |
|------|------|----------|
| 없음 (기본) | 표준 팔레트 | — |
| 적색약 (Protanopia) | 적색 → 시안/주황 대체 | 패턴 오버레이 |
| 녹색약 (Deuteranopia) | 녹색 → 시안/주황 대체 | 패턴 오버레이 |
| 청색약 (Tritanopia) | 청색 → 핑크/녹색 대체 | 패턴 오버레이 |

**보조 인지 수단**: 모양(미니맵), 패턴(보더), 이모지(대미지 타입), 기호(상태표시)

### 7.4 WCAG 검증 결과 (고대비 테마)

| 토큰 | 대비비 | 등급 |
|------|--------|------|
| text-primary `#FFFFFF` | 21.0:1 | AAA |
| text-secondary `#E0E0E0` | 15.3:1 | AAA |
| text-muted `#BBBBBB` | 11.5:1 | AAA |
| text-accent `#FF6680` | 7.2:1 | AAA |
| border-focus `#00FF00` | 15.3:1 | AAA |

---

## 8. 반응형 브레이크포인트

### 8.1 UI 스케일

| 스케일 | 배율 | 조건 |
|--------|------|------|
| 축소 | 0.75x | `viewport >= 2560px` |
| 기본 | 1.0x | `1280 <= viewport < 2560` |
| 확대 | 1.25x ~ 2.0x | 접근성 설정 또는 소형 화면 |

### 8.2 레이아웃 모드

| 모드 | 조건 | 변화 |
|------|------|------|
| **Expanded** | `scale <= 0.75` 또는 `width >= 2560` | 추가 정보 패널, 넓은 채팅 |
| **Standard** | 기본 | 표준 HUD 레이아웃 |
| **Compact** | `scale >= 1.5` 또는 `width < 1280` | HUD 축소, 미니맵 숨김 |
| **Mobile** | `width < 768` | 수직 스택, 간소화 HUD |

### 8.3 대화창 반응형

| 뷰포트 | 대화창 크기 | 초상화 | 선택지 배치 |
|--------|-----------|--------|-----------|
| `>= 1280` | `800×200` | 100×100 | 2열 그리드 |
| `1024~1279` | `700×180` | 80×80 | 2열 그리드 |
| `768~1023` | `600×160` | 64×64 | 1열 스택 |
| `< 768` | `100% - 32px × 200` | 48×48 | 1열 스택 |

### 8.4 모바일 viewport 4종 SSOT (Sprint Mobile-Responsive, 2026-04-29)

> 본 절은 `client/src/config/mobile-viewport.ts` (3차 토픽 확장) 와 `client/src/styles/design-system-mobile.css` (CSS 미러) 의 1차 SSOT. 너비/safe area inset/폰트 스케일 변경 시 위에서 아래로만 (DESIGN.md → mobile-viewport.ts → design-system-mobile.css 순).

| ID | 너비 | 높이 | 카테고리 | 폰트 스케일 | safe top/bottom | 대표 디바이스 |
|----|------|------|----------|------------|-----------------|--------------|
| `sm-360` | 360px | 800px | compact  | 0.78x | 24 / 16 | Galaxy S 시리즈, 갤폴드 외부 |
| `sm-375` | 375px | 812px | compact  | 0.82x | 44 / 34 | iPhone X / 11 Pro / 12·13 mini |
| `md-414` | 414px | 896px | standard | 0.88x | 44 / 34 | iPhone XR / 11 / Plus, 다수 안드로이드 |
| `md-430` | 430px | 932px | standard | 0.92x | 47 / 34 | iPhone 14·15·16 Pro Max, 최신 대형 |

#### 약속 4지표 (스프린트 토픽)

| # | 지표 | 측정 방식 |
|---|------|----------|
| 1 | 4종 viewport 핵심 시나리오 100% 동작 | `npm run qa:mobile -- --vp=all` (이동/대화/전투/세이브) |
| 2 | 터치 인식 지연 ≤ 100ms | `touch-action: manipulation` + Performance API |
| 3 | safe area·노치 회피 | `env(safe-area-inset-*)` 폴백 + Phaser 캔버스 inset 패딩 |
| 4 | 텍스트 가독성 ≥ 14px | `--font-min-legible: 14px`, `.text-xs/.text-sm` 자동 승격 |

#### 카테고리별 HUD 변형

| 카테고리 | viewport | 변형 |
|----------|----------|------|
| **compact** | sm-360, sm-375 | 미니맵 숨김, 게이지 1열 스택, 선택지 1열 |
| **standard** | md-414, md-430 | 미니맵 0.7x~0.8x 축소, 선택지 (md-430만) 2열 |

#### 터치 입력 매핑 SSOT

| 입력 | 매핑 | 임계값 | CSS 클래스 |
|------|------|--------|-----------|
| 탭 | 클릭 | 거리 < 8px AND 시간 < 500ms | `.touch-tappable` |
| 드래그 | 이동 | 거리 ≥ 8px (`--drag-threshold-px`) | `.touch-draggable` |
| 롱프레스 | 컨텍스트 메뉴 | 시간 ≥ 500ms (`--longpress-threshold-ms`) | `.touch-longpressable` |

#### 봉인 항목 (이소화 비협상)

- 4종 viewport 너비 수치 (360 / 375 / 414 / 430)
- safe area inset 4 viewport × 4 방향 = 16 값
- 폰트 스케일 4 값 (0.78 / 0.82 / 0.88 / 0.92)
- 터치 입력 3 임계값 (8px / 500ms / 100ms)

> 변경 절차: 본 §8.4 갱신 → `mobile-viewport.ts` MOBILE_VIEWPORTS 상수 갱신 → `design-system-mobile.css` `:root` CSS 변수 갱신 → 시각 회귀 (`style-guide.html` 모바일 모드 + `qa:mobile` 실행) 검증.

---

## 9. 구현 가이드

### 9.1 디자인 토큰 파일 위치

```
client/src/
├── config/
│   └── design-tokens.ts          ✅ 구현 완료 (2026-04-14)
├── accessibility/
│   ├── colorblind/
│   │   └── colorblind_palettes.json
│   └── display/
│       ├── high_contrast_palette.json
│       └── HighContrastTheme.ts
└── ui/
    ├── DialogueBox.ts            ← NPC 대화 (기존)
    ├── DialogueUI.ts             ← NPC 대화 API 연동 (기존)
    └── ...                        ← 18개 UI 컴포넌트
```

### 9.2 토큰 통합 방향

현재 디자인 토큰이 3곳에 분산됨:
1. `style-guide.md` (문서)
2. `ui-skin-design.md` (문서)
3. `high_contrast_palette.json` (JSON)

**통합 계획**:
- `client/src/config/design-tokens.ts`에 단일 소스 오브 트루스 생성
- 모든 UI 컴포넌트가 이 토큰 파일을 import하도록 통일
- 테마 전환 시 토큰만 교체하면 전체 UI 반영

### 9.3 우선순위 (CEO 스코프 기준)

| 순위 | 작업 | 담당 | 상태 |
|------|------|------|------|
| P0 | `design-tokens.ts` 생성 | 가춘운 (CMO) | ✅ 완료 |
| P0 | NPC 대화 UI 토큰 적용 | 계섬월 | 대기 (토큰 준비됨) |
| P0 | `index.html` CSS 변수 + 로딩 화면 강화 | 가춘운 | ✅ 완료 |
| P0 | 어드민 대시보드 Tailwind 설정 + 스타일시트 | 가춘운 | ✅ 완료 |
| P1 | NPC 대화 콘텐츠 70% 채우기 | 진채봉 (콘텐츠) | 대기 |
| P1 | HUD 통합 — 토큰 기반 리팩토링 | 계섬월 | 대기 (토큰 준비됨) |
| P2 | 테마 전환 기능 | 계섬월 | 대기 |
| P2 | 반응형 대화창 | 계섬월 | 대기 |

### 9.4 디자인 QA 체크리스트

- [ ] 모든 색상이 토큰 변수 사용 (하드코딩 금지)
- [ ] NPC 이름 금색(`--text-accent`) 통일
- [ ] 대화창 하단 고정, 게임 화면 가리지 않음
- [ ] 타이핑 효과 30ms/글자, 스킵 동작 확인
- [ ] 선택지 4개 이하, 비활성 상태 힌트 표시
- [ ] 고대비 테마에서 대비비 7:1 이상
- [ ] 색약 모드에서 선택지 구분 가능
- [ ] 1280px 이하에서 대화창 정상 축소
- [ ] 768px 이하에서 선택지 1열 스택

---

## 10. Monster Tier Tokens — 몬스터 아트 파이프라인 SSOT

> 신설: 2026-04-27 (가춘운, Build 단계)
> 출처: `docs/release/design-system_monster-art-pipeline.md`,
>       `docs/release/assets_monster-art-pipeline.md`
> 구현: `client/src/styles/monster-tier.css`,
>       `client/src/design_tokens/monster_tier.ts`

### 10.1 Tier 5축

| 축 | NORMAL | ELITE | BOSS |
|----|--------|-------|------|
| **사이즈** | 32×32 | 48×48 | 64×64 (비대칭 96px 한계) |
| **외곽선** | 2px black | 2px black + 1px gold | 2px black + 그라디언트 (#89CFF0→#FFD700) |
| **림라이트** | 없음 | 1px 골드 top-left | 2px 에테르블루 풀 실루엣 |
| **호흡 진폭** | ±1px / 4f / 6fps | ±2px / 6f / 8fps | ±3px / 8f / 10fps |
| **입자** | 0개 | 2~3 골드 ambient | 5~8 블루 + 화면 ambient |
| **인트로** | 0ms | 800ms (HP바 페이드) | 3,000ms (6단계 컷씬) |
| **팔레트** | 16색 | 24색 (16+골드4+그림자4) | 32색 (16+블루8+페이즈2 진홍8) |

### 10.2 발광 토큰 (CSS Variables)

```css
--monster-glow-normal:        transparent;
--monster-glow-elite:         #FFD700;   /* 골드 — 귀함 */
--monster-glow-boss:          #89CFF0;   /* 에테르블루 — 위협 */
--monster-glow-boss-phase2:   #FF4444;   /* 진홍 — 분노 (HP ≤ 50%) */
```

### 10.3 헬퍼 클래스

```html
<div class="monster monster--elite">…</div>
<div class="monster monster--boss"  data-phase="2">…</div>
```

`monster-tier.css` 가 호흡·림라이트·외곽선·반응형을 모두 처리. 페이즈 2 는
`data-phase="2"` 속성만 부여하면 진홍 펄스로 자동 전환.

### 10.4 라이선스 안전 게이트 (5단계)

1. AI 생성 (Firefly 1순위, SDXL+LoRA 2순위) — seed/모델버전 기록
2. 팔레트 양자화 — Tier별 16/24/32색 강제
3. 외곽선 2px 수동 재작업 — 인간의 손맛
4. 실루엣 분류기 ≥ 90% (5종 카테고리)
5. **픽셀 차이율 ≥ 60%** (라이선스 방패)

→ 통과 시에만 `art/monster/<region>/<id>.aseprite` 등록 + `LICENSE.csv` append.

### 10.5 색맹 4모드 호환 — 형태 단서 우선

위계 정보를 *색* 이 아닌 *외곽 두께·림라이트 위치·실루엣 형상* 으로 전달.
색맹 사용자는 색 자체가 약화되어도 형태로 즉시 식별 가능. 완전 색맹
(`achromatopsia`) 모드에서는 외곽 `outline-style: double` 로 자동 강조.

### 10.6 비주얼 QA 페이지

`/monster-style-guide.html` — 모든 토큰을 라이브 데모로 검증. 보스 인트로
3,000ms 컷씬도 버튼 한 번이면 재생됩니다~

---

## 11. Sound Design Tokens — BGM·SFX 사운드 시스템 SSOT

> 작성: 가춘운 (CMO/디자인) · 2026-04-27 · 스프린트 "에테르나 크로니클 BGM·SFX 사운드 시스템 통합"
> 사운드는 보이지 않지만, 디자인 토큰으로 *들리는 위계*를 통제할 수 있어요~ 🎵
> **본 절이 1차 SSOT** — 계섬월 `src/audio/sound-tokens.ts` 인계용

### 11.1 사운드 디자인 7원칙

| 원칙 | 설명 | 실천 |
|------|------|------|
| **시각-청각 정합** | 보이는 것과 들리는 것이 같은 톤 | 다크판타지 = 저음 리버브 + 발광 액센트 음 |
| **위계는 음량 + 음색** | 중요할수록 크고 깊게 | BGM −18 LUFS / 핵심 SFX −12 / UI −20 |
| **3-Layer 분리** | BGM·SFX·UI는 별도 버스 | Master → {bgm, sfx, ui, voice} 4채널 |
| **크로스페이드 일관성** | 모든 BGM 전환은 동일 곡선 | `equalPower`, 1500ms 기본 |
| **인터랙션 응답 ≤ 50ms** | UI 사운드는 시각 피드백과 동기 | 탭/호버 SFX 사전 디코드 |
| **라이선스 SSOT** | CC0/CC-BY만 채택 | `licenses/sounds/` 메타 + 게이트 |
| **저자극 토글** | 발작·청각 민감자 보호 | `prefers-reduced-sound` 미디어 쿼리 대응 |

### 11.2 음량 토큰 (LUFS·dBFS)

```ts
// design-tokens/audio.ts
export const AUDIO_LEVELS = {
  master:        { lufs: -14, peak: -1.0 },   // 출력 최종
  bgm: {
    field:       { lufs: -20, peak: -3.0 },   // 필드/마을 (배경)
    boss:        { lufs: -16, peak: -2.0 },   // 보스 (전경)
    event:       { lufs: -18, peak: -2.5 },   // 컷씬
    silence:     { lufs: -60, peak: -50.0 },  // 정적/페이드아웃
  },
  sfx: {
    skill_cast:  { lufs: -14, peak: -1.5 },   // 스킬 발동 (강)
    skill_hit:   { lufs: -12, peak: -1.0 },   // 타격 (최강)
    crit:        { lufs: -10, peak: -0.5 },   // 크리티컬 (피크)
    dodge:       { lufs: -18, peak: -3.0 },   // 회피 (약)
    ambient:     { lufs: -28, peak: -10.0 },  // 환경음 (BG)
  },
  ui: {
    hover:       { lufs: -24, peak: -6.0 },   // 호버 (가장 약)
    click:       { lufs: -20, peak: -4.0 },   // 클릭
    item_get:    { lufs: -16, peak: -2.0 },   // 아이템 획득
    levelup:     { lufs: -12, peak: -1.0 },   // 레벨업 (강조)
    error:       { lufs: -16, peak: -2.5 },   // 에러 (경고)
  },
} as const;
```

**위계 시각화 (음압 사다리)**:

```
┌──────────────────────────────────────────────┐
│ -10 ████████████ crit             (피크)     │
│ -12 ███████████  skill_hit · levelup         │
│ -14 ██████████   skill_cast · master         │
│ -16 █████████    boss · item_get · error     │
│ -18 ████████     event · dodge               │
│ -20 ███████      field · click               │
│ -24 █████        hover                       │
│ -28 ███          ambient                     │
└──────────────────────────────────────────────┘
```

### 11.3 씬 BGM 매핑 매트릭스 (10지역 × 5상태)

| 지역 | 평시(필드) | 마을 | 전투 | 보스 | 이벤트 |
|------|-----------|------|------|------|--------|
| 🌑 에레보스 | `bgm_erebos_field` | `bgm_erebos_ruin` | `bgm_battle_ch1` | `bgm_boss_oblivion` | `bgm_event_memory` |
| 🌳 실반헤임 | `bgm_sylvan_field` | `bgm_sylvan_village` | `bgm_battle_ch2` | `bgm_boss_warden` | `bgm_event_oath` |
| 🏜️ 솔라리스 | `bgm_solaris_dune` | `bgm_solaris_oasis` | `bgm_battle_ch3` | `bgm_boss_pyre` | `bgm_event_sandsong` |
| 🏰 아르겐티움 | `bgm_argentum_street` | `bgm_argentum_palace` | `bgm_battle_ch4` | `bgm_boss_emperor` | `bgm_event_throne` |
| 🏔️ 영원빙원 | `bgm_glacier_field` | `bgm_glacier_camp` | `bgm_battle_ch4b` | `bgm_boss_frostking` | `bgm_event_aurora` |
| ⚓ 브리탈리아 | `bgm_brital_harbor` | `bgm_brital_tavern` | `bgm_battle_pirate` | `bgm_boss_kraken` | `bgm_event_sail` |
| 💀 망각의 고원 | `bgm_oblivion_plain` | — | `bgm_battle_ch5` | `bgm_boss_final` | `bgm_event_ending` |
| 🌊 무한 안개해 | `bgm_mist_sea` | — | `bgm_battle_ch6` | `bgm_boss_seal` | `bgm_event_revelation` |
| 🌀 기억의 심연 | `bgm_abyss_field` | — | `bgm_battle_ch7` | `bgm_boss_abyss` | `bgm_event_descent` |
| ⏳ 시간의 균열 | `bgm_rift_field` | — | `bgm_battle_ch8` | `bgm_boss_chronos` | `bgm_event_paradox` |

**커버리지**: 10지역 × 5상태 = **50 슬롯** 중 6 슬롯 N/A(무인지역 마을 없음) → **44 BGM 트랙 필수** · 100% 매핑 완료시 KPI 달성.

### 11.4 SFX 인덱스 — 6클래스 × 30스킬 + 공용

```
SFX_SKILL = {
  ether_knight: ['slash_light','slash_heavy','guard','dash','ult'],   // 5/30
  memory_mage:  ['cast_spark','cast_beam','cast_aoe','recall','ult'],
  shadow_weaver:['blink','poison_dart','smoke','assassin','ult'],
  memory_breaker:['crush','shockwave','debuff','frenzy','ult'],
  time_guardian:['rewind','slow','barrier','heal_wave','ult'],
  void_wanderer:['phase','blend','rift_strike','flux','ult'],
}
SFX_COMBAT = ['hit_normal','hit_crit','hit_block','hit_miss','dodge','ko','revive','aggro']
SFX_UI     = ['menu_open','menu_close','tab','hover','click','confirm','cancel','error',
              'item_get','item_equip','levelup','quest_clear','save','autosave']
```

**총 SFX 슬롯**: 6×5 + 8 + 14 = **52 SFX** · 핵심 이벤트(전투 8 + UI 14) **22슬롯 100% 커버**가 KPI 합격선.

### 11.5 사운드 ↔ 비주얼 동기 토큰

| 인터랙션 | 시각 피드백 | 사운드 토큰 | 동기 윈도우 |
|---------|------------|------------|------------|
| 메뉴 호버 | `outline-glow 100ms` | `ui_hover` | ≤ 50ms |
| 메뉴 클릭 | `scale 0.96 80ms` | `ui_click` | ≤ 30ms |
| 아이템 획득 | `pop + sparkle 600ms` | `ui_item_get` | 0ms (동시) |
| 레벨업 | `flash + radial 1200ms` | `ui_levelup` | 0ms |
| 크리티컬 히트 | `screen-shake 200ms + 적색 비네트` | `sfx_crit` | 0ms (트리플 동기) |
| 회피 성공 | `motion-blur 150ms` | `sfx_dodge` | 0ms |
| 보스 등장 | `letterbox 1000ms + 줌인` | `bgm_boss_*` (페이드인 1500ms) | −500ms (선행) |
| 씬 전환 | `fade-to-black 800ms` | BGM 크로스페이드 1500ms | 동시 시작 |

### 11.6 라이선스 안전성 매트릭스

| 라이선스 | 채택 | 표기 의무 | 비고 |
|---------|------|----------|------|
| **CC0 1.0** | ✅ | 권장 (선택) | 1순위 — Freesound CC0, OpenGameArt CC0 |
| **CC-BY 4.0** | ✅ | **필수** | 2순위 — `CREDITS.md` + 인게임 크레딧 양쪽 |
| **CC-BY-SA** | ⚠️ | 필수 | 3순위 — 수정본도 SA 전파 검토 |
| **CC-BY-NC** | ❌ | — | 상업 출시 차단 |
| **GPL/Royalty-Free 한정** | ❌ | — | 게임 라이선스와 충돌 |
| **출처 불명** | ❌ | — | 게이트 BLOCK |

**메타 스키마** (`licenses/sounds/<file>.json`):

```json
{
  "file": "bgm_erebos_field.ogg",
  "license": "CC0",
  "source_url": "https://freesound.org/...",
  "author": "anonymous",
  "verified_at": "2026-04-27",
  "verifier": "이소화"
}
```

→ 이소화 라이선스 게이트가 `license ∈ {CC0, CC-BY-4.0, CC-BY-SA-4.0}` 외이면 BLOCK · 메타 누락도 BLOCK · KPI **위험 0건** 직결.

### 11.7 접근성 — 청각 보조 토큰

```css
/* 청각 민감자 */
@media (prefers-reduced-sound) {
  --audio-master-gain: 0.3;
  --audio-bgm-gain:    0.0;   /* BGM 음소거 */
  --audio-crit-gain:   0.5;   /* 피크 컷 */
}
/* 청각 장애 보완 — 시각 대체 */
[data-sound-cue="crit"]   { animation: red-flash 200ms; }
[data-sound-cue="levelup"]{ animation: gold-radial 1200ms; }
[data-sound-cue="error"]  { animation: shake-x 300ms; }
```

자막(`subtitle`) 슬롯 6종: `[BGM]`, `[전투음]`, `[환경음]`, `[발걸음]`, `[NPC 음성]`, `[효과음]` — 진채봉 i18n 키 인계.

### 11.8 Phaser 구현 스니펫 (계섬월 인계)

```ts
// src/audio/AudioBus.ts (skeleton)
import { AUDIO_LEVELS } from '@/design-tokens/audio';

export class AudioBus {
  private buses = { bgm: 0, sfx: 0, ui: 0, voice: 0 };
  
  playBGM(key: string, fadeMs = 1500) {
    const target = AUDIO_LEVELS.bgm[this.classify(key)].lufs;
    this.scene.sound.play(key, { volume: this.lufsToGain(target), loop: true });
    this.crossfade(this.current, key, fadeMs);     // equalPower
  }
  
  playSFX(key: string, layer: 'sfx' | 'ui' = 'sfx') {
    const token = AUDIO_LEVELS[layer][this.classify(key)];
    this.scene.sound.play(key, { volume: this.lufsToGain(token.lufs) });
  }
  
  // prefers-reduced-sound 자동 감지
  applyAccessibility() { /* matchMedia 반영 */ }
}
```

### 11.9 비주얼 QA 페이지

`/sound-style-guide.html` (신설 예정) — 44 BGM × 52 SFX 라이브 프리뷰 · LUFS 미터 · 라이선스 배지 · 접근성 토글 한 화면 검증.

### 11.10 UI 컴포넌트 — `audio-controls.css` (Build 산출물, 2026-04-27)

> 본 절이 **CSS SSOT** — `client/src/styles/audio-controls.css` 와 1:1 매칭.
> §11.5(사운드↔비주얼 동기 토큰) 실구현 + §11.7(접근성 청각 보조) 시각 캡션.

**채널 색 매핑 (4채널)**:

| 채널 | CSS 토큰 | 컬러 | 의미 |
|------|----------|------|------|
| Master | `--audio-ch-master` | `#FFD700` | 전체 출력 |
| BGM    | `--audio-ch-bgm`    | `#89CFF0` | ether 청광 — 배경/공간 |
| SFX    | `--audio-ch-sfx`    | `#F39C12` | legendary 황염 — 타격/임팩트 |
| UI     | `--audio-ch-ui`     | `#FFD700` | gold 강조 — 인터랙션 |
| Mute   | `--audio-mute`      | `#FF4444` | danger 적색 빗금 |

**제공 컴포넌트**:

1. `.ae-audio-panel` — 사운드 설정 패널 (SettingsManager 모달 [사운드] 탭 진입점)
2. `.ae-audio-channel[data-channel="..."]` — 4채널 분리 슬라이더+음소거 토글 (border-left 3px 채널색)
3. `.ae-audio-license[data-tier="cc0|ccby|open|risk"]` — §11.6 라이선스 4계 시각 배지
4. `.ae-audio-cue-{crit|dodge|levelup|item}` — 핵심 이벤트 SFX 시각 동기 (220–1400ms)
5. `.ae-audio-bgm-fade[data-phase="out"]` — 씬 전환 BGM 크로스페이드 마스크 (1200ms equalPower 동기)
6. `.ae-audio-visualizer` — 메뉴 화면 BGM 5-bar 라이브 인디케이터

**접근성 약속 (§11.7 연동)**:

- `body[data-audio-captions="on"]` 토글 시 → 크리티컬 펄스에 4px 황염 보더, 닷지 스윕 60% 농도, 레벨업에 "LEVEL UP!" 텍스트 자동 표기
- `prefers-reduced-motion: reduce` → 모든 큐 애니메이션 1ms 단축, BGM 페이드 transition 제거
- 슬라이더 `:focus-visible` → 4px 골드 outline 강조 (키보드 단독 조작 보장)

**Build 인계 체크 (계섬월)**:

- [ ] `SettingsManager.ts` → `.ae-audio-panel` 마크업 렌더 + 슬라이더 입력 → `SoundManager.setVolume(channel, vol)` 바인딩
- [ ] `combatSfxRouter.ts` → 크리티컬 발생 시 `.ae-audio-cue-crit` DOM 삽입 후 `animationend` 제거
- [ ] `sceneBgmRouter.ts` → 씬 전환 시 `.ae-audio-bgm-fade[data-phase="out"]` 토글 + `equalPower` 1200ms 동기
- [ ] `licenseRegistry.ts` → 라이선스 메타에 `tier: "cc0"|"ccby"|"open"|"risk"` 필드 추가 → 디버그 오버레이에 `.ae-audio-license` 표시

---

> **다음 단계**:
> - **계섬월** → `src/audio/AudioBus.ts` + `src/design-tokens/audio.ts` 구현 (§11.2/§11.8 스니펫 기반)
> - **진채봉** → 자막 i18n 키 6종(`[BGM]`/`[전투음]`/...) 등록 + `licenses/sounds/*.json` 메타 작성
> - **이소화** → 라이선스 게이트 `scripts/sound-license-gate.ts` (§11.6 매트릭스 정규식 6종)
> - **심요연** → 44 BGM × 52 SFX 매핑 누락 분석기 (§11.3·§11.4 SSOT 대조)
> - **백능파** → §11.7 접근성 토글 launch_checklist 등재 (§2.18 옆 §2.19 `사운드 게이트`)
>
> 어머~! 이제 우리 게임에 *목소리*가 생겨요~! 🎵✨💖

---

## 12. 전투 피드백 — 데미지·상태이상 표시 SSOT

> 신설: 2026-06-20 (가춘운, Plan 단계)
> 스프린트: 전투 피드백 UX 개선 — 데미지·상태이상 표시 가독성
> 진단: 두련사 5병근 · PRD: `docs/release/prd_battle-feedback-readability.md` (정경패) · 스코프: 백능파 **HOLD(부채 청산)**
> **본 절이 1차 SSOT** — `client/src/constants/battle-tokens.ts §damage·§DAMAGE_POPUP_SIZE` + `client/src/styles/design-system-battle.css §4` 가 본 절을 미러(단방향).
> 핵심 약속: **신규 색·폰트 0개**. 이미 정의된 토큰을 정본화하고, 렌더 경로가 그것을 *따르도록* 명세한다.

### 12.0 문제 — 다섯 매듭 (As-Is, 코드 증거)

토큰은 멀쩡한데 *렌더 경로가 토큰을 배신*하고 있어요. 코드 라인까지 짚은 진단이에요~ 🔍

| # | 병근 | 코드 증거 | 심각도 |
|---|------|-----------|--------|
| ① | **SSOT 이중화 + 토큰 미사용** | `StatusEffectRenderer.ts` 자체 `EFFECT_VISUALS` 색표 보유(L45) — `battle-tokens.ts` import 0. `_spawnDamageNumber`(BattleScene L3220) critical **30px**(토큰은 32) · normal **22px**(토큰은 16) 하드코딩 | P0 |
| ② | **색-단독 표기** | `EFFECT_VISUALS` 색만으로 효과 구분 · DoT 팝업 색만(`showDotDamage` L285) · 데미지 팝업 형태/기호 단서 부재 | P0 |
| ③ | **약점/저항/면역 부재** | `_spawnDamageNumber` 타입 `'normal'|'critical'|'heal'` **3종뿐** — 토큰엔 `weak/resist/immune` 색·폰트 다 있는데 *렌더 진입점이 없음* | P0 |
| ④ | **정보 과밀** | 아이콘 20px 위에 라벨 **8px**(L223)·스택 **8px**(L233)·지속바 3중 중첩 → 판독 불가 | P1 |
| ⑤ | **동시 충돌 · 모션 비가드** | DoT 위치 `Math.random()`(L288) 흩뿌림 → 다발 시 겹침 · Phaser tween `prefers-reduced-motion` 미감지(CSS만 가드) | P1 |

> **14px 봉인 위반 현황**: `StatusEffectRenderer` 8/8/12px · `BattleUI` 8/9px · `_spawnDamageNumber` critical 30(≠32). 모바일 §8.4 `--font-min-legible:14px` 약속과 정면 충돌.

### 12.1 전투 피드백 5원칙

| 원칙 | 설명 | 실천 |
|------|------|------|
| **단일 SSOT** | 색·폰트는 본 절 → `battle-tokens.ts` 단방향 미러만 | 렌더러는 `BATTLE_COLORS.damage`·`DAMAGE_POPUP_SIZE` import, 하드코딩 0 |
| **색약 병행 표기** | 색 + (형태 ∨ 기호 ∨ 텍스트) 항상 2중 이상 | 완전 색맹(achromatopsia)도 기호·크기로 식별 |
| **14px 봉인** | 모든 전투 텍스트 ≥ 14px | 8px·9px·12px 전면 승격 (§12.4) |
| **정보 위계** | 중요할수록 크고 강하게 | 4단 타이포 사다리 14 / 18 / 22 / 32 (§12.2) |
| **충돌·모션 가드** | 동시 다발에도 안 겹치고, 저자극 옵션 존중 | 결정론적 스택 레인 + `prefers-reduced-motion` 런타임 감지 (§12.5) |

### 12.2 데미지 팝업 — 7종 통합 토큰 (컬러 × 타이포 × 형태)

> 색 = `battle-tokens.ts BATTLE_COLORS.damage` · 폰트 = `DAMAGE_POPUP_SIZE` · CSS = `design-system-battle.css §4 .ac-dmg--*`.
> **변경 2건**: ⓐ `normal` 16→**18**(위계 명확화 — combo 18/echo 16 대비 기본 데미지가 역전돼 있던 것 시정) ⓑ critical 렌더값 30→**32**(토큰 정합).

| 타입 | 색 토큰 | Hex | 폰트(px) | 색약 병행(형태·기호) | 텍스트 예 | 모션 |
|------|---------|-----|----------|----------------------|-----------|------|
| `normal` | `--ac-dmg-normal` | `#FFFFFF` | **18** | 숫자 단독 (기준) | `1234` | float 0.9s |
| `critical` | `--ac-dmg-critical` | `#FFD700` | **32** | `✦` 접두 + 외곽 글로우 + 쉐이크 150ms | `✦1234!` | crit 0.9s |
| `heal` | `--ac-dmg-heal` | `#2ECC71` | 18 | `+` 접두 (회복 부호) | `+456` | float 0.9s |
| `miss` | `--ac-dmg-miss` | `#A0A0A0` | 14 | *italic* + 전용 글리프 | `MISS` | float 0.9s |
| `weak` | `--ac-dmg-weak` | `#FF6B35` | 22 | `▲` 접두(상향 삼각) + 라벨 | `▲1234 약점` | float + 가중 |
| `resist` | `--ac-dmg-resist` | `#3498DB` | 14 | `▽` 접두(하향 삼각) + 라벨 | `▽789 저항` | float 0.9s |
| `immune` | `--ac-dmg-immune` | `#9B59B6` | 14 | `⊘` 접두(금지) + 라벨 | `⊘ 무효` | float 0.9s |

**타이포 4단 사다리** (전투 피드백 전용 위계):

```
┌──────────────────────────────────────────────┐
│ 32px ████████████  critical          (최대)  │
│ 22px ████████      weak (약점!)       (강조)  │
│ 18px ██████        normal · heal      (기본)  │
│ 14px ████          miss·resist·immune·DoT·스택 (부가/봉인 하한) │
└──────────────────────────────────────────────┘
```

> DoT(지속 피해) 팝업도 본 사다리의 **14px 부가단**에 안착(현 12px → 14). 색은 효과 카테고리 색(§12.3) 사용, 음수=heal 녹색 `+N`.

### 12.3 상태이상 표시 — 카테고리 5계 + 아이콘 트레이 (레이아웃)

> 카테고리 색 = `shared/types/scenarioRegistry` SSOT `uiColor` (이미 `statusEffectCategory.ts` 가 wiring). 색약 대응은 *테두리 형태*로 2중화.

#### 12.3.1 카테고리 5계 — 색 × 형태 단서

| 카테고리 | 의미 | 테두리 색(SSOT uiColor) | 테두리 형태(색약 단서) | 효과 예 |
|----------|------|------------------------|------------------------|---------|
| `buff` | 강화 | 녹/금 계열 | 2px **solid** + 상단 글로우 | attack_up, haste, regen, shield |
| `debuff` | 약화 | 보라 계열 | 2px **solid** | slow, blind, curse |
| `control` | 행동 제어 | 적/주황 계열 | 2px **dashed** (점선) | stun, silence, freeze, charm |
| `dot` | 지속 피해 | 진홍 계열 | 2px **double** (이중선) | poison, burn, bleed |
| `special` | 특수 | 청 계열 | 2px solid + **사선 패턴** | (시나리오 정의) |

> 형태 단서(solid/dashed/double/사선)는 §5.4 ATB 4상태 패턴과 **일관** — 색맹 사용자가 색 없이 테두리 형태만으로 buff↔control↔dot 구분.

#### 12.3.2 아이콘 트레이 레이아웃 (④ 정보 과밀 해소)

```
        ┌──┐ ┌──┐ ┌──┐ ┌──┐  ← 아이콘 22px, 카테고리 색 테두리
        │🜂│ │❄ │ │☠ │ │+N│     · 최대 4개 + 초과 시 "+N" 칩
        └──┘ └──┘ └─×3 └──┘     · 스택은 우하단 배지 14px (어두운 펠릿 위)
        ▔▔▔▔ ▔▔▔▔ ▔▔▔▔          ← 지속바 3px (아이콘 폭, 카테고리 색)
              [캐릭터]            ← 트레이는 머리 위 1줄, 중앙 정렬, offsetY -60
```

| 요소 | 규격 | 변경 | 근거 |
|------|------|------|------|
| 아이콘 | 22×22px (20→22) | 형태 단서 강화 | 픽셀 아이콘이 1차 식별자 |
| 상시 텍스트 라벨 | **제거**(8px 폐기) | ④ 해소 | 아이콘+테두리가 이미 2중 단서. 라벨은 포커스/호버 툴팁(14px)으로 이전 |
| 스택 배지 `×N` | 14px, 우하단, `#1A1A2E` 80% 펠릿 + 흰 텍스트 | 8→14 승격 | 봉인 준수 |
| 지속바 | 3px, 아이콘 폭, 카테고리 색 0.8α | 유지 | — |
| 초과 칩 | `+N` 14px, 5번째부터 | 신규 | 4개 초과 과밀 방지 |
| 트레이 정렬 | 중앙, 아이콘 간격 4px | 유지 | — |

### 12.4 14px 가독성 봉인 (As-Is → To-Be)

| 위치 | 현재 | 목표 | 비고 |
|------|------|------|------|
| `StatusEffectRenderer` 라벨 | 8px | (제거 → 툴팁 14px) | §12.3.2 |
| `StatusEffectRenderer` 스택 | 8px | **14px** | 배지 펠릿 |
| `StatusEffectRenderer` DoT | 12px | **14px** | §12.2 부가단 |
| `BattleScene` normal | 22px | **18px** | 위계 정합 |
| `BattleScene` critical | 30px | **32px** | 토큰 정합 |
| `BattleUI` 로그/스탯 | 8·9px | **14px** | 전수 승격 |

> **봉인 수치(이소화 비협상)**: 전투 텍스트 최소 **14px** · 4단 사다리 `14 / 18 / 22 / 32` · 7 데미지 타입 색은 `BATTLE_COLORS.damage` 7값 고정.

### 12.5 동시 충돌 & 모션 가드 (레이아웃 · 타이밍)

**⑤-a 결정론적 스택 레인** (`Math.random()` 폐기):

| 항목 | 규칙 |
|------|------|
| 동일 타깃 다발 | Y 계단식 stagger: n번째 팝업 = `baseY - n×20px` |
| 동시 프레임 큐 | 발생 간 최소 **80ms** 간격으로 순차 spawn |
| DoT X 오프셋 | `effectId` 해시 기반 고정 오프셋(랜덤 X 제거 → 같은 독은 같은 자리) |
| 좌우 분리 | 아군 데미지 좌측 바이어스, 적 우측 바이어스(겹침 최소) |

**⑤-b 모션 가드** (`prefers-reduced-motion` — Phaser 런타임도 감지):

| 모션 | 기본 | reduced |
|------|------|---------|
| 팝업 float/상승 | 0.9s, -40px | 0.15s, -8px (즉시 페이드) |
| critical 쉐이크 | 150ms | **skip** |
| critical 글로우 펄스 | infinite | 정적 1회 |
| 상태 오버레이 깜빡임 | 200ms blink | 정적 alpha |

> CSS `@media (prefers-reduced-motion)` 는 §4에 이미 있음. **추가 필요**: Phaser 렌더러가 `window.matchMedia('(prefers-reduced-motion: reduce)')` 를 읽어 tween duration·shake 분기. `battle-tokens.ts` 에 `REDUCED_MOTION` 타이밍 세트 추가 권고.

### 12.6 색약 4모드 병행 표기 매트릭스

> 색 자체가 약화돼도 *형태·기호·텍스트* 로 식별 보장 (WCAG AAA, §7.3 4모드 연동).

| 신호 | 색(1차) | 형태(2차) | 기호/텍스트(3차) | 완전색맹 식별 |
|------|---------|-----------|------------------|---------------|
| 약점 | 주황 #FF6B35 | 큰 폰트 22 | `▲` + "약점" | ✅ 기호+텍스트 |
| 저항 | 청 #3498DB | 작은 14 | `▽` + "저항" | ✅ |
| 무효 | 보라 #9B59B6 | 작은 14 | `⊘` + "무효" | ✅ |
| 크리티컬 | 금 #FFD700 | 최대 32 + 글로우 | `✦` + "!" | ✅ 크기+기호 |
| 회복 | 녹 #2ECC71 | 18 | `+` 부호 | ✅ |
| 상태 buff/debuff/control/dot | uiColor | solid/solid/dashed/double | 아이콘 글리프 | ✅ 테두리형태+아이콘 |

### 12.7 SSOT 미러 변경 절차 & 구현 체크포인트 (계섬월 인계)

**변경 절차** (위→아래 단방향):

1. 본 §12 (1차 SSOT) — ✅ 본 문서
2. `client/src/constants/battle-tokens.ts` — `DAMAGE_POPUP_SIZE.normal` 16→18, `REDUCED_MOTION` 세트 추가
3. `client/src/styles/design-system-battle.css §4` — `.ac-dmg--normal` 16→18 미러
4. 렌더 경로 토큰 wiring (아래 체크포인트)
5. 시각 회귀 `client/public/battle-style-guide.html` 7종 팝업 + 5카테고리 트레이 미리보기

**구현 체크포인트**:

- [ ] `StatusEffectRenderer` → `EFFECT_VISUALS` 색을 `BATTLE_COLORS`/카테고리 SSOT 로 대체, `import` 추가
- [ ] `StatusEffectRenderer` 라벨 8px 제거 + 스택 8→14 + DoT 12→14
- [ ] `_spawnDamageNumber` 타입에 `'weak'|'resist'|'immune'` 3종 **추가** + `DAMAGE_POPUP_SIZE` import (하드코딩 제거)
- [ ] 7종 전부 색약 접두 기호(`✦▲▽⊘+`) + 라벨 적용
- [ ] `Math.random()` 위치 → 결정론적 스택 레인 (§12.5-a)
- [ ] Phaser `matchMedia` reduced-motion 분기 (§12.5-b)
- [ ] `BattleUI` 8·9px → 14px 전수 승격

### 12.8 비주얼 QA

`/battle-style-guide.html` 확장 — 데미지 7종 팝업(색약 시뮬 4모드 토글) · 상태이상 5카테고리 트레이(스택/지속바/초과칩) · reduced-motion 토글 · 14px 봉인 측정 오버레이를 한 화면에서 검증. 어머~ 이제 전투가 *읽혀요*! 데미지가 팍! 약점이 ▲! 한눈에 들어오죠?! ✨⚔️
