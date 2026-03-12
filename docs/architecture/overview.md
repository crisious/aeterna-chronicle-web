# 에테르나 크로니클 — 전체 아키텍처 개요

> 최종 갱신: 2026-03-12 (P10-15)

## 앱 구성

```
에테르나 크로니클
├── server/          ← Fastify + Socket.io 게임 서버
├── client/          ← Phaser 3 웹 클라이언트 (10 씬)
├── admin-dashboard/ ← React 어드민 대시보드
└── shared/          ← 공유 계약 계층 (proto/codec/DTO)
```

## 역할 분리

| 앱 | 역할 | 기술 스택 | 산출물 |
|----|------|-----------|--------|
| **server** | 게임 로직 권위 서버. REST API 40개 라우트 + Socket.io 14 핸들러 + 틱 매니저 | Fastify, Prisma, Redis, Socket.io | Node.js 서버 |
| **client** | 브라우저 게임 클라이언트. 씬 기반 렌더링 + HUD + 네트워크 동기화 | Phaser 3, Vite, TypeScript | SPA (WebGL) |
| **admin-dashboard** | 운영 대시보드. 유저 관리, KPI, 신고 처리, 공지 관리 | React, Vite, Axios | SPA |
| **shared** | 3앱 공통 타입/프로토콜. SSOT(Single Source of Truth) 역할 | Protobuf, TypeScript | npm 내부 패키지 |

## 런타임 흐름

```
┌─────────────┐  REST/WS  ┌──────────────┐  Prisma  ┌──────────┐
│   client    │ ◄───────► │    server     │ ◄──────► │ PostgreSQL│
│  (Phaser)   │           │  (Fastify)    │          └──────────┘
└─────────────┘           │              │  Redis   ┌──────────┐
                          │              │ ◄──────► │  Redis   │
┌─────────────┐  REST     │              │          └──────────┘
│admin-dashboard│ ◄──────►│              │
│  (React)    │           └──────────────┘
└─────────────┘
```

## 계약 경계

- **client ↔ server**: `shared/proto/game.proto` (Socket 바이너리) + `shared/types/game.ts` (REST DTO)
- **admin ↔ server**: `shared/types/admin.ts` (어드민 DTO) + `shared/types/api.ts` (공통 응답 래퍼)
- **server 내부**: `server/src/core/serviceContainer.ts` (DI 컨테이너) + `server/src/core/featureFlags.ts` (기능 토글)

## 디렉터리 상세

### server/src/

```
bootstrap/           ← 부트스트랩 4분해 (P10-01)
  compositionRoot.ts   앱 조립 진입점
  featureRegistry.ts   선언형 라우트/소켓 매니페스트
  runtimeServices.ts   Redis/APM/틱/스케줄러 초기화
  shutdownManager.ts   graceful shutdown
core/
  serviceContainer.ts  DI 컨테이너 (P10-10)
  featureFlags.ts      기능 토글 (P10-11)
routes/              ← 40개 REST 라우트
socket/              ← 14개 Socket.io 핸들러
```

### shared/

```
types/
  admin.ts           어드민 DTO (AdminUserRow, AdminStatsResponse 등)
  api.ts             공통 REST DTO (PaginatedResponse, ApiResponse 등)
  game.ts            게임 DTO
proto/
  game.proto         Protobuf 메시지 정의 (SSOT)
codec/
  gameCodec.ts       Protobuf 인코더/디코더
```

## 관련 문서

- [서버 부트스트랩 상세](./server-bootstrap.md)
- [공유 계약 계층](./shared-contracts.md)
- [기능 토글 가이드](./feature-flags.md)
- [OpenAPI 스펙](../openapi.yaml)
