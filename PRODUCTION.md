# 프로덕션 배포 가이드

## 아키텍처

블루/그린 배포 방식으로 무중단 배포를 구현합니다.

```
[GitHub Tag Push] → CI (lint/test/build) → Docker Build → Green 배포
                                                            ↓
                                          헬스체크 통과 → 트래픽 전환 (Green ← 100%)
                                                            ↓
                                          Blue 유지 (롤백용)
```

## 배포 트리거

- **자동 배포**: `v*.*.*` 태그를 `main` 브랜치에 push
- **수동 롤백**: GitHub Actions → `workflow_dispatch` → `rollback_tag` 입력

```bash
# 새 버전 배포
git tag v1.3.0
git push origin v1.3.0

# 롤백 (GitHub Actions UI 또는 CLI)
./tools/deploy/rollback.sh v1.2.9
```

## 배포 파이프라인

1. **Validate** — lint → tsc → unit test
2. **Build** — Docker 이미지 빌드 + GHCR push
3. **Deploy** — Green deployment 업데이트 → 헬스체크 → 트래픽 전환
4. **알림** — Slack 웹훅으로 배포 시작/성공/실패 통보

## K8s 리소스 (k8s/production/)

| 파일 | 설명 |
|------|------|
| server-deployment-blue.yaml | Blue 슬롯 (대기/롤백용) |
| server-deployment-green.yaml | Green 슬롯 (현재 활성) |
| ingress-production.yaml | Canary 가중치 기반 트래픽 전환 |
| configmap-production.yaml | 환경 설정 |
| secrets-production.yaml | 시크릿 (sealed-secrets 사용 권장) |
| hpa-production.yaml | HPA (min 3, max 20, CPU 70%) |

## HPA 정책

- 최소 레플리카: 3
- 최대 레플리카: 20
- CPU 목표: 70%
- 메모리 목표: 80%
- Scale-up: 60초 안정화, 60초당 2 Pod
- Scale-down: 300초 안정화, 120초당 1 Pod

## 롤백

```bash
# 방법 1: 스크립트
./tools/deploy/rollback.sh v1.2.9

# 방법 2: GitHub Actions UI
# Actions → Production Deploy → Run workflow → rollback_tag: v1.2.9

# 방법 3: kubectl 직접
kubectl set image deployment/server-green \
  server=ghcr.io/etherna/etherna-server:v1.2.9 \
  -n etherna-production
```

## 필요한 GitHub Secrets

| Secret | 설명 |
|--------|------|
| KUBE_CONFIG_PRODUCTION | base64 인코딩된 kubeconfig |
| SLACK_DEPLOY_WEBHOOK | Slack 배포 알림 웹훅 URL |
| TEST_DATABASE_URL | CI 테스트용 DB URL |

## 모니터링

배포 후 운영 알림 시스템(P6-18)이 자동으로 모니터링합니다:
- 에러율 >5%/분 → Discord + Slack
- 응답 시간 p95 >2초 → Discord
- 동시접속 급감 -50%/10분 → Discord + Slack
