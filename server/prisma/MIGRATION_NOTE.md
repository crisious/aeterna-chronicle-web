# Prisma 마이그레이션 노트

## 0001_initial — 초기 스키마 + 텔레메트리 모델 (2026-03-11)

### 변경 요약

| 모델 | 테이블명 | 비고 |
|---|---|---|
| User | User | 기존 |
| Character | Character | 기존 + `@@index([userId])` 추가 |
| TelemetryDialogueChoice | telemetry_dialogue_choice_events | **신규** — 대화 선택지 텔레메트리 |
| TelemetryGameEvent | telemetry_game_events | **신규** — 범용 게임 이벤트 텔레메트리 |

### 인덱스 설명

#### Character
- `userId` — 유저별 캐릭터 조회 최적화

#### TelemetryDialogueChoice
- `(chapter_id, scene_id, npc_id)` — 챕터/씬/NPC 단위 집계 쿼리용 복합 인덱스
- `session_id` — 세션별 이벤트 추적
- `event_ts` — 시계열 조회 (시간 범위 필터)
- `player_id_hash` — 플레이어별 행동 분석
- `idempotency_key` (UNIQUE) — 중복 이벤트 방지 (upsert 기반)

#### TelemetryGameEvent
- `(event_type, event_ts)` — 이벤트 유형별 시계열 조회 복합 인덱스
- `session_id` — 세션별 이벤트 추적
- `player_id` — 플레이어별 이벤트 조회

### 코드 변경

- `dialogueTelemetryPersistence.ts`: `$executeRawUnsafe` → `prisma.telemetryDialogueChoice.upsert()` 전환
  - idempotencyKey 기반 upsert (create/update)
  - best-effort 에러 핸들링 유지

### 향후 계획

- **Quest 모델 확장**: 퀘스트 진행/완료 텔레메트리 추가 예정
- **TelemetryGameEvent 활용**: 전투, 아이템 획득, 레벨업 등 범용 이벤트 기록
- **파티셔닝 검토**: event_ts 기반 시계열 파티셔닝 (데이터 증가 시)
- **TTL 정책**: 오래된 텔레메트리 데이터 자동 정리 (pg_cron 또는 애플리케이션 레벨)

### 적용 방법

```bash
# 마이그레이션 SQL 확인 (DB 실행 없이)
cat server/prisma/migrations/0001_initial/migration.sql

# PostgreSQL에 직접 적용 시
psql $DATABASE_URL -f server/prisma/migrations/0001_initial/migration.sql

# Prisma migrate로 적용 시
npx prisma migrate deploy
```
