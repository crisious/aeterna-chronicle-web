# 에테르나 크로니클 — 인프라 배포 가이드

## 아키텍처 개요

```
┌─────────────┐     ┌─────────────┐
│   Client    │────▶│   Ingress   │
│  (nginx)    │     │  (nginx-ic) │
└─────────────┘     └──────┬──────┘
                           │
                    ┌──────┴──────┐
                    ▼             ▼
             ┌───────────┐  ┌──────────┐
             │  Server   │  │  Client  │
             │ (Fastify) │  │  (nginx) │
             │  2~10 pod │  │  2 pod   │
             └─────┬─────┘  └──────────┘
                   │
            ┌──────┴──────┐
            ▼             ▼
     ┌────────────┐ ┌──────────┐
     │ PostgreSQL │ │  Redis   │
     │ (Stateful) │ │ (Deploy) │
     └────────────┘ └──────────┘
```

## 1. Docker Compose (로컬 개발)

### 사전 요구사항
- Docker & Docker Compose v2+

### 실행

```bash
# 환경변수 설정 (선택)
cp .env.example .env

# 전체 스택 기동
docker compose up -d

# 로그 확인
docker compose logs -f server

# 종료
docker compose down
```

### 서비스 포트
| 서비스 | 포트 | 설명 |
|--------|------|------|
| Client | 80 | 게임 클라이언트 (nginx) |
| Server | 3000 | API + WebSocket |
| PostgreSQL | 5432 | 데이터베이스 |
| Redis | 6379 | 인메모리 캐시 |

## 2. Kubernetes 배포

### 사전 요구사항
- kubectl 설치 + 클러스터 접근 가능
- nginx-ingress-controller 설치됨
- Docker 이미지 빌드 + 레지스트리 푸시 완료

### 이미지 빌드

```bash
# 서버 이미지
docker build -f server/Dockerfile -t aeterna-chronicle/server:latest .

# 클라이언트 이미지
docker build -f client/Dockerfile -t aeterna-chronicle/client:latest .

# 레지스트리 푸시 (예: Docker Hub)
docker tag aeterna-chronicle/server:latest your-registry/aeterna-server:latest
docker push your-registry/aeterna-server:latest
```

### 시크릿 설정

```bash
# secrets.yaml의 base64 값을 실제 값으로 교체
echo -n 'your-real-password' | base64
# 결과값을 k8s/secrets.yaml에 반영
```

### 배포

```bash
# 전체 매니페스트 일괄 적용
kubectl apply -f k8s/

# 배포 상태 확인
kubectl -n aeterna get pods,svc,hpa

# 서버 로그 확인
kubectl -n aeterna logs -f deployment/aeterna-server

# HPA 상태 확인
kubectl -n aeterna get hpa
```

### 매니페스트 구성

| 파일 | 리소스 | 설명 |
|------|--------|------|
| `namespace.yaml` | Namespace | `aeterna` 네임스페이스 |
| `configmap.yaml` | ConfigMap | 공통 환경변수 |
| `secrets.yaml` | Secret | DB 접속 정보 (템플릿) |
| `server-deployment.yaml` | Deployment | 게임 서버 (2 replicas) |
| `server-service.yaml` | Service | 서버 ClusterIP |
| `client-deployment.yaml` | Deployment | 클라이언트 nginx (2 replicas) |
| `client-service.yaml` | Service | 클라이언트 ClusterIP |
| `postgres-statefulset.yaml` | StatefulSet | PostgreSQL (1 replica) |
| `postgres-service.yaml` | Service | DB Headless Service |
| `postgres-pvc.yaml` | PVC | DB 스토리지 (10Gi) |
| `redis-deployment.yaml` | Deployment | Redis (1 replica) |
| `redis-service.yaml` | Service | Redis ClusterIP |
| `ingress.yaml` | Ingress | nginx ingress (WebSocket 지원) |
| `hpa.yaml` | HPA | 서버 자동 스케일링 (CPU 70%, 2~10) |

### 스케일링 정책

- **Scale Up**: CPU 70% 초과 시 60초 안정화 후 최대 2 pod 추가
- **Scale Down**: CPU 정상화 후 300초 안정화 후 1 pod씩 감소
- **범위**: 최소 2 → 최대 10 pods

## 3. 주의사항

- `secrets.yaml`의 base64 값은 **반드시** 실제 배포 전 교체
- `ingress.yaml`의 호스트명(`aeterna.example.com`)을 실제 도메인으로 변경
- 서버 이미지의 `imagePullPolicy`를 프로덕션에서는 `Always`로 변경 권장
- PostgreSQL PVC의 `storageClassName`을 클러스터 환경에 맞게 조정
- WebSocket 연결을 위해 Ingress의 timeout 설정(3600초) 유지 필요
