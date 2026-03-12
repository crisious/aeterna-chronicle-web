# 서버 부트스트랩 구조

> P10-01에서 분해된 서버 초기화 흐름 문서 (P10-15)

## 개요

`server/src/server.ts`는 16줄의 얇은 진입점이다.  
모든 조립/초기화 로직은 `bootstrap/` 4개 모듈로 분리되어 있다.

```
server.ts (진입점, 16줄)
  └── bootstrap()
        ├── compositionRoot.ts  — 앱 조립 총괄
        ├── featureRegistry.ts  — 라우트/소켓 매니페스트
        ├── runtimeServices.ts  — 인프라 서비스 초기화
        └── shutdownManager.ts  — graceful shutdown
```

## 부트 순서

```
1. Fastify 인스턴스 생성
2. CORS 등록
3. registerMiddleware()     ← 에러 핸들러, 보안 미들웨어, APM 훅
4. registerRoutes()         ← 선언형 매니페스트 기반 40개 REST 라우트
5. fastify.listen()         ← HTTP 서버 시작
6. Socket.io 바인딩         ← registerSocketHandlers() 호출
7. initInfraServices()      ← APM, Redis 연결
8. initTickManager()        ← physics(20Hz), network(10Hz), logic(2Hz)
9. initSpawnManager()       ← 몬스터 스폰 매니저
10. startSchedulers()       ← 퀘스트 리셋, 이벤트 동기화, 제재 만료, 우편 정리
11. registerShutdownHandlers() ← SIGTERM/SIGINT 핸들러
```

## 모듈별 책임

### compositionRoot.ts

앱 전체 조립의 오케스트레이터. 위 부트 순서를 절차적으로 실행한다.  
**직접 비즈니스 로직을 포함하지 않는다** — 다른 모듈에 위임만 한다.

### featureRegistry.ts

- `ROUTE_MANIFEST[]`: 40개 라우트를 `{ plugin, name, options? }` 배열로 선언
- `registerRoutes()`: 매니페스트 순회 → `fastify.register()` 호출
- `registerSocketHandlers()`: 14개 소켓 핸들러 + 실시간 서비스(매칭, 경매, 대화) 시작
- Admin Socket.io 실연결 (P10-04): `setAdminSocketIo(io)` 호출

### runtimeServices.ts

| 함수 | 역할 |
|------|------|
| `registerMiddleware()` | 에러 핸들러 + rateLimiter + inputValidator + APM 메트릭 훅 |
| `initInfraServices()` | APM 초기화 + Redis 연결 (graceful degradation) |
| `initTickManager()` | 3-레이어 틱 (physics/network/logic) |
| `initSpawnManager()` | 몬스터 스폰 매니저 DB 로드 |
| `startSchedulers()` | 4개 interval 스케줄러 (반환값: cleanup ID 배열) |

### shutdownManager.ts

SIGTERM/SIGINT 수신 시 역순으로 정리:
1. 스케줄러/타이머 정지
2. 매니저(레이드/스폰/던전/경매/길드전/PvP) 정리
3. 매칭 시스템 정지
4. APM + 텔레메트리 종료
5. Fastify 종료
6. Redis/Prisma 연결 해제

## ServiceContainer 연동 (P10-10)

`bootstrapContainer()`를 통해 Prisma/Redis/Socket.io/TickManager 등을 컨테이너에 등록한다.  
도메인 모듈은 직접 import 대신 `serviceContainer.resolve<T>(key)`로 접근한다.

```typescript
import { serviceContainer } from '../core/serviceContainer';

const prisma = serviceContainer.getPrisma();
const redis = serviceContainer.getRedis();
```

테스트 시에는 격리된 컨테이너 인스턴스를 생성하여 모의 구현으로 교체한다.
