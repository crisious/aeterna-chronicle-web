# PC 웹 브라우저용 RPG 게임 기술 스택 및 아키텍처 설계서

> 작성일: 2026-02-20 | 버전: v1.0 (웹 전용, 아카이브)
> 대상 플랫폼: PC 웹 브라우저 (Chrome, Firefox, Edge, Safari)
> ⚠️ 참고: 이 문서는 v1 웹 전용 아키텍처입니다. 멀티엔진 확장은 `기술아키텍처_멀티엔진.md` 참조

> **업데이트 로그**
> | 버전 | 날짜 | 수정 내용 |
> |------|------|-----------|
> | v1.0 | 2026-02-20 | 최초 작성 — Phaser.js 웹 단일 플랫폼 기술 스택 |
> | v1.1 | 2026-02-21 | 멀티엔진 전략으로 분리 → `기술아키텍처_멀티엔진.md` 신설, 본 문서 아카이브 |

---

## 1. 기술 스택 선정

### 1.1 프론트엔드 프레임워크 비교 및 선정

#### 비교 분석

| 항목 | Phaser.js | PixiJS | Three.js | Babylon.js |
|------|-----------|--------|----------|------------|
| 렌더링 | WebGL / Canvas 2D | WebGL (Canvas fallback) | WebGL (3D 특화) | WebGL (3D 특화) |
| RPG 적합성 | 매우 높음 | 보통 | 낮음 (2D RPG) | 낮음 (2D RPG) |
| 내장 기능 | 씬 관리, 물리, 입력, 오디오, 타일맵, 애니메이션 | 렌더링 전문 | 3D 렌더링 전문 | 3D 렌더링 전문 |
| 학습 곡선 | 낮음 | 보통 | 높음 | 높음 |
| 생태계 | 활발 (게임 특화) | 활발 (렌더링 특화) | 매우 활발 (3D) | 활발 (3D) |
| TypeScript 지원 | 공식 지원 | 공식 지원 | 공식 지원 | 공식 지원 |
| 커뮤니티 | 게임 개발자 중심 | 시각화/게임 혼재 | 3D 그래픽 중심 | 3D 게임 중심 |
| 성능 (2D) | 우수 | 최상 | 과스펙 | 과스펙 |

#### 선정: **Phaser.js v3.x + TypeScript**

**선택 이유:**
- RPG 게임에 필요한 타일맵(Tiled Map Editor 연동), 씬 관리, 물리 엔진, 오디오 시스템이 내장되어 있어 별도 라이브러리 없이 게임 핵심 기능 구현 가능
- 2D RPG에 최적화된 WebGL 렌더링으로 60fps 안정적 달성
- Arcade Physics, Matter.js Physics 등 물리 엔진 내장으로 충돌 처리 간소화
- 활발한 RPG 게임 개발 커뮤니티와 풍부한 예제 코드
- TypeScript 공식 지원으로 타입 안전성 확보

**보조 라이브러리:**
- **React** (UI 레이어 - HUD, 인벤토리, 상점 등 복잡한 UI 컴포넌트 관리)
- **Zustand** (클라이언트 상태 관리 - 가볍고 React와 통합 용이)
- **Vite** (번들러 - 빠른 HMR, 최적화된 번들링)

---

### 1.2 백엔드 프레임워크

> 주의: 아래 비교 분석은 프론트엔드 1.1 절의 표 구조를 유지한 템플릿 반복입니다. 내용 중복이 아닌 비교 관점 분리 목적입니다.

#### 비교 분석

| 항목 | Node.js (Fastify) | Node.js (Express) | Python (FastAPI) | Go (Gin) |
|------|-------------------|-------------------|------------------|----------|
| 성능 | 매우 높음 | 높음 | 높음 | 최고 |
| WebSocket | socket.io 생태계 | socket.io 생태계 | websockets 라이브러리 | gorilla/websocket |
| 개발 속도 | 빠름 | 빠름 | 빠름 | 보통 |
| JS 코드 공유 | 가능 (프론트와 동일 언어) | 가능 | 불가 | 불가 |
| 실시간 처리 | 이벤트 루프 기반 최적화 | 이벤트 루프 기반 | asyncio 기반 | goroutine 기반 |

#### 선정: **Node.js + Fastify + TypeScript**

**선택 이유:**
- 프론트엔드와 동일한 TypeScript 사용으로 코드/타입 공유 가능 (모노레포 활용)
- 비동기 I/O 이벤트 루프가 WebSocket 기반 실시간 게임에 최적
- Fastify는 Express 대비 약 2배 이상 높은 처리량 (벤치마크 기준)
- socket.io와의 자연스러운 통합
- npm 생태계의 방대한 게임 서버 관련 패키지 활용

**보조 패키지:**
- **Socket.io** (실시간 양방향 통신)
- **Prisma** (ORM - 타입 안전 DB 접근)
- **Bull/BullMQ** (작업 큐 - 배치 처리, 스케줄링)
- **ioredis** (Redis 클라이언트)
- **zod** (입력 검증 스키마)

---

### 1.3 데이터베이스

#### 주요 데이터 특성 분석

| 데이터 유형 | 특성 | 적합 DB |
|-------------|------|---------|
| 유저/캐릭터 정보 | 관계형, 트랜잭션 필요 | PostgreSQL |
| 게임 상태/인벤토리 | 유연한 스키마, 중첩 구조 | PostgreSQL JSONB |
| 세션/캐시 | 빠른 읽기/쓰기, TTL | Redis |
| 채팅 로그 | 대용량, 시계열 | PostgreSQL (파티셔닝) |
| 게임 이벤트 로그 | 대용량 쓰기, 분석용 | Redis Streams + PostgreSQL |

#### 선정: **PostgreSQL 16 + Redis 7**

**PostgreSQL 선택 이유:**
- ACID 트랜잭션으로 인벤토리 아이템 거래, 재화 이동의 데이터 무결성 보장
- JSONB 타입으로 유연한 아이템 속성, 스킬 데이터 저장 (스키마 변경 최소화)
- 배열 타입으로 스킬 목록, 퀘스트 목록 효율적 저장
- Full-text search로 아이템/퀘스트 검색 기능 구현
- Row-level security로 유저별 데이터 접근 제어

**Redis 선택 이유:**
- 세션 관리 및 JWT 토큰 블랙리스트 (TTL 기반 자동 만료)
- 게임 서버 간 실시간 상태 공유 (Pub/Sub)
- 리더보드 구현 (Sorted Set)
- 인메모리 캐싱으로 DB 부하 감소

---

### 1.4 실시간 통신

#### 선정: **Socket.io v4 (WebSocket 기반)**

**선택 이유:**
- WebSocket 미지원 환경에서 Long Polling 자동 폴백
- Room 기반 멀티플레이어 구역 관리 용이
- 네임스페이스로 채팅/게임 이벤트 채널 분리
- Redis Adapter로 다중 서버 인스턴스 간 이벤트 브로드캐스트
- 자동 재연결, 패킷 버퍼링 내장

---

### 1.5 인프라 및 DevOps

| 구성요소 | 선정 기술 | 이유 |
|---------|-----------|------|
| 컨테이너화 | Docker + Docker Compose | 환경 일관성, 로컬 개발 편의 |
| 오케스트레이션 | Kubernetes (k8s) | 프로덕션 스케일링 |
| CDN | Cloudflare | 에셋 전송, DDoS 방어 |
| 오브젝트 스토리지 | AWS S3 / Cloudflare R2 | 게임 에셋 (이미지, 오디오) |
| 모니터링 | Grafana + Prometheus | 서버 메트릭 시각화 |
| 로깅 | ELK Stack (Elasticsearch + Logstash + Kibana) | 중앙화 로그 분석 |
| CI/CD | GitHub Actions | 자동 테스트 및 배포 |

---

## 2. 시스템 아키텍처

### 2.1 전체 시스템 구조도

```
┌─────────────────────────────────────────────────────────────────────┐
│                          클라이언트 레이어                              │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │          PC 웹 브라우저 (Chrome / Firefox / Edge)              │   │
│  │  ┌─────────────────────┐  ┌──────────────────────────────┐  │   │
│  │  │   Phaser.js 게임 엔진  │  │    React UI 레이어           │  │   │
│  │  │  (게임 캔버스/로직)    │  │  (HUD / 인벤토리 / 메뉴)     │  │   │
│  │  └─────────┬───────────┘  └──────────────┬───────────────┘  │   │
│  │            │ Zustand 상태 관리로 연결         │               │   │
│  └────────────┼──────────────────────────────┼────────────────┘   │
└───────────────┼──────────────────────────────┼─────────────────────┘
                │ HTTPS / WSS                   │ REST API
                ▼                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Cloudflare CDN / WAF                           │
│            (에셋 캐싱, DDoS 방어, SSL 종단)                          │
└───────────────────────┬─────────────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────────────┐
│                      로드 밸런서 (Nginx / AWS ALB)                    │
└────┬──────────────────┬──────────────────────┬───────────────────────┘
     │                  │                      │
     ▼                  ▼                      ▼
┌─────────┐      ┌─────────────┐      ┌─────────────┐
│ API 서버 │      │  게임 서버   │      │  채팅 서버  │
│(Fastify)│      │ (Socket.io) │      │ (Socket.io) │
│ :3000   │      │   :3001     │      │   :3002     │
└────┬────┘      └──────┬──────┘      └──────┬──────┘
     │                  │                    │
     └──────────────────┼────────────────────┘
                        │
              ┌─────────▼──────────┐
              │    Redis Cluster   │
              │  (세션/캐시/Pub-Sub) │
              └─────────┬──────────┘
                        │
              ┌─────────▼──────────┐
              │   PostgreSQL 16    │
              │  (Primary + Read   │
              │    Replicas)       │
              └────────────────────┘
                        │
              ┌─────────▼──────────┐
              │   AWS S3 / R2      │
              │  (게임 에셋 스토리지) │
              └────────────────────┘
```

---

### 2.2 프론트엔드 구조 (씬/컴포넌트 구성)

#### Phaser.js 씬 구성

```
src/
├── game/
│   ├── scenes/
│   │   ├── BootScene.ts          # 최초 부팅, 최소 에셋 로드
│   │   ├── PreloadScene.ts       # 메인 에셋 프리로드, 로딩 화면
│   │   ├── MainMenuScene.ts      # 타이틀/메인 메뉴
│   │   ├── CharacterSelectScene.ts # 캐릭터 선택/생성
│   │   ├── WorldMapScene.ts      # 오버월드 지도
│   │   ├── GameScene.ts          # 메인 게임플레이 씬
│   │   │   ├── 플레이어 이동/입력 처리
│   │   │   ├── NPC 상호작용
│   │   │   ├── 몬스터 AI
│   │   │   └── 타일맵 렌더링
│   │   ├── BattleScene.ts        # 전투 씬 (턴제 RPG)
│   │   ├── DungeonScene.ts       # 던전 씬
│   │   └── UIScene.ts            # 항상 상위에 표시되는 HUD 씬
│   │
│   ├── entities/
│   │   ├── Player.ts             # 플레이어 스프라이트/로직
│   │   ├── NPC.ts                # NPC 기반 클래스
│   │   ├── Monster.ts            # 몬스터 기반 클래스
│   │   ├── monsters/             # 몬스터 세부 클래스
│   │   └── npcs/                 # NPC 세부 클래스
│   │
│   ├── systems/
│   │   ├── InputSystem.ts        # 키보드/마우스 입력 통합
│   │   ├── CameraSystem.ts       # 카메라 추적/전환
│   │   ├── CollisionSystem.ts    # 충돌 감지
│   │   ├── DialogSystem.ts       # 대화 시스템
│   │   ├── QuestSystem.ts        # 퀘스트 진행 관리
│   │   └── SoundSystem.ts        # BGM/SFX 관리
│   │
│   └── config/
│       ├── GameConfig.ts         # Phaser 게임 설정
│       └── Constants.ts          # 게임 상수 (타일 크기 등)
│
├── ui/                           # React UI 컴포넌트
│   ├── components/
│   │   ├── HUD/                  # HP바, MP바, 미니맵
│   │   ├── Inventory/            # 인벤토리 창
│   │   ├── Shop/                 # 상점 UI
│   │   ├── Quest/                # 퀘스트 로그
│   │   ├── Dialog/               # 대화창
│   │   ├── ChatBox/              # 채팅창
│   │   └── Settings/             # 설정 패널
│   └── hooks/                    # 커스텀 React 훅
│
└── store/                        # Zustand 상태 스토어
    ├── playerStore.ts             # 플레이어 정보
    ├── inventoryStore.ts          # 인벤토리 상태
    ├── questStore.ts              # 퀘스트 상태
    ├── chatStore.ts               # 채팅 상태
    └── networkStore.ts            # 소켓 연결 상태
```

#### 씬 전환 흐름

```
BootScene
    → PreloadScene (로딩바 표시)
        → MainMenuScene
            → CharacterSelectScene
                → GameScene (기본 필드)
                    ↔ BattleScene (전투 발생 시)
                    ↔ DungeonScene (던전 입장 시)
                    ↔ WorldMapScene (월드맵 열람)
            (UIScene은 GameScene 위에 항상 오버레이)
```

---

### 2.3 백엔드 API 구조

#### REST API 엔드포인트 (Fastify)

```
/api/v1/
│
├── auth/
│   ├── POST   /register              # 회원가입
│   ├── POST   /login                 # 로그인 (JWT 발급)
│   ├── POST   /logout                # 로그아웃 (토큰 블랙리스트)
│   ├── POST   /refresh               # 액세스 토큰 갱신
│   └── GET    /me                    # 현재 유저 정보
│
├── characters/
│   ├── GET    /                      # 캐릭터 목록 조회
│   ├── POST   /                      # 캐릭터 생성
│   ├── GET    /:id                   # 캐릭터 상세 조회
│   ├── PATCH  /:id                   # 캐릭터 정보 수정
│   └── DELETE /:id                   # 캐릭터 삭제
│
├── game/
│   ├── GET    /save                  # 게임 저장 데이터 조회
│   ├── POST   /save                  # 게임 상태 저장
│   ├── GET    /world                 # 월드 맵 데이터
│   └── GET    /maps/:mapId           # 특정 맵 데이터
│
├── inventory/
│   ├── GET    /:characterId          # 인벤토리 조회
│   ├── POST   /:characterId/equip    # 장비 착용
│   ├── POST   /:characterId/unequip  # 장비 해제
│   └── DELETE /:characterId/:itemId  # 아이템 버리기
│
├── items/
│   ├── GET    /                      # 아이템 목록 (페이지네이션)
│   └── GET    /:id                   # 아이템 상세 정보
│
├── quests/
│   ├── GET    /available/:charId     # 수락 가능 퀘스트 목록
│   ├── GET    /active/:charId        # 진행 중 퀘스트
│   ├── POST   /accept                # 퀘스트 수락
│   ├── POST   /complete              # 퀘스트 완료 처리
│   └── GET    /history/:charId       # 완료된 퀘스트 이력
│
├── shop/
│   ├── GET    /:shopId               # 상점 아이템 목록
│   ├── POST   /buy                   # 아이템 구매
│   └── POST   /sell                  # 아이템 판매
│
├── ranking/
│   ├── GET    /level                 # 레벨 랭킹
│   └── GET    /achievement           # 업적 랭킹
│
└── admin/                           # 관리자 전용 API
    ├── GET    /users                 # 유저 관리
    ├── POST   /broadcast             # 전체 공지
    └── POST   /items/grant           # 아이템 지급
```

#### WebSocket 이벤트 구조 (Socket.io)

```
# 게임 서버 네임스페이스: /game
클라이언트 → 서버 (emit)
├── player:move         { x, y, direction, mapId }
├── player:action       { actionType, targetId }
├── battle:attack       { skillId, targetId }
├── battle:use_item     { itemId }
├── npc:interact        { npcId }
├── map:enter           { mapId, x, y }
└── map:leave           { mapId }

서버 → 클라이언트 (on)
├── player:state        { players: [...] }        # 주변 플레이어 상태
├── battle:start        { battleId, enemies }
├── battle:turn         { turn, actions }
├── battle:end          { result, rewards }
├── map:players         { players: [...] }        # 맵 입장 플레이어
├── notification        { type, message }
└── world:event         { eventType, data }       # 월드 이벤트

# 채팅 네임스페이스: /chat
클라이언트 → 서버
├── chat:send           { channel, message }      # 채널: world/local/party/whisper
└── chat:join           { channel }

서버 → 클라이언트
├── chat:message        { sender, channel, message, timestamp }
└── chat:system         { message }               # 시스템 메시지
```

---

### 2.4 데이터베이스 스키마

#### PostgreSQL 주요 테이블

```sql
-- 유저 계정
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) UNIQUE NOT NULL,
    username      VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR(20) DEFAULT 'player',  -- player | admin
    is_banned     BOOLEAN DEFAULT FALSE,
    last_login_at TIMESTAMPTZ,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 캐릭터
CREATE TABLE characters (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
    name          VARCHAR(50) UNIQUE NOT NULL,
    class         VARCHAR(30) NOT NULL,           -- warrior | mage | archer | ...
    level         INTEGER DEFAULT 1,
    experience    BIGINT DEFAULT 0,
    -- 스탯
    hp            INTEGER DEFAULT 100,
    max_hp        INTEGER DEFAULT 100,
    mp            INTEGER DEFAULT 50,
    max_mp        INTEGER DEFAULT 50,
    strength      INTEGER DEFAULT 10,
    intelligence  INTEGER DEFAULT 10,
    dexterity     INTEGER DEFAULT 10,
    defense       INTEGER DEFAULT 10,
    -- 재화
    gold          BIGINT DEFAULT 0,
    -- 위치
    current_map   VARCHAR(100) DEFAULT 'starter_village',
    pos_x         FLOAT DEFAULT 0,
    pos_y         FLOAT DEFAULT 0,
    -- 추가 속성 (유연한 확장)
    attributes    JSONB DEFAULT '{}',
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 아이템 마스터 데이터
CREATE TABLE items (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code          VARCHAR(100) UNIQUE NOT NULL,   -- 'sword_iron', 'potion_hp'
    name          VARCHAR(100) NOT NULL,
    type          VARCHAR(30) NOT NULL,           -- weapon | armor | consumable | quest | material
    rarity        VARCHAR(20) DEFAULT 'common',  -- common | rare | epic | legendary
    description   TEXT,
    -- 장비 스탯 (JSONB로 유연하게)
    stats         JSONB DEFAULT '{}',             -- { "strength": 5, "defense": 3 }
    -- 착용 조건
    requirements  JSONB DEFAULT '{}',             -- { "level": 10, "class": "warrior" }
    price_buy     INTEGER DEFAULT 0,
    price_sell    INTEGER DEFAULT 0,
    is_tradable   BOOLEAN DEFAULT TRUE,
    max_stack     INTEGER DEFAULT 1,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 인벤토리
CREATE TABLE inventories (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    character_id  UUID REFERENCES characters(id) ON DELETE CASCADE,
    item_id       UUID REFERENCES items(id),
    quantity      INTEGER DEFAULT 1,
    slot          INTEGER,                         -- NULL이면 인벤토리, 숫자면 장비 슬롯
    -- 개별 아이템 속성 (강화 수치, 내구도 등)
    instance_data JSONB DEFAULT '{}',
    acquired_at   TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (character_id, slot) WHERE slot IS NOT NULL
);

-- 스킬
CREATE TABLE skills (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code          VARCHAR(100) UNIQUE NOT NULL,
    name          VARCHAR(100) NOT NULL,
    class         VARCHAR(30),                    -- NULL이면 공용 스킬
    type          VARCHAR(30) NOT NULL,           -- active | passive | toggle
    mp_cost       INTEGER DEFAULT 0,
    cooldown      FLOAT DEFAULT 0,                -- 초
    damage        JSONB DEFAULT '{}',             -- 데미지 공식
    effect        JSONB DEFAULT '{}',             -- 부가 효과
    description   TEXT
);

-- 캐릭터 스킬 연결
CREATE TABLE character_skills (
    character_id  UUID REFERENCES characters(id) ON DELETE CASCADE,
    skill_id      UUID REFERENCES skills(id),
    skill_level   INTEGER DEFAULT 1,
    is_equipped   BOOLEAN DEFAULT FALSE,
    hotkey_slot   INTEGER,                        -- 단축키 슬롯 (0-9)
    PRIMARY KEY (character_id, skill_id)
);

-- 퀘스트 마스터 데이터
CREATE TABLE quests (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code          VARCHAR(100) UNIQUE NOT NULL,
    title         VARCHAR(200) NOT NULL,
    description   TEXT,
    type          VARCHAR(30) DEFAULT 'main',     -- main | side | daily | weekly
    level_req     INTEGER DEFAULT 1,
    prerequisites UUID[],                         -- 선행 퀘스트 ID 배열
    objectives    JSONB NOT NULL,                 -- 목표 목록
    rewards       JSONB NOT NULL,                 -- 보상 (경험치, 골드, 아이템)
    npc_id        VARCHAR(100),                   -- 퀘스트 제공 NPC
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 캐릭터 퀘스트 진행
CREATE TABLE character_quests (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    character_id  UUID REFERENCES characters(id) ON DELETE CASCADE,
    quest_id      UUID REFERENCES quests(id),
    status        VARCHAR(20) DEFAULT 'active',   -- active | completed | failed | abandoned
    progress      JSONB DEFAULT '{}',             -- { "kill_goblin": 3 }
    started_at    TIMESTAMPTZ DEFAULT NOW(),
    completed_at  TIMESTAMPTZ,
    UNIQUE (character_id, quest_id)
);

-- 게임 저장 데이터
CREATE TABLE game_saves (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    character_id  UUID REFERENCES characters(id) ON DELETE CASCADE,
    save_slot     INTEGER DEFAULT 1,
    -- 스토리 진행 플래그
    story_flags   JSONB DEFAULT '{}',
    -- 맵 상태 (문 개방 여부, NPC 이벤트 등)
    map_states    JSONB DEFAULT '{}',
    play_time     BIGINT DEFAULT 0,               -- 총 플레이 시간 (초)
    saved_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (character_id, save_slot)
);

-- 거래 로그 (아이템/재화 이동 추적)
CREATE TABLE transaction_logs (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type          VARCHAR(50) NOT NULL,           -- purchase | sale | drop | quest_reward | craft
    character_id  UUID REFERENCES characters(id),
    item_id       UUID REFERENCES items(id),
    quantity      INTEGER,
    gold_amount   BIGINT,
    metadata      JSONB DEFAULT '{}',
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_characters_user_id ON characters(user_id);
CREATE INDEX idx_inventories_character_id ON inventories(character_id);
CREATE INDEX idx_character_quests_character_id ON character_quests(character_id);
CREATE INDEX idx_transaction_logs_character_id ON transaction_logs(character_id);
CREATE INDEX idx_transaction_logs_created_at ON transaction_logs(created_at);
```

#### Redis 키 구조

```
# 세션/인증
session:{userId}                    → JWT 세션 데이터 (TTL: 7d)
blacklist:token:{jti}               → 로그아웃된 토큰 (TTL: 액세스 토큰 만료시간)

# 게임 상태 캐시
game:char:{characterId}:state       → 캐릭터 실시간 상태 (TTL: 5min)
game:map:{mapId}:players            → 맵 내 플레이어 목록 (Set)
game:map:{mapId}:monsters           → 맵 내 몬스터 상태 (Hash)

# 리더보드
ranking:level                       → Sorted Set (score: 레벨*100+경험치, member: characterId)
ranking:achievement                 → Sorted Set (score: 업적포인트, member: characterId)

# 채팅
chat:world:recent                   → List (최근 100개 메시지, LPUSH + LTRIM)

# 쿨다운
cooldown:{characterId}:{skillCode}  → 스킬 쿨다운 (TTL: 쿨다운 시간)

# 전투 세션
battle:{battleId}                   → Hash (전투 상태, TTL: 30min)
```

---

## 3. 핵심 기술 구현 방안

### 3.1 게임 루프 구현

```typescript
// GameScene.ts - Phaser 씬 기반 게임 루프
export class GameScene extends Phaser.Scene {
    private player: Player;
    private networkManager: NetworkManager;
    private updateAccumulator: number = 0;
    private readonly SERVER_TICK_RATE = 100; // 100ms (10 tick/s)

    // Phaser 내장 게임 루프 (requestAnimationFrame 기반, 60fps)
    update(time: number, delta: number): void {
        // 1. 입력 처리 (매 프레임)
        this.inputSystem.update();

        // 2. 로컬 물리/이동 업데이트 (매 프레임 - 부드러운 움직임)
        this.player.updateLocal(delta);

        // 3. 서버 동기화 (틱 레이트 제한)
        this.updateAccumulator += delta;
        if (this.updateAccumulator >= this.SERVER_TICK_RATE) {
            this.networkManager.sendPlayerState(this.player.getState());
            this.updateAccumulator -= this.SERVER_TICK_RATE;
        }

        // 4. 다른 플레이어 보간 업데이트
        this.interpolationSystem.update(delta);

        // 5. UI 업데이트 (Phaser → React 상태 동기화)
        this.uiBridge.sync(this.player.getUIState());
    }
}

// 서버 사이드 게임 루프 (Node.js)
class GameServer {
    private readonly TICK_RATE_MS = 50; // 20 tick/s (서버)

    start(): void {
        setInterval(() => {
            this.processBattleQueue();    // 전투 로직 처리
            this.updateMonsterAI();        // 몬스터 AI 업데이트
            this.broadcastWorldState();    // 클라이언트에 상태 전송
            this.checkCollisions();        // 서버 사이드 충돌 검증
        }, this.TICK_RATE_MS);
    }
}
```

---

### 3.2 맵/타일 시스템

**Tiled Map Editor + Phaser 연동 방식:**

```typescript
// 타일맵 레이어 구조
const MAP_LAYERS = {
    GROUND:     'ground',       // 기본 지형 (이동 가능)
    DECORATION: 'decoration',   // 장식 오브젝트
    COLLISION:  'collision',     // 충돌 레이어 (투명)
    OBJECTS:    'objects',       // NPC, 아이템, 이벤트 트리거
    ROOF:       'roof',          // 건물 지붕 (플레이어 위에 렌더링)
};

// 맵 로더
class MapLoader {
    async loadMap(scene: Phaser.Scene, mapKey: string): Promise<void> {
        // Tiled JSON 형식 로드
        const map = scene.make.tilemap({ key: mapKey });
        const tileset = map.addTilesetImage('tileset_01', 'tiles');

        // 레이어별 생성
        const groundLayer = map.createLayer(MAP_LAYERS.GROUND, tileset);
        const decorationLayer = map.createLayer(MAP_LAYERS.DECORATION, tileset);
        const collisionLayer = map.createLayer(MAP_LAYERS.COLLISION, tileset);

        // 충돌 처리 (Tiled에서 collides 속성 설정된 타일)
        collisionLayer.setCollisionByProperty({ collides: true });

        // 오브젝트 레이어에서 NPC/이벤트 생성
        const objectLayer = map.getObjectLayer(MAP_LAYERS.OBJECTS);
        objectLayer.objects.forEach(obj => this.spawnObject(scene, obj));

        // 전환 구역 설정 (다른 맵으로 이동)
        this.setupTransitions(map);
    }
}

// 맵 청크 시스템 (대형 맵 최적화)
class ChunkManager {
    private readonly CHUNK_SIZE = 32;    // 32x32 타일
    private loadedChunks: Map<string, MapChunk> = new Map();

    updateChunks(playerX: number, playerY: number): void {
        const cx = Math.floor(playerX / (this.CHUNK_SIZE * TILE_SIZE));
        const cy = Math.floor(playerY / (this.CHUNK_SIZE * TILE_SIZE));

        // 플레이어 주변 3x3 청크 로드
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                this.loadChunk(cx + dx, cy + dy);
            }
        }
        // 멀리 있는 청크 해제
        this.unloadDistantChunks(cx, cy, 2);
    }
}
```

---

### 3.3 저장/로드 시스템

```typescript
// 자동 저장 시스템 (5분마다 + 맵 이동 시)
class SaveSystem {
    private autoSaveInterval: ReturnType<typeof setInterval>;
    private readonly AUTO_SAVE_INTERVAL_MS = 5 * 60 * 1000;

    async saveGame(characterId: string): Promise<void> {
        const saveData = {
            character: this.collectCharacterData(),
            inventory: this.collectInventoryData(),
            quests: this.collectQuestData(),
            position: this.collectPositionData(),
            storyFlags: this.collectStoryFlags(),
            mapStates: this.collectMapStates(),
            savedAt: new Date().toISOString(),
        };

        // 1. API 서버에 저장 요청
        await api.post('/game/save', saveData);

        // 2. 로컬 스토리지 백업 (네트워크 장애 대비)
        localStorage.setItem(
            `backup_save_${characterId}`,
            JSON.stringify(saveData)
        );
    }

    async loadGame(characterId: string): Promise<GameSaveData> {
        try {
            // 서버 데이터 우선 로드
            const response = await api.get('/game/save');
            return response.data;
        } catch (err) {
            // 서버 장애 시 로컬 백업에서 복구
            const backup = localStorage.getItem(`backup_save_${characterId}`);
            if (backup) {
                console.warn('서버 저장 로드 실패, 로컬 백업 사용');
                return JSON.parse(backup);
            }
            throw new Error('저장 데이터를 불러올 수 없습니다');
        }
    }
}
```

---

### 3.4 멀티플레이어 동기화

```typescript
// 클라이언트 사이드 예측 + 서버 권위(Server-Authoritative) 방식
class NetworkSyncSystem {
    // Dead Reckoning: 다른 플레이어의 부드러운 이동 처리
    private interpolatePlayer(remotePlayer: RemotePlayer, delta: number): void {
        const target = remotePlayer.serverPosition;
        const current = remotePlayer.sprite.getPosition();

        // 선형 보간으로 부드러운 이동
        remotePlayer.sprite.setPosition(
            Phaser.Math.Linear(current.x, target.x, 0.2),
            Phaser.Math.Linear(current.y, target.y, 0.2)
        );
    }

    // 클라이언트 예측: 입력 즉시 반영 후 서버 응답으로 보정
    private applyClientPrediction(input: PlayerInput): void {
        // 1. 즉시 로컬 반영
        this.localPlayer.applyInput(input);

        // 2. 서버에 입력 전송 (시퀀스 번호 포함)
        this.socket.emit('player:move', {
            ...input,
            sequence: this.inputSequence++,
        });
    }

    // 서버 응답으로 위치 보정
    private onServerStateUpdate(state: ServerPlayerState): void {
        const diff = this.calculatePositionDiff(
            this.localPlayer.position,
            state.position
        );

        if (diff > CORRECTION_THRESHOLD) {
            // 오차가 클 경우 즉시 보정
            this.localPlayer.setPosition(state.position);
        } else {
            // 오차가 작으면 부드럽게 보간
            this.localPlayer.interpolateTo(state.position);
        }

        // 서버 확인된 입력 이후 처리되지 않은 입력 재적용
        this.replayPendingInputs(state.lastProcessedSequence);
    }
}
```

---

## 4. 성능 최적화 전략

### 4.1 에셋 로딩 최적화

```
전략 1: 텍스처 아틀라스 (Sprite Atlas)
├── TexturePacker로 스프라이트를 하나의 PNG + JSON으로 패킹
├── HTTP 요청 수 감소: 수백 개 이미지 → 소수의 아틀라스 파일
└── GPU 텍스처 스왑 최소화

전략 2: 지연 로딩 (Lazy Loading)
├── 현재 필요한 맵/씬의 에셋만 우선 로드
├── 배경에서 다음 맵 에셋 프리로드 (idle 시간 활용)
└── Phaser.Loader의 pack 파일로 에셋 묶음 관리

전략 3: CDN 캐싱
├── 정적 에셋에 콘텐츠 해시 포함 (bundle.abc123.js)
├── Cloudflare CDN에서 1년 캐시 설정
└── 버전 업데이트 시 해시 변경으로 자동 무효화

전략 4: 압축 포맷 사용
├── 스프라이트: WebP (PNG 대비 26% 용량 절감)
├── 오디오: OGG + MP3 (Vorbis 코덱, 높은 압축률)
└── 타일맵 JSON: Brotli 압축 (gzip 대비 20% 향상)
```

### 4.2 렌더링 최적화

```typescript
// 가시 영역 컬링 (Culling)
class RenderOptimizer {
    private camera: Phaser.Cameras.Scene2D.Camera;
    private readonly CULL_PADDING = 100; // 픽셀

    cullOffScreenObjects(objects: Phaser.GameObjects.GameObject[]): void {
        const bounds = this.camera.worldView;
        objects.forEach(obj => {
            const go = obj as Phaser.GameObjects.Sprite;
            const visible = Phaser.Geom.Rectangle.Overlaps(
                bounds,
                go.getBounds()
            );
            go.setVisible(visible);
            go.setActive(visible); // 비활성화로 업데이트 비용도 절감
        });
    }
}

// 오브젝트 풀링 (Object Pooling)
class MonsterPool {
    private pool: Phaser.GameObjects.Group;

    constructor(scene: Phaser.Scene) {
        this.pool = scene.add.group({
            classType: Monster,
            maxSize: 50,    // 최대 50마리
            runChildUpdate: true,
        });
    }

    // 새 몬스터 생성 대신 풀에서 재사용
    spawn(x: number, y: number, type: string): Monster {
        return this.pool.get(x, y, type) as Monster;
    }

    // 사망 시 풀로 반환
    despawn(monster: Monster): void {
        this.pool.killAndHide(monster);
    }
}

// 배치 렌더링 최적화
// Phaser WebGL 렌더러의 배치 드로우 콜 최대 활용
// - 동일 텍스처 아틀라스의 스프라이트는 하나의 드로우 콜로 처리
// - 레이어 정렬로 불필요한 배치 분할 방지
```

### 4.3 서버 부하 분산

```
전략 1: 존(Zone) 기반 서버 분산
├── 맵/지역별로 게임 서버 인스턴스 할당
├── 인기 맵은 여러 채널(인스턴스)로 분할
└── Redis Pub/Sub으로 서버 간 이벤트 중계

전략 2: 데이터베이스 최적화
├── PostgreSQL Read Replica로 조회 트래픽 분산
├── 인벤토리/퀘스트 조회에 Redis 캐시 적용 (TTL: 1분)
├── 자주 변경되는 데이터(HP, MP, 위치)는 Redis에 1차 저장
│   → 주기적으로 PostgreSQL에 동기화 (5분마다 플러시)
└── 연결 풀링 (pg-pool, 최대 20개 연결/인스턴스)

전략 3: API 레이트 리미팅
├── 일반 API: 100 req/min/user
├── 인증 API: 10 req/min/IP
└── Redis 기반 슬라이딩 윈도우 알고리즘

전략 4: 수평 확장
├── 게임 서버: Kubernetes HPA (CPU 70% 초과 시 자동 스케일링)
├── API 서버: 최소 2 Pod, 최대 10 Pod
└── WebSocket 세션은 Redis Adapter로 상태 공유
```

---

## 5. 개발 로드맵

### 5.1 마일스톤 계획

#### Phase 1: MVP (Minimum Viable Product) - 3개월

**핵심 목표:** 싱글플레이어로 즐길 수 있는 기본 RPG 완성

| 주차 | 작업 항목 |
|------|-----------|
| 1-2  | 프로젝트 셋업, CI/CD 구축, DB 스키마 설계 |
| 3-4  | 인증 시스템 (회원가입/로그인), 캐릭터 생성 |
| 5-6  | 기본 맵 시스템, 플레이어 이동/카메라 |
| 7-8  | 전투 시스템 (턴제 or 실시간), 기본 몬스터 AI |
| 9-10 | 인벤토리, 기본 아이템 시스템, 상점 |
| 11-12| 기본 퀘스트 시스템, 저장/로드, 폴리싱 |

**MVP 핵심 기능:**
- 회원가입/로그인
- 캐릭터 생성 (2개 직업)
- 기본 마을 + 2개 던전 맵
- 기본 전투 (5종 몬스터)
- 인벤토리 (기본 60슬롯), 기본 장비
- 10개 메인 퀘스트
- 저장/로드

---

#### Phase 2: 알파/베타 - 3개월 (MVP + 3개월)

**핵심 목표:** 콘텐츠 확장 + 멀티플레이어 기초

| 주차 | 작업 항목 |
|------|-----------|
| 1-3  | WebSocket 멀티플레이어 (같은 맵에서 다른 유저 표시) |
| 4-5  | 실시간 채팅 시스템 (월드/지역/귓말) |
| 6-7  | 파티 시스템, 파티 던전 |
| 8-9  | 스킬 시스템 확장 (20개 이상), 스킬 트리 |
| 10-11| 레벨링 균형 조정, 추가 콘텐츠 (맵 5개 추가) |
| 12   | 클로즈 베타 테스트, 버그 수정 |

**알파/베타 추가 기능:**
- 멀티플레이어 동기화
- 채팅 시스템
- 파티 시스템
- 4개 직업 (2개 추가)
- 스킬 트리
- 레벨 캡: 50
- PvP 아레나 (선택)
- 길드 시스템 기초

---

#### Phase 3: 정식 출시 (Open Beta + 3개월)

**핵심 목표:** 운영 안정화 + 라이브 서비스 준비

| 주차 | 작업 항목 |
|------|-----------|
| 1-3  | 오픈 베타 서버 안정화, 성능 최적화 |
| 4-5  | 콘텐츠 업데이트 (보스 레이드, 세계 이벤트) |
| 6-7  | 과금 시스템 (코스메틱 위주 - P2W 최소화) |
| 8-9  | 업적 시스템, 리더보드 |
| 10-11| 관리자 툴 완성, 모니터링 강화 |
| 12   | 정식 출시 |

**정식 출시 추가 기능:**
- 레이드 보스 (10인)
- 업적 시스템 (100개 이상)
- 리더보드
- 거래소 (플레이어 간 거래)
- 시즌 이벤트 시스템
- 모바일 대응 (추후 고려)

---

### 5.2 필요한 개발 인력 구성

| 역할 | 인원 | 주요 담당 업무 |
|------|------|---------------|
| **프론트엔드 개발자** (게임) | 2명 | Phaser.js 게임 씬, 게임 로직, 타일맵 |
| **프론트엔드 개발자** (UI) | 1명 | React UI 컴포넌트, 상태 관리 |
| **백엔드 개발자** | 2명 | API 서버, 게임 서버, DB 설계 |
| **게임 디자이너** | 1명 | 밸런싱, 퀘스트 설계, 게임 로직 기획 |
| **아트 디렉터 / 픽셀 아티스트** | 1-2명 | 스프라이트, 타일셋, UI 디자인 |
| **DevOps 엔지니어** | 1명 (파트타임) | 인프라, CI/CD, 모니터링 |
| **QA 엔지니어** | 1명 | 테스트, 버그 트래킹 |
| **프로젝트 매니저** | 1명 | 일정 관리, 기획 조율 |

**최소 구성 (스타트업/인디 팀):** 4-5명
- 풀스택 개발자 2명 (게임 엔진 + 서버)
- 픽셀 아티스트 1명
- 게임 디자이너 1명
- PM 겸 기획자 1명 (공동 창업자)

---

## 6. 폴더 구조

### 6.1 모노레포 전체 구조

```
rpg-game/                          # 프로젝트 루트 (모노레포)
├── package.json                   # 루트 package.json (workspaces)
├── pnpm-workspace.yaml            # pnpm 워크스페이스 설정
├── turbo.json                     # Turborepo 빌드 파이프라인
├── docker-compose.yml             # 로컬 개발 환경 (DB, Redis)
├── docker-compose.prod.yml        # 프로덕션 배포
├── .github/
│   └── workflows/
│       ├── ci.yml                 # 테스트 및 린트
│       └── deploy.yml             # 자동 배포
│
├── packages/                      # 공유 패키지
│   ├── shared-types/              # 공유 TypeScript 타입 정의
│   │   ├── src/
│   │   │   ├── entities.ts        # Character, Item, Quest 타입
│   │   │   ├── events.ts          # WebSocket 이벤트 타입
│   │   │   └── api.ts             # API 요청/응답 타입
│   │   └── package.json
│   │
│   └── game-constants/            # 게임 상수 (밸런싱 수치 등)
│       ├── src/
│       │   ├── stats.ts           # 스탯 공식
│       │   ├── items.ts           # 아이템 코드 상수
│       │   └── maps.ts            # 맵 ID 상수
│       └── package.json
│
├── apps/
│   ├── client/                    # 프론트엔드 (Phaser + React)
│   │   ├── public/
│   │   │   ├── assets/
│   │   │   │   ├── sprites/       # 스프라이트 아틀라스
│   │   │   │   │   ├── characters.png
│   │   │   │   │   ├── characters.json
│   │   │   │   │   ├── monsters.png
│   │   │   │   │   └── monsters.json
│   │   │   │   ├── tilesets/      # 타일셋 이미지
│   │   │   │   ├── maps/          # Tiled .tmj 맵 파일
│   │   │   │   ├── audio/         # BGM / SFX
│   │   │   │   │   ├── bgm/
│   │   │   │   │   └── sfx/
│   │   │   │   └── ui/            # UI 이미지 에셋
│   │   │   └── index.html
│   │   ├── src/
│   │   │   ├── main.tsx           # React + Phaser 진입점
│   │   │   ├── App.tsx            # React 루트 컴포넌트
│   │   │   │
│   │   │   ├── game/              # Phaser 게임 코드
│   │   │   │   ├── GameApp.ts     # Phaser.Game 인스턴스 설정
│   │   │   │   ├── scenes/        # 씬 목록 (2.2 참조)
│   │   │   │   ├── entities/      # 게임 오브젝트
│   │   │   │   ├── systems/       # 게임 시스템
│   │   │   │   ├── managers/      # 매니저 클래스
│   │   │   │   │   ├── MapManager.ts
│   │   │   │   │   ├── SaveManager.ts
│   │   │   │   │   ├── NetworkManager.ts
│   │   │   │   │   └── AudioManager.ts
│   │   │   │   ├── data/          # 로컬 게임 데이터 (마스터 데이터)
│   │   │   │   └── config/
│   │   │   │       ├── GameConfig.ts
│   │   │   │       └── Constants.ts
│   │   │   │
│   │   │   ├── ui/                # React UI
│   │   │   │   ├── components/
│   │   │   │   │   ├── HUD/
│   │   │   │   │   ├── Inventory/
│   │   │   │   │   ├── Shop/
│   │   │   │   │   ├── Quest/
│   │   │   │   │   ├── Dialog/
│   │   │   │   │   ├── Chat/
│   │   │   │   │   ├── Menu/
│   │   │   │   │   └── common/    # 공통 UI 컴포넌트
│   │   │   │   ├── hooks/
│   │   │   │   └── styles/        # CSS Modules / Tailwind
│   │   │   │
│   │   │   ├── store/             # Zustand 스토어
│   │   │   ├── api/               # API 클라이언트 (axios)
│   │   │   └── utils/             # 유틸리티 함수
│   │   │
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── api-server/                # REST API 서버 (Fastify)
│   │   ├── src/
│   │   │   ├── index.ts           # 서버 진입점
│   │   │   ├── app.ts             # Fastify 앱 설정
│   │   │   │
│   │   │   ├── routes/            # API 라우트
│   │   │   │   ├── auth.routes.ts
│   │   │   │   ├── character.routes.ts
│   │   │   │   ├── inventory.routes.ts
│   │   │   │   ├── quest.routes.ts
│   │   │   │   ├── shop.routes.ts
│   │   │   │   ├── game.routes.ts
│   │   │   │   └── ranking.routes.ts
│   │   │   │
│   │   │   ├── controllers/       # 비즈니스 로직
│   │   │   ├── services/          # 서비스 레이어
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── character.service.ts
│   │   │   │   ├── inventory.service.ts
│   │   │   │   ├── quest.service.ts
│   │   │   │   └── shop.service.ts
│   │   │   │
│   │   │   ├── middleware/        # Fastify 플러그인/미들웨어
│   │   │   │   ├── auth.middleware.ts   # JWT 검증
│   │   │   │   ├── rateLimit.ts
│   │   │   │   └── cors.ts
│   │   │   │
│   │   │   ├── db/
│   │   │   │   ├── prisma/
│   │   │   │   │   ├── schema.prisma  # Prisma 스키마
│   │   │   │   │   └── migrations/
│   │   │   │   └── redis.ts
│   │   │   │
│   │   │   └── utils/
│   │   │
│   │   ├── Dockerfile
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── game-server/               # WebSocket 게임 서버
│       ├── src/
│       │   ├── index.ts           # 서버 진입점
│       │   │
│       │   ├── handlers/          # Socket.io 이벤트 핸들러
│       │   │   ├── player.handler.ts
│       │   │   ├── battle.handler.ts
│       │   │   ├── map.handler.ts
│       │   │   └── chat.handler.ts
│       │   │
│       │   ├── systems/           # 서버 사이드 게임 시스템
│       │   │   ├── GameLoop.ts
│       │   │   ├── MonsterAI.ts
│       │   │   ├── BattleSystem.ts
│       │   │   └── WorldEventSystem.ts
│       │   │
│       │   ├── rooms/             # Socket.io Room 관리
│       │   │   ├── MapRoom.ts
│       │   │   └── BattleRoom.ts
│       │   │
│       │   └── utils/
│       │
│       ├── Dockerfile
│       ├── tsconfig.json
│       └── package.json
│
├── infrastructure/                # 인프라 코드
│   ├── k8s/                       # Kubernetes 매니페스트
│   │   ├── api-server.yaml
│   │   ├── game-server.yaml
│   │   └── ingress.yaml
│   ├── nginx/
│   │   └── nginx.conf
│   └── scripts/
│       ├── deploy.sh
│       └── db-migrate.sh
│
└── docs/                          # 문서
    ├── api.md                     # API 문서
    ├── game-design.md             # 게임 디자인 문서
    └── architecture.md            # 아키텍처 문서 (이 파일)
```

---

## 7. 요약 및 기술 결정 근거

### 핵심 기술 스택 요약

```
프론트엔드:  Phaser.js v3 + React + TypeScript + Vite + Zustand
백엔드:      Node.js + Fastify + TypeScript + Prisma
데이터베이스: PostgreSQL 16 + Redis 7
실시간 통신: Socket.io v4 (WebSocket + Redis Adapter)
인프라:      Docker + Kubernetes + Cloudflare + AWS S3
모노레포:    pnpm + Turborepo
```

### 설계 원칙

1. **서버 권위(Server-Authoritative):** 모든 중요한 게임 로직 검증은 서버에서 수행하여 치팅 방지
2. **점진적 확장:** 싱글 → 멀티 → 대규모 MMO로 단계적 확장 가능한 구조
3. **타입 안전성:** 프론트/백엔드 공유 타입으로 런타임 오류 최소화
4. **성능 우선:** 60fps 클라이언트, 20 tick/s 서버로 부드러운 게임플레이
5. **운영 편의:** 중앙화 로그, 메트릭, 알림으로 장애 대응 시간 최소화
```
