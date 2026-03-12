# 공유 계약 계층 (Shared Contracts)

> P10-05/06에서 확립된 계약 SSOT 구조 (P10-15)

## 개요

`shared/` 디렉터리는 server, client, admin-dashboard 3앱이 공유하는 **단일 출처(SSOT)** 계약 계층이다.  
타입 불일치로 인한 런타임 오류를 컴파일 타임에 차단한다.

## 구조

```
shared/
├── types/
│   ├── admin.ts       ← 어드민 전용 DTO (P10-03)
│   ├── api.ts         ← 공통 REST DTO (P10-06)
│   ├── game.ts        ← 게임 도메인 DTO
│   ├── telemetry.ts   ← 텔레메트리 이벤트 타입
│   └── index.ts       ← 배럴 export
├── proto/
│   └── game.proto     ← Protobuf 메시지 정의 (SSOT)
└── codec/
    └── gameCodec.ts   ← Protobuf 인코더/디코더
```

## 사용 패턴

### 1. 어드민 DTO (`shared/types/admin.ts`)

서버 응답과 admin-dashboard 기대 필드를 일치시키는 공유 타입.

```typescript
import type { AdminUserRow, AdminStatsResponse } from '../../../shared/types/admin';

// admin-dashboard에서 서버 응답을 타입 안전하게 소비
const res = await apiClient.get<{ users: AdminUserRow[] }>('/admin/users');
```

**주요 타입:**
| 타입 | 용도 |
|------|------|
| `AdminUserRow` | 유저 목록 행 (nickname, level, lastLoginAt 등 통합) |
| `AdminUsersResponse` | 유저 목록 페이지네이션 응답 |
| `AdminStatsResponse` | DAU/MAU/동접 통계 |
| `AdminServerHealthResponse` | 서버 헬스 체크 |
| `AdminAnnouncement` | 공지사항 |
| `AdminSanctionRow` | 제재 이력 행 |

### 2. 공통 REST DTO (`shared/types/api.ts`)

```typescript
import type { PaginatedResponse, ApiResponse } from '../../../shared/types/api';

// 범용 페이지네이션 응답
interface GetUsersResponse extends PaginatedResponse<AdminUserRow> {}

// 범용 성공/실패 응답
const result: ApiResponse<{ id: string }> = await api.post('/items');
```

### 3. Protobuf 코덱 (`shared/codec/gameCodec.ts`)

Socket.io 고빈도 이벤트를 바이너리로 직렬화.

```typescript
import { GameCodec } from '../../../shared/codec/gameCodec';

// 서버 (Node.js): .proto 파일 직접 로드 (SSOT)
const codec = await GameCodec.create();
const buf = codec.encodePlayerMove({ characterId: 'abc', x: 10, y: 20, state: 'idle' });

// 클라이언트 (브라우저): 인라인 fallback 문자열 사용
// ⚠️ fallback 문자열은 game.proto와 동일해야 함
```

**SSOT 원칙:**
- `.proto` 파일이 유일한 스키마 출처
- 서버는 `loadSync()`로 `.proto` 파일 직접 참조
- 클라이언트는 빌드 환경 제약으로 인라인 fallback 사용 (내용 동일 필수)
- 불일치 시 `shared-contract-ci.yml` (P10-07)이 감지

## CI 연동 (P10-07)

`.github/workflows/shared-contract-ci.yml`에서 `shared/` 경로 변경 감지 시:
1. 서버 빌드 (`tsc --noEmit`)
2. 클라이언트 빌드 (`tsc --noEmit`)
3. 어드민 빌드 (`tsc --noEmit`)
4. 계약 검증 테스트 (`vitest run tests/contract/`)

→ 3앱 중 하나라도 타입 에러 발생 시 CI 실패.

## 계약 추가 가이드

1. `shared/types/`에 타입 정의 추가
2. `shared/types/index.ts`에 re-export
3. 서버/클라이언트/어드민에서 import 경로 통일
4. `tests/contract/`에 계약 검증 테스트 추가
5. CI가 3앱 빌드를 자동 검증
