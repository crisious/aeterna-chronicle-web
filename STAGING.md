# 🧪 스테이징 환경 가이드

에테르나 크로니클 스테이징 환경 구축/운영 문서.

## 아키텍처

```
┌─────────────────── aeterna-staging 네트워크 ───────────────────┐
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ Client   │  │ Server   │  │ Postgres │  │  Redis   │       │
│  │ :8080→80 │  │ :3001→   │  │ :5433→   │  │ :6380→   │       │
│  │ (nginx)  │──│  3000    │──│  5432    │  │  6379    │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

| 서비스   | 스테이징 포트 | 프로덕션 포트 | 비고                |
|---------|:----------:|:---------:|---------------------|
| Client  | 8080       | 80        | nginx               |
| Server  | 3001       | 3000      | Fastify + Socket.IO |
| Postgres| 5433       | 5432      | v16-alpine          |
| Redis   | 6380       | 6379      | v7-alpine           |

> 포트를 분리하여 로컬에서 프로덕션/스테이징 동시 실행 가능.

---

## 빠른 시작

### 1. 환경변수 확인

```bash
# .env.staging 이미 포함됨 (기본값 설정 완료)
cat .env.staging
```

### 2. 배포 (원클릭)

```bash
bash tools/staging/deploy.sh
```

이 스크립트가 수행하는 작업:
1. Docker 이미지 빌드
2. DB + Redis 기동
3. Prisma 마이그레이션
4. 시드 데이터 삽입
5. 전체 서비스 시작 + 헬스체크

### 3. 수동 실행 (단계별)

```bash
# 빌드
docker compose -f docker-compose.staging.yml --env-file .env.staging build

# 기동
docker compose -f docker-compose.staging.yml --env-file .env.staging up -d

# 마이그레이션
docker compose -f docker-compose.staging.yml exec server npx prisma migrate deploy

# 시드
docker compose -f docker-compose.staging.yml exec server npx ts-node tools/staging/seed.ts
```

---

## 시드 데이터

| 항목         | 수량       | 소스 파일                        |
|-------------|-----------|----------------------------------|
| 유저         | 10명      | seed.ts (admin 1, mod 2, user 7) |
| 캐릭터       | 10개      | seed.ts (유저당 1개, Lv 1~80)    |
| 아이템       | 80개      | inventory/itemSeeds.ts           |
| 레시피       | 50개      | craft/recipeSeeds.ts             |
| NPC         | 30개      | npc/npcSeeds.ts                  |
| 퀘스트       | 60개      | quest/questSeeds.ts              |
| 업적         | 100개     | achievement/achievementSeeds.ts  |
| 이벤트       | 10개      | event/eventSeeds.ts              |
| 펫          | 15종+스킬20 | pet/petSeeds.ts                  |
| 전직         | 9개       | class/classSeeds.ts              |
| 길드         | 3개       | seed.ts (각 3~5명)               |
| PvP 매치     | 5건       | seed.ts                          |
| 레이드 세션   | 2건       | seed.ts                          |

### 테스트 계정

| 이메일                         | 역할        | 비밀번호            |
|-------------------------------|------------|---------------------|
| admin@aeterna-staging.test    | admin      | staging_admin_pw    |
| mod01@aeterna-staging.test    | moderator  | staging_mod_pw      |
| mod02@aeterna-staging.test    | moderator  | staging_mod_pw      |
| user01~07@aeterna-staging.test| user       | staging_user_pw     |

---

## 리셋

스테이징 데이터를 완전 초기화하고 다시 시드:

```bash
bash tools/staging/reset.sh
```

> DB 볼륨 삭제 → 재생성 → 마이그레이션 → 시드 순서로 실행됨.

---

## CI/CD

`.github/workflows/staging.yml` — `develop` 브랜치에 push하면 자동 배포.

### 필요한 GitHub Secrets

| Secret                  | 설명              |
|------------------------|-------------------|
| `STAGING_DB_PASSWORD`  | PostgreSQL 비밀번호 |
| `STAGING_JWT_SECRET`   | JWT 서명 키        |

### 필요한 GitHub Variables (선택)

| Variable                    | 기본값                   |
|----------------------------|-------------------------|
| `STAGING_ALLOWED_ORIGINS`  | http://localhost:8080   |
| `STAGING_SERVER_URL`       | http://localhost:3001   |
| `STAGING_WS_URL`           | ws://localhost:3001     |

---

## 자주 쓰는 명령

```bash
# 로그 확인
docker compose -f docker-compose.staging.yml logs -f server

# 서버 셸 접속
docker compose -f docker-compose.staging.yml exec server sh

# DB 직접 접속
docker compose -f docker-compose.staging.yml exec postgres psql -U aeterna_staging

# 서비스 중지
docker compose -f docker-compose.staging.yml down

# 서비스 + 볼륨 삭제 (완전 초기화)
docker compose -f docker-compose.staging.yml down -v
```

---

## 주의사항

- `.env.staging`의 비밀번호/JWT 시크릿은 **스테이징 전용**. 프로덕션에서 사용 금지.
- 시드 비밀번호는 평문 저장 — 스테이징 전용이므로 의도적.
- 프로덕션과 포트가 다르므로 API 호출 시 `:3001` 확인.
- `reset.sh`는 **모든 데이터를 삭제**하므로 신중하게 사용.
