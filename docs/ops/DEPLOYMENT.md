# 🚀 에테르나 크로니클 — 배포 가이드

## 목차

1. [로컬 개발 환경](#1-로컬-개발-환경)
2. [Docker 로컬 실행](#2-docker-로컬-실행)
3. [프로덕션 배포](#3-프로덕션-배포)
4. [환경변수 설명](#4-환경변수-설명)
5. [GitHub Actions 시크릿 설정](#5-github-actions-시크릿-설정)
6. [롤백 방법](#6-롤백-방법)

---

## 1. 로컬 개발 환경

### 사전 요구사항

- Node.js 20+
- PostgreSQL 16+
- Redis 7+

### 설정

```bash
# 저장소 클론
git clone https://github.com/<org>/aeterna-chronicle.git
cd aeterna-chronicle

# 환경변수 설정
cp .env.example .env
# .env 파일을 열어 실제 값으로 수정

# 서버 설정
cd server
npm install
npx prisma generate
npx prisma db push
npm run dev      # http://localhost:3000

# 클라이언트 설정 (별도 터미널)
cd client
npm install
npm run dev      # http://localhost:5173
```

### 타입 체크

```bash
cd server && npm run typecheck
cd client && npm run typecheck
```

---

## 2. Docker 로컬 실행

### 전체 스택 실행

```bash
# 빌드 + 실행
docker compose up -d

# 로그 확인
docker compose logs -f

# 상태 확인
docker compose ps
```

### 접속

| 서비스 | URL |
|--------|-----|
| 클라이언트 | http://localhost:80 |
| 서버 API | http://localhost:3000 |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

### 개별 서비스 재빌드

```bash
# 서버만 재빌드
docker compose build server
docker compose up -d server

# 전체 재빌드 (캐시 무시)
docker compose build --no-cache
```

---

## 3. 프로덕션 배포

### 자동 배포 (GitHub Actions)

**배포 플로우:**

```
push to main → CI 검증 → Docker 빌드 → ghcr.io push → 배포 알림
```

**수동 배포:**

1. GitHub 저장소 → Actions → "Deploy" 워크플로우
2. "Run workflow" 클릭
3. 환경(production/staging) 선택
4. 실행

### 릴리즈 생성

```bash
# 태그 생성 + push → 자동 릴리즈
git tag v1.0.0
git push origin v1.0.0
```

릴리즈 시 자동으로:
- 클라이언트 빌드 → `client-dist.zip`
- 서버 빌드 → `server-dist.zip`
- GitHub Release 생성 + 아티팩트 첨부
- 체인지로그 자동 생성

### 프로덕션 서버에서 Docker 실행

```bash
# ghcr.io에서 이미지 pull
docker pull ghcr.io/<org>/aeterna-chronicle/server:latest
docker pull ghcr.io/<org>/aeterna-chronicle/client:latest

# docker-compose.prod.yml 사용 (이미지 참조)
docker compose -f docker-compose.yml up -d
```

---

## 4. 환경변수 설명

| 변수 | 설명 | 기본값 | 필수 |
|------|------|--------|------|
| `POSTGRES_DB` | PostgreSQL 데이터베이스 이름 | `aeterna` | ✅ |
| `POSTGRES_USER` | PostgreSQL 사용자 | `aeterna` | ✅ |
| `POSTGRES_PASSWORD` | PostgreSQL 비밀번호 | `changeme` | ✅ |
| `PORT` | 서버 포트 | `3000` | ❌ |
| `DATABASE_URL` | Prisma 데이터베이스 연결 URL | - | ✅ |
| `REDIS_URL` | Redis 연결 URL | `redis://localhost:6379` | ✅ |
| `ALLOWED_ORIGINS` | CORS 허용 오리진 (쉼표 구분) | - | ✅ |
| `NODE_ENV` | 실행 환경 | `development` | ❌ |
| `VITE_SERVER_URL` | 클라이언트→서버 API URL | - | ✅ |
| `VITE_WS_URL` | 클라이언트→서버 WebSocket URL | - | ✅ |

---

## 5. GitHub Actions 시크릿 설정

### 필수 시크릿

GitHub Actions의 Docker 배포에는 `GITHUB_TOKEN`이 자동 제공되므로 추가 시크릿이 필요 없습니다.

### 선택 시크릿 (외부 배포 시)

저장소 → Settings → Secrets and variables → Actions에서 설정:

| 시크릿 | 용도 |
|--------|------|
| `DEPLOY_SSH_KEY` | 프로덕션 서버 SSH 키 (자동 배포 시) |
| `DEPLOY_HOST` | 프로덕션 서버 주소 |
| `DISCORD_WEBHOOK_URL` | 배포 알림 Discord 웹훅 |

### 패키지 권한 설정

ghcr.io 사용 시:

1. 저장소 → Settings → Actions → General
2. "Workflow permissions" → **Read and write permissions** 선택
3. "Allow GitHub Actions to create and approve pull requests" 체크

---

## 6. 롤백 방법

### 방법 1: 이전 Docker 이미지로 롤백

```bash
# 특정 커밋의 이미지로 롤백
docker pull ghcr.io/<org>/aeterna-chronicle/server:<commit-sha>
docker pull ghcr.io/<org>/aeterna-chronicle/client:<commit-sha>

# 재시작
docker compose down
docker compose up -d
```

### 방법 2: Git 기반 롤백

```bash
# 이전 커밋으로 되돌리기
git revert HEAD
git push origin main
# → CI/CD가 자동으로 새 이미지 빌드 + 배포
```

### 방법 3: GitHub Release에서 롤백

1. GitHub → Releases 페이지
2. 이전 버전의 `client-dist.zip`, `server-dist.zip` 다운로드
3. 수동 배포

### 데이터베이스 롤백

```bash
# Prisma 마이그레이션 롤백 (주의: 데이터 손실 가능)
cd server && npx prisma migrate reset

# 특정 마이그레이션으로 롤백
cd server && npx prisma migrate resolve --rolled-back <migration-name>
```

---

## 트러블슈팅

### Docker 빌드 실패

```bash
# 캐시 초기화
docker compose build --no-cache

# 로그 확인
docker compose logs <service-name>
```

### CI 실패

- TypeScript 타입 에러: `npm run typecheck`로 로컬에서 먼저 확인
- Prisma 에러: `npx prisma generate` 실행 확인
- Docker 빌드 에러: `docker compose build`로 로컬 검증

### ghcr.io 인증 실패

```bash
# 로컬에서 ghcr.io 로그인
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin
```
