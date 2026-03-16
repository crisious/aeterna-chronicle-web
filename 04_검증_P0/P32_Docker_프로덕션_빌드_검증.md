# P32 Docker + 프로덕션 빌드 검증 리포트

> 검증일: 2026-03-16 17:01 KST

---

## 1. Docker 환경 확인

| 항목 | 결과 |
|------|------|
| `docker --version` | ❌ **미설치** (`command not found`) |
| 실제 빌드 | ⏭ 스킵 (Docker 미설치) |
| 실제 compose up | ⏭ 스킵 |

---

## 2. Dockerfile 정적 검증

### 2.1 루트 Dockerfile (**신규 생성**)
- 올인원 빌드용 (개발/CI)
- Multi-stage: `node:20-alpine` (builder → runtime)
- non-root user (`appuser`)
- Health check: `wget -qO- http://localhost:3000/api/health`

### 2.2 `server/Dockerfile` ✅
- Multi-stage 빌드 (builder + runtime)
- `node:20-alpine` 베이스
- Prisma generate + tsc 빌드
- non-root user, HEALTHCHECK 포함
- 프로덕션 의존성만 설치 (`--omit=dev`)

### 2.3 `client/Dockerfile` ✅
- Multi-stage 빌드 (builder → nginx:1.25-alpine)
- Vite 빌드 → nginx SPA 서빙
- SPA fallback (`try_files $uri /index.html`)
- gzip 설정, 정적 에셋 캐시 (1년)
- HEALTHCHECK 포함

### 2.4 `k8s/docker-compose.yml` ✅
- **서비스 5종**: postgres:16-alpine, redis:7-alpine, server, client, + monitoring 프로파일 (prometheus, loki, grafana)
- Health check: postgres (`pg_isready`), redis (`redis-cli ping`)
- 환경변수 기본값 설정 (`POSTGRES_DB=aeterna` 등)
- depends_on + condition: service_healthy
- 볼륨 4종: postgres-data, prometheus-data, loki-data, grafana-data

### 2.5 발견된 이슈
| 이슈 | 심각도 | 상태 |
|------|--------|------|
| 루트 Dockerfile 부재 | 🟡 Minor | ✅ 신규 생성 |
| `.dockerignore` 부재 | 🟡 Minor | 권장 (node_modules, .git, dist 제외) |

---

## 3. 프로덕션 빌드 검증

### 3.1 클라이언트 (`npx vite build`) ✅

| 항목 | 결과 |
|------|------|
| 빌드 결과 | **성공** (4.97초) |
| 모듈 변환 | 63 modules |
| 번들 구성 | 5개 청크 |

**번들 사이즈:**

| 파일 | 원본 | gzip |
|------|------|------|
| `index.html` | 0.94 KB | 0.58 KB |
| `network-BGd_GZIg.js` | 12.55 KB | 4.10 KB |
| `vendor-Djym5kHb.js` | 28.90 KB | 9.49 KB |
| `index-0xAwuwhU.js` | 128.95 KB | 38.20 KB |
| `phaser-cmB6DJhS.js` | **1,478.48 KB** | **337.72 KB** |
| **JS 합계** | **1,648.88 KB** | **389.51 KB** |

**dist/ 총 크기:** 577MB (이미지 에셋 533MB 포함, JS+HTML만 ~44MB, source map 10MB)

⚠️ **주의**: Phaser 라이브러리가 1.4MB (gzip 337KB)로 가장 큰 청크. Tree-shaking 한계로 게임 엔진 특성상 정상 범위.

### 3.2 서버 (`npx tsc`) ✅

| 항목 | 결과 |
|------|------|
| 빌드 결과 | **성공** (에러 0건) |
| dist/ 크기 | 2.6MB |
| JS 파일 수 | 224개 |

---

## 4. 종합 판정

| 작업 | 결과 | 근거 |
|------|------|------|
| Docker 파일 검증 | ✅ 통과 | 3개 Dockerfile + compose 정적 검증 완료 |
| Docker 실행 테스트 | ⏭ 스킵 | Docker 미설치 |
| 클라이언트 빌드 | ✅ 통과 | vite build 성공, 63 modules, 389KB gzip |
| 서버 빌드 | ✅ 통과 | tsc 0 에러, 224 JS 파일 |
| 루트 Dockerfile | ✅ 생성 | multi-stage, non-root, healthcheck |

---

*검증 도구: vite v5.4.21, tsc (TypeScript compiler)*
